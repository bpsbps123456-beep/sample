// 달빛 바다: '튜브 타기', 튜브 위에서 둥실둥실, 바다를 톡 해 헤엄치기, 다른 사람 화면의 튜브,
// 유리병 편지(예시 말 골라 띄우기), 고래 그리기, 모래밭으로 걸어 나오기
'use strict';
const { main } = require('./lib');

main(async ({ check, staticServer, person, until, sleep, shot, cleanup }) => {
  const site = await staticServer();
  cleanup(() => site.close());
  const who = await person({ nick: '둥실', look: { c: 2, h: 5 } });
  cleanup(() => who.close());
  const A = who.page;
  await A.goto(site.url + '#water');
  await until(A, () => !!(MC.app.state.sceneObj && MC.app.state.sceneObj.w));
  await sleep(1500);
  check(await A.evaluate(() => !document.querySelector('#sceneActWrap').hidden && document.querySelector('#sceneAct').textContent === '튜브 타기'), "'튜브 타기' 단추");
  await A.click('#sceneAct');
  check(await until(A, () => { const sc = MC.app.state.sceneObj; return sc.floating && sc.pup.rest === 'tube' && sc.pup.lie === 1; }, null, 10000), '바다에 들어가면 튜브에 엎드린다');
  await until(A, () => !MC.app.state.sceneObj.crowd.target, null, 8000);
  const p0 = await A.evaluate(() => [MC.app.state.sceneObj.crowd.me.X, MC.app.state.sceneObj.crowd.me.Z]);
  await sleep(5000);
  const p1 = await A.evaluate(() => [MC.app.state.sceneObj.crowd.me.X, MC.app.state.sceneObj.crowd.me.Z]);
  check(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 3, '가만히 있어도 둥실둥실 떠다닌다', [p0.map(Math.round), p1.map(Math.round)]);
  await shot(A, 'sea-float');

  const tgt = await A.evaluate(() => { const sc = MC.app.state.sceneObj; const x = sc.crowd.me.X < 500 ? sc.w * 0.72 : sc.w * 0.28; return [x, sc.hy + (sc.sandTop - sc.hy) * 0.55]; });
  await A.mouse.click(tgt[0], tgt[1]);
  check(await A.evaluate(() => !!MC.app.state.sceneObj.crowd.target), '바다를 톡 하면 그쪽으로 헤엄쳐 간다');

  const B = await who.tab('B');
  await B.goto(site.url + '#water');
  const seen = await until(B, () => { const sc = MC.app.state.sceneObj; if (!sc || !sc.crowd) return false; const v = [...sc.crowd.visitors.values()][0]; return !!v && v.pup.rest === 'tube' && v.pup.lie === 1; }, null, 12000);
  check(seen, '다른 사람 화면에서도 튜브 위에 떠 있다');
  await B.close();
  await A.bringToFront();

  await A.evaluate(() => MC.app.doAction('bottle'));
  await sleep(300);
  check((await A.evaluate(() => document.querySelectorAll('#bottleChips .chip-pick').length)) === 6, '유리병 편지 예시 말 여섯');
  await A.click('#bottleChips .chip-pick');
  check((await A.inputValue('#bottleInput')).length > 0, '예시 말을 고르면 칸에 들어간다');
  await A.click('#bottleForm button[type=submit]');
  check(await until(A, () => !!MC.app.state.sceneObj.bottle, null, 3000), '병을 띄운다');
  check((await A.inputValue('#bottleInput')) === '', '적은 말은 남기지 않는다');

  for (const u of [1.5, 3.5, 11.5]) {
    await A.evaluate((u) => { const sc = MC.app.state.sceneObj; sc.whaleNow = () => ({ k: 1, u, x: sc.moon.x, dir: 1 }); }, u);
    await sleep(150);
  }
  await shot(A, 'sea-whale');
  await A.evaluate(() => { delete MC.app.state.sceneObj.whaleNow; });

  const sand = await A.evaluate(() => { const sc = MC.app.state.sceneObj; return [sc.w * 0.12, sc.h - 24]; });
  await A.mouse.click(sand[0], sand[1]);
  check(await until(A, () => !MC.app.state.sceneObj.floating, null, 15000), '모래밭을 톡 하면 걸어 나온다');
  check(who.errors.length === 0, '오류 없음', who.errors.slice(0, 3));
});
