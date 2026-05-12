 // ─── Canvas & constants ─────────────────────────────────────────────────────
const CANVAS_W  = 800;
const CANVAS_H  = 580;
const HUD_H     = 52;
const GROUND_Y  = CANVAS_H - 22;

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
canvas.width  = CANVAS_W;
canvas.height = CANVAS_H;

// ─── Game state ──────────────────────────────────────────────────────────────
let gameState;   // 'MENU' | 'CHAR_SELECT' | 'LEVEL_START' | 'PLAYING' | 'PAUSED' | 'LEVEL_CLEAR' | 'GAME_OVER' | 'WIN'
let pausedFromState = null;   // hangi state'den pause'a girildiğini saklar
let pauseMenuSel    = 0;      // 0 = Resume, 1 = Main Menu
let level, score, lives, timer, maxTimer;
let bubbles, rope, player;
let powerups;
let freezeTimer, fastRopeTimer;
let levelClearTimer, levelClearBonus;
let levelStartTimer;
let deathTimer;
let highScore = 0;
let selectedChar = 'boy';  // 'boy' | 'girl'
let bombEffect = null;
let shakeTimer = 0;
let shakeAmt   = 0;
let keys = {};
let lastTime = 0;

// Background stars
let stars = [];
let bgParticles;

// ─── Power-up class ──────────────────────────────────────────────────────────
class Powerup {
  constructor(x, y, type) {
    this.x      = x;
    this.y      = y;
    this.vy     = -160;
    this.type   = type;
    this.active = true;
    this.radius = 17;
    this.age    = 0;
    this.maxAge = 9;

    const meta = {
      CLOCK:     { color: '#FDCB6E', icon: '⏱' },
      FREEZE:    { color: '#74b9ff', icon: '❄' },
      FAST_ROPE: { color: '#55efc4', icon: '⚡' },
      BOMB:      { color: '#FF4757', icon: '💣' }
    };
    this.color = meta[type].color;
    this.icon  = meta[type].icon;
  }

  update(dt) {
    this.vy += 260 * dt;
    this.y  += this.vy * dt;
    const floor = GROUND_Y - this.radius;
    if (this.y > floor) { this.y = floor; this.vy = -Math.abs(this.vy) * 0.45; }
    this.age += dt;
    if (this.age > this.maxAge) this.active = false;
  }

  draw(ctx) {
    if (this.age > 6 && Math.floor(this.age * 5) % 2 === 0) return;
    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 18;
    ctx.fillStyle   = this.color + '55';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = 2;
    ctx.stroke();
    ctx.shadowBlur  = 0;
    ctx.font        = '15px serif';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle   = '#fff';
    ctx.fillText(this.icon, this.x, this.y);
    ctx.restore();
  }
}

// ─── Initialization ──────────────────────────────────────────────────────────
function initStars() {
  stars = Array.from({ length: 90 }, () => ({
    x:           Math.random() * CANVAS_W,
    y:           HUD_H + Math.random() * (CANVAS_H - HUD_H),
    r:           Math.random() * 1.4 + 0.3,
    alpha:       Math.random() * 0.6 + 0.2,
    twinkle:     Math.random() * Math.PI * 2,
    twinkleSpd:  Math.random() * 2.5 + 0.8
  }));
}

function spawnLevelBubbles() {
  const cfg   = LEVELS[level];
  const count = cfg.bubbles.length;
  bubbles = cfg.bubbles.map((b, i) => {
    const bcfg = BUBBLE_CONFIG[b.size];
    const x    = (CANVAS_W / (count + 1)) * (i + 1);
    const y    = HUD_H + bcfg.radius + 8;
    const dir  = i % 2 === 0 ? 1 : -1;
    const vx   = bcfg.baseSpeed * dir * (0.85 + Math.random() * 0.3);
    const ci   = b.colorIndex !== undefined ? b.colorIndex : randInt(0, BUBBLE_COLORS.length - 1);
    return new Bubble(x, y, vx, 0, b.size, ci, CANVAS_W, GROUND_Y, HUD_H);
  });
}

function startLevel() {
  maxTimer = LEVELS[level].time;
  timer    = maxTimer;
  rope     = null;
  powerups = [];
  freezeTimer   = 0;
  fastRopeTimer = 0;
  deathTimer    = 0;
  bgParticles   = new ParticleSystem();
  spawnLevelBubbles();
  levelStartTimer = 2.2;
  gameState = 'LEVEL_START';
}

function showCharSelect() {
  gameState = 'CHAR_SELECT';
}

function startGame() {
  level     = 0;
  score     = 0;
  lives     = 3;
  player    = new Player(CANVAS_W, GROUND_Y, selectedChar);
  bgParticles = new ParticleSystem();
  startLevel();
}

function showMenu() {
  gameState = 'MENU';
}

// ─── Input ───────────────────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === ' ' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (gameState === 'PLAYING' && deathTimer <= 0) {
      rope = new Rope(player.cx, player.top, HUD_H);
      AudioManager.ropeShoot();
    }
    if (gameState === 'CHAR_SELECT') startGame();
  }
  if (e.key === 'Enter') {
    if (gameState === 'MENU')        showCharSelect();
    else if (gameState === 'CHAR_SELECT') startGame();
    else if (gameState === 'GAME_OVER')   showMenu();
    else if (gameState === 'WIN')         showMenu();
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    if (gameState === 'CHAR_SELECT') {
      selectedChar = selectedChar === 'boy' ? 'girl' : 'boy';
    }
  }
  if (e.key === 'Escape') {
    if (gameState === 'PLAYING' || gameState === 'LEVEL_START') {
      pausedFromState = gameState;
      pauseMenuSel    = 0;
      gameState = 'PAUSED';
    } else if (gameState === 'PAUSED') {
      // ESC direkt olarak resume eder
      gameState = pausedFromState || 'PLAYING';
      pausedFromState = null;
    } else if (gameState === 'CHAR_SELECT') {
      showMenu();
    }
  }

  // ── Pause menü navigasyonu ──────────────────────────────────────────────────
  if (gameState === 'PAUSED') {
    if (e.key === 'ArrowUp'   || e.key === 'w' || e.key === 'W') {
      pauseMenuSel = (pauseMenuSel + 1) % 2; e.preventDefault();
    }
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      pauseMenuSel = (pauseMenuSel + 1) % 2; e.preventDefault();
    }
    if (e.key === 'Enter' || (e.key === ' ' && gameState === 'PAUSED')) {
      e.preventDefault();
      if (pauseMenuSel === 0) {
        gameState = pausedFromState || 'PLAYING';
        pausedFromState = null;
      } else {
        pausedFromState = null;
        showMenu();
      }
    }
  }
});
window.addEventListener('keyup', e => { keys[e.key] = false; });

let mousePos = { x: 0, y: 0 };
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mousePos.x = (e.clientX - r.left) * (CANVAS_W / r.width);
  mousePos.y = (e.clientY - r.top)  * (CANVAS_H / r.height);

  // Pause menüsünde hover ile seçim değişsin
  if (gameState === 'PAUSED') {
    const bw = 260, bh = 48, bx = CANVAS_W / 2 - 130;
    for (let i = 0; i < 2; i++) {
      const by = CANVAS_H / 2 - 10 + i * 64;
      if (mousePos.x >= bx && mousePos.x <= bx + bw &&
          mousePos.y >= by && mousePos.y <= by + bh) {
        pauseMenuSel = i;
      }
    }
  }
});

canvas.addEventListener('click', e => {
  const r  = canvas.getBoundingClientRect();
  const mx = (e.clientX - r.left) * (CANVAS_W / r.width);
  const my = (e.clientY - r.top)  * (CANVAS_H / r.height);

  if (gameState === 'MENU') { showCharSelect(); return; }
  if (gameState === 'GAME_OVER') { showMenu(); return; }
  if (gameState === 'WIN')       { showMenu(); return; }

  if (gameState === 'PAUSED') {
    const bw = 260, bh = 48, bx = CANVAS_W / 2 - 130;
    for (let i = 0; i < 2; i++) {
      const by = CANVAS_H / 2 - 10 + i * 64;
      if (mx >= bx && mx <= bx + bw && my >= by && my <= by + bh) {
        if (i === 0) {
          gameState = pausedFromState || 'PLAYING';
          pausedFromState = null;
        } else {
          pausedFromState = null;
          showMenu();
        }
      }
    }
    return;
  }

  if (gameState === 'CHAR_SELECT') {
    // Boy card: center x = CANVAS_W/2 - 140
    // Girl card: center x = CANVAS_W/2 + 140
    const boyX = CANVAS_W / 2 - 140, girlX = CANVAS_W / 2 + 140;
    const cardW = 170, cardH = 240, cardY = CANVAS_H / 2 - 100;
    if (mx >= boyX - cardW/2  && mx <= boyX + cardW/2  && my >= cardY && my <= cardY + cardH) {
      selectedChar = 'boy'; startGame(); return;
    }
    if (mx >= girlX - cardW/2 && mx <= girlX + cardW/2 && my >= cardY && my <= cardY + cardH) {
      selectedChar = 'girl'; startGame(); return;
    }
  }
});

// ─── Logic helpers ───────────────────────────────────────────────────────────
function spawnPowerup(x, y) {
  const types = ['CLOCK', 'FREEZE', 'FAST_ROPE', 'BOMB'];
  powerups.push(new Powerup(x, y, types[randInt(0, types.length - 1)]));
}

function applyPowerup(type) {
  if (type === 'CLOCK')     { timer = Math.min(maxTimer, timer + 20); }
  if (type === 'FREEZE')    { freezeTimer   = 3.5; }
  if (type === 'FAST_ROPE') { fastRopeTimer = 5.0; }
  if (type === 'BOMB')      { triggerBomb(); }
}

function triggerBomb() {
  // Pop every bubble on screen with particles + score
  bubbles.forEach(b => {
    bgParticles.emit(b.x, b.y, b.color, 20);
    score += b.cfg.scoreValue * 2;  // double score for bomb kills
  });
  bubbles = [];
  rope    = null;

  // Big explosion visual
  bombEffect = new BombEffect(CANVAS_W, CANVAS_H, HUD_H);

  // Screen shake
  shakeTimer = 0.45;
  shakeAmt   = 10;

  // Sound
  AudioManager.bombExplode();
}

function playerHit() {
  if (!player.hit()) return;
  rope = null;
  lives--;
  AudioManager.playerHit();
  if (lives <= 0) {
    if (score > highScore) highScore = score;
    gameState  = 'GAME_OVER';
    AudioManager.gameOver();
  } else {
    deathTimer = 0.9;
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────
function update(dt) {
  // Pause'da hiçbir şey güncellenmez
  if (gameState === 'PAUSED') return;

  stars.forEach(s => { s.twinkle += s.twinkleSpd * dt; });

  if (gameState === 'LEVEL_START') {
    stars.forEach(s => { s.twinkle += s.twinkleSpd * dt; });
    levelStartTimer -= dt;
    if (levelStartTimer <= 0) gameState = 'PLAYING';
    return;
  }

  if (gameState === 'LEVEL_CLEAR') {
    bgParticles.update(dt);
    levelClearTimer -= dt;
    if (levelClearTimer <= 0) {
      level++;
      if (level >= LEVELS.length) {
        if (score > highScore) highScore = score;
        gameState = 'WIN';
      } else {
        startLevel();
      }
    }
    return;
  }

  if (gameState !== 'PLAYING') return;

  bgParticles.update(dt);

  timer -= dt;
  if (timer <= 0) {
    timer = 0;
    playerHit();
    if (gameState !== 'PLAYING') return;
    timer = maxTimer;
    spawnLevelBubbles();
    return;
  }

  if (deathTimer > 0) {
    deathTimer -= dt;
    if (deathTimer <= 0) {
      spawnLevelBubbles();
      timer = maxTimer;
    }
    player.update(dt, {});
    return;
  }

  player.update(dt, keys);

  if (rope) {
    rope.update(dt, fastRopeTimer > 0);
    if (!rope.active) rope = null;
  }

  if (freezeTimer  > 0) freezeTimer  -= dt;
  if (fastRopeTimer > 0) fastRopeTimer -= dt;
  if (shakeTimer   > 0) shakeTimer   -= dt;
  if (bombEffect) { bombEffect.update(dt); if (!bombEffect.active) bombEffect = null; }

  const freezeMult = freezeTimer > 0 ? 0.18 : 1.0;
  const toRemove   = new Set();
  const toAdd      = [];

  bubbles.forEach((b, i) => {
    b.update(dt, freezeMult);
    b.frozen = freezeTimer > 0;

    if (rope && rope.active) {
      const seg = rope.getSegment();
      if (circleSegmentCollision(b.x, b.y, b.radius, seg.x1, seg.y1, seg.x2, seg.y2)) {
        toRemove.add(i);
        const children = b.split();
        toAdd.push(...children);
        bgParticles.emit(b.x, b.y, b.color, 16);
        score += b.cfg.scoreValue;
        AudioManager.bubblePop(b.sizeKey);
        if (b.cfg.next === null && Math.random() < 0.25) {
          spawnPowerup(b.x, b.y);
        }
        rope.consume();
        rope = null;
      }
    }

    if (!player.invincible) {
      const pb = player.getBounds();
      if (circleRectCollision(b.x, b.y, b.radius, pb.x, pb.y, pb.w, pb.h)) {
        playerHit();
      }
    }
  });

  bubbles = bubbles.filter((_, i) => !toRemove.has(i));
  bubbles.push(...toAdd);

  powerups.forEach(p => {
    p.update(dt);
    if (p.active) {
      const pb = player.getBounds();
      if (circleRectCollision(p.x, p.y, p.radius, pb.x, pb.y, pb.w, pb.h)) {
        applyPowerup(p.type);
        bgParticles.emit(p.x, p.y, p.color, 10);
        AudioManager.powerupCollect();
        p.active = false;
      }
    }
  });
  powerups = powerups.filter(p => p.active);

  if (bubbles.length === 0) {
    levelClearBonus = Math.floor(timer) * 5;
    score          += levelClearBonus;
    levelClearTimer = 2.6;
    gameState       = 'LEVEL_CLEAR';
    AudioManager.levelClear();
    bgParticles.emitStar(CANVAS_W / 2, CANVAS_H / 2);
  }
}

// ─── Render ──────────────────────────────────────────────────────────────────
function drawBackground() {
  const grad = ctx.createLinearGradient(0, HUD_H, 0, GROUND_Y);
  grad.addColorStop(0,   '#0d0d2b');
  grad.addColorStop(0.6, '#0a0a20');
  grad.addColorStop(1,   '#12122a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, HUD_H, CANVAS_W, GROUND_Y - HUD_H);

  stars.forEach(s => {
    const a = s.alpha * (0.6 + 0.4 * Math.sin(s.twinkle));
    ctx.save();
    ctx.globalAlpha   = a;
    ctx.fillStyle     = '#ffffff';
    ctx.shadowColor   = '#aaaaff';
    ctx.shadowBlur    = 4;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawGround() {
  const grad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_H);
  grad.addColorStop(0, '#1a3a28');
  grad.addColorStop(1, '#0a1f15');
  ctx.fillStyle = grad;
  ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

  ctx.strokeStyle = '#27ae60';
  ctx.lineWidth   = 2.5;
  ctx.shadowColor = '#2ecc71';
  ctx.shadowBlur  = 8;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(CANVAS_W, GROUND_Y);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawHUD() {
  ctx.fillStyle = 'rgba(5,5,20,0.88)';
  ctx.fillRect(0, 0, CANVAS_W, HUD_H);

  ctx.strokeStyle = 'rgba(80,100,255,0.25)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(0, HUD_H);
  ctx.lineTo(CANVAS_W, HUD_H);
  ctx.stroke();

  // Level label
  ctx.fillStyle = '#aaa';
  ctx.font      = 'bold 13px Courier New';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`LV ${level + 1}/${LEVELS.length}`, 10, 27);

  // Score
  ctx.fillStyle = '#ffffff';
  ctx.font      = 'bold 16px Courier New';
  ctx.textAlign = 'right';
  ctx.fillText(score, CANVAS_W - 10, 27);

  // Timer bar
  const barX = 70, barY = 16, barW = CANVAS_W - 145, barH = 20;
  const frac  = Math.max(0, timer / maxTimer);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(barX, barY, barW, barH);

  const barColor = frac > 0.5 ? '#2ecc71' : frac > 0.25 ? '#f39c12' : '#e74c3c';
  const grad = ctx.createLinearGradient(barX, 0, barX + barW * frac, 0);
  grad.addColorStop(0, barColor + 'dd');
  grad.addColorStop(1, barColor);
  ctx.fillStyle = grad;
  ctx.fillRect(barX, barY, barW * frac, barH);

  ctx.strokeStyle = '#333355';
  ctx.lineWidth   = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  // Lives
  ctx.font        = '18px serif';
  ctx.textAlign   = 'left';
  ctx.textBaseline = 'alphabetic';
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < lives ? '#e74c3c' : '#333';
    ctx.shadowColor = i < lives ? '#e74c3c' : 'transparent';
    ctx.shadowBlur  = i < lives ? 8 : 0;
    ctx.fillText('♥', 10 + i * 22, HUD_H - 6);
  }
  ctx.shadowBlur = 0;

  // Power-up indicators
  let px = CANVAS_W - 14;
  if (freezeTimer > 0) {
    ctx.fillStyle = '#74b9ff';
    ctx.font      = 'bold 13px Courier New';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`❄ ${freezeTimer.toFixed(1)}s`, px, HUD_H - 6);
    px -= 80;
  }
  if (fastRopeTimer > 0) {
    ctx.fillStyle = '#55efc4';
    ctx.font      = 'bold 13px Courier New';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`⚡ ${fastRopeTimer.toFixed(1)}s`, px, HUD_H - 6);
  }
}

function drawFreezeOverlay() {
  if (freezeTimer <= 0) return;
  ctx.save();
  ctx.globalAlpha = 0.08 * Math.min(1, freezeTimer);
  ctx.fillStyle   = '#74b9ff';
  ctx.fillRect(0, HUD_H, CANVAS_W, GROUND_Y - HUD_H);
  ctx.restore();
}

function drawDeathFlash() {
  if (deathTimer <= 0) return;
  ctx.save();
  ctx.globalAlpha = (deathTimer / 0.9) * 0.35;
  ctx.fillStyle   = '#e74c3c';
  ctx.fillRect(0, HUD_H, CANVAS_W, GROUND_Y - HUD_H);
  ctx.restore();
}

// ─── Screen overlays ─────────────────────────────────────────────────────────
function drawCharPreview(ctx, cx, cy, type) {
  ctx.save();
  ctx.translate(cx, cy);

  if (type === 'boy') {
    // Legs
    ctx.fillStyle = '#1a2535';
    ctx.fillRect(-11, -22, 9, 22);
    ctx.fillRect(2, -22, 9, 22);
    // Body
    ctx.fillStyle = '#2980b9';
    ctx.shadowColor = '#3498db'; ctx.shadowBlur = 8;
    ctx.fillRect(-13, -44, 26, 24);
    // Head
    ctx.fillStyle = '#ffeaa7';
    ctx.shadowColor = '#f9ca24'; ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.arc(0, -52, 12, 0, Math.PI * 2); ctx.fill();
    // Eyes
    ctx.shadowBlur = 0; ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(-3, -53, 2.2, 0, Math.PI * 2);
    ctx.arc( 3, -53, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // Hair (short)
    ctx.fillStyle = '#a0522d';
    ctx.beginPath(); ctx.ellipse(0, -60, 12, 7, 0, Math.PI, Math.PI * 2); ctx.fill();

  } else {
    // Legs
    ctx.shadowBlur = 0; ctx.fillStyle = '#ffd6ec';
    ctx.fillRect(-9, 0, 7, 16); ctx.fillRect(2, 0, 7, 16);
    // Skirt
    ctx.fillStyle = '#e84393'; ctx.shadowColor = '#e84393'; ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(-14, -22); ctx.lineTo(14, -22);
    ctx.lineTo(18, 0);    ctx.lineTo(-18, 0);
    ctx.closePath(); ctx.fill();
    // Body
    ctx.fillStyle = '#9b59b6'; ctx.shadowColor = '#9b59b6'; ctx.shadowBlur = 8;
    ctx.fillRect(-12, -44, 24, 24);
    // Ponytail (behind head)
    ctx.shadowBlur = 0; ctx.fillStyle = '#e6b800';
    ctx.beginPath();
    ctx.moveTo(9, -56); ctx.quadraticCurveTo(26, -52, 24, -38);
    ctx.quadraticCurveTo(28, -28, 20, -26);
    ctx.quadraticCurveTo(14, -32, 18, -44);
    ctx.quadraticCurveTo(20, -52, 11, -56);
    ctx.closePath(); ctx.fill();
    // Head (over ponytail base)
    ctx.fillStyle = '#ffeaa7'; ctx.shadowColor = '#f9ca24'; ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.arc(0, -52, 12, 0, Math.PI * 2); ctx.fill();
    // Hair cap
    ctx.shadowBlur = 0; ctx.fillStyle = '#f1c40f';
    ctx.beginPath(); ctx.arc(0, -52, 12.5, Math.PI, Math.PI * 2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath(); ctx.arc(-3, -52, 2.2, 0, Math.PI * 2); ctx.arc(3, -52, 2.2, 0, Math.PI * 2); ctx.fill();
    // Eyelashes (short, above eyes only)
    ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 1.2;
    [-5,-3,-1,1,3,5].forEach(ox => {
      ctx.beginPath(); ctx.moveTo(ox, -54); ctx.lineTo(ox, -57); ctx.stroke();
    });
    // Cheeks
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#e84393';
    ctx.beginPath(); ctx.ellipse(-7, -49, 3.5, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( 7, -49, 3.5, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawCharSelect() {
  drawBackground();
  drawGround();

  const now    = performance.now() / 1000;
  const boyX   = CANVAS_W / 2 - 140;
  const girlX  = CANVAS_W / 2 + 140;
  const cardW  = 170, cardH = 240;
  const cardY  = CANVAS_H / 2 - 110;

  // Title
  ctx.save();
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle   = '#ffffff';
  ctx.shadowColor = '#aaaaff'; ctx.shadowBlur = 20;
  ctx.font        = 'bold 30px Courier New';
  ctx.fillText('CHOOSE YOUR CHARACTER', CANVAS_W / 2, cardY - 42);
  ctx.shadowBlur = 0;

  [{ x: boyX, type: 'boy', label: 'BOY' }, { x: girlX, type: 'girl', label: 'GIRL' }].forEach(c => {
    const selected = selectedChar === c.type;
    const hover    = mousePos.x >= c.x - cardW/2 && mousePos.x <= c.x + cardW/2 &&
                     mousePos.y >= cardY           && mousePos.y <= cardY + cardH;
    const lit = selected || hover;

    // Card background
    ctx.fillStyle = lit ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = lit ? (c.type === 'girl' ? '#e84393' : '#3498db') : '#334';
    ctx.lineWidth   = lit ? 3 : 1.5;
    ctx.shadowColor = lit ? (c.type === 'girl' ? '#e84393' : '#3498db') : 'transparent';
    ctx.shadowBlur  = lit ? 20 : 0;
    roundRect(ctx, c.x - cardW/2, cardY, cardW, cardH, 14);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    // Character preview (scaled up)
    ctx.save();
    ctx.scale(1.7, 1.7);
    drawCharPreview(ctx, c.x / 1.7, (cardY + cardH/2 - 10) / 1.7, c.type);
    ctx.restore();

    // Label
    ctx.fillStyle   = lit ? '#ffffff' : '#889';
    ctx.font        = `bold 18px Courier New`;
    ctx.textAlign   = 'center';
    ctx.shadowColor = lit ? (c.type === 'girl' ? '#e84393' : '#3498db') : 'transparent';
    ctx.shadowBlur  = lit ? 12 : 0;
    ctx.fillText(c.label, c.x, cardY + cardH - 22);
    ctx.shadowBlur = 0;

    // Selected check
    if (selected) {
      ctx.fillStyle = c.type === 'girl' ? '#e84393' : '#3498db';
      ctx.font      = '13px Courier New';
      ctx.fillText('▲ SELECTED', c.x, cardY + cardH + 18);
    }
  });

  // Hint
  const pulse = 0.7 + 0.3 * Math.sin(now * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle   = '#aabbcc';
  ctx.font        = '15px Courier New';
  ctx.textAlign   = 'center';
  ctx.fillText('← → switch   |   ENTER or click to start', CANVAS_W / 2, cardY + cardH + 55);
  ctx.globalAlpha = 1;
  ctx.restore();
}

// helper: rounded rectangle path
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawMenu() {
  drawBackground();
  drawGround();

  // Animated demo bubbles in background (just a few static ones)
  const now = performance.now() / 1000;
  const demoBubbles = [
    { x: 150, y: 200 + Math.sin(now * 0.9) * 50, r: 38, c: '#FF4757' },
    { x: 650, y: 180 + Math.sin(now * 1.1 + 1) * 60, r: 38, c: '#2ED573' },
    { x: 400, y: 260 + Math.sin(now * 0.7 + 2) * 40, r: 24, c: '#1E90FF' },
    { x: 260, y: 350 + Math.sin(now * 1.3 + 3) * 35, r: 24, c: '#FFA502' },
    { x: 560, y: 340 + Math.sin(now * 1.0 + 4) * 45, r: 13, c: '#A29BFE' },
  ];
  demoBubbles.forEach(b => {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.shadowColor = b.c;
    ctx.shadowBlur  = 20;
    const grad = ctx.createRadialGradient(-b.r * 0.3, -b.r * 0.3, b.r * 0.1, 0, 0, b.r);
    grad.addColorStop(0, '#ffffff88');
    grad.addColorStop(1, b.c + '44');
    ctx.translate(b.x, b.y);
    ctx.beginPath();
    ctx.arc(0, 0, b.r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  });

  ctx.save();
  ctx.textAlign = 'center';

  // Title shadow
  ctx.font     = 'bold 86px Courier New';
  ctx.textAlign = 'left';
  const hoW    = ctx.measureText('Bubbel ').width;
  const panicW = ctx.measureText('Panic').width;
  const titleX = (CANVAS_W - hoW - panicW) / 2;

  ctx.fillStyle   = '#FF4757';
  ctx.shadowColor = '#FF4757';
  ctx.shadowBlur  = 40;
  ctx.fillText('Bubbel ', titleX, 230);

  ctx.fillStyle   = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur  = 20;
  ctx.fillText('Panic', titleX + hoW, 230);
  ctx.textAlign   = 'center';

  // ── START Button ──
  ctx.shadowBlur = 0;
  const btnW = 200, btnH = 52, btnX = CANVAS_W / 2 - 100, btnY = 320;
  const btnHover = mousePos.x >= btnX && mousePos.x <= btnX + btnW &&
                   mousePos.y >= btnY && mousePos.y <= btnY + btnH;
  const pulse = 0.85 + 0.15 * Math.sin(now * 3);

  // Button glow
  ctx.shadowColor = btnHover ? '#FF4757' : '#ffffff44';
  ctx.shadowBlur  = btnHover ? 30 : 15;

  // Button fill
  const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
  if (btnHover) {
    btnGrad.addColorStop(0, '#ff6b7a');
    btnGrad.addColorStop(1, '#c0392b');
  } else {
    btnGrad.addColorStop(0, 'rgba(255,255,255,0.13)');
    btnGrad.addColorStop(1, 'rgba(255,255,255,0.05)');
  }
  ctx.globalAlpha = pulse;
  roundRect(ctx, btnX, btnY, btnW, btnH, 10);
  ctx.fillStyle = btnGrad;
  ctx.fill();
  ctx.strokeStyle = btnHover ? '#FF4757' : 'rgba(255,255,255,0.35)';
  ctx.lineWidth   = btnHover ? 2 : 1.5;
  ctx.stroke();

  // Button text
  ctx.fillStyle    = '#ffffff';
  ctx.font         = 'bold 22px Courier New';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowBlur   = 0;
  ctx.fillText('▶  START', CANVAS_W / 2, btnY + btnH / 2);
  ctx.globalAlpha  = 1;

  // ── Controls hint ──
  ctx.shadowBlur = 0;
  const hintY = btnY + btnH + 30;

  // Small pill background
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  roundRect(ctx, CANVAS_W / 2 - 190, hintY - 14, 380, 30, 8);
  ctx.fill();

  ctx.fillStyle    = '#7f8c9a';
  ctx.font         = '13px Courier New';
  ctx.textBaseline = 'middle';
  ctx.fillText('← → move    SPACE shoot    ENTER start', CANVAS_W / 2, hintY + 1);

  // Power-up icons row
  const puY = hintY + 36;
  const icons = [
    { icon: '⏱', label: 'time',      color: '#FDCB6E' },
    { icon: '❄',  label: 'freeze',   color: '#74b9ff' },
    { icon: '⚡', label: 'fast rope', color: '#55efc4' },
    { icon: '💣', label: 'bomb',      color: '#FF4757' },
  ];
  icons.forEach((p, i) => {
    const px = CANVAS_W / 2 - 165 + i * 110;
    ctx.fillStyle = p.color + '22';
    roundRect(ctx, px - 42, puY - 13, 84, 26, 6);
    ctx.fill();
    ctx.strokeStyle = p.color + '55'; ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle    = p.color;
    ctx.font         = '12px Courier New';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${p.icon} ${p.label}`, px, puY + 0);
  });

  // ── High Score ──
  if (highScore > 0) {
    const hsY = puY + 46;
    ctx.fillStyle = 'rgba(253,203,110,0.1)';
    roundRect(ctx, CANVAS_W / 2 - 110, hsY - 16, 220, 32, 8);
    ctx.fill();
    ctx.strokeStyle = '#FDCB6E44'; ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle    = '#FDCB6E';
    ctx.shadowColor  = '#FDCB6E';
    ctx.shadowBlur   = 10;
    ctx.font         = 'bold 16px Courier New';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🏆 ${highScore}`, CANVAS_W / 2, hsY);
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

function drawLevelStart() {
  const progress = 1 - (levelStartTimer / 2.2);
  const cx = CANVAS_W / 2, cy = CANVAS_H / 2;

  // Dark overlay
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.fillRect(0, HUD_H, CANVAS_W, GROUND_Y - HUD_H);

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  // Level number
  ctx.fillStyle   = '#ffffff';
  ctx.shadowColor = '#7f8fff';
  ctx.shadowBlur  = 30;
  ctx.font        = 'bold 22px Courier New';
  ctx.fillText(`LEVEL ${level + 1}  /  ${LEVELS.length}`, cx, cy - 58);

  // "GET READY" text
  ctx.shadowColor = '#FF4757';
  ctx.shadowBlur  = 35;
  ctx.fillStyle   = '#FF4757';
  ctx.font        = 'bold 52px Courier New';
  ctx.fillText('GET READY!', cx, cy - 10);

  // Countdown bar
  const bw = 320, bh = 10;
  const bx = cx - bw / 2, by = cy + 42;
  ctx.shadowBlur  = 0;
  ctx.fillStyle   = '#1a1a2e';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle   = '#FF4757';
  ctx.fillRect(bx, by, bw * progress, bh);
  ctx.strokeStyle = '#444466';
  ctx.lineWidth   = 1;
  ctx.strokeRect(bx, by, bw, bh);

  // Bubble count hint
  ctx.fillStyle = '#667799';
  ctx.font      = '15px Courier New';
  ctx.fillText(`${bubbles.length} bubble${bubbles.length > 1 ? 's' : ''} incoming`, cx, cy + 72);

  ctx.restore();
}

function drawLevelClear() {
  ctx.save();
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(CANVAS_W / 2 - 210, CANVAS_H / 2 - 80, 420, 160);

  ctx.fillStyle   = '#2ecc71';
  ctx.shadowColor = '#2ecc71';
  ctx.shadowBlur  = 30;
  ctx.font        = 'bold 44px Courier New';
  ctx.fillText('LEVEL CLEAR!', CANVAS_W / 2, CANVAS_H / 2 - 22);

  ctx.shadowBlur  = 0;
  ctx.fillStyle   = '#FDCB6E';
  ctx.font        = '20px Courier New';
  ctx.fillText(`Time bonus: +${levelClearBonus}`, CANVAS_W / 2, CANVAS_H / 2 + 28);

  ctx.restore();
}

function drawPaused() {
  const cx = CANVAS_W / 2, cy = CANVAS_H / 2;

  // Karartma
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.fillRect(0, HUD_H, CANVAS_W, GROUND_Y - HUD_H);

  // Panel
  const pw = 340, ph = 250;
  ctx.fillStyle   = 'rgba(10,10,35,0.95)';
  ctx.strokeStyle = 'rgba(120,120,255,0.50)';
  ctx.lineWidth   = 2;
  roundRect(ctx, cx - pw / 2, cy - ph / 2, pw, ph, 18);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  // "PAUSED" başlık
  ctx.fillStyle   = '#ffffff';
  ctx.shadowColor = '#8888ff';
  ctx.shadowBlur  = 30;
  ctx.font        = 'bold 46px Courier New';
  ctx.fillText('PAUSED', cx, cy - 78);
  ctx.shadowBlur  = 0;

  // Ayraç çizgisi
  ctx.strokeStyle = 'rgba(120,120,255,0.25)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 120, cy - 46);
  ctx.lineTo(cx + 120, cy - 46);
  ctx.stroke();

  // Butonlar
  const labels  = ['▶   RESUME', '⌂   MAIN MENU'];
  const colors  = ['#5dade2', '#e74c3c'];
  const bw = 260, bh = 48, bx = cx - 130;

  labels.forEach((label, i) => {
    const by  = cy - 10 + i * 64;
    const sel = pauseMenuSel === i;

    // Buton arka planı
    ctx.fillStyle   = sel ? colors[i] + '33' : 'rgba(255,255,255,0.05)';
    ctx.strokeStyle = sel ? colors[i]        : '#2a2a4a';
    ctx.lineWidth   = sel ? 2 : 1;
    ctx.shadowColor = sel ? colors[i] : 'transparent';
    ctx.shadowBlur  = sel ? 18 : 0;
    roundRect(ctx, bx, by, bw, bh, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Buton yazısı
    ctx.fillStyle = sel ? '#ffffff' : '#6b7a8d';
    ctx.font      = sel ? 'bold 17px Courier New' : '17px Courier New';
    ctx.fillText(label, cx, by + bh / 2);
  });

  // Alt ipucu
  ctx.fillStyle = '#3a4a5a';
  ctx.font      = '12px Courier New';
  ctx.fillText('↑ ↓  navigate   ENTER  confirm   ESC  resume', cx, cy + 110);

  ctx.restore();
}

function drawGameOver() {
  drawBackground();
  drawGround();

  ctx.save();
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle   = '#e74c3c';
  ctx.shadowColor = '#e74c3c';
  ctx.shadowBlur  = 40;
  ctx.font        = 'bold 66px Courier New';
  ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 60);

  ctx.shadowBlur  = 0;
  ctx.fillStyle   = '#ffffff';
  ctx.font        = '26px Courier New';
  ctx.fillText(`Score: ${score}`, CANVAS_W / 2, CANVAS_H / 2 + 10);

  if (score >= highScore && score > 0) {
    ctx.fillStyle = '#FDCB6E';
    ctx.font      = 'bold 20px Courier New';
    ctx.fillText('New High Score!', CANVAS_W / 2, CANVAS_H / 2 + 50);
  }

  ctx.fillStyle = '#667799';
  ctx.font      = '18px Courier New';
  ctx.fillText('Press ENTER or click to menu', CANVAS_W / 2, CANVAS_H / 2 + 100);

  ctx.restore();
}

function drawWin() {
  drawBackground();
  drawGround();

  const now = performance.now() / 1000;

  ctx.save();
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';

  const pulse = 0.8 + 0.2 * Math.sin(now * 4);
  ctx.globalAlpha = pulse;
  ctx.fillStyle   = '#FDCB6E';
  ctx.shadowColor = '#FDCB6E';
  ctx.shadowBlur  = 40;
  ctx.font        = 'bold 66px Courier New';
  ctx.fillText('YOU WIN!', CANVAS_W / 2, CANVAS_H / 2 - 70);

  ctx.globalAlpha = 1;
  ctx.shadowBlur  = 0;
  ctx.fillStyle   = '#ffffff';
  ctx.font        = '26px Courier New';
  ctx.fillText(`Final Score: ${score}`, CANVAS_W / 2, CANVAS_H / 2 + 0);

  if (score >= highScore && score > 0) {
    ctx.fillStyle = '#FDCB6E';
    ctx.font      = 'bold 20px Courier New';
    ctx.fillText('New High Score!', CANVAS_W / 2, CANVAS_H / 2 + 45);
  }

  ctx.fillStyle = '#667799';
  ctx.font      = '18px Courier New';
  ctx.fillText('Press ENTER or click to menu', CANVAS_W / 2, CANVAS_H / 2 + 105);

  ctx.restore();
}

function drawLevelAnnounce() {
  // Show at beginning of level briefly
  if (deathTimer > 0.5) return; // skip during death
}

function render() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  if (gameState === 'MENU')        { drawMenu();       return; }
  if (gameState === 'CHAR_SELECT') { drawCharSelect(); return; }
  if (gameState === 'GAME_OVER')   { drawGameOver();   return; }
  if (gameState === 'WIN')         { drawWin();        return; }

  // Screen shake
  const shake = shakeTimer > 0 ? (Math.random() - 0.5) * shakeAmt * (shakeTimer / 0.45) : 0;
  ctx.save();
  ctx.translate(shake, shake * 0.5);

  drawBackground();
  drawGround();
  drawFreezeOverlay();

  bgParticles.draw(ctx);
  powerups.forEach(p => p.draw(ctx));
  bubbles.forEach(b => b.draw(ctx));

  if (rope) rope.draw(ctx);
  if (gameState !== 'LEVEL_START') player.draw(ctx);

  if (bombEffect) bombEffect.draw(ctx);

  ctx.restore();

  drawDeathFlash();
  drawHUD();

  if (gameState === 'LEVEL_START') drawLevelStart();
  if (gameState === 'LEVEL_CLEAR') drawLevelClear();
  if (gameState === 'PAUSED')      drawPaused();
}

// ─── Game loop ───────────────────────────────────────────────────────────────
function gameLoop(timestamp) {
  // Pause'dayken dt=0 ver, ama lastTime'ı güncelle
  // → unpause olunca zaman atlama yaşanmaz
  const dt = gameState === 'PAUSED' ? 0 : Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

// ─── Boot ────────────────────────────────────────────────────────────────────
initStars();
showMenu();
requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(gameLoop); });
