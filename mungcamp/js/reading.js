/* 앉아 있을 때 펼치는 작은 책장. 마지막으로 펼친 쪽을 기기에 기억한다. */
(function (MC) {
  'use strict';

  class Reading {
    constructor({ canRead, onOpen, onClose }) {
      this.canRead = canRead;
      this.onOpen = onOpen;
      this.onClose = onClose;
      this.dialog = document.querySelector('#bookReader');
      this.launch = document.querySelector('#readBtn');
      this.shelf = document.querySelector('#bookShelf');
      this.page = document.querySelector('#bookPage');
      this.title = document.querySelector('#bookTitle');
      this.content = document.querySelector('#bookContent');
      this.position = document.querySelector('#bookPosition');
      this.back = document.querySelector('#bookBack');
      this.prev = document.querySelector('#bookPrev');
      this.next = document.querySelector('#bookNext');
      this.story = null;
      this.at = 0;
      this.progress = {};
      const saved = MC.store.get('reading', {});
      for (const story of MC.stories) {
        const n = saved && saved[story.id];
        if (Number.isInteger(n) && n >= 0 && n < story.pages.length) this.progress[story.id] = n;
      }
      this.launch.addEventListener('click', () => this.open());
      document.querySelector('#bookClose').addEventListener('click', () => this.close());
      this.back.addEventListener('click', () => this.showShelf());
      this.prev.addEventListener('click', () => this.turn(-1));
      this.next.addEventListener('click', () => this.turn(1));
      this.dialog.addEventListener('cancel', e => { e.preventDefault(); this.close(); });
      this.dialog.addEventListener('click', e => {
        const r = this.dialog.getBoundingClientRect();
        if (e.target === this.dialog && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) this.close();
      });
      this.dialog.addEventListener('keydown', e => {
        // 책 속 방향키는 쪽만 넘긴다. 뒤의 멍이는 걷거나 의자를 접지 않는다.
        if (this.story && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault();
          this.turn(e.key === 'ArrowLeft' ? -1 : 1);
        }
      });
      this.dialog.addEventListener('close', () => {
        document.body.classList.remove('is-reading');
        this.onClose();
      });
    }

    get isOpen() { return this.dialog.open; }

    sync() {
      const seated = this.canRead();
      if (this.launch.hidden === seated) this.launch.hidden = !seated;
      if (!seated && this.isOpen) this.close();
    }

    open() {
      if (!this.canRead() || this.isOpen) return;
      this.onOpen();
      this.showShelf(false);
      document.body.classList.add('is-reading');
      this.dialog.showModal();
      this.shelf.querySelector('button').focus({ preventScroll: true });
    }

    close() {
      if (this.isOpen) this.dialog.close();
    }

    showShelf(focus = true) {
      const lastId = this.story && this.story.id;
      this.story = null;
      this.title.setAttribute('translate', 'yes');
      this.title.textContent = '잠깐, 한 편';
      this.page.hidden = true;
      this.shelf.hidden = false;
      this.back.hidden = true;
      this.shelf.replaceChildren();
      MC.stories.forEach((story, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'book-pick';
        b.dataset.story = story.id;
        b.style.setProperty('--book-color', story.color);
        const cover = document.createElement('span');
        cover.className = 'book-cover';
        cover.setAttribute('aria-hidden', 'true');
        cover.textContent = String(i + 1).padStart(2, '0');
        const info = document.createElement('span');
        info.className = 'book-info';
        const title = document.createElement('strong');
        title.textContent = story.title;
        const desc = document.createElement('span');
        desc.className = 'book-description';
        desc.textContent = story.description;
        const mark = document.createElement('span');
        mark.className = 'book-bookmark';
        const n = this.progress[story.id];
        mark.textContent = n == null ? `처음 펼치기 · ${story.pages.length}쪽` : `이어서 읽기 · ${n + 1} / ${story.pages.length}쪽`;
        info.append(title, desc, mark);
        b.append(cover, info);
        b.addEventListener('click', () => this.read(story));
        this.shelf.append(b);
      });
      if (focus) (Array.from(this.shelf.children).find(b => b.dataset.story === lastId) || this.shelf.firstElementChild).focus({ preventScroll: true });
      this.shelf.scrollTop = 0;
    }

    read(story) {
      this.story = story;
      this.at = this.progress[story.id] || 0;
      this.title.setAttribute('translate', 'no');
      this.title.textContent = story.title;
      this.shelf.hidden = true;
      this.page.hidden = false;
      this.back.hidden = false;
      this.renderPage();
    }

    turn(step) {
      if (!this.story) return;
      const n = Math.max(0, Math.min(this.story.pages.length - 1, this.at + step));
      if (n === this.at) return;
      this.at = n;
      this.renderPage();
    }

    renderPage() {
      this.content.replaceChildren();
      for (const text of this.story.pages[this.at].split(/\n\s*\n/)) {
        const p = document.createElement('p');
        p.textContent = text.trim();
        this.content.append(p);
      }
      if (this.at === this.story.pages.length - 1) {
        const end = document.createElement('p');
        end.className = 'book-end';
        end.textContent = '이야기 끝';
        this.content.append(end);
      }
      this.position.textContent = `${this.at + 1} / ${this.story.pages.length}쪽`;
      this.prev.disabled = this.at === 0;
      this.next.disabled = this.at === this.story.pages.length - 1;
      this.content.scrollTop = 0;
      this.progress[this.story.id] = this.at;
      MC.store.set('reading', this.progress);
      this.content.focus({ preventScroll: true });
    }
  }

  MC.Reading = Reading;
})(window.MC);
