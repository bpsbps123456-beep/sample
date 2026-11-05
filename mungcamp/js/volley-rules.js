/* 멍이 배구의 공통 물리. 좌표·점수·승패는 서버에서 계산한다. */
(function (root) {
  'use strict';
  const V = { width: 960, height: 540, ground: 430, net: 480, netTop: 284, radius: 18, target: 5 };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  V.create = () => ({ score: [0, 0], serving: 0, pause: 0, winner: -1, rally: 0,
    ball: { x: 225, y: 155, vx: 0, vy: -120 },
    dogs: [{ x: 205, y: V.ground, vy: 0, axis: 0, jump: false }, { x: 755, y: V.ground, vy: 0, axis: 0, jump: false }] });
  V.serve = s => {
    s.ball = { x: s.serving ? 735 : 225, y: 155, vx: 0, vy: -120 };
    s.dogs.forEach((d, i) => { d.x = i ? 755 : 205; d.y = V.ground; d.vy = 0; d.axis = 0; d.jump = false; });
    s.rally++;
  };
  V.step = (s, dt) => {
    if (s.winner >= 0) return;
    if (s.pause > 0) { s.pause = Math.max(0, s.pause - dt); if (!s.pause) V.serve(s); return; }
    for (let i = 0; i < 2; i++) {
      const d = s.dogs[i];
      if (d.jump && d.y >= V.ground - .1) d.vy = -610;
      d.jump = false;
      d.x = clamp(d.x + clamp(d.axis || 0, -1, 1) * 305 * dt, i ? 527 : 42, i ? 918 : 433);
      d.vy += 1450 * dt; d.y = Math.min(V.ground, d.y + d.vy * dt);
      if (d.y === V.ground) d.vy = 0;
    }
    const b = s.ball, r = V.radius, oldX = b.x, oldY = b.y;
    b.vy += 780 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < r || b.x > V.width - r) { b.x = clamp(b.x, r, V.width - r); b.vx *= -1; }
    if (b.y < r) { b.y = r; b.vy = Math.abs(b.vy); }
    // 둥근 네트 윗부분과 양옆. 고정 시간 간격으로 빠른 공도 뚫고 가지 않는다.
    if (b.y > V.netTop - r && b.x > V.net - 8 - r && b.x < V.net + 8 + r) {
      if (oldY <= V.netTop - r && b.vy > 0) { b.y = V.netTop - r; b.vy = -Math.abs(b.vy) * .85; }
      else { const side = oldX < V.net ? -1 : 1; b.x = V.net + side * (8 + r); b.vx = side * Math.max(120, Math.abs(b.vx)); }
    }
    for (let i = 0; i < 2; i++) {
      const d = s.dogs[i], dx = b.x - d.x, dy = b.y - (d.y - 58), len = Math.hypot(dx, dy), min = 42 + r;
      if (len >= min) continue;
      const nx = len ? dx / len : 0, ny = len ? dy / len : -1;
      b.x = d.x + nx * (min + .5); b.y = d.y - 58 + ny * (min + .5);
      // 머리로 받으면 위로 솟고, 점프 중에는 조금 더 강하게 반대편으로 보낸다.
      b.vx = clamp(dx * 7 + d.axis * 90 + (i ? -100 : 100), -520, 520);
      b.vy = -Math.min(720, 540 + Math.max(0, -d.vy) * .25);
    }
    if (b.y >= V.ground - r) {
      b.y = V.ground - r;
      const point = b.x < V.net ? 1 : 0;
      s.score[point]++; s.serving = point; s.pause = 1.5;
      if (s.score[point] >= V.target) s.winner = point;
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = V;
  else (root.MC = root.MC || {}).VolleyRules = V;
})(typeof window === 'undefined' ? globalThis : window);
