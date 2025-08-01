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

const REGEX_RULE = /^(get|post|any|options|head|put|connect|trace|patch|del) (.*) #([sc]):([a-z][\w-]+)\.([a-z][\w-]+)$/i;

const pathToRegExp = function (path, keys) {
	path = path
		.concat('/?')
		.replace(/\/\(/g, '(?:/')
		.replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?|\*/g, function(_, slash, format, key, capture, optional){
			if (_ === "*"){
				keys.push(void 0);
				return _;
			}

			keys.push(key);
			slash = slash || '';
			return ''
				+ (optional ? '' : slash)
				+ '(?:'
				+ (optional ? slash : '')
				+ (format || '') + (capture || '([^/]+?)') + ')'
				+ (optional || '');
		})
		.replace(/([\/.])/g, '\\$1')
		.replace(/\*/g, '(.*)');

	return new RegExp('^' + path + '$', 'i');
}

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
const PORT_SCHEMA_LIST = 'list';

const ROUTER_TYPE_CONTROLLER = 'c';
const ROUTER_TYPE_SERVICE = 's';

const usedPorts = new Set();

const getFreePort = (ports) => {
	for (let port of ports) {
		if (!usedPorts.has(port)) {
			usedPorts.add(port);
			return port;
		}
	}
	return null;
}

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
		ports: [],
		controllers: {},
		routes: {},
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
		// auto ser port for next open port.
		if (this.settings.portSchema === PORT_SCHEMA_AUTO) {
			this.settings.port = await getNextOpenPort(Number(this.settings.port));
		}
		// set port for array this.settings.ports
		if (this.settings.portSchema === PORT_SCHEMA_LIST) {
			if (this.settings.ports === void 0) {
				throw new Error('property <Array:number>ports not declaration')
			}
			this.settings.port = await getFreePort(Number(this.settings.ports));
		}
		// set port for instance cluster
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
			`port strategy: ${this.settings.portSchema}`,
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
			const match = REGEX_RULE.exec(route);
			if (match) {
				const method = match[1].toLowerCase();   // http type
				const path = match[2] ?? '';             // url path
				const type = match[3] ?? '';             // type controller or service
				const controller = match[4] ?? '';       // name controller or service
				const action = match[5] ?? '';           // name action
				const cache = options.cache ?? -1;     // cache option
				const onBefore = options.onBefore ?? null;  // callback before run service/controller
				const onAfter = options.onAfter ?? null; // callback after run service/controller
				const keys = [];                          // params keys names for path
				const regex = pathToRegExp(path, keys)  // create regex for match

				switch (type) {
					case ROUTER_TYPE_CONTROLLER:
						this.addRoute({
							path, keys, regex, method, controller, action, cache, onBefore, onAfter
						});
						break;
					case ROUTER_TYPE_SERVICE:
						this.addRoute({
							path, keys, regex, method, service: [controller, action].join('.'), cache, onBefore, onAfter
						});
						break;
				}
			}

			if (this.settings.createRouteValidate && !match) {
				throw new Error(`route "${route}" does not match the template ``"${REGEX_RULE.toString()}"`)
			}
		},

		/**
		 * Add route to collection list
		 * @param {RouteOptions|{}} route
		 */
		addRoute(route) {
			const {method} = route;
			if (!this.settings.routes[method]) {
				this.settings.routes[method] = [];
			}
			this.settings.routes[method].push(route);
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

		/**
		 * Find route by method and url
		 * @param {string} method
		 * @param {string} url
		 * @return {Promise<(RouteOptions|{[name:string]}|Array<string>|*[])[]>}
		 */
		async findRouteWithUrl(method, url) {
			const routes = this.settings.routes[method] ?? this.settings.routes['any'] ?? [];
			for(const route of routes) {
				const captures = url.match(route.regex);
				if (captures) {
					const
						keys = route.keys,
						splats = [],
						params = {};

					for (let j = 1, len = captures.length; j < len; ++j) {
						const key = keys[j-1],
							val = typeof captures[j] === 'string'
								? decodeURIComponent(captures[j])
								: captures[j];

						if (key) {
							params[key] = val;
						} else {
							splats.push(val);
						}

					}
					return [route, params, splats];
				}
			}

			return [null];
		},

		/**
		 * Bind native uws routers
		 */
		bindRoutes() {
			this.bindRoutesThroughAllService();
			const rootDir = this.settings.publicDir;
			const indexFile = this.settings.publicIndex
				? fsPath.join(rootDir, this.settings.publicIndex)
				: false;


			this.getServerUws().any('/*',
			/**
			 * @param {HttpResponse} res
			 * @param {HttpRequest} req
			 * @return {Promise<void>}
			 */
			async (res, req) => {
				res.onAborted && res.onAborted(() => {
					res.aborted = true;
				});

				const method = req.getMethod();
				const url = req.getUrl();
				const [route, params, splats] = await this.findRouteWithUrl(method, url);

				// send static files
				if (rootDir && route === null && ['get'].includes(method)) {
					const options = {
						publicIndex: this.settings.publicIndex,
						compress: this.settings.staticCompress,
						lastModified: this.settings.staticLastModified,
					};
					if (url === '/' && indexFile) {
						options.path = indexFile
					} else {
						options.path = fsPath.join(rootDir, url)
					}
					return uwsSendFile(res, req, options)
				}

				if (route === null) {
					res.writeStatus('404 Not Found');
					res.end('Cannot GET ' + url)
					return;
				}

				req.getParameter = function (key) {
					return params[key] ?? params[route.keys[key] ?? ''] ?? null
				};

				let controller = null,
					result = null,
					cookies = [],
					statusCode = null,
					statusCodeText = null,
					headers = null;

				// run before promise
				if (route.onBefore) {
					await this.Promise.method(route.onBefore, {route, res, req, params, splats})
				}

				if (route.controller) {
					[controller, result, headers, cookies, statusCodeText]
						= await this.runControllerAction(route.controller, route.action, res, req, route, params, splats)
				} else {
					[result, headers, cookies, statusCodeText]
						= await this.runServiceAction(route.service, res, req, route, params, splats);
				}

				// run after promise
				if (route.onAfter) {
					result = await this.Promise.method(route.onAfter, {route, res, req, params, splats, data: result})
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
		 * @param {string} service
		 * @param {HttpResponse} res
		 * @param {HttpRequest} req
		 * @param {RouteOptions} route
		 * @param params
		 * @param slashes
		 * @return [result, headers, cookies, statusCodeText]
		 */
		async runServiceAction(service, res, req, route, params, slashes) {
			const cookieData = new CookieData(req, res);
			/** @type RouteOptions */
			const mockRoute = {
				path: route.path,
				method: route.method,
				controller: route.controller,
				action: route.action,
				cache: route.cache,
				keys: route.keys,
				regex: route.regex,
				params,
				slashes
			};
			const requestData = new RequestData(req, res, mockRoute);
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

			const meta = {
				headers: {},
				cookieData,
				requestData
			}
			/** @type {string|ServiceRenderResponse} response */
			const response = await this.broker.call(route.service, {
				route: mockRoute,
				postData: postData
			}, {meta});

			let headers = meta.headers ?? {};
			let statusCode = meta.statusCode ?? null;
			let statusCodeText = meta.statusCodeText ?? null;
			// map response to data
			if (response.result !== void 0) {
				result = response.result;
			} else {
				result = response;
			}

			let cookies = [];
			for (let key in cookieData.resp) {
				const value = cookieData.toHeader(key);
				cookies.push(value)
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
		 * @param {*} params
		 * @param {*} slashes
		 * @returns [controller, result, headers, cookies, statusCodeText]
		 */
		async runControllerAction(
			controller,
			action,
			res,
			req,
			route,
			params,
			slashes
		) {
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
					cache: route.cache,
					keys: route.keys,
					regex: route.regex,
					params,
					slashes
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