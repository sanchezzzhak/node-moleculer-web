const {UwsServer} = require('../../src/index');
const {Service} = require('moleculer');

const HomeController = require('../controllers/home');

class AppService extends Service {

	constructor(broker) {
		super(broker);
		this.parseServiceSchema({
			name: 'app',
			settings: {
				port: process.env.SERVER_PORT ?? 3101,
				ip: process.env.SERVER_IP ?? '127.0.0.1',
				portSchema: process.env.SERVER_SCHEMA ?? 'none',
				publicDir: __dirname + '/../statics',
				controllers: {
					home: HomeController
				}
			},
			mixins: [
				UwsServer
			],
			created: this.createService
		})
	}


	createService() {
		this.createRoute('get /about #c:home.about')
		this.createRoute('get / #c:home.index')
		this.createRoute('get /test/redirect #c:home.test')

		this.bindRoutes();
	}

}

module.exports = AppService