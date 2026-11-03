/* 멍캠프 — 글램핑 텐트 안
   벨텐트 안쪽: 가운데 나무 기둥, 꼭대기에서 사방으로 늘어진 줄전구, 기둥에 걸린 등불과 말린 꽃 리스,
   무쇠 난로(유리창 안에서 불이 일렁인다)와 김이 나는 주전자, 장작 바구니, 니트 담요를 덮은 침대와 멍이 쿠션,
   러그와 낮은 탁자(등잔, 코코아, 펼친 책, 다육이), 기타, 배낭, 니트 푸프, 양털 깔개, 가랜드,
   둥근 그물창 너머의 달, 걷어 올린 문 너머의 모닥불과 별.
   '불빛'으로 조명을 낮추고, '비'를 부르면 천막 위로 빗소리가 내린다. */
(function (MC) {
  'use strict';

  const INK = 'rgba(58,36,24,0.9)';
  const INK2 = 'rgba(58,36,24,0.45)';

  // 프롭 한 장: 디자인 단위로 그리고, 바닥에 닿는 점(ax, ay)을 기준으로 놓는다
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
  function line(g, pts) {
    g.beginPath();
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
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
      warm: MC.glow([255, 176, 96], 128, 0.22),
      bulb: MC.glow([255, 210, 140], 64, 0.16),
      fire: MC.glow([255, 132, 52], 128, 0.18),
      mote: MC.glow([255, 236, 200], 32, 0.3),
      steam: MC.glow([255, 250, 242], 64, 0.4),
      moon: MC.glow([214, 226, 255], 64, 0.25),
    };
    return SPR;
  }

  // 침대에 엎드려 누울 수 있는 멍이 수
  const BED_SPOTS = 3;

  // 여럿이 오면 앉는 자리 (장면 좌표: X는 화면 가로 천분율, Z는 바닥 깊이 천분율)
  const TENT_SEATS = [
    [480, 870], [600, 930], [300, 720], [545, 620], [705, 825], [150, 515], [410, 180], [510, 260],
  ].map(([X, Z]) => ({ X, Z }));

  class TentScene {
    constructor(opts = {}) {
      this.preview = !!opts.preview;
      this.from = opts.from || null;
      this.quality = 1;
      this.t = 0;
      this.w = 1;
      this.h = 1;
      this.s = 1;
      this.stoveE = 0.72;
      this.flare = 0;
      this.dim = 0;
      this.dimTo = 0;
      this.rain = 0;
      this.rainTo = 0;
      this.steam = [];
      this.sparks = [];
      this.outSparks = [];
      this.motes = [];
      this.events = null;
      this.onExit = null;
      this.onLog = null;
      this.onCute = null;
      this.onToggle = null;
      this.onToast = null;
      this.bedSpot = 0; // 내가 누운 침대 자리 (1..BED_SPOTS, 0이면 아님)
      this.pendingSpot = 0;
      this.toDoor = false;
      this.leaving = false;
      this.useGL = null;
      this.seed = Math.random() * 50;
      this.rnd = MC.rng(9090);
      sprites();
      // 멍이: 줄무늬 잠옷 고깔모자를 쓰고 있다
      this.pup = new MC.Pup({ outfit: 'nightcap', light: { ambient: 'rgba(36,18,10,0.1)', glow: [255, 150, 80], glowA: 0.3, from: -70 } });
      this.pup.onEvent = (kind) => { if (this.onCute) this.onCute(kind); };
      if (!this.preview && MC.Crowd) {
        const sc = this;
        this.crowd = new MC.Crowd(this.pup, {
          place: 'tent',
          outfit: 'nightcap',
          light: { ambient: 'rgba(36,18,10,0.1)', glow: [255, 150, 80], glowA: 0.3, from: -70 },
          start: { X: 480, Z: 870 },
          toScreen: (X, Z) => this.toScreen(X, Z),
          toCanon: (x, y) => this.toCanon(x, y),
          bounds: () => ({ x0: 24, x1: 976, z0: 0, z1: 1000 }),
          inside: (X, Z) => this.onFloor(X, Z),
          blockers: () => this.blockers || [],
          floor: (x, y) => y > this.L.floorTop - 6 * this.s,
          // 모닥불 앞과 같은 빠르기. 텐트 앞쪽은 멍이가 크게 보이니 그만큼 걸음도 넓게
          speed: () => {
            const c = this.crowd;
            const z = c ? MC.clamp(c.me.Z / 1000, 0, 1) : 0.5;
            return 150 * this.s * (0.9 + 0.35 * z);
          },
          pose: (X, Z) => this.seatPose(X, Z),
          seats: () => TENT_SEATS,
          lightFor: (p, X, Z, a) => this.lightPup(p, a),
          env: () => ({}),
          // 침대: 정해진 자리(BED_SPOTS)에만 엎드려 눕는다
          perch: {
            get X() {
              return sc.bedFootOf(sc.bedSpot || sc.pendingSpot || 2).X;
            },
            get Z() {
              return sc.bedFootOf(sc.bedSpot || sc.pendingSpot || 2).Z;
            },
            seat: (id, st) => sc.bedSeat(id, st),
            hit: (x, y) => sc.hitBed(x, y),
            sortY: () => sc.L.bed.y + 1,
            claim: () => sc.claimBed(),
            onSit: () => sc.lieDown(),
            onLeave: () => sc.getUp(),
            onFull: () => sc.bedFull(),
          },
          extra: () => ({ l: sc.crowd && sc.crowd.perched ? sc.bedSpot : 0 }),
        });
        // 텐트 안에서는 바닥에서 시작한다
        this.crowd.perched = false;
      }
    }

    audioParams() {
      return { stove: Math.min(1.25, this.stoveE + this.flare * 0.35), rain: this.rain };
    }

    // ── 좌표 ─────────────────────────────────────────────
    kAt(y) {
      const L = this.L;
      const z = MC.clamp((y - L.floorTop) / (L.floorBot - L.floorTop), -0.4, 1.2);
      return this.s * (0.72 + 0.62 * z);
    }

    toScreen(X, Z) {
      const L = this.L;
      const y = L.floorTop + (Z / 1000) * (L.floorBot - L.floorTop);
      return { x: (X / 1000) * this.w, y, k: this.kAt(y) };
    }

    toCanon(x, y) {
      const L = this.L;
      return { X: (x / this.w) * 1000, Z: ((y - L.floorTop) / (L.floorBot - L.floorTop)) * 1000 };
    }

    // 먼 벽이 바닥과 만나는 곡선 (둥근 바닥의 뒤쪽 가장자리)
    wallBase(x) {
      const F = this.L.F;
      const u = (x - F.cx) / F.rx;
      if (Math.abs(u) >= 1) return F.cy;
      return F.cy - F.ry * Math.sqrt(1 - u * u);
    }

    wallTop(x) {
      const F = this.L.F;
      const u = (x - F.cx) / F.rx;
      return this.wallBase(x) - this.L.wallH * (1 + 0.7 * u * u);
    }

    onFloor(X, Z) {
      const q = this.toScreen(X, Z);
      return q.y >= this.wallBase(q.x) + 10 * this.s;
    }

    // ── 크기와 배치 ───────────────────────────────────────
    resize(w, h, dpr) {
      this.w = w;
      this.h = h;
      this.dpr = dpr;
      const s = (this.s = MC.clamp(Math.min(w / 520, h / 800), 0.55, 1.4));
      const P = w < h * 0.9;
      const wallY = h * (P ? 0.455 : 0.49);
      const L = (this.L = { portrait: P });
      L.F = { cx: w * 0.5, cy: h * 0.93, rx: w * (P ? 1.08 : 0.74) };
      L.F.ry = L.F.cy - wallY;
      L.wallH = h * (P ? 0.05 : 0.065);
      L.floorTop = wallY + 10 * s;
      L.floorBot = h - 12 * s;
      L.apex = { x: w * 0.5, y: h * (P ? 0.03 : 0.045) };
      const at = (x, y) => ({ x, y, k: this.kAt(y) });
      const dx = w * (P ? 0.4 : 0.395);
      L.door = { x: dx, y: this.wallBase(dx) + 3 * s, w: (P ? 112 : 150) * s, h: (P ? 200 : 236) * s };
      L.pole = at(w * (P ? 0.66 : 0.565), h * (P ? 0.6 : 0.655));
      L.lamp = { x: L.pole.x, y: h * (P ? 0.25 : 0.29) };
      L.stove = at(w * (P ? 0.16 : 0.13), h * (P ? 0.615 : 0.675));
      L.basket = at(w * (P ? 0.35 : 0.235), h * (P ? 0.65 : 0.715));
      L.bed = at(w * (P ? 0.8 : 0.835), h * (P ? 0.745 : 0.76));
      L.table = at(w * (P ? 0.37 : 0.415), h * (P ? 0.8 : 0.805));
      L.rug = { x: w * (P ? 0.42 : 0.43), y: h * (P ? 0.835 : 0.84), rx: w * (P ? 0.44 : 0.27), ry: h * (P ? 0.085 : 0.11) };
      L.pouf = at(w * (P ? 0.14 : 0.2), h * (P ? 0.93 : 0.935));
      const gx = w * (P ? 0.57 : 0.49);
      L.guitar = at(gx, this.wallBase(gx) + 8 * s);
      L.pack = at(w * (P ? 0.07 : 0.64), h * (P ? 0.75 : 0.82));
      const bx = L.door.x - L.door.w * 0.62;
      L.boots = { x: bx, y: this.wallBase(bx) + 16 * s, k: this.kAt(this.wallBase(bx) + 16 * s) };
      L.skin = { x: w * (P ? 0.66 : 0.71), y: h * (P ? 0.875 : 0.88) };
      L.win = { x: w * (P ? 0.83 : 0.79), y: h * (P ? 0.255 : 0.255), r: (P ? 34 : 44) * s };
      this.buildBackground();
      this.buildProps();
      this.buildLights();
      this.buildOutside();
      this.buildBlockers();
      if (!this.motes.length) {
        for (let i = 0; i < 22; i++) this.motes.push({ a: this.rnd() * 6.28, r: this.rnd(), ph: this.rnd() * 9, sp: 0.4 + this.rnd() * 0.6 });
      }
      if (this.crowd) {
        this.crowd.layout();
        // 모닥불에서 문으로 들어오면, 문간에서 살며시 나타나 안으로 걸어 들어온다
        if (this.from === 'fire' && !this.entered) {
          this.entered = true;
          const d = this.doorCanon();
          this.crowd.portalWalk({ X: d.X, Z: -60 }, { X: d.X + 30, Z: 260 }, 1.2, true);
        }
      }
    }

    doorCanon() {
      return this.toCanon(this.L.door.x, this.L.floorTop);
    }

    buildBlockers() {
      const L = this.L;
      const s = this.s;
      const span = L.floorBot - L.floorTop;
      const B = (x, y, rx, ry) => ({ x: (x / this.w) * 1000, z: ((y - L.floorTop) / span) * 1000, rx: (rx / this.w) * 1000, rz: (ry / span) * 1000 });
      this.blockers = [
        B(L.stove.x, L.stove.y - 10 * L.stove.k, 64 * L.stove.k, 24 * L.stove.k),
        B(L.basket.x, L.basket.y - 8 * L.basket.k, 40 * L.basket.k, 16 * L.basket.k),
        B(L.table.x, L.table.y - 12 * L.table.k, 78 * L.table.k, 20 * L.table.k),
        B(L.pole.x, L.pole.y - 2 * s, 14 * L.pole.k, 7 * L.pole.k),
        B(L.bed.x + 14 * L.bed.k, L.bed.y - 20 * L.bed.k, 206 * L.bed.k, 30 * L.bed.k),
        B(L.pack.x, L.pack.y - 8 * L.pack.k, 36 * L.pack.k, 14 * L.pack.k),
        B(L.pouf.x, L.pouf.y - 14 * L.pouf.k, 52 * L.pouf.k, 18 * L.pouf.k),
      ];
    }

    // ── 배경: 천막, 기둥 자리, 바닥, 러그 ───────────────────
    buildBackground() {
      const { w, h, dpr, s, L } = this;
      const rnd = MC.rng(4711);
      const c = (this.bg = MC.canvas(w * dpr, h * dpr));
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      g.lineJoin = 'round';
      g.lineCap = 'round';

      // 지붕 천: 기둥에 걸린 등불을 중심으로 따뜻하게 밝다
      const R = Math.max(w, h) * 0.95;
      const roof = g.createRadialGradient(L.lamp.x, L.lamp.y, 10, L.lamp.x, L.lamp.y + h * 0.05, R);
      roof.addColorStop(0, '#f6dcb4');
      roof.addColorStop(0.18, '#e6c093');
      roof.addColorStop(0.42, '#b98d65');
      roof.addColorStop(0.7, '#6f4d38');
      roof.addColorStop(1, '#2d1f17');
      g.fillStyle = roof;
      g.fillRect(0, 0, w, h);

      // 솔기: 꼭대기에서 사방으로. 천 조각마다 가운데가 살짝 불룩해 보이게 밝은 띠를 얹는다
      const ends = [];
      const N = 13;
      for (let i = 0; i <= N; i++) {
        const th = Math.PI * (i / N);
        const x = L.F.cx - Math.cos(th) * L.F.rx * 0.98;
        ends.push([x, this.wallTop(MC.clamp(x, -w, 2 * w))]);
      }
      for (const fx of [-0.3, 0.06, 0.32, 0.68, 0.94, 1.3]) ends.push([w * fx, fx < 0 || fx > 1 ? h * 0.32 : -20]);
      const ax = L.apex.x;
      const ay = L.apex.y;
      for (let i = 0; i < ends.length - 1; i++) {
        if (i >= N) break;
        const [x0, y0] = ends[i];
        const [x1, y1] = ends[i + 1];
        const mx = (x0 + x1) / 2;
        const my = (y0 + y1) / 2;
        g.strokeStyle = 'rgba(255,238,210,0.08)';
        g.lineWidth = Math.hypot(x1 - x0, y1 - y0) * 0.42;
        g.beginPath();
        g.moveTo(ax, ay);
        g.lineTo(mx, my);
        g.stroke();
      }
      for (const [x, y] of ends) {
        g.strokeStyle = 'rgba(70,44,28,0.16)';
        g.lineWidth = 9 * s;
        g.beginPath();
        g.moveTo(ax, ay);
        g.lineTo(x, y);
        g.stroke();
        g.strokeStyle = 'rgba(70,44,28,0.42)';
        g.lineWidth = 1.6 * s;
        g.stroke();
        g.strokeStyle = 'rgba(255,240,214,0.16)';
        g.lineWidth = 1 * s;
        g.beginPath();
        g.moveTo(ax + 2 * s, ay);
        g.lineTo(x + 3 * s, y);
        g.stroke();
      }
      // 캔버스 천의 결
      g.lineWidth = Math.max(0.6, 0.8 * s);
      for (let i = 0; i < 2600; i++) {
        const x = rnd() * w;
        const y = rnd() * h * 0.7;
        const a = 0.025 + rnd() * 0.03;
        g.strokeStyle = rnd() < 0.5 ? `rgba(80,52,32,${a})` : `rgba(255,240,215,${a})`;
        const len = (3 + rnd() * 9) * s;
        g.beginPath();
        if (rnd() < 0.5) {
          g.moveTo(x, y);
          g.lineTo(x + len, y);
        } else {
          g.moveTo(x, y);
          g.lineTo(x, y + len);
        }
        g.stroke();
      }

      // 옆벽 띠: 지붕 끝(처마)에서 바닥까지
      const arc = (fn, dir) => {
        const pts = [];
        for (let x = -10; x <= w + 10; x += 8) pts.push([x, fn(x)]);
        if (dir < 0) pts.reverse();
        return pts;
      };
      const top = arc((x) => this.wallTop(x), 1);
      const base = arc((x) => this.wallBase(x), -1);
      g.beginPath();
      g.moveTo(top[0][0], top[0][1]);
      for (const [x, y] of top) g.lineTo(x, y);
      for (const [x, y] of base) g.lineTo(x, y);
      g.closePath();
      g.fillStyle = lin(g, 0, L.F.cy - L.F.ry - L.wallH, 0, L.F.cy - L.F.ry, [[0, '#c69d73'], [1, '#9a7253']]);
      g.fill();
      // 옆벽 주름
      for (let x = 0; x <= w; x += 22 * s) {
        const t = this.wallTop(x);
        const b = this.wallBase(x);
        g.strokeStyle = `rgba(70,44,28,${0.08 + rnd() * 0.08})`;
        g.lineWidth = (1 + rnd() * 2) * s;
        g.beginPath();
        g.moveTo(x + rnd() * 6, t + 2);
        g.lineTo(x + rnd() * 6, b - 2);
        g.stroke();
      }
      // 처마 선과 고리
      g.beginPath();
      top.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      ink(g, 2.2 * s, 'rgba(64,40,26,0.55)');
      for (let x = 30 * s; x < w; x += 64 * s) {
        ell(g, x, this.wallTop(x) + 4 * s, 2.6 * s, 2.6 * s);
        g.fillStyle = 'rgba(64,40,26,0.55)';
        g.fill();
      }
      // 바닥 깔개가 올라온 테두리 (욕조 모양)
      const tub = arc((x) => this.wallBase(x) - 9 * s, 1);
      g.beginPath();
      g.moveTo(tub[0][0], tub[0][1]);
      for (const [x, y] of tub) g.lineTo(x, y);
      for (const [x, y] of base) g.lineTo(x, y + 2);
      g.closePath();
      g.fillStyle = '#3f3a32';
      g.fill();

      // 바닥: 따뜻한 나무 마루. 먼 곳으로 모이는 널빤지
      g.save();
      g.beginPath();
      base.slice().reverse().forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.lineTo(w + 10, h + 10);
      g.lineTo(-10, h + 10);
      g.closePath();
      g.clip();
      const fl = g.createRadialGradient(w * 0.46, h * 0.78, 10, w * 0.46, h * 0.8, Math.max(w, h) * 0.7);
      fl.addColorStop(0, '#a77149');
      fl.addColorStop(0.45, '#7e5133');
      fl.addColorStop(1, '#2c1a10');
      g.fillStyle = fl;
      g.fillRect(0, 0, w, h);
      const vp = { x: L.F.cx, y: L.F.cy - L.F.ry - h * 0.42 };
      const pw = 58 * s;
      for (let i = -24; i <= 24; i++) {
        const xb = L.F.cx + i * pw;
        g.strokeStyle = 'rgba(38,22,12,0.42)';
        g.lineWidth = 1.4 * s;
        g.beginPath();
        g.moveTo(vp.x + (xb - vp.x) * 0.1, vp.y + (h + 20 - vp.y) * 0.1);
        g.lineTo(xb, h + 20);
        g.stroke();
        // 널빤지 결과 이음매
        g.strokeStyle = 'rgba(255,214,170,0.05)';
        g.lineWidth = 6 * s;
        g.beginPath();
        g.moveTo(vp.x + (xb + pw * 0.5 - vp.x) * 0.1, vp.y + (h + 20 - vp.y) * 0.1);
        g.lineTo(xb + pw * 0.5, h + 20);
        g.stroke();
        for (let j = 0; j < 3; j++) {
          const u = 0.15 + rnd() * 0.85;
          const y = vp.y + (h + 20 - vp.y) * u;
          const x0 = vp.x + (xb - vp.x) * u;
          const x1 = vp.x + (xb + pw - vp.x) * u;
          g.strokeStyle = 'rgba(38,22,12,0.3)';
          g.lineWidth = 1 * s;
          g.beginPath();
          g.moveTo(x0, y);
          g.lineTo(x1, y + 1);
          g.stroke();
        }
      }
      g.restore();
      // 벽 아래 그늘
      g.save();
      g.beginPath();
      base.slice().reverse().forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      for (const [x, y] of base) g.lineTo(x, y + 26 * s);
      g.closePath();
      g.fillStyle = 'rgba(30,18,10,0.35)';
      g.fill();
      g.restore();

      this.paintRug(g, rnd);
      this.paintSkin(g, rnd);
      this.paintBoots(g);
      this.paintBunting(g);

      // 문과 그물창 자리 (바깥은 매번 그린다)
      g.save();
      g.translate(L.door.x, L.door.y);
      this.doorPath(g);
      g.fillStyle = '#0b1022';
      g.fill();
      g.restore();
      ell(g, L.win.x, L.win.y, L.win.r, L.win.r * 0.92);
      g.fillStyle = '#0b1022';
      g.fill();

      // 가장자리를 감싸는 어스름
      const v = (this.vignette = MC.canvas(w * dpr, h * dpr));
      const vg = v.getContext('2d');
      vg.scale(dpr, dpr);
      const grd = vg.createRadialGradient(w * 0.48, h * 0.5, Math.min(w, h) * 0.32, w * 0.5, h * 0.55, Math.max(w, h) * 0.78);
      grd.addColorStop(0, 'rgba(20,10,6,0)');
      grd.addColorStop(1, 'rgba(20,10,6,0.62)');
      vg.fillStyle = grd;
      vg.fillRect(0, 0, w, h);
    }

    doorPath(g) {
      const { w: dw, h: dh } = this.L.door;
      g.beginPath();
      g.moveTo(-dw / 2, 0);
      g.quadraticCurveTo(-dw * 0.44, -dh * 0.58, 0, -dh);
      g.quadraticCurveTo(dw * 0.44, -dh * 0.58, dw / 2, 0);
      g.closePath();
    }

    // 러그: 테라코타와 쪽빛의 킬림. 원근에 맞춰 사다리꼴로 눕는다
    paintRug(g, rnd) {
      const { rug } = this.L;
      const s = this.s;
      const far = 0.8;
      const map = (u, v) => {
        const sx = MC.lerp(far, 1.12, (v + 1) / 2);
        return [rug.x + u * rug.rx * sx, rug.y + v * rug.ry];
      };
      const quad = (u0, v0, u1, v1) => {
        const a = map(u0, v0);
        const b = map(u1, v0);
        const c = map(u1, v1);
        const d = map(u0, v1);
        line(g, [a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]]);
        g.closePath();
      };
      // 그림자
      g.save();
      quad(-1.02, -0.96, 1.03, 1.06);
      g.fillStyle = 'rgba(25,14,8,0.35)';
      g.fill();
      g.restore();
      quad(-1, -1, 1, 1);
      g.fillStyle = '#a9513a';
      g.fill();
      quad(-0.9, -0.84, 0.9, 0.84);
      g.fillStyle = '#efe2c8';
      g.fill();
      quad(-0.84, -0.73, 0.84, 0.73);
      g.fillStyle = '#3e4f72';
      g.fill();
      quad(-0.8, -0.65, 0.8, 0.65);
      g.fillStyle = '#b55c41';
      g.fill();
      // 마름모 무늬
      const diamond = (u, v, du, dv, col) => {
        const p = [map(u, v - dv), map(u + du, v), map(u, v + dv), map(u - du, v)];
        line(g, [p[0][0], p[0][1], p[1][0], p[1][1], p[2][0], p[2][1], p[3][0], p[3][1]]);
        g.closePath();
        g.fillStyle = col;
        g.fill();
      };
      for (let i = -2; i <= 2; i++) {
        diamond(i * 0.3, 0, 0.13, 0.42, '#efe2c8');
        diamond(i * 0.3, 0, 0.08, 0.26, i % 2 ? '#e0a740' : '#3e4f72');
        diamond(i * 0.3, 0, 0.03, 0.1, '#efe2c8');
      }
      for (let i = -3; i <= 3; i++) {
        diamond(i * 0.3 + 0.15, -0.5, 0.05, 0.1, '#efe2c8');
        diamond(i * 0.3 + 0.15, 0.5, 0.05, 0.1, '#efe2c8');
      }
      // 테두리의 작은 톱니
      for (let i = -12; i <= 12; i++) {
        for (const v of [-0.87, 0.87]) {
          const a = map(i / 13.2 - 0.03, v - 0.03);
          const b = map(i / 13.2 + 0.03, v - 0.03);
          const c = map(i / 13.2, v + 0.03);
          line(g, [a[0], a[1], b[0], b[1], c[0], c[1]]);
          g.closePath();
          g.fillStyle = '#3e4f72';
          g.fill();
        }
      }
      // 실의 결
      for (let i = 0; i < 260; i++) {
        const p = map(rnd() * 2 - 1, rnd() * 2 - 1);
        g.fillStyle = `rgba(${rnd() < 0.5 ? '255,240,220' : '40,20,14'},${0.04 + rnd() * 0.04})`;
        g.fillRect(p[0], p[1], (2 + rnd() * 5) * s, 1 * s);
      }
      // 술
      g.strokeStyle = '#efe2c8';
      g.lineWidth = 1.3 * s;
      for (const v of [-1, 1]) {
        for (let i = 0; i <= 30; i++) {
          const p = map(-0.96 + (i / 30) * 1.92, v);
          g.beginPath();
          g.moveTo(p[0], p[1]);
          g.lineTo(p[0] + (rnd() - 0.5) * 2 * s, p[1] + v * (6 + rnd() * 3) * s * (v > 0 ? 1.2 : 0.7));
          g.stroke();
        }
      }
    }

    // 침대 옆 양털 깔개
    paintSkin(g, rnd) {
      const { skin } = this.L;
      const s = this.s * 1.1;
      const pts = [];
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2;
        const r = 1 + (rnd() - 0.5) * 0.22 + (i % 2 ? 0.08 : 0);
        pts.push([skin.x + Math.cos(a) * 74 * s * r, skin.y + Math.sin(a) * 24 * s * r]);
      }
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y + 4 * s) : g.moveTo(x, y + 4 * s)));
      g.closePath();
      g.fillStyle = 'rgba(25,14,8,0.35)';
      g.fill();
      g.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[(i + 1) % pts.length];
        if (!i) g.moveTo(x0, y0);
        g.quadraticCurveTo(x0 + (x1 - x0) * 0.5 + (rnd() - 0.5) * 6 * s, y0 + (y1 - y0) * 0.5 - 3 * s, x1, y1);
      }
      g.closePath();
      g.fillStyle = lin(g, 0, skin.y - 24 * s, 0, skin.y + 24 * s, [[0, '#fbf6ec'], [1, '#e2d6c2']]);
      g.fill();
      ink(g, 1.4 * s, 'rgba(90,70,50,0.45)');
      g.strokeStyle = 'rgba(180,160,130,0.35)';
      g.lineWidth = 1.2 * s;
      for (let i = 0; i < 40; i++) {
        const x = skin.x + (rnd() - 0.5) * 120 * s;
        const y = skin.y + (rnd() - 0.5) * 32 * s;
        g.beginPath();
        g.arc(x, y, (3 + rnd() * 3) * s, Math.PI * 0.1, Math.PI * 0.9);
        g.stroke();
      }
    }

    // 문 옆에 벗어 둔 노란 장화
    paintBoots(g) {
      const b = this.L.boots;
      const k = b.k;
      for (const [dx, rot] of [[-10, -0.06], [12, 0.08]]) {
        g.save();
        g.translate(b.x + dx * k, b.y);
        g.rotate(rot);
        g.scale(k, k);
        ell(g, 4, 1, 16, 4);
        g.fillStyle = 'rgba(20,10,6,0.35)';
        g.fill();
        g.beginPath();
        g.moveTo(-9, -44);
        g.lineTo(7, -44);
        g.lineTo(8, -12);
        g.quadraticCurveTo(20, -10, 20, -2);
        g.lineTo(20, 0);
        g.lineTo(-10, 0);
        g.closePath();
        g.fillStyle = lin(g, -10, 0, 20, 0, [[0, '#d99a1e'], [0.4, '#f6c444'], [1, '#d4931b']]);
        g.fill();
        ink(g, 2);
        g.fillStyle = '#7a5214';
        g.fillRect(-10, -3, 30, 3);
        MC.roundRect(g, -10.5, -48, 18, 7, 3);
        g.fillStyle = '#f2b934';
        g.fill();
        ink(g, 1.8);
        g.restore();
      }
    }

    // 기둥에서 왼쪽 벽까지 늘어진 파스텔 가랜드
    paintBunting(g) {
      const { L, s, w } = this;
      const x0 = L.pole.x - 6 * s;
      const y0 = L.lamp.y + 70 * s;
      const x1 = w * (L.portrait ? 0.03 : 0.04);
      const y1 = this.wallTop(x1) - 30 * s;
      const cx = (x0 + x1) / 2;
      const cy = Math.max(y0, y1) + 50 * s;
      const at = (t) => [(1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1];
      g.strokeStyle = 'rgba(80,56,40,0.7)';
      g.lineWidth = 1.2 * s;
      g.beginPath();
      g.moveTo(x0, y0);
      g.quadraticCurveTo(cx, cy, x1, y1);
      g.stroke();
      const cols = ['#f4a9b8', '#a8d8c4', '#f6d78b', '#a9c6ee', '#f2b48c', '#c9b2ea'];
      const n = L.portrait ? 9 : 12;
      for (let i = 1; i < n; i++) {
        const [x, y] = at(i / n);
        const [xa, ya] = at((i - 0.3) / n);
        const [xb, yb] = at((i + 0.3) / n);
        g.beginPath();
        g.moveTo(xa, ya);
        g.lineTo(xb, yb);
        g.lineTo(x + 1 * s, y + 20 * s);
        g.closePath();
        g.fillStyle = cols[i % cols.length];
        g.fill();
        ink(g, 1 * s, 'rgba(80,56,40,0.5)');
      }
    }

    // ── 가구와 소품 ───────────────────────────────────────
    buildProps() {
      const { L, dpr, s } = this;
      const P = {};
      // 난로: 연통이 천막 지붕을 뚫고 나간다
      const k = L.stove.k;
      const roofY = Math.max(this.h * 0.06, this.wallTop(L.stove.x) - this.h * (L.portrait ? 0.26 : 0.3));
      const pipeH = Math.max(40, (L.stove.y - 136 * k - roofY) / k);
      P.stove = sprite(170, pipeH + 170, 85, pipeH + 160, k, dpr, (g) => this.paintStove(g, pipeH));
      L.stoveWin = { x0: L.stove.x - 30 * k, y0: L.stove.y - 99 * k, x1: L.stove.x + 30 * k, y1: L.stove.y - 47 * k, k };
      L.spout = { x: L.stove.x + 2 * k, y: L.stove.y - 166 * k, k };
      P.basket = sprite(120, 110, 60, 96, L.basket.k, dpr, (g) => this.paintBasket(g));
      P.table = sprite(200, 150, 100, 130, L.table.k, dpr, (g) => this.paintTable(g));
      L.flame = { x: L.table.x - 46 * L.table.k, y: L.table.y - 86 * L.table.k, k: L.table.k };
      L.mug = { x: L.table.x + 14 * L.table.k, y: L.table.y - 72 * L.table.k, k: L.table.k };
      P.bed = sprite(460, 220, 230, 190, L.bed.k, dpr, (g) => this.paintBed(g));
      const poleLen = (L.pole.y - L.apex.y) / L.pole.k;
      const lampOff = (L.pole.y - L.lamp.y) / L.pole.k;
      P.pole = sprite(130, poleLen + 30, 65, poleLen + 16, L.pole.k, dpr, (g) => this.paintPole(g, poleLen, lampOff));
      P.guitar = sprite(110, 230, 55, 215, L.guitar.k, dpr, (g) => this.paintGuitar(g));
      P.pack = sprite(110, 140, 55, 128, L.pack.k, dpr, (g) => this.paintPack(g));
      P.pouf = sprite(140, 100, 70, 84, L.pouf.k, dpr, (g) => this.paintPouf(g));
      P.drapes = sprite(L.door.w / s + 60, L.door.h / s + 30, L.door.w / s / 2 + 30, L.door.h / s + 12, s, dpr, (g) => this.paintDrapes(g));
      P.winFrame = sprite(L.win.r * 2.6 / s, L.win.r * 2.8 / s, L.win.r * 1.3 / s, L.win.r * 1.5 / s, s, dpr, (g) => this.paintWindow(g, L.win.r / s));
      this.props = P;
      this.items = [
        { y: L.guitar.y, sp: P.guitar, x: L.guitar.x },
        { y: L.stove.y, sp: P.stove, x: L.stove.x, after: (g, E, fl) => this.drawStoveFire(g, E, fl) },
        { y: L.basket.y, sp: P.basket, x: L.basket.x },
        { y: L.pole.y, sp: P.pole, x: L.pole.x, after: (g, E, fl) => this.drawLampFlame(g, fl) },
        { y: L.bed.y, sp: P.bed, x: L.bed.x },
        { y: L.pack.y, sp: P.pack, x: L.pack.x },
        { y: L.table.y, sp: P.table, x: L.table.x, after: (g, E, fl) => this.drawTableFlame(g, fl) },
        { y: L.pouf.y, sp: P.pouf, x: L.pouf.x },
      ];
    }

    paintStove(g, pipeH) {
      const top = -136 - pipeH;
      // 연통
      g.fillStyle = lin(g, -10, 0, 10, 0, [[0, '#18171b'], [0.35, '#4c4a52'], [0.55, '#2c2b30'], [1, '#131215']]);
      g.fillRect(-10, top, 20, pipeH + 6);
      g.strokeStyle = INK;
      g.lineWidth = 2;
      g.strokeRect(-10, top, 20, pipeH + 6);
      for (let y = -170; y > top + 30; y -= 78) {
        g.fillStyle = '#3a383f';
        g.fillRect(-12, y, 24, 6);
        g.strokeRect(-12, y, 24, 6);
      }
      // 천막을 지나는 둥근 철판 (불막이)
      ell(g, 0, top + 10, 34, 12);
      g.fillStyle = lin(g, -34, 0, 34, 0, [[0, '#7c766f'], [0.4, '#c9c1b5'], [1, '#6d675f']]);
      g.fill();
      ink(g, 2);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ell(g, Math.cos(a) * 26, top + 10 + Math.sin(a) * 8, 1.6, 1.4);
        g.fillStyle = '#5a554f';
        g.fill();
      }
      ell(g, 0, top + 10, 11, 4);
      g.fillStyle = '#1c1b1f';
      g.fill();
      // 바닥 그림자
      ell(g, 0, 2, 70, 9);
      g.fillStyle = 'rgba(20,10,6,0.45)';
      g.fill();
      // 다리
      for (const x of [-46, 46]) {
        MC.roundRect(g, x - 6, -18, 12, 18, 3);
        g.fillStyle = '#1d1c21';
        g.fill();
        ink(g, 1.8);
      }
      // 몸통
      MC.roundRect(g, -56, -128, 112, 114, 12);
      g.fillStyle = lin(g, -56, 0, 56, 0, [[0, '#2b2a30'], [0.18, '#4a4851'], [0.5, '#2f2e34'], [1, '#18171b']]);
      g.fill();
      ink(g, 2.4);
      // 윗판
      MC.roundRect(g, -62, -138, 124, 14, 5);
      g.fillStyle = lin(g, 0, -138, 0, -124, [[0, '#5d5a63'], [1, '#26252b']]);
      g.fill();
      ink(g, 2.2);
      // 문 테두리와 유리창 자리
      MC.roundRect(g, -40, -108, 80, 70, 9);
      g.fillStyle = '#232227';
      g.fill();
      ink(g, 2);
      MC.roundRect(g, -30, -99, 60, 52, 6);
      g.fillStyle = '#140805';
      g.fill();
      ink(g, 1.6);
      // 스프링 손잡이
      g.strokeStyle = '#c9c0b2';
      g.lineWidth = 2.2;
      g.beginPath();
      for (let i = 0; i <= 10; i++) {
        const y = -90 + i * 2.6;
        g.ellipse(46, y, 4.5, 1.6, 0, 0, Math.PI);
      }
      g.stroke();
      // 공기 조절 손잡이와 귀여운 별 장식
      ell(g, 0, -27, 6, 4);
      g.fillStyle = '#77716a';
      g.fill();
      ink(g, 1.6);
      g.save();
      g.translate(-38, -118);
      g.fillStyle = '#625f68';
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 2.4 : 5.6;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.closePath();
      g.fill();
      g.restore();
      g.fillStyle = '#29282d';
      g.fillRect(-50, -18, 100, 5);
      // 주전자 (구리)
      g.save();
      g.translate(-20, -138);
      ell(g, 0, -16, 24, 17);
      g.fillStyle = lin(g, -24, 0, 24, 0, [[0, '#9a4f25'], [0.35, '#e49a5e'], [0.6, '#c06a35'], [1, '#7a3c1b']]);
      g.fill();
      ink(g, 2.2);
      ell(g, -8, -22, 6, 4, -0.4);
      g.fillStyle = 'rgba(255,230,200,0.55)';
      g.fill();
      // 주둥이
      g.beginPath();
      g.moveTo(16, -14);
      g.quadraticCurveTo(26, -18, 28, -30);
      g.lineTo(23, -30);
      g.quadraticCurveTo(21, -22, 14, -22);
      g.closePath();
      g.fillStyle = '#b45f2e';
      g.fill();
      ink(g, 1.8);
      // 뚜껑과 손잡이
      ell(g, 0, -32, 11, 3.6);
      g.fillStyle = '#a3542a';
      g.fill();
      ink(g, 1.6);
      ell(g, 0, -36, 3.6, 3);
      g.fillStyle = '#2a1d16';
      g.fill();
      g.beginPath();
      g.moveTo(-17, -24);
      g.bezierCurveTo(-18, -52, 18, -52, 17, -24);
      ink(g, 3.4, '#2a1d16');
      g.restore();
    }

    paintBasket(g) {
      // 그림자
      ell(g, 0, 3, 46, 8);
      g.fillStyle = 'rgba(20,10,6,0.4)';
      g.fill();
      // 장작 (바구니 뒤로 비죽)
      const logs = [[-18, -58, -0.2], [4, -64, 0.1], [22, -56, 0.32], [-6, -50, -0.05]];
      for (const [x, y, a] of logs) {
        g.save();
        g.translate(x, y);
        g.rotate(a);
        MC.roundRect(g, -8, -6, 16, 46, 6);
        g.fillStyle = lin(g, -8, 0, 8, 0, [[0, '#4e3322'], [0.5, '#76523a'], [1, '#3d281a']]);
        g.fill();
        ink(g, 1.8);
        ell(g, 0, -6, 8, 6);
        g.fillStyle = '#e2bf8f';
        g.fill();
        ink(g, 1.6);
        ell(g, 0, -6, 4.6, 3.4);
        g.strokeStyle = 'rgba(150,100,60,0.7)';
        g.lineWidth = 1;
        g.stroke();
        g.restore();
      }
      // 바구니
      g.beginPath();
      g.moveTo(-40, -42);
      g.lineTo(40, -42);
      g.lineTo(32, 0);
      g.lineTo(-32, 0);
      g.closePath();
      g.fillStyle = lin(g, -40, 0, 40, 0, [[0, '#9b6d3f'], [0.4, '#c4955f'], [1, '#7a522c']]);
      g.fill();
      g.save();
      g.clip();
      g.strokeStyle = 'rgba(90,58,30,0.6)';
      g.lineWidth = 1.4;
      for (let y = -38; y < 0; y += 6) {
        g.beginPath();
        for (let x = -44; x <= 44; x += 8) {
          g.moveTo(x, y + ((x / 8) % 2 ? 2 : 0));
          g.quadraticCurveTo(x + 4, y + 4, x + 8, y + ((x / 8) % 2 ? 0 : 2));
        }
        g.stroke();
      }
      for (let x = -36; x <= 36; x += 9) {
        g.beginPath();
        g.moveTo(x, -42);
        g.lineTo(x * 0.82, 0);
        g.stroke();
      }
      g.restore();
      g.beginPath();
      g.moveTo(-40, -42);
      g.lineTo(40, -42);
      g.lineTo(32, 0);
      g.lineTo(-32, 0);
      g.closePath();
      ink(g, 2.2);
      MC.roundRect(g, -43, -46, 86, 8, 4);
      g.fillStyle = '#b8874f';
      g.fill();
      ink(g, 2);
    }

    paintTable(g) {
      // 그림자
      ell(g, 0, 3, 92, 11);
      g.fillStyle = 'rgba(20,10,6,0.4)';
      g.fill();
      // 나무 상자 탁자
      g.beginPath();
      g.moveTo(-78, -50);
      g.lineTo(70, -50);
      g.lineTo(84, -62);
      g.lineTo(-64, -62);
      g.closePath();
      g.fillStyle = '#c99666';
      g.fill();
      ink(g, 2);
      MC.roundRect(g, -78, -50, 148, 50, 3);
      g.fillStyle = lin(g, 0, -50, 0, 0, [[0, '#ad7a4e'], [1, '#875a36']]);
      g.fill();
      ink(g, 2.2);
      g.beginPath();
      g.moveTo(70, -50);
      g.lineTo(84, -62);
      g.lineTo(84, -12);
      g.lineTo(70, 0);
      g.closePath();
      g.fillStyle = '#6e4628';
      g.fill();
      ink(g, 2);
      for (const y of [-34, -17]) {
        g.fillStyle = 'rgba(40,22,10,0.55)';
        g.fillRect(-76, y, 144, 3);
      }
      g.strokeStyle = 'rgba(255,220,180,0.12)';
      g.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        g.beginPath();
        g.moveTo(-74 + i * 18, -48);
        g.quadraticCurveTo(-70 + i * 18, -30, -74 + i * 18 + 6, -4);
        g.stroke();
      }
      // 등잔 (허리케인 랜턴)
      g.save();
      g.translate(-46, -56);
      MC.roundRect(g, -13, -8, 26, 9, 3);
      g.fillStyle = '#2f4a3c';
      g.fill();
      ink(g, 1.8);
      ell(g, 0, -26, 13, 19);
      g.fillStyle = 'rgba(255,222,160,0.42)';
      g.fill();
      ink(g, 1.6);
      g.strokeStyle = '#2f4a3c';
      g.lineWidth = 1.6;
      for (const x of [-9, 0, 9]) {
        g.beginPath();
        g.moveTo(x * 1.3, -8);
        g.quadraticCurveTo(x * 1.6, -26, x * 0.6, -44);
        g.stroke();
      }
      MC.roundRect(g, -9, -50, 18, 7, 3);
      g.fillStyle = '#2f4a3c';
      g.fill();
      ink(g, 1.6);
      g.beginPath();
      g.arc(0, -46, 12, Math.PI * 1.05, Math.PI * 1.95);
      ink(g, 1.6, '#2a2a2a');
      g.restore();
      // 펼친 책
      g.save();
      g.translate(-8, -60);
      g.rotate(-0.06);
      for (const side of [-1, 1]) {
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(side * 12, -5, side * 24, -2);
        g.lineTo(side * 26, 6);
        g.quadraticCurveTo(side * 12, 3, 0, 7);
        g.closePath();
        g.fillStyle = side < 0 ? '#fbf3e3' : '#f3e8d2';
        g.fill();
        ink(g, 1.4);
        g.strokeStyle = 'rgba(80,60,40,0.35)';
        g.lineWidth = 0.8;
        for (let i = 0; i < 3; i++) {
          g.beginPath();
          g.moveTo(side * 5, 0 + i * 2.2);
          g.lineTo(side * 20, -1 + i * 2.2);
          g.stroke();
        }
      }
      g.strokeStyle = '#c2453a';
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(1, 6);
      g.quadraticCurveTo(3, 12, 1, 16);
      g.stroke();
      g.restore();
      // 코코아 머그 (법랑, 파란 테)
      g.save();
      g.translate(14, -58);
      MC.roundRect(g, -10, -18, 20, 20, 4);
      g.fillStyle = lin(g, -10, 0, 10, 0, [[0, '#e9e4da'], [0.4, '#ffffff'], [1, '#d6d0c4']]);
      g.fill();
      ink(g, 1.8);
      g.beginPath();
      g.arc(13, -9, 5.5, -Math.PI / 2, Math.PI / 2);
      ink(g, 2.4, INK);
      ell(g, 0, -18, 10, 3.2);
      g.fillStyle = '#6b4128';
      g.fill();
      ink(g, 1.6, '#3d5f8f');
      g.fillStyle = '#ffffff';
      ell(g, -3, -18.5, 3, 1.2);
      g.fill();
      g.restore();
      // 다육이 화분
      g.save();
      g.translate(52, -56);
      g.beginPath();
      g.moveTo(-10, -14);
      g.lineTo(10, -14);
      g.lineTo(7, 2);
      g.lineTo(-7, 2);
      g.closePath();
      g.fillStyle = '#c86b45';
      g.fill();
      ink(g, 1.8);
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.42;
        g.save();
        g.translate(0, -15);
        g.rotate(a + Math.PI / 2);
        ell(g, 0, -7, 3.4, 7.5);
        g.fillStyle = i % 2 ? '#86b87d' : '#9fcb8f';
        g.fill();
        ink(g, 1.2, 'rgba(50,80,40,0.7)');
        g.restore();
      }
      g.restore();
    }

    paintBed(g) {
      // 그림자
      g.beginPath();
      g.moveTo(-200, 2);
      g.lineTo(200, 2);
      g.lineTo(224, -30);
      g.lineTo(-170, -30);
      g.closePath();
      g.fillStyle = 'rgba(20,10,6,0.45)';
      g.fill();
      // 나무 받침
      MC.roundRect(g, -192, -36, 384, 36, 4);
      g.fillStyle = lin(g, 0, -36, 0, 0, [[0, '#9c6a43'], [1, '#6f4729']]);
      g.fill();
      ink(g, 2.4);
      g.strokeStyle = 'rgba(40,22,10,0.45)';
      g.lineWidth = 1.6;
      for (const x of [-96, 0, 96]) {
        g.beginPath();
        g.moveTo(x, -34);
        g.lineTo(x, -2);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(-190, -18);
      g.lineTo(190, -18);
      g.stroke();
      // 매트리스 옆면
      MC.roundRect(g, -186, -62, 372, 28, 8);
      g.fillStyle = lin(g, 0, -62, 0, -34, [[0, '#fbf8f2'], [1, '#dcd3c4']]);
      g.fill();
      ink(g, 2);
      g.setLineDash([4, 4]);
      g.strokeStyle = 'rgba(120,100,80,0.45)';
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(-178, -48);
      g.lineTo(178, -48);
      g.stroke();
      g.setLineDash([]);
      // 이불: 윗면을 덮고 앞으로 늘어진다
      g.beginPath();
      g.moveTo(-162, -104);
      g.lineTo(212, -104);
      g.quadraticCurveTo(206, -70, 192, -58);
      for (let i = 0; i <= 8; i++) {
        const x = 192 - i * 46;
        const y = -40 + (i % 2 ? -6 : 0);
        g.quadraticCurveTo(x + 18, y + 8, x - 23, y);
      }
      g.quadraticCurveTo(-192, -60, -184, -70);
      g.closePath();
      g.fillStyle = lin(g, 0, -104, 0, -36, [[0, '#ffffff'], [0.6, '#f3ebdc'], [1, '#dccfba']]);
      g.fill();
      ink(g, 2.2);
      g.strokeStyle = 'rgba(160,140,110,0.4)';
      g.lineWidth = 1.6;
      for (const [x0, y0, x1, y1] of [[-120, -96, -90, -52], [-20, -98, 10, -50], [80, -96, 104, -54], [150, -98, 160, -62]]) {
        g.beginPath();
        g.moveTo(x0, y0);
        g.quadraticCurveTo((x0 + x1) / 2 + 10, (y0 + y1) / 2, x1, y1);
        g.stroke();
      }
      // 겨자색 니트 담요: 발치에 비스듬히
      g.beginPath();
      g.moveTo(-136, -105);
      g.lineTo(-48, -105);
      g.quadraticCurveTo(-46, -70, -60, -30);
      g.lineTo(-150, -26);
      g.quadraticCurveTo(-142, -70, -136, -105);
      g.closePath();
      g.fillStyle = lin(g, -150, 0, -46, 0, [[0, '#c98f2e'], [0.5, '#e4ae4a'], [1, '#c9902f']]);
      g.fill();
      ink(g, 2.2);
      g.save();
      g.clip();
      g.strokeStyle = 'rgba(150,100,20,0.55)';
      g.lineWidth = 1.6;
      for (let c = 0; c < 5; c++) {
        const xx = -140 + c * 20;
        g.beginPath();
        for (let y = -104; y < -26; y += 7) {
          g.moveTo(xx - 4 + (y + 104) * 0.05, y);
          g.lineTo(xx + (y + 104) * 0.05, y + 4);
          g.lineTo(xx + 4 + (y + 104) * 0.05, y);
        }
        g.stroke();
      }
      g.restore();
      g.strokeStyle = '#d9a441';
      g.lineWidth = 1.6;
      for (let i = 0; i <= 12; i++) {
        const x = -150 + i * 7.6;
        const y = -27 + i * 0.1;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x - 1, y + 9);
        g.stroke();
      }
      // 베개들
      const pillow = (x, y, rw, rh, rot, fill, stripe) => {
        g.save();
        g.translate(x, y);
        g.rotate(rot);
        MC.roundRect(g, -rw, -rh, rw * 2, rh * 2, rh * 0.8);
        g.fillStyle = fill;
        g.fill();
        if (stripe) {
          g.save();
          g.clip();
          g.strokeStyle = stripe;
          g.lineWidth = 3;
          for (let i = -rw; i < rw; i += 9) {
            g.beginPath();
            g.moveTo(i, -rh);
            g.lineTo(i, rh);
            g.stroke();
          }
          g.restore();
          MC.roundRect(g, -rw, -rh, rw * 2, rh * 2, rh * 0.8);
        }
        ink(g, 2);
        g.restore();
      };
      pillow(170, -118, 40, 22, -0.18, '#fbf7f0');
      pillow(146, -112, 38, 20, -0.08, '#f4efe6');
      pillow(104, -110, 22, 17, 0.1, '#a9c4a0', 'rgba(255,255,255,0.5)');
      // 멍이 얼굴 쿠션 (자고 있다)
      g.save();
      g.translate(64, -112);
      for (const side of [-1, 1]) {
        g.save();
        g.translate(side * 15, -6);
        g.rotate(side * 0.35);
        ell(g, 0, 8, 7, 13);
        g.fillStyle = '#dc9a5c';
        g.fill();
        ink(g, 1.8);
        g.restore();
      }
      ell(g, 0, 0, 20, 17);
      g.fillStyle = '#fff3e3';
      g.fill();
      ink(g, 2);
      for (const side of [-1, 1]) {
        g.beginPath();
        g.moveTo(side * 9 - 4, -1);
        g.quadraticCurveTo(side * 9, 2, side * 9 + 4, -1);
        ink(g, 1.6, '#2a1a13');
        ell(g, side * 12, 5, 3.4, 2);
        g.fillStyle = 'rgba(255,126,140,0.45)';
        g.fill();
      }
      ell(g, 0, 4, 3, 2.2);
      g.fillStyle = '#3a261d';
      g.fill();
      g.restore();
      // 침대 앞의 털 슬리퍼
      for (const [x, y, r] of [[-150, 14, -0.12], [-122, 18, 0.1]]) {
        g.save();
        g.translate(x, y);
        g.rotate(r);
        ell(g, 0, 0, 14, 6.5);
        g.fillStyle = '#f7c4cf';
        g.fill();
        ink(g, 1.6);
        ell(g, 3, -1.5, 8, 4);
        g.fillStyle = '#fde7ec';
        g.fill();
        g.restore();
      }
    }

    paintPole(g, len, lampOff) {
      // 바닥 받침
      ell(g, 0, 2, 22, 6);
      g.fillStyle = 'rgba(20,10,6,0.45)';
      g.fill();
      MC.roundRect(g, -14, -6, 28, 8, 3);
      g.fillStyle = '#5c5850';
      g.fill();
      ink(g, 1.6);
      // 나무 기둥
      g.beginPath();
      g.moveTo(-7.5, 0);
      g.lineTo(-6, -len);
      g.lineTo(6, -len);
      g.lineTo(7.5, 0);
      g.closePath();
      g.fillStyle = lin(g, -8, 0, 8, 0, [[0, '#4d3424'], [0.35, '#a27750'], [0.6, '#7b5536'], [1, '#3e291b']]);
      g.fill();
      ink(g, 2);
      g.strokeStyle = 'rgba(40,24,12,0.3)';
      g.lineWidth = 0.8;
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.moveTo(-3 + i * 1.6, -10);
        g.lineTo(-3 + i * 1.4, -len + 10);
        g.stroke();
      }
      // 꼭대기 쇠고리 (줄전구가 모인다)
      MC.roundRect(g, -11, -len - 6, 22, 14, 4);
      g.fillStyle = lin(g, -11, 0, 11, 0, [[0, '#6e6a62'], [0.5, '#bdb5a8'], [1, '#5c5850']]);
      g.fill();
      ink(g, 1.6);
      // 말린 꽃과 유칼립투스 리스
      const wy = -lampOff + 64;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const x = Math.cos(a) * 12;
        const y = wy + Math.sin(a) * 4 + (i % 3) * 2;
        g.save();
        g.translate(x, y);
        g.rotate(a + 0.6);
        ell(g, 0, 0, 7, 3.4);
        g.fillStyle = i % 2 ? '#8fae8b' : '#a7c2a0';
        g.fill();
        ink(g, 0.8, 'rgba(50,80,50,0.6)');
        g.restore();
      }
      for (const [x, y, c] of [[-10, wy - 2, '#f3d6dc'], [8, wy + 3, '#fbf3e0'], [12, wy - 3, '#e9b3be'], [-4, wy + 5, '#fbf3e0']]) {
        ell(g, x, y, 3.4, 3.4);
        g.fillStyle = c;
        g.fill();
        ink(g, 0.8);
      }
      // 등불 고리와 사슬, 등불 몸통 (불꽃은 따로 그린다)
      const ly = -lampOff;
      g.strokeStyle = '#2a2622';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(6, ly - 34);
      g.quadraticCurveTo(20, ly - 36, 22, ly - 26);
      g.stroke();
      for (let i = 0; i < 4; i++) {
        ell(g, 22, ly - 22 + i * 5, 1.8, 2.6);
        g.stroke();
      }
      g.save();
      g.translate(22, ly + 10);
      g.beginPath();
      g.moveTo(-12, -14);
      g.lineTo(12, -14);
      g.lineTo(16, 10);
      g.lineTo(9, 22);
      g.lineTo(-9, 22);
      g.lineTo(-16, 10);
      g.closePath();
      g.fillStyle = 'rgba(255,196,110,0.45)';
      g.fill();
      ink(g, 2, '#2a2622');
      g.strokeStyle = '#2a2622';
      g.lineWidth = 1.4;
      for (const x of [-6, 0, 6]) {
        g.beginPath();
        g.moveTo(x, -14);
        g.lineTo(x * 1.4, 10);
        g.lineTo(x, 22);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(-12, -14);
      g.lineTo(0, -24);
      g.lineTo(12, -14);
      g.closePath();
      g.fillStyle = '#3a342d';
      g.fill();
      ink(g, 1.6, '#2a2622');
      g.restore();
    }

    paintGuitar(g) {
      g.save();
      g.rotate(-0.16);
      ell(g, 6, 2, 34, 6);
      g.fillStyle = 'rgba(20,10,6,0.35)';
      g.fill();
      // 몸통
      g.beginPath();
      g.moveTo(0, -112);
      g.bezierCurveTo(22, -112, 26, -92, 18, -80);
      g.bezierCurveTo(34, -66, 38, -24, 22, -8);
      g.bezierCurveTo(10, 2, -10, 2, -22, -8);
      g.bezierCurveTo(-38, -24, -34, -66, -18, -80);
      g.bezierCurveTo(-26, -92, -22, -112, 0, -112);
      g.closePath();
      g.fillStyle = lin(g, -36, 0, 36, 0, [[0, '#a8682f'], [0.45, '#e1a15e'], [1, '#9a5c28']]);
      g.fill();
      ink(g, 2.2);
      ell(g, 0, -64, 9, 9);
      g.fillStyle = '#2a1a10';
      g.fill();
      g.strokeStyle = '#f1d6a8';
      g.lineWidth = 1.4;
      ell(g, 0, -64, 12, 12);
      g.stroke();
      MC.roundRect(g, -10, -30, 20, 5, 2);
      g.fillStyle = '#3e2618';
      g.fill();
      // 목과 머리
      MC.roundRect(g, -4.5, -200, 9, 100, 2);
      g.fillStyle = '#5a3b25';
      g.fill();
      ink(g, 1.6);
      MC.roundRect(g, -7, -214, 14, 20, 3);
      g.fillStyle = '#3e2618';
      g.fill();
      ink(g, 1.6);
      for (const y of [-210, -204, -198]) {
        for (const x of [-9, 9]) {
          ell(g, x, y, 2.2, 1.6);
          g.fillStyle = '#d8d0c0';
          g.fill();
        }
      }
      g.strokeStyle = 'rgba(240,230,210,0.7)';
      g.lineWidth = 0.6;
      for (const x of [-2.5, -0.8, 0.8, 2.5]) {
        g.beginPath();
        g.moveTo(x, -196);
        g.lineTo(x * 1.4, -28);
        g.stroke();
      }
      g.restore();
    }

    paintPack(g) {
      ell(g, 0, 3, 40, 7);
      g.fillStyle = 'rgba(20,10,6,0.4)';
      g.fill();
      // 둘둘 만 매트
      g.save();
      g.translate(0, -100);
      MC.roundRect(g, -40, -12, 80, 24, 12);
      g.fillStyle = lin(g, 0, -12, 0, 12, [[0, '#7fa6cf'], [1, '#4f769f']]);
      g.fill();
      ink(g, 2);
      ell(g, 40, 0, 6, 12);
      g.fillStyle = '#9dbbdb';
      g.fill();
      ink(g, 1.6);
      g.strokeStyle = 'rgba(30,50,80,0.6)';
      g.lineWidth = 1.2;
      ell(g, 40, 0, 3, 7);
      g.stroke();
      for (const x of [-18, 18]) {
        g.fillStyle = '#7a5233';
        g.fillRect(x - 3, -13, 6, 26);
      }
      g.restore();
      // 가방
      g.beginPath();
      g.moveTo(-34, 0);
      g.quadraticCurveTo(-40, -50, -30, -84);
      g.quadraticCurveTo(0, -96, 30, -84);
      g.quadraticCurveTo(40, -50, 34, 0);
      g.closePath();
      g.fillStyle = lin(g, -40, 0, 40, 0, [[0, '#4f6c4a'], [0.4, '#6f9067'], [1, '#465f42']]);
      g.fill();
      ink(g, 2.2);
      // 덮개와 가죽끈
      g.beginPath();
      g.moveTo(-30, -84);
      g.quadraticCurveTo(0, -96, 30, -84);
      g.quadraticCurveTo(28, -56, 0, -50);
      g.quadraticCurveTo(-28, -56, -30, -84);
      g.closePath();
      g.fillStyle = '#5e7e58';
      g.fill();
      ink(g, 2);
      for (const x of [-14, 14]) {
        g.fillStyle = '#7a5233';
        g.fillRect(x - 3.5, -62, 7, 26);
        g.strokeStyle = INK;
        g.lineWidth = 1.4;
        g.strokeRect(x - 3.5, -62, 7, 26);
        MC.roundRect(g, x - 5, -40, 10, 7, 2);
        g.fillStyle = '#d6c28a';
        g.fill();
        ink(g, 1.2);
      }
      // 앞주머니
      MC.roundRect(g, -20, -30, 40, 24, 6);
      g.fillStyle = '#56744f';
      g.fill();
      ink(g, 1.8);
    }

    paintPouf(g) {
      ell(g, 0, 4, 60, 10);
      g.fillStyle = 'rgba(20,10,6,0.4)';
      g.fill();
      g.beginPath();
      g.moveTo(-56, -50);
      g.lineTo(-56, -10);
      g.quadraticCurveTo(0, 14, 56, -10);
      g.lineTo(56, -50);
      g.closePath();
      g.fillStyle = lin(g, -56, 0, 56, 0, [[0, '#d39a3f'], [0.45, '#efc06a'], [1, '#c58a33']]);
      g.fill();
      ink(g, 2.2);
      g.save();
      g.clip();
      g.strokeStyle = 'rgba(160,100,20,0.5)';
      g.lineWidth = 1.6;
      for (let x = -52; x <= 52; x += 11) {
        g.beginPath();
        for (let y = -50; y < 8; y += 6) {
          g.moveTo(x - 3, y);
          g.lineTo(x, y + 4);
          g.lineTo(x + 3, y);
        }
        g.stroke();
      }
      g.restore();
      ell(g, 0, -50, 56, 16);
      g.fillStyle = lin(g, 0, -66, 0, -34, [[0, '#f6d081'], [1, '#e2ab52']]);
      g.fill();
      ink(g, 2.2);
      g.strokeStyle = 'rgba(160,100,20,0.45)';
      g.lineWidth = 1.4;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.beginPath();
        g.moveTo(0, -50);
        g.lineTo(Math.cos(a) * 50, -50 + Math.sin(a) * 13);
        g.stroke();
      }
      ell(g, 0, -50, 6, 2.4);
      g.fillStyle = '#c58a33';
      g.fill();
    }

    // 문: 양옆으로 걷어 묶은 천과 지퍼, 문턱
    paintDrapes(g) {
      const { w: dw, h: dh } = this.L.door;
      const s = this.s;
      const W = dw / s;
      const H = dh / s;
      for (const side of [-1, 1]) {
        g.beginPath();
        g.moveTo(side * (W / 2 + 4), 4);
        g.quadraticCurveTo(side * W * 0.47, -H * 0.58, 0, -H - 2);
        g.quadraticCurveTo(side * W * 0.3, -H * 0.7, side * W * 0.34, -H * 0.42);
        g.quadraticCurveTo(side * W * 0.28, -H * 0.38, side * W * 0.36, -H * 0.3);
        g.quadraticCurveTo(side * W * 0.42, -H * 0.12, side * (W / 2 - 6), 4);
        g.closePath();
        g.fillStyle = lin(g, side * W * 0.5, 0, side * W * 0.25, 0, [[0, '#b58b62'], [1, '#e2c194']]);
        g.fill();
        ink(g, 2);
        g.strokeStyle = 'rgba(80,52,32,0.35)';
        g.lineWidth = 1.4;
        for (let i = 0; i < 3; i++) {
          g.beginPath();
          g.moveTo(side * W * (0.34 + i * 0.03), -H * 0.36);
          g.quadraticCurveTo(side * W * (0.4 + i * 0.03), -H * 0.2, side * W * (0.44 + i * 0.02), 0);
          g.stroke();
        }
        // 묶은 끈
        g.strokeStyle = '#7a5233';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(side * W * 0.31, -H * 0.4);
        g.quadraticCurveTo(side * W * 0.4, -H * 0.34, side * W * 0.46, -H * 0.38);
        g.stroke();
        ell(g, side * W * 0.47, -H * 0.37, 3, 3);
        g.fillStyle = '#d8c39a';
        g.fill();
        // 지퍼
        g.setLineDash([2, 2.5]);
        g.strokeStyle = 'rgba(60,40,26,0.55)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(side * (W / 2 - 2), 0);
        g.quadraticCurveTo(side * W * 0.44, -H * 0.58, 0, -H);
        g.stroke();
        g.setLineDash([]);
      }
      // 문턱
      MC.roundRect(g, -W / 2 - 6, -4, W + 12, 9, 4);
      g.fillStyle = '#3f3a32';
      g.fill();
      ink(g, 1.6);
    }

    paintWindow(g, r) {
      // 그물 결
      g.save();
      ell(g, 0, 0, r, r * 0.92);
      g.clip();
      g.strokeStyle = 'rgba(30,30,40,0.35)';
      g.lineWidth = 0.6;
      for (let i = -r; i <= r; i += 3) {
        g.beginPath();
        g.moveTo(i, -r);
        g.lineTo(i, r);
        g.moveTo(-r, i);
        g.lineTo(r, i);
        g.stroke();
      }
      g.restore();
      // 테두리 천과 바느질
      ell(g, 0, 0, r + 7, r * 0.92 + 7);
      g.lineWidth = 10;
      g.strokeStyle = '#a07a58';
      g.stroke();
      ink(g, 2);
      ell(g, 0, 0, r, r * 0.92);
      ink(g, 2);
      g.setLineDash([3, 3]);
      ell(g, 0, 0, r + 7, r * 0.92 + 7);
      g.strokeStyle = 'rgba(255,240,215,0.45)';
      g.lineWidth = 1;
      g.stroke();
      g.setLineDash([]);
      // 말아 올린 덮개
      MC.roundRect(g, -r * 0.9, -r * 1.2, r * 1.8, 12, 6);
      g.fillStyle = lin(g, 0, -r * 1.2, 0, -r * 1.2 + 12, [[0, '#d2ad84'], [1, '#9c7553']]);
      g.fill();
      ink(g, 1.8);
      for (const x of [-r * 0.5, r * 0.5]) {
        g.strokeStyle = '#7a5233';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x, -r * 1.24);
        g.lineTo(x, -r * 1.2 + 16);
        g.stroke();
      }
    }

    // ── 줄전구 ───────────────────────────────────────────
    buildLights() {
      const { L, s, w, h } = this;
      const hub = { x: L.apex.x, y: L.apex.y + 10 * s };
      const ends = [];
      const N = 10;
      for (let i = 0; i <= N; i++) {
        const th = Math.PI * (0.06 + 0.88 * (i / N));
        const x = L.F.cx - Math.cos(th) * L.F.rx * 0.9;
        if (x < -40 || x > w + 40) continue;
        ends.push({ x, y: this.wallTop(x) - 6 * s });
      }
      for (const fx of [0.1, 0.3, 0.7, 0.9]) ends.push({ x: w * fx, y: -6, over: true });
      this.swags = [];
      this.bulbs = [];
      const rnd = MC.rng(31);
      for (const e of ends) {
        const len = Math.hypot(e.x - hub.x, e.y - hub.y);
        const sag = len * (e.over ? 0.06 : 0.14);
        const c = { x: (hub.x + e.x) / 2, y: (hub.y + e.y) / 2 + sag };
        this.swags.push({ a: hub, c, b: e });
        const n = Math.max(3, Math.round(len / (34 * s)));
        for (let i = 1; i < n; i++) {
          const t = i / n;
          const x = (1 - t) * (1 - t) * hub.x + 2 * (1 - t) * t * c.x + t * t * e.x;
          const y = (1 - t) * (1 - t) * hub.y + 2 * (1 - t) * t * c.y + t * t * e.y;
          if (y > h) continue;
          this.bulbs.push({ x, y, ph: rnd() * 9, sp: 0.4 + rnd() * 0.5, r: (e.over ? 1.25 : 1) * (0.9 + 0.2 * rnd()) });
        }
      }
      // 전선은 배경에
      const g = this.bg.getContext('2d');
      g.save();
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      g.strokeStyle = 'rgba(40,26,18,0.75)';
      g.lineWidth = 1.1 * s;
      for (const sw of this.swags) {
        g.beginPath();
        g.moveTo(sw.a.x, sw.a.y);
        g.quadraticCurveTo(sw.c.x, sw.c.y, sw.b.x, sw.b.y);
        g.stroke();
      }
      g.restore();
    }

    // ── 바깥 풍경 (문과 그물창 너머) ─────────────────────────
    buildOutside() {
      const { L, s } = this;
      const rnd = MC.rng(808);
      const d = L.door;
      this.stars = [];
      for (let i = 0; i < 26; i++) {
        this.stars.push({ x: d.x + (rnd() - 0.5) * d.w * 0.9, y: d.y - d.h * (0.38 + rnd() * 0.6), r: (0.6 + rnd() * 1.1) * s, ph: rnd() * 9, sp: 0.4 + rnd() * 1.2 });
      }
      for (let i = 0; i < 12; i++) {
        const a = rnd() * Math.PI * 2;
        const r = Math.sqrt(rnd()) * L.win.r * 0.85;
        this.stars.push({ x: L.win.x + Math.cos(a) * r, y: L.win.y + Math.sin(a) * r * 0.9, r: (0.5 + rnd() * 0.9) * s, ph: rnd() * 9, sp: 0.4 + rnd(), win: true });
      }
      // 먼 숲 실루엣
      this.ridge = [];
      for (let i = 0; i <= 24; i++) {
        const u = i / 24;
        this.ridge.push([d.x - d.w * 0.6 + u * d.w * 1.2, d.y - d.h * 0.22 - (rnd() * 0.06 + (i % 3 === 0 ? 0.1 : 0.03)) * d.h]);
      }
      this.outFire = { x: d.x - d.w * 0.06, y: d.y - d.h * 0.08, k: s * (L.portrait ? 0.62 : 0.7) };
      this.rainLines = [];
      for (let i = 0; i < 70; i++) this.rainLines.push({ u: rnd(), v: rnd(), sp: 0.7 + rnd() * 0.6, len: 0.6 + rnd() * 0.6 });
      this.winDrops = [];
      for (let i = 0; i < 14; i++) this.winDrops.push({ a: rnd() * 6.28, r: Math.sqrt(rnd()) * 0.85, sp: 0.02 + rnd() * 0.05, ph: rnd() });
    }

    // ── 자리, 빛 ─────────────────────────────────────────
    // ── 침대 자리 ─────────────────────────────────────────
    // 자리마다 침대 위 가로 위치(디자인 단위). 화면 오른쪽 끝에 걸리면 조금씩 당긴다
    bedSpotX(i) {
      const L = this.L;
      const xs = [-112, -14, 84];
      const right = L.bed.x + (xs[BED_SPOTS - 1] + 62) * L.bed.k;
      const shift = right > this.w ? (this.w - right) / L.bed.k : 0;
      return xs[MC.clamp(i, 1, BED_SPOTS) - 1] + shift;
    }

    // 그 자리 앞 바닥 (여기까지 걸어와서 폴짝 올라간다)
    bedFootOf(i) {
      const L = this.L;
      return this.toCanon(L.bed.x + (this.bedSpotX(i) - 6) * L.bed.k, L.bed.y + 18 * this.s);
    }

    takenSpots() {
      const taken = new Set();
      if (this.crowd) for (const v of this.crowd.visitors.values()) if (!v.leaving && v.st.q && v.st.l) taken.add(v.st.l);
      return taken;
    }

    // 빈자리: 바라는 자리와 가까운 것부터
    freeSpot(want) {
      const taken = this.takenSpots();
      const order = [];
      for (let i = 1; i <= BED_SPOTS; i++) order.push(i);
      order.sort((a, b) => Math.abs(a - want) - Math.abs(b - want));
      for (const i of order) if (!taken.has(i)) return i;
      return 0;
    }

    nearestSpot(x) {
      const L = this.L;
      let best = 1;
      for (let i = 2; i <= BED_SPOTS; i++) {
        if (Math.abs(L.bed.x + this.bedSpotX(i) * L.bed.k - x) < Math.abs(L.bed.x + this.bedSpotX(best) * L.bed.k - x)) best = i;
      }
      return best;
    }

    bedSeat(id, st) {
      const L = this.L;
      let spot;
      if (!id) spot = this.bedSpot || this.pendingSpot || 2;
      else spot = st && st.l ? st.l : 1 + Math.floor(MC.hash(id.length * 5.1 + id.charCodeAt(id.length - 1)) * BED_SPOTS);
      return { x: L.bed.x + this.bedSpotX(spot) * L.bed.k, y: L.bed.y - 76 * L.bed.k, k: L.bed.k * 0.98 };
    }

    // 도착했을 때 그 자리가 비었는지 다시 본다 (그새 누가 누웠으면 옆자리로)
    claimBed() {
      const spot = this.freeSpot(this.pendingSpot || 2);
      this.pendingSpot = 0;
      if (!spot) return false;
      this.bedSpot = spot;
      return true;
    }

    lieDown() {
      this.pup.setLie(true);
      this.pup.sleepAfter = Math.min(this.pup.sleepAfter, 20);
    }

    getUp() {
      this.pup.setLie(false);
      this.bedSpot = 0;
    }

    // 침대가 꽉 찼으면 알려 주고, 침대 옆 양털 깔개에 앉는다
    bedFull() {
      if (this.onToast) this.onToast('침대가 꽉 찼어요');
      const sk = this.L.skin;
      const c = this.crowd;
      c.go(c.pushOut(c.clampIn(this.toCanon(sk.x, sk.y))));
    }

    // 침대를 톡: 빈자리로 걸어가 폴짝 올라가 엎드린다. 이미 누워 있으면 옆 빈자리로 옮겨 눕는다
    tapBed(x) {
      const c = this.crowd;
      const want = this.nearestSpot(x);
      if (c.perched) {
        if (want !== this.bedSpot && !this.takenSpots().has(want)) {
          this.bedSpot = want;
          this.pup.hopV = -60;
          this.pup.emit('hop');
        }
        return;
      }
      const spot = this.freeSpot(want);
      if (!spot) {
        this.bedFull();
        return;
      }
      this.pendingSpot = spot;
      c.go(this.bedFootOf(spot), true);
      this.toDoor = false;
    }

    // 침대 위에 '눕기' 단추: 빈자리가 있고 멍이가 바닥에 가만히 있을 때
    portalHint() {
      const c = this.crowd;
      if (!c || c.perched || c.moving || c.target || c.portal || this.leaving || this.pendingSpot) return null;
      if (!this.freeSpot(2)) return null;
      const L = this.L;
      return { x: L.bed.x + this.bedSpotX(2) * L.bed.k, y: L.bed.y - 132 * L.bed.k, label: '눕기' };
    }

    usePortal() {
      const L = this.L;
      this.tapBed(L.bed.x + this.bedSpotX(2) * L.bed.k);
    }

    hitBed(x, y) {
      const L = this.L;
      const k = L.bed.k;
      return x > L.bed.x - 190 * k && x < L.bed.x + 215 * k && y > L.bed.y - 120 * k && y < L.bed.y + 6 * k;
    }

    seatPose(X) {
      // 난로 쪽으로 살짝 고개를 돌리고 앉는다
      const toward = (this.L.stove.x / this.w) * 1000 - X;
      return { view: 'front', turn: MC.clamp(toward / 900, -0.45, 0.45), flip: 1, stick: false };
    }

    lightPup(p, a) {
      const L = this.L;
      const d = Math.hypot(p.x - L.stove.x, (p.y - L.stove.y) * 1.4);
      p.light.glowA = MC.clamp(1.1 - d / (520 * this.s), 0.12, 0.8) * a;
      p.light.from = 70 * (p.x > L.stove.x ? -1 : 1) * (p.flip < 0 ? -1 : 1);
    }

    // ── 조작 ─────────────────────────────────────────────
    hitDoor(x, y) {
      const d = this.L.door;
      if (y > d.y + 4 * this.s || y < d.y - d.h) return false;
      const u = (d.y - y) / d.h;
      return Math.abs(x - d.x) < (d.w / 2) * (1 - u * 0.85);
    }

    hitStove(x, y) {
      const L = this.L;
      const k = L.stove.k;
      return Math.abs(x - L.stove.x) < 62 * k && y > L.stove.y - 142 * k && y < L.stove.y;
    }

    hitKettle(x, y) {
      const L = this.L;
      const k = L.stove.k;
      return Math.hypot(x - (L.stove.x - 20 * k), y - (L.stove.y - 156 * k)) < 30 * k;
    }

    hitLamp(x, y) {
      const L = this.L;
      const k = L.pole.k;
      if (Math.hypot(x - (L.lamp.x + 22 * k), y - (L.lamp.y + 14 * k)) < 34 * k) return true;
      return Math.hypot(x - L.flame.x, y - (L.flame.y + 6 * L.flame.k)) < 26 * L.flame.k;
    }

    hitMug(x, y) {
      const m = this.L.mug;
      return Math.hypot(x - m.x, y - m.y) < 22 * m.k;
    }

    pointerDown(x, y) {
      if (this.leaving) return true;
      if (this.pup.hit(x, y)) {
        this.pup.poke();
        return true;
      }
      if (this.crowd && this.crowd.boopAt(x, y)) {
        if (this.onCute) this.onCute('boop');
        return true;
      }
      if (this.hitKettle(x, y)) {
        this.puff(this.L.spout, 14);
        if (this.onCute) this.onCute('pop');
        return true;
      }
      if (this.hitStove(x, y)) {
        this.addLog();
        return true;
      }
      if (this.hitMug(x, y)) {
        this.puff({ x: this.L.mug.x, y: this.L.mug.y - 10 * this.L.mug.k, k: this.L.mug.k }, 9);
        if (this.onCute) this.onCute('pop');
        return true;
      }
      if (this.hitLamp(x, y)) {
        this.toggleLights();
        return true;
      }
      if (this.hitDoor(x, y)) {
        this.walkOut();
        return true;
      }
      if (this.crowd && this.hitBed(x, y)) {
        this.tapBed(x);
        return true;
      }
      if (this.crowd && this.crowd.walkTo(x, y)) {
        this.toDoor = false;
        return true;
      }
      return false;
    }

    // 문으로 걸어가서 밖으로 (모닥불로)
    walkOut() {
      if (!this.crowd || this.leaving) return;
      const d = this.doorCanon();
      this.crowd.go({ X: d.X, Z: 24 });
      this.toDoor = true;
    }

    exitDoor() {
      if (this.leaving) return;
      this.leaving = true;
      this.toDoor = false;
      const d = this.doorCanon();
      this.crowd.portalWalk({ X: this.crowd.me.X, Z: this.crowd.me.Z }, { X: d.X, Z: -70 }, 0.9, false, () => {
        if (this.onExit) this.onExit();
      });
    }

    addLog() {
      if (this.stoveE > 1.12) return false;
      this.stoveE = Math.min(1.25, this.stoveE + 0.32);
      this.flare = 1;
      const W = this.L.stoveWin;
      for (let i = 0; i < 16; i++) this.spark(W, 1.4);
      if (this.onLog) this.onLog();
      if (this.crowd && Math.hypot(this.pup.x - this.L.stove.x, this.pup.y - this.L.stove.y) < 260 * this.s) this.pup.cheer();
      return true;
    }

    toggleLights() {
      this.dimTo = this.dimTo ? 0 : 1;
      if (this.onCute) this.onCute('pop');
      if (this.onToggle) this.onToggle('lights', this.dimTo === 1);
      return this.dimTo === 1;
    }

    toggleRain() {
      this.rainTo = this.rainTo ? 0 : 1;
      if (this.onToggle) this.onToggle('rain', this.rainTo === 1);
      return this.rainTo === 1;
    }

    puff(at, n) {
      for (let i = 0; i < n; i++) {
        this.steam.push({ x: at.x + MC.gauss() * 3 * at.k, y: at.y, vx: MC.gauss() * 10 * at.k, vy: -MC.rand(20, 40) * at.k, f: 0, max: MC.rand(1.4, 2.4), size: MC.rand(6, 11) * at.k, a: 0.32 });
      }
    }

    spark(W, power) {
      const cx = (W.x0 + W.x1) / 2;
      this.sparks.push({ x: cx + MC.gauss() * 10 * W.k, y: W.y1 - 8 * W.k, vx: MC.gauss() * 18 * W.k, vy: -MC.rand(30, 70) * power * W.k, f: 0, max: MC.rand(0.4, 0.9) });
    }

    // ── 움직임 ───────────────────────────────────────────
    update(dt) {
      const { s } = this;
      this.t += dt;
      const t = this.t;
      this.flare = Math.max(0, this.flare - dt * 0.35);
      this.stoveE = Math.max(0.3, this.stoveE - dt * 0.0035);
      this.dim += (this.dimTo - this.dim) * Math.min(1, dt * 1.6);
      this.rain += (this.rainTo - this.rain) * Math.min(1, dt * 0.45);
      if (this.useGL === null) this.useGL = !!(MC.FireGL && MC.FireGL.available());

      // 소리에서 '탁' 튄 순간에 맞춰 난로 창 안에 불티
      const W = this.L.stoveWin;
      if (this.events) {
        for (const ev of this.events()) for (let i = 0; i < 2 + ev.strength * 5; i++) this.spark(W, 0.6 + ev.strength);
      } else if (Math.random() < dt * 0.8) {
        for (let i = 0; i < 3; i++) this.spark(W, 0.7);
      }
      for (const p of this.sparks) {
        p.f += dt / p.max;
        p.vy += 30 * W.k * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      this.sparks = this.sparks.filter((p) => p.f < 1);

      // 주전자와 머그의 김
      const q = MC.clamp(this.quality, 0.4, 1);
      this.acc = (this.acc || 0) + dt * (3.5 + 3 * Math.min(1, this.stoveE)) * q;
      while (this.acc >= 1) {
        this.acc -= 1;
        const sp = this.L.spout;
        this.steam.push({ x: sp.x, y: sp.y, vx: MC.rand(4, 12) * sp.k, vy: -MC.rand(18, 30) * sp.k, f: 0, max: MC.rand(2.2, 3.4), size: MC.rand(5, 8) * sp.k, a: 0.2 });
      }
      this.accM = (this.accM || 0) + dt * 2.2 * q;
      while (this.accM >= 1) {
        this.accM -= 1;
        const m = this.L.mug;
        this.steam.push({ x: m.x + MC.gauss() * 2 * m.k, y: m.y - 8 * m.k, vx: MC.gauss() * 3 * m.k, vy: -MC.rand(10, 18) * m.k, f: 0, max: MC.rand(1.8, 2.8), size: MC.rand(3, 5) * m.k, a: 0.16 });
      }
      for (const p of this.steam) {
        p.f += dt / p.max;
        p.vx += MC.fbm(t * 0.6 + p.max * 7) * 6 * s * dt;
        p.vy *= 1 - 0.3 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      this.steam = this.steam.filter((p) => p.f < 1);
      if (this.steam.length > 160) this.steam.splice(0, this.steam.length - 160);

      // 바깥 모닥불의 불티
      const of = this.outFire;
      if (Math.random() < dt * (2.4 - 1.8 * this.rain)) {
        this.outSparks.push({ x: of.x + MC.gauss() * 3 * of.k, y: of.y - 14 * of.k, vx: MC.gauss() * 6 * of.k, vy: -MC.rand(24, 46) * of.k, f: 0, max: MC.rand(0.8, 1.6) });
      }
      for (const p of this.outSparks) {
        p.f += dt / p.max;
        p.vx += MC.fbm(t * 2 + p.max) * 10 * of.k * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      this.outSparks = this.outSparks.filter((p) => p.f < 1);

      // 멍이: 문으로 걸어가 닿으면 밖으로. 문 앞에서 위쪽(문 쪽) 방향키를 눌러도 나간다
      if (this.crowd) {
        this.crowd.update(dt);
        const c = this.crowd;
        const d = this.doorCanon();
        const near = Math.abs(c.me.X - d.X) < 70 && c.me.Z < 70 && !c.perched;
        if (!this.leaving && !c.portal) {
          if (this.toDoor && !c.target) {
            if (near) this.exitDoor();
            else this.toDoor = false;
          } else if (near && c.keys.y < 0 && c.me.Z < 30) this.exitDoor();
        }
        // 침대에 엎드리면 금세 꾸벅꾸벅
        if (c.perched) this.pup.sleepAfter = Math.min(this.pup.sleepAfter, 20);
        // 같은 자리에 둘이 누우면 꼬리표가 앞선 사람이 그 자리를 갖고, 나는 옆으로 옮기거나 내려온다
        if (c.perched && this.bedSpot && c.selfId) {
          for (const v of c.visitors.values()) {
            if (v.leaving || !v.st.q || v.st.l !== this.bedSpot || !(v.id < c.selfId)) continue;
            const other = this.freeSpot(this.bedSpot);
            if (other) {
              this.bedSpot = other;
              this.pup.hopV = -50;
            } else {
              c.hopDown();
              this.bedFull();
            }
            break;
          }
        }
      }
      this.pup.update(dt, { walking: !!(this.crowd && this.crowd.moving) });
    }

    // ── 그리기 ───────────────────────────────────────────
    draw(g) {
      if (!this.bg) return;
      const { w, h, s, t, L } = this;
      const E = Math.min(1.3, this.stoveE + this.flare * 0.5);
      const flick = 0.88 + 0.12 * MC.fbm(t * 2.6 + 3);
      const lampF = 0.92 + 0.08 * MC.fbm(t * 3.1 + 11);
      const lit = 1 - 0.8 * this.dim;
      g.drawImage(this.bg, 0, 0, w, h);

      this.drawOutside(g, flick);
      put(g, this.props.drapes, L.door.x, L.door.y);
      put(g, this.props.winFrame, L.win.x, L.win.y);

      // 천막을 물들이는 등불과 줄전구 빛
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.36 * lit * lampF;
      const R = 330 * s;
      g.drawImage(SPR.warm, L.lamp.x + 22 * s - R, L.lamp.y - R * 0.8, R * 2, R * 1.7);
      g.globalAlpha = 0.16 * lit;
      g.drawImage(SPR.warm, L.apex.x - 240 * s, L.apex.y - 60 * s, 480 * s, 260 * s);
      // 바닥에 고인 빛
      g.globalAlpha = 0.18 * lit * lampF;
      g.drawImage(SPR.warm, L.pole.x - 300 * s, L.pole.y - 40 * s, 600 * s, 230 * s);
      // 난로 앞 바닥과 벽에 번지는 불빛
      const se = Math.min(1, E) * flick;
      g.globalAlpha = 0.34 * se;
      g.drawImage(SPR.fire, L.stove.x - 220 * s, L.stove.y - 150 * s, 440 * s, 260 * s);
      // 문턱으로 스며드는 바깥 모닥불 빛
      g.globalAlpha = (0.26 - 0.14 * this.rain) * flick;
      g.drawImage(SPR.fire, L.door.x - 120 * s, L.door.y - 40 * s, 240 * s, 110 * s);
      this.drawBulbs(g, lit);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';

      // 가구와 멍이들, 앞뒤 순서대로
      const items = this.items.map((it) => ({ y: it.y, draw: () => { put(g, it.sp, it.x, it.y); if (it.after) it.after(g, E, flick); } }));
      if (this.crowd) {
        this.crowd.lights(1);
        for (const d of this.crowd.drawables(this.dpr, null, w)) items.push(d);
      } else {
        items.push({ y: this.pup.y, draw: () => this.pup.draw(g, this.dpr) });
      }
      items.sort((a, b) => a.y - b.y);
      for (const it of items) it.draw(g);

      this.drawSteam(g);

      // 불빛을 낮추면 어둑해지고, 난로와 등잔, 바깥 불만 또렷하다
      if (this.dim > 0.01) {
        g.fillStyle = `rgba(20,11,14,${0.6 * this.dim})`;
        g.fillRect(0, 0, w, h);
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = 0.32 * this.dim * se;
        g.drawImage(SPR.fire, L.stove.x - 200 * s, L.stove.y - 160 * s, 400 * s, 260 * s);
        g.globalAlpha = 0.3 * this.dim * flick;
        const tf = L.flame;
        g.drawImage(SPR.warm, tf.x - 110 * s, tf.y - 70 * s, 220 * s, 150 * s);
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
        this.drawStoveFire(g, E, flick, true);
        this.drawTableFlame(g, flick, true);
        this.drawBulbs(g, 0.32 * this.dim, true);
      }

      // 등불 근처를 떠다니는 먼지
      g.globalCompositeOperation = 'lighter';
      const nm = Math.round(this.motes.length * MC.clamp(this.quality, 0.4, 1));
      for (let i = 0; i < nm; i++) {
        const m = this.motes[i];
        const a = m.a + t * 0.05 * m.sp;
        const r = (40 + m.r * 170) * s;
        const x = L.lamp.x + 22 * s + Math.cos(a) * r + MC.fbm(t * 0.2 + m.ph) * 20 * s;
        const y = L.lamp.y + 40 * s + Math.sin(a * 1.3) * r * 0.55;
        const b = (0.5 + 0.5 * Math.sin(t * m.sp + m.ph)) * 0.35 * (1 - 0.7 * this.dim);
        g.globalAlpha = b;
        const sz = 3.2 * s;
        g.drawImage(SPR.mote, x - sz, y - sz, sz * 2, sz * 2);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      g.drawImage(this.vignette, 0, 0, w, h);
    }

    drawBulbs(g, lit, cores) {
      const { s, t } = this;
      g.globalCompositeOperation = 'lighter';
      for (const b of this.bulbs) {
        const tw = 0.86 + 0.14 * Math.sin(t * b.sp + b.ph);
        const r = 13 * s * b.r;
        g.globalAlpha = 0.75 * tw * lit;
        g.drawImage(SPR.bulb, b.x - r, b.y - r, r * 2, r * 2);
      }
      g.globalAlpha = 1;
      if (cores !== undefined || lit > 0.05) {
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = `rgba(255,236,196,${Math.min(1, 0.35 + lit)})`;
        for (const b of this.bulbs) {
          g.beginPath();
          g.arc(b.x, b.y + 1.2 * s, 2.1 * s * b.r, 0, Math.PI * 2);
          g.fill();
        }
      }
      g.globalCompositeOperation = 'lighter';
    }

    drawOutside(g, flick) {
      const { L, s, t } = this;
      const d = L.door;
      const rain = this.rain;
      g.save();
      g.translate(d.x, d.y);
      this.doorPath(g);
      g.restore();
      g.save();
      g.clip();
      // 하늘: 지평선 쪽이 모닥불에 살짝 물든다
      const sky = g.createLinearGradient(0, d.y - d.h, 0, d.y);
      sky.addColorStop(0, MC.rgba(MC.mix([10, 16, 42], [30, 34, 48], rain)));
      sky.addColorStop(0.62, MC.rgba(MC.mix([34, 30, 64], [40, 40, 54], rain)));
      sky.addColorStop(0.78, MC.rgba(MC.mix([86, 52, 58], [52, 46, 54], rain)));
      sky.addColorStop(1, '#0d0c10');
      g.fillStyle = sky;
      g.fillRect(d.x - d.w, d.y - d.h - 4, d.w * 2, d.h + 8);
      g.globalCompositeOperation = 'lighter';
      for (const st of this.stars) {
        if (st.win) continue;
        const a = (0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * st.sp + st.ph))) * (1 - rain * 0.85);
        g.fillStyle = `rgba(235,240,255,${a})`;
        g.fillRect(st.x - st.r / 2, st.y - st.r / 2, st.r, st.r);
      }
      g.globalCompositeOperation = 'source-over';
      // 먼 숲과 땅
      g.beginPath();
      g.moveTo(this.ridge[0][0], d.y);
      for (const [x, y] of this.ridge) g.lineTo(x, y);
      g.lineTo(this.ridge[this.ridge.length - 1][0], d.y);
      g.closePath();
      g.fillStyle = '#0b0d14';
      g.fill();
      g.fillStyle = '#100d0c';
      g.fillRect(d.x - d.w, d.y - d.h * 0.17, d.w * 2, d.h * 0.2);
      // 바깥 모닥불
      const of = this.outFire;
      const k = of.k;
      const size = (1 - 0.45 * rain) * (0.9 + 0.1 * flick);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.55 * size;
      g.drawImage(SPR.fire, of.x - 70 * k, of.y - 60 * k, 140 * k, 90 * k);
      g.globalAlpha = 1;
      for (let i = 0; i < 3; i++) {
        const fh = (22 - i * 6) * k * size * (0.85 + 0.15 * MC.fbm(t * 4 + i * 3));
        const fw = (8 - i * 2) * k;
        const sway = MC.fbm(t * 3 + i) * 3 * k;
        g.fillStyle = ['rgba(255,120,40,0.85)', 'rgba(255,180,80,0.9)', 'rgba(255,236,170,0.95)'][i];
        g.beginPath();
        g.moveTo(of.x - fw, of.y);
        g.quadraticCurveTo(of.x - fw * 0.8 + sway, of.y - fh * 0.6, of.x + sway * 1.6, of.y - fh);
        g.quadraticCurveTo(of.x + fw * 0.8 + sway, of.y - fh * 0.6, of.x + fw, of.y);
        g.closePath();
        g.fill();
      }
      for (const p of this.outSparks) {
        g.globalAlpha = Math.pow(1 - p.f, 1.3) * 0.9;
        g.fillStyle = '#ffcf7a';
        g.fillRect(p.x - 0.8 * s, p.y - 0.8 * s, 1.6 * s, 1.6 * s);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#1a1412';
      for (let i = -3; i <= 3; i++) {
        ell(g, of.x + i * 5 * k, of.y + 1.5 * k, 3 * k, 1.8 * k);
        g.fill();
      }
      // 풀잎 실루엣
      g.strokeStyle = '#08090c';
      g.lineWidth = 1.2 * s;
      for (let i = 0; i < 22; i++) {
        const x = d.x - d.w / 2 + (i / 21) * d.w;
        const hh = (4 + MC.hash(i * 3.3) * 9) * s;
        g.beginPath();
        g.moveTo(x, d.y);
        g.quadraticCurveTo(x + 1.5 * s, d.y - hh * 0.6, x + MC.fbm(t * 0.5 + i) * 2 * s + 2 * s, d.y - hh);
        g.stroke();
      }
      // 비
      if (rain > 0.02) this.drawRain(g, d.x - d.w / 2, d.y - d.h, d.w, d.h, rain);
      g.restore();

      // 그물창: 달과 별
      const wn = L.win;
      g.save();
      ell(g, wn.x, wn.y, wn.r, wn.r * 0.92);
      g.clip();
      const ws = g.createLinearGradient(0, wn.y - wn.r, 0, wn.y + wn.r);
      ws.addColorStop(0, MC.rgba(MC.mix([14, 20, 48], [30, 34, 48], rain)));
      ws.addColorStop(1, MC.rgba(MC.mix([30, 30, 62], [40, 40, 54], rain)));
      g.fillStyle = ws;
      g.fillRect(wn.x - wn.r, wn.y - wn.r, wn.r * 2, wn.r * 2);
      g.globalCompositeOperation = 'lighter';
      for (const st of this.stars) {
        if (!st.win) continue;
        const a = (0.3 + 0.5 * (0.5 + 0.5 * Math.sin(t * st.sp + st.ph))) * (1 - rain * 0.85);
        g.fillStyle = `rgba(235,240,255,${a})`;
        g.fillRect(st.x - st.r / 2, st.y - st.r / 2, st.r, st.r);
      }
      const mx = wn.x + wn.r * 0.28;
      const my = wn.y - wn.r * 0.22;
      const mr = wn.r * 0.3;
      g.globalAlpha = 0.6 * (1 - 0.7 * rain);
      g.drawImage(SPR.moon, mx - mr * 3, my - mr * 3, mr * 6, mr * 6);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      ell(g, mx, my, mr, mr);
      g.fillStyle = `rgba(250,246,226,${1 - 0.6 * rain})`;
      g.fill();
      ell(g, mx - mr * 0.3, my - mr * 0.1, mr * 0.22, mr * 0.2);
      g.fillStyle = `rgba(200,196,180,${0.5 - 0.3 * rain})`;
      g.fill();
      ell(g, mx + mr * 0.25, my + mr * 0.3, mr * 0.14, mr * 0.12);
      g.fill();
      if (rain > 0.02) {
        this.drawRain(g, wn.x - wn.r, wn.y - wn.r, wn.r * 2, wn.r * 2, rain * 0.8);
        // 그물에 맺힌 물방울
        for (const dr of this.winDrops) {
          const y = wn.y + (((dr.ph + t * dr.sp) % 1) - 0.5) * wn.r * 1.6;
          const x = wn.x + Math.cos(dr.a) * dr.r * wn.r;
          g.fillStyle = `rgba(220,230,255,${0.55 * rain})`;
          ell(g, x, y, 1.6 * s, 2 * s);
          g.fill();
        }
      }
      g.restore();
    }

    drawRain(g, x0, y0, W, H, a) {
      const { s, t } = this;
      g.strokeStyle = `rgba(200,212,240,${0.38 * a})`;
      g.lineWidth = 1 * s;
      g.beginPath();
      const n = Math.round(this.rainLines.length * a);
      for (let i = 0; i < n; i++) {
        const r = this.rainLines[i];
        const y = y0 + (((r.v + t * 1.6 * r.sp) % 1) * (H + 30 * s)) - 15 * s;
        const x = x0 + r.u * W - (y - y0) * 0.12;
        const len = 14 * s * r.len;
        g.moveTo(x, y);
        g.lineTo(x - len * 0.12, y + len);
      }
      g.stroke();
    }

    drawStoveFire(g, E, flick, over) {
      const W = this.L.stoveWin;
      const { t } = this;
      const k = W.k;
      const cx = (W.x0 + W.x1) / 2;
      const ww = W.x1 - W.x0;
      const wh = W.y1 - W.y0;
      g.save();
      MC.roundRect(g, W.x0, W.y0, ww, wh, 6 * k);
      g.clip();
      if (!over) {
        const inner = g.createLinearGradient(0, W.y0, 0, W.y1);
        inner.addColorStop(0, '#120604');
        inner.addColorStop(1, '#3a1206');
        g.fillStyle = inner;
        g.fillRect(W.x0, W.y0, ww, wh);
        // 숯불과 장작
        for (let i = 0; i < 9; i++) {
          const x = W.x0 + ((i + 0.5) / 9) * ww;
          const b = 0.55 + 0.45 * Math.sin(t * (0.8 + MC.hash(i) * 0.9) + i * 2.1);
          g.fillStyle = `rgba(255,${Math.round(90 + 90 * b)},40,${0.6 + 0.35 * b})`;
          ell(g, x, W.y1 - 4 * k, 4.4 * k, 3 * k);
          g.fill();
        }
        for (const [x, a] of [[-12, -0.12], [10, 0.1]]) {
          g.save();
          g.translate(cx + x * k, W.y1 - 10 * k);
          g.rotate(a);
          MC.roundRect(g, -16 * k, -4 * k, 32 * k, 8 * k, 4 * k);
          g.fillStyle = '#22140c';
          g.fill();
          g.strokeStyle = `rgba(255,140,50,${0.5 + 0.3 * flick})`;
          g.lineWidth = 1.2 * k;
          g.stroke();
          g.restore();
        }
      }
      g.globalCompositeOperation = 'lighter';
      let drawn = false;
      if (this.useGL) {
        const fw = ww * 1.35;
        const fh = fw * 1.25;
        const scale = Math.min(this.dpr || 1, 1.5) * MC.FireGL.scale;
        const c = MC.FireGL.render(fw * scale, fh * scale, t, 0.4 + 0.5 * Math.min(1.2, E), this.seed);
        if (c) {
          g.globalAlpha = over ? 0.5 : 1;
          g.drawImage(c, cx - fw / 2, W.y1 + 6 * k - fh, fw, fh);
          drawn = true;
        } else this.useGL = false;
      }
      if (!drawn) {
        for (let i = 0; i < 4; i++) {
          const fh = wh * (0.55 + 0.35 * Math.min(1, E)) * (0.8 + 0.2 * MC.fbm(t * 4 + i * 2));
          const fx = cx + (i - 1.5) * 9 * k + MC.fbm(t * 3 + i) * 3 * k;
          const fwid = 9 * k;
          const grd = g.createLinearGradient(0, W.y1, 0, W.y1 - fh);
          grd.addColorStop(0, 'rgba(255,230,160,0.9)');
          grd.addColorStop(0.5, 'rgba(255,140,50,0.7)');
          grd.addColorStop(1, 'rgba(255,80,20,0)');
          g.fillStyle = grd;
          g.beginPath();
          g.moveTo(fx - fwid, W.y1);
          g.quadraticCurveTo(fx - fwid * 0.6, W.y1 - fh * 0.6, fx, W.y1 - fh);
          g.quadraticCurveTo(fx + fwid * 0.6, W.y1 - fh * 0.6, fx + fwid, W.y1);
          g.closePath();
          g.fill();
        }
      }
      g.globalAlpha = 1;
      for (const p of this.sparks) {
        g.globalAlpha = Math.pow(1 - p.f, 1.2);
        g.fillStyle = '#ffd38a';
        g.fillRect(p.x - 0.9 * k, p.y - 0.9 * k, 1.8 * k, 1.8 * k);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      // 유리에 비친 빛
      g.strokeStyle = 'rgba(255,255,255,0.12)';
      g.lineWidth = 3 * k;
      g.beginPath();
      g.moveTo(W.x0 + ww * 0.2, W.y0 + wh * 0.9);
      g.lineTo(W.x0 + ww * 0.5, W.y0 + wh * 0.1);
      g.moveTo(W.x0 + ww * 0.36, W.y0 + wh * 0.95);
      g.lineTo(W.x0 + ww * 0.62, W.y0 + wh * 0.2);
      g.stroke();
      g.restore();
      // 창틀 밖으로 번지는 빛
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = (over ? 0.25 : 0.4) * Math.min(1, E) * flick;
      g.drawImage(SPR.fire, cx - ww * 1.4, W.y0 - wh * 0.7, ww * 2.8, wh * 2.4);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }

    flameAt(g, x, y, k, flick, size, glowA) {
      const t = this.t;
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = glowA;
      const R = 46 * k;
      g.drawImage(SPR.warm, x - R, y - R, R * 2, R * 2);
      g.globalAlpha = 1;
      const fh = size * k * (0.85 + 0.15 * flick);
      const sway = MC.fbm(t * 2.4 + x * 0.01) * 1.4 * k;
      const grd = g.createLinearGradient(0, y + 2 * k, 0, y - fh);
      grd.addColorStop(0, 'rgba(255,170,70,0.95)');
      grd.addColorStop(0.5, 'rgba(255,226,150,0.95)');
      grd.addColorStop(1, 'rgba(255,250,220,0)');
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(x - 3 * k, y + 2 * k);
      g.quadraticCurveTo(x - 3.4 * k, y - fh * 0.5, x + sway, y - fh);
      g.quadraticCurveTo(x + 3.4 * k, y - fh * 0.5, x + 3 * k, y + 2 * k);
      g.closePath();
      g.fill();
      g.globalCompositeOperation = 'source-over';
    }

    drawTableFlame(g, flick, over) {
      const f = this.L.flame;
      this.flameAt(g, f.x, f.y, f.k, flick, 11, over ? 0.35 : 0.42);
    }

    drawLampFlame(g, flick) {
      const L = this.L;
      const k = L.pole.k;
      this.flameAt(g, L.lamp.x + 22 * k, L.lamp.y + 18 * k, k * 1.2, flick, 12, 0.55 * (1 - 0.6 * this.dim));
    }

    drawSteam(g) {
      for (const p of this.steam) {
        const a = Math.sin(Math.PI * Math.min(1, p.f * 1.1)) * p.a;
        if (a < 0.01) continue;
        const sz = p.size * (1 + p.f * 2.6);
        g.globalAlpha = a;
        g.drawImage(SPR.steam, p.x - sz, p.y - sz, sz * 2, sz * 2);
      }
      g.globalAlpha = 1;
    }
  }

  MC.TentScene = TentScene;
})(window.MC = window.MC || {});
