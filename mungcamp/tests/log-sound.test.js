// 장작 착지음: 도착 순간 한 번, 짧고 낮은 나무 충돌음. 파일이 없어도 긴 잡음은 없다.
'use strict';
const { main } = require('./lib');

main(async ({ check, staticServer, person, enter, until, cleanup }) => {
  const site = await staticServer(); cleanup(() => site.close());
  const who = await person(); cleanup(() => who.close());
  const page = who.page;
  await enter(page, site.url, 'fire');
  await page.mouse.click(450, 90);
  check(await until(page, () => MC.app.state.scape?.woodImpacts.length === 2, null, 15000), '착지음 두 가지를 미리 불러온다');
  const renders = await page.evaluate(async () => {
    const buffers = await Promise.all(['wood1', 'wood2'].map(n => MC.app.sound.sample(n)));
    const results = [];
    for (const buffer of [...buffers, null]) {
      const ctx = new OfflineAudioContext(2, 48000, 32000), snd = new MC.Sound(); snd.ctx = ctx;
      const layer = ctx.createGain(), merge = ctx.createChannelMerger(2), high = ctx.createBiquadFilter();
      high.type = 'highpass'; high.frequency.value = 3000;
      layer.connect(merge, 0, 0); layer.connect(high); high.connect(merge, 0, 1); merge.connect(ctx.destination);
      const sc = Object.create(MC.FireScape.prototype);
      Object.assign(sc, { snd, layers: { fire: layer }, woodImpacts: buffer ? [buffer] : [], real: true });
      // 불붙는 잡음이나 녹음 속 강한 타닥을 재생하면 실패한다.
      sc.realCrack = sc.crack = () => { throw new Error('Extra crackle after landing'); };
      sc.thud(false);
      const rendered = await ctx.startRendering(), dry = rendered.getChannelData(0), sharp = rendered.getChannelData(1);
      let energy = 0, highEnergy = 0, peak = 0, latePeak = 0;
      for (let i = 0; i < dry.length; i++) {
        energy += dry[i] ** 2; highEnergy += sharp[i] ** 2; peak = Math.max(peak, Math.abs(dry[i]));
        if (i > 32000 * .65) latePeak = Math.max(latePeak, Math.abs(dry[i]));
      }
      results.push({ peak, rms: Math.sqrt(energy / dry.length), sharpFraction: highEnergy / energy, latePeak });
    }
    return results;
  });
  renders.forEach((r, i) => {
    const name = i < 2 ? `나무 충돌음 ${i + 1}` : '오프라인 대체음';
    check(r.rms > .005 && r.peak < .85, `${name}: 들리되 찌그러지지 않는다`, r);
    check(r.latePeak < .00001 && r.sharpFraction < .15, `${name}: 짧게 끝나고 날카로운 고음이 적다`);
  });
  for (const name of ['fire', 'firetower']) {
    if (name !== 'fire') { await enter(page, site.url, name); await page.mouse.click(450, 90); }
    await until(page, () => !!MC.app.state.scape);
    const timing = await page.evaluate(() => {
      const { sceneObj: scene, scape, runner } = MC.app.state;
      runner.stop();
      let hits = 0; const original = scape.thud.bind(scape);
      scape.thud = worry => { hits++; original(worry); };
      const before = scene.logs.length; scene.addLog(); const duringFlight = hits;
      for (let i = 0; i < 100; i++) scene.update(1 / 60);
      return { duringFlight, hits, landed: scene.logs.length === before + 1 };
    });
    check(timing.duringFlight === 0 && timing.hits === 1 && timing.landed, `${name}: 실제 장작이 닿는 순간에만 한 번 난다`, timing);
  }
  check(!who.errors.length, '착지음 재생 중 브라우저 오류 없음', who.errors);
});
