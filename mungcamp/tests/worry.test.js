// 걱정 태우기 (휴대폰): 예시 말을 골라 쓰고(자판이 바로 뜨지 않게), 장작에 적어 불에 넣는다
'use strict';
const { main } = require('./lib');

main(async ({ check, staticServer, person, until, sleep, cleanup }) => {
  const site = await staticServer();
  cleanup(() => site.close());
  const who = await person({ phone: true });
  cleanup(() => who.close());
  const P = who.page;
  await P.goto(site.url + '#fire');
  await until(P, () => !!(MC.app.state.sceneObj && MC.app.state.sceneObj.w));
  await sleep(1500);
  await P.evaluate(() => MC.app.doAction('worry'));
  await sleep(300);
  const chips = await P.evaluate(() => [...document.querySelectorAll('#worryChips .chip-pick')].map((b) => b.textContent));
  check(chips.length === 6, '예시 말 여섯', chips);
  check(!(await P.evaluate(() => document.activeElement === document.querySelector('#worryInput'))), '휴대폰에서는 자판이 바로 뜨지 않는다');
  await P.tap('#worryChips .chip-pick:nth-child(2)');
  await sleep(200);
  check((await P.inputValue('#worryInput')) === chips[1], '고른 말이 칸에 들어간다', await P.inputValue('#worryInput'));
  check(/장작에 적기/.test(await P.evaluate(() => document.activeElement.textContent)), "고르면 바로 '장작에 적기'로");
  await P.tap('#worryForm button[type=submit]');
  check(await until(P, () => !!MC.app.state.sceneObj.worry, null, 4000), '장작에 적힌다');
  await sleep(600);
  await P.tap('#worryThrow');
  check(await until(P, () => /불티/.test(document.querySelector('#toast').textContent), null, 12000), '불에 넣으면 불티가 되어 날아간다');
  check(who.errors.length === 0, '오류 없음', who.errors.slice(0, 3));
});
