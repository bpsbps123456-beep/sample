/* 물 위의 작은 생명과 유리 헬멧을 쓰고 산책하는 바닷속. 모두 캔버스에 그린다. */
(function (MC) {
  'use strict';
  const TAU = Math.PI * 2;
  const oval = (g, x, y, a, b) => { g.beginPath(); g.ellipse(x, y, a, b, 0, 0, TAU); };
  const tone = (hex, amount) => {
    const n = parseInt(hex.slice(1), 16), to = amount > 0 ? 255 : 0, a = Math.abs(amount);
    return `rgb(${[n >> 16 & 255, n >> 8 & 255, n & 255].map(v => Math.round(v + (to - v) * a)).join(',')})`;
  };
  const fishBodies = new Map(), fronds = new Map();

  function fishBody(color, kind) {
    const key = color + kind;
    if (fishBodies.has(key)) return fishBodies.get(key);
    const c = MC.canvas(72, 64), g = c.getContext('2d');
    g.scale(2, 2); g.translate(18, 16);
    const h = kind === 1 ? 7.3 : kind === 2 ? 8 : 5.6;
    const body = () => {
      g.beginPath(); g.moveTo(-12, 0); g.bezierCurveTo(-7, -h - 2, 6, -h - 1, 12, -.6);
      g.quadraticCurveTo(13, 0, 11, 1.6); g.bezierCurveTo(5, h + 2, -6, h, -12, 0); g.closePath();
    };
    g.lineJoin = 'round'; g.lineCap = 'round';
    // 지느러미는 몸 뒤에, 가는 방사형 뼈가 비치도록.
    g.fillStyle = tone(color, -.2); g.strokeStyle = tone(color, -.35); g.lineWidth = .45;
    g.beginPath(); g.moveTo(-7, -3); g.quadraticCurveTo(-4, -h - 7, 1, -h - 4); g.lineTo(7, -3); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = tone(color, .4); g.lineWidth = .35;
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-6 + i * 2.4, -3); g.lineTo(-3 + i * 1.5, -h - 3 + i * .6); g.stroke(); }
    g.fillStyle = tone(color, .1); g.beginPath(); g.moveTo(-7, 3); g.lineTo(-3, h + 3); g.lineTo(1, 4); g.closePath(); g.fill();
    const skin = g.createLinearGradient(0, -h, 1, h);
    skin.addColorStop(0, tone(color, -.3)); skin.addColorStop(.4, color); skin.addColorStop(.76, tone(color, .35)); skin.addColorStop(1, '#e1e6c8');
    body(); g.fillStyle = skin; g.fill();
    g.save(); body(); g.clip();
    if (kind === 1) {
      for (const x of [-6, 1, 7]) {
        g.strokeStyle = tone(color, -.4); g.lineWidth = 3.8; g.beginPath(); g.moveTo(x - 1, -9); g.quadraticCurveTo(x + 2, 0, x - 1, 9); g.stroke();
        g.strokeStyle = '#f4e9d1'; g.lineWidth = 2.4; g.stroke();
      }
    } else if (kind === 2) {
      g.strokeStyle = tone(color, -.25); g.lineWidth = .7;
      for (let j = -2; j <= 2; j++) { g.beginPath(); g.moveTo(-12, j * 2); g.quadraticCurveTo(-1, j * 2 - 2, 12, j * 1.6); g.stroke(); }
    }
    // 겹친 비늘과 옆줄. 작은 무리도 같은 그림을 공유한다.
    g.strokeStyle = 'rgba(246,255,232,.34)'; g.lineWidth = .35;
    for (let row = -2; row <= 2; row++) for (let col = 0; col < 7; col++) {
      const x = -8 + col * 2.4 + (row % 2) * 1.1, y = row * 2;
      g.beginPath(); g.arc(x, y, 1.25, -.9, .9); g.stroke();
    }
    g.strokeStyle = 'rgba(24,74,81,.25)'; g.lineWidth = .55;
    g.beginPath(); g.moveTo(-10, .4); g.quadraticCurveTo(-1, -1.3, 5, .3); g.stroke();
    g.restore();
    body(); g.strokeStyle = tone(color, -.48); g.lineWidth = .65; g.stroke();
    g.strokeStyle = tone(color, -.38); g.lineWidth = .65;
    g.beginPath(); g.moveTo(5, -3.5); g.quadraticCurveTo(2, -.3, 5, 3.8); g.stroke();
    g.fillStyle = '#e9dbb2'; oval(g, 8, -1.4, 2, 2); g.fill();
    g.fillStyle = '#163b49'; oval(g, 8.5, -1.4, 1.25, 1.4); g.fill();
    g.fillStyle = '#fffceb'; oval(g, 8.8, -1.9, .45, .45); g.fill();
    g.strokeStyle = tone(color, -.4); g.lineWidth = .55; g.beginPath(); g.moveTo(10.2, 1); g.lineTo(11.7, .5); g.stroke();
    if (fishBodies.size > 30) fishBodies.delete(fishBodies.keys().next().value);
    fishBodies.set(key, c); return c;
  }

  function fish(g, x, y, size, dir, t, color = '#b3ebd4', kind = 0) {
    g.save(); g.translate(x, y); g.scale(size * dir, size);
    const wag = Math.sin(t * 4.5) * 1.5;
    g.fillStyle = tone(color, -.08); g.strokeStyle = tone(color, -.4); g.lineWidth = .6;
    g.beginPath(); g.moveTo(-10, 0); g.quadraticCurveTo(-16, -2, -20, -7 + wag); g.quadraticCurveTo(-17, -.5, -19, 6 + wag); g.quadraticCurveTo(-15, 3, -10, 0); g.fill(); g.stroke();
    g.strokeStyle = tone(color, .35); g.lineWidth = .4;
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(-11, 0); g.lineTo(-18, i * 4 + wag); g.stroke(); }
    g.drawImage(fishBody(color, kind), -18, -16, 36, 32);
    g.save(); g.translate(1.7, 1); g.rotate(.2 + Math.sin(t * 5) * .18);
    g.fillStyle = 'rgba(234,244,211,.45)'; g.strokeStyle = tone(color, -.22); g.lineWidth = .4;
    g.beginPath(); g.moveTo(0, -1); g.quadraticCurveTo(-7, 0, -5, 5); g.quadraticCurveTo(-2, 5, 0, -1); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-.4, .4); g.lineTo(-4.5, 3.4); g.stroke(); g.restore();
    g.restore();
  }

  function frondSprites(color) {
    if (fronds.has(color)) return fronds.get(color);
    const out = [];
    for (let i = 0; i < 5; i++) {
      const c = MC.canvas(180, 260), g = c.getContext('2d'); g.scale(2, 2); g.translate(45, 126);
      const h = 76 + i % 3 * 17, bend = (i - 2) * 4;
      g.lineCap = 'round'; g.strokeStyle = tone(color, -.25); g.lineWidth = 3.2;
      g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-bend, -h * .35, bend, -h * .7, bend, -h); g.stroke();
      for (let j = 1; j <= 6; j++) {
        const f = j / 7, x = bend * f * f, y = -h * f, side = (i + j) % 2 ? 1 : -1;
        const len = 14 + (1 - f) * 15, tipX = x + side * len, tipY = y - 17;
        const leaf = g.createLinearGradient(x, y, tipX, tipY);
        leaf.addColorStop(0, tone(color, -.15)); leaf.addColorStop(.5, color); leaf.addColorStop(1, tone(color, .28));
        g.fillStyle = leaf; g.strokeStyle = tone(color, -.2); g.lineWidth = .7;
        g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + side * 11, y - 20, tipX - side * 4, tipY - 8, tipX, tipY);
        g.bezierCurveTo(tipX + side * 3, tipY + 10, x + side * 8, y + 2, x, y); g.fill(); g.stroke();
        g.strokeStyle = tone(color, .32); g.lineWidth = .65;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + side * len * .52, y - 13, tipX, tipY); g.stroke();
        g.strokeStyle = 'rgba(195,231,161,.25)'; g.lineWidth = .4;
        for (let v = 1; v <= 3; v++) {
          const u = v / 4, xx = x + side * len * u, yy = y - 17 * u;
          g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx - side * 2, yy - 5); g.moveTo(xx, yy); g.lineTo(xx + side * 4, yy + 1); g.stroke();
        }
      }
      out.push(c);
    }
    fronds.set(color, out); return out;
  }

  function kelp(g, x, y, k, t, color = '#398e78') {
    const leaves = frondSprites(color);
    g.save(); g.translate(x, y); g.scale(k, k);
    for (let i = 0; i < 5; i++) {
      g.save(); g.translate((i - 2) * 5, 0); g.rotate((i - 2) * .11 + Math.sin(t * .8 + i * .7) * .055);
      g.drawImage(leaves[i], -45, -126, 90, 130); g.restore();
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

  function rock(g, x, y, rx, ry, seed, detailed = true) {
    const rnd = MC.rng(seed), points = [];
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * TAU, r = .82 + rnd() * .22;
      points.push([Math.cos(a) * rx * r, Math.sin(a) * ry * r]);
    }
    g.save(); g.translate(x, y);
    const path = () => {
      g.beginPath();
      const last = points[points.length - 1]; g.moveTo((last[0] + points[0][0]) / 2, (last[1] + points[0][1]) / 2);
      points.forEach((p, i) => { const q = points[(i + 1) % points.length]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }); g.closePath();
    };
    const skin = g.createLinearGradient(-rx * .4, -ry, rx * .4, ry);
    skin.addColorStop(0, detailed ? '#7caaa3' : '#3f8587'); skin.addColorStop(.35, detailed ? '#567e80' : '#2e727a'); skin.addColorStop(1, detailed ? '#315c6a' : '#225b6c');
    path(); g.fillStyle = skin; g.fill();
    g.save(); path(); g.clip();
    g.strokeStyle = detailed ? 'rgba(18,62,73,.34)' : 'rgba(12,60,74,.15)'; g.lineWidth = detailed ? 1.1 : .8;
    for (let i = 0; i < 5; i++) {
      const xx = (rnd() - .5) * rx * 1.4, yy = (rnd() - .5) * ry;
      g.beginPath(); g.moveTo(xx - rx * .2, yy - ry * .5); g.lineTo(xx, yy); g.lineTo(xx - rx * .1, yy + ry * .4); g.stroke();
      g.strokeStyle = 'rgba(177,207,185,.18)'; g.beginPath(); g.moveTo(xx + 1, yy); g.lineTo(xx - rx * .1 + 1, yy + ry * .4); g.stroke();
    }
    for (let i = 0; i < (detailed ? 75 : 24); i++) {
      g.fillStyle = i % 3 ? 'rgba(194,211,171,.12)' : 'rgba(11,45,58,.16)';
      const r = .5 + rnd() * 1.6; oval(g, (rnd() - .5) * rx * 2, (rnd() - .5) * ry * 2, r, r * .6); g.fill();
    }
    // 바위 어깨에 붙은 이끼와 작은 따개비의 구멍.
    if (detailed) {
      g.fillStyle = 'rgba(98,151,108,.48)';
      for (let i = 0; i < 12; i++) { oval(g, (rnd() - .5) * rx * 1.6, -ry * (.25 + rnd() * .5), 3 + rnd() * 7, 1 + rnd() * 3); g.fill(); }
      for (let i = 0; i < 8; i++) {
        const xx = (rnd() - .5) * rx * 1.4, yy = (rnd() - .5) * ry * .8, r = 1.8 + rnd() * 2.3;
        g.fillStyle = '#a9bca7'; oval(g, xx, yy, r, r * .75); g.fill();
        g.strokeStyle = '#628782'; g.lineWidth = .6; g.stroke();
        g.fillStyle = '#365968'; oval(g, xx + .2, yy + .2, r * .45, r * .35); g.fill();
      }
    }
    g.restore(); path(); g.strokeStyle = 'rgba(30,79,82,.35)'; g.lineWidth = .8; g.stroke(); g.restore();
  }

  function coral(g, x, y, k, seed, color) {
    const rnd = MC.rng(seed), branches = [];
    const grow = (px, py, len, angle, depth) => {
      const ex = px + Math.sin(angle) * len, ey = py - Math.cos(angle) * len;
      branches.push({ px, py, ex, ey, depth, bend: (rnd() - .5) * 6 });
      if (depth > 0) {
        grow(ex, ey, len * (.63 + rnd() * .1), angle - .38 - rnd() * .2, depth - 1);
        grow(ex, ey, len * (.65 + rnd() * .1), angle + .36 + rnd() * .2, depth - 1);
      }
    };
    grow(0, 0, 26, -.2, 3); grow(8, 1, 21, .55, 2); grow(-8, 2, 20, -.6, 2);
    g.save(); g.translate(x, y); g.scale(k, k); g.lineCap = 'round';
    g.fillStyle = 'rgba(18,68,74,.22)'; oval(g, 0, 3, 29, 5); g.fill();
    for (const b of branches) {
      const curve = () => { g.beginPath(); g.moveTo(b.px, b.py); g.quadraticCurveTo((b.px + b.ex) / 2 + b.bend, (b.py + b.ey) / 2, b.ex, b.ey); };
      g.strokeStyle = tone(color, -.33); g.lineWidth = 2.4 + b.depth * 2.1; curve(); g.stroke();
      g.strokeStyle = color; g.lineWidth = 1.5 + b.depth * 1.7; curve(); g.stroke();
      g.strokeStyle = tone(color, .35); g.lineWidth = .65 + b.depth * .4; curve(); g.stroke();
      for (let i = 1; i <= 4; i++) {
        const u = i / 5, xx = MC.lerp(b.px, b.ex, u), yy = MC.lerp(b.py, b.ey, u), side = i % 2 ? 1 : -1;
        g.fillStyle = tone(color, .35); oval(g, xx + side * (1.2 + b.depth), yy, .8, .8); g.fill();
        g.fillStyle = tone(color, -.22); oval(g, xx + side * (.5 + b.depth), yy + .7, .4, .4); g.fill();
      }
      if (b.depth === 0) { g.fillStyle = tone(color, .5); oval(g, b.ex, b.ey, 1.8, 1.8); g.fill(); }
    }
    g.restore();
  }

  function sponge(g, x, y, k) {
    g.save(); g.translate(x, y); g.scale(k, k);
    for (const [xx, yy, h, r] of [[-13, 1, 32, 7], [11, 2, 39, 8], [0, 5, 27, 9], [23, 4, 23, 6]]) {
      const skin = g.createLinearGradient(xx - r, 0, xx + r, 0);
      skin.addColorStop(0, '#5e7999'); skin.addColorStop(.4, '#a4acc2'); skin.addColorStop(1, '#647f98');
      g.fillStyle = skin; g.strokeStyle = '#44697e'; g.lineWidth = .9;
      g.beginPath(); g.moveTo(xx - r, yy); g.bezierCurveTo(xx - r * 1.3, yy - h * .3, xx - r * .8, yy - h * .7, xx - r, yy - h); g.lineTo(xx + r, yy - h); g.bezierCurveTo(xx + r * .8, yy - h * .7, xx + r * 1.2, yy - h * .3, xx + r, yy); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(210,217,214,.25)'; g.lineWidth = .6;
      for (let j = 1; j <= 4; j++) { g.beginPath(); g.ellipse(xx, yy - j * h / 5, r, 1.6, 0, 0, Math.PI); g.stroke(); }
      g.fillStyle = '#b9b8c4'; oval(g, xx, yy - h, r, r * .4); g.fill();
      g.fillStyle = '#334f69'; oval(g, xx, yy - h + .2, r * .68, r * .23); g.fill();
      g.fillStyle = 'rgba(35,69,91,.3)';
      for (let j = 0; j < 14; j++) { const a = MC.hash(j * 4 + xx) * 2 - 1; oval(g, xx + a * r * .65, yy - 3 - MC.hash(j * 3 + h) * (h - 6), .65, 1); g.fill(); }
    }
    g.restore();
  }

  function starfish(g, x, y, k, rotation) {
    g.save(); g.translate(x, y); g.rotate(rotation); g.scale(k, k);
    const path = () => {
      g.beginPath();
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, r = i % 2 ? 8 : 23; const xx = Math.cos(a) * r, yy = Math.sin(a) * r * .7; if (!i) g.moveTo(xx, yy); else g.lineTo(xx, yy); } g.closePath();
    };
    g.fillStyle = 'rgba(32,76,77,.2)'; oval(g, 0, 5, 23, 8); g.fill();
    const skin = g.createRadialGradient(-3, -5, 1, 0, 0, 24); skin.addColorStop(0, '#efbe8a'); skin.addColorStop(.45, '#d9926c'); skin.addColorStop(1, '#b2715e');
    path(); g.fillStyle = skin; g.fill(); g.strokeStyle = '#a57164'; g.lineWidth = 1; g.lineJoin = 'round'; g.stroke();
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU - Math.PI / 2;
      g.strokeStyle = '#e4ae80'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 19, Math.sin(a) * 13); g.stroke();
      for (let j = 0; j < 6; j++) { const r = 3 + j * 2.7; g.fillStyle = j % 2 ? '#ae7963' : '#f1cea2'; oval(g, Math.cos(a) * r, Math.sin(a) * r * .7, .8, .65); g.fill(); }
    }
    g.restore();
  }

  function shell(g, x, y, k, rotation = 0) {
    g.save(); g.translate(x, y); g.rotate(rotation); g.scale(k, k);
    const skin = g.createLinearGradient(-12, -12, 8, 8); skin.addColorStop(0, '#efe0bb'); skin.addColorStop(.5, '#d0b89d'); skin.addColorStop(1, '#9b9b94');
    g.fillStyle = skin; g.strokeStyle = '#8f9b95'; g.lineWidth = .8;
    oval(g, 0, 0, 13, 9); g.fill(); g.stroke();
    g.strokeStyle = '#a69586'; g.lineWidth = .7; g.beginPath();
    for (let i = 0; i < 90; i++) { const a = i / 89 * Math.PI * 4.6, r = 10 * (1 - i / 96); const xx = Math.cos(a) * r - 1, yy = Math.sin(a) * r * .65 - 1; if (!i) g.moveTo(xx, yy); else g.lineTo(xx, yy); } g.stroke();
    g.strokeStyle = 'rgba(255,245,211,.65)'; g.lineWidth = .7; g.beginPath(); g.ellipse(0, 0, 11, 7.5, 0, 3.5, 5.7); g.stroke();
    g.restore();
  }

  function jelly(g, x, y, k, t, pink = false) {
    const pulse = Math.sin(t * 1.6), width = 24 * (1 + pulse * .045), height = 25 * (1 - pulse * .06);
    g.save(); g.translate(x, y); g.scale(k, k); g.lineCap = 'round';
    // 가느다란 촉수와 안쪽의 넓은 구완을 따로 겹친다.
    for (let j = 0; j < 11; j++) {
      const xx = (j - 5) * 4, len = 27 + MC.hash(j * 7.2) * 24, sway = Math.sin(t * .9 + j * .7) * 7;
      g.strokeStyle = pink ? 'rgba(240,201,220,.35)' : 'rgba(186,237,231,.38)'; g.lineWidth = .55 + j % 3 * .15;
      g.beginPath(); g.moveTo(xx, 1); g.bezierCurveTo(xx + sway, len * .35, xx - sway, len * .7, xx + Math.sin(t + j) * 5, len); g.stroke();
    }
    for (let j = -1; j <= 1; j++) {
      const xx = j * 7, sway = Math.sin(t * 1.1 + j) * 5;
      g.fillStyle = pink ? 'rgba(228,180,211,.17)' : 'rgba(171,225,222,.2)';
      g.beginPath(); g.moveTo(xx - 3, -1); g.bezierCurveTo(xx + sway + 7, 12, xx - sway - 8, 25, xx + sway, 36); g.bezierCurveTo(xx - sway - 2, 24, xx + sway + 1, 10, xx + 3, -1); g.fill();
    }
    const bell = () => {
      g.beginPath(); g.moveTo(-width, 1); g.bezierCurveTo(-width, -height * .65, -width * .5, -height, 0, -height);
      g.bezierCurveTo(width * .5, -height, width, -height * .65, width, 1);
      for (let j = 8; j >= 0; j--) { const xx = -width + j / 8 * width * 2; g.quadraticCurveTo(xx + width / 8, j % 2 ? 4 : 6, xx, 2); } g.closePath();
    };
    const skin = g.createRadialGradient(-7, -17, 2, 0, -4, 31);
    skin.addColorStop(0, pink ? 'rgba(244,213,230,.5)' : 'rgba(208,247,230,.5)'); skin.addColorStop(.55, pink ? 'rgba(184,169,215,.25)' : 'rgba(136,208,218,.25)'); skin.addColorStop(1, 'rgba(198,241,231,.08)');
    bell(); g.fillStyle = skin; g.fill(); g.strokeStyle = 'rgba(210,246,235,.5)'; g.lineWidth = .8; g.stroke();
    g.save(); bell(); g.clip();
    g.strokeStyle = 'rgba(230,249,235,.21)'; g.lineWidth = .6;
    for (let j = -3; j <= 3; j++) { g.beginPath(); g.moveTo(0, -height + 2); g.quadraticCurveTo(j * 4, -height * .6, j * 7, 2); g.stroke(); }
    for (let j = 0; j < 4; j++) {
      const a = j / 4 * TAU; g.strokeStyle = pink ? 'rgba(243,196,215,.5)' : 'rgba(190,239,211,.5)'; g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(Math.cos(a) * 4, -8 + Math.sin(a) * 3, 3.6, 2.6, a, 0, TAU); g.stroke();
    }
    g.strokeStyle = 'rgba(245,255,241,.65)'; g.lineWidth = 1.3; g.beginPath(); g.ellipse(0, -2, width * .83, height * .8, 0, 3.5, 4.6); g.stroke();
    g.restore(); g.restore();
  }

  // 큰 바다 친구들: 고래의 둥근 머리와 배 주름, 상어의 등지느러미·아가미를 구분한다.
  function seaGiant(g, q, t) {
    const whale = q.kind === 'whale', spotted = q.kind === 'whale-shark';
    g.save(); g.translate(q.x, q.y); g.scale(q.k * q.dir, q.k);
    g.lineJoin = 'round'; g.strokeStyle = '#254b65'; g.lineWidth = 1.8;
    const fill = path => { g.beginPath(); path(); g.closePath(); g.fill(); g.stroke(); };
    g.fillStyle = whale ? '#6f9fc0' : '#729aab';
    const wag = Math.sin(t * 1.8) * 6;
    fill(() => { g.moveTo(-67, 0); g.lineTo(-106, -28 + wag); g.quadraticCurveTo(-93, -5, -99, 25 + wag); g.lineTo(-65, 7); });
    fill(() => { g.moveTo(-24, -18); g.quadraticCurveTo(-23, -39, -5, -45); g.lineTo(9, -19); });
    const skin = g.createLinearGradient(0, -32, 0, 32);
    skin.addColorStop(0, whale ? '#6296b5' : '#638ca2'); skin.addColorStop(.6, whale ? '#8bbecb' : '#8eb1bb'); skin.addColorStop(1, '#d0e4dc');
    g.fillStyle = skin;
    fill(() => { g.moveTo(-74, 0); g.bezierCurveTo(-40, -31, 37, -39, 70, -17); g.quadraticCurveTo(whale ? 94 : 108, 2, 71, 17); g.bezierCurveTo(25, 39, -42, 24, -74, 0); });
    g.fillStyle = '#bedbd7';
    fill(() => { g.moveTo(-1, 12); g.quadraticCurveTo(-13, 47, 17, 40); g.lineTo(29, 14); });
    g.strokeStyle = '#557c93'; g.lineWidth = 1;
    for (let i = 0; i < (whale ? 5 : 4); i++) {
      g.beginPath();
      if (whale) { g.moveTo(19 + i * 9, 13); g.quadraticCurveTo(17 + i * 8, 22, -8 + i * 12, 24); }
      else { g.moveTo(29 - i * 5, -9); g.quadraticCurveTo(24 - i * 5, 0, 29 - i * 5, 9); }
      g.stroke();
    }
    if (spotted) {
      g.fillStyle = '#d8ebe0';
      for (let j = 0; j < 24; j++) { oval(g, -48 + j % 8 * 12, -14 + Math.floor(j / 8) * 10, 1.8, 1.4); g.fill(); }
    }
    g.fillStyle = '#183d53'; oval(g, 60, -4, 3, 3.6); g.fill();
    g.fillStyle = '#f2fff1'; oval(g, 61, -5, 1, 1); g.fill();
    g.strokeStyle = '#365b71'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(67, 9); g.quadraticCurveTo(78, 13, 83, 6); g.stroke();
    g.restore();
  }

  class DiveWorld {
    constructor() { this.t = 0; this.open = 0; this.lid = 0; this.bubbles = []; this.nextBubble = 0; this.coins = []; this.pending = null; this.onToast = null; }

    chests() { return MC.Wardrobe.chests.map(c => ({ ...c, x: this.w * c.u, y: this.floorAt(c.u) - 7 * this.s })); }
    giants() {
      return ['whale', 'shark', 'whale-shark'].map((kind, i) => {
        const a = this.t * (.065 + i * .013) + i * 2.1;
        return { kind, name: ['혹등고래', '산호초 상어', '고래상어'][i], x: this.w * (.5 + .25 * Math.sin(a)),
          y: this.h * (.26 + i * .17) + Math.sin(this.t * .5 + i) * 6 * this.s,
          k: Math.min(this.s * (i ? .8 : 1.2), this.w / (i ? 390 : 300)), dir: Math.cos(a) < 0 ? -1 : 1 };
      });
    }
    seek(chest, crowd) {
      if (MC.Wardrobe.remaining(chest.id)) {
        this.onToast?.(`보물이 다시 차오르는 중 · ${Math.ceil(MC.Wardrobe.remaining(chest.id) / 1000)}초 뒤에 열어요`); return;
      }
      this.pending = chest.id;
      crowd.walkTo(chest.x, Math.min(chest.y - 4 * this.s, this.h * .81));
      this.onToast?.('보물상자로 헤엄쳐 가요! 가까이 가면 열려요');
    }
    findTreasure(crowd) {
      const ready = this.chests().filter(c => !MC.Wardrobe.remaining(c.id));
      ready.sort((a, b) => Math.hypot(a.x - crowd.pup.x, a.y - crowd.pup.y) - Math.hypot(b.x - crowd.pup.x, b.y - crowd.pup.y));
      if (ready[0]) this.seek(ready[0], crowd);
      else this.onToast?.('상자를 모두 열었어요. 상자마다 2분 뒤에 보물이 다시 생겨요');
    }

    floorAt(u) { return this.h * (.835 + .026 * Math.sin(u * 7.4 + .3) - .012 * Math.sin(u * 15)); }

    resize(w, h, s, dpr) {
      Object.assign(this, { w, h, s });
      this.clam = { x: w * .72, y: this.floorAt(.72) - 3 * s, r: 43 * s };
      const c = this.bg = MC.canvas(w * dpr, h * dpr), g = c.getContext('2d'); g.scale(dpr, dpr);
      const water = g.createLinearGradient(0, 0, w * .2, h);
      water.addColorStop(0, '#57baa9'); water.addColorStop(.24, '#2b8990'); water.addColorStop(.65, '#195d75'); water.addColorStop(1, '#143f5b');
      g.fillStyle = water; g.fillRect(0, 0, w, h);
      const rnd = MC.rng(8081);
      // 먼 암초는 물안개 뒤에 겹치고, 가까운 바위에만 균열과 따개비를 새긴다.
      for (let layer = 0; layer < 3; layer++) {
        g.fillStyle = ['rgba(39,112,126,.35)', 'rgba(33,101,115,.5)', 'rgba(31,87,103,.7)'][layer];
        g.beginPath(); g.moveTo(0, h);
        for (let j = 0; j <= 30; j++) {
          const u = j / 30, yy = h * (.7 + layer * .045 + .022 * Math.sin(u * 15 + layer * 2) + .012 * Math.sin(u * 41 + layer));
          g.lineTo(u * w, yy);
        }
        g.lineTo(w, h); g.closePath(); g.fill();
      }
      g.save(); g.globalAlpha = .32;
      for (let i = 0; i < 8; i++) rock(g, w * (i / 7), h * (.79 + .02 * Math.sin(i * 2)), (55 + i % 3 * 22) * s, (20 + i % 2 * 14) * s, i * 91 + 18, false);
      g.restore();
      const sand = g.createLinearGradient(0, h * .79, 0, h);
      sand.addColorStop(0, '#92bca6'); sand.addColorStop(.4, '#74a89a'); sand.addColorStop(1, '#4e8b89');
      const floor = () => { g.beginPath(); g.moveTo(0, h); for (let j = 0; j <= 50; j++) g.lineTo(j / 50 * w, this.floorAt(j / 50)); g.lineTo(w, h); g.closePath(); };
      floor(); g.fillStyle = sand; g.fill();
      g.save(); floor(); g.clip();
      // 모래에 남은 물살의 얇은 이랑과 크기가 다른 모래알.
      for (let i = 0; i < 27; i++) {
        const yy = h * .8 + i * 9 * s;
        g.strokeStyle = i % 3 ? 'rgba(207,225,185,.16)' : 'rgba(35,103,100,.15)'; g.lineWidth = .7 * s;
        g.beginPath();
        for (let j = 0; j <= 40; j++) { const xx = j / 40 * w, y = yy + Math.sin(j * .34 + i * .8) * 5 * s; if (!j) g.moveTo(xx, y); else g.lineTo(xx, y); } g.stroke();
      }
      for (let i = 0; i < 850; i++) {
        const u = rnd(), yy = this.floorAt(u) + rnd() * h * .23, r = (.25 + Math.pow(rnd(), 3) * 1.3) * s;
        g.fillStyle = i % 4 ? 'rgba(231,236,194,.3)' : 'rgba(39,91,88,.24)'; oval(g, u * w, yy, r * 1.5, r); g.fill();
      }
      g.restore();
      for (const [u, offset, rx, ry, seed] of [[.04, 8, 65, 32, 17], [.15, 15, 49, 22, 36], [.9, 12, 70, 36, 71], [1.02, 30, 62, 37, 26], [.51, 28, 19, 9, 88]]) {
        rock(g, w * u, this.floorAt(u) + offset * s, rx * s, ry * s, seed);
      }
      coral(g, w * .12, this.floorAt(.12) + 10 * s, s * 1.3, 35, '#d49c9c');
      coral(g, w * .92, this.floorAt(.92) - 2 * s, s * 1.12, 71, '#dbb389');
      coral(g, w * .79, this.floorAt(.79) + 24 * s, s * .6, 49, '#bc97b2');
      sponge(g, w * .24, this.floorAt(.24) + 13 * s, s * 1.15);
      sponge(g, w * .98, this.floorAt(.98) + 24 * s, s * 1.1);
      starfish(g, w * .37, this.floorAt(.37) + 14 * s, s * .95, -.28);
      starfish(g, w * .86, this.floorAt(.86) + 41 * s, s * .53, .5);
      shell(g, w * .53, this.floorAt(.53) + 16 * s, s * .85, -.3);
      shell(g, w * .31, this.floorAt(.31) + 37 * s, s * .55, .4);
      // 바위 아래에 모인 홍합, 껍질마다 다른 성장선.
      g.save(); g.translate(w * .17, this.floorAt(.17) + 15 * s); g.scale(s, s);
      for (let i = 0; i < 5; i++) {
        g.save(); g.translate(i * 6, i % 2 * 4); g.rotate((i - 2) * .24);
        const mussel = g.createLinearGradient(-5, 0, 5, 0); mussel.addColorStop(0, '#284e68'); mussel.addColorStop(.45, '#68828f'); mussel.addColorStop(1, '#314d66');
        g.fillStyle = mussel; oval(g, 0, 0, 5, 10); g.fill(); g.strokeStyle = '#8caaa5'; g.lineWidth = .6;
        for (let j = 0; j < 3; j++) { g.beginPath(); g.ellipse(0, 1, 2 + j, 5 + j * 1.7, 0, 3.5, 5.8); g.stroke(); }
        g.restore();
      }
      g.restore();
    }

    update(dt, pup) {
      this.t += dt; this.open = Math.max(0, this.open - dt);
      this.lid += ((this.open > 0 ? 1 : 0) - this.lid) * Math.min(1, dt * 5);
      this.nextBubble -= dt;
      if (this.nextBubble <= 0) {
        this.nextBubble = .38;
        this.burst(pup.x + 43 * pup.k, pup.y - 56 * pup.k, 1);
      }
      for (const b of this.bubbles) { b.age += dt; b.y -= dt * (18 + b.r * 4); b.x += Math.sin(this.t * 1.5 + b.ph) * dt * 5; }
      this.bubbles = this.bubbles.filter(b => b.age < 7 && b.y > -10);
      const chest = this.chests().find(c => c.id === this.pending);
      if (chest && Math.hypot(chest.x - pup.x, Math.min(chest.y, this.h * .81) - pup.y) < 38 * this.s) {
        this.pending = null;
        const amount = MC.Wardrobe.claim(chest.id);
        if (amount) {
          this.burst(chest.x, chest.y - 20 * this.s, 12);
          for (let i = 0; i < 9; i++) this.coins.push({ u: chest.u, age: 0, phase: i * TAU / 9 });
          this.onToast?.(`🪙 +${amount} 코인! 바다 상점에서 사용해요`);
        }
      }
      for (const coin of this.coins) coin.age += dt;
      this.coins = this.coins.filter(c => c.age < 1.8).slice(-27);
    }

    burst(x, y, n) {
      for (let i = 0; i < n; i++) this.bubbles.push({ x: x + MC.rand(-8, 8), y, r: MC.rand(1.5, 4) * this.s, age: 0, ph: Math.random() * TAU });
      if (this.bubbles.length > 70) this.bubbles.splice(0, this.bubbles.length - 70);
    }

    poke(x, y, crowd) {
      for (const chest of this.chests()) {
        if (Math.abs(x - chest.x) < Math.max(25, 32 * this.s) && Math.abs(y - chest.y + 15 * this.s) < Math.max(25, 30 * this.s)) {
          if (crowd) this.seek(chest, crowd);
          return true;
        }
      }
      for (const q of this.giants()) if (Math.hypot((x - q.x) / (100 * q.k), (y - q.y) / (38 * q.k)) < 1) {
        this.onToast?.(`${q.name}가 유유히 헤엄치고 있어요`); this.burst(x, y, 3); return false;
      }
      const c = this.clam;
      if (Math.hypot(x - c.x, (y - c.y + 10 * this.s) * 1.3) > c.r + 12 * this.s) return false;
      this.open = 5; this.burst(c.x, c.y - 22 * this.s, 9); this.onToast?.('조개가 작은 진주를 보여 줬어요'); return true;
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
      for (const q of this.giants()) { g.save(); g.globalAlpha = q.kind === 'whale' ? .75 : .9; seaGiant(g, q, t); g.restore(); }
      for (let i = 0; i < 3; i++) {
        const dir = i % 2 ? -1 : 1, span = w + 200;
        const u = ((t * (13 + i * 4) + span * (.22 + i * .31)) % span) - 100;
        const x = dir > 0 ? u : w - u, y = h * (.27 + i * .16);
        g.save(); g.globalAlpha = .55;
        for (let j = 0; j < 6; j++) fish(g, x - j * 29 * s * dir, y + Math.sin(t * .8 + j) * 9 * s + j % 2 * 13 * s, s * (.5 + i * .08), dir, t + j, ['#bce7c8', '#d5c794', '#9ecfd5'][i]);
        g.restore();
      }
      // 가까운 산호초 물고기는 비늘과 무늬가 읽힐 만큼 크게, 무리보다 천천히.
      for (let i = 0; i < 4; i++) {
        const a = t * .12 + i * 1.8, x = w * (.16 + i * .22 + Math.sin(a) * .11), y = h * (.45 + i % 2 * .16) + Math.sin(t * .55 + i) * 9 * s;
        fish(g, x, y, s * (1.4 + i % 2 * .3), Math.cos(a) < 0 ? -1 : 1, t + i, ['#dca86d', '#d58d73', '#87bbcd', '#a9cba2'][i], i % 3);
      }
      // 반투명한 갓 아래의 고리와 여러 길이의 촉수까지 보이는 해파리.
      for (let i = 0; i < 2; i++) {
        const x = w * (.19 + .64 * i) + Math.sin(t * .3 + i) * 12 * s, y = h * (.34 + .13 * i) + Math.sin(t * .6 + i) * 9 * s;
        jelly(g, x, y, s * (1.05 - i * .15), t + i * 2, !!i);
      }
      kelp(g, w * .035, this.floorAt(.035) + 6 * s, s * 1.1, t, '#307f70');
      kelp(g, w * .965, this.floorAt(.965) + 8 * s, s * 1.05, t + 2, '#4b9277');
      kelp(g, w * .6, this.floorAt(.6) + 4 * s, s * .37, t + 1, '#548e78');
      g.strokeStyle = 'rgba(211,255,217,.09)'; g.lineWidth = 1.2 * s;
      for (let i = 0; i < 12; i++) {
        const x = w * MC.hash(i * 3.71), y = h * (.89 + MC.hash(i * 6.3) * .1);
        g.beginPath(); g.ellipse(x + Math.sin(t * .5 + i) * 6 * s, y, (18 + i % 4 * 7) * s, 4 * s, .15 * Math.sin(t * .4 + i), .2, 2.7); g.stroke();
      }
      this.drawClam(g);
      this.drawTreasure(g);
      for (let i = 0; i < 26; i++) {
        const x = MC.hash(i * 5.3) * w + Math.sin(t * .3 + i) * 7 * s, y = (MC.hash(i * 7.9) * h - t * (2 + i % 3) % h + h) % h;
        g.fillStyle = `rgba(206,251,231,${.1 + .12 * Math.sin(t + i) ** 2})`; oval(g, x, y, s, s); g.fill();
      }
    }

    drawTreasure(g) {
      const k = this.s;
      for (const c of this.chests()) {
        const wait = MC.Wardrobe.remaining(c.id);
        g.save(); g.translate(c.x, c.y); g.scale(k, k);
        if (!wait) {
          const glow = g.createRadialGradient(0, -12, 3, 0, -12, 60); glow.addColorStop(0, 'rgba(255,221,118,.32)'); glow.addColorStop(1, 'rgba(255,221,118,0)');
          g.fillStyle = glow; g.fillRect(-60, -72, 120, 120);
        }
        g.fillStyle = '#744b37'; g.strokeStyle = '#453b38'; g.lineWidth = 2;
        MC.roundRect(g, -28, -23, 56, 29, 4); g.fill(); g.stroke();
        g.fillStyle = '#b77b45'; MC.roundRect(g, -29, wait ? -43 : -39, 58, wait ? 15 : 24, 7); g.fill(); g.stroke();
        g.strokeStyle = '#efc574'; g.lineWidth = 5;
        for (const x of [-19, 19]) { g.beginPath(); g.moveTo(x, wait ? -41 : -36); g.lineTo(x, wait ? -29 : 3); g.stroke(); }
        if (wait) { g.fillStyle = '#f7d879'; oval(g, 0, -21, 21, 5); g.fill(); }
        g.fillStyle = '#f4d28a'; MC.roundRect(g, -5, -21, 10, 12, 2); g.fill();
        g.fillStyle = '#675138'; oval(g, 0, -16, 1.8, 2.5); g.fill();
        g.fillStyle = wait ? '#d2e5db' : '#fff0b7'; g.font = '12px system-ui'; g.textAlign = 'center';
        g.fillText(wait ? `${Math.ceil(wait / 1000)}초` : `+${c.coins} 코인`, 0, -51);
        g.restore();
      }
      for (const coin of this.coins) {
        const x = this.w * coin.u + Math.sin(coin.phase) * coin.age * 23 * k, y = this.floorAt(coin.u) - (28 + coin.age * 75) * k;
        g.save(); g.globalAlpha = Math.min(1, (1.8 - coin.age) * 2); g.fillStyle = '#ffda68'; g.strokeStyle = '#b68339'; g.lineWidth = k;
        oval(g, x, y, Math.max(1, Math.abs(Math.cos(coin.age * 7 + coin.phase)) * 5) * k, 6 * k); g.fill(); g.stroke(); g.restore();
      }
    }

    drawClam(g) {
      const { x, y } = this.clam, k = this.s, a = this.lid;
      g.save(); g.translate(x, y); g.scale(k, k);
      g.fillStyle = 'rgba(19,67,77,.27)'; oval(g, 0, 6, 44, 9); g.fill();
      const cup = g.createLinearGradient(0, -8, 0, 13); cup.addColorStop(0, '#d8acb5'); cup.addColorStop(.5, '#aa819f'); cup.addColorStop(1, '#756e92');
      g.fillStyle = cup; oval(g, 0, 3, 39, 12); g.fill(); g.strokeStyle = '#686780'; g.lineWidth = 1.2; g.stroke();
      g.save(); g.translate(0, -2 - 4 * a); g.scale(1, .36 + .64 * a);
      const fan = () => {
        g.beginPath(); g.moveTo(-37, 0); g.quadraticCurveTo(-44, -14, -33, -27); g.quadraticCurveTo(-34, -36, -24, -36);
        g.quadraticCurveTo(-19, -45, -10, -40); g.quadraticCurveTo(0, -49, 10, -40); g.quadraticCurveTo(22, -45, 25, -35);
        g.quadraticCurveTo(39, -35, 37, -24); g.quadraticCurveTo(44, -14, 37, 0); g.quadraticCurveTo(0, 10, -37, 0); g.closePath();
      };
      const lid = g.createRadialGradient(-7, -35, 2, 0, -4, 49); lid.addColorStop(0, '#dec0c6'); lid.addColorStop(.46, '#ba92af'); lid.addColorStop(1, '#8a769c');
      fan(); g.fillStyle = lid; g.fill(); g.strokeStyle = '#776a89'; g.lineWidth = 1.3; g.stroke();
      g.save(); fan(); g.clip();
      for (let j = -5; j <= 5; j++) {
        const xx = j * 7.4, yy = -41 * Math.sqrt(Math.max(0, 1 - (xx / 41) ** 2));
        g.strokeStyle = 'rgba(102,76,123,.42)'; g.lineWidth = 2.4;
        g.beginPath(); g.moveTo(j * 1.8, 6); g.quadraticCurveTo(xx * .58 - 1, yy * .6, xx, yy); g.stroke();
        g.strokeStyle = 'rgba(248,221,216,.63)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(j * 1.8 + 1, 5); g.quadraticCurveTo(xx * .58 + 1, yy * .6, xx + 1, yy); g.stroke();
      }
      g.strokeStyle = 'rgba(249,224,210,.23)'; g.lineWidth = .65;
      for (let j = 1; j <= 6; j++) { g.beginPath(); g.ellipse(0, 4, 7 + j * 5.7, 7 + j * 6.5, 0, Math.PI, TAU); g.stroke(); }
      for (let j = 0; j < 38; j++) {
        g.fillStyle = j % 3 ? 'rgba(246,212,209,.17)' : 'rgba(113,85,131,.2)';
        oval(g, (MC.hash(j * 3.1) - .5) * 77, -MC.hash(j * 7.7) * 42, .5 + j % 3 * .35, .65); g.fill();
      }
      g.restore(); g.restore();
      const nacre = g.createLinearGradient(-25, -5, 28, 7); nacre.addColorStop(0, '#d5bfd1'); nacre.addColorStop(.3, '#f0e4cf'); nacre.addColorStop(.65, '#d1e2d7'); nacre.addColorStop(1, '#c5b2d0');
      g.fillStyle = nacre; oval(g, 0, 0, 36, 8.5); g.fill();
      g.strokeStyle = '#e7d2cc'; g.lineWidth = 1.3; g.stroke();
      g.strokeStyle = 'rgba(144,121,156,.3)'; g.lineWidth = .55;
      for (let j = -4; j <= 4; j++) { g.beginPath(); g.moveTo(j * 3, 4); g.quadraticCurveTo(j * 6, 2, j * 7.5, -3); g.stroke(); }
      if (a > .02) {
        g.globalAlpha = a;
        g.fillStyle = 'rgba(87,94,121,.22)'; oval(g, 1, 2, 11, 3); g.fill();
        const pearl = g.createRadialGradient(-3, -12, 1, 1, -6, 13); pearl.addColorStop(0, '#fffff0'); pearl.addColorStop(.3, '#f5ebdb'); pearl.addColorStop(.65, '#d2d9dc'); pearl.addColorStop(.82, '#b3bfd1'); pearl.addColorStop(1, '#928eae');
        g.fillStyle = pearl; oval(g, 0, -7, 10, 10); g.fill();
        g.strokeStyle = 'rgba(246,206,221,.65)'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, -7, 7.8, .3, 2); g.stroke();
        g.strokeStyle = 'rgba(185,234,220,.75)'; g.lineWidth = 1; g.beginPath(); g.arc(0, -7, 8.5, 2, 3.5); g.stroke();
        g.fillStyle = '#fffdf2'; oval(g, -3.2, -11.2, 2.3, 1.7); g.fill(); oval(g, 2, -14, .8, .7); g.fill();
      }
      g.globalAlpha = .35 + .4 * Math.sin(this.t * 1.4) ** 8; g.strokeStyle = '#fcf0d8'; g.lineWidth = 1;
      const xx = a > .5 ? 17 : 9, yy = a > .5 ? -28 : -17;
      g.beginPath(); g.moveTo(xx, yy - 4); g.quadraticCurveTo(xx, yy, xx + 4, yy); g.quadraticCurveTo(xx, yy, xx, yy + 4); g.quadraticCurveTo(xx, yy, xx - 4, yy); g.quadraticCurveTo(xx, yy, xx, yy - 4); g.stroke();
      g.restore();
    }

    drawFront(g) {
      const { w, h, s, t } = this;
      kelp(g, -4 * s, h + 6 * s, s * 1.8, t + 1, '#286e64');
      kelp(g, w + 5 * s, h + 8 * s, s * 1.6, t, '#338472');
      for (const b of this.bubbles) {
        const a = Math.min(1, 7 - b.age);
        g.fillStyle = `rgba(165,232,220,${.06 * a})`; g.strokeStyle = `rgba(213,251,245,${.45 * a})`; g.lineWidth = .65 * s;
        oval(g, b.x, b.y, b.r, b.r * 1.07); g.fill(); g.stroke();
        g.strokeStyle = `rgba(232,204,232,${.4 * a})`; g.beginPath(); g.arc(b.x, b.y, b.r * .85, .3, 1.6); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.45)'; oval(g, b.x - b.r * .3, b.y - b.r * .35, Math.max(.3, b.r * .19), Math.max(.3, b.r * .19)); g.fill();
      }
    }

    gear(g, p, front) {
      g.save(); g.translate(p.x, p.y); g.scale(p.k, p.k); g.lineJoin = 'round'; g.lineCap = 'round';
      if (!front) {
        // 둥근 밸브와 고정 띠 두 개가 달린 작은 공기통.
        for (const side of [-1, 1]) {
          const x = side * 29;
          const tank = g.createLinearGradient(x - 10, 0, x + 10, 0); tank.addColorStop(0, '#557d8c'); tank.addColorStop(.22, '#8cabae'); tank.addColorStop(.42, '#d9e7d9'); tank.addColorStop(.62, '#acc8c0'); tank.addColorStop(1, '#4a7183');
          g.fillStyle = tank; g.strokeStyle = '#345762'; g.lineWidth = 2;
          MC.roundRect(g, x - 10, -57, 20, 49, 9); g.fill(); g.stroke();
          g.strokeStyle = 'rgba(237,248,225,.65)'; g.lineWidth = 1;
          g.beginPath(); g.moveTo(x - 5, -49); g.lineTo(x - 5, -17); g.stroke();
          for (const y of [-44, -24]) {
            g.fillStyle = '#426575'; g.fillRect(x - 10, y, 20, 5);
            g.strokeStyle = '#7e9d9b'; g.lineWidth = .7; g.beginPath(); g.moveTo(x - 9, y + 1); g.lineTo(x + 9, y + 1); g.stroke();
            g.fillStyle = '#b0bdb0'; MC.roundRect(g, x + side * 4 - 3, y -.4, 6, 5.8, 1); g.fill();
            g.fillStyle = '#455d69'; g.fillRect(x + side * 4 - 1.5, y + 1, 3, 2.4);
          }
          g.fillStyle = '#d5bd7e'; MC.roundRect(g, x - 3.5, -64, 7, 8, 2); g.fill(); g.strokeStyle = '#776f59'; g.lineWidth = .8; g.stroke();
          g.strokeStyle = '#8b947e'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 4, -62); g.lineTo(x + 4, -62); g.moveTo(x - 4, -60); g.lineTo(x + 4, -60); g.stroke();
          g.fillStyle = '#718f96'; oval(g, x, -65, 6, 2.2); g.fill(); g.strokeStyle = '#355969'; g.stroke();
          g.strokeStyle = '#c6d7c7'; g.lineWidth = .7; g.beginPath(); g.moveTo(x - 4, -66); g.lineTo(x + 4, -64); g.moveTo(x - 4, -64); g.lineTo(x + 4, -66); g.stroke();
          g.fillStyle = '#e0dfbd'; MC.roundRect(g, x - 5, -37, 10, 8, 2); g.fill();
          g.strokeStyle = '#5b8e8b'; g.lineWidth = .7; g.beginPath(); g.moveTo(x - 2, -35); g.lineTo(x - 2, -31); g.moveTo(x, -35); g.lineTo(x, -31); g.moveTo(x + 2, -35); g.lineTo(x + 2, -31); g.stroke();
        }
        // 원래의 짧은 발 옆에서 살짝 움직이는 오리발.
        for (const side of [-1, 1]) {
          g.save(); g.translate(side * 18, -2); g.rotate(side * (.18 + .09 * Math.sin(this.t * 3)));
          const web = g.createLinearGradient(0, -7, 0, 16); web.addColorStop(0, '#e8d59b'); web.addColorStop(.45, '#d1b770'); web.addColorStop(1, '#a89467');
          g.fillStyle = web; g.strokeStyle = '#6b8175'; g.lineWidth = 1.2;
          g.beginPath(); g.moveTo(-6, -7); g.lineTo(6, -7); g.lineTo(12, 12); g.quadraticCurveTo(0, 17, -12, 12); g.closePath(); g.fill(); g.stroke();
          g.strokeStyle = '#eedaa2'; g.lineWidth = .8;
          for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 3, -2); g.lineTo(i * 7, 12); g.stroke(); }
          g.fillStyle = '#758b81'; oval(g, 0, -4, 5, 2.5); g.fill(); g.strokeStyle = '#b7c9ac'; g.lineWidth = .7; g.stroke();
          g.restore();
        }
      } else {
        // 얼굴이 보이는 둥근 유리, 목의 밀폐 고리와 호스.
        const glass = g.createLinearGradient(-45, -110, 44, -42); glass.addColorStop(0, 'rgba(221,255,246,.16)'); glass.addColorStop(.5, 'rgba(204,246,242,.025)'); glass.addColorStop(1, 'rgba(148,235,233,.13)');
        g.fillStyle = glass; g.strokeStyle = '#547f89'; g.lineWidth = 3.4;
        oval(g, 0, -77, 47, 45); g.fill(); g.stroke();
        g.strokeStyle = '#b6ded5'; g.lineWidth = 1.3; oval(g, -.2, -77.3, 46, 44); g.stroke();
        g.strokeStyle = 'rgba(148,214,212,.4)'; g.lineWidth = .75; oval(g, 0, -77, 43.5, 41.5); g.stroke();
        for (const a of [0, .68, 2.46, Math.PI]) {
          const x = Math.cos(a) * 47, y = -77 + Math.sin(a) * 45;
          g.fillStyle = '#b9d5c9'; oval(g, x, y, 2.2, 2.2); g.fill();
          g.strokeStyle = '#547981'; g.lineWidth = .6; g.beginPath(); g.moveTo(x - .8, y); g.lineTo(x + .8, y); g.stroke();
        }
        g.strokeStyle = 'rgba(247,255,246,.8)'; g.lineWidth = 4;
        g.beginPath(); g.ellipse(0, -77, 39, 38, 0, Math.PI * 1.08, Math.PI * 1.36); g.stroke();
        g.lineWidth = 1.7; g.beginPath(); g.ellipse(0, -77, 40, 39, 0, -.2, .35); g.stroke();
        // 하네스는 짧은 몸에 맞추고, 목의 고무 씰과 금속 고리를 따로 그린다.
        g.strokeStyle = '#506e75'; g.lineWidth = 4;
        for (const side of [-1, 1]) { g.beginPath(); g.moveTo(side * 16, -31); g.quadraticCurveTo(side * 19, -19, side * 14, -10); g.stroke(); }
        g.strokeStyle = '#9ab4a6'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(-15, -17); g.quadraticCurveTo(0, -13, 15, -17); g.stroke();
        g.fillStyle = '#c3b58a'; MC.roundRect(g, -4, -19, 8, 5, 1.4); g.fill(); g.strokeStyle = '#6a817b'; g.lineWidth = .8; g.stroke();
        g.fillStyle = '#48717b'; oval(g, 0, -34, 24, 5.5); g.fill();
        const collar = g.createLinearGradient(0, -40, 0, -30); collar.addColorStop(0, '#e0e4cc'); collar.addColorStop(.4, '#a8c4b9'); collar.addColorStop(1, '#6f9696');
        g.fillStyle = collar; g.strokeStyle = '#487880'; g.lineWidth = 1.3; oval(g, 0, -36, 25, 4.8); g.fill(); g.stroke();
        for (const x of [-18, -8, 8, 18]) { g.fillStyle = '#5c7b7c'; oval(g, x, -34.8, 1, 1); g.fill(); }
        const hose = () => { g.beginPath(); g.moveTo(29, -58); g.bezierCurveTo(46, -60, 51, -32, 25, -34); };
        g.strokeStyle = '#345766'; g.lineWidth = 5.8; hose(); g.stroke();
        g.strokeStyle = '#8faeaa'; g.lineWidth = 3.2; hose(); g.stroke();
        g.strokeStyle = '#3c646d'; g.lineWidth = 1.1; g.setLineDash([1, 2]); hose(); g.stroke(); g.setLineDash([]);
        // 압력계 유리 안의 눈금과 바늘.
        g.fillStyle = '#d1bc81'; g.strokeStyle = '#526f77'; g.lineWidth = 1; oval(g, 25, -34, 6.2, 6.2); g.fill(); g.stroke();
        g.fillStyle = '#e4ead4'; oval(g, 25, -34, 4.5, 4.5); g.fill();
        g.strokeStyle = '#6e9e85'; g.lineWidth = 1.2; g.beginPath(); g.arc(25, -34, 3.3, 3.7, 5.6); g.stroke();
        g.strokeStyle = '#4c6673'; g.lineWidth = .55;
        for (let j = 0; j < 5; j++) { const a = 3.5 + j * .55; g.beginPath(); g.moveTo(25 + Math.cos(a) * 3.4, -34 + Math.sin(a) * 3.4); g.lineTo(25 + Math.cos(a) * 2.7, -34 + Math.sin(a) * 2.7); g.stroke(); }
        g.strokeStyle = '#a57869'; g.lineWidth = .8; g.beginPath(); g.moveTo(25, -34); g.lineTo(26.4, -36.3); g.stroke();
        g.fillStyle = '#faffeb'; oval(g, 23.5, -36, 1, .6); g.fill();
      }
      g.restore();
    }
  }
  MC.SeaLife = { fish, kelp, gull };
  MC.DiveWorld = DiveWorld;
})(window.MC = window.MC || {});
