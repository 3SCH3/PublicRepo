const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const hpEl = document.getElementById('hp');
const scoreEl = document.getElementById('score');
const waveEl = document.getElementById('wave');
const learnPtsEl = document.getElementById('learnPts');
const trigEl = document.getElementById('trigReadout');

const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const quizOverlay = document.getElementById('quizOverlay');
const quizTitle = document.getElementById('quizTitle');
const quizMeta = document.getElementById('quizMeta');
const quizQuestion = document.getElementById('quizQuestion');
const quizOptions = document.getElementById('quizOptions');
const quizFeedback = document.getElementById('quizFeedback');
const quizNextBtn = document.getElementById('quizNextBtn');
const triCanvas = document.getElementById('triCanvas');

const controlsAsset = new Image();
controlsAsset.src = 'assets/kenney-mobile-controls-sample.png';

const state = {
  running: false,
  inQuiz: false,
  width: 0,
  height: 0,
  time: 0,
  score: 0,
  wave: 1,
  learnPoints: 0,
  enemiesToSpawn: 6,
  spawnCooldown: 0,
  bullets: [],
  enemies: [],
  particles: [],
  props: [],
  maxEnemies: 20,
  input: {
    movePointerId: null,
    aimPointerId: null,
    moveOrigin: null,
    moveVector: { x: 0, y: 0 },
    aimVector: { x: 1, y: 0 },
    aiming: false,
  },
  quiz: {
    active: false,
    questions: [],
    index: 0,
  },
  player: {
    x: 0,
    y: 0,
    radius: 17,
    speed: 230,
    hp: 100,
    angle: 0,
    shotCooldown: 0,
  },
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function normalize(x, y) {
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len, len };
}

function resize() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  state.width = width;
  state.height = height;

  if (!state.running) {
    state.player.x = width * 0.5;
    state.player.y = height * 0.52;
  }
  createArenaProps();
}

function createArenaProps() {
  state.props.length = 0;
  const count = Math.max(8, Math.floor((state.width * state.height) / 120000));
  for (let i = 0; i < count; i += 1) {
    state.props.push({
      x: 40 + Math.random() * (state.width - 80),
      y: 70 + Math.random() * (state.height - 130),
      r: 8 + Math.random() * 11,
      type: i % 2 === 0 ? 'bush' : 'crate',
    });
  }
}

function resetGame() {
  state.running = true;
  state.inQuiz = false;
  state.score = 0;
  state.wave = 1;
  state.learnPoints = 0;
  state.enemiesToSpawn = 6;
  state.spawnCooldown = 0;
  state.bullets.length = 0;
  state.enemies.length = 0;
  state.particles.length = 0;
  state.player.hp = 100;
  state.player.shotCooldown = 0;
  state.player.x = state.width * 0.5;
  state.player.y = state.height * 0.52;
  state.input.moveVector.x = 0;
  state.input.moveVector.y = 0;
  state.input.aimVector.x = 1;
  state.input.aimVector.y = 0;
  state.input.aiming = false;
  state.quiz.active = false;
  overlay.style.display = 'none';
  quizOverlay.classList.add('hidden');
  trigEl.textContent = 'sin(a)=0.00 | cos(a)=1.00 | tan(a)=0.00';
  createArenaProps();
  updateHud();
}

function updateHud() {
  hpEl.textContent = Math.max(0, Math.floor(state.player.hp));
  scoreEl.textContent = state.score;
  waveEl.textContent = state.wave;
  learnPtsEl.textContent = state.learnPoints;
}

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;

  if (side === 0) {
    x = Math.random() * state.width;
    y = -24;
  } else if (side === 1) {
    x = state.width + 24;
    y = Math.random() * state.height;
  } else if (side === 2) {
    x = Math.random() * state.width;
    y = state.height + 24;
  } else {
    x = -24;
    y = Math.random() * state.height;
  }

  const speed = 62 + state.wave * 7 + Math.random() * 14;
  const radius = 12 + Math.random() * 5;
  state.enemies.push({ x, y, speed, radius, hp: 2 + Math.floor(state.wave / 2), flash: 0 });
}

function shoot() {
  const p = state.player;
  const dir = normalize(state.input.aimVector.x, state.input.aimVector.y);
  const speed = 530;
  state.bullets.push({
    x: p.x + dir.x * (p.radius + 7),
    y: p.y + dir.y * (p.radius + 7),
    vx: dir.x * speed,
    vy: dir.y * speed,
    life: 0.9,
    damage: 1,
  });
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const speed = 45 + Math.random() * 130;
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: 0.25 + Math.random() * 0.45,
      color,
    });
  }
}

function makeQuestionSet() {
  const pool = buildQuestionPool();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 4);
}

// Fisher-Yates shuffle of options, returns {options, correct}
function shuffleOptions(correctVal, wrong1, wrong2) {
  const arr = [String(correctVal), String(wrong1), String(wrong2)];
  for (let i = 2; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return { options: arr, correct: arr.indexOf(String(correctVal)) };
}

// Pythagorean triples: [Gegenkathete, Ankathete, Hypotenuse]
const TRIPLES = [[3,4,5],[5,12,13],[8,15,17],[6,8,10],[9,12,15],[20,21,29]];
function rndTriple() {
  const t = TRIPLES[Math.floor(Math.random() * TRIPLES.length)];
  return { g: t[0], a: t[1], h: t[2] };
}

function buildQuestionPool() {
  const pool = [];

  // --- sin ratio ---
  {
    const { g, a, h } = rndTriple();
    const o = shuffleOptions(`${g}/${h}`, `${a}/${h}`, `${g}/${a}`);
    pool.push({
      question: `Gegenkathete = ${g}, Hypotenuse = ${h}. Wie lautet sin(\u03b1)?`,
      options: o.options, correct: o.correct,
      explain: `sin(\u03b1) = Gegenkathete / Hypotenuse = ${g}/${h}. Es ist ein reines Seitenverhaeltnis \u2013 keine absolute Laenge.`,
      tri: { g, a, h, hl: ['G','H'] },
    });
  }

  // --- cos ratio ---
  {
    const { g, a, h } = rndTriple();
    const o = shuffleOptions(`${a}/${h}`, `${g}/${h}`, `${a}/${g}`);
    pool.push({
      question: `Ankathete = ${a}, Hypotenuse = ${h}. Wie lautet cos(\u03b1)?`,
      options: o.options, correct: o.correct,
      explain: `cos(\u03b1) = Ankathete / Hypotenuse = ${a}/${h}. Auch cos ist nur ein Verhaeltnis.`,
      tri: { g, a, h, hl: ['A','H'] },
    });
  }

  // --- tan ratio ---
  {
    const { g, a, h } = rndTriple();
    const o = shuffleOptions(`${g}/${a}`, `${a}/${g}`, `${g}/${h}`);
    pool.push({
      question: `Gegenkathete = ${g}, Ankathete = ${a}. Wie lautet tan(\u03b1)?`,
      options: o.options, correct: o.correct,
      explain: `tan(\u03b1) = Gegenkathete / Ankathete = ${g}/${a}. Tangens = Steigung des Winkels.`,
      tri: { g, a, h, hl: ['G','A'] },
    });
  }

  // --- missing side (sin) ---
  {
    const { g, a, h } = rndTriple();
    const o = shuffleOptions(g, a, h);
    pool.push({
      question: `sin(\u03b1) = ${g}/${h}, Hypotenuse = ${h}. Wie lang ist die Gegenkathete?`,
      options: o.options.map(String), correct: o.correct,
      explain: `Gegenkathete = sin(\u03b1) \u00d7 H = (${g}/${h}) \u00d7 ${h} = ${g}. Das Verhaeltnis rueckwaerts rechnen.`,
      tri: { g, a, h, hl: ['G','H'] },
    });
  }

  // --- missing side (cos) ---
  {
    const { g, a, h } = rndTriple();
    const o = shuffleOptions(a, g, h);
    pool.push({
      question: `cos(\u03b1) = ${a}/${h}, Hypotenuse = ${h}. Wie lang ist die Ankathete?`,
      options: o.options.map(String), correct: o.correct,
      explain: `Ankathete = cos(\u03b1) \u00d7 H = (${a}/${h}) \u00d7 ${h} = ${a}. Formel umstellen.`,
      tri: { g, a, h, hl: ['A','H'] },
    });
  }

  // --- scale invariance (conceptual) ---
  {
    const o = shuffleOptions('Beide bleiben gleich', 'sin wird groesser, cos kleiner', 'Beide werden groesser');
    pool.push({
      question: 'Alle Seiten eines aehnlichen Dreiecks verdoppeln sich. Was passiert mit sin(\u03b1) und cos(\u03b1)?',
      options: o.options, correct: o.correct,
      explain: 'sin und cos sind Verhaeltnisse. Der Faktor kuerzt sich heraus \u2013 die Werte bleiben gleich!',
      tri: { g:3, a:4, h:5, hl:[] },
    });
  }

  // --- formula identification sin ---
  {
    const o = shuffleOptions('sin(\u03b1) = G / H', 'sin(\u03b1) = A / H', 'sin(\u03b1) = G / A');
    pool.push({
      question: 'Welche Formel ist korrekt? (G=Gegenkathete, A=Ankathete, H=Hypotenuse)',
      options: o.options, correct: o.correct,
      explain: 'sin(\u03b1) = Gegenkathete / Hypotenuse = G/H. Merkhilfe: \u201eSinus = Gegenkathete durch Hypotenuse\u201c.',
      tri: { g:3, a:4, h:5, hl:['G','H'] },
    });
  }

  // --- formula identification cos ---
  {
    const o = shuffleOptions('cos(\u03b1) = A / H', 'cos(\u03b1) = G / H', 'cos(\u03b1) = G / A');
    pool.push({
      question: 'Welche Formel beschreibt cos(\u03b1)? (G, A, H wie im Dreieck)',
      options: o.options, correct: o.correct,
      explain: 'cos(\u03b1) = Ankathete / Hypotenuse = A/H.',
      tri: { g:3, a:4, h:5, hl:['A','H'] },
    });
  }

  // --- which side is hypotenuse ---
  {
    const o = shuffleOptions('Gegenueber dem rechten Winkel', 'Die kuerzeste Seite', 'Gegenueber dem Winkel alpha');
    pool.push({
      question: 'Wo liegt die Hypotenuse im rechtwinkligen Dreieck?',
      options: o.options, correct: o.correct,
      explain: 'Die Hypotenuse liegt gegenueber dem rechten Winkel und ist immer die laengste Seite.',
      tri: { g:3, a:4, h:5, hl:['H'] },
    });
  }

  // --- sin(30) special angle ---
  pool.push({
    question: 'Wie lautet sin(30\u00b0)? (Standardwinkel auswendig lernen!)',
    options: ['1/2', '\u221a2/2 \u2248 0.71', '\u221a3/2 \u2248 0.87'],
    correct: 0,
    explain: 'sin(30\u00b0) = 1/2. Die Gegenkathete ist genau halb so lang wie die Hypotenuse.',
    tri: { g:1, a:2, h:2, hl:['G','H'], aLabel:'30\u00b0' },
  });

  // --- tan > 1 concept ---
  {
    const o = shuffleOptions('keine Grenze nach oben', 'maximal 1', 'maximal 90');
    pool.push({
      question: 'Wie gross kann tan(\u03b1) werden, wenn der Winkel gegen 90\u00b0 geht?',
      options: o.options, correct: o.correct,
      explain: 'tan(\u03b1) = G/A. Wenn \u03b1 \u2192 90\u00b0 wird die Ankathete 0 \u2013 tan wird unendlich gross!',
      tri: { g:9, a:1, h:9, hl:['G','A'] },
    });
  }

  return pool;
}

function startQuiz() {
  state.running = false;
  state.inQuiz = true;
  state.quiz.active = true;
  state.quiz.questions = makeQuestionSet();
  state.quiz.index = 0;
  showQuizQuestion();
  quizOverlay.classList.remove('hidden');
}

function showQuizQuestion() {
  const item = state.quiz.questions[state.quiz.index];
  quizTitle.textContent = `Lernrunde – Aufgabe ${state.quiz.index + 1} / ${state.quiz.questions.length}`;
  quizMeta.textContent = 'sin = G/H  \u00b7  cos = A/H  \u00b7  tan = G/A  (alle sind Seitenverhaeltnisse)';
  quizQuestion.textContent = item.question;
  quizFeedback.textContent = '';
  quizNextBtn.classList.add('hidden');
  quizOptions.innerHTML = '';

  drawQuizTriangle(item);

  item.options.forEach((option, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'answer-btn';
    btn.textContent = option;
    btn.addEventListener('click', () => handleAnswer(idx));
    quizOptions.appendChild(btn);
  });
}

function drawQuizTriangle(item) {
  if (!triCanvas) return;
  if (!item.tri) {
    triCanvas.style.display = 'none';
    return;
  }
  triCanvas.style.display = 'block';
  const tx = triCanvas.getContext('2d');
  const W = triCanvas.width;
  const H = triCanvas.height;
  tx.clearRect(0, 0, W, H);

  // Parchment background
  tx.fillStyle = '#fff9ee';
  tx.fillRect(0, 0, W, H);

  const { g, a, h, hl = [], aLabel } = item.tri;

  // Vertices: A=bottom-left(alpha), C=bottom-right(right angle), B=top-right
  const ax = 30, ay = H - 24;
  const cx = W - 30, cy = H - 24;
  const bx = W - 30, by = 22;

  const HL_COLOR = '#c9442a';
  const BASE_COLOR = '#444';
  function sc(id) { return hl.includes(id) ? HL_COLOR : BASE_COLOR; }
  function sw(id) { return hl.includes(id) ? 3.5 : 2; }

  // Hypotenuse A→B
  tx.beginPath(); tx.strokeStyle = sc('H'); tx.lineWidth = sw('H');
  tx.moveTo(ax, ay); tx.lineTo(bx, by); tx.stroke();
  // Gegenkathete B→C (vertical)
  tx.beginPath(); tx.strokeStyle = sc('G'); tx.lineWidth = sw('G');
  tx.moveTo(bx, by); tx.lineTo(cx, cy); tx.stroke();
  // Ankathete A→C (horizontal)
  tx.beginPath(); tx.strokeStyle = sc('A'); tx.lineWidth = sw('A');
  tx.moveTo(ax, ay); tx.lineTo(cx, cy); tx.stroke();

  // Right-angle square at C
  const sq = 9;
  tx.fillStyle = '#eae0d555';
  tx.fillRect(cx - sq, cy - sq, sq, sq);
  tx.strokeStyle = '#888'; tx.lineWidth = 1.5;
  tx.strokeRect(cx - sq, cy - sq, sq, sq);

  // Alpha arc at A
  const alphaAng = Math.atan2(ay - by, bx - ax);
  tx.beginPath(); tx.strokeStyle = '#2761a8'; tx.lineWidth = 1.8;
  tx.arc(ax, ay, 19, -alphaAng, 0); tx.stroke();

  // Labels
  tx.font = 'bold 12px sans-serif';
  tx.textAlign = 'center';
  // Hypotenuse
  tx.fillStyle = sc('H');
  tx.fillText(`H=${h}`, (ax + bx) / 2 - 14, (ay + by) / 2 - 4);
  // Gegenkathete
  tx.fillStyle = sc('G');
  tx.fillText(`G=${g}`, cx + 16, (by + cy) / 2 + 4);
  // Ankathete
  tx.fillStyle = sc('A');
  tx.fillText(`A=${a}`, (ax + cx) / 2, ay + 15);
  // Alpha
  tx.fillStyle = '#2761a8'; tx.font = 'bold 13px sans-serif';
  tx.fillText(aLabel || '\u03b1', ax + 26, ay - 4);
  tx.textAlign = 'left';
}

function handleAnswer(answerIndex) {
  const item = state.quiz.questions[state.quiz.index];
  const isCorrect = answerIndex === item.correct;

  Array.from(quizOptions.children).forEach((node, idx) => {
    node.disabled = true;
    if (idx === item.correct) {
      node.style.background = 'linear-gradient(160deg, #3d9150, #69b774)';
    } else if (idx === answerIndex) {
      node.style.background = 'linear-gradient(160deg, #b63a3a, #d86d6d)';
    }
  });

  if (isCorrect) {
    state.learnPoints += 1;
    state.score += 8;
    quizFeedback.textContent = `Richtig. ${item.explain}`;
  } else {
    quizFeedback.textContent = `Nicht ganz. ${item.explain}`;
  }

  updateHud();
  quizNextBtn.classList.remove('hidden');
  quizNextBtn.textContent = state.quiz.index < state.quiz.questions.length - 1 ? 'Naechste Aufgabe' : 'Welle starten';
}

function advanceQuiz() {
  if (!state.quiz.active) return;

  if (state.quiz.index < state.quiz.questions.length - 1) {
    state.quiz.index += 1;
    showQuizQuestion();
    return;
  }

  state.quiz.active = false;
  state.inQuiz = false;
  quizOverlay.classList.add('hidden');

  state.wave += 1;
  state.enemiesToSpawn = 5 + state.wave * 2;
  state.spawnCooldown = 0;
  state.running = true;
  updateHud();
}

function update(dt) {
  if (!state.running) {
    for (const particle of state.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.98;
      particle.vy *= 0.98;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
    return;
  }

  state.time += dt;
  state.player.shotCooldown -= dt;

  const move = normalize(state.input.moveVector.x, state.input.moveVector.y);
  const movePower = clamp(move.len, 0, 1);

  if (movePower > 0.01) {
    const angle = Math.atan2(move.y, move.x);
    const vx = Math.cos(angle) * state.player.speed * movePower;
    const vy = Math.sin(angle) * state.player.speed * movePower;
    state.player.x += vx * dt;
    state.player.y += vy * dt;
  }

  state.player.x = clamp(state.player.x, state.player.radius, state.width - state.player.radius);
  state.player.y = clamp(state.player.y, state.player.radius, state.height - state.player.radius);

  const a = Math.atan2(state.input.aimVector.y, state.input.aimVector.x);
  state.player.angle = a;
  const s = Math.sin(a).toFixed(2);
  const c = Math.cos(a).toFixed(2);
  const tRaw = Math.tan(a);
  const t = Math.abs(tRaw) > 9 ? 'inf' : tRaw.toFixed(2);
  trigEl.textContent = `sin(a)=${s} | cos(a)=${c} | tan(a)=${t}`;

  if (state.input.aiming && state.player.shotCooldown <= 0) {
    state.player.shotCooldown = 0.14;
    shoot();
  }

  state.spawnCooldown -= dt;
  if (state.enemiesToSpawn > 0 && state.spawnCooldown <= 0 && state.enemies.length < state.maxEnemies) {
    spawnEnemy();
    state.enemiesToSpawn -= 1;
    state.spawnCooldown = 0.32;
  }

  for (const bullet of state.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
  }
  state.bullets = state.bullets.filter((b) => b.life > 0 && b.x > -40 && b.y > -40 && b.x < state.width + 40 && b.y < state.height + 40);

  for (const enemy of state.enemies) {
    const toPlayerX = state.player.x - enemy.x;
    const toPlayerY = state.player.y - enemy.y;
    const dir = normalize(toPlayerX, toPlayerY);

    const tanVal = toPlayerX === 0 ? 0 : clamp(toPlayerY / toPlayerX, -2, 2);
    const driftX = -dir.y * tanVal * 14;
    const driftY = dir.x * tanVal * 14;

    enemy.x += (dir.x * enemy.speed + driftX) * dt;
    enemy.y += (dir.y * enemy.speed + driftY) * dt;
    enemy.flash = Math.max(0, enemy.flash - dt * 7);

    const hitDist = enemy.radius + state.player.radius;
    if (Math.hypot(enemy.x - state.player.x, enemy.y - state.player.y) < hitDist) {
      state.player.hp -= 24 * dt;
    }
  }

  for (const enemy of state.enemies) {
    for (const bullet of state.bullets) {
      if (bullet.life <= 0) continue;
      const d = Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y);
      if (d < enemy.radius + 4) {
        enemy.hp -= bullet.damage;
        enemy.flash = 1;
        bullet.life = 0;
        spawnParticles(bullet.x, bullet.y, '#ffe8aa', 4);
        if (enemy.hp <= 0) {
          state.score += 10;
          spawnParticles(enemy.x, enemy.y, '#d75138', 14);
        }
      }
    }
  }

  state.enemies = state.enemies.filter((e) => e.hp > 0);

  for (const particle of state.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.96;
    particle.vy *= 0.96;
  }
  state.particles = state.particles.filter((p) => p.life > 0);

  if (state.enemiesToSpawn <= 0 && state.enemies.length === 0 && !state.inQuiz) {
    startQuiz();
  }

  if (state.player.hp <= 0) {
    state.running = false;
    state.inQuiz = false;
    state.quiz.active = false;
    quizOverlay.classList.add('hidden');
    overlay.style.display = 'grid';
    overlay.querySelector('h1').textContent = `Game Over - Score ${state.score}`;
    overlay.querySelector('p').textContent =
      `Lernpunkte: ${state.learnPoints}. sin/cos/tan weiter ueben: Gegenkathete, Ankathete, Hypotenuse.`;
  }

  updateHud();
}

function drawBackground() {
  // Chequered sand tiles
  const TILE = 68;
  for (let tx = 0; tx < state.width; tx += TILE) {
    for (let ty = 0; ty < state.height; ty += TILE) {
      const even = ((Math.floor(tx / TILE) + Math.floor(ty / TILE)) % 2) === 0;
      ctx.fillStyle = even ? '#e8cc7a' : '#d8bc68';
      ctx.fillRect(tx, ty, TILE, TILE);
    }
  }

  // Subtle grid lines
  ctx.strokeStyle = '#0000001a';
  ctx.lineWidth = 1;
  for (let tx = 0; tx <= state.width; tx += TILE) {
    ctx.beginPath(); ctx.moveTo(tx, 0); ctx.lineTo(tx, state.height); ctx.stroke();
  }
  for (let ty = 0; ty <= state.height; ty += TILE) {
    ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(state.width, ty); ctx.stroke();
  }

  // Center spotlight
  const spot = ctx.createRadialGradient(state.width / 2, state.height / 2, 0, state.width / 2, state.height / 2, state.width * 0.55);
  spot.addColorStop(0, '#ffffff1a');
  spot.addColorStop(1, '#00000000');
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, state.width, state.height);

  // Vignette
  const vig = ctx.createRadialGradient(state.width / 2, state.height / 2, state.width * 0.28, state.width / 2, state.height / 2, state.width * 0.72);
  vig.addColorStop(0, '#00000000');
  vig.addColorStop(1, '#00000060');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, state.width, state.height);

  if (controlsAsset.complete && controlsAsset.naturalWidth > 0) {
    ctx.globalAlpha = 0.07;
    const w = 150;
    const h = (controlsAsset.height / controlsAsset.width) * w;
    ctx.drawImage(controlsAsset, state.width - w - 10, state.height - h - 10, w, h);
    ctx.globalAlpha = 1;
  }
}

function drawProps() {
  for (const p of state.props) {
    if (p.type === 'bush') {
      ctx.fillStyle = '#4f8d46';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#72b866';
      ctx.beginPath();
      ctx.arc(p.x - p.r * 0.25, p.y - p.r * 0.28, p.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#83552f';
      ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      ctx.strokeStyle = '#603717';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      ctx.beginPath();
      ctx.moveTo(p.x - p.r, p.y - p.r);
      ctx.lineTo(p.x + p.r, p.y + p.r);
      ctx.moveTo(p.x + p.r, p.y - p.r);
      ctx.lineTo(p.x - p.r, p.y + p.r);
      ctx.stroke();
    }
  }
}

function drawPlayer() {
  const p = state.player;
  ctx.save();
  ctx.translate(p.x, p.y);

  // Shadow
  ctx.beginPath();
  ctx.fillStyle = '#00000038';
  ctx.ellipse(1, p.radius * 0.88, p.radius * 0.88, p.radius * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body gradient
  const body = ctx.createRadialGradient(-5, -6, 1, 0, 0, p.radius + 3);
  body.addColorStop(0, '#80c8ff');
  body.addColorStop(1, '#1a5fa0');
  ctx.beginPath();
  ctx.fillStyle = body;
  ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0d3a6e';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Eyes (body space, not rotated with gun)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-5, -5, 3.5, 0, Math.PI * 2);
  ctx.arc(5, -5, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111133';
  ctx.beginPath();
  ctx.arc(-5, -5, 1.8, 0, Math.PI * 2);
  ctx.arc(5, -5, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Gun (rotates with aim)
  ctx.rotate(p.angle);
  ctx.fillStyle = '#0d3050';
  ctx.fillRect(4, -5, 24, 10);
  ctx.fillStyle = '#1d578f';
  ctx.fillRect(9, -3, 14, 6);
  ctx.fillStyle = '#4a90c8';
  ctx.fillRect(24, -2, 4, 4);

  ctx.restore();
}

function drawBullets() {
  for (const b of state.bullets) {
    ctx.beginPath();
    ctx.fillStyle = '#fff2ba';
    ctx.arc(b.x, b.y, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = '#f19b30';
    ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEnemies() {
  for (const e of state.enemies) {
    ctx.save();
    ctx.translate(e.x, e.y);

    // Shadow
    ctx.beginPath();
    ctx.fillStyle = '#0000002a';
    ctx.ellipse(1, e.radius * 0.82, e.radius * 0.82, e.radius * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body gradient
    const flash = e.flash > 0;
    const gr = ctx.createRadialGradient(-e.radius * 0.28, -e.radius * 0.3, 0, 0, 0, e.radius);
    gr.addColorStop(0, flash ? '#ffc0aa' : '#e85040');
    gr.addColorStop(1, flash ? '#d07060' : '#7a180c');
    ctx.beginPath();
    ctx.fillStyle = gr;
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a0a04';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Horns
    ctx.fillStyle = '#3a0a04';
    ctx.beginPath();
    ctx.moveTo(-e.radius * 0.5, -e.radius * 0.72);
    ctx.lineTo(-e.radius * 0.62, -e.radius * 1.18);
    ctx.lineTo(-e.radius * 0.24, -e.radius * 0.88);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(e.radius * 0.5, -e.radius * 0.72);
    ctx.lineTo(e.radius * 0.62, -e.radius * 1.18);
    ctx.lineTo(e.radius * 0.24, -e.radius * 0.88);
    ctx.closePath();
    ctx.fill();

    // Eyes
    ctx.fillStyle = flash ? '#ff8800' : '#ffee00';
    ctx.beginPath();
    ctx.arc(-e.radius * 0.3, -e.radius * 0.2, e.radius * 0.15, 0, Math.PI * 2);
    ctx.arc(e.radius * 0.3, -e.radius * 0.2, e.radius * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a0000';
    ctx.beginPath();
    ctx.arc(-e.radius * 0.3, -e.radius * 0.2, e.radius * 0.07, 0, Math.PI * 2);
    ctx.arc(e.radius * 0.3, -e.radius * 0.2, e.radius * 0.07, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // HP bar
    const maxHp = 2 + Math.floor(state.wave / 2);
    const hpRatio = clamp(e.hp / maxHp, 0, 1);
    ctx.fillStyle = '#00000044';
    ctx.fillRect(e.x - 14, e.y - e.radius - 14, 28, 5);
    ctx.fillStyle = hpRatio > 0.5 ? '#5cc35f' : hpRatio > 0.25 ? '#e8a030' : '#d04028';
    ctx.fillRect(e.x - 14, e.y - e.radius - 14, 28 * hpRatio, 5);
  }
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.globalAlpha = clamp(p.life * 2, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawControls() {
  const input = state.input;

  if (input.moveOrigin) {
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = '#1d1a16';
    ctx.beginPath();
    ctx.arc(input.moveOrigin.x, input.moveOrigin.y, 48, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.48;
    const knobX = input.moveOrigin.x + input.moveVector.x * 30;
    const knobY = input.moveOrigin.y + input.moveVector.y * 30;
    ctx.beginPath();
    ctx.arc(knobX, knobY, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (input.aiming) {
    const p = state.player;
    const d = normalize(input.aimVector.x, input.aimVector.y);
    ctx.strokeStyle = '#123760b2';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(p.x + d.x * 18, p.y + d.y * 18);
    ctx.lineTo(p.x + d.x * 62, p.y + d.y * 62);
    ctx.stroke();
  }
}

function render() {
  drawBackground();
  drawProps();
  drawPlayer();
  drawBullets();
  drawEnemies();
  drawParticles();
  drawControls();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function setMoveFromEvent(e) {
  const input = state.input;
  if (!input.moveOrigin) return;
  const dx = e.clientX - input.moveOrigin.x;
  const dy = e.clientY - input.moveOrigin.y;
  const n = normalize(dx, dy);
  input.moveVector.x = n.x * clamp(n.len / 56, 0, 1);
  input.moveVector.y = n.y * clamp(n.len / 56, 0, 1);
}

function setAimFromEvent(e) {
  const input = state.input;
  const dx = e.clientX - state.player.x;
  const dy = e.clientY - state.player.y;
  const dir = normalize(dx, dy);
  input.aimVector.x = dir.x;
  input.aimVector.y = dir.y;
}

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  const input = state.input;

  if (e.clientX < state.width * 0.5 && input.movePointerId === null) {
    input.movePointerId = e.pointerId;
    input.moveOrigin = { x: e.clientX, y: e.clientY };
    input.moveVector.x = 0;
    input.moveVector.y = 0;
  } else if (input.aimPointerId === null) {
    input.aimPointerId = e.pointerId;
    input.aiming = true;
    setAimFromEvent(e);
  }

  if (!state.running) {
    e.preventDefault();
  }
});

canvas.addEventListener('pointermove', (e) => {
  const input = state.input;
  if (e.pointerId === input.movePointerId) {
    setMoveFromEvent(e);
  } else if (e.pointerId === input.aimPointerId) {
    setAimFromEvent(e);
  }
});

canvas.addEventListener('pointerup', (e) => {
  const input = state.input;
  if (e.pointerId === input.movePointerId) {
    input.movePointerId = null;
    input.moveOrigin = null;
    input.moveVector.x = 0;
    input.moveVector.y = 0;
  }
  if (e.pointerId === input.aimPointerId) {
    input.aimPointerId = null;
    input.aiming = false;
  }
});

canvas.addEventListener('pointercancel', (e) => {
  const input = state.input;
  if (e.pointerId === input.movePointerId) {
    input.movePointerId = null;
    input.moveOrigin = null;
    input.moveVector.x = 0;
    input.moveVector.y = 0;
  }
  if (e.pointerId === input.aimPointerId) {
    input.aimPointerId = null;
    input.aiming = false;
  }
});

quizNextBtn.addEventListener('click', advanceQuiz);

startBtn.addEventListener('click', () => {
  resetGame();
});

window.addEventListener('resize', resize);

resize();
render();
requestAnimationFrame(loop);
