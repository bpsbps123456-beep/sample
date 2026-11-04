// 소리: 녹음(sounds/)을 받아 풀고, 장면마다 녹음 줄기가 끊이지 않고 흐른다.
// 모닥불은 녹음 속 '타닥'에 맞춰 불티가 튀고, 녹음을 받지 못해도(인터넷 없이 처음 열 때 등) 합성한 소리로 온전히 난다.
// 별똥별은 천천히 미끄러지고, 가끔 한두 개가 뒤따른다
'use strict';
const { main } = require('./lib');

main(async ({ check, staticServer, person, until, sleep, cleanup, enter }) => {
  const site = await staticServer();
  cleanup(() => site.close());
  const who = await person();
  cleanup(() => who.close());
  // 스피커로 나가는 소리를 엿듣는 귀
  await who.ctx.addInitScript(() => {
    const orig = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (dest, ...rest) {
      if (dest && dest === this.context.destination && !this.context.__an) {
        const an = this.context.createAnalyser();
        an.fftSize = 2048;
        this.context.__an = an;
        window.__an = an;
        orig.call(this, an);
      }
      return orig.call(this, dest, ...rest);
    };
  });
  const P = who.page;
  const beds = (page) => page.evaluate(() => {
    const st = MC.app.state;
    const sc = st.scape ? [st.scape] : st.campAudio ? ['fire', 'water', 'forest', 'map'].map((k) => st.campAudio[k]) : [];
    return sc.map((s) => s.beds.map((b) => (b.ready ? 'R' : '-')).join('')).join('|');
  });
  const allReady = () => {
    const st = MC.app.state;
    const sc = st.scape ? [st.scape] : st.campAudio ? ['fire', 'water', 'forest', 'map'].map((k) => st.campAudio[k]) : [];
    return sc.length > 0 && sc.every((s) => s.beds.length > 0 && s.beds.every((b) => b.ready));
  };
  const level = (page) => page.evaluate(async () => {
    const an = window.__an;
    if (!an) return -999;
    const td = new Float32Array(an.fftSize);
    let sum = 0;
    let n = 0;
    for (let i = 0; i < 30; i++) {
      an.getFloatTimeDomainData(td);
      for (const v of td) sum += v * v;
      n += td.length;
      await new Promise((r) => setTimeout(r, 50));
    }
    return Math.round(10 * Math.log10(sum / n + 1e-12));
  });
  const open = async (page, name) => {
    if (name === 'home') await page.goto(site.url);
    else await enter(page, site.url, name);
    await until(page, () => !!(MC.app.state.view === 'home' || (MC.app.state.sceneObj && MC.app.state.sceneObj.w)));
    await sleep(400);
    // 소리는 누른 뒤에야 켜진다
    await page.mouse.click(450, 90);
  };

  // ── 장면마다 녹음 줄기 ───────────────────────────────
  for (const name of ['fire', 'water', 'forest', 'tent', 'home']) {
    await open(P, name);
    const ok = await until(P, allReady, null, 15000);
    check(ok, `${name}: 녹음 줄기가 모두 흐른다`, await beds(P));
    await sleep(1500);
    const db = await level(P);
    check(db > -45 && db < -12, `${name}: 알맞은 크기로 들린다`, db + ' dB');
  }
  const info = await P.evaluate(async () => {
    const out = {};
    for (const k of Object.keys(MC.app.sound.samples)) {
      const b = await MC.app.sound.samples[k];
      out[k] = b ? [+b.duration.toFixed(1), b.numberOfChannels, b.sampleRate] : null;
    }
    return out;
  });
  // 마을에서는 비 말고 여섯 (비는 텐트에서만)
  const names = ['fire', 'stove', 'crickets', 'birds', 'stream', 'sea'];
  check(names.every((k) => info[k] && info[k][0] > 20), '마을: 녹음 여섯 개를 받아 풀었다', info);
  check(names.every((k) => !info[k] || info[k][2] <= 32000), '메모리를 아끼려고 낮은 표본률로 풀어 둔다', names.map((k) => info[k] && info[k][2]));

  // ── 모닥불: 녹음 속 타닥에 맞춰 불티 ─────────────────────
  await open(P, 'fire');
  await until(P, allReady, null, 15000);
  const fire = await P.evaluate(async () => {
    const sc = MC.app.state.scape;
    let n = 0;
    const orig = sc.drain.bind(sc);
    sc.drain = () => {
      const out = orig();
      n += out.length;
      return out;
    };
    const before = sc.fireA.voices.size;
    sc.poke();
    const poked = sc.fireA.voices.size - before;
    await new Promise((r) => setTimeout(r, 8000));
    return { n, real: sc.real, crickets: !!sc.realCrickets, poked, synthPaused: sc.nextCluster > MC.clock() };
  });
  check(fire.real && fire.crickets, '모닥불: 진짜 장작불과 풀벌레로 바뀐다', fire);
  check(fire.n >= 2 && fire.n <= 30, '모닥불: 녹음 속 센 타닥에 맞춰 불티가 튄다 (8초에 몇 번)', fire.n);
  check(fire.synthPaused, '모닥불: 녹음이 타닥이는 동안 합성 타닥은 쉰다');
  check(fire.poked === 1, '불을 톡 건드리면 녹음 속 타닥 하나가 바로 난다', fire.poked);

  // ── 텐트: 비를 부르면 진짜 빗소리 ────────────────────────
  await open(P, 'tent');
  await until(P, allReady, null, 15000);
  const dry = await level(P);
  await P.evaluate(() => MC.app.doAction('rain'));
  await sleep(4500);
  const wet = await P.evaluate(() => {
    const sc = MC.app.state.scape;
    return { rain: sc.rain, bed: sc.rainBed.bed.ready, stove: !!sc.realStove };
  });
  check(wet.rain > 0.5 && wet.bed && wet.stove, '텐트: 무쇠 난로는 벽난로 녹음, 비를 부르면 진짜 빗소리', wet);
  check((await level(P)) > dry - 3, '텐트: 비가 오는 동안에도 소리가 이어진다');

  // ── 녹음을 못 받을 때 ───────────────────────────────
  const off = await who.tab('offline');
  await off.addInitScript(() => { window.MC = { noSamples: true }; });
  await open(off, 'fire');
  await sleep(4000);
  const syn = await off.evaluate(async () => {
    const sc = MC.app.state.scape;
    let n = 0;
    const orig = sc.drain.bind(sc);
    sc.drain = () => {
      const out = orig();
      n += out.length;
      return out;
    };
    await new Promise((r) => setTimeout(r, 6000));
    return { real: !!sc.real, ready: sc.beds.filter((b) => b.ready).length, n };
  });
  check(!syn.real && syn.ready === 0 && syn.n > 0, '녹음이 없으면 합성한 타닥과 불티로 온전히', syn);
  check((await level(off)) > -45, '녹음이 없어도 소리가 난다');
  await off.close();

  // ── 별똥별 ────────────────────────────────────────
  await open(P, 'fire');
  const met = await P.evaluate(async () => {
    const sc = MC.app.state.sceneObj;
    const M = sc.meteors;
    M.list.length = 0;
    M.follow = null;
    M.spawn(sc.w * 0.3, sc.ground * 0.1, 1, sc.s, 0.4, 1);
    const m = M.list[0];
    const at = (t) => new Promise((r) => setTimeout(() => r(M.pos(m)), t));
    const p1 = await at(500);
    const p2 = await at(1000);
    await new Promise((r) => setTimeout(r, 1300));
    const alive = M.list.includes(m) && m.t < m.dur;
    // 뒤따르는 별똥별
    let followed = false;
    for (let i = 0; i < 90 && !followed; i++) {
      await new Promise((r) => setTimeout(r, 100));
      followed = M.list.some((x) => x !== m);
    }
    return { speed: Math.hypot(p2.x - p1.x, p2.y - p1.y) / 1.0 / sc.s, alive, dur: m.dur, followed };
  });
  check(met.speed > 20 && met.speed < 160, '별똥별은 천천히 미끄러진다 (예전엔 화면 크기당 초속 800쯤)', Math.round(met.speed));
  check(met.alive && met.dur >= 2.8, '별똥별이 3초 넘게 머문다', met.dur);
  check(met.followed, '가끔은 같은 쪽 하늘에서 하나가 더 (유성우)');

  check(who.errors.length === 0, '오류 없음', who.errors.slice(0, 3));
});
