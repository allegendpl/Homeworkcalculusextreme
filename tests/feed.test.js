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

test('public official adapter imports only pinned reviewed IDs without sending credentials', async t => {
  const { importPublicFeed } = require('../scripts/import-feed.js');
  const output = await fixture(t);
  const row = { id: 'reviewed-1', title: 'Official Test', description: 'Match &amp; collect.', instructions: 'Tap to play', url: 'https://html5.gamemonetize.co/test-official/', thumb: 'https://img.gamemonetize.com/test-official/512x384.jpg', category: 'Puzzles', tags: 'Logic, Casual' };
  const selection = { minimumTotal: 6, studios: [{ company: 'TestStudio', source: 'Test Studio', ids: [row.id], approvedResources: { [row.id]: { title: row.title, embedUrl: row.url, thumbnail: row.thumb } } }] };
  const fetchFn = async (url, init) => {
    const parsed = new URL(url); assert.equal(parsed.hostname, 'rss.gamemonetize.com'); assert.equal(parsed.searchParams.get('company'), 'TestStudio');
    assert.equal(init.headers.Authorization, undefined); assert.equal(init.redirect, 'error');
    return new Response(JSON.stringify([row, { ...row, id: 'unreviewed', title: 'Never automatically approve this' }]));
  };
  const result = await importPublicFeed({ output, selection, fetchFn, now: '2026-10-09T00:00:00Z' });
  assert.equal(result.imported, 1); assert.equal(result.total, 6);
  const catalog = JSON.parse(await fs.readFile(output, 'utf8')); const imported = catalog.at(-1);
  assert.equal(imported.title, row.title); assert.equal(imported.category, 'Puzzle'); assert.equal(imported.description, 'Match & collect.');
  assert.equal(imported.embedUrl, row.url); assert.equal(imported.thumbnail, row.thumb);
  assert.match(imported.source, /GameMonetize — Test Studio/); assert.match(imported.license, /not open-source/);
  await importPublicFeed({ output, selection, fetchFn, now: '2027-01-01T00:00:00Z' });
  assert.equal(JSON.parse(await fs.readFile(output, 'utf8')).at(-1).addedAt, new Date('2026-10-09T00:00:00Z').toISOString());
});
test('public refresh rejects changed resources, bad hosts, and under-200 results without erasing catalog', async t => {
  const { importPublicFeed } = require('../scripts/import-feed.js');
  const output = await fixture(t), before = await fs.readFile(output, 'utf8');
  const row = { id: '1', title: 'Reviewed', description: 'Description', instructions: 'Tap', url: 'https://html5.gamemonetize.co/reviewed/', thumb: 'https://img.gamemonetize.com/reviewed/512x384.jpg', category: 'Arcade', tags: '' };
  const studio = { company: 'Test', source: 'Test', ids: ['1'], approvedResources: { 1: { title: row.title, embedUrl: row.url, thumbnail: row.thumb } } };
  for (const [candidate, minimum, overrideStudio] of [
    [{ ...row, url: 'https://html5.gamemonetize.co/changed/' }, 6],
    [{ ...row, title: 'Unauthorized New Content' }, 6],
    [row, 200],
    [null, 200],
    [{ ...row, thumb: 'https://unapproved.example.test/art.jpg' }, 6, { ...studio, approvedResources: { 1: { title: row.title, embedUrl: row.url, thumbnail: 'https://unapproved.example.test/art.jpg' } } }]
  ]) {
    await assert.rejects(importPublicFeed({ output, selection: { minimumTotal: minimum, studios: [overrideStudio || studio] }, fetchFn: async () => new Response(JSON.stringify(candidate ? [candidate] : [])) }));
    assert.equal(await fs.readFile(output, 'utf8'), before);
  }
});
