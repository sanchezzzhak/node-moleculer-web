const {assert} = require('chai');
const {resolve} = require('node:path');
const {ServiceBroker, Service} = require('moleculer');
const axios = require("axios");
const http = require('node:http');

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

	it('test actionIndex controller', async () => {
		const instance = instanceAxios('text');
		const response = await instance.get(`test`);
		assert.equal('index test content', response.data)
	})

	it('test actionHash controller', async () => {
		const instance = instanceAxios('json');
		const response = await instance.get(`a-test/sss`);
		assert.equal('test', response.data.parameters.hash)
		assert.equal('sss', response.data.parameters.subid)
	})

	it('test actionRenderType hash regex=renderType', async () => {
		const instance = instanceAxios('json');
		let response = await instance.get(`test/direct/hash-test`);
		assert.equal('hash-test', response.data.hash)
		assert.equal('direct', response.data.renderType)

		response = await instance.get(`test/smart/hash-test`);
		assert.equal('hash-test', response.data.hash)
		assert.equal('smart', response.data.renderType)

		response = await instance.get(`test/aa/hash-test`,{
			validateStatus: (status => status > 0)
		});
		
		assert.equal(response.status, 404)
		assert.equal(response.statusText, 'Not Found');
	});

	it('test actionFib controller + call other service', async () => {
		const instance = instanceAxios('json');
		const response = await instance.get(`/test/fib/44`);

		// console.log(response.data)
		assert.equal(44, response.data.n)
		assert.equal(701408733, response.data.output)
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

	it('test client connection abort on long action (should NOT crash the server)', async () => {
		await new Promise((resolve, reject) => {
			const req = http.get(
				'http://localhost:8080/test/fib/516', (res) => {
			});

			req.on('error', (err) => {});
			setTimeout(() => {
				req.destroy();
				setTimeout(() => {
					resolve();
				}, 500);

			}, 5);
		});

		const instance = instanceAxios('text');
		const response = await instance.get(`test`);
		assert.equal('index test content', response.data);
	});

	it('test success POST request with body', async () => {
		const instance = instanceAxios('json');
		const data = {
			testData: "hello_from_post",
			imageStatus: "processed"
		};
		const response = await instance.post('test-post', data);
		assert.equal(response.status, 200);
		assert.equal(response.data, data)
	});

	it('test client connection abort DURING large POST upload (should NOT crash)', async () => {
		const http = require('node:http');

		await new Promise((resolve) => {
			const options = {
				hostname: '127.0.0.1',
				port: 8080,
				path: '/hello-post',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Transfer-Encoding': 'chunked'
				}
			};

			const req = http.request(options);
			req.on('error', () => {});
			req.write(JSON.stringify({ info: "start_uploading_large_image_data..." }));

			setTimeout(() => {
				req.destroy();
				setTimeout(() => resolve(), 500);
			}, 25);
		});

		const instance = instanceAxios('text');
		const response = await instance.get(`test`);
		assert.equal('index test content', response.data);
	});


})