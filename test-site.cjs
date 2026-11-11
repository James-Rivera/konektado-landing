const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test, before, after } = require('node:test');
const { createShowcaseServer } = require('./server.cjs');
let server, port;
before(async () => {
  server = createShowcaseServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });
function request(route, method = 'GET', host) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: route, method, headers: host ? { Host: host } : {} }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject); req.end();
  });
}
test('the case study contains static product figures, not a running app', async () => {
  const response = await request('/');
  assert.equal(response.status, 200);
  assert.match(response.text, /class="prototype-stage"/);
  assert.match(response.text, /data-prototype-panel="review"/);
  assert.match(response.text, /<title>Konektado<\/title>/);
  assert.doesNotMatch(response.text, /<iframe|\/demo-api|start-demo|prototype-bootstrap|_expo\//);
  assert.match(response.headers['content-security-policy'], /frame-src 'none'/);
  assert.match(response.headers['content-security-policy'], /connect-src 'none'/);
});
test('app, profile, internal, API and exported bundle routes are unavailable', async () => {
  for (const route of ['/konektado', '/konektado/profile', '/internal/demo-editor', '/provider/describe', '/booking/example', '/prototype-bootstrap.js', '/_expo/static/js/web/entry.js', '/.prototype-export/index.html', '/demo-api/health']) {
    assert.equal((await request(route)).status, 404, route);
  }
  assert.equal((await request('/demo-api/v1/session', 'POST')).status, 404);
  assert.equal((await request('/demo-api/v1/demo/reset', 'POST')).status, 404);
});
test('only selected assets are served; traversal and source files are refused', async () => {
  assert.equal((await request('/assets/review.png')).status, 200);
  for (const asset of ['portrait-placeholder.svg', 'hackathon-placeholder.svg']) {
    const response = await request(`/assets/${asset}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers['content-type'], 'image/svg+xml');
  }
  assert.equal((await request('/assets/team/not-a-selected-member.jpg')).status, 404);
  assert.equal((await request('/assets/hackathon/other.jpg')).status, 404);
  assert.equal((await request('/assets/InterVariable.ttf', 'HEAD')).status, 200);
  for (const route of ['/server.cjs', '/package.json', '/assets/../../.env.local', '/assets/%2e%2e/%2e%2e/.env.local', '/assets/%2f..%2fserver.cjs']) assert.equal((await request(route)).status, 404, route);
});
test('the preview is read-only and rejects a foreign Host', async () => {
  assert.equal((await request('/', 'POST')).status, 405);
  assert.equal((await request('/', 'GET', 'foreign.example')).status, 403);
});

test('both languages cover page copy and the complete typed question', async () => {
  const source = fs.readFileSync(path.join(__dirname, 'public/translations.js'), 'utf8');
  const copy = vm.runInNewContext(source + '\nkonektadoCopy');
  const html = fs.readFileSync(path.join(__dirname, 'public/index.html'), 'utf8');
  assert.deepEqual(Object.keys(copy.en).sort(), Object.keys(copy.taglish).sort());
  for (const [, key] of html.matchAll(/data-copy(?:-aria|-alt|-caption|-title)?="([^"]+)"/g)) {
    for (const language of ['en', 'taglish']) assert.equal(typeof copy[language][key], 'string', language + ': ' + key);
  }
  for (const language of ['en', 'taglish']) {
    const c = copy[language];
    assert.equal(c.questionStart + c.questionEmphasis + c.questionEnd + '?', c.questionLabel);
  }
  const response = await request('/translations.js');
  assert.equal(response.status, 200);
  assert.match(response.headers['content-type'], /javascript/);
  assert.match(response.text, /const konektadoCopy/);
});

test('the standalone project has no parent-workspace or app runtime dependency', () => {
  const root = __dirname;
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.deepEqual(pkg.dependencies || {}, {});
  assert.deepEqual(pkg.devDependencies || {}, {});
  const hosting = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  assert.equal(hosting.outputDirectory, 'public');
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  for (const [, resource] of html.matchAll(/(?:src|href)="(\/(?:assets\/[^"?#]+|styles\.css|site-config\.js|script\.js|translations\.js))"/g)) {
    assert.equal(fs.statSync(path.join(root, 'public', resource.slice(1))).isFile(), true, resource);
  }
  for (const retired of ['demo-api.cjs', 'build-demo.cjs', 'fx-mika-profile.json', '.env', '.env.local', '.prototype-export']) {
    assert.equal(fs.existsSync(path.join(root, retired)), false, retired);
  }
});

test('the app handoff is explicit and stays hidden until a destination is approved', async () => {
  const html = fs.readFileSync(path.join(__dirname, 'public/index.html'), 'utf8');
  const configSource = fs.readFileSync(path.join(__dirname, 'public/site-config.js'), 'utf8');
  const config = vm.runInNewContext(configSource + '\nkonektadoSite');
  if (config.app !== null) {
    assert.ok(['web', 'apk'].includes(config.app.kind));
    const destination = new URL(config.app.href, 'http://127.0.0.1:4174');
    assert.ok(destination.protocol === 'https:' || destination.origin === 'http://127.0.0.1:4174');
    if (config.app.kind === 'apk') assert.match(destination.pathname, /\.apk$/i);
  }
  const links = [...html.matchAll(/<a[^>]*data-app-link[^>]*>/g)].map(match => match[0]);
  assert.equal(links.length, 2);
  for (const link of links) { assert.match(link, /\bhidden\b/); assert.doesNotMatch(link, /\bhref=/); }
  assert.doesNotMatch(html, /href="https:\/\/(?:www\.)?konektado\.app\//);
  assert.equal((await request('/site-config.js')).status, 200);
});
