// 메인 마을의 네 글자 팻말: 작성·취소·지우기, 다른 브라우저와 공유, 장소 안에서는 숨김.
'use strict';
const { main } = require('./lib');

main(async ({ check, presenceServer, person, until, sleep, cleanup, shot }) => {
  const srv = await presenceServer(); cleanup(() => srv.close());
  const one = await person({ nick: '포근함' }), two = await person({ nick: '몽글' });
  cleanup(() => one.close()); cleanup(() => two.close());
  const A = one.page, B = two.page;
  await A.goto(srv.url); await B.goto(srv.url);
  await until(A, () => MC.app?.camp?.visitors.size === 1, null, 10000);
  await A.bringToFront();
  check(await A.evaluate(() => document.querySelector('#dressBtn').nextElementSibling.id === 'signBtn'), '꾸미기 바로 오른쪽에 팻말');
  await A.click('#signBtn');
  await A.fill('#signInput', '업무중이에요');
  check((await A.inputValue('#signInput')) === '업무중이', '입력은 네 글자까지');
  await A.keyboard.press('Escape');
  check(await A.evaluate(() => !MC.app.camp.sign), '닫으면 팻말이 생기지 않는다');
  await A.click('#signBtn');
  await A.fill('#signInput', '시발'); await A.click('#signForm button[type=submit]');
  await sleep(150);
  check(await A.isVisible('#signCard'), '험한 말은 팻말로 세우지 않는다');
  await A.fill('#signInput', '업무중'); await A.click('#signForm button[type=submit]');
  check(await until(A, () => MC.app.camp.sign === '업무중' && document.querySelector('#signCard').hidden), '멍이 곁에 팻말을 세운다');
  check(await until(B, () => [...MC.app.camp.visitors.values()].some((v) => v.st.sg === '업무중'), null, 8000), '다른 사람 화면에도 팻말이 보인다 (서버 경유)');
  await shot(A, 'sign-desktop');
  await A.reload();
  await until(A, () => !!MC.app?.camp?.ground);
  check(await A.evaluate(() => MC.app.camp.sign === '업무중'), '새로 열어도 내 팻말을 기억한다');
  await A.evaluate(() => { MC.app.camp.placeAt('lodge'); MC.app.enterScene('lodge'); });
  await until(A, () => MC.app.state.scene === 'lodge' && MC.app.net.mine.p === 'lodge');
  check(!(await A.isVisible('#signBtn')) && await A.evaluate(() => !MC.app.net.mine.sg), '숙소 등 장소 안에는 팻말 버튼과 팻말 정보가 없다');
  check(await A.evaluate(() => MC.netClean({p:'fire', x:0, y:0, sg:'바쁨'}).sg === '' && MC.netClean({p:'map', x:0, y:0, sg:'123456'}).sg === '1234'), '받는 쪽도 마을·네 글자 제한을 적용한다');
  await A.click('#exitBtn'); await until(A, () => MC.app.state.view === 'home');
  await A.click('#signBtn'); await A.click('#signRemove');
  check(await until(B, () => [...MC.app.camp.visitors.values()].some((v) => !v.leaving && v.st.n === '포근함' && v.st.sg === ''), null, 8000), '지우면 다른 사람 화면에서도 사라진다');
  const phone = await person({ phone: true }); cleanup(() => phone.close());
  await phone.page.goto(srv.url); await until(phone.page, () => !!MC.app?.camp?.ground);
  const layout = await phone.page.evaluate(() => {
    const ids = ['suggestBtn', 'dressBtn', 'signBtn', 'chairBtn'];
    const rects = ids.map((id) => document.getElementById(id).getBoundingClientRect());
    return rects.every((r) => r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight) && rects.every((r,i) => rects.every((s,j) => i===j || r.right<=s.left || s.right<=r.left || r.bottom<=s.top || s.bottom<=r.top));
  });
  check(layout, '휴대폰에서도 건의하기·꾸미기·팻말·의자 버튼이 겹치지 않는다');
  await shot(phone.page, 'sign-mobile-tools');
  check(!one.errors.length && !two.errors.length && !phone.errors.length, '오류 없음', one.errors.concat(two.errors, phone.errors).slice(0,3));
});
