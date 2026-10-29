// =============================================================
//  BEASTS IN THREE VIEWS (front / side / back) — the non-humanoid bosses
//  (指示: 3パターンモーション。下から: ナイトメア, フェンリル, ボーンドラゴン, リヴァイアサン, ケツァルコアトル)
//
//  Each beast is a small 3D skeleton in art px: x = the beast's right side, y = down, z = forward; origin = the floor
//  under its body. Every frame the skeleton is posed (per move, timed to the attack), projected for the way the beast
//  faces (front / side / back; left = the side view mirrored), drawn back-to-front into a small canvas at art
//  resolution, then pixelised with a 1px outline — so it stays crisp pixel art from every angle.
//
//  yusha.js calls BEAST3.draw(ctx, boss, x, yFeet, hurt, env) from drawBoss() when BEAST3.has(type).
// =============================================================
const BEAST3 = (() => {
  const U = SPR.util, K = SPR.SCALE;
  const CW = 330, CH = 270, OX = 165, OY = 244;        // the art canvas; (OX, OY) = the floor under the body
  const [cv, cx] = U.canvas(CW, CH), g = U.api(cx);
  const [fc, fx] = U.canvas(CW, CH);                   // mirrored / whitened copy
  const PI = Math.PI, TAU = PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, k) => a + (b - a) * k;
  const sstep = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
  const env = (t, a, b, c, d) => t < a ? 0 : t < b ? sstep((t - a) / (b - a)) : t < c ? 1 : t < d ? 1 - sstep((t - c) / (d - c)) : 0;   // rise a..b, hold, fall c..d
  const V = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
    len: a => Math.hypot(a[0], a[1], a[2]), mix: (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  };
  const norm = a => V.mul(a, 1 / (V.len(a) || 1));
  const pitch = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[2] * c + p[1] * s]; };   // + = nose up
  const yaw = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], p[2] * c - p[0] * s]; };     // + = turn toward +x
  const roll = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[1] * c + p[0] * s, p[2]]; };
  function ik(S, H, L1, L2, pole) {   // two bones from S toward H, the joint bends toward pole
    let d = V.sub(H, S), dl = V.len(d) || 0.01; const mx = L1 + L2 - 0.2;
    if (dl > mx) { H = V.add(S, V.mul(d, mx / dl)); d = V.sub(H, S); dl = mx; }
    const u = V.mul(d, 1 / dl), a = (L1 * L1 - L2 * L2 + dl * dl) / (2 * dl), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    const v = norm(V.sub(pole, V.mul(u, V.dot(pole, u))));
    return [V.add(V.add(S, V.mul(u, a)), V.mul(v, h)), H];
  }
  // ---- facing and projection ----
  const face4 = a => { const c = Math.cos(a), s = Math.sin(a); return Math.abs(c) > 0.7 ? (c > 0 ? 'r' : 'l') : s > 0 ? 'b' : 'f'; };   // world angle (y up)
  function groundDir(f, a) { const c = Math.cos(a), s = Math.sin(a); return f === 'f' ? [c, -s] : f === 'b' ? [-c, s] : f === 'r' ? [-s, c] : [-s, -c]; }   // world angle -> model [x, z]
  let VIEW = 'f'; const SL = 0.45;
  function pr(p) {   // model -> [canvas x, canvas y, depth]
    if (VIEW === 'f') return [OX + p[0], OY + p[1] + p[2] * SL, p[2]];   // looking down a little: nearer = lower
    if (VIEW === 'b') return [OX - p[0], OY + p[1] - p[2] * SL, -p[2]];
    return [OX + p[2], OY + p[1] + p[0] * 0.22, p[0]];
  }
  const dp = p => pr(p)[2];
  // ---- draw list: everything is queued with a depth, sorted, then drawn far-to-near ----
  let OPS = [];
  const op = (d, fn) => OPS.push([d, fn]);
  const sph = (p, r, C, d0 = 0, hl = 1) => op(dp(p) + d0, () => { const q = pr(p); U.blob(g, q[0], q[1], r, r, C, hl); });
  function tube(pts, rs, C, d0 = 0, opt) {   // a tapering shaded tube through 3D points; one op per segment so long bodies sort properly
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      op((dp(a) + dp(b)) / 2 + d0, () => { const A = pr(a), Bq = pr(b); U.tube(g, [[A[0], A[1], rs[i - 1]], [Bq[0], Bq[1], rs[i]]], C, opt || {}); });
    }
  }
  const poly = (pts, col, d0 = 0) => op(pts.reduce((s, p) => s + dp(p), 0) / pts.length + d0, () => g.poly(pts.map(p => { const q = pr(p); return [q[0], q[1]]; }), col));
  const line = (a, b, w, col, d0 = 0) => op((dp(a) + dp(b)) / 2 + d0, () => { const A = pr(a), Bq = pr(b); g.line(A[0], A[1], Bq[0], Bq[1], w, col); });
  function flame(p, size, t, cols, d0 = 0, lean = 0) {   // a flickering tongue of (dream / ghost) fire, licking upward
    op(dp(p) + d0, () => {
      const q = pr(p), h = size * (1.6 + 0.5 * Math.sin(t * 13 + p[0] * 0.7 + p[2] * 0.5)), w = size * 0.8, sw = Math.sin(t * 9 + p[2]) * size * 0.4 + lean;
      g.poly([[q[0] - w, q[1]], [q[0] + sw, q[1] - h], [q[0] + w, q[1]]], cols[0]);
      g.poly([[q[0] - w * 0.5, q[1]], [q[0] + sw * 0.7, q[1] - h * 0.62], [q[0] + w * 0.5, q[1]]], cols[1]);
      g.ell(q[0], q[1], w * 0.95, w * 0.6, cols[0]); g.p(Math.round(q[0]), Math.round(q[1] - h * 0.3), cols[2]);
    });
  }
  function ground(r, col, col2) {   // a flat ring / pool on the floor
    op(-9999, () => { const rx = r, ry = VIEW === 's' ? r * 0.22 : r * 0.3; g.ell(OX, OY, rx, ry, col); if (col2) g.ell(OX, OY - 1, rx * 0.8, ry * 0.7, col2); });
  }
  // a head (or any detailed piece) drawn by hand per view, placed at a point, turned in the side view to angle ang
  function piece(p, d0, fn) { op(dp(p) + d0, () => { const q = pr(p); cx.save(); fn(q[0], q[1]); cx.restore(); }); }
  function rot2(fn, x, y, ang, flipY) { cx.save(); cx.translate(x, y); cx.rotate(ang); if (flipY) cx.scale(1, -1); fn(); cx.restore(); }

  // ---- shared timing: what a move looks like over its time ----
  const mvName = B => B.mv ? B.mv.name.split(':')[0] : '';
  const CAST = { spiral: 1, spiral3: 1, homing: 1, wave: 1, cross: 1, gapring: 1, triple: 1, rain: 1, ring: 1, ringaimed: 1, fireball: 1, aimed3: 1, aimed5: 1, warp: 1, summon: 1, mines: 1, laser: 1, laser3: 1 };

  // =============================================================
  //  NIGHTMARE — a black horse of bad dreams; violet dream-fire mane, tail and hooves. It rears to attack.
  // =============================================================
  const NM = { B: { d: '#0c0716', m: '#251838', h: '#4e3874' }, HO: '#1a1024', fire: ['#9a50f0', '#e0a8ff', '#ffffff'], fire2: ['#ff3a98', '#ffa8d8', '#ffffff'], eye: '#ff3a5a', eye2: '#ff8a3a' };
  function nmPose(B, T) {
    const n = mvName(B), mv = B.mv, t = mv ? mv.t : 0;
    const P = { rear: 0, cr: 0, gal: 0, ph: 0, hp: 0, hy: 0, mo: 0, kick: 0, paw: 0, lean: 0, toss: 0 };
    const br = Math.sin(T * 2.2);
    P.hp = 0.08 * br; P.cr = 0.6 + br * 0.6;
    const pc = (T % 4.2) / 4.2; if (!mv && pc > 0.72) P.paw = Math.sin((pc - 0.72) / 0.28 * PI) ;   // idle: paws the floor now and then
    if (n === 'charge' || n === 'dash3') {
      if (mv.ph === 'go') { P.gal = 1; P.ph = T * 22; P.lean = 4; P.hp = 0.25; P.mo = 0.3; }
      else if (mv.ph === 'rest') { const k = sstep((mv.pt || 0) / 0.6); P.rear = 0; P.cr = 3 * (1 - k); P.hp = 0.3 * (1 - k); P.mo = 0.4 * (1 - k); }
      else { const k = sstep((mv.pt || 0) / 0.3); P.rear = k; P.kick = T * 14; P.mo = k * 0.8; P.hp = -0.25 * k; }   // rears up, forelegs flailing, screams
    } else if (CAST[n] || n === 'dreamorbs') {
      const up = env(t, 0, 0.3, 0.38, 0.5), down = env(t, 0.42, 0.5, 0.9, 1.3);
      P.rear = up; P.kick = T * 12; P.cr += down * 5; P.hp = -0.3 * up + 0.35 * down; P.mo = Math.max(up, down) * 0.9; P.toss = env(t, 0.9, 1.2, 1.4, 1.8);
    }
    return P;
  }
  function nmBuild(B, P, T, p2) {
    const C = NM.B, F = p2 ? NM.fire2 : NM.fire, bodyPitch = P.rear * 0.85 + Math.sin(P.ph) * 0.05 * P.gal;
    const cr = P.cr + Math.sin(P.ph * 2) * 2 * P.gal;
    const hip = [0, -44 + cr, -20 + P.lean], chest = V.add(hip, pitch([0, -2, 40], bodyPitch)), mid = V.mix(hip, chest, 0.5);
    tube([hip, mid, chest], [15, 13.5, 15.5], C);
    // legs: forelegs bend at the knee (toward +z), hind legs at the hock (toward -z)
    const legs = [];
    for (const s of [-1, 1]) {
      const fa = V.add(chest, pitch([s * 9, 8, 2], bodyPitch)), ha = V.add(hip, pitch([s * 9, 6, -3], bodyPitch));
      const o = s > 0 ? 0 : 0.5;
      let ff = [s * 9, -4, chest[2] + 2], hf = [s * 9, -4, hip[2] - 2];
      if (P.gal) { const a = P.ph + o * PI, b = P.ph + o * PI + 2.2; ff = V.add(ff, [0, -Math.max(0, Math.sin(a)) * 11, Math.cos(a) * 13]); hf = V.add(hf, [0, -Math.max(0, Math.sin(b)) * 10, Math.cos(b) * 12]); }
      if (P.rear > 0) { const lifted = V.add(fa, [0, 14 - Math.cos(P.kick + o * PI) * 5, 9 + Math.sin(P.kick + o * PI) * 6]); ff = V.mix(ff, lifted, P.rear); hf = V.mix(hf, [s * 8, -4, hip[2] + 8], P.rear); }
      if (s > 0 && P.paw > 0) ff = V.add(ff, [0, -9 * P.paw, 7 * P.paw]);
      legs.push([fa, ff, 15, 17, [0, 0, 1]], [ha, hf, 16, 17, [0, -0.2, -1]]);
    }
    for (const [a, f, l1, l2, pole] of legs) {
      const [kn, an] = ik(a, f, l1, l2, pole);
      tube([a, kn], [6.5, 4.5], C, -2); tube([kn, an], [3.8, 3.2], C, -2);
      piece(an, -1.9, (x, y) => { g.ell(x, y + 2, 4, 3, NM.HO); g.ell(x, y + 4, 4.5, 1.6, F[0]); });   // burning hooves
    }
    // neck + head
    const nb = V.add(chest, pitch([0, -9, 5], bodyPitch)), toss = Math.sin(P.toss * PI * 2) * 0.35;
    const nt = V.add(nb, yaw(pitch([0, -24, 13], bodyPitch * 0.6 - P.hp * 0.6 + toss), P.hy));
    tube([nb, nt], [10, 7], C, 1);
    const hd = norm(yaw(pitch([0, 0.5, 1], bodyPitch * 0.5 - P.hp + toss), P.hy));
    for (let i = 0; i < 7; i++) flame(V.add(V.mix(nb, nt, i / 6), pitch([0, -7, -3], bodyPitch * 0.6)), 4 + (i % 2), T + i, F, 0.5, VIEW === 'b' ? 0 : -3);   // the mane
    nmHead(nt, hd, P, p2, F);
    // tail of dream-fire
    let tp = V.add(hip, pitch([0, -8, -13], bodyPitch));
    for (let i = 0; i < 7; i++) { flame(tp, 5 - i * 0.4, T + i * 0.7, F, -0.5, VIEW === 'b' ? 0 : -3); tp = V.add(tp, pitch([Math.sin(T * 2.4 + i * 0.8) * 2.4, 3.2 + i * 0.3, -3.2], bodyPitch * 0.5)); }
  }
  function nmHead(at, hd, P, p2, F) {
    const E = p2 ? NM.eye2 : NM.eye, C = NM.B;
    piece(at, 2, (x, y) => {
      if (VIEW === 's') {
        const q = pr(V.add(at, hd)), ang = Math.atan2(q[1] - y, q[0] - x), jaw = P.mo * 0.45;
        rot2(() => {
          g.poly([[-6, -4], [8, -5], [24, -1], [27, 4], [24, 7], [8, 8], [-4, 8]], C.m); g.poly([[-6, 2], [-4, 8], [8, 8], [24, 7], [27, 4], [24, 4]], C.d);
          cx.save(); cx.translate(10, 7); cx.rotate(jaw); g.poly([[-6, -1], [16, -1], [14, 3], [-4, 3]], C.d); cx.restore();
          g.line(-2, -3, 18, -3, 1, C.h); g.p(25, 2, '#000000'); g.ell(4, -1, 2, 1.6, E); g.p(5, -2, '#ffffff');
          g.poly([[-4, -4], [-8, -14], [0, -6]], C.m); g.poly([[-2, -4], [2, -13], [4, -5]], C.d);
          if (P.mo > 0.3) g.ell(21, 7, 2.5, 1.5, F[1]);
        }, x, y, ang);
        return;
      }
      cx.translate(x, y);   // front / back heads are drawn around (0, 0)
      if (VIEW === 'f') {
        g.poly([[-8, -8], [8, -8], [6, 14], [3, 20], [-3, 20], [-6, 14]], C.m); g.poly([[2, -8], [8, -8], [6, 14], [3, 20], [1, 20]], C.d); g.line(0, -6, 0, 14, 1, C.h);
        for (const m of [-1, 1]) { g.poly([[m * 5, -8], [m * 9, -18], [m * 8, -7]], C.m); g.ell(m * 6, -2, 1.8, 2.2, E); g.p(m * 6, -3, '#ffffff'); g.p(m * 2, 18, '#000000'); }
        if (P.mo > 0.3) g.ell(0, 21, 3, 1.5 + P.mo * 2, '#000000');
        return;
      }
      g.ell(0, -1, 8, 10, C.m); g.ell(2, 0, 6, 9, C.d); for (const m of [-1, 1]) g.poly([[m * 4, -8], [m * 8, -18], [m * 8, -6]], C.m);
    });
    if (VIEW !== 's') for (let i = 0; i < 3; i++) flame(V.add(at, [(i - 1) * 3, -10, -2]), 3.5, P.mo * 3 + i, F, 2.5);   // forelock
  }

  // =============================================================
  //  FENRIR — the great frost wolf. It sits tall, broken chains on its forelegs; howls, breathes frost, bounds.
  // =============================================================
  const FN = { B: { d: '#6a88b8', m: '#b4d0f0', h: '#f0f8ff' }, D: { d: '#4a6490', m: '#8aa8d0', h: '#c8dcf4' }, eye: '#4ae0ff', eye2: '#ff4060', chain: { d: '#3a3e48', m: '#7a808c', h: '#c0c4cc' } };
  function fnPose(B, T, E) {
    const n = mvName(B), mv = B.mv, t = mv ? mv.t : 0;
    const P = { sit: 1, cr: 0, gal: 0, ph: 0, hp: 0, hy: 0, mo: 0, howl: 0, lean: 0, tail: Math.sin(T * 1.7) };
    P.cr = Math.sin(T * 2) * 0.6; P.hy = Math.sin(T * 0.5) * 0.15;
    if (n === 'dash3') {
      if (mv.ph === 'go') { P.sit = 0; P.gal = 1; P.ph = T * 20; P.lean = 3; P.mo = 0.4; P.hp = 0.15; }
      else if (mv.ph === 'rest') { const k = sstep((mv.pt || 0) / 0.7); P.sit = k; P.cr = 2 * (1 - k); }
      else { const k = sstep((mv.pt || 0) / 0.3); P.sit = 1 - k; P.cr = 6 * k; P.hp = 0.25 * k; P.mo = 0.3 * k; }   // drops into a crouch, ready to spring
    } else if (n === 'breath' || n === 'breath3') {
      const k = env(t, 0, 0.35, 2.0, 2.3); P.sit = 1 - 0.6 * k; P.cr = 3 * k; P.hp = 0.35 * k; P.mo = env(t, 0.4, 0.5, 2.05, 2.25);
      const a = mv.dir != null && mv.a0 != null ? mv.a0 + (n === 'breath' ? clamp((t - 0.5) / 1.6, 0, 1) * 1.8 : clamp((t - 0.55) / 1.75, 0, 1) * 1.0) * mv.dir : E.look;
      const d = groundDir(E.face, a); P.hy = clamp(Math.atan2(d[0], d[1]), -1.1, 1.1) * k;
    } else if (CAST[n] || n === 'packhunt') {
      const k = env(t, 0.05, 0.4, 1.0, 1.4); P.howl = k; P.mo = k; P.hp = -0.9 * k; P.cr = -1.5 * k;   // throws its head back and howls
    }
    return P;
  }
  function fnBuild(B, P, T, p2) {
    const C = FN.B, CD = FN.D, s = P.sit;
    const bob = Math.sin(P.ph * 2) * 2 * P.gal;
    const hip = V.add(V.mix([0, -36, -22], [0, -15, -13], s), [0, P.cr + bob, P.lean]), chest = V.add(V.mix([0, -42, 18], [0, -54, 9], s), [0, P.cr * 0.6 + bob, P.lean]);
    const sp = Math.atan2(-(chest[1] - hip[1]), chest[2] - hip[2]);   // how steeply the spine rises
    const mid = V.add(V.mix(hip, chest, 0.5), [0, 2, 0]);
    // the bushy tail (curled on the floor while sitting, streaming out behind when running)
    const tb = V.add(hip, [0, -2, -12]), tl = [];
    for (let i = 0; i < 7; i++) { const k = i / 6, curl = s * k; tl.push(V.add(tb, [Math.sin(k * 2.4) * 18 * curl + P.tail * 3 * k, lerp(-6 * k, 12 * k, curl) + (1 - s) * (-10 * k + Math.sin(T * 5 + k * 3) * 3 * P.gal), lerp(-22 * k, 2 - 10 * k + 22 * k * k, curl)])); }
    tube(tl, [6, 8, 9, 9, 8, 6, 3], C, -3);
    // hind legs: a big haunch; folded under while sitting
    const legs = [];
    for (const sd of [-1, 1]) {
      const ha = V.add(hip, [sd * 9, 2, 1]), o = sd > 0 ? 0 : 0.5;
      let hf = V.mix([sd * 9, -3, hip[2] - 2], [sd * 12, -3, hip[2] + 19], s);
      if (P.gal) { const b = P.ph + o * PI + 2.4; hf = V.add(hf, [0, -Math.max(0, Math.sin(b)) * 10, Math.cos(b) * 13]); }
      const [kn, an] = ik(ha, hf, 15, 17, [0, -0.3, 1]);
      sph(V.mix(ha, kn, 0.4), 10, C, -1.5);
      tube([ha, kn], [9, 6], C, -1.5); tube([kn, an], [4.5, 3.5], C, -1.6); piece(an, -1.4, (x, y) => { g.ell(x + 1, y + 2, 4.5, 2.5, C.d); g.ell(x + 1, y + 1, 3.5, 1.8, C.m); });
      const fa = V.add(chest, [sd * 8, 9, 3]);
      let ff = [sd * 8, -3, chest[2] + 4];
      if (P.gal) { const a = P.ph + o * PI; ff = V.add(ff, [0, -Math.max(0, Math.sin(a)) * 12, Math.cos(a) * 14]); }
      legs.push([fa, ff, sd]);
    }
    tube([hip, mid, chest], [16, 15, 18], C);
    for (let i = 0; i < 6; i++) { const p = V.mix(hip, chest, i / 5); piece(p, 0.3, (x, y) => U.spike(g, x, y - (VIEW === 'b' ? 12 : 14), -PI / 2 + (VIEW === 's' ? -0.6 : (i - 2.5) * 0.25), 7, 3, CD)); }   // frost-spiked fur along the back
    // forelegs, each with a shackle and a length of broken chain
    for (const [fa, ff, sd] of legs) {
      const [kn, an] = ik(fa, ff, 18, 18, [0, 0, -1]);
      tube([fa, kn], [6, 5], C, 2); tube([kn, an], [5, 4], C, 2);
      piece(an, 2.1, (x, y) => { g.ell(x + (VIEW === 's' ? 2 : 0), y + 2, 5, 2.6, C.d); g.ell(x + (VIEW === 's' ? 2 : 0), y + 1, 4, 2, C.m); });
      const cuff = V.mix(kn, an, 0.45);
      piece(cuff, 2.2, (x, y) => {
        g.r(Math.round(x - 6), Math.round(y - 2), 12, 4, FN.chain.d); g.r(Math.round(x - 6), Math.round(y - 2), 12, 2, FN.chain.m); g.p(Math.round(x - 5), Math.round(y - 2), FN.chain.h);
        const sw = Math.sin(T * 3 + sd) * 2 + P.gal * Math.cos(P.ph) * 4;
        for (let i = 0; i < 3; i++) { const lx = x + sd * 4 + sw * (i + 1) * 0.4, ly = y + 4 + i * 4; g.ell(lx, ly, 1.8, 2.4, FN.chain.d); g.ell(lx, ly, 1, 1.4, FN.chain.m); }
      });
    }
    // chest ruff, neck, head
    const nb = V.add(chest, [0, -8, 5]);
    piece(nb, 2.5, (x, y) => { for (let i = -3; i <= 3; i++) U.spike(g, x + i * 3.2, y + 6, PI / 2 + i * 0.18, 9, 3.4, C); });
    const nt = V.add(nb, yaw(pitch([0, -18, 8], -P.hp * 0.8), P.hy * 0.6));
    tube([nb, nt], [11, 9], C, 2.6);
    const hd = norm(yaw(pitch([0, 0.25, 1], -P.hp - P.howl * 0.3), P.hy));
    fnHead(nt, hd, P, p2);
    if (P.mo > 0.2 && !P.howl && VIEW !== 'b') for (let i = 0; i < 3; i++) { const k = ((T * 2 + i / 3) % 1), m = V.add(nt, V.mul(hd, 18 + k * 16)); piece(m, 3, (x, y) => g.ell(x, y, 3 + k * 4, 2 + k * 3, `rgba(230,248,255,${0.8 - k * 0.6})`)); }   // frost on the breath
  }
  function fnHead(at, hd, P, p2) {
    const E = p2 ? FN.eye2 : FN.eye, C = FN.B, CD = FN.D;
    piece(at, 6, (x, y) => {
      if (VIEW === 's') {
        const q = pr(V.add(at, hd)), ang = Math.atan2(q[1] - y, q[0] - x), jaw = P.mo * 0.55;
        rot2(() => {
          g.poly([[-8, -8], [6, -9], [14, -3], [24, 0], [25, 3], [12, 5], [-6, 8]], C.m); g.poly([[-8, 2], [-6, 8], [12, 5], [25, 3], [24, 2]], CD.m);
          cx.save(); cx.translate(10, 5); cx.rotate(jaw); g.poly([[-8, -1], [12, -1], [12, 2], [-6, 4]], CD.m); if (P.mo > 0.25) { g.p(2, -1, '#ffffff'); g.p(8, -1, '#ffffff'); } cx.restore();
          if (P.mo > 0.25) g.poly([[2, 5], [20, 4], [12, 8]], '#5a1a2a');
          g.r(23, -1, 3, 2, '#1a1a2a'); g.ell(6, -3, 2.2, 1.5, E); g.p(7, -4, '#ffffff'); g.line(4, -5, 10, -4, 1, CD.d);
          g.poly([[-6, -7], [-6, -21], [1, -9]], C.m); g.poly([[-5, -9], [-5, -17], [-1, -9]], '#e8a0b0');
          for (let i = 0; i < 4; i++) U.spike(g, -6 - i * 2, -2 + i * 3, PI * 0.9 + i * 0.12, 8, 3, C);
        }, x, y, ang);
        return;
      }
      cx.translate(x, y);   // front / back heads are drawn around (0, 0)
      if (VIEW === 'f') {
        const lift = P.howl * 4;
        g.poly([[-12, -8], [12, -8], [7, 6 - lift], [0, 14 - lift], [-7, 6 - lift]], C.m); g.poly([[-12, -8], [-7, 6 - lift], [0, 14 - lift], [0, -8]], CD.m); g.ell(0, -4, 7, 6, C.h);
        for (const m of [-1, 1]) { g.poly([[m * 5, -8], [m * 12, -24], [m * 13, -6]], C.m); g.poly([[m * 7, -9], [m * 11, -19], [m * 11, -8]], '#e8a0b0'); g.ell(m * 6, -2, 2.2, 1.8, E); g.p(m * 6, -3, '#ffffff'); }
        g.ell(0, 9 - lift, 3, 2, '#1a1a2a');
        if (P.mo > 0.25) { g.ell(0, 14 - lift, 4, 1.5 + P.mo * 3, '#5a1a2a'); g.p(-2, 13 - lift, '#ffffff'); g.p(2, 13 - lift, '#ffffff'); }
        return;
      }
      g.ell(0, -2, 12, 11, C.m); g.ell(2, -1, 9, 9, CD.m); for (const m of [-1, 1]) g.poly([[m * 5, -8], [m * 12, -24], [m * 13, -6]], C.m);
      for (let i = -2; i <= 2; i++) U.spike(g, i * 4, 6, PI / 2 + i * 0.2, 8, 3, C);
    });
  }

  // =============================================================
  //  BONE DRAGON — a dead dragon's skeleton held together by green ghost-fire. Wings of rotten membrane.
  // =============================================================
  const BD = { B: { d: '#7a725a', m: '#d8d0b8', h: '#fff8e8' }, M: '#1c3830', M2: '#2c5446', glow: ['#30c080', '#a0ffd0', '#ffffff'], glow2: ['#d02a50', '#ff90a8', '#ffffff'] };
  function bdPose(B, T, E) {
    const n = mvName(B), mv = B.mv, t = mv ? mv.t : 0;
    const P = { fl: 0.35 + Math.sin(T * 1.6) * 0.15, sp: 0.6, cr: Math.sin(T * 2) * 0.8, lean: 0, hp: Math.sin(T * 1.3) * 0.08, hy: 0, mo: 0, tail: null, roar: 0, step: 0 };
    if (n === 'breath' || n === 'breath3') {
      const k = env(t, 0, 0.35, 2.0, 2.3); P.lean = 6 * k; P.hp = 0.5 * k; P.mo = env(t, 0.4, 0.5, 2.05, 2.25); P.sp = 0.6 + 0.3 * k;
      const a = mv.dir != null && mv.a0 != null ? mv.a0 + (n === 'breath' ? clamp((t - 0.5) / 1.6, 0, 1) * 1.8 : clamp((t - 0.55) / 1.75, 0, 1) * 1.0) * mv.dir : E.look;
      const d = groundDir(E.face, a); P.hy = clamp(Math.atan2(d[0], d[1]), -1.1, 1.1) * k;
    } else if (n === 'tail' && B.sweeps.length) {
      const sw = B.sweeps[0], d = groundDir(E.face, sw.ang); P.tail = [d[0], d[1], sw.t >= sw.tele ? 1 : sw.t / sw.tele]; P.lean = 4; P.cr = 3; P.sp = 0.9; P.fl = 0.6;
    } else if (n === 'quake') {
      let up = 0, hit = 0; for (const T0 of [0.45, 1.0, 1.55]) { up = Math.max(up, env(t, T0 - 0.33, T0 - 0.08, T0 - 0.06, T0)); hit = Math.max(hit, env(t, T0 - 0.02, T0, T0 + 0.1, T0 + 0.35)); }
      P.fl = 0.35 + up * 0.65 - hit * 0.5; P.sp = 1; P.cr = -6 * up + 7 * hit; P.step = hit; P.mo = Math.max(up, hit) * 0.6; P.hp = -0.3 * up + 0.3 * hit;
    } else if (n === 'dash3') {
      const go = mv.ph === 'go'; P.lean = go ? 10 : 4 * sstep((mv.pt || 0) / 0.3); P.cr = go ? 4 : 5; P.fl = go ? 0.1 : 0.8; P.sp = go ? 0.3 : 1; P.hp = 0.3; P.mo = go ? 0.6 : 0.3;
    } else if (CAST[n] || n === 'raisedead') {
      const k = env(t, 0.05, 0.4, 1.0, 1.4); P.roar = k; P.mo = k; P.hp = -0.55 * k; P.sp = 0.6 + 0.4 * k; P.fl = 0.35 + 0.5 * k + Math.sin(T * 10) * 0.08 * k;
    }
    return P;
  }
  function bdBuild(B, P, T, p2) {
    const C = BD.B, G = p2 ? BD.glow2 : BD.glow;
    const pelvis = [0, -30 + P.cr, -6], lean = P.lean * 0.035;
    const chest = V.add(pelvis, pitch([0, -32, 6], -lean)), spine = [];
    for (let i = 0; i <= 6; i++) spine.push(V.mix(pelvis, chest, i / 6));
    // tail: lies along the floor and curls; in a tail sweep it lashes out the way the sweep points
    const tl = [V.add(pelvis, [0, 2, -6])];
    for (let i = 1; i < 11; i++) {
      const k = i / 10, prev = tl[i - 1];
      let dir = norm([Math.sin(T * 1.4 + k * 3) * 0.5 * k, 0.55 - k * 0.6, -1]);
      if (P.tail) dir = norm(V.mix(dir, [P.tail[0], 0.05, P.tail[1]], P.tail[2]));
      tl.push(V.add(prev, V.mul(dir, P.tail ? 8 : 6)));
    }
    for (let i = 1; i < tl.length; i++) { tube([tl[i - 1], tl[i]], [3.6 - i * 0.25, 3.4 - i * 0.25], C, -2); if (i % 2) piece(tl[i], -1.9, (x, y) => U.spike(g, x, y - 2, -PI / 2, 4, 1.6, C)); }
    // hind legs (digitigrade): hip -> knee (forward) -> ankle -> claws
    for (const s of [-1, 1]) {
      const ha = V.add(pelvis, [s * 10, 2, 0]), st = s > 0 ? P.step * 4 : 0;
      const [kn, an] = ik(ha, [s * 13, -6 - st, 4 + st], 15, 14, [s * 0.2, 0, 1]);
      tube([ha, kn], [3.4, 3], C, -1); tube([kn, an], [2.8, 2.4], C, -1); sph(kn, 3.2, C, -0.9, 0);
      piece(an, -0.8, (x, y) => { for (let i = -1; i <= 1; i++) g.line(x, y, x + i * 4 + (VIEW === 's' ? 5 : 0), y + 6, 2, C.d); g.ell(x, y, 3, 2.4, C.m); });
    }
    // pelvis, spine, ribs (rib hoops drawn in 3D), ghost-fire heart
    sph(pelvis, 7, C, -0.5);
    sph(V.add(V.mix(pelvis, chest, 0.55), [0, 0, 1]), 7 + Math.sin(T * 4) * 1, { d: G[0], m: G[1], h: G[2] }, -0.4);
    tube(spine, spine.map(() => 2.6), C, -0.3);
    for (let r = 0; r < 5; r++) {
      const k = 0.3 + r * 0.15, c = V.mix(pelvis, chest, k), R = [9, 12, 13, 12, 9][r];
      for (const s of [-1, 1]) {
        const pts = [];
        for (let i = 0; i <= 6; i++) { const th = i / 6 * PI; pts.push(V.add(c, pitch([s * Math.sin(th) * R, 2 + (1 - Math.cos(th)) * 2.5, -Math.cos(th) * R * 0.75], -lean))); }
        for (let i = 1; i < pts.length; i++) { line(pts[i - 1], pts[i], 3.4, C.d, 0.2); line(pts[i - 1], pts[i], 1.8, C.m, 0.25); }
      }
    }
    // arms: small, clawed, held in front of the ribs
    for (const s of [-1, 1]) {
      const sa = V.add(chest, [s * 9, 4, 4]), [el, hd] = ik(sa, V.add(chest, [s * 7, 18 - P.roar * 6, 14 + P.roar * 4]), 9, 9, [s, 0.3, -0.5]);
      tube([sa, el], [2.4, 2], C, 1.5); tube([el, hd], [2, 1.8], C, 1.5); piece(hd, 1.6, (x, y) => { for (let i = -1; i <= 1; i++) g.line(x, y, x + i * 3, y + 4, 1.4, C.d); });
    }
    // wings: arm bones and four fingers, the rotten membrane stretched between
    for (const s of [-1, 1]) {
      const root = V.add(chest, [s * 7, -3, -5]), up = (P.fl - 0.35) * 1.6, spr = P.sp;
      const W = q => V.add(root, roll(yaw([s * q[0] * (0.55 + 0.45 * spr), q[1], q[2]], -s * (1 - spr) * 0.6), s * up * 0.9));
      const el = W([20, -10, -6]), wr = W([40, -22, -10]);
      const tips = [W([66, -18, -14]), W([62, 4, -14]), W([50, 22, -12]), W([32, 32, -10])], base = W([10, 22, -6]);
      const panels = [[root, el, wr, tips[0]], [wr, tips[0], tips[1]], [wr, tips[1], tips[2]], [wr, tips[2], tips[3]], [wr, tips[3], base, root]];
      panels.forEach((pp, i) => poly(pp, i % 2 ? BD.M : BD.M2, -6));
      tube([root, el, wr], [3, 2.6, 2.2], C, -5);
      for (const tp of tips) tube([wr, tp], [1.8, 1], C, -4.5);
    }
    // neck vertebrae + skull
    const nb = V.add(chest, [0, -4, 3]), nk = [];
    for (let i = 0; i <= 5; i++) { const k = i / 5; nk.push(V.add(nb, yaw(pitch([0, -16 * k - 4 * k * k, 4 * k + 12 * k * k], -P.hp * k * 1.2 + P.roar * 0.4 * k), P.hy * k))); }
    tube(nk, nk.map((_, i) => 3.2 - i * 0.2), C, 1);
    const hd = norm(yaw(pitch([0, 0.2, 1], -P.hp - P.roar * 0.5), P.hy));
    bdHead(nk[5], hd, P, p2, G);
    flame(V.add(chest, [0, -2, -4]), 3, T, G, -0.6);
  }
  function bdHead(at, hd, P, p2, G) {
    const C = BD.B;
    piece(at, 3, (x, y) => {
      if (VIEW === 's') {
        const q = pr(V.add(at, hd)), ang = Math.atan2(q[1] - y, q[0] - x), jaw = P.mo * 0.6;
        rot2(() => {
          g.poly([[-8, -8], [8, -9], [22, -4], [28, 0], [26, 3], [8, 3], [-6, 4]], C.m); g.poly([[-6, 0], [-6, 4], [8, 3], [26, 3], [26, 1]], C.d);
          cx.save(); cx.translate(0, 3); cx.rotate(jaw); g.poly([[-4, -1], [24, -1], [22, 3], [-2, 4]], C.m); for (let i = 4; i < 22; i += 4) g.p(i, -2, '#ffffff'); cx.restore();
          for (let i = 6; i < 26; i += 4) g.p(i, 4, '#ffffff');
          g.ell(4, -3, 4, 3, '#0c140f'); g.ell(4, -3, 2, 1.6, G[0]); g.p(4, -4, G[1]);
          g.line(-6, -6, -18, -14, 3, C.d); g.line(-6, -6, -17, -13, 1.6, C.m); g.line(-2, -8, -10, -18, 2.4, C.m);
          g.ell(24, -1, 1.2, 1, '#0c140f');
          if (P.mo > 0.3) g.ell(14, 6, 5, 2 + P.mo * 2, G[0]);
        }, x, y, ang);
        return;
      }
      cx.translate(x, y);   // front / back heads are drawn around (0, 0)
      if (VIEW === 'f') {
        g.poly([[-11, -10], [11, -10], [8, 8], [4, 16], [-4, 16], [-8, 8]], C.m); g.poly([[2, -10], [11, -10], [8, 8], [4, 16], [2, 16]], C.d);
        for (const m of [-1, 1]) { g.ell(m * 5, -3, 3.5, 3, '#0c140f'); g.ell(m * 5, -3, 1.8, 1.6, G[0]); g.p(m * 5, -4, G[1]); g.line(m * 9, -9, m * 17, -18, 2.6, C.m); g.p(m * 2, 9, '#0c140f'); }
        for (let i = -3; i <= 3; i += 2) g.p(i, 15, '#ffffff');
        if (P.mo > 0.3) { g.ell(0, 18 + P.mo * 2, 5, 2 + P.mo * 3, '#0c140f'); g.ell(0, 18 + P.mo * 2, 3, 1 + P.mo * 2, G[0]); }
        return;
      }
      g.ell(0, -2, 11, 10, C.m); g.ell(2, -1, 8, 8, C.d); g.line(0, -11, 0, 6, 1, C.h);
      for (const m of [-1, 1]) g.line(m * 8, -8, m * 17, -18, 2.6, C.m);
    });
  }

  // =============================================================
  //  LEVIATHAN — a sea serpent rising out of a churning pool, its coils arching out of the water around it.
  // =============================================================
  const LV = { B: { d: '#163470', m: '#3a7ad8', h: '#9ad0ff' }, belly: { c: '#bfe0ff', s: '#7aa8d8' }, fin: { d: '#1a7a8a', m: '#4ad0e0', h: '#c0fff8' }, eye: '#ffe14a', eye2: '#ff3a3a', water: '#123a6a', foam: '#5aa0e0' };
  function lvPose(B, T, E) {
    const n = mvName(B), mv = B.mv, t = mv ? mv.t : 0;
    const P = { H: 1, sw: T * 1.6, amp: 1, lean: 0, hp: Math.sin(T * 1.6) * 0.1, hy: 0, mo: 0, rise: 0.5 + Math.sin(T * 1.2) * 0.2, coil: T * 0.6, thrash: 0 };
    if (n === 'breath' || n === 'breath3') {
      const k = env(t, 0, 0.35, 2.0, 2.3), pull = env(t, 0, 0.3, 0.35, 0.55); P.lean = 1.2 * k - 0.5 * pull; P.H = 1 - 0.18 * k + 0.1 * pull; P.hp = 0.55 * k; P.mo = env(t, 0.4, 0.5, 2.05, 2.25); P.amp = 1 - 0.6 * k;
      const a = mv.dir != null && mv.a0 != null ? mv.a0 + (n === 'breath' ? clamp((t - 0.5) / 1.6, 0, 1) * 1.8 : clamp((t - 0.55) / 1.75, 0, 1) * 1.0) * mv.dir : E.look;
      const d = groundDir(E.face, a); P.hy = clamp(Math.atan2(d[0], d[1]), -1.2, 1.2) * k;
    } else if (n === 'tentacles') {
      const k = env(t, 0, 0.6, 3.5, 4); P.H = 1 + 0.15 * k; P.thrash = k; P.sw = T * 4; P.amp = 1 + 0.6 * k; P.rise = 0.5 + 0.5 * k; P.mo = 0.6 * k; P.hp = -0.3 * k; P.coil = T * 2.4;
    } else if (n === 'tsunami') {
      const k = env(t, 0, 0.3, 0.7, 1.2); P.H = 1 + 0.25 * k; P.hp = -0.6 * k + 0.6 * env(t, 0.6, 0.8, 1.2, 1.6); P.mo = k; P.lean = env(t, 0.6, 0.8, 1.2, 1.6) * 1.5;
    } else if (n === 'dash3') {
      const go = mv.ph === 'go'; P.lean = go ? 1.6 : 0.6; P.H = go ? 0.7 : 0.85; P.amp = go ? 0.4 : 0.8; P.mo = go ? 0.7 : 0.3; P.hp = 0.4; P.rise = go ? 0.1 : 0.3;
    } else if (CAST[n]) {
      const k = env(t, 0.05, 0.4, 1.0, 1.4); P.H = 1 + 0.18 * k; P.mo = k; P.hp = -0.5 * k;
    }
    return P;
  }
  function lvBuild(B, P, T, p2) {
    const C = LV.B;
    ground(56, LV.water, '#1a4a84');
    // the coils: three arches rising out of the water around the body, sliding round as it swims
    for (let k = 0; k < 3; k++) {
      const a0 = k / 3 * TAU + P.coil, c = [Math.cos(a0) * 44, 0, Math.sin(a0) * 40 - 6], tng = [-Math.sin(a0), 0, Math.cos(a0)], R = 12 + P.rise * 8;
      const pts = [], rs = [];
      for (let i = 0; i <= 8; i++) { const u = i / 8 * PI; pts.push(V.add(c, [tng[0] * Math.cos(u) * R, -Math.sin(u) * R * (0.9 + 0.3 * Math.sin(T * 2 + k)), tng[2] * Math.cos(u) * R])); rs.push(7 + Math.sin(u) * 2); }
      tube(pts, rs, C, 0, { belly: { c: LV.belly.c, s: LV.belly.s, w: 0.35 } });
      piece(pts[4], 0.2, (x, y) => { for (let i = -1; i <= 1; i++) U.spike(g, x + i * 5, y - 7, -PI / 2 + i * 0.4, 6, 2.4, LV.fin); });
      for (const e of [pts[0], pts[8]]) piece(e, 0.1, (x, y) => { g.ell(x, y + 1, 9, 2.4, LV.foam); g.ell(x, y + 1, 6, 1.4, '#d0f0ff'); });
    }
    // the neck: an S-curve rising out of the pool
    const N = 14, sp = [], rs = [], thr = P.thrash * Math.sin(T * 9) * 6;
    for (let i = 0; i < N; i++) {
      const s = i / (N - 1);
      sp.push([Math.sin(s * 2.4 + P.sw * 0.7) * 6 * P.amp * s + thr * s, -s * 74 * P.H, -6 + Math.sin(s * 3.2 + P.sw) * 9 * P.amp * s + P.lean * s * s * 34]);
      rs.push(lerp(13, 7, s));
    }
    tube(sp, rs, C, 0, { belly: { c: LV.belly.c, s: LV.belly.s, w: 0.42 } });
    for (let i = 3; i < N - 1; i += 2) piece(sp[i], VIEW === 'b' ? 0.5 : -0.2, (x, y) => U.spike(g, x + (VIEW === 's' ? -rs[i] * 0.7 : 0), y - rs[i] * 0.6, VIEW === 's' ? PI * 1.1 : -PI / 2, 8, 3, LV.fin));
    piece(sp[0], 0.3, (x, y) => { g.ell(x, y + 1, 18, 4, LV.foam); g.ell(x, y + 1, 12, 2.4, '#d0f0ff'); });
    const at = sp[N - 1], hd = norm(yaw(pitch([0, 0.15, 1], -P.hp), P.hy));
    lvHead(at, hd, P, p2);
  }
  function lvHead(at, hd, P, p2) {
    const C = LV.B, E = p2 ? LV.eye2 : LV.eye, Fn = LV.fin;
    piece(at, 3, (x, y) => {
      if (VIEW === 's') {
        const q = pr(V.add(at, hd)), ang = Math.atan2(q[1] - y, q[0] - x), jaw = P.mo * 0.55;
        rot2(() => {
          for (let i = 0; i < 3; i++) U.spike(g, -6 - i * 3, -6 + i * 2, PI + 0.5 + i * 0.25, 11, 3, Fn);
          g.poly([[-8, -8], [10, -9], [24, -4], [28, 1], [12, 4], [-6, 6]], C.m); g.poly([[-6, 1], [-6, 6], [12, 4], [28, 1], [26, 0]], C.d);
          cx.save(); cx.translate(4, 4); cx.rotate(jaw); g.poly([[-8, -1], [22, -1], [20, 3], [-6, 4]], LV.belly.c); for (let i = 2; i < 20; i += 4) g.p(i, -2, '#ffffff'); cx.restore();
          if (P.mo > 0.25) g.poly([[0, 5], [22, 3], [12, 9]], '#3a0a1a');
          g.ell(6, -3, 2.6, 2, E); g.p(7, -4, '#ffffff'); g.line(2, -7, 11, -5, 1.4, C.d);
          U.spike(g, 0, -8, -PI * 0.75, 9, 2.4, { d: '#c0b080', m: '#f0e8c8', h: '#ffffff' });
        }, x, y, ang);
        return;
      }
      cx.translate(x, y);   // front / back heads are drawn around (0, 0)
      if (VIEW === 'f') {
        for (const m of [-1, 1]) { for (let i = 0; i < 3; i++) U.spike(g, m * 10, -4 + i * 4, m > 0 ? -0.4 + i * 0.35 : PI + 0.4 - i * 0.35, 10, 3, Fn); g.line(m * 6, -8, m * 13, -19, 2.6, '#f0e8c8'); }
        g.poly([[-11, -9], [11, -9], [9, 6], [4, 14], [-4, 14], [-9, 6]], C.m); g.poly([[2, -9], [11, -9], [9, 6], [4, 14], [2, 14]], C.d);
        for (const m of [-1, 1]) { g.ell(m * 6, -2, 2.6, 2.2, E); g.p(m * 6, -3, '#ffffff'); g.p(m * 2, 11, '#0a1a3a'); }
        if (P.mo > 0.3) { g.ell(0, 16 + P.mo * 2, 6, 2 + P.mo * 3, '#3a0a1a'); for (let i = -4; i <= 4; i += 2) g.p(i, 14 + P.mo * 2, '#ffffff'); }
        return;
      }
      for (const m of [-1, 1]) { for (let i = 0; i < 3; i++) U.spike(g, m * 10, -4 + i * 4, m > 0 ? -0.4 + i * 0.35 : PI + 0.4 - i * 0.35, 10, 3, Fn); g.line(m * 6, -8, m * 13, -19, 2.6, '#f0e8c8'); }
      g.ell(0, -1, 11, 10, C.m); g.ell(2, 0, 8, 8, C.d); for (let i = -1; i <= 1; i++) U.spike(g, i * 4, -8, -PI / 2 + i * 0.3, 8, 2.6, Fn);
    });
  }

  // =============================================================
  //  QUETZALCOATL — the feathered serpent. It hangs in the air on rainbow wings, its body rippling.
  // =============================================================
  const QZ = { B: { d: '#147a58', m: '#3ad8a0', h: '#b8ffe0' }, belly: { c: '#ffd060', s: '#c09020' }, F: ['#e04040', '#ff9a3a', '#ffe14a', '#3ac0d8', '#2a6ad0'], eye: '#ffe14a', eye2: '#ff3a3a' };
  function qzPose(B, T, E) {
    const n = mvName(B), mv = B.mv, t = mv ? mv.t : 0;
    const P = { fl: Math.sin(T * 5) * 0.5 + 0.5, beat: 1, sp: 0.8, u: T * 2.2, st: 0, hp: Math.sin(T * 1.5) * 0.1, hy: 0, mo: 0, tail: null, rise: 0 };
    if (n === 'dash3') {
      const go = mv.ph === 'go'; P.st = go ? 1 : 0.3 * sstep((mv.pt || 0) / 0.3); P.sp = go ? 0.15 : 1; P.fl = go ? 0.2 : 0.9; P.mo = go ? 0.6 : 0.3; P.hp = 0.2;
    } else if (n === 'tail' && B.sweeps.length) {
      const sw = B.sweeps[0], d = groundDir(E.face, sw.ang); P.tail = [d[0], d[1], sw.t >= sw.tele ? 1 : sw.t / sw.tele]; P.fl = Math.sin(T * 9) * 0.5 + 0.5;
    } else if (CAST[n] || n === 'tornado') {
      const k = env(t, 0.05, 0.35, 1.0, 1.4); P.sp = 0.8 + 0.2 * k; P.fl = Math.sin(T * (5 + 6 * k)) * 0.5 + 0.5; P.mo = k; P.hp = -0.5 * k; P.rise = 6 * k;
    }
    return P;
  }
  function qzBuild(B, P, T, p2) {
    const C = QZ.B, N = 18, sp = [], rs = [];
    for (let i = 0; i < N; i++) {
      const s = i / (N - 1), w = 1 - P.st;
      let p = [Math.sin(s * 4 + P.u * 0.7) * 16 * w * s, -78 - P.rise + s * 62 * w - s * 14 * P.st + (1 - w) * 18, 10 - s * 28 * w + Math.sin(s * 6 - P.u) * 12 * w * s - s * 96 * P.st];
      if (P.tail && s > 0.45) { const k = (s - 0.45) / 0.55 * P.tail[2]; p = V.add(p, [P.tail[0] * k * 60, 0, P.tail[1] * k * 60]); }
      sp.push(p); rs.push(s < 0.15 ? lerp(5, 8, s / 0.15) : lerp(8, 2.5, (s - 0.15) / 0.85));
    }
    tube(sp, rs, C, 0, { belly: { c: QZ.belly.c, s: QZ.belly.s, w: 0.4 }, scale: 1 });
    // tail fan
    piece(sp[N - 1], 0, (x, y) => { for (let i = -1; i <= 1; i++) U.feather(g, x, y, PI / 2 + i * 0.5 + (VIEW === 's' ? -0.8 : 0), 12, 3, { m: QZ.F[(i + 2) % 5], d: QZ.F[(i + 3) % 5], tip: '#ffffff' }); });
    // wings: an arm from behind the head, a fan of long rainbow feathers hanging off it
    const root0 = sp[3], beat = (P.fl - 0.5) * 1.3;
    for (const s of [-1, 1]) {
      const root = V.add(root0, [s * 5, 2, -3]);
      const W = q => V.add(root, roll([s * q[0] * (0.35 + 0.65 * P.sp), q[1], q[2] - q[0] * 0.45 - (1 - P.sp) * q[0] * 0.6], s * beat));   // swept back, so they show from the side too
      const el = W([18, -6, -4]), wr = W([36, -10, -8]);
      for (let i = 0; i < 8; i++) {
        const k = i / 7, b = V.mix(root, V.mix(el, wr, k), Math.min(1, k * 2)), tip = V.add(b, roll([s * (8 + k * 14) * (0.4 + 0.6 * P.sp), 16 + (1 - k) * 8, -6], s * beat * 0.6));
        const col = QZ.F[i % 5];
        poly([b, V.add(V.mix(b, tip, 0.5), [s * 2, 0, 0]), tip, V.add(V.mix(b, tip, 0.5), [-s * 2, 2, 0])], col, -3 + k * 0.1);
      }
      tube([root, el, wr], [3, 2.6, 2], C, -2.5);
    }
    const hd = norm(yaw(pitch(norm(V.sub(sp[0], sp[2])), -P.hp * 0.8), P.hy));
    qzHead(sp[0], hd, P, p2);
  }
  function qzHead(at, hd, P, p2) {
    const C = QZ.B, E = p2 ? QZ.eye2 : QZ.eye;
    const crest = (x, y, up) => { for (let i = -2; i <= 2; i++) U.feather(g, x + i * 2.5, y, up + i * 0.32, 11 - Math.abs(i), 2.6, { m: i % 2 ? '#ffe14a' : '#e04040', d: '#a02020', tip: '#ffffff' }); };
    piece(at, 3, (x, y) => {
      if (VIEW === 's') {
        const q = pr(V.add(at, hd)), ang = Math.atan2(q[1] - y, q[0] - x), jaw = P.mo * 0.5;
        rot2(() => {
          crest(-4, -5, -PI * 0.7);
          g.poly([[-6, -6], [8, -7], [20, -3], [24, 1], [10, 4], [-5, 5]], C.m); g.poly([[-5, 1], [-5, 5], [10, 4], [24, 1], [22, 0]], C.d);
          cx.save(); cx.translate(2, 4); cx.rotate(jaw); g.poly([[-6, -1], [18, -1], [16, 2], [-4, 3]], QZ.belly.c); cx.restore();
          if (P.mo > 0.25) g.line(20, 4, 30, 8, 1.4, '#e04040');
          g.ell(6, -2, 2.2, 1.8, E); g.p(7, -3, '#ffffff'); g.p(22, -1, '#0a2a1a');
        }, x, y, ang);
        return;
      }
      cx.translate(x, y);
      crest(0, -6, -PI / 2);
      g.ell(0, 0, 8, 8, C.m); g.poly([[-6, 2], [6, 2], [3, 12], [-3, 12]], C.m); g.ell(2, 1, 6, 7, C.d);
      if (VIEW === 'f') { for (const m of [-1, 1]) { g.ell(m * 4, -1, 2, 2, E); g.p(m * 4, -2, '#ffffff'); } g.poly([[-4, 10], [4, 10], [0, 14]], QZ.belly.c); if (P.mo > 0.3) g.line(0, 14, 0, 20, 1.4, '#e04040'); }
    });
  }

  // =============================================================
  const RIGS = { nightmare: [nmPose, nmBuild, 1.05], fenrir: [fnPose, fnBuild, 1.3], bonedragon: [bdPose, bdBuild, 1.2], leviathan: [lvPose, lvBuild, 1.1], quetzal: [qzPose, qzBuild, 1.1] };   // [pose, build, size]
  function faceOf(B, E) {
    const mv = B.mv, st = B.b3 || (B.b3 = {});
    let want;
    if (mv && /charge|dash3/.test(mv.name) && mv.ph === 'go') want = face4(Math.atan2(B.vy || 0, B.vx || 0) || mv.a0 || 0);
    else if (mv && (mv.name === 'tail') && B.sweeps.length) want = face4(B.sweeps[0].ang + PI);   // the tail lashes the way the sweep goes: the head faces the other way
    else if (mv) { if (mv.b3f == null) mv.b3f = face4(E.look); want = mv.b3f; }
    else { want = face4(E.look); if (st.f && want !== st.f) { if (st.fs == null) st.fs = E.t; if (E.t - st.fs < 0.35) want = st.f; else st.fs = null; } else st.fs = null; }
    return (st.f = want);
  }
  function draw(ctx, B, x, yFeet, hurt, E) {
    const R = RIGS[B.type]; if (!R) return false;
    E = Object.assign({}, E); E.look = Math.atan2(E.hero.y - B.y, E.hero.x - B.x);
    const f = faceOf(B, E); E.face = f; VIEW = f === 'l' || f === 'r' ? 's' : f;
    const P = R[0](B, E.t, E);
    OPS = []; cx.clearRect(0, 0, CW, CH);
    R[1](B, P, E.t, B.phase === 2);
    OPS.sort((a, b) => a[0] - b[0]);
    const sz = R[2] || 1; cx.setTransform(sz, 0, 0, sz, OX * (1 - sz), OY * (1 - sz));   // drawn bigger about the feet: more pixels, not bigger pixels
    for (const o of OPS) o[1]();
    cx.setTransform(1, 0, 0, 1, 0, 0);
    U.pixelize(cv, '#120a14');
    let src = cv;
    if (f === 'l' || hurt) {
      fx.clearRect(0, 0, CW, CH); fx.save();
      if (f === 'l') { fx.translate(CW, 0); fx.scale(-1, 1); }
      fx.drawImage(cv, 0, 0); fx.restore();
      if (hurt) { fx.globalCompositeOperation = 'source-atop'; fx.fillStyle = '#ffffff'; fx.fillRect(0, 0, CW, CH); fx.globalCompositeOperation = 'source-over'; }
      src = fc;
    }
    const ox = f === 'l' ? CW - OX : OX;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, Math.round(x / K - ox) * K, Math.round(yFeet / K - OY) * K, CW * K, CH * K);
    return true;
  }
  return { has: t => !!RIGS[t], draw, types: Object.keys(RIGS) };
})();
