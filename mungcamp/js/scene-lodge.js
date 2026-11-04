/* 멍캠프 — 숙소: 코타츠가 놓인 따뜻한 다다미방
   가운데 코타츠(두툼한 이불, 대나무 바구니의 귤, 찻주전자와 찻잔), 둘레에 방석 다섯 자리.
   김이 서린 큰 창 너머는 눈 내리는 겨울 저녁: 눈 덮인 마을과 빈 나무, 처마 밑 곶감이 바람에 흔들린다 (밖은 추워 보인다).
   오른쪽 석유난로 위 주전자에서는 김이 오르고, 머리 위 한지 등이 방을 동그랗게 비춘다.
   코타츠에 앉으면 이불 속에 몸이 쏙 묻히고, 귤을 까먹을 수 있다.
   '코타츠 속'으로 들어가면 잠깐 숨어 장난치는 어둑한 이불 속: 납작 엎드려 기어 다니고, 굴러다니는 귤을 툭툭 친다.
   함께 앉은 사람들의 뒷발이 이불 자락 밑으로 빼꼼 들어와 있다. */
(function (MC) {
  'use strict';

  const INK = 'rgba(58,36,24,0.9)';

  // 그림 한 장: 디자인 단위로 그리고, 바닥에 닿는 점(ax, ay)을 기준으로 놓는다
  function sprite(w, h, ax, ay, k, dpr, paint) {
    const sc = k * Math.min(dpr || 1, 2);
    const c = MC.canvas(Math.max(1, Math.ceil(w * sc)), Math.max(1, Math.ceil(h * sc)));
    const g = c.getContext('2d');
    g.scale(sc, sc);
    g.translate(ax, ay);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    paint(g);
    return { c, w: w * k, h: h * k, ax: ax * k, ay: ay * k, k };
  }
  function put(g, sp, x, y) {
    g.drawImage(sp.c, x - sp.ax, y - sp.ay, sp.w, sp.h);
  }
  function ell(g, x, y, rx, ry, rot = 0) {
    g.beginPath();
    g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2);
  }
  function ink(g, w = 2, c = INK) {
    g.lineWidth = w;
    g.strokeStyle = c;
    g.stroke();
  }
  function lin(g, x0, y0, x1, y1, stops) {
    const grd = g.createLinearGradient(x0, y0, x1, y1);
    for (const [o, c] of stops) grd.addColorStop(o, c);
    return grd;
  }

  let SPR = null;
  function sprites() {
    if (SPR) return SPR;
    SPR = {
      warm: MC.glow([255, 186, 110], 128, 0.22),
      heater: MC.glow([255, 120, 50], 128, 0.18),
      steam: MC.glow([255, 250, 242], 64, 0.4),
      mote: MC.glow([255, 214, 160], 32, 0.3),
      cold: MC.glow([196, 214, 255], 64, 0.25),
    };
    return SPR;
  }

  // 코타츠 둘레 자리 (왼쪽부터): 코타츠 가운데 기준 가로(dx), 깊이(dz, -는 뒤), 크기, 고개를 돌리는 정도.
  // 양옆 자리는 이불 자락을 무릎에 덮고 코타츠 쪽을 보고, 뒤쪽 셋은 상판 너머로 앞발을 올리고 앉는다
  const SEATS = [
    { dx: -246, dz: -8, side: -1, k: 1, turn: 0.5 },
    { dx: -112, dz: -100, k: 0.9, turn: 0.12 },
    { dx: 0, dz: -106, k: 0.88, turn: 0 },
    { dx: 112, dz: -100, k: 0.9, turn: -0.12 },
    { dx: 246, dz: -8, side: 1, k: 1, turn: -0.5 },
  ];
  // 여럿이 오면 서 있는 자리 (장면 좌표)
  const FLOOR_SPOTS = [[300, 880], [700, 900], [160, 640], [840, 650], [500, 960]].map(([X, Z]) => ({ X, Z }));
  const BOWL_MAX = 6;
  const ROLL_T = 0.95; // 한 바퀴 데굴 구르는 시간
  const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

  class LodgeScene {
    constructor(opts = {}) {
      this.preview = !!opts.preview;
      this.quality = 1;
      this.t = 0;
      this.w = 1;
      this.h = 1;
      this.s = 1;
      this.seat = 0; // 내가 앉은 코타츠 자리 (1..SEATS, 0이면 아님)
      this.pendingSeat = 0;
      this.inside = false; // 코타츠 속
      this.fade = 0; // 들어가고 나올 때 화면이 어둑해지는 정도
      this.fadeTo = 0;
      this.insideMix = 0; // 소리: 이불 속일수록 1
      this.bowl = BOWL_MAX;
      this.refill = 0;
      this.peels = [];
      this.steam = [];
      this.flakes = [];
      this.clumps = [];
      this.nextClump = MC.rand(18, 34);
      this.onFlump = null;
      // 데굴데굴: 내 것과 다른 사람들의 것
      this.roll = null;
      this.rollN = 0;
      this.rolls = new Map();
      this.rollingSt = new Set();
      // 이불 속에서 툭툭 치며 노는 귤 하나 (장면 좌표)
      this.toy = { X: 640, Z: 420, vx: 0, vz: 0, spin: 0 };
      this.motes = [];
      this.gust = 0;
      this.nextGust = MC.rand(6, 12);
      this.toDoor = false;
      this.leaving = false;
      this.onExit = null;
      this.onCute = null;
      this.onToast = null;
      this.onInside = null;
      this.onPuff = null;
      this.rnd = MC.rng(3131);
      sprites();
      // 멍이: 방 안에서는 목도리만
      const light = { ambient: 'rgba(40,20,10,0.08)', glow: [255, 170, 100], glowA: 0.28, from: 70 };
      this.pup = new MC.Pup({ outfit: 'scarf', light: Object.assign({}, light) });
      this.pup.onEvent = (kind) => {
        if (kind === 'yum') this.leavePeel();
        if (this.onCute) this.onCute(kind);
      };
      if (!this.preview && MC.Crowd) {
        const sc = this;
        this.crowd = new MC.Crowd(this.pup, {
          place: 'lodge',
          outfit: 'scarf',
          light,
          start: { X: 300, Z: 880 },
          toScreen: (X, Z) => this.toScreen(X, Z),
          toCanon: (x, y) => this.toCanon(x, y),
          bounds: () => (this.inside ? { x0: 30, x1: 970, z0: 0, z1: 1000 } : { x0: 30, x1: 970, z0: 30, z1: 1000 }),
          blockers: () => (this.inside ? this.inBlockers : this.blockers) || [],
          floor: (x, y) => (this.inside ? y > this.IN.y0 - 30 * this.s : y > this.L.floorTop - 6 * this.s),
          // 방에서는 텐트 안과 같은 빠르기, 이불 속에서는 납작 엎드려 천천히
          speed: () => {
            const c = this.crowd;
            const z = c ? MC.clamp(c.me.Z / 1000, 0, 1) : 0.5;
            if (this.inside) return 95 * this.s * (0.8 + 0.6 * z);
            return 150 * this.s * (0.9 + 0.35 * z);
          },
          // 이불 속은 좁아서 서로 비켜 앉지 않는다 (자연스럽게 겹친다)
          drifting: () => this.inside,
          pose: (X, Z, perched) => this.seatPose(X, Z, perched),
          seats: () => (this.inside ? [] : FLOOR_SPOTS),
          lightFor: (p, X, Z, a) => this.lightPup(p, a),
          env: () => ({ lieOf: (st) => !!st.k || this.rollingSt.has(st), restOf: () => null }),
          // 코타츠에 들어간 사람과 방에 있는 사람은 서로 보이지 않는다
          visible: (v) => !!v.st.k === this.inside,
          // 이불 속에서는 의자를 펼 수 없다
          noChair: () => this.inside,
          over: (g, p, me, v) => this.drawLap(g, p, me, v),
          tilt: (p, me, v) => this.rollTilt(p, me, v),
          perch: {
            get X() {
              return sc.seatFoot(sc.seat || sc.pendingSeat || 3).X;
            },
            get Z() {
              return sc.seatFoot(sc.seat || sc.pendingSeat || 3).Z;
            },
            seat: (id, st) => sc.seatAt(id, st),
            hit: (x, y) => !sc.inside && sc.hitKotatsu(x, y),
            sortY: () => sc.K.y - 3,
            claim: () => sc.claimSeat(),
            onSit: () => sc.sitDown(),
            onLeave: () => sc.standUp(),
            onFull: () => sc.seatsFull(),
          },
          extra: () => ({ l: sc.crowd && sc.crowd.perched ? sc.seat : 0, k: sc.inside ? 1 : 0, rl: sc.rollN }),
        });
        this.crowd.perched = false;
      }
    }

    audioParams() {
      return { inside: this.insideMix, gust: this.gust };
    }

    // ── 좌표 ─────────────────────────────────────────────
    kAt(y) {
      const L = this.L;
      const z = MC.clamp((y - L.floorTop) / (L.floorBot - L.floorTop), -0.4, 1.2);
      return this.s * (0.72 + 0.62 * z);
    }

    // 이불 속 바닥의 너비 (멀수록 좁다)
    floorW(y) {
      const I = this.IN;
      return MC.lerp(I.fx1 - I.fx0, this.w * 1.25, (y - I.far) / (this.h - I.far));
    }

    toScreen(X, Z) {
      if (this.inside) {
        const I = this.IN;
        const u = Z / 1000;
        const y = I.y0 + u * (I.y1 - I.y0);
        return { x: this.w / 2 + (X / 1000 - 0.5) * this.floorW(y) * 0.9, y, k: this.s * (1.72 + 0.9 * u) };
      }
      const L = this.L;
      const y = L.floorTop + (Z / 1000) * (L.floorBot - L.floorTop);
      return { x: (X / 1000) * this.w, y, k: this.kAt(y) };
    }

    toCanon(x, y) {
      if (this.inside) {
        const I = this.IN;
        return { X: ((x - this.w / 2) / (this.floorW(y) * 0.9) + 0.5) * 1000, Z: ((y - I.y0) / (I.y1 - I.y0)) * 1000 };
      }
      const L = this.L;
      return { X: (x / this.w) * 1000, Z: ((y - L.floorTop) / (L.floorBot - L.floorTop)) * 1000 };
    }

    // ── 크기와 배치 ───────────────────────────────────────
    resize(w, h, dpr) {
      this.w = w;
      this.h = h;
      this.dpr = dpr;
      const s = (this.s = MC.clamp(Math.min(w / 520, h / 800), 0.55, 1.4));
      const P = w < h * 0.9;
      const L = (this.L = { portrait: P });
      L.wallY = h * (P ? 0.44 : 0.5);
      L.floorTop = L.wallY + 8 * s;
      L.floorBot = h - 12 * s;
      const span = L.floorBot - L.floorTop;
      const at = (x, y) => ({ x, y, k: this.kAt(y) });
      // 창: 가로 화면은 왼쪽으로 조금, 세로 화면은 가운데에 크게
      L.win = P
        ? { x0: w * 0.1, x1: w * 0.9, y0: L.wallY * 0.2, y1: L.wallY * 0.8 }
        : { x0: w * 0.17, x1: w * 0.55, y0: L.wallY * 0.22, y1: L.wallY * 0.8 };
      L.door = { x0: P ? -w * 0.02 : w * 0.015, x1: P ? w * 0.07 : w * 0.13, y0: L.wallY * 0.16, y1: L.wallY };
      L.shelf = at(w * (P ? 0.84 : 0.79), L.floorTop + 6 * s);
      L.lamp = { x: w * 0.5, y: L.wallY * (P ? 0.12 : 0.16) };
      // 코타츠: 가운데. 휴대폰처럼 좁으면 화면에 들어오게 줄인다
      const ky = L.floorTop + span * (P ? 0.5 : 0.56);
      const kk = Math.min(this.kAt(ky), (w * 0.86) / 470);
      L.K = { x: w * 0.5, y: ky, k: kk };
      this.K = L.K;
      L.stove = at(w * (P ? 0.86 : 0.88), L.floorTop + span * (P ? 0.86 : 0.42));
      L.basket = at(w * (P ? 0.14 : 0.72), L.floorTop + span * (P ? 0.9 : 0.25));
      L.cushions = at(w * (P ? 0.2 : 0.22), L.floorTop + span * (P ? 0.12 : 0.2));
      L.slippers = { x: (L.door.x0 + L.door.x1) / 2 + 16 * s, y: L.floorTop + 14 * s };
      // 코타츠 속: 낮고 어둑한 이불 속. 위는 상판 밑(ceil 까지), 저 앞 이불 벽(far 까지, fx0..fx1), 그 앞은 깔개
      // 넓고 낮고 얕은 상자: 저 앞 이불이 가깝고, 머리 위가 낮다 (엎드린 멍이가 높이의 절반쯤)
      const far = h * (P ? 0.47 : 0.5);
      this.IN = { ceil: h * (P ? 0.3 : 0.27), far, fx0: w * (P ? 0.04 : 0.08), fx1: w * (P ? 0.96 : 0.92), y0: far + h * 0.03, y1: h * 0.95 };
      this.buildBackground();
      this.buildProps();
      this.buildOutside();
      this.buildInside();
      this.buildBlockers();
      if (!this.motes.length) {
        for (let i = 0; i < 26; i++) this.motes.push({ a: this.rnd() * 6.28, r: this.rnd(), ph: this.rnd() * 9, sp: 0.4 + this.rnd() * 0.6 });
      }
      if (this.crowd) {
        this.crowd.layout();
        // 마을에서 들어오면 미닫이문 앞에서 살며시 나타나 안으로 걸어 들어온다
        if (!this.entered) {
          this.entered = true;
          const d = this.doorCanon();
          this.crowd.portalWalk({ X: d.X, Z: -40 }, { X: d.X + 60, Z: 240 }, 1.2, true);
        }
      }
    }

    doorCanon() {
      const d = this.L.door;
      return this.toCanon((d.x0 + d.x1) / 2, this.L.floorTop);
    }

    buildBlockers() {
      const L = this.L;
      const span = L.floorBot - L.floorTop;
      const B = (x, y, rx, ry) => ({ x: (x / this.w) * 1000, z: ((y - L.floorTop) / span) * 1000, rx: (rx / this.w) * 1000, rz: (ry / span) * 1000 });
      const K = L.K;
      this.blockers = [
        B(K.x, K.y - 20 * K.k, 176 * K.k, 46 * K.k),
        B(L.stove.x, L.stove.y - 8 * L.stove.k, 54 * L.stove.k, 18 * L.stove.k),
        B(L.basket.x, L.basket.y - 6 * L.basket.k, 34 * L.basket.k, 12 * L.basket.k),
        B(L.cushions.x, L.cushions.y - 6 * L.cushions.k, 70 * L.cushions.k, 16 * L.cushions.k),
      ];
      if (!L.portrait) this.blockers.push(B(L.shelf.x, L.shelf.y - 6 * L.shelf.k, 96 * L.shelf.k, 12 * L.shelf.k));
      // 이불 속에는 막는 것이 없다 (가장자리는 이불이 막는다)
      this.inBlockers = [];
    }

    // 이불 속 왼쪽(side -1)·오른쪽(1) 벽이 바닥에 닿는 선 위의 x (y 높이에서)
    wallX(side, y) {
      const I = this.IN;
      const u = (y - I.far) / (this.h * 1.06 - I.far);
      return side < 0 ? MC.lerp(I.fx0, -this.w * 0.15, u) : MC.lerp(I.fx1, this.w * 1.15, u);
    }

    // ── 배경: 벽, 기둥, 창틀 자리, 다다미, 미닫이문 ─────────────
    buildBackground() {
      const { w, h, dpr, s, L } = this;
      const c = (this.bg = MC.canvas(w * dpr, h * dpr));
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      const rnd = MC.rng(808);
      // 벽: 따뜻한 회벽
      g.fillStyle = lin(g, 0, 0, 0, L.wallY, [[0, '#d9c3a1'], [0.55, '#e7d4b6'], [1, '#dcc4a0']]);
      g.fillRect(0, 0, w, L.wallY + 2);
      for (let i = 0; i < 260; i++) {
        g.fillStyle = `rgba(${rnd() < 0.5 ? '255,250,238' : '150,120,86'},${0.05 + rnd() * 0.06})`;
        g.fillRect(rnd() * w, rnd() * L.wallY, 2 + rnd() * 3, 1 + rnd() * 2);
      }
      // 천장 보와 위쪽 가로대
      g.fillStyle = lin(g, 0, 0, 0, 34 * s, [[0, '#5b3e2a'], [1, '#7a5537']]);
      g.fillRect(0, 0, w, 30 * s);
      g.fillStyle = 'rgba(40,24,14,0.35)';
      g.fillRect(0, 30 * s, w, 3 * s);
      const nag = L.wallY * 0.14 + 16 * s;
      g.fillStyle = '#8a6141';
      g.fillRect(0, nag, w, 11 * s);
      g.fillStyle = 'rgba(40,24,14,0.25)';
      g.fillRect(0, nag + 11 * s, w, 2 * s);
      // 기둥
      for (const x of [w * 0.005, w * 0.995 - 14 * s, L.win.x0 - 18 * s, L.win.x1 + 4 * s]) {
        if (x < -10 || x > w) continue;
        g.fillStyle = lin(g, x, 0, x + 14 * s, 0, [[0, '#7a5537'], [0.5, '#93694a'], [1, '#6c4a30']]);
        g.fillRect(x, 0, 14 * s, L.wallY);
      }
      // 아래 벽널
      const wy = L.wallY - 30 * s;
      g.fillStyle = lin(g, 0, wy, 0, L.wallY, [[0, '#9c6f4a'], [1, '#7c5636']]);
      g.fillRect(0, wy, w, 30 * s);
      g.strokeStyle = 'rgba(50,30,18,0.3)';
      g.lineWidth = 1;
      for (let x = 0; x < w; x += 26 * s) {
        g.beginPath();
        g.moveTo(x, wy + 2);
        g.lineTo(x, L.wallY);
        g.stroke();
      }
      // 미닫이문 (후스마): 연한 종이에 둥근 손잡이, 대나무 무늬
      const d = L.door;
      g.fillStyle = '#efe3c8';
      g.fillRect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0);
      g.strokeStyle = '#6c4a30';
      g.lineWidth = 6 * s;
      g.strokeRect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0);
      g.strokeStyle = 'rgba(120,150,96,0.35)';
      g.lineWidth = 3 * s;
      for (let i = 0; i < 3; i++) {
        const x = d.x0 + (d.x1 - d.x0) * (0.25 + i * 0.22);
        g.beginPath();
        g.moveTo(x, d.y1 - 6 * s);
        g.quadraticCurveTo(x + 6 * s, (d.y0 + d.y1) / 2, x - 2 * s, d.y0 + 30 * s);
        g.stroke();
      }
      ell(g, d.x1 - 12 * s, (d.y0 + d.y1) * 0.55, 5 * s, 7 * s);
      g.fillStyle = '#4a3324';
      g.fill();
      // 걸레받이 (벽과 바닥 사이)
      g.fillStyle = '#5a3a24';
      g.fillRect(0, L.wallY - 1, w, L.floorTop - L.wallY + 2);
      // 다다미: 테두리 천(헤리)이 있는 돗자리, 안쪽으로 살짝 좁아지는 원근
      const top = L.floorTop - 2 * s;
      const bot = h;
      g.fillStyle = lin(g, 0, top, 0, bot, [[0, '#c9bd86'], [1, '#d9cc93']]);
      g.fillRect(0, top, w, bot - top);
      for (let i = 0; i < 1400; i++) {
        const y = top + rnd() * (bot - top);
        g.fillStyle = `rgba(${rnd() < 0.5 ? '120,110,60' : '255,250,210'},${0.07 + rnd() * 0.07})`;
        g.fillRect(rnd() * w, y, 6 + rnd() * 14, 1);
      }
      const cx = w / 2;
      const conv = (x, y) => cx + (x - cx) * (0.8 + 0.2 * ((y - top) / (bot - top)));
      g.strokeStyle = '#3f3a2a';
      g.lineWidth = 4 * s;
      for (const u of [0.18, 0.5, 0.82]) {
        const x = w * u;
        g.beginPath();
        g.moveTo(conv(x, top), top);
        g.lineTo(conv(x, bot), bot);
        g.stroke();
      }
      for (const v of [0.34, 0.72]) {
        const y = top + (bot - top) * v * v;
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(w, y);
        g.stroke();
      }
      // 벽과 바닥이 만나는 그림자
      g.fillStyle = lin(g, 0, top, 0, top + 30 * s, [[0, 'rgba(60,40,20,0.35)'], [1, 'rgba(60,40,20,0)']]);
      g.fillRect(0, top, w, 30 * s);
      // 둘레 어둠 (가장자리를 조금 어둡게)
      const vg = g.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.25, w / 2, h * 0.55, Math.max(w, h) * 0.8);
      vg.addColorStop(0, 'rgba(30,16,8,0)');
      vg.addColorStop(1, 'rgba(30,16,8,0.4)');
      this.vignette = MC.canvas(w * dpr, h * dpr);
      const vgc = this.vignette.getContext('2d');
      vgc.scale(dpr, dpr);
      vgc.fillStyle = vg;
      vgc.fillRect(0, 0, w, h);
    }

    // ── 가구: 코타츠, 석유난로와 주전자, 책장, 방석 더미, 귤 바구니 ─────────
    buildProps() {
      const { dpr, L } = this;
      const K = L.K;
      this.props = {};
      // 코타츠: 두툼한 이불 위에 나무 상판
      this.props.kotatsu = sprite(520, 220, 260, 140, K.k, dpr, (g) => {
        g.fillStyle = 'rgba(40,24,12,0.28)';
        ell(g, 0, 18, 230, 26);
        g.fill();
        // 이불: 위는 상판 밑에서, 아래는 바닥에 닿아 넉넉하게 퍼진다
        g.beginPath();
        g.moveTo(-160, -108);
        g.quadraticCurveTo(-210, -90, -214, -40);
        g.quadraticCurveTo(-222, 6, -196, 18);
        let x = -196;
        for (let i = 0; i < 8; i++) {
          const nx = x + 49;
          g.quadraticCurveTo((x + nx) / 2, 30 + (i % 2) * 6, nx, 18 + ((i + 1) % 2) * 3);
          x = nx;
        }
        g.quadraticCurveTo(222, 6, 214, -40);
        g.quadraticCurveTo(210, -90, 160, -108);
        g.closePath();
        g.fillStyle = lin(g, 0, -110, 0, 30, [[0, '#d97a52'], [0.6, '#c4603c'], [1, '#a84d31']]);
        g.fill();
        ink(g, 2.4);
        // 이불 무늬: 크림빛 격자와 작은 땡땡이
        g.save();
        g.clip();
        g.strokeStyle = 'rgba(255,236,206,0.42)';
        g.lineWidth = 3;
        for (let gx = -200; gx <= 200; gx += 44) {
          g.beginPath();
          g.moveTo(gx, -110);
          g.quadraticCurveTo(gx * 1.08, -30, gx * 1.12, 30);
          g.stroke();
        }
        for (const gy of [-62, -16]) {
          g.beginPath();
          g.moveTo(-230, gy);
          g.quadraticCurveTo(0, gy + 8, 230, gy);
          g.stroke();
        }
        g.strokeStyle = 'rgba(255,236,206,0.18)';
        g.lineWidth = 7;
        for (let gx = -178; gx <= 178; gx += 44) {
          g.beginPath();
          g.moveTo(gx, -110);
          g.quadraticCurveTo(gx * 1.08, -30, gx * 1.12, 30);
          g.stroke();
        }
        g.fillStyle = 'rgba(255,244,228,0.6)';
        for (let fx = -200; fx <= 200; fx += 44) {
          for (const fy of [-62, -16]) {
            ell(g, fx * (fy < -40 ? 1.02 : 1.06), fy + 4, 3, 2.2);
            g.fill();
          }
        }
        // 주름
        g.strokeStyle = 'rgba(90,30,16,0.35)';
        g.lineWidth = 2;
        for (const [x0, y0, x1, y1] of [[-150, -70, -170, 10], [-60, -60, -76, 16], [40, -62, 54, 18], [140, -72, 166, 8]]) {
          g.beginPath();
          g.moveTo(x0, y0);
          g.quadraticCurveTo((x0 + x1) / 2 + 8, (y0 + y1) / 2, x1, y1);
          g.stroke();
        }
        g.restore();
        // 상판: 나무 테두리와 판
        g.beginPath();
        g.moveTo(-170, -78);
        g.lineTo(-150, -116);
        g.lineTo(150, -116);
        g.lineTo(170, -78);
        g.closePath();
        g.fillStyle = lin(g, 0, -116, 0, -78, [[0, '#c99a66'], [1, '#d8ab78']]);
        g.fill();
        ink(g, 2.2);
        g.strokeStyle = 'rgba(120,80,40,0.35)';
        g.lineWidth = 1.2;
        for (let i = 1; i < 5; i++) {
          const y = -116 + i * 7.6;
          g.beginPath();
          g.moveTo(-150 - i * 4, y);
          g.lineTo(150 + i * 4, y);
          g.stroke();
        }
        g.beginPath();
        g.moveTo(-170, -78);
        g.lineTo(170, -78);
        g.lineTo(170, -70);
        g.lineTo(-170, -70);
        g.closePath();
        g.fillStyle = '#9b6d43';
        g.fill();
        ink(g, 2);
        // 찻주전자와 찻잔 (왼쪽)
        g.save();
        g.translate(-104, -96);
        ell(g, 0, 0, 20, 15);
        g.fillStyle = lin(g, -20, -15, 20, 15, [[0, '#7fa38f'], [1, '#4e7563']]);
        g.fill();
        ink(g, 2);
        g.beginPath();
        g.moveTo(17, -2);
        g.quadraticCurveTo(30, -6, 32, -16);
        ink(g, 4, '#4e7563');
        g.beginPath();
        g.arc(-16, -2, 9, Math.PI * 0.6, Math.PI * 1.5);
        ink(g, 3, '#3c5a4c');
        ell(g, 0, -15, 8, 3);
        g.fillStyle = '#5c8471';
        g.fill();
        ink(g, 1.6);
        g.restore();
        for (const cx of [-60, -36]) {
          g.beginPath();
          g.moveTo(cx - 8, -100);
          g.lineTo(cx - 6, -90);
          g.lineTo(cx + 6, -90);
          g.lineTo(cx + 8, -100);
          g.closePath();
          g.fillStyle = '#f2ece0';
          g.fill();
          ink(g, 1.6);
          ell(g, cx, -100, 8, 2.6);
          g.fillStyle = '#b38a4e';
          g.fill();
        }
      });
      // 귤 바구니 (상판 위, 가운데 앞쪽) 와 귤 한 알
      this.props.basketTop = sprite(120, 60, 60, 40, K.k, dpr, (g) => {
        ell(g, 0, 0, 40, 13);
        g.fillStyle = '#c7a066';
        g.fill();
        ink(g, 2);
        g.strokeStyle = 'rgba(110,80,40,0.5)';
        g.lineWidth = 1.1;
        for (let x = -36; x <= 36; x += 7) {
          g.beginPath();
          g.moveTo(x, -10);
          g.lineTo(x * 0.92, 10);
          g.stroke();
        }
      });
      this.props.mandarin = sprite(30, 30, 15, 26, K.k, dpr, (g) => {
        ell(g, 0, -11, 11, 10);
        g.fillStyle = lin(g, -8, -20, 8, 0, [[0, '#ffb04a'], [1, '#e8781c']]);
        g.fill();
        ink(g, 1.8, '#a2531a');
        g.fillStyle = '#5e8a3a';
        ell(g, 3, -20, 4, 2, -0.4);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.5)';
        ell(g, -4, -15, 2.4, 1.4, -0.6);
        g.fill();
      });
      // 석유난로: 둥근 몸통, 가운데 불빛 창, 위에 주전자
      const st = L.stove;
      this.props.stove = sprite(140, 260, 70, 244, st.k, dpr, (g) => {
        g.fillStyle = 'rgba(40,24,12,0.3)';
        ell(g, 0, 2, 50, 10);
        g.fill();
        g.beginPath();
        g.moveTo(-40, 0);
        g.lineTo(-40, -118);
        g.quadraticCurveTo(-40, -130, -28, -132);
        g.lineTo(28, -132);
        g.quadraticCurveTo(40, -130, 40, -118);
        g.lineTo(40, 0);
        g.closePath();
        g.fillStyle = lin(g, -40, 0, 40, 0, [[0, '#cfc8b8'], [0.45, '#f1ece0'], [1, '#bdb5a4']]);
        g.fill();
        ink(g, 2.4);
        // 불빛 창 (그물)
        MC.roundRect(g, -26, -104, 52, 62, 10);
        g.fillStyle = '#3a2418';
        g.fill();
        ink(g, 2);
        g.strokeStyle = 'rgba(120,90,60,0.6)';
        g.lineWidth = 1;
        for (let x = -22; x <= 22; x += 6) {
          g.beginPath();
          g.moveTo(x, -102);
          g.lineTo(x, -44);
          g.stroke();
        }
        // 뚜껑과 손잡이
        ell(g, 0, -132, 34, 8);
        g.fillStyle = '#8e877a';
        g.fill();
        ink(g, 2);
        g.strokeStyle = '#6a6358';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(0, -120, 46, Math.PI * 1.15, Math.PI * 1.85);
        g.stroke();
        // 주전자: 동글한 구리 주전자
        g.save();
        g.translate(0, -140);
        ell(g, 0, -20, 30, 22);
        g.fillStyle = lin(g, -30, -40, 30, 0, [[0, '#e0a26a'], [0.5, '#c27a44'], [1, '#93542a']]);
        g.fill();
        ink(g, 2.2);
        g.beginPath();
        g.moveTo(26, -24);
        g.quadraticCurveTo(44, -28, 50, -44);
        ink(g, 6, '#a5622f');
        ell(g, 0, -42, 9, 3.2);
        g.fillStyle = '#7a4520';
        g.fill();
        g.beginPath();
        g.moveTo(-22, -32);
        g.quadraticCurveTo(0, -66, 22, -32);
        ink(g, 3.2, '#5a3a22');
        g.fillStyle = 'rgba(255,240,210,0.5)';
        ell(g, -12, -28, 6, 3, -0.6);
        g.fill();
        g.restore();
      });
      L.spout = { x: st.x + 50 * st.k, y: st.y - 184 * st.k, k: st.k };
      L.stoveWin = { x: st.x, y: st.y - 73 * st.k, k: st.k };
      // 낮은 책장: 책, 작은 화분, 라디오
      const sh = L.shelf;
      this.props.shelf = sprite(240, 130, 120, 120, sh.k, dpr, (g) => {
        g.fillStyle = 'rgba(40,24,12,0.25)';
        ell(g, 0, 2, 104, 8);
        g.fill();
        MC.roundRect(g, -100, -74, 200, 74, 6);
        g.fillStyle = lin(g, 0, -74, 0, 0, [[0, '#9d7049'], [1, '#7f5636']]);
        g.fill();
        ink(g, 2.2);
        g.fillStyle = '#5c3d26';
        g.fillRect(-92, -66, 184, 26);
        g.fillRect(-92, -34, 184, 26);
        const cols = ['#c86b5a', '#e2b55e', '#6f9fb7', '#8eae73', '#d99a7e', '#7d6aa8', '#e6d2a8'];
        let x = -88;
        for (let i = 0; i < 14; i++) {
          const bw = 7 + ((i * 7) % 6);
          const row = i < 7 ? -66 : -34;
          if (i === 7) x = -88;
          g.fillStyle = cols[i % cols.length];
          g.fillRect(x, row + 2, bw, 24);
          x += bw + 1.5;
        }
        // 화분과 라디오 (위)
        MC.roundRect(g, 40, -98, 26, 24, 4);
        g.fillStyle = '#d98b5f';
        g.fill();
        ink(g, 1.8);
        g.fillStyle = '#6e9e5a';
        for (const [lx, ly, r] of [[46, -104, 8], [58, -108, 9], [52, -114, 7]]) {
          ell(g, lx, ly, r, r * 0.7);
          g.fill();
        }
        MC.roundRect(g, -80, -94, 54, 20, 5);
        g.fillStyle = '#d6cbb3';
        g.fill();
        ink(g, 1.8);
        ell(g, -66, -84, 6, 6);
        g.fillStyle = '#8a7f6a';
        g.fill();
      });
      // 방석 더미 (쌓아 둔 자부톤)
      const cu = L.cushions;
      this.props.cushions = sprite(180, 100, 90, 88, cu.k, dpr, (g) => {
        g.fillStyle = 'rgba(40,24,12,0.22)';
        ell(g, 0, 2, 74, 9);
        g.fill();
        const cols = [['#a7c3d9', '#7f9fba'], ['#e5c37a', '#c99f4f'], ['#d68e83', '#b46b61']];
        cols.forEach(([a, b], i) => {
          const y = -10 - i * 16;
          MC.roundRect(g, -70 + i * 4, y - 14, 140 - i * 8, 18, 9);
          g.fillStyle = lin(g, 0, y - 14, 0, y + 4, [[0, a], [1, b]]);
          g.fill();
          ink(g, 2);
        });
        // 니트 담요 한 장
        g.beginPath();
        g.moveTo(-40, -58);
        g.quadraticCurveTo(10, -66, 56, -58);
        g.lineTo(52, -44);
        g.quadraticCurveTo(10, -50, -36, -44);
        g.closePath();
        g.fillStyle = '#efe6d4';
        g.fill();
        ink(g, 1.8);
      });
      // 귤 바구니 (바닥에 여분)
      const bk = L.basket;
      this.props.floorBasket = sprite(100, 70, 50, 60, bk.k, dpr, (g) => {
        g.fillStyle = 'rgba(40,24,12,0.22)';
        ell(g, 0, 2, 38, 7);
        g.fill();
        for (const [x, y] of [[-14, -30], [8, -32], [-2, -38], [18, -26], [-24, -24]]) {
          ell(g, x, y, 10, 9);
          g.fillStyle = '#f08f2e';
          g.fill();
          ink(g, 1.6, '#a2531a');
        }
        g.beginPath();
        g.moveTo(-36, -26);
        g.lineTo(-30, 0);
        g.lineTo(30, 0);
        g.lineTo(36, -26);
        g.closePath();
        g.fillStyle = '#c7a066';
        g.fill();
        ink(g, 2);
        g.strokeStyle = 'rgba(110,80,40,0.5)';
        g.lineWidth = 1;
        for (let y = -20; y < 0; y += 6) {
          g.beginPath();
          g.moveTo(-33, y);
          g.lineTo(33, y);
          g.stroke();
        }
      });
      // 가구를 앞뒤 순서로 세운다
      this.items = [
        { sp: this.props.cushions, x: cu.x, y: cu.y },
        { sp: this.props.stove, x: st.x, y: st.y, after: (g) => this.drawStoveGlow(g) },
        { sp: this.props.floorBasket, x: bk.x, y: bk.y },
        { sp: this.props.kotatsu, x: K.x, y: K.y, after: (g) => this.drawTableTop(g) },
      ];
      if (!L.portrait) this.items.push({ sp: this.props.shelf, x: sh.x, y: sh.y });
    }

    // ── 창밖: 늦가을 저녁. 빈 나무, 처마 밑 곶감, 먼 집들의 불빛 ───────────
    buildOutside() {
      const { dpr, s, L } = this;
      const W = L.win;
      const ww = W.x1 - W.x0;
      const wh = W.y1 - W.y0;
      const c = (this.outside = MC.canvas(Math.ceil(ww * dpr), Math.ceil(wh * dpr)));
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      const rnd = MC.rng(4242);
      // 눈 오는 겨울 저녁 하늘: 낮게 깔린 눈구름
      g.fillStyle = lin(g, 0, 0, 0, wh, [[0, '#4a5878'], [0.5, '#7d89a6'], [0.78, '#aeb4c6'], [1, '#c8cbd6']]);
      g.fillRect(0, 0, ww, wh);
      for (let i = 0; i < 9; i++) {
        g.fillStyle = `rgba(${rnd() < 0.5 ? '210,216,232' : '70,82,110'},0.12)`;
        ell(g, rnd() * ww, wh * (0.08 + rnd() * 0.3), ww * (0.12 + rnd() * 0.18), wh * (0.04 + rnd() * 0.05));
        g.fill();
      }
      // 먼 언덕: 눈에 덮여 하얗다
      g.fillStyle = '#c9cfdd';
      g.beginPath();
      g.moveTo(0, wh * 0.7);
      for (let x = 0; x <= ww; x += 10) g.lineTo(x, wh * 0.7 - Math.sin(x * 0.012) * 10 * s - Math.sin(x * 0.031 + 1) * 5 * s);
      g.lineTo(ww, wh);
      g.lineTo(0, wh);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(120,132,160,0.35)';
      g.beginPath();
      g.moveTo(0, wh * 0.74);
      for (let x = 0; x <= ww; x += 10) g.lineTo(x, wh * 0.74 - Math.sin(x * 0.02 + 2) * 4 * s);
      g.lineTo(ww, wh * 0.78);
      g.lineTo(0, wh * 0.78);
      g.closePath();
      g.fill();
      // 눈 덮인 지붕 아래 불 켜진 집들
      for (let i = 0; i < 6; i++) {
        const x = rnd() * ww;
        const y = wh * (0.64 + rnd() * 0.06);
        g.fillStyle = '#5c5f74';
        g.fillRect(x, y, 16 * s, 10 * s);
        g.beginPath();
        g.moveTo(x - 4 * s, y + 1 * s);
        g.lineTo(x + 8 * s, y - 8 * s);
        g.lineTo(x + 20 * s, y + 1 * s);
        g.closePath();
        g.fillStyle = '#f2f4fa';
        g.fill();
        g.fillStyle = 'rgba(255,214,140,0.9)';
        g.fillRect(x + 4 * s, y + 3 * s, 3 * s, 3 * s);
      }
      // 가까운 마당: 소복이 쌓인 눈과 담
      g.fillStyle = lin(g, 0, wh * 0.82, 0, wh, [[0, '#e6e9f2'], [1, '#cfd4e2']]);
      g.fillRect(0, wh * 0.84, ww, wh * 0.16);
      g.fillStyle = '#4a433d';
      for (let x = 0; x < ww; x += 14 * s) g.fillRect(x, wh * 0.8, 3 * s, wh * 0.06);
      g.fillRect(0, wh * 0.81, ww, 2 * s);
      g.fillStyle = '#f4f6fb';
      for (let x = 0; x < ww; x += 14 * s) {
        ell(g, x + 1.5 * s, wh * 0.8, 3.4 * s, 1.8 * s);
        g.fill();
      }
      g.fillRect(0, wh * 0.805, ww, 1.6 * s);
      // 빈 나무: 가지 위에 눈이 얹혔다
      const tree = (x0, y0, len, ang, wdt, depth) => {
        const x1 = x0 + Math.cos(ang) * len;
        const y1 = y0 + Math.sin(ang) * len;
        g.strokeStyle = '#3d3a40';
        g.lineWidth = wdt;
        g.beginPath();
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        g.stroke();
        if (wdt > 1.4 * s && Math.abs(Math.cos(ang)) > 0.25) {
          g.strokeStyle = 'rgba(246,248,252,0.9)';
          g.lineWidth = Math.max(1, wdt * 0.5);
          g.beginPath();
          g.moveTo(x0, y0 - wdt * 0.45);
          g.lineTo(x1, y1 - wdt * 0.45);
          g.stroke();
        }
        if (depth <= 0) return;
        const n = 2 + (rnd() < 0.4 ? 1 : 0);
        for (let i = 0; i < n; i++) tree(x1, y1, len * (0.62 + rnd() * 0.18), ang + (rnd() - 0.5) * 1.1, wdt * 0.66, depth - 1);
      };
      g.lineCap = 'round';
      tree(ww * 0.28, wh * 0.9, wh * 0.28, -Math.PI / 2 - 0.08, 6 * s, 5);
      tree(ww * 0.86, wh * 0.92, wh * 0.22, -Math.PI / 2 + 0.12, 5 * s, 4);
      // 처마 끝 (위)과 처마에 쌓인 눈
      g.fillStyle = '#3a2c22';
      g.fillRect(0, 0, ww, 10 * s);
      g.fillStyle = '#eef1f8';
      g.beginPath();
      g.moveTo(0, 10 * s);
      for (let x = 0; x <= ww; x += 8 * s) g.lineTo(x, 10 * s + (2 + 2 * Math.sin(x * 0.09) + (rnd() < 0.08 ? 4 : 0)) * s);
      g.lineTo(ww, 6 * s);
      g.lineTo(0, 6 * s);
      g.closePath();
      g.fill();
      // 가로등 (갓 위에도 눈)
      g.strokeStyle = '#3d3a40';
      g.lineWidth = 3 * s;
      g.beginPath();
      g.moveTo(ww * 0.6, wh * 0.86);
      g.lineTo(ww * 0.6, wh * 0.48);
      g.lineTo(ww * 0.64, wh * 0.48);
      g.stroke();
      g.fillStyle = '#f4f6fb';
      ell(g, ww * 0.625, wh * 0.48 - 2.5 * s, 7 * s, 2.2 * s);
      g.fill();
      // 곶감 줄: 바람에 흔들리게 따로 그린다
      this.persimmons = [ww * 0.12, ww * 0.42, ww * 0.68].map((x, i) => ({ x, n: 5 - (i % 2), ph: i * 1.7 }));
      this.lampAt = { x: ww * 0.64, y: wh * 0.48 + 5 * s };
      // 창밖 눈송이: 먼 것(작고 느림)과 가까운 것(크고 빠름)
      this.flakes = [];
      for (let i = 0; i < 70; i++) this.flakes.push(this.newFlake(true));
    }

    // ── 코타츠 속 (미리 그려 두는 것): 낮은 상판 밑, 처진 이불 벽, 북슬한 깔개 ─────────────
    buildInside() {
      const { w, h, dpr, s } = this;
      const I = this.IN;
      const c = (this.inBg = MC.canvas(w * dpr, h * dpr));
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      g.lineJoin = 'round';
      const rnd = MC.rng(9191);
      const L0 = -w * 0.15;
      const R0 = w * 1.15;
      const B0 = h * 1.06;
      g.fillStyle = '#120704';
      g.fillRect(0, 0, w, h);
      // 깔개: 멀수록 어둡고, 털 결이 보슬보슬
      g.beginPath();
      g.moveTo(I.fx0, I.far);
      g.lineTo(I.fx1, I.far);
      g.lineTo(R0, B0);
      g.lineTo(L0, B0);
      g.closePath();
      g.fillStyle = lin(g, 0, I.far, 0, h, [[0, '#2a1209'], [0.45, '#3a1a0d'], [1, '#2a1109']]);
      g.fill();
      g.save();
      g.clip();
      for (let i = 0; i < 2600; i++) {
        const v = rnd();
        const y = I.far + v * v * (h - I.far) * 1.05;
        const sz = (0.6 + 2.2 * v) * s;
        g.fillStyle = `rgba(${rnd() < 0.55 ? '255,170,120' : '10,4,2'},${0.04 + rnd() * 0.06})`;
        ell(g, w / 2 + (rnd() - 0.5) * this.floorW(y) * 1.1, y, sz * 1.6, sz * 0.7, (rnd() - 0.5) * 0.6);
        g.fill();
      }
      g.restore();
      // 상판 밑: 나무판이 머리 위로 낮게
      g.beginPath();
      g.moveTo(L0, -2);
      g.lineTo(R0, -2);
      g.lineTo(I.fx1, I.ceil);
      g.lineTo(I.fx0, I.ceil);
      g.closePath();
      g.fillStyle = lin(g, 0, 0, 0, I.ceil, [[0, '#1d110a'], [1, '#33200f']]);
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.lineWidth = 1.4 * s;
      for (let i = 1; i < 9; i++) {
        const u = i / 9;
        g.beginPath();
        g.moveTo(MC.lerp(L0, R0, u), -2);
        g.lineTo(MC.lerp(I.fx0, I.fx1, u), I.ceil);
        g.stroke();
      }
      g.strokeStyle = 'rgba(255,190,140,0.05)';
      g.lineWidth = 1.2 * s;
      for (let i = 0; i < 14; i++) {
        const y = I.ceil * (0.15 + rnd() * 0.8);
        const half = MC.lerp(w * 0.65, (I.fx1 - I.fx0) / 2, y / I.ceil);
        const x = w / 2 + (rnd() - 0.5) * half * 1.6;
        g.beginPath();
        g.moveTo(x - 30 * s, y);
        g.quadraticCurveTo(x, y - 3 * s, x + 30 * s, y);
        g.stroke();
      }
      // 저 앞 이불: 상판 끝에서 바닥까지 늘어진 주름
      g.fillStyle = lin(g, 0, I.ceil, 0, I.far, [[0, '#4a1a0e'], [1, '#2e0f07']]);
      g.fillRect(I.fx0, I.ceil, I.fx1 - I.fx0, I.far - I.ceil);
      const n = Math.max(4, Math.round((I.fx1 - I.fx0) / (26 * s)));
      for (let i = 0; i < n; i++) {
        const x = MC.lerp(I.fx0, I.fx1, (i + 0.5) / n);
        g.fillStyle = lin(g, x - 13 * s, 0, x + 13 * s, 0, [[0, 'rgba(0,0,0,0.25)'], [0.5, 'rgba(255,140,90,0.06)'], [1, 'rgba(0,0,0,0.25)']]);
        g.beginPath();
        g.moveTo(x - 13 * s, I.ceil);
        g.quadraticCurveTo(x - 10 * s, (I.ceil + I.far) / 2, x - 15 * s, I.far);
        g.lineTo(x + 11 * s, I.far);
        g.quadraticCurveTo(x + 14 * s, (I.ceil + I.far) / 2, x + 13 * s, I.ceil);
        g.closePath();
        g.fill();
      }
      // 양옆 이불: 위(상판 가장자리)에서 아래(바닥)로 비스듬히 늘어진다
      for (const side of [-1, 1]) {
        const X0 = side < 0 ? L0 : R0;
        const F = side < 0 ? I.fx0 : I.fx1;
        g.beginPath();
        g.moveTo(X0, -2);
        g.lineTo(F, I.ceil);
        g.lineTo(F, I.far);
        g.lineTo(X0, B0);
        g.closePath();
        g.fillStyle = lin(g, F, 0, X0, 0, [[0, '#3a140a'], [1, '#170804']]);
        g.fill();
        g.save();
        g.clip();
        g.strokeStyle = 'rgba(0,0,0,0.3)';
        g.lineWidth = 5 * s;
        for (let i = 1; i < 7; i++) {
          const u = i / 7;
          g.beginPath();
          g.moveTo(MC.lerp(F, X0, u), MC.lerp(I.ceil, -2, u));
          g.quadraticCurveTo(MC.lerp(F, X0, u) + side * 10 * s, MC.lerp((I.ceil + I.far) / 2, h * 0.5, u), MC.lerp(F, X0, u * 1.02), MC.lerp(I.far, B0, u));
          g.stroke();
        }
        g.strokeStyle = 'rgba(255,120,80,0.05)';
        g.lineWidth = 8 * s;
        for (let i = 1; i < 7; i++) {
          const u = (i + 0.5) / 7;
          g.beginPath();
          g.moveTo(MC.lerp(F, X0, u), MC.lerp(I.ceil, -2, u));
          g.lineTo(MC.lerp(F, X0, u), MC.lerp(I.far, B0, u));
          g.stroke();
        }
        g.restore();
      }
      // 저 앞 두 구석의 짧은 코타츠 다리
      for (const x of [I.fx0, I.fx1]) {
        const r = 7 * s;
        g.fillStyle = lin(g, x - r, 0, x + r, 0, [[0, '#2a180c'], [0.5, '#4a2c16'], [1, '#22130a']]);
        g.fillRect(x - r, I.ceil - 2 * s, r * 2, I.far - I.ceil + 2 * s);
      }
      // 이불이 바닥에 닿는 곳의 그늘
      g.strokeStyle = 'rgba(0,0,0,0.5)';
      g.lineWidth = 6 * s;
      g.beginPath();
      g.moveTo(L0, B0);
      g.lineTo(I.fx0, I.far);
      g.lineTo(I.fx1, I.far);
      g.lineTo(R0, B0);
      g.stroke();
      // 가장자리를 어둑하게 (멍이 위에도 덮는다)
      const vg = MC.canvas(w * dpr, h * dpr);
      const vc = vg.getContext('2d');
      vc.scale(dpr, dpr);
      const rg = vc.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.12, w / 2, h * 0.5, Math.max(w, h) * 0.75);
      rg.addColorStop(0, 'rgba(10,3,1,0)');
      rg.addColorStop(0.55, 'rgba(10,3,1,0.25)');
      rg.addColorStop(1, 'rgba(10,3,1,0.78)');
      vc.fillStyle = rg;
      vc.fillRect(0, 0, w, h);
      this.inVig = vg;
    }

    // ── 자리 ─────────────────────────────────────────────
    seatPoint(i) {
      const K = this.K;
      const S = SEATS[MC.clamp(i, 1, SEATS.length) - 1];
      return { x: K.x + S.dx * K.k, y: K.y + S.dz * K.k, k: K.k * S.k };
    }

    // 그 자리 곁 바닥 (여기까지 걸어와서 쏙 들어간다)
    seatFoot(i) {
      const q = this.seatPoint(i);
      const S = SEATS[MC.clamp(i, 1, SEATS.length) - 1];
      const c = this.toCanon(q.x + (S.side ? S.side * 30 * this.K.k : 0), q.y + (S.side ? 6 : -12) * this.K.k);
      return this.crowd ? this.crowd.clampIn(c) : c;
    }

    // 이 멍이가 앉은 코타츠 자리 (아니면 0)
    seatOf(me, v) {
      if (this.inside) return 0;
      if (me) return this.crowd && this.crowd.perched ? this.seat : 0;
      return v && v.st.q && !v.st.k && !v.jumpFrom ? v.st.l || 0 : 0;
    }

    // 양옆 자리: 무릎 위로 이불 자락을 덮어 준다 (안쪽 끝은 코타츠 이불 밑으로 들어가고, 바깥쪽은 바닥까지 늘어진다)
    drawLap(g, p, me, v) {
      const i = this.seatOf(me, v);
      const S = i ? SEATS[i - 1] : null;
      if (!S || !S.side) return;
      const side = S.side;
      const k = p.k;
      const K = this.K;
      const edge = K.x + side * 205 * K.k;
      const far = p.x + side * 34 * k;
      const top = p.y - 24 * k;
      g.save();
      g.lineJoin = 'round';
      g.beginPath();
      g.moveTo(edge, top - 6 * k);
      g.bezierCurveTo(MC.lerp(edge, far, 0.4), top - 12 * k, MC.lerp(edge, far, 0.8), top - 9 * k, far, top);
      g.quadraticCurveTo(far + side * 10 * k, top + 6 * k, far + side * 9 * k, p.y + 2 * k);
      g.quadraticCurveTo(far + side * 7 * k, p.y + 9 * k, far - side * 2 * k, p.y + 9 * k);
      g.quadraticCurveTo(MC.lerp(edge, far, 0.5), p.y + 13 * k, edge, p.y + 11 * k);
      g.closePath();
      g.fillStyle = lin(g, 0, top - 12 * k, 0, p.y + 12 * k, [[0, '#da7c54'], [0.6, '#c4603c'], [1, '#a84d31']]);
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 2.2 * k;
      g.stroke();
      g.clip();
      // 이불 무늬 (코타츠 이불과 같은 격자)
      g.strokeStyle = 'rgba(255,236,206,0.42)';
      g.lineWidth = 2.6 * k;
      const mid = MC.lerp(edge, far, 0.55);
      g.beginPath();
      g.moveTo(mid, top - 14 * k);
      g.lineTo(mid + side * 3 * k, p.y + 14 * k);
      g.moveTo(edge, p.y - 6 * k);
      g.quadraticCurveTo(MC.lerp(edge, far, 0.5), p.y - 3 * k, far + side * 10 * k, p.y - 7 * k);
      g.stroke();
      // 무릎에 걸린 주름
      g.strokeStyle = 'rgba(90,30,16,0.35)';
      g.lineWidth = 1.8 * k;
      g.beginPath();
      g.moveTo(far - side * 4 * k, top + 3 * k);
      g.quadraticCurveTo(far + side * 3 * k, p.y - 8 * k, far, p.y + 7 * k);
      g.stroke();
      g.restore();
    }

    // 뒤쪽 자리: 상판 위에 올려 둔 두 앞발 (귤을 까먹을 때는 귤을 들고 있으니 빼고)
    drawTablePaws(g) {
      if (!this.crowd || this.inside) return;
      const K = this.K;
      const paws = (p, a) => {
        if (p.snack || p.mood === 'eating' || a <= 0.05) return;
        const k = p.k;
        if (a < 1) g.globalAlpha = a;
        for (const sx of [-1, 1]) {
          const x = p.x + sx * 13 * k;
          const y = K.y - 109 * K.k;
          ell(g, x, y, 8 * k, 5.6 * k);
          g.fillStyle = p.coat.fur;
          g.fill();
          g.lineWidth = 1.8 * k;
          g.strokeStyle = INK;
          g.stroke();
          g.lineWidth = 1.2 * k;
          g.strokeStyle = 'rgba(58,36,24,0.55)';
          g.beginPath();
          for (const dx of [-2.6, 2.6]) {
            g.moveTo(x + dx * k, y + 1.5 * k);
            g.lineTo(x + dx * k, y + 4.8 * k);
          }
          g.stroke();
        }
        g.globalAlpha = 1;
      };
      const c = this.crowd;
      const back = (i) => i && !SEATS[i - 1].side;
      if (back(this.seatOf(true))) paws(this.pup, c.alpha);
      const shown = c.shown();
      for (const v of c.visitors.values()) {
        if (!shown.has(v) || !c.sees(v) || v.leaving) continue;
        if (back(this.seatOf(false, v))) paws(v.pup, MC.clamp(v.fade, 0, 1));
      }
    }

    takenSeats() {
      const taken = new Set();
      if (this.crowd) for (const v of this.crowd.visitors.values()) if (!v.leaving && v.st.q && v.st.l && !v.st.k) taken.add(v.st.l);
      return taken;
    }

    freeSeat(want) {
      const taken = this.takenSeats();
      const order = [];
      for (let i = 1; i <= SEATS.length; i++) order.push(i);
      order.sort((a, b) => Math.abs(a - want) - Math.abs(b - want));
      for (const i of order) if (!taken.has(i)) return i;
      return 0;
    }

    nearestSeat(x, y) {
      let best = 1;
      let bd = Infinity;
      for (let i = 1; i <= SEATS.length; i++) {
        const p = this.seatPoint(i);
        const d = Math.hypot(p.x - x, (p.y - y) * 1.6);
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
      return best;
    }

    seatAt(id, st) {
      let i;
      if (!id) i = this.seat || this.pendingSeat || 3;
      else i = st && st.l ? st.l : 1 + Math.floor(MC.hash(id.length * 3.7 + id.charCodeAt(id.length - 1)) * SEATS.length);
      return this.seatPoint(i);
    }

    claimSeat() {
      const i = this.freeSeat(this.pendingSeat || 3);
      this.pendingSeat = 0;
      if (!i) return false;
      this.seat = i;
      return true;
    }

    sitDown() {
      if (this.onCute) this.onCute('hop');
      // 이불 속은 따뜻해서 금세 꾸벅꾸벅
      this.pup.sleepAfter = Math.min(this.pup.sleepAfter, 40);
    }

    standUp() {
      this.seat = 0;
    }

    seatsFull() {
      if (this.onToast) this.onToast('코타츠 자리가 꽉 찼어요');
    }

    // 코타츠를 톡: 가까운 빈자리로 걸어가 쏙 들어가 앉는다. 이미 앉아 있으면 옆 빈자리로 옮긴다
    tapKotatsu(x, y) {
      const c = this.crowd;
      const want = this.nearestSeat(x, y);
      if (c.perched) {
        if (want !== this.seat && !this.takenSeats().has(want)) {
          this.seat = want;
          this.pup.hopV = -50;
          this.pup.emit('hop');
        }
        return;
      }
      const i = this.freeSeat(want);
      if (!i) {
        this.seatsFull();
        return;
      }
      this.pendingSeat = i;
      c.go(this.seatFoot(i), true);
      this.toDoor = false;
    }

    hitKotatsu(x, y) {
      const K = this.K;
      const k = K.k;
      return Math.abs(x - K.x) < 230 * k && y > K.y - 120 * k && y < K.y + 30 * k;
    }

    hitBowl(x, y) {
      const K = this.K;
      return Math.hypot(x - K.x, (y - (K.y - 104 * K.k)) * 1.6) < 46 * K.k;
    }

    hitDoor(x, y) {
      const d = this.L.door;
      return x > d.x0 && x < d.x1 + 10 * this.s && y > d.y0 && y < this.L.floorTop + 10 * this.s;
    }

    hitKettle(x, y) {
      const st = this.L.stove;
      return Math.hypot(x - st.x, y - (st.y - 160 * st.k)) < 36 * st.k;
    }

    // 코타츠 곁 '앉기' 단추: 빈자리가 있고 방 바닥에 가만히 있을 때
    portalHint() {
      const c = this.crowd;
      if (!c || this.inside || c.perched || c.moving || c.target || c.portal || this.leaving || this.pendingSeat || this.fade > 0.05) return null;
      const me = this.toScreen(c.me.X, c.me.Z);
      const K = this.K;
      if (Math.hypot(me.x - K.x, (me.y - K.y) * 1.5) > 420 * K.k) return null;
      if (!this.freeSeat(3)) return null;
      return { x: K.x, y: K.y - 206 * K.k, label: '앉기' };
    }

    usePortal() {
      const c = this.crowd;
      const me = this.toScreen(c.me.X, c.me.Z);
      this.tapKotatsu(me.x, me.y);
    }

    seatPose(X, Z, perched) {
      if (this.inside) return { view: 'front', turn: 0, flip: X > 500 ? -1 : 1, stick: false };
      if (perched && this.seat) return { view: 'front', turn: SEATS[this.seat - 1].turn, flip: 1, stick: false };
      // 코타츠 쪽으로 고개를 돌리고 선다
      const toward = (this.K.x / this.w) * 1000 - X;
      return { view: 'front', turn: MC.clamp(toward / 900, -0.45, 0.45), flip: 1, stick: false };
    }

    lightPup(p, a) {
      if (this.inside) {
        // 어둑한 이불 속: 전체는 어둡게, 이불 천을 지나 든 방의 빛이 붉게
        p.light.ambient = 'rgba(46,12,4,0.42)';
        p.light.glow = [255, 112, 52];
        const d = Math.abs(p.x - this.w / 2) / (this.w * 0.5);
        p.light.glowA = MC.clamp(0.3 + 0.3 * d, 0.3, 0.6) * a;
        p.light.from = 70 * (p.x < this.w / 2 ? -1 : 1) * (p.flip < 0 ? -1 : 1);
        return;
      }
      const L = this.L;
      p.light.ambient = 'rgba(40,20,10,0.08)';
      p.light.glow = [255, 170, 100];
      const d = Math.hypot(p.x - L.stove.x, (p.y - L.stove.y) * 1.4);
      p.light.glowA = MC.clamp(0.95 - d / (620 * this.s), 0.16, 0.6) * a;
      p.light.from = 70 * (p.x > L.stove.x ? -1 : 1) * (p.flip < 0 ? -1 : 1);
    }

    // ── 귤 ───────────────────────────────────────────────
    // 귤 하나를 까먹는다. 앉아 있으면 바구니에서 꺼내고, 다 먹으면 껍질을 상판에 둔다
    eat() {
      if (!this.crowd || this.leaving) return false;
      if (this.pup.snack || this.pup.mood === 'eating' || this.crowd.moving) return false;
      if (this.crowd.perched && !this.inside) {
        if (this.bowl <= 0) {
          if (this.onToast) this.onToast('바구니가 비었어요. 조금 있으면 채워져요');
          return false;
        }
        this.bowl--;
      }
      return this.pup.eatMandarin();
    }

    leavePeel() {
      if (!this.crowd || !this.crowd.perched || this.inside || !this.seat) return;
      const S = SEATS[this.seat - 1];
      this.peels.push({ dx: MC.clamp(S.dx * 0.55, -120, 120) + MC.rand(-10, 10), dy: MC.rand(-8, 6), rot: MC.rand(0, 6) });
      if (this.peels.length > 6) this.peels.shift();
    }

    // ── 코타츠 속 들어가고 나오기 ─────────────────────────────
    toggleInside() {
      if (!this.crowd || this.leaving || this.crowd.portal) return this.inside;
      if (this.fadeTo === 1) return !this.inside;
      this.fadeTo = 1;
      this.swapTo = !this.inside;
      if (this.onCute) this.onCute(this.swapTo ? 'hop' : 'pop');
      return this.swapTo;
    }

    // 화면이 어두워진 사이에 이불 속과 방을 바꾼다
    swap() {
      const c = this.crowd;
      const wasSeat = c.perched ? this.seat : 0;
      c.target = null;
      c.path = null;
      c.toPerch = false;
      c.keys.x = c.keys.y = 0;
      if (c.perched) {
        c.perched = false;
        this.seat = 0;
      }
      this.inside = this.swapTo;
      const pup = this.pup;
      pup.setChair(false);
      if (this.inside) {
        // 앉아 있던 자리 쪽에서 이불을 들추고 기어 들어온다
        const X = wasSeat ? [130, 320, 500, 680, 870][wasSeat - 1] : 500;
        c.me.X = X;
        c.me.Z = 930;
        pup.setLie(true);
        pup.lie = 1;
      } else {
        // 코타츠 앞에서 이불을 젖히고 나온다
        const K = this.K;
        const q = c.pushOut(c.clampIn(this.toCanon(K.x + MC.rand(-60, 60) * K.k, K.y + 44 * K.k)));
        c.me.X = q.X;
        c.me.Z = q.Z;
        pup.setLie(false);
      }
      this.roll = null;
      c.posed = false;
      c.still = 0;
      c.layout();
      if (this.onInside) this.onInside(this.inside);
    }

    // ── 조작 ─────────────────────────────────────────────
    pointerDown(x, y) {
      if (this.leaving || this.fade > 0.3) return true;
      if (this.pup.hit(x, y)) {
        // 이불 속에서 내 멍이를 톡 하면 데굴데굴
        if (this.inside) this.rollOver();
        else this.pup.poke();
        return true;
      }
      if (this.crowd && this.crowd.boopAt(x, y)) {
        if (this.onCute) this.onCute('boop');
        return true;
      }
      if (this.inside) {
        // 굴러다니는 귤을 톡 하면 데구루루
        if (this.hitToy(x, y)) {
          this.kickToy();
          return true;
        }
        // 이불 아래쪽 끝을 톡 하면 밖으로
        if (y > this.h - 40 * this.s) {
          this.toggleInside();
          return true;
        }
        if (this.crowd && this.crowd.walkTo(x, y)) return true;
        return false;
      }
      if (this.hitKettle(x, y)) {
        this.puff(this.L.spout, 12);
        if (this.onPuff) this.onPuff();
        return true;
      }
      if (this.crowd && this.crowd.perched && this.hitBowl(x, y)) {
        this.eat();
        return true;
      }
      if (this.hitDoor(x, y)) {
        this.walkOut();
        return true;
      }
      if (this.crowd && this.hitKotatsu(x, y)) {
        this.tapKotatsu(x, y);
        return true;
      }
      if (this.crowd && this.crowd.walkTo(x, y)) {
        this.toDoor = false;
        return true;
      }
      return false;
    }

    // 미닫이문으로 걸어가서 밖으로 (마을로)
    walkOut() {
      if (!this.crowd || this.leaving) return;
      const d = this.doorCanon();
      this.crowd.go({ X: d.X + 30, Z: 40 });
      this.toDoor = true;
    }

    exitDoor() {
      if (this.leaving) return;
      this.leaving = true;
      this.toDoor = false;
      const d = this.doorCanon();
      this.crowd.portalWalk({ X: this.crowd.me.X, Z: this.crowd.me.Z }, { X: d.X, Z: -60 }, 0.9, false, () => {
        if (this.onExit) this.onExit();
      });
    }

    // ── 데굴데굴 ─────────────────────────────────────────
    // 누운 채로 옆으로 한 바퀴 구른다. 방에서는 엎드렸다가 구르고 다시 일어나 앉는다. 다른 사람 화면에서도 구른다
    rollOver(dir) {
      const c = this.crowd;
      if (!c || this.leaving || this.roll || c.portal || this.fade > 0.05 || this.pup.chairOn || this.pup.snack) return false;
      if (c.perched) c.hopDown();
      c.target = null;
      c.path = null;
      c.toPerch = false;
      this.pendingSeat = 0;
      this.toDoor = false;
      const d = dir || (c.keys.x ? Math.sign(c.keys.x) : c.me.X > 700 ? -1 : c.me.X < 300 ? 1 : Math.random() < 0.5 ? -1 : 1);
      this.roll = { t: 0, dir: d, X0: c.me.X };
      this.rollN = (Math.abs(this.rollN) + 1) * d;
      this.pup.setLie(true);
      this.pup.wake();
      if (this.onCute) this.onCute('roll');
      return true;
    }

    updateRolls(dt) {
      const c = this.crowd;
      if (this.roll) {
        const R = this.roll;
        R.t += dt;
        const u = Math.min(1, R.t / ROLL_T);
        // 구르는 만큼 옆으로 (몸통 둘레만큼)
        const dist = (this.inside ? 250 : 110) * ease(u);
        const q = c.clampIn({ X: R.X0 + R.dir * dist, Z: c.me.Z });
        if (c.free(q.X, q.Z)) c.me.X = q.X;
        c.posed = false;
        if (u >= 1) {
          this.roll = null;
          if (!this.inside) this.pup.setLie(false);
          this.pup.addHearts(1);
        }
      }
      // 다른 사람이 구르면 (횟수가 바뀌면) 그 멍이도 한 바퀴
      this.rollingSt.clear();
      for (const v of c.visitors.values()) {
        const n = v.st.rl || 0;
        let R = this.rolls.get(v.id);
        if (!R) {
          R = { n, t: ROLL_T };
          this.rolls.set(v.id, R);
        } else if (n !== R.n) {
          R.n = n;
          R.t = 0;
          R.dir = n < 0 ? -1 : 1;
        }
        if (R.t < ROLL_T) {
          R.t += dt;
          this.rollingSt.add(v.st);
        }
      }
      for (const id of this.rolls.keys()) if (!c.visitors.has(id)) this.rolls.delete(id);
    }

    rollTilt(p, me, v) {
      const R = me ? this.roll : v ? this.rolls.get(v.id) : null;
      if (!R || R.t >= ROLL_T || (!me && !R.dir)) return 0;
      const u = Math.min(1, R.t / ROLL_T);
      // 누운 멍이의 몸 가운데를 축으로 한 바퀴
      return { a: R.dir * ease(u) * Math.PI * 2, dy: -24 * p.k };
    }

    // ── 이불 속에서 노는 귤 ─────────────────────────────────
    // 기어가다 부딪히면 데구루루 밀려나고, 톡 치면 멀리 굴러간다. 이불 벽에 닿으면 통 튕긴다
    updateToy(dt) {
      const T = this.toy;
      const c = this.crowd;
      if (!c) return;
      const push = (X, Z, moving) => {
        const dx = T.X - X;
        const dz = (T.Z - Z) * 1.4;
        const d = Math.hypot(dx, dz);
        if (d > 100 || d < 0.01) return;
        const f = (moving ? 260 : 90) * (1 - d / 100);
        T.vx += (dx / d) * f * dt * 8;
        T.vz += (dz / d) * f * dt * 6;
      };
      push(c.me.X, c.me.Z, c.moving || !!this.roll);
      for (const v of c.visitors.values()) if (!v.leaving && v.st.k) push(v.x, v.y, !!v.st.w);
      const sp = Math.hypot(T.vx, T.vz);
      if (sp > 520) {
        T.vx *= 520 / sp;
        T.vz *= 520 / sp;
      }
      T.X += T.vx * dt;
      T.Z += T.vz * dt;
      const fr = Math.exp(-1.5 * dt);
      T.vx *= fr;
      T.vz *= fr;
      T.spin += T.vx * dt * 0.02;
      if (T.X < 40 || T.X > 960) {
        T.X = MC.clamp(T.X, 40, 960);
        T.vx *= -0.6;
      }
      if (T.Z < 20 || T.Z > 980) {
        T.Z = MC.clamp(T.Z, 20, 980);
        T.vz *= -0.6;
      }
    }

    hitToy(x, y) {
      const q = this.toScreen(this.toy.X, this.toy.Z);
      return Math.hypot(x - q.x, y - (q.y - 10 * q.k)) < 28 * q.k;
    }

    kickToy() {
      const T = this.toy;
      const c = this.crowd;
      const a = Math.atan2(T.Z - (c ? c.me.Z : 500), T.X - (c ? c.me.X : 500) || 1) + MC.rand(-0.6, 0.6);
      T.vx += Math.cos(a) * MC.rand(300, 460);
      T.vz += Math.sin(a) * MC.rand(200, 320);
      this.pup.hopV = -30;
      if (this.onCute) this.onCute('pop');
    }

    // 어둑한 이불 속의 귤: 빛이 덜 닿아 조금 짙은 주황
    drawToy(g, q) {
      const k = q.k;
      const r = 12 * k;
      g.save();
      g.fillStyle = 'rgba(0,0,0,0.35)';
      ell(g, q.x, q.y + 1 * k, r * 1.1, r * 0.32);
      g.fill();
      g.translate(q.x, q.y - r * 0.92);
      ell(g, 0, 0, r, r * 0.92);
      g.fillStyle = lin(g, -r, -r, r, r, [[0, '#e58a34'], [1, '#a84c14']]);
      g.fill();
      g.lineWidth = 1.6 * k;
      g.strokeStyle = 'rgba(60,20,6,0.8)';
      g.stroke();
      g.rotate(this.toy.spin);
      g.fillStyle = '#4f6b2e';
      ell(g, 0, -r * 0.82, 3.6 * k, 1.8 * k, 0.4);
      g.fill();
      g.fillStyle = 'rgba(255,220,170,0.35)';
      ell(g, -r * 0.35, -r * 0.35, r * 0.25, r * 0.15, -0.6);
      g.fill();
      g.restore();
    }

    puff(at, n) {
      for (let i = 0; i < n; i++) {
        this.steam.push({ x: at.x + MC.gauss() * 3 * at.k, y: at.y, vx: MC.gauss() * 10 * at.k, vy: -MC.rand(20, 40) * at.k, f: 0, max: MC.rand(1.4, 2.4), size: MC.rand(6, 11) * at.k, a: 0.3 });
      }
    }

    newFlake(any) {
      const W = this.L.win;
      const ww = W.x1 - W.x0;
      const wh = W.y1 - W.y0;
      const near = Math.random() < 0.3;
      return {
        x: Math.random() * ww,
        y: any ? Math.random() * wh : -6 * this.s,
        v: (near ? MC.rand(26, 40) : MC.rand(10, 20)) * this.s,
        r: (near ? MC.rand(1.6, 2.6) : MC.rand(0.7, 1.4)) * this.s,
        a: near ? MC.rand(0.75, 0.95) : MC.rand(0.45, 0.7),
        ph: Math.random() * 6,
        near,
      };
    }

    // ── 움직임 ───────────────────────────────────────────
    update(dt) {
      const { s } = this;
      this.t += dt;
      const t = this.t;
      // 바람: 가끔 한 줄기 불어 눈발이 비껴 날리고 곶감이 흔들린다
      this.nextGust -= dt;
      if (this.nextGust <= 0) {
        this.nextGust = MC.rand(9, 18);
        this.gustT = 0;
      }
      if (this.gustT != null) {
        this.gustT += dt;
        this.gust = Math.sin(Math.min(1, this.gustT / 4) * Math.PI);
        if (this.gustT > 4) this.gustT = null;
      } else this.gust *= 1 - Math.min(1, dt * 2);
      const W = this.L.win;
      const ww = W.x1 - W.x0;
      const wh = W.y1 - W.y0;
      const q = MC.clamp(this.quality, 0.4, 1);
      const nf = Math.round(70 * q);
      for (let i = 0; i < this.flakes.length; i++) {
        const f = this.flakes[i];
        const wind = (6 + 46 * this.gust) * (f.near ? 1.3 : 0.8) * s;
        f.x += (wind + Math.sin(t * 1.1 + f.ph) * 7 * s) * dt;
        f.y += f.v * dt * (1 - 0.25 * this.gust);
        if (f.y > wh + 4 * s || f.x > ww + 10 * s) {
          const nf2 = this.newFlake(false);
          if (f.x > ww + 10 * s) nf2.x = -6 * s;
          this.flakes[i] = nf2;
        }
      }
      if (this.flakes.length > nf) this.flakes.length = nf;
      // 처마에 쌓인 눈이 가끔 툭 떨어진다
      this.nextClump -= dt;
      if (this.nextClump <= 0) {
        this.nextClump = MC.rand(26, 60);
        this.clumps.push({ x: ww * MC.rand(0.15, 0.85), y: 10 * s, vy: 0, t: 0 });
        if (this.onFlump) setTimeout(() => this.onFlump && this.onFlump(), 450);
      }
      for (const cl of this.clumps) {
        cl.t += dt;
        cl.vy += 900 * s * dt;
        cl.y += cl.vy * dt;
      }
      this.clumps = this.clumps.filter((cl) => cl.y < wh + 20 * s);

      // 주전자 김 (가습기처럼 쉬지 않고)
      const sp = this.L.spout;
      this.acc = (this.acc || 0) + dt * 4.2 * q;
      while (this.acc >= 1) {
        this.acc -= 1;
        this.steam.push({ x: sp.x, y: sp.y, vx: MC.rand(4, 12) * sp.k, vy: -MC.rand(18, 32) * sp.k, f: 0, max: MC.rand(2.2, 3.6), size: MC.rand(5, 9) * sp.k, a: 0.22 });
      }
      for (const p of this.steam) {
        p.f += dt / p.max;
        p.vx += MC.fbm(t * 0.6 + p.max * 7) * 6 * s * dt;
        p.vy *= 1 - 0.3 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      this.steam = this.steam.filter((p) => p.f < 1);
      if (this.steam.length > 150) this.steam.splice(0, this.steam.length - 150);

      // 바구니는 조금씩 다시 찬다
      if (this.bowl < BOWL_MAX) {
        this.refill += dt;
        if (this.refill > 40) {
          this.refill = 0;
          this.bowl++;
        }
      }

      // 코타츠 속으로 들어가고 나오기: 어두워졌다가 다른 쪽에서 밝아진다
      if (this.fadeTo === 1) {
        this.fade = Math.min(1, this.fade + dt / 0.35);
        if (this.fade >= 1) {
          this.swap();
          this.fadeTo = 0;
        }
      } else this.fade = Math.max(0, this.fade - dt / 0.45);
      this.insideMix += ((this.inside ? 1 : 0) - this.insideMix) * Math.min(1, dt * 2.5);

      if (this.crowd) {
        this.updateRolls(dt);
        this.crowd.update(dt);
        const c = this.crowd;
        // 이불 속에서는 웅크리고 기어 다닌다 (앞발을 번갈아)
        this.pup.paddle = this.inside && c.moving ? 1 : 0;
        if (this.inside || this.roll) this.pup.setLie(true);
        for (const v of c.visitors.values()) v.pup.paddle = v.st.k && v.st.w ? 1 : 0;
        // 이불 아래쪽 끝까지 기어 나가면 밖으로
        if (this.inside && !c.portal && this.fadeTo === 0 && c.me.Z >= 995 && c.keys.y > 0) this.toggleInside();
        // 문으로 걸어가 닿으면 마을로. 문 앞에서 위쪽 방향키를 눌러도
        if (!this.inside && !this.leaving && !c.portal) {
          const d = this.doorCanon();
          const near = Math.abs(c.me.X - d.X) < 90 && c.me.Z < 90 && !c.perched;
          if (this.toDoor && !c.target) {
            if (near) this.exitDoor();
            else this.toDoor = false;
          } else if (near && c.keys.y < 0 && c.me.Z < 50) this.exitDoor();
        }
        // 같은 자리에 둘이 앉으면 꼬리표가 앞선 사람이 그 자리를 갖고, 나는 옆으로
        if (c.perched && this.seat && c.selfId) {
          for (const v of c.visitors.values()) {
            if (v.leaving || !v.st.q || v.st.l !== this.seat || v.st.k || !(v.id < c.selfId)) continue;
            const other = this.freeSeat(this.seat);
            if (other) {
              this.seat = other;
              this.pup.hopV = -50;
            } else {
              c.hopDown();
              this.seatsFull();
            }
            break;
          }
        }
      }
      if (this.inside) this.updateToy(dt);
      this.pup.update(dt, { walking: !!(this.crowd && this.crowd.moving), E: 0.8 });
    }

    // ── 그리기 ───────────────────────────────────────────
    draw(g) {
      if (!this.bg) return;
      if (this.inside) this.drawInside(g);
      else this.drawRoom(g);
      if (this.fade > 0.001) {
        g.fillStyle = `rgba(14,6,3,${Math.min(1, this.fade * 1.05)})`;
        g.fillRect(0, 0, this.w, this.h);
      }
    }

    drawRoom(g) {
      const { w, h, s, t, L } = this;
      const lampF = 0.94 + 0.06 * MC.fbm(t * 1.3 + 5);
      g.drawImage(this.bg, 0, 0, w, h);
      this.drawWindow(g);

      // 머리 위 한지 등과 방을 동그랗게 비추는 빛
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.34 * lampF;
      const R = 420 * s;
      g.drawImage(SPR.warm, L.lamp.x - R, L.lamp.y - R * 0.5, R * 2, R * 1.6);
      g.globalAlpha = 0.22 * lampF;
      g.drawImage(SPR.warm, this.K.x - 300 * s, this.K.y - 200 * s, 600 * s, 320 * s);
      // 난로 앞 바닥에 번지는 빛
      const st = L.stove;
      const fl = 0.9 + 0.1 * MC.fbm(t * 2.2);
      g.globalAlpha = 0.3 * fl;
      g.drawImage(SPR.heater, st.x - 200 * st.k, st.y - 160 * st.k, 400 * st.k, 260 * st.k);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      this.drawLamp(g, lampF);

      // 가구와 멍이들, 앞뒤 순서대로 (코타츠에 앉은 멍이는 코타츠보다 먼저: 이불에 몸이 묻힌다)
      const items = this.items.map((it) => ({ y: it.y, draw: () => { put(g, it.sp, it.x, it.y); if (it.after) it.after(g); } }));
      if (this.crowd) {
        this.crowd.lights(1);
        for (const d of this.crowd.drawables(this.dpr, null, w)) items.push(d);
      } else {
        items.push({ y: this.pup.y, draw: () => this.pup.draw(g, this.dpr) });
      }
      items.sort((a, b) => a.y - b.y);
      for (const it of items) it.draw(g);
      this.drawSteam(g);

      // 등 둘레를 떠다니는 먼지
      g.globalCompositeOperation = 'lighter';
      const nm = Math.round(this.motes.length * MC.clamp(this.quality, 0.4, 1));
      for (let i = 0; i < nm; i++) {
        const m = this.motes[i];
        const a = m.a + t * 0.05 * m.sp;
        const r = (40 + m.r * 200) * s;
        const x = L.lamp.x + Math.cos(a) * r + MC.fbm(t * 0.2 + m.ph) * 20 * s;
        const y = L.lamp.y + 120 * s + Math.sin(a * 1.3) * r * 0.5;
        g.globalAlpha = (0.5 + 0.5 * Math.sin(t * m.sp + m.ph)) * 0.3;
        const sz = 3 * s;
        g.drawImage(SPR.mote, x - sz, y - sz, sz * 2, sz * 2);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      g.drawImage(this.vignette, 0, 0, w, h);
    }

    // 김 서린 창: 추운 저녁, 떨어지는 낙엽, 처마 밑 곶감
    drawWindow(g) {
      const { s, t, L } = this;
      const W = L.win;
      const ww = W.x1 - W.x0;
      const wh = W.y1 - W.y0;
      g.save();
      g.beginPath();
      g.rect(W.x0, W.y0, ww, wh);
      g.clip();
      g.drawImage(this.outside, W.x0, W.y0, ww, wh);
      // 가로등의 차가운 빛
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.5;
      g.drawImage(SPR.cold, W.x0 + this.lampAt.x - 26 * s, W.y0 + this.lampAt.y - 20 * s, 52 * s, 52 * s);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      // 처마 밑에 매달린 곶감: 바람 따라 흔들흔들
      for (const p of this.persimmons) {
        const sway = Math.sin(t * 1.1 + p.ph) * 0.06 + this.gust * 0.12 * Math.sin(t * 3 + p.ph);
        g.save();
        g.translate(W.x0 + p.x, W.y0 + 10 * s);
        g.rotate(sway);
        g.strokeStyle = '#6b5a44';
        g.lineWidth = 1.2 * s;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(0, (p.n * 13 + 4) * s);
        g.stroke();
        for (let i = 0; i < p.n; i++) {
          ell(g, 0, (10 + i * 13) * s, 5 * s, 6 * s);
          g.fillStyle = i % 2 ? '#c26a2c' : '#b55d24';
          g.fill();
          g.strokeStyle = 'rgba(80,40,16,0.7)';
          g.lineWidth = 1;
          g.stroke();
        }
        g.restore();
      }
      // 함박눈: 가로등 빛 곁을 지날 때 반짝
      const lx = W.x0 + this.lampAt.x;
      const ly = W.y0 + this.lampAt.y;
      for (const f of this.flakes) {
        const x = W.x0 + f.x;
        const y = W.y0 + f.y;
        const lit = Math.max(0, 1 - Math.hypot(x - lx, (y - ly) * 0.7) / (60 * s));
        g.globalAlpha = Math.min(1, f.a + lit * 0.4);
        g.fillStyle = lit > 0.2 ? '#fff6dc' : '#ffffff';
        ell(g, x, y, f.r, f.r);
        g.fill();
      }
      g.globalAlpha = 1;
      // 처마에서 떨어지는 눈덩이
      for (const cl of this.clumps) {
        g.fillStyle = 'rgba(245,247,252,0.95)';
        for (const [dx, dy, r] of [[0, 0, 5], [-4, 2, 3.4], [4, 3, 3], [1, -3, 3]]) {
          ell(g, W.x0 + cl.x + dx * s, W.y0 + cl.y + dy * s, r * s, r * s);
          g.fill();
        }
      }
      // 바깥 창틀 아래에 소복이 쌓인 눈 (유리 너머)
      g.fillStyle = 'rgba(246,248,252,0.95)';
      g.beginPath();
      g.moveTo(W.x0, W.y1);
      for (let x = 0; x <= ww; x += 6 * s) g.lineTo(W.x0 + x, W.y1 - (9 + 3 * Math.sin(x * 0.07) + 2 * Math.sin(x * 0.19)) * s);
      g.lineTo(W.x1, W.y1);
      g.closePath();
      g.fill();
      // 김 서림: 아래쪽이 하얗게 뿌옇고, 구석엔 성에. 누가 그려 둔 발바닥 하나
      g.fillStyle = lin(g, 0, W.y0 + wh * 0.55, 0, W.y1, [[0, 'rgba(240,244,250,0)'], [1, 'rgba(240,244,250,0.42)']]);
      g.fillRect(W.x0, W.y0 + wh * 0.55, ww, wh * 0.45);
      for (const [cx, cy] of [[W.x0, W.y0], [W.x1, W.y0], [W.x0, W.y1], [W.x1, W.y1]]) {
        const fr = g.createRadialGradient(cx, cy, 0, cx, cy, 60 * s);
        fr.addColorStop(0, 'rgba(236,244,255,0.4)');
        fr.addColorStop(1, 'rgba(236,244,255,0)');
        g.fillStyle = fr;
        g.fillRect(cx - 60 * s, cy - 60 * s, 120 * s, 120 * s);
      }
      const px = W.x0 + ww * 0.82;
      const py = W.y1 - wh * 0.14;
      g.fillStyle = 'rgba(120,140,170,0.35)';
      ell(g, px, py, 7 * s, 6 * s);
      g.fill();
      for (const [dx, dy] of [[-8, -9], [-3, -12], [3, -12], [8, -9]]) {
        ell(g, px + dx * s, py + dy * s, 2.6 * s, 3 * s);
        g.fill();
      }
      g.restore();
      // 창틀: 나무 테와 살 (아래는 통유리, 위는 두 칸)
      g.strokeStyle = '#6c4a30';
      g.lineWidth = 9 * s;
      g.strokeRect(W.x0, W.y0, ww, wh);
      g.lineWidth = 4 * s;
      g.beginPath();
      for (const u of [1 / 3, 2 / 3]) {
        g.moveTo(W.x0 + ww * u, W.y0);
        g.lineTo(W.x0 + ww * u, W.y1);
      }
      g.moveTo(W.x0, W.y0 + wh * 0.42);
      g.lineTo(W.x1, W.y0 + wh * 0.42);
      g.stroke();
      // 창턱
      g.fillStyle = '#8a6141';
      g.fillRect(W.x0 - 14 * s, W.y1 + 2 * s, ww + 28 * s, 9 * s);

      g.fillStyle = 'rgba(40,24,14,0.3)';
      g.fillRect(W.x0 - 14 * s, W.y1 + 11 * s, ww + 28 * s, 3 * s);
      // 유리에 비친 방 안의 따뜻한 빛
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.12;
      g.drawImage(SPR.warm, W.x0 + ww * 0.3, W.y0 + wh * 0.1, ww * 0.6, wh * 0.8);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }

    // 한지 등: 끈에 매달려 아주 살짝 흔들린다
    drawLamp(g, lampF) {
      const { s, t, L } = this;
      const sway = Math.sin(t * 0.5) * 0.02;
      g.save();
      g.translate(L.lamp.x, 0);
      g.rotate(sway);
      g.strokeStyle = '#3a2a1e';
      g.lineWidth = 1.6 * s;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(0, L.lamp.y);
      g.stroke();
      const y = L.lamp.y;
      g.beginPath();
      g.moveTo(-46 * s, y + 44 * s);
      g.quadraticCurveTo(-50 * s, y + 4 * s, 0, y);
      g.quadraticCurveTo(50 * s, y + 4 * s, 46 * s, y + 44 * s);
      g.closePath();
      g.fillStyle = lin(g, 0, y, 0, y + 44 * s, [[0, '#fff1d0'], [1, '#ffd98f']]);
      g.fill();
      ink(g, 2 * s, 'rgba(90,60,30,0.8)');
      g.strokeStyle = 'rgba(160,110,60,0.4)';
      g.lineWidth = 1;
      for (const u of [-0.5, 0, 0.5]) {
        g.beginPath();
        g.moveTo(u * 10 * s, y + 2 * s);
        g.quadraticCurveTo(u * 40 * s, y + 20 * s, u * 46 * s, y + 44 * s);
        g.stroke();
      }
      g.restore();
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.5 * lampF;
      g.drawImage(SPR.warm, L.lamp.x - 70 * s, y - 10 * s, 140 * s, 90 * s);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }

    // 석유난로 창의 주황 불빛
    drawStoveGlow(g) {
      const W = this.L.stoveWin;
      const fl = 0.85 + 0.15 * MC.fbm(this.t * 2.8 + 2);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.85 * fl;
      g.drawImage(SPR.heater, W.x - 28 * W.k, W.y - 34 * W.k, 56 * W.k, 70 * W.k);
      g.globalAlpha = 0.45 * fl;
      g.drawImage(SPR.heater, W.x - 70 * W.k, W.y - 60 * W.k, 140 * W.k, 120 * W.k);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }

    // 상판 위: 뒤쪽 자리 멍이들의 앞발, 귤 바구니(남은 만큼), 까먹고 둔 껍질
    drawTableTop(g) {
      this.drawTablePaws(g);
      const K = this.K;
      const k = K.k;
      const bx = K.x;
      const by = K.y - 92 * k;
      put(g, this.props.basketTop, bx, by);
      const spots = [[-22, -6], [0, -9], [22, -6], [-11, -16], [11, -16], [0, -22]];
      for (let i = 0; i < Math.min(this.bowl, spots.length); i++) {
        const [dx, dy] = spots[i];
        put(g, this.props.mandarin, bx + dx * k, by + dy * k);
      }
      for (const p of this.peels) {
        g.save();
        g.translate(K.x + p.dx * k, K.y - 96 * k + p.dy * k);
        g.rotate(p.rot);
        g.scale(k, k * 0.55);
        for (let i = 0; i < 5; i++) {
          g.rotate((Math.PI * 2) / 5);
          g.beginPath();
          g.moveTo(-4, 0);
          g.quadraticCurveTo(-5, -9, 0, -13);
          g.quadraticCurveTo(5, -9, 4, 0);
          g.closePath();
          g.fillStyle = '#f08f2e';
          g.fill();
          g.strokeStyle = '#b4611f';
          g.lineWidth = 1.2;
          g.stroke();
        }
        g.restore();
      }
    }

    drawSteam(g) {
      if (!this.steam.length) return;
      g.globalCompositeOperation = 'lighter';
      for (const p of this.steam) {
        const a = Math.sin(p.f * Math.PI) * p.a;
        const sz = p.size * (1 + p.f * 2.4);
        g.globalAlpha = a;
        g.drawImage(SPR.steam, p.x - sz, p.y - sz, sz * 2, sz * 2);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }

    // 코타츠 속: 잠깐 숨어 장난치는 어둑한 이불 속. 방의 빛이 이불 천을 지나 붉게 비치고, 이불 끝 틈으로 가늘게 새어 든다.
    // 함께 앉은 이들의 뒷발이 이불 자락 밑으로 빼꼼. 멍이들은 납작 엎드려 기어 다니고, 굴러다니는 귤을 툭툭 친다
    drawInside(g) {
      const { w, h, s, t } = this;
      const I = this.IN;
      g.drawImage(this.inBg, 0, 0, w, h);
      const glowF = 0.92 + 0.08 * MC.fbm(t * 0.35);
      // 이불 천을 지나 드는 빛: 저 앞과 양옆 이불이 붉게 은은히
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.26 * glowF;
      g.drawImage(SPR.heater, I.fx0 - w * 0.1, I.ceil - h * 0.06, (I.fx1 - I.fx0) + w * 0.2, (I.far - I.ceil) + h * 0.16);
      g.globalAlpha = 0.18 * glowF;
      g.drawImage(SPR.heater, -w * 0.25, h * 0.1, w * 0.5, h * 0.9);
      g.drawImage(SPR.heater, w * 0.75, h * 0.1, w * 0.5, h * 0.9);
      g.globalAlpha = 0.12 * glowF;
      g.drawImage(SPR.heater, w / 2 - w * 0.5, I.far - h * 0.02, w, h * 0.6);
      // 이불 끝 틈으로 새어 드는 방의 빛: 바닥에 닿은 이불 자락을 따라 가늘게
      const leak = (x0, y0, x1, y1, a) => {
        g.globalAlpha = a;
        g.strokeStyle = 'rgba(255,214,160,0.55)';
        g.lineWidth = 2 * s;
        g.beginPath();
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        g.stroke();
      };
      const lk = 0.55 + 0.1 * Math.sin(t * 0.4);
      leak(I.fx0 + 10 * s, I.far + 1, I.fx1 - 10 * s, I.far + 1, 0.5 * lk);
      leak(this.wallX(-1, I.far + 4 * s), I.far + 4 * s, this.wallX(-1, h), h, 0.6 * lk);
      leak(this.wallX(1, I.far + 4 * s), I.far + 4 * s, this.wallX(1, h), h, 0.6 * lk);
      g.globalAlpha = 0.14 * lk;
      g.drawImage(SPR.warm, I.fx0, I.far - 14 * s, I.fx1 - I.fx0, 40 * s);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';

      // 함께 앉은 사람들의 뒷발이 이불 자락 밑으로 빼꼼 (나도 앉아 있다가 들어왔으면 그 자리는 비었다)
      if (this.crowd) {
        g.save();
        g.beginPath();
        g.moveTo(I.fx0, I.far);
        g.lineTo(I.fx1, I.far);
        g.lineTo(w * 1.15, h * 1.06);
        g.lineTo(-w * 0.15, h * 1.06);
        g.closePath();
        g.clip();
        for (const v of this.crowd.visitors.values()) {
          if (v.leaving || !v.st.q || !v.st.l || v.st.k) continue;
          this.drawFeet(g, v.st.l, v.pup, MC.hash(v.id.length * 1.7 + v.id.charCodeAt(0)), MC.clamp(v.fade, 0, 1));
        }
        g.restore();
      }

      // 멍이들: 납작 엎드려 기어 다니고, 좁아서 서로 겹친다
      if (this.crowd) {
        this.crowd.lights(1);
        const items = this.crowd.drawables(this.dpr, null, w);
        const tq = this.toScreen(this.toy.X, this.toy.Z);
        items.push({ y: tq.y, draw: () => this.drawToy(g, tq) });
        items.sort((a, b) => a.y - b.y);
        for (const it of items) it.draw(g);
      }

      // 어둑한 빛 속을 떠다니는 먼지
      g.globalCompositeOperation = 'lighter';
      const nm = Math.round(this.motes.length * 0.6);
      for (let i = 0; i < nm; i++) {
        const m = this.motes[i];
        const x = w * (0.25 + 0.5 * ((m.r + t * 0.008 * m.sp) % 1));
        const y = MC.lerp(I.ceil, I.far + h * 0.25, 0.5 + 0.5 * Math.sin(t * 0.15 * m.sp + m.ph));
        g.globalAlpha = (0.5 + 0.5 * Math.sin(t * m.sp + m.ph)) * 0.22;
        const sz = 2.2 * s;
        g.drawImage(SPR.mote, x - sz, y - sz, sz * 2, sz * 2);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      g.drawImage(this.inVig, 0, 0, w, h);
    }

    // 자리(i)에 앉은 멍이의 두 뒷발: 양옆 자리는 옆 이불 밑에서, 뒤쪽 자리는 저 앞 이불 밑에서 들어와 있다
    drawFeet(g, i, pup, seed, a = 1) {
      const { w, h, s, t } = this;
      const I = this.IN;
      const S = SEATS[i - 1];
      const wig = Math.sin(t * 1.6 + seed * 9) * Math.sin(t * 0.37 + seed * 4);
      let x;
      let y;
      let rot;
      let k;
      if (S.side) {
        y = I.far + (h - I.far) * 0.32;
        x = this.wallX(S.side, y) - S.side * 26 * s;
        rot = S.side < 0 ? -Math.PI / 2 : Math.PI / 2;
        k = s * 1.9;
      } else {
        x = w / 2 + (S.dx / 112) * (I.fx1 - I.fx0) * 0.28;
        y = I.far + 14 * s;
        rot = 0;
        k = s * 1.5;
      }
      const col = pup.coat;
      g.save();
      if (a < 1) g.globalAlpha = a;
      g.translate(x, y);
      g.rotate(rot);
      for (const side of [-1, 1]) {
        g.save();
        g.translate(side * 15 * k, 0);
        g.rotate(side * 0.1 + wig * 0.14 * side);
        g.beginPath();
        g.moveTo(-8 * k, -34 * k);
        g.lineTo(-8 * k, 4 * k);
        g.quadraticCurveTo(0, 12 * k, 8 * k, 4 * k);
        g.lineTo(8 * k, -34 * k);
        g.closePath();
        g.fillStyle = col.lo;
        g.fill();
        g.lineWidth = 2 * k;
        g.strokeStyle = INK;
        g.stroke();
        ell(g, 0, 8 * k, 11 * k, 10 * k);
        g.fillStyle = '#fffaf1';
        g.fill();
        g.stroke();
        g.fillStyle = '#ffb3c1';
        ell(g, 0, 11 * k, 5 * k, 4 * k);
        g.fill();
        for (const [tx, ty] of [[-5.4, 3], [0, 1], [5.4, 3]]) {
          ell(g, tx * k, ty * k, 2.2 * k, 2.4 * k);
          g.fill();
        }
        // 어둑한 이불 속의 붉은 빛
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = 'rgba(60,14,4,0.45)';
        g.fillRect(-16 * k, -36 * k, 32 * k, 60 * k);
        g.globalCompositeOperation = 'source-over';
        g.restore();
      }
      g.restore();
    }
  }

  MC.LodgeScene = LodgeScene;
})(window.MC = window.MC || {});
