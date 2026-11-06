'use strict';
const { main } = require('./lib');

main(async ({ check, presenceServer, person, until, sleep, shot, cleanup, enter }) => {
  const site = await presenceServer(); cleanup(() => site.close());
  const a = await person({ nick: '넓은바다' }), b = await person({ phone: true, nick: '바다친구' });
  cleanup(() => a.close()); cleanup(() => b.close());
  const A = a.page, B = b.page;
  await enter(A, site.url, 'water'); await enter(B, site.url, 'water');
  await until(A, () => MC.app.state.started && MC.app.net.online); await sleep(2600);
  for (const page of [A, B]) { await page.keyboard.press('Shift'); await page.click('[data-act=dive]'); }
  check(await B.evaluate(() => {
    const s = MC.app.state.sceneObj, c = s.dive.chests()[0];
    return s.dive.w > innerWidth * 5 && c.x > 80 && c.x < innerWidth - 65 && c.y < innerHeight - 80;
  }), '휴대폰에서 넓은 바다의 첫 상자를 바로 보고 누를 수 있다');
  await shot(B, 'ocean-camera-start');
  const start = await A.evaluate(() => MC.app.state.sceneObj.crowd.me.X);
  await A.click('[data-dive-region="2"]');
  check(await A.evaluate(x => MC.app.state.sceneObj.crowd.me.X < x + 20 && MC.Wardrobe.balance() === 0, start), '지도 이동은 순간 이동이나 즉시 보상이 아닌 수영으로 시작한다');
  check(await until(A, () => MC.Wardrobe.balance() === 50, null, 22000), '지도로 고른 심해까지 여러 화면을 가로질러 실제로 수영한다');
  check(await until(B, () => {
    const s = MC.app.state.sceneObj, v = [...s.crowd.visitors.values()].find(v => v.st.dv && v.st.x > 790);
    return v && v.pup.x > s.w && Math.abs(v.pup.x - (v.x / 1000 * s.dive.w - s.dive.camX)) < 1;
  }), '화면 크기가 다른 친구에게도 같은 바다 좌표로 위치를 전한다');
  await B.click('[data-dive-region="2"]');
  check(await until(B, () => MC.Wardrobe.balance() === 50, null, 22000), '휴대폰에서도 지도의 심해 상자까지 긴 수영이 끊기지 않는다');
  check(await until(B, () => {
    const s = MC.app.state.sceneObj;
    return [...s.crowd.visitors.values()].some(v => v.st.dv && v.st.x > 790 && Math.abs(v.pup.x - s.pup.x) < 45);
  }), '심해에서 만난 친구가 내 멍이와 같은 위치에 보인다');
  await until(B, () => !MC.app.state.sceneObj.crowd.target);
  const before = await B.evaluate(() => MC.app.state.sceneObj.crowd.me.X);
  await B.setViewportSize({width:844, height:390});
  check(await until(B, x => {
    const s = MC.app.state.sceneObj; return s.w === 844 && Math.abs(s.crowd.me.X - x) < 1 && s.pup.x > 40 && s.pup.x < s.w - 40;
  }, before), '화면을 돌려도 바다의 현재 위치를 보존하고 카메라를 맞춘다');
  await B.click('[data-act=dive]'); await B.click('[data-act=dive]');
  check(await B.evaluate(x => Math.abs(MC.app.state.sceneObj.crowd.me.X - x) < 1, before), '물 위에 다녀와도 탐험하던 심해 위치에서 이어간다');
  await B.keyboard.down('ArrowRight'); await sleep(4300); await B.keyboard.up('ArrowRight');
  check(await B.evaluate(() => {
    const s = MC.app.state.sceneObj, c = s.crowd;
    return c.me.X <= c.cfg.bounds().x1 && s.dive.camX === s.dive.w - s.w && s.pup.x <= s.w - 20;
  }), '바다 오른쪽 끝에서는 카메라와 멍이가 경계 밖으로 나가지 않는다');
  await B.setViewportSize({width:320,height:568});
  await until(B, () => MC.app.state.sceneObj.w === 320);
  await B.click('#seaShop');
  check(await B.evaluate(() => [...document.querySelectorAll('.closet-item')].every(b => parseFloat(getComputedStyle(b).fontSize) >= 16 && !getComputedStyle(b).fontFamily.includes('Dongle'))), '작은 휴대폰에서도 상점 상품 이름을 또렷한 16px 글꼴로 읽는다');
  await shot(B, 'ocean-camera-shop-small');
  await B.click('#dressCancel');
  await shot(B, 'ocean-camera-small');
  check(!a.errors.length && !b.errors.length, '카메라·회전·친구 위치·상점에서 오류 없음', [...a.errors, ...b.errors]);
});
