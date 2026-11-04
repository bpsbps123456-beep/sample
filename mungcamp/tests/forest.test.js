// 편백 숲: 화면 크기가 달라도 가지 여섯·자리 열하나, 꼭대기까지 올라가 엎드리기,
// 셋이 같은 자리를 골라도 한 자리에 한 마리, 다른 사람의 엎드린 모습, 다람쥐와 오목눈이
'use strict';
const { main } = require('./lib');

main(async ({ check, staticServer, presenceServer, person, until, sleep, shot, cleanup, enter }) => {
  const site = await staticServer();
  cleanup(() => site.close());
  const sizes = [['컴퓨터', { width: 1000, height: 700 }, false], ['휴대폰', { width: 390, height: 844 }, true], ['넓고 낮은 창', { width: 1440, height: 640 }, false]];
  for (const [tag, viewport, phone] of sizes) {
    const who = await person({ viewport, phone });
    cleanup(() => who.close());
    const P = who.page;
    await enter(P, site.url, 'forest');
    await until(P, () => !!(MC.app.state.sceneObj && MC.app.state.sceneObj.tree));
    const info = await P.evaluate(() => { const sc = MC.app.state.sceneObj; return { branches: sc.tree.branches.length, spots: sc.spots.length - 1 }; });
    check(info.branches === 6 && info.spots === 11, `${tag}: 가지 여섯, 자리 열하나`, info);
    await P.evaluate(() => { const sc = MC.app.state.sceneObj; sc.tapSpot(sc.spots.length - 1); });
    const top = await until(P, () => { const sc = MC.app.state.sceneObj; return sc.spot === sc.spots.length - 1 && sc.pup.rest === 'branch' && sc.pup.lie === 1; }, null, 12000);
    check(top, `${tag}: 아래 가지를 딛고 꼭대기 가지까지 올라가 엎드린다`);
    await shot(P, `forest-top-${viewport.width}`);
    check(who.errors.length === 0, `${tag}: 오류 없음`, who.errors.slice(0, 3));
    await who.close();
  }

  const srv = await presenceServer();
  cleanup(() => srv.close());
  const ps = [];
  for (const n of ['하나', '둘', '셋']) {
    const p = await person({ nick: n, name: n });
    cleanup(() => p.close());
    ps.push(p);
    await enter(p.page, srv.url, 'forest');
  }
  await sleep(6000);
  await Promise.all(ps.map(({ page }) => page.evaluate(() => MC.app.state.sceneObj.tapSpot(2))));
  await sleep(9000);
  const spots = await Promise.all(ps.map(({ page }) => page.evaluate(() => { const sc = MC.app.state.sceneObj; return sc.crowd.perched ? sc.spot : 0; })));
  const taken = spots.filter(Boolean);
  check(new Set(taken).size === taken.length, '같은 자리를 골라도 한 자리에 한 마리', spots);
  const seen = await ps[0].page.evaluate(() => [...MC.app.state.sceneObj.crowd.visitors.values()].filter((v) => v.st.q && v.st.l >= 2).map((v) => v.pup.rest));
  check(seen.every((r) => r === 'branch'), '다른 사람이 가지에 엎드린 모습이 보인다', seen);
  await ps[0].page.evaluate(() => { const sc = MC.app.state.sceneObj; sc.squirrel.next = 0; sc.birds[0].next = 0; });
  check(await until(ps[0].page, () => { const sc = MC.app.state.sceneObj; return sc.squirrel.state === 'sit' && sc.birds[0].state === 'perch'; }, null, 15000), '다람쥐와 오목눈이가 온다');
  for (const p of ps) check(p.errors.length === 0, '오류 없음', p.errors.slice(0, 2));
});
