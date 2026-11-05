/* 숲속 배움터의 원목 바닥·창가·책장·식물·조명을 SVG로 만든다. */
'use strict';
const fs = require('fs'), path = require('path');
const rect = (x, y, w, h, fill, rx = 0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" rx="${rx}"/>`;
const line = (d, color, w = 1, extra = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;
const ellipse = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const gradient = (id, colors) => `<linearGradient id="${id}" x2="0" y2="1">${colors.map((c, i) => `<stop offset="${i / (colors.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const defs = gradient('wall', ['#d5ddc6', '#ece6cc', '#c6cfb4']) + gradient('floor', ['#ceb78d', '#d9c39a', '#bca27c']) + gradient('wood', ['#e0c599', '#ad8759', '#896c49']) + gradient('window', ['#9cbcb0', '#dce5c5', '#f1e3b9']) +
  '<radialGradient id="light"><stop stop-color="#fff4c6" stop-opacity=".6"/><stop offset="1" stop-color="#fff4c6" stop-opacity="0"/></radialGradient><pattern id="grain" width="170" height="35" patternUnits="userSpaceOnUse"><path d="M-10 8Q30 0 75 8T180 5M-10 23Q40 12 90 21T180 23" fill="none" stroke="#8a714e" stroke-width=".8" opacity=".2"/><path d="M5 11Q40 5 80 12T170 10" fill="none" stroke="#fff2d1" stroke-width="1" opacity=".35"/></pattern>';
let body = rect(0, 0, 1400, 1000, 'url(#wall)');
body += rect(0, 425, 1400, 575, 'url(#floor)');
for (let i = -6; i < 18; i++) body += line(`M${700 + i * 54} 425L${700 + i * 118} 1000`, '#9f825c', 1.5, 'opacity=".32"');
for (let i = 0; i < 9; i++) { const y = 433 + i * i * 8; body += line(`M0 ${y}H1400`, '#a88960', 1.1, 'opacity=".28"'); }
body += rect(0, 425, 1400, 575, 'url(#grain)');
body += rect(0, 411, 1400, 17, 'url(#wood)') + line('M0 411H1400', '#fff0cf', 2);
for (const x of [70, 1105]) {
  body += rect(x - 10, 118, 235, 257, 'url(#wood)', 112) + rect(x, 127, 215, 238, 'url(#window)', 103);
  for (let i = 0; i < 10; i++) {
    const xx = x + 12 + i * 22, yy = 315 + i % 3 * 15;
    body += line(`M${xx} ${yy + 30}v-100`, '#859d78', 5) + ellipse(xx, yy - 65, 28, 55, i % 2 ? '#a2b38b' : '#7d9b81', 'opacity=".8"');
  }
  body += line(`M${x + 107} 128V365M${x} 264H${x + 215}`, '#e3cea5', 7);
  body += rect(x - 22, 365, 260, 15, 'url(#wood)', 4) + ellipse(x + 110, 380, 148, 20, '#ad9d7333');
  body += `<path d="M${x + 15} 166L${x + 85} 138L${x + 205} 360L${x + 125} 360Z" fill="#fff5cf" opacity=".16"/>`;
}
// 손으로 이은 원목 들보와 책장.
body += rect(0, 47, 1400, 23, 'url(#wood)', 5) + rect(34, 0, 24, 430, 'url(#wood)', 5) + rect(1342, 0, 24, 430, 'url(#wood)', 5);
for (const x of [56, 1158]) {
  body += ellipse(x + 96, 510, 135, 25, '#796c4630') + rect(x, 384, 194, 132, 'url(#wood)', 8) + rect(x + 12, 394, 170, 106, '#8b7957', 3);
  for (let row = 0; row < 2; row++) {
    for (let j = 0; j < 12; j++) {
      const xx = x + 16 + j * 13, yy = 439 + row * 54, height = 28 + j % 4 * 4;
      body += rect(xx, yy - height, 10, height, ['#94ab92', '#cfb28c', '#9ea9a1', '#d4c39d', '#c2927d'][j % 5], 1);
      body += line(`M${xx + 2} ${yy - height + 6}h6M${xx + 2} ${yy - 5}h6`, '#f5e7c1', .8);
    }
    body += rect(x + 8, 440 + row * 54, 178, 6, 'url(#wood)', 2);
  }
}
function plant(x, y) {
  let p = ellipse(x, y + 4, 52, 12, '#6d714e25') + `<path d="M${x - 31} ${y - 43}h62l-9 44q-22 12-44 0Z" fill="url(#wood)"/>` + rect(x - 35, y - 49, 70, 12, '#c9aa78', 4);
  for (let i = 0; i < 12; i++) {
    const xx = x + Math.sin(i * 2.4) * 37, yy = y - 58 - i % 4 * 17;
    p += line(`M${x} ${y - 43}Q${xx} ${yy} ${xx} ${yy - 20}`, '#6e8b61', 2) + ellipse(xx, yy - 20, 12, 28, i % 2 ? '#819c70' : '#a0b47e', `transform="rotate(${i % 2 ? 32 : -32} ${xx} ${yy - 20})"`);
  }
  return p;
}
body += plant(315, 456) + plant(1085, 456) + plant(10, 902) + plant(1390, 902);
body += line('M240 0V78M1160 0V78', '#8e8665', 2);
for (const x of [240, 1160]) body += ellipse(x, 138, 130, 105, 'url(#light)') + `<path d="M${x - 40} 108Q${x - 22} 72 ${x} 76Q${x + 22} 72 ${x + 40} 108Z" fill="#849879"/>` + ellipse(x, 108, 40, 7, '#ead6a2') + ellipse(x, 111, 13, 5, '#fff2bd');
body += line('M250 45Q700 160 1150 45', '#9b9676', 1.5);
for (let i = 0; i < 19; i++) { const x = 250 + i * 50, t = i / 18, y = 45 + 230 * t * (1 - t); body += ellipse(x, y + 5, 20, 20, 'url(#light)') + ellipse(x, y + 5, 3, 5, '#fff0b9'); }
body += ellipse(700, 745, 450, 260, 'url(#light)');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1000" viewBox="0 0 1400 1000" role="img" aria-labelledby="title"><title id="title">숲속 배움터 · 햇살이 드는 원목 교실과 책장, 창가의 식물</title><defs>${defs}</defs>${body}</svg>\n`;
fs.writeFileSync(path.join(__dirname, '../assets/learning-room.svg'), svg); console.log('learning-room.svg');
