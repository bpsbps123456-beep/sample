/* 마을 오른쪽의 긴 잔교, 낚시 데크와 작은 나무 보트. */
(function (MC) {
  'use strict';

  const shoreX = y => 2170 + 40 * Math.sin(y * 0.004) + 22 * Math.sin(y * 0.011 + 1);
  const Y = 1041;
  const END = shoreX(Y) + 850;
  const PIER = { x0: shoreX(Y) - 65, x1: END, y0: Y - 40, y1: Y + 40 };
  const DECK = { x0: END - 156, x1: END + 34, y0: Y - 112, y1: Y + 112 };
  const BERTH = { x: END - 350, y: Y + 204 };
  const LAUNCH = { x: BERTH.x + 112, y: BERTH.y - 14 };
  const rect = (r, x, y, inset = 0) => x >= r.x0 + inset && x <= r.x1 - inset && y >= r.y0 + inset && y <= r.y1 - inset;
  const BRANCH = { x0: BERTH.x - 48, x1: BERTH.x + 48, y0: PIER.y1 - 12, y1: BERTH.y + 28 };
  const FISH = [{ name: '전갱이', min: 13, max: 25 }, { name: '고등어', min: 19, max: 36 }, { name: '도미', min: 16, max: 33 }];

  class CampSea {
    constructor(camp) {
      this.camp = camp;
      this.boating = false;
      this.angle = 0;
      this.fishing = null;
      this.catch = null;
      this.onToast = null;
      this.time = 0;
    }

    note(text) { if (this.onToast) this.onToast(text); }

    onDeck(x, y, inset = 0) {
      return rect(PIER, x, y, inset) || rect(DECK, x, y, inset) || rect(BRANCH, x, y, inset);
    }

    canFish() {
      const p = this.camp.pup;
      return !this.boating && rect(DECK, p.x, p.y, 17);
    }

    nearBerth() {
      const p = this.camp.pup;
      return !this.boating && rect(BRANCH, p.x, p.y, 8) && Math.hypot(p.x - BERTH.x, p.y - BERTH.y) < 77;
    }

    canLand() {
      const p = this.camp.pup;
      return this.boating && Math.hypot(p.x - LAUNCH.x, p.y - LAUNCH.y) < 58;
    }

    // 보트는 바다에서만. 잔교의 테두리에도 여유를 두어 뚫고 지나가지 않는다.
    navigable(x, y) {
      return x > shoreX(y) + 68 && x < CampSea.width - 75 && y > 100 && y < 2000 && !this.onDeck(x, y, -38);
    }

    stopFishing(quiet = false) {
      if (!this.fishing) return;
      this.fishing = null;
      if (!quiet) this.note('낚싯대를 거뒀어요.');
    }

    cast() {
      if (!this.canFish()) return false;
      const c = this.camp, p = c.pup;
      c.target = null; c.route = []; c.keys.x = c.keys.y = 0;
      p.setChair(false); p.wake(); p.view = p.restView = 'front'; p.baseTurn = 0.85;
      this.catch = null;
      this.fishing = { stage: 1, remaining: 4 + Math.random() * 4, x: p.x, y: p.y };
      return true;
    }

    reel() {
      if (!this.fishing || !this.canFish()) return false;
      if (this.fishing.stage !== 2) { this.stopFishing(); return false; }
      const fish = FISH[Math.floor(Math.random() * FISH.length)];
      this.catch = { name: fish.name, cm: Math.round(MC.rand(fish.min, fish.max)), until: this.time + 5 };
      this.fishing = null;
      this.camp.pup.addHearts(2);
      this.note(`${this.catch.name} ${this.catch.cm}cm! 잠깐 보고 바다로 돌려보냈어요.`);
      return true;
    }

    board() {
      if (!this.nearBerth()) return false;
      const c = this.camp;
      this.stopFishing(true); this.boating = true; this.angle = 0;
      c.pup.setChair(false); c.pup.wake(); c.pup.x = LAUNCH.x; c.pup.y = LAUNCH.y;
      c.target = null; c.route = []; c.camFree = false;
      this.note('작은 보트에 탔어요. 바다를 톡 하거나 방향키로 노를 저어요.');
      return true;
    }

    land() {
      if (!this.canLand()) return false;
      const c = this.camp;
      this.boating = false;
      c.pup.x = BERTH.x; c.pup.y = BERTH.y;
      c.target = null; c.route = []; c.keys.x = c.keys.y = 0;
      this.note('선착장에 내렸어요.');
      return true;
    }

    returnToBerth() {
      if (!this.boating) return;
      const c = this.camp, p = c.pup;
      // 잔교 위쪽에서 돌아올 때는 동쪽 끝을 돌아 남쪽 선착장으로 온다.
      const east = DECK.x1 + 100;
      const south = BRANCH.y1 + 100;
      const route = [];
      if (p.y < PIER.y0 && p.x < east) {
        const north = Math.min(p.y, DECK.y0 - 90);
        route.push({ x: p.x, y: north }, { x: east, y: north });
        route.push({ x: east, y: south });
      } else if (p.y < south) route.push({ x: p.x, y: south });
      route.push({ x: LAUNCH.x, y: south }, { ...LAUNCH });
      c.route = route; c.target = c.route.shift(); c.camFree = false;
      c.lastDist = Infinity; c.stuck = 0;
    }

    action() {
      if (this.boating) { if (this.canLand()) this.land(); else this.returnToBerth(); }
      else if (this.fishing) this.reel();
      else if (this.canFish()) this.cast();
      else this.board();
    }

    controls() {
      if (this.boating) return { label: this.canLand() ? '선착장에 내리기' : '선착장으로', detail: '작은 보트 · 바다를 톡 하거나 방향키로 노를 저어요', stop: false };
      if (this.canFish()) {
        const stage = this.fishing?.stage || 0;
        return { label: stage === 2 ? '지금 낚아채기!' : stage === 1 ? '찌를 바라보는 중' : '낚싯대 던지기', detail: stage === 2 ? '찌가 움직여요!' : stage === 1 ? '찰랑이는 물결을 보며 잠깐 기다려요' : this.catch && this.catch.until > this.time ? `${this.catch.name} ${this.catch.cm}cm · 바다로 돌려보냈어요` : '낚시 데크 · 이곳에서 낚싯대를 드리워요', stop: !!stage, bite: stage === 2, waiting: stage === 1 };
      }
      if (this.nearBerth()) return { label: '보트 타기', detail: '작은 선착장 · 나무 보트를 타고 바다 한 바퀴', stop: false };
      return null;
    }

    // 땅에서 데크를 톡 하면 잔교 입구와 갈림길을 따라 걸어간다.
    walkRoute(to) {
      const p = this.camp.pup;
      if (this.boating || (!this.onDeck(to.x, to.y) && !this.onDeck(p.x, p.y))) return [to];
      const clear = (a, b) => {
        const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 12);
        for (let i = 0; i <= n; i++) if (!this.camp.walkable(MC.lerp(a.x, b.x, i / (n || 1)), MC.lerp(a.y, b.y, i / (n || 1)))) return false;
        return true;
      };
      if (clear(p, to)) return [to];
      const entrance = { x: PIER.x0 - 55, y: Y };
      const junction = { x: BERTH.x, y: Y };
      const out = [];
      if (rect(DECK, p.x, p.y)) out.push({ x: p.x, y: Y });
      if (rect(BRANCH, p.x, p.y) && p.y > PIER.y1 - 10) out.push(junction);
      if (!this.onDeck(p.x, p.y)) out.push(entrance);
      if (rect(BRANCH, to.x, to.y) && to.y > PIER.y1 - 10) out.push(junction);
      else if (!this.onDeck(to.x, to.y)) out.push(entrance);
      else out.push({ x: to.x, y: Y });
      out.push(to);
      return out;
    }

    update(dt, moving) {
      this.time += dt;
      if (this.fishing) {
        if (moving || !this.canFish()) this.stopFishing(true);
        else {
          this.fishing.remaining -= dt;
          if (this.fishing.remaining <= 0) {
            if (this.fishing.stage === 1) {
              this.fishing.stage = 2; this.fishing.remaining = 3.4;
              this.note('찌가 톡톡! 지금 낚아채 보세요.');
            } else { this.fishing = null; this.note('물고기가 살짝 건드리고 갔어요. 다시 던져 볼까요?'); }
          }
        }
      }
      if (this.boating && moving) {
        const c = this.camp;
        if (c.seaDX || c.seaDY) this.angle = Math.atan2(c.seaDY, c.seaDX);
      }
    }

    build(scale) {
      const x0 = PIER.x0 - 24, y0 = DECK.y0 - 56;
      const w = DECK.x1 - x0 + 30, h = BRANCH.y1 - y0 + 50;
      const canvas = MC.canvas(w * scale, h * scale), g = canvas.getContext('2d');
      g.scale(scale, scale); g.translate(-x0, -y0);
      for (const r of [PIER, BRANCH, DECK]) {
        g.fillStyle = 'rgba(10,31,53,.28)'; g.fillRect(r.x0 + 9, r.y0 + 14, r.x1 - r.x0, r.y1 - r.y0);
        const wood = g.createLinearGradient(0, r.y0, 0, r.y1);
        wood.addColorStop(0, '#c5a17a'); wood.addColorStop(1, '#ac8159');
        g.fillStyle = wood; g.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
        g.strokeStyle = '#705437'; g.lineWidth = 3; g.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
        for (let x = r.x0 + 16; x < r.x1 - 2; x += 17) {
          g.strokeStyle = 'rgba(88,60,38,.43)'; g.lineWidth = 1;
          g.beginPath(); g.moveTo(x, r.y0 + 2); g.lineTo(x, r.y1 - 2); g.stroke();
          g.strokeStyle = 'rgba(248,219,170,.25)';
          g.beginPath(); g.moveTo(x + 5, r.y0 + 10); g.lineTo(x + 6, r.y1 - 12); g.stroke();
          g.fillStyle = '#806243';
          for (const y of [r.y0 + 7, r.y1 - 7]) g.fillRect(x - 6, y, 2, 2);
        }
      }
      // 데크의 작은 통과 구명환. 과한 시설 없이 낡은 바닷가 나무의 느낌.
      g.fillStyle = '#9c7750'; g.strokeStyle = '#62492f'; g.lineWidth = 2;
      MC.roundRect(g, DECK.x0 + 14, DECK.y0 + 17, 33, 23, 5); g.fill(); g.stroke();
      g.strokeStyle = '#e9e0c5'; g.lineWidth = 7;
      g.beginPath(); g.ellipse(DECK.x1 - 18, DECK.y0 + 9, 12, 8, 0, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#d47f59'; g.lineWidth = 4;
      g.beginPath(); g.ellipse(DECK.x1 - 18, DECK.y0 + 9, 12, 8, 0, -.4, .7); g.stroke();
      this.harbor = { canvas, x: x0, y: y0, w, h };
    }

    drawHarbor(g) {
      const h = this.harbor;
      if (h) g.drawImage(h.canvas, h.x, h.y, h.w, h.h);
      const posts = [];
      for (let x = PIER.x0 + 60; x < DECK.x0; x += 140) {
        posts.push([x, PIER.y0, true]);
        if (Math.abs(x - BERTH.x) > 75) posts.push([x, PIER.y1, false]);
      }
      posts.push([DECK.x0 + 8, DECK.y0, true], [DECK.x1 - 8, DECK.y0, true], [DECK.x1 - 8, DECK.y1, true], [DECK.x0 + 8, DECK.y1, false], [BERTH.x - 42, BERTH.y + 24, true]);
      for (const [x, y, light] of posts) {
        g.strokeStyle = '#5f4e3b'; g.lineWidth = 7; g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x, y - (light ? 29 : 12)); g.stroke();
        if (light) {
          g.fillStyle = '#55473b'; MC.roundRect(g, x - 7, y - 40, 14, 15, 3); g.fill();
          g.fillStyle = '#ffdc9a'; g.fillRect(x - 4, y - 37, 8, 9);
          const halo = g.createRadialGradient(x, y - 33, 1, x, y - 33, 30);
          halo.addColorStop(0, 'rgba(255,207,119,.22)'); halo.addColorStop(1, 'rgba(255,207,119,0)');
          g.fillStyle = halo; g.fillRect(x - 30, y - 63, 60, 60);
        }
      }
      // 누구나 자기 보트를 탈 수 있다. 빈 보트 한 척이 항상 선착장을 알려 준다.
      this.drawBoat(g, LAUNCH.x, LAUNCH.y, 0, false, null, .6);
      g.strokeStyle = '#d4bf91'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(BERTH.x + 40, BERTH.y); g.quadraticCurveTo(BERTH.x + 76, BERTH.y + 10, LAUNCH.x - 38, LAUNCH.y); g.stroke();
    }

    drawBoat(g, x, y, angle, moving, pup, alpha = 1) {
      const bob = Math.sin(this.time * 1.7 + x * .02) * 1.7;
      g.save(); g.globalAlpha *= alpha;
      g.translate(x, y + bob);
      if (moving) {
        g.save(); g.scale(1, .65); g.rotate(angle);
        g.strokeStyle = 'rgba(216,242,246,.42)'; g.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const d = (this.time * 55 + i * 28) % 90;
          g.globalAlpha = alpha * (1 - d / 100);
          g.beginPath(); g.ellipse(-65 - d * .5, 0, 10 + d * .3, 23 + d * .2, 0, -.9, .9); g.stroke();
        }
        g.restore();
      }
      g.save(); g.scale(1, .65); g.rotate(angle);
      g.fillStyle = 'rgba(10,29,43,.24)'; g.beginPath(); g.ellipse(1, 10, 71, 37, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#95613f'; g.strokeStyle = '#493b30'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(70, 0); g.bezierCurveTo(24, -48, -49, -43, -61, -20); g.quadraticCurveTo(-71, 0, -61, 20); g.bezierCurveTo(-49, 43, 24, 48, 70, 0); g.fill(); g.stroke();
      g.fillStyle = '#d1b581'; g.beginPath(); g.ellipse(-7, -2, 51, 23, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#94794f'; g.lineWidth = 1;
      for (let x = -42; x < 47; x += 14) { g.beginPath(); g.moveTo(x, -18); g.lineTo(x, 17); g.stroke(); }
      g.fillStyle = '#8d6240'; g.fillRect(-27, -25, 14, 49); g.fillRect(25, -18, 10, 36);
      g.strokeStyle = '#715033'; g.lineWidth = 5; g.lineCap = 'round';
      const row = moving ? Math.sin(this.time * 4) * 19 : 7;
      for (const side of [-1, 1]) {
        g.beginPath(); g.moveTo(-10, side * 18); g.lineTo(-35 + row, side * 66); g.stroke();
        g.strokeStyle = '#bd9963'; g.lineWidth = 9; g.beginPath(); g.moveTo(-35 + row, side * 59); g.lineTo(-40 + row, side * 76); g.stroke();
        g.strokeStyle = '#715033'; g.lineWidth = 5;
      }
      g.restore();
      if (pup) {
        g.save(); g.translate(-x, -y - bob - 12);
        pup.draw(g, this.camp.z * (this.camp.dpr || 1)); g.restore();
        g.strokeStyle = '#b78250'; g.lineWidth = 7;
        g.beginPath(); g.moveTo(-54, 14); g.quadraticCurveTo(1, 32, 55, 12); g.stroke();
      }
      g.restore();
    }

    drawFishing(g, p, stage) {
      if (!stage) return;
      const bx = DECK.x1 + 80, by = p.y + 44;
      const bite = stage === 2;
      const bob = Math.sin(this.time * (bite ? 15 : 2)) * (bite ? 5 : 1.3);
      g.save(); g.strokeStyle = '#c0a67b'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(p.x + 22, p.y - 28); g.quadraticCurveTo(p.x + 58, p.y - 112, p.x + 94, p.y - 94); g.stroke();
      g.strokeStyle = 'rgba(240,230,202,.72)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(p.x + 94, p.y - 94); g.quadraticCurveTo(bx - 8, p.y - 40, bx, by + bob); g.stroke();
      g.strokeStyle = 'rgba(220,247,250,.55)';
      for (let i = 0; i < 2; i++) {
        const phase = (this.time * (bite ? 1.5 : .35) + i * .5) % 1;
        g.globalAlpha *= 1 - phase * .6;
        g.beginPath(); g.ellipse(bx, by + 3, 5 + phase * 18, 2 + phase * 7, 0, 0, Math.PI * 2); g.stroke();
      }
      g.globalAlpha = 1; g.fillStyle = '#f4e9c9'; g.fillRect(bx - 2, by - 10 + bob, 4, 10);
      g.fillStyle = '#eb805a'; g.fillRect(bx - 2, by - 10 + bob, 4, 5);
      if (bite) {
        g.font = '700 32px Dongle, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#ffe3a1'; g.fillText('!', bx, by - 20);
      }
      g.restore();
    }

    drawPup(g, p, st) {
      if (st.bt) this.drawBoat(g, p.x, p.y, (st.ba || 0) * Math.PI / 180, st.w, p);
      else { p.draw(g, this.camp.z * (this.camp.dpr || 1)); this.drawFishing(g, p, st.fs); }
    }
  }

  Object.assign(CampSea, { width: 3700, shoreX, pier: PIER, deck: DECK, berth: BERTH, launch: LAUNCH });
  MC.CampSea = CampSea;
})(window.MC = window.MC || {});
