(() => {
  'use strict';
  const EC = window.EC, player = document.querySelector('#player');
  const id = new URLSearchParams(location.search).get('id');
  let game, loaded = false;
  function meta(selector, content) { document.querySelector(selector)?.setAttribute('content', content); }
  function startGame() {
    if (!game || loaded) return;
    const url = new URL(EC.safeUrl(game.embedUrl), document.baseURI);
    // Local permissive games are isolated without allow-same-origin. External
    // publisher SDKs may require their own origin/storage; they never share ours.
    const external = url.origin !== location.origin;
    if (external && (new URLSearchParams(location.search).get('ads') === 'off' || EC.store.read(EC.keys.consent, null) !== 'accepted')) { EC.toast('Accept third-party advertising in Privacy settings before loading this publisher game.'); document.dispatchEvent(new CustomEvent('ec:consent-settings')); return; }
    const iframe = document.createElement('iframe'); iframe.title = `Play ${game.title}`;
    iframe.setAttribute('sandbox', external ? 'allow-scripts allow-same-origin allow-pointer-lock allow-popups' : 'allow-scripts allow-pointer-lock');
    iframe.setAttribute('allow', 'fullscreen; autoplay; gamepad'); iframe.allowFullscreen = true; iframe.referrerPolicy = 'strict-origin-when-cross-origin'; iframe.src = EC.safeUrl(game.embedUrl);
    player.replaceChildren(iframe); loaded = true; EC.recordPlay(game.id);
    document.querySelector('#player-status').textContent = 'Click inside the player to use the keyboard. If it stays blank, report the game below.';
  }
  async function init() {
    try {
      const games = await EC.loadCatalog(); game = games.find(g => g.id === id);
      if (!game) throw new Error('Game not found. Choose a game from the homepage.');
      document.title = `${game.title} — Play free | ExtremeCalculus`;
      const description = `${game.description} Play ${game.title} on ExtremeCalculus.`.slice(0, 160);
      meta('meta[name="description"]', description); meta('meta[property="og:title"]', document.title); meta('meta[property="og:description"]', description); meta('meta[property="og:image"]', new URL(game.thumbnail, document.baseURI).href);
      const canonical = `https://allegendpl.github.io/Homeworkcalculusextreme/${EC.gameLink(game)}`;
      meta('meta[property="og:url"]', canonical); document.querySelector('link[rel="canonical"]').href = canonical;
      document.querySelector('#game-title').textContent = game.title; document.querySelector('#game-category').textContent = `${game.category} · ${game.source}`;
      document.querySelector('#game-description').textContent = game.description; document.querySelector('#game-controls').textContent = game.controls;
      const note = document.querySelector('#game-note'); if (game.note) { note.textContent = game.note; note.hidden = false; }
      const credit = document.querySelector('#game-credit'); credit.append(EC.el('span', '', `Source / author: ${game.source} · License: ${game.license}`));
      if (game.embedUrl.startsWith('games/')) { const license = EC.el('a', '', 'Read license'); license.href = game.id === '2048' ? 'games/2048/LICENSE.txt' : 'games/original/LICENSE.txt'; credit.append(document.createTextNode(' · '), license); }
      const fav = document.querySelector('#favorite-game'); EC.setFavoriteButton(fav, game);
      function updateFav() { EC.setFavoriteButton(fav, game); fav.querySelector('span').textContent = EC.favorites().has(game.id) ? 'Favorited' : 'Favorite'; }
      updateFav(); fav.onclick = () => { EC.toggleFavorite(game.id); updateFav(); };
      document.addEventListener('ec:favorites', updateFav); addEventListener('storage', updateFav);
      document.querySelector('#fullscreen').onclick = async () => { try { if (!document.fullscreenElement) { if (!player.requestFullscreen) throw new Error('unsupported'); await player.requestFullscreen(); } else await document.exitFullscreen(); } catch { EC.toast('Fullscreen is not supported or was blocked by your browser.'); } };
      const gate = EC.el('div', 'player-gate'), button = EC.el('button', 'primary', 'Play game');
      gate.append(EC.thumbnail(game), EC.el('h2', '', game.title), EC.el('p', '', new URL(game.embedUrl, document.baseURI).origin === location.origin ? 'Ready when you are. Start a round — no account needed.' : 'This licensed publisher game contacts its host and may contain publisher ads. It loads only after your advertising consent.'), button);
      button.onclick = startGame; player.replaceChildren(gate);
      const related = document.querySelector('#related-games'); games.filter(g => g.category === game.category && g.id !== game.id).slice(0, 6).forEach(g => related.append(EC.createCard(g)));
      if (!related.children.length) related.append(EC.el('p', 'muted', 'More games in this category will appear as the catalog grows.'));
      const report = document.querySelector('#report-problem'); report.href = `contact.html?game=${encodeURIComponent(game.id)}`;
    } catch (error) { document.title = 'Game unavailable | ExtremeCalculus'; document.querySelector('#game-title').textContent = 'Game unavailable'; player.replaceChildren(EC.el('p', 'player-gate error-state', error.message)); document.querySelector('.game-actions').hidden = true; }
  }
  init();
})();
