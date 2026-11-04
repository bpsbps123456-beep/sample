/* 멍캠프 — 여섯 가지 짧은 감정 말풍선. 멍이와 함께 움직이고 네 초 뒤 사라진다. */
(function (MC) {
  'use strict';
  const list = Object.freeze([
    { id: 1, label: '사랑해요', glyph: '❤️', mood: 'happy' },
    { id: 2, label: '신나요', glyph: '😆', mood: 'happy' },
    { id: 3, label: '고마워요', glyph: '🥰', mood: 'happy' },
    { id: 4, label: '시무룩', glyph: '🥺', mood: 'idle' },
    { id: 5, label: '깜짝이야', glyph: '😮', mood: 'startled' },
    { id: 6, label: '졸려요', glyph: '😴', mood: 'sleepy' },
  ].map(Object.freeze));
  const valid = id => Number.isInteger(id) && id >= 1 && id <= list.length ? id : 0;

  function draw(g, pup) {
    const e = pup.emotion;
    if (!e) return;
    const item = list[e.kind - 1];
    if (!item) return;
    const alpha = Math.min(1, e.t / 0.16, (4 - e.t) / 0.5);
    const at = pup.world(0, -132 + pup.lieDrop);
    const k = pup.k * (0.88 + 0.12 * Math.min(1, e.t / 0.2));
    g.save(); g.translate(at.x, at.y - Math.sin(Math.min(1, e.t / 0.3) * Math.PI) * 5 * pup.k);
    g.scale(k, k); g.globalAlpha *= Math.max(0, alpha);
    g.shadowColor = 'rgba(25,20,18,0.18)'; g.shadowBlur = 6 * pup.k; g.shadowOffsetY = 2 * pup.k;
    MC.roundRect(g, -25, -23, 50, 44, 16);
    g.fillStyle = '#fff5df'; g.fill();
    g.shadowColor = 'transparent'; g.lineWidth = 1.8; g.strokeStyle = '#977655'; g.stroke();
    g.beginPath(); g.moveTo(-5, 20); g.quadraticCurveTo(-3, 28, 5, 25); g.lineTo(9, 20);
    g.fill(); g.stroke();
    g.fillStyle = '#fff5df'; g.fillRect(-4, 18, 12, 4);
    g.font = '29px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#513c2d';
    g.fillText(item.glyph, 0, 0);
    g.restore();
  }
  MC.Emotes = Object.freeze({ list, valid, draw });
})(window.MC = window.MC || {});
