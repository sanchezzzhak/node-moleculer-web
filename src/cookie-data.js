/** @typedef {import("uWebSockets.js").HttpRequest} HttpRequest */
/** @typedef {import("uWebSockets.js").HttpResponse} HttpResponse */

const {escape} = require('node:querystring');

const ucFirst = (string) => {
	let str = string.toLowerCase();
	return str[0].toUpperCase() + str.substring(1, str.length);
}

const converter = {
	read: (value)  => {
		if (value[0] === '"') {
			value = value.slice(1, -1)
		}
		return value.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent)
	},
	write: (value) => {
		return encodeURIComponent(value).replace(
			/%(2[346BF]|3[AC-F]|40|5[BDE]|60|7[BCD])/g,
			decodeURIComponent
		)
	},
	name: (name) => {
		return encodeURIComponent(name)
			.replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent)
			.replace(/[()]/g, escape)
	}
}

const DAY = 864e5;

class CookieData {

	reqs = {};  // request data from req
	resp = {};  // response data to write header

	/**
	 * init and parse cookie for request data
	 * @param {HttpRequest} req
	 * @param {HttpResponse} res
	 */
	constructor(req, res) {
		let cookies = req.getHeader('cookie').split('; ')
		let jar = {};
		for (let i = 0; i < cookies.length; i++) {
			let parts = cookies[i].split('=')
			let value = parts.slice(1).join('=')
			try {
				let found = decodeURIComponent(parts[0])
				if (!(found in jar)) jar[found] = {value: converter.read(value)}
				if (name === found) {
					break
				}
			} catch {}
		}
		this.reqs = jar;
	}

	/**
	 * get cookie
	 * @param {string} name
	 * @param {*} defaultValue
	 * @return {null}
	 */
	get(name, defaultValue = null) {
		return this.reqs[name]?.value ?? defaultValue;
	}

	/**
	 * get by name record to write Set-Cookie header
	 * @param name
	 * @return {string}
	 */
	toHeader(name) {
		let data = this.resp[name] ?? {};
		let headers = [
			`${name}=${data.value ?? ''}`,
			data.path ? `; Path=${data.path}`: '',
			data.domain ? `; Domain=${data.domain}`: '',
			data.expires ? `; Expires=${data.expires}`: '',
			data.secure ? '; Secure': '',
			data.httpOnly ? '; HttpOnly': '',
			data.partitioned ? '; Partitioned': '',
			data.maxAge ? `; Max-Age=${Math.floor(data.maxAge)}`: '',
			data.priority ? `; Priority=${ucFirst(data.priority)}`: '',
			data.sameSite ? `; SameSite=${ucFirst(data.sameSite)}`: '',
		];

		return headers.join('');
	}

	/**
	 * set cookie
	 * @param {string} name
	 * @param {*} value
	 * @param {CookieOptions} options
	 */
	set(name, value, options= {}) {
		if (options.path === void 0) {
			options.path = '/'
		}

		if (typeof options.expires === 'number') {
			options.expires = new Date(Date.now() + options.expires * DAY)
		}

		if (options.expires && options.expires.toUTCString) {
			options.expires = options.expires.toUTCString()
		}

		let key = converter.name(name);

		let data = Object.assign({}, {
			...options,
			value: converter.write(value),
		})

		this.resp[key] = data;
		this.reqs[key] = data;
	}

	/**
	 * has request cookie key exist
	 * @param {string} name
	 * @return {boolean}
	 */
	has(name) {
		return this.reqs[name] !== void 0;
	}

	/**
	 * remove cookie
	 * @param {string} name
	 * @param {CookieOptions} options
	 */
	remove(name, options = {}) {
		this.set(name, '', {
			...options,
			expires: -1,
		})
	}

}

module.exports = CookieData;