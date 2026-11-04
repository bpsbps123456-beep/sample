/* 멍캠프 — 멍이: 멍때리는 강아지
   모든 장면에 함께 앉아 있다. 10초에 한 번 천천히 숨쉬고, 눈을 깜빡이고, 가끔 이쪽을 돌아본다.
   누르면 하트를 날리고, 오래 두면 꾸벅꾸벅 졸다 잠든다. 불멍에서는 마시멜로를 굽는다. */
(function (MC) {
  'use strict';

  const INK = '#5b3d2c';
  // 털빛: 몸 빛깔(BODIES)과 귀 빛깔(EARS)을 따로 골라 입는다. 함께 나누는 값은 c = 몸 + 10 × 귀
  // (귀 0은 그 몸에 어울리는 기본 귀). 예전의 털빛 번호(0~5)는 그대로 같은 모습이 된다
  const BODIES = [
    { name: '크림', hi: '#fffbf4', fur: '#fff3e3', lo: '#ecd4b6', earHi: '#e8ab70', earLo: '#bd7b43' },
    { name: '눈송이', hi: '#ffffff', fur: '#fbf8f6', lo: '#e3dad7', earHi: '#f6e2d9', earLo: '#d6b3a6' },
    { name: '버터', hi: '#fff1d8', fur: '#ffe1b0', lo: '#e9bd81', earHi: '#ea9b50', earLo: '#b8692c' },
    { name: '라떼', hi: '#f6e6d6', fur: '#ebcdae', lo: '#d1a982', earHi: '#9c653c', earLo: '#734421' },
    { name: '구름', hi: '#f7f8fb', fur: '#e9ebf2', lo: '#c8ccd9', earHi: '#a9aebf', earLo: '#7f8598' },
    { name: '크림', hi: '#fffbf4', fur: '#fff3e3', lo: '#ecd4b6', earHi: '#62565c', earLo: '#3b3137', legacy: true },
    { name: '복숭아', hi: '#fff5ef', fur: '#ffe4d6', lo: '#efc0a8', earHi: '#f0a07c', earLo: '#c9714d' },
    { name: '벚꽃', hi: '#fff6f8', fur: '#ffe7ee', lo: '#efc4d0', earHi: '#ef9fb4', earLo: '#c97088' },
    { name: '코코아', hi: '#f2dfcf', fur: '#dfbfa2', lo: '#bb9474', earHi: '#8a5a3a', earLo: '#64391f' },
    { name: '민트', hi: '#f4fbf8', fur: '#e1f3ec', lo: '#b9dccd', earHi: '#8fc4ae', earLo: '#5f9a82' },
  ];
  const EARS = [
    null,
    { name: '캐러멜', earHi: '#e8ab70', earLo: '#bd7b43' },
    { name: '하양', earHi: '#f6e2d9', earLo: '#d6b3a6' },
    { name: '귤빛', earHi: '#ea9b50', earLo: '#b8692c' },
    { name: '초코', earHi: '#9c653c', earLo: '#734421' },
    { name: '은회색', earHi: '#a9aebf', earLo: '#7f8598' },
    { name: '먹빛', earHi: '#62565c', earLo: '#3b3137' },
    { name: '분홍', earHi: '#f2a7b8', earLo: '#cf7c90' },
    { name: '모래', earHi: '#e8cfa6', earLo: '#c4a173' },
    { name: '하늘', earHi: '#a9c8ea', earLo: '#7f9fc8' },
  ];
  function coatOf(c) {
    c = c | 0;
    const body = BODIES[c % 10] || BODIES[0];
    const ear = EARS[Math.floor(c / 10)] || null;
    return { hi: body.hi, fur: body.fur, lo: body.lo, earHi: ear ? ear.earHi : body.earHi, earLo: ear ? ear.earLo : body.earLo };
  }
  // 모자와 목도리 빛깔. 0번이 멍이(빨간 비니, 파란 목도리)
  const HATS = [
    { top: '#f27c5e', bot: '#d0533a', band: '#e4664b', line: 'rgba(120,30,18,0.28)', scarf: '#6f9fe2' },
    { top: '#86b8f2', bot: '#5089d8', band: '#689be2', line: 'rgba(20,50,110,0.28)', scarf: '#689be2' },
    { top: '#a2da91', bot: '#62b057', band: '#7cc46f', line: 'rgba(30,80,30,0.28)', scarf: '#7cc46f' },
    { top: '#ffdb7c', bot: '#eeb33c', band: '#f6c556', line: 'rgba(120,80,10,0.3)', scarf: '#f2bd4d' },
    { top: '#c7a7f0', bot: '#9775d8', band: '#ab89e3', line: 'rgba(60,30,110,0.28)', scarf: '#ab89e3' },
    { top: '#ffb6ca', bot: '#f082a1', band: '#f799b4', line: 'rgba(130,30,60,0.28)', scarf: '#f58fae' },
  ];
  const EYE = '#2a1a13';
  let MALLOW_GLOW = null;
  const NOSE = '#3a261d';

  const TOAST = [
    [0, [255, 251, 243]],
    [0.45, [250, 228, 182]],
    [0.72, [234, 174, 98]],
    [1, [176, 102, 48]],
  ];
  // 접이식 캠핑 의자: 나무 테에 머스터드빛 캔버스 천
  const CHAIR = { seat: 26, frame: '#9a6a44', frameDark: '#6e4a2f', fabric: '#e0a24e', fabricDark: '#c4863a', stripe: 'rgba(255,248,230,0.55)', mug: '#f0ebe1' };
  // 책 표지 빛깔 (털빛마다 다르게)
  const BOOK = ['#b85a4a', '#3f6f8f', '#5f8a4f', '#8a5a9a', '#c48a3a'];

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
      this.outfit = opts.outfit || 'none'; // beanie | scarf | sprout | nightcap | none
      this.setLook(opts.coat, opts.hat);
      this.flip = 1; // -1이면 좌우를 뒤집어 그린다 (왼쪽을 보고 앉기)
      this.paintEvery = opts.paintEvery || 0; // 다른 사람 멍이는 조금 드문드문 다시 그린다
      this.paintedAt = -9;
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
      this.logThrow = null;
      this.pomX = 0;
      this.pomV = 0;
      this.hearts = [];
      this.emotion = null;
      this.emoteBursts = 0;
      this.emoteKind = 0;
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
      this.walk = 0;
      this.lie = 0; // 0 앉음 … 1 엎드려 누움
      this.lieTo = 0;
      this.rollPose = null; // 숙소에서 옆구리 → 배 → 옆구리로 구르는 진행도와 방향
      this.rest = null; // 어디에 엎드렸는지: null(바닥·침대), 'tube'(바다의 튜브), 'branch'(편백 가지)
      this.paddle = 0; // 튜브 위에서 앞발로 물을 젓는 정도 (0..1)
      // 접이식 의자: 펴고 올라앉아 책을 읽는다 (0 접힘 … 1 앉아 읽는 중)
      this.chair = 0;
      this.chairTo = 0;
      this.pageT = -1;
      this.nextPage = MC.rand(6, 11);
      // 귤: 껍질을 까고(peel) 한 쪽씩 먹는다(eat)
      this.snack = null;
      this.walkPhase = 0;
      this.cv = null;
    }

    emit(kind) {
      if (this.onEvent) this.onEvent(kind);
    }

    setLook(coat, hat, hatStyle = 0, accessory = 0, gloves = 0) {
      this.coatId = coat >= 0 && coat < 100 ? coat | 0 : 0;
      this.hatId = HATS[hat] ? hat | 0 : 0;
      this.coat = coatOf(this.coatId);
      this.hat = HATS[this.hatId];
      this.hatStyle = MC.Wardrobe.clean('ht', hatStyle);
      this.accessory = MC.Wardrobe.clean('ac', accessory);
      this.gloves = MC.Wardrobe.clean('gl', gloves);
      this.paintedAt = -9;
    }

    // 침대에 엎드려 눕기 / 일어나 앉기
    setLie(on) {
      this.lieTo = on ? 1 : 0;
    }

    // 귤 하나를 까먹는다. 이미 먹는 중이거나 마시멜로를 먹는 중이면 다음에
    eatMandarin() {
      if (this.snack || this.mood === 'eating') return false;
      this.wake();
      this.snack = { t: 0, phase: 'peel', bites: 0 };
      this.setMood('eating', Infinity);
      this.emit('peel');
      return true;
    }

    get eating() {
      return !!this.snack;
    }

    // 의자를 펴고 앉아 책 읽기 / 일어나 접기
    setChair(on) {
      this.chairTo = on ? 1 : 0;
    }

    get chairOn() {
      return this.chairTo > 0;
    }

    // 의자에 앉으면 이만큼 높아진다
    get seatLift() {
      return CHAIR.seat * MC.smooth(0.45, 0.85, this.chair);
    }

    // 누우면 머리가 이만큼 내려간다 (하트·zZ도 같이). 의자에 앉으면 그만큼 올라간다
    get lieDrop() {
      if (!this.rest) return 43 * MC.smooth(0, 1, this.lie) - this.seatLift;
      return (this.lie >= 0.5 ? 40 : 0) - this.seatLift;
    }

    // 모닥불 곁에 앉으면 꼬치를 꺼내고, 일어서면 넣는다
    setStick(on) {
      on = !!on;
      if (on === this.stick) return;
      this.stick = on;
      const m = this.mallow;
      if (on) {
        if (m.phase !== 'roast') {
          m.phase = 'roast';
          m.toast = 0.1;
          m.t = 0;
        }
        m.pop = 1;
      } else {
        if (m.phase !== 'roast') {
          m.phase = 'roast';
          m.toast = 0.1;
        }
        if (this.mood === 'eating') this.setMood('idle', 0);
      }
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

    // 앞발은 가슴 앞에서 짧게 움직이고, 몸을 살짝 기울여 장작을 툭 보낸다.
    logThrowPose() {
      if (!this.logThrow) return null;
      const { time, side } = this.logThrow;
      const lift = MC.smooth(0, 0.28, time), push = MC.smooth(0.28, 0.4, time);
      const recover = MC.smooth(0.48, 0.8, time), dir = side * this.flip;
      return {
        x: MC.lerp((-3 + 18 * push) * dir, 0, recover),
        y: MC.lerp(-24 - 8 * lift - 5 * push, -4, recover),
        lean: dir * (-0.035 * lift + 0.08 * push) * (1 - recover),
      };
    }

    logGrip() {
      const pose = this.logThrowPose();
      if (!pose) return null;
      const angle = this.chair > 0.01 ? 0 : pose.lean;
      const y = pose.y - this.seatLift;
      const x = pose.x * Math.cos(angle) - y * Math.sin(angle);
      const yy = pose.x * Math.sin(angle) + y * Math.cos(angle);
      const bob = -Math.abs(Math.sin(this.walkPhase)) * 3 * this.walk;
      return { x: this.x + x * this.k * this.flip, y: this.y + (yy + this.hop + bob) * this.k, a: angle * this.flip };
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

    express(kind) {
      kind = MC.Emotes.valid(kind);
      if (!kind) return;
      this.emoteKind = kind;
      this.emoteBursts++;
      this.emotion = { kind, t: 0 };
      this.wake();
      if (this.mood !== 'eating') this.setMood(MC.Emotes.list[kind - 1].mood, 2.4);
      if (kind === 1) this.addHearts(3);
    }

    addHearts(n) {
      this.heartBursts = (this.heartBursts || 0) + 1; // 함께 있는 사람들에게도 하트가 보이게
      for (let i = 0; i < n; i++) {
        this.hearts.push({ t: -i * 0.18, max: 1.9, x: MC.rand(-16, 16), y: -104, v: MC.rand(0, 10), ph: Math.random() * 6, s: MC.rand(1.1, 1.5) });
      }
    }

    hit(x, y) {
      const lx = ((x - this.x) / this.k) * this.flip;
      const ly = (y - this.y) / this.k + this.seatLift;
      if (this.lie >= 0.5) {
        if (!this.rest) {
          const head = (((lx + 9) / 38) ** 2 + ((ly + 28) / 29) ** 2) <= 1;
          return head || (lx > -43 && lx < 66 && ly > -49 && ly < 7);
        }
        const head = ((lx / 42) ** 2 + ((ly + 31) / 34) ** 2) <= 1;
        return head || (lx > -48 && lx < 48 && ly > -50 && ly < 6);
      }
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

      // 바닥에서는 앞다리를 접으며 천천히 내려앉는다.
      if (this.lie !== this.lieTo) {
        const was = this.lie;
        this.lie = MC.clamp(this.lie + (this.lieTo > this.lie ? 1 : -1) * (dt / 0.3), 0, 1);
        if (this.rest && was < 0.5 && this.lie >= 0.5) {
          this.hopV = -26;
          this.emit('hop');
        }
      }

      // 의자: 펼 때는 천천히 펴고 폴짝 올라앉고, 접을 때는 얼른
      if (this.chair !== this.chairTo) {
        const was = this.chair;
        const up = this.chairTo > this.chair;
        this.chair = MC.clamp(this.chair + (up ? 1 : -1) * dt * (up ? 1 / 0.9 : 1 / 0.4), 0, 1);
        if (up && was < 0.06 && this.chair >= 0.06) this.emit('chair');
        if (up && was < 0.5 && this.chair >= 0.5) {
          this.hopV = -34;
          this.emit('hop');
        }
      }
      // 책장을 가끔 넘긴다 (조는 동안은 쉰다)
      if (this.chair >= 1 && !sleeping) {
        this.nextPage -= dt;
        if (this.nextPage <= 0) {
          this.pageT = 0;
          this.nextPage = MC.rand(8, 15);
          this.emit('page');
        }
      }
      if (this.pageT >= 0) {
        this.pageT += dt / 0.75;
        if (this.pageT >= 1) this.pageT = -1;
      }

      // 걷기
      const walking = !!env.walking;
      this.walk += ((walking ? 1 : 0) - this.walk) * Math.min(1, dt * 8);
      this.walkPhase += dt * 11 * this.walk;
      if (walking) {
        this.glanceT = 0;
        this.lastPoke = now;
        if (this.sleeping) this.setMood('idle', 0);
      }

      // 가끔 이쪽을 돌아본다
      if (this.mood === 'idle' && !walking) {
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
      const reading = this.chair > 0.7 && !facing;
      let lx = facing ? 0 : reading ? 0 : this.baseTurn * 0.7;
      let ly = reading ? 0.6 : this.stick && !facing ? -0.2 : 0;
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
      } else if (this.mallow.phase === 'munch' || (this.snack && this.snack.phase === 'eat')) {
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
      if (this.emotion) {
        this.emotion.t += dt;
        if (this.emotion.t >= 4) this.emotion = null;
      }
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

      // 귤: 1.6초 동안 껍질을 별 모양으로 까고, 세 번에 나눠 오물오물
      if (this.snack) {
        const sn = this.snack;
        sn.t += dt;
        if (sn.phase === 'peel' && sn.t >= 1.6) {
          sn.phase = 'eat';
          sn.t = 0;
        } else if (sn.phase === 'eat') {
          const b = Math.min(3, Math.floor(sn.t / 0.6) + 1);
          if (b > sn.bites) {
            sn.bites = b;
            this.emit('nom');
          }
          if (sn.t >= 1.9) {
            this.snack = null;
            this.setMood('happy', 1.8);
            this.addHearts(2);
            this.emit('yum');
          }
        }
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
      const rolling = !!this.rollPose;
      return { x0: rolling ? -88 : -78, y0: (this.hatStyle ? -160 : -140) - (this.chair > 0 ? 30 : 0), x1: this.stick ? 240 : rolling ? 88 : 78, y1: this.rest === 'branch' ? 42 : 14 };
    }

    draw(g, dpr, bodyOnly, rowing = false) {
      const B = this.bounds();
      const k = this.k;
      const sc = k * Math.min(dpr || 1, 2);
      const cw = Math.max(1, Math.ceil((B.x1 - B.x0) * sc));
      const ch = Math.max(1, Math.ceil((B.y1 - B.y0) * sc));
      let fresh = false;
      if (!this.cv || this.cv.width !== cw || this.cv.height !== ch) {
        this.cv = MC.canvas(cw, ch);
        this.cg = this.cv.getContext('2d');
        fresh = true;
      }
      if (fresh || this.rollPose || this.paintedRowing !== rowing || !this.paintEvery || this.t - this.paintedAt >= this.paintEvery || this.t < this.paintedAt) {
        this.paintedAt = this.t;
        this.paintedRowing = rowing;
        const o = this.cg;
        o.setTransform(1, 0, 0, 1, 0, 0);
        o.globalCompositeOperation = 'source-over';
        o.globalAlpha = 1;
        o.clearRect(0, 0, cw, ch);
        o.setTransform(sc, 0, 0, sc, -B.x0 * sc, -B.y0 * sc);
        o.lineJoin = 'round';
        o.lineCap = 'round';
        this.paint(o, rowing);
        this.applyLight(o, B);
      }
      if (this.flip < 0) {
        g.save();
        g.translate(this.x * 2, 0);
        g.scale(-1, 1);
      }
      g.drawImage(this.cv, this.x + B.x0 * k, this.y + B.y0 * k, (B.x1 - B.x0) * k, (B.y1 - B.y0) * k);
      if (this.flip < 0) g.restore();
      if (!bodyOnly) this.drawExtras(g);
    }

    breath() {
      return Math.sin((2 * Math.PI * MC.clock()) / MC.WAVE_T) * (this.mood === 'asleep' ? 1.5 : 1);
    }

    paint(o, rowing = false) {
      const b = this.breath();
      const L = this.lie;
      const ground = !this.rest && (L > 0 || this.rollPose) && this.chair < 0.01;
      // 바닥 그림자 (튜브나 나뭇가지 위에서는 장면이 따로 그린다)
      if (!this.rest) {
        o.fillStyle = 'rgba(0,0,0,0.3)';
        ellipse(o, ground ? 8 : 0, 1.5, ground ? 50 : 35 * (1 + this.hop * 0.005), ground ? 5 : 6.5);
        o.fill();
      }
      const shake = this.mood === 'cold' ? Math.sin(this.t * 43) * 0.7 : 0;
      const spinX = this.spin ? Math.max(0.06, Math.abs(Math.cos((Math.PI * this.spin.t) / this.spin.dur))) : 1;
      const bob = -Math.abs(Math.sin(this.walkPhase)) * 3 * this.walk;
      o.save();
      o.translate(shake, ground ? 0 : this.hop + bob);
      if (this.logThrow && this.chair <= 0.01) o.rotate(this.logThrowPose().lean);
      if (!ground) o.rotate(Math.sin(this.walkPhase) * 0.04 * this.walk);
      o.scale(ground ? 1 : spinX, 1);
      // 눕고 일어날 때 몽글하게 눌렸다 펴진다
      if (!ground && L > 0 && L < 1) {
        const sq = L < 0.5 ? 1 - 0.6 * L : 0.7 + 0.6 * (L - 0.5);
        o.scale(1 + (1 - sq) * 0.35, sq);
      }
      const C = L < 0.5 ? this.chair : 0;
      if (ground) this.paintGroundLying(o, b);
      else if (C > 0.01) {
        // 의자 등받이와 뒷다리 → 올라앉은 멍이 → 앞쪽 천과 엇갈린 다리, 팔걸이, 늘어뜨린 뒷발
        this.paintChairBack(o, C);
        const lift = this.seatLift;
        o.save();
        o.translate(0, -lift);
        this.paintFront(o, b, rowing);
        o.restore();
        this.paintChairFront(o, C, lift);
      } else if (L >= 0.5) this.paintLying(o, b);
      else if (this.view === 'back') this.paintBack(o, b);
      else this.paintFront(o, b, rowing);
      o.restore();
    }

    // ── 접이식 캠핑 의자와 책 ─────────────────────────────
    // 펴지는 정도 C(0..1): 다리가 X로 벌어지고 등받이가 펴진다
    paintChairBack(o, C) {
      const open = MC.smooth(0, 0.55, C);
      const S = CHAIR.seat;
      o.save();
      o.globalAlpha *= Math.min(1, C * 4);
      // 뒷다리
      o.strokeStyle = CHAIR.frameDark;
      o.lineWidth = 4;
      for (const side of [-1, 1]) {
        o.beginPath();
        o.moveTo(side * 30 * open, -S);
        o.lineTo(side * (22 + 10 * open), 0);
        o.stroke();
      }
      // 등받이: 아래가 좁고 위가 살짝 넓은 천, 가운데 줄무늬
      const top = -S - 64 * open;
      o.beginPath();
      o.moveTo(-31 * open, -S);
      o.lineTo(-38 * open, top);
      o.quadraticCurveTo(0, top + 5, 38 * open, top);
      o.lineTo(31 * open, -S);
      o.closePath();
      o.fillStyle = CHAIR.fabric;
      o.fill();
      o.save();
      o.clip();
      o.fillStyle = CHAIR.stripe;
      o.fillRect(-8, top - 4, 16, 80);
      o.restore();
      o.lineWidth = 2.2;
      o.strokeStyle = INK;
      o.stroke();
      // 등받이 위 나무 막대
      MC.roundRect(o, -41 * open, top - 4, 82 * open, 6, 3);
      o.fillStyle = CHAIR.frame;
      o.fill();
      o.lineWidth = 1.8;
      o.stroke();
      o.restore();
    }

    paintChairFront(o, C, lift) {
      const open = MC.smooth(0, 0.55, C);
      const S = CHAIR.seat;
      o.save();
      o.globalAlpha *= Math.min(1, C * 4);
      // 엉덩이를 받치는 천: 가운데가 살짝 처진다
      o.beginPath();
      o.moveTo(-35 * open, -S - 2);
      o.quadraticCurveTo(0, -S + 9, 35 * open, -S - 2);
      o.lineTo(33 * open, -S + 3);
      o.quadraticCurveTo(0, -S + 13, -33 * open, -S + 3);
      o.closePath();
      o.fillStyle = CHAIR.fabricDark;
      o.fill();
      o.lineWidth = 2;
      o.strokeStyle = INK;
      o.stroke();
      // 앞쪽 엇갈린 다리와 가운데 고정 못
      o.strokeStyle = CHAIR.frame;
      o.lineWidth = 4.2;
      o.beginPath();
      o.moveTo(-32 * open, -S + 2);
      o.lineTo(28 * open + 3, 0);
      o.moveTo(32 * open, -S + 2);
      o.lineTo(-28 * open - 3, 0);
      o.stroke();
      o.strokeStyle = 'rgba(40,26,16,0.5)';
      o.lineWidth = 1.2;
      o.stroke();
      ellipse(o, 0, -S / 2 + 1, 2.4, 2.4);
      o.fillStyle = '#d8c8a0';
      o.fill();
      // 팔걸이 (오른쪽에는 작은 머그잔과 김)
      if (open > 0.6) {
        for (const side of [-1, 1]) {
          o.strokeStyle = CHAIR.frame;
          o.lineWidth = 3.4;
          o.beginPath();
          o.moveTo(side * 37, -S - 1);
          o.lineTo(side * 39, -S - 20);
          o.stroke();
          MC.roundRect(o, side > 0 ? 33 : -47, -S - 24, 14, 5, 2.5);
          o.fillStyle = CHAIR.frame;
          o.fill();
          o.lineWidth = 1.6;
          o.strokeStyle = INK;
          o.stroke();
        }
        if (C > 0.95) {
          MC.roundRect(o, 36, -S - 35, 9, 11, 2.5);
          o.fillStyle = CHAIR.mug;
          o.fill();
          o.lineWidth = 1.5;
          o.strokeStyle = INK;
          o.stroke();
          o.beginPath();
          o.arc(46, -S - 29.5, 3, -Math.PI / 2, Math.PI / 2);
          o.stroke();
          // 김
          o.strokeStyle = 'rgba(255,255,255,0.55)';
          o.lineWidth = 1.4;
          for (let i = 0; i < 2; i++) {
            const u = (this.t * 0.35 + i * 0.5) % 1;
            o.globalAlpha = Math.sin(Math.PI * u) * 0.8;
            o.beginPath();
            o.moveTo(39 + i * 3, -S - 37 - u * 4);
            o.quadraticCurveTo(37 + i * 3 + Math.sin(this.t * 2 + i) * 2, -S - 43 - u * 10, 40 + i * 3, -S - 48 - u * 14);
            o.stroke();
          }
        }
      }
      o.restore();
      // 뒷발은 의자 천 위로 쏙: 발바닥을 이쪽으로 보이며 앉는다 (가끔 발가락을 꼼지락)
      if (lift > 2) this.paintSeatFeet(o, S, MC.smooth(0.55, 0.9, C));
    }

    paintSeatFeet(o, S, a) {
      const wig = this.sleeping ? 0 : Math.sin(this.t * 1.7) * Math.sin(this.t * 0.43) * (0.08 + 0.12 * this.wag);
      for (const side of [-1, 1]) {
        o.save();
        o.translate(side * 15, -S + 1 - 3 * a);
        o.rotate(side * (0.22 + wig));
        o.scale(a, a);
        // 짧은 뒷다리가 엉덩이에서 앞으로
        o.beginPath();
        o.moveTo(-side * 4 - 7, -8);
        o.quadraticCurveTo(-side * 2, -13, side * 2 + 7, -8);
        o.lineTo(6.5, 0);
        o.lineTo(-6.5, 0);
        o.closePath();
        o.fillStyle = this.coat.fur;
        o.fill();
        o.lineWidth = 2;
        o.strokeStyle = INK;
        o.stroke();
        // 이쪽을 보는 발바닥
        ellipse(o, 0, 0, 9, 10);
        o.fillStyle = '#fffaf1';
        o.fill();
        o.lineWidth = 2.2;
        o.stroke();
        o.fillStyle = '#ffb3c1';
        ellipse(o, 0, 3, 4.2, 3.4);
        o.fill();
        for (const [tx, ty] of [[-4.6, -3.6], [0, -5.6], [4.6, -3.6]]) {
          ellipse(o, tx, ty, 1.9, 2.1);
          o.fill();
        }
        o.restore();
      }
    }

    // 펼친 책: 앞발로 가슴 앞에 받쳐 든다. 졸면 무릎으로 툭 내려온다
    paintBook(o) {
      const a = MC.smooth(0.72, 1, this.chair);
      if (a <= 0.01) return;
      const drop = this.sleeping ? 9 * this.droop : 0;
      o.save();
      o.translate(0, -22 + (1 - a) * 8 + drop);
      o.rotate(this.sleeping ? 0.12 * this.droop : 0);
      o.scale(0.4 + 0.6 * a, a);
      // 겉표지
      MC.roundRect(o, -25, -14, 50, 28, 3);
      o.fillStyle = BOOK[this.coatId % BOOK.length];
      o.fill();
      o.lineWidth = 2;
      o.strokeStyle = INK;
      o.stroke();
      // 펼친 두 쪽: 가운데가 살짝 접힌다
      for (const side of [-1, 1]) {
        o.beginPath();
        o.moveTo(0, -11);
        o.quadraticCurveTo(side * 11, -14, side * 22, -11.5);
        o.lineTo(side * 22, 11);
        o.quadraticCurveTo(side * 11, 8.5, 0, 12);
        o.closePath();
        o.fillStyle = side < 0 ? '#fffaf0' : '#fbf3e4';
        o.fill();
        o.lineWidth = 1.5;
        o.strokeStyle = 'rgba(60,44,32,0.8)';
        o.stroke();
        o.strokeStyle = 'rgba(90,72,58,0.35)';
        o.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          const y = -6 + i * 4.4;
          o.beginPath();
          o.moveTo(side * 4.5, y);
          o.lineTo(side * (i === 3 ? 13 : 18), y);
          o.stroke();
        }
      }
      // 넘어가는 책장
      if (this.pageT >= 0) {
        const u = this.pageT;
        const w = Math.cos(Math.PI * u) * 22;
        o.beginPath();
        o.moveTo(0, -11);
        o.quadraticCurveTo(w * 0.5, -15 - 4 * Math.sin(Math.PI * u), w, -12);
        o.lineTo(w, 11);
        o.quadraticCurveTo(w * 0.5, 7, 0, 12);
        o.closePath();
        o.fillStyle = '#fffdf6';
        o.fill();
        o.lineWidth = 1.3;
        o.strokeStyle = 'rgba(60,44,32,0.8)';
        o.stroke();
      }
      o.restore();
    }

    // 나뭇가지에 엎드리면 네 다리가 가지 양옆으로 축 늘어져 살랑인다
    paintDangle(o, x, y, len, side, ph, splay = 0.05, fill) {
      const sw = Math.sin(this.t * 1.3 + ph) * 0.07;
      o.save();
      o.translate(x, y);
      o.rotate(side * splay + sw);
      // 힘을 뺀 다리: 아래로 갈수록 살짝 안쪽으로 휜다
      const bend = -side * 2.5;
      o.beginPath();
      o.moveTo(-6.5, 0);
      o.quadraticCurveTo(-6.8 + bend * 0.4, len * 0.55, -6 + bend, len - 4);
      o.quadraticCurveTo(-6.5 + bend, len + 5, bend, len + 5.5);
      o.quadraticCurveTo(6.5 + bend, len + 5, 6 + bend, len - 4);
      o.quadraticCurveTo(6.8 + bend * 0.4, len * 0.55, 6.5, 0);
      o.closePath();
      o.fillStyle = fill || this.coat.fur;
      o.fill();
      o.lineWidth = 2.2;
      o.strokeStyle = INK;
      o.stroke();
      // 발바닥 쪽은 하얀 양말
      ellipse(o, bend, len + 1, 6.2, 4.8);
      o.fillStyle = '#fffaf1';
      o.fill();
      o.lineWidth = 2;
      o.stroke();
      if (!fill) this.paintGlove(o, bend, len + 1);
      o.restore();
    }

    // 나뭇가지 너머로 늘어진 뒷다리와 꼬리. 장면이 가지보다 먼저 그려서 가지 밑으로 발끝과 꼬리만 보인다
    drawBranchBack(g, tilt = 0) {
      if (this.rest !== 'branch' || this.lie < 0.5) return;
      g.save();
      g.translate(this.x, this.y);
      if (tilt) g.rotate(tilt);
      g.scale(this.k * (this.flip < 0 ? -1 : 1), this.k);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      const sw = Math.sin(this.t * 1.1) * 0.1 + (this.sleeping ? 0 : Math.sin(this.wagPhase || 0) * 0.08);
      g.save();
      g.translate(30, -6);
      g.rotate(-0.12 + sw);
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(7, 20, 3, 44);
      g.strokeStyle = INK;
      g.lineWidth = 12;
      g.stroke();
      g.strokeStyle = this.coat.lo;
      g.lineWidth = 7.6;
      g.stroke();
      g.restore();
      this.paintDangle(g, -26, -4, 44, -1, 0.4, 0.16, this.coat.lo);
      this.paintDangle(g, 22, -4, 44, 1, 2.1, 0.16, this.coat.lo);
      g.restore();
    }

    // 바닥·침대: 납작한 배와 접은 뒷다리, 앞으로 뻗은 앞발 위에 턱을 얹는다.
    // 구를 때도 머리와 어깨를 잇는 축은 유지한다. 바닥에 맞춘 높이는 온몸에 함께 적용한다.
    paintGroundLying(o, b) {
      const R = this.rollPose;
      const u = R ? R.u : 0;
      const lie = Math.max(MC.smooth(0, 1, this.lie), R ? MC.smooth(0, 0.12, u) : 0);
      const angle = R ? MC.smooth(0.14, 0.88, u) * Math.PI * 2 * R.dir * this.flip : 0;
      const cs = Math.cos(angle), sn = Math.sin(angle);
      const belly = (1 - cs) / 2;
      const tuck = R ? Math.sin(Math.PI * MC.smooth(0, 1, u)) : 0;
      const bx = 14 * lie - 5 * tuck;
      const rx = MC.lerp(27, 42 - 9 * tuck, lie);
      const ry = MC.lerp(26, 22 + 2 * tuck, lie) + b * 0.55;
      const by = -ry;
      const hx = -9 * lie + 3 * tuck;
      const sx = MC.lerp(1, 0.88, lie), sy = MC.lerp(1, 0.8, lie);
      const headTop = this.hatStyle === 1 ? 80 : this.hatStyle ? 68 : this.outfit === 'beanie' ? 64 : this.outfit === 'nightcap' ? 58 : this.outfit === 'sprout' ? 50 : 37;
      const hy = MC.lerp(-71, -28.2, lie) + tuck;
      const headRadius = Math.hypot(42 * sx * sn, (cs < 0 ? headTop : 29) * sy * cs);
      const hindfeet = [-1, 1].map(s => {
        const px = MC.lerp(s * 22, s < 0 ? -27 : 43, lie);
        const dx = MC.lerp(px - bx, s < 0 ? -12 : 21, tuck), dy = ry - 4 - 9 * tuck;
        const rot = angle + s * 0.18;
        const radius = Math.hypot(11 * Math.sin(rot), 6 * Math.cos(rot));
        const y = by + dx * sn + dy * cs;
        return { x: bx + dx * cs - dy * sn, y: R ? y : Math.min(-radius, y), rot, radius };
      });
      const forefeet = [-1, 1].map(s => {
        const dx = s * MC.lerp(10, 14, lie), dy = MC.lerp(68, 25 - 10 * tuck, lie);
        const rot = angle - s * 0.08;
        const radius = Math.hypot(9.5 * Math.sin(rot), 5.5 * Math.cos(rot));
        const step = !R && this.paddle > 0.01 ? Math.sin(this.t * 7 + s * Math.PI / 2) * 2 * this.paddle : 0;
        const y = hy + dx * sn + dy * cs + step;
        return { x: hx + dx * cs - dy * sn, y: R ? y : Math.min(-radius, y), rot, radius,
          ax: hx + dx * 0.75 * cs - (dy - 10) * sn, ay: hy + dx * 0.75 * sn + (dy - 10) * cs };
      });
      // 머리만 따로 들거나 발만 바닥에 붙이지 않고, 가장 낮은 접점에 맞춰 온몸을 옮긴다.
      const bottom = Math.max(by + Math.hypot(rx * sn, ry * cs), hy + headRadius,
        ...hindfeet.map(p => p.y + p.radius), ...forefeet.map(p => p.y + p.radius));
      o.save();
      if (R) o.translate(0, -Math.max(0, bottom));
      const fur = (x, y, rx, rY, rot = 0, color = this.coat.fur) => {
        ellipse(o, x, y, rx, rY, rot);
        o.fillStyle = color; o.fill();
        o.strokeStyle = INK; o.lineWidth = 2.2; o.stroke();
      };
      const paw = (x, y, rot, pads, rear = false) => {
        o.save(); o.translate(x, y); o.rotate(rot);
        fur(0, 0, rear ? 11 : 9.5, rear ? 6 : 5.5, 0, this.coat.hi);
        if (pads > 0.1) {
          o.globalAlpha *= pads;
          o.fillStyle = '#dca5a1';
          ellipse(o, 0, 0.8, 3.6, 2.5); o.fill();
          for (const dx of [-4, 0, 4]) { ellipse(o, dx, -2.4, 1.3, 1.4); o.fill(); }
        } else {
          o.strokeStyle = 'rgba(91,61,44,0.4)'; o.lineWidth = 1;
          o.beginPath();
          for (const dx of [-3, 3]) { o.moveTo(dx, 1.5); o.lineTo(dx, 4); }
          o.stroke();
        }
        if (!rear) this.paintGlove(o, 0, 0);
        o.restore();
      };
      // 꼬리는 허리 옆에 내려놓고, 몸이 뒤집힐 때만 함께 말려 올라간다.
      const tailX = bx + MC.lerp(16, 8, tuck) + MC.lerp(18, 10, tuck) * cs - MC.lerp(12, -2, tuck) * sn;
      const tailY = by + MC.lerp(18, 10, tuck) * sn + MC.lerp(12, -2, tuck) * cs;
      o.save(); o.translate(tailX, tailY); o.rotate(angle); o.scale(1 - 0.35 * tuck, 1 - 0.35 * tuck);
      o.beginPath(); o.moveTo(0, 0);
      o.bezierCurveTo(14, -5, 24, 10 + Math.sin(this.wagPhase) * this.wag * 3, 12, 11);
      o.strokeStyle = INK; o.lineWidth = 11; o.stroke();
      o.strokeStyle = this.coat.fur; o.lineWidth = 6.8; o.stroke(); o.restore();
      // 호흡은 배의 윗선만 움직인다. 바닥에 닿은 아랫선은 고정한다.
      ellipse(o, bx, by, rx, ry, angle);
      const grad = o.createLinearGradient(0, by - ry, 0, 0);
      grad.addColorStop(0, this.coat.hi); grad.addColorStop(0.6, this.coat.fur); grad.addColorStop(1, this.coat.lo);
      o.fillStyle = grad; o.fill(); o.strokeStyle = INK; o.lineWidth = 2.4; o.stroke();
      if (belly > 0.01) {
        o.save(); o.globalAlpha *= belly;
        o.translate(bx, by); o.rotate(angle);
        ellipse(o, 0, -2, 20, 14); o.fillStyle = this.coat.hi; o.fill();
        o.strokeStyle = 'rgba(91,61,44,0.18)'; o.lineWidth = 1.2;
        o.beginPath(); o.moveTo(0, -8); o.quadraticCurveTo(-2, 0, 0, 5); o.stroke(); o.restore();
      }
      // 뒷다리는 허벅지 밑으로 접는다. 뒤집힐 때는 무릎을 당겨 발바닥이 보인다.
      for (const p of hindfeet) paw(p.x, p.y, p.rot, belly, true);
      const forepaws = () => {
        for (const p of forefeet) {
          o.beginPath(); o.moveTo(p.ax, p.ay);
          o.lineTo(p.x, p.y); o.strokeStyle = INK; o.lineWidth = 12; o.stroke();
          o.strokeStyle = this.coat.fur; o.lineWidth = 8; o.stroke();
          paw(p.x, p.y, p.rot, belly);
        }
      };
      if (belly < 0.5) forepaws();
      if (this.outfit === 'scarf') {
        o.save(); o.translate(hx, hy); o.rotate(angle);
        o.beginPath(); o.moveTo(-25 * sx, 14 * sy); o.quadraticCurveTo(0, 29 * sy, 25 * sx, 14 * sy);
        o.strokeStyle = INK; o.lineWidth = 9; o.stroke();
        o.strokeStyle = this.hat.scarf; o.lineWidth = 5.5; o.stroke(); o.restore();
      }
      const view = this.view;
      this.view = 'front';
      const dx = bx - hx, dy = by - hy;
      const join = R ? { x: (dx * cs + dy * sn) / sx, y: (-dx * sn + dy * cs) / sy - 71, rx: rx / sx, ry: ry / sy, blend: tuck } : null;
      o.save(); o.translate(hx, hy); o.rotate(angle + (R ? 0 : this.tilt * (1 - lie) + this.tilt * lie * 0.12));
      o.scale(sx, sy); o.translate(0, 71); this.paintHead(o, join); o.restore();
      this.view = view;
      if (belly >= 0.5) forepaws();
      o.restore();
    }

    // 튜브·가지 위의 엎드린 모습
    paintLying(o, b) {
      const branch = this.rest === 'branch';
      // 가지 위: 가지를 가로질러 엎드려, 앞다리는 이쪽으로 축 늘어진다 (뒷다리와 꼬리는 가지 너머, drawBranchBack)
      if (branch) {
        this.paintDangle(o, -15, -3, 30, -1, 0.8, 0.1);
        this.paintDangle(o, 15, -3, 30, 1, 2.6, 0.1);
      }
      // 동그란 등
      o.save();
      o.translate(0, -2);
      o.scale(1 + 0.01 * b, 1 + 0.035 * b);
      o.beginPath();
      o.moveTo(-46, 0);
      o.bezierCurveTo(-50, -30, -26, -50, 0, -50);
      o.bezierCurveTo(26, -50, 50, -30, 46, 0);
      o.bezierCurveTo(28, 5, -28, 5, -46, 0);
      o.closePath();
      const grd = o.createRadialGradient(-10, -38, 4, 0, -24, 52);
      grd.addColorStop(0, this.coat.hi);
      grd.addColorStop(0.55, this.coat.fur);
      grd.addColorStop(1, this.coat.lo);
      o.fillStyle = grd;
      o.fill();
      o.lineWidth = 2.4;
      o.strokeStyle = INK;
      o.stroke();
      o.restore();
      // 꼬리: 몸 옆으로 살랑 (가지 위에서는 가지 너머로 늘어뜨렸다)
      if (!branch) {
        o.save();
        o.translate(40, -12);
        o.rotate(0.9);
        this.paintTail(o, 0, 0, 1);
        o.restore();
      }
      // 뒷발 (가지 위에서는 늘어뜨렸다)
      if (!branch) {
        for (const side of [-1, 1]) {
          ellipse(o, side * 45, -5, 9.5, 6.2, side * 0.35);
          o.fillStyle = '#fffaf1';
          o.fill();
          o.lineWidth = 2.2;
          o.strokeStyle = INK;
          o.stroke();
        }
      }
      // 머리: 앞발 위에 턱을 괸다 (누워 있을 때는 늘 얼굴이 보인다)
      const view = this.view;
      this.view = 'front';
      o.save();
      o.translate(0, this.lieDrop);
      this.paintHeadGroup(o, b * 0.5);
      o.restore();
      this.view = view;
      // 앞발: 턱 밑으로 빼꼼 (가지 위에서는 늘어뜨렸고, 튜브 위에서는 번갈아 물을 젓는다)
      if (branch) return;
      for (const side of [-1, 1]) {
        const x = side * 13;
        const row = this.paddle > 0.01 ? Math.max(0, Math.sin(this.t * 7 + (side > 0 ? Math.PI : 0))) * 4 * this.paddle : 0;
        ellipse(o, x, -2.5 + row, 9.5, 6.4);
        o.fillStyle = '#fffaf1';
        o.fill();
        o.lineWidth = 2.2;
        o.strokeStyle = INK;
        o.stroke();
        o.strokeStyle = 'rgba(91,61,44,0.5)';
        o.lineWidth = 1.2;
        o.beginPath();
        o.moveTo(x - 3, row);
        o.lineTo(x - 3, 2.6 + row);
        o.moveTo(x + 3, row);
        o.lineTo(x + 3, 2.6 + row);
        o.stroke();
        this.paintGlove(o, x, -2.5 + row);
      }
    }

    paintFront(o, b, rowing = false) {
      this.paintTail(o, 21, -11, 1);
      o.save();
      o.scale(1 + 0.012 * b, 1 + 0.024 * b);
      this.paintBody(o, false);
      o.restore();
      if (this.outfit === 'scarf') this.paintScarf(o, false);
      const reading = this.chair > 0.72 && !this.logThrow && !rowing;
      if (this.stick && !reading && !this.snack && !this.logThrow && !rowing) this.paintStick(o);
      if (reading) this.paintBook(o);
      else if (this.snack && !this.logThrow && !rowing) this.paintMandarin(o);
      if (!this.logThrow && !rowing) this.paintPaws(o);
      this.paintHeadGroup(o, b);
      if (this.logThrow) this.paintThrowPaws(o);
    }

    // 두 앞발로 든 귤: 껍질이 별처럼 벌어지고, 한 쪽씩 줄어든다
    paintMandarin(o) {
      const sn = this.snack;
      const peel = sn.phase === 'peel' ? MC.smooth(0.15, 1.5, sn.t) : 1;
      const left = sn.phase === 'eat' ? 1 - sn.bites / 3.2 : 1;
      o.save();
      o.translate(0, -30);
      const r = 11;
      // 벌어진 껍질 다섯 장 (껍질 안쪽은 하얗다)
      if (peel > 0.02) {
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
          const open = peel * 1.05;
          o.save();
          o.rotate(a + Math.PI / 2);
          o.beginPath();
          o.moveTo(-5.5, 0);
          o.quadraticCurveTo(-6.5, -r * (0.7 + 0.5 * open), 0, -r * (0.95 + 0.75 * open));
          o.quadraticCurveTo(6.5, -r * (0.7 + 0.5 * open), 5.5, 0);
          o.closePath();
          o.fillStyle = open > 0.5 ? '#fff4dc' : '#f7912a';
          o.fill();
          o.lineWidth = 1.6;
          o.strokeStyle = '#c2611a';
          o.stroke();
          o.restore();
        }
      }
      // 알맹이 (먹을수록 작아진다)
      const rr = r * (peel > 0.5 ? 0.82 : 1) * Math.max(0.15, left);
      ellipse(o, 0, 0, rr, rr * 0.92);
      o.fillStyle = peel > 0.5 ? '#ffb347' : '#f7912a';
      o.fill();
      o.lineWidth = 1.8;
      o.strokeStyle = '#c2611a';
      o.stroke();
      if (peel > 0.5) {
        o.strokeStyle = 'rgba(255,240,210,0.85)';
        o.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          o.beginPath();
          o.moveTo(0, 0);
          o.lineTo(Math.cos(a) * rr * 0.9, Math.sin(a) * rr * 0.85);
          o.stroke();
        }
      } else {
        // 꼭지와 잎
        o.fillStyle = '#5e8a3a';
        ellipse(o, 2, -r + 1, 3.6, 1.8, -0.4);
        o.fill();
        o.fillStyle = 'rgba(255,255,255,0.55)';
        ellipse(o, -4, -4, 2.6, 1.6, -0.6);
        o.fill();
      }
      o.restore();
    }

    paintBack(o, b) {
      if (this.walk > 0.05) {
        const step = Math.sin(this.walkPhase) * 2.4 * this.walk;
        for (const [x, dy] of [[-11, step], [11, -step]]) {
          ellipse(o, x, -2 + dy, 7.5, 5);
          o.fillStyle = '#fffaf1';
          o.fill();
          o.lineWidth = 2.2;
          o.strokeStyle = INK;
          o.stroke();
        }
      }
      o.save();
      o.scale(1 + 0.012 * b, 1 + 0.024 * b);
      this.paintBody(o, true);
      o.restore();
      this.paintTail(o, 0, -9, 0);
      if (this.outfit === 'scarf') this.paintScarf(o, true);
      this.paintHeadGroup(o, b);
    }

    paintThrowPaws(o) {
      const pose = this.logThrowPose();
      for (const side of [-1, 1]) {
        const x = pose.x + side * 9, y = pose.y + 6;
        ellipse(o, x, y, 8, 5.8, -side * 0.35);
        o.fillStyle = '#fffaf1'; o.fill();
        o.lineWidth = 2.2; o.strokeStyle = INK; o.stroke();
        this.paintGlove(o, x, y, -side * .35);
      }
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
      grd.addColorStop(0, back ? this.coat.fur : this.coat.hi);
      grd.addColorStop(0.55, this.coat.fur);
      grd.addColorStop(1, this.coat.lo);
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
      const reading = this.chair > 0.72;
      const snacking = !!this.snack && !reading;
      const holding = this.stick && !reading && !snacking;
      const step = Math.sin(this.walkPhase) * 2.2 * this.walk;
      const bd = this.sleeping ? 9 * this.droop : 0;
      const paws = reading ? [[-23, -19 + bd, 0.9], [23, -19 + bd, -0.9]] : snacking ? [[-14, -24, 0.6], [14, -24, -0.6]] : holding ? [[-4, -29, 0.35], [8.5, -32, -0.25]] : [[-10, -3 + step, 0], [10, -3 - step, 0]];
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
        this.paintGlove(o, 0, 0);
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
      o.strokeStyle = this.coat.fur;
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

    paintHead(o, join = null) {
      const back = this.view === 'back';
      const tx = back ? 0 : this.turn;
      this.headPath(o);
      const grd = o.createRadialGradient(-10 + tx * 8, -86, 3, tx * 4, -70, 46);
      grd.addColorStop(0, back ? this.coat.fur : this.coat.hi);
      grd.addColorStop(0.55, this.coat.fur);
      grd.addColorStop(1, this.coat.lo);
      o.fillStyle = grd;
      o.fill();
      o.lineWidth = 2.4;
      o.strokeStyle = INK;
      if (join) {
        // 어깨와 겹치는 머리의 테두리는 옅게 지워 목을 자르는 고리처럼 보이지 않게 한다.
        o.save();
        ellipse(o, join.x, join.y, join.rx, join.ry); o.clip();
        o.globalAlpha *= 1 - join.blend;
        this.headPath(o); o.stroke(); o.restore();
        o.save();
        o.beginPath(); o.rect(-180, -240, 360, 360);
        o.ellipse(join.x, join.y, join.rx, join.ry, 0, 0, Math.PI * 2); o.clip('evenodd');
        this.headPath(o); o.stroke(); o.restore();
      } else o.stroke();
      this.paintEar(o, -1, tx);
      this.paintEar(o, 1, tx);
      if (!back) this.paintFace(o, tx);
      this.paintAccessory(o, back);
      if (this.hatStyle) this.paintGiftHat(o, tx, back);
      else if (this.outfit === 'beanie') this.paintBeanie(o, tx);
      else if (this.outfit === 'sprout') this.paintSprout(o, tx);
      else if (this.outfit === 'nightcap') this.paintNightcap(o, tx, back);
      else if (!back) this.paintTuft(o, tx);
    }

    paintGiftHat(o, tx, back) {
      o.save(); o.translate(tx * 5, 0);
      o.lineWidth = 2.2; o.strokeStyle = INK;
      const oval = (x, y, rx, ry, color, rot = 0) => {
        ellipse(o, x, y, rx, ry, rot); o.fillStyle = color; o.fill(); o.stroke();
      };
      if (this.hatStyle === 1) {
        oval(-18, -125, 9, 23, '#fff5ef', -.22);
        oval(18, -125, 9, 23, '#fff5ef', .22);
        ellipse(o, -18, -125, 4, 15, -.22); o.fillStyle = '#f5b6c7'; o.fill();
        ellipse(o, 18, -125, 4, 15, .22); o.fill();
        oval(0, -100, 37, 17, '#fff5ef');
        oval(0, -90, 37, 5, '#f7c7d2');
        if (!back) {
          o.strokeStyle = '#d38c9f'; o.lineWidth = 2;
          o.beginPath(); o.moveTo(-33, -87); o.quadraticCurveTo(-26, -67, -19, -54); o.moveTo(33, -87); o.quadraticCurveTo(27, -66, 19, -54); o.stroke();
        }
      } else if (this.hatStyle === 2) {
        oval(0, -103, 34, 23, '#a5dba2');
        oval(-18, -123, 10, 10, '#b8e5a9'); oval(18, -123, 10, 10, '#b8e5a9');
        if (!back) {
          ellipse(o, -18, -124, 2.8, 4); o.fillStyle = EYE; o.fill();
          ellipse(o, 18, -124, 2.8, 4); o.fill();
          o.beginPath(); o.arc(0, -110, 7, .15, Math.PI - .15); o.stroke();
        }
        oval(0, -89, 41, 5, '#80bc8c');
      } else if (this.hatStyle === 3) {
        oval(1, -108, 37, 20, '#f69aaa', -.1);
        oval(0, -90, 32, 5, '#dc748c');
        o.fillStyle = '#fff2c2';
        for (const [x, y] of [[-22, -109], [-9, -116], [5, -105], [20, -115], [27, -104], [-9, -101]]) { ellipse(o, x, y, 1.5, 2.5, -.2); o.fill(); }
        o.strokeStyle = '#638960'; o.lineWidth = 3;
        o.beginPath(); o.moveTo(3, -125); o.quadraticCurveTo(1, -137, 10, -138); o.stroke();
        oval(-5, -126, 9, 3.5, '#88b77e', .4); oval(10, -127, 9, 3.5, '#88b77e', -.3);
      } else {
        o.beginPath(); o.moveTo(-34, -90);
        o.bezierCurveTo(-46, -98, -33, -119, -21, -113);
        o.bezierCurveTo(-22, -134, 8, -135, 13, -118);
        o.bezierCurveTo(33, -129, 45, -106, 34, -92); o.closePath();
        o.fillStyle = '#f0f8ff'; o.fill(); o.stroke();
        oval(0, -90, 36, 5, '#b5d8ee');
        if (!back) { o.fillStyle = '#f4d276'; this.paintStar(o, 20, -109, 6); }
      }
      o.restore();
    }

    paintStar(o, x, y, r) {
      o.beginPath();
      for (let i = 0; i < 10; i++) {
        const angle = -Math.PI / 2 + i * Math.PI / 5, radius = i % 2 ? r * .48 : r;
        const px = x + Math.cos(angle) * radius, py = y + Math.sin(angle) * radius;
        if (!i) o.moveTo(px, py); else o.lineTo(px, py);
      }
      o.closePath(); o.fill();
    }

    paintAccessory(o, back) {
      if (!this.accessory) return;
      o.save(); o.strokeStyle = '#bc8197'; o.lineWidth = 2.6;
      o.beginPath(); o.moveTo(-22, -48); o.quadraticCurveTo(0, -35, 22, -48); o.stroke();
      if (!back) {
        if (this.accessory === 1) {
          o.fillStyle = '#f5a9ba'; o.strokeStyle = '#b9768b'; o.lineWidth = 1.4;
          for (const side of [-1, 1]) {
            o.beginPath(); o.moveTo(0, -41); o.bezierCurveTo(side * 21, -57, side * 23, -26, 0, -38); o.closePath(); o.fill(); o.stroke();
          }
          ellipse(o, 0, -40, 4, 4.5); o.fillStyle = '#ffe0e8'; o.fill(); o.stroke();
        } else if (this.accessory === 2) {
          o.fillStyle = '#ffe298'; this.paintStar(o, 0, -35, 10);
          o.strokeStyle = '#bd9655'; o.lineWidth = 1.2; o.stroke();
        } else {
          o.fillStyle = '#fffbef';
          for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ellipse(o, Math.cos(a) * 7, -37 + Math.sin(a) * 7, 4.5, 4.5); o.fill(); }
          ellipse(o, 0, -37, 4.5, 4.5); o.fillStyle = '#f4cf70'; o.fill();
        }
      }
      o.restore();
    }

    // 앞발을 그리는 모든 자세에서 같은 장갑을 쓴다.
    paintGlove(o, x, y, rot = 0) {
      if (!this.gloves) return;
      o.save(); o.translate(x, y); o.rotate(rot);
      const colors = [null, ['#f6b4c9', '#c27895'], ['#a9dccc', '#609f8a'], ['#ccb9ef', '#977bc0']][this.gloves];
      ellipse(o, 0, 0, 8.6, 6.6); o.fillStyle = colors[0]; o.fill();
      o.strokeStyle = colors[1]; o.lineWidth = 1.6; o.stroke();
      o.fillStyle = '#fff9ee'; o.fillRect(-6.2, 3.1, 12.4, 2.8);
      o.fillStyle = colors[1];
      if (this.gloves === 1) {
        o.save(); o.translate(0, -.7); o.scale(.62, .62); heartPath(o); o.fill(); o.restore();
      } else if (this.gloves === 2) {
        ellipse(o, 0, .3, 2.7, 1.8); o.fill();
        for (const dx of [-3, 0, 3]) { ellipse(o, dx, -2.6, 1.1, 1.2); o.fill(); }
      } else this.paintStar(o, 0, -.8, 4);
      o.restore();
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
      grd.addColorStop(0, this.coat.earHi);
      grd.addColorStop(1, this.coat.earLo);
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
      o.fillStyle = this.coat.fur;
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
      grd.addColorStop(0, this.hat.top);
      grd.addColorStop(1, this.hat.bot);
      o.fillStyle = grd;
      o.fill();
      o.save();
      o.clip();
      o.strokeStyle = this.hat.line;
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
      o.fillStyle = this.hat.band;
      o.fill();
      o.strokeStyle = INK;
      o.stroke();
      o.strokeStyle = this.hat.line;
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

    // 텐트 안에서 쓰는 잠옷 고깔모자: 끝이 옆으로 축 늘어지고, 끝에 보송한 방울
    paintNightcap(o, tx, back) {
      const sway = this.pomX * 0.7;
      o.save();
      o.translate(tx * 3, 0);
      if (back) o.scale(-1, 1);
      const body = () => {
        o.beginPath();
        o.moveTo(-31, -88);
        o.bezierCurveTo(-31, -114, -13, -135, 9, -135);
        o.bezierCurveTo(29 + sway * 0.3, -135, 45 + sway, -122, 47 + sway, -101);
        o.bezierCurveTo(41 + sway, -106, 31, -117, 21, -115);
        o.bezierCurveTo(27, -105, 31, -97, 31, -88);
        o.closePath();
      };
      body();
      const grd = o.createLinearGradient(-22, -135, 30, -88);
      grd.addColorStop(0, this.hat.top);
      grd.addColorStop(1, this.hat.bot);
      o.fillStyle = grd;
      o.fill();
      // 비스듬한 줄무늬
      o.save();
      body();
      o.clip();
      o.strokeStyle = 'rgba(255,252,244,0.42)';
      o.lineWidth = 4.6;
      for (let i = -3; i < 7; i++) {
        o.beginPath();
        o.moveTo(-44 + i * 13, -84);
        o.lineTo(-12 + i * 13, -142);
        o.stroke();
      }
      o.restore();
      body();
      o.lineWidth = 2.4;
      o.strokeStyle = INK;
      o.stroke();
      // 보송한 단
      o.beginPath();
      for (let i = 0; i <= 8; i++) {
        const x = -33 + i * (66 / 8);
        o.arc(x, -88, 4.6, Math.PI, 0);
      }
      o.lineTo(33, -82);
      for (let i = 8; i >= 0; i--) {
        const x = -33 + i * (66 / 8);
        o.arc(x, -82, 4.2, 0, Math.PI);
      }
      o.closePath();
      o.fillStyle = '#fff8ee';
      o.fill();
      o.lineWidth = 2.2;
      o.stroke();
      // 방울
      const px = 47 + sway;
      const py = -98;
      const pg = o.createRadialGradient(px - 2.5, py - 2.5, 1, px, py, 8);
      pg.addColorStop(0, '#ffffff');
      pg.addColorStop(1, '#ece0cf');
      ellipse(o, px, py, 7.6, 7.2);
      o.fillStyle = pg;
      o.fill();
      o.lineWidth = 2.2;
      o.strokeStyle = INK;
      o.stroke();
      o.restore();
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
      o.fillStyle = this.hat.scarf;
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
        o.fillStyle = this.hat.scarf;
        o.fill();
        o.lineWidth = 2;
        o.strokeStyle = INK;
        o.stroke();
      }
    }

    stickLocalTip() {
      if (!this.stickTip) return { x: 120, y: -95 };
      return {
        x: ((this.stickTip.x - this.x) / this.k) * this.flip,
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
      return { x: this.x + lx * this.k * this.flip, y: this.y + (ly + this.hop) * this.k };
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
        if (!MALLOW_GLOW) MALLOW_GLOW = MC.glow([255, 190, 110], 64, 0.2);
        g.save();
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = Math.min(0.5, this.light.glowA * (0.4 + m.toast)) * 0.9;
        const r = 16 * k;
        g.drawImage(MALLOW_GLOW, p.x - r, p.y - r, r * 2, r * 2);
        g.restore();
      }
      // 하트
      for (const h of this.hearts) {
        if (h.t < 0) continue;
        const a = h.t < 0.2 ? h.t / 0.2 : Math.max(0, 1 - (h.t - 1.1) / 0.8);
        const p = this.world(h.x, h.y + this.lieDrop);
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
      MC.Emotes.draw(g, this);
      // zZ
      for (const z of this.zs) {
        const u = z.t / 3;
        const p = this.world(15 + z.t * 9, -100 - z.t * 15 + this.headDrop + this.lieDrop);
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
        const p = this.world(30, -112 + this.lieDrop);
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

  Pup.HATS = HATS.length;
  // 꾸미기에서 고를 수 있는 빛깔들 (예전 번호 5는 고르는 목록에서 뺀다: 크림 몸 + 먹빛 귀와 같다)
  Pup.BODIES = BODIES.map((b, i) => ({ i, name: b.name, fur: b.fur, lo: b.lo })).filter((b) => !BODIES[b.i].legacy);
  Pup.EARS = EARS.map((e, i) => (e ? { i, name: e.name, hi: e.earHi, lo: e.earLo } : null)).filter(Boolean);
  Pup.HATS_LIST = HATS.map((h, i) => ({ i, top: h.top, bot: h.bot }));
  // 몸·귀 번호 ↔ 함께 나누는 털빛 값
  Pup.splitCoat = (c) => {
    c = c | 0;
    let body = c % 10;
    let ear = Math.floor(c / 10);
    if (BODIES[body] && BODIES[body].legacy) {
      body = 0;
      if (!ear) ear = 6;
    }
    return { body, ear };
  };
  // 귀 0(기본)일 때 그 몸에 어울리는 귀 빛깔
  Pup.defaultEar = (body) => {
    const b = BODIES[body] || BODIES[0];
    return { hi: b.earHi, lo: b.earLo };
  };
  Pup.joinCoat = (body, ear) => (body % 10) + 10 * (ear % 10);
  MC.Pup = Pup;
})(window.MC = window.MC || {});
