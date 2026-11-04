/* 멍캠프 — 편백 나무의 형태와 캐시 그림. 장면의 이동·자리 상태는 다루지 않는다. */
(function (MC) {
  'use strict';

  function halfWidth(width, height, y) {
    return (width / 2) * (0.7 + 0.3 * MC.clamp(y / height, 0, 1));
  }

  function branchCenter(br, t) {
    const u = 1 - t;
    const x = u * u * br.x0 + 2 * u * t * br.cx + t * t * br.x1;
    const y = u * u * br.y0 + 2 * u * t * br.cy + t * t * br.y1;
    return { x, y, th: MC.lerp(br.th0, br.th1, t) };
  }

  // 그리기와 멍이·다람쥐·새의 위치가 함께 쓰는 가지 윗면.
  function branchPoint(br, t) {
    const p = branchCenter(br, t);
    return { x: p.x, y: p.y - p.th / 2, th: p.th };
  }

  function branchSlope(br, t) {
    const dx = 2 * (1 - t) * (br.cx - br.x0) + 2 * t * (br.x1 - br.cx);
    const dy = 2 * (1 - t) * (br.cy - br.y0) + 2 * t * (br.y1 - br.cy);
    return Math.atan2(-dy, -dx);
  }

  // 편백 잎: 납작한 부채꼴로 갈래갈래 갈라지는 비늘잎. 줄기마다 작은 비늘잎이 엇갈려 붙고,
  // 끝으로 갈수록 가늘고 밝다. 오른쪽을 향해 그려 두고 돌려서 쓴다
  function makeSpray(size, seed, dpr, sunny) {
    const rnd = MC.rng(seed);
    const W = size * 1.3;
    const H = size * 1.1;
    const c = MC.canvas(Math.ceil(W * dpr), Math.ceil(H * dpr));
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    g.translate(3, H * 0.45);
    const cols = sunny ? ['#244a2b', '#356638', '#4f8443', '#86b45a', '#b4d57e'] : ['#203f27', '#2f5a33', '#43733d', '#6d9c4e', '#94bd68'];
    const frond = (x, y, a, len, wd, depth, light) => {
      const n = Math.max(4, Math.round(len / (wd * 0.85)));
      let px = x;
      let py = y;
      for (let i = 0; i < n; i++) {
        const f = i / Math.max(1, n - 1);
        a += 0.016 * (1 + depth * 0.5) + (rnd() - 0.5) * 0.06; // 끝으로 갈수록 살짝 처진다
        px += (Math.cos(a) * len) / n;
        py += (Math.sin(a) * len) / n;
        const ww = wd * (1 - 0.62 * f);
        for (const side of [-1, 1]) {
          const ox = Math.cos(a + side * 1.25) * ww * 0.32;
          const oy = Math.sin(a + side * 1.25) * ww * 0.32;
          const tone = MC.clamp(light + (side < 0 ? 1 : 0) + (f > 0.7 ? 2 : f > 0.4 ? 1 : 0) - (rnd() < 0.25 ? 1 : 0), 0, 4);
          g.fillStyle = cols[tone];
          g.beginPath();
          g.ellipse(px + ox, py + oy, ww * 0.6, ww * 0.3, a + side * 0.55, 0, Math.PI * 2);
          g.fill();
        }
        if (depth > 0 && i > 0 && i < n - 1 && i % 2 === 0) {
          const side = (i / 2) % 2 ? 1 : -1;
          frond(px, py, a + side * (0.5 + rnd() * 0.3), len * (0.6 - f * 0.4), ww * 0.9, depth - 1, Math.min(2, light + (side < 0 ? 1 : 0)));
        }
      }
      g.fillStyle = cols[4];
      g.beginPath();
      g.ellipse(px + Math.cos(a) * wd * 0.2, py + Math.sin(a) * wd * 0.2, wd * 0.3, wd * 0.17, a, 0, Math.PI * 2);
      g.fill();
    };
    // 그늘진 아래 겹 한 번, 그 위에 밝은 겹
    g.globalAlpha = 0.55;
    frond(0, size * 0.04, 0.08, size * 0.9, size * 0.07, 2, 0);
    g.globalAlpha = 1;
    frond(0, 0, -0.06, size, size * 0.075, 2, 1);
    return { c, W, H, ax: 3, ay: H * 0.45 };
  }

  function makeTrunkPath(layout) {
    const { tx, tw, h, s, half, groundY } = layout;
    // 줄기: 아래로 갈수록 넓어지며 뿌리가 땅을 움켜쥔다
    const left = tx - tw / 2;
    const right = tx + tw / 2;
    const yb = groundY - 34 * s;
    const trunk = new Path2D();
    trunk.moveTo(tx - half(-10), -10);
    trunk.lineTo(tx - half(yb), yb);
    trunk.quadraticCurveTo(tx - half(yb) - 4 * s, groundY + 14 * s, left - tw * 0.34, h + 10);
    trunk.lineTo(right + tw * 0.34, h + 10);
    trunk.quadraticCurveTo(tx + half(yb) + 4 * s, groundY + 14 * s, tx + half(yb), yb);
    trunk.lineTo(tx + half(-10), -10);
    trunk.closePath();

    return trunk;
  }

  function makeBranchForm(br, bi, layout) {
    const { tx, tw, s, half, branches } = layout;
    const N = 48, neck = 9;
    const top = [], bot = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const { x, y, th: thickness } = branchCenter(br, t);
      const th = thickness * (1 + 0.025 * Math.sin(t * 11 + bi));
      top.push([x, y - th / 2]);
      bot.push([x, y + th / 2]);
    }
    const above = bi < branches.length - 1 ? br.y0 - branches[bi + 1].y0 : br.th0 * 3;
    const below = bi ? branches[bi - 1].y0 - br.y0 : br.th0 * 4;
    // 윗갈림은 좁고, 가지를 받치는 아랫밑동은 길고 두껍다.
    const up = Math.min(br.th0 * (0.78 + bi % 2 * 0.06), above * 0.35);
    const down = Math.min(br.th0 * (1.85 - bi % 3 * 0.1), below * 0.48);
    const upper = [tx - half(br.y0 - up) + 2 * s, br.y0 - up];
    const lower = [tx - half(br.y0 + down) + 2 * s, br.y0 + down];
    const reach = (br.x0 - br.x1) * 0.055;
    const path = new Path2D();
    path.moveTo(tx + tw * 0.24, upper[1]);
    path.lineTo(...upper);
    const upperControl = [upper[0] - br.th0 * 0.06, upper[1] + up * 0.55];
    const lowerControl = [lower[0] - br.th0 * 0.18, lower[1] - down * 0.38];
    path.bezierCurveTo(...upperControl,
      top[neck][0] + reach, top[neck][1], ...top[neck]);
    for (let i = neck + 1; i <= N; i++) path.lineTo(...top[i]);
    path.quadraticCurveTo(top[N][0] - br.th1 * 0.65, (top[N][1] + bot[N][1]) / 2, ...bot[N]);
    for (let i = N - 1; i >= neck; i--) path.lineTo(...bot[i]);
    path.bezierCurveTo(bot[neck][0] + reach, bot[neck][1],
      ...lowerControl, ...lower);
    path.lineTo(tx + tw * 0.24, lower[1]);
    path.closePath();
    return { path, top, bot, N, neck, up, down, upper, lower, upperControl, lowerControl, reach };
  }

  function paintTrunk(g, layout, trunk, wood, rnd) {
    const { tx, tw, h, s, half, groundY, branches } = layout;
    const left = tx - tw / 2, right = tx + tw / 2;
    const bark = g.createLinearGradient(left, 0, right, 0);
    bark.addColorStop(0, '#c58e60');
    bark.addColorStop(0.3, '#9d6644');
    bark.addColorStop(0.75, '#6c442c');
    bark.addColorStop(1, '#4e3020');
    g.fillStyle = bark;
    g.save();
    g.shadowColor = 'rgba(48,32,20,0.65)';
    g.shadowBlur = 1.7 * s;
    g.fill(wood);
    g.restore();
    g.save();
    g.clip(trunk);
    const grainX = (x, y) => {
      let bend = 0;
      for (const br of branches) {
        const inner = MC.clamp((tx + half(y) * 0.5 - x) / (tw * 0.9), 0, 1);
        const along = (y - br.y0 - br.th0 * 0.25) / (br.th0 * 1.1);
        bend += Math.exp(-along * along * 1.8) * inner * inner * br.th0 * 0.24;
      }
      return x - bend;
    };
    // 세로로 길게 갈라지는 섬유질 껍질
    for (let i = 0; i < 34; i++) {
      const fx = left - tw * 0.2 + rnd() * tw * 1.4;
      const lightLine = rnd() < 0.38;
      g.strokeStyle = lightLine ? 'rgba(240,196,156,0.3)' : 'rgba(52,30,18,0.4)';
      g.lineWidth = (0.8 + rnd() * 1.8) * s;
      g.beginPath();
      let y = -10;
      let x = fx;
      g.moveTo(grainX(x, y), y);
      while (y < h + 10) {
        y += 13 * s;
        x += (rnd() - 0.5) * 1.6 * s;
        g.lineTo(grainX(x, y), y);
      }
      g.stroke();
    }
    // 길게 벗겨진 껍질 몇 가닥
    for (let i = 0; i < 5; i++) {
      const fx = left + tw * (0.15 + rnd() * 0.7);
      const y0 = rnd() * groundY * 0.8;
      const len = (60 + rnd() * 90) * s;
      g.strokeStyle = 'rgba(214,150,108,0.65)';
      g.lineWidth = (2 + rnd() * 2) * s;
      g.beginPath();
      g.moveTo(grainX(fx, y0), y0);
      g.quadraticCurveTo(grainX(fx + 4 * s, y0 + len * 0.5), y0 + len * 0.5,
        grainX(fx + (rnd() < 0.5 ? -7 : 7) * s, y0 + len), y0 + len);
      g.stroke();
    }
    // 오른쪽은 그늘, 왼쪽 가장자리에는 아침 햇빛
    const shade = g.createLinearGradient(left, 0, right, 0);
    shade.addColorStop(0, 'rgba(255,236,190,0.32)');
    shade.addColorStop(0.12, 'rgba(255,236,190,0)');
    shade.addColorStop(0.7, 'rgba(20,12,6,0)');
    shade.addColorStop(1, 'rgba(20,12,6,0.32)');
    g.fillStyle = shade;
    g.fillRect(left - tw, 0, tw * 3, h);
    g.restore();
  }

  function paintBranch(g, br, bi, form, layout) {
    const { tx, tw, dpr, s } = layout;
    const { path, top, bot, N, neck, up, down, upper, lower, upperControl, lowerControl, reach } = form;
    const x = br.x1 - br.th1, y = Math.min(upper[1], br.y1 - br.th0) - 4 * s;
    const W = tx + tw * 0.3 - x, H = Math.max(lower[1], br.y0 + br.th0) - y + 4 * s;
    const layer = MC.canvas(Math.ceil(W * dpr), Math.ceil(H * dpr));
    const lg = layer.getContext('2d');
    lg.scale(dpr, dpr); lg.translate(-x, -y);
    lg.lineCap = lg.lineJoin = 'round';
    lg.save(); lg.clip(path);
    const bg = lg.createLinearGradient(0, br.y0 - br.th0 * 0.72, 0, br.y0 + br.th0 * 0.8);
    bg.addColorStop(0, '#d1a174');
    bg.addColorStop(0.28, '#b78053');
    bg.addColorStop(0.58, '#91603f');
    bg.addColorStop(1, '#513421');
    lg.fillStyle = bg; lg.fillRect(x, y, W, H);

    // 밑동 아래 오목한 곳에만 부드러운 그늘을 넣어 입체감을 준다.
    lg.save();
    lg.translate(br.x0 + br.th0 * 0.08, br.y0 + br.th0 * 0.53);
    lg.scale(br.th0 * 1.2, br.th0 * 0.65);
    const hollow = lg.createRadialGradient(0, 0, 0.05, 0, 0, 1);
    hollow.addColorStop(0, 'rgba(47,29,17,0.26)');
    hollow.addColorStop(1, 'rgba(47,29,17,0)');
    lg.fillStyle = hollow; lg.fillRect(-1, -1, 2, 2); lg.restore();

    // 가지 표면의 결. 줄기 쪽의 감겨 올라가는 섬유는 접합부 전체 위에 따로 잇는다.
    const grain = MC.rng(9400 + bi);
    for (let j = 0; j < 7; j++) {
      const f = 0.1 + j * 0.13;
      const qy = MC.lerp(top[neck][1], bot[neck][1], f);
      const fromAbove = j < 3;
      const startX = br.x0 + br.th0 * (0.24 + j * 0.025);
      const startY = br.y0 + (fromAbove ? -up * (0.94 - j * 0.1) : down * (0.52 + (j - 3) * 0.13));
      lg.strokeStyle = j % 2 ? 'rgba(55,33,20,0.32)' : 'rgba(241,200,155,0.34)';
      lg.lineWidth = (0.65 + grain() * 0.75) * s;
      lg.beginPath(); lg.moveTo(startX, startY);
      lg.bezierCurveTo(startX, br.y0 + br.th0 * (f - 0.5), top[neck][0] + reach, qy, top[neck][0], qy);
      for (let i = neck + 1; i <= N; i++) {
        lg.lineTo(top[i][0], MC.lerp(top[i][1], bot[i][1], f) + Math.sin(i / N * 12 + j * 1.8) * 0.45 * s);
      }
      lg.stroke();
    }
    // 연결부를 가로지르는 선 없이, 밖으로 드러난 위아래 가장자리만 가늘게 짚는다.
    lg.strokeStyle = 'rgba(239,198,145,0.48)'; lg.lineWidth = 1.2 * s;
    lg.beginPath(); lg.moveTo(...upper);
    lg.bezierCurveTo(...upperControl, top[neck][0] + reach, top[neck][1], ...top[neck]);
    for (let i = neck + 1; i <= N; i++) lg.lineTo(...top[i]);
    lg.stroke();
    lg.strokeStyle = 'rgba(57,35,22,0.48)'; lg.lineWidth = 1.3 * s;
    lg.beginPath(); lg.moveTo(...lower);
    lg.bezierCurveTo(...lowerControl, bot[neck][0] + reach, bot[neck][1], ...bot[neck]);
    for (let i = neck + 1; i <= N; i++) lg.lineTo(...bot[i]);
    lg.stroke();
    lg.restore();

    // 줄기 안에서는 타원형으로 사라져, 밑동 위아래에 수평 색 경계가 남지 않는다.
    const fadeX = br.x0 - br.th0 * 0.65;
    for (const isUpper of [true, false]) {
      const y0 = isUpper ? y : br.y0, height = isUpper ? br.y0 - y : y + H - br.y0;
      lg.save();
      lg.beginPath(); lg.rect(fadeX, y0, x + W - fadeX, height); lg.clip();
      lg.translate(fadeX, br.y0);
      const rx = tx + tw * 0.17 - fadeX, ry = (isUpper ? up : down) * 0.98;
      lg.scale(rx, ry);
      const merge = lg.createRadialGradient(0, 0, 0, 0, 0, 1);
      merge.addColorStop(0, '#fff'); merge.addColorStop(0.38, '#fff');
      merge.addColorStop(0.72, 'rgba(255,255,255,0.38)');
      merge.addColorStop(1, 'rgba(255,255,255,0)');
      lg.globalCompositeOperation = 'destination-in';
      lg.fillStyle = merge; lg.fillRect(0, (y0 - br.y0) / ry, (x + W - fadeX) / rx, height / ry);
      lg.restore();
    }
    g.drawImage(layer, x, y, W, H);
  }

  function paintJoint(g, br, bi, form, wood, layout) {
    const { tx, tw, s, half } = layout;
    const { top, bot, neck, up, down, reach } = form;
    // 굵은 줄기 표면까지 이어지는 가지 밑동. 윗갈림의 수피 능선과 아래쪽
    // 받침의 부피를 따로 그려, 한 평면에서 둥글게 녹아 붙은 T자 모양을 피한다.
    g.save(); g.clip(wood);
    const edge = tx - half(br.y0), rootX = edge + tw * 0.31;
    g.save();
    g.translate(rootX, br.y0 + br.th0 * 0.32);
    g.scale(tw * 0.48, br.th0 * 1.35);
    const rootShade = g.createRadialGradient(0.08, 0.12, 0, 0, 0, 1);
    rootShade.addColorStop(0, 'rgba(48,29,17,0.17)');
    rootShade.addColorStop(0.6, 'rgba(59,34,19,0.09)');
    rootShade.addColorStop(1, 'rgba(59,34,19,0)');
    g.fillStyle = rootShade; g.fillRect(-1, -1, 2, 2); g.restore();

    // 접합부의 잔섬유와 벗겨진 수피도 줄기의 세로 방향에서 가지 쪽으로 흐른다.
    const barkRnd = MC.rng(12600 + bi);
    for (let j = 0; j < 100; j++) {
      const px = edge - br.th0 * 0.85 + barkRnd() * (tw * 0.68 + br.th0 * 0.85);
      const py = br.y0 - up * 0.9 + barkRnd() * (up * 0.9 + down * 1.2);
      const vertical = MC.clamp((px - edge + br.th0 * 0.35) / (tw * 0.65), 0, 1);
      const below = MC.clamp((py - br.y0) / (down + 1), 0, 1);
      const angle = MC.lerp(0.16 + below * 0.32, Math.PI / 2, vertical) + (barkRnd() - 0.5) * 0.24;
      const len = (3 + barkRnd() * 11) * s, width = (0.25 + barkRnd() * 0.7) * s;
      const a = (0.07 + barkRnd() * 0.15) * (1 - MC.clamp((px - rootX) / (tw * 0.35), 0, 0.85));
      g.save(); g.translate(px, py); g.rotate(angle);
      g.fillStyle = j % 3 ? `rgba(55,32,19,${a})` : `rgba(237,188,132,${a + 0.05})`;
      g.beginPath(); g.moveTo(-len * 0.5, 0);
      g.bezierCurveTo(-len * 0.2, -width, len * 0.18, -width * 0.5, len * 0.5, 0);
      g.bezierCurveTo(len * 0.15, width * 0.18, -len * 0.15, width * 0.45, -len * 0.5, 0);
      g.fill(); g.restore();
    }

    // 열린 갈라짐: 위에서 줄기 안쪽으로 비스듬히 파이고 아래에서 흐려진다.
    const ridge = g.createLinearGradient(edge, br.y0 - up, rootX + tw * 0.12, br.y0 + down);
    ridge.addColorStop(0, 'rgba(61,34,18,0)');
    ridge.addColorStop(0.22, 'rgba(67,38,22,0.28)');
    ridge.addColorStop(0.65, 'rgba(66,39,23,0.12)');
    ridge.addColorStop(1, 'rgba(66,39,23,0)');
    g.strokeStyle = ridge; g.lineWidth = 1.05 * s;
    g.beginPath();
    g.moveTo(top[neck][0] + reach * 0.45, top[neck][1] + 0.8 * s);
    g.bezierCurveTo(edge + tw * 0.12, br.y0 - br.th0 * 0.4,
      rootX + tw * 0.04, br.y0 - br.th0 * 0.6, rootX + tw * 0.08, br.y0 - br.th0 * 0.13);
    g.stroke();

    // 줄기 아래에서 가지로 감겨 올라가는 긴 섬유. 끝은 투명하게 풀어 준다.
    for (let j = 0; j < 3; j++) {
      const f = 0.53 + j * 0.15;
      const endX = top[neck + 4][0], endY = MC.lerp(top[neck + 4][1], bot[neck + 4][1], f);
      const startX = edge + tw * (0.19 + j * 0.1);
      const startY = br.y0 + down + (10 + j * 5) * s;
      const fiber = g.createLinearGradient(startX, startY, endX, endY);
      fiber.addColorStop(0, 'rgba(224,172,119,0)');
      fiber.addColorStop(0.28, j % 2 ? 'rgba(57,32,17,0.16)' : 'rgba(234,184,128,0.18)');
      fiber.addColorStop(0.72, j % 2 ? 'rgba(57,32,17,0.14)' : 'rgba(234,184,128,0.16)');
      fiber.addColorStop(1, 'rgba(224,172,119,0)');
      g.strokeStyle = fiber; g.lineWidth = (j % 2 ? 0.8 : 1) * s;
      g.beginPath(); g.moveTo(startX, startY);
      g.bezierCurveTo(startX + 2 * s, br.y0 + br.th0 * 0.35,
        endX + reach * 1.2, endY + (j - 1) * s, endX, endY);
      g.stroke();
    }
    // 위쪽은 짧은 갈라짐과 옅은 빛을 넣어, 긴 아래쪽 섬유와 다르게 표현한다.
    for (let j = 0; j < 2; j++) {
      g.strokeStyle = j % 2 ? 'rgba(65,36,19,0.2)' : 'rgba(237,188,134,0.24)';
      g.lineWidth = (0.7 + j * 0.15) * s;
      g.beginPath();
      g.moveTo(edge + tw * (0.07 + j * 0.065), br.y0 - up - (5 + j * 3) * s);
      g.bezierCurveTo(edge + tw * (0.09 + j * 0.07), br.y0 - br.th0 * 0.36,
        top[neck][0] + reach, top[neck][1] + j * 1.1 * s, top[neck][0], top[neck][1] + j * 1.1 * s);
      g.stroke();
    }
    g.restore();
  }

  function paintBranchDetails(g, br, s, rnd) {
    // 윗면의 폭신한 이끼
    for (let i = 0; i < 26; i++) {
      const t = 0.04 + rnd() * 0.9;
      const p = branchPoint(br, t);
      g.fillStyle = rnd() < 0.5 ? '#86b45c' : '#6a9a48';
      g.beginPath();
      g.ellipse(p.x + (rnd() - 0.5) * 8 * s, p.y + (1 + rnd() * 2) * s, (3 + rnd() * 6) * s, (1.6 + rnd() * 2) * s, 0, 0, Math.PI * 2);
      g.fill();
    }
    // 옹이
    const kp = branchPoint(br, 0.18 + rnd() * 0.1);
    g.fillStyle = 'rgba(60,36,22,0.55)';
    g.beginPath();
    g.ellipse(kp.x, kp.y + br.th0 * 0.45, 3.5 * s, 2.4 * s, 0, 0, Math.PI * 2);
    g.fill();
    // 작은 회청색 지의류와 이끼의 짧은 줄기.
    for (let j = 0; j < 9; j++) {
      const p = branchPoint(br, 0.08 + rnd() * 0.83);
      g.strokeStyle = j % 3 ? '#b0c681' : '#b6c6aa';
      g.lineWidth = 0.7 * s;
      g.beginPath();
      g.moveTo(p.x, p.y + 2 * s); g.lineTo(p.x + s, p.y - 2 * s);
      g.moveTo(p.x, p.y); g.lineTo(p.x - 2 * s, p.y - s); g.stroke();
    }
  }

  function paintNest(g, np, s) {
    g.save();
    g.translate(np.x, np.y + 2 * s);
    g.fillStyle = '#7a5434';
    g.beginPath();
    g.ellipse(0, -3 * s, 15 * s, 7 * s, 0, 0, Math.PI);
    g.fill();
    g.strokeStyle = 'rgba(200,160,110,0.8)';
    g.lineWidth = 1.2 * s;
    for (let i = 0; i < 9; i++) {
      const a = -0.2 + (i / 8) * (Math.PI + 0.4);
      g.beginPath();
      g.moveTo(Math.cos(a) * 14 * s, -3 * s + Math.sin(a) * 6 * s);
      g.quadraticCurveTo(Math.cos(a + 0.6) * 8 * s, -6 * s, Math.cos(a + 1.1) * 13 * s, -3 * s + Math.sin(a + 1.1) * 5 * s);
      g.stroke();
    }
    g.fillStyle = '#4a311f';
    g.beginPath();
    g.ellipse(0, -4.5 * s, 11 * s, 3 * s, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#cfe3f0';
    for (const ex of [-3.5, 3]) {
      g.beginPath();
      g.ellipse(ex * s, -5.5 * s, 2.8 * s, 2.2 * s, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  function render({ w, h, dpr, s, tree, groundY }) {
    const { x: tx, w: tw, branches } = tree;
    const half = y => halfWidth(tw, h, y);
    const layout = { w, h, dpr, s, tx, tw, half, groundY, branches };
    const rnd = MC.rng(2468);
    const treeImg = MC.canvas(w * dpr, h * dpr);
    const g = treeImg.getContext('2d');
    g.scale(dpr, dpr);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    const sprays = [makeSpray(112 * s, 11, dpr, true), makeSpray(90 * s, 23, dpr, false), makeSpray(78 * s, 37, dpr, true), makeSpray(103 * s, 51, dpr, false)];
    const spray = (x, y, a, i, sc = 1) => {
      const sp = sprays[i % sprays.length];
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.scale(sc, sc);
      g.drawImage(sp.c, -sp.ax, -sp.ay, sp.W, sp.H);
      g.restore();
    };

    // 가지 뒤로 드리운 잎 (가지보다 먼저): 위로 비스듬히, 옆으로 납작하게 겹겹이
    branches.forEach((br, bi) => {
      const n = 8;
      for (let i = 0; i < n; i++) {
        const t = 0.1 + (i / (n - 1)) * 0.82 + (rnd() - 0.5) * 0.06;
        const p = branchPoint(br, t);
        // 잎은 옆과 아래로 퍼지고, 멍이가 누울 윗면은 비워 둔다.
        spray(p.x, p.y + 5 * s, Math.PI - (i % 2 ? 0.95 : 0.3) + (rnd() - 0.5) * 0.22, i + bi, (0.7 + rnd() * 0.35) * (bi > 1 ? 0.85 : 1));
        if (i < 3) spray(p.x, p.y + 6 * s, 0.7 + rnd() * 0.5, bi + i + 1, 0.8);
      }
    });

    const trunk = makeTrunkPath(layout);
    const forms = branches.map((br, bi) => makeBranchForm(br, bi, layout));
    const wood = new Path2D(trunk);
    for (const form of forms) wood.addPath(form.path);
    paintTrunk(g, layout, trunk, wood, rnd);
    branches.forEach((br, bi) => {
      paintBranch(g, br, bi, forms[bi], layout);
      paintJoint(g, br, bi, forms[bi], wood, layout);
      paintBranchDetails(g, br, s, rnd);
    });

    // 가지 아래로 늘어진 잎
    branches.forEach((br, bi) => {
      for (let i = 0; i < 5; i++) {
        const t = 0.08 + i * 0.19 + rnd() * 0.06;
        const p = branchPoint(br, t);
        spray(p.x, p.y + MC.lerp(br.th0, br.th1, t) * 0.8, Math.PI - 1.05 + (rnd() - 0.5) * 0.35, i + bi + 1, 0.72 + rnd() * 0.2);
        // 편백 열매: 작은 둥근 구과와 갈라진 비늘.
        if ((i + bi) % 3 === 0) {
          const cx = p.x - 13 * s, cy = p.y + 26 * s, r = 3.8 * s;
          g.strokeStyle = '#66523a'; g.lineWidth = 0.7 * s;
          g.beginPath(); g.moveTo(p.x, p.y + 8 * s); g.lineTo(cx, cy); g.stroke();
          g.fillStyle = '#a49162'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.moveTo(cx - r * 0.8, cy); g.lineTo(cx + r * 0.8, cy);
          g.moveTo(cx, cy - r * 0.85); g.lineTo(cx - r * 0.2, cy); g.lineTo(cx + r * 0.3, cy + r * 0.85); g.stroke();
          g.fillStyle = '#dac994'; g.fillRect(cx - s, cy - 2 * s, s, s);
        }
      }
    });
    // 밑동: 뿌리 사이에 낀 이끼 (밑으로 갈수록 짙게)
    for (let i = 0; i < 26; i++) {
      const u = rnd();
      const y = groundY + 6 * s + Math.pow(rnd(), 0.6) * (h - groundY);
      const spread = tw * (0.5 + 0.35 * (y - groundY) / (h - groundY + 1));
      const x = tx + (u - 0.5) * spread * 2;
      g.fillStyle = rnd() < 0.5 ? 'rgba(111,157,76,0.85)' : 'rgba(85,127,58,0.85)';
      g.beginPath();
      g.ellipse(x, y, (5 + rnd() * 7) * s, (1.8 + rnd() * 2) * s, 0, Math.PI, 0);
      g.fill();
    }

    const np = branchPoint(branches[branches.length - 1], 0.1);
    const nest = { x: np.x, y: np.y };
    paintNest(g, np, s);

    // 가지 끝에서 살랑이는 잎은 따로 그린다
    const tips = [];
    branches.forEach((br, bi) => {
      const p = branchPoint(br, 1);
      const n = sprays.length;
      tips.push({ x: p.x + 3 * s, y: p.y + br.th1 * 0.5, a: Math.PI + 0.25, spr: sprays[bi % n], ph: rnd() * 6 });
      tips.push({ x: p.x + 8 * s, y: p.y + br.th1 * 0.8, a: Math.PI - 0.55, spr: sprays[(bi + 1) % n], ph: rnd() * 6 });
    });
    return { treeImg, sprays, nest, tips };
  }

  MC.ForestTree = { halfWidth, branchPoint, branchSlope, makeSpray, render };
})(window.MC = window.MC || {});
