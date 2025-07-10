const moleculerConfig = require('./moleculer.config');
const { resolve } = require('path');
const { ServiceBroker } = require('moleculer');

const broker = new ServiceBroker(moleculerConfig);
broker.loadServices(resolve(__dirname), '*.service.js');

broker.start().catch(e => {
	console.error(e)
})
