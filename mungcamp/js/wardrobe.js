/* 낚시로 모으는 작은 옷장. 기존 털빛·비니 색상은 그대로 무료로 쓴다. */
(function (MC) {
  'use strict';
  const items = [
    { id: 'bunny', slot: 'ht', value: 1, name: '토끼 보닛', icon: '🐰' },
    { id: 'frog', slot: 'ht', value: 2, name: '개구리 모자', icon: '🐸' },
    { id: 'berry', slot: 'ht', value: 3, name: '딸기 베레모', icon: '🍓' },
    { id: 'cloud', slot: 'ht', value: 4, name: '구름 모자', icon: '☁️' },
    { id: 'bow', slot: 'ac', value: 1, name: '복숭아 리본', icon: '🎀' },
    { id: 'star', slot: 'ac', value: 2, name: '반짝별 목걸이', icon: '⭐' },
    { id: 'daisy', slot: 'ac', value: 3, name: '데이지 목걸이', icon: '🌼' },
    { id: 'heart-mittens', slot: 'gl', value: 1, name: '하트 장갑', icon: '🩷' },
    { id: 'paw-mittens', slot: 'gl', value: 2, name: '민트 발바닥 장갑', icon: '🐾' },
    { id: 'star-mittens', slot: 'gl', value: 3, name: '라일락 별 장갑', icon: '💜' },
  ];
  function owned() {
    const saved = MC.store.get('fishingFinds', []);
    return Array.isArray(saved) ? items.filter(item => saved.includes(item.id)).map(item => item.id) : [];
  }
  function has(slot, value) {
    return value === 0 || items.some(item => item.slot === slot && item.value === value && owned().includes(item.id));
  }
  function clean(slot, value) {
    return Number.isInteger(value) && (value === 0 || items.some(item => item.slot === slot && item.value === value)) ? value : 0;
  }
  function award() {
    const found = owned();
    const pool = items.filter(item => !found.includes(item.id));
    if (!pool.length) return null;
    const item = pool[Math.floor(Math.random() * pool.length)];
    MC.store.set('fishingFinds', [...found, item.id]);
    return item;
  }
  MC.Wardrobe = { items, owned, has, clean, award };
})(window.MC = window.MC || {});
