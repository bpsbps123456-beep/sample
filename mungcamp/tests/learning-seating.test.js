'use strict';
const { main } = require('./lib');
main(async ({ check, until, person, presenceServer, cleanup }) => {
  const server = await presenceServer(); cleanup(server.close);
  const viewer = await person({ nick: '자리확인멍', viewport: { width: 1280, height: 900 } }); cleanup(viewer.close);
  await viewer.page.goto(server.url); await until(viewer.page, () => MC.app.net.online);
  await viewer.page.click('#learnBtn'); await viewer.page.fill('#learnPin', '0000'); await viewer.page.press('#learnPin', 'Enter');
  await until(viewer.page, () => MC.app.state.sceneObj?.lesson?.roster.length);
  check(await viewer.page.locator('.learn-question-options').textContent() === '질문을 기다리며 편하게 앉아요', '함께 기다리는 수평적인 안내 문구');
  const friends = [];
  for (let i = 0; i < 13; i++) {
    const ws = new WebSocket(server.url.replace(/^http/, 'ws')); friends.push(ws); cleanup(() => ws.close());
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('seat guest connection timeout')), 5000);
      ws.onopen = () => ws.send(JSON.stringify({ t: 'learn', action: 'enter', value: '0000' }));
      ws.onmessage = event => {
        const m = JSON.parse(event.data);
        if (m.t === 'learn-access') ws.send(JSON.stringify({ t: 's', s: { p: 'learn', n: '친구' + i, x: 500, y: 500, w: 0 } }));
        if (m.t === 'learn-state' && m.roster.some(member => member.name === '친구' + i)) { clearTimeout(timer); resolve(); }
      };
    });
  }
  check(await until(viewer.page, () => MC.app.state.sceneObj.lesson.roster.length === 14 && document.querySelectorAll('.learn-seat').length === 14 && [...document.querySelectorAll('.learn-circle')].map(n => n.dataset.count).sort().join(',') === '4,5,5'), '혼자 남는 자리 없이 둥근 모임에 고르게 배치하고 모두 표시');
  const layout = () => {
    const seats = [...document.querySelectorAll('.learn-seat')].map(n => n.getBoundingClientRect()), floor = document.querySelector('.learn-floor').getBoundingClientRect();
    return seats.every(r => r.left >= floor.left - 1 && r.right <= floor.right + 1) && seats.every((a, i) => seats.slice(i + 1).every(b => Math.min(a.right, b.right) - Math.max(a.left, b.left) < 1 || Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) < 1)) && document.documentElement.scrollWidth === innerWidth;
  };
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await viewer.page.setViewportSize(viewport);
    check(await until(viewer.page, layout), `${viewport.width}px에서 둥근 자리끼리 겹치거나 화면 밖으로 나가지 않음`);
  }
  friends[0].close(); friends[1].close();
  check(await until(viewer.page, () => MC.app.state.sceneObj.lesson.roster.length === 12 && document.querySelectorAll('.learn-circle').length === 2 && document.querySelectorAll('.learn-seat').length === 12), '친구가 나가면 빈 모임을 정리하고 자리 다시 배치');
  check(!viewer.errors.length, '둥근 자리 배치 중 브라우저 오류 없음', viewer.errors);
});
