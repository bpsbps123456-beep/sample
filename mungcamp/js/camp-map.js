/* 멍캠프 — 캠프 마을: 멍이를 데리고 걸어 다니는 지도
   해 질 녘의 작은 캠프. 오솔길을 따라 연등이 켜져 있고, 가까이 가면 그 자리에 앉을 수 있다.
   정자에는 목탁이 있다. 똑 치면 번뇌가 하나 줄어든다. */
(function (MC) {
  'use strict';

  const W = 2000;
  const H = 1500;
  const INK = 'rgba(30,40,34,0.85)';

  // 오른쪽이 바다. 물가 선은 조금씩 굽이친다
  const shoreX = (y) => 1560 + 40 * Math.sin(y * 0.004) + 22 * Math.sin(y * 0.011 + 1);
  const DOCK = { y0: 742, y1: 780, len: 210 };

  const FIRE = { x: 880, y: 905 };
  const TENT = { x: 1060, y: 845 };
  const PAVILION = { x: 1240, y: 372 };
  const STUMP = { x: 470, y: 446 };

  const SPOTS = [
    { id: 'fire', label: '모닥불 글램핑', tone: 'ember', x: FIRE.x - 30, y: FIRE.y + 40, r: 150, act: '앉기', ax: FIRE.x, ay: FIRE.y - 112 },
    { id: 'water', label: '달빛 바다', tone: 'sea', x: shoreX(760) + 160, y: 761, r: 120, act: '앉기', ax: shoreX(760) + 170, ay: 690 },
    { id: 'forest', label: '편백 숲', tone: 'moss', x: STUMP.x + 20, y: STUMP.y + 30, r: 140, act: '앉기', ax: STUMP.x, ay: STUMP.y - 110 },
    { id: 'moktak', label: '정자', tone: 'paper', x: PAVILION.x, y: PAVILION.y + 40, r: 120, act: '똑', ax: PAVILION.x, ay: PAVILION.y - 204 },
  ];

  // 오솔길: 몇 개의 점을 부드럽게 잇는다
  const PATH_KEYS = [
    [[FIRE.x - 10, FIRE.y + 70], [1080, 930], [1300, 830], [shoreX(760) - 30, 761]],
    [[FIRE.x - 40, FIRE.y + 40], [740, 780], [590, 610], [STUMP.x + 20, STUMP.y + 40]],
    [[FIRE.x + 30, FIRE.y + 40], [1010, 720], [1150, 540], [PAVILION.x, PAVILION.y + 40]],
    [[STUMP.x + 60, STUMP.y + 30], [780, 470], [1030, 470], [PAVILION.x - 60, PAVILION.y + 34]],
  ];

  function catmull(keys, step = 12) {
    const out = [];
    const p = [keys[0], ...keys, keys[keys.length - 1]];
    for (let i = 1; i < p.length - 2; i++) {
      const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
      const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const n = Math.max(2, Math.round(len / step));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        const t2 = t * t;
        const t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push(keys[keys.length - 1]);
    return out;
  }
  const PATHS = PATH_KEYS.map((k) => catmull(k));

  const LANTERN_COLORS = [[255, 170, 190], [255, 214, 120], [255, 178, 118], [214, 240, 190], [255, 206, 222]];

  function ellipse(g, x, y, rx, ry, rot = 0) {
    g.beginPath();
    g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2);
  }

  // 겹친 동그라미들을 한 덩어리처럼 윤곽선과 함께 칠한다
  function blobs(g, circles, fill, outline, lw) {
    g.strokeStyle = outline;
    g.lineWidth = lw * 2;
    for (const [x, y, r] of circles) {
      ellipse(g, x, y, r, r);
      g.stroke();
    }
    g.fillStyle = fill;
    for (const [x, y, r] of circles) {
      ellipse(g, x, y, r, r);
      g.fill();
    }
  }

  // 스프라이트: 땅에 닿는 점(ax, ay)을 기준으로 그린 캔버스
  function sprite(w, h, ax, ay, scale, paint) {
    const c = MC.canvas(w * scale, h * scale);
    const g = c.getContext('2d');
    g.scale(scale, scale);
    g.translate(ax, ay);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    paint(g);
    return { c, w, h, ax, ay };
  }

  class CampMap {
    constructor() {
      this.quality = 1;
      this.t = 0;
      this.w = 1;
      this.h = 1;
      this.z = 1;
      this.spots = SPOTS;
      this.near = null;
      this.keys = { x: 0, y: 0 };
      this.target = null;
      this.moving = false;
      this.texts = [];
      this.onCute = null;
      this.onMoktak = null;
      this.fireEvents = null;
      this.moktakHit = 0;
      this.chime = 0;
      this.sparks = [];
      this.pup = new MC.Pup({ outfit: 'beanie', light: { ambient: null, glow: [255, 170, 90], glowA: 0, from: 70 } });
      this.pup.onEvent = (kind) => { if (this.onCute) this.onCute(kind); };
      // 함께 걷는 다른 사람들의 멍이
      this.visitors = new Map();
      this.onBoop = null;
      this.pup.x = FIRE.x - 70;
      this.pup.y = FIRE.y + 70;
      this.cam = { x: this.pup.x, y: this.pup.y - 40 };
      this.rnd = MC.rng(1717);
      this.layout();
      this.flies = [];
      for (let i = 0; i < 34; i++) {
        const r = this.rnd();
        const zone = r < 0.45 ? [140, 120, 760, 600] : r < 0.75 ? [1050, 230, 1450, 560] : [300, 900, 1450, 1400];
        this.flies.push({ x: zone[0] + this.rnd() * (zone[2] - zone[0]), y: zone[1] + this.rnd() * (zone[3] - zone[1]), ph: this.rnd() * 9, sp: 0.6 + this.rnd() });
      }
    }

    audioParams() {
      return null;
    }

    // ── 배치 ─────────────────────────────────────────────
    nearPath(x, y, d) {
      for (const path of PATHS) {
        for (const [px, py] of path) if ((px - x) ** 2 + (py - y) ** 2 < d * d) return true;
      }
      return false;
    }

    clearOf(x, y, d) {
      if (this.nearPath(x, y, d)) return false;
      if (x > shoreX(y) - 190) return false;
      for (const [ox, oy, r] of [[FIRE.x, FIRE.y, 190], [TENT.x, TENT.y, 120], [PAVILION.x, PAVILION.y - 40, 170], [STUMP.x, STUMP.y, 110]]) {
        if ((x - ox) ** 2 + (y - oy) ** 2 < r * r) return false;
      }
      return true;
    }

    layout() {
      const rnd = this.rnd;
      this.trees = [];
      // 편백 숲: 왼쪽 위에 빽빽하게
      for (let i = 0; i < 240 && this.trees.length < 46; i++) {
        const x = 90 + rnd() * 720;
        const y = 90 + rnd() * 520;
        if (!this.clearOf(x, y, 46)) continue;
        if (this.trees.some((t) => (t.x - x) ** 2 + (t.y - y) ** 2 < 46 * 46)) continue;
        this.trees.push({ kind: 'cypress', v: (rnd() * 3) | 0, x, y, sway: rnd() * 6 });
      }
      // 둥근 나무와 덤불: 가장자리를 따라
      for (let i = 0; i < 600 && this.trees.length < 96; i++) {
        const edge = rnd();
        let x;
        let y;
        if (edge < 0.4) {
          x = 60 + rnd() * 1450;
          y = 1180 + rnd() * 280;
        } else if (edge < 0.7) {
          x = 60 + rnd() * 260;
          y = 600 + rnd() * 860;
        } else {
          x = 820 + rnd() * 650;
          y = 70 + rnd() * 220;
        }
        if (!this.clearOf(x, y, 54)) continue;
        if (this.trees.some((t) => (t.x - x) ** 2 + (t.y - y) ** 2 < 58 * 58)) continue;
        const bush = rnd() < 0.35;
        this.trees.push({ kind: bush ? 'bush' : 'round', v: (rnd() * 3) | 0, x, y, sway: rnd() * 6 });
      }
      // 길가의 연등
      this.lanterns = [];
      PATHS.forEach((path, pi) => {
        let acc = 0;
        for (let i = 1; i < path.length; i++) {
          acc += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
          if (acc < 150) continue;
          acc = 0;
          const [x0, y0] = path[i - 1];
          const [x1, y1] = path[i];
          const len = Math.hypot(x1 - x0, y1 - y0) || 1;
          const side = (this.lanterns.length + pi) % 2 ? 1 : -1;
          const x = x1 + (-(y1 - y0) / len) * 42 * side;
          const y = y1 + ((x1 - x0) / len) * 42 * side;
          if ((x - FIRE.x) ** 2 + (y - FIRE.y) ** 2 < 120 * 120) continue;
          if (x > shoreX(y) - 30) continue;
          this.lanterns.push({ x, y, c: LANTERN_COLORS[this.lanterns.length % LANTERN_COLORS.length], ph: rnd() * 6 });
        }
      });
      // 부딪히는 것들: 나무와 덤불은 줄기 밑동, 연등은 기둥, 큰 물건은 바닥 자리. 위아래로 납작한 타원
      this.blockers = [
        { x: FIRE.x, y: FIRE.y, r: 52, sy: 1.6 },
        { x: TENT.x, y: TENT.y - 14, r: 62, sy: 1.6 },
        { x: PAVILION.x, y: PAVILION.y - 26, r: 84, sy: 1.6 },
        { x: STUMP.x, y: STUMP.y - 6, r: 30, sy: 1.6 },
      ];
      for (const tr of this.trees) {
        const r = tr.kind === 'cypress' ? 15 : tr.kind === 'round' ? 17 : 22;
        this.blockers.push({ x: tr.x, y: tr.y - 2, r, sy: 1.8 });
      }
      for (const ln of this.lanterns) this.blockers.push({ x: ln.x, y: ln.y, r: 8, sy: 1.6 });
    }

    // 부딪히면 바깥으로 밀어 낸다. grow로 조금 넉넉하게 밀 수도 있다
    collide(p, grow = 1) {
      for (let pass = 0; pass < 2; pass++) {
        for (const b of this.blockers) {
          const r = b.r * grow;
          const dx = p.x - b.x;
          if (dx > r || dx < -r) continue;
          const dy = (p.y - b.y) * b.sy;
          const d = Math.hypot(dx, dy);
          if (d >= r) continue;
          if (d < 0.01) {
            p.y = b.y + r / b.sy;
            continue;
          }
          p.x = b.x + (dx / d) * r;
          p.y = b.y + ((dy / d) * r) / b.sy;
        }
      }
    }

    // 톡 눌러 갈 때: 앞을 가로막는 것이 있으면 옆으로 비켜 돌아간다
    steer(dx, dy) {
      const p = this.pup;
      let ax = 0;
      let ay = 0;
      for (const b of this.blockers) {
        let ux = dx;
        let uy = dy * b.sy;
        const ul = Math.hypot(ux, uy) || 1;
        ux /= ul;
        uy /= ul;
        const ox = b.x - p.x;
        const oy = (b.y - p.y) * b.sy;
        const ahead = ox * ux + oy * uy;
        if (ahead <= 0 || ahead > 80) continue;
        const lat = -ox * uy + oy * ux;
        const clear = b.r + 14;
        if (Math.abs(lat) >= clear) continue;
        const w = (1 - Math.abs(lat) / clear) * (1 - ahead / 80);
        const side = lat > 0 ? 1 : -1;
        ax += uy * side * w;
        ay += (-ux * side * w) / b.sy;
      }
      return [ax, ay];
    }

    // ── 크기와 미리 그려 두는 것들 ─────────────────────────
    resize(w, h, dpr) {
      this.w = w;
      this.h = h;
      this.dpr = dpr;
      // 세로 화면(휴대폰)은 지도를 조금 당겨 보여 준다: 멍이가 크게 보이고, 위아래로도 끌어 둘러볼 수 있다
      this.z = w < h * 0.9 ? MC.clamp(h / 1050, 0.7, 1.05) : MC.clamp(Math.min(w / 1150, h / 820), 0.62, 1.25);
      const gs = Math.min(1.25, this.z * dpr);
      if (!this.ground || Math.abs(gs - this.gs) / this.gs > 0.15) {
        this.gs = gs;
        this.buildGround();
      }
      const ss = this.z * dpr;
      if (!this.sp || Math.abs(ss - this.ss) / this.ss > 0.15) {
        this.ss = ss;
        this.buildSprites();
      }
      this.clampCam();
    }

    buildGround() {
      const gs = this.gs;
      const c = (this.ground = MC.canvas(W * gs, H * gs));
      const g = c.getContext('2d');
      g.scale(gs, gs);
      const rnd = MC.rng(2024);
      const base = g.createRadialGradient(W * 0.45, H * 0.58, 120, W * 0.45, H * 0.58, W * 0.85);
      base.addColorStop(0, '#5a9168');
      base.addColorStop(1, '#3a6b4f');
      g.fillStyle = base;
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 280; i++) {
        g.fillStyle = rnd() < 0.5 ? `rgba(120,178,120,${0.05 + rnd() * 0.07})` : `rgba(40,86,60,${0.05 + rnd() * 0.08})`;
        ellipse(g, rnd() * W, rnd() * H, 30 + rnd() * 90, 20 + rnd() * 60);
        g.fill();
      }
      // 편백 숲 바닥은 이끼빛으로 짙게
      const moss = g.createRadialGradient(430, 370, 40, 430, 370, 480);
      moss.addColorStop(0, 'rgba(36,72,48,0.55)');
      moss.addColorStop(1, 'rgba(36,72,48,0)');
      g.fillStyle = moss;
      g.fillRect(0, 0, W, H);
      // 모래사장, 젖은 모래, 바다
      const band = (off, wobble) => {
        g.beginPath();
        g.moveTo(W + 10, -10);
        for (let y = -10; y <= H + 10; y += 10) g.lineTo(shoreX(y) + off + Math.sin(y * 0.021) * wobble, y);
        g.lineTo(W + 10, H + 10);
        g.closePath();
      };
      band(-170, 14);
      g.fillStyle = '#e2cc9c';
      g.fill();
      band(-46, 6);
      g.fillStyle = '#c6b088';
      g.fill();
      band(0, 0);
      const sea = g.createLinearGradient(1500, 0, W, 0);
      sea.addColorStop(0, '#5aa0b8');
      sea.addColorStop(0.25, '#3c7aa0');
      sea.addColorStop(1, '#264a78');
      g.fillStyle = sea;
      g.fill();
      for (let i = 0; i < 260; i++) {
        const y = rnd() * H;
        const x = shoreX(y) - 170 + rnd() * 150;
        g.fillStyle = `rgba(${rnd() < 0.5 ? '255,250,235' : '150,125,90'},${0.15 + rnd() * 0.2})`;
        g.fillRect(x, y, 2, 2);
      }
      // 오솔길
      for (const path of PATHS) {
        const stroke = (lw, col) => {
          g.strokeStyle = col;
          g.lineWidth = lw;
          g.lineCap = 'round';
          g.lineJoin = 'round';
          g.beginPath();
          path.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
          g.stroke();
        };
        stroke(58, 'rgba(120,96,64,0.35)');
        stroke(50, '#c8a77c');
        stroke(40, '#d8bb90');
        for (let i = 0; i < path.length; i += 2) {
          const [x, y] = path[i];
          g.fillStyle = 'rgba(140,110,80,0.35)';
          ellipse(g, x + (rnd() - 0.5) * 34, y + (rnd() - 0.5) * 34, 2 + rnd() * 2.5, 1.5 + rnd() * 1.5);
          g.fill();
        }
      }
      // 모닥불 둘레의 다져진 흙
      const yard = g.createRadialGradient(FIRE.x, FIRE.y, 20, FIRE.x, FIRE.y, 150);
      yard.addColorStop(0, 'rgba(200,170,128,0.9)');
      yard.addColorStop(0.7, 'rgba(200,170,128,0.55)');
      yard.addColorStop(1, 'rgba(200,170,128,0)');
      g.fillStyle = yard;
      ellipse(g, FIRE.x, FIRE.y, 170, 120);
      g.fill();
      // 풀 포기와 들꽃
      for (let i = 0; i < 1100; i++) {
        const x = rnd() * W;
        const y = rnd() * H;
        if (x > shoreX(y) - 175 || this.nearPath(x, y, 30)) continue;
        if (rnd() < 0.7) {
          g.strokeStyle = `rgba(${rnd() < 0.5 ? '120,180,120' : '50,100,70'},0.6)`;
          g.lineWidth = 1.4;
          g.beginPath();
          g.moveTo(x - 3, y);
          g.lineTo(x - 4, y - 6);
          g.moveTo(x, y);
          g.lineTo(x, y - 8);
          g.moveTo(x + 3, y);
          g.lineTo(x + 4, y - 6);
          g.stroke();
        } else {
          const col = ['#fff8ec', '#ffd1dc', '#ffe58a', '#d9e8ff'][(rnd() * 4) | 0];
          g.fillStyle = col;
          for (let k = 0; k < 5; k++) {
            const a = (k / 5) * Math.PI * 2;
            ellipse(g, x + Math.cos(a) * 2.4, y + Math.sin(a) * 2.4, 2, 1.4, a);
            g.fill();
          }
          g.fillStyle = '#f5b83d';
          ellipse(g, x, y, 1.2, 1.2);
          g.fill();
        }
      }
    }

    buildSprites() {
      const ss = this.ss;
      const sp = (this.sp = {});
      const rnd = MC.rng(99);
      // 편백나무: 위로 뾰족한 불꽃 꼴, 층층이 진 잎
      sp.cypress = [0, 1, 2].map((v) => {
        const h = 128 + v * 22;
        const w = 46 + v * 6;
        return sprite(w + 20, h + 20, w / 2 + 10, h + 8, ss, (g) => {
          g.fillStyle = 'rgba(0,0,0,0.22)';
          ellipse(g, 0, 0, w * 0.5, 7);
          g.fill();
          g.fillStyle = '#5a3d2a';
          g.fillRect(-3.5, -16, 7, 16);
          g.beginPath();
          g.moveTo(0, -h);
          const tiers = 5;
          for (let i = 0; i <= tiers; i++) {
            const y = -h + (i / tiers) * (h - 12);
            const half = (w / 2) * Math.pow(i / tiers, 0.7);
            g.quadraticCurveTo(half + 5, y - 6, half, y + 4);
          }
          g.quadraticCurveTo(0, -4, -w / 2, -12);
          for (let i = tiers; i >= 0; i--) {
            const y = -h + (i / tiers) * (h - 12);
            const half = (w / 2) * Math.pow(i / tiers, 0.7);
            g.quadraticCurveTo(-half - 5, y - 6, -half * 0.8, y - (h / tiers) * 0.5);
          }
          g.closePath();
          const grd = g.createLinearGradient(-w / 2, 0, w / 2, 0);
          grd.addColorStop(0, '#5d9a6c');
          grd.addColorStop(1, '#2d5b42');
          g.fillStyle = grd;
          g.fill();
          g.strokeStyle = INK;
          g.lineWidth = 2.2;
          g.stroke();
          g.strokeStyle = 'rgba(25,55,38,0.45)';
          g.lineWidth = 1.4;
          for (let i = 1; i < tiers; i++) {
            const y = -h + (i / tiers) * (h - 12);
            const half = (w / 2) * Math.pow(i / tiers, 0.7) * 0.8;
            g.beginPath();
            g.moveTo(-half, y + 2);
            g.quadraticCurveTo(0, y + 8, half, y + 2);
            g.stroke();
          }
        });
      });
      // 둥근 나무: 동글동글한 잎 덩어리, 몇 그루엔 분홍 꽃
      sp.round = [0, 1, 2].map((v) => sprite(110, 130, 55, 120, ss, (g) => {
        g.fillStyle = 'rgba(0,0,0,0.22)';
        ellipse(g, 0, 0, 34, 8);
        g.fill();
        MC.roundRect(g, -6, -30, 12, 30, 4);
        g.fillStyle = '#6e4b33';
        g.fill();
        g.strokeStyle = INK;
        g.lineWidth = 2;
        g.stroke();
        const cs = [[-18, -60, 24], [16, -62, 25], [0, -82, 27], [-6, -52, 22], [10, -48, 20]];
        blobs(g, cs, ['#4f8a5e', '#5a9a66', '#4a8458'][v], INK, 2.2);
        g.fillStyle = 'rgba(160,214,150,0.55)';
        for (const [x, y, r] of [[-12, -90, 9], [-24, -68, 7], [6, -94, 6]]) {
          ellipse(g, x, y, r, r * 0.8);
          g.fill();
        }
        if (v === 2) {
          for (let i = 0; i < 9; i++) {
            g.fillStyle = rnd() < 0.5 ? '#ffc4d4' : '#fff1f4';
            ellipse(g, -26 + rnd() * 52, -100 + rnd() * 56, 2.6, 2.6);
            g.fill();
          }
        }
      }));
      sp.bush = [0, 1, 2].map((v) => sprite(70, 50, 35, 42, ss, (g) => {
        g.fillStyle = 'rgba(0,0,0,0.2)';
        ellipse(g, 0, 0, 26, 6);
        g.fill();
        blobs(g, [[-12, -12, 13], [10, -13, 14], [0, -22, 14]], ['#4d875b', '#58945f', '#467e55'][v], INK, 2);
        if (v === 1) {
          for (const [x, y] of [[-10, -20], [6, -26], [12, -14]]) {
            g.fillStyle = '#ffe3a1';
            ellipse(g, x, y, 2.4, 2.4);
            g.fill();
          }
        }
      }));
      // 벨텐트
      sp.tent = sprite(170, 160, 85, 140, ss, (g) => {
        g.fillStyle = 'rgba(0,0,0,0.25)';
        ellipse(g, 0, 2, 74, 14);
        g.fill();
        g.beginPath();
        g.moveTo(-64, 0);
        g.quadraticCurveTo(-40, -70, 0, -122);
        g.quadraticCurveTo(40, -70, 64, 0);
        g.quadraticCurveTo(0, 14, -64, 0);
        g.closePath();
        const grd = g.createLinearGradient(-64, 0, 64, 0);
        grd.addColorStop(0, '#fbecd2');
        grd.addColorStop(1, '#d8bc92');
        g.fillStyle = grd;
        g.fill();
        g.strokeStyle = INK;
        g.lineWidth = 2.4;
        g.stroke();
        g.strokeStyle = 'rgba(120,90,60,0.35)';
        g.lineWidth = 1.4;
        for (const x of [-38, -14, 14, 38]) {
          g.beginPath();
          g.moveTo(0, -120);
          g.quadraticCurveTo(x * 0.6, -50, x, 6);
          g.stroke();
        }
        g.beginPath();
        g.moveTo(-17, 4);
        g.lineTo(0, -58);
        g.lineTo(17, 4);
        g.closePath();
        g.fillStyle = '#ffd590';
        g.fill();
        g.strokeStyle = INK;
        g.lineWidth = 2;
        g.stroke();
        g.strokeStyle = '#3a2a20';
        g.lineWidth = 2.4;
        g.beginPath();
        g.moveTo(0, -122);
        g.lineTo(0, -138);
        g.stroke();
        g.beginPath();
        g.moveTo(0, -138);
        g.lineTo(16, -133);
        g.lineTo(0, -128);
        g.closePath();
        g.fillStyle = '#e4664b';
        g.fill();
      });
      // 모닥불 자리: 돌 둘레, 재, 엇갈린 장작
      sp.pit = sprite(130, 80, 65, 52, ss, (g) => {
        g.fillStyle = 'rgba(0,0,0,0.25)';
        ellipse(g, 0, 4, 52, 20);
        g.fill();
        g.fillStyle = '#2d221c';
        ellipse(g, 0, 0, 38, 15);
        g.fill();
        for (const [x, y, a] of [[-14, -6, -0.5], [14, -6, 0.5], [0, -2, 0.05]]) {
          g.save();
          g.translate(x, y);
          g.rotate(a);
          MC.roundRect(g, -20, -5, 40, 10, 5);
          g.fillStyle = '#6b4a33';
          g.fill();
          g.strokeStyle = INK;
          g.lineWidth = 1.8;
          g.stroke();
          g.restore();
        }
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2;
          const x = Math.cos(a) * 44;
          const y = Math.sin(a) * 18;
          ellipse(g, x, y, 8, 6);
          g.fillStyle = i % 3 ? '#8a847d' : '#9c968e';
          g.fill();
          g.strokeStyle = INK;
          g.lineWidth = 1.6;
          g.stroke();
        }
      });
      // 정자: 단청 띠와 처마 끝이 살짝 들린 기와지붕
      sp.pavilion = sprite(260, 230, 130, 205, ss, (g) => {
        g.fillStyle = 'rgba(0,0,0,0.25)';
        ellipse(g, 0, 4, 100, 18);
        g.fill();
        // 돌 기단과 마루
        MC.roundRect(g, -88, -30, 176, 30, 6);
        g.fillStyle = '#a49c90';
        g.fill();
        g.strokeStyle = INK;
        g.lineWidth = 2.2;
        g.stroke();
        MC.roundRect(g, -80, -40, 160, 16, 4);
        g.fillStyle = '#c99a63';
        g.fill();
        g.stroke();
        g.strokeStyle = 'rgba(110,70,40,0.35)';
        g.lineWidth = 1.2;
        for (let x = -72; x < 80; x += 12) {
          g.beginPath();
          g.moveTo(x, -39);
          g.lineTo(x, -25);
          g.stroke();
        }
        // 기둥
        for (const x of [-66, 66, -40, 40]) {
          g.fillStyle = x === -40 || x === 40 ? '#7a3426' : '#8f3d2b';
          g.fillRect(x - 5, -118, 10, 80);
          g.strokeStyle = INK;
          g.lineWidth = 1.8;
          g.strokeRect(x - 5, -118, 10, 80);
        }
        // 방석
        MC.roundRect(g, -16, -46, 32, 10, 4);
        g.fillStyle = '#b9566a';
        g.fill();
        g.strokeStyle = INK;
        g.lineWidth = 1.6;
        g.stroke();
        // 단청 띠
        g.fillStyle = '#3f8f7a';
        g.fillRect(-78, -126, 156, 10);
        g.fillStyle = '#e06a4f';
        for (let x = -72; x < 78; x += 14) {
          ellipse(g, x, -121, 2.6, 2.6);
          g.fill();
        }
        g.strokeStyle = INK;
        g.lineWidth = 1.6;
        g.strokeRect(-78, -126, 156, 10);
        // 지붕
        g.beginPath();
        g.moveTo(-118, -120);
        g.quadraticCurveTo(-96, -128, -78, -134);
        g.quadraticCurveTo(-52, -178, -30, -186);
        g.lineTo(30, -186);
        g.quadraticCurveTo(52, -178, 78, -134);
        g.quadraticCurveTo(96, -128, 118, -120);
        g.quadraticCurveTo(110, -138, 96, -140);
        g.quadraticCurveTo(0, -150, -96, -140);
        g.quadraticCurveTo(-110, -138, -118, -120);
        g.closePath();
        const roof = g.createLinearGradient(0, -186, 0, -120);
        roof.addColorStop(0, '#56677c');
        roof.addColorStop(1, '#36414f');
        g.fillStyle = roof;
        g.fill();
        g.strokeStyle = INK;
        g.lineWidth = 2.4;
        g.stroke();
        g.strokeStyle = 'rgba(20,26,34,0.45)';
        g.lineWidth = 1.3;
        for (let x = -90; x <= 90; x += 10) {
          g.beginPath();
          g.moveTo(x * 0.3, -184);
          g.quadraticCurveTo(x * 0.75, -160, x, -138);
          g.stroke();
        }
        g.fillStyle = '#2b3440';
        MC.roundRect(g, -36, -192, 72, 9, 4);
        g.fill();
      });
      // 그루터기와 빨간 버섯
      sp.stump = sprite(110, 80, 50, 58, ss, (g) => {
        g.fillStyle = 'rgba(0,0,0,0.22)';
        ellipse(g, 0, 2, 36, 9);
        g.fill();
        g.beginPath();
        g.moveTo(-26, -26);
        g.lineTo(-28, -2);
        g.quadraticCurveTo(-34, 3, -38, 5);
        g.lineTo(38, 5);
        g.quadraticCurveTo(34, 3, 28, -2);
        g.lineTo(26, -26);
        g.closePath();
        g.fillStyle = '#6e4a2f';
        g.fill();
        g.strokeStyle = INK;
        g.lineWidth = 2;
        g.stroke();
        ellipse(g, 0, -26, 26, 9);
        g.fillStyle = '#d9b07c';
        g.fill();
        g.stroke();
        g.strokeStyle = 'rgba(130,88,48,0.5)';
        g.lineWidth = 1;
        ellipse(g, 0, -26, 16, 5.5);
        g.stroke();
        ellipse(g, 0, -26, 7, 2.4);
        g.stroke();
        for (const [x, y, rx] of [[-16, -28, 8], [12, -31, 6], [22, -22, 5]]) {
          g.fillStyle = '#7fae5a';
          ellipse(g, x, y, rx, rx * 0.5);
          g.fill();
        }
        for (const [mx, sc] of [[34, 1], [46, 0.7]]) {
          const r = 7 * sc;
          g.fillStyle = '#f6ecd8';
          g.fillRect(mx - r * 0.35, -r * 1.3, r * 0.7, r * 1.3);
          g.beginPath();
          g.moveTo(mx - r * 1.1, -r * 1.1);
          g.quadraticCurveTo(mx, -r * 2.6, mx + r * 1.1, -r * 1.1);
          g.closePath();
          g.fillStyle = '#e85a3c';
          g.fill();
          g.strokeStyle = INK;
          g.lineWidth = 1.4;
          g.stroke();
          g.fillStyle = '#fff8ee';
          ellipse(g, mx - r * 0.35, -r * 1.65, r * 0.2, r * 0.2);
          g.fill();
          ellipse(g, mx + r * 0.35, -r * 1.5, r * 0.16, r * 0.16);
          g.fill();
        }
      });
      // 연등 (불빛은 나중에 따로 얹는다)
      sp.lantern = LANTERN_COLORS.map((c) => sprite(40, 70, 20, 62, ss, (g) => {
        g.fillStyle = 'rgba(0,0,0,0.2)';
        ellipse(g, 0, 0, 8, 3);
        g.fill();
        g.strokeStyle = '#4a3a2c';
        g.lineWidth = 2.6;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(0, -44);
        g.lineTo(9, -46);
        g.stroke();
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(9, -46);
        g.lineTo(9, -42);
        g.stroke();
        ellipse(g, 9, -34, 8, 9);
        g.fillStyle = MC.rgba(MC.mix(c, [255, 255, 255], 0.25));
        g.fill();
        g.strokeStyle = INK;
        g.lineWidth = 1.6;
        g.stroke();
        g.strokeStyle = MC.rgba(MC.mix(c, [120, 60, 40], 0.45), 0.6);
        g.lineWidth = 0.9;
        for (const dx of [-4, 0, 4]) {
          g.beginPath();
          g.moveTo(9 + dx * 0.6, -42.5);
          g.quadraticCurveTo(9 + dx * 1.3, -34, 9 + dx * 0.6, -25.5);
          g.stroke();
        }
        g.strokeStyle = MC.rgba(MC.mix(c, [180, 60, 50], 0.5));
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(9, -25);
        g.lineTo(9, -19);
        g.stroke();
      }));
      // 바다로 뻗은 나무 선착장
      const dl = DOCK.len + 34;
      const dh = DOCK.y1 - DOCK.y0;
      sp.dock = sprite(dl + 10, dh + 26, 5, dh + 14, ss, (g) => {
        g.fillStyle = 'rgba(10,30,60,0.35)';
        g.fillRect(4, -dh + 6, dl, dh);
        g.fillStyle = '#9a7150';
        g.fillRect(0, -dh, dl, dh);
        g.strokeStyle = 'rgba(70,45,28,0.6)';
        g.lineWidth = 1.2;
        for (let x = 12; x < dl; x += 12) {
          g.beginPath();
          g.moveTo(x, -dh);
          g.lineTo(x, 0);
          g.stroke();
        }
        g.strokeStyle = INK;
        g.lineWidth = 2;
        g.strokeRect(0, -dh, dl, dh);
        for (const x of [dl * 0.33, dl * 0.66, dl - 4]) {
          for (const y of [-dh - 2, 2]) {
            ellipse(g, x, y, 4.5, 4.5);
            g.fillStyle = '#5e4330';
            g.fill();
            g.stroke();
          }
        }
      });
      this.glowCache = {};
    }

    glow(rgb) {
      const key = rgb.join(',');
      if (!this.glowCache[key]) this.glowCache[key] = MC.glow(rgb, 64, 0.2);
      return this.glowCache[key];
    }

    // ── 좌표 ─────────────────────────────────────────────
    toScreen(x, y) {
      return { x: (x - this.cam.x) * this.z + this.w / 2, y: (y - this.cam.y) * this.z + this.h / 2 };
    }

    toWorld(sx, sy) {
      return { x: (sx - this.w / 2) / this.z + this.cam.x, y: (sy - this.h / 2) / this.z + this.cam.y };
    }

    // 끌어서 지도 둘러보기. 지도 끝에 닿아 더 못 간 만큼(화면 px, 세로)을 돌려준다: 페이지 스크롤로 넘긴다
    pan(dx, dy) {
      this.camFree = true;
      const y0 = this.cam.y;
      this.cam.x -= dx / this.z;
      this.cam.y -= dy / this.z;
      this.clampCam();
      return dy - (y0 - this.cam.y) * this.z;
    }

    clampCam() {
      const hw = this.w / 2 / this.z;
      const hh = this.h / 2 / this.z;
      this.cam.x = hw * 2 >= W ? W / 2 : MC.clamp(this.cam.x, hw, W - hw);
      this.cam.y = hh * 2 >= H ? H / 2 : MC.clamp(this.cam.y, hh, H - hh);
    }

    walkable(x, y) {
      if (x < 40 || y < 70 || x > W - 30 || y > H - 30) return false;
      const sx = shoreX(y);
      const onDock = y > DOCK.y0 + 6 && y < DOCK.y1 + 6 && x < sx + DOCK.len + 10;
      return x < sx - 22 || onDock;
    }

    // ── 조작 ─────────────────────────────────────────────
    setKeys(x, y) {
      this.keys.x = x;
      this.keys.y = y;
      if (x || y) {
        this.target = null;
        this.camFree = false;
      }
    }

    tap(sx, sy) {
      // 톡 하면 카메라는 다시 내 멍이를 따라간다
      this.camFree = false;
      const p = this.toWorld(sx, sy);
      // 다른 사람의 멍이를 톡 하면 하트를 보낸다. 겹쳐 있으면 앞에 있는 멍이가 먼저
      let hit = null;
      for (const v of this.visitors.values()) {
        if (!v.leaving && v.fade > 0.3 && v.pup.hit(p.x, p.y) && (!hit || v.pup.y > hit.pup.y)) hit = v;
      }
      if (this.pup.hit(p.x, p.y) && (!hit || hit.pup.y <= this.pup.y)) {
        this.pup.poke();
        return 'pup';
      }
      if (hit) {
        hit.pup.addHearts(2);
        hit.pup.hopV = -40;
        if (this.onBoop) this.onBoop(hit.id);
        if (this.onCute) this.onCute('boop');
        return 'boop';
      }
      const mk = this.moktakPos();
      if (this.near && this.near.id === 'moktak' && Math.hypot(p.x - mk.x, p.y - (mk.y - 10)) < 30) {
        this.hitMoktak();
        return 'moktak';
      }
      const tgt = { x: p.x, y: p.y };
      this.collide(tgt, 1.3);
      this.target = tgt;
      this.lastDist = Infinity;
      this.stuck = 0;
      return 'walk';
    }

    moktakPos() {
      return { x: PAVILION.x, y: PAVILION.y - 34 };
    }

    hitMoktak() {
      this.moktakHit = 1;
      const mk = this.moktakPos();
      // 정자 오른쪽 빈 풀밭 위로 떠오른다. 연달아 치면 조금씩 비켜서
      const n = this.texts.length;
      this.texts.push({ x: PAVILION.x + 150 + (n % 2 ? 34 : -10) + MC.rand(-8, 8), y: PAVILION.y - 30, t: 0, text: '번뇌 -1' });
      if (this.onMoktak) this.onMoktak();
      if (Math.random() < 0.35) this.pup.comfort();
    }

    // 장면에서 돌아오면 그 자리 곁에 선다
    placeAt(id) {
      const s = SPOTS.find((q) => q.id === id);
      if (!s) return;
      this.pup.x = s.x;
      this.pup.y = s.y + 24;
      this.pup.view = 'front';
      this.pup.restView = 'front';
      this.pup.baseTurn = 0;
      this.target = null;
      this.camFree = false;
      this.cam.x = this.pup.x;
      this.cam.y = this.pup.y - 40;
      this.clampCam();
    }

    // 함께 있는 사람들
    syncVisitors(list) {
      MC.syncVisitors(this.visitors, list, { outfit: 'beanie', light: { ambient: null, glow: [255, 170, 90], glowA: 0, from: 70 } });
    }

    netState() {
      const p = this.pup;
      return {
        p: 'map',
        x: Math.round(p.x),
        y: Math.round(p.y),
        w: this.moving ? 1 : 0,
        b: p.restView === 'back' ? 1 : 0,
        t: Math.round(p.baseTurn * 100) / 100,
        f: 1,
        z: p.sleeping ? 1 : 0,
        hp: p.heartBursts || 0,
      };
    }

    // 소리 섞기: 가까울수록 1
    presence() {
      const p = this.pup;
      const near = (d, r0, r1) => Math.pow(MC.clamp(1 - (d - r0) / (r1 - r0), 0, 1), 1.5);
      return {
        fire: near(Math.hypot(p.x - FIRE.x, p.y - FIRE.y), 60, 760),
        water: near(Math.max(0, shoreX(p.y) - p.x), 40, 820),
        forest: near(Math.hypot(p.x - 420, p.y - 370), 120, 900),
        pavilion: near(Math.hypot(p.x - PAVILION.x, p.y - PAVILION.y), 60, 520),
      };
    }

    // ── 움직임 ───────────────────────────────────────────
    update(dt) {
      this.t += dt;
      const pup = this.pup;
      let vx = 0;
      let vy = 0;
      const speed = 170;
      if (this.keys.x || this.keys.y) {
        const l = Math.hypot(this.keys.x, this.keys.y);
        vx = (this.keys.x / l) * speed;
        vy = (this.keys.y / l) * speed;
      } else if (this.target) {
        const dx = this.target.x - pup.x;
        const dy = this.target.y - pup.y;
        const d = Math.hypot(dx, dy);
        if (d < 6) this.target = null;
        else {
          const sp = Math.min(speed, d * 6);
          let ux = dx / d;
          let uy = dy / d;
          const [ax, ay] = this.steer(ux, uy);
          ux += ax * 1.8;
          uy += ay * 1.8;
          const ul = Math.hypot(ux, uy) || 1;
          vx = (ux / ul) * sp;
          vy = (uy / ul) * sp;
          // 한동안 가까워지지 않으면 막힌 것: 그 자리에 선다
          this.stuck = (this.lastDist || Infinity) - d < 20 * dt ? (this.stuck || 0) + dt : 0;
          this.lastDist = d;
          if (this.stuck > 0.6) {
            this.target = null;
            this.stuck = 0;
            vx = 0;
            vy = 0;
          }
        }
      }
      this.moving = Math.hypot(vx, vy) > 5;
      if (this.moving) {
        const nx = pup.x + vx * dt;
        const ny = pup.y + vy * dt;
        if (this.walkable(nx, ny)) {
          pup.x = nx;
          pup.y = ny;
        } else if (this.walkable(nx, pup.y)) pup.x = nx;
        else if (this.walkable(pup.x, ny)) pup.y = ny;
        else this.target = null;
        // 나무, 연등, 텐트, 모닥불, 정자에는 부딪힌다
        this.collide(pup);
        // 가는 쪽을 바라본다
        if (Math.abs(vx) > Math.abs(vy) * 0.75) {
          pup.view = 'front';
          pup.restView = 'front';
          pup.baseTurn = Math.sign(vx) * 0.85;
        } else if (vy < 0) {
          pup.view = 'back';
          pup.restView = 'back';
          pup.baseTurn = 0;
        } else {
          pup.view = 'front';
          pup.restView = 'front';
          pup.baseTurn = 0;
        }
      }
      const fireNear = this.presence().fire;
      pup.light.glowA = 0.45 * fireNear;
      pup.light.from = pup.x < FIRE.x ? 70 : -70;
      pup.k = 0.68;
      pup.update(dt, { walking: this.moving, E: 0.8 });
      for (const v of this.visitors.values()) {
        v.update(dt, { E: 0.8, walkEps: 2, jump: 700 });
        const p = v.pup;
        p.x = v.x;
        p.y = v.y;
        p.k = 0.68;
        const d = Math.hypot(p.x - FIRE.x, p.y - FIRE.y);
        p.light.glowA = 0.45 * Math.pow(MC.clamp(1 - (d - 60) / 700, 0, 1), 1.5);
        p.light.from = p.x < FIRE.x ? 70 : -70;
      }
      MC.dropFaded(this.visitors);

      // 카메라는 멍이를 부드럽게 따라간다 (손가락으로 끌어 둘러보는 동안에는 그 자리에 둔다)
      if (!this.camFree) {
        this.cam.x += (pup.x + vx * 0.25 - this.cam.x) * Math.min(1, dt * 3.2);
        this.cam.y += (pup.y - 40 + vy * 0.25 - this.cam.y) * Math.min(1, dt * 3.2);
      }
      this.clampCam();

      // 가장 가까운 자리
      let best = null;
      let bd = Infinity;
      for (const s of SPOTS) {
        const d = Math.hypot(pup.x - s.x, pup.y - s.y);
        if (d < s.r && d < bd) {
          bd = d;
          best = s;
        }
      }
      this.near = best;

      this.moktakHit = Math.max(0, this.moktakHit - dt * 4);
      for (const tx of this.texts) tx.t += dt;
      this.texts = this.texts.filter((tx) => tx.t < 1.4);
      this.chime += dt;

      // 모닥불에서 튀는 작은 불티
      const ev = this.fireEvents ? this.fireEvents() : null;
      const pops = ev ? ev.length : Math.random() < dt * 2 ? 1 : 0;
      for (let i = 0; i < pops * 3; i++) {
        this.sparks.push({ x: FIRE.x + MC.gauss() * 6, y: FIRE.y - 30, vx: MC.gauss() * 14, vy: -MC.rand(40, 90), f: 0, max: MC.rand(0.8, 1.6) });
      }
      for (const s of this.sparks) {
        s.f += dt / s.max;
        s.vy -= 6 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
      }
      this.sparks = this.sparks.filter((s) => s.f < 1);
    }

    // ── 그리기 ───────────────────────────────────────────
    draw(g) {
      if (!this.ground || !this.sp) return;
      const { w, h, z, t } = this;
      const sp = this.sp;
      const gs = this.gs;
      // 땅
      const vx0 = this.cam.x - w / 2 / z;
      const vy0 = this.cam.y - h / 2 / z;
      g.fillStyle = '#264a78';
      g.fillRect(0, 0, w, h);
      g.drawImage(this.ground, vx0 * gs, vy0 * gs, (w / z) * gs, (h / z) * gs, 0, 0, w, h);

      g.save();
      g.translate(w / 2, h / 2);
      g.scale(z, z);
      g.translate(-this.cam.x, -this.cam.y);
      const top = vy0 - 40;
      const bottom = vy0 + h / z + 200;

      // 바다: 물가로 밀려오는 물결 줄과 반짝임
      g.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const off = (i * 42 + t * 16) % 336;
        const a = 0.28 * (off / 336) * (1 - off / 336) * 4;
        g.strokeStyle = `rgba(220,238,255,${a * 0.6})`;
        g.lineWidth = 2;
        g.setLineDash([46 + (i % 3) * 14, 38 + (i % 2) * 22]);
        g.lineDashOffset = i * 37;
        g.beginPath();
        for (let y = top; y <= bottom; y += 24) {
          const x = shoreX(y) + 350 - off + Math.sin(y * 0.031 + i * 1.7 + t * 0.5) * 7;
          if (y === top) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
      }
      g.setLineDash([]);
      const swash = 6 + 6 * Math.sin(t * 0.63);
      g.strokeStyle = 'rgba(245,250,255,0.7)';
      g.lineWidth = 3;
      g.beginPath();
      for (let y = top; y <= bottom; y += 16) {
        const x = shoreX(y) - swash + Math.sin(y * 0.05 + t) * 2;
        if (y === top) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
      for (let i = 0; i < 40; i++) {
        const y = top + MC.hash(i * 3.1) * (bottom - top);
        const x = shoreX(y) + 40 + MC.hash(i * 7.7) * 400;
        const b = Math.sin(t * (1 + MC.hash(i) * 1.5) + i);
        if (b < 0.4) continue;
        g.fillStyle = `rgba(255,248,220,${(b - 0.4) * 0.9})`;
        g.fillRect(x - 6, y, 12, 1.6);
      }
      // 선착장
      const dock = sp.dock;
      g.drawImage(dock.c, shoreX(760) - 34 - dock.ax, DOCK.y1 - dock.ay, dock.w, dock.h);

      // 앞뒤 순서대로 세우기 (아래에 있을수록 앞)
      const items = [];
      for (const tr of this.trees) {
        if (tr.y < top || tr.y > bottom + 160) continue;
        items.push({ y: tr.y, d: () => {
          const s = sp[tr.kind][tr.v];
          const sway = Math.sin(t * 0.7 + tr.sway) * (tr.kind === 'bush' ? 0 : 0.8);
          g.drawImage(s.c, tr.x - s.ax + sway, tr.y - s.ay, s.w, s.h);
        } });
      }
      for (const ln of this.lanterns) {
        const i = LANTERN_COLORS.indexOf(ln.c);
        items.push({ y: ln.y, d: () => { const s = sp.lantern[i]; g.drawImage(s.c, ln.x - s.ax, ln.y - s.ay, s.w, s.h); } });
      }
      const put = (s, x, y) => items.push({ y, d: () => g.drawImage(s.c, x - s.ax, y - s.ay, s.w, s.h) });
      put(sp.tent, TENT.x, TENT.y);
      put(sp.pit, FIRE.x, FIRE.y);
      put(sp.pavilion, PAVILION.x, PAVILION.y);
      put(sp.stump, STUMP.x, STUMP.y);
      items.push({ y: PAVILION.y + 0.5, d: () => this.drawMoktak(g) });
      items.push({ y: PAVILION.y + 0.6, d: () => this.drawChime(g) });
      const left = vx0 - 120;
      const right = vx0 + w / z + 120;
      // 화면 안의 사람 가운데 내 곁부터 (MC.crowdMaxDrawn: 기기가 버거우면 줄어든다)
      let near = [];
      for (const v of this.visitors.values()) {
        const p = v.pup;
        if (p.y < top || p.y > bottom + 160 || p.x < left || p.x > right) continue;
        near.push(v);
      }
      const maxV = MC.crowdMaxDrawn ? MC.crowdMaxDrawn() : 16;
      if (near.length > maxV) {
        const me = this.pup;
        near.sort((a, b) => Math.hypot(a.pup.x - me.x, a.pup.y - me.y) - Math.hypot(b.pup.x - me.x, b.pup.y - me.y));
        near = near.slice(0, maxV);
      }
      for (const v of near) {
        const p = v.pup;
        items.push({ y: p.y, d: () => {
          const a = MC.clamp(v.fade, 0, 1);
          if (a < 1) g.globalAlpha = a;
          p.draw(g, z * (this.dpr || 1));
          g.globalAlpha = 1;
        } });
      }
      items.push({ y: this.pup.y, d: () => {
        if (this.visitors.size) MC.drawYouMark(g, this.pup, t);
        this.pup.draw(g, z * (this.dpr || 1));
      } });
      items.sort((a, b) => a.y - b.y);
      for (const it of items) it.d();
      if (this.hiddenBehind()) {
        g.globalAlpha = 0.45;
        this.pup.draw(g, z * (this.dpr || 1), true);
        g.globalAlpha = 1;
      }

      // 해 질 녘의 푸른 어스름
      g.restore();
      g.fillStyle = 'rgba(22,28,72,0.3)';
      g.fillRect(0, 0, w, h);

      // 불빛들
      g.save();
      g.translate(w / 2, h / 2);
      g.scale(z, z);
      g.translate(-this.cam.x, -this.cam.y);
      g.globalCompositeOperation = 'lighter';
      const fl = 0.85 + 0.15 * MC.fbm(t * 3.1);
      const glow = (rgb, x, y, r, a) => {
        g.globalAlpha = a;
        g.drawImage(this.glow(rgb), x - r, y - r * 0.7, r * 2, r * 1.4);
      };
      glow([255, 140, 60], FIRE.x, FIRE.y - 10, 260 * fl, 0.42);
      glow([255, 200, 120], TENT.x, TENT.y - 24, 70, 0.55);
      glow([255, 214, 150], PAVILION.x, PAVILION.y - 70, 110, 0.35);
      for (const ln of this.lanterns) {
        const a = 0.5 + 0.12 * Math.sin(t * 1.3 + ln.ph);
        glow(ln.c, ln.x + 9, ln.y - 34, 56, a);
        glow(MC.mix(ln.c, [255, 255, 255], 0.35), ln.x + 9, ln.y - 34, 14, 0.4);
      }
      for (const f of this.flies) {
        const fx = f.x + MC.fbm(t * 0.21 * f.sp + f.ph) * 40;
        const fy = f.y + MC.fbm(t * 0.17 * f.sp + f.ph * 1.3) * 30;
        if (fy < top || fy > bottom) continue;
        const b = Math.max(0, Math.sin(t * f.sp * 1.6 + f.ph));
        if (b < 0.05) continue;
        glow([210, 255, 140], fx, fy, 10, b * 0.9);
      }
      g.globalAlpha = 1;
      this.drawFire(g, fl);
      for (const s of this.sparks) {
        g.globalAlpha = Math.pow(1 - s.f, 1.4);
        g.fillStyle = '#ffcf7a';
        g.fillRect(s.x - 1, s.y - 1, 2, 2);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';

      // 번뇌 −1
      for (const tx of this.texts) {
        const u = tx.t / 1.4;
        g.globalAlpha = u < 0.15 ? u / 0.15 : 1 - Math.max(0, (u - 0.55) / 0.45);
        g.font = '700 46px Dongle, "Jua", sans-serif';
        g.textAlign = 'center';
        g.lineJoin = 'round';
        g.lineWidth = 6;
        g.strokeStyle = 'rgba(40,30,24,0.7)';
        g.strokeText(tx.text, tx.x, tx.y - u * 100);
        g.fillStyle = '#fff3d6';
        g.fillText(tx.text, tx.x, tx.y - u * 100);
      }
      g.globalAlpha = 1;
      g.restore();
    }

    // 멍이 앞(아래쪽)에 선 나무·텐트·정자가 멍이를 덮고 있는지
    hiddenBehind() {
      const p = this.pup;
      const hx = p.x;
      const hy = p.y - 45;
      const covers = (s, x, y, inset) => hx > x - s.ax + inset && hx < x - s.ax + s.w - inset && hy > y - s.ay + inset && hy < y - 8;
      for (const tr of this.trees) {
        if (tr.y <= p.y || tr.y - p.y > 180 || tr.kind === 'bush') continue;
        if (covers(this.sp[tr.kind][tr.v], tr.x, tr.y, 14)) return true;
      }
      if (TENT.y > p.y && covers(this.sp.tent, TENT.x, TENT.y, 24)) return true;
      if (PAVILION.y > p.y && covers(this.sp.pavilion, PAVILION.x, PAVILION.y, 26)) return true;
      return false;
    }

    drawFire(g, fl) {
      const w0 = 74;
      const h0 = 112;
      const x = FIRE.x - w0 / 2;
      const y = FIRE.y + 4 - h0;
      const c = MC.FireGL && MC.FireGL.available() ? MC.FireGL.render(w0 * this.z * (this.dpr || 1) * MC.FireGL.scale, h0 * this.z * (this.dpr || 1) * MC.FireGL.scale, this.t, 0.9 * fl, 3.3) : null;
      if (c) {
        g.drawImage(c, x, y, w0, h0);
      } else {
        // WebGL이 없으면 빛 덩어리를 겹쳐 작은 불을 만든다
        for (let i = 0; i < 4; i++) {
          const hh = (40 + 18 * MC.fbm(this.t * (2 + i * 0.4) + i * 3)) * fl;
          g.globalAlpha = 0.5;
          g.drawImage(this.glow([255, 150 - i * 20, 50]), FIRE.x - 14 + i * 6 - 10, FIRE.y - hh, 26, hh + 8);
        }
        g.globalAlpha = 1;
      }
    }

    drawMoktak(g) {
      const mk = this.moktakPos();
      const sq = 1 - 0.18 * this.moktakHit;
      g.save();
      g.translate(mk.x, mk.y);
      g.scale(1 + 0.1 * this.moktakHit, sq);
      g.lineJoin = 'round';
      ellipse(g, 0, -8, 13, 10);
      const grd = g.createRadialGradient(-4, -12, 1, 0, -8, 14);
      grd.addColorStop(0, '#c98a4f');
      grd.addColorStop(1, '#8a4f26');
      g.fillStyle = grd;
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 1.8;
      g.stroke();
      g.strokeStyle = '#4a2a14';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(-8, -5);
      g.quadraticCurveTo(0, -1, 8, -5);
      g.stroke();
      g.restore();
      // 채
      g.save();
      g.translate(mk.x + 14, mk.y - 6);
      g.rotate(-0.9 + this.moktakHit * 0.6);
      g.strokeStyle = '#6b4a33';
      g.lineWidth = 2.4;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(0, -16);
      g.stroke();
      ellipse(g, 0, -18, 3.4, 3.4);
      g.fillStyle = '#b07a4a';
      g.fill();
      g.restore();
    }

    // 처마 끝의 풍경: 바람에 살랑
    drawChime(g) {
      const x = PAVILION.x + 112;
      const y = PAVILION.y - 122;
      const a = Math.sin(this.chime * 1.7) * 0.18;
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.strokeStyle = '#3a3a3a';
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(0, 8);
      g.stroke();
      g.beginPath();
      g.moveTo(-5, 16);
      g.quadraticCurveTo(-5, 7, 0, 7);
      g.quadraticCurveTo(5, 7, 5, 16);
      g.closePath();
      g.fillStyle = '#7c8a7a';
      g.fill();
      g.strokeStyle = INK;
      g.stroke();
      g.fillStyle = '#d9b45a';
      g.beginPath();
      g.moveTo(0, 18);
      g.lineTo(-3, 25);
      g.lineTo(3, 25);
      g.closePath();
      g.fill();
      g.restore();
    }
  }

  MC.CampMap = CampMap;
  MC.CAMP_SPOTS = SPOTS;
})(window.MC = window.MC || {});
