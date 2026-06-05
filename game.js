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
let currentRoomIndex = 0;
let roomSeed = 1;

function seededRandom(seed) {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function generateRoom(roomIndex) {
  const rand = seededRandom(roomIndex * 12345 + roomSeed++);
  const baseX = roomIndex * ROOM_WIDTH;

  platforms = [];
  decorations = [];

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
  keys[e.key.toLowerCase()] = true;
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w'].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }
});
window.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = WIDTH / rect.width;
  const scaleY = HEIGHT / rect.height;
  const mx = (e.clientX - rect.left) * scaleX + cameraX;
  const my = (e.clientY - rect.top) * scaleY;
  player.castFireball(mx, my);
});

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

    ctx.fillStyle = this.flash > 0 ? '#fff' : '#cc3333';
    ctx.fillRect(this.x - this.width / 2, this.y - this.height, this.width, this.height);

    if (!this.dying) {
      ctx.fillStyle = '#fff';
      const eyeOffX = this.vx > 0 ? 4 : -4;
      ctx.fillRect(this.x - 4 + eyeOffX, this.y - this.height + 5, 3, 3);
      ctx.fillRect(this.x + 1 + eyeOffX, this.y - this.height + 5, 3, 3);
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
    this.jumpHoldTime = 0;
    this.maxJumpHold = 0.25;
    this.coyoteTimer = 0;
    this.coyoteWindow = 0.12;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.invincibleDuration = 1.5;
    this.flashTimer = 0;
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
      this.jumpHoldTime = this.maxJumpHold;
    }

    if (jumpPressed && this.jumpHoldTime > 0) {
      this.jumpHoldTime -= dt;
      this.vy += 180 * dt;
    } else {
      this.jumpHoldTime = 0;
    }

    if (!jumpPressed) {
      this.jumpHoldTime = 0;
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
  }

  castFireball(tx, ty) {
    if (this.cooldown > 0) return;
    fireballs.push(new Fireball(this.x, this.y - this.height / 2, tx, ty));
    this.cooldown = 0.4;
  }

  draw() {
    if (this.invincible && Math.floor(this.flashTimer * 20) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    ctx.fillStyle = '#4488ff';
    ctx.fillRect(this.x - this.width / 2, this.y - this.height, this.width, this.height);

    ctx.fillStyle = '#2266cc';
    ctx.fillRect(this.x - this.width / 2, this.y - 4, this.width, 4);

    const eyeX = this.facing > 0 ? 4 : -8;
    ctx.fillStyle = '#fff';
    ctx.fillRect(this.x - 4 + eyeX, this.y - this.height + 6, 4, 4);

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
  }
}

function draw() {
  ctx.save();
  try {
    ctx.translate(-cameraX, 0);

    ctx.fillStyle = '#222222';
    ctx.fillRect(cameraX, 0, WIDTH, HEIGHT);

    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(cameraX, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);

    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cameraX, GROUND_Y);
    ctx.lineTo(cameraX + WIDTH, GROUND_Y);
    ctx.stroke();

    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    for (let i = 0; i <= WIDTH; i += 40) {
      ctx.beginPath();
      ctx.moveTo(cameraX + i, GROUND_Y);
      ctx.lineTo(cameraX + i, HEIGHT);
      ctx.stroke();
    }

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

    for (const fb of fireballs) fb.draw();
    for (const enemy of enemies) enemy.draw();
    player.draw();
    for (const p of particles) p.draw();
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
