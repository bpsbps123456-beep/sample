// Check the actual audio graph: air follows wind, crackle stays audible, and kettle mutes fully.
'use strict';
const { main } = require('./lib');

main(async ({ check, staticServer, person, until, cleanup, enter }) => {
  const site = await staticServer(); cleanup(() => site.close());
  const who = await person(); cleanup(() => who.close());
  const page = who.page;
  for (const name of ['fire', 'firetower', 'lodge']) {
    await enter(page, site.url, name);
    await page.mouse.click(450, 90);
    check(await until(page, () => MC.app.state.scape?.beds.every(b => b.ready), null, 15000), `${name}: recordings loaded`);
    const result = await page.evaluate(async (name) => {
      const sc = MC.app.state.scape, ctx = sc.snd.ctx;
      // Replace unpredictable recordings with a repeatable probe through the same graph.
      clearInterval(sc.timer); sc.params = () => {};
      for (const b of sc.beds) b.stop();
      for (const source of sc.sources) { try { source.stop(); } catch (_) {} }
      const an = ctx.createAnalyser(); an.fftSize = 4096;
      sc.out.connect(an);
      sc.out.gain.cancelScheduledValues(ctx.currentTime); sc.out.gain.value = 1;
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const rms = async () => {
        await wait(800);
        const data = new Float32Array(an.fftSize);
        let sum = 0;
        for (let i = 0; i < 6; i++) {
          an.getFloatTimeDomainData(data);
          for (const v of data) sum += v * v;
          await wait(40);
        }
        return Math.sqrt(sum / (data.length * 6));
      };
      const probe = ctx.createOscillator(), gain = ctx.createGain();
      gain.gain.value = 0.1; probe.connect(gain);
      if (name === 'lodge') {
        sc.setLevel('outside', 0); sc.setLevel('kettle', 1);
        gain.connect(sc.kettleBus); probe.frequency.value = 400; probe.start();
        const warm = await rms();
        probe.frequency.value = 5000;
        const sharp = await rms();
        sc.setLevel('kettle', 0);
        const muted = await rms();
        probe.stop();
        return { warm, sharp, muted };
      }
      sc.setLevel('crickets', 0); sc.setLevel('fire', 1); sc.setLevel('wind', 1);
      sc.roar.gain.gain.cancelScheduledValues(ctx.currentTime); sc.roar.gain.gain.value = 1;
      probe.frequency.value = 120; gain.connect(sc.roar.head); probe.start();
      const air = await rms();
      const slider = document.getElementById(`vol-${name}-wind`);
      slider.value = '0'; slider.dispatchEvent(new Event('input', { bubbles: true }));
      const noAir = await rms();
      gain.disconnect(); gain.connect(sc.fireBus); probe.frequency.value = 1500;
      const crackle = await rms();
      sc.setLevel('fire', 0);
      const quiet = await rms();
      probe.stop();
      return { air, noAir, crackle, quiet, savedWind: MC.store.get('levels.' + name, {}).wind };
    }, name);
    if (name === 'lodge') {
      check(result.warm > 0.01 && result.sharp < result.warm * 0.08, 'lodge: sharp kettle frequencies softened', result);
      check(result.muted < 0.0001, 'lodge: kettle control silences its whole layer');
    } else {
      check(result.air > 0.01 && result.noAir < result.air * 0.001, `${name}: wind slider silences low rushing air`, result);
      check(result.crackle > 0.005 && result.quiet < result.crackle * 0.001, `${name}: crackle remains independent`);
      check(result.savedWind === 0, `${name}: wind setting persists`);
    }
  }
  check(!who.errors.length, 'no browser errors', who.errors);
});
