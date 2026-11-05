'use strict';
const R = require('../js/playground-rules');
const V = require('../js/volley-rules');

// 라운드, 술래, 참가자, 시간, 잡기 판정은 서버 한 곳에서 결정한다.
module.exports = class Playground {
  constructor(room, send) {
    this.room = room;
    this.send = send;
    this.players = new Map();
    this.mode = 'tag';
    this.phase = 'lobby';
    this.until = 0;
    this.round = 0;
    this.seeker = '';
    this.result = '';
    this.lastCatch = 0;
    this.volley = null;
    this.inputAt = [0, 0];
  }
  snapshot() {
    return { t: 'pg', mode: this.mode, phase: this.phase, until: this.until, now: Date.now(),
      round: this.round, seeker: this.seeker, result: this.result,
      host: this.players.keys().next().value || '',
      volley: this.mode === 'volley' ? this.volley : null,
      players: [...this.players.values()].map(p => ({ id: p.client.id, n: p.client.state.n || '멍이', caught: p.caught })) };
  }
  publish() {
    const s = this.snapshot();
    for (const c of this.room.members) this.send(c, s);
  }
  error(c, message) { this.send(c, { t: 'pg-error', message }); }
  command(c, action, value) {
    const now = Date.now();
    this.tick(now);
    if (action === 'leave') return this.leave(c);
    if (action === 'input' || action === 'jump') {
      const side = [...this.players.keys()].indexOf(c.id);
      if (this.mode !== 'volley' || this.phase !== 'playing' || side < 0 || side > 1) return;
      const dog = this.volley.dogs[side];
      if (action === 'jump') dog.jump = true;
      else if (typeof value === 'number' && Number.isFinite(value)) dog.axis = Math.sign(value);
      this.inputAt[side] = now;
      return;
    }
    const idle = this.phase === 'lobby' || this.phase === 'ended';
    if (action === 'join') {
      if (!idle) return this.error(c, '놀이가 끝나면 다음 판에 참가할 수 있어요');
      if (this.players.has(c.id)) return;
      if (this.players.size >= (this.mode === 'volley' ? 2 : 12)) return this.error(c, this.mode === 'volley' ? '배구는 두 멍이가 함께해요. 다음 판에 만나요!' : '이번 판은 열두 멍이가 모두 모였어요');
      this.players.set(c.id, { client: c, caught: false });
    } else if (action === 'mode' || action === 'start') {
      if (c.id !== this.players.keys().next().value || !idle) return;
      if (action === 'mode') {
        if (!['tag', 'hide', 'volley'].includes(value)) return;
        if (value === 'volley' && this.players.size > 2) return this.error(c, '배구는 두 멍이가 참가할 때 고를 수 있어요');
        this.mode = value;
        this.volley = null;
      } else {
        if (this.players.size < 2) return this.error(c, '두 멍이 이상 참가하면 시작할 수 있어요');
        this.round++;
        this.result = '';
        if (this.mode === 'volley') {
          this.seeker = '';
          this.volley = V.create(); this.volley.lastAt = now;
          this.phase = 'ready'; this.until = now + 3000; this.volleyPublishAt = 0;
          for (const p of this.players.values()) p.caught = false;
          this.publish(); return;
        }
        const ids = [...this.players.keys()];
        // 연속으로 같은 멍이가 술래가 되지 않게 뽑는다.
        const pool = ids.filter(id => id !== this.seeker);
        this.seeker = pool[Math.floor(Math.random() * pool.length)];
        this.phase = 'ready';
        this.until = now + (this.mode === 'hide' ? 15000 : 5000);
        let i = 0;
        for (const p of this.players.values()) {
          p.caught = false;
          const pos = p.client.id === this.seeker ? { x: 700, y: 760 } : R.spawn(i++);
          Object.assign(p.client.state, pos, { w: 0, hd: 0 });
          this.room.changed.set(p.client.id, p.client.state);
          p.client.pgMoveAt = now;
          this.send(p.client, { t: 'pg-position', ...pos });
        }
      }
    } else if (action === 'catch') {
      if (this.phase !== 'playing' || c.id !== this.seeker || now - this.lastCatch < 450) return;
      this.lastCatch = now;
      const candidates = [...this.players.values()].filter(p => p.client !== c && !p.caught)
        .filter(p => Math.hypot(p.client.state.x - c.state.x, p.client.state.y - c.state.y) <= R.catchRadius && R.clear(c.state, p.client.state, 2))
        .sort((a, b) => Math.hypot(a.client.state.x - c.state.x, a.client.state.y - c.state.y) - Math.hypot(b.client.state.x - c.state.x, b.client.state.y - c.state.y));
      if (!candidates.length) return this.error(c, '조금 더 가까이 가서 잡아 보세요');
      candidates[0].caught = true;
      candidates[0].client.state.hd = 0;
      this.room.changed.set(candidates[0].client.id, candidates[0].client.state);
      if (![...this.players.values()].some(p => p.client.id !== this.seeker && !p.caught)) this.end('모두 찾았어요! 술래의 승리');
    } else return;
    this.publish();
  }
  move(c, st, now) {
    const old = c.state;
    const p = this.players.get(c.id);
    const active = this.phase === 'ready' || this.phase === 'playing';
    const frozen = p && active && (this.mode === 'volley' || p.caught || this.phase === 'ready' && c.id === this.seeker);
    const elapsed = Math.min(.5, Math.max(0, (now - (c.pgMoveAt || now)) / 1000));
    c.pgMoveAt = now;
    const speed = c.id === this.seeker ? R.seekerSpeed : R.speed;
    if (!old || old.p !== 'playground') {
      if (!R.valid(st.x, st.y)) Object.assign(st, R.spawn(0));
    } else if (frozen || !R.clear(old, st) || Math.hypot(st.x - old.x, st.y - old.y) > speed * elapsed + 18) {
      st.x = old.x; st.y = old.y; st.w = 0;
      this.send(c, { t: 'pg-position', x: st.x, y: st.y });
    }
    st.hd = +(this.mode === 'hide' && active && p && !p.caught && c.id !== this.seeker && st.hd && !st.w && R.bush(st.x, st.y) >= 0);
    return st;
  }
  leave(c) {
    if (!this.players.delete(c.id)) return;
    if (this.phase === 'ready' || this.phase === 'playing') {
      if (this.mode === 'volley') this.end('친구가 나가서 배구를 마쳤어요');
      else if (c.id === this.seeker) this.end('술래가 나가서 놀이를 마쳤어요');
      else if (this.players.size < 2) this.end('친구가 나가서 놀이를 마쳤어요');
      else if (![...this.players.values()].some(p => p.client.id !== this.seeker && !p.caught)) this.end('모두 찾았어요! 술래의 승리');
    }
    if (!this.players.size) { this.phase = 'lobby'; this.result = ''; this.seeker = ''; this.volley = null; }
    this.publish();
  }
  end(result) { this.phase = 'ended'; this.until = 0; this.result = result; }
  tick(now) {
    if (this.mode === 'volley') {
      if (this.phase === 'ready' && now >= this.until) {
        this.phase = 'playing'; this.until = now + 300000; this.volley.lastAt = now;
        this.publish();
      }
      if (this.phase !== 'playing' || !this.volley) return;
      const s = this.volley;
      for (let i = 0; i < 2; i++) if (now - this.inputAt[i] > 700) s.dogs[i].axis = 0;
      let left = Math.min(.1, Math.max(0, (now - s.lastAt) / 1000)); s.lastAt = now;
      while (left > 0) { const dt = Math.min(left, 1 / 120); V.step(s, dt); left -= dt; }
      if (s.winner >= 0) {
        const p = [...this.players.values()][s.winner];
        this.end(`${p?.client.state.n || (s.winner ? '오른쪽 멍이' : '왼쪽 멍이')} 승리! ${s.score[0]} : ${s.score[1]}`);
        this.publish();
      } else if (now >= this.until) { this.end(`배구를 마쳤어요! ${s.score[0]} : ${s.score[1]}`); this.publish(); }
      else if (now >= this.volleyPublishAt) { this.volleyPublishAt = now + 50; this.publish(); }
      return;
    }
    if (this.phase === 'ready' && now >= this.until) {
      this.phase = 'playing'; this.until += this.mode === 'hide' ? 120000 : 90000;
      this.publish();
    }
    if (this.phase === 'playing' && now >= this.until) {
      this.end('끝까지 도망쳤어요! 친구들의 승리'); this.publish();
    }
  }
};
