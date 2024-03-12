const {createBrotliCompress, createGzip, createDeflate} = require('zlib');
const {existsSync, statSync, createReadStream} = require('fs');
const fsPath = require('path');
const {getMime} = require("./mime");


const compressions = {
  br: createBrotliCompress,
  gzip: createGzip,
  deflate: createDeflate
};
const defaultOptions = {
  lastModified: true,
  headers: {},
  compress: true,
  compressionOptions: {
    priority: ['gzip', 'br', 'deflate']
  }
};

const BYTES = 'bytes=';

function writeHeaders(res, headers) {
  for (const n in headers) {
    res.writeHeader(n, headers[n].toString());
  }
}

/**
 *
 * @param {HttpRequest} req
 * @param {HttpResponse} res
 * @param {*} options
 * @return {Promise<*>}
 * https://github.com/sifrr/sifrr/blob/master/packages/server/sifrr-server/src/server/sendfile.ts
 */
async function uwsSendFile(req, res, options = {}) {
  options = Object.assign(defaultOptions, options);
  let path = options.path;
  if (path === void 0) {
    res.writeStatus('404 Not Found');
    res.end();
    return false;
  }
  if (!existsSync(path)) {
    res.writeStatus('404 Not Found');
    res.end();
    return false;
  }

  let stat = statSync(path);
  let {mtime, size} = stat;

  if (!stat.isFile()) {
    res.writeStatus('404 Not Found');
    res.end();
    return false;
  }

  let headers = options.headers;
  let ifModifiedSince = req.getHeader('if-modified-since'),
      range = req.getHeader('range'),
      acceptEncode = req.getHeader('accept-encoding')

  mtime.setMilliseconds(0);
  const mtimeutc = mtime.toUTCString();

  if (options.lastModified) {
    if (ifModifiedSince && new Date(ifModifiedSince) >= mtime) {
      res.writeStatus('304 Not Modified');
      res.end();
      return true;
    }
    headers['last-modified'] = mtimeutc;
  }
  headers['content-type'] = getMime(path);


  let start = 0, end = size - 1;
  if (range) {
    options.compress = false;
    const parts = range.replace(BYTES, '').split('-');
    start = parseInt(parts[0], 10);
    end = parts[1] ? parseInt(parts[1], 10) : end;
    headers['accept-ranges'] = 'bytes';
    headers['content-range'] = `bytes ${start}-${end}/${size}`;
    size = end - start + 1;
    res.writeStatus('206 Partial Content');
  }

  if (end < 0) end = 0;
  let readStream = createReadStream(path, {start, end});
  let compressed = false;
  if (options.compress) {
    const l = options.compressionOptions.priority.length;
    for (let i = 0; i < l; i++) {
      const type = options.compressionOptions.priority[i];
      if (acceptEncode.indexOf(type) > -1) {
        compressed = type;
        const compressor = compressions[type](options.compressionOptions);
        readStream.pipe(compressor);
        readStream = compressor;
        headers['content-encoding'] = options.compressionOptions.priority[i];
        break;
      }
    }
  }
  res.onAborted(() => readStream.destroy());
  writeHeaders(res, headers);

  if (compressed) {
    readStream.on('data', buffer => {
      res.write(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
    });
  } else {
    readStream.on('data', buffer => {
      const chunk = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
          lastOffset = res.getWriteOffset();

      // First try
      const [ok, done] = res.tryEnd(chunk, size);

      if (done) {
        readStream.destroy();
      } else if (!ok) {
        // pause because backpressure
        readStream.pause();

        // Save unsent chunk for later
        res.ab = chunk;
        res.abOffset = lastOffset;

        // Register async handlers for drainage
        res.onWritable(offset => {
          const [ok, done] = res.tryEnd(res.ab.slice(offset - res.abOffset), size);
          if (done) {
            readStream.destroy();
          } else if (ok) {
            readStream.resume();
          }
          return ok;
        });
      }
    });
  }
  readStream
      .on('error', e => {
        res.writeStatus('500 Internal server error');
        res.end();
        readStream.destroy();
        // throw e;
      })
      .on('end', () => {
        res.end();
      });


  return true;

}


module.exports = uwsSendFile;