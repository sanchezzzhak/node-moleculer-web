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

	async actionHash() {
		this.initRequest()
		const data = this.requestData.getData();
		return this.asJson(data, 200);
	}

	async actionMetaRedirect() {
		return this.redirect('http://localhost:8080/test', 301);
	}

	async actionBzt() {
		this.initRequest()
		const data = this.requestData.getData();
		return this.asJson({data}, 200);
	}

	async actionFib() {
		this.initRequest();
		const n = this.req.getParameter('n');
		const output = await this.broker.call('test1.fib', {
			n
		})
		return this.asJson({
			n,
			output
		})
	}

	async actionRenderType() {
		this.initRequest()
		const renderType = this.req.getParameter('renderType');
		const hash = this.req.getParameter('hash');
		return this.asJson({
			hash,
			renderType
		})
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
		this.createRoute('get /a-:hash/:subid/? #c:test.actionHash');
		this.createRoute('get /test #c:test.actionIndex');
		this.createRoute('get /test/fib/:n #c:test.actionFib');
		this.createRoute('get /test/:renderType(direct|smart)/:hash #c:test.actionRenderType');
		this.createRoute('get /test/unknown #c:test.actionUnknown');
		this.createRoute('get /test/meta-redirect #c:test.actionMetaRedirect');
		this.createRoute('get /ping #c:ping.actionIndex');
		this.createRoute('get /bzt #c:test.actionBzt');
	}
}

module.exports = AppService;