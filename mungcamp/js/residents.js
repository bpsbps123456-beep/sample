/* 캠프 상주 멍이와 방문 멍이. 화면 인원에는 포함하고, 실제 서버 방 정원에는 포함하지 않는다. */
(function (MC) {
  'use strict';

  const mod = (a, b) => ((a % b) + b) % b;
  const NAMES = ['퇴근하고싶다', '잠깐쉬는중', '커피한잔', '생각정리중', '오늘도수고했어', '멍때리는중', '내일의나에게', '집가고싶다', '느린하루', '공부하다옴', '마감전잠깐', '아무생각없음', '주말기다리는중', '숨고르기', '밤산책', '출근은내일', '오늘은여기까지', '비오는날좋아', '그냥쉬러옴', '딱5분만', '따뜻한이불', '월요일싫어', '노을보는사람', '잠이안와', '괜찮아질거야', '꾸벅꾸벅', '조용히있을게', '별보는중', '바다보고싶다', '쉬었다가자', '할일은많지만', '천천히가도돼', '비타민충전', '지금은충전중', '잘살고있겠지'];

  NAMES.push('달빛한모금', '잠깐의여유', '산책나왔어', '책한장만', '하루마무리', '구름구경', '기분좋은밤', '의자펴는중', '따뜻한차', '여기좋다', '느긋한주말', '별을세는중', '마음충전', '이불밖한걸음', '잘쉬고가요');
  const SIGNS = {
    read: ['독서중', '책한장', '조용조용', '한쪽더'],
    rest: ['잠깐쉼', '쉬어가', '멍때림', '좋은밤'],
    nap: ['충전중', '꾸벅꾸벅', '꿈꾸는중'],
    walk: ['산책중', '천천히', '바람좋다'],
    fish: ['낚시중', '기다림', '대어꿈'],
  };

  // 같은 길을 끝없이 돌지 않고, 양 끝에서 서로 다른 시간만큼 쉬었다가 돌아온다.
  function route(points) {
    const lengths = [0];
    for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
    return { points, lengths, length: lengths[lengths.length - 1] };
  }
  function stroll(r, time, seed) {
    const speed = 35 + mod(seed * 7, 19), travel = r.length / speed;
    const restA = 23 + mod(seed * 11, 37), restB = 31 + mod(seed * 17, 41);
    const t = mod(time + seed * 137, travel * 2 + restA + restB);
    const back = t >= restA + travel;
    const moving = t >= restA && t < restA + travel || t >= restA + travel + restB;
    const d = t < restA ? 0 : !back ? (t - restA) * speed : t < restA + travel + restB ? r.length : r.length - (t - restA - travel - restB) * speed;
    let i = 1;
    while (i < r.lengths.length - 1 && r.lengths[i] < d) i++;
    const a = r.points[i - 1], b = r.points[i], u = MC.clamp((d - r.lengths[i - 1]) / (r.lengths[i] - r.lengths[i - 1] || 1), 0, 1);
    const sign = back ? -1 : 1;
    return { x: MC.lerp(a[0], b[0], u), y: MC.lerp(a[1], b[1], u), w: +moving, dx: (b[0] - a[0]) * sign, dy: (b[1] - a[1]) * sign };
  }

  class Residents {
    constructor(camp) {
      this.camp = camp;
      this.enabled = window.MC_RESIDENTS_ENABLED !== false;
      this.cache = new Map();
      const ring = MC.CAMP_PATHS[0];
      const section = (x, y) => {
        let best = 0;
        for (let i = 1; i < ring.length; i++) if (Math.hypot(ring[i][0] - x, ring[i][1] - y) < Math.hypot(ring[best][0] - x, ring[best][1] - y)) best = i;
        return route(Array.from({ length: 29 }, (_, i) => ring[mod(best - 14 + i, ring.length - 1)]));
      };
      const deck = MC.CampSea.deck;
      const entries = [
        ['map', 940, 1205, 'read'], ['map', 1420, 1110, 'rest'],
        ['map', 720, 760, 'rest'], ['map', 1560, 700, 'read'],
        ['map', 1330, 1940, 'nap'], ['map', 435, 1940, 'rest'],
        ['map', 0, 0, 'walk', section(900, 560)],
        ['map', 0, 0, 'walk', section(1980, 1360)],
        ['map', 0, 0, 'walk', section(780, 1640)],
        ['map', deck.x0 + 42, deck.y0 + 40, 'fish'],
        ['map', deck.x0 + 135, deck.y1 - 42, 'fish'],
        ['map', 3340, 1370, 'boat'],
        ['fire', 186, 47, 'fire'], ['fire', -110, -66, 'rest'],
        ['fire', 110, -66, 'rest'], ['fire', 250, -8, 'read'],
        ['firetower', 186, 47, 'fire'], ['firetower', -110, -66, 'rest'],
        ['water', 670, -350, 'float'], ['water', 700, 500, 'rest'],
        ['forest', 400, 700, 'read'], ['forest', 620, 820, 'rest'],
        ['tent', 300, 720, 'nap'],
        ['lodge', 750, 900, 'read'], ['lodge', 680, 450, 'inside'],
        ['map', 1720, 1560, 'rest'], ['fire', -250, -8, 'fire'],
        ['water', 430, -480, 'float'], ['map', 0, 0, 'walk', section(1700, 556)],
        ['forest', 300, 760, 'rest'], ['lodge', 160, 640, 'rest'],
        ['map', 1180, 1560, 'read'], ['tent', 545, 620, 'rest'],
        ['firetower', 250, -8, 'read'], ['map', 1880, 1000, 'rest'],
        ['map', 850, 420, 'rest'], ['map', 1190, 630, 'read'],
        ['map', 830, 1510, 'nap'], ['map', 1740, 1650, 'read'],
        ['map', 600, 1300, 'rest'], ['map', 0, 0, 'walk', section(1350, 1940)],
        ['fire', -200, -38, 'read'], ['fire', 200, -38, 'rest'],
        ['firetower', -250, -8, 'fire'], ['firetower', 110, -66, 'rest'],
        ['water', 500, 700, 'rest'], ['forest', 740, 760, 'rest'],
        ['tent', 690, 820, 'read'], ['lodge', 430, 850, 'read'], ['lodge', 350, 660, 'rest'],
      ];
      this.specs = entries.map(([place, x, y, role, path], i) => ({ id: `camp-friend-${String(i + 1).padStart(2, '0')}`, name: NAMES[i], place, x, y, role, path, seed: i + 1, c: MC.Pup.BODIES[i % MC.Pup.BODIES.length].i + 10 * (i % 6), h: (i * 5 + 2) % MC.Pup.HATS }));
      this.ids = new Set(this.specs.map(s => s.id));
    }

    is(id) { return this.ids.has(id); }

    // 기본 더미는 언제나 50마리. 행동 시간만 달라지고 실제 접속 수에는 더하지 않는다.
    active() {
      return this.enabled ? this.specs : [];
    }

    count(place, time) { return this.active(time).filter(s => s.place === place).length; }
    total(time) { return this.active(time).length; }

    sample(spec, time = Date.now() / 1000) {
      const s = { p: spec.place, x: spec.x, y: spec.y, w: 0, b: 0, t: 0, f: 1, s: 0, q: 0, z: 0, c: spec.c, h: spec.h, hp: 0, l: 0, ch: 0, k: 0, m: 0, bt: 0, ba: 0, fs: 0, n: spec.name, npc: 1 };
      const t = time + spec.seed * 137;
      if (spec.path) {
        const q = stroll(spec.path, time, spec.seed);
        s.x = q.x; s.y = q.y; s.w = q.w;
        if (Math.abs(q.dx) > Math.abs(q.dy) * 0.75) { s.t = 0.85; s.f = q.dx < 0 ? -1 : 1; }
        else s.b = +(q.dy < 0);
      }
      if (spec.role === 'read') s.ch = 1;
      if (spec.role === 'rest' && mod(t, 240) < 95 || spec.path && !s.w && mod(t, 180) < 75) s.ch = 1;
      if (spec.role === 'nap' || spec.role === 'inside') s.z = +(mod(t, 163) < 116);
      if (spec.role === 'nap') s.l = 1;
      if (spec.role === 'inside') s.k = 1;
      if (spec.role === 'fish') { s.fs = mod(t, 29) < 24 ? 1 : mod(t, 29) < 26 ? 2 : 0; s.t = 0.7; s.f = 1; }
      if (spec.role === 'boat') {
        const a = t / 39;
        s.x += 125 * Math.cos(a); s.y += 155 * Math.sin(a); s.bt = 1; s.w = 1;
        s.ba = Math.atan2(155 * Math.cos(a), -125 * Math.sin(a)) * 180 / Math.PI;
        s.t = 0.8; s.f = Math.sin(a) > 0 ? -1 : 1;
      }
      if (spec.role === 'float') { s.x += 17 * Math.sin(t / 23); s.y += 12 * Math.cos(t / 29); s.z = +(mod(t, 139) < 77); }
      if (s.p === 'map' && spec.seed % 4 < 2 && !s.bt) {
        const signs = SIGNS[s.ch ? 'read' : spec.role] || SIGNS.rest;
        s.sg = signs[mod(spec.seed + Math.floor(t / 210), signs.length)];
      }
      return s;
    }

    // 내가 보트를 타도 바뀌지 않는, 상주 친구의 도보 지형 판정.
    mapFree(x, y) {
      if (x < 55 || x > MC.CampSea.width - 45 || y < 85 || y > 2055) return false;
      if (x >= MC.CampSea.shoreX(y) - 30 && !this.camp.sea.onDeck(x, y, 12)) return false;
      return this.camp.blockers.every(b => Math.hypot(x - b.x, (y - b.y) * b.sy) >= b.r + 7);
    }

    // 지형과 다른 자동 멍이만 피해 배치한다. 사람이 가까이 와도 자리를 바꾸지 않는다.
    settle(s, context, occupied) {
      const map = s.p === 'map', crowd = !map && context.crowd;
      if (!map && s.p === 'lodge' && !!s.k !== !!context.inside) return s;
      const screen = (x, y) => map ? { x, y, k: 1 } : crowd.cfg.toScreen(x, y);
      const free = (x, y) => map ? this.mapFree(x, y) : crowd.free(x, y);
      const bound = (x, y) => map ? { X: x, Z: y } : crowd.clampIn({ X: x, Z: y });
      const source = { x: s.x, y: s.y };
      const candidates = [bound(s.x, s.y)];
      if (!map && crowd.cfg.seats) candidates.push(...crowd.cfg.seats().map(q => bound(q.X, q.Z)));
      for (const radius of map ? [65, 110, 170] : [80, 150, 250, 400]) {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + s.c;
          candidates.push(bound(s.x + Math.cos(a) * radius, s.y + Math.sin(a) * radius * (map ? 0.6 : 1)));
        }
      }
      let best, score = Infinity;
      for (const q of candidates) {
        if (!free(q.X, q.Z)) continue;
        const p = screen(q.X, q.Z);
        let penalty = 0;
        for (const o of occupied) {
          if (!!o.k !== !!s.k || !!o.bt !== !!s.bt) continue;
          const other = screen(o.x, o.y), gap = (map ? 80 : 80 * Math.max(p.k, other.k));
          const d = Math.hypot(p.x - other.x, (p.y - other.y) * 1.65);
          penalty += Math.max(0, gap - d) * 100;
        }
        const cost = Math.hypot(q.X - source.x, q.Z - source.y) + penalty;
        if (cost < score) { best = q; score = cost; }
        if (cost === 0) break;
      }
      if (best) { s.x = best.X; s.y = best.Z; }
      if (s.fs && !this.camp.sea.onDeck(s.x, s.y, 12)) s.fs = 0;
      if (!map) {
        const pose = crowd.cfg.pose(s.x, s.y, false);
        s.b = +(pose.view === 'back'); s.t = pose.turn || 0; s.f = pose.flip || 1;
        s.s = +(!!pose.stick && !s.ch && !s.z);
      }
      return s;
    }

    merge(place, people, context, time = Date.now() / 1000) {
      if (!this.enabled) return people;
      // 초당 다섯 번 갱신하고, 매 프레임의 보간·호흡·눈 깜빡임은 Pup이 맡는다.
      const bucket = Math.floor(time * 5), old = this.cache.get(place);
      if (old && old.bucket === bucket && old.context === context && old.inside === context.inside) return old.list;
      const occupied = [];
      const friends = [];
      for (const spec of this.active(bucket / 5)) {
        if (spec.place !== place || people.length + friends.length >= 32) continue;
        const s = this.sample(spec, bucket / 5);
        if (!s.bt) this.settle(s, context, occupied);
        friends.push({ id: spec.id, s }); occupied.push(s);
      }
      const list = people.concat(friends);
      this.cache.set(place, { bucket, context, inside: context.inside, list });
      return list;
    }
  }
  MC.Residents = Residents;
})(window.MC);
