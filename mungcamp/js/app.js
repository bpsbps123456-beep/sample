/* 멍캠프 — 화면 흐름: 캠프 마을을 걷다가 → 마음에 드는 자리에 앉아 멍 → 다시 마을로 */
(function (MC) {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // 어디서나: 접이식 의자를 펴고 앉아 책 읽기
  const CHAIR_ACT = { id: 'chair', icon: 'i-chair', label: '의자', toggle: true };

  const SCENES = {
    fire: {
      place: '모닥불',
      make: (o) => new MC.FireScene({ calm: MC.reducedMotion, from: o.from }),
      scape: MC.FireScape,
      guidance: '불꽃을 바라봐요',
      actions: [
        { id: 'log', icon: 'i-log', label: '장작 던지기', primary: true },
        { id: 'worry', icon: 'i-pen', label: '걱정' },
        CHAIR_ACT,
      ],
      space: 'log',
    },
    firetower: {
      place: '탑불멍',
      make: () => new MC.FireScene({ tower: true, calm: MC.reducedMotion }),
      scape: MC.FireScape,
      guidance: '장작을 던져 위로 쌓아 보세요',
      actions: [{ id: 'log', icon: 'i-log', label: '장작 쌓기', primary: true }, CHAIR_ACT],
      space: 'log',
    },
    water: {
      place: '달빛 바다',
      make: () => new MC.WaterScene({}),
      scape: MC.WaterScape,
      guidance: '파도에 숨을 맞춰요',
      actions: [
        { id: 'ripple', icon: 'i-drop', label: '물수제비', primary: true },
        { id: 'dive', icon: 'i-drop', label: '잠수', toggle: true },
        { id: 'bottle', icon: 'i-bottle', label: '편지' },
        CHAIR_ACT,
      ],
      space: 'ripple',
    },
    forest: {
      place: '편백 숲',
      make: () => new MC.ForestScene({}),
      scape: MC.ForestScape,
      guidance: '숲 소리에 귀 기울여요',
      actions: [{ id: 'breeze', icon: 'i-wind', label: '바람', primary: true }, CHAIR_ACT],
      space: 'breeze',
    },
    // 마을 남쪽 글램핑장의 벨텐트 안
    tent: {
      place: '글램핑',
      make: (o) => new MC.TentScene({ from: o.from }),
      scape: MC.TentScape,
      guidance: '따뜻하게 쉬어요',
      actions: [
        { id: 'stove', icon: 'i-log', label: '장작', primary: true },
        { id: 'lights', icon: 'i-bulb', label: '불빛', toggle: true },
        { id: 'rain', icon: 'i-rain', label: '비', toggle: true },
        CHAIR_ACT,
      ],
      space: 'stove',
    },
    // 마을 남서쪽 가장 안쪽의 나무집: 코타츠가 놓인 다다미방
    lodge: {
      place: '숙소',
      make: () => new MC.LodgeScene({}),
      scape: MC.LodgeScape,
      guidance: '편안하게 몸을 녹여요',
      actions: [
        { id: 'mandarin', icon: 'i-orange', label: '귤', primary: true },
        { id: 'kotatsu', icon: 'i-kotatsu', label: '코타츠 속', toggle: true },
        { id: 'roll', icon: 'i-roll', label: '구르기' },
        CHAIR_ACT,
      ],
      space: 'mandarin',
    },
  };

  // 따로 고르지 않아도 20분쯤 머물면 종이 한 번 울린다
  const SESSION_MIN = 20;

  const state = {
    view: 'home',
    scene: null,
    def: null,
    sceneObj: null,
    runner: null,
    scape: null,
    levels: {},
    started: false,
    startAt: 0,
    timerDone: false,
    leaving: false,
    worryShown: false,
    wakeLock: null,
    hiddenAt: 0,
    moved: 0,
    lastSpot: null,
    campAudio: null,
    campVisible: true,
    walked: MC.store.get('walked', false),
  };

  const sound = new MC.Sound();
  const home = $('#home');
  const session = $('#session');
  const stage = $('#stage');
  const ui = $('#ui');
  const curtain = $('#curtain');
  const breath = new MC.Breath($('#breath'), sound);

  const finePointer = !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches);
  const focusSoft = (el) => { if (finePointer) setTimeout(() => el.focus({ preventScroll: true }), 50); };
  const elapsedSec = () => (state.started ? (Date.now() - state.startAt) / 1000 : 0);

  // 장면 위에 덮인 어둠의 농도. 0이면 환하고 1이면 캄캄하다
  function setCurtain(opacity, seconds) {
    curtain.style.transitionDuration = `${seconds}s`;
    curtain.style.opacity = String(opacity);
  }

  let toastTimer = 0;
  function toast(msg, ms = 3600) {
    // 마을에서는 마을의 알림 자리에, 장면 안에서는 장면의 알림 자리에
    const el = state.view === 'home' ? $('#campToast') : $('#toast');
    for (const other of [$('#campToast'), $('#toast')]) if (other !== el) other.classList.remove('is-on');
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), ms);
    wake();
  }

  function renderSeg(sel, items, current, onPick) {
    const box = $(sel);
    box.textContent = '';
    for (const it of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(it.v === current));
      b.textContent = it.label;
      b.addEventListener('click', () => {
        for (const o of box.children) o.setAttribute('aria-checked', String(o === b));
        onPick(it.v);
      });
      box.appendChild(b);
    }
  }

  // ── 소리 깨우기 ───────────────────────────────────────
  // 브라우저는 사용자가 누른 순간에만 소리를 켜게 한다. 누를 때마다 소리를 깨워 둔다
  function unlockAudio() {
    const ctx = sound.ensure();
    if (!ctx) return;
    if (!state.audioHooked) {
      state.audioHooked = true;
      ctx.addEventListener('statechange', () => { if (ctx.state === 'running') audioReady(); });
    }
    if (ctx.state === 'running') audioReady();
  }
  function audioReady() {
    if (state.view === 'session' && state.started) startSceneAudio();
    else if (state.view === 'home') startCampAudio();
  }
  for (const type of ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click']) {
    window.addEventListener(type, unlockAudio, { capture: true, passive: true });
  }
  const audioRunning = () => !!(sound.ctx && sound.ctx.state === 'running');

  // ── 캠프 마을 ─────────────────────────────────────────
  const camp = new MC.CampMap();
  const campCanvas = $('#campCanvas');
  const campRunner = new MC.Runner(campCanvas, camp, { quality: 1, maxPixels: 2.4e6, onFrame: onCampFrame });
  camp.onCute = (kind) => sound.cute(kind);
  camp.onMoktak = () => sound.moktak();

  // ── 함께 ─────────────────────────────────────────────
  // 같은 곳의 멍이와 마음 단어, 마을의 네 글자 상태 팻말이 보인다
  const net = new MC.Net();
  const residents = new MC.Residents(camp);
  net.start();
  setInterval(() => net.tick(), 1000);
  // 누군가 내 멍이에게 하트를 보내면 내 멍이가 폴짝
  // 누가 내 멍이에게 하트를 보내면: 내 멍이에게서도 하트가 퐁퐁 오르고, 누가 응원하는지 살짝 알려 준다
  // (같은 사람이 연달아 보내면 알림은 6초에 한 번만)
  const cheeredAt = new Map();
  net.onBoop = (id) => {
    const sc = state.view === 'session' ? state.sceneObj : null;
    const p = sc && sc.pup ? sc.pup : camp.pup;
    p.wake();
    if (p.mood !== 'eating') p.setMood('happy', 1.8);
    p.addHearts(3);
    p.hopV = -45;
    const now = MC.clock();
    if (now - (cheeredAt.get(id) || -99) > 6) {
      cheeredAt.set(id, now);
      const peer = net.peers.get(id);
      const name = peer && peer.s.n;
      toast(name ? `${name}님이 나를 응원해주고 있어요!` : '누군가 나를 응원해주고 있어요!');
    }
  };
  camp.onBoop = (id) => {
    if (!residents.is(id)) net.boop(id);
    const v = camp.visitors.get(id);
    if (v) showName(campName, v.pup, v.st.n, false, () => camp.visitors.get(id) === v && !v.leaving);
  };

  // ── 닉네임: 지금 마음을 나타내는 단어 ─────────────────────
  // 처음 들어올 때 한 번만 묻는다. 다른 사람의 단어는 그 멍이를 눌러야 머리 위에 잠깐 뜬다
  const MOODS = ['포근함', '나른함', '설렘', '몽글몽글', '노곤노곤', '차분함', '잔잔함', '싱숭생숭', '두근두근', '홀가분',
    '고요', '뭉게구름', '말랑말랑', '복잡함', '지침', '멍', '느긋함', '보송보송', '따끈따끈', '살랑살랑'];
  const nickCard = $('#nickCard');
  const nickForm = $('#nickForm');
  const nickInput = $('#nickInput');
  const nickFine = $('#nickFine');
  const nickOpen = () => !nickCard.hidden;
  const pick = (a) => a[(Math.random() * a.length) | 0];

  function askNick() {
    nickInput.value = '';
    nickInput.placeholder = pick(MOODS);
    nickFine.textContent = '누가 내 멍이를 누르면 보여요';
    nickFine.classList.remove('is-warn');
    nickCard.hidden = false;
    // 휴대폰에서는 자판이 갑자기 올라오지 않게, 누를 때 연다
    if (window.matchMedia && matchMedia('(pointer: fine)').matches) {
      setTimeout(() => { try { nickInput.focus({ preventScroll: true }); } catch (e) { /* 무시 */ } }, 80);
    }
  }

  nickForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // 한글을 마무리하는 Enter 와 겹쳐도 마지막 글자까지 받도록 한 박자 뒤에 읽는다
    setTimeout(() => {
      const raw = nickInput.value.trim();
      if (raw && MC.badName(raw)) {
        nickFine.textContent = '다른 단어는 어때요?';
        nickFine.classList.add('is-warn');
        try { nickInput.select(); } catch (err) { /* 무시 */ }
        return;
      }
      const name = MC.cleanName(raw) || MC.cleanName(nickInput.placeholder) || '멍이';
      MC.store.set('nick', name);
      net.setName(name);
      nickCard.hidden = true;
      if (state.view === 'home') {
        try { campCanvas.focus({ preventScroll: true }); } catch (err) { /* 무시 */ }
      }
    }, 0);
  });

  // ── 내 멍이 꾸미기: 마음 단어, 몸·귀 빛깔, 모자 ─────────────
  const dressCard = $('#dressCard');
  const dressName = $('#dressName');
  const dressFine = $('#dressFine');
  const dressCanvas = $('#dressPreview');
  const dress = { body: 0, ear: 0, hat: 0, ht: 0, ac: 0, gl: 0, raf: 0, pup: null, back: null };
  const dressOpen = () => !dressCard.hidden;
  function swatch(row, value, color, name, onPick, cls) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch' + (cls ? ' ' + cls : '');
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', name);
    b.title = name;
    b.dataset.v = String(value);
    const dot = document.createElement('i');
    dot.style.setProperty('--sw', color);
    b.appendChild(dot);
    b.addEventListener('click', () => onPick(value));
    row.appendChild(b);
    return b;
  }
  function markSwatches() {
    for (const [id, v] of [['#swBody', dress.body], ['#swEar', dress.ear], ['#swHat', dress.hat], ['#swStyle', dress.ht], ['#swAccessory', dress.ac], ['#swGloves', dress.gl]]) {
      for (const b of $(id).children) b.setAttribute('aria-checked', String(b.dataset.v === String(v)));
    }
    // '기본' 귀는 고른 몸에 어울리는 빛깔로
    const de = MC.Pup.defaultEar(dress.body);
    const first = $('#swEar').firstChild;
    if (first) first.firstChild.style.setProperty('--sw', `radial-gradient(circle at 35% 30%, ${de.hi}, ${de.lo})`);
    if (dress.pup) dress.pup.setLook(MC.Pup.joinCoat(dress.body, dress.ear), dress.hat, dress.ht, dress.ac, dress.gl);
  }
  function refreshCloset() {
    const owned = MC.Wardrobe.owned();
    $('#closetCount').textContent = `${owned.length} / ${MC.Wardrobe.items.length}`;
    for (const b of dressCard.querySelectorAll('[data-item]')) {
      const unlocked = owned.includes(b.dataset.item);
      b.disabled = !unlocked;
      b.querySelector('.closet-state').textContent = unlocked ? '보유' : '낚시로 얻어요';
    }
  }
  function buildSwatches() {
    if ($('#swBody').children.length) return;
    for (const b of MC.Pup.BODIES) swatch($('#swBody'), b.i, `radial-gradient(circle at 35% 30%, ${b.fur}, ${b.lo})`, b.name, (v) => { dress.body = v; markSwatches(); });
    swatch($('#swEar'), 0, '#fff', '기본', (v) => { dress.ear = v; markSwatches(); }, 'swatch-default');
    for (const e of MC.Pup.EARS) swatch($('#swEar'), e.i, `radial-gradient(circle at 35% 30%, ${e.hi}, ${e.lo})`, e.name, (v) => { dress.ear = v; markSwatches(); });
    const HAT_NAMES = ['빨강', '파랑', '초록', '노랑', '보라', '분홍'];
    for (const h of MC.Pup.HATS_LIST) swatch($('#swHat'), h.i, `linear-gradient(${h.top}, ${h.bot})`, HAT_NAMES[h.i] || '모자', (v) => { dress.hat = v; markSwatches(); });
    for (const [id, slot, defaultName] of [['#swStyle', 'ht', '기본 비니'], ['#swAccessory', 'ac', '벗기'], ['#swGloves', 'gl', '벗기']]) {
      const choices = [{ value: 0, name: defaultName, icon: slot === 'ht' ? '🧢' : '—' }, ...MC.Wardrobe.items.filter(item => item.slot === slot)];
      for (const item of choices) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'closet-item';
        b.setAttribute('role', 'radio'); b.setAttribute('aria-label', item.name);
        b.dataset.v = String(item.value);
        if (item.id) b.dataset.item = item.id;
        const icon = document.createElement('span'); icon.className = 'closet-icon'; icon.textContent = item.icon; icon.setAttribute('aria-hidden', 'true');
        const name = document.createElement('span'); name.textContent = item.name;
        const status = document.createElement('small'); status.className = 'closet-state'; status.textContent = item.id ? '낚시로 얻어요' : '기본';
        b.append(icon, name, status);
        b.addEventListener('click', () => { dress[slot] = item.value; markSwatches(); });
        $(id).appendChild(b);
      }
    }
    // 방향키로 고르기 (radiogroup)
    for (const row of [$('#swBody'), $('#swEar'), $('#swHat'), $('#swStyle'), $('#swAccessory'), $('#swGloves')]) {
      row.addEventListener('keydown', (e) => {
        const items = [...row.children].filter(item => !item.disabled);
        const i = items.indexOf(document.activeElement);
        if (i < 0) return;
        const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        const n = items[(i + d + items.length) % items.length];
        n.focus();
        n.click();
      });
    }
  }
  function drawDress(ts) {
    if (!dressOpen()) return;
    const c = dressCanvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = c.clientWidth || 168;
    const H = c.clientHeight || 150;
    if (c.width !== Math.round(W * dpr)) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    }
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    // 바닥에 은은한 빛
    const grd = g.createRadialGradient(W / 2, H - 14, 4, W / 2, H - 14, W * 0.42);
    grd.addColorStop(0, 'rgba(255,214,160,0.35)');
    grd.addColorStop(1, 'rgba(255,214,160,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, W, H);
    const p = dress.pup;
    const now = ts || performance.now();
    const dt = Math.min(0.05, (now - (dress.last || now)) / 1000);
    dress.last = now;
    p.update(dt, { E: 0.8, noSleep: true });
    // 모자 꼭대기까지 캔버스 안에 들도록
    p.k = Math.min(0.92, (H - 16) / 160);
    p.x = W / 2;
    p.y = H - 10;
    p.draw(g, dpr);
    dress.raf = requestAnimationFrame(drawDress);
  }
  function openDress() {
    buildSwatches();
    const sp = MC.Pup.splitCoat(net.look.c);
    Object.assign(dress, { body: sp.body, ear: sp.ear, hat: net.look.h, ht: net.look.ht, ac: net.look.ac, gl: net.look.gl, back: document.activeElement, last: 0 });
    if (!dress.pup) dress.pup = new MC.Pup({ outfit: 'beanie' });
    dressName.value = net.name || '';
    dressName.placeholder = pick(MOODS);
    dressFine.textContent = '다른 사람에게는 내 멍이를 누를 때 보여요';
    $('#dressShowName').checked = myNameVisible;
    dressFine.classList.remove('is-warn');
    refreshCloset();
    markSwatches();
    dressCard.hidden = false;
    cancelAnimationFrame(dress.raf);
    dress.raf = requestAnimationFrame(drawDress);
  }
  function closeDress() {
    dressCard.hidden = true;
    cancelAnimationFrame(dress.raf);
    try { if (dress.back && dress.back.focus) dress.back.focus({ preventScroll: true }); } catch (e) { /* 무시 */ }
  }
  $('#dressBtn').addEventListener('click', openDress);
  $('#dressCancel').addEventListener('click', closeDress);
  dressCard.addEventListener('click', (e) => { if (e.target === dressCard) closeDress(); });
  dressCard.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeDress();
    }
  });
  $('#dressForm').addEventListener('submit', (e) => {
    e.preventDefault();
    // 한글을 마무리하는 Enter 와 겹쳐도 마지막 글자까지 받도록 한 박자 뒤에 읽는다
    setTimeout(() => {
      const raw = dressName.value.trim();
      if (raw && MC.badName(raw)) {
        dressFine.textContent = '다른 단어는 어때요?';
        dressFine.classList.add('is-warn');
        try { dressName.select(); } catch (err) { /* 무시 */ }
        return;
      }
      const name = MC.cleanName(raw) || net.name || MC.cleanName(dressName.placeholder) || '멍이';
      MC.store.set('nick', name);
      net.setName(name);
      const look = net.setLook(MC.Pup.joinCoat(dress.body, dress.ear), dress.hat, dress.ht, dress.ac, dress.gl);
      camp.pup.setLook(look.c, look.h, look.ht, look.ac, look.gl);
      if (state.sceneObj && state.sceneObj.pup) state.sceneObj.pup.setLook(look.c, look.h, look.ht, look.ac, look.gl);
      setMyNameVisible($('#dressShowName').checked);
      closeDress();
      camp.pup.poke();
      toast(`'${name}' 멍이, 새 모습이에요`);
    }, 0);
  });

  // ── 마을에서만 네 글자 상태 팻말 세우기 ────────────────
  const signCard = $('#signCard');
  const signInput = $('#signInput');
  const signFine = $('#signFine');
  const signBtn = $('#signBtn');
  const signOpen = () => !signCard.hidden;
  function signCount() {
    signFine.classList.remove('is-warn');
    signFine.textContent = `${Array.from(signInput.value).length} / 4 · 같은 마을의 멍이들에게 보여요`;
  }
  function limitSign() {
    signInput.value = Array.from(signInput.value.normalize('NFC')).slice(0, 4).join('');
    signCount();
  }
  function closeSign() {
    signCard.hidden = true;
    signBtn.focus({ preventScroll: true });
  }
  function saveSign(text) {
    camp.sign = MC.cleanSign(text);
    MC.store.set('sign', camp.sign);
    signBtn.setAttribute('aria-pressed', String(!!camp.sign));
    net.set(camp.netState());
    closeSign();
    toast(camp.sign ? '멍이 곁에 팻말을 세웠어요' : '팻말을 치웠어요');
  }
  signBtn.setAttribute('aria-pressed', String(!!camp.sign));
  signBtn.addEventListener('click', () => {
    if (state.view !== 'home') return;
    held.clear();
    camp.setKeys(0, 0);
    camp.target = null;
    signInput.value = camp.sign;
    signCount();
    $('#signRemove').disabled = !camp.sign;
    signCard.hidden = false;
    signInput.focus({ preventScroll: true });
  });
  signInput.addEventListener('input', (e) => { if (!e.isComposing) limitSign(); });
  signInput.addEventListener('compositionend', limitSign);
  $('#signCancel').addEventListener('click', closeSign);
  $('#signRemove').addEventListener('click', () => saveSign(''));
  signCard.addEventListener('click', (e) => { if (e.target === signCard) closeSign(); });
  signCard.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !e.isComposing) { e.preventDefault(); closeSign(); }
  });
  $('#signForm').addEventListener('submit', (e) => {
    e.preventDefault();
    setTimeout(() => {
      const text = MC.cleanSign(signInput.value);
      if (!text) {
        signFine.textContent = '팻말에 적을 짧은 말을 골라주세요';
        signFine.classList.add('is-warn');
        return;
      }
      saveSign(text);
    }, 0);
  });

  // ── 건의하기 ─────────────────────────────────────────
  // 이 사이트를 건네준 서버(server/presence.js)가 있을 때만 보인다. 보낸 건의는 운영자만 본다
  const suggestCard = $('#suggestCard');
  const suggestInput = $('#suggestInput');
  const suggestFine = $('#suggestFine');
  const suggestSend = $('#suggestSend');
  const presenceMeta = document.querySelector('meta[name="mc-presence"]');
  const canSuggest = !!(presenceMeta && presenceMeta.content === 'auto' && window.fetch);
  const suggestOpen = () => !suggestCard.hidden;
  let suggestBack = null;
  let ownerTaps = 0, ownerTapStart = 0;
  if (canSuggest) $('#suggestBtn').hidden = false;
  function suggestNote(msg) {
    if (msg) {
      suggestFine.textContent = msg;
      suggestFine.classList.add('is-warn');
    } else {
      suggestFine.classList.remove('is-warn');
      suggestFine.textContent = `${Array.from(suggestInput.value).length} / 1000`;
    }
  }
  function openSuggest() {
    suggestBack = document.activeElement;
    ownerTaps = 0;
    suggestCard.hidden = false;
    suggestNote('');
    if (window.matchMedia && matchMedia('(pointer: fine)').matches) {
      setTimeout(() => { try { if (suggestOpen()) suggestInput.focus({ preventScroll: true }); } catch (e) { /* 무시 */ } }, 80);
    }
  }
  function closeSuggest() {
    ownerTaps = 0;
    suggestCard.hidden = true;
    try { if (suggestBack && suggestBack.focus) suggestBack.focus({ preventScroll: true }); } catch (e) { /* 무시 */ }
  }
  $('#suggestBtn').addEventListener('click', openSuggest);
  $('#suggestCancel').addEventListener('click', closeSuggest);
  suggestCard.addEventListener('click', (e) => { if (e.target === suggestCard) closeSuggest(); });
  suggestCard.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSuggest();
    }
  });
  suggestInput.addEventListener('input', () => suggestNote(''));
  $('#suggestForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = suggestInput.value.trim();
    if (Array.from(text).length < 2) {
      suggestNote('조금만 더 적어 주세요');
      suggestInput.focus();
      return;
    }
    suggestSend.disabled = true;
    try {
      const r = await fetch('api/suggest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, nick: net.name || '', place: state.view === 'session' ? state.scene : 'home' }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) {
        suggestInput.value = '';
        closeSuggest();
        toast('고마워요. 잘 전했어요');
      } else suggestNote(j.error === 'busy' ? '조금 쉬었다가 다시 보내 주세요' : '보내지 못했어요. 잠시 뒤에 다시 해 주세요');
    } catch (err) {
      suggestNote('보내지 못했어요. 인터넷을 확인해 주세요');
    }
    suggestSend.disabled = false;
  });

  // 운영자: 비밀번호는 저장하지 않고 서버가 확인한 뒤에만 건의를 읽는다.
  const ownerCard = $('#ownerCard');
  const ownerLogin = $('#ownerLogin');
  const ownerInbox = $('#ownerInbox');
  const ownerPassword = $('#ownerPassword');
  const ownerFine = $('#ownerFine');
  const ownerList = $('#ownerList');
  const ownerOpen = () => !ownerCard.hidden;
  let ownerAbort = null;
  let ownerLogout = Promise.resolve();
  let ownerPresenceTimer = null;
  let ownerPresenceBusy = false;

  function lockOwner() {
    clearInterval(ownerPresenceTimer);
    ownerPresenceTimer = null;
    $('#ownerOnline').textContent = '—';
    $('#ownerPlaces').textContent = '';
    ownerLogin.hidden = false;
    ownerInbox.hidden = true;
    ownerPassword.value = '';
    ownerList.replaceChildren();
    $('#ownerCount').textContent = '';
  }
  function closeOwner() {
    if (ownerAbort) ownerAbort.abort();
    ownerCard.hidden = true;
    lockOwner();
    ownerFine.textContent = '';
    ownerLogout = fetch('api/suggestions/logout', { method: 'POST', cache: 'no-store' }).catch(() => {});
    suggestCard.hidden = false;
    $('#suggestCancel').focus({ preventScroll: true });
  }
  function openOwner() {
    if (!canSuggest || !suggestOpen() || ownerOpen()) return;
    ownerTaps = 0;
    held.clear(); camp.setKeys(0, 0); camp.target = null;
    suggestCard.hidden = true;
    lockOwner();
    ownerFine.textContent = '';
    $('#ownerSubmit').disabled = false;
    ownerAbort = new AbortController();
    ownerCard.hidden = false;
    ownerPassword.focus({ preventScroll: true });
  }
  // 제목을 빠르게 다섯 번 누르면 연다. 비밀번호 인증은 계속 서버에서 확인한다.
  $('#suggest-title').addEventListener('click', () => {
    const now = performance.now();
    if (!ownerTaps || now - ownerTapStart > 3000) {
      ownerTaps = 0;
      ownerTapStart = now;
    }
    if (++ownerTaps === 5) openOwner();
  });
  $('#ownerCancel').addEventListener('click', closeOwner);
  $('#ownerLock').addEventListener('click', closeOwner);
  ownerCard.addEventListener('click', e => { if (e.target === ownerCard) closeOwner(); });
  ownerCard.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); closeOwner(); }
    if (e.key === 'Tab') {
      const fields = Array.from(ownerCard.querySelectorAll('input, button')).filter(n => !n.disabled && n.getClientRects().length);
      const first = fields[0], last = fields[fields.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  async function ownerRequest(path, method = 'GET', data) {
    const controller = ownerAbort;
    const response = await fetch('api/suggestions' + path, {
      method, cache: 'no-store', credentials: 'same-origin', signal: controller.signal,
      ...(data ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) } : {}),
    });
    const result = await response.json().catch(() => ({}));
    if (controller !== ownerAbort || controller.signal.aborted) throw new DOMException('Closed', 'AbortError');
    if (!response.ok) {
      if (response.status === 401) lockOwner();
      const messages = { password: '비밀번호가 맞지 않아요.', auth: '비밀번호를 다시 입력해 주세요.', busy: '잠시 뒤에 다시 시도해 주세요.', unconfigured: '운영자 비밀번호가 아직 설정되지 않았어요.', storage: '저장하지 못했어요. 잠시 뒤에 다시 시도해 주세요.' };
      throw new Error(messages[result.error] || '불러오지 못했어요. 잠시 뒤에 다시 시도해 주세요.');
    }
    return result;
  }
  function ownerError(error) {
    if (error.name !== 'AbortError' && ownerOpen()) ownerFine.textContent = error.name === 'TypeError' ? '인터넷 연결을 확인해 주세요.' : error.message;
  }
  function ownerButton(label, action) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'btn btn-ghost'; button.textContent = label;
    button.addEventListener('click', action);
    return button;
  }
  async function loadOwnerPresence() {
    if (ownerPresenceBusy || !ownerOpen() || ownerInbox.hidden) return;
    ownerPresenceBusy = true;
    try {
      const data = await ownerRequest('/presence');
      $('#ownerOnline').textContent = String(data.total);
      const names = { map: '마을', fire: '모닥불', firetower: '탑불멍', water: '바다', forest: '숲', tent: '글램핑', lodge: '숙소' };
      $('#ownerPlaces').textContent = Object.entries(names).map(([id, name]) => `${name} ${data.places[id] || 0}`).join(' · ');
      $('#ownerPresenceNote').textContent = '더미 제외 · 열린 화면 기준 · 5초마다 갱신';
    } catch (error) {
      if (error.name !== 'AbortError' && ownerOpen()) {
        $('#ownerOnline').textContent = '—';
        $('#ownerPlaces').textContent = '';
        $('#ownerPresenceNote').textContent = '접속 현황을 불러오지 못했어요. 잠시 후 다시 확인해요.';
      }
    } finally { ownerPresenceBusy = false; }
  }
  async function loadOwner() {
    const data = await ownerRequest('');
    if (!ownerOpen()) return;
    ownerList.replaceChildren();
    $('#ownerCount').textContent = data.count ? `받은 건의 ${data.count}개 · 최신순` : '아직 받은 건의가 없어요.';
    for (const item of data.items) {
      const article = document.createElement('article'); article.className = 'owner-item';
      const meta = document.createElement('p'); meta.className = 'owner-meta';
      const place = SCENES[item.place]?.place || ({ home: '마을', map: '마을' })[item.place] || '';
      const date = new Date(item.at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      meta.textContent = [date, place, item.nick].filter(Boolean).join(' · ');
      const text = document.createElement('p'); text.className = 'owner-text'; text.textContent = item.text;
      const actions = document.createElement('div'); actions.className = 'owner-delete-row';
      const remove = ownerButton('삭제하기', () => {
        const note = document.createElement('p'); note.className = 'owner-delete-note'; note.textContent = '이 건의를 삭제할까요?';
        const cancel = ownerButton('취소', () => { actions.replaceChildren(remove); remove.focus(); });
        const confirm = ownerButton('삭제', async () => {
          confirm.disabled = cancel.disabled = true; ownerFine.textContent = '';
          try {
            await ownerRequest('/' + encodeURIComponent(item.id), 'DELETE');
            await loadOwner();
            if (ownerOpen()) { ownerFine.textContent = '삭제했어요.'; $('#ownerRefresh').focus({ preventScroll: true }); }
          } catch (error) { ownerError(error); confirm.disabled = cancel.disabled = false; }
        });
        confirm.className = 'btn btn-ember';
        actions.replaceChildren(note, cancel, confirm); confirm.focus({ preventScroll: true });
      });
      actions.append(remove); article.append(meta, text, actions); ownerList.append(article);
    }
    ownerLogin.hidden = true;
    ownerInbox.hidden = false;
    await loadOwnerPresence();
    if (ownerOpen() && !ownerPresenceTimer) ownerPresenceTimer = setInterval(loadOwnerPresence, 5000);
  }
  ownerLogin.addEventListener('submit', async e => {
    e.preventDefault();
    if ($('#ownerSubmit').disabled) return;
    $('#ownerSubmit').disabled = true; ownerFine.textContent = '';
    const controller = ownerAbort;
    const password = ownerPassword.value;
    ownerPassword.value = '';
    try {
      await ownerLogout;
      if (controller !== ownerAbort || controller.signal.aborted) return;
      await ownerRequest('/login', 'POST', { password });
      await loadOwner();
      if (ownerOpen()) $('#ownerRefresh').focus({ preventScroll: true });
    } catch (error) { ownerError(error); }
    finally { if (controller === ownerAbort) $('#ownerSubmit').disabled = false; }
  });
  $('#ownerRefresh').addEventListener('click', async () => {
    $('#ownerRefresh').disabled = true; ownerFine.textContent = '';
    try { await loadOwner(); } catch (error) { ownerError(error); }
    finally { $('#ownerRefresh').disabled = false; }
  });

  // 내 닉네임은 표시 선택을 기억하고, 다른 멍이의 닉네임은 눌렀을 때 잠깐 띄운다.
  const campName = $('#campName');
  const sceneName = $('#sceneName');
  let myNameVisible = MC.store.get('showMyName', true) !== false;
  const selfNames = [$('#campSelfName'), $('#sceneSelfName')];
  function setMyNameVisible(visible) {
    myNameVisible = visible;
    MC.store.set('showMyName', visible);
    if (!visible) for (const el of selfNames) el.hidden = true;
  }
  for (const el of selfNames) el.addEventListener('click', (e) => {
    e.stopPropagation();
    setMyNameVisible(false);
    toast('닉네임을 숨겼어요. 내 멍이를 누르면 다시 보여요.');
  });
  for (const el of selfNames) el.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' || e.code === 'Space') e.stopPropagation();
  });
  function placeMyName(el, pup, toScreen) {
    el.hidden = !myNameVisible || !net.name || !pup;
    if (el.hidden) return;
    if (el.textContent !== net.name) {
      el.textContent = net.name;
      el.setAttribute('aria-label', `${net.name}, 누르면 내 닉네임 숨기기`);
    }
    const up = (pup.lie >= 0.5 ? 104 : 160) - (pup.hop || 0) + (pup.seatLift || 0);
    const byPavilion = pup === camp.pup && (camp.near?.id === 'moktak' || camp.pavilionSeat || camp.pavilionMove);
    const q = toScreen(pup.x, byPavilion ? pup.y + 16 : pup.y - up * pup.k);
    el.style.transform = `translate(${q.x.toFixed(1)}px, ${q.y.toFixed(1)}px) translate(-50%, ${byPavilion ? '0' : '-100%'})`;
  }
  const tag = { el: null, pup: null, until: 0, alive: null };
  function showName(el, pup, name, me, alive) {
    if (!name) return;
    for (const other of [campName, sceneName]) if (other !== el) other.classList.remove('is-on');
    el.textContent = name;
    el.classList.toggle('is-me', !!me);
    Object.assign(tag, { el, pup, until: MC.clock() + 3.2, alive: alive || null });
    placeName(el === campName ? (x, y) => camp.toScreen(x, y) : (x, y) => ({ x, y }));
    el.classList.add('is-on');
  }
  function hideName() {
    campName.classList.remove('is-on');
    sceneName.classList.remove('is-on');
    tag.pup = null;
  }
  function placeName(toScreen) {
    const p = tag.pup;
    if (!p) return;
    if (MC.clock() > tag.until || (tag.alive && !tag.alive())) {
      hideName();
      return;
    }
    // 머리(모자) 꼭대기 조금 위. 엎드려 있으면 더 낮게, 폴짝 뛰면 함께
    const up = (p.lie >= 0.5 ? 104 : 152) - (p.hop || 0) + (p.seatLift || 0);
    const byPavilion = p === camp.pup && (camp.near?.id === 'moktak' || camp.pavilionSeat || camp.pavilionMove);
    const q = toScreen(p.x, byPavilion ? p.y + 16 : p.y - up * p.k);
    tag.el.style.transform = `translate(${q.x.toFixed(1)}px, ${q.y.toFixed(1)}px) translate(-50%, ${byPavilion ? '0' : '-100%'})`;
  }

  // ── 새 버전 ───────────────────────────────────────────
  // 이 페이지를 건넨 서버(server/presence.js)가 다시 배포되어 내용이 바뀌면, 다시 이어질 때 알려 준다.
  // 쉬는 중에는 방해하지 않는다: 마을로 돌아올 때(화면이 어두워진 사이), 또는 아직 소리를 켜지 않았거나
  // 소리 없이 다른 탭에 가 있을 때 조용히 새로 고친다
  const myVersion = (() => {
    const m = document.querySelector('meta[name="mc-version"]');
    return m && m.content ? m.content : '';
  })();
  let newVersion = '';
  net.onVersion = (v) => {
    if (!myVersion || !v || v === myVersion) return;
    newVersion = v;
    if (state.view === 'home' && !audioRunning()) freshen();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.view === 'home' && !audioRunning()) freshen();
  });
  function freshen(backTo) {
    if (!newVersion) return false;
    try {
      // 한 번 새로 고쳤는데도 옛것이 왔으면(느린 인터넷에 캐시가 대신 답했으면) 되풀이하지 않는다
      if (sessionStorage.getItem('mungcamp.freshFor') === newVersion) return false;
      sessionStorage.setItem('mungcamp.freshFor', newVersion);
      if (backTo) sessionStorage.setItem('mungcamp.backTo', backTo);
    } catch (e) {
      return false; // 기록할 수 없으면 되풀이를 막을 수 없으니 하지 않는다
    }
    location.reload();
    return true;
  }
  // 새로 고친 뒤에는 떠나온 자리 곁에서 다시 시작한다
  function backToSpot() {
    let spot = null;
    try {
      spot = sessionStorage.getItem('mungcamp.backTo');
      sessionStorage.removeItem('mungcamp.backTo');
    } catch (e) { /* 저장 불가 */ }
    if (spot && SCENES[spot] && state.view === 'home') {
      state.lastSpot = spot;
      camp.placeAt(spot);
    }
  }

  // 내 멍이도 내 털빛과 모자를 입는다
  camp.pup.setLook(net.look.c, net.look.h, net.look.ht, net.look.ac, net.look.gl);
  const together = { camp: $('#campTogether'), session: $('#sessionTogether'), at: 0 };
  function showTogether(el, n) {
    const on = n >= 2;
    if (el.hidden === on) el.hidden = !on;
    if (on) {
      const b = el.querySelector('b');
      if (b.textContent !== String(n)) b.textContent = String(n);
    }
  }
  // 마을 지도 위 자리 이름 옆에, 그 안에 몇 명이 앉아 있는지
  function updateTogether() {
    const now = MC.clock();
    if (now - together.at < 0.5) return;
    together.at = now;
    if (state.view === 'session') {
      showTogether(together.session, net.count(state.scene) + residents.count(state.scene));
      return;
    }
    // 마을에 있는 사람과 멍캠프 어디에든 있는 사람 (둘 이상일 때만)
    const here = net.count('map') + residents.count('map');
    const all = net.total() + residents.total();
    const el = together.camp;
    const on = all >= 2;
    if (el.hidden === on) el.hidden = !on;
    if (on) {
      const bh = el.querySelector('[data-n="here"]');
      const ba = el.querySelector('[data-n="all"]');
      if (bh.textContent !== String(here)) bh.textContent = String(here);
      if (ba.textContent !== String(all)) ba.textContent = String(all);
      el.setAttribute('aria-label', `마을에 ${here}명, 멍캠프에 모두 ${all}명`);
    }
    for (const s of MC.CAMP_SPOTS) {
      const e = spotEls[s.id];
      if (!e || !e.count) continue;
      const n = net.count(s.id) + residents.count(s.id);
      const on = n > 0;
      if (e.count.hidden === on) e.count.hidden = !on;
      if (on && e.count.lastChild.textContent !== String(n)) e.count.lastChild.textContent = String(n);
    }
  }

  const spotEls = {};
  for (const s of MC.CAMP_SPOTS) {
    const el = document.createElement('div');
    el.className = 'spot';
    el.dataset.tone = s.tone;
    const name = document.createElement('p');
    name.className = 'spot-name';
    name.textContent = s.label;
    let count = null;
    if (s.id !== 'moktak') {
      count = document.createElement('span');
      count.className = 'spot-count';
      count.hidden = true;
      count.innerHTML = '<svg class="ico-pup" viewBox="0 0 120 104" aria-hidden="true"><use href="#pup-face"/></svg><b></b>';
      name.appendChild(count);
    }
    const act = document.createElement('button');
    act.type = 'button';
    act.className = 'spot-act';
    act.textContent = s.act;
    act.hidden = true;
    act.addEventListener('click', () => activateSpot(s));
    el.append(name, act);
    $('#campLayer').appendChild(el);
    spotEls[s.id] = { el, act, count };
  }

  // 의자: 펴고 앉아 책 읽기. 걷기 시작하면 저절로 접힌다
  const chairBtn = $('#chairBtn');
  chairBtn.addEventListener('click', () => {
    const on = camp.toggleChair();
    chairBtn.setAttribute('aria-pressed', String(on));
    campCanvas.focus({ preventScroll: true });
  });

  const reading = new MC.Reading({
    canRead: () => {
      if (state.leaving || (state.view === 'session' && (!state.started || !$('#endCard').hidden))) return false;
      const pup = state.view === 'home' ? camp.pup : state.sceneObj && state.sceneObj.pup;
      return !!(pup && pup.chairOn && pup.chair === 1);
    },
    onOpen: () => {
      held.clear(); applyKeys(); closePanels();
      if (state.timerDone) stay(); // 쉼 안내가 뜨기 직전에 책을 골라도 소리와 밝기를 유지한다.
      wake();
    },
    onClose: () => wake(),
  });

  camp.sea.onToast = msg => toast(msg);
  const seaControls = $('#seaControls'), seaAction = $('#seaAction'), seaStop = $('#seaStop'), seaTravel = $('#seaTravel'), seaStatus = $('#seaStatus');
  let seaLayoutKey = '';
  seaAction.addEventListener('click', () => { camp.sea.action(); campCanvas.focus({ preventScroll: true }); });
  seaStop.addEventListener('click', () => { camp.sea.stopFishing(); campCanvas.focus({ preventScroll: true }); });
  seaTravel.addEventListener('click', () => { camp.sea.travel(); campCanvas.focus({ preventScroll: true }); });
  const seaLabels = [
    ['낚시 잔교', (MC.CampSea.deck.x0 + MC.CampSea.deck.x1) / 2, MC.CampSea.deck.y0 - 30],
    ['작은 선착장', MC.CampSea.berth.x, MC.CampSea.berth.y + 88],
  ].map(([text, x, y]) => {
    const el = document.createElement('div'); el.className = 'spot'; el.dataset.tone = 'sea';
    const name = document.createElement('p'); name.className = 'spot-name'; name.textContent = text;
    el.append(name); $('#campLayer').append(el); return { el, x, y };
  });

  const hint = $('#campHint');
  hint.textContent = window.matchMedia && window.matchMedia('(pointer: coarse)').matches ? '가고 싶은 곳을 톡' : '방향키로 걸어요';
  if (state.walked) hint.classList.add('is-off');

  function onCampFrame() {
    for (const { el, x, y } of seaLabels) {
      const p = camp.toScreen(x, y);
      el.style.visibility = p.x < -130 || p.x > camp.w + 130 || p.y < -50 || p.y > camp.h + 100 ? 'hidden' : 'visible';
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
    }
    const sea = camp.sea.controls();
    seaControls.hidden = !sea;
    $('#camp').classList.toggle('has-sea-controls', !!sea);
    chairBtn.disabled = camp.sea.boating || !!camp.sea.fishing;
    if (sea) {
      if (seaAction.textContent !== sea.label) seaAction.textContent = sea.label;
      if (seaStatus.textContent !== sea.detail) seaStatus.textContent = sea.detail;
      seaStop.hidden = !sea.stop;
      seaTravel.hidden = !sea.travel;
      if (sea.travel && seaTravel.textContent !== sea.travel) seaTravel.textContent = sea.travel;
      seaAction.disabled = !!sea.waiting;
      seaControls.classList.toggle('is-biting', !!sea.bite);
      const layoutKey = sea.label + sea.detail + sea.travel + camp.w;
      if (layoutKey !== seaLayoutKey) {
        seaLayoutKey = layoutKey;
        $('#camp').style.setProperty('--sea-ui-height', seaControls.offsetHeight + 'px');
      }
    }
    // 자리 이름과 '앉기' 단추를 지도 위 제자리에
    for (const s of MC.CAMP_SPOTS) {
      const { el, act } = spotEls[s.id];
      const p = camp.toScreen(s.ax, s.ay);
      const off = p.x < -120 || p.x > camp.w + 120 || p.y < -60 || p.y > camp.h + 160;
      el.style.visibility = off ? 'hidden' : 'visible';
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
      const near = camp.near === s;
      if (act.hidden === near) act.hidden = !near;
    }
    const chairOn = String(camp.pup.chairOn);
    if (chairBtn.getAttribute('aria-pressed') !== chairOn) chairBtn.setAttribute('aria-pressed', chairOn);
    reading.sync();
    if (camp.moving && !state.walked) {
      state.walked = true;
      MC.store.set('walked', true);
      hint.classList.add('is-off');
    }
    if (tag.el === campName) placeName((x, y) => camp.toScreen(x, y));
    placeMyName(selfNames[0], camp.pup, (x, y) => camp.toScreen(x, y));
    // 함께 있는 사람들에게 내 자리를 알리고, 그들의 멍이를 데려온다
    net.set(camp.netState());
    camp.syncVisitors(residents.merge('map', net.list('map'), camp));
    net.tick();
    updateTogether();
    // 걷는 곳에 따라 소리가 섞인다
    const a = state.campAudio;
    const now = MC.clock();
    if (a && now - a.last > 0.3) {
      a.last = now;
      const pr = camp.presence();
      // 글램핑장 화로 곁에서도 장작 소리가 작게
      a.fire.presence(0.06 + 0.94 * Math.max(pr.fire, 0.4 * pr.glamp));
      a.water.presence(0.06 + 0.94 * pr.water);
      a.forest.presence(0.04 + 0.96 * pr.forest);
      a.map.setParams({ pavilion: pr.pavilion, lodge: pr.lodge });
    }
  }

  function startCampAudio() {
    if (state.campAudio || !audioRunning() || state.view !== 'home') return;
    const fire = new MC.FireScape(sound);
    const water = new MC.WaterScape(sound);
    const forest = new MC.ForestScape(sound);
    const map = new MC.MapScape(sound);
    fire.begin({ fire: 1, crickets: 0, wind: 0.2 }, 2);
    water.begin({ waves: 1, wind: 0.2 }, 2);
    forest.begin({ stream: 0.8, birds: 0.35, wind: 0.5 }, 2);
    map.begin({ night: 1 }, 3);
    for (const sc of [fire, water, forest]) sc.presence(0);
    fire.setParams({ intensity: 0.8 });
    camp.fireEvents = () => fire.drain();
    state.campAudio = { fire, water, forest, map, last: 0 };
  }

  function stopCampAudio() {
    const a = state.campAudio;
    if (!a) return;
    for (const k of ['fire', 'water', 'forest', 'map']) a[k].end(0.8);
    camp.fireEvents = null;
    state.campAudio = null;
  }

  function startCamp() {
    if (state.view !== 'home') return;
    if (state.campVisible) campRunner.start();
    startCampAudio();
  }

  function stopCamp() {
    campRunner.stop();
    camp.setKeys(0, 0);
    stopCampAudio();
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      state.campVisible = entries[0].isIntersecting;
      if (state.view !== 'home') return;
      if (state.campVisible) campRunner.start();
      else campRunner.stop();
    }).observe($('#camp'));
  }

  function activateSpot(s) {
    if (s.id === 'moktak') {
      camp.hitMoktak();
      return;
    }
    enterScene(s.id);
  }

  // 장소에는 걸어서만 들어간다: 마을에서 '들어가기'를 누른 것만 연다
  function enterScene(id) {
    state.lastSpot = id;
    state.allowEnter = id;
    location.hash = id;
  }

  // 지도: 톡 하면 그리로 걸어가고, 끌면 지도를 둘러본다.
  // 지도 위아래 끝에 닿은 뒤에도 더 끌면 페이지가 스크롤된다 (아래의 '다른 곳' 카드로)
  let drag = null;
  let dragged = false;
  campCanvas.addEventListener('pointerdown', (e) => {
    if (drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    dragged = false;
  });
  campCanvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved) {
      if (Math.hypot(dx, dy) < 8) return;
      drag.moved = true;
      try { campCanvas.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
    }
    drag.x = e.clientX;
    drag.y = e.clientY;
    camp.pan(dx, dy);
    e.preventDefault();
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    dragged = drag.moved;
    drag = null;
  };
  campCanvas.addEventListener('pointerup', endDrag);
  campCanvas.addEventListener('pointercancel', endDrag);

  campCanvas.addEventListener('click', (e) => {
    // 끌어서 둘러본 뒤 손을 뗀 것은 톡이 아니다
    if (dragged) {
      dragged = false;
      return;
    }
    const r = campCanvas.getBoundingClientRect();
    if (camp.tap(e.clientX - r.left, e.clientY - r.top) === 'pup') setMyNameVisible(true);
  });

  // 방향키·WASD로 걷기
  const held = new Set();
  const KEYMAP = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
  function applyKeys() {
    let x = 0;
    let y = 0;
    for (const code of held) {
      x += KEYMAP[code][0];
      y += KEYMAP[code][1];
    }
    if (state.view === 'session') {
      const sc = state.sceneObj;
      if (sc && sc.crowd) sc.crowd.setKeys(x, y);
    } else camp.setKeys(x, y);
  }

  // ── 세션 열고 닫기 ─────────────────────────────────────
  function openSession(name) {
    reading.close();
    if (state.view === 'session') {
      if (state.scene === name) return;
      teardown();
    }
    const def = SCENES[name];
    Object.assign(state, {
      view: 'session', scene: name, def, started: false, timerDone: false,
      leaving: false, worryShown: false,
    });
    stopCamp();
    home.hidden = true;
    session.hidden = false;
    document.body.classList.add('in-session');
    session.dataset.scene = name;

    setCurtain(1, 0);
    const scene = def.make({});
    state.sceneObj = scene;
    state.runner = new MC.Runner(stage, scene, { quality: MC.reducedMotion ? 0.7 : 1, onFrame });
    state.runner.start();
    requestAnimationFrame(() => requestAnimationFrame(() => setCurtain(0, 2.4)));

    buildDock(def);
    buildSoundPanel(name, def);
    buildBreathPanel();
    closePanels();
    $('#endCard').hidden = true;
    startSession();
  }

  function startSession() {
    const scene = state.sceneObj;
    if (state.scene === 'fire' || state.scene === 'firetower') {
      scene.age = () => elapsedSec();
      scene.onWorryBurned = () => toast('불티가 되어 날아갔어요');
    }
    if (state.scene === 'water' || state.scene === 'forest') scene.onToast = (msg) => toast(msg);
    if (state.scene === 'tent') {
      // 문으로 걸어 나가면 마을의 글램핑장 앞으로
      scene.onExit = () => leave();
      scene.onToggle = (id, on) => setPressed(id, on);
      scene.onToast = (msg) => toast(msg);
    }
    if (state.scene === 'lodge') {
      // 미닫이문으로 걸어 나가면 마을의 숙소 앞으로
      scene.onExit = () => leave();
      scene.onToast = (msg) => toast(msg);
      scene.onInside = (on) => setPressed('kotatsu', on);
    }
    scene.onCute = (kind) => sound.cute(kind);
    if (scene.crowd) {
      const crowd = scene.crowd;
      crowd.onBoop = (id) => {
        if (!residents.is(id)) net.boop(id);
        const v = crowd.visitors.get(id);
        if (v) showName(sceneName, v.pup, v.st.n, false, () => crowd.visitors.get(id) === v && !v.leaving);
      };
    }
    if (scene.pup) scene.pup.setLook(net.look.c, net.look.h, net.look.ht, net.look.ac, net.look.gl);
    state.started = true;
    state.startAt = Date.now();
    state.timerDone = false;
    clearInterval(state.timerInt);
    state.timerInt = setInterval(checkTime, 1000);
    startSceneAudio();
    requestWakeLock();
    ui.classList.remove('is-hidden');
    showGuidance(state.def.guidance);
    armIdle();
    // 주소로 바로 들어와 아직 소리를 켤 수 없으면 한 번만 알려 준다
    setTimeout(() => {
      if (state.view === 'session' && state.started && !state.scape) toast('화면을 누르면 소리가 나요');
    }, 900);
  }

  function startSceneAudio() {
    if (state.scape || !audioRunning() || !state.started) return;
    const scene = state.sceneObj;
    const scape = (state.scape = new state.def.scape(sound));
    scape.begin(state.levels);
    if (state.scene === 'fire' || state.scene === 'firetower') {
      scene.events = () => scape.drain();
      scene.onLand = (isWorry) => scape.thud(isWorry);
      scene.onPoke = () => scape.poke();
    } else if (state.scene === 'water') {
      scene.onRipple = (z, pan) => scape.plop(z, pan);
      scene.onSplash = () => scape.splash();
      scene.onWhale = (kind) => scape.whale(kind);
      scene.onBottle = () => scape.bottle();
    } else if (state.scene === 'tent') {
      scene.events = () => scape.drain();
      scene.onLog = () => scape.log();
    } else if (state.scene === 'lodge') {
      scene.onPuff = () => scape.puff();
      scene.onFlump = () => scape.flump();
    } else {
      scene.onGust = () => scape.gust();
      scene.onChirp = () => scape.chirp();
      scene.onSquirrel = () => scape.squirrel();
    }
  }

  function teardown() {
    reading.close();
    hideName();
    held.clear();
    if (state.runner) state.runner.stop();
    if (state.scape) state.scape.end();
    state.runner = null;
    state.scape = null;
    state.sceneObj = null;
    breath.stop();
    setBreathUI(false);
    clearInterval(state.timerInt);
    clearTimeout(state.idleTimer);
    clearTimeout(state.guideTimer);
    clearTimeout(state.endTimer);
    $('#guidance').classList.remove('is-on');
    $('#worryHint').hidden = true;
    releaseWakeLock();
    if (document.fullscreenElement || document.webkitFullscreenElement) toggleFullscreen();
    closePanels();
    $('#endCard').hidden = true;
    state.started = false;
  }

  function closeSession() {
    if (state.view !== 'session') return;
    hideName();
    const from = state.scene;
    // 새 버전이 와 있으면 마을로 돌아오는 이 틈에 새로 고친다
    if (freshen(state.lastSpot || from)) return;
    teardown();
    state.view = 'home';
    session.hidden = true;
    home.hidden = false;
    document.body.classList.remove('in-session');
    camp.placeAt(state.lastSpot || from);
    startCamp();
  }

  function goHome() {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* 막혀 있으면 그대로 */ }
    closeSession();
    window.scrollTo(0, 0);
  }

  // 나갈 때는 화면과 소리가 함께 천천히 잦아든다
  function leave() {
    if (state.leaving) return;
    state.leaving = true;
    reading.close();
    closePanels();
    $('#endCard').hidden = true;
    ui.classList.add('is-hidden');
    setCurtain(1, 0.9);
    if (state.scape) state.scape.duck(0, 0.9);
    setTimeout(goHome, 950);
  }

  function route() {
    const name = location.hash.slice(1);
    if (SCENES[name]) {
      if (state.allowEnter === name) {
        state.allowEnter = null;
        openSession(name);
        return;
      }
      // 주소로 바로 오거나 앞으로 가기를 눌러도 장소로 건너뛰지 않는다: 마을의 그 자리 앞에 선다
      const cur = state.view === 'session' ? state.scene : '';
      try { history.replaceState(null, '', location.pathname + location.search + (cur ? '#' + cur : '')); } catch (e) { /* 막혀 있으면 그대로 */ }
      if (state.view === 'home') {
        state.lastSpot = name;
        camp.placeAt(name);
      }
    } else if (state.view === 'session') closeSession();
  }

  // ── 진행 중 ───────────────────────────────────────────
  function onFrame() {
    const sc = state.sceneObj;
    if (!sc) return;
    if (sc.crowd) {
      sc.crowd.selfId = net.id;
      net.set(sc.crowd.state());
      sc.crowd.sync(residents.merge(state.scene, net.list(state.scene), sc));
      net.tick();
      updateTogether();
    }
    placeSceneAct(sc);
    reading.sync();
    if (sc.crowd) {
      const on = sc.crowd.pup.chairOn;
      if (state.chairShown !== on) {
        state.chairShown = on;
        setPressed('chair', on);
      }
    }
    if (tag.el === sceneName) placeName((x, y) => ({ x, y }));
    placeMyName(selfNames[1], sc.pup, (x, y) => ({ x, y }));
    if (state.scape && sc.audioParams) state.scape.params(sc.audioParams());
    if (state.scene === 'fire' && state.started) {
      const st = sc.status();
      if (st.waiting !== state.worryShown) {
        state.worryShown = st.waiting;
        $('#worryHint').hidden = !st.waiting;
        if (st.waiting) {
          hideGuidance();
          wake();
        }
      }
    }
  }

  function checkTime() {
    if (state.started && !state.timerDone && !reading.isOpen && elapsedSec() >= SESSION_MIN * 60) finishTimer();
  }

  // 20분쯤 지나면 종이 한 번 울리고, 소리와 빛이 서서히 잦아든다
  function finishTimer() {
    if (reading.isOpen) return;
    state.timerDone = true;
    sound.chime();
    if (state.scape) state.scape.duck(0.35, 18);
    setCurtain(0.4, 18);
    clearTimeout(state.endTimer);
    state.endTimer = setTimeout(() => {
      if (state.view !== 'session' || !state.timerDone) return;
      closePanels();
      breath.stop();
      setBreathUI(false);
      $('#endCard').hidden = false;
      wake();
      focusSoft($('#stayBtn'));
    }, 6000);
  }

  // 더 머물면 다시는 묻지 않는다
  function stay() {
    clearTimeout(state.endTimer);
    $('#endCard').hidden = true;
    if (state.scape) state.scape.duck(1, 3);
    setCurtain(0, 3);
    armIdle();
  }

  function showGuidance(text) {
    const g = $('#guidance');
    g.textContent = text;
    g.classList.remove('is-quick');
    requestAnimationFrame(() => g.classList.add('is-on'));
    clearTimeout(state.guideTimer);
    state.guideTimer = setTimeout(() => g.classList.remove('is-on'), 6000);
  }

  function hideGuidance() {
    clearTimeout(state.guideTimer);
    const g = $('#guidance');
    g.classList.add('is-quick');
    g.classList.remove('is-on');
  }

  // ── 조작부 ───────────────────────────────────────────
  function buildDock(def) {
    const box = $('#dockScene');
    box.textContent = '';
    state.chairShown = null;
    for (const a of def.actions) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dock-btn' + (a.primary ? ' is-primary' : '');
      b.dataset.act = a.id;
      if (a.toggle) b.setAttribute('aria-pressed', 'false');
      b.innerHTML = `<svg class="ico" aria-hidden="true"><use href="#${a.icon}"/></svg><span>${a.label}</span>`;
      b.addEventListener('click', () => doAction(a.id));
      box.appendChild(b);
    }
  }

  function doAction(id) {
    const sc = state.sceneObj;
    if (!sc || !state.started) return;
    if (id === 'log') {
      if (!sc.addLog()) toast(sc.flying.length ? (state.scene === 'firetower' ? '장작이 올라가고 있어요' : '장작이 불로 날아가고 있어요') : state.scene === 'firetower' ? '탑이 높이 쌓였어요. 잠시 불멍해요' : '장작이 넉넉해요');
    } else if (id === 'worry') {
      if (!sc.worry) togglePanel('worry');
    } else if (id === 'ripple') sc.rippleAt();
    else if (id === 'dive') {
      held.clear(); applyKeys();
      const on = sc.toggleDive();
      setPressed('dive', on); setPressed('chair', false);
      $('#dockScene [data-act="dive"] span').textContent = on ? '물 위로' : '잠수';
      $('#dockScene [data-act="ripple"] span').textContent = on ? '공기 방울' : '물수제비';
      for (const id of ['bottle', 'chair']) $('#dockScene [data-act="' + id + '"]').hidden = on;
      showGuidance(on ? '바닷속을 톡, 천천히 헤엄쳐요' : state.def.guidance);
    }
    else if (id === 'bottle') {
      if (sc.bottle) toast('병이 아직 떠가고 있어요');
      else togglePanel('bottle');
    }
    else if (id === 'breeze') sc.breeze();
    else if (id === 'chair') {
      const on = sc.crowd ? sc.crowd.toggleChair() : null;
      if (on === null) toast('여기서는 의자를 펼 수 없어요');
      setPressed('chair', !!on);
    }
    else if (id === 'stove') {
      if (!sc.addLog()) toast('난로가 따뜻해요');
    } else if (id === 'lights') setPressed('lights', sc.toggleLights());
    else if (id === 'mandarin') sc.eat();
    else if (id === 'kotatsu') setPressed('kotatsu', sc.toggleInside());
    else if (id === 'roll') sc.rollOver();
    else if (id === 'rain') setPressed('rain', sc.toggleRain());
  }

  function setPressed(id, on) {
    const b = $(`#dockScene [data-act="${id}"]`);
    if (b) b.setAttribute('aria-pressed', String(!!on));
  }

  // 장면 속에서 멍이 곁에 뜨는 단추 (텐트 침대의 '눕기')
  const sceneAct = $('#sceneAct');
  const sceneActWrap = $('#sceneActWrap');
  sceneAct.addEventListener('click', () => {
    const sc = state.sceneObj;
    if (sc && sc.usePortal) sc.usePortal();
  });
  function hideSceneAct() {
    if (!sceneActWrap.hidden) sceneActWrap.hidden = true;
  }
  function placeSceneAct(sc) {
    const hint = sc.portalHint ? sc.portalHint() : null;
    if (!hint) {
      hideSceneAct();
      return;
    }
    if (sceneAct.textContent !== hint.label) sceneAct.textContent = hint.label;
    sceneActWrap.style.transform = `translate(${hint.x.toFixed(1)}px, ${hint.y.toFixed(1)}px) translate(-50%, -100%)`;
    if (sceneActWrap.hidden) sceneActWrap.hidden = false;
  }

  function buildSoundPanel(name, def) {
    const saved = MC.store.get('levels.' + name, {});
    state.levels = {};
    const box = $('#layerSliders');
    box.textContent = '';
    for (const L of def.scape.layers) {
      const v = typeof saved[L.key] === 'number' ? saved[L.key] : L.value;
      state.levels[L.key] = v;
      const label = document.createElement('label');
      label.className = 'slider';
      const span = document.createElement('span');
      span.textContent = L.label;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = '0';
      input.max = '1';
      input.step = '0.01';
      input.value = String(v);
      input.id = `vol-${name}-${L.key}`;
      input.addEventListener('input', () => {
        state.levels[L.key] = +input.value;
        MC.store.set('levels.' + name, state.levels);
        if (state.scape) state.scape.setLevel(L.key, +input.value);
      });
      label.append(span, input);
      box.appendChild(label);
    }
    $('#vol-master').value = String(sound.volume);
    setMuteUI();
  }

  function setMuteUI() {
    const b = $('#muteBtn');
    b.setAttribute('aria-pressed', String(sound.muted));
    b.textContent = sound.muted ? '켜기' : '끄기';
  }

  function toggleMute() {
    sound.setMuted(!sound.muted);
    setMuteUI();
  }

  function buildBreathPanel() {
    const P = MC.Breath.patterns;
    const items = Object.keys(P).map((k) => ({ v: k, label: P[k].name }));
    renderSeg('#breathPatterns', items, breath.pattern, (v) => breath.setPattern(v));
    $('#breathCue').checked = breath.cueOn;
    setBreathUI(breath.active);
  }

  function setBreathUI(on) {
    $('#breathBtn').setAttribute('aria-pressed', String(on));
    $('#breathToggle').textContent = on ? '멈추기' : '시작';
  }

  function toggleBreath(force) {
    const on = typeof force === 'boolean' ? force : !breath.active;
    if (on) {
      breath.start(state.scene === 'water' ? -0.16 * MC.WAVE_T : null);
      hideGuidance();
    } else {
      breath.stop();
    }
    setBreathUI(on);
  }

  const anyPanelOpen = () => $$('.panel').some((p) => !p.hidden);
  const modalOpen = () => !$('#endCard').hidden;

  // 무엇을 적을지 막막할 때 골라 쓸 수 있는 말. 열 때마다 몇 개씩 섞어 보여 준다
  const WORRY_SAMPLES = ['시험', '숙제', '성적', '친구 사이', '진로', '가족', '건강', '발표', '마감', '잠이 안 와요', '실수한 일', '비교하는 마음', '할 일이 너무 많아요', '외로움', '내일 일', '돈'];
  const BOTTLE_SAMPLES = ['고마워', '수고했어', '괜찮아', '보고 싶어', '미안해', '잘 될 거야', '오늘도 애썼어', '안녕', '푹 자'];
  function fillChips(box, input, list, n) {
    box.textContent = '';
    const picks = list.slice().sort(() => Math.random() - 0.5).slice(0, n);
    for (const text of picks) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip-pick';
      b.textContent = text;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => {
        input.value = text;
        for (const o of box.children) o.setAttribute('aria-pressed', String(o === b));
        // 고르면 자판을 띄우지 않고 바로 '장작에 적기'·'띄우기' 단추로
        const submit = input.form && input.form.querySelector('button[type="submit"]');
        if (submit) submit.focus();
      });
      box.appendChild(b);
    }
  }
  // 직접 고쳐 쓰면 고른 표시를 맞춘다
  for (const [box, input] of [['#worryChips', '#worryInput'], ['#bottleChips', '#bottleInput']]) {
    $(input).addEventListener('input', () => {
      for (const o of $(box).children) o.setAttribute('aria-pressed', String(o.textContent === $(input).value));
    });
  }

  function openPanel(name) {
    for (const p of $$('.panel')) p.hidden = p.id !== `panel-${name}`;
    wake();
    if (name === 'worry') fillChips($('#worryChips'), $('#worryInput'), WORRY_SAMPLES, 6);
    if (name === 'bottle') fillChips($('#bottleChips'), $('#bottleInput'), BOTTLE_SAMPLES, 6);
    // 휴대폰에서는 자판이 골라 쓰기를 가리지 않게, 칸을 누를 때 연다
    if (finePointer) {
      if (name === 'worry') setTimeout(() => $('#worryInput').focus(), 30);
      if (name === 'bottle') setTimeout(() => $('#bottleInput').focus(), 30);
    }
  }
  function togglePanel(name) {
    const p = $(`#panel-${name}`);
    if (!p.hidden) closePanels();
    else openPanel(name);
  }
  function closePanels() {
    for (const p of $$('.panel')) p.hidden = true;
  }

  // 가만히 두면 조작부가 사라진다
  function wake() {
    if (state.leaving || state.view !== 'session') return;
    ui.classList.remove('is-hidden');
    session.classList.remove('is-idle');
    armIdle();
  }
  function armIdle() {
    clearTimeout(state.idleTimer);
    if (!state.started) return;
    state.idleTimer = setTimeout(() => {
      const sc = state.sceneObj;
      if (reading.isOpen || anyPanelOpen() || modalOpen() || (sc && sc.worry) || document.activeElement === $('#worryInput')) {
        armIdle();
        return;
      }
      hideUI();
    }, 5000);
  }
  function hideUI() {
    ui.classList.add('is-hidden');
    session.classList.add('is-idle');
    closePanels();
    state.hiddenAt = performance.now();
    state.moved = 0;
    if (document.activeElement && ui.contains(document.activeElement)) document.activeElement.blur();
  }

  // ── 전체 화면, 화면 꺼짐 방지 ───────────────────────────
  const fsOK = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  function toggleFullscreen() {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else {
        const el = document.documentElement;
        const p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
        if (p && p.catch) p.catch(() => {});
      }
    } catch (e) { /* 지원하지 않는 환경 */ }
  }

  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        state.wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch (e) {
      state.wakeLock = null;
    }
  }
  function releaseWakeLock() {
    try { if (state.wakeLock) state.wakeLock.release(); } catch (e) { /* 이미 풀림 */ }
    state.wakeLock = null;
  }

  // ── 이벤트 ───────────────────────────────────────────
  function stagePoint(e) {
    const r = stage.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  stage.addEventListener('pointerdown', (e) => {
    const sc = state.sceneObj;
    wake();
    if (!sc || !state.started) return;
    if (anyPanelOpen()) {
      closePanels();
      return;
    }
    const [x, y] = stagePoint(e);
    if (sc.pup && sc.crowd && sc.pup.hit(x, y)) {
      // 다른 멍이가 내 멍이 앞에 겹쳐 앉아 있으면 앞의 멍이를 누른 것으로
      const v = sc.crowd.hitVisitor(x, y);
      if (v && v.pup.y > sc.pup.y) {
        sc.crowd.boopAt(x, y);
        if (sc.onCute) sc.onCute('boop');
        return;
      }
      setMyNameVisible(true);
    }
    if (sc.pointerDown(x, y)) {
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
    }
  });
  stage.addEventListener('pointermove', (e) => {
    const sc = state.sceneObj;
    if (sc && sc.pointerMove) {
      const [x, y] = stagePoint(e);
      sc.pointerMove(x, y);
    }
  });
  const release = (e) => {
    const sc = state.sceneObj;
    if (sc && sc.pointerUp) {
      const [x, y] = stagePoint(e);
      sc.pointerUp(x, y);
    }
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);

  ui.addEventListener('pointerdown', wake, true);
  ui.addEventListener('input', wake, true);
  session.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !ui.classList.contains('is-hidden')) return;
    if (performance.now() - state.hiddenAt < 1200) return;
    state.moved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0);
    if (state.moved > 24) wake();
  });

  document.addEventListener('keydown', (e) => {
    if (reading.isOpen) return;
    if (suggestOpen() && e.ctrlKey && e.altKey && e.code === 'KeyO' && !e.repeat) {
      e.preventDefault();
      openOwner();
      return;
    }
    if (nickOpen() || suggestOpen() || ownerOpen() || dressOpen() || signOpen()) return;
    const t = e.target;
    const typing = t && t.matches && t.matches('input[type="text"], textarea');
    if (state.view === 'home') {
      if (typing || !state.campVisible) return;
      if (KEYMAP[e.code]) {
        e.preventDefault();
        held.add(e.code);
        applyKeys();
      } else if ((e.code === 'Enter' || e.code === 'Space') && camp.sea.controls() && !(t && t.closest && t.closest('button, a'))) {
        e.preventDefault();
        if (!seaAction.disabled) seaAction.click();
      } else if ((e.code === 'Enter' || e.code === 'Space') && camp.near && !(t && t.closest && t.closest('button, a'))) {
        e.preventDefault();
        activateSpot(camp.near);
      } else if (e.code === 'KeyC') chairBtn.click();
      return;
    }
    if (state.view !== 'session') return;
    if (typing) {
      if (e.key === 'Escape') closePanels();
      return;
    }
    if (modalOpen() || !state.started) return;
    if ((e.key === ' ' || e.key === 'Enter') && t && t.closest && t.closest('button')) return;
    // 방향키·WASD로 장면 안에서도 걷는다
    if (KEYMAP[e.code]) {
      e.preventDefault();
      held.add(e.code);
      applyKeys();
      wake();
      return;
    }
    // 장면 속 단추가 떠 있으면 Enter 로 (침대의 '눕기')
    if (e.code === 'Enter' && !sceneActWrap.hidden) {
      e.preventDefault();
      sceneAct.click();
      return;
    }
    wake();
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        doAction(state.def.space);
        break;
      case 'KeyB':
        toggleBreath();
        break;
      case 'KeyC':
        doAction('chair');
        break;
      case 'KeyM':
        toggleMute();
        break;
      case 'KeyH':
        hideUI();
        break;
      case 'KeyF':
        if (fsOK) toggleFullscreen();
        break;
      case 'Escape':
        if (anyPanelOpen()) closePanels();
        else if (!document.fullscreenElement) leave();
        break;
      default:
    }
  });
  document.addEventListener('keyup', (e) => {
    if (held.delete(e.code)) applyKeys();
  });
  window.addEventListener('blur', () => {
    held.clear();
    applyKeys();
  });

  $('#exitBtn').addEventListener('click', leave);
  $('#fsBtn').hidden = !fsOK;
  $('#fsBtn').addEventListener('click', toggleFullscreen);
  $('#hideBtn').addEventListener('click', hideUI);
  for (const b of $$('.dock-btn[data-panel]')) b.addEventListener('click', () => togglePanel(b.dataset.panel));
  for (const b of $$('.panel [data-close]')) b.addEventListener('click', closePanels);
  $('#vol-master').addEventListener('input', (e) => sound.setVolume(+e.target.value));
  $('#muteBtn').addEventListener('click', toggleMute);
  $('#breathCue').addEventListener('change', (e) => breath.setCue(e.target.checked));
  $('#breathToggle').addEventListener('click', () => {
    toggleBreath();
    closePanels();
  });
  $('#worryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#worryInput');
    const text = input.value.trim();
    const sc = state.sceneObj;
    if (!text || !sc || !sc.burnWorry) return;
    input.value = '';
    input.blur();
    closePanels();
    const go = () => sc.burnWorry(text);
    if (document.fonts && document.fonts.load) document.fonts.load('34px "Gamja Flower"', text).then(go, go);
    else go();
  });
  // 유리병 편지: 적은 말은 남기지 않는다. 병만 바다로
  $('#bottleForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#bottleInput');
    const sc = state.sceneObj;
    if (!input.value.trim() || !sc || !sc.sendBottle) return;
    input.value = '';
    input.blur();
    closePanels();
    sc.sendBottle();
  });
  $('#worryThrow').addEventListener('click', () => {
    if (state.sceneObj && state.sceneObj.throwWorry) state.sceneObj.throwWorry();
  });

  $('#stayBtn').addEventListener('click', stay);
  $('#leaveBtn').addEventListener('click', () => leave());

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.started) requestWakeLock();
  });
  window.addEventListener('hashchange', route);

  // 시작
  route();
  backToSpot();
  if (state.view === 'home') startCamp();
  if (!net.name) askNick();

  // 오프라인에서도 열리도록 (지원하는 곳에서만)
  try {
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      window.addEventListener('load', () => {
        try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) { /* 등록할 수 없는 환경 */ }
      });
    }
  } catch (e) { /* 등록할 수 없는 환경 */ }

  MC.app = { state, sound, camp, net, residents, openSession, enterScene, doAction, toggleBreath, finishTimer };
})(window.MC = window.MC || {});
