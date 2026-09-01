const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const ROOT = __dirname;

function proxyDrive(fileId, res) {
  const driveUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
  https.get(driveUrl, { timeout: 20000 }, (proxyRes) => {
    if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
      https.get(proxyRes.headers.location, { timeout: 20000 }, (proxyRes2) => {
        res.writeHead(proxyRes2.statusCode, {
          'Content-Type': proxyRes2.headers['content-type'] || 'application/octet-stream',
          'Access-Control-Allow-Origin': '*',
        });
        proxyRes2.pipe(res);
      }).on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
        res.end('Proxy redirect error: ' + err.message);
      });
      return;
    }
    res.writeHead(proxyRes.statusCode, {
      'Content-Type': proxyRes.headers['content-type'] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
    });
    proxyRes.pipe(res);
  }).on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
    res.end('Proxy error: ' + err.message);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/drive-proxy') {
    const fileId = url.searchParams.get('fileId');
    if (!fileId) {
      res.writeHead(400, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      return res.end('Missing fileId');
    }
    return proxyDrive(fileId, res);
  }

  let filePath = path.join(ROOT, url.pathname === '/' ? 'index.html' : url.pathname);
  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`PULLUK sunucusu http://localhost:${PORT} adresinde çalışıyor`);
});
