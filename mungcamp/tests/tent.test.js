// 글램핑: 마을 남쪽 글램핑장에서 '들어가기', 문으로 걸어 들어오기, 걷는 빠르기, '눕기'로 침대에 엎드리기,
// 둘이 같은 자리를 골라도 옆자리에, 방향키로 일어나기, Esc 로 마을의 글램핑장 앞으로. 모닥불에는 이제 텐트가 없다
'use strict';
const { main } = require('./lib');

main(async ({ check, staticServer, person, until, sleep, cleanup }) => {
  const site = await staticServer();
  cleanup(() => site.close());
  const who = await person({ nick: '나른함' });
  cleanup(() => who.close());
  const A = who.page;
  // 모닥불 장면에는 텐트가 없다
  await A.goto(site.url + '#fire');
  await until(A, () => !!(MC.app.state.sceneObj && MC.app.state.sceneObj.w));
  check(await A.evaluate(() => { const sc = MC.app.state.sceneObj; return !sc.tent && !sc.goTent && !sc.portalHint; }), '모닥불에는 텐트가 없다');
  // 마을의 글램핑장 앞에서 '들어가기'
  await A.goto(site.url + '#');
  await until(A, () => MC.app.state.view === 'home');
  await A.evaluate(() => MC.app.camp.placeAt('tent'));
  await sleep(500);
  const act = await A.evaluate(() => { const c = MC.app.camp; return c.near ? [c.near.id, c.near.label, c.near.act] : null; });
  check(act && act[0] === 'tent' && act[1] === '글램핑' && act[2] === '들어가기', "마을 남쪽 '글램핑' 앞에 '들어가기'", act);
  await A.evaluate(() => { [...document.querySelectorAll('.spot-act')].find((b) => !b.hidden).click(); });
  check(await until(A, () => MC.app.state.scene === 'tent' && MC.app.state.sceneObj && MC.app.state.sceneObj.w, null, 8000), '들어가면 글램핑 텐트 안');
  check(await until(A, () => !!MC.app.state.sceneObj.crowd.portal, null, 3000, 30), '문간에서 걸어 들어온다');
  await sleep(2500);
  check(await until(A, () => !document.querySelector('#sceneActWrap').hidden && document.querySelector('#sceneAct').textContent === '눕기', null, 6000), "침대 위에 '눕기' 단추");

  const x0 = await A.evaluate(() => MC.app.state.sceneObj.pup.x);
  await A.keyboard.down('ArrowLeft');
  await sleep(1000);
  await A.keyboard.up('ArrowLeft');
  const x1 = await A.evaluate(() => MC.app.state.sceneObj.pup.x);
  check(x0 - x1 > 120, '텐트 안에서도 모닥불 앞만큼 걷는다', `${Math.round(x0 - x1)}px/초`);
  await sleep(1200);

  await A.click('#sceneAct');
  check(await until(A, () => { const sc = MC.app.state.sceneObj; return sc.crowd.perched && sc.pup.lie === 1 && sc.bedSpot > 0; }, null, 10000), "'눕기'로 침대에 엎드린다");

  // 같은 브라우저의 다른 탭(B)도 같은 자리를 골라 눕는다 → 옆자리
  const B = await who.tab('B');
  await B.goto(site.url + '#tent');
  await until(B, () => !!(MC.app.state.sceneObj && MC.app.state.sceneObj.w && MC.app.state.sceneObj.crowd.visitors.size === 1), null, 10000);
  await sleep(2000);
  const want = await A.evaluate(() => MC.app.state.sceneObj.bedSpot);
  await B.evaluate((i) => { const sc = MC.app.state.sceneObj; sc.tapBed(sc.L.bed.x + sc.bedSpotX(i) * sc.L.bed.k); }, want);
  await until(B, () => MC.app.state.sceneObj.crowd.perched, null, 12000);
  await sleep(1500);
  const spots = [await A.evaluate(() => MC.app.state.sceneObj.bedSpot), await B.evaluate(() => MC.app.state.sceneObj.bedSpot)];
  check(spots[0] > 0 && spots[1] > 0 && spots[0] !== spots[1], '같은 자리를 골라도 옆자리에 눕는다', spots);
  await B.close();

  await A.bringToFront();
  await A.keyboard.down('ArrowDown');
  await sleep(300);
  await A.keyboard.up('ArrowDown');
  check(await until(A, () => !MC.app.state.sceneObj.crowd.perched, null, 3000), '방향키로 일어난다');
  await A.keyboard.press('Escape');
  check(await until(A, () => MC.app.state.view === 'home', null, 8000), 'Esc 로 마을로 나온다');
  const near = await A.evaluate(() => { const c = MC.app.camp; const s = MC.CAMP_SPOTS.find((q) => q.id === 'tent'); return Math.round(Math.hypot(c.pup.x - s.x, c.pup.y - s.y)); });
  check(near < 60, '글램핑장 앞에 선다', near);
  check(who.errors.length === 0, '오류 없음', who.errors.slice(0, 3));
});
