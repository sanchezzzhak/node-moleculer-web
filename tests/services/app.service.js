const {Service} = require("moleculer");
const path = require("node:path");
const {UwsServer, AbstractController} = require("../../src");

class PingController extends AbstractController {
	async actionIndex() {
		this.initRequest()
		return 'ok pong';
	}
}

class TestController extends AbstractController {

	async index() {
		return 'index test content';
	}
}


class AppService extends Service {
	constructor(broker) {
		super(broker);
		this.parseServiceSchema({
			name: 'app-test',
			settings: {
				port: 8080,
				portSchema: 'node',
				publicIndex: false,
				publicDir: path.resolve(__dirname + '/../public'),
				controllers: {},
			},
			mixins: [UwsServer],
			created: this.createdService,
			stopped: this.stoppedService,
		})
	}
	async stoppedService() {

	}
	async createdService() {
		this.settings.controllers = {
			test: TestController,
			ping: PingController
		};
		this.createRoute('get /test #c:test.index');
		this.createRoute('get /ping #c:ping.actionIndex');
	}
}

module.exports = AppService;