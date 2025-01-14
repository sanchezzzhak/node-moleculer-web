const qs = require('qs');

const {regexExecAll} = require("./utils/helpers");

/** @typedef {import("uWebSockets.js").HttpRequest} HttpRequest */
/** @typedef {import("uWebSockets.js").HttpResponse} HttpResponse */

class RequestData {

	headers = {};
	host = '';
	ip = '';
	ipProxy = '';
	query = {};
	queryRaw = '';
	url = '';
	userAgent = '';
	parameters = {};

	/**
	 * @param {HttpRequest|null} req
	 * @param {HttpResponse|null} res
	 * @param {RouteOptionsBase|null} route
	 */
	constructor(req = null, res = null, route = null) {
		if (req && res && route) {
			this.#instance(req, res, route);
		}
	}

	/**
	 * @param {HttpRequest} req
	 * @param {HttpResponse} res
	 * @param {RouteOptionsBase} route
	 */
	#instance(req, res, route) {
		this.host = req.getHeader('host');
		req.forEach((key, value) => {
			this.headers[key] = value;
		});
		this.ip = Buffer.from(res.getRemoteAddressAsText()).toString();
		this.ipProxy = Buffer.from(res.getProxiedRemoteAddressAsText()).toString();
		this.queryRaw = req.getQuery() ?? '';
		this.query = qs.parse(`${this.queryRaw}`) ?? {};
		this.referer = req.getHeader('referer') ?? '';
		this.url = req.getUrl();
		this.userAgent = req.getHeader('user-agent') ?? '';
		this.parameters = this.#parseRouteParametersFromRequest(route.path, req)
	}

	/**
	 * @param {string} url
	 * @param {HttpRequest} req
	 * @return {{}}
	 */
	#parseRouteParametersFromRequest(url, req) {
		const params = {};
		if (url.includes(':')) {
			const matches = regexExecAll(url, /(:\w+)/ig);
			for (let i = 0; i < matches.length; i++) {
				params[matches[i][0].substring(1)] = req.getParameter(i);
			}
		}
		return params;
	}

	setData(params = {}) {
		this.host = params.host;
		this.headers = params.headers;
		this.ip = params.ip;
		this.ipProxy = params.ipProxy;
		this.queryRaw = params.queryRaw;
		this.query = params.query;
		this.referer = params.referer;
		this.url = params.referer;
		this.userAgent = params.userAgent;
		this.parameters = params.parameters;
	}

	getData() {
		return {
			host: this.host,
			headers: this.headers,
			ip: this.ip,
			ipProxy: this.ipProxy,
			queryRaw: this.queryRaw,
			query: this.query,
			referer: this.referer,
			url: this.referer,
			userAgent: this.userAgent,
			parameters: this.parameters,
		}
	}

}

module.exports = RequestData;