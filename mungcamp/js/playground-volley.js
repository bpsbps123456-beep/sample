/* 놀이터 안의 2인 배구장. 서버 상태 사이를 부드럽게 그린다. */
(function (MC) {
  'use strict';
  const uiText = value => MC.I18n ? MC.I18n.t(value) : value;
  const V = MC.VolleyRules;
  const ellipse = (g, x, y, rx, ry, color) => { g.fillStyle = color; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  class PlaygroundVolley {
    constructor(scene) {
      this.scene = scene; this.pups = [new MC.Pup({}), new MC.Pup({})];
      this.sim = V.create(); this.display = JSON.parse(JSON.stringify(this.sim)); this.axisAt = 0; this.lastAxis = null;
      this.trail = []; this.sparks = [];
      this.controls = document.createElement('div'); this.controls.className = 'volley-controls'; this.controls.hidden = true;
      this.controls.setAttribute('aria-label', '배구 조작');
      this.controls.innerHTML = '<div class="volley-arrows"><button type="button" data-axis="-1" aria-label="배구 왼쪽으로 이동">←</button><button type="button" data-axis="1" aria-label="배구 오른쪽으로 이동">→</button></div><p>← → 이동 · ↑ 또는 Space 점프<span>휴대폰은 버튼을 꾹 눌러요</span></p><button type="button" data-jump>점프 <span>↑</span></button>';
      const held = new Map();
      this.controls.addEventListener('pointerdown', e => {
        const b = e.target.closest('button'); if (!b) return;
        e.preventDefault(); b.setPointerCapture(e.pointerId);
        if (b.hasAttribute('data-axis')) { held.set(e.pointerId, +b.dataset.axis); scene.keys.x = [...held.values()].reduce((a, v) => a + v, 0); }
        else this.jump();
      });
      const release = e => { held.delete(e.pointerId); scene.keys.x = [...held.values()].reduce((a, v) => a + v, 0); };
      this.controls.addEventListener('pointerup', release); this.controls.addEventListener('pointercancel', release);
      this.controls.addEventListener('lostpointercapture', release);
      // 키보드와 보조 기술로도 버튼을 사용할 수 있다.
      this.controls.addEventListener('click', e => { if (!e.detail && e.target.closest('[data-jump]')) this.jump(); });
      document.querySelector('#session').appendChild(this.controls);
    }
    get side() { return this.scene.game?.players.findIndex(p => p.id === this.scene.net.id) ?? -1; }
    accept(s) {
      if (!s) return;
      const total = s.score[0] + s.score[1];
      if (this.scoreTotal != null && total > this.scoreTotal && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const x = s.score[0] > this.sim.score[0] ? 240 : 720;
        for (let i = 0; i < 22; i++) this.sparks.push({ x, y: 270, vx: Math.cos(i * 2.4) * (60 + i * 5), vy: -100 - i * 7, age: 0, color: ['#f5da91', '#e8ab8c', '#b7cda1'][i % 3] });
      }
      if (!total && this.scoreTotal) { this.sparks = []; this.trail = []; }
      this.scoreTotal = total; this.sim = JSON.parse(JSON.stringify(s)); this.received = this.scene.t;
    }
    jump() {
      if (this.side < 0 || this.scene.game?.phase !== 'playing') return;
      if (this.scene.t < (this.jumpAt || 0)) return;
      this.jumpAt = this.scene.t + .18;
      this.scene.command('jump'); this.sim.dogs[this.side].jump = true;
    }
    update(dt) {
      const sc = this.scene, enabled = sc.game?.phase === 'playing' && this.side >= 0;
      this.controls.hidden = !enabled;
      if (enabled) {
        const axis = Math.sign(sc.keys.x);
        if (axis !== this.lastAxis || sc.t > this.axisAt) { sc.command('input', axis); this.axisAt = sc.t + .3; this.lastAxis = axis; }
        this.sim.dogs[this.side].axis = axis;
      } else this.lastAxis = null;
      if (sc.game?.phase === 'playing' && sc.t - (this.received || 0) < .18) {
        let left = dt; while (left > 0) { const step = Math.min(left, 1 / 120); V.step(this.sim, step); left -= step; }
      }
      const k = 1 - Math.exp(-dt * 30);
      for (const key of ['x', 'y']) {
        this.display.ball[key] += (this.sim.ball[key] - this.display.ball[key]) * k;
        this.sim.dogs.forEach((d, i) => { this.display.dogs[i][key] += (d[key] - this.display.dogs[i][key]) * k; });
      }
      this.pups.forEach((p, i) => {
        const id = sc.game?.players[i]?.id, look = id === sc.net.id ? sc.pup : sc.visitors.get(id)?.pup;
        if (look) {
          const ids = [look.coatId, look.hatId, look.hatStyle, look.accessory, look.gloves, look.clothing], signature = ids.join(':');
          if (p.lookSignature !== signature) { p.setLook(...ids); p.lookSignature = signature; }
        }
        p.flip = i ? -1 : 1; p.update(dt, { walking: Math.abs(this.sim.dogs[i].axis) > 0, noSleep: true });
      });
      const layout = this.layout();
      const dog = this.display.dogs[this.side];
      Object.assign(sc.pup, dog ? { x: layout.x + dog.x * layout.z, y: layout.y + dog.y * layout.z, k: .9 * layout.z } : { x: -1000, y: -1000, k: 0 });
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches && sc.t > (this.trailAt || 0)) {
        this.trailAt = sc.t + .03; this.trail.push({ x: this.display.ball.x, y: this.display.ball.y });
        if (this.trail.length > 5) this.trail.shift();
      }
      for (const s of this.sparks) { s.age += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 300 * dt; }
      this.sparks = this.sparks.filter(s => s.age < 1.2);
    }
    layout() {
      const { w, h } = this.scene;
      if (w > 600) {
        const z = Math.max(.15, Math.min((w - 32) / V.width, (h - (h <= 500 ? 150 : 205)) / V.ground, 1.35));
        return { z, x: (w - V.width * z) / 2, y: Math.max(70, (h - V.height * z) / 2) };
      }
      const z = Math.max(.15, Math.min((w - 24) / V.width, (h - 270) / V.height));
      return { z, x: (w - V.width * z) / 2, y: Math.max(235, (h - V.height * z) / 2) };
    }
    draw(g) {
      const sc = this.scene, w = sc.w, h = sc.h;
      const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#88aba4'); sky.addColorStop(.5, '#d9dfbc'); sky.addColorStop(1, '#82936b');
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      MC.PlaygroundArt.surround(g, w, h);
      const { x, y, z } = this.layout();
      if (w <= 600 && y > 260) {
        g.textAlign = 'center'; g.fillStyle = '#466958'; g.font = '23px Jua, sans-serif';
        g.fillText(uiText('숲속 멍이 배구'), w / 2, y - 58);
        g.font = '12px system-ui, sans-serif'; g.fillStyle = '#5c7865';
        g.fillText(uiText('친구와 함께, 한 점씩 즐겁게'), w / 2, y - 34);
      }
      g.save(); g.translate(x, y); g.scale(z, z);
      if (!MC.PlaygroundArt.arena(g)) { g.fillStyle = '#ddcba1'; g.fillRect(10, 295, 940, 196); }
      g.fillStyle = '#4c6451'; g.font = '18px Jua, sans-serif'; g.textAlign = 'center';
      g.fillText(uiText('멍이'), 432, 192); g.fillText(uiText('배구'), 528, 192);
      if (!MC.PlaygroundArt.net(g, V.net, V.netTop - 10)) { g.fillStyle = '#a88455'; g.fillRect(472, V.netTop, 16, V.ground - V.netTop); }
      this.display.dogs.forEach((d, i) => {
        ellipse(g, d.x, V.ground + 5, 37 - (V.ground - d.y) * .07, 8, 'rgba(91,78,46,.18)');
        const p = this.pups[i]; p.x = d.x; p.y = d.y; p.k = .9; p.draw(g, Math.min(2, sc.dpr * z), true);
      });
      const b = this.display.ball;
      this.trail.forEach((pt, i) => ellipse(g, pt.x, pt.y, 4 + i * 1.5, 4 + i * 1.5, `rgba(255,243,203,${i * .045})`));
      ellipse(g, b.x, V.ground + 5, Math.max(6, 16 - (V.ground - b.y) * .025), 4, 'rgba(91,78,46,.18)');
      g.save(); g.translate(b.x, b.y); g.rotate(sc.t * 2.4);
      if (!MC.PlaygroundArt.ball(g, 0, 0, V.radius / 30)) ellipse(g, 0, 0, V.radius, V.radius, '#fff0c4');
      g.restore();
      for (const s of this.sparks) { g.save(); g.globalAlpha = 1 - s.age / 1.2; g.translate(s.x, s.y); g.rotate(s.age * 3 + s.vx); g.fillStyle = s.color; g.fillRect(-2, -4, 4, 8); g.restore(); }
      g.restore();
    }
    destroy() { this.controls.remove(); }
  }
  MC.PlaygroundVolley = PlaygroundVolley;
})(window.MC = window.MC || {});
