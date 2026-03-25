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
  const q = [];

  const sinNum = 3 + Math.floor(Math.random() * 7);
  const sinDen = sinNum + 2 + Math.floor(Math.random() * 5);
  q.push({
    question: `Rechtwinkliges Dreieck: Gegenkathete = ${sinNum}, Hypotenuse = ${sinDen}. Was ist sin(alpha)?`,
    options: [`${sinNum}/${sinDen}`, `${sinDen}/${sinNum}`, `${sinNum}/${sinDen - 1}`],
    correct: 0,
    explain: 'sin(alpha) = Gegenkathete/Hypotenuse. sin ist ein reines Verhaeltnis, keine absolute Laenge.',
  });

  const cosNum = 4 + Math.floor(Math.random() * 7);
  const cosDen = cosNum + 2 + Math.floor(Math.random() * 5);
  q.push({
    question: `Rechtwinkliges Dreieck: Ankathete = ${cosNum}, Hypotenuse = ${cosDen}. Was ist cos(alpha)?`,
    options: [`${cosNum}/${cosDen}`, `${cosDen}/${cosNum}`, `${cosNum}/${cosDen - 2}`],
    correct: 0,
    explain: 'cos(alpha) = Ankathete/Hypotenuse. Auch cos beschreibt nur ein Seitenverhaeltnis.',
  });

  const tanOpp = 2 + Math.floor(Math.random() * 8);
  const tanAdj = 2 + Math.floor(Math.random() * 8);
  q.push({
    question: `Rechtwinkliges Dreieck: Gegenkathete = ${tanOpp}, Ankathete = ${tanAdj}. Was ist tan(alpha)?`,
    options: [`${tanOpp}/${tanAdj}`, `${tanAdj}/${tanOpp}`, `${tanOpp}/${tanOpp + tanAdj}`],
    correct: 0,
    explain: 'tan(alpha) = Gegenkathete/Ankathete. Auch der Tangens ist ein Verhaeltnis.',
  });

  q.push({
    question:
      'Wenn bei zwei aehnlichen rechtwinkligen Dreiecken alle Seiten im gleichen Faktor wachsen: Was passiert mit sin(alpha) und cos(alpha)?',
    options: ['Beide bleiben gleich.', 'Beide werden groesser.', 'Beide werden kleiner.'],
    correct: 0,
    explain:
      'Kernidee: sin und cos sind nur Verhaeltnisse. Gleicher Skalierungsfaktor oben und unten kuerzt sich weg.',
  });

  return q;
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
  quizTitle.textContent = `Lernrunde vor Welle ${state.wave + 1}`;
  quizMeta.textContent =
    'Wiederholung: sin, cos, tan im rechtwinkligen Dreieck und warum sin/cos nur Verhaeltnisse sind.';
  quizQuestion.textContent = item.question;
  quizFeedback.textContent = '';
  quizNextBtn.classList.add('hidden');
  quizOptions.innerHTML = '';

  item.options.forEach((option, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'answer-btn';
    btn.textContent = option;
    btn.addEventListener('click', () => handleAnswer(idx));
    quizOptions.appendChild(btn);
  });
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
  const g = ctx.createLinearGradient(0, 0, state.width, state.height);
  g.addColorStop(0, '#f8ebc8');
  g.addColorStop(0.55, '#e7c98d');
  g.addColorStop(1, '#c79053');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, state.width, state.height);

  const centerGlow = ctx.createRadialGradient(state.width * 0.5, state.height * 0.52, 60, state.width * 0.5, state.height * 0.52, state.width * 0.7);
  centerGlow.addColorStop(0, '#ffffff30');
  centerGlow.addColorStop(1, '#ffffff00');
  ctx.fillStyle = centerGlow;
  ctx.fillRect(0, 0, state.width, state.height);

  ctx.globalAlpha = 0.14;
  for (let y = 0; y < state.height; y += 40) {
    ctx.fillStyle = y % 80 === 0 ? '#0000001f' : '#ffffff22';
    ctx.fillRect(0, y, state.width, 2);
  }
  ctx.globalAlpha = 1;

  if (controlsAsset.complete) {
    ctx.globalAlpha = 0.09;
    const w = 180;
    const h = (controlsAsset.height / controlsAsset.width) * w;
    ctx.drawImage(controlsAsset, state.width - w - 12, state.height - h - 12, w, h);
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

  ctx.beginPath();
  ctx.fillStyle = '#00000030';
  ctx.ellipse(0, p.radius * 0.9, p.radius * 0.95, p.radius * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  const body = ctx.createRadialGradient(-4, -5, 1, 0, 0, p.radius + 3);
  body.addColorStop(0, '#6db1ff');
  body.addColorStop(1, '#2f6fb6');
  ctx.beginPath();
  ctx.fillStyle = body;
  ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(p.angle);
  ctx.fillStyle = '#163f6d';
  ctx.fillRect(5, -5, 22, 10);
  ctx.fillStyle = '#1d588f';
  ctx.fillRect(9, -3, 12, 6);
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
    ctx.beginPath();
    ctx.fillStyle = '#0000002c';
    ctx.ellipse(e.x, e.y + e.radius * 0.85, e.radius * 0.9, e.radius * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const hitMix = e.flash > 0 ? '#f2b6ac' : '#d45036';
    ctx.beginPath();
    ctx.fillStyle = hitMix;
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2b150f';
    ctx.beginPath();
    ctx.arc(e.x - e.radius * 0.35, e.y - e.radius * 0.15, 1.7, 0, Math.PI * 2);
    ctx.arc(e.x + e.radius * 0.35, e.y - e.radius * 0.15, 1.7, 0, Math.PI * 2);
    ctx.fill();

    const maxHp = 2 + Math.floor(state.wave / 2);
    const hpRatio = clamp(e.hp / maxHp, 0, 1);
    ctx.fillStyle = '#00000033';
    ctx.fillRect(e.x - 13, e.y - e.radius - 10, 26, 4);
    ctx.fillStyle = '#5cc35f';
    ctx.fillRect(e.x - 13, e.y - e.radius - 10, 26 * hpRatio, 4);
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
