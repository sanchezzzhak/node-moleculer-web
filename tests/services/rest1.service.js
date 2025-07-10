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
					/**
					 *
					 * @param {Context} ctx
					 * @return {string}
					 */
					handler(ctx) {
						let value = ctx.meta.cookieData.get('test_cookie', 1);
						ctx.meta.cookieData.set('test_cookie', parseInt(value)+1);
						return `Hello REST1`;
					}
				},
			},
		});
	}
}

module.exports = Rest1Service;