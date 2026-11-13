'use strict';
const assert = require('assert/strict'), Learning = require('../server/learning');
const clients = new Set(), sent = [], evicted = [];
const lesson = new Learning((c, m) => sent.push({ to: c.id, ...structuredClone(m) }), () => clients, c => { evicted.push(c.id); c.room = { place: 'map' }; });
const client = (id, pin) => { const c = { id, state: { n: id }, room: { place: 'learn' } }; clients.add(c); lesson.command(c, 'enter', pin); return c; };
const owner = client('owner', '8624'), coOwner = client('co-owner', '8624'), a = client('a', '0000'), b = client('b', '0000');
lesson.command(owner, 'start', { text: '오늘의 생각', type: 'text' });
lesson.command(a, 'answer', { id: 1, answer: '내 답' }); lesson.command(b, 'answer', { id: 1, answer: '친구 답' });
lesson.command(owner, 'reveal-answer', { id: 1, member: a.id });
lesson.command(owner, 'set-notice', '수업 안내'); lesson.command(a, 'chat', '반가워요');
for (const [actor, target] of [[a, b.id], [owner, owner.id], [owner, coOwner.id], [owner, 'missing'], [owner, {}]]) {
  lesson.command(actor, 'kick', target); assert.equal(evicted.length, 0);
}
lesson.command(owner, 'kick', a.id);
assert.deepEqual(evicted, ['a']); assert.equal(a.learn, null); assert.equal(a.room.place, 'map');
assert.ok(!lesson.answers.has(a.id)); assert.ok(!lesson.revealed.has(a.id));
assert.ok(sent.some(m => m.to === a.id && m.t === 'learn-kicked'));
assert.ok(!lesson.snapshot(b).roster.some(m => m.id === a.id));
assert.equal(lesson.snapshot(b).answered, 1); assert.equal(lesson.answers.get(b.id).text, '친구 답');
assert.equal(lesson.notice.text, '수업 안내'); assert.equal(lesson.messages.length, 1);
const messages = lesson.messages.length; lesson.command(a, 'chat', '퇴장 후 전송'); lesson.command(a, 'answer', { id: 1, answer: '다시 제출' });
assert.equal(lesson.messages.length, messages); assert.ok(!lesson.answers.has(a.id));
owner.learn.until = 0; lesson.command(owner, 'kick', b.id); assert.deepEqual(evicted, ['a']);
console.log('✓ 강퇴 운영 권한·자신/운영자 보호·잘못된 대상 차단·서버 퇴장·답안 정리·권한 회수·다른 참여자와 공지 보존');
