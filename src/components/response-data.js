const DRIVERS = require('../consts/http-drivers');


module.exports = class ResponseData {
  
  constructor(originalResponse, driver){
	this._response = originalResponse;
	this._driver = driver;
	this.headersSent = false;
	this.contentSent = false;
  }
  
  setHeader(name , value){
    if(this._driver === DRIVERS.UWS){
      this._response.writeHeader(name, value);
	}else{
      this._response.setHeader(name, value);
	}
  }
  
  redirect(url, code = 302){
    this.setHeader('Location', url);
    this.setHeader('Content-Length', '0');
	this.end();
  }
  
  end(content = ''){
	 this._response.end(content);
  }
  
};

