/**
 * Safely and asynchronously reads the request body in chunks (uWebSockets.js compatible).
 * Handles uWS memory reuse bug, optional size constraints, and connection timeouts.
 * By default, limits are disabled to preserve native behavior.
 *
 * @param {object} res - uWebSockets.js response object (HttpResponse)
 * @param {function} cb - Success callback, receives the completed Node.js Buffer
 * @param {function} err - Error callback, receives Error object on timeout/abort/limit breach
 * @param {object} [options] - Optional configuration for request limits
 * @param {number} [options.maxSize] - Maximum allowed body size in bytes (Default: null / unlimited)  2 * 1024 * 1024
 * @param {number} [options.timeout] - Stream reading timeout in milliseconds (Default: null / unlimited)   10000
 */
const readBody = (res, cb, err, options = {}) => {
	const maxSize = options.maxSize || null;
	const timeoutMs = options.timeout || null;

	let buffer = null;
	let bytesRead = 0;
	let isFinished = false;
	let timer = null;

	// Initialize timeout trigger only if explicitly provided
	if (timeoutMs) {
		timer = setTimeout(() => {
			if (isFinished) return;
			isFinished = true;

			res.close(); // Forcefully close hanging TCP connection
			err(new Error('Request timeout exceeded'));
		}, timeoutMs);
	}

	/* Register data stream callback */
	res.onData((ab, isLast) => {
		if (isFinished) return;

		const chunkLength = ab.byteLength;
		bytesRead += chunkLength;

		// DoS Protection: Validate accumulated payload size
		if (maxSize && bytesRead > maxSize) {
			isFinished = true;
			if (timer) clearTimeout(timer);

			res.close(); // Immediately drop connection for abusive client
			err(new Error('Max body size limit exceeded'));
			return;
		}

		// CRITICAL FOR uWS: Deep copy memory from ArrayBuffer view.
		// Native uWS invalidates and overwrites `ab` memory space on the next tick.
		const chunk = Buffer.allocUnsafe(chunkLength);
		Buffer.from(ab).copy(chunk);

		if (isLast) {
			isFinished = true;
			if (timer) clearTimeout(timer);

			if (buffer) {
				// Pass total allocated size to optimize V8 buffer concatenation
				cb(Buffer.concat([buffer, chunk], bytesRead));
			} else {
				cb(chunk);
			}
			return;
		}

		// Accumulate incoming payload chunks
		if (buffer) {
			buffer = Buffer.concat([buffer, chunk]);
		} else {
			buffer = chunk;
		}
	});

	/* Register lifecycle abort callback (Mandatory in uWebSockets.js) */
	res.onAborted(() => {
		isFinished = true;
		if (timer) clearTimeout(timer);
		err(new Error('Request aborted by client'));
	});
};


module.exports = {readBody}