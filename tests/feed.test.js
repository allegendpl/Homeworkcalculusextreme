'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { importFeed } = require('../scripts/import-feed.js');
const games = require('../data/games.json');
const feedGame = { ...games[0], id: 'approved-example', title: '<b>Approved Example</b>', source: 'Test licensed publisher', license: 'Test permission record', embedUrl: 'https://embed.example.test/approved', thumbnail: 'https://cdn.example.test/approved.png' };
const env = { FEED_URL: 'https://feed.example.test/catalog', FEED_KEY: 'not-a-real-key' };
async function fixture(t) { const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'ec-feed-')); t.after(() => fs.rm(folder, { recursive: true, force: true })); const output = path.join(folder, 'games.json'); await fs.writeFile(output, JSON.stringify(games)); return output; }
test('import succeeds through actual request/mapping/write interface; keeps bundled games', async t => {
  const output = await fixture(t); let calls = 0;
  const result = await importFeed({ env, output, fetchFn: async (url, init) => { calls++; assert.equal(url, env.FEED_URL); assert.equal(init.headers.Authorization, 'Bearer not-a-real-key'); assert.equal(init.redirect, 'error'); return new Response(JSON.stringify({ games: [feedGame] })); } });
  assert.equal(calls, 1); assert.equal(result.total, games.filter(g => g.embedUrl.startsWith('games/')).length + 1);
  const actual = JSON.parse(await fs.readFile(output, 'utf8')); assert.equal(actual.at(-1).title, 'Approved Example');
  // Re-import replaces external catalog, retaining the originally recorded date.
  const withoutDate = { ...feedGame }; delete withoutDate.addedAt;
  await importFeed({ env, output, fetchFn: async () => new Response(JSON.stringify([withoutDate])), now: '2027-01-01T00:00:00Z' });
  assert.equal(JSON.parse(await fs.readFile(output, 'utf8')).at(-1).addedAt, new Date(feedGame.addedAt).toISOString());
});
test('missing config, HTTP, malformed, empty, oversized, collision errors never alter output', async t => {
  const output = await fixture(t), before = await fs.readFile(output, 'utf8');
  const cases = [
    { env: {}, fetchFn: async () => { throw new Error('must not request'); } },
    { env: { ...env, FEED_URL: 'http://unsafe.test' } },
    { fetchFn: async () => new Response('private body', { status: 401 }) },
    { fetchFn: async () => new Response('not json') },
    { fetchFn: async () => new Response('[]') },
    { fetchFn: async () => new Response('{}') },
    { fetchFn: async () => new Response(JSON.stringify([feedGame, feedGame])) },
    { fetchFn: async () => new Response(JSON.stringify([{ ...feedGame, license: '' }])) },
    { fetchFn: async () => new Response(JSON.stringify([{ ...feedGame, id: '2048' }])) },
    { fetchFn: async () => new Response('[]', { headers: { 'Content-Length': '999999999' } }) },
    { fetchFn: async () => { throw new Error('secret-key-in-transport-url'); } }
  ];
  for (const opts of cases) { await assert.rejects(importFeed({ env, output, ...opts }), error => { assert.ok(!error.message.includes('secret-key-in-transport-url') && !error.message.includes('private body')); return true; }); assert.equal(await fs.readFile(output, 'utf8'), before); }
});
