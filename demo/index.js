const moleculerConfig = require('./moleculer.config');
const {resolve} = require('path');
const {ServiceBroker} = require('moleculer');

const broker = new ServiceBroker(moleculerConfig);

broker.loadServices(
	resolve(__dirname, 'services'), '*.service.js',
);

broker.start().then(() => {
	broker.logger.info('✔ Broker start completed')
});