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
      // 교실에서는 지정된 자리에 앉는다. 위치 메시지에 답안을 섞지 않는다.
      this.crowd = { pup: this.pup, visitors: new Map(), setKeys() {}, sync() {}, hitVisitor() { return null; },
        state: () => ({ p: 'learn', x: 500, y: 500, w: 0 }) };
      this.background = new Image(); this.background.src = 'assets/learning-room.svg';
      this.root = el('section', 'learning-room'); this.root.setAttribute('aria-label', '숲속 배움터');
      this.root.innerHTML = '<header class="learn-board"><div class="learn-board-top"><span class="learn-eyebrow">숲속 배움터</span><span class="learn-progress" role="status"></span></div><h2>오늘은 어떤 생각을 나눌까요?</h2><p class="learn-question-options"></p></header><div class="learn-floor" role="group" aria-label="멍이와 답변 팻말"></div><div class="learn-response"><p class="learn-response-note" role="status">운영자가 질문을 준비하고 있어요.</p><form class="learn-answer-form" hidden><fieldset class="learn-answer-choices"><legend>보기 중 하나를 골라요</legend></fieldset><label class="learn-text-label">내 팻말에 올릴 답<textarea name="answer" maxlength="180" rows="2" placeholder="내 생각을 적어 주세요"></textarea></label><div class="learn-answer-actions"><span>공개 전에는 나만 보여요</span><button type="submit" class="learn-primary">팻말에 놓기</button></div></form><button type="button" class="learn-open-owner" hidden>운영 도구 열기</button><p class="learn-error" role="status"></p></div>';
      document.querySelector('#session').appendChild(this.root);
      this.floor = this.root.querySelector('.learn-floor'); this.form = this.root.querySelector('.learn-answer-form');
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
      this.root.querySelector('.learn-open-owner').onclick = () => this.owner.showModal();
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
    }
    command(action, value) {
      this.root.querySelector('.learn-error').textContent = ''; this.owner.querySelector('.learn-error').textContent = '';
      if (!this.net.link?.learn?.(action, value)) this.error('연결이 끊겼어요. 마을로 나가 비밀번호를 입력하고 다시 들어와 주세요.');
    }
    error(message) { this.root.querySelector('.learn-error').textContent = message; this.owner.querySelector('.learn-error').textContent = message; }
    accept(m) {
      if (m.t === 'learn-error') { this.starting = false; this.error(m.message); return; }
      if (m.t === 'learn-offline' || m.t === 'learn-denied') {
        this.disconnected = true; this.error('연결이 끊겼어요. 마을로 나가 다시 들어와 주세요.');
        this.owner.close(); for (const input of this.owner.querySelectorAll('input,textarea,select,button')) input.disabled = true;
        this.form.querySelector('[type="submit"]').disabled = true; return;
      }
      if (m.t !== 'learn-state') return;
      const previous = this.lesson?.question?.id, previousAnswer = this.lesson?.own?.text;
      const firstSeat = !this.cards.has(this.net.id); this.lesson = m;
      const owner = m.role === 'owner', q = m.question, open = m.phase === 'open';
      this.root.dataset.role = m.role; this.root.dataset.phase = m.phase;
      this.root.querySelector('.learn-progress').textContent = `${m.answered}명 제출 · ${m.online}명 참여`;
      this.root.querySelector('h2').textContent = q?.text || '오늘은 어떤 생각을 나눌까요?';
      this.root.querySelector('.learn-question-options').textContent = q?.type === 'choice' ? q.options.map((v, i) => `${i + 1}. ${v}`).join('  ·  ') : q ? '주관식 · 내 생각을 자유롭게 적어요' : '운영자의 질문을 기다리며 편하게 앉아 있어요';
      this.root.querySelector('.learn-open-owner').hidden = !owner;
      this.form.hidden = owner || !q || m.phase === 'revealed';
      this.root.querySelector('.learn-response-note').textContent = owner ? '답 공개 후 이름 없이 취합한 결과를 볼 수 있어요.' : m.phase === 'waiting' ? '운영자가 질문을 준비하고 있어요.' : m.phase === 'revealed' ? '모두의 생각이 팻말에 펼쳐졌어요!' : m.phase === 'closed' ? '응답을 마쳤어요. 운영자가 곧 답을 공개해요.' : m.own ? '내 팻말에 놓았어요. 마감 전에는 고칠 수 있어요.' : '생각을 적어 내 멍이 앞 팻말에 놓아 주세요.';
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
            this.detail.querySelector('h2').textContent = member.name + '의 팻말'; this.detail.querySelector('p').textContent = answer; this.detail.showModal();
          };
        }
        const signature = [member.c, member.h, member.ht, member.ac, member.gl].join(':');
        if (card.signature !== signature) { card.pup.setLook(member.c, member.h, member.ht, member.ac, member.gl); card.signature = signature; }
        card.name.textContent = member.name + (member.id === this.net.id ? ' · 나' : '') + (member.role === 'owner' ? ' · 운영자' : '');
        const answer = m.boards[member.id]; card.sign.textContent = answer?.text || (member.role === 'owner' ? '함께 생각해 봐요' : answer?.submitted ? m.phase === 'revealed' ? '답변 완료' : '답변 완료 · 공개 대기' : '생각하고 있어요');
        card.sign.disabled = !answer?.text; card.sign.dataset.answered = !!answer; card.sign.title = answer?.text || '';
        card.seat.classList.toggle('is-me', member.id === this.net.id);
      }
      for (const [id, card] of this.cards) if (!active.has(id)) { card.seat.remove(); this.cards.delete(id); }
      this.resizeFloor();
      if (firstSeat || m.own?.text && previousAnswer !== m.own.text) requestAnimationFrame(() => {
        const seat = this.cards.get(this.net.id)?.seat;
        if (seat && (seat.offsetTop < this.floor.scrollTop || seat.offsetTop + seat.offsetHeight > this.floor.scrollTop + this.floor.clientHeight)) this.floor.scrollTop = Math.max(0, seat.offsetTop - (this.floor.clientHeight - seat.offsetHeight) / 2);
      });
    }
    resizeFloor() {
      this.floor.style.top = (this.root.querySelector('header').offsetTop + this.root.querySelector('header').offsetHeight + 16) + 'px';
      this.floor.style.bottom = (this.root.querySelector('.learn-response').offsetHeight + 34) + 'px';
    }
    resize(w, h, dpr) { this.w = w; this.h = h; this.dpr = dpr; this.resizeFloor(); }
    update(dt) {
      this.t += dt;
      if (this.t < (this.paintAt || 0)) return; this.paintAt = this.t + 1 / 20;
      const floor = this.floor.getBoundingClientRect();
      for (const card of this.cards.values()) {
        const box = card.canvas.getBoundingClientRect(); if (box.bottom < floor.top || box.top > floor.bottom) continue;
        const p = card.pup, before = { x: p.x, y: p.y, k: p.k };
        p.x = 140; p.y = 204; p.k = 1.45; p.update(Math.min(.1, dt * 3), { noSleep: true });
        const g = card.canvas.getContext('2d'); g.clearRect(0, 0, 280, 220); p.draw(g, 1, true); Object.assign(p, before);
      }
    }
    draw(g) {
      g.fillStyle = '#d6c5a1'; g.fillRect(0, 0, this.w, this.h);
      if (this.background.complete && this.background.naturalWidth) {
        const z = Math.max(this.w / 1400, this.h / 1000); g.drawImage(this.background, (this.w - 1400 * z) / 2, 0, 1400 * z, 1000 * z);
      }
    }
    pointerDown() { return false; }
    destroy() { this.root.remove(); this.owner.remove(); this.detail.remove(); this.cards.clear(); this.net.learning = null; }
  }
  MC.LearnGate = LearnGate; MC.LearnScene = LearnScene;
})(window.MC = window.MC || {});
