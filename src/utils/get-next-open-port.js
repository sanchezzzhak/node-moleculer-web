const net = require('node:net');

const isPortOpen = async (port) => {
	return new Promise((resolve, reject) => {
		let s = net.createServer();
		s.once('error', (err) => {
			s.close();
			if (err["code"] === "EADDRINUSE") {
				resolve(false);
			} else {
				resolve(false);
			}
		});
		s.once('listening', () => {
			resolve(true);
			s.close();
		});
		s.listen(port);
	});
}

const getNextOpenPort = async(startFrom= 3000, limit = 5000) => {
	let openPort = null;
	while (startFrom < limit || !!openPort) {
		if (await isPortOpen(startFrom)) {
			openPort = startFrom;
			break;
		}
		startFrom++;
	}
	return openPort;
};

module.exports = getNextOpenPort;