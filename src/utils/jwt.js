const crypto = require('crypto');

class JWT {

  key = '';
  iat = false

  constructor(options) {
    this.key = options.key ?? '';
    this.iat = options.iat ?? false;
  }

  create(payload) {
    let schema = {alg: 'HS256', typ: 'jwt'};
    if (this.iat) {
      schema['iat'] = new Date().getTime();
    }
    let head = Buffer.from(JSON.stringify(schema)).toString('base64');
    let body = Buffer.from(JSON.stringify(payload)).toString('base64');
    let signature = crypto
        .createHmac('SHA256', this.key)
        .update(`${head}.${body}`)
        .digest('base64')
    return `${head}.${body}.${signature}`;

  }

  extract(token) {
    try {
      let tokenParts = token
          .split(' ')[1]
          .split('.')
      let signature = crypto
          .createHmac('SHA256', this.key)
          .update(`${tokenParts[0]}.${tokenParts[1]}`)
          .digest('base64')
      if (signature === tokenParts[2]) {
        return JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf8'))
      }
    } catch (e) {
    }

    return null;
  }
}


module.exports = JWT;