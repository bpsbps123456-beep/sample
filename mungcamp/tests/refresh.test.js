// 다시 배포되면 열려 있는 페이지도 알맞은 때에 새로 고친다:
// 마을에서 소리를 켜기 전이면 바로, 장면에서 쉬는 중이면 마을로 돌아올 때
'use strict';
const fs = require('fs');
const path = require('path');
const { main } = require('./lib');

main(async ({ check, presenceServer, copySite, person, until, sleep, cleanup, enter }) => {
  const site = copySite();
  cleanup(() => fs.rmSync(path.dirname(site), { recursive: true, force: true }));
  let srv = await presenceServer({}, site);
  const port = srv.port;
  cleanup(() => srv.close());
  const A = await person({ name: 'A' });
  cleanup(() => A.close());
  const B = await person({ name: 'B' });
  cleanup(() => B.close());
  await A.page.goto(srv.url);
  await enter(B.page, srv.url, 'fire');
  await sleep(2500);
  await A.page.evaluate(() => { window.__old = 1; });
  await B.page.evaluate(() => { window.__old = 1; });

  // 다시 배포: 내용을 바꾸고 같은 자리에 서버를 새로 띄운다
  const ix = path.join(site, 'index.html');
  fs.writeFileSync(ix, fs.readFileSync(ix, 'utf8').replace(/<title>([^<]*)<\/title>/, '<title>$1 · 새 버전</title>'));
  srv.close();
  await sleep(500);
  srv = await presenceServer({}, site, port);

  check(await until(A.page, () => !window.__old && document.title.includes('새 버전'), null, 15000), '마을에서 소리 켜기 전이면 바로 새 버전으로');
  await sleep(1000);
  check(await B.page.evaluate(() => window.__old === 1), '장면에서 쉬는 중이면 기다린다');
  await B.page.evaluate(() => { location.hash = ''; });
  check(await until(B.page, () => !window.__old && document.title.includes('새 버전') && !!(window.MC && MC.app) && MC.app.state.view === 'home', null, 15000), '마을로 돌아올 때 새 버전으로');
  for (const p of [A, B]) check(p.errors.length === 0, '오류 없음', p.errors.slice(0, 2));
});
