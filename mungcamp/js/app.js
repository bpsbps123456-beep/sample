/* 멍캠프 — 화면 흐름: 자리 고르기 → 마음 날씨 → 멍 → 기록 */
(function (MC) {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const SCENES = {
    fire: {
      title: '불멍',
      place: '모닥불 글램핑',
      make: () => new MC.FireScene({ calm: MC.reducedMotion }),
      scape: MC.FireScape,
      guidance: '불꽃이 움직이는 대로 그냥 바라봐요. 생각이 떠오르면 떠오르게 두고, 다시 불꽃으로.',
      actions: [
        { id: 'log', icon: 'i-log', label: '장작 넣기', primary: true },
        { id: 'worry', icon: 'i-pen', label: '걱정 태우기' },
      ],
      space: 'log',
    },
    water: {
      title: '물멍',
      place: '달빛 바다',
      make: () => new MC.WaterScene({}),
      scape: MC.WaterScape,
      guidance: '파도는 10초마다 밀려와요. 차오를 때 들이쉬고, 쓸려 갈 때 내쉬어 보세요.',
      actions: [{ id: 'ripple', icon: 'i-drop', label: '물결', primary: true }],
      space: 'ripple',
    },
    forest: {
      title: '숲멍',
      place: '편백 숲의 아침',
      make: () => new MC.ForestScene({}),
      scape: MC.ForestScape,
      guidance: '빛줄기 사이로 떠다니는 먼지를 따라가 보세요. 화면을 누르면 바람이 지나가요.',
      actions: [{ id: 'breeze', icon: 'i-wind', label: '바람', primary: true }],
      space: 'breeze',
    },
  };

  const MOODS = [
    { v: 1, label: '맑음' },
    { v: 2, label: '구름 조금' },
    { v: 3, label: '흐림' },
    { v: 4, label: '비' },
    { v: 5, label: '폭풍' },
  ];
  const DURATIONS = [
    { v: 5, label: '5분' },
    { v: 10, label: '10분' },
    { v: 20, label: '20분', small: '추천' },
    { v: 30, label: '30분' },
    { v: 0, label: '제한 없음' },
  ];
  const OUTSIDE_TIPS = [
    '다음엔 진짜 바깥으로. 점심시간 10분, 가까운 공원 나무 아래도 좋아요.',
    '오늘 하루 중 한 번은 하늘을 올려다보세요. 진짜 자연은 화면보다 효과가 커요.',
    '창문을 열고 바깥 공기를 세 번 깊게 들이쉬어 보세요.',
    '이번 주말엔 가까운 숲길이나 물가를 20분쯤 걸어 보는 건 어때요?',
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
    before: null,
    after: null,
    timerDone: false,
    recorded: false,
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
  const breath = new MC.Breath($('#breath'), sound);

  // ── 작은 도구 ─────────────────────────────────────────
  const fmt = (sec) => {
    sec = Math.max(0, Math.round(sec));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };
  const elapsedSec = () => (state.started ? (Date.now() - state.startAt) / 1000 : 0);
  const moodLabel = (v) => (MOODS.find((m) => m.v === v) || {}).label || '';
  // 받침이 있으면 '으로', 없거나 ㄹ이면 '로'
  const ro = (word) => {
    const c = word.charCodeAt(word.length - 1) - 0xac00;
    if (c < 0 || c > 11171) return '로';
    const jong = c % 28;
    return jong === 0 || jong === 8 ? '로' : '으로';
  };

  let toastTimer = 0;
  function toast(msg, ms = 4200) {
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
      if (it.small) {
        const sm = document.createElement('small');
        sm.textContent = it.small;
        b.appendChild(sm);
      }
      b.addEventListener('click', () => {
        for (const o of box.children) o.setAttribute('aria-checked', String(o === b));
        onPick(it.v);
      });
      box.appendChild(b);
    }
  }

  function renderMoods(sel, onPick) {
    const box = $(sel);
    box.textContent = '';
    for (const m of MOODS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', 'false');
      b.innerHTML = `<svg aria-hidden="true"><use href="#w-${m.v}"/></svg><span>${m.label}</span>`;
      b.addEventListener('click', () => {
        const on = b.getAttribute('aria-checked') !== 'true';
        for (const o of box.children) o.setAttribute('aria-checked', 'false');
        b.setAttribute('aria-checked', String(on));
        onPick(on ? m.v : null);
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

  function renderLog() {
    const list = MC.store.get('records', []);
    const has = Array.isArray(list) && list.length > 0;
    $('#logStats').hidden = !has;
    $('#logEmpty').hidden = has;
    $('#logClearRow').hidden = !has;
    $('#logConfirm').hidden = true;
    $('#logClear').hidden = false;
    const ol = $('#logList');
    ol.textContent = '';
    if (!has) return;
    const minutes = list.reduce((a, r) => a + (r.m || 0), 0);
    const pairs = list.filter((r) => r.b && r.a);
    $('#statCount').textContent = String(list.length);
    $('#statMinutes').textContent = String(minutes);
    if (pairs.length) {
      const avg = pairs.reduce((a, r) => a + (r.b - r.a), 0) / pairs.length;
      $('#statDelta').textContent = `${avg >= 0 ? '+' : '−'}${Math.abs(avg).toFixed(1)}`;
    } else {
      $('#statDelta').textContent = '–';
    }
    for (const r of list.slice(-8).reverse()) {
      const li = document.createElement('li');
      const d = new Date(r.d);
      const cells = [
        isNaN(d) ? '' : `${d.getMonth() + 1}월 ${d.getDate()}일`,
        (SCENES[r.s] || {}).title || '',
        `${r.m}분`,
        r.b || r.a ? `${moodLabel(r.b) || '–'} → ${moodLabel(r.a) || '–'}` : '',
      ];
      cells.forEach((text, i) => {
        const span = document.createElement('span');
        span.textContent = text;
        if (i === 3) span.className = 'mood-change';
        li.appendChild(span);
      });
      ol.appendChild(li);
    }
  }

  function saveRecord(after) {
    const list = MC.store.get('records', []);
    const arr = Array.isArray(list) ? list : [];
    arr.push({
      d: new Date().toISOString(),
      s: state.scene,
      m: Math.max(1, Math.round(elapsedSec() / 60)),
      b: state.before,
      a: after,
    });
    while (arr.length > 200) arr.shift();
    MC.store.set('records', arr);
    state.recorded = true;
  }

  // ── 세션 열고 닫기 ─────────────────────────────────────
  function openSession(name) {
    if (state.view === 'session') {
      if (state.scene === name) return;
      if (state.started && !state.recorded && elapsedSec() >= 60) saveRecord(null);
      teardown();
    }
    const def = SCENES[name];
    Object.assign(state, {
      view: 'session', scene: name, def, started: false, recorded: false,
      before: null, after: null, timerDone: false, lowHinted: false, worryShown: false,
    });
    stopHero();
    home.hidden = true;
    session.hidden = false;
    document.body.classList.add('in-session');
    session.dataset.scene = name;
    const nameEl = $('#sceneName');
    nameEl.textContent = def.title;
    const small = document.createElement('small');
    small.textContent = def.place;
    nameEl.appendChild(small);

    const scene = def.make();
    state.sceneObj = scene;
    state.runner = new MC.Runner(stage, scene, { quality: MC.reducedMotion ? 0.7 : 1, onFrame });
    state.runner.start();

    buildDock(def);
    buildSoundPanel(name, def);
    buildBreathPanel();
    renderSeg('#durationOptions', DURATIONS, state.duration, setDuration);
    renderSeg('#timerOptions', DURATIONS, state.duration, setDuration);
    renderMoods('#moodBefore', (v) => { state.before = v; });
    $('#checkinPlace').textContent = `${def.title} · ${def.place}`;
    ui.classList.add('is-hidden');
    closePanels();
    $('#checkout').hidden = true;
    $('#checkin').hidden = false;
    updateTimer();
    setTimeout(() => $('#startBtn').focus({ preventScroll: true }), 50);
  }

  function startSession() {
    $('#checkin').hidden = true;
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
    if (state.scene === 'fire') scene.onWorryBurned = () => toast('걱정 한 조각이 불티가 되어 날아갔어요.');
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
    $('#guidance').classList.remove('is-on');
    $('#worryHint').hidden = true;
    releaseWakeLock();
    if (document.fullscreenElement || document.webkitFullscreenElement) toggleFullscreen();
    closePanels();
    $('#checkin').hidden = true;
    $('#checkout').hidden = true;
    state.started = false;
  }

  function closeSession() {
    if (state.view !== 'session') return;
    if (state.started && !state.recorded && elapsedSec() >= 60) saveRecord(null);
    teardown();
    state.view = 'home';
    session.hidden = true;
    home.hidden = false;
    document.body.classList.remove('in-session');
    renderLog();
    renderThumbs();
    startHero();
  }

  function goHome() {
    try { history.replaceState(null, '', '#seats'); } catch (e) { /* 막혀 있으면 그대로 */ }
    closeSession();
    $('#seats').scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  function requestExit() {
    if (state.started && !state.recorded && elapsedSec() >= 60) openCheckout('exit');
    else {
      state.recorded = true;
      goHome();
    }
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
        toast('불이 잦아들고 있어요. 장작을 하나 넣어 볼까요?');
      }
      if (st.fuel > 25) state.lowHinted = false;
      if (st.waiting !== state.worryShown) {
        state.worryShown = st.waiting;
        $('#worryHint').hidden = !st.waiting;
        if (st.waiting) {
          clearTimeout(state.guideTimer);
          $('#guidance').classList.remove('is-on');
          wake();
        }
      }
    }
  }

  function updateTimer() {
    const el = $('#timerText');
    const chip = $('#timerChip');
    if (!state.started) {
      el.textContent = state.duration ? fmt(state.duration * 60) : '제한 없음';
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
      chip.setAttribute('aria-label', `남은 시간 ${fmt(rem)}`);
    } else {
      el.textContent = fmt(sec);
      chip.setAttribute('aria-label', `머문 시간 ${fmt(sec)}`);
    }
  }

  function setDuration(min) {
    state.duration = min;
    MC.store.set('duration', min);
    for (const sel of ['#durationOptions', '#timerOptions']) {
      $$(`${sel} button`).forEach((b, i) => b.setAttribute('aria-checked', String(DURATIONS[i].v === min)));
    }
    if (state.started && min && min * 60 > elapsedSec()) state.timerDone = false;
    updateTimer();
  }

  function finishTimer() {
    state.timerDone = true;
    sound.chime();
    if (state.scape) state.scape.duck(0.45, 6);
    updateTimer();
    openCheckout('timer');
  }

  function showGuidance(text) {
    const g = $('#guidance');
    g.textContent = text;
    requestAnimationFrame(() => g.classList.add('is-on'));
    clearTimeout(state.guideTimer);
    state.guideTimer = setTimeout(() => g.classList.remove('is-on'), 8000);
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
      if (!sc.addLog()) toast('장작이 넉넉해요. 조금 타기를 기다려 볼까요?');
    } else if (id === 'worry') {
      if (sc.worry) toast('먼저 들고 있는 장작을 불에 넣어 주세요.');
      else togglePanel('worry');
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
    b.textContent = sound.muted ? '소리 켜기' : '소리 끄기';
  }

  function toggleMute() {
    sound.setMuted(!sound.muted);
    setMuteUI();
    toast(sound.muted ? '소리를 껐어요' : '소리를 켰어요', 1800);
  }

  function buildBreathPanel() {
    const P = MC.Breath.patterns;
    const items = Object.keys(P).map((k) => ({ v: k, label: P[k].name }));
    renderSeg('#breathPatterns', items, breath.pattern, (v) => {
      breath.setPattern(v);
      $('#breathNote').textContent = P[v].note;
    });
    $('#breathNote').textContent = P[breath.pattern].note;
    $('#breathCue').checked = breath.cueOn;
    setBreathUI(breath.active);
  }

  function setBreathUI(on) {
    $('#breathBtn').setAttribute('aria-pressed', String(on));
    $('#breathToggle').textContent = on ? '호흡 멈추기' : '호흡 시작';
  }

  function toggleBreath(force) {
    const on = typeof force === 'boolean' ? force : !breath.active;
    if (on) {
      breath.start(state.scene === 'water' ? -0.16 * MC.WAVE_T : null);
      clearTimeout(state.guideTimer);
      $('#guidance').classList.remove('is-on');
    } else {
      breath.stop();
    }
    setBreathUI(on);
  }

  const anyPanelOpen = () => $$('.panel').some((p) => !p.hidden);
  const modalOpen = () => !$('#checkin').hidden || !$('#checkout').hidden;

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
    }, 6000);
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

  // ── 나오기 ───────────────────────────────────────────
  function openCheckout(reason) {
    closePanels();
    state.after = null;
    $('#checkoutKicker').textContent = reason === 'timer' ? `${state.duration}분이 지났어요` : `${Math.max(1, Math.round(elapsedSec() / 60))}분 머물렀어요`;
    renderMoods('#moodAfter', (v) => { state.after = v; });
    $('#checkoutAsk').hidden = false;
    $('#checkoutDone').hidden = true;
    $('#checkout').hidden = false;
    state.checkoutReason = reason;
    wake();
    setTimeout(() => $('#saveLeaveBtn').focus({ preventScroll: true }), 50);
  }

  function showDone() {
    const minutes = Math.max(1, Math.round(elapsedSec() / 60));
    const b = state.before;
    const a = state.after;
    $('#doneTitle').textContent = `${minutes}분 동안 쉬었어요`;
    let text = '잠시 멈춘 것만으로도 충분해요.';
    if (b && a) {
      const d = b - a;
      const from = moodLabel(b);
      const to = moodLabel(a);
      if (d >= 2) text = `${from}에서 ${to}${ro(to)}. 마음이 한결 가벼워졌네요.`;
      else if (d === 1) text = `${from}에서 ${to}${ro(to)}. 조금 가벼워졌네요.`;
      else if (d === 0) text = `${to}, 그대로예요. 그래도 잠시 멈춘 시간은 남아요.`;
      else text = `${from}에서 ${to}${ro(to)}. 오늘은 마음이 더 무거워졌네요. 믿을 만한 사람과 이야기해 보는 것도 좋아요.`;
    }
    $('#doneText').textContent = text;
    $('#doneCare').hidden = !(a && a >= 4);
    $('#doneTip').textContent = OUTSIDE_TIPS[Math.floor(Math.random() * OUTSIDE_TIPS.length)];
    $('#checkoutAsk').hidden = true;
    $('#checkoutDone').hidden = false;
    setTimeout(() => $('#doneBtn').focus({ preventScroll: true }), 50);
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
      if (sc.pointerMove(x, y)) return;
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
        else if (!document.fullscreenElement) requestExit();
        break;
      default:
    }
  });

  $('#exitBtn').addEventListener('click', requestExit);
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
    if (document.fonts && document.fonts.load) document.fonts.load('34px "Nanum Pen Script"', text).then(go, go);
    else go();
  });
  $('#worryThrow').addEventListener('click', () => {
    if (state.sceneObj && state.sceneObj.throwWorry) state.sceneObj.throwWorry();
  });

  $('#startBtn').addEventListener('click', startSession);
  $('#checkinBack').addEventListener('click', () => {
    state.recorded = true;
    goHome();
  });
  $('#saveLeaveBtn').addEventListener('click', () => {
    saveRecord(state.after);
    showDone();
  });
  $('#leaveBtn').addEventListener('click', () => {
    state.recorded = true;
    goHome();
  });
  $('#stayBtn').addEventListener('click', () => {
    $('#checkout').hidden = true;
    if (state.scape) state.scape.duck(1, 3);
    armIdle();
  });
  $('#doneBtn').addEventListener('click', goHome);

  $('#logClear').addEventListener('click', () => {
    $('#logClear').hidden = true;
    $('#logConfirm').hidden = false;
  });
  $('#logClearNo').addEventListener('click', renderLog);
  $('#logClearYes').addEventListener('click', () => {
    MC.store.remove('records');
    renderLog();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.started) requestWakeLock();
  });
  window.addEventListener('pagehide', () => {
    if (state.started && !state.recorded && elapsedSec() >= 60) saveRecord(null);
  });
  window.addEventListener('hashchange', route);

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (state.view === 'home') renderThumbs(); }, 300);
  });

  // 시작
  renderLog();
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

  MC.app = { state, sound, openSession, startSession, doAction, toggleBreath };
})(window.MC = window.MC || {});
