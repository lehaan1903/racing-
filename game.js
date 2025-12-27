(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const speedEl = document.getElementById('speed');
  const overlayEl = document.getElementById('overlay');
  const overlayTitleEl = document.getElementById('overlayTitle');
  const overlayTextEl = document.getElementById('overlayText');
  const restartBtn = document.getElementById('restartBtn');
  const leftBtn = document.getElementById('leftBtn');
  const rightBtn = document.getElementById('rightBtn');

  const obstacleSprite = new Image();
  let obstacleSpriteReady = false;
  obstacleSprite.onload = () => {
    obstacleSpriteReady = true;
  };
  obstacleSprite.onerror = () => {
    obstacleSpriteReady = false;
  };
  obstacleSprite.src = 'obstacle.png';

  const playerSprite = new Image();
  let playerSpriteReady = false;
  playerSprite.onload = () => {
    playerSpriteReady = true;
  };
  playerSprite.onerror = () => {
    playerSpriteReady = false;
  };
  playerSprite.src = 'player.png';

  const W = canvas.width;
  const H = canvas.height;

  const state = {
    running: false,
    lastTs: 0,
    dt: 0,
    score: 0,
    spawnTimer: 0,
    spawnInterval: 0.95,
    speedScale: 1,
    obstacles: [],
    keys: {
      left: false,
      right: false,
    },
    player: {
      w: 46,
      h: 86,
      x: W / 2 - 46 / 2,
      y: H - 24 - 86,
      speed: 360,
    },
  };

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function rectsIntersect(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function setOverlayVisible(visible) {
    overlayEl.classList.toggle('show', visible);
    overlayEl.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }

  function reset() {
    state.running = true;
    state.lastTs = 0;
    state.dt = 0;
    state.score = 0;
    state.spawnTimer = 0;
    state.spawnInterval = 0.95;
    state.speedScale = 1;
    state.obstacles = [];

    state.player.x = W / 2 - state.player.w / 2;

    scoreEl.textContent = '0';
    speedEl.textContent = '1.0x';

    overlayTitleEl.textContent = 'Obstacle Racing';
    overlayTextEl.textContent = 'Nhấn Enter để bắt đầu';
    setOverlayVisible(false);
  }

  function gameOver() {
    state.running = false;
    overlayTitleEl.textContent = 'Game Over';
    overlayTextEl.textContent = `Score: ${state.score} — Nhấn Enter để chơi lại`;
    setOverlayVisible(true);
  }

  function difficultyFromScore(score) {
    const speedScale = 1 + Math.min(2.2, score / 30) * 0.55; // ~1.0 -> ~2.2
    const spawnInterval = Math.max(0.33, 0.95 - score * 0.01);
    return { speedScale, spawnInterval };
  }

  function drawLambo(p) {
    const x = p.x;
    const y = p.y;
    const w = p.w;
    const h = p.h;

    ctx.save();

    const bodyY = y + h * 0.18;
    const bodyH = h * 0.70;
    const r = Math.min(12, w * 0.22);

    ctx.fillStyle = '#f6c400';
    ctx.beginPath();
    ctx.moveTo(x + r, bodyY);
    ctx.lineTo(x + w * 0.72, bodyY);
    ctx.lineTo(x + w, bodyY + bodyH * 0.22);
    ctx.lineTo(x + w, bodyY + bodyH - r);
    ctx.quadraticCurveTo(x + w, bodyY + bodyH, x + w - r, bodyY + bodyH);
    ctx.lineTo(x + r, bodyY + bodyH);
    ctx.quadraticCurveTo(x, bodyY + bodyH, x, bodyY + bodyH - r);
    ctx.lineTo(x, bodyY + r);
    ctx.quadraticCurveTo(x, bodyY, x + r, bodyY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.10, bodyY + bodyH * 0.12);
    ctx.lineTo(x + w * 0.70, bodyY + bodyH * 0.12);
    ctx.lineTo(x + w * 0.92, bodyY + bodyH * 0.30);
    ctx.lineTo(x + w * 0.92, bodyY + bodyH * 0.40);
    ctx.lineTo(x + w * 0.10, bodyY + bodyH * 0.40);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.16, bodyY + bodyH * 0.16);
    ctx.lineTo(x + w * 0.62, bodyY + bodyH * 0.16);
    ctx.lineTo(x + w * 0.78, bodyY + bodyH * 0.28);
    ctx.lineTo(x + w * 0.16, bodyY + bodyH * 0.28);
    ctx.closePath();
    ctx.fill();

    const wheelW = w * 0.22;
    const wheelH = h * 0.11;
    const wheelY1 = y + h * 0.10;
    const wheelY2 = y + h * 0.80;

    ctx.fillStyle = '#0b0f1f';
    ctx.fillRect(x + w * 0.10, wheelY1, wheelW, wheelH);
    ctx.fillRect(x + w * 0.68, wheelY1, wheelW, wheelH);
    ctx.fillRect(x + w * 0.10, wheelY2, wheelW, wheelH);
    ctx.fillRect(x + w * 0.68, wheelY2, wheelW, wheelH);

    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.10, y + h * 0.52);
    ctx.lineTo(x + w * 0.92, y + h * 0.52);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    ctx.restore();
  }

  function drawPlayerSpriteCover(p) {
    if (!playerSpriteReady) {
      drawLambo(p);
      return;
    }

    const dx = p.x;
    const dy = p.y;
    const dw = p.w;
    const dh = p.h;

    const sw = playerSprite.naturalWidth || playerSprite.width;
    const sh = playerSprite.naturalHeight || playerSprite.height;

    if (!sw || !sh) {
      drawLambo(p);
      return;
    }

    const scale = Math.max(dw / sw, dh / sh);
    const cropW = dw / scale;
    const cropH = dh / scale;
    const sx = (sw - cropW) / 2;
    const sy = (sh - cropH) / 2;

    ctx.save();
    ctx.drawImage(playerSprite, sx, sy, cropW, cropH, dx, dy, dw, dh);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    ctx.strokeRect(dx + 1, dy + 1, dw - 2, dh - 2);
    ctx.restore();
  }

  function spawnObstacle() {
    const minW = 26;
    const maxW = 70;
    const w = minW + Math.random() * (maxW - minW);

    const minH = 32;
    const maxH = 90;
    const h = minH + Math.random() * (maxH - minH);

    const margin = 16;
    const x = margin + Math.random() * (W - margin * 2 - w);
    const y = -h - 10;

    const baseSpeed = 220;
    const speed = baseSpeed + Math.random() * 120;

    state.obstacles.push({ x, y, w, h, speed });
  }

  function update(dt) {
    const diff = difficultyFromScore(state.score);
    state.speedScale = diff.speedScale;
    state.spawnInterval = diff.spawnInterval;

    const player = state.player;

    const dir = (state.keys.right ? 1 : 0) - (state.keys.left ? 1 : 0);
    player.x += dir * player.speed * dt;
    player.x = clamp(player.x, 12, W - 12 - player.w);

    state.spawnTimer += dt;
    if (state.spawnTimer >= state.spawnInterval) {
      state.spawnTimer = 0;
      spawnObstacle();
    }

    for (let i = 0; i < state.obstacles.length; i++) {
      const o = state.obstacles[i];
      o.y += o.speed * state.speedScale * dt;

      if (o.y > H + 20) {
        state.obstacles.splice(i, 1);
        i--;
        state.score += 1;
        continue;
      }

      if (rectsIntersect(player, o)) {
        gameOver();
        return;
      }
    }

    scoreEl.textContent = String(state.score);
    speedEl.textContent = `${state.speedScale.toFixed(1)}x`;
  }

  function drawRoad() {
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(12, 12, W - 24, H - 24);

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, W - 24, H - 24);

    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 18]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 18);
    ctx.lineTo(W / 2, H - 18);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function draw() {
    drawRoad();

    for (const o of state.obstacles) {
      if (obstacleSpriteReady) {
        ctx.drawImage(obstacleSprite, o.x, o.y, o.w, o.h);
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 2;
        ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);
      } else {
        ctx.fillStyle = '#ff3b3b';
        ctx.fillRect(o.x, o.y, o.w, o.h);

        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 2;
        ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);
      }
    }

    const p = state.player;
    drawPlayerSpriteCover(p);
  }

  function tick(ts) {
    if (!state.running) {
      draw();
      return;
    }

    if (!state.lastTs) state.lastTs = ts;
    const dt = Math.min(0.033, (ts - state.lastTs) / 1000);
    state.lastTs = ts;

    update(dt);
    draw();

    requestAnimationFrame(tick);
  }

  function start() {
    reset();
    setOverlayVisible(true);
    overlayTitleEl.textContent = 'Obstacle Racing';
    overlayTextEl.textContent = 'Nhấn Enter để bắt đầu';
  }

  function restart() {
    setOverlayVisible(false);
    state.running = true;
    state.lastTs = 0;
    state.score = 0;
    state.obstacles = [];
    state.spawnTimer = 0;
    requestAnimationFrame(tick);
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.preventDefault();
    if (e.key === 'ArrowLeft') state.keys.left = true;
    if (e.key === 'ArrowRight') state.keys.right = true;

    if (e.key === 'Enter') {
      if (!state.running) {
        restart();
      } else if (overlayEl.classList.contains('show')) {
        restart();
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') state.keys.left = false;
    if (e.key === 'ArrowRight') state.keys.right = false;
  });

  restartBtn.addEventListener('click', () => {
    restart();
  });

  function setDir(left, right) {
    state.keys.left = left;
    state.keys.right = right;
  }

  function bindHoldButton(el, onPress, onRelease) {
    if (!el) return;
    const press = (e) => {
      if (e && e.cancelable) e.preventDefault();
      onPress();
    };
    const release = (e) => {
      if (e && e.cancelable) e.preventDefault();
      onRelease();
    };

    el.addEventListener('pointerdown', press, { passive: false });
    el.addEventListener('pointerup', release, { passive: false });
    el.addEventListener('pointercancel', release, { passive: false });
    el.addEventListener('pointerleave', release, { passive: false });
  }

  bindHoldButton(
    leftBtn,
    () => setDir(true, false),
    () => setDir(false, false),
  );
  bindHoldButton(
    rightBtn,
    () => setDir(false, true),
    () => setDir(false, false),
  );

  function canvasDirFromPointer(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    return x < rect.width / 2 ? 'left' : 'right';
  }

  canvas.addEventListener(
    'pointerdown',
    (e) => {
      if (e.cancelable) e.preventDefault();
      const dir = canvasDirFromPointer(e);
      if (dir === 'left') setDir(true, false);
      else setDir(false, true);
    },
    { passive: false },
  );
  canvas.addEventListener(
    'pointerup',
    (e) => {
      if (e.cancelable) e.preventDefault();
      setDir(false, false);
    },
    { passive: false },
  );
  canvas.addEventListener(
    'pointercancel',
    (e) => {
      if (e.cancelable) e.preventDefault();
      setDir(false, false);
    },
    { passive: false },
  );
  canvas.addEventListener(
    'pointerleave',
    (e) => {
      if (e.cancelable) e.preventDefault();
      setDir(false, false);
    },
    { passive: false },
  );

  start();
})();
