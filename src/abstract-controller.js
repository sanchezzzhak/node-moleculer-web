const ejs = require('ejs');
const {getMime} = require('./utils/mime');
const HTTP_CODES = require('./utils/http-codes');
const Timer = require("./utils/timer");
const RequestData = require("./request-data");
const CookieData = require("./cookie-data");

/** @typedef {import("uWebSockets.js").HttpRequest} HttpRequest */
/** @typedef {import("uWebSockets.js").HttpResponse} HttpResponse */

/**
 * callback async read post data for chunks
 * @param res
 * @param cb
 * @param err
 * @private
 */
const readBody = (res, cb, err) => {
	let buffer;
	/* Register data cb */
	res.onData((ab, isLast) => {
		let chunk = Buffer.from(ab);
		if (isLast) {
			if (buffer) {
				cb(Buffer.concat([buffer, chunk]));
				return;
			}
			cb(chunk);
			return;
		}

		if (buffer) {
			buffer = Buffer.concat([buffer, chunk]);
			return;
		}
		buffer = Buffer.concat([chunk]);
	});

	/* Register error cb */
	res.onAborted(err);
};

class AbstractController {
	/** @type {RequestData|null} */
	requestData = null;
	/** @type {CookieData|null} */
	cookieData = null;
	format = 'html';
	statusCode = 200;
	statusCodeText = '200 OK';
	headers = {};
	/** @type {HttpRequest} res */
	req;
	/** @type {HttpResponse} res */
	res;
	/** @type {ServiceBroker} broker */
	broker;

	clientHints = false;

	constructor(opts = {}) {
		this.broker = opts.broker;
		this.req = opts.req;
		this.res = opts.res;
		this.timer = new Timer;
		this.timer.start();

	}

	initRequest() {
		this.requestData = new RequestData(this.req, this.res);
		this.cookieData = new CookieData(this.req, this.res);
		if (this.clientHints) {
			this.setClientHintsHeaders();
		}
	}
	/**
	 * remove unnecessary information from the validators from the array
	 * @param {[{field:"", message:""}]} listErrors
	 * @returns {[]}
	 */
	compactErrors(listErrors) {
		const errors = [];
		listErrors.map((error) => {
			let {field, message} = error;
			errors.push({field, message});
		});
		return errors;
	}

	/**
	 * final response as JSON
	 * @param {JSONObject} obj
	 * @param {number} httpCode
	 */
	asJson(obj, httpCode = 200) {
		return this.renderRaw({view: JSON.stringify(obj), httpCode, format: 'json'});
	}

	writeHeader(key, value) {
		this.headers[key] = value;
	}

	/**
	 * Set all cors
	 */
	setCorsHeaders() {
		this.writeHeader('Access-Control-Allow-Origin', '*');
		this.writeHeader('Access-Control-Allow-Methods',
			'GET, POST, PUT, DELETE, OPTIONS');
		this.writeHeader('Access-Control-Allow-Headers',
			'authorization, origin, content-type, accept, x-requested-with');
		this.writeHeader('Access-Control-Max-Age', '3600');
	}

	/**
	 * Set headers client-hints
	 */
	setClientHintsHeaders() {
		this.writeHeader('accept-ch', [
			'sec-ch-ua-full-version',
			'sec-ch-ua-full-version-list',
			'sec-ch-ua-platform',
			'sec-ch-ua-platform-version',
			'sec-ch-ua-arch',
			'sec-ch-ua-bitness',
			'sec-ch-prefers-color-scheme',
		].join(', '));
	}

	/**
	 * is current connect aborted
	 * @return {any}
	 */
	isAborted() {
		return !!this.res.aborted;
	}

	/**
	 * read post data
	 * @returns {Promise<unknown>}
	 */
	readBody() {
		return new Promise((resolve, reject) => {
			readBody(this.res, resolve, reject);
		});
	}

	/**
	 * render as text
	 * @param {string} view
	 * @param {number|null} httpCode
	 * @param {string|null} format
	 */
	renderRaw({view, httpCode, format} = {}) {
		if (format === void 0) {
			format = this.format;
		}
		if (format) {
			this.writeHeader('content-type', getMime('.' + format));
		}
		if (httpCode) {
			this.setStatus(httpCode);
		}
		return view;
	}

	/**
	 * render ejs template
	 * @param {string} template
	 * @param {{}} params
	 * @param {number} httpCode
	 * @param {string} format
	 */
	render({template, params, httpCode, format} = {}) {
		return this.renderRaw({
			view: ejs.render(template, params), httpCode, format,
		});
	}

	/**
	 * set http status
	 * @param {number} httpCode
	 */
	setStatus(httpCode) {
		this.statusCode = httpCode;
		this.statusCodeText = `${(HTTP_CODES[httpCode] ?? httpCode)}`
	}

	/**
	 * redirect
	 * @param {string} location
	 * @param {number} httpCode
	 */
	redirect(location, httpCode = 301) {
		this.writeHeader('location', location);
		this.setStatus(httpCode);
		const encodedLoc = location.replace(/"/g, "%22");
		return `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`;
	}

}

module.exports = AbstractController;
