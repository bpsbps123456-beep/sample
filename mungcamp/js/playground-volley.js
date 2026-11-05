/* 놀이터 안의 2인 배구장. 서버 상태 사이를 부드럽게 그린다. */
(function (MC) {
  'use strict';
  const V = MC.VolleyRules;
  const ellipse = (g, x, y, rx, ry, color) => { g.fillStyle = color; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  class PlaygroundVolley {
    constructor(scene) {
      this.scene = scene; this.pups = [new MC.Pup({}), new MC.Pup({})];
      this.sim = V.create(); this.display = JSON.parse(JSON.stringify(this.sim)); this.axisAt = 0; this.lastAxis = null;
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
    accept(s) { if (s) { this.sim = JSON.parse(JSON.stringify(s)); this.received = this.scene.t; } }
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
          const ids = [look.coatId, look.hatId, look.hatStyle, look.accessory, look.gloves], signature = ids.join(':');
          if (p.lookSignature !== signature) { p.setLook(...ids); p.lookSignature = signature; }
        }
        p.flip = i ? -1 : 1; p.update(dt, { walking: Math.abs(this.sim.dogs[i].axis) > 0, noSleep: true });
      });
      const layout = this.layout();
      const dog = this.display.dogs[this.side];
      Object.assign(sc.pup, dog ? { x: layout.x + dog.x * layout.z, y: layout.y + dog.y * layout.z, k: .9 * layout.z } : { x: -1000, y: -1000, k: 0 });
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
      const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#b7d4c3'); sky.addColorStop(.55, '#e2e6c1'); sky.addColorStop(1, '#b4bd8c');
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      const { x, y, z } = this.layout();
      g.save(); g.translate(x, y); g.scale(z, z);
      ellipse(g, 805, 75, 44, 44, 'rgba(255,246,198,.62)');
      for (let i = 0; i < 6; i++) {
        const tx = 32 + i * 183;
        MC.PlaygroundArt.obstacle(g, { x: tx, y: 240 + i % 2 * 15, w: 40, h: 45, kind: 'tree' });
      }
      ellipse(g, 480, 460, 479, 69, 'rgba(62,81,44,.12)');
      const sand = g.createLinearGradient(0, 280, 0, 500); sand.addColorStop(0, '#e2d2aa'); sand.addColorStop(1, '#c7b687');
      g.fillStyle = sand; g.beginPath(); g.roundRect(10, 278, 940, 219, 40); g.fill();
      g.strokeStyle = '#f8edce'; g.lineWidth = 3; g.beginPath(); g.moveTo(42, 430); g.lineTo(918, 430); g.lineTo(880, 477); g.lineTo(80, 477); g.closePath(); g.stroke();
      g.strokeStyle = 'rgba(158,137,91,.25)'; g.lineWidth = 1;
      for (let i = 0; i < 130; i++) { const a = MC.hash(i + 8); g.beginPath(); g.moveTo(30 + MC.hash(i) * 900, 310 + a * 160); g.lineTo(32 + MC.hash(i) * 900, 310 + a * 160); g.stroke(); }
      // 네트의 그림자, 테두리와 매듭.
      ellipse(g, 492, 448, 24, 60, 'rgba(84,77,46,.1)');
      g.fillStyle = 'rgba(255,248,220,.26)'; g.fillRect(474, V.netTop, 12, 146);
      g.strokeStyle = 'rgba(111,111,77,.5)'; g.lineWidth = 1;
      for (let yy = V.netTop; yy <= 430; yy += 12) { g.beginPath(); g.moveTo(474, yy); g.lineTo(486, yy); g.stroke(); }
      for (const xx of [474, 480, 486]) { g.beginPath(); g.moveTo(xx, V.netTop); g.lineTo(xx, 430); g.stroke(); }
      g.fillStyle = '#a88455'; g.fillRect(469, 278, 5, 159); g.fillRect(486, 278, 5, 159);
      g.fillStyle = '#fff1ca'; g.fillRect(469, 278, 22, 6);
      this.display.dogs.forEach((d, i) => {
        ellipse(g, d.x, V.ground + 5, 37 - (V.ground - d.y) * .07, 8, 'rgba(91,78,46,.18)');
        const p = this.pups[i]; p.x = d.x; p.y = d.y; p.k = .9; p.draw(g, Math.min(2, sc.dpr * z), true);
      });
      const b = this.display.ball;
      ellipse(g, b.x, V.ground + 5, Math.max(6, 16 - (V.ground - b.y) * .025), 4, 'rgba(91,78,46,.18)');
      g.save(); g.translate(b.x, b.y); g.rotate(sc.t * 2.4);
      const ball = g.createRadialGradient(-6, -8, 1, 0, 0, V.radius); ball.addColorStop(0, '#fffbe5'); ball.addColorStop(1, '#e0bb72');
      ellipse(g, 0, 0, V.radius, V.radius, ball); g.strokeStyle = '#a48453'; g.lineWidth = 1.2; g.stroke();
      g.strokeStyle = '#779e96'; g.lineWidth = 3.5;
      for (let i = 0; i < 3; i++) { g.rotate(Math.PI * 2 / 3); g.beginPath(); g.moveTo(0, -17); g.bezierCurveTo(11, -7, 12, 5, 0, 17); g.stroke(); }
      g.restore();
      g.restore();
    }
    destroy() { this.controls.remove(); }
  }
  MC.PlaygroundVolley = PlaygroundVolley;
})(window.MC = window.MC || {});
