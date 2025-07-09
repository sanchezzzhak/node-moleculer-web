/**
 * @typedef {import("uWebSockets.js").TemplatedApp} TemplatedApp
 * @typedef {import("uWebSockets.js").HttpResponse} HttpResponse
 * @typedef {import("uWebSockets.js").HttpRequest} HttpRequest
 */
const Uws = require('uWebSockets.js');
const fsPath = require('node:path');
const getNextOpenPort = require('./utils/get-next-open-port');
const uwsSendFile = require('./utils/uws-send-file');
const RequestData= require("./request-data");
const {readBody} = require("./read-body");
const CookieData = require("./cookie-data");

/**
 * Decode param value.
 * @param val {String}
 * @return {String}
 * @private
 */
const decodeRouterParam = (val) => {
	if (typeof val !== 'string' || val.length === 0) {
		return val;
	}
	try {
		return decodeURIComponent(val);
	} catch (err) {
		if (err instanceof URIError) {
			err.message = `Failed to decode param '${val}'`;
			err.status = 400;
		}
		throw err;
	}
}

const PORT_SCHEMA_AUTO = 'auto';
const PORT_SCHEMA_NODE = 'node';
const ROUTER_TYPE_CONTROLLER = 'c';
const ROUTER_TYPE_SERVICE = 's';

const UwsServer = {
	server: null,
	name: 'web-server',
	events: {
		'$broker.started'() {
			this.bindRoutes();
		}
	},
	settings: {
		port: 3000,
		ssl: {},
		ip: 'localhost',
		publicDir: null,
		publicIndex: false, // or 'index.html'
		staticCompress: true,
		staticLastModified: true,
		portSchema: 'node',
		routes: [],
		controllers: {},
		createRouteValidate: false
	},

	/*********************************/
	/* Private microservice methods: */
	/*********************************/

	/**
	 * Bind service.stopped for molecularjs
	 * @return {Promise<void>}
	 */
	async stopped() {
		this.getServerUws()?.close();
	},

	/**
	 * Bind service.created for molecularjs
	 * @return {Promise<void>}
	 */
	async created() {
		this.initServer();
		return Promise.resolve();
	},

	/**
	 * Bind service.started for molecularjs
	 * @return {Promise<void>}
	 */
	async started() {
		const nodeRe = /(\d+)$/i.exec(this.broker.nodeID);
		const nodeId = nodeRe !== null ? Number(nodeRe[0]) : 0;

		if (this.settings.portSchema === PORT_SCHEMA_AUTO) {
			this.settings.port = await getNextOpenPort(Number(this.settings.port));
		}

		if (this.settings.portSchema === PORT_SCHEMA_NODE) {
			let port = Number(this.settings.port);
			if ([0, 1].includes(nodeId) === false) {
				Array.from(Array(nodeId - 1).keys()).forEach(() => {
					port++;
				});
			}
			this.settings.port = port;
		}

		const messages = [
			`Server select: ip ${this.settings.ip} port ${this.settings.port}`,
			`port strategy select: ${this.settings.portSchema}`,
			`server-id: ${nodeId}`
		];

		this.broker.logger.info(messages.join(', '))
		await this.listenServer();
	},

	/*********************************/
	/* Public microservice methods:  */
	/*********************************/

	methods: {
		/**
		 * 	// get url #s:service.action     - service.action
		 * 	// get url #c:controller.action  - controller.action
		 *
		 * @param {string} route
		 * @param {CreateRouteOption} options
		 */
		createRoute(route, options = {} ) {
			const regex = /^(get|post|any|options|head|put|connect|trace|patch|del) (.*) #([sc]):([a-z][\w-]+)\.([a-z][\w-]+)$/i;

			const match = regex.exec(route);
			if (match) {
				const method = match[1].toLowerCase();   // http type
				const path = match[2] ?? '';             // url path
				const type = match[3] ?? '';             // type controller or service
				const controller = match[4] ?? '';       // name controller or service
				const action = match[5] ?? '';           // name action
				const cache = options.cache ?? -1;     // cache option
				const onBefore = options.onBefore ?? null;
				const onAfter = options.onAfter ?? null;

				switch (type) {
					case ROUTER_TYPE_CONTROLLER:
						this.addRoute({path, method, controller, action, cache, onBefore, onAfter});
						break;
					case ROUTER_TYPE_SERVICE:
						this.addRoute({path, method, service: [controller, action].join('.'), cache, onBefore, onAfter});
						break;
				}
			}

			if (this.settings.createRouteValidate && !match) {
				throw new Error(`route "${route}" does not match the template ``"${regex.toString()}"`)
			}

		},

		/**
		 * Add route to collection list
		 * @param {RouteOptions|{}} route
		 */
		addRoute(route) {
			this.settings.routes.push(route);
		},

		/**
		 * We go through all services where there is pointer to rest usage
		 */
		bindRoutesThroughAllService() {
			const services = this.broker.registry.services.list({
				skipInternal: true,
				onlyLocal: true,
				withActions: true
			});

			for(const service of services) {
				if (service.settings.uwsHttp) {
					for(const key in service.actions) {
						const action = service.actions[key];
						const {name, rest} = action;
						this.createRoute(`${rest} #s:${name}`)
					}
				}
			}
		},

		bindRouteSettings() {

			this.settings.routes.forEach((route) => {
				this.getServerUws()[route.method](route.path,
					/**
					 * @param {HttpResponse} res
					 * @param {HttpRequest} req
					 * @return {Promise<void>}
					 */
					async (res, req) => {
						res.onAborted && res.onAborted(() => {
							res.aborted = true;
						});

						let controller = null,
							result = null,
							cookies = [],
							statusCode = null,
							statusCodeText = null,
							headers = null;

						// run before promise
						if (route.onBefore) {
							await this.Promise.method(route.onBefore, {route, res, req})
						}

						if (route.controller) {
							[controller, result, headers, cookies, statusCodeText]
								= await this.runControllerAction(route.controller, route.action, res, req, route)
						} else {
							[result, headers, cookies, statusCodeText]
								= await this.runServiceAction(route.service, res, req, route);
						}

						// run after promise
						if (route.onAfter) {
							result = await this.Promise.method(route.onAfter, {route, res, req, data: result})
						}

						// append cork
						if (!res.aborted) {
							res.cork(() => {
								// write headers response
								if (headers !== null) {
									for (let key in headers) {
										res.writeHeader(key, headers[key]);
									}
								}
								// write cookie response
								if (cookies) {
									for (let key in cookies) {
										res.writeHeader('set-cookie', cookies[key]);
									}
								}

								// write status response
								if (statusCodeText !== null) {
									res.writeStatus(statusCodeText);
								}

								res.end(result);
							});
						}
					});
			});
		},


		/**
		 * Bind routes static files response
		 */
		bindRoutesStatic() {
			const rootDir = this.settings.publicDir;
			const indexFile = this.settings.publicIndex
				? fsPath.join(rootDir, this.settings.publicIndex)
				: false;

			if (rootDir) {
				this.getServerUws().get('/*',  (res, req) => {
					const options = {
						publicIndex: this.settings.publicIndex,
						compress: this.settings.staticCompress,
						lastModified: this.settings.staticLastModified,
					};
					const path = req.getUrl();
					if (path === '/' && indexFile) {
						options.path = indexFile
					} else {
						options.path = fsPath.join(rootDir, path)
					}
					return uwsSendFile(res, req, options)
				});
			}
		},

		/**
		 * Bind native uws routers
		 */
		bindRoutes() {
			this.bindRoutesThroughAllService();       // bind routes by services rest actions
			this.bindRouteSettings();                 // bind routes by config
			this.bindRoutesStatic();             			// bind routes by static files
		},

		/**
		 * Get instance UwsServer server
		 *
		 * @returns {TemplatedApp|null}
		 */
		getServerUws() {
			return this.server;
		},

		/**
		 * run action in service
		 *
		 * @param {string} service
		 * @param {HttpResponse} res
		 * @param {HttpRequest} req
		 * @param {RouteOptions} route
		 * @return [result, headers, cookies, statusCodeText]
		 */
		async runServiceAction(service, res, req, route) {
			let requestData = new RequestData(req, res, route);
			let postData = null;
			let result = null;

			// permission checks for post
			if (route.method === 'post' && route.permission) {
				if (route.permission.post) {
					postData = await new Promise((resolve, reject) => {
						readBody(res, resolve, reject);
					});
				}
				// permission check read files
				// if (route.permission.files) {
				//
				// }
			}

			let headers = {};
			let cookies = {};
			let statusCode = null;
			let statusCodeText = null;

			/** @type {string|ServiceRenderResponse} response */
			const response = await this.broker.call(route.service, {
				cookies: req.getHeader('cookie'),
				request: requestData.getData(),
				route: {
					path: route.path,
					method: route.method,
					cache: route.cache
				},
				postData: postData
			});

			// convert response to data
			if ( typeof response !== 'string') {
				result = response.result;
				statusCode = response.statusCode;
				statusCodeText = response.statusCodeText
				headers = response.headers;
				cookies = response.cookies;
			}

			return [result, headers, cookies, statusCodeText];
		},

		/**
		 * run action in controller
		 *
		 * @param {string} controller
		 * @param {string} action
		 * @param {HttpResponse} res
		 * @param {HttpRequest} req
		 * @param {RouteOptions} route
		 * @returns [controller, result, headers, cookies, statusCodeText]
		 */
		async runControllerAction(controller, action, res, req, route) {
			if (!(this.settings.controllers[controller] ?? false)) {
				return [null, `controller ${controller} not found`, null, null, null];
			}

			const controllerClass = this.settings.controllers[controller];

			const inst = new controllerClass({
				res,
				req,
				broker: this.broker,
				route: {
					path: route.path,
					method: route.method,
					controller: route.controller,
					action: route.action,
					cache: route.cache
				},
			});

			if (!(inst[action] ?? false)) {
				return [null, `method ${action} for controller ${controller} not found`, null, null, null]
			}

			const result = await inst[action]();
			const headers = inst.headers ?? {};
			const statusCodeText = inst.statusCodeText;

			const cookies = [];
			if (inst.cookieData) {
				for (let key in inst.cookieData.resp) {
					cookies.push(inst.cookieData.toHeader(key));
				}
			}
			return [inst, result, headers, cookies, statusCodeText];
		},

		/**
		 * Init server listen host/ip and port
		 */
		listenServer() {
			return new Promise((resolve, reject) => {
				this.server.listen(this.settings.port, (listenSocket) => {
					if (listenSocket) {
						this.logger.info(`Server listening ${this.settings.ip}:${this.settings.port}`);
						resolve();
					} else {
						reject(`Server listening ${this.settings.ip}:${this.settings.port} failed`);
					}
				});
			})
		},

		/**
		 * Init server component Uws.App or Uws.SSLApp
		 */
		initServer() {
			if (this.settings.ssl && this.settings.ssl.enable) {
				this.server = Uws.SSLApp({
					key_file_name: this.settings.ssl.keyPath,
					cert_file_name: this.settings.ssl.certPath,
					ssl_prefer_low_memory_usage: this.server.ssl.prefer_low_memory_usage || false
				});
				return;
			}
			this.server = Uws.App({});
		},
	},
}

module.exports = UwsServer;