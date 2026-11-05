/* 놀이터 원본 SVG. node tools/build-playground-art.js 로 정적 자산을 다시 만든다.
   외부 그림·글꼴·필터 없이 곡선, 재료 결, 빛과 그림자를 벡터로 쌓는다. */
'use strict';
const fs = require('fs');
const path = require('path');
const out = path.resolve(__dirname, '../assets/playground');
fs.mkdirSync(out, { recursive: true });
const n = v => +v.toFixed(2);
const rng = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const p = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const e = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}" ${extra}/>`;
const line = (d, color, width = 1, extra = '') => p(d, 'none', `stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}`);
const rect = (x, y, w, h, fill, rx = 0, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;
const linear = (id, colors, x2 = '0%', y2 = '100%') => `<linearGradient id="${id}" x2="${x2}" y2="${y2}">${colors.map((c, i) => `<stop offset="${i / (colors.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const common = linear('bark', ['#d4ab75', '#a57448', '#72513c'], '100%', '0%') +
  linear('wood', ['#dcb686', '#bd905e', '#a47549']) + linear('woodTop', ['#ebd0a4', '#c49b69'], '100%', '100%') +
  linear('woodSide', ['#ab8053', '#79583d'], '100%', '100%') +
  linear('leaf', ['#a8ba79', '#759960', '#416c4c']) + linear('leafDark', ['#73945b', '#436c4a', '#31543e']) +
  linear('leafLight', ['#c5cd8b', '#92ac69', '#628753']) +
  '<radialGradient id="shadow"><stop stop-color="#263c2b" stop-opacity=".24"/><stop offset="1" stop-color="#263c2b" stop-opacity="0"/></radialGradient>' +
  '<radialGradient id="lampGlow"><stop stop-color="#ffdd92" stop-opacity=".48"/><stop offset=".3" stop-color="#ffdd92" stop-opacity=".18"/><stop offset="1" stop-color="#ffdd92" stop-opacity="0"/></radialGradient>' +
  '<pattern id="grain" width="76" height="28" patternUnits="userSpaceOnUse"><path d="M-10 8Q8 3 25 7T83 5M-7 22Q11 16 27 20T86 19M20 11Q31 8 44 12M45 25Q55 22 67 24" fill="none" stroke="#65472f" stroke-opacity=".19" stroke-width=".7"/><path d="M0 10Q22 6 37 10T79 8M-6 24Q12 21 32 24" fill="none" stroke="#fff0c4" stroke-opacity=".23" stroke-width=".6"/></pattern>';
function save(name, w, h, title, defs, body) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title"><title id="title">${title}</title><defs>${common}${defs}</defs><g stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>\n`;
  fs.writeFileSync(path.join(out, name + '.svg'), svg);
  console.log(`${name}.svg: ${Buffer.byteLength(svg)} bytes`);
}
function screw(x, y, r = 1.8) {
  return e(x, y + .5, r + .5, r, '#644e36') + e(x, y - .3, r, r, '#c4baa0') + line(`M${x - r * .55} ${y - .3}h${r * 1.1}`, '#716d5d', .6);
}
function tuft(x, y, k = 1, color = '#688956') {
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${k})">` + p('M-10 1Q-10-6-16-11Q-7-9-4-3Q-6-13-1-18Q1-9 2-3Q8-13 14-13Q8-5 8 1Z', color) + line('M-4 0Q-3-6-2-10M5 0Q6-4 9-7', '#c8cf91', .6, 'opacity=".4"') + '</g>';
}
function leaves(cx, cy, rx, ry, seed, count, palette) {
  const rand = rng(seed);
  let s = '';
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()), x = n(cx + Math.cos(a) * rx * r), y = n(cy + Math.sin(a) * ry * r);
    const len = n(3 + rand() * 7), angle = n(-65 + rand() * 130), c = palette[i % palette.length];
    s += `<g transform="translate(${x} ${y}) rotate(${angle})">${p(`M0 0Q-${len * .4}-${len * .7} 0-${len}Q${len * .7}-${len * .25} 0 0`, c)}${i % 3 ? '' : line(`M0-.5v-${len * .65}`, '#e1d9a4', .55, 'opacity=".35"')}</g>`;
  }
  return s;
}
function crown(x, y, rx, ry, seed, fill, leafCount = 30) {
  const rand = rng(seed), pts = Array.from({ length: 18 }, (_, i) => {
    const a = i / 18 * Math.PI * 2, radius = .91 + rand() * .17;
    return [n(x + Math.cos(a) * rx * radius), n(y + Math.sin(a) * ry * radius)];
  });
  const mid = (a, b) => [n((a[0] + b[0]) / 2), n((a[1] + b[1]) / 2)];
  let d = `M${mid(pts.at(-1), pts[0]).join(' ')}`;
  for (let i = 0; i < pts.length; i++) d += `Q${pts[i].join(' ')} ${mid(pts[i], pts[(i + 1) % pts.length]).join(' ')}`;
  d += 'Z';
  return p(d, fill, 'stroke="#405b40" stroke-opacity=".6" stroke-width="1.3"') +
    line(`M${n(x - rx * .64)} ${n(y - ry * .56)}Q${x} ${n(y - ry * 1.05)} ${n(x + rx * .4)} ${n(y - ry * .8)}`, '#e1dfac', 1.2, 'opacity=".3"') +
    leaves(x, y, rx * .85, ry * .81, seed + 7, leafCount, ['#c1cb8a', '#a2b774', '#74965c', '#8aa866', '#4e794e']);
}
function flower(x, y, color, k = 1) {
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${k})">${Array.from({ length: 5 }, (_, i) => `<ellipse cy="-3" rx="1.9" ry="3" fill="${color}" transform="rotate(${i * 72})"/>`).join('')}${e(0, 0, 1.7, 1.7, '#dcc47e')}</g>`;
}

// 줄기에서 뻗은 가지 위에 밝기가 다른 잎 무리를 겹친다.
{
  let body = e(136, 313, 83, 22, 'url(#shadow)');
  body += p('M108 307Q124 288 119 247L116 143 139 140 146 245Q143 283 159 308L139 303 132 312 123 304Z', 'url(#bark)', 'stroke="#66543a" stroke-width="1.8"');
  body += p('M121 221Q100 197 78 186L71 171Q104 178 128 204L128 170 143 160 138 228Z', '#aa7f50', 'stroke="#71563b" stroke-width="1.2"');
  body += p('M136 201Q162 182 181 153L185 166Q167 198 138 218Z', '#8a6743', 'stroke="#71563b" stroke-width="1.2"');
  for (const [x, y, len] of [[124, 154, 78], [132, 202, 63], [140, 244, 55], [119, 247, 36], [128, 270, 31]])
    body += line(`M${x} ${y}q-4 ${len / 3} 0 ${len * .65}t-2 ${len * .35}`, '#674c33', .9, 'opacity=".55"');
  body += line('M123 231Q132 236 123 248Q118 240 123 231M125 235Q129 239 124 244', '#805c3b', 1);
  body += line('M123 160Q120 196 128 218M135 236Q133 273 139 293', '#e8c697', 1, 'opacity=".55"');
  body += p('M116 297Q114 289 121 279L126 297Z', '#7a8c51');
  const groups = [[73, 148, 57, 44, 21, 'leafDark'], [175, 143, 62, 48, 42, 'leafDark'], [119, 114, 91, 62, 36, 'leaf'], [66, 106, 50, 45, 61, 'leaf'], [189, 104, 54, 47, 74, 'leaf'], [93, 64, 59, 43, 52, 'leafLight'], [158, 58, 63, 45, 85, 'leafLight'], [132, 34, 45, 25, 94, 'leafLight']];
  for (const [x, y, rx, ry, seed, fill] of groups) body += crown(x, y, rx, ry, seed, `url(#${fill})`, 32);
  body += line('M55 144q21 13 36 8M166 136q20-3 30-16', '#d0ce90', 1, 'opacity=".2"');
  body += tuft(105, 309, .6) + tuft(156, 310, .5);
  body += e(162, 312, 9, 3.6, '#9ca282') + e(164, 310, 7, 2, '#c7c7a4');
  body += flower(91, 309, '#efdeb5', .55);
  save('tree', 260, 340, '햇빛이 잎과 나뭇결에 내려앉은 놀이터의 나무', '', body);
}

{
  let body = e(126, 135, 109, 26, 'url(#shadow)');
  body += p('M70 132Q79 98 108 90M122 132Q122 96 158 79M155 133Q151 111 189 104', 'none', 'stroke="#796d44" stroke-width="3.2"');
  for (const [x, y, rx, ry, seed, fill] of [[67, 109, 46, 28, 12, 'leafDark'], [169, 103, 48, 33, 41, 'leafDark'], [121, 82, 61, 45, 36, 'leaf'], [64, 76, 41, 30, 55, 'leaf'], [174, 64, 38, 32, 67, 'leaf'], [117, 47, 48, 33, 78, 'leafLight']])
    body += crown(x, y, rx, ry, seed, `url(#${fill})`, 24);
  for (const [x, y, color] of [[62, 57, '#f0dec6'], [149, 44, '#e7c7ad'], [181, 76, '#efe3c3'], [90, 96, '#edd6b7']]) body += flower(x, y, color, .75);
  body += tuft(29, 133, .7) + tuft(202, 132, .65);
  body += line('M21 130q14 3 21-3M183 136q19 2 31-3', '#a8b77b', 1);
  save('bush', 240, 170, '작은 꽃과 겹겹의 잎이 있는 숨바꼭질 덤불', '', body);
}

{
  const front = 'M23 53L165 82V151L23 121Z', top = 'M23 53L66 22 208 50 165 82Z', side = 'M165 82L208 50V118L165 151Z';
  let body = e(121, 144, 108, 21, 'url(#shadow)') + p(side, 'url(#woodSide)', 'stroke="#73563b" stroke-width="1.4"') + p(top, 'url(#woodTop)', 'stroke="#87623e" stroke-width="1.4"') + p(front, 'url(#wood)', 'stroke="#73563b" stroke-width="1.5"');
  body += p(front, 'url(#grain)') + p(top, 'url(#grain)');
  body += '<g clip-path="url(#frontClip)">';
  for (let i = 1; i <= 3; i++) {
    const y = 53 + i * 17;
    body += line(`M23 ${y}l142 29`, '#87633f', 1.4) + line(`M25 ${y + 1.5}l138 28.5`, '#f0d2a3', .65, 'opacity=".6"');
  }
  body += p('M29 56L42 59 159 140 157 150 145 147 29 69Z', '#8d6641', 'opacity=".36"');
  body += p('M28 54L39 57 160 140 160 151 147 148 28 66Z', 'url(#woodTop)', 'stroke="#a47b4c" stroke-width=".9"');
  body += line('M34 58L155 143', '#f7deaf', 1, 'opacity=".7"');
  body += p('M29 110L149 81 161 83 160 94 39 124 29 121Z', 'url(#woodTop)', 'stroke="#a47b4c" stroke-width=".9"');
  body += line('M37 114L156 85', '#f7deaf', 1, 'opacity=".65"') + '</g>';
  body += line('M169 90l35-25M169 110l35-25M169 131l35-26', '#654d37', 1.1);
  body += line('M169 92l35-25M169 112l35-25', '#d9b785', .65, 'opacity=".5"');
  body += line('M63 27L196 53M52 35L184 62M40 44L174 71', '#a17c50', 1.1);
  body += p('M19 51L28 48 170 77 166 86 24 57Z', '#e9c594', 'stroke="#b18a57" stroke-width=".8"');
  body += p('M22 114L164 143 164 152 22 123Z', '#b48b59', 'stroke="#8b653f" stroke-width=".9"');
  for (const [x, y] of [[32, 60], [154, 86], [32, 116], [153, 142], [179, 82], [198, 69], [181, 130], [198, 116]]) body += screw(x, y, 1.6);
  body += p('M189 57l10-7 8 2-11 8Z', '#7b7868') + line('M198 53l4 .7', '#d3cbb2', .7);
  save('crate', 230, 176, '면마다 다른 나뭇결과 덧댄 판재, 나사가 보이는 나무 상자', `<clipPath id="frontClip">${p(front, '#fff')}</clipPath>`, body);
}

{
  let body = e(123, 129, 115, 20, 'url(#shadow)');
  const log = (x, y, len, r, seed) => {
    const rand = rng(seed);
    let s = p(`M${x} ${y - r}Q${x + len / 2} ${y - r - 8} ${x + len} ${y - r + 3}L${x + len} ${y + r}Q${x + len / 2} ${y + r - 3} ${x} ${y + r - 1}Z`, 'url(#bark)', 'stroke="#745237" stroke-width="1.2"');
    for (let i = 0; i < 8; i++) {
      const yy = n(y - r + 3 + rand() * (r * 2 - 6));
      s += line(`M${x + 3} ${yy}q${n(len * .28)} -3 ${n(len * .51)} -1t${n(len * .47 - 5)} 1`, i % 2 ? '#6f4f35' : '#e1b981', .75, `opacity="${i % 2 ? .55 : .4}"`);
    }
    s += e(x + len, y + 1, r * .67, r, '#705137') + e(x + len - .8, y, r * .56, r - 2, '#ddbb87');
    for (const u of [.27, .48, .71]) s += e(x + len - .5, y, r * .56 * u, (r - 2) * u, 'none', 'stroke="#a88255" stroke-width=".8"');
    s += line(`M${x + len - r * .45} ${y + r * .32}l${r * .4}-${r * .25}m1-1 2-6`, '#997347', .7);
    return s;
  };
  body += log(35, 57, 151, 18, 12) + log(25, 88, 170, 21, 24) + log(21, 116, 182, 20, 36);
  body += p('M95 37Q85 81 91 131L98 131Q94 81 102 37Z', '#68543a', 'opacity=".35"');
  body += line('M98 39Q88 83 94 131', '#ddc394', 4) + line('M99 39Q90 83 96 130', '#ad966d', 1.1);
  for (let y = 44; y < 129; y += 6) body += line(`M${y < 80 ? 97 - (y - 40) * .12 : 92 + (y - 80) * .04} ${y}l3 1.7`, '#8c7755', .85);
  body += tuft(32, 134, .6) + tuft(195, 137, .48);
  save('logs', 240, 156, '거친 껍질과 나이테, 묶은 밧줄이 보이는 장작 더미', '', body);
}

{
  let body = e(247, 275, 213, 32, 'url(#shadow)');
  // 기둥의 사면과 깎아 낸 끝, 감아 둔 밧줄.
  for (const x of [76, 390]) {
    body += p(`M${x} 63L${x + 16} 59 ${x + 23} 65V267L${x + 14} 272 ${x} 268Z`, 'url(#bark)', 'stroke="#71583b" stroke-width="1.5"');
    body += rect(x + 1, 65, 14, 198, 'url(#grain)');
    body += line(`M${x + 4} 74v175M${x + 14} 97q-3 27 0 58t-1 83`, '#f2d19a', 1, 'opacity=".45"');
    body += line(`M${x + 18} 67v198`, '#624d34', 1.5, 'opacity=".6"');
    for (let y = 115; y < 135; y += 4) body += line(`M${x - 2} ${y}q12 7 26 0`, '#dac397', 3.1) + line(`M${x - 2} ${y + 1}q12 7 26 0`, '#97815c', .7);
    body += screw(x + 8, 86, 2) + screw(x + 8, 238, 2);
  }
  const board = 'M60 63L84 48 399 48 421 62 415 119 66 119Z';
  body += p('M61 68L83 53 398 53 419 66 414 125 65 125Z', '#725138');
  body += p(board, 'url(#wood)', 'stroke="#6e5339" stroke-width="2"') + p(board, 'url(#grain)');
  body += p('M59 61L82 44 400 44 423 60 420 67 399 52 84 52 62 68Z', '#d9b783', 'stroke="#9b7446" stroke-width="1.2"');
  body += line('M74 112h334M80 61h317', '#f2d3a1', 1.2, 'opacity=".65"');
  body += rect(154, 58, 172, 51, '#7d5e3e', 8, 'opacity=".7"') + rect(157, 60, 166, 46, '#47664c', 6, 'stroke="#dab783" stroke-width="1.4"');
  body += '<text x="241" y="92" text-anchor="middle" font-family="Malgun Gothic,Apple SD Gothic Neo,sans-serif" font-size="28" font-weight="700" letter-spacing="5" fill="#fff0c9">놀이터</text>';
  for (const x of [110, 371]) {
    body += e(x, 85, 17, 17, '#ba8d57', 'stroke="#ecc792" stroke-width="1"');
    body += p(`M${x - 7} 88q-2-5 2-7l4-1 5 3q4 6-2 8Z`, '#f0d5a2');
    for (const [dx, dy] of [[-9, -6], [-3, -11], [5, -10], [11, -4]]) body += e(x + dx, 85 + dy, 2.8, 3.8, '#f0d5a2', `transform="rotate(${dx * 2} ${x + dx} ${85 + dy})"`);
  }
  for (const [x, y] of [[76, 72], [405, 72], [76, 109], [405, 109]]) body += screw(x, y, 2.3);
  body += line('M85 137Q240 197 401 137', '#665b3d', 2.2) + line('M87 136Q240 194 399 136', '#d6c79b', .7);
  for (let i = 0; i < 9; i++) {
    const x = 98 + i * 34, y = n(142 + Math.sin(i / 8 * Math.PI) * 26);
    const color = ['#d99b7c', '#d8bf7d', '#91a581'][i % 3];
    body += p(`M${x - 12} ${y}q12 3 25-1l-6 34-8-5-6 5Z`, color, 'stroke="#736c4b" stroke-width=".7"');
    body += line(`M${x - 9} ${y + 3}l4 23m4 3 7-25`, '#f7e4bd', .7, 'opacity=".55"');
    body += p(`M${x - 11} ${y}l3 5 20-2-2-4Z`, '#f5d5a4', 'opacity=".25"');
  }
  // 황동 뚜껑이 있는 작은 등불과 투명하게 퍼지는 빛.
  for (const x of [58, 425]) {
    body += e(x, 152, 50, 54, 'url(#lampGlow)') + line(`M${x < 100 ? 80 : 402} 114H${x}v16`, '#6c6045', 2.2);
    body += p(`M${x - 8} 137l8-6 8 6 2 28-10 4-10-4Z`, '#7c7353', 'stroke="#574f3b" stroke-width="1.1"');
    body += rect(x - 7, 142, 14, 20, '#f4d99a', 2) + rect(x - 4, 144, 8, 17, '#fff1c4', 1);
    body += line(`M${x} 141v23M${x - 7} 153h14`, '#9e8d5c', 1) + line(`M${x - 10} 138h20M${x - 10} 165h20`, '#d6c495', 1);
  }
  body += crown(50, 263, 40, 24, 511, 'url(#leafDark)', 21) + crown(420, 263, 41, 26, 522, 'url(#leafDark)', 22);
  body += crown(33, 247, 25, 22, 544, 'url(#leaf)', 14) + crown(442, 246, 28, 24, 555, 'url(#leaf)', 15);
  body += flower(45, 242, '#efddbb', .8) + flower(426, 250, '#e8d3b0', .8);
  body += tuft(97, 274, .8) + tuft(385, 275, .75);
  for (const [x, y, rx, ry] of [[189, 279, 23, 7], [240, 291, 25, 8], [290, 278, 22, 7]])
    body += e(x, y + 2, rx + 1, ry, '#7e896c', 'opacity=".5"') + e(x, y, rx, ry, '#c4c0a1', 'stroke="#92997a" stroke-width=".8"') + line(`M${x - rx * .6} ${y - 2}q${rx * .6}-${ry * .5} ${rx * 1.15}-1`, '#ede0ba', .9);
  save('gate', 480, 320, '나무 간판과 발바닥 장식, 천 깃발과 랜턴이 있는 놀이터 입구', '', body);
}
