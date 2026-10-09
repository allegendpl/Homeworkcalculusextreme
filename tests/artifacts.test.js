'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createSitemap } = require('../scripts/make-sitemap.js');
const ROOT = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const files = ['index.html', 'game.html', 'stats.html', 'css/style.css', 'js/app.js', 'js/game.js', 'js/ads.js', 'data/games.json', 'scripts/import-feed.js', 'scripts/make-sitemap.js', 'about.html', 'privacy.html', 'dmca.html', 'contact.html', '404.html', 'manifest.json', 'sw.js', 'icons/icon-192.png', 'icons/icon-512.png', '.nojekyll', '.github/workflows/update-games.yml', 'README.md', 'sitemap.xml'];
test('required output files, navigation, and relative local resource paths', () => {
  for (const file of files) assert.ok(fs.existsSync(path.join(ROOT, file)), file);
  assert.equal(read('.nojekyll'), '');
  for (const file of files.filter(f => f.endsWith('.html'))) {
    const html = read(file); assert.match(html, /ExtremeCalculus/);
    for (const [, value] of html.matchAll(/(?:src|href)="([^"]*)"/g)) {
      assert.ok(!value.startsWith('/'), `${file}: ${value}`);
      if (/^(https:|#)/.test(value)) continue;
      const target = value.split(/[?#]/)[0]; if (target) assert.ok(fs.existsSync(path.join(ROOT, target)), `${file}: ${value}`);
    }
  }
  assert.match(read('js/app.js'), /fetch\('data\/games.json'\)/);
});
test('manifest icons and service worker shell resolve under the project subpath', () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.equal(manifest.name, 'ExtremeCalculus'); assert.equal(manifest.scope, './'); assert.equal(manifest.start_url, 'index.html');
  for (const icon of manifest.icons) { const png = fs.readFileSync(path.join(ROOT, icon.src)); assert.equal(png.subarray(1, 4).toString(), 'PNG'); const size = Number(icon.sizes.split('x')[0]); assert.equal(png.readUInt32BE(16), size); assert.equal(png.readUInt32BE(20), size); }
  const scope = 'https://allegendpl.github.io/Homeworkcalculusextreme/';
  const shell = vm.runInNewContext(read('sw.js') + '\nSHELL', { URL, self: { location: { href: scope + 'sw.js' }, addEventListener() {} } });
  for (const asset of shell) { assert.ok(asset.startsWith(scope)); assert.ok(fs.existsSync(path.join(ROOT, asset.slice(scope.length)))); }
  assert.ok(!shell.some(s => s.includes('https://embed.')));
});
test('rails are on both pages, responsive CSS reserves sizes, and no ad SDK is shipped', () => {
  for (const file of ['index.html', 'game.html']) for (const slot of ['left', 'right', 'mobile']) assert.match(read(file), new RegExp(`class="ad-slot" data-slot="${slot}"`));
  const css = read('css/style.css'); assert.match(css, /--bg:#000/); assert.match(css, /--accent:#f07a22/); assert.match(css, /position:sticky/); assert.match(css, /min-width:1280px/); assert.match(css, /width:160px;height:600px/); assert.match(css, /width:320px;height:100px/); assert.match(css, /prefers-reduced-motion/);
  assert.match(read('js/ads.js'), /consent\(\) !== 'accepted'/); assert.match(read('js/ads.js'), /PASTE APPROVED AD NETWORK SCRIPT/);
});
test('generated sitemap matches catalog and exact Pages base', () => {
  const games = JSON.parse(read('data/games.json')), generated = createSitemap(games);
  assert.equal(read('sitemap.xml'), generated);
  assert.equal((generated.match(/<url>/g) || []).length, games.length + 6);
  for (const g of games) assert.ok(generated.includes(`https://allegendpl.github.io/Homeworkcalculusextreme/game.html?id=${g.id}`));
  assert.throws(() => createSitemap(games, 'http://unsafe.test/'), /HTTPS/);
});
test('workflow uses repository secrets and main branch, never hardcoded credentials', () => {
  const workflow = read('.github/workflows/update-games.yml'); assert.match(workflow, /secrets.FEED_URL/); assert.match(workflow, /secrets.FEED_KEY/); assert.match(workflow, /workflow_dispatch/); assert.match(workflow, /schedule/); assert.match(workflow, /git push origin HEAD:main/);
});
