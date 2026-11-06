/* 멍캠프 — 물멍: 블루아워의 달빛 바다. 파도는 10초마다 밀려온다.
   바다로 걸어 들어가면 털모자 빛깔의 튜브에 엎드려 둥실둥실 떠다닌다. 물을 저으면 야광 플랑크톤이 푸르게 반짝이고,
   가끔 먼 바다에서 고래가 숨을 쉰다(보는 사람 모두에게 같은 때). 마음에 걸리는 말은 유리병에 넣어 달빛 쪽으로 띄워 보낸다.
   잠수하면 유리 헬멧과 공기통을 착용하고 바닷속을 산책한다. 물 위로 나올 때는 원래 자리로 돌아온다. */
(function (MC) {
  'use strict';

  let SPR = null;
  function sprites() {
    if (SPR) return SPR;
    SPR = {
      moonGlow: MC.glow([214, 222, 255], 256, 0.12),
      column: MC.glow([255, 240, 205], 128, 0.3),
      lamp: MC.glow([255, 236, 190], 64, 0.15),
      star: MC.glow([226, 232, 255], 16, 0.22),
      glint: MC.glow([255, 244, 214], 32, 0.25),
      plankton: MC.glow([110, 225, 255], 16, 0.3),
      cloud: MC.glow([150, 140, 178], 128, 0.25),
      spout: MC.glow([214, 226, 255], 32, 0.3),
    };
    return SPR;
  }

  const easeOut = (x) => 1 - Math.pow(1 - x, 3);

  // 가끔 모래 위를 옆걸음으로 지나가는 꼬마 게. 누르면 집게를 흔든다
  class Crab {
    constructor() {
      this.active = false;
      this.next = MC.rand(10, 25);
      this.x = -60;
      this.dir = 1;
      this.t = 0;
      this.waveT = 0;
      this.blinkT = MC.rand(2, 5);
    }

    place(scene) {
      this.s = scene.s;
      this.w = scene.w;
      this.k = scene.s * 0.85;
      this.y = scene.sandTop + (scene.h - scene.sandTop) * 0.22;
    }

    update(dt) {
      this.t += dt;
      if (!this.active) {
        this.next -= dt;
        if (this.next <= 0) {
          this.active = true;
          this.dir = Math.random() < 0.5 ? 1 : -1;
          this.x = this.dir > 0 ? -40 : this.w + 40;
        }
        return;
      }
      this.waveT = Math.max(0, this.waveT - dt);
      this.blinkT -= dt;
      if (this.blinkT < -0.15) this.blinkT = MC.rand(2, 5);
      if (this.waveT <= 0) this.x += this.dir * 24 * this.s * dt;
      if ((this.dir > 0 && this.x > this.w + 50) || (this.dir < 0 && this.x < -50)) {
        this.active = false;
        this.next = MC.rand(35, 80);
      }
    }

    hit(x, y) {
      return this.active && Math.abs(x - this.x) < 30 * this.k && Math.abs(y - (this.y - 8 * this.k)) < 24 * this.k;
    }

    poke() {
      this.waveT = 1.6;
    }

    draw(g) {
      if (!this.active) return;
      const k = this.k;
      const walking = this.waveT <= 0;
      const step = walking ? this.t * 13 : 0;
      const ink = '#5b2a1c';
      g.save();
      g.translate(this.x, this.y - (walking ? Math.abs(Math.sin(step)) * 1.2 * k : 0));
      g.scale(k, k);
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.beginPath();
      g.ellipse(0, 2, 18, 3.4, 0, 0, Math.PI * 2);
      g.fill();
      // 다리
      g.strokeStyle = '#b4502f';
      g.lineWidth = 2.2;
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const ph = step + i * 1.4 + (side > 0 ? 0.7 : 0);
          g.beginPath();
          g.moveTo(side * (6 + i * 2.6), -2);
          g.quadraticCurveTo(side * (11 + i * 2.6), -6, side * (13 + i * 3) + Math.sin(ph) * 1.6, 2 + Math.cos(ph) * (walking ? 1.2 : 0));
          g.stroke();
        }
      }
      // 집게 (누르면 번쩍 들고 흔든다)
      const raise = this.waveT > 0 ? 0.5 + 0.5 * Math.sin(this.t * 10) : 0;
      for (const side of [-1, 1]) {
        g.strokeStyle = ink;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(side * 10, -6);
        g.lineTo(side * 15, -12 - 6 * raise);
        g.stroke();
        g.beginPath();
        g.ellipse(side * 16.5, -15 - 6 * raise, 5, 4.2, side * 0.4, 0, Math.PI * 2);
        g.fillStyle = '#f46c45';
        g.fill();
        g.lineWidth = 1.6;
        g.stroke();
        g.beginPath();
        g.moveTo(side * 16.5, -15 - 6 * raise);
        g.lineTo(side * 21, -18 - 6 * raise);
        g.stroke();
      }
      // 몸
      const grd = g.createLinearGradient(0, -14, 0, 3);
      grd.addColorStop(0, '#ff9b78');
      grd.addColorStop(1, '#e05634');
      g.beginPath();
      g.ellipse(0, -5, 13.5, 8.6, 0, 0, Math.PI * 2);
      g.fillStyle = grd;
      g.fill();
      g.strokeStyle = ink;
      g.lineWidth = 1.8;
      g.stroke();
      // 눈자루와 눈
      for (const side of [-1, 1]) {
        g.beginPath();
        g.moveTo(side * 3.6, -12);
        g.lineTo(side * 4.6, -17.5);
        g.stroke();
        g.beginPath();
        g.arc(side * 4.8, -19.2, 2.9, 0, Math.PI * 2);
        g.fillStyle = '#fffaf5';
        g.fill();
        g.lineWidth = 1.4;
        g.stroke();
        g.fillStyle = '#26160f';
        if (this.waveT > 0 || this.blinkT < 0) {
          g.beginPath();
          g.moveTo(side * 4.8 - 1.8, -18.8);
          g.quadraticCurveTo(side * 4.8, -21.2, side * 4.8 + 1.8, -18.8);
          g.stroke();
        } else {
          g.beginPath();
          g.arc(side * 4.8 + this.dir * 0.6, -19, 1.4, 0, Math.PI * 2);
          g.fill();
        }
      }
      // 볼과 입
      g.fillStyle = 'rgba(255,170,180,0.7)';
      g.beginPath();
      g.ellipse(-7.5, -3.5, 2.4, 1.4, 0, 0, Math.PI * 2);
      g.ellipse(7.5, -3.5, 2.4, 1.4, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = ink;
      g.lineWidth = 1.3;
      g.beginPath();
      g.moveTo(-2, -4.6);
      g.quadraticCurveTo(0, -2.6, 2, -4.6);
      g.stroke();
      g.restore();
    }
  }
  const easeInOut = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
  const INK = '#5b3d2c';

  // ── 장면 좌표 ─────────────────────────────────────────────
  // X: 화면 가로 천분율. Z: 0..1000 은 모래밭(클수록 앞), -ZW..0 은 젖은 물가,
  // 그보다 작으면 바다(-ZFAR 가 헤엄쳐 갈 수 있는 가장 먼 곳)
  const ZW = 70;
  const ZFAR = 1000;
  const ZMIN = 0.4; // 가장 먼 곳의 원근 (0 수평선 … 1 물가)
  const SEA_Z = -ZW * 0.5; // 이보다 바다 쪽이면 튜브에 엎드려 둥실둥실
  const WHALE_EVERY = 240; // 고래는 4분마다, 보는 사람 모두에게 같은 때 (벽시계)
  const WHALE_DUR = 16;

  // 사람마다 다른, 그러나 누구 화면에서나 같은 박자
  const strHash = (id) => {
    let h = 7;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return MC.hash(h * 0.0137);
  };

  // 줄무늬 고리 하나 (튜브). 옆에서 비스듬히 본 도넛
  function ring(g, cx, cy, RX, RY, rx, ry, rot, col, n = 12) {
    g.save();
    g.translate(cx, cy);
    g.rotate(rot);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + 0.13;
      const a1 = ((i + 1) / n) * Math.PI * 2 + 0.13;
      g.beginPath();
      g.ellipse(0, 0, RX, RY, 0, a0, a1);
      g.ellipse(0, 0, rx, ry, 0, a1, a0, true);
      g.closePath();
      g.fillStyle = i % 2 ? '#fff4e6' : col;
      g.fill();
    }
    // 둥근 몸통: 위는 밝게, 아래는 어둡게
    g.save();
    g.beginPath();
    g.ellipse(0, 0, RX, RY, 0, 0, Math.PI * 2);
    g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    g.clip('evenodd');
    const sh = g.createLinearGradient(0, -RY, 0, RY);
    sh.addColorStop(0, 'rgba(255,255,255,0.2)');
    sh.addColorStop(0.5, 'rgba(255,255,255,0)');
    sh.addColorStop(1, 'rgba(10,20,60,0.38)');
    g.fillStyle = sh;
    g.fillRect(-RX, -RY, RX * 2, RY * 2);
    g.restore();
    g.strokeStyle = INK;
    g.lineWidth = Math.max(1.2, RX * 0.034);
    g.beginPath();
    g.ellipse(0, 0, RX, RY, 0, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = Math.max(1, RX * 0.028);
    g.beginPath();
    g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    g.stroke();
    // 달빛 반짝
    g.strokeStyle = 'rgba(255,255,255,0.75)';
    g.lineWidth = Math.max(1.2, RX * 0.045);
    g.beginPath();
    g.ellipse(0, 0, (RX + rx) / 2 + RX * 0.04, (RY + ry) / 2 + RY * 0.06, 0, Math.PI * 1.08, Math.PI * 1.34);
    g.stroke();
    g.restore();
  }

  // 여럿이 오면 물가를 따라 나란히
  const WATER_SEATS = [
    [290, 340], [450, 420], [610, 330], [770, 430], [150, 450], [900, 350],
    [370, 720], [530, 780], [690, 720], [850, 780], [210, 780],
  ].map(([X, Z]) => ({ X, Z }));

  class WaterScene {
    constructor(opts = {}) {
      this.preview = !!opts.preview;
      this.quality = 1;
      this.t = 0;
      this.ripples = [];
      this.underwater = false;
      this.dive = new MC.DiveWorld();
      this.stone = null;
      this.plank = []; // 야광 플랑크톤 반짝임
      this.onRipple = null;
      this.onCute = null;
      this.onSplash = null;
      this.onWhale = null;
      this.onBottle = null;
      this.onToast = null;
      this.lastSplash = -1;
      this.crab = new Crab();
      this.floating = false;
      this.ph = [Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28];
      this.meteors = new MC.Meteors();
      this.nextStar = MC.rand(12, 28);
      this.whale = null;
      this.whaleK = null;
      this.whaleSpout = false;
      this.bottle = null;
      // 멍이: 스카프를 두르고 바다를 바라보는 뒷모습
      this.pup = new MC.Pup({
        outfit: 'scarf',
        view: 'back',
        light: { ambient: 'rgba(22,32,80,0.3)', glow: [205, 218, 255], glowA: 0.2, from: 70 },
      });
      this.pup.onEvent = (kind) => { if (this.onCute) this.onCute(kind); };
      // 함께 걷기: 모래밭을 걷다가 멈추면 바다를 바라보고 앉고, 바다로 들어가면 튜브를 탄다
      if (!this.preview && MC.Crowd) {
        this.crowd = new MC.Crowd(this.pup, {
          place: 'water',
          outfit: 'scarf',
          light: { ambient: 'rgba(22,32,80,0.3)', glow: [205, 218, 255], glowA: 0.2, from: 70 },
          start: { X: 290, Z: 340 },
          extra: () => ({ dv: this.underwater ? 1 : 0 }),
          visible: v => !!v.st.dv === this.underwater,
          toScreen: (X, Z) => this.toScreen(X, Z),
          toCanon: (x, y) => this.toCanon(x, y),
          bounds: () => {
            const m = Math.min(200, ((44 * this.s) / this.w) * 1000);
            return { x0: m, x1: 1000 - m, z0: -ZFAR, z1: 1000 };
          },
          blockers: () => [],
          floor: (x, y) => this.underwater || y > this.hy + 4,
          speed: () => (this.underwater ? 110 : this.crowd && this.crowd.me.Z < SEA_Z ? 72 : 140) * this.s,
          pose: (X, Z) => ({ view: this.underwater || Z < SEA_Z ? 'front' : 'back', turn: 0, flip: 1, stick: false }),
          seats: () => WATER_SEATS,
          env: () => ({
            wind: 0.45 + 0.25 * Math.sin(this.t * 0.31),
            walkEps: 4,
            lieOf: (st) => !st.dv && st.y < SEA_Z,
            restOf: (st) => st.dv ? 'dive' : st.y < SEA_Z ? 'tube' : null,
          }),
          drifting: (X, Z) => this.underwater || Z < SEA_Z,
          bob: (X, Z, id) => this.underwater ? Math.sin(this.t * 1.4 + (id ? strHash(id) * 6 : 0)) * 3 * this.s : Z < SEA_Z ? this.bobAt(X, Z, id) : 0,
          tilt: (p, me, v) => (p.rest === 'tube' ? 0.045 * Math.sin(this.t * 1.1 + (v ? strHash(v.id) * 6.28 : 1.3)) : 0),
          under: (g, p, me, v) => { if (this.underwater) this.dive.gear(g, p, false); else if (p.rest === 'tube') this.drawTube(g, p, v); },
          over: (g, p, me, v) => { if (this.underwater) this.dive.gear(g, p, true); else if (p.rest === 'tube') this.drawLap(g, p, v); },
        });
      }
      sprites();
    }

    // 걸을 수 있는 모래밭 띠
    band() {
      return { top: this.sandTop + 14 * this.s, bot: this.h - 10 * this.s };
    }

    // 바다의 원근: Z(<-ZW) → 0 수평선 … 1 물가
    seaDepth(Z) {
      return 1 - ((-Z - ZW) / (ZFAR - ZW)) * (1 - ZMIN);
    }

    toScreen(X, Z) {
      if (this.underwater) return { x: X / 1000 * this.w, y: this.h * (.27 + (Z + 1000) / 2000 * .55), k: this.s * .85 };
      const b = this.band();
      const x = (X / 1000) * this.w;
      if (Z >= 0) return { x, y: b.top + (Z / 1000) * (b.bot - b.top), k: this.s * 0.95 * (0.9 + (0.22 * Z) / 1000) };
      const k0 = this.s * 0.95 * 0.9;
      if (Z >= -ZW) return { x, y: this.sandTop + (b.top - this.sandTop) * (1 + Z / ZW), k: k0 };
      const z = this.seaDepth(Z);
      return { x, y: this.hy + (this.sandTop - this.hy) * Math.pow(z, 1.9), k: k0 * Math.pow(z, 0.9) };
    }

    toCanon(x, y) {
      if (this.underwater) return { X: x / this.w * 1000, Z: (y / this.h - .27) / .55 * 2000 - 1000 };
      const b = this.band();
      const X = (x / this.w) * 1000;
      if (y >= b.top) return { X, Z: ((y - b.top) / (b.bot - b.top)) * 1000 };
      if (y >= this.sandTop) return { X, Z: ZW * ((y - this.sandTop) / (b.top - this.sandTop) - 1) };
      const z = Math.pow(MC.clamp((y - this.hy) / (this.sandTop - this.hy), 0, 1), 1 / 1.9);
      return { X, Z: -ZW - ((1 - z) / (1 - ZMIN)) * (ZFAR - ZW) };
    }

    inSea(Z) {
      return Z < SEA_Z;
    }

    // 둥실둥실: 10초 너울(호흡과 같은 박자)에 작은 출렁임을 얹는다. 너울은 옆으로 지나간다
    bobAt(X, Z, id) {
      const k = this.toScreen(X, Z).k;
      const ph = id ? strHash(id) * 6.28 : 1.3;
      const swell = Math.sin((2 * Math.PI * MC.clock()) / MC.WAVE_T - X * 0.004);
      return (2.4 * Math.sin(this.t * 1.9 + ph) + 4.4 * swell) * k;
    }

    audioParams() {
      return { float: this.floating ? 1 : 0, dive: this.underwater ? 1 : 0 };
    }

    resize(w, h, dpr) {
      this.w = w;
      this.h = h;
      this.dpr = dpr;
      const portrait = w < h * 0.9;
      this.s = MC.clamp(Math.min(w / 520, h / 800), 0.6, 1.4);
      this.hy = Math.round(h * (portrait ? 0.47 : 0.53));
      this.sandTop = Math.round(h * (portrait ? 0.8 : 0.86));
      this.moon = this.moonAt();
      this.buildBackground();
      this.buildRows();
      this.dive.resize(w, h, this.s, dpr);
      const pup = this.pup;
      pup.k = this.s * 0.95;
      pup.x = w * (portrait ? 0.27 : 0.3);
      pup.y = this.sandTop + (h - this.sandTop) * (portrait ? 0.3 : 0.45);
      // 모래밭 뒤쪽, 물가 가까이 세워 둔 튜브 걸이
      this.stand = { x: w * (portrait ? 0.86 : 0.88), y: this.band().top + 10 * this.s };
      this.buildStand();
      if (this.crowd) this.crowd.layout();
      this.crab.place(this);
    }

    // 달: 몇 시간에 걸쳐 하늘을 천천히 오간다. 벽시계를 따르므로 같은 바다의 모두가 같은 달을 보고,
    // 다시 오면 달이 자리를 옮겨 있다. 수평선 아래로 지거나 곶 뒤로 가지는 않는다
    moonAt() {
      const { w, h, hy } = this;
      const portrait = w < h * 0.9;
      const bx = w * (portrait ? 0.66 : 0.63);
      const by = hy - Math.min(h * 0.2, 170);
      return {
        x: bx + w * (portrait ? 0.13 : 0.11) * MC.slow(70, 0.4),
        y: by + Math.min(h * 0.06, 50) * MC.slow(55, 2.1),
        r: 19 * this.s,
      };
    }

    // 가끔 달 앞을 지나가는 얇은 구름 하나, 그보다 높이 지나가는 구름 하나 (벽시계)
    cloudsNow() {
      const { w, s } = this;
      const m = this.moon;
      const L = w * 0.4;
      const span = w + L * 2;
      const v = 5 * s;
      const out = [];
      for (let i = 0; i < 2; i++) {
        const x = ((MC.world() * v * (1 - i * 0.18) + i * span * 0.55 + 97) % span) - L;
        const y = m.y + (i ? -64 : 6) * s + MC.slow(23 + i * 9, i * 2) * 6 * s;
        out.push({ x, y, L: L * (1 - i * 0.25), H: (13 - i * 3) * s });
      }
      return out;
    }

    drawMoon(g) {
      const { s, hy, sandTop } = this;
      const m = this.moon;
      const veil = this.veil || 0;
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.08 * (1 - 0.6 * veil);
      g.drawImage(SPR.moonGlow, m.x - m.r * 22, m.y - m.r * 22, m.r * 44, m.r * 44);
      g.globalAlpha = 0.35 * (1 - 0.6 * veil);
      g.drawImage(SPR.moonGlow, m.x - m.r * 6, m.y - m.r * 6, m.r * 12, m.r * 12);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1 - 0.45 * veil;
      const md = this.moonDisk;
      const D = m.r * 2 + 2 / this.dpr;
      g.drawImage(md, m.x - D / 2, m.y - D / 2, D, D);
      g.globalAlpha = 1;
      // 구름: 달빛을 받아 은은하게
      g.globalCompositeOperation = 'lighter';
      for (const c of this.clouds || []) {
        g.globalAlpha = 0.16;
        g.drawImage(SPR.cloud, c.x - c.L / 2, c.y - c.H, c.L, c.H * 2);
        g.globalAlpha = 0.1;
        g.drawImage(SPR.cloud, c.x - c.L * 0.3, c.y - c.H * 1.6, c.L * 0.5, c.H * 1.8);
      }
      // 달빛 기둥: 달이 옮겨 가면 바다 위의 길도 따라 옮겨 간다
      g.save();
      g.beginPath();
      g.rect(0, hy - 10, this.w, sandTop - hy + 10);
      g.clip();
      g.globalAlpha = 0.13 * (1 - 0.6 * veil);
      g.drawImage(SPR.column, m.x - 90 * s, hy - 10, 180 * s, (sandTop - hy) * 1.15);
      g.restore();
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }

    headland(x) {
      // 왼쪽 수평선의 낮은 곶
      const u = x / this.w;
      if (u > 0.34) return 0;
      const shape = Math.pow(1 - u / 0.34, 0.6);
      return (16 + 26 * Math.sin(u * 14 + 0.6) * 0.3) * this.s * shape + 6 * this.s * shape;
    }

    buildBackground() {
      const { w, h, dpr, hy, sandTop } = this;
      const rnd = MC.rng(777);
      const c = (this.bg = MC.canvas(w * dpr, h * dpr));
      const g = c.getContext('2d');
      g.scale(dpr, dpr);

      const sky = g.createLinearGradient(0, 0, 0, hy);
      sky.addColorStop(0, '#070e27');
      sky.addColorStop(0.5, '#15224c');
      sky.addColorStop(0.85, '#3a4476');
      sky.addColorStop(1, '#6a628a');
      g.fillStyle = sky;
      g.fillRect(0, 0, w, hy + 1);

      for (let i = 0; i < (w * hy) / 5200; i++) {
        const y = Math.pow(rnd(), 1.6) * hy * 0.7;
        g.fillStyle = `rgba(225,232,255,${0.2 + rnd() * 0.5})`;
        g.beginPath();
        g.arc(rnd() * w, y, 0.3 + Math.pow(rnd(), 3), 0, Math.PI * 2);
        g.fill();
      }
      this.twinkles = [];
      for (let i = 0; i < 18; i++) this.twinkles.push({ x: rnd() * w, y: rnd() * hy * 0.55, r: 0.8 + rnd() * 1.1, ph: rnd() * 6.28, sp: 0.3 + rnd() });

      // 수평선 가까이 얇게 깔린 구름
      g.globalCompositeOperation = 'lighter';
      const cloud = MC.glow([150, 130, 170], 128, 0.25);
      for (let i = 0; i < 7; i++) {
        const cw = w * (0.25 + rnd() * 0.4);
        const cy = hy - (8 + rnd() * 60) * this.s;
        g.globalAlpha = 0.08 + rnd() * 0.08;
        g.drawImage(cloud, rnd() * w - cw / 2, cy - 5 * this.s, cw, (6 + rnd() * 8) * this.s);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      // 달은 아주 천천히 하늘을 건너가므로 매 프레임 그린다 (drawMoon). 둥근 달 그림만 한 번 만들어 둔다
      const mr = this.moon.r;
      const md = (this.moonDisk = MC.canvas(Math.ceil(mr * 2 * dpr) + 2, Math.ceil(mr * 2 * dpr) + 2));
      const mg = md.getContext('2d');
      mg.scale(dpr, dpr);
      mg.translate(mr + 1 / dpr, mr + 1 / dpr);
      const disk = mg.createRadialGradient(-mr * 0.3, -mr * 0.3, mr * 0.1, 0, 0, mr);
      disk.addColorStop(0, '#fffbef');
      disk.addColorStop(1, '#e6dfc9');
      mg.fillStyle = disk;
      mg.beginPath();
      mg.arc(0, 0, mr, 0, Math.PI * 2);
      mg.fill();
      mg.fillStyle = 'rgba(160,150,130,0.18)';
      for (const [dx, dy, rr] of [[-0.3, -0.2, 0.22], [0.25, 0.15, 0.3], [0.05, -0.45, 0.14]]) {
        mg.beginPath();
        mg.arc(dx * mr, dy * mr, rr * mr, 0, Math.PI * 2);
        mg.fill();
      }

      // 바다
      const sea = g.createLinearGradient(0, hy, 0, sandTop);
      sea.addColorStop(0, '#587b8a');
      sea.addColorStop(0.12, '#323a68');
      sea.addColorStop(0.55, '#1c4a64');
      sea.addColorStop(1, '#153e50');
      g.fillStyle = sea;
      g.fillRect(0, hy, w, sandTop - hy + 2);

      // 곶과 등대
      g.fillStyle = '#0a1024';
      g.beginPath();
      g.moveTo(0, hy + 1);
      for (let x = 0; x <= w * 0.36; x += 6) g.lineTo(x, hy - this.headland(x));
      g.lineTo(w * 0.36, hy + 1);
      g.closePath();
      g.fill();
      const lx = w * 0.17;
      const top = hy - this.headland(lx);
      g.fillRect(lx - 2.2 * this.s, top - 17 * this.s, 4.4 * this.s, 17 * this.s);
      this.lamp = { x: lx, y: top - 18 * this.s };

      // 모래
      const sand = g.createLinearGradient(0, sandTop, 0, h);
      sand.addColorStop(0, '#1c2036');
      sand.addColorStop(1, '#262839');
      g.fillStyle = sand;
      g.fillRect(0, sandTop, w, h - sandTop);
      for (let i = 0; i < (w * (h - sandTop)) / 40; i++) {
        g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '200,205,230'},${0.04 + rnd() * 0.05})`;
        g.fillRect(rnd() * w, sandTop + rnd() * (h - sandTop), 1, 1);
      }
      // 모래 위 조개껍데기와 불가사리 몇 개
      for (let i = 0; i < 7; i++) {
        const x = rnd() * w;
        const y = sandTop + (0.25 + rnd() * 0.7) * (h - sandTop);
        const r = (2.2 + rnd() * 2.2) * this.s;
        g.save();
        g.translate(x, y);
        g.rotate(rnd() * 6.28);
        if (i % 3 === 0) {
          g.fillStyle = 'rgba(232,170,140,0.55)';
          g.beginPath();
          for (let a = 0; a < 5; a++) {
            const t0 = (a / 5) * Math.PI * 2;
            g.lineTo(Math.cos(t0) * r * 1.6, Math.sin(t0) * r * 1.6);
            g.lineTo(Math.cos(t0 + Math.PI / 5) * r * 0.6, Math.sin(t0 + Math.PI / 5) * r * 0.6);
          }
          g.closePath();
          g.fill();
        } else {
          g.fillStyle = 'rgba(226,218,236,0.5)';
          g.beginPath();
          g.ellipse(0, 0, r * 1.2, r * 0.9, 0, Math.PI, 0);
          g.lineTo(r * 0.3, r * 0.5);
          g.lineTo(-r * 0.3, r * 0.5);
          g.closePath();
          g.fill();
        }
        g.restore();
      }

      const v = (this.vignette = MC.canvas(w * dpr, h * dpr));
      const vg = v.getContext('2d');
      vg.scale(dpr, dpr);
      const rad = vg.createRadialGradient(w / 2, h * 0.5, Math.min(w, h) * 0.3, w / 2, h * 0.5, Math.max(w, h) * 0.85);
      rad.addColorStop(0, 'rgba(0,0,0,0)');
      rad.addColorStop(1, 'rgba(0,0,0,0.45)');
      vg.fillStyle = rad;
      vg.fillRect(0, 0, w, h);
    }

    buildRows() {
      const rnd = MC.rng(99);
      const n = Math.round(MC.clamp((this.sandTop - this.hy) / 6, 36, 88));
      this.rows = [];
      for (let i = 0; i < n; i++) {
        const z = (i + 1) / n; // 0 먼 바다 → 1 발밑
        const glints = [];
        const gN = Math.round(2 + z * 9);
        for (let k = 0; k < gN; k++) {
          glints.push({ o: MC.clamp((rnd() + rnd() + rnd() - 1.5) * 0.9, -1.3, 1.3), sp: 0.6 + rnd() * 1.2, ph: rnd() * 6.28, len: 0.5 + rnd() });
        }
        this.rows.push({
          z,
          y: this.hy + (this.sandTop - this.hy) * Math.pow(z, 1.9),
          amp: (0.4 + 6.5 * z * z) * this.s,
          k: (0.012 + 0.03 * (1 - z)) / this.s,
          ph: rnd() * 6.28,
          ph2: rnd() * 6.28,
          sp: 0.5 + rnd() * 0.4,
          glints,
        });
      }
    }

    // 모래밭에 세워 둔 튜브 걸이: 나무 말뚝에 줄무늬 튜브 셋
    buildStand() {
      const { dpr, s } = this;
      const W = 110 * s;
      const H = 100 * s;
      const c = (this.standImg = MC.canvas(W * dpr, H * dpr));
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      g.translate(W / 2, H - 8 * s);
      g.scale(s, s);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.beginPath();
      g.ellipse(0, 2, 44, 7, 0, 0, Math.PI * 2);
      g.fill();
      // 바닥에 눕혀 둔 노란 튜브
      ring(g, 4, -6, 30, 10, 16, 4.6, 0, '#ffd56b', 10);
      // 말뚝
      const post = g.createLinearGradient(-5, 0, 5, 0);
      post.addColorStop(0, '#8a6a52');
      post.addColorStop(1, '#5a4130');
      g.fillStyle = post;
      g.strokeStyle = INK;
      g.lineWidth = 2;
      MC.roundRect(g, -5, -78, 10, 76, 4);
      g.fill();
      g.stroke();
      // 말뚝에 걸어 둔 둘
      ring(g, -13, -44, 24, 23, 12, 11, -0.25, '#f2826a', 10);
      ring(g, 15, -52, 22, 21, 11, 10, 0.3, '#86d6c4', 10);
      // 말뚝 머리
      g.fillStyle = '#9b7a60';
      g.beginPath();
      g.ellipse(0, -78, 6, 2.6, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      this.standBox = { W, H, ox: W / 2, oy: H - 8 * s };
    }

    hitStand(x, y) {
      const st = this.stand;
      return Math.abs(x - st.x) < 40 * this.s && y > st.y - 84 * this.s && y < st.y + 8 * this.s;
    }

    waveY(r, x) {
      const t = this.t;
      return r.y + r.amp * (0.6 * Math.sin(r.k * x + r.sp * t + r.ph) + 0.4 * Math.sin(1.73 * r.k * x - 0.7 * r.sp * t + r.ph2));
    }

    pointerDown(x, y) {
      if (this.underwater) {
        if (this.dive.poke(x, y, this.crowd)) {
          if (this.onRipple) this.onRipple(.3, x / this.w * 2 - 1);
          return true;
        }
        if (this.pup.hit(x, y)) { this.pup.poke(); return true; }
        if (this.crowd && this.crowd.boopAt(x, y)) return true;
        this.dive.burst(x, y, 3);
        return !!(this.crowd && this.crowd.walkTo(x, y));
      }
      if (this.pup.hit(x, y)) {
        this.pup.poke();
        return true;
      }
      if (this.crab.hit(x, y)) {
        this.crab.poke();
        if (this.onCute) this.onCute('crab');
        return true;
      }
      // 함께 앉은 다른 멍이에게 하트
      if (this.crowd && this.crowd.boopAt(x, y)) {
        if (this.onCute) this.onCute('boop');
        return true;
      }
      // 튜브 걸이를 톡: 튜브를 들고 바다로
      if (this.crowd && this.hitStand(x, y)) {
        this.usePortal();
        return true;
      }
      // 모래밭을 톡: 그쪽으로 걸어간다
      if (y > this.sandTop - 2) return !!(this.crowd && this.crowd.walkTo(x, y));
      if (y < this.hy + 4) return false;
      // 바다를 톡: 동그랗게 물결이 퍼지고, 멍이는 그쪽으로 헤엄쳐 간다
      this.ripple(x, y);
      if (this.crowd) this.crowd.walkTo(x, y);
      return true;
    }

    ripple(x, y) {
      const z = (y - this.hy) / (this.sandTop - this.hy);
      this.ripples.push({ x, y, z, age: 0 });
      if (this.ripples.length > 12) this.ripples.shift();
      this.spark(x, y, 8, 26 * this.s * (0.3 + 1.2 * z), this.s * (0.4 + 0.8 * z), 0.55);
      if (this.onRipple) this.onRipple(z, (x / this.w) * 2 - 1);
    }

    rippleAt() {
      if (this.underwater) { this.dive.burst(this.pup.x, this.pup.y - 55 * this.pup.k, 8); return true; }
      if (this.stone) return false;
      const x = MC.clamp(this.pup.x / this.w, .2, .8), dir = x > .5 ? -1 : 1;
      this.stone = { age: 0, hop: 0, count: 3 + Math.floor(Math.random() * 3), x, dir };
      return true;
    }

    stoneAt(u) {
      const q = this.stone;
      return { x: (q.x + q.dir * .32 * u) * this.w, y: MC.lerp(this.hy, this.sandTop, .85 - .58 * u) };
    }

    updateStone(dt) {
      const q = this.stone;
      if (!q) return;
      q.age += dt;
      const hop = Math.min(q.count, Math.floor(q.age / .42));
      if (hop > q.hop) {
        for (let i = q.hop + 1; i <= hop; i++) { const p = this.stoneAt(i / q.count); this.ripple(p.x, p.y); }
        q.hop = hop;
      }
      if (q.age >= q.count * .42) {
        this.stone = null;
        if (this.onToast) this.onToast(`통통, ${q.count}번 물수제비!`);
      }
    }

    drawStone(g) {
      const q = this.stone;
      if (!q) return;
      const u = MC.clamp(q.age / (q.count * .42), 0, 1), p = this.stoneAt(u);
      const lift = Math.sin((q.age / .42 % 1) * Math.PI) * 34 * this.s * (1 - .65 * u);
      g.fillStyle = '#b8c7c5'; g.strokeStyle = '#527c82'; g.lineWidth = this.s;
      g.beginPath(); g.ellipse(p.x, p.y - lift, 4 * this.s * (1 - .5 * u), 2 * this.s, -.3, 0, Math.PI * 2); g.fill(); g.stroke();
    }

    toggleDive() {
      const c = this.crowd;
      if (!c) return false;
      const on = !this.underwater;
      if (on) this.surfacePos = { X: c.me.X, Z: c.me.Z };
      this.underwater = on;
      this.dive.pending = null;
      c.target = c.path = c.portal = null;
      c.moving = false; c.setKeys(0, 0); c.roomMade = true; c.posed = false;
      c.me.X = on ? MC.clamp(c.me.X, 180, 820) : this.surfacePos.X;
      c.me.Z = on ? 0 : this.surfacePos.Z;
      this.floating = !on && this.inSea(c.me.Z);
      const p = this.pup;
      p.setChair(false); p.chair = 0; p.setLie(false); p.lie = 0; p.paddle = 0;
      p.rest = on ? 'dive' : this.floating ? 'tube' : null;
      p.setLie(this.floating);
      p.view = p.restView = on || this.floating ? 'front' : 'back'; p.baseTurn = 0; p.headDrop = 0;
      c.layout();
      if (on) this.dive.burst(p.x, p.y - 55 * p.k, 9);
      if (this.onToast) this.onToast(on ? '잠수 준비 완료!' : '달빛 바다로 돌아왔어요');
      return on;
    }

    // 야광 플랑크톤: 물이 흔들린 자리에서 푸르게 반짝이다 스러진다
    spark(x, y, n, spread, k, a = 1) {
      const max = Math.round(300 * MC.clamp(this.quality, 0.4, 1));
      for (let i = 0; i < n; i++) {
        if (this.plank.length >= max) this.plank.shift();
        this.plank.push({
          x: x + MC.rand(-spread, spread),
          y: y + MC.rand(-spread, spread) * 0.3,
          vx: MC.rand(-7, 7) * k,
          vy: MC.rand(-2, 2) * k,
          age: 0,
          life: MC.rand(1.3, 2.8),
          r: MC.rand(1, 2.3) * k,
          ph: Math.random() * 6.28,
          a,
        });
      }
    }

    // ── 튜브 걸이 앞의 '튜브 타기' ───────────────────────────────
    portalHint() {
      const c = this.crowd;
      if (!c || this.underwater || this.floating || c.moving || c.target || c.portal || this.bottle) return null;
      const st = this.stand;
      return { x: st.x, y: st.y - 86 * this.s, label: '튜브 타기' };
    }

    usePortal() {
      if (this.underwater) return;
      const c = this.crowd;
      if (!c) return;
      const X = MC.clamp(c.me.X, 150, 850);
      c.go(c.clampIn({ X, Z: -240 - Math.random() * 160 }));
    }

    // ── 유리병 편지 ─────────────────────────────────────────────
    // 적은 말은 어디에도 남지 않는다. 병만 달빛 기둥을 따라 멀어진다
    sendBottle() {
      if (this.underwater || this.bottle) return false;
      const p = this.pup;
      const from = { x: p.x + 10 * p.k, y: p.y - 70 * p.k };
      const entryY = this.floating ? p.y + 4 * p.k : MC.lerp(this.hy, this.sandTop, 0.9);
      const entry = { x: p.x + (this.floating ? 70 : 30) * p.k, y: entryY };
      this.bottle = {
        t: 0,
        from,
        entry,
        end: { x: this.moon.x + MC.rand(-24, 24) * this.s, y: this.hy + (this.sandTop - this.hy) * 0.02 },
        splashed: false,
      };
      return true;
    }

    bottleState(b) {
      const THROW = 0.7;
      const DUR = 22;
      if (b.t < THROW) {
        const u = b.t / THROW;
        return { x: MC.lerp(b.from.x, b.entry.x, u), y: MC.lerp(b.from.y, b.entry.y, u) - 60 * this.s * Math.sin(Math.PI * u), rot: u * 5, k: this.s * 0.9, air: true };
      }
      const u = MC.clamp((b.t - THROW) / DUR, 0, 1);
      const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      const x = MC.lerp(b.entry.x, b.end.x, e);
      const y0 = MC.lerp(b.entry.y, b.end.y, Math.pow(e, 0.8));
      const z = Math.pow(MC.clamp((y0 - this.hy) / (this.sandTop - this.hy), 0.001, 1), 1 / 1.9);
      const k = this.s * 0.9 * Math.pow(z, 0.9);
      return { x, y: y0 + Math.sin(b.t * 1.9) * 2.2 * k, rot: 0.25 * Math.sin(b.t * 1.3), k, air: false, u, done: u >= 1 };
    }

    drawBottle(g) {
      const b = this.bottle;
      const q = this.bottleState(b);
      const fade = q.air ? 1 : MC.clamp((1 - q.u) * 6, 0, 1);
      g.save();
      g.globalAlpha = fade;
      g.translate(q.x, q.y);
      g.rotate(q.rot);
      g.scale(q.k, q.k);
      g.lineJoin = 'round';
      if (!q.air) {
        g.fillStyle = 'rgba(3,8,26,0.35)';
        g.beginPath();
        g.ellipse(0, 6, 24, 5, 0, 0, Math.PI * 2);
        g.fill();
      }
      // 유리 몸통과 목
      g.fillStyle = 'rgba(170,226,214,0.6)';
      g.strokeStyle = 'rgba(40,70,80,0.9)';
      g.lineWidth = 1.8;
      MC.roundRect(g, -17, -8, 26, 16, 7);
      g.fill();
      g.stroke();
      MC.roundRect(g, 8, -4, 9, 8, 2.5);
      g.fill();
      g.stroke();
      // 코르크
      g.fillStyle = '#c9925e';
      MC.roundRect(g, 16, -3.4, 5, 6.8, 1.6);
      g.fill();
      g.stroke();
      // 안에 말아 넣은 편지
      g.fillStyle = '#fff1d6';
      MC.roundRect(g, -12, -4.2, 17, 8.4, 3);
      g.fill();
      g.strokeStyle = 'rgba(180,120,80,0.6)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(-3, -4);
      g.lineTo(-3, 4);
      g.stroke();
      // 달빛 반짝
      g.strokeStyle = 'rgba(255,255,255,0.85)';
      g.lineWidth = 1.8;
      g.beginPath();
      g.moveTo(-12, -5);
      g.lineTo(2, -5);
      g.stroke();
      if (!q.air) {
        g.strokeStyle = 'rgba(200,215,255,0.35)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.ellipse(0, 5, 26 + Math.sin(b.t * 2) * 2, 5, 0, 0, Math.PI);
        g.stroke();
      }
      g.restore();
    }

    // ── 움직임 ─────────────────────────────────────────────
    // 물 위에서 가만히 있으면 잔잔한 물살을 따라 천천히 떠다닌다. 물가와 먼 끝, 다른 튜브는 살며시 비켜 간다
    drift(dt) {
      const c = this.crowd;
      if (!c || !this.inSea(c.me.Z) || c.target || c.keys.x || c.keys.y || c.portal) return;
      const t = this.t;
      const [p1, p2, p3] = this.ph;
      let vx = 7 * Math.sin(t * 0.071 + p1) + 4 * Math.sin(t * 0.163 + p2);
      let vz = 5 * Math.sin(t * 0.053 + p3) + 2.5 * Math.sin(t * 0.21 + p1);
      const shore = -ZW - 110;
      if (c.me.Z > shore) vz -= (c.me.Z - shore) * 0.12;
      const far = -ZFAR + 90;
      if (c.me.Z < far) vz += (far - c.me.Z) * 0.12;
      const b = c.cfg.bounds();
      if (c.me.X < b.x0 + 70) vx += (b.x0 + 70 - c.me.X) * 0.12;
      if (c.me.X > b.x1 - 70) vx -= (c.me.X - (b.x1 - 70)) * 0.12;
      for (const v of c.visitors.values()) {
        if (v.leaving || !(v.st.y < SEA_Z)) continue;
        const dx = c.me.X - v.x;
        const dz = c.me.Z - v.y;
        const d = Math.hypot(dx, dz);
        if (d < 130 && d > 0.01) {
          vx += (dx / d) * (130 - d) * 0.3;
          vz += (dz / d) * (130 - d) * 0.3;
        }
      }
      c.me.X = MC.clamp(c.me.X + vx * dt, b.x0, b.x1);
      c.me.Z = MC.clamp(c.me.Z + vz * dt, b.z0, SEA_Z - 1);
    }

    // 먼 바다의 고래: 벽시계로 정해 두어 같은 곳의 모두가 같은 때 본다
    whaleNow() {
      const now = Date.now() / 1000;
      const k = Math.floor(now / WHALE_EVERY);
      const u = now - k * WHALE_EVERY;
      if (u > WHALE_DUR) return null;
      return { k, u, x: this.moon.x + (MC.hash(k * 7.31 + 3) - 0.5) * this.w * 0.42, dir: MC.hash(k * 3.1) < 0.5 ? -1 : 1 };
    }

    update(dt) {
      this.t += dt;
      if (this.underwater) {
        if (this.crowd) this.crowd.update(dt);
        this.pup.rest = 'dive'; this.pup.setLie(false);
        this.pup.view = this.pup.restView = 'front';
        this.pup.update(dt, { wind: .12, walking: false, noSleep: true });
        this.dive.onToast = msg => this.onToast?.(msg);
        this.dive.update(dt, this.pup);
        return;
      }
      this.updateStone(dt);
      const s = this.s;
      // 달과 구름은 벽시계를 따라 아주 천천히
      this.moon = this.moonAt();
      this.clouds = this.cloudsNow();
      let veil = 0;
      for (const c of this.clouds) {
        if (Math.abs(c.y - this.moon.y) > c.H + this.moon.r) continue;
        veil = Math.max(veil, Math.max(0, 1 - Math.abs(c.x - this.moon.x) / (c.L * 0.5)));
      }
      this.veil = 0.38 * veil;
      for (const r of this.ripples) r.age += dt;
      this.ripples = this.ripples.filter((r) => r.age < 4.5);
      for (const q of this.plank) {
        q.age += dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.vx *= 1 - dt * 0.8;
        q.vy *= 1 - dt * 0.8;
      }
      this.plank = this.plank.filter((q) => q.age < q.life);
      this.crab.update(dt);
      const c = this.crowd;
      if (c) {
        this.drift(dt);
        c.update(dt);
      }
      // 내 멍이: 바다에 들어가면 튜브에 엎드리고, 나오면 일어나 앉는다
      const pup = this.pup;
      const floating = !!(c && this.inSea(c.me.Z));
      if (floating !== this.floating) {
        this.floating = floating;
        pup.rest = floating ? 'tube' : null;
        pup.setLie(floating);
        if (floating) {
          pup.sleepAfter = Math.min(pup.sleepAfter, 30);
          this.splashAt(pup.x, pup.y, pup.k);
          if (this.onSplash) this.onSplash();
        }
      }
      pup.paddle += ((floating && c.moving ? 1 : 0) - pup.paddle) * Math.min(1, dt * 5);
      // 다른 사람 멍이: 바다에 들어오면 첨벙, 저으면 앞발이 움직인다
      if (c) {
        for (const v of c.visitors.values()) {
          if (!c.sees(v)) continue;
          const sea = v.st.y < SEA_Z;
          if (v.sea !== sea) {
            if (v.sea !== undefined && sea && v.fade > 0.5) this.splashAt(v.pup.x, v.pup.y, v.pup.k);
            v.sea = sea;
          }
          v.pup.paddle += ((sea && v.st.w ? 1 : 0) - v.pup.paddle) * Math.min(1, dt * 5);
        }
      }
      // 튜브가 지나간 자리에 남는 푸른 반짝임
      const trail = (p) => {
        if (p.rest !== 'tube') {
          p.trailAt = null;
          return;
        }
        if (p.trailAt) {
          const d = Math.hypot(p.x - p.trailAt.x, p.y - p.trailAt.y);
          p.trailAcc = (p.trailAcc || 0) + dt * (1 + (d / Math.max(dt, 1e-3)) * 0.12) * MC.clamp(this.quality, 0.4, 1);
          while (p.trailAcc >= 1) {
            p.trailAcc -= 1;
            this.spark(p.x + MC.rand(-60, 60) * p.k, p.y + 18 * p.k, 1, 0, p.k);
          }
        }
        p.trailAt = { x: p.x, y: p.y };
      };
      if (c) c.each((p) => trail(p));
      // 부서지는 파도 끝에도 옅은 푸른빛
      const sw = this.swash(MC.clock());
      const bb = Math.exp(-Math.pow((sw.p - 0.33) / 0.07, 2)) * sw.amp;
      if (bb > 0.25 && Math.random() < bb * dt * 30 * MC.clamp(this.quality, 0.4, 1)) {
        this.spark(Math.random() * this.w, this.sandTop - (3 + 4 * bb) * s, 2, 6 * s, s);
      }
      // 별똥별
      this.nextStar -= dt;
      if (this.nextStar <= 0 && !this.meteors.busy) {
        this.nextStar = MC.rand(35, 75);
        // 천천히 미끄러지는 별똥별, 바다에 옅게 비친다. 가끔은 한두 개가 뒤따른다
        const dir = Math.random() < 0.5 ? -1 : 1;
        const x = (dir > 0 ? MC.rand(0.06, 0.5) : MC.rand(0.5, 0.94)) * this.w;
        this.meteors.spawn(x, this.hy * MC.rand(0.06, 0.26), dir, s, MC.rand(0.28, 0.48), 0.3);
      }
      this.meteors.update(dt);
      // 고래
      const wh = this.whaleNow();
      if (wh) {
        if (this.whaleK !== wh.k) {
          this.whaleK = wh.k;
          this.whaleSpout = false;
          if (wh.u < 3 && this.onWhale) this.onWhale('song');
        }
        if (!this.whaleSpout && wh.u >= 2.6) {
          this.whaleSpout = true;
          if (wh.u < 4 && this.onWhale) this.onWhale('spout');
        }
      }
      this.whale = wh;
      // 유리병
      if (this.bottle) {
        const b = this.bottle;
        b.t += dt;
        const q = this.bottleState(b);
        if (!q.air && !b.splashed) {
          b.splashed = true;
          this.ripple(q.x, q.y);
          if (this.onBottle) this.onBottle();
        }
        if (q.done) {
          this.spark(q.x, q.y, 10, 8 * s, s * 0.5);
          this.bottle = null;
          if (this.onToast) this.onToast('달빛을 따라 멀리 떠나갔어요');
        }
      }
      pup.update(dt, { wind: 0.45 + 0.25 * Math.sin(this.t * 0.31), walking: !!(c && c.moving) });
      // 파도가 발끝까지 오면 멍이가 폴짝 (함께 앉은 멍이들도). 튜브 위의 멍이는 그대로 둥실
      if (sw.adv > 0.05) {
        const reach = this.sandTop + sw.reach * sw.adv;
        const wet = (p, who) => {
          if (p.rest || who.lastSplash === sw.k || reach < p.y - 3 * s) return;
          who.lastSplash = sw.k;
          p.splash();
        };
        if (c) c.each((p, me, v) => wet(p, me ? this : v));
        else wet(this.pup, this);
      }
    }

    splashAt(x, y, k) {
      this.ripples.push({ x, y: y + 10 * k, z: MC.clamp((y - this.hy) / (this.sandTop - this.hy), 0, 1), age: 0 });
      if (this.ripples.length > 12) this.ripples.shift();
      this.spark(x, y + 12 * k, 14, 50 * k, k, 0.7);
    }

    // 한 파도의 진행 상태. 소리와 같은 시계(MC.clock)를 쓴다
    swash(now) {
      const T = MC.WAVE_T;
      const k = Math.floor(now / T);
      const p = now / T - k;
      const amp = MC.waveAmp(k);
      const reach = Math.min((this.h - this.sandTop) * 0.8 * amp, this.h - this.sandTop - 4);
      let adv = 0;
      if (p >= 0.34 && p < 0.52) adv = easeOut((p - 0.34) / 0.18);
      else if (p >= 0.52 && p < 0.97) adv = 1 - easeInOut((p - 0.52) / 0.45);
      return { k, p, amp, reach, adv };
    }

    // ── 그리기 ─────────────────────────────────────────────
    // 튜브: 멍이 털모자 빛깔과 하얀 줄무늬. 멍이는 그 위에 엎드려 있다
    drawTube(g, p, v) {
      const k = p.k;
      const hat = p.hat || { top: '#f27c5e' };
      const t = this.t + (v ? strHash(v.id) * 9 : 0);
      g.save();
      g.translate(p.x, p.y + 4 * k);
      g.scale(k, k);
      // 뒤쪽으로 퍼지는 물결 (앞쪽 반은 멍이 위에 그린다)
      const u = (t * 0.4) % 1;
      g.strokeStyle = `rgba(200,215,255,${0.26 * (1 - u)})`;
      g.lineWidth = 1.3;
      g.beginPath();
      g.ellipse(0, 11, 78 + u * 46, 18 + u * 10, 0, Math.PI, Math.PI * 2);
      g.stroke();
      g.fillStyle = 'rgba(3,8,26,0.4)';
      g.beginPath();
      g.ellipse(0, 12, 84, 21, 0, 0, Math.PI * 2);
      g.fill();
      ring(g, 0, 0, 70, 25, 38, 11, 0, hat.top);
      g.restore();
    }

    // 물에 잠긴 튜브 아랫부분과 물가에 닿는 물결
    drawLap(g, p, v) {
      const k = p.k;
      const t = this.t + (v ? strHash(v.id) * 9 : 0);
      g.save();
      g.translate(p.x, p.y + 4 * k);
      g.scale(k, k);
      g.save();
      g.beginPath();
      g.ellipse(0, 0, 72, 27, 0, 0, Math.PI * 2);
      g.clip();
      g.fillStyle = 'rgba(20,32,76,0.5)';
      g.fillRect(-80, 12, 160, 30);
      g.restore();
      g.strokeStyle = 'rgba(205,220,255,0.42)';
      g.lineWidth = 1.6;
      g.beginPath();
      g.ellipse(0, 12, 74 + Math.sin(t * 2) * 2, 15, 0, 0.12, Math.PI - 0.12);
      g.stroke();
      const u = (t * 0.4) % 1;
      g.strokeStyle = `rgba(200,215,255,${0.26 * (1 - u)})`;
      g.lineWidth = 1.3;
      g.beginPath();
      g.ellipse(0, 11, 78 + u * 46, 18 + u * 10, 0, 0, Math.PI);
      g.stroke();
      g.restore();
    }

    drawWhale(g, wh) {
      const { s, hy, sandTop } = this;
      const u = wh.u;
      const ws = s * 1.25;
      const wy = hy + (sandTop - hy) * 0.06;
      const x = wh.x + wh.dir * u * 3.2 * ws;
      const rise = u < 2.2 ? easeInOut(u / 2.2) : u < 8 ? 1 : u < 10 ? 1 - easeInOut((u - 8) / 2) : 0;
      const dark = '#0b1431';
      const rim = 'rgba(196,210,255,0.6)';
      // 물결 고리
      const rings = u < 13.5 ? Math.min(1, u / 1.5) : Math.max(0, 1 - (u - 13.5) / 2.5);
      for (let i = 0; i < 2; i++) {
        const ph = ((u * 0.35 + i * 0.5) % 1);
        g.strokeStyle = `rgba(200,214,255,${0.28 * rings * (1 - ph)})`;
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(x, wy + 1, (40 + ph * 50) * ws, (2.4 + ph * 2.4) * ws, 0, 0, Math.PI * 2);
        g.stroke();
      }
      // 등: 물 위로 떠올랐다 가라앉는다
      if (rise > 0.01) {
        const hh = 13 * ws * rise;
        g.fillStyle = dark;
        g.beginPath();
        g.moveTo(x - 50 * ws, wy);
        g.bezierCurveTo(x - 30 * ws, wy - hh * 1.1, x + 26 * ws, wy - hh * 1.15, x + 46 * ws, wy);
        g.closePath();
        g.fill();
        g.strokeStyle = rim;
        g.lineWidth = 1.2 * ws;
        g.beginPath();
        g.moveTo(x - 44 * ws, wy - hh * 0.25);
        g.bezierCurveTo(x - 28 * ws, wy - hh * 1.02, x + 22 * ws, wy - hh * 1.06, x + 40 * ws, wy - hh * 0.25);
        g.stroke();
        // 등지느러미
        const fx = x - wh.dir * 22 * ws;
        g.fillStyle = dark;
        g.beginPath();
        g.moveTo(fx - 5 * ws, wy - hh * 0.82);
        g.quadraticCurveTo(fx - wh.dir * 1 * ws, wy - hh * 0.82 - 7 * ws * rise, fx + wh.dir * 4 * ws, wy - hh * 0.9 - 6 * ws * rise);
        g.lineTo(fx + 5 * ws, wy - hh * 0.8);
        g.closePath();
        g.fill();
      }
      // 물줄기: 달빛을 받은 하얀 숨
      if (u > 2.6 && u < 6.6) {
        const v = (u - 2.6) / 4;
        const bx = x + wh.dir * 28 * ws;
        const by = wy - 11 * ws;
        g.globalCompositeOperation = 'lighter';
        // 가는 기둥으로 솟았다가 위에서 뭉게뭉게 퍼진다
        for (let i = 0; i < 18; i++) {
          const f = i / 17;
          const hgt = Math.min(1, v * 3) * (8 + 40 * f) * ws;
          const a = 0.13 * (1 - v) * (1 - f * 0.35);
          for (const off of [-1, 0, 1]) {
            const spread = off * (0.5 + 9 * f * f * Math.min(1, v * 2.2)) * ws;
            const r = (5 + 10 * f * f) * ws;
            g.globalAlpha = a * (off ? 0.7 : 1);
            g.drawImage(SPR.spout, bx + spread - r, by - hgt - r, r * 2, r * 2);
          }
        }
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
      }
      // 꼬리: 마지막으로 꼬리를 들어 올렸다가 미끄러지듯 들어간다
      if (u > 10 && u < 13.5) {
        const v = (u - 10) / 3.5;
        const lift = Math.sin(Math.PI * v);
        const tx = x - wh.dir * 20 * ws;
        const top = wy - 26 * ws * lift;
        g.fillStyle = dark;
        g.beginPath();
        g.moveTo(tx - 3.2 * ws, wy);
        g.lineTo(tx - 2.4 * ws, top + 7 * ws);
        g.quadraticCurveTo(tx - 12 * ws, top + 6.5 * ws, tx - 22 * ws, top - 7 * ws * lift);
        g.quadraticCurveTo(tx - 12 * ws, top - 3.5 * ws, tx, top + 1 * ws);
        g.quadraticCurveTo(tx + 12 * ws, top - 3.5 * ws, tx + 22 * ws, top - 7 * ws * lift);
        g.quadraticCurveTo(tx + 12 * ws, top + 6.5 * ws, tx + 2.4 * ws, top + 7 * ws);
        g.lineTo(tx + 3.2 * ws, wy);
        g.closePath();
        g.fill();
        g.strokeStyle = rim;
        g.lineWidth = 1 * ws;
        g.stroke();
        // 꼬리에서 떨어지는 물방울
        g.fillStyle = 'rgba(214,226,255,0.7)';
        for (let i = 0; i < 6; i++) {
          const dx = (MC.hash(i + wh.k) - 0.5) * 34 * ws;
          const fall = ((v * 3 + MC.hash(i * 3.3)) % 1) * (wy - top);
          g.fillRect(tx + dx, top + fall, 1.2 * ws, 2 * ws);
        }
      }
    }

    draw(g) {
      if (!this.bg) return;
      if (this.underwater) {
        this.dive.draw(g);
        if (this.crowd) this.crowd.draw(g, this.dpr, null, this.w);
        this.dive.drawFront(g);
        return;
      }
      const { w, h, s, hy, t } = this;
      g.drawImage(this.bg, 0, 0, w, h);
      this.drawMoon(g);

      g.globalCompositeOperation = 'lighter';
      for (const st of this.twinkles) {
        g.globalAlpha = 0.25 + 0.4 * (0.5 + 0.5 * Math.sin(t * st.sp + st.ph));
        g.drawImage(SPR.star, st.x - st.r * 2.5, st.y - st.r * 2.5, st.r * 5, st.r * 5);
      }
      // 등대: 9초마다 은은하게 차올랐다 사라진다
      const lp = (t % 9) - 1.2;
      const flash = 0.7 * Math.exp(-(lp * lp) / 0.35);
      const L = this.lamp;
      g.globalAlpha = 0.5 + 0.5 * flash;
      g.drawImage(SPR.lamp, L.x - (6 + 26 * flash) * s, L.y - (3 + 5 * flash) * s, (12 + 52 * flash) * s, (6 + 10 * flash) * s);
      g.globalAlpha = 0.12 + 0.25 * flash;
      g.drawImage(SPR.lamp, L.x - 3 * s, hy, 6 * s, 50 * s);
      g.globalAlpha = 1;
      // 별똥별: 하늘에서만, 그리고 수평선 아래 물에 옅게
      if (this.meteors.list.length) {
        g.save();
        g.beginPath();
        g.rect(0, 0, w, hy - 2);
        g.clip();
        this.meteors.draw(g, SPR.star);
        g.restore();
        g.save();
        g.beginPath();
        g.rect(0, hy + 1, w, this.sandTop - hy);
        g.clip();
        this.meteors.drawReflection(g, SPR.star, hy, 0.32);
        g.restore();
      }
      g.globalCompositeOperation = 'source-over';

      // 물결 줄
      const step = Math.min(30, 12 / Math.max(0.35, this.quality));
      for (const r of this.rows) {
        g.strokeStyle = `rgba(182,198,240,${0.035 + 0.15 * r.z})`;
        g.lineWidth = 0.6 + 1.4 * r.z;
        g.beginPath();
        for (let x = -step; x <= w + step; x += step) {
          const y = this.waveY(r, x);
          if (x === -step) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
        if (r.z > 0.45) {
          g.strokeStyle = `rgba(4,8,24,${0.22 * r.z})`;
          g.lineWidth = 1 + 2 * r.z;
          g.beginPath();
          for (let x = -step; x <= w + step; x += step) {
            const y = this.waveY(r, x) + r.amp * 0.9 + 1.5;
            if (x === -step) g.moveTo(x, y);
            else g.lineTo(x, y);
          }
          g.stroke();
        }
      }

      // 달빛 윤슬
      g.globalCompositeOperation = 'lighter';
      const m = this.moon;
      for (const r of this.rows) {
        const spread = (14 + 210 * r.z) * s;
        for (const gl of r.glints) {
          const b = Math.sin(t * gl.sp + gl.ph);
          if (b <= 0.15) continue;
          const a = Math.pow((b - 0.15) / 0.85, 2) * (0.25 + 0.45 * r.z) * (1 - 0.55 * (this.veil || 0));
          const x = m.x + gl.o * spread + Math.sin(t * 0.3 + gl.ph) * 4 * s;
          const y = this.waveY(r, x);
          const len = (4 + 22 * r.z) * gl.len * s;
          const th = (2 + 3 * r.z) * s;
          g.globalAlpha = a;
          g.drawImage(SPR.glint, x - len / 2, y - th / 2, len, th);
        }
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';

      // 먼 바다의 고래
      if (this.whale) this.drawWhale(g, this.whale);

      // 물수제비 같은 동심원
      for (const rp of this.ripples) {
        const scale = (0.3 + 1.2 * rp.z) * s;
        const squash = 0.06 + 0.32 * rp.z;
        for (let j = 0; j < 3; j++) {
          const age = rp.age - j * 0.35;
          if (age <= 0) continue;
          const rad = age * 42 * scale;
          const a = Math.max(0, 1 - rp.age / 4.5) * 0.55 * (1 - j * 0.25);
          g.strokeStyle = `rgba(214,226,255,${a})`;
          g.lineWidth = (0.6 + 1.2 * rp.z) * (1 - j * 0.2);
          g.beginPath();
          g.ellipse(rp.x, rp.y, rad, rad * squash, 0, 0, Math.PI * 2);
          g.stroke();
        }
      }

      // 야광 플랑크톤
      if (this.plank.length) {
        g.globalCompositeOperation = 'lighter';
        for (const q of this.plank) {
          const life = 1 - q.age / q.life;
          const a = Math.pow(life, 1.4) * (0.55 + 0.45 * Math.sin(q.age * 4 + q.ph)) * 0.85 * (q.a == null ? 1 : q.a);
          if (a <= 0.01) continue;
          const r = q.r * 3;
          g.globalAlpha = a;
          g.drawImage(SPR.plankton, q.x - r, q.y - r, r * 2, r * 2);
        }
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
      }

      this.drawShore(g);
      this.drawStone(g);
      if (this.bottle) this.drawBottle(g);
      if (this.crowd) {
        const sb = this.standBox;
        g.drawImage(this.standImg, this.stand.x - sb.ox, this.stand.y - sb.oy, sb.W, sb.H);
      }
      this.crab.draw(g);
      if (this.crowd) this.crowd.draw(g, this.dpr, null, w);
      else this.pup.draw(g, this.dpr);
      g.drawImage(this.vignette, 0, 0, w, h);
    }

    // 밀려왔다 물러가는 물가. 소리와 같은 시계(MC.clock)를 쓴다
    drawShore(g) {
      const { w, s, sandTop } = this;
      const { k, p, amp, reach, adv } = this.swash(MC.clock());

      // 부서지는 흰 파도 띠
      const bb = Math.exp(-Math.pow((p - 0.33) / 0.07, 2)) * amp;
      if (bb > 0.02) {
        g.strokeStyle = `rgba(230,236,255,${0.45 * bb})`;
        g.lineWidth = (2 + 5 * bb) * s;
        g.beginPath();
        for (let x = -10; x <= w + 10; x += 10) {
          const y = sandTop - (3 + 4 * bb) * s + MC.fbm(x * 0.013 + k * 1.7 + p * 2) * 3 * s;
          if (x === -10) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
      }

      // 물러간 뒤 젖은 모래의 반짝임
      if (p > 0.52) {
        const fade = 1 - (p - 0.52) / 0.48;
        g.fillStyle = `rgba(140,150,205,${0.07 * fade})`;
        g.fillRect(0, sandTop, w, reach);
      }
      if (adv <= 0.001) return;
      const front = (x) => sandTop + reach * adv + MC.fbm(x * 0.009 + k * 3.1) * 9 * s * adv;
      g.fillStyle = `rgba(96,114,178,${0.3 * Math.min(1, adv * 2)})`;
      g.beginPath();
      g.moveTo(-10, sandTop);
      for (let x = -10; x <= w + 10; x += 12) g.lineTo(x, front(x));
      g.lineTo(w + 10, sandTop);
      g.closePath();
      g.fill();
      const foamA = p < 0.52 ? 0.6 : MC.lerp(0.6, 0.15, (p - 0.52) / 0.45);
      g.strokeStyle = `rgba(236,240,255,${foamA})`;
      g.lineWidth = 2.2 * s;
      g.beginPath();
      for (let x = -10; x <= w + 10; x += 8) {
        const y = front(x);
        if (x === -10) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
      // 거품 알갱이
      g.fillStyle = `rgba(236,240,255,${foamA * 0.6})`;
      for (let i = 0; i < 90; i++) {
        const x = MC.hash(i + k * 131) * w;
        const back = MC.hash(i * 7 + k) * 14 * s;
        g.fillRect(x, front(x) - back, 1.4 * s, 1.4 * s);
      }
    }
  }

  MC.WaterScene = WaterScene;
})(window.MC = window.MC || {});
