/* 멍캠프 — 캠프 마을: 멍이를 데리고 걸어 다니는 지도
   해 질 녘의 캠프 마을. 마을을 한 바퀴 도는 둘레길과 모닥불에서 뻗은 지름길을 따라 연등이 켜져 있고,
   모닥불·바다·숲·글램핑장·숙소에 가까이 가면 들어갈 수 있다.
   정자에는 목탁이 있다. 똑 치면 번뇌가 하나 줄어든다. */
(function (MC) {
  'use strict';

  const W = MC.CampSea.width;
  const H = 2100;
  const INK = 'rgba(30,40,34,0.85)';

  // 오른쪽 끝은 언제나 바다. 물가 선은 조금씩 굽이친다
  const shoreX = MC.CampSea.shoreX;
  const DOCK_Y = 1041;

  const FIRE = { x: 1120, y: 1060 };
  const TOWER = { x: 1640, y: 1320 };
  const PAVILION = { x: 1480, y: 520 };
  const PAVILION_SCALE = 1.55;
  const PAVILION_HEIGHT = 1.35;
  const pavilionPoint = (x, y) => ({ x: PAVILION.x + x * PAVILION_SCALE, y: PAVILION.y - 17 + y * PAVILION_HEIGHT });
  const PAVILION_SEATS = [-48, 0, 48].map((x, i) => ({ ...pavilionPoint(x, -46), id: i + 1 }));
  const PAVILION_ENTRY = { x: PAVILION.x, y: PAVILION.y + 66 };
  const STUMP = { x: 600, y: 600 };
  // 글램핑장: 모닥불에서 남쪽으로 내려간 끝. 나무 데크 위 벨텐트 셋, 줄전구, 가운데 작은 화로
  const GLAMP = { x: 1290, y: 1690 }; // 가운데 큰 텐트 (들어가는 곳)
  const TENTS = [
    { x: 1030, y: 1735, s: 0.8 },
    { x: GLAMP.x, y: GLAMP.y, s: 1 },
    { x: 1550, y: 1742, s: 0.8 },
  ];
  const BRAZIER = { x: 1290, y: 1838 };
  const POSTS = [[900, 1700], [970, 1905], [1610, 1910], [1690, 1712]];
  // 숙소: 마을 남서쪽(7시 방향) 구석에 쏙 들어앉은 작은 나무집. 창에 불이 켜져 있고 굴뚝에서 연기가 오른다.
  // 이 둘레만 조금 더 춥다: 눈이 소복이 쌓이고 하늘하늘 내리며, 입김이 하얗게 난다. 곁에는 눈 얹힌 작은 전나무
  const LODGE = { x: 350, y: 1890 };
  const LODGE_FIR = { x: 190, y: 1880 };
  const LODGE_GARDEN = {
    bench: { x: LODGE.x - 108, y: LODGE.y + 104 },
    wood: { x: LODGE.x - 143, y: LODGE.y - 5 },
    shrubs: [{ x: LODGE.x - 161, y: LODGE.y + 50 }, { x: LODGE.x + 116, y: LODGE.y + 113 }],
    lamps: [{ x: LODGE.x - 153, y: LODGE.y + 80 }, { x: LODGE.x + 78, y: LODGE.y + 110 }],
  };
  const LODGE_EAVES = Array.from({ length: 9 }, (_, i) => {
    const x = -108 + i * 27;
    return { x, y: -122 + 7 * (1 - (x / 116) ** 2) };
  });
  // 길 입구의 서늘한 풀빛 → 성긴 눈 → 숙소 앞의 눈. 모든 효과가 같은 연속값을 쓴다.
  const COLD = { x: LODGE.x + 30, y: LODGE.y - 20, rx: 660, ry: 610 };
  const coldAt = (x, y) => {
    const d = Math.hypot((x - COLD.x) / COLD.rx, (y - COLD.y) / COLD.ry);
    const u = MC.clamp((1 - d) / 0.88, 0, 1);
    return u * u * (3 - 2 * u);
  };

  const SPOTS = [
    { id: 'fire', label: '모닥불', tone: 'ember', x: FIRE.x - 30, y: FIRE.y + 40, r: 150, act: '들어가기', ax: FIRE.x, ay: FIRE.y - 112 },
    { id: 'firetower', label: '탑불멍', tone: 'ember', x: TOWER.x, y: TOWER.y + 50, r: 135, act: '들어가기', ax: TOWER.x, ay: TOWER.y - 150 },
    { id: 'water', label: '달빛 바다', tone: 'sea', x: shoreX(DOCK_Y) + 160, y: DOCK_Y, r: 120, act: '들어가기', ax: shoreX(DOCK_Y) + 170, ay: DOCK_Y - 70 },
    { id: 'forest', label: '편백 숲', tone: 'moss', x: STUMP.x + 20, y: STUMP.y + 30, r: 140, act: '들어가기', ax: STUMP.x, ay: STUMP.y - 110 },
    { id: 'tent', label: '글램핑', tone: 'glamp', x: GLAMP.x, y: GLAMP.y + 46, r: 135, act: '들어가기', ax: GLAMP.x, ay: GLAMP.y - 152 },
    { id: 'lodge', label: '숙소', tone: 'lodge', x: LODGE.x, y: LODGE.y + 64, r: 125, act: '들어가기', ax: LODGE.x, ay: LODGE.y - 220 },
    { id: 'moktak', label: '정자', tone: 'paper', x: PAVILION.x, y: PAVILION.y + 40, r: 175, act: '똑', ax: PAVILION.x + 175, ay: PAVILION.y + 65 },
  ];

  // 오솔길: 몇 개의 점을 부드럽게 잇는다.
  // 둘레길은 마을을 한 바퀴 돈다: 숲 → 정자 → 바닷가 모래길 → 글램핑장 앞 → 다시 숲.
  // 가운데 모닥불에서 네 곳으로 지름길이 나 있다
  const RING = [
    [660, 652], [900, 560], [1180, 535], [1405, 566], [1700, 556], [1910, 700], [1995, 900],
    [2018, 1180], [1950, 1450], [1760, 1640], [1640, 1860], [1290, 1950], [960, 1890], [780, 1700],
    [720, 1440], [640, 1290], [430, 1150], [350, 900], [430, 712],
  ];
  const PATH_KEYS = [
    [[FIRE.x + 30, FIRE.y - 40], [1230, 860], [1380, 690], [PAVILION.x, PAVILION.y + 46]],
    [[FIRE.x + 60, FIRE.y + 34], [1420, 1090], [1760, 1046], [shoreX(DOCK_Y) - 30, DOCK_Y]],
    [[FIRE.x - 60, FIRE.y + 20], [900, 900], [720, 760], [STUMP.x + 20, STUMP.y + 44]],
    // 모닥불에서 더 밑으로: 텐트 사이로 내려가 글램핑장 마당에 닿는다
    [[FIRE.x, FIRE.y + 70], [1150, 1300], [1160, 1560], [1185, 1790], [GLAMP.x, GLAMP.y + 70]],
    // 장작탑 앞을 지나 해안 둘레길에 다시 합류하는 작은 산책 고리.
    [[1420, 1090], [1515, 1190], [1535, 1300], [1600, 1405], [1750, 1452], [1950, 1450]],
    // 남서쪽 둘레길에서 부드럽게 갈라져, 가장 안쪽 숙소의 툇마루 앞에 닿는다
    [[780, 1700], [680, 1774], [580, 1862], [470, 1940], [395, 1940], [LODGE.x, LODGE.y + 16]],
  ];

  function catmull(keys, step = 12, loop = false) {
    const out = [];
    const n0 = keys.length;
    const p = loop ? [keys[n0 - 1], ...keys, keys[0], keys[1]] : [keys[0], ...keys, keys[n0 - 1]];
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
    out.push(loop ? keys[0] : keys[n0 - 1]);
    return out;
  }
  const PATHS = [catmull(RING, 12, true), ...PATH_KEYS.map((k) => catmull(k))];
  const PATH_WIDTHS = [51, 46, 57, 41, 46, 39, 36];
  const CLEARINGS = [
    { x: FIRE.x, y: FIRE.y + 33, rx: 158, ry: 105, seed: 2 },
    { x: TOWER.x, y: TOWER.y + 40, rx: 123, ry: 94, seed: 7 },
    { x: STUMP.x + 16, y: STUMP.y + 35, rx: 93, ry: 66, seed: 12 },
    { x: PAVILION.x, y: PAVILION.y + 20, rx: 198, ry: 87, seed: 16 },
  ];
  const beachWidth = y => 133 + 20 * Math.sin(y * .004 + .6) + 28 * Math.exp(-(((y - DOCK_Y) / 340) ** 2));

  function pathRadius(x, y, pi) {
    return PATH_WIDTHS[pi] * .5 * (1 + .075 * Math.sin(x * .012 + y * .004) + .045 * Math.sin(y * .017 - x * .005));
  }

  // 폭의 작은 변화는 모든 겹에서 함께 쓴다. 교차점도 한 장의 흙으로 그린다.
  function pathRibbon(g, path, pi, spread) {
    const left = [], right = [], loop = pi === 0;
    for (let i = 0; i < path.length; i++) {
      const [x, y] = path[i];
      const a = path[i ? i - 1 : loop ? path.length - 2 : 0];
      const b = path[i < path.length - 1 ? i + 1 : loop ? 1 : i];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      const r = Math.max(2, pathRadius(x, y, pi) + spread);
      left.push([x - dy / len * r, y + dx / len * r]);
      right.push([x + dy / len * r, y - dx / len * r]);
    }
    g.beginPath(); g.moveTo(...left[0]);
    for (let i = 1; i < left.length; i++) g.lineTo(...left[i]);
    if (!loop) {
      const end = path.at(-1), before = path.at(-2), dx = end[0] - before[0], dy = end[1] - before[1], len = Math.hypot(dx, dy) || 1;
      const r = pathRadius(...end, pi) + spread;
      g.quadraticCurveTo(end[0] + dx / len * r * 1.5, end[1] + dy / len * r * 1.5, ...right.at(-1));
    } else g.lineTo(...right.at(-1));
    for (let i = right.length - 2; i >= 0; i--) g.lineTo(...right[i]);
    if (!loop) {
      const start = path[0], after = path[1], dx = start[0] - after[0], dy = start[1] - after[1], len = Math.hypot(dx, dy) || 1;
      const r = pathRadius(...start, pi) + spread;
      g.quadraticCurveTo(start[0] + dx / len * r * 1.5, start[1] + dy / len * r * 1.5, ...left[0]);
    }
    g.closePath(); g.fill();
  }

  function clearing(g, q) {
    g.save(); g.translate(q.x, q.y); g.scale(1, q.ry / q.rx);
    const earth = g.createRadialGradient(0, 0, q.rx * .12, 0, 0, q.rx * 1.08);
    earth.addColorStop(0, '#cbb18a');
    earth.addColorStop(.54, 'rgba(203,177,138,.98)');
    earth.addColorStop(.76, 'rgba(203,177,138,.66)');
    earth.addColorStop(.93, 'rgba(203,177,138,.14)');
    earth.addColorStop(1, 'rgba(203,177,138,0)');
    g.fillStyle = earth;
    const pts = [];
    for (let i = 0; i < 32; i++) {
      const a = i / 32 * Math.PI * 2;
      const r = 1 + .055 * Math.sin(a * 3 + q.seed) + .035 * Math.sin(a * 5 - q.seed);
      pts.push([Math.cos(a) * q.rx * r * 1.1, Math.sin(a) * q.rx * r * 1.1]);
    }
    g.beginPath(); g.moveTo(...pts[0]);
    for (const p of pts.slice(1)) g.lineTo(...p);
    g.closePath(); g.fill(); g.restore();
  }
  // 양옆 샛길을 닫는 하나의 낮은 나무 울타리. 두 끝 사이의 입구만 열려 있다.
  const LODGE_BORDER = catmull([
    [735, 1658], [635, 1720], [535, 1790], [470, 1800],
    [425, 1740], [310, 1715], [185, 1745], [138, 1860],
    [145, 2018], [285, 2040], [450, 2028], [575, 1975],
    [690, 1880], [775, 1790], [795, 1760],
  ], 12);

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
      this.pavilionSeat = 0;
      this.pavilionPending = 0;
      this.pavilionMove = null;
      this.chime = 0;
      this.sparks = [];
      this.pup = new MC.Pup({ outfit: 'beanie', light: { ambient: null, glow: [255, 170, 90], glowA: 0, from: 70 } });
      this.pup.onEvent = (kind) => { if (this.onCute) this.onCute(kind); };
      // 함께 걷는 다른 사람들의 멍이
      this.visitors = new Map();
      this.onBoop = null;
      this.pup.x = FIRE.x - 70;
      this.pup.y = FIRE.y + 70;
      this.sign = MC.cleanSign(MC.store.get('sign', ''));
      this.sea = new MC.CampSea(this);
      this.route = [];
      this.cam = { x: this.pup.x, y: this.pup.y - 40 };
      this.rnd = MC.rng(1717);
      this.layout();
      // 숙소 둘레에 내리는 눈과 멍이들의 입김
      this.snow = [];
      for (let i = 0; i < 46; i++) this.snow.push(this.newFlake(true));
      this.breaths = [];
      this.flies = [];
      // 반딧불이: 숲, 정자 언저리, 서쪽 풀밭, 글램핑장 뒤 풀밭
      for (let i = 0; i < 52; i++) {
        const r = this.rnd();
        const zone = r < 0.35 ? [140, 120, 960, 760] : r < 0.5 ? [1250, 260, 1800, 680] : r < 0.75 ? [250, 1300, 800, 1760] : [820, 1450, 1800, 1700];
        this.flies.push({ x: zone[0] + this.rnd() * (zone[2] - zone[0]), y: zone[1] + this.rnd() * (zone[3] - zone[1]), ph: this.rnd() * 9, sp: 0.6 + this.rnd() });
      }
    }

    audioParams() {
      return null;
    }

    newFlake(any) {
      const a = this.rnd() * Math.PI * 2;
      const r = Math.sqrt(this.rnd());
      return {
        x: COLD.x + Math.cos(a) * COLD.rx * r * 0.95,
        y0: COLD.y + Math.sin(a) * COLD.ry * r * 0.95,
        h: any ? this.rnd() * 220 : 220,
        fall: 16 + this.rnd() * 14,
        ph: this.rnd() * 6,
        r: 1.4 + this.rnd() * 1.6,
      };
    }

    // ── 배치 ─────────────────────────────────────────────
    nearPath(x, y, d) {
      for (const path of PATHS) {
        for (const [px, py] of path) if ((px - x) ** 2 + (py - y) ** 2 < d * d) return true;
      }
      return false;
    }

    inClearing(x, y, margin = 0) {
      return CLEARINGS.some(q => ((x - q.x) / (q.rx + margin)) ** 2 + ((y - q.y) / (q.ry + margin)) ** 2 < 1);
    }

    clearOf(x, y, d) {
      if (this.nearPath(x, y, d) || this.inClearing(x, y, 25)) return false;
      if (x > shoreX(y) - 190) return false;
      for (const [ox, oy, r] of [[FIRE.x, FIRE.y, 190], [TOWER.x, TOWER.y, 170], [PAVILION.x, PAVILION.y - 80, 245], [STUMP.x, STUMP.y, 110], [BRAZIER.x, BRAZIER.y, 120]]) {
        if ((x - ox) ** 2 + (y - oy) ** 2 < r * r) return false;
      }
      // 글램핑장 마당과 텐트
      if (((x - 1290) / 470) ** 2 + ((y - 1790) / 220) ** 2 < 1) return false;
      if (LODGE_BORDER.some(([bx, by]) => Math.hypot(x - bx, y - by) < 42)) return false;
      // 숙소와 전나무 둘레, 숙소 앞마당 (앞에 선 나무가 집을 가리지 않게)
      if (((x - LODGE.x) / 200) ** 2 + ((y - (LODGE.y - 6)) / 125) ** 2 < 1) return false;
      if (Math.abs(x - LODGE.x) < 190 && y > LODGE.y - 20 && y < LODGE.y + 230) return false;
      if (Math.hypot(x - LODGE_FIR.x, y - LODGE_FIR.y) < 80) return false;
      return true;
    }

    layout() {
      const rnd = this.rnd;
      this.trees = [];
      const add = (kind, x, y, gap) => {
        if (!this.clearOf(x, y, kind === 'cypress' ? 46 : 54)) return false;
        if (this.trees.some((t) => (t.x - x) ** 2 + (t.y - y) ** 2 < gap * gap)) return false;
        this.trees.push({ kind, v: (rnd() * 3) | 0, x, y, sway: rnd() * 6 });
        return true;
      };
      // 숲 가장자리는 둥글게 풀어진다. 네모난 나무 벽 대신 성긴 외곽과 짙은 안쪽.
      for (let i = 0; i < 480; i++) {
        const x = 65 + rnd() * 1030, y = 65 + rnd() * 800;
        const d = Math.hypot((x - 400) / 650, (y - 220) / 660);
        const edge = MC.clamp((1.16 - d) / .38, 0, 1);
        if (rnd() > edge) continue;
        add('cypress', x, y, 46);
      }
      // 둥근 나무와 덤불: 마을 가장자리를 따라
      for (let i = 0; i < 900; i++) {
        const edge = rnd();
        let x;
        let y;
        if (edge < 0.3) {
          x = 60 + rnd() * 1950;
          y = 1990 + rnd() * 80;
        } else if (edge < 0.55) {
          x = 60 + rnd() * 240;
          y = 800 + rnd() * 1250;
        } else if (edge < 0.8) {
          x = 1000 + rnd() * 1000;
          y = 70 + rnd() * 300;
        } else {
          // 나무는 작은 군락으로 모이고 가운데 풀밭은 트여 있다.
          const groves = [[1730, 760, 150, 145], [920, 1440, 150, 155], [1790, 1580, 105, 125], [870, 390, 150, 120]];
          const q = groves[(rnd() * groves.length) | 0];
          const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd());
          x = q[0] + Math.cos(a) * q[2] * r;
          y = q[1] + Math.sin(a) * q[3] * r;
          if (rnd() < .5) continue;
        }
        add(rnd() < 0.35 ? 'bush' : 'round', x, y, 58);
      }
      // 길가의 연등
      this.lanterns = [];
      PATHS.forEach((path, pi) => {
        let acc = 0;
        for (let i = 1; i < path.length; i++) {
          acc += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
          if (acc < (pi === PATHS.length - 1 ? 166 : 190)) continue;
          acc = 0;
          const [x0, y0] = path[i - 1];
          const [x1, y1] = path[i];
          const len = Math.hypot(x1 - x0, y1 - y0) || 1;
          const side = (this.lanterns.length + pi) % 2 ? 1 : -1;
          const x = x1 + (-(y1 - y0) / len) * 42 * side;
          const y = y1 + ((x1 - x0) / len) * 42 * side;
          // 갈림길 가운데나 넓은 마당에는 기둥을 세우지 않는다.
          if (this.nearPath(x, y, 33) || this.inClearing(x, y, 12)) continue;
          if ((x - FIRE.x) ** 2 + (y - FIRE.y) ** 2 < 120 * 120) continue;
          if (Math.hypot(x - TOWER.x, y - TOWER.y) < 125) continue;
          if (x > shoreX(y) - 30) continue;
          if (((x - 1290) / 420) ** 2 + ((y - 1790) / 190) ** 2 < 1) continue;
          if (LODGE_BORDER.some(([bx, by]) => Math.hypot(x - bx, y - by) < 28)) continue;
          if (((x - LODGE.x) / 150) ** 2 + ((y - LODGE.y) / 70) ** 2 < 1) continue;
          if (this.lanterns.some((l) => (l.x - x) ** 2 + (l.y - y) ** 2 < 60 * 60)) continue;
          if (SPOTS.some((q) => Math.hypot(q.x - x, q.y - y) < 70)) continue;
          const lodge = pi === PATHS.length - 1;
          this.lanterns.push({ x, y, lodge, c: lodge ? [255, 207, 138] : LANTERN_COLORS[this.lanterns.length % LANTERN_COLORS.length], ph: rnd() * 6 });
        }
      });
      // 줄전구: 기둥 넷을 ㄷ자로 잇고, 처진 줄에 작은 전구가 줄줄이
      this.wires = [];
      this.bulbs = [];
      for (let i = 0; i < POSTS.length - 1; i++) {
        const [ax, ay] = POSTS[i];
        const [bx, by] = POSTS[i + 1];
        const pts = [];
        const len = Math.hypot(bx - ax, by - ay);
        const sag = Math.min(34, len * 0.06);
        const n = Math.max(6, Math.round(len / 16));
        for (let k = 0; k <= n; k++) {
          const u = k / n;
          pts.push([MC.lerp(ax, bx, u), MC.lerp(ay, by, u) - 80 + sag * 4 * u * (1 - u)]);
        }
        this.wires.push(pts);
        const nb = Math.max(3, Math.round(len / 38));
        for (let k = 1; k < nb; k++) {
          const u = k / nb;
          this.bulbs.push({ x: MC.lerp(ax, bx, u), y: MC.lerp(ay, by, u) - 80 + sag * 4 * u * (1 - u) + 5, c: k % 3 ? [255, 214, 140] : [255, 186, 120], ph: rnd() * 6 });
        }
      }
      // 부딪히는 것들: 나무와 덤불은 줄기 밑동, 연등은 기둥, 큰 물건은 바닥 자리. 위아래로 납작한 타원
      this.blockers = [
        { x: FIRE.x, y: FIRE.y, r: 52, sy: 1.6 },
        { x: TOWER.x, y: TOWER.y, r: 54, sy: 1.6 },
        { ...pavilionPoint(0, -26), r: 84 * PAVILION_SCALE, sy: 1.6 },
        { x: STUMP.x, y: STUMP.y - 6, r: 30, sy: 1.6 },
        { x: BRAZIER.x, y: BRAZIER.y - 4, r: 26, sy: 1.6 },
        { x: LODGE.x, y: LODGE.y - 34, r: 122, sy: 3 },
        { x: LODGE_FIR.x, y: LODGE_FIR.y - 2, r: 14, sy: 1.8 },
      ];
      for (const [x, y] of LODGE_BORDER) this.blockers.push({ x, y, r: 13, sy: 1 });
      this.blockers.push({ ...LODGE_GARDEN.bench, r: 48, sy: 3 });
      this.blockers.push({ ...LODGE_GARDEN.wood, r: 29, sy: 2 });
      for (const p of LODGE_GARDEN.shrubs) this.blockers.push({ ...p, r: 22, sy: 1.6 });
      for (const p of LODGE_GARDEN.lamps) this.blockers.push({ ...p, r: 7, sy: 1.6 });
      for (const tn of TENTS) this.blockers.push({ x: tn.x, y: tn.y - 14 * tn.s, r: 62 * tn.s, sy: 1.6 });
      for (const [x, y] of POSTS) this.blockers.push({ x, y, r: 8, sy: 1.6 });
      for (const tr of this.trees) {
        const r = tr.kind === 'cypress' ? 15 : tr.kind === 'round' ? 17 : 22;
        this.blockers.push({ x: tr.x, y: tr.y - 2, r, sy: 1.8 });
      }
      for (const ln of this.lanterns) this.blockers.push({ x: ln.x, y: ln.y, r: 8, sy: 1.6 });
    }

    // 부딪히면 바깥으로 밀어 낸다. grow로 조금 넉넉하게 밀 수도 있다
    collide(p, grow = 1) {
      if (this.sea.boating) return;
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
      if (this.sea.boating) return [0, 0];
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
      // 땅 그림은 지도 전체 크기라 메모리를 아끼려고 1.1배까지만
      const gs = Math.min(1.1, this.z * dpr);
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
      this.sea.build(ss);
    }

    buildGround() {
      const gs = this.gs;
      const c = (this.ground = MC.canvas(W * gs, H * gs));
      const g = c.getContext('2d');
      g.scale(gs, gs);
      const rnd = MC.rng(2024);
      const base = g.createRadialGradient(1170, H * 0.58, 120, 1170, H * 0.58, 2210);
      base.addColorStop(0, '#5a9168');
      base.addColorStop(1, '#3a6b4f');
      g.fillStyle = base;
      g.fillRect(0, 0, W, H);
      // 넓고 옅은 풀빛의 변화. 동그란 얼룩이 도드라지지 않도록 가장자리를 풀어 준다.
      for (let i = 0; i < 95; i++) {
        const x = rnd() * 2300, y = rnd() * H, r = 85 + rnd() * 170;
        const light = rnd() < .58;
        g.save(); g.translate(x, y); g.scale(1, .55 + rnd() * .3);
        const patch = g.createRadialGradient(0, 0, 0, 0, 0, r);
        patch.addColorStop(0, light ? 'rgba(147,183,111,.11)' : 'rgba(29,70,48,.13)');
        patch.addColorStop(1, light ? 'rgba(147,183,111,0)' : 'rgba(29,70,48,0)');
        g.fillStyle = patch; g.fillRect(-r, -r, r * 2, r * 2); g.restore();
      }
      // 편백 숲 바닥은 이끼빛으로 짙게
      const moss = g.createRadialGradient(520, 430, 40, 520, 430, 600);
      moss.addColorStop(0, 'rgba(36,72,48,0.55)');
      moss.addColorStop(1, 'rgba(36,72,48,0)');
      g.fillStyle = moss;
      g.fillRect(0, 0, W, H);
      // 모래사장, 젖은 모래, 바다
      const band = (off, wobble) => {
        g.beginPath();
        g.moveTo(W + 10, -10);
        for (let y = -10; y <= H + 10; y += 10) g.lineTo(shoreX(y) + (typeof off === 'function' ? off(y) : off) + Math.sin(y * 0.021) * wobble, y);
        g.lineTo(W + 10, H + 10);
        g.closePath();
      };
      // 모래와 잔디 사이에는 낮은 사구. 작은 반도와 만을 따라 폭이 달라진다.
      for (const [extra, alpha] of [[24, .06], [14, .09], [6, .15]]) {
        band(y => -beachWidth(y) - extra, 9);
        g.fillStyle = `rgba(209,193,139,${alpha})`; g.fill();
      }
      band(y => -beachWidth(y), 8);
      g.fillStyle = '#e2cc9c';
      g.fill();
      for (const [off, col] of [[-55, '#d6bf94'], [-42, '#cbb68e'], [-27, '#c3b28e']]) {
        band(off, 3); g.fillStyle = col; g.fill();
      }
      band(0, 0);
      const sea = g.createLinearGradient(2100, 0, W, 0);
      sea.addColorStop(0, '#78cabb');
      sea.addColorStop(0.25, '#439fa4');
      sea.addColorStop(1, '#285c87');
      g.fillStyle = sea;
      g.fill();
      g.save(); band(0, 0); g.clip();
      for (let i = 0; i < 17; i++) {
        const y = 40 + i * 126, x = shoreX(y) + 75 + i % 3 * 100;
        const r = 90 + i % 4 * 18;
        g.save(); g.translate(x, y); g.rotate(-.3); g.scale(1, .45);
        const patch = g.createRadialGradient(0, 0, 0, 0, 0, r);
        patch.addColorStop(0, 'rgba(215,235,178,.2)'); patch.addColorStop(1, 'rgba(215,235,178,0)');
        g.fillStyle = patch; g.fillRect(-r, -r, r * 2, r * 2); g.restore();
      }
      g.restore();
      for (let i = 0; i < 480; i++) {
        const y = rnd() * H;
        const x = shoreX(y) - beachWidth(y) + 8 + rnd() * (beachWidth(y) - 38);
        g.fillStyle = `rgba(${rnd() < 0.5 ? '255,250,235' : '150,125,90'},${0.15 + rnd() * 0.2})`;
        ellipse(g, x, y, .7 + rnd() * 1.6, .5 + rnd()); g.fill();
      }
      // 모래가 끝나는 곳에 성긴 갯풀과 바람결. 다리 입구와 산책로는 비워 둔다.
      for (let i = 0; i < 150; i++) {
        const y = 45 + rnd() * (H - 90), x = shoreX(y) - beachWidth(y) + (rnd() - .5) * 27;
        if (this.nearPath(x, y, 40)) continue;
        g.strokeStyle = rnd() < .6 ? 'rgba(113,143,88,.5)' : 'rgba(184,169,111,.65)';
        g.lineWidth = 1.2; g.beginPath();
        for (let j = -1; j <= 1; j++) {
          g.moveTo(x + j * 2, y); g.quadraticCurveTo(x + j * 3 - 2, y - 6, x + j * 6 - 4, y - 10 - rnd() * 5);
        }
        g.stroke();
      }
      for (let i = 0; i < 65; i++) {
        const y = rnd() * H, x = shoreX(y) - 65 - rnd() * 40;
        if (Math.abs(y - DOCK_Y) < 60) continue;
        g.strokeStyle = 'rgba(173,151,108,.19)'; g.lineWidth = .9;
        g.beginPath(); g.moveTo(x - 4, y - 10); g.quadraticCurveTo(x + 2, y, x - 3, y + 14); g.stroke();
      }
      // 숙소까지 긴 거리로 풀빛이 식고, 옅은 서리에서 눈으로 차츰 이어진다
      {
        const snow = g.createRadialGradient(COLD.x, COLD.y, 0, COLD.x, COLD.y, COLD.rx);
        snow.addColorStop(0, 'rgba(237,240,244,0.84)');
        snow.addColorStop(0.22, 'rgba(224,231,234,0.70)');
        snow.addColorStop(0.45, 'rgba(204,217,218,0.38)');
        snow.addColorStop(0.72, 'rgba(178,199,199,0.10)');
        snow.addColorStop(1, 'rgba(178,199,199,0)');
        g.save();
        g.translate(0, COLD.y);
        g.scale(1, COLD.ry / COLD.rx);
        g.translate(0, -COLD.y);
        g.fillStyle = snow;
        g.fillRect(COLD.x - COLD.rx, COLD.y - COLD.rx, COLD.rx * 2, COLD.rx * 2);
        g.restore();
        // 바깥엔 성긴 서리, 안쪽에만 작은 눈 무더기. 경계에 흰 띠가 생기지 않는다.
        for (let i = 0; i < 160; i++) {
          const a = rnd() * Math.PI * 2;
          const r = Math.sqrt(rnd());
          const x = COLD.x + Math.cos(a) * COLD.rx * r;
          const y = COLD.y + Math.sin(a) * COLD.ry * r;
          const chill = coldAt(x, y);
          g.fillStyle = `rgba(239,242,246,${chill * chill * (0.18 + rnd() * 0.35)})`;
          ellipse(g, x, y, 5 + rnd() * 22 * chill, 3 + rnd() * 9 * chill);
          g.fill();
        }
      }
      // 흙길과 시설 앞마당을 같은 겹으로 칠해 이음새와 둥근 막다른 끝을 없앤다.
      for (const [spread, col] of [[12, 'rgba(157,143,95,.035)'], [7, 'rgba(166,146,98,.07)'], [3, 'rgba(126,110,77,.13)'], [0, '#bea37b'], [-3, '#cbb18a'], [-8, 'rgba(218,193,151,.48)']]) {
        g.fillStyle = col;
        PATHS.forEach((path, pi) => pathRibbon(g, path, pi, spread));
      }
      for (const q of CLEARINGS) clearing(g, q);
      // 마당 한가운데는 모서리 없이 다져진 흙과 잔자갈.
      for (const q of CLEARINGS) {
        for (let i = 0; i < 90; i++) {
          const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * .8;
          const x = q.x + Math.cos(a) * q.rx * r, y = q.y + Math.sin(a) * q.ry * r;
          g.fillStyle = rnd() < .55 ? 'rgba(114,97,73,.17)' : 'rgba(245,226,191,.28)';
          ellipse(g, x, y, .8 + rnd() * 1.6, .6 + rnd() * 1.1); g.fill();
        }
      }
      PATHS.forEach((path, pi) => {
        // 같은 흙길 위로 서리가 조금씩 늘어 문 앞에서 눈길이 된다.
        g.lineCap = 'round';
        for (let i = 1; i < path.length; i++) {
          const [x, y] = path[i], chill = coldAt(x, y);
          if (chill) {
            g.strokeStyle = `rgba(228,232,233,${chill * chill * .82})`;
            g.lineWidth = pathRadius(x, y, pi) * 2 - 5;
            g.beginPath(); g.moveTo(...path[i - 1]); g.lineTo(x, y); g.stroke();
          }
          if (i % 2) continue;
          const prev = path[i - 1], dx = x - prev[0], dy = y - prev[1], len = Math.hypot(dx, dy) || 1;
          const r = pathRadius(x, y, pi);
          // 가는 흙결과 작고 납작한 자갈.
          g.fillStyle = `rgba(128,105,75,${.22 * (1 - chill * .65)})`;
          ellipse(g, x + (rnd() - .5) * r * 1.65, y + (rnd() - .5) * r * 1.65, .7 + rnd() * 1.6, .5 + rnd()); g.fill();
          if (i % 8 === 0) {
            g.strokeStyle = `rgba(243,220,181,${.22 * (1 - chill)})`; g.lineWidth = .8;
            const off = (rnd() - .5) * r;
            g.beginPath(); g.moveTo(x - dy / len * off, y + dx / len * off); g.lineTo(x + dx / len * 8 - dy / len * off, y + dy / len * 8 + dx / len * off); g.stroke();
          }
          // 풀은 길 가장자리를 조금씩 덮되 교차점과 마당으로 들어오지 않는다.
          if (i % 5 || chill > .65) continue;
          const side = i % 10 ? -1 : 1, edge = r + 4 + rnd() * 5;
          const ex = x - dy / len * edge * side, ey = y + dx / len * edge * side;
          if (this.nearPath(ex, ey, r * .9) || this.inClearing(ex, ey, 8) || ex > shoreX(ey) - beachWidth(ey) - 12) continue;
          g.strokeStyle = 'rgba(87,126,74,.48)'; g.lineWidth = 1.1;
          g.beginPath(); g.moveTo(ex - 2, ey); g.lineTo(ex - 4, ey - 4); g.moveTo(ex + 1, ey); g.lineTo(ex + 2, ey - 5); g.stroke();
        }
      });
      // 눈길의 마지막 굽이는 오래 놓인 돌 디딤길로, 문 앞의 따뜻한 빛으로 이어진다.
      {
        const path = PATHS[PATHS.length - 1];
        let distance = 0, spacing = 0;
        for (let i = path.length - 1; i > 0; i--) {
          const [x, y] = path[i], [px, py] = path[i - 1];
          const step = Math.hypot(x - px, y - py);
          distance += step; spacing += step;
          if (distance > 215) break;
          if (spacing < 24) continue;
          spacing = 0;
          const angle = Math.atan2(y - py, x - px) + Math.PI / 2;
          g.fillStyle = 'rgba(92,109,119,0.22)';
          ellipse(g, x + 1, y + 2, 18, 10, angle); g.fill();
          g.fillStyle = i % 2 ? '#b4b2a9' : '#c1beb2';
          g.strokeStyle = 'rgba(93,100,99,0.3)'; g.lineWidth = 1;
          ellipse(g, x, y, 16, 8.5, angle); g.fill(); g.stroke();
          g.strokeStyle = 'rgba(242,243,238,0.65)'; g.lineWidth = 2;
          g.beginPath(); g.ellipse(x, y - 1, 14, 7, angle, Math.PI, Math.PI * 1.8); g.stroke();
        }
        const spill = g.createRadialGradient(LODGE.x, LODGE.y - 8, 10, LODGE.x, LODGE.y + 18, 155);
        spill.addColorStop(0, 'rgba(255,210,142,0.26)');
        spill.addColorStop(0.5, 'rgba(238,199,142,0.13)');
        spill.addColorStop(1, 'rgba(238,199,142,0)');
        g.fillStyle = spill; ellipse(g, LODGE.x, LODGE.y + 34, 170, 116); g.fill();
        // 다져진 길 옆으로만 작은 발자국 몇 쌍.
        g.fillStyle = 'rgba(123,145,158,0.3)';
        for (let i = 0; i < 6; i++) {
          const x = LODGE.x + 53 + i * 15, y = LODGE.y + 42 + Math.sin(i * 0.65) * 4;
          ellipse(g, x, y, 3.4, 2.5); g.fill();
          for (const dx of [-3, 0, 3]) { ellipse(g, x + dx, y - 4, 1, 1.2); g.fill(); }
        }
      }
      // 글램핑장 마당: 고운 자갈을 깐 너른 터
      const gy = g.createRadialGradient(1290, 1800, 30, 1290, 1800, 380);
      gy.addColorStop(0, 'rgba(206,186,150,0.95)');
      gy.addColorStop(0.75, 'rgba(200,178,140,0.7)');
      gy.addColorStop(1, 'rgba(200,178,140,0)');
      g.fillStyle = gy;
      ellipse(g, 1290, 1800, 420, 170);
      g.fill();
      for (let i = 0; i < 420; i++) {
        const a = rnd() * Math.PI * 2;
        const r = Math.sqrt(rnd());
        g.fillStyle = `rgba(${rnd() < 0.5 ? '120,104,84' : '236,224,200'},${0.25 + rnd() * 0.25})`;
        ellipse(g, 1290 + Math.cos(a) * 380 * r, 1800 + Math.sin(a) * 150 * r, 1.6 + rnd() * 1.6, 1.2 + rnd());
        g.fill();
      }
      // 텐트 밑의 나무 데크
      for (const [i, tn] of TENTS.entries()) {
        g.save();
        g.translate(tn.x, tn.y);
        g.scale(tn.s, tn.s);
        MC.GlampingArt.paintDeck(g, 710 + i);
        g.restore();
      }
      // 풀 포기와 들꽃
      for (let i = 0; i < 2000; i++) {
        const x = rnd() * W;
        const y = rnd() * H;
        if (x > shoreX(y) - beachWidth(y) - 28 || this.nearPath(x, y, 35) || this.inClearing(x, y, 10)) continue;
        if (((x - 1290) / 400) ** 2 + ((y - 1800) / 160) ** 2 < 1) continue;
        // 눈 덮인 숙소 둘레에는 들꽃 대신 눈 위로 삐죽한 마른 풀만
        if (rnd() < coldAt(x, y)) {
          if (rnd() < 0.5) continue;
          g.strokeStyle = 'rgba(150,130,96,0.55)';
          g.lineWidth = 1.2;
          g.beginPath();
          g.moveTo(x - 2, y);
          g.lineTo(x - 3, y - 6);
          g.moveTo(x + 2, y);
          g.lineTo(x + 3, y - 5);
          g.stroke();
          continue;
        }
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
      // 벨텐트 (글램핑장의 세 채는 천 빛깔이 조금씩 다르다)
      sp.tent = [['#fbecd2', '#d8bc92'], ['#f4ead8', '#cdbb9b'], ['#f6e4cc', '#cfae86']].map(([c0, c1], i) =>
        sprite(212, 182, 106, 150, ss, (g) => MC.GlampingArt.paintTent(g, c0, c1, i)));
      // 줄전구 기둥
      sp.post = sprite(30, 96, 15, 88, ss, (g) => {
        g.fillStyle = 'rgba(0,0,0,0.2)';
        ellipse(g, 0, 0, 7, 2.6);
        g.fill();
        MC.roundRect(g, -3, -80, 6, 80, 2);
        g.fillStyle = '#6e4b33';
        g.fill();
        g.strokeStyle = INK;
        g.lineWidth = 1.6;
        g.stroke();
        ellipse(g, 0, -80, 4.4, 2.4);
        g.fillStyle = '#4a3324';
        g.fill();
      });
      // 화로: 세 발 무쇠 그릇 안에 장작
      sp.brazier = sprite(90, 70, 45, 52, ss, (g) => {
        g.fillStyle = 'rgba(0,0,0,0.25)';
        ellipse(g, 0, 2, 30, 7);
        g.fill();
        g.strokeStyle = '#2b2622';
        g.lineWidth = 3;
        for (const [x0, x1] of [[-14, -20], [14, 20], [0, 0]]) {
          g.beginPath();
          g.moveTo(x0, -14);
          g.lineTo(x1, 0);
          g.stroke();
        }
        g.beginPath();
        g.moveTo(-26, -24);
        g.quadraticCurveTo(-24, -6, 0, -6);
        g.quadraticCurveTo(24, -6, 26, -24);
        g.closePath();
        g.fillStyle = '#3a332e';
        g.fill();
        g.strokeStyle = INK;
        g.lineWidth = 2;
        g.stroke();
        ellipse(g, 0, -24, 26, 6);
        g.fillStyle = '#1e1714';
        g.fill();
        g.stroke();
        for (const [x, a] of [[-8, -0.4], [8, 0.4]]) {
          g.save();
          g.translate(x, -26);
          g.rotate(a);
          MC.roundRect(g, -10, -3.5, 20, 7, 3.5);
          g.fillStyle = '#6b4a33';
          g.fill();
          g.strokeStyle = INK;
          g.lineWidth = 1.4;
          g.stroke();
          g.restore();
        }
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
      // 탑불멍: 두 개씩 나란히 놓고 다음 단을 직각으로 얹는 井자 장작탑.
      sp.tower = sprite(130, 150, 65, 126, ss, (g) => {
        g.drawImage(sp.pit.c, -sp.pit.ax, -sp.pit.ay, sp.pit.w, sp.pit.h);
        for (let i = 0; i < 6; i++) {
          for (const piece of MC.FireScene.towerLayer(i % 2)) {
            g.save();
            g.translate(piece.x * 0.44, -14 - i * 24 * 0.44 + piece.y * 0.44);
            g.rotate(piece.a);
            MC.roundRect(g, -33, -5.5, 66, 11, 5);
            const wood = g.createLinearGradient(0, -5.5, 0, 5.5);
            wood.addColorStop(0, i % 3 === 2 ? '#c8b397' : '#926344');
            wood.addColorStop(1, i % 3 === 2 ? '#8e7a63' : '#4b3021');
            g.fillStyle = wood; g.fill();
            g.strokeStyle = INK; g.lineWidth = 1.3; g.stroke();
            g.strokeStyle = 'rgba(40,24,15,0.45)'; g.lineWidth = 0.8;
            g.beginPath(); g.moveTo(-25, 1); g.lineTo(20, 1); g.stroke();
            g.fillStyle = '#c2915b'; ellipse(g, 28, 0, 3, 4); g.fill();
            g.strokeStyle = '#81502f'; ellipse(g, 28, 0, 1.5, 2.5); g.stroke();
            g.restore();
          }
        }
      });
      // 정자: 곡선 기와와 단청, 짜 맞춘 목재와 빛이 머무는 우물마루.
      // 기와·나뭇결·꽃은 크기가 바뀔 때만 그려 두어 지도 이동 중에는 한 장으로 그린다.
      sp.pavilion = sprite(310 * PAVILION_SCALE, 280 * PAVILION_HEIGHT + 17, 155 * PAVILION_SCALE, 238 * PAVILION_HEIGHT + 17, ss, (g) => {
        g.translate(0, -17);
        g.scale(PAVILION_SCALE, PAVILION_HEIGHT);
        const rnd = MC.rng(8216);
        const edge = '#493d32';
        const poly = (points, fill, stroke = edge, width = 1) => {
          g.beginPath(); g.moveTo(...points[0]);
          for (const p of points.slice(1)) g.lineTo(...p);
          g.closePath(); g.fillStyle = fill; g.fill();
          if (stroke) { g.strokeStyle = stroke; g.lineWidth = width; g.stroke(); }
        };
        const line = (points, color, width) => {
          g.strokeStyle = color; g.lineWidth = width; g.beginPath();
          points.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.stroke();
        };
        // 바닥에 넓게 퍼지는 부드러운 그림자와 낮은 디딤돌.
        g.save(); g.scale(1, 0.23);
        const shadow = g.createRadialGradient(5, 0, 12, 5, 0, 123);
        shadow.addColorStop(0, 'rgba(22,32,25,0.4)'); shadow.addColorStop(1, 'rgba(22,32,25,0)');
        g.fillStyle = shadow; g.fillRect(-128, -125, 256, 250); g.restore();
        for (const [x, y, rx, ry] of [[0, 22, 31, 9], [-7, 33, 22, 6]]) {
          ellipse(g, x, y + 1.5, rx + 2, ry); g.fillStyle = 'rgba(35,43,31,0.16)'; g.fill();
          ellipse(g, x, y, rx, ry); g.fillStyle = '#a9a58e'; g.fill();
          g.strokeStyle = '#74796a'; g.lineWidth = 0.9; g.stroke();
          line([[x-rx*.6,y-2],[x-rx*.1,y-ry*.55],[x+rx*.55,y-2]], '#c9c4a8', 0.8);
        }
        // 잘 다듬은 화강석 기단: 윗면과 옆면, 돌 사이 줄눈과 작은 반점.
        const stone = g.createLinearGradient(0, -25, 0, 4);
        stone.addColorStop(0, '#b0ad99'); stone.addColorStop(1, '#777c70');
        MC.roundRect(g, -95, -25, 190, 28, 4); g.fillStyle = stone; g.fill();
        g.strokeStyle = '#596456'; g.lineWidth = 1.5; g.stroke();
        poly([[-95,-24],[-76,-42],[76,-42],[95,-24]], '#c1bca4', '#727d69', 1);
        for (let x = -70; x < 90; x += 33) line([[x,-23],[x-2,-11],[x,2]], '#808575', 0.7);
        for (let i = 0; i < 95; i++) {
          g.fillStyle = i % 2 ? 'rgba(230,225,199,0.33)' : 'rgba(73,84,69,0.2)';
          g.fillRect(-91+rnd()*181, -23+rnd()*24, .6+rnd()*.8, .7);
        }
        // 작은 두 단의 계단. 중앙을 비워 마루의 입구가 보인다.
        for (const [y, width] of [[-9, 58], [1, 68]]) {
          MC.roundRect(g, -width/2, y, width, 11, 1.7); g.fillStyle = '#999e88'; g.fill();
          g.strokeStyle = '#66725e'; g.lineWidth = 0.9; g.stroke();
          g.fillStyle = '#c8c4a9'; g.fillRect(-width/2+1, y+1, width-2, 3);
        }
        // 따뜻한 나무 마루. 판마다 다르게 흐르는 결과 테두리 장부.
        poly([[-86,-36],[-66,-62],[66,-62],[86,-36]], '#b48756', '#624c34', 1.4);
        g.save(); g.clip();
        for (let x = -85; x <= 85; x += 12) {
          line([[x*.78,-62],[x,-36]], '#805c3b', 0.8);
          line([[x*.78+2,-61],[x+2,-37]], 'rgba(235,197,134,0.5)', 0.6);
          for (let i = 0; i < 3; i++) {
            const yy=-60+rnd()*23;
            line([[x*.9+3,yy],[x*.9+7,yy+1],[x*.9+9,yy+.4]], 'rgba(107,67,35,0.3)', 0.5);
          }
        }
        g.restore();
        const floorLight = g.createRadialGradient(0,-48,3,0,-48,80);
        floorLight.addColorStop(0,'rgba(255,216,141,0.3)'); floorLight.addColorStop(1,'rgba(255,216,141,0)');
        poly([[-85,-36],[-66,-61],[66,-61],[85,-36]],floorLight,null);
        poly([[-87,-36],[87,-36],[87,-25],[-87,-25]], '#9a6a40', '#60482f', 1.1);
        line([[-85,-34],[85,-34]], '#e3b77e', 1.4);
        for (let x=-75;x<85;x+=23) {
          line([[x,-32],[x,-26]], '#704b2c', .8);
          g.fillStyle='#d2a56e'; g.fillRect(x+2,-31,3,2);
        }
        // 뒤쪽 난간과 옆 난간의 가는 살대. 앞은 열어 둔다.
        const rail = (ax,ay,bx,by,n) => {
          line([[ax,ay],[bx,by]], '#694a32', 4);
          line([[ax,ay-1],[bx,by-1]], '#c18e58', 1.2);
          line([[ax,ay+21],[bx,by+21]], '#684a32', 3);
          for(let i=0;i<=n;i++) {
            const x=MC.lerp(ax,bx,i/n), y=MC.lerp(ay,by,i/n);
            line([[x,y+2],[x+(i%2?2:-2),y+11],[x,y+20]], '#92643f', 2.2);
          }
        };
        rail(-51,-86,51,-86,8);
        rail(-75,-64,-51,-86,3); rail(51,-86,75,-64,3);
        // 배흘림 기둥, 주춧돌, 빛을 받는 목재 결.
        const column = (x, top, bottom, back) => {
          MC.roundRect(g,x-10,bottom-2,20,8,2); g.fillStyle='#b2b09b'; g.fill();
          g.strokeStyle='#707d6b'; g.lineWidth=.8; g.stroke();
          const wood=g.createLinearGradient(x-7,0,x+7,0);
          wood.addColorStop(0,back?'#a56844':'#bf8050'); wood.addColorStop(.35,back?'#855538':'#a56b44'); wood.addColorStop(1,'#5a392b');
          g.beginPath(); g.moveTo(x-5,top); g.lineTo(x+5,top);
          g.quadraticCurveTo(x+8,(top+bottom)/2,x+6,bottom);
          g.lineTo(x-6,bottom); g.quadraticCurveTo(x-8,(top+bottom)/2,x-5,top); g.closePath();
          g.fillStyle=wood; g.fill(); g.strokeStyle=edge; g.lineWidth=1.1; g.stroke();
          g.save(); g.clip();
          for(let i=0;i<8;i++) {
            const xx=x-6+rnd()*12, yy=top+rnd()*25;
            g.strokeStyle=i%3?'rgba(63,35,23,0.35)':'rgba(242,192,124,0.4)'; g.lineWidth=.55;
            g.beginPath(); g.moveTo(xx,yy); g.bezierCurveTo(xx+2,yy+22,xx-1,bottom-20,xx+.5,bottom); g.stroke();
          }
          g.restore();
          g.fillStyle='#486954'; g.fillRect(x-7,top+4,14,5);
          line([[x-7,top+4],[x+7,top+4]], '#c4b276', .8);
        };
        column(-49,-139,-60,true); column(49,-139,-60,true);
        // 린넨 방석과 작은 찻상. 차분한 쑥빛과 말린 장미빛을 쓴다.
        for(const [x,y,color] of [[-48,-46,'#8b9d7a'],[0,-46,'#b9a47c'],[48,-46,'#b68071']]) {
          ellipse(g,x,y+3,18,5); g.fillStyle='rgba(43,34,23,0.2)'; g.fill();
          MC.roundRect(g,x-16,y-5,32,9,4); g.fillStyle=color; g.fill();
          g.strokeStyle='#665746'; g.lineWidth=.8; g.stroke();
          g.strokeStyle='rgba(246,231,192,0.65)'; g.lineWidth=.6; g.setLineDash([1.5,2]);
          MC.roundRect(g,x-13,y-3,26,5,2); g.stroke(); g.setLineDash([]);
        }
        g.fillStyle='#62482f'; g.fillRect(11,-69,3,8); g.fillRect(39,-69,3,8);
        ellipse(g,26,-69,19,5); g.fillStyle='#b17c49'; g.fill();
        g.strokeStyle='#62442b'; g.lineWidth=1; g.stroke();
        ellipse(g,25,-72,7,3); g.fillStyle='#d2b787'; g.fill();
        ellipse(g,25,-75,5,4); g.fillStyle='#9bab8b'; g.fill();
        ellipse(g,25,-78,4,1.5); g.fillStyle='#d8d6b2'; g.fill();
        g.strokeStyle='#ded4a7'; g.lineWidth=.7;
        ellipse(g,30,-75,2,2); g.stroke();
        ellipse(g,13,-72,3,1.7); g.fillStyle='#d0c8a4'; g.fill();
        column(-74,-136,-35,false); column(74,-136,-35,false);
        // 보와 공포: 층층이 포개진 받침과 절제된 연꽃 단청.
        g.fillStyle='#6b4933'; MC.roundRect(g,-88,-127,176,12,2); g.fill();
        for(const x of [-74,-49,49,74]) {
          for(let i=0;i<3;i++) {
            const width=18+i*8, yy=-113-i*5;
            poly([[x-width/2,yy],[x+width/2,yy],[x+width/2-4,yy+4],[x-width/2+4,yy+4]],i%2?'#8e543b':'#547c64','#423e2f',.7);
            line([[x-width/2+3,yy+.8],[x+width/2-3,yy+.8]], '#d1b77d', .65);
          }
        }
        g.fillStyle='#527b65'; g.fillRect(-89,-127,178,8);
        line([[-89,-127],[89,-127]], '#d5bc81', 1);
        line([[-89,-119],[89,-119]], '#8f503b', 1.8);
        for(let x=-81;x<=81;x+=18) {
          for(const side of [-1,1]) {
            ellipse(g,x+side*2.6,-123,3.2,1.5,side*.6); g.fillStyle='#b77d5b'; g.fill();
          }
          ellipse(g,x,-123,1.3,1.3); g.fillStyle='#d8bf7a'; g.fill();
        }
        // 등롱의 한지와 나무 골조. 실제 빛은 지도 조명 단계에서 더한다.
        for(const x of [-58,58]) {
          line([[x,-130],[x,-119]], '#5c5137', .9);
          g.fillStyle='#694d32'; MC.roundRect(g,x-8,-121,16,4,1); g.fill();
          const paper=g.createLinearGradient(x-6,0,x+6,0);
          paper.addColorStop(0,'#dcad70'); paper.addColorStop(.4,'#ffe8b0'); paper.addColorStop(1,'#e6bb7d');
          MC.roundRect(g,x-6,-117,12,19,1.5); g.fillStyle=paper; g.fill();
          line([[x-6,-117],[x-6,-98],[x+6,-98],[x+6,-117]], '#7e603d', 1);
          line([[x,-116],[x,-99]], 'rgba(135,99,48,0.55)', .6);
          g.fillStyle='#6d5034'; MC.roundRect(g,x-8,-99,16,3,1); g.fill();
        }
        // 처마 밑 서까래의 단면과 어두운 천장.
        poly([[-128,-151],[128,-151],[112,-135],[0,-124],[-112,-135]], '#3d4c40', '#3b3c30', 1);
        for(let x=-112;x<=112;x+=9) {
          const yy=-132-12*Math.pow(Math.abs(x)/116,3);
          line([[x*.9,yy-12],[x,yy]], '#927c51', 3.6);
          ellipse(g,x,yy,2.2,1.7); g.fillStyle='#b8b184'; g.fill();
          ellipse(g,x,yy,.8,.6); g.fillStyle='#537a62'; g.fill();
        }
        // 앞 지붕의 곡면 좌표: 용마루에서 처마로 갈수록 넓어지고 양끝이 올라간다.
        const roofPoint=(u,v)=>[u*MC.lerp(32,130,v),-213+76*v+7*Math.sin(Math.PI*v)-17*Math.pow(Math.abs(u),4)*v*v];
        const roofPath=()=>{
          g.beginPath(); g.moveTo(...roofPoint(-1,0)); g.lineTo(...roofPoint(1,0));
          for(let i=1;i<=24;i++)g.lineTo(...roofPoint(1,i/24));
          for(let i=24;i>=-24;i--)g.lineTo(...roofPoint(i/24,1));
          for(let i=23;i>=0;i--)g.lineTo(...roofPoint(-1,i/24));
          g.closePath();
        };
        roofPath();
        const roof=g.createLinearGradient(-60,-212,70,-132);
        roof.addColorStop(0,'#899088'); roof.addColorStop(.35,'#66777a'); roof.addColorStop(.75,'#455c64'); roof.addColorStop(1,'#314a53');
        g.fillStyle=roof; g.fill(); g.strokeStyle='#303f42'; g.lineWidth=1.8; g.stroke();
        g.save(); g.clip();
        // 암키와의 겹친 가로 이음. 줄마다 조금씩 엇갈린다.
        for(let row=1;row<=8;row++) {
          const v=row/8;
          for(let i=-16;i<16;i++) {
            const u=(i+(row%2)*.5)/16;
            const pts=[];
            for(let k=0;k<=4;k++)pts.push(roofPoint(u+k/64,v));
            line(pts,'rgba(30,49,56,0.58)',.8);
            line(pts.map(([x,y])=>[x,y-1]),'rgba(186,199,179,0.3)',.55);
          }
        }
        // 수키와는 빛을 받은 등과 옆의 그늘로 둥글게 표현한다.
        for(let i=-16;i<=16;i++) {
          const u=i/16, pts=[];
          for(let k=0;k<=28;k++)pts.push(roofPoint(u,k/28));
          line(pts,'rgba(26,43,50,0.75)',3.1);
          line(pts.map(([x,y])=>[x-.75,y-.4]),'rgba(162,180,172,0.65)',1.2);
          for(let row=1;row<8;row++) {
            const [x,y]=roofPoint(u,row/8);
            line([[x-1.4,y-.4],[x+1.2,y+.3]],'#344b52',.75);
          }
        }
        g.restore();
        const eaves=[];
        for(let i=-32;i<=32;i++)eaves.push(roofPoint(i/32,1));
        line(eaves,'#34474a',4);
        line(eaves.map(([x,y])=>[x,y-1.6]),'#a2aaa0',1.25);
        // 처마 끝 막새. 작은 연꽃 무늬가 기와의 두께를 드러낸다.
        for(let i=-16;i<=16;i++) {
          const [x,y]=roofPoint(i/16,1);
          ellipse(g,x,y+1.2,3.1,2.6); g.fillStyle='#5b6c6c'; g.fill();
          g.strokeStyle='#34484b'; g.lineWidth=.7; g.stroke();
          ellipse(g,x-.6,y+.6,1.2,1); g.strokeStyle='#b2b7a0'; g.lineWidth=.55; g.stroke();
        }
        // 용마루의 층과 끝의 치켜든 망와.
        for(const [yy,ww,color] of [[-215,77,'#354b51'],[-219,70,'#73847f'],[-222,64,'#8e998a']]) {
          MC.roundRect(g,-ww/2,yy,ww,4,1.5); g.fillStyle=color; g.fill();
        }
        for(const side of [-1,1]) {
          poly([[side*30,-216],[side*42,-223],[side*43,-230],[side*35,-226],[side*30,-223]],'#657a75','#35494a',.9);
          line([[side*35,-221],[side*40,-225]],'#b1b8a1',.8);
        }
        // 기단 모서리의 이끼와 작은 꽃. 건물의 출입구와 앞길은 비워 둔다.
        for(const side of [-1,1]) {
          for(let i=0;i<18;i++) {
            const x=side*(77+rnd()*35),y=-1+rnd()*9;
            ellipse(g,x,y,2+rnd()*3,.8+rnd()*1.2); g.fillStyle=i%2?'#7f9861':'#5c805b'; g.fill();
          }
          for(let i=0;i<6;i++) {
            const x=side*(101+rnd()*18),y=4+rnd()*8,h=5+rnd()*9;
            line([[x,y],[x-2,y-h],[x+1,y-3],[x+4,y-h*.8]],'#769268',.9);
            if(i%2===0) {
              for(let k=0;k<5;k++) { const a=k*Math.PI*.4; ellipse(g,x-2+Math.cos(a)*1.8,y-h+Math.sin(a)*1.8,1.5,.8,a); g.fillStyle='#efe4bd'; g.fill(); }
              ellipse(g,x-2,y-h,.7,.7); g.fillStyle='#d3ae62'; g.fill();
            }
          }
        }
      });
      // 그루터기와 빨간 버섯
      // 눈 덮인 작은 목조 숙소: 다락창, 린넨 커튼, 현관 등과 나무 툇마루.
      sp.lodge = sprite(340, 280, 170, 250, ss, (g) => {
        g.fillStyle = 'rgba(0,0,0,0.26)';
        ellipse(g, 0, 4, 132, 17);
        g.fill();
        // 돌 기단
        MC.roundRect(g, -112, -22, 224, 22, 5);
        g.fillStyle = '#9b958c';
        g.fill();
        g.strokeStyle = INK;
        g.lineWidth = 2.2;
        g.stroke();
        g.strokeStyle = 'rgba(60,56,50,0.4)';
        g.lineWidth = 1.2;
        for (let x = -96; x < 110; x += 26) {
          g.beginPath();
          g.moveTo(x, -21);
          g.lineTo(x + 4, -1);
          g.stroke();
        }
        // 나무 벽
        g.beginPath();
        g.rect(-102, -124, 204, 104);
        const wall = g.createLinearGradient(-102, 0, 102, 0);
        wall.addColorStop(0, '#946b4b');
        wall.addColorStop(0.5, '#b68a5f');
        wall.addColorStop(1, '#805d43');
        g.fillStyle = wall;
        g.fill();
        g.strokeStyle = INK;
        g.lineWidth = 2.2;
        g.stroke();
        g.strokeStyle = 'rgba(80,50,28,0.35)';
        g.lineWidth = 1.2;
        for (let y = -112; y < -22; y += 11) {
          g.beginPath();
          g.moveTo(-100, y);
          g.lineTo(100, y);
          g.stroke();
        }
        // 기둥
        g.fillStyle = '#6e4a2e';
        for (const x of [-104, -30, 26, 96]) {
          g.fillRect(x, -124, 8, 104);
          g.strokeStyle = INK;
          g.lineWidth = 1.6;
          g.strokeRect(x, -124, 8, 104);
        }
        // 불 켜진 창: 창살 사이로 따뜻한 빛
        for (const cx of [-66, 61]) {
          g.beginPath();
          g.rect(cx - 24, -100, 48, 40);
          const win = g.createLinearGradient(0, -100, 0, -60);
          win.addColorStop(0, '#ffe6ad');
          win.addColorStop(1, '#ffc46f');
          g.fillStyle = win;
          g.fill();
          g.strokeStyle = '#5a3a22';
          g.lineWidth = 3;
          g.stroke();
          g.lineWidth = 1.4;
          g.beginPath();
          for (const u of [-8, 8]) {
            g.moveTo(cx + u, -100);
            g.lineTo(cx + u, -60);
          }
          g.moveTo(cx - 24, -80);
          g.lineTo(cx + 24, -80);
          g.stroke();
          // 옆으로 걷어 둔 린넨 커튼. 창 가운데는 환하게 비워 둔다.
          g.fillStyle = 'rgba(255,239,204,0.64)';
          for (const side of [-1, 1]) {
            g.beginPath();
            g.moveTo(cx + side * 22, -98); g.lineTo(cx + side * 10, -98);
            g.quadraticCurveTo(cx + side * 12, -84, cx + side * 21, -78);
            g.lineTo(cx + side * 22, -62); g.closePath(); g.fill();
          }
          // 창턱
          g.fillStyle = '#7a5434';
          g.fillRect(cx - 28, -60, 56, 5);
        }
        // 가운데 미닫이문과 노렌
        g.beginPath();
        g.rect(-24, -108, 48, 86);
        g.fillStyle = '#ffd890';
        g.fill();
        g.strokeStyle = '#5a3a22';
        g.lineWidth = 3;
        g.stroke();
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(0, -108);
        g.lineTo(0, -22);
        for (let y = -90; y < -24; y += 16) {
          g.moveTo(-24, y);
          g.lineTo(24, y);
        }
        g.stroke();
        g.beginPath();
        g.moveTo(-28, -110);
        g.lineTo(28, -110);
        g.lineTo(28, -80);
        g.quadraticCurveTo(14, -77, 1.5, -80);
        g.lineTo(1.5, -110);
        g.moveTo(-1.5, -110);
        g.lineTo(-1.5, -80);
        g.quadraticCurveTo(-14, -77, -28, -80);
        g.closePath();
        g.fillStyle = '#607b70';
        g.fill();
        g.strokeStyle = INK;
        g.lineWidth = 1.8;
        g.stroke();
        g.fillStyle = 'rgba(255,248,236,0.9)';
        ellipse(g, -13, -92, 4.4, 3.8);
        g.fill();
        for (const [dx, dy] of [[-5.6, -4.6], [-2, -6.6], [2, -6.6], [5.6, -4.6]]) {
          ellipse(g, -13 + dx, -92 + dy, 1.5, 1.8);
          g.fill();
        }
        // 문 앞의 작은 초록 리스와 천 매듭.
        g.strokeStyle = '#506854'; g.lineWidth = 4;
        ellipse(g, 0, -57, 9, 9); g.stroke();
        g.fillStyle = '#b77559';
        for (const side of [-1, 1]) {
          g.beginPath(); g.moveTo(0, -49); g.lineTo(side * 7, -45); g.lineTo(side * 5, -52); g.closePath(); g.fill();
        }
        // 툇마루
        MC.roundRect(g, -118, -28, 236, 10, 3);
        g.fillStyle = '#c99a63';
        g.fill();
        g.strokeStyle = INK;
        g.lineWidth = 2;
        g.stroke();
        g.strokeStyle = 'rgba(110,70,40,0.4)';
        g.lineWidth = 1;
        for (let x = -108; x < 116; x += 16) {
          g.beginPath();
          g.moveTo(x, -27);
          g.lineTo(x, -19);
          g.stroke();
        }
        // 툇마루 양끝의 낮은 난간. 가운데 출입구는 넓게 열어 둔다.
        for (const side of [-1, 1]) {
          g.strokeStyle = '#71583f'; g.lineWidth = 4;
          g.beginPath(); g.moveTo(side * 72, -44); g.lineTo(side * 112, -44); g.stroke();
          g.lineWidth = 3;
          for (const x of [76, 94, 110]) { g.beginPath(); g.moveTo(side * x, -43); g.lineTo(side * x, -28); g.stroke(); }
          g.strokeStyle = '#ddd9cd'; g.lineWidth = 2;
          g.beginPath(); g.moveTo(side * 72, -47); g.lineTo(side * 112, -47); g.stroke();
        }
        g.fillStyle = '#b9986c';
        MC.roundRect(g, -26, -19, 52, 12, 3); g.fill();
        g.strokeStyle = '#81674b'; g.lineWidth = 1;
        for (let x = -22; x <= 22; x += 5) { g.beginPath(); g.moveTo(x, -17); g.lineTo(x, -9); g.stroke(); }
        // 댓돌 위 실내화 한 켤레
        for (const dx of [-7, 7]) {
          ellipse(g, dx, -10, 5.5, 3);
          g.fillStyle = '#e68a7a';
          g.fill();
          g.strokeStyle = INK;
          g.lineWidth = 1.2;
          g.stroke();
        }
        // 지붕: 끝이 살짝 들린 기와지붕
        g.beginPath();
        g.moveTo(-146, -116);
        g.quadraticCurveTo(-120, -130, -104, -134);
        g.lineTo(-74, -196);
        g.lineTo(74, -196);
        g.lineTo(104, -134);
        g.quadraticCurveTo(120, -130, 146, -116);
        g.quadraticCurveTo(0, -136, -146, -116);
        g.closePath();
        const roof = g.createLinearGradient(0, -196, 0, -116);
        roof.addColorStop(0, '#5d667f');
        roof.addColorStop(1, '#3f4559');
        g.fillStyle = roof;
        g.fill();
        g.strokeStyle = INK;
        g.lineWidth = 2.4;
        g.stroke();
        g.save();
        g.clip();
        g.strokeStyle = 'rgba(20,24,36,0.45)';
        g.lineWidth = 1.4;
        for (let y = -186; y < -118; y += 10) {
          g.beginPath();
          g.moveTo(-150, y + 4);
          g.quadraticCurveTo(0, y - 6, 150, y + 4);
          g.stroke();
        }
        for (let x = -140; x <= 140; x += 14) {
          g.beginPath();
          g.moveTo(x * 0.52, -196);
          g.lineTo(x, -118);
          g.stroke();
        }
        g.restore();
        // 지붕에 소복이 쌓인 눈: 위는 두툼하게, 처마 끝으로 살짝 늘어진다
        g.beginPath();
        g.moveTo(-78, -200);
        g.lineTo(78, -200);
        g.lineTo(106, -140);
        g.quadraticCurveTo(124, -134, 146, -121);
        for (let x = 146; x >= -146; x -= 12) g.lineTo(x, -122 + (x === 146 || x === -146 ? 0 : 3 + 3 * Math.sin(x * 0.4) + (rnd() < 0.25 ? 5 : 0)) - (Math.abs(x) < 104 ? (1 - Math.abs(x) / 104) * 12 : 0));
        g.quadraticCurveTo(-124, -134, -106, -140);
        g.closePath();
        const roofSnow = g.createLinearGradient(0, -202, 0, -118);
        roofSnow.addColorStop(0, '#f6f3eb');
        roofSnow.addColorStop(0.55, '#e5e9e8');
        roofSnow.addColorStop(1, '#bfcedc');
        g.fillStyle = roofSnow;
        g.fill();
        g.strokeStyle = 'rgba(120,135,165,0.8)';
        g.lineWidth = 1.6;
        g.stroke();
        // 고드름
        g.fillStyle = 'rgba(225,238,255,0.9)';
        for (const x of [-132, -96, -60, -18, 30, 74, 112, 136]) {
          const len = 6 + (Math.abs(x * 7) % 9);
          g.beginPath();
          g.moveTo(x - 2.4, -118 + (Math.abs(x) < 104 ? -(1 - Math.abs(x) / 104) * 12 : 0));
          g.lineTo(x + 2.4, -118 + (Math.abs(x) < 104 ? -(1 - Math.abs(x) / 104) * 12 : 0));
          g.lineTo(x, -118 + len + (Math.abs(x) < 104 ? -(1 - Math.abs(x) / 104) * 12 : 0));
          g.closePath();
          g.fill();
        }
        // 용마루
        g.fillStyle = '#2f3444';
        MC.roundRect(g, -80, -202, 160, 8, 4);
        g.fill();
        // 작은 다락의 박공지붕과 둥근 창.
        g.fillStyle = 'rgba(69,88,103,0.24)';
        g.beginPath(); g.moveTo(-40, -143); g.lineTo(9, -196); g.lineTo(46, -140); g.closePath(); g.fill();
        g.fillStyle = '#aa8059'; g.strokeStyle = '#5b5146'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(-33, -145); g.lineTo(-33, -167); g.lineTo(0, -194); g.lineTo(33, -167); g.lineTo(33, -145); g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = 'rgba(102,72,48,0.45)'; g.lineWidth = 1;
        for (const y of [-158, -148]) { g.beginPath(); g.moveTo(-31, y); g.lineTo(31, y); g.stroke(); }
        const attic = g.createRadialGradient(-3, -167, 2, 0, -164, 12);
        attic.addColorStop(0, '#fff0bb'); attic.addColorStop(1, '#efb46c');
        g.fillStyle = attic; g.strokeStyle = '#644c35'; g.lineWidth = 3;
        ellipse(g, 0, -165, 11, 11); g.fill(); g.stroke();
        g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(-10, -165); g.lineTo(10, -165); g.moveTo(0, -175); g.lineTo(0, -155); g.stroke();
        g.strokeStyle = '#494f55'; g.lineWidth = 7;
        g.beginPath(); g.moveTo(-39, -165); g.lineTo(0, -199); g.lineTo(39, -165); g.stroke();
        g.strokeStyle = '#f3f1e9'; g.lineWidth = 6;
        g.beginPath(); g.moveTo(-39, -169); g.lineTo(0, -203); g.lineTo(39, -169); g.stroke();
        // 처마를 따라 살짝 처진 따뜻한 전구 아홉 알.
        g.strokeStyle = '#635544'; g.lineWidth = 1.1;
        g.beginPath(); g.moveTo(-116, -123); g.quadraticCurveTo(0, -105, 116, -123); g.stroke();
        for (const bulb of LODGE_EAVES) {
          g.strokeStyle = '#665b48'; g.lineWidth = 1.2;
          g.beginPath(); g.moveTo(bulb.x, bulb.y - 2); g.lineTo(bulb.x, bulb.y + 3); g.stroke();
          g.fillStyle = '#ffe2a6'; ellipse(g, bulb.x, bulb.y + 5, 2.5, 3.3); g.fill();
        }
        // 처마 끝에 매단 곶감
        for (const x of [-126, 124]) {
          g.strokeStyle = '#4a3a2a';
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(x, -122);
          g.lineTo(x, -78);
          g.stroke();
          for (let i = 0; i < 4; i++) {
            ellipse(g, x, -114 + i * 11, 4, 5);
            g.fillStyle = i % 2 ? '#c26a2c' : '#b55d24';
            g.fill();
            g.strokeStyle = 'rgba(80,40,16,0.7)';
            g.stroke();
          }
        }
        // 문 옆의 작은 황동 벽등.
        g.strokeStyle = '#665038'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(37, -98); g.lineTo(44, -98); g.lineTo(44, -105); g.stroke();
        g.fillStyle = '#ffdaa0'; MC.roundRect(g, 37, -100, 13, 17, 3); g.fill();
        g.strokeStyle = '#715438'; g.lineWidth = 1.8; g.stroke();
        g.fillStyle = '#65523e'; MC.roundRect(g, 35, -103, 17, 4, 2); g.fill();
        MC.roundRect(g, 36, -85, 15, 3, 1); g.fill();
        // 굴뚝 (난로 연통)
        g.fillStyle = '#5a5a60';
        g.fillRect(56, -226, 14, 44);
        g.strokeStyle = INK;
        g.lineWidth = 1.8;
        g.strokeRect(56, -226, 14, 44);
        g.fillStyle = '#3e3e44';
        g.fillRect(52, -230, 22, 6);
        g.strokeRect(52, -230, 22, 6);
        // 툇마루 끝과 창턱 위의 눈
        g.fillStyle = '#f4f7fc';
        for (const cx of [-66, 61]) {
          MC.roundRect(g, cx - 29, -63, 58, 4, 2);
          g.fill();
        }
        MC.roundRect(g, -120, -31, 30, 5, 2.5);
        g.fill();
        MC.roundRect(g, 92, -31, 28, 5, 2.5);
        g.fill();
      });
      sp.lodgeBench = sprite(128, 84, 64, 72, ss, (g) => {
        g.fillStyle = 'rgba(40,48,47,0.2)'; ellipse(g, 0, 2, 59, 8); g.fill();
        g.strokeStyle = '#5d4e3e'; g.lineWidth = 5;
        for (const x of [-44, 44]) { g.beginPath(); g.moveTo(x, -35); g.lineTo(x, 0); g.stroke(); }
        g.fillStyle = '#a5815a'; g.strokeStyle = '#62513e'; g.lineWidth = 2;
        for (const y of [-46, -34]) { MC.roundRect(g, -54, y, 108, 9, 3); g.fill(); g.stroke(); }
        MC.roundRect(g, -57, -21, 114, 12, 4); g.fill(); g.stroke();
        g.fillStyle = '#e4e6df'; MC.roundRect(g, -54, -48, 108, 4, 2); g.fill();
        // 자리를 비워 둔 벤치 한쪽에 접은 담요.
        g.fillStyle = '#bb8673';
        g.beginPath(); g.moveTo(12, -45); g.lineTo(41, -45); g.lineTo(44, -13); g.lineTo(12, -10); g.closePath(); g.fill();
        g.strokeStyle = '#ead8bc'; g.lineWidth = 2;
        for (const y of [-38, -30, -22, -14]) { g.beginPath(); g.moveTo(13, y); g.lineTo(42, y - 2); g.stroke(); }
        g.lineWidth = 1;
        for (let x = 15; x < 43; x += 5) { g.beginPath(); g.moveTo(x, -11); g.lineTo(x - 1, -5); g.stroke(); }
      });
      sp.lodgeWood = sprite(86, 84, 43, 74, ss, (g) => {
        g.fillStyle = 'rgba(40,48,47,0.2)'; ellipse(g, 0, 0, 36, 7); g.fill();
        g.fillStyle = '#70573f'; MC.roundRect(g, -34, -41, 68, 39, 3); g.fill();
        for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) {
          const x = -24 + row * 8 + i * 16, y = -10 - row * 14;
          g.fillStyle = '#c69a66'; g.strokeStyle = '#6d5036'; g.lineWidth = 2;
          ellipse(g, x, y, 9, 8); g.fill(); g.stroke();
          g.strokeStyle = '#9c764e'; g.lineWidth = 1;
          g.beginPath(); g.moveTo(x - 4, y + 1); g.lineTo(x + 3, y - 2); g.stroke();
        }
        g.fillStyle = '#5c645f';
        g.beginPath(); g.moveTo(-40, -43); g.lineTo(-31, -56); g.lineTo(30, -56); g.lineTo(40, -43); g.closePath(); g.fill();
        g.strokeStyle = '#eceee8'; g.lineWidth = 5;
        g.beginPath(); g.moveTo(-36, -49); g.lineTo(-29, -58); g.lineTo(29, -58); g.lineTo(36, -49); g.stroke();
      });
      sp.lodgeShrub = sprite(78, 58, 39, 48, ss, (g) => {
        g.fillStyle = 'rgba(49,67,66,0.15)'; ellipse(g, 0, 2, 36, 8); g.fill();
        blobs(g, [[-16,-12,14],[0,-20,18],[18,-12,14]], '#4f7064', '#354d43', 1.4);
        g.strokeStyle = '#dce6e2'; g.lineWidth = 4;
        for (const [x,y] of [[-18,-22],[0,-34],[20,-23]]) {
          g.beginPath(); g.moveTo(x - 7, y); g.quadraticCurveTo(x, y - 4, x + 7, y); g.stroke();
        }
        g.fillStyle = '#b97565';
        for (const [x,y] of [[-13,-13],[-8,-15],[10,-22],[15,-19],[20,-10]]) { ellipse(g, x, y, 2.2, 2.5); g.fill(); }
      });
      sp.gardenLamp = sprite(38, 62, 19, 54, ss, (g) => {
        g.fillStyle = 'rgba(47,53,46,0.22)'; ellipse(g, 0, 1, 16, 4); g.fill();
        g.strokeStyle = '#756649'; g.lineWidth = 2;
        ellipse(g, 0, -39, 6, 7); g.stroke();
        g.fillStyle = '#5d5b48'; MC.roundRect(g, -11, -36, 22, 5, 2); g.fill();
        const light = g.createLinearGradient(0, -32, 0, -10);
        light.addColorStop(0, '#ffecc2'); light.addColorStop(1, '#e8af68');
        g.fillStyle = light; MC.roundRect(g, -8, -31, 16, 22, 2); g.fill();
        g.strokeStyle = '#786147'; g.lineWidth = 2; g.stroke();
        g.beginPath(); g.moveTo(0, -30); g.lineTo(0, -10); g.stroke();
        g.fillStyle = '#615a46'; MC.roundRect(g, -11, -10, 22, 7, 2); g.fill();
        g.strokeStyle = '#ebeade'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(-9, -37); g.lineTo(9, -37); g.stroke();
      });
      // 작은 전나무: 비대칭으로 처진 초록 가지와 층층이 포근하게 얹힌 눈.
      // 집보다 낮고 폭도 좁게 두어 창과 처마의 따뜻한 불빛이 먼저 보인다.
      sp.lodgeFir = sprite(164, 184, 82, 170, ss, (g) => {
        g.fillStyle = 'rgba(37,57,51,0.2)';
        ellipse(g, 2, 1, 48, 9);
        g.fill();
        g.fillStyle = '#dce5df';
        ellipse(g, -1, -1, 25, 6);
        g.fill();
        g.fillStyle = '#80664c';
        g.strokeStyle = '#4e4c3b';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-6, 0); g.lineTo(-5, -55); g.lineTo(3, -66);
        g.lineTo(6, 0); g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = '#b79971'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(-2, -4); g.lineTo(-1, -34); g.stroke();

        const boughs = [
          { x: 1, y: -102, w: 58, h: 78, color: '#3c6052' },
          { x: -2, y: -127, w: 47, h: 69, color: '#466a59' },
          { x: 2, y: -148, w: 33, h: 61, color: '#4d715e' },
          { x: -1, y: -162, w: 19, h: 47, color: '#587b65' },
        ];
        g.lineJoin = 'round';
        g.lineCap = 'round';
        for (const { x, y, w, h, color } of boughs) {
          g.fillStyle = color;
          g.strokeStyle = '#2e493d'; g.lineWidth = 2;
          g.beginPath();
          g.moveTo(x, y);
          g.quadraticCurveTo(x + 6, y + h * 0.28, x + w * 0.48, y + h * 0.54);
          g.quadraticCurveTo(x + w * 0.68, y + h * 0.74, x + w, y + h * 0.78);
          g.quadraticCurveTo(x + w * 0.8, y + h * 0.88, x + w * 0.46, y + h * 0.84);
          g.quadraticCurveTo(x + w * 0.5, y + h * 0.96, x + w * 0.62, y + h);
          g.quadraticCurveTo(x + 8, y + h * 0.93, x - 4, y + h * 0.99);
          g.quadraticCurveTo(x - w * 0.35, y + h * 1.04, x - w * 0.54, y + h * 0.97);
          g.lineTo(x - w * 0.44, y + h * 0.85);
          g.quadraticCurveTo(x - w * 0.85, y + h * 0.94, x - w, y + h * 0.83);
          g.quadraticCurveTo(x - w * 0.55, y + h * 0.52, x - w * 0.35, y + h * 0.4);
          g.quadraticCurveTo(x - 4, y + h * 0.15, x, y);
          g.closePath(); g.fill(); g.stroke();

          // 녹색 끝가지를 남겨 눈이 나무 전체를 하얗게 덮지 않게 한다.
          g.strokeStyle = 'rgba(136,165,131,0.5)'; g.lineWidth = 1.4;
          for (const side of [-1, 1]) {
            for (let i = 0; i < 3; i++) {
              const bx = x + side * w * (0.16 + i * 0.16), by = y + h * (0.72 + i * 0.035);
              g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + side * 6, by + 5); g.stroke();
            }
          }
          const snow = g.createLinearGradient(0, y, 0, y + h * 0.7);
          snow.addColorStop(0, '#f0f1e9'); snow.addColorStop(1, '#cbdcd7');
          g.fillStyle = snow; g.strokeStyle = '#b7cbc7'; g.lineWidth = 1;
          g.beginPath(); g.moveTo(x, y + 3);
          g.quadraticCurveTo(x + 5, y + h * 0.22, x + w * 0.43, y + h * 0.46);
          g.quadraticCurveTo(x + w * 0.58, y + h * 0.56, x + w * 0.73, y + h * 0.61);
          g.quadraticCurveTo(x + w * 0.45, y + h * 0.72, x + w * 0.17, y + h * 0.59);
          g.quadraticCurveTo(x + w * 0.03, y + h * 0.68, x - w * 0.05, y + h * 0.58);
          g.quadraticCurveTo(x - w * 0.38, y + h * 0.69, x - w * 0.67, y + h * 0.62);
          g.quadraticCurveTo(x - w * 0.49, y + h * 0.46, x - w * 0.3, y + h * 0.32);
          g.quadraticCurveTo(x - 3, y + h * 0.1, x, y + 3);
          g.closePath(); g.fill(); g.stroke();
        }
      });
      // 숙소 둘레의 나무에 얹힌 눈 (나무 그림과 같은 크기·기준점으로 위에 겹친다)
      const snowy = (base, draw) => base.map((b, v) => sprite(b.w, b.h, b.ax, b.ay, ss, (g) => {
        g.fillStyle = '#f2f5fb';
        g.strokeStyle = 'rgba(130,145,175,0.75)';
        g.lineWidth = 1.2;
        draw(g, v);
      }));
      sp.snow = {
        cypress: snowy(sp.cypress, (g, v) => {
          const h = 128 + v * 22;
          const w = 46 + v * 6;
          g.beginPath();
          g.moveTo(0, -h - 1);
          g.quadraticCurveTo(w * 0.14, -h + 12, w * 0.2, -h + 22);
          g.quadraticCurveTo(0, -h + 16, -w * 0.2, -h + 22);
          g.quadraticCurveTo(-w * 0.14, -h + 12, 0, -h - 1);
          g.fill();
          g.stroke();
          g.strokeStyle = '#f2f5fb';
          g.lineWidth = 3.6;
          for (let i = 2; i < 5; i++) {
            const y = -h + (i / 5) * (h - 12);
            const half = (w / 2) * Math.pow(i / 5, 0.7) * 0.8;
            g.beginPath();
            g.moveTo(-half, y + 1);
            g.quadraticCurveTo(0, y + 7, half, y + 1);
            g.stroke();
          }
        }),
        round: snowy(sp.round, (g) => {
          for (const [x, y, r] of [[0, -82, 27], [-18, -60, 24], [16, -62, 25]]) {
            ellipse(g, x, y - r * 0.64, r * 0.8, r * 0.36);
            g.fill();
            g.stroke();
          }
        }),
        bush: snowy(sp.bush, (g) => {
          for (const [x, y, r] of [[0, -22, 14], [-12, -12, 13], [10, -13, 14]]) {
            ellipse(g, x, y - r * 0.6, r * 0.78, r * 0.36);
            g.fill();
            g.stroke();
          }
        }),
      };
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
      if (this.sea.boating) return this.sea.navigable(x, y);
      const sx = shoreX(y);
      return x < sx - 22 || this.sea.onDeck(x, y, 5);
    }

    // ── 조작 ─────────────────────────────────────────────
    pavilionSeatAt(x, y) {
      return PAVILION_SEATS.find(q => Math.abs(x - q.x) < 29 && Math.abs(y - q.y) < 19)?.id || 0;
    }

    freePavilionSeat(want) {
      const taken = new Set();
      for (const v of this.visitors.values()) if (!v.leaving && v.st.q) taken.add(v.st.l);
      return [...PAVILION_SEATS].sort((a, b) => Math.abs(a.id - want) - Math.abs(b.id - want)).find(q => !taken.has(q.id))?.id || 0;
    }

    sitPavilion(want) {
      if (this.sea.boating || this.sea.fishing) { this.sea.note('낚싯대나 노를 내려놓은 뒤 정자에서 쉬어요.'); return; }
      const seat = this.freePavilionSeat(want);
      if (!seat) { this.sea.note('방석이 모두 차 있어요. 잠시만 기다려 주세요.'); return; }
      if (seat === this.pavilionSeat) return;
      this.pup.wake();
      this.pup.setChair(false);
      this.pavilionPending = seat;
      if (this.pavilionSeat || this.pavilionMove) this.leavePavilion(null, seat);
      else this.walkTo(PAVILION_ENTRY);
      this.sea.note('잠시 쉬어 가요.');
    }

    walkTo(point) {
      const tgt = { ...point };
      this.collide(tgt, 1.3);
      this.route = this.sea.walkRoute(tgt);
      this.target = this.route.shift();
      this.lastDist = Infinity;
      this.stuck = 0;
    }

    leavePavilion(goal = null, nextSeat = 0) {
      this.pavilionPending = 0;
      this.pavilionSeat = 0;
      this.target = null;
      this.route = [];
      this.pup.wake();
      this.pavilionMove = { phase: 'out', from: { x: this.pup.x, y: this.pup.y }, to: PAVILION_ENTRY, t: 0, goal, nextSeat };
    }

    updatePavilion(dt) {
      // 동시에 같은 방석을 눌렀을 때도 같은 순서로 자리를 나눈다.
      const selfId = MC.app?.net?.id;
      if (this.pavilionSeat && selfId && [...this.visitors.values()].some(v => !v.leaving && v.st.q && v.st.l === this.pavilionSeat && v.id < selfId)) {
        const seat = this.freePavilionSeat(this.pavilionSeat);
        this.leavePavilion(null, seat);
        if (!seat) this.sea.note('방석이 모두 차 있어요.');
      }
      if (this.pavilionPending && !this.pavilionMove && Math.hypot(this.pup.x - PAVILION_ENTRY.x, this.pup.y - PAVILION_ENTRY.y) < 12 && this.pup.chair < .25) {
        const seat = this.freePavilionSeat(this.pavilionPending);
        this.pavilionPending = 0;
        this.target = null;
        this.route = [];
        if (seat) {
          this.pavilionSeat = seat;
          this.pavilionMove = { phase: 'in', from: { x: this.pup.x, y: this.pup.y }, to: PAVILION_SEATS[seat - 1], t: 0 };
        } else this.sea.note('방석이 모두 차 있어요.');
      }
      const move = this.pavilionMove;
      if (!move) return;
      move.t += dt;
      const u = MC.clamp(move.t / 1.1, 0, 1), e = u * u * (3 - 2 * u);
      this.pup.x = MC.lerp(move.from.x, move.to.x, e);
      this.pup.y = MC.lerp(move.from.y, move.to.y, e) - Math.sin(Math.PI * u) * 5;
      this.pup.view = this.pup.restView = move.phase === 'in' && u < .85 ? 'back' : 'front';
      this.pup.baseTurn = 0;
      if (u < 1) return;
      this.pavilionMove = null;
      if (move.phase === 'out') {
        this.pavilionPending = move.nextSeat || 0;
        if (this.pavilionPending) this.walkTo(PAVILION_ENTRY);
        else if (move.goal) this.walkTo(move.goal);
      }
    }

    setKeys(x, y) {
      this.keys.x = x;
      this.keys.y = y;
      if (x || y) {
        if (this.pavilionSeat || (this.pavilionMove && this.pavilionMove.phase === 'in')) this.leavePavilion();
        this.pavilionPending = 0;
        if (this.pavilionMove) { this.pavilionMove.goal = null; this.pavilionMove.nextSeat = 0; }
        this.target = null;
        this.route = [];
        this.camFree = false;
      }
    }

    tap(sx, sy) {
      // 톡 하면 카메라는 다시 내 멍이를 따라간다
      this.camFree = false;
      const p = this.toWorld(sx, sy);
      const seat = this.pavilionSeatAt(p.x, p.y);
      if (seat && ![...this.visitors.values()].some(v => !v.leaving && v.st.q && v.st.l === seat)) {
        this.sitPavilion(seat);
        return 'seat';
      }
      // 다른 사람의 멍이를 톡 하면 하트를 보낸다. 겹쳐 있으면 앞에 있는 멍이가 먼저
      let hit = null;
      for (const v of this.visitors.values()) {
        if (!v.leaving && v.fade > 0.3 && v.pup.hit(p.x, p.y) && (!hit || v.pup.y > hit.pup.y)) hit = v;
      }
      if (this.pup.hit(p.x, p.y) && (!hit || hit.pup.y <= this.pup.y)) {
        this.pup.wake();
        return 'pup';
      }
      if (hit) {
        hit.pup.addHearts(2);
        hit.pup.hopV = -40;
        if (this.onBoop) this.onBoop(hit.id);
        if (this.onCute) this.onCute('boop');
        return 'boop';
      }
      if (seat) { this.sitPavilion(seat); return 'seat'; }
      const mk = this.moktakPos();
      if (this.near && this.near.id === 'moktak' && Math.hypot(p.x - mk.x, p.y - (mk.y - 10)) < 30) {
        this.hitMoktak();
        return 'moktak';
      }
      if (this.pavilionSeat || this.pavilionMove) {
        if (this.pavilionMove?.phase === 'out') { this.pavilionMove.goal = p; this.pavilionMove.nextSeat = 0; }
        else this.leavePavilion(p);
        return 'walk';
      }
      this.pavilionPending = 0;
      const water = this.sea.poke(p.x, p.y);
      if (water && !this.sea.boating) return 'sea';
      this.walkTo(p);
      return 'walk';
    }

    // 의자: 펴고 앉아 책 읽기 ↔ 접고 일어서기. 걷기 시작하면 저절로 접는다
    toggleChair() {
      if (this.pavilionSeat || this.pavilionMove || this.pavilionPending) { this.sea.note('정자에서는 방석에 편하게 앉아 쉬어요.'); return false; }
      if (this.sea.boating || this.sea.fishing) { this.sea.note('낚싯대나 노를 내려놓은 뒤 의자를 펼 수 있어요.'); return false; }
      const on = !this.pup.chairOn;
      this.pup.setChair(on);
      if (on) {
        this.target = null;
        this.pup.view = this.pup.restView = 'front';
        this.pup.baseTurn = 0;
      }
      return on;
    }

    moktakPos() {
      return pavilionPoint(62, -6);
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
      this.sea.boating = false;
      this.sea.stopFishing(true);
      this.route = [];
      this.pavilionSeat = this.pavilionPending = 0;
      this.pavilionMove = null;
      this.pup.x = s.x;
      this.pup.y = s.y + 24;
      this.pup.view = 'front';
      this.pup.restView = 'front';
      this.pup.baseTurn = 0;
      this.target = null;
      this.camFree = false;
      this.cam.x = this.pup.x;
      this.cam.y = id === 'moktak' ? PAVILION.y - 70 : this.pup.y - 40;
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
        w: this.moving || this.pavilionMove ? 1 : 0,
        b: p.restView === 'back' ? 1 : 0,
        t: Math.round(p.baseTurn * 100) / 100,
        f: 1,
        z: p.sleeping ? 1 : 0,
        hp: p.heartBursts || 0,
        ep: p.emoteBursts || 0,
        ek: p.emoteKind || 0,
        q: this.pavilionSeat ? 1 : 0,
        l: this.pavilionSeat,
        ch: p.chairOn ? 1 : 0,
        sg: this.sign,
        bt: this.sea.boating ? 1 : 0,
        ba: Math.round(this.sea.angle * 180 / Math.PI),
        fs: this.sea.fishing ? this.sea.fishing.stage : 0,
      };
    }

    // 소리 섞기: 가까울수록 1
    presence() {
      const p = this.pup;
      const near = (d, r0, r1) => Math.pow(MC.clamp(1 - (d - r0) / (r1 - r0), 0, 1), 1.5);
      return {
        fire: Math.max(near(Math.hypot(p.x - FIRE.x, p.y - FIRE.y), 60, 760), near(Math.hypot(p.x - TOWER.x, p.y - TOWER.y), 60, 620)),
        water: near(Math.max(0, shoreX(p.y) - p.x), 40, 820),
        forest: near(Math.hypot(p.x - 500, p.y - 420), 120, 900),
        pavilion: near(Math.hypot(p.x - PAVILION.x, p.y - PAVILION.y), 60, 520),
        glamp: near(Math.hypot(p.x - BRAZIER.x, p.y - BRAZIER.y), 50, 520),
        lodge: near(Math.hypot(p.x - LODGE.x, p.y - LODGE.y), 60, 520),
      };
    }

    // ── 움직임 ───────────────────────────────────────────
    update(dt) {
      this.t += dt;
      for (let i = 0; i < this.snow.length; i++) {
        const f = this.snow[i];
        f.h -= f.fall * dt;
        f.x += 5 * dt;
        if (f.h <= 0) this.snow[i] = this.newFlake(false);
      }
      this.updateBreath(dt);
      const pup = this.pup;
      this.updatePavilion(dt);
      const onPavilion = !!(this.pavilionSeat || this.pavilionMove);
      let vx = 0;
      let vy = 0;
      const speed = this.sea.boating ? 245 : 170;
      // 의자에 앉아 있다가 걸으려 하면: 먼저 의자를 접고 내려온다
      const wants = !!(this.keys.x || this.keys.y || this.target);
      if (wants && pup.chairOn) pup.setChair(false);
      if (onPavilion || pup.chair > 0.25) {
        // 접는 동안은 그 자리에
      } else if (this.keys.x || this.keys.y) {
        const l = Math.hypot(this.keys.x, this.keys.y);
        vx = (this.keys.x / l) * speed;
        vy = (this.keys.y / l) * speed;
      } else if (this.target) {
        const dx = this.target.x - pup.x;
        const dy = this.target.y - pup.y;
        const d = Math.hypot(dx, dy);
        if (d < 6) this.target = this.route.shift() || null;
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
            this.route = [];
            this.stuck = 0;
            vx = 0;
            vy = 0;
          }
        }
      }
      this.moving = Math.hypot(vx, vy) > 5;
      this.seaDX = vx; this.seaDY = vy;
      this.sea.update(dt, this.moving);
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
      pup.light.glowA = Math.max(0.45 * fireNear, onPavilion ? .24 : 0);
      pup.light.from = pup.x < FIRE.x ? 70 : -70;
      pup.k = 0.68;
      pup.update(dt, { walking: (this.moving || !!this.pavilionMove) && !this.sea.boating, noSleep: this.sea.boating || !!this.sea.fishing, E: 0.8 });
      for (const v of this.visitors.values()) {
        // 지도에서는 올라가는 좌표를 그대로 나눈다. l은 방석 번호이며 눕기 값이 아니다.
        v.jumpFrom = null;
        v.update(dt, { E: 0.8, walkEps: v.st.bt ? 1000 : 2, jump: 700, lieOf: () => false });
        const p = v.pup;
        p.x = v.x;
        p.y = v.y;
        p.k = 0.68;
        if (v.st.q) v.pavilionOn = true;
        else if (p.y > PAVILION.y + 40 || Math.abs(p.x - PAVILION.x) > 140) v.pavilionOn = false;
        const d = Math.hypot(p.x - FIRE.x, p.y - FIRE.y);
        p.light.glowA = Math.max(0.45 * Math.pow(MC.clamp(1 - (d - 60) / 700, 0, 1), 1.5), v.pavilionOn ? .24 : 0);
        p.light.from = p.x < FIRE.x ? 70 : -70;
      }
      MC.dropFaded(this.visitors);

      // 카메라는 멍이를 부드럽게 따라간다 (손가락으로 끌어 둘러보는 동안에는 그 자리에 둔다)
      if (!this.camFree) {
        const focus = onPavilion || this.pavilionPending ? 1 : MC.clamp((230 - Math.hypot(pup.x - PAVILION.x, pup.y - (PAVILION.y + 40))) / 75, 0, 1);
        this.cam.x += (MC.lerp(pup.x + vx * .25, PAVILION.x, focus) - this.cam.x) * Math.min(1, dt * 3.2);
        this.cam.y += (MC.lerp(pup.y - 40 + vy * .25, PAVILION.y - 70, focus) - this.cam.y) * Math.min(1, dt * 3.2);
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
      this.near = this.sea.boating ? null : best;

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
      if (Math.random() < dt * 1.4) this.sparks.push({ x: BRAZIER.x + MC.gauss() * 5, y: BRAZIER.y - 34, vx: MC.gauss() * 10, vy: -MC.rand(30, 70), f: 0, max: MC.rand(0.6, 1.2) });
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
        const x = shoreX(y) + 40 + MC.hash(i * 7.7) * (W - shoreX(y) - 80);
        const b = Math.sin(t * (1 + MC.hash(i) * 1.5) + i);
        if (b < 0.4) continue;
        g.fillStyle = `rgba(255,248,220,${(b - 0.4) * 0.9})`;
        g.fillRect(x - 6, y, 12, 1.6);
      }
      // 선착장
      this.sea.drawLife(g, vx0, top, vx0 + w / z, bottom);
      this.sea.drawHarbor(g);

      // 앞뒤 순서대로 세우기 (아래에 있을수록 앞)
      const items = [];
      const left = vx0 - 120;
      const right = vx0 + w / z + 120;
      for (const tr of this.trees) {
        if (tr.y < top || tr.y > bottom + 160 || tr.x < left || tr.x > right) continue;
        const cold = coldAt(tr.x, tr.y);
        items.push({ y: tr.y, d: () => {
          const s = sp[tr.kind][tr.v];
          const sway = Math.sin(t * 0.7 + tr.sway) * (tr.kind === 'bush' ? 0 : 0.8);
          g.drawImage(s.c, tr.x - s.ax + sway, tr.y - s.ay, s.w, s.h);
          if (cold) {
            const sn = sp.snow[tr.kind][tr.v];
            g.globalAlpha = cold;
            g.drawImage(sn.c, tr.x - sn.ax + sway, tr.y - sn.ay, sn.w, sn.h);
            g.globalAlpha = 1;
          }
        } });
      }
      for (const ln of this.lanterns) {
        if (ln.y < top || ln.y > bottom + 80 || ln.x < left || ln.x > right) continue;
        const i = LANTERN_COLORS.indexOf(ln.c);
        items.push({ y: ln.y, d: () => { const s = ln.lodge ? sp.gardenLamp : sp.lantern[i]; g.drawImage(s.c, ln.x - s.ax, ln.y - s.ay, s.w, s.h); } });
      }
      const put = (s, x, y) => items.push({ y, d: () => g.drawImage(s.c, x - s.ax, y - s.ay, s.w, s.h) });
      for (let i = 1; i < LODGE_BORDER.length; i++) {
        const a = LODGE_BORDER[i - 1];
        const b = LODGE_BORDER[i];
        if (b[1] < top || b[1] > bottom + 50 || b[0] < left || b[0] > right) continue;
        items.push({ y: (a[1] + b[1]) / 2, d: () => this.drawFence(g, a, b, i % 4 === 0 || i === 1) });
      }
      TENTS.forEach((tn, i) => {
        const tsp = sp.tent[i];
        items.push({ y: tn.y, d: () => g.drawImage(tsp.c, tn.x - tsp.ax * tn.s, tn.y - tsp.ay * tn.s, tsp.w * tn.s, tsp.h * tn.s) });
      });
      for (const [x, y] of POSTS) put(sp.post, x, y);
      put(sp.brazier, BRAZIER.x, BRAZIER.y);
      put(sp.pit, FIRE.x, FIRE.y);
      put(sp.tower, TOWER.x, TOWER.y);
      put(sp.pavilion, PAVILION.x, PAVILION.y);
      put(sp.stump, STUMP.x, STUMP.y);
      put(sp.lodge, LODGE.x, LODGE.y);
      put(sp.lodgeFir, LODGE_FIR.x, LODGE_FIR.y);
      put(sp.lodgeWood, LODGE_GARDEN.wood.x, LODGE_GARDEN.wood.y);
      put(sp.lodgeBench, LODGE_GARDEN.bench.x, LODGE_GARDEN.bench.y);
      for (const p of LODGE_GARDEN.shrubs) put(sp.lodgeShrub, p.x, p.y);
      for (const p of LODGE_GARDEN.lamps) put(sp.gardenLamp, p.x, p.y);
      // 숙소 굴뚝의 연기: 천천히 오르며 바람에 밀려 흩어진다
      items.push({ y: LODGE.y + 0.5, d: () => this.drawSmoke(g) });
      items.push({ y: PAVILION.y + 0.5, d: () => this.drawMoktak(g) });
      items.push({ y: PAVILION.y + 0.6, d: () => this.drawChime(g) });
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
        near.sort((a, b) => (+!!a.st.npc - +!!b.st.npc) || Math.hypot(a.pup.x - me.x, a.pup.y - me.y) - Math.hypot(b.pup.x - me.x, b.pup.y - me.y));
        near = near.slice(0, maxV);
      }
      for (const v of near) {
        const p = v.pup;
        items.push({ y: v.pavilionOn ? PAVILION.y + 1 : p.y, d: () => {
          const a = MC.clamp(v.fade, 0, 1);
          if (a < 1) g.globalAlpha = a;
          this.sea.drawPup(g, p, v.st);
          if (!v.st.bt) this.drawSign(g, p, v.st.sg);
          g.globalAlpha = 1;
        } });
      }
      items.push({ y: this.pavilionSeat || this.pavilionMove ? PAVILION.y + 1 : this.pup.y, d: () => {
        if (this.visitors.size) MC.drawYouMark(g, this.pup, t);
        this.sea.drawPup(g, this.pup, this.netState());
        if (!this.sea.boating) this.drawSign(g, this.pup, this.sign);
      } });
      items.sort((a, b) => a.y - b.y);
      for (const it of items) it.d();
      if (this.near?.id === 'moktak' && !this.pavilionSeat && !this.pavilionPending && !this.pavilionMove) {
        g.font = '16px Jua, sans-serif'; g.textAlign = 'center';
        g.fillStyle = 'rgba(248,235,200,.86)';
        g.fillText('방석을 눌러 쉬기', PAVILION.x - 68, PAVILION.y + 82);
      }
      this.sea.drawGulls(g, left, top, right, bottom);
      // 줄전구 줄
      g.strokeStyle = 'rgba(40,30,24,0.75)';
      g.lineWidth = 1.3;
      for (const pts of this.wires) {
        g.beginPath();
        pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.stroke();
      }
      // 숙소 둘레에 하늘하늘 내리는 눈과 하얀 입김
      if (COLD.y + COLD.ry > top && COLD.y - COLD.ry - 240 < bottom) {
        g.fillStyle = '#ffffff';
        for (const f of this.snow) {
          const y = f.y0 - f.h;
          const x = f.x + Math.sin(t * 1.1 + f.ph) * 10;
          g.globalAlpha = Math.min(1, f.h / 40, (220 - f.h) / 30 + 0.2) * coldAt(f.x, f.y0) * 0.8;
          ellipse(g, x, y, f.r, f.r);
          g.fill();
        }
        g.globalAlpha = 1;
        this.drawBreath(g);
      }
      if (this.hiddenBehind()) {
        g.globalAlpha = 0.45;
        this.pup.draw(g, z * (this.dpr || 1), true);
        g.globalAlpha = 1;
      }

      // 해 질 녘의 푸른 어스름
      g.restore();
      g.fillStyle = 'rgba(22,28,72,0.3)';
      g.fillRect(0, 0, w, h);
      // 숙소 둘레는 조금 더 차갑게: 푸르스름한 냉기
      {
        const c = this.toScreen(COLD.x, COLD.y);
        const R = COLD.rx * 1.25 * z;
        if (c.x + R > 0 && c.x - R < w && c.y + R > 0 && c.y - R < h) {
          g.save();
          g.translate(c.x, c.y);
          g.scale(1, COLD.ry / COLD.rx);
          const cg = g.createRadialGradient(0, 0, R * 0.2, 0, 0, R);
          cg.addColorStop(0, 'rgba(176,202,235,0.09)');
          cg.addColorStop(0.5, 'rgba(176,202,235,0.035)');
          cg.addColorStop(1, 'rgba(176,202,255,0)');
          g.fillStyle = cg;
          g.fillRect(-R, -R, R * 2, R * 2);
          g.restore();
        }
      }

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
      glow([255, 152, 65], TOWER.x, TOWER.y - 46, 215 * fl, 0.38);
      for (const tn of TENTS) glow([255, 200, 120], tn.x, tn.y - 24 * tn.s, 70 * tn.s, 0.55);
      const pavilionGlow = (rgb, x, y, r, a) => { const p = pavilionPoint(x, y); glow(rgb, p.x, p.y, r * PAVILION_SCALE, a); };
      pavilionGlow([255, 214, 150], 0, -70, 110, 0.35);
      for (const dx of [-58, 58]) {
        pavilionGlow([255, 205, 130], dx, -108, 38, 0.3);
        pavilionGlow([255, 238, 190], dx, -108, 9, 0.48);
      }
      pavilionGlow([255, 212, 143], 0, -37, 79, 0.13);
      // 숙소의 불 켜진 창과 문, 처마 등
      if (LODGE.y + 160 > top && LODGE.y - 250 < bottom) {
        const lf = 0.92 + 0.08 * MC.fbm(t * 0.9 + 3);
        glow([255, 196, 118], LODGE.x - 66, LODGE.y - 80, 58 * lf, 0.42);
        glow([255, 196, 118], LODGE.x + 61, LODGE.y - 80, 58 * lf, 0.42);
        glow([255, 206, 130], LODGE.x, LODGE.y - 60, 70 * lf, 0.34);
        glow([255, 209, 141], LODGE.x, LODGE.y - 165, 30, 0.32);
        glow([255, 187, 104], LODGE.x + 44, LODGE.y - 92, 28, 0.45);
        glow([255, 204, 142], LODGE.x, LODGE.y + 25, 130, 0.2);
        for (const bulb of LODGE_EAVES) {
          glow([255, 208, 139], LODGE.x + bulb.x, LODGE.y + bulb.y + 5, 11, 0.48);
          glow([255, 245, 210], LODGE.x + bulb.x, LODGE.y + bulb.y + 5, 3, 0.6);
        }
        for (const p of LODGE_GARDEN.lamps) {
          glow([255, 207, 138], p.x, p.y - 21, 45, 0.35);
          glow([255, 239, 191], p.x, p.y - 21, 8, 0.4);
          glow([255, 208, 146], p.x, p.y + 1, 50, 0.12);
        }
      }
      // 글램핑장 화로
      const bf = 0.8 + 0.2 * MC.fbm(t * 3.7 + 5);
      glow([255, 150, 70], BRAZIER.x, BRAZIER.y - 30, 150 * bf, 0.36);
      for (let i = 0; i < 3; i++) {
        const hh = (18 + 9 * MC.fbm(t * (2.4 + i * 0.5) + i * 4)) * bf;
        g.globalAlpha = 0.55;
        g.drawImage(this.glow([255, 170 - i * 25, 70]), BRAZIER.x - 12 + i * 6 - 7, BRAZIER.y - 26 - hh, 18, hh + 6);
      }
      for (const b of this.bulbs) {
        if (b.y < top || b.y > bottom) continue;
        const a = 0.75 + 0.15 * Math.sin(t * 0.9 + b.ph);
        glow(b.c, b.x, b.y, 22, a * 0.7);
        glow([255, 246, 220], b.x, b.y, 5, a);
      }
      const lx0 = vx0 - 80;
      const lx1 = vx0 + w / z + 80;
      for (const ln of this.lanterns) {
        if (ln.y < top || ln.y > bottom + 80 || ln.x < lx0 || ln.x > lx1) continue;
        const a = 0.5 + 0.12 * Math.sin(t * 1.3 + ln.ph);
        const x = ln.x + (ln.lodge ? 0 : 9);
        const y = ln.y - (ln.lodge ? 21 : 34);
        glow(ln.c, x, y, ln.lodge ? 45 : 56, ln.lodge ? a * 0.8 : a);
        glow(MC.mix(ln.c, [255, 255, 255], 0.35), x, y, ln.lodge ? 8 : 14, 0.4);
      }
      for (const f of this.flies) {
        const fx = f.x + MC.fbm(t * 0.21 * f.sp + f.ph) * 40;
        const fy = f.y + MC.fbm(t * 0.17 * f.sp + f.ph * 1.3) * 30;
        if (fy < top || fy > bottom) continue;
        const b = Math.max(0, Math.sin(t * f.sp * 1.6 + f.ph));
        if (b < 0.05) continue;
        glow([210, 255, 140], fx, fy, 10, b * 0.9 * (1 - coldAt(fx, fy)) ** 2);
      }
      g.globalAlpha = 1;
      this.drawFire(g, fl);
      this.drawFire(g, fl, TOWER, true);
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

    // 길 양옆의 낮은 울타리도 숙소로 가까이 갈수록 눈이 차츰 쌓인다.
    drawFence(g, a, b, post) {
      g.save();
      g.lineCap = 'round';
      for (const h of [12, 28]) {
        g.strokeStyle = '#554c3c';
        g.lineWidth = 6;
        g.beginPath(); g.moveTo(a[0], a[1] - h); g.lineTo(b[0], b[1] - h); g.stroke();
        g.strokeStyle = '#a08d6c';
        g.lineWidth = 3;
        g.stroke();
        g.strokeStyle = `rgba(237,240,244,${coldAt(b[0], b[1]) * 0.85})`;
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(a[0], a[1] - h - 2); g.lineTo(b[0], b[1] - h - 2); g.stroke();
      }
      if (post) {
        g.strokeStyle = '#66543e'; g.lineWidth = 8;
        g.beginPath(); g.moveTo(b[0], b[1] + 2); g.lineTo(b[0], b[1] - 36); g.stroke();
        g.strokeStyle = '#b09b76'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(b[0] - 1, b[1] - 2); g.lineTo(b[0] - 1, b[1] - 34); g.stroke();
      }
      g.restore();
    }

    // 마을에서만 멍이 곁에 세우는 작은 나무 팻말. 걷는 동안에도 함께 따라간다.
    drawSign(g, p, text) {
      text = MC.cleanSign(text);
      if (!text) return;
      const k = p.k;
      const side = this.toScreen(p.x, p.y).x > this.w - 130 ? -1 : 1;
      g.save();
      g.translate(p.x + side * 108 * k, p.y + 7 * k);
      g.scale(k, k);
      g.fillStyle = 'rgba(20,27,23,0.2)';
      ellipse(g, 0, 0, 40, 6); g.fill();
      g.fillStyle = '#896442';
      MC.roundRect(g, -4, -40, 8, 42, 2); g.fill();
      g.fillStyle = '#eed7ad'; g.strokeStyle = '#70583e'; g.lineWidth = 2.5;
      MC.roundRect(g, -57, -71, 114, 42, 6); g.fill(); g.stroke();
      g.fillStyle = '#513e2e';
      g.font = '700 38px "Dongle", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      const metrics = g.measureText(text);
      const baseline = -50 + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
      g.fillText(text, 0, baseline, 99);
      g.restore();
    }

    // 숙소 둘레의 추운 곳에서는 멍이들 입에서 하얀 입김이 폴폴
    updateBreath(dt) {
      const pups = [this.pup];
      for (const v of this.visitors.values()) if (!v.leaving) pups.push(v.pup);
      for (const p of pups) {
        const chill = coldAt(p.x, p.y);
        if (chill < 0.06) continue;
        p.breathT = (p.breathT == null ? Math.random() * 2 : p.breathT) - dt;
        if (p.breathT > 0) continue;
        p.breathT = MC.rand(1.8, 3) / (0.4 + 0.6 * chill);
        if (p.restView === 'back' || p.view === 'back') continue;
        const side = p.flip * (Math.abs(p.baseTurn) > 0.4 ? Math.sign(p.baseTurn) : 0);
        this.breaths.push({ cold: chill, x: p.x + (side * 34 + p.baseTurn * 8) * p.k, y: p.y - (58 + (p.seatLift || 0)) * p.k, t: 0, k: p.k, dir: side || (Math.random() < 0.5 ? -1 : 1) * 0.3 });
      }
      for (const b of this.breaths) b.t += dt;
      this.breaths = this.breaths.filter((b) => b.t < 1.4);
    }

    drawBreath(g) {
      if (!this.breaths.length) return;
      const puff = this.glow([240, 244, 252]);
      for (const b of this.breaths) {
        const u = b.t / 1.4;
        const r = (6 + 16 * u) * b.k;
        g.globalAlpha = b.cold * 0.55 * Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - u);
        g.drawImage(puff, b.x + b.dir * 18 * u * b.k - r, b.y - 14 * u * b.k - r * 0.7, r * 2, r * 1.4);
      }
      g.globalAlpha = 1;
    }

    // 굴뚝 연기: 여섯 덩이가 차례로 올라가며 커지고 옅어진다
    drawSmoke(g) {
      const t = this.t;
      const x0 = LODGE.x + 63;
      const y0 = LODGE.y - 232;
      const puff = this.glow([226, 226, 236]);
      for (let i = 0; i < 6; i++) {
        const u = (t * 0.12 + i / 6) % 1;
        const r = 10 + u * 34;
        g.globalAlpha = 0.34 * Math.sin(Math.PI * Math.min(1, u * 1.4)) * (1 - u);
        g.drawImage(puff, x0 + u * u * 70 + Math.sin(t * 0.7 + i) * 6 - r, y0 - u * 110 - r * 0.8, r * 2, r * 1.6);
      }
      g.globalAlpha = 1;
    }

    // 멍이 앞(아래쪽)에 선 나무·텐트·정자가 멍이를 덮고 있는지
    hiddenBehind() {
      if (this.pavilionSeat || this.pavilionMove) return false;
      const p = this.pup;
      const hx = p.x;
      const hy = p.y - 45;
      const covers = (s, x, y, inset) => hx > x - s.ax + inset && hx < x - s.ax + s.w - inset && hy > y - s.ay + inset && hy < y - 8;
      for (const tr of this.trees) {
        if (tr.y <= p.y || tr.y - p.y > 180 || tr.kind === 'bush') continue;
        if (covers(this.sp[tr.kind][tr.v], tr.x, tr.y, 14)) return true;
      }
      for (let i = 0; i < TENTS.length; i++) {
        const tn = TENTS[i];
        if (tn.y > p.y && hx > tn.x - 60 * tn.s && hx < tn.x + 60 * tn.s && hy > tn.y - 118 * tn.s && hy < tn.y - 8) return true;
      }
      if (PAVILION.y > p.y && covers(this.sp.pavilion, PAVILION.x, PAVILION.y, 26)) return true;
      if (LODGE_FIR.y > p.y && covers(this.sp.lodgeFir, LODGE_FIR.x, LODGE_FIR.y, 22)) return true;
      if (LODGE.y > p.y && covers(this.sp.lodge, LODGE.x, LODGE.y, 30)) return true;
      return false;
    }

    drawFire(g, fl, fire = FIRE, tower = false) {
      const w0 = tower ? 65 : 74;
      const h0 = tower ? 195 : 112;
      const x = fire.x - w0 / 2;
      const y = fire.y + 4 - h0;
      const c = MC.FireGL && MC.FireGL.available() ? MC.FireGL.render(w0 * this.z * (this.dpr || 1) * MC.FireGL.scale, h0 * this.z * (this.dpr || 1) * MC.FireGL.scale, this.t, 0.9 * fl, 3.3, tower) : null;
      if (c) {
        g.drawImage(c, x, y, w0, h0);
      } else {
        // WebGL이 없으면 빛 덩어리를 겹쳐 작은 불을 만든다
        for (let i = 0; i < 4; i++) {
          const hh = (40 + 18 * MC.fbm(this.t * (2 + i * 0.4) + i * 3)) * fl * (tower ? 2.3 : 1);
          g.globalAlpha = 0.5;
          g.drawImage(this.glow([255, 150 - i * 20, 50]), fire.x - 14 + i * 6 - 10, fire.y - hh, 26, hh + 8);
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
      // 목탁 아래의 얇은 자주빛 받침과 둥근 손잡이.
      ellipse(g, 0, 1, 17, 4); g.fillStyle = '#634d49'; g.fill();
      ellipse(g, 0, -.5, 15, 3); g.fillStyle = '#b57c69'; g.fill();
      g.strokeStyle = '#daa381'; g.lineWidth = .7; g.stroke();
      ellipse(g, 0, -18, 6.5, 5.5); g.fillStyle = '#a57140'; g.fill();
      g.strokeStyle = '#513a23'; g.lineWidth = 1.2; g.stroke();
      ellipse(g, 0, -18, 3.2, 2.6); g.fillStyle = '#3f3e28'; g.fill();
      ellipse(g, 0, -8, 13, 10);
      const grd = g.createRadialGradient(-4, -12, 1, 0, -8, 14);
      grd.addColorStop(0, '#e0ac69');
      grd.addColorStop(.5, '#b47a43');
      grd.addColorStop(1, '#754727');
      g.fillStyle = grd;
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 1.3;
      g.stroke();
      g.save(); g.clip();
      for (let i = 0; i < 6; i++) {
        g.strokeStyle = i % 2 ? 'rgba(242,196,125,0.45)' : 'rgba(112,66,33,0.4)';
        g.lineWidth = .6;
        g.beginPath(); g.ellipse(-2, -9, 5 + i * 2, 3 + i, -.15, .3, 3.8); g.stroke();
      }
      g.restore();
      g.strokeStyle = '#4a2a14';
      g.lineWidth = 1.9;
      g.beginPath();
      g.moveTo(-8, -5);
      g.quadraticCurveTo(0, -1, 8, -5);
      g.stroke();
      for (const x of [-8, 8]) {
        ellipse(g, x, -5, 1.5, 1.5); g.fillStyle = '#49311e'; g.fill();
      }
      g.strokeStyle = '#e7b570'; g.lineWidth = .75;
      g.beginPath(); g.ellipse(-3, -11, 6.5, 3.5, -.25, 3.6, 5.5); g.stroke();
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
      g.strokeStyle = '#e2b37a'; g.lineWidth = .7;
      g.beginPath(); g.arc(-.7, -18.5, 1.7, 3.6, 5.5); g.stroke();
      g.restore();
    }

    // 처마 끝의 풍경: 바람에 살랑
    drawChime(g) {
      const { x, y } = pavilionPoint(123, -147);
      const a = Math.sin(this.chime * 1.7) * 0.18;
      g.save();
      g.translate(x, y);
      g.scale(PAVILION_SCALE, PAVILION_SCALE);
      g.rotate(a);
      g.strokeStyle = '#6a7358';
      g.lineWidth = .9;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(0, 9);
      g.stroke();
      ellipse(g, 0, 8, 1.6, 2); g.stroke();
      g.beginPath();
      g.moveTo(-6.5, 21);
      g.quadraticCurveTo(-5, 17, -4, 12);
      g.quadraticCurveTo(0, 6, 4, 12);
      g.quadraticCurveTo(5, 17, 6.5, 21);
      g.closePath();
      const bronze = g.createLinearGradient(-6, 0, 6, 0);
      bronze.addColorStop(0, '#6e8f76'); bronze.addColorStop(.35, '#b3b382'); bronze.addColorStop(1, '#516f60');
      g.fillStyle = bronze;
      g.fill();
      g.strokeStyle = '#41564a';
      g.stroke();
      ellipse(g, 0, 21, 6.5, 2); g.fillStyle = '#485647'; g.fill();
      g.strokeStyle = '#b0b080'; g.lineWidth = .8; g.stroke();
      g.beginPath(); g.moveTo(-3.5, 14); g.lineTo(3.5, 14); g.moveTo(-4.5, 18); g.lineTo(4.5, 18); g.stroke();
      ellipse(g, -1.7, 11.5, 1, 1); g.fillStyle = '#d9c98e'; g.fill();
      g.strokeStyle = '#978554'; g.lineWidth = .7;
      g.beginPath(); g.moveTo(0, 19); g.lineTo(0, 34); g.stroke();
      ellipse(g, 0, 23, 1.8, 2); g.fillStyle = '#b6a269'; g.fill();
      // 바람을 받는 물고기 장식은 종보다 한 박자 늦게 흔들린다.
      g.translate(0, 35);
      g.rotate(Math.sin(this.chime * 1.7 - .8) * .16);
      g.beginPath();
      g.moveTo(-8, 0);
      g.quadraticCurveTo(-3, -5, 5, -1);
      g.lineTo(10, -5); g.lineTo(9, 4); g.lineTo(5, 1);
      g.quadraticCurveTo(-3, 5, -8, 0);
      g.closePath();
      g.fillStyle = '#c2ae6f'; g.fill();
      g.strokeStyle = '#667654'; g.lineWidth = .8; g.stroke();
      ellipse(g, -4.5, -.5, .8, .8); g.fillStyle = '#4d5b45'; g.fill();
      g.strokeStyle = '#e0cf91'; g.lineWidth = .65;
      g.beginPath(); g.moveTo(-2, -2); g.quadraticCurveTo(2, 0, -2, 2); g.moveTo(1, -2); g.quadraticCurveTo(5, 0, 1, 2); g.stroke();
      g.restore();
    }
  }

  MC.CampMap = CampMap;
  MC.CAMP_SPOTS = SPOTS;
  MC.CAMP_PAVILION_SEATS = PAVILION_SEATS;
  MC.CAMP_PATHS = PATHS; // 첫째가 마을을 한 바퀴 도는 둘레길
  MC.CAMP_LODGE_BORDER = LODGE_BORDER;
  MC.campColdAt = coldAt;
})(window.MC = window.MC || {});
