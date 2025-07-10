const HTTP_CODES = require("./http-codes");

const getStatusCodeText = (httpCode) => {
	return `${(HTTP_CODES[httpCode] ?? httpCode)}`
}

module.exports = {getStatusCodeText}