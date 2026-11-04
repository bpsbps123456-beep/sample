'use strict';
const { main } = require('./lib');

main(async ({ check, presenceServer, person, until, sleep, enter, shot, cleanup }) => {
  const srv = await presenceServer(); cleanup(() => srv.close());
  const one = await person({ residents: true }), two = await person({ residents: true, nick: '산책중' });
  cleanup(() => one.close()); cleanup(() => two.close());
  const A = one.page, B = two.page;
  for (const p of [A, B]) { await p.goto(srv.url); await until(p, () => !!MC.app?.camp?.ground); }
  await until(A, () => MC.app.net.count('map') === 2 && MC.app.camp.visitors.size > 12);
  await until(A, () => +document.querySelector('[data-n="all"]').textContent === MC.app.residents.total() + MC.app.net.total());
  const population = await A.evaluate(() => {
    const r = MC.app.residents, counts = [], names = r.specs.map(s => s.name);
    for (let t = 0; t < 86400; t += 11) counts.push(r.total(t));
    return { min: Math.min(...counts), max: Math.max(...counts), unique: new Set(r.specs.map(s => s.id)).size, names: new Set(names).size, places: new Set(r.active().map(s => s.place)).size, real: MC.app.net.total(), shown: +document.querySelector('[data-n="all"]').textContent, expected: r.total() + MC.app.net.total() };
  });
  check(population.min === 25 && population.max === 35 && population.unique === 35 && population.names === 35 && population.places === 7, '25명 이상 상주하며 방문 인원이 25~35명 사이에서 변한다', population);
  check(population.real === 2 && population.shown === population.expected, '표시 인원에는 멍이를 합산하고 서버 접속은 실제 두 명만 유지', population);
  const shared = await Promise.all([A, B].map(p => p.evaluate(() => MC.app.residents.active(1793792400).map(s => [s.id, MC.app.residents.sample(s, 1793792400)]))));
  check(JSON.stringify(shared[0]) === JSON.stringify(shared[1]), '같은 시각의 인원·외모·행동은 브라우저 사이에 일치한다');
  const terrain = await A.evaluate(() => {
    const r = MC.app.residents, c = MC.app.camp;
    let bad = [], walking = new Set(), resting = new Set(), boats = 0, fishing = 0;
    for (let t = 1700000000; t < 1700001200; t += 3) {
      for (const spec of r.specs.filter(s => s.place === 'map')) {
        const s = r.sample(spec, t);
        if (s.bt) { boats++; if (!c.sea.navigable(s.x, s.y)) bad.push([spec.id, 'boat']); }
        else {
          r.settle(s, c, []);
          if (!r.mapFree(s.x, s.y)) bad.push([spec.id, s.x, s.y]);
          if (s.fs) { fishing++; const d = MC.CampSea.deck; if (s.x < d.x0 || s.x > d.x1 || s.y < d.y0 || s.y > d.y1) bad.push([spec.id, 'fishing']); }
        }
        if (spec.path) (s.w ? walking : resting).add(spec.id);
      }
    }
    c.sea.boating = true;
    const footWhileBoating = r.mapFree(900, 560) && !r.mapFree(3400, 1400);
    c.sea.boating = false;
    return { bad: bad.slice(0, 6), boats, fishing, walkers: walking.size, resters: resting.size, footWhileBoating };
  });
  check(!terrain.bad.length && terrain.boats && terrain.fishing && terrain.footWhileBoating, '보트·낚시·도보는 각자의 지형을 벗어나지 않는다', terrain);
  check(terrain.walkers === 4 && terrain.resters === 4, '산책 멍이는 서로 다른 주기로 걷다가 쉬고 돌아온다', terrain);
  const yieldMap = await A.evaluate(() => {
    const r = MC.app.residents, c = MC.app.camp, s = r.sample(r.specs[0], 1000);
    const before = { x: c.pup.x, y: c.pup.y };
    r.settle(s, c, [{ x: s.x, y: s.y }]);
    return { gap: Math.hypot(s.x - r.specs[0].x, (s.y - r.specs[0].y) * 1.65), unchanged: before.x === c.pup.x && before.y === c.pup.y };
  });
  check(yieldMap.gap >= 75 && yieldMap.unchanged, '실제 사람이 있는 자리에서는 상주 멍이가 양보한다', yieldMap);
  const boop = await A.evaluate(() => {
    const a = MC.app, friend = [...a.camp.visitors.values()].find(v => v.st.npc), before = a.net.mine.bp;
    a.camp.onBoop(friend.id);
    return { name: document.querySelector('#campName').textContent, expected: friend.st.n, same: a.net.mine.bp === before };
  });
  check(boop.name === boop.expected && boop.same, '누르면 개별 이름을 보여 주고 가짜 네트워크 응원을 전송하지 않는다', boop);
  await shot(A, 'residents-map');
  for (const place of ['fire', 'firetower', 'water', 'forest', 'tent', 'lodge']) {
    await enter(A, srv.url, place);
    await until(A, () => MC.app.state.sceneObj.crowd.visitors.size >= MC.app.residents.count(MC.app.state.scene));
    await sleep(400);
    const result = await A.evaluate(() => {
      const a = MC.app, sc = a.state.sceneObj, crowd = sc.crowd;
      const friends = [...crowd.visitors.values()].filter(v => v.st.npc && !v.leaving);
      return { count: friends.length, expected: a.residents.count(a.state.scene), free: friends.every(v => v.st.k || crowd.free(v.st.x, v.st.y)), finite: friends.every(v => Number.isFinite(v.pup.x + v.pup.y)), q: friends.some(v => v.st.q) };
    });
    check(result.count === result.expected && result.free && result.finite && !result.q, `${place}: 장소에 맞는 멍이가 보이고 사람의 침대·가지 자리는 비워 둔다`, result);
    if (['fire', 'tent', 'lodge'].includes(place)) await shot(A, `residents-${place}`);
  }
  const priority = await A.evaluate(() => {
    const crowd = MC.app.state.sceneObj.crowd, original = crowd.visitors;
    const npcs = [...original.values()];
    const list = new Map();
    for (let i = 0; i < 40; i++) list.set(`extra-${i}`, { ...npcs[0], id: `extra-${i}` });
    const st = { ...npcs[0].st, npc: 0, n: '사람', x: 100, y: 900 };
    MC.syncVisitors(list, [{ id: 'real-person', s: st }], { outfit: 'beanie' });
    crowd.visitors = list; crowd.shownAt = -1;
    const has = [...crowd.shown()].some(v => v.id === 'real-person');
    crowd.visitors = original; crowd.shownAt = -1;
    return { has, size: list.size, real: list.has('real-person') };
  });
  check(priority.has && priority.real && priority.size === 40, '방문자가 많아도 실제 사람을 생성·그리기에 우선한다', priority);
  const phone = await person({ phone: true, residents: true }); cleanup(() => phone.close());
  await enter(phone.page, srv.url, 'fire');
  await until(phone.page, () => MC.app.state.sceneObj.crowd.visitors.size >= 4);
  await sleep(500); await shot(phone.page, 'residents-mobile-fire');
  const mobile = await phone.page.evaluate(() => {
    const c = MC.app.state.sceneObj.crowd;
    return { width: innerWidth, scroll: document.documentElement.scrollWidth, inFrame: [...c.visitors.values()].every(v => v.pup.x > 15 && v.pup.x < innerWidth - 15), count: c.visitors.size };
  });
  check(mobile.width === mobile.scroll && mobile.inFrame, '휴대폰에서도 멍이가 화면 안에 보인다', mobile);
  check(!one.errors.length && !two.errors.length && !phone.errors.length, '상주 멍이와 실제 접속자의 동시 동작 중 오류 없음', one.errors.concat(two.errors, phone.errors));
});
