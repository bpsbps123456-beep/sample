'use strict';
const { main } = require('./lib');
main(async ({ check, until, person, presenceServer, cleanup, shot, sleep }) => {
  const server = await presenceServer(); cleanup(server.close);
  const viewer = await person({ nick: '자리확인멍', viewport: { width: 1280, height: 900 } }); cleanup(viewer.close);
  await viewer.page.goto(server.url); await until(viewer.page, () => MC.app.net.online);
  await viewer.page.click('#learnBtn'); await viewer.page.fill('#learnPin', '0000'); await viewer.page.press('#learnPin', 'Enter');
  await until(viewer.page, () => MC.app.state.sceneObj?.lesson?.roster.length);
  check(await viewer.page.evaluate(() => !document.querySelector('.learn-question-options').textContent && !document.querySelector('.learn-response-note').textContent && document.querySelector('.learn-response').hidden && document.querySelector('.learn-sign').hidden), '기다림·이동 안내와 답변 전 팻말을 비우고 바닥 확보');
  const friends = [];
  for (let i = 0; i < 19; i++) {
    const ws = new WebSocket(server.url.replace(/^http/, 'ws')), state = { p: 'learn', n: '친구' + i, x: 500, y: 500, w: 0 };
    friends.push({ ws, state }); cleanup(() => ws.close());
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('seat guest connection timeout')), 5000);
      ws.onopen = () => ws.send(JSON.stringify({ t: 'learn', action: 'enter', value: i ? '0000' : '8624' }));
      ws.onmessage = event => {
        const m = JSON.parse(event.data);
        if (m.t === 'learn-access') ws.send(JSON.stringify({ t: 's', s: state }));
        if (m.t === 'learn-state' && m.roster.some(member => member.name === '친구' + i)) { clearTimeout(timer); resolve(); }
      };
    });
  }
  check(await until(viewer.page, () => MC.app.state.sceneObj.lesson.roster.length === 20 && document.querySelectorAll('.learn-seat').length === 20), '실제 웹소켓 연결 20명 입장');
  const layout = () => {
    const f = document.querySelector('.learn-floor'), floor = f.getBoundingClientRect();
    const seats = [...f.querySelectorAll('.learn-seat')].map(n => n.getBoundingClientRect());
    const inside = r => r.left >= floor.left - 1 && r.right <= floor.right + 1 && r.top >= floor.top - 1 && r.bottom <= floor.bottom + 1;
    return seats.length === 20 && seats.every(inside) && seats.every((a, i) => seats.slice(i + 1).every(b => Math.min(a.right, b.right) - Math.max(a.left, b.left) < 1 || Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) < 1)) &&
      [...f.querySelectorAll('canvas,.learn-seat-name,.learn-sign:not([hidden])')].every(n => inside(n.getBoundingClientRect())) &&
      f.scrollHeight <= f.clientHeight + 1 && f.scrollWidth <= f.clientWidth + 1 && document.documentElement.scrollWidth === innerWidth;
  };
  const sizes = [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }];
  for (const viewport of sizes) {
    await viewer.page.setViewportSize(viewport);
    check(await until(viewer.page, layout), `${viewport.width}×${viewport.height} 대기 중 20명 모두 스크롤·겹침 없이 표시`);
    if ([1440, 390].includes(viewport.width)) await shot(viewer.page, 'learning-20-idle-' + viewport.width);
  }
  friends[0].ws.send(JSON.stringify({ t: 'learn', action: 'start', value: { type: 'choice', text: '어떤 활동을 함께할까요?', options: ['산책', '독서', '공놀이', '그림', '음악', '휴식'] } }));
  await until(viewer.page, () => !!MC.app.state.sceneObj.lesson.question);
  const question = await viewer.page.evaluate(() => MC.app.state.sceneObj.lesson.question.id);
  for (const { ws } of friends.slice(1)) ws.send(JSON.stringify({ t: 'learn', action: 'answer', value: { id: question, answer: 0 } }));
  await until(viewer.page, () => MC.app.state.sceneObj.lesson.answered === 18);
  for (const viewport of sizes) {
    await viewer.page.setViewportSize(viewport);
    check(await until(viewer.page, layout), `${viewport.width}×${viewport.height} 여섯 보기·제출 팻말이 있어도 20명 전체 표시`);
  }
  friends[0].ws.send(JSON.stringify({ t: 'learn', action: 'reveal' }));
  await until(viewer.page, () => MC.app.state.sceneObj.lesson.phase === 'revealed');
  await viewer.page.setViewportSize({ width: 390, height: 844 });
  check(await until(viewer.page, layout), '답 공개 후에도 팻말이 바닥 안에 표시');
  await viewer.page.locator('.learn-sign:not([hidden]):not([disabled])').first().click();
  check(await viewer.page.locator('.learn-detail').evaluate(n => n.open && n.querySelector('p').textContent === '산책'), '작은 팻말을 누르면 답 전체 보기');
  await viewer.page.click('.learn-detail button'); await shot(viewer.page, 'learning-20-revealed-phone');
  await viewer.page.setViewportSize({ width: 1440, height: 900 }); await sleep(300);
  const cdp = await viewer.ctx.newCDPSession(viewer.page); await cdp.send('Performance.enable');
  const before = (await cdp.send('Performance.getMetrics')).metrics;
  let tick = 0;
  const movement = setInterval(() => {
    tick++;
    for (let i = 0; i < friends.length; i++) {
      const { ws, state } = friends[i];
      Object.assign(state, { q: 1, w: 1, x: Math.round(500 + 350 * Math.sin(tick / 12 + i)), y: Math.round(430 + 300 * Math.cos(tick / 15 + i)), f: Math.cos(tick / 12 + i) < 0 ? -1 : 1 });
      ws.send(JSON.stringify({ t: 's', s: state }));
    }
  }, 125); cleanup(() => clearInterval(movement));
  await viewer.page.keyboard.down('ArrowRight'); await sleep(500); await viewer.page.keyboard.up('ArrowRight'); await sleep(4500);
  const after = (await cdp.send('Performance.getMetrics')).metrics;
  const delta = name => +(after.find(m => m.name === name).value - before.find(m => m.name === name).value).toFixed(3);
  check(await until(viewer.page, () => document.querySelectorAll('.learn-seat.is-roaming').length === 20), '20명 동시 이동을 서버에서 받아 화면에 반영');
  console.log('20명 이동 5초 측정:', JSON.stringify({ layouts: delta('LayoutCount'), scriptSeconds: delta('ScriptDuration'), taskSeconds: delta('TaskDuration') }));
  await shot(viewer.page, 'learning-20-moving-desktop'); clearInterval(movement);
  friends[0].ws.close(); friends[1].ws.close();
  check(await until(viewer.page, () => MC.app.state.sceneObj.lesson.roster.length === 18 && document.querySelectorAll('.learn-seat').length === 18), '퇴장하면 빈 자리 정리');
  check(!viewer.errors.length, '20명 배치·이동 중 브라우저 오류 없음', viewer.errors);
});
