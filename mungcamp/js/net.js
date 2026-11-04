/* 멍캠프 — 함께 있는 사람들
   지금 같은 곳에 있는 다른 사람의 멍이를 보여 준다. 마음 단어(닉네임)와 마을의 네 글자 상태 팻말을 함께 나눈다.

   연결은 있는 것을 쓴다.
   1) <meta name="mc-presence" content="wss://..."> 가 있으면 함께 쓰는 서버 (server/presence.js).
      그 서버가 페이지까지 건넸으면 content="auto" 로 바뀌어 같은 주소로 모인다
   2) Claude 아티팩트로 열렸으면 그 방(room)
   3) 둘 다 없으면 같은 브라우저의 다른 탭끼리만 */
(function (MC) {
  'use strict';

  const SEND_GAP = 0.12; // 움직이는 동안 1초에 8번쯤 알린다
  const BEAT = 2.5; // 탭끼리는 가만히 있어도 가끔 '여기 있어요'
  const STALE = 9; // 이만큼 소식이 없으면 떠난 것으로 본다 (탭끼리)
  const PLACES = ['map', 'fire', 'firetower', 'water', 'forest', 'tent', 'lodge'];
  const KEYS = { p: '', x: 0, y: 0, w: 0, b: 0, t: 0, f: 1, s: 0, q: 0, z: 0, hp: 0, ep: 0, ek: 0, g: null, l: 0, ch: 0, k: 0, m: 0, rl: 0, sg: '', bt: 0, ba: 0, fs: 0, dv: 0 };

  // 처음 온 날 털빛과 모자를 하나 골라 두고 계속 입는다
  function myLook() {
    let look = MC.store.get('look', null);
    if (!look || typeof look.c !== 'number' || typeof look.h !== 'number') {
      const bodies = MC.Pup.BODIES;
      look = { c: bodies[(Math.random() * bodies.length) | 0].i, h: (Math.random() * MC.Pup.HATS) | 0 };
      MC.store.set('look', look);
    }
    for (const slot of ['ht', 'ac', 'gl']) {
      look[slot] = MC.Wardrobe.clean(slot, look[slot]);
      if (!MC.Wardrobe.has(slot, look[slot])) look[slot] = 0;
    }
    return look;
  }

  // 닉네임: 열 글자까지, 보이지 않는 글자와 줄바꿈은 빼고, 험한 말이면 비운다.
  // server/presence.js 에도 같은 규칙이 있다 (받는 쪽에서도 다시 다듬는다)
  const NAME_MAX = 10;
  const BAD_WORDS = [
    '시발', '씨발', '씨빨', '씨팔', '시팔', '쉬발', '슈발', '씨바', 'ㅅㅂ', 'ㅆㅂ', 'ㅄ', 'ㅂㅅ', '병신', '븅신', '빙신',
    '개새', '개색', '개세끼', '새끼', '쌔끼', 'ㅅㄲ', '좆', '조까', '존나', '졸라', '존내', 'ㅈㄴ', 'ㅈㄹ', '지랄',
    '닥쳐', '꺼져', '미친', 'ㅁㅊ', '염병', '엠창', '느금', '니미', '애미', '애비', '섹스', '섹시', '야동', '보지',
    '자지', '강간', '자살', '뒤져', '뒤질', '일베', '틀딱', '찐따', '장애새',
    'fuck', 'shit', 'bitch', 'sex', 'porn', 'dick', 'pussy', 'cunt', 'whore', 'slut', 'rape', 'nigg', 'fagg', 'asshol',
  ];
  function badName(s) {
    const flat = s.toLowerCase().replace(/[\s\p{P}\p{S}\d_]/gu, '');
    return BAD_WORDS.some((w) => flat.includes(w));
  }
  function cleanName(v) {
    if (typeof v !== 'string') return '';
    let s = v.normalize('NFC')
      .replace(/[\p{C}\u115F\u1160\u3164\uFFA0\u2800]/gu, '') // 보이지 않는 글자 (빈칸처럼 보이는 한글 채움 문자 포함)
      .replace(/(\p{M}{2})\p{M}+/gu, '$1') // 겹겹이 쌓은 꾸밈표
      .replace(/\s+/gu, ' ')
      .trim();
    s = Array.from(s).slice(0, NAME_MAX).join('').trim();
    return s && !badName(s) ? s : '';
  }

  // 받은 것은 믿지 않는다: 아는 칸만, 숫자는 범위 안으로
  const cleanSign = (v) => Array.from(cleanName(v)).slice(0, 4).join('').trim();
  function clean(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const num = (v, lo, hi) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null);
    const p = PLACES.indexOf(raw.p) >= 0 ? raw.p : null;
    const x = num(raw.x, -5000, 5000);
    const y = num(raw.y, -5000, 5000);
    if (!p || x == null || y == null) return null;
    const bp = Array.isArray(raw.bp) && typeof raw.bp[0] === 'string' && raw.bp[0].length <= 64 ? [raw.bp[0], num(raw.bp[1], 0, 1e9) | 0] : null;
    const g = Array.isArray(raw.g) && num(raw.g[0], -5000, 5000) != null && num(raw.g[1], -5000, 5000) != null ? [num(raw.g[0], -5000, 5000), num(raw.g[1], -5000, 5000)] : null;
    return {
      p,
      x,
      y,
      w: raw.w ? 1 : 0, // 걷는 중
      b: raw.b ? 1 : 0, // 뒷모습
      t: num(raw.t, -1, 1) || 0, // 고개를 돌린 정도
      f: raw.f === -1 ? -1 : 1, // 왼쪽을 보면 -1
      s: raw.s ? 1 : 0, // 모닥불 곁에서 꼬치를 든 채
      q: raw.q ? 1 : 0, // 그루터기 위
      z: raw.z ? 1 : 0, // 꾸벅꾸벅
      c: num(raw.c, 0, 99) | 0,
      h: num(raw.h, 0, 99) | 0,
      ht: MC.Wardrobe.clean('ht', raw.ht),
      ac: MC.Wardrobe.clean('ac', raw.ac),
      gl: MC.Wardrobe.clean('gl', raw.gl),
      hp: num(raw.hp, 0, 1e9) | 0, // 하트가 몇 번 났는지
      ep: num(raw.ep, 0, 1e9) | 0,
      ek: MC.Emotes.valid(raw.ek),
      bp, // 누구에게 하트를 보냈는지 [그 사람, 몇 번째]
      g, // 걸어가는 중이면 가려는 자리
      l: num(raw.l, 0, 9) | 0, // 침대 몇 번 자리에 엎드려 누웠는지 (0이면 아님)
      ch: raw.ch ? 1 : 0, // 접이식 의자를 펴고 앉아 책을 읽는 중
      k: raw.k ? 1 : 0, // 숙소: 코타츠 속에 들어가 있다
      m: raw.m ? 1 : 0, // 귤을 까먹는 중
      rl: num(raw.rl, -1e6, 1e6) | 0, // 데굴데굴 구른 횟수 (부호는 구른 쪽)
      n: cleanName(raw.n), // 닉네임 (멍이를 눌러야 보인다)
      sg: p === 'map' ? cleanSign(raw.sg) : '',
      bt: p === 'map' && raw.bt ? 1 : 0,
      ba: p === 'map' ? num(raw.ba, -180, 180) || 0 : 0,
      fs: p === 'map' && !raw.w ? num(raw.fs, 0, 2) | 0 : 0,
      dv: p === 'water' && raw.dv ? 1 : 0,
    };
  }

  // ── 연결 방법들 ───────────────────────────────────────
  // 함께 쓰는 서버. 장소마다 방을 나눠 너무 붐비지 않게 한다
  function socketLink(net, url) {
    let ws = null;
    let wait = 1;
    let closed = false;
    const open = () => {
      try {
        ws = new WebSocket(url);
      } catch (e) {
        retry();
        return;
      }
      ws.onopen = () => {
        wait = 1;
        net.online = true;
        if (net.mine.p) ws.send(JSON.stringify({ t: 's', s: net.mine }));
      };
      ws.onmessage = (ev) => {
        let m;
        try {
          m = JSON.parse(ev.data);
        } catch (e) {
          return;
        }
        if (!m || typeof m !== 'object') return;
        if (m.t === 'you' && typeof m.id === 'string') {
          net.id = m.id;
          // 서버에 올라간 사이트의 버전 (다시 배포되면 바뀐다)
          if (typeof m.v === 'string' && m.v.length <= 64 && net.onVersion) net.onVersion(m.v);
        }
        else if (m.t === 'd') {
          // 새 방에 들어가면 방 안의 모두를 한 번에 받는다: 예전 방 사람들은 지운다
          if (m.full) net.clear();
          if (m.j && typeof m.j === 'object') for (const id of Object.keys(m.j)) net.receive(String(id), m.j[id]);
          if (Array.isArray(m.l)) for (const id of m.l) net.drop(String(id));
        } else if (m.t === 'n' && m.c && typeof m.c === 'object') {
          const c = {};
          for (const p of PLACES) c[p] = Math.max(0, Math.min(1e6, m.c[p] | 0));
          net.counts = c;
        }
      };
      ws.onclose = () => {
        net.online = false;
        net.clear();
        if (!closed) retry();
      };
      ws.onerror = () => {};
    };
    const retry = () => {
      setTimeout(open, Math.min(30, wait) * 1000 * (0.7 + Math.random() * 0.6));
      wait *= 2;
    };
    open();
    return {
      kind: 'socket',
      send(st) {
        if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 's', s: st }));
      },
    };
  }

  // Claude 아티팩트의 방: 지금 이 페이지를 보고 있는 사람들
  async function roomLink(net) {
    const C = window.claude;
    if (!C || typeof C.use !== 'function') return null;
    let room = null;
    try {
      room = await C.use('room');
    } catch (e) {
      room = null;
    }
    if (!room) return null;
    const sync = () => {
      const seen = new Set();
      for (const pr of room.peers()) {
        if (pr.kind !== 'viewer') continue;
        if (pr.sameTab) {
          net.id = pr.peer;
          continue;
        }
        if (net.receive(pr.peer, pr.presence)) seen.add(pr.peer);
      }
      for (const id of Array.from(net.peers.keys())) if (!seen.has(id)) net.drop(id);
    };
    // 방에 들어올 수 없는 사람(로그인하지 않았거나 공개 링크로 온 사람)은
    // 혼자 보는 화면으로 두고, 같은 브라우저의 탭끼리만 이어 준다
    let gone = false;
    const lost = () => {
      net.clear();
      net.online = false;
      if (gone) return;
      gone = true;
      // start() 가 방 연결을 다 받아 둔 뒤에 바꾼다
      setTimeout(() => {
        const ch = channelLink(net);
        if (!ch) return;
        net.link = ch;
        net.kind = ch.kind;
        net.hello = true;
        net.flush(true);
      }, 0);
    };
    room.onPeers(sync, lost);
    if (room.onConnection) room.onConnection((on) => { if (!gone) net.online = !!on; }, lost);
    return {
      kind: 'room',
      send(st) {
        room.presence(st).catch(() => {});
      },
    };
  }

  // 같은 브라우저의 다른 탭끼리
  function channelLink(net) {
    let bc = null;
    try {
      bc = new BroadcastChannel('mungcamp-v1');
    } catch (e) {
      return null;
    }
    net.id = 'b' + Math.random().toString(36).slice(2, 10);
    net.online = true;
    const post = (m) => {
      try {
        bc.postMessage(m);
      } catch (e) { /* 닫힘 */ }
    };
    bc.onmessage = (ev) => {
      const m = ev.data;
      if (!m || typeof m !== 'object' || typeof m.id !== 'string' || m.id === net.id || m.id.length > 64) return;
      if (m.bye) {
        net.drop(m.id);
        return;
      }
      if (m.s) net.receive(m.id, m.s);
      if (m.hi && net.mine.p) post({ id: net.id, s: net.mine });
    };
    window.addEventListener('pagehide', () => post({ id: net.id, bye: 1 }));
    return {
      kind: 'channel',
      beat: true,
      send(st, hello) {
        post(hello ? { id: net.id, s: st, hi: 1 } : { id: net.id, s: st });
      },
    };
  }

  // ── 함께 ─────────────────────────────────────────────
  class Net {
    constructor() {
      this.id = null; // 다른 사람이 나를 가리키는 꼬리표 (화면에는 나오지 않는다)
      this.look = myLook();
      this.name = cleanName(MC.store.get('nick', '')); // 처음 들어올 때 지은 닉네임
      this.mine = {};
      this.peers = new Map(); // id → { s, at, n }
      this.counts = null; // 서버가 알려 주는 장소별 사람 수
      this.link = null;
      this.online = false;
      this.sentAt = -99;
      this.dirty = false;
      this.hello = true;
      this.onBoop = null;
      this.onVersion = null;
    }

    async start() {
      const meta = document.querySelector('meta[name="mc-presence"]');
      let url = meta && meta.content;
      // 'auto': 이 페이지를 건네준 서버가 곧 함께 모이는 서버 (server/presence.js)
      if (url === 'auto') url = /^https?:$/.test(location.protocol) ? (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/' : null;
      url = url && /^wss?:\/\//.test(url) ? url : null;
      if (url && 'WebSocket' in window) this.link = socketLink(this, url);
      if (!this.link) this.link = await roomLink(this);
      if (!this.link) this.link = channelLink(this);
      this.kind = this.link ? this.link.kind : 'none';
      this.flush(true);
      return this.kind;
    }

    // 내 상태를 바꾼다. 바뀐 것이 있을 때만 알린다.
    // 방(room)은 받은 칸을 합쳐 두므로 언제나 모든 칸을 함께 보낸다
    set(st) {
      const next = {};
      for (const k of Object.keys(KEYS)) next[k] = st[k] != null ? st[k] : KEYS[k];
      next.c = this.look.c;
      next.h = this.look.h;
      next.ht = this.look.ht;
      next.ac = this.look.ac;
      next.gl = this.look.gl;
      next.n = this.name || '';
      next.bp = this.bp || null;
      let changed = false;
      for (const k of Object.keys(next)) {
        const a = next[k];
        const b = this.mine[k];
        if (Array.isArray(a) || Array.isArray(b) ? !Array.isArray(a) || !Array.isArray(b) || a[0] !== b[0] || a[1] !== b[1] : a !== b) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      this.mine = next;
      this.dirty = true;
      this.flush();
    }

    flush(force) {
      if (!this.link || !this.mine.p) return;
      const now = MC.clock();
      const due = this.dirty && now - this.sentAt >= SEND_GAP;
      const beat = this.link.beat && now - this.sentAt >= BEAT;
      if (!force && !due && !beat) return;
      this.sentAt = now;
      this.dirty = false;
      this.link.send(this.mine, this.hello);
      this.hello = false;
    }

    // 매 프레임: 미뤄 둔 알림을 보내고, 오래 조용한 탭은 보낸다
    tick() {
      this.flush();
      if (this.link && this.link.beat) {
        const now = MC.clock();
        for (const [id, p] of this.peers) if (now - p.at > STALE) this.peers.delete(id);
      }
    }

    receive(id, raw) {
      // 서버는 큰 방의 변경 묶음을 한 번 만들어 모두에게 보낸다. 나는 다른 멍이로 추가하지 않는다.
      if (id === this.id) return false;
      const st = clean(raw);
      if (!st) {
        this.peers.delete(id);
        return false;
      }
      const prev = this.peers.get(id);
      this.peers.set(id, { s: st, at: MC.clock() });
      // 누군가 내 멍이에게 하트를 보냈다
      if (prev && st.bp && this.id && st.bp[0] === this.id && (!prev.s.bp || prev.s.bp[1] !== st.bp[1]) && this.onBoop) this.onBoop(id);
      return true;
    }

    drop(id) {
      this.peers.delete(id);
    }

    clear() {
      this.peers.clear();
    }

    // 닉네임을 정한다 (처음 들어올 때). 다듬은 이름을 돌려준다
    // 꾸미기에서 고른 털빛과 모자. 저장하고, 다음 알림부터 함께 있는 사람들에게도 보인다
    setLook(c, h, ht = 0, ac = 0, gl = 0) {
      this.look = { c: Math.max(0, Math.min(99, c | 0)), h: Math.max(0, Math.min(MC.Pup.HATS - 1, h | 0)) };
      for (const [slot, value] of Object.entries({ ht, ac, gl })) {
        const clean = MC.Wardrobe.clean(slot, value);
        this.look[slot] = MC.Wardrobe.has(slot, clean) ? clean : 0;
      }
      MC.store.set('look', this.look);
      return this.look;
    }

    setName(v) {
      this.name = cleanName(v);
      if (this.mine.p) this.set(Object.assign({}, this.mine));
      return this.name;
    }

    // 다른 사람 멍이에게 하트 보내기
    boop(id) {
      this.boops = (this.boops || 0) + 1;
      this.bp = [id, this.boops];
      this.set(Object.assign({}, this.mine));
    }

    // 이곳에 있는 다른 사람들 (나는 빼고)
    list(place) {
      const out = [];
      for (const [id, p] of this.peers) if (p.s.p === place) out.push({ id, s: p.s });
      return out;
    }

    // 지금 멍캠프 어디에든 있는 사람 수 (나도 포함)
    total() {
      let n = 0;
      for (const p of PLACES) n += this.count(p);
      return n;
    }

    // 이곳에 있는 사람 수 (나도 포함)
    count(place) {
      if (this.counts && this.kind === 'socket') return Math.max(this.counts[place] || 0, this.mine.p === place ? 1 : 0);
      let n = this.mine.p === place ? 1 : 0;
      for (const p of this.peers.values()) if (p.s.p === place) n++;
      return n;
    }
  }

  MC.Net = Net;
  MC.netClean = clean;
  MC.cleanName = cleanName;
  MC.cleanSign = cleanSign;
  MC.badName = (v) => typeof v === 'string' && badName(v.normalize('NFC'));
})(window.MC = window.MC || {});
