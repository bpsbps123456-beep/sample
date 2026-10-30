/* 멍캠프 — 소리. 음원 파일 없이 Web Audio로 실시간 합성한다 */
(function (MC) {
  'use strict';

  class Sound {
    constructor() {
      this.ctx = null;
      this.volume = MC.store.get('volume', 0.75);
      this.muted = false;
    }

    ensure() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      // iOS에서 무음 스위치가 켜져 있어도 소리가 나도록
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* 지원 안 함 */ }
      let ctx;
      try { ctx = new AC({ latencyHint: 'playback' }); } catch (e) { ctx = new AC(); }
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 12;
      comp.ratio.value = 3;
      comp.attack.value = 0.01;
      comp.release.value = 0.3;
      this.master.connect(comp);
      comp.connect(ctx.destination);
      this.verb = ctx.createConvolver();
      this.verb.buffer = this.impulse(2.6, 2.4);
      this.verbIn = ctx.createGain();
      this.verbIn.connect(this.verb);
      this.verb.connect(this.master);
      this.noise = { white: this.makeNoise('white'), pink: this.makeNoise('pink'), brown: this.makeNoise('brown') };
      return ctx;
    }

    makeNoise(type) {
      const len = this.ctx.sampleRate * 4;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'white') d[i] = white * 0.5;
        else if (type === 'pink') {
          // Paul Kellet의 핑크 노이즈 필터
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.969 * b2 + white * 0.153852;
          b3 = 0.8665 * b3 + white * 0.3104856;
          b4 = 0.55 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        } else {
          last = (last + 0.02 * white) / 1.02;
          d[i] = last * 3.5;
        }
      }
      return buf;
    }

    impulse(seconds, decay) {
      const len = Math.round(this.ctx.sampleRate * seconds);
      const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return buf;
    }

    loop(buffer, dest, rate = 1) {
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.playbackRate.value = rate;
      src.connect(dest);
      src.start(0, Math.random() * buffer.duration);
      return src;
    }

    filter(type, freq, q = 0.7) {
      const f = this.ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      return f;
    }

    gain(v = 1) {
      const g = this.ctx.createGain();
      g.gain.value = v;
      return g;
    }

    pan(v) {
      if (this.ctx.createStereoPanner) {
        const p = this.ctx.createStereoPanner();
        p.pan.value = MC.clamp(v, -1, 1);
        return p;
      }
      return this.gain(1);
    }

    // 화면 시계(MC.clock) → 오디오 시계
    toCtx(t) {
      return this.ctx.currentTime + (t - MC.clock());
    }

    setVolume(v) {
      this.volume = v;
      MC.store.set('volume', v);
      if (this.ctx && !this.muted) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.08);
    }

    setMuted(m) {
      this.muted = m;
      if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.15);
    }

    // 싱잉볼 같은 종소리 (타이머 끝)
    chime() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const base = 392;
      const parts = [[1, 1, 5], [2.01, 0.45, 3], [2.76, 0.32, 2.2], [4.07, 0.18, 1.4], [5.4, 0.1, 0.9]];
      for (const [delay, f0, level] of [[0, base, 1], [1.6, base * 1.335, 0.7]]) {
        const at = ctx.currentTime + 0.05 + delay;
        for (const [ratio, amp, dec] of parts) {
          const o = ctx.createOscillator();
          o.frequency.value = f0 * ratio;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, at);
          g.gain.exponentialRampToValueAtTime(0.09 * amp * level, at + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, at + dec);
          o.connect(g);
          g.connect(this.master);
          g.connect(this.verbIn);
          o.start(at);
          o.stop(at + dec + 0.1);
        }
      }
    }

    // 호흡 안내음: 들숨은 조금 높게, 날숨은 조금 낮게
    cue(kind) {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const at = ctx.currentTime + 0.02;
      const f = kind === 'out' ? 220 : kind === 'hold' || kind === 'hold0' ? 262 : 294;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.045, at + 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 1.6);
      o.connect(g);
      g.connect(this.master);
      g.connect(this.verbIn);
      o.start(at);
      o.stop(at + 1.7);
    }
  }

  // 장면 하나의 소리 묶음. 층(layer)마다 따로 크기를 조절할 수 있다
  class Scape {
    constructor(snd, layers) {
      this.snd = snd;
      this.out = snd.gain(0);
      this.out.connect(snd.master);
      this.layers = {};
      this.levels = {};
      for (const L of layers) {
        const g = snd.gain(0);
        g.connect(this.out);
        this.layers[L.key] = g;
        this.levels[L.key] = L.value;
      }
      this.sources = [];
      this.timer = null;
      this.lastParams = 0;
    }

    begin(levels, fade = 3) {
      const now = this.snd.ctx.currentTime;
      Object.assign(this.levels, levels || {});
      for (const k in this.layers) this.layers[k].gain.value = this.levels[k];
      this.out.gain.setValueAtTime(0, now);
      this.out.gain.linearRampToValueAtTime(1, now + fade);
      // 탭이 백그라운드로 가도 끊기지 않게 1초 넘게 미리 예약해 둔다
      this.timer = setInterval(() => this.schedule(), 200);
      this.schedule();
    }

    setLevel(key, v) {
      this.levels[key] = v;
      this.layers[key].gain.setTargetAtTime(v, this.snd.ctx.currentTime, 0.1);
    }

    duck(to, seconds) {
      this.out.gain.setTargetAtTime(to, this.snd.ctx.currentTime, seconds / 3);
    }

    end(fade = 1.5) {
      clearInterval(this.timer);
      const now = this.snd.ctx.currentTime;
      this.out.gain.cancelScheduledValues(now);
      this.out.gain.setValueAtTime(this.out.gain.value, now);
      this.out.gain.linearRampToValueAtTime(0, now + fade);
      setTimeout(() => {
        for (const s of this.sources) {
          try { s.stop(); } catch (e) { /* 이미 멈춤 */ }
        }
        this.out.disconnect();
      }, fade * 1000 + 200);
    }

    params(p) {
      const now = MC.clock();
      if (!p || now - this.lastParams < 0.25) return;
      this.lastParams = now;
      this.setParams(p);
    }

    setParams() {}
    schedule() {}

    noiseLayer(type, filters, level, dest) {
      const s = this.snd;
      const g = s.gain(level);
      let head = g;
      const chain = filters.map(([t, f, q]) => s.filter(t, f, q));
      for (let i = chain.length - 1; i >= 0; i--) {
        chain[i].connect(head);
        head = chain[i];
      }
      g.connect(dest);
      this.sources.push(s.loop(s.noise[type], head));
      return { gain: g, filters: chain };
    }

    // 나무 사이에서 들리는 새 울음 몇 종류
    blip(at, dest, f0, f1, dur, amp, type = 'sine') {
      const ctx = this.snd.ctx;
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, at);
      o.frequency.exponentialRampToValueAtTime(f1, at + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(amp, at + Math.min(0.02, dur * 0.3));
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g);
      g.connect(dest);
      o.start(at);
      o.stop(at + dur + 0.02);
    }
  }

  // ── 불멍 ────────────────────────────────────────────────
  class FireScape extends Scape {
    constructor(snd) {
      super(snd, FireScape.layers);
      const s = snd;
      this.roar = this.noiseLayer('brown', [['lowpass', 320, 0.6]], 0.18, this.layers.fire);
      this.hiss = this.noiseLayer('white', [['bandpass', 4200, 0.9]], 0.01, this.layers.fire);
      this.wind = this.noiseLayer('pink', [['bandpass', 380, 0.5]], 0.05, this.layers.wind);
      this.crackBus = s.gain(1);
      this.crackBus.connect(this.layers.fire);
      const send = s.gain(0.14);
      this.crackBus.connect(send);
      send.connect(s.verbIn);
      this.cricketBus = s.gain(1);
      this.cricketBus.connect(this.layers.crickets);
      const csend = s.gain(0.35);
      this.cricketBus.connect(csend);
      csend.connect(s.verbIn);
      this.intensity = 0.7;
      const now = MC.clock();
      this.nextCrack = now + 0.3;
      this.crickets = [
        { next: now + 1.2, f: 4280, pan: -0.55 },
        { next: now + 2.1, f: 4760, pan: 0.6 },
      ];
      this.nextGust = now;
      this.visual = [];
    }

    setParams(p) {
      const now = this.snd.ctx.currentTime;
      const I = Math.min(1.2, p.intensity);
      this.intensity = I;
      this.roar.gain.gain.setTargetAtTime(0.05 + 0.26 * I, now, 0.6);
      this.roar.filters[0].frequency.setTargetAtTime(180 + 420 * I, now, 0.6);
      this.hiss.gain.gain.setTargetAtTime(0.003 + 0.012 * I, now, 0.6);
    }

    schedule() {
      const now = MC.clock();
      const until = now + 1.3;
      const rate = 1.2 + 9 * this.intensity;
      while (this.nextCrack < until) {
        const t = this.nextCrack;
        if (t > now - 0.05) {
          const strength = Math.pow(Math.random(), 2.2);
          this.crack(t, strength);
          if (strength > 0.5) this.visual.push({ t, strength });
        }
        this.nextCrack += -Math.log(1 - Math.random()) / rate;
      }
      for (const c of this.crickets) {
        while (c.next < until) {
          if (c.next > now - 0.05) this.chirp(c, c.next);
          c.next += Math.random() < 0.05 ? MC.rand(3, 9) : MC.rand(0.55, 0.85);
        }
      }
      if (now > this.nextGust) {
        this.wind.gain.gain.setTargetAtTime(0.025 + Math.random() * 0.07, this.snd.ctx.currentTime, 2);
        this.nextGust = now + MC.rand(3, 7);
      }
    }

    // 화면이 불티를 튀길 때 가져가는 '탁' 소리 목록
    drain() {
      const now = MC.clock();
      const out = [];
      while (this.visual.length && this.visual[0].t <= now) out.push(this.visual.shift());
      return out;
    }

    crack(t, strength) {
      const s = this.snd;
      const ctx = s.ctx;
      const at = Math.max(ctx.currentTime, s.toCtx(t));
      const n = 1 + Math.floor(Math.random() * 3 * (0.5 + strength));
      for (let i = 0; i < n; i++) {
        const st = at + i * MC.rand(0.004, 0.03);
        const src = ctx.createBufferSource();
        src.buffer = s.noise.white;
        const bp = s.filter('bandpass', MC.rand(900, 5200) * (strength > 0.7 ? 0.6 : 1), MC.rand(0.8, 3));
        const g = ctx.createGain();
        const p = s.pan(MC.rand(-0.35, 0.35));
        const peak = (0.2 + 0.9 * strength) * MC.rand(0.5, 1);
        const dur = MC.rand(0.006, 0.03) * (1 + strength * 1.5);
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(peak, st + 0.0015);
        g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
        src.connect(bp);
        bp.connect(g);
        g.connect(p);
        p.connect(this.crackBus);
        src.start(st, Math.random() * 3.5, dur + 0.02);
      }
    }

    chirp(c, t) {
      const s = this.snd;
      const ctx = s.ctx;
      const at = Math.max(ctx.currentTime, s.toCtx(t));
      const o = ctx.createOscillator();
      o.frequency.value = c.f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      const amp = 0.016;
      for (let k = 0; k < 3; k++) {
        const st = at + k * 0.042;
        g.gain.setValueAtTime(0, st);
        g.gain.linearRampToValueAtTime(amp, st + 0.006);
        g.gain.setValueAtTime(amp, st + 0.016);
        g.gain.linearRampToValueAtTime(0, st + 0.024);
      }
      const p = s.pan(c.pan);
      o.connect(g);
      g.connect(p);
      p.connect(this.cricketBus);
      o.start(at);
      o.stop(at + 0.16);
    }

    // 장작이 떨어질 때: 툭 + 불이 옮겨붙는 화르륵
    thud(isWorry) {
      const s = this.snd;
      const ctx = s.ctx;
      const at = ctx.currentTime + 0.01;
      this.blip(at, this.crackBus, 120, 50, 0.3, 0.4);
      const src = ctx.createBufferSource();
      src.buffer = s.noise.pink;
      const bp = s.filter('bandpass', 300, 0.7);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at + 0.2);
      g.gain.exponentialRampToValueAtTime(isWorry ? 0.22 : 0.14, at + 0.9);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 2.6);
      bp.frequency.setValueAtTime(300, at + 0.2);
      bp.frequency.exponentialRampToValueAtTime(1400, at + 1.4);
      src.connect(bp);
      bp.connect(g);
      g.connect(this.layers.fire);
      src.start(at, Math.random() * 1.0, 2.8);
      const now = MC.clock();
      for (let i = 0; i < 9; i++) this.crack(now + 0.12 + i * MC.rand(0.05, 0.22), MC.rand(0.4, 1));
    }

    poke() {
      const now = MC.clock();
      for (let i = 0; i < 4; i++) this.crack(now + i * MC.rand(0.03, 0.12), MC.rand(0.5, 1));
    }
  }
  FireScape.layers = [
    { key: 'fire', label: '장작 타는 소리', value: 1 },
    { key: 'crickets', label: '풀벌레', value: 0.6 },
    { key: 'wind', label: '밤바람', value: 0.5 },
  ];

  // ── 물멍 ────────────────────────────────────────────────
  class WaterScape extends Scape {
    constructor(snd) {
      super(snd, WaterScape.layers);
      this.bed = this.noiseLayer('brown', [['lowpass', 260, 0.5]], 0.1, this.layers.waves);
      this.swell = this.noiseLayer('brown', [['lowpass', 400, 0.6]], 0.05, this.layers.waves);
      this.crash = this.noiseLayer('pink', [['bandpass', 1100, 0.45]], 0.0001, this.layers.waves);
      this.fizz = this.noiseLayer('white', [['highpass', 2400, 0.5]], 0.0001, this.layers.waves);
      const send = snd.gain(0.25);
      this.crash.gain.connect(send);
      send.connect(snd.verbIn);
      this.wind = this.noiseLayer('pink', [['bandpass', 650, 0.4]], 0.04, this.layers.wind);
      this.lastK = Math.floor(MC.clock() / MC.WAVE_T);
      this.nextGust = MC.clock();
      this.dropBus = snd.gain(1);
      this.dropBus.connect(this.layers.waves);
      const dsend = snd.gain(0.5);
      this.dropBus.connect(dsend);
      dsend.connect(snd.verbIn);
    }

    schedule() {
      const now = MC.clock();
      const T = MC.WAVE_T;
      while ((this.lastK + 1) * T < now + 2.5) {
        this.lastK++;
        this.wave(this.lastK);
      }
      if (now > this.nextGust) {
        this.wind.gain.gain.setTargetAtTime(0.02 + Math.random() * 0.05, this.snd.ctx.currentTime, 2.5);
        this.nextGust = now + MC.rand(4, 9);
      }
    }

    // 한 번의 파도: 밀려옴(0~3.4초) → 부서짐(3.4초) → 쓸려 나감(~9초)
    wave(k) {
      const s = this.snd;
      const T = MC.WAVE_T;
      const amp = MC.waveAmp(k);
      const t0 = s.toCtx(k * T);
      if (t0 < s.ctx.currentTime) return;
      const tb = t0 + 0.34 * T;
      const sg = this.swell.gain.gain;
      const sf = this.swell.filters[0].frequency;
      const cg = this.crash.gain.gain;
      const fg = this.fizz.gain.gain;
      const ff = this.fizz.filters[0].frequency;
      sg.setTargetAtTime(0.05 + 0.3 * amp, t0, 1.2);
      sf.setTargetAtTime(450 + 550 * amp, t0, 1.4);
      cg.setTargetAtTime(0.3 * amp, tb - 0.12, 0.1);
      cg.setTargetAtTime(0.0001, tb + 0.45, 0.9);
      sg.setTargetAtTime(0.04, tb + 0.4, 1.6);
      sf.setTargetAtTime(300, tb + 0.4, 2);
      fg.setTargetAtTime(0.07 * amp, tb + 0.8, 0.6);
      ff.setTargetAtTime(4200, tb + 1, 2);
      fg.setTargetAtTime(0.0001, t0 + 0.8 * T, 0.7);
      ff.setTargetAtTime(2400, t0 + 0.95 * T, 0.3);
    }

    // 물을 톡 건드린 소리: 물방울은 음이 올라간다
    plop(z, pan) {
      const s = this.snd;
      const at = s.ctx.currentTime + 0.01;
      const p = s.pan(pan * 0.7);
      p.connect(this.dropBus);
      const f = MC.rand(520, 760) * (1.25 - 0.35 * z);
      const amp = 0.08 + 0.18 * z;
      this.blip(at, p, f, f * 2.1, 0.09, amp);
      this.blip(at + MC.rand(0.11, 0.18), p, f * 1.4, f * 2.6, 0.06, amp * 0.35);
    }
  }
  WaterScape.layers = [
    { key: 'waves', label: '파도', value: 1 },
    { key: 'wind', label: '바닷바람', value: 0.4 },
  ];

  // ── 숲멍 ────────────────────────────────────────────────
  class ForestScape extends Scape {
    constructor(snd) {
      super(snd, ForestScape.layers);
      this.streamLo = this.noiseLayer('pink', [['bandpass', 900, 0.5]], 0.06, this.layers.stream);
      this.streamHi = this.noiseLayer('white', [['bandpass', 2600, 0.9]], 0.018, this.layers.stream);
      this.leaves = this.noiseLayer('pink', [['highpass', 900, 0.5], ['lowpass', 5000, 0.5]], 0.03, this.layers.wind);
      this.bubbleBus = snd.gain(1);
      const bp = snd.pan(-0.45);
      this.bubbleBus.connect(bp);
      bp.connect(this.layers.stream);
      const bsend = snd.gain(0.3);
      this.bubbleBus.connect(bsend);
      bsend.connect(snd.verbIn);
      this.birdBus = snd.gain(1);
      this.birdBus.connect(this.layers.birds);
      const send = snd.gain(0.55);
      this.birdBus.connect(send);
      send.connect(snd.verbIn);
      const now = MC.clock();
      this.nextBubble = now;
      this.nextBird = now + 1.5;
      this.nextJitter = now;
      this.windLevel = 0.3;
    }

    setParams(p) {
      this.windLevel = p.wind;
      this.leaves.gain.gain.setTargetAtTime(0.01 + 0.07 * p.wind, this.snd.ctx.currentTime, 0.8);
    }

    schedule() {
      const s = this.snd;
      const now = MC.clock();
      const until = now + 1.3;
      // 계곡물: 작은 물방울 소리를 잔뜩 겹친다
      while (this.nextBubble < until) {
        const t = this.nextBubble;
        if (t > now - 0.05) {
          const f = MC.rand(380, 1300);
          this.blip(Math.max(s.ctx.currentTime, s.toCtx(t)), this.bubbleBus, f, f * MC.rand(1.3, 1.8), MC.rand(0.03, 0.07), MC.rand(0.006, 0.02));
        }
        this.nextBubble += -Math.log(1 - Math.random()) / 22;
      }
      while (this.nextBird < until) {
        if (this.nextBird > now - 0.05) this.bird(Math.max(s.ctx.currentTime, s.toCtx(this.nextBird)));
        this.nextBird += MC.rand(2.5, 9);
      }
      if (now > this.nextJitter) {
        const ct = s.ctx.currentTime;
        this.streamLo.gain.gain.setTargetAtTime(0.045 + Math.random() * 0.03, ct, 0.4);
        this.nextJitter = now + MC.rand(0.4, 1.2);
      }
    }

    bird(at) {
      const ctx = this.snd.ctx;
      const p = this.snd.pan(MC.rand(-0.8, 0.8));
      p.connect(this.birdBus);
      const kind = Math.random();
      const amp = MC.rand(0.03, 0.06);
      if (kind < 0.35) {
        // 짹짹 내려가는 짧은 울음
        const n = 3 + ((Math.random() * 4) | 0);
        const f = MC.rand(3600, 4600);
        for (let i = 0; i < n; i++) this.blip(at + i * 0.11, p, f, f * 0.66, 0.07, amp);
      } else if (kind < 0.65) {
        // 휘파람처럼 오르내리는 울음
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const notes = [MC.rand(2200, 2600), MC.rand(2900, 3300), MC.rand(2500, 2800)];
        let t = at;
        o.frequency.setValueAtTime(notes[0], t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(amp, t + 0.04);
        for (const f of notes) {
          t += MC.rand(0.12, 0.22);
          o.frequency.linearRampToValueAtTime(f, t);
        }
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
        o.connect(g);
        g.connect(p);
        o.start(at);
        o.stop(t + 0.1);
      } else if (kind < 0.85) {
        // 떨리는 트릴
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(3900, at);
        o.frequency.linearRampToValueAtTime(3200, at + 0.7);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, at);
        for (let i = 0; i < 16; i++) {
          const st = at + i * 0.045;
          g.gain.setValueAtTime(0, st);
          g.gain.linearRampToValueAtTime(amp * 0.8, st + 0.012);
          g.gain.linearRampToValueAtTime(0, st + 0.035);
        }
        o.connect(g);
        g.connect(p);
        o.start(at);
        o.stop(at + 0.8);
      } else {
        // 멧비둘기의 낮은 '구구- 구구'
        const durs = [0.32, 0.3, 0.2, 0.42];
        let t = at;
        for (let i = 0; i < durs.length; i++) {
          const f = i === 1 ? 560 : 520;
          const o = ctx.createOscillator();
          o.frequency.setValueAtTime(f, t);
          o.frequency.linearRampToValueAtTime(f * 0.94, t + durs[i]);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(amp * 0.9, t + 0.06);
          g.gain.exponentialRampToValueAtTime(0.0001, t + durs[i]);
          o.connect(g);
          g.connect(p);
          o.start(t);
          o.stop(t + durs[i] + 0.02);
          t += durs[i] + (i === 1 ? 0.35 : 0.08);
        }
      }
    }

    gust() {
      const g = this.leaves.gain.gain;
      const ct = this.snd.ctx.currentTime;
      g.setTargetAtTime(0.12, ct, 0.4);
      g.setTargetAtTime(0.01 + 0.07 * this.windLevel, ct + 1.6, 1.2);
      if (Math.random() < 0.6) this.bird(ct + MC.rand(0.6, 1.5));
    }
  }
  ForestScape.layers = [
    { key: 'stream', label: '계곡물', value: 0.8 },
    { key: 'birds', label: '새소리', value: 0.7 },
    { key: 'wind', label: '나뭇잎 바람', value: 0.6 },
  ];

  MC.Sound = Sound;
  MC.FireScape = FireScape;
  MC.WaterScape = WaterScape;
  MC.ForestScape = ForestScape;
})(window.MC = window.MC || {});
