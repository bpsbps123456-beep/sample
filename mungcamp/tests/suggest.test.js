// 건의하기: 서버가 건넨 페이지에서만 단추가 보이고, 보내면 운영자만 열쇠로 본다.
// 너무 잦으면 쉬게 하고, 다른 사이트에서 보내는 것은 막는다. 정적 사이트(서버 없음)에서는 단추가 숨는다
'use strict';
const os = require('os');
const path = require('path');
const fs = require('fs');
const { main } = require('./lib');

main(async ({ check, staticServer, presenceServer, person, until, sleep, cleanup }) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mungcamp-suggest-'));
  cleanup(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'suggestions.jsonl');
  fs.writeFileSync(file, JSON.stringify({ at: 1700000000000, text: '예전에 받은 건의', nick: '차분함', place: 'home' }) + '\n');
  const env = { OWNER_KEY: 'owner-key-for-test', SUGGEST_FILE: file };
  const srv = await presenceServer(env);
  cleanup(() => srv.close());
  const who = await person({ nick: '설렘' });
  cleanup(() => who.close());
  const A = who.page;
  await A.goto(srv.url);
  await until(A, () => MC.app.state.view === 'home' && MC.app.camp.w > 1);
  check(await A.isVisible('#suggestBtn'), '마을에 건의하기 단추');
  await A.click('#suggestBtn');
  check(await A.isVisible('#suggestCard'), '누르면 건의 쓰는 창');
  await A.click('#suggestSend');
  check(/조금만 더/.test(await A.textContent('#suggestFine')), '비워 두고 보내면 조금 더 적어 달라고');
  const text = '연못에 오리도 있으면 좋겠어요!\n눈 오는 날도요.';
  await A.fill('#suggestInput', text);
  check((await A.textContent('#suggestFine')).trim() === `${Array.from(text).length} / 1000`, '적은 글자 수');
  await A.click('#suggestSend');
  check(await until(A, () => document.querySelector('#suggestCard').hidden, null, 5000), '보내면 창이 닫힌다');
  check(/잘 전했어요/.test(await A.textContent('#campToast')), "'고마워요. 잘 전했어요'");

  const owner = await (await fetch(srv.url + 'suggestions?key=owner-key-for-test&format=json')).json();
  const got = owner.items && owner.items[0];
  check(got && got.text === text && got.place === 'home' && got.nick === '설렘', '운영자는 열쇠로 건의를 본다 (글, 어디서, 마음 단어)', got);
  const page = await (await fetch(srv.url + 'suggestions?key=owner-key-for-test')).text();
  check(page.includes('연못에 오리도') && page.includes('noindex'), '운영자 페이지 (검색에 안 잡히게)');
  check((await fetch(srv.url + 'suggestions?key=wrong')).status === 403, '열쇠가 틀리면 못 본다');
  check((await fetch(srv.url + 'suggestions')).status === 403, '열쇠 없이도 못 본다');
  const xss = await fetch(srv.url + 'api/suggest', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: '<script>alert(1)</script> 안녕' }) });
  const page2 = await (await fetch(srv.url + 'suggestions?key=owner-key-for-test')).text();
  check(xss.status === 200 && !page2.includes('<script>alert(1)') && page2.includes('&lt;script&gt;'), '받은 글은 글자 그대로만 보인다');
  const codes = [];
  for (let i = 0; i < 3; i++) codes.push((await fetch(srv.url + 'api/suggest', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: '여러 번 ' + i }) })).status);
  check(codes.includes(429), '한 사람이 너무 잦으면 쉬게 한다', codes);
  const cross = await fetch(srv.url + 'api/suggest', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://other.example' }, body: JSON.stringify({ text: '다른 사이트에서' }) });
  check(cross.status === 403, '다른 사이트에서 보내는 것은 막는다');
  const lines = fs.readFileSync(path.join(dir, 'suggestions.jsonl'), 'utf8').trim().split('\n');
  check(lines.length >= 2, '파일에도 남긴다', lines.length);

  check((await fetch(srv.url + 'api/suggestions')).status === 401, '인증 없이 목록을 읽을 수 없다');
  check((await fetch(srv.url + 'api/suggestions/' + got.id, { method: 'DELETE' })).status === 401, '인증 없이 삭제할 수 없다');
  await A.evaluate(async () => { await navigator.serviceWorker.register('sw.js'); await navigator.serviceWorker.ready; });
  await until(A, () => !!navigator.serviceWorker.controller);
  await A.click('#suggestBtn');
  await A.fill('#suggestInput', '아직 보내지 않은 초안');
  await A.click('#ownerBtn');
  check(await A.isVisible('#ownerPassword') && await A.getAttribute('#ownerPassword', 'type') === 'password', '운영자 글자를 누르면 비밀번호창');
  await A.fill('#ownerPassword', 'wrong'); await A.click('#ownerSubmit');
  check(await until(A, () => document.querySelector('#ownerFine').textContent.includes('맞지')), '틀린 비밀번호는 안내하고 건의를 보여주지 않는다');
  check(!(await A.isVisible('#ownerInbox')) && await A.inputValue('#ownerPassword') === '', '인증 전에는 목록이 없고 입력한 비밀번호도 비운다');
  await A.fill('#ownerPassword', 'owner-key-for-test'); await A.click('#ownerSubmit');
  check(await until(A, () => !document.querySelector('#ownerInbox').hidden), '기존 운영자 비밀번호로 건의 목록을 연다');
  check((await A.textContent('#ownerList')).includes(text) && await A.locator('#ownerList script').count() === 0, '글과 줄바꿈을 그대로 보이고 스크립트는 실행하지 않는다');
  check(!await A.evaluate(() => JSON.stringify(localStorage).includes('owner-key-for-test')), '운영자 비밀번호를 브라우저 저장소에 남기지 않는다');
  const cookie = (await who.ctx.cookies(srv.url + 'api/suggestions')).find(c => c.name === 'mungcamp_owner');
  check(cookie && cookie.httpOnly && cookie.sameSite === 'Strict', '인증은 스크립트에서 읽지 못하는 쿠키로');
  const auth = { cookie: `${cookie.name}=${cookie.value}` };
  check((await fetch(srv.url + 'api/suggestions', { headers: auth })).headers.get('cache-control') === 'no-store', '건의 목록은 캐시에 저장하지 않는다');
  check(await A.evaluate(async () => {
    await fetch('api/suggestions');
    for (const name of await caches.keys()) {
      for (const request of await (await caches.open(name)).keys()) if (new URL(request.url).pathname.startsWith('/api/')) return false;
    }
    return true;
  }), '오프라인 서비스워커도 운영자 목록을 캐시에 남기지 않는다');
  check((await fetch(srv.url + 'api/suggestions/' + got.id, { method: 'DELETE', headers: { ...auth, origin: 'https://other.example' } })).status === 403, '다른 사이트에서는 인증 쿠키가 있어도 삭제할 수 없다');
  const row = A.locator('.owner-item').filter({ hasText: '연못에 오리도' });
  await row.getByRole('button', { name: '삭제하기', exact: true }).click();
  await row.getByRole('button', { name: '취소', exact: true }).click();
  check(await row.count() === 1, '삭제를 취소하면 건의가 남는다');
  await row.getByRole('button', { name: '삭제하기', exact: true }).click();
  await row.getByRole('button', { name: '삭제', exact: true }).click();
  check(await until(A, () => document.querySelector('#ownerFine').textContent === '삭제했어요.'), '개별 건의를 확인 후 삭제한다');
  check(await row.count() === 0 && !fs.readFileSync(file, 'utf8').includes(got.id), '삭제한 건의는 목록과 저장 파일에서 사라진다');
  const legacy = owner.items.find(s => s.text === '예전에 받은 건의');
  check(legacy && legacy.id, '예전에 받은 건의에도 삭제 번호가 생긴다');
  await Promise.all([
    fetch(srv.url + 'api/suggestions/' + legacy.id, { method: 'DELETE', headers: auth }),
    fetch(srv.url + 'api/suggest', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.19' }, body: JSON.stringify({ text: '삭제 중 새로 온 건의' }) }),
  ]);
  const saved = fs.readFileSync(file, 'utf8');
  check(!saved.includes(legacy.id) && saved.includes('삭제 중 새로 온 건의'), '접수와 삭제가 겹쳐도 새 글을 잃거나 삭제한 글이 되살아나지 않는다');
  await A.click('#ownerLock');
  check((await A.inputValue('#suggestInput')) === '아직 보내지 않은 초안', '운영자창을 닫아도 건의 초안은 유지한다');
  check(await until(A, async () => (await fetch('api/suggestions')).status === 401), '닫으면 운영자 인증도 해제한다');
  await A.click('#ownerBtn');
  check(await A.isVisible('#ownerLogin') && await A.locator('.owner-item').count() === 0, '다시 열면 비밀번호를 묻고 이전 목록은 비운다');
  await A.keyboard.press('Escape'); await A.click('#suggestCancel');

  const stopped = new Promise(resolve => srv.proc.once('exit', resolve)); srv.close(); await stopped;
  const restarted = await presenceServer(env, undefined, srv.port); cleanup(() => restarted.close());
  const restored = await (await fetch(restarted.url + 'suggestions?key=owner-key-for-test&format=json')).json();
  check(!restored.items.some(s => s.id === got.id || s.id === legacy.id) && restored.items.some(s => s.text === '삭제 중 새로 온 건의'), '서버가 재시작되어도 삭제한 건의는 돌아오지 않는다');
  const attempts = [];
  for (let i = 0; i < 11; i++) attempts.push((await fetch(restarted.url + 'api/suggestions/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'wrong' }) })).status);
  check(attempts.slice(0, 10).every(s => s === 403) && attempts[10] === 429, '비밀번호를 계속 틀리면 잠시 시도를 막는다');

  // 정적 사이트(함께 모이기 서버 없음)에서는 단추가 숨는다
  const site = await staticServer();
  cleanup(() => site.close());
  const B = await who.tab('static');
  await B.goto(site.url);
  await until(B, () => MC.app.state.view === 'home');
  check(!(await B.isVisible('#suggestBtn')), '서버가 없는 곳에서는 건의하기가 숨는다');
  check(who.errors.length === 0, '오류 없음', who.errors.slice(0, 3));
});
