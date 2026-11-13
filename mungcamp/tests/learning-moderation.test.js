'use strict';
const { main } = require('./lib');
main(async ({ check, until, person, presenceServer, cleanup, shot }) => {
  const server = await presenceServer(); cleanup(server.close);
  const owner = await person({ nick: '진행멍', viewport: { width: 1440, height: 900 } }); cleanup(owner.close);
  const a = await person({ nick: '생각하는멍', phone: true }); cleanup(a.close);
  const b = await person({ nick: '책읽는멍' }); cleanup(b.close);
  for (const [p, pin] of [[owner, '8624'], [a, '0000'], [b, '0000']]) {
    await p.page.goto(server.url); await until(p.page, () => MC.app.net.online);
    await p.page.click('#learnBtn'); await p.page.fill('#learnPin', pin); await p.page.press('#learnPin', 'Enter');
    await until(p.page, () => MC.app.state.sceneObj?.lesson?.roster.length);
  }
  const aid = await a.page.evaluate(() => MC.app.net.id);
  await a.page.evaluate(() => MC.app.net.link.learn('kick', MC.app.state.sceneObj.lesson.roster.find(m => m.name === '책읽는멍').id));
  check(await until(b.page, () => MC.app.state.scene === 'learn' && MC.app.state.sceneObj.lesson.roster.length === 3), '참여자의 위조 강퇴 요청은 서버에서 차단');
  await owner.page.evaluate(() => MC.app.net.link.learn('start', { text: '오늘의 생각', type: 'text' }));
  await until(a.page, () => MC.app.state.sceneObj.lesson.question);
  await a.page.fill('.learn-text-label textarea', '숲에서 쉬고 싶어요'); await a.page.click('.learn-answer-form [type="submit"]');
  await owner.page.click('.learn-open-owner');
  check(await owner.page.locator('.learn-kick').count() === 2, '참여자 관리에는 학생별 내보내기만 표시');
  await owner.page.getByRole('button', { name: '생각하는멍 내보내기', exact: true }).click();
  check(await owner.page.locator('.learn-moderation').evaluate(n => n.open && n.querySelector('.learn-kick-name').textContent === '생각하는멍'), '선택한 닉네임을 강퇴 확인창에 표시');
  await owner.page.click('.learn-moderation [data-cancel]');
  check(await a.page.evaluate(() => MC.app.state.scene === 'learn'), '취소하면 참여자가 교실에 유지');
  await owner.page.getByRole('button', { name: '생각하는멍 내보내기', exact: true }).click(); await owner.page.click('.learn-kick-confirm');
  check(await until(a.page, () => MC.app.state.view === 'home' && !document.querySelector('.learning-room') && !document.querySelector('.learn-moderation') && !MC.app.net.learnAccess && !MC.app.net.learningChat.length), '강퇴 대상은 마을로 돌아오고 교실·도구·권한·임시 기록 정리');
  check(await until(b.page, id => !MC.app.state.sceneObj.lesson.roster.some(m => m.id === id) && MC.app.state.sceneObj.lesson.answered === 0, aid), '다른 사람의 화면에서도 강퇴 대상과 제출 답 정리');
  check(await a.page.locator('#campToast').textContent().then(text => text.includes('내보냈어요')), '강퇴된 사람에게 이유 안내');
  await a.page.evaluate(() => MC.app.net.link.learn('chat', '퇴장 후 대화'));
  check(await b.page.evaluate(() => !MC.app.net.learningChat.some(m => m.text === '퇴장 후 대화')), '강퇴 후 배움터 대화 차단');
  await a.page.click('#learnBtn'); check(await a.page.locator('.learn-gate').evaluate(n => n.open), '재입장하려면 비밀번호를 다시 입력');
  await shot(owner.page, 'learning-moderation-desktop');
  check(![...owner.errors, ...a.errors, ...b.errors].length, '강퇴 전 과정 브라우저 오류 없음', [...owner.errors, ...a.errors, ...b.errors]);
});
