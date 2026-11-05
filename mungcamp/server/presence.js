#!/usr/bin/env node
/* 멍캠프 — 함께 있는 사람들 서버 (의존성 없음, Node 18+)

   하는 일: 같은 장소에 있는 사람들끼리 서로의 멍이 자리를 나눠 준다.
   함께 모이기에서는 닉네임(열 글자)과 마을 상태 팻말(네 글자)을 받는다. 모든 것은 메모리에만 있고 연결이 끊기면 사라진다.
   따로, 건의함(server/suggest.js)이 사람들이 보낸 건의를 받아 운영자만 보게 남긴다.

   - 장소(map, fire, firetower, water, forest, tent, lodge)마다 방을 나누고, 한 방이 차면 다음 방을 연다
     (모닥불·바다·숲은 ROOM_CAP=100, 글램핑 텐트 안과 숙소는 TENT_CAP=40, 마을은 MAP_CAP=200).
     넉넉히 함께 머물고, 정원이 찬 뒤 들어오는 사람만 새 방으로 간다. 기존 사람을 내보내지 않는다.
   - 받은 값은 아는 칸만, 숫자는 범위 안으로 다듬고, 너무 잦은 메시지는 버린다.
   - 바뀐 것만 모아서 1초에 TICK_HZ번 보낸다. 장소별 사람 수는 2초마다.

   사이트 파일(index.html, js, css …)도 함께 건네준다. 그래서 이 서버 하나만 올리면
   그 주소로 들어온 누구나, 로그인 없이, 서로의 멍이를 본다.

   실행:  PORT=8787 node server/presence.js   → http://localhost:8787/
   따로 둔 정적 사이트에 붙일 때: index.html 의 <meta name="mc-presence" content="wss://내-주소/">
   웹소켓만 쓰려면 STATIC=0 */
'use strict';

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const suggest = require('./suggest');
const Playground = require('./playground');
const Learning = require('./learning');
const playgroundRules = require('../js/playground-rules');

const PORT = +(process.env.PORT || 8787);
// 붐비는 정도는 이용자가 보고 머물거나 이동한다. 정원은 서버 보호용 상한이다.
const ROOM_CAP = +(process.env.ROOM_CAP || 100);
const MAP_CAP = +(process.env.MAP_CAP || 200);
const TENT_CAP = +(process.env.TENT_CAP || 40);
const MAX_CLIENTS = +(process.env.MAX_CLIENTS || 20000);
const TICK_HZ = 8;
const PLACES = ['map', 'fire', 'firetower', 'water', 'forest', 'tent', 'lodge', 'playground', 'learn'];
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const MAX_FRAME = 8192;

// ── 받은 값 다듬기 (js/net.js 의 clean 과 같은 규칙) ─────────
function num(v, lo, hi) {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null;
}
// 닉네임: js/net.js 와 같은 규칙 (열 글자, 보이지 않는 글자 빼기, 험한 말이면 비우기)
const NAME_MAX = 10;
const BAD_WORDS = [
  '시발', '씨발', '씨빨', '씨팔', '시팔', '쉬발', '슈발', '씨바', 'ㅅㅂ', 'ㅆㅂ', 'ㅄ', 'ㅂㅅ', '병신', '븅신', '빙신',
  '개새', '개색', '개세끼', '새끼', '쌔끼', 'ㅅㄲ', '좆', '조까', '존나', '졸라', '존내', 'ㅈㄴ', 'ㅈㄹ', '지랄',
  '닥쳐', '꺼져', '미친', 'ㅁㅊ', '염병', '엠창', '느금', '니미', '애미', '애비', '섹스', '섹시', '야동', '보지',
  '자지', '강간', '자살', '뒤져', '뒤질', '일베', '틀딱', '찐따', '장애새',
  'fuck', 'shit', 'bitch', 'sex', 'porn', 'dick', 'pussy', 'cunt', 'whore', 'slut', 'rape', 'nigg', 'fagg', 'asshol',
];
function cleanName(v) {
  if (typeof v !== 'string' || v.length > 200) return '';
  let s = v.normalize('NFC')
    .replace(/[\p{C}\u115F\u1160\u3164\uFFA0\u2800]/gu, '')
    .replace(/(\p{M}{2})\p{M}+/gu, '$1')
    .replace(/\s+/gu, ' ')
    .trim();
  s = Array.from(s).slice(0, NAME_MAX).join('').trim();
  const flat = s.toLowerCase().replace(/[\s\p{P}\p{S}\d_]/gu, '');
  return s && !BAD_WORDS.some((w) => flat.includes(w)) ? s : '';
}

function clean(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const p = PLACES.includes(raw.p) ? raw.p : null;
  const x = num(raw.x, -5000, 5000);
  const y = num(raw.y, -5000, 5000);
  if (!p || x == null || y == null) return null;
  const bp = Array.isArray(raw.bp) && typeof raw.bp[0] === 'string' && raw.bp[0].length <= 64 ? [raw.bp[0], num(raw.bp[1], 0, 1e9) | 0] : null;
  const gx = Array.isArray(raw.g) ? num(raw.g[0], -5000, 5000) : null;
  const gy = Array.isArray(raw.g) ? num(raw.g[1], -5000, 5000) : null;
  return {
    p,
    x: Math.round(x),
    y: Math.round(y),
    w: raw.w ? 1 : 0,
    b: raw.b ? 1 : 0,
    t: Math.round((num(raw.t, -1, 1) || 0) * 100) / 100,
    f: raw.f === -1 ? -1 : 1,
    s: raw.s ? 1 : 0,
    q: raw.q ? 1 : 0,
    z: raw.z ? 1 : 0,
    c: num(raw.c, 0, 99) | 0,
    h: num(raw.h, 0, 99) | 0,
    // 낚시 옷장: 모자 4종, 액세서리·장갑 각 3종. 모르는 번호는 기본 모습으로.
    ht: Number.isInteger(raw.ht) && raw.ht >= 0 && raw.ht <= 4 ? raw.ht : 0,
    ac: Number.isInteger(raw.ac) && raw.ac >= 0 && raw.ac <= 3 ? raw.ac : 0,
    gl: Number.isInteger(raw.gl) && raw.gl >= 0 && raw.gl <= 3 ? raw.gl : 0,
    hp: num(raw.hp, 0, 1e9) | 0,
    ep: num(raw.ep, 0, 1e9) | 0,
    ek: Number.isInteger(raw.ek) && raw.ek >= 1 && raw.ek <= 6 ? raw.ek : 0,
    bp,
    g: gx != null && gy != null ? [Math.round(gx), Math.round(gy)] : null,
    l: num(raw.l, 0, 9) | 0,
    ch: raw.ch ? 1 : 0,
    k: raw.k ? 1 : 0,
    m: raw.m ? 1 : 0,
    rl: num(raw.rl, -1e6, 1e6) | 0,
    n: cleanName(raw.n),
    sg: p === 'map' ? Array.from(cleanName(raw.sg)).slice(0, 4).join('').trim() : '',
    bt: p === 'map' && raw.bt ? 1 : 0,
    ba: p === 'map' ? Math.round(num(raw.ba, -180, 180) || 0) : 0,
    fs: p === 'map' && !raw.w ? num(raw.fs, 0, 2) | 0 : 0,
    dv: p === 'water' && raw.dv ? 1 : 0,
    hd: p === 'playground' && raw.hd ? 1 : 0,
  };
}

// ── 방 ─────────────────────────────────────────────────
// rooms: place → [{ id, members: Set<client>, changed: Map<id, state>, left: Set<id> }]
const rooms = new Map(PLACES.map((p) => [p, []]));
let roomSeq = 0;
const clients = new Set();
const learning = new Learning(send, () => clients);

function joinRoom(c, place) {
  const list = rooms.get(place);
  // 가장 붐비지만 아직 자리가 있는 방: 사람들이 흩어지지 않고 모이도록
  let room = null;
  // 실내는 야외보다 낮은 정원을 둔다.
  const cap = place === 'learn' ? 100 : place === 'map' ? MAP_CAP : place === 'tent' || place === 'lodge' ? TENT_CAP : ROOM_CAP;
  for (const r of list) if (r.members.size < cap && (!room || r.members.size > room.members.size)) room = r;
  if (!room) {
    room = { id: ++roomSeq, place, members: new Set(), changed: new Map(), left: new Set() };
    list.push(room);
  }
  room.members.add(c);
  c.room = room;
  if (place === 'playground') {
    if (!room.game) room.game = new Playground(room, send);
    send(c, room.game.snapshot());
  }
  // 새로 온 사람에게는 방 안의 모두를 한 번에
  const all = {};
  for (const m of room.members) if (m !== c && m.state && (!room.game || room.game.canSee(c, m))) all[m.id] = m.state;
  send(c, { t: 'd', j: all, l: [], full: 1 });
  room.changed.set(c.id, c.state);
  room.left.delete(c.id);
  if (place === 'learn') learning.publish();
}

function leaveRoom(c) {
  const room = c.room;
  if (!room) return;
  room.members.delete(c);
  if (room.game) room.game.leave(c);
  room.changed.delete(c.id);
  room.left.add(c.id);
  c.room = null;
  if (room.place === 'learn') { c.learn = null; learning.publish(); }
  if (room.members.size === 0) {
    const list = rooms.get(room.place);
    const i = list.indexOf(room);
    if (i >= 0) list.splice(i, 1);
  }
}

// 바뀐 것만 모아서 방마다 보낸다
setInterval(() => {
  for (const list of rooms.values()) {
    for (const room of list) {
      if (room.game) room.game.tick(Date.now());
      const privateView = room.game?.mode === 'hide' && ['ready', 'playing'].includes(room.game.phase);
      // 숨는 위치는 화면에서만 지우지 않고 수신자별로 서버에서 제외한다.
      // 정지한 멍이도 술래의 시야 진입·이탈과 함께 갱신하고, 종료 시 모두 복원한다.
      if (privateView || room.privateView) {
        for (const viewer of room.members) {
          const visible = {};
          for (const subject of room.members) if (subject !== viewer && subject.state && (!privateView || room.game.canSee(viewer, subject))) visible[subject.id] = subject.state;
          send(viewer, { t: 'd', j: visible, l: [], full: 1 });
        }
        room.privateView = privateView;
        room.changed.clear(); room.left.clear();
        continue;
      }
      if (!room.changed.size && !room.left.size) continue;
      const j = {};
      for (const [id, st] of room.changed) j[id] = st;
      const l = Array.from(room.left);
      room.changed.clear();
      room.left.clear();
      // 큰 방도 JSON과 웹소켓 프레임은 한 번만 만든다. 내 상태는 수신 쪽에서 제외한다.
      if (room.members.size === 1 && !l.length) {
        const only = room.members.values().next().value;
        if (Object.keys(j).every(id => id === only.id)) continue;
      }
      const data = frame(JSON.stringify({ t: 'd', j, l }));
      for (const m of room.members) sendFrame(m, data);
    }
  }
}, 1000 / TICK_HZ);

// 배구 물리는 60회 갱신하고, 상태 전송은 게임에서 초당 20회로 제한한다.
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.get('playground') || []) if (room.game?.mode === 'volley') room.game.tick(now);
}, 1000 / 60).unref();

// 장소별 사람 수
setInterval(() => {
  const c = {};
  for (const [place, list] of rooms) c[place] = list.reduce((n, r) => n + r.members.size, 0);
  const data = frame(JSON.stringify({ t: 'n', c }));
  for (const cl of clients) sendFrame(cl, data);
}, 2000);

// ── 웹소켓 (RFC 6455, 텍스트 프레임만) ─────────────────────
function frame(text) {
  const data = Buffer.from(text, 'utf8');
  const n = data.length;
  let head;
  if (n < 126) {
    head = Buffer.from([0x81, n]);
  } else if (n < 65536) {
    head = Buffer.alloc(4);
    head[0] = 0x81;
    head[1] = 126;
    head.writeUInt16BE(n, 2);
  } else {
    head = Buffer.alloc(10);
    head[0] = 0x81;
    head[1] = 127;
    head.writeBigUInt64BE(BigInt(n), 2);
  }
  return Buffer.concat([head, data]);
}

function sendRaw(c, text) {
  sendFrame(c, frame(text));
}

function sendFrame(c, data) {
  if (c.closed) return;
  // 느린 연결이 쌓이면 끊는다 (메모리 보호)
  if (c.socket.writableLength > 256 * 1024) {
    close(c);
    return;
  }
  c.socket.write(data);
}

function send(c, obj) {
  sendRaw(c, JSON.stringify(obj));
}

function close(c, code = 1000) {
  if (c.closed) return;
  c.closed = true;
  leaveRoom(c);
  clients.delete(c);
  try {
    const b = Buffer.alloc(4);
    b[0] = 0x88;
    b[1] = 2;
    b.writeUInt16BE(code, 2);
    c.socket.end(b);
  } catch (e) { /* 이미 닫힘 */ }
  setTimeout(() => c.socket.destroy(), 1000).unref();
}

function onMessage(c, text) {
  // 1초에 20번 넘게 보내면 버린다
  const now = Date.now();
  if (now - c.windowAt > 1000) {
    c.windowAt = now;
    c.count = 0;
  }
  if (++c.count > 20) return;
  let m;
  try {
    m = JSON.parse(text);
  } catch (e) {
    return;
  }
  if (!m) return;
  if (m.t === 'learn') { learning.command(c, m.action, m.value); return; }
  if (m.t === 'pg') {
    if (c.room && c.room.game) c.room.game.command(c, m.action, m.value);
    return;
  }
  if (m.t !== 's') return;
  const st = clean(m.s);
  if (!st) return;
  if (st.p === 'learn' && (!learning.authorized(c) || c.room?.place !== 'learn' && learning.members().length >= 100)) {
    send(c, { t: 'learn-denied', message: '비밀번호를 입력하고 배움터에 들어와 주세요.' }); return;
  }
  if (st.p === 'playground') {
    // 새 장소 입장 후부터는 지형과 이동 속도를 서버에서도 확인한다.
    if (c.room && c.room.game) c.room.game.move(c, st, now);
    else if (!playgroundRules.valid(st.x, st.y)) Object.assign(st, playgroundRules.spawn(0));
  }
  c.state = st;
  if (!c.room || c.room.place !== st.p) {
    leaveRoom(c);
    joinRoom(c, st.p);
  } else {
    c.room.changed.set(c.id, st);
  }
}

function onData(c, chunk) {
  c.buf = c.buf.length ? Buffer.concat([c.buf, chunk]) : chunk;
  if (c.buf.length > MAX_FRAME * 4) {
    close(c, 1009);
    return;
  }
  while (c.buf.length >= 2) {
    const b0 = c.buf[0];
    const b1 = c.buf[1];
    const fin = (b0 & 0x80) !== 0;
    const op = b0 & 0x0f;
    const masked = (b1 & 0x80) !== 0;
    let len = b1 & 0x7f;
    let off = 2;
    if (len === 126) {
      if (c.buf.length < 4) return;
      len = c.buf.readUInt16BE(2);
      off = 4;
    } else if (len === 127) {
      close(c, 1009);
      return;
    }
    if (!masked || len > MAX_FRAME || !fin) {
      close(c, 1002);
      return;
    }
    if (c.buf.length < off + 4 + len) return;
    const mask = c.buf.subarray(off, off + 4);
    const data = Buffer.alloc(len);
    for (let i = 0; i < len; i++) data[i] = c.buf[off + 4 + i] ^ mask[i & 3];
    c.buf = c.buf.subarray(off + 4 + len);
    c.seen = Date.now();
    if (op === 0x1) onMessage(c, data.toString('utf8'));
    else if (op === 0x8) {
      close(c);
      return;
    } else if (op === 0x9) {
      // ping → pong
      const head = Buffer.from([0x8a, data.length]);
      if (!c.closed && data.length < 126) c.socket.write(Buffer.concat([head, data]));
    }
  }
}

// ── 사이트 파일 ───────────────────────────────────────────
// mungcamp/ 폴더의 파일을 그대로 건넨다. 정해 둔 종류만, 숨김 파일과 server/ 는 빼고.
// 한 번 읽은 파일은 gzip 까지 해서 메모리에 둔다 (배포하면 프로세스가 새로 뜬다)
const STATIC = process.env.STATIC !== '0';
const ROOT = path.resolve(__dirname, '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
};
const HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
};
const files = new Map();

// 지금 올라간 사이트의 지문: 파일 내용으로 만든다. 다시 배포해 내용이 바뀌면 달라지고,
// 그러면 열려 있는 페이지가 알맞은 때에 스스로 새로 고친다 (js/app.js '새 버전')
function siteVersion() {
  const h = crypto.createHash('sha1');
  const walk = (dir, rel) => {
    for (const name of fs.readdirSync(dir).sort()) {
      const r = rel ? rel + '/' + name : name;
      if (name[0] === '.' || r === 'server' || r === 'node_modules') continue;
      const abs = path.join(dir, name);
      if (fs.statSync(abs).isDirectory()) walk(abs, r);
      else if (TYPES[path.extname(name)]) h.update(r).update('\0').update(fs.readFileSync(abs));
    }
  };
  try {
    walk(ROOT, '');
  } catch (e) {
    return '';
  }
  return h.digest('base64url').slice(0, 12);
}
const VERSION = STATIC ? siteVersion() : '';

// 페이지와 코드는 매번 확인한다 (바뀐 게 없으면 304 로 짧게). 아이콘은 일주일, 녹음은 하루 둔다
function cacheFor(rel) {
  if (/^icon/.test(rel)) return 'public, max-age=604800';
  if (/^sounds\//.test(rel)) return 'public, max-age=86400';
  return 'no-cache';
}

function loadFile(rel) {
  if (files.has(rel)) return files.get(rel);
  const type = TYPES[path.extname(rel)];
  const abs = path.resolve(ROOT, rel);
  if (!type || !abs.startsWith(ROOT + path.sep) || rel.split('/').some((seg) => !seg || seg[0] === '.') || /^server\//.test(rel)) return null;
  let body;
  try {
    body = fs.readFileSync(abs);
  } catch (e) {
    return null;
  }
  // 이 서버에서 연 페이지는 이 서버로 모이고, 자기 버전을 안다
  if (rel === 'index.html') {
    body = Buffer.from(body.toString('utf8').replace('<meta name="mc-presence" content="">', `<meta name="mc-presence" content="auto">\n  <meta name="mc-version" content="${VERSION}">`));
  }
  // 그림과 소리는 이미 눌러 담은 것이라 gzip 하지 않는다
  const text = !/^(image\/(png|x-icon)|audio\/)/.test(type);
  const f = {
    body,
    gz: text ? zlib.gzipSync(body, { level: 9 }) : null,
    type,
    etag: '"' + crypto.createHash('sha1').update(body).digest('base64url').slice(0, 16) + '"',
    cache: cacheFor(rel),
  };
  files.set(rel, f);
  return f;
}

function serveFile(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, Object.assign({ allow: 'GET, HEAD' }, HEADERS));
    res.end();
    return;
  }
  let rel = null;
  try {
    rel = decodeURIComponent((req.url || '/').split('?')[0]);
  } catch (e) {
    rel = null;
  }
  if (rel != null) {
    rel = rel.replace(/^\/+/, '');
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  }
  const f = rel != null && rel.length < 200 && !rel.includes('\0') ? loadFile(rel) : null;
  if (!f) {
    res.writeHead(404, Object.assign({ 'content-type': 'text/plain; charset=utf-8' }, HEADERS));
    res.end('없는 곳이에요');
    return;
  }
  const head = Object.assign({ 'content-type': f.type, 'cache-control': f.cache, etag: f.etag, vary: 'accept-encoding' }, HEADERS);
  if (req.headers['if-none-match'] === f.etag) {
    res.writeHead(304, head);
    res.end();
    return;
  }
  const gz = f.gz && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  const body = gz ? f.gz : f.body;
  if (gz) head['content-encoding'] = 'gzip';
  head['content-length'] = body.length;
  res.writeHead(200, head);
  res.end(req.method === 'HEAD' ? undefined : body);
}

// ── 서버 ───────────────────────────────────────────────
function actualPresence() {
  const places = {};
  for (const [place, list] of rooms) places[place] = list.reduce((n, r) => n + r.members.size, 0);
  return { total: clients.size, places, at: Date.now() };
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ ok: true, clients: clients.size }));
    return;
  }
  // 건의함: 누구나 보내고, 운영자만 본다 (server/suggest.js)
  if (suggest.handle(req, res, ALLOWED_ORIGINS, actualPresence)) return;
  if (STATIC) {
    serveFile(req, res);
    return;
  }
  res.writeHead(426, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('websocket only');
});

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  const origin = req.headers.origin || '';
  const okOrigin = !ALLOWED_ORIGINS.length || ALLOWED_ORIGINS.includes(origin);
  if (!key || (req.headers.upgrade || '').toLowerCase() !== 'websocket' || !okOrigin || clients.size >= MAX_CLIENTS) {
    socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
    return;
  }
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write(['HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade', `Sec-WebSocket-Accept: ${accept}`, '', ''].join('\r\n'));
  socket.setNoDelay(true);
  const c = {
    id: crypto.randomBytes(6).toString('base64url'),
    ip: String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress,
    socket,
    buf: Buffer.alloc(0),
    state: null,
    room: null,
    closed: false,
    windowAt: Date.now(),
    count: 0,
    seen: Date.now(),
  };
  clients.add(c);
  send(c, VERSION ? { t: 'you', id: c.id, v: VERSION } : { t: 'you', id: c.id });
  socket.on('data', (d) => onData(c, d));
  socket.on('close', () => close(c));
  socket.on('error', () => close(c));
});

// 20초마다 핑. 브라우저가 퐁으로 답하고, 오래 답이 없는 연결은 정리한다
setInterval(() => {
  const now = Date.now();
  for (const c of clients) {
    if (now - c.seen > 60000) close(c, 1001);
    else if (!c.closed) c.socket.write(Buffer.from([0x89, 0]));
  }
}, 20000).unref();

server.listen(PORT, () => {
  console.log(`mungcamp on :${PORT}${STATIC ? ` (site ${VERSION} + presence)` : ' (presence only)'} (room cap ${ROOM_CAP}, map cap ${MAP_CAP})`);
});
