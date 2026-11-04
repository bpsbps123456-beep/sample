/* 멍캠프 — 글램핑장 재료와 구조. 지도의 땅/스프라이트를 만들 때 한 번만 그린다. */
(function (MC) {
  'use strict';

  const INK = 'rgba(49,43,33,0.84)';
  const ellipse = (g, x, y, rx, ry) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); };
  const gradient = (g, x0, y0, x1, y1, stops) => {
    const fill = g.createLinearGradient(x0, y0, x1, y1);
    for (const [at, color] of stops) fill.addColorStop(at, color);
    return fill;
  };
  const stroke = (g, color = INK, width = 1.6) => { g.strokeStyle = color; g.lineWidth = width; g.stroke(); };

  function paintDeck(g, seed) {
    const rnd = MC.rng(seed);
    g.lineJoin = g.lineCap = 'round';
    MC.roundRect(g, -94, -20, 192, 61, 6);
    g.fillStyle = 'rgba(35,29,20,0.2)'; g.fill();
    // 두꺼운 앞판과 한 단 낮은 디딤판. 윗면과 나뭇결 방향을 맞춘다.
    MC.roundRect(g, -96, -18, 192, 57, 5);
    g.fillStyle = gradient(g, 0, 28, 0, 39, [[0, '#8c6145'], [1, '#66452f']]);
    g.fill(); stroke(g, INK, 1.8);
    MC.roundRect(g, -31, 32, 62, 12, 3);
    g.fillStyle = '#765039'; g.fill(); stroke(g, INK, 1.3);
    MC.roundRect(g, -33, 30, 66, 7, 2.5);
    g.fillStyle = '#bd9469'; g.fill(); stroke(g, 'rgba(64,44,30,0.6)', 1);
    g.beginPath(); g.moveTo(-28, 33); g.lineTo(28, 33);
    stroke(g, 'rgba(241,211,164,0.5)', 0.8);
    g.save();
    MC.roundRect(g, -96, -26, 192, 58, 5); g.clip();
    g.fillStyle = '#ad835a'; g.fillRect(-96, -26, 192, 58);
    for (let row = 0; row < 7; row++) {
      const y = -26 + row * 8.5;
      g.fillStyle = gradient(g, 0, y, 0, y + 8.5, [[0, row % 2 ? '#bf966d' : '#b68d63'], [1, row % 2 ? '#a47b54' : '#ac8058']]);
      g.fillRect(-96, y, 192, 8.5);
      g.beginPath(); g.moveTo(-95, y); g.lineTo(95, y);
      stroke(g, 'rgba(67,43,26,0.4)', 1);
      g.beginPath(); g.moveTo(-94, y + 1.2); g.lineTo(94, y + 1.2);
      stroke(g, 'rgba(247,214,170,0.38)', 0.7);
      for (let i = 0; i < 5; i++) {
        const x = -92 + rnd() * 156, len = 12 + rnd() * 36, yy = y + 3 + rnd() * 3;
        g.beginPath(); g.moveTo(x, yy);
        g.bezierCurveTo(x + len * 0.3, yy - 1.2, x + len * 0.65, yy + 1.1, x + len, yy);
        stroke(g, i % 2 ? 'rgba(244,205,153,0.22)' : 'rgba(79,48,27,0.19)', 0.55);
      }
      const joint = row % 2 ? 42 : -38;
      g.beginPath(); g.moveTo(joint, y + 1); g.lineTo(joint, y + 8);
      stroke(g, 'rgba(73,47,28,0.35)', 0.7);
      for (const x of [-89, joint - 4, joint + 4, 89]) {
        ellipse(g, x, y + 4.5, 0.9, 0.7);
        g.fillStyle = 'rgba(64,49,34,0.65)'; g.fill();
      }
    }
    for (const [x, y] of [[-72, 19], [63, -12], [24, 22]]) {
      ellipse(g, x, y, 5, 1.6); stroke(g, 'rgba(77,49,27,0.27)', 0.7);
      ellipse(g, x, y, 2.5, 0.7); stroke(g, 'rgba(77,49,27,0.24)', 0.6);
    }
    g.restore();
    MC.roundRect(g, -96, -26, 192, 58, 5); stroke(g, INK, 1.8);
    g.beginPath(); g.moveTo(-90, 34); g.lineTo(-35, 34); g.moveTo(35, 34); g.lineTo(90, 34);
    stroke(g, 'rgba(231,188,135,0.38)', 0.8);
  }

  function paintTent(g, light, shade, variant) {
    const rnd = MC.rng(820 + variant);
    const accent = ['#a16b50', '#7b886c', '#aa795a'][variant];
    g.lineJoin = g.lineCap = 'round';
    ellipse(g, 1, 5, 77, 13); g.fillStyle = 'rgba(44,32,23,0.24)'; g.fill();
    const rope = (side, back) => {
      const x0 = side * (back ? 49 : 63), y0 = back ? -29 : -18;
      const x1 = side * (back ? 87 : 91), y1 = back ? -1 : 22;
      g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + 1, x1, y1);
      stroke(g, 'rgba(58,47,32,0.62)', 1.6);
      stroke(g, '#dac7a1', 0.75);
      const u = 0.72, tx = x0 + (x1 - x0) * u, ty = y0 + (y1 - y0) * u;
      g.save(); g.translate(tx, ty); g.rotate(-side * 0.5);
      MC.roundRect(g, -1.3, -3, 2.6, 6, 1);
      g.fillStyle = '#9c7650'; g.fill(); stroke(g, 'rgba(53,43,31,0.55)', 0.6); g.restore();
      g.beginPath(); g.moveTo(x1 - side * 2, y1 + 3); g.lineTo(x1 + side * 1.5, y1 - 4);
      stroke(g, '#696960', 2.2);
      ellipse(g, x1 + side, y1 - 3.5, 2, 0.9); g.fillStyle = '#c0bda7'; g.fill();
    };
    for (const side of [-1, 1]) rope(side, true);

    // 낮은 벽체가 밑단을 받치고, 지붕 솔기는 벽의 주름으로 이어진다.
    const wall = () => {
      g.beginPath(); g.moveTo(-65, -22);
      g.quadraticCurveTo(0, -1, 65, -22); g.lineTo(62, 1);
      g.quadraticCurveTo(0, 19, -62, 1); g.closePath();
    };
    wall(); g.fillStyle = gradient(g, -64, -10, 64, 4, [[0, shade], [0.4, light], [1, '#b79a75']]);
    g.fill(); stroke(g, INK, 1.8);
    g.save(); wall(); g.clip();
    for (let x = -58; x <= 58; x += 8) {
      g.beginPath(); g.moveTo(x, -20); g.quadraticCurveTo(x - 1.8, -4, x - 1, 10);
      stroke(g, 'rgba(105,78,48,0.19)', 1.1);
      g.beginPath(); g.moveTo(x + 1.7, -20); g.quadraticCurveTo(x + 0.5, -4, x + 1, 10);
      stroke(g, 'rgba(255,245,220,0.28)', 0.7);
    }
    // 낮은 환기창의 방충망과 덧댄 테두리.
    for (const side of [-1, 1]) {
      const x = side * 44;
      ellipse(g, x, -5, 8.5, 5.4); g.fillStyle = '#756e5c'; g.fill(); stroke(g, '#a18763', 2.2);
      g.save(); g.clip();
      for (let xx = x - 8; xx <= x + 8; xx += 2.5) {
        g.beginPath(); g.moveTo(xx, -11); g.lineTo(xx, 1); stroke(g, 'rgba(223,215,183,0.45)', 0.45);
      }
      for (let y = -9; y < 1; y += 2.5) {
        g.beginPath(); g.moveTo(x - 9, y); g.lineTo(x + 9, y); stroke(g, 'rgba(223,215,183,0.4)', 0.45);
      }
      g.restore();
    }
    g.restore();
    g.beginPath(); g.moveTo(-61, 0); g.quadraticCurveTo(0, 17, 61, 0);
    stroke(g, '#a18a64', 3.2); stroke(g, 'rgba(242,222,181,0.65)', 0.8);

    const roof = () => {
      g.beginPath(); g.moveTo(0, -123);
      g.bezierCurveTo(-20, -96, -36, -58, -66, -22);
      g.quadraticCurveTo(0, 1, 66, -22);
      g.bezierCurveTo(36, -58, 20, -96, 0, -123); g.closePath();
    };
    roof(); g.fillStyle = gradient(g, -66, -65, 66, -25, [[0, shade], [0.3, light], [0.58, light], [1, shade]]); g.fill();
    g.save(); roof(); g.clip();
    const edgeY = x => -22 + 11.5 * (1 - (x / 66) ** 2);
    const seam = (x, offset = 0) => {
      g.beginPath(); g.moveTo(offset * 0.15, -122);
      g.bezierCurveTo(x * 0.3 + offset, -88, x * 0.69 + offset, -39, x + offset, edgeY(x));
    };
    for (const [i, x] of [-54, -35, -13, 13, 35, 54].entries()) {
      seam(x); stroke(g, 'rgba(103,77,48,0.075)', 6);
      seam(x, -2.2); stroke(g, 'rgba(255,250,226,0.26)', 2.5);
      seam(x); stroke(g, 'rgba(108,83,54,0.4)', 0.9);
      seam(x, 1.6); g.setLineDash([1.3, 2.1]); stroke(g, 'rgba(255,244,214,0.7)', 0.6); g.setLineDash([]);
      // 밑단이 당겨지는 곳에서 위로 가늘어지는 주름.
      const y = edgeY(x);
      g.beginPath(); g.moveTo(x - 2, y); g.quadraticCurveTo(x * 0.87 - 1, y - 11, x * 0.75, y - 24 - i % 2 * 7);
      g.quadraticCurveTo(x * 0.9 + 1, y - 9, x + 2, y); g.closePath();
      g.fillStyle = 'rgba(98,74,46,0.09)'; g.fill();
    }
    for (let i = 0; i < 320; i++) {
      const x = -68 + rnd() * 136, y = -124 + rnd() * 116;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 1.5 + rnd() * 3, y + 0.15);
      stroke(g, i % 2 ? 'rgba(105,82,54,0.07)' : 'rgba(255,252,230,0.16)', 0.45);
    }
    g.restore();
    roof(); stroke(g, INK, 1.9);
    g.beginPath(); g.moveTo(-65, -21.5); g.quadraticCurveTo(0, 1, 65, -21.5);
    stroke(g, shade, 3.5); stroke(g, 'rgba(255,244,217,0.7)', 0.85);

    // 따뜻한 실내로 이어지는 아치. 양쪽 천은 묶인 곳에서 밑단으로 퍼진다.
    ellipse(g, 0, 8, 26, 6); g.fillStyle = 'rgba(255,215,135,0.16)'; g.fill();
    g.beginPath(); g.moveTo(-21, 6); g.quadraticCurveTo(-23, -31, 0, -67);
    g.quadraticCurveTo(23, -31, 21, 6); g.quadraticCurveTo(0, 11, -21, 6); g.closePath();
    g.fillStyle = gradient(g, 0, -67, 0, 8, [[0, '#766047'], [0.5, '#b79259'], [1, '#edc882']]);
    g.fill(); stroke(g, '#81694b', 2);
    g.save(); g.clip();
    const glow = g.createRadialGradient(0, -28, 1, 0, -28, 33);
    glow.addColorStop(0, 'rgba(255,239,172,0.8)'); glow.addColorStop(1, 'rgba(255,219,133,0)');
    g.fillStyle = glow; g.fillRect(-28, -68, 56, 77);
    g.beginPath(); g.moveTo(0, -66); g.lineTo(0, -36); stroke(g, '#6a5943', 0.75);
    MC.roundRect(g, -3, -36, 6, 9, 1.5); g.fillStyle = '#ffe9a2'; g.fill(); stroke(g, '#806b45', 0.7);
    for (const y of [-1, 4, 8]) { g.beginPath(); g.moveTo(-22, y); g.lineTo(22, y); stroke(g, 'rgba(115,81,43,0.3)', 0.7); }
    g.restore();
    for (const side of [-1, 1]) {
      g.beginPath(); g.moveTo(0, -68);
      g.quadraticCurveTo(side * 24, -33, side * 24, 6); g.lineTo(side * 15, 7);
      g.quadraticCurveTo(side * 15, -5, side * 16, -19);
      g.quadraticCurveTo(side * 9, -42, 0, -68); g.closePath();
      g.fillStyle = gradient(g, side * 9, 0, side * 25, 0, [[0, shade], [0.45, light], [1, shade]]); g.fill(); stroke(g, '#8e7655', 1.2);
      g.beginPath(); g.moveTo(side * 2, -65); g.quadraticCurveTo(side * 22, -31, side * 22, 5);
      g.setLineDash([1, 1.7]); stroke(g, 'rgba(250,238,205,0.8)', 0.7); g.setLineDash([]);
      g.beginPath(); g.moveTo(side * 16, -18); g.quadraticCurveTo(side * 18, -5, side * 18, 5);
      stroke(g, 'rgba(107,79,47,0.35)', 0.9);
      g.beginPath(); g.moveTo(side * 13, -20); g.lineTo(side * 22, -21); stroke(g, accent, 2.1);
      g.beginPath(); g.moveTo(side * 21, -21); g.quadraticCurveTo(side * 29, -26, side * 27, -20);
      g.quadraticCurveTo(side * 24, -16, side * 21, -21); stroke(g, accent, 0.9);
      g.beginPath(); g.moveTo(side * 22, -20); g.lineTo(side * 26, -14); stroke(g, accent, 0.9);
    }
    MC.roundRect(g, -22, 6, 44, 4, 1.5); g.fillStyle = '#786b50'; g.fill(); stroke(g, 'rgba(59,49,33,0.6)', 0.8);
    for (const side of [-1, 1]) {
      ellipse(g, side * 62, -19, 1.8, 1.3); g.fillStyle = '#b99c68'; g.fill(); stroke(g, '#7a684a', 0.65);
      rope(side, false);
    }
    // 꼭대기의 보강 천과 빗물 덮개.
    g.beginPath(); g.moveTo(0, -126); g.quadraticCurveTo(-5, -120, -8, -112);
    g.quadraticCurveTo(0, -108, 8, -112); g.quadraticCurveTo(5, -120, 0, -126); g.closePath();
    g.fillStyle = light; g.fill(); stroke(g, '#9f8966', 1.1);
    g.beginPath(); g.moveTo(0, -124); g.lineTo(0, -139); stroke(g, '#655039', 1.8);
    g.beginPath(); g.moveTo(0, -139); g.quadraticCurveTo(7, -141, 14, -135);
    g.quadraticCurveTo(7, -132, 0, -132); g.closePath();
    g.fillStyle = accent; g.fill(); stroke(g, 'rgba(73,53,36,0.45)', 0.7);
  }

  MC.GlampingArt = Object.freeze({ paintDeck, paintTent });
})(window.MC = window.MC || {});
