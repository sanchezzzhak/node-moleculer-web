const Uws = require('uWebSockets.js');
const fsPath = require('node:path');
const getNextOpenPort = require('./utils/get-next-open-port');
const uwsSendFile = require('./utils/uws-send-file');

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

const UwsServer = {
	server: null,
	name: 'web-server',
	settings: {
		port: 3000,
		ssl: {},
		ip: '127.0.0.1',
		publicDir: null,
		publicIndex: false, //'index.html'
		portSchema: 'node',
		routes: [],
		controllers: {}
	},

	async created() {
		this.initServer();
		return Promise.resolve();
	},

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
			`Server select port: ${this.settings.port}`,
			`port strategy: ${this.settings.portSchema}`,
			`server-id: ${nodeId}`
		];

		this.broker.logger.info(messages.join(', '))
		await this.listenServer();
	},


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
					const cache = options.cache ?? 0;
					const onBefore = options.onBefore ?? null;
					const onAfter = options.onAfter ?? null;

					if (type === 'c') {
						this.addRoute({path, method, controller, action, cache, onBefore, onAfter});
					}
					if (type === 's') {
						this.addRoute({path, method, service: [controller, action].join('.'), cache, onBefore, onAfter});
					}
				}
		},

		/**
		 *
		 * @param {RouteOptions} route
		 */
		addRoute(route) {
			this.settings.routes.push(route);
		},

		bindRoutesStatic() {
			const rootDir = this.settings.publicDir;
			const indexFile = this.settings.publicIndex
				? fsPath.join(rootDir, this.settings.publicIndex)
				: false;

			if (rootDir) {
				this.getServerUws().get('/*',  (res, req) => {
					const options = {};
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
		 * bind native uws routers for array
		 */
		bindRoutes() {
			this.settings.routes.forEach((route) => {
				this.getServerUws()[route.method](route.path, async (res, req) => {
					res.onAborted(() => {
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
							if (controller !== null && controller.headers) {
								for (let key in controller.headers) {
									res.writeHeader(key, controller.headers[key]);
								}
							}
							if (controller !== null && controller.cookieData) {
								for (let key in controller.cookieData.resp) {
									res.writeHeader('set-cookie', controller.cookieData.toHeader(key));
								}
							}
							controller !== null && controller.statusCodeText && res.writeStatus(controller.statusCodeText);
							res.end(result);
						});
					}
				}, route.cache ?? 0);
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
		 * @param res
		 * @param req
		 * @param {{}} route
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
		 * init server listen port
		 */
		listenServer() {
			return new Promise((resolve, reject) => {
				this.server.listen(this.settings.port, (listenSocket) => {
					if (listenSocket) {
						this.logger.info(`Server listening ${this.settings.ip}:${this.settings.port}`);
						resolve();
					} else {
						reject();
					}
				});
			})
		},

		initServer() {
			if (this.settings.ssl.enable) {
				this.server = Uws.SSLApp({
					key_file_name: this.settings.ssl.keyPath,
					cert_file_name: this.settings.ssl.certPath,
				});
				return;
			}
			this.server = Uws.App({});
		},
	},
}

module.exports = UwsServer;