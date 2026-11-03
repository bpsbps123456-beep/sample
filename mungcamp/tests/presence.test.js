// 함께 모이기 서버: 서로 다른 브라우저(사람)끼리 보이고, 방이 차면 나뉘고, 사이트 파일도 건넨다
'use strict';
const { main } = require('./lib');

main(async ({ check, presenceServer, person, until, sleep, cleanup }) => {
  const srv = await presenceServer({ ROOM_CAP: '2' });
  cleanup(() => srv.close());
  const html = await (await fetch(srv.url)).text();
  check(/name="mc-presence" content="auto"/.test(html), '서버가 건넨 페이지는 같은 주소로 모인다 (auto)');
  check(/name="mc-version" content="[^"]+"/.test(html), '페이지에 사이트 버전이 들어 있다');
  check((await fetch(srv.url + 'server/presence.js')).status === 404, '서버 코드는 건네지 않는다');
  check((await fetch(srv.url + '..%2fREADME.md')).status === 404, '사이트 폴더 밖은 건네지 않는다');

  const people = [];
  for (const n of ['하나', '둘', '셋']) {
    const p = await person({ nick: n, name: n });
    cleanup(() => p.close());
    people.push(p);
    await p.page.goto(srv.url + '#fire');
    await until(p.page, () => MC.app && MC.app.net && MC.app.net.online, null, 8000);
    await sleep(500);
  }
  await sleep(5000);
  const st = await Promise.all(people.map(({ page }) => page.evaluate(() => ({ kind: MC.app.net.kind, sees: MC.app.state.sceneObj.crowd.visitors.size, count: MC.app.net.count('fire') }))));
  check(st.every((s) => s.kind === 'socket'), '셋 다 서버로 이어진다', st.map((s) => s.kind));
  check(st.map((s) => s.sees).sort().join() === '0,1,1', '한 방에 둘까지 (ROOM_CAP=2): 셋째는 새 방', st.map((s) => s.sees));
  check(st.every((s) => s.count === 3), '장소별 사람 수는 모든 방을 합쳐서', st.map((s) => s.count));
  const health = await (await fetch(srv.url + 'health')).json();
  check(health.clients === 3, '/health', health);

  // 같은 방의 한 사람이 걸으면 다른 사람 화면에서 움직인다
  const pair = st.map((s, i) => (s.sees === 1 ? i : -1)).filter((i) => i >= 0);
  const [a, b] = pair;
  const x0 = await people[b].page.evaluate(() => [...MC.app.state.sceneObj.crowd.visitors.values()][0].pup.x);
  await people[a].page.keyboard.down('ArrowRight');
  await sleep(1200);
  await people[a].page.keyboard.up('ArrowRight');
  await sleep(900);
  const x1 = await people[b].page.evaluate(() => [...MC.app.state.sceneObj.crowd.visitors.values()][0].pup.x);
  check(Math.abs(x1 - x0) > 20, '걸으면 같은 방 사람 화면에서도 움직인다', [Math.round(x0), Math.round(x1)]);
  for (const p of people) check(p.errors.length === 0, '오류 없음', p.errors.slice(0, 2));
});
