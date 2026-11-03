/* 멍캠프 — 화면 흐름: 캠프 마을을 걷다가 → 마음에 드는 자리에 앉아 멍 → 다시 마을로 */
(function (MC) {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const SCENES = {
    fire: {
      place: '모닥불 글램핑',
      make: (o) => new MC.FireScene({ calm: MC.reducedMotion, from: o.from }),
      scape: MC.FireScape,
      guidance: '불꽃을 바라봐요',
      actions: [
        { id: 'log', icon: 'i-log', label: '장작', primary: true },
        { id: 'worry', icon: 'i-pen', label: '걱정' },
      ],
      space: 'log',
    },
    water: {
      place: '달빛 바다',
      make: () => new MC.WaterScene({}),
      scape: MC.WaterScape,
      guidance: '파도에 숨을 맞춰요',
      actions: [{ id: 'ripple', icon: 'i-drop', label: '물결', primary: true }],
      space: 'ripple',
    },
    forest: {
      place: '편백 숲',
      make: () => new MC.ForestScene({}),
      scape: MC.ForestScape,
      guidance: '숲 소리에 귀 기울여요',
      actions: [{ id: 'breeze', icon: 'i-wind', label: '바람', primary: true }],
      space: 'breeze',
    },
    // 모닥불 글램핑의 벨텐트 안
    tent: {
      place: '글램핑 텐트',
      make: (o) => new MC.TentScene({ from: o.from }),
      scape: MC.TentScape,
      guidance: '따뜻하게 쉬어요',
      actions: [
        { id: 'stove', icon: 'i-log', label: '장작', primary: true },
        { id: 'lights', icon: 'i-bulb', label: '불빛', toggle: true },
        { id: 'rain', icon: 'i-rain', label: '비', toggle: true },
      ],
      space: 'stove',
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
    const el = $('#toast');
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
  // 같은 곳에 있는 다른 사람들의 멍이가 보인다. 이름도 글도 오가지 않는다
  const net = new MC.Net();
  net.start();
  setInterval(() => net.tick(), 1000);
  // 누군가 내 멍이에게 하트를 보내면 내 멍이가 폴짝
  net.onBoop = () => {
    const sc = state.view === 'session' ? state.sceneObj : null;
    (sc && sc.pup ? sc.pup : camp.pup).poke();
  };
  camp.onBoop = (id) => net.boop(id);

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
  camp.pup.setLook(net.look.c, net.look.h);
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
      showTogether(together.session, net.count(state.scene));
      return;
    }
    showTogether(together.camp, net.count('map'));
    for (const s of MC.CAMP_SPOTS) {
      const e = spotEls[s.id];
      if (!e || !e.count) continue;
      const n = net.count(s.id) + (s.id === 'fire' ? net.count('tent') : 0);
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

  const hint = $('#campHint');
  hint.textContent = window.matchMedia && window.matchMedia('(pointer: coarse)').matches ? '가고 싶은 곳을 톡' : '방향키로 걸어요';
  if (state.walked) hint.classList.add('is-off');

  function onCampFrame() {
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
    if (camp.moving && !state.walked) {
      state.walked = true;
      MC.store.set('walked', true);
      hint.classList.add('is-off');
    }
    // 함께 있는 사람들에게 내 자리를 알리고, 그들의 멍이를 데려온다
    net.set(camp.netState());
    camp.syncVisitors(net.list('map'));
    net.tick();
    updateTogether();
    // 걷는 곳에 따라 소리가 섞인다
    const a = state.campAudio;
    const now = MC.clock();
    if (a && now - a.last > 0.3) {
      a.last = now;
      const pr = camp.presence();
      a.fire.presence(0.06 + 0.94 * pr.fire);
      a.water.presence(0.06 + 0.94 * pr.water);
      a.forest.presence(0.04 + 0.96 * pr.forest);
      a.map.setParams({ pavilion: pr.pavilion });
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

  function enterScene(id) {
    state.lastSpot = id;
    location.hash = id;
  }

  campCanvas.addEventListener('click', (e) => {
    const r = campCanvas.getBoundingClientRect();
    camp.tap(e.clientX - r.left, e.clientY - r.top);
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

  function renderThumbs() {
    for (const c of $$('.seat-thumb')) {
      const r = c.getBoundingClientRect();
      if (!r.width) continue;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      const name = c.dataset.scene;
      const sc = name === 'fire' ? new MC.FireScene({ preview: true }) : name === 'water' ? new MC.WaterScene({ preview: true }) : new MC.ForestScene({ preview: true });
      sc.quality = 0.8;
      sc.resize(r.width, r.height, dpr);
      for (let i = 0; i < 120; i++) sc.update(1 / 60);
      const g = c.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      sc.draw(g);
    }
  }

  // ── 세션 열고 닫기 ─────────────────────────────────────
  function openSession(name) {
    // 모닥불과 텐트 사이를 오갈 때는 같은 쉼이 이어진다 (20분 종도 그대로)
    const prev = state.view === 'session' ? state.scene : null;
    const glamping = (prev === 'fire' && name === 'tent') || (prev === 'tent' && name === 'fire');
    const keep = glamping && state.started ? { startAt: state.startAt, timerDone: state.timerDone } : null;
    if (state.view === 'session') {
      if (state.scene === name) return;
      teardown();
    }
    const def = SCENES[name];
    Object.assign(state, {
      view: 'session', scene: name, def, started: false, timerDone: false,
      leaving: false, worryShown: false, switching: false,
    });
    stopCamp();
    home.hidden = true;
    session.hidden = false;
    document.body.classList.add('in-session');
    session.dataset.scene = name;

    setCurtain(1, 0);
    const scene = def.make({ from: glamping ? prev : null });
    state.sceneObj = scene;
    state.runner = new MC.Runner(stage, scene, { quality: MC.reducedMotion ? 0.7 : 1, onFrame });
    state.runner.start();
    requestAnimationFrame(() => requestAnimationFrame(() => setCurtain(0, 2.4)));

    buildDock(def);
    buildSoundPanel(name, def);
    buildBreathPanel();
    closePanels();
    $('#endCard').hidden = true;
    startSession(keep);
  }

  function startSession(keep) {
    const scene = state.sceneObj;
    if (state.scene === 'fire') {
      scene.onWorryBurned = () => toast('불티가 되어 날아갔어요');
      scene.onEnterTent = () => switchScene('tent');
    }
    if (state.scene === 'tent') {
      scene.onExit = () => switchScene('fire');
      scene.onToggle = (id, on) => setPressed(id, on);
      scene.onToast = (msg) => toast(msg);
    }
    scene.onCute = (kind) => sound.cute(kind);
    if (scene.crowd) scene.crowd.onBoop = (id) => net.boop(id);
    if (scene.pup) scene.pup.setLook(net.look.c, net.look.h);
    state.started = true;
    state.startAt = keep ? keep.startAt : Date.now();
    state.timerDone = keep ? keep.timerDone : false;
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
    if (state.scene === 'fire') {
      scene.events = () => scape.drain();
      scene.onLand = (isWorry) => scape.thud(isWorry);
      scene.onPoke = () => scape.poke();
    } else if (state.scene === 'water') {
      scene.onRipple = (z, pan) => scape.plop(z, pan);
    } else if (state.scene === 'tent') {
      scene.events = () => scape.drain();
      scene.onLog = () => scape.log();
    } else {
      scene.onGust = () => scape.gust();
    }
  }

  // 모닥불 ↔ 텐트: 화면과 소리가 살짝 잦아들었다가 다른 쪽에서 피어난다
  function switchScene(name) {
    if (state.switching || state.view !== 'session') return;
    state.switching = true;
    closePanels();
    hideSceneAct();
    setCurtain(1, 0.55);
    if (state.scape) state.scape.duck(0, 0.6);
    setTimeout(() => {
      if (state.view === 'session') location.hash = name;
    }, 600);
  }

  function teardown() {
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
    const from = state.scene;
    // 새 버전이 와 있으면 마을로 돌아오는 이 틈에 새로 고친다
    if (freshen(state.lastSpot || (from === 'tent' ? 'fire' : from))) return;
    teardown();
    state.view = 'home';
    session.hidden = true;
    home.hidden = false;
    document.body.classList.remove('in-session');
    camp.placeAt(state.lastSpot || (from === 'tent' ? 'fire' : from));
    renderThumbs();
    startCamp();
  }

  function goHome() {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* 막혀 있으면 그대로 */ }
    closeSession();
    window.scrollTo(0, 0);
  }

  // 나갈 때는 화면과 소리가 함께 천천히 잦아든다
  function leave(toMap) {
    // 텐트 안에서 뒤로 가면 모닥불 앞으로 나간다
    if (toMap !== true && state.scene === 'tent') {
      switchScene('fire');
      return;
    }
    if (state.leaving) return;
    state.leaving = true;
    closePanels();
    $('#endCard').hidden = true;
    ui.classList.add('is-hidden');
    setCurtain(1, 0.9);
    if (state.scape) state.scape.duck(0, 0.9);
    setTimeout(goHome, 950);
  }

  function route() {
    const name = location.hash.slice(1);
    if (SCENES[name]) openSession(name);
    else if (state.view === 'session') closeSession();
  }

  // ── 진행 중 ───────────────────────────────────────────
  function onFrame() {
    const sc = state.sceneObj;
    if (!sc) return;
    if (sc.crowd) {
      sc.crowd.selfId = net.id;
      net.set(sc.crowd.state());
      sc.crowd.sync(net.list(state.scene));
      net.tick();
      updateTogether();
    }
    placeSceneAct(sc);
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
    if (state.started && !state.timerDone && elapsedSec() >= SESSION_MIN * 60) finishTimer();
  }

  // 20분쯤 지나면 종이 한 번 울리고, 소리와 빛이 서서히 잦아든다
  function finishTimer() {
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
      if (!sc.addLog()) toast('장작이 넉넉해요');
    } else if (id === 'worry') {
      if (!sc.worry) togglePanel('worry');
    } else if (id === 'ripple') sc.rippleAt();
    else if (id === 'breeze') sc.breeze();
    else if (id === 'stove') {
      if (!sc.addLog()) toast('난로가 따뜻해요');
    } else if (id === 'lights') setPressed('lights', sc.toggleLights());
    else if (id === 'rain') setPressed('rain', sc.toggleRain());
  }

  function setPressed(id, on) {
    const b = $(`#dockScene [data-act="${id}"]`);
    if (b) b.setAttribute('aria-pressed', String(!!on));
  }

  // 장면 속 문 앞에서 뜨는 단추 (모닥불 앞 텐트의 '들어가기')
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
    const hint = !state.switching && sc.portalHint ? sc.portalHint() : null;
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

  function openPanel(name) {
    for (const p of $$('.panel')) p.hidden = p.id !== `panel-${name}`;
    wake();
    if (name === 'worry') setTimeout(() => $('#worryInput').focus(), 30);
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
      if (anyPanelOpen() || modalOpen() || (sc && sc.worry) || document.activeElement === $('#worryInput')) {
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
    const t = e.target;
    const typing = t && t.matches && t.matches('input[type="text"], textarea');
    if (state.view === 'home') {
      if (typing || !state.campVisible) return;
      if (KEYMAP[e.code]) {
        e.preventDefault();
        held.add(e.code);
        applyKeys();
      } else if ((e.code === 'Enter' || e.code === 'Space') && camp.near && !(t && t.closest && t.closest('button, a'))) {
        e.preventDefault();
        activateSpot(camp.near);
      }
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
    // 텐트 문 앞에서 Enter: 들어가기
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
  $('#worryThrow').addEventListener('click', () => {
    if (state.sceneObj && state.sceneObj.throwWorry) state.sceneObj.throwWorry();
  });

  $('#stayBtn').addEventListener('click', stay);
  $('#leaveBtn').addEventListener('click', () => leave(true));

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.started) requestWakeLock();
  });
  window.addEventListener('hashchange', route);

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (state.view === 'home') renderThumbs(); }, 300);
  });

  // 시작
  route();
  backToSpot();
  if (state.view === 'home') startCamp();
  const afterFonts = () => renderThumbs();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(afterFonts, afterFonts);
  else setTimeout(afterFonts, 100);

  // 오프라인에서도 열리도록 (지원하는 곳에서만)
  try {
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      window.addEventListener('load', () => {
        try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) { /* 등록할 수 없는 환경 */ }
      });
    }
  } catch (e) { /* 등록할 수 없는 환경 */ }

  MC.app = { state, sound, camp, net, openSession, enterScene, doAction, toggleBreath, finishTimer };
})(window.MC = window.MC || {});
