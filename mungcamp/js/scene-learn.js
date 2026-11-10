/* 숲속 배움터: 질문은 칠판에, 각자의 답은 멍이 앞 팻말에. */
(function (MC) {
  'use strict';
  const uiText = value => MC.I18n ? MC.I18n.t(value) : value;
  const el = (tag, cls, content) => { const node = document.createElement(tag); if (cls) node.className = cls; if (content != null) node.textContent = content; return node; };
  class LearnGate {
    constructor(net, enter) {
      this.net = net; this.enter = enter;
      this.dialog = el('dialog', 'learn-gate');
      this.dialog.setAttribute('aria-label', '배움터 입장');
      this.dialog.innerHTML = '<form><p class="learn-eyebrow">MUNG CAMP · LEARNING GARDEN</p><h2>숲속 배움터에 가요</h2><p>친구들과 생각을 나누는 작은 교실이에요.<br>안내받은 비밀번호를 입력해 주세요.</p><label for="learnPin">배움터 비밀번호</label><input id="learnPin" type="password" inputmode="numeric" autocomplete="off" maxlength="32" required><p class="learn-error" role="status"></p><div class="learn-gate-actions"><button type="button" data-cancel>돌아가기</button><button type="submit" class="learn-primary">들어가기</button></div></form>';
      const emblem = el('div', 'learn-emblem'); emblem.setAttribute('aria-hidden', 'true');
      emblem.innerHTML = '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8C12 5 6 5 3 7v18c4-2 9-2 13 1 4-3 9-3 13-1V7c-3-2-9-2-13 1Zm0 0v18M7 11c2-.6 4-.4 6 .5M7 15c2-.6 4-.4 6 .5M20 11h5M20 15h5"/><path d="m24 1 .8 2.2L27 4l-2.2.8L24 7l-.8-2.2L21 4l2.2-.8Z" fill="currentColor" stroke="none"/></svg>';
      this.dialog.querySelector('form').prepend(emblem);
      document.body.appendChild(this.dialog);
      this.dialog.querySelector('[data-cancel]').onclick = () => this.close();
      this.dialog.addEventListener('cancel', () => { clearTimeout(this.pending); this.busy(false); });
      this.dialog.querySelector('form').onsubmit = e => {
        e.preventDefault(); this.busy(true); this.message('');
        if (!net.link?.learn?.('enter', this.dialog.querySelector('input').value)) { this.busy(false); this.message('서버에 연결되면 들어갈 수 있어요. 잠시 후 다시 시도해 주세요.'); return; }
        this.pending = setTimeout(() => { this.busy(false); this.message('연결을 확인하고 다시 눌러 주세요.'); }, 7000);
      };
    }
    busy(on) { this.dialog.querySelector('[type="submit"]').disabled = on; }
    message(value) { this.dialog.querySelector('.learn-error').textContent = value; }
    open() { this.message(''); this.busy(false); this.dialog.querySelector('input').value = ''; if (!this.dialog.open) this.dialog.showModal(); this.dialog.querySelector('input').focus(); }
    close() { clearTimeout(this.pending); this.dialog.querySelector('input').value = ''; this.dialog.close(); }
    accept(m) {
      if (!this.dialog.open) return;
      if (m.t === 'learn-access') { clearTimeout(this.pending); this.close(); this.enter(); }
      if (m.t === 'learn-error' || m.t === 'learn-offline') { clearTimeout(this.pending); this.busy(false); this.message(m.message || '연결이 끊겼어요. 다시 연결되면 들어와 주세요.'); }
    }
  }
  class LearnScene {
    constructor({ net }) {
      this.net = net; this.t = 0; this.w = 1; this.h = 1; this.cards = new Map(); this.lesson = null;
      this.pup = new MC.Pup({}); this.pup.x = -1000; this.pup.y = -1000; this.pup.k = 0;
      // 각자의 자리에서 시작하되 바닥 터치·방향키로 자유롭게 걷는다. 답은 위치 메시지에 섞지 않는다.
      this.walk = { x: .5, y: .5, free: false, moving: false, keys: { x: 0, y: 0 }, target: null, peers: new Map() };
      this.crowd = { pup: this.pup, visitors: new Map(), setKeys: (x, y) => this.walkKeys(x, y),
        sync: list => { this.walk.peers = new Map(list.map(peer => [peer.id, peer.s])); }, hitVisitor() { return null; },
        state: () => ({ p: 'learn', x: Math.round(this.walk.x * 1000), y: Math.round(this.walk.y * 1000), q: this.walk.free ? 1 : 0, w: this.walk.moving ? 1 : 0, f: this.pup.flip || 1 }) };
      this.background = new Image(); this.background.onload = () => { this.backdrop = null; }; this.background.src = 'assets/learning-room.svg';
      this.root = el('section', 'learning-room'); this.root.setAttribute('aria-label', '숲속 배움터');
      this.root.innerHTML = '<header class="learn-board"><div class="learn-board-top"><span class="learn-eyebrow">숲속 배움터</span><span class="learn-progress" role="status"></span></div><h2></h2><p class="learn-question-options"></p></header><div class="learn-floor" role="group" aria-label="멍이와 답변 팻말"></div><div class="learn-response"><p class="learn-response-note" role="status"></p><form class="learn-answer-form" hidden><fieldset class="learn-answer-choices"><legend>보기 중 하나를 골라요</legend></fieldset><label class="learn-text-label">내 팻말에 올릴 답<textarea name="answer" maxlength="180" rows="2" placeholder="내 생각을 적어 주세요"></textarea></label><div class="learn-answer-actions"><span>공개 전에는 나만 보여요</span><button type="submit" class="learn-primary">팻말에 놓기</button></div></form><button type="button" class="learn-open-owner" hidden>운영 도구 열기</button><p class="learn-error" role="status"></p></div>';
      document.querySelector('#session').appendChild(this.root);
      this.buildChat();
      this.floor = this.root.querySelector('.learn-floor'); this.form = this.root.querySelector('.learn-answer-form');
      this.buildWalking();
      this.form.onsubmit = e => {
        e.preventDefault(); const q = this.lesson?.question; if (!q) return;
        const answer = q.type === 'choice' ? +(this.form.querySelector('input:checked')?.value ?? -1) : this.form.querySelector('textarea').value;
        this.command('answer', { id: q.id, answer });
      };
      this.owner = el('dialog', 'learn-owner'); this.owner.setAttribute('aria-label', '배움터 운영 도구');
      this.owner.innerHTML = '<div class="learn-owner-head"><div><p class="learn-eyebrow">진행자 전용</p><h2>함께 생각을 나눠요</h2></div><button type="button" data-dismiss aria-label="운영 도구 닫기">×</button></div><p class="learn-owner-count" role="status"></p><div class="learn-live-actions"><button type="button" data-command="close">응답 마감</button><button type="button" data-command="reveal" class="learn-primary">답 공개</button></div><section class="learn-results" aria-label="익명 취합 결과"></section><form class="learn-question-form"><h3>새 질문 만들기</h3><label>질문 유형<select name="type"><option value="choice">객관식</option><option value="text">주관식</option></select></label><label>함께 생각할 질문<textarea name="question" maxlength="240" rows="3" placeholder="예: 오늘 가장 기대되는 일은 무엇인가요?" required></textarea></label><label class="learn-options-label">보기 2~6개<textarea name="options" rows="4" placeholder="보기를 한 줄에 하나씩 적어 주세요" required></textarea></label><p>새 질문을 시작하면 이전 질문의 답은 비워져요.</p><button type="submit" class="learn-primary">질문 시작하기</button></form><p class="learn-owner-error learn-error" role="status"></p>';
      document.body.appendChild(this.owner);
      const reset = el('button', '', '칠판 비우기'); reset.type = 'button'; reset.dataset.command = 'reset';
      this.owner.querySelector('.learn-live-actions').appendChild(reset);
      const clearChat = el('button', 'learn-clear-chat', '대화 기록 지우기'); clearChat.type = 'button';
      clearChat.onclick = () => this.command('clear-chat'); this.owner.querySelector('.learn-results').after(clearChat);
      this.root.querySelector('.learn-open-owner').onclick = () => { this.stopWalking(); this.owner.showModal(); };
      this.owner.querySelector('[data-dismiss]').onclick = () => this.owner.close();
      this.owner.querySelectorAll('[data-command]').forEach(button => { button.onclick = () => this.command(button.dataset.command); });
      const questionForm = this.owner.querySelector('form');
      questionForm.elements.type.onchange = () => {
        const choice = questionForm.elements.type.value === 'choice';
        questionForm.querySelector('.learn-options-label').hidden = !choice; questionForm.elements.options.required = choice;
      };
      questionForm.onsubmit = e => {
        e.preventDefault(); this.starting = true;
        this.command('start', { text: questionForm.elements.question.value, type: questionForm.elements.type.value,
          options: questionForm.elements.options.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean) });
      };
      this.detail = el('dialog', 'learn-detail'); this.detail.setAttribute('aria-label', '팻말 답변 자세히 보기');
      this.detail.innerHTML = '<h2></h2><p></p><button type="button">닫기</button>';
      this.detail.querySelector('button').onclick = () => this.detail.close(); document.body.appendChild(this.detail);
      this.onLanguageChange = () => { if (this.lesson) this.accept(this.lesson); this.updateChatToggle(); this.resizeFloor(); };
      window.addEventListener('mungcamp:languagechange', this.onLanguageChange);
      this.accept(net.learning || { t: 'learn-state', role: net.learnAccess?.role, phase: 'waiting', roster: [], boards: {}, online: 0, answered: 0 });
      this.acceptChat({ t: 'learn-chat', history: true, messages: net.learningChat || [] });
      this.layoutObserver = new ResizeObserver(() => this.resizeFloor());
      this.layoutObserver.observe(this.root.querySelector('.learn-board')); this.layoutObserver.observe(this.root.querySelector('.learn-response'));
    }
    buildChat() {
      this.chatItems = new Map(); this.chatUnread = 0; this.unreadChat = new Set();
      this.chatToggle = el('button', 'learn-chat-toggle', '대화'); this.chatToggle.type = 'button';
      this.chatToggle.setAttribute('aria-controls', 'learnChat'); this.chatToggle.setAttribute('aria-expanded', 'false');
      this.chat = el('aside', 'learn-chat'); this.chat.id = 'learnChat'; this.chat.hidden = true; this.chat.setAttribute('aria-label', '배움터 대화');
      this.chat.innerHTML = '<header class="learn-chat-head"><div><h3>도란도란 대화</h3></div><button type="button" aria-label="대화 닫기">×</button></header><div class="learn-chat-log" role="log" aria-label="친구들과 나누는 대화" aria-live="polite" aria-relevant="additions"></div><p class="learn-chat-empty"></p><form class="learn-chat-form"><label class="learn-chat-label" for="learnChatInput">친구에게 전할 말</label><div><input id="learnChatInput" type="text" maxlength="180" autocomplete="off" enterkeyhint="send" placeholder="함께 이야기해요" required><button type="submit" class="learn-primary">보내기</button></div><p class="learn-chat-error" role="status"></p></form>';
      const chatBody = el('div', 'learn-chat-body');
      this.chat.querySelector('header').after(chatBody);
      chatBody.append(this.chat.querySelector('.learn-chat-log'), this.chat.querySelector('.learn-chat-empty'));
      const tools = el('div', 'learn-chat-tools'); tools.hidden = true;
      this.clearChatButton = el('button', 'learn-chat-clear', '대화 전체 지우기'); this.clearChatButton.type = 'button';
      this.clearChatButton.onclick = () => this.command('clear-chat'); tools.appendChild(this.clearChatButton); chatBody.before(tools);
      this.root.append(this.chatToggle, this.chat);
      this.chatLog = this.chat.querySelector('.learn-chat-log'); this.chatForm = this.chat.querySelector('form');
      this.chatToggle.onclick = () => this.toggleChat(this.chat.hidden);
      this.chat.querySelector('header button').onclick = () => this.toggleChat(false);
      this.chat.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); this.toggleChat(false); this.chatToggle.focus(); } });
      this.chatForm.onsubmit = e => {
        e.preventDefault(); if (this.pendingChat || this.disconnected) return;
        const input = this.chatForm.querySelector('input'), message = input.value;
        if (!message.trim()) return;
        this.chatError(''); this.pendingChat = message; this.chatForm.querySelector('button').disabled = true;
        if (!this.net.link?.learn?.('chat', message)) { this.finishChat(); this.chatError('연결을 확인하고 다시 보내 주세요.'); return; }
        this.chatPendingTimer = setTimeout(() => { this.finishChat(); this.chatError('전송을 확인하지 못했어요. 연결 후 다시 확인해 주세요.'); }, 7000);
      };
    }
    toggleChat(open) {
      this.chat.hidden = !open; this.root.dataset.chatOpen = open;
      this.stopWalking();
      this.chatToggle.setAttribute('aria-expanded', String(open));
      if (open) { this.chatUnread = 0; this.unreadChat.clear(); requestAnimationFrame(() => { this.chatLog.scrollTop = this.chatLog.scrollHeight; }); }
      this.updateChatToggle(); this.resizeFloor();
    }
    updateChatToggle() { this.chatToggle.textContent = this.chat.hidden ? `대화${this.chatUnread ? ' · ' + Math.min(99, this.chatUnread) : ''}` : '대화 접기'; }
    chatError(message) { this.chat.querySelector('.learn-chat-error').textContent = message; }
    finishChat() { clearTimeout(this.chatPendingTimer); this.pendingChat = null; this.chatForm.querySelector('button').disabled = !!this.disconnected; }
    updateChatTools() {
      const owner = this.lesson?.role === 'owner';
      this.chat.querySelector('.learn-chat-tools').hidden = !owner;
      this.clearChatButton.disabled = !!this.disconnected || !this.chatItems.size;
      for (const button of this.chatLog.querySelectorAll('.learn-delete-message')) button.disabled = !!this.disconnected;
    }
    acceptChat(m) {
      if (m.t === 'learn-chat-error') { this.finishChat(); this.chatError(m.message); return; }
      if (m.t === 'learn-chat-delete') {
        this.chatItems.get(m.id)?.remove(); this.chatItems.delete(m.id); this.unreadChat.delete(m.id); this.chatUnread = this.unreadChat.size;
        this.updateChatToggle(); this.updateChatTools(); this.chat.querySelector('.learn-chat-empty').hidden = !!this.chatItems.size; return;
      }
      if (m.t === 'learn-chat-clear') {
        this.chatItems.clear(); this.chatLog.replaceChildren(); this.unreadChat.clear(); this.chatUnread = 0; this.updateChatToggle(); this.updateChatTools();
        this.chat.querySelector('.learn-chat-empty').hidden = false; return;
      }
      const follow = this.chatLog.scrollHeight - this.chatLog.scrollTop - this.chatLog.clientHeight < 48;
      let mine = false;
      for (const message of m.messages || []) {
        if (this.chatItems.has(message.id)) continue;
        const own = message.from === this.net.id, row = el('article', 'learn-chat-message'); row.classList.toggle('is-me', own);
        const meta = el('div', 'learn-chat-meta'), name = el('strong'), author = el('span', '', message.name);
        author.setAttribute('translate', 'no'); name.appendChild(author);
        if (own) name.appendChild(document.createTextNode(' · 나'));
        if (message.role === 'owner') name.appendChild(document.createTextNode(' · 운영자'));
        const stamp = el('time', '', new Date(message.at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })); stamp.dateTime = new Date(message.at).toISOString();
        meta.append(name, stamp); row.append(meta, el('p', '', message.text)); this.chatLog.appendChild(row); this.chatItems.set(message.id, row);
        if (this.lesson?.role === 'owner') {
          const remove = el('button', 'learn-delete-message', '지우기'); remove.type = 'button'; remove.setAttribute('aria-label', message.name + '의 대화 지우기');
          remove.onclick = () => this.command('delete-chat', message.id); row.appendChild(remove);
        }
        if (!m.history && own) {
          mine = true; const input = this.chatForm.querySelector('input');
          if (this.pendingChat === input.value) input.value = ''; this.finishChat();
        } else if (!m.history && this.chat.hidden) this.unreadChat.add(message.id);
      }
      while (this.chatItems.size > 50) { const key = this.chatItems.keys().next().value; this.chatItems.get(key).remove(); this.chatItems.delete(key); this.unreadChat.delete(key); }
      this.chatUnread = this.unreadChat.size; this.updateChatTools();
      this.chat.querySelector('.learn-chat-empty').hidden = !!this.chatItems.size; this.updateChatToggle();
      if (follow || mine || m.history) requestAnimationFrame(() => { this.chatLog.scrollTop = this.chatLog.scrollHeight; });
    }
    command(action, value) {
      this.root.querySelector('.learn-error').textContent = ''; this.owner.querySelector('.learn-error').textContent = '';
      if (!this.net.link?.learn?.(action, value)) this.error('연결이 끊겼어요. 마을로 나가 비밀번호를 입력하고 다시 들어와 주세요.');
    }
    error(message) { this.root.querySelector('.learn-error').textContent = message; this.owner.querySelector('.learn-error').textContent = message; this.resizeFloor(); }
    accept(m) {
      if (['learn-chat', 'learn-chat-error', 'learn-chat-clear', 'learn-chat-delete'].includes(m.t)) { this.acceptChat(m); return; }
      if (m.t === 'learn-error') { this.starting = false; this.error(m.message); return; }
      if (m.t === 'learn-offline' || m.t === 'learn-denied') {
        this.disconnected = true; this.stopWalking(); this.returnSeat.disabled = true; this.error(m.message || '연결이 끊겼어요. 마을로 나가 다시 들어와 주세요.');
        this.owner.close(); for (const input of this.owner.querySelectorAll('input,textarea,select,button')) input.disabled = true;
        this.form.querySelector('[type="submit"]').disabled = true;
        this.finishChat(); this.updateChatTools(); this.chatForm.querySelector('input').disabled = true; this.chatError('연결이 끊겼어요. 마을에서 다시 들어와 주세요.'); return;
      }
      if (m.t !== 'learn-state') return;
      const previous = this.lesson?.question?.id; this.lesson = m;
      const owner = m.role === 'owner', q = m.question, open = m.phase === 'open';
      this.root.dataset.role = m.role; this.root.dataset.phase = m.phase;
      this.root.querySelector('.learn-progress').textContent = `${m.answered}명 제출 · ${m.online}명 참여`;
      this.root.querySelector('h2').setAttribute('translate', q ? 'no' : 'yes');
      this.root.querySelector('.learn-question-options').setAttribute('translate', q?.type === 'choice' ? 'no' : 'yes');
      this.root.querySelector('h2').textContent = q?.text || '';
      this.root.querySelector('.learn-question-options').textContent = '';
      this.root.querySelector('.learn-open-owner').hidden = !owner;
      this.form.hidden = owner || !q || m.phase === 'revealed';
      this.root.querySelector('.learn-response-note').textContent = '';
      if (q && previous !== q.id) {
        this.form.reset(); this.form.querySelector('fieldset').replaceChildren(el('legend', '', '보기 중 하나를 골라요'));
        q.options.forEach((v, i) => {
          const label = el('label', 'learn-choice'), radio = el('input'); radio.type = 'radio'; radio.name = 'choice'; radio.value = i; radio.required = true;
          label.append(radio, el('span', '', `${i + 1}. ${v}`)); this.form.querySelector('fieldset').appendChild(label);
        });
        if (m.own) {
          if (q.type === 'choice') this.form.querySelector(`input[value="${m.own.value}"]`).checked = true;
          else this.form.querySelector('textarea').value = m.own.text;
        }
        if (this.starting) { this.starting = false; this.owner.close(); }
      }
      this.form.querySelector('fieldset').hidden = q?.type !== 'choice';
      this.form.querySelector('.learn-text-label').hidden = q?.type !== 'text';
      this.form.querySelector('textarea').required = q?.type === 'text';
      for (const input of this.form.querySelectorAll('input,textarea,button')) input.disabled = !open;
      this.form.querySelector('[type="submit"]').textContent = m.own ? '답 고쳐 놓기' : '팻말에 놓기';
      this.form.querySelector('.learn-answer-actions span').textContent = m.phase === 'revealed' || m.boards[this.net.id]?.revealed ? '답 공개 완료' : '공개 전에는 나만 보여요';
      this.owner.querySelector('.learn-owner-count').textContent = `${m.answered}명 제출 · ${m.online}명 참여 · ${open ? '응답 받는 중' : m.phase === 'revealed' ? '답 공개 완료' : m.phase === 'closed' ? '응답 마감' : '질문 준비 중'}`;
      this.owner.querySelector('[data-command="close"]').disabled = !open;
      this.owner.querySelector('[data-command="reveal"]').disabled = !['open', 'closed'].includes(m.phase);
      this.owner.querySelector('[data-command="reset"]').disabled = !q;
      const result = this.owner.querySelector('.learn-results'); result.replaceChildren(el('h3', '', '익명 취합 결과'));
      if (!m.summary) result.appendChild(el('p', '', '답 공개 후 선택지별 인원과 주관식 답변을 이름 없이 모아 보여줘요.'));
      else if (!m.summary.length) result.appendChild(el('p', '', '제출된 답이 없어요.'));
      else m.summary.forEach(item => {
        const row = el('div', 'learn-result-row'); row.append(el('span', '', item.text), el('strong', '', `${item.count}명`));
        row.style.setProperty('--answer-share', `${m.answered ? item.count / m.answered * 100 : 0}%`); result.appendChild(row);
      });
      const active = new Set();
      for (const member of m.roster) {
        active.add(member.id); let card = this.cards.get(member.id);
        if (!card) {
          const seat = el('article', 'learn-seat'), canvas = el('canvas', 'learn-pup'), name = el('p', 'learn-seat-name'), sign = el('button', 'learn-sign');
          canvas.width = 280; canvas.height = 220; canvas.setAttribute('aria-hidden', 'true'); sign.type = 'button';
          seat.dataset.id = member.id; seat.append(canvas, name, sign); this.floor.appendChild(seat);
          card = { seat, canvas, name, sign, context: canvas.getContext('2d'), pup: member.id === this.net.id ? this.pup : new MC.Pup({}) }; this.cards.set(member.id, card);
          sign.onclick = () => {
            const board = this.lesson?.boards[member.id];
            if (this.lesson?.role === 'owner' && board?.submitted && !board.text && ['open', 'closed'].includes(this.lesson.phase)) {
              this.stopWalking(); this.command('reveal-answer', { id: this.lesson.question.id, member: member.id }); return;
            }
            const answer = board?.text; if (!answer) return;
            this.stopWalking();
            this.detail.querySelector('h2').textContent = member.name + '의 팻말'; this.detail.querySelector('p').textContent = answer; this.detail.showModal();
          };
        }
        const signature = [member.c, member.h, member.ht, member.ac, member.gl, member.cl].join(':');
        if (card.signature !== signature) { card.pup.setLook(member.c, member.h, member.ht, member.ac, member.gl, member.cl); card.signature = signature; }
        card.name.textContent = member.name + (member.id === this.net.id ? uiText(' · 나') : '') + (member.role === 'owner' ? uiText(' · 운영자') : '');
        const answer = m.boards[member.id]; card.sign.setAttribute('translate', answer?.text ? 'no' : 'yes');
        card.sign.textContent = answer?.text || (answer?.submitted ? '답변 완료' : '');
        const canReveal = owner && answer?.submitted && !answer.text && ['open', 'closed'].includes(m.phase);
        card.sign.hidden = !answer; card.sign.disabled = !!this.disconnected || !answer?.text && !canReveal; card.sign.dataset.answered = !!answer;
        card.sign.dataset.reveal = !!canReveal; card.sign.title = canReveal ? uiText('이 답변만 공개') : answer?.text || '';
        card.seat.classList.toggle('is-me', member.id === this.net.id);
      }
      for (const [id, card] of this.cards) if (!active.has(id)) { card.seat.remove(); this.cards.delete(id); }
      this.arrangeSeats(m.roster); this.updateChatTools(); this.resizeFloor();
    }
    buildWalking() {
      this.returnSeat = el('button', 'learn-return-seat', '내 자리'); this.returnSeat.type = 'button'; this.returnSeat.hidden = true;
      this.returnSeat.onclick = () => {
        const card = this.cards.get(this.net.id); if (!card || this.disconnected) return;
        this.walk.target = { ...card.home, returning: true };
        this.walk.keys = { x: 0, y: 0 }; this.returnSeat.blur();
      }; this.root.appendChild(this.returnSeat);
      this.floor.addEventListener('pointerdown', e => { if (!e.target.closest('button')) this.floorPress = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
      this.floor.addEventListener('pointercancel', () => { this.floorPress = null; });
      this.floor.addEventListener('pointerup', e => {
        const start = this.floorPress; this.floorPress = null;
        if (!start || start.id !== e.pointerId || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 9 || e.target.closest('button') || !this.leaveSeat()) return;
        const box = this.floor.getBoundingClientRect(), size = this.floorSize;
        this.walk.keys = { x: 0, y: 0 };
        this.walk.target = { x: (e.clientX - box.left) / size.width,
          y: (e.clientY - box.top - size.pupHeight * .75) / size.height };
      });
      this.root.addEventListener('focusin', e => { if (e.target.matches('input,textarea,select')) this.stopWalking(); });
    }
    walkHeight() { return this.floorSize?.height || 1; }
    leaveSeat() {
      const card = this.cards.get(this.net.id);
      if (!card || this.disconnected || getComputedStyle(this.floor).visibility === 'hidden') return false;
      if (!this.walk.free) {
        Object.assign(this.walk, card.home); this.walk.free = true;
      }
      return true;
    }
    walkKeys(x, y) {
      if ((x || y) && !this.leaveSeat()) return;
      this.walk.keys = { x, y }; if (x || y) this.walk.target = null;
    }
    stopWalking() { this.walk.keys = { x: 0, y: 0 }; this.walk.target = null; this.walk.moving = false; }
    updateWalking(dt) {
      const walk = this.walk, own = this.cards.get(this.net.id); if (!own) return;
      const size = this.floorSize; if (!size) return;
      const { width, height, seatWidth, seatHeight } = size;
      const half = seatWidth / 2 + 4, low = 4, high = Math.max(low, height - seatHeight - 8);
      const constrain = point => ({ x: MC.clamp(point.x * width, half, width - half) / width, y: MC.clamp(point.y * height, low, high) / height });
      if (walk.free && !this.disconnected) {
        const before = { x: walk.x, y: walk.y }, speed = 145;
        let dx = walk.keys.x, dy = walk.keys.y, distance = Math.hypot(dx, dy), arrived = false;
        if (walk.target) {
          const target = constrain(walk.target); dx = (target.x - walk.x) * width; dy = (target.y - walk.y) * height; distance = Math.hypot(dx, dy);
          arrived = distance <= speed * dt;
        }
        if (distance) { const step = walk.target ? Math.min(speed * dt, distance) : speed * dt; walk.x += dx / distance * step / width; walk.y += dy / distance * step / height; }
        Object.assign(walk, constrain(walk)); walk.moving = Math.hypot((walk.x - before.x) * width, (walk.y - before.y) * height) > .1;
        if (walk.moving && Math.abs(dx) > .1) this.pup.flip = dx < 0 ? -1 : 1;
        if (arrived) { if (walk.target.returning) walk.free = false; walk.target = null; walk.moving = false; }
      }
      for (const [id, card] of this.cards) {
        const st = id === this.net.id ? { q: walk.free, x: walk.x * 1000, y: walk.y * 1000, w: walk.moving, f: this.pup.flip } : walk.peers.get(id);
        const free = !!st?.q; card.seat.classList.toggle('is-roaming', free); card.moving = !!st?.w;
        if (free) {
          const target = { x: MC.clamp(st.x / 1000, 0, 1), y: MC.clamp(st.y / 1000, 0, 1) };
          const at = card.walkPosition || target, a = id === this.net.id ? 1 : 1 - Math.exp(-dt * 10);
          at.x += (target.x - at.x) * a; at.y += (target.y - at.y) * a; card.walkPosition = at;
          const x = MC.clamp(at.x * width, half, width - half), y = MC.clamp(at.y * height, low, high);
          this.positionSeat(card, x, y);
          card.pup.flip = st.f === -1 ? -1 : 1;
        } else { card.walkPosition = null; this.positionSeat(card, card.home.x * width, card.home.y * height); }
      }
      this.returnSeat.hidden = !walk.free;
    }
    positionSeat(card, x, y) {
      const transform = `translate3d(${(x - this.floorSize.seatWidth / 2).toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      if (card.transform === transform) return;
      card.seat.style.transform = transform; card.transform = transform;
      card.seat.style.zIndex = 2 + Math.round(y);
    }
    arrangeSeats(roster) {
      const signature = roster.map(m => m.id).join(':'); if (this.seating === signature) return; this.seating = signature;
      const focused = this.floor.contains(document.activeElement) ? document.activeElement : null;
      this.floor.replaceChildren(...roster.map(member => this.cards.get(member.id).seat)); focused?.focus({ preventScroll: true });
    }
    layoutSeats() {
      const width = Math.max(1, this.floor.clientWidth), height = Math.max(1, this.floor.clientHeight), count = this.cards.size;
      if (!count) return;
      // 인원과 화면 비율에 맞춰 모두 보이는 열 수를 고른다. 크기는 재배치할 때만 읽는다.
      const withSigns = !!this.lesson?.question;
      const dimensions = scale => ({ width: 150 * scale, height: 90 * scale + Math.max(9, 11 * scale) * 1.6 + 7 + (withSigns ? Math.max(24, 50 * scale) : 0) });
      let best = { scale: 0, columns: 1, rows: count };
      for (let columns = 1; columns <= count; columns++) {
        const rows = Math.ceil(count / columns);
        let low = 0, high = Math.max(0, Math.min(1, (width / columns - 12) / 150));
        for (let step = 0; step < 12; step++) { const mid = (low + high) / 2; if (dimensions(mid).height <= height / rows - 12) low = mid; else high = mid; }
        const scale = low;
        if (scale > best.scale) best = { scale, columns, rows };
      }
      const scale = Math.max(.01, best.scale), { width: seatWidth, height: seatHeight } = dimensions(scale), pupHeight = 90 * scale;
      this.floorSize = { width, height, seatWidth, seatHeight, pupHeight };
      this.floor.style.setProperty('--seat-width', seatWidth + 'px'); this.floor.style.setProperty('--seat-height', seatHeight + 'px');
      this.floor.style.setProperty('--pup-width', 115 * scale + 'px'); this.floor.style.setProperty('--pup-height', pupHeight + 'px');
      this.floor.style.setProperty('--seat-font', Math.max(9, 11 * scale) + 'px');
      this.floor.style.setProperty('--sign-height', Math.max(24, 50 * scale) + 'px');
      let index = 0;
      for (const card of this.cards.values()) {
        const row = Math.floor(index / best.columns), column = index % best.columns;
        const rowCount = Math.min(best.columns, count - row * best.columns);
        card.home = { x: (column + .5 + (best.columns - rowCount) / 2) / best.columns,
          y: ((row + .5) * height / best.rows - seatHeight / 2) / height };
        card.transform = null; index++;
      }
      if (this.walk.target?.returning) this.walk.target = { ...this.cards.get(this.net.id).home, returning: true };
      this.updateWalking(0);
    }
    resizeFloor() {
      const response = this.root.querySelector('.learn-response');
      response.hidden = this.form.hidden && this.root.querySelector('.learn-open-owner').hidden && !this.root.querySelector('.learn-error').textContent;
      this.floor.style.top = (this.root.querySelector('header').offsetTop + this.root.querySelector('header').offsetHeight + 16) + 'px';
      this.floor.style.bottom = (response.offsetHeight + 64) + 'px';
      this.root.style.setProperty('--learn-floor-top', this.floor.style.top);
      this.root.style.setProperty('--learn-floor-bottom', this.floor.style.bottom);
      this.layoutSeats();
    }
    resize(w, h, dpr) { this.w = w; this.h = h; this.dpr = dpr; this.drawnBackdrop = null; this.resizeFloor(); }
    update(dt) {
      if (document.hidden) return;
      this.t += dt;
      this.updateWalking(Math.min(.05, dt));
      if (this.root.dataset.chatOpen === 'true' && (this.w < 1000 || this.h <= 600)) return;
      for (const card of this.cards.values()) {
        // 위치는 매 프레임 보간하고, 캐릭터 그림은 정지 8fps·걷기 20fps로 제한한다.
        if (this.t < (card.paintAt || 0)) continue;
        const elapsed = Math.min(.15, this.t - (card.paintedAt || 0)); card.paintedAt = this.t; card.paintAt = this.t + 1 / (card.moving ? 20 : 8);
        const p = card.pup, before = { x: p.x, y: p.y, k: p.k };
        p.x = 140; p.y = 204; p.k = 1.45; p.update(elapsed, { noSleep: true, walking: card.moving });
        const g = card.context; g.clearRect(0, 0, 280, 220); p.draw(g, 1, true); Object.assign(p, before);
      }
    }
    draw(g) {
      if (!this.backdrop || this.backdrop.width !== this.w || this.backdrop.height !== this.h) {
        this.backdrop = document.createElement('canvas'); this.backdrop.width = this.w; this.backdrop.height = this.h;
        const bg = this.backdrop.getContext('2d'); bg.fillStyle = '#344944'; bg.fillRect(0, 0, this.w, this.h);
        if (this.background.complete && this.background.naturalWidth) {
          const z = Math.max(this.w / 1400, this.h / 1000); bg.drawImage(this.background, (this.w - 1400 * z) / 2, 0, 1400 * z, 1000 * z);
        }
      }
      if (this.drawnBackdrop !== this.backdrop) { g.drawImage(this.backdrop, 0, 0); this.drawnBackdrop = this.backdrop; }
    }
    pointerDown() { return false; }
    destroy() { window.removeEventListener('mungcamp:languagechange', this.onLanguageChange); this.layoutObserver.disconnect(); clearTimeout(this.chatPendingTimer); this.root.remove(); this.owner.remove(); this.detail.remove(); this.cards.clear(); this.backdrop = null; this.net.learning = null; this.net.learningChat = []; }
  }
  MC.LearnGate = LearnGate; MC.LearnScene = LearnScene;
})(window.MC = window.MC || {});
