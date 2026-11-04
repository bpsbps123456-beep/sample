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

  // 이 세계의 느린 시간: 벽시계를 따르므로 같은 곳의 누구에게나 같고, 다시 와도 이어진다.
  // 낮과 밤은 바뀌지 않는다. 달과 별, 햇살이 아주 천천히 자리를 옮길 뿐이다
  MC.world = () => Date.now() / 1000;
  // minutes 분에 한 번 오가는 느린 흔들림 (-1..1)
  MC.slow = (minutes, phase = 0) => Math.sin((2 * Math.PI * MC.world()) / (minutes * 60) + phase);
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
      MC.frameQuality = this.quality / this.baseQuality; // 다른 사람 멍이를 몇 마리 그릴지도 이걸 따른다
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

  // 별똥별: 천천히 미끄러지며 길고 옅은 꼬리를 끌다가 스르르 사라진다. 지나간 자리엔 작은 반짝임이 잠깐 남고,
  // 가끔은 같은 쪽 하늘에서 한두 개가 뒤따른다 (유성우). 불멍과 물멍이 함께 쓴다
  MC.Meteors = class {
    constructor() {
      this.list = [];
      this.follow = null;
    }

    // x, y: 시작점, dir: 왼쪽(-1)/오른쪽(1), s: 화면 크기 비율, a: 내려가는 각도
    spawn(x, y, dir, s, a = MC.rand(0.3, 0.52), shower = 0) {
      this.list.push({
        x, y, s,
        dx: dir * Math.cos(a),
        dy: Math.sin(a),
        L: MC.rand(230, 360) * s,
        dur: MC.rand(2.8, 3.8),
        t: 0,
        tail: MC.rand(105, 165) * s,
        w: MC.rand(1.15, 1.6) * s,
        dust: [],
      });
      // 같은 쪽에서 한두 개 더
      if (Math.random() < shower) this.follow = { n: Math.random() < 0.4 ? 2 : 1, x, y, dir, a, s, at: MC.rand(3.5, 7) };
    }

    get busy() {
      return this.list.length > 0 || !!this.follow;
    }

    update(dt) {
      const f = this.follow;
      if (f) {
        f.at -= dt;
        if (f.at <= 0) {
          f.n--;
          // 처음 자리에서 조금 비켜서, 거의 같은 방향으로
          this.spawn(f.x + MC.rand(-90, 90) * f.s, f.y + MC.rand(-30, 40) * f.s, f.dir, f.s, f.a + MC.rand(-0.06, 0.06));
          this.follow = f.n > 0 ? Object.assign(f, { at: MC.rand(3, 6) }) : null;
        }
      }
      for (const m of this.list) {
        m.t += dt;
        if (m.t < m.dur * 0.8 && Math.random() < dt * 7) {
          const p = this.pos(m);
          const back = MC.rand(0, m.tail * 0.6);
          m.dust.push({ x: p.x - m.dx * back, y: p.y - m.dy * back + MC.rand(-2, 2) * m.s, t: 0, life: MC.rand(0.7, 1.5), r: MC.rand(0.5, 1.1) * m.s });
        }
        for (const d of m.dust) d.t += dt;
        if (m.dust.length && m.dust[0].t > m.dust[0].life) m.dust = m.dust.filter((d) => d.t < d.life);
      }
      this.list = this.list.filter((m) => m.t < m.dur + 1.6);
    }

    // 거의 고르게, 끝에서만 살짝 느려진다
    pos(m) {
      const u = Math.min(1, m.t / m.dur);
      const p = m.L * (0.78 * u + 0.22 * (1 - (1 - u) * (1 - u)));
      return { x: m.x + m.dx * p, y: m.y + m.dy * p, p, u };
    }

    // sprite: 둥근 빛 그림
    draw(g, sprite) {
      for (const m of this.list) {
        const { x, y, p, u } = this.pos(m);
        const a = m.t < m.dur ? MC.smooth(0, 0.16, u) * (1 - MC.smooth(0.45, 1, u)) : 0;
        if (a > 0.004) {
          // 길고 옅은 잔광, 그 안에 또렷한 꼬리
          const t2 = Math.min(p, m.tail * 2.6);
          const t1 = Math.min(p, m.tail * (0.55 + 0.45 * u));
          g.globalAlpha = 1;
          for (const [len, w, rgb, k] of [[t2, m.w * 3, '190,205,255', 0.13], [t1, m.w, '255,250,238', 0.85]]) {
            const ex = x - m.dx * len;
            const ey = y - m.dy * len;
            const grd = g.createLinearGradient(x, y, ex, ey);
            grd.addColorStop(0, `rgba(${rgb},${k * a})`);
            grd.addColorStop(1, `rgba(${rgb},0)`);
            g.strokeStyle = grd;
            g.lineWidth = w;
            g.lineCap = 'round';
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(ex, ey);
            g.stroke();
          }
          const r = 5.5 * m.s;
          g.globalAlpha = a;
          g.drawImage(sprite, x - r, y - r, r * 2, r * 2);
          g.globalAlpha = 0.3 * a;
          g.drawImage(sprite, x - r * 2.6, y - r * 2.6, r * 5.2, r * 5.2);
        }
        for (const d of m.dust) {
          g.globalAlpha = 0.45 * (1 - d.t / d.life);
          g.drawImage(sprite, d.x - d.r * 2, d.y - d.r * 2, d.r * 4, d.r * 4);
        }
      }
      g.globalAlpha = 1;
      g.lineCap = 'butt';
    }

    // 물 위에 비친 별똥별: 수평선(hy)을 축으로 뒤집고 k 만큼 눌러, 세로로 길쭉하게 일렁이는 옅은 빛
    drawReflection(g, sprite, hy, k) {
      for (const m of this.list) {
        if (m.t >= m.dur) continue;
        const { x, y, u } = this.pos(m);
        const a = MC.smooth(0, 0.16, u) * (1 - MC.smooth(0.45, 1, u));
        if (a < 0.004 || y >= hy) continue;
        const ry = hy + (hy - y) * k;
        const r = 5.5 * m.s;
        g.globalAlpha = 0.18 * a;
        g.drawImage(sprite, x - r * 0.9, ry - r * 2.6, r * 1.8, r * 5.2);
      }
      g.globalAlpha = 1;
    }
  };
})(window.MC = window.MC || {});
