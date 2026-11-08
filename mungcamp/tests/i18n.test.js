'use strict';
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function app(initial, unavailable = false) {
  const saved = new Map([['mungcamp.language', initial]]);
  const document = { title: '멍캠프 · 새 버전', readyState: 'loading', addEventListener() {}, documentElement: {},
    querySelectorAll: () => [], body: { nodeType: 0 } };
  const context = vm.createContext({ document, CustomEvent: class {},
    localStorage: { getItem: key => { if (unavailable) throw Error('blocked'); return saved.get(key); },
      setItem: (key, value) => { if (unavailable) throw Error('blocked'); saved.set(key, value); } } });
  context.window = context; context.dispatchEvent = () => {};
  for (const name of ['locale-pt-BR.js', 'i18n.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', name), 'utf8'), context);
  return { i18n: context.MC.I18n, saved, document };
}
const { i18n, saved, document } = app('pt-BR');
assert.equal(i18n.t('배움터'), 'Sala de aula');
assert.equal(i18n.t('3명 제출 · 12명 참여'), '3 respostas · 12 participantes');
assert.equal(i18n.t('3명 제출 · 12명 참여 · 응답 마감'), '3 respostas · 12 participantes · Encerrar respostas');
assert.equal(i18n.t('보물이 다시 차오르는 중 · 1시간 뒤에 열어요'), 'O tesouro está se renovando · Abra em 1 hora');
assert.equal(i18n.t('꽃구름님이 나를 응원해주고 있어요!'), '꽃구름 está torcendo por você!');
assert.equal(i18n.t('내가 쓴 글은 그대로'), '내가 쓴 글은 그대로');
i18n.setLanguage('ko');
assert.equal(i18n.t('배움터'), '배움터');
assert.equal(saved.get('mungcamp.language'), 'ko');
assert.equal(document.documentElement.lang, 'ko');
assert.equal(document.title, '멍캠프 · 새 버전');
i18n.setLanguage('pt-BR'); assert.equal(document.title, 'Mung Camp · 새 버전');
i18n.setLanguage('ko');
i18n.setLanguage('invalid'); assert.equal(i18n.getLanguage(), 'ko');
const blocked = app('pt-BR', true).i18n;
assert.equal(blocked.getLanguage(), 'ko'); blocked.setLanguage('pt-BR');
assert.equal(blocked.t('배움터'), 'Sala de aula');
console.log('✓ language persistence, templates, content fallback and unavailable storage');
