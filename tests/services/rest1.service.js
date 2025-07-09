const {Service} = require("moleculer");
const {HttpService} = require("../../src");

class Rest1Service extends Service {
	constructor(broker) {
		super(broker);
		this.parseServiceSchema({
			name: 'rest1',
			mixins: [
				HttpService
			],
			actions: {
				hello: {
					rest: 'GET /hello',
					handler(ctx) {
						console.log();

						return 'Hello API Gateway!'
					}
				},
			},
		});
	}
}

module.exports = Rest1Service;