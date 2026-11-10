'use strict';
const crypto = require('crypto');
const text = (v, max) => typeof v === 'string' ? Array.from(v.normalize('NFC').replace(/[\p{C}]/gu, ' ').replace(/\s+/g, ' ').trim()).slice(0, max).join('') : '';
const equal = (a, b) => typeof a === 'string' && crypto.timingSafeEqual(crypto.createHash('sha256').update(a).digest(), crypto.createHash('sha256').update(b).digest());

// 질문과 답은 서버에만 둔다. 공개 전에는 본인 답만 전송한다.
module.exports = class Learning {
  static CAP = 30;
  constructor(send, clients) {
    this.send = send; this.clients = clients; this.question = null; this.phase = 'waiting'; this.sequence = 0;
    this.answers = new Map(); this.revealed = new Set(); this.attempts = new Map();
    this.messages = []; this.chatSequence = 0;
    this.memberPin = process.env.LEARN_PIN || '0000'; this.ownerPin = process.env.LEARN_OWNER_PIN || '8624';
  }
  authorized(c) { return c.learn && c.learn.until > Date.now(); }
  members() { return [...this.clients()].filter(c => !c.closed && c.room?.place === 'learn' && this.authorized(c)); }
  full(c) { return !(c.room?.place === 'learn' && this.authorized(c)) && this.members().length >= Learning.CAP; }
  summary() {
    if (!this.question || this.phase !== 'revealed') return null;
    if (this.question.type === 'choice') return this.question.options.map((label, value) => ({ text: label, count: [...this.answers.values()].filter(a => a.value === value).length }));
    const counts = new Map();
    for (const a of this.answers.values()) counts.set(a.text, (counts.get(a.text) || 0) + 1);
    return [...counts].map(([label, count]) => ({ text: label, count })).sort((a, b) => b.count - a.count);
  }
  snapshot(c) {
    const members = this.members(), boards = {};
    for (const member of members) {
      const answer = this.answers.get(member.id);
      if (answer) {
        const revealed = this.revealed.has(member.id), visible = member.id === c.id || revealed || this.phase === 'revealed' && c.learn.role !== 'owner';
        boards[member.id] = visible ? { text: answer.text, submitted: true, revealed } : { submitted: true };
      }
    }
    return { t: 'learn-state', role: c.learn.role, question: this.question, phase: this.phase,
      answered: this.answers.size, online: members.filter(m => m.learn.role === 'member').length, capacity: Learning.CAP,
      own: this.answers.get(c.id) || null, boards, summary: this.summary(),
      roster: members.map(m => ({ id: m.id, name: m.state.n || '멍이', role: m.learn.role,
        c: m.state.c, h: m.state.h, ht: m.state.ht, ac: m.state.ac, gl: m.state.gl, cl: m.state.cl })) };
  }
  publish() { for (const c of this.members()) this.send(c, this.snapshot(c)); }
  chatHistory(c) { if (this.authorized(c) && c.room?.place === 'learn') this.send(c, { t: 'learn-chat', history: true, messages: this.messages }); }
  error(c, message) { this.send(c, { t: 'learn-error', message }); }
  command(c, action, value) {
    if (action === 'enter') {
      const ip = c.ip || c.id, now = Date.now();
      for (const [key, attempt] of this.attempts) if (attempt.until < now) this.attempts.delete(key);
      const attempt = this.attempts.get(ip) || { count: 0, until: now + 600000 };
      if (attempt.count >= 10) return this.error(c, '비밀번호를 여러 번 틀렸어요. 잠시 후 다시 시도해 주세요.');
      const role = equal(value, this.ownerPin) ? 'owner' : equal(value, this.memberPin) ? 'member' : '';
      if (!role) { attempt.count++; this.attempts.set(ip, attempt); return this.error(c, '비밀번호가 맞지 않아요. 다시 입력해 주세요.'); }
      if (this.full(c)) return this.error(c, '배움터 정원 30명이 모두 찼어요. 자리가 나면 다시 들어와 주세요.');
      this.attempts.delete(ip); c.learn = { role, until: now + 8 * 3600000 };
      this.send(c, { t: 'learn-access', role }); return;
    }
    if (!this.authorized(c) || c.room?.place !== 'learn') return this.error(c, '배움터 비밀번호를 입력하고 들어와 주세요.');
    if (action === 'chat') {
      const message = text(value, 180), now = Date.now();
      const fail = message => this.send(c, { t: 'learn-chat-error', message });
      if (!message) return fail('친구들에게 전할 말을 적어 주세요.');
      if (c.learn.chatAt && now - c.learn.chatAt < 1000) return fail('한 박자 쉬고 다시 보내 주세요.');
      c.learn.chatAt = now;
      const item = { id: ++this.chatSequence, from: c.id, name: c.state.n || '멍이', role: c.learn.role, text: message, at: now };
      this.messages.push(item); if (this.messages.length > 50) this.messages.shift();
      for (const member of this.members()) this.send(member, { t: 'learn-chat', messages: [item] });
      return;
    }
    if (action === 'answer') {
      if (c.learn.role !== 'member' || this.phase !== 'open' || value?.id !== this.question?.id) return this.error(c, '지금은 답을 제출할 수 없어요. 현재 질문을 확인해 주세요.');
      let answer;
      if (this.question.type === 'choice') {
        if (!Number.isInteger(value.answer) || !this.question.options[value.answer]) return this.error(c, '보기 중 하나를 골라 주세요.');
        answer = { value: value.answer, text: this.question.options[value.answer] };
      } else {
        const answerText = text(value.answer, 180);
        if (!answerText) return this.error(c, '팻말에 올릴 답을 적어 주세요.');
        answer = { text: answerText };
      }
      // 부분 공개 뒤 고친 답은 다시 비공개로 두어 새 내용을 자동 공개하지 않는다.
      if (this.answers.get(c.id)?.text !== answer.text) this.revealed.delete(c.id);
      this.answers.set(c.id, answer);
    } else {
      if (c.learn.role !== 'owner') return this.error(c, '이 기능은 진행자만 사용할 수 있어요.');
      if (action === 'reveal-answer') {
        if (!['open', 'closed'].includes(this.phase) || value?.id !== this.question?.id || typeof value?.member !== 'string' || !this.answers.has(value.member) || !this.members().some(member => member.id === value.member) || this.revealed.has(value.member)) return;
        this.revealed.add(value.member);
      } else if (action === 'delete-chat') {
        const index = this.messages.findIndex(item => item.id === value);
        if (!Number.isSafeInteger(value) || index < 0) return;
        this.messages.splice(index, 1);
        for (const member of this.members()) this.send(member, { t: 'learn-chat-delete', id: value }); return;
      } else if (action === 'clear-chat') {
        this.messages = []; for (const member of this.members()) this.send(member, { t: 'learn-chat-clear' }); return;
      } else if (action === 'start') {
        const question = text(value?.text, 240), type = value?.type;
        const options = Array.isArray(value?.options) ? value.options.map(o => text(o, 80)) : [];
        if (!question || !['choice', 'text'].includes(type) || type === 'choice' && (options.length < 2 || options.length > 6 || options.some(o => !o) || new Set(options).size !== options.length)) return this.error(c, '질문을 적고, 객관식은 서로 다른 보기 2~6개를 넣어 주세요.');
        this.question = { id: ++this.sequence, text: question, type, options: type === 'choice' ? options : [] };
        this.answers.clear(); this.revealed.clear(); this.phase = 'open';
      } else if (action === 'close' && this.phase === 'open') this.phase = 'closed';
      else if (action === 'reveal' && ['open', 'closed'].includes(this.phase)) this.phase = 'revealed';
      else if (action === 'reset') { this.question = null; this.answers.clear(); this.revealed.clear(); this.phase = 'waiting'; }
      else return;
    }
    this.publish();
  }
};
