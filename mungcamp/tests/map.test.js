// 마을 지도: 끌면 둘러보고(걷지 않음), 톡 하면 걷고 카메라가 다시 따라가고,
// 지도 끝에서 더 끌면 페이지가 스크롤된다. 휴대폰은 지도를 당겨 보여 주어 위아래로도 둘러본다.
// 넓어진 마을: 네 곳의 '들어가기', 오른쪽 끝 바다, 남쪽 글램핑장, 한 바퀴 도는 둘레길
'use strict';
const { main } = require('./lib');

main(async ({ check, staticServer, person, until, sleep, cleanup }) => {
  const site = await staticServer();
  cleanup(() => site.close());
  const who = await person();
  cleanup(() => who.close());
  const P = who.page;
  await P.goto(site.url);
  await until(P, () => !!(window.MC && MC.app && MC.app.camp && MC.app.camp.ground));
  await sleep(800);
  const st = () => P.evaluate(() => { const c = MC.app.camp; return { cam: [c.cam.x, c.cam.y], pup: [c.pup.x, c.pup.y], free: !!c.camFree, target: !!c.target, scrollY: window.scrollY }; });
  const a = await st();
  await P.mouse.move(600, 400);
  await P.mouse.down();
  for (let i = 1; i <= 10; i++) await P.mouse.move(600 - i * 20, 400 - i * 8);
  await P.mouse.up();
  await sleep(300);
  const b = await st();
  check(b.free && Math.abs(b.cam[0] - a.cam[0]) > 50, '끌면 지도를 둘러본다', { before: a.cam.map(Math.round), after: b.cam.map(Math.round) });
  check(!b.target && b.pup[0] === a.pup[0], '끌고 난 뒤에는 걷지 않는다');

  await P.mouse.click(500, 420);
  await sleep(200);
  const c = await st();
  check(c.target && !c.free, '톡 하면 그리로 걷고 카메라가 다시 따라간다');

  await sleep(1500);
  for (let k = 0; k < 2; k++) {
    await P.mouse.move(500, 620);
    await P.mouse.down();
    for (let i = 1; i <= 20; i++) await P.mouse.move(500, 620 - i * 25);
    await P.mouse.up();
    await sleep(200);
  }
  const d = await st();
  check(d.scrollY > 50, '지도 끝에서 더 끌면 페이지가 스크롤된다', Math.round(d.scrollY));

  // 넓어진 마을: 네 곳에 '들어가기', 정자는 '똑'. 바다는 늘 가장 오른쪽
  const spots = await P.evaluate(() => MC.CAMP_SPOTS.map((s) => [s.id, s.label, s.act]));
  const want = [['fire', '모닥불', '들어가기'], ['water', '달빛 바다', '들어가기'], ['forest', '편백 숲', '들어가기'], ['tent', '글램핑', '들어가기'], ['moktak', '정자', '똑']];
  check(JSON.stringify(spots) === JSON.stringify(want), "모닥불·바다·숲·글램핑에 '들어가기', 정자는 '똑'", spots);
  check(await P.evaluate(() => { const w = MC.CAMP_SPOTS.find((q) => q.id === 'water'); return MC.CAMP_SPOTS.every((q) => q.x <= w.x); }), '바다는 가장 오른쪽');
  check(await P.evaluate(() => { const t = MC.CAMP_SPOTS.find((q) => q.id === 'tent'); const f = MC.CAMP_SPOTS.find((q) => q.id === 'fire'); return t.y > f.y + 400; }), '글램핑장은 모닥불에서 더 아래(남쪽)');
  // 한 바퀴 도는 둘레길: 닫혀 있고, 길 위에 막힌 곳이 없고, 숲·바다·글램핑장 곁을 지난다
  const ring = await P.evaluate(() => {
    const c = MC.app.camp;
    const r = MC.CAMP_PATHS[0];
    let blocked = 0;
    let unwalk = 0;
    let len = 0;
    for (let i = 0; i < r.length; i++) {
      const [x, y] = r[i];
      if (!c.walkable(x, y)) unwalk++;
      const q = { x, y };
      c.collide(q);
      if (Math.hypot(q.x - x, q.y - y) > 4) blocked++;
      if (i) len += Math.hypot(x - r[i - 1][0], y - r[i - 1][1]);
    }
    const near = ['forest', 'water', 'tent'].map((id) => { const s = MC.CAMP_SPOTS.find((q) => q.id === id); return Math.round(Math.min(...r.map(([x, y]) => Math.hypot(x - s.x, y - s.y)))); });
    return { closed: Math.hypot(r[0][0] - r[r.length - 1][0], r[0][1] - r[r.length - 1][1]) < 1, blocked, unwalk, len: Math.round(len), near };
  });
  check(ring.closed && ring.blocked === 0 && ring.unwalk === 0 && ring.len > 4000, '마을을 한 바퀴 도는 둘레길 (막힌 곳 없음)', ring);
  check(ring.near.every((d) => d < 420), '둘레길이 숲·바다·글램핑장 곁을 지난다', ring.near);
  // 둘레길 한 토막을 실제로 걸어 본다: 글램핑장 앞을 지나 연못 쪽으로
  const walked = await P.evaluate(async () => {
    const c = MC.app.camp;
    const r = MC.CAMP_PATHS[0];
    const i0 = r.findIndex(([x, y]) => y > 1900);
    const [x0, y0] = r[i0];
    c.pup.x = x0;
    c.pup.y = y0;
    const goal = r[Math.min(r.length - 1, i0 + 30)];
    c.target = { x: goal[0], y: goal[1] };
    c.lastDist = Infinity;
    c.stuck = 0;
    await new Promise((res) => setTimeout(res, 3500));
    return Math.round(Math.hypot(c.pup.x - goal[0], c.pup.y - goal[1]));
  });
  check(walked < 40, '둘레길을 따라 걸어간다', walked);

  const ph = await person({ phone: true });
  cleanup(() => ph.close());
  await ph.page.goto(site.url);
  await until(ph.page, () => !!(window.MC && MC.app && MC.app.camp && MC.app.camp.ground));
  const z = await ph.page.evaluate(() => { const cm = MC.app.camp; const y0 = cm.cam.y; cm.pan(0, 300); return { z: cm.z, moved: Math.round(y0 - cm.cam.y) }; });
  check(z.z >= 0.7 && z.moved > 100, '휴대폰에서는 위아래로도 둘러볼 수 있다', z);
  const hl = await ph.page.evaluate(() => getComputedStyle(document.documentElement).webkitTapHighlightColor);
  check(hl === 'rgba(0, 0, 0, 0)', '톡 할 때 화면이 번쩍이지 않는다 (터치 강조 끔)', hl);
  check(who.errors.length === 0 && ph.errors.length === 0, '오류 없음', who.errors.concat(ph.errors).slice(0, 3));
});
