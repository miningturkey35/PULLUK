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
  // 1. Check if file exists locally in files/
  const localFile = path.join(ROOT, 'files', `${fileId}.html`);
  if (fs.existsSync(localFile)) {
    const stat = fs.statSync(localFile);
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': stat.size,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400',
    });
    fs.createReadStream(localFile).pipe(res);
    return;
  }

  // 2. If not local, fetch from Google Drive and save locally
  const driveUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
  https.get(driveUrl, { timeout: 30000 }, (proxyRes) => {
    const handleRedirect = (loc) => {
      https.get(loc, { timeout: 30000 }, (proxyRes2) => {
        if (proxyRes2.statusCode >= 300 && proxyRes2.statusCode < 400 && proxyRes2.headers.location) {
          handleRedirect(proxyRes2.headers.location);
          return;
        }
        if (proxyRes2.statusCode !== 200) {
          res.writeHead(proxyRes2.statusCode, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
          res.end('Drive error status: ' + proxyRes2.statusCode);
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        });
        const fileStream = fs.createWriteStream(localFile);
        proxyRes2.pipe(fileStream);
        proxyRes2.pipe(res);
      }).on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
        res.end('Proxy redirect error: ' + err.message);
      });
    };

    if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
      handleRedirect(proxyRes.headers.location);
      return;
    }
    if (proxyRes.statusCode !== 200) {
      res.writeHead(proxyRes.statusCode, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end('Drive error status: ' + proxyRes.statusCode);
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    const fileStream = fs.createWriteStream(localFile);
    proxyRes.pipe(fileStream);
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
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache, no-store, must-revalidate' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`PULLUK sunucusu http://localhost:${PORT} adresinde çalışıyor`);
});
