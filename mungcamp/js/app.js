/* 멍캠프 — 화면 흐름: 자리 고르기 → 멍 → 돌아오기 */
(function (MC) {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const SCENES = {
    fire: {
      place: '모닥불 글램핑',
      make: () => new MC.FireScene({ calm: MC.reducedMotion }),
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
      guidance: '빛을 따라가 봐요',
      actions: [{ id: 'breeze', icon: 'i-wind', label: '바람', primary: true }],
      space: 'breeze',
    },
  };

  const DURATIONS = [
    { v: 5, label: '5분' },
    { v: 10, label: '10분' },
    { v: 20, label: '20분' },
    { v: 30, label: '30분' },
    { v: 0, label: '계속' },
  ];

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
    duration: MC.store.get('duration', 20),
    timerDone: false,
    leaving: false,
    lowHinted: false,
    worryShown: false,
    wakeLock: null,
    hiddenAt: 0,
    moved: 0,
  };
  if (!DURATIONS.some((d) => d.v === state.duration)) state.duration = 20;

  const sound = new MC.Sound();
  const home = $('#home');
  const session = $('#session');
  const stage = $('#stage');
  const ui = $('#ui');
  const curtain = $('#curtain');
  const breath = new MC.Breath($('#breath'), sound);

  const finePointer = !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches);
  const focusSoft = (el) => { if (finePointer) setTimeout(() => el.focus({ preventScroll: true }), 50); };

  const fmt = (sec) => {
    sec = Math.max(0, Math.round(sec));
    return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  };
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

  // ── 첫 화면 ───────────────────────────────────────────
  let hero = null;
  let heroVisible = true;
  function startHero() {
    if (!hero) {
      hero = new MC.Runner($('#heroCanvas'), new MC.FireScene({ preview: true, focusX: 0.72, calm: MC.reducedMotion }), { quality: 0.75, maxPixels: 1.6e6 });
    }
    if (heroVisible && state.view === 'home') hero.start();
  }
  function stopHero() {
    if (hero) hero.stop();
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      heroVisible = entries[0].isIntersecting;
      if (heroVisible) startHero();
      else stopHero();
    }).observe($('.hero'));
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
    if (state.view === 'session') {
      if (state.scene === name) return;
      teardown();
    }
    const def = SCENES[name];
    Object.assign(state, {
      view: 'session', scene: name, def, started: false, timerDone: false,
      leaving: false, lowHinted: false, worryShown: false,
    });
    stopHero();
    home.hidden = true;
    session.hidden = false;
    document.body.classList.add('in-session');
    session.dataset.scene = name;

    setCurtain(1, 0);
    const scene = def.make();
    state.sceneObj = scene;
    state.runner = new MC.Runner(stage, scene, { quality: MC.reducedMotion ? 0.7 : 1, onFrame });
    state.runner.start();
    requestAnimationFrame(() => requestAnimationFrame(() => setCurtain(0, 2.4)));

    buildDock(def);
    buildSoundPanel(name, def);
    buildBreathPanel();
    renderSeg('#durationOptions', DURATIONS, state.duration, setDuration);
    renderSeg('#timerOptions', DURATIONS, state.duration, setDuration);
    $('#start-title').textContent = def.place;
    ui.classList.add('is-hidden');
    closePanels();
    $('#endCard').hidden = true;
    $('#startCard').hidden = false;
    updateTimer();
    focusSoft($('#startBtn'));
  }

  function startSession() {
    $('#startCard').hidden = true;
    const def = state.def;
    const scene = state.sceneObj;
    const ctx = sound.ensure();
    if (ctx) {
      const scape = (state.scape = new def.scape(sound));
      scape.begin(state.levels);
      if (state.scene === 'fire') {
        scene.events = () => scape.drain();
        scene.onLand = (isWorry) => scape.thud(isWorry);
        scene.onPoke = () => scape.poke();
      } else if (state.scene === 'water') {
        scene.onRipple = (z, pan) => scape.plop(z, pan);
      } else {
        scene.onGust = () => scape.gust();
      }
    }
    if (state.scene === 'fire') scene.onWorryBurned = () => toast('불티가 되어 날아갔어요');
    state.started = true;
    state.startAt = Date.now();
    clearInterval(state.timerInt);
    state.timerInt = setInterval(updateTimer, 500);
    updateTimer();
    requestWakeLock();
    ui.classList.remove('is-hidden');
    showGuidance(def.guidance);
    armIdle();
  }

  function teardown() {
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
    $('#startCard').hidden = true;
    $('#endCard').hidden = true;
    state.started = false;
  }

  function closeSession() {
    if (state.view !== 'session') return;
    teardown();
    state.view = 'home';
    session.hidden = true;
    home.hidden = false;
    document.body.classList.remove('in-session');
    renderThumbs();
    startHero();
  }

  function goHome() {
    try { history.replaceState(null, '', '#seats'); } catch (e) { /* 막혀 있으면 그대로 */ }
    closeSession();
    $('#seats').scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  // 나갈 때는 화면과 소리가 함께 천천히 잦아든다
  function leave() {
    if (state.leaving) return;
    state.leaving = true;
    closePanels();
    $('#startCard').hidden = true;
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
    if (state.scape && sc.audioParams) state.scape.params(sc.audioParams());
    if (state.scene === 'fire' && state.started) {
      const st = sc.status();
      if (st.fuel < 9 && !state.lowHinted) {
        state.lowHinted = true;
        toast('장작을 넣어 볼까요?');
      }
      if (st.fuel > 25) state.lowHinted = false;
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

  function updateTimer() {
    const el = $('#timerText');
    if (!state.started) {
      el.textContent = state.duration ? fmt(state.duration * 60) : fmt(0);
      return;
    }
    const sec = elapsedSec();
    if (state.duration && !state.timerDone) {
      const rem = state.duration * 60 - sec;
      if (rem <= 0) {
        finishTimer();
        return;
      }
      el.textContent = fmt(rem);
    } else {
      el.textContent = fmt(sec);
    }
  }

  function setDuration(min) {
    state.duration = min;
    MC.store.set('duration', min);
    for (const sel of ['#durationOptions', '#timerOptions']) {
      $$(`${sel} button`).forEach((b, i) => b.setAttribute('aria-checked', String(DURATIONS[i].v === min)));
    }
    if (state.timerDone && (!min || min * 60 > elapsedSec())) stay();
    updateTimer();
  }

  // 시간이 다 되면 종이 한 번 울리고, 소리와 빛이 서서히 잦아든다
  function finishTimer() {
    state.timerDone = true;
    sound.chime();
    if (state.scape) state.scape.duck(0.35, 18);
    setCurtain(0.4, 18);
    updateTimer();
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

  function stay() {
    state.timerDone = false;
    clearTimeout(state.endTimer);
    $('#endCard').hidden = true;
    if (state.scape) state.scape.duck(1, 3);
    setCurtain(0, 3);
    if (!state.duration || state.duration * 60 <= elapsedSec()) state.timerDone = true;
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
  const modalOpen = () => !$('#startCard').hidden || !$('#endCard').hidden;

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
    if (state.leaving) return;
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
    if (state.view !== 'session') return;
    const t = e.target;
    if (t && t.matches && t.matches('input[type="text"], textarea')) {
      if (e.key === 'Escape') closePanels();
      return;
    }
    if (modalOpen() || !state.started) return;
    if ((e.key === ' ' || e.key === 'Enter') && t && t.closest && t.closest('button')) return;
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

  $('#exitBtn').addEventListener('click', leave);
  $('#timerChip').addEventListener('click', () => togglePanel('timer'));
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

  $('#startBtn').addEventListener('click', startSession);
  $('#startBack').addEventListener('click', leave);
  $('#stayBtn').addEventListener('click', stay);
  $('#leaveBtn').addEventListener('click', leave);

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
  if (state.view === 'home') startHero();
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

  MC.app = { state, sound, openSession, startSession, doAction, toggleBreath, finishTimer };
})(window.MC = window.MC || {});
