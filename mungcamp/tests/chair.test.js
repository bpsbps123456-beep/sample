// 의자: 마을과 장면에서 접이식 의자를 펴고 앉아 책 읽기, 걷기 시작하면 접기, 다른 사람 화면에도,
// 물에 떠 있을 때는 펼 수 없다는 안내, 키보드 C
'use strict';
const { main } = require('./lib');

main(async ({ check, staticServer, person, until, sleep, cleanup, enter }) => {
  const site = await staticServer();
  cleanup(() => site.close());
  const who = await person({ nick: '느긋함' });
  cleanup(() => who.close());
  const A = who.page;
  await A.goto(site.url);
  await until(A, () => MC.app.state.view === 'home' && MC.app.camp.w > 1);
  await sleep(600);

  // 마을: 단추로 펴고 앉아 책을 읽는다
  await A.click('#chairBtn');
  check(await until(A, () => MC.app.camp.pup.chair === 1, null, 3000), '마을: 의자를 펴고 올라앉는다');
  check((await A.getAttribute('#chairBtn', 'aria-pressed')) === 'true', '의자 단추가 눌린 상태');
  const lifted = await A.evaluate(() => MC.app.camp.pup.seatLift);
  check(lifted > 20, '의자에 앉으면 멍이가 의자 높이만큼 올라간다', lifted);
  check(await A.evaluate(() => MC.app.camp.netState().ch === 1), '함께 있는 사람에게도 알린다 (ch)');
  await A.evaluate(() => { MC.app.camp.pup.nextPage = 0; });
  check(await until(A, () => MC.app.camp.pup.pageT >= 0, null, 2000, 20), '가끔 책장을 넘긴다');

  // 같은 브라우저의 다른 탭에서 보면
  const B = await who.tab('B');
  await B.goto(site.url);
  check(await until(B, () => { const v = [...MC.app.camp.visitors.values()][0]; return !!v && v.pup.chair === 1; }, null, 10000), '다른 사람 화면에서도 의자에 앉아 책을 읽는다');

  // 걷기 시작하면 의자를 접고 걷는다
  await A.bringToFront();
  const x0 = await A.evaluate(() => MC.app.camp.pup.x);
  await A.keyboard.down('ArrowRight');
  await sleep(1200);
  await A.keyboard.up('ArrowRight');
  const after = await A.evaluate(() => ({ x: MC.app.camp.pup.x, chair: MC.app.camp.pup.chair, on: MC.app.camp.pup.chairOn }));
  check(!after.on && after.chair === 0 && after.x - x0 > 60, '걸으면 의자를 접고 걷는다', after);
  check((await A.getAttribute('#chairBtn', 'aria-pressed')) === 'false', '의자 단추도 풀린다');
  check(await until(B, () => { const v = [...MC.app.camp.visitors.values()][0]; return !!v && v.pup.chair === 0; }, null, 6000), '다른 사람 화면에서도 접힌다');
  await B.close();

  // 키보드 C
  await A.focus('#campCanvas');
  await A.keyboard.press('KeyC');
  check(await until(A, () => MC.app.camp.pup.chairOn, null, 2000), '마을: C 키로도 편다');
  await A.keyboard.press('KeyC');
  check(await until(A, () => !MC.app.camp.pup.chairOn, null, 2000), '다시 C 키로 접는다');

  // 모닥불: 아래 단추 줄의 '의자'
  await enter(A, site.url, 'fire');
  await until(A, () => !!(MC.app.state.sceneObj && MC.app.state.sceneObj.crowd && MC.app.state.started));
  await sleep(1500);
  await A.click('#dockScene [data-act="chair"]');
  check(await until(A, () => MC.app.state.sceneObj.pup.chair === 1, null, 3000), '모닥불 곁에서 의자에 앉아 책을 읽는다');
  check(await A.evaluate(() => { const sc = MC.app.state.sceneObj; return !sc.pup.stick && sc.crowd.state().ch === 1; }), '꼬치 대신 책을 든다');
  check((await A.getAttribute('#dockScene [data-act="chair"]', 'aria-pressed')) === 'true', '장면의 의자 단추가 눌린 상태');
  await A.keyboard.down('ArrowLeft');
  await sleep(900);
  await A.keyboard.up('ArrowLeft');
  check(await until(A, () => MC.app.state.sceneObj.pup.chair === 0, null, 2000), '장면에서도 걸으면 접는다');

  // 바다: 튜브에 떠 있을 때는 펼 수 없다
  await enter(A, site.url, 'water');
  await until(A, () => !!(MC.app.state.sceneObj && MC.app.state.sceneObj.crowd && MC.app.state.started));
  await sleep(1500);
  await A.click('#sceneAct');
  const floating = await until(A, () => { const sc = MC.app.state.sceneObj; return sc.floating && sc.pup.lie === 1; }, null, 12000);
  if (floating) {
    await A.click('#dockScene [data-act="chair"]');
    await sleep(300);
    check(await A.evaluate(() => !MC.app.state.sceneObj.pup.chairOn && /의자를 펼 수 없어요/.test(document.querySelector('#toast').textContent)), '물에 떠 있을 때는 펼 수 없다고 알려 준다');
  } else check(false, '튜브에 오르기');
  check(who.errors.length === 0, '오류 없음', who.errors.slice(0, 3));
});
