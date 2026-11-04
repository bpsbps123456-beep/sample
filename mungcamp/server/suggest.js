/* 멍캠프 — 건의함 (의존성 없음, Node 18+)

   POST /api/suggest   {text, nick?, place?}  누구나 보낼 수 있다 (한 사람이 너무 잦으면 쉬게 한다)
   GET  /suggestions?key=OWNER_KEY            운영자만 보는 목록 (?format=json 이면 JSON)
   POST /api/suggestions/login              비밀번호로 운영자 인증
   GET  /api/suggestions                    인증한 운영자의 목록
   DELETE /api/suggestions/:id               인증한 운영자의 개별 삭제

   받은 건의는 여기에 남는다:
   - 서버 메모리 (최근 500개)와 파일(SUGGEST_FILE, 기본 server/data/suggestions.jsonl).
     Render 무료 플랜처럼 다시 켜질 때 파일이 비워지는 곳에서는 잠깐만 남는다.
   - 오래 두려면 둘 중 하나를 켠다 (README '건의함'):
     SUGGEST_GITHUB_TOKEN + SUGGEST_GITHUB_REPO  비공개 저장소에 이슈로 하나씩 (메일 알림도 온다)
     SUGGEST_WEBHOOK                            디스코드·슬랙·구글 앱스 스크립트 같은 웹훅 주소로 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const OWNER_KEY = process.env.OWNER_KEY || '';
const FILE = process.env.SUGGEST_FILE || path.join(__dirname, 'data', 'suggestions.jsonl');
const GH_TOKEN = process.env.SUGGEST_GITHUB_TOKEN || '';
const GH_REPO = process.env.SUGGEST_GITHUB_REPO || '';
const WEBHOOK = process.env.SUGGEST_WEBHOOK || '';
const MAX_TEXT = 1000;
const KEEP = 500;
const PLACE_NAMES = { home: '마을', map: '마을', fire: '모닥불', firetower: '탑불멍', water: '달빛 바다', forest: '편백 숲', tent: '글램핑', lodge: '숙소' };

const list = [];
const recent = new Map(); // 보낸 곳(IP) → 보낸 때들
const sessions = new Map();
const loginAttempts = new Map();
const SESSION_MS = 8 * 3600e3;
const COOKIE = 'mungcamp_owner';
let mutations = Promise.resolve();
let hourCount = 0;
let hourStart = Date.now();

// 파일에 남아 있던 것을 읽어 온다
try {
  const lines = fs.readFileSync(FILE, 'utf8').split('\n').filter(Boolean).slice(-KEEP);
  for (const ln of lines) {
    try {
      const s = JSON.parse(ln);
      if (s && typeof s.text === 'string') {
        // 예전에 받은 건의도 재시작 뒤 같은 번호로 삭제할 수 있게 한다.
        if (!s.id) s.id = crypto.createHash('sha256').update(ln).digest('hex').slice(0, 24);
        list.push(s);
      }
    } catch (e) {
      /* 깨진 줄은 건너뛴다 */
    }
  }
} catch (e) {
  /* 아직 없다 */
}

function cleanText(v, max) {
  if (typeof v !== 'string') return '';
  return Array.from(
    v.normalize('NFC')
      .replace(/\r\n?/g, '\n')
      .replace(/[^\P{C}\n]/gu, '')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim()
  ).slice(0, max).join('').trim();
}

function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || (req.socket && req.socket.remoteAddress) || '?';
}

// 한 사람이 10분에 3번, 하루 10번까지. 모두 합쳐 한 시간에 200번까지
function allowed(ip) {
  const now = Date.now();
  if (now - hourStart > 3600e3) {
    hourStart = now;
    hourCount = 0;
  }
  if (hourCount >= 200) return false;
  const times = (recent.get(ip) || []).filter((t) => now - t < 86400e3);
  if (times.filter((t) => now - t < 600e3).length >= 3 || times.length >= 10) {
    recent.set(ip, times);
    return false;
  }
  times.push(now);
  recent.set(ip, times);
  hourCount++;
  return true;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of recent) if (!times.some((t) => now - t < 86400e3)) recent.delete(ip);
  for (const [token, expiry] of sessions) if (expiry <= now) sessions.delete(token);
  for (const [ip, attempt] of loginAttempts) if (attempt.until <= now) loginAttempts.delete(ip);
}, 3600e3).unref();

function sameOrigin(req, allowedOrigins) {
  const origin = req.headers.origin;
  if (!origin) return true;
  if (allowedOrigins.length) return allowedOrigins.includes(origin);
  try {
    return new URL(origin).host === req.headers.host;
  } catch (e) {
    return false;
  }
}

function readBody(req, limit) {
  return new Promise((resolve) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        resolve(null);
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => resolve(null));
  });
}

function sendJson(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(JSON.stringify(obj));
}

function kst(ms) {
  const d = new Date(ms + 9 * 3600e3);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

// 오래 남길 곳으로 보낸다 (실패해도 사이트는 그대로)
async function forward(s) {
  const where = PLACE_NAMES[s.place] || '';
  const head = `${kst(s.at)} (한국 시각)${where ? ` · ${where}에서` : ''}${s.nick ? ` · 마음 단어 '${s.nick}'` : ''}`;
  const jobs = [];
  if (GH_TOKEN && /^[\w.-]+\/[\w.-]+$/.test(GH_REPO)) {
    const title = '건의: ' + Array.from(s.text.replace(/\s+/g, ' ')).slice(0, 40).join('');
    jobs.push(fetch(`https://api.github.com/repos/${GH_REPO}/issues`, {
      method: 'POST',
      headers: { authorization: `Bearer ${GH_TOKEN}`, accept: 'application/vnd.github+json', 'user-agent': 'mungcamp-suggest', 'content-type': 'application/json' },
      body: JSON.stringify({ title, body: `${s.text}\n\n---\n${head}`, labels: ['건의'] }),
    }).then((r) => {
      if (!r.ok) console.warn('건의를 GitHub 이슈로 보내지 못했어요:', r.status);
    }));
  }
  if (/^https:\/\//.test(WEBHOOK)) {
    const content = `📮 멍캠프 건의\n${s.text}\n— ${head}`;
    jobs.push(fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: content.slice(0, 1900), text: content, suggestion: s }),
    }).then((r) => {
      if (!r.ok) console.warn('건의를 웹훅으로 보내지 못했어요:', r.status);
    }));
  }
  await Promise.all(jobs.map((j) => j.catch((e) => console.warn('건의를 보내지 못했어요:', e.message))));
}

// 접수와 삭제를 순서대로 저장한다. 삭제 직후 늦은 추가 쓰기로 글이 되살아나지 않게.
function mutate(change) {
  const job = mutations.then(async () => {
    const next = list.slice();
    if (!change(next)) return false;
    await fs.promises.mkdir(path.dirname(FILE), { recursive: true });
    await fs.promises.writeFile(FILE + '.tmp', next.map(s => JSON.stringify(s)).join('\n') + (next.length ? '\n' : ''), { mode: 0o600 });
    await fs.promises.rename(FILE + '.tmp', FILE);
    list.splice(0, list.length, ...next);
    return true;
  });
  mutations = job.catch(() => {});
  return job;
}

async function store(s) {
  await mutate(next => {
    next.push(s);
    if (next.length > KEEP) next.splice(0, next.length - KEEP);
    return true;
  });
  forward(s);
}

function esc(v) {
  return String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function keyOk(given) {
  if (!OWNER_KEY || typeof given !== 'string') return false;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(OWNER_KEY).digest();
  return crypto.timingSafeEqual(a, b);
}

function sessionToken(req) {
  return (String(req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '=')) || '').slice(COOKIE.length + 1);
}

function ownerOk(req) {
  const token = sessionToken(req);
  if ((sessions.get(token) || 0) > Date.now()) return true;
  sessions.delete(token);
  return false;
}

function ownerCookie(req, token, age) {
  const secure = req.socket.encrypted || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
  return `${COOKIE}=${token}; Path=/api/suggestions; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? '; Secure' : ''}`;
}

function ownerApi(req, res, url, allowedOrigins) {
  const route = url.pathname;
  if (route !== '/api/suggestions' && !route.startsWith('/api/suggestions/')) return false;
  if (!sameOrigin(req, allowedOrigins)) {
    sendJson(res, 403, { ok: false, error: 'origin' });
    return true;
  }
  if (route === '/api/suggestions/login' && req.method === 'POST') {
    if (!OWNER_KEY) { sendJson(res, 503, { ok: false, error: 'unconfigured' }); return true; }
    const ip = clientIp(req), now = Date.now();
    let attempts = loginAttempts.get(ip);
    if (!attempts || attempts.until <= now) {
      attempts = { count: 0, until: now + 600e3 }; loginAttempts.set(ip, attempts);
    }
    if (attempts.count >= 10) { sendJson(res, 429, { ok: false, error: 'busy' }); return true; }
    attempts.count++;
    readBody(req, 4096).then(body => {
      let data;
      try { data = JSON.parse(body); } catch (_) {}
      if (!keyOk(data && data.password)) { sendJson(res, 403, { ok: false, error: 'password' }); return; }
      loginAttempts.delete(ip);
      const token = crypto.randomBytes(32).toString('hex');
      for (const [key, expiry] of sessions) if (expiry <= now) sessions.delete(key);
      if (sessions.size >= 500) sessions.delete(sessions.keys().next().value);
      sessions.delete(sessionToken(req));
      sessions.set(token, now + SESSION_MS);
      res.setHeader('set-cookie', ownerCookie(req, token, SESSION_MS / 1000));
      sendJson(res, 200, { ok: true });
    });
    return true;
  }
  if (route === '/api/suggestions/logout' && req.method === 'POST') {
    sessions.delete(sessionToken(req));
    res.setHeader('set-cookie', ownerCookie(req, '', 0));
    sendJson(res, 200, { ok: true });
    return true;
  }
  if (!ownerOk(req)) { sendJson(res, 401, { ok: false, error: 'auth' }); return true; }
  if (route === '/api/suggestions' && req.method === 'GET') {
    sendJson(res, 200, { count: list.length, items: list.slice().reverse() });
    return true;
  }
  const match = /^\/api\/suggestions\/([a-zA-Z0-9-]{1,64})$/.exec(route);
  if (match && req.method === 'DELETE') {
    mutate(next => {
      const index = next.findIndex(s => s.id === match[1]);
      if (index < 0) return false;
      next.splice(index, 1);
      return true;
    }).then(removed => sendJson(res, removed ? 200 : 404, { ok: removed }))
      .catch(() => sendJson(res, 503, { ok: false, error: 'storage' }));
    return true;
  }
  sendJson(res, 405, { ok: false, error: 'method' });
  return true;
}

function ownerPage(res, url) {
  const forwards = [GH_TOKEN && GH_REPO ? `GitHub 이슈 (${esc(GH_REPO)})` : '', WEBHOOK ? '웹훅' : ''].filter(Boolean);
  const rows = list.slice().reverse().map((s) => `
    <li><p class="meta">${esc(kst(s.at))}${s.place ? ` · ${esc(PLACE_NAMES[s.place] || s.place)}` : ''}${s.nick ? ` · ${esc(s.nick)}` : ''}</p><p class="text">${esc(s.text)}</p></li>`).join('');
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>멍캠프 건의함</title><style>
:root{color-scheme:dark}body{margin:0;background:#0d1020;color:#efe6d6;font:16px/1.6 system-ui,-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif}
main{max-width:720px;margin:0 auto;padding:32px 18px 64px}h1{font-size:1.6rem;margin:0 0 6px}.lead{color:#b8b0a2;margin:0 0 22px;font-size:.95rem}
ul{list-style:none;margin:0;padding:0}li{background:#171b30;border:1px solid #2a2f4a;border-radius:16px;padding:14px 16px;margin:0 0 12px}
.meta{margin:0 0 6px;color:#9c94a8;font-size:.85rem}.text{margin:0;white-space:pre-wrap;word-break:break-word}.empty{color:#9c94a8}a{color:#ffb878}
</style></head><body><main><h1>멍캠프 건의함</h1>
<p class="lead">받은 건의 ${list.length}개 (최근 ${KEEP}개까지, 새것부터). ${forwards.length ? `오래 남는 곳: ${forwards.join(', ')}.` : '이 서버가 다시 켜지면 비워질 수 있어요. 오래 두려면 README의 「건의함」을 따라 GitHub 이슈나 웹훅을 켜 주세요.'}
<a href="${esc(url.pathname)}?key=${encodeURIComponent(url.searchParams.get('key') || '')}&amp;format=json">JSON</a></p>
${rows ? `<ul>${rows}</ul>` : '<p class="empty">아직 받은 건의가 없어요.</p>'}</main></body></html>`;
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'x-robots-tag': 'noindex' });
  res.end(html);
}

// 건의에 관한 요청이면 처리하고 true
function handle(req, res, allowedOrigins = []) {
  const url = new URL(req.url || '/', 'http://x');
  if (ownerApi(req, res, url, allowedOrigins)) return true;
  if (url.pathname === '/api/suggest') {
    if (req.method !== 'POST') {
      res.writeHead(405, { allow: 'POST' });
      res.end();
      return true;
    }
    if (!sameOrigin(req, allowedOrigins)) {
      sendJson(res, 403, { ok: false, error: 'origin' });
      return true;
    }
    readBody(req, 8192).then(async (body) => {
      let data = null;
      try {
        data = body ? JSON.parse(body) : null;
      } catch (e) {
        data = null;
      }
      const text = cleanText(data && data.text, MAX_TEXT);
      if (Array.from(text).length < 2) {
        sendJson(res, 400, { ok: false, error: 'empty' });
        return;
      }
      if (!allowed(clientIp(req))) {
        sendJson(res, 429, { ok: false, error: 'busy' });
        return;
      }
      const place = data && typeof data.place === 'string' && PLACE_NAMES[data.place] ? data.place : '';
      const nick = cleanText(data && data.nick, 10).replace(/\n/g, ' ');
      await store({ id: crypto.randomUUID(), at: Date.now(), text, place, nick });
      sendJson(res, 200, { ok: true });
    }).catch(() => sendJson(res, 503, { ok: false, error: 'storage' }));
    return true;
  }
  if (url.pathname === '/suggestions') {
    if (!OWNER_KEY) {
      res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      res.end('건의함을 보려면 서버에 OWNER_KEY 를 정해 주세요. (README 「건의함」)');
      return true;
    }
    if (!keyOk(url.searchParams.get('key'))) {
      res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      res.end('열쇠가 맞지 않아요.');
      return true;
    }
    if (url.searchParams.get('format') === 'json') sendJson(res, 200, { count: list.length, items: list.slice().reverse() });
    else ownerPage(res, url);
    return true;
  }
  return false;
}

module.exports = { handle };
