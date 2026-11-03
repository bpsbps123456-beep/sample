// 처음 들어올 때의 마음 단어(닉네임): 한 번만 묻기, 험한 말 막기, 빈칸이면 예시 단어,
// 다른 사람의 단어는 눌러야만 머리 위에 잠깐, 억지로 보낸 험한 말은 서버가 비운다
'use strict';
const { main } = require('./lib');

main(async ({ check, presenceServer, person, until, sleep, tapVisitor, cleanup }) => {
  const srv = await presenceServer();
  cleanup(() => srv.close());

  const A = await person({ nick: null, name: 'A' });
  cleanup(() => A.close());
  await A.page.goto(srv.url);
  check(await until(A.page, () => !document.querySelector('#nickCard').hidden), '처음 오면 마음 단어를 묻는다');
  check(/현재 마음을 잘 표현할 단어/.test(await A.page.textContent('#nick-title')), '물음 문구');
  await A.page.fill('#nickInput', '씨 발');
  await A.page.press('#nickInput', 'Enter');
  await sleep(300);
  check(await A.page.isVisible('#nickCard'), '험한 말은 받지 않는다', await A.page.textContent('#nickFine'));
  const x0 = await A.page.evaluate(() => MC.app.camp.pup.x);
  await A.page.fill('#nickInput', '');
  await A.page.type('#nickInput', 'wasd');
  await sleep(300);
  check((await A.page.evaluate(() => MC.app.camp.pup.x)) === x0, '적는 동안에는 걷기 단축키가 쉰다');
  await A.page.fill('#nickInput', '포근함');
  await A.page.click('#nickForm button[type=submit]');
  await sleep(400);
  check(!(await A.page.isVisible('#nickCard')) && (await A.page.evaluate(() => MC.app.net.name)) === '포근함', '정한 단어가 저장된다');
  await A.page.reload();
  await sleep(1200);
  check(!(await A.page.isVisible('#nickCard')), '다시 오면 묻지 않는다');

  const B = await person({ nick: null, name: 'B' });
  cleanup(() => B.close());
  await B.page.goto(srv.url);
  await until(B.page, () => !document.querySelector('#nickCard').hidden);
  const ph = await B.page.getAttribute('#nickInput', 'placeholder');
  await B.page.click('#nickForm button[type=submit]');
  await sleep(400);
  check((await B.page.evaluate(() => MC.app.net.name)) === ph, '비워 두면 예시 단어', ph);

  // 모닥불에서 A 가 B 를 톡: 머리 위에 B 의 단어가 잠깐
  await A.page.evaluate(() => { location.hash = 'fire'; });
  await B.page.evaluate(() => { location.hash = 'fire'; });
  await until(A.page, () => !!(MC.app.state.sceneObj && MC.app.state.sceneObj.crowd && MC.app.state.sceneObj.crowd.visitors.size === 1), null, 12000);
  await sleep(6000);
  check(!(await A.page.evaluate(() => document.querySelector('#sceneName').classList.contains('is-on'))), '누르기 전에는 단어가 보이지 않는다');
  check(await tapVisitor(A.page), 'A 가 B 멍이를 톡');
  await sleep(400);
  const tag = await A.page.evaluate(() => { const t = document.querySelector('#sceneName'); return t.classList.contains('is-on') ? t.textContent : null; });
  check(tag === ph, '머리 위에 그 사람의 단어', tag);
  await sleep(3800);
  check(!(await A.page.evaluate(() => document.querySelector('#sceneName').classList.contains('is-on'))), '3초쯤 뒤 사라진다');

  // 클라이언트를 고쳐 험한 단어를 보내도 서버와 받는 쪽에서 비운다
  await B.page.evaluate(() => { MC.app.net.name = '병 신'; MC.app.net.set(Object.assign({}, MC.app.net.mine, { x: MC.app.net.mine.x + 1 })); });
  await sleep(1500);
  const names = await A.page.evaluate(() => MC.app.net.list('fire').map((q) => q.s.n));
  check(names.length === 1 && names[0] === '', '억지로 보낸 험한 단어는 비운다', names);
  for (const p of [A, B]) check(p.errors.length === 0, '오류 없음', p.errors.slice(0, 2));
});
