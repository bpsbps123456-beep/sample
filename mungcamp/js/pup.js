/* 멍캠프 — 멍이: 멍때리는 강아지
   모든 장면에 함께 앉아 있다. 10초에 한 번 천천히 숨쉬고, 눈을 깜빡이고, 가끔 이쪽을 돌아본다.
   누르면 하트를 날리고, 오래 두면 꾸벅꾸벅 졸다 잠든다. 불멍에서는 마시멜로를 굽는다. */
(function (MC) {
  'use strict';

  const INK = '#5b3d2c';
  const FUR_HI = '#fffbf4';
  const FUR = '#fff3e3';
  const FUR_LO = '#ecd4b6';
  const EAR_HI = '#e8ab70';
  const EAR_LO = '#bd7b43';
  const EYE = '#2a1a13';
  const NOSE = '#3a261d';

  const TOAST = [
    [0, [255, 251, 243]],
    [0.45, [250, 228, 182]],
    [0.72, [234, 174, 98]],
    [1, [176, 102, 48]],
  ];
  function toastColor(t, dark = 0) {
    for (let i = 1; i < TOAST.length; i++) {
      if (t <= TOAST[i][0]) {
        const a = TOAST[i - 1];
        const b = TOAST[i];
        const c = MC.mix(a[1], b[1], (t - a[0]) / (b[0] - a[0]));
        return MC.mix(c, [60, 30, 15], dark);
      }
    }
    return MC.mix(TOAST[TOAST.length - 1][1], [60, 30, 15], dark);
  }

  function ellipse(o, x, y, rx, ry, rot = 0) {
    o.beginPath();
    o.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2);
  }

  function heartPath(o) {
    o.beginPath();
    o.moveTo(0, 3.2);
    o.bezierCurveTo(-6.4, -1, -5.4, -7.4, 0, -4.6);
    o.bezierCurveTo(5.4, -7.4, 6.4, -1, 0, 3.2);
    o.closePath();
  }

  class Pup {
    constructor(opts = {}) {
      this.outfit = opts.outfit || 'none'; // beanie | scarf | sprout | none
      this.view = opts.view || 'front';
      this.restView = this.view;
      this.stick = !!opts.stick;
      this.baseTurn = opts.turn || 0;
      this.light = opts.light || null;
      this.onEvent = null;
      this.x = 0;
      this.y = 0;
      this.k = 1;
      this.t = Math.random() * 10;
      this.env = {};
      this.turn = this.baseTurn;
      this.tilt = 0;
      this.tiltTarget = 0;
      this.headDrop = 0;
      this.look = { x: this.baseTurn * 0.7, y: 0 };
      this.blink = 0;
      this.blinkT = -1;
      this.nextBlink = MC.rand(2, 4);
      this.mood = 'idle';
      this.moodT = 0;
      this.lastPoke = MC.clock();
      this.sleepAfter = MC.rand(80, 120);
      this.glanceT = 0;
      this.nextGlance = MC.rand(6, 12);
      this.lookUpT = 0;
      this.perk = 0;
      this.perkT = 0;
      this.droop = 0;
      this.windSway = 0;
      this.wag = 0.2;
      this.wagPhase = 0;
      this.hop = 0;
      this.hopV = 0;
      this.pomX = 0;
      this.pomV = 0;
      this.hearts = [];
      this.zs = [];
      this.zTimer = 0.5;
      this.puffs = [];
      this.puffT = 1;
      this.surprise = 0;
      this.spin = null;
      this.spinHold = 0;
      this.mallow = { toast: 0.18, phase: 'roast', t: 0, bites: 0, pop: 0 };
      this.stickTip = null;
      this.stickDrop = 0;
      this.tip = { x: 120, y: -95 };
      this.cv = null;
    }

    emit(kind) {
      if (this.onEvent) this.onEvent(kind);
    }

    setMood(m, dur) {
      this.mood = m;
      this.moodT = dur;
    }

    get sleeping() {
      return this.mood === 'asleep' || this.mood === 'sleepy';
    }

    // ── 반응 ─────────────────────────────────────────────
    wake() {
      this.lastPoke = MC.clock();
      this.sleepAfter = MC.rand(80, 120);
      if (this.sleeping) {
        this.setMood('startled', 0.8);
        this.surprise = 1;
        this.hopV = -60;
        this.emit('hop');
        return true;
      }
      return false;
    }

    poke() {
      if (this.wake()) return;
      if (this.mood !== 'eating') this.setMood('happy', 1.6);
      this.addHearts(2 + (Math.random() < 0.5 ? 1 : 0));
      this.hopV = -45;
      this.emit('boop');
      if (this.restView === 'back') this.turnAround(2.6);
    }

    cheer() {
      if (this.wake()) return;
      this.perkT = 1.6;
      this.hopV = -32;
    }

    watchUp(sec) {
      this.wake();
      this.lookUpT = sec;
      this.perkT = sec;
    }

    comfort() {
      if (this.sleeping || this.mood === 'eating') return;
      this.setMood('happy', 1.8);
      this.addHearts(2);
    }

    splash() {
      if (this.mood === 'startled') return;
      this.wake();
      this.setMood('startled', 0.7);
      this.surprise = 1;
      this.hopV = -75;
      this.perkT = 1.2;
      this.emit('hop');
    }

    turnAround(hold) {
      if (this.view === 'back' && !this.spin) this.spin = { t: 0, dur: 0.36, to: 'front', hold, switched: false };
      else if (this.view === 'front' && this.spinHold > 0) this.spinHold = Math.max(this.spinHold, hold);
    }

    addHearts(n) {
      for (let i = 0; i < n; i++) {
        this.hearts.push({ t: -i * 0.18, max: 1.9, x: MC.rand(-16, 16), y: -104, v: MC.rand(0, 10), ph: Math.random() * 6, s: MC.rand(1.1, 1.5) });
      }
    }

    hit(x, y) {
      const lx = (x - this.x) / this.k;
      const ly = (y - this.y) / this.k;
      const head = ((lx / 42) ** 2 + ((ly + 72) / 36) ** 2) <= 1;
      const body = lx > -32 && lx < 32 && ly > -54 && ly < 6;
      return head || body;
    }

    // ── 움직임 ───────────────────────────────────────────
    update(dt, env = {}) {
      this.t += dt;
      this.env = env;
      const now = MC.clock();

      if (this.moodT !== Infinity) this.moodT -= dt;
      const resting = this.mood === 'idle' || this.mood === 'cold';
      if (resting && !env.noSleep && now - this.lastPoke > this.sleepAfter) this.setMood('sleepy', 12);
      else if (this.mood === 'sleepy' && this.moodT <= 0) this.setMood('asleep', Infinity);
      else if (this.mood === 'startled' && this.moodT <= 0) this.setMood('happy', 1.3);
      else if (this.mood === 'happy' && this.moodT <= 0) this.setMood('idle', 0);
      if (this.mood === 'idle' && env.cold) this.setMood('cold', 0);
      else if (this.mood === 'cold' && !env.cold) this.setMood('idle', 0);
      const sleeping = this.sleeping;

      // 깜빡임 (가끔 두 번 연달아)
      if (!sleeping && this.mood !== 'happy' && this.mood !== 'eating') {
        this.nextBlink -= dt;
        if (this.nextBlink <= 0) {
          this.blinkT = 0;
          this.nextBlink = Math.random() < 0.18 ? 0.3 : MC.rand(2.4, 6);
        }
      }
      if (this.blinkT >= 0) {
        this.blinkT += dt;
        const u = this.blinkT / 0.17;
        this.blink = u < 0.5 ? u * 2 : Math.max(0, 2 - u * 2);
        if (u >= 1) {
          this.blinkT = -1;
          this.blink = 0;
        }
      }

      // 가끔 이쪽을 돌아본다
      if (this.mood === 'idle') {
        this.nextGlance -= dt;
        if (this.nextGlance <= 0) {
          this.glanceT = MC.rand(2.2, 3.6);
          this.nextGlance = MC.rand(10, 20);
          this.tiltTarget = MC.rand(-0.16, 0.16);
          if (this.restView === 'back') this.turnAround(this.glanceT);
        }
      }
      if (this.glanceT > 0) {
        this.glanceT -= dt;
        if (this.glanceT <= 0) this.tiltTarget = 0;
      }

      const facing = this.glanceT > 0 || this.mood === 'cold' || this.mood === 'startled' || this.spinHold > 0;
      this.turn += ((facing ? 0 : this.baseTurn) - this.turn) * Math.min(1, dt * 3);
      let lx = facing ? 0 : this.baseTurn * 0.7;
      let ly = this.stick && !facing ? -0.2 : 0;
      if (this.lookUpT > 0) {
        this.lookUpT -= dt;
        ly = -1;
        lx *= 0.4;
      } else if (env.look && !facing) {
        lx = env.look.x;
        ly = env.look.y;
      }
      this.look.x += (lx - this.look.x) * Math.min(1, dt * 5);
      this.look.y += (ly - this.look.y) * Math.min(1, dt * 5);

      // 꾸벅꾸벅, 오물오물
      let tiltT = this.tiltTarget;
      let dropT = 0;
      if (this.mood === 'sleepy') {
        const nod = Math.max(0, Math.sin(this.t * 0.95));
        tiltT = 0.05 + 0.05 * nod;
        dropT = 1 + 3.5 * nod * nod;
      } else if (this.mood === 'asleep') {
        tiltT = 0.15;
        dropT = 4;
      } else if (this.mallow.phase === 'munch') {
        dropT = Math.abs(Math.sin(this.t * 11)) * 1.4;
      }
      this.tilt += (tiltT - this.tilt) * Math.min(1, dt * 2.5);
      this.headDrop += (dropT - this.headDrop) * Math.min(1, dt * 5);

      // 귀와 꼬리
      this.perkT = Math.max(0, this.perkT - dt);
      const perkT = this.mood === 'startled' || this.mood === 'happy' || this.perkT > 0 ? 1 : 0;
      this.perk += (perkT - this.perk) * Math.min(1, dt * 6);
      this.droop += ((sleeping || this.mood === 'cold' ? 1 : 0) - this.droop) * Math.min(1, dt * 2);
      const wind = env.wind || 0;
      this.windSway = wind * (0.08 + 0.1 * Math.sin(this.t * 2.3));
      let wagT = 0.22;
      if (this.mood === 'happy' || this.mood === 'startled') wagT = 1;
      else if (this.mood === 'eating') wagT = 0.7;
      else if (sleeping) wagT = 0;
      else if (this.mood === 'cold') wagT = 0.04;
      else if (this.perkT > 0 || this.lookUpT > 0) wagT = 0.8;
      this.wag += (wagT - this.wag) * Math.min(1, dt * 3);
      this.wagPhase += dt * (2.4 + 11 * this.wag);

      // 폴짝
      this.hopV += (-this.hop * 170 - this.hopV * 11) * dt;
      this.hop += this.hopV * dt;
      // 비니 방울은 살짝 늦게 따라 흔들린다
      this.pomV += ((-this.tilt * 16 - this.hopV * 0.03 - this.pomX) * 110 - this.pomV * 7) * dt;
      this.pomX += this.pomV * dt;

      // 하트, zZ, 입김, 느낌표
      for (const h of this.hearts) {
        h.t += dt;
        if (h.t > 0) {
          h.y -= (16 + h.v) * dt;
          h.x += Math.sin(h.t * 3 + h.ph) * 6 * dt;
        }
      }
      this.hearts = this.hearts.filter((h) => h.t < h.max);
      if (this.mood === 'asleep') {
        this.zTimer -= dt;
        if (this.zTimer <= 0) {
          this.zTimer = 1.9;
          this.zs.push({ t: 0 });
        }
      }
      for (const z of this.zs) z.t += dt;
      this.zs = this.zs.filter((z) => z.t < 3);
      if (this.mood === 'cold') {
        this.puffT -= dt;
        if (this.puffT <= 0) {
          this.puffT = 2.8;
          this.puffs.push({ t: 0 });
        }
      }
      for (const p of this.puffs) p.t += dt;
      this.puffs = this.puffs.filter((p) => p.t < 1.8);
      this.surprise = Math.max(0, this.surprise - dt * 1.3);

      // 돌아보기 (뒷모습 ↔ 앞모습)
      if (this.spin) {
        this.spin.t += dt;
        if (this.spin.t >= this.spin.dur / 2 && !this.spin.switched) {
          this.view = this.spin.to;
          this.spin.switched = true;
        }
        if (this.spin.t >= this.spin.dur) {
          this.spinHold = this.spin.hold;
          this.spin = null;
        }
      } else if (this.spinHold > 0) {
        this.spinHold -= dt;
        if (this.spinHold <= 0 && this.view !== this.restView) this.spin = { t: 0, dur: 0.36, to: this.restView, hold: 0, switched: false };
      }

      // 마시멜로: 노릇해지면 휙 던져 냠냠
      if (this.stick) {
        const m = this.mallow;
        m.pop = Math.max(0, m.pop - dt * 3);
        if (m.phase === 'roast') {
          if (!sleeping) m.toast = Math.min(1, m.toast + (dt * (0.35 + 0.65 * Math.min(1, env.E == null ? 1 : env.E))) / 110);
          if (m.toast >= 0.8 && this.mood === 'idle') {
            m.phase = 'toss';
            m.t = 0;
            this.setMood('eating', Infinity);
          }
        } else if (m.phase === 'toss') {
          m.t += dt;
          if (m.t >= 0.7) {
            m.phase = 'munch';
            m.t = 0;
            m.bites = 0;
          }
        } else if (m.phase === 'munch') {
          m.t += dt;
          const b = Math.min(3, Math.floor(m.t / 0.42) + 1);
          if (b > m.bites) {
            m.bites = b;
            this.emit('nom');
          }
          if (m.t >= 1.5) {
            m.phase = 'gone';
            m.t = 0;
            this.setMood('happy', 1.8);
            this.addHearts(3);
          }
        } else if (m.phase === 'gone') {
          m.t += dt;
          if (m.t >= 7 && !sleeping) {
            m.phase = 'roast';
            m.toast = 0;
            m.pop = 1;
            this.emit('pop');
          }
        }
        this.stickDrop += ((sleeping ? 1 : 0) - this.stickDrop) * Math.min(1, dt * 1.5);
      }
    }

    // ── 그리기 ───────────────────────────────────────────
    bounds() {
      return { x0: -78, y0: -140, x1: this.stick ? 240 : 78, y1: 14 };
    }

    draw(g, dpr) {
      const B = this.bounds();
      const k = this.k;
      const sc = k * Math.min(dpr || 1, 2);
      const cw = Math.max(1, Math.ceil((B.x1 - B.x0) * sc));
      const ch = Math.max(1, Math.ceil((B.y1 - B.y0) * sc));
      if (!this.cv || this.cv.width !== cw || this.cv.height !== ch) {
        this.cv = MC.canvas(cw, ch);
        this.cg = this.cv.getContext('2d');
      }
      const o = this.cg;
      o.setTransform(1, 0, 0, 1, 0, 0);
      o.globalCompositeOperation = 'source-over';
      o.globalAlpha = 1;
      o.clearRect(0, 0, cw, ch);
      o.setTransform(sc, 0, 0, sc, -B.x0 * sc, -B.y0 * sc);
      o.lineJoin = 'round';
      o.lineCap = 'round';
      this.paint(o);
      this.applyLight(o, B);
      g.drawImage(this.cv, this.x + B.x0 * k, this.y + B.y0 * k, (B.x1 - B.x0) * k, (B.y1 - B.y0) * k);
      this.drawExtras(g);
    }

    breath() {
      return Math.sin((2 * Math.PI * MC.clock()) / MC.WAVE_T) * (this.mood === 'asleep' ? 1.5 : 1);
    }

    paint(o) {
      const b = this.breath();
      o.fillStyle = 'rgba(0,0,0,0.3)';
      ellipse(o, 0, 1.5, 35 * (1 + this.hop * 0.005), 6.5);
      o.fill();
      const shake = this.mood === 'cold' ? Math.sin(this.t * 43) * 0.7 : 0;
      const spinX = this.spin ? Math.max(0.06, Math.abs(Math.cos((Math.PI * this.spin.t) / this.spin.dur))) : 1;
      o.save();
      o.translate(shake, this.hop);
      o.scale(spinX, 1);
      if (this.view === 'back') this.paintBack(o, b);
      else this.paintFront(o, b);
      o.restore();
    }

    paintFront(o, b) {
      this.paintTail(o, 21, -11, 1);
      o.save();
      o.scale(1 + 0.012 * b, 1 + 0.024 * b);
      this.paintBody(o, false);
      o.restore();
      if (this.outfit === 'scarf') this.paintScarf(o, false);
      if (this.stick) this.paintStick(o);
      this.paintPaws(o);
      this.paintHeadGroup(o, b);
    }

    paintBack(o, b) {
      o.save();
      o.scale(1 + 0.012 * b, 1 + 0.024 * b);
      this.paintBody(o, true);
      o.restore();
      this.paintTail(o, 0, -9, 0);
      if (this.outfit === 'scarf') this.paintScarf(o, true);
      this.paintHeadGroup(o, b);
    }

    bodyPath(o) {
      o.beginPath();
      o.moveTo(-27, 0);
      o.bezierCurveTo(-31.5, -17, -28.5, -38, -17, -50);
      o.bezierCurveTo(-8, -55, 8, -55, 17, -50);
      o.bezierCurveTo(28.5, -38, 31.5, -17, 27, 0);
      o.bezierCurveTo(14, 4, -14, 4, -27, 0);
      o.closePath();
    }

    paintBody(o, back) {
      this.bodyPath(o);
      const grd = o.createRadialGradient(-8, -34, 3, -2, -24, 42);
      grd.addColorStop(0, back ? FUR : FUR_HI);
      grd.addColorStop(0.55, FUR);
      grd.addColorStop(1, FUR_LO);
      o.fillStyle = grd;
      o.fill();
      o.lineWidth = 2.4;
      o.strokeStyle = INK;
      o.stroke();
      // 뒷다리 선
      o.strokeStyle = 'rgba(91,61,44,0.42)';
      o.lineWidth = 1.8;
      o.beginPath();
      o.moveTo(-24.5, -16);
      o.quadraticCurveTo(-16.5, -6, -20, 0);
      o.moveTo(24.5, -16);
      o.quadraticCurveTo(16.5, -6, 20, 0);
      o.stroke();
      if (!back) {
        // 가슴의 몽글한 털
        o.fillStyle = 'rgba(255,253,248,0.95)';
        for (const [x, y, r] of [[-5.5, -43, 5], [0, -40, 5.5], [5.5, -43, 5]]) {
          ellipse(o, x, y, r, r);
          o.fill();
        }
      }
    }

    paintPaws(o) {
      const holding = this.stick;
      const paws = holding ? [[-4, -29, 0.35], [8.5, -32, -0.25]] : [[-10, -3, 0], [10, -3, 0]];
      for (const [x, y, rot] of paws) {
        ellipse(o, x, y, 8, 5.8, rot);
        o.fillStyle = '#fffaf1';
        o.fill();
        o.lineWidth = 2.2;
        o.strokeStyle = INK;
        o.stroke();
        o.save();
        o.translate(x, y);
        o.rotate(rot);
        o.strokeStyle = 'rgba(91,61,44,0.5)';
        o.lineWidth = 1.2;
        o.beginPath();
        o.moveTo(-2.6, 1.6);
        o.lineTo(-2.6, 4.2);
        o.moveTo(2.6, 1.6);
        o.lineTo(2.6, 4.2);
        o.stroke();
        o.restore();
      }
    }

    paintTail(o, bx, by, dir) {
      const wag = Math.sin(this.wagPhase) * (0.12 + 0.5 * this.wag);
      o.save();
      o.translate(bx, by);
      o.rotate(-0.55 * dir + wag);
      o.beginPath();
      o.moveTo(0, 0);
      o.quadraticCurveTo(4 + 6 * dir, -8, 3 + 8 * dir, -19);
      o.quadraticCurveTo(2 + 6 * dir, -24, -1 + 3 * dir, -23);
      o.lineCap = 'round';
      o.strokeStyle = INK;
      o.lineWidth = 12;
      o.stroke();
      o.strokeStyle = FUR;
      o.lineWidth = 7.6;
      o.stroke();
      o.restore();
    }

    paintHeadGroup(o, b) {
      const lift = -b * 1.1 + this.headDrop;
      o.save();
      o.translate(0, -47 + lift);
      o.rotate(this.tilt);
      o.translate(0, 47);
      this.paintHead(o);
      o.restore();
    }

    headPath(o) {
      o.beginPath();
      o.moveTo(0, -100);
      o.bezierCurveTo(23.5, -100, 36.5, -87, 36.5, -69);
      o.bezierCurveTo(36.5, -50, 21.5, -42, 0, -42);
      o.bezierCurveTo(-21.5, -42, -36.5, -50, -36.5, -69);
      o.bezierCurveTo(-36.5, -87, -23.5, -100, 0, -100);
      o.closePath();
    }

    paintHead(o) {
      const back = this.view === 'back';
      const tx = back ? 0 : this.turn;
      this.headPath(o);
      const grd = o.createRadialGradient(-10 + tx * 8, -86, 3, tx * 4, -70, 46);
      grd.addColorStop(0, back ? FUR : FUR_HI);
      grd.addColorStop(0.55, FUR);
      grd.addColorStop(1, FUR_LO);
      o.fillStyle = grd;
      o.fill();
      o.lineWidth = 2.4;
      o.strokeStyle = INK;
      o.stroke();
      this.paintEar(o, -1, tx);
      this.paintEar(o, 1, tx);
      if (!back) this.paintFace(o, tx);
      if (this.outfit === 'beanie') this.paintBeanie(o, tx);
      else if (this.outfit === 'sprout') this.paintSprout(o, tx);
      else if (!back) this.paintTuft(o, tx);
    }

    paintEar(o, side, tx) {
      const sway = Math.sin(this.t * 1.7 + side) * 0.025 + this.windSway * (side < 0 ? 1 : 0.6);
      o.save();
      o.translate(side * 25 + tx * 4, -90);
      o.scale(side < 0 ? 1 : -1, 1);
      o.rotate(0.04 + this.perk * 0.5 - this.droop * 0.16 + sway * side * -1);
      o.beginPath();
      o.moveTo(2, -2);
      o.bezierCurveTo(-12, -3, -19.5, 16, -15.5, 31);
      o.bezierCurveTo(-12.5, 40.5, -1, 41, 2, 31);
      o.bezierCurveTo(5, 20, 7, 7, 2, -2);
      o.closePath();
      const grd = o.createLinearGradient(-16, 0, 4, 36);
      grd.addColorStop(0, EAR_HI);
      grd.addColorStop(1, EAR_LO);
      o.fillStyle = grd;
      o.fill();
      o.lineWidth = 2.4;
      o.strokeStyle = INK;
      o.stroke();
      o.restore();
    }

    paintFace(o, tx) {
      const ex = tx * 9;
      const m = this.mood;
      const happy = m === 'happy' || (m === 'eating' && this.mallow.phase === 'munch');
      // 볼터치
      o.fillStyle = happy ? 'rgba(255,118,136,0.55)' : 'rgba(255,126,140,0.4)';
      const puff = this.mallow.phase === 'munch' ? 1.25 : 1;
      ellipse(o, -20.5 + ex * 0.85, -59, 6 * puff, 3.6 * puff);
      o.fill();
      ellipse(o, 20.5 + ex * 0.85, -59, 6 * puff, 3.6 * puff);
      o.fill();
      if (happy) {
        // 볼에 빗금 ///
        o.strokeStyle = 'rgba(255,255,255,0.75)';
        o.lineWidth = 0.9;
        o.beginPath();
        for (const cx of [-20.5 + ex * 0.85, 20.5 + ex * 0.85]) {
          for (const d of [-2.4, 0, 2.4]) {
            o.moveTo(cx + d - 0.9, -57.6);
            o.lineTo(cx + d + 0.9, -60.4);
          }
        }
        o.stroke();
      }
      // 주둥이
      o.fillStyle = 'rgba(255,253,249,0.92)';
      ellipse(o, ex * 1.15, -57.5, 11, 7.6);
      o.fill();
      // 눈
      const lx = this.look.x * 1.5;
      const ly = this.look.y * 1.7;
      for (const side of [-1, 1]) {
        const far = (side < 0 && tx > 0.05) || (side > 0 && tx < -0.05);
        const sx = far ? 1 - Math.abs(tx) * 0.25 : 1;
        this.paintEye(o, side * 12.5 + ex, -69, sx, lx, ly, side);
      }
      // 코
      const nx = ex * 1.3;
      o.beginPath();
      o.moveTo(nx - 3.8, -62.6);
      o.quadraticCurveTo(nx, -64.8, nx + 3.8, -62.6);
      o.quadraticCurveTo(nx + 3.2, -60, nx + 0.9, -59.2);
      o.quadraticCurveTo(nx, -58.7, nx - 0.9, -59.2);
      o.quadraticCurveTo(nx - 3.2, -60, nx - 3.8, -62.6);
      o.closePath();
      o.fillStyle = NOSE;
      o.fill();
      o.fillStyle = 'rgba(255,255,255,0.75)';
      ellipse(o, nx - 1.1, -62.6, 1.1, 0.7);
      o.fill();
      // 입
      this.paintMouth(o, nx, happy);
      // 추울 때 처진 눈썹
      if (m === 'cold') {
        o.strokeStyle = 'rgba(42,26,19,0.7)';
        o.lineWidth = 1.5;
        o.beginPath();
        o.moveTo(-16.5 + ex, -76.5);
        o.lineTo(-9 + ex, -78.6);
        o.moveTo(16.5 + ex, -76.5);
        o.lineTo(9 + ex, -78.6);
        o.stroke();
      }
    }

    paintEye(o, cx, cy, sx, lx, ly, side) {
      const m = this.mood;
      o.strokeStyle = EYE;
      o.fillStyle = EYE;
      o.lineWidth = 2.2;
      if (m === 'asleep' || this.blink > 0.6) {
        // 편안히 감은 눈 ‿
        o.beginPath();
        o.moveTo(cx - 4.2 * sx, cy - 0.5);
        o.quadraticCurveTo(cx, cy + 3, cx + 4.2 * sx, cy - 0.5);
        o.stroke();
        return;
      }
      if (m === 'happy' || (m === 'eating' && this.mallow.phase === 'munch')) {
        // 웃는 눈 ^^
        o.beginPath();
        o.moveTo(cx - 4.2 * sx, cy + 1.6);
        o.quadraticCurveTo(cx, cy - 4.6, cx + 4.2 * sx, cy + 1.6);
        o.stroke();
        return;
      }
      if (m === 'sleepy') {
        // 졸린 눈: 반쯤 감김
        ellipse(o, cx + lx * 0.5, cy + 1.4, 3.8 * sx, 2.4);
        o.fill();
        o.beginPath();
        o.moveTo(cx - 4.8 * sx, cy - 0.4);
        o.quadraticCurveTo(cx, cy - 1.6, cx + 4.8 * sx, cy - 0.4);
        o.stroke();
        return;
      }
      const big = m === 'startled' ? 1.25 : 1;
      const ry = 4.9 * big * (1 - this.blink * 0.85);
      ellipse(o, cx + lx, cy + ly, 3.9 * sx * big, ry);
      o.fill();
      o.fillStyle = '#ffffff';
      ellipse(o, cx + lx + 1.3 * sx, cy + ly - 1.9 * (ry / 4.9), 1.55, 1.55 * Math.min(1, ry / 3));
      o.fill();
      ellipse(o, cx + lx - 1.2 * sx, cy + ly + 1.5 * (ry / 4.9), 0.75, 0.75);
      o.fill();
    }

    paintMouth(o, nx, happy) {
      const m = this.mallow;
      o.strokeStyle = NOSE;
      o.lineWidth = 1.5;
      if (this.mood === 'eating' && m.phase === 'toss') {
        // 아~ 하고 벌린 입
        const open = Math.min(1, m.t / 0.4);
        ellipse(o, nx, -55.4, 3.2, 1.2 + 2.6 * open);
        o.fillStyle = '#7d3530';
        o.fill();
        o.stroke();
        return;
      }
      if (this.mood === 'eating' && m.phase === 'munch') {
        // 오물오물
        const w = Math.sin(this.t * 22) * 0.8;
        o.beginPath();
        o.moveTo(nx - 3, -56.6 + w * 0.3);
        o.quadraticCurveTo(nx - 1.5, -55 + w, nx, -56.4);
        o.quadraticCurveTo(nx + 1.5, -55 - w, nx + 3, -56.6 - w * 0.3);
        o.stroke();
        return;
      }
      if (happy || this.mood === 'startled') {
        o.beginPath();
        o.moveTo(nx - 3.6, -57);
        o.quadraticCurveTo(nx, -51.2, nx + 3.6, -57);
        o.quadraticCurveTo(nx, -56, nx - 3.6, -57);
        o.closePath();
        o.fillStyle = '#7d3530';
        o.fill();
        o.stroke();
        o.fillStyle = '#ff8f95';
        ellipse(o, nx, -54.3, 2, 1.3);
        o.fill();
        return;
      }
      if (this.mood === 'cold') {
        o.beginPath();
        o.moveTo(nx - 3.2, -55.8);
        o.quadraticCurveTo(nx - 1.6, -57, nx, -55.8);
        o.quadraticCurveTo(nx + 1.6, -54.6, nx + 3.2, -55.8);
        o.stroke();
        return;
      }
      // 기본: ω
      o.beginPath();
      o.moveTo(nx, -59);
      o.lineTo(nx, -57.4);
      o.moveTo(nx, -57.4);
      o.quadraticCurveTo(nx - 1, -55.2, nx - 3.8, -56.6);
      o.moveTo(nx, -57.4);
      o.quadraticCurveTo(nx + 1, -55.2, nx + 3.8, -56.6);
      o.stroke();
    }

    paintTuft(o, tx) {
      const off = tx * 3;
      o.beginPath();
      o.moveTo(off - 3, -99.4);
      o.quadraticCurveTo(off - 4.5, -108.5, off + 3.5, -109.5);
      o.quadraticCurveTo(off - 0.5, -104.5, off + 2.5, -99.4);
      o.closePath();
      o.fillStyle = FUR;
      o.fill();
      o.lineWidth = 2;
      o.strokeStyle = INK;
      o.stroke();
    }

    paintBeanie(o, tx) {
      const off = tx * 3;
      // 돔
      o.beginPath();
      o.moveTo(-31 + off, -86);
      o.bezierCurveTo(-30 + off, -113, 30 + off, -113, 31 + off, -86);
      o.closePath();
      const grd = o.createLinearGradient(0, -112, 0, -86);
      grd.addColorStop(0, '#f27c5e');
      grd.addColorStop(1, '#d0533a');
      o.fillStyle = grd;
      o.fill();
      o.save();
      o.clip();
      o.strokeStyle = 'rgba(120,30,18,0.28)';
      o.lineWidth = 1.3;
      for (let x = -27; x <= 27; x += 6) {
        o.beginPath();
        o.moveTo(off + x * 0.55, -112);
        o.quadraticCurveTo(off + x * 0.9, -100, off + x, -86);
        o.stroke();
      }
      o.restore();
      o.lineWidth = 2.4;
      o.strokeStyle = INK;
      o.beginPath();
      o.moveTo(-31 + off, -86);
      o.bezierCurveTo(-30 + off, -113, 30 + off, -113, 31 + off, -86);
      o.stroke();
      // 접힌 단
      MC.roundRect(o, -33.5 + off, -92.5, 67, 11.5, 5.5);
      o.fillStyle = '#e4664b';
      o.fill();
      o.strokeStyle = INK;
      o.stroke();
      o.strokeStyle = 'rgba(110,28,16,0.3)';
      o.lineWidth = 1.2;
      o.beginPath();
      for (let x = -29; x <= 29; x += 4.6) {
        o.moveTo(off + x, -90);
        o.lineTo(off + x, -83.5);
      }
      o.stroke();
      // 방울
      const px = off + this.pomX;
      const py = -113.5;
      const pg = o.createRadialGradient(px - 2.5, py - 2.5, 1, px, py, 8);
      pg.addColorStop(0, '#fffdf8');
      pg.addColorStop(1, '#ecdcc6');
      ellipse(o, px, py, 7.6, 7.2);
      o.fillStyle = pg;
      o.fill();
      o.lineWidth = 2.2;
      o.strokeStyle = INK;
      o.stroke();
      o.strokeStyle = 'rgba(160,130,100,0.45)';
      o.lineWidth = 1;
      o.beginPath();
      o.arc(px + 1, py + 1, 3.4, 0.3, 1.6);
      o.moveTo(px - 4, py - 0.5);
      o.arc(px - 2.5, py - 0.5, 1.5, Math.PI, Math.PI * 1.8);
      o.stroke();
    }

    paintSprout(o, tx) {
      const off = tx * 3;
      const sway = Math.sin(this.t * 1.3) * 0.08 + this.windSway * 0.6;
      o.save();
      o.translate(off, -99.5);
      o.rotate(sway);
      o.strokeStyle = '#4f8a3e';
      o.lineWidth = 2.4;
      o.beginPath();
      o.moveTo(0, 0);
      o.quadraticCurveTo(1.2, -6, 0, -11);
      o.stroke();
      for (const [x, y, rot] of [[-5.5, -13, -0.55], [5.5, -14, 0.55]]) {
        ellipse(o, x, y, 6.4, 3.5, rot);
        o.fillStyle = '#8bd171';
        o.fill();
        o.lineWidth = 1.7;
        o.strokeStyle = '#3c7330';
        o.stroke();
        o.beginPath();
        o.moveTo(x - Math.cos(rot) * 4, y - Math.sin(rot) * 4);
        o.lineTo(x + Math.cos(rot) * 4, y + Math.sin(rot) * 4);
        o.lineWidth = 0.9;
        o.stroke();
      }
      o.restore();
    }

    paintScarf(o, back) {
      const wind = (this.env.wind || 0.4) + 0.2;
      // 목도리
      o.beginPath();
      o.moveTo(-22, -48);
      o.quadraticCurveTo(0, -40, 22, -48);
      o.lineTo(21, -40);
      o.quadraticCurveTo(0, -32, -21, -40);
      o.closePath();
      o.fillStyle = '#6f9fe2';
      o.fill();
      o.save();
      o.clip();
      o.fillStyle = 'rgba(240,246,255,0.9)';
      for (let x = -24; x < 24; x += 9) o.fillRect(x, -50, 3.2, 20);
      o.restore();
      o.lineWidth = 2.2;
      o.strokeStyle = INK;
      o.stroke();
      // 바람에 날리는 끝자락
      const ends = back ? [[-3, -1], [3, 1]] : [[13, 1]];
      for (const [ax, dir] of ends) {
        o.beginPath();
        const pts = [];
        for (let i = 0; i <= 5; i++) {
          const u = i / 5;
          const x = ax + dir * u * 26 * wind;
          const y = -40 + u * 10 + Math.sin(this.t * 6 + u * 4 + ax) * 3.5 * wind * u;
          pts.push([x, y]);
        }
        o.moveTo(pts[0][0], pts[0][1] - 3.5);
        for (const [x, y] of pts) o.lineTo(x, y - 3.5);
        for (let i = pts.length - 1; i >= 0; i--) o.lineTo(pts[i][0], pts[i][1] + 3.5);
        o.closePath();
        o.fillStyle = '#6f9fe2';
        o.fill();
        o.lineWidth = 2;
        o.strokeStyle = INK;
        o.stroke();
      }
    }

    stickLocalTip() {
      if (!this.stickTip) return { x: 120, y: -95 };
      return {
        x: (this.stickTip.x - this.x) / this.k,
        y: (this.stickTip.y - this.y) / this.k + this.stickDrop * 26,
      };
    }

    paintStick(o) {
      const G = { x: 2, y: -30 };
      const T = this.stickLocalTip();
      const dx = T.x - G.x;
      const dy = T.y - G.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const H = { x: G.x - ux * 12, y: G.y - uy * 12 };
      this.tip = T;
      o.lineCap = 'round';
      o.strokeStyle = INK;
      o.lineWidth = 4.6;
      o.beginPath();
      o.moveTo(H.x, H.y);
      o.lineTo(T.x, T.y);
      o.stroke();
      o.strokeStyle = '#ab7d50';
      o.lineWidth = 2.6;
      o.stroke();
      const m = this.mallow;
      if (m.phase === 'roast') this.paintMallow(o, T.x - ux * 5, T.y - uy * 5, Math.atan2(uy, ux), m.toast, 1 + m.pop * 0.35);
    }

    paintMallow(o, x, y, ang, toast, sc) {
      o.save();
      o.translate(x, y);
      o.rotate(ang);
      o.scale(sc, sc);
      const c = toastColor(toast);
      const d = toastColor(Math.min(1, toast + 0.25), 0.15);
      const grd = o.createLinearGradient(0, -6.5, 0, 6.5);
      grd.addColorStop(0, MC.rgba(MC.mix(c, [255, 255, 255], 0.35)));
      grd.addColorStop(0.5, MC.rgba(c));
      grd.addColorStop(1, MC.rgba(d));
      MC.roundRect(o, -7.5, -6.5, 15, 13, 4.8);
      o.fillStyle = grd;
      o.fill();
      o.lineWidth = 1.9;
      o.strokeStyle = INK;
      o.stroke();
      o.restore();
    }

    applyLight(o, B) {
      const L = this.light;
      if (!L) return;
      o.save();
      o.setTransform(1, 0, 0, 1, 0, 0);
      o.globalCompositeOperation = 'source-atop';
      const W = o.canvas.width;
      const H = o.canvas.height;
      if (L.ambient) {
        o.fillStyle = L.ambient;
        o.fillRect(0, 0, W, H);
      }
      if (L.glowA > 0.01) {
        const c = L.glow;
        // 광원 쪽 끝(L.from, 멍이 기준 단위)에서 반대쪽으로 옅어지는 빛
        const toPx = (u) => ((u - B.x0) / (B.x1 - B.x0)) * W;
        const x0 = toPx(L.from);
        const x1 = toPx(L.from - Math.sign(L.from || 1) * 120);
        const grd = o.createLinearGradient(x0, 0, x1, 0);
        grd.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${L.glowA})`);
        grd.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
        o.fillStyle = grd;
        o.fillRect(0, 0, W, H);
      }
      o.restore();
    }

    world(lx, ly) {
      return { x: this.x + lx * this.k, y: this.y + (ly + this.hop) * this.k };
    }

    drawExtras(g) {
      const k = this.k;
      const m = this.mallow;
      // 휙 던져 입으로 쏙
      if (this.stick && m.phase === 'toss') {
        const u = Math.min(1, m.t / 0.7);
        const e = u * u * (3 - 2 * u);
        const from = this.world(this.tip.x, this.tip.y);
        const to = this.world(this.turn * 11.7, -56 + this.headDrop);
        const cx = (from.x + to.x) / 2;
        const cy = Math.min(from.y, to.y) - 60 * k;
        const x = (1 - e) * (1 - e) * from.x + 2 * (1 - e) * e * cx + e * e * to.x;
        const y = (1 - e) * (1 - e) * from.y + 2 * (1 - e) * e * cy + e * e * to.y;
        g.save();
        g.translate(x, y);
        g.scale(k * (1 - 0.35 * e), k * (1 - 0.35 * e));
        this.paintMallow(g, 0, 0, u * 6, m.toast, 1);
        g.restore();
      }
      // 꼬치 끝 마시멜로가 불빛을 받아 은은히 빛난다
      if (this.stick && m.phase === 'roast' && this.light && this.light.glowA > 0.05) {
        const p = this.world(this.tip.x, this.tip.y);
        g.save();
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = Math.min(0.5, this.light.glowA * (0.4 + m.toast));
        const r = 16 * k;
        const grd = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        grd.addColorStop(0, 'rgba(255,190,110,0.9)');
        grd.addColorStop(1, 'rgba(255,190,110,0)');
        g.fillStyle = grd;
        g.fillRect(p.x - r, p.y - r, r * 2, r * 2);
        g.restore();
      }
      // 하트
      for (const h of this.hearts) {
        if (h.t < 0) continue;
        const a = h.t < 0.2 ? h.t / 0.2 : Math.max(0, 1 - (h.t - 1.1) / 0.8);
        const p = this.world(h.x, h.y);
        const s = k * h.s * (h.t < 0.2 ? 0.6 + 2 * h.t : 1);
        g.save();
        g.translate(p.x, p.y);
        g.scale(s, s);
        g.globalAlpha = Math.min(1, a);
        heartPath(g);
        g.fillStyle = '#ff8fa6';
        g.fill();
        g.lineWidth = 1.3;
        g.strokeStyle = '#c4566e';
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.85)';
        ellipse(g, -2.5, -3.6, 1.2, 0.9, -0.5);
        g.fill();
        g.restore();
      }
      // zZ
      for (const z of this.zs) {
        const u = z.t / 3;
        const p = this.world(15 + z.t * 9, -100 - z.t * 15 + this.headDrop);
        const s = (3 + 4 * u) * k;
        const a = u < 0.15 ? u / 0.15 : 1 - Math.max(0, (u - 0.6) / 0.4);
        g.save();
        g.translate(p.x, p.y);
        g.rotate(-0.15);
        g.globalAlpha = a;
        g.lineCap = 'round';
        g.lineJoin = 'round';
        g.beginPath();
        g.moveTo(-s, -s);
        g.lineTo(s, -s);
        g.lineTo(-s, s);
        g.lineTo(s, s);
        g.strokeStyle = 'rgba(40,28,22,0.45)';
        g.lineWidth = 2.6 * k + 1.5;
        g.stroke();
        g.strokeStyle = '#ffffff';
        g.lineWidth = 2.2 * k;
        g.stroke();
        g.restore();
      }
      // 입김
      for (const pf of this.puffs) {
        const u = pf.t / 1.8;
        const p = this.world(this.turn * 11.7 + 6 + u * 8, -56 - u * 10);
        g.save();
        g.globalAlpha = 0.35 * (1 - u);
        g.fillStyle = '#f4f6ff';
        for (const [dx, dy, r] of [[0, 0, 3], [3.4, -1.6, 2.4], [-2.6, -1.4, 2.2]]) {
          ellipse(g, p.x + dx * k, p.y + dy * k, r * k * (0.8 + u), r * k * (0.8 + u));
          g.fill();
        }
        g.restore();
      }
      // 느낌표
      if (this.surprise > 0.01) {
        const p = this.world(30, -112);
        const s = k * (1 + 0.4 * Math.sin(Math.min(1, (1 - this.surprise) * 4) * Math.PI));
        g.save();
        g.translate(p.x, p.y);
        g.scale(s, s);
        g.globalAlpha = Math.min(1, this.surprise * 2);
        MC.roundRect(g, -2.6, -11, 5.2, 12, 2.6);
        g.fillStyle = '#ffd36b';
        g.fill();
        g.lineWidth = 1.8;
        g.strokeStyle = INK;
        g.stroke();
        ellipse(g, 0, 5.4, 2.8, 2.8);
        g.fill();
        g.stroke();
        g.restore();
      }
    }
  }

  MC.Pup = Pup;
})(window.MC = window.MC || {});
