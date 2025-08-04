# node-moleculer-web

[![NPM Version](https://img.shields.io/npm/v/node-moleculer-web )](https://www.npmjs.com/package/node-moleculer-web )
[![License](https://img.shields.io/npm/l/node-moleculer-web )](https://github.com/sanchezzzhak/node-moleculer-web/blob/master/LICENSE )

High-performance web server integration for [Moleculer](https://moleculer.services ) based on [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js ).

### 📦 Features
- Built on top of ultra-fast [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js ).
- Fully compatible with [Moleculer](https://moleculer.services ) services.
- Support for controllers and middleware.
- Request and response helpers.
- Cookie and body parsing.
- Easy redirect handling.
- TypeScript support via `index.d.ts`.

---

### 🚀 Installation
```bash
npm install node-moleculer-web
````

### Uses
1 Create controller in folder controllers/home.js
```js
const {AbstractController} = require('node-moleculer-web');
class HomeController extends AbstractController {
  async index() {
    return `helo world`;
  }
}
module.exports = HomeController
```

2 Create service in folder services/app.service.js

```js
const {UwsServer} = require('node-moleculer-web');
const {Service} = require('moleculer');

const HomeController = require('../controllers/home');
  
class AppService extends Service {
  constructor(broker) {
    super(broker);
    this.parseServiceSchema({
      name: 'app',
      settings: {
          // base port for server
          port: process.evn.SERVER_PORT ?? 3101,
          // on what ip to listen
          ip: process.evn.SERVER_IP ?? '127.0.0.1',
          portSchema: process.evn.SERVER_SCHEMA ?? 'node',         
          // if statics are not needed, just remove next parameters  
          publicDir: __dirname + '/../public',
          publicIndex: 'index.html', // or false
          staticCompress: true,      // support compresion gzip, br, deflate
          staticLastModified: true,  // send last modified header for static files
          // list of controllers
          controllers: {
             home: HomeController
          }
      },
      // added mixin UwsServer to current services
      mixins: [
          UwsServer
      ],
      created: this.createService
    })
  }

  createService() {
    // register routing where home is the controller and index is the method	
    this.createRoute('get / #c:home.index')
  }
}
module.exports = AppService
```

### Router path
* `<request type> / #c:<controller name>.<action>`
* `<request type> / #s:<service name>.<action>`
* allowed request types:
* `any` - HTTP ALL
* `connect` - HTTP CONNECT
* `del` - HTTP DELETE
* `get` - HTTP GET
* `head` - HTTP HEAD
* `options` - HTTP OPTIONS
* `patch` - HTTP PATCH
* `post` - HTTP POST
* `put` - HTTP PUT
* `trace` - HTTP TRACE

### Router example
* optional id param 
* `<request type> /articles/:id? #c:article.actionIndex`
* regex id param
* `<request type> /articles/:id(\d+) #c:article.actionView`

get id param value in controller

```js
  this.req.getParameter('id') // or  this.req.getParameter('0')
  // or
  // this.inidReuqstData();
  // this.requestData.parameters.id
```

### Router Options
* `cache` - second http cache
* `onBefore(route, req, res)` - Function before call for controller or service
* `onAfter(route, req, res, data)` - Function after call for controller or service

Example options for createRoute
```js
this.createRoute('get / #c:home.index', {cache: 5});
```

#### 📶 AbstractController properties:

| **property**     | **description**                              |
|:-----------------|:---------------------------------------------|
| `requestData`    | read request data                            |
| `cookieData`     | read/write cookie                            |
| `redirectType`   | "header" \| "meta" \| "js"  (default meta)   |
| `format`         | default response content type default `html` |
| `statusCode`     | default response http code number `200`      |
| `statusCodeText` | default response http code string `200 OK`   |
| `broker`         | link ServiceBroker molecular.js              |
| `req`            | link HttpRequest  uWebsocket.js              |
| `res`            | link HttpResponse uWebsocket.js              | 

`requestData or cookieData` (The property objects are available after executing the `this.initRequest()` method inside the controller method)

#### 🕒 Performance Tracking
* `.timer`
  * An instance of Timer used to measure request processing duration.
  * `.start()` — Starts the timer.
  * `.stop()` — Stops the timer. and Returns elapsed time in milliseconds.


### AbstractController methods:

#### 🔐 JWT Methods:
* `.initJWT(key, iat = false)`
  * Initializes the JWT utility with a secret key and whether to include issued-at time (iat).
* `.getJWT()`
  * Returns the initialized JWT instance. Throws an error if not initialized.
* `.createJwtToken(payload = {})`
  * Creates a JWT token from the provided payload.
* `.extractJwtToken(token)`
  * Extracts and returns the decoded payload from a given JWT token.

#### 📥 Request Handling:

* `.initRequest()`
  - Initializes requestData and cookieData objects for accessing request data and cookies. Also sets client-hints headers if enabled.
* `.readBody()`
  - Reads the request body asynchronously. Returns a Promise.

#### 📤 Response Methods:
* `.asJson(obj, httpCode = 200)`
  * Sends a JSON response with optional HTTP status code.

* `.renderRaw({ view, httpCode, format })`
  * Renders raw content (string or HTML) with proper MIME type and HTTP status.

* `.render({ template, params, httpCode, format })`
  * Renders an EJS template with given parameters and sends it as a response.

* `.setStatus(httpCode)`
  * Sets the HTTP status code and its text representation.

* `.writeHeader(key, value)`
  * Writes a custom header to the response.

* `.setCorsHeaders()`
  * Sets CORS-related headers for cross-origin requests.

#### 🔁 Redirect Methods:
* `.redirect(location, httpCode = 301)`
  * Performs a redirect using one of the following strategies:
  * You can set the strategy in the `redirectType` property of the controller.
  * REDIRECT_TYPE_META: Meta refresh redirect (HTML-based).
  * REDIRECT_TYPE_JS: JavaScript-based redirect.
  * REDIRECT_TYPE_HEADER: Standard HTTP Location header redirect.

### Example Controllers
response json object
```js
class Home extends AbstractController {
  async index() {
   return this.asJson({}, 200);
  }
}
```
response redirect to other url
```js
class Home extends AbstractController {
  async index() {
    return this.redirect('https://youdomain.dev', 301 /* optional*/ , "meta" /* optional*/ );
  }
}
```
response ejs template
```js
class Home extends AbstractController {
  async index() {
    return this.render({
      template, params, httpCode: 200, format: 'html'
    });
  }
}
```
response raw
```js
class Home extends AbstractController {
  async index() {
    return this.renderRaw({view: 'string', httpCode: 200, format: 'html'});
  }
}
```
or
```js
class Home extends AbstractController {
  async index() {
    return 'Hello World'
  }
}
```
### 🍪 Cookie Usage Example — Reading and Writing Cookies
```js
const { AbstractController } = require('node-moleculer-web');

module.exports = class Home extends AbstractController {
  /**
   * Initialize request data and cookie handler
   */
  async index() {
    // Initialize requestData and cookieData
    this.initRequest();
    // 🔍 Read a cookie value, with fallback
    const cookieValue = this.cookieData.get('my_cookievalue', String(Date.now() /* or 1*new Date()  */   ));
    // ✍️ Set/update the cookie with a new value
    this.cookieData.set('my_cookievalue', cookieValue);
    // 📤 Return current cookie value as response
    return `Current cookie value: ${cookieValue}`;
  }
};
```
#### 📥 Get Request Data Example
```js
const { AbstractController } = require('node-moleculer-web');

module.exports = class Home extends AbstractController {
  /**
   * Handle GET request and return parsed request data
   */
  async index() {
    // Initialize request and cookie utilities
    this.initRequest();
    // Extract request data
    const headers = this.requestData.headers;       // All request headers
    const ip = this.requestData.ip;                 // Client IP address
    const query = this.requestData.query ?? {};     // Query parameters
    const referer = this.requestData.referer;       // Referrer URL
    const currentUrl = this.requestData.url;        // Current request URL
    const userAgent = this.requestData.userAgent;   // User-Agent string
  
    // Return all data as JSON response
    return this.asJson({
      headers,
      ip,
      query,
      referer,
      currentUrl,
      userAgent
    }, 200);
  }
};
```
#### 🔄 Call Another Microservice from Controller
```js
const { AbstractController } = require('node-moleculer-web');

module.exports = class Home extends AbstractController {
  /**
   * Calls another microservice and returns the result as JSON
   */
  async index() {
    try {
      const data = await this.broker.call('service-name.action', {
        email: 'test@example.com'
      }) ?? {};
      return this.asJson(data, 200);
    } catch (error) {
      return this.asJson({
        error: error.message,
        code: error.code || 500
      }, error.code || 500);
    }
  }
};
```
#### 📥 Read POST Request Body Example
```js
const { AbstractController } = require('node-moleculer-web');

module.exports = class Home extends AbstractController {
  /**
   * Reads the request body and returns it as JSON
   */
  async index() {
    try {
      const body = await this.readBody();
      return this.asJson({ body }, 200);
  
    } catch (error) {
      return this.asJson({
        error: 'Failed to read request body',
        message: error.message
      }, 400);
    }
  }
};
```

#### 🔐 JWT Usage Example — Create and Verify Tokens

```js
class Home extends AbstractController {
  // create token
  async index() {
    this.initJWT('mykey');
    const payload = {userId: 0, status: true};
    const token = this.getJWT().create(payload)
    return this.asJson({token}, 200);
  }
  // extract payload for token + validation (is payload not null then token valid)
  async test() {
   this.initRequest()
   const token = this.requestData.query.token ?? '';
   this.initJWT('mykey', false);
   const payload = this.getJWT().extract(token)
   return this.asJson({payload}, 200);
  }
}
```

#### Extend rest service 
* ! you still need to create an app server to use this example:
```js
const {HttpService} = require('node-moleculer-web');
const {Service} = require('moleculer');
class RestService extends Service {
  constructor(broker) {
    super(broker);
    this.parseServiceSchema({
      name: 'rest',
      settings: {},
      mixins: [
				HttpService  // add HttpService mixin
      ],
      actions: {
        hello: {
          rest: 'GET /hello',
          handler(ctx) {
            return 'Hello1 API Gateway!'
          }
        },
        hello2: {
          rest: 'GET /hello2/:test1/:test2',
          handler(ctx) {
            // read request data for meta object
            console.log('requestData', ctx.meta.requestData)
            // read cookie
            ctx.meta.cookieData.get('test', 0);
            // write cookie 
            ctx.meta.cookieData.set('test', 2);
            // write header
            ctx.meta.headers['my-custom-header'] = 'lama';
            return 'Hello2 API Gateway!'
          }
        },
        
        testJson: {
          rest: 'GET /hello3/test/json',
          handler(ctx) {
            return this.asJson(ctx, {
              myvalue: 111
            })
          }
        },
        
        testRedirect: {
          rest: 'GET /hello3/test/redirect',
          handler(ctx) {
            return this.redirect(ctx, 'https://google.com', 301, 'meta')
          }
        }
        
      },
    });
  }
}
```

### NGINX config if request proxying is used for once instance
```ngnix
server {
  listen 80;
  listen 443 ssl;
  listen [::]:80;
  listen [::]:443;

  server_name domain.com;
  
  location / {
    proxy_http_version 1.1;
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-NginX-Proxy true;
    proxy_pass http://127.0.0.1:3001;
    proxy_redirect off;
  }
}
```

## NGNIX config if clustering is used
Run locally
```bash
npx moleculer-runner -i 4 services
```
or
```bash
node node_modules/.bin/moleculer-runner -i 4 services
```
* The config itself
* The ports must match from your chosen strategy. `node` or ( `list` added version 1.2.1)
```ngnix
upstream node_apps {
  server 127.0.0.1:3001;
  server 127.0.0.1:3002;
  server 127.0.0.1:3003;
  server 127.0.0.1:3004;
}

server {
  listen 80;
  listen 443 ssl;
  listen [::]:80;
  listen [::]:443;

  server_name domain.com;

  location / {
    proxy_http_version 1.1;
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-NginX-Proxy true;
    proxy_pass http://node_apps;
    proxy_redirect off;
  }
}
```
cluster config moleculer.config.js
```js
module.exports = {
  nodeID: 'DEMO',
  transporter: "TCP",
  registry: {
    // type of call strategy for microservices
    strategy: "RoundRobin",
    // If set to true, then each webserver will use only its own micro-services
    preferLocal: false,      
  },
  logger: console
};
```

---

#### BZT Benchmark (install view docs https://gettaurus.org/)
run app
```bash
node tests/services/local.js
```
run strestest minimal logic
```bash
bzt tests/bzt-config.yaml
```

![bzt-test.png](tests%2Fpublic%2Fbzt-test.png)
```log
22:41:17 INFO: Test duration: 0:06:03
22:41:17 INFO: Samples count: 12909515, 0.00% failures
22:41:17 INFO: Average times: total 0.008, latency 0.008, connect 0.000
22:41:17 INFO: Percentiles:
+---------------+---------------+
| Percentile, % | Resp. Time, s |
+---------------+---------------+
|           0.0 |           0.0 |
|          50.0 |         0.006 |
|          90.0 |         0.016 |
|          95.0 |         0.018 |
|          99.0 |         0.025 |
|          99.9 |         0.038 |
|         100.0 |         0.058 |
+---------------+---------------+
22:41:17 INFO: Request label stats:
+---------------------------------------------------------------------------+--------+---------+--------+-------+
| label                                                                     | status |    succ | avg_rt | error |
+---------------------------------------------------------------------------+--------+---------+--------+-------+
| http://localhost:8080/bzt?id=39641&&hash=104bdfd40acf8d03e6b485e11b681fd4 |   OK   | 100.00% |  0.016 |       |
| http://localhost:8080/bzt?id=39641&&hash=104bdfd40acf8d03e6b485e11b681fd5 |   OK   | 100.00% |  0.006 |       |
| http://localhost:8080/bzt?id=39641&&hash=104bdfd40acf8d03e6b485e11b681fd6 |   OK   | 100.00% |  0.005 |       |
| http://localhost:8080/bzt?id=39641&&hash=104bdfd40acf8d03e6b485e11b681fd7 |   OK   | 100.00% |  0.005 |       |
| http://localhost:8080/bzt?id=39641&&hash=104bdfd40acf8d03e6b485e11b681fd8 |   OK   | 100.00% |  0.006 |       |
+---------------------------------------------------------------------------+--------+---------+--------+-------+
```

---
