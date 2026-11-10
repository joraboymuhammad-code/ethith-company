const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.json': 'application/json'
};

function createAppServer() {
  return http.createServer((req, res) => {
    let reqUrl = decodeURIComponent(req.url.split('?')[0]);
    if (reqUrl === '/' || reqUrl === '') reqUrl = '/index.html';

    const filePath = path.join(ROOT, reqUrl);
    if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const stat = fs.statSync(filePath);

    // Never cache HTML/CSS/JS so updates appear immediately; cache frames aggressively
    const isCode = ext === '.html' || ext === '.css' || ext === '.js';
    const cacheHeader = isCode ? 'no-store, no-cache, must-revalidate' : 'public, max-age=86400';

    if (ext === '.mp4' && req.headers.range) {
      const parts = req.headers.range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': (end - start) + 1,
        'Content-Type': contentType,
        'Cache-Control': cacheHeader
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stat.size,
        'Cache-Control': cacheHeader
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
}

[8090, 8095].forEach((port) => {
  const srv = createAppServer();
  srv.on('error', () => {});
  srv.listen(port, () => {
    console.log(`ETHITH V3 Server listening at http://localhost:${port}`);
  });
});
