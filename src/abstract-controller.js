const ejs = require('ejs');
const {getMime} = require('./utils/mime');
const REDIRECT_TYPES = require("./redirect-types");
const Timer = require("./utils/timer");
const CookieData = require("./cookie-data");
const RequestData = require("./request-data");
const JWT = require("./utils/jwt");
const {readBody} = require("./read-body");
const {redirectMetaTemplate, redirectJsTemplate} = require("./utils/helpers");
const {getStatusCodeText} = require("./utils/http-status");

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
  /**
   * @type {{[key: string]: string}} headers to response */
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

  __checkAbortedFn = () => false;

  constructor(opts = {}) {
    this.broker = opts.broker;
    this.req = opts.req;
    this.res = opts.res;
    this.route = opts.route

    if (typeof opts.isAborted === 'function') {
      this.__checkAbortedFn = opts.isAborted;
    }

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
    if (!Array.isArray(listErrors)){
      return [];
    }
    return listErrors.map(({field, message}) => ({field, message}));
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
   * @param {string} key
   * @param {string} value
   */
  writeHeader(key, value) {
    this.headers[key.toLowerCase()] = value;
  }

  /**
   * has output header exist
   * @param key {string}
   * @returns {boolean}
   */
  hasHeader(key) {
    return this.headers[key.toLowerCase()] !== void 0;
  }

  /**
   * Write all cors headers allow to response
   */
  setCorsHeaders() {
    this.writeHeader('access-control-allow-origin', '*');
    this.writeHeader('access-control-allow-methods',
      'GET, POST, PUT, DELETE, OPTIONS');
    this.writeHeader('access-control-allow-headers',
      'authorization, origin, content-type, accept, x-requested-with');
    this.writeHeader('access-control-max-age', '3600');
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
    if (this.__checkAbortedFn()) {
      return true;
    }
    try {
      return !!(this.res && this.res.aborted);
    } catch (e) {
      return true;
    }
  }

  /**
   * Read post data
   * @returns {Promise<unknown>}
   */
  readBody() {
    return new Promise((resolve, reject) => {
      if (this.isAborted()) {
        return reject(new Error("uWS Request Aborted before reading body"));
      }
      try {
        readBody(this.res, (data) => {
          if (this.isAborted()) return reject(new Error("uWS Request Aborted during reading body"));
          resolve(data);
        }, (err) => {
          reject(err);
        });
      } catch (e) {
        reject(e);
      }
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

  /**
   * Set http status
   * @param {number} httpCode
   */
  setStatus(httpCode) {
    this.statusCode = httpCode;
    this.statusCodeText = getStatusCodeText(httpCode)
  }

  /**
   * Redirect
   * @param {string} location
   * @param {number} httpCode
   * @param {RedirectType|string|null} redirectType
   */
  redirect(location, httpCode = 301, redirectType = null) {
    const type = redirectType === null ? '' + this.redirectType : redirectType;
    if (type === REDIRECT_TYPES.REDIRECT_TYPE_META) {
      this.setStatus(httpCode);
      this.writeHeader('location', location);
      return redirectMetaTemplate(location);
    }

    if (type === REDIRECT_TYPES.REDIRECT_TYPE_JS) {
      return redirectJsTemplate(location);
    }

    if (type === REDIRECT_TYPES.REDIRECT_TYPE_HEADER) {
      this.setStatus(httpCode);
      this.writeHeader('location', location);
    }
    return '';
  }

}

module.exports = AbstractController;
