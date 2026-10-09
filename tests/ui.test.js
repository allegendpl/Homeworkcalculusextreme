/* DOM/event harness, NOT a browser renderer. Interactive visual checks remain manual. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const seed = require('../data/games.json');
class Node {
  constructor(tag = 'div', cls = '') { this.tag = tag; this.className = cls; this.dataset = {}; this.attrs = {}; this.children = []; this.hidden = false; this.listeners = {}; this._text = ''; this.value = ''; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
  append(...nodes) { nodes.forEach(node => { if (node.tag === 'fragment') this.append(...node.children); else { node.parent = this; this.children.push(node); } }); }
  prepend(node) { node.parent = this; this.children.unshift(node); }
  replaceChildren(...nodes) { this.children = []; this._text = ''; this.append(...nodes); }
  replaceWith(node) { const index = this.parent.children.indexOf(this); this.parent.children[index] = node; node.parent = this.parent; }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  getAttribute(key) { return this.attrs[key]; }
  removeAttribute(key) { delete this.attrs[key]; }
  addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
  dispatchEvent(event) { event.target ||= this; (this.listeners[event.type] || []).forEach(callback => callback(event)); }
  focus() { this.focused = true; }
  matches(selector) { if (selector === 'button') return this.tag === 'button'; if (selector === 'span') return this.tag === 'span'; if (selector === '.nav a') return this.nav === true; if (selector === '.game-card') return this.className === 'game-card'; if (selector === '.ad-slot') return this.className === 'ad-slot'; if (selector.startsWith('.')) return this.className.split(' ').includes(selector.slice(1)); const m = selector.match(/^\[data-(\w+)\]$/); if (m) return this.dataset[m[1]] !== undefined; return selector === this.tag; }
  closest(selector) { return this.matches(selector) ? this : this.parent?.closest(selector); }
  querySelectorAll(selector) { return this.children.flatMap(c => [...(c.matches(selector) ? [c] : []), ...c.querySelectorAll(selector)]); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  getBoundingClientRect() { return { width: this.hidden ? 0 : 160 }; }
  get classList() { return { add: cls => { this.className += ` ${cls}`; } }; }
}
function harness(page, catalog = seed) {
  const document = new Node('document'); document.body = new Node('body'); document.body.dataset.page = page; document.documentElement = new Node('html'); document.baseURI = 'https://example.test/Homeworkcalculusextreme/';
  document.append(document.body); const ids = new Map();
  function add(id, tag = 'div', cls = '') { const node = new Node(tag, cls); node.id = id; ids.set(id, node); document.body.append(node); return node; }
  const canonical = add('canonical', 'link');
  const originalQuery = document.querySelector.bind(document);
  const gamesNav = add('games-nav', 'a'); gamesNav.nav = true; gamesNav.dataset.nav = 'games';
  const favoritesNav = add('favorites-nav', 'a'); favoritesNav.nav = true;
  document.querySelector = selector => selector === 'link[rel="canonical"]' ? canonical : selector.startsWith('#') ? ids.get(selector.slice(1)) || null : selector === '.nav a[href="index.html#favorites"]' ? favoritesNav : selector === '.nav a[data-nav="games"]' ? gamesNav : originalQuery(selector);
  document.createElement = tag => new Node(tag); document.createElementNS = (ns, tag) => { const node = new Node(tag); node.namespaceURI = ns; return node; };
  document.createTextNode = text => { const node = new Node('text'); node.textContent = text; return node; }; document.createDocumentFragment = () => new Node('fragment');
  const local = new Map(), events = {};
  const location = { href: document.baseURI + (page === 'game' ? 'game.html?id=2048' : 'index.html'), pathname: '/Homeworkcalculusextreme/index.html', search: page === 'game' ? '?id=2048' : '', hash: '', origin: 'https://example.test', reload() { this.reloaded = true; }, replace(value) { this.href = value; } };
  const context = { document, location, URL, URLSearchParams, console, performance, history: { replaceState() {} }, navigator: {}, CustomEvent: class { constructor(type, opts = {}) { this.type = type; this.detail = opts.detail; } }, localStorage: { getItem: k => local.get(k) ?? null, setItem: (k, v) => local.set(k, v) }, addEventListener: (name, callback) => { (events[name] ||= []).push(callback); }, setTimeout: () => 1, clearTimeout() {}, confirm: () => true, fetch: async () => ({ ok: true, json: async () => catalog }) };
  context.window = context; vm.createContext(context);
  const run = file => vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context);
  const emit = (name, event) => (events[name] || []).forEach(callback => callback(event));
  const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
  return { context, document, add, run, emit, settle, ids, local };
}
test('catalog DOM events: 5,000 games, 48 cards, Load more, search/category/sort/favorite/Random', async t => {
  const catalog = Array.from({ length: 5000 }, (_, i) => ({ ...seed[0], id: `sample-${i}`, title: `Sample ${String(i).padStart(4, '0')}`, category: i % 2 ? 'Puzzle' : 'Arcade' }));
  const h = harness('home', catalog), { add, ids } = h;
  for (const id of ['game-grid', 'game-count', 'grid-progress', 'empty-state', 'categories', 'sorts']) add(id);
  for (const id of ['load-more', 'random-button', 'theme-toggle', 'install-button']) add(id, 'button');
  add('search', 'input');
  for (const category of ['All', 'Favorites']) { const b = new Node('button'); b.dataset.category = category; ids.get('categories').append(b); }
  for (const sort of ['default', 'az', 'played', 'new']) { const b = new Node('button'); b.dataset.sort = sort; ids.get('sorts').append(b); }
  h.run('js/app.js'); await h.settle();
  assert.equal(ids.get('game-grid').children.length, 48); assert.equal(ids.get('game-count').textContent, '5000 games');
  t.diagnostic(`DOM harness 5,000-entry first render: ${ids.get('game-grid').dataset.renderMs} ms; this does not measure browser paint`);
  ids.get('load-more').onclick(); assert.equal(ids.get('game-grid').children.length, 96);
  const search = ids.get('search'); search.value = 'Sample 0001'; search.dispatchEvent({ type: 'input' }); assert.equal(ids.get('game-grid').children.length, 1);
  const card = ids.get('game-grid').children[0], img = card.querySelector('img'); assert.equal(img.loading, 'lazy'); assert.equal(img.src, 'thumbnails/2048.svg');
  const heart = card.querySelector('.favorite-heart'); heart.onclick(); assert.equal(heart.getAttribute('aria-pressed'), 'true');
  const favorites = ids.get('categories').children.find(b => b.dataset.category === 'Favorites'); ids.get('categories').dispatchEvent({ type: 'click', target: favorites }); assert.equal(ids.get('game-grid').children.length, 1);
  ids.get('game-grid').children[0].querySelector('.favorite-heart').onclick(); assert.equal(ids.get('game-grid').children.length, 0); assert.equal(ids.get('random-button').disabled, true);
  const all = ids.get('categories').children.find(b => b.dataset.category === 'All'); ids.get('categories').dispatchEvent({ type: 'click', target: all }); search.value = ''; search.dispatchEvent({ type: 'input' });
  const arcade = ids.get('categories').children.find(b => b.dataset.category === 'Arcade'); ids.get('categories').dispatchEvent({ type: 'click', target: arcade }); assert.equal(ids.get('game-count').textContent, '2500 games');
  h.context.EC.recordPlay('sample-4'); const sort = ids.get('sorts').children.find(b => b.dataset.sort === 'played'); ids.get('sorts').dispatchEvent({ type: 'click', target: sort }); assert.match(ids.get('game-grid').children[0].querySelector('a').href, /sample-4$/);
  ids.get('random-button').onclick(); assert.match(h.context.location.href, /^game.html\?id=sample-\d+$/);
  const img2 = ids.get('game-grid').children[0].querySelector('img'); img2.dispatchEvent({ type: 'error' }); assert.equal(ids.get('game-grid').children[0].querySelector('img'), null); assert.match(ids.get('game-grid').children[0].querySelector('.placeholder').textContent, /Sample/);
});
test('theme, / focus, and install event use their real handlers', async () => {
  const h = harness('about'); const theme = h.add('theme-toggle', 'button'), install = h.add('install-button', 'button'), search = h.add('search', 'input'); install.hidden = true;
  h.run('js/app.js'); assert.equal(h.document.documentElement.dataset.theme, 'dark'); theme.onclick(); assert.equal(h.document.documentElement.dataset.theme, 'light'); assert.equal(JSON.parse(h.local.get('ec.theme')), 'light');
  let prevented = false; h.emit('keydown', { key: '/', target: new Node('body'), preventDefault() { prevented = true; } }); assert.ok(prevented && search.focused);
  let prompted = false; h.emit('beforeinstallprompt', { preventDefault() {}, prompt: async () => { prompted = true; }, userChoice: Promise.resolve({ outcome: 'accepted' }) }); assert.equal(install.hidden, false); await install.onclick(); assert.ok(prompted); assert.equal(install.hidden, true);
});
test('ad consent initializes no slot before accept, decline/reopen/withdraw are functional', () => {
  const h = harness('about'); h.add('theme-toggle', 'button'); const slot = h.add('ad', 'div', 'ad-slot'); slot.dataset.slot = 'left';
  h.run('js/app.js'); h.run('js/ads.js');
  const banner = h.document.querySelector('.consent-banner'); assert.ok(banner && !banner.hidden); assert.equal(h.local.has('ec.consent'), false); assert.equal(slot.children.length, 1);
  banner.querySelectorAll('button')[0].onclick(); assert.equal(JSON.parse(h.local.get('ec.consent')), 'declined'); assert.equal(banner.hidden, true);
  h.document.dispatchEvent({ type: 'ec:consent-settings' }); assert.equal(banner.hidden, false);
  banner.querySelectorAll('button')[1].onclick(); assert.equal(JSON.parse(h.local.get('ec.consent')), 'accepted');
  h.document.dispatchEvent({ type: 'ec:consent-settings' }); banner.querySelectorAll('button')[0].onclick(); assert.ok(h.context.location.reloaded);
});
test('player resolves query, updates SEO, gates local play, records counts, and shows missing-id error', async () => {
  const h = harness('game');
  for (const id of ['player', 'game-title', 'game-category', 'game-description', 'game-controls', 'game-note', 'game-credit', 'related-games', 'player-status']) h.add(id);
  const favorite = h.add('favorite-game', 'button'); favorite.append(new Node('span'));
  h.add('fullscreen', 'button'); h.add('report-problem', 'a'); h.add('theme-toggle', 'button');
  const action = h.add('actions', 'div', 'game-actions');
  h.run('js/app.js'); h.run('js/game.js'); await h.settle();
  assert.equal(h.document.title, '2048 — Play free | ExtremeCalculus'); assert.equal(h.ids.get('game-title').textContent, '2048'); assert.equal(h.ids.get('player').querySelector('iframe'), null);
  h.ids.get('player').querySelector('button').onclick(); const iframe = h.ids.get('player').querySelector('iframe'); assert.equal(iframe.src, 'games/2048/index.html'); assert.equal(iframe.getAttribute('sandbox'), 'allow-scripts allow-pointer-lock'); assert.equal(h.context.EC.plays()['2048'], 1);
  favorite.onclick(); assert.equal(favorite.getAttribute('aria-pressed'), 'true');
  h.context.location.search = '?id=missing'; h.run('js/game.js'); await h.settle(); assert.equal(h.ids.get('game-title').textContent, 'Game unavailable'); assert.equal(action.hidden, true);
});
