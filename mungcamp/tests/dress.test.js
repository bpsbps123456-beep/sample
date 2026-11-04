// 내 멍이 꾸미기: 몸·귀 빛깔과 모자를 고르면 미리보기가 바로 바뀌고, '다 됐어요'로 저장한다.
// 마음 단어(닉네임)도 여기서 바꾼다(험한 말은 막는다). 같은 곳의 다른 사람 화면에도 새 모습으로 보인다
'use strict';
const { main } = require('./lib');

main(async ({ check, staticServer, person, until, sleep, cleanup }) => {
  const site = await staticServer();
  cleanup(() => site.close());
  const who = await person({ nick: '나른함', look: { c: 0, h: 0 } });
  cleanup(() => who.close());
  const A = who.page;
  await A.goto(site.url);
  await until(A, () => MC.app.state.view === 'home' && MC.app.camp.w > 1);
  const B = await who.tab('B');
  await B.goto(site.url);
  await until(B, () => MC.app.camp.visitors.size === 1, null, 10000);
  await A.bringToFront();

  await A.click('#dressBtn');
  check(await A.isVisible('#dressCard'), '꾸미기 창이 열린다');
  const rows = await A.evaluate(() => ['#swBody', '#swEar', '#swHat'].map((id) => document.querySelector(id).children.length));
  check(rows[0] >= 8 && rows[1] >= 9 && rows[2] >= 6, '몸·귀·모자 빛깔을 고를 수 있다', rows);
  check((await A.inputValue('#dressName')) === '나른함', '지금 마음 단어가 들어 있다');
  await A.click('#swBody [data-v="7"]');
  await A.click('#swEar [data-v="9"]');
  await A.click('#swHat [data-v="4"]');
  await sleep(300);
  check(await A.evaluate(() => document.querySelector('#swBody [data-v="7"]').getAttribute('aria-checked') === 'true'), '고른 빛깔이 표시된다');
  // Esc 로 닫으면 바뀌지 않는다
  await A.keyboard.press('Escape');
  check(await A.evaluate(() => document.querySelector('#dressCard').hidden && MC.app.net.look.c === 0), 'Esc 로 닫으면 그대로');

  await A.click('#dressBtn');
  await A.click('#swBody [data-v="7"]');
  await A.click('#swEar [data-v="9"]');
  await A.click('#swHat [data-v="4"]');
  await A.fill('#dressName', '시발');
  await A.click('#dressForm button[type=submit]');
  await sleep(200);
  check(await A.isVisible('#dressCard') && /다른 단어/.test(await A.textContent('#dressFine')), '험한 마음 단어는 받지 않는다');
  await A.fill('#dressName', '보송보송');
  await A.click('#dressForm button[type=submit]');
  check(await until(A, () => document.querySelector('#dressCard').hidden, null, 3000), "'다 됐어요'로 저장하고 닫힌다");
  const me = await A.evaluate(() => ({ look: MC.app.net.look, coat: MC.app.camp.pup.coatId, hat: MC.app.camp.pup.hatId, name: MC.app.net.name, stored: JSON.parse(localStorage.getItem('mungcamp.look')), nick: JSON.parse(localStorage.getItem('mungcamp.nick')) }));
  check(me.look.c === 97 && me.look.h === 4 && me.coat === 97 && me.hat === 4, '내 멍이가 새 빛깔을 입는다 (벚꽃 몸, 하늘 귀, 보라 모자)', me);
  check(me.stored.c === 97 && me.nick === '보송보송' && me.name === '보송보송', '다음에 와도 그대로 (저장)', me);
  check(await until(B, () => { const v = [...MC.app.camp.visitors.values()][0]; return !!v && v.pup.coatId === 97 && v.pup.hatId === 4 && v.st.n === '보송보송'; }, null, 8000), '다른 사람 화면에도 새 모습과 새 마음 단어');
  check(who.errors.length === 0, '오류 없음', who.errors.slice(0, 3));
});
