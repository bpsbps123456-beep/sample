/* 물 위의 작은 생명과 유리 헬멧을 쓰고 산책하는 바닷속. 모두 캔버스에 그린다. */
(function (MC) {
  'use strict';
  const TAU = Math.PI * 2;
  const oval = (g, x, y, a, b) => { g.beginPath(); g.ellipse(x, y, a, b, 0, 0, TAU); };

  function fish(g, x, y, size, dir, t, color = '#b3ebd4') {
    g.save(); g.translate(x, y); g.scale(size * dir, size);
    const wag = Math.sin(t * 5) * 0.7;
    g.fillStyle = color; g.strokeStyle = 'rgba(12,65,78,.35)'; g.lineWidth = .8;
    g.beginPath(); g.moveTo(-8, 0); g.lineTo(-15, -5 + wag); g.quadraticCurveTo(-12, 0, -15, 5 + wag); g.closePath(); g.fill();
    oval(g, 0, 0, 10, 4.5); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,230,.6)'; oval(g, 1, -1.6, 6, 1); g.fill();
    g.fillStyle = '#164552'; oval(g, 6, -.7, .95, .95); g.fill();
    g.strokeStyle = 'rgba(35,100,100,.45)'; g.beginPath(); g.moveTo(2, 0); g.lineTo(-2, 2); g.stroke();
    g.restore();
  }

  function kelp(g, x, y, k, t, color = '#398e78') {
    g.save(); g.translate(x, y); g.scale(k, k); g.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const h = 40 + i % 3 * 19, dx = (i - 2) * 10, sway = Math.sin(t * .8 + i) * 9;
      g.strokeStyle = color; g.lineWidth = 4;
      g.beginPath(); g.moveTo(dx * .3, 0); g.bezierCurveTo(dx - sway, -h * .4, dx + sway, -h * .8, dx + sway, -h); g.stroke();
      for (let j = 1; j < 4; j++) {
        const yy = -j * h / 4, xx = dx * j / 4 + sway * j / 5, side = j % 2 ? 1 : -1;
        g.fillStyle = i % 2 ? '#5eae8d' : color;
        g.beginPath(); g.moveTo(xx, yy); g.quadraticCurveTo(xx + side * 24, yy - 17, xx + side * 16, yy - 22); g.quadraticCurveTo(xx + side * 3, yy - 20, xx, yy); g.fill();
      }
    }
    g.restore();
  }

  function gull(g, x, y, k, t) {
    g.save(); g.translate(x, y); g.scale(k, k);
    const wing = 5 + Math.sin(t * 2.5) * 7;
    g.strokeStyle = 'rgba(18,55,75,.3)'; g.lineWidth = 4; g.lineCap = 'round';
    const path = () => { g.beginPath(); g.moveTo(-15, -wing); g.quadraticCurveTo(-7, -wing - 2, 0, 1); g.quadraticCurveTo(7, -wing - 2, 15, -wing); };
    path(); g.stroke(); g.strokeStyle = '#fff5df'; g.lineWidth = 2.2; path(); g.stroke(); g.restore();
  }

  class DiveWorld {
    constructor() { this.t = 0; this.open = 0; this.bubbles = []; this.nextBubble = 0; }

    resize(w, h, s, dpr) {
      Object.assign(this, { w, h, s });
      this.clam = { x: w * .72, y: h * .82, r: 34 * s };
      const c = this.bg = MC.canvas(w * dpr, h * dpr), g = c.getContext('2d'); g.scale(dpr, dpr);
      const water = g.createLinearGradient(0, 0, w * .2, h);
      water.addColorStop(0, '#4dbaa9'); water.addColorStop(.28, '#237e89'); water.addColorStop(.72, '#16556d'); water.addColorStop(1, '#123b56');
      g.fillStyle = water; g.fillRect(0, 0, w, h);
      // 먼 암초와 밝은 모랫길은 화면 크기가 바뀔 때만 그린다.
      for (let i = 0; i < 7; i++) {
        const x = w * (i / 6), y = h * (.77 + .06 * Math.sin(i * 3));
        g.fillStyle = i % 2 ? '#1e6573' : '#1d5d71';
        oval(g, x, y, w * .2, h * (.12 + .02 * (i % 3))); g.fill();
      }
      const sand = g.createLinearGradient(0, h * .81, 0, h);
      sand.addColorStop(0, '#88b9a7'); sand.addColorStop(1, '#4d8d8d');
      g.fillStyle = sand; g.beginPath(); g.moveTo(0, h * .86);
      g.bezierCurveTo(w * .27, h * .71, w * .54, h * .95, w, h * .79); g.lineTo(w, h); g.lineTo(0, h); g.fill();
      const rnd = MC.rng(8081);
      for (let i = 0; i < 160; i++) {
        g.fillStyle = `rgba(223,246,209,${.1 + rnd() * .18})`;
        oval(g, rnd() * w, h * (.88 + rnd() * .12), .7 + rnd() * 1.2, .6); g.fill();
      }
      // 끝이 둥근 작은 분홍 산호.
      for (const [u, v, k] of [[.12, .88, 1], [.88, .91, .8], [.45, .94, .45]]) {
        g.save(); g.translate(w * u, h * v); g.scale(s * k, s * k);
        g.strokeStyle = '#d89394'; g.lineWidth = 6; g.lineCap = 'round';
        for (let j = -2; j <= 2; j++) {
          g.beginPath(); g.moveTo(0, 1); g.quadraticCurveTo(j * 9, -17, j * 12, -36 + Math.abs(j) * 5); g.stroke();
          g.beginPath(); g.moveTo(j * 8, -17); g.lineTo(j * 15 + 4, -27); g.stroke();
        }
        g.restore();
      }
    }

    update(dt, pup) {
      this.t += dt; this.open = Math.max(0, this.open - dt);
      this.nextBubble -= dt;
      if (this.nextBubble <= 0) {
        this.nextBubble = .38;
        this.burst(pup.x + 43 * pup.k, pup.y - 56 * pup.k, 1);
      }
      for (const b of this.bubbles) { b.age += dt; b.y -= dt * (18 + b.r * 4); b.x += Math.sin(this.t * 1.5 + b.ph) * dt * 5; }
      this.bubbles = this.bubbles.filter(b => b.age < 7 && b.y > -10);
    }

    burst(x, y, n) {
      for (let i = 0; i < n; i++) this.bubbles.push({ x: x + MC.rand(-8, 8), y, r: MC.rand(1.5, 4) * this.s, age: 0, ph: Math.random() * TAU });
      if (this.bubbles.length > 70) this.bubbles.splice(0, this.bubbles.length - 70);
    }

    poke(x, y) {
      const c = this.clam;
      if (Math.hypot(x - c.x, (y - c.y + 10 * this.s) * 1.3) > c.r + 12 * this.s) return false;
      this.open = 5; this.burst(c.x, c.y - 22 * this.s, 9); return true;
    }

    draw(g) {
      const { w, h, s, t } = this;
      g.drawImage(this.bg, 0, 0, w, h);
      // 물을 통과하는 빛줄기와 물결의 흔들림.
      g.save(); g.globalCompositeOperation = 'screen';
      for (let i = 0; i < 5; i++) {
        const x = w * (i * .26 - .15) + Math.sin(t * .18 + i) * 18 * s;
        g.save(); g.translate(x, -50); g.rotate(-.27);
        const width = w * (.12 + i % 2 * .03), ray = g.createLinearGradient(0, 0, width, 0);
        ray.addColorStop(0, 'rgba(199,255,224,0)'); ray.addColorStop(.4, 'rgba(199,255,224,.13)'); ray.addColorStop(1, 'rgba(199,255,224,0)');
        g.fillStyle = ray; g.fillRect(0, 0, width, h * 1.3); g.restore();
      }
      g.restore();
      for (let i = 0; i < 3; i++) {
        const dir = i % 2 ? -1 : 1, span = w + 200;
        const u = ((t * (13 + i * 4) + i * span * .31) % span) - 100;
        const x = dir > 0 ? u : w - u, y = h * (.27 + i * .16);
        for (let j = 0; j < 6; j++) fish(g, x - j * 25 * s * dir, y + Math.sin(t * .8 + j) * 9 * s + j % 2 * 13 * s, s * (.65 + i * .15), dir, t + j, ['#bce7c8', '#edca91', '#9ecfd5'][i]);
      }
      // 멀리 떠다니는 작은 해파리.
      for (let i = 0; i < 2; i++) {
        const x = w * (.22 + .61 * i) + Math.sin(t * .3 + i) * 12 * s, y = h * (.37 + .13 * i) + Math.sin(t * .6 + i) * 9 * s;
        g.fillStyle = 'rgba(195,218,249,.24)'; g.strokeStyle = 'rgba(213,239,247,.4)'; g.lineWidth = s;
        g.beginPath(); g.ellipse(x, y, 16 * s, 13 * s, 0, Math.PI, TAU); g.quadraticCurveTo(x, y + 7 * s, x - 16 * s, y); g.fill(); g.stroke();
        for (let j = -1; j <= 1; j++) { g.beginPath(); g.moveTo(x + j * 7 * s, y + 2 * s); g.bezierCurveTo(x + j * 7 * s + 5 * s, y + 12 * s, x + j * 7 * s - 5 * s, y + 16 * s, x + j * 7 * s + Math.sin(t + j) * 4 * s, y + 24 * s); g.stroke(); }
      }
      kelp(g, w * .05, h * .9, s * 1.4, t, '#256c67');
      kelp(g, w * .93, h * .88, s * 1.2, t + 2, '#327f71');
      g.strokeStyle = 'rgba(211,255,217,.09)'; g.lineWidth = 1.2 * s;
      for (let i = 0; i < 12; i++) {
        const x = w * MC.hash(i * 3.71), y = h * (.89 + MC.hash(i * 6.3) * .1);
        g.beginPath(); g.ellipse(x + Math.sin(t * .5 + i) * 6 * s, y, (18 + i % 4 * 7) * s, 4 * s, .15 * Math.sin(t * .4 + i), .2, 2.7); g.stroke();
      }
      this.drawClam(g);
      for (let i = 0; i < 26; i++) {
        const x = MC.hash(i * 5.3) * w + Math.sin(t * .3 + i) * 7 * s, y = (MC.hash(i * 7.9) * h - t * (2 + i % 3) % h + h) % h;
        g.fillStyle = `rgba(206,251,231,${.1 + .12 * Math.sin(t + i) ** 2})`; oval(g, x, y, s, s); g.fill();
      }
    }

    drawClam(g) {
      const { x, y } = this.clam, k = this.s, a = MC.clamp(this.open * 2, 0, 1);
      g.save(); g.translate(x, y); g.scale(k, k);
      g.fillStyle = 'rgba(16,72,76,.3)'; oval(g, 0, 4, 38, 7); g.fill();
      g.fillStyle = '#b7819e'; g.strokeStyle = '#725979'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(-31, 0); g.bezierCurveTo(-35, -19 - 27 * a, 35, -19 - 27 * a, 31, 0); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = '#dfb3c5'; g.lineWidth = 1;
      for (let j = -2; j <= 2; j++) { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(j * 7, -10 - 8 * a, j * 10, -11 - 18 * a); g.stroke(); }
      g.fillStyle = '#f2d1c5'; oval(g, 0, 0, 31, 10); g.fill(); g.strokeStyle = '#b78999'; g.stroke();
      if (a > .01) {
        g.globalAlpha = a;
        const pearl = g.createRadialGradient(-3, -9, 1, 0, -6, 9); pearl.addColorStop(0, '#fffef3'); pearl.addColorStop(.5, '#f3e4df'); pearl.addColorStop(1, '#b8c5df');
        g.fillStyle = pearl; oval(g, 0, -7, 8, 8); g.fill();
        g.strokeStyle = 'rgba(255,255,232,.8)'; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(14, -27); g.lineTo(14, -17); g.moveTo(9, -22); g.lineTo(19, -22); g.stroke();
      } else {
        g.strokeStyle = 'rgba(244,235,214,.75)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-7, -23); g.lineTo(0, -18); g.lineTo(7, -23); g.stroke();
      }
      g.restore();
    }

    drawFront(g) {
      const { w, h, s, t } = this;
      kelp(g, -4 * s, h + 6 * s, s * 1.8, t + 1, '#286e64');
      kelp(g, w + 5 * s, h + 8 * s, s * 1.6, t, '#338472');
      for (const b of this.bubbles) {
        g.strokeStyle = `rgba(213,251,245,${.45 * Math.min(1, 7 - b.age)})`; g.lineWidth = .9 * s;
        oval(g, b.x, b.y, b.r, b.r * 1.07); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.45)'; oval(g, b.x - b.r * .3, b.y - b.r * .35, Math.max(.3, b.r * .19), Math.max(.3, b.r * .19)); g.fill();
      }
    }

    gear(g, p, front) {
      g.save(); g.translate(p.x, p.y); g.scale(p.k, p.k); g.lineJoin = 'round'; g.lineCap = 'round';
      if (!front) {
        // 둥근 밸브와 고정 띠 두 개가 달린 작은 공기통.
        for (const side of [-1, 1]) {
          const x = side * 29;
          const tank = g.createLinearGradient(x - 9, 0, x + 9, 0); tank.addColorStop(0, '#628e99'); tank.addColorStop(.45, '#d5e8df'); tank.addColorStop(1, '#668b96');
          g.fillStyle = tank; g.strokeStyle = '#345762'; g.lineWidth = 2;
          MC.roundRect(g, x - 10, -57, 20, 49, 9); g.fill(); g.stroke();
          g.fillStyle = '#4a7078'; g.fillRect(x - 10, -43, 20, 5); g.fillRect(x - 10, -23, 20, 4);
          g.fillStyle = '#d9bc77'; MC.roundRect(g, x - 4, -64, 8, 8, 2); g.fill(); g.stroke();
        }
        // 원래의 짧은 발 옆에서 살짝 움직이는 오리발.
        for (const side of [-1, 1]) {
          g.save(); g.translate(side * 18, -2); g.rotate(side * (.18 + .09 * Math.sin(this.t * 3)));
          g.fillStyle = '#d8bc79'; g.strokeStyle = '#6b8175'; g.lineWidth = 1.5;
          g.beginPath(); g.moveTo(-6, -7); g.lineTo(6, -7); g.lineTo(12, 12); g.quadraticCurveTo(0, 17, -12, 12); g.closePath(); g.fill(); g.stroke(); g.restore();
        }
      } else {
        // 얼굴이 보이는 둥근 유리, 목의 밀폐 고리와 호스.
        const glass = g.createLinearGradient(-45, -110, 44, -42); glass.addColorStop(0, 'rgba(221,255,246,.16)'); glass.addColorStop(.5, 'rgba(204,246,242,.025)'); glass.addColorStop(1, 'rgba(148,235,233,.13)');
        g.fillStyle = glass; g.strokeStyle = '#a5d9d5'; g.lineWidth = 2.4;
        oval(g, 0, -77, 47, 45); g.fill(); g.stroke();
        g.strokeStyle = 'rgba(247,255,246,.8)'; g.lineWidth = 4;
        g.beginPath(); g.ellipse(0, -77, 39, 38, 0, Math.PI * 1.08, Math.PI * 1.36); g.stroke();
        g.lineWidth = 1.7; g.beginPath(); g.ellipse(0, -77, 40, 39, 0, -.2, .35); g.stroke();
        g.fillStyle = '#c3d8cc'; g.strokeStyle = '#487880'; g.lineWidth = 2;
        oval(g, 0, -35, 24, 5); g.fill(); g.stroke();
        g.strokeStyle = '#395d65'; g.lineWidth = 5; g.beginPath(); g.moveTo(26, -56); g.bezierCurveTo(45, -59, 50, -34, 23, -35); g.stroke();
        g.strokeStyle = '#9bbfb6'; g.lineWidth = 2; g.stroke();
        g.fillStyle = '#e0c47c'; oval(g, 24, -35, 5, 5); g.fill();
      }
      g.restore();
    }
  }
  MC.SeaLife = { fish, kelp, gull };
  MC.DiveWorld = DiveWorld;
})(window.MC = window.MC || {});
