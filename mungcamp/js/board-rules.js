/* 보물 레이스: 브라우저와 서버가 함께 쓰는 판과 이동 규칙. */
(function (root) {
  'use strict';
  const B = { finish: 30, bot: 'board-bot', turnMs: 22000, settleMs: 1800,
    trails: { 4: 10, 9: 6, 13: 19, 18: 15, 22: 27, 28: 24 } };
  B.create = (ids, now = Date.now()) => {
    const order = ids.length === 1 ? [...ids, B.bot] : [...ids];
    return { order, positions: Object.fromEntries(order.map(id => [id, 0])), turn: 0, seq: 0,
      winner: '', last: null, readyAt: now, deadline: now + B.turnMs };
  };
  B.roll = (s, dice, now, auto = false) => {
    if (s.winner || !Number.isInteger(dice) || dice < 1 || dice > 6 || !s.order.length) return false;
    const id = s.order[s.turn], from = s.positions[id], landed = Math.min(B.finish, from + dice);
    const to = B.trails[landed] || landed;
    s.positions[id] = to;
    s.last = { id, dice, from, landed, to, auto };
    s.seq++;
    if (to === B.finish) { s.winner = id; s.deadline = 0; }
    else {
      s.turn = (s.turn + 1) % s.order.length;
      s.readyAt = now + B.settleMs;
      s.deadline = now + (s.order[s.turn] === B.bot ? 3100 : B.turnMs);
    }
    return true;
  };
  B.remove = (s, id, now) => {
    const i = s.order.indexOf(id); if (i < 0) return;
    const current = s.order[s.turn];
    s.order.splice(i, 1); delete s.positions[id]; s.seq++;
    if (!s.order.length) return;
    s.turn = current === id ? i % s.order.length : s.order.indexOf(current);
    if (current === id) {
      s.readyAt = now + B.settleMs;
      s.deadline = now + (s.order[s.turn] === B.bot ? 3100 : B.turnMs);
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = B;
  else (root.MC = root.MC || {}).BoardRules = B;
})(typeof window !== 'undefined' ? window : globalThis);
