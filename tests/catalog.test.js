'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');
const ROOT = path.resolve(__dirname, '..');
const app = require('../js/app.js');
const games = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8'));
const state = { query: '', category: 'All', sort: 'default' };
test('actual catalog schema is valid and every local asset/notice exists', () => {
  assert.equal(app.validateCatalog(games).length, games.length);
  for (const game of games) {
    assert.ok(game.source.length && game.license.length);
    for (const field of ['thumbnail', 'embedUrl']) {
      if (!game[field].startsWith('https://')) assert.ok(fs.existsSync(path.join(ROOT, game[field].split('?')[0])), `${game.id}: ${field}`);
    }
    if (game.embedUrl.startsWith('games/')) {
      assert.match(game.license, /^MIT/);
      assert.ok(fs.existsSync(path.join(ROOT, game.id === '2048' ? 'games/2048/LICENSE.txt' : 'games/original/LICENSE.txt')));
    }
  }
  assert.match(fs.readFileSync(path.join(ROOT, 'games/2048/LICENSE.txt'), 'utf8'), /Copyright \(c\) 2014 Gabriele Cirulli/);
  assert.ok(games.every(g => g.thumbnail !== '' && !g.thumbnail.startsWith('data:')));
});
test('search, categories, favorites, sorts compose without mutating catalog', () => {
  const fixture = [
    { ...games[0], id: 'beta', title: 'Beta', category: 'Puzzle', tags: ['logic'], addedAt: '2024-01-01T00:00:00Z' },
    { ...games[0], id: 'alpha', title: 'Alpha', category: 'Arcade', tags: ['reflex'], addedAt: '2026-01-01T00:00:00Z' },
    { ...games[0], id: 'gamma', title: 'Gamma', category: 'Puzzle', tags: ['logic'], addedAt: '2025-01-01T00:00:00Z' }
  ];
  assert.deepEqual(app.selectGames(fixture, { ...state, query: ' PUZZLE  logic ', sort: 'az' }).map(g => g.id), ['beta', 'gamma']);
  assert.deepEqual(app.selectGames(fixture, { ...state, query: 'alpha', category: 'Puzzle' }), []);
  assert.deepEqual(app.selectGames(fixture, { ...state, category: 'Favorites', sort: 'played' }, new Set(['beta', 'gamma']), { beta: 2, gamma: 7 }).map(g => g.id), ['gamma', 'beta']);
  assert.deepEqual(app.selectGames(fixture, { ...state, sort: 'new' }).map(g => g.id), ['alpha', 'gamma', 'beta']);
  assert.deepEqual(app.selectGames(fixture, { ...state, sort: 'az' }).map(g => g.id), ['alpha', 'beta', 'gamma']);
  assert.deepEqual(fixture.map(g => g.id), ['beta', 'alpha', 'gamma']);
});
test('bad schemas and unsafe URL schemes fail closed', () => {
  for (const url of ['/root.png', '//remote.test/a', 'javascript:alert(1)', ' javascript:alert(1)', 'data:image/svg+xml,abc', '../escape', 'https://user:password@site.test/a', 'http://site.test/a']) assert.equal(app.safeUrl(url), '', url);
  assert.equal(app.safeUrl('thumbnails/2048.svg'), 'thumbnails/2048.svg');
  assert.equal(app.safeUrl('https://cdn.example.test/a.png'), 'https://cdn.example.test/a.png');
  assert.throws(() => app.validateCatalog([...games, games[0]]), /duplicate/);
  assert.throws(() => app.validateCatalog([{ ...games[0], license: '' }]), /license/);
  assert.throws(() => app.validateCatalog([{ ...games[0], embedUrl: 'javascript:alert(1)' }]), /Invalid fields/);
});
test('favorites, plays, corrupt data, and denied storage', () => {
  function instance(storage) {
    const context = { module: { exports: {} }, URL, localStorage: storage };
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8'), context);
    return context.module.exports;
  }
  const saved = new Map();
  const local = instance({ getItem: key => saved.get(key) ?? null, setItem: (key, val) => saved.set(key, val) });
  assert.equal(local.toggleFavorite('2048'), true); assert.ok(local.favorites().has('2048'));
  assert.equal(local.toggleFavorite('2048'), false);
  local.recordPlay('2048'); local.recordPlay('2048'); assert.equal(local.plays()['2048'], 2);
  saved.set('ec.plays', '{broken'); assert.equal(Object.keys(local.plays()).length, 0);
  saved.set('ec.plays', JSON.stringify({ safe: 3, negative: -3, text: '2', fraction: .5 })); assert.deepEqual(Object.keys(local.plays()), ['safe']);
  const denied = instance({ getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } });
  const quota = instance({ getItem: key => saved.get(key) ?? null, setItem() { throw new Error('quota'); } });
  quota.recordPlay('safe'); assert.equal(quota.plays().safe, 4); quota.recordPlay('safe'); assert.equal(quota.plays().safe, 5);
  denied.toggleFavorite('2048'); assert.ok(denied.favorites().has('2048')); denied.recordPlay('2048'); assert.equal(denied.plays()['2048'], 1);
});
test('5 and 5,000 entries: correct pagination, filtering, and measured timing', t => {
  for (const size of [5, 5000]) {
    const fixture = Array.from({ length: size }, (_, i) => ({ ...games[0], id: `fixture-${i}`, title: `Fixture ${String(i).padStart(4, '0')}`, category: i % 2 ? 'Puzzle' : 'Arcade' }));
    const before = performance.now();
    const sorted = app.selectGames(fixture, { ...state, sort: 'az' });
    const selected = app.selectGames(fixture, { ...state, category: 'Puzzle', query: 'fixture', sort: 'new' });
    const elapsed = performance.now() - before;
    assert.equal(sorted.length, size); assert.equal(selected.length, Math.floor(size / 2));
    let visited = [];
    for (let i = 0; i < size; i += 48) { const page = app.pageSlice(sorted, i); assert.ok(page.length <= 48); visited = visited.concat(page.map(g => g.id)); }
    assert.equal(new Set(visited).size, size);
    t.diagnostic(`${size} entries: filter + sort ${elapsed.toFixed(2)} ms (Node, not Chromebook/browser timing)`);
  }
});
