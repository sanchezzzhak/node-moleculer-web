const {assert} = require('chai');
const {resolve} = require('node:path');
const {ServiceBroker, Service} = require('moleculer');
const axios = require("axios");

function delay(ms) {
	return new Promise((resolve, reject) => {
		setTimeout(resolve, ms);
	});
}

/**
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
	})

	it('test rest1 service check get cookie', async () => {
		const instance = instanceAxios('text');
		let response = await instance.get(`hello`);
		assert.equal(response.headers['set-cookie'][0], 'test_cookie=2; Path=/')
		assert.equal('Hello REST1', response.data)
	})

	it('test rest1 service set cookie', async () => {
		const instance = instanceAxios('text');
		let response = await instance.get(`hello`, {
			headers: {'Cookie': 'test_cookie=2; user_pref=dark_mode'}
		});
		assert.equal(response.headers['set-cookie'][0], 'test_cookie=3; Path=/')
		assert.equal('Hello REST1', response.data)
	})

	it('test unknown request', async () => {
		const instance = instanceAxios('text');
		const response = await instance.get(`unknown-request`, {
			validateStatus: (status => status > 0)
		});
		assert.equal(response.status, 404)
		assert.equal(response.statusText, 'Not Found');
	})

	it('test get static file', async() => {
		const instance = instanceAxios('text');
		const response = await instance.get('/static-document.html');
		assert.isTrue(response.data.indexOf('<title>Title Hello</title>') !== -1)
	})

	it('test meta redirect controller', async () => {
		const instance = instanceAxios('text');
		const response = await instance.get('/test/meta-redirect');
		const isExist = response.data.indexOf(
			'<meta http-equiv="refresh" content="0; url=http://localhost:8080/test">'
		) !== -1;
		assert.isTrue(isExist)
	})

})