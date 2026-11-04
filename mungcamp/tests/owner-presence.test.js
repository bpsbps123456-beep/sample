'use strict';
const {main} = require('./lib');

main(async ({check, presenceServer, person, enter, until, shot, cleanup}) => {
  const key = 'owner-presence-test';
  const srv = await presenceServer({OWNER_KEY: key}); cleanup(() => srv.close());
  const one = await person({residents: true}), two = await person({residents: true});
  cleanup(() => one.close()); cleanup(() => two.close());
  const A = one.page, B = two.page;
  await A.goto(srv.url); await until(A, () => !!MC.app?.residents);
  await enter(B, srv.url, 'fire');
  await until(A, () => MC.app.net.total() === 2);
  check((await fetch(srv.url + 'api/suggestions/presence')).status === 401, '실제 접속 통계는 비밀번호 인증 전에는 읽을 수 없다');
  await A.click('#suggestBtn'); await A.click('#ownerBtn');
  check(!await A.isVisible('.owner-presence'), '비밀번호를 입력하기 전에는 실제 인원 패널을 숨긴다');
  await A.fill('#ownerPassword', key); await A.click('#ownerSubmit');
  check(await until(A, () => document.querySelector('#ownerOnline').textContent === '2'), '비밀번호로 열면 더미를 뺀 실제 접속 두 명이 보인다');
  check(await A.evaluate(() => {
    const text = document.querySelector('#ownerPlaces').textContent;
    return text.includes('마을 1') && text.includes('모닥불 1') && MC.app.residents.total() >= 25;
  }), '장소별 실제 인원과 25명 이상인 더미 인원을 구분한다');
  const cookie = (await one.ctx.cookies(srv.url + 'api/suggestions')).find(c => c.name === 'mungcamp_owner');
  const response = await fetch(srv.url + 'api/suggestions/presence', {headers: {cookie: `${cookie.name}=${cookie.value}`}});
  const stats = await response.json();
  check(response.headers.get('cache-control') === 'no-store' && stats.total === 2 && stats.places.fire === 1 && stats.at > Date.now() - 5000, '인증한 통계는 현재 서버 연결을 세고 캐시에 남기지 않는다', stats);
  await shot(A, 'owner-presence-desktop');
  const phone = await person({phone: true, residents: true}); cleanup(() => phone.close());
  await phone.page.goto(srv.url); await until(phone.page, () => !!MC.app?.residents);
  check(await until(A, () => document.querySelector('#ownerOnline').textContent === '3', null, 8000), '새 이용자가 오면 5초 이내 자동 갱신한다');
  await B.close();
  check(await until(A, () => document.querySelector('#ownerOnline').textContent === '2' && document.querySelector('#ownerPlaces').textContent.includes('모닥불 0'), null, 8000), '이용자가 나가면 실제 전체·장소 인원도 줄어든다');
  const P = phone.page;
  await P.click('#suggestBtn'); await P.click('#ownerBtn'); await P.fill('#ownerPassword', key); await P.click('#ownerSubmit');
  await until(P, () => document.querySelector('#ownerOnline').textContent === '2');
  const layout = await P.evaluate(() => {
    const r = document.querySelector('.owner-presence').getBoundingClientRect();
    return {left: r.left, right: r.right, width: innerWidth, scroll: document.documentElement.scrollWidth};
  });
  check(layout.left >= 0 && layout.right <= layout.width && layout.width === layout.scroll, '휴대폰에서도 실제 접속 패널이 잘리지 않는다', layout);
  await shot(P, 'owner-presence-mobile');
  await A.click('#ownerLock');
  check(await until(A, async () => (await fetch('api/suggestions/presence')).status === 401) && !await A.isVisible('.owner-presence'), '닫으면 통계를 숨기고 조회 인증도 해제한다');
  check(!one.errors.length && !two.errors.length && !phone.errors.length, '운영자 접속 통계 중 오류 없음', one.errors.concat(two.errors, phone.errors));
});
