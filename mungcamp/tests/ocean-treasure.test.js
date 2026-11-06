'use strict';
const { main } = require('./lib');

main(async ({ check, presenceServer, person, until, sleep, shot, cleanup, enter }) => {
  const site = await presenceServer(); cleanup(() => site.close());
  const a = await person({ nick: '보물멍' }), b = await person({ nick: '바다친구' });
  cleanup(() => a.close()); cleanup(() => b.close());
  const A = a.page, B = b.page;
  await enter(A, site.url, 'water'); await enter(B, site.url, 'water');
  await until(A, () => MC.app.state.started && MC.app.net.online); await sleep(2600);
  await A.keyboard.press('Shift'); await A.click('[data-act=dive]');
  check(await A.evaluate(() => MC.app.state.sceneObj.dive.giants().map(q => q.kind).join(',') === 'whale,shark,whale-shark'), '물속에 고래·상어·고래상어가 함께 헤엄친다');
  const chest = await A.evaluate(() => { const c = MC.app.state.sceneObj.dive.chests()[0]; return [c.x, c.y - 15]; });
  await A.mouse.click(...chest);
  check(await A.evaluate(() => MC.Wardrobe.balance() === 0 && !!MC.app.state.sceneObj.dive.pending), '멀리서 상자를 누르면 보상을 바로 주지 않고 헤엄쳐 간다');
  check(await until(A, () => MC.Wardrobe.balance() === 30, null, 12000), '실제 수영으로 상자 가까이 가면 코인 30개를 얻는다');
  await A.mouse.click(...chest);
  check(await A.evaluate(() => MC.Wardrobe.balance() === 30 && MC.Wardrobe.remaining('reef') > 0), '같은 상자를 연타해도 중복 보상이 없다');
  await A.click('#seaShop');
  await A.keyboard.press('Escape');
  check(await A.evaluate(() => document.querySelector('#dressCard').hidden && MC.app.state.view === 'session' && MC.app.state.sceneObj.underwater), '상점에서 Esc를 누르면 탐험에 머물며 상점만 닫힌다');
  await A.click('#seaShop');
  await A.click('[data-item=sailor-shirt]');
  check(await A.evaluate(() => MC.Wardrobe.balance() === 30 && !MC.Wardrobe.has('cl', 1) && document.querySelector('#shopStatus').textContent.includes('부족')), '잔액이 모자라면 코인과 소유권을 바꾸지 않는다');
  await A.click('[data-item=sailor]');
  check(await A.evaluate(() => MC.Wardrobe.balance() === 0 && MC.Wardrobe.has('ht', 5)), '보물 코인으로 마린 모자를 구매한다');
  await A.click('[data-item=sailor]');
  check(await A.evaluate(() => MC.Wardrobe.balance() === 0), '구매한 상품은 다시 차감하지 않고 입어본다');
  await A.click('#dressForm button[type=submit]'); await until(A, () => document.querySelector('#dressCard').hidden);
  check(await A.evaluate(() => MC.app.state.sceneObj.pup.hatStyle === 5), '구매한 모자가 실제 멍이에 적용된다');
  await A.click('#findTreasure');
  check(await until(A, () => MC.Wardrobe.balance() === 40, null, 12000), '보물 찾기 버튼이 다음 미개봉 상자로 안내한다');
  await shot(A, 'ocean-desktop');
  await A.click('#seaShop'); await A.click('[data-item=sailor-shirt]');
  await A.click('#dressForm button[type=submit]'); await until(A, () => document.querySelector('#dressCard').hidden);
  check(await A.evaluate(() => MC.Wardrobe.balance() === 0 && MC.app.state.sceneObj.pup.clothing === 1), '티셔츠를 구매해 모자와 함께 입는다');
  check(await until(B, () => [...MC.app.state.sceneObj.crowd.visitors.values()].some(v => v.st.cl === 1 && v.pup.clothing === 1 && v.pup.hatStyle === 5)), '새 옷·모자가 서버를 통해 친구 화면에도 전해진다');
  await A.reload(); await until(A, () => !!MC.app?.camp?.ground);
  check(await A.evaluate(() => MC.Wardrobe.balance() === 0 && MC.Wardrobe.has('cl', 1) && MC.Wardrobe.has('ht', 5) && MC.Wardrobe.remaining('reef') > 0 && MC.app.camp.pup.clothing === 1), '새로고침 후 구매품·잔액·착용·상자 대기시간이 유지된다');
  check(await A.evaluate(() => {
    const w = MC.Wardrobe; const before = w.balance();
    const invalid = !w.claim('made-up') && !w.buy('made-up').ok;
    const value = MC.store.get('seaWallet'); value.claimed.reef = Date.now() - w.cooldown - 1; MC.store.set('seaWallet', value);
    return invalid && w.claim('reef') === 30 && w.balance() === before + 30 && w.claim('reef') === 0;
  }), '잘못된 상품·상자는 거부하고 대기시간이 지난 상자만 다시 보상한다');
  check(await A.evaluate(() => {
    const g = document.createElement('canvas').getContext('2d');
    for (const item of MC.Wardrobe.items.filter(i => i.price)) {
      const p = new MC.Pup({ outfit: 'beanie' }), slots = {ht: 7, ac: 6, gl: 5, cl: 4, [item.slot]: item.value};
      p.setLook(0, 0, slots.ht, slots.ac, slots.gl, slots.cl); p.x = 80; p.y = 160; p.k = 1;
      for (const view of ['front', 'back']) { p.view = view; p.draw(g, 1); }
      p.setLie(true); for (let i = 0; i < 60; i++) p.update(1/30, {noSleep:true}); p.draw(g, 1);
      p.rest = 'tube'; p.draw(g, 1); p.rest = 'branch'; p.draw(g, 1);
    }
    return true;
  }), '추가한 12종을 앞·뒤·눕기·튜브·가지 자세에서 오류 없이 그린다');
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 320, height: 740 }]) {
    await A.setViewportSize(viewport);
    await A.evaluate(() => { MC.app.camp.placeAt('water'); MC.app.enterScene('water'); });
    await until(A, () => MC.app.state.sceneObj?.crowd && MC.app.state.started); await sleep(2600);
    await A.keyboard.press('Shift'); await A.click('[data-act=dive]');
    check(await until(A, () => { const r = document.querySelector('#diveHud').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 50 && r.bottom < innerHeight - 80; }), `${viewport.width}×${viewport.height}에서 코인·보물·상점 버튼을 볼 수 있다`);
    await A.click('#findTreasure');
    check(await until(A, () => MC.Wardrobe.balance() === 80, null, 16000), `${viewport.width}×${viewport.height}에서 수영으로 보물에 도달한다`);
    await shot(A, `ocean-${viewport.width}`);
    await A.click('#seaShop'); await A.click('[data-item=whale-shirt]');
    await shot(A, `ocean-shop-${viewport.width}`);
    await A.click('#dressCancel'); await A.click('#exitBtn'); await until(A, () => MC.app.state.view === 'home');
    // 다음 화면 크기에서 마지막 상자로 수영하는 길을 다시 확인한다.
    await A.evaluate(() => { const v = MC.store.get('seaWallet'); v.coins = 30; delete v.claimed['deep-blue']; MC.store.set('seaWallet', v); });
  }
  check(a.errors.length === 0 && b.errors.length === 0, '탐험·구매·그리기 중 오류 없음', [...a.errors, ...b.errors]);
});
