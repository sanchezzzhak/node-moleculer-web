const ejs = require('ejs');
const {getMime} = require("./utils/mime");
const {redirectMetaTemplate, redirectJsTemplate} = require("./utils/helpers");
const REDIRECT_TYPES = require("./redirect-types");
const CookieData= require("./cookie-data");
const RequestData= require("./request-data");
const {getStatusCodeText} = require("./utils/http-status");
const JWT = require("./utils/jwt");

/**
 * @typedef {import("moleculer").Context} Context
 */

/**
 * @param {Context} ctx
 * @param {string} type
 * @param {string|null} result
 * @param {number} httpCode
 * @param {string} format
 * @return {ServiceRenderResponse}
 */
const createResponse = ({
	ctx,
	type,
	result = null,
	httpCode = 200,
	format = 'html'
}) => {
	ctx.meta.headers['content-type']  = getMime('.' + format);
	ctx.meta.statusCode = httpCode;
	ctx.meta.statusCodeText = getStatusCodeText(httpCode);
	return {
		type,
		result,
		format
	};
}

/**
 * HttpServiceMixin
 **/
const HttpService = {
	settings: {
		uwsHttp: true
	},

	/*

	hooks: {
		before: {
			"*": [
				(ctx) => {
				  if (ctx.meta.headers === void 0) {
						ctx.meta.headers = {};
					}
					if (this.settings.clientHints) {
						ctx.meta.headers['accept-ch'] = [
							'sec-ch-ua-full-version',
							'sec-ch-ua-full-version-list',
							'sec-ch-ua-platform',
							'sec-ch-ua-platform-version',
							'sec-ch-ua-arch',
							'sec-ch-ua-bitness',
							'sec-ch-prefers-color-scheme',
						].join(', ');
					}
				}
			],
		}
	},

	*/

	methods: {

		/**
		 * Init JWT component to property
		 * @param {string} key
		 * @param {boolean} iat
		 */
		initJWT(key, iat = false) {
			this.jwt = new JWT({key, iat});
		},

		/**
		 * Create JWT token for payload data
		 * @param {{}} payload
		 * @return {string}
		 */
		createJwtToken(payload = {}) {
			return this.getJWT().create(payload);
		},

		/**
		 * Extract jwt token to payload data
		 * @param token
		 * @return {*}
		 */
		extractJwtToken(token) {
			return this.getJWT().extract(token);
		},

		/**
		 * Get JWT component
		 * @return {JWT}
		 */
		getJWT() {
			if (!this.jwt) {
				throw new Error('To use this method you need to call the initJWT(key, iat) method') ;
			}
			return this.jwt;
		},

		/**
		 * Render as text
		 * @param {Context} ctx
		 * @param {string} view
		 * @param {number|null} httpCode
		 * @param {string|null} format
		 * @return {ServiceRenderResponse}
		 */
		renderRaw({
				view,
				httpCode,
				format,
				ctx
		} = {}) {
			return createResponse({
				ctx,
				type: "render",
				result: view,
				format,
				httpCode
			});
		},

		/**
		 * Render ejs template
		 * @param {Context} ctx
		 * @param {string} template
		 * @param {JSONObject|{[name: string|number]: any}} params
		 * @param {number} httpCode
		 * @param {string} format
		 * @return {ServiceRenderResponse}
		 */
		render({
			 template,
			 params = {},
			 httpCode = 200,
			 format= 'html',
			 ctx
		} = {}) {
			return this.renderRaw({
				view: ejs.render(template, params),
				httpCode,
				format,
				ctx
			});
		},

		/**
		 * @param {string} location
		 * @param {number} httpCode
		 * @param {RedirectType} redirectType
		 * @param {Context} ctx
		 * @return {ServiceRenderResponse}
		 */
		redirect(
			ctx,
			location,
			httpCode = 301,
			redirectType = 'meta',
		) {
			let result = '';
			if (redirectType === REDIRECT_TYPES.REDIRECT_TYPE_META) {
				ctx.meta.headers['location'] = location;
				result = redirectMetaTemplate(location);
			} else if (redirectType === REDIRECT_TYPES.REDIRECT_TYPE_JS) {
				result = redirectJsTemplate(location);
			} else if (redirectType === REDIRECT_TYPES.REDIRECT_TYPE_HEADER) {
				ctx.meta.headers['location'] = location;
			}

			return createResponse({
				type: 'redirect',
				result,
				httpCode,
				format: 'html',
				ctx
			})
		},

		/**
		 * Final response as JSON
		 * @param {JSONObject|{[name: string|number]: any}} obj
		 * @param {number} httpCode
		 * @param {Context} ctx
		 * @return {ServiceRenderResponse}
		 */
		asJson(ctx, obj, httpCode = 200) {
			return this.renderRaw(
				{
					view: JSON.stringify(obj),
					httpCode,
					format: 'json',
					ctx
				});
		},
	}
}


module.exports = HttpService;