'use strict';
const { main } = require('./lib');

main(async ({ check, staticServer, person, until, cleanup }) => {
  const srv = await staticServer(); cleanup(() => srv.close());
  const who = await person(); cleanup(() => who.close());
  const page = who.page;
  await page.goto(srv.url); await until(page, () => !!MC.app?.camp?.ground);
  const cast = await page.evaluate(() => {
    const c = MC.app.camp, s = c.sea, callback = s.onCast;
    const position = { x: c.pup.x, y: c.pup.y };
    let count = 0;
    s.onCast = () => count++;
    try {
      const invalid = s.cast();
      c.pup.x = MC.CampSea.deck.x0 + 90; c.pup.y = 1041;
      const deck = s.cast(); s.stopFishing(true);
      s.boating = true; c.moving = false;
      const boat = s.cast(); s.stopFishing(true);
      return { invalid, deck, boat, count };
    } finally { s.onCast = callback; s.boating = false; Object.assign(c.pup, position); }
  });
  check(!cast.invalid && cast.deck && cast.boat && cast.count === 2, '데크·보트에서 성공한 캐스팅에만 효과음을 한 번씩 요청한다', cast);
  const audio = await page.evaluate(async () => {
    const render = async (volume, muted) => {
      const s = new MC.Sound(), ctx = new OfflineAudioContext(1, 44100, 44100);
      s.ctx = ctx; s.muted = muted; s.master = ctx.createGain();
      s.master.gain.value = volume; s.master.connect(ctx.destination);
      // 일정한 노이즈로 실제 효과음 출력의 크기와 시점을 비교한다.
      const noise = ctx.createBuffer(1, 44100 * 4, 44100), data = noise.getChannelData(0);
      let seed = 7;
      for (let i = 0; i < data.length; i++) { seed = (seed * 16807) % 2147483647; data[i] = seed / 2147483647 * 0.6 - 0.3; }
      s.noise = { pink: noise };
      s.fishingCast();
      const out = (await ctx.startRendering()).getChannelData(0);
      const rms = (a, b) => {
        let sum = 0; const lo = Math.floor(a * 44100), hi = Math.floor(b * 44100);
        for (let i = lo; i < hi; i++) sum += out[i] * out[i];
        return Math.sqrt(sum / (hi - lo));
      };
      return { swing: rms(0.01, 0.22), splash: rms(0.26, 0.5), tail: rms(0.7, 0.95) };
    };
    return { full: await render(1, false), half: await render(0.5, false), muted: await render(1, true) };
  });
  check(audio.full.swing > 0.001 && audio.full.splash > 0.005 && audio.full.tail < 0.00001, '짧은 휘두르기 뒤 물에 닿는 소리가 나고 잔음은 사라진다', audio);
  check(Math.abs(audio.half.splash / audio.full.splash - 0.5) < 0.04 && audio.muted.swing === 0 && audio.muted.splash === 0, '전체 음량을 따르고 음소거 때는 효과음이 들리지 않는다');
  check(!who.errors.length, '브라우저 오류 없음', who.errors);
});
