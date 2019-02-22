const { resolve } = require('path');
const { ServiceBroker } = require('moleculer');

const config = require('./moleculer.config.js');

const broker = new ServiceBroker(config);

broker.loadServices(
  resolve(__dirname, 'services'), '*.service.js',
);

broker.start().then(() => {

});