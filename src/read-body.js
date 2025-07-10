/**
 * callback async read post data for chunks
 * @param res
 * @param cb
 * @param err
 * @private
 */
const readBody = (res, cb, err) => {
	let buffer;
	/* Register data cb */
	res.onData((ab, isLast) => {
		let chunk = Buffer.from(ab);
		if (isLast) {
			if (buffer) {
				cb(Buffer.concat([buffer, chunk]));
				return;
			}
			cb(chunk);
			return;
		}

		if (buffer) {
			buffer = Buffer.concat([buffer, chunk]);
			return;
		}
		buffer = Buffer.concat([chunk]);
	});

	/* Register error cb */
	res.onAborted(err);
};

module.exports = {readBody}