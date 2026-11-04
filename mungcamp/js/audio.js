/* 멍캠프 — 소리.
   바탕은 실제로 녹음한 자연의 소리(sounds/: 장작불, 풀벌레, 새, 계곡물, 비, 바닷물, 끓는 물, 바람)이고,
   그 위에 화면과 맞물리는 작은 소리(불티, 파도의 부서짐, 물방울, 다람쥐…)를 Web Audio로 합성해 얹는다.
   녹음을 받기 전이나 받지 못하면(인터넷 없이 처음 열 때 등) 합성한 소리만으로도 온전히 난다 */
(function (MC) {
  'use strict';

  // ── 녹음한 소리 ─────────────────────────────────────────
  // 처음 쓸 때 한 번만 받아 풀어 두고 여러 장면이 함께 쓴다. 출처와 허락은 README '소리의 출처'
  const SAMPLES = {
    // 모닥불 (amether, CC BY 4.0). 타닥이 또렷해야 해서 조금 더 촘촘히 풀어 둔다.
    // marks: 녹음 속 '타닥'의 자리(밀리초):세기(0~99). vis 보다 센 타닥에 맞춰 불티가 튄다
    fire: {
      url: 'sounds/fire.mp3',
      rate: 32000,
      vis: 0.9,
      marks: '290:39,518:36,758:23,850:23,952:53,1356:99,1582:99,1892:26,1952:20,2450:52,2748:28,2874:87,3400:99,3650:44,3746:24,3904:68,4104:34,4408:99,4626:28,4766:93,5034:97,5276:99,5382:70,5510:94,5654:74,6054:99,6356:99,6414:78,6976:94,7250:66,7496:56,7624:56,7668:22,7722:22,7914:90,7970:38,8052:24,8180:63,8382:22,8816:99,8922:20,9076:99,9422:99,9668:43,9720:90,9846:46,10168:99,10230:31,10412:27,10686:50,10798:24,10866:99,11130:40,11270:27,11628:34,12066:37,12294:35,12534:23,12626:23,12728:54,13132:99,13360:99,13420:22,13668:28,13730:20,14228:56,14526:28,14650:88,15178:99,15428:41,15522:24,15680:67,15882:35,16184:99,16402:23,16544:92,16796:77,17296:99,17830:44,17930:22,18058:38,18296:26,18390:23,18492:50,18754:23,18896:99,19122:99,19184:31,19432:27,19492:21,19990:56,20288:25,20414:90,20940:99,21048:22,21190:53,21444:72,21644:32,21842:31,21946:99,22008:36,22166:37,22306:99,22574:89,22922:58,23050:98,23194:79,23340:21,23594:92,23896:99,23954:88,24516:91,24790:71,25036:60,25164:68,25208:22,25260:26,25456:78,25510:25,25592:23,25720:52,25860:25,25922:42,26356:99,26614:99,26916:20,26962:99,27206:46,27260:99,27386:34,27708:99,27952:54,28226:53,28340:32,28406:99,28564:20,28670:43,28810:23,28854:22,29166:42,29606:44,29706:22,29834:40,30074:27,30168:24,30270:51,30530:25,30672:99,30900:99,30962:35,31208:30,31268:21,31768:58,32064:24,32190:91,32716:99,32824:22,32968:51,33220:71,33422:30,33618:34,33724:99,33786:37,33942:37,34084:99,34334:81,34836:99',
    },
    // 벽난로 장작불 (ezwa, 퍼블릭 도메인): 텐트 안 무쇠 난로
    stove: {
      url: 'sounds/stove.mp3',
      vis: 0.3,
      marks: '652:18,882:44,1162:7,1508:7,1768:29,2220:6,3688:28,4440:47,4928:11,5938:8,6056:61,6996:17,7574:30,7702:78,7746:16,8196:5,8538:15,8886:6,9480:6,9534:33,9866:43,9954:22,10268:9,10372:11,10502:11,11758:23,12476:24,12782:7,13052:20,13924:7,14012:40,14256:14,15320:7,15928:6,16220:9,16554:18,16720:6,17444:7,18476:25,18834:8,19002:32,19522:5,19640:6,20832:6,21084:34,21974:11,22768:7,23170:12,23562:6,24552:17,24938:28,25148:5,25200:15',
    },
    crickets: { url: 'sounds/crickets.mp3' }, // 여름밤 풀벌레 (Lisa Redfern, 퍼블릭 도메인)
    birds: { url: 'sounds/birds.mp3' }, // 숲의 새 (kvgarlic, CC0)
    stream: { url: 'sounds/stream.mp3' }, // 계곡물 (gluckose, CC0)
    rain: { url: 'sounds/rain.mp3' }, // 비 (alex36917, CC BY)
    sea: { url: 'sounds/sea.mp3' }, // 바닷물결 (Luftrum, CC BY). 크기를 고르게 눌러 두어 물의 결로만 쓴다
    kettle: { url: 'sounds/kettle.mp3' }, // 끓는 물 (Moodist 소리 모음, Pixabay 콘텐츠 라이선스·CC0): 숙소 난로 위 주전자
    bubbles: { url: 'sounds/bubbles.mp3' }, // 보글보글 거품 (Moodist 소리 모음, Pixabay 콘텐츠 라이선스·CC0)
    wind: { url: 'sounds/wind.mp3' }, // 바람 (felix.blume, CC0): 숙소 창밖
  };
  // 풀어 둘 때의 표본률. 전체 소리가 10.5kHz 아래로 걸러지니 낮춰서 메모리를 아낀다
  const DECODE_RATE = 22050;

  function parseMarks(str) {
    return str.split(',').map((p) => {
      const [t, v] = p.split(':');
      return { t: +t / 1000, s: +v / 99 };
    });
  }

  // 지금 값에서 부드럽게 옮겨 간다 (앞서 잡아 둔 변화는 지운다)
  function glide(param, v, tc, ctx) {
    const now = ctx.currentTime;
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
    else {
      param.cancelScheduledValues(now);
      param.setValueAtTime(param.value, now);
    }
    param.setTargetAtTime(v, now, tc);
  }

  class Sound {
    constructor() {
      this.ctx = null;
      this.volume = MC.store.get('volume', 0.7);
      this.muted = false;
      this.samples = {};
    }

    // 녹음 하나를 받아 풀어 둔다. 같은 이름은 한 번만 받는다. 받지 못하면 null
    sample(name) {
      if (name in this.samples) return this.samples[name];
      const def = SAMPLES[name];
      if (!def || !this.ctx || MC.noSamples || typeof fetch !== 'function') return Promise.resolve(null);
      const p = fetch(def.url)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((ab) => (ab ? this.decode(ab, def.rate || DECODE_RATE) : null))
        .catch(() => null)
        .then((buf) => {
          if (buf && def.marks) {
            buf.marks = parseMarks(def.marks);
            buf.vis = def.vis || 0.3;
          }
          // 받지 못했으면 다음에 다른 곳에 갈 때 다시 받아 본다
          if (!buf) delete this.samples[name];
          return buf;
        });
      this.samples[name] = p;
      return p;
    }

    decode(ab, rate) {
      const run = (ctx, data) => new Promise((res, rej) => {
        try {
          const p = ctx.decodeAudioData(data, res, rej);
          if (p && p.then) p.then(res, rej);
        } catch (e) {
          rej(e);
        }
      });
      let off = null;
      try {
        const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        if (OAC && rate < this.ctx.sampleRate) off = new OAC(1, 1, rate);
      } catch (e) {
        off = null;
      }
      if (!off) return run(this.ctx, ab);
      // 낮은 표본률로 풀지 못하는 브라우저면 원래대로 (풀면 원본이 비워지므로 사본을 둔다)
      const copy = ab.slice(0);
      return run(off, ab).catch(() => run(this.ctx, copy));
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
      // 귀를 찌르는 고음을 살짝 덜어 내고, 갑자기 커지는 소리는 부드럽게 눌러 준다
      const warm = ctx.createBiquadFilter();
      warm.type = 'lowpass';
      warm.frequency.value = 10500;
      warm.Q.value = 0.5;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.knee.value = 18;
      comp.ratio.value = 3;
      comp.attack.value = 0.02;
      comp.release.value = 0.4;
      this.master.connect(warm);
      warm.connect(comp);
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
      const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) this.fillNoise(type, buf.getChannelData(ch));
      return buf;
    }

    fillNoise(type, d) {
      const len = d.length;
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
    }

    impulse(seconds, decay) {
      const len = Math.round(this.ctx.sampleRate * seconds);
      const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        let y = 0;
        for (let i = 0; i < len; i++) {
          // 꼬리로 갈수록 고음이 먼저 사라지는 자연스러운 울림
          const a = 0.55 - 0.45 * (i / len);
          y += a * ((Math.random() * 2 - 1) - y);
          d[i] = y * Math.pow(1 - i / len, decay) * 1.6;
        }
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
      const base = 262;
      const parts = [[1, 1, 7], [2.01, 0.4, 4.5], [2.76, 0.25, 3], [4.07, 0.12, 2], [5.4, 0.06, 1.3]];
      for (const [delay, f0, level] of [[0, base, 1], [2.2, base * 1.5, 0.6]]) {
        const at = ctx.currentTime + 0.05 + delay;
        for (const [ratio, amp, dec] of parts) {
          const o = ctx.createOscillator();
          o.frequency.value = f0 * ratio;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, at);
          g.gain.exponentialRampToValueAtTime(0.06 * amp * level, at + 0.03);
          g.gain.exponentialRampToValueAtTime(0.0001, at + dec);
          o.connect(g);
          g.connect(this.master);
          g.connect(this.verbIn);
          o.start(at);
          o.stop(at + dec + 0.1);
        }
      }
    }

    moktak() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const at = ctx.currentTime + 0.01;
      for (const [f, amp, dec] of [[560, 0.24, 0.2], [1290, 0.07, 0.07], [2210, 0.03, 0.04]]) {
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(f, at);
        o.frequency.exponentialRampToValueAtTime(f * 0.94, at + dec);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(amp, at + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0005, at + dec);
        o.connect(g);
        g.connect(this.master);
        g.connect(this.verbIn);
        o.start(at);
        o.stop(at + dec + 0.05);
      }
      const src = ctx.createBufferSource();
      src.buffer = this.noise.white;
      const bp = this.filter('bandpass', 2600, 1.2);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.12, at + 0.0005);
      g.gain.exponentialRampToValueAtTime(0.0005, at + 0.012);
      src.connect(bp);
      bp.connect(g);
      g.connect(this.master);
      src.start(at, Math.random() * 3, 0.03);
    }

    // 멍이와 친구들의 작은 소리: 톡(누름), 냠(먹기), 뽁(새 마시멜로), 폴짝, 게 집게
    cute(kind) {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const tone = (f0, f1, dur, amp, delay = 0, type = 'sine') => {
        const at = ctx.currentTime + 0.01 + delay;
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.setValueAtTime(f0, at);
        o.frequency.exponentialRampToValueAtTime(f1, at + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(amp, at + Math.min(0.02, dur * 0.3));
        g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        o.connect(g);
        g.connect(this.master);
        g.connect(this.verbIn);
        o.start(at);
        o.stop(at + dur + 0.02);
      };
      if (kind === 'boop') {
        tone(560, 840, 0.13, 0.05);
        tone(1120, 1680, 0.09, 0.012);
      } else if (kind === 'nom') {
        tone(330, 240, 0.09, 0.045, 0, 'triangle');
      } else if (kind === 'pop') {
        tone(720, 1300, 0.07, 0.035);
      } else if (kind === 'hop') {
        tone(440, 880, 0.14, 0.035);
        tone(660, 1180, 0.12, 0.025, 0.1);
      } else if (kind === 'crab') {
        tone(2100, 1800, 0.03, 0.018);
        tone(2300, 1900, 0.03, 0.018, 0.09);
      } else if (kind === 'chair') {
        // 접이식 의자를 펴는 소리: 나무 다리가 딸깍, 딸깍, 천이 팽팽해지는 툭
        tone(1500, 1350, 0.03, 0.03, 0, 'triangle');
        tone(1250, 1100, 0.03, 0.026, 0.16, 'triangle');
        this.rustle(0.34, 0.09, 700, 0.025);
      } else if (kind === 'page') {
        // 책장 넘기는 사르륵
        this.rustle(0.01, 0.32, 2600, 0.016);
      } else if (kind === 'peel') {
        // 귤껍질을 까는 소리: 톡 하고 갈라진 뒤 사락사락 벗겨진다
        tone(1900, 1500, 0.025, 0.014, 0, 'triangle');
        for (const [d, dur, f, a] of [[0.06, 0.1, 3600, 0.02], [0.34, 0.14, 3000, 0.017], [0.62, 0.09, 4100, 0.018], [0.9, 0.16, 3300, 0.016], [1.22, 0.12, 3800, 0.014]]) this.rustle(d, dur, f, a);
      } else if (kind === 'roll') {
        // 이불 위를 데굴데굴
        this.rustle(0.02, 0.34, 760, 0.03);
        this.rustle(0.38, 0.34, 620, 0.026);
        tone(470, 720, 0.12, 0.028, 0.84);
      } else if (kind === 'yum') {
        // 다 먹고 행복해서 '냐암'
        tone(620, 930, 0.12, 0.03);
        tone(830, 1240, 0.16, 0.024, 0.13);
      }
    }

    // 종이나 천이 스치는 짧은 잡음 (delay 뒤, dur 동안, f 언저리)
    rustle(delay, dur, f, amp) {
      const ctx = this.ctx;
      const at = ctx.currentTime + 0.01 + delay;
      const src = ctx.createBufferSource();
      src.buffer = this.noise.pink;
      const bp = this.filter('bandpass', f, 0.7);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(amp, at + dur * 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      src.connect(bp);
      bp.connect(g);
      g.connect(this.master);
      src.start(at, Math.random() * 3, dur + 0.05);
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
      g.gain.exponentialRampToValueAtTime(0.03, at + 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 2.4);
      o.connect(g);
      g.connect(this.master);
      g.connect(this.verbIn);
      o.start(at);
      o.stop(at + 2.5);
    }
  }

  // 녹음 한 줄기를 끝없이 흘려보낸다: 녹음의 아무 대목이나 몇 초씩 떼어 와 천천히 겹쳐 잇는다.
  // 같은 대목이 되풀이되어 들리지 않게 고르는 자리는 매번 다르고, 좌우를 바꾸거나 빠르기를 아주 살짝 바꾸기도 한다.
  // 녹음이 오기 전에는 소리가 없다가, 오면 천천히 피어난다
  class Bed {
    constructor(snd, name, dest, o = {}) {
      this.snd = snd;
      this.o = Object.assign({ level: 1, len: [6, 11], xf: 2.2, pan: 0, spread: 0, rate: [0.985, 1.015], mirror: true, fade: 3 }, o);
      this.out = snd.gain(0);
      this.out.connect(dest);
      this.buf = null;
      this.ready = false;
      this.dead = false;
      this.next = 0;
      this.recent = [];
      this.voices = new Set();
      this.onReady = null;
      this.onChunk = null;
      snd.sample(name).then((buf) => {
        if (!buf || this.dead) return;
        this.buf = buf;
        this.ready = true;
        const now = snd.ctx.currentTime;
        this.out.gain.setValueAtTime(0, now);
        this.out.gain.linearRampToValueAtTime(this.o.level, now + this.o.fade);
        this.next = now + 0.05;
        if (this.onReady) this.onReady(this);
        this.tick();
      });
    }

    setLevel(v, tc = 0.6) {
      if (Math.abs(v - this.o.level) < 0.002) return;
      this.o.level = v;
      if (this.ready) glide(this.out.gain, v, tc, this.snd.ctx);
    }

    // 앞으로 3.5초는 늘 미리 이어 둔다 (탭이 뒤로 가 타이머가 느려져도 끊기지 않게)
    tick() {
      if (!this.ready || this.dead) return;
      const now = this.snd.ctx.currentTime;
      if (this.next < now) this.next = now + 0.05;
      while (this.next < now + 3.5) this.queue();
    }

    queue() {
      const b = this.buf;
      const o = this.o;
      const rate = MC.rand(o.rate[0], o.rate[1]);
      const len = Math.min(MC.rand(o.len[0], o.len[1]), b.duration - 0.2);
      const xf = Math.min(o.xf, len * 0.4);
      // 최근에 쓴 대목과 되도록 겹치지 않는 자리
      let off = 0;
      for (let i = 0; i < 8; i++) {
        off = Math.random() * Math.max(0.01, b.duration - len - 0.05);
        if (this.recent.every((r) => Math.abs(r - off) > len * 0.75)) break;
      }
      this.recent.push(off);
      if (this.recent.length > 3) this.recent.shift();
      const at = Math.max(this.next, this.snd.ctx.currentTime + 0.03);
      this.voice(at, off, len, rate, xf, xf, 1);
      this.next = at + len / rate - xf;
      if (this.onChunk) this.onChunk(off, len, rate, at, xf);
    }

    // 한 대목: 들어올 때 xin초, 나갈 때 xout초에 걸쳐 같은 힘으로 겹친다
    voice(at, off, len, rate, xin, xout, peak, pan = null) {
      const s = this.snd;
      const ctx = s.ctx;
      const b = this.buf;
      const o = this.o;
      const dur = len / rate;
      const src = ctx.createBufferSource();
      src.buffer = b;
      src.playbackRate.value = rate;
      const env = ctx.createGain();
      env.gain.value = 0;
      const P = env.gain;
      const N = 8;
      P.setValueAtTime(0, at);
      for (let i = 1; i <= N; i++) P.linearRampToValueAtTime(peak * Math.sin((Math.PI / 2) * (i / N)), at + (xin * i) / N);
      const t2 = Math.max(at + xin + 0.005, at + dur - xout);
      P.setValueAtTime(peak, t2);
      for (let i = 1; i <= N; i++) P.linearRampToValueAtTime(peak * Math.cos((Math.PI / 2) * (i / N)), t2 + (xout * i) / N);
      const nodes = [src, env];
      let head = src;
      if (b.numberOfChannels > 1 && o.mirror && Math.random() < 0.5) {
        // 좌우를 바꿔서
        const sp = ctx.createChannelSplitter(2);
        const mg = ctx.createChannelMerger(2);
        src.connect(sp);
        sp.connect(mg, 0, 1);
        sp.connect(mg, 1, 0);
        head = mg;
        nodes.push(sp, mg);
      }
      head.connect(env);
      const pv = pan != null ? pan : o.pan + (o.spread ? MC.rand(-o.spread, o.spread) : 0);
      if (pv || b.numberOfChannels === 1) {
        const p = s.pan(pv);
        env.connect(p);
        p.connect(this.out);
        nodes.push(p);
      } else env.connect(this.out);
      src.start(at, off, len);
      src.stop(t2 + xout + 0.05);
      this.voices.add(src);
      src.onended = () => {
        this.voices.delete(src);
        for (const n of nodes) {
          try { n.disconnect(); } catch (e) { /* 이미 끊김 */ }
        }
      };
      return src;
    }

    stop() {
      this.dead = true;
      for (const v of this.voices) {
        try { v.stop(); } catch (e) { /* 이미 멈춤 */ }
      }
      this.voices.clear();
      try { this.out.disconnect(); } catch (e) { /* 이미 끊김 */ }
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
      this.beds = [];
      this.timer = null;
      this.lastParams = 0;
    }

    begin(levels, fade = 5) {
      const now = this.snd.ctx.currentTime;
      Object.assign(this.levels, levels || {});
      for (const k in this.layers) this.layers[k].gain.value = this.levels[k];
      this.out.gain.setValueAtTime(0, now);
      this.out.gain.linearRampToValueAtTime(1, now + fade);
      // 탭이 백그라운드로 가도 끊기지 않게 1초 넘게 미리 예약해 둔다
      this.timer = setInterval(() => this.pump(), 200);
      this.pump();
    }

    pump() {
      for (const b of this.beds) b.tick();
      this.schedule();
    }

    // 녹음 한 줄기 (Bed)
    rec(name, dest, o) {
      const b = new Bed(this.snd, name, dest, o);
      this.beds.push(b);
      return b;
    }

    // 합성한 잡음 층을 녹음의 결로 바꾼다: 녹음이 오면 같은 필터와 크기 변화를 그대로 두고 잡음만 천천히 물러난다
    texture(layer, name, level, o) {
      const b = this.rec(name, layer.head, Object.assign({ level }, o));
      b.onReady = () => glide(layer.pre.gain, 0, 0.9, this.snd.ctx);
      layer.bed = b;
      return b;
    }

    setLevel(key, v) {
      this.levels[key] = v;
      this.layers[key].gain.setTargetAtTime(v, this.snd.ctx.currentTime, 0.1);
    }

    duck(to, seconds) {
      this.out.gain.setTargetAtTime(to, this.snd.ctx.currentTime, seconds / 3);
    }

    // 가까이 갈수록 커지고 멀어지면 잦아든다 (0..1)
    presence(v) {
      const now = this.snd.ctx.currentTime;
      if (!this.presenced) {
        this.out.gain.cancelScheduledValues(now);
        this.out.gain.setValueAtTime(this.out.gain.value, now);
        this.presenced = true;
      }
      this.out.gain.setTargetAtTime(v, now, 0.5);
    }

    // 아주 느린 무작위 신호로 소리의 크기를 일렁이게 한다
    modulate(param, rate, depth) {
      const s = this.snd;
      const lp = s.filter('lowpass', rate, 0.5);
      const g = s.gain(depth);
      lp.connect(g);
      g.connect(param);
      this.sources.push(s.loop(s.noise.brown, lp));
    }

    end(fade = 2.5) {
      clearInterval(this.timer);
      const now = this.snd.ctx.currentTime;
      this.out.gain.cancelScheduledValues(now);
      this.out.gain.setValueAtTime(this.out.gain.value, now);
      this.out.gain.linearRampToValueAtTime(0, now + fade);
      setTimeout(() => {
        for (const s of this.sources) {
          try { s.stop(); } catch (e) { /* 이미 멈춤 */ }
        }
        for (const b of this.beds) b.stop();
        this.out.disconnect();
      }, fade * 1000 + 200);
      for (const b of this.beds) b.dead = b.dead || !b.ready; // 아직 받는 중이면 와도 틀지 않는다
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
      // 잡음은 pre 를 거쳐 들어간다 (녹음으로 바꿀 때 잡음만 물리려고)
      const pre = s.gain(1);
      pre.connect(head);
      this.sources.push(s.loop(s.noise[type], pre));
      return { gain: g, filters: chain, head, pre };
    }

    // 새 울음 한 음: 비브라토와 약한 배음을 넣어 전자음처럼 들리지 않게
    tweet(at, dest, f0, f1, dur, amp) {
      const ctx = this.snd.ctx;
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(f0, at);
      o.frequency.exponentialRampToValueAtTime(f1, at + dur);
      const vib = ctx.createOscillator();
      vib.frequency.value = MC.rand(26, 38);
      const depth = ctx.createGain();
      depth.gain.value = f0 * 0.025;
      vib.connect(depth);
      depth.connect(o.frequency);
      const h = ctx.createOscillator();
      h.frequency.setValueAtTime(f0 * 2, at);
      h.frequency.exponentialRampToValueAtTime(f1 * 2, at + dur);
      const hg = ctx.createGain();
      hg.gain.value = 0.12;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(amp, at + Math.min(0.025, dur * 0.35));
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g);
      h.connect(hg);
      hg.connect(g);
      g.connect(dest);
      for (const n of [o, vib, h]) {
        n.start(at);
        n.stop(at + dur + 0.02);
      }
    }

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
      // 불길의 낮은 숨: 느리게 일렁이는 웅웅거림 (발밑을 울리는 아주 낮은 소리는 덜어 내어 불꽃 소리답게)
      this.roar = this.noiseLayer('brown', [['lowpass', 300, 0.6], ['highpass', 85, 0.5]], 0.15, this.layers.fire);
      this.modulate(this.roar.gain.gain, 1.2, 0.07);
      // 지글지글: 빠르게 흔들리는 옅은 고음
      this.hiss = this.noiseLayer('pink', [['bandpass', 3000, 0.8]], 0.006, this.layers.fire);
      this.modulate(this.hiss.gain.gain, 16, 0.02);
      this.wind = this.noiseLayer('pink', [['bandpass', 380, 0.5]], 0.05, this.layers.wind);
      this.crackBus = s.gain(1);
      const soft = s.filter('lowpass', 9500, 0.5);
      this.crackBus.connect(soft);
      soft.connect(this.layers.fire);
      const send = s.gain(0.16);
      this.crackBus.connect(send);
      send.connect(s.verbIn);
      // 풀벌레는 멀리서 들리도록: 직접음은 작게, 울림은 크게
      this.cricketBus = s.gain(0.55);
      this.cricketBus.connect(this.layers.crickets);
      const csend = s.gain(0.7);
      this.cricketBus.connect(csend);
      csend.connect(s.verbIn);
      this.intensity = 0.7;
      this.flareAt = -99;
      const now = MC.clock();
      this.nextCluster = now + 0.25;
      this.nextTick = now + 0.1;
      this.nextPop = now + MC.rand(2, 5);
      this.crickets = [
        { next: now + 1.2, f: 4280, pan: -0.55 },
        { next: now + 2.1, f: 4760, pan: 0.6 },
      ];
      this.nextGust = now;
      this.visual = [];
      this.realFire(this.layers.fire, 1);
      // 진짜 풀벌레: 넓게 퍼져 우는 여름밤. 녹음 속 공간이 있어 울림은 조금만
      const cr = s.gain(1);
      cr.connect(this.layers.crickets);
      const crs = s.gain(0.25);
      cr.connect(crs);
      crs.connect(s.verbIn);
      this.cricketBed = this.rec('crickets', cr, { level: FireScape.CRICKETS, len: [7, 12], xf: 2.5, spread: 0.55, rate: [0.97, 1.03] });
      this.cricketBed.onReady = () => { this.realCrickets = true; };
    }

    // 진짜 장작불 두 줄기: 하나는 늘, 하나는 불이 셀수록 더해져 타닥이 촘촘해진다.
    // 녹음 속 타닥의 순간(marks)을 화면에 알려 그때 불티가 튄다
    realFire(dest, level) {
      const s = this.snd;
      this.fireBus = s.gain(level);
      // 가끔 아주 센 '탁!'에 놀라지 않게 순간만 살짝 눌러 준다
      const comp = s.ctx.createDynamicsCompressor();
      comp.threshold.value = -24;
      comp.knee.value = 6;
      comp.ratio.value = 6;
      comp.attack.value = 0.001;
      comp.release.value = 0.09;
      this.fireTone = s.filter('lowpass', 8000, 0.3);
      this.fireBus.connect(comp);
      comp.connect(this.fireTone);
      this.fireTone.connect(dest);
      const send = s.gain(0.07);
      this.fireTone.connect(send);
      send.connect(s.verbIn);
      const B = FireScape.BED;
      this.fireA = this.rec('fire', this.fireBus, { level: B * 0.85, len: [5, 9], xf: 1.6, pan: -0.12, spread: 0.08, rate: [0.97, 1.03] });
      this.fireB = this.rec('fire', this.fireBus, { level: B * 0.3, len: [5, 9], xf: 1.6, pan: 0.22, spread: 0.1, rate: [0.95, 1.02] });
      for (const b of [this.fireA, this.fireB]) b.onChunk = (off, len, rate, at, xf) => this.marksFrom(b, off, len, rate, at, xf);
      this.fireA.onReady = () => {
        this.real = true;
        this.setParams({ intensity: this.intensity });
      };
      // 장작이 타며 내는 옅은 지글거림: 벽난로 녹음을 아주 작게 깔고, 합성한 지글거림은 물린다
      const sz = s.filter('lowpass', 6500, 0.3);
      sz.connect(dest);
      this.sizzle = this.rec('stove', sz, { level: FireScape.SIZZLE, len: [6, 10], xf: 2.2, spread: 0.4 });
      this.sizzle.onReady = () => glide(this.hiss.pre.gain, 0, 1.2, s.ctx);
    }

    marksFrom(bed, off, len, rate, at, xf) {
      const marks = bed.buf.marks;
      if (!marks) return;
      const ctx = this.snd.ctx;
      const end = at + len / rate;
      const lv = bed.o.level / (bed.o.ref || FireScape.BED);
      const vis = bed.buf.vis;
      for (const m of marks) {
        if (m.t < off || m.t >= off + len) continue;
        const ta = at + (m.t - off) / rate;
        const w = Math.min(1, (ta - at) / xf, (end - ta) / xf);
        const st = m.s * Math.max(0, w) * lv * (this.markGain || 1);
        if (st < vis) continue;
        this.visual.push({ t: MC.clock() + (ta - ctx.currentTime), strength: Math.min(1, 0.3 + (0.55 * (st - vis)) / (1 - vis)) });
      }
      if (this.visual.length > 120) this.visual.splice(0, this.visual.length - 120);
    }

    setParams(p) {
      const now = this.snd.ctx.currentTime;
      const I = Math.min(1.2, p.intensity);
      this.intensity = I;
      this.roar.gain.gain.setTargetAtTime(0.07 + 0.2 * I, now, 0.6);
      this.roar.filters[0].frequency.setTargetAtTime(170 + 360 * I, now, 0.6);
      this.hiss.gain.gain.setTargetAtTime(0.002 + 0.006 * I, now, 0.6);
      // 장작을 넣은 뒤 몇 초는 불이 확 살아난다
      const fl = Math.exp(-Math.max(0, MC.clock() - this.flareAt) / 3.5);
      const B = FireScape.BED;
      this.fireA.setLevel(B * (0.6 + 0.4 * Math.min(1, I / 0.8) + 0.25 * fl));
      this.fireB.setLevel(B * Math.min(0.95, Math.max(0, (I - 0.4) * 1.25) + 0.8 * fl));
      this.fireTone.frequency.setTargetAtTime(2400 + 7000 * Math.min(1, I) + 2500 * fl, now, 0.5);
    }

    schedule() {
      const now = MC.clock();
      const until = now + 1.3;
      const I = this.intensity;
      if (this.real) {
        // 녹음이 타닥이는 동안은 합성한 타닥을 쉬어 둔다
        this.nextCluster = this.nextTick = this.nextPop = until;
      }
      // 타닥타닥: 바삭한 소리가 두세 개에서 대여섯 개씩 묶여 온다
      while (this.nextCluster < until) {
        const t0 = this.nextCluster;
        if (t0 > now - 0.05) {
          const n = 2 + Math.floor(Math.random() * 3.5 * (0.6 + 0.5 * I));
          const loud = Math.pow(Math.random(), 1.5);
          let t = t0;
          for (let i = 0; i < n; i++) {
            const st = loud * MC.rand(0.5, 1);
            this.crack(t, st);
            t += MC.rand(0.03, 0.14);
          }
          if (loud > 0.6) this.visual.push({ t: t0, strength: loud * 0.8 });
        }
        this.nextCluster += -Math.log(1 - Math.random()) / (0.45 + 2 * I);
      }
      // 사이사이 아주 작은 딱딱이가 잔잔히 깔린다
      while (this.nextTick < until) {
        if (this.nextTick > now - 0.05) this.tick(this.nextTick);
        this.nextTick += -Math.log(1 - Math.random()) / (4 + 9 * I);
      }
      // 가끔 크게 '탁!'
      while (this.nextPop < until) {
        if (this.nextPop > now - 0.05) this.pop(this.nextPop);
        this.nextPop += MC.rand(5, 14) / (0.4 + I);
      }
      for (const c of this.crickets) {
        while (c.next < until) {
          if (c.next > now - 0.05 && !this.realCrickets) this.chirp(c, c.next);
          c.next += Math.random() < 0.05 ? MC.rand(3, 9) : MC.rand(0.55, 0.85);
        }
      }
      if (now > this.nextGust) {
        this.wind.gain.gain.setTargetAtTime(0.025 + Math.random() * 0.07, this.snd.ctx.currentTime, 2);
        this.nextGust = now + MC.rand(3, 7);
      }
    }

    // 화면이 불티를 튀길 때 가져가는 '탁' 소리 목록 (때가 된 것만)
    drain() {
      const now = MC.clock();
      if (!this.visual.length) return [];
      const out = [];
      const keep = [];
      for (const e of this.visual) (e.t <= now ? out : keep).push(e);
      this.visual = keep;
      return out;
    }

    // 녹음 속 센 타닥 하나를 골라 바로 들려준다 (불을 톡 건드렸을 때)
    realCrack(bed, peak = 1.2) {
      const marks = bed && bed.ready && bed.buf.marks;
      if (!marks) return false;
      const strong = marks.filter((m) => m.s >= bed.buf.vis);
      const m = strong[(Math.random() * strong.length) | 0];
      const at = this.snd.ctx.currentTime + 0.01;
      const off = Math.max(0, m.t - 0.05);
      bed.voice(at, off, Math.min(1.1, bed.buf.duration - off), MC.rand(0.96, 1.04), 0.01, 0.45, peak, MC.rand(-0.3, 0.3));
      return true;
    }

    // 바삭한 '딱': 아주 짧은 잡음 터짐 + 나무가 울리는 짧은 '톡'
    crack(t, strength) {
      const s = this.snd;
      const ctx = s.ctx;
      const at = Math.max(ctx.currentTime + 0.005, s.toCtx(t));
      const p = s.pan(MC.rand(-0.6, 0.6));
      p.connect(this.crackBus);
      const peak = 0.13 + 0.68 * strength;
      const dur = MC.rand(0.006, 0.02) * (0.8 + strength);
      const src = ctx.createBufferSource();
      src.buffer = s.noise.white;
      const bp = s.filter('bandpass', MC.rand(1600, 4800), MC.rand(0.9, 1.8));
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(peak, at + 0.0006);
      g.gain.exponentialRampToValueAtTime(0.0008, at + dur);
      src.connect(bp);
      bp.connect(g);
      g.connect(p);
      src.start(at, Math.random() * 3.5, dur + 0.03);
      if (Math.random() < 0.55) {
        const f = MC.rand(700, 1900);
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(f, at);
        o.frequency.exponentialRampToValueAtTime(f * 0.8, at + 0.04);
        const og = ctx.createGain();
        og.gain.setValueAtTime(0, at);
        og.gain.linearRampToValueAtTime(peak * 0.18, at + 0.001);
        og.gain.exponentialRampToValueAtTime(0.0005, at + MC.rand(0.02, 0.045));
        o.connect(og);
        og.connect(p);
        o.start(at);
        o.stop(at + 0.06);
      }
    }

    // 지글지글 사이의 아주 작은 딱
    tick(t) {
      const s = this.snd;
      const ctx = s.ctx;
      const at = Math.max(ctx.currentTime + 0.005, s.toCtx(t));
      const src = ctx.createBufferSource();
      src.buffer = s.noise.white;
      const hp = s.filter('highpass', 2800, 0.7);
      const g = ctx.createGain();
      const p = s.pan(MC.rand(-0.7, 0.7));
      const dur = MC.rand(0.002, 0.005);
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(MC.rand(0.03, 0.085), at + 0.0004);
      g.gain.exponentialRampToValueAtTime(0.0005, at + dur);
      src.connect(hp);
      hp.connect(g);
      g.connect(p);
      p.connect(this.crackBus);
      src.start(at, Math.random() * 3.5, dur + 0.02);
    }

    // 크게 '탁!': 낮은 울림과 함께, 뒤따라 작은 소리 몇 개
    pop(t) {
      const s = this.snd;
      const ctx = s.ctx;
      const at = Math.max(ctx.currentTime + 0.005, s.toCtx(t));
      const p = s.pan(MC.rand(-0.4, 0.4));
      p.connect(this.crackBus);
      const src = ctx.createBufferSource();
      src.buffer = s.noise.white;
      const bp = s.filter('bandpass', MC.rand(900, 1600), 1.1);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.75, at + 0.0008);
      g.gain.exponentialRampToValueAtTime(0.001, at + MC.rand(0.03, 0.05));
      src.connect(bp);
      bp.connect(g);
      g.connect(p);
      src.start(at, Math.random() * 3.5, 0.08);
      this.blip(at, p, 150, 70, 0.08, 0.16);
      for (let i = 0; i < 3; i++) this.crack(t + 0.04 + i * MC.rand(0.03, 0.09), MC.rand(0.25, 0.6));
      this.visual.push({ t, strength: 1 });
    }

    chirp(c, t) {
      const s = this.snd;
      const ctx = s.ctx;
      const at = Math.max(ctx.currentTime, s.toCtx(t));
      const o = ctx.createOscillator();
      o.frequency.value = c.f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      const amp = 0.01;
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
      this.blip(at, this.crackBus, 110, 50, 0.35, 0.22);
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
      let t = now + 0.18;
      if (this.real) {
        // 진짜 불이 확 살아나고(두 줄기가 함께 커진다), 녹음 속 타닥 몇 개가 먼저 튄다
        this.flareAt = now;
        this.setParams({ intensity: this.intensity });
        this.realCrack(this.fireB, 1.1);
        setTimeout(() => this.realCrack(this.fireA, 0.9), 350);
        return;
      }
      for (let i = 0; i < 9; i++) {
        this.crack(t, MC.rand(0.35, 0.9));
        t += MC.rand(0.04, 0.22);
      }
    }

    poke() {
      if (this.realCrack(this.fireA)) return;
      const now = MC.clock();
      for (let i = 0; i < 4; i++) this.crack(now + i * MC.rand(0.03, 0.12), MC.rand(0.5, 1));
    }
  }
  // 녹음한 장작불과 풀벌레의 크기 (녹음 파일은 최고점을 -1dBFS 로 맞춰 두었다)
  FireScape.BED = 0.5;
  FireScape.SIZZLE = 0.12;
  FireScape.CRICKETS = 0.05;
  FireScape.layers = [
    { key: 'fire', label: '장작', value: 1 },
    { key: 'crickets', label: '풀벌레', value: 0.45 },
    { key: 'wind', label: '바람', value: 0.5 },
  ];

  // ── 물멍 ────────────────────────────────────────────────
  class WaterScape extends Scape {
    constructor(snd) {
      super(snd, WaterScape.layers);
      this.bed = this.noiseLayer('brown', [['lowpass', 260, 0.5]], 0.17, this.layers.waves);
      this.swell = this.noiseLayer('brown', [['lowpass', 400, 0.6]], 0.05, this.layers.waves);
      this.crash = this.noiseLayer('pink', [['bandpass', 850, 0.4]], 0.0001, this.layers.waves);
      this.fizz = this.noiseLayer('pink', [['highpass', 1600, 0.5], ['lowpass', 6000, 0.5]], 0.0001, this.layers.waves);
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
      // 튜브 위에서 들리는 찰랑임: 물에 떠 있을 때만
      this.lap = this.noiseLayer('pink', [['bandpass', 560, 1.1], ['lowpass', 1500, 0.5]], 0.0001, this.layers.waves);
      this.lapLevel = 0;
      this.nextLap = MC.clock();
      // 먼 바다의 고래: 낮은 노래와 물줄기 숨
      this.deep = snd.gain(1);
      this.deep.connect(this.layers.waves);
      const wsend = snd.gain(0.8);
      this.deep.connect(wsend);
      wsend.connect(snd.verbIn);
      // 진짜 바닷물의 결: 파도가 밀려오고 부서지고 쓸려 가는 때는 화면과 맞춘 그대로 두고,
      // 그 안을 채우는 소리만 녹음으로 바꾼다 (녹음의 크기는 고르게 눌러 두었다)
      const W = WaterScape.SEA;
      this.texture(this.swell, 'sea', W.swell, { len: [6, 10], xf: 2.2 });
      this.texture(this.crash, 'sea', W.crash, { len: [6, 10], xf: 2.2 });
      this.texture(this.fizz, 'sea', W.fizz, { len: [6, 10], xf: 2.2 });
      this.texture(this.lap, 'sea', W.lap, { len: [5, 9], xf: 1.8 });
    }

    setParams(p) {
      this.lapLevel = p.float ? 1 : 0;
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
      // 찰랑, 찰랑: 고르지 않게 튜브를 두드리는 잔물결
      if (now > this.nextLap) {
        const ct = this.snd.ctx.currentTime;
        const on = this.lapLevel > 0;
        this.lap.gain.gain.setTargetAtTime(on ? MC.rand(0.035, 0.1) : 0.0001, ct, on ? 0.16 : 0.6);
        this.nextLap = now + MC.rand(0.45, 1.25);
        if (on && Math.random() < 0.3) {
          const f = MC.rand(700, 1100);
          this.blip(ct + MC.rand(0.05, 0.3), this.dropBus, f, f * 1.7, 0.05, 0.012);
        }
      }
    }

    // 바다에 들어가 튜브에 올라탈 때: 첨벙
    splash() {
      const s = this.snd;
      const ctx = s.ctx;
      const at = ctx.currentTime + 0.01;
      const src = ctx.createBufferSource();
      src.buffer = s.noise.pink;
      const bp = s.filter('bandpass', 1300, 0.7);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.08, at + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.55);
      src.connect(bp);
      bp.connect(g);
      g.connect(this.dropBus);
      src.start(at, Math.random() * 2, 0.6);
      this.blip(at + 0.02, this.dropBus, 300, 540, 0.12, 0.06);
      this.blip(at + 0.16, this.dropBus, 720, 1300, 0.07, 0.022);
    }

    // 유리병이 물에 닿는 소리: 퐁당, 그리고 유리가 살짝 쨍
    bottle() {
      const at = this.snd.ctx.currentTime + 0.01;
      this.blip(at, this.dropBus, 380, 780, 0.1, 0.07);
      this.blip(at + 0.12, this.dropBus, 2600, 2560, 0.26, 0.012, 'triangle');
      this.blip(at + 0.13, this.dropBus, 3900, 3860, 0.2, 0.006);
    }

    // 고래: 멀리서 길게 미끄러지는 노래, 그리고 물줄기를 뿜는 숨
    whale(kind) {
      const s = this.snd;
      const ctx = s.ctx;
      const at = ctx.currentTime + 0.05;
      if (kind === 'song') {
        let t = at;
        for (const [f0, f1, dur] of [[176, 296, 2.6], [262, 205, 3]]) {
          const o = ctx.createOscillator();
          o.frequency.setValueAtTime(f0, t);
          o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.7);
          o.frequency.exponentialRampToValueAtTime(f1 * 0.93, t + dur);
          const vib = ctx.createOscillator();
          vib.frequency.value = 5;
          const vd = ctx.createGain();
          vd.gain.value = f0 * 0.012;
          vib.connect(vd);
          vd.connect(o.frequency);
          const h = ctx.createOscillator();
          h.frequency.setValueAtTime(f0 * 2.01, t);
          h.frequency.exponentialRampToValueAtTime(f1 * 2.01, t + dur * 0.7);
          const hg = ctx.createGain();
          hg.gain.value = 0.22;
          const lp = s.filter('lowpass', 900, 0.7);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.05, t + dur * 0.35);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          o.connect(g);
          h.connect(hg);
          hg.connect(g);
          g.connect(lp);
          lp.connect(this.deep);
          for (const n of [o, vib, h]) {
            n.start(t);
            n.stop(t + dur + 0.05);
          }
          t += dur * 0.85;
        }
      } else if (kind === 'spout') {
        const src = ctx.createBufferSource();
        src.buffer = s.noise.pink;
        const bp = s.filter('bandpass', 650, 0.6);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.05, at + 0.18);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 1.7);
        src.connect(bp);
        bp.connect(g);
        g.connect(this.deep);
        src.start(at, Math.random() * 2, 1.9);
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
      sg.setTargetAtTime(0.07 + 0.4 * amp, t0, 1.2);
      sf.setTargetAtTime(450 + 550 * amp, t0, 1.4);
      cg.setTargetAtTime(0.34 * amp, tb - 0.5, 0.4);
      cg.setTargetAtTime(0.0001, tb + 0.6, 1.1);
      sg.setTargetAtTime(0.06, tb + 0.4, 1.6);
      sf.setTargetAtTime(300, tb + 0.4, 2);
      fg.setTargetAtTime(0.16 * amp, tb + 0.8, 0.7);
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
      const amp = 0.05 + 0.1 * z;
      this.blip(at, p, f, f * 2.1, 0.09, amp);
      this.blip(at + MC.rand(0.11, 0.18), p, f * 1.4, f * 2.6, 0.06, amp * 0.35);
    }
  }
  WaterScape.layers = [
    { key: 'waves', label: '파도', value: 1 },
    { key: 'wind', label: '바람', value: 0.4 },
  ];
  // 녹음한 바닷물을 합성 잡음 대신 넣을 때의 크기 (같은 필터를 지난 잡음과 비슷하게)
  WaterScape.SEA = { swell: 2, crash: 1.4, fizz: 1.4, lap: 1.2 };

  // ── 숲멍 ────────────────────────────────────────────────
  class ForestScape extends Scape {
    constructor(snd) {
      super(snd, ForestScape.layers);
      this.streamBody = this.noiseLayer('brown', [['lowpass', 520, 0.5]], 0.32, this.layers.stream);
      this.streamLo = this.noiseLayer('pink', [['bandpass', 700, 0.5]], 0.32, this.layers.stream);
      this.streamHi = this.noiseLayer('pink', [['bandpass', 1900, 0.8]], 0.07, this.layers.stream);
      this.leaves = this.noiseLayer('pink', [['highpass', 500, 0.5], ['lowpass', 3200, 0.5]], 0.1, this.layers.wind);
      this.bubbleBus = snd.gain(1);
      const bsoft = snd.filter('lowpass', 2200, 0.5);
      const bp = snd.pan(-0.45);
      this.bubbleBus.connect(bsoft);
      bsoft.connect(bp);
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
      // 진짜 계곡물과 새소리. 오면 합성한 물소리와 먼 새 울음은 물러나고,
      // 화면과 맞물린 소리(가까이 내려앉은 오목눈이, 다람쥐, 바람)만 합성으로 남는다
      // 계곡물은 낮고 느리게: 조금 느리게 흘려 물소리를 낮추고, 쉬익거리는 고음은 덜어 낸다
      const st = snd.pan(-0.3);
      st.connect(this.layers.stream);
      const sl = snd.filter('lowpass', 1500, 0.2);
      sl.connect(st);
      this.streamBed = this.rec('stream', sl, { level: ForestScape.STREAM, len: [9, 14], xf: 3.2, rate: [0.68, 0.73] });
      this.streamBed.onReady = () => {
        this.realStream = true;
        for (const L of [this.streamBody, this.streamLo, this.streamHi]) glide(L.pre.gain, 0, 1.2, snd.ctx);
      };
      const bs = snd.gain(0.18);
      bs.connect(snd.verbIn);
      // 바로 곁에서 우는 새는 살짝 눌러, 먼 새와 가까운 새가 고르게 들리게
      const bb = snd.ctx.createDynamicsCompressor();
      bb.threshold.value = -34;
      bb.knee.value = 8;
      bb.ratio.value = 4;
      bb.attack.value = 0.004;
      bb.release.value = 0.25;
      // 크기는 누른 뒤에 정한다 (누르기 전에 줄이면 압축기가 도로 키워 버린다)
      const bv = snd.gain(ForestScape.BIRDS_OUT);
      bb.connect(bv);
      bv.connect(this.layers.birds);
      bv.connect(bs);
      this.birdBed = this.rec('birds', bb, { level: ForestScape.BIRDS, len: [9, 16], xf: 3, rate: [0.98, 1.02] });
      this.birdBed.onReady = () => { this.realBirds = true; };
    }

    setParams(p) {
      this.windLevel = p.wind;
      this.leaves.gain.gain.setTargetAtTime(0.04 + 0.3 * p.wind, this.snd.ctx.currentTime, 0.8);
    }

    schedule() {
      const s = this.snd;
      const now = MC.clock();
      const until = now + 1.3;
      // 계곡물: 작은 물방울 소리를 잔뜩 겹친다 (진짜 계곡물이 오면 쉰다)
      while (this.nextBubble < until) {
        const t = this.nextBubble;
        if (t > now - 0.05 && !this.realStream) {
          const f = MC.rand(320, 1000);
          this.blip(Math.max(s.ctx.currentTime, s.toCtx(t)), this.bubbleBus, f, f * MC.rand(1.3, 1.7), MC.rand(0.04, 0.08), MC.rand(0.01, 0.03));
        }
        this.nextBubble += -Math.log(1 - Math.random()) / 16;
      }
      while (this.nextBird < until) {
        if (this.nextBird > now - 0.05 && !this.realBirds) this.bird(Math.max(s.ctx.currentTime, s.toCtx(this.nextBird)));
        this.nextBird += MC.rand(4, 12);
      }
      if (now > this.nextJitter) {
        const ct = s.ctx.currentTime;
        this.streamLo.gain.gain.setTargetAtTime(0.26 + Math.random() * 0.12, ct, 0.6);
        this.nextJitter = now + MC.rand(0.4, 1.2);
      }
    }

    bird(at) {
      const ctx = this.snd.ctx;
      const p = this.snd.pan(MC.rand(-0.8, 0.8));
      p.connect(this.birdBus);
      const kind = Math.random();
      const amp = MC.rand(0.04, 0.07);
      if (kind < 0.35) {
        // 짹짹 내려가는 짧은 울음
        const n = 3 + ((Math.random() * 3) | 0);
        const f = MC.rand(3000, 3900);
        for (let i = 0; i < n; i++) this.tweet(at + i * MC.rand(0.11, 0.16), p, f * MC.rand(0.96, 1.04), f * 0.7, 0.08, amp);
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
        // 떨리는 트릴: 끊어지는 박자 대신 부드럽게 출렁이는 떨림
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(3500, at);
        o.frequency.linearRampToValueAtTime(2900, at + 0.8);
        const trem = ctx.createOscillator();
        trem.frequency.value = 18;
        const tremDepth = ctx.createGain();
        tremDepth.gain.value = amp * 0.4;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.linearRampToValueAtTime(amp * 0.45, at + 0.12);
        g.gain.linearRampToValueAtTime(amp * 0.35, at + 0.6);
        g.gain.linearRampToValueAtTime(0.0001, at + 0.85);
        trem.connect(tremDepth);
        tremDepth.connect(g.gain);
        o.connect(g);
        g.connect(p);
        for (const n of [o, trem]) {
          n.start(at);
          n.stop(at + 0.9);
        }
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

    // 가까이 내려앉은 오목눈이의 짧은 지저귐
    chirp() {
      const ct = this.snd.ctx.currentTime;
      const p = this.snd.pan(MC.rand(0.1, 0.6));
      p.connect(this.birdBus);
      const f = MC.rand(3400, 4200);
      const n = 2 + ((Math.random() * 3) | 0);
      for (let i = 0; i < n; i++) this.tweet(ct + 0.02 + i * MC.rand(0.08, 0.12), p, f * MC.rand(0.95, 1.05), f * 1.15, 0.06, 0.035);
    }

    // 다람쥐: 짧고 높게 딸깍딸깍
    squirrel() {
      const ct = this.snd.ctx.currentTime;
      for (let i = 0; i < 4; i++) this.blip(ct + 0.02 + i * 0.07, this.birdBus, MC.rand(2600, 3100), MC.rand(2000, 2300), 0.035, 0.02, 'triangle');
    }

    gust() {
      const g = this.leaves.gain.gain;
      const ct = this.snd.ctx.currentTime;
      g.setTargetAtTime(0.38, ct, 0.5);
      g.setTargetAtTime(0.04 + 0.3 * this.windLevel, ct + 1.8, 1.4);
      if (Math.random() < 0.6 && !this.realBirds) this.bird(ct + MC.rand(0.6, 1.5));
    }
  }
  ForestScape.STREAM = 0.36;
  ForestScape.BIRDS = 0.42;
  ForestScape.BIRDS_OUT = 0.55;
  ForestScape.layers = [
    { key: 'stream', label: '계곡물', value: 0.8 },
    { key: 'birds', label: '새소리', value: 0.6 },
    { key: 'wind', label: '바람', value: 0.6 },
  ];

  class MapScape extends Scape {
    constructor(snd) {
      super(snd, MapScape.layers);
      this.wind = this.noiseLayer('pink', [['bandpass', 520, 0.45]], 0.035, this.layers.night);
      this.modulate(this.wind.gain.gain, 0.3, 0.025);
      this.bus = snd.gain(0.5);
      this.bus.connect(this.layers.night);
      this.cricketBus = this.bus; // 풀벌레는 불멍과 같은 방식으로 운다
      const send = snd.gain(0.8);
      this.bus.connect(send);
      send.connect(snd.verbIn);
      const now = MC.clock();
      this.crickets = [
        { next: now + 0.8, f: 4380, pan: -0.6 },
        { next: now + 1.7, f: 4900, pan: 0.5 },
      ];
      this.nextChime = now + 1.5;
      this.pavilion = 0;
      // 마을 들판의 진짜 풀벌레: 조금 멀리, 조금 먹먹하게
      const far = snd.filter('lowpass', 5200, 0.3);
      far.connect(this.layers.night);
      const fs = snd.gain(0.35);
      far.connect(fs);
      fs.connect(snd.verbIn);
      this.cricketBed = this.rec('crickets', far, { level: MapScape.CRICKETS, len: [7, 12], xf: 2.5, spread: 0.7, rate: [0.96, 1.03] });
      this.cricketBed.onReady = () => { this.realCrickets = true; };
      // 눈 내리는 숙소 둘레: 가까이 갈수록 찬 바람이 일고 풀벌레는 잦아든다
      const cold = snd.filter('lowpass', 1100, 0.4);
      cold.connect(this.layers.night);
      this.coldWind = this.rec('wind', cold, { level: 0.001, len: [5, 8], xf: 2.4, spread: 0.5, rate: [0.9, 1.02] });
      this.lodge = 0;
    }

    setParams(p) {
      this.pavilion = p.pavilion || 0;
      const L = p.lodge || 0;
      if (Math.abs(L - this.lodge) > 0.01) {
        this.lodge = L;
        this.coldWind.setLevel(0.001 + MapScape.COLD * L, 1.2);
        this.cricketBed.setLevel(MapScape.CRICKETS * (1 - 0.85 * L), 1.5);
      }
    }

    schedule() {
      const s = this.snd;
      const now = MC.clock();
      const until = now + 1.3;
      for (const c of this.crickets) {
        while (c.next < until) {
          if (c.next > now - 0.05 && !this.realCrickets) FireScape.prototype.chirp.call(this, c, c.next);
          c.next += Math.random() < 0.06 ? MC.rand(3, 9) : MC.rand(0.6, 0.9);
        }
      }
      // 정자 처마의 풍경: 가까울수록 자주, 또렷하게
      if (now > this.nextChime) {
        this.nextChime = now + MC.rand(2.5, 6) / (0.4 + this.pavilion);
        if (Math.random() < 0.25 + 0.75 * this.pavilion) {
          const notes = [1046.5, 1174.7, 1318.5, 1568, 1760];
          const at = s.ctx.currentTime + 0.05;
          const n = 1 + ((Math.random() * 3) | 0);
          for (let i = 0; i < n; i++) {
            const f = notes[(Math.random() * notes.length) | 0];
            const amp = (0.008 + 0.03 * this.pavilion) * MC.rand(0.6, 1);
            for (const [ratio, a, dec] of [[1, 1, 2.6], [2.76, 0.25, 1.1]]) {
              const o = s.ctx.createOscillator();
              o.frequency.value = f * ratio;
              const g = s.ctx.createGain();
              const st = at + i * MC.rand(0.12, 0.3);
              g.gain.setValueAtTime(0.0001, st);
              g.gain.exponentialRampToValueAtTime(amp * a, st + 0.01);
              g.gain.exponentialRampToValueAtTime(0.0001, st + dec);
              o.connect(g);
              g.connect(this.bus);
              o.start(st);
              o.stop(st + dec + 0.05);
            }
          }
        }
      }
    }
  }
  MapScape.COLD = 0.3;
  MapScape.layers = [{ key: 'night', label: '밤', value: 1 }];
  MapScape.CRICKETS = 0.035;

  // ── 텐트 안 ─────────────────────────────────────────────
  // 무쇠 난로 안의 낮은 불 소리와 조금 먹먹한 타닥, 천막 너머로 들리는 모닥불과 풀벌레와 바람,
  // 비를 부르면 천막을 토독토독 두드리는 빗방울과 문가에서 떨어지는 물방울
  class TentScape extends Scape {
    constructor(snd) {
      super(snd, TentScape.layers);
      const s = snd;
      this.draft = this.noiseLayer('brown', [['lowpass', 210, 0.6]], 0.1, this.layers.stove);
      this.modulate(this.draft.gain.gain, 0.8, 0.045);
      this.stoveBus = s.gain(1.8);
      const lp = s.filter('lowpass', 3800, 0.6);
      this.stoveBus.connect(lp);
      lp.connect(this.layers.stove);
      const send = s.gain(0.1);
      this.stoveBus.connect(send);
      send.connect(s.verbIn);
      this.crackBus = this.stoveBus;
      // 천막 너머: 아주 먹먹하게
      this.outBus = s.gain(0.9);
      const olp = s.filter('lowpass', 900, 0.5);
      this.outBus.connect(olp);
      olp.connect(this.layers.outside);
      this.cricketBus = s.gain(0.75);
      const clp = s.filter('lowpass', 2600, 0.5);
      this.cricketBus.connect(clp);
      clp.connect(this.layers.outside);
      this.wind = this.noiseLayer('pink', [['bandpass', 240, 0.6]], 0.09, this.layers.outside);
      this.modulate(this.wind.gain.gain, 0.35, 0.04);
      // 비
      this.rainBed = this.noiseLayer('pink', [['bandpass', 760, 0.45], ['lowpass', 2400, 0.5]], 0, this.layers.rain);
      this.dropBus = s.gain(1);
      const dlp = s.filter('lowpass', 4200, 0.5);
      this.dropBus.connect(dlp);
      dlp.connect(this.layers.rain);
      const dsend = s.gain(0.2);
      this.dropBus.connect(dsend);
      dsend.connect(s.verbIn);
      this.E = 0.72;
      this.rain = 0;
      const now = MC.clock();
      this.nextCluster = now + 0.3;
      this.nextTick = now + 0.2;
      this.nextPop = now + MC.rand(4, 9);
      this.nextOut = now + 0.6;
      this.nextDrop = now;
      this.nextDrip = now + 1;
      this.nextPing = now + MC.rand(6, 14);
      this.crickets = [
        { next: now + 1.4, f: 4300, pan: -0.5 },
        { next: now + 2.3, f: 4740, pan: 0.55 },
      ];
      this.visual = [];
      this.markGain = 0.85;
      // 진짜 장작불: 무쇠 난로 안이라 먹먹하게. 녹음 속 타닥에 맞춰 난로 창에 불티가 튄다
      const sf = s.filter('lowpass', 3200, 0.3);
      sf.connect(this.layers.stove);
      const T = TentScape.LEVELS;
      this.stoveBed = this.rec('stove', sf, { level: T.stove, ref: T.stove, len: [5, 9], xf: 1.6, pan: 0.12, spread: 0.05 });
      this.stoveBed.onChunk = (off, len, rate, at, xf) => FireScape.prototype.marksFrom.call(this, this.stoveBed, off, len, rate, at, xf);
      this.stoveBed.onReady = () => { this.realStove = true; };
      // 천막 너머 모닥불과 풀벌레: 더 멀고 더 먹먹하게
      this.outFire = this.rec('fire', this.outBus, { level: T.outFire, len: [6, 10], xf: 2, pan: -0.35, spread: 0.1 });
      this.outFire.onReady = () => { this.realOut = true; };
      this.cricketBed = this.rec('crickets', this.cricketBus, { level: T.crickets, len: [7, 12], xf: 2.5, spread: 0.6, rate: [0.97, 1.03] });
      this.cricketBed.onReady = () => { this.realCrickets = true; };
      // 진짜 빗소리가 천막 너머로 (천을 두드리는 토독토독은 합성으로 얹는다)
      this.texture(this.rainBed, 'rain', T.rain, { len: [6, 10], xf: 2.2 });
    }

    setParams(p) {
      const now = this.snd.ctx.currentTime;
      this.E = Math.min(1.25, p.stove == null ? this.E : p.stove);
      this.rain = p.rain || 0;
      this.draft.gain.gain.setTargetAtTime(0.13 + 0.19 * this.E, now, 0.8);
      this.rainBed.gain.gain.setTargetAtTime(0.3 * this.rain, now, 1.2);
      this.stoveBed.setLevel(TentScape.LEVELS.stove * (0.4 + 0.6 * this.E));
      // 비가 오면 바깥 모닥불은 잦아든다
      this.outFire.setLevel(TentScape.LEVELS.outFire * (1 - 0.65 * this.rain));
      this.cricketBed.setLevel(TentScape.LEVELS.crickets * (1 - 0.85 * this.rain), 1.5);
    }

    crack(t, st) {
      FireScape.prototype.crack.call(this, t, st);
    }

    tick(t) {
      FireScape.prototype.tick.call(this, t);
    }

    pop(t) {
      FireScape.prototype.pop.call(this, t);
    }

    drain() {
      return FireScape.prototype.drain.call(this);
    }

    schedule() {
      const now = MC.clock();
      const until = now + 1.3;
      const E = this.E;
      const R = this.rain;
      // 진짜 장작불이 오면 합성한 타닥은 쉰다
      if (this.realStove) this.nextCluster = this.nextTick = this.nextPop = until;
      if (this.realOut) this.nextOut = until;
      // 난로 안의 타닥: 모닥불보다 드문드문, 묶음도 작게
      while (this.nextCluster < until) {
        const t0 = this.nextCluster;
        if (t0 > now - 0.05) {
          const n = 1 + Math.floor(Math.random() * 3 * (0.5 + 0.5 * E));
          const loud = Math.pow(Math.random(), 1.6);
          let t = t0;
          for (let i = 0; i < n; i++) {
            this.crack(t, loud * MC.rand(0.4, 0.9));
            t += MC.rand(0.03, 0.13);
          }
          if (loud > 0.5) this.visual.push({ t: t0, strength: loud });
        }
        this.nextCluster += -Math.log(1 - Math.random()) / (0.3 + 1.2 * E);
      }
      while (this.nextTick < until) {
        if (this.nextTick > now - 0.05) this.tick(this.nextTick);
        this.nextTick += -Math.log(1 - Math.random()) / (1.5 + 4 * E);
      }
      while (this.nextPop < until) {
        if (this.nextPop > now - 0.05) this.pop(this.nextPop);
        this.nextPop += MC.rand(9, 22) / (0.4 + E);
      }
      // 천막 너머 모닥불
      while (this.nextOut < until) {
        if (this.nextOut > now - 0.05 && R < 0.9) {
          this.crackBus = this.outBus;
          this.crack(this.nextOut, MC.rand(0.3, 0.9) * (1 - 0.6 * R));
          this.crackBus = this.stoveBus;
        }
        this.nextOut += -Math.log(1 - Math.random()) / 1.8;
      }
      for (const c of this.crickets) {
        while (c.next < until) {
          if (c.next > now - 0.05 && Math.random() > R && !this.realCrickets) FireScape.prototype.chirp.call(this, c, c.next);
          c.next += Math.random() < 0.06 ? MC.rand(3, 9) : MC.rand(0.6, 0.9);
        }
      }
      // 달궈진 무쇠가 '틱'
      if (now > this.nextPing) {
        this.nextPing = now + MC.rand(8, 22);
        this.blip(this.snd.ctx.currentTime + 0.05, this.stoveBus, MC.rand(2300, 3100), MC.rand(2200, 2900), 0.12, 0.02);
      }
      // 비: 토독토독, 가끔 문가에서 똑
      if (R > 0.02) {
        while (this.nextDrop < until) {
          if (this.nextDrop > now - 0.05) this.drop(this.nextDrop, R);
          this.nextDrop += -Math.log(1 - Math.random()) / (10 + 50 * R);
        }
        while (this.nextDrip < until) {
          if (this.nextDrip > now - 0.05) this.drip(this.nextDrip);
          this.nextDrip += MC.rand(0.7, 2.4) / (0.3 + R);
        }
      } else {
        this.nextDrop = until;
        this.nextDrip = until + 1;
      }
    }

    drop(t, R) {
      const s = this.snd;
      const ctx = s.ctx;
      const at = Math.max(ctx.currentTime + 0.005, s.toCtx(t));
      const src = ctx.createBufferSource();
      src.buffer = s.noise.white;
      const bp = s.filter('bandpass', MC.rand(900, 2600), MC.rand(1.2, 2.6));
      const g = ctx.createGain();
      const amp = MC.rand(0.03, 0.11) * (0.55 + 0.45 * R);
      const dur = MC.rand(0.012, 0.035);
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(amp, at + 0.001);
      g.gain.exponentialRampToValueAtTime(0.0003, at + dur);
      const p = s.pan(MC.rand(-0.9, 0.9));
      src.connect(bp);
      bp.connect(g);
      g.connect(p);
      p.connect(this.dropBus);
      src.start(at, Math.random() * 3.5, dur + 0.02);
      // 천이 울리는 낮은 '톡'
      if (Math.random() < 0.3) this.blip(at, p, MC.rand(260, 420), MC.rand(170, 250), 0.05, amp * 0.7);
    }

    drip(t) {
      const s = this.snd;
      const at = Math.max(s.ctx.currentTime + 0.005, s.toCtx(t));
      const p = s.pan(MC.rand(-0.5, 0.1));
      p.connect(this.dropBus);
      this.blip(at, p, MC.rand(760, 1050), MC.rand(400, 520), 0.07, 0.05);
    }

    // 난로에 장작: 무쇠 문이 '철컥', 툭, 그리고 타닥타닥
    log() {
      const s = this.snd;
      const at = s.ctx.currentTime + 0.01;
      this.blip(at, this.stoveBus, 1900, 1700, 0.09, 0.05, 'triangle');
      this.blip(at + 0.22, this.stoveBus, 120, 60, 0.3, 0.2);
      if (this.realStove) {
        setTimeout(() => FireScape.prototype.realCrack.call(this, this.stoveBed, 1.1), 420);
        return;
      }
      const now = MC.clock();
      let t = now + 0.4;
      for (let i = 0; i < 8; i++) {
        this.crack(t, MC.rand(0.35, 0.85));
        t += MC.rand(0.05, 0.22);
      }
    }
  }
  TentScape.layers = [
    { key: 'stove', label: '난로', value: 1 },
    { key: 'outside', label: '바깥', value: 0.7 },
    { key: 'rain', label: '비', value: 0.9 },
  ];
  TentScape.LEVELS = { stove: 3.2, outFire: 0.5, crickets: 0.06, rain: 1 };

  // ── 숙소 ────────────────────────────────────────────────
  // 석유난로 위 주전자가 쉬지 않고 보글보글 (진짜 끓는 물 녹음에 거품 소리가 밀려왔다 잦아든다. 가습기처럼).
  // 김 서린 창 너머로는 눈 내리는 먹먹한 겨울바람, 가끔 처마에서 눈이 툭 떨어진다.
  // 코타츠 속으로 들어가면 모든 소리가 이불에 묻혀 낮고 포근해진다
  class LodgeScape extends Scape {
    constructor(snd) {
      super(snd, LodgeScape.layers);
      const s = snd;
      const ctx = s.ctx;
      const T = LodgeScape.LEVELS;
      // 주전자 → (코타츠 속이면 닫히는) 저역 통과 → 주전자 층. 방 안이라 아주 조금 울린다
      this.kettleLp = s.filter('lowpass', 6500, 0.5);
      this.kettleLp.connect(this.layers.kettle);
      const send = s.gain(0.1);
      this.kettleLp.connect(send);
      send.connect(s.verbIn);
      this.kettleBus = s.gain(1);
      this.kettleBus.connect(this.kettleLp);
      this.kettle = this.rec('kettle', this.kettleBus, { level: T.kettle, len: [5, 8], xf: 1.8, pan: 0.3, spread: 0.06 });
      this.kettle.onReady = () => { this.realKettle = true; };
      // 보글보글: 거품이 밀려왔다 잦아든다 (swell 을 천천히 오르내린다)
      this.swell = s.gain(0.5);
      this.swell.connect(this.kettleBus);
      this.bubbles = this.rec('bubbles', this.swell, { level: T.bubbles, len: [2.2, 3.6], xf: 0.9, pan: 0.34, spread: 0.08, rate: [0.9, 1.04] });
      this.bubbles.onReady = () => { this.realBubbles = true; };
      // 녹음을 못 받으면: 끓는 물의 쉬이 (합성)
      this.simmer = this.noiseLayer('pink', [['bandpass', 900, 0.7]], 0, this.kettleBus);
      // 방 안의 낮은 숨 (따뜻한 공기)
      this.room = this.noiseLayer('brown', [['lowpass', 180, 0.6]], 0.04, this.layers.kettle);
      this.modulate(this.room.gain.gain, 0.3, 0.012);
      // 창 너머 바람: 유리를 사이에 두고 먹먹하게. 센바람이면 조금 열린다
      this.outLp = s.filter('lowpass', 620, 0.5);
      this.outLp.connect(this.layers.outside);
      this.outBus = s.gain(1);
      this.outBus.connect(this.outLp);
      this.wind = this.rec('wind', this.outBus, { level: T.wind, len: [5, 8], xf: 2.4, pan: -0.32, spread: 0.2, rate: [0.88, 1.0] });
      this.wind.onReady = () => { this.realWind = true; glide(this.windSyn.gain.gain, 0, 1.2, ctx); };
      this.windSyn = this.noiseLayer('brown', [['lowpass', 420, 0.6]], 0.1, this.outBus);
      this.modulate(this.windSyn.gain.gain, 0.25, 0.05);
      // 처마에서 눈덩이가 툭 (창 너머라 먹먹하게)
      this.snowLp = s.filter('lowpass', 900, 0.5);
      this.snowLp.connect(this.layers.outside);
      // 코타츠 속: 이불에 묻힌 포근한 숨
      this.quilt = this.noiseLayer('brown', [['lowpass', 240, 0.6]], 0, this.layers.kettle);
      this.inside = 0;
      this.gust = 0;
      const now = MC.clock();
      this.nextSwell = now + 1;
      this.nextBlub = now + 0.2;
      this.nextLid = now + MC.rand(14, 26);
    }

    setParams(p) {
      const ctx = this.snd.ctx;
      const now = ctx.currentTime;
      const T = LodgeScape.LEVELS;
      this.inside = p.inside || 0;
      this.gust = p.gust || 0;
      const I = this.inside;
      const G = this.gust;
      // 코타츠 속이면 주전자도 바람도 이불 너머로
      this.kettleLp.frequency.setTargetAtTime(6500 * Math.pow(800 / 6500, I), now, 0.4);
      this.kettleBus.gain.setTargetAtTime(1 - 0.35 * I, now, 0.4);
      this.outLp.frequency.setTargetAtTime((620 + 520 * G) * (1 - 0.55 * I), now, 0.6);
      this.outBus.gain.setTargetAtTime((0.8 + 0.55 * G) * (1 - 0.45 * I), now, 0.8);
      this.quilt.gain.gain.setTargetAtTime(0.06 * I, now, 0.5);
      this.simmer.gain.gain.setTargetAtTime(this.realKettle ? 0 : 0.05, now, 0.5);
      this.wind.setLevel(T.wind * (0.85 + 0.4 * G), 1.2);
    }

    schedule() {
      const s = this.snd;
      const now = MC.clock();
      const until = now + 1.3;
      // 거품이 밀려왔다 잦아든다: 몇 초마다 다음 크기로 천천히
      if (now > this.nextSwell) {
        const v = Math.random() < 0.25 ? MC.rand(0.75, 1) : MC.rand(0.2, 0.6);
        this.swell.gain.setTargetAtTime(v, s.ctx.currentTime, MC.rand(0.8, 1.6));
        this.nextSwell = now + MC.rand(3, 7);
      }
      // 녹음이 없으면 작은 거품을 합성해 보글보글
      if (this.realKettle && this.realBubbles) this.nextBlub = until;
      while (this.nextBlub < until) {
        if (this.nextBlub > now - 0.05) this.blub(this.nextBlub);
        this.nextBlub += -Math.log(1 - Math.random()) / 6;
      }
      // 이따금 뚜껑이 들썩 '달각' 하고 김이 쉬이
      if (now > this.nextLid) {
        this.nextLid = now + MC.rand(16, 34);
        this.lid(0.5);
      }
    }

    // 합성한 거품 하나: 낮은 데서 '보' 하고 올라가는 짧은 울림
    blub(t) {
      const s = this.snd;
      const at = Math.max(s.ctx.currentTime + 0.005, s.toCtx(t));
      const f = MC.rand(320, 620);
      this.blip(at, this.kettleBus, f, f * MC.rand(1.6, 2.2), MC.rand(0.045, 0.08), MC.rand(0.006, 0.018));
    }

    // 주전자 뚜껑이 '달각', 이어서 김이 쉬이
    lid(amp = 1) {
      const s = this.snd;
      const ctx = s.ctx;
      const at = ctx.currentTime + 0.02;
      this.blip(at, this.kettleBus, 2650, 2450, 0.05, 0.016 * amp, 'triangle');
      this.blip(at + 0.07, this.kettleBus, 2500, 2300, 0.04, 0.01 * amp, 'triangle');
      const src = ctx.createBufferSource();
      src.buffer = s.noise.white;
      const bp = s.filter('bandpass', 4200, 0.8);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at + 0.05);
      g.gain.exponentialRampToValueAtTime(0.022 * amp, at + 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 1.1);
      src.connect(bp);
      bp.connect(g);
      g.connect(this.kettleBus);
      src.start(at, Math.random() * 3, 1.2);
    }

    // 주전자를 톡: 뚜껑이 들썩, 김이 퐁
    puff() {
      this.lid(1);
    }

    // 처마에 쌓인 눈이 툭: 낮고 먹먹한 '풀썩' (창밖으로 눈덩이가 떨어질 때)
    flump() {
      const s = this.snd;
      const ctx = s.ctx;
      const at = ctx.currentTime + 0.02;
      const src = ctx.createBufferSource();
      src.buffer = s.noise.brown;
      const bp = s.filter('lowpass', 420, 0.7);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.16 * (1 - 0.5 * this.inside), at + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
      const p = s.pan(-0.35);
      src.connect(bp);
      bp.connect(g);
      g.connect(p);
      p.connect(this.snowLp);
      src.start(at, Math.random() * 3, 0.6);
    }
  }
  LodgeScape.layers = [
    { key: 'kettle', label: '주전자', value: 1 },
    { key: 'outside', label: '바깥', value: 0.7 },
  ];
  // 녹음의 크기 (README 의 sounds/ 처리 뒤 -1~-2dBFS 봉우리 기준)
  LodgeScape.LEVELS = { kettle: 0.5, bubbles: 0.22, wind: 0.6 };

  MC.Sound = Sound;
  MC.LodgeScape = LodgeScape;
  MC.TentScape = TentScape;
  MC.MapScape = MapScape;
  MC.FireScape = FireScape;
  MC.WaterScape = WaterScape;
  MC.ForestScape = ForestScape;
})(window.MC = window.MC || {});
