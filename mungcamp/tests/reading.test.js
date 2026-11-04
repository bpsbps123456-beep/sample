// 앉아서만 펼치기, 쪽 넘기기·저장·키보드 격리, 장면 전환, 작은 화면의 실제 독서 흐름.
'use strict';
const { main } = require('./lib');

main(async ({ check, staticServer, person, until, sleep, cleanup, enter, shot }) => {
  const site = await staticServer(); cleanup(() => site.close());
  const who = await person(); cleanup(() => who.close());
  const page = who.page;
  await page.goto(site.url);
  await until(page, () => !!window.MC?.app);
  check(await page.locator('#readBtn').isHidden(), '서 있으면 책 읽기가 보이지 않는다');
  await page.evaluate(() => document.querySelector('#readBtn').click());
  check(await page.evaluate(() => !document.querySelector('#bookReader').open), '서 있을 때 숨은 버튼을 눌러도 책을 열 수 없다');

  await page.click('#chairBtn');
  await page.waitForSelector('#readBtn:visible');
  await page.click('#readBtn');
  check(await page.locator('#bookShelf .book-pick').count() === 5, '의자에 앉으면 다섯 창작 단편을 고를 수 있다');
  await shot(page, 'reading-shelf-desktop');
  await page.click('[data-story="last-bakery"]');
  check(await page.locator('#bookContent').innerText().then(t => t.includes('수연') && t.length > 200) && await page.locator('#bookPrev').isDisabled(), '첫 쪽 본문을 읽고 이전 쪽은 비활성화된다');
  await page.click('#bookNext');
  await page.keyboard.press('ArrowRight');
  check(await page.locator('#bookPosition').innerText() === '3 / 5쪽', '버튼과 오른쪽 방향키로 책장을 넘긴다');
  const before = await page.evaluate(() => ({ x: MC.app.camp.pup.x, y: MC.app.camp.pup.y }));
  await page.keyboard.press('KeyC');
  await page.keyboard.press('KeyW');
  await page.keyboard.press('Space');
  await sleep(250);
  check(await page.evaluate(p => MC.app.camp.pup.chairOn && MC.app.camp.pup.x === p.x && MC.app.camp.pup.y === p.y, before), '독서 중 이동·의자·활동 단축키가 뒤의 멍이를 조작하지 않는다');
  await page.click('#bookNext');
  await page.click('#bookNext');
  check(await page.locator('#bookNext').isDisabled() && await page.locator('.book-end').innerText() === '이야기 끝', '마지막 쪽에서 이야기가 끝나고 다음 쪽은 비활성화된다');
  await page.click('#bookPrev');
  await page.click('#bookPrev');
  await page.keyboard.press('Escape');
  check(await page.evaluate(() => !document.querySelector('#bookReader').open && MC.app.camp.pup.chairOn && document.activeElement.id === 'readBtn'), 'Esc는 책만 덮고 의자와 버튼으로의 초점을 유지한다');
  await page.reload();
  await until(page, () => !!window.MC?.app);
  await page.click('#chairBtn');
  await page.waitForSelector('#readBtn:visible');
  await page.click('#readBtn');
  check((await page.locator('[data-story="last-bakery"]').innerText()).includes('3 / 5쪽'), '새로 방문해도 읽던 쪽을 책장에 표시한다');
  await page.click('[data-story="last-bakery"]');
  check(await page.locator('#bookPosition').innerText() === '3 / 5쪽', '소설을 다시 고르면 저장한 쪽에서 이어진다');
  await page.click('#bookBack');
  for (const id of ['borrow-rain', 'moon-post', 'chair-voyage', 'empty-pot']) {
    await page.click(`[data-story="${id}"]`);
    await page.click('#bookNext');
    check((await page.locator('#bookContent').innerText()).length > 200, `${id}: 다른 소설도 독립된 본문으로 읽는다`);
    await page.click('#bookBack');
  }
  await page.evaluate(() => MC.app.camp.pup.setChair(false));
  check(await until(page, () => !document.querySelector('#bookReader').open && document.querySelector('#readBtn').hidden), '일어나면 책이 닫히고 책 읽기도 사라진다');

  await enter(page, site.url, 'fire');
  await page.click('#dockScene [data-act="chair"]');
  await page.waitForSelector('#readBtn:visible');
  await page.click('#readBtn');
  await page.click('[data-story="moon-post"]');
  await page.keyboard.press('ArrowRight');
  check(await page.evaluate(() => MC.app.state.sceneObj.pup.chairOn) && await page.locator('#bookPosition').innerText() === '3 / 5쪽', '모닥불에 앉아서도 이어 읽고 쪽을 넘겨도 자리를 유지한다');
  await page.evaluate(() => { MC.app.state.startAt = Date.now() - 21 * 60 * 1000; });
  await sleep(1200);
  check(await page.evaluate(() => !MC.app.state.timerDone && document.querySelector('#bookReader').open), '책을 읽는 동안 20분 쉼 안내로 독서를 가리지 않는다');
  await page.evaluate(() => { MC.app.state.startAt = Date.now(); });
  await page.click('#bookClose');
  await page.keyboard.down('ArrowLeft');
  await sleep(250);
  await page.keyboard.up('ArrowLeft');
  check(await until(page, () => !MC.app.state.sceneObj.pup.chairOn && document.querySelector('#readBtn').hidden), '책을 덮은 뒤에는 방향키로 정상적으로 일어난다');

  const phone = await person({ phone: true }); cleanup(() => phone.close());
  const mobile = phone.page;
  await mobile.goto(site.url);
  await until(mobile, () => !!window.MC?.app);
  await mobile.click('#chairBtn');
  await mobile.waitForSelector('#readBtn:visible');
  await mobile.click('#readBtn');
  await shot(mobile, 'reading-shelf-phone');
  await mobile.click('[data-story="empty-pot"]');
  await shot(mobile, 'reading-page-phone');
  for (const size of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 740, height: 360 }]) {
    await mobile.setViewportSize(size);
    const layout = await mobile.evaluate(() => {
      const r = document.querySelector('#bookReader').getBoundingClientRect();
      const b = document.querySelector('#bookNext').getBoundingClientRect();
      return { inView: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, nextVisible: b.top >= r.top && b.bottom <= r.bottom, fits: document.querySelector('#bookReader').scrollWidth <= r.width };
    });
    check(layout.inView && layout.nextVisible && layout.fits, `${size.width}×${size.height}: 본문은 안에서 스크롤하고 쪽 넘기기 버튼은 화면 안에 남는다`, layout);
  }
  // localhost도 안전한 출처이므로 서비스 워커를 등록해 새 독서 파일의 오프라인 캐시를 확인한다.
  await mobile.evaluate(() => navigator.serviceWorker.register('sw.js'));
  await until(mobile, () => !!navigator.serviceWorker.controller, null, 15000);
  await phone.ctx.setOffline(true);
  await mobile.reload();
  await until(mobile, () => !!window.MC?.app);
  await mobile.click('#chairBtn');
  await mobile.waitForSelector('#readBtn:visible');
  await mobile.click('#readBtn');
  await mobile.click('[data-story="empty-pot"]');
  check((await mobile.locator('#bookContent').innerText()).includes('옥상'), '새 독서 파일도 캐시되어 인터넷 없이 다시 열어 읽을 수 있다');
  await phone.ctx.setOffline(false);
  check(!who.errors.length && !phone.errors.length, '독서 중 브라우저 오류 없음', [...who.errors, ...phone.errors]);
});
