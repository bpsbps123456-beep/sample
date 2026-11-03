#!/usr/bin/env node
/* 멍캠프 시험 전부 (또는 이름을 준 것만) 차례로 돌린다.
   node tests/run.js            모두
   node tests/run.js sea forest 이름에 sea, forest 가 들어간 것만 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const want = process.argv.slice(2);
const files = fs
  .readdirSync(__dirname)
  .filter((f) => f.endsWith('.test.js'))
  .filter((f) => !want.length || want.some((w) => f.includes(w)))
  .sort();

const summary = [];
for (const f of files) {
  console.log(`\n━━ ${f} ━━`);
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { stdio: 'inherit', timeout: 5 * 60 * 1000 });
  summary.push({ f, ok: r.status === 0, sec: Math.round((Date.now() - t0) / 1000) });
}

console.log('\n━━ 결과 ━━');
for (const s of summary) console.log(`${s.ok ? '✓' : '✗'} ${s.f} (${s.sec}초)`);
const bad = summary.filter((s) => !s.ok).length;
console.log(bad ? `\n${bad}개 파일 실패` : '\n모두 통과');
process.exit(bad ? 1 : 0);
