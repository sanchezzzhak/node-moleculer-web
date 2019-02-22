const Http = require('http');
const Uws = require('uWebSockets.js');

const ResponseData = require('../components/response-data');
const RequestData = require('../components/request-data');
const pathRegexp = require('path-to-regexp');

const DRIVERS = require('../consts/http-drivers');
const _ = require('lodash');

/**
 * Decode param value.
 * @param val {String}
 * @return {String}
 * @private
 */
function decodeRouterParam(val) {
  if (typeof val !== 'string' || val.length === 0) {
	return val
  }
  
  try {
	return decodeURIComponent(val)
  } catch (err) {
	if (err instanceof URIError) {
	  err.message = 'Failed to decode param \'' + val + '\'';
	  err.status = 400
	}
	throw err
  }
}

module.exports = (options) => ({
  name: 'web-server',
  actions: {
	rest: {
	  visibility: 'private',
	  async handler(ctx) {
		// is empty collection routers
		if (Object.keys(this.routes).length === 0 && this.routes.constructor === Object) {
		  return null;
		}
		
		let method = ctx.params.req.getMethod();
		let result = null;
		
		// group routes by method
		if (this.routes[method] !== undefined && this.routes[method].length > 0) {
		  result = await this.routerMatch(ctx, method);
		  if (result !== null) {
			return result;
		  }
		}
		
		// group routes by any
		if (this.routes['any'] !== undefined && this.routes['any'].length > 0) {
		  result = await this.routerMatch(ctx, 'any');
		  if (result !== null) {
			return result;
		  }
		}
		
		return result;
	  }
	}
  },
  settings: {
	driver: options.driver,
	port: options.port,
	ip: options.ip,
	routes: [],
  },
  created() {
	
	this.routes = {};
	if (Array.isArray(this.settings.routes)) {
	  this.settings.routes.forEach(route => this.addRoute(route));
	}
	let driver = this.settings.driver;
	if (this.isHttpServer()) {
	  this.createHttpServer();
	}
	if (this.isUwsServer()) {
	  this.createUwsServer();
	}
	this.logger.info(`Server ${driver} created.`);
  },
  started() {
	/* istanbul ignore next */
	return new this.Promise((resolve, reject) => {
	  // http or http2
	  if (this.isHttpServer()) {
		this.server.listen(this.settings.port, this.settings.ip, err => {
		  if (err) {
			return reject(err);
		  }
		  const addr = this.server.address();
		  this.logger.info(`Server listening on http://${addr.address}:${addr.port}`);
		  resolve();
		});
	  }
	  // uws
	  if (this.isUwsServer()) {
		this.server.listen(this.settings.port, (token) => {
		  if (token) {
			this.logger.info(`Server listening uws on port ${this.settings.port}`);
			resolve();
		  } else {
			reject(err);
		  }
		});
	  }
	  
	});
  },
  stopped() {
	if (this.isUwsServer()) {
	  this.server.forcefully_free();
	  return this.Promise.resolve();
	}
	
	if (this.isHttpServer() && this.server.listening) {
	  /* istanbul ignore next */
	  return new this.Promise((resolve, reject) => {
		this.server.close(err => {
		  if (err) {
			return reject(err);
		  }
		  this.logger.info("Server stopped!");
		  return resolve();
		});
	  });
	}
	
	return this.Promise.resolve();
  },
  
  methods: {
	
	routerMatch(ctx, method) {
	  /*** @type {module.RequestData}*/
	  let req = ctx.params.req;
	  /*** @type {module.ResponseData}*/
	  let res = ctx.params.res;
	  
	  for (let i = 0, l = this.routes[method].length; i < l; i++) {
		let route = this.routes[method][i];
		let match = route.regexp.exec(req.getUrl());
		if (match) {
		  // iterate matches
		  let keys = route.keys;
		  let params = route.params;
		  for (let m = 1; m < match.length; m++) {
			let key = keys[m - 1];
			let prop = key.name;
			let val = decodeRouterParam(match[m]);
			if (val !== undefined) {
			  params[prop] = val;
			}
		  }
		  // set prepare request data
		  req.setParams(params);
		  return this.routeHandler(ctx, route, req, res);
		}
		
		
	  }
	  return null;
	},
	
	/**
	 * Call an action via broker
	 *
	 * @param {Object} route        Route options
	 * @param {RequestData} req    Request object
	 * @param {ResponseData} res    Response object
	 * @returns {Promise}
	 */
	async callAction(ctx, route, req, res) {
	  
	  // params.$req = req;
	  // params.$res = res;
	  
	  return await this.Promise.resolve()
	  //onBeforeCall handling
	  .then(() => {
		if (route.onBeforeCall) {
		  return route.onBeforeCall.call(this, ctx, route, req, res);
		}
	  })
	  // Call the action
	  .then(() => ctx.call(req.$endpoint, {req: req, res: res}, route.callOptions))
	  // Post-process the response
	  .then(data => {
		// onAfterCall handling
		if (route.onAfterCall) {
		  return route.onAfterCall.call(this, ctx, route, req, res, data);
		}
		return data;
	  })
	  // Send back the response
	  .then(data => {
		this.sendResponse(ctx, req, res, data);
		return false;
	  })
	  
	},
	
	routeHandler(ctx, route, req, res) {
	  
	  // Pointer to the matched route
	  req.$route = route;
	  res.$route = route;
	  
	  return this.Promise.resolve().then(() => {
		const endpoint = this.broker.findNextActionEndpoint(route.opts.action);
		
		if (endpoint instanceof Error) {
		  // TODO: #27
		  // if (alias._generated && endpoint instanceof ServiceNotFoundError)
		  // 	 throw 503 - Service unavailable
		  throw endpoint;
		}
		req.$endpoint = endpoint;
		req.$action = endpoint.action;
		
	  }).then(() => {
		return this.callAction(ctx, route, req, res);
	  });
	  
	},
	
	
	addRoute(opts, toBottom = true) {
	  
	  const method = opts.method !== undefined ? opts.method : 'any';
	  const route = this.createRoute(opts);
	  
	  if (this.routes[method] === undefined) {
		this.routes[method] = [];
	  }
	  const idx = this.routes[method].findIndex(r => r.opts.path == route.opts.path);
	  
	  if (idx !== -1) {
		this.routes[method][idx] = route;
	  } else {
		if (toBottom) {
		  this.routes[method].push(route);
		} else {
		  this.routes[method].unshift(route);
		}
	  }
	  
	  return route;
	},
	
	createRoute(opts) {
	  let route = {
		opts,
		keys: [],
		params: {},
	  };
	  
	  route.regexp = pathRegexp(opts.path, route.keys, {});
	  route.regexp.fast_star = opts.path === '*';
	  route.regexp.fast_slash = opts.path === '/';
	  
	  // Call options
	  route.callOptions = opts.callOptions;
	  
	  // `onBeforeCall` handler
	  if (opts.onBeforeCall) {
		route.onBeforeCall = this.Promise.method(opts.onBeforeCall);
	  }
	  // `onAfterCall` handler
	  if (opts.onAfterCall) {
		route.onAfterCall = this.Promise.method(opts.onAfterCall);
	  }
	  
	  
	  // `onError` handler
	  if (opts.onError)
		route.onError = opts.onError;
	  
	  return route;
	},
	
	/**
	 * Send 302 Redirect
	 *
	 * @param {ResponseData} res
	 * @param {String} url
	 * @param {Number} status code
	 */
	sendRedirect(res, url, code = 302) {
	  res.redirect(url, code)
	},
	
	sendResponse(ctx, req, res, data) {
	  const route = req.$route;
	  
	  /* istanbul ignore next */
	  // if (!res.statusCode)
	  res.statusCode = 200;
	  
	  // Status code & message
	  if (ctx.meta.$statusCode) {
		res.statusCode = ctx.meta.$statusCode;
	  }
	  if (ctx.meta.$statusMessage) {
		res.statusMessage = ctx.meta.$statusMessage;
	  }
	  
	  if (res.statusCode >= 300 && res.statusCode < 400 && res.statusCode !== 304) {
		const location = ctx.meta.$location;
		/* istanbul ignore next */
		if (!location)
		  this.logger.warn(`The 'ctx.meta.$location' is missing for status code ${res.statusCode}!`);
		else
		  this.sendRedirect(res, location)
	  }
	  
	  
	  let responseType;
	  // Custom responseType from ctx.meta
	  if (ctx.meta.$responseType) {
		responseType = ctx.meta.$responseType;
	  }
	  
	  let chunk;
	  // Other (stringify or raw text)
	  if (!responseType) {
		res.setHeader("Content-Type", "application/json; charset=utf-8");
		chunk = JSON.stringify(data);
	  } else {
		res.setHeader("Content-Type", responseType);
		if (_.isString(data)) {
		  chunk = data;
		} else {
		  chunk = data.toString();
		}
	  }
	  
	  if (data === null) {
		res.end();
		return;
	  }
	  
	  if (req.getMethod() === "head") {
		// skip body for HEAD
		res.end();
	  } else {
		res.end(chunk);
	  }
	},
	
	createHttpServer() {
	  
	  this.server = Http.createServer(async (req, res) => {
		await this.httpHandler(req, res);
	  });
	  
	  this.server.on("error", err => {
		this.logger.error("Server http error", err);
	  });
	},
	
	createUwsServer() {
	  this.server = Uws.App({});
	  this.server.any('/*', async (res, req) => {
		res.onAborted(() => {
		  res.aborted = true;
		});
		await this.httpHandler(req, res);
	  });
	},
	
	async httpHandler(_req, _res) {
	  // wrap request & response
	  const req = new RequestData(_req, this.settings.driver);
	  const res = new ResponseData(_res, this.settings.driver);
	  
	  return await this.actions.rest({req, res})
	  .then(result => {
		if (result === null) {
		  res.end('Cannot ' + req.getMethod() + ': ' + req.getUrl());
		}
	  }).catch(err => {
		this.logger.error(err);
		res.end(err.stack);
	  });
	  
	},
	isHttpServer() {
	  return [DRIVERS.HTTP, DRIVERS.HTTP2].indexOf(this.settings.driver) !== -1;
	},
	isUwsServer() {
	  return this.settings.driver === DRIVERS.UWS;
	},
  }
  
});