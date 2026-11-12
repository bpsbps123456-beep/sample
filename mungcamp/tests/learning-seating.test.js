'use strict';
const { main } = require('./lib');
main(async ({ check, until, person, presenceServer, cleanup, shot, sleep }) => {
  const server = await presenceServer(); cleanup(server.close);
  const viewer = await person({ nick: '자리확인멍', viewport: { width: 1280, height: 900 } }); cleanup(viewer.close);
  await viewer.page.goto(server.url); await until(viewer.page, () => MC.app.net.online);
  await viewer.page.click('#learnBtn'); await viewer.page.fill('#learnPin', '0000'); await viewer.page.press('#learnPin', 'Enter');
  await until(viewer.page, () => MC.app.state.sceneObj?.lesson?.roster.length);
  check(await viewer.page.evaluate(() => !document.querySelector('.learn-question-options').textContent && !document.querySelector('.learn-response-note').textContent && document.querySelector('.learn-response').hidden && document.querySelector('.learn-sign').hidden), '기다림·이동 안내와 답변 전 팻말을 비우고 바닥 확보');
  const exchange = (ws, message, type) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => { ws.removeEventListener('message', receive); reject(Error('capacity reply timeout: ' + type)); }, 5000);
    const receive = event => { const value = JSON.parse(event.data); if (value.t === type) { clearTimeout(timer); ws.removeEventListener('message', receive); resolve(value); } };
    ws.addEventListener('message', receive); ws.send(JSON.stringify(message));
  });
  const extra = new WebSocket(server.url.replace(/^http/, 'ws')); cleanup(() => extra.close());
  await new Promise((resolve, reject) => { extra.onopen = resolve; extra.onerror = reject; });
  await exchange(extra, { t: 'learn', action: 'enter', value: '0000' }, 'learn-access');
  const friends = [];
  for (let i = 0; i < 29; i++) {
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
  check(await until(viewer.page, () => MC.app.state.sceneObj.lesson.roster.length === 30 && document.querySelectorAll('.learn-seat').length === 30), '실제 웹소켓 연결 30명 입장');
  const full = await exchange(extra, { t: 's', s: { p: 'learn', n: '추가입장', x: 500, y: 500 } }, 'learn-denied');
  check(full.message.includes('30명'), '미리 비밀번호를 확인해도 31번째 실제 입장 차단');
  const denied = await exchange(extra, { t: 'learn', action: 'enter', value: '0000' }, 'learn-error');
  check(denied.message.includes('30명'), '정원 30명일 때 추가 비밀번호 입장도 차단');
  const layout = () => {
    const f = document.querySelector('.learn-floor'), floor = f.getBoundingClientRect();
    const seats = [...f.querySelectorAll('.learn-seat')].map(n => n.getBoundingClientRect());
    const inside = r => r.left >= floor.left - 1 && r.right <= floor.right + 1 && r.top >= floor.top - 1 && r.bottom <= floor.bottom + 1;
    return seats.length === 30 && seats.every(inside) && seats.every((a, i) => seats.slice(i + 1).every(b => Math.min(a.right, b.right) - Math.max(a.left, b.left) < 1 || Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) < 1)) &&
      [...f.querySelectorAll('canvas,.learn-seat-name,.learn-status-sign:not([hidden]),.learn-sign:not([hidden])')].every(n => inside(n.getBoundingClientRect())) &&
      f.scrollHeight <= f.clientHeight + 1 && f.scrollWidth <= f.clientWidth + 1 && document.documentElement.scrollWidth === innerWidth;
  };
  const sizes = [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }];
  for (const viewport of sizes) {
    await viewer.page.setViewportSize(viewport);
    check(await until(viewer.page, layout), `${viewport.width}×${viewport.height} 대기 중 30명 모두 스크롤·겹침 없이 표시`);
    if ([1440, 390].includes(viewport.width)) await shot(viewer.page, 'learning-30-idle-' + viewport.width);
  }
  for (const { ws, state } of friends) { Object.assign(state, { sg: '쉬는중', ch: 1 }); ws.send(JSON.stringify({ t: 's', s: state })); }
  check(await until(viewer.page, () => [...MC.app.state.sceneObj.cards.values()].filter(card => !card.status.hidden && card.pup.chairOn).length === 29), '일반 학생들까지 상태 팻말과 의자 동시 설치');
  friends[0].ws.send(JSON.stringify({ t: 'learn', action: 'start', value: { type: 'choice', text: '어떤 활동을 함께할까요?', options: ['산책', '독서', '공놀이', '그림', '음악', '휴식'] } }));
  await until(viewer.page, () => !!MC.app.state.sceneObj.lesson.question);
  const question = await viewer.page.evaluate(() => MC.app.state.sceneObj.lesson.question.id);
  for (const { ws } of friends.slice(1)) ws.send(JSON.stringify({ t: 'learn', action: 'answer', value: { id: question, answer: 0 } }));
  await until(viewer.page, () => MC.app.state.sceneObj.lesson.answered === 28);
  for (const viewport of sizes) {
    await viewer.page.setViewportSize(viewport);
    const fits = await until(viewer.page, layout);
    check(fits, `${viewport.width}×${viewport.height} 의자·상태 팻말·제출 팻말이 있어도 30명 전체 표시`);
    if (!fits) {
      console.log(await viewer.page.evaluate(() => {
        const floor = document.querySelector('.learn-floor').getBoundingClientRect(), sc = MC.app.state.sceneObj;
        return { floor: floor.toJSON(), size: sc.floorSize, overflow: [...document.querySelectorAll('.learn-seat > *:not([hidden])')].filter(n => { const r = n.getBoundingClientRect(); return r.left < floor.left - 1 || r.right > floor.right + 1 || r.top < floor.top - 1 || r.bottom > floor.bottom + 1; }).map(n => ({ cls: n.className, rect: n.getBoundingClientRect().toJSON() })).slice(0, 5) };
      })); await shot(viewer.page, 'learning-personal-overflow-' + viewport.width);
    }
  }
  friends[0].ws.send(JSON.stringify({ t: 'learn', action: 'reveal' }));
  await until(viewer.page, () => MC.app.state.sceneObj.lesson.phase === 'revealed');
  await viewer.page.setViewportSize({ width: 390, height: 844 });
  check(await until(viewer.page, layout), '답 공개 후에도 팻말이 바닥 안에 표시');
  await viewer.page.locator('.learn-sign:not([hidden]):not([disabled])').first().click();
  check(await viewer.page.locator('.learn-detail').evaluate(n => n.open && n.querySelector('p').textContent === '산책'), '작은 팻말을 누르면 답 전체 보기');
  await viewer.page.click('.learn-detail button'); await shot(viewer.page, 'learning-30-revealed-phone');
  await viewer.page.setViewportSize({ width: 1440, height: 900 }); await sleep(300);
  for (const { ws } of friends) ws.send(JSON.stringify({ t: 'learn', action: 'chat', value: '함께 걸으며 이야기해요!' }));
  await viewer.page.evaluate(() => MC.app.net.link.learn('chat', '친구들아 반가워!'));
  check(await until(viewer.page, () => document.querySelectorAll('.learn-speech-bubble:not([hidden])').length === 30), '30명 동시 대화를 각 멍이의 말풍선으로 표시');
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
  check(await until(viewer.page, () => document.querySelectorAll('.learn-seat.is-roaming').length === 30), '30명 동시 이동을 서버에서 받아 화면에 반영');
  check(await viewer.page.evaluate(() => {
    const f = document.querySelector('.learn-floor'), floor = f.getBoundingClientRect(), bubbles = [...f.querySelectorAll('.learn-speech-bubble:not([hidden])')];
    return bubbles.length === 30 && bubbles.every(n => { const r = n.getBoundingClientRect(); return r.left >= floor.left && r.right <= floor.right && r.top >= floor.top && r.bottom <= floor.bottom; }) && f.scrollWidth <= f.clientWidth + 1 && f.scrollHeight <= f.clientHeight + 1;
  }), '30명이 말하며 움직여도 말풍선이 바닥 안에 표시되고 스크롤 없음');
  console.log('30명 이동 5초 측정:', JSON.stringify({ layouts: delta('LayoutCount'), scriptSeconds: delta('ScriptDuration'), taskSeconds: delta('TaskDuration') }));
  await shot(viewer.page, 'learning-30-moving-desktop'); clearInterval(movement);
  friends[0].ws.close(); friends[1].ws.close();
  check(await until(viewer.page, () => MC.app.state.sceneObj.lesson.roster.length === 28 && document.querySelectorAll('.learn-seat').length === 28), '퇴장하면 빈 자리 정리');
  const joined = await exchange(extra, { t: 's', s: { p: 'learn', n: '추가입장', x: 500, y: 500 } }, 'learn-state');
  check(joined.roster.length === 29 && joined.roster.some(member => member.name === '추가입장'), '자리가 나면 대기하던 사람이 같은 교실로 입장');
  check(!viewer.errors.length, '30명 배치·이동 중 브라우저 오류 없음', viewer.errors);
});
