/* 낚시 선물과 바다 보물 코인으로 채우는 옷장. */
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
    { id: 'sailor', slot: 'ht', value: 5, name: '마린 세일러 모자', icon: '⚓', price: 30 },
    { id: 'shark', slot: 'ht', value: 6, name: '상어 후드', icon: '🦈', price: 60 },
    { id: 'crown', slot: 'ht', value: 7, name: '바다 왕관', icon: '👑', price: 90 },
    { id: 'pearl', slot: 'ac', value: 4, name: '진주 목걸이', icon: '🦪', price: 30 },
    { id: 'shell', slot: 'ac', value: 5, name: '조개 펜던트', icon: '🐚', price: 40 },
    { id: 'anchor', slot: 'ac', value: 6, name: '닻 목걸이', icon: '⚓', price: 50 },
    { id: 'ocean-mittens', slot: 'gl', value: 4, name: '파도 장갑', icon: '🌊', price: 30 },
    { id: 'coral-mittens', slot: 'gl', value: 5, name: '산호 장갑', icon: '🪸', price: 40 },
    { id: 'sailor-shirt', slot: 'cl', value: 1, name: '마린 줄무늬 티', icon: '👕', price: 40 },
    { id: 'coral-shirt', slot: 'cl', value: 2, name: '산호빛 니트', icon: '🧶', price: 50 },
    { id: 'whale-shirt', slot: 'cl', value: 3, name: '고래 티셔츠', icon: '🐳', price: 60 },
    { id: 'star-vest', slot: 'cl', value: 4, name: '별빛 조끼', icon: '✨', price: 80 },
  ];
  const chests = [{ id: 'reef', coins: 30, u: .33 }, { id: 'pearl-cove', coins: 40, u: .56 }, { id: 'deep-blue', coins: 50, u: .84 }];
  const cooldown = 120000;
  let memory = null;
  function wallet() {
    const raw = MC.store.get('seaWallet', memory) || {};
    return { coins: Number.isSafeInteger(raw.coins) ? MC.clamp(raw.coins, 0, 999999) : 0,
      owned: Array.isArray(raw.owned) ? raw.owned.filter(id => items.some(i => i.id === id)) : [],
      claimed: raw.claimed && typeof raw.claimed === 'object' ? raw.claimed : {} };
  }
  function save(value) { memory = value; MC.store.set('seaWallet', value); }
  function owned() {
    const saved = MC.store.get('fishingFinds', []);
    const ids = [...(Array.isArray(saved) ? saved : []), ...wallet().owned];
    return items.filter(item => ids.includes(item.id)).map(item => item.id);
  }
  function has(slot, value) {
    return value === 0 || items.some(item => item.slot === slot && item.value === value && owned().includes(item.id));
  }
  function clean(slot, value) {
    return Number.isInteger(value) && (value === 0 || items.some(item => item.slot === slot && item.value === value)) ? value : 0;
  }
  function award() {
    const found = owned();
    const pool = items.filter(item => !item.price && !found.includes(item.id));
    if (!pool.length) return null;
    const item = pool[Math.floor(Math.random() * pool.length)];
    MC.store.set('fishingFinds', [...found, item.id]);
    return item;
  }
  function balance() { return wallet().coins; }
  function remaining(id, now = Date.now()) {
    const at = wallet().claimed[id];
    return Number.isFinite(at) ? Math.max(0, Math.min(cooldown, at + cooldown - now)) : 0;
  }
  function claim(id) {
    const chest = chests.find(c => c.id === id);
    if (!chest || remaining(id)) return 0;
    const value = wallet(); value.coins = Math.min(999999, value.coins + chest.coins);
    value.claimed[id] = Date.now(); save(value); return chest.coins;
  }
  function buy(id) {
    const item = items.find(i => i.id === id && i.price);
    if (!item) return { ok: false, reason: 'unknown' };
    if (owned().includes(id)) return { ok: false, reason: 'owned' };
    const value = wallet();
    if (value.coins < item.price) return { ok: false, reason: 'coins' };
    value.coins -= item.price; value.owned.push(id); save(value);
    return { ok: true, item };
  }
  MC.Wardrobe = { items, owned, has, clean, award, balance, buy, chests, cooldown, remaining, claim };
})(window.MC = window.MC || {});
