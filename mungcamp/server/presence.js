#!/usr/bin/env node
/* 멍캠프 — 함께 있는 사람들 서버 (의존성 없음, Node 18+)

   하는 일은 하나: 같은 장소에 있는 사람들끼리 서로의 멍이 자리를 나눠 준다.
   이름, 글, 기록은 받지도 남기지도 않는다. 모든 것은 메모리에만 있고 연결이 끊기면 사라진다.

   - 장소(map, fire, water, forest)마다 방을 나누고, 한 방이 차면 다음 방을 연다
     (모닥불·바다·숲은 ROOM_CAP=16, 텐트 안은 TENT_CAP=8, 마을은 MAP_CAP=40). 사람이 많아도 한자리가 붐비지 않는다.
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

const PORT = +(process.env.PORT || 8787);
// 마을 지도는 넉넉하게, 모닥불·바다·숲은 오붓하게
const ROOM_CAP = +(process.env.ROOM_CAP || 16);
const MAP_CAP = +(process.env.MAP_CAP || 40);
const TENT_CAP = +(process.env.TENT_CAP || 8);
const MAX_CLIENTS = +(process.env.MAX_CLIENTS || 20000);
const TICK_HZ = 8;
const PLACES = ['map', 'fire', 'water', 'forest', 'tent'];
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const MAX_FRAME = 2048;

// ── 받은 값 다듬기 (js/net.js 의 clean 과 같은 규칙) ─────────
function num(v, lo, hi) {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null;
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
    hp: num(raw.hp, 0, 1e9) | 0,
    bp,
    g: gx != null && gy != null ? [Math.round(gx), Math.round(gy)] : null,
    l: num(raw.l, 0, 9) | 0,
  };
}

// ── 방 ─────────────────────────────────────────────────
// rooms: place → [{ id, members: Set<client>, changed: Map<id, state>, left: Set<id> }]
const rooms = new Map(PLACES.map((p) => [p, []]));
let roomSeq = 0;
const clients = new Set();

function joinRoom(c, place) {
  const list = rooms.get(place);
  // 가장 붐비지만 아직 자리가 있는 방: 사람들이 흩어지지 않고 모이도록
  let room = null;
  const cap = place === 'map' ? MAP_CAP : place === 'tent' ? TENT_CAP : ROOM_CAP;
  for (const r of list) if (r.members.size < cap && (!room || r.members.size > room.members.size)) room = r;
  if (!room) {
    room = { id: ++roomSeq, place, members: new Set(), changed: new Map(), left: new Set() };
    list.push(room);
  }
  room.members.add(c);
  c.room = room;
  // 새로 온 사람에게는 방 안의 모두를 한 번에
  const all = {};
  for (const m of room.members) if (m !== c && m.state) all[m.id] = m.state;
  send(c, { t: 'd', j: all, l: [], full: 1 });
  room.changed.set(c.id, c.state);
  room.left.delete(c.id);
}

function leaveRoom(c) {
  const room = c.room;
  if (!room) return;
  room.members.delete(c);
  room.changed.delete(c.id);
  room.left.add(c.id);
  c.room = null;
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
      if (!room.changed.size && !room.left.size) continue;
      const j = {};
      for (const [id, st] of room.changed) j[id] = st;
      const l = Array.from(room.left);
      room.changed.clear();
      room.left.clear();
      for (const m of room.members) {
        // 자기 자신의 변화는 빼고 보낸다
        let mine = null;
        if (j[m.id]) {
          mine = j[m.id];
          delete j[m.id];
        }
        if (Object.keys(j).length || l.length) send(m, { t: 'd', j, l });
        if (mine) j[m.id] = mine;
      }
    }
  }
}, 1000 / TICK_HZ);

// 장소별 사람 수
setInterval(() => {
  const c = {};
  for (const [place, list] of rooms) c[place] = list.reduce((n, r) => n + r.members.size, 0);
  const msg = JSON.stringify({ t: 'n', c });
  for (const cl of clients) sendRaw(cl, msg);
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
  if (c.closed) return;
  // 느린 연결이 쌓이면 끊는다 (메모리 보호)
  if (c.socket.writableLength > 256 * 1024) {
    close(c);
    return;
  }
  c.socket.write(frame(text));
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
  if (!m || m.t !== 's') return;
  const st = clean(m.s);
  if (!st) return;
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
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};
const HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
};
const files = new Map();

// 페이지와 코드는 매번 확인한다 (바뀐 게 없으면 304 로 짧게). 아이콘만 오래 둔다
function cacheFor(rel) {
  return /^icon/.test(rel) ? 'public, max-age=604800' : 'no-cache';
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
  // 이 서버에서 연 페이지는 이 서버로 모인다
  if (rel === 'index.html') body = Buffer.from(body.toString('utf8').replace('<meta name="mc-presence" content="">', '<meta name="mc-presence" content="auto">'));
  const text = !/^image\/(png|x-icon)/.test(type);
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
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ ok: true, clients: clients.size }));
    return;
  }
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
  send(c, { t: 'you', id: c.id });
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
  console.log(`mungcamp on :${PORT}${STATIC ? ' (site + presence)' : ' (presence only)'} (room cap ${ROOM_CAP}, map cap ${MAP_CAP})`);
});
