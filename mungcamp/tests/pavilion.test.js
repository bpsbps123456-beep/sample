// 정자 방석: 계단으로 올라가 앉기, 다른 사람과 자리 나누기, 누르기·방향키로 내려오기.
'use strict';
const { main } = require('./lib');

main(async ({ check, presenceServer, person, until, sleep, cleanup, shot }) => {
  const site = await presenceServer();
  cleanup(() => site.close());
  const who = await person({ nick: '마루', phone: true });
  cleanup(() => who.close());
  const A = who.page;
  await A.goto(site.url);
  await until(A, () => !!window.MC?.app?.camp?.ground);
  await A.evaluate(() => MC.app.camp.placeAt('moktak'));
  await until(A, () => MC.app.camp.near?.id === 'moktak');

  const tapSeat = async (page, id) => {
    const p = await page.evaluate(id => {
      const c = MC.app.camp, q = MC.CAMP_PAVILION_SEATS[id - 1];
      const r = document.querySelector('#campCanvas').getBoundingClientRect();
      const s = c.toScreen(q.x, q.y);
      return { x: r.left + s.x, y: r.top + s.y };
    }, id);
    await page.mouse.click(p.x, p.y);
  };
  await tapSeat(A, 1);
  check(await until(A, () => MC.app.camp.pavilionSeat === 1 && !MC.app.camp.pavilionMove), '휴대폰: 방석을 누르면 계단으로 올라가 앉는다');
  const seated = await A.evaluate(() => {
    const c = MC.app.camp, p = c.pup, q = MC.CAMP_PAVILION_SEATS[0];
    return { distance: Math.hypot(p.x - q.x, p.y - q.y), hidden: c.hiddenBehind(), state: c.netState(), lie: p.lie, chair: p.chairOn };
  });
  check(seated.distance < 1 && !seated.hidden && seated.lie === 0 && !seated.chair, '마루 위에서 멍이가 지붕에 가려지거나 눕지 않는다', seated);
  check(seated.state.q === 1 && seated.state.l === 1 && !seated.state.w, '방석 번호와 앉은 상태를 함께 있는 사람에게 알린다');
  await A.click('#chairBtn');
  check(await A.evaluate(() => !MC.app.camp.pup.chairOn && MC.app.camp.pavilionSeat === 1), '방석 위에 접이식 의자를 겹쳐 펴지 않는다');
  await A.click('.spot[data-tone="paper"] .spot-act');
  check(await until(A, () => MC.app.camp.moktakHit > .1, null, 2000, 30), '정자에 앉아서도 목탁을 칠 수 있다');

  const B = await who.tab('친구');
  await B.goto(site.url);
  await until(B, () => !!window.MC?.app?.camp?.ground);
  await B.evaluate(() => MC.app.camp.placeAt('moktak'));
  check(await until(B, () => [...MC.app.camp.visitors.values()].some(v => v.st.q && v.st.l === 1 && v.pup.lie === 0)), '친구 화면에도 방석에 앉은 모습이 보인다');
  await tapSeat(B, 2);
  check(await until(B, () => MC.app.camp.pavilionSeat === 2 && !MC.app.camp.pavilionMove), '친구는 옆 방석에 앉는다');
  check(await until(A, () => [...MC.app.camp.visitors.values()].some(v => v.st.q && v.st.l === 2)), '서로 다른 방석에서 함께 쉰다');
  await A.bringToFront();
  await shot(A, 'pavilion-seating-phone');
  const goal = await A.evaluate(() => {
    const c = MC.app.camp, q = { x: 1540, y: 710 };
    const r = document.querySelector('#campCanvas').getBoundingClientRect(), s = c.toScreen(q.x, q.y);
    return { x: r.left + s.x, y: r.top + s.y };
  });
  await A.mouse.click(goal.x, goal.y);
  check(await until(A, () => { const c = MC.app.camp; return !c.pavilionSeat && !c.pavilionMove && Math.hypot(c.pup.x - 1540, c.pup.y - 710) < 20; }), '다른 곳을 누르면 계단으로 내려온 뒤 그곳까지 걷는다');
  check(await until(B, () => [...MC.app.camp.visitors.values()].some(v => !v.st.q && !v.st.l && !v.jumpFrom)), '내려온 상태도 친구에게 반영되고 이동 동작이 남지 않는다');
  await B.bringToFront();
  await B.focus('#campCanvas');
  await B.keyboard.down('ArrowRight');
  await sleep(1800);
  await B.keyboard.up('ArrowRight');
  check(await B.evaluate(() => { const c = MC.app.camp; return !c.pavilionSeat && !c.pavilionMove && c.pup.x > 1500 && c.pup.y > 560; }), '방향키로도 계단으로 내려온 뒤 걷는다');
  await B.close();

  // 두 사람이 같은 빈 방석을 동시에 골라도 겹쳐 앉지 않는다.
  const C = await who.tab('같이 앉기');
  await C.goto(site.url);
  await until(C, () => !!window.MC?.app?.camp?.ground);
  await A.evaluate(() => MC.app.camp.placeAt('moktak'));
  await C.evaluate(() => MC.app.camp.placeAt('moktak'));
  await until(C, () => MC.app.camp.near?.id === 'moktak');
  await Promise.all([tapSeat(A, 2), tapSeat(C, 2)]);
  check(await until(A, () => {
    const c = MC.app.camp;
    return !!c.pavilionSeat && !c.pavilionMove && [...c.visitors.values()].some(v => !v.leaving && v.st.q && v.st.l !== c.pavilionSeat && !v.st.w);
  }, null, 15000), '같은 방석을 동시에 골라도 서로 다른 자리에 앉는다');
  check(await until(C, () => { const c = MC.app.camp; return !!c.pavilionSeat && !c.pavilionMove && !c.pup.lie; }), '옆자리로 옮긴 사람도 편하게 앉는다');
  await C.close();
  check(who.errors.length === 0, '실행 오류 없음', who.errors);
});
