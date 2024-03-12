const {AbstractController} = require('../../src/index');

class HomeController extends AbstractController {

	async index() {
		return this.renderRaw({
			view: `<!DOCTYPE html>
			<html>
				<head>
				<title>Home Page Title</title>
				</head>
					<body>		
					<h1>Heading</h1>
					<a href="/test/redirect">redirect to about page</a>
					<a href="/about">about page</a>
				</body>
			</html>
			`,
			httpCode: 201
		})
	}

	async about() {
		return 'page about';
	}


	async test() {
		return this.redirect('/about');
	}




}

module.exports = HomeController;