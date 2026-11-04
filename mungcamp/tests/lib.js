/* 멍캠프 시험 도구
   사이트를 띄우고(정적 서버 또는 함께 모이기 서버), 사람마다 브라우저를 열고, 확인한 것을 모아 알려 준다.
   필요한 것: Node 18 이상, Playwright (npm i -D playwright && npx playwright install chromium) */
'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.error('Playwright 가 필요해요: npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 서버 ─────────────────────────────────────────────────
function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.mp3': 'audio/mpeg',
  '.webmanifest': 'application/manifest+json',
};

// 정적 사이트: 함께 모이기 서버가 없으니 같은 브라우저의 탭끼리만 함께 (BroadcastChannel)
function staticServer(root = ROOT) {
  const srv = http.createServer((req, res) => {
    let rel = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '');
    if (!rel || rel.endsWith('/')) rel += 'index.html';
    const abs = path.resolve(root, rel);
    if (!abs.startsWith(root + path.sep) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(abs)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(abs).pipe(res);
  });
  return new Promise((resolve) => {
    srv.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${srv.address().port}/`, close: () => srv.close() }));
  });
}

// 함께 모이기 서버 (사이트 파일도 건넨다): 서로 다른 브라우저(다른 사람)끼리 함께.
// port 를 주면 그 자리에 다시 띄운다 (다시 배포하는 시험)
async function presenceServer(env = {}, root = ROOT, port) {
  port = port || (await freePort());
  const proc = spawn(process.execPath, [path.join(root, 'server', 'presence.js')], {
    env: Object.assign({}, process.env, { PORT: String(port) }, env),
    stdio: 'ignore',
  });
  const url = `http://127.0.0.1:${port}/`;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(url + 'health');
      if (r.ok) break;
    } catch (e) {
      /* 아직 */
    }
    await sleep(100);
  }
  return { url, port, proc, close: () => proc.kill() };
}

// 사이트를 임시 폴더로 복사 (다시 배포하는 시험에서 파일을 고칠 때)
function copySite() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mungcamp-'));
  const dst = path.join(dir, 'mungcamp');
  fs.cpSync(ROOT, dst, { recursive: true, filter: (src) => !src.includes(`${path.sep}tests${path.sep}shots`) });
  return dst;
}

// ── 사람(브라우저) ─────────────────────────────────────────
// nick: 마음 단어(닉네임). null 이면 정하지 않는다(처음 온 사람). look: { c: 털빛, h: 모자 }
async function person(opts = {}) {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const phone = !!opts.phone;
  const viewport = opts.viewport || (phone ? { width: 390, height: 844 } : { width: 1000, height: 700 });
  const ctx = await browser.newContext({ viewport, isMobile: phone, hasTouch: phone, deviceScaleFactor: opts.dpr || 1 });
  if (opts.nick !== null) {
    await ctx.addInitScript(([nick, look]) => {
      try {
        if (!localStorage.getItem('mungcamp.nick')) localStorage.setItem('mungcamp.nick', JSON.stringify(nick));
        if (look) localStorage.setItem('mungcamp.look', JSON.stringify(look));
      } catch (e) {
        /* 저장 불가 */
      }
    }, [opts.nick || '시험멍이', opts.look || null]);
  }
  const errors = [];
  const watch = (page, who) => {
    page.on('pageerror', (e) => errors.push(`${who}: ${e.message}`));
    page.on('console', (m) => {
      // 글꼴(Google Fonts)처럼 바깥에서 받는 것은 인터넷이 없으면 못 받을 수 있다
      if (m.type() === 'error' && !/net::|ERR_|Failed to load resource/.test(m.text())) errors.push(`${who} console: ${m.text()}`);
    });
  };
  const page = await ctx.newPage();
  watch(page, opts.name || 'page');
  // 같은 브라우저의 새 탭 (BroadcastChannel 로 함께)
  const tab = async (name) => {
    const p = await ctx.newPage();
    watch(p, name || 'tab');
    return p;
  };
  return { browser, ctx, page, tab, errors, close: () => browser.close() };
}

// ── 확인 ─────────────────────────────────────────────────
const results = [];
function check(ok, name, detail) {
  results.push({ ok: !!ok, name });
  const d = detail === undefined ? '' : ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`;
  console.log(`${ok ? '✓' : '✗'} ${name}${d}`);
  return !!ok;
}

// 페이지 안의 조건이 참이 될 때까지 기다린다 (시간 안에 안 되면 마지막 값을 돌려준다).
// 새로 고치는 중이라 물어볼 수 없으면 거짓으로 보고 계속 기다린다
async function until(page, fn, arg, timeout = 10000, every = 150) {
  const t0 = Date.now();
  let v;
  for (;;) {
    try {
      v = await page.evaluate(fn, arg);
    } catch (e) {
      v = false;
    }
    if (v || Date.now() - t0 > timeout) return v;
    await sleep(every);
  }
}

// 다른 사람의 멍이(첫 번째)를 누른다. 내 멍이와 겹치지 않는 자리를 골라서 (장면 안, 마을 모두)
async function tapVisitor(page) {
  const pt = await page.evaluate(() => {
    const pick = (v, mine, toScreen) => {
      let best = null;
      for (let dy = -100; dy <= 0; dy += 8) {
        for (let dx = -40; dx <= 40; dx += 8) {
          const x = v.pup.x + dx * v.pup.k;
          const y = v.pup.y + dy * v.pup.k;
          if (v.pup.hit(x, y) && !mine.hit(x, y)) best = toScreen(x, y);
        }
      }
      return best;
    };
    const st = MC.app.state;
    if (st.view === 'session') {
      const sc = st.sceneObj;
      const v = [...sc.crowd.visitors.values()][0];
      const r = document.querySelector('#stage').getBoundingClientRect();
      return v ? pick(v, sc.pup, (x, y) => [r.left + x, r.top + y]) : null;
    }
    const c = MC.app.camp;
    const v = [...c.visitors.values()][0];
    const r = document.querySelector('#campCanvas').getBoundingClientRect();
    return v ? pick(v, c.pup, (x, y) => { const s = c.toScreen(x, y); return [r.left + s.x, r.top + s.y]; }) : null;
  });
  if (!pt) return false;
  await page.mouse.click(pt[0], pt[1]);
  return true;
}

// 장소에 들어가기: 장소에는 걸어서만 가므로, 마을을 열고 그 자리 앞에 서서 '들어가기'와 같은 길로 들어간다
async function enter(page, base, name) {
  await page.goto(base);
  await until(page, () => !!(window.MC && MC.app && MC.app.state.view === 'home' && MC.app.camp.w > 1), null, 15000);
  await page.evaluate((n) => {
    MC.app.camp.placeAt(n);
    MC.app.enterScene(n);
  }, name);
  return until(page, (n) => MC.app.state.scene === n && !!(MC.app.state.sceneObj && MC.app.state.sceneObj.w), name, 15000);
}

async function shot(page, name) {
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
}

// 시험 하나를 돌린다: 예외도 실패로 세고, 끝나면 열어 둔 것을 닫는다
function main(fn) {
  const cleanup = [];
  const ctx = { check, until, shot, sleep, enter, staticServer, presenceServer, copySite, person, tapVisitor, ROOT, cleanup: (f) => cleanup.push(f) };
  (async () => {
    try {
      await fn(ctx);
    } catch (e) {
      check(false, '예외', e.stack || String(e));
    }
    for (const f of cleanup.reverse()) {
      try {
        await f();
      } catch (e) {
        /* 이미 닫힘 */
      }
    }
    const bad = results.filter((r) => !r.ok).length;
    console.log(bad ? `\n${bad}개 실패 (${results.length}개 중)` : `\n모두 통과 (${results.length}개)`);
    process.exit(bad ? 1 : 0);
  })();
}

module.exports = { main, check, until, shot, sleep, enter, staticServer, presenceServer, copySite, person, tapVisitor, ROOT };
