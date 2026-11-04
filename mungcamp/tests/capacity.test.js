// 실제 웹소켓으로 기본 정원·큰 방의 이동·퇴장을 확인한다. 운영 서버에는 연결하지 않는다.
'use strict';
const { main } = require('./lib');

main(async ({ check, presenceServer, person, cleanup, enter }) => {
  const srv = await presenceServer(); cleanup(() => srv.close());
  const one = await person(); cleanup(() => one.close());
  const page = one.page;
  await page.goto(srv.url + 'health');
  for (const [place, cap] of [['map', 200], ['fire', 100], ['tent', 40]]) {
    const result = await page.evaluate(async ({ place, cap }) => {
      const wait = async (fn) => {
        const start = performance.now();
        while (!fn()) {
          if (performance.now() - start > 15000) throw new Error('capacity timeout: ' + place);
          await new Promise(resolve => setTimeout(resolve, 25));
        }
      };
      const peers = [];
      for (let i = 0; i <= cap; i++) {
        const socket = new WebSocket(location.origin.replace(/^http/, 'ws') + '/');
        const peer = { socket, states: new Map(), id: null, full: false };
        peers.push(peer);
        socket.onopen = () => socket.send(JSON.stringify({ t: 's', s: { p: place, x: i, y: 100 } }));
        socket.onmessage = ev => {
          const msg = JSON.parse(ev.data);
          if (msg.t === 'you') peer.id = msg.id;
          if (msg.t !== 'd') return;
          if (msg.full) { peer.states.clear(); peer.full = true; }
          for (const [id, st] of Object.entries(msg.j || {})) if (id !== peer.id) peer.states.set(id, st);
          for (const id of msg.l || []) peer.states.delete(id);
        };
      }
      try {
        await wait(() => peers.every(p => p.full && p.id));
        await wait(() => peers.filter(p => p.states.size === cap - 1).length === cap);
        const first = peers.find(p => p.states.size === cap - 1);
        const overflow = peers.find(p => p.states.size === 0);
        const together = peers.filter(p => p.states.size === cap - 1);
        let step = 0;
        const timer = setInterval(() => {
          step++;
          for (const peer of together) peer.socket.send(JSON.stringify({ t: 's', s: { p: place, x: 1000 + step, y: 100, w: 1 } }));
        }, 125);
        try {
          await wait(() => step >= 16);
        } finally { clearInterval(timer); }
        await wait(() => [...first.states.values()].every(st => st.x === 1000 + step));
        const health = await (await fetch('/health')).json();
        const moving = first.states.size === cap - 1 && !first.states.has(first.id);
        const departed = together.find(p => p !== first);
        departed.socket.close();
        await wait(() => !first.states.has(departed.id));
        return { connected: health.clients, together: together.length, overflow: overflow && overflow.states.size === 0, moving, left: first.states.size === cap - 2, steps: step };
      } finally {
        for (const p of peers) p.socket.close();
        await wait(() => peers.every(p => p.socket.readyState === WebSocket.CLOSED));
      }
    }, { place, cap });
    check(result.connected === cap + 1 && result.together === cap && result.overflow, `${place}: ${cap}명까지 같은 방, 다음 사람은 새 방`, result);
    check(result.moving && result.left, `${place}: 전원 이동을 공유하고 퇴장한 사람만 사라진다`, result);
    // 이전 방의 연결이 서버에서도 정리된 뒤 다음 장소를 확인한다.
    for (let tries = 0; tries < 100; tries++) {
      if ((await (await fetch(srv.url + 'health')).json()).clients === 0) break;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
  }
  await enter(page, srv.url, 'fire');
  const rendering = await page.evaluate(() => {
    const app = MC.app, crowd = app.state.sceneObj.crowd;
    const state = crowd.state();
    const list = Array.from({ length: 199 }, (_, i) => ({ id: 'crowd-test-' + i, s: { ...state, n: '사람', x: 100 + i, y: 600 } }));
    crowd.sync(list);
    MC.frameQuality = 1; crowd.shownAt = -1;
    const high = crowd.shown().size;
    MC.frameQuality = 0.5; crowd.shownAt = -1;
    const low = crowd.shown().size;
    MC.frameQuality = 1; crowd.shownAt = -1;
    const before = app.net.peers.size;
    app.net.receive(app.net.id, state);
    return { tracked: crowd.visitors.size, high, low, selfExcluded: typeof app.net.id === 'string' && app.net.peers.size === before && !app.net.peers.has(app.net.id) };
  });
  check(rendering.tracked === 199 && rendering.high === 48 && rendering.low === 8, '큰 군중을 추적하고 기기 성능에 맞춰 그리기 수를 줄인다', rendering);
  check(rendering.selfExcluded, '공통 변경 묶음에 내 상태가 있어도 내 멍이를 중복 생성하지 않는다', rendering);
  check(!one.errors.length, '큰 방 확인 중 브라우저 오류 없음', one.errors);
});
