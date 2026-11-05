/* 글램핑 옆 놀이터. 게임 진행은 서버, 움직임과 그림은 각 화면이 맡는다. */
(function (MC) {
  'use strict';
  const R = MC.PlaygroundRules;
  const ell = (g, x, y, rx, ry, color) => {
    g.fillStyle = color; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
  };
  function wood(g, x, y, w, h) {
    g.fillStyle = '#75513b'; g.fillRect(x, y + 5, w, h);
    g.fillStyle = '#c49765'; g.fillRect(x, y, w, h - 5);
    g.strokeStyle = '#8b633f'; g.lineWidth = 2; g.strokeRect(x + 4, y + 4, w - 8, h - 12);
    for (let i = 12; i < h - 5; i += 14) { g.beginPath(); g.moveTo(x + 5, y + i); g.lineTo(x + w - 5, y + i); g.stroke(); }
  }
  function obstacle(g, o) {
    if (MC.PlaygroundArt.obstacle(g, o)) return;
    const { x, y, w, h, kind } = o;
    ell(g, x + w / 2 + 9, y + h, w * .8, 17, 'rgba(30,58,37,.18)');
    if (kind === 'tree') {
      wood(g, x + 11, y - 100, w - 22, h + 100);
      for (const [dx, dy, rx, ry, color] of [[0, -90, 66, 53, '#3e7154'], [-34, -116, 48, 43, '#52825a'], [30, -132, 55, 49, '#639362'], [-5, -157, 49, 43, '#79a26c']])
        ell(g, x + w / 2 + dx, y + dy, rx, ry, color);
      ell(g, x + 7, y - 155, 21, 11, 'rgba(206,221,151,.13)');
    } else if (kind === 'logs') {
      for (let i = 0; i < 3; i++) {
        g.fillStyle = i % 2 ? '#906b48' : '#aa7e52'; g.fillRect(x, y + i * 16 - 10, w, 19);
        ell(g, x + w, y + i * 16, 10, 10, '#d9b780');
        g.strokeStyle = '#a58050'; g.beginPath(); g.arc(x + w, y + i * 16, 6, 0, Math.PI * 2); g.stroke();
      }
    } else {
      wood(g, x, y - 32, w, h + 27);
      g.strokeStyle = '#e0ba84'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(x + 9, y - 23); g.lineTo(x + w - 9, y + h - 15); g.moveTo(x + w - 9, y - 23); g.lineTo(x + 9, y + h - 15); g.stroke();
    }
  }
  function bush(g, b) {
    if (MC.PlaygroundArt.bush(g, b)) return;
    ell(g, b.x + 4, b.y + 14, b.r + 7, b.r * .46, 'rgba(32,62,39,.15)');
    for (const [dx, dy, size, col] of [[-25, 0, .65, '#487453'], [22, -8, .7, '#58865b'], [0, -26, .75, '#6a9965'], [-20, -30, .43, '#80a66f']])
      ell(g, b.x + dx, b.y + dy, b.r * size, b.r * size * .7, col);
    for (let i = 0; i < 5; i++) ell(g, b.x - 30 + i * 16, b.y - 23 - (i % 2) * 11, 2.4, 2.1, '#d9c8a0');
  }
  function meadow(g) {
    const grad = g.createLinearGradient(0, 0, 260, R.height);
    grad.addColorStop(0, '#738b65'); grad.addColorStop(.52, '#91a574'); grad.addColorStop(1, '#b0ba85');
    return grad;
  }
  function ground(g) {
    const rnd = MC.rng(912);
    g.fillStyle = meadow(g); g.fillRect(0, 0, R.width, R.height);
    // 햇살과 잔디의 색 변화를 배경에 한 번만 그린다.
    for (let i = 0; i < 90; i++) {
      const x = rnd() * R.width, y = rnd() * R.height, r = 35 + rnd() * 140;
      const patch = g.createRadialGradient(x, y, 0, x, y, r);
      patch.addColorStop(0, i % 3 ? 'rgba(232,218,157,.12)' : 'rgba(42,77,46,.1)'); patch.addColorStop(1, 'rgba(131,157,98,0)');
      g.fillStyle = patch; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 4000; i++) {
      const x = rnd() * R.width, y = rnd() * R.height, h = 2 + rnd() * 5;
      g.strokeStyle = ['rgba(52,88,48,.2)', 'rgba(224,223,160,.3)', 'rgba(108,131,73,.4)'][i % 3];
      g.lineWidth = .6 + rnd() * .6; g.beginPath();
      g.moveTo(x - 2, y); g.quadraticCurveTo(x - 2, y - h, x - 4, y - h - 1);
      g.moveTo(x, y); g.quadraticCurveTo(x + 1, y - h, x + 4, y - h); g.stroke();
    }
    // 운동장을 완만하게 돌아가는 흙길.
    const path = new Path2D('M700 780C950 785 1195 741 1230 555C1270 340 1210 196 1020 176C790 150 440 140 295 174C115 210 123 424 173 563C245 763 488 784 700 780Z');
    const density = g.getTransform().a;
    const onPath = (x, y) => g.isPointInStroke(path, x * density, y * density);
    g.lineCap = g.lineJoin = 'round';
    for (const [width, color] of [[72, 'rgba(66,81,43,.12)'], [63, '#b1ad7c'], [54, '#c7bb8e'], [37, 'rgba(221,207,160,.5)']]) {
      g.lineWidth = width; g.strokeStyle = color; g.stroke(path);
    }
    g.save(); g.lineWidth = 49;
    // 잔돌은 흙길 위에만 흩뿌린다.
    for (let i = 0; i < 1150; i++) {
      const x = rnd() * R.width, y = rnd() * R.height;
      if (!onPath(x, y)) continue;
      ell(g, x, y, .5 + rnd() * 1.5, .4 + rnd(), i % 3 ? 'rgba(126,113,76,.2)' : 'rgba(252,235,188,.55)');
    }
    g.restore();
    // 모이는 자리: 들꽃을 두른 작은 모래 마당과 발자국.
    ell(g, 700, 780, 236, 76, 'rgba(110,109,68,.12)');
    ell(g, 700, 774, 230, 73, '#d1c299');
    ell(g, 695, 766, 217, 63, 'rgba(231,215,170,.32)');
    for (let i = 0; i < 200; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd());
      ell(g, 700 + Math.cos(a) * 216 * r, 774 + Math.sin(a) * 63 * r, .6 + rnd(), .5, 'rgba(145,121,79,.24)');
    }
    for (let i = 0; i < 4; i++) {
      const x = 651 + i * 31, y = 802 - i * 8;
      ell(g, x, y, 4, 3, 'rgba(119,102,68,.15)');
      for (const [dx, dy] of [[-4, -4], [0, -6], [4, -4]]) ell(g, x + dx, y + dy, 1.5, 1.8, 'rgba(119,102,68,.15)');
    }
    for (let i = 0; i < 130; i++) {
      const x = rnd() * 1320 + 40, y = rnd() * 770 + 90;
      if (onPath(x, y) || Math.hypot((x - 700) / 3, y - 780) < 78) continue;
      g.strokeStyle = '#799057'; g.lineWidth = .8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 1, y - 5); g.stroke();
      for (let j = 0; j < 5; j++) ell(g, x + Math.cos(j * 1.256) * 2.3, y - 6 + Math.sin(j * 1.256) * 1.7, 1.8, 1.2, '#e6e0b6');
      ell(g, x, y - 6, 1.2, 1, '#bd9d5e');
    }
    // 나뭇결, 마구리와 못이 있는 낮은 목책. 입구 쪽은 열어 둔다.
    const fence = (x, y, length, side) => {
      g.save(); g.translate(x, y); if (side) g.rotate(Math.PI / 2);
      ell(g, length / 2 + 10, 50, length / 2 + 15, 13, 'rgba(45,63,36,.14)');
      for (const yy of [15, 39]) {
        const rail = g.createLinearGradient(0, yy, 0, yy + 11);
        rail.addColorStop(0, '#cbb17d'); rail.addColorStop(.3, '#b19566'); rail.addColorStop(1, '#92764e');
        g.fillStyle = rail; g.fillRect(0, yy, length, 10);
        g.fillStyle = 'rgba(252,226,170,.35)'; g.fillRect(0, yy, length, 1);
        g.strokeStyle = 'rgba(94,71,41,.22)'; g.lineWidth = .65;
        g.beginPath(); g.moveTo(0, yy + 6); g.bezierCurveTo(length * .3, yy + 3, length * .7, yy + 8, length, yy + 5); g.stroke();
      }
      for (let xx = 0; xx <= length; xx += 65) {
        g.beginPath(); g.moveTo(xx - 5, 57); g.lineTo(xx - 5, 3); g.lineTo(xx, -2); g.lineTo(xx + 6, 3); g.lineTo(xx + 6, 57); g.closePath();
        const post = g.createLinearGradient(xx - 5, 0, xx + 6, 0);
        post.addColorStop(0, '#c9ae7b'); post.addColorStop(.4, '#b29664'); post.addColorStop(1, '#8e724c');
        g.fillStyle = post; g.fill(); g.strokeStyle = 'rgba(83,65,39,.55)'; g.lineWidth = .8; g.stroke();
        g.strokeStyle = 'rgba(243,219,164,.5)'; g.beginPath(); g.moveTo(xx - 2.5, 7); g.lineTo(xx - 2.5, 52); g.stroke();
        for (const yy of [19, 43]) { ell(g, xx + 1, yy + .8, 1.4, 1.1, '#6e6048'); ell(g, xx + .7, yy, .8, .6, '#c7c1a2'); }
      }
      g.restore();
    };
    fence(45, 34, 1310, false);
    // 옆 울타리는 걸을 수 있는 경계 바깥에 둔다.
    fence(1391, 94, 715, true); fence(51, 94, 715, true);
    g.strokeStyle = 'rgba(60,65,43,.7)'; g.lineWidth = 1.7;
    g.beginPath(); g.moveTo(85, 25); g.quadraticCurveTo(700, 109, 1315, 25); g.stroke();
    for (let i = 0; i < 25; i++) {
      const x = 100 + i * 50, t = (x - 85) / 1230, y = 25 + 168 * t * (1 - t);
      g.save(); g.translate(x, y); g.rotate((.5 - t) * .22);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(25, 0); g.lineTo(13, 30); g.closePath();
      const cloth = g.createLinearGradient(0, 0, 24, 18);
      cloth.addColorStop(0, ['#e9c4a1', '#e7d6a0', '#bfd0a4'][i % 3]); cloth.addColorStop(1, ['#bc886e', '#c2ac70', '#8fa77d'][i % 3]);
      g.fillStyle = cloth; g.fill(); g.strokeStyle = 'rgba(97,83,48,.38)'; g.lineWidth = .8; g.stroke();
      g.strokeStyle = 'rgba(255,242,200,.5)'; g.setLineDash([1, 2]); g.beginPath(); g.moveTo(4, 3); g.lineTo(13, 25); g.lineTo(22, 3); g.stroke(); g.setLineDash([]);
      g.restore();
    }
    g.fillStyle = '#79754e'; g.font = '18px Jua, sans-serif'; g.textAlign = 'center'; g.fillText('친구들이 모이는 자리', 700, 868);
  }

  class PlaygroundScene {
    constructor({ net }) {
      this.net = net;
      this.player = R.spawn(Math.floor(Math.random() * 12));
      this.pup = new MC.Pup({ outfit: 'beanie' });
      this.keys = { x: 0, y: 0 };
      this.target = null;
      this.hidden = false;
      this.moving = false;
      this.visitors = new Map();
      this.round = -1;
      this.t = 0;
      this.uiAt = 0;
      this.game = null;
      this.net.playground = null;
      this.net.onPlayground = m => {
        if (m.t === 'pg') {
          if (m.round !== this.round) { this.round = m.round; this.hidden = false; this.target = null; }
          if (m.mode !== this.game?.mode) {
            this.keys = { x: 0, y: 0 };
            if (m.mode === 'volley' && !m.volley) this.volley.accept(MC.VolleyRules.create());
          }
          this.game = m; this.volley.accept(m.volley); this.offset = m.now - Date.now(); this.renderPanel(true);
        }
        else if (m.t === 'pg-position') { Object.assign(this.player, { x: m.x, y: m.y }); this.target = null; }
        else if (m.t === 'pg-error' && this.onToast) this.onToast(m.message);
        else if (m.t === 'pg-offline') { this.game = null; this.hidden = false; this.renderPanel(true); }
      };
      this.crowd = {
        pup: this.pup, visitors: this.visitors,
        state: () => ({ p: 'playground', x: this.player.x, y: this.player.y, w: +this.moving, f: this.pup.flip, b: +(this.keys.y < 0), hd: +this.hidden }),
        sync: people => this.sync(people),
        setKeys: (x, y) => { if (this.game?.mode === 'volley' && y < 0 && this.keys.y >= 0) this.volley.jump(); this.keys = { x, y }; if (x || y) { this.target = null; this.hidden = false; } },
        hitVisitor: () => null, boopAt: () => false,
      };
      this.volley = new MC.PlaygroundVolley(this);
      this.buildPanel();
    }
    command(action, value) {
      if (!this.net.online || !this.net.link?.game || !this.game) {
        if (this.onToast) this.onToast('친구와 연결되면 놀이에 참가할 수 있어요');
        return;
      }
      this.net.link.game(action, value);
    }
    buildPanel() {
      const panel = this.panel = document.createElement('section');
      panel.className = 'playground-panel'; panel.setAttribute('aria-label', '놀이터 놀이');
      panel.innerHTML = '<div class="pg-heading"><span>글램핑 옆 작은 운동장</span><h2>멍이 놀이터 <span aria-hidden="true">⚑</span></h2></div>' +
        '<div class="pg-modes" role="group" aria-label="놀이 고르기"><button type="button" data-mode="tag">술래잡기</button><button type="button" data-mode="hide">숨바꼭질</button><button type="button" data-mode="volley">멍이 배구</button></div>' +
        '<p class="pg-status" role="status" aria-live="polite"></p><div class="pg-friends"></div>' +
        '<div class="pg-buttons"><button type="button" data-pg="join">참가</button><button type="button" data-pg="start">함께 시작</button><button type="button" data-pg="leave">참가 취소</button></div>' +
        '<details><summary>놀이 방법</summary><p class="pg-instructions"></p></details>';
      panel.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        this.keys = { x: 0, y: 0 };
        if (b.dataset.mode) this.command('mode', b.dataset.mode);
        else this.command(b.dataset.pg);
      });
      document.querySelector('#session').appendChild(panel);
      this.scoreboard = document.createElement('div'); this.scoreboard.className = 'pg-scoreboard'; this.scoreboard.hidden = true;
      this.scoreboard.setAttribute('role', 'status'); this.scoreboard.setAttribute('aria-live', 'polite');
      this.scoreboard.innerHTML = '<span class="pg-side-name"></span><strong>0 : 0</strong><span class="pg-side-name"></span>';
      document.querySelector('#session').appendChild(this.scoreboard);
      this.renderPanel(true);
    }
    renderPanel(force) {
      if (!force && this.t < this.uiAt) return;
      this.uiAt = this.t + .2;
      const game = this.game, me = game?.players.find(p => p.id === this.net.id);
      const idle = !game || game.phase === 'lobby' || game.phase === 'ended';
      const host = game?.host === this.net.id;
      const sec = game ? Math.max(0, Math.ceil((game.until - Date.now() - (this.offset || 0)) / 1000)) : 0;
      const seeker = game?.seeker === this.net.id;
      const volley = game?.mode === 'volley';
      let status;
      if (!game || !this.net.online) status = this.net.kind === 'socket' ? '친구들과 연결하고 있어요…' : '지금은 혼자 산책 중 · 함께 모이기 서버에서 친구와 놀 수 있어요';
      else if (game.phase === 'ended') status = game.result;
      else if (idle) status = volley ? `참가 ${game.players.length}/2 · 두 멍이가 모이면 배구를 시작해요` : `참가 ${game.players.length}/12 · 두 멍이 이상 모이면 시작해요`;
      else if (volley) status = game.phase === 'ready' ? `${sec}초 뒤 서브! · 먼저 5점을 얻으면 이겨요` : !me ? '친구들의 배구를 구경하고 있어요 · 다음 판에 만나요' : game.volley?.pause > 0 ? '득점! 잠시 뒤 다음 서브를 시작해요' : `${this.volley.side === 0 ? '왼쪽' : '오른쪽'} 코트가 내 자리 · 점프해서 공을 받아요!`;
      else if (!me) status = `친구들이 노는 중 · ${sec}초 · 다음 판에 참가해요`;
      else if (me.caught) status = `잡혔어요! 친구들을 응원해요 · ${sec}초`;
      else if (game.phase === 'ready') status = `${seeker ? '나는 술래! 잠깐 눈을 감아요' : game.mode === 'hide' ? '나는 숨는 멍이 · 얼른 숨어요!' : '나는 도망가는 멍이 · 먼저 출발!'} · ${sec}초`;
      else status = `${seeker ? '나는 술래 · 가까이 가서 잡기!' : this.hidden ? '덤불에 숨었어요 · 움직이면 보여요' : '술래를 피해 달려요!'} · ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
      const statusEl = this.panel.querySelector('.pg-status');
      if (statusEl.textContent !== status) statusEl.textContent = status;
      this.panel.classList.toggle('is-playing', !idle);
      this.panel.dataset.mode = game?.mode || 'tag';
      document.querySelector('#session').classList.toggle('is-volley', volley);
      document.querySelector('#session').classList.toggle('volley-waiting', volley && idle);
      const instructions = volley ? '두 멍이가 한 편씩 맡아요. ← → 또는 A·D로 이동하고, ↑·W·Space로 점프해요. 휴대폰에서는 이동 버튼을 꾹 누르며 점프를 함께 누를 수 있어요. 몸에 닿은 공은 자동으로 튀어 올라요. 상대 코트 바닥에 공을 떨어뜨려 먼저 5점을 얻으면 이겨요.' : '방향키·WASD 또는 땅을 톡 눌러 이동해요. 처음 참가한 멍이가 놀이를 고르고 시작해요. 술래는 가까이 가서 ‘잡기’ 또는 Space! 숨바꼭질에서는 덤불 안의 ‘숨기’ 또는 Space로 숨어요. 걸으면 다시 보여요. 잡힌 멍이는 그 자리에서 친구들을 응원해요.';
      const help = this.panel.querySelector('.pg-instructions'); if (help.textContent !== instructions) help.textContent = instructions;
      this.scoreboard.hidden = !volley;
      const score = game?.volley?.score || [0, 0], names = this.scoreboard.querySelectorAll('.pg-side-name');
      names.forEach((el, i) => { const name = game?.players[i]?.n || (i ? '오른쪽 멍이' : '왼쪽 멍이'); if (el.textContent !== name) el.textContent = name; });
      const scoreEl = this.scoreboard.querySelector('strong'), scoreText = `${score[0]} : ${score[1]}`;
      if (scoreEl.textContent !== scoreText) scoreEl.textContent = scoreText;
      for (const b of this.panel.querySelectorAll('[data-mode]')) {
        b.setAttribute('aria-pressed', String((game?.mode || 'tag') === b.dataset.mode));
        b.disabled = !host || !idle || b.dataset.mode === 'volley' && game.players.length > 2;
      }
      const join = this.panel.querySelector('[data-pg="join"]');
      join.hidden = !!me || !idle; join.disabled = !game || !this.net.online || game.players.length >= (volley ? 2 : 12);
      const start = this.panel.querySelector('[data-pg="start"]');
      start.hidden = !host || !idle; start.disabled = !game || game.players.length < 2;
      start.textContent = game?.phase === 'ended' ? '한 판 더' : '함께 시작';
      this.panel.querySelector('[data-pg="leave"]').hidden = !me;
      const friends = this.panel.querySelector('.pg-friends');
      const signature = JSON.stringify([game?.phase, game?.seeker, game?.host, game?.players]);
      if (signature !== this.signature) {
        this.signature = signature; friends.textContent = '';
        for (const p of game?.players || []) {
          const chip = document.createElement('span');
          chip.textContent = `${p.caught && !idle ? '✓ ' : !idle && p.id === game.seeker ? '⚑ ' : '• '}${p.n}${p.id === game.host ? ' · 방장' : ''}`;
          friends.appendChild(chip);
        }
      }
      const act = document.querySelector('#dockScene [data-act="play"]');
      if (act) {
        act.querySelector('span').textContent = volley ? '점프' : seeker && !idle ? '잡기' : this.hidden ? '나오기' : '숨기';
        act.disabled = !me || !!me.caught || idle || (volley ? game.phase !== 'playing' : seeker ? game.phase !== 'playing' : game.mode !== 'hide');
      }
    }
    resize(w, h, dpr) {
      this.w = w; this.h = h; this.dpr = dpr;
      this.z = Math.min(.94, Math.max(.7, w / 1500), (h - 140) / 600);
      const density = Math.min(2, dpr || 1);
      this.background = MC.canvas(R.width * density, R.height * density);
      const g = this.background.getContext('2d'); g.scale(density, density); ground(g);
    }
    sync(people) {
      const seen = new Set();
      for (const person of people) {
        if (person.s.npc) continue;
        seen.add(person.id);
        let v = this.visitors.get(person.id);
        if (!v) { v = { pup: new MC.Pup({ outfit: 'beanie' }), pos: { x: person.s.x, y: person.s.y } }; this.visitors.set(person.id, v); }
        v.st = person.s;
        v.pup.setLook(v.st.c, v.st.h, v.st.ht, v.st.ac, v.st.gl);
      }
      for (const id of this.visitors.keys()) if (!seen.has(id)) this.visitors.delete(id);
    }
    get me() { return this.game?.players.find(p => p.id === this.net.id); }
    get active() { return this.game?.phase === 'ready' || this.game?.phase === 'playing'; }
    get frozen() { return !!(this.me && this.active && (this.me.caught || this.game.phase === 'ready' && this.game.seeker === this.net.id)); }
    action() {
      if (this.game?.mode === 'volley') { this.volley.jump(); return; }
      if (!this.me || !this.active || this.me.caught) return;
      if (this.game.seeker === this.net.id) this.command('catch');
      else if (this.game.mode === 'hide') {
        if (!this.hidden && R.bush(this.player.x, this.player.y) < 0) {
          if (this.onToast) this.onToast('잎이 무성한 덤불 안으로 들어가서 숨기를 눌러요');
          return;
        }
        this.hidden = !this.hidden; this.target = null; this.keys = { x: 0, y: 0 }; this.renderPanel(true);
      }
    }
    pointerDown(x, y) {
      if (this.game?.mode === 'volley') return false;
      if (this.frozen) return false;
      const pos = this.toWorld(x, y);
      // 술래는 친구를 톡 눌러서도 잡을 수 있다. 거리는 서버가 확인한다.
      if (this.game?.phase === 'playing' && this.game.seeker === this.net.id) {
        for (const [id, v] of this.visitors) if (this.visible(id, v) && v.pup.hit(x, y)) { this.action(); return false; }
      }
      if (R.valid(pos.x, pos.y)) { this.target = pos; this.hidden = false; }
      return false;
    }
    toScreen(x, y) { return { x: (x - this.camX) * this.z + this.w / 2, y: (y - this.camY) * this.z + this.h * .58 }; }
    toWorld(x, y) { return { x: (x - this.w / 2) / this.z + this.camX, y: (y - this.h * .58) / this.z + this.camY }; }
    visible(id, v) {
      const p = this.game?.players.find(p => p.id === id);
      // 참가하지 않은 산책 멍이는 진행 중인 놀이에 섞이지 않는다.
      if (this.me && this.active && !p) return false;
      if (this.game?.phase === 'ready' && this.game.seeker === this.net.id) return false;
      if (this.active && this.game.seeker === this.net.id && v.st.hd && Math.hypot(v.st.x - this.player.x, v.st.y - this.player.y) > 66) return false;
      return true;
    }
    update(dt) {
      this.t += dt;
      if (this.game?.mode === 'volley') { this.volley.update(dt); this.renderPanel(); return; }
      this.volley.controls.hidden = true;
      if (!this.active || !this.me || this.me.caught) this.hidden = false;
      let dx = this.keys.x, dy = this.keys.y;
      if (!dx && !dy && this.target) { dx = this.target.x - this.player.x; dy = this.target.y - this.player.y; }
      const len = Math.hypot(dx, dy), oldX = this.player.x, oldY = this.player.y;
      if (len > (this.target ? 2 : 0) && !this.frozen) {
        const speed = this.active && this.game.seeker === this.net.id ? R.seekerSpeed : R.speed;
        const step = Math.min(speed * dt, this.target ? len : speed * dt);
        const nx = this.player.x + dx / len * step, ny = this.player.y + dy / len * step;
        if (R.valid(nx, ny)) { this.player.x = nx; this.player.y = ny; }
        else if (R.valid(nx, this.player.y)) this.player.x = nx;
        else if (R.valid(this.player.x, ny)) this.player.y = ny;
        else this.target = null;
      } else if (this.target && len <= 2) this.target = null;
      this.moving = Math.hypot(this.player.x - oldX, this.player.y - oldY) > .01;
      this.crowd.moving = this.moving;
      if (this.moving) { this.hidden = false; if (dx) this.pup.flip = dx < 0 ? -1 : 1; }
      this.camX = MC.clamp(this.player.x, Math.min(700, this.w / this.z / 2 - 20), Math.max(700, R.width - this.w / this.z / 2 + 20));
      this.camY = MC.clamp(this.player.y, 290, 610);
      const pos = this.toScreen(this.player.x, this.player.y);
      Object.assign(this.pup, pos, { k: .62 * this.z });
      this.pup.update(dt, { walking: this.moving, noSleep: true });
      for (const v of this.visitors.values()) {
        v.pos.x += (v.st.x - v.pos.x) * Math.min(1, dt * 14); v.pos.y += (v.st.y - v.pos.y) * Math.min(1, dt * 14);
        Object.assign(v.pup, this.toScreen(v.pos.x, v.pos.y), { k: .62 * this.z, flip: v.st.f });
        v.pup.update(dt, { walking: !!v.st.w, noSleep: true });
      }
      this.renderPanel();
    }
    draw(g) {
      if (this.game?.mode === 'volley') { this.volley.draw(g); return; }
      g.fillStyle = '#7b946a'; g.fillRect(0, 0, this.w, this.h);
      g.save(); g.translate(this.w / 2 - this.camX * this.z, this.h * .58 - this.camY * this.z); g.scale(this.z, this.z);
      g.fillStyle = meadow(g);
      g.fillRect(this.camX - this.w / 2 / this.z, this.camY - this.h * .58 / this.z, this.w / this.z, this.h / this.z);
      g.drawImage(this.background, 0, 0, R.width, R.height);
      for (const b of R.bushes) ell(g, b.x, b.y + 8, b.r + 6, b.r * .55, 'rgba(63,95,54,.18)');
      g.restore();
      const items = [];
      const worldDraw = fn => { g.save(); g.translate(this.w / 2 - this.camX * this.z, this.h * .58 - this.camY * this.z); g.scale(this.z, this.z); fn(); g.restore(); };
      for (const o of R.obstacles) items.push({ y: o.y + o.h, draw: () => worldDraw(() => obstacle(g, o)) });
      for (const b of R.bushes) items.push({ y: b.y + 24, draw: () => worldDraw(() => bush(g, b)) });
      const actor = (pup, id, y, hidden) => ({ y, draw: () => {
        const participant = this.game?.players.find(p => p.id === id), seeker = this.active && this.game.seeker === id;
        g.save(); if (participant?.caught && this.active) g.globalAlpha = .45; if (hidden) g.globalAlpha = .3;
        pup.draw(g, this.dpr || 1, true); g.restore();
        if (seeker) { g.fillStyle = '#a24e38'; g.font = '15px Jua, sans-serif'; g.textAlign = 'center'; g.fillText('⚑ 술래', pup.x, pup.y - 79 * pup.k); }
      } });
      items.push(actor(this.pup, this.net.id, this.player.y, this.hidden));
      for (const [id, v] of this.visitors) if (this.visible(id, v)) items.push(actor(v.pup, id, v.pos.y, !!v.st.hd));
      items.sort((a, b) => a.y - b.y); for (const item of items) item.draw();
      // 덤불 뒤 내 위치는 나에게만 흐릿하게 비친다.
      if (this.hidden) { g.save(); g.globalAlpha = .27; this.pup.draw(g, this.dpr || 1, true); g.restore(); }
      if (this.game?.phase === 'ready' && this.game.seeker === this.net.id) {
        g.fillStyle = '#354d40'; g.fillRect(0, 0, this.w, this.h);
        g.fillStyle = '#f6e7c9'; g.textAlign = 'center'; g.font = `${this.w < 500 ? 22 : 28}px Jua, sans-serif`;
        g.fillText(this.game.mode === 'hide' ? '꼭꼭 숨어라, 머리카락 보일라' : '친구들아, 먼저 달려!', this.w / 2, this.h * .54);
        g.font = '17px Jua, sans-serif'; g.fillText('친구들이 준비하고 있어요. 잠깐 눈을 감아요.', this.w / 2, this.h * .54 + 36);
      }
      // 구석의 작은 방향 안내로 넓은 운동장에서 길을 잃지 않는다.
      g.fillStyle = 'rgba(43,66,45,.62)'; g.font = '14px Jua, sans-serif'; g.textAlign = 'right';
      g.fillText('글램핑 옆 · 멍이 놀이터', this.w - 20, this.h - 118);
    }
    destroy() {
      this.volley.destroy(); this.scoreboard.remove(); document.querySelector('#session').classList.remove('is-volley', 'volley-waiting');
      this.panel.remove(); this.net.onPlayground = null; this.net.playground = null;
    }
  }
  MC.PlaygroundScene = PlaygroundScene;
})(window.MC = window.MC || {});
