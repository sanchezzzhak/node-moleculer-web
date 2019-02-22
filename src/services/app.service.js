const WebServer = require('../mixins/web-server');

module.exports = {
  name: 'app-service',
  mixins: [WebServer({
	driver: "uws",
	ip: '127.0.0.1',
	port: 3015
  })],
  actions: {
	"hello": {
	  async handler(ctx) {
		let result = 'hello my fiend, method! ' + ' ' + ctx.params.req.getUrl();
		return result + ' <br> prams: ' + JSON.stringify(ctx.params.req.getParams());
	  }
	},
  },
  settings: {
	routes: [{
	  path: '/hello/:test([a-z]+)',
	  method: 'get',
	  action: 'app-service.hello'
	}, {
	  path: '/hello-post/:test([a-z]+)',
	  method: 'post',
	  action: 'app-service.hello'
	}
	],
	
  },
};

