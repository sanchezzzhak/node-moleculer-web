// https://ru.wikipedia.org/wiki/%D0%A1%D0%BF%D0%B8%D1%81%D0%BE%D0%BA_%D0%BA%D0%BE%D0%B4%D0%BE%D0%B2_%D1%81%D0%BE%D1%81%D1%82%D0%BE%D1%8F%D0%BD%D0%B8%D1%8F_HTTP
const HTTP_CODES = {
	200: '200 OK',
	304: '304 Not Modified',
	302: '302 Found', // http/1.1
	303: '303 See Other',
	307: '307 Temporary Redirect',
	308: '308 Permanent Redirect',
	400: '400 Bad Request',
	401: '401 Unauthorized',
	403: '403 Forbidden',
	404: '404 Not Found',
	406: '405 Method Not Allowed'
};

module.exports = HTTP_CODES;