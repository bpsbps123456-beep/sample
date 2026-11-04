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
  const srv = await presenceServer({ OWNER_KEY: 'owner-key-for-test', SUGGEST_FILE: path.join(dir, 'suggestions.jsonl') });
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

  // 정적 사이트(함께 모이기 서버 없음)에서는 단추가 숨는다
  const site = await staticServer();
  cleanup(() => site.close());
  const B = await who.tab('static');
  await B.goto(site.url);
  await until(B, () => MC.app.state.view === 'home');
  check(!(await B.isVisible('#suggestBtn')), '서버가 없는 곳에서는 건의하기가 숨는다');
  check(who.errors.length === 0, '오류 없음', who.errors.slice(0, 3));
});
