'use strict';
const { main } = require('./lib');
main(async ({ check, until, person, presenceServer, cleanup, sleep, shot }) => {
  const server = await presenceServer(); cleanup(server.close);
  const owner = await person({ nick: '진행멍', viewport: { width: 1280, height: 900 } }), a = await person({ nick: '걷는멍', viewport: { width: 1280, height: 900 } }), b = await person({ nick: '산책멍', phone: true });
  for (const p of [owner, a, b]) cleanup(p.close);
  for (const [p, pin] of [[owner.page, '8624'], [a.page, '0000'], [b.page, '0000']]) {
    await p.goto(server.url); await until(p, () => MC.app.net.online); await p.click('#learnBtn'); await p.fill('#learnPin', pin); await p.press('#learnPin', 'Enter');
    await until(p, () => MC.app.state.sceneObj?.lesson?.roster.length);
  }
  await owner.page.click('.learn-open-owner'); await owner.page.selectOption('[name="type"]', 'text'); await owner.page.fill('[name="question"]', '오늘 나누고 싶은 생각은?'); await owner.page.click('.learn-question-form [type="submit"]');
  await until(a.page, () => !!MC.app.state.sceneObj.lesson.question);
  await a.page.fill('.learn-answer-form textarea', '걸으며 천천히 생각하고 싶어요'); await a.page.click('.learn-answer-form [type="submit"]');
  await a.page.locator('.learn-answer-form [type="submit"]').blur();
  const aid = await a.page.evaluate(() => MC.app.net.id), bid = await b.page.evaluate(() => MC.app.net.id);
  await a.page.keyboard.down('ArrowRight'); await sleep(450); await a.page.keyboard.up('ArrowRight');
  check(await until(a.page, () => MC.app.state.sceneObj.walk.free && !MC.app.state.sceneObj.walk.moving && document.querySelector('.learn-seat.is-me').classList.contains('is-roaming')), '방향키로 둥근 자리에서 일어나 자유롭게 걷고 멈춤');
  check(await until(b.page, id => { const peer = MC.app.net.peers.get(id)?.s; return peer?.q === 1 && document.querySelector(`[data-id="${id}"]`).classList.contains('is-roaming'); }, aid), '친구 화면에 이동한 멍이와 팻말 위치 실시간 반영');
  check(await owner.page.evaluate(id => !MC.app.state.sceneObj.lesson.boards[id]?.text && MC.app.state.sceneObj.lesson.summary === null, aid), '이동 중에도 운영자에게 개별 답 비공개');
  check(await a.page.evaluate(() => !JSON.stringify(MC.app.net.mine).includes('걸으며 천천히 생각하고 싶어요')), '위치 메시지에 답을 섞지 않음');
  await a.page.click('.learn-chat-toggle'); await a.page.fill('#learnChatInput', '걷다가 잠깐 인사해요');
  const before = await a.page.evaluate(() => ({ x: MC.app.state.sceneObj.walk.x, y: MC.app.state.sceneObj.walk.y }));
  await a.page.press('#learnChatInput', 'ArrowLeft'); await sleep(200);
  check(await a.page.evaluate(at => { const w = MC.app.state.sceneObj.walk; return w.x === at.x && w.y === at.y && !w.moving; }, before), '대화 입력 중 방향키로 멍이가 움직이지 않음');
  await a.page.click('.learn-chat-head button');
  const target = await b.page.evaluate(() => { const f = document.querySelector('.learn-floor').getBoundingClientRect(); for (const x of [.7, .5, .3]) for (const y of [.6, .8, .4]) { const at = { x: f.left + f.width * x, y: f.top + f.height * y }; if (!document.elementFromPoint(at.x, at.y)?.closest('button')) return at; } });
  await b.page.touchscreen.tap(target.x, target.y);
  check(await until(b.page, () => MC.app.state.sceneObj.walk.free && !MC.app.state.sceneObj.walk.target), '휴대폰에서 바닥을 톡 눌러 원하는 곳까지 이동');
  check(await until(a.page, id => MC.app.net.peers.get(id)?.s.q === 1, bid), '휴대폰 이동을 PC에도 공유');
  await shot(b.page, 'learning-free-walking-phone');
  for (const p of [a.page, b.page]) {
    await p.click('.learn-return-seat');
    check(await until(p, () => !MC.app.state.sceneObj.walk.free && !document.querySelector('.learn-seat.is-me').classList.contains('is-roaming')), '둥근 자리로 걸어서 돌아와 앉기');
  }
  check(await until(owner.page, id => !MC.app.net.peers.get(id)?.s.q, aid), '자리 복귀도 친구에게 동기화');
  check(await a.page.evaluate(() => MC.app.state.sceneObj.lesson.own.text === '걸으며 천천히 생각하고 싶어요'), '이동·자리 복귀 후에도 내 팻말 답 유지');
  check(![...owner.errors, ...a.errors, ...b.errors].length, '자유 이동 중 브라우저 오류 없음', [...owner.errors, ...a.errors, ...b.errors]);
});
