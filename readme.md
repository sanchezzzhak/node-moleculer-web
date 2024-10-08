node-moleculer-web
---
* This is an adapter http-server for the MolecularJs framework
* Server based on https://github.com/uNetworking/uWebSockets.js


### Install

```
npm install node-moleculer-web --save
```
or
```
yarn add node-moleculer-web
```
or
```
npm i github:sanchezzzhak/node-moleculer-web#v1.1.4
```

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
          // web-service registration strategy type for cluster
          // node (ports will be assigned +1 from the current one)
          // auto (ports will be assigned +1 from the current one if the port is free)
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
    this.bindRoutes();
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

### Router Options
* `cache` - second http cache
* `onBefore(route, req, res)` - Function before call for controller or service
* `onAfter(route, req, res)` - Function after call for controller or service

Example options for createRoute
```js
this.createRoute('get / #c:home.index', {cache: 5});
this.bindRoutes();
```


### Controller API
* properties:

| **property**                                                                                                                                  | **description**                              |
|:----------------------------------------------------------------------------------------------------------------------------------------------|:---------------------------------------------|
| `requestData`                                                                                                                                 | read request data                            |
| `cookieData`                                                                                                                                  | read/write cookie                            |
| `redirectType`                                                                                                                                | "header" \| "meta" \| "js"  (default meta)   |
| `format`                                                                                                                                      | default response content type default `html` |
| `statusCode`                                                                                                                                  | default response http code number `200`      |
| `statusCodeText`  | default response http code string `200 OK`   |

`requestData or cookieData` (The property objects are available after executing the `this.initRequest()` method inside the controller method)


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
    return this.redirect('https://youdomain.dev', 301);
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
Read or Write Cookie
```js
class Home extends AbstractController {
  async index() {
    this.initRequest();
    // read
    const cookievalue= this.cookieData.get('my_cookievalue', 1*new Date);
    // write
    this.cookieData.set('my_cookievalue', cookievalue)

    return cookievalue;
  }
}
```
Get request data
```js
class Home extends AbstractController {
  async index() {
    this.initRequest();
    const headers = this.requestData.headers;
    const ip = this.requestData.ip;
    const query = this.requestData.query ?? {};
    const referer = this.requestData.referer;
    const currentUrl = this.requestData.url;
    const userAgent = this.requestData.userAgent;

    return this.asJson({headers, ip, query, referer, currentUrl, userAgent}, 200);
  }
}
```
Call another microservice service in controller
```js
class Home extends AbstractController {
  async index() {
   const data = await this.broker.call('service-name.action', {
      email: 'test'
   }) ?? {};
	 
   return this.asJson(data, 200);
  }
}
```
Read post body
```js
class Home extends AbstractController {
  async index() {
    const body = await this.readBody();
    return this.asJson({body}, 200);
  }
}
```
Write or read cookies
```js
class Home extends AbstractController {
  async index() {
    this.initRequest()
    // read
    let cookieValue = this.cookieData.get('server-test-cookie', 0);
    // write
    this.cookieData.set('server-test-cookie', parseInt(cookieValue)+1, {
    	expires: new Date() + 36000
    })
    return this.asJson({status: 'ok', cookieValue}, 200);
  }
}
```
JWT
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
The config itself
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
