const qs= require('qs');

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

	/**
	 * @param {HttpRequest} req
	 * @param {HttpResponse} res
	 */
	constructor(req, res) {
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

	}
}

module.exports = RequestData;