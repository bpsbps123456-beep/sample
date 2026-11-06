/* 숲속 배움터: 질문은 칠판에, 각자의 답은 멍이 앞 팻말에. */
(function (MC) {
  'use strict';
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
      // 둥근 자리에서 시작하되 바닥 터치·방향키로 자유롭게 걷는다. 답은 위치 메시지에 섞지 않는다.
      this.walk = { x: .5, y: .5, free: false, moving: false, keys: { x: 0, y: 0 }, target: null, peers: new Map() };
      this.crowd = { pup: this.pup, visitors: new Map(), setKeys: (x, y) => this.walkKeys(x, y),
        sync: list => { this.walk.peers = new Map(list.map(peer => [peer.id, peer.s])); }, hitVisitor() { return null; },
        state: () => ({ p: 'learn', x: Math.round(this.walk.x * 1000), y: Math.round(this.walk.y * 1000), q: this.walk.free ? 1 : 0, w: this.walk.moving ? 1 : 0, f: this.pup.flip || 1 }) };
      this.background = new Image(); this.background.src = 'assets/learning-room.svg';
      this.root = el('section', 'learning-room'); this.root.setAttribute('aria-label', '숲속 배움터');
      this.root.innerHTML = '<header class="learn-board"><div class="learn-board-top"><span class="learn-eyebrow">숲속 배움터</span><span class="learn-progress" role="status"></span></div><h2>오늘은 어떤 생각을 나눌까요?</h2><p class="learn-question-options"></p></header><div class="learn-floor" role="group" aria-label="멍이와 답변 팻말"></div><div class="learn-response"><p class="learn-response-note" role="status">서로의 생각에 천천히 귀 기울여요.</p><form class="learn-answer-form" hidden><fieldset class="learn-answer-choices"><legend>보기 중 하나를 골라요</legend></fieldset><label class="learn-text-label">내 팻말에 올릴 답<textarea name="answer" maxlength="180" rows="2" placeholder="내 생각을 적어 주세요"></textarea></label><div class="learn-answer-actions"><span>공개 전에는 나만 보여요</span><button type="submit" class="learn-primary">팻말에 놓기</button></div></form><button type="button" class="learn-open-owner" hidden>운영 도구 열기</button><p class="learn-error" role="status"></p></div>';
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
      this.accept(net.learning || { t: 'learn-state', role: net.learnAccess?.role, phase: 'waiting', roster: [], boards: {}, online: 0, answered: 0 });
      this.acceptChat({ t: 'learn-chat', history: true, messages: net.learningChat || [] });
    }
    buildChat() {
      this.chatItems = new Map(); this.chatUnread = 0; this.unreadChat = new Set();
      this.chatToggle = el('button', 'learn-chat-toggle', '대화'); this.chatToggle.type = 'button';
      this.chatToggle.setAttribute('aria-controls', 'learnChat'); this.chatToggle.setAttribute('aria-expanded', 'false');
      this.chat = el('aside', 'learn-chat'); this.chat.id = 'learnChat'; this.chat.hidden = true; this.chat.setAttribute('aria-label', '배움터 대화');
      this.chat.innerHTML = '<header class="learn-chat-head"><div><h3>도란도란 대화</h3><p>배움터에 함께 있는 친구들이 봐요</p></div><button type="button" aria-label="대화 닫기">×</button></header><div class="learn-chat-log" role="log" aria-label="친구들과 나누는 대화" aria-live="polite" aria-relevant="additions"></div><p class="learn-chat-empty">반가운 인사로 대화를 시작해 보세요.</p><form class="learn-chat-form"><label class="learn-chat-label" for="learnChatInput">친구에게 전할 말</label><div><input id="learnChatInput" type="text" maxlength="180" autocomplete="off" enterkeyhint="send" placeholder="함께 이야기해요" required><button type="submit" class="learn-primary">보내기</button></div><p class="learn-chat-error" role="status"></p></form>';
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
        const meta = el('div', 'learn-chat-meta'), name = el('strong', '', message.name + (own ? ' · 나' : '') + (message.role === 'owner' ? ' · 운영자' : ''));
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
    error(message) { this.root.querySelector('.learn-error').textContent = message; this.owner.querySelector('.learn-error').textContent = message; }
    accept(m) {
      if (['learn-chat', 'learn-chat-error', 'learn-chat-clear', 'learn-chat-delete'].includes(m.t)) { this.acceptChat(m); return; }
      if (m.t === 'learn-error') { this.starting = false; this.error(m.message); return; }
      if (m.t === 'learn-offline' || m.t === 'learn-denied') {
        this.disconnected = true; this.stopWalking(); this.returnSeat.disabled = true; this.error('연결이 끊겼어요. 마을로 나가 다시 들어와 주세요.');
        this.owner.close(); for (const input of this.owner.querySelectorAll('input,textarea,select,button')) input.disabled = true;
        this.form.querySelector('[type="submit"]').disabled = true;
        this.finishChat(); this.updateChatTools(); this.chatForm.querySelector('input').disabled = true; this.chatError('연결이 끊겼어요. 마을에서 다시 들어와 주세요.'); return;
      }
      if (m.t !== 'learn-state') return;
      const previous = this.lesson?.question?.id, previousAnswer = this.lesson?.own?.text;
      const firstSeat = !this.cards.has(this.net.id); this.lesson = m;
      const owner = m.role === 'owner', q = m.question, open = m.phase === 'open';
      this.root.dataset.role = m.role; this.root.dataset.phase = m.phase;
      this.root.querySelector('.learn-progress').textContent = `${m.answered}명 제출 · ${m.online}명 참여`;
      this.root.querySelector('h2').textContent = q?.text || '오늘은 어떤 생각을 나눌까요?';
      this.root.querySelector('.learn-question-options').textContent = q?.type === 'choice' ? q.options.map((v, i) => `${i + 1}. ${v}`).join('  ·  ') : q ? '주관식 · 내 생각을 자유롭게 적어요' : '질문을 기다리며 편하게 앉아요';
      this.root.querySelector('.learn-open-owner').hidden = !owner;
      this.form.hidden = owner || !q || m.phase === 'revealed';
      this.root.querySelector('.learn-response-note').textContent = owner ? '답 공개 후 이름 없이 취합한 결과를 볼 수 있어요.' : m.phase === 'waiting' ? '바닥을 톡 누르거나 방향키로 자유롭게 걸어요.' : m.phase === 'revealed' ? '모두의 생각이 팻말에 펼쳐졌어요!' : m.phase === 'closed' ? '응답을 마쳤어요. 곧 함께 답을 살펴봐요.' : m.own ? '내 팻말에 놓았어요. 마감 전에는 고칠 수 있어요.' : '생각을 적어 내 멍이 앞 팻말에 놓아 주세요.';
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
      this.form.querySelector('.learn-answer-actions span').textContent = m.phase === 'revealed' ? '답 공개 완료' : '공개 전에는 나만 보여요';
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
          card = { seat, canvas, name, sign, pup: member.id === this.net.id ? this.pup : new MC.Pup({}) }; this.cards.set(member.id, card);
          sign.onclick = () => {
            const answer = this.lesson?.boards[member.id]?.text; if (!answer) return;
            this.stopWalking();
            this.detail.querySelector('h2').textContent = member.name + '의 팻말'; this.detail.querySelector('p').textContent = answer; this.detail.showModal();
          };
        }
        const signature = [member.c, member.h, member.ht, member.ac, member.gl, member.cl].join(':');
        if (card.signature !== signature) { card.pup.setLook(member.c, member.h, member.ht, member.ac, member.gl, member.cl); card.signature = signature; }
        card.name.textContent = member.name + (member.id === this.net.id ? ' · 나' : '') + (member.role === 'owner' ? ' · 운영자' : '');
        const answer = m.boards[member.id]; card.sign.textContent = answer?.text || (member.role === 'owner' ? '함께 생각해 봐요' : answer?.submitted ? m.phase === 'revealed' ? '답변 완료' : '답변 완료 · 공개 대기' : '생각하고 있어요');
        card.sign.disabled = !answer?.text; card.sign.dataset.answered = !!answer; card.sign.title = answer?.text || '';
        card.seat.classList.toggle('is-me', member.id === this.net.id);
      }
      for (const [id, card] of this.cards) if (!active.has(id)) { card.seat.remove(); this.cards.delete(id); }
      this.arrangeSeats(m.roster); this.updateChatTools(); this.resizeFloor();
      if (firstSeat || m.own?.text && previousAnswer !== m.own.text) requestAnimationFrame(() => {
        this.showMySeat();
      });
    }
    buildWalking() {
      this.returnSeat = el('button', 'learn-return-seat', '둥근 자리로 돌아가기'); this.returnSeat.type = 'button'; this.returnSeat.hidden = true;
      this.returnSeat.onclick = () => {
        const card = this.cards.get(this.net.id); if (!card || this.disconnected) return;
        const circle = card.seat.parentElement, step = parseFloat(getComputedStyle(circle).getPropertyValue('--circle-step'));
        this.walk.target = { x: (circle.offsetLeft + parseFloat(card.seat.style.getPropertyValue('--seat-x')) / 100 * circle.clientWidth) / this.floor.clientWidth,
          y: (circle.offsetTop + parseFloat(card.seat.style.getPropertyValue('--seat-row')) * step) / this.walkHeight(), returning: true };
        this.walk.keys = { x: 0, y: 0 }; this.returnSeat.blur();
      }; this.root.appendChild(this.returnSeat);
      this.floor.addEventListener('pointerdown', e => { if (!e.target.closest('button')) this.floorPress = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
      this.floor.addEventListener('pointercancel', () => { this.floorPress = null; });
      this.floor.addEventListener('pointerup', e => {
        const start = this.floorPress; this.floorPress = null;
        if (!start || start.id !== e.pointerId || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 9 || e.target.closest('button') || !this.leaveSeat()) return;
        const box = this.floor.getBoundingClientRect(), seat = this.cards.get(this.net.id).seat;
        this.walk.keys = { x: 0, y: 0 };
        this.walk.target = { x: (e.clientX - box.left) / this.floor.clientWidth,
          y: (e.clientY - box.top + this.floor.scrollTop - seat.querySelector('canvas').clientHeight * .75) / this.walkHeight() };
      });
      this.root.addEventListener('focusin', e => { if (e.target.matches('input,textarea,select')) this.stopWalking(); });
    }
    walkHeight() {
      const circles = this.floor.querySelectorAll('.learn-circle'), last = circles[circles.length - 1];
      return Math.max(this.floor.clientHeight, last ? last.offsetTop + last.offsetHeight + 72 : 1);
    }
    leaveSeat() {
      const card = this.cards.get(this.net.id);
      if (!card || this.disconnected || getComputedStyle(this.floor).visibility === 'hidden') return false;
      if (!this.walk.free) {
        const box = card.seat.getBoundingClientRect(), floor = this.floor.getBoundingClientRect();
        this.walk.x = (box.left - floor.left + box.width / 2) / this.floor.clientWidth;
        this.walk.y = (box.top - floor.top + this.floor.scrollTop) / this.walkHeight(); this.walk.free = true;
      }
      return true;
    }
    walkKeys(x, y) {
      if ((x || y) && !this.leaveSeat()) return;
      this.walk.keys = { x, y }; if (x || y) this.walk.target = null;
    }
    stopWalking() { this.walk.keys = { x: 0, y: 0 }; this.walk.target = null; this.walk.moving = false; }
    showMySeat() {
      const seat = this.cards.get(this.net.id)?.seat; if (!seat) return;
      const box = seat.getBoundingClientRect(), floor = this.floor.getBoundingClientRect();
      if (box.top < floor.top || box.bottom > floor.bottom) this.floor.scrollTop += box.top - floor.top - (floor.height - box.height) / 2;
    }
    updateWalking(dt) {
      const walk = this.walk, own = this.cards.get(this.net.id); if (!own) return;
      const width = Math.max(1, this.floor.clientWidth), height = this.walkHeight();
      const half = own.seat.offsetWidth / 2 + 4, low = 4, high = Math.max(low, height - own.seat.offsetHeight - 8);
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
      if (this.t < (this.walkPaintAt || 0)) return; this.walkPaintAt = this.t + 1 / 20;
      const geometry = new Map([...this.cards].map(([id, card]) => [id, { width: card.seat.offsetWidth, height: card.seat.offsetHeight, left: card.seat.parentElement.offsetLeft, top: card.seat.parentElement.offsetTop }]));
      for (const [id, card] of this.cards) {
        const st = id === this.net.id ? { q: walk.free, x: walk.x * 1000, y: walk.y * 1000, w: walk.moving, f: this.pup.flip } : walk.peers.get(id);
        const free = !!st?.q; card.seat.classList.toggle('is-roaming', free); card.moving = !!st?.w;
        if (free) {
          const target = { x: MC.clamp(st.x / 1000, 0, 1), y: MC.clamp(st.y / 1000, 0, 1) };
          const at = card.walkPosition || target, a = id === this.net.id ? 1 : 1 - Math.exp(-dt * 10);
          at.x += (target.x - at.x) * a; at.y += (target.y - at.y) * a; card.walkPosition = at;
          const box = geometry.get(id), x = MC.clamp(at.x * width, box.width / 2 + 4, width - box.width / 2 - 4), y = MC.clamp(at.y * height, 4, height - box.height - 8);
          card.seat.style.left = (x - box.left) + 'px'; card.seat.style.top = (y - box.top) + 'px'; card.seat.style.zIndex = 2 + Math.round(at.y * 1000);
          card.pup.flip = st.f === -1 ? -1 : 1;
        } else if (card.walkPosition) { card.walkPosition = null; card.seat.style.removeProperty('left'); card.seat.style.removeProperty('top'); card.seat.style.removeProperty('z-index'); }
      }
      this.returnSeat.hidden = !walk.free;
      if (walk.moving) this.showMySeat();
    }
    arrangeSeats(roster) {
      const signature = roster.map(m => m.id).join(':'); if (this.seating === signature) return; this.seating = signature;
      const focused = this.floor.contains(document.activeElement) ? document.activeElement : null;
      const places = {
        1: [[50, 0]], 2: [[18, 0], [82, 0]], 3: [[50, 0], [18, 1], [82, 1]],
        4: [[25, 0], [75, 0], [25, 1], [75, 1]],
        5: [[30, 0], [70, 0], [16, 1], [84, 1], [50, 2]],
        6: [[30, 0], [70, 0], [16, 1], [84, 1], [30, 2], [70, 2]]
      };
      const circles = [], count = Math.ceil(roster.length / 6);
      for (let groupIndex = 0, offset = 0; groupIndex < count; groupIndex++) {
        const size = Math.floor(roster.length / count) + (groupIndex < roster.length % count ? 1 : 0);
        const group = roster.slice(offset, offset + size), circle = el('div', 'learn-circle'), center = el('div', 'learn-circle-center'); offset += size;
        circle.dataset.count = group.length; circle.style.setProperty('--circle-rows', Math.max(...places[group.length].map(p => p[1])));
        circle.setAttribute('role', 'group'); circle.setAttribute('aria-label', `도란도란 자리 ${circles.length + 1}`);
        center.setAttribute('aria-hidden', 'true'); center.innerHTML = '<span>도란도란<small>서로의 생각을 들어요</small></span>'; circle.appendChild(center);
        group.forEach((member, i) => {
          const seat = this.cards.get(member.id).seat, [x, row] = places[group.length][i];
          seat.style.setProperty('--seat-x', x + '%'); seat.style.setProperty('--seat-row', row); circle.appendChild(seat);
        }); circles.push(circle);
      }
      this.floor.replaceChildren(...circles); focused?.focus({ preventScroll: true });
    }
    resizeFloor() {
      this.floor.style.top = (this.root.querySelector('header').offsetTop + this.root.querySelector('header').offsetHeight + 16) + 'px';
      this.floor.style.bottom = (this.root.querySelector('.learn-response').offsetHeight + 34) + 'px';
      this.root.style.setProperty('--learn-floor-top', this.floor.style.top);
      this.root.style.setProperty('--learn-floor-bottom', this.floor.style.bottom);
    }
    resize(w, h, dpr) { this.w = w; this.h = h; this.dpr = dpr; this.resizeFloor(); }
    update(dt) {
      this.t += dt;
      this.updateWalking(Math.min(.05, dt));
      if (this.t < (this.paintAt || 0)) return; this.paintAt = this.t + 1 / 20;
      const floor = this.floor.getBoundingClientRect();
      for (const card of this.cards.values()) {
        const box = card.canvas.getBoundingClientRect(); if (box.bottom < floor.top || box.top > floor.bottom) continue;
        const p = card.pup, before = { x: p.x, y: p.y, k: p.k };
        p.x = 140; p.y = 204; p.k = 1.45; p.update(Math.min(.1, dt * 3), { noSleep: true, walking: card.moving });
        const g = card.canvas.getContext('2d'); g.clearRect(0, 0, 280, 220); p.draw(g, 1, true); Object.assign(p, before);
      }
    }
    draw(g) {
      g.fillStyle = '#344944'; g.fillRect(0, 0, this.w, this.h);
      if (this.background.complete && this.background.naturalWidth) {
        const z = Math.max(this.w / 1400, this.h / 1000); g.drawImage(this.background, (this.w - 1400 * z) / 2, 0, 1400 * z, 1000 * z);
      }
    }
    pointerDown() { return false; }
    destroy() { clearTimeout(this.chatPendingTimer); this.root.remove(); this.owner.remove(); this.detail.remove(); this.cards.clear(); this.net.learning = null; this.net.learningChat = []; }
  }
  MC.LearnGate = LearnGate; MC.LearnScene = LearnScene;
})(window.MC = window.MC || {});
