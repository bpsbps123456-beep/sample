(function (MC) {
  'use strict';
  const uiText = value => MC.I18n ? MC.I18n.t(value) : value;
  const B = MC.BoardRules;
  const colors = ['#bd623f', '#447e7a', '#8b68a0', '#ac842e'];
  const faces = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
  const point = n => {
    if (!n) return { x: 100 / 12, y: 100 };
    const row = Math.floor((n - 1) / 6), col = (n - 1) % 6;
    return { x: ((row % 2 ? 5 - col : col) + .5) * 100 / 6, y: (4 - row + .5) * 20 };
  };
  class PlaygroundBoard {
    constructor(scene) {
      this.scene = scene; this.seq = ''; this.pending = ''; this.tokens = new Map();
      const el = this.el = document.createElement('section');
      el.className = 'race-game'; el.hidden = true; el.setAttribute('aria-label', '멍이 보물 레이스');
      el.innerHTML = '<header class="race-header"><div><span class="race-eyebrow">PLAYGROUND · BOARD GAME</span><h2>멍이 보물 레이스</h2></div><span class="race-goal">먼저 30칸에 도착!</span></header>' +
        '<div class="race-body"><div class="race-island"><div class="race-map"><div class="race-track"></div><div class="race-tokens" aria-hidden="true"></div><span class="race-start">출발 ↑</span></div>' +
        '<div class="race-legend"><span>↗ 지름길 앞으로</span><span>↙ 미끄럼 뒤로</span><span>숫자를 따라 지그재그로 가요</span></div></div>' +
        '<aside class="race-side"><p class="race-turn" role="status" aria-live="polite"></p><div class="race-roll-row"><div class="race-die" aria-label="주사위"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div><p class="race-timer"></p></div>' +
        '<button type="button" class="race-roll">주사위 굴리기</button><p class="race-event" role="status" aria-live="polite">내 차례에 주사위를 톡 눌러요.</p><ol class="race-roster" aria-label="멍이별 현재 위치"></ol></aside></div>' +
        '<footer class="race-footer"><span>① 주사위 톡 &nbsp; ② 나온 수만큼 이동 &nbsp; ③ 보물섬 도착!</span><button type="button" class="race-back" hidden>다른 놀이 고르기</button></footer>';
      const track = el.querySelector('.race-track');
      for (let n = 1; n <= B.finish; n++) {
        const p = point(n), cell = document.createElement('div'), trail = B.trails[n];
        cell.className = `race-cell${trail ? trail > n ? ' shortcut' : ' slide' : ''}${n === 30 ? ' finish' : ''}`;
        cell.style.gridColumn = Math.floor(p.x / (100 / 6)) + 1;
        cell.style.gridRow = Math.floor(p.y / 20) + 1;
        cell.setAttribute('aria-label', `${n}칸${trail ? `, ${trail > n ? '지름길' : '미끄럼'} ${trail}칸으로 이동` : n === 30 ? ', 보물섬 도착' : ''}`);
        const short = trail ? `${trail > n ? '↗' : '↙'} ${trail}` : n === 30 ? '도착' : n % 6 === 0 ? '↑' : Math.floor((n - 1) / 6) % 2 ? '←' : '→';
        cell.innerHTML = `<b>${n}</b><span class="race-cell-art" aria-hidden="true">${n === 30 ? '♛' : trail ? trail > n ? '↗' : '↙' : [3, 11, 20, 26].includes(n) ? '✿' : [7, 16, 25].includes(n) ? '♧' : ''}</span><small data-short="${short}">${trail ? `${trail > n ? '지름길' : '미끄럼'} → ${trail}` : n === 30 ? '보물섬' : short}</small>`;
        track.appendChild(cell);
      }
      this.rollButton = el.querySelector('.race-roll');
      this.rollButton.addEventListener('click', () => this.roll());
      el.querySelector('.race-back').addEventListener('click', () => {
        if (scene.game?.phase !== 'ended') return;
        this.closedRound = scene.game.round; scene.renderPanel(true);
      });
      document.querySelector('#session').appendChild(el);
      this.face(1);
    }
    get open() { const g = this.scene.game; return !!(g?.mode === 'board' && g.board && this.closedRound !== g.round); }
    name(id) { return id === B.bot ? '산책봇' : this.scene.game?.players.find(p => p.id === id)?.n || this.scene.game?.board?.names?.[id] || '멍이'; }
    face(n) {
      this.el.querySelectorAll('.race-die span').forEach((dot, i) => dot.classList.toggle('pip', faces[n].includes(i)));
      this.el.querySelector('.race-die').setAttribute('aria-label', `주사위 ${n}`);
    }
    roll() {
      if (!this.open || this.scene.game.phase !== 'playing' || this.rollButton.disabled) return;
      const g = this.scene.game, key = `${g.round}:${g.board.seq}`;
      if (this.pending === key) return;
      this.pending = key; this.rollButton.disabled = true;
      this.scene.command('roll', key);
    }
    render() {
      this.el.hidden = !this.open;
      if (!this.open) return;
      const g = this.scene.game, s = g.board, key = `${g.round}:${s.seq}`, ended = g.phase === 'ended';
      if (this.seq !== key) {
        const fresh = this.round !== g.round;
        this.round = g.round; this.seq = key; this.pending = '';
        this.animation = !fresh && s.last && this.lastMove !== JSON.stringify(s.last) && !matchMedia('(prefers-reduced-motion: reduce)').matches ? { at: performance.now(), ...s.last } : null;
        this.lastMove = JSON.stringify(s.last);
        this.face(s.last?.dice || 1);
        this.el.querySelector('.race-event').textContent = ended && s.positions[s.winner] !== B.finish ? g.result : s.last ? `${this.name(s.last.id)}${s.last.auto && s.last.id !== B.bot ? ' · 자동 굴리기' : ''} · ${s.last.dice}! ${s.last.to > s.last.landed ? `지름길을 타고 ${s.last.to}칸으로!` : s.last.to < s.last.landed ? `앗, 미끄러져 ${s.last.to}칸으로!` : `${s.last.to}칸에 도착했어요`}` : '내 차례에 주사위를 톡 눌러요.';
        this.el.querySelector('.race-back').hidden = !ended;
        const roster = this.el.querySelector('.race-roster'); roster.textContent = '';
        for (const [i, id] of s.order.entries()) {
          const item = document.createElement('li'); item.style.setProperty('--token', colors[i]);
          const badge = document.createElement('b'); badge.textContent = i + 1;
          const name = document.createElement('span'); name.textContent = `${this.name(id)}${id === this.scene.net.id ? ' (나)' : ''}`;
          const pos = document.createElement('strong'); pos.textContent = `${s.positions[id]}칸`;
          item.append(badge, name, pos); item.dataset.id = id; roster.appendChild(item);
        }
      }
      const current = s.order[s.turn], mine = current === this.scene.net.id;
      const turn = this.el.querySelector('.race-turn');
      const label = ended ? `♛ ${this.name(s.winner)} 승리!` : mine ? '내 차례예요!' : `${this.name(current)} 차례`;
      if (turn.textContent !== uiText(label)) turn.textContent = uiText(label);
      this.el.classList.toggle('my-turn', mine && !ended); this.el.classList.toggle('race-ended', ended);
      const now = Date.now() + (this.scene.offset || 0), waiting = now < s.readyAt;
      this.rollButton.disabled = ended || !mine || waiting || !this.scene.net.online || this.pending === key;
      this.rollButton.textContent = ended ? s.positions[s.winner] === B.finish ? '보물섬 도착!' : '레이스 종료' : waiting ? '멍이가 이동하고 있어요' : mine ? '주사위 굴리기' : '친구를 응원해요';
      const timer = ended ? '다시 한 판 할까요?' : current === B.bot ? '산책봇이 생각 중…' : `${Math.max(0, Math.ceil((s.deadline - now) / 1000))}초 · 기다리면 자동으로 굴려요`;
      this.el.querySelector('.race-timer').textContent = timer;
      this.el.querySelectorAll('.race-roster li').forEach(li => li.classList.toggle('current', li.dataset.id === (ended ? s.winner : current)));
      this.paintTokens();
    }
    paintTokens() {
      const s = this.scene.game?.board; if (!s) return;
      for (const [id, token] of this.tokens) if (!s.order.includes(id)) { token.remove(); this.tokens.delete(id); }
      const age = this.animation ? performance.now() - this.animation.at : Infinity;
      if (this.animation && age < 350) this.face(1 + Math.floor(age / 60) % 6);
      else this.face(s.last?.dice || 1);
      this.el.querySelector('.race-die').classList.toggle('rolling', age < 350);
      for (const [i, id] of s.order.entries()) {
        let token = this.tokens.get(id);
        if (!token) {
          token = document.createElement('span'); token.className = 'race-token'; token.textContent = i + 1;
          this.el.querySelector('.race-tokens').appendChild(token); this.tokens.set(id, token);
        }
        token.textContent = i + 1; token.style.setProperty('--token', colors[i]);
        let n = s.positions[id];
        if (this.animation?.id === id && age < 1500) {
          const move = this.animation;
          n = age < 350 ? move.from : Math.min(move.landed, move.from + Math.floor((age - 350) / 100) + 1);
          if (age >= 1100) n = move.to;
        }
        const p = point(n), offsetX = (i % 2 ? 1 : -1) * 9, offsetY = i < 2 ? -6 : 9;
        token.style.left = `calc(${p.x}% + ${offsetX}px)`; token.style.top = `calc(${p.y}% + ${offsetY}px)`;
        token.classList.toggle('winner', s.winner === id);
      }
    }
    update() { if (!this.el.hidden) this.paintTokens(); }
    destroy() { this.el.remove(); }
  }
  MC.PlaygroundBoard = PlaygroundBoard;
})(window.MC = window.MC || {});
