/* Translate interface text without rebuilding forms or changing shared content. */
(function (MC) {
  'use strict';
  const key = 'mungcamp.language', dictionary = MC.Portuguese || {};
  const pageTitle = typeof document !== 'undefined' && document.title || '멍캠프';
  let language = 'ko';
  try { if (localStorage.getItem(key) === 'pt-BR') language = 'pt-BR'; } catch (_) {}
  const numeric = new Set(['n', 'count', 'answered', 'online', 'here', 'all', 'seconds']);
  const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function compile(source, value) {
    const names = [], parts = source.split(/(\{\w+\})/).map(part => {
      if (!/^\{\w+\}$/.test(part)) return escape(part);
      const name = part.slice(1, -1); names.push(name); return numeric.has(name) ? '(\\d+)' : '(.+?)';
    });
    return { pattern: new RegExp('^' + parts.join('') + '$'), names, value };
  }
  const templates = Object.keys(dictionary).filter(source => /\{\w+\}/.test(source)).map(source => compile(source, dictionary[source]));
  const originals = Object.fromEntries(Object.entries(dictionary).map(([source, value]) => [value, source]));
  const reverseTemplates = Object.keys(dictionary).filter(source => /\{\w+\}/.test(source)).map(source => compile(dictionary[source], source));
  function original(source) {
    const text = source.trim(); let result = Object.prototype.hasOwnProperty.call(originals, text) ? originals[text] : undefined;
    if (result === undefined) {
      for (const template of reverseTemplates) {
        const match = text.match(template.pattern); if (!match) continue;
        const values = Object.fromEntries(template.names.map((name, i) => [name,
          ['state', 'time', 'item', 'region', 'animal'].includes(name) ? original(match[i + 1]) : match[i + 1]]));
        result = template.value.replace(/\{(\w+)\}/g, (_, name) => values[name]); break;
      }
    }
    return result === undefined ? source : source.slice(0, source.indexOf(text)) + result + source.slice(source.indexOf(text) + text.length);
  }
  function t(source) {
    if (language !== 'pt-BR' || typeof source !== 'string') return source;
    const text = source.trim();
    let result = Object.prototype.hasOwnProperty.call(dictionary, text) ? dictionary[text] : null;
    if (result === null) {
      for (const template of templates) {
        const match = text.match(template.pattern); if (!match) continue;
        const values = Object.fromEntries(template.names.map((name, i) => [name,
          ['state', 'time', 'item', 'region', 'animal'].includes(name) ? t(match[i + 1]) : match[i + 1]]));
        result = template.value.replace(/\{(\w+)\}/g, (_, name) => values[name]); break;
      }
    }
    return result === null ? source : source.slice(0, source.indexOf(text)) + result + source.slice(source.indexOf(text) + text.length);
  }
  // These nodes contain content supplied by people, rather than interface copy.
  const protectedContent = '[translate="no"],script,style,textarea,[data-language-picker],.name-tag,.learn-seat-name,.learn-chat-message>p,.learn-choice span,.learn-result-row>span,.learn-detail h2,.learn-detail p,.owner-text,.owner-meta,#bookContent,.book-info>strong,.book-description,.pg-friends>span,.pg-side-name,.race-roster>li>span';
  const textState = new WeakMap(), attributeState = new WeakMap();
  function updateText(node) {
    if (!node.parentElement || node.parentElement.closest(protectedContent)) return;
    const current = node.nodeValue, previous = textState.get(node);
    const source = previous && current === previous.output ? previous.source : original(current);
    const output = t(source); textState.set(node, { source, output });
    if (current !== output) node.nodeValue = output;
  }
  function updateAttributes(element) {
    if (element.closest('[translate="no"],[data-language-picker]')) return;
    const states = attributeState.get(element) || {};
    for (const name of ['title', 'aria-label', 'placeholder', 'data-short']) {
      const current = element.getAttribute(name); if (current === null) continue;
      const previous = states[name], source = previous && current === previous.output ? previous.source : original(current);
      const output = t(source); states[name] = { source, output };
      if (current !== output) element.setAttribute(name, output);
    }
    attributeState.set(element, states);
  }
  function apply(scope = document.body) {
    if (scope.nodeType === 3) { updateText(scope); return; }
    if (scope.nodeType !== 1) return;
    updateAttributes(scope);
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node; while ((node = walker.nextNode())) {
      if (node.nodeType === 3) updateText(node); else updateAttributes(node);
    }
  }
  function setLanguage(next) {
    if (!['ko', 'pt-BR'].includes(next)) return;
    language = next;
    try { localStorage.setItem(key, next); } catch (_) {}
    document.documentElement.lang = next;
    document.title = pageTitle.replace(/^멍캠프(?=$| ·)/, t('멍캠프'));
    document.querySelectorAll('[data-language-select]').forEach(select => { select.value = next; });
    apply();
    window.dispatchEvent(new CustomEvent('mungcamp:languagechange', { detail: next }));
  }
  function init() {
    document.querySelectorAll('[data-language-select]').forEach(select => {
      select.addEventListener('change', () => setLanguage(select.value));
    });
    setLanguage(language);
    new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData') updateText(record.target);
        else if (record.type === 'attributes') updateAttributes(record.target);
        else record.addedNodes.forEach(node => apply(node));
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ['title', 'aria-label', 'placeholder', 'data-short'] });
  }
  MC.I18n = { t, apply, setLanguage, getLanguage: () => language };
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window.MC = window.MC || {});
