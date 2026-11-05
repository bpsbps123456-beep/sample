/* 원본 벡터 경기장. node tools/build-arena-art.js 로 네 가지 SVG를 재생성한다. */
'use strict';
const fs = require('fs'), path = require('path');
const out = path.resolve(__dirname, '../assets/playground');
const n = v => +v.toFixed(2), rng = seed => () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
const p = (d, fill, a = '') => `<path d="${d}" fill="${fill}" ${a}/>`;
const line = (d, color, w = 1, a = '') => p(d, 'none', `stroke="${color}" stroke-width="${w}" ${a}`);
const r = (x, y, w, h, fill, rx = 0, a = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${a}/>`;
const e = (x, y, rx, ry, fill, a = '') => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}" ${a}/>`;
const grad = (id, colors, x2 = '0%', y2 = '100%') => `<linearGradient id="${id}" x2="${x2}" y2="${y2}">${colors.map((c, i) => `<stop offset="${i / (colors.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const defs = grad('wood', ['#eed4a0', '#c19a62', '#9a7047']) + grad('woodSide', ['#a98050', '#634b38']) +
  grad('sand', ['#eadbb9', '#dcc9a0', '#c6b183']) + grad('leaf', ['#a4b779', '#658a60', '#355f4e']) +
  grad('leafDark', ['#5d8970', '#294f49']) + grad('sky', ['#88aba4', '#c4d0b0', '#ece4bd']) +
  '<radialGradient id="glow"><stop stop-color="#fff5ba" stop-opacity=".85"/><stop offset=".25" stop-color="#ffdd8a" stop-opacity=".3"/><stop offset="1" stop-color="#ffe7a0" stop-opacity="0"/></radialGradient>' +
  '<radialGradient id="shadow"><stop stop-color="#283d35" stop-opacity=".35"/><stop offset="1" stop-color="#283d35" stop-opacity="0"/></radialGradient>' +
  '<pattern id="grain" width="70" height="19" patternUnits="userSpaceOnUse"><path d="M-8 6Q8 1 28 5T78 4M-9 15Q19 9 44 14T81 12" fill="none" stroke="#674b31" stroke-width=".6" opacity=".23"/><path d="M-5 8Q15 3 30 7T76 6" fill="none" stroke="#fff0c2" stroke-width=".7" opacity=".35"/></pattern>';
function save(name, w, h, title, body, extra = '') {
  fs.writeFileSync(path.join(out, name + '.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title"><title id="title">${title}</title><defs>${defs}${extra}</defs><g stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>\n`);
  console.log(name + '.svg');
}
function plank(x, y, w, h, tone = 'wood') {
  return r(x, y + 3, w, h, 'url(#woodSide)', 3) + r(x, y, w, h, `url(#${tone})`, 3) + r(x, y, w, h, 'url(#grain)', 3) + line(`M${x + 3} ${y + 2}h${w - 6}`, '#fff0bd', .8, 'opacity=".6"');
}
function screw(x, y) { return e(x, y, 1.8, 1.8, '#705b44') + line(`M${x - .8} ${y}h1.6`, '#c2b89a', .6); }
function tuft(x, y, k = 1) {
  return `<g transform="translate(${x} ${y}) scale(${k})">${p('M-12 1Q-13-8-18-12Q-6-10-3-2Q-7-18-1-20Q3-10 2-3Q8-15 15-15Q9-7 10 1Z', '#6d8c5b')}${line('M-2 0Q-2-6-3-12M6 0Q6-7 11-10', '#b6c48c', .8)}</g>`;
}
function tree(x, y, k, seed, dark = false) {
  const random = rng(seed); let b = e(x + 12 * k, y + 5 * k, 65 * k, 13 * k, 'url(#shadow)');
  b += `<g transform="translate(${x} ${y}) scale(${k})">` + p('M-12 1Q-8-48-15-92L-37-132L-31-136L-7-108L-5-172L7-172L9-126L31-153L35-148L12-110L15 1Z', 'url(#woodSide)');
  b += line('M-5-1Q1-56-6-106M4-22Q8-81 2-132M-7-107L-24-129', '#d0a56b', 1.5);
  for (let i = 0; i < 11; i++) {
    const a = i * 2.4, cx = Math.cos(a) * (27 + random() * 25), cy = -120 - random() * 73;
    b += e(cx + 2, cy + 5, 36 + random() * 18, 26 + random() * 14, dark ? 'url(#leafDark)' : 'url(#leaf)');
    b += line(`M${n(cx - 22)} ${n(cy - 10)}Q${n(cx)} ${n(cy - 27)} ${n(cx + 21)} ${n(cy - 16)}`, '#c4d59c', 1, 'opacity=".28"');
    for (let j = 0; j < 7; j++) {
      const lx = cx - 26 + random() * 52, ly = cy - 22 + random() * 35;
      b += e(lx, ly, 2 + random() * 3, 1.3 + random() * 2, j % 3 ? '#b0c18a' : '#315e4b', `opacity="${j % 3 ? .26 : .19}" transform="rotate(${n(random() * 90 - 45)} ${n(lx)} ${n(ly)})"`);
    }
  }
  return b + tuft(0, 2, .8) + '</g>';
}
function lamp(x, y, k = 1) {
  return `<g transform="translate(${x} ${y}) scale(${k})">` + e(5, 2, 24, 7, 'url(#shadow)') +
    r(-3, -125, 6, 124, 'url(#woodSide)', 2) + r(-8, -8, 16, 8, '#6a6450', 3) +
    e(0, -124, 49, 52, 'url(#glow)') + p('M-13-145L13-145L10-119L-10-119Z', '#eaca8b', 'stroke="#685a42" stroke-width="2"') +
    r(-5, -140, 10, 18, '#fff2b6', 2) + line('M0-144V-120M-11-133H11', '#987245', 1.3) +
    p('M-17-145L0-155L17-145Z', '#516457') + r(-13, -119, 26, 4, '#786044', 2) + '</g>';
}
function bench(x, y, k = 1) {
  let b = `<g transform="translate(${x} ${y}) scale(${k})">` + e(83, 7, 106, 20, 'url(#shadow)');
  for (const xx of [10, 146]) b += p(`M${xx}-47h7v56h-10Z`, 'url(#woodSide)');
  for (let i = 0; i < 3; i++) b += plank(0, -60 + i * 14, 165, 11);
  b += p('M-9-13H173L184 0H-19Z', 'url(#wood)') + r(-19, 0, 203, 7, 'url(#woodSide)', 2) + r(-19, -1, 203, 5, 'url(#grain)');
  for (const xx of [12, 150]) for (const yy of [-54, -26]) b += screw(xx, yy);
  return b + '</g>';
}
function planter(x, y, k = 1) {
  let b = `<g transform="translate(${x} ${y}) scale(${k})">` + e(0, 0, 34, 11, 'url(#shadow)') +
    p('M-24-34H24L18-2Q0 5-18-2Z', 'url(#woodSide)') + plank(-27, -36, 54, 7) + e(0, -36, 22, 5, '#605238');
  for (let j = 0; j < 7; j++) {
    const fx = -20 + j * 6, fy = -45 - (j % 3) * 8;
    b += line(`M${fx} -34Q${fx - 4} ${fy} ${fx + 2} ${fy - 6}`, '#6b874f', 1.3);
    for (let i = 0; i < 5; i++) b += e(fx + 2 + Math.cos(i * 1.257) * 3, fy - 6 + Math.sin(i * 1.257) * 3, 2.4, 2, j % 2 ? '#e6b4a0' : '#f0dfaa');
    b += e(fx + 2, fy - 6, 1.3, 1.3, '#a4834a');
  }
  return b + '</g>';
}
let arena = r(0, 0, 960, 540, 'url(#sky)');
arena += e(760, 82, 110, 98, 'url(#glow)') + e(760, 82, 31, 31, '#f4e9b7', 'opacity=".7"');
for (let i = 0; i < 3; i++) arena += p(`M-40 ${190 + i * 20}Q${100 + i * 80} ${20 + i * 15} ${380 + i * 10} ${160 + i * 17}Q${650 - i * 20} ${35 + i * 15} 1000 ${150 + i * 33}V350H-40Z`, ['#739589', '#678a78', '#537868'][i], `opacity="${.25 + i * .12}"`);
for (let i = 0; i < 13; i++) arena += tree(-45 + i * 84, 285 + i % 3 * 9, .7 + (i % 4) * .09, 31 + i, i % 3 === 0);
arena += p('M0 280Q220 241 480 268Q734 243 960 282V540H0Z', '#91a174');
arena += e(480, 438, 470, 96, 'url(#shadow)');
// 높낮이가 있는 원목 테라스와 두 줄 관중석.
arena += p('M75 235H885L930 290H30Z', '#7c7756') + p('M30 290H930V305H30Z', '#65694e');
for (let i = 0; i < 5; i++) arena += p(`M${75 - i * 8} ${235 + i * 11}H${885 + i * 8}L${895 + i * 8} ${243 + i * 11}H${65 - i * 8}Z`, i % 2 ? '#b5a17a' : '#c4b08a');
arena += bench(110, 246, .9) + bench(685, 246, .9) + bench(159, 205, .68) + bench(696, 205, .68);
// 벤치의 방석, 응원 수건, 공 바구니.
arena += r(135, 226, 36, 11, '#7d9c8b', 5) + r(734, 226, 34, 11, '#c9937e', 5) + p('M786 207h19v35l-6-3-6 3-7-4Z', '#d6dfc3');
for (const [xx, yy] of [[83, 269], [850, 269]]) {
  arena += p(`M${xx} ${yy - 27}h29l-4 31h-22Z`, '#8d7853');
  for (let j = 0; j < 5; j++) arena += line(`M${xx + j * 6} ${yy - 25}l2 28`, '#cab286', 1);
  arena += e(xx + 14, yy - 26, 16, 5, '#bdab7c') + e(xx + 11, yy - 33, 9, 9, '#e6d2a0', 'stroke="#859c8a" stroke-width="2"');
}
// 원목 이름판, 밧줄과 나뭇잎 문장.
arena += line('M410 125V178M550 125V178', '#77684a', 2) + plank(391, 166, 178, 40);
arena += p('M480 175Q464 166 464 180Q475 189 480 195Q485 186 497 180Q496 166 480 175Z', '#627e5e');
arena += line('M480 194V180M480 187L470 180M480 187L490 180', '#d1d9a2', .8);
// 둘레의 울타리, 꽃 화분과 따뜻한 랜턴.
for (let xx = 28; xx < 960; xx += 42) {
  arena += p(`M${xx - 4} 292V255L${xx} 249L${xx + 5} 255V292Z`, 'url(#wood)') + line(`M${xx - 1} 257V285`, '#f0d5a5', .8);
}
arena += plank(10, 262, 940, 5) + plank(10, 281, 940, 5);
arena += planter(50, 302, .85) + planter(909, 302, .85) + lamp(27, 309, 1.15) + lamp(933, 309, 1.15);
// 빛나는 전구와 박음질한 깃발.
arena += line('M-20 25Q480 162 980 25', '#5c6150', 2);
for (let i = 0; i < 25; i++) {
  const x = i * 40, t = x / 960, y = 25 + 274 * t * (1 - t);
  arena += line(`M${x} ${n(y)}v8`, '#665f46', 1.1) + e(x, y + 13, 15, 15, 'url(#glow)') + r(x - 2, n(y + 7), 4, 4, '#7c7255', 1) + e(x, y + 14, 3.5, 5, '#fff1b2');
  if (i % 2) arena += `<g transform="translate(${x + 12} ${n(y + 1)}) rotate(${n((.5 - t) * 20)})">` + p('M0 0H23L12 29Z', ['#d5a18a', '#bbc99e', '#e2c17c'][i % 3]) + line('M3 3H20L12 24Z', '#fff2c7', .6, 'stroke-dasharray="1.5 2" opacity=".65"') + '</g>';
}
// 입체적인 경계석으로 둘러싼 모래 코트.
arena += p('M57 291H903Q919 291 929 313L957 481Q963 505 940 512H20Q-3 505 3 481L31 313Q41 291 57 291Z', '#7e8762');
arena += p('M56 295H904Q917 295 923 314L949 478Q954 497 934 501H26Q6 497 11 478L37 314Q43 295 56 295Z', '#b3aa84');
for (let i = 0; i < 25; i++) {
  const x = 13 + i * 38;
  arena += p(`M${x} 488h35v12h-35Z`, i % 2 ? '#bdad85' : '#c8b994') + line(`M${x + 2} 490h31`, '#dfcda7', .8);
}
arena += p('M58 299H902Q915 299 919 315L943 475Q947 489 932 491H28Q13 489 17 475L41 315Q45 299 58 299Z', 'url(#sand)');
const random = rng(482);
for (let i = 0; i < 850; i++) {
  const x = 47 + random() * 866, y = 305 + random() * 177;
  arena += e(x, y, .35 + random() * 1.2, .25 + random() * .5, i % 3 ? '#9d885b' : '#fff3ce', `opacity="${i % 3 ? .22 : .5}"`);
}
for (let j = 0; j < 5; j++) arena += line(`M${80 + j * 4} ${329 + j * 8}Q250 ${346 + j * 7} 398 ${323 + j * 10}M562 ${324 + j * 10}Q720 ${345 + j * 8} ${880 - j * 4} ${328 + j * 8}`, '#bbaa7d', .7, 'opacity=".22"');
arena += line('M42 430H918L880 477H80ZM480 430V477', '#fff4d1', 3.1) + line('M45 432H915', '#c9b27b', .8);
arena += e(494, 444, 27, 49, 'url(#shadow)');
for (let i = 0; i < 20; i++) arena += tuft(12 + i * 49, 525 + i % 2 * 7, .6 + i % 3 * .2);
arena += planter(18, 510, .65) + planter(942, 510, .65);
const edgeMask = '<linearGradient id="fadeX"><stop stop-color="white" stop-opacity="0"/><stop offset=".025" stop-color="white"/><stop offset=".975" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient>' +
  '<linearGradient id="fadeY" x2="0" y2="1"><stop stop-color="white" stop-opacity="0"/><stop offset=".13" stop-color="white"/><stop offset=".94" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient>' +
  '<mask id="edgesX"><rect width="960" height="540" fill="url(#fadeX)"/></mask><mask id="edgesY"><rect width="960" height="540" fill="url(#fadeY)"/></mask>';
save('arena', 960, 540, '숲속 멍이 배구장 · 원목 관중석과 조명, 모래 코트', `<g mask="url(#edgesX)"><g mask="url(#edgesY)">${arena}</g></g>`, edgeMask);

// 세로 화면까지 이어지는 숲과 풀밭. 경기장 가장자리가 배경에 자연스럽게 섞인다.
let surround = r(0, 0, 960, 1400, 'url(#surroundSky)');
surround += e(720, 245, 215, 155, 'url(#glow)') + e(720, 245, 42, 42, '#eee6b7', 'opacity=".35"');
for (let i = 0; i < 3; i++) surround += p(`M-60 ${520 + i * 60}Q${180 + i * 70} ${270 + i * 45} ${530 - i * 40} ${490 + i * 35}Q750 ${340 + i * 50} 1020 ${480 + i * 55}V1400H-60Z`, ['#83a08a', '#8ea67d', '#91a174'][i], `opacity="${.18 + i * .12}"`);
surround += p('M0 970Q300 1100 610 950Q380 1170 960 1330V1400H800Q335 1205 425 1090Q180 1160 0 1060Z', '#c9c39a', 'opacity=".25"');
for (const [xx, yy, flip] of [[-25, -15, 1], [985, 50, -1]]) {
  surround += `<g transform="translate(${xx} ${yy}) scale(${flip} 1)" opacity=".3">` + line('M-5-20Q50 75 260 110M80 50Q140 30 190-15M130 83Q140 135 195 160', '#52745a', 14);
  for (let i = 0; i < 21; i++) surround += e(15 + i * 12, 70 + Math.sin(i * 2.4) * 45, 34, 15, i % 2 ? '#658b69' : '#a1b68c', `transform="rotate(${i % 2 ? -25 : 25} ${15 + i * 12} ${n(70 + Math.sin(i * 2.4) * 45)})"`);
  surround += '</g>';
}
const fieldRandom = rng(118);
for (let i = 0; i < 160; i++) {
  const x = fieldRandom() * 960, y = 970 + fieldRandom() * 430;
  surround += tuft(n(x), n(y), .3 + fieldRandom() * .5);
  if (i % 4 === 0) surround += e(x + 5, y - 6, 2.5, 2, '#e8d9a2', 'opacity=".65"');
}
surround += `<g opacity=".55">${planter(-5, 1445, 2.8)}${planter(970, 1450, 2.8)}</g>`;
save('surround', 960, 1400, '경기장으로 이어지는 숲과 햇살, 풀밭', surround, grad('surroundSky', ['#88aba4', '#c4d0b0', '#91a174', '#82936b']));

let net = e(37, 174, 27, 8, 'url(#shadow)') + p('M25 10L39 4V155L25 165Z', '#f4edce', 'opacity=".28"');
for (let yy = 10; yy < 164; yy += 9) net += line(`M25 ${yy}l14-6`, '#6f7a64', .9, 'opacity=".7"');
for (let xx = 25; xx <= 39; xx += 3.5) net += line(`M${xx} ${n(10 - (xx - 25) * .43)}v155`, '#74816b', .65, 'opacity=".65"');
net += p('M23 7L41 0V7L23 14Z', '#f9efcc') + line('M25 10L40 4', '#b8b997', .6, 'stroke-dasharray="1 2"');
for (const [xx, yy] of [[19, 11], [42, 2]]) {
  net += r(xx, yy, 5, 167, 'url(#wood)', 2) + r(xx + 1, yy + 1, 1, 163, '#edd19b', .5);
  net += r(xx - 2, yy + 143, 9, 22, '#5c7463', 2) + e(xx + 2.5, yy, 4, 3, '#e1c18b');
  for (const dy of [11, 72, 139]) net += line(`M${xx - 1} ${yy + dy}h7m-7 2h7m-7 2h7`, '#d9d9b6', .7);
  net += screw(xx + 2.5, yy + 158);
}
save('net', 64, 188, '배구 네트의 짜임, 테이프와 원목 기둥', net);
let ball = e(32, 32, 29.5, 29.5, 'url(#ballLight)', 'stroke="#8f8661" stroke-width="1.3"');
for (let i = 0; i < 3; i++) ball += `<g transform="rotate(${i * 120} 32 32)">` + p('M32 2.5C52 10 60 31 43 56C55 48 61.5 41 61.5 32C61.5 17 49 4 32 2.5Z', ['#6b9b8e', '#d5a17c', '#a4b58a'][i]) + line('M32 3C46 15 48 35 32 61M33 3C55 12 62 35 43 56', '#776f51', .8, 'opacity=".65"') + line('M34 5C45 16 46 33 38 47', '#fff2cc', .9, 'opacity=".45"') + '</g>';
ball += e(22, 17, 8, 4, '#fffbea', 'opacity=".62" transform="rotate(-38 22 17)"');
save('ball', 64, 64, '가죽 패널과 봉제선이 있는 캠프 배구공', ball, '<radialGradient id="ballLight" cx="30%" cy="22%" r="80%"><stop stop-color="#fff8df"/><stop offset=".65" stop-color="#f0dca9"/><stop offset="1" stop-color="#bfa26d"/></radialGradient>');
let park = bench(115, 84, .8) + bench(1120, 84, .8) + lamp(32, 226, .95) + lamp(1368, 226, .95) + lamp(32, 816, .95) + lamp(1368, 816, .95);
park += planter(330, 91, .9) + planter(1080, 91, .9) + planter(39, 510, .8) + planter(1364, 510, .8);
park += plank(579, 43, 242, 52) + line('M597 50v37M803 50v37', '#f4dca7', 1) + screw(590, 54) + screw(810, 54) + screw(590, 86) + screw(810, 86);
for (const x of [320, 1080]) {
  park += e(x, 861, 47, 12, 'url(#shadow)') + p(`M${x - 28} 824h56l-4 32h-48Z`, 'url(#woodSide)') + plank(x - 32, 819, 64, 10);
  park += r(x - 23, 830, 46, 20, 'url(#grain)', 1) + line(`M${x} 829v22`, '#edce98', 1);
}
save('park-details', 1400, 900, '숨바꼭질 정원의 벤치, 꽃 화분과 원목 랜턴', park);
