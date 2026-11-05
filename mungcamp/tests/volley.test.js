'use strict';
const { main } = require('./lib');
main(async ({ check, until, sleep, person, presenceServer, enter, shot, cleanup }) => {
  const server = await presenceServer(); cleanup(server.close);
  const a = await person({ nick: '토스멍', look: { c: 97, h: 4, ht: 0, ac: 0, gl: 0 } }); cleanup(a.close);
  const b = await person({ nick: '리시브멍', phone: true }); cleanup(b.close);
  const c = await person({ nick: '응원멍' }); cleanup(c.close);
  await enter(a.page, server.url, 'playground'); await enter(b.page, server.url, 'playground');
  check(await until(a.page, () => !!MC.app.state.sceneObj.game), '놀이터 서버 연결');
  await a.page.click('[data-pg="join"]'); await until(a.page, () => !!MC.app.state.sceneObj.me);
  await a.page.click('[data-mode="volley"]');
  check(await until(b.page, () => MC.app.state.sceneObj.game?.mode === 'volley'), '친구에게 배구 선택 공유');
  check(await a.page.evaluate(async () => { await document.fonts.load('20px Jua', '멍이 배구'); return [...document.fonts].some(f => f.family === 'Jua' && f.status === 'loaded'); }), '제목용 한글 글꼴 실제 로딩');
  await b.page.click('[data-pg="join"]'); check(await until(a.page, () => MC.app.state.sceneObj.game.players.length === 2), 'PC와 휴대폰 두 명 참가');
  check(await b.page.evaluate(() => {
    const dock = document.querySelector('#dock').getBoundingClientRect(), modes = document.querySelector('.pg-modes').getBoundingClientRect();
    return dock.top >= modes.bottom || dock.left >= modes.right;
  }), '휴대폰 대기 화면에서 소리 버튼이 놀이 선택을 가리지 않음');
  await enter(c.page, server.url, 'playground'); await until(c.page, () => MC.app.state.sceneObj.game?.mode === 'volley');
  check(await c.page.locator('[data-pg="join"]').isDisabled(), '세 번째 친구는 두 명 정원 안내');
  await shot(a.page, 'volley-lobby');
  await a.page.click('[data-pg="start"]');
  check(await until(b.page, () => MC.app.state.sceneObj.game.phase === 'ready'), '같은 준비 카운트다운');
  check(await until(a.page, () => MC.app.state.sceneObj.game.phase === 'playing'), '배구 라운드 시작');
  check(await until(b.page, () => !document.querySelector('.volley-controls').hidden), '휴대폰 이동과 점프 버튼 표시');
  const x = await a.page.evaluate(() => MC.app.state.sceneObj.game.volley.dogs[0].x);
  await a.page.keyboard.down('ArrowRight'); await sleep(240); await a.page.keyboard.up('ArrowRight');
  check(await until(b.page, value => MC.app.state.sceneObj.game.volley.dogs[0].x > value + 30, x), '키보드 이동을 서버와 친구 화면에 반영');
  await a.page.keyboard.press('ArrowUp');
  check(await until(b.page, () => MC.app.state.sceneObj.game.volley.dogs[0].y < MC.VolleyRules.ground - 15), '점프를 친구 화면에 공유');
  const touch = await b.page.evaluate(() => {
    const mid = q => { const r = document.querySelector(q).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
    return { left: mid('[data-axis="-1"]'), jump: mid('[data-jump]'), x: MC.app.state.sceneObj.game.volley.dogs[1].x };
  });
  const touchSession = await b.ctx.newCDPSession(b.page);
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...touch.left, id: 1 }] });
  await sleep(80);
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...touch.left, id: 1 }, { ...touch.jump, id: 2 }] });
  check(await until(a.page, value => { const d = MC.app.state.sceneObj.game.volley.dogs[1]; return d.x < value - 25 && d.y < MC.VolleyRules.ground - 15; }, touch.x), '휴대폰에서 이동하며 동시에 점프');
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  check(await until(a.page, () => MC.app.state.sceneObj.game.volley.dogs[1].axis === 0), '손을 떼면 이동 해제');
  check(await until(a.page, () => MC.app.state.sceneObj.game.volley.score.some(n => n > 0), null, 20000), '공이 바닥에 닿으면 실제 득점');
  const score = await a.page.evaluate(() => MC.app.state.sceneObj.game.volley.score.join(':'));
  check(await until(b.page, value => MC.app.state.sceneObj.game.volley.score.join(':') === value, score), '두 화면 점수 일치');
  check(await until(c.page, value => MC.app.state.sceneObj.game.volley.score.join(':') === value, score), '관전자도 같은 점수 확인');
  check(await b.page.evaluate(() => {
    const panel = document.querySelector('.playground-panel').getBoundingClientRect();
    const buttons = [...document.querySelectorAll('.volley-controls button')].map(el => el.getBoundingClientRect());
    return panel.right <= innerWidth && buttons.every(r => r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight);
  }), '휴대폰 세로 화면 패널과 터치 버튼 배치');
  check(await b.page.evaluate(() => {
    const r = q => document.querySelector(q).getBoundingClientRect();
    const overlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    return getComputedStyle(document.querySelector('#sessionTogether')).display === 'none' &&
      !overlap(r('#dock'), r('.volley-controls')) && !overlap(r('#dock'), r('.pg-scoreboard'));
  }), '휴대폰 점수판과 소리 버튼이 조작부를 가리지 않음');
  await shot(b.page, 'volley-phone'); await shot(a.page, 'volley-playing');
  await b.page.setViewportSize({ width: 844, height: 390 }); await sleep(150); await shot(b.page, 'volley-landscape');
  check(await b.page.evaluate(() => { const r = document.querySelector('.volley-controls').getBoundingClientRect(); const l = MC.app.state.sceneObj.volley.layout(); return r.bottom < innerHeight && l.y + MC.VolleyRules.ground * l.z < r.top; }), '휴대폰 가로 화면에서 코트와 조작부 분리');
  await b.page.click('[data-pg="leave"]');
  check(await until(a.page, () => MC.app.state.sceneObj.game.phase === 'ended'), '친구 퇴장 시 배구 종료');
  await a.page.click('[data-mode="hide"]');
  check(await until(a.page, () => !document.querySelector('#session').classList.contains('is-volley') && document.querySelector('.pg-scoreboard').hidden && document.querySelector('.volley-controls').hidden), '숨바꼭질로 바꾸면 배구 조작부 정리');
  await a.page.click('#exitBtn'); check(await until(a.page, () => MC.app.state.view === 'home' && !document.querySelector('.volley-controls')), '퇴장 시 배구 UI 제거');
  check(!a.errors.length && !b.errors.length && !c.errors.length, '배구 중 브라우저 오류 없음', [...a.errors, ...b.errors, ...c.errors]);
});
