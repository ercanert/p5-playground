const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'renders');
const PORT = Number(process.env.PORT || 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.webm': 'video/webm', '.md': 'text/markdown; charset=utf-8',
};

function reply(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function safeStaticPath(urlPath) {
  const pathname = decodeURIComponent(urlPath.split('?')[0]);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const resolved = path.resolve(ROOT, relative);
  return resolved === ROOT || resolved.startsWith(`${ROOT}${path.sep}`) ? resolved : null;
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/save-video') {
    const requested = String(req.headers['x-filename'] || 'cezeri-test-720p-24fps.webm');
    const filename = path.basename(requested).replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!filename.endsWith('.webm')) return reply(res, 400, 'Only .webm files are accepted.');
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const target = path.join(OUTPUT_DIR, filename);
    const stream = fs.createWriteStream(target);
    let bytes = 0;
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > 250 * 1024 * 1024) req.destroy(new Error('Video exceeds 250 MB limit.'));
    });
    req.pipe(stream);
    stream.on('finish', () => reply(res, 200, JSON.stringify({ path: target, bytes }), 'application/json'));
    stream.on('error', error => reply(res, 500, error.message));
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') return reply(res, 405, 'Method not allowed.');
  const target = safeStaticPath(req.url || '/');
  if (!target) return reply(res, 403, 'Forbidden.');
  fs.stat(target, (error, stat) => {
    if (error || !stat.isFile()) return reply(res, 404, 'Not found.');
    const type = TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Cache-Control': 'no-store' });
    if (req.method === 'HEAD') res.end();
    else fs.createReadStream(target).pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`p5 playground: http://127.0.0.1:${PORT}`);
  console.log(`WebM renders: ${OUTPUT_DIR}`);
});
