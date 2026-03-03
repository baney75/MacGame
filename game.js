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

// Background music system
let musicEnabled = true;
let musicPlaying = false;
let musicGain = null;
let musicInterval = null;

// Chip-tune style background music
const musicPatterns = {
  // Bass line (root notes)
  bass: [
    { note: 110, duration: 0.2 },  // A2
    { note: 110, duration: 0.2 },
    { note: 147, duration: 0.2 },  // D3
    { note: 147, duration: 0.2 },
    { note: 165, duration: 0.2 },  // E3
    { note: 165, duration: 0.2 },
    { note: 147, duration: 0.2 },  // D3
    { note: 131, duration: 0.2 },  // C3
  ],
  // Melody (higher notes)
  melody: [
    { note: 440, duration: 0.1 },  // A4
    { note: 0, duration: 0.1 },    // rest
    { note: 523, duration: 0.1 },  // C5
    { note: 0, duration: 0.1 },
    { note: 587, duration: 0.2 },  // D5
    { note: 523, duration: 0.1 },  // C5
    { note: 440, duration: 0.1 },  // A4
    { note: 392, duration: 0.2 },  // G4
    { note: 440, duration: 0.1 },  // A4
    { note: 0, duration: 0.1 },
    { note: 523, duration: 0.2 },  // C5
    { note: 587, duration: 0.1 },  // D5
    { note: 659, duration: 0.1 },  // E5
    { note: 587, duration: 0.2 },  // D5
    { note: 523, duration: 0.1 },  // C5
    { note: 440, duration: 0.1 },  // A4
  ],
};

let musicBassIndex = 0;
let musicMelodyIndex = 0;
let musicBeatTime = 0;

function playMusicNote(frequency, duration, type, volume) {
  if (!audioCtx || !musicEnabled || frequency === 0) return;
  if (audioCtx.state === "suspended") audioCtx.resume();
  
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
  
  gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration * 0.9);
  
  oscillator.connect(gainNode);
  if (musicGain) {
    gainNode.connect(musicGain);
  } else {
    gainNode.connect(audioCtx.destination);
  }
  
  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + duration);
}

function musicTick() {
  if (!musicPlaying || !musicEnabled) return;
  
  // Play bass note
  const bassNote = musicPatterns.bass[musicBassIndex];
  playMusicNote(bassNote.note, bassNote.duration, "triangle", 0.06);
  musicBassIndex = (musicBassIndex + 1) % musicPatterns.bass.length;
  
  // Play melody note every other beat
  if (musicBeatTime % 2 === 0) {
    const melodyNote = musicPatterns.melody[musicMelodyIndex];
    playMusicNote(melodyNote.note, melodyNote.duration, "square", 0.04);
    musicMelodyIndex = (musicMelodyIndex + 1) % musicPatterns.melody.length;
  }
  
  musicBeatTime++;
}

function startMusic() {
  if (!audioCtx || musicPlaying) return;
  
  // Create master gain for music
  musicGain = audioCtx.createGain();
  musicGain.gain.setValueAtTime(0.5, audioCtx.currentTime);
  musicGain.connect(audioCtx.destination);
  
  musicPlaying = true;
  musicBassIndex = 0;
  musicMelodyIndex = 0;
  musicBeatTime = 0;
  
  // 150 BPM = 400ms per beat
  musicInterval = setInterval(musicTick, 200);
}

function stopMusic() {
  musicPlaying = false;
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}

function toggleMusic() {
  musicEnabled = !musicEnabled;
  if (musicEnabled && state.running && !state.paused) {
    startMusic();
  } else {
    stopMusic();
  }
  updateMusicButton();
}

function updateMusicButton() {
  const musicBtn = document.getElementById("musicBtn");
  if (musicBtn) {
    musicBtn.textContent = musicEnabled ? "♪" : "♪̸";
    musicBtn.classList.toggle("muted", !musicEnabled);
  }
}

// Menu elements
const startMenu = document.getElementById("startMenu");
const pauseMenu = document.getElementById("pauseMenu");
const gameOverMenu = document.getElementById("gameOverMenu");
const levelComplete = document.getElementById("levelComplete");
const hud = document.getElementById("hud");
const mobileControls = document.getElementById("mobileControls");
const pcControls = document.getElementById("pcControls");

// Mode selection elements
const pcModeBtn = document.getElementById("pcModeBtn");
const mobileModeBtn = document.getElementById("mobileModeBtn");
const pcTutorialHints = document.getElementById("pcTutorialHints");
const mobileTutorialHints = document.getElementById("mobileTutorialHints");

// Game mode state
let gameMode = 'pc'; // 'pc' or 'mobile'

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
const levelProgressBar = document.getElementById("levelProgressBar");
const levelProgressText = document.getElementById("levelProgressText");
const levelNameEl = document.getElementById("levelName");

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
  super: ["sprites/mac_super.png"],
  defeated: ["sprites/mac_defeated.jpg"],
  magnus_idle: ["sprites/magnus/magnus_idle.png"],
  magnus_run: [
    "sprites/magnus/magnus_run_1.png",
    "sprites/magnus/magnus_run_2.png",
    "sprites/magnus/magnus_run_3.png",
    "sprites/magnus/magnus_run_4.png"
  ],
  magnus_jump: ["sprites/magnus/magnus_jump_1.png", "sprites/magnus/magnus_jump_2.png"],
  magnus_tired: ["sprites/magnus/magnus_tired.png"],
};

const sprites = {};
let spritesReady = false;

const LEVEL_BASE_LENGTH = 2500;
const LEVEL_LENGTH_STEP = 400;

const LEVEL_NAMES = [
  "Donovan's Landing",
  "Magnus's Chase",
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
  comboTimer: 0, // Timer for combo decay visual
  fun: 0,
  health: 3,
  time: 0,
  animTime: 0,
  speed: 260,
  shake: 0,
  hitFlash: 0, // Red flash on hit
  toastTimer: 0,
  level: 1,
  distance: 0,
  levelTarget: LEVEL_BASE_LENGTH,
  spawnPlan: [],
  spawnIndex: 0,
  awaitingNextLevel: false,
  showTutorial: !localStorage.getItem("macgame_played"), // First time player
  pendingUpdate: false, // PWA update pending
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
const floatingTexts = []; // Floating score popups
const confetti = []; // Celebration confetti

// Magnus the cute puppy chase mechanic - BIGGER and better positioned
const magnus = {
  x: -200,
  y: groundY - 45,
  width: 160,
  height: 120,
  active: false,
  state: 'idle', // idle, chasing, tired, happy
  chaseTimer: 0,
  tiredTimer: 0,
  happyTimer: 0,
  frame: 0,
  frameTimer: 0,
  velocity: 0,
  acceleration: 400,
  maxSpeed: 280, // Slightly faster max speed
  barkTimer: 0,
  visible: false,
  hasLicked: false,
};

const magnusSprites = {
  idle: ['sprites/magnus_idle_1.png', 'sprites/magnus_idle_2.png'],
  run: ['sprites/magnus_run_1.png', 'sprites/magnus_run_2.png', 'sprites/magnus_run_3.png', 'sprites/magnus_run_4.png'],
  tired: ['sprites/magnus_tired.png'],
};

// Canvas scaling with letterboxing for proper aspect ratio
let canvasScale = 1;
let canvasOffsetX = 0;
let canvasOffsetY = 0;

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  
  // Calculate scale to fit while maintaining aspect ratio
  const targetRatio = BASE_WIDTH / BASE_HEIGHT;
  const screenRatio = screenWidth / screenHeight;
  
  let drawWidth, drawHeight;
  
  if (screenRatio > targetRatio) {
    // Screen is wider than game - letterbox sides
    drawHeight = screenHeight;
    drawWidth = screenHeight * targetRatio;
  } else {
    // Screen is taller than game - letterbox top/bottom
    drawWidth = screenWidth;
    drawHeight = screenWidth / targetRatio;
  }
  
  // Center the canvas
  canvasOffsetX = (screenWidth - drawWidth) / 2;
  canvasOffsetY = (screenHeight - drawHeight) / 2;
  canvasScale = drawWidth / BASE_WIDTH;
  
  // Set canvas size
  canvas.style.width = drawWidth + 'px';
  canvas.style.height = drawHeight + 'px';
  canvas.style.left = canvasOffsetX + 'px';
  canvas.style.top = canvasOffsetY + 'px';
  
  canvas.width = drawWidth * dpr;
  canvas.height = drawHeight * dpr;
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
  
  // Show controls based on selected mode
  if (gameMode === 'mobile') {
    if (mobileControls) mobileControls.classList.remove("hidden");
    if (pcControls) pcControls.classList.add("hidden");
  } else {
    // PC mode - show keyboard hints
    if (mobileControls) mobileControls.classList.add("hidden");
    if (pcControls) pcControls.classList.remove("hidden");
  }
}

function hideHUD() {
  if (hud) hud.classList.add("hidden");
  if (mobileControls) mobileControls.classList.add("hidden");
  if (pcControls) pcControls.classList.add("hidden");
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

  // Reset Magnus
  magnus.state = 'idle';
  magnus.visible = false;
  magnus.active = false;
  magnus.hasLicked = false;
  magnus.chaseTimer = 0;
  magnus.tiredTimer = 0;
  magnus.happyTimer = 0;
  magnus.velocity = 0;
  magnus.x = -200;

  setupLevel(1, true);
  updateLivesDisplay();

  hideAllMenus();
  showHUD();
  
  // Show level start notification
  const levelIndex = Math.min(0, LEVEL_NAMES.length - 1);
  showToast(`${LEVEL_NAMES[levelIndex]}!`);
  
  // Start background music
  if (musicEnabled) startMusic();
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
  // Validate level number
  level = Math.max(1, Math.floor(level));
  
  state.level = level;
  state.distance = 0;
  state.spawnIndex = 0;
  state.awaitingNextLevel = false;
  
  // Build level plan with proper target distance
  const plan = buildLevelPlan(level);
  state.spawnPlan = plan.spawns;
  state.levelTarget = plan.target;
  
  // Scale speed with level (starts at 260, increases by 14 per level)
  state.speed = 260 + (level - 1) * 14;

  // Clear all game entities
  obstacles.length = 0;
  orbs.length = 0;
  particles.length = 0;
  floatingTexts.length = 0;
  confetti.length = 0;

  // Reset Magnus when changing levels
  magnus.state = 'idle';
  magnus.visible = false;
  magnus.hasLicked = false;
  magnus.chaseTimer = 0;
  magnus.tiredTimer = 0;
  magnus.happyTimer = 0;
  magnus.velocity = 0;
  magnus.x = -200;

  if (resetScore) {
    state.score = 0;
    state.combo = 1;
    state.fun = 0;
    state.health = 3;
  }
  
  console.log(`Level ${level} started: ${LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)] || 'Unknown'} - Target: ${state.levelTarget}m`);
}

function completeLevel() {
  state.running = false;
  state.paused = false;
  state.awaitingNextLevel = true;
  state.gameOver = false;
  playLevelCompleteSound();
  stopMusic();
  
  // Add celebration confetti
  addConfetti(BASE_WIDTH / 2, BASE_HEIGHT / 3, 40);
  
  hideHUD();
  if (levelTitle) levelTitle.textContent = `LEVEL ${state.level} COMPLETE!`;
  if (levelScore) levelScore.textContent = Math.floor(state.score);
  
  // Show victory image for high scores or perfect runs
  const victoryImg = document.getElementById("victoryImage");
  if (victoryImg) {
    const isHighScore = state.score > state.best * 0.8;
    const isPerfect = state.health === 3;
    victoryImg.style.display = (isHighScore || isPerfect) ? "block" : "none";
    if (isHighScore || isPerfect) {
      if (levelTitle) levelTitle.textContent = `LEVEL ${state.level} COMPLETE! 🦸‍♂️`;
    }
  }
  
  // Update next level button text
  const nextLevelBtn = document.getElementById("nextLevelBtn");
  if (nextLevelBtn) {
    const nextLevelName = LEVEL_NAMES[Math.min(state.level, LEVEL_NAMES.length - 1)] || `Level ${state.level + 1}`;
    nextLevelBtn.textContent = `NEXT: ${nextLevelName}`;
  }
  
  showMenu(levelComplete);
}

function showToast(message) {
  // Don't show toasts if game is ending (so score is visible)
  if (state.health <= 0) return;
  toast.textContent = message;
  toast.classList.remove("hidden");
  state.toastTimer = 1.2;
}

function hideToast() {
  toast.classList.add("hidden");
  state.toastTimer = 0;
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

// Floating score text popups
function addFloatingText(x, y, text, color = "#fff") {
  floatingTexts.push({
    x,
    y,
    text,
    color,
    life: 1.0,
    vy: -80,
  });
}

function updateFloatingTexts(dt) {
  for (let i = floatingTexts.length - 1; i >= 0; i -= 1) {
    const ft = floatingTexts[i];
    ft.life -= dt;
    ft.y += ft.vy * dt;
    ft.vy *= 0.95; // Slow down
    if (ft.life <= 0) {
      floatingTexts.splice(i, 1);
    }
  }
}

function drawFloatingTexts() {
  floatingTexts.forEach((ft) => {
    ctx.globalAlpha = Math.max(0, ft.life);
    ctx.fillStyle = ft.color;
    ctx.font = "bold 24px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(ft.text, ft.x, ft.y);
  });
  ctx.globalAlpha = 1;
}

// Confetti for celebrations
function addConfetti(x, y, count = 30) {
  const colors = ["#ff7a2f", "#30d6ff", "#ffe15d", "#ff5599", "#44ff88"];
  for (let i = 0; i < count; i++) {
    confetti.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 400,
      vy: -200 - Math.random() * 300,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 720,
      width: 8 + Math.random() * 8,
      height: 4 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 2 + Math.random(),
    });
  }
}

function updateMagnus(dt) {
  if (!magnus.active) return;
  
  // Update frame timer for smooth animation
  magnus.frameTimer += dt;
  if (magnus.barkTimer > 0) magnus.barkTimer -= dt;
  
  switch (magnus.state) {
    case 'chasing':
      // Accelerate towards player but stay visible on screen
      const targetX = player.x - 120; // Target position behind player
      const dx = targetX - magnus.x;
      
      if (dx > 0) {
        magnus.velocity += magnus.acceleration * dt;
        magnus.velocity = Math.min(magnus.velocity, magnus.maxSpeed);
      } else {
        magnus.velocity *= 0.9; // Slow down if too close
      }
      
      magnus.x += magnus.velocity * dt;
      
      // Keep Magnus on screen - clamp to visible area
      magnus.x = Math.max(20, Math.min(magnus.x, player.x - 80));
      
      // Chase timer
      magnus.chaseTimer -= dt;
      
      // Random barks during chase (cute puppy barks)
      if (magnus.barkTimer <= 0 && Math.random() < 0.03) {
        const barks = ["Yip!", "Arf!", "Bark!", "Woof!"];
        showToast(barks[Math.floor(Math.random() * barks.length)]);
        magnus.barkTimer = 2.5;
      }
      
      // End chase after timer or if he licked you
      if (magnus.chaseTimer <= 0 || magnus.hasLicked) {
        if (magnus.hasLicked) {
          // Happy transition when he gave kisses
          magnus.state = 'happy';
          magnus.happyTimer = 2.5;
          showToast("Magnus is happy! ❤️");
        } else {
          magnus.state = 'tired';
          magnus.tiredTimer = 2.0;
          magnus.velocity = 0;
          showToast("Magnus is tired...");
        }
      }
      break;
      
    case 'happy':
      // Happy/excited state after giving puppy kisses
      magnus.happyTimer -= dt;
      magnus.velocity *= 0.95; // Slow down gradually
      magnus.x += magnus.velocity * dt;
      magnus.x = Math.max(-100, magnus.x - 30 * dt); // Slowly move off screen
      
      if (magnus.happyTimer <= 0) {
        magnus.state = 'idle';
        magnus.visible = false;
        magnus.hasLicked = false;
      }
      break;
      
    case 'tired':
      magnus.tiredTimer -= dt;
      if (magnus.tiredTimer <= 0) {
        magnus.state = 'idle';
        magnus.visible = false;
        magnus.hasLicked = false;
      }
      break;
      
    case 'idle':
      // Hidden off-screen
      magnus.x = -200;
      break;
  }
}

function triggerMagnusChase() {
  if (magnus.state !== 'idle') return;
  
  magnus.state = 'chasing';
  magnus.chaseTimer = 12.0 + Math.random() * 5.0; // Chase for 12-17 seconds (more screen time!)
  magnus.visible = true;
  magnus.hasLicked = false;
  magnus.x = -80; // Start further off-screen for dramatic entrance
  magnus.velocity = state.speed * 0.5; // Start with moderate momentum
  showToast("🐕 MAGNUS IS COMING!");
}

function drawMagnus() {
  if (!magnus.visible) return;
  
  let sprite;
  let animationSpeed = 12; // Increased for smoother animation
  let rotation = 0;
  let scaleX = 1;
  let scaleY = 1;
  
  switch (magnus.state) {
    case 'chasing':
      // Smooth running animation with easing
      const runFrames = sprites.magnus_run;
      if (runFrames && runFrames.length) {
        const speedFactor = Math.max(0.6, magnus.velocity / 180);
        // Use smooth interpolation between frames
        const rawFrame = magnus.frameTimer * animationSpeed * speedFactor;
        const frameIndex = Math.floor(rawFrame) % runFrames.length;
        sprite = runFrames[frameIndex];
      }
      break;
      
    case 'happy':
      // Happy/jumping animation using jump sprites
      const jumpFrames = sprites.magnus_jump;
      if (jumpFrames && jumpFrames.length) {
        const happyCycle = (magnus.frameTimer * 5) % 2;
        const frameIndex = Math.floor(happyCycle);
        sprite = jumpFrames[frameIndex];
      }
      break;
      
    case 'tired':
      // Tired sprite with slight breathing animation
      const tiredFrames = sprites.magnus_tired;
      if (tiredFrames && tiredFrames.length) {
        sprite = tiredFrames[0];
        // Subtle breathing scale
        const breathe = 1 + Math.sin(magnus.frameTimer * 2) * 0.02;
        scaleY = breathe;
        scaleX = 1 + (1 - breathe) * 0.5; // Squish slightly when breathing
      }
      break;
      
    case 'idle':
    default:
      // Idle animation with subtle movement
      const idleFrames = sprites.magnus_idle;
      if (idleFrames && idleFrames.length) {
        sprite = idleFrames[0];
      }
      break;
  }
  
  if (!sprite) {
    // Fallback: try to find any Magnus sprite
    if (sprites.magnus_idle && sprites.magnus_idle.length) {
      sprite = sprites.magnus_idle[0];
    } else {
      return;
    }
  }
  
  const meta = sprite.__meta || { 
    width: sprite.width, 
    height: sprite.height, 
    centerX: sprite.width / 2, 
    footY: sprite.height 
  };
  
  const scale = magnus.height / meta.height;
  const drawX = magnus.x - meta.centerX * scale * scaleX;
  const drawY = magnus.y - meta.footY * scale * scaleY;
  const drawW = meta.width * scale * scaleX;
  const drawH = meta.height * scale * scaleY;
  
  // Enhanced shadow under Magnus
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  const shadowScale = magnus.state === 'happy' ? 0.6 : 1; // Smaller shadow when jumping
  ctx.ellipse(magnus.x, magnus.y + 8, drawW * 0.35 * shadowScale, drawH * 0.08 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  
  // Calculate bounce based on state
  let bounceY = 0;
  let rotation = 0;
  
  if (magnus.state === 'chasing') {
    // Smooth galloping bounce
    bounceY = Math.sin(magnus.frameTimer * 12) * 4;
    // Slight tilt based on velocity
    rotation = Math.sin(magnus.frameTimer * 8) * 0.05;
  } else if (magnus.state === 'happy') {
    // Happy bouncing
    bounceY = -Math.abs(Math.sin(magnus.frameTimer * 8) * 15);
    rotation = Math.sin(magnus.frameTimer * 6) * 0.1;
  }
  
  // Draw Magnus with rotation if applicable
  if (rotation !== 0) {
    ctx.save();
    ctx.translate(magnus.x, magnus.y + bounceY);
    ctx.rotate(rotation);
    ctx.translate(-magnus.x, -(magnus.y + bounceY));
  }
  
  ctx.drawImage(sprite, drawX, drawY + bounceY, drawW, drawH);
  
  if (rotation !== 0) {
    ctx.restore();
  }
  
  // Draw RED hearts when approaching for puppy kisses
  if (magnus.state === 'chasing' && magnus.x > player.x - 180 && !magnus.hasLicked) {
    const proximity = (magnus.x - (player.x - 180)) / 180; // 0 to 1
    const heartCount = 2 + Math.floor(proximity * 2); // More hearts as he gets closer
    
    ctx.save();
    ctx.font = '24px Arial';
    
    for (let i = 0; i < heartCount; i++) {
      const offsetX = Math.sin(magnus.frameTimer * 3 + i) * 20;
      const offsetY = Math.cos(magnus.frameTimer * 4 + i) * 10;
      const alpha = 0.5 + Math.sin(magnus.frameTimer * 8 + i) * 0.3;
      const scale = 0.8 + Math.sin(magnus.frameTimer * 6 + i) * 0.3;
      
      ctx.globalAlpha = alpha * proximity;
      ctx.fillStyle = '#FF0000'; // RED hearts!
      ctx.font = `${Math.floor(24 * scale)}px Arial`;
      ctx.fillText('❤', magnus.x + drawW * 0.2 + offsetX + (i * 25), magnus.y - drawH * 0.7 + offsetY);
    }
    ctx.restore();
  }
  
  // Draw happy particles when in happy state
  if (magnus.state === 'happy') {
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.font = '18px Arial';
    ctx.fillStyle = '#FFD700'; // Gold sparkles
    
    for (let i = 0; i < 3; i++) {
      const sparkleX = magnus.x + Math.sin(magnus.frameTimer * 5 + i) * 40;
      const sparkleY = magnus.y - drawH * 0.5 + Math.cos(magnus.frameTimer * 4 + i) * 30;
      ctx.fillText('✨', sparkleX, sparkleY);
    }
    ctx.restore();
  }
}

function updateConfetti(dt) {
  for (let i = confetti.length - 1; i >= 0; i -= 1) {
    const c = confetti[i];
    c.life -= dt;
    c.vy += 400 * dt; // gravity
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.rotation += c.rotationSpeed * dt;
    c.vx *= 0.99; // air resistance
    if (c.life <= 0 || c.y > BASE_HEIGHT + 50) {
      confetti.splice(i, 1);
    }
  }
}

function drawConfetti() {
  confetti.forEach((c) => {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate((c.rotation * Math.PI) / 180);
    ctx.globalAlpha = Math.min(1, c.life);
    ctx.fillStyle = c.color;
    ctx.fillRect(-c.width / 2, -c.height / 2, c.width, c.height);
    ctx.restore();
  });
  ctx.globalAlpha = 1;
}

// Red flash overlay on hit
function drawHitFlash() {
  if (state.hitFlash > 0) {
    ctx.fillStyle = `rgba(255, 0, 0, ${state.hitFlash * 0.3})`;
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
  }
}

// Level progress bar
function drawProgressBar() {
  if (!state.running || state.paused) return;
  
  const barWidth = 200;
  const barHeight = 6;
  const x = (BASE_WIDTH - barWidth) / 2;
  const y = 20;
  const progress = Math.min(1, state.distance / state.levelTarget);
  
  // Background
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(x, y, barWidth, barHeight);
  
  // Progress
  const gradient = ctx.createLinearGradient(x, 0, x + barWidth, 0);
  gradient.addColorStop(0, "#30d6ff");
  gradient.addColorStop(1, "#ff7a2f");
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, barWidth * progress, barHeight);
  
  // Border
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, barWidth, barHeight);
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
    const points = 120;
    state.score += points;
    state.fun = Math.min(100, state.fun + 12);
    addParticles(obstacle.x, obstacle.y, "#ff7a2f");
    addFloatingText(obstacle.x, obstacle.y - obstacle.height, `+${points}`, "#ff7a2f");
    showToast("Pow!");
    return;
  }

  state.health -= 1;
  state.combo = 1;
  state.comboTimer = 0;
  state.fun = Math.max(0, state.fun - 20);
  player.hurtTimer = 0.4;
  player.invincible = 1.2;
  state.shake = 0.5;
  state.hitFlash = 0.3; // Red flash
  showToast("Ouch!");
  playHurtSound();
  updateLivesDisplay();

  if (state.health <= 0) {
    endGame();
  }
}

function collectOrb(orb) {
  orb.collected = true;
  const points = 80 + state.combo * 10;
  state.score += points;
  state.combo += 1;
  state.comboTimer = 2.0; // Reset combo timer
  state.fun = Math.min(100, state.fun + 6);
  addParticles(orb.x, orb.y, "#30d6ff");
  addFloatingText(orb.x, orb.y - 20, `+${points}`, "#ffe15d");
  playOrbSound();

  if (state.combo % 6 === 0) {
    showToast("Insane Combo!");
  }
}

function endGame() {
  state.gameOver = true;
  state.gameOverTime = performance.now();
  state.running = false;
  state.paused = false;
  state.awaitingNextLevel = false;
  stopMusic();
  hideToast(); // Clear any toasts so score is visible
  
  const isNewBest = state.score > state.best;
  if (isNewBest) {
    state.best = Math.floor(state.score);
    localStorage.setItem("macgame_best", state.best);
    playLevelCompleteSound();
    // Celebration confetti for new high score!
    addConfetti(BASE_WIDTH / 2, BASE_HEIGHT / 3, 50);
  } else {
    playGameOverSound();
  }

  // Mark as played for tutorial
  localStorage.setItem("macgame_played", "true");
  state.showTutorial = false;

  hideHUD();
  if (gameOverTitle) gameOverTitle.textContent = isNewBest ? "NEW BEST!" : "GAME OVER";
  if (finalScore) finalScore.textContent = Math.floor(state.score);
  if (finalBest) finalBest.textContent = state.best;
  
  // Show defeated image on game over
  const defeatedImg = document.getElementById("defeatedImage");
  if (defeatedImg) {
    defeatedImg.style.display = isNewBest ? "none" : "block";
  }
  
  showMenu(gameOverMenu);
  
  // Check for pending update
  if (state.pendingUpdate) {
    setTimeout(() => window.location.reload(), 2000);
  }
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
  
  // Magnus chase mechanic - triggers more frequently for more screen time
  if (!magnus.active) {
    magnus.active = true;
    // Trigger Magnus more often: every 250-450 distance units
    magnus.nextTrigger = 250 + Math.random() * 200;
  }
  
  if (magnus.state === 'idle' && state.distance > magnus.nextTrigger) {
    triggerMagnusChase();
    // Schedule next chase sooner: 300-600 distance units
    magnus.nextTrigger = state.distance + 300 + Math.random() * 300;
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
  updateFloatingTexts(dt);
  updateConfetti(dt);
  updateScore(dt);
  updateMagnus(dt);
  
  // Update combo timer
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0 && state.combo > 1) {
      state.combo = 1; // Reset combo when timer expires
    }
  }
  
  // Update hit flash
  if (state.hitFlash > 0) {
    state.hitFlash -= dt * 2;
  }

  if (state.distance >= state.levelTarget && !state.awaitingNextLevel) {
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
  
  // Check collision with Magnus (friendly puppy!)
  if (magnus.visible && magnus.state === 'chasing' && !magnus.hasLicked) {
    const magnusBox = {
      x: magnus.x + 20,
      y: magnus.y - magnus.height + 25,
      width: magnus.width - 40,
      height: magnus.height - 40
    };
    
    if (rectsOverlap(playerBox, magnusBox)) {
      // Magnus gives you puppy kisses! No damage, just love
      magnus.hasLicked = true;
      const bonus = 500;
      state.score += bonus;
      state.fun = Math.min(100, state.fun + 25);
      addFloatingText(player.x, player.y - player.height - 30, "PUPPY KISSES! +" + bonus, "#FF69B4");
      showToast("Magnus loves you!");
      playOrbSound(); // Happy sound
      addConfetti(player.x, player.y - player.height, 15);
      
      // Magnus gets tired after giving kisses
      magnus.state = 'tired';
      magnus.tiredTimer = 3.0;
      magnus.velocity = 0;
    }
  }

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
  drawMagnus(); // Draw Magnus behind player
  drawProgressBar();
  drawOrbs();
  drawObstacles();
  drawPlayer();
  drawParticles();
  drawFloatingTexts();
  drawConfetti();
  drawGround();
  drawHitFlash();
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
  
  // Update combo timer bar
  const comboBar = document.getElementById("comboBar");
  if (comboBar && state.combo > 1) {
    const percent = Math.max(0, (state.comboTimer / 2.0) * 100);
    comboBar.style.width = percent + "%";
  }
  
  // Update level progress bar
  if (levelProgressBar && state.running) {
    const progress = Math.min(100, (state.distance / state.levelTarget) * 100);
    levelProgressBar.style.width = progress + "%";
    if (levelProgressText) {
      levelProgressText.textContent = Math.floor(progress) + "%";
    }
    if (levelNameEl) {
      const levelIndex = Math.min(state.level - 1, LEVEL_NAMES.length - 1);
      levelNameEl.textContent = LEVEL_NAMES[levelIndex] || `Level ${state.level}`;
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
    stopMusic();
    hideHUD();
    showMenu(pauseMenu);
  } else {
    if (musicEnabled) startMusic();
    hideAllMenus();
    showHUD();
  }
}

function startIfNeeded() {
  if (state.awaitingNextLevel) {
    state.awaitingNextLevel = false;
    const nextLevel = state.level + 1;
    setupLevel(nextLevel, false);
    state.running = true;
    state.paused = false;
    state.gameOver = false;
    updateLivesDisplay();
    hideAllMenus();
    showHUD();
    if (musicEnabled) startMusic();
    return true;
  }
  if (!state.running && pauseMenu && !pauseMenu.classList.contains("hidden")) {
    // We're on pause menu, don't start
    return false;
  }
  // Don't restart if we're on level complete menu
  if (!state.running && levelComplete && !levelComplete.classList.contains("hidden")) {
    return false;
  }
  if (!state.running) {
    resetGame();
    return true;
  }
  return false;
}

// Mode selection
function setGameMode(mode) {
  gameMode = mode;
  
  // Update button styles
  if (pcModeBtn && mobileModeBtn) {
    pcModeBtn.classList.toggle('active', mode === 'pc');
    mobileModeBtn.classList.toggle('active', mode === 'mobile');
  }
  
  // Show/hide tutorial hints
  if (pcTutorialHints && mobileTutorialHints) {
    pcTutorialHints.classList.toggle('hidden', mode !== 'pc');
    mobileTutorialHints.classList.toggle('hidden', mode !== 'mobile');
  }
  
  // Set body data attribute for CSS
  document.body.setAttribute('data-mode', mode);
  
  // Save preference
  localStorage.setItem('macgame_mode', mode);
}

// Load saved mode preference
const savedMode = localStorage.getItem('macgame_mode');
if (savedMode) {
  setGameMode(savedMode);
}

// Mode button event listeners
if (pcModeBtn) {
  pcModeBtn.addEventListener("click", () => setGameMode('pc'));
}

if (mobileModeBtn) {
  mobileModeBtn.addEventListener("click", () => setGameMode('mobile'));
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
    const nextLevel = state.level + 1;
    setupLevel(nextLevel, false);
    state.running = true;
    state.paused = false;
    state.gameOver = false;
    state.awaitingNextLevel = false;
    updateLivesDisplay();
    hideAllMenus();
    showHUD();
    if (musicEnabled) startMusic();
  });
}

// Music toggle button
const musicBtn = document.getElementById("musicBtn");
if (musicBtn) {
  musicBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMusic();
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
      // Don't restart if we're awaiting next level
      if (state.awaitingNextLevel) return;
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
  
  // Press Enter to advance to next level when on level complete screen
  if (event.code === "Enter" && state.awaitingNextLevel) {
    event.preventDefault();
    initAudio();
    state.awaitingNextLevel = false;
    const nextLevel = state.level + 1;
    setupLevel(nextLevel, false);
    state.running = true;
    state.paused = false;
    state.gameOver = false;
    updateLivesDisplay();
    hideAllMenus();
    showHUD();
    if (musicEnabled) startMusic();
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

// Auto-pause when tab loses focus
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.running && !state.paused) {
    togglePause();
  }
});

// Auto-pause when window loses focus
window.addEventListener("blur", () => {
  if (state.running && !state.paused) {
    togglePause();
  }
});

resizeCanvas();
loadSprites();
requestAnimationFrame(loop);

// Service Worker with auto-update
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then((registration) => {
      // Check for updates every 30 seconds when online
      setInterval(() => {
        if (navigator.onLine) {
          registration.update();
        }
      }, 30000);
      
      // Listen for new service worker installing
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New version available - auto-reload when not playing
              if (!state.running) {
                window.location.reload();
              } else {
                // Store that update is pending, reload when game ends or pauses
                state.pendingUpdate = true;
              }
            }
          });
        }
      });
    }).catch(() => {});
    
    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === "SW_UPDATED") {
        // New version activated, reload if not playing
        if (!state.running) {
          window.location.reload();
        } else {
          state.pendingUpdate = true;
        }
      }
    });
  });
  
  // Reload on update when returning to start menu
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.pendingUpdate && !state.running) {
      window.location.reload();
    }
  });
}
