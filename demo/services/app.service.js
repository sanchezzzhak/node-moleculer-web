const {UwsServer} = require('../../src/index');
const {Service} = require('moleculer');

const HomeController = require('../controllers/home');

class AppService extends Service {

	constructor(broker) {
		super(broker);
		this.parseServiceSchema({
			name: 'app',
			settings: {
				port: 30011,
				ip: '127.0.0.1',
				portSchema: 'none',
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