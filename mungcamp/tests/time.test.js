// 천천히 흐르는 시간 (벽시계를 앞당겨 본다): 바다의 달, 모닥불의 별하늘, 숲의 빛줄기가 움직이고,
// 모닥불에 오래 머물면 반딧불이가 나온다
'use strict';
const { main } = require('./lib');

main(async ({ check, staticServer, person, until, sleep, cleanup, enter }) => {
  const site = await staticServer();
  cleanup(() => site.close());
  const who = await person();
  cleanup(() => who.close());
  await who.ctx.addInitScript(() => {
    window.__skew = 0;
    const real = Date.now.bind(Date);
    Date.now = () => real() + window.__skew * 1000;
  });
  const P = who.page;
  // 0분, 20분, 45분 뒤의 값 가운데 가장 크게 달라진 정도
  const probe = async (name, fn) => {
    await enter(P, site.url, name);
    await until(P, () => !!(MC.app.state.sceneObj && MC.app.state.sceneObj.w));
    await sleep(800);
    const out = [];
    for (const k of [0, 1200, 2700]) {
      await P.evaluate((s) => { window.__skew = s; }, k);
      await sleep(500);
      out.push(await P.evaluate(fn));
    }
    let most = 0;
    for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) most = Math.max(most, Math.hypot(...out[i].map((v, n) => v - out[j][n])));
    return { out, most };
  };
  const sea = await probe('water', () => { const m = MC.app.state.sceneObj.moon; return [m.x, m.y]; });
  check(sea.most > 5, '바다: 시간이 지나면 달이 자리를 옮긴다', sea.out.map((p) => p.map(Math.round)));
  const fire = await probe('fire', () => [MC.app.state.sceneObj.skyA]);
  check(fire.most > 0.004, '모닥불: 별하늘이 천천히 돈다', fire.out.map((a) => +((a[0] * 180) / Math.PI).toFixed(2)));
  const forest = await probe('forest', () => { const b = MC.app.state.sceneObj.beams[0]; return [Math.atan2(b.dy, b.dx), b.x0 / 100]; });
  check(forest.most > 0.01, '숲: 빛줄기의 기울기와 자리가 바뀐다', forest.out.map((a) => +((a[0] * 180) / Math.PI).toFixed(1)));

  await enter(P, site.url, 'fire');
  await until(P, () => !!(MC.app.state.sceneObj && MC.app.state.sceneObj.w));
  check((await P.evaluate(() => MC.app.state.sceneObj.bugs.length)) === 0, '막 왔을 때는 반딧불이가 없다');
  await P.evaluate(() => { MC.app.state.sceneObj.age = () => 900; });
  check(await until(P, () => MC.app.state.sceneObj.bugs.length === 9, null, 5000), '15분쯤 머물면 반딧불이 아홉', await P.evaluate(() => MC.app.state.sceneObj.bugs.length));
  check(who.errors.length === 0, '오류 없음', who.errors.slice(0, 3));
});
