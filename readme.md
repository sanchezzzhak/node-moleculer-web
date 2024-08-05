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
          // web-service registration type
            // node (ports will be assigned +1 from the current one)
            // auto (ports will be assigned +1 from the current one if the port is free)
          portSchema: process.evn.SERVER_SCHEMA ?? 'node',              
            // if statics are not needed, just remove this parameter
          publicDir: __dirname + '/../public',  
            // list of controllers
          controllers: {
             home: HomeController
          }
      },
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

### Format bind route
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

### Controller API

* requestData - read request data / write headers
* cookieData - read/write cookie

response json object
```js
class Home extends AbstractController {
	index() {
		return this.asJson({}, 200);
	}
}
```
response redirect to other url
```js
class Home extends AbstractController {
	index() {
		return this.redirect('https://youdomain.dev', 301);
	}
}
```
response ejs template
```js
class Home extends AbstractController {
	index() {
		return this.render({
      template, params, httpCode: 200, format: 'html'
    });
	}
}
```
response raw
```js
class Home extends AbstractController {
	index() {
		return this.renderRaw({view: 'string', httpCode: 200, format: 'html'});
	}
}
```
or
```js
class Home extends AbstractController {
	index() {
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
get request data
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
call another microservice service in controller
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
read post body
```js
class Home extends AbstractController {
	async index() {
		const body = await this.readBody();
		return this.asJson({body}, 200);
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

