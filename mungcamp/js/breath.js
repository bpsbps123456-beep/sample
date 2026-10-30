/* 멍캠프 — 호흡 안내 */
(function (MC) {
  'use strict';

  const LOW = 0.56;
  // [단계, 초, 안내 문구, 시작 크기, 끝 크기]
  const PATTERNS = {
    resonance: {
      name: '공명 호흡',
      note: '5초 들이쉬고 5초 내쉬어요. 1분에 6번, 심박변이도가 가장 크게 늘어나는 빠르기예요.',
      steps: [
        ['in', 5, '코로 천천히 들이쉬어요', LOW, 1],
        ['out', 5, '천천히 내쉬어요', 1, LOW],
      ],
    },
    sigh: {
      name: '주기적 한숨',
      note: '코로 깊게 들이쉬고, 한 번 더 짧게 채운 뒤, 입으로 길게 내쉬어요. 내쉬는 숨이 핵심이에요.',
      steps: [
        ['in', 2.5, '코로 깊게 들이쉬고', LOW, 0.9],
        ['top', 1, '한 번 더, 짧게', 0.9, 1],
        ['out', 6, '입으로 길게 내쉬어요', 1, LOW],
      ],
    },
    box: {
      name: '박스 호흡',
      note: '들숨, 멈춤, 날숨, 멈춤을 4초씩. 숫자를 세며 마음을 붙잡아 두기 좋아요.',
      steps: [
        ['in', 4, '들이쉬어요', LOW, 1],
        ['hold', 4, '그대로 멈춰요', 1, 1],
        ['out', 4, '내쉬어요', 1, LOW],
        ['hold0', 4, '비운 채로 멈춰요', LOW, LOW],
      ],
    },
  };

  const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);

  class Breath {
    constructor(root, sound) {
      this.root = root;
      this.ring = root.querySelector('[data-breath-ring]');
      this.label = root.querySelector('[data-breath-label]');
      this.count = root.querySelector('[data-breath-count]');
      this.sound = sound;
      this.pattern = MC.store.get('breath', 'resonance');
      if (!PATTERNS[this.pattern]) this.pattern = 'resonance';
      this.cueOn = MC.store.get('breathCue', true);
      this.active = false;
      this.offset = 0;
      this.lastStep = -1;
      this._frame = this._frame.bind(this);
    }

    static get patterns() {
      return PATTERNS;
    }

    setPattern(name) {
      if (!PATTERNS[name]) return;
      this.pattern = name;
      MC.store.set('breath', name);
      if (this.active) this.start(this.syncOffset);
    }

    setCue(on) {
      this.cueOn = on;
      MC.store.set('breathCue', on);
    }

    // syncOffset: 물멍에서 파도에 맞춰 숨쉬도록 시작 시각을 고정할 때 쓴다
    start(syncOffset) {
      this.syncOffset = syncOffset;
      const usesSync = syncOffset != null && this.pattern === 'resonance';
      this.offset = usesSync ? syncOffset : MC.clock();
      this.active = true;
      this.lastStep = -1;
      this.root.hidden = false;
      cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame(this._frame);
    }

    stop() {
      this.active = false;
      cancelAnimationFrame(this.raf);
      this.root.hidden = true;
    }

    _frame() {
      if (!this.active) return;
      const p = PATTERNS[this.pattern];
      const period = p.steps.reduce((a, s) => a + s[1], 0);
      let t = (MC.clock() - this.offset) % period;
      if (t < 0) t += period;
      let i = 0;
      while (t >= p.steps[i][1]) {
        t -= p.steps[i][1];
        i++;
      }
      const [kind, dur, text, from, to] = p.steps[i];
      const u = t / dur;
      const scale = MC.lerp(from, to, ease(u));
      this.ring.style.transform = `scale(${scale.toFixed(4)})`;
      if (i !== this.lastStep) {
        this.lastStep = i;
        this.label.textContent = text;
        this.root.dataset.phase = kind;
        if (this.cueOn && this.sound && kind !== 'top') this.sound.cue(kind);
      }
      this.count.textContent = String(Math.ceil(dur - t));
      this.raf = requestAnimationFrame(this._frame);
    }
  }

  MC.Breath = Breath;
})(window.MC = window.MC || {});
