/* 멍캠프 — 함께 걷기
   장면 안에서도 내 멍이를 걷게 하고(바닥을 톡 하거나 방향키), 같은 곳에 온 다른 사람들의 멍이를 함께 그린다.
   멈추면 장면마다 정해진 대로 앉는다. 모닥불 곁에서는 마시멜로를 굽고, 바다에서는 바다를 바라본다. */
(function (MC) {
  'use strict';

  const MAX_VISITORS = 40;

  // 다른 사람 멍이는 가까운 사람부터 이만큼만 그린다. 기기가 버거워하면(MC.Runner 가 품질을 낮추면) 줄인다
  function maxDrawn() {
    const q = MC.frameQuality == null ? 1 : MC.frameQuality;
    return q >= 0.8 ? 16 : q >= 0.6 ? 12 : 8;
  }
  // 다시 그리는 간격도 버거우면 늘린다
  function paintGap(lively) {
    const slow = (MC.frameQuality == null ? 1 : MC.frameQuality) < 0.6;
    return lively ? (slow ? 1 / 12 : 1 / 20) : slow ? 1 / 5 : 1 / 8;
  }
  MC.crowdMaxDrawn = maxDrawn;

  // 다른 사람의 멍이. 받은 자리로 부드럽게 따라가고, 들어오고 나갈 때 살며시 나타났다 사라진다
  class Visitor {
    constructor(id, st, opts) {
      this.id = id;
      this.st = st;
      this.x = st.x;
      this.y = st.y;
      this.b = -1;
      this.hp = st.hp;
      this.fade = 0;
      this.leaving = false;
      this.pup = new MC.Pup({
        outfit: opts.outfit,
        coat: st.c,
        hat: st.h,
        paintEvery: 1 / 20,
        light: opts.light ? Object.assign({}, opts.light) : null,
      });
      this.apply(st);
    }

    apply(st) {
      const p = this.pup;
      // 올라앉거나 내려오거나 자리를 옮기면, 지금 자리에서 폴짝 뛰어 간다
      if (this.st && (!!this.st.q !== !!st.q || (st.q && this.st.l !== st.l))) {
        this.jumpFrom = { x: p.x, y: p.y };
        this.jumpT = 0;
        this.fromSpot = this.st.q ? this.st.l || 1 : 0;
        this.jumpVia = undefined; // 디딤 가지는 장면이 정한다 (placeVisitor)
      }
      if (st.c !== p.coatId || st.h !== p.hatId) p.setLook(st.c, st.h);
      if (st.hp > this.hp) {
        p.addHearts(2);
        p.hopV = -40;
      }
      this.hp = st.hp;
      if (st.b !== this.b) {
        this.b = st.b;
        p.view = p.restView = st.b ? 'back' : 'front';
        p.spin = null;
        p.spinHold = 0;
      }
      this.st = st;
      this.leaving = false;
    }

    update(dt, env) {
      const st = this.st;
      const dx = st.x - this.x;
      const dy = st.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d > (env.jump || 400)) {
        this.x = st.x;
        this.y = st.y;
      } else {
        const a = 1 - Math.exp(-dt * 7);
        this.x += dx * a;
        this.y += dy * a;
      }
      this.fade = this.leaving ? this.fade - dt * 2.2 : Math.min(1, this.fade + dt * 2);
      const p = this.pup;
      p.baseTurn = st.t;
      p.flip = st.f;
      p.setStick(st.s);
      // 눕는지와 어디에 눕는지는 장면이 정한다 (튜브, 나뭇가지, 침대). 폴짝 뛰는 동안은 눕지 않는다
      const lie = env.lieOf ? env.lieOf(st) : !!st.l;
      p.setLie(lie && !this.jumpFrom);
      p.rest = this.jumpFrom ? null : env.restOf ? env.restOf(st) : null;
      if (this.jumpFrom) this.jumpT += dt;
      // 가만히 앉아 숨만 쉴 때는 드문드문, 움직일 때는 자주 다시 그린다
      const lively = st.w || d > (env.walkEps || 3) || p.spin || Math.abs(p.hopV) > 4 || p.hearts.length || p.mood === 'eating' || p.mood === 'startled' || (p.lie > 0 && p.lie < 1);
      p.paintEvery = paintGap(lively);
      if (st.z && !p.sleeping) p.setMood('sleepy', 2.5);
      else if (!st.z && p.sleeping) p.wake();
      p.update(dt, Object.assign({}, env, { walking: !!st.w || d > (env.walkEps || 3), noSleep: true }));
    }
  }

  // 올라앉을 때·내려올 때의 폴짝: from 에서 to 로 포물선을 그리며. 끝나면 null
  function jumpPos(from, to, t) {
    const dy = to.y - from.y;
    const k = to.k || 1;
    const dur = MC.clamp(0.28 + Math.abs(dy) / (420 * k), 0.3, 0.8);
    const u = t / dur;
    if (u >= 1) return null;
    const e = 0.5 - 0.5 * Math.cos(Math.PI * u);
    const H = 14 * k + Math.max(0, -dy) * 0.3 + Math.max(0, dy) * 0.08;
    return { x: MC.lerp(from.x, to.x, e), y: MC.lerp(from.y, to.y, e) - H * Math.sin(Math.PI * u), k: to.k };
  }

  // 디딤 자리를 차례로 밟으며 폴짝폴짝. holder: { jumpFrom, jumpT, jumpVia }
  function followJump(holder, q) {
    if (!holder.jumpFrom) return q;
    for (let guard = 0; guard < 8; guard++) {
      const via = holder.jumpVia;
      const dest = via && via.length ? via[0] : q;
      const j = jumpPos(holder.jumpFrom, dest, holder.jumpT || 0);
      if (j) return j;
      if (via && via.length) {
        holder.jumpFrom = via.shift();
        holder.jumpT = 0;
        continue;
      }
      holder.jumpFrom = null;
      holder.jumpVia = null;
      return q;
    }
    return q;
  }

  // 같은 곳의 다른 사람들을 받은 목록에 맞춘다
  function syncVisitors(map, list, opts) {
    const seen = new Set();
    for (const { id, s } of list) {
      seen.add(id);
      const v = map.get(id);
      if (v) v.apply(s);
      else if (map.size < MAX_VISITORS) map.set(id, new Visitor(id, s, opts));
    }
    for (const v of map.values()) if (!seen.has(v.id)) v.leaving = true;
  }

  function dropFaded(map) {
    for (const [id, v] of map) if (v.leaving && v.fade <= 0) map.delete(id);
  }

  // 내 멍이 발밑의 은은한 빛: 여럿이 모였을 때 내가 누구인지
  function drawMark(g, p, t) {
    const r = 50 * p.k;
    g.save();
    g.translate(p.x, p.y);
    g.scale(1, 0.3);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.3 + 0.08 * Math.sin(t * 1.6);
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, r);
    grd.addColorStop(0, 'rgba(255,236,186,0.9)');
    grd.addColorStop(0.6, 'rgba(255,226,170,0.35)');
    grd.addColorStop(1, 'rgba(255,226,170,0)');
    g.fillStyle = grd;
    g.fillRect(-r, -r, r * 2, r * 2);
    g.restore();
  }

  class Crowd {
    /* cfg
       place, outfit, light          어디인지, 무엇을 입는지, 다른 멍이에게 줄 빛
       start {X, Z}                  처음 앉는 자리 (장면 좌표)
       toScreen(X, Z) → {x, y, k}    장면 좌표 → 화면
       toCanon(x, y) → {X, Z}        화면 → 장면 좌표
       bounds() → {x0, x1, z0, z1}   걸을 수 있는 범위
       blockers() → [{x, z, rx, rz}] 들어갈 수 없는 타원
       floor(x, y) → bool            이 화면 자리를 누르면 걸어갈지
       speed() → 화면 px/초
       pose(X, Z) → {view, turn, flip, stick, tip}  멈췄을 때 앉는 모습
       lightFor(pup, X, Z, a)        불빛 (모닥불)
       env() → {}                    다른 멍이 update에 넘길 것
       perch {X, Z, seat(id), hit(x, y)}  올라앉는 자리 (숲의 그루터기) */
    constructor(pup, cfg) {
      this.pup = pup;
      this.cfg = cfg;
      this.me = { X: cfg.start.X, Z: cfg.start.Z };
      this.perched = !!cfg.perch;
      this.toPerch = false;
      this.target = null;
      this.walkT = 0;
      this.keys = { x: 0, y: 0 };
      this.moving = false;
      this.still = 1;
      this.posed = false;
      this.side = 0;
      this.stuck = 0;
      this.t = 0;
      this.visitors = new Map();
      this.onBoop = null;
      this.roomMade = false;
      this.wandered = false;
      this.alpha = 1;
      this.portal = null;
    }

    // 문으로 드나들 때: 막힘과 범위를 무시하고 걸어가며 살며시 사라지거나(나갈 때) 나타난다(들어올 때)
    portalWalk(from, to, dur, fadeIn, done) {
      this.target = null;
      this.path = null;
      this.toPerch = false;
      this.perched = false;
      this.me.X = from.X;
      this.me.Z = from.Z;
      this.portal = { from, to, t: 0, dur, fadeIn, done };
      this.alpha = fadeIn ? 0 : 1;
      this.placeMe();
    }

    // 막 들어왔는데 내 자리에 누가 앉아 있으면, 가까운 빈자리로 살짝 옮겨 앉는다
    makeRoom(force) {
      this.roomMade = true;
      if (!force && (this.wandered || this.target)) return;
      if (this.cfg.drifting && this.cfg.drifting(this.me.X, this.me.Z)) return;
      if (this.target) return;
      let hopped = false;
      // 자리가 여럿인 곳(숲의 그루터기와 나뭇가지)은 장면이 겹침을 직접 푼다
      if (this.perched && this.cfg.perch.manage) return;
      if (this.perched) {
        // 그루터기에 누가 먼저 앉아 있으면 내려와서 빈자리를 찾는다
        let other = false;
        for (const v of this.visitors.values()) if (!v.leaving && v.st.q) other = true;
        if (!other) return;
        this.hopDown();
        hopped = true;
      }
      const me = this.cfg.toScreen(this.me.X, this.me.Z);
      const R = 74 * me.k;
      // 누가 앉아 있거나, 앉으러 가는 중인 자리
      const taken = (x, y) => {
        for (const v of this.visitors.values()) {
          if (v.leaving || v.st.q) continue;
          if (Math.hypot(v.pup.x - x, (v.pup.y - y) * 1.8) < R) return true;
          if (v.st.g) {
            const gq = this.cfg.toScreen(v.st.g[0], v.st.g[1]);
            if (Math.hypot(gq.x - x, (gq.y - y) * 1.8) < R) return true;
          }
        }
        return false;
      };
      if (!hopped && !taken(me.x, me.y)) return;
      // 장면이 정해 둔 자리부터 (모닥불이면 불을 빙 둘러서)
      for (const sq of this.cfg.seats ? this.cfg.seats() : []) {
        const q = this.clampIn({ X: sq.X, Z: sq.Z });
        if (Math.abs(q.X - sq.X) > 1 || Math.abs(q.Z - sq.Z) > 1 || !this.free(q.X, q.Z)) continue;
        const p = this.cfg.toScreen(q.X, q.Z);
        if (taken(p.x, p.y)) continue;
        this.go(q);
        return;
      }
      for (let r = 1; r <= 7; r++) {
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2 + r * 0.7;
          const q = this.clampIn(this.cfg.toCanon(me.x + Math.cos(a) * R * r * 0.9, me.y + Math.sin(a) * R * r * 0.4));
          if (!this.free(q.X, q.Z)) continue;
          const p = this.cfg.toScreen(q.X, q.Z);
          if (taken(p.x, p.y)) continue;
          this.go(q);
          return;
        }
      }
    }

    go(q, perch) {
      if (this.perched && !perch) this.hopDown();
      this.path = this.plan(q);
      this.target = this.path.shift();
      this.toPerch = !!perch;
      this.stuck = 0;
      this.walkT = 0;
    }

    // 곧장 가는 길을 무언가 막고 있으면, 막은 것을 옆으로 돌아가는 디딤돌을 끼운다 (막힌 것이 여럿이면 두세 개까지)
    plan(to) {
      const me = { X: this.me.X, Z: this.me.Z };
      const path = this.route(me, to, 2);
      if (!path) return [to];
      for (const q of path) q.wp = true;
      return path.concat([to]);
    }

    route(a, b, depth) {
      const o = this.blockedBy(a, b);
      if (!o) return [];
      if (depth <= 0) return null;
      const cfg = this.cfg;
      const far = (p, q) => {
        const P = cfg.toScreen(p.X, p.Z);
        const Q = cfg.toScreen(q.X, q.Z);
        return Math.hypot(P.x - Q.x, P.y - Q.y);
      };
      let best = null;
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        for (const pad of [1.3, 1.75]) {
          const q = this.clampIn({ X: o.x + Math.cos(ang) * o.rx * pad, Z: o.z + Math.sin(ang) * o.rz * pad });
          if (!this.free(q.X, q.Z)) continue;
          const r1 = this.route(a, q, depth - 1);
          if (!r1) continue;
          const r2 = this.route(q, b, depth - 1);
          if (!r2) continue;
          const pts = [a].concat(r1, [q], r2, [b]);
          let d = 0;
          for (let k = 1; k < pts.length; k++) d += far(pts[k - 1], pts[k]);
          if (!best || d < best.d) best = { d, path: r1.concat([q], r2) };
        }
      }
      return best ? best.path : null;
    }

    blockedBy(a, b) {
      const B = this.cfg.blockers();
      for (let i = 1; i < 24; i++) {
        const t = i / 24;
        const X = a.X + (b.X - a.X) * t;
        const Z = a.Z + (b.Z - a.Z) * t;
        for (const o of B) {
          const u = (X - o.x) / o.rx;
          const v = (Z - o.z) / o.rz;
          if (u * u + v * v < 1) return o;
        }
      }
      return null;
    }

    // ── 걷기 ─────────────────────────────────────────────
    free(X, Z) {
      if (this.cfg.inside && !this.cfg.inside(X, Z)) return false;
      for (const o of this.cfg.blockers()) {
        const u = (X - o.x) / o.rx;
        const v = (Z - o.z) / o.rz;
        if (u * u + v * v < 1) return false;
      }
      return true;
    }

    clampIn(q) {
      const b = this.cfg.bounds();
      q.X = MC.clamp(q.X, b.x0, b.x1);
      q.Z = MC.clamp(q.Z, b.z0, b.z1);
      return q;
    }

    // 막힌 곳 밖으로 (톡 한 곳이 모닥불 속이면 그 앞까지만)
    pushOut(q) {
      for (let pass = 0; pass < 3; pass++) {
        for (const o of this.cfg.blockers()) {
          const u = (q.X - o.x) / o.rx;
          const v = (q.Z - o.z) / o.rz;
          const d = Math.hypot(u, v);
          if (d >= 1) continue;
          const k = 1.06 / Math.max(d, 0.01);
          q.X = o.x + (d < 0.01 ? 0 : u * k * o.rx);
          q.Z = o.z + (d < 0.01 ? 1.06 * o.rz : v * k * o.rz);
        }
        this.clampIn(q);
      }
      return q;
    }

    setKeys(x, y) {
      this.keys.x = x;
      this.keys.y = y;
      if (x || y) {
        this.target = null;
        this.path = null;
        this.toPerch = false;
      }
    }

    // 다른 멍이를 톡 하면 하트, 바닥을 톡 하면 그리로 걸어간다
    pointer(x, y) {
      return this.boopAt(x, y) || this.walkTo(x, y);
    }

    boopAt(x, y) {
      const v = this.hitVisitor(x, y);
      if (!v) return null;
      v.pup.addHearts(2);
      v.pup.hopV = -40;
      if (this.onBoop) this.onBoop(v.id);
      return 'boop';
    }

    walkTo(x, y) {
      const P = this.cfg.perch;
      if (P && P.hit(x, y)) {
        if (this.perched) return null;
        this.go({ X: P.X, Z: P.Z }, true);
        return 'walk';
      }
      if (!this.cfg.floor(x, y)) return null;
      const q = this.pushOut(this.clampIn(this.cfg.toCanon(x, y)));
      if (this.perched) this.hopDown();
      this.go(q);
      return 'walk';
    }

    hitVisitor(x, y) {
      let best = null;
      for (const v of this.visitors.values()) {
        if (v.leaving || v.fade < 0.3) continue;
        if (v.pup.hit(x, y) && (!best || v.pup.y > best.pup.y)) best = v;
      }
      return best;
    }

    hopDown() {
      const P = this.cfg.perch;
      if (P.jumpArc) {
        this.jumpFrom = { x: this.pup.x, y: this.pup.y };
        this.jumpT = 0;
        const from = this.cfg.extra ? this.cfg.extra().l || 1 : 1;
        this.jumpVia = P.via ? P.via(this.jumpFrom, from, 0) : null;
      }
      this.me.X = P.X;
      this.me.Z = P.Z;
      this.perched = false;
      this.pup.hopV = -55;
      if (P.onLeave) P.onLeave();
    }

    arrive() {
      if (this.path && this.path.length) {
        this.target = this.path.shift();
        return;
      }
      this.target = null;
      if (this.toPerch) {
        this.toPerch = false;
        const P = this.cfg.perch;
        // 자리가 정해진 곳(침대)은 도착했을 때 빈자리가 있어야 올라간다
        if (P.claim && !P.claim()) {
          if (P.onFull) P.onFull();
          return;
        }
        if (P.jumpArc) {
          this.jumpFrom = { x: this.pup.x, y: this.pup.y };
          this.jumpT = 0;
        }
        this.perched = true;
        if (P.jumpArc && P.via) this.jumpVia = P.via(this.jumpFrom, 0, this.cfg.extra ? this.cfg.extra().l || 1 : 1);
        this.posed = false;
        this.still = 0;
        this.pup.hopV = -80;
        this.pup.emit('hop');
        if (P.onSit) P.onSit();
      }
    }

    // 한 걸음. 가장자리에서는 멈추고, 모닥불 같은 것에 막히면 조금씩 옆으로 틀어서 비켜 간다
    step(cur, vx, vy, dt) {
      const cfg = this.cfg;
      const at = (a) => {
        const c = Math.cos(a);
        const s = Math.sin(a);
        const ux = vx * c - vy * s;
        const uy = vx * s + vy * c;
        const q = this.clampIn(cfg.toCanon(cur.x + ux * dt, cur.y + uy * dt));
        const p = cfg.toScreen(q.X, q.Z);
        const mx = p.x - cur.x;
        const my = p.y - cur.y;
        if (Math.hypot(mx, my) < 0.05) return 'edge';
        if (!this.free(q.X, q.Z)) return null;
        return { X: q.X, Z: q.Z, vx: mx / dt, vy: my / dt };
      };
      const direct = at(0);
      if (direct === 'edge') return null;
      if (direct) {
        this.side = 0;
        return direct;
      }
      const tq = this.target ? cfg.toScreen(this.target.X, this.target.Z) : null;
      const far = (q) => {
        if (!tq) return 0;
        const p = cfg.toScreen(q.X, q.Z);
        return Math.hypot(tq.x - p.x, tq.y - p.y);
      };
      for (const a of [0.45, 0.9, 1.3, 1.62, 1.95]) {
        const L = at(a);
        const R = at(-a);
        const okL = L && L !== 'edge';
        const okR = R && R !== 'edge';
        if (!okL && !okR) continue;
        let pick;
        if (okL && okR) pick = this.side ? (this.side > 0 ? L : R) : far(L) <= far(R) ? L : R;
        else pick = okL ? L : R;
        this.side = pick === L ? 1 : -1;
        return pick;
      }
      return null;
    }

    // 멈추면 장면에 맞게 앉는다
    settle() {
      const pup = this.pup;
      const pose = this.cfg.pose(this.me.X, this.me.Z, this.perched);
      if (pose.view !== pup.view && !pup.spin) pup.spin = { t: 0, dur: 0.36, to: pose.view, hold: 0, switched: false };
      pup.restView = pose.view;
      if (pose.turn != null) pup.baseTurn = pose.turn;
      pup.flip = pose.flip || 1;
      pup.stickTip = pose.tip || null;
      pup.setStick(!!pose.stick);
      this.posed = true;
    }

    // 화면 크기가 바뀌면 자리를 다시 잡는다
    layout() {
      this.pushOut(this.clampIn(this.me));
      this.placeMe();
      if (this.posed) this.settle();
      for (const v of this.visitors.values()) this.placeVisitor(v);
    }

    placeMe() {
      const p = this.pup;
      const cfg = this.cfg;
      let q = this.perched ? cfg.perch.seat(null) : cfg.toScreen(this.me.X, this.me.Z);
      // 물 위에서는 파도를 따라 둥실둥실
      if (!this.perched && cfg.bob) q = { x: q.x, y: q.y + cfg.bob(this.me.X, this.me.Z, null), k: q.k };
      q = followJump(this, q);
      p.x = q.x;
      p.y = q.y;
      p.k = q.k;
    }

    placeVisitor(v) {
      const p = v.pup;
      const cfg = this.cfg;
      let q = v.st.q && cfg.perch ? cfg.perch.seat(v.id, v.st) : cfg.toScreen(v.x, v.y);
      if (!v.st.q && cfg.bob) q = { x: q.x, y: q.y + cfg.bob(v.x, v.y, v.id), k: q.k };
      if (v.jumpFrom && v.jumpVia === undefined) {
        v.jumpVia = cfg.perch && cfg.perch.via ? cfg.perch.via(v.jumpFrom, v.fromSpot || 0, v.st.q ? v.st.l || 1 : 0) : null;
      }
      q = followJump(v, q);
      p.x = q.x;
      p.y = q.y;
      p.k = q.k;
      if (v.st.s) {
        const pose = cfg.pose(v.x, v.y, false);
        p.stickTip = pose.tip || null;
      }
    }

    update(dt) {
      this.t += dt;
      if (this.jumpFrom) this.jumpT = (this.jumpT || 0) + dt;
      const cfg = this.cfg;
      const pup = this.pup;
      let vx = 0;
      let vy = 0;
      let moved = false;
      const keyed = !this.portal && (this.keys.x || this.keys.y);
      if (this.portal) {
        const P = this.portal;
        P.t += dt;
        const u = Math.min(1, P.t / P.dur);
        const a = cfg.toScreen(this.me.X, this.me.Z);
        this.me.X = MC.lerp(P.from.X, P.to.X, u);
        this.me.Z = MC.lerp(P.from.Z, P.to.Z, u);
        const b = cfg.toScreen(this.me.X, this.me.Z);
        vx = (b.x - a.x) / Math.max(dt, 1e-3);
        vy = (b.y - a.y) / Math.max(dt, 1e-3);
        moved = u < 1;
        this.alpha = P.fadeIn ? Math.min(1, u * 1.6) : Math.max(0, 1 - u * 1.3);
        if (u >= 1) {
          this.portal = null;
          if (P.done) P.done();
        }
      } else if (keyed && this.perched) this.hopDown();
      if (!this.perched && !this.portal && !moved) {
        const sp = cfg.speed();
        const cur = cfg.toScreen(this.me.X, this.me.Z);
        if (keyed) {
          const l = Math.hypot(this.keys.x, this.keys.y);
          vx = (this.keys.x / l) * sp;
          vy = (this.keys.y / l) * sp * 0.75;
        } else if (this.target) {
          const tq = cfg.toScreen(this.target.X, this.target.Z);
          const dx = tq.x - cur.x;
          const dy = tq.y - cur.y;
          const d = Math.hypot(dx, dy);
          if (d < (this.target.wp ? 14 : 3)) this.arrive();
          else {
            const v = Math.min(sp, d * 6);
            vx = (dx / d) * v;
            vy = (dy / d) * v;
          }
        }
        if (vx || vy) {
          const q = this.step(cur, vx, vy, dt);
          if (q) {
            moved = true;
            this.me.X = q.X;
            this.me.Z = q.Z;
            vx = q.vx;
            vy = q.vy;
          }
        }
        // 한 걸음도 못 가거나 너무 오래 헤매면 그 자리에 선다
        if (this.target && !keyed) {
          this.stuck = moved ? 0 : this.stuck + dt;
          this.walkT += dt;
          if (this.stuck > 0.35 || this.walkT > 9) {
            this.target = null;
            this.path = null;
            this.toPerch = false;
          }
        }
      }
      this.moving = moved;
      // 자리 고르기는 사람마다 조금씩 늦춰서, 같이 들어와도 먼저 고른 사람의 자리가 전해진 뒤에 고른다
      if (this.roomAt == null) this.roomAt = 1.3 + Math.random() * 1.4;
      if (!this.roomMade && this.t > this.roomAt) this.makeRoom();
      // 둘이 같이 와서 같은 자리에 겹쳐 앉았으면, 꼬리표가 큰 쪽이 빈자리로 옮긴다 (양쪽이 같은 규칙으로 정한다)
      this.clashT = (this.clashT || 0) + dt;
      if (this.clashGap == null) this.clashGap = 1 + Math.random() * 1.2;
      if (this.clashT > this.clashGap) {
        this.clashT = 0;
        this.clashGap = 1 + Math.random() * 1.2;
        const drifting = cfg.drifting && cfg.drifting(this.me.X, this.me.Z);
        if (!moved && !keyed && !drifting && !this.target && !this.perched && !this.portal && this.roomMade && this.selfId && (this.clashes || 0) < 3) {
          const me = cfg.toScreen(this.me.X, this.me.Z);
          const near = 50 * me.k;
          for (const v of this.visitors.values()) {
            if (v.leaving || v.fade < 0.5 || v.st.w || v.st.q || !(v.id < this.selfId)) continue;
            if (Math.hypot(v.pup.x - me.x, (v.pup.y - me.y) * 1.8) < near) {
              this.clashes = (this.clashes || 0) + 1; // 몇 번 해 봐도 안 되면 그대로 둔다
              this.makeRoom(true);
              break;
            }
          }
        }
      }
      if (keyed) this.clashes = 0;
      if (moved) {
        this.wandered = true;
        this.still = 0;
        this.posed = false;
        pup.setStick(false);
        pup.spin = null;
        pup.spinHold = 0;
        if (Math.abs(vx) > Math.abs(vy) * 0.75) {
          pup.view = pup.restView = 'front';
          pup.baseTurn = 0.85;
          pup.flip = vx < 0 ? -1 : 1;
        } else if (vy < 0) {
          pup.view = pup.restView = 'back';
          pup.baseTurn = 0;
          pup.flip = 1;
        } else {
          pup.view = pup.restView = 'front';
          pup.baseTurn = 0;
          pup.flip = 1;
        }
      } else {
        this.still += dt;
        if (!this.posed && this.still > 0.18) this.settle();
      }
      this.placeMe();

      const env = cfg.env ? cfg.env() : {};
      for (const v of this.visitors.values()) {
        v.update(dt, env);
        this.placeVisitor(v);
      }
      dropFaded(this.visitors);
    }

    // 많이 모이면 내 곁의 사람들부터 (한 프레임에 한 번만 고른다)
    shown() {
      if (this.shownAt === this.t && this.shownSet) return this.shownSet;
      this.shownAt = this.t;
      const all = Array.from(this.visitors.values());
      const max = maxDrawn();
      if (all.length > max) {
        const me = this.cfg.toScreen(this.me.X, this.me.Z);
        all.sort((a, b) => Math.hypot(a.pup.x - me.x, a.pup.y - me.y) - Math.hypot(b.pup.x - me.x, b.pup.y - me.y));
        all.length = max;
      }
      this.shownSet = new Set(all);
      return this.shownSet;
    }

    // 불빛처럼 자리마다 달라지는 빛
    lights(a) {
      const f = this.cfg.lightFor;
      if (!f) return;
      f(this.pup, this.me.X, this.me.Z, a);
      for (const v of this.visitors.values()) f(v.pup, v.x, v.y, a);
    }

    sync(list) {
      syncVisitors(this.visitors, list, { outfit: this.cfg.outfit, light: this.cfg.light });
    }

    // 함께 있는 사람들에게 알릴 내 모습
    state() {
      const p = this.pup;
      return {
        p: this.cfg.place,
        x: Math.round(this.me.X),
        y: Math.round(this.me.Z),
        w: this.moving ? 1 : 0,
        b: p.restView === 'back' ? 1 : 0,
        t: Math.round(p.baseTurn * 100) / 100,
        f: p.flip < 0 ? -1 : 1,
        s: p.stick ? 1 : 0,
        q: this.perched ? 1 : 0,
        z: p.sleeping ? 1 : 0,
        hp: p.heartBursts || 0,
        // 가려는 자리: 돌아가는 디딤돌이 아니라 마지막에 앉을 곳 (다른 사람이 그 자리를 피한다)
        g: this.target ? ((q) => [Math.round(q.X), Math.round(q.Z)])(this.path && this.path.length ? this.path[this.path.length - 1] : this.target) : null,
        l: this.cfg.extra ? this.cfg.extra().l || 0 : 0,
      };
    }

    // 그리기. which(Z, perched)로 앞뒤 층을 나눠 그릴 수 있다
    // 그릴 것들. 장면이 가구와 섞어 앞뒤를 정렬할 수 있게 {y, draw} 로 내준다.
    // 올라앉은 멍이는 앉은 자리(침대, 그루터기)보다 앞에 그려지도록 perch.sortY 를 쓴다
    drawables(dpr, which, w) {
      const out = [];
      const P = this.cfg.perch;
      const key = (p, up) => (up && P && P.sortY ? P.sortY() + p.y * 1e-4 : p.y);
      const marked = this.visitors.size > 0;
      const cfg = this.cfg;
      const put = (p, a, up, me, v) => {
        out.push({
          y: key(p, up),
          draw: (g) => {
            if (a <= 0.01) return;
            if (a < 1) g.globalAlpha = a;
            const tilt = cfg.tilt ? cfg.tilt(p, me, v) : 0;
            if (tilt) {
              g.save();
              g.translate(p.x, p.y);
              g.rotate(tilt);
              g.translate(-p.x, -p.y);
            }
            if (cfg.under) cfg.under(g, p, me, v);
            if (me && marked && !p.rest) drawMark(g, p, this.t);
            p.draw(g, dpr);
            if (cfg.over) cfg.over(g, p, me, v);
            if (tilt) g.restore();
            g.globalAlpha = 1;
          },
        });
      };
      const mySpot = this.perched && cfg.extra ? cfg.extra().l || 0 : 0;
      if (!which || which(this.me.Z, this.perched, mySpot)) put(this.pup, this.alpha, this.perched, true, null);
      const shown = this.shown();
      for (const v of this.visitors.values()) {
        if (!shown.has(v)) continue;
        if (which && !which(v.y, !!v.st.q, v.st.q ? v.st.l || 0 : 0)) continue;
        const p = v.pup;
        if (w && (p.x < -160 * p.k || p.x > w + 160 * p.k)) continue;
        put(p, Math.max(0, Math.min(1, v.fade)), !!v.st.q, false, v);
      }
      return out;
    }

    draw(g, dpr, which, w) {
      const list = this.drawables(dpr, which, w);
      list.sort((a, b) => a.y - b.y);
      for (const it of list) it.draw(g);
    }

    // 장면이 다른 멍이에게도 무언가 해 줄 때 (파도에 폴짝 등)
    each(fn) {
      fn(this.pup, true);
      for (const v of this.visitors.values()) fn(v.pup, false, v);
    }
  }

  MC.Crowd = Crowd;
  MC.Visitor = Visitor;
  MC.syncVisitors = syncVisitors;
  MC.dropFaded = dropFaded;
  MC.drawYouMark = drawMark;
})(window.MC = window.MC || {});
