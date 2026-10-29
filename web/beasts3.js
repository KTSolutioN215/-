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
  let VIEW = 'f', PSI = -Math.PI / 2, DIRX = 1; const SL = 0.45;   // PSI: the way the body faces in the world (rad, y up); VIEW: which hand-drawn head to use; DIRX: +1 if it faces screen-right
  // world angle -> model [x, z] (x = the beast's right side, z = forward)
  function gdir(E, a) { return [-Math.sin(a - PSI), Math.cos(a - PSI)]; }
  // model -> [canvas x, canvas y, depth]. One fixed camera looking down a little (nearer = lower); the model is turned to PSI,
  // so turning round is perfectly smooth — only the hand-drawn heads switch between front / side / back.
  function pr(p) {
    const c = Math.cos(PSI), s = Math.sin(PSI), X = p[2] * c + p[0] * s, Z = p[2] * s - p[0] * c;
    return [OX + X, OY + p[1] - Z * SL, -Z];
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
    op(-9999, () => { const rx = r, ry = r * SL; g.ell(OX, OY, rx, ry, col); if (col2) g.ell(OX, OY - 1, rx * 0.8, ry * 0.7, col2); });
  }
  // a head (or any detailed piece) drawn by hand per view, placed at a point, turned in the side view to angle ang
  function piece(p, d0, fn) { op(dp(p) + d0, () => { const q = pr(p); cx.save(); fn(q[0], q[1]); cx.restore(); }); }
  function rot2(fn, x, y, ang) { cx.save(); cx.translate(x, y); cx.rotate(ang); if (Math.cos(ang) < 0) cx.scale(1, -1); fn(); cx.restore(); }   // a side-view piece pointing left is mirrored, not upside down

  // front-view mouth: the lower jaw drops away from the upper muzzle (yb = the muzzle's lower edge, w = its half width);
  // call before drawing the upper head, then upperTeeth() after it
  function frontJaw(yb, w, gap, jawH, colJaw, colIn, glow) {
    g.poly([[-w, yb - 2], [w, yb - 2], [w * 0.8, yb + gap], [-w * 0.8, yb + gap]], colIn);
    if (glow && gap > 1) g.ell(0, yb + gap * 0.55, w * 0.55, Math.max(1, gap * 0.4), glow);
    g.poly([[-w, yb - 1 + gap], [w, yb - 1 + gap], [w * 0.6, yb + jawH + gap], [-w * 0.6, yb + jawH + gap]], colJaw);
    if (gap > 1.5) for (const m of [-1, 1]) g.poly([[m * w * 0.7, yb - 1 + gap], [m * w * 0.45, yb - 1 + gap], [m * w * 0.58, yb - 3.5 + gap]], '#ffffff');
  }
  function upperTeeth(yb, w, gap) { if (gap > 1.5) for (const m of [-1, 1]) g.poly([[m * w * 0.75, yb - 1], [m * w * 0.45, yb - 1], [m * w * 0.6, yb + 2.5]], '#ffffff'); }

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
    for (let i = 0; i < 7; i++) flame(V.add(V.mix(nb, nt, i / 6), pitch([0, -7, -3], bodyPitch * 0.6)), 4 + (i % 2), T + i, F, 0.5, VIEW === 's' ? -3 * DIRX : 0);   // the mane
    nmHead(nt, hd, P, p2, F); MOUTHS.push(V.add(nt, V.mul(hd, 21)));
    // tail of dream-fire
    let tp = V.add(hip, pitch([0, -8, -13], bodyPitch));
    for (let i = 0; i < 7; i++) { flame(tp, 5 - i * 0.4, T + i * 0.7, F, -0.5, VIEW === 's' ? -3 * DIRX : 0); tp = V.add(tp, pitch([Math.sin(T * 2.4 + i * 0.8) * 2.4, 3.2 + i * 0.3, -3.2], bodyPitch * 0.5)); }
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
        const gap = P.mo * 6;
        frontJaw(17, 4.5, gap, 4, C.d, '#2a0610');
        g.poly([[-8, -8], [8, -8], [6, 12], [4, 17], [-4, 17], [-6, 12]], C.m); g.poly([[2, -8], [8, -8], [6, 12], [4, 17], [1, 17]], C.d); g.line(0, -6, 0, 13, 1, C.h);
        for (const m of [-1, 1]) { g.poly([[m * 5, -8], [m * 9, -18], [m * 8, -7]], C.m); g.ell(m * 6, -2, 1.8, 2.2, E); g.p(m * 6, -3, '#ffffff'); g.p(m * 2, 15, '#000000'); }
        upperTeeth(17, 4.5, gap);
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
      const d = gdir(E, a); P.hy = clamp(Math.atan2(d[0], d[1]), -1.45, 1.45) * k;
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
    for (let i = 0; i < 6; i++) { const p = V.mix(hip, chest, i / 5); piece(p, 0.3, (x, y) => U.spike(g, x, y - (VIEW === 'b' ? 12 : 14), -PI / 2 + (VIEW === 's' ? -0.6 * DIRX : (i - 2.5) * 0.25), 7, 3, CD)); }   // frost-spiked fur along the back
    // forelegs, each with a shackle and a length of broken chain
    for (const [fa, ff, sd] of legs) {
      const [kn, an] = ik(fa, ff, 18, 18, [0, 0, -1]);
      tube([fa, kn], [6, 5], C, 2); tube([kn, an], [5, 4], C, 2);
      piece(an, 2.1, (x, y) => { g.ell(x + (VIEW === 's' ? 2 * DIRX : 0), y + 2, 5, 2.6, C.d); g.ell(x + (VIEW === 's' ? 2 * DIRX : 0), y + 1, 4, 2, C.m); });
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
    fnHead(nt, hd, P, p2); MOUTHS.push(V.add(nt, V.mul(hd, 19)));
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
        const lift = P.howl * 4, gap = P.mo * 7;
        cx.translate(0, -lift);
        frontJaw(11, 5.5, gap, 5, CD.m, '#5a1a2a'); if (gap > 2) g.ell(0, 11 + gap * 0.6, 2.6, 1.4, '#d06070');   // the tongue
        g.poly([[-12, -8], [12, -8], [7, 4], [5, 11], [-5, 11], [-7, 4]], C.m); g.poly([[-12, -8], [-7, 4], [-5, 11], [0, 11], [0, -8]], CD.m); g.ell(0, -4, 7, 6, C.h);
        for (const m of [-1, 1]) { g.poly([[m * 5, -8], [m * 12, -24], [m * 13, -6]], C.m); g.poly([[m * 7, -9], [m * 11, -19], [m * 11, -8]], '#e8a0b0'); g.ell(m * 6, -2, 2.2, 1.8, E); g.p(m * 6, -3, '#ffffff'); }
        g.ell(0, 6, 3, 2, '#1a1a2a');
        upperTeeth(11, 5.5, gap);
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
      const d = gdir(E, a); P.hy = clamp(Math.atan2(d[0], d[1]), -1.45, 1.45) * k;
    } else if (n === 'tail' && B.sweeps.length) {
      const sw = B.sweeps[0], d = gdir(E, sw.ang); P.tail = [d[0], d[1], sw.t >= sw.tele ? 1 : sw.t / sw.tele]; P.lean = 4; P.cr = 3; P.sp = 0.9; P.fl = 0.6;
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
    const tn = P.tail && P.tail[2] >= 1 ? 2 : tl.length;   // in a tail sweep the rest of the tail is drawn out along the swing (sweepLimbs)
    if (tn < tl.length) ANCHS[0] = tl[tn - 1];
    for (let i = 1; i < tn; i++) { tube([tl[i - 1], tl[i]], [3.6 - i * 0.25, 3.4 - i * 0.25], C, -2); if (i % 2) piece(tl[i], -1.9, (x, y) => U.spike(g, x, y - 2, -PI / 2, 4, 1.6, C)); }
    // hind legs (digitigrade): hip -> knee (forward) -> ankle -> claws
    for (const s of [-1, 1]) {
      const ha = V.add(pelvis, [s * 10, 2, 0]), st = s > 0 ? P.step * 4 : 0;
      const [kn, an] = ik(ha, [s * 13, -6 - st, 4 + st], 15, 14, [s * 0.2, 0, 1]);
      tube([ha, kn], [3.4, 3], C, -1); tube([kn, an], [2.8, 2.4], C, -1); sph(kn, 3.2, C, -0.9, 0);
      piece(an, -0.8, (x, y) => { for (let i = -1; i <= 1; i++) g.line(x, y, x + i * 4 + (VIEW === 's' ? 5 * DIRX : 0), y + 6, 2, C.d); g.ell(x, y, 3, 2.4, C.m); });
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
    bdHead(nk[5], hd, P, p2, G); MOUTHS.push(V.add(nk[5], V.mul(hd, 20)));
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
        const gap = P.mo * 9;
        frontJaw(13, 7, gap, 6, C.m, '#0c140f', G[0]);
        if (gap > 1) g.poly([[-4, 13 + gap], [4, 13 + gap], [2, 17 + gap], [-2, 17 + gap]], '#0c140f');   // the jaw is a hoop of bone: dark inside
        g.poly([[-11, -10], [11, -10], [8, 6], [5, 13], [-5, 13], [-8, 6]], C.m); g.poly([[2, -10], [11, -10], [8, 6], [5, 13], [2, 13]], C.d);
        for (const m of [-1, 1]) { g.ell(m * 5, -3, 3.5, 3, '#0c140f'); g.ell(m * 5, -3, 1.8, 1.6, G[0]); g.p(m * 5, -4, G[1]); g.line(m * 9, -9, m * 17, -18, 2.6, C.m); g.p(m * 2, 7, '#0c140f'); }
        for (let i = -4; i <= 4; i += 2) g.r(i, 12, 1, 2, '#ffffff');
        upperTeeth(13, 7, gap);
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
      const d = gdir(E, a); P.hy = clamp(Math.atan2(d[0], d[1]), -1.45, 1.45) * k;
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
    for (let i = 3; i < N - 1; i += 2) piece(sp[i], VIEW === 'b' ? 0.5 : -0.2, (x, y) => U.spike(g, x + (VIEW === 's' ? -rs[i] * 0.7 * DIRX : 0), y - rs[i] * 0.6, VIEW === 's' ? (DIRX > 0 ? PI * 1.1 : -PI * 0.1) : -PI / 2, 8, 3, LV.fin));
    piece(sp[0], 0.3, (x, y) => { g.ell(x, y + 1, 18, 4, LV.foam); g.ell(x, y + 1, 12, 2.4, '#d0f0ff'); });
    const at = sp[N - 1], hd = norm(yaw(pitch([0, 0.15, 1], -P.hp), P.hy));
    lvHead(at, hd, P, p2); MOUTHS.push(V.add(at, V.mul(hd, 20)));
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
        const gap = P.mo * 8;
        frontJaw(12, 6.5, gap, 5, LV.belly.c, '#3a0a1a');
        g.poly([[-11, -9], [11, -9], [9, 5], [5, 12], [-5, 12], [-9, 5]], C.m); g.poly([[2, -9], [11, -9], [9, 5], [5, 12], [2, 12]], C.d);
        for (const m of [-1, 1]) { g.ell(m * 6, -2, 2.6, 2.2, E); g.p(m * 6, -3, '#ffffff'); g.p(m * 2, 9, '#0a1a3a'); }
        upperTeeth(12, 6.5, gap);
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
      const sw = B.sweeps[0], d = gdir(E, sw.ang); P.tail = [d[0], d[1], sw.t >= sw.tele ? 1 : sw.t / sw.tele]; P.fl = Math.sin(T * 9) * 0.5 + 0.5;
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
      if (P.tail && s > 0.45) { const k = (s - 0.45) / 0.55 * Math.min(1, P.tail[2] * 1.2); p = V.add(p, [P.tail[0] * k * 40, k * 20, P.tail[1] * k * 40]); }   // winds up toward the swing
      sp.push(p); rs.push(s < 0.15 ? lerp(5, 8, s / 0.15) : lerp(8, 2.5, (s - 0.15) / 0.85));
    }
    const cut = P.tail && P.tail[2] >= 1 ? 9 : N;   // in a tail sweep the body's rear half lashes out along the swing (sweepLimbs)
    if (cut < N) ANCHS[0] = sp[cut - 1];
    tube(sp.slice(0, cut), rs.slice(0, cut), C, 0, { belly: { c: QZ.belly.c, s: QZ.belly.s, w: 0.4 }, scale: 1 });
    // tail fan
    if (cut === N) piece(sp[N - 1], 0, (x, y) => { for (let i = -1; i <= 1; i++) U.feather(g, x, y, PI / 2 + i * 0.5 + (VIEW === 's' ? -0.8 * DIRX : 0), 12, 3, { m: QZ.F[(i + 2) % 5], d: QZ.F[(i + 3) % 5], tip: '#ffffff' }); });
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
    qzHead(sp[0], hd, P, p2); MOUTHS.push(V.add(sp[0], V.mul(hd, 17)));
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
  //  HYDRA — a squat swamp dragon with three heads (five once it is hurt). Each neck sways on its own; the heads
  //  breathe three ways at once, rear and spit, droop and regrow. In the neck-sweep every neck lashes out on its own.
  // =============================================================
  const HY = { B: { d: '#22581a', m: '#5aa83a', h: '#b0e878' }, belly: { c: '#d8e8a0', s: '#a0b060' }, eye: '#ffe14a', eye2: '#ff3a3a', in: '#5a0a10', horn: { d: '#a89870', m: '#e8e0c0', h: '#ffffff' } };
  const nHeads = B => B.phase === 2 ? 5 : 3;
  function headSpread(N, i) { return (i - (N - 1) / 2) * (N === 3 ? 0.5 : 0.34); }
  function hyPose(B, T, E) {
    const n = mvName(B), mv = B.mv, t = mv ? mv.t : 0, N = nHeads(B);
    const P = { N, cr: Math.sin(T * 2) * 0.6, gal: 0, ph: 0, heads: [], glow: 0, hide: 0 };
    for (let i = 0; i < N; i++) P.heads.push({ hp: Math.sin(T * 1.3 + i * 1.7) * 0.15, ya: headSpread(N, i) + Math.sin(T * 0.7 + i * 2.1) * 0.3, mo: Math.max(0, Math.sin(T * 0.9 + i * 2.5) - 0.8) * 2, lunge: 0 });
    if (n === 'breath3') {
      const k = env(t, 0, 0.4, 2.0, 2.3), a = mv.a0 != null && mv.dir != null ? mv.a0 + clamp((t - 0.55) / 1.75, 0, 1) * 1.0 * mv.dir : E.look, mid = (N - 1) / 2;
      [-0.85, 0, 0.85].forEach((o, j) => { const h = P.heads[mid - 1 + j]; const d = gdir(E, a + o); h.ya = lerp(h.ya, Math.atan2(d[0], d[1]), k); h.hp = lerp(h.hp, 0.45, k); h.mo = Math.max(h.mo, env(t, 0.45, 0.55, 2.05, 2.25)); h.lunge = 0.3 * k; });
      P.cr = 3 * k;
    } else if (n === 'regen') {
      const d = env(t, 0, 0.35, 0.8, 1.4); P.glow = env(t, 0.5, 0.9, 1.6, 2.2); P.heads.forEach((h, i) => { h.hp += 1.0 * d * (1 - i * 0.05); h.mo = 0; }); P.cr = 4 * d;
    } else if (n === 'dash3') {
      if (mv.ph === 'go') { P.gal = 1; P.ph = T * 18; P.heads.forEach(h => { h.hp = 0.35; h.mo = 0.6; }); }
      else P.cr = 4 * sstep((mv.pt || 0) / 0.3);
    } else if (n === 'tentacles') {
      P.hide = Math.min(N, 4); P.cr = 3;
    } else if (CAST[n]) {
      P.heads.forEach((h, i) => { const s = 0.25 + i * 0.07, L = env(t, s + 0.15, s + 0.25, s + 0.4, s + 0.7), R = env(t, 0, s + 0.12, s + 0.15, s + 0.25); h.hp += -0.6 * R + 0.55 * L; h.mo = Math.max(R, L); h.lunge = L; });
    }
    return P;
  }
  function hyBuild(B, P, T, p2) {
    const C = HY.B, belly = { c: HY.belly.c, s: HY.belly.s, w: 0.42 }, bob = Math.sin(P.ph * 2) * 1.5 * P.gal;
    const hip = [0, -20 + P.cr + bob, -16], chest = [0, -24 + P.cr + bob, 14];
    tube([hip, V.mix(hip, chest, 0.5), chest], [17, 20, 19], C, 0, { belly });
    if (P.glow) { const k = P.glow; piece(V.mix(hip, chest, 0.5), 0.5, (x, y) => { for (let i = 0; i < 6; i++) { const a = T * 3 + i; g.ell(x + Math.cos(a) * 14 * k, y - 10 - ((T * 30 + i * 9) % 30) * k, 2, 2, '#c0ff90'); } }); }
    // the tail drags behind (in the neck sweep with only three heads it becomes the fourth lash)
    const tailHidden = P.hide && P.N < 4;
    if (!tailHidden) { const tl = [V.add(hip, [0, 4, -10])]; for (let i = 1; i < 7; i++) tl.push(V.add(tl[i - 1], [Math.sin(T * 1.6 + i) * 3, i < 3 ? 3 : 0.5, -7])); tube(tl, [10, 9, 7, 6, 4.5, 3, 2], C, -3, { belly }); }
    else ANCHS[P.N] = V.add(hip, [0, 4, -12]);
    // four short legs
    for (const s of [-1, 1]) for (const [at, base, o] of [[V.add(chest, [s * 15, 8, 4]), [s * 17, -3, chest[2] + 6], 0], [V.add(hip, [s * 15, 6, -2]), [s * 17, -3, hip[2] - 2], 0.5]]) {
      let ft = base; if (P.gal) { const a = P.ph + (s > 0 ? 0 : PI) + o * PI; ft = V.add(ft, [0, -Math.max(0, Math.sin(a)) * 7, Math.cos(a) * 9]); }
      const [kn, an] = ik(at, ft, 9, 9, [s * 0.5, -0.2, 0.6]);
      tube([at, kn], [7, 5.5], C, -1.5); tube([kn, an], [5, 4], C, -1.5);
      piece(an, -1.4, (x, y) => { for (let i = -1; i <= 1; i++) g.line(x, y, x + i * 3 + (VIEW === 's' ? 3 * DIRX : 0), y + 4, 1.6, '#e8e0c0'); });
    }
    // the necks
    for (let i = 0; i < P.N; i++) {
      const sx = (i - (P.N - 1) / 2) * (P.N === 3 ? 10 : 7.5), base = V.add(chest, [sx, -14, 8]), h = P.heads[i];
      if (i < P.hide) { ANCHS[i] = base; continue; }
      const pts = [];
      for (let j = 0; j <= 6; j++) { const k = j / 6; pts.push(V.add(base, yaw([sx * 1.3 * k, -44 * k + 6 * k * k + h.lunge * 16 * k * k - Math.sin(T * 1.8 + i) * 3 * k, 8 * k + 12 * k * k + h.lunge * 20 * k * k], h.ya * k * 0.8))); }
      tube(pts, [7, 6.5, 6, 5.5, 5.2, 5, 4.8], C, 1 + (VIEW === 's' ? i * 0.01 : 0), { belly });
      const hd = norm(yaw(pitch([0, 0.2, 1], -h.hp), h.ya));
      serpentHead(pts[6], hd, h.mo, p2 ? HY.eye2 : HY.eye, C, HY.belly.c, HY.horn, 2); MOUTHS[i] = V.add(pts[6], V.mul(hd, 15));
    }
  }
  // a dragon / serpent head for many-headed beasts, front / side / back
  function serpentHead(at, hd, mo, E, C, jawCol, horn, d0) {
    piece(at, d0, (x, y) => {
      if (VIEW === 's') {
        const q = pr(V.add(at, hd)), ang = Math.atan2(q[1] - y, q[0] - x), jaw = mo * 0.6;
        rot2(() => {
          if (horn) U.spike(g, -2, -6, -PI * 0.8, 9, 2.4, horn);
          g.poly([[-6, -6], [8, -7], [18, -3], [21, 1], [10, 3], [-5, 5]], C.m); g.poly([[-5, 1], [-5, 5], [10, 3], [21, 1], [19, 0]], C.d);
          cx.save(); cx.translate(2, 3); cx.rotate(jaw); g.poly([[-6, -1], [17, -1], [15, 2], [-4, 3]], jawCol); if (mo > 0.25) { g.p(6, -2, '#ffffff'); g.p(12, -2, '#ffffff'); } cx.restore();
          if (mo > 0.25) g.poly([[0, 4], [18, 3], [10, 8]], HY.in);
          g.ell(5, -3, 2, 1.6, E); g.p(6, -4, '#ffffff'); g.p(19, -1, '#102010');
        }, x, y, ang);
        return;
      }
      cx.translate(x, y);
      if (VIEW === 'f') {
        const gap = mo * 6;
        frontJaw(9, 5, gap, 4, jawCol, HY.in);
        if (horn) for (const m of [-1, 1]) U.spike(g, m * 5, -6, -PI / 2 + m * 0.5, 8, 2.2, horn);
        g.poly([[-8, -7], [8, -7], [7, 3], [4, 9], [-4, 9], [-7, 3]], C.m); g.poly([[1, -7], [8, -7], [7, 3], [4, 9], [1, 9]], C.d);
        for (const m of [-1, 1]) { g.ell(m * 5, -2, 2, 1.8, E); g.p(m * 5, -3, '#ffffff'); g.p(m * 2, 7, '#102010'); }
        upperTeeth(9, 5, gap);
        return;
      }
      if (horn) for (const m of [-1, 1]) U.spike(g, m * 5, -6, -PI / 2 + m * 0.5, 8, 2.2, horn);
      g.ell(0, -1, 8, 8, C.m); g.ell(2, 0, 6, 6, C.d);
    });
  }

  // =============================================================
  //  CERBERUS — the three-headed hound of hell with a mane of fire and a serpent for a tail.
  // =============================================================
  const CB = { B: { d: '#140806', m: '#3a1812', h: '#6a3024' }, fire: ['#ff5a1a', '#ffd04a', '#ffffff'], fire2: ['#ff2a5a', '#ffb0c0', '#ffffff'], eye: '#ffe14a', eye2: '#ff3a3a', col: { d: '#2a2a34', m: '#8a8a94', h: '#d0d0d8' }, snake: { d: '#16300f', m: '#3a6a2a', h: '#8ac060' }, in: '#ff8a2a' };
  function cbPose(B, T, E) {
    const n = mvName(B), mv = B.mv, t = mv ? mv.t : 0;
    const P = { cr: Math.sin(T * 2.2) * 0.6, gal: 0, ph: 0, rear: 0, heads: [], hideTail: false, tailW: Math.sin(T * 2) };
    for (let i = 0; i < 3; i++) P.heads.push({ hp: Math.sin(T * 1.4 + i * 2) * 0.12, ya: (i - 1) * 0.45 + Math.sin(T * 0.8 + i * 2.3) * 0.2, mo: Math.max(0, Math.sin(T * 1.1 + i * 2.2) - 0.7) * 1.5 });
    if (n === 'breath3') {
      const k = env(t, 0, 0.4, 2.0, 2.3), a = mv.a0 != null && mv.dir != null ? mv.a0 + clamp((t - 0.55) / 1.75, 0, 1) * 1.0 * mv.dir : E.look;
      [-0.85, 0, 0.85].forEach((o, j) => { const h = P.heads[j], d = gdir(E, a + o); h.ya = lerp(h.ya, Math.atan2(d[0], d[1]), k); h.hp = lerp(h.hp, 0.35, k); h.mo = Math.max(h.mo, env(t, 0.45, 0.55, 2.05, 2.25)); });
      P.cr = 3 * k;
    } else if (n === 'dash3' || n === 'firetrail' || n === 'charge') {
      if (mv.ph === 'go') { P.gal = 1; P.ph = T * 20; P.heads.forEach(h => { h.hp = 0.25; h.mo = 0.5; }); }
      else { const k = sstep((mv.pt || 0) / 0.3); P.cr = 5 * k; P.heads.forEach(h => { h.hp = 0.3 * k; h.mo = 0.4 * k; }); }
    } else if (n === 'quake') {
      let up = 0, hit = 0; for (const T0 of [0.45, 1.0, 1.55]) { up = Math.max(up, env(t, T0 - 0.33, T0 - 0.08, T0 - 0.06, T0)); hit = Math.max(hit, env(t, T0 - 0.02, T0, T0 + 0.1, T0 + 0.35)); }
      P.rear = up * 0.55; P.cr += hit * 5; P.heads.forEach(h => { h.hp = -0.4 * up + 0.3 * hit; h.mo = Math.max(up, hit) * 0.8; });
    } else if (n === 'tail') {
      P.hideTail = !!(B.sweeps.length && B.sweeps[0].t >= B.sweeps[0].tele); P.cr = 3; P.heads.forEach(h => { h.mo = 0.5; });
    } else if (CAST[n]) {
      P.heads.forEach((h, i) => { const k = env(t, 0.05 + i * 0.12, 0.3 + i * 0.12, 0.8 + i * 0.1, 1.2 + i * 0.1); h.hp -= 0.7 * k; h.mo = Math.max(h.mo, k); });
    }
    return P;
  }
  function cbBuild(B, P, T, p2) {
    const C = CB.B, F = p2 ? CB.fire2 : CB.fire, bob = Math.sin(P.ph * 2) * 2 * P.gal, bp = P.rear * 0.5;
    const hip = [0, -34 + P.cr + bob, -20], chest = V.add(hip, pitch([0, -6, 38], bp)), mid = V.add(V.mix(hip, chest, 0.5), [0, 2, 0]);
    // the serpent tail, a snake's head at its end
    if (!P.hideTail) {
      const tl = [V.add(hip, [0, -4, -12])];
      for (let i = 1; i < 8; i++) { const k = i / 7; tl.push(V.add(tl[i - 1], [Math.sin(T * 2.4 + k * 4) * 3 + P.tailW * 2 * k, -2 + k * 4, -7 + k * 2])); }
      tube(tl, [5, 4.5, 4, 3.6, 3.2, 3, 2.8, 2.6], CB.snake, -3);
      serpentHead(tl[7], norm(V.sub(tl[7], tl[6])), 0.3 + Math.max(0, Math.sin(T * 3)) * 0.4, '#ffe14a', CB.snake, '#c8e090', null, -2.9);
    } else ANCHS[0] = V.add(hip, [0, -4, -12]);
    // legs
    for (const sd of [-1, 1]) for (const [at, base, o, front] of [[V.add(chest, [sd * 10, 9, 3]), [sd * 10, -3, chest[2] + 3], 0, 1], [V.add(hip, [sd * 10, 4, -1]), [sd * 10, -3, hip[2] - 3], 0.5, 0]]) {
      let ft = base;
      if (P.gal) { const a = P.ph + (sd > 0 ? 0 : 0.5) * PI + o * 2.4; ft = V.add(ft, [0, -Math.max(0, Math.sin(a)) * 11, Math.cos(a) * 13]); }
      if (front && P.rear) ft = V.mix(ft, V.add(at, [0, 12, 10]), P.rear * 1.6);
      const [kn, an] = ik(at, ft, 16, 17, front ? [0, 0, -1] : [0, -0.3, 1]);
      tube([at, kn], [front ? 6.5 : 8.5, 5], C, front ? 1.8 : -1.5); tube([kn, an], [4.5, 3.6], C, front ? 1.8 : -1.5);
      piece(an, front ? 1.9 : -1.4, (x, y) => { g.ell(x + (VIEW === 's' ? 2 * DIRX : 0), y + 2, 5, 2.6, C.d); g.ell(x + (VIEW === 's' ? 2 * DIRX : 0), y + 1, 4, 1.8, C.m); });
    }
    tube([hip, mid, chest], [15, 15, 19], C);
    for (let i = 0; i < 6; i++) flame(V.add(V.mix(hip, chest, 0.35 + i * 0.13), [0, -14, 0]), 4 + (i % 2), T + i, F, 0.4, VIEW === 's' ? -3 * DIRX : 0);   // burning mane along the back
    // three necks and heads, a spiked collar on each
    for (let i = 0; i < 3; i++) {
      const h = P.heads[i], sx = (i - 1) * 13, base = V.add(chest, [sx, -10, 6]);
      const top = V.add(base, yaw([sx * 0.9, -14 - (i === 1 ? 6 : 0), 10], h.ya * 0.5));
      tube([base, top], [10, 8.5], C, 2 + (i === 1 ? 0.2 : 0));
      piece(V.mix(base, top, 0.45), 2.1 + (i === 1 ? 0.2 : 0), (x, y) => { g.ell(x, y, 9, 3.4, CB.col.d); g.ell(x, y - 1, 9, 2.4, CB.col.m); for (let k = -2; k <= 2; k++) U.spike(g, x + k * 4, y + 1, PI / 2, 4, 1.4, CB.col); });
      flame(V.add(top, [0, -9, -4]), 4, T + i * 2, F, 1.9, VIEW === 's' ? -3 * DIRX : 0);
      const hd = norm(yaw(pitch([0, 0.25, 1], -h.hp), h.ya));
      houndHead(top, hd, h.mo, p2, 2.5 + (i === 1 ? 0.3 : 0)); MOUTHS[i] = V.add(top, V.mul(hd, 22));
    }
  }
  function houndHead(at, hd, mo, p2, d0) {
    const C = CB.B, E = p2 ? CB.eye2 : CB.eye;
    piece(at, d0, (x, y) => {
      cx.translate(x, y); cx.scale(1.3, 1.3); cx.translate(-x, -y);   // big heads: they are the hound's face
      if (VIEW === 's') {
        const q = pr(V.add(at, hd)), ang = Math.atan2(q[1] - y, q[0] - x), jaw = mo * 0.55;
        rot2(() => {
          g.poly([[-7, -7], [5, -8], [12, -3], [21, 0], [22, 3], [10, 4], [-5, 7]], C.m); g.poly([[-6, 2], [-5, 7], [10, 4], [22, 3], [21, 2]], C.d);
          cx.save(); cx.translate(8, 4); cx.rotate(jaw); g.poly([[-7, -1], [11, -1], [11, 2], [-5, 3]], C.d); if (mo > 0.25) { g.p(2, -1, '#ffffff'); g.p(8, -1, '#ffffff'); } cx.restore();
          if (mo > 0.25) g.poly([[2, 4], [18, 3], [10, 7]], CB.in);
          g.r(20, -1, 3, 2, '#000000'); g.ell(5, -3, 2, 1.4, E); g.p(6, -4, '#ffffff');
          g.poly([[-5, -6], [-7, -16], [0, -8]], C.m);
        }, x, y, ang);
        return;
      }
      cx.translate(x, y);
      if (VIEW === 'f') {
        const gap = mo * 6;
        frontJaw(10, 5, gap, 4, C.d, CB.in, '#ffd04a');
        g.poly([[-10, -7], [10, -7], [6, 4], [4, 10], [-4, 10], [-6, 4]], C.m); g.poly([[1, -7], [10, -7], [6, 4], [4, 10], [1, 10]], C.d);
        for (const m of [-1, 1]) { g.poly([[m * 5, -7], [m * 10, -16], [m * 11, -5]], C.m); g.ell(m * 5, -2, 2, 1.6, E); g.p(m * 5, -3, '#ffffff'); }
        g.ell(0, 6, 2.6, 1.8, '#000000');
        upperTeeth(10, 5, gap);
        return;
      }
      g.ell(0, -1, 10, 9, C.m); g.ell(2, 0, 7, 7, C.d); for (const m of [-1, 1]) g.poly([[m * 5, -7], [m * 10, -16], [m * 11, -5]], C.m);
    });
  }

  // =============================================================
  //  VOID EYE — a great floating eyeball. The iris truly looks around (it is drawn on the ball in 3D); six tentacles
  //  writhe from behind it, a nerve trails from its back. Beams make the iris blaze and the tentacles splay out stiff.
  // =============================================================
  const VE = { W: { d: '#a090c0', m: '#f2ecfa', h: '#ffffff' }, vein: '#d84a6a', iris: '#8a3ae0', iris2: '#e02a4a', irisL: '#d0a0ff', irisL2: '#ffa0b0', T: { d: '#24103a', m: '#5a2a8a', h: '#a070d8' } };
  function vePose(B, T, E) {
    const n = mvName(B), mv = B.mv, t = mv ? mv.t : 0;
    const d = gdir(E, E.look);
    const P = { look: norm([d[0] + Math.sin(T * 0.9) * 0.25, 0.25 + Math.sin(T * 1.3) * 0.1, d[1]]), bob: Math.sin(T * 1.8) * 3, glow: 0, ps: 1, sp: 0.3 + Math.sin(T * 1.2) * 0.1, curl: 0, roll: 0 };
    if (n === 'laser' || n === 'laser3' || n === 'cross' || n === 'gaze') { const k = env(t, 0, 0.4, n === 'cross' ? 3.6 : n === 'gaze' ? 3 : 1.3, (n === 'cross' ? 3.6 : n === 'gaze' ? 3 : 1.3) + 0.4); P.glow = k; P.ps = 1 - 0.6 * k; P.sp = lerp(P.sp, 1, k); P.look = norm(V.mix(P.look, [d[0], 0.1, d[1]], k)); }
    else if (n === 'warp') { const k = env(t, 0, 0.3, 0.6, 1.2); P.curl = k; P.ps = 1 + 0.5 * k; }
    else if (CAST[n]) { const k = env(t, 0.1, 0.4, 0.8, 1.3); P.glow = k * 0.7; P.sp = lerp(P.sp, 0.9, k); P.ps = 1 - 0.4 * k; P.roll = Math.sin(t * 8) * 0.3 * k; }
    return P;
  }
  function discPts(c, nrm, r, sx, sy, n = 18) {   // a disc lying on the eyeball, perpendicular to nrm
    const up = Math.abs(nrm[1]) > 0.9 ? [1, 0, 0] : [0, -1, 0];
    const u = norm([nrm[1] * up[2] - nrm[2] * up[1], nrm[2] * up[0] - nrm[0] * up[2], nrm[0] * up[1] - nrm[1] * up[0]]);
    const w = [nrm[1] * u[2] - nrm[2] * u[1], nrm[2] * u[0] - nrm[0] * u[2], nrm[0] * u[1] - nrm[1] * u[0]];
    const out = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; out.push(V.add(c, V.add(V.mul(u, Math.cos(a) * r * sx), V.mul(w, Math.sin(a) * r * sy)))); }
    return out;
  }
  function veBuild(B, P, T, p2) {
    const C = [0, -60 + P.bob, 0], R = 25, L = P.look;
    // nerve stalk out of its back
    tube([V.add(C, [0, 4, -18]), V.add(C, [Math.sin(T) * 3, 14, -30]), V.add(C, [Math.sin(T * 1.3) * 6, 26, -36])], [8, 5.5, 3], VE.T, -1);
    // six tentacles from behind, writhing; splayed stiff while it fires
    for (let k = 0; k < 6; k++) {
      const ph = k / 6 * TAU + 0.3, root = V.add(C, [Math.cos(ph) * R * 0.75, Math.sin(ph) * R * 0.6 + 4, -R * 0.55]), pts = [root];
      for (let j = 1; j <= 7; j++) {
        const s = j / 7, wav = Math.sin(T * 3 + k * 1.3 + j * 0.8) * (1 - P.sp * 0.7) * 5 * s, rr = (7 + 3 * P.sp) * (1 - P.curl * 0.6);
        pts.push(V.add(pts[j - 1], [Math.cos(ph) * rr + Math.sin(ph) * wav, Math.sin(ph) * rr * 0.7 + 1.5 + Math.cos(ph) * wav * 0.6 + P.curl * 3 * s, -2 + P.curl * 4 * s]));
      }
      tube(pts, [4.5, 4, 3.6, 3.2, 2.8, 2.4, 2, 1.6], VE.T, 0);
      const tp = pts[7]; piece(tp, 0.1, (x, y) => U.spike(g, x, y, Math.atan2(pr(tp)[1] - pr(pts[6])[1], pr(tp)[0] - pr(pts[6])[0]), 6, 2, VE.T));
    }
    sph(C, R, VE.W, 0);
    // veins creeping from the iris over the ball (only the ones on the near side show: the rest sort behind the ball)
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * TAU + 0.4, side = norm(V.add(discPts([0, 0, 0], L, 1, 1, 1, 7)[k], [0, 0, 0]));
      let prev = null;
      for (let j = 0; j <= 4; j++) { const b = 0.55 + j * 0.2, p = V.add(C, V.mul(norm(V.add(V.mul(L, Math.cos(b)), V.mul(side, Math.sin(b)))), R * 0.98)); if (prev) line(prev, p, 1, VE.vein, 0.2); prev = p; }
    }
    // the iris and the slit pupil, laid on the ball where it is looking
    const ic = V.add(C, V.mul(L, R * 0.93)); MOUTHS.push(V.add(ic, V.mul(L, 2))); const IR = p2 ? VE.iris2 : VE.iris, IL = p2 ? VE.irisL2 : VE.irisL;
    if (P.glow) piece(ic, 0.3, (x, y) => { g.ell(x, y, 15 + P.glow * 6, 15 + P.glow * 6, `rgba(255,140,255,${0.25 * P.glow})`); });
    poly(discPts(ic, L, 12, 1, 1), IL, 0.4); poly(discPts(V.add(ic, V.mul(L, 0.3)), L, 10, 1, 1), IR, 0.45);
    poly(discPts(V.add(ic, V.mul(L, 0.6)), L, 10, 0.22 * P.ps, 0.85, 12), '#120818', 0.5);
    piece(V.add(ic, V.mul(L, 0.8)), 0.55, (x, y) => { g.r(Math.round(x) - 4, Math.round(y) - 5, 2, 2, '#ffffff'); });
  }

  // =============================================================
  //  CLOCK MACHINE — a walking clockwork clock. Its face is a real disc (seen edge-on from the side, gears and a turning
  //  key from behind); the hammer strikes the bell on its head; in the clock attack its hands come out of the face.
  // =============================================================
  const CM = { Br: { d: '#6a4a18', m: '#c8963a', h: '#ffe0a0' }, Dk: { d: '#2a1e10', m: '#5a4428', h: '#9a7a48' }, face: '#f4ecd8', num: '#3a2a18', hand: '#2a1e10', eye: '#ff3a3a' };
  function cmPose(B, T, E) {
    const n = mvName(B), mv = B.mv, t = mv ? mv.t : 0;
    const P = { cr: Math.abs(Math.sin(T * 3)) * 0.8, gal: 0, ph: 0, arms: 0, ring: 0, spin: 1, lean: 0, steam: 0, tick: T };
    if (n === 'clock') { const k = env(t, 0, 0.5, 4.2, 4.6); P.arms = k; P.spin = 6 * k + 1; P.steam = k; }
    else if (n === 'timestop') { P.ring = env(t, 0.1, 0.2, 0.25, 0.5); P.spin = t < 0.3 ? 8 : 0; P.arms = env(t, 0, 0.2, 2, 2.5); P.tick = T - t + 0.3; }
    else if (n === 'dash3') { if (mv.ph === 'go') { P.gal = 1; P.ph = T * 16; P.lean = 0.2; P.steam = 1; } else P.cr = 3 * sstep((mv.pt || 0) / 0.3); }
    else if (CAST[n]) { const times = n === 'triple' ? [0.4, 0.72, 1.04] : [0.45]; for (const T0 of times) P.ring = Math.max(P.ring, env(t, T0 - 0.15, T0, T0 + 0.02, T0 + 0.18)); P.spin = 3; P.arms = env(t, 0, 0.3, 1.2, 1.6) * 0.5; }
    return P;
  }
  function cmBuild(B, P, T, p2) {
    const Br = CM.Br, Dk = CM.Dk, bob = Math.abs(Math.sin(P.ph)) * 2 * P.gal;
    const C = V.add([0, -50 + P.cr - bob, 0], pitch([0, 0, 0], 0)), R = 26, nF = pitch([0, 0, 1], -P.lean), F = V.add(C, V.mul(nF, 7)), Bk = V.add(C, V.mul(nF, -7));
    // piston legs and feet
    for (const s of [-1, 1]) {
      const hp = V.add(C, [s * 11, 22, 0]); let ft = [s * 13, -4, 0];
      if (P.gal) { const a = P.ph + (s > 0 ? 0 : PI); ft = V.add(ft, [0, -Math.max(0, Math.sin(a)) * 8, Math.cos(a) * 10]); }
      const [kn, an] = ik(hp, ft, 10, 10, [s * 0.2, 0, 1]);
      tube([hp, kn], [4, 3.6], Dk, -1); tube([kn, an], [3.6, 3.2], Br, -1); sph(kn, 4, Br, -0.9);
      piece(an, -0.8, (x, y) => { g.r(Math.round(x - 7), Math.round(y), 14, 5, Dk.m); g.r(Math.round(x - 7), Math.round(y), 14, 1, Dk.h); });
    }
    // the case: a drum. Front / back: a round plate; side: a band as deep as the drum, with its rim and rivets
    op(0, () => {
      const q = pr(C);
      if (VIEW === 's') {
        const xa = pr(Bk)[0], xb = pr(F)[0], x0 = Math.min(xa, xb), w = Math.abs(xb - xa);
        g.ell(x0 + w / 2, q[1], w / 2 + 2, R, Br.d); g.r(Math.round(x0), Math.round(q[1] - R + 2), Math.round(w), Math.round(R * 2 - 4), Br.m);
        g.r(Math.round(xb > xa ? xb - 3 : xb + 1), Math.round(q[1] - R + 3), 2, Math.round(R * 2 - 6), Br.h); g.r(Math.round(x0), Math.round(q[1] - R + 3), Math.round(w), 2, Br.h);
        for (let i = -2; i <= 2; i++) g.p(Math.round(x0 + w / 2), Math.round(q[1] + i * R * 0.38), Br.d);
        return;
      }
      g.ell(q[0], q[1], R, R, Br.d); g.ell(q[0] - 1, q[1] - 1, R - 2, R - 2, Br.m); g.ell(q[0] - R * 0.4, q[1] - R * 0.45, R * 0.25, R * 0.15, Br.h);
    });
    if (VIEW === 'f') {
      op(dp(F) + 0.1, () => {
        const q = pr(F); g.ell(q[0], q[1], R - 3, R - 3, CM.face);
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.r(Math.round(q[0] + Math.cos(a) * (R - 7)) - (i % 3 ? 0 : 1), Math.round(q[1] + Math.sin(a) * (R - 7)) - (i % 3 ? 0 : 1), i % 3 ? 1 : 2, i % 3 ? 1 : 2, CM.num); }
        const hm = P.tick * 0.25 * P.spin, mm = P.tick * 3 * P.spin;
        if (!(B.mv && mvName(B) === 'clock' && B.sweeps.length)) { g.line(q[0], q[1], q[0] + Math.cos(hm - PI / 2) * 12, q[1] + Math.sin(hm - PI / 2) * 12, 2.4, CM.hand); g.line(q[0], q[1], q[0] + Math.cos(mm - PI / 2) * 18, q[1] + Math.sin(mm - PI / 2) * 18, 1.6, CM.hand); }
        g.ell(q[0], q[1], 2.6, 2.6, p2 ? CM.eye : Br.m);
      });
    }
    if (VIEW === 'b') {
      op(dp(Bk) + 0.1, () => {
        const q = pr(Bk); g.ell(q[0], q[1], R - 4, R - 4, Dk.m);
        for (const [ox, oy, rr, sp] of [[-8, -6, 9, 1], [9, -2, 7, -1.4], [-2, 10, 6, 1.8]]) { const a0 = T * sp * P.spin; g.ell(q[0] + ox, q[1] + oy, rr, rr, Br.d); g.ell(q[0] + ox, q[1] + oy, rr - 2, rr - 2, Br.m); for (let i = 0; i < 8; i++) { const a = a0 + i / 8 * TAU; g.r(Math.round(q[0] + ox + Math.cos(a) * rr) - 1, Math.round(q[1] + oy + Math.sin(a) * rr) - 1, 2, 2, Br.d); } g.ell(q[0] + ox, q[1] + oy, 1.6, 1.6, Dk.d); }
      });
    }
    // the winding key at the back, turning
    const kb = V.add(Bk, V.mul(nF, -4)), ka = T * 2 * P.spin;
    tube([Bk, kb], [2.4, 2.4], Dk, -0.5);
    for (const s of [-1, 1]) { const lp = V.add(kb, V.add(V.mul([Math.cos(ka), Math.sin(ka), 0], s * 8), V.mul(nF, -1))); tube([kb, lp], [2.2, 3.6], Br, -0.6); }
    // arms with gear joints
    for (const s of [-1, 1]) {
      const sh = V.add(C, [s * (R - 1), -4, 0]), hand = V.add(C, [s * (R + 8 + P.arms * 4), lerp(18, -26, P.arms) + Math.sin(T * 4 + s) * 2, 6 + P.arms * 2]);
      const [el, hd] = ik(sh, hand, 13, 13, [s, 0.6, -0.3]);
      tube([sh, el], [3.4, 3], Dk, 0.6); tube([el, hd], [3, 2.6], Dk, 0.6); sph(el, 3.6, Br, 0.7); sph(sh, 5, Br, 0.65);
      piece(hd, 0.8, (x, y) => { g.ell(x, y, 4, 4, Br.m); for (let i = -1; i <= 1; i++) g.line(x, y, x + i * 3, y + 6, 1.6, Dk.m); });
    }
    // head: a dome with a red eye, the bell and the striking hammer on top
    const hc = V.add(C, [0, -R - 7, 0]); MOUTHS.push(V.add(F, V.mul(nF, 2)));
    sph(hc, 10, Br, 0.2);
    if (VIEW !== 'b') piece(V.add(hc, [0, 1, VIEW === 'f' ? 9 : 0]), VIEW === 'f' ? 1 : 0.3, (x, y) => { g.r(Math.round(x - (VIEW === 's' ? (DIRX > 0 ? 0 : 7) : 6)), Math.round(y - 2), VIEW === 's' ? 7 : 12, 4, Dk.d); g.r(Math.round(x - (VIEW === 's' ? (DIRX > 0 ? -2 : 5) : 4)), Math.round(y - 1), VIEW === 's' ? 4 : 8, 2, CM.eye); });
    const bell = V.add(hc, [0, -13, 0]);
    piece(bell, 0.25, (x, y) => { const sh = P.ring * Math.sin(T * 60) * 1.5; g.poly([[x - 8 + sh, y + 5], [x - 6 + sh, y - 3], [x + sh, y - 7], [x + 6 + sh, y - 3], [x + 8 + sh, y + 5]], Br.m); g.r(Math.round(x - 8 + sh), Math.round(y + 4), 16, 2, Br.d); g.ell(x - 2 + sh, y - 2, 2, 2, Br.h); if (P.ring > 0.5) for (let i = 0; i < 3; i++) g.line(x + 11 + i * 3, y - 6 + i * 4, x + 14 + i * 3, y - 8 + i * 4, 1, '#fff6c0'); });
    const hmA = -0.9 + P.ring * 0.9, hmp = V.add(bell, [11, -2, 0]);
    piece(hmp, 0.3, (x, y) => rot2(() => { g.line(0, 0, -10, 0, 1.6, Dk.m); g.r(-13, -3, 5, 6, Dk.d); }, x, y, hmA));
    if (P.steam) for (let i = 0; i < 3; i++) { const k = ((T * 1.6 + i / 3) % 1); piece(V.add(hc, [(i - 1) * 6, -18 - k * 20, -4]), 0.4, (x, y) => g.ell(x, y, 3 + k * 4, 2 + k * 3, `rgba(240,240,240,${0.7 * (1 - k) * P.steam})`)); }
  }

  // =============================================================
  //  KRAKEN — a giant octopus: a swelling mantle, slit-pupilled eyes, eight arms curling on the floor.
  //  In the arm sweep four of its arms rise, slam down and sweep the room.
  // =============================================================
  const KR = { B: { d: '#3a124e', m: '#a85ad8', h: '#e8c0ff' }, S: '#f0d8ff', eye: '#ffe14a', eye2: '#ff3a3a' };
  function krPose(B, T, E) {
    const n = mvName(B), mv = B.mv, t = mv ? mv.t : 0;
    const P = { pulse: Math.sin(T * 1.8) * 0.06, up: 0, wig: 1, hide: false, jet: 0, squeeze: 0 };
    if (n === 'tentacles') P.hide = true;
    else if (n === 'ink' || n === 'rain') { const k = env(t, 0, 0.3, 0.6, 1.0); P.squeeze = k; P.pulse = -0.12 * k; }
    else if (n === 'dash3') { P.jet = mv.ph === 'go' ? 1 : 0.4 * sstep((mv.pt || 0) / 0.3); }
    else if (CAST[n]) { const k = env(t, 0.05, 0.35, 0.5, 0.7), slap = env(t, 0.45, 0.55, 0.7, 1.0); P.up = k; P.pulse = 0.1 * k - 0.06 * slap; P.wig = 1 + 2 * slap; }
    return P;
  }
  function krBuild(B, P, T, p2) {
    const C = KR.B, E = p2 ? KR.eye2 : KR.eye, sw = 1 + P.pulse, j = P.jet;
    // eight arms around the base, curling at the tips
    for (let k = 0; k < 8; k++) {
      const ph = (k + 0.5) / 8 * TAU, root = [Math.cos(ph) * 13, -15, Math.sin(ph) * 11];
      if (P.hide && k % 2 === 0) { ANCHS[k / 2] = root; continue; }
      const pts = [root], dirx = lerp(Math.cos(ph), Math.cos(ph) * 0.3, j), dirz = lerp(Math.sin(ph), -1, j);
      for (let i = 1; i <= 8; i++) {
        const s = i / 8, wv = Math.sin(T * 2.6 * P.wig + k * 0.9 + i * 0.7) * 3.5 * s, lift = P.up * Math.sin(s * PI) * 22, curl = s > 0.7 ? (s - 0.7) * 30 : 0;
        pts.push([root[0] + dirx * s * 40 - dirz * wv, Math.min(-3, -15 + 14 * Math.min(1, s * 2.2)) - lift - curl * (1 - j), root[2] + dirz * s * 38 + dirx * wv]);
      }
      tube(pts, [7, 6.2, 5.5, 4.8, 4.1, 3.4, 2.7, 2.1, 1.6], C, -0.5, { belly: { c: KR.S, s: '#c090e0', w: 0.4 } });
    }
    // the mantle (squeezes when it squirts ink, streams back when it jets)
    const m0 = [0, -22, 0], m1 = V.add([0, -46 * sw, -4], [0, 0, -j * 14]), m2 = V.add([0, -70 * sw, -12], [0, j * 12, -j * 34]);
    tube([m0, m1, m2], [20, 26 * (1 - P.squeeze * 0.12), 17 * (1 - P.squeeze * 0.1)], C, 0);
    for (const [a, b, r] of [[-0.6, -40, 3], [0.5, -52, 2.5], [0.1, -62, 2], [-0.2, -34, 2]]) { const p = V.add([Math.sin(a) * 22, b * sw, Math.cos(a) * 20 - 4], [0, 0, -j * 10]); piece(p, 0.5, (x, y) => g.ell(x, y, r, r * 0.8, C.h)); }   // spots
    // eyes, siphon
    for (const s of [-1, 1]) {
      const ep = [s * 11, -30 * sw, 15 - j * 4];
      piece(ep, 0.6 + (s > 0 ? 0.01 : 0), (x, y) => { if (VIEW === 'b') return; g.ell(x, y, 5, 4.4, C.d); g.ell(x, y, 4, 3.6, E); g.r(Math.round(x - 3), Math.round(y), 6, 1, '#120818'); g.p(Math.round(x - 2), Math.round(y - 2), '#ffffff'); });
    }
    const si = [14, -26, 4]; MOUTHS.push([0, -24, 16]);
    piece(si, 0.55, (x, y) => { if (VIEW === 'b') return; g.ell(x, y, 3, 2.4, C.d); if (P.squeeze > 0.3) for (let i = 0; i < 3; i++) g.ell(x + (6 + i * 5) * DIRX, y - 2 + i, 3 - i * 0.6, 2.4 - i * 0.5, '#120818'); });
  }
  // =============================================================
  //  KING SLIME — a crowned blob. It squashes and stretches: crouches before a jump, stretches in the air, splats on landing.
  //  The face sits on its round front, so from the side it is seen side-on and from behind not at all; the crown turns with it.
  // =============================================================
  const KS = { B: { d: '#1f8a3a', m: '#4fd468', h: '#c8f8cc' }, crown: { d: '#a87a1a', m: '#f2c14e', h: '#fff2a0' }, eye: '#1e1830', eye2: '#c01020', mouth: '#1f6a34' };
  function ksPose(B, T, E) {
    const n = mvName(B), mv = B.mv, t = mv ? mv.t : 0;
    const P = { sq: Math.sin(T * 3) * 0.05, lean: 0, mo: 0, angry: 0, puff: 0 };
    if (n === 'jump' || n === 'split') {
      const lim = n === 'split' ? 1.0 : 1.1;
      if (mv.n === 0) { const pre = env(t, 0, 0.12, 0.13, 0.25); P.sq = 0.3 * pre - 0.25 * sstep((t - 0.1) / 0.3) * (t < lim ? 1 : 0); P.mo = 0.5; P.angry = 1; }
      else if (mv.n === 1) { P.sq = -0.3; P.angry = 1; P.mo = 0.8; }
      else { const k = t - mv.t1 - 0.3; P.sq = 0.45 * env(k, 0, 0.04, 0.12, 0.5) - 0.1 * env(k, 0.3, 0.45, 0.5, 0.7); P.mo = 0.6 * env(k, 0, 0.05, 0.3, 0.6); }
    } else if (n === 'stalk') { const h = Math.abs(Math.sin(t * 7)); P.sq = 0.18 * (1 - h) - 0.1 * h; P.lean = 0.25; P.angry = 1; }
    else if (CAST[n]) { const times = n === 'triple' ? [0.4, 0.72, 1.04] : n === 'aimed3' || n === 'aimed5' || n === 'rocks' ? [0.45, 0.9] : [0.55]; for (const T0 of times) { P.puff = Math.max(P.puff, env(t, T0 - 0.3, T0 - 0.02, T0, T0 + 0.05)); P.sq = Math.max(P.sq, 0.35 * env(t, T0, T0 + 0.04, T0 + 0.1, T0 + 0.3)); } P.sq -= P.puff * 0.15; P.mo = Math.max(P.puff, 0.3); P.angry = 1; }
    return P;
  }
  function ksBuild(B, P, T, p2) {
    const C = KS.B, sx = 1 + P.sq * 0.7, sy = 1 - P.sq, rx = 38 * sx + P.puff * 4, ry = 30 * sy + P.puff * 4, cy = -ry * 0.92;
    const lean = P.lean * 10;
    op(0, () => {   // the jelly: rim, body, inner shine, bubbles
      const q = pr([0, cy, lean * 0.3]); g.r(Math.round(q[0] - rx + 4), Math.round(OY - 3), Math.round(rx * 2 - 8), 3, C.d);
      g.ell(q[0], q[1], rx, ry, C.d); g.ell(q[0] - 1, q[1] - 1, rx - 2, ry - 2, C.m);
      g.ell(q[0] - rx * 0.4, q[1] - ry * 0.5, rx * 0.22, ry * 0.14, C.h); g.p(Math.round(q[0] - rx * 0.1), Math.round(q[1] - ry * 0.72), C.h);
      for (let i = 0; i < 3; i++) { const a = T * 0.7 + i * 2.1; g.ell(q[0] + Math.cos(a) * rx * 0.5, q[1] + Math.sin(a * 1.3) * ry * 0.4, 2, 2, '#9af0aa'); }
    });
    // face points on the ellipsoid's surface (only the half facing us shows)
    const surf = (x, y) => { const k = 1 - (x / rx) ** 2 - ((y - cy) / ry) ** 2; return [x, y, Math.sqrt(Math.max(0, k)) * rx * 0.9 + lean * 0.3]; };
    const E = p2 ? KS.eye2 : KS.eye, vis = p => dp(p) > dp([0, cy, 0]) - 2;
    const face = (p, fn) => { if (vis(p)) piece(p, 1, (x, y) => { const w = clamp((dp(p) - dp([0, cy, 0])) / (rx * 0.9), 0.25, 1); fn(x, y, w); }); };
    for (const m of [-1, 1]) {
      const ep = surf(m * 12, cy - 4);
      face(ep, (x, y, w) => { g.ell(x, y, 5 * w + 0.5, 6, '#ffffff'); g.ell(x + m * w, y + 1, 2.6 * w + 0.4, 3.4, E); g.p(Math.round(x), Math.round(y - 2), '#ffffff');
        if (P.angry) g.line(x - 6 * w, y - 8 + (m > 0 ? -1.5 : 1.5) * w, x + 6 * w, y - 8 + (m > 0 ? 1.5 : -1.5) * w, 2, C.d); });
    }
    const mp = surf(0, cy + 10); MOUTHS.push(mp);
    face(mp, (x, y, w) => { const o = P.mo; g.ell(x, y + o * 2, 7 * w + 1, 2 + o * 5, KS.mouth); if (o > 0.2) g.ell(x, y + o * 3, 4 * w, 1 + o * 2.5, '#f08090'); });
    // the crown on top, turning with the body
    const top = [0, cy - ry + 4, lean * 0.3];
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU + 0.3, b = V.add(top, [Math.cos(a) * 11, 0, Math.sin(a) * 9]), tip = V.add(b, [0, -11, 0]);
      piece(b, 2 + dp(b) * 0.01, (x, y) => { const tq = pr(tip); g.poly([[x - 4, y], [tq[0], tq[1]], [x + 4, y]], KS.crown.m); g.r(Math.round(x - 4), Math.round(y - 3), 8, 4, KS.crown.d); g.ell(x, y - 1, 1.5, 1.5, i % 2 ? '#e04050' : '#3ac0ff'); });
    }
  }

  // =============================================================
  //  GIANT TREANT — an old tree that walks. A face in the bark, branch-arms with leafy hands, a crown of leaves and apples,
  //  roots that grip the floor and stamp.
  // =============================================================
  const TR = { bark: { d: '#3a2410', m: '#6a4420', h: '#9a6a3a' }, leaf: { d: '#1e5a1e', m: '#3a8a2a', h: '#7ac850' }, apple: '#e04040', eye: '#c8ff60', eye2: '#ff5a3a' };
  function trPose(B, T, E) {
    const n = mvName(B), mv = B.mv, t = mv ? mv.t : 0;
    const P = { sway: Math.sin(T * 1.2) * 0.06, arms: 0, slam: 0, shake: 0, stomp: 0, mo: 0, point: 0, walk: 0 };
    if (n === 'roots') { const up = env(t, 0, 0.25, 0.3, 0.35); P.arms = up; P.slam = env(t, 0.3, 0.38, 2.0, 2.4); P.point = P.slam; P.mo = Math.max(up, P.slam); }
    else if (n === 'quake') { let up = 0, hit = 0; for (const T0 of [0.45, 1.0, 1.55]) { up = Math.max(up, env(t, T0 - 0.33, T0 - 0.08, T0 - 0.06, T0)); hit = Math.max(hit, env(t, T0 - 0.02, T0, T0 + 0.1, T0 + 0.35)); } P.stomp = up; P.arms = up * 0.7; P.slam = hit * 0.6; P.mo = Math.max(up, hit); }
    else if (n === 'stalk') { P.walk = T * 5; }
    else if (CAST[n] || n === 'rain') { const k = env(t, 0, 0.35, 1.2, 1.6); P.arms = k; P.shake = k; P.mo = k; }
    return P;
  }
  function trBuild(B, P, T, p2) {
    const Bk = TR.bark, L = TR.leaf, sw = P.sway + Math.sin(T * 9) * 0.03 * P.shake;
    const base = [0, -6, 0], mid = V.add(base, roll([0, -34, 0], sw * 0.5)), top = V.add(base, roll([0, -62, 0], sw));
    // roots gripping the floor (the front ones lift and stamp in the quake)
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * TAU + 0.5, lift = (k === 1 || k === 4) ? P.stomp * 10 : 0, w = Math.sin(P.walk + k) * 4;
      const r0 = V.add(base, [Math.cos(a) * 10, -4, Math.sin(a) * 9]), r1 = [Math.cos(a) * 26 + w, -2 - lift, Math.sin(a) * 22], r2 = [Math.cos(a) * 38 + w, -lift * 0.6, Math.sin(a) * 32];
      tube([r0, r1, r2], [6, 4, 2], Bk, -1 + Math.sin(a) * 0.5);
    }
    tube([base, mid, top], [15, 13, 12], Bk, 0);
    // a face carved in the bark: only on the front of the trunk
    const fz = 12, fc = V.add(mid, [0, -6, fz]), E = p2 ? TR.eye2 : TR.eye; MOUTHS.push(V.add(fc, [0, 8, 2]));
    if (dp(fc) > dp(mid) - 1) piece(fc, 0.5, (x, y) => { const w = clamp((dp(fc) - dp(mid)) / fz, 0.25, 1);
      for (const m of [-1, 1]) { g.ell(x + m * 6 * w, y - 4, 3.5 * w + 0.5, 3.5, '#120804'); g.ell(x + m * 6 * w, y - 4, 1.6 * w + 0.3, 1.6, E); }
      g.ell(x, y + 8, 6 * w + 1, 3 + P.mo * 4, '#120804'); for (let i = -1; i <= 1; i++) g.r(Math.round(x + i * 3 * w), Math.round(y + 6), 1, 2, Bk.h); });
    // branch arms with leafy hands
    for (const s of [-1, 1]) {
      const sh = V.add(V.mix(mid, top, 0.4), [s * 12, 0, 0]);
      const up = P.arms, fwd = P.point * (s > 0 ? 1 : 0.6);
      const el = V.add(sh, [s * (16 - up * 4), -6 - up * 14 + P.slam * 10, 4 + fwd * 8]);
      const hd = V.add(el, [s * (10 - fwd * 6) + Math.sin(T * 14 + s) * 2 * P.shake, -10 - up * 16 + P.slam * 30, 6 + fwd * 18]);
      tube([sh, el, hd], [6, 4.5, 3], Bk, 1);
      for (let i = 0; i < 3; i++) { const lp = V.add(hd, [(i - 1) * 5, -2 - (i % 2) * 3, 0]); sph(lp, 5, L, 1.1 + i * 0.01); }
    }
    // the crown of leaves with apples
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * TAU, r = i % 2 ? 20 : 14, lp = V.add(top, roll([Math.cos(a) * r, -12 - Math.sin(a * 2) * 4 - (i % 3) * 4, Math.sin(a) * r * 0.8], sw));
      sph(lp, 12 - (i % 3), L, 0.5);
      if (i % 3 === 0) piece(lp, 0.6, (x, y) => { g.ell(x + 3, y + 3, 2.4, 2.4, TR.apple); g.p(Math.round(x + 2), Math.round(y + 2), '#ffb0b0'); });
    }
    sph(V.add(top, [0, -22, 0]), 13, L, 0.55);
    if (P.shake) for (let i = 0; i < 4; i++) { const k = (T * 1.5 + i / 4) % 1; piece(V.add(top, [(i - 1.5) * 12, -10 + k * 50, 6]), 3, (x, y) => g.ell(x + Math.sin(k * 9 + i) * 3, y, 2, 1.2, L.h)); }   // falling leaves
  }

  // =============================================================
  //  QUEEN SPIDER — a crowned crystal spider. Eight legs on long arching joints walk in alternating sets; it rears its
  //  front legs to cast, crouches and burns its eyes for the beam, raises its abdomen to throw webs.
  // =============================================================
  const SQ = { B: { d: '#141a34', m: '#2e3a66', h: '#6070a8' }, crys: { d: '#4a90c0', m: '#9ad8ff', h: '#ffffff' }, eye: '#ff4060', eye2: '#ffffff', crown: { d: '#8a8aa0', m: '#e0e4f0', h: '#ffffff' } };
  function sqPose(B, T, E) {
    const n = mvName(B), mv = B.mv, t = mv ? mv.t : 0;
    const P = { rear: 0, low: 0, abd: 0, run: 0, ph: T * 2, glow: 0, tap: 1 };
    if (n === 'charge' || n === 'dash3') { if (mv.ph === 'go') { P.run = 1; P.ph = T * 18; } else P.low = sstep((mv.pt || 0) / 0.3) * 6; }
    else if (n === 'laser' || n === 'laser3') { const k = env(t, 0, 0.4, 1.3, 1.6); P.low = 7 * k; P.glow = k; }
    else if (n === 'cross') { const k = env(t, 0, 0.5, 3.6, 4); P.low = 5 * k; P.glow = k; }
    else if (n === 'webnet') { const k = env(t, 0.05, 0.3, 1.5, 1.9); P.abd = k; P.low = 3 * k; }
    else if (CAST[n]) { const k = env(t, 0.05, 0.35, 0.8, 1.2); P.rear = k; }
    return P;
  }
  function sqBuild(B, P, T, p2) {
    const C = SQ.B, h = 22 - P.low, body = [0, -h, 4], abd = V.add([0, -h - 6, -24], [0, -P.abd * 14, P.abd * 4]);
    sph(abd, 21, C, 0); for (let i = 0; i < 5; i++) { const a = -0.8 + i * 0.4, cp = V.add(abd, [Math.sin(a) * 12, -10 - Math.cos(a) * 6, 10 + Math.cos(a) * 6]); piece(cp, 0.2, (x, y) => U.spike(g, x, y, -PI / 2 + a * 0.6, 9, 3, SQ.crys)); }
    sph(body, 13, C, 0.1);
    // eight legs: hip on the body, knee arching high, foot on the floor; alternating sets lift while it runs
    for (let k = 0; k < 4; k++) for (const s of [-1, 1]) {
      const z0 = 10 - k * 7, hip = V.add(body, [s * 9, 2, z0 - 4]), front = k === 0 && P.rear;
      let ft = [s * (30 + k * 3), -2, z0 * 2.2 - 6];
      const grp = (k + (s > 0 ? 0 : 1)) % 2, lift = P.run ? Math.max(0, Math.sin(P.ph + grp * PI)) * 8 : (k === 0 && Math.sin(T * 6 + s) > 0.8 ? 3 : 0);
      if (P.run) ft = V.add(ft, [0, -lift, Math.cos(P.ph + grp * PI) * 8]); else ft = V.add(ft, [0, -lift, 0]);
      if (front) ft = V.mix(ft, V.add(hip, [s * 14, -24, 18]), P.rear);
      const [kn, an] = ik(hip, ft, 22, 26, [s * 0.4, -1, 0]);
      tube([hip, kn], [3.6, 3], C, -1 + (s > 0 ? 0.02 : 0)); tube([kn, an], [3, 1.6], C, -1 + (s > 0 ? 0.02 : 0)); sph(kn, 3.4, SQ.crys, -0.9, 0);
    }
    // fangs, eyes, crown
    const head = V.add(body, [0, -2, 12]), E = p2 ? SQ.eye2 : SQ.eye; MOUTHS.push(V.add(head, [0, 4, 4]));
    if (dp(head) > dp(body) - 4) piece(head, 1, (x, y) => {
      const w = VIEW === 's' ? 0.5 : 1;
      for (let i = 0; i < 6; i++) { const ex = (i % 3 - 1) * 5 * w, ey = Math.floor(i / 3) * 4 - 4; g.ell(x + ex, y + ey, 2 + P.glow, 2 + P.glow, E); }
      if (P.glow) g.ell(x, y - 2, 10 + P.glow * 4, 7 + P.glow * 3, `rgba(255,120,160,${0.3 * P.glow})`);
      for (const m of [-1, 1]) g.poly([[x + m * 3 * w, y + 4], [x + m * 5 * w, y + 12 + P.rear * 2], [x + m * 1 * w, y + 6]], SQ.crys.m);
    });
    const cr = V.add(body, [0, -13, 4]);
    piece(cr, 1.2, (x, y) => { for (let i = -2; i <= 2; i++) g.poly([[x + i * 3 - 2, y], [x + i * 3, y - 6 - (i === 0 ? 3 : 0)], [x + i * 3 + 2, y]], SQ.crown.m); g.r(Math.round(x - 8), Math.round(y - 1), 16, 3, SQ.crown.d); g.p(Math.round(x), Math.round(y - 2), '#e04060'); });
    if (P.abd > 0.5) piece(V.add(abd, [0, -16, -10]), 0.5, (x, y) => { for (let i = 0; i < 4; i++) g.line(x, y, x + Math.cos(i * 1.6 + T * 3) * 10, y - 6 - Math.sin(i * 1.6 + T * 3) * 6, 1, '#e8f4ff'); });   // web silk spraying
  }

  // =============================================================
  //  FIRE DRAGON (えんりゅう) — a red dragon sitting up on its hind legs: wings, horns, a long neck and a tail with a flame tip.
  // =============================================================
  const DR = { B: { d: '#8a1e10', m: '#e0482a', h: '#ff9a6a' }, belly: { c: '#ffc070', s: '#c87a30' }, wing: '#8a1414', wing2: '#c02a1e', horn: { d: '#a89870', m: '#f0e8c8', h: '#ffffff' }, eye: '#ffe14a', eye2: '#ffffff', fire: ['#ff5a1a', '#ffd04a', '#ffffff'] };
  function drPose(B, T, E) {
    const n = mvName(B), mv = B.mv, t = mv ? mv.t : 0;
    const P = { fl: 0.3 + Math.sin(T * 1.8) * 0.15, sp: 0.75, cr: Math.sin(T * 2) * 0.6, lean: 0, hp: Math.sin(T * 1.3) * 0.08, hy: 0, mo: 0, roar: 0, run: 0, ph: 0, tailHide: false };
    if (n === 'breath') {
      const k = env(t, 0, 0.35, 1.8, 2.1); P.lean = 6 * k; P.hp = 0.45 * k; P.mo = env(t, 0.4, 0.5, 2.05, 2.25); P.sp = 0.75 + 0.2 * k;
      const a = mv.dir != null && mv.a0 != null ? mv.a0 + clamp((t - 0.5) / 1.6, 0, 1) * 1.8 * mv.dir : E.look, d = gdir(E, a); P.hy = clamp(Math.atan2(d[0], d[1]), -1.45, 1.45) * k;
    } else if (n === 'tail') { P.tailHide = !!(B.sweeps.length && B.sweeps[0].t >= B.sweeps[0].tele); P.lean = 3; P.sp = 1; P.fl = 0.6; P.mo = 0.5; }
    else if (n === 'charge' || n === 'dash3') { if (mv.ph === 'go') { P.run = 1; P.ph = T * 18; P.lean = 10; P.sp = 0.3; P.fl = 0.1; P.mo = 0.6; P.hp = 0.3; } else { const k = sstep((mv.pt || 0) / 0.3); P.cr = 5 * k; P.lean = 3 * k; P.fl = 0.3 + 0.5 * k; } }
    else if (n === 'fireball') { for (const T0 of [0.5, 0.9, 1.3]) { const k = env(t, T0 - 0.2, T0 - 0.02, T0, T0 + 0.2); P.hp = Math.max(P.hp, 0.4 * k) - 0.3 * env(t, T0 - 0.35, T0 - 0.2, T0 - 0.18, T0 - 0.05); P.mo = Math.max(P.mo, k); } }
    else if (CAST[n]) { const k = env(t, 0.05, 0.4, 1.0, 1.4); P.roar = k; P.mo = k; P.hp = -0.55 * k; P.sp = 0.75 + 0.25 * k; P.fl = 0.3 + 0.55 * k + Math.sin(T * 10) * 0.08 * k; }
    return P;
  }
  function drBuild(B, P, T, p2) {
    const C = DR.B, belly = { c: DR.belly.c, s: DR.belly.s, w: 0.42 }, lean = P.lean * 0.035, bob = Math.abs(Math.sin(P.ph)) * 2 * P.run;
    const pelvis = [0, -24 + P.cr - bob, -6], chest = V.add(pelvis, pitch([0, -28, 8], -lean - P.run * 0.5));
    // tail with a flame at its end (in the tail sweep it is the weapon: see sweepLimbs)
    if (!P.tailHide) { const tl = [V.add(pelvis, [0, 4, -8])]; for (let i = 1; i < 9; i++) { const k = i / 8; tl.push(V.add(tl[i - 1], [Math.sin(T * 1.6 + k * 3) * 2.5 * k, k < 0.5 ? 2 : -1.2, -6])); } tube(tl, [9, 8, 7, 6, 5, 4, 3, 2.4, 2], C, -2, { belly }); flame(tl[8], 4, T, DR.fire, -1.9, -2 * DIRX); }
    else ANCHS[0] = V.add(pelvis, [0, 4, -8]);
    // hind legs (thick haunches), small arms
    for (const s of [-1, 1]) {
      const ha = V.add(pelvis, [s * 11, 2, 0]); let ft = [s * 13, -4, 4];
      if (P.run) { const a = P.ph + (s > 0 ? 0 : PI); ft = V.add(ft, [0, -Math.max(0, Math.sin(a)) * 8, Math.cos(a) * 12]); }
      const [kn, an] = ik(ha, ft, 13, 14, [s * 0.2, 0, 1]);
      sph(V.mix(ha, kn, 0.4), 9, C, -1); tube([kn, an], [5, 4], C, -1);
      piece(an, -0.8, (x, y) => { for (let i = -1; i <= 1; i++) g.line(x, y, x + i * 4 + (VIEW === 's' ? 4 * DIRX : 0), y + 5, 2, '#f0e8c8'); g.ell(x, y, 4, 3, C.m); });
      const sa = V.add(chest, [s * 10, 6, 4]), [el, hd] = ik(sa, V.add(chest, [s * 8, 18 - P.roar * 6, 14 + P.roar * 4]), 9, 9, [s, 0.3, -0.5]);
      tube([sa, el, hd], [4, 3.4, 3], C, 1.5);
    }
    tube([pelvis, V.mix(pelvis, chest, 0.5), chest], [15, 15, 13], C, 0, { belly });
    // wings
    for (const s of [-1, 1]) {
      const root = V.add(chest, [s * 8, -3, -6]), up = (P.fl - 0.35) * 1.6, spr = P.sp;
      const W = q => V.add(root, roll(yaw([s * q[0] * (0.55 + 0.45 * spr), q[1], q[2] - (1 - spr) * q[0] * 0.5], -s * (1 - spr) * 0.6), s * up * 0.9));
      const el = W([22, -12, -6]), wr = W([40, -24, -10]), tips = [W([64, -16, -14]), W([60, 4, -14]), W([48, 20, -12]), W([30, 28, -10])], bs = W([10, 22, -6]);
      [[root, el, wr, tips[0]], [wr, tips[0], tips[1]], [wr, tips[1], tips[2]], [wr, tips[2], tips[3]], [wr, tips[3], bs, root]].forEach((pp, i) => poly(pp, i % 2 ? DR.wing : DR.wing2, -6));
      tube([root, el, wr], [3.6, 3, 2.4], C, -5); for (const tp of tips) tube([wr, tp], [1.8, 1], C, -4.5);
    }
    // neck + head
    const nb = V.add(chest, [0, -6, 4]), nk = [];
    for (let i = 0; i <= 4; i++) { const k = i / 4; nk.push(V.add(nb, yaw(pitch([0, -14 * k - 4 * k * k, 4 * k + 10 * k * k], -P.hp * k * 1.2 + P.roar * 0.4 * k), P.hy * k))); }
    tube(nk, [9, 8, 7.5, 7, 6.5], C, 1, { belly });
    const hd = norm(yaw(pitch([0, 0.2, 1], -P.hp - P.roar * 0.5), P.hy));
    serpentHead(nk[4], hd, P.mo, p2 ? DR.eye2 : DR.eye, C, DR.belly.c, DR.horn, 3); MOUTHS.push(V.add(nk[4], V.mul(hd, 18)));
    if (P.mo > 0.4 && VIEW !== 'b') flame(V.add(nk[4], V.mul(hd, 20)), 3 + P.mo * 2, T, DR.fire, 3.1);
  }

  // =============================================================
  //  THUNDERBIRD — a great storm bird with wide blue wings. It never stops beating them; lightning crackles along the
  //  feathers. It throws its wings up to call the storm, folds them back to dive.
  // =============================================================
  const TB = { B: { d: '#c08a10', m: '#ffd84a', h: '#fff6c0' }, W: { d: '#16307a', m: '#2a5ad0', h: '#6a9aff' }, zig: '#ffe14a', beak: { d: '#c06a10', m: '#ff9a2a', h: '#ffd090' }, eye: '#ff3a3a', eye2: '#ffffff' };
  function tbPose(B, T, E) {
    const n = mvName(B), mv = B.mv, t = mv ? mv.t : 0;
    const P = { beat: Math.sin(T * 6), sp: 0.85, dive: 0, mo: 0, hp: Math.sin(T * 1.4) * 0.1, call: 0, spark: 0.3 };
    if (n === 'dash3') { if (mv.ph === 'go') { P.dive = 1; P.sp = 0.2; P.beat = -0.6; P.mo = 0.7; } else { const k = sstep((mv.pt || 0) / 0.3); P.beat = Math.sin(T * 6) * (1 - k) + k; P.sp = 1; } }
    else if (n === 'laser' || n === 'laser3') { const k = env(t, 0, 0.4, 1.3, 1.6); P.mo = k; P.hp = 0.3 * k; P.spark = 0.3 + 0.7 * k; }
    else if (CAST[n] || n === 'thunderlines' || n === 'rain') { const k = env(t, 0.05, 0.35, 1.2, 1.6); P.call = k; P.beat = lerp(P.beat, 1, k) + Math.sin(T * 20) * 0.1 * k; P.sp = 0.85 + 0.15 * k; P.mo = k; P.hp = -0.5 * k; P.spark = 0.3 + 0.7 * k; }
    return P;
  }
  function tbBuild(B, P, T, p2) {
    const C = TB.B, body = [0, -54 + P.dive * 10, 0], tail = V.add(body, pitch([0, 14, -20], P.dive * 0.8)), head = V.add(body, pitch([0, -18, 10], -P.dive * 0.9));
    tube([tail, body, head], [8, 14, 9], C, 0, { belly: { c: TB.B.h, s: TB.B.d, w: 0.35 } });
    // tail feathers
    for (let i = -2; i <= 2; i++) { const tp = V.add(tail, [i * 4, 14 + Math.abs(i) * -2, -10]); poly([V.add(tail, [i * 2, 0, 0]), V.add(tp, [-2, 0, 0]), V.add(tp, [0, 4, -2]), V.add(tp, [2, 0, 0])], i % 2 ? TB.W.d : TB.W.m, -1); }
    // talons
    for (const s of [-1, 1]) { const lg = V.add(body, [s * 6, 12, 2]), ft = V.add(lg, [0, 10 - P.dive * 6, 2 + P.dive * 6]); tube([lg, ft], [3, 2], TB.beak, 0.5); piece(ft, 0.6, (x, y) => { for (let i = -1; i <= 1; i++) g.line(x, y, x + i * 3, y + 4, 1.4, TB.beak.d); }); }
    // the wings: an arm and a fan of long feathers with lightning zigzags
    const up = P.beat * 0.8;
    for (const s of [-1, 1]) {
      const root = V.add(body, [s * 8, -6, 2]);
      const Wp = q => V.add(root, roll([s * q[0] * (0.3 + 0.7 * P.sp), q[1], q[2] - q[0] * 0.25 - (1 - P.sp) * q[0] * 0.7], s * up));
      const el = Wp([26, -6, -2]), wr = Wp([50, -10, -6]);
      for (let i = 0; i < 9; i++) {
        const k = i / 8, b = V.mix(root, V.mix(el, wr, k), Math.min(1, k * 1.6)), tip = V.add(b, roll([s * (10 + k * 18) * (0.4 + 0.6 * P.sp), 12 + (1 - k) * 4, -18 - (1 - k) * 6], s * up * 0.5));   // feathers trail back as well as down: the wing has a chord, so it shows from the side
        poly([b, V.add(V.mix(b, tip, 0.5), [s * 3, 0, 0]), tip, V.add(V.mix(b, tip, 0.5), [-s * 3, 2, 0])], i % 2 ? TB.W.m : TB.W.d, -3 + k * 0.1);
        if (i % 3 === 1) line(V.mix(b, tip, 0.25), V.add(V.mix(b, tip, 0.6), [s * 3, 0, 0]), 1.4, TB.zig, -2.9 + k * 0.1);
      }
      tube([root, el, wr], [4, 3.2, 2.4], TB.W, -2.5);
      if (Math.sin(T * 13 + s) > 1 - P.spark) { const a = V.mix(el, wr, 0.5); piece(a, 0, (x, y) => { let px = x, py = y; for (let k = 0; k < 4; k++) { const nx = px + (Math.random() - 0.5) * 10, ny = py + 6; g.line(px, py, nx, ny, 1.2, '#fff6a0'); px = nx; py = ny; } }); }
    }
    // head: crest, beak
    const E = p2 ? TB.eye2 : TB.eye; MOUTHS.push(V.add(head, pitch([0, 3, 13], -P.dive * 0.9)));
    piece(head, 2, (x, y) => {
      for (let i = -2; i <= 2; i++) U.spike(g, x + i * 2.5, y - 8, -PI / 2 + i * 0.35 + (VIEW === 's' ? -0.5 * DIRX : 0), 10 - Math.abs(i), 2.4, TB.W);
      g.ell(x, y, 10, 9, C.m); g.ell(x + 2, y + 1, 7, 7, C.d);
      if (VIEW === 'b') return;
      if (VIEW === 's') { const d = DIRX; g.poly([[x + 6 * d, y - 1], [x + 18 * d, y + 2 + P.hp * 4], [x + 6 * d, y + 4]], TB.beak.m); if (P.mo > 0.3) g.poly([[x + 6 * d, y + 3], [x + 15 * d, y + 7 + P.mo * 3], [x + 6 * d, y + 6]], TB.beak.d); g.ell(x + 3 * d, y - 3, 2, 2, E); }
      else { g.poly([[x - 4, y + 1], [x + 4, y + 1], [x, y + 10]], TB.beak.m); if (P.mo > 0.3) g.poly([[x - 3, y + 5], [x + 3, y + 5], [x, y + 9 + P.mo * 4]], TB.beak.d); for (const m of [-1, 1]) { g.ell(x + m * 5, y - 3, 2, 2, E); g.line(x + m * 2, y - 6, x + m * 8, y - 5, 1.4, C.d); } }
    });
  }
  // =============================================================
  //  ROBED CASTERS (リッチ・こおりの女王・ファラオ・だいまどうし): one humanoid rig — a robe that flares to the floor, arms with
  //  wide sleeves, a staff in the right hand whose head is where the spells come out — and a head drawn for each view.
  //  The arms are posed in 3D (raise the staff, thrust it at you, strike the floor, spread both arms) and timed to each spell.
  // =============================================================
  const CPOSE = {   // hs / ho: right (staff) / left hand from its shoulder; sd: staff direction (bottom -> head); lean: + = bowing in
    rest: { hs: [3, 18, 7], ho: [-3, 18, 5], sd: [0.05, -1, 0.12], lean: 0 },
    raise: { hs: [4, -12, 5], ho: [-9, 2, 12], sd: [0.12, -1, 0.25], lean: -0.1 },
    point: { hs: [1, 1, 20], ho: [-5, 10, 8], sd: [0, -0.42, 1], lean: 0.16 },
    plant: { hs: [3, 12, 14], ho: [-10, -6, 8], sd: [0, -1, 0.05], lean: 0.2 },
    summon: { hs: [10, -15, 4], ho: [-10, -15, 4], sd: [0.4, -1, 0.1], lean: -0.15 },
    reap: { hs: [16, -4, 6], ho: [-6, 4, 10], sd: [1, -0.1, 0.1], lean: 0.05 },
  };
  const casterKeys = n => {
    const H = (pairs, end) => { const k = [[0, 'rest']]; for (const [T0, a, b] of pairs) k.push([T0 - 0.2, a], [T0, b, 'in']); k.push([end, k[k.length - 1][1]], [end + 0.4, 'rest']); return k; };
    switch (n) {
      case 'spiral': case 'spiral3': return [[0, 'rest'], [0.3, 'raise'], [3.0, 'raise'], [3.4, 'rest']];
      case 'wave': return [[0, 'rest'], [0.3, 'point'], [2.2, 'point'], [2.6, 'rest']];
      case 'homing': return H([[0.5, 'raise', 'point']], 0.9);
      case 'triple': return H([[0.4, 'raise', 'plant'], [0.72, 'raise', 'plant'], [1.04, 'raise', 'plant']], 1.3);
      case 'ring': case 'ringaimed': return H([[0.55, 'raise', 'plant']], 0.9);
      case 'gapring': return H([[0.5, 'raise', 'plant'], [1.25, 'raise', 'plant']], 1.5);
      case 'aimed3': case 'aimed5': return H([[0.45, 'raise', 'point'], [0.9, 'raise', 'point']], 1.1);
      case 'laser': case 'laser3': return [[0, 'rest'], [0.45, 'raise'], [0.85, 'point', 'in'], [1.3, 'point'], [1.6, 'rest']];
      case 'cross': return [[0, 'rest'], [0.5, 'summon'], [3.6, 'summon'], [4.0, 'rest']];
      case 'rain': return H([[0.5, 'raise', 'plant']], 1.3);
      case 'warp': return [[0, 'rest'], [0.3, 'summon'], [0.8, 'summon'], [1.2, 'rest']];
      case 'summon': return [[0, 'rest'], [0.35, 'summon'], [0.8, 'summon'], [1.1, 'rest']];
      case 'illusion': return [[0, 'rest'], [0.3, 'summon'], [1.15, 'raise'], [1.4, 'point', 'in'], [1.7, 'point'], [2.0, 'rest']];
      case 'soulstorm': case 'icecage': case 'quicksand': case 'despair': return [[0, 'rest'], [0.4, 'summon'], [2.2, 'summon'], [2.6, 'rest']];
      default: return H([[0.5, 'raise', 'point']], 0.9);
    }
  };
  function casterPose(B, T, E) {
    const n = mvName(B), mv = B.mv, t = mv ? mv.t : 0;
    let P;
    if (n === 'scythe') { P = Object.assign({}, CPOSE.reap); P.reaping = !!(B.sweeps[0] && B.sweeps[0].t >= B.sweeps[0].tele); }   // the whole body spins with the scythe (spinPsi)
    else if (mv) {
      const keys = casterKeys(n); let a = CPOSE[keys[0][1]], b = a, k = 0;
      for (let i = 1; i < keys.length; i++) { if (t <= keys[i][0]) { a = CPOSE[keys[i - 1][1]]; b = CPOSE[keys[i][1]]; const k0 = (t - keys[i - 1][0]) / Math.max(0.001, keys[i][0] - keys[i - 1][0]); k = keys[i][2] === 'in' ? k0 * k0 * k0 : sstep(k0); break; } a = b = CPOSE[keys[i][1]]; k = 1; }
      P = { hs: V.mix(a.hs, b.hs, k), ho: V.mix(a.ho, b.ho, k), sd: norm(V.mix(a.sd, b.sd, k)), lean: lerp(a.lean, b.lean, k) };
      if ((n === 'spiral' || n === 'spiral3') && t > 0.3) { const w = (t - 0.3) * 7; P.sd = norm(V.add(P.sd, [Math.cos(w) * 0.5, 0, Math.sin(w) * 0.5])); }   // stirs the air with the staff
    } else P = Object.assign({}, CPOSE.rest);
    P.glow = mv ? clamp(t / 0.4, 0, 1) * (n === 'warp' ? 0.5 : 1) : 0.3 + Math.sin(T * 3) * 0.15;
    P.sway = Math.sin(T * 1.7) * 2 + (mv ? Math.sin(T * 9) * P.glow * 1.2 : 0);
    P.br = Math.sin(T * 2) * 0.6;
    return P;
  }
  // an A-line robe / torso: a shaded trapezoid between two horizontal rings (the body only turns about its vertical axis,
  // so the rings keep their screen width), with a rounded hem
  function cone(top, bot, rt, rb, C, d0, folds) {
    op(d0, () => {
      const a = pr(top), b = pr(bot), lx = (k, y) => [lerp(a[0] - rt, b[0] - rb, k), y], E = rb * SL;
      g.ell(b[0], b[1], rb, E, C.d);
      g.poly([[a[0] - rt, a[1]], [a[0] + rt, a[1]], [b[0] + rb, b[1]], [b[0] - rb, b[1]]], C.m);
      g.ell(b[0], b[1] - 1, rb - 1.5, E * 0.7, C.m);
      g.poly([[a[0] + rt * 0.35, a[1]], [a[0] + rt, a[1]], [b[0] + rb, b[1]], [b[0] + rb * 0.35, b[1]]], C.d);
      g.poly([[a[0] - rt, a[1]], [a[0] - rt * 0.7, a[1]], [b[0] - rb * 0.72, b[1]], [b[0] - rb, b[1]]], C.h);
      if (folds) for (const f of [-0.35, 0.15]) g.line(a[0] + rt * f, a[1] + 2, b[0] + rb * f * 1.2, b[1] + E * 0.6, 1, C.d);
    });
  }
  function casterBuild(D) {
    return function (B, P, T, p2) {
      const C = D.robe, lean = P.lean, waist = [0, -46 + P.br * 0.3, 0];
      const up = q => V.add(waist, pitch(q, -lean));   // the upper body bends at the waist
      // the robe: a cone to the floor, its hem trailing the sway
      const hem = [P.sway, -3, -lean * 10], mid = V.add(V.mix(waist, hem, 0.5), [P.sway * 0.4, 0, 0]);
      cone(waist, hem, 12.5, D.flare, C, -0.5, true);
      if (D.hem) for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, p = V.add(hem, [Math.cos(a) * D.flare, 0, Math.sin(a) * D.flare * 0.9]); piece(p, 0.05, (x, y) => D.hem(x, y, i, T)); }
      if (D.feet) for (const s of [-1, 1]) { const f = [s * 6, -2, 8 + Math.sin(T * 2 + s) * 0.5]; piece(f, 0.3, (x, y) => { g.ell(x, y + 1, 4, 2.4, D.feet.d); g.ell(x, y, 3, 1.6, D.feet.m); }); }
      // the front trim / stripe runs down the robe where it faces us
      const tr0 = up([0, -16, 10]), tr1 = V.add(hem, [0, 0, D.flare * 0.95]);
      if (D.trim) { line(tr0, V.add(waist, [0, 0, 10.5]), 2.4, D.trim, 0.3); line(V.add(waist, [0, 0, 10.5]), tr1, D.trimW || 2.4, D.trim, 0.3); }
      const chest = up([0, -18, 0]);
      cone(chest, waist, 15, 12.5, D.body || C, -0.4); sph(V.add(chest, [0, 2, 0]), 14, D.body || C, -0.45);
      if (D.collar) piece(up([0, -17, 6]), 0.4, (x, y) => D.collar(x, y));
      // arms: shoulder -> elbow -> hand, wide sleeves; the staff in the right hand
      const shR = up([13, -18, 0]), shL = up([-13, -18, 0]);
      const [elR, hR] = ik(shR, V.add(shR, P.hs), 12, 12, [0.6, 0.6, -0.5]), [elL, hL] = ik(shL, V.add(shL, P.ho), 12, 12, [-0.6, 0.6, -0.5]);
      for (const [sh, el, h] of [[shR, elR, hR], [shL, elL, hL]]) {
        tube([sh, el], [5.6, 6.2], D.sleeve || C, 0.6); tube([el, V.mix(el, h, 0.8)], [6.4, 8.6], D.sleeve || C, 0.62);
        sph(h, 3, D.hand, 0.7, 0);
      }
      const sd = P.sd, sb = V.add(hR, V.mul(sd, -D.staff[0])), st = V.add(hR, V.mul(sd, D.staff[1]));
      if (P.reaping) ANCHS[0] = hR;   // the staff has become the scythe: drawn out along the sweep (sweepLimbs)
      else { line(sb, st, 3, '#1a1008', 0.65); line(sb, st, 1.8, D.staffCol || '#7a4a20', 0.66); D.staffHead(st, sd, P, p2, T); }
      MOUTHS.push(V.add(st, V.mul(sd, 4)));
      if (P.glow > 0.5 && B.mv) piece(st, 0.9, (x, y) => { g.ell(x, y, 6 + P.glow * 5, 6 + P.glow * 5, `rgba(${D.glowRGB},${0.25 * P.glow})`); });
      sph(hR, 3.2, D.hand, 0.71, 0);   // the fist closes over the staff
      // the head (hand-drawn for front / side / back)
      const hc = up([0, -38, 1]);
      piece(hc, 1, (x, y) => { cx.translate(x, y); cx.scale(1.35, 1.35); D.head(p2, T, P); });   // big chibi heads, like the rest of the game
    };
  }
  const flick = (T, i) => Math.sin(T * 5 + i * 1.7) * 2;
  // ---- リッチ: a hooded skeleton king, ghost-tattered hem, a staff with a soul gem ----
  const LICH = {
    robe: { d: '#140a24', m: '#2e1a4a', h: '#5a3a80' }, sleeve: { d: '#140a24', m: '#2a1844', h: '#4e3474' }, hand: { d: '#a89c80', m: '#e8e2cf', h: '#ffffff' }, flare: 25, trim: '#f2c14e', glowRGB: '200,150,255',
    staff: [30, 14], staffCol: '#3a2a20',
    hem(x, y, i, T) { g.poly([[x - 4, y - 2], [x + 4, y - 2], [x + 1, y + 5 + flick(T, i)]], '#2e1a4a'); },
    staffHead(st, sd, P, p2) { piece(st, 0.8, (x, y) => { g.ell(x, y - 1, 6, 4, '#3a2a20'); for (const m of [-1, 1]) g.line(x + m * 4, y, x + m * 6, y - 7, 1.6, '#3a2a20'); g.ell(x, y - 5, 4.4, 4.4, p2 ? '#ff4a8a' : '#b48cff'); g.ell(x - 1, y - 6, 1.6, 1.6, '#ffffff'); }); },
    head(p2, T) {
      const E = p2 ? '#ff3a5a' : '#c8a0ff', H = { d: '#0c0618', m: '#241438', h: '#46306a' };
      if (VIEW === 'b') { g.ell(0, -1, 13, 14, H.d); g.ell(-1, -2, 11, 12, H.m); g.poly([[-6, -14], [6, -14], [0, -20]], '#f2c14e'); return; }
      if (VIEW === 's') { const d = DIRX; g.ell(-2 * d, -1, 13, 14, H.d); g.ell(-3 * d, -2, 11, 12, H.m); g.ell(3 * d, 1, 7, 8, '#e8e2cf'); g.ell(5 * d, 0, 2, 2, '#1a0a10'); g.p(5 * d, 0, E); g.r(2 * d - 1, 6, 6, 2, '#b4ab90');
        for (let i = -1; i <= 1; i++) g.poly([[i * 4 - 2, -13], [i * 4, -19], [i * 4 + 2, -13]], '#f2c14e'); g.r(-7, -14, 14, 2, '#c08a2a'); return; }
      g.ell(0, -1, 13, 14, H.d); g.ell(0, 0, 9, 10, '#0c0618');
      g.ell(0, 1, 7, 8, '#e8e2cf'); for (const m of [-1, 1]) { g.ell(m * 3, 0, 2.2, 2.4, '#1a0a10'); g.p(m * 3, 0, E); } g.p(0, 4, '#1a0a10'); for (let i = -2; i <= 2; i++) g.r(i * 2, 7, 1, 2, '#ffffff');
      for (let i = -1; i <= 1; i++) g.poly([[i * 4 - 2, -12], [i * 4, -19], [i * 4 + 2, -12]], '#f2c14e'); g.r(-7, -13, 14, 2, '#c08a2a'); g.p(0, -15, '#e04050');
    },
  };
  // ---- こおりの女王: a gown of ice, long white hair, a crown of icicles, a crystal staff ----
  const ICEQ = {
    robe: { d: '#5a90c0', m: '#bfe6ff', h: '#ffffff' }, body: { d: '#5a90c0', m: '#d8f0ff', h: '#ffffff' }, sleeve: { d: '#6aa0d0', m: '#cfeeff', h: '#ffffff' }, hand: { d: '#b0c8e0', m: '#f0f8ff', h: '#ffffff' }, flare: 27, glowRGB: '160,230,255',
    staff: [30, 16], staffCol: '#9ad0f0', trim: '#ffffff', trimW: 1.4,
    hem(x, y, i) { if (i % 2) g.poly([[x - 3, y - 1], [x + 3, y - 1], [x, y + 5]], '#e8f8ff'); },
    collar(x, y) { for (let i = -2; i <= 2; i++) g.poly([[x + i * 4 - 2, y + 1], [x + i * 4, y - 6 - (i === 0 ? 2 : 0)], [x + i * 4 + 2, y + 1]], '#e8f8ff'); },
    staffHead(st, sd, P, p2) { piece(st, 0.8, (x, y) => { g.poly([[x, y - 12], [x + 5, y - 4], [x, y + 2], [x - 5, y - 4]], p2 ? '#ff90c0' : '#9ae8ff'); g.poly([[x, y - 12], [x, y + 2], [x - 5, y - 4]], p2 ? '#ffc0e0' : '#e0faff'); g.p(Math.round(x - 1), Math.round(y - 7), '#ffffff'); }); },
    head(p2, T) {
      const E = p2 ? '#ff4a7a' : '#3a7ad8', hair = '#f4fbff', hairS = '#b8d8f0';
      const crown = () => { for (let i = -2; i <= 2; i++) g.poly([[i * 4 - 2, -10], [i * 4, -20 - (i === 0 ? 4 : Math.abs(i) === 1 ? 1 : -2)], [i * 4 + 2, -10]], '#9ae8ff'); };
      if (VIEW === 'b') { const wv = Math.sin(T * 2) * 1.2; g.ell(0, -1, 11, 12, hairS); g.poly([[-11, 0], [11, 0], [13, 19 + wv], [7, 23], [0, 20 - wv], [-7, 23], [-13, 19 + wv]], hairS); g.ell(-1, -2, 9, 10, hair); g.poly([[-9, 0], [8, 0], [10, 17 + wv], [6, 20], [0, 17 - wv], [-6, 20], [-11, 17 + wv]], hair); for (let i = -2; i <= 2; i++) g.line(i * 3.5, 2, i * 4.2, 16, 1, hairS); crown(); return; }
      if (VIEW === 's') { const d = DIRX; g.poly([[-9 * d, -6], [2 * d, -8], [-4 * d, 22], [-12 * d, 20]], hairS); g.ell(-1 * d, -1, 10, 11, hair); g.ell(3 * d, 1, 6, 8, '#eaf4ff'); g.p(6 * d, 0, E); g.p(5 * d, 0, E); g.r(Math.min(5 * d, 7 * d), 5, 2, 1, '#c07090'); crown(); return; }
      g.poly([[-11, -6], [11, -6], [13, 20], [-13, 20]], hairS); g.ell(0, -1, 10, 11, hair); g.ell(0, 2, 7, 8.5, '#eaf4ff');
      for (const m of [-1, 1]) { g.r(m * 3 - 1, 0, 2, 2, E); g.p(m * 3 - 1, 0, '#ffffff'); g.line(m * 1.5, -3, m * 5, -4, 1, '#9ab8d0'); } g.r(-1, 6, 3, 1, '#c07090'); g.poly([[-8, -6], [8, -6], [6, -1], [-6, -1]], hair); crown();
    },
  };
  // ---- ファラオ: striped nemes and a golden mask, linen robe with a blue-and-gold apron; the crook is its staff ----
  const PHAR = {
    robe: { d: '#a89a78', m: '#e8dcc0', h: '#ffffff' }, body: { d: '#a89a78', m: '#e0d4b4', h: '#fff8e8' }, sleeve: { d: '#a08a60', m: '#d8c8a0', h: '#fff4d8' }, hand: { d: '#7a5a30', m: '#c0905a', h: '#e8c090' }, flare: 20, glowRGB: '255,220,120',
    staff: [16, 26], staffCol: '#2a4ab8', trim: '#2a4ab8', trimW: 6, feet: { d: '#7a5a30', m: '#c0905a' },
    collar(x, y) { g.ell(x, y + 1, 12, 6, '#2a4ab8'); g.ell(x, y, 11, 5, '#f2c14e'); g.ell(x, y - 1, 8, 3, '#3ac0b0'); g.ell(x, y - 2, 5, 2, '#f2c14e'); },
    staffHead(st, sd, P, p2) { piece(st, 0.8, (x, y) => { const d = VIEW === 's' ? DIRX : 1; g.line(x, y, x, y - 4, 3, '#f2c14e'); g.line(x, y - 4, x + 5 * d, y - 8, 3, '#f2c14e'); g.line(x + 5 * d, y - 8, x + 8 * d, y - 4, 3, '#2a4ab8'); g.ell(x, y - 1, 2, 2, p2 ? '#ff3a3a' : '#3ac0b0'); }); },
    head(p2) {
      const G = '#f2c14e', Bl = '#2a4ab8', E = p2 ? '#ff3a3a' : '#1a1020';
      const stripes = (x0, y0, w, h) => { for (let yy = y0; yy < y0 + h; yy += 4) g.r(Math.round(x0), Math.round(yy), Math.round(w), 1, Bl); };
      if (VIEW === 'b') { g.poly([[-13, -10], [13, -10], [15, 18], [-15, 18]], G); stripes(-15, -8, 30, 26); g.ell(0, -8, 12, 7, G); g.r(-2, 14, 4, 10, G); return; }
      if (VIEW === 's') { const d = DIRX; g.poly([[-13 * d, -10], [8 * d, -12], [6 * d, 16], [-14 * d, 18]], G); stripes(Math.min(-14 * d, 6 * d), -8, 20, 24); g.ell(-2 * d, -10, 11, 6, G);
        g.poly([[4 * d, -4], [12 * d, -2], [11 * d, 8], [5 * d, 12]], '#e8b040'); g.p(9 * d, 0, E); g.r(Math.min(8 * d, 10 * d), 10, 2, 6, Bl); return; }
      g.poly([[-15, -8], [15, -8], [17, 20], [-17, 20]], G); stripes(-17, -6, 34, 26); g.ell(0, -9, 13, 7, G); g.p(0, -16, '#e04050');
      g.poly([[-8, -6], [8, -6], [7, 8], [0, 12], [-7, 8]], '#e8b040'); g.r(-8, -6, 16, 2, Bl);
      for (const m of [-1, 1]) { g.r(m * 4 - 2, -1, 4, 1, E); g.p(m > 0 ? m * 4 + 2 : m * 4 - 3, -1, E); }   // thin painted eyes, like the mask g.r(-1, 11, 3, 6, Bl); g.r(-1, 11, 3, 1, G);
    },
  };
  // ---- だいまどうし: a starry blue robe and pointed hat, a long white beard, a staff crowned with a crystal ----
  const ARCH = {
    robe: { d: '#141a5a', m: '#2a3a9a', h: '#5a70e0' }, sleeve: { d: '#141a5a', m: '#283696', h: '#5068d8' }, hand: { d: '#c08a60', m: '#f0c8a0', h: '#ffe8d0' }, flare: 25, trim: '#f2c14e', glowRGB: '140,190,255',
    staff: [30, 14], staffCol: '#6a4020',
    hem(x, y, i, T) { if (i % 3 === 0) { g.p(Math.round(x), Math.round(y - 6), '#fff6a0'); } },
    staffHead(st, sd, P, p2) { piece(st, 0.8, (x, y) => { g.ell(x, y, 4, 3, '#6a4020'); g.poly([[x, y - 13], [x + 5, y - 5], [x, y], [x - 5, y - 5]], p2 ? '#ff3a6a' : '#3ac0ff'); g.poly([[x, y - 13], [x, y], [x - 5, y - 5]], p2 ? '#ff90a8' : '#a0e8ff'); }); },
    head(p2, T) {
      const Hm = '#2a3a9a', Hd = '#141a5a', E = p2 ? '#ff3a3a' : '#2a2a40';
      const hat = (tilt) => { g.ell(0, -8, 16, 4, Hd); g.poly([[-11, -9], [11, -9], [4 + tilt, -28], [tilt * 2.2, -36]], Hm); g.poly([[3, -9], [11, -9], [4 + tilt, -28], [tilt * 2.2, -36]], Hd); g.r(-10, -11, 20, 2, '#f2c14e'); g.p(-3, -18, '#fff6a0'); g.p(2, -24, '#fff6a0'); };
      if (VIEW === 'b') { g.ell(0, 3, 10, 12, '#c8c8d8'); g.ell(-1, 1, 8.5, 10, '#e8e8f0'); for (let i = -2; i <= 2; i++) g.line(i * 3, 4, i * 3.4, 13, 1, '#c8c8d8'); hat(-2); return; }
      if (VIEW === 's') { const d = DIRX; g.poly([[-8 * d, -6], [2 * d, -6], [-2 * d, 12], [-10 * d, 10]], '#e8e8f0'); g.ell(2 * d, 0, 7, 8, '#f0c8a0'); g.p(6 * d, -1, E); g.ell(9 * d, 2, 2, 2, '#e0a080');
        g.poly([[1 * d, 3], [9 * d, 4], [6 * d, 22 + Math.sin(T * 2) * 1.5], [0, 14]], '#f4f4fa'); cx.scale(d, 1); hat(-4); return; }
      g.poly([[-9, -6], [9, -6], [10, 10], [-10, 10]], '#e8e8f0'); g.ell(0, 0, 7.5, 8, '#f0c8a0');
      for (const m of [-1, 1]) { g.r(m * 3 - 1, -1, 2, 2, E); g.line(m * 1, -4, m * 6, -5, 2, '#f4f4fa'); } g.ell(0, 3, 1.6, 1.4, '#e0a080');
      g.poly([[-7, 4], [7, 4], [4, 18], [0, 26 + Math.sin(T * 2) * 1.5], [-4, 18]], '#f4f4fa'); g.poly([[0, 4], [7, 4], [4, 18], [0, 26 + Math.sin(T * 2) * 1.5]], '#d0d0e0'); hat(-2);
    },
  };
  // =============================================================
  //  WHOLE-BODY SWEEPS (指示: ダメージバーではなく体で攻撃): during a sweep the beast's own arms / necks / tail / hands are
  //  the weapon. They are drawn in screen space from where they grow out to the sweep's full length (= the real hit area),
  //  lagging a little behind the turn; the game only keeps the faint motion blur of the swing.
  // =============================================================
  const OUTL = '#120a14';
  let ANCHS = [], MOUTHS = [];   // MOUTHS: model points where breath / shots come out (one per head)   // model points the swinging limbs grow from (set by the builds)
  function limbTube(gc, pts, rs, C, opt) {   // pts in art px
    U.tube(gc, pts.map((p, i) => [p[0], p[1], rs[i] + 1]), { d: OUTL, m: OUTL, h: OUTL });
    U.tube(gc, pts.map((p, i) => [p[0], p[1], rs[i]]), C, opt || {});
  }
  // what swings in each sweep: from = anchor index (else the sweep centre), rise = how high it rears in the telegraph
  const LIMB = {
    leviathan: () => ({ C: LV.B, belly: LV.belly, r: [7.5, 2], rise: 46, suckers: '#e8f4ff', foam: LV.foam }),
    kraken: () => ({ rim: 34, C: KR.B, belly: { c: KR.S, s: '#c090e0' }, r: [7, 1.8], rise: 40, suckers: KR.S }),
    hydra: (B, i) => i < Math.min(nHeads(B), 4) ? { from: i, C: HY.B, belly: HY.belly, r: [7, 5], rise: 52, tip: 'serpent', E: B.phase === 2 ? HY.eye2 : HY.eye, jaw: HY.belly.c, horn: HY.horn } : { from: nHeads(B), C: HY.B, belly: HY.belly, r: [10, 2], rise: 20 },
    cerberus: () => ({ from: 0, C: CB.snake, r: [5, 2.6], rise: 0, tip: 'serpent', E: '#ffe14a', jaw: '#c8e090', actOnly: true }),
    bonedragon: () => ({ from: 0, C: BD.B, r: [3.4, 1.4], actOnly: true, tip: 'blade', spikes: true }),
    quetzal: () => ({ from: 0, C: QZ.B, belly: QZ.belly, r: [6, 2.2], actOnly: true, tip: 'feathers' }),
    clockmachine: (B, i) => ({ hand: i === 0 ? 'hour' : 'minute' }),
    lich: () => ({ from: 0, scythe: true, actOnly: true }),
    dragon: () => ({ from: 0, C: DR.B, belly: DR.belly, r: [9, 2.4], actOnly: true, tip: 'flame' }),
  };
  function tipSerpent(gc, ctx, p, q, sp, open) {   // a snake / dragon head at the end of a lashing neck or tail
    ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(Math.atan2(p[1] - q[1], p[0] - q[0]));
    if (sp.horn) U.spike(gc, -2, -5, -PI * 0.8, 8, 2.2, sp.horn);
    gc.poly([[-7, -7], [8, -7], [18, -3], [21, 1], [10, 3], [-6, 5]], OUTL); gc.poly([[-6, -6], [8, -6], [17, -3], [20, 1], [10, 2], [-5, 4]], sp.C.m);
    ctx.save(); ctx.translate(2, 3); ctx.rotate(open * 0.6); gc.poly([[-6, -1], [17, -1], [15, 2], [-4, 3]], sp.jaw); gc.p(7, -2, '#ffffff'); gc.p(12, -2, '#ffffff'); ctx.restore();
    gc.poly([[0, 4], [17, 3], [10, 7]], '#5a0a10'); gc.ell(5, -3, 2, 1.6, sp.E); gc.p(6, -4, '#ffffff');
    ctx.restore();
  }
  function sweepLimbs(ctx, B, E, anchors, back) {
    if (!B.sweeps || !B.sweeps.length || !LIMB[B.type]) return;
    const gc = U.api(ctx), T = E.t;
    ctx.save(); ctx.scale(K, K);
    const cxA = E.x / K, cyA = E.cy / K;   // sweep centre, art px
    B.sweeps.forEach((sw, si) => {
      const spec = LIMB[B.type](B, si); if (!spec) return;
      const th = -sw.ang, up = Math.sin(th) < -0.15;
      if (up !== back) return;
      sw.own = true;
      const act = sw.t >= sw.tele, len = sw.len / K, sg = Math.sign(sw.vel) || 1, n = 12, cth = Math.cos(th), sth = Math.sin(th);
      if (spec.hand) {   // the clock's hands grow out of its face; their shadow on the floor is where they hit
        const k0 = act ? 1 : sstep(sw.t / sw.tele), L = len * k0, h = 30, w = spec.hand === 'hour' ? 7 : 5;
        gc.line(cxA + cth * 10, cyA + sth * 10, cxA + cth * L, cyA + sth * L, w * 1.6, 'rgba(20,10,0,0.35)');
        ctx.save(); ctx.translate(cxA, cyA - h); ctx.rotate(th);
        gc.poly([[0, -w * 0.5 - 1], [L * 0.82, -w * 0.5 - 1], [L * 0.82, -w - 1], [L + 2, 0], [L * 0.82, w + 1], [L * 0.82, w * 0.5 + 1], [0, w * 0.5 + 1]], OUTL);
        gc.poly([[0, -w * 0.5], [L * 0.82, -w * 0.5], [L * 0.82, -w], [L, 0], [L * 0.82, w], [L * 0.82, w * 0.5], [0, w * 0.5]], CM.Br.m);
        gc.line(2, -w * 0.25, L * 0.8, -w * 0.25, 1, CM.Br.h); gc.ell(L * 0.82, 0, w * 0.45, w * 0.45, CM.Dk.m);
        ctx.restore();
        return;
      }
      const r0 = spec.rim || 26, A = spec.from != null && anchors[spec.from] ? [anchors[spec.from][0] / K, anchors[spec.from][1] / K] : [cxA + cth * r0, cyA + sth * r0 * 0.75];   // from the body's edge, so nothing passes through it
      if (spec.actOnly && !act) return;
      if (spec.scythe) {   // the lich's staff grown into a scythe as long as the sweep: pole from its hand, a curved blade at the end
        const tip = [cxA + cth * len, cyA + sth * len], bl = -sg;
        gc.line(A[0], A[1], tip[0], tip[1], 4, OUTL); gc.line(A[0], A[1], tip[0], tip[1], 2.2, '#3a2a20');
        ctx.save(); ctx.translate(tip[0], tip[1]); ctx.rotate(th); ctx.scale(1.6, 1.6);
        const Bd = [[0, 0], [-6, bl * 6], [-22, bl * 16], [-40, bl * 18], [-26, bl * 9], [-8, bl * 2]];
        gc.poly(Bd.map(([x, y]) => [x + (x < 0 ? -1 : 1), y + bl]), OUTL); gc.poly(Bd, '#d8d0f0'); gc.line(-4, bl * 3, -34, bl * 16, 1, '#ffffff');
        gc.ell(0, 0, 3.4, 3.4, '#b48cff'); ctx.restore();
        return;
      }
      const k0 = act ? 1 : sstep(sw.t / sw.tele), lay = act ? (spec.actOnly ? 1 : sstep((sw.t - sw.tele) / 0.14)) : 0;
      const tip = [cxA + cth * len, cyA + sth * len], nx = -sth * sg, ny = cth * sg, pts = [], rs = [];
      for (let i = 0; i <= n; i++) {
        const k = i / n, bend = Math.sin(PI * k) * 8 + k * k * 6;
        const flat = [lerp(A[0], tip[0], k) - nx * bend, lerp(A[1], tip[1], k) - ny * bend - Math.sin(PI * k) * 6];
        const H = (spec.rise || 0) * k0, rear = [A[0] + Math.sin(T * 6 + k * 3) * 4 * k + cth * 10 * k * k, A[1] - H * k - Math.sin(k * PI) * 3];
        pts.push([lerp(rear[0], flat[0], lay), lerp(rear[1], flat[1], lay)]); rs.push(lerp(spec.r[0], spec.r[1], k) * (spec.rise ? 0.4 + 0.6 * Math.max(k0, lay) : 1));
      }
      limbTube(gc, pts, rs, spec.C, spec.belly ? { belly: { c: spec.belly.c, s: spec.belly.s, w: 0.4 } } : {});
      if (spec.suckers) for (let i = 2; i < n; i += 2) { const p = pts[i]; gc.ell(p[0] + rs[i] * 0.3, p[1] + rs[i] * 0.45, Math.max(1, rs[i] * 0.3), Math.max(1, rs[i] * 0.22), spec.suckers); }
      if (spec.spikes) for (let i = 1; i < n; i += 2) U.spike(gc, pts[i][0], pts[i][1] - rs[i], -PI / 2 - (th > 0 ? 0.3 : -0.3), 5, 1.8, spec.C);
      if (spec.foam) { gc.ell(A[0], A[1] + 1, 11, 3, spec.foam); gc.ell(A[0], A[1] + 1, 7, 1.8, '#d0f0ff'); }
      const p = pts[n], q = pts[n - 1];
      if (spec.tip === 'serpent') tipSerpent(gc, ctx, p, q, spec, act ? 0.6 + Math.sin(T * 12 + si) * 0.3 : 0.3);
      else if (spec.tip === 'blade') U.spike(gc, p[0], p[1], Math.atan2(p[1] - q[1], p[0] - q[0]), 11, 3.4, spec.C);
      else if (spec.tip === 'flame') { for (let i = 0; i < 3; i++) gc.ell(p[0] + Math.sin(T * 20 + i) * 2, p[1] - i * 3, 5 - i, 4 - i, DR.fire[Math.min(2, i)]); }
      else if (spec.tip === 'feathers') { const a = Math.atan2(p[1] - q[1], p[0] - q[0]); for (let i = -1; i <= 1; i++) U.feather(gc, p[0], p[1], a + i * 0.45, 13, 3, { m: QZ.F[(i + 2) % 5], d: QZ.F[(i + 3) % 5], tip: '#ffffff' }); }
    });
    ctx.restore();
  }

  // =============================================================
  const RIGS = { nightmare: [nmPose, nmBuild, 1.05], fenrir: [fnPose, fnBuild, 1.3], bonedragon: [bdPose, bdBuild, 1.2], leviathan: [lvPose, lvBuild, 1.1], quetzal: [qzPose, qzBuild, 1.1],
    hydra: [hyPose, hyBuild, 1.1], cerberus: [cbPose, cbBuild, 1.15], voideye: [vePose, veBuild, 1.1], clockmachine: [cmPose, cmBuild, 1.15], kraken: [krPose, krBuild, 1.1],
    lich: [casterPose, casterBuild(LICH), 1.2], icequeen: [casterPose, casterBuild(ICEQ), 1.2], pharaoh: [casterPose, casterBuild(PHAR), 1.25], archmage: [casterPose, casterBuild(ARCH), 1.15],
    kingslime: [ksPose, ksBuild, 1.15], treant: [trPose, trBuild, 1.2], spiderqueen: [sqPose, sqBuild, 1.15], dragon: [drPose, drBuild, 1.2], thunderbird: [tbPose, tbBuild, 1.15] };   // [pose, build, size]
  // spinning attacks (指示: 触手だけでなく体ごと回る): while the arms / necks / tail sweep round, the whole body turns with them
  const wrapPI = a => ((a + PI) % TAU + TAU) % TAU - PI;
  function spinPsi(B, E, st) {
    const mv = B.mv, n = mvName(B);
    if (!mv || !(n === 'tentacles' || n === 'tail' || n === 'scythe')) return null;
    const sw = B.sweeps[0];
    if (!sw) return st.psiLast != null && mv === st.psiMv ? st.psiLast : null;
    const sg = Math.sign(sw.vel || 1);
    if (mv !== st.psiMv) { st.psiMv = mv; st.psi0 = n === 'tail' ? sw.ang + PI : st.psi != null ? st.psi : E.look; st.ang0 = null; }
    let psi;
    if (sw.t < sw.tele) psi = st.psi0 - sg * 0.35 * sstep(sw.t / sw.tele);   // winds up, turning back against the coming spin
    else { if (st.ang0 == null) st.ang0 = sw.ang; psi = st.psi0 - sg * 0.35 + (sw.ang - st.ang0) + sg * 0.35 * sstep((sw.t - sw.tele) / 0.25); }
    return (st.psiLast = psi);
  }
  function faceOf(B, E) {   // sets PSI / VIEW / DIRX
    const mv = B.mv, st = B.b3 || (B.b3 = {}), dt = st.t != null ? clamp(E.t - st.t, 0, 0.1) : 1; st.t = E.t;
    let want = spinPsi(B, E, st), snap = want != null;
    if (want == null) {
      if (B.type === 'clockmachine' && mv && mvName(B) === 'clock') want = -PI / 2;   // the clock attack: it shows you its face
      else if (mv && /charge|dash3|firetrail/.test(mv.name) && mv.ph === 'go') { want = Math.atan2(B.vy || 0, B.vx || 0) || mv.a0 || 0; snap = true; }
      else if (mv) { if (mv.b3psi == null) mv.b3psi = E.look; want = mv.b3psi; }
      else want = E.look;
    }
    if (st.psi == null || snap) st.psi = want;
    else { const d = wrapPI(want - st.psi), mx = 5 * dt; st.psi += clamp(d, -mx, mx); }   // turns toward the hero at a steady speed
    PSI = st.psi; const f = face4(PSI); VIEW = f === 'l' || f === 'r' ? 's' : f; DIRX = Math.cos(PSI) >= 0 ? 1 : -1;
    return f;
  }
  function draw(ctx, B, x, yFeet, hurt, E) {
    const R = RIGS[B.type]; if (!R) return false;
    E = Object.assign({}, E); E.look = Math.atan2(E.hero.y - B.y, E.hero.x - B.x);
    const f = faceOf(B, E); E.face = f;
    const P = R[0](B, E.t, E);
    OPS = []; ANCHS = []; MOUTHS = []; cx.clearRect(0, 0, CW, CH);
    R[1](B, P, E.t, B.phase === 2);
    OPS.sort((a, b) => a[0] - b[0]);
    const sz = (R[2] || 1) * (B.sizeK || 1); cx.setTransform(sz, 0, 0, sz, OX * (1 - sz), OY * (1 - sz));   // drawn bigger about the feet: more pixels, not bigger pixels
    for (const o of OPS) o[1]();
    cx.setTransform(1, 0, 0, 1, 0, 0);
    U.pixelize(cv, '#120a14');
    let src = cv;
    if (hurt) {
      fx.clearRect(0, 0, CW, CH); fx.drawImage(cv, 0, 0);
      if (hurt) { fx.globalCompositeOperation = 'source-atop'; fx.fillStyle = '#ffffff'; fx.fillRect(0, 0, CW, CH); fx.globalCompositeOperation = 'source-over'; }
      src = fc;
    }
    const X0 = Math.round(x / K - OX) * K, Y0 = Math.round(yFeet / K - OY) * K;
    const anchors = ANCHS.map(a => { if (!a) return null; const q = pr(a); return [X0 + (OX + (q[0] - OX) * sz) * K, Y0 + (OY + (q[1] - OY) * sz) * K]; });
    // where shots come out, in world coordinates, for the game to fire from (指示: ブレスや光弾は口から)
    if (E.by != null) { B.mouths = MOUTHS.filter(Boolean).map(a => { const q = pr(a), sx = X0 + (OX + (q[0] - OX) * sz) * K, sy = Y0 + (OY + (q[1] - OY) * sz) * K; return { x: sx, y: B.y - (sy - E.by) }; }); B.mouthT = E.t; }
    E.x = x; if (E.cy == null) E.cy = yFeet;
    sweepLimbs(ctx, B, E, anchors, true);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, X0, Y0, CW * K, CH * K);
    sweepLimbs(ctx, B, E, anchors, false);
    return true;
  }
  return { has: t => !!RIGS[t], draw, types: Object.keys(RIGS) };
})();
