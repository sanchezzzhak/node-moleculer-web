const ejs = require('ejs');
const {getMime} = require("./utils/mime");
const {redirectMetaTemplate, redirectJsTemplate} = require("./utils/helpers");
const REDIRECT_TYPES = require("./redirect-types");
const {RequestData, CookieData} = require("./index");
const HTTP_CODES = require("./utils/http-codes");

/**
 *
 * @param type
 * @param result
 * @param httpCode
 * @param headers
 * @param cookies
 * @return {ServiceRenderResponse}
 */
const createResponse = ({
	type,
	result = null,
	httpCode = 200,
	headers = {},
	cookieData = null,
	format = 'html'
}) => {

	const cookies = [];
	if (cookiesData) {
		for (let key in cookieData.resp) {
			cookies.push(cookieData.toHeader(key))
		}
	}

	return {
		type,
		result,
		statusCode: httpCode,
		statusCodeText: getStatusCodeText(httpCode),
		headers: {
			'content-type': getMime('.' + format),
			...headers
		},
		cookies,
	};
}

const getStatusCodeText = (httpCode) => {
	return `${(HTTP_CODES[httpCode] ?? httpCode)}`
}

const HttpMixin = {
	methods: {
		/**
		 * get instance CookieData from Context.params
		 * @param params
		 * @return {CookieData}
		 */
		initCookieData(params = {}) {
			let obj = new CookieData(null, null);
			params.cookie && obj.initFromString(params.cookie);
			return obj;
		},

		/**
		 * get instance RequestData from Context.params
		 * @param params
		 * @return {RequestData}
		 */
		initRequestData(params = {}) {
			let obj = new RequestData(null, null, null);
			params.requestData && obj.setData(params.requestData)
			return obj;
		},

		/**
		 * Render as text
		 * @param {string} view
		 * @param {number|null} httpCode
		 * @param {string|null} format
		 * @param {{}} headers
		 * @param {CookieData} cookieData
		 * @return {ServiceRenderResponse}
		 */
		renderRaw({
				view,
				httpCode,
				format,
				headers,
				cookieData
		} = {}) {
			return createResponse({
				type: "render",
				result: view,
				format,
				httpCode,
				headers,
				cookieData
			});
		},

		/**
		 * Render ejs template
		 * @param {string} template
		 * @param {{}} params
		 * @param {number} httpCode
		 * @param {string} format
		 * @param {{}} headers
		 * @param {CookieData} cookieData
		 * @return {ServiceRenderResponse}
		 */
		render({
			 template,
			 params = {},
			 httpCode = 200,
			 format= 'html',
			 headers = {},
			 cookieData = null
		} = {}) {
			return this.renderRaw({
				view: ejs.render(template, params),
				httpCode,
				format,
				headers,
				cookieData
			});
		},

		/**
		 * @param {string} location
		 * @param {number} httpCode
		 * @param {RedirectType} redirectType
		 * @param {{}} headers
		 * @param {CookieData} cookieData
		 * @return {ServiceRenderResponse}
		 */
		redirect(
			location,
			httpCode = 301,
			redirectType = 'meta',
			headers = {},
			cookieData = null
		) {

			let result = '';
			if (redirectType === REDIRECT_TYPES.REDIRECT_TYPE_META) {
				headers['location'] = location;
				result = redirectMetaTemplate(location);
			} else if (redirectType === REDIRECT_TYPES.REDIRECT_TYPE_JS) {
				result = redirectJsTemplate(location);
			} else if (redirectType === REDIRECT_TYPES.REDIRECT_TYPE_HEADER) {
				headers['location'] = location;
			}
			return createResponse({
				type: 'redirect',
				result,
				httpCode,
				format: 'html',
				headers,
				cookieData
			})
		},

		/**
		 * Final response as JSON
		 * @param {JSONObject} obj
		 * @param {number} httpCode
		 * @param {{}} headers
		 * @param {CookieData} cookieData
		 * @return {ServiceRenderResponse}
		 */
		asJson(obj, httpCode = 200, headers = {}, cookieData = null) {
			return this.renderRaw(
				{
					view: JSON.stringify(obj),
					httpCode,
					format: 'json',
					headers,
					cookieData
				});
		},
	}
}


module.exports = HttpMixin;