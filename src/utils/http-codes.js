// https://ru.wikipedia.org/wiki/%D0%A1%D0%BF%D0%B8%D1%81%D0%BE%D0%BA_%D0%BA%D0%BE%D0%B4%D0%BE%D0%B2_%D1%81%D0%BE%D1%81%D1%82%D0%BE%D1%8F%D0%BD%D0%B8%D1%8F_HTTP
const HTTP_CODES = {
	200: '200 OK',
	201: '201 Created',
	202: '202 Accepted',
	203: '203 Non-Authoritative Information',
	204: '204 No Content',
	205: '205 Reset Content',
	304: '304 Not Modified',
	302: '302 Found', // http/1.1
	303: '303 See Other',
	307: '307 Temporary Redirect',
	308: '308 Permanent Redirect',
	400: '400 Bad Request',
	401: '401 Unauthorized',
	403: '403 Forbidden',
	404: '404 Not Found',
	406: '405 Method Not Allowed',
	409: '409 Conflict',
	500: '500 Internal Server Error',
	501: '501 Not Implemented',
	502: '502 Bad Gateway',
	503: '503 Service Unavailable',
	504: '504 Gateway Timeout',
};

module.exports = HTTP_CODES;