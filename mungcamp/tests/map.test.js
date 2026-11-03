// 마을 지도: 끌면 둘러보고(걷지 않음), 톡 하면 걷고 카메라가 다시 따라가고,
// 지도 끝에서 더 끌면 페이지가 스크롤된다. 휴대폰은 지도를 당겨 보여 주어 위아래로도 둘러본다
'use strict';
const { main } = require('./lib');

main(async ({ check, staticServer, person, until, sleep, cleanup }) => {
  const site = await staticServer();
  cleanup(() => site.close());
  const who = await person();
  cleanup(() => who.close());
  const P = who.page;
  await P.goto(site.url);
  await until(P, () => !!(window.MC && MC.app && MC.app.camp && MC.app.camp.ground));
  await sleep(800);
  const st = () => P.evaluate(() => { const c = MC.app.camp; return { cam: [c.cam.x, c.cam.y], pup: [c.pup.x, c.pup.y], free: !!c.camFree, target: !!c.target, scrollY: window.scrollY }; });
  const a = await st();
  await P.mouse.move(600, 400);
  await P.mouse.down();
  for (let i = 1; i <= 10; i++) await P.mouse.move(600 - i * 20, 400 - i * 8);
  await P.mouse.up();
  await sleep(300);
  const b = await st();
  check(b.free && Math.abs(b.cam[0] - a.cam[0]) > 50, '끌면 지도를 둘러본다', { before: a.cam.map(Math.round), after: b.cam.map(Math.round) });
  check(!b.target && b.pup[0] === a.pup[0], '끌고 난 뒤에는 걷지 않는다');

  await P.mouse.click(500, 420);
  await sleep(200);
  const c = await st();
  check(c.target && !c.free, '톡 하면 그리로 걷고 카메라가 다시 따라간다');

  await sleep(1500);
  for (let k = 0; k < 2; k++) {
    await P.mouse.move(500, 620);
    await P.mouse.down();
    for (let i = 1; i <= 20; i++) await P.mouse.move(500, 620 - i * 25);
    await P.mouse.up();
    await sleep(200);
  }
  const d = await st();
  check(d.scrollY > 50, '지도 끝에서 더 끌면 페이지가 스크롤된다', Math.round(d.scrollY));

  const ph = await person({ phone: true });
  cleanup(() => ph.close());
  await ph.page.goto(site.url);
  await until(ph.page, () => !!(window.MC && MC.app && MC.app.camp && MC.app.camp.ground));
  const z = await ph.page.evaluate(() => { const cm = MC.app.camp; const y0 = cm.cam.y; cm.pan(0, 300); return { z: cm.z, moved: Math.round(y0 - cm.cam.y) }; });
  check(z.z >= 0.7 && z.moved > 100, '휴대폰에서는 위아래로도 둘러볼 수 있다', z);
  const hl = await ph.page.evaluate(() => getComputedStyle(document.documentElement).webkitTapHighlightColor);
  check(hl === 'rgba(0, 0, 0, 0)', '톡 할 때 화면이 번쩍이지 않는다 (터치 강조 끔)', hl);
  check(who.errors.length === 0 && ph.errors.length === 0, '오류 없음', who.errors.concat(ph.errors).slice(0, 3));
});
