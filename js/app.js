/* ExtremeCalculus: shared UI + catalog. Vanilla JS, no dependencies. */
(() => {
  'use strict';
  const keys = { favorites: 'ec.favorites', plays: 'ec.plays', theme: 'ec.theme', consent: 'ec.consent' };
  const memory = new Map();
  const store = {
    read(key, fallback) {
      if (memory.has(key)) return memory.get(key);
      let raw;
      try { raw = localStorage.getItem(key); } catch { return fallback; }
      if (raw === null) return fallback;
      try { return JSON.parse(raw); } catch { return fallback; }
    },
    write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); memory.delete(key); return true; } catch { memory.set(key, value); return false; } }
  };
  const favorites = () => { const v = store.read(keys.favorites, []); return new Set(Array.isArray(v) ? v.filter(id => typeof id === 'string') : []); };
  const plays = () => {
    const v = store.read(keys.plays, {}), result = Object.create(null);
    if (v && typeof v === 'object' && !Array.isArray(v)) for (const [id, n] of Object.entries(v)) if (Number.isSafeInteger(n) && n > 0) result[id] = n;
    return result;
  };
  function toggleFavorite(id) { const set = favorites(); set.has(id) ? set.delete(id) : set.add(id); const saved = store.write(keys.favorites, [...set]); if (typeof document !== 'undefined') { document.dispatchEvent(new CustomEvent('ec:favorites')); if (!saved) toast('Browser storage is unavailable. Changes last for this visit only.'); } return set.has(id); }
  function recordPlay(id) { const counts = plays(); counts[id] = Math.min((counts[id] || 0) + 1, Number.MAX_SAFE_INTEGER); const saved = store.write(keys.plays, counts); if (!saved && typeof document !== 'undefined') toast('Play recorded for this visit only: browser storage is unavailable.'); }
  function safeUrl(value) {
    if (typeof value !== 'string' || !value.trim() || value !== value.trim() || value.startsWith('/') || value.includes('\\')) return '';
    try {
      const url = new URL(value, typeof document === 'undefined' ? 'https://example.test/project/' : document.baseURI);
      if (url.username || url.password) return '';
      if (/^https:\/\//i.test(value)) return url.href;
      if (/^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('//') || value.split(/[?#]/)[0].split('/').includes('..')) return '';
      return value;
    } catch { return ''; }
  }
  function validateCatalog(data) {
    if (!Array.isArray(data)) throw new Error('Catalog must be an array.');
    const seen = new Set();
    return data.map((g, i) => {
      if (!g || typeof g !== 'object' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(g.id) || seen.has(g.id)) throw new Error(`Invalid or duplicate id at item ${i + 1}.`);
      for (const key of ['title', 'category', 'description', 'controls', 'source', 'license']) if (typeof g[key] !== 'string' || !g[key].trim()) throw new Error(`Missing ${key} for ${g.id}.`);
      if (!Array.isArray(g.tags) || !g.tags.every(t => typeof t === 'string') || typeof g.isNew !== 'boolean' || !/^\d{4}-\d{2}-\d{2}T/.test(g.addedAt) || !Number.isFinite(Date.parse(g.addedAt)) || !safeUrl(g.thumbnail) || !safeUrl(g.embedUrl) || (g.note !== undefined && typeof g.note !== 'string')) throw new Error(`Invalid fields for ${g.id}.`);
      seen.add(g.id); return g;
    });
  }
  let catalogRequest;
  function loadCatalog() {
    if (!catalogRequest) catalogRequest = fetch('data/games.json').then(r => { if (!r.ok) throw new Error(`Catalog request failed (${r.status}).`); return r.json(); }).then(validateCatalog);
    return catalogRequest;
  }
  function selectGames(games, state, favoriteSet = favorites(), counts = plays()) {
    const terms = (state.query || '').trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const result = games.filter(g => (state.category === 'All' || !state.category || (state.category === 'Favorites' ? favoriteSet.has(g.id) : g.category === state.category)) && terms.every(t => `${g.title} ${g.category} ${g.tags.join(' ')}`.toLocaleLowerCase().includes(t)));
    if (state.sort === 'az') result.sort((a, b) => a.title.localeCompare(b.title));
    if (state.sort === 'played') result.sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0) || a.title.localeCompare(b.title));
    if (state.sort === 'new') result.sort((a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt) || Number(b.isNew) - Number(a.isNew) || a.title.localeCompare(b.title));
    return result;
  }
  function pageSlice(games, offset = 0) { return games.slice(offset, offset + 48); }
  const paths = { heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z', search: 'm21 21-4.3-4.3M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0', moon: 'M21 12.8A9 9 0 0 1 11.2 3 9 9 0 1 0 21 12.8Z', sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4', shuffle: 'M3 7h3c5 0 7 10 12 10h3m-4-4 4 4-4 4M3 17h3c2 0 3-2 4-4m4-2c1-2 2-4 4-4h3m-4-4 4 4-4 4', down: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5', back: 'm10 5-7 7 7 7M3 12h18', fullscreen: 'M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5', warning: 'm12 3 10 18H2L12 3Zm0 6v5m0 3v.5' };
  function icon(name) { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('class', 'icon'); svg.setAttribute('aria-hidden', 'true'); const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', paths[name] || paths.heart); svg.append(path); return svg; }
  function el(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
  function gameLink(game) { return `game.html?id=${encodeURIComponent(game.id)}`; }
  function thumbnail(g, className = '') {
    const img = el('img', className); img.src = safeUrl(g.thumbnail); img.alt = `${g.title} game artwork`; img.loading = 'lazy'; img.decoding = 'async'; img.width = 480; img.height = 480;
    img.addEventListener('error', () => { const fallback = el('span', 'placeholder', g.title); img.replaceWith(fallback); }, { once: true }); return img;
  }
  function setFavoriteButton(button, g) { const on = favorites().has(g.id); button.setAttribute('aria-pressed', String(on)); button.setAttribute('aria-label', `${on ? 'Remove' : 'Add'} ${g.title} ${on ? 'from' : 'to'} favorites`); }
  function createCard(g) {
    const card = el('article', 'game-card'), link = el('a', 'card-link'); link.href = gameLink(g); link.setAttribute('aria-label', `Play ${g.title}`);
    const thumb = el('div', 'thumb'); thumb.append(thumbnail(g));
    if (g.isNew) thumb.append(el('span', 'badge', 'NEW'));
    const info = el('div', 'card-info'); info.append(el('h3', 'card-title', g.title), el('p', 'card-category', g.category)); link.append(thumb, info); card.append(link);
    const heart = el('button', 'favorite-heart'); heart.type = 'button'; heart.append(icon('heart')); setFavoriteButton(heart, g);
    heart.onclick = () => { toggleFavorite(g.id); setFavoriteButton(heart, g); }; card.append(heart);
    if (g.note) { const warning = el('span', 'warning'); warning.tabIndex = 0; warning.setAttribute('role', 'img'); warning.setAttribute('aria-label', g.note); warning.append(icon('warning'), el('span', 'tooltip', g.note)); thumb.append(warning); }
    return card;
  }
  function toast(message) { let node = document.querySelector('#toast'); if (!node) { node = el('div', 'toast'); node.id = 'toast'; node.setAttribute('role', 'status'); document.body.append(node); } node.textContent = message; node.hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => { node.hidden = true; }, 5000); }
  function setTheme(theme) { document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark'; const button = document.querySelector('#theme-toggle'); if (button) { button.replaceChildren(icon(theme === 'light' ? 'moon' : 'sun')); button.setAttribute('aria-label', `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`); } }
  function initShared() {
    setTheme(store.read(keys.theme, 'dark'));
    const theme = document.querySelector('#theme-toggle'); if (theme) theme.onclick = () => { const value = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'; setTheme(value); if (!store.write(keys.theme, value)) toast('Theme will only be remembered for this visit.'); };
    document.querySelectorAll('[data-icon]').forEach(node => node.prepend(icon(node.dataset.icon)));
    const install = document.querySelector('#install-button'); let prompt;
    addEventListener('beforeinstallprompt', event => { event.preventDefault(); prompt = event; if (install) install.hidden = false; });
    if (install) install.onclick = async () => { if (!prompt) return; install.hidden = true; try { await prompt.prompt(); await prompt.userChoice; } catch { toast('Installation is not available in this browser.'); } prompt = null; };
    addEventListener('appinstalled', () => { if (install) install.hidden = true; prompt = null; });
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { /* Portal remains usable if offline support is blocked. */ });
    addEventListener('keydown', event => { if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || event.target.matches('input,textarea,select,[contenteditable="true"]')) return; const input = document.querySelector('#search'); if (input) { event.preventDefault(); input.focus(); } });
    const reopen = document.querySelector('#privacy-settings'); if (reopen) reopen.onclick = () => document.dispatchEvent(new CustomEvent('ec:consent-settings'));
    const active = document.body.dataset.page;
    document.querySelectorAll('.nav a').forEach(a => { if (a.dataset.nav === active || (active === 'home' && a.dataset.nav === 'games')) a.setAttribute('aria-current', 'page'); });
  }
  async function initHome() {
    const grid = document.querySelector('#game-grid'), count = document.querySelector('#game-count'), more = document.querySelector('#load-more'), progress = document.querySelector('#grid-progress'), empty = document.querySelector('#empty-state'), random = document.querySelector('#random-button');
    const state = { query: '', category: location.hash === '#favorites' ? 'Favorites' : 'All', sort: 'default' };
    let games, filtered = [], shown = 0;
    function updatePills() { const favoriteNav = document.querySelector('.nav a[href="index.html#favorites"]'); const gamesNav = document.querySelector('.nav a[data-nav="games"]'); if (state.category === 'Favorites') { favoriteNav.setAttribute('aria-current', 'page'); gamesNav.removeAttribute('aria-current'); } else { gamesNav.setAttribute('aria-current', 'page'); favoriteNav.removeAttribute('aria-current'); } document.querySelectorAll('[data-category]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.category === state.category))); document.querySelectorAll('[data-sort]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sort === state.sort))); }
    function append() { const batch = pageSlice(filtered, shown), fragment = document.createDocumentFragment(); batch.forEach(g => fragment.append(createCard(g))); grid.append(fragment); shown += batch.length; more.hidden = shown >= filtered.length; progress.textContent = filtered.length ? `Showing ${shown} of ${filtered.length} games` : ''; }
    function render() { if (!games) return; const before = performance.now(); filtered = selectGames(games, state); shown = 0; grid.replaceChildren(); count.replaceChildren(el('strong', '', String(filtered.length)), document.createTextNode(` ${filtered.length === 1 ? 'game' : 'games'}`)); empty.hidden = filtered.length !== 0; empty.textContent = state.category === 'Favorites' ? 'No favorites here yet. Save a game with its heart button.' : 'No games match. Try another search or category.'; random.disabled = !filtered.length; updatePills(); append(); grid.dataset.renderMs = (performance.now() - before).toFixed(2); }
    document.querySelector('#search').addEventListener('input', e => { state.query = e.target.value; render(); });
    document.querySelector('#categories').addEventListener('click', e => { const b = e.target.closest('[data-category]'); if (!b) return; state.category = b.dataset.category; history.replaceState(null, '', state.category === 'Favorites' ? '#favorites' : location.pathname + location.search); render(); });
    document.querySelector('#sorts').addEventListener('click', e => { const b = e.target.closest('[data-sort]'); if (b) { state.sort = b.dataset.sort; render(); } });
    more.onclick = append;
    random.onclick = () => { if (filtered.length) location.href = gameLink(filtered[Math.floor(Math.random() * filtered.length)]); };
    addEventListener('hashchange', () => { state.category = location.hash === '#favorites' ? 'Favorites' : 'All'; render(); });
    document.addEventListener('ec:favorites', () => { if (state.category === 'Favorites') render(); else grid.querySelectorAll('.game-card').forEach((card, i) => setFavoriteButton(card.querySelector('.favorite-heart'), filtered[i])); });
    addEventListener('storage', e => { if ([keys.favorites, keys.plays].includes(e.key)) render(); });
    try {
      games = await loadCatalog();
      const categories = [...new Set(games.map(g => g.category))].sort((a, b) => a.localeCompare(b));
      categories.forEach(category => { const b = el('button', 'pill', category); b.dataset.category = category; b.setAttribute('aria-pressed', 'false'); document.querySelector('#categories').append(b); }); render();
    } catch (error) { count.textContent = 'Catalog unavailable'; empty.hidden = false; empty.classList.add('error-state'); empty.textContent = `${error.message} Please reload, or report this on the Contact page.`; more.hidden = true; random.disabled = true; progress.textContent = ''; }
  }
  async function initStats() {
    const list = document.querySelector('#most-played');
    try {
      const games = await loadCatalog();
      function render() {
        const counts = plays(), favs = favorites(), known = games.filter(g => counts[g.id]);
        document.querySelector('#total-plays').textContent = Object.values(counts).reduce((a, b) => a + b, 0).toLocaleString();
        document.querySelector('#unique-plays').textContent = Object.keys(counts).length.toLocaleString();
        document.querySelector('#total-favorites').textContent = favs.size.toLocaleString(); list.replaceChildren();
        known.sort((a, b) => counts[b.id] - counts[a.id] || a.title.localeCompare(b.title)).slice(0, 10).forEach(g => { const li = el('li'), a = el('a', '', g.title); a.href = gameLink(g); li.append(thumbnail(g), a, el('span', '', `${counts[g.id]} ${counts[g.id] === 1 ? 'play' : 'plays'}`)); list.append(li); });
        if (!known.length) list.append(el('li', 'muted', 'No plays yet. Start a game to begin your story.'));
      }
      render(); document.addEventListener('ec:favorites', render); addEventListener('storage', render);
      document.querySelector('#reset-stats').onclick = () => { if (!confirm('Reset your play counts on this browser? Favorites will be kept.')) return; const saved = store.write(keys.plays, {}); render(); toast(saved ? 'Play counts reset.' : 'Play counts reset for this visit only.'); };
    } catch (error) { list.textContent = `Could not load stats: ${error.message}`; }
  }
  const api = { keys, store, favorites, plays, toggleFavorite, recordPlay, safeUrl, validateCatalog, loadCatalog, selectGames, pageSlice, icon, el, gameLink, thumbnail, setFavoriteButton, createCard, toast };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;
  window.EC = api; initShared();
  if (document.body.dataset.page === 'home') initHome();
  if (document.body.dataset.page === 'stats') initStats();
})();
