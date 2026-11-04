// 바닥 접촉과 그리기 범위, 숙소 구르기의 양방향·원격 재생·취소·착지를 검증한다.
'use strict';
const { main } = require('./lib');

main(async ({ check, presenceServer, person, until, sleep, cleanup, enter, shot }) => {
  const site = await presenceServer(); cleanup(() => site.close());
  const first = await person({ nick: '데굴멍' }); cleanup(() => first.close());
  const second = await person({ nick: '옆집멍' }); cleanup(() => second.close());
  const A = first.page, B = second.page;
  await enter(A, site.url, 'lodge');
  await enter(B, site.url, 'lodge');
  await until(A, () => MC.app.state.sceneObj.crowd.visitors.size === 1);
  await until(B, () => MC.app.state.sceneObj.crowd.visitors.size === 1);
  await sleep(2000);

  const contact = await A.evaluate(() => {
    const p = new MC.Pup({ outfit: 'scarf' }); p.lie = p.lieTo = 1;
    const cv = document.createElement('canvas'); cv.width = cv.height = 320;
    const g = cv.getContext('2d'); let escaped = 0, floating = 0, deepest = -999, left = 999, right = -999, top = 999;
    let torso, head, joint, badJoints = 0, maxDrift = 0, maxTurnGap = 0;
    const ellipse = g.ellipse.bind(g), paintHead = p.paintHead;
    g.ellipse = (x, y, rx, ry, angle, ...rest) => {
      if (!torso && y < 0 && rx > 20 && ry > 15) {
        const m = g.getTransform();
        torso = { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f, angle: Math.atan2(m.b, m.a) + angle };
      }
      return ellipse(x, y, rx, ry, angle, ...rest);
    };
    p.paintHead = function (o, ...args) {
      const m = o.getTransform();
      head = { x: m.e - 71 * m.c, y: m.f - 71 * m.d, angle: Math.atan2(m.b, m.a) };
      return paintHead.call(this, o, ...args);
    };
    for (const dir of [-1, 1]) for (let i = 0; i <= 40; i++) {
      torso = head = null;
      p.rollPose = { u: i / 40, dir };
      const bounds = p.bounds();
      g.resetTransform(); g.clearRect(0, 0, 320, 320); g.translate(160, 200); p.paint(g);
      const dx = head.x - torso.x, dy = head.y - torso.y;
      if (!joint) joint = { dx, dy };
      const drift = Math.hypot(dx - joint.dx, dy - joint.dy);
      const turnGap = Math.abs(Math.atan2(Math.sin(head.angle - torso.angle), Math.cos(head.angle - torso.angle)));
      maxDrift = Math.max(maxDrift, drift); maxTurnGap = Math.max(maxTurnGap, turnGap);
      if (drift > 12 || turnGap > 0.12) badJoints++;
      const pixels = g.getImageData(0, 0, 320, 320).data;
      let bottom = -999;
      for (let y = 0; y < 320; y++) for (let x = 0; x < 320; x++) {
        const a = pixels[(y * 320 + x) * 4 + 3];
        if (a < 120) continue; // 옅은 바닥 그림자를 제외하고 몸과 윤곽을 잰다.
        const px = x - 160, py = y - 200;
        bottom = Math.max(bottom, py);
        left = Math.min(left, px); right = Math.max(right, px); top = Math.min(top, py);
        if (px < bounds.x0 || px >= bounds.x1 || py < bounds.y0 || py >= bounds.y1) escaped++;
      }
      deepest = Math.max(deepest, bottom);
      if (bottom < -3 || bottom > 9) floating++;
    }
    const resting = new MC.Pup(); resting.setLie(true);
    const events = []; resting.onEvent = e => events.push(e);
    for (let i = 0; i < 20; i++) resting.update(1 / 60, {});
    return { escaped, floating, deepest, left, right, top, badJoints, maxDrift, maxTurnGap, settled: resting.lie === 1, noHop: !events.includes('hop') && resting.hop === 0 };
  });
  check(contact.escaped === 0, '양방향 구르기의 머리·꼬리·발이 그림 범위 안에 들어온다', contact);
  check(contact.floating === 0, '구르는 내내 몸이 바닥에 닿고 발이 바닥 아래로 빠지지 않는다', contact);
  check(contact.badJoints === 0, '구르는 모든 중간 자세에서 머리가 어깨에 붙어 몸통과 같은 방향으로 돈다', { drift: contact.maxDrift, turnGap: contact.maxTurnGap });
  check(contact.settled && contact.noHop, '바닥에 누울 때 튀어 오르지 않고 앞다리를 접어 내려앉는다');

  await A.evaluate(() => {
    const s = MC.app.state.sceneObj, c = s.crowd;
    c.me.X = 300; c.me.Z = 920; c.target = c.path = null; c.roomMade = true;
  });
  check(await A.evaluate(() => MC.app.state.sceneObj.rollOver(1)), '방에서 오른쪽으로 구르기를 시작한다');
  check(await A.evaluate(() => !MC.app.state.sceneObj.rollOver(-1) && MC.app.state.sceneObj.crowd.toggleChair() === null), '구르는 도중 중복 구르기와 의자 펴기를 막는다');
  check(await until(B, () => [...MC.app.state.sceneObj.crowd.visitors.values()].some(v => v.pup.rollPose?.dir === 1), null, 3000, 25), '다른 접속자에게도 방향과 함께 구르는 자세가 보인다');
  await sleep(300); await shot(A, 'lying-roll-room');
  check(await until(A, () => { const s = MC.app.state.sceneObj; return !s.roll && !s.pup.rollPose && s.pup.lie === 0; }), '방에서 구른 뒤 일어나 앉는다');
  check(await until(B, () => [...MC.app.state.sceneObj.crowd.visitors.values()].every(v => !v.pup.rollPose && v.pup.lie === 0)), '다른 접속자의 화면에서도 착지 후 자세가 복구된다');

  await A.evaluate(() => { const s = MC.app.state.sceneObj; s.swapTo = true; s.swap(); s.fade = 0; });
  check(await until(A, () => { const s = MC.app.state.sceneObj; return s.inside && s.pup.lie === 1; }), '이불 속에서는 낮게 엎드린다');
  await shot(A, 'lying-rest-kotatsu');
  const start = await A.evaluate(() => { const s = MC.app.state.sceneObj; s.crowd.me.X = 650; s.crowd.me.Z = 800; return { x: 650, z: 800, accepted: s.rollOver(-1) }; });
  check(start.accepted, '이불 속에서 왼쪽으로 구르기를 시작한다');
  await A.keyboard.down('ArrowUp'); await sleep(500); await A.keyboard.up('ArrowUp');
  const during = await A.evaluate(() => { const s = MC.app.state.sceneObj; return { z: s.crowd.me.Z, x: s.crowd.me.X, rolling: !!s.pup.rollPose }; });
  check(during.rolling && during.x < start.x && during.z === start.z, '구르는 중 방향키를 눌러도 걷기가 섞이지 않고 왼쪽으로 구른다', during);
  check(await until(A, () => { const s = MC.app.state.sceneObj; return !s.roll && !s.pup.rollPose && s.pup.lie === 1; }), '이불 속에서 구른 뒤에는 다시 엎드린다');
  await A.evaluate(() => { const s = MC.app.state.sceneObj; s.rollOver(1); s.swapTo = false; s.swap(); });
  check(await A.evaluate(() => { const s = MC.app.state.sceneObj; return !s.inside && !s.roll && !s.pup.rollPose; }), '구르는 도중 이불 밖으로 나오면 회전 자세를 지운다');
  check(first.errors.length === 0 && second.errors.length === 0, '두 화면에 실행 오류 없음', [...first.errors, ...second.errors]);
});
