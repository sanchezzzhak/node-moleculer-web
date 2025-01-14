const ejs = require('ejs');
const {getMime} = require('./utils/mime');
const REDIRECT_TYPES = require("./redirect-types");
const HTTP_CODES = require('./utils/http-codes');
const Timer = require("./utils/timer");
const RequestData = require("./request-data");
const CookieData = require("./cookie-data");
const JWT = require("./utils/jwt");
const {readBody} = require("./read-body");
const {redirectMetaTemplate, redirectJsTemplate} = require("./utils/helpers");

/** @typedef {import("uWebSockets.js").HttpRequest} HttpRequest */
/** @typedef {import("uWebSockets.js").HttpResponse} HttpResponse */



class AbstractController {
	/** @type {RequestData|null} */
	requestData = null;
	/** @type {CookieData|null} */
	cookieData = null;
	/** default format mime type response */
	format = 'html';
	/** default status number response */
	statusCode = 200;
	/** default status text response */
	statusCodeText = '200 OK';
	/** headers to response */
	headers = {};
	/** @type {HttpRequest} res */
	req;
	/** @type {HttpResponse} res */
	res;
	/** @type {ServiceBroker} broker */
	broker;
	/** request client-hints for header response */
	clientHints = false;
	/** redirect type for the redirect method */
	redirectType = REDIRECT_TYPES.REDIRECT_TYPE_META;

	/*** @type {RouteOptionsBase} current route */
	route

	constructor(opts = {}) {
		this.broker = opts.broker;
		this.req = opts.req;
		this.res = opts.res;
		this.route = opts.route
		this.timer = new Timer;
		this.timer.start();
	}

	/**
	 * Create JWT token for payload data
	 * @param {{}} payload
	 * @return {string}
	 */
	createJwtToken(payload = {}) {
		return this.getJWT().create(payload);
	}

	/**
	 * Extract jwt token to payload data
	 * @param token
	 * @return {*}
	 */
	extractJwtToken(token) {
		return this.getJWT().extract(token);
	}

	/**
	 * Get JWT component
	 * @return {JWT}
	 */
	getJWT() {
		if (!this.jwt) {
			throw new Error('To use this method you need to call the initJWT(key, iat) method') ;
		}
		return this.jwt;
	}

	/**
	 * Init JWT component to property
	 * @param {string} key
	 * @param {boolean} iat
	 */
	initJWT(key, iat = false) {
		this.jwt = new JWT({key, iat});
	}

	/**
	 * Init requestData and cookieData components to properties
	 */
	initRequest() {
		this.requestData = new RequestData(this.req, this.res, this.route);
		this.cookieData = new CookieData(this.req, this.res);
		if (this.clientHints) {
			this.setClientHintsHeaders();
		}
	}
	/**
	 * Remove unnecessary information from the validators from the array
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
	 * Final response as JSON
	 * @param {JSONObject} obj
	 * @param {number} httpCode
	 */
	asJson(obj, httpCode = 200) {
		return this.renderRaw({view: JSON.stringify(obj), httpCode, format: 'json'});
	}

	/**
	 * Write header to response
	 * @param key
	 * @param value
	 */
	writeHeader(key, value) {
		this.headers[key] = value;
	}

	/**
	 * Write all cors headers allow to response
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
	 * Write headers client-hints to response
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
	 * Is current connect aborted
	 * @return {any}
	 */
	isAborted() {
		return !!this.res.aborted;
	}

	/**
	 * Read post data
	 * @returns {Promise<unknown>}
	 */
	readBody() {
		return new Promise((resolve, reject) => {
			readBody(this.res, resolve, reject);
		});
	}

	/**
	 * Render as text
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
	 * Render ejs template
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

	getStatusCodeText(httpCode) {
		return `${(HTTP_CODES[httpCode] ?? httpCode)}`
	}

	/**
	 * Set http status
	 * @param {number} httpCode
	 */
	setStatus(httpCode) {
		this.statusCode = httpCode;
		this.statusCodeText = this.getStatusCodeText(httpCode)
	}

	/**
	 * Redirect
	 * @param {string} location
	 * @param {number} httpCode
	 */
	redirect(location, httpCode = 301) {
		if (this.redirectType === REDIRECT_TYPES.REDIRECT_TYPE_META) {
			this.setStatus(httpCode);
			this.writeHeader('location', location);
			return redirectMetaTemplate(location);
		}
		if (this.redirectType === REDIRECT_TYPES.REDIRECT_TYPE_JS) {
			return redirectJsTemplate(location);
		}
		if (this.redirectType === REDIRECT_TYPES.REDIRECT_TYPE_HEADER) {
			this.setStatus(httpCode);
			this.writeHeader('location', location);
		}
		return '';
	}

}

module.exports = AbstractController;
