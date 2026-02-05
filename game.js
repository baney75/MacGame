const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Audio context and sound system
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    soundEnabled = false;
  }
}

function playTone(frequency, duration, type = "square", volume = 0.15, ramp = true) {
  if (!audioCtx || !soundEnabled) return;
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
  
  gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
  if (ramp) {
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  }
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + duration);
}

function playJumpSound() {
  if (!audioCtx || !soundEnabled) return;
  // Rising tone for jump
  playTone(280, 0.08, "square", 0.12);
  setTimeout(() => playTone(420, 0.1, "square", 0.1), 40);
}

function playPunchSound() {
  if (!audioCtx || !soundEnabled) return;
  // Punchy noise burst
  const duration = 0.12;
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  
  const noise = audioCtx.createBufferSource();
  const gainNode = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  
  noise.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(800, audioCtx.currentTime);
  gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  
  noise.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  noise.start();
}

function playOrbSound() {
  if (!audioCtx || !soundEnabled) return;
  // Pleasant chime for orb collection
  playTone(880, 0.08, "sine", 0.1);
  setTimeout(() => playTone(1100, 0.12, "sine", 0.08), 50);
}

function playHurtSound() {
  if (!audioCtx || !soundEnabled) return;
  // Descending buzzy tone
  if (audioCtx.state === "suspended") audioCtx.resume();
  
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2);
  
  gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.25);
}

function playLevelCompleteSound() {
  if (!audioCtx || !soundEnabled) return;
  // Victory fanfare
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, "sine", 0.12), i * 100);
  });
}

function playGameOverSound() {
  if (!audioCtx || !soundEnabled) return;
  // Sad descending tones
  const notes = [400, 350, 300, 250];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.25, "triangle", 0.1), i * 120);
  });
}

// Menu elements
const startMenu = document.getElementById("startMenu");
const pauseMenu = document.getElementById("pauseMenu");
const gameOverMenu = document.getElementById("gameOverMenu");
const levelComplete = document.getElementById("levelComplete");
const hud = document.getElementById("hud");
const mobileControls = document.getElementById("mobileControls");

const playBtn = document.getElementById("playBtn");
const resumeBtn = document.getElementById("resumeBtn");
const quitBtn = document.getElementById("quitBtn");
const retryBtn = document.getElementById("retryBtn");
const nextLevelBtn = document.getElementById("nextLevelBtn");

const toast = document.getElementById("toast");
const mobileJump = document.getElementById("mobileJump");
const mobilePunch = document.getElementById("mobilePunch");
const mobilePause = document.getElementById("mobilePause");

const scoreEl = document.getElementById("score");
const comboEl = document.getElementById("combo");
const comboDisplay = document.getElementById("comboDisplay");
const levelEl = document.getElementById("level");
const livesDisplay = document.getElementById("livesDisplay");
const menuBest = document.getElementById("menuBest");
const finalScore = document.getElementById("finalScore");
const finalBest = document.getElementById("finalBest");
const gameOverTitle = document.getElementById("gameOverTitle");
const levelTitle = document.getElementById("levelTitle");
const levelScore = document.getElementById("levelScore");

const BASE_WIDTH = 960;
const BASE_HEIGHT = 540;
const groundY = BASE_HEIGHT - 70;

const spriteSets = {
  idle: ["sprites/mac_idle.png", "sprites/mac_idle_blink.png"],
  run: [
    "sprites/mac_run_1.png",
    "sprites/mac_run_2.png",
    "sprites/mac_run_3.png",
    "sprites/mac_run_4.png"
  ],
  jump: ["sprites/mac_jump_1.png", "sprites/mac_jump_2.png", "sprites/mac_jump_3.png"],
  attack: ["sprites/mac_attack_1.png", "sprites/mac_attack_2.png"],
  hurt: ["sprites/mac_hurt.png"],
  victory: ["sprites/mac_victory.png"],
};

const sprites = {};
let spritesReady = false;

const LEVEL_BASE_LENGTH = 2500;
const LEVEL_LENGTH_STEP = 400;

const LEVEL_NAMES = [
  "Sunrise Sprint",
  "Neon Harbor",
  "Skyline Bounce",
  "Turbo Plaza",
  "Starlight Circuit",
];

// Improved level design with more varied patterns
const segmentTemplates = [
  // Easy patterns - single obstacles with generous spacing
  {
    difficulty: 1,
    length: 550,
    obstacles: [{ at: 250, type: "ground" }],
    orbs: [{ at: 350, height: 140 }, { at: 420, height: 140 }, { at: 490, height: 140 }],
  },
  {
    difficulty: 1,
    length: 600,
    obstacles: [{ at: 280, type: "ground", width: 60, height: 80 }],
    orbs: [{ at: 400, height: 180 }, { at: 500, height: 120 }],
  },
  // Medium patterns - two obstacles, varied heights
  {
    difficulty: 1,
    length: 700,
    obstacles: [{ at: 250, type: "ground" }, { at: 500, type: "ground" }],
    orbs: [{ at: 375, height: 200 }],
  },
  {
    difficulty: 2,
    length: 750,
    obstacles: [
      { at: 280, type: "air", y: groundY - 180 },
      { at: 550, type: "ground" },
    ],
    orbs: [{ at: 400, height: 100 }, { at: 650, height: 180 }],
  },
  {
    difficulty: 2,
    length: 800,
    obstacles: [
      { at: 300, type: "ground", width: 80, height: 100 },
      { at: 580, type: "air", y: groundY - 200 },
    ],
    orbs: [{ at: 440, height: 200 }, { at: 700, height: 140 }],
  },
  // Hard patterns - three obstacles, require skill
  {
    difficulty: 3,
    length: 900,
    obstacles: [
      { at: 250, type: "ground" },
      { at: 480, type: "air", y: groundY - 190 },
      { at: 720, type: "ground" },
    ],
    orbs: [{ at: 360, height: 200 }, { at: 600, height: 100 }, { at: 820, height: 180 }],
  },
  {
    difficulty: 3,
    length: 950,
    obstacles: [
      { at: 280, type: "ground", width: 70, height: 90 },
      { at: 520, type: "ground" },
      { at: 760, type: "air", y: groundY - 210 },
    ],
    orbs: [{ at: 400, height: 220 }, { at: 640, height: 180 }],
  },
  // Orb bonanza - fewer obstacles, lots of orbs
  {
    difficulty: 1,
    length: 650,
    obstacles: [{ at: 320, type: "ground" }],
    orbs: [
      { at: 180, height: 120 },
      { at: 240, height: 160 },
      { at: 420, height: 140 },
      { at: 480, height: 180 },
      { at: 540, height: 200 },
    ],
  },
];

const state = {
  running: false,
  paused: false,
  gameOver: false,
  gameOverTime: 0,
  score: 0,
  best: Number(localStorage.getItem("macgame_best")) || 0,
  bestBefore: 0,
  combo: 1,
  fun: 0,
  health: 3,
  time: 0,
  animTime: 0,
  speed: 260,
  shake: 0,
  toastTimer: 0,
  level: 1,
  distance: 0,
  levelTarget: LEVEL_BASE_LENGTH,
  spawnPlan: [],
  spawnIndex: 0,
  awaitingNextLevel: false,
};

const player = {
  x: 170,
  y: groundY,
  vy: 0,
  width: 170,
  height: 240,
  jumpPower: 820,
  gravity: 1800,
  onGround: true,
  attackTimer: 0,
  attackCooldown: 0,
  hurtTimer: 0,
  invincible: 0,
  jumpBuffer: 0,
  coyoteTimer: 0,
};

const JUMP_BUFFER_TIME = 0.12;
const COYOTE_TIME = 0.12;
const ATTACK_DURATION = 0.35;

const obstacles = [];
const orbs = [];
const particles = [];

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(canvas.width / BASE_WIDTH, 0, 0, canvas.height / BASE_HEIGHT, 0, 0);
}

window.addEventListener("resize", resizeCanvas);

function loadSprites() {
  const entries = Object.entries(spriteSets);
  let loaded = 0;
  let total = 0;
  entries.forEach(([, frames]) => {
    total += frames.length;
  });

  entries.forEach(([key, frames]) => {
    sprites[key] = frames.map((src) => {
      const img = new Image();
      img.onload = () => {
        img.__meta = computeSpriteMeta(img);
        loaded += 1;
        if (loaded === total) {
          spritesReady = true;
          // Update menu with best score
          if (menuBest) menuBest.textContent = state.best;
        }
      };
      img.onerror = () => {
        console.error("Failed to load sprite:", src);
      };
      img.src = src;
      return img;
    });
  });
}

function computeSpriteMeta(img) {
  const w = img.width;
  const h = img.height;
  const temp = document.createElement("canvas");
  temp.width = w;
  temp.height = h;
  const tctx = temp.getContext("2d");
  tctx.drawImage(img, 0, 0);
  const data = tctx.getImageData(0, 0, w, h).data;
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let found = false;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha > 10) {
        found = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!found) {
    return { width: w, height: h, centerX: w / 2, footY: h };
  }

  return {
    width: w,
    height: h,
    centerX: (minX + maxX) / 2,
    footY: maxY,
  };
}
function configureOverlay({ title, text, showStart = false, showResume = false, resumeLabel = "Resume" }) {
  // Legacy function - kept for compatibility but now using new menus
}

// New menu system
function showMenu(menuElement) {
  hideAllMenus();
  if (menuElement) menuElement.classList.remove("hidden");
}

function hideAllMenus() {
  if (startMenu) startMenu.classList.add("hidden");
  if (pauseMenu) pauseMenu.classList.add("hidden");
  if (gameOverMenu) gameOverMenu.classList.add("hidden");
  if (levelComplete) levelComplete.classList.add("hidden");
}

function showHUD() {
  if (hud) hud.classList.remove("hidden");
  if (mobileControls) mobileControls.classList.remove("hidden");
}

function hideHUD() {
  if (hud) hud.classList.add("hidden");
  if (mobileControls) mobileControls.classList.add("hidden");
}

function updateLivesDisplay() {
  if (livesDisplay) {
    livesDisplay.textContent = "❤".repeat(state.health);
  }
}

function resetGame() {
  state.running = true;
  state.paused = false;
  state.gameOver = false;
  state.score = 0;
  state.combo = 1;
  state.fun = 0;
  state.health = 3;
  state.time = 0;
  state.animTime = 0;
  state.speed = 260;
  state.shake = 0;
  state.toastTimer = 0;
  state.bestBefore = state.best;
  state.awaitingNextLevel = false;

  player.y = groundY;
  player.vy = 0;
  player.onGround = true;
  player.attackTimer = 0;
  player.attackCooldown = 0;
  player.hurtTimer = 0;
  player.invincible = 0;
  player.jumpBuffer = 0;
  player.coyoteTimer = 0;

  setupLevel(1, true);
  updateLivesDisplay();

  hideAllMenus();
  showHUD();
}

function hideOverlay() {
  hideAllMenus();
}

function maxDifficultyForLevel(level) {
  if (level <= 1) return 1;
  if (level <= 3) return 2;
  return 3;
}

function pickSegmentTemplate(level) {
  const maxDifficulty = maxDifficultyForLevel(level);
  const pool = segmentTemplates.filter((template) => template.difficulty <= maxDifficulty);
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildLevelPlan(level) {
  const target = LEVEL_BASE_LENGTH + (level - 1) * LEVEL_LENGTH_STEP;
  const spawns = [];
  let cursor = 0;

  while (cursor < target) {
    const template = pickSegmentTemplate(level);
    template.obstacles.forEach((obs) => {
      spawns.push({
        at: cursor + obs.at,
        kind: "obstacle",
        data: obs,
      });
    });
    template.orbs.forEach((orb) => {
      spawns.push({
        at: cursor + orb.at,
        kind: "orb",
        data: orb,
      });
    });
    cursor += template.length;
  }

  spawns.sort((a, b) => a.at - b.at);
  return { spawns, target };
}

function setupLevel(level, resetScore) {
  state.level = level;
  state.distance = 0;
  state.spawnIndex = 0;
  state.awaitingNextLevel = false;
  const plan = buildLevelPlan(level);
  state.spawnPlan = plan.spawns;
  state.levelTarget = plan.target;
  state.speed = 260 + (level - 1) * 14;

  obstacles.length = 0;
  orbs.length = 0;
  particles.length = 0;

  if (resetScore) {
    state.score = 0;
    state.combo = 1;
    state.fun = 0;
    state.health = 3;
  }
}

function completeLevel() {
  state.running = false;
  state.paused = false;
  state.awaitingNextLevel = true;
  playLevelCompleteSound();
  
  hideHUD();
  if (levelTitle) levelTitle.textContent = `LEVEL ${state.level} COMPLETE!`;
  if (levelScore) levelScore.textContent = Math.floor(state.score);
  showMenu(levelComplete);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("hidden");
  state.toastTimer = 1.2;
}

function updateToast(dt) {
  if (state.toastTimer > 0) {
    state.toastTimer -= dt;
    if (state.toastTimer <= 0) {
      toast.classList.add("hidden");
    }
  }
}

function createObstacle(options = {}) {
  const type = options.type || (Math.random() < 0.7 ? "ground" : "air");
  const height =
    options.height !== undefined
      ? options.height
      : type === "ground"
        ? 70 + Math.random() * 40
        : 80;
  const width =
    options.width !== undefined ? options.width : type === "ground" ? 50 + Math.random() * 30 : 60;
  const y =
    options.y !== undefined
      ? options.y
      : type === "ground"
        ? groundY
        : groundY - 180 - Math.random() * 80;

  obstacles.push({
    x: BASE_WIDTH + 60,
    y,
    width,
    height,
    type,
    hit: false,
  });
}

function createOrb(options = {}) {
  const height = options.height !== undefined ? options.height : 120 + Math.random() * 140;
  orbs.push({
    x: BASE_WIDTH + 60,
    y: options.y !== undefined ? options.y : groundY - height,
    radius: 14,
    collected: false,
  });
}

function addParticles(x, y, color) {
  for (let i = 0; i < 10; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 220,
      vy: -80 - Math.random() * 220,
      life: 0.6 + Math.random() * 0.5,
      color,
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.life -= dt;
    p.vy += 520 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function playerHitbox() {
  const width = player.width * 0.6;
  const height = player.height * 0.72;
  return {
    x: player.x - width / 2,
    y: player.y - height,
    width,
    height,
  };
}

function obstacleHitbox(obstacle) {
  const padX = obstacle.width * 0.12;
  const padY = obstacle.height * 0.12;
  return {
    x: obstacle.x + padX,
    y: obstacle.y - obstacle.height + padY,
    width: obstacle.width - padX * 2,
    height: obstacle.height - padY * 2,
  };
}

function orbHitbox(orb) {
  const radius = orb.radius * 1.6;
  return {
    x: orb.x - radius,
    y: orb.y - radius,
    width: radius * 2,
    height: radius * 2,
  };
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function handleCollision(obstacle) {
  if (player.invincible > 0 || obstacle.hit) return;

  if (player.attackTimer > 0) {
    obstacle.hit = true;
    state.score += 120;
    state.fun = Math.min(100, state.fun + 12);
    addParticles(obstacle.x, obstacle.y, "#ff7a2f");
    showToast("Pow!" );
    return;
  }

  state.health -= 1;
  state.combo = 1;
  state.fun = Math.max(0, state.fun - 20);
  player.hurtTimer = 0.4;
  player.invincible = 1.2;
  state.shake = 0.5;
  showToast("Ouch!" );
  playHurtSound();
  updateLivesDisplay();

  if (state.health <= 0) {
    endGame();
  }
}

function collectOrb(orb) {
  orb.collected = true;
  state.score += 80 + state.combo * 10;
  state.combo += 1;
  state.fun = Math.min(100, state.fun + 6);
  addParticles(orb.x, orb.y, "#30d6ff");
  playOrbSound();

  if (state.combo % 6 === 0) {
    showToast("Insane Combo!" );
  }
}

function endGame() {
  state.gameOver = true;
  state.gameOverTime = performance.now();
  state.running = false;
  state.paused = false;
  state.awaitingNextLevel = false;
  
  const isNewBest = state.score > state.best;
  if (isNewBest) {
    state.best = Math.floor(state.score);
    localStorage.setItem("macgame_best", state.best);
    playLevelCompleteSound();
  } else {
    playGameOverSound();
  }

  hideHUD();
  if (gameOverTitle) gameOverTitle.textContent = isNewBest ? "NEW BEST!" : "GAME OVER";
  if (finalScore) finalScore.textContent = Math.floor(state.score);
  if (finalBest) finalBest.textContent = state.best;
  showMenu(gameOverMenu);
}

function updatePlayer(dt) {
  if (!player.onGround) {
    player.vy += player.gravity * dt;
  }

  player.y += player.vy * dt;

  if (player.y >= groundY) {
    player.y = groundY;
    player.vy = 0;
    player.onGround = true;
  }

  if (player.onGround) {
    player.coyoteTimer = COYOTE_TIME;
  } else {
    player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
  }

  if (player.jumpBuffer > 0) {
    player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
    if (player.coyoteTimer > 0) {
      player.vy = -player.jumpPower;
      player.onGround = false;
      player.jumpBuffer = 0;
      player.coyoteTimer = 0;
      playJumpSound();
    }
  }

  if (player.attackTimer > 0) {
    player.attackTimer -= dt;
  }

  if (player.attackCooldown > 0) {
    player.attackCooldown -= dt;
  }

  if (player.hurtTimer > 0) {
    player.hurtTimer -= dt;
  }

  if (player.invincible > 0) {
    player.invincible -= dt;
  }
}

function updateObstacles(dt) {
  for (let i = obstacles.length - 1; i >= 0; i -= 1) {
    const obs = obstacles[i];
    obs.x -= state.speed * dt;
    if (obs.x + obs.width < -40 || obs.hit) {
      obstacles.splice(i, 1);
    }
  }
}

function updateOrbs(dt) {
  for (let i = orbs.length - 1; i >= 0; i -= 1) {
    const orb = orbs[i];
    orb.x -= state.speed * dt;
    if (orb.x + orb.radius < -40 || orb.collected) {
      orbs.splice(i, 1);
    }
  }
}

function updateSpawns() {
  while (state.spawnIndex < state.spawnPlan.length && state.distance >= state.spawnPlan[state.spawnIndex].at) {
    const spawn = state.spawnPlan[state.spawnIndex];
    if (spawn.kind === "obstacle") {
      createObstacle(spawn.data);
    } else if (spawn.kind === "orb") {
      createOrb(spawn.data);
    }
    state.spawnIndex += 1;
  }
}

function updateScore(dt) {
  const pace = state.speed / 220;
  state.score += dt * 14 * pace;
  state.fun = Math.min(100, state.fun + dt * 4);
  state.distance += state.speed * dt;

  if (state.combo > 1) {
    state.fun = Math.min(100, state.fun + dt * state.combo * 0.35);
  }
}

function updateGame(dt) {
  state.time += dt;
  state.animTime += dt;
  updateToast(dt);
  updatePlayer(dt);
  updateSpawns();
  updateObstacles(dt);
  updateOrbs(dt);
  updateParticles(dt);
  updateScore(dt);

  if (state.distance >= state.levelTarget) {
    completeLevel();
    return;
  }

  const playerBox = playerHitbox();

  obstacles.forEach((obs) => {
    const obsBox = obstacleHitbox(obs);

    if (rectsOverlap(playerBox, obsBox)) {
      handleCollision(obs);
    }
  });

  orbs.forEach((orb) => {
    const orbBox = orbHitbox(orb);

    if (rectsOverlap(playerBox, orbBox)) {
      collectOrb(orb);
    }
  });

  const baseSpeed = 260 + (state.level - 1) * 16;
  state.speed = baseSpeed + Math.min(160, state.score * 0.12) + state.combo * 2;
  state.shake = Math.max(0, state.shake - dt);
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
  gradient.addColorStop(0, "#1e3760");
  gradient.addColorStop(1, "#0b1224");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  for (let i = 0; i < 12; i += 1) {
    const x = (state.time * 20 + i * 140) % (BASE_WIDTH + 200) - 100;
    const y = 60 + (i % 3) * 40;
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#162b46";
  ctx.beginPath();
  ctx.moveTo(0, groundY + 30);
  ctx.quadraticCurveTo(200, groundY - 40, 420, groundY + 10);
  ctx.quadraticCurveTo(640, groundY + 50, 960, groundY);
  ctx.lineTo(960, BASE_HEIGHT);
  ctx.lineTo(0, BASE_HEIGHT);
  ctx.closePath();
  ctx.fill();
}

function drawGround() {
  ctx.fillStyle = "#0a0f1c";
  ctx.fillRect(0, groundY, BASE_WIDTH, BASE_HEIGHT - groundY);
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(BASE_WIDTH, groundY);
  ctx.stroke();
}

function roundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawObstacles() {
  obstacles.forEach((obs) => {
    ctx.fillStyle = obs.type === "ground" ? "#ff7a2f" : "#30d6ff";
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 3;
    roundedRect(obs.x, obs.y - obs.height, obs.width, obs.height, 12);
  });
}

function drawOrbs() {
  orbs.forEach((orb) => {
    ctx.fillStyle = "rgba(255, 225, 93, 0.95)";
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius + 4, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawParticles() {
  particles.forEach((p) => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function pickRunFrame(frames) {
  const speedFactor = Math.min(2.2, Math.max(0.9, state.speed / 260));
  const fps = 10.5 * speedFactor;
  const index = Math.floor(state.animTime * fps) % frames.length;
  return frames[index];
}

function pickIdleFrame(frames) {
  const fps = 0.6;
  const index = Math.floor(state.animTime * fps) % frames.length;
  return frames[index];
}

function pickJumpFrame(frames) {
  if (player.onGround) return frames[0];
  if (player.vy < -180) return frames[0];
  if (player.vy > 180) return frames[2] || frames[frames.length - 1];
  return frames[1] || frames[0];
}

function getSpriteFrame(key) {
  const frames = sprites[key] || [];
  if (!frames.length) return null;
  if (frames.length === 1) return frames[0];
  if (key === "run") return pickRunFrame(frames);
  if (key === "idle") return pickIdleFrame(frames);
  if (key === "jump") return pickJumpFrame(frames);
  if (key === "attack") {
    const progress = 1 - player.attackTimer / ATTACK_DURATION;
    const index = progress < 0.5 ? 0 : 1;
    return frames[index] || frames[0];
  }
  return frames[0];
}

function currentSpriteKey() {
  if (state.gameOver && state.score >= state.bestBefore) return "victory";
  if (player.hurtTimer > 0) return "hurt";
  if (player.attackTimer > 0) return "attack";
  if (!player.onGround) return "jump";
  if (state.running) return "run";
  return "idle";
}

function drawPlayer() {
  const key = currentSpriteKey();
  const sprite = getSpriteFrame(key);
  if (!sprite) return;

  const meta = sprite.__meta || { width: sprite.width, height: sprite.height, centerX: sprite.width / 2, footY: sprite.height };
  const scale = player.height / meta.height;
  const drawX = player.x - meta.centerX * scale;
  const drawY = player.y - meta.footY * scale;
  const drawW = meta.width * scale;
  const drawH = meta.height * scale;

  if (player.invincible > 0) {
    ctx.globalAlpha = 0.6 + Math.sin(state.time * 30) * 0.2;
  }

  ctx.drawImage(sprite, drawX, drawY, drawW, drawH);
  ctx.globalAlpha = 1;
}

function drawHUD() {
  // HUD is now rendered via HTML overlay, not canvas
  // Keep this function for compatibility but do nothing
}

function render() {
  if (state.shake > 0) {
    const intensity = state.shake * 6;
    ctx.setTransform(
      canvas.width / BASE_WIDTH,
      0,
      0,
      canvas.height / BASE_HEIGHT,
      (Math.random() - 0.5) * intensity,
      (Math.random() - 0.5) * intensity
    );
  } else {
    ctx.setTransform(canvas.width / BASE_WIDTH, 0, 0, canvas.height / BASE_HEIGHT, 0, 0);
  }

  drawBackground();
  drawOrbs();
  drawObstacles();
  drawPlayer();
  drawParticles();
  drawGround();
  drawHUD();
}

function updateHUD() {
  if (scoreEl) scoreEl.textContent = Math.floor(state.score);
  if (comboEl) comboEl.textContent = `x${state.combo}`;
  if (levelEl) levelEl.textContent = state.level;
  
  // Show/hide combo display based on combo value
  if (comboDisplay) {
    if (state.combo > 1) {
      comboDisplay.classList.add("active");
    } else {
      comboDisplay.classList.remove("active");
    }
  }
}

let lastTime = 0;
function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  if (state.running && !state.paused) {
    updateGame(dt);
  }

  render();
  updateHUD();

  requestAnimationFrame(loop);
}

function jump() {
  if (!state.running || state.paused) return;
  player.jumpBuffer = JUMP_BUFFER_TIME;
}

function attack() {
  if (!state.running || state.paused) return;
  if (player.attackCooldown <= 0) {
    player.attackTimer = ATTACK_DURATION;
    player.attackCooldown = 0.7;
    playPunchSound();
  }
}

function togglePause() {
  if (!state.running) return;
  state.paused = !state.paused;
  if (state.paused) {
    hideHUD();
    showMenu(pauseMenu);
  } else {
    hideAllMenus();
    showHUD();
  }
}

function startIfNeeded() {
  if (state.awaitingNextLevel) {
    state.awaitingNextLevel = false;
    setupLevel(state.level + 1, false);
    state.running = true;
    updateLivesDisplay();
    hideAllMenus();
    showHUD();
    return true;
  }
  if (!state.running && pauseMenu && !pauseMenu.classList.contains("hidden")) {
    // We're on pause menu, don't start
    return false;
  }
  if (!state.running) {
    resetGame();
    return true;
  }
  return false;
}

// Play button (start menu)
if (playBtn) {
  playBtn.addEventListener("click", () => {
    if (!spritesReady) return;
    initAudio();
    resetGame();
  });
}

// Resume button (pause menu)
if (resumeBtn) {
  resumeBtn.addEventListener("click", () => {
    initAudio();
    state.paused = false;
    hideAllMenus();
    showHUD();
  });
}

// Quit button (pause menu)
if (quitBtn) {
  quitBtn.addEventListener("click", () => {
    state.running = false;
    state.paused = false;
    hideAllMenus();
    hideHUD();
    if (menuBest) menuBest.textContent = state.best;
    showMenu(startMenu);
  });
}

// Retry button (game over)
if (retryBtn) {
  retryBtn.addEventListener("click", () => {
    initAudio();
    resetGame();
  });
}

// Next level button
if (nextLevelBtn) {
  nextLevelBtn.addEventListener("click", () => {
    initAudio();
    state.awaitingNextLevel = false;
    setupLevel(state.level + 1, false);
    state.running = true;
    updateLivesDisplay();
    hideAllMenus();
    showHUD();
  });
}

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    initAudio();
    // Only allow restart if game is not running AND we're not mid-game
    // Require 500ms after game over to prevent accidental restarts from held keys
    if (!state.running && !state.paused) {
      if (state.gameOver && (performance.now() - state.gameOverTime) < 500) return;
      resetGame();
      return;
    }
    jump();
  }

  if (event.code === "KeyX") {
    initAudio();
    attack();
  }

  if (event.code === "KeyP") {
    togglePause();
  }
});

const pointerOptions = { passive: false };

mobileJump.addEventListener(
  "pointerdown",
  (event) => {
    event.preventDefault();
    if (!spritesReady) return;
    initAudio();
    if (!startIfNeeded()) jump();
  },
  pointerOptions
);

mobilePunch.addEventListener(
  "pointerdown",
  (event) => {
    event.preventDefault();
    if (!spritesReady) return;
    initAudio();
    if (!startIfNeeded()) attack();
  },
  pointerOptions
);

mobilePause.addEventListener(
  "pointerdown",
  (event) => {
    event.preventDefault();
    togglePause();
  },
  pointerOptions
);

canvas.addEventListener(
  "pointerdown",
  (event) => {
    if (event.pointerType === "mouse") return;
    event.preventDefault();
    if (!spritesReady) return;
    initAudio();
    if (!startIfNeeded()) jump();
  },
  pointerOptions
);

resizeCanvas();
loadSprites();
requestAnimationFrame(loop);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
