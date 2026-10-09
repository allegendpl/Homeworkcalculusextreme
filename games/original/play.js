/* Original mini-games and graphics. MIT: see LICENSE.txt. No third-party assets. */
(() => {
  const kind = new URLSearchParams(location.search).get('game');
  const canvas = document.querySelector('#board'), ctx = canvas.getContext('2d');
  const tiles = document.querySelector('#tiles'), status = document.querySelector('#status');
  const score = document.querySelector('#score'), start = document.querySelector('#start');
  const pause = document.querySelector('#pause');
  const modes = {
    'neon-snake': ['Neon Snake', 'Arrow keys / WASD or the direction buttons. Collect orange sparks. Avoid the walls and your tail.'],
    'prism-breaker': ['Prism Breaker', 'Move the paddle with ← → / A D, your mouse, or drag on the board. Clear every prism.'],
    'memory-mosaic': ['Memory Mosaic', 'Reveal two tiles at a time. Match all eight pairs in as few turns as possible.'],
    'lights-out': ['Lights Out', 'Switch off every light. Selecting a tile flips it and its orthogonal neighbors.']
  };
  if (!modes[kind]) { status.textContent = 'Choose a game from the portal.'; start.hidden = true; canvas.hidden = true; return; }
  document.title = modes[kind][0];
  document.querySelector('#title').textContent = modes[kind][0];
  document.querySelector('#instructions').textContent = modes[kind][1];
  let active = false, paused = false, timer = 0, animation = 0, generation = 0;
  let snake, direction, nextDirection, food, points, paddle, ball, bricks, lastTime = 0;
  const keys = new Set();
  const rand = n => Math.floor(Math.random() * n);
  const shuffle = values => { for (let i = values.length - 1; i > 0; i--) { const j = rand(i + 1); [values[i], values[j]] = [values[j], values[i]]; } return values; };
  function end(message) { active = false; clearInterval(timer); cancelAnimationFrame(animation); pause.hidden = true; status.textContent = message; }
  function blank() { ctx.fillStyle = '#111725'; ctx.fillRect(0, 0, 480, 480); }
  function snakeDraw() {
    blank(); ctx.strokeStyle = '#192235';
    for (let i = 0; i <= 480; i += 24) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 480); ctx.moveTo(0, i); ctx.lineTo(480, i); ctx.stroke(); }
    ctx.fillStyle = '#f07a22'; ctx.beginPath(); ctx.arc(food.x * 24 + 12, food.y * 24 + 12, 9, 0, Math.PI * 2); ctx.fill();
    snake.forEach((p, i) => { ctx.fillStyle = i === 0 ? '#b4f9e0' : '#47d7ab'; ctx.fillRect(p.x * 24 + 2, p.y * 24 + 2, 20, 20); });
  }
  function putFood() {
    if (snake.length === 400) { end('All sparks collected. You win!'); return; }
    const free = [];
    for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) if (!snake.some(p => p.x === x && p.y === y)) free.push({ x, y });
    food = free[rand(free.length)];
  }
  function setDirection(name) {
    const dirs = { up: { x: 0, y: -1 }, left: { x: -1, y: 0 }, down: { x: 0, y: 1 }, right: { x: 1, y: 0 } };
    const d = dirs[name]; if (d && (d.x !== -direction.x || d.y !== -direction.y)) nextDirection = d;
  }
  function snakeTick() {
    if (!active || paused) return;
    direction = nextDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    const eats = head.x === food.x && head.y === food.y;
    if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20 || snake.slice(0, eats ? snake.length : -1).some(p => p.x === head.x && p.y === head.y)) { end('Game over. Try another run!'); return; }
    snake.unshift(head);
    if (eats) { points++; score.textContent = `${points} sparks`; putFood(); } else snake.pop();
    snakeDraw();
  }
  function prismDraw() {
    blank();
    bricks.forEach(b => { if (b.live) { ctx.fillStyle = ['#f07a22', '#ffc354', '#a78bfa', '#59d5e0'][b.row]; ctx.fillRect(b.x, b.y, 62, 20); } });
    ctx.fillStyle = '#eee'; ctx.fillRect(paddle - 48, 440, 96, 10); ctx.beginPath(); ctx.arc(ball.x, ball.y, 7, 0, Math.PI * 2); ctx.fill();
  }
  function prismFrame(t) {
    if (!active) return;
    const dt = lastTime ? Math.min((t - lastTime) / 1000, .025) : 0; lastTime = t;
    if (!paused) {
      if (keys.has('ArrowLeft') || keys.has('a')) paddle -= 380 * dt;
      if (keys.has('ArrowRight') || keys.has('d')) paddle += 380 * dt;
      paddle = Math.max(48, Math.min(432, paddle)); ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x < 7) { ball.x = 7; ball.vx = Math.abs(ball.vx); }
      if (ball.x > 473) { ball.x = 473; ball.vx = -Math.abs(ball.vx); }
      if (ball.y < 7) { ball.y = 7; ball.vy = Math.abs(ball.vy); }
      if (ball.vy > 0 && ball.y >= 433 && ball.y <= 455 && Math.abs(ball.x - paddle) < 55) {
        ball.y = 432; ball.vy = -Math.abs(ball.vy); ball.vx = (ball.x - paddle) * 5;
      }
      for (const b of bricks) if (b.live && ball.x + 7 >= b.x && ball.x - 7 <= b.x + 62 && ball.y + 7 >= b.y && ball.y - 7 <= b.y + 20) { b.live = false; ball.vy *= -1; points++; score.textContent = `${points} / 24 prisms`; break; }
      if (points === 24) { prismDraw(); end('Every prism cleared. You win!'); return; }
      if (ball.y > 490) { end('Ball lost. Start a new round!'); return; }
    }
    prismDraw(); animation = requestAnimationFrame(prismFrame);
  }
  function memory() {
    const values = shuffle([...Array(8).keys(), ...Array(8).keys()]);
    // Geometric symbols, not third-party characters or artwork.
    const shapes = ['●', '◆', '▲', '■', '✚', '○', '◇', '△'];
    let open = [], matched = new Set(), turns = 0, locked = false;
    const round = generation;
    tiles.style.gridTemplateColumns = 'repeat(4,1fr)';
    values.forEach((v, i) => {
      const b = document.createElement('button'); b.textContent = '?'; b.setAttribute('aria-label', `Hidden tile ${i + 1}`);
      b.onclick = () => {
        if (!active || locked || matched.has(i) || open.includes(i)) return;
        b.textContent = shapes[v]; b.classList.add('revealed'); b.setAttribute('aria-label', `Shape ${v + 1}`); open.push(i);
        if (open.length !== 2) return;
        turns++; score.textContent = `${turns} turns`;
        const [a, c] = open;
        if (values[a] === values[c]) {
          [a, c].forEach(n => { matched.add(n); tiles.children[n].classList.add('matched'); tiles.children[n].setAttribute('aria-label', `Matched shape ${values[n] + 1}`); }); open = [];
          if (matched.size === 16) end(`All pairs found in ${turns} turns!`);
        } else { locked = true; setTimeout(() => { if (round !== generation) return; open.forEach(n => { const el = tiles.children[n]; el.textContent = '?'; el.classList.remove('revealed'); el.setAttribute('aria-label', `Hidden tile ${n + 1}`); }); open = []; locked = false; }, 750); }
      };
      tiles.append(b);
    });
  }
  function lights() {
    let cells = Array(25).fill(false), moves = 0;
    function flip(i) { [i, ...(i >= 5 ? [i - 5] : []), ...(i < 20 ? [i + 5] : []), ...(i % 5 ? [i - 1] : []), ...(i % 5 < 4 ? [i + 1] : [])].forEach(n => { cells[n] = !cells[n]; }); }
    // Generate only solvable boards by applying legal moves to a cleared board.
    do { cells.fill(false); for (let i = 0; i < 16; i++) flip(rand(25)); } while (!cells.some(Boolean));
    tiles.style.gridTemplateColumns = 'repeat(5,1fr)';
    function draw() { [...tiles.children].forEach((b, i) => { b.classList.toggle('on', cells[i]); b.setAttribute('aria-label', `Row ${Math.floor(i / 5) + 1}, column ${i % 5 + 1}: ${cells[i] ? 'on' : 'off'}`); b.setAttribute('aria-pressed', String(cells[i])); }); }
    cells.forEach((_, i) => { const b = document.createElement('button'); b.onclick = () => { if (!active) return; flip(i); moves++; score.textContent = `${moves} moves`; draw(); if (!cells.some(Boolean)) end(`Lights out in ${moves} moves!`); }; tiles.append(b); }); draw();
  }
  function restart() {
    end(''); generation++; active = true; paused = false; keys.clear(); points = 0; score.textContent = '0'; tiles.replaceChildren();
    status.textContent = 'Have fun. Restart anytime.';
    const arcade = kind === 'neon-snake' || kind === 'prism-breaker'; canvas.hidden = !arcade; tiles.hidden = arcade; pause.hidden = !arcade; pause.textContent = 'Pause';
    document.querySelector('#directions').hidden = kind !== 'neon-snake';
    if (kind === 'neon-snake') { snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }]; direction = nextDirection = { x: 1, y: 0 }; putFood(); snakeDraw(); timer = setInterval(snakeTick, 120); }
    if (kind === 'prism-breaker') { paddle = 240; ball = { x: 240, y: 400, vx: 110, vy: -240 }; bricks = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) bricks.push({ x: 28 + c * 72, y: 50 + r * 32, row: r, live: true }); lastTime = 0; animation = requestAnimationFrame(prismFrame); }
    if (kind === 'memory-mosaic') memory(); if (kind === 'lights-out') lights();
    if (arcade) canvas.focus();
  }
  start.onclick = restart;
  pause.onclick = () => { paused = !paused; pause.textContent = paused ? 'Resume' : 'Pause'; status.textContent = paused ? 'Paused' : 'Playing'; };
  document.querySelectorAll('[data-dir]').forEach(b => { b.onclick = () => setDirection(b.dataset.dir); });
  const directions = { ArrowUp: 'up', w: 'up', ArrowLeft: 'left', a: 'left', ArrowDown: 'down', s: 'down', ArrowRight: 'right', d: 'right' };
  addEventListener('keydown', e => { if (!active || canvas.hidden || !directions[e.key]) return; e.preventDefault(); keys.add(e.key); if (kind === 'neon-snake') setDirection(directions[e.key]); });
  addEventListener('keyup', e => keys.delete(e.key));
  addEventListener('blur', () => { keys.clear(); if (active && !canvas.hidden) { paused = true; pause.textContent = 'Resume'; status.textContent = 'Paused while unfocused.'; } });
  function pointer(e) { if (kind !== 'prism-breaker') return; const r = canvas.getBoundingClientRect(); paddle = Math.max(48, Math.min(432, (e.clientX - r.left) * 480 / r.width)); }
  canvas.addEventListener('pointermove', pointer); canvas.addEventListener('pointerdown', e => { canvas.focus(); canvas.setPointerCapture(e.pointerId); pointer(e); });
  restart();
})();
