/* 멍캠프 — 물멍: 블루아워의 달빛 바다. 파도는 10초마다 밀려온다 */
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
    };
    return SPR;
  }

  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const easeInOut = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);

  class WaterScene {
    constructor(opts = {}) {
      this.preview = !!opts.preview;
      this.quality = 1;
      this.t = 0;
      this.ripples = [];
      this.onRipple = null;
      sprites();
    }

    audioParams() {
      return null;
    }

    resize(w, h, dpr) {
      this.w = w;
      this.h = h;
      this.dpr = dpr;
      const portrait = w < h * 0.9;
      this.s = MC.clamp(Math.min(w / 520, h / 800), 0.6, 1.4);
      this.hy = Math.round(h * (portrait ? 0.47 : 0.53));
      this.sandTop = Math.round(h * 0.86);
      this.moon = { x: w * (portrait ? 0.66 : 0.63), y: this.hy - Math.min(h * 0.2, 170), r: 19 * this.s };
      this.buildBackground();
      this.buildRows();
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
      for (let i = 0; i < 18; i++) this.twinkles.push({ x: rnd() * w, y: rnd() * hy * 0.55, r: 1.4 + rnd() * 2, ph: rnd() * 6.28, sp: 0.3 + rnd() });

      // 수평선 가까이 얇게 깔린 구름
      g.globalCompositeOperation = 'lighter';
      const cloud = MC.glow([150, 130, 170], 128, 0.25);
      for (let i = 0; i < 7; i++) {
        const cw = w * (0.25 + rnd() * 0.4);
        const cy = hy - (8 + rnd() * 60) * this.s;
        g.globalAlpha = 0.08 + rnd() * 0.08;
        g.drawImage(cloud, rnd() * w - cw / 2, cy - 5 * this.s, cw, (6 + rnd() * 8) * this.s);
      }
      // 달
      const m = this.moon;
      g.globalAlpha = 0.08;
      g.drawImage(SPR.moonGlow, m.x - m.r * 22, m.y - m.r * 22, m.r * 44, m.r * 44);
      g.globalAlpha = 0.35;
      g.drawImage(SPR.moonGlow, m.x - m.r * 6, m.y - m.r * 6, m.r * 12, m.r * 12);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      const disk = g.createRadialGradient(m.x - m.r * 0.3, m.y - m.r * 0.3, m.r * 0.1, m.x, m.y, m.r);
      disk.addColorStop(0, '#fffbef');
      disk.addColorStop(1, '#e6dfc9');
      g.fillStyle = disk;
      g.beginPath();
      g.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(160,150,130,0.18)';
      for (const [dx, dy, rr] of [[-0.3, -0.2, 0.22], [0.25, 0.15, 0.3], [0.05, -0.45, 0.14]]) {
        g.beginPath();
        g.arc(m.x + dx * m.r, m.y + dy * m.r, rr * m.r, 0, Math.PI * 2);
        g.fill();
      }

      // 바다
      const sea = g.createLinearGradient(0, hy, 0, sandTop);
      sea.addColorStop(0, '#5a5c86');
      sea.addColorStop(0.12, '#323a68');
      sea.addColorStop(0.55, '#19234a');
      sea.addColorStop(1, '#0e1534');
      g.fillStyle = sea;
      g.fillRect(0, hy, w, sandTop - hy + 2);
      // 달빛 기둥
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.13;
      g.drawImage(SPR.column, m.x - 90 * this.s, hy - 10, 180 * this.s, (sandTop - hy) * 1.15);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';

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
          glints.push({ o: MC.clamp((rnd() + rnd() + rnd() - 1.5) * 0.9, -1.3, 1.3), sp: 1.5 + rnd() * 2.5, ph: rnd() * 6.28, len: 0.5 + rnd() });
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

    waveY(r, x) {
      const t = this.t;
      return r.y + r.amp * (0.6 * Math.sin(r.k * x + r.sp * t + r.ph) + 0.4 * Math.sin(1.73 * r.k * x - 0.7 * r.sp * t + r.ph2));
    }

    pointerDown(x, y) {
      if (y < this.hy + 4 || y > this.sandTop - 2) return false;
      const z = (y - this.hy) / (this.sandTop - this.hy);
      this.ripples.push({ x, y, z, age: 0 });
      if (this.ripples.length > 12) this.ripples.shift();
      if (this.onRipple) this.onRipple(z, (x / this.w) * 2 - 1);
      return true;
    }

    rippleAt() {
      const x = this.w * MC.rand(0.25, 0.75);
      const y = MC.lerp(this.hy, this.sandTop, MC.rand(0.35, 0.8));
      return this.pointerDown(x, y);
    }

    update(dt) {
      this.t += dt;
      for (const r of this.ripples) r.age += dt;
      this.ripples = this.ripples.filter((r) => r.age < 4.5);
    }

    draw(g) {
      if (!this.bg) return;
      const { w, h, s, hy, sandTop, t } = this;
      g.drawImage(this.bg, 0, 0, w, h);

      g.globalCompositeOperation = 'lighter';
      for (const st of this.twinkles) {
        g.globalAlpha = 0.25 + 0.4 * (0.5 + 0.5 * Math.sin(t * st.sp + st.ph));
        g.drawImage(SPR.star, st.x - st.r * 2, st.y - st.r * 2, st.r * 4, st.r * 4);
      }
      // 등대: 6초마다 한 번 반짝
      const lp = (t % 6) - 0.5;
      const flash = Math.exp(-(lp * lp) / 0.03);
      const L = this.lamp;
      g.globalAlpha = 0.5 + 0.5 * flash;
      g.drawImage(SPR.lamp, L.x - (6 + 26 * flash) * s, L.y - (3 + 5 * flash) * s, (12 + 52 * flash) * s, (6 + 10 * flash) * s);
      g.globalAlpha = 0.12 + 0.25 * flash;
      g.drawImage(SPR.lamp, L.x - 3 * s, hy, 6 * s, 50 * s);
      g.globalAlpha = 1;
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
          const a = Math.pow((b - 0.15) / 0.85, 3) * (0.35 + 0.6 * r.z);
          const x = m.x + gl.o * spread + Math.sin(t * 0.3 + gl.ph) * 4 * s;
          const y = this.waveY(r, x);
          const len = (2 + 16 * r.z) * gl.len * s;
          g.fillStyle = `rgba(255,244,214,${a})`;
          g.fillRect(x - len / 2, y - 0.6 - r.z, len, 1 + 1.4 * r.z);
        }
      }
      g.globalCompositeOperation = 'source-over';

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

      this.drawShore(g);
      g.drawImage(this.vignette, 0, 0, w, h);
    }

    // 밀려왔다 물러가는 물가. 소리와 같은 시계(MC.clock)를 쓴다
    drawShore(g) {
      const { w, h, s, sandTop } = this;
      const T = MC.WAVE_T;
      const now = MC.clock();
      const k = Math.floor(now / T);
      const p = now / T - k;
      const amp = MC.waveAmp(k);
      const reach = Math.min((h - sandTop) * 0.8 * amp, h - sandTop - 4);

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

      let adv = 0;
      if (p >= 0.34 && p < 0.52) adv = easeOut((p - 0.34) / 0.18);
      else if (p >= 0.52 && p < 0.97) adv = 1 - easeInOut((p - 0.52) / 0.45);

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
