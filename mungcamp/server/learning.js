'use strict';
const crypto = require('crypto');
const text = (v, max) => typeof v === 'string' ? Array.from(v.normalize('NFC').replace(/[\p{C}]/gu, ' ').replace(/\s+/g, ' ').trim()).slice(0, max).join('') : '';
const equal = (a, b) => typeof a === 'string' && crypto.timingSafeEqual(crypto.createHash('sha256').update(a).digest(), crypto.createHash('sha256').update(b).digest());

// 질문과 답은 서버에만 둔다. 공개 전에는 본인 답만 전송한다.
module.exports = class Learning {
  constructor(send, clients) {
    this.send = send; this.clients = clients; this.question = null; this.phase = 'waiting'; this.sequence = 0;
    this.answers = new Map(); this.attempts = new Map();
    this.memberPin = process.env.LEARN_PIN || '0000'; this.ownerPin = process.env.LEARN_OWNER_PIN || '8624';
  }
  authorized(c) { return c.learn && c.learn.until > Date.now(); }
  members() { return [...this.clients()].filter(c => !c.closed && c.room?.place === 'learn' && this.authorized(c)); }
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
      if (answer) boards[member.id] = member.id === c.id || this.phase === 'revealed' && c.learn.role !== 'owner' ? { text: answer.text, submitted: true } : { submitted: true };
    }
    return { t: 'learn-state', role: c.learn.role, question: this.question, phase: this.phase,
      answered: this.answers.size, online: members.filter(m => m.learn.role === 'member').length,
      own: this.answers.get(c.id) || null, boards, summary: this.summary(),
      roster: members.map(m => ({ id: m.id, name: m.state.n || '멍이', role: m.learn.role,
        c: m.state.c, h: m.state.h, ht: m.state.ht, ac: m.state.ac, gl: m.state.gl })) };
  }
  publish() { for (const c of this.members()) this.send(c, this.snapshot(c)); }
  error(c, message) { this.send(c, { t: 'learn-error', message }); }
  command(c, action, value) {
    if (action === 'enter') {
      const ip = c.ip || c.id, now = Date.now();
      for (const [key, attempt] of this.attempts) if (attempt.until < now) this.attempts.delete(key);
      const attempt = this.attempts.get(ip) || { count: 0, until: now + 600000 };
      if (attempt.count >= 10) return this.error(c, '비밀번호를 여러 번 틀렸어요. 잠시 후 다시 시도해 주세요.');
      const role = equal(value, this.ownerPin) ? 'owner' : equal(value, this.memberPin) ? 'member' : '';
      if (!role) { attempt.count++; this.attempts.set(ip, attempt); return this.error(c, '비밀번호가 맞지 않아요. 다시 입력해 주세요.'); }
      if (this.members().length >= 100 && c.room?.place !== 'learn') return this.error(c, '배움터에 백 명이 모였어요. 잠시 후 다시 와 주세요.');
      this.attempts.delete(ip); c.learn = { role, until: now + 8 * 3600000 };
      this.send(c, { t: 'learn-access', role }); return;
    }
    if (!this.authorized(c) || c.room?.place !== 'learn') return this.error(c, '배움터 비밀번호를 입력하고 들어와 주세요.');
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
      this.answers.set(c.id, answer);
    } else {
      if (c.learn.role !== 'owner') return this.error(c, '운영자만 질문을 진행할 수 있어요.');
      if (action === 'start') {
        const question = text(value?.text, 240), type = value?.type;
        const options = Array.isArray(value?.options) ? value.options.map(o => text(o, 80)) : [];
        if (!question || !['choice', 'text'].includes(type) || type === 'choice' && (options.length < 2 || options.length > 6 || options.some(o => !o) || new Set(options).size !== options.length)) return this.error(c, '질문을 적고, 객관식은 서로 다른 보기 2~6개를 넣어 주세요.');
        this.question = { id: ++this.sequence, text: question, type, options: type === 'choice' ? options : [] };
        this.answers.clear(); this.phase = 'open';
      } else if (action === 'close' && this.phase === 'open') this.phase = 'closed';
      else if (action === 'reveal' && ['open', 'closed'].includes(this.phase)) this.phase = 'revealed';
      else if (action === 'reset') { this.question = null; this.answers.clear(); this.phase = 'waiting'; }
      else return;
    }
    this.publish();
  }
};
