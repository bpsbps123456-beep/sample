/* 메인 캠프와 같은 해 질 녘 팔레트로 그리는 숲속 원목 배움터. */
'use strict';
const fs = require('fs'), path = require('path');
const rect = (x,y,w,h,fill,rx=0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" rx="${rx}"/>`;
const line = (d,c,w=1,extra='') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const oval = (x,y,rx,ry,fill,extra='') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const grad = (id,colors) => `<linearGradient id="${id}" x2="0" y2="1">${colors.map((c,i)=>`<stop offset="${i/(colors.length-1)}" stop-color="${c}"/>`).join('')}</linearGradient>`;
let defs = grad('wall',['#344944','#43574c','#34463f']) + grad('floor',['#89745f','#a08a70','#756554']) + grad('wood',['#b69a76','#8b7056','#6b5342']) + grad('sky',['#243948','#526b68','#819087']) + grad('pot',['#b28c70','#87654f']);
defs += '<radialGradient id="light"><stop stop-color="#ffd49b" stop-opacity=".3"/><stop offset="1" stop-color="#ffd49b" stop-opacity="0"/></radialGradient><radialGradient id="shade"><stop offset=".25" stop-color="#15292a" stop-opacity="0"/><stop offset="1" stop-color="#15292a" stop-opacity=".38"/></radialGradient><pattern id="grain" width="190" height="56" patternUnits="userSpaceOnUse"><path d="M-10 15Q50 3 105 13T205 12M-10 42Q45 30 100 40T200 40" fill="none" stroke="#473f37" stroke-width=".8" opacity=".17"/><path d="M12 18Q60 10 120 18" fill="none" stroke="#e0c69a" stroke-width=".8" opacity=".15"/></pattern>';
let body = rect(0,0,1400,1000,'url(#wall)');
for(let x=0;x<1400;x+=70) body += line(`M${x} 0V330`,'#283e39',1,'opacity=".35"');
function tree(x,y,s,fill) {
  return `<g transform="translate(${x} ${y}) scale(${s})">${rect(-3,-60,6,72,'#35443b',2)}<path d="M0-142Q-18-138-17-118Q-36-106-29-85Q-49-62-35-46Q-52-24-34-14Q0-2 34-14Q52-24 35-46Q49-62 29-85Q36-106 17-118Q18-138 0-142Z" fill="${fill}" stroke="#293c39" stroke-width="2"/></g>`;
}
// 벽을 가로지르는 파노라마 창. 창틀 너머로 숲과 달빛이 이어진다.
for(const [i,x,w] of [[1,70,1260]]) {
  defs += `<clipPath id="window${i}">${rect(x,76,w,224,'#fff',28)}</clipPath>`;
  body += rect(x-10,66,w+20,246,'#223b36',36) + rect(x-5,71,w+10,236,'url(#wood)',32);
  let view = rect(x,76,w,224,'url(#sky)',28);
  for(let j=0;j<17;j++) view += oval(x+(j*59+21)%w,88+(j*31)%82,j%4?1:1.6,j%4?1:1.6,'#e8dfbe','opacity=".6"');
  if(i===1) view += oval(877,124,21,21,'#e4dfc1','opacity=".85"') + oval(884,118,18,19,'#3d555b');
  view += `<path d="M${x} 234Q${x+w*.3} 141 ${x+w*.55} 220T${x+w} 198V310H${x}Z" fill="#4b6860"/>`;
  for(let j=0;j<Math.ceil(w/46)+2;j++) view += tree(x+j*47-10,289+j%3*10,.65+j%4*.12,['#3c5d51','#36594e','#426456'][j%3]);
  view += `<path d="M${x} 284Q${x+w/2} 260 ${x+w} 280V310H${x}Z" fill="#314e42"/><path d="M${x+14} 82L${x+w*.3} 82L${x+w*.7} 300H${x+w*.5}Z" fill="#f2e6bb" opacity=".035"/>`;
  body += `<g clip-path="url(#window${i})">${view}</g>`;
  for(let xx=x+w/8;xx<x+w-5;xx+=w/8) body += line(`M${xx} 77V300`,'#8e795f',5) + line(`M${xx+2} 80V297`,'#c1a780',1);
  body += line(`M${x} 226H${x+w}`,'#927b60',6) + rect(x-16,301,w+32,13,'url(#wood)',4) + line(`M${x-12} 302H${x+w+12}`,'#ccb18a',1);
}
body += rect(0,327,1400,673,'url(#floor)');
// 원근을 따라 이어지는 바닥 이음매, 못과 나뭇결.
for(let i=-12;i<=12;i++) body += line(`M${700+i*43} 327L${700+i*140} 1000`,'#4f4940',1.2,'opacity=".45"');
for(let i=0;i<11;i++) {
  const y=328+i*i*6.8;
  body += line(`M0 ${y}H1400`,'#584a3d',1.2,'opacity=".42"') + line(`M0 ${y+2}H1400`,'#d0b28b',1,'opacity=".25"');
  for(let j=0;j<13;j++) body += oval((j*137+i%2*60)%1400,y+5,1.1,.8,'#504c41','opacity=".55"');
}
body += rect(0,327,1400,673,'url(#grain)') + rect(0,315,1400,15,'url(#wood)') + line('M0 316H1400','#c3a47e',2);
for(const x of [62,1144]) {
  body += oval(x+96,477,124,21,'#233a3240') + rect(x,337,194,135,'url(#wood)',7) + rect(x+10,348,174,109,'#514b3f',3);
  for(let row=0;row<2;row++) {
    for(let j=0;j<11;j++) {
      const xx=x+16+j*14, yy=396+row*53, h=26+(j*7+row)%15;
      body += rect(xx,yy-h,11,h,['#728c77','#af9370','#8c9992','#b99f7a','#a47764'][j%5],1) + line(`M${xx+2} ${yy-h+6}h7M${xx+2} ${yy-5}h7`,'#d6c7a5',.7);
    }
    body += rect(x+7,398+row*53,180,6,'url(#wood)',1);
  }
  body += rect(x+8,469,13,12,'#67513e',2) + rect(x+173,469,13,12,'#67513e',2);
}
// 손바느질 테두리의 타원 러그.
body += oval(700,713,461,224,'#384c4236') + oval(700,699,451,218,'#687e69') + oval(700,699,435,208,'#8f9a78') + oval(700,699,426,203,'#73836c') + oval(700,699,409,193,'#7a876d');
for(let i=0;i<100;i++) {
  const a=i*Math.PI/50, x=700+Math.cos(a)*432, y=699+Math.sin(a)*206;
  body += line(`M${x} ${y}l${Math.cos(a)*5} ${Math.sin(a)*3}`,'#c3ba94',1.3,'opacity=".65"');
}
for(let i=-5;i<=5;i++) body += `<path d="M${700+i*59} 519q-65 177 0 360" fill="none" stroke="#c0bc9544" stroke-width="1"/>`;
function plant(x,y,scale=1) {
  let p = oval(0,5,50,12,'#233a3255') + '<path d="M-30-43H30L23 0Q0 12-23 0Z" fill="url(#pot)" stroke="#634f40" stroke-width="2"/>' + rect(-34,-49,68,12,'#b09572',4) + line('M-17-32L-14-2M17-32L14-2','#c6a482',1,'opacity=".5"');
  for(let i=0;i<11;i++) {
    const xx=Math.sin(i*2.4)*39, yy=-59-i%4*19;
    p += line(`M0-44Q${xx} ${yy} ${xx} ${yy-18}`,'#49674d',2) + oval(xx,yy-18,12,27,i%2?'#64866a':'#86a078',`stroke="#45644d" stroke-width="1.3" transform="rotate(${i%2?32:-32} ${xx} ${yy-18})"`);
  }
  return `<g transform="translate(${x} ${y}) scale(${scale})">${p}</g>`;
}
body += plant(293,413,.78) + plant(1107,413,.78) + plant(40,913,1.4) + plant(1360,913,1.4);
body += rect(0,29,1400,23,'url(#wood)',3) + rect(29,0,25,331,'url(#wood)',3) + rect(1346,0,25,331,'url(#wood)',3);
for(const x of [42,1358]) for(const y of [40,315]) body += oval(x,y,3,3,'#4d4b3e') + line(`M${x-2} ${y}h4`,'#baa17a',1);
body += line('M150 35Q700 139 1250 35','#343d35',2);
for(let i=0;i<23;i++) {
  const x=150+i*50,t=i/22,y=35+208*t*(1-t);
  body += line(`M${x} ${y}v7`,'#403e33',1.5) + oval(x,y+12,27,27,'url(#light)') + rect(x-3,y+5,6,5,'#8c7759',2) + oval(x,y+13,3.8,5.5,'#f5d2a0');
}
for(const x of [168,1232]) body += oval(x,322,200,200,'url(#light)') + line(`M${x} 52V143`,'#373f35',2) + `<path d="M${x-37} 177Q${x-23} 142 ${x} 143Q${x+23} 142 ${x+37} 177Z" fill="#637769" stroke="#354d42" stroke-width="2"/>` + oval(x,177,37,6,'#b69c75') + oval(x,181,15,5,'#f5d0a0');
body += oval(700,570,540,480,'url(#light)') + rect(0,0,1400,1000,'url(#shade)');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1000" viewBox="0 0 1400 1000" role="img" aria-labelledby="title"><title id="title">숲속 배움터 · 해 질 녘 숲과 달이 보이는 원목 교실, 책장과 손바느질 러그, 따뜻한 줄전구</title><defs>${defs}</defs>${body}</svg>\n`;
fs.writeFileSync(path.join(__dirname,'../assets/learning-room.svg'),svg); console.log('learning-room.svg');
