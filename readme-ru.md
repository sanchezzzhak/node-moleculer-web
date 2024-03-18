node-moleculer-web
---
Документация [EN](readme.md)

### Установка

```
npm install node-moleculer-web --save
```
или
```
yarn add node-moleculer-web
```
или
```
npm i github:sanchezzzhak/node-moleculer-web#v1.0.0
```

### Использовать
1 Создать контроллер в папке controllers/home.js
```js
const {AbstractController} = require('node-moleculer-web');

class HomeController extends AbstractController {

	async index() {
	    return `helo world`;
    }
}
module.exports = HomeController
```


2 Создать сервис в папке services/app.service.js

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
				// базовый порт для сервера
				port: 3001,
                // на каком ip слушать
				ip: '127.0.0.1',
				// тип регистрации сервиса
                // node (порты назначены будут +1 от текущего)
                // auto (порты назначены будут +1 от текущего если порт свободен)
				portSchema: 'node',              
                // если статика не нужна просто удалите этот параметр
				publicDir: __dirname + '/../public',  
                // cписок контролеров
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
		// регистрируем роутинг где home это контрорлер а index это метод	
		this.createRoute('get / #c:home.index')
		this.bindRoutes();
	}
}

module.exports = AppService
```

### Конфиг NGNIX если используется проксирование запросов для 1 экземпляра
```ngnix
server {
  
   map $http_upgrade $connection_upgrade {  
    default upgrade;
    ''      close;
   } 

    listen 80;
    listen 443 ssl;
    listen [::]:80;
    listen [::]:443;

    server_name domain.com;
  
    location / {
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-NginX-Proxy true;
        proxy_pass http://127.0.0.1:3001;
        proxy_redirect off;
    }
}
```

## Конфиг NGNIX если используется кластеризация
Запуск локально
```bash
npx moleculer-runner -i 4 services
```
или
```bash
node node_modules/.bin/moleculer-runner -i 4 services
```
Сам конфиг
```ngnix
upstream node_apps {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
    server 127.0.0.1:3004;
}

server {

   map $http_upgrade $connection_upgrade {  
       default upgrade;
       ''      close;
   }

  listen 80;
  listen 443 ssl;
  listen [::]:80;
  listen [::]:443;

  server_name domain.com;
  
  location / {
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection $connection_upgrade;
      proxy_set_header Host $http_host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-NginX-Proxy true;
      proxy_pass http://node_apps;
      proxy_redirect off;
  }
}

```
Конфиг для кластера moleculer.config.js
```js
module.exports = {
	nodeID: 'DEMO',
	transporter: "TCP",
	registry: {
		// Тип стратегии обращений для микросервисов
		strategy: "RoundRobin",
		// Если выставить true то каждый вебсервер будет использовать только свои микро-свервисы
		preferLocal: false,      
	},
	logger: console
};
```

