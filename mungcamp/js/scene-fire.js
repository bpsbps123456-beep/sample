/* 멍캠프 — 불멍: 별 아래 벨텐트와 모닥불 */
(function (MC) {
  'use strict';

  // 불꽃의 온도 색: 뿌리의 흰빛 → 노랑 → 주황 → 붉은 끝
  const RAMP = [
    [0.0, [255, 244, 210]],
    [0.16, [255, 210, 120]],
    [0.38, [255, 148, 52]],
    [0.62, [232, 84, 26]],
    [0.84, [150, 38, 14]],
    [1.0, [70, 16, 8]],
  ];
  function ramp(f) {
    for (let i = 1; i < RAMP.length; i++) {
      if (f <= RAMP[i][0]) {
        const a = RAMP[i - 1];
        const b = RAMP[i];
        return MC.mix(a[1], b[1], (f - a[0]) / (b[0] - a[0]));
      }
    }
    return RAMP[RAMP.length - 1][1];
  }

  const STEPS = 24;
  let SPR = null;
  function sprites() {
    if (SPR) return SPR;
    SPR = {
      flame: [],
      spark: MC.glow([255, 190, 110], 24, 0.2),
      text: MC.glow([255, 170, 80], 24, 0.3),
      coal: MC.glow([255, 110, 36], 128, 0.3),
      hot: MC.glow([255, 228, 170], 128, 0.25),
      warm: MC.glow([255, 132, 60], 256, 0.15),
      bulb: MC.glow([255, 212, 150], 48, 0.16),
      smoke: MC.glow([110, 108, 120], 64, 0.3),
      star: MC.glow([226, 232, 255], 16, 0.22),
    };
    for (let i = 0; i < STEPS; i++) SPR.flame.push(MC.glow(ramp(i / (STEPS - 1)), 64, 0.38));
    return SPR;
  }

  // ── 장작 그림 ──────────────────────────────────────────
  const LOG_L = 240;
  const LOG_R = 20;
  const PAD = 4;
  const LOG_SCALE = 0.62; // 장면 단위 1에서 장작이 그려지는 배율

  function logShape(g) {
    MC.roundRect(g, PAD, PAD, LOG_L, LOG_R * 2, LOG_R);
  }

  function makeLog(kind, rnd, clean) {
    const c = MC.canvas(LOG_L + PAD * 2, LOG_R * 2 + PAD * 2);
    const g = c.getContext('2d');
    const birch = kind === 'birch';
    const body = g.createLinearGradient(0, PAD, 0, PAD + LOG_R * 2);
    if (birch) {
      body.addColorStop(0, '#f3ecda');
      body.addColorStop(0.45, '#dcd3be');
      body.addColorStop(1, '#8c8373');
    } else {
      body.addColorStop(0, '#6e4c34');
      body.addColorStop(0.45, '#4a3020');
      body.addColorStop(1, '#20140c');
    }
    g.fillStyle = body;
    logShape(g);
    g.fill();
    g.save();
    logShape(g);
    g.clip();
    if (birch) {
      // 자작나무 껍질의 가로 무늬(피목)
      g.fillStyle = 'rgba(46,38,32,0.75)';
      for (let i = 0; i < 26; i++) {
        // 글씨를 쓸 장작은 가운데 띠를 비워 둔다
        const y = clean ? (rnd() < 0.5 ? rnd() * LOG_R * 0.45 : LOG_R * 1.6 + rnd() * LOG_R * 0.4) : rnd() * LOG_R * 2;
        g.fillRect(PAD + rnd() * LOG_L, PAD + y, 5 + rnd() * 16, 1 + rnd() * 1.6);
      }
    } else {
      // 껍질의 세로 골: 어두운 틈과 그 위의 밝은 능선
      for (let i = 0; i < 52; i++) {
        const x0 = PAD + rnd() * LOG_L;
        const len = 12 + rnd() * 38;
        const y = PAD + 2 + rnd() * (LOG_R * 2 - 4);
        const slope = (rnd() - 0.5) * 3;
        g.strokeStyle = `rgba(12,7,3,${0.35 + rnd() * 0.35})`;
        g.lineWidth = 0.8 + rnd() * 1.5;
        g.beginPath();
        g.moveTo(x0, y);
        g.quadraticCurveTo(x0 + len / 2, y + slope + (rnd() - 0.5) * 2, x0 + len, y + slope * 2);
        g.stroke();
        g.strokeStyle = `rgba(160,118,84,${0.1 + rnd() * 0.16})`;
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(x0, y - 1.4);
        g.quadraticCurveTo(x0 + len / 2, y - 1.4 + slope, x0 + len, y - 1.4 + slope * 2);
        g.stroke();
      }
      // 옹이
      for (let i = 0; i < 2; i++) {
        const kx = PAD + 40 + rnd() * (LOG_L - 110);
        const ky = PAD + 9 + rnd() * (LOG_R * 2 - 18);
        g.fillStyle = 'rgba(26,15,8,0.75)';
        g.beginPath();
        g.ellipse(kx, ky, 5, 3.2, 0, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = 'rgba(130,92,60,0.5)';
        g.lineWidth = 0.9;
        g.beginPath();
        g.ellipse(kx, ky, 8, 4.8, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }
    g.restore();
    // 잘린 단면: 껍질 테두리, 나이테, 마르며 갈라진 틈
    const ex = PAD + LOG_L - LOG_R * 0.55;
    const ey = PAD + LOG_R;
    g.fillStyle = birch ? '#efe7d4' : '#2e1d12';
    g.beginPath();
    g.ellipse(ex, ey, LOG_R * 0.6, LOG_R * 0.99, 0, 0, Math.PI * 2);
    g.fill();
    const face = g.createRadialGradient(ex - 2, ey - 4, 1, ex, ey, LOG_R * 0.9);
    face.addColorStop(0, birch ? '#f6e3b8' : '#d7a873');
    face.addColorStop(1, birch ? '#dcbf8a' : '#9c6b3e');
    g.fillStyle = face;
    g.beginPath();
    g.ellipse(ex, ey, LOG_R * 0.5, LOG_R * 0.87, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = birch ? 'rgba(150,110,60,0.42)' : 'rgba(96,58,28,0.55)';
    g.lineWidth = 0.9;
    for (let k = 1; k <= 5; k++) {
      const j = 1 + (rnd() - 0.5) * 0.08;
      g.beginPath();
      g.ellipse(ex + (rnd() - 0.5) * 0.8, ey, ((LOG_R * 0.5 * k) / 6) * j, ((LOG_R * 0.87 * k) / 6) / j, 0, 0, Math.PI * 2);
      g.stroke();
    }
    g.strokeStyle = birch ? 'rgba(120,80,40,0.45)' : 'rgba(50,28,12,0.65)';
    g.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const a = rnd() * Math.PI * 2;
      g.beginPath();
      g.moveTo(ex, ey);
      g.lineTo(ex + Math.cos(a) * LOG_R * 0.45, ey + Math.sin(a) * LOG_R * 0.8);
      g.stroke();
    }
    return c;
  }

  // 숯이 된 장작: 거북등처럼 갈라진 표면과 하얀 재, 그리고 같은 틈에서 빛나는 불씨
  function makeCharSet(rnd) {
    const W = LOG_L + PAD * 2;
    const H = LOG_R * 2 + PAD * 2;
    const cracks = [];
    // 결을 따라 길게 갈라진 틈 (중간중간 끊긴다)
    for (let i = 0; i < 2; i++) {
      let y = PAD + 8 + rnd() * (LOG_R * 2 - 16);
      let x = PAD + rnd() * 30;
      while (x < PAD + LOG_L - 10) {
        const pts = [];
        const len = 30 + rnd() * 70;
        for (let u = 0; u <= len; u += 7 + rnd() * 6) {
          y += (rnd() - 0.5) * 3;
          pts.push([x + u, y]);
        }
        cracks.push(pts);
        x += len + 10 + rnd() * 30;
      }
    }
    // 결을 가로지르는 짧은 틈: 굵기의 일부만 갈라진다
    for (let i = 0; i < 13; i++) {
      const x = PAD + 10 + rnd() * (LOG_L - 30);
      const y0 = PAD + rnd() * LOG_R * 0.9;
      const y1 = y0 + LOG_R * (0.5 + rnd() * 0.9);
      const pts = [];
      let cx = x;
      for (let y = y0; y <= y1; y += 4 + rnd() * 4) {
        cx += (rnd() - 0.5) * 3.5 + 0.6;
        pts.push([cx, y]);
      }
      cracks.push(pts);
    }
    const line = (g, pts) => {
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (const [x, y] of pts) g.lineTo(x, y);
      g.stroke();
    };

    const char = MC.canvas(W, H);
    const g = char.getContext('2d');
    const body = g.createLinearGradient(0, PAD, 0, PAD + LOG_R * 2);
    body.addColorStop(0, '#2a1d17');
    body.addColorStop(0.5, '#140b07');
    body.addColorStop(1, '#070302');
    g.fillStyle = body;
    logShape(g);
    g.fill();
    g.save();
    logShape(g);
    g.clip();
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(0,0,0,0.75)';
    g.lineWidth = 1.6;
    for (const pts of cracks) line(g, pts);
    // 하얀 재
    for (let i = 0; i < 24; i++) {
      g.fillStyle = `rgba(${170 + rnd() * 40},${165 + rnd() * 40},${160 + rnd() * 40},${0.12 + rnd() * 0.22})`;
      g.beginPath();
      g.ellipse(PAD + rnd() * LOG_L, PAD + rnd() * LOG_R * 1.2, 3 + rnd() * 9, 1.5 + rnd() * 3, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();

    const glow = MC.canvas(W, H);
    const k = glow.getContext('2d');
    k.save();
    logShape(k);
    k.clip();
    k.lineCap = 'round';
    k.lineJoin = 'round';
    // 균열의 일부 구간에서만 불씨가 빛난다
    const lit = [];
    for (const pts of cracks) {
      for (let i = 1; i < pts.length; i++) if (rnd() < 0.5) lit.push([pts[i - 1], pts[i]]);
    }
    for (const [lw, col] of [[5, 'rgba(255,70,10,0.28)'], [2.2, 'rgba(255,118,34,0.8)'], [0.9, 'rgba(255,205,120,1)']]) {
      k.strokeStyle = col;
      k.lineWidth = lw;
      for (const seg of lit) line(k, seg);
    }
    k.restore();
    return { char, cracks: glow };
  }

  // 걱정을 적은 자작나무 장작. 글자 픽셀 위치는 불티로 바뀔 자리다
  function makeWorryLog(text, rnd) {
    const plain = makeLog('birch', rnd, true);
    const c = MC.canvas(plain.width, plain.height);
    const g = c.getContext('2d');
    g.drawImage(plain, 0, 0);
    const ink = MC.canvas(plain.width, plain.height);
    const t = ink.getContext('2d');
    const maxW = LOG_L - LOG_R * 2.2;
    let size = 34;
    const font = (px) => `${px}px "Gamja Flower", "Dongle", cursive`;
    t.font = font(size);
    while (t.measureText(text).width > maxW && size > 18) {
      size -= 2;
      t.font = font(size);
    }
    let shown = text;
    while (t.measureText(shown).width > maxW && shown.length > 1) shown = shown.slice(0, -2) + '…';
    t.textAlign = 'center';
    t.textBaseline = 'middle';
    t.fillStyle = 'rgba(40,30,24,0.92)';
    t.fillText(shown, PAD + (LOG_L - LOG_R) / 2, PAD + LOG_R + 2);
    g.drawImage(ink, 0, 0);

    const pts = [];
    try {
      const data = t.getImageData(0, 0, ink.width, ink.height).data;
      for (let y = 0; y < ink.height; y += 2) {
        for (let x = 0; x < ink.width; x += 2) {
          if (data[(y * ink.width + x) * 4 + 3] > 110) pts.push(x, y);
        }
      }
    } catch (e) { /* 읽을 수 없으면 글자 불티 없이 탄다 */ }
    return { sprite: c, plain, pts };
  }

  // ── 장면 ───────────────────────────────────────────────
  class FireScene {
    constructor(opts = {}) {
      this.preview = !!opts.preview;
      this.focusX = opts.focusX || 0.5;
      this.calm = !!opts.calm;
      this.quality = 1;
      this.t = 0;
      this.w = 1;
      this.h = 1;
      this.flare = 0;
      this.E = 0.7;
      this.flames = [];
      this.sparks = [];
      this.smoke = [];
      this.embers = [];
      this.flying = [];
      this.logs = [];
      this.acc = { flame: 0, spark: 0, smoke: 0 };
      this.events = null; // 소리 쪽에서 '탁' 하고 튄 순간을 알려주는 함수
      this.onLand = null;
      this.onWorryBurned = null;
      this.worry = null;
      this.nextShoot = MC.rand(20, 45);
      this.shoot = null;
      this.rnd = MC.rng(20261030);
      sprites();
      const rnd = this.rnd;
      this.logSprites = {
        oak: [makeLog('oak', rnd), makeLog('oak', rnd)],
        birch: [makeLog('birch', rnd)],
      };
      const c1 = makeCharSet(rnd);
      const c2 = makeCharSet(rnd);
      this.charSprites = [c1.char, c2.char];
      this.crackSprites = [c1.cracks, c2.cracks];
      this.seed = Math.random() * 50;
      this.useGL = null;
      this.comfortAt = 0;
      this.onCute = null;
      // 숯불 덩어리: 하나하나 숨쉬듯 달아올랐다 식는다
      this.coals = [];
      for (let i = 0; i < 36; i++) {
        const a = rnd() * Math.PI * 2;
        const r = Math.sqrt(rnd());
        const pts = [];
        for (let k = 0; k < 6; k++) pts.push(0.68 + rnd() * 0.45);
        this.coals.push({ x: Math.cos(a) * r * 82, y: 7 + Math.sin(a) * r * 13, r: 4 + rnd() * 6.5, pts, rot: rnd() * 6.28, seed: rnd() * 40, hot: 0.35 + rnd() * 0.65 });
      }
      this.coals.sort((p, q) => p.y - q.y);
      // 멍이: 비니를 쓰고 마시멜로를 굽는다
      this.pup = new MC.Pup({
        outfit: 'beanie',
        stick: true,
        turn: 0.42,
        light: { ambient: 'rgba(16,14,38,0.3)', glow: [255, 150, 72], glowA: 0.4, from: 70 },
      });
      this.pup.onEvent = (kind) => { if (this.onCute) this.onCute(kind); };
      // 처음 놓인 장작: 원뿔(티피) 모양으로 기대 세움
      const teepee = [
        [-104, 6, 12, -80],
        [104, 6, -12, -80],
        [-62, 16, 26, -70],
        [66, 14, -24, -72],
      ];
      for (const [x0, y0, x1, y1] of teepee) {
        this.logs.push(this.leaning('oak', x0, y0, x1, y1, y0 > 10, 17, 0.3));
      }
      this.stones = [];
      for (let i = 0; i < 15; i++) {
        const a = (i / 15) * Math.PI * 2 + rnd() * 0.2;
        const pts = [];
        for (let k = 0; k < 9; k++) pts.push(0.78 + rnd() * 0.3);
        this.stones.push({
          x: Math.cos(a) * 126,
          y: 16 + Math.sin(a) * 24,
          rx: 13 + rnd() * 8,
          ry: 9 + rnd() * 4,
          rot: (rnd() - 0.5) * 0.5,
          shade: 26 + ((rnd() * 14) | 0),
          pts,
          front: Math.sin(a) > 0,
        });
      }
      this.stones.sort((a, b) => a.y - b.y);
      this.twinkles = [];
    }

    leaning(kind, x0, y0, x1, y1, front, fuel, burnt) {
      return {
        kind,
        x: (x0 + x1) / 2,
        y: (y0 + y1) / 2,
        a: Math.atan2(y1 - y0, x1 - x0),
        front,
        fuel,
        fuel0: fuel / (1 - burnt),
        v: (this.rnd() * 2) | 0,
        seed: this.rnd() * 50,
        sprite: null,
      };
    }

    totalFuel() {
      let f = 0;
      for (const l of this.logs) f += l.fuel;
      return f;
    }

    intensity() {
      return 0.08 + 0.92 * MC.smooth(0, 55, this.totalFuel());
    }

    audioParams() {
      return { intensity: this.E };
    }

    status() {
      return { fuel: this.totalFuel(), waiting: !!(this.worry && this.worry.phase !== 'fly') };
    }

    // ── 크기와 배경 ───────────────────────────────────────
    resize(w, h, dpr) {
      this.w = w;
      this.h = h;
      this.dpr = dpr;
      this.portrait = w < h * 0.9;
      const s = (this.s = MC.clamp(Math.min(w / 520, h / 800), 0.55, 1.35));
      this.cx = w * (this.portrait ? 0.5 : this.focusX);
      this.by = h * 0.8;
      this.ground = h * 0.62;
      if (this.portrait) {
        this.tent = { x: w * 0.82, y: this.ground + (this.by - this.ground) * 0.3, k: s * 0.62 };
      } else {
        const off = MC.clamp(w * 0.3, 260 * s, 420 * s);
        const room = w - this.cx - 150 * s * 0.8;
        const dx = room >= off ? off : room >= 240 * s ? room : -off;
        this.tent = { x: this.cx + dx, y: this.ground + (this.by - this.ground) * 0.25, k: s * 0.8 };
      }
      this.buildBackground();
      this.buildTent();
      this.buildLights();
      const pup = this.pup;
      pup.k = s * 1.2;
      pup.x = this.cx - (this.portrait ? 158 : 196) * s;
      pup.y = this.by + 47 * s;
      pup.stickTip = { x: this.cx - 62 * s, y: this.by - 60 * s };
    }

    buildBackground() {
      const { w, h, dpr } = this;
      const rnd = MC.rng(4242);
      const c = (this.bg = MC.canvas(w * dpr, h * dpr));
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      const sky = g.createLinearGradient(0, 0, 0, this.ground);
      sky.addColorStop(0, '#04060e');
      sky.addColorStop(0.5, '#0a0f23');
      sky.addColorStop(0.85, '#16162d');
      sky.addColorStop(1, '#24192a');
      g.fillStyle = sky;
      g.fillRect(0, 0, w, this.ground + 2);

      // 은하수: 대각선 띠를 따라 별이 몰린다
      const ax = w * 0.05, ay = h * 0.02, bx = w * 0.95, by = this.ground * 0.75;
      const len = Math.hypot(bx - ax, by - ay);
      const nx = -(by - ay) / len, ny = (bx - ax) / len;
      g.globalCompositeOperation = 'lighter';
      const haze = MC.glow([90, 90, 150], 128, 0.2);
      for (let i = 0; i < 14; i++) {
        const t = rnd();
        const off = MC.gauss() * len * 0.03;
        const r = len * (0.06 + rnd() * 0.07);
        g.globalAlpha = 0.07;
        g.drawImage(haze, ax + (bx - ax) * t + nx * off - r, ay + (by - ay) * t + ny * off - r * 0.6, r * 2, r * 1.2);
      }
      g.globalAlpha = 1;
      const stars = Math.round((w * this.ground) / 1700);
      for (let i = 0; i < stars; i++) {
        let x, y;
        if (i % 2) {
          const t = rnd();
          const off = MC.gauss() * len * 0.045;
          x = ax + (bx - ax) * t + nx * off;
          y = ay + (by - ay) * t + ny * off;
        } else {
          x = rnd() * w;
          y = rnd() * this.ground * 0.92;
        }
        const r = 0.25 + Math.pow(rnd(), 3) * 1.1;
        g.fillStyle = `rgba(220,228,255,${0.25 + rnd() * 0.6})`;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalCompositeOperation = 'source-over';

      // 반짝이는 큰 별은 매 프레임 따로 그린다
      this.twinkles = [];
      for (let i = 0; i < 46; i++) {
        this.twinkles.push({ x: rnd() * w, y: rnd() * this.ground * 0.85, r: 0.9 + rnd() * 1.3, ph: rnd() * 6.28, sp: 0.4 + rnd() * 1.4 });
      }

      // 먼 산 두 겹
      const ridge = (base, amp, color, seed) => {
        const p1 = seed, p2 = seed * 2.3, p3 = seed * 0.7;
        g.fillStyle = color;
        g.beginPath();
        g.moveTo(0, this.ground + 2);
        for (let x = 0; x <= w + 10; x += 8) {
          const u = x / Math.max(w, 600);
          const y = base - amp * (0.55 + 0.25 * Math.sin(u * 5.1 + p1) + 0.15 * Math.sin(u * 13.7 + p2) + 0.06 * Math.sin(u * 31 + p3));
          g.lineTo(x, y);
        }
        g.lineTo(w, this.ground + 2);
        g.closePath();
        g.fill();
      };
      ridge(this.ground, 70 * this.s, '#0d1124', 1.3);
      ridge(this.ground, 38 * this.s, '#090c19', 4.1);

      // 지평선의 소나무 실루엣 (가운데는 비워 둔다)
      g.fillStyle = '#06080f';
      const pine = (x, hgt) => {
        const tiers = 6;
        g.fillRect(x - hgt * 0.02, this.ground - hgt * 0.15, hgt * 0.04, hgt * 0.17);
        for (let i = 0; i < tiers; i++) {
          const y0 = this.ground - hgt * 0.1 - (i * hgt * 0.85) / tiers;
          const half = hgt * 0.26 * (1 - i / tiers);
          g.beginPath();
          g.moveTo(x - half, y0);
          g.lineTo(x, y0 - hgt * 0.26);
          g.lineTo(x + half, y0);
          g.closePath();
          g.fill();
        }
      };
      const nPines = Math.round(w / 55);
      for (let i = 0; i < nPines; i++) {
        const x = rnd() * w;
        if (Math.abs(x - this.cx) < w * 0.2) continue;
        pine(x, (50 + rnd() * 70) * this.s);
      }

      const ground = g.createLinearGradient(0, this.ground, 0, h);
      ground.addColorStop(0, '#0b0a12');
      ground.addColorStop(1, '#050408');
      g.fillStyle = ground;
      g.fillRect(0, this.ground, w, h - this.ground);
      // 풀 그림자
      g.strokeStyle = 'rgba(0,0,0,0.5)';
      g.lineWidth = 1;
      for (let i = 0; i < w / 6; i++) {
        const x = rnd() * w;
        const y = this.ground + rnd() * (h - this.ground);
        const l = (4 + rnd() * 10) * this.s;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (rnd() - 0.5) * 4, y - l);
        g.stroke();
      }

      // 가장자리를 어둡게 해 시선을 가운데 불로 모은다
      const v = (this.vignette = MC.canvas(w * dpr, h * dpr));
      const vg = v.getContext('2d');
      vg.scale(dpr, dpr);
      const rad = vg.createRadialGradient(this.cx, this.by - h * 0.15, Math.min(w, h) * 0.25, this.cx, this.by - h * 0.15, Math.max(w, h) * 0.85);
      rad.addColorStop(0, 'rgba(0,0,0,0)');
      rad.addColorStop(1, 'rgba(0,0,0,0.6)');
      vg.fillStyle = rad;
      vg.fillRect(0, 0, w, h);
    }

    tentPath(g) {
      g.beginPath();
      g.moveTo(-132, 0);
      g.lineTo(-120, -105);
      g.quadraticCurveTo(-62, -168, -6, -246);
      g.lineTo(6, -246);
      g.quadraticCurveTo(62, -168, 120, -105);
      g.lineTo(132, 0);
      g.closePath();
    }

    buildTent() {
      const k = this.tent.k * this.dpr;
      const W = 340, H = 290;
      const make = () => {
        const c = MC.canvas(W * k, H * k);
        const g = c.getContext('2d');
        g.scale(k, k);
        g.translate(W / 2, H - 16);
        return [c, g];
      };
      const [c, g] = make();
      // 바닥 그림자
      g.fillStyle = 'rgba(0,0,0,0.55)';
      g.beginPath();
      g.ellipse(0, 2, 160, 12, 0, 0, Math.PI * 2);
      g.fill();
      // 안쪽 랜턴 빛을 머금은 캔버스 천
      this.tentPath(g);
      const fabric = g.createRadialGradient(0, -48, 10, 0, -80, 220);
      fabric.addColorStop(0, '#f6c98e');
      fabric.addColorStop(0.45, '#b77b4c');
      fabric.addColorStop(1, '#3d2a21');
      g.fillStyle = fabric;
      g.fill();
      // 솔기
      g.save();
      this.tentPath(g);
      g.clip();
      g.strokeStyle = 'rgba(60,36,22,0.35)';
      g.lineWidth = 1.5;
      for (const x of [-120, -80, -40, 40, 80, 120]) {
        g.beginPath();
        g.moveTo(0, -246);
        g.lineTo(x, -105);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(-120, -105);
      g.lineTo(120, -105);
      g.stroke();
      g.restore();
      // 걷어 올린 문 사이로 보이는 안쪽
      g.beginPath();
      g.moveTo(-38, 0);
      g.lineTo(0, -122);
      g.lineTo(38, 0);
      g.closePath();
      const inside = g.createLinearGradient(0, -122, 0, 0);
      inside.addColorStop(0, '#ffcf86');
      inside.addColorStop(1, '#ffe7b8');
      g.fillStyle = inside;
      g.fill();
      g.fillStyle = 'rgba(120,70,40,0.55)';
      g.beginPath();
      g.moveTo(-38, 0);
      g.lineTo(0, -122);
      g.lineTo(-24, -2);
      g.closePath();
      g.fill();
      g.beginPath();
      g.moveTo(38, 0);
      g.lineTo(0, -122);
      g.lineTo(24, -2);
      g.closePath();
      g.fill();
      // 꼭대기 기둥
      g.strokeStyle = '#2a1d16';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(0, -246);
      g.lineTo(0, -262);
      g.stroke();
      // 고정 끈
      g.strokeStyle = 'rgba(220,196,160,0.28)';
      g.lineWidth = 1;
      for (const [x0, y0, x1] of [[-120, -105, -168], [120, -105, 168], [-70, -175, -160], [70, -175, 160]]) {
        g.beginPath();
        g.moveTo(x0, y0);
        g.lineTo(x1, 4);
        g.stroke();
      }
      this.tentImg = c;

      // 모닥불 쪽 천을 물들이는 빛
      const [rc, rg] = make();
      this.tentPath(rg);
      const toFire = this.cx < this.tent.x ? -1 : 1;
      const rim = rg.createLinearGradient(toFire * 140, 0, -toFire * 40, 0);
      rim.addColorStop(0, 'rgba(255,150,70,1)');
      rim.addColorStop(1, 'rgba(255,150,70,0)');
      rg.fillStyle = rim;
      rg.fill();
      this.tentRim = rc;
      this.tentSize = { W, H };
    }

    buildLights() {
      const s = this.s;
      const t = this.tent;
      const p0 = { x: t.x, y: t.y - 246 * t.k };
      const px = this.portrait ? this.w * 0.1 : this.cx - (t.x - this.cx);
      const p1 = { x: px, y: p0.y - 10 * s };
      const flameTop = this.by - 290 * s;
      let cy = Math.max(p0.y, p1.y) + 110 * s;
      cy = Math.min(cy, 2 * flameTop - 0.5 * (p0.y + p1.y));
      cy = Math.max(cy, Math.min(p0.y, p1.y) + 10 * s);
      const c = { x: (p0.x + p1.x) / 2, y: cy };
      const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      const n = Math.max(8, Math.round(dist / (34 * s)));
      this.bulbs = [];
      for (let i = 1; i < n; i++) {
        const u = i / n;
        const x = (1 - u) * (1 - u) * p0.x + 2 * (1 - u) * u * c.x + u * u * p1.x;
        const y = (1 - u) * (1 - u) * p0.y + 2 * (1 - u) * u * c.y + u * u * p1.y;
        this.bulbs.push({ x, y: y + 5 * s, ph: i * 1.7 });
      }
      this.wire = { p0, p1, c };
      this.pole = { x: px, top: p1.y, bottom: t.y + 8 * s };
    }

    // ── 장작 넣기 ─────────────────────────────────────────
    world(log) {
      return { x: this.cx + log.x * this.s, y: this.by + log.y * this.s };
    }

    addLog() {
      if (this.logs.length + this.flying.length >= 10) return false;
      const side = Math.random() < 0.5 ? -1 : 1;
      const target = this.leaning(
        Math.random() < 0.2 ? 'birch' : 'oak',
        side * MC.rand(60, 110), MC.rand(2, 16),
        -side * MC.rand(0, 28), MC.rand(-84, -62),
        Math.random() < 0.5, 20, 0
      );
      const to = this.world(target);
      this.flying.push({
        log: target,
        t: 0,
        dur: 0.95,
        from: { x: this.w + 80 * this.s, y: this.h * 0.95, a: -1.4, k: this.s * LOG_SCALE },
        to: { x: to.x, y: to.y, a: target.a, k: this.s * LOG_SCALE },
        arc: 120 * this.s,
      });
      return true;
    }

    burnWorry(text) {
      if (this.worry) return false;
      const made = makeWorryLog(text, this.rnd);
      const target = {
        kind: 'birch', x: MC.rand(-14, 14), y: 22, a: MC.rand(-0.06, 0.06), front: true,
        fuel: 18, fuel0: 18, v: 0, seed: Math.random() * 50, sprite: made.plain,
      };
      this.worry = {
        made, target, phase: 'hold', t: 0,
        x: this.cx, y: Math.min(this.h * 0.42, this.by - 300 * this.s), k: this.s * LOG_SCALE * 1.45,
      };
      return true;
    }

    hitWorry(x, y) {
      const wy = this.worry;
      if (!wy || wy.phase === 'fly') return false;
      const hw = ((LOG_L + PAD * 2) / 2) * wy.k + 24;
      const hh = ((LOG_R * 2 + PAD * 2) / 2) * wy.k + 30;
      return Math.abs(x - wy.x) < hw && Math.abs(y - wy.y) < hh;
    }

    pointerDown(x, y) {
      if (!this.worry && this.pup.hit(x, y)) {
        this.pup.poke();
        return true;
      }
      if (this.hitWorry(x, y)) {
        const wy = this.worry;
        wy.phase = 'drag';
        wy.grab = { dx: wy.x - x, dy: wy.y - y, y0: wy.y };
        return true;
      }
      // 불 가까이를 톡 건드리면 불티가 날린다
      if (Math.abs(x - this.cx) < 140 * this.s && y > this.by - 260 * this.s && y < this.by + 40 * this.s) {
        this.burst(0.9);
        if (this.onPoke) this.onPoke();
        return true;
      }
      return false;
    }

    pointerMove(x, y) {
      const wy = this.worry;
      if (!wy || wy.phase !== 'drag') return false;
      wy.x = x + wy.grab.dx;
      wy.y = y + wy.grab.dy;
      return true;
    }

    pointerUp() {
      const wy = this.worry;
      if (!wy || wy.phase !== 'drag') return false;
      // 불 쪽으로 끌어 내렸으면 놓는 순간 불 속으로 떨어진다
      if (wy.y > wy.grab.y0 + 40 * this.s || Math.hypot(wy.x - this.cx, wy.y - this.by) < 200 * this.s) this.throwWorry();
      else wy.phase = 'hold';
      return true;
    }

    throwWorry() {
      const wy = this.worry;
      if (!wy || wy.phase === 'fly') return false;
      const to = this.world(wy.target);
      wy.phase = 'fly';
      this.flying.push({
        log: wy.target,
        worry: wy,
        t: 0,
        dur: 0.9,
        from: { x: wy.x, y: wy.y, a: 0, k: wy.k },
        to: { x: to.x, y: to.y, a: wy.target.a, k: this.s * LOG_SCALE },
        arc: 50 * this.s,
      });
      return true;
    }

    land(f) {
      const log = f.log;
      if (!log.sprite) log.sprite = this.logSprites[log.kind][log.v % this.logSprites[log.kind].length];
      this.logs.push(log);
      this.flare = Math.min(1, this.flare + 0.8);
      this.burst(1.3);
      for (let i = 0; i < 18 * this.quality; i++) this.spawnSpark(1.6);
      if (this.onLand) this.onLand(!!f.worry);
      if (f.worry) {
        this.pup.watchUp(3.2);
        this.comfortAt = this.t + 3.4;
      } else {
        this.pup.cheer();
      }
      if (f.worry) {
        // 글자 하나하나가 불씨가 되었다가 불티로 날아오른다
        const pts = f.worry.made.pts;
        const sw = f.worry.made.sprite.width;
        const sh = f.worry.made.sprite.height;
        const k = f.to.k;
        const ca = Math.cos(f.to.a);
        const sa = Math.sin(f.to.a);
        const step = this.quality < 0.6 ? 4 : 2;
        for (let i = 0; i < pts.length; i += step) {
          const lx = (pts[i] - sw / 2) * k;
          const ly = (pts[i + 1] - sh / 2) * k;
          this.embers.push({
            x: f.to.x + lx * ca - ly * sa,
            y: f.to.y + lx * sa + ly * ca,
            vx: MC.gauss() * 8 * this.s,
            vy: -MC.rand(18, 55) * this.s,
            delay: 0.5 + (pts[i] / sw) * 1.4 + Math.random() * 0.35,
            f: 0,
            max: MC.rand(1.4, 2.8),
            seed: Math.random() * 50,
          });
        }
        this.worry = null;
        if (this.onWorryBurned) setTimeout(() => this.onWorryBurned(), 2600);
      }
    }

    // ── 입자 ─────────────────────────────────────────────
    spawnFlame(E) {
      const s = this.s;
      const half = 80 * s * (0.55 + 0.45 * Math.min(1, E));
      const dx = MC.clamp(MC.gauss() * 0.42, -1.2, 1.2) * half;
      const edge = Math.abs(dx) / half;
      this.flames.push({
        x: this.cx + dx,
        y: this.by - 14 * s + MC.rand(-6, 4) * s,
        vx: MC.gauss() * 12 * s,
        vy: -MC.rand(70, 150) * s * (0.55 + 0.5 * E),
        f: 0,
        max: MC.rand(0.6, 1.15) * (0.65 + 0.45 * E) * (1 - edge * 0.4),
        size: MC.rand(18, 34) * s * (0.7 + 0.45 * E),
        seed: Math.random() * 100,
        hot: MC.clamp(1 - edge / 1.2, 0, 1),
      });
    }

    spawnSpark(power) {
      const s = this.s;
      this.sparks.push({
        x: this.cx + MC.gauss() * 30 * s,
        y: this.by - MC.rand(20, 70) * s,
        vx: MC.gauss() * 30 * s * power,
        vy: -MC.rand(60, 160) * s * (0.6 + 0.4 * power),
        f: 0,
        max: MC.rand(1.2, 3.2),
        size: MC.rand(1, 2.4) * s + 0.6,
        seed: Math.random() * 100,
      });
    }

    burst(strength) {
      const n = Math.round((3 + 12 * strength) * this.quality);
      for (let i = 0; i < n; i++) this.spawnSpark(0.7 + strength);
      // 센 '탁'에는 불똥 몇 개가 포물선을 그리며 튀었다 떨어진다
      if (strength > 0.75) {
        const s = this.s;
        const m = 1 + ((Math.random() * 3) | 0);
        for (let i = 0; i < m; i++) {
          this.sparks.push({
            x: this.cx + MC.gauss() * 24 * s,
            y: this.by - MC.rand(25, 60) * s,
            vx: (Math.random() < 0.5 ? -1 : 1) * MC.rand(40, 130) * s,
            vy: -MC.rand(150, 260) * s,
            f: 0,
            max: MC.rand(0.7, 1.2),
            size: MC.rand(1.4, 2.4) * s + 0.6,
            seed: Math.random() * 100,
            fall: true,
          });
        }
      }
    }

    update(dt) {
      const s = this.s;
      this.t += dt;
      const t = this.t;

      // 장작은 넣은 순서대로 탄다. 다 탄 장작은 무너지고, 마지막 둘은 숯으로 남는다
      if (!this.preview) {
        const I0 = this.intensity();
        let size = 0;
        for (const l of this.logs) if (l.fuel > 0) size += l.fuel0;
        const burn = 0.2 * dt * (0.4 + 0.6 * I0);
        if (size > 0) for (const l of this.logs) if (l.fuel > 0) l.fuel = Math.max(0, l.fuel - burn * (l.fuel0 / size));
        for (let i = 0; i < this.logs.length && this.logs.length > 2; i++) {
          if (this.logs[i].fuel <= 0.2) {
            this.burst(0.6);
            this.logs.splice(i, 1);
            i--;
          }
        }
      }
      this.flare = Math.max(0, this.flare - dt * 0.18);
      const E = (this.E = Math.min(1.3, this.intensity() + this.flare * 0.45));
      const q = this.quality;
      if (this.useGL === null) this.useGL = !!(MC.FireGL && MC.FireGL.available());

      if (!this.useGL) {
        this.acc.flame += dt * (90 + 300 * E) * q;
        while (this.acc.flame >= 1) { this.acc.flame -= 1; this.spawnFlame(E); }
      }
      this.acc.spark += dt * (1.5 + 6 * E) * q;
      while (this.acc.spark >= 1) { this.acc.spark -= 1; this.spawnSpark(0.6); }
      this.acc.smoke += dt * 2.5 * (0.3 + E) * q;
      while (this.acc.smoke >= 1) {
        this.acc.smoke -= 1;
        this.smoke.push({
          x: this.cx + MC.gauss() * 18 * s,
          y: this.by - 170 * s * Math.min(1, E + 0.2),
          vx: MC.rand(2, 10) * s,
          vy: -MC.rand(16, 32) * s,
          f: 0,
          max: MC.rand(6, 9),
          size: 26 * s,
        });
      }

      // 소리에서 '탁' 튀는 순간에 맞춰 불티가 튄다. 소리가 없으면 스스로 튄다
      if (this.events) {
        for (const ev of this.events()) this.burst(ev.strength);
      } else if (Math.random() < dt * 1.3 * E) {
        this.burst(MC.rand(0.3, 1));
      }

      const cx = this.cx;
      for (let i = this.flames.length - 1; i >= 0; i--) {
        const p = this.flames[i];
        p.f += dt / p.max;
        if (p.f >= 1) {
          this.flames[i] = this.flames[this.flames.length - 1];
          this.flames.pop();
          continue;
        }
        const sway =
          MC.fbm(t * 2.3 + ((this.by - p.y) * 0.018) / s) * 48 * s +
          MC.fbm(t * 5.1 + p.seed) * 22 * s;
        p.vx += (sway - (p.x - cx) * (1.2 + 2.4 * p.f)) * dt;
        p.vx *= 1 - 1.5 * dt;
        p.vy -= 120 * s * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const p = this.sparks[i];
        p.f += dt / p.max;
        if (p.f >= 1) {
          this.sparks[i] = this.sparks[this.sparks.length - 1];
          this.sparks.pop();
          continue;
        }
        if (p.fall) {
          p.vy += 420 * s * dt;
          p.vx *= 1 - 0.4 * dt;
          if (p.y > this.by + 34 * s && p.vy > 0) p.f = Math.max(p.f, 0.92);
        } else {
          p.vx += MC.fbm(t * 3 + p.seed) * 40 * s * dt;
          p.vy -= 10 * s * dt;
          p.vx *= 1 - 0.6 * dt;
          p.vy *= 1 - 0.25 * dt;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      for (let i = this.smoke.length - 1; i >= 0; i--) {
        const p = this.smoke[i];
        p.f += dt / p.max;
        if (p.f >= 1) {
          this.smoke[i] = this.smoke[this.smoke.length - 1];
          this.smoke.pop();
          continue;
        }
        p.x += (p.vx + MC.fbm(t * 0.4 + p.max) * 6 * s) * dt;
        p.y += p.vy * dt;
      }
      for (let i = this.embers.length - 1; i >= 0; i--) {
        const p = this.embers[i];
        if (p.delay > 0) { p.delay -= dt; continue; }
        p.f += dt / p.max;
        if (p.f >= 1) {
          this.embers[i] = this.embers[this.embers.length - 1];
          this.embers.pop();
          continue;
        }
        p.vx += MC.fbm(t * 2 + p.seed) * 24 * s * dt;
        p.vy -= 22 * s * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }

      for (let i = this.flying.length - 1; i >= 0; i--) {
        const f = this.flying[i];
        f.t += dt / f.dur;
        if (f.t >= 1) {
          this.flying.splice(i, 1);
          this.land(f);
        }
      }
      if (this.worry && this.worry.phase !== 'fly') this.worry.t += dt;

      this.pup.update(dt, { E, cold: !this.preview && E < 0.22 });
      if (this.comfortAt && t >= this.comfortAt) {
        this.comfortAt = 0;
        this.pup.comfort();
      }

      if (!this.calm && !this.preview) {
        this.nextShoot -= dt;
        if (this.nextShoot <= 0) {
          this.nextShoot = MC.rand(70, 160);
          const dir = Math.random() < 0.5 ? -1 : 1;
          this.shoot = { x: MC.rand(0.2, 0.8) * this.w, y: MC.rand(0.05, 0.3) * this.ground, vx: dir * 780, vy: 300, t: 0, dur: 0.7 };
        }
      }
      if (this.shoot) {
        this.shoot.t += dt;
        if (this.shoot.t > this.shoot.dur) this.shoot = null;
      }
    }

    // ── 그리기 ───────────────────────────────────────────
    drawLog(g, sprite, x, y, a, k) {
      g.save();
      g.translate(x, y);
      g.rotate(a);
      if (Math.cos(a) < 0) g.scale(1, -1); // 밝은 껍질 면이 늘 위를 향하게
      g.scale(k, k);
      g.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
      g.restore();
    }

    drawPitLog(g, l) {
      const p = this.world(l);
      const k = this.s * LOG_SCALE;
      const sprite = l.sprite || (l.sprite = this.logSprites[l.kind][l.v % this.logSprites[l.kind].length]);
      this.drawLog(g, sprite, p.x, p.y, l.a, k);
      const char = MC.clamp(1 - l.fuel / l.fuel0, 0, 1);
      if (char > 0.02) {
        g.globalAlpha = Math.min(0.92, char * 1.1);
        this.drawLog(g, this.charSprites[l.v % 2], p.x, p.y, l.a, k);
        g.globalAlpha = 1;
      }
    }

    drawCracks(g, l, flick) {
      const char = MC.clamp(1 - l.fuel / l.fuel0, 0, 1);
      const glow = 0.8 * (0.25 + 0.75 * Math.min(1, this.E)) * MC.smooth(0.04, 0.4, char) * (0.8 + 0.2 * MC.fbm(this.t * 1.4 + l.seed)) * flick;
      if (glow < 0.02) return;
      const p = this.world(l);
      g.globalAlpha = Math.min(1, glow);
      this.drawLog(g, this.crackSprites[l.v % 2], p.x, p.y, l.a, this.s * LOG_SCALE);
      g.globalAlpha = 1;
    }

    drawStone(g, st, lit) {
      const s = this.s;
      const x = this.cx + st.x * s;
      const y = this.by + st.y * s;
      g.save();
      g.translate(x, y);
      g.rotate(st.rot);
      const rx = st.rx * s;
      const ry = st.ry * s;
      g.fillStyle = 'rgba(0,0,0,0.45)';
      g.beginPath();
      g.ellipse(0, ry * 0.55, rx * 1.05, ry * 0.5, 0, 0, Math.PI * 2);
      g.fill();
      const n = st.pts.length;
      g.beginPath();
      for (let k = 0; k <= n; k++) {
        const a = (k / n) * Math.PI * 2;
        const r = st.pts[k % n];
        const px = Math.cos(a) * rx * r;
        const py = Math.sin(a) * ry * r;
        if (k === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      const c = st.shade;
      const top = [c + 150 * lit, c + 70 * lit, c + 30 * lit].map(Math.round);
      const grd = g.createLinearGradient(0, -ry, 0, ry);
      grd.addColorStop(0, `rgb(${top[0]},${top[1]},${top[2]})`);
      grd.addColorStop(0.55, `rgb(${c},${c - 1},${c + 3})`);
      grd.addColorStop(1, `rgb(${(c * 0.45) | 0},${(c * 0.45) | 0},${(c * 0.5) | 0})`);
      g.fillStyle = grd;
      g.fill();
      g.restore();
    }

    // 숯불: 어두운 덩어리 속이 숨쉬듯 달아오른다
    drawCoals(g, E, flick) {
      const s = this.s;
      const S = SPR;
      const warm = Math.min(1, E + 0.15);
      for (const c of this.coals) {
        const heat = MC.clamp(c.hot * (0.3 + 0.7 * warm) * (0.72 + 0.28 * MC.fbm(this.t * 0.6 + c.seed)), 0, 1);
        const x = this.cx + c.x * s;
        const y = this.by + c.y * s;
        const r = c.r * s;
        g.beginPath();
        for (let k = 0; k <= c.pts.length; k++) {
          const a = c.rot + (k / c.pts.length) * Math.PI * 2;
          const rr = r * c.pts[k % c.pts.length];
          const px = x + Math.cos(a) * rr;
          const py = y + Math.sin(a) * rr * 0.62;
          if (k === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.closePath();
        const col = MC.mix([22, 11, 7], [210, 64, 14], heat * 0.85);
        const top = MC.mix(col, [255, 160, 64], heat * 0.4);
        const grd = g.createLinearGradient(x, y - r * 0.6, x, y + r * 0.6);
        grd.addColorStop(0, MC.rgba(top));
        grd.addColorStop(1, MC.rgba(MC.mix(col, [10, 5, 3], 0.5)));
        g.fillStyle = grd;
        g.fill();
      }
      g.globalCompositeOperation = 'lighter';
      for (const c of this.coals) {
        const heat = c.hot * (0.3 + 0.7 * warm) * (0.72 + 0.28 * MC.fbm(this.t * 0.6 + c.seed));
        if (heat < 0.2) continue;
        const r = c.r * s * 3.2;
        g.globalAlpha = Math.min(1, heat * 0.16);
        g.drawImage(S.coal, this.cx + c.x * s - r, this.by + c.y * s - r * 0.7, r * 2, r * 1.4);
      }
      g.globalAlpha = Math.min(1, 0.32 * (0.35 + E) * flick);
      g.drawImage(S.coal, this.cx - 100 * s, this.by - 20 * s, 200 * s, 44 * s);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }

    // 셰이더 불꽃과 그 빛무리. 그릴 수 없으면 false
    drawFlamesGL(g, E, flick) {
      if (!this.useGL) return false;
      const s = this.s;
      const W = 300 * s;
      const H = 430 * s;
      const scale = Math.min(this.dpr || 1, 1.25) * (this.quality >= 0.8 ? 1 : 0.7) * MC.FireGL.scale;
      const c = MC.FireGL.render(W * scale, H * scale, this.t, E * (0.94 + 0.06 * flick), this.seed);
      if (!c) {
        this.useGL = false;
        return false;
      }
      const x = this.cx - W / 2;
      const y = this.by + 8 * s - H;
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 1;
      g.drawImage(c, x, y, W, H);
      // 작게 줄였다 크게 펴서 불꽃 모양 그대로의 부드러운 빛무리를 얹는다
      const bw = 40;
      const bh = Math.round((40 * H) / W);
      if (!this.bloom || this.bloom.width !== bw || this.bloom.height !== bh) {
        this.bloom = MC.canvas(bw, bh);
        this.bloomG = this.bloom.getContext('2d');
      }
      this.bloomG.clearRect(0, 0, bw, bh);
      this.bloomG.drawImage(c, 0, 0, bw, bh);
      g.globalAlpha = 0.45;
      g.drawImage(this.bloom, x - W * 0.12, y - H * 0.04, W * 1.24, H * 1.1);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      return true;
    }

    // 불 위의 공기가 열기로 일렁인다
    shimmer(g) {
      const E = Math.min(1, this.E);
      if (E < 0.25 || this.quality < 0.6 || this.calm) return;
      const { s, cx, by } = this;
      const dpr = g.getTransform ? g.getTransform().a : this.dpr;
      const x0 = Math.max(0, Math.round((cx - 150 * s) * dpr));
      const y0 = Math.max(0, Math.round((by - 600 * s) * dpr));
      const w0 = Math.max(1, Math.min(g.canvas.width - x0, Math.round(300 * s * dpr)));
      const h0 = Math.max(1, Math.round(430 * s * dpr));
      if (!this.heat || this.heat.width !== w0 || this.heat.height !== h0) {
        this.heat = MC.canvas(w0, h0);
        this.heatG = this.heat.getContext('2d');
      }
      this.heatG.clearRect(0, 0, w0, h0);
      this.heatG.drawImage(g.canvas, x0, y0, w0, h0, 0, 0, w0, h0);
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      const strip = Math.max(2, Math.round(2 * dpr));
      for (let y = 0; y < h0; y += strip) {
        const k = y / h0;
        const amp = (0.3 + 1.7 * k * k) * E * dpr * s * 1.15;
        const dx = (Math.sin(y * 0.11 / dpr + this.t * 6.2) + 0.6 * Math.sin(y * 0.047 / dpr - this.t * 3.7)) * amp;
        g.drawImage(this.heat, 0, y, w0, strip, x0 + dx, y0 + y, w0, strip);
      }
      g.restore();
    }

    draw(g) {
      const S = SPR;
      const { w, h, s, cx, by, t } = this;
      if (!this.bg) return;
      const E = this.E;
      const tide = 0.5 + 0.5 * Math.sin((2 * Math.PI * MC.clock()) / MC.WAVE_T);
      const flick = (0.9 + 0.1 * MC.fbm(t * 2.2)) * (0.95 + 0.05 * tide);
      g.drawImage(this.bg, 0, 0, w, h);

      // 반짝이는 별과 별똥별
      g.globalCompositeOperation = 'lighter';
      for (const st of this.twinkles) {
        const a = 0.3 + 0.6 * (0.5 + 0.5 * Math.sin(t * st.sp + st.ph));
        g.globalAlpha = a;
        g.drawImage(S.star, st.x - st.r * 2.5, st.y - st.r * 2.5, st.r * 5, st.r * 5);
      }
      if (this.shoot) {
        const sh = this.shoot;
        const u = sh.t / sh.dur;
        const x = sh.x + sh.vx * sh.t;
        const y = sh.y + sh.vy * sh.t;
        const grd = g.createLinearGradient(x, y, x - sh.vx * 0.16, y - sh.vy * 0.16);
        grd.addColorStop(0, `rgba(255,255,255,${0.8 * (1 - u)})`);
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.globalAlpha = 1;
        g.strokeStyle = grd;
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x - sh.vx * 0.16, y - sh.vy * 0.16);
        g.stroke();
      }
      // 불 위로 번지는 따뜻한 기운
      g.globalAlpha = 0.11 * E * flick;
      g.drawImage(S.warm, cx - 420 * s, by - 560 * s, 840 * s, 700 * s);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';

      // 텐트와 줄전구
      const tn = this.tent;
      const tw = this.tentSize.W * tn.k;
      const th = this.tentSize.H * tn.k;
      g.drawImage(this.tentImg, tn.x - tw / 2, tn.y - th + 16 * tn.k, tw, th);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = Math.min(1, 0.32 * E * flick);
      g.drawImage(this.tentRim, tn.x - tw / 2, tn.y - th + 16 * tn.k, tw, th);
      g.globalAlpha = 0.25 + 0.05 * Math.sin(t * 0.9);
      g.drawImage(S.hot, tn.x - 70 * tn.k, tn.y - 120 * tn.k, 140 * tn.k, 130 * tn.k);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';

      g.strokeStyle = '#0a0a0f';
      g.lineWidth = Math.max(2, 3 * s);
      g.beginPath();
      g.moveTo(this.pole.x, this.pole.top);
      g.lineTo(this.pole.x, this.pole.bottom);
      g.stroke();
      const wr = this.wire;
      g.strokeStyle = 'rgba(20,16,14,0.9)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(wr.p0.x, wr.p0.y);
      g.quadraticCurveTo(wr.c.x, wr.c.y, wr.p1.x, wr.p1.y);
      g.stroke();
      g.globalCompositeOperation = 'lighter';
      for (const b of this.bulbs) {
        const a = 0.7 + 0.18 * Math.sin(t * 0.8 + b.ph);
        const r = 13 * s;
        g.globalAlpha = a;
        g.drawImage(S.bulb, b.x - r, b.y - r, r * 2, r * 2);
        g.globalAlpha = 1;
        g.fillStyle = 'rgba(255,236,200,0.95)';
        g.fillRect(b.x - 1.2 * s, b.y - 1.2 * s, 2.4 * s, 3 * s);
      }

      // 땅을 비추는 불빛
      const R = (240 + 300 * Math.min(1.1, E)) * s * flick;
      g.globalAlpha = Math.min(1, 0.5 * E + 0.08);
      g.drawImage(S.warm, cx - R, by - R * 0.42, R * 2, R * 0.84);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';

      // 연기
      for (const p of this.smoke) {
        const a = Math.sin(p.f * Math.PI) * 0.07;
        const sz = p.size * (1 + p.f * 3.5);
        g.globalAlpha = a;
        g.drawImage(S.smoke, p.x - sz, p.y - sz, sz * 2, sz * 2);
      }
      g.globalAlpha = 1;

      this.shimmer(g);

      // 돌, 숯, 장작, 불
      const lit = 0.32 * Math.min(1, E) * flick;
      for (const st of this.stones) if (!st.front) this.drawStone(g, st, lit * 0.7);
      this.drawCoals(g, E, flick);
      for (const l of this.logs) if (!l.front) this.drawPitLog(g, l);

      if (!this.drawFlamesGL(g, E, flick)) this.drawFlamesSoft(g, E, flick);

      for (const l of this.logs) if (l.front) this.drawPitLog(g, l);
      g.globalCompositeOperation = 'lighter';
      for (const l of this.logs) this.drawCracks(g, l, flick);
      g.globalCompositeOperation = 'source-over';
      for (const st of this.stones) if (st.front) this.drawStone(g, st, lit);

      this.pup.light.glowA = 0.42 * Math.min(1, E) * flick;
      this.pup.draw(g, this.dpr);

      // 불티(꼬리를 끄는 빛)와 글자 불씨
      g.globalCompositeOperation = 'lighter';
      g.lineCap = 'round';
      for (const p of this.sparks) {
        const a = Math.pow(1 - p.f, 1.3) * (0.75 + 0.25 * Math.sin(t * 4 + p.seed));
        if (a < 0.02) continue;
        const hot = 1 - p.f;
        g.globalAlpha = a;
        g.strokeStyle = hot > 0.6 ? '#ffe3a0' : hot > 0.3 ? '#ffae55' : '#ff7a2e';
        g.lineWidth = p.size * 0.85;
        g.beginPath();
        g.moveTo(p.x, p.y);
        g.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
        g.stroke();
        const sz = p.size * 2.6;
        g.drawImage(S.spark, p.x - sz, p.y - sz, sz * 2, sz * 2);
      }
      for (const p of this.embers) {
        const a = p.delay > 0 ? 0.42 + 0.18 * Math.sin(t * 2.5 + p.seed) : Math.pow(1 - p.f, 1.4) * 0.9;
        const sz = (p.delay > 0 ? 2.2 : 2.4) * s + 0.6;
        g.globalAlpha = a;
        g.drawImage(p.delay > 0 ? S.text : S.spark, p.x - sz, p.y - sz, sz * 2, sz * 2);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';

      this.drawFlying(g);
      g.drawImage(this.vignette, 0, 0, w, h);
    }

    // WebGL이 없을 때의 입자 불꽃
    drawFlamesSoft(g, E, flick) {
      const S = SPR;
      const { s, cx, by, t } = this;
      g.globalCompositeOperation = 'lighter';
      // 불꽃의 몸통: 높이가 제각각 일렁이는 큰 혀 다섯 개
      const Ec = Math.min(1.2, E);
      for (let i = 0; i < 5; i++) {
        const u = (i - 2) / 2;
        const hgt = (170 + 80 * MC.fbm(t * (2.1 + i * 0.37) + i * 3.1)) * s * (1 - 0.4 * Math.abs(u)) * Ec;
        const wid = 54 * s * (1 - 0.3 * Math.abs(u)) * (0.55 + 0.45 * Ec);
        const x = cx + u * 46 * s * (0.6 + 0.4 * Ec) + MC.fbm(t * 3 + i * 5) * 9 * s;
        const mid = by - 12 * s - hgt * 0.42;
        g.globalAlpha = 0.3;
        g.drawImage(S.flame[9], x - wid / 2, mid - hgt * 0.58, wid, hgt * 1.16);
        g.globalAlpha = 0.34;
        g.drawImage(S.flame[3], x - wid * 0.32, by - 12 * s - hgt * 0.5, wid * 0.64, hgt * 0.62);
      }
      for (const p of this.flames) {
        const f = p.f;
        const a = (f < 0.1 ? f / 0.1 : 1) * Math.pow(1 - f, 0.9) * 0.5;
        if (a < 0.01) continue;
        const ci = MC.clamp(Math.round((f * 1.0 + (1 - p.hot) * 0.2) * (STEPS - 1)), 0, STEPS - 1);
        const sz = p.size * (1 - f * 0.65);
        g.globalAlpha = a;
        g.drawImage(S.flame[ci], p.x - sz, p.y - sz * 1.35, sz * 2, sz * 2.7);
      }
      g.globalAlpha = Math.min(1, 0.4 * E * flick);
      g.drawImage(S.hot, cx - 70 * s, by - 70 * s, 140 * s, 90 * s);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }

    drawFlying(g) {
      const S = SPR;
      const s = this.s;
      // 날아가는 장작
      for (const f of this.flying) {
        const e = f.t < 0.5 ? 2 * f.t * f.t : 1 - Math.pow(-2 * f.t + 2, 2) / 2;
        const x = MC.lerp(f.from.x, f.to.x, e);
        const y = MC.lerp(f.from.y, f.to.y, e) - f.arc * Math.sin(Math.PI * f.t);
        const a = MC.lerp(f.from.a, f.to.a, e);
        const k = MC.lerp(f.from.k, f.to.k, e);
        const sprite = f.worry ? (f.t < 0.85 ? f.worry.made.sprite : f.worry.made.plain) : f.log.sprite || (f.log.sprite = this.logSprites[f.log.kind][f.log.v % this.logSprites[f.log.kind].length]);
        this.drawLog(g, sprite, x, y, a, k);
      }
      // 손에 든 걱정 장작
      const wy = this.worry;
      if (wy && wy.phase !== 'fly') {
        const bob = wy.phase === 'hold' ? Math.sin(wy.t * 1.6) * 4 * s : 0;
        const k = wy.k * MC.smooth(0, 0.35, wy.t);
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = 0.18;
        g.drawImage(S.hot, wy.x - 190 * s, wy.y - 70 * s + bob, 380 * s, 140 * s);
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
        this.drawLog(g, wy.made.sprite, wy.x, wy.y + bob, 0, k);
      }
    }
  }

  MC.FireScene = FireScene;
})(window.MC = window.MC || {});
