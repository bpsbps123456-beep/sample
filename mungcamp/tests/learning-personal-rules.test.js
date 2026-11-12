'use strict';
const { main } = require('./lib');
main(async ({ check, presenceServer, cleanup }) => {
  const server = await presenceServer(); cleanup(server.close);
  const connect = async () => {
    const ws = new WebSocket(server.url.replace(/^http/, 'ws')), inbox = [], waiting = new Set();
    cleanup(() => ws.close());
    ws.addEventListener('message', event => { inbox.push(JSON.parse(event.data)); for (const receive of waiting) receive(); });
    const take = predicate => new Promise((resolve, reject) => {
      const timer = setTimeout(() => { waiting.delete(receive); reject(Error('personal state timeout')); }, 5000);
      const receive = () => {
        const index = inbox.findIndex(predicate); if (index < 0) return;
        clearTimeout(timer); waiting.delete(receive); resolve(inbox.splice(index, 1)[0]);
      }; waiting.add(receive); receive();
    });
    const { id } = await take(m => m.t === 'you');
    return { ws, id, take, send: m => ws.send(JSON.stringify(m)) };
  };
  const enter = async client => {
    client.send({ t: 'learn', action: 'enter', value: '0000' }); await client.take(m => m.t === 'learn-access');
  };
  const a = await connect();
  const state = { p: 'learn', n: '상태검사멍', x: 500, y: 500, sg: '쉬는중이에요', ch: 1, w: 0, answer: '비공개 답' };
  a.send({ t: 's', s: state });
  check((await a.take(m => m.t === 'learn-denied')).message.includes('비밀번호'), '팻말·의자가 있어도 비밀번호 없는 배움터 입장 차단');
  await enter(a); a.send({ t: 's', s: state }); await a.take(m => m.t === 'learn-state');
  const b = await connect(); await enter(b); b.send({ t: 's', s: { p: 'learn', x: 500, y: 500 } });
  const joined = await b.take(m => m.t === 'd' && m.full && m.j[a.id]);
  check(joined.j[a.id].sg === '쉬는중이' && joined.j[a.id].ch === 1 && !Object.hasOwn(joined.j[a.id], 'answer'), '서버가 네 글자 상태·의자만 정제해 늦은 입장자에게 전송');
  a.send({ t: 's', s: { ...state, sg: '독서중', w: 1 } });
  const walking = await b.take(m => m.t === 'd' && m.j[a.id]?.sg === '독서중');
  check(walking.j[a.id].w === 1 && walking.j[a.id].ch === 0, '클라이언트를 우회해도 서버가 이동 중 의자를 접음');
  a.send({ t: 's', s: { ...state, sg: '시발' } });
  const filtered = await b.take(m => m.t === 'd' && m.j[a.id]?.sg === '' && m.j[a.id].w === 0);
  check(filtered.j[a.id].ch === 1, '서버에서 험한 상태 문구만 제거하고 의자 상태 유지');
  a.send({ t: 's', s: { ...state, sg: '', ch: 0 } });
  const removed = await b.take(m => m.t === 'd' && m.j[a.id]?.sg === '' && m.j[a.id].ch === 0);
  check(removed.j[a.id].w === 0, '서버가 팻말·의자 제거를 친구에게 전달');
  a.send({ t: 's', s: { ...state, p: 'lodge' } });
  await b.take(m => m.t === 'd' && m.l.includes(a.id));
  b.send({ t: 's', s: { p: 'lodge', x: 500, y: 500 } });
  const outside = await b.take(m => m.t === 'd' && m.full && m.j[a.id]?.p === 'lodge');
  check(outside.j[a.id].sg === '', '배움터 밖의 다른 실내에서는 상태 팻말 공유 제한 유지');
});
