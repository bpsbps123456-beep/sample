'use strict';
const assert = require('assert/strict'), Learning = require('../server/learning');
const clients = new Set(), sent = [];
const lesson = new Learning((c, m) => sent.push({ to: c.id, ...structuredClone(m) }), () => clients);
const client = (id, pin = '0000') => {
  const c = { id, state: { n: id }, room: { place: 'map' } }; clients.add(c);
  lesson.command(c, 'enter', pin); if (c.learn) c.room.place = 'learn'; return c;
};
const owner = client('owner', '8624'), a = client('a'), b = client('b');
lesson.command(owner, 'start', { text: '질문', type: 'text' });
lesson.command(a, 'answer', { id: 1, answer: '첫 번째 답' });
lesson.command(b, 'answer', { id: 1, answer: '두 번째 답' });
lesson.command(a, 'reveal-answer', { id: 1, member: 'b' });
assert.equal(lesson.snapshot(a).boards.b.text, undefined);
for (const value of [null, {}, { id: 0, member: 'a' }, { id: 1, member: 'missing' }, { id: 1, member: 'owner' }, { id: 1, member: {} }]) lesson.command(owner, 'reveal-answer', value);
assert.equal(lesson.revealed.size, 0);
sent.length = 0; lesson.command(owner, 'reveal-answer', { id: 1, member: 'a' });
assert.deepEqual(sent.map(m => m.to).sort(), ['a', 'b', 'owner']);
for (const c of [owner, a, b]) {
  assert.equal(lesson.snapshot(c).boards.a.text, '첫 번째 답');
  assert.equal(lesson.snapshot(c).boards.a.revealed, true);
  if (c !== b) assert.equal(lesson.snapshot(c).boards.b.text, undefined);
}
assert.equal(lesson.phase, 'open'); assert.equal(lesson.snapshot(owner).summary, null);
sent.length = 0; lesson.command(owner, 'reveal-answer', { id: 1, member: 'a' }); assert.equal(sent.length, 0);
const late = client('late'); assert.equal(lesson.snapshot(late).boards.a.text, '첫 번째 답'); assert.equal(lesson.snapshot(late).boards.b.text, undefined);
lesson.command(a, 'answer', { id: 1, answer: '첫 번째 답' }); assert.equal(lesson.revealed.has('a'), true);
lesson.command(a, 'answer', { id: 1, answer: '수정한 비공개 답' });
assert.equal(lesson.snapshot(a).boards.a.text, '수정한 비공개 답'); assert.equal(lesson.snapshot(owner).boards.a.text, undefined); assert.equal(lesson.snapshot(b).boards.a.text, undefined);
lesson.command(owner, 'close'); lesson.command(owner, 'reveal-answer', { id: 1, member: 'b' }); assert.equal(lesson.snapshot(a).boards.b.text, '두 번째 답'); assert.equal(lesson.phase, 'closed');
owner.learn.until = 0; lesson.command(owner, 'reveal-answer', { id: 1, member: 'a' }); assert.equal(lesson.revealed.has('a'), false);
lesson.command(owner, 'enter', '8624'); lesson.command(owner, 'reveal'); assert.equal(lesson.snapshot(b).boards.a.text, '수정한 비공개 답');
lesson.command(owner, 'start', { text: '다음 질문', type: 'text' }); assert.equal(lesson.revealed.size, 0); assert.equal(lesson.answers.size, 0);
lesson.command(a, 'answer', { id: 2, answer: '새 답' }); lesson.command(owner, 'reveal-answer', { id: 1, member: 'a' }); assert.equal(lesson.snapshot(b).boards.a.text, undefined);
lesson.command(owner, 'reveal-answer', { id: 2, member: 'a' }); lesson.command(owner, 'reset'); assert.equal(lesson.revealed.size, 0); assert.equal(lesson.answers.size, 0);
console.log('✓ 개별 공개 권한·대상/질문 검증·선택한 답만 전송·늦은 입장·수정 답 비공개·마감 후 공개·중복/만료/초기화');

const capacityClients = new Set(), capacitySent = [];
const capacityLesson = new Learning((c, m) => capacitySent.push(m), () => capacityClients);
for (let i = 0; i < Learning.CAP; i++) {
  const c = { id: String(i), state: {}, room: { place: 'map' } }; capacityClients.add(c);
  capacityLesson.command(c, 'enter', i ? '0000' : '8624'); assert.ok(c.learn); c.room.place = 'learn';
}
const extra = { id: 'extra', state: {}, room: { place: 'map' } }; capacityClients.add(extra);
capacityLesson.command(extra, 'enter', '0000'); assert.equal(extra.learn, undefined); assert.match(capacitySent.at(-1).message, /30명/);
const existing = [...capacityClients][0]; capacityLesson.command(existing, 'enter', '8624'); assert.ok(existing.learn); assert.equal(capacityLesson.full(existing), false);
existing.closed = true; capacityLesson.command(extra, 'enter', '0000'); assert.ok(extra.learn);
console.log('✓ 운영자 포함 30명 허용·31번째 차단·정원 중 기존 입장 유지·퇴장 후 입장 허용');
