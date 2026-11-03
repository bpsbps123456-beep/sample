// 모든 장소가 열리고 오류가 없는지 (컴퓨터, 휴대폰)
'use strict';
const { main } = require('./lib');

main(async ({ check, staticServer, person, until, shot, sleep, cleanup }) => {
  const site = await staticServer();
  cleanup(() => site.close());
  for (const phone of [false, true]) {
    const who = await person({ phone });
    cleanup(() => who.close());
    const { page } = who;
    const tag = phone ? '휴대폰' : '컴퓨터';
    await page.goto(site.url);
    check(await until(page, () => !!(window.MC && MC.app && MC.app.camp && MC.app.camp.ground)), `${tag}: 캠프 마을이 열린다`);
    await shot(page, `smoke-${phone ? 'p' : 'd'}-map`);
    for (const name of ['fire', 'water', 'forest', 'tent']) {
      await page.evaluate((n) => { location.hash = n; }, name);
      const ok = await until(page, (n) => MC.app.state.scene === n && !!(MC.app.state.sceneObj && MC.app.state.sceneObj.w), name);
      await sleep(1200);
      check(ok, `${tag}: ${name} 장면이 열린다`);
      await shot(page, `smoke-${phone ? 'p' : 'd'}-${name}`);
    }
    await page.evaluate(() => { location.hash = ''; });
    check(await until(page, () => MC.app.state.view === 'home'), `${tag}: 마을로 돌아온다`);
    check(who.errors.length === 0, `${tag}: 오류 없음`, who.errors.slice(0, 3));
  }
});
