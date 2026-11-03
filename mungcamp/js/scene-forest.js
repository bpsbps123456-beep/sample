/* 멍캠프 — 숲멍: 아침 햇살이 비껴 드는 편백 숲.
   오른쪽의 큰 편백에는 낮은 가지가 둘. 가지를 톡 하면 폴짝 올라가 엎드리고, 네 다리를 축 늘어뜨린 채 꾸벅꾸벅 존다.
   잎 사이로 햇빛이 일렁이고, 가끔 다람쥐가 가지 끝에서 열매를 먹고, 오목눈이가 내려앉아 지저귄다 */
(function (MC) {
  'use strict';

  let SPR = null;
  function sprites() {
    if (SPR) return SPR;
    SPR = {
      mote: MC.glow([255, 246, 214], 16, 0.25),
      sun: MC.glow([255, 246, 220], 256, 0.1),
      fog: MC.glow([232, 238, 222], 128, 0.2),
      dapple: MC.glow([255, 240, 198], 64, 0.4),
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

  const INK = '#5b3d2c';

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

  // 다람쥐: 가끔 줄기를 타고 내려와 아래 가지 끝으로 달려가 솔방울을 오물오물 먹고 돌아간다
  class Squirrel {
    constructor() {
      this.state = 'away';
      this.next = MC.rand(16, 30);
      this.t = 0;
      this.u = 0;
      this.want = 0.94;
      this.down = 0;
      this.alertT = 0;
      this.sitT = 0;
    }

    update(dt) {
      this.t += dt;
      this.alertT = Math.max(0, this.alertT - dt);
      switch (this.state) {
        case 'away':
          this.next -= dt;
          if (this.next <= 0) {
            this.state = 'descend';
            this.down = 0;
          }
          break;
        case 'descend':
          this.down = Math.min(1, this.down + dt / 1.7);
          if (this.down >= 1) {
            this.state = 'run';
            this.u = 0.03;
          }
          break;
        case 'run':
          this.u = Math.min(this.want, this.u + dt * 0.3);
          if (this.u >= this.want) {
            this.state = 'sit';
            this.sitT = MC.rand(8, 13);
          }
          break;
        case 'sit':
          this.sitT -= dt;
          if (this.sitT <= 0) this.state = 'back';
          break;
        case 'back':
          this.u = Math.max(0.03, this.u - dt * 0.34);
          if (this.u <= 0.03) this.state = 'ascend';
          break;
        default:
          this.down = Math.max(0, this.down - dt / 1.4);
          if (this.down <= 0) {
            this.state = 'away';
            this.next = MC.rand(45, 85);
          }
      }
    }

    poke() {
      if (this.state === 'sit' || this.state === 'run') {
        this.alertT = 1.3;
        if (this.state === 'sit') this.sitT = Math.min(this.sitT, 1.5);
        return true;
      }
      return false;
    }

    // 지금 자리와 몸짓
    pose(sc) {
      const br = sc.tree.branches[0];
      const k = sc.s * 0.8;
      if (this.state === 'descend' || this.state === 'ascend') {
        const base = sc.branchPoint(br, 0.03);
        const top = base.y - 190 * sc.s;
        return { x: sc.tree.x - sc.tree.w * 0.46, y: MC.lerp(top, base.y, this.down), k, rot: this.state === 'descend' ? Math.PI / 2 : -Math.PI / 2, dir: 1, run: true };
      }
      const p = sc.branchPoint(br, this.u);
      return { x: p.x, y: p.y, k, rot: 0, dir: this.state === 'back' ? 1 : -1, run: this.state !== 'sit' };
    }

    hit(x, y, sc) {
      if (this.state === 'away') return false;
      const q = this.pose(sc);
      return Math.abs(x - q.x) < 26 * q.k && y > q.y - 48 * q.k && y < q.y + 8 * q.k;
    }

    draw(g, sc) {
      if (this.state === 'away') return;
      const q = this.pose(sc);
      const fur = '#b5743f';
      const furHi = '#d39a62';
      g.save();
      g.translate(q.x, q.y);
      g.rotate(q.rot);
      g.scale(q.k * q.dir, q.k);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.strokeStyle = INK;
      if (q.run) {
        const st = this.t * 16;
        // 꼬리는 뒤로 물결치며
        g.lineWidth = 12;
        g.strokeStyle = INK;
        g.beginPath();
        g.moveTo(-9, -8);
        g.quadraticCurveTo(-22, -10 + Math.sin(st * 0.5) * 3, -30, -20);
        g.stroke();
        g.lineWidth = 9;
        g.strokeStyle = furHi;
        g.stroke();
        // 다리
        g.fillStyle = fur;
        g.lineWidth = 1.4;
        g.strokeStyle = INK;
        for (const [lx, ph] of [[-6, 0], [7, Math.PI]]) {
          g.beginPath();
          g.ellipse(lx + Math.sin(st + ph) * 2.5, -1.5, 3, 2.2, 0, 0, Math.PI * 2);
          g.fill();
          g.stroke();
        }
        // 몸과 머리
        g.beginPath();
        g.ellipse(0, -8, 12, 6.8, -0.05, 0, Math.PI * 2);
        g.fillStyle = fur;
        g.fill();
        g.stroke();
        g.beginPath();
        g.arc(11, -11, 6.2, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.beginPath();
        g.moveTo(8, -16);
        g.lineTo(9.5, -21);
        g.lineTo(12, -16.5);
        g.fill();
        g.stroke();
        g.fillStyle = '#2a1a13';
        g.beginPath();
        g.arc(13, -12, 1.3, 0, Math.PI * 2);
        g.fill();
      } else {
        const nib = this.alertT > 0 ? 0 : Math.sin(this.t * 15) * 0.7;
        // 등 뒤로 둥글게 말아 올린 꼬리
        g.lineWidth = 13;
        g.strokeStyle = INK;
        g.beginPath();
        g.moveTo(-6, -5);
        g.bezierCurveTo(-24, -10, -22, -36, -10, -40);
        g.quadraticCurveTo(-4, -42, -3, -36);
        g.stroke();
        g.lineWidth = 10;
        g.strokeStyle = fur;
        g.stroke();
        g.lineWidth = 4;
        g.strokeStyle = furHi;
        g.beginPath();
        g.moveTo(-14, -14);
        g.bezierCurveTo(-20, -22, -18, -34, -10, -37);
        g.stroke();
        g.strokeStyle = INK;
        g.lineWidth = 1.4;
        // 몸
        g.fillStyle = fur;
        g.beginPath();
        g.ellipse(0, -12, 8.5, 11, -0.12, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.fillStyle = '#f3dcc0';
        g.beginPath();
        g.ellipse(3, -10, 4.4, 7.2, -0.1, 0, Math.PI * 2);
        g.fill();
        // 뒷발
        g.fillStyle = fur;
        g.beginPath();
        g.ellipse(-1, -1.5, 5, 2.6, 0, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        // 머리 (오물오물)
        g.save();
        g.translate(0, nib);
        g.fillStyle = fur;
        g.beginPath();
        g.arc(5, -26, 7, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.beginPath();
        g.moveTo(1.5, -31);
        g.lineTo(2.2, -38 - (this.alertT > 0 ? 2 : 0));
        g.lineTo(6, -32);
        g.fill();
        g.stroke();
        g.fillStyle = '#2a1a13';
        g.beginPath();
        g.arc(8, -27, 1.5, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(8.5, -27.6, 0.5, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(255,150,160,0.6)';
        g.beginPath();
        g.ellipse(8, -23.5, 2, 1.2, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#2a1a13';
        g.beginPath();
        g.arc(11.8, -25, 0.9, 0, Math.PI * 2);
        g.fill();
        g.restore();
        // 앞발에 든 편백 열매
        if (this.alertT <= 0) {
          g.fillStyle = '#8a5a34';
          g.beginPath();
          g.arc(10, -17 + nib * 0.5, 3.4, 0, Math.PI * 2);
          g.fill();
          g.stroke();
          g.strokeStyle = 'rgba(255,220,170,0.6)';
          g.lineWidth = 0.8;
          g.beginPath();
          g.moveTo(7.6, -17 + nib * 0.5);
          g.lineTo(12.4, -17 + nib * 0.5);
          g.moveTo(10, -19.5 + nib * 0.5);
          g.lineTo(10, -14.5 + nib * 0.5);
          g.stroke();
        }
        g.strokeStyle = INK;
        g.lineWidth = 1.4;
        g.fillStyle = fur;
        g.beginPath();
        g.ellipse(8, -15.5, 2.6, 2, 0.4, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      }
      g.restore();
    }
  }

  // 오목눈이: 하얗고 동그란 작은 새. 가끔 가지 끝에 내려앉아 콩콩 뛰고 지저귄다
  class Bird {
    constructor(i) {
      this.i = i;
      this.state = 'away';
      this.next = MC.rand(10, 26) + i * 9;
      this.t = 0;
      this.f = 0;
      this.hop = 0;
      this.hopT = MC.rand(1, 3);
      this.off = 0;
      this.chirpT = MC.rand(1.5, 4);
      this.dir = 1;
    }

    perch(sc) {
      const br = sc.tree.branches[this.i % sc.tree.branches.length];
      const p = sc.branchPoint(br, this.i ? 0.97 : 0.9);
      return { x: p.x + this.off * sc.s, y: p.y - this.hop * 6 * sc.s };
    }

    start(sc) {
      return { x: this.i ? -40 * sc.s : sc.w * 0.45, y: -40 * sc.s };
    }

    update(dt, sc, chirp) {
      this.t += dt;
      if (this.state === 'away') {
        this.next -= dt;
        if (this.next <= 0) {
          this.state = 'in';
          this.f = 0;
        }
        return;
      }
      if (this.state === 'in' || this.state === 'out') {
        this.f += dt / 2.6;
        if (this.f >= 1) {
          if (this.state === 'in') {
            this.state = 'perch';
            this.stay = MC.rand(9, 16);
          } else {
            this.state = 'away';
            this.next = MC.rand(28, 60);
          }
        }
        return;
      }
      this.stay -= dt;
      this.hopT -= dt;
      if (this.hopT <= 0) {
        this.hopT = MC.rand(1.2, 3.4);
        this.hopV = 1;
        this.off = MC.clamp(this.off + MC.rand(-9, 9), -14, 6);
        this.dir = Math.random() < 0.5 ? -1 : 1;
      }
      this.hop = this.hopV > 0 ? Math.sin(Math.PI * (1 - this.hopV)) : 0;
      this.hopV = Math.max(0, (this.hopV || 0) - dt * 4);
      this.chirpT -= dt;
      if (this.chirpT <= 0) {
        this.chirpT = MC.rand(3, 7);
        if (chirp) chirp();
      }
      if (this.stay <= 0) this.leave();
    }

    leave() {
      if (this.state !== 'perch') return false;
      this.state = 'out';
      this.f = 0;
      return true;
    }

    pos(sc) {
      const P = this.perch(sc);
      if (this.state === 'perch') return { x: P.x, y: P.y, fly: false };
      const S = this.start(sc);
      const e = this.state === 'in' ? 1 - Math.pow(1 - this.f, 2) : this.f * this.f;
      const a = this.state === 'in' ? S : P;
      const b = this.state === 'in' ? P : { x: S.x + (this.i ? -60 : 60) * sc.s, y: S.y };
      return { x: MC.lerp(a.x, b.x, e), y: MC.lerp(a.y, b.y, e) - Math.abs(Math.sin(e * Math.PI * 3)) * 18 * sc.s, fly: true };
    }

    hit(x, y, sc) {
      if (this.state !== 'perch') return false;
      const q = this.pos(sc);
      return Math.hypot(x - q.x, y - (q.y - 8 * sc.s)) < 18 * sc.s;
    }

    draw(g, sc) {
      if (this.state === 'away') return;
      const q = this.pos(sc);
      const k = sc.s * 0.82;
      g.save();
      g.translate(q.x, q.y);
      g.scale(k * (q.fly ? (this.state === 'in' ? (this.i ? 1 : -1) : this.i ? -1 : 1) : this.dir), k);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      // 긴 꼬리
      g.strokeStyle = '#2b2b33';
      g.lineWidth = 3.4;
      g.beginPath();
      g.moveTo(-7, -9);
      g.lineTo(-22, q.fly ? -10 : -3);
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.8)';
      g.lineWidth = 1;
      g.stroke();
      // 동그란 몸
      const grd = g.createRadialGradient(-2, -13, 1, 0, -10, 10);
      grd.addColorStop(0, '#ffffff');
      grd.addColorStop(1, '#efe6ea');
      g.fillStyle = grd;
      g.strokeStyle = INK;
      g.lineWidth = 1.3;
      g.beginPath();
      g.ellipse(0, -10, 9, 8, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      // 분홍빛 옆구리와 검은 눈썹줄
      g.fillStyle = 'rgba(232,168,182,0.75)';
      g.beginPath();
      g.ellipse(-2, -7, 4.5, 3, -0.3, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#2b2b33';
      g.lineWidth = 1.8;
      g.beginPath();
      g.moveTo(-1, -15);
      g.quadraticCurveTo(3, -16.5, 7.5, -14);
      g.stroke();
      g.fillStyle = '#1d1414';
      g.beginPath();
      g.arc(4.5, -12.5, 1.2, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.moveTo(8.6, -11.5);
      g.lineTo(11, -10.8);
      g.lineTo(8.6, -10);
      g.fill();
      // 날개
      const flap = q.fly ? Math.sin(this.t * 26) : 0;
      g.fillStyle = '#3a3640';
      g.beginPath();
      g.ellipse(-3, -10 - flap * 4, 5.5, 3 + Math.abs(flap) * 2.5, -0.4 - flap * 0.5, 0, Math.PI * 2);
      g.fill();
      if (!q.fly) {
        g.strokeStyle = '#6b5048';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-1.5, -2.5);
        g.lineTo(-1.5, 0.5);
        g.moveTo(2, -2.5);
        g.lineTo(2, 0.5);
        g.stroke();
      }
      g.restore();
    }
  }

  // 그루터기에 누가 있으면 숲 바닥에 흩어져 앉는다 (오른쪽 큰 편백 밑동은 비워 둔다)
  const FOREST_SEATS = [
    [400, 520], [540, 380], [660, 560], [760, 420], [300, 760], [470, 800], [620, 820], [740, 700],
  ].map(([X, Z]) => ({ X, Z }));

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
      this.spot = 1; // 내가 올라앉은 자리: 1 그루터기, 2.. 나뭇가지 (0 이면 바닥)
      this.pendingSpot = 0;
      this.squirrel = new Squirrel();
      this.birds = [new Bird(0), new Bird(1)];
      this.onChirp = null;
      this.onSquirrel = null;
      this.onToast = null;
      // 멍이: 새싹을 달고 그루터기에 앉아 있다
      this.pup = new MC.Pup({
        outfit: 'sprout',
        light: { ambient: null, glow: [255, 244, 214], glowA: 0.14, from: -70 },
      });
      this.pup.onEvent = (kind) => { if (this.onCute) this.onCute(kind); };
      // 함께 걷기: 숲 바닥을 걷고, 그루터기를 톡 하면 다시 올라앉는다
      if (!this.preview && MC.Crowd) {
        const sc = this;
        this.crowd = new MC.Crowd(this.pup, {
          place: 'forest',
          outfit: 'sprout',
          light: { ambient: null, glow: [255, 244, 214], glowA: 0.14, from: -70 },
          start: { X: 300, Z: 400 },
          toScreen: (X, Z) => {
            const b = this.band();
            return { x: (X / 1000) * this.w, y: b.top + (Z / 1000) * (b.bot - b.top), k: this.s * 0.95 * (0.9 + (0.22 * Z) / 1000) };
          },
          toCanon: (x, y) => {
            const b = this.band();
            return { X: (x / this.w) * 1000, Z: ((y - b.top) / (b.bot - b.top)) * 1000 };
          },
          bounds: () => {
            const m = Math.min(200, ((44 * this.s) / this.w) * 1000);
            const right = this.tree ? ((this.tree.x - this.tree.w * 0.62) / this.w) * 1000 : 1000 - m;
            return { x0: m, x1: Math.min(1000 - m, right), z0: 0, z1: 1000 };
          },
          blockers: () => [this.stumpBlock()],
          floor: (x, y) => y > this.band().top - 8 * this.s,
          speed: () => 130 * this.s,
          pose: () => ({ view: 'front', turn: this.pup.flip < 0 ? -0.3 : 0.3, flip: 1, stick: false }),
          seats: () => FOREST_SEATS,
          env: () => ({
            wind: this.wind * 0.6,
            walkEps: 4,
            lieOf: (st) => !!st.q && st.l >= 2,
            restOf: (st) => (st.q && st.l >= 2 ? 'branch' : null),
          }),
          // 올라앉는 자리: 그루터기(1)와 나뭇가지 자리들(2..). 한 자리에 한 마리
          perch: {
            manage: true,
            jumpArc: true,
            via: (from, fromSpot, toSpot) => sc.via(from, fromSpot, toSpot),
            get X() {
              return sc.footOf(sc.spot || sc.pendingSpot || 1).X;
            },
            get Z() {
              return sc.footOf(sc.spot || sc.pendingSpot || 1).Z;
            },
            seat: (id, st) => sc.seatOf(id ? (st && st.l ? st.l : 1) : sc.spot || sc.pendingSpot || 1, id),
            hit: (x, y) => sc.spotAt(x, y) > 0,
            claim: () => sc.claimSpot(),
            onSit: () => sc.onSpot(),
            onLeave: () => sc.leaveSpot(),
            onFull: () => sc.spotFull(),
          },
          extra: () => ({ l: sc.crowd && sc.crowd.perched ? sc.spot : 0 }),
          // 가지에 엎드리면 가지가 기운 만큼 함께 기운다
          tilt: (p, me, v) => {
            if (p.rest !== 'branch') return 0;
            const sp = sc.spots && sc.spots[me ? sc.spot : v.st.l];
            return sp && sp.a ? sp.a : 0;
          },
        });
      }
      sprites();
    }

    // 걸을 수 있는 숲 바닥 띠
    band() {
      return { top: this.h * 0.865, bot: this.h - 8 * this.s };
    }

    // 그루터기 밑동: 걸어서 지나갈 수 없다
    stumpBlock() {
      const b = this.band();
      const H = b.bot - b.top;
      const st = this.stump;
      return {
        x: (st.x / this.w) * 1000,
        z: ((st.top + st.h - 6 * this.s - b.top) / H) * 1000,
        rx: ((st.w * 0.68) / this.w) * 1000,
        rz: ((18 * this.s) / H) * 1000,
      };
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
      this.buildTree();
      this.buildDapples();
      const pup = this.pup;
      pup.k = this.s * 0.95;
      pup.x = st.x;
      pup.y = st.top + 3 * this.s;
      if (this.crowd) this.crowd.layout();
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

    // ── 큰 편백과 낮은 가지 둘 ───────────────────────────────────
    buildTree() {
      const { w, h, dpr, s } = this;
      const P = w < h * 0.9;
      const b = this.band();
      const tx = w * (P ? 0.93 : 0.87);
      const tw = (P ? 62 : 86) * s;
      const x0 = tx - tw * 0.4;
      // 아래에서 위로: 줄기에서 나오는 높이(바닥 위), 끝 위치(화면 가로 비율), 끝이 올라가는 정도, 두께
      const levels = P
        ? [[86, 0.4, 22, 38, 17], [196, 0.5, 18, 33, 15], [300, 0.42, 18, 30, 13], [400, 0.55, 16, 27, 12]]
        : [[94, 0.49, 22, 38, 17], [210, 0.6, 18, 33, 15], [322, 0.52, 18, 30, 13], [430, 0.63, 16, 27, 12]];
      const branches = levels.map(([up, x1, rise, th0, th1]) => {
        const y0 = b.top - up * s;
        return { x0, y0, x1: w * x1, y1: y0 - rise * s, th0: th0 * s, th1: th1 * s };
      });
      for (const br of branches) {
        br.cx = (br.x0 + br.x1) / 2;
        br.cy = Math.max(br.y0, br.y1) + 8 * s;
      }
      this.tree = { x: tx, w: tw, branches };
      // 자리: 1 그루터기, 2.. 아래 가지(줄기 쪽부터), 그다음 위 가지
      this.spots = [null, { kind: 'stump' }];
      branches.forEach((br, bi) => {
        const len = Math.abs(br.x0 - br.x1);
        const k = s * 0.9;
        const n = MC.clamp(Math.floor((len - 30 * s) / (104 * k)), 1, bi ? 2 : 3);
        for (let j = 0; j < n; j++) {
          const t = n === 1 ? 0.55 : 0.3 + (0.48 * j) / (n - 1);
          const p = this.branchPoint(br, t);
          // 엎드린 멍이는 가지 기울기를 살짝만 따른다 (너무 기울면 미끄러질 것 같으니)
          this.spots.push({ kind: 'branch', b: bi, t, x: p.x, y: p.y, k, a: MC.clamp(this.branchSlope(br, t), -0.1, 0.1) });
        }
      });

      const rnd = MC.rng(2468);
      const c = (this.treeImg = MC.canvas(w * dpr, h * dpr));
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      this.sprays = [makeSpray(80 * s, 11, dpr, true), makeSpray(66 * s, 23, dpr, false), makeSpray(56 * s, 37, dpr, true), makeSpray(72 * s, 51, dpr, false)];
      const spray = (x, y, a, i, sc = 1) => {
        const sp = this.sprays[i % this.sprays.length];
        g.save();
        g.translate(x, y);
        g.rotate(a);
        g.scale(sc, sc);
        g.drawImage(sp.c, -sp.ax, -sp.ay, sp.W, sp.H);
        g.restore();
      };

      // 가지 뒤로 드리운 잎 (가지보다 먼저): 위로 비스듬히, 옆으로 납작하게 겹겹이
      branches.forEach((br, bi) => {
        const n = bi ? 5 : 6;
        for (let i = 0; i < n; i++) {
          const t = 0.1 + (i / (n - 1)) * 0.82 + (rnd() - 0.5) * 0.06;
          const p = this.branchPoint(br, t);
          spray(p.x, p.y + 2 * s, Math.PI + (i % 2 ? -0.62 : -0.22) + (rnd() - 0.5) * 0.3, i + bi, (0.7 + rnd() * 0.35) * (bi > 1 ? 0.85 : 1));
        }
      });

      // 줄기: 아래로 갈수록 넓어지며 뿌리가 땅을 움켜쥔다
      const left = tx - tw / 2;
      const right = tx + tw / 2;
      g.beginPath();
      g.moveTo(left + tw * 0.06, -10);
      g.lineTo(left, b.top - 34 * s);
      g.quadraticCurveTo(left - 4 * s, b.top + 14 * s, left - tw * 0.34, h + 10);
      g.lineTo(right + tw * 0.34, h + 10);
      g.quadraticCurveTo(right + 4 * s, b.top + 14 * s, right, b.top - 34 * s);
      g.lineTo(right - tw * 0.06, -10);
      g.closePath();
      const bark = g.createLinearGradient(left, 0, right, 0);
      bark.addColorStop(0, '#c58e60');
      bark.addColorStop(0.3, '#9d6644');
      bark.addColorStop(0.75, '#6c442c');
      bark.addColorStop(1, '#4e3020');
      g.fillStyle = bark;
      g.fill();
      g.strokeStyle = 'rgba(58,38,26,0.85)';
      g.lineWidth = 2 * s;
      g.stroke();
      g.save();
      g.clip();
      // 세로로 길게 갈라지는 섬유질 껍질
      for (let i = 0; i < 34; i++) {
        const fx = left - tw * 0.2 + rnd() * tw * 1.4;
        const lightLine = rnd() < 0.38;
        g.strokeStyle = lightLine ? 'rgba(240,196,156,0.3)' : 'rgba(52,30,18,0.4)';
        g.lineWidth = (0.8 + rnd() * 1.8) * s;
        g.beginPath();
        let y = -10;
        let x = fx;
        g.moveTo(x, y);
        while (y < h + 10) {
          y += 26 * s;
          x += (rnd() - 0.5) * 3.2 * s;
          g.lineTo(x, y);
        }
        g.stroke();
      }
      // 길게 벗겨진 껍질 몇 가닥
      for (let i = 0; i < 5; i++) {
        const fx = left + tw * (0.15 + rnd() * 0.7);
        const y0 = rnd() * b.top * 0.8;
        const len = (60 + rnd() * 90) * s;
        g.strokeStyle = 'rgba(214,150,108,0.65)';
        g.lineWidth = (2 + rnd() * 2) * s;
        g.beginPath();
        g.moveTo(fx, y0);
        g.quadraticCurveTo(fx + 4 * s, y0 + len * 0.5, fx + (rnd() < 0.5 ? -7 : 7) * s, y0 + len);
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

      // 가지
      branches.forEach((br, bi) => {
        const N = 30;
        const top = [];
        const bot = [];
        for (let i = 0; i <= N; i++) {
          const t = i / N;
          const u = 1 - t;
          const x = u * u * br.x0 + 2 * u * t * br.cx + t * t * br.x1;
          const y = u * u * br.y0 + 2 * u * t * br.cy + t * t * br.y1;
          const th = MC.lerp(br.th0, br.th1, t) * (1 + 0.05 * Math.sin(t * 13 + bi));
          const flare = t < 0.1 ? (1 - t / 0.1) * br.th0 * 0.45 : 0;
          top.push([x, y - th / 2 - flare]);
          bot.push([x, y + th / 2 + flare * 0.7]);
        }
        g.beginPath();
        g.moveTo(top[0][0] + tw * 0.2, top[0][1] - 6 * s);
        for (const [x, y] of top) g.lineTo(x, y);
        const tip = top[N];
        const tipB = bot[N];
        g.quadraticCurveTo(tip[0] - br.th1 * 0.7, (tip[1] + tipB[1]) / 2, tipB[0], tipB[1]);
        for (let i = N; i >= 0; i--) g.lineTo(bot[i][0], bot[i][1]);
        g.lineTo(bot[0][0] + tw * 0.2, bot[0][1] + 6 * s);
        g.closePath();
        const bg = g.createLinearGradient(0, br.y0 - br.th0 * 0.8, 0, br.y0 + br.th0 * 0.8);
        bg.addColorStop(0, '#cf9a6b');
        bg.addColorStop(0.45, '#93603f');
        bg.addColorStop(1, '#53351f');
        g.fillStyle = bg;
        g.fill();
        g.strokeStyle = 'rgba(58,38,26,0.85)';
        g.lineWidth = 1.8 * s;
        g.stroke();
        // 가지를 따라 난 결
        g.save();
        g.clip();
        for (let j = 0; j < 4; j++) {
          const off = -0.3 + j * 0.2;
          g.strokeStyle = j % 2 ? 'rgba(52,30,18,0.35)' : 'rgba(240,196,156,0.22)';
          g.lineWidth = 1.1 * s;
          g.beginPath();
          for (let i = 0; i <= N; i++) {
            const x = top[i][0];
            const y = MC.lerp(top[i][1], bot[i][1], 0.5 + off) + Math.sin(i * 1.7 + j) * 0.8 * s;
            if (i === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
          }
          g.stroke();
        }
        g.restore();
        // 윗면의 폭신한 이끼
        for (let i = 0; i < 26; i++) {
          const t = 0.04 + rnd() * 0.9;
          const p = this.branchPoint(br, t);
          g.fillStyle = rnd() < 0.5 ? '#86b45c' : '#6a9a48';
          g.beginPath();
          g.ellipse(p.x + (rnd() - 0.5) * 8 * s, p.y + (1 + rnd() * 2) * s, (3 + rnd() * 6) * s, (1.6 + rnd() * 2) * s, 0, 0, Math.PI * 2);
          g.fill();
        }
        // 옹이
        const kp = this.branchPoint(br, 0.18 + rnd() * 0.1);
        g.fillStyle = 'rgba(60,36,22,0.55)';
        g.beginPath();
        g.ellipse(kp.x, kp.y + br.th0 * 0.45, 3.5 * s, 2.4 * s, 0, 0, Math.PI * 2);
        g.fill();
      });

      // 가지 아래로 늘어진 잎
      branches.forEach((br, bi) => {
        for (let i = 0; i < 3; i++) {
          const t = 0.18 + i * 0.32 + rnd() * 0.08;
          const p = this.branchPoint(br, t);
          spray(p.x, p.y + MC.lerp(br.th0, br.th1, t) * 0.75, Math.PI - 1.05 + (rnd() - 0.5) * 0.35, i + bi + 1, 0.6 + rnd() * 0.25);
        }
      });
      // 밑동: 뿌리 사이에 낀 이끼 (밑으로 갈수록 짙게)
      for (let i = 0; i < 26; i++) {
        const u = rnd();
        const y = b.top + 6 * s + Math.pow(rnd(), 0.6) * (h - b.top);
        const spread = tw * (0.5 + 0.35 * (y - b.top) / (h - b.top + 1));
        const x = tx + (u - 0.5) * spread * 2;
        g.fillStyle = rnd() < 0.5 ? 'rgba(111,157,76,0.85)' : 'rgba(85,127,58,0.85)';
        g.beginPath();
        g.ellipse(x, y, (5 + rnd() * 7) * s, (1.8 + rnd() * 2) * s, 0, Math.PI, 0);
        g.fill();
      }

      // 가지 끝에서 살랑이는 잎은 따로 그린다
      this.tips = [];
      branches.forEach((br, bi) => {
        const p = this.branchPoint(br, 1);
        this.tips.push({ x: p.x + 3 * s, y: p.y + br.th1 * 0.5, a: Math.PI + 0.25, spr: this.sprays[bi], ph: rnd() * 6 });
        this.tips.push({ x: p.x + 8 * s, y: p.y + br.th1 * 0.8, a: Math.PI - 0.55, spr: this.sprays[(bi + 1) % 3], ph: rnd() * 6 });
      });
    }

    // 가지 윗면의 한 점 (t: 0 줄기 … 1 끝)
    branchPoint(br, t) {
      const u = 1 - t;
      const x = u * u * br.x0 + 2 * u * t * br.cx + t * t * br.x1;
      const y = u * u * br.y0 + 2 * u * t * br.cy + t * t * br.y1;
      const th = MC.lerp(br.th0, br.th1, t);
      return { x, y: y - th / 2, th };
    }

    // 가지가 기운 정도 (왼쪽→오른쪽 방향의 각도). 엎드린 멍이도 그만큼 기운다
    branchSlope(br, t) {
      const dx = 2 * (1 - t) * (br.cx - br.x0) + 2 * t * (br.x1 - br.cx);
      const dy = 2 * (1 - t) * (br.cy - br.y0) + 2 * t * (br.y1 - br.cy);
      return Math.atan2(-dy, -dx);
    }

    // 높은 가지로 갈 때는 사이의 가지를 계단처럼 차례로 딛는다 (줄기 가까운 쪽)
    via(from, fromSpot, toSpot) {
      const level = (i) => (i >= 2 && this.spots[i] ? this.spots[i].b : -1);
      const a = level(fromSpot);
      const b = level(toSpot);
      const out = [];
      const step = (L) => {
        const br = this.tree.branches[L];
        const p = this.branchPoint(br, 0.14);
        return { x: p.x, y: p.y + 2 * this.s, k: this.s * 0.9 };
      };
      if (b > a) for (let L = a + 1; L < b; L++) out.push(step(L));
      else if (a > b) for (let L = a - 1; L > b; L--) out.push(step(L));
      return out;
    }

    drawTips(g) {
      for (const tp of this.tips) {
        const sway = Math.sin(this.t * 0.9 + tp.ph) * 0.05 + MC.fbm(this.t * 0.4 + tp.ph) * 0.04 + this.gust * 0.12 * Math.sin(this.t * 2.3 + tp.ph);
        const sp = tp.spr;
        g.save();
        g.translate(tp.x, tp.y);
        g.rotate(tp.a + sway);
        g.drawImage(sp.c, -sp.ax, -sp.ay, sp.W, sp.H);
        g.restore();
      }
    }

    // 잎 사이로 들어와 일렁이는 햇빛 조각 (바닥, 줄기, 가지 위)
    buildDapples() {
      const rnd = MC.rng(4242);
      const b = this.band();
      const s = this.s;
      this.dapples = [];
      for (let i = 0; i < 16; i++) {
        this.dapples.push({ on: 'floor', x: rnd() * this.w, y: MC.lerp(b.top - 4 * s, b.bot, rnd()), rx: (18 + rnd() * 30) * s, ry: (4 + rnd() * 6) * s, ph: rnd() * 6.28, sp: 0.15 + rnd() * 0.25 });
      }
      const T = this.tree;
      for (let i = 0; i < 7; i++) {
        this.dapples.push({ on: 'tree', x: T.x + (rnd() - 0.65) * T.w * 0.6, y: rnd() * b.top * 0.95, rx: (5 + rnd() * 6) * s, ry: (10 + rnd() * 16) * s, ph: rnd() * 6.28, sp: 0.15 + rnd() * 0.25 });
      }
      for (const br of T.branches) {
        for (let i = 0; i < 3; i++) {
          const p = this.branchPoint(br, 0.2 + i * 0.3 + rnd() * 0.1);
          this.dapples.push({ on: 'tree', x: p.x, y: p.y + 2 * s, rx: (12 + rnd() * 10) * s, ry: (3 + rnd() * 2) * s, ph: rnd() * 6.28, sp: 0.15 + rnd() * 0.25 });
        }
      }
    }

    drawDapples(g, on) {
      g.globalCompositeOperation = 'lighter';
      for (const d of this.dapples) {
        if (d.on !== on) continue;
        const a = (0.09 + 0.09 * MC.fbm(this.t * d.sp + d.ph)) * (1 + this.gust * 0.6);
        if (a <= 0.01) continue;
        const ox = Math.sin(this.t * 0.35 + d.ph) * 5 * this.s * (1 + this.gust);
        g.globalAlpha = Math.min(0.35, a);
        g.drawImage(SPR.dapple, d.x + ox - d.rx, d.y - d.ry, d.rx * 2, d.ry * 2);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }

    // ── 올라앉는 자리 ─────────────────────────────────────────
    seatOf(i, id) {
      const sp = this.spots && this.spots[i];
      if (i <= 1 || !sp) {
        const st = this.stump;
        return { x: st.x + (id ? (MC.hash(id.length * 7.3 + id.charCodeAt(id.length - 1)) - 0.5) * st.w * 0.5 : 0), y: st.top + 3 * this.s, k: this.s * 0.95 };
      }
      return { x: sp.x, y: sp.y + 3 * sp.k, k: sp.k };
    }

    // 그 자리 아래 바닥 (여기까지 걸어와서 폴짝)
    footOf(i) {
      const b = this.band();
      const sp = this.spots && this.spots[i];
      if (i <= 1 || !sp) return { X: (this.stump.x / this.w) * 1000, Z: ((this.stump.top + this.stump.h + 16 * this.s - b.top) / (b.bot - b.top)) * 1000 };
      const bd = this.crowd.cfg.bounds();
      return { X: MC.clamp((sp.x / this.w) * 1000, bd.x0 + 4, bd.x1 - 4), Z: 110 };
    }

    takenSpots() {
      const taken = new Set();
      if (this.crowd) for (const v of this.crowd.visitors.values()) if (!v.leaving && v.st.q) taken.add(v.st.l || 1);
      return taken;
    }

    // 빈자리: 바라는 자리와 가까운 것부터 (나뭇가지를 바랐으면 나뭇가지부터)
    freeSpot(want) {
      const taken = this.takenSpots();
      const order = [];
      for (let i = 1; i < this.spots.length; i++) order.push(i);
      order.sort((a, b) => ((a >= 2) === (want >= 2) ? 0 : 1) - ((b >= 2) === (want >= 2) ? 0 : 1) || Math.abs(a - want) - Math.abs(b - want));
      for (const i of order) if (!taken.has(i)) return i;
      return 0;
    }

    claimSpot() {
      const spot = this.freeSpot(this.pendingSpot || this.spot || 1);
      this.pendingSpot = 0;
      if (!spot) return false;
      this.spot = spot;
      return true;
    }

    // 나뭇가지에서는 엎드려 다리를 늘어뜨리고 금세 꾸벅꾸벅, 그루터기에서는 앉는다
    onSpot() {
      const branch = this.spot >= 2;
      this.pup.rest = branch ? 'branch' : null;
      this.pup.setLie(branch);
      if (branch) this.pup.sleepAfter = Math.min(this.pup.sleepAfter, 25);
    }

    leaveSpot() {
      this.pup.rest = null;
      this.pup.setLie(false);
      this.spot = 0;
    }

    spotFull() {
      if (this.onToast) this.onToast('나뭇가지가 꽉 찼어요');
    }

    // 누른 곳의 자리: 그루터기(1) 또는 가까운 가지 자리
    spotAt(x, y) {
      const st = this.stump;
      if (Math.abs(x - st.x) < st.w * 0.7 && y > st.top - 16 * this.s && y < st.top + st.h + 4 * this.s) return 1;
      let best = 0;
      let bd = Infinity;
      for (let i = 2; i < this.spots.length; i++) {
        const sp = this.spots[i];
        const dx = Math.abs(x - sp.x);
        if (dx > 72 * sp.k || y < sp.y - 84 * sp.k || y > sp.y + 36 * sp.k) continue;
        if (dx < bd) {
          bd = dx;
          best = i;
        }
      }
      return best;
    }

    // 자리를 톡: 걸어가서 폴짝 올라간다. 이미 올라앉아 있으면 그 자리로 곧장 폴짝
    tapSpot(want) {
      const c = this.crowd;
      const taken = this.takenSpots();
      if (c.perched && this.spot) {
        if (want === this.spot) return;
        if (taken.has(want)) {
          if (this.onToast) this.onToast('그 자리엔 친구가 있어요');
          return;
        }
        this.moveToSpot(want);
        return;
      }
      const spot = taken.has(want) ? this.freeSpot(want) : want;
      if (!spot) {
        this.spotFull();
        return;
      }
      this.pendingSpot = spot;
      c.go(this.footOf(spot), true);
    }

    moveToSpot(i) {
      const c = this.crowd;
      c.jumpFrom = { x: this.pup.x, y: this.pup.y };
      c.jumpT = 0;
      c.jumpVia = this.via(c.jumpFrom, this.spot || 1, i);
      this.spot = i;
      this.onSpot();
      c.posed = false;
      this.pup.hopV = -40;
      this.pup.emit('hop');
    }

    pointerDown(x, y) {
      if (this.pup.hit(x, y)) {
        this.pup.poke();
        return true;
      }
      // 다람쥐를 톡: 열매를 든 채 귀를 쫑긋. 새를 톡: 짹 하고 날아간다
      if (this.squirrel.hit(x, y, this) && this.squirrel.poke()) {
        if (this.onSquirrel) this.onSquirrel();
        return true;
      }
      for (const b of this.birds) {
        if (b.hit(x, y, this) && b.leave()) {
          if (this.onChirp) this.onChirp();
          return true;
        }
      }
      if (this.crowd) {
        // 함께 앉은 다른 멍이에게 하트
        if (this.crowd.boopAt(x, y)) {
          if (this.onCute) this.onCute('boop');
          return true;
        }
        // 그루터기나 나뭇가지를 톡: 그 자리로 가서 폴짝
        const spot = this.spotAt(x, y);
        if (spot) {
          this.tapSpot(spot);
          return true;
        }
        // 숲 바닥을 톡: 걸어간다
        if (this.crowd.walkTo(x, y)) return true;
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
      const c = this.crowd;
      if (c) {
        c.update(dt);
        // 같은 자리에 둘이 올라앉으면 꼬리표가 앞선 사람이 그 자리를 갖고, 나는 다른 빈자리로 폴짝 (없으면 내려온다)
        if (c.perched && this.spot && c.selfId) {
          for (const v of c.visitors.values()) {
            if (v.leaving || !v.st.q || (v.st.l || 1) !== this.spot || !(v.id < c.selfId)) continue;
            const other = this.freeSpot(this.spot);
            if (other) this.moveToSpot(other);
            else {
              c.hopDown();
              c.makeRoom(true);
            }
            break;
          }
        }
        if (c.perched && this.spot >= 2) pup.sleepAfter = Math.min(pup.sleepAfter, 25);
        const onBranch = c.perched && this.spot >= 2 && !c.jumpFrom;
        pup.rest = onBranch ? 'branch' : null;
        pup.setLie(onBranch);
      }
      this.squirrel.update(dt);
      for (const b of this.birds) b.update(dt, this, () => { if (this.onChirp) this.onChirp(); });
      if (this.nextLook <= 0 && !(this.crowd && this.crowd.moving)) {
        this.nextLook = MC.rand(7, 14);
        pup.baseTurn = MC.rand(-0.45, 0.45);
      }
      const head = pup.world(0, -72);
      const perch = pup.world(6 + pup.turn * 3, -118 + pup.headDrop + pup.lieDrop);
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
      pup.update(dt, { wind: this.wind * 0.6, look, walking: !!(this.crowd && this.crowd.moving) });
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

      // 바닥에 일렁이는 햇빛
      this.drawDapples(g, 'floor');
      // 그루터기 위의 멍이, 그리고 나비
      const sb = this.stumpBox;
      if (this.crowd) {
        // 그루터기 뒤로 지나가는 멍이, 그루터기, 그 위와 앞의 멍이
        const zb = this.stumpBlock().z;
        this.crowd.draw(g, this.dpr, (Z, up) => !up && Z < zb, w);
        g.drawImage(this.stumpImg, this.stump.x - sb.ox, this.stump.top - sb.oy, sb.W, sb.H);
        this.crowd.draw(g, this.dpr, (Z, up, spot) => (up && spot <= 1) || (!up && Z >= zb), w);
      } else {
        g.drawImage(this.stumpImg, this.stump.x - sb.ox, this.stump.top - sb.oy, sb.W, sb.H);
        this.pup.draw(g, this.dpr);
      }
      // 큰 편백과 가지, 그 위에 엎드린 멍이들 (가지 너머로 늘어진 뒷다리와 꼬리를 먼저)
      if (this.crowd) {
        const c = this.crowd;
        const back = (p, sp) => p.drawBranchBack(g, sp && sp.a ? sp.a : 0);
        if (c.perched && this.spot >= 2) back(this.pup, this.spots[this.spot]);
        const shown = c.shown();
        for (const v of c.visitors.values()) if (shown.has(v) && v.st.q && v.st.l >= 2) back(v.pup, this.spots[v.st.l]);
      }
      g.drawImage(this.treeImg, 0, 0, w, h);
      this.drawTips(g);
      if (this.crowd) this.crowd.draw(g, this.dpr, (Z, up, spot) => up && spot >= 2, w);
      this.drawDapples(g, 'tree');
      this.squirrel.draw(g, this);
      for (const b of this.birds) b.draw(g, this);
      for (const f of this.flies) f.draw(g, this.s * 1.05);

      for (const f of this.ferns) this.drawFern(g, f);
    }
  }

  MC.ForestScene = ForestScene;
})(window.MC = window.MC || {});
