'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const net = require('node:net');
const http = require('node:http');
const ROOT = path.resolve(__dirname, '..');
async function freePort() { const server = net.createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port; }
test('HTTP user interface serves root AND Pages subpath, all assets and five games', async t => {
  const port = await freePort();
  const server = spawn(process.execPath, ['scripts/serve.js', '--host', '127.0.0.1', '--port', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = ''; server.stdout.on('data', b => { logs += b; }); server.stderr.on('data', b => { logs += b; });
  t.after(() => server.kill('SIGTERM'));
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let n = 0; n < 50; n++) { try { const response = await fetch(base + '/'); if (response.ok) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 40)); }
  assert.ok(ready, logs);
  for (const prefix of ['/', '/Homeworkcalculusextreme/']) {
    const root = base + prefix;
    const home = await fetch(root); assert.equal(home.status, 200); assert.match(home.headers.get('content-type'), /text\/html/);
    const html = await home.text(); assert.match(html, /Free Unblocked Games Online/);
    const catalogResponse = await fetch(new URL('data/games.json', root)); assert.match(catalogResponse.headers.get('content-type'), /application\/json/);
    const games = await catalogResponse.json(); assert.ok(games.length >= 5);
    for (const page of ['index.html', 'game.html?id=2048', 'stats.html', 'about.html', 'privacy.html', 'contact.html', 'dmca.html']) {
      const response = await fetch(new URL(page, root)); assert.equal(response.status, 200);
      const pageHTML = await response.text();
      for (const [, resource] of pageHTML.matchAll(/(?:src|href)="([^"]*)"/g)) {
        if (/^(https:|#)/.test(resource)) continue;
        const url = new URL(resource, root); assert.ok(url.pathname.startsWith(prefix));
        const asset = await fetch(url); assert.equal(asset.status, 200, url.href);
      }
    }
    for (const game of games.filter(g => g.embedUrl.startsWith('games/'))) {
      const thumb = await fetch(new URL(game.thumbnail, root)); assert.equal(thumb.status, 200); assert.match(thumb.headers.get('content-type'), /image\/svg\+xml/); assert.match(await thumb.text(), /<svg/);
      const url = new URL(game.embedUrl, root), response = await fetch(url); assert.equal(response.status, 200); const body = await response.text();
      for (const [, resource] of body.matchAll(/(?:src|href)="([^"]*)"/g)) {
        if (resource.startsWith('https:')) continue;
        assert.equal((await fetch(new URL(resource, url))).status, 200, resource);
      }
    }
    const unknown = await fetch(root + 'nested/missing-page'); assert.equal(unknown.status, 404); assert.match(await unknown.text(), /This level doesn’t exist/);
    const privateFile = await fetch(root + '.git'); assert.equal(privateFile.status, 404);
    const sw = await fetch(root + 'sw.js'); assert.equal(sw.status, 200); assert.match(sw.headers.get('content-type'), /text\/javascript/);
  }
  const rejectedStatus = await new Promise((resolve, reject) => { const request = http.get(base, { headers: { Host: 'unapproved.example.test' } }, response => { response.resume(); resolve(response.statusCode); }); request.on('error', reject); });
  assert.equal(rejectedStatus, 403);
});
