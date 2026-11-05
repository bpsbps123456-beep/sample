/* 놀이터의 좌표와 판정. 브라우저와 함께 모이기 서버가 같은 지형을 쓴다. */
(function (root) {
  'use strict';
  const bushes = [
    { x: 285, y: 235, r: 58 }, { x: 1080, y: 240, r: 64 },
    { x: 480, y: 610, r: 62 }, { x: 1170, y: 650, r: 58 },
    { x: 720, y: 300, r: 52 }, { x: 890, y: 700, r: 55 },
    { x: 175, y: 420, r: 53 }, { x: 325, y: 720, r: 55 },
    { x: 620, y: 490, r: 48 }, { x: 820, y: 190, r: 52 },
    { x: 1220, y: 340, r: 58 }, { x: 1060, y: 780, r: 48 },
  ];
  const obstacles = [
    { x: 440, y: 290, w: 96, h: 64, kind: 'crate' },
    { x: 910, y: 430, w: 108, h: 65, kind: 'crate' },
    { x: 320, y: 490, w: 130, h: 55, kind: 'logs' },
    { x: 720, y: 590, w: 60, h: 80, kind: 'tree' },
    { x: 980, y: 180, w: 44, h: 50, kind: 'tree' },
    { x: 580, y: 180, w: 44, h: 50, kind: 'tree' },
    { x: 1120, y: 440, w: 44, h: 50, kind: 'tree' },
    { x: 600, y: 410, w: 110, h: 55, kind: 'logs' },
  ];
  const R = {
    width: 1400, height: 900, speed: 205, seekerSpeed: 218, catchRadius: 78, sightRadius: 360,
    bushes, obstacles,
    spawn(index) { return { x: 550 + index % 6 * 58, y: 770 + Math.floor(index / 6) * 48 }; },
    valid(x, y, pad = 16) {
      return Number.isFinite(x) && Number.isFinite(y) && x >= 55 && x <= 1345 && y >= 110 && y <= 845 &&
        !obstacles.some(o => x > o.x - pad && x < o.x + o.w + pad && y > o.y - pad && y < o.y + o.h + pad);
    },
    clear(a, b, pad = 16) {
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 10));
      for (let i = 1; i <= n; i++) if (!R.valid(a.x + (b.x - a.x) * i / n, a.y + (b.y - a.y) * i / n, pad)) return false;
      return true;
    },
    bush(x, y) { return bushes.findIndex(b => Math.hypot(x - b.x, y - b.y) <= b.r - 8); },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = R;
  else (root.MC = root.MC || {}).PlaygroundRules = R;
})(typeof window === 'undefined' ? globalThis : window);
