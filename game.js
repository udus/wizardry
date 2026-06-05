const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const WIDTH = 800;
const HEIGHT = 600;
canvas.width = WIDTH;
canvas.height = HEIGHT;

const GROUND_Y = HEIGHT - 40;
const stoneColors = ['#5a5a5a', '#6e6e6e', '#7a7a7a', '#555555', '#666666'];

const ROOM_WIDTH = 3200;
const NUM_ROOMS = 5;

let WORLD_WIDTH = ROOM_WIDTH;
const keys = {};
let player;
let cameraX = 0;
let platforms = [];
let decorations = [];
let wallBlocks = [];
let roomWindows = [];
let currentRoomIndex = 0;
let roomSeed = 1;

function seededRandom(seed) {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

const spriteCache = {};

function getSprite(key, pixelData, palette, scale) {
  const cacheKey = `${key}_${scale}`;
  if (spriteCache[cacheKey]) return spriteCache[cacheKey];
  const rows = pixelData.length;
  const cols = pixelData[0].length;
  const offscreen = document.createElement('canvas');
  offscreen.width = cols * scale;
  offscreen.height = rows * scale;
  const octx = offscreen.getContext('2d');
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const colorIdx = pixelData[y][x];
      if (colorIdx === 0) continue;
      octx.fillStyle = palette[colorIdx];
      octx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  spriteCache[cacheKey] = offscreen;
  return offscreen;
}

const wizardPalette = [
  'transparent',
  '#2a1040',
  '#4a2878',
  '#6b3fa0',
  '#8b5fc0',
  '#f5d6c6',
  '#ffffff',
  '#8b7355',
  '#ffcc00',
  '#ff6600',
  '#aaddff',
  '#d4a373'
];

const wizardIdle0 = [
  [0,0,0,1,1,0,0,0],
  [0,0,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,0],
  [0,1,1,1,1,1,1,0],
  [0,0,5,5,5,5,0,0],
  [0,0,4,4,4,4,0,0],
  [0,1,1,3,3,1,1,0],
  [0,1,3,3,3,3,1,0],
  [0,3,3,3,3,3,3,0],
  [0,0,3,2,2,3,0,0],
  [0,0,3,2,2,3,0,0],
  [0,0,0,3,3,0,0,0]
];

const wizardIdle1 = [
  [0,0,0,1,1,0,0,0],
  [0,0,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,0],
  [0,1,1,1,1,1,1,0],
  [0,0,5,5,5,5,0,0],
  [0,0,4,4,4,4,0,0],
  [0,1,1,3,3,1,1,0],
  [0,1,3,3,3,3,1,0],
  [0,3,3,3,3,3,3,0],
  [0,0,3,2,2,3,0,0],
  [0,0,3,2,2,3,0,0],
  [0,0,0,3,3,0,0,0]
];

const skeletonPalette = [
  'transparent',
  '#e8e8e8',
  '#1a1a1a',
  '#999999',
  '#ffffff'
];

const skeletonFrame0 = [
  [0,0,1,1,1,1,1,0],
  [0,1,1,1,1,1,1,1],
  [0,1,2,2,2,2,2,1],
  [0,1,2,2,2,2,2,1],
  [0,1,1,1,1,1,1,1],
  [0,1,3,3,3,3,3,1],
  [0,1,3,0,0,0,3,1],
  [0,1,3,0,0,0,3,1],
  [0,1,1,1,1,1,1,1],
  [0,1,0,0,0,0,0,1],
  [0,1,0,0,0,0,0,1],
  [0,1,0,0,0,0,0,1]
];

const skeletonFrame1 = [
  [0,0,0,1,1,1,0,0],
  [0,0,1,1,1,1,1,0],
  [0,1,2,2,2,2,2,0],
  [0,1,2,2,2,2,2,1],
  [0,0,1,1,1,1,1,1],
  [0,0,3,3,3,3,3,0],
  [0,1,3,0,0,0,3,1],
  [0,1,3,0,0,0,3,1],
  [0,1,1,1,1,1,1,1],
  [0,1,0,0,0,0,0,1],
  [0,1,0,0,0,0,0,1],
  [0,1,0,0,0,0,0,1]
];

const goblinPalette = [
  'transparent',
  '#5a8a3a',
  '#3d5c28',
  '#cc3333',
  '#4a3728',
  '#2a1a0a'
];

const goblinFrame0 = [
  [0,0,1,1,1,1,1,0],
  [0,1,1,1,1,1,1,1],
  [0,1,2,2,2,2,2,1],
  [0,1,1,1,1,1,1,1],
  [0,1,2,2,2,2,2,1],
  [0,1,2,2,2,2,2,1],
  [0,0,1,1,1,1,1,0],
  [0,0,1,1,1,1,1,0],
  [0,0,1,0,0,0,1,0],
  [0,0,4,0,0,0,4,0],
  [0,0,5,0,0,0,5,0],
  [0,0,0,0,0,0,0,0]
];

const goblinFrame1 = [
  [0,0,1,1,1,1,1,0],
  [0,1,1,1,1,1,1,1],
  [0,1,2,2,2,2,2,1],
  [0,1,1,1,1,1,1,1],
  [0,1,2,2,2,2,2,1],
  [0,1,2,2,2,2,2,1],
  [0,0,1,1,1,1,1,0],
  [0,0,1,1,1,1,1,0],
  [0,0,1,0,0,0,1,0],
  [0,0,4,0,0,0,4,0],
  [0,0,5,0,0,0,5,0],
  [0,0,0,0,0,0,0,0]
];

// Warm sprite cache
getSprite('wizard_idle_0', wizardIdle0, wizardPalette, 2);
getSprite('wizard_idle_1', wizardIdle1, wizardPalette, 2);
getSprite('skeleton_frame0', skeletonFrame0, skeletonPalette, 2);
getSprite('skeleton_frame1', skeletonFrame1, skeletonPalette, 2);
getSprite('goblin_frame0', goblinFrame0, goblinPalette, 2);
getSprite('goblin_frame1', goblinFrame1, goblinPalette, 2);

function generateRoom(roomIndex) {
  const rand = seededRandom(roomIndex * 12345 + roomSeed++);
  const baseX = roomIndex * ROOM_WIDTH;

  platforms = [];
  decorations = [];
  wallBlocks = [];
  roomWindows = [];

  const wallRand = seededRandom(roomIndex * 98765 + 1);
  const blockH = 28;
  const blockW = 56;
  const rows = Math.ceil(GROUND_Y / blockH) + 1;
  const cols = Math.ceil(ROOM_WIDTH / blockW) + 2;

  for (let row = 0; row < rows; row++) {
    const offset = (row % 2) * (blockW / 2);
    for (let col = -1; col < cols; col++) {
      const x = baseX + col * blockW + offset;
      const y = row * blockH;
      const qualityRand = wallRand();
      let shade = 32 + Math.sin(col * 0.7 + row * 0.5) * 8 + wallRand() * 6;
      let broken = false;
      let moss = false;
      if (qualityRand > 0.92) {
        shade -= 12;
        broken = true;
      } else if (qualityRand > 0.85) {
        shade += 4;
        moss = true;
      }
      wallBlocks.push({ x, y, w: blockW - 1, h: blockH - 1, shade, broken, moss });
    }
  }

  const numRoomWindows = Math.floor(wallRand() * 3) + (roomIndex > 0 ? 1 : 0);
  for (let i = 0; i < numRoomWindows; i++) {
    const wx = baseX + wallRand() * (ROOM_WIDTH - 300) + 150;
    const wy = wallRand() * 120 + 50;
    const ww = 70 + wallRand() * 40;
    const wh = 90 + wallRand() * 50;
    roomWindows.push({ x: wx, y: wy, w: ww, h: wh });
  }

  const numPlatforms = Math.floor(rand() * 3) + 2;
  const difficulty = Math.min(roomIndex, 4);

  platforms.push({
    x: baseX + 150,
    y: GROUND_Y - 60 - difficulty * 10,
    w: 180,
    h: 20,
    color: stoneColors[roomIndex % stoneColors.length],
    roomIndex: roomIndex
  });

  let px = baseX + 380;
  for (let i = 0; i < numPlatforms; i++) {
    const gap = rand() * 120 + 80 + difficulty * 10;
    const heightChange = rand() * 200 - 100;
    const width = rand() * 120 + 100;

    px += gap;
    let py = GROUND_Y - 80 - heightChange;
    py = Math.min(py, GROUND_Y - 40);
    py = Math.max(py, 200);

    platforms.push({
      x: px,
      y: py,
      w: width,
      h: 20,
      color: stoneColors[Math.floor(rand() * stoneColors.length)],
      roomIndex: roomIndex
    });

    if (rand() > 0.5) {
      decorations.push({
        type: 'candle',
        x: px + width / 2,
        y: py - 18,
        roomIndex: roomIndex
      });
    }
  }

  platforms.push({
    x: baseX + ROOM_WIDTH - 300,
    y: GROUND_Y - 120 - difficulty * 15,
    w: 220,
    h: 20,
    color: stoneColors[roomIndex % stoneColors.length],
    roomIndex: roomIndex
  });

  platforms.push({
    x: baseX + ROOM_WIDTH - 100,
    y: GROUND_Y - 60,
    w: 120,
    h: 20,
    color: stoneColors[roomIndex % stoneColors.length],
    roomIndex: roomIndex
  });

  const decoTypes = ['sword', 'shield', 'window', 'banner', 'painting', 'armor', 'candle', 'table'];
  const numDecos = Math.floor(rand() * 6) + 4;
  for (let i = 0; i < numDecos; i++) {
    const type = decoTypes[Math.floor(rand() * decoTypes.length)];
    const dx = baseX + rand() * (ROOM_WIDTH - 200) + 100;
    let dy;
    let facing = rand() > 0.5 ? 1 : -1;

    switch (type) {
      case 'window':
      case 'painting':
        dy = rand() * 150 + 80;
        break;
      case 'banner':
        dy = rand() * 100 + 60;
        break;
      case 'candle':
      case 'sword':
      case 'shield':
        dy = GROUND_Y - rand() * 200 - 40;
        break;
      case 'armor':
      case 'table':
        dy = GROUND_Y - 30;
        break;
      default:
        dy = GROUND_Y - rand() * 200 - 40;
    }

    decorations.push({
      type,
      x: dx,
      y: dy,
      facing,
      roomIndex: roomIndex,
      flicker: rand() * 0.5 + 0.5
    });
  }
}

generateRoom(0);

window.addEventListener('keydown', e => {
  ensureAudio();
  keys[e.key.toLowerCase()] = true;
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w'].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }
});
window.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('click', e => {
  ensureAudio();
  const rect = canvas.getBoundingClientRect();
  const scaleX = WIDTH / rect.width;
  const scaleY = HEIGHT / rect.height;
  const mx = (e.clientX - rect.left) * scaleX + cameraX;
  const my = (e.clientY - rect.top) * scaleY;
  player.castFireball(mx, my);
});

// Mobile controls
const leftBtn = document.getElementById('left-btn');
const rightBtn = document.getElementById('right-btn');
const jumpBtn = document.getElementById('jump-btn');
const fireballBtn = document.getElementById('fireball-btn');

function setupButton(btn, key, isFireball = false) {
  if (!btn) return;
  btn.addEventListener('mousedown', e => { e.preventDefault(); keys[key] = true; if (isFireball) fireballBtnClicked(); });
  btn.addEventListener('mouseup', e => { e.preventDefault(); if (!isFireball) keys[key] = false; });
  btn.addEventListener('mouseleave', e => { e.preventDefault(); if (!isFireball) keys[key] = false; });
  btn.addEventListener('touchstart', e => { e.preventDefault(); keys[key] = true; if (isFireball) fireballBtnClicked(); });
  btn.addEventListener('touchend', e => { e.preventDefault(); if (!isFireball) keys[key] = false; });
  btn.addEventListener('touchcancel', e => { e.preventDefault(); if (!isFireball) keys[key] = false; });
}

function fireballBtnClicked() {
  ensureAudio();
  const centerX = cameraX + WIDTH / 2;
  const centerY = GROUND_Y - 100;
  player.castFireball(centerX, centerY);
}

setupButton(leftBtn, 'a');
setupButton(rightBtn, 'd');
setupButton(jumpBtn, 'w');
setupButton(fireballBtn, ' ', true);

class Particle {
  constructor(x, y, vx, vy, life, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.color = color;
    this.radius = Math.random() * 3 + 1;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    this.vy += 200 * dt;
  }

  draw() {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  get dead() { return this.life <= 0; }
}

class Fireball {
  constructor(x, y, tx, ty) {
    this.x = x;
    this.y = y;
    const dx = tx - x;
    const dy = ty - y;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = 500;
    this.vx = (dx / dist) * speed;
    this.vy = (dy / dist) * speed;
    this.radius = 6;
    this.life = 1.5;
    this.maxLife = 1.5;
    this.hit = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    for (let i = 0; i < 2; i++) {
      particles.push(new Particle(
        this.x, this.y,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
        0.3 + Math.random() * 0.2,
        Math.random() < 0.5 ? '#ff6600' : '#ffcc00'
      ));
    }
  }

  draw() {
    const alpha = Math.max(0, this.life / this.maxLife);
    const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 3);
    glow.addColorStop(0, `rgba(255, 150, 0, ${alpha})`);
    glow.addColorStop(0.5, `rgba(255, 80, 0, ${alpha * 0.5})`);
    glow.addColorStop(1, 'rgba(255, 50, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 200, ${alpha})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  get dead() { return this.life <= 0 || this.hit; }

  get bounds() {
    return {
      x: this.x - this.radius,
      y: this.y - this.radius,
      w: this.radius * 2,
      h: this.radius * 2
    };
  }
}

class Enemy {
  constructor() {
    const side = Math.random() < 0.5 ? 0 : 1;
    this.x = side === 0 ? cameraX - 20 : cameraX + WIDTH + 20;
    this.y = GROUND_Y - 20;
    this.vx = 0;
    this.vy = 0;
    this.width = 24;
    this.height = 24;
    this.speed = 80 + Math.random() * 40;
    this.hp = 1;
    this.alive = true;
    this.dying = false;
    this.deathTimer = 0;
    this.flash = 0;
    this.grounded = false;
    this.type = Math.random() < 0.5 ? 'skeleton' : 'goblin';
    this.spriteFrame = 0;
    this.spriteTimer = 0;
  }

  update(dt, playerX) {
    if (this.dying) {
      this.deathTimer -= dt;
      this.flash = Math.max(0, this.flash - dt);
      return;
    }

    const dir = playerX > this.x ? 1 : -1;
    this.vx = dir * this.speed;
    this.vy += 800 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.y >= GROUND_Y) {
      this.y = GROUND_Y;
      this.vy = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
      for (const plat of platforms) {
        if (
          this.vy >= 0 &&
          this.x + this.width / 2 > plat.x &&
          this.x - this.width / 2 < plat.x + plat.w &&
          this.y >= plat.y &&
          this.y - this.vy * dt <= plat.y + 5
        ) {
          this.y = plat.y;
          this.vy = 0;
          this.grounded = true;
          break;
        }
      }
    }

    this.flash = Math.max(0, this.flash - dt);

    this.spriteTimer += dt;
    if (this.spriteTimer > 0.5) {
      this.spriteTimer = 0;
      this.spriteFrame = this.spriteFrame === 0 ? 1 : 0;
    }
  }

  draw() {
    const dy = this.dying ? Math.min(1, this.deathTimer / 0.3) : 1;
    if (dy <= 0) return;

    ctx.save();
    ctx.globalAlpha = dy;

    if (this.dying) {
      ctx.fillStyle = '#881111';
      ctx.fillRect(this.x - this.width / 2 - 2, this.y - this.height - 2, this.width + 4, this.height + 4);
    }

    const facing = this.x > cameraX + WIDTH / 2 ? -1 : 1;
    const palette = this.type === 'skeleton' ? skeletonPalette : goblinPalette;
    const frameData = this.type === 'skeleton'
      ? (this.spriteFrame === 0 ? skeletonFrame0 : skeletonFrame1)
      : (this.spriteFrame === 0 ? goblinFrame0 : goblinFrame1);
    const sprite = getSprite(this.type + '_frame' + this.spriteFrame, frameData, palette, 2);

    const drawX = this.x - sprite.width / 2;
    const drawY = this.y - sprite.height;
    if (facing < 0) {
      ctx.translate(this.x + sprite.width / 2, this.y);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, -sprite.width / 2, -sprite.height);
    } else {
      ctx.drawImage(sprite, drawX, drawY);
    }

    ctx.restore();
  }

  get bounds() {
    if (this.dying) return { x: -999, y: -999, w: 0, h: 0 };
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height,
      w: this.width,
      h: this.height
    };
  }
}

class Player {
  constructor() {
    this.x = WIDTH / 2;
    this.y = GROUND_Y;
    this.vx = 0;
    this.vy = 0;
    this.width = 24;
    this.height = 32;
    this.speed = 220;
    this.jumpForce = -420;
    this.grounded = false;
    this.facing = 1;
    this.cooldown = 0;
    this.coyoteTimer = 0;
    this.coyoteWindow = 0.12;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.invincibleDuration = 1.5;
    this.flashTimer = 0;
    this.wandTimer = 0;
    this.spriteFrame = 0;
    this.spriteTimer = 0;
    this.jumpBoost = 0;
    this.jumpBoostMax = 200;
    this.maxJumpHold = 0.25;
  }

  update(dt) {
    if (this.invincible) {
      this.invincibleTimer -= dt;
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.flashTimer = 0.1;
      }
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
      }
    }

    let moveX = 0;
    if (keys['a'] || keys['arrowleft']) moveX -= 1;
    if (keys['d'] || keys['arrowright']) moveX += 1;

    if (moveX !== 0) this.facing = moveX;
    this.vx = moveX * this.speed;

    const jumpPressed = keys['w'] || keys['arrowup'] || keys[' '];
    if (jumpPressed && (this.grounded || this.coyoteTimer > 0)) {
      this.vy = this.jumpForce;
      this.grounded = false;
      this.coyoteTimer = 0;
      this.jumpBoost = this.jumpBoostMax;
    }

    if (jumpPressed && this.jumpBoost > 0) {
      this.vy = Math.max(this.jumpForce, this.vy - (this.jumpBoost / this.maxJumpHold) * dt);
      this.jumpBoost -= dt * this.jumpBoostMax / this.maxJumpHold;
    } else if (!jumpPressed && this.jumpBoost > 0) {
      this.jumpBoost = 0;
      this.vy = Math.max(this.vy, -80);
    }

    this.vy += 900 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.x < cameraX + this.width / 2) this.x = cameraX + this.width / 2;
    if (this.x > cameraX + WIDTH / 2) {
      cameraX = this.x - WIDTH / 2;
    }
    if (cameraX < 0) cameraX = 0;
    if (cameraX > WORLD_WIDTH - WIDTH) cameraX = WORLD_WIDTH - WIDTH;

    if (this.y >= GROUND_Y) {
      this.y = GROUND_Y;
      this.vy = 0;
      this.grounded = true;
      this.coyoteTimer = this.coyoteWindow;
    } else {
      this.grounded = false;
      for (const plat of platforms) {
        if (
          this.vy >= 0 &&
          this.x + this.width / 2 > plat.x &&
          this.x - this.width / 2 < plat.x + plat.w &&
          this.y >= plat.y &&
          this.y - this.vy * dt <= plat.y + 5
        ) {
          this.y = plat.y;
          this.vy = 0;
          this.grounded = true;
          this.coyoteTimer = this.coyoteWindow;
          break;
        }
      }
      if (!this.grounded) {
        this.coyoteTimer -= dt;
      }
    }

    this.cooldown = Math.max(0, this.cooldown - dt);
    this.wandTimer = Math.max(0, this.wandTimer - dt);

    this.spriteTimer += dt;
    if (this.wandTimer > 0) {
      if (this.spriteTimer > 0.08) {
        this.spriteTimer = 0;
        this.spriteFrame = this.spriteFrame === 0 ? 1 : 0;
      }
    } else if (Math.abs(this.vx) > 1) {
      if (this.spriteTimer > 0.12) {
        this.spriteTimer = 0;
        this.spriteFrame = this.spriteFrame === 0 ? 1 : 0;
      }
    } else {
      if (this.spriteTimer > 0.25) {
        this.spriteTimer = 0;
        this.spriteFrame = this.spriteFrame === 0 ? 1 : 0;
      }
    }
  }

  castFireball(tx, ty) {
    if (this.cooldown > 0) return;
    fireballs.push(new Fireball(this.x, this.y - this.height / 2, tx, ty));
    this.cooldown = 0.4;
    this.wandTimer = 0.25;
    if (audio && audio.playFireball) audio.playFireball();
  }

  draw() {
    if (this.invincible && Math.floor(this.flashTimer * 20) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    const frameData = this.spriteFrame === 0 ? wizardIdle0 : wizardIdle1;
    const sprite = getSprite('wizard_idle_' + this.spriteFrame, frameData, wizardPalette, 2);

    ctx.save();
    const drawX = this.x - sprite.width / 2;
    const drawY = this.y - sprite.height;
    if (this.facing < 0) {
      ctx.translate(this.x + sprite.width / 2, this.y);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, -sprite.width / 2, -sprite.height);
    } else {
      ctx.drawImage(sprite, drawX, drawY);
    }
    ctx.restore();

    if (this.wandTimer > 0) {
      const swing = Math.sin(this.wandTimer * 25) * 8;
      const wandBaseX = this.facing > 0 ? this.x + 8 : this.x - 8;
      const wandBaseY = this.y - 18;
      ctx.strokeStyle = '#8b7355';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wandBaseX, wandBaseY);
      ctx.lineTo(wandBaseX + 6 * this.facing, wandBaseY - 12 + swing);
      ctx.stroke();

      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.arc(wandBaseX + 6 * this.facing, wandBaseY - 14 + swing, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.arc(wandBaseX + 6 * this.facing, wandBaseY - 14 + swing, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!this.grounded) {
      for (let i = 0; i < 3; i++) {
        particles.push(new Particle(
          this.x + (Math.random() - 0.5) * 8,
          this.y,
          (Math.random() - 0.5) * 30,
          Math.random() * 40 + 20,
          0.2 + Math.random() * 0.1,
          '#aaddff'
        ));
      }
    }

    ctx.globalAlpha = 1;
  }

  get bounds() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height,
      w: this.width,
      h: this.height
    };
  }
}

function aabb(a, b) {
  if (!a || !b) {
    console.warn('aabb called with missing argument', a, b);
    return false;
  }
  if (typeof a.x !== 'number' || typeof b.x !== 'number') {
    console.warn('aabb called without x', a, b);
    return false;
  }
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

player = new Player();
let fireballs = [];
let enemies = [];
let particles = [];
let score = 0;
let spawnTimer = 0;
const spawnInterval = 2;

function update(dt) {
  player.update(dt);

  spawnTimer += dt;
  if (spawnTimer >= spawnInterval) {
    spawnTimer -= spawnInterval;
    enemies.push(new Enemy());
  }

  let fbWrite = 0;
  for (let i = 0; i < fireballs.length; i++) {
    const fb = fireballs[i];
    fb.update(dt);
    if (fb.dead) continue;

    let hitEnemy = false;
    for (let j = 0; j < enemies.length; j++) {
      const enemy = enemies[j];
      if (!fb.bounds || !enemy.bounds) continue;
      if (aabb(fb.bounds, enemy.bounds)) {
        enemy.hp--;
        enemy.flash = 0.1;

        for (let k = 0; k < 8; k++) {
          particles.push(new Particle(
            enemy.x, enemy.y - enemy.height / 2,
            (Math.random() - 0.5) * 200,
            (Math.random() - 0.5) * 200,
            0.4 + Math.random() * 0.3,
            Math.random() < 0.5 ? '#ff4400' : '#ffaa00'
          ));
        }

        if (enemy.hp <= 0) {
          enemy.alive = false;
          enemy.dying = true;
          enemy.deathTimer = 0.3;
          score++;
          document.getElementById('score').textContent = `Score: ${score}`;
          if (audio && audio.playExplosion) audio.playExplosion();
        }
        hitEnemy = true;
        break;
      }
    }

    if (!hitEnemy) {
      fireballs[fbWrite++] = fb;
    }
  }
  fireballs.length = fbWrite;

  let eWrite = 0;
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (!enemy) continue;
    enemy.update(dt, player.x);

    if (!player.invincible && aabb(player.bounds, enemy.bounds)) {
      for (let k = 0; k < 15; k++) {
        particles.push(new Particle(
          player.x, player.y - player.height / 2,
          (Math.random() - 0.5) * 300,
          (Math.random() - 0.5) * 300,
          0.5 + Math.random() * 0.4,
          Math.random() < 0.5 ? '#ff0000' : '#ffffff'
        ));
      }
      enemies.length = 0;
      fireballs.length = 0;
      particles.length = 0;
      player.x = cameraX + WIDTH / 2;
      player.y = GROUND_Y;
      player.vx = 0;
      player.vy = 0;
      player.grounded = true;
      player.invincible = true;
      player.invincibleTimer = player.invincibleDuration;
      player.flashTimer = 0.1;
      spawnTimer = 0;
      score = 0;
      document.getElementById('score').textContent = 'Score: 0';
      if (audio && audio.playDeath) audio.playDeath();
      break;
    }

    if (enemy.dying && enemy.deathTimer <= 0) continue;

    if (enemy.x >= cameraX - 200 && enemy.x <= cameraX + WIDTH + 200) {
      enemies[eWrite++] = enemy;
    }
  }
  enemies.length = eWrite;

  let write = 0;
  for (let i = 0; i < particles.length; i++) {
    particles[i].update(dt);
    if (!particles[i].dead) {
      particles[write++] = particles[i];
    }
  }
  particles.length = write;

  if (player.x >= WORLD_WIDTH - 40) {
    currentRoomIndex++;
    generateRoom(currentRoomIndex);
    cameraX = currentRoomIndex * ROOM_WIDTH;
    player.x = cameraX + 60;
    WORLD_WIDTH = (currentRoomIndex + 1) * ROOM_WIDTH;
    enemies.length = 0;
    fireballs.length = 0;
    particles.length = 0;
    spawnTimer = 0;
    score += 100;
    document.getElementById('score').textContent = `Score: ${score}`;
    console.log('Advanced to room', currentRoomIndex, '! Total score:', score);
    if (audio && audio.playFanfare) audio.playFanfare();
  }
}

function drawCastleWall() {
  ctx.fillStyle = '#252525';
  ctx.fillRect(0, 0, ROOM_WIDTH, GROUND_Y);

  ctx.strokeStyle = '#181818';
  ctx.lineWidth = 1;
  for (const block of wallBlocks) {
    ctx.fillStyle = `rgb(${block.shade}, ${block.shade}, ${block.shade + 1})`;
    ctx.fillRect(block.x, block.y, block.w, block.h);
    ctx.strokeRect(block.x, block.y, block.w, block.h);
    if (block.moss) {
      ctx.fillStyle = 'rgba(45, 74, 30, 0.35)';
      ctx.fillRect(block.x + 1, block.y + 1, block.w - 2, 6);
      ctx.fillRect(block.x + 1, block.y + 1, 6, block.h - 2);
    }
    if (block.broken) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(block.x + block.w - 6, block.y + 2, 4, 4);
      ctx.fillRect(block.x + 2, block.y + block.h - 6, 5, 4);
      ctx.strokeStyle = '#111111';
      ctx.beginPath();
      ctx.moveTo(block.x + 4, block.y + block.h - 4);
      ctx.lineTo(block.x + block.w - 4, block.y + 4);
      ctx.stroke();
      ctx.strokeStyle = '#181818';
    }
  }

  for (const win of roomWindows) {
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(win.x, win.y, win.w, win.h);
    ctx.strokeStyle = '#3a3028';
    ctx.lineWidth = 3;
    ctx.strokeRect(win.x, win.y, win.w, win.h);
    ctx.beginPath();
    ctx.moveTo(win.x + win.w / 2, win.y);
    ctx.lineTo(win.x + win.w / 2, win.y + win.h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(win.x, win.y + win.h * 0.4);
    ctx.lineTo(win.x + win.w, win.y + win.h * 0.4);
    ctx.stroke();
    const starCount = Math.floor(win.w / 8);
    for (let i = 0; i < starCount; i++) {
      const sx = win.x + 4 + (i * 13) % (win.w - 8);
      const sy = win.y + 6 + (i * 7) % (win.h - 12);
      const bright = 150 + (i % 3) * 35;
      ctx.fillStyle = `rgb(${bright}, ${bright}, ${Math.min(255, bright + 20)})`;
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.fillStyle = '#ffeebb';
    ctx.beginPath();
    ctx.arc(win.x + win.w - 14, win.y + 14, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, ROOM_WIDTH, 3);
  ctx.fillRect(0, GROUND_Y - 3, ROOM_WIDTH, 3);
}

function draw() {
  ctx.save();
  try {
    ctx.translate(-cameraX, 0);

    drawCastleWall();

    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(cameraX, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);

    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cameraX, GROUND_Y);
    ctx.lineTo(cameraX + WIDTH, GROUND_Y);
    ctx.stroke();

    for (const plat of platforms) {
      ctx.fillStyle = plat.color;
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
      ctx.fillStyle = '#444444';
      for (let lx = 0; lx < plat.w; lx += 20) {
        ctx.fillRect(plat.x + lx, plat.y + 3, 1, plat.h - 6);
      }
      ctx.fillRect(plat.x, plat.y + 3, plat.w, 1);
      ctx.fillRect(plat.x, plat.y + plat.h - 4, plat.w, 1);
    }

    for (const deco of decorations) {
      switch (deco.type) {
        case 'window':
          ctx.fillStyle = '#4a3520';
          ctx.fillRect(deco.x - 20, deco.y - 25, 40, 45);
          ctx.fillStyle = '#8b7355';
          ctx.fillRect(deco.x - 16, deco.y - 21, 32, 37);
          ctx.fillStyle = '#c9b896';
          ctx.fillRect(deco.x - 10, deco.y - 15, 8, 8);
          ctx.fillRect(deco.x + 2, deco.y - 15, 8, 8);
          ctx.fillRect(deco.x - 10, deco.y - 3, 8, 8);
          ctx.fillRect(deco.x + 2, deco.y - 3, 8, 8);
          break;
        case 'painting':
          ctx.fillStyle = '#6b4226';
          ctx.fillRect(deco.x - 25, deco.y - 20, 50, 35);
          ctx.fillStyle = deco.color || '#888888';
          ctx.fillRect(deco.x - 22, deco.y - 17, 44, 29);
          ctx.fillStyle = '#888888';
          ctx.fillRect(deco.x - 15, deco.y - 5, 10, 10);
          ctx.fillRect(deco.x + 5, deco.y - 5, 10, 10);
          break;
        case 'banner':
          ctx.fillStyle = '#8b0000';
          ctx.fillRect(deco.x - 15 * deco.facing, deco.y, 30, 40);
          ctx.fillStyle = '#ffcc00';
          ctx.fillRect(deco.x - 2, deco.y + 5, 4, 30);
          ctx.fillRect(deco.x - 10, deco.y + 15, 20, 3);
          break;
        case 'candle':
          ctx.fillStyle = '#888888';
          ctx.fillRect(deco.x - 3, deco.y, 6, 12);
          ctx.fillStyle = '#ff9900';
          ctx.beginPath();
          ctx.arc(deco.x, deco.y - 3, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffcc00';
          ctx.beginPath();
          ctx.arc(deco.x, deco.y - 3, 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'sword':
          ctx.fillStyle = '#8b7355';
          ctx.fillRect(deco.x - 2 * deco.facing, deco.y - 25, 4, 50);
          ctx.fillStyle = '#cccccc';
          ctx.fillRect(deco.x - 4 * deco.facing, deco.y - 25, 8, 3);
          ctx.fillRect(deco.x - 3, deco.y + 18, 6, 8);
          break;
        case 'shield':
          ctx.fillStyle = '#4a3728';
          ctx.beginPath();
          ctx.moveTo(deco.x, deco.y - 20);
          ctx.lineTo(deco.x + 15, deco.y - 10);
          ctx.lineTo(deco.x + 15, deco.y + 10);
          ctx.lineTo(deco.x, deco.y + 20);
          ctx.lineTo(deco.x - 15, deco.y + 10);
          ctx.lineTo(deco.x - 15, deco.y - 10);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#888888';
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
        case 'armor':
          ctx.fillStyle = '#555555';
          ctx.fillRect(deco.x - 12, deco.y - 5, 24, 30);
          ctx.fillStyle = '#777777';
          ctx.beginPath();
          ctx.arc(deco.x, deco.y - 8, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#666666';
          ctx.fillRect(deco.x - 3, deco.y - 10, 6, 5);
          break;
        case 'table':
          ctx.fillStyle = '#5c4033';
          ctx.fillRect(deco.x - 20, deco.y, 40, 5);
          ctx.fillRect(deco.x - 18, deco.y + 5, 4, 15);
          ctx.fillRect(deco.x + 14, deco.y + 5, 4, 15);
          break;
      }
    }

    const exitX = WORLD_WIDTH - 80;
    ctx.fillStyle = '#555555';
    ctx.fillRect(exitX, GROUND_Y - 120, 10, 120);
    ctx.fillRect(exitX + 70, GROUND_Y - 120, 10, 120);
    ctx.fillStyle = '#666666';
    ctx.fillRect(exitX - 5, GROUND_Y - 125, 90, 10);

    for (const fb of fireballs) fb && fb.draw();
    for (const enemy of enemies) enemy && enemy.draw();
    player && player.draw();
    for (const p of particles) p && p.draw();
  } finally {
    ctx.restore();
  }
}

let lastTime = performance.now();
function loop(now) {
  try {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    update(dt);
    draw();
  } catch (err) {
    console.error('Game loop error:', err);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

console.log('Game started. Particles:', particles.length, 'Fireballs:', fireballs.length, 'Enemies:', enemies.length);
setInterval(() => {
  console.log('Stats - Particles:', particles.length, 'Fireballs:', fireballs.length, 'Enemies:', enemies.length);
}, 5000);

class AudioController {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.bgmInterval = null;
    this.step = 0;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.25;
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.15;
      this.bgmGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.4;
      this.sfxGain.connect(this.masterGain);

      this.initialized = true;
      this.startBGM();
    } catch (e) {
      console.warn('Audio init failed:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  startBGM() {
    if (!this.initialized || this.bgmInterval) return;
    const bassline = [130.81, 164.81, 196.0, 130.81];
    const melody = [523.25, 659.25, 783.99, 659.25];
    let noteIndex = 0;
    this.bgmInterval = setInterval(() => {
      if (!this.initialized) return;
      const t = this.ctx.currentTime;
      const bass = bassline[noteIndex % bassline.length];
      const mel = melody[noteIndex % melody.length];

      this.playTone(bass, 'square', 0.12, this.bgmGain, t);
      if (noteIndex % 2 === 0) {
        this.playTone(mel, 'triangle', 0.08, this.bgmGain, t + 0.06);
      }
      noteIndex++;
    }, 220);
  }

  playTone(freq, type, duration, output, startTime) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.4, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(output);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  playNoise(duration, output, startTime) {
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    noise.buffer = buffer;
    gain.gain.setValueAtTime(0.35, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    noise.connect(gain);
    gain.connect(output);
    noise.start(startTime);
    noise.stop(startTime + duration);
  }

  playFireball() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    this.playTone(880, 'square', 0.08, this.sfxGain, t);
    this.playTone(440, 'sawtooth', 0.1, this.sfxGain, t + 0.04);
  }

  playExplosion() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    this.playNoise(0.12, this.sfxGain, t);
    this.playTone(120, 'sawtooth', 0.15, this.sfxGain, t);
  }

  playDeath() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    this.playTone(220, 'sawtooth', 0.25, this.sfxGain, t);
    this.playNoise(0.25, this.sfxGain, t);
    this.playTone(110, 'triangle', 0.3, this.sfxGain, t + 0.15);
  }

  playFanfare() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      this.playTone(freq, 'triangle', 0.12, this.sfxGain, t + i * 0.1);
    });
  }
}

const audio = new AudioController();
function ensureAudio() {
  audio.init();
  audio.resume();
}
