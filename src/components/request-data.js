const DRIVERS = require('../consts/http-drivers');
const IP = require('../helpers/client-ip');

module.exports = class RequestData {
  
  constructor(originalRequest, driver) {
	this._request = originalRequest;
	this._driver = driver;
	this._ip = null;
	this._params = {};
  };
  
  getUrl() {
	if (DRIVERS.UWS === this._driver) {
	  return this._request.getUrl();
	}
	return this._request.url;
  }
  
  getQuery() {
	if (DRIVERS.UWS === this._driver) {
	  return this._request.getQuery();
	}
	throw new Error('Add realisation support method old drivers')
  }
  
  /**
   * @param name {String}
   * @returns {*}
   */
  getHeader(name) {
	if (DRIVERS.UWS === this._driver) {
	  return this._request.getHeader(name);
	}
	return this._request.headers[name] ? this._request.headers[name] : null;
  }
  
  /**
   * @returns {String}
   */
  getMethod() {
	if (DRIVERS.UWS === this._driver) {
	  return this._request.getMethod();
	}
	
	return String(this._request.method).toLowerCase();
  }
  
  /**
   * @returns {null|String}
   */
  getClientIp() {
	if (this._ip === null) {
	  this._ip = IP.getClientIp(this);
	}
	return this._ip;
  }
  
  setClientIp(ip) {
	this._ip = ip;
  }
  
  setParams(params) {
	this._params = params;
  }
  
  getParams() {
	return this._params;
  }
  
};


