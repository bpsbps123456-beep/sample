// 실제 낚시 성공에서만 중복 없는 선물을 모으고, 저장·착용·실시간 공유한다.
'use strict';
const { main } = require('./lib');

main(async ({ check, presenceServer, person, until, sleep, cleanup, shot }) => {
  const srv = await presenceServer(); cleanup(() => srv.close());
  const one = await person({ nick: '선물멍' }), two = await person({ nick: '친구멍' });
  cleanup(() => one.close()); cleanup(() => two.close());
  const A = one.page, B = two.page;
  for (const p of [A, B]) { await p.goto(srv.url); await until(p, () => !!MC.app?.camp?.ground); }
  await A.click('#dressBtn');
  check(await A.evaluate(() => document.querySelectorAll('.closet-item:disabled').length === 10), '아직 얻지 않은 선물 10종은 잠겨 있다');
  check(await A.evaluate(() => { const l = MC.app.net.setLook(0, 0, 1, 1, 1); return !l.ht && !l.ac && !l.gl; }), '미획득 아이템을 착용할 수 없다');
  await A.click('#dressCancel');
  const result = await A.evaluate(() => {
    const c = MC.app.camp, sea = c.sea, S = MC.CampSea;
    c.pup.x = S.deck.x0 + 90; c.pup.y = 1041; c.target = null; c.route = []; c.setKeys(0, 0);
    sea.cast(); sea.reel(); // 입질 전에 거두기
    const early = MC.Wardrobe.owned().length;
    sea.cast(); sea.fishing.stage = 2; sea.fishing.remaining = .01; sea.update(.02, false);
    const missed = MC.Wardrobe.owned().length;
    const rewards = [];
    for (let i = 0; i < 10; i++) {
      sea.cast(); sea.fishing.stage = 2; sea.reel(); rewards.push(sea.catch.reward.id);
      if (sea.reel()) throw new Error('같은 낚시를 두 번 보상함');
    }
    sea.cast(); sea.fishing.stage = 2; sea.reel();
    return { early, missed, rewards, owned: MC.Wardrobe.owned(), complete: !sea.catch.reward && !!sea.catch.name };
  });
  check(result.early === 0 && result.missed === 0, '일찍 거두거나 입질을 놓치면 보상을 받지 않는다', result);
  check(new Set(result.rewards).size === 10 && result.owned.length === 10, '낚시 성공마다 중복 없이 하나씩 모은다', result.rewards);
  check(result.complete, '모두 모은 뒤에도 정상적으로 낚시한다');
  await A.click('#dressBtn');
  check(await A.evaluate(() => document.querySelectorAll('.closet-item:disabled').length === 0 && document.querySelector('#closetCount').textContent === `10 / ${MC.Wardrobe.items.length}`), '모은 선물이 꾸미기 창에 열린다');
  await A.click('#swStyle [data-v="1"]');
  await A.click('#swAccessory [data-v="1"]');
  await A.click('#swGloves [data-v="1"]');
  await A.keyboard.press('Escape');
  check(await A.evaluate(() => !MC.app.net.look.ht && !MC.app.camp.pup.gloves), '취소하면 착용 상태는 바뀌지 않는다');
  await A.click('#dressBtn');
  await A.click('#swStyle [data-v="1"]');
  await A.click('#swAccessory [data-v="3"]');
  await A.click('#swGloves [data-v="2"]');
  await shot(A, 'fishing-closet');
  await A.click('#dressForm button[type=submit]');
  await until(A, () => document.querySelector('#dressCard').hidden);
  check(await A.evaluate(() => { const p = MC.app.camp.pup; return p.hatStyle === 1 && p.accessory === 3 && p.gloves === 2; }), '모자·액세서리·장갑을 함께 착용한다');
  check(await until(B, () => [...MC.app.camp.visitors.values()].some(v => v.pup.hatStyle === 1 && v.pup.accessory === 3 && v.pup.gloves === 2)), '서버를 통해 다른 사람 화면에도 착용한 모습이 전해진다');
  await A.reload(); await until(A, () => !!MC.app?.camp?.ground);
  check(await A.evaluate(() => MC.Wardrobe.owned().length === 10 && MC.app.camp.pup.hatStyle === 1 && MC.app.camp.pup.gloves === 2), '재방문에도 수집품과 착용 상태를 유지한다');
  await A.evaluate(() => { MC.app.camp.placeAt('fire'); MC.app.enterScene('fire'); });
  await until(A, () => !!MC.app.state.sceneObj?.pup);
  check(await A.evaluate(() => { const p = MC.app.state.sceneObj.pup; return p.hatStyle === 1 && p.accessory === 3 && p.gloves === 2; }), '장소에 들어가도 같은 아이템을 착용한다');
  check(await A.evaluate(() => { const s = MC.netClean({ p: 'map', x: 0, y: 0, ht: 999, ac: -1, gl: 1.5 }); return s.ht === 0 && s.ac === 0 && s.gl === 0; }), '잘못된 꾸미기 번호는 기본값으로 정리한다');
  await A.click('#exitBtn'); await until(A, () => MC.app.state.view === 'home');
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await A.setViewportSize(viewport);
    await A.click('#dressBtn');
    await A.click('#swStyle [data-v="4"]');
    await A.click('#swAccessory [data-v="2"]');
    await A.click('#swGloves [data-v="3"]');
    check(await A.evaluate(() => {
      const preview = document.querySelector('#dressPreview').getBoundingClientRect(), footer = document.querySelector('#dressForm .modal-buttons').getBoundingClientRect(), fields = document.querySelector('.dress-fields').getBoundingClientRect();
      return document.documentElement.scrollWidth === innerWidth && preview.top >= 0 && preview.bottom <= fields.top + 2 && fields.bottom <= footer.top && footer.bottom <= innerHeight;
    }), `모바일 ${viewport.width}×${viewport.height}: 미리보기·아이템·저장 버튼이 겹치지 않는다`);
    await A.click('#dressCancel');
  }
  for (const p of [one, two]) check(p.errors.length === 0, '브라우저 오류 없음', p.errors.slice(0, 3));
});
