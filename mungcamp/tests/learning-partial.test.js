'use strict';
const { main } = require('./lib');
main(async ({ check, until, person, presenceServer, cleanup }) => {
  const server = await presenceServer(); cleanup(server.close);
  const owner = await person({ nick: '공개운영멍', viewport: { width: 1280, height: 900 } }), a = await person({ nick: '첫답변멍' }), b = await person({ nick: '둘째답변멍', phone: true });
  for (const p of [owner, a, b]) cleanup(p.close);
  for (const [p, pin] of [[owner.page, '8624'], [a.page, '0000'], [b.page, '0000']]) {
    await p.goto(server.url); await until(p, () => MC.app.net.online); await p.click('#learnBtn'); await p.fill('#learnPin', pin); await p.press('#learnPin', 'Enter');
    await until(p, () => MC.app.state.sceneObj?.lesson?.roster.length);
  }
  await owner.page.click('.learn-open-owner'); await owner.page.selectOption('[name="type"]', 'text'); await owner.page.fill('[name="question"]', '함께 하고 싶은 일은?'); await owner.page.click('.learn-question-form [type="submit"]');
  for (const [p, answer] of [[a.page, '함께 산책하기'], [b.page, '책 읽기']]) {
    await until(p, () => !!MC.app.state.sceneObj.lesson.question); await p.fill('.learn-answer-form textarea', answer); await p.click('.learn-answer-form [type="submit"]');
  }
  await until(owner.page, () => MC.app.state.sceneObj.lesson.answered === 2);
  const aid = await a.page.evaluate(() => MC.app.net.id), bid = await b.page.evaluate(() => MC.app.net.id);
  const signA = `.learn-seat[data-id="${aid}"] .learn-sign`, signB = `.learn-seat[data-id="${bid}"] .learn-sign`;
  check(await owner.page.locator(signA).isEnabled() && await owner.page.locator(signA).textContent() === '답변 완료', '운영자의 답변 완료 팻말 클릭 가능');
  check(await b.page.locator(signA).isDisabled(), '참여자는 다른 사람의 비공개 답 공개 불가');
  await owner.page.click(signA);
  check(await until(b.page, id => MC.app.state.sceneObj.lesson.boards[id]?.text === '함께 산책하기', aid) && await until(owner.page, id => MC.app.state.sceneObj.lesson.boards[id]?.text === '함께 산책하기', aid), '운영자가 누른 답만 모두의 팻말에 공개');
  check(await owner.page.evaluate(id => !MC.app.state.sceneObj.lesson.boards[id].text && MC.app.state.sceneObj.lesson.phase === 'open', bid), '나머지 답은 비공개로 유지하며 응답 계속 받기');
  await b.page.click(signA); check(await b.page.locator('.learn-detail p').textContent() === '함께 산책하기', '공개된 팻말은 휴대폰에서 답 전체 보기'); await b.page.click('.learn-detail button');
  await a.page.fill('.learn-answer-form textarea', '다시 적은 비공개 답'); await a.page.click('.learn-answer-form [type="submit"]');
  check(await until(owner.page, id => !MC.app.state.sceneObj.lesson.boards[id].text, aid) && await until(b.page, id => !MC.app.state.sceneObj.lesson.boards[id].text, aid), '부분 공개 후 수정한 새 답은 자동 공개하지 않음');
  await owner.page.click(signA);
  check(await until(b.page, id => MC.app.state.sceneObj.lesson.boards[id].text === '다시 적은 비공개 답', aid), '수정한 답도 운영자가 다시 눌러 개별 공개');
  await owner.page.click('.learn-open-owner'); await owner.page.click('[data-command="close"]'); await owner.page.click('[data-dismiss]');
  await owner.page.click(signB);
  check(await until(a.page, id => MC.app.state.sceneObj.lesson.phase === 'closed' && MC.app.state.sceneObj.lesson.boards[id].text === '책 읽기', bid), '응답 마감 후에도 원하는 답만 공개');
  check(![...owner.errors, ...a.errors, ...b.errors].length, '개별 답 공개 중 브라우저 오류 없음', [...owner.errors, ...a.errors, ...b.errors]);
});
