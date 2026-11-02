/* 멍캠프 — 숲멍: 아침 햇살이 비껴 드는 편백 숲 */
(function (MC) {
  'use strict';

  let SPR = null;
  function sprites() {
    if (SPR) return SPR;
    SPR = {
      mote: MC.glow([255, 246, 214], 16, 0.25),
      sun: MC.glow([255, 246, 220], 256, 0.1),
      fog: MC.glow([232, 238, 222], 128, 0.2),
    };
    return SPR;
  }

  const TRUNK = [84, 56, 40];
  const FOG = [210, 220, 200];
  const LEAF_COLORS = ['#c9b458', '#9fb04a', '#d8a54a', '#83a043'];

  // 팔랑이는 나비. 가끔 멍이의 새싹에 내려앉는다
  class Butterfly {
    constructor(wing, edge, scene) {
      this.wing = wing;
      this.edge = edge;
      this.x = MC.rand(0.2, 0.8) * scene.w;
      this.y = MC.rand(0.3, 0.6) * scene.h;
      this.vx = 0;
      this.vy = 0;
      this.ph = Math.random() * 6;
      this.mode = 'fly';
      this.retarget = 0;
      this.target = { x: this.x, y: this.y };
      this.restT = 0;
    }

    update(dt, scene, perch) {
      const s = scene.s;
      this.ph += dt * (this.mode === 'rest' ? 2.2 : 15);
      if (this.mode === 'rest') {
        this.x = perch.x;
        this.y = perch.y;
        this.restT -= dt;
        if (this.restT <= 0) {
          this.mode = 'fly';
          this.retarget = 0;
          this.vy = -60 * s;
        }
        return;
      }
      if (this.mode === 'toPerch') this.target = perch;
      else {
        this.retarget -= dt;
        if (this.retarget <= 0) {
          this.retarget = MC.rand(2, 4);
          this.target = { x: MC.rand(0.08, 0.92) * scene.w, y: MC.rand(0.22, 0.72) * scene.h };
        }
      }
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const pull = this.mode === 'toPerch' ? 2.2 : 0.9;
      this.vx += (dx * pull - this.vx * 1.4 + Math.sin(this.ph * 0.31) * 40 * s) * dt;
      this.vy += (dy * pull - this.vy * 1.4 + Math.cos(this.ph * 0.23) * 50 * s) * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt + Math.sin(this.ph * 0.5) * 12 * s * dt;
      if (this.mode === 'toPerch' && Math.hypot(dx, dy) < 5 * s) {
        this.mode = 'rest';
        this.restT = MC.rand(4, 7);
      }
    }

    draw(g, k) {
      const flap = this.mode === 'rest' ? 0.55 + 0.35 * Math.abs(Math.cos(this.ph)) : 0.2 + 0.8 * Math.abs(Math.cos(this.ph));
      g.save();
      g.translate(this.x, this.y);
      g.rotate(MC.clamp(this.vx * 0.004, -0.4, 0.4));
      g.scale(k, k);
      for (const side of [-1, 1]) {
        g.save();
        g.scale(side * flap, 1);
        g.fillStyle = this.wing;
        g.strokeStyle = this.edge;
        g.lineWidth = 1.2;
        g.beginPath();
        g.ellipse(7, -4.5, 7.4, 5.4, -0.5, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.beginPath();
        g.ellipse(5.4, 3.6, 4.8, 3.8, 0.5, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.85)';
        g.beginPath();
        g.arc(8.6, -5.6, 1.5, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
      g.fillStyle = '#4a3a2c';
      g.beginPath();
      g.ellipse(0, 0, 1.6, 6, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#4a3a2c';
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(-0.5, -5);
      g.quadraticCurveTo(-2, -9, -3.4, -10.5);
      g.moveTo(0.5, -5);
      g.quadraticCurveTo(2, -9, 3.4, -10.5);
      g.stroke();
      g.restore();
    }
  }

  class ForestScene {
    constructor(opts = {}) {
      this.preview = !!opts.preview;
      this.quality = 1;
      this.t = 0;
      this.gust = 0;
      this.wind = 0.3;
      this.onGust = null;
      this.onCute = null;
      this.leaves = [];
      this.motes = [];
      this.flies = [];
      this.nextPerch = MC.rand(14, 26);
      this.nextLook = MC.rand(6, 12);
      // 멍이: 새싹을 달고 그루터기에 앉아 있다
      this.pup = new MC.Pup({
        outfit: 'sprout',
        light: { ambient: null, glow: [255, 244, 214], glowA: 0.14, from: -70 },
      });
      this.pup.onEvent = (kind) => { if (this.onCute) this.onCute(kind); };
      sprites();
    }

    audioParams() {
      return { wind: this.wind };
    }

    resize(w, h, dpr) {
      this.w = w;
      this.h = h;
      this.dpr = dpr;
      this.s = MC.clamp(Math.min(w / 520, h / 800), 0.6, 1.4);
      this.buildBackground();
      this.buildBeams();
      this.buildFerns();
      const n = Math.round(130 * Math.min(1.4, (w * h) / 1.1e6 + 0.4));
      const rnd = MC.rng(5);
      this.motes = [];
      for (let i = 0; i < n; i++) {
        this.motes.push({ x: rnd() * w, y: rnd() * h * 0.9, vx: (rnd() - 0.3) * 6, vy: (rnd() - 0.5) * 4, r: 0.6 + rnd() * 1.6, ph: rnd() * 6.28 });
      }
      this.leaves = [];
      for (let i = 0; i < 9; i++) this.leaves.push(this.newLeaf(true));
      const portrait = w < h * 0.9;
      const st = (this.stump = { x: w * (portrait ? 0.28 : 0.2), top: h * (portrait ? 0.83 : 0.84), w: 86 * this.s, h: 54 * this.s });
      this.buildStump();
      const pup = this.pup;
      pup.k = this.s * 0.95;
      pup.x = st.x;
      pup.y = st.top + 3 * this.s;
      if (!this.flies.length) {
        this.flies = [new Butterfly('#fff0a6', '#d8b440', this), new Butterfly('#cfe7ff', '#7fa9d8', this)];
      }
      this.mists = [];
      for (let i = 0; i < 5; i++) this.mists.push({ x: rnd() * w, y: h * (0.55 + rnd() * 0.3), r: (220 + rnd() * 260) * this.s, v: (4 + rnd() * 6) * this.s });
    }

    buildBackground() {
      const { w, h, dpr, s } = this;
      const rnd = MC.rng(31337);
      const c = (this.bg = MC.canvas(w * dpr, h * dpr));
      const g = c.getContext('2d');
      g.scale(dpr, dpr);

      const air = g.createLinearGradient(0, 0, 0, h);
      air.addColorStop(0, '#f2f0d8');
      air.addColorStop(0.35, '#d5dfc2');
      air.addColorStop(0.7, '#a9bb9b');
      air.addColorStop(1, '#6c8066');
      g.fillStyle = air;
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.5;
      g.drawImage(SPR.sun, -w * 0.45, -h * 0.55, w * 1.3, h * 1.1);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';

      const layers = [
        { fog: 0.86, width: 5, gap: 38, base: 0.7 },
        { fog: 0.72, width: 9, gap: 58, base: 0.73 },
        { fog: 0.52, width: 16, gap: 92, base: 0.77 },
        { fog: 0.3, width: 30, gap: 160, base: 0.85 },
        { fog: 0.06, width: 64, gap: 340, base: 1.05 },
      ];
      layers.forEach((L, li) => {
        const col = MC.mix(TRUNK, FOG, L.fog);
        const lit = MC.mix(col, [255, 236, 200], 0.25);
        const dark = MC.mix(col, [10, 12, 8], 0.35);
        const baseY = h * L.base;
        const count = Math.max(2, Math.round(w / (L.gap * s)));
        for (let i = 0; i < count; i++) {
          const x = ((i + rnd() * 0.9) / count) * w;
          const tw = L.width * s * (0.6 + rnd() * 0.9);
          const by = baseY + rnd() * 8 * s;
          const grd = g.createLinearGradient(x - tw / 2, 0, x + tw / 2, 0);
          grd.addColorStop(0, MC.rgba(lit));
          grd.addColorStop(0.35, MC.rgba(col));
          grd.addColorStop(1, MC.rgba(dark));
          g.fillStyle = grd;
          g.beginPath();
          g.moveTo(x - tw * 0.38, -10);
          g.lineTo(x + tw * 0.38, -10);
          g.lineTo(x + tw * 0.5, by);
          g.lineTo(x - tw * 0.5, by);
          g.closePath();
          g.fill();
          if (li >= 2) {
            // 편백 껍질의 세로 결
            g.strokeStyle = MC.rgba(dark, 0.35);
            g.lineWidth = Math.max(0.6, tw * 0.03);
            for (let k = 0; k < 4 + li; k++) {
              const fx = x - tw * 0.4 + rnd() * tw * 0.8;
              g.beginPath();
              g.moveTo(fx, rnd() * by * 0.3);
              g.lineTo(fx + (rnd() - 0.5) * 3, by - rnd() * by * 0.2);
              g.stroke();
            }
          }
        }
        // 나무 밑동을 감싸는 안개
        const mist = g.createLinearGradient(0, baseY - h * 0.22, 0, baseY + 4);
        mist.addColorStop(0, MC.rgba(FOG, 0));
        mist.addColorStop(1, MC.rgba(FOG, 0.5 - li * 0.08));
        g.fillStyle = mist;
        g.fillRect(0, baseY - h * 0.22, w, h * 0.22 + 6);
        // 덤불
        g.fillStyle = MC.rgba(MC.mix([38, 64, 40], FOG, L.fog));
        for (let i = 0; i < w / (18 * s); i++) {
          const x = rnd() * w;
          const r = (4 + rnd() * 10) * s * (1 + li * 0.5);
          g.beginPath();
          g.ellipse(x, baseY, r * 1.4, r, 0, Math.PI, 0);
          g.fill();
        }
        if (li === 3) {
          // 숲 바닥
          const floor = g.createLinearGradient(0, baseY, 0, h);
          floor.addColorStop(0, '#5d7146');
          floor.addColorStop(1, '#2d3a24');
          g.fillStyle = floor;
          g.fillRect(0, baseY, w, h - baseY);
        }
      });

      // 우듬지: 위쪽을 덮는 짙은 잎. 아래 가장자리는 잔잎 덩어리로 들쭉날쭉하다
      const crown = g.createLinearGradient(0, 0, 0, h * 0.22);
      crown.addColorStop(0, 'rgba(22,42,26,0.9)');
      crown.addColorStop(0.55, 'rgba(30,54,34,0.45)');
      crown.addColorStop(1, 'rgba(30,54,34,0)');
      g.fillStyle = crown;
      g.fillRect(0, 0, w, h * 0.22);
      for (let d = 0; d < 3; d++) {
        const col = MC.mix([24, 48, 28], FOG, 0.5 - d * 0.22);
        for (let i = 0; i < w / (6 * s); i++) {
          const x = rnd() * w;
          const edge = h * (0.04 + 0.045 * d) + (0.5 + 0.5 * MC.fbm(x * 0.006 + d * 4)) * h * 0.05;
          const y = Math.pow(rnd(), 0.7) * edge;
          const r = (4 + rnd() * 11) * s;
          g.fillStyle = MC.rgba(col, 0.5 + rnd() * 0.4);
          g.beginPath();
          g.ellipse(x, y, r * 1.7, r, rnd() * 0.8 - 0.4, 0, Math.PI * 2);
          g.fill();
        }
      }
    }

    buildBeams() {
      const { w, h, s } = this;
      const rnd = MC.rng(808);
      this.beams = [];
      const ang = (62 * Math.PI) / 180;
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      const n = 6;
      for (let i = 0; i < n; i++) {
        const x0 = -w * 0.15 + (i / n) * w * 0.85 + rnd() * 40 * s;
        const w0 = (18 + rnd() * 40) * s;
        const len = h * 1.25;
        this.beams.push({ x0, y0: -20, dx, dy, w0, w1: w0 * 2.6, len, base: 0.12 + rnd() * 0.14, seed: rnd() * 40 });
      }
    }

    buildFerns() {
      const { w, s } = this;
      const rnd = MC.rng(11);
      this.ferns = [];
      const n = Math.max(5, Math.round(w / (150 * s)));
      for (let i = 0; i < n; i++) {
        const left = i % 2 === 0;
        this.ferns.push({
          x: ((i + 0.5) / n) * w + (rnd() - 0.5) * 60 * s,
          len: (130 + rnd() * 110) * s,
          a0: -Math.PI / 2 + (left ? -1 : 1) * (0.35 + rnd() * 0.45),
          bend: (left ? -1 : 1) * (0.5 + rnd() * 0.5),
          seed: rnd() * 30,
          tone: 0.85 + rnd() * 0.15,
        });
      }
    }

    newLeaf(anywhere) {
      return {
        x: Math.random() * this.w,
        y: anywhere ? Math.random() * this.h : -20,
        vy: MC.rand(12, 24) * this.s,
        rot: Math.random() * 6.28,
        vr: MC.rand(-1.1, 1.1),
        ph: Math.random() * 6.28,
        size: MC.rand(4, 7) * this.s,
        color: LEAF_COLORS[(Math.random() * LEAF_COLORS.length) | 0],
      };
    }

    // 이끼 낀 그루터기와 빨간 버섯
    buildStump() {
      const { dpr, s } = this;
      const st = this.stump;
      const W = st.w * 2.2;
      const H = st.h * 2.2;
      const c = (this.stumpImg = MC.canvas(W * dpr, H * dpr));
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      g.translate(W / 2, st.h * 0.55);
      const rnd = MC.rng(77);
      const hw = st.w / 2;
      const ry = 11 * s;
      const ink = 'rgba(58,38,26,0.75)';
      g.lineJoin = 'round';
      g.lineCap = 'round';
      // 그림자
      g.fillStyle = 'rgba(20,30,15,0.35)';
      g.beginPath();
      g.ellipse(0, st.h + 4 * s, hw * 1.35, 9 * s, 0, 0, Math.PI * 2);
      g.fill();
      // 옆면과 뿌리
      g.beginPath();
      g.moveTo(-hw, 0);
      g.lineTo(-hw * 1.02, st.h * 0.7);
      g.quadraticCurveTo(-hw * 1.35, st.h * 0.95, -hw * 1.45, st.h + 2 * s);
      g.lineTo(hw * 1.45, st.h + 2 * s);
      g.quadraticCurveTo(hw * 1.35, st.h * 0.95, hw * 1.02, st.h * 0.7);
      g.lineTo(hw, 0);
      g.closePath();
      const bark = g.createLinearGradient(-hw, 0, hw, 0);
      bark.addColorStop(0, '#7d5638');
      bark.addColorStop(0.45, '#694529');
      bark.addColorStop(1, '#3f2716');
      g.fillStyle = bark;
      g.fill();
      g.strokeStyle = ink;
      g.lineWidth = 1.6 * s;
      g.stroke();
      g.strokeStyle = 'rgba(35,20,10,0.45)';
      g.lineWidth = 1.2 * s;
      for (let i = 0; i < 9; i++) {
        const x = -hw + 6 * s + rnd() * (st.w - 12 * s);
        g.beginPath();
        g.moveTo(x, 4 * s + rnd() * 6 * s);
        g.lineTo(x + (rnd() - 0.5) * 4 * s, st.h * (0.6 + rnd() * 0.35));
        g.stroke();
      }
      // 나이테가 보이는 윗면
      g.beginPath();
      g.ellipse(0, 0, hw, ry, 0, 0, Math.PI * 2);
      const top = g.createRadialGradient(-6 * s, -3 * s, 2, 0, 0, hw);
      top.addColorStop(0, '#e2bd88');
      top.addColorStop(1, '#b98c58');
      g.fillStyle = top;
      g.fill();
      g.strokeStyle = ink;
      g.stroke();
      g.strokeStyle = 'rgba(130,88,48,0.5)';
      g.lineWidth = 1 * s;
      for (let k = 1; k <= 4; k++) {
        g.beginPath();
        g.ellipse(0.5 * s, 0, (hw * k) / 5, (ry * k) / 5, 0, 0, Math.PI * 2);
        g.stroke();
      }
      // 이끼
      for (let i = 0; i < 16; i++) {
        const a = rnd() * Math.PI;
        const x = Math.cos(a) * hw * (0.9 + rnd() * 0.15);
        const y = Math.sin(a) * ry + rnd() * 10 * s;
        g.fillStyle = rnd() < 0.5 ? '#7fae5a' : '#5f8f45';
        g.beginPath();
        g.ellipse(x, y, (4 + rnd() * 6) * s, (2.4 + rnd() * 3) * s, 0, 0, Math.PI * 2);
        g.fill();
      }
      // 빨간 버섯 둘
      for (const [mx, sc] of [[hw * 1.18, 1], [hw * 1.55, 0.7]]) {
        const by = st.h + 2 * s;
        const r = 9 * s * sc;
        g.fillStyle = '#f6ecd8';
        g.strokeStyle = ink;
        g.lineWidth = 1.4 * s;
        MC.roundRect(g, mx - r * 0.38, by - r * 1.5, r * 0.76, r * 1.5, r * 0.3);
        g.fill();
        g.stroke();
        g.beginPath();
        g.moveTo(mx - r * 1.2, by - r * 1.3);
        g.quadraticCurveTo(mx - r * 1.1, by - r * 2.6, mx, by - r * 2.7);
        g.quadraticCurveTo(mx + r * 1.1, by - r * 2.6, mx + r * 1.2, by - r * 1.3);
        g.quadraticCurveTo(mx, by - r * 1.05, mx - r * 1.2, by - r * 1.3);
        g.closePath();
        const cap = g.createLinearGradient(0, by - r * 2.7, 0, by - r * 1.2);
        cap.addColorStop(0, '#f2694a');
        cap.addColorStop(1, '#cf4529');
        g.fillStyle = cap;
        g.fill();
        g.stroke();
        g.fillStyle = '#fff8ee';
        for (const [dx, dy, rr] of [[-0.5, -2.2, 0.22], [0.35, -2.3, 0.18], [0.05, -1.75, 0.16], [-0.8, -1.6, 0.13], [0.75, -1.7, 0.14]]) {
          g.beginPath();
          g.arc(mx + dx * r, by + dy * r, rr * r, 0, Math.PI * 2);
          g.fill();
        }
      }
      // 작은 들꽃
      for (const [fx, fh] of [[-hw * 1.6, 16], [-hw * 1.25, 11], [hw * 0.2, 9]]) {
        const by = st.h + 2 * s;
        g.strokeStyle = '#4f7f3c';
        g.lineWidth = 1.3 * s;
        g.beginPath();
        g.moveTo(fx, by);
        g.quadraticCurveTo(fx + 2 * s, by - fh * s * 0.5, fx, by - fh * s);
        g.stroke();
        g.fillStyle = '#ffffff';
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          g.beginPath();
          g.ellipse(fx + Math.cos(a) * 2.6 * s, by - fh * s + Math.sin(a) * 2.6 * s, 2 * s, 1.3 * s, a, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = '#ffd256';
        g.beginPath();
        g.arc(fx, by - fh * s, 1.5 * s, 0, Math.PI * 2);
        g.fill();
      }
      this.stumpBox = { W, H, ox: W / 2, oy: st.h * 0.55 };
    }

    pointerDown(x, y) {
      if (this.pup.hit(x, y)) {
        this.pup.poke();
        return true;
      }
      this.gust = Math.min(1.2, this.gust + 0.75);
      for (let i = 0; i < 5; i++) {
        const l = this.newLeaf(false);
        l.x = x + MC.rand(-120, 120) * this.s;
        this.leaves.push(l);
      }
      if (this.leaves.length > 30) this.leaves.splice(0, this.leaves.length - 30);
      if (this.onGust) this.onGust();
      return true;
    }

    breeze() {
      return this.pointerDown(this.w * MC.rand(0.2, 0.8));
    }

    beamAlpha(b) {
      return b.base * (0.55 + 0.45 * MC.fbm(this.t * 0.11 + b.seed));
    }

    update(dt) {
      const { w, h, s } = this;
      this.t += dt;
      this.gust = Math.max(0, this.gust - dt * 0.22);
      this.wind = 0.25 + 0.15 * (0.5 + 0.5 * MC.fbm(this.t * 0.05)) + this.gust;
      const n = Math.round(this.motes.length * MC.clamp(this.quality, 0.4, 1));
      for (let i = 0; i < n; i++) {
        const m = this.motes[i];
        const vx = 3 + MC.fbm(this.t * 0.18 + m.ph) * 4 + this.gust * 8;
        const vy = MC.fbm(this.t * 0.15 + m.ph * 1.7) * 3;
        m.x += vx * s * dt;
        m.y += vy * s * dt;
        if (m.x > w + 5) m.x = -5;
        if (m.x < -5) m.x = w + 5;
        if (m.y > h * 0.95) m.y = 0;
        if (m.y < 0) m.y = h * 0.95;
      }
      for (const l of this.leaves) {
        l.y += l.vy * dt;
        l.x += (Math.sin(this.t * 0.9 + l.ph) * 14 + this.wind * 30) * s * dt;
        l.rot += l.vr * dt * (1 + this.gust);
      }
      for (let i = 0; i < this.leaves.length; i++) {
        const l = this.leaves[i];
        if (l.y > h + 20 || l.x > w + 40) this.leaves[i] = this.newLeaf(false);
      }
      for (const m of this.mists) {
        m.x += m.v * (1 + this.gust) * dt;
        if (m.x - m.r > w) m.x = -m.r;
      }

      // 멍이는 두리번두리번, 나비가 가까이 오면 눈으로 따라간다
      const pup = this.pup;
      this.nextLook -= dt;
      if (this.nextLook <= 0) {
        this.nextLook = MC.rand(7, 14);
        pup.baseTurn = MC.rand(-0.45, 0.45);
      }
      const head = pup.world(0, -72);
      const perch = pup.world(6 + pup.turn * 3, -118 + pup.headDrop);
      this.nextPerch -= dt;
      if (this.nextPerch <= 0 && this.flies.every((f) => f.mode === 'fly')) {
        this.nextPerch = MC.rand(25, 45);
        this.flies[(Math.random() * this.flies.length) | 0].mode = 'toPerch';
      }
      let look = null;
      let best = 170 * s;
      for (const f of this.flies) {
        f.update(dt, this, perch);
        const d = Math.hypot(f.x - head.x, f.y - head.y);
        if (f.mode === 'rest') {
          look = { x: 0, y: -1 };
          pup.perkT = Math.max(pup.perkT, 0.3);
        } else if (d < best) {
          best = d;
          look = { x: MC.clamp((f.x - head.x) / (90 * s), -1, 1), y: MC.clamp((f.y - head.y) / (70 * s), -1, 1) };
        }
      }
      pup.update(dt, { wind: this.wind * 0.6, look });
    }

    drawFern(g, f) {
      const s = this.s;
      const sway = MC.fbm(this.t * 0.7 + f.seed) * 0.06 + this.gust * 0.14 * Math.sin(this.t * 2.2 + f.seed);
      const a0 = f.a0 + sway;
      const bend = f.bend * (1 + this.gust * 0.3);
      const base = { x: f.x, y: this.h + 8 * s };
      const N = 16;
      let x = base.x;
      let y = base.y;
      let a = a0;
      const seg = f.len / N;
      g.strokeStyle = `rgba(22,44,24,${f.tone})`;
      g.fillStyle = `rgba(26,52,28,${f.tone})`;
      g.lineWidth = 2 * s;
      g.beginPath();
      g.moveTo(x, y);
      const pts = [];
      for (let i = 0; i < N; i++) {
        a += (bend / N) * 1.2;
        x += Math.cos(a) * seg;
        y += Math.sin(a) * seg;
        g.lineTo(x, y);
        pts.push([x, y, a, 1 - i / N]);
      }
      g.stroke();
      for (let i = 1; i < pts.length; i++) {
        const [px, py, pa, rest] = pts[i];
        const ll = (6 + 22 * Math.sin(Math.PI * Math.min(1, (1 - rest) * 1.1 + 0.05))) * s * (0.4 + 0.6 * rest);
        for (const side of [-1, 1]) {
          const la = pa + side * 1.15;
          g.beginPath();
          g.ellipse(px + Math.cos(la) * ll * 0.5, py + Math.sin(la) * ll * 0.5, ll * 0.5, ll * 0.16, la, 0, Math.PI * 2);
          g.fill();
        }
      }
    }

    draw(g) {
      if (!this.bg) return;
      const { w, h, s, t } = this;
      g.drawImage(this.bg, 0, 0, w, h);

      // 빛내림
      g.globalCompositeOperation = 'lighter';
      for (const b of this.beams) {
        const a = this.beamAlpha(b);
        const ex = b.x0 + b.dx * b.len;
        const ey = b.y0 + b.dy * b.len;
        const nx = -b.dy;
        const ny = b.dx;
        const grd = g.createLinearGradient(b.x0, b.y0, ex, ey);
        grd.addColorStop(0, `rgba(255,244,210,${a})`);
        grd.addColorStop(0.6, `rgba(255,244,210,${a * 0.45})`);
        grd.addColorStop(1, 'rgba(255,244,210,0)');
        g.fillStyle = grd;
        g.beginPath();
        g.moveTo(b.x0 - (nx * b.w0) / 2, b.y0 - (ny * b.w0) / 2);
        g.lineTo(b.x0 + (nx * b.w0) / 2, b.y0 + (ny * b.w0) / 2);
        g.lineTo(ex + (nx * b.w1) / 2, ey + (ny * b.w1) / 2);
        g.lineTo(ex - (nx * b.w1) / 2, ey - (ny * b.w1) / 2);
        g.closePath();
        g.fill();
      }

      // 빛줄기 안에서만 반짝이는 먼지
      const n = Math.round(this.motes.length * MC.clamp(this.quality, 0.4, 1));
      for (let i = 0; i < n; i++) {
        const m = this.motes[i];
        let inBeam = 0;
        for (const b of this.beams) {
          const rx = m.x - b.x0;
          const ry = m.y - b.y0;
          const along = rx * b.dx + ry * b.dy;
          if (along < 0 || along > b.len) continue;
          const across = Math.abs(-rx * b.dy + ry * b.dx);
          const half = (MC.lerp(b.w0, b.w1, along / b.len) / 2) * 1.1;
          if (across < half) inBeam = Math.max(inBeam, (1 - across / half) * this.beamAlpha(b) * 5);
        }
        const a = 0.06 + Math.min(1, inBeam) * 0.8 * (0.7 + 0.3 * Math.sin(t * 0.7 + m.ph));
        const r = m.r * 2.4 * s;
        g.globalAlpha = a;
        g.drawImage(SPR.mote, m.x - r, m.y - r, r * 2, r * 2);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';

      // 흘러가는 안개
      for (const m of this.mists) {
        g.globalAlpha = 0.14;
        g.drawImage(SPR.fog, m.x - m.r, m.y - m.r * 0.35, m.r * 2, m.r * 0.7);
      }
      g.globalAlpha = 1;

      // 떨어지는 잎
      for (const l of this.leaves) {
        g.save();
        g.translate(l.x, l.y);
        g.rotate(l.rot);
        g.scale(1, Math.abs(Math.cos(l.rot * 0.7)) * 0.8 + 0.2);
        g.fillStyle = l.color;
        g.beginPath();
        g.ellipse(0, 0, l.size, l.size * 0.45, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }

      // 그루터기 위의 멍이, 그리고 나비
      const sb = this.stumpBox;
      g.drawImage(this.stumpImg, this.stump.x - sb.ox, this.stump.top - sb.oy, sb.W, sb.H);
      this.pup.draw(g, this.dpr);
      for (const f of this.flies) f.draw(g, this.s * 1.05);

      for (const f of this.ferns) this.drawFern(g, f);
    }
  }

  MC.ForestScene = ForestScene;
})(window.MC = window.MC || {});
