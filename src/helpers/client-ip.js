const is = require('is_js');

exports.getIpForHeaders = function (req) {
    let items = [] ;
    let rule = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g;
    let ips = JSON.stringify(req.headers).match(rule);
    ips.forEach(function (el) {
        if(is.ip(el)){
            items.push(el);
        }
    });
    return items;
};


exports.getClientIpFromXForwardedFor = function(value) {
    if (!value) {
        return null;
    }
    // x-forwarded-for may return multiple IP addresses in the format:
    // "client IP, proxy 1 IP, proxy 2 IP"
    // Therefore, the right-most IP address is the IP address of the most recent proxy
    // and the left-most IP address is the IP address of the originating client.
    // source: http://docs.aws.amazon.com/elasticloadbalancing/latest/classic/x-forwarded-headers.html
    // Azure Web App's also adds a port for some reason, so we'll only use the first part (the IP)
    const forwardedIps = value.split(',').map((e) => {
        const ip = e.trim();
        if (ip.includes(':')) {
            const splitted = ip.split(':');
            // make sure we only use this if it's ipv4 (ip:port)
            if (splitted.length === 2) {
                return splitted[0];
            }
        }
        return ip;
    });
    
    // Sometimes IP addresses in this header can be 'unknown' (http://stackoverflow.com/a/11285650).
    // Therefore taking the left-most IP address that is not unknown
    // A Squid configuration directive can also set the value to "unknown" (http://www.squid-cache.org/Doc/config/forwarded_for/)
    return forwardedIps.find(is.ip);
};



/**
 *
 * x-forwarded-for: client, proxy1, proxy2, proxy3
 *
 *
 * **/

/**
 Steps detect
 X-Client-IP
 X-Forwarded-For (Header may return multiple IP addresses in the format: "client IP, proxy 1 IP, proxy 2 IP", so we take the the first one.)
 CF-Connecting-IP (Cloudflare)
 True-Client-Ip (Akamai and Cloudflare)
 X-Real-IP (Nginx proxy/FastCGI)
 X-Cluster-Client-IP (Rackspace LB, Riverbed Stingray)
 X-Forwarded, Forwarded-For and Forwarded (Variations of #2)
 req.connection.remoteAddress
 req.socket.remoteAddress
 req.connection.socket.remoteAddress
 req.info.remoteAddress
 * @param req
 * @returns {String}
 */
exports.getClientIp = function(req) {
    
    // Standard headers used by Amazon EC2, Heroku, and others.
    if (is.ip(req.getHeader('x-client-ip'))) {
        return req.getHeader('x-client-ip');
    }
    
    // Load-balancers (AWS ELB) or proxies.
    const xForwardedFor = this.getClientIpFromXForwardedFor(req.getHeader('x-forwarded-for'));
    if (is.ip(xForwardedFor)) {
        return xForwardedFor;
    }
    
    // Cloudflare.
    // @see https://support.cloudflare.com/hc/en-us/articles/200170986-How-does-Cloudflare-handle-HTTP-Request-headers-
    // CF-Connecting-IP - applied to every request to the origin.
    if (is.ip(req.getHeader('cf-connecting-ip'))) {
        return req.getHeader('cf-connecting-ip');
    }
    
    // Akamai and Cloudflare: True-Client-IP.
    if (is.ip(req.getHeader('true-client-ip'))) {
        return req.getHeader('true-client-ip');
    }
    
    // Default nginx proxy/fcgi; alternative to x-forwarded-for, used by some proxies.
    if (is.ip(req.getHeader('x-real-ip'))) {
        return req.getHeader('x-real-ip');
    }
    
    // (Rackspace LB and Riverbed's Stingray)
    // http://www.rackspace.com/knowledge_center/article/controlling-access-to-linux-cloud-sites-based-on-the-client-ip-address
    // https://splash.riverbed.com/docs/DOC-1926
    if (is.ip(req.getHeader('x-cluster-client-ip'))) {
        return req.getHeader('x-cluster-client-ip');
    }
    
    if (is.ip(req.getHeader('x-forwarded'))) {
        return req.getHeader('x-forwarded');
    }
    
    if (is.ip(req.getHeader('forwarded-for'))) {
        return req.getHeader('forwarded-for');
    }
    
    if (is.ip(req.getHeader('forwarded'))) {
        return req.getHeader('forwarded');
    }
    
    // // Remote address checks.
    // if (is.existy(req.connection)) {
    //     if (is.ip(req.connection.remoteAddress)) {
    //         return req.connection.remoteAddress;
    //     }
    //     if (is.existy(req.connection.socket) && is.ip(req.connection.socket.remoteAddress)) {
    //         return req.connection.socket.remoteAddress;
    //     }
    // }
    //
    // if (is.existy(req.socket) && is.ip(req.socket.remoteAddress)) {
    //     return req.socket.remoteAddress;
    // }
    //
    // if (is.existy(req.info) && is.ip(req.info.remoteAddress)) {
    //     return req.info.remoteAddress;
    // }
    
    return '0.0.0.0';
};
