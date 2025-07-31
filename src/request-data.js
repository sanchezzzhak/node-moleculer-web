const qs = require('qs');

const {regexExecAll, convertIpv6toIpv4, isValidIpv6, getFullIpv6} = require("./utils/helpers");

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
	slashes = [];

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
		this.ip = convertIpv6toIpv4(this.ip);
		this.queryRaw = req.getQuery() ?? '';
		this.query = qs.parse(`${this.queryRaw}`) ?? {};
		this.referer = req.getHeader('referer') ?? '';
		this.url = req.getUrl();
		this.userAgent = req.getHeader('user-agent') ?? '';
		this.parameters = route.params;
		this.slashes = route.slashes;
    // for proxy nginx
		if (this.ip === '127.0.0.1' && this.headers['x-nginx-proxy'] && this.headers['x-real-ip']) {
			this.ip = this.headers['x-real-ip'];
		}
		// normalize ipv6
		if (isValidIpv6(this.ip)) {
			this.ip = getFullIpv6(this.ip);
		}
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
		this.slashes = params.slashes;
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
			slashes: this.slashes,
		}
	}

}

module.exports = RequestData;