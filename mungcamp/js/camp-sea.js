/* 마을 오른쪽의 긴 잔교, 낚시 데크와 작은 나무 보트. */
(function (MC) {
  'use strict';

  // 잔잔한 두 굽이로 이어지는 해안. 선착장 곁에는 작은 만이 생긴다.
  const shoreX = y => 2170 + 58 * Math.sin(y * 0.0032 + .3) + 25 * Math.sin(y * 0.0071 - .8);
  const Y = 1041;
  const END = shoreX(Y) + 850;
  const PIER = { x0: shoreX(Y) - 65, x1: END, y0: Y - 40, y1: Y + 40 };
  const DECK = { x0: END - 156, x1: END + 34, y0: Y - 112, y1: Y + 112 };
  const BERTH = { x: END - 350, y: Y + 204 };
  const LAUNCH = { x: BERTH.x + 112, y: BERTH.y - 14 };
  const rect = (r, x, y, inset = 0) => x >= r.x0 + inset && x <= r.x1 - inset && y >= r.y0 + inset && y <= r.y1 - inset;
  const BRANCH = { x0: BERTH.x - 48, x1: BERTH.x + 48, y0: PIER.y1 - 12, y1: BERTH.y + 28 };
  const FISH = [{ name: '전갱이', min: 13, max: 25 }, { name: '고등어', min: 19, max: 36 }, { name: '도미', min: 16, max: 33 }];

  function hullPath(g, sx = 1, sy = 1) {
    g.beginPath(); g.moveTo(78 * sx, 0);
    g.bezierCurveTo(40 * sx, -38 * sy, -28 * sx, -44 * sy, -63 * sx, -25 * sy);
    g.quadraticCurveTo(-72 * sx, 0, -63 * sx, 25 * sy);
    g.bezierCurveTo(-28 * sx, 44 * sy, 40 * sx, 38 * sy, 78 * sx, 0);
    g.closePath();
  }

  class CampSea {
    constructor(camp) {
      this.camp = camp;
      this.boating = false;
      this.angle = 0;
      this.fishing = null;
      this.catch = null;
      this.onToast = null;
      this.time = 0;
      this.rowers = new WeakMap();
      this.touches = [];
    }

    note(text) { if (this.onToast) this.onToast(text); }

    poke(x, y) {
      if (x < shoreX(y) + 15 || this.onDeck(x, y, -8)) return false;
      this.touches.push({ x, y, age: 0 });
      if (this.touches.length > 8) this.touches.shift();
      return true;
    }

    drawLife(g, left, top, right, bottom) {
      const t = this.time;
      for (let i = 0; i < 10; i++) {
        const y = 180 + i * 182, x = shoreX(y) + 125 + i % 3 * 170;
        if (x < left - 100 || x > right + 100 || y < top - 60 || y > bottom + 100) continue;
        g.save(); g.globalAlpha = .3; MC.SeaLife.kelp(g, x, y, .45 + i % 2 * .15, t + i); g.restore();
      }
      for (let i = 0; i < 6; i++) {
        const y = 260 + i * 285 + 20 * Math.sin(t * .14 + i), x = shoreX(y) + 220 + i % 3 * 210 + Math.sin(t * .13 + i * 2) * 115;
        if (x < left - 130 || x > right + 130 || y < top - 65 || y > bottom + 65) continue;
        const dir = Math.cos(t * .13 + i * 2) < 0 ? -1 : 1;
        const near = this.touches.find(q => Math.hypot(q.x - x, q.y - y) < 200);
        const dart = near ? Math.sin(Math.min(1, near.age / 1.6) * Math.PI) * 55 : 0;
        g.save(); g.globalAlpha = .55;
        for (let j = 0; j < 6; j++) MC.SeaLife.fish(g, x - j * 18 * dir + dart * dir, y + (j % 3 - 1) * 12 + Math.sin(t + j) * 3, .62, dir, t + j, i % 2 ? '#ace3c8' : '#d6ddad');
        g.restore();
      }
      for (const q of this.touches) {
        g.strokeStyle = `rgba(222,255,244,${.5 * (1 - q.age / 2.5)})`; g.lineWidth = 1.7;
        for (let i = 0; i < 2; i++) { const r = 8 + q.age * 30 + i * 12; g.beginPath(); g.ellipse(q.x, q.y, r, r * .38, 0, 0, Math.PI * 2); g.stroke(); }
      }
    }

    drawGulls(g, left, top, right, bottom) {
      const t = this.time;
      for (let i = 0; i < 3; i++) {
        const y = 640 + i * 360 + Math.sin(t * .13 + i) * 75, x = shoreX(y) + 180 + i * 145 + Math.sin(t * .1 + i) * 210;
        if (x < left - 30 || x > right + 30 || y < top - 30 || y > bottom + 30) continue;
        g.fillStyle = 'rgba(19,65,84,.13)'; g.beginPath(); g.ellipse(x + 12, y + 60, 14, 3, 0, 0, Math.PI * 2); g.fill();
        MC.SeaLife.gull(g, x, y, .8, t + i * 2);
      }
    }

    onDeck(x, y, inset = 0) {
      return rect(PIER, x, y, inset) || rect(DECK, x, y, inset) || rect(BRANCH, x, y, inset);
    }

    canFish() {
      const p = this.camp.pup;
      return this.boating ? !this.camp.moving : rect(DECK, p.x, p.y, 17);
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
      this.stopFishing(true);
      this.boating = false;
      c.pup.x = BERTH.x; c.pup.y = BERTH.y;
      c.target = null; c.route = []; c.keys.x = c.keys.y = 0;
      this.note('선착장에 내렸어요.');
      return true;
    }

    returnToBerth() {
      if (!this.boating) return;
      this.stopFishing(true);
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
      if (this.fishing) this.reel();
      else if (this.canFish()) this.cast();
      else if (!this.boating) this.board();
    }

    travel() {
      if (this.boating) { if (this.canLand()) this.land(); else this.returnToBerth(); }
    }

    controls() {
      const travel = this.boating ? this.canLand() ? '선착장에 내리기' : '선착장으로' : '';
      if (this.boating && this.camp.moving) return { label: '멈추면 낚시 가능', detail: '바다를 톡 하거나 방향키로 노를 저어요', stop: false, waiting: true, travel };
      if (this.canFish()) {
        const stage = this.fishing?.stage || 0;
        return { label: stage === 2 ? '지금 낚아채기!' : stage === 1 ? '찌를 바라보는 중' : '낚싯대 던지기', detail: stage === 2 ? '찌가 움직여요!' : stage === 1 ? '찰랑이는 물결을 보며 잠깐 기다려요' : this.catch && this.catch.until > this.time ? `${this.catch.name} ${this.catch.cm}cm · 바다로 돌려보냈어요` : this.boating ? '보트 낚시 · 움직이면 낚싯대를 거두고 노를 저어요' : '낚시 데크 · 이곳에서 낚싯대를 드리워요', stop: !!stage, bite: stage === 2, waiting: stage === 1, travel };
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
      for (const q of this.touches) q.age += dt;
      this.touches = this.touches.filter(q => q.age < 2.5);
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
      this.drawBoat(g, LAUNCH.x, LAUNCH.y, 0, false, null, .95);
      g.strokeStyle = '#d4bf91'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(BERTH.x + 40, BERTH.y); g.quadraticCurveTo(BERTH.x + 76, BERTH.y + 10, LAUNCH.x - 38, LAUNCH.y); g.stroke();
    }

    // 나무 결과 작은 철물은 고해상도로 한 번만 그려, 여러 보트가 있어도 가볍게 쓴다.
    buildBoatArt() {
      const make = paint => {
        const c = MC.canvas(192 * 3, 112 * 3), o = c.getContext('2d');
        o.scale(3, 3); o.translate(92, 52); o.lineJoin = o.lineCap = 'round';
        paint(o); return c;
      };
      const rim = o => {
        hullPath(o); o.strokeStyle = '#4c382c'; o.lineWidth = 7; o.stroke();
        const varnish = o.createLinearGradient(0, -34, 0, 36);
        varnish.addColorStop(0, '#edd0a0'); varnish.addColorStop(.45, '#c39a68'); varnish.addColorStop(1, '#ac784d');
        o.strokeStyle = varnish; o.lineWidth = 4.6; o.stroke();
        hullPath(o, .965, .91); o.strokeStyle = 'rgba(255,231,186,.67)'; o.lineWidth = .9; o.stroke();
        // 선수의 작은 황동 고리와 양옆 노 받침.
        for (const side of [-1, 1]) {
          o.fillStyle = '#6a5140'; MC.roundRect(o, -6, side * 31 - 3.5, 12, 7, 2); o.fill();
          o.strokeStyle = '#d3b77c'; o.lineWidth = 2.1;
          o.beginPath(); o.ellipse(0, side * 31, 4.2, 3.1, 0, 0, Math.PI * 2); o.stroke();
          o.fillStyle = '#f1d99e'; o.beginPath(); o.arc(-5, side * 31, .9, 0, Math.PI * 2); o.fill();
        }
        o.strokeStyle = '#c9b07c'; o.lineWidth = 2;
        o.beginPath(); o.moveTo(65, -3.5); o.lineTo(69, 0); o.lineTo(65, 3.5); o.stroke();
        o.fillStyle = '#eee0bb'; o.beginPath(); o.arc(67, 0, 1, 0, Math.PI * 2); o.fill();
      };
      this.boatArt = {
        hull: make(o => {
          // 물에 잠기는 아래 선체와 가로로 겹친 판재의 이음매.
          o.save(); o.translate(0, 7); hullPath(o);
          const side = o.createLinearGradient(0, -30, 0, 42);
          side.addColorStop(0, '#a66f49'); side.addColorStop(.6, '#9a6340'); side.addColorStop(1, '#513c30');
          o.fillStyle = side; o.fill(); o.strokeStyle = '#493b32'; o.lineWidth = 2.5; o.stroke();
          for (const inset of [.95, .84]) {
            hullPath(o, .98, inset); o.strokeStyle = '#70492f'; o.lineWidth = 1.2; o.stroke();
          }
          o.restore();
          hullPath(o); o.fillStyle = '#735039'; o.fill();
          hullPath(o, .91, .8); o.fillStyle = '#9a764f'; o.fill();
          // 안쪽 늑재 위에 길게 깐 바닥판. 좁아지는 선수 안쪽까지 잘라 넣는다.
          o.save(); hullPath(o, .87, .73); o.clip();
          const floor = o.createLinearGradient(0, -29, 0, 28);
          floor.addColorStop(0, '#aa8259'); floor.addColorStop(.45, '#d9b88a'); floor.addColorStop(1, '#b38960');
          o.fillStyle = floor; o.fillRect(-75, -35, 150, 70);
          for (let y = -28, row = 0; y <= 28; y += 7, row++) {
            o.strokeStyle = '#8c6949'; o.lineWidth = 1;
            o.beginPath(); o.moveTo(-69, y); o.lineTo(74, y); o.stroke();
            o.strokeStyle = 'rgba(255,231,191,.5)'; o.lineWidth = .6;
            o.beginPath(); o.moveTo(-65, y + 1.3); o.lineTo(70, y + 1.3); o.stroke();
            for (let j = 0; j < 3; j++) {
              const x = -57 + j * 42 + row % 3 * 3;
              o.strokeStyle = 'rgba(115,78,47,.32)'; o.lineWidth = .55;
              o.beginPath(); o.moveTo(x, y + 3);
              o.bezierCurveTo(x + 8, y + 1.6, x + 16, y + 4.8, x + 28, y + 3.2); o.stroke();
            }
          }
          for (const x of [-48, -8, 35, 57]) {
            o.strokeStyle = 'rgba(76,50,32,.28)'; o.lineWidth = 3;
            o.beginPath(); o.moveTo(x, -29); o.quadraticCurveTo(x - 5, 0, x, 29); o.stroke();
            o.strokeStyle = '#e2c399'; o.lineWidth = 1.2; o.stroke();
          }
          // 가는 나무 결 사이에 작은 옹이를 더한다.
          for (const [x, y] of [[-37, 11], [14, -17], [45, 4]]) {
            o.strokeStyle = 'rgba(117,76,44,.42)'; o.lineWidth = .65;
            o.beginPath(); o.ellipse(x, y, 5, 1.1, 0, 0, Math.PI * 2); o.stroke();
          }
          o.restore();
          // 두꺼운 나무 좌석 두 개, 둥근 못 머리와 닳은 모서리.
          for (const [x, width, height] of [[-38, 15, 55], [22, 13, 49]]) {
            o.fillStyle = 'rgba(48,31,21,.26)'; MC.roundRect(o, x - 1, -height / 2 + 3, width + 2, height + 2, 2); o.fill();
            const seat = o.createLinearGradient(x, 0, x + width, 0);
            seat.addColorStop(0, '#b58b5e'); seat.addColorStop(.3, '#e0bb87'); seat.addColorStop(1, '#b38656');
            o.fillStyle = seat; o.strokeStyle = '#7b5539'; o.lineWidth = 1.1;
            MC.roundRect(o, x, -height / 2, width, height, 2); o.fill(); o.stroke();
            o.strokeStyle = 'rgba(114,73,40,.4)'; o.lineWidth = .6;
            o.beginPath(); o.moveTo(x + 6, -height / 2 + 4); o.quadraticCurveTo(x + 9, 0, x + 5, height / 2 - 4); o.stroke();
            for (const y of [-height / 2 + 4, height / 2 - 4]) {
              o.fillStyle = '#71523a'; o.beginPath(); o.arc(x + width / 2, y, 1.25, 0, Math.PI * 2); o.fill();
              o.fillStyle = '#e6d3a6'; o.beginPath(); o.arc(x + width / 2 - .25, y - .35, .55, 0, Math.PI * 2); o.fill();
            }
          }
          // 선수의 삼각 보강판과 단정히 감은 계류 밧줄.
          o.fillStyle = '#ba9163'; o.strokeStyle = '#87603e'; o.lineWidth = 1;
          o.beginPath(); o.moveTo(48, -13); o.lineTo(70, 0); o.lineTo(48, 13); o.closePath(); o.fill(); o.stroke();
          o.strokeStyle = '#7d6547'; o.lineWidth = 2;
          for (let i = 0; i < 4; i++) { o.beginPath(); o.ellipse(52, 0, 8 - i * 1.4, 5 - i * .8, -.18, 0, Math.PI * 2); o.stroke(); }
          o.strokeStyle = '#ead7ad'; o.lineWidth = 1.1;
          for (let i = 0; i < 4; i++) { o.beginPath(); o.ellipse(52, -.5, 8 - i * 1.4, 5 - i * .8, -.18, 0, Math.PI * 2); o.stroke(); }
          o.beginPath(); o.moveTo(58, -3); o.quadraticCurveTo(65, -6, 65, 0); o.stroke();
          rim(o);
        }),
        rim: make(rim),
      };
    }

    drawOar(g, side, stroke, occupied) {
      g.save(); g.translate(0, side * 31); g.rotate(side * stroke * .38);
      g.scale(1, side);
      // 노 받침을 중심으로 한 자루가 회전하고, 끝에는 넓은 노깃이 이어진다.
      g.strokeStyle = '#654730'; g.lineWidth = 4.8;
      g.beginPath(); g.moveTo(0, occupied ? 0 : -18); g.lineTo(0, 57); g.stroke();
      g.strokeStyle = '#d6b483'; g.lineWidth = 2.6; g.stroke();
      g.strokeStyle = '#eed7aa'; g.lineWidth = .7;
      g.beginPath(); g.moveTo(-.7, occupied ? 0 : -15); g.lineTo(-.7, 54); g.stroke();
      const blade = g.createLinearGradient(-7, 0, 7, 0);
      blade.addColorStop(0, '#8b603f'); blade.addColorStop(.45, '#d5b17b'); blade.addColorStop(1, '#aa7c4f');
      g.fillStyle = blade; g.strokeStyle = '#755034'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(-2, 43); g.bezierCurveTo(-6, 47, -8, 61, -7, 72);
      g.quadraticCurveTo(0, 78, 7, 72); g.bezierCurveTo(8, 61, 6, 47, 2, 43); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(102,66,36,.48)'; g.lineWidth = .8;
      for (const x of [-3, 2]) { g.beginPath(); g.moveTo(x * .5, 48); g.quadraticCurveTo(x * 1.6, 61, x, 71); g.stroke(); }
      g.strokeStyle = '#b89c6b'; g.lineWidth = 5.8;
      g.beginPath(); g.moveTo(0, -2.5); g.lineTo(0, 3); g.stroke();
      g.strokeStyle = '#ead4a4'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(-2.6, -1); g.lineTo(2.6, -1); g.moveTo(-2.6, 2); g.lineTo(2.6, 2); g.stroke();
      g.restore();
    }

    rowingRig(pup, angle, moving) {
      let row = this.rowers.get(pup);
      if (!row) { row = {effort: 0, time: this.time}; this.rowers.set(pup, row); }
      const dt = MC.clamp(this.time - row.time, 0, .05);
      row.time = this.time;
      row.effort += ((moving ? 1 : 0) - row.effort) * (1 - Math.exp(-dt * 12));
      const stroke = MC.lerp(-.45, Math.sin(this.time * 3.4), row.effort);
      const project = (x, y) => ({x: x * Math.cos(angle) - y * Math.sin(angle), y: (x * Math.sin(angle) + y * Math.cos(angle)) * .65});
      const hands = [-1, 1].map(side => {
        const swing = side * stroke * .38, length = 18 + 7 * row.effort;
        const grip = project(length * side * Math.sin(swing), side * (31 - length * Math.cos(swing)));
        grip.y -= 24 * row.effort;
        return {lock: project(0, side * 31), grip};
      });
      return {effort: row.effort, stroke, hands};
    }

    drawOarGrips(g, rig, paws) {
      for (const {lock, grip} of rig.hands) {
        g.strokeStyle = '#6b4a30'; g.lineWidth = 4.8; g.lineCap = 'round';
        g.beginPath(); g.moveTo(lock.x, lock.y); g.lineTo(grip.x, grip.y); g.stroke();
        g.strokeStyle = '#d9b983'; g.lineWidth = 2.8; g.stroke();
        g.strokeStyle = '#f1d9a9'; g.lineWidth = .7;
        g.beginPath(); g.moveTo(lock.x - .6, lock.y); g.lineTo(grip.x - .6, grip.y); g.stroke();
        if (paws) {
          const a = Math.atan2(grip.y - lock.y, grip.x - lock.x);
          g.save(); g.translate(grip.x, grip.y); g.rotate(a);
          g.fillStyle = '#fffaf1'; g.strokeStyle = '#5a4031'; g.lineWidth = 1.35;
          g.beginPath(); g.ellipse(-1.2, 0, 4.6, 3.8, .25, 0, Math.PI * 2); g.fill(); g.stroke();
          g.strokeStyle = 'rgba(91,61,44,.48)'; g.lineWidth = .7;
          g.beginPath(); g.moveTo(.6, -1.3); g.lineTo(2.2, -1.1); g.moveTo(.5, 1); g.lineTo(2.1, 1.4); g.stroke();
          g.restore();
        }
      }
    }

    drawBoat(g, x, y, angle, moving, pup, alpha = 1, fishing = 0) {
      if (!this.boatArt) this.buildBoatArt();
      const rig = pup ? this.rowingRig(pup, angle, moving && !fishing) : null;
      const rowing = !fishing && !!rig && rig.effort > .03;
      const bob = Math.sin(this.time * 1.7 + x * .02) * 1.7;
      g.save(); g.globalAlpha *= alpha;
      g.translate(x, y + bob);
      const opacity = g.globalAlpha;
      g.save(); g.scale(1, .65); g.rotate(angle);
      g.fillStyle = 'rgba(10,29,43,.23)'; g.beginPath(); g.ellipse(0, 9, 81, 42, 0, 0, Math.PI * 2); g.fill();
      g.restore();
      if (moving) {
        g.save(); g.scale(1, .65); g.rotate(angle);
        g.strokeStyle = 'rgba(216,242,246,.42)'; g.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const d = (this.time * 55 + i * 28) % 90;
          g.globalAlpha = opacity * (1 - d / 100);
          g.beginPath(); g.ellipse(-65 - d * .5, 0, 10 + d * .3, 23 + d * .2, 0, -.9, .9); g.stroke();
        }
        g.restore();
      }
      g.save(); g.scale(1, .65); g.rotate(angle);
      g.drawImage(this.boatArt.hull, -92, -52, 192, 112);
      for (const side of [-1, 1]) this.drawOar(g, side, rig && !fishing ? rig.stroke : -.45, !!pup && !fishing);
      g.restore();
      if (pup) {
        // 앞발은 몸 가까이서 노 손잡이를 잡는다. 몸과 노는 같은 박자에 앞뒤로 움직인다.
        const back = pup.view === 'back';
        if (back && !fishing) this.drawOarGrips(g, rig, rowing);
        const rock = fishing ? 0 : Math.sin(this.time * 3.4) * rig.effort;
        g.save(); g.translate(Math.cos(angle) * rock, -12 + Math.sin(angle) * rock * .7);
        g.rotate(Math.cos(angle) * rock * .035); g.translate(-x, -y);
        pup.draw(g, this.camp.z * (this.camp.dpr || 1), false, rowing); g.restore();
        if (!back && !fishing) this.drawOarGrips(g, rig, rowing);
        // 배가 돌아도 화면 앞쪽 뱃전만 강아지 발 앞에 겹친다.
        g.save(); g.beginPath(); g.rect(-115, 0, 230, 110); g.clip();
        g.scale(1, .65); g.rotate(angle);
        g.drawImage(this.boatArt.rim, -92, -52, 192, 112); g.restore();
      }
      // 선체를 따라 비치는 가느다란 물빛도 배 방향과 함께 움직인다.
      g.save(); g.scale(1, .65); g.rotate(angle);
      g.strokeStyle = 'rgba(202,230,228,.36)'; g.lineWidth = 1;
      g.beginPath(); g.ellipse(2, 7, 77, 37, 0, .16, 1.18); g.stroke(); g.restore();
      g.restore();
    }

    drawFishing(g, p, stage, boating = false) {
      if (!stage) return;
      const castLeft = boating && !this.navigable(p.x + 150, p.y + 44) && this.navigable(p.x - 150, p.y + 44);
      if (boating) p = {x: p.x, y: p.y - 12 + Math.sin(this.time * 1.7 + p.x * .02) * 1.7};
      const bx = boating ? p.x + 150 : DECK.x1 + 80, by = p.y + 44;
      const bite = stage === 2;
      const bob = Math.sin(this.time * (bite ? 12 : 2)) * (bite ? 3.3 : 1.1);
      const bend = bite ? 9 + Math.sin(this.time * 12) * 2 : Math.sin(this.time * 1.6) * 1.1;
      const point = t => {
        const v = 1 - t;
        return {x: p.x + v ** 3 * 17 + 3 * v * v * t * 43 + 3 * v * t * t * 81 + t ** 3 * 108,
          y: p.y - v ** 3 * 24 - 3 * v * v * t * 85 + 3 * v * t * t * (-123 + bend) + t ** 3 * (-100 + bend)};
      };
      const trace = (from, to) => {
        g.beginPath();
        for (let i = 0; i <= 12; i++) { const q = point(MC.lerp(from, to, i / 12)); if (i) g.lineTo(q.x, q.y); else g.moveTo(q.x, q.y); }
      };
      g.save(); g.lineCap = g.lineJoin = 'round';
      if (castLeft) { g.translate(p.x * 2, 0); g.scale(-1, 1); }
      const opacity = g.globalAlpha;
      // 끝으로 갈수록 가늘어지는 진녹색 낚싯대와 마디의 금색 감김.
      for (let i = 0; i < 8; i++) {
        trace(i / 8, (i + 1) / 8); g.strokeStyle = '#213b39'; g.lineWidth = 3.7 - i * .36; g.stroke();
        g.strokeStyle = '#8eaaa0'; g.lineWidth = Math.max(.45, 1.1 - i * .08); g.stroke();
      }
      for (const t of [.19, .43, .69]) {
        const q = point(t), next = point(t + .005), angle = Math.atan2(next.y - q.y, next.x - q.x);
        g.save(); g.translate(q.x, q.y); g.rotate(angle);
        g.fillStyle = '#d3b272'; g.fillRect(-1.2, -2, 2.4, 4);
        g.strokeStyle = '#6c6953'; g.lineWidth = .55;
        g.beginPath(); g.moveTo(-.4, -2); g.lineTo(-.4, 2); g.moveTo(.6, -2); g.lineTo(.6, 2); g.stroke(); g.restore();
      }
      // 코르크 손잡이, 릴 고정대, 줄이 감긴 둥근 릴과 작은 손잡이.
      const grip = point(0), next = point(.03), gripAngle = Math.atan2(next.y - grip.y, next.x - grip.x);
      g.save(); g.translate(grip.x, grip.y); g.rotate(gripAngle);
      g.strokeStyle = '#65503a'; g.lineWidth = 6.5;
      g.beginPath(); g.moveTo(-12, 0); g.lineTo(9, 0); g.stroke();
      g.strokeStyle = '#d7b985'; g.lineWidth = 4.5; g.stroke();
      g.strokeStyle = 'rgba(112,81,45,.56)'; g.lineWidth = .8;
      for (let i = -9; i < 8; i += 3) { g.beginPath(); g.moveTo(i, -1.7); g.lineTo(i + 1.1, -.2); g.stroke(); }
      g.fillStyle = '#39413a'; g.fillRect(-1, -3, 5, 6);
      g.fillStyle = '#c6c3a4'; g.fillRect(-.7, -3.2, 1, 6.4); g.fillRect(3, -3.2, 1, 6.4);
      g.restore();
      const rx = grip.x + 9, ry = grip.y + 3;
      g.strokeStyle = '#434c46'; g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(grip.x + 1, grip.y); g.lineTo(rx, ry); g.stroke();
      const metal = g.createLinearGradient(rx - 6, ry - 5, rx + 6, ry + 5);
      metal.addColorStop(0, '#ede4bf'); metal.addColorStop(.45, '#929c8b'); metal.addColorStop(1, '#3e504b');
      g.fillStyle = metal; g.strokeStyle = '#37463f'; g.lineWidth = 1.1;
      g.beginPath(); g.ellipse(rx, ry, 6.2, 5.4, -.25, 0, Math.PI * 2); g.fill(); g.stroke();
      g.strokeStyle = '#e5d4a7'; g.lineWidth = .8;
      for (const r of [2.5, 3.6, 4.6]) { g.beginPath(); g.ellipse(rx, ry, r, r * .7, -.25, 0, Math.PI * 2); g.stroke(); }
      g.strokeStyle = '#c0c4ad'; g.lineWidth = 1;
      g.beginPath(); g.ellipse(rx + .8, ry - 1.8, 7, 5, -.35, Math.PI, Math.PI * 2); g.stroke();
      g.strokeStyle = '#4e5d50'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(rx + 4, ry + 1); g.lineTo(rx + 9, ry + 5); g.lineTo(rx + 12, ry + 4); g.stroke();
      g.fillStyle = '#ad8c5b'; g.beginPath(); g.ellipse(rx + 12, ry + 4, 2.5, 1.7, -.4, 0, Math.PI * 2); g.fill();
      // 가이드 고리를 지나는 가는 줄은 끝에서 찌까지 부드럽게 처진다.
      const guides = [.22, .43, .64, .82, 1].map(t => {
        const q = point(t), prev = point(Math.max(0, t - .01));
        return {...q, angle: Math.atan2(q.y - prev.y, q.x - prev.x)};
      });
      g.strokeStyle = 'rgba(226,238,222,.73)'; g.lineWidth = .65;
      g.beginPath(); g.moveTo(rx + 4, ry - 3);
      for (const q of guides) g.lineTo(q.x + 1.7, q.y + 1.3);
      g.quadraticCurveTo(bite ? bx - 10 : bx - 23, p.y - 26, bx, by + bob - 5); g.stroke();
      for (const q of guides) {
        g.save(); g.translate(q.x + 1.7, q.y + 1.3); g.rotate(q.angle);
        g.strokeStyle = '#43564d'; g.lineWidth = 1.5;
        g.beginPath(); g.ellipse(0, 0, 1.3, 2.4, 0, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = '#c6cbb7'; g.lineWidth = .65; g.stroke(); g.restore();
      }
      // 물결, 빨강과 크림색의 찌, 가는 안테나와 흔들리는 반사.
      g.strokeStyle = 'rgba(213,242,240,.63)'; g.lineWidth = .8;
      for (let i = 0; i < 3; i++) {
        const phase = (this.time * (bite ? 1.1 : .28) + i / 3) % 1;
        g.globalAlpha = opacity * (1 - phase) * .7;
        g.beginPath(); g.ellipse(bx, by + 3, 4 + phase * 21, 1.6 + phase * 7, 0, 0, Math.PI * 2); g.stroke();
      }
      g.globalAlpha = opacity * .2; g.fillStyle = '#f4c197';
      g.beginPath(); g.ellipse(bx + 1, by + 9, 2.2, 5, .25, 0, Math.PI * 2); g.fill();
      g.globalAlpha = opacity; g.save(); g.translate(bx, by + bob); g.rotate(bite ? Math.sin(this.time * 12) * .16 : .06);
      g.strokeStyle = '#d8cbb0'; g.lineWidth = .9;
      g.beginPath(); g.moveTo(0, 3); g.lineTo(0, -18); g.stroke();
      g.fillStyle = '#e9dbc1'; g.strokeStyle = '#715b4b'; g.lineWidth = .7;
      g.beginPath(); g.ellipse(0, -5, 3.1, 6.2, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.save(); g.beginPath(); g.rect(-4, -12, 8, 7); g.clip();
      g.fillStyle = '#df795d'; g.beginPath(); g.ellipse(0, -5, 3, 6.2, 0, 0, Math.PI * 2); g.fill(); g.restore();
      g.strokeStyle = '#f2d89b'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(-2.7, -5); g.lineTo(2.7, -5); g.stroke();
      g.fillStyle = '#e88e65'; g.beginPath(); g.arc(0, -17, 1.5, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,249,224,.7)'; g.lineWidth = .7;
      g.beginPath(); g.moveTo(-1, -9); g.lineTo(-1.5, -6); g.stroke(); g.restore();
      if (bite) {
        g.font = '700 32px Dongle, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#ffe3a1'; g.fillText('!', bx, by - 20);
      }
      g.restore();
    }

    drawPup(g, p, st) {
      if (st.bt) {
        this.drawBoat(g, p.x, p.y, (st.ba || 0) * Math.PI / 180, st.w, p, 1, st.fs);
        this.drawFishing(g, p, st.fs, true);
      }
      else { p.draw(g, this.camp.z * (this.camp.dpr || 1)); this.drawFishing(g, p, st.fs); }
    }
  }

  Object.assign(CampSea, { width: 3700, shoreX, pier: PIER, deck: DECK, berth: BERTH, launch: LAUNCH });
  MC.CampSea = CampSea;
})(window.MC = window.MC || {});
