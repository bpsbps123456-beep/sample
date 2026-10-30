/* 멍캠프 — 공통 도구와 장면 실행기 */
(function (MC) {
  'use strict';

  MC.rand = (a, b) => a + Math.random() * (b - a);
  MC.clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  MC.lerp = (a, b, t) => a + (b - a) * t;
  MC.smooth = (e0, e1, x) => {
    const t = MC.clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };
  MC.gauss = () => {
    let u = 0;
    while (u === 0) u = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
  };

  // 큰 흔들림 위에 작은 흔들림을 겹친 1/f 형태의 요동(자연의 불꽃·물결·바람이 가진 성질). 대략 -1..1
  MC.fbm = (x) =>
    (Math.sin(x) * 0.5 +
      Math.sin(x * 2.13 + 1.7) * 0.25 +
      Math.sin(x * 4.37 + 0.3) * 0.125 +
      Math.sin(x * 8.71 + 2.2) * 0.0625) / 0.9375;

  // 정수 → 0..1 결정적 난수. 같은 파도 번호는 화면과 소리에서 같은 크기를 갖는다
  MC.hash = (n) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };

  // 시드 고정 난수: 창 크기가 바뀌어도 같은 풍경이 나온다
  MC.rng = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  MC.clock = () => performance.now() / 1000;

  // 물멍의 파도 주기. 10초 = 1분에 6번, 공명 호흡의 리듬과 같다
  MC.WAVE_T = 10;
  MC.waveAmp = (k) => 0.62 + 0.3 * MC.hash(k) + (MC.hash(k + 99) > 0.86 ? 0.22 : 0);

  MC.reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  MC.canvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  };

  // 가운데가 밝고 가장자리로 사라지는 빛 덩어리
  MC.glow = (rgb, size, core = 0.35) => {
    const c = MC.canvas(size, size);
    const g = c.getContext('2d');
    const r = size / 2;
    const grd = g.createRadialGradient(r, r, 0, r, r, r);
    const [R, G, B] = rgb;
    grd.addColorStop(0, `rgba(${R},${G},${B},1)`);
    grd.addColorStop(core, `rgba(${R},${G},${B},0.5)`);
    grd.addColorStop(1, `rgba(${R},${G},${B},0)`);
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    return c;
  };

  MC.mix = (a, b, t) => [
    Math.round(MC.lerp(a[0], b[0], t)),
    Math.round(MC.lerp(a[1], b[1], t)),
    Math.round(MC.lerp(a[2], b[2], t)),
  ];
  MC.rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  MC.roundRect = (g, x, y, w, h, r) => {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  };

  // localStorage는 사생활 보호 모드 등에서 막힐 수 있다. 실패해도 화면은 그대로 동작한다
  MC.store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem('mungcamp.' + key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try { localStorage.setItem('mungcamp.' + key, JSON.stringify(value)); } catch (e) { /* 저장 불가 */ }
    },
    remove(key) {
      try { localStorage.removeItem('mungcamp.' + key); } catch (e) { /* 저장 불가 */ }
    },
  };

  // 장면 하나를 캔버스에 돌리는 루프. 탭이 가려지면 쉬고, 느린 기기에서는 입자 수를 줄인다
  MC.Runner = class {
    constructor(canvas, scene, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.scene = scene;
      this.maxPixels = opts.maxPixels || 2.6e6;
      this.baseQuality = opts.quality || 1;
      this.quality = this.baseQuality;
      this.onFrame = opts.onFrame || null;
      this.running = false;
      this.ema = 1 / 60;
      this.slow = 0;
      this.fast = 0;
      this._loop = this._loop.bind(this);
      this._resize = this.resize.bind(this);
      this.ro = 'ResizeObserver' in window ? new ResizeObserver(this._resize) : null;
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(this.maxPixels / (w * h))));
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.dpr = dpr;
      this.scene.resize(w, h, dpr);
      if (!this.running) this.drawOnce();
    }

    drawOnce() {
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.scene.draw(this.ctx);
    }

    start() {
      if (this.running) return;
      this.running = true;
      if (this.ro) this.ro.observe(this.canvas);
      else window.addEventListener('resize', this._resize);
      this.resize();
      this.last = performance.now();
      this.raf = requestAnimationFrame(this._loop);
    }

    stop() {
      this.running = false;
      cancelAnimationFrame(this.raf);
      if (this.ro) this.ro.disconnect();
      else window.removeEventListener('resize', this._resize);
    }

    _loop(now) {
      if (!this.running) return;
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (dt > 0.1) dt = 0.1; // 탭으로 돌아온 직후의 큰 점프 방지
      this._adapt(dt);
      this.scene.quality = this.quality;
      this.scene.update(dt);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.ctx.globalAlpha = 1;
      this.ctx.globalCompositeOperation = 'source-over';
      this.scene.draw(this.ctx);
      if (this.onFrame) this.onFrame(dt);
      this.raf = requestAnimationFrame(this._loop);
    }

    _adapt(dt) {
      this.ema = this.ema * 0.95 + dt * 0.05;
      if (this.ema > 1 / 40) { this.slow += dt; this.fast = 0; }
      else if (this.ema < 1 / 56) { this.fast += dt; this.slow = 0; }
      else { this.slow = 0; this.fast = 0; }
      if (this.slow > 2) { this.quality = Math.max(0.35, this.quality * 0.8); this.slow = 0; }
      if (this.fast > 6 && this.quality < this.baseQuality) {
        this.quality = Math.min(this.baseQuality, this.quality * 1.1);
        this.fast = 0;
      }
    }
  };
})(window.MC = window.MC || {});
