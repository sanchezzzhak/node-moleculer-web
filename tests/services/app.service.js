const {Service} = require("moleculer");
const path = require("node:path");
const {UwsServer, AbstractController} = require("../../src");

class PingController extends AbstractController {

	async actionIndex() {
		return 'ok pong';
	}

}

class TestController extends AbstractController {

	async actionIndex() {
		return 'index test content';
	}

	async actionMetaRedirect() {
		return this.redirect('http://localhost:8080/test', 301);
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
		this.createRoute('get /test #c:test.actionIndex');
		this.createRoute('get /test/unknown #c:test.actionUnknown');
		this.createRoute('get /test/meta-redirect #c:test.actionMetaRedirect');
		this.createRoute('get /ping #c:ping.actionIndex');
	}
}

module.exports = AppService;