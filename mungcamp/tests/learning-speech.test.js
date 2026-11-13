'use strict';
const { main } = require('./lib');
main(async ({ check, until, person, presenceServer, cleanup, sleep, shot }) => {
  const server = await presenceServer(); cleanup(server.close);
  const owner = await person({ nick: '진행멍', viewport: { width: 1280, height: 900 } });
  const a = await person({ nick: '말하는멍', viewport: { width: 1280, height: 900 } }), b = await person({ nick: '듣는멍', phone: true });
  for (const p of [owner, a, b]) cleanup(p.close);
  const enter = async (p, pin) => {
    await p.goto(server.url); await until(p, () => MC.app.net.online);
    await p.click('#learnBtn'); await p.fill('#learnPin', pin); await p.press('#learnPin', 'Enter');
    await until(p, () => MC.app.state.sceneObj?.lesson?.roster.length);
  };
  const sees = (p, id, text) => until(p, ({ id, text }) => { const n = document.querySelector(`[data-id="${id}"] .learn-speech-bubble`); return n && !n.hidden && n.textContent === text; }, { id, text });
  const inside = () => {
    const f = document.querySelector('.learn-floor'), floor = f.getBoundingClientRect();
    const bubbles = [...f.querySelectorAll('.learn-speech-bubble:not([hidden])')];
    return bubbles.length && bubbles.every(n => { const r = n.getBoundingClientRect(); return r.left >= floor.left && r.right <= floor.right && r.top >= floor.top && r.bottom <= floor.bottom; }) &&
      f.scrollWidth <= f.clientWidth + 1 && f.scrollHeight <= f.clientHeight + 1 && document.documentElement.scrollWidth === innerWidth;
  };
  await enter(owner.page, '8624'); await enter(a.page, '0000');
  const aid = await a.page.evaluate(() => MC.app.net.id);
  await a.page.click('.learn-chat-toggle'); await a.page.fill('#learnChatInput', '<b>안녕!</b> 함께 이야기해요'); await a.page.press('#learnChatInput', 'Enter');
  check(await sees(owner.page, aid, '<b>안녕!</b> 함께 이야기해요'), '대화창이 닫힌 운영자 화면에도 학생 말풍선 표시');
  check(await sees(a.page, aid, '<b>안녕!</b> 함께 이야기해요'), '내가 보낸 말도 내 멍이 위에 표시');
  check(await owner.page.evaluate(() => !document.querySelector('.learn-speech-bubble b') && document.querySelector('.learn-speech-bubble').getAttribute('translate') === 'no'), '대화를 HTML이나 번역된 문구로 바꾸지 않고 그대로 표시');
  await enter(b.page, '0000');
  check(await until(b.page, () => MC.app.state.sceneObj.chatItems.size === 1 && !document.querySelector('.learn-speech-bubble:not([hidden])')), '새 입장에서는 이전 대화 기록을 말풍선으로 재생하지 않음');
  await a.page.fill('#learnChatInput', '걷다가 반가워서 인사해요'); await a.page.press('#learnChatInput', 'Enter');
  check(await sees(b.page, aid, '걷다가 반가워서 인사해요'), '새 학생 대화를 휴대폰에도 말풍선으로 실시간 전달');
  check(await owner.page.evaluate(id => document.querySelector(`[data-id="${id}"]`).querySelectorAll('.learn-speech-bubble:not([hidden])').length === 1, aid), '같은 학생은 최신 말풍선 하나만 표시');
  await owner.page.evaluate(() => MC.app.net.link.learn('delete-chat', 1));
  await until(owner.page, () => MC.app.state.sceneObj.chatItems.size === 1);
  check(await sees(owner.page, aid, '걷다가 반가워서 인사해요'), '이전 글을 삭제해도 최신 말풍선 유지');
  await a.page.click('.learn-chat-head button');
  const before = await owner.page.locator(`[data-id="${aid}"] .learn-speech-bubble`).boundingBox();
  await a.page.keyboard.down('ArrowRight'); await sleep(350); await a.page.keyboard.up('ArrowRight');
  check(await until(owner.page, id => { const c = MC.app.state.sceneObj.cards.get(id); return c?.walkPosition && c.walkPosition.x > c.home.x + .02; }, aid), '말하는 학생의 자유 이동을 다른 화면에 반영');
  const after = await owner.page.locator(`[data-id="${aid}"] .learn-speech-bubble`).boundingBox();
  check(after.x > before.x + 10 && await owner.page.evaluate(inside), '말풍선이 학생의 이동을 따라가며 바닥 안에 표시');
  await shot(owner.page, 'learning-speech-desktop'); await shot(b.page, 'learning-speech-phone');
  await owner.page.evaluate(() => MC.app.net.link.learn('delete-chat', 2));
  check(await until(b.page, () => !document.querySelector('.learn-speech-bubble:not([hidden])')), '운영자가 해당 대화를 지우면 말풍선도 즉시 제거');
  await sleep(1050); // 실제 서버의 1초 전송 간격을 지킨다.
  await a.page.evaluate(() => MC.app.net.link.learn('chat', '화면 가장자리에서도 잘 보여요 '.repeat(12)));
  await until(a.page, () => !!document.querySelector('.learn-speech-bubble:not([hidden])'));
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await a.page.setViewportSize(viewport);
    for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      await a.page.evaluate(([x, y]) => { const s = MC.app.state.sceneObj; s.walk.free = true; s.walk.x = x; s.walk.y = y; s.updateWalking(0); }, [x, y]);
      check(await until(a.page, inside), `${viewport.width}×${viewport.height} 가장자리 ${x},${y}에서도 긴 말풍선 잘림·스크롤 없음`);
    }
  }
  check(await a.page.locator('.learn-speech-bubble:not([hidden])').evaluate(n => n.querySelector('span').getBoundingClientRect().height <= parseFloat(getComputedStyle(n).lineHeight) * 3 + 1 && n.textContent.length === 180), '큰 글씨의 긴 대화도 세 줄 안으로 줄이고 전체 내용은 기록에 유지');
  check(await until(owner.page, () => !document.querySelector('.learn-speech-bubble:not([hidden])'), null, 8000), '6초가 지나면 말풍선 자동 숨김');
  await a.page.evaluate(() => MC.app.net.link.learn('chat', '대화 정리 확인'));
  await until(b.page, () => !!document.querySelector('.learn-speech-bubble:not([hidden])'));
  await owner.page.evaluate(() => MC.app.net.link.learn('clear-chat'));
  check(await until(a.page, () => !document.querySelector('.learn-speech-bubble:not([hidden])') && MC.app.state.sceneObj.chatItems.size === 0), '전체 대화 삭제 시 말풍선과 기록도 함께 정리');
  await sleep(1050);
  await a.page.evaluate(() => MC.app.net.link.learn('chat', '잠깐 다녀올게요'));
  check(await sees(owner.page, aid, '잠깐 다녀올게요'), '퇴장 전 학생의 말풍선 표시 확인');
  await a.page.click('#exitBtn');
  check(await until(owner.page, id => !MC.app.state.sceneObj.cards.has(id) && !document.querySelector(`[data-id="${id}"]`), aid), '학생이 나가면 말풍선과 표시 타이머 정리');
  check(![...owner.errors, ...a.errors, ...b.errors].length, '말풍선 표시·이동·삭제 중 브라우저 오류 없음', [...owner.errors, ...a.errors, ...b.errors]);
});
