

const {assert} = require('chai');
const {resolve} = require('node:path');
const {ServiceBroker, Service} = require('moleculer');
const path = require("node:path");
const {UwsServer, AbstractController} = require("../src");
const axios = require("axios");


const PORT = 8080;
const IP = 'localhost';

function delay(ms) {
	return new Promise((resolve, reject) => {
		setTimeout(resolve, ms);
	});
}


/**
 *
 * @param {"arraybuffer" | "blob" | "document" | "json" | "text" | "stream" | "formdata"} responseType
 * @return {AxiosInstance}
 */
const instanceAxios = (responseType = "text") => {
	return axios.create({baseURL: 'http://127.0.0.1:8080/', responseType, timeout: 500000});
}





let SERVICES = ['app-test'];
let broker;

describe('tests', function () {
	this.timeout(30 * 1000);

	before('broker start', async () => {
		broker = new ServiceBroker({
			nodeID: 'APP',
			errorHandler(err, info) {
				// Handle the error
				this.logger.warn('Error handled:', err);
			},
		});
		// add app-test service
		broker.loadServices(resolve(__dirname, 'services'), '*.service.js');
		await broker.start();
		await broker.waitForServices(SERVICES);
	});

	after('broker stop', async () => {
		await broker.destroyService('app-test');
		await broker.stop();
		broker = null;
		await delay(1000);
	});

	it('test index controller', async () => {
		const instance = instanceAxios('text');
		const response = await instance.get(`test`);
		assert.equal('index test content', response.data)
		//
		// console.log({data});
	})

})