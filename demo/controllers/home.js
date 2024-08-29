const {AbstractController} = require('../../src/index');

class HomeController extends AbstractController {

	async index() {
		this.initRequest();

		let cookieValue = this.cookieData.get('server-test-cookie', 0);

		this.cookieData.set('server-test-cookie', parseInt(cookieValue)+1, {
			expires: new Date() + 36000
		})

		return this.renderRaw({
			view: `<!DOCTYPE html>
			<html>
				<head>
				<title>Home Page Title</title>
				</head>
					<body>		
					<h1>Heading</h1>
					<ul>
						<li>  <a href="/index1.html">get static file</a></li>
						<li>	<a href="/test/redirect">redirect to about page</a></li>
						<li>	<a href="/about">about page</a></li>
					</ul>
					
					current cookie incr ${cookieValue}
				</body>
			</html>
			`,
			httpCode: 201
		})
	}

	async about() {
		this.initRequest();
		let cookieValue = this.cookieData.get('server-test-cookie', '0');
		return 'page about cookie value ' + cookieValue;
	}

	async test() {
		return this.redirect('/about');
	}




}

module.exports = HomeController;