const {UwsService} = require('../../src/index');
const {Service} = require('moleculer');

const HomeController = require('../controllers/home');
const fsPath = require("path");


class AppService extends Service {

	constructor(broker) {
		super(broker);
		this.parseServiceSchema({
			name: 'app',
			settings: {
				port: 30011,
				ip: '127.0.0.1',
				portSchema: 'none',
				routes: [
					{path: '/', controller: 'home', action: 'index', method: 'get'},
					{path: '/test/redirect', controller: 'home', action: 'test', method: 'get'},
				],
				controllers: {
					home: HomeController
				}
			},
			mixins: [
				UwsService
			],
			created: this.createService
		})
	}


	createService() {

		this.createRoute({
			path: '/',
			controller: 'home',
			action: 'index',
			method: 'get'
		});
		this.createRoute('get /about #c:home.about')

		/*this.server.any('/*', (res, req) => {
			let router = this.matchRouter(res, req);
			if (router !== null) {
				if (this.runRoute(router, res, req) !== -1) {
					return;
				}
			}

			// static files
			let root = this.settings.publicDir;
			let path = req.getUrl();

			if (path === '/') {
				return uwsSendFile(req, res, {
					path: fsPath.join(root, 'index.html'),
				});
			}
			return uwsSendFile(req, res, {
				path: fsPath.join(root, path),
			});
		});*/

		this.bindRoutes();
	}

}

module.exports = AppService