'use strict';
const {main} = require('./lib');

main(async ({check, staticServer, person, enter, sleep, shot, cleanup}) => {
  const srv = await staticServer(); cleanup(() => srv.close());
  const one = await person(); cleanup(() => one.close());
  const A = one.page;
  await enter(A, srv.url, 'firetower'); await sleep(700);
  await A.evaluate(() => MC.app.state.runner.stop());
  const advance = async (page, frames) => page.evaluate(n => {
    const r = MC.app.state.runner;
    for (let i = 0; i < n; i++) r.scene.update(1 / 60);
    r.drawOnce();
  }, frames);
  await A.click('[data-act=log]');
  const held = await A.evaluate(() => {
    const s = MC.app.state.sceneObj, f = s.flying[0];
    return {held: f.held, distance: Math.hypot(f.from.x - s.pup.x, f.from.y - s.pup.y), scale: s.pup.k, queued: s.addLog()};
  });
  check(held.held && held.distance < 80 * held.scale && !held.queued, '장작이 내 강아지 앞발에서 시작하며 던지는 중에는 겹쳐 던지지 않는다', held);
  await advance(A, 15);
  const lifted = await A.evaluate(() => {
    const s = MC.app.state.sceneObj, f = s.flying[0];
    return {held: f.held, above: (s.pup.y - f.from.y) / s.pup.k};
  });
  check(lifted.held && lifted.above > 100, '앞발로 장작을 머리 위까지 들어 올린다', lifted);
  await shot(A, 'tower-throw-lift');
  const follows = await A.evaluate(() => {
    const s = MC.app.state.sceneObj, before = s.flying[0].from.x;
    s.crowd.me.X += 25; s.update(1 / 60);
    return s.flying[0].held && s.flying[0].from.x > before + 10 * s.s;
  });
  check(follows, '들고 있는 동안 강아지가 이동하면 장작도 함께 움직인다');
  await advance(A, 10);
  check(await A.evaluate(() => {
    const s = MC.app.state.sceneObj, f = s.flying[0];
    return !f.held && f.t > 0 && !!s.pup.logThrow;
  }), '장작을 놓으면서 강아지가 앞발을 뻗는다');
  await shot(A, 'tower-throw-release');
  await advance(A, 25);
  check(await A.evaluate(() => {
    const s = MC.app.state.sceneObj, f = s.flying[0], p = s.flyingPose(f);
    return p.y < Math.min(f.from.y, f.to.y) && p.x > Math.min(f.from.x, f.to.x) && p.x < Math.max(f.from.x, f.to.x) && !s.pup.logThrow;
  }), '장작은 위로 포물선을 그리고 앞발은 다시 내려온다');
  await shot(A, 'tower-throw-flight');
  await A.setViewportSize({width: 780, height: 620});
  await A.evaluate(() => MC.app.state.runner.resize());
  await advance(A, 40);
  check(await A.evaluate(() => {
    const s = MC.app.state.sceneObj;
    return !s.flying.length && s.logs.length === 5 && s.logs.every((l, i) => !i || l.axis !== s.logs[i - 1].axis);
  }), '날아가는 중 화면 크기가 바뀌어도 교차 장작탑 꼭대기에 착지한다');

  await A.evaluate(() => {
    const s = MC.app.state.sceneObj;
    s.crowd.me = {X: 186, Z: 47}; s.crowd.placeMe(); s.crowd.settle();
    s.pup.setChair(true);
  });
  await advance(A, 60);
  await A.click('[data-act=log]'); await advance(A, 15);
  check(await A.evaluate(() => {
    const s = MC.app.state.sceneObj, f = s.flying[0];
    return s.pup.chair > .9 && f.from.x > s.cx && s.pup.logThrow.side === -1 && f.from.y < s.pup.y - 100 * s.pup.k;
  }), '불 오른쪽 의자에 앉아서도 불 쪽으로 장작을 들어 올린다');
  await shot(A, 'tower-throw-chair');
  await advance(A, 75);
  check(await A.evaluate(() => {
    const s = MC.app.state.sceneObj;
    return s.logs.length === 6 && !s.pup.logThrow && s.pup.chair > .9;
  }), '던진 뒤 의자와 독서 자세로 돌아온다');

  const phone = await person({phone: true}); cleanup(() => phone.close());
  const P = phone.page;
  await enter(P, srv.url, 'firetower'); await sleep(700);
  await P.evaluate(() => {
    const r = MC.app.state.runner, s = r.scene;
    r.stop(); s.crowd.me = s.crowd.clampIn({X: 100, Z: 112}); s.crowd.placeMe(); s.crowd.settle();
    for (let i = 4; i < 11; i++) s.logs.push(s.towerLog(i));
  });
  await advance(P, 60);
  await P.click('[data-act=log]'); await advance(P, 15);
  await shot(P, 'tower-throw-mobile-lift');
  await advance(P, 36);
  const mobile = await P.evaluate(() => {
    const s = MC.app.state.sceneObj, p = s.flyingPose(s.flying[0]);
    return {x: p.x, y: p.y, width: s.w, height: s.h, back: s.pup.view === 'back'};
  });
  check(mobile.back && mobile.x > 0 && mobile.x < mobile.width && mobile.y > 0 && mobile.y < mobile.height, '휴대폰에서 뒤돌아 던져도 열두 번째 단으로 가는 장작이 화면 안에 보인다', mobile);
  await shot(P, 'tower-throw-mobile-flight');
  await advance(P, 40);
  check(await P.evaluate(() => MC.app.state.sceneObj.logs.length === 12 && !MC.app.state.sceneObj.flying.length), '휴대폰에서도 최대 높이에 정상 착지한다');
  check(!one.errors.length && !phone.errors.length, '장작 동작 중 오류 없음', one.errors.concat(phone.errors));
});
