const Uws = require('uWebSockets.js');

const fsPath = require('node:path');
const getNextOpenPort = require('./utils/get-next-open-port');
const uwsSendFile = require('./utils/uws-send-file');

/**
 * @typedef {import("uWebSockets.js").TemplatedApp} TemplatedApp
 * @typedef {import("uWebSockets.js").HttpResponse} HttpResponse
 * @typedef {import("uWebSockets.js").HttpRequest} HttpRequest
 */

/**
 * Decode param value.
 * @param val {String}
 * @return {String}
 * @private
 */
function decodeRouterParam(val) {
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
		controllers: {}
	},

	/*********************************/
	/* Private microservice methods: */
	/*********************************/

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
				const regex = /^(get|post|any|options|head|put|connect|trace|patch|del) (.*) #([sc]):([a-z]+)\.([a-z]+)$/i;
				const match = regex.exec(route);
				if (match) {
					const method = match[1].toLowerCase();
					const path = match[2] ?? '';
					const type = match[3] ?? '';
					const controller = match[4] ?? '';
					const action = match[5] ?? '';
					const cache = options.cache ?? -1;
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
		},

		/**
		 * Add route to collection list
		 * @param {RouteOptions} route
		 */
		addRoute(route) {
			this.settings.routes.push(route);
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
		 * Bind native uws routers for array
		 */
		bindRoutes() {
			this.settings.routes.forEach((route) => {

				this.getServerUws()[route.method](route.path, async (res, req) => {

					res.onAborted && res.onAborted(() => {
						res.aborted = true;
					});

					// run before promise
					if (route.onBefore) {
						await this.Promise.method(route.onBefore, {route, res, req})
					}
					// run controller.action or service.action
					const [controller, result] = route.service === void 0
						? await this.runControllerAction(route.controller, route.action, res, req)
						: [null, await this.broker.call(route.service)]
					// run after promise
					if (route.onAfter) {
						await this.Promise.method(route.onAfter, {route, res, req})
					}
					// append cork
					if (!res.aborted) {
						res.cork(() => {
							// write headers response
							if (controller !== null && controller.headers) {
								for (let key in controller.headers) {
									res.writeHeader(key, controller.headers[key]);
								}
							}
							// write cookie response
							if (controller !== null && controller.cookieData) {
								for (let key in controller.cookieData.resp) {
									res.writeHeader('set-cookie', controller.cookieData.toHeader(key));
								}
							}
							// write status response
							if (controller !== null && controller.statusCodeText) {
								res.writeStatus(controller.statusCodeText);
							}
							res.end(result);
						});
					}
				});
			});

			this.bindRoutesStatic();
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
		 * run action in controller
		 *
		 * @param {string} controller
		 * @param {string} action
		 * @param {HttpResponse} res
		 * @param {HttpRequest} req
		 * @param {RouteOptions|{}} route
		 * @returns [controller, result]
		 */
		async runControllerAction(controller, action, res, req, route = {}) {
			controller = controller.toLowerCase();
			action = action.toLowerCase();

			if (!(this.settings.controllers[controller] ?? false)) {
				return [null, `controller ${controller} not found`];
			}
			const controllerClass = this.settings.controllers[controller];
			const inst = new controllerClass({
				res,
				req,
				broker: this.broker,
				route,
			});

			if (!(inst[action] ?? false)) {
				return [null, `method ${action} for controller ${controller} not found`]
			}

			const result = await inst[action]();
			return [inst, result];
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