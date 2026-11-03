// 같은 브라우저의 두 탭 (서버 없이 BroadcastChannel): 서로의 멍이가 보이고,
// 하트를 보내면 받은 쪽 멍이에게서도 하트가 오르고 응원 알림이 뜬다
'use strict';
const { main } = require('./lib');

main(async ({ check, staticServer, person, until, sleep, tapVisitor, cleanup }) => {
  const site = await staticServer();
  cleanup(() => site.close());
  const who = await person({ nick: '포근함' });
  cleanup(() => who.close());
  const A = who.page;
  const B = await who.tab('B');
  await A.goto(site.url + '#fire');
  await B.goto(site.url + '#fire');
  const seen = await until(A, () => !!(MC.app.state.sceneObj && MC.app.state.sceneObj.crowd && MC.app.state.sceneObj.crowd.visitors.size === 1), null, 12000);
  check(seen, '모닥불: A 화면에 B 멍이가 보인다');
  check((await A.evaluate(() => MC.app.net.kind)) === 'channel', '연결: 같은 브라우저 탭끼리', await A.evaluate(() => MC.app.net.kind));
  await sleep(5000); // 자리를 잡을 때까지
  const hb0 = await B.evaluate(() => MC.app.state.sceneObj.pup.heartBursts || 0);
  await A.bringToFront();
  check(await tapVisitor(A), 'A 가 B 멍이를 톡');
  check(await until(B, (h) => (MC.app.state.sceneObj.pup.heartBursts || 0) > h, hb0, 6000), 'B 멍이에게서도 하트가 오른다');
  const toast = await B.evaluate(() => document.querySelector('#toast').textContent);
  check(/포근함님이 나를 응원해주고 있어요/.test(toast), 'B 에게 응원 알림 (보낸 사람의 마음 단어)', toast);
  check(who.errors.length === 0, '오류 없음', who.errors.slice(0, 3));
});
