const {Service} = require("moleculer");

class Test1Service extends Service {
	constructor(broker) {
		super(broker);
		this.parseServiceSchema({
			name: 'test1',
			actions: {
				async fib(ctx) {
					const {n} = ctx.params;
					return this.fibonacciLoop(n);
				}
			}
		});
	}

	fibonacciLoop(n) {
		if (n <= 1) {
			return n;
		}
		let a = 0;
		let b = 1;
		for (let i = 2; i <= n; i++) {
			let temp = b;
			b = a + b;
			a = temp;
		}
		return b;
	}

}

module.exports = Test1Service;