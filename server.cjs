// Case-study-only preview. No Expo runtime, demo API, account or model service.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PUBLIC_PATHS = new Set([
  '/', '/index.html', '/styles.css', '/site-config.js', '/translations.js', '/script.js', '/team-motion.js', '/find-work-motion.js',
  ...[
    'favicon.png', 'logo.svg', 'logo-white.svg', 'InterVariable.ttf',
    'Inter-OFL.txt', 'iphone-16-pro.png', 'Maya-LICENSE.txt', 'CREDITS.txt',
    'welcome-worker.png', 'review.png', 'shortlist.png', 'quote.png',
    'booking.png', 'capability.png', 'portrait-placeholder.svg',
    'hackathon-placeholder.svg', 'worker-story.webp',
  ].map(file => `/assets/${file}`),
  ...['james-carlo-rivera', 'dale-andrew-lee', 'lance-montifar', 'mark-vincent-plaza', 'marcus-gabriel-marasigan'].flatMap(name => ['jpg', 'png', 'webp'].map(ext => `/assets/team/${name}.${ext}`)),
  ...['team-innobyte.webp', 'award-presentation.webp', 'third-runner-up.webp'].map(file => '/assets/hackathon/' + file),
  ...['qualifiers-press-report.webp', 'third-runner-up-press-report.webp'].map(file => '/assets/press/' + file),
  ...['01', '02', '03'].flatMap(name => ['jpg', 'png', 'webp'].map(ext => `/assets/hackathon/${name}.${ext}`)),
]);
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8' };
const CSP = "default-src 'none'; img-src 'self'; font-src 'self'; script-src 'self'; style-src 'self'; connect-src 'none'; frame-src 'none'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

function createShowcaseServer() {
  const root = path.join(__dirname, 'public');
  return http.createServer((req, res) => {
    const port = req.socket.localPort;
    if (![ `127.0.0.1:${port}`, `localhost:${port}` ].includes(req.headers.host)) {
      res.writeHead(403); return res.end('Loopback preview only');
    }
    let requested;
    try { requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400); return res.end('Bad request'); }
    // An explicit asset list prevents old builds/helpers becoming public routes.
    if (!PUBLIC_PATHS.has(requested)) { res.writeHead(404); return res.end('Not found'); }
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end();
    }
    const file = path.join(root, requested === '/' ? 'index.html' : requested.slice(1));
    fs.readFile(file, (error, body) => {
      if (error) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
        'Content-Length': body.length, 'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': CSP,
      });
      res.end(req.method === 'HEAD' ? undefined : body);
    });
  });
}
module.exports = { createShowcaseServer };
if (require.main === module) {
  const port = Number(process.env.LANDING_PORT || 4174);
  createShowcaseServer().listen(port, '127.0.0.1', () => {
    console.log(`KONEKTADO case study: http://127.0.0.1:${port}`);
  }).on('error', error => { console.error(error.message); process.exitCode = 1; });
}
