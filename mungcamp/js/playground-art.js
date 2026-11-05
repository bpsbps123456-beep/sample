/* 놀이터 SVG를 한 번 읽고 화면 배율별로 재사용한다. 원본은 assets/playground. */
(function (MC) {
  'use strict';
  const base = new URL('../assets/playground/', document.currentScript.src);
  const shapes = {
    tree: [260, 340, 130, 312], bush: [240, 170, 120, 132],
    crate: [230, 176, 115, 146], logs: [240, 156, 120, 125],
    gate: [480, 320, 240, 270],
  };
  const images = new Map(), rasters = new Map(), failed = [];
  const ready = Promise.all(Object.keys(shapes).map(name => new Promise(resolve => {
    const img = new Image();
    img.onload = async () => {
      try { await img.decode(); images.set(name, img); }
      catch (_) { failed.push(name); }
      resolve();
    };
    img.onerror = () => { failed.push(name); resolve(); };
    img.src = new URL(name + '.svg', base).href;
  })));
  function draw(g, name, x, y, scale, flip = 1) {
    const img = images.get(name);
    if (!img) return false;
    const [w, h, ax, ay] = shapes[name], m = g.getTransform();
    const density = Math.min(3, Math.max(1, Math.ceil(Math.hypot(m.a, m.b) * scale * 2) / 2));
    const key = name + ':' + density;
    let raster = rasters.get(key);
    if (!raster) {
      raster = MC.canvas(Math.ceil(w * density), Math.ceil(h * density));
      raster.getContext('2d').drawImage(img, 0, 0, raster.width, raster.height);
      rasters.set(key, raster);
    }
    g.save(); g.translate(x, y); g.scale(flip, 1);
    g.drawImage(raster, -ax * scale, -ay * scale, w * scale, h * scale);
    g.restore();
    return true;
  }
  MC.PlaygroundArt = {
    ready, failed,
    get loaded() { return images.size; },
    obstacle(g, o) {
      const scale = o.kind === 'tree' ? .82 : o.w / 180;
      return draw(g, o.kind, o.x + o.w / 2, o.y + o.h, scale, o.kind === 'tree' && o.x > 700 ? -1 : 1);
    },
    bush: (g, b) => draw(g, 'bush', b.x, b.y + 13, b.r / 85),
    gate: (g, x, y) => draw(g, 'gate', x, y, 2 / 3),
  };
  MC.drawPlaygroundGate = (g, x, y) => {
    if (MC.PlaygroundArt.gate(g, x, y)) return;
    // 느린 첫 접속에서도 입구가 바로 보인다.
    g.save(); g.translate(x, y);
    g.fillStyle = '#aa8056';
    for (const dx of [-106, 106]) g.fillRect(dx - 6, -140, 12, 155);
    g.fillStyle = '#bb9469'; g.fillRect(-125, -148, 250, 52);
    g.fillStyle = '#fff0ca'; g.textAlign = 'center'; g.font = '23px Jua, sans-serif';
    g.fillText('놀이터', 0, -113); g.restore();
  };
})(window.MC = window.MC || {});
