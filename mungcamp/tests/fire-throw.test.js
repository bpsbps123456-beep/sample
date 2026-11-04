'use strict';
const {main} = require('./lib');

main(async ({check, staticServer, person, enter, until, shot, cleanup}) => {
  const srv = await staticServer(); cleanup(() => srv.close());
  const one = await person(); cleanup(() => one.close());
  const A = one.page;
  const advance = async (page, frames) => page.evaluate(n => {
    const r = MC.app.state.runner;
    for (let i = 0; i < n; i++) r.scene.update(1 / 60);
    r.drawOnce();
  }, frames);
  await enter(A, srv.url, 'fire');
  await until(A, () => MC.app.state.started);
  await until(A, () => Number(getComputedStyle(document.querySelector('.curtain')).opacity) < .02);
  await A.evaluate(() => MC.app.state.runner.stop());
  const initial = await A.evaluate(() => MC.app.state.sceneObj.logs.length);
  await A.click('[data-act=log]');
  const held = await A.evaluate(() => {
    const s = MC.app.state.sceneObj, f = s.flying[0];
    const accepted = Array.from({length: 8}, () => s.addLog()).filter(Boolean).length;
    return {actor: f.actor, held: f.held, flying: s.flying.length, accepted, single: f.log.axis === undefined,
      distance: Math.hypot(f.from.x - s.pup.x, f.from.y - s.pup.y) / s.pup.k};
  });
  check(held.actor && held.held && held.flying === 1 && !held.accepted && held.single && held.distance < 80,
    '일반 모닥불에서도 내 강아지가 장작 한 개를 들고, 연속 입력은 한꺼번에 던지지 않는다', held);
  await advance(A, 15);
  check(await A.evaluate(() => {
    const s = MC.app.state.sceneObj, f = s.flying[0];
    const height = (s.pup.y - f.from.y) / s.pup.k;
    return f.held && height > 20 && height < 42;
  }), '앞발은 몸 가까이에서 짧게 움직인다');
  await shot(A, 'fire-throw-held');
  await advance(A, 35);
  check(await A.evaluate(() => {
    const s = MC.app.state.sceneObj, f = s.flying[0], p = s.flyingPose(f);
    return !f.held && p.y < Math.min(f.from.y, f.to.y) && !s.pup.logThrow;
  }), '장작은 모닥불로 포물선을 그리고 강아지는 앞발을 내린다');
  await shot(A, 'fire-throw-flight');
  await A.setViewportSize({width: 780, height: 620});
  await A.evaluate(() => MC.app.state.runner.resize());
  await advance(A, 1);
  check(await A.evaluate(() => {
    const s = MC.app.state.sceneObj, f = s.flying[0], target = s.world(f.log);
    return Math.abs(f.to.x - target.x) < .01 && Math.abs(f.to.y - target.y) < .01;
  }), '화면 크기가 바뀌어도 장작은 모닥불 위치로 향한다');
  await advance(A, 40);
  check(await A.evaluate(n => {
    const s = MC.app.state.sceneObj;
    return !s.flying.length && s.logs.length === n + 1 && s.logs.every(l => l.axis === undefined);
  }, initial), '불에 닿으면 실제 장작도 정확히 한 개 늘어난다');
  await A.click('[data-act=log]');
  await advance(A, 90);
  check(await A.evaluate(n => MC.app.state.sceneObj.logs.length === n + 2, initial), '착지한 뒤 다음 장작을 다시 한 개 던질 수 있다');

  const phone = await person({phone: true}); cleanup(() => phone.close());
  const P = phone.page;
  await enter(P, srv.url, 'fire');
  await until(P, () => MC.app.state.started);
  await until(P, () => Number(getComputedStyle(document.querySelector('.curtain')).opacity) < .02);
  await P.evaluate(() => {
    const s = MC.app.state.sceneObj;
    MC.app.state.runner.stop();
    s.crowd.me = s.crowd.clampIn({X: 186, Z: 47}); s.crowd.placeMe(); s.crowd.settle();
    s.pup.setChair(true);
  });
  await advance(P, 60);
  await P.click('[data-act=log]'); await advance(P, 15);
  check(await P.evaluate(() => {
    const s = MC.app.state.sceneObj, f = s.flying[0], b = document.querySelector('[data-act=log]').getBoundingClientRect();
    return s.pup.chair > .9 && f.held && s.pup.logThrow.side === -1 && b.left >= 0 && b.right <= innerWidth;
  }), '휴대폰에서도 버튼이 잘리지 않고 오른쪽 의자에서 불을 향해 던진다');
  await shot(P, 'fire-throw-mobile-held');
  await advance(P, 75);
  check(await P.evaluate(() => {
    const s = MC.app.state.sceneObj;
    return s.logs.length === 5 && !s.flying.length && !s.pup.logThrow && s.pup.chair > .9;
  }), '장작 한 개가 착지한 뒤 편안히 앉은 자세로 돌아온다');
  check(!one.errors.length && !phone.errors.length, '모닥불 장작 던지기 중 오류 없음', one.errors.concat(phone.errors));
});
