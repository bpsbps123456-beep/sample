'use strict';
const { main } = require('./lib');

// 실제 화면에서 내 몸을 눌러 선택하고, 서버를 거쳐 다른 브라우저에 같은 표현이 오는지 확인한다.
async function tapMine(page) {
  const q = await page.evaluate(() => {
    const a = MC.app, home = a.state.view === 'home', sc = home ? a.camp : a.state.sceneObj;
    const p = sc.pup, visitors = home ? sc.visitors : sc.crowd.visitors;
    const canvas = document.querySelector(home ? '#campCanvas' : '#stage'), r = canvas.getBoundingClientRect();
    // 몸 중앙부터 고른다. 머리 맨 가장자리는 클릭이 도착할 때의 미세한 이동에 빗나갈 수 있다.
    for (const dy of [-45,-60,-30,-75,-15,-90,0,-100]) for (const dx of [0,-8,8,-16,16,-24,24,-32,32,-40,40]) {
      const x = p.x + dx * p.k, y = p.y + dy * p.k;
      if (!p.hit(x, y) || [...visitors.values()].some(v => v.pup.y > p.y && v.pup.hit(x, y))) continue;
      const s = home ? sc.toScreen(x, y) : { x, y };
      if (document.elementFromPoint(s.x + r.left, s.y + r.top) === canvas) return { x:s.x + r.left, y:s.y + r.top };
    }
    return null;
  });
  if (!q) throw Error('No visible self hit point');
  await page.mouse.click(q.x, q.y);
}

main(async ({ check, presenceServer, person, enter, until, sleep, cleanup }) => {
  const srv = await presenceServer(); cleanup(() => srv.close());
  const one = await person({nick:'감정멍이'}), two = await person({nick:'친구멍이'});
  cleanup(() => one.close()); cleanup(() => two.close());
  const A = one.page, B = two.page;
  await A.goto(srv.url); await B.goto(srv.url);
  await until(A, () => MC.app?.camp.visitors.size === 1);
  await sleep(800);
  await tapMine(A);
  check(await A.isVisible('#emotePicker') && await A.locator('.emote-option').count() === 6, '내 강아지를 누르면 감정 여섯 가지를 고른다');
  await until(A, () => document.querySelector('.emote-option').getAnimations().every(a => a.playState === 'finished'));
  const ring = await A.evaluate(() => {
    const r=document.querySelector('#emotePicker').getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
    const points=[...document.querySelectorAll('.emote-option')].map(el=>{const b=el.getBoundingClientRect();return{x:b.left+b.width/2,y:b.top+b.height/2};});
    const radii=points.map(p=>Math.hypot(p.x-x,p.y-y));
    return Math.min(...radii)>60 && Math.max(...radii)-Math.min(...radii)<2 && points.filter(p=>p.x<x-20).length===2 && points.filter(p=>p.x>x+20).length===2;
  });
  check(ring, '네모 창 없이 캐릭터 둘레의 원 위에 이모티콘 여섯 개가 펼쳐진다');
  const before = await A.evaluate(() => MC.app.camp.pup.emoteBursts);
  await A.keyboard.press('Escape');
  check(!await A.isVisible('#emotePicker') && await A.evaluate(n => MC.app.camp.pup.emoteBursts === n, before), 'Esc로 취소하면 감정을 보내지 않는다');
  for (let kind = 1; kind <= 6; kind++) {
    await tapMine(A);
    await A.click(`[data-emote="${kind}"]`);
    const received = await until(B, k => [...MC.app.camp.visitors.values()].some(v => !v.st.npc && v.pup.emotion?.kind === k), kind, 6000);
    check(received && !await A.isVisible('#emotePicker'), `감정 ${kind}: 선택을 닫고 서버를 거쳐 친구에게 같은 이모티콘이 보인다`);
  }
  check(await until(A, () => !MC.app.camp.pup.emotion, null, 6000), '감정 말풍선은 시간이 지나면 사라진다');
  await tapMine(A); await A.click('[data-emote="6"]');
  check(await until(B, () => [...MC.app.camp.visitors.values()].some(v => v.pup.emotion?.kind === 6)), '같은 감정을 다시 골라도 새로 표현한다');
  await enter(A, srv.url, 'tent'); await enter(B, srv.url, 'tent');
  await until(A, () => MC.app.state.sceneObj.crowd.visitors.size === 1);
  await A.bringToFront();
  await until(A, () => !MC.app.state.sceneObj.crowd.portal && Number(getComputedStyle(document.querySelector('#curtain')).opacity) === 0);
  // 같은 문으로 들어온 친구와 떨어진 자리로 실제로 걸은 뒤 내 몸을 누른다.
  await A.keyboard.down('ArrowLeft'); await sleep(600); await A.keyboard.up('ArrowLeft');
  check(!await A.isVisible('#emotePicker'), '장소를 바꾸면 이전 선택창을 닫는다');
  await tapMine(A); await A.click('[data-emote="3"]');
  check(await until(B, () => [...MC.app.state.sceneObj.crowd.visitors.values()].some(v => v.pup.emotion?.kind === 3)), '장소 안에서도 내 강아지의 감정을 서로 나눈다');
  check(await A.evaluate(() => [0,7,-1,2.5,'2',null].every(ek => MC.netClean({p:'map',x:1,y:2,ek}).ek === 0)), '클라이언트는 모르는 감정 번호를 비운다');
  // 클라이언트 정리를 거치지 않은 메시지를 보내고 서버의 원본 응답을 읽는다.
  const raw = await A.evaluate(() => new Promise((resolve, reject) => {
    const ws = new WebSocket(location.origin.replace(/^http/, 'ws') + '/');
    let id;
    const finish = (error, value) => {
      clearTimeout(timer); ws.close();
      if (error) reject(error); else resolve(value);
    };
    const timer = setTimeout(() => finish(Error('Raw presence response timed out')), 5000);
    ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.t === 'you') {
        id = m.id;
        ws.send(JSON.stringify({t:'s',s:{p:'tent',x:0,y:0,ek:99,ep:100}}));
      }
      if (m.t === 'd' && m.j?.[id]) finish(null, m.j[id]);
    };
    ws.onerror = () => finish(Error('Raw presence connection failed'));
  }));
  check(raw.ep === 100 && raw.ek === 0, '서버도 모르는 감정 번호를 비운다');
  await A.close(); await B.close();
  const phone = await person({phone:true}); cleanup(() => phone.close());
  await phone.page.goto(srv.url); await until(phone.page, () => !!MC.app?.camp.ground); await sleep(800);
  await tapMine(phone.page);
  const fit = await phone.page.evaluate(() => {
    const r = document.querySelector('#emotePicker').getBoundingClientRect();
    return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
  });
  check(fit && await phone.page.locator('.emote-option:visible').count() === 6, '휴대폰에서도 선택창과 감정 여섯 가지가 화면 안에 들어온다');
  await phone.page.tap('#campCanvas', {position:{x:20,y:150}});
  check(!await phone.page.isVisible('#emotePicker'), '휴대폰에서 원 밖을 누르면 감정 선택을 닫는다');
  await enter(phone.page, srv.url, 'tent');
  await until(phone.page, () => !MC.app.state.sceneObj.crowd.portal && Number(getComputedStyle(document.querySelector('#curtain')).opacity) === 0);
  await tapMine(phone.page); await phone.page.click('[data-emote="5"]');
  check(await phone.page.evaluate(() => MC.app.state.sceneObj.pup.emotion?.kind === 5), '휴대폰의 텐트 안에서도 감정 선택창을 누를 수 있다');
  check(!one.errors.length && !two.errors.length && !phone.errors.length, '감정 표현 중 오류 없음', one.errors.concat(two.errors, phone.errors));
});
