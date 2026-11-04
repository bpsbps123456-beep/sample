/* 멍캠프 — 숲멍: 이끼 길과 작은 들꽃 사이로 아침 햇살이 비껴 드는 편백 숲.
   오른쪽 큰 편백의 가지를 톡 하면 폴짝 올라가 엎드리고, 네 다리를 축 늘어뜨린 채 꾸벅꾸벅 존다.
   잎 사이로 햇빛이 일렁이고, 가끔 다람쥐가 가지 끝에서 열매를 먹고, 오목눈이가 내려앉아 지저귄다 */
(function (MC) {
  'use strict';

  const { makeSpray } = MC.ForestTree;

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

  const TRUNK = [85, 76, 55];
  const FOG = [204, 223, 195];
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
        g.strokeStyle = this.edge;
        g.lineWidth = 0.5;
        g.globalAlpha = 0.55;
        g.beginPath();
        g.moveTo(1, 0); g.quadraticCurveTo(5, -3, 11, -6);
        g.moveTo(4, -2); g.lineTo(6, -8);
        g.moveTo(5, -3); g.lineTo(11, -2);
        g.moveTo(1, 1); g.quadraticCurveTo(4, 3, 8, 5);
        g.stroke();
        g.globalAlpha = 1;
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

  // 한 장씩 갈라지는 고사리 잎. 숲 바닥과 앞쪽 잎 모두 같은 형태를 쓰되,
  // 복잡한 잎맥과 작은 갈래는 크기가 바뀔 때만 그려 둔다.
  function fernFrond(g, x, y, len, angle, bend, light) {
    g.save();
    g.translate(x, y);
    g.rotate(angle + Math.PI / 2);
    const pts = [];
    g.strokeStyle = light ? '#91ad68' : '#507950';
    g.lineWidth = Math.max(0.5, len * 0.009);
    g.beginPath();
    g.moveTo(0, 0);
    for (let i = 1; i <= 19; i++) {
      const t = i / 19;
      const px = bend * len * t * t * 0.3;
      const py = -len * t;
      g.lineTo(px, py);
      pts.push({ x: px, y: py, t });
    }
    g.stroke();
    for (const p of pts) {
      const ll = len * 0.2 * Math.pow(Math.sin(Math.PI * p.t), 0.8);
      for (const side of [-1, 1]) {
        const ex = p.x + side * ll;
        const ey = p.y - ll * 0.42;
        g.fillStyle = light ? (side < 0 ? '#8ba85e' : '#587f48') : (side < 0 ? '#365e3d' : '#254a34');
        g.beginPath();
        g.moveTo(p.x, p.y);
        g.quadraticCurveTo(p.x + side * ll * 0.45, p.y - ll * 0.33, ex, ey);
        for (let j = 6; j >= 0; j--) {
          const u = j / 7;
          g.lineTo(p.x + side * ll * u, p.y - ll * 0.42 * u + Math.sin(Math.PI * u) * ll * 0.25);
          g.lineTo(p.x + side * ll * (u - 0.035), p.y - ll * 0.42 * u + Math.sin(Math.PI * u) * ll * 0.14);
        }
        g.closePath();
        g.fill();
        g.strokeStyle = light ? 'rgba(203,218,144,0.5)' : 'rgba(125,158,93,0.45)';
        g.lineWidth = Math.max(0.35, len * 0.003);
        g.beginPath();
        g.moveTo(p.x, p.y);
        g.lineTo(ex, ey);
        g.stroke();
      }
    }
    g.restore();
  }

  function woodlandFlower(g, x, y, size, tone) {
    g.strokeStyle = '#6b8c52';
    g.lineWidth = Math.max(0.45, size * 0.14);
    g.beginPath();
    g.moveTo(x - size * 0.35, y + size * 2.5);
    g.quadraticCurveTo(x + size * 0.5, y + size, x, y);
    g.stroke();
    for (let j = 0; j < 5; j++) {
      const a = j * Math.PI * 0.4;
      g.fillStyle = tone || '#f1edce';
      g.beginPath();
      g.ellipse(x + Math.cos(a) * size * 0.64, y + Math.sin(a) * size * 0.64, size * 0.7, size * 0.34, a, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#d9b667';
    g.beginPath();
    g.arc(x, y, size * 0.26, 0, Math.PI * 2);
    g.fill();
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
      const bs = sc.tree.branches;
      const br = bs[Math.max(0, bs.length - 1 - this.i)];
      const p = sc.branchPoint(br, this.i ? 0.95 : 0.2);
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

  // 큰 편백의 가지마다 엎드릴 수 있는 자리 수 (아래 가지부터). 자리 번호: 1 그루터기, 2.. 가지 자리
  const BRANCH_SPOTS = [2, 2, 2, 2, 1, 1];

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
      air.addColorStop(0, '#f6efcd');
      air.addColorStop(0.3, '#dce5bd');
      air.addColorStop(0.65, '#9dbba0');
      air.addColorStop(1, '#466b52');
      g.fillStyle = air;
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.5;
      g.drawImage(SPR.sun, -w * 0.45, -h * 0.55, w * 1.3, h * 1.1);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';

      const sprays = [makeSpray(110 * s, 187, dpr, false), makeSpray(145 * s, 291, dpr, true), makeSpray(84 * s, 514, dpr, false)];
      const spray = (x, y, a, scale, seed, alpha = 1) => {
        const sp = sprays[seed % sprays.length];
        g.save();
        g.globalAlpha = alpha;
        g.translate(x, y);
        g.rotate(a);
        g.scale(scale, scale);
        g.drawImage(sp.c, -sp.ax, -sp.ay, sp.W, sp.H);
        g.restore();
      };
      const layers = [
        { fog: 0.89, width: 4, gap: 32, base: 0.64 },
        { fog: 0.76, width: 8, gap: 56, base: 0.68 },
        { fog: 0.58, width: 15, gap: 100, base: 0.73 },
        { fog: 0.32, width: 28, gap: 210, base: 0.79 },
        { fog: 0.13, width: 72, gap: 1800, base: 1.03 },
      ];
      layers.forEach((L, li) => {
        const col = MC.mix(TRUNK, FOG, L.fog);
        const lit = MC.mix(col, [255, 236, 200], 0.25);
        const dark = MC.mix(col, [10, 12, 8], 0.35);
        const baseY = h * L.base;
        const count = Math.max(2, Math.round(w / (L.gap * s)));
        for (let i = 0; i < count; i++) {
          const x = li === 4 ? (i === 0 ? -0.012 : 1.025) * w : ((i + rnd() * 0.9) / count) * w;
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
          g.lineTo(x + tw * 0.5, by - tw * 1.4);
          g.quadraticCurveTo(x + tw * 0.55, by - tw * 0.35, x + tw * 1.1, by);
          g.quadraticCurveTo(x, by - tw * 0.12, x - tw * 1.1, by);
          g.quadraticCurveTo(x - tw * 0.55, by - tw * 0.35, x - tw * 0.5, by - tw * 1.4);
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
            // 높은 곳의 잔가지와 그늘에 겹치는 부채꼴 잎.
            for (let j = 0; j < 3; j++) {
              const yy = h * (0.1 + j * 0.12) + rnd() * h * 0.07;
              const side = j % 2 ? -1 : 1;
              const reach = (28 + rnd() * 55) * s * (li * 0.4);
              g.strokeStyle = MC.rgba(col, 0.8);
              g.lineWidth = Math.max(0.8, tw * 0.12);
              g.beginPath();
              g.moveTo(x, yy);
              g.quadraticCurveTo(x + side * reach * 0.5, yy + 8 * s, x + side * reach, yy - 12 * s);
              g.stroke();
              spray(x + side * reach, yy - 12 * s, side > 0 ? 0.15 : Math.PI - 0.15, 0.45 + li * 0.1, i + j, 0.28 + li * 0.1);
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
          this.paintForestFloor(g);
        }
      });

      // 둥근 덩어리 대신 편백의 납작한 잎이 겹치는 우듬지. 중앙에는 햇살 틈을 둔다.
      const crown = g.createLinearGradient(0, 0, 0, h * 0.22);
      crown.addColorStop(0, 'rgba(21,51,37,0.82)');
      crown.addColorStop(0.55, 'rgba(38,75,44,0.24)');
      crown.addColorStop(1, 'rgba(30,54,34,0)');
      g.fillStyle = crown;
      g.fillRect(0, 0, w, h * 0.22);
      for (let d = 0; d < 3; d++) {
        const n = Math.ceil(w / (60 * s));
        for (let i = -1; i <= n; i++) {
          const x = i / n * w + rnd() * 36 * s;
          const opening = Math.exp(-Math.pow((x / w - 0.32) / 0.17, 2));
          const y = (10 + d * 14 - opening * 22 + rnd() * 16) * s;
          spray(x, y, (i % 2 ? 0.35 : Math.PI - 0.38) + rnd() * 0.35, 0.95 + d * 0.25, i + n + d, 0.6 + d * 0.16);
        }
      }
    }

    paintForestFloor(g) {
      const { w, h, s } = this;
      const rnd = MC.rng(6301);
      const horizon = h * 0.755;
      const floor = g.createLinearGradient(0, horizon, 0, h);
      floor.addColorStop(0, '#8fa77b');
      floor.addColorStop(0.3, '#678855');
      floor.addColorStop(1, '#304d37');
      g.fillStyle = floor;
      g.beginPath();
      g.moveTo(0, horizon + 8 * s);
      g.bezierCurveTo(w * 0.18, horizon - 15 * s, w * 0.3, horizon + 14 * s, w * 0.5, horizon);
      g.bezierCurveTo(w * 0.72, horizon - 8 * s, w * 0.86, horizon + 7 * s, w, horizon - 5 * s);
      g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();
      g.save();
      g.clip();

      // 멀리 비치는 빛으로 이어지는 흙길. 가장자리는 이끼에 스며든다.
      const startY = horizon + 5 * s;
      const trailDepth = h - startY + 12 * s;
      const trail = (z) => ({ x: w * (0.43 + Math.sin(z * 5.2 - 0.8) * 0.09), y: startY + z * trailDepth, r: w * (0.003 + z * z * 0.115) });
      const path = (pad) => {
        g.beginPath();
        for (let i = 0; i <= 40; i++) {
          const p = trail(i / 40);
          const x = p.x - p.r * pad;
          if (i) g.lineTo(x, p.y); else g.moveTo(x, p.y);
        }
        for (let i = 40; i >= 0; i--) { const p = trail(i / 40); g.lineTo(p.x + p.r * pad, p.y); }
        g.closePath();
      };
      path(1.22); g.fillStyle = 'rgba(177,178,113,0.23)'; g.fill();
      path(1);
      const earth = g.createLinearGradient(0, horizon, 0, h);
      earth.addColorStop(0, '#afb58d'); earth.addColorStop(0.4, '#aba17a'); earth.addColorStop(1, '#7a7550');
      g.fillStyle = earth; g.fill();
      g.save(); g.clip();
      for (let i = 0; i < 180; i++) {
        const z = rnd(); const p = trail(z);
        const x = p.x + (rnd() - 0.5) * p.r * 2;
        g.strokeStyle = rnd() < 0.5 ? 'rgba(230,216,167,0.23)' : 'rgba(81,77,47,0.2)';
        g.lineWidth = (0.4 + z) * s;
        g.beginPath(); g.moveTo(x, p.y); g.lineTo(x + (2 + rnd() * 7) * z * s, p.y - z * s); g.stroke();
      }
      g.restore();

      // 지면의 굴곡과 떨어진 비늘잎, 작은 돌, 폭신한 이끼.
      const count = Math.ceil(w / s * 1.1);
      for (let i = 0; i < count; i++) {
        const z = Math.pow(rnd(), 0.65);
        const x = rnd() * w, y = horizon + z * (h - horizon);
        const p = trail(MC.clamp((y - startY) / trailDepth, 0, 1));
        if (Math.abs(x - p.x) < p.r * (0.9 + rnd() * 0.35)) continue;
        const k = (0.25 + z * 0.9) * s;
        g.fillStyle = ['#8fa266', '#6e925b', '#527b4d', '#31563a', '#acb77c'][i % 5];
        g.beginPath(); g.ellipse(x, y, (2 + rnd() * 8) * k, (0.6 + rnd() * 2.3) * k, rnd() * 0.2, 0, Math.PI * 2); g.fill();
        if (i % 4 === 0) {
          g.strokeStyle = i % 8 ? '#86975a' : '#b2ba7b'; g.lineWidth = 0.65 * k;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2 * k, y - 4 * k); g.moveTo(x, y); g.lineTo(x - 2 * k, y - 3 * k); g.stroke();
        }
      }
      // 이끼 낀 돌의 작은 밝은 점과 발치의 들꽃, 작은 버섯.
      for (let i = 0; i < 16; i++) {
        const z = 0.15 + rnd() * 0.85;
        const p = trail(z);
        const side = i % 2 ? -1 : 1;
        const k = (0.35 + z * 0.8) * s;
        const x = p.x + side * (p.r * 1.3 + (12 + rnd() * 30) * k), y = p.y;
        if (i % 3 === 0) {
          g.fillStyle = '#486047'; g.beginPath(); g.ellipse(x, y + 2 * k, 14 * k, 4 * k, 0, 0, Math.PI * 2); g.fill();
          const rock = g.createLinearGradient(0, y - 9 * k, 0, y + 3 * k);
          rock.addColorStop(0, '#a5ad87'); rock.addColorStop(1, '#5a6c57');
          g.fillStyle = rock; g.beginPath(); g.moveTo(x - 12 * k, y); g.quadraticCurveTo(x - 11 * k, y - 11 * k, x - 2 * k, y - 10 * k); g.quadraticCurveTo(x + 10 * k, y - 13 * k, x + 13 * k, y); g.closePath(); g.fill();
          for (let m = 0; m < 22; m++) {
            g.fillStyle = m % 2 ? '#819d59' : '#b3bd77';
            g.fillRect(x + (rnd() - 0.5) * 20 * k, y - rnd() * 6 * k, (1 + rnd() * 2) * k, k);
          }
        } else {
          for (let j = 0; j < 4; j++) woodlandFlower(g, x + (rnd() - 0.5) * 24 * k, y - (5 + rnd() * 9) * k, (1.5 + rnd()) * k, i % 4 ? '#f1edcf' : '#cbcbe1');
        }
        if (i % 2 === 0) fernFrond(g, x + side * 15 * k, y + 4 * k, (20 + rnd() * 26) * k, -Math.PI / 2 + side * 0.5, side * 0.8, true);
      }
      for (let i = 0; i < 32; i++) {
        const x = rnd() * w, y = horizon + (0.2 + rnd() * 0.8) * (h - horizon), k = s * (0.4 + (y - horizon) / (h - horizon));
        if (i % 3 === 0) {
          g.strokeStyle = '#b5a07b'; g.lineWidth = 1.3 * k;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2 * k, y - 7 * k); g.stroke();
          g.fillStyle = i % 2 ? '#ba8050' : '#c6a678';
          g.beginPath(); g.ellipse(x + 2 * k, y - 7 * k, 4.5 * k, 2.2 * k, -0.2, Math.PI, Math.PI * 2); g.fill();
        } else fernFrond(g, x, y, (18 + rnd() * 35) * k, -Math.PI / 2 + (rnd() - 0.5) * 1.3, (rnd() - 0.5) * 1.4, i % 2 === 0);
      }
      // 긴 그림자를 얇게 겹쳐 길과 이끼가 같은 땅 위에 놓이게 한다.
      for (let i = 0; i < 6; i++) {
        const width = (16 + rnd() * 24) * s;
        g.save();
        g.translate((i + rnd() * 0.8) / 6 * w, horizon);
        g.rotate(-0.65);
        const shade = g.createLinearGradient(-width, 0, width, 0);
        shade.addColorStop(0, 'rgba(27,51,37,0)');
        shade.addColorStop(0.5, 'rgba(27,51,37,0.15)');
        shade.addColorStop(1, 'rgba(27,51,37,0)');
        g.fillStyle = shade;
        g.fillRect(-width, 0, width * 2, h * 0.6);
        g.restore();
      }
      g.restore();
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
        this.beams.push({ x0, bx0: x0, y0: -20, dx, dy, w0, w1: w0 * 2.6, len, base: 0.12 + rnd() * 0.14, seed: rnd() * 40 });
      }
      // 가장자리가 사라지는 빛. 선명한 삼각형 띠가 숲을 가르지 않도록 한다.
      const c = (this.beamImg = MC.canvas(128, 256));
      const g = c.getContext('2d');
      const pixels = g.createImageData(128, 256);
      for (let y = 0; y < 256; y++) {
        const z = y / 255;
        for (let x = 0; x < 128; x++) {
          const i = (y * 128 + x) * 4;
          const across = (x - 63.5) / (12 + z * 30);
          pixels.data[i] = 255; pixels.data[i + 1] = 242; pixels.data[i + 2] = 201;
          pixels.data[i + 3] = Math.round(255 * Math.exp(-across * across * 2.4) * Math.pow(1 - z, 1.2));
        }
      }
      g.putImageData(pixels, 0, 0);
    }

    buildFerns() {
      const { w, s } = this;
      const rnd = MC.rng(11);
      this.ferns = [];
      const n = Math.max(5, Math.round(w / (150 * s)));
      for (let i = 0; i < n; i++) {
        const left = i % 2 === 0;
        const edge = Math.abs((i + 0.5) / n - 0.5) > 0.33;
        const f = {
          x: ((i + 0.5) / n) * w + (rnd() - 0.5) * 60 * s,
          // 큰 고사리는 가장자리에서 화면을 감싸고, 멍이 앞쪽 잎은 낮게.
          len: (110 + rnd() * 100) * s * (edge ? 1 : 0.43),
          a0: -Math.PI / 2 + (left ? -1 : 1) * (0.35 + rnd() * 0.45),
          bend: (left ? -1 : 1) * (0.5 + rnd() * 0.5),
          seed: rnd() * 30,
          tone: 0.85 + rnd() * 0.15,
        };
        const W = Math.ceil(f.len * 2.2), H = Math.ceil(f.len * 1.2);
        const c = MC.canvas(W * this.dpr, H * this.dpr);
        const g = c.getContext('2d');
        g.scale(this.dpr, this.dpr);
        fernFrond(g, W / 2, H - 4 * s, f.len, f.a0, f.bend, i % 3 === 0);
        fernFrond(g, W / 2, H - 4 * s, f.len * 0.68, f.a0 + (left ? 0.6 : -0.6), -f.bend * 0.6, false);
        f.sprite = { c, W, H, ax: W / 2, ay: H - 4 * s };
        this.ferns.push(f);
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
      g.strokeStyle = 'rgba(114,76,41,0.55)';
      g.lineWidth = 0.65 * s;
      for (const a of [0.3, 2.4, 4.7]) {
        g.beginPath();
        g.moveTo(Math.cos(a) * hw, Math.sin(a) * ry);
        g.lineTo(Math.cos(a + 0.12) * hw * 0.68, Math.sin(a + 0.12) * ry * 0.68);
        g.lineTo(Math.cos(a) * hw * 0.55, Math.sin(a) * ry * 0.55);
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
        for (let j = 0; j < 4; j++) {
          const mx = x + (rnd() - 0.5) * 9 * s, my = y + (rnd() - 0.5) * 3 * s;
          g.strokeStyle = j % 2 ? '#bdd287' : '#9abe68'; g.lineWidth = 0.7 * s;
          g.beginPath(); g.moveTo(mx, my); g.lineTo(mx + s, my - 2.5 * s); g.stroke();
        }
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

    // ── 큰 편백과 쉬어 갈 수 있는 여섯 가지 ──────────────────────
    buildTree() {
      const { w, h, dpr, s } = this;
      const P = w < h * 0.9;
      const b = this.band();
      const tx = w * (P ? 0.93 : 0.87);
      const tw = (P ? 62 : 86) * s;
      // 줄기는 위로 갈수록 가늘어진다
      const half = (y) => MC.ForestTree.halfWidth(tw, h, y);
      this.trunkHalf = half;
      // 가지 여섯: 바닥 가까이에서 꼭대기 가까이까지. 화면 크기가 달라도 가지 수와 자리 수는 같다
      // (함께 있는 사람들과 자리 번호가 같은 가지를 가리키도록). 가장 높은 가지도 엎드린 멍이 머리가 화면 안에 든다
      const NB = BRANCH_SPOTS.length;
      const lowY = b.top - (P ? 86 : 94) * s;
      const topY = Math.max(h * 0.1, 92 * s);
      const step = (lowY - topY) / (NB - 1);
      const ends = P ? [0.36, 0.44, 0.38, 0.46, 0.42, 0.52] : [0.49, 0.58, 0.51, 0.6, 0.55, 0.66];
      const rises = [31, 18, 34, 22, 29, 20];
      const jit = [0, 0.16, -0.1, 0.14, -0.08, 0];
      const branches = [];
      for (let i = 0; i < NB; i++) {
        const y0 = lowY - step * (i + jit[i]);
        const th0 = Math.max(20, 38 - i * 3.2) * s;
        const th1 = Math.max(9, 17 - i * 1.3) * s;
        branches.push({ x0: tx - half(y0) * 0.8, y0, x1: w * ends[i], y1: y0 - rises[i] * s, th0, th1 });
      }
      branches.forEach((br, i) => {
        br.cx = MC.lerp(br.x0, br.x1, 0.43 + (i % 3) * 0.05);
        // 굵은 줄기에서 비스듬히 솟아 나온 뒤, 끝으로 갈수록 완만해지는 가지.
        br.cy = Math.min(br.y0, br.y1) - (i % 2 ? 5 : 10) * s;
      });
      this.tree = { x: tx, w: tw, branches };
      // 자리: 1 그루터기, 2.. 아래 가지(줄기 쪽부터), 그다음 위 가지
      this.spots = [null, { kind: 'stump' }];
      // 가지 사이가 좁은 화면(낮고 넓은 창)에서는 엎드린 멍이를 조금 작게
      let gapMin = Infinity;
      for (let i = 1; i < branches.length; i++) gapMin = Math.min(gapMin, branches[i - 1].y0 - branches[i].y0);
      const kSpot = Math.min(s * 0.9, gapMin / 100);
      branches.forEach((br, bi) => {
        const k = kSpot;
        const n = BRANCH_SPOTS[bi];
        for (let j = 0; j < n; j++) {
          const t = n === 1 ? 0.55 : 0.3 + (0.48 * j) / (n - 1);
          const p = this.branchPoint(br, t);
          // 엎드린 멍이는 가지 기울기를 살짝만 따른다 (너무 기울면 미끄러질 것 같으니)
          this.spots.push({ kind: 'branch', b: bi, t, x: p.x, y: p.y, k, a: MC.clamp(this.branchSlope(br, t), -0.1, 0.1) });
        }
      });

      Object.assign(this, MC.ForestTree.render({ w, h, dpr, s, tree: this.tree, groundY: b.top }));
    }

    // 가지 윗면의 한 점 (t: 0 줄기 … 1 끝)
    branchPoint(br, t) {
      return MC.ForestTree.branchPoint(br, t);
    }

    // 가지가 기운 정도 (왼쪽→오른쪽 방향의 각도). 엎드린 멍이도 그만큼 기운다
    branchSlope(br, t) {
      return MC.ForestTree.branchSlope(br, t);
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
        const a = (0.09 + 0.09 * MC.fbm(this.t * d.sp + d.ph)) * (1 + this.gust * 0.2) * (1 - 0.85 * (this.sunVeil || 0));
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
      return this.stirLeaves(x);
    }

    stirLeaves(x) {
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
      return this.stirLeaves(this.w * MC.rand(0.2, 0.8));
    }

    beamAlpha(b) {
      return b.base * (0.55 + 0.45 * MC.fbm(this.t * 0.11 + b.seed)) * (1 - (this.sunVeil || 0));
    }

    // 해는 아주 천천히 옮겨 가고(빛줄기의 기울기와 자리), 가끔 구름이 해를 가렸다 지나간다.
    // 벽시계를 따르므로 같은 숲의 모두가 같은 햇살을 본다. 낮과 밤은 바뀌지 않는다
    moveSun() {
      const ang = ((62 + 4 * MC.slow(60, 0.7)) * Math.PI) / 180;
      const shift = 40 * this.s * MC.slow(45, 1.9);
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      for (const b of this.beams) {
        b.dx = dx;
        b.dy = dy;
        b.x0 = b.bx0 + shift;
      }
      // 7분에 한 번, 1분 남짓 구름이 지나간다
      const v = 0.5 + 0.5 * Math.sin((2 * Math.PI * MC.world()) / 420 + 0.5);
      const e = MC.clamp((v - 0.84) / 0.16, 0, 1);
      this.sunVeil = 0.6 * e * e * (3 - 2 * e);
    }

    update(dt) {
      const { w, h, s } = this;
      this.t += dt;
      this.moveSun();
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
      const sway = MC.fbm(this.t * 0.7 + f.seed) * 0.06 + this.gust * 0.14 * Math.sin(this.t * 2.2 + f.seed);
      const sp = f.sprite;
      g.save();
      g.translate(f.x, this.h + 8 * this.s);
      g.rotate(sway);
      g.globalAlpha = f.tone;
      g.drawImage(sp.c, -sp.ax, -sp.ay, sp.W, sp.H);
      g.restore();
    }

    draw(g) {
      if (!this.bg) return;
      const { w, h, s, t } = this;
      g.drawImage(this.bg, 0, 0, w, h);

      // 빛내림
      g.globalCompositeOperation = 'lighter';
      for (const b of this.beams) {
        g.save();
        g.translate(b.x0, b.y0);
        g.rotate(Math.atan2(b.dy, b.dx) - Math.PI / 2);
        g.globalAlpha = this.beamAlpha(b) * 1.6;
        g.drawImage(this.beamImg, -b.w1 / 2, 0, b.w1, b.len);
        g.restore();
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
        this.crowd.draw(g, this.dpr, (Z, up) => !up && Z >= zb, w);
      } else {
        g.drawImage(this.stumpImg, this.stump.x - sb.ox, this.stump.top - sb.oy, sb.W, sb.H);
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
      // 앞쪽 그루터기에서 쉬는 멍이의 얼굴은 낮게 늘어진 편백 잎에 가리지 않는다.
      if (this.crowd) this.crowd.draw(g, this.dpr, (Z, up) => up, w);
      else this.pup.draw(g, this.dpr);
      this.drawDapples(g, 'tree');
      this.squirrel.draw(g, this);
      for (const b of this.birds) b.draw(g, this);
      for (const f of this.flies) f.draw(g, this.s * 1.05);

      for (const f of this.ferns) this.drawFern(g, f);
    }
  }

  MC.ForestScene = ForestScene;
})(window.MC = window.MC || {});
