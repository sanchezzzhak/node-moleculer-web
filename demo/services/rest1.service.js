const {Service} = require("moleculer");
const {HttpMixin} = require("../../src");

class Rest1Service extends Service {
	constructor(broker) {
		super(broker);
		this.parseServiceSchema({
			name: 'rest1',
			settings: {test:1},
			mixins: [
				HttpMixin
			],
			actions: {
				hello: {
					rest: 'GET /hello',
					handler(ctx) {
						return 'Hello API Gateway!'
					}
				},
				hello2: {
					rest: 'GET /hello2/:test1/:test2',
					handler(ctx) {
						return 'Hello API Gateway!'
					}
				}
			},
		});
	}
}

module.exports = Rest1Service;