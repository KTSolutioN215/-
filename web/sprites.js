// =============================================================
//  ぶつかり勇者 — pixel-art chibi sprites (2.5頭身)
//
//  Every sprite is drawn into a small canvas with integer rectangles and
//  polygons, then "pixelized" (hard alpha, optional palette snap, 1px dark
//  outline) and cached per pose. Poses are generated from parameters, so walk
//  cycles, weapon angles, wing flaps and gear variants need no hand-made
//  frames. In the game 1 art pixel = 1.5 logical pixels (SPR.SCALE).
//
//  SPR.hero(pose)            pose: {dir, step, dash, hurt, blink, bob, wave, w: weapon id, a: armor id}
//  SPR.enemy(type, pose)     -> {c, ax, ay}  (anchor = feet, in art px)
//  SPR.boss(type, pose)      -> {c, ax, ay}
// =============================================================
const SPR = (() => {
  const SCALE = 1.5;
  const cache = new Map();
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }
  function api(x) {
    return {
      r(a, b, w, h, c) { x.fillStyle = c; x.fillRect(a, b, w, h); },
      p(a, b, c) { x.fillStyle = c; x.fillRect(a, b, 1, 1); },
      poly(pts, c) { x.fillStyle = c; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); x.closePath(); x.fill(); },
      ell(cx, cy, rx, ry, c) { x.fillStyle = c; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, 7); x.fill(); },
      line(a, b, c2, d, w, c) { x.strokeStyle = c; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(a, b); x.lineTo(c2, d); x.stroke(); },
      x,
    };
  }
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  // hard edges + optional palette snap + 1px outline
  function pixelize(c, outline, pal) {
    const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height), a = d.data, W = c.width, H = c.height;
    const P = pal ? pal.map(hex) : null;
    for (let i = 0; i < a.length; i += 4) {
      if (a[i + 3] < 110) { a[i + 3] = 0; continue; }
      a[i + 3] = 255;
      if (P) {
        let best = 0, bd = 1e9;
        for (let k = 0; k < P.length; k++) { const q = P[k], dd = (a[i] - q[0]) ** 2 + (a[i + 1] - q[1]) ** 2 + (a[i + 2] - q[2]) ** 2; if (dd < bd) { bd = dd; best = k; } }
        a[i] = P[best][0]; a[i + 1] = P[best][1]; a[i + 2] = P[best][2];
      }
    }
    if (outline) {
      const o = hex(outline), solid = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) solid[i] = a[i * 4 + 3] ? 1 : 0;
      for (let y = 0; y < H; y++) for (let X = 0; X < W; X++) {
        const i = y * W + X; if (solid[i]) continue;
        if ((X > 0 && solid[i - 1]) || (X < W - 1 && solid[i + 1]) || (y > 0 && solid[i - W]) || (y < H - 1 && solid[i + W])) {
          a[i * 4] = o[0]; a[i * 4 + 1] = o[1]; a[i * 4 + 2] = o[2]; a[i * 4 + 3] = 255;
        }
      }
    }
    x.putImageData(d, 0, 0);
    return c;
  }
  function whiten(c) { const [w, x] = canvas(c.width, c.height); x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); return w; }
  function flipX(c) { const [w, x] = canvas(c.width, c.height); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return w; }

  // ---------------------------------------------------------------
  //  HERO  32 x 48, feet on row 44, centre column 16
  // ---------------------------------------------------------------
  // weapon / armour looks (ids match EQUIP in yusha.js)
  const WEAP = {
    w0: { blade: '#b07a46', bladeH: '#d8a46a', bladeLen: 9, wide: 0 },
    w1: { blade: '#d8905a', bladeH: '#f6c490', bladeLen: 11, wide: 0 },
    w2: { blade: '#dfe6f2', bladeH: '#ffffff', bladeLen: 13, wide: 0 },
    w3: { blade: '#ff7a40', bladeH: '#ffd060', bladeLen: 13, wide: 0, glow: 'rgba(255,140,60,0.55)', rune: '#ffe080' },
    w4: { blade: '#fff27a', bladeH: '#ffffff', bladeLen: 14, wide: 0, glow: 'rgba(255,240,120,0.55)', rune: '#5a7aff' },
    w5: { blade: '#c8ecff', bladeH: '#ffffff', bladeLen: 14, wide: 0, rune: '#7ad8ff' },
    w6: { blade: '#e4dcff', bladeH: '#ffffff', bladeLen: 16, wide: 1, rune: '#a070ff' },
    w7: { blade: '#eef4ff', bladeH: '#ffffff', bladeLen: 16, wide: 0, rune: '#3a6fd8' },
    w8: { blade: '#ffcf70', bladeH: '#fff2c0', bladeLen: 16, wide: 1, rune: '#ff8040' },
    w9: { blade: '#6a7cff', bladeH: '#d8e0ff', bladeLen: 17, wide: 1, rune: '#ffffff', glow: 'rgba(120,140,255,0.55)' },
    w10: { blade: '#9ff0ff', bladeH: '#ffffff', bladeLen: 17, wide: 1, rune: '#40b0e0', glow: 'rgba(160,240,255,0.55)' },
    w11: { blade: '#d0a0ff', bladeH: '#ffffff', bladeLen: 17, wide: 1, rune: '#ff70e0', glow: 'rgba(200,140,255,0.55)' },
    w12: { blade: '#ff9a50', bladeH: '#fff0c0', bladeLen: 18, wide: 1, rune: '#c02010', glow: 'rgba(255,140,60,0.55)' },
    w13: { blade: '#90ffb0', bladeH: '#ffffff', bladeLen: 18, wide: 1, rune: '#20a060', glow: 'rgba(140,255,180,0.55)' },
    w14: { blade: '#ff5a7a', bladeH: '#ffd0e0', bladeLen: 18, wide: 1, rune: '#ffffff', glow: 'rgba(255,90,120,0.55)' },
    w15: { blade: '#fff6c0', bladeH: '#ffffff', bladeLen: 19, wide: 1, rune: '#f2c14e', glow: 'rgba(255,240,170,0.65)' },
    w16: { blade: '#8ae070', bladeH: '#e8ffd8', bladeLen: 19, wide: 1, rune: '#f2c14e', glow: 'rgba(150,240,120,0.6)' },
    w17: { blade: '#a8d8ff', bladeH: '#ffffff', bladeLen: 20, wide: 1, rune: '#ff9ad8', glow: 'rgba(190,220,255,0.7)' },
    // 指示3: the gear of the trials (31-35). shape = an extra silhouette on the blade
    w18: { blade: '#f0d090', bladeH: '#fff8e0', bladeLen: 19, wide: 1, rune: '#3ac0b0', shape: 'curve' },                                   // desert scimitar
    w19: { blade: '#ff8a8a', bladeH: '#ffe0e0', bladeLen: 19, wide: 1, rune: '#3ad0c8', glow: 'rgba(255,140,150,0.5)', shape: 'branch', deco: '#3ad0c8' },   // coral
    w20: { blade: '#fff27a', bladeH: '#ffffff', bladeLen: 20, wide: 1, rune: '#4a5aff', glow: 'rgba(255,240,120,0.7)', shape: 'zig' },     // thunder
    w21: { blade: '#4a2434', bladeH: '#ff5a6a', bladeLen: 20, wide: 1, rune: '#ff3a4a', glow: 'rgba(255,40,70,0.55)', shape: 'serrated' },  // demon-slayer
    w22: { blade: '#c8d8ff', bladeH: '#ffffff', bladeLen: 20, wide: 1, rune: '#fff6a0', glow: 'rgba(170,190,255,0.7)', shape: 'star', deco: '#fff6a0' },     // starfall
  };
  const ARM = {
    a0: { plate: null, helm: '#b58a5a', helmS: '#7d5a36', helmH: '#e0c090', crest: '#a07040', shield: '#8a5a2a', shieldS: '#5a3618', emblem: '#d8a46a' },
    a1: { plate: '#a8743e', plateS: '#74481e', plateH: '#d8a46a', helm: '#a8743e', helmS: '#74481e', helmH: '#d8a46a', crest: '#c8902a', shield: '#8a5a2a', shieldS: '#56607a', emblem: '#c8d0dc' },
    a2: { plate: '#9098a8', plateS: '#606878', plateH: '#c8d0dc', chain: true, helm: '#a8b0bc', helmS: '#707888', helmH: '#e0e6ee', crest: '#c8902a', shield: '#8890a0', shieldS: '#56607a', emblem: '#f2c14e' },
    a3: { plate: '#b8c0d0', plateS: '#7e879c', plateH: '#f0f4fa', helm: '#c9ced8', helmS: '#8e95a8', helmH: '#f4f7ff', crest: '#f2c14e', shield: '#9aa4b8', shieldS: '#56607a', emblem: '#f2c14e' },
    a4: { plate: '#4aa060', plateS: '#2a6a3a', plateH: '#8ad890', scale: true, helm: '#58b070', helmS: '#2a6a3a', helmH: '#a8e8b0', crest: '#e05040', shield: '#3a8a50', shieldS: '#1e5030', emblem: '#e05040' },
    a5: { plate: '#cfe6f6', plateS: '#8ab0d0', plateH: '#ffffff', helm: '#d8ecf8', helmS: '#8ab0d0', helmH: '#ffffff', crest: '#7ad8ff', shield: '#c0dcf0', shieldS: '#6a90b8', emblem: '#7ad8ff' },
    a6: { plate: '#f4ecc8', plateS: '#c4a660', plateH: '#ffffff', helm: '#f0e6c0', helmS: '#b8a060', helmH: '#ffffff', crest: '#e05040', shield: '#e8d8a0', shieldS: '#a8884a', emblem: '#e05040' },
    a7: { plate: '#f0a040', plateS: '#b86a20', plateH: '#ffd890', helm: '#f4a848', helmS: '#b86a20', helmH: '#ffe0a0', crest: '#e05040', shield: '#e89838', shieldS: '#9a5418', emblem: '#fff2c0' },
    a8: { plate: '#3a3a9a', plateS: '#22226a', plateH: '#8a8aff', helm: '#4848b0', helmS: '#22226a', helmH: '#9a9aff', crest: '#fff27a', shield: '#3a3a9a', shieldS: '#f2c14e', emblem: '#fff27a', cape: '#5a2a9a', capeS: '#341660' },
    a9: { plate: '#ffffff', plateS: '#8cc8e8', plateH: '#ffffff', helm: '#ffffff', helmS: '#9cc8e4', helmH: '#ffffff', crest: '#f2c14e', shield: '#eaf7ff', shieldS: '#d0a840', emblem: '#40b0e0', cape: '#2a5ad0', capeS: '#16337e' },
    a10: { plate: '#6a5ab8', plateS: '#3e3080', plateH: '#a898f0', helm: '#7464c4', helmS: '#3e3080', helmH: '#b0a0f8', crest: '#ff70e0', shield: '#5a4aa8', shieldS: '#2e2470', emblem: '#ff70e0', cape: '#2a8a8a', capeS: '#165a5a' },
    a11: { plate: '#c84a2a', plateS: '#8a2a14', plateH: '#ff9a6a', scale: true, helm: '#d05a30', helmS: '#8a2a14', helmH: '#ffa070', crest: '#f2c14e', shield: '#b8401e', shieldS: '#6a1a0a', emblem: '#f2c14e', cape: '#3a3a3a', capeS: '#1a1a1a' },
    a12: { plate: '#7ae0a8', plateS: '#3a9a6a', plateH: '#e0fff0', helm: '#8af0b8', helmS: '#3a9a6a', helmH: '#ffffff', crest: '#ffffff', shield: '#6ad098', shieldS: '#2a7a50', emblem: '#ffffff', cape: '#f0f0ff', capeS: '#a8b0d0' },
    a13: { plate: '#ff8a2a', plateS: '#c04a10', plateH: '#ffe080', helm: '#ff9a3a', helmS: '#c04a10', helmH: '#fff0a0', crest: '#ff3a2a', shield: '#ff7a20', shieldS: '#a83a08', emblem: '#fff27a', cape: '#e03a2a', capeS: '#8a1a10' },
    a15: { plate: '#7a5a34', plateS: '#4a3418', plateH: '#a8e078', scale: true, helm: '#8a6a3a', helmS: '#4a3418', helmH: '#b8f088', crest: '#6ad85a', shield: '#6a4a24', shieldS: '#3a2410', emblem: '#8ae070', cape: '#3a8a3a', capeS: '#1e5a22' },
    a16: { plate: '#eef2ff', plateS: '#8a9ad0', plateH: '#ffffff', helm: '#f4f6ff', helmS: '#8a9ad0', helmH: '#ffffff', crest: '#ffffff', shield: '#e8ecff', shieldS: '#f2c14e', emblem: '#7ab8ff', cape: '#4a7ae0', capeS: '#2a4aa0' },
    a14: { plate: '#fff8e0', plateS: '#e0c060', plateH: '#ffffff', helm: '#fffaf0', helmS: '#e0c060', helmH: '#ffffff', crest: '#f2c14e', shield: '#fff8e0', shieldS: '#f2c14e', emblem: '#f2c14e', cape: '#ffffff', capeS: '#c8c0e0' },
    // 指示3: armour of the trials (31-35), each with one extra piece you can see: shoulder plates, a fin crest, sparks, horns, wings
    a17: { plate: '#e0c078', plateS: '#a8823a', plateH: '#fff0c0', helm: '#e8c880', helmS: '#a8823a', helmH: '#fff4d0', crest: '#3ac0b0', shield: '#d8b060', shieldS: '#8a6a2a', emblem: '#3ac0b0', cape: '#e8dcc0', capeS: '#b09c78', pauldron: 1 },
    a18: { plate: '#ff8a8a', plateS: '#c04a5a', plateH: '#ffd0d0', scale: true, helm: '#ff9a90', helmS: '#c04a5a', helmH: '#ffe0d8', crest: '#3ad0c8', shield: '#f07a80', shieldS: '#2a8a90', emblem: '#ffffff', cape: '#2aa8b0', capeS: '#16707a', fin: '#3ad0c8', finS: '#1a8a8a' },
    a19: { plate: '#3a4ab8', plateS: '#222a70', plateH: '#8a9aff', helm: '#4050c8', helmS: '#222a70', helmH: '#a0b0ff', crest: '#ffe14a', shield: '#3a4ab8', shieldS: '#ffe14a', emblem: '#ffe14a', cape: '#ffd23a', capeS: '#c09010', spark: '#fff27a' },
    a20: { plate: '#3a2030', plateS: '#1a0a14', plateH: '#8a4a5a', helm: '#40222e', helmS: '#1a0a14', helmH: '#8a4a58', crest: '#ff3a4a', shield: '#3a2030', shieldS: '#a01a2a', emblem: '#ff3a4a', cape: '#8a0a1e', capeS: '#46040e', horns: '#ece0c4', hornsS: '#9a8a6a' },
    a21: { plate: '#22347a', plateS: '#101a46', plateH: '#7a9aff', helm: '#2a3e8a', helmS: '#101a46', helmH: '#9ab4ff', crest: '#ffffff', shield: '#22347a', shieldS: '#f2c14e', emblem: '#fff6a0', cape: '#eef0ff', capeS: '#9aa4d0', wings: '#f4f6ff', wingsS: '#a8b4e0' },
  };
  function gearVis(w, a) { return Object.assign({ cape: '#c0303a', capeS: '#80182a' }, WEAP[w] || WEAP.w0, ARM[a] || ARM.a0); }
  const HC = { hair: '#7a4a22', hairS: '#4e2c12', skin: '#f8d0a8', skinS: '#e0a078', eye: '#1e1830', mouth: '#b0504a', blush: '#f4a090',
    tunic: '#3a6fd8', tunicS: '#2648a0', tunicH: '#79a6f5', belt: '#6a4020', gold: '#f2c14e', goldS: '#c08a2a', pants: '#2c2c4a', boot: '#6a4022', bootS: '#40250f', grip: '#5a3a20', ruby: '#e04050' };
  const OL = '#1a1420';

  // pose: {dir: down|up|right|left, step: -1|0|1, bob: 0|1, dash: bool, hurt: bool, gear: 0..3, wave: number, blink: bool}
  function hero(pose) {
    const key = 'h' + JSON.stringify(pose);
    if (cache.has(key)) return cache.get(key);
    const dir = pose.dir === 'left' ? 'right' : pose.dir;
    const [c, x] = canvas(32, 48), g = api(x), G = gearVis(pose.w, pose.a), ox = 4, oy = 14 + (pose.bob || 0);
    const R = (a, b, w, h, col) => g.r(a + ox, b + oy, w, h, col), Pp = (a, b, col) => g.p(a + ox, b + oy, col);
    const s = pose.step || 0;
    // legs (drawn without bob so feet stay planted)
    const leg = (lx, lift, side) => {
      const yy = 23 - lift - (pose.bob || 0);
      R(lx, yy, 3, 4, HC.pants); R(lx, yy + 4, 3, 3 - Math.min(lift, 1), HC.boot);
      if (side) R(lx + (side > 0 ? 0 : -1), yy + 7 - Math.min(lift, 1), 4, 1, HC.bootS); else R(lx, yy + 7 - Math.min(lift, 1), 3, 1, HC.bootS);
    };
    const sword = (bx, top, len) => {   // upright blade in hand
      const w = 2 + G.wide;
      if (G.glow) { g.r(bx + ox - 1, top + oy - 1, w + 2, len + 2, G.glow); }
      R(bx, top, w, len, G.blade); R(bx, top + 1, 1, len - 2, G.bladeH); R(bx + (w > 2 ? 1 : 0), top - 1, w - (w > 2 ? 2 : 1), 1, G.blade);
      if (G.rune) { Pp(bx + w - 1, top + 4, G.rune); Pp(bx + w - 1, top + 8, G.rune); }
      bladeDeco((u, v, col) => Pp(bx + v, top + u, col), len, w);
      R(bx - 2, top + len, w + 4, 1, HC.gold); Pp(bx - 2, top + len, HC.goldS); R(bx, top + len + 1, w, 2, HC.grip); Pp(bx, top + len + 3, HC.gold);
    };
    const helmet = (side) => {
      if (!side) {
        R(9, 2, 6, 1, G.helm); R(7, 3, 10, 1, G.helm); R(6, 4, 12, 1, G.helm); R(5, 5, 14, 3, G.helm);
        R(16, 4, 2, 4, G.helmS); R(17, 5, 2, 3, G.helmS); R(8, 3, 2, 1, G.helmH); R(7, 4, 2, 2, G.helmH);
        R(5, 8, 14, 1, HC.gold); R(17, 8, 2, 1, HC.goldS);
        R(11, 0, 2, 3, G.crest); R(10, 1, 4, 1, G.crest); Pp(12, 0, HC.goldS);
      } else {
        R(8, 2, 6, 1, G.helm); R(6, 3, 10, 1, G.helm); R(5, 4, 12, 1, G.helm); R(5, 5, 13, 3, G.helm);
        R(5, 4, 3, 4, G.helmS); R(11, 3, 3, 1, G.helmH); R(13, 4, 2, 2, G.helmH);
        R(5, 8, 13, 1, HC.gold); R(7, 1, 7, 1, G.crest); R(8, 0, 4, 1, G.crest); R(6, 2, 2, 1, G.crest);
      }
      headX(side);
    };
    const headX = (side) => {   // horns / fin crest of the 31-35 armour
      if (G.horns) {
        if (!side) for (const m of [0, 1]) { const X = v => m ? 23 - v : v; R(X(5), 5, 1, 2, G.hornsS); R(X(4), 3, 1, 3, G.horns); R(X(3), 1, 1, 3, G.horns); R(X(2), -1, 1, 3, G.horns); Pp(X(1), -2, G.horns); Pp(X(3), 2, G.hornsS); }
        else { R(8, 1, 2, 2, G.hornsS); R(7, -1, 1, 3, G.horns); R(6, -3, 1, 3, G.horns); Pp(5, -4, G.horns); R(14, 1, 1, 2, G.hornsS); R(15, -1, 1, 2, G.horns); Pp(16, -2, G.horns); }
      }
      if (G.fin) {
        if (!side) for (let i = -3; i <= 3; i++) { const hh = 5 - Math.abs(i); R(11 + i + (i > 0 ? 1 : 0), 3 - hh, 1, hh, i % 2 ? G.finS : G.fin); }
        else for (let i = 0; i < 7; i++) { const hh = 2 + (i < 4 ? i : 7 - i) * 0.8; R(6 + i, 2 - Math.round(hh), 1, Math.round(hh), i % 2 ? G.finS : G.fin); }
      }
    };
    // a blade's extra silhouette. P(u, v, col): u = px from the tip toward the hilt, v = px across (0..w-1 is the blade itself)
    const bladeDeco = (P, len, w) => {
      const D = G.deco || G.bladeH, mid = Math.floor((w - 1) / 2);
      if (G.shape === 'curve') { for (let u = 0; u < len * 0.6; u++) P(u, w, G.blade); for (let u = 1; u < len * 0.45; u++) P(u, w + 1, G.blade); for (let u = 3; u < len * 0.3; u++) P(u, w + 2, G.bladeH); P(-1, w + 1, G.bladeH); }
      else if (G.shape === 'branch') for (const [u, v] of [[3, -1], [2, -2], [7, w], [6, w + 1], [11, -1], [10, -2], [14, w]]) P(u, v, D);
      else if (G.shape === 'zig') for (let u = 0; u < len - 4; u += 5) { P(u + 1, -1, G.bladeH); P(u + 2, -2, G.bladeH); P(u + 3, w, G.bladeH); P(u + 4, w + 1, G.bladeH); }
      else if (G.shape === 'serrated') for (let u = 2; u < len - 1; u += 2) { P(u, -1, G.blade); P(u + 1, w, G.blade); }
      else if (G.shape === 'star') { for (const [u, v] of [[-1, mid], [-2, mid], [-2, mid - 1], [-2, mid + 1], [-2, mid - 2], [-2, mid + 2], [-3, mid], [-4, mid]]) P(u, v, D); P(-2, mid, '#ffffff'); }
    };
    const wingsX = (dir) => {   // star armour: small white wings
      if (!G.wings) return;
      const W1 = G.wings, W2 = G.wingsS;
      if (dir === 'right') { g.poly([[8 + ox, 15 + oy], [2 + ox, 9 + oy], [0 + ox, 14 + oy], [2 + ox, 20 + oy], [7 + ox, 21 + oy]], W1); R(3, 13, 3, 1, W2); R(3, 16, 3, 1, W2); return; }
      const big = dir === 'up' ? 2 : 0;
      for (const m of [0, 1]) { const X = v => m ? 24 - v : v; g.poly([[X(7) + ox, 15 + oy], [X(1 - big) + ox, 10 - big + oy], [X(-1 - big) + ox, 16 + oy], [X(1 - big) + ox, 21 + big + oy], [X(6) + ox, 22 + oy]], W1); R(Math.min(X(2), X(5)), 14, 3, 1, W2); R(Math.min(X(2), X(5)), 17, 3, 1, W2); }
    };
    const frontX = (dir) => {   // shoulder plates and crackling sparks
      if (G.pauldron) {
        if (dir === 'right') { R(11, 14, 6, 3, G.plate); R(11, 14, 6, 1, G.plateH); R(16, 15, 1, 2, G.plateS); }
        else { R(2, 13, 6, 4, G.plate); R(2, 13, 6, 1, G.plateH); R(2, 16, 6, 1, G.plateS); R(16, 13, 6, 4, G.plateS); R(16, 13, 6, 1, G.plate); Pp(4, 15, G.emblem); Pp(19, 15, G.emblem); }
      }
      if (G.spark) { const P2 = (pose.wave || 0) ? [[21, 8], [2, 18], [9, -1], [20, 21]] : [[2, 10], [21, 16], [14, 0], [4, 22]]; for (const [a, b] of P2) { Pp(a, b, '#ffffff'); Pp(a - 1, b, G.spark); Pp(a + 1, b, G.spark); Pp(a, b - 1, G.spark); Pp(a, b + 1, G.spark); } }
    };
    wingsX(pose.dash && dir === 'up' ? 'up' : dir);
    if (pose.dash && dir === 'up') {
      // ---- charging away from the camera: sword thrust overhead, cape streaming ----
      const wv = pose.wave || 0;
      g.poly([[5 + ox, 15 + oy], [19 + ox, 15 + oy], [21 + ox + wv, 30 + oy], [16 + ox, 28 + oy], [12 + ox - wv, 31 + oy], [8 + ox, 28 + oy], [3 + ox - wv, 30 + oy]], G.cape);
      R(9, 18, 1, 10, G.capeS); R(14, 18, 1, 10, G.capeS);
      leg(8, s > 0 ? 3 : 0, 0); leg(13, s < 0 ? 3 : 0, 0);
      R(7, 14, 10, 7, HC.tunic); R(7, 14, 2, 7, HC.tunicS);
      R(6, 9, 12, 5, HC.hair); R(6, 12, 12, 2, HC.hairS);
      helmet(false);
      R(5, 15, 2, 5, HC.tunicS); R(5, 20, 2, 2, HC.skin);                // left arm swinging back
      g.line(17.5 + ox, 15.5 + oy, 17.5 + ox, 3 + oy, 2.6, HC.tunic);    // sword arm thrust up
      R(16, 1, 3, 2, HC.skin);
      sword(16, -2 - G.bladeLen, G.bladeLen);
    } else if (dir === 'down') {
      R(6, 15, 12, 10, G.cape); R(5, 23, 14, 3, G.cape); R(7, 18, 1, 7, G.capeS); R(16, 18, 1, 7, G.capeS);
      leg(8, s > 0 ? 2 : 0, 0); leg(13, s < 0 ? 2 : 0, 0);
      R(7, 15, 10, 8, HC.tunic); R(14, 15, 3, 8, HC.tunicS); R(8, 16, 1, 4, HC.tunicH); R(9, 15, 6, 1, HC.tunicS);
      if (G.plate) { R(8, 16, 8, 4, G.plate); R(14, 16, 2, 4, G.plateS); R(9, 16, 2, 1, G.plateH); if (G.chain || G.scale) for (let q = 0; q < 4; q++) Pp(9 + q * 2, 18 + (q % 2), G.plateS); R(11, 17, 2, 2, G.emblem || HC.gold); }
      R(7, 20, 10, 1, HC.belt); R(11, 20, 2, 1, HC.gold); R(11, 22, 2, 1, HC.tunicS);
      R(5, 15, 3, 2, G.plate || HC.tunicH); R(5, 17, 2, 4, HC.tunic); R(5, 21, 2, 2, HC.skin);
      R(16, 15, 3, 2, G.plate ? G.plateS : HC.tunicS); R(17, 17, 2, 3, HC.tunicS); R(17, 19, 2, 2, HC.skin);
      // shield on the left arm
      g.ell(4.5 + ox, 20.5 + oy, 3.5, 4.6, G.shieldS); g.ell(4.5 + ox, 20.5 + oy, 2.6, 3.7, G.shield);
      R(4, 18, 1, 5, G.emblem); R(3, 19, 3, 1, G.emblem);
      // head
      R(7, 9, 10, 6, HC.skin); R(8, 14, 8, 1, HC.skin); R(15, 10, 2, 4, HC.skinS);
      R(6, 8, 12, 2, HC.hair); R(6, 9, 2, 4, HC.hair); R(16, 9, 2, 4, HC.hairS); R(10, 10, 1, 1, HC.hair); R(13, 10, 1, 1, HC.hair);
      if (pose.hurt) { Pp(8, 11, HC.eye); Pp(9, 12, HC.eye); Pp(9, 11, HC.eye); Pp(8, 12, HC.eye); R(14, 11, 2, 1, HC.eye); R(14, 12, 1, 1, HC.eye); R(11, 13, 2, 1, HC.mouth); }
      else if (pose.blink) { R(8, 12, 2, 1, HC.eye); R(14, 12, 2, 1, HC.eye); Pp(12, 13, HC.mouth); }
      else { R(8, 11, 2, 2, HC.eye); Pp(8, 11, '#ffffff'); R(14, 11, 2, 2, HC.eye); Pp(14, 11, '#ffffff'); Pp(12, 13, HC.mouth); }
      Pp(7, 13, HC.blush); Pp(16, 13, HC.blush);
      helmet(false); R(11, 6, 2, 1, HC.ruby);
      sword(17, 16 - G.bladeLen, G.bladeLen);
    } else if (dir === 'up') {
      leg(8, s > 0 ? 2 : 0, 0); leg(13, s < 0 ? 2 : 0, 0);
      sword(5, 16 - G.bladeLen, G.bladeLen);
      R(7, 15, 10, 8, HC.tunic); R(5, 15, 3, 2, G.plate ? G.plateS : HC.tunicS); R(5, 17, 2, 3, HC.tunicS); R(5, 19, 2, 2, HC.skin);
      R(16, 15, 3, 2, G.plate || HC.tunicH); R(17, 17, 2, 4, HC.tunic); R(17, 21, 2, 2, HC.skin);
      // cape over the back
      g.poly([[6 + ox, 14 + oy], [18 + ox, 14 + oy], [19 + ox, 26 + oy], [5 + ox, 26 + oy]], G.cape);
      R(9, 16, 1, 10, G.capeS); R(14, 16, 1, 10, G.capeS); R(6, 25, 13, 1, G.capeS); R(10, 14, 4, 1, HC.gold);
      // shield back (wood/leather side)
      g.ell(19.5 + ox, 20.5 + oy, 3.4, 4.5, G.shieldS); g.ell(19.5 + ox, 20.5 + oy, 2.4, 3.5, '#6a4a2a'); R(19, 18, 1, 5, '#4a3018');
      R(6, 9, 12, 5, HC.hair); R(6, 12, 12, 2, HC.hairS); R(8, 14, 8, 1, HC.hairS);
      helmet(false);
    } else {   // right (left = mirrored)
      const wv = pose.wave || 0;
      g.poly([[8 + ox, 14 + oy], [5 + ox - wv, 20 + oy], [2 + ox - wv * 2, 27 + oy], [9 + ox, 26 + oy]], G.cape); R(4, 22, 1, 4, G.capeS);
      // back leg / front leg
      const fwd = s * 2;
      leg(10 - fwd, s ? 1 : 0, 1); leg(11 + fwd, 0, 1);
      g.ell(7.5 + ox, 19.5 + oy, 1.6, 4.4, G.shieldS);                  // shield seen edge-on
      R(8, 15, 8, 8, HC.tunic); R(8, 15, 2, 8, HC.tunicS); R(14, 16, 1, 3, HC.tunicH);
      if (G.plate) { R(10, 16, 6, 4, G.plate); R(10, 16, 1, 4, G.plateS); R(14, 16, 1, 1, G.plateH); }
      R(8, 20, 8, 1, HC.belt); R(13, 20, 2, 1, HC.gold);
      R(10, 7, 9, 8, HC.skin); R(10, 7, 2, 7, HC.skinS); Pp(19, 11, HC.skin); R(10, 14, 7, 1, HC.skin);
      R(6, 8, 6, 6, HC.hair); R(6, 12, 5, 2, HC.hairS); R(8, 8, 10, 2, HC.hair); Pp(17, 10, HC.hair); Pp(12, 11, HC.skinS);
      if (pose.hurt) { Pp(15, 11, HC.eye); Pp(16, 12, HC.eye); Pp(16, 11, HC.eye); Pp(15, 12, HC.eye); }
      else if (pose.blink) R(15, 12, 2, 1, HC.eye);
      else { R(15, 11, 2, 2, HC.eye); Pp(16, 11, '#ffffff'); }
      Pp(16, 14, HC.mouth); Pp(14, 13, HC.blush);
      helmet(true); R(16, 6, 2, 2, HC.ruby);
      R(12, 16, 3, 4, G.plate || HC.tunic); R(14, 19, 2, 2, HC.skin);   // front arm
      if (pose.dash) {   // sword thrust forward
        const L = G.bladeLen + 2, w = 2 + G.wide;
        if (G.glow) g.r(17 + ox, 18 + oy, L + 2, w + 2, G.glow);
        R(18, 19, L, w, G.blade); R(18, 19, L - 1, 1, G.bladeH); R(18 + L, 19 + (w > 2 ? 1 : 0), 1, w - (w > 2 ? 2 : 1), G.blade);
        bladeDeco((u, v, col) => Pp(18 + L - 1 - u, 19 + v, col), L, w);
        R(17, 17, 1, w + 4, HC.gold); R(15, 19, 2, w, HC.grip);
      } else sword(16, 18 - G.bladeLen, G.bladeLen);
    }
    frontX(dir);
    pixelize(c, OL);
    const out = pose.dir === 'left' ? flipX(c) : c;
    cache.set(key, out);
    return out;
  }

  // ---------------------------------------------------------------
  //  SKELETON SWORDSMAN  40 x 52, feet on row 48
  // ---------------------------------------------------------------
  const SK = { bone: '#e8e2cf', boneS: '#b4ab90', boneD: '#7a705a', sock: '#1e1418', glow: '#ff3a3a', glowH: '#ffb0a0', iron: '#6e7686', ironS: '#454b58', ironH: '#a8b0c0', rust: '#8a5a3a', cloth: '#7a1e2a', clothS: '#4a0e18', blade: '#c8ccd4', bladeS: '#8a909c', grip: '#4a3020', dark: '#2a2026' };
  const SKPAL = Object.values(SK).concat(['#ffffff']);
  // pose: {step, sword: angle (rad, 0 = pointing down, -PI = up), jaw, sway, hurt, part}
  function skeleton(pose) {
    const key = 's' + JSON.stringify(pose);
    if (cache.has(key)) return cache.get(key);
    const [c, x] = canvas(44, 56), g = api(x), oy = 4 + (pose.bob || 0), ox = 2;
    const R = (a, b, w, h, col) => g.r(a + ox, b + oy, w, h, col), Pp = (a, b, col) => g.p(a + ox, b + oy, col);
    const s = pose.step || 0;
    // sword (behind the arm) — rotated polygon from the hand
    const sa = pose.sword == null ? 0.35 : pose.sword;
    const shX = 27 + ox, shY = 23 + oy;                                     // shoulder
    const ha = sa * 0.9, hx = shX + Math.sin(ha) * 7, hy = shY + Math.cos(ha) * 7;
    const blade = (len) => {
      const dx = Math.sin(sa), dy = Math.cos(sa), nx = dy, ny = -dx;
      const b0x = hx + dx * 3, b0y = hy + dy * 3;
      g.poly([[b0x + nx * 1.6, b0y + ny * 1.6], [b0x + dx * len + nx * 1.4, b0y + dy * len + ny * 1.4], [b0x + dx * (len + 3), b0y + dy * (len + 3)], [b0x + dx * len - nx * 1.4, b0y + dy * len - ny * 1.4], [b0x - nx * 1.6, b0y - ny * 1.6]], SK.blade);
      g.line(b0x + dx * 2 - nx * 0.6, b0y + dy * 2 - ny * 0.6, b0x + dx * (len - 1) - nx * 0.6, b0y + dy * (len - 1) - ny * 0.6, 1, SK.bladeS);
      g.line(hx + dx * 2 + nx * 3.5, hy + dy * 2 + ny * 3.5, hx + dx * 2 - nx * 3.5, hy + dy * 2 - ny * 3.5, 1.6, SK.rust);
      g.line(hx - dx * 1, hy - dy * 1, hx + dx * 1.6, hy + dy * 1.6, 1.8, SK.grip);
    };
    if (!pose.part) {
      // legs
      const lift = (k) => (s === k ? 2 : 0);
      R(17, 33 - lift(1), 2, 5, SK.bone); R(16, 37 - lift(1), 4, 1, SK.boneS); R(17, 38 - lift(1), 2, 5, SK.bone); R(15, 43 - lift(1), 4, 1, SK.bone);
      R(22, 33 - lift(-1), 2, 5, SK.bone); R(21, 37 - lift(-1), 4, 1, SK.boneS); R(22, 38 - lift(-1), 2, 5, SK.bone); R(22, 43 - lift(-1), 4, 1, SK.bone);
      // pelvis
      R(16, 30, 9, 2, SK.bone); R(17, 32, 2, 1, SK.boneS); R(22, 32, 2, 1, SK.boneS); Pp(20, 31, SK.boneD);
      // ribcage
      const sw = pose.sway || 0;
      R(16, 22, 9, 7, SK.dark);
      R(19 + sw, 20, 3, 11, SK.boneS);
      for (const yy of [21, 23, 25, 27]) { R(15, yy, 11, 1, SK.bone); Pp(14, yy + 1, SK.bone); Pp(26, yy + 1, SK.bone); }
      R(25, 21, 1, 7, SK.boneS);
      // scarf
      R(15, 18, 11, 2, SK.cloth); R(23, 20, 2, 5, SK.cloth); Pp(24, 25 + (pose.flap || 0), SK.clothS); Pp(23, 25, SK.clothS); R(15, 19, 11, 1, SK.clothS);
      // shield arm (left)
      R(13, 21, 2, 4, SK.bone); R(12, 25, 2, 4, SK.bone);
      g.ell(9 + ox, 29 + oy, 5.6, 6.6, SK.ironS); g.ell(9 + ox, 29 + oy, 4.4, 5.4, SK.iron);
      Pp(8, 27, SK.ironH); Pp(9, 29, SK.ironH); R(10, 31, 2, 2, SK.rust); Pp(6, 26, SK.rust); Pp(5, 30, SK.ironH); Pp(12, 26, SK.ironH);
      // sword arm (right)
      blade(13);
      g.line(shX, shY, hx, hy, 2, SK.bone);
      g.ell(hx, hy, 1.6, 1.6, SK.boneS);
      // skull
      R(16, 8, 9, 1, SK.bone); R(15, 9, 11, 1, SK.bone); R(14, 10, 13, 6, SK.bone); R(15, 16, 11, 1, SK.bone);
      R(24, 10, 3, 6, SK.boneS); Pp(16, 10, SK.boneD); Pp(17, 11, SK.boneD);
      R(16, 12, 3, 3, SK.sock); R(22, 12, 3, 3, SK.sock);
      const gl = pose.hurt ? '#ffffff' : SK.glow;
      Pp(17, 13, gl); Pp(23, 13, gl); if (pose.glowBig) { Pp(17, 12, SK.glowH); Pp(23, 12, SK.glowH); }
      Pp(20, 15, SK.sock);
      const jw = pose.jaw || 0;
      R(16, 17 + jw, 9, 2, SK.bone); for (const tx of [17, 19, 21, 23]) Pp(tx, 17 + jw, SK.sock); R(16, 18 + jw, 9, 1, SK.boneS);
      // broken helmet
      R(15, 6, 11, 3, SK.iron); R(17, 5, 7, 1, SK.iron); R(15, 8, 11, 1, SK.ironS); Pp(18, 6, SK.ironH); Pp(23, 7, SK.ironH); R(21, 6, 2, 1, SK.ironS);
      R(13, 4, 2, 3, SK.bone); Pp(13, 3, SK.boneS);                     // snapped horn
      R(26, 3, 2, 4, SK.bone); R(27, 1, 1, 2, SK.bone); Pp(26, 6, SK.boneS);
    }
    pixelize(c, OL, SKPAL);
    cache.set(key, c);
    return c;
  }
  // crop parts out of the standing pose for the collapse
  function skeletonParts() {
    const key = 'sparts';
    if (cache.has(key)) return cache.get(key);
    const src = skeleton({ sword: 0.35 });
    const crop = (sx, sy, w, h) => { const [c, x] = canvas(w, h); x.drawImage(src, sx, sy, w, h, 0, 0, w, h); return c; };
    const parts = [
      { c: crop(14, 6, 18, 18), ox: 14, oy: 6, kind: 'skull' },
      { c: crop(14, 22, 16, 12), ox: 14, oy: 22 },
      { c: crop(16, 33, 14, 5), ox: 16, oy: 33 },
      { c: crop(16, 37, 6, 13), ox: 16, oy: 37 },
      { c: crop(22, 37, 7, 13), ox: 22, oy: 37 },
      { c: crop(1, 21, 15, 18), ox: 1, oy: 21 },
      { c: crop(28, 24, 12, 26), ox: 28, oy: 24 },
    ];
    cache.set(key, parts);
    return parts;
  }

  // ---------------------------------------------------------------
  //  FIRE DRAGON (えんりゅう)  104 x 92
  // ---------------------------------------------------------------
  const DG = { body: '#e8562a', bodyS: '#b03a1a', bodyH: '#ff8a4a', belly: '#ffc070', bellyS: '#d8904a', wing: '#a02818', wingS: '#6e160e', bone: '#4e140c', horn: '#f0e0c0', hornS: '#b8a07a', eye: '#ffe040', pupil: '#2a0c06', mouth: '#5a0c0c', tooth: '#ffffff', lava: '#ffd040', claw: '#f0e0c0' };
  // pose: {flap: -1..1, breath: 0..1 (chest), open: 0..1 (jaw), rage: bool, hurt: bool, tilt: px}
  function dragon(pose) {
    const key = 'd' + JSON.stringify(pose);
    if (cache.has(key)) return cache.get(key);
    const [c, x] = canvas(104, 92), g = api(x);
    const f = pose.flap || 0, br = pose.breath || 0, op = pose.open || 0, tl = pose.tilt || 0;
    const cx = 52, by = 56;
    // tail
    const tail = [[58, 68, 9], [68, 76, 8], [79, 75, 6.5], [87, 67, 5], [90, 58, 4], [89, 51, 3]];
    for (let i = 1; i < tail.length; i++) g.line(tail[i - 1][0], tail[i - 1][1], tail[i][0], tail[i][1], tail[i][2], DG.bodyS);
    for (let i = 1; i < tail.length - 1; i++) g.p(tail[i][0], tail[i][1] - tail[i][2] / 2, DG.horn);
    g.poly([[86, 52], [93, 41], [92, 53]], DG.horn);
    // wings (behind)
    const wing = (m) => {
      const X = v => cx + m * (v - cx);
      const root = [X(42), 36], elbow = [X(24), 17 + 6 * f], A = [X(5), 12 + 12 * f], B = [X(2), 32 + 10 * f], C = [X(10), 48 + 6 * f], D = [X(26), 55 + 3 * f];
      g.poly([root, elbow, A, [X(10), 24 + 11 * f], B, [X(13), 41 + 8 * f], C, [X(22), 50 + 5 * f], D, [X(40), 50]], DG.wing);
      g.poly([root, elbow, [X(14), 30 + 9 * f], [X(24), 46 + 4 * f], [X(40), 48]], DG.wingS);
      g.line(root[0], root[1], elbow[0], elbow[1], 3, DG.bone);
      for (const T of [A, B, C, D]) g.line(elbow[0], elbow[1], T[0], T[1], 1.4, DG.bone);
      g.ell(elbow[0], elbow[1] - 1, 1.6, 1.6, DG.claw);
    };
    wing(1); wing(-1);
    // feet
    for (const m of [-1, 1]) { g.ell(cx + m * 10, by + 16, 6, 4, DG.bodyS); for (const k of [-2, 0, 2]) g.p(cx + m * 10 + k, by + 19, DG.claw); }
    // body + belly
    g.ell(cx, by, 15 + br * 1.5, 18 + br, DG.body);
    g.ell(cx + 6, by + 2, 8, 14, DG.bodyS);
    g.ell(cx - 6, by - 6, 4, 6, DG.bodyH);
    g.ell(cx, by + 3, 8 + br, 13, DG.belly);
    for (let yy = by - 8; yy < by + 15; yy += 3) g.r(cx - 7, yy, 14, 1, DG.bellyS);
    if (pose.rage) { g.line(cx - 12, by - 4, cx - 7, by + 6, 1, DG.lava); g.line(cx + 11, by - 2, cx + 7, by + 8, 1, DG.lava); g.line(cx - 10, by + 9, cx - 5, by + 13, 1, DG.lava); }
    // arms
    for (const m of [-1, 1]) { g.line(cx + m * 13, by - 6, cx + m * 15, by + 4, 3, DG.bodyS); for (const k of [-1, 1]) g.p(cx + m * 15 + k, by + 6, DG.claw); }
    // neck + head
    const hx = cx + tl, hy = 27 - op * 2;
    g.ell(cx, by - 18, 7, 8, DG.body);
    for (const m of [-1, 1]) {   // horns + frills
      g.line(hx + m * 7, hy - 6, hx + m * 14, hy - 16, 3, DG.hornS); g.line(hx + m * 14, hy - 16, hx + m * 17, hy - 22, 2, DG.horn); g.line(hx + m * 7, hy - 6, hx + m * 13, hy - 15, 1.5, DG.horn);
      g.poly([[hx + m * 10, hy - 1], [hx + m * 17, hy + 1], [hx + m * 10, hy + 4]], DG.bodyS);
    }
    g.ell(hx, hy, 11, 9, DG.body);
    g.ell(hx + 4, hy + 1, 6, 6, DG.bodyS);
    g.ell(hx - 4, hy - 4, 4, 2, DG.bodyH);
    // jaw / snout
    if (op > 0.05) {
      g.ell(hx, hy + 9 + op * 3, 7, 3 + op * 4, DG.mouth);
      g.ell(hx, hy + 9 + op * 3, 4, 1.5 + op * 2.5, pose.firing ? '#ffd040' : '#a01818');
      for (const k of [-5, -2, 2, 5]) { g.p(hx + k, hy + 7 + op, DG.tooth); g.p(hx + k, hy + 11 + op * 6, DG.tooth); }
      g.ell(hx, hy + 14 + op * 6, 6, 2.5, DG.bodyS);
    }
    g.ell(hx, hy + 6, 7, 4, DG.bodyH);
    g.p(hx - 3, hy + 7, DG.pupil); g.p(hx + 3, hy + 7, DG.pupil);
    // eyes + brows
    const ec = pose.hurt ? '#ffffff' : pose.rage ? '#fff6c0' : DG.eye;
    for (const m of [-1, 1]) {
      g.r(hx + m * 5 - (m < 0 ? 2 : 0), hy - 2, 3, 2, ec);
      if (!pose.hurt) g.p(hx + m * 5 + (m < 0 ? -1 : 1), hy - 2, DG.pupil), g.p(hx + m * 5 + (m < 0 ? -1 : 1), hy - 1, DG.pupil);
      g.line(hx + m * 3, hy - 3, hx + m * 9, hy - 5, 1.2, DG.bodyS);
    }
    pixelize(c, '#2a0c06');
    cache.set(key, c);
    return c;
  }

  // ---------------------------------------------------------------
  //  generic sprite builder: draw once per pose, pixelize, cache
  // ---------------------------------------------------------------
  function mk(key, w, h, ax, ay, draw, ol, pal) {
    let s = cache.get(key);
    if (s) return s;
    const [c, x] = canvas(w, h), g = api(x);
    draw(g, x);
    pixelize(c, ol === undefined ? OL : ol, pal);
    s = { c, ax, ay };
    cache.set(key, s);
    return s;
  }
  // mirror a sprite (monsters turn toward the hero)
  function flipped(s) {
    if (!s.flip) s.flip = { c: flipX(s.c), ax: s.c.width - s.ax, ay: s.ay };
    return s.flip;
  }
  // a dark, purple-tinted copy (the shadow that mirrors the hero)
  function shadeOf(s) {
    if (!s.shade) { const [c, x] = canvas(s.c.width, s.c.height); x.drawImage(s.c, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(40,16,70,0.78)'; x.fillRect(0, 0, c.width, c.height); s.shade = { c, ax: s.ax, ay: s.ay }; }
    return s.shade;
  }
  function stoneOf(s) {
    if (!s.stone) {
      const [c, x] = canvas(s.c.width, s.c.height); x.drawImage(s.c, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height), a = d.data;
      for (let i = 0; i < a.length; i += 4) { if (!a[i + 3]) continue; const l = (a[i] * 0.3 + a[i + 1] * 0.59 + a[i + 2] * 0.11) * 0.8 + 40; a[i] = Math.min(255, l); a[i + 1] = Math.min(255, l * 0.98); a[i + 2] = Math.min(255, l * 0.92); }
      x.putImageData(d, 0, 0); s.stone = { c, ax: s.ax, ay: s.ay };
    }
    return s.stone;
  }
  function white(s) {
    if (!s.white) s.white = { c: whiten(s.c), ax: s.ax, ay: s.ay };
    return s.white;
  }
  const EYE = '#1e1830';

  // ---------------------------------------------------------------
  //  REGULAR ENEMIES
  // ---------------------------------------------------------------
  const EN = {
    // ----- slime: wobbling dome -----
    slime(P) {
      const k = P.st === 'hop' ? 2 : P.f % 2;
      return mk('slime' + k, 32, 28, 16, 25, g => {
        const sq = [1, 1.07, 0.8][k], rx = 12.5 / sq, ry = 9.5 * sq, cy = 24 - ry * 0.9;
        g.ell(16, cy, rx, ry, '#2f9a4a'); g.r(Math.round(16 - rx + 2), 22, Math.round(rx * 2 - 4), 2, '#2f9a4a');
        g.ell(15, cy - 1, rx - 1.6, ry - 1.6, '#58d36b');
        g.ell(11, cy - ry * 0.5, 2.6, 1.6, '#c8f8cc'); g.p(15, Math.round(cy - ry * 0.75), '#c8f8cc');
        const ey = Math.round(cy - 1);
        g.r(11, ey - 1, 2, 3, EYE); g.p(11, ey - 1, '#fff'); g.r(19, ey - 1, 2, 3, EYE); g.p(19, ey - 1, '#fff');
        g.r(14, ey + 3, 4, 1, '#1f6a34'); g.p(13, ey + 2, '#1f6a34'); g.p(18, ey + 2, '#1f6a34');
        g.p(9, ey + 2, '#f0a0a0'); g.p(22, ey + 2, '#f0a0a0');
      });
    },
    // ----- bat: three wing frames -----
    bat(P) {
      const k = P.f % 3;
      return mk('bat' + k, 40, 26, 20, 22, g => {
        const o = [-8, 0, 6][k];
        for (const m of [1, -1]) {
          const X = v => m > 0 ? v : 40 - v;
          g.poly([[X(15), 11], [X(6), 4 + o], [X(0), 8 + o], [X(3), 12 + o / 2], [X(6), 11 + o / 3], [X(8), 15 + o / 4], [X(13), 14]], '#3a2860');
          g.line(X(15), 11, X(6), 4 + o, 1, '#24163e'); g.line(X(6), 4 + o, X(3), 12 + o / 2, 1, '#24163e'); g.line(X(6), 4 + o, X(8), 15 + o / 4, 1, '#24163e');
        }
        g.poly([[15, 9], [16, 3], [18, 8]], '#5b3d8a'); g.poly([[25, 9], [24, 3], [22, 8]], '#5b3d8a');
        g.ell(20, 13, 6, 5.5, '#5b3d8a'); g.ell(20, 15, 3.4, 3, '#8a6ab8'); g.p(17, 9, '#8a6ab8');
        g.r(16, 11, 2, 2, '#ffe14a'); g.p(17, 12, '#600'); g.r(22, 11, 2, 2, '#ffe14a'); g.p(22, 12, '#600');
        g.p(18, 16, '#fff'); g.p(21, 16, '#fff'); g.p(18, 18, '#3a2860'); g.p(21, 18, '#3a2860');
      });
    },
    // ----- goblin: club at rest / raised / swinging -----
    goblin(P) { return goblinish(P, false); },
    archer(P) { return goblinish(P, true); },
    // ----- skeleton swordsman (see skeleton()) -----
    skeleton(P) {
      const sw = P.st === 'wind' ? 2.5 : P.st === 'slash' ? Math.round((2.5 - Math.min(1, P.k || 0) * 3.1) * 5) / 5 : 0.35;
      const key = 'skel' + sw + '|' + (P.step || 0) + '|' + (P.st === 'wind' ? 1 : 0) + '|' + (P.f % 2);
      let s = cache.get(key);
      if (!s) { s = { c: skeleton({ sword: sw, step: P.step || 0, jaw: P.st === 'wind' ? 1 : 0, bob: P.f % 2, flap: P.f % 2 }), ax: 22, ay: 48 }; cache.set(key, s); }
      return s;
    },
    // ----- ghost: wavy tail -----
    ghost(P) {
      const k = P.f % 3;
      return mk('ghost' + k, 34, 34, 17, 31, g => {
        const B = '#d7e8ff', S = '#a8c0e8';
        g.ell(17, 13, 10, 10, B); g.r(7, 13, 20, 11, B);
        for (let i = 0; i < 5; i++) g.ell(9 + i * 4, 24 + [0, 1.5, 0, -1.5, 0][(i + k) % 5] + (i % 2), 2.4, 3, B);
        g.ell(23, 16, 3.5, 8, S); g.r(23, 22, 4, 3, S);
        g.ell(12, 7, 3, 2, '#ffffff');
        const ay = [0, -1, 1][k]; g.ell(6, 17 + ay, 2.4, 2, B); g.ell(28, 17 - ay, 2.4, 2, S);
        g.r(12, 11, 2, 4, '#1a2440'); g.p(12, 11, '#fff'); g.r(20, 11, 2, 4, '#1a2440'); g.p(20, 11, '#fff');
        g.r(16, 18, 2, 3, '#1a2440'); g.p(10, 16, '#f0b0c8'); g.p(23, 16, '#f0b0c8');
      }, '#2a3460');
    },
    // ----- dark mage: staff orb glows while casting -----
    mage(P) {
      const cast = P.st === 'cast' ? 1 : 0, k = P.f % 2;
      return mk('mage' + cast + k, 34, 48, 17, 46, g => {
        const R = '#3b2466', RS = '#24123e', HT = '#8a4fd8', HS = '#5a2a9a', G = '#f2c14e';
        g.poly([[11, 21], [23, 21], [28, 45], [6, 45]], R); g.poly([[18, 21], [23, 21], [28, 45], [20, 45]], RS);
        g.r(6, 44, 22, 1, G); g.r(16, 22, 2, 22, '#5a3a8a');
        g.r(9, 23 - cast * 3, 4, 7, R); g.r(9, 29 - cast * 3, 3, 2, '#c8b0e8');
        // staff
        const sy = cast ? 4 : 10 + k;
        g.r(25, sy + 3, 2, 44 - sy - 3, '#6a4020'); g.r(23, sy + 2, 6, 1, G);
        g.r(23, 27 - cast * 4, 4, 3, R); g.r(24, 29 - cast * 4, 3, 2, '#c8b0e8');
        g.ell(26, sy, cast ? 3.6 : 2.8, cast ? 3.6 : 2.8, cast ? '#e8b0ff' : '#c878ff'); g.p(25, sy - 1, '#ffffff');
        // face + hat
        g.r(11, 15, 12, 7, '#140a24');
        g.r(13, 17, 2, 1, '#ffe14a'); g.r(19, 17, 2, 1, '#ffe14a'); if (cast) { g.p(13, 18, '#ffe14a'); g.p(20, 18, '#ffe14a'); }
        g.ell(17, 14, 11, 2.6, HS);
        g.poly([[10, 14], [24, 14], [20, 7], [23, 1], [16, 4], [13, 10]], HT); g.poly([[17, 14], [24, 14], [20, 7]], HS);
        g.r(11, 12, 12, 1, G); g.p(16, 8, G); g.p(14, 11, '#fff27a');
      });
    },
    // ----- salamander (side view) -----
    lizard(P) {
      const wind = P.st === 'wind' || P.st === 'fire' ? 1 : 0, k = P.f % 2, fl = P.f % 3;
      return mk('liz' + wind + k + fl, 50, 32, 25, 29, g => {
        const B = '#ff7a3c', S = '#c04a1a', BL = '#ffd080';
        g.line(14, 21, 7, 15, 5, S); g.line(7, 15, 3, 10, 3, S);
        g.ell(3, 8 - fl, 2.4, 3, '#ffd24a'); g.p(3, 5 - fl, '#ff4a1a'); g.p(2, 9, '#ff4a1a');
        const leg = (x, fw) => { g.r(x + fw, 24, 3, 4, S); g.r(x + fw - 1, 27, 5, 1, '#8a2a0a'); };
        leg(15, k ? 2 : -1); leg(29, k ? -1 : 2);
        g.ell(24, 20, 12, 6, B); g.ell(24, 23, 9, 3, BL);
        for (let i = 0; i < 5; i++) g.poly([[15 + i * 4, 15], [17 + i * 4, 11], [19 + i * 4, 15]], '#ffd24a');
        leg(19, k ? -1 : 2); leg(33, k ? 2 : -1);
        g.ell(37, 17 - wind, 6, 5, B); g.ell(42, 18 - wind * 2, 4, 3, B);
        if (wind) { g.poly([[38, 19], [47, 17], [46, 23]], '#6a0a0a'); g.p(44, 19, '#ffd24a'); g.p(45, 20, '#ffffff'); }
        else g.r(40, 20, 6, 1, S);
        g.r(38, 14 - wind, 2, 2, '#ffe14a'); g.p(39, 14 - wind, EYE); g.p(44, 16 - wind * 2, S);
      });
    },
    // ----- stone golem -----
    golem(P) {
      const wind = P.st === 'wind' ? 1 : 0, k = P.f % 2;
      return mk('golem' + wind + k, 54, 58, 27, 55, g => {
        const B = '#9a8f86', S = '#6a625c', H = '#c4bab0', M = '#5a8a3a', E = wind ? '#ff5a3a' : '#7af0ff';
        g.r(16, 44, 9, 10, S); g.r(30, 44, 9, 10, S); g.r(15, 53, 11, 2, '#4a443e'); g.r(29, 53, 11, 2, '#4a443e');
        g.r(12, 20, 31, 26, B); g.r(36, 20, 7, 26, S); g.r(12, 20, 31, 2, H); g.r(12, 44, 31, 2, S);
        g.r(17, 27, 2, 8, S); g.r(24, 33, 7, 1, S); g.p(33, 24, S);
        g.ell(27, 32, 3.4, 3.4, '#4a4440'); g.ell(27, 32, 2, 2, E);
        g.r(13, 21, 6, 3, M); g.r(38, 38, 4, 2, M);
        // arms
        const ay = wind ? -14 : k;
        for (const m of [-1, 1]) {
          const x0 = m < 0 ? 2 : 43;
          g.r(x0, 22 + ay, 10, 18, m < 0 ? B : S); g.r(x0, 22 + ay, 10, 2, H);
          g.r(x0 - 1, 37 + ay, 12, 9, B); g.r(x0 - 1, 44 + ay, 12, 2, S); g.r(x0 + 2, 39 + ay, 1, 4, S); g.r(x0 + 6, 39 + ay, 1, 4, S);
        }
        g.r(19, 7, 17, 14, B); g.r(31, 7, 5, 14, S); g.r(19, 7, 17, 2, H); g.r(21, 9, 13, 1, M);
        g.r(20, 12, 15, 2, '#4a4440'); g.r(22, 13, 3, 2, E); g.r(30, 13, 3, 2, E);
        g.r(24, 17, 7, 1, '#4a4440');
      });
    },
    // ----- dark knight: tower shield up (guard) / lowered (thrust) -----
    knight(P) {
      const st = P.st === 'wind' || P.st === 'dash' ? 1 : P.st === 'tired' ? 2 : 0, k = P.f % 2;
      return mk('knight' + st + k, 44, 52, 22, 49, g => {
        const A = '#5a5f7a', S = '#3a3e52', H = '#8a90a8', C = '#7a1828';
        g.poly([[14, 19], [30, 19], [33, 46], [11, 46]], C);
        g.r(15, 37, 5, 9, S); g.r(24, 37, 5, 9, S); g.r(14, 45, 7, 2, '#22242e'); g.r(23, 45, 7, 2, '#22242e');
        g.r(13, 21, 18, 17, A); g.r(26, 21, 5, 17, S); g.r(15, 22, 3, 6, H); g.r(13, 33, 18, 2, S); g.r(21, 33, 2, 2, '#c9a24a');
        g.r(10, 20, 6, 5, H); g.r(28, 20, 6, 5, A);
        // helmet
        const hy = st === 2 ? 3 : 0;
        g.r(14, 6 + hy, 16, 15, A); g.r(26, 6 + hy, 4, 15, S); g.r(15, 7 + hy, 3, 4, H);
        g.r(15, 12 + hy, 14, 3, '#1b1d2a'); g.r(17, 13 + hy, 3, 1, '#ff3b4a'); g.r(24, 13 + hy, 3, 1, '#ff3b4a');
        g.r(21, 3 + hy, 2, 4, '#c0283a'); g.r(19, 1 + hy, 6, 3, '#c0283a'); g.p(25, 2 + hy, '#e04050');
        // sword (right)
        if (st === 1) { g.r(31, 27, 12, 3, '#dfe6f2'); g.r(31, 27, 11, 1, '#ffffff'); g.r(30, 25, 2, 7, '#c9a24a'); g.r(27, 26, 4, 4, A); }
        else { g.r(34, 8 + k, 3, 18, '#dfe6f2'); g.r(34, 9 + k, 1, 16, '#ffffff'); g.r(32, 26 + k, 7, 2, '#c9a24a'); g.r(34, 28 + k, 3, 3, '#4a3020'); g.r(31, 28 + k, 4, 4, A); }
        // shield
        if (st === 0) { g.r(4, 16, 13, 26, '#4a5068'); g.r(5, 17, 11, 24, '#5d6684'); g.r(5, 17, 11, 2, '#8a96b8'); g.r(9, 21, 3, 14, '#c9a24a'); g.r(6, 26, 9, 3, '#c9a24a'); }
        else { g.r(2, 24, 9, 20, '#4a5068'); g.r(3, 25, 7, 18, '#5d6684'); g.r(5, 29, 3, 9, '#c9a24a'); }
      });
    },
    // ----- imp: little flying devil -----
    imp(P) {
      const k = P.f % 3;
      return mk('imp' + k, 40, 34, 20, 30, g => {
        const R = '#e0483c', S = '#a3241c', W = '#7a1414';
        const o = [-6, 0, 5][k];
        for (const m of [1, -1]) { const X = v => m > 0 ? v : 40 - v; g.poly([[X(15), 14], [X(5), 6 + o], [X(2), 14 + o], [X(6), 13 + o / 2], [X(8), 18], [X(14), 18]], W); g.line(X(15), 14, X(5), 6 + o, 1, '#4a0808'); }
        g.line(24, 24, 30, 28, 1.4, S); g.poly([[30, 26], [34, 29], [30, 31]], S);
        g.ell(20, 22, 5, 5, R); g.ell(20, 23, 3, 3, '#ff9a7a');
        g.r(16, 26, 2, 3, S); g.r(22, 26, 2, 3, S);
        g.ell(20, 14, 6.5, 6, R); g.ell(23, 15, 3, 4, S);
        g.poly([[15, 10], [12, 3], [17, 8]], '#ffd24a'); g.poly([[25, 10], [28, 3], [23, 8]], '#ffd24a');
        g.r(16, 13, 3, 2, '#ffe14a'); g.p(17, 13, '#300'); g.r(21, 13, 3, 2, '#ffe14a'); g.p(22, 13, '#300');
        g.r(17, 17, 6, 1, '#4a0808'); g.p(18, 18, '#fff'); g.p(21, 18, '#fff');
        g.r(10, 14, 1, 14, '#c8c8d8'); g.r(8, 13, 5, 1, '#c8c8d8'); g.p(8, 12, '#c8c8d8'); g.p(10, 11, '#c8c8d8'); g.p(12, 12, '#c8c8d8'); g.r(10, 21, 3, 2, R);
      });
    },
    // ----- wolf (side view): run cycle, crouch, leap -----
    wolf(P) { return wolfish(P, 'wolf', { B: '#8a98b0', S: '#5a6680', H: '#c4cede', L: '#d8dee8', foot: '#3a4258', eye: '#ffe14a', ear: '#e8a0a0' }); },
    // ----- mushroom: cap swells before the spore burst -----
    mushroom(P) {
      const sw = P.st === 'swell' ? 1 : 0, k = P.f % 2;
      return mk('mush' + sw + k, 36, 38, 18, 35, g => {
        const C = '#e0503c', CS = '#a8302a', St = '#f0e2c8', SS = '#c8b898';
        g.r(14, 33, 3, 2, SS); g.r(20, 33, 3, 2, SS);
        g.r(12, 20, 13, 14, St); g.r(21, 20, 4, 14, SS);
        g.r(14, 24, 2, 2, EYE); g.r(21, 24, 2, 2, EYE); g.p(14, 24, '#fff'); g.p(21, 24, '#fff');
        g.line(13, 22, 16, 23, 1, '#5a3a2a'); g.line(24, 22, 21, 23, 1, '#5a3a2a');
        g.r(17, 28, 3, 1, '#5a3a2a'); g.p(10, 26 + k, St); g.p(26, 26 - k, SS);
        const rx = sw ? 16 : 14, ry = sw ? 9 : 7.5, cy = sw ? 12 : 13;
        g.ell(18, cy, rx, ry, CS); g.r(18 - rx + 2, cy + Math.round(ry) - 2, rx * 2 - 4, 2, '#7a2a20');
        g.ell(17, cy - 1.5, rx - 1.5, ry - 2, C);
        for (const [ox, oy, r] of [[-7, -3, 2.6], [1, -6, 2.2], [7, -2, 2], [-2, 0, 1.4], [10, -5, 1.2]]) g.ell(18 + ox * rx / 14, cy + oy * ry / 7.5, r, r, '#fff6ea');
      });
    },
    // ----- crystal spider -----
    spider(P) {
      const k = P.f % 2, aim = P.st === 'aim' ? 1 : 0;
      return mk('spider' + k + aim, 46, 34, 23, 30, g => {
        const L = '#2a3048', LH = '#4a5478';
        for (let i = 0; i < 4; i++) for (const m of [-1, 1]) {
          const sh = (i + (m > 0 ? k : 1 - k)) % 2 ? 1 : -1, kx = 23 + m * (9 + i), ky = 13 + i * 2 + sh;
          g.line(23 + m * 3, 17 + i, kx, ky - 4, 1.6, L); g.line(kx, ky - 4, 23 + m * (14 + i * 2), 26 + i - (i === 0 ? 4 : 0) + sh, 1.4, L); g.p(kx, ky - 4, LH);
        }
        g.ell(23, 22, 9, 7, '#3a4060'); g.ell(21, 20, 5, 3, LH);
        g.poly([[17, 18], [19, 10], [21, 18]], '#7ad8ff'); g.poly([[22, 17], [25, 7], [27, 17]], '#c8f4ff'); g.poly([[27, 19], [30, 13], [31, 20]], '#7ad8ff'); g.p(25, 10, '#ffffff');
        g.ell(23, 13 + (aim ? -1 : 0), 4.5, 4, L);
        for (const [ex, ey] of [[21, 12], [25, 12], [22, 14], [24, 14]]) g.p(ex, ey + (aim ? -1 : 0), '#ff4060');
        g.p(22, 17, '#e8e8f0'); g.p(24, 17, '#e8e8f0');
      });
    },
    // ----- sahagin with trident -----
    fishman(P) {
      const sw = P.st === 'wind' ? 1 : P.st === 'slash' ? 2 : 0, k = P.f % 2;
      return mk('fish' + sw + k, 44, 52, 20, 49, g => {
        const B = '#3aa8a0', S = '#22706a', H = '#7ad8c8', W = '#e8f8ff';
        g.r(14, 38, 4, 9, S); g.r(22, 38, 4, 9, S); g.poly([[12, 47], [19, 47], [17, 49], [12, 49]], H); g.poly([[21, 47], [28, 47], [28, 49], [23, 49]], H);
        g.ell(20, 32, 9, 9, B); g.ell(20, 34, 5.5, 6, W); for (let yy = 30; yy < 39; yy += 3) g.r(17, yy, 7, 1, '#c8e0e8');
        g.r(10, 27, 3, 10, B); g.ell(11, 37, 2.4, 2, H);
        // head
        g.poly([[13, 10], [16, 3], [18, 9], [21, 2], [23, 9], [26, 4], [27, 11]], S);
        g.ell(20, 16, 9.5, 8, B); g.ell(23, 17, 5, 6, S);
        g.ell(13, 14, 3, 3.2, '#ffe14a'); g.ell(27, 14, 3, 3.2, '#ffe14a'); g.r(13, 14, 2, 2, EYE); g.r(26, 14, 2, 2, EYE); g.p(12, 13, '#fff'); g.p(26, 13, '#fff');
        g.r(15, 21, 10, 2, '#0c3a36'); for (const tx of [16, 18, 20, 22, 24]) g.p(tx, 21, '#fff');
        g.r(10, 18, 1, 3, S); g.r(29, 18, 1, 3, S);
        // trident
        const a = sw === 1 ? 2.8 : sw === 2 ? 1.3 : 0.15 + k * 0.05;
        const hx = 31, hy = 30, dx = Math.sin(a), dy = -Math.cos(a);
        g.line(hx - dx * 6, hy - dy * 6, hx + dx * 18, hy + dy * 18, 1.6, '#8a6a40');
        const tx = hx + dx * 18, ty = hy + dy * 18, nx = -dy, ny = dx;
        g.line(tx - nx * 3, ty - ny * 3, tx + nx * 3, ty + ny * 3, 1.4, '#c8ccd4');
        for (const o of [-3, 0, 3]) g.line(tx + nx * o, ty + ny * o, tx + nx * o + dx * 5, ty + ny * o + dy * 5, 1.3, '#dfe6f2');
        g.r(28, 27, 4, 5, B); g.ell(31, 30, 2.2, 2, H);
      });
    },
    // ----- death scorpion (side view) -----
    scorpion(P) {
      const st = P.st === 'wind' ? 1 : P.st === 'dash' ? 2 : 0, k = P.f % 2;
      return mk('scorp' + st + k, 56, 50, 28, 46, (g, x) => {
        x.translate(0, 8);
        const B = '#c8963a', S = '#8a6420', H = '#f0c870', R = '#e5483c';
        for (let i = 0; i < 3; i++) { const lx = 22 + i * 6; g.line(lx, 30, lx - 3 + ((i + k) % 2) * 2, 37, 1.4, S); g.line(lx + 2, 30, lx + 4 - ((i + k) % 2) * 2, 37, 1.4, S); }
        // tail: segments arcing over the back
        const up = st === 1 ? 1 : 0;
        const seg = [[16, 28], [9, 24], [6, 17 - up * 4], [8, 10 - up * 7], [14, 6 - up * 8], [20, 7 - up * 7]];
        for (let i = 1; i < seg.length; i++) g.line(seg[i - 1][0], seg[i - 1][1], seg[i][0], seg[i][1], 4.4 - i * 0.4, S);
        seg.forEach(([x, y], i) => g.ell(x, y, 3.6 - i * 0.3, 3.2 - i * 0.3, i % 2 ? S : B));
        const [sx, sy] = seg[seg.length - 1];
        g.poly([[sx + 2, sy - 2], [sx + 7, sy + 2], [sx + 2, sy + 2]], st === 1 ? R : '#5a3a10'); if (st === 1) g.p(sx + 6, sy + 2, '#ffd0c0');
        g.ell(26, 29, 11, 5, B); for (let i = 0; i < 4; i++) g.r(17 + i * 5, 26, 1, 7, S); g.ell(25, 27, 8, 2, H);
        g.ell(38, 28, 5, 4, B); g.r(40, 26, 2, 1, '#2a0c06'); g.p(43, 27, '#2a0c06');
        // claws
        const cx = st === 2 ? 52 : 48;
        g.line(40, 30, cx - 3, 30, 2.4, S); g.ell(cx, 30, 4, 3, B); g.poly([[cx + 2, 28], [cx + 7, 26], [cx + 3, 30]], H); g.poly([[cx + 2, 32], [cx + 7, 34], [cx + 3, 30]], S);
        g.line(39, 25, cx - 5, 22, 2.2, S); g.ell(cx - 2, 22, 3.4, 2.6, B); g.poly([[cx, 20], [cx + 5, 18], [cx + 1, 22]], H);
      });
    },
    // ----- mummy: arms forward, loose bandage -----
    mummy(P) {
      const k = P.f % 2, step = P.step || 0;
      return mk('mummy' + k + step, 40, 50, 20, 47, g => {
        const B = '#d8cfa8', S = '#a89c78', L = '#8a7e5a';
        g.r(13, 36 - (step > 0 ? 2 : 0), 5, 10, B); g.r(22, 36 - (step < 0 ? 2 : 0), 5, 10, S); g.r(12, 45, 7, 2, S); g.r(21, 45, 7, 2, L);
        g.r(11, 20, 18, 17, B); g.r(24, 20, 5, 17, S);
        for (let i = 0; i < 6; i++) g.line(11, 21 + i * 3, 29, 23 + i * 3, 1, L);
        // arms reaching forward (toward the viewer)
        g.r(6, 21, 6, 5, B); g.r(4, 24, 5, 5, B); g.r(28, 21, 6, 5, S); g.r(31, 24, 5, 5, S);
        g.line(4, 26, 8, 25, 1, L); g.line(31, 26, 35, 25, 1, L);
        // flapping strip
        g.line(28, 30, 33 + k * 2, 36 - k, 1.6, B);
        // head
        g.ell(20, 13, 8.5, 8, B); g.ell(23, 14, 5, 6.5, S);
        for (let i = 0; i < 4; i++) g.line(12, 8 + i * 3, 28, 10 + i * 3, 1, L);
        g.r(14, 12, 12, 3, '#2a2018'); g.r(16, 13, 2, 1, '#ff4040'); g.r(22, 13, 2, 1, '#ff4040');
      });
    },
    // ----- poison toad: crouch, then a long leap with the tongue out -----
    toad(P) {
      const st = P.st === 'wind' ? 1 : P.st === 'dash' ? 2 : 0, k = P.f % 2;
      return mk('toad' + st + k, 54, 42, 26, 37, g => {
        const C = { d: '#3a7a1e', m: '#6ab83a', h: '#b8ec7a' }, SP = { d: '#5a2290', m: '#9a4ad8', h: '#d8a8ff' }, BL = '#e8eeb0', BLS = '#b8c070';
        const cy = st === 1 ? 27 : st === 2 ? 20 : 25;
        if (st === 2) { tube(g, [[16, cy + 4, 4.5], [8, cy + 10, 3.2], [3, cy + 13, 2.2]], C); }
        else { blob(g, 15, cy + 6, 8, 6 - st, C); g.r(9, 36, 11, 1, C.d); for (const x of [10, 13, 16]) g.p(x, 36, BLS); }
        blob(g, 25, cy, 15, 9.5 - st, C);
        g.ell(28, cy + 4, 10, 3.6, BL); for (let x = 20; x < 36; x += 3) g.p(x, cy + 6, BLS);
        for (const [x, y, r] of [[17, cy - 4, 2.4], [26, cy - 6, 2], [13, cy + 1, 1.6], [32, cy - 3, 1.6]]) { g.ell(x, y, r, r, SP.d); g.ell(x - 0.4, y - 0.4, r * 0.7, r * 0.7, SP.m); g.p(Math.round(x - r * 0.4), Math.round(y - r * 0.4), SP.h); }
        if (st !== 2) { tube(g, [[33, cy + 4, 2.4], [34, 36, 2]], C); g.r(31, 36, 7, 1, C.d); } else tube(g, [[34, cy + 4, 2.6], [42, cy + 9, 2]], C);
        const hx = 36, hy = cy - 5;
        blob(g, hx, hy + 2, 9, 6.5, C);
        for (const ex of [hx - 3, hx + 4]) { blob(g, ex, hy - 4, 3.8, 3.6, C); g.ell(ex, hy - 4, 2.4, 2.4, '#ffe14a'); g.r(ex, hy - 6, 1, 3, '#1a0a04'); g.p(ex - 1, hy - 5, '#ffffff'); }
        if (st === 2) { g.ell(hx + 6, hy + 4, 4, 2.6, '#5a1028'); tube(g, [[hx + 7, hy + 4, 1.2], [hx + 14, hy + 6, 1.2]], { d: '#a0304a', m: '#e0507a', h: '#ff9ab8' }); g.ell(hx + 15, hy + 6, 2, 2, '#ff80a0'); }
        else { g.line(hx - 1, hy + 5, hx + 8, hy + 4, 1, C.d); g.p(hx + 8, hy + 3, C.d); }
        if (k) { g.ell(hx - 11, hy - 8, 1.6, 1.6, '#c8f060'); g.p(hx - 12, hy - 9, '#ffffff'); }
      }, '#142a08');
    },
    // ----- mandrake: a root with a face; screams (spores) with its leaves spread -----
    mandrake(P) {
      const sw = P.st === 'swell' ? 1 : 0, k = P.f % 2;
      return mk('mand' + sw + k, 42, 50, 21, 47, g => {
        const R = { d: '#8a6034', m: '#d0a26a', h: '#f4d4a0' }, L1 = { m: '#4aa83a', d: '#2a6a1e' }, L2 = { m: '#7ad04a', d: '#3a8a2a' };
        for (const [x0, x1] of [[16, 12 - k], [26, 30 + k], [21, 21]]) tube(g, [[x0, 36, 2.2], [(x0 + x1) / 2, 41, 1.6], [x1, 46, 0.8]], R);
        blob(g, 21, 30, 11 + sw, 11 + sw, R);
        for (const [x, y, l] of [[14, 26, 4], [27, 33, 5], [18, 36, 3]]) g.line(x, y, x + 2, y + l, 1, R.d);
        const ay = sw ? -6 : 0;
        tube(g, [[11, 30, 1.8], [7, 27 + ay * 0.5, 1.5], [4, 23 + ay - k, 1.2]], R); tube(g, [[31, 30, 1.8], [35, 27 + ay * 0.5, 1.5], [38, 23 + ay + k, 1.2]], R);
        for (const m of [-1, 1]) { g.ell(21 + m * 4, 28, 2.2, 2.4, '#2a1408'); g.p(21 + m * 4 - 1, 27, '#ffffff'); g.line(21 + m * 2, 25, 21 + m * 6, 24, 1, '#5a3010'); }
        if (sw) { g.ell(21, 34, 3.6, 3.8, '#2a0808'); g.ell(21, 35, 2.2, 1.8, '#c04050'); } else g.r(19, 33, 4, 1, '#5a3010');
        g.p(15, 31, '#e8a090'); g.p(27, 31, '#e8a090');
        const sp = sw ? 0.35 : 0;
        feather(g, 21, 21, -Math.PI / 2 - 0.85 - sp, 15, 3.6, L1); feather(g, 21, 21, -Math.PI / 2 + 0.85 + sp, 15, 3.6, L1);
        feather(g, 21, 21, -Math.PI / 2 - 0.35 - sp * 0.5, 17, 3.4, L2); feather(g, 21, 21, -Math.PI / 2 + 0.35 + sp * 0.5, 17, 3.4, L2);
        feather(g, 21, 21, -Math.PI / 2, 19 + sw * 2, 3, L1);
        if (sw) { g.ell(21, 1.5, 2.6, 2.4, '#ff80c0'); g.p(21, 1, '#ffffff'); }
      }, '#2a1608');
    },
    // ----- wyvern: flying, wings in three frames, breathes fire -----
    wyvern(P) {
      const k = P.f % 3, fire = P.st === 'wind' || P.st === 'fire' ? 1 : 0;
      return mk('wyv' + k + fire, 64, 52, 32, 46, g => {
        const C = { d: '#245a4e', m: '#4a8a7a', h: '#8ad0b8' }, W = { d: '#1a3a5a', m: '#3a6a8a', h: '#6a9ab8' }, BN = '#14283a', BL = '#d8d0a0', HN = { d: '#a89a70', m: '#e8e0c0', h: '#ffffff' };
        const o = [-10, 0, 8][k];
        const wing = (rx, ry, sc, Cw) => {
          const el = [rx - 8 * sc, ry - 14 + o * 0.7], tips = [[rx - 22 * sc, ry - 16 + o], [rx - 26 * sc, ry - 4 + o * 0.6], [rx - 20 * sc, ry + 6 + o * 0.3], [rx - 8 * sc, ry + 8]];
          g.poly([[rx, ry], el, ...tips], Cw.m); g.poly([[rx, ry], el, tips[1], tips[2], tips[3]], Cw.d);
          g.line(rx, ry, el[0], el[1], 2.4, BN); for (const T of tips) g.line(el[0], el[1], T[0], T[1], 1, BN); g.p(Math.round(el[0]), Math.round(el[1]) - 1, HN.m);
        };
        wing(28, 26, -0.8, { d: '#10283a', m: '#264a6a' });   // far wing
        tube(g, [[20, 30, 4.5], [11, 34, 3.2], [4, 30, 2.2], [2, 25, 1.4]], C, { scale: true }); spike(g, 2, 25, -Math.PI / 2 - 0.4, 6, 2.4, HN);
        blob(g, 29, 30, 12, 7.5, C); g.ell(31, 33, 8, 3.4, BL);
        tube(g, [[24, 35, 2.4], [22, 41, 1.8]], C); tube(g, [[32, 35, 2.4], [33, 41, 1.8]], C); g.r(20, 42, 4, 1, HN.m); g.r(32, 42, 4, 1, HN.m);
        tube(g, [[36, 26, 4.5], [41, 21, 4], [45, 18, 3.6]], C, { scale: true });
        blob(g, 48, 17, 6.5, 5, C);
        g.poly([[50, 15], [60, 17], [59, 20], [50, 21]], C.m); g.poly([[50, 18], [59, 20], [50, 21]], C.d);
        spike(g, 45, 13, -Math.PI / 2 - 0.7, 7, 1.8, HN); spike(g, 48, 12, -Math.PI / 2 - 0.3, 7, 1.8, HN);
        g.r(49, 15, 2, 2, '#ff4a2a'); g.p(50, 15, '#fff2a0');
        if (fire) { g.poly([[52, 21], [61, 20], [60, 25], [53, 24]], '#5a0a0a'); g.ell(56, 22, 2.4, 1.4, '#ffd24a'); g.p(54, 24, '#fff'); g.p(58, 20, '#fff'); }
        else { g.r(51, 20, 8, 1, C.d); g.p(58, 19, C.d); }
        wing(34, 25, 1, W);   // near wing
      }, '#081a18');
    },
    // ----- living spellbook: covers flap, the eye glows while casting -----
    book(P) {
      const k = P.f % 3, cast = P.st === 'cast' ? 1 : 0;
      return mk('book' + k + cast, 44, 40, 22, 35, g => {
        const C = { d: '#5a1414', m: '#a83030', h: '#e06050' }, PG = '#f4ecd0', PGS = '#c8b890', G = '#f2c14e', GS = '#a8782a';
        const o = [-3, 0, 3][k];
        g.poly([[22, 25], [4, 17 + o], [6, 32 + o], [22, 34]], C.d); g.poly([[22, 25], [40, 17 - o], [38, 32 - o], [22, 34]], C.m);
        g.line(5, 18 + o, 21, 25, 1, C.h); g.line(39, 18 - o, 23, 25, 1, C.h);
        for (const [x, y] of [[5, 17 + o], [6, 31 + o], [39, 17 - o], [38, 31 - o]]) { g.r(x - 1, y - 1, 3, 3, G); g.p(x - 1, y - 1, '#fff2c0'); }
        g.poly([[22, 23], [7, 15 + o], [8, 29 + o], [22, 32]], PG); g.poly([[22, 23], [37, 15 - o], [36, 29 - o], [22, 32]], PGS);
        for (let i = 0; i < 3; i++) { g.poly([[22, 24], [8 + i, 16 + o + i], [9 + i, 18 + o + i]], PGS); }
        for (let i = 0; i < 4; i++) { g.line(10, 18 + i * 3 + o, 19, 24 + i * 2, 1, '#6a5a4a'); g.line(25, 24 + i * 2, 34, 18 + i * 3 - o, 1, '#8a7a5a'); }
        g.r(21, 22, 2, 12, GS);
        blob(g, 22, 20, 5, 4, { d: '#c8b8a0', m: '#fff8f0', h: '#ffffff' });
        g.ell(22, 20, 2.6, 3, cast ? '#ff3a6a' : '#8a3ad8'); g.ell(22, 20, 1, 2.2, '#1a0a14'); g.p(21, 19, '#ffffff');
        for (const x of [17, 20, 23, 26]) g.poly([[x, 33], [x + 1.5, 36], [x + 3, 33]], '#fff8f0');
        if (cast) { g.ell(22, 7, 7, 2.6, '#ff7ad0'); g.ell(22, 7, 4, 1.4, '#ffd0f0'); for (const [x, y] of [[8, 8], [36, 6], [22, 2], [12, 3], [32, 2]]) g.p(x, y, '#ffc0ff'); }
      }, '#1a0606');
    },
    // ----- wandering armour: empty plate with wisp eyes, sword swings like the skeleton's -----
    armor(P) {
      const sw = P.st === 'wind' ? 2 : P.st === 'slash' ? 1 : 0, k = P.f % 2, step = P.step || 0;
      const ka = sw === 1 ? Math.round(Math.min(1, P.k || 0) * 4) / 4 : 0;
      return mk('armor' + sw + ka + k + step, 62, 60, 26, 56, g => {
        const A = { d: '#4a5470', m: '#8a96b0', h: '#d8e0f0' }, Dk = '#181c26', Wi = '#7ad8ff', G = '#c9a24a';
        for (const [x, o] of [[17, step > 0 ? -2 : 0], [28, step < 0 ? -2 : 0]]) { bevel(g, x, 41 + o, 7, 11, A); g.r(x - 1, 51, 9, 4, Dk); bevel(g, x - 1, 51, 9, 3, A); }
        g.poly([[16, 24], [36, 24], [34, 43], [18, 43]], A.m); g.poly([[26, 24], [36, 24], [34, 43], [26, 43]], A.d); g.line(17, 26, 19, 41, 1, A.h);
        g.r(18, 36, 16, 2, G); g.r(18, 36, 16, 1, '#fff0b0'); g.poly([[22, 28], [30, 28], [26, 34]], A.d);
        for (const m of [-1, 1]) blob(g, 26 + m * 11, 25, 5.5, 4, A);
        g.r(6, 28, 10, 15, '#3a4058'); bevel(g, 7, 29, 8, 13, { d: '#3a4260', m: '#6a7690', h: '#a8b4d0' }); g.r(10, 31, 2, 9, G); g.r(8, 34, 6, 2, G);
        g.poly([[17, 9], [26, 3], [35, 9], [35, 24], [17, 24]], A.m); g.poly([[26, 3], [35, 9], [35, 24], [27, 24]], A.d); g.line(18, 10, 25, 5, 1, A.h);
        g.r(19, 14, 14, 4, Dk); g.r(21, 15, 3, 2, Wi); g.r(28, 15, 3, 2, Wi); g.p(21, 15, '#ffffff'); g.p(28, 15, '#ffffff');
        for (let y = 19; y < 23; y += 2) g.r(24, y, 4, 1, Dk);
        tube(g, [[26, 3, 1.6], [24, 0, 1.4], [20, 1, 1.2]], { d: '#2a5a9a', m: '#4a8ad8', h: '#9ac8ff' });
        const a = sw === 2 ? -2.4 : sw === 1 ? ka * 2.6 - 1.2 : -0.6 + k * 0.05;
        const hx = 39, hy = 34, dx = Math.cos(a), dy = Math.sin(a);
        g.line(hx, hy, hx + dx * 20, hy + dy * 20, 3, '#8a90a0'); g.line(hx, hy, hx + dx * 19, hy + dy * 19, 2, '#dfe6f2'); g.line(hx + dx * 3, hy + dy * 3, hx + dx * 18, hy + dy * 18, 1, '#ffffff');
        g.line(hx - dy * 4, hy + dx * 4, hx + dy * 4, hy - dx * 4, 2, G);
        blob(g, 37, 31, 4, 4, A);
      }, '#0e1018');
    },
    // ----- mimic: a treasure chest with teeth; the lid gapes before it lunges -----
    mimic(P) {
      const st = P.st === 'wind' ? 1 : P.st === 'dash' ? 2 : 0, k = P.f % 2;
      return mk('mimic' + st + k, 48, 48, 24, 44, g => {
        const W = { d: '#5a3214', m: '#a86a3a', h: '#e0a060' }, G = { d: '#a8782a', m: '#f2c14e', h: '#fff2c0' };
        const by = 28;
        bevel(g, 8, by, 32, 15, W); g.r(28, by + 1, 11, 13, W.d);
        for (let x = 12; x < 38; x += 7) g.r(x, by + 2, 1, 12, W.d);
        bevel(g, 8, by + 6, 32, 3, G); bevel(g, 8, by + 12, 32, 3, G); bevel(g, 7, by, 3, 15, G); bevel(g, 38, by, 3, 15, G);
        if (st) for (const [x, m] of [[12, -1], [36, 1]]) tube(g, [[x, by + 15, 1.6], [x + m * 3, by + 19, 1.2]], { d: '#3a1424', m: '#6a2a3a', h: '#a05a6a' });
        const open = st === 2 ? 15 : st === 1 ? 10 : 3 + k;
        g.r(9, by - open, 30, open, '#2a0610'); g.r(10, by - open + 1, 28, open - 1, '#6a1028');
        for (let x = 10; x < 37; x += 4) { g.poly([[x, by], [x + 1.5, by - 3.5], [x + 3, by]], '#fff6e0'); if (open > 4) g.poly([[x + 1, by - open], [x + 2.5, by - open + 3.5], [x + 4, by - open]], '#fff6e0'); }
        if (open > 6) { tube(g, [[24, by - 2, 2.6], [30 + k * 2, by - 6, 2], [34 + k * 2, by - 3, 1.4]], { d: '#a02848', m: '#e0507a', h: '#ff9ab8' }); }
        const ly = by - open;
        g.poly([[8, ly], [40, ly], [38, ly - 9], [10, ly - 9]], W.m); g.poly([[30, ly], [40, ly], [38, ly - 9], [30, ly - 9]], W.d); g.r(10, ly - 9, 28, 1, W.h);
        bevel(g, 8, ly - 3, 32, 3, G); bevel(g, 21, ly - 4, 6, 5, G); g.p(23, ly - 2, '#3a2a10'); g.p(24, ly - 2, '#3a2a10');
        if (open > 4) { g.r(14, ly + 2, 3, 2, '#ffe14a'); g.r(31, ly + 2, 3, 2, '#ffe14a'); g.p(15, ly + 2, '#ffffff'); g.p(32, ly + 2, '#ffffff'); }
      }, '#1a0c04');
    },
    // ----- anglerfish: drifting, with a glowing lure -----
    angler(P) {
      const k = P.f % 2;
      return mk('angler' + k, 58, 48, 29, 42, g => {
        const C = { d: '#1a2e52', m: '#2e4a7a', h: '#6a8ac0' }, F = { d: '#10203e', m: '#2a4070', h: '#5a7ab0' };
        spike(g, 10, 27, Math.PI + 0.5 - k * 0.15, 9, 4, F); spike(g, 10, 27, Math.PI - 0.5 + k * 0.15, 9, 4, F);
        spike(g, 24, 17, -Math.PI / 2 - 0.4, 8, 3, F); spike(g, 30, 16, -Math.PI / 2 - 0.2, 7, 3, F); spike(g, 26, 36, Math.PI / 2 + 0.3, 7, 3, F);
        blob(g, 28, 27, 18, 12.5, C);
        g.ell(30, 32, 12, 4.5, '#8aa0c0'); for (let x = 20; x < 40; x += 4) g.p(x, 33, '#5a6a90');
        for (const [x, y] of [[18, 22], [24, 20], [20, 28], [32, 22]]) g.p(x, y, C.h);
        g.poly([[36, 27], [51, 22], [53, 33], [38, 35]], '#140a20'); g.poly([[38, 29], [50, 25], [51, 31], [40, 33]], '#3a0a20');
        for (let i = 0; i < 4; i++) { g.poly([[39 + i * 3, 25.5 - i * 0.5], [40 + i * 3, 29], [41 + i * 3, 25 - i * 0.5]], '#ffffff'); g.poly([[39 + i * 3, 34.5], [40 + i * 3, 31], [41 + i * 3, 34.5]], '#ffffff'); }
        g.line(36, 35, 53, 33, 2, C.d);
        g.ell(37, 21, 3.6, 3.4, '#ffffff'); g.ell(38, 21, 2, 2.2, '#1a1428'); g.p(36, 20, '#ffffff');
        tube(g, [[32, 15, 1], [38, 5, 0.9], [45, 6, 0.8]], { d: '#6a4a20', m: '#a8783a', h: '#e0b070' });
        g.ell(47, 9, 4 + k * 0.6, 4 + k * 0.6, '#a89030'); g.ell(47, 9, 3, 3, '#fff27a'); g.ell(46, 8, 1.4, 1.4, '#ffffff');
      }, '#060c1a');
    },
    // ----- electric jellyfish -----
    jelly(P) {
      const k = P.f % 3;
      return mk('jelly' + k, 38, 46, 19, 42, g => {
        const C = { d: '#8a5ad0', m: '#c8a8ff', h: '#f4ecff' };
        for (let i = 0; i < 5; i++) { const x = 10 + i * 4.5, w = [0, 1.5, 0, -1.5][(i + k) % 4]; tube(g, [[x, 22, 1.2], [x + w, 30, 1], [x - w, 37, 0.8], [x + w * 0.5, 42, 0.6]], { d: '#7a4ac0', m: '#b088f0', h: '#e8d8ff' }); }
        for (let i = 0; i < 4; i++) { const x = 12 + i * 4.5 + ((k + i) % 2); g.line(x, 22, x + 1, 30, 1, '#f8f0ff'); }
        blob(g, 19, 17, 14, 11.5, C);
        g.r(5, 18, 28, 4, C.d); for (let x = 6; x < 33; x += 4) g.ell(x + 1, 22, 2, 1.4, C.m);
        g.ell(19, 15, 8, 5, '#e0ccff'); g.ell(19, 15, 5, 3, '#fff27a'); g.ell(18, 14, 2, 1.4, '#ffffff');   // glowing core
        for (const m of [-1, 1]) { g.r(19 + m * 6 - 1, 11, 2, 3, '#2a1a4a'); g.p(19 + m * 6 - 1, 11, '#ffffff'); }
        g.r(18, 19, 3, 1, '#6a3aa8');
        if (k === 1) { g.line(2, 9, 5, 13, 1, '#fff27a'); g.line(5, 13, 3, 15, 1, '#fff27a'); g.p(4, 11, '#ffffff'); }
        if (k === 2) { g.line(35, 7, 32, 11, 1, '#fff27a'); g.line(32, 11, 35, 13, 1, '#fff27a'); g.p(33, 9, '#ffffff'); }
      }, '#2a1a5a');
    },
    // ----- hellhound: the wolf body in black and red, with a burning mane -----
    hellhound(P) { return wolfish(P, 'hh', { B: '#3a1a14', S: '#24100c', H: '#6a2a1a', L: '#8a3a22', foot: '#1a0806', eye: '#ffe14a', ear: '#c8402a', fire: true }); },
    // ----- archdemon: big winged brute, slams like the golem -----
    archdemon(P) {
      const wind = P.st === 'wind' ? 1 : 0, k = P.f % 2;
      return mk('adem' + wind + k, 70, 72, 35, 68, g => {
        const C = { d: '#4a1028', m: '#8a2a4a', h: '#d0607a' }, W = { d: '#200814', m: '#3a1024', h: '#6a2a44' }, BL = { d: '#a05a40', m: '#d88a6a', h: '#f8c0a0' }, HN = { d: '#a89a70', m: '#e8dcc0', h: '#ffffff' };
        for (const m of [-1, 1]) {
          const X = v => 35 + m * (v - 35), el = [X(11), 12 - k * 2], tips = [[X(3), 6 - k * 2], [X(1), 22], [X(5), 34], [X(14), 40]];
          g.poly([[X(27), 30], el, ...tips], W.m); g.poly([[X(27), 30], el, tips[1], tips[2], tips[3]], W.d);
          g.line(X(27), 30, el[0], el[1], 2.6, '#14040c'); for (const T of tips) g.line(el[0], el[1], T[0], T[1], 1.2, '#14040c'); g.p(el[0], el[1] - 1, HN.m);
        }
        for (const x of [24, 40]) { tube(g, [[x + 3, 50, 5.5], [x + 3, 58, 5], [x + 3, 63, 4.5]], C); g.r(x - 3, 64, 13, 3, '#2a0814'); for (const c of [0, 4, 8]) g.p(x - 2 + c, 67, HN.m); }
        blob(g, 35, 40, 16, 15, C); g.ell(36, 44, 9, 8, BL.m); g.ell(34, 42, 4, 3, BL.h); for (const y of [40, 44, 48]) g.r(29, y, 13, 1, BL.d);
        blob(g, 28, 30, 6, 4.5, C); blob(g, 42, 30, 6, 4.5, C);
        const ay = wind ? -14 : k;
        for (const m of [-1, 1]) { const x0 = 35 + m * 22; tube(g, [[35 + m * 13, 32, 5.5], [35 + m * 19, 38 + ay * 0.5, 5], [x0, 44 + ay, 4.8]], C); blob(g, x0, 48 + ay, 5.5, 5.5, C); for (const c of [-3, 0, 3]) spike(g, x0 + c, 52 + ay, Math.PI / 2, 3, 1.1, HN); }
        blob(g, 35, 20, 9.5, 8.5, C);
        for (const m of [-1, 1]) tube(g, [[35 + m * 7, 15, 2.6], [35 + m * 14, 8, 2.1], [35 + m * 15, 2, 1.2]], HN);
        for (const m of [-1, 1]) { g.poly([[35 + m * 8, 19], [35 + m * 3, 20], [35 + m * 8, 21]], '#ffe14a'); g.line(35 + m * 2, 17, 35 + m * 9, 16, 1.2, '#2a0814'); }
        g.ell(35, 25, 5, 2.4, '#2a0814'); for (const x of [32, 35, 38]) g.poly([[x - 1, 24], [x, 27], [x + 1, 24]], '#ffffff');
      }, '#1a0410');
    },
    // ----- fairy: butterfly wings, petal dress, a star wand; sparkle dust trails below -----
    fairy(P) {
      const k = P.f % 3;
      return mk('fairy' + k, 44, 42, 22, 38, g => {
        const W = { d: '#a050c8', m: '#f0b0ff', h: '#fff4ff' }, W2 = { d: '#5a8ad8', m: '#a8e0ff', h: '#ffffff' }, Sk = '#ffe0d0', SkS = '#f0b0a0', Hr = { d: '#c02a80', m: '#ff70c0', h: '#ffc8ea' };
        const o = [-3, 0, 3][k];
        // wings: big upper lobes and small lower lobes, eye-spots, translucent edge
        for (const m of [-1, 1]) {
          const X = v => 22 + m * v;
          g.poly([[X(2), 18], [X(12), 4 + o], [X(20), 6 + o], [X(18), 15 + o * 0.5], [X(6), 21]], W.d);
          g.poly([[X(3), 18], [X(12), 6 + o], [X(18), 8 + o], [X(16), 14 + o * 0.5], [X(6), 20]], W.m);
          g.ell(X(12), 10 + o * 0.8, 2.6, 2.4, W2.m); g.ell(X(12), 10 + o * 0.8, 1.2, 1.2, '#ffffff');
          g.poly([[X(3), 21], [X(14), 22 - o * 0.4], [X(14), 29 - o * 0.4], [X(7), 27]], W2.d);
          g.poly([[X(4), 22], [X(13), 23 - o * 0.4], [X(12), 27 - o * 0.4], [X(7), 26]], W2.m);
          g.line(X(3), 19, X(15), 8 + o, 1, W.h);
        }
        // legs + petal skirt
        g.r(19, 30, 1, 5, Sk); g.r(23, 30, 1, 4, SkS); g.p(19, 35, '#ff70c0'); g.p(23, 34, '#ff70c0');
        for (const [x, c] of [[15, '#ff9ad8'], [19, '#ffc0ea'], [23, '#ff9ad8'], [27, '#e070c0']]) g.poly([[22, 22], [x - 3, 31], [x, 33], [x + 3, 31]], c);
        g.ell(22, 23, 4, 3.5, '#7ad890'); g.r(19, 24, 7, 1, '#4aa868'); g.p(20, 22, '#c8ffd8');
        // arms + star wand
        g.line(18, 22, 14, 25, 1.2, Sk); g.line(26, 22, 31, 19, 1.2, Sk); g.line(31, 19, 34, 12, 1, '#f2c14e');
        g.poly([[34, 7], [35, 10], [38, 10], [35.5, 12], [36.5, 15], [34, 13], [31.5, 15], [32.5, 12], [30, 10], [33, 10]], '#ffe14a'); g.p(34, 10, '#ffffff');
        // head: big eyes, pink hair with a bun and a leaf clip
        g.ell(22, 14, 6, 5.6, Sk); g.ell(24, 16, 3, 2.6, SkS);
        blob(g, 22, 10, 7, 4.4, Hr); g.poly([[15, 10], [16, 18], [18, 12]], Hr.m); g.poly([[29, 10], [28, 18], [26, 12]], Hr.d);
        blob(g, 22, 4, 3, 2.6, Hr); g.poly([[25, 6], [29, 4], [27, 8]], '#5ac878');
        g.r(18, 14, 2, 3, '#3a1438'); g.r(24, 14, 2, 3, '#3a1438'); g.p(18, 14, '#ffffff'); g.p(24, 14, '#ffffff'); g.p(19, 16, '#c870ff'); g.p(25, 16, '#c870ff');
        g.p(17, 17, '#ffa0b0'); g.p(27, 17, '#ffa0b0'); g.r(21, 18, 2, 1, '#c84a6a');
        // sparkle dust
        for (const [x, y] of [[14 + k * 3, 38], [28 - k * 2, 36], [21, 40 - k]]) { g.p(x, y, '#ffffff'); g.p(x - 1, y, '#ffb0f0'); g.p(x + 1, y, '#ffb0f0'); }
      }, '#3a1438');
    },
    // ----- baku: the dream-eating tapir. Two-tone hide, moon mark, trunk; it puffs up before blowing dream bubbles -----
    baku(P) {
      const sw = P.st === 'swell' ? 1 : 0, step = P.step || 0, k = P.f % 2;
      return mk('baku' + sw + step + k, 60, 50, 30, 46, (g, x) => {
        const D = { d: '#1e1436', m: '#3a2a62', h: '#6a58a0' }, L = { d: '#a89ac8', m: '#e4dcf4', h: '#ffffff' }, G = '#f2c14e', P2 = '#ff9ad8';
        const inf = sw ? 3 : 0;
        // legs (stubby, dark socks)
        for (const [x, o, c] of [[14, step > 0 ? -2 : 0, D], [22, step < 0 ? -2 : 0, D], [36, step < 0 ? -2 : 0, D], [44, step > 0 ? -2 : 0, D]]) { tube(g, [[x, 34 + o, 3.6], [x, 41 + o, 3.4]], c); g.r(x - 3, 43 + o, 7, 2, '#120a22'); g.p(x - 2, 43 + o, D.h); }
        // body: dark fore- and hindquarters, a pale saddle round the middle
        blob(g, 30, 30, 21 + inf, 12 + inf * 0.7, D);
        x.save(); x.globalCompositeOperation = 'source-atop';   // the pale saddle, kept inside the body outline
        g.ell(30, 26, 12, 17, L.d); g.ell(29, 25, 10.5, 16, L.m); g.ell(25, 21, 3, 4, L.h);
        x.restore();
        for (const [x, y] of [[26, 26], [33, 33], [28, 36]]) { g.p(x, y, '#c0b0e8'); g.p(x + 1, y, '#ffffff'); }   // starry dapples
        g.poly([[9, 26], [4, 22], [5, 28]], D.m); g.p(4, 22, D.h);   // tuft tail
        // head with drooping trunk; the trunk lifts and puffs when it swells
        blob(g, 47, 24, 9.5, 8.5, D);
        g.poly([[42, 16], [43, 9], [47, 15]], D.m); g.poly([[43, 15], [43.5, 11], [45.5, 15]], P2);
        const tr = sw ? [[54, 25, 3.6], [58, 21, 3], [59, 15, 2.6]] : [[54, 27, 3.6], [57, 32, 3], [56, 37, 2.4]];
        tube(g, tr, D); const tt = tr[tr.length - 1]; g.ell(tt[0], tt[1], 2.2, 1.6, '#120a22'); g.p(tt[0], tt[1], P2);
        // sleepy eye (half closed), the moon mark on the brow
        g.r(47, 22, 5, 1, '#0a0614'); g.poly([[47, 23], [52, 23], [50, 25]], sw ? '#ffe14a' : '#8a7ac8'); g.p(49, 23, '#ffffff');
        g.ell(47, 17, 3, 3, G); g.ell(48.4, 16.4, 2.4, 2.4, D.m); g.p(45, 17, '#fff2c0');
        g.p(50, 28, P2); g.p(42, 28, P2);
        if (sw) for (const [x, y, r] of [[58, 9, 2.6], [53, 5, 1.8], [59, 3, 1.2]]) { g.x.strokeStyle = '#ffd0ff'; g.x.lineWidth = 1; g.x.beginPath(); g.x.arc(x, y, r, 0, 7); g.x.stroke(); g.p(Math.round(x - r * 0.4), Math.round(y - r * 0.4), '#ffffff'); }
        if (!sw && k) { g.r(49, 8, 3, 1, '#c8b8ff'); g.p(51, 7, '#c8b8ff'); g.r(49, 6, 3, 1, '#c8b8ff'); }   // a little "z"
      }, '#0e0818');
    },
    // ----- gargoyle: a stone demon. Perched it is a statue (wings wrapped, eyes dark); awake it spreads its wings -----
    gargoyle(P) {
      const perch = P.perch ? 1 : 0, st = perch ? 0 : P.st === 'wind' ? 1 : P.st === 'dash' ? 2 : 0, k = P.f % 2;
      return mk('garg' + perch + st + k, 60, 54, 30, 50, (g, x) => {
        const S = { d: '#4a4a52', m: '#8a8a94', h: '#c8c8d0' }, SD = { d: '#30303a', m: '#5a5a66', h: '#9a9aa8' }, E = perch ? '#2a2a30' : '#ff8a2a', HN = { d: '#5a5a62', m: '#b0b0b8', h: '#e8e8f0' };
        const crack = (x0, y0, pts) => { let px = x0, py = y0; for (const [dx, dy] of pts) { g.line(px, py, px + dx, py + dy, 1, '#26262c'); px += dx; py += dy; } };
        // wings
        if (perch) {
          for (const m of [-1, 1]) { const X = v => 30 + m * v; g.poly([[X(6), 14], [X(17), 8], [X(19), 22], [X(15), 40], [X(8), 44]], SD.m); g.poly([[X(12), 11], [X(17), 8], [X(19), 22], [X(15), 40], [X(12), 42]], SD.d); g.line(X(7), 15, X(17), 9, 1.4, SD.h); }
        } else {
          const up = st === 2 ? -8 : st === 1 ? 4 : k * 3;
          for (const m of [-1, 1]) {
            const X = v => 30 + m * v, el = [X(16), 10 + up], tips = [[X(29), 4 + up], [X(29), 18 + up * 0.6], [X(25), 28 + up * 0.3], [X(17), 32]];
            g.poly([[X(8), 22], el, ...tips], SD.m); g.poly([[X(8), 22], el, tips[1], tips[2], tips[3]], SD.d);
            g.line(X(8), 22, el[0], el[1], 2, S.d); for (const T of tips) g.line(el[0], el[1], T[0], T[1], 1, S.d); g.p(el[0], el[1] - 1, S.h);
          }
        }
        // crouched legs with talons
        for (const m of [-1, 1]) { tube(g, [[30 + m * 6, 36, 4.5], [30 + m * 10, 42, 3.8], [30 + m * 8, 47, 3]], S); for (const c of [-2, 1, 4]) spike(g, 30 + m * 8 + c * m, 49, Math.PI / 2, 2.6, 1, HN); }
        if (perch) bevel(g, 14, 49, 32, 4, SD);   // the plinth it sits on as a statue
        // body
        blob(g, 30, 30, 10.5, 10, S); g.ell(31, 33, 6, 5, SD.m); for (const y of [30, 33, 36]) g.r(27, y, 8, 1, S.d);
        // arms: claws forward when it pounces
        const ay = st === 2 ? -6 : st === 1 ? 2 : 0;
        for (const m of [-1, 1]) { tube(g, [[30 + m * 8, 25, 3.4], [30 + m * 12, 31 + ay, 3], [30 + m * 10, 36 + ay, 2.6]], S); for (const c of [-2, 0, 2]) spike(g, 30 + m * 10 + c, 38 + ay, Math.PI / 2 + m * 0.2, 3, 0.9, HN); }
        // head: horns, brow, fangs
        blob(g, 30, 17, 8.5, 7.5, S);
        for (const m of [-1, 1]) { tube(g, [[30 + m * 5, 12, 2.2], [30 + m * 10, 6, 1.6], [30 + m * 9, 1, 0.8]], HN); g.poly([[30 + m * 8, 15], [30 + m * 13, 12], [30 + m * 10, 18]], S.m); }
        g.r(24, 15, 12, 2, S.d);
        for (const m of [-1, 1]) { g.r(30 + m * 4 - 1, 17, 3, 2, E); if (!perch) g.p(30 + m * 4, 17, '#fff2a0'); }
        g.r(26, 21, 8, 2, '#1e1e24'); g.p(27, 21, '#e8e8f0'); g.p(32, 21, '#e8e8f0');
        // cracks and moss
        crack(23, 27, [[2, 2], [-1, 3], [2, 2]]); crack(36, 13, [[-2, 2], [1, 2]]);
        g.p(25, 39, '#5a7a3a'); g.p(26, 39, '#7a9a4a'); g.p(35, 13, '#5a7a3a');
        if (!perch && st === 1) for (const m of [-1, 1]) g.p(30 + m * 4, 15, '#ffd080');
      }, '#16161c');
    },
    // ----- angel soldier: white-gold plate, feathered wings, a halo, and a halberd -----
    angel(P) {
      const sw = P.st === 'wind' ? 2 : P.st === 'slash' ? 1 : 0, k = P.f % 2;
      const ka = sw === 1 ? Math.round(Math.min(1, P.k || 0) * 4) / 4 : 0;
      return mk('angel' + sw + ka + k, 66, 64, 30, 58, g => {
        const A = { d: '#a89a70', m: '#f0e8d0', h: '#ffffff' }, B = { d: '#5a6a9a', m: '#8aa0d8', h: '#d8e4ff' }, G = '#f2c14e', GD = '#b08a2a', FW = { m: '#ffffff', d: '#c8d0e8', tip: '#e8f0ff' }, FW2 = { m: '#e8ecf8', d: '#a8b0c8' };
        // wings behind, a little lifted on the wind-up
        const lift = sw === 2 ? -0.25 : k * 0.08;
        for (const m of [-1, 1]) {
          const bx = 30 + m * 7, by = 26;
          for (let i = 0; i < 5; i++) { const a = (m > 0 ? 0 : Math.PI) + m * (-0.95 + i * 0.36 + lift); feather(g, bx, by, a, 22 - i * 2, 3.2, i % 2 ? FW2 : FW); }
          for (let i = 0; i < 3; i++) { const a = (m > 0 ? 0 : Math.PI) + m * (-0.4 + i * 0.4 + lift); feather(g, bx + m * 2, by + 1, a, 11, 2.6, FW); }
        }
        // legs: greaves, hovering (no ground contact - a soft light below)
        g.ell(30, 58, 10, 2.4, 'rgba(255,240,170,0.75)');
        for (const [x, o] of [[24, 0], [32, -k]]) { bevel(g, x, 42 + o, 7, 10, A); g.r(x - 1, 51 + o, 9, 3, GD); bevel(g, x - 1, 51 + o, 9, 2, { d: GD, m: G, h: '#fff2c0' }); }
        // skirt of plates + blue tabard
        g.poly([[20, 36], [40, 36], [43, 46], [17, 46]], A.m); g.poly([[30, 36], [40, 36], [43, 46], [30, 46]], A.d);
        g.poly([[27, 30], [33, 30], [34, 49], [30, 52], [26, 49]], B.m); g.line(27, 31, 27, 48, 1, B.h); g.r(28, 40, 4, 2, G);
        // chest plate
        g.poly([[21, 22], [39, 22], [37, 37], [23, 37]], A.m); g.poly([[30, 22], [39, 22], [37, 37], [30, 37]], A.d); g.line(22, 23, 24, 35, 1, A.h);
        g.poly([[26, 25], [34, 25], [30, 31]], G); g.p(29, 26, '#fff2c0');
        for (const m of [-1, 1]) { blob(g, 30 + m * 10, 23, 5, 3.6, A); g.r(30 + m * 10 - 4, 25, 8, 1, G); }
        // helm with a T visor; wings on the helm
        g.poly([[23, 9], [30, 4], [37, 9], [37, 20], [23, 20]], A.m); g.poly([[30, 4], [37, 9], [37, 20], [30, 20]], A.d); g.line(24, 10, 29, 6, 1, A.h);
        g.r(25, 12, 10, 2, '#1a1a2a'); g.r(29, 12, 2, 6, '#1a1a2a'); g.r(26, 12, 3, 1, '#9ad8ff'); g.r(31, 12, 3, 1, '#9ad8ff');
        for (const m of [-1, 1]) feather(g, 30 + m * 7, 10, -Math.PI / 2 - m * 1.0, 7, 1.6, FW);
        g.r(23, 19, 14, 2, G);
        // halo
        g.x.strokeStyle = '#ffe680'; g.x.lineWidth = 1.6; g.x.beginPath(); g.x.ellipse(30, 1.5, 7, 1.6, 0, 0, 7); g.x.stroke();
        // halberd (swung like the skeleton's blade)
        const a = sw === 2 ? -2.5 : sw === 1 ? ka * 2.7 - 1.25 : -0.55 + k * 0.05;
        const hx = 44, hy = 32, dx = Math.cos(a), dy = Math.sin(a);
        g.line(hx - dx * 8, hy - dy * 8, hx + dx * 22, hy + dy * 22, 1.8, '#8a6a3a');
        const tx = hx + dx * 22, ty = hy + dy * 22, nx = -dy, ny = dx;
        g.poly([[tx, ty], [tx + dx * 7, ty + dy * 7], [tx + nx * 5 + dx * 2, ty + ny * 5 + dy * 2], [tx + nx * 6 - dx * 3, ty + ny * 6 - dy * 3]], '#e8ecf4');
        g.line(tx, ty, tx + dx * 7, ty + dy * 7, 1, '#ffffff'); g.poly([[tx - nx * 1, ty - ny * 1], [tx - nx * 4 - dx * 1, ty - ny * 4 - dy * 1], [tx - dx * 3, ty - dy * 3]], G);
        blob(g, hx, hy, 3.2, 3.2, A);
      }, '#2a2418');
    },
    // ----- chaos beast: a shard-backed void creature with three eyes; its maw glows before the breath -----
    chaosbeast(P) {
      const st = P.st === 'wind' ? 1 : P.st === 'fire' ? 2 : 0, step = P.step || 0, k = P.f % 2;
      return mk('chaos' + st + step + k, 72, 58, 34, 54, (g, x) => {
        const C = { d: '#1a0a2a', m: '#3e1a62', h: '#7a4ab0' }, CR = { d: '#6a1a9a', m: '#c050ff', h: '#ffd0ff' }, V = '#ff4ad8', VH = '#ffd0f4', Dk = '#0a0412';
        // tentacle tail
        tube(g, [[14, 34, 4], [7, 30 + k * 2, 3], [4, 22 + k * 3, 2.2], [8, 16 + k * 2, 1.4]], C); g.ell(8, 15 + k * 2, 2.4, 2.4, V); g.p(8, 14 + k * 2, VH);
        // back legs
        for (const [lx, o] of [[18, step > 0 ? -2 : 0], [26, step < 0 ? -2 : 0]]) { tube(g, [[lx, 36, 5], [lx - 2, 44 + o, 4], [lx, 50 + o, 3.4]], C); for (const c of [-3, 0, 3]) spike(g, lx + c, 52 + o, Math.PI / 2, 2.4, 1, CR); }
        // body
        blob(g, 32, 34, 20, 13, C);
        // void cracks glowing in the hide
        for (const pts of [[[22, 30], [27, 34], [25, 39]], [[36, 28], [40, 33], [44, 32]], [[30, 40], [34, 43]]]) { for (let i = 1; i < pts.length; i++) { g.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 2, '#6a0a6a'); g.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 1, V); } }
        // crystal shards along the spine
        for (let i = 0; i < 5; i++) { const sx = 18 + i * 6, sl = 7 + ((i + k) % 3) * 2 + (st ? 2 : 0); spike(g, sx, 23 - Math.sin(i / 4 * Math.PI) * 2, -Math.PI / 2 - 0.35 + i * 0.12, sl, 2.2, CR); }
        // front legs
        for (const [lx, o] of [[40, step < 0 ? -2 : 0], [48, step > 0 ? -2 : 0]]) { tube(g, [[lx, 36, 5], [lx + 1, 44 + o, 4], [lx, 50 + o, 3.4]], C); for (const c of [-3, 0, 3]) spike(g, lx + c, 52 + o, Math.PI / 2, 2.4, 1, CR); }
        // head: low and wide, three eyes, the maw opens to a void glow
        const hy = st === 1 ? 27 : 25, open = st === 2 ? 7 : st === 1 ? 4 : 1;
        blob(g, 56, hy, 11, 9, C);
        for (const m of [-1, 1]) spike(g, 56 + m * 5, hy - 7, -Math.PI / 2 + m * 0.6, 8, 2, CR);
        g.poly([[58, hy + 2], [70, hy + 1], [69, hy + 3 + open], [58, hy + 5 + open]], Dk);
        if (open > 2) { g.ell(64, hy + 3 + open / 2, 4, open / 2, V); g.ell(64, hy + 3 + open / 2, 2, open / 4 + 0.5, VH); }
        for (let xx = 59; xx < 69; xx += 3) { g.poly([[xx, hy + 2], [xx + 1, hy + 5], [xx + 2, hy + 2]], '#f0e0ff'); g.poly([[xx, hy + 5 + open], [xx + 1, hy + 2 + open], [xx + 2, hy + 5 + open]], '#f0e0ff'); }
        for (const [ex, ey, r] of [[56, hy - 3, 2.2], [61, hy - 2, 1.8], [52, hy - 1, 1.6]]) { g.ell(ex, ey, r + 0.8, r + 0.6, Dk); g.ell(ex, ey, r, r * 0.8, st ? '#ffffff' : V); g.p(Math.round(ex), Math.round(ey), st ? V : '#ffffff'); }
        if (st === 1) for (const [px, py] of [[66, 14], [70, 20], [62, 12]]) { g.p(px, py, V); g.p(px + 1, py + 1, VH); }
      }, '#08020e');
    },
    // ----- harpy: a bird-woman; wings for arms, talons, a wild red mane. Dives at you -----
    harpy(P) {
      const st = P.st === 'wind' ? 1 : P.st === 'dash' ? 2 : 0, k = P.f % 3;
      return mk('harpy' + st + k, 56, 48, 28, 44, g => {
        const F = { m: '#3a9a8a', d: '#1e5a52', tip: '#f2c14e' }, F2 = { m: '#5ac0b0', d: '#2a7a6a', tip: '#ffffff' }, Sk = '#f0c8a8', SkS = '#d09878', Hr = { d: '#8a1e2a', m: '#d8404a', h: '#ff8a8a' }, Tl = { d: '#7a5a2a', m: '#c8a050', h: '#f0d890' };
        const up = st === 1 ? -0.55 : st === 2 ? 0.55 : [-0.25, 0, 0.25][k];
        for (const m of [-1, 1]) {   // wing-arms
          const sx = 28 + m * 6, sy = 22;
          for (let i = 0; i < 6; i++) { const a = (m > 0 ? 0 : Math.PI) + m * (-0.75 + i * 0.3 + up); feather(g, sx, sy, a, 20 - i * 1.6, 3.2, i % 2 ? F : F2); }
        }
        // tail feathers
        for (let i = 0; i < 3; i++) feather(g, 28, 32, Math.PI / 2 + (i - 1) * 0.35, 10, 2.4, i === 1 ? F2 : F);
        // bird legs with talons (reach forward in the dive)
        const ly = st === 2 ? -2 : 0;
        for (const m of [-1, 1]) { g.line(28 + m * 3, 30, 28 + m * 5, 37 + ly, 1.6, Tl.m); for (const c of [-2, 0, 2]) spike(g, 28 + m * 5 + c, 38 + ly, Math.PI / 2 + c * 0.2, 3, 0.8, Tl); }
        // body: feathered chest
        blob(g, 28, 26, 6.5, 7, { d: F.d, m: F2.m, h: '#a8f0e0' });
        g.ell(28, 21, 3, 1.6, Sk);
        // head: face, mane
        g.poly([[20, 10], [28, 4], [36, 10], [38, 22], [33, 16], [23, 16], [18, 22]], Hr.m); g.poly([[28, 4], [36, 10], [38, 22], [33, 16], [28, 14]], Hr.d);
        g.ell(28, 13, 5.5, 5.5, Sk); g.ell(30, 15, 3, 3, SkS);
        g.poly([[22, 8], [28, 5], [34, 8], [30, 9], [26, 9]], Hr.h);
        const E = st ? '#ffe14a' : '#2a1420';
        g.r(25, 12, 2, 2, E); g.r(30, 12, 2, 2, E); if (st) { g.p(25, 12, '#ffffff'); g.p(30, 12, '#ffffff'); }
        g.line(24, 11, 27, 12, 1, Hr.d); g.line(33, 11, 30, 12, 1, Hr.d);
        g.r(27, 16, 3, 1, st ? '#8a1a2a' : '#b05050');
      }, '#10201c');
    },
    // ----- crossbow soldier of the dark fortress: iron helm, red tabard, a heavy crossbow -----
    crossbow(P) {
      const aim = P.st === 'aim' ? 1 : 0, step = P.step || 0, k = P.f % 2;
      return mk('xbow' + aim + step + k, 50, 48, 22, 44, g => {
        const I = { d: '#2a2e3a', m: '#4e5468', h: '#8a92a8' }, Rd = { d: '#4a0e14', m: '#8a1e24', h: '#c84a4a' }, Wd = '#6a4020', WdS = '#4a2a14';
        for (const [x, o] of [[16, step > 0 ? -2 : 0], [23, step < 0 ? -2 : 0]]) { bevel(g, x, 33 + o, 5, 8, I); g.r(x - 1, 40 + o, 7, 3, '#14161c'); }
        g.poly([[14, 20], [30, 20], [31, 36], [13, 36]], I.m); g.poly([[22, 20], [30, 20], [31, 36], [22, 36]], I.d);
        for (let y = 22; y < 35; y += 2) for (let x = 15 + (y % 4 ? 1 : 0); x < 30; x += 2) g.p(x, y, I.h);   // chainmail glints
        g.poly([[17, 20], [27, 20], [26, 38], [22, 41], [18, 38]], Rd.m); g.poly([[22, 20], [27, 20], [26, 38], [22, 41]], Rd.d); g.r(20, 26, 4, 4, '#1a1a22'); g.p(21, 27, '#c8c8d8');
        g.r(13, 30, 18, 2, '#2a1a10'); g.r(20, 30, 3, 2, '#c9a24a');
        for (const m of [-1, 1]) blob(g, 22 + m * 8, 21, 4, 3, I);
        // helm with eye slit
        g.poly([[15, 8], [22, 3], [29, 8], [29, 19], [15, 19]], I.m); g.poly([[22, 3], [29, 8], [29, 19], [22, 19]], I.d); g.line(16, 9, 21, 5, 1, I.h);
        g.r(16, 12, 13, 2, '#0a0a10'); g.r(23, 12, 3, 2, aim ? '#ff4a3a' : '#a02a2a'); g.r(21, 15, 2, 4, '#0a0a10');
        g.poly([[21, 3], [22, 0], [23, 3]], '#c84a4a');
        // crossbow: held low, or levelled at you
        const cy = aim ? 24 : 30, cx = aim ? 30 : 28;
        g.r(cx, cy - 1, 16, 3, Wd); g.r(cx, cy - 1, 16, 1, '#8a6030');
        g.line(cx + 12, cy - 7, cx + 14, cy + 7, 2, WdS); g.line(cx + 12, cy - 7, cx + 6, cy, 1, '#c8c0a0'); g.line(cx + 14, cy + 7, cx + 6, cy, 1, '#c8c0a0');
        if (aim) { g.r(cx + 4, cy, 14, 1, '#d8d8e0'); g.poly([[cx + 18, cy - 1.5], [cx + 21, cy + 0.5], [cx + 18, cy + 2.5]], '#e8e8f0'); }
        blob(g, cx + 1, cy + 1, 2.6, 2.6, I);
      }, '#0c0e14');
    },
    // ----- clockwork soldier: a brass wind-up toy. Winds up, spins with its blades out, then gets dizzy -----
    clockwork(P) {
      const st = P.st === 'wind' ? 1 : P.st === 'spin' ? 2 : P.st === 'dizzy' ? 3 : 0, k = P.f % 4, step = P.step || 0;
      return mk('clock' + st + k + (st ? 0 : step), 52, 54, 26, 50, g => {
        const B = { d: '#7a4a1a', m: '#c8902a', h: '#ffe08a' }, Rd = { d: '#6a1414', m: '#b02a2a', h: '#e86a5a' }, Bl = { d: '#6a7080', m: '#c8d0dc', h: '#ffffff' }, Dk = '#1a1210';
        const tilt = st === 3 ? 2 : 0;
        // legs on a little wheel base
        if (st !== 2) for (const [x, o] of [[20, step > 0 ? -2 : 0], [28, step < 0 ? -2 : 0]]) { bevel(g, x, 38 + o, 5, 7, B); g.r(x - 1, 44 + o, 7, 3, Dk); }
        else { g.ell(26, 45, 9, 3, B.d); g.ell(26, 44, 7, 2, B.m); }
        // body: a red drum with brass bands
        bevel(g, 16, 22, 21, 17, Rd); g.r(16, 25, 21, 2, B.m); g.r(16, 34, 21, 2, B.m); g.r(16, 25, 21, 1, B.h);
        for (const x of [19, 26, 33]) { g.r(x, 29, 2, 2, B.m); g.p(x, 29, B.h); }
        // wind-up key on the back (turns while winding)
        const ka = st === 1 ? k * Math.PI / 4 : st === 2 ? k * Math.PI / 2 : 0;
        g.r(36, 28, 5, 2, B.d); for (const s of [-1, 1]) g.ell(43 + Math.cos(ka) * s * 0.4, 29 + Math.sin(ka) * s * 5, 2.6, Math.abs(Math.cos(ka)) * 2.6 + 1, B.m);
        // arms with blades: tucked, raised, or flung out in the spin
        if (st === 2) for (const m of [-1, 1]) { const a = k * Math.PI / 2 + (m > 0 ? 0 : Math.PI); g.line(26, 30, 26 + Math.cos(a) * 24, 30 + Math.sin(a) * 8, 3, Bl.d); g.line(26, 30, 26 + Math.cos(a) * 23, 30 + Math.sin(a) * 8, 1.6, Bl.h); for (let i = 0; i < 3; i++) g.p(26 + Math.round(Math.cos(a + 0.4 + i * 0.2) * 20), 30 + Math.round(Math.sin(a + 0.4 + i * 0.2) * 7), '#fff6c0'); }
        else for (const m of [-1, 1]) { const ry = st === 1 ? -5 : 0; tube(g, [[26 + m * 11, 25, 2.6], [26 + m * 14, 31 + ry, 2.2]], B); g.line(26 + m * 14, 31 + ry, 26 + m * 18, 22 + ry, 2.4, Bl.m); g.line(26 + m * 14, 31 + ry, 26 + m * 18, 22 + ry, 1, Bl.h); }
        // head: painted face, tall hat
        blob(g, 26 + tilt, 15, 7.5, 7, { d: '#c8a890', m: '#f4e0d0', h: '#ffffff' });
        g.p(23 + tilt, 14, Dk); g.p(29 + tilt, 14, Dk); g.ell(22 + tilt, 17, 1.4, 1, '#f09090'); g.ell(30 + tilt, 17, 1.4, 1, '#f09090');
        if (st === 3) { g.line(22 + tilt, 13, 24 + tilt, 15, 1, Dk); g.line(24 + tilt, 13, 22 + tilt, 15, 1, Dk); g.line(28 + tilt, 13, 30 + tilt, 15, 1, Dk); g.line(30 + tilt, 13, 28 + tilt, 15, 1, Dk); g.ell(26 + tilt, 19, 1.6, 1.2, Dk); }
        else g.r(25 + tilt, 18, 3, 1, '#a03030');
        bevel(g, 20 + tilt, 1, 12, 8, { d: '#1a1a2a', m: '#2a2a44', h: '#4a4a6a' }); g.r(18 + tilt, 8, 16, 2, '#2a2a44'); g.r(20 + tilt, 6, 12, 1, B.m);
        if (st === 3) for (let i = 0; i < 3; i++) { const a = k * 0.8 + i * 2.1, x = 26 + Math.cos(a) * 11, y = 3 + Math.sin(a) * 3; g.p(Math.round(x), Math.round(y), '#ffe14a'); g.p(Math.round(x) + 1, Math.round(y), '#fff6c0'); }
      }, '#140c08');
    },
    // ----- star spirit: a five-pointed star with a face and a comet tail; it scatters starlight -----
    starspirit(P) {
      const cast = P.st === 'cast' ? 1 : 0, k = P.f % 3;
      return mk('star' + 'sp' + cast + k, 46, 48, 23, 44, g => {
        const Y = { d: '#c8901a', m: '#ffd84a', h: '#fffbe0' }, T = ['#9a8aff', '#c8bcff', '#eee8ff'];
        // comet tail
        for (let i = 0; i < 7; i++) { const t = i / 6; g.ell(21 - t * 9 + Math.sin(k + t * 3) * 1.5, 28 + t * 14, 5 - t * 3.8, 3 - t * 2, T[i % 3]); if (i % 2) g.p(Math.round(19 - t * 9), Math.round(27 + t * 14), '#ffffff'); }
        const R = cast ? 15 : 13.5, pts = [], rot = (k - 1) * 0.06;
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + rot + i * Math.PI / 5, r = i % 2 ? R * 0.48 : R; pts.push([23 + Math.cos(a) * r, 21 + Math.sin(a) * r]); }
        g.poly(pts, Y.d); g.poly(pts.map(([x, y]) => [23 + (x - 23) * 0.82 - 0.6, 20.5 + (y - 21) * 0.82]), Y.m); g.poly(pts.slice(0, 4).map(([x, y]) => [23 + (x - 23) * 0.5 - 1, 19 + (y - 21) * 0.5]), Y.h);
        // face
        g.r(19, 19, 2, 3, '#4a2a10'); g.r(25, 19, 2, 3, '#4a2a10'); g.p(19, 19, '#ffffff'); g.p(25, 19, '#ffffff');
        g.ell(17, 24, 1.6, 1, '#ff9ab0'); g.ell(29, 24, 1.6, 1, '#ff9ab0');
        if (cast) g.ell(23, 25, 2, 1.6, '#8a3a2a'); else g.r(21, 24, 4, 1, '#8a3a2a');
        // orbiting sparkles
        for (let i = 0; i < 3; i++) { const a = k * 0.7 + i * 2.1, x = 23 + Math.cos(a) * 19, y = 21 + Math.sin(a) * 8; g.p(Math.round(x), Math.round(y), '#ffffff'); g.p(Math.round(x) - 1, Math.round(y), '#fff2a0'); g.p(Math.round(x) + 1, Math.round(y), '#fff2a0'); }
        if (cast) for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 0.4; g.line(23 + Math.cos(a) * 17, 21 + Math.sin(a) * 17, 23 + Math.cos(a) * 21, 21 + Math.sin(a) * 21, 1, '#fffbe0'); }
      }, '#4a2a08');
    },
    // ----- fire spirit: a living flame with a face; it streaks at you and leaves fire behind -----
    fireelem(P) {
      const st = P.st === 'wind' ? 1 : P.st === 'dash' ? 2 : 0, k = P.f % 3;
      return mk('fel' + st + k, 44, 50, 22, 46, g => {
        const C = ['#a01a08', '#ff5a1a', '#ffa02a', '#ffe060', '#fffbe0'], o = [-2, 0, 2][k], s2 = st === 2 ? 1 : 0, swell = st === 1 ? 2 : 0;
        // tongues of flame rising from the body (lean back while it streaks)
        for (let i = 0; i < 5; i++) { const x = 13 + i * 4.5, h = 14 + ((i + k) % 3) * 4 + swell, lean = s2 ? 6 : o * 0.5; g.poly([[x - 4, 26], [x + lean, 26 - h], [x + 4, 26]], i % 2 ? C[1] : C[0]); }
        g.ell(22, 30, 12 + swell, 13 + swell, C[0]); g.ell(22, 30, 10.5 + swell, 11.5 + swell, C[1]); g.ell(21, 31, 8 + swell, 8.5 + swell, C[2]);
        for (let i = 0; i < 3; i++) { const x = 15 + i * 7; g.poly([[x - 3, 24], [x + o * 0.4, 14 - (i % 2) * 3], [x + 3, 24]], C[2]); }
        g.ell(22, 33, 4.5, 4, C[3]); g.ell(21, 32, 2, 2, C[4]);   // core
        // face
        const E = st ? '#ffffff' : '#3a0a04';
        g.poly([[15, 26], [20, 27], [16, 29]], '#3a0a04'); g.poly([[29, 26], [24, 27], [28, 29]], '#3a0a04'); g.p(17, 27, E); g.p(27, 27, E);
        if (st) g.ell(22, 37, 3, 2, '#3a0a04'); else g.r(20, 36, 4, 1, '#3a0a04');
        // embers
        for (let i = 0; i < 3; i++) g.p(10 + ((i * 13 + k * 5) % 24), 8 + ((i * 7 + k * 3) % 10), C[3]);
        if (s2) for (let i = 0; i < 4; i++) g.r(4 + i * 2, 30 + i * 3, 4, 1, C[2]);
      }, '#3a0804');
    },
    // ----- ghost pirate: tricorn hat, beard, a flintlock that fires slow cannonballs -----
    ghostpirate(P) {
      const aim = P.st === 'aim' ? 1 : 0, k = P.f % 2;
      return mk('gpir' + aim + k, 52, 52, 24, 48, g => {
        const G = { d: '#2a6a6a', m: '#5ac0b0', h: '#b8fff0' }, Ct = { d: '#14304a', m: '#24507a', h: '#4a80b0' }, Au = '#c9a24a', Bk = '#0e1a1a';
        // ghostly tail instead of legs
        for (let i = 0; i < 4; i++) { const t = i / 3; g.ell(24 + Math.sin(k * 2 + t * 4) * 2 - t * 3, 38 + t * 7, 7 - t * 4.5, 3.4 - t * 1.6, i % 2 ? G.m : G.d); }
        // coat
        g.poly([[15, 22], [33, 22], [35, 40], [24, 38], [13, 40]], Ct.m); g.poly([[24, 22], [33, 22], [35, 40], [24, 38]], Ct.d); g.line(16, 23, 15, 38, 1, Ct.h);
        for (const y of [26, 31, 36]) { g.p(23, y, Au); g.p(25, y, Au); }
        g.r(14, 30, 20, 2, '#3a1a10'); g.r(22, 30, 4, 2, Au);
        for (const m of [-1, 1]) blob(g, 24 + m * 9, 23, 4, 3, Ct);
        // head: pale blue-green face, big beard, tricorn
        blob(g, 24, 15, 7, 6.5, G);
        g.poly([[17, 15], [31, 15], [30, 22], [24, 26], [18, 22]], '#d8e8e8'); g.poly([[24, 15], [31, 15], [30, 22], [24, 26]], '#a8c0c0');
        for (let i = 0; i < 4; i++) g.line(19 + i * 3, 18, 20 + i * 3, 23, 1, '#8aa0a0');
        g.r(20, 13, 3, 2, Bk); g.r(26, 13, 3, 2, Bk); g.p(21, 13, '#ffe14a'); g.p(27, 13, '#ffe14a');
        g.r(25, 12, 5, 1, Bk);   // eyepatch strap
        g.poly([[13, 9], [24, 3], [35, 9], [31, 11], [24, 9], [17, 11]], '#1a1a22'); g.r(14, 9, 20, 2, Au); g.ell(24, 6, 2.2, 1.8, '#e8e8e0'); g.p(23, 6, Bk); g.p(25, 6, Bk);
        // flintlock pistol
        const px = aim ? 34 : 32, py = aim ? 22 : 30;
        tube(g, [[30, 24, 2.6], [px, py, 2.2]], Ct);
        g.r(px, py - 1, 9, 3, '#3a3a40'); g.r(px, py - 1, 9, 1, '#8a8a90'); g.r(px - 2, py, 3, 5, '#6a4020');
        if (aim) { g.p(px + 10, py, '#ffe080'); g.p(px + 11, py - 1, '#ffffff'); }
      }, '#061414');
    },
    // ----- dwarf warrior: horned helm, great orange beard, a huge hammer -----
    dwarf(P) {
      const sw = P.st === 'wind' ? 2 : P.st === 'slash' ? 1 : 0, k = P.f % 2, step = P.step || 0;
      const ka = sw === 1 ? Math.round(Math.min(1, P.k || 0) * 4) / 4 : 0;
      return mk('dwarf' + sw + ka + k + step, 60, 54, 26, 50, g => {
        const Sk = '#f0b890', SkS = '#c88a60', Bd = { d: '#a0401a', m: '#e0702a', h: '#ffb060' }, I = { d: '#4a5060', m: '#8a92a4', h: '#d0d8e8' }, L = { d: '#4a2a14', m: '#7a4a24', h: '#a87040' }, HN = { d: '#a89a70', m: '#e8e0c0', h: '#ffffff' };
        for (const [x, o] of [[17, step > 0 ? -2 : 0], [27, step < 0 ? -2 : 0]]) { bevel(g, x, 38 + o, 7, 7, L); g.r(x - 1, 44 + o, 9, 3, '#1a1008'); }
        g.poly([[13, 22], [37, 22], [38, 40], [12, 40]], L.m); g.poly([[25, 22], [37, 22], [38, 40], [25, 40]], L.d);
        bevel(g, 17, 26, 16, 13, { d: '#5a3a1a', m: '#8a5a2a', h: '#b88a4a' });   // apron
        g.r(12, 34, 26, 3, '#2a1a0a'); g.r(22, 34, 5, 3, '#c9a24a');
        for (const m of [-1, 1]) blob(g, 25 + m * 12, 25, 5.5, 4.5, I);
        blob(g, 25, 16, 8.5, 7.5, { d: SkS, m: Sk, h: '#ffe0c8' });
        // beard
        g.poly([[16, 16], [34, 16], [33, 27], [29, 33], [25, 30], [21, 33], [17, 27]], Bd.m); g.poly([[25, 16], [34, 16], [33, 27], [29, 33], [25, 30]], Bd.d);
        for (let i = 0; i < 4; i++) g.line(19 + i * 4, 19, 20 + i * 4, 29, 1, Bd.h);
        g.ell(25, 16, 2.6, 2, '#d88a6a');
        g.r(20, 12, 3, 2, '#1a1008'); g.r(27, 12, 3, 2, '#1a1008'); g.p(21, 12, '#ffffff'); g.p(28, 12, '#ffffff');
        g.line(19, 10, 23, 11, 1.4, Bd.d); g.line(31, 10, 27, 11, 1.4, Bd.d);
        // helmet with horns
        g.ell(25, 8, 10, 6, I.d); g.ell(24, 7, 9, 5, I.m); g.ell(21, 5, 3, 1.6, I.h); g.r(15, 9, 20, 2, '#c9a24a');
        for (const m of [-1, 1]) tube(g, [[25 + m * 9, 7, 2.4], [25 + m * 14, 3, 1.8], [25 + m * 15, -1, 0.9]], HN);
        // hammer
        const a = sw === 2 ? -2.6 : sw === 1 ? ka * 2.9 - 1.3 : -0.7 + k * 0.05, hx = 37, hy = 30, dx = Math.cos(a), dy = Math.sin(a);
        g.line(hx, hy, hx + dx * 20, hy + dy * 20, 2.6, '#6a4020');
        const tx = hx + dx * 21, ty = hy + dy * 21, nx = -dy, ny = dx;
        g.poly([[tx + nx * 7 - dx * 4, ty + ny * 7 - dy * 4], [tx + nx * 7 + dx * 4, ty + ny * 7 + dy * 4], [tx - nx * 7 + dx * 4, ty - ny * 7 + dy * 4], [tx - nx * 7 - dx * 4, ty - ny * 7 - dy * 4]], I.m);
        g.line(tx + nx * 7 - dx * 4, ty + ny * 7 - dy * 4, tx - nx * 7 - dx * 4, ty - ny * 7 - dy * 4, 1, I.h); g.p(Math.round(tx), Math.round(ty), '#c9a24a');
        blob(g, hx, hy, 3.4, 3.4, { d: SkS, m: Sk, h: '#ffe0c8' });
      }, '#140a04');
    },
    // ----- magic mirror: a floating gilded mirror with an eye inside; when it shines it throws a ram back at you -----
    magicmirror(P) {
      const shine = P.shine ? 1 : 0, k = P.f % 3;
      return mk('mmir' + shine + k, 44, 54, 22, 50, (g, x) => {
        const Au = { d: '#8a5a1a', m: '#e0b04a', h: '#fff0a0' }, Gl = shine ? ['#ffffff', '#e8f4ff', '#c8e4ff'] : ['#5a7aa8', '#8ab0d8', '#c8dcf4'];
        // frame: an oval with scrolls top and bottom
        g.ell(22, 22, 15, 19, Au.d); g.ell(21.5, 21.5, 13.5, 17.5, Au.m); g.ell(18, 12, 4, 2.4, Au.h);
        for (const [cx, cy] of [[22, 2], [22, 42]]) { g.ell(cx, cy, 5, 3, Au.m); g.ell(cx - 1, cy - 1, 2.6, 1.4, Au.h); }
        for (const m of [-1, 1]) { g.ell(22 + m * 14, 22, 2.6, 4, Au.m); g.p(22 + m * 14, 20, Au.h); }
        g.ell(22, 22, 11, 15, '#2a2018');
        g.ell(22, 22, 10, 14, Gl[0]); g.ell(22, 23, 8.5, 12, Gl[1]); g.ell(20, 20, 5, 8, Gl[2]);
        // the eye that lives in the glass
        if (!shine) { g.ell(22, 23, 5.5, 3.6, '#f4f0e8'); g.ell(22 + (k - 1), 23, 2.6, 2.6, '#7a2a9a'); g.ell(22 + (k - 1), 23, 1.2, 1.6, '#100818'); g.p(21 + (k - 1), 22, '#ffffff'); g.line(16.5, 21, 27.5, 21, 1, '#3a2a40'); }
        else for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + k * 0.3; g.line(22, 22, 22 + Math.cos(a) * 9, 22 + Math.sin(a) * 12, 1, '#ffffff'); }
        g.line(15, 14, 19, 10, 1, '#ffffff'); g.line(16, 18, 18, 16, 1, '#ffffff');   // glints
        // the handle tail and a sparkle
        g.r(20, 44, 4, 6, Au.d); g.r(21, 44, 2, 6, Au.m); g.ell(22, 50, 3, 1.6, Au.m);
        if (shine) for (const [px, py] of [[4, 8], [40, 14], [6, 36], [38, 40]]) { g.p(px, py, '#ffffff'); g.p(px - 1, py, '#c8e4ff'); g.p(px + 1, py, '#c8e4ff'); g.p(px, py - 1, '#c8e4ff'); g.p(px, py + 1, '#c8e4ff'); }
      }, '#2a1808');
    },
    // ----- bone wyvern: a dead wyvern's skeleton held together by green ghost-fire -----
    bonewyvern(P) {
      const k = P.f % 3, fire = P.st === 'wind' || P.st === 'fire' ? 1 : 0;
      return mk('bwyv' + k + fire, 64, 52, 32, 46, (g, x) => {
        const B = { d: '#8a8068', m: '#d8d0b8', h: '#fffaf0' }, M = { d: '#14302a', m: '#2a5a4a' }, Gh = '#6affc0', GhD = '#1a8a5a';
        const o = [-10, 0, 8][k];
        const wing = (rx, ry, sc, far) => {
          const el = [rx - 8 * sc, ry - 14 + o * 0.7], tips = [[rx - 22 * sc, ry - 16 + o], [rx - 26 * sc, ry - 4 + o * 0.6], [rx - 20 * sc, ry + 6 + o * 0.3], [rx - 8 * sc, ry + 8]];
          g.poly([[rx, ry], el, tips[0], tips[1]], far ? '#0e221c' : M.m); g.poly([[rx, ry], tips[2], tips[3]], far ? '#0a1814' : M.d);   // tattered membrane
          tube(g, [[rx, ry, 1.8], [el[0], el[1], 1.5]], B); for (const T of tips) g.line(el[0], el[1], T[0], T[1], 1.2, B.m); g.ell(el[0], el[1], 1.6, 1.6, B.h);
        };
        wing(28, 26, -0.8, true);
        for (let i = 0; i < 6; i++) blob(g, 20 - i * 3.4, 30 + Math.sin(i * 0.9) * 2 - (i > 3 ? (i - 3) * 2 : 0), 2.6 - i * 0.25, 2.2 - i * 0.2, B);   // tail vertebrae
        // ribcage with ghost-fire inside
        g.ell(30, 31, 9, 6, '#0a1814'); g.ell(30, 31, 5, 3.6, GhD); g.ell(30, 31, 3, 2, Gh);
        for (let i = 0; i < 5; i++) { const rx2 = 24 + i * 3; g.line(rx2, 25, rx2 - 1, 37, 1.4, B.m); g.p(rx2, 25, B.h); }
        tube(g, [[22, 25, 1.6], [36, 24, 1.6]], B);
        for (const [lx, m] of [[26, 0], [34, 1]]) { tube(g, [[lx, 34, 1.6], [lx + m, 41, 1.2]], B); for (const c of [-2, 0, 2]) g.line(lx + m, 41, lx + m + c, 44, 1, B.m); }
        // neck + skull
        for (let i = 0; i < 4; i++) blob(g, 37 + i * 3, 24 - i * 2.4, 2.2, 2, B);
        blob(g, 49, 15, 6, 4.6, B);
        g.poly([[51, 13], [61, 15], [60, 18], [51, 19]], B.m); g.poly([[51, 16], [60, 18], [51, 19]], B.d);
        spike(g, 46, 11, -Math.PI / 2 - 0.7, 7, 1.6, B); spike(g, 49, 10, -Math.PI / 2 - 0.3, 7, 1.6, B);
        g.ell(49, 14, 2.2, 2, '#0a1410'); g.ell(49, 14, 1.2, 1.2, Gh); g.p(49, 13, '#ffffff');
        if (fire) { g.poly([[52, 19], [61, 18], [60, 24], [53, 23]], '#0a1410'); g.ell(56, 21, 2.6, 1.6, Gh); g.p(55, 21, '#ffffff'); }
        else { for (const xx of [53, 56, 59]) g.poly([[xx, 18], [xx + 0.8, 20], [xx + 1.6, 18]], '#ffffff'); }
        wing(34, 25, 1, false);
      }, '#081410');
    },
    // ----- dark priest: a hooded servant of the demon king; its staff sends seeking curses -----
    darkpriest(P) {
      const cast = P.st === 'cast' ? 1 : 0, k = P.f % 2;
      return mk('dpri' + cast + k, 44, 52, 20, 48, g => {
        const R = { d: '#1a0a24', m: '#3a1a4a', h: '#6a3a8a' }, Au = '#c9a24a', AuH = '#fff0b0', Mk = { d: '#8a8090', m: '#d8d0e0', h: '#ffffff' };
        g.poly([[12, 18], [28, 18], [33, 48], [7, 48]], R.m); g.poly([[20, 18], [28, 18], [33, 48], [21, 48]], R.d); g.line(13, 20, 9, 46, 1, R.h);
        g.r(18, 20, 4, 27, '#5a1a2a'); for (let y = 24; y < 46; y += 6) g.r(18, y, 4, 1, Au); g.r(7, 46, 26, 2, Au);
        // hood and mask
        g.poly([[11, 20], [20, 3], [29, 20]], R.m); g.poly([[20, 3], [29, 20], [20, 20]], R.d);
        g.ell(20, 14, 6, 6.5, '#06020a');
        g.ell(20, 14, 4.2, 5, Mk.m); g.ell(21, 15, 3, 4, Mk.d); g.r(17, 13, 2, 1, cast ? '#ff4ad8' : '#a03ac8'); g.r(22, 13, 2, 1, cast ? '#ff4ad8' : '#a03ac8'); g.r(19, 17, 3, 1, '#4a3a50');
        g.r(16, 8, 8, 1, Au); g.p(20, 7, AuH);
        // sleeves; the staff rises when it casts
        g.poly([[11, 22], [6, 32 - cast * 6], [11, 34 - cast * 6], [15, 26]], R.m);
        const sy = cast ? 2 : 8 + k;
        g.line(33, sy + 4, 33, 48, 2, '#2a1a10'); g.r(30, sy + 4, 7, 1, Au);
        g.ell(33, sy, cast ? 4 : 3.2, cast ? 4 : 3.2, cast ? '#ff4ad8' : '#a03ac8'); g.ell(32, sy - 1, 1.4, 1.4, '#ffd0f8');
        for (const m of [-1, 1]) spike(g, 33 + m * 3, sy + 2, -Math.PI / 2 + m * 0.6, 5, 1, { d: '#6a5a40', m: Au, h: AuH });
        g.poly([[28, 22], [33, 28 - cast * 4], [29, 31 - cast * 4], [26, 26]], R.d); blob(g, 32, 28 - cast * 4, 2.4, 2.4, Mk);
        if (cast) for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + k * 0.7; g.p(33 + Math.round(Math.cos(a) * 7), sy + Math.round(Math.sin(a) * 7), '#ffb0f0'); }
      }, '#08020c');
    },
    // ===== 指示2: ten more monsters. Every attack has a big, readable wind-up pose =====
    // ----- goblin bomber: goggles and a bandolier of bombs; lifts a lit bomb overhead, then lobs it -----
    bomber(P) {
      const st = P.st === 'aim' ? 1 : P.st === 'throw' ? 2 : 0, step = P.step || 0, k = P.f % 2;
      return mk('gbmb' + st + (st ? k : step), 46, 56, 22, 52, g => {
        const Sk = { d: '#4a6a2a', m: '#7fb04a', h: '#b0d878' }, V = '#7a3a1a', VS = '#4a2010', Bm = { d: '#101018', m: '#2e2e40', h: '#7a7a92' };
        const lean = st === 1 ? -1 : st === 2 ? 2 : 0, hx = 22 + lean, hy = 25;
        g.r(16, 43 - (step > 0 ? 2 : 0), 4, 6, Sk.m); g.r(24, 43 - (step < 0 ? 2 : 0), 4, 6, Sk.d); g.r(15, 48, 6, 2, VS); g.r(23, 48, 6, 2, VS);
        g.ell(22 + lean, 37, 8, 7, V); g.r(19 + lean, 32, 6, 6, Sk.h);
        g.line(15 + lean, 32, 29 + lean, 42, 2, '#3a2410'); for (const t of [0.2, 0.5, 0.8]) { g.ell(15 + lean + 14 * t, 32 + 10 * t, 2, 2, Bm.m); g.p(Math.round(14 + lean + 14 * t), Math.round(31 + 10 * t), Bm.h); }
        // ears + head + goggles
        g.poly([[hx - 8, hy - 2], [hx - 18, hy - 7], [hx - 16, hy - 2], [hx - 8, hy + 3]], Sk.m); g.poly([[hx + 8, hy - 2], [hx + 18, hy - 7], [hx + 16, hy - 2], [hx + 8, hy + 3]], Sk.d);
        blob(g, hx, hy, 9, 7.5, Sk);
        g.r(hx - 9, hy - 4, 18, 2, '#3a2a1a');
        for (const m of [-1, 1]) { g.ell(hx + m * 4, hy - 3, 3, 2.6, '#c8902a'); g.ell(hx + m * 4, hy - 3, 2, 1.7, st === 1 ? '#ffe080' : '#7ac8e8'); g.p(hx + m * 4 - 1, hy - 4, '#ffffff'); }
        if (st) { g.r(hx - 3, hy + 3, 6, 2, '#3a1a10'); g.p(hx - 2, hy + 3, '#fff'); g.p(hx + 2, hy + 3, '#fff'); } else { g.r(hx - 4, hy + 3, 8, 1, '#3a1a10'); g.p(hx - 3, hy + 2, '#fff'); g.p(hx + 3, hy + 2, '#fff'); }
        // the bomb: at the hip, lifted overhead with the fuse fizzing, or flung forward
        const bx = st === 1 ? hx : st === 2 ? hx + 16 : hx + 11, by = st === 1 ? 10 : st === 2 ? 22 : 37;
        if (st === 1) { tube(g, [[hx - 7, 33, 2], [hx - 12, 22, 1.8], [bx - 5, by + 3, 1.6]], Sk); tube(g, [[hx + 7, 33, 2], [hx + 12, 22, 1.8], [bx + 5, by + 3, 1.6]], Sk); }
        else if (st === 2) { tube(g, [[hx + 6, 33, 2], [hx + 11, 27, 1.8], [bx - 4, by + 1, 1.6]], Sk); tube(g, [[hx - 7, 33, 2], [hx - 11, 39, 1.6]], Sk); }
        else { tube(g, [[hx + 7, 33, 2], [bx - 3, by - 1, 1.6]], Sk); tube(g, [[hx - 7, 33, 2], [hx - 9, 40, 1.6]], Sk); }
        if (st !== 2) {
          blob(g, bx, by, 5, 5, Bm); g.r(bx - 1, by - 7, 3, 2, '#8a8a90'); g.line(bx + 1, by - 7, bx + 3, by - 9, 1, '#c8b080');
          if (st === 1) { g.p(bx + 3, by - 10, k ? '#ffffff' : '#ffe14a'); g.p(bx + 4, by - 10, '#ff6a1a'); g.p(bx + 2 + k * 3, by - 12 + k, '#ffe14a'); g.p(bx + 5 - k * 4, by - 11, '#ff8a2a'); }
          else g.p(bx + 3, by - 10, '#ff8a2a');
        } else for (let i = 0; i < 3; i++) g.r(bx - 2 + i * 3, by - 6 + i, 2, 1, '#e8e0c8');   // swoosh: the bomb has left the hand
      }, '#101808');
    },
    // ----- minotaur: a bull-headed brute. Paws the floor, drops its horns and charges; a wall knocks it silly -----
    minotaur(P) {
      const st = P.st === 'wind' ? 1 : P.st === 'dash' ? 2 : P.st === 'stun' ? 3 : P.st === 'tired' ? 4 : 0, k = P.f % 2, step = P.step || 0;
      return mk('mino' + st + k + (st ? 0 : step), 70, 60, 32, 56, g => {
        const F = { d: '#5a2a14', m: '#8e4c26', h: '#c0804c' }, Dk = { d: '#24120a', m: '#4a2a18', h: '#6e4a30' }, Hn = { d: '#a89a70', m: '#ece4c8', h: '#ffffff' }, Au = '#d8aa4a';
        const lean = st === 1 ? 5 : st === 2 ? 10 : st === 4 ? 5 : 0, bx = 30 + lean, by = 33 + (st === 2 ? 4 : st === 4 ? 3 : 0);
        // legs (the hind leg scrapes the floor during the wind-up; both stretch out in the charge)
        const legs = st === 2 ? [[20, 54, -7], [38, 54, 6]] : st === 1 ? [[22 - k * 3, 54 - k * 2, -2 - k * 3], [36, 54, 1]] : [[25, 54 - (step > 0 ? 2 : 0), 0], [35, 54 - (step < 0 ? 2 : 0), 0]];
        legs.forEach(([lx, ly, dx], i) => { tube(g, [[bx - 6 + i * 10, by + 9, 4], [lx + dx * 0.4, ly - 8, 3.2], [lx + dx, ly - 3, 2.6]], i ? Dk : { d: '#180c06', m: '#3a2012', h: '#5a3a24' }); g.r(lx + dx - 3, ly - 3, 7, 3, '#140a04'); });
        if (st === 1 && k) for (const [px, py] of [[12, 52], [9, 49], [15, 49]]) { g.r(px, py, 3, 2, '#c8b090'); }   // dust kicked up
        // loincloth + torso
        g.poly([[bx - 10, by + 7], [bx + 10, by + 7], [bx + 7, by + 18], [bx - 7, by + 18]], '#7a1a1a'); g.r(bx - 11, by + 6, 22, 2, Au);
        blob(g, bx, by, 13, 11, F); g.ell(bx + 3, by - 1, 6, 5, F.h); g.ell(bx - 1, by + 6, 7, 3, F.d);
        // arms: swinging while walking, flung back for the charge, dangling when dazed
        const arm = (sx, sy, ex, ey, C) => { tube(g, [[sx, sy, 3.6], [ex, ey, 3]], C); blob(g, ex, ey + 1, 3.6, 3.4, C); };
        if (st === 2) { arm(bx - 8, by - 4, bx - 20, by + 2, Dk); arm(bx + 6, by - 4, bx - 6, by + 8, F); }
        else if (st === 1) { arm(bx - 8, by - 4, bx - 16, by + 6, Dk); arm(bx + 6, by - 4, bx + 2, by + 12, F); }
        else if (st === 4) { arm(bx - 8, by - 4, bx - 4, by + 14, Dk); arm(bx + 7, by - 4, bx + 10, by + 14, F); }
        else { const s = st ? 0 : step; arm(bx - 9, by - 4, bx - 12 - s * 2, by + 12, Dk); arm(bx + 8, by - 4, bx + 11 + s * 2, by + 12, F); }
        // bull head: lowered and pushed forward in the charge
        const hx = bx + (st === 2 ? 15 : st === 1 ? 11 : st === 4 ? 9 : 5), hy = by - 13 + (st === 2 ? 9 : st === 1 ? 6 : st === 4 ? 5 : 0);
        blob(g, hx, hy, 8.5, 7.5, F);
        g.ell(hx + 7, hy + 3, 4.6, 3.8, '#c89a7a'); g.p(hx + 8, hy + 2, '#3a1a10'); g.p(hx + 10, hy + 3, '#3a1a10');
        g.ell(hx + 7, hy + 7, 2.4, 1.6, Au); g.ell(hx + 7, hy + 6, 1.2, 0.8, '#7a5010');   // nose ring
        g.poly([[hx - 7, hy - 4], [hx - 13, hy - 3], [hx - 7, hy]], F.d);   // ear
        // horns: up and out, or pointed straight ahead for the charge
        const hornA = st === 2 ? [[hx + 1, hy - 5, 2.6], [hx + 9, hy - 8, 1.9], [hx + 17, hy - 7, 0.9]] : st === 1 ? [[hx + 1, hy - 5, 2.6], [hx + 8, hy - 10, 1.9], [hx + 14, hy - 11, 0.9]] : [[hx, hy - 5, 2.6], [hx + 5, hy - 11, 1.9], [hx + 4, hy - 17, 0.9]];
        tube(g, hornA.map(([x, y, r]) => [x - 5, y + 1, r * 0.9]), { d: '#7a6a48', m: '#b8ac88', h: '#e0d8c0' });
        tube(g, hornA, Hn);
        // eyes: blazing red when it means to charge, crossed out when it's dazed
        if (st === 3) { g.line(hx - 1, hy - 3, hx + 2, hy, 1, '#1a0a04'); g.line(hx + 2, hy - 3, hx - 1, hy, 1, '#1a0a04'); g.r(hx + 5, hy + 7, 3, 2, '#e05a6a'); }
        else { g.r(hx, hy - 2, 3, 2, st === 1 || st === 2 ? '#ff3a2a' : '#1a0a04'); if (st === 1 || st === 2) g.p(hx + 1, hy - 2, '#ffe0a0'); }
        if (st === 1) for (let i = 0; i < 2; i++) g.ell(hx + 14 + i * 3 + k * 2, hy + 4 - i * 2, 1.6 - i * 0.4, 1.2, '#f0f0f0');   // snorting steam
        if (st === 3) for (let i = 0; i < 3; i++) { const a = k * 1.1 + i * 2.1, sx = hx + Math.cos(a) * 11, sy2 = hy - 13 + Math.sin(a) * 3; g.p(Math.round(sx), Math.round(sy2), '#ffe14a'); g.p(Math.round(sx) + 1, Math.round(sy2), '#fff6c0'); g.p(Math.round(sx), Math.round(sy2) - 1, '#fff6c0'); }
        if (st === 4) for (let i = 0; i < 2; i++) g.r(hx + 13 + i * 2, hy + 1 + i * 3 - k, 2, 1, '#e8e8f0');   // panting
      }, '#140804');
    },
    // ----- mantis knight: two great scythe-arms. Raises both overhead, then cuts an X in front of it -----
    mantis(P) {
      const st = P.st === 'wind' ? 1 : P.st === 'slash' ? 2 : 0, k = st === 2 ? Math.min(2, Math.floor(Math.min(1, P.k || 0) * 3)) : P.f % 2, step = P.step || 0;
      return mk('mant' + st + k + (st ? 0 : step), 70, 64, 30, 60, (g, x) => {
        x.translate(2, 4);
        const G = { d: '#2a6a1a', m: '#5ab03a', h: '#b0ec78' }, Gd = { d: '#14400c', m: '#2e7a1e', h: '#5aa83a' }, Bl = { d: '#7a8a60', m: '#e0f4c0', h: '#ffffff' };
        // wings flare open in the wind-up
        if (st === 1) { g.poly([[24, 32], [4, 12], [8, 26], [12, 38]], '#8acc60'); g.poly([[24, 32], [10, 18], [14, 36]], '#b8f090'); for (let i = 0; i < 3; i++) g.line(22, 32, 8 + i * 2, 16 + i * 8, 1, '#5a9a3a'); }
        else g.poly([[24, 30], [10, 36], [14, 40], [26, 36]], '#7ab850');
        // abdomen (behind) + legs
        tube(g, [[24, 37, 5.4], [15, 41, 5.8], [8, 43, 3.6]], G); for (let i = 0; i < 3; i++) g.line(13 + i * 4, 37, 12 + i * 4, 45, 1, G.d);
        for (const [x, dx, o] of [[20, -6, step > 0 ? -2 : 0], [24, -2, 0], [28, 3, 0], [31, 7, step < 0 ? -2 : 0]]) { g.line(x, 39, x + dx * 0.6, 47 + o, 1.6, Gd.m); g.line(x + dx * 0.6, 47 + o, x + dx, 54 + o, 1.4, Gd.d); }
        // thorax rising to the head
        tube(g, [[26, 38, 3.8], [29, 24, 3.2]], G);
        // the far scythe arm is drawn behind the head, the near one in front
        const pose = st === 1 ? [-2.1, -2.7] : st === 2 ? [[-0.9, -0.2], [-0.15, 0.7], [0.35, 1.45]][k] : [-0.95, 1.85 + k * 0.08];
        const scythe = (sx, sy, a1, a2, C, far) => {
          const ex = sx + Math.cos(a1) * 12, ey = sy + Math.sin(a1) * 12;
          tube(g, [[sx, sy, 2.6], [ex, ey, 2.2]], C);
          const tx = ex + Math.cos(a2) * 21, ty = ey + Math.sin(a2) * 21, nx = -Math.sin(a2), ny = Math.cos(a2), cx = ex + Math.cos(a2) * 11 - nx * 5, cy = ey + Math.sin(a2) * 11 - ny * 5;
          g.poly([[ex + nx * 2.2, ey + ny * 2.2], [cx, cy], [tx, ty], [ex - nx * 1.8, ey - ny * 1.8]], far ? Bl.d : Bl.m);
          if (!far) { g.line(ex, ey, cx, cy, 1, Bl.h); for (let i = 1; i < 4; i++) g.p(Math.round(ex + Math.cos(a2) * i * 4 + nx * 1.8), Math.round(ey + Math.sin(a2) * i * 4 + ny * 1.8), Bl.d); }
          g.ell(ex, ey, 2, 2, C.h);
        };
        const pf = st === 2 ? 0.35 : 0.25;
        scythe(27, 27, pose[0] - pf, pose[1] - pf, Gd, true);
        // head: triangular, with two big eyes and antennae
        const hx = 32 + (st === 2 ? 3 : 0), hy = 18 + (st === 2 ? 2 : st === 1 ? -1 : 0);
        g.poly([[hx - 7, hy - 3], [hx + 7, hy - 3], [hx + 2, hy + 7]], G.m); g.poly([[hx + 1, hy - 3], [hx + 7, hy - 3], [hx + 2, hy + 7]], G.d);
        g.line(hx - 2, hy - 5, hx - 9 + (st === 1 ? -2 : 0), hy - 15, 1, G.d); g.line(hx + 2, hy - 5, hx + 4, hy - 16, 1, G.d);
        for (const m of [-1, 1]) { g.ell(hx + m * 5, hy - 3, 2.8, 2.8, st ? '#ff6a3a' : '#e0f080'); g.p(hx + m * 5 + 1, hy - 3, '#1a1a08'); g.p(hx + m * 5 - 1, hy - 4, '#ffffff'); }
        g.r(hx, hy + 4, 3, 1, '#1a2a08');
        scythe(30, 28, pose[0], pose[1], G, false);
      }, '#0a1a06');
    },
    // ----- snowman: rolls a snowball on the ground in front of it, bigger and bigger, then sends it rolling -----
    snowman(P) {
      const st = P.st === 'aim' ? 1 : P.st === 'throw' ? 2 : 0, w = st === 1 ? Math.min(2, Math.floor((P.w || 0) * 3)) : 0, k = P.f % 2, step = P.step || 0;
      return mk('snwm' + st + w + k + (st ? 0 : step), 58, 58, 24, 54, g => {
        const S = { d: '#8aa8c8', m: '#eaf2fa', h: '#ffffff' }, Sc = { d: '#8a1a1a', m: '#d03a3a', h: '#ff7a6a' }, Wd = '#6a4020', Co = '#1a1a24';
        const lean = st === 1 ? 2 : st === 2 ? 3 : 0, wob = st ? 0 : (step ? 1 : 0);
        blob(g, 24, 44, 13, 10, S); g.ell(24, 53, 12, 2, '#a8c0d8');
        blob(g, 25 + lean * 0.5, 30 - wob, 10, 8.5, S);
        for (const y of [27, 31, 35]) g.r(25 + lean, y - wob, 2, 2, Co);
        // stick arms: reaching down to roll the ball, flung forward to push it, or waving
        const sx = 25 + lean, sy = 29 - wob;
        const stick = (x0, y0, x1, y1) => { g.line(x0, y0, x1, y1, 1.6, Wd); const mx = (x0 + x1) / 2, my = (y0 + y1) / 2; g.line(mx, my, mx + (x1 - x0) * 0.2 + 1, my - 4, 1, Wd); };
        const br = [5, 7, 9][w], ballX = 38 + br, ballY = 53 - br;
        if (st === 1) { stick(sx + 7, sy, ballX - br + 1, ballY - 2 + k); stick(sx - 8, sy, ballX - br - 1, ballY + 2 - k); }
        else if (st === 2) { stick(sx + 7, sy, sx + 21, sy - 3); stick(sx - 8, sy, sx + 18, sy + 2); }
        else { stick(sx + 8, sy, sx + 17, sy - 8 - k * 2); stick(sx - 8, sy, sx - 17, sy - 6 + k * 2); }
        // head, coal eyes, carrot nose, scarf and a bucket hat
        const hx = 25 + lean, hy = 15 - wob;
        g.poly([[hx - 8, hy + 6], [hx + 8, hy + 6], [hx + 7, hy + 10], [hx - 8, hy + 10]], Sc.m); g.r(hx - 8, hy + 6, 16, 1, Sc.h); g.poly([[hx - 6, hy + 9], [hx - 9, hy + 18], [hx - 5, hy + 18], [hx - 3, hy + 9]], Sc.d);
        blob(g, hx, hy, 8, 7.5, S);
        g.r(hx - 4, hy - 2, 2, 2, Co); g.r(hx + 3, hy - 2, 2, 2, Co); if (st === 1) { g.line(hx - 5, hy - 4, hx - 2, hy - 3, 1, Co); g.line(hx + 6, hy - 4, hx + 3, hy - 3, 1, Co); }
        g.poly([[hx, hy], [hx + 10, hy + 2], [hx, hy + 3]], '#ff8a2a'); g.p(hx + 1, hy + 1, '#ffc080');
        for (const [dx, dy] of st ? [[-3, 4], [-1, 5], [1, 5], [3, 4], [-1, 3], [1, 3]] : [[-4, 4], [-2, 5], [0, 5], [2, 5], [4, 4]]) g.p(hx + dx, hy + dy, Co);
        bevel(g, hx - 6, hy - 14, 12, 8, { d: '#3a4a6a', m: '#5a6e94', h: '#8aa0c8' }); g.r(hx - 8, hy - 7, 16, 2, '#3a4a6a'); g.r(hx - 6, hy - 10, 12, 1, '#c84a4a');
        // the snowball it's rolling, growing as it goes
        if (st === 1) { blob(g, ballX, ballY, br, br, S); g.p(ballX - 2 + k, ballY - br + 2, '#c8d8ec'); g.p(ballX + 2 - k, ballY + 1, '#c8d8ec'); g.ell(ballX, 53, br, 1.4, '#a8c0d8'); }
      }, '#1a2234');
    },
    // ----- shadow assassin: a hooded killer with a reversed dagger. A golden blade means a critical hit -----
    assassin(P) {
      const st = P.st === 'wind' ? 1 : P.st === 'slash' ? 2 : P.st === 'recover' ? 3 : P.st === 'vanish' ? 4 : 0, k = P.f % 2, crit = P.crit && (st === 1 || st === 2) ? 1 : 0, step = P.step || 0;
      return mk('assn' + st + k + crit + (st ? 0 : step), 58, 56, 26, 52, g => {
        const N = { d: '#0e0e1e', m: '#24243e', h: '#4a4a6e' }, Rd = { d: '#6a0e14', m: '#c0242c', h: '#ff6a5a' }, Sk = '#d8b090', Bl = crit ? { d: '#a8701a', m: '#ffd84a', h: '#ffffff' } : { d: '#6a7080', m: '#d0d8e4', h: '#ffffff' };
        const low = st === 2 ? 6 : st === 3 ? 8 : st === 0 ? 2 : 0, bx = 24 + (st === 2 ? 6 : 0), by = 32 + low;
        // scarf streaming behind
        const sw = st === 2 ? 4 : k;
        g.poly([[bx - 3, by - 12], [bx - 16, by - 9 + sw], [bx - 22, by - 4 + sw * 2], [bx - 14, by - 8], [bx - 2, by - 9]], Rd.m); g.poly([[bx - 14, by - 8], [bx - 22, by - 4 + sw * 2], [bx - 19, by - 2 + sw]], Rd.d);
        // legs: a wide crouch, a long lunge, or one knee down
        if (st === 2) { tube(g, [[bx - 2, by + 4, 2.8], [bx - 12, by + 10, 2.4], [bx - 18, by + 14, 2]], N); tube(g, [[bx + 2, by + 4, 2.8], [bx + 9, by + 8, 2.4], [bx + 12, by + 14, 2]], N); }
        else if (st === 3) { tube(g, [[bx - 2, by + 3, 2.8], [bx - 6, by + 12, 2.2]], N); tube(g, [[bx + 2, by + 3, 2.8], [bx + 9, by + 6, 2.4], [bx + 9, by + 12, 2]], N); }
        else { const s = st ? 0 : step; tube(g, [[bx - 2, by + 4, 2.8], [bx - 8, by + 10 - low * 0.5, 2.4], [bx - 8, by + 18 - low - (s > 0 ? 2 : 0), 2]], N); tube(g, [[bx + 2, by + 4, 2.8], [bx + 8, by + 10 - low * 0.5, 2.4], [bx + 8, by + 18 - low - (s < 0 ? 2 : 0), 2]], N); }
        // body + sash
        blob(g, bx, by - 3, 7, 8, N); g.line(bx - 6, by - 8, bx + 5, by + 2, 2, Rd.m); g.r(bx - 6, by + 2, 13, 2, Rd.d);
        // hood, mask, eyes
        const hx = bx + (st === 2 ? 3 : 1), hy = by - 15;
        blob(g, hx, hy, 6.5, 6.5, N); g.poly([[hx - 6, hy - 3], [hx - 3, hy - 10], [hx + 2, hy - 7]], N.m);
        g.r(hx - 3, hy - 1, 9, 3, Sk); g.r(hx - 3, hy + 2, 9, 3, N.d);
        g.r(hx, hy, 2, 1, st === 1 || st === 2 ? (crit ? '#ffd84a' : '#ff2a2a') : '#1a1020'); g.r(hx + 4, hy, 2, 1, st === 1 || st === 2 ? (crit ? '#ffd84a' : '#ff2a2a') : '#1a1020');
        // dagger arm: reversed grip in front, raised high to strike, or swept low after the cut
        const blade = (x, y, a, len) => { const tx = x + Math.cos(a) * len, ty = y + Math.sin(a) * len, nx = -Math.sin(a) * 1.8, ny = Math.cos(a) * 1.8; g.poly([[x + nx, y + ny], [tx, ty], [x - nx, y - ny]], Bl.m); g.line(x, y, tx, ty, 1, Bl.h); g.r(Math.round(x - Math.cos(a) * 2) - 1, Math.round(y - Math.sin(a) * 2) - 1, 3, 3, '#c9a24a'); };
        if (st === 1) { tube(g, [[bx + 4, by - 8, 2.2], [bx + 8, by - 17, 2], [bx + 10, by - 24, 1.8]], N); blade(bx + 10, by - 25, -1.9, 14); }
        else if (st === 2) { tube(g, [[bx + 4, by - 7, 2.2], [bx + 13, by - 4, 2], [bx + 20, by - 1, 1.8]], N); blade(bx + 21, by - 1, 0.35, 13); for (let i = 0; i < 4; i++) g.r(bx + 2 + i * 5, by - 21 + i * 4, 4, 1, crit ? '#ffe680' : '#e8ecf4'); }
        else if (st === 3) { tube(g, [[bx + 4, by - 7, 2.2], [bx + 12, by + 2, 1.8]], N); blade(bx + 12, by + 3, 1.3, 11); }
        else { tube(g, [[bx + 4, by - 7, 2.2], [bx + 10, by - 2, 2]], N); blade(bx + 10, by - 1, 2.2, 11); }
        if (crit) for (const [px, py] of [[bx + 14, by - 38], [bx + 22, by - 30], [bx + 4, by - 32]]) { g.p(px, py, '#ffffff'); g.p(px - 1, py, '#ffe680'); g.p(px + 1, py, '#ffe680'); g.p(px, py - 1, '#ffe680'); g.p(px, py + 1, '#ffe680'); }
        // smoke when it vanishes
        if (st === 4) for (let i = 0; i < 6; i++) { const a = i * 1.05 + k, r = 10 + (i % 3) * 3; g.ell(bx + Math.cos(a) * r, by - 6 + Math.sin(a) * r * 0.8, 5 - (i % 2), 4, i % 2 ? '#8a8aa0' : '#c8c8d8'); }
      }, '#06060e');
    },
    // ----- storm eagle: throws its wings up and calls three bolts down on you -----
    stormeagle(P) {
      const cast = P.st === 'cast' ? 1 : 0, k = P.f % 3;
      return mk('tbrd' + cast + k, 70, 56, 35, 50, g => {
        const F = { m: '#2a5ad0', d: '#183a8a', tip: '#ffe14a' }, F2 = { m: '#4a80f0', d: '#2a5ad0', tip: '#fff6a0' }, Wh = { d: '#a8b8d8', m: '#eef4ff', h: '#ffffff' }, Au = { d: '#a87010', m: '#ffc83a', h: '#fff2a0' };
        const up = cast ? -1.0 : [-0.45, 0, 0.4][k];
        for (const m of [-1, 1]) {   // wings: raised straight up while it calls the lightning
          const sx = 35 + m * 6, sy = 26;
          for (let i = 0; i < 7; i++) { const a = (m > 0 ? 0 : Math.PI) + m * (-0.6 + i * 0.27 + up); feather(g, sx, sy, a, 24 - i * 2, 3.4, i % 2 ? F : F2); }
          if (cast) for (let i = 0; i < 2; i++) { const a = (m > 0 ? 0 : Math.PI) + m * (-1.4 + i * 0.4), x0 = sx + Math.cos(a) * 18, y0 = sy + Math.sin(a) * 18; g.line(x0, y0, x0 + m * 3, y0 - 4, 1, '#fff6a0'); g.line(x0 + m * 3, y0 - 4, x0, y0 - 8, 1, '#fff6a0'); }
        }
        // tail feathers + talons
        for (let i = 0; i < 3; i++) feather(g, 35, 36, Math.PI / 2 + (i - 1) * 0.4, 12, 2.6, i === 1 ? F2 : F);
        for (const m of [-1, 1]) { g.line(35 + m * 3, 36, 35 + m * 4, 42, 1.6, Au.d); for (const c of [-2, 0, 2]) spike(g, 35 + m * 4 + c, 43, Math.PI / 2 + c * 0.2, 3, 0.8, Au); }
        // body and head
        blob(g, 35, 30, 7, 8, { d: F.d, m: F.m, h: F2.m }); g.ell(35, 32, 4, 5, Wh.m);
        blob(g, 36, 17, 6.5, 6, Wh);
        g.poly([[40, 16], [48, 18], [44, 20], [40, 21]], Au.m); g.poly([[40, 19], [44, 20], [40, 21]], Au.d);
        // lightning crest
        g.poly([[32, 11], [34, 3], [36, 9], [39, 1], [39, 11]], Au.m); g.p(34, 5, Au.h); g.p(38, 4, Au.h);
        g.r(37, 15, 2, 2, cast ? '#ffffff' : '#1a2a5a'); if (cast) g.p(36, 15, '#ffe14a');
        g.line(34, 14, 38, 14, 1, '#1a2a5a');
        if (cast) for (let i = 0; i < 5; i++) { const a = i * 1.26 + k * 0.4, r = 15; g.p(35 + Math.round(Math.cos(a) * r), 26 + Math.round(Math.sin(a) * r * 0.8), i % 2 ? '#ffffff' : '#ffe14a'); }
      }, '#0a1430');
    },
    // ----- dullahan: a headless knight that carries its own head. It lifts the head high, then hurls it -----
    dullahan(P) {
      const st = P.st === 'wind' ? 1 : P.head === false ? 2 : 0, k = P.f % 2, step = P.step || 0;
      return mk('dulh' + st + k + step, 58, 60, 26, 56, g => {
        const A = { d: '#1e1a2e', m: '#3e3658', h: '#6e64a0' }, Au = '#d0a84a', Cp = { d: '#3a0a2a', m: '#6a1a4a' }, Gh = ['#2a6aff', '#6ab0ff', '#d8f0ff'];
        // cape
        g.poly([[16, 22], [32, 22], [36, 50 + k], [26, 47], [12, 50 - k]], Cp.m); g.poly([[24, 22], [32, 22], [36, 50 + k], [26, 47]], Cp.d);
        // legs
        for (const [x, o] of [[19, step > 0 ? -2 : 0], [28, step < 0 ? -2 : 0]]) { bevel(g, x, 40 + o, 6, 10, A); g.r(x - 1, 49 + o, 8, 3, '#0e0a18'); }
        // armour: breastplate, gold trim, pauldrons
        bevel(g, 15, 22, 19, 19, A); g.r(15, 30, 19, 2, Au); g.r(23, 22, 2, 19, A.d); g.r(15, 39, 19, 2, '#2a1e10');
        for (const m of [-1, 1]) { blob(g, 24 + m * 10, 23, 5.5, 4.5, A); g.r(24 + m * 10 - 4, 26, 8, 1, Au); }
        // the neck: no head, just a cold blue flame
        const fl = st === 2 ? 3 : st === 1 ? 1 : 0;
        g.ell(24, 20, 5, 2, '#0e0a18'); g.poly([[20, 20], [22 + k, 12 - fl], [24, 17], [26 - k, 10 - fl], [28, 20]], Gh[0]); g.poly([[22, 20], [24 - k, 14 - fl], [26, 20]], Gh[1]); g.p(24, 18, Gh[2]);
        // sword arm (near side)
        tube(g, [[34, 25, 3], [37, 34, 2.6]], A); g.line(38, 35, 38, 14, 2.4, '#c8d0dc'); g.line(37, 34, 37, 15, 1, '#ffffff'); g.r(35, 35, 7, 2, Au); g.r(37, 37, 3, 4, '#4a2a14');
        // the head: tucked under the arm, lifted high over the neck, or gone (thrown)
        const head = (x, y) => { blob(g, x, y, 6, 6, A); g.r(x - 5, y - 1, 10, 2, '#0a0814'); g.r(x - 3, y - 1, 2, 2, Gh[1]); g.r(x + 1, y - 1, 2, 2, Gh[1]); g.p(x - 3, y - 1, Gh[2]); g.p(x + 1, y - 1, Gh[2]); g.r(x - 1, y - 9, 2, 4, '#c02a4a'); g.r(x - 3, y - 7, 6, 1, Au); };
        if (st === 1) { tube(g, [[14, 25, 3], [10, 18, 2.6], [12, 14, 2.4]], A); head(14, 10); for (let i = 0; i < 3; i++) g.p(8 + i * 6, 1 + (i % 2) * 2 + k, Gh[2]); }
        else if (st === 2) { tube(g, [[14, 25, 3], [8, 22, 2.6], [3, 22, 2.4]], A); blob(g, 3, 23, 2.6, 2.6, A); }
        else { tube(g, [[14, 25, 3], [11, 32, 2.6]], A); head(11, 34); }
      }, '#060410');
    },
    // the dullahan's head in flight (spins as it goes)
    dlhead(P) {
      const k = P.f % 4;
      return mk('dlhd' + k, 22, 22, 11, 11, g => {
        const A = { d: '#1e1a2e', m: '#3e3658', h: '#6e64a0' }, Au = '#d0a84a';
        const ox = [0, 1, 0, -1][k], oy = [0, 0, 1, 0][k];
        blob(g, 11, 12, 7, 7, A); g.r(5 + ox, 10 + oy, 12, 3, '#0a0814');
        g.r(7 + ox, 10 + oy, 3, 2, '#6ab0ff'); g.r(12 + ox, 10 + oy, 3, 2, '#6ab0ff'); g.p(7 + ox, 10 + oy, '#ffffff'); g.p(12 + ox, 10 + oy, '#ffffff');
        g.r(10, 2, 2, 5, '#c02a4a'); g.r(7, 5, 8, 1, Au);
        g.r(8, 17, 6, 2, '#2a6aff'); g.p(10, 19 + (k % 2), '#6ab0ff');
      }, '#060410');
    },
    // ----- blade shark: circles under the floor with only its fin out, then bursts out jaws first -----
    shark(P) {
      const st = P.st === 'leap' ? 1 : P.st === 'flop' ? 2 : 0, k = P.f % 2;
      return mk('shrk' + st + k, 66, 46, 33, 40, g => {
        const S = { d: '#2e4660', m: '#5a7a9a', h: '#9ab8d4' }, Wb = '#e8eef4', Fn = { d: '#1e3048', m: '#4a6a8a', h: '#8aa8c8' };
        const arch = st === 1 ? -5 : 0, tail = st === 2 ? (k ? -6 : 2) : st === 1 ? 5 : k * 2 - 1;
        // tail fin
        g.poly([[14, 28 + arch * 0.4], [3, 18 + tail], [7, 28], [3, 38 + tail * 0.5]], Fn.m); g.poly([[14, 28], [7, 28], [3, 38 + tail * 0.5]], Fn.d);
        // body: arched upward in the leap
        tube(g, [[13, 28, 4], [24, 26 + arch * 0.6, 8], [38, 25 + arch, 9.5], [50, 27 + arch * 0.6, 7]], S);
        g.ell(38, 30 + arch, 10, 3.6, Wb); g.ell(26, 30 + arch * 0.6, 7, 2.6, Wb);
        // dorsal fin and side fin
        g.poly([[30, 18 + arch], [37, 5 + arch], [40, 18 + arch]], Fn.m); g.poly([[35, 10 + arch], [37, 5 + arch], [40, 18 + arch], [36, 18 + arch]], Fn.d);
        g.poly([[36, 31 + arch], [30, 40 + arch], [40, 33 + arch]], Fn.d);
        for (let i = 0; i < 3; i++) g.line(44 - i * 2.5, 23 + arch, 43 - i * 2.5, 28 + arch, 1, S.d);   // gills
        // head + jaws: wide open with rows of teeth in the leap
        const hx = 52, hy = 26 + arch * 0.6;
        if (st === 1) {
          g.poly([[hx - 4, hy - 6], [hx + 12, hy - 10], [hx + 9, hy - 4], [hx - 2, hy]], S.m); g.poly([[hx - 4, hy + 6], [hx + 10, hy + 10], [hx + 8, hy + 5], [hx - 2, hy + 1]], S.d);
          g.poly([[hx - 2, hy], [hx + 9, hy - 4], [hx + 8, hy + 5]], '#5a0a14');
          for (let i = 0; i < 4; i++) { g.poly([[hx + i * 2.5, hy - 3 - i], [hx + 1 + i * 2.5, hy - i * 0.6], [hx + 2 + i * 2.5, hy - 3 - i]], '#ffffff'); g.poly([[hx + i * 2.3, hy + 3 + i], [hx + 1 + i * 2.3, hy + i * 0.6], [hx + 2 + i * 2.3, hy + 3 + i]], '#ffffff'); }
          g.r(hx - 1, hy - 6, 2, 2, '#ff2a2a');
        } else {
          g.poly([[hx - 4, hy - 6], [hx + 12, hy - 2], [hx + 10, hy + 3], [hx - 4, hy + 5]], S.m); g.line(hx, hy + 3, hx + 10, hy + 2, 1, '#1a2030');
          for (let i = 0; i < 3; i++) g.p(hx + 2 + i * 3, hy + 3, '#ffffff');
          g.r(hx, hy - 3, 2, 2, st === 2 ? '#ffffff' : '#0a0a14'); if (st === 2) g.p(hx + 1, hy - 2, '#0a0a14');
        }
        if (st === 2) for (let i = 0; i < 3; i++) g.p(20 + i * 12 + k * 3, 42 - (i % 2) * 2, '#a8d8ff');   // flapping on the floor
      }, '#0a1420');
    },
    // the fin you see while it's under the floor
    sharkfin(P) {
      const k = P.f % 3, rise = P.st === 'wind' ? 1 : 0;
      return mk('sfin' + k + rise, 34, 24, 17, 20, g => {
        const Fn = { d: '#1e3048', m: '#4a6a8a', h: '#8aa8c8' };
        const h = rise ? 17 : 12;
        g.poly([[9, 20], [17 + (rise ? 1 : 0), 20 - h], [23, 20]], Fn.m); g.poly([[15, 20 - h * 0.6], [17 + (rise ? 1 : 0), 20 - h], [23, 20], [16, 20]], Fn.d); g.line(10, 19, 16, 21 - h, 1, Fn.h);
        g.ell(16, 20, 13 - k, 2.4, '#a8d8ff'); g.ell(16, 20, 9, 1.4, '#e8f6ff');
        for (let i = 0; i < 3; i++) g.p(3 + i * 4 + k * 2, 21 + (i % 2), '#ffffff');
      }, '#0a1420');
    },
    // ----- basilisk: the crowned lizard. Rears up and spreads its frill; its stare turns you to stone -----
    basilisk(P) {
      const st = P.st === 'wind' ? 1 : P.st === 'gaze' ? 2 : 0, k = P.f % 2, step = P.step || 0;
      return mk('basl' + st + k + (st ? 0 : step), 70, 52, 34, 46, g => {
        const G = { d: '#3a4a1a', m: '#6a8a3a', h: '#a8c868' }, Bel = '#e0d8a0', Sp = '#6a3a8a', Cr = { d: '#8a2a1a', m: '#d84a2a', h: '#ffb060' }, Fr = { d: '#5a1a5a', m: '#a03aa0', h: '#e07ae0' };
        const rear = st ? 5 : 0;
        // tail
        tube(g, [[24, 36, 6], [14, 38, 4.6], [6, 34 + k, 3], [2, 29 + k * 2, 1.6]], G, { scale: 1 });
        // legs
        for (const [x, o, far] of [[22, step > 0 ? -2 : 0, 1], [40, step < 0 ? -2 : 0, 1], [26, step < 0 ? -2 : 0, 0], [44, step > 0 ? -2 : 0, 0]]) { const C = far ? { d: '#26300e', m: '#4a5e28', h: '#6a8a3a' } : G; tube(g, [[x, 36, 3], [x + 2, 42 + o, 2.4]], C); g.r(x - 1, 43 + o, 6, 2, C.d); }
        // body (front half lifts up as it rears)
        tube(g, [[22, 36, 7], [34, 35 - rear * 0.4, 8.5], [44, 32 - rear, 7]], G, { belly: { c: Bel, s: '#b8a870' }, scale: 1 });
        for (const [px, py] of [[28, 30], [34, 29], [40, 27 - rear]]) { g.ell(px, py, 2, 1.4, Sp); }
        // frill: spread wide like a fan when it means to stare
        const hx = 52, hy = 26 - rear * 1.6;
        if (st) { for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 - 1.2 + i * 0.4; g.poly([[hx - 4, hy], [hx - 4 + Math.cos(a) * 15, hy + Math.sin(a) * 15], [hx - 4 + Math.cos(a + 0.3) * 13, hy + Math.sin(a + 0.3) * 13]], i % 2 ? Fr.m : Fr.d); } g.ell(hx - 4, hy, 6, 6, Fr.h); }
        // head
        tube(g, [[44, 32 - rear, 6], [hx, hy, 6]], G);
        g.poly([[hx - 2, hy - 4], [hx + 12, hy - 1], [hx + 12, hy + 3], [hx - 2, hy + 5]], G.m); g.r(hx, hy + 3, 12, 1, G.d);
        if (st === 2) { g.poly([[hx, hy + 3], [hx + 12, hy + 3], [hx + 10, hy + 8], [hx, hy + 6]], '#4a0a1a'); g.p(hx + 4, hy + 4, '#ffffff'); g.p(hx + 8, hy + 4, '#ffffff'); }
        // crown of spikes
        for (let i = 0; i < 3; i++) spike(g, hx - 2 + i * 3, hy - 4, -Math.PI / 2 - 0.5 + i * 0.3, 6 + (i === 1 ? 2 : 0), 1.4, Cr);
        // eye: glowing hard when it rears
        if (st) { g.ell(hx + 4, hy - 1, 2.6, 2.2, '#e8ff7a'); g.r(hx + 4, hy - 2, 1, 3, '#2a0a2a'); if (st === 2) for (let i = 0; i < 3; i++) g.line(hx + 7, hy - 1, hx + 16, hy - 4 + i * 3, 1, '#f0ffb0'); }
        else { g.ell(hx + 4, hy - 1, 1.8, 1.6, '#e0c040'); g.p(hx + 4, hy - 1, '#1a0a1a'); }
      }, '#0e1404');
    },
    // ----- nightmare clown: never stops juggling. Juggles faster and faster, then throws three bouncing balls -----
    clown(P) {
      const st = P.st === 'aim' ? 1 : P.st === 'throw' ? 2 : 0, f = st === 1 ? P.f % 3 : Math.floor(P.f / 2) % 3, step = P.step || 0;
      return mk('clwn' + st + f + (st ? 0 : step), 54, 70, 26, 66, (g, x) => {
        x.translate(0, 6);
        const Pu = { d: '#4a1a7a', m: '#8a3ad8', h: '#c08aff' }, Ye = { d: '#a87a10', m: '#ffd23a', h: '#fff2a0' }, Wh = '#f4f0f8', Rd = '#e02a3a', BC = ['#ff4a5a', '#4ad0ff', '#ffe14a'];
        // legs + shoes
        for (const [x, o, C] of [[20, step > 0 ? -2 : 0, Pu], [28, step < 0 ? -2 : 0, Ye]]) { bevel(g, x, 47 + o, 5, 8, C); g.ell(x + 3, 56 + o, 5, 2.4, Rd); }
        // two-tone suit with pompoms
        g.poly([[16, 32], [26, 32], [26, 49], [15, 49]], Pu.m); g.poly([[26, 32], [36, 32], [37, 49], [26, 49]], Ye.m); g.r(15, 47, 22, 2, Pu.d);
        for (const y of [36, 42]) { g.ell(26, y, 1.8, 1.8, Wh); }
        // ruffled collar
        for (let i = 0; i < 6; i++) g.ell(17 + i * 3.6, 31 + (i % 2), 2.6, 2, i % 2 ? '#d8d0e8' : Wh);
        // arms: alternate up and down with the juggling, or one flung forward in the throw
        const juggle = st !== 2, up = f % 2;
        if (st === 2) { tube(g, [[34, 34, 2.4], [42, 30, 2], [48, 28, 1.8]], Ye); blob(g, 49, 28, 2.4, 2.4, { d: '#c8c0d8', m: Wh, h: '#ffffff' }); tube(g, [[17, 34, 2.4], [12, 40, 2]], Pu); }
        else { tube(g, [[17, 34, 2.4], [12, up ? 24 : 30, 2], [14, up ? 18 : 25, 1.8]], Pu); tube(g, [[35, 34, 2.4], [40, up ? 30 : 24, 2], [38, up ? 25 : 18, 1.8]], Ye); for (const [x, y] of [[14, up ? 17 : 24], [38, up ? 24 : 17]]) blob(g, x, y, 2.4, 2.4, { d: '#c8c0d8', m: Wh, h: '#ffffff' }); }
        // face: white, red nose, an unsettling grin
        blob(g, 26, 23, 7.5, 7, { d: '#c8c0d8', m: Wh, h: '#ffffff' });
        g.r(22, 20, 2, 2, '#1a1020'); g.r(28, 20, 2, 2, '#1a1020'); g.r(22, 17, 2, 2, '#4a7ad8'); g.r(28, 17, 2, 2, '#4a7ad8');
        g.ell(26, 24, 2, 2, Rd); g.p(25, 23, '#ffb0b0');
        g.poly([[21, 26], [31, 26], [29, 29], [23, 29]], st ? '#6a0a1a' : Rd); g.r(23, 26, 6, 1, '#ffffff');
        // jester hat with bells
        g.poly([[18, 17], [26, 12], [34, 17]], Pu.m); g.poly([[19, 15], [10, 6 + up], [24, 13]], Pu.m); g.poly([[33, 15], [42, 6 - up], [28, 13]], Ye.m);
        g.ell(10, 6 + up, 2, 2, Ye.m); g.ell(42, 6 - up, 2, 2, Pu.h); g.r(18, 16, 16, 2, Ye.d);
        // the three balls on their loop
        if (juggle) {
          const pts = [[13, 12], [26, 2], [39, 12], [32, 14], [20, 14]];
          for (let i = 0; i < 3; i++) { const [bx, by] = pts[(f + i * 2) % 5]; blob(g, bx, by - 6 + (st === 1 ? -2 : 0), 3, 3, { d: '#3a1020', m: BC[i], h: '#ffffff' }); }
          if (st === 1) for (let i = 0; i < 3; i++) g.r(10 + i * 14, -2 + (i % 2) * 6, 3, 1, '#ffffff');
        }
      }, '#10061a');
    },
  };
  // wolf / hellhound share the body
  function wolfish(P, key, C) {
      const st = P.st === 'wind' ? 1 : P.st === 'dash' ? 2 : 0, k = P.step ? (P.step > 0 ? 1 : 2) : 0;
      return mk(key + st + k, 50, 36, 25, 33, g => {
        const { B, S, H, L } = C;
        const cy = st === 1 ? 21 : st === 2 ? 15 : 19;
        g.poly([[11, cy - 2], [3, cy - 7 + (st === 2 ? 4 : 0)], [1, cy - 3], [8, cy + 3]], S); g.p(2, cy - 4, H);
        const leg = (x, dx, back) => { if (st === 2) { g.line(x, cy + 3, x + (back ? -7 : 7), cy + 9, 2.4, back ? S : B); return; } const ly = st === 1 ? 2 : 0; g.r(x + dx, cy + 3, 3, 9 - ly, back ? S : B); g.r(x + dx - 1, cy + 11 - ly, 4, 1, C.foot); };
        leg(13, k === 1 ? -2 : k === 2 ? 2 : 0, true); leg(31, k === 1 ? 2 : k === 2 ? -2 : 0, true);
        g.ell(23, cy, 13, 6.5, B); g.ell(23, cy - 4, 11, 3, H); g.ell(26, cy + 3, 8, 2.6, L);
        leg(16, k === 1 ? 2 : k === 2 ? -2 : 0, false); leg(34, k === 1 ? -2 : k === 2 ? 2 : 0, false);
        if (C.fire) {   // burning mane along the back
          for (let i = 0; i < 4; i++) { const fx = 16 + i * 6, fh = 4 + ((i + k + st) % 2) * 3; g.poly([[fx - 2, cy - 5], [fx + 1, cy - 5 - fh], [fx + 3, cy - 5]], '#ff6a1a'); g.poly([[fx - 1, cy - 5], [fx + 1, cy - 7 - fh / 2], [fx + 2, cy - 5]], '#ffd24a'); }
          g.ell(2, cy - 4, 2.4, 2.4, '#ff6a1a'); g.p(2, cy - 5, '#ffd24a');
        }
        const hx = 38, hy = cy - 6 + (st === 1 ? 2 : 0);
        g.ell(hx, hy, 6.5, 5.5, B); g.poly([[hx + 3, hy - 1], [hx + 12, hy + 1], [hx + 11, hy + 4], [hx + 3, hy + 4]], B); g.r(hx + 4, hy + 3, 7, 1, S);
        g.poly([[hx - 4, hy - 3], [hx - 3, hy - 11], [hx + 1, hy - 4]], B); g.poly([[hx - 3, hy - 4], [hx - 3, hy - 8], [hx, hy - 4]], C.ear);
        g.p(hx + 11, hy, '#1a1420'); g.r(hx + 2, hy - 2, 2, 2, C.eye); g.p(hx + 3, hy - 1, EYE);
        if (st) { g.r(hx + 5, hy + 4, 6, 2, '#5a1010'); g.p(hx + 6, hy + 4, '#fff'); g.p(hx + 9, hy + 4, '#fff'); }
      });
  }
  // goblin / goblin archer share the body
  function goblinish(P, archer) {
    const st = P.st === 'wind' || P.st === 'aim' ? 1 : P.st === 'dash' ? 2 : 0, step = P.step || 0, k = P.f % 2;
    return mk((archer ? 'arch' : 'gob') + st + step + k, 40, 44, 20, 41, g => {
      const Sk = '#7fb04a', SkS = '#567a2e', SkH = '#a8d070', V = '#6b4a2a', VS = '#4a3018';
      g.r(14, 33 - (step > 0 ? 2 : 0), 4, 5, Sk); g.r(22, 33 - (step < 0 ? 2 : 0), 4, 5, SkS);
      g.r(13, 37, 6, 2, VS); g.r(21, 37, 6, 2, VS);
      g.ell(20, 27, 7.5, 6, V); g.r(17, 23, 6, 6, SkH); g.r(23, 23, 3, 8, VS);
      g.r(12, 30, 16, 1, '#3a2410'); g.r(16, 31, 8, 3, '#8a6a3a');
      if (archer) { g.r(23, 15, 3, 12, '#6a4020'); for (const ax of [23, 25]) g.poly([[ax, 15], [ax + 1, 11], [ax + 2, 15]], '#e0e0e0'); }
      g.r(9, 24, 3, 6, Sk); g.r(9, 29, 3, 2, SkS);
      // head
      g.poly([[12, 13], [2, 8], [4, 13], [12, 18]], Sk); g.poly([[28, 13], [38, 8], [36, 13], [28, 18]], SkS); g.p(5, 11, '#c87a6a'); g.p(35, 11, '#c87a6a');
      g.ell(20, 15, 9, 7.5, Sk); g.ell(23, 17, 5, 5, SkS);
      if (archer) { g.poly([[10, 15], [13, 6], [20, 3], [27, 6], [30, 15], [27, 10], [20, 8], [13, 10]], '#5a6a2a'); g.r(12, 9, 16, 2, '#3a4a18'); }
      g.r(13, 13, 3, 2, '#ffe14a'); g.p(14, 14, '#a01010'); g.r(24, 13, 3, 2, '#ffe14a'); g.p(25, 14, '#a01010');
      g.line(12, 11, 15, 12, 1, '#2a3a10'); g.line(27, 11, 24, 12, 1, '#2a3a10');
      g.r(18, 16, 3, 2, SkS); g.r(15, 19, 10, 1, '#3a1a10'); g.p(16, 18, '#fff'); g.p(23, 18, '#fff');
      if (!archer) {
        // club
        const a = st === 1 ? 3.0 : st === 2 ? 1.3 : 2.3 + k * 0.1, hx = 29, hy = 26, dx = Math.sin(a), dy = Math.cos(a);
        g.line(hx, hy, hx + dx * 11, hy + dy * 11, 2.6, '#7a5530');
        g.ell(hx + dx * 12, hy + dy * 12, 3.2, 3.2, '#8a6040'); g.p(Math.round(hx + dx * 13 + 2), Math.round(hy + dy * 13), '#d0d0d0'); g.p(Math.round(hx + dx * 11 - 2), Math.round(hy + dy * 12), '#d0d0d0');
        g.r(28, 24, 3, 4, Sk);
      } else {
        // bow on the right; drawn when aiming
        if (st === 1) { g.line(33, 14, 33, 36, 1, '#e8e0c8'); g.line(28, 25, 37, 25, 1, '#c8c8c8'); g.p(38, 25, '#e0e0e0'); g.r(28, 24, 3, 3, Sk); }
        else { g.line(31, 14, 31, 36, 1, '#e8e0c8'); g.r(28, 24, 3, 4, Sk); }
        const bx = st === 1 ? 36 : 34; g.line(bx - 2, 13, bx + 1, 18, 1.6, '#8a5a2a'); g.line(bx + 1, 18, bx + 1, 32, 1.6, '#8a5a2a'); g.line(bx + 1, 32, bx - 2, 37, 1.6, '#8a5a2a');
      }
    });
  }

  // ---------------------------------------------------------------
  //  BOSSES   pose: {f: frame 0..3, act: 0 idle / 1 attacking, p2: phase 2, look: 0..8, air}
  // ---------------------------------------------------------------
  const mirror = (g, w, fn) => { fn(v => v, 1); fn(v => w - v, -1); };
  // ---- shading helpers for the big bosses (light comes from the upper left) ----
  // C = {d: shadow, m: base, h: highlight}
  function blob(g, cx, cy, rx, ry, C, hl = 1) {
    g.ell(cx, cy, rx, ry, C.d);
    g.ell(cx - rx * 0.12, cy - ry * 0.14, rx * 0.86, ry * 0.84, C.m);
    if (hl) g.ell(cx - rx * 0.36, cy - ry * 0.42, Math.max(1, rx * 0.3), Math.max(1, ry * 0.22), C.h);
  }
  // a tapering, shaded tube through [x, y, r] points; opt.belly = {c, s} draws a plated belly, opt.scale dots the hide
  function tube(g, pts, C, opt = {}) {
    const S = [];
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0, r0] = pts[i - 1], [x1, y1, r1] = pts[i], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      for (let j = 0; j < n; j++) { const t = j / n; S.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t]); }
    }
    S.push(pts[pts.length - 1]);
    for (const [x, y, r] of S) g.ell(x, y, r, r, C.d);
    for (const [x, y, r] of S) g.ell(x - r * 0.14, y - r * 0.16, r * 0.8, r * 0.8, C.m);
    if (opt.belly) {
      for (const [x, y, r] of S) g.ell(x + r * 0.12, y + r * 0.26, r * (opt.belly.w || 0.4), r * 0.4, opt.belly.c);
      S.forEach(([x, y, r], i) => { const bw = opt.belly.w || 0.4; if (i % 4 === 0) g.r(Math.round(x + r * 0.12 - r * bw * 0.85), Math.round(y + r * 0.26), Math.max(1, Math.round(r * bw * 1.7)), 1, opt.belly.s); });
    }
    if (opt.scale) S.forEach(([x, y, r], i) => { if (i % 5 === 2 && r > 3) { g.p(Math.round(x + r * 0.45), Math.round(y - r * 0.3), C.d); g.p(Math.round(x - r * 0.2), Math.round(y - r * 0.55), C.d); } });
    S.forEach(([x, y, r], i) => { if (i % 2 === 0) g.ell(x - r * 0.5, y - r * 0.42, Math.max(0.8, r * 0.16), Math.max(0.8, r * 0.16), C.h); });
    return S;
  }
  // bevelled plate (metal / armour): light top + left edge, dark bottom + right edge
  function bevel(g, x, y, w, h, C) { g.r(x, y, w, h, C.m); g.r(x, y, w, 1, C.h); g.r(x, y, 1, h, C.h); g.r(x, y + h - 1, w, 1, C.d); g.r(x + w - 1, y, 1, h, C.d); }
  // a pointed fin / spike with a lit and a shaded side
  function spike(g, x, y, ang, len, w, C) {
    const tx = x + Math.cos(ang) * len, ty = y + Math.sin(ang) * len, nx = -Math.sin(ang) * w, ny = Math.cos(ang) * w;
    g.poly([[x + nx, y + ny], [tx, ty], [x - nx, y - ny]], C.m);
    g.poly([[x, y], [tx, ty], [x - nx, y - ny]], C.d);
    g.line(x + nx * 0.6, y + ny * 0.6, x + (tx - x) * 0.7 + nx * 0.2, y + (ty - y) * 0.7 + ny * 0.2, 1, C.h);
  }
  // one feather: shaft from (x, y) at angle ang; F = {m, d, tip}
  function feather(g, x, y, ang, len, w, F) {
    const tx = x + Math.cos(ang) * len, ty = y + Math.sin(ang) * len, mx = x + Math.cos(ang) * len * 0.55, my = y + Math.sin(ang) * len * 0.55, nx = -Math.sin(ang) * w, ny = Math.cos(ang) * w;
    g.poly([[x, y], [mx + nx, my + ny], [tx, ty], [mx - nx, my - ny]], F.m);
    g.poly([[x, y], [mx - nx, my - ny], [tx, ty]], F.d);
    if (F.tip) g.ell(x + Math.cos(ang) * len * 0.82, y + Math.sin(ang) * len * 0.82, w * 0.6, w * 0.6, F.tip);
    g.line(x, y, x + Math.cos(ang) * len * 0.9, y + Math.sin(ang) * len * 0.9, 1, F.d);
  }
  const BOSS = {
    kingslime(P) {
      const k = P.air ? 2 : P.f % 2;
      return mk('kslime' + k + (P.p2 ? 1 : 0), 92, 84, 46, 80, g => {
        const sq = [1, 1.05, 0.84][k], rx = 38 / sq, ry = 27 * sq, cy = 79 - ry * 0.95;
        g.ell(46, cy, rx, ry, '#2f9a4a'); g.r(Math.round(46 - rx + 6), 75, Math.round(rx * 2 - 12), 4, '#2f9a4a');
        g.ell(45, cy - 2, rx - 3, ry - 3, '#58d36b'); g.ell(42, cy - 6, rx - 10, ry - 10, '#6ee080');
        g.ell(30, cy - ry * 0.55, 6, 3, '#c8f8cc'); g.r(37, Math.round(cy - ry * 0.75), 3, 2, '#c8f8cc');
        for (const [bx, by] of [[62, cy + 6], [24, cy + 10], [58, cy - 10]]) g.ell(bx, by, 1.6, 1.6, '#9af0a8');
        const ey = Math.round(cy - 2), pc = P.p2 ? '#c01818' : EYE;
        for (const ex of [33, 59]) { g.ell(ex, ey, 5.5, 6.5, '#ffffff'); g.ell(ex + 1, ey + 1, 3, 3.8, pc); g.p(ex, ey - 1, '#ffffff'); }
        g.line(26, ey - 10, 37, ey - 7, 2, '#1f6a34'); g.line(66, ey - 10, 55, ey - 7, 2, '#1f6a34');
        g.ell(46, ey + 13, 10, 4.5, '#1f6a34'); g.ell(46, ey + 15, 5, 2.2, '#e86a7a'); g.r(40, ey + 10, 3, 2, '#fff'); g.r(49, ey + 10, 3, 2, '#fff');
        // crown
        const ct = Math.round(cy - ry + 2);
        g.r(31, ct - 6, 30, 8, '#f2c14e'); g.r(31, ct, 30, 2, '#c08a2a');
        for (let i = 0; i < 5; i++) { const px2 = 31 + i * 7; g.poly([[px2, ct - 6], [px2 + 3, ct - 15 + (i % 2) * 4], [px2 + 6, ct - 6]], '#f2c14e'); g.ell(px2 + 3, ct - 15 + (i % 2) * 4, 1.6, 1.6, i === 2 ? '#e04050' : '#f6e08a'); }
        g.ell(46, ct - 2, 2.6, 2.6, '#e04050'); g.ell(37, ct - 2, 1.8, 1.8, '#3a8ae0'); g.ell(55, ct - 2, 1.8, 1.8, '#3a8ae0'); g.r(32, ct - 5, 28, 1, '#fff2c0');
      });
    },
    treant(P) {
      const k = P.f % 2, act = P.act ? 1 : 0;
      return mk('treant' + k + act + (P.p2 ? 1 : 0), 108, 108, 54, 104, g => {
        const Bk = '#6a4a2a', BS = '#4a3018', BH = '#8a6a40', L1 = '#2a5a1a', L2 = '#3f7a2a', L3 = '#5a9a3a', L4 = '#8ac850';
        // roots
        for (const [x0, x1] of [[44, 26], [50, 40], [58, 70], [64, 84]]) g.poly([[x0 - 4, 92], [x1, 104], [x1 + 6, 104], [x0 + 4, 92]], BS);
        // branch arms
        const sw = act ? -14 : k * 3;
        mirror(g, 108, (X, m) => {
          g.line(X(40), 60, X(22), 50 + sw, 7, m > 0 ? Bk : BS); g.line(X(22), 50 + sw, X(10), 34 + sw * 1.4, 5, m > 0 ? Bk : BS);
          for (const [dx, dy] of [[-6, -4], [-2, -9], [4, -7]]) g.line(X(10), 34 + sw * 1.4, X(10 + dx), 34 + sw * 1.4 + dy, 2, BS);
          g.ell(X(8), 30 + sw * 1.4, 7, 5, L2); g.ell(X(10), 28 + sw * 1.4, 4, 3, L3);
        });
        // trunk
        g.poly([[38, 94], [40, 40], [68, 40], [70, 94]], Bk); g.poly([[58, 40], [68, 40], [70, 94], [60, 94]], BS); g.r(42, 44, 3, 46, BH);
        for (const [x, y, h] of [[48, 70, 20], [62, 48, 14], [52, 82, 10]]) g.r(x, y, 1, h, BS);
        // face
        const eg = P.p2 ? '#ff6a3a' : '#c8ff6a';
        g.ell(47, 58, 5, 6, '#1a1208'); g.ell(61, 58, 5, 6, '#1a1208'); g.ell(47, 59, 2, 2, eg); g.ell(61, 59, 2, 2, eg);
        g.line(40, 50, 51, 53, 2.4, BS); g.line(68, 50, 57, 53, 2.4, BS);
        g.poly([[46, 72], [62, 72], [60, 80], [56, 77], [54, 81], [51, 77], [48, 80]], '#1a1208');
        // canopy
        g.ell(54, 26, 36, 22, L1); g.ell(54, 22, 33, 19, L2);
        for (const [x, y, r] of [[30, 22, 11], [78, 22, 11], [54, 10, 13], [42, 28, 10], [66, 28, 10]]) g.ell(x, y, r, r * 0.8, L2);
        for (const [x, y, r] of [[34, 17, 6], [56, 6, 7], [74, 17, 6], [46, 22, 4], [62, 20, 4]]) g.ell(x, y, r, r * 0.7, L3);
        for (const [x, y] of [[30, 14], [52, 3], [72, 14], [44, 18]]) g.r(x, y, 3, 1, L4);
        for (const [x, y] of [[38, 34], [70, 30], [56, 36]]) { g.ell(x, y, 2.2, 2.2, '#e04040'); g.p(x - 1, y - 1, '#ffb0a0'); }
      });
    },
    goblinking(P) {
      const act = P.act ? 1 : 0, k = P.f % 2;
      return mk('gking' + act + k, 112, 100, 44, 96, (g, x) => {
        x.translate(0, 4);
        const Sk = '#86b84a', SkS = '#5a7a2e', SkH = '#b0d878', C = '#9a2a2a', CS = '#6a1818', F = '#f0ece0';
        g.poly([[24, 40], [64, 40], [72, 88], [16, 88]], C); g.poly([[52, 40], [64, 40], [72, 88], [56, 88]], CS);
        g.r(28, 76 - k, 10, 12, Sk); g.r(50, 76, 10, 12, SkS); g.r(26, 86, 14, 4, '#4a3018'); g.r(48, 86, 14, 4, '#4a3018');
        g.ell(44, 64, 20, 16, '#7a5a30'); g.ell(42, 66, 13, 12, SkH); g.r(24, 70, 40, 3, '#3a2410'); g.ell(44, 71, 3, 3, '#f2c14e');
        g.ell(44, 46, 22, 6, F); for (let i = 0; i < 8; i++) g.p(24 + i * 6, 46 + (i % 2), '#a8a090');
        g.r(18, 50, 7, 14, Sk); g.ell(21, 66, 5, 4, Sk);
        // head
        g.poly([[26, 26], [4, 16], [8, 26], [26, 34]], Sk); g.poly([[62, 26], [84, 16], [80, 26], [62, 34]], SkS); g.p(10, 21, '#c87a6a'); g.p(78, 21, '#c87a6a');
        g.ell(44, 28, 19, 15, Sk); g.ell(51, 31, 11, 11, SkS); g.ell(38, 22, 8, 5, SkH);
        g.r(31, 25, 7, 4, '#ffe14a'); g.r(50, 25, 7, 4, '#ffe14a'); g.r(34, 26, 2, 3, '#a01010'); g.r(53, 26, 2, 3, '#a01010');
        g.line(29, 21, 38, 24, 2.4, '#2a3a10'); g.line(59, 21, 50, 24, 2.4, '#2a3a10');
        g.r(41, 31, 6, 4, SkS); g.r(33, 37, 22, 3, '#3a1a10'); g.poly([[35, 38], [37, 32], [39, 38]], '#fff'); g.poly([[49, 38], [51, 32], [53, 38]], '#fff');
        // crown
        g.r(32, 9, 24, 6, '#f2c14e'); for (let i = 0; i < 3; i++) g.poly([[32 + i * 8, 9], [36 + i * 8, 1], [40 + i * 8, 9]], '#f2c14e'); g.ell(44, 12, 2, 2, '#e04050'); g.r(32, 14, 24, 1, '#c08a2a');
        // spiked club
        const a = act ? 3.1 : 2.2 + k * 0.08, hx = 68, hy = 56, dx = Math.sin(a), dy = Math.cos(a);
        g.line(hx, hy, hx + dx * 22, hy + dy * 22, 4.4, '#7a5530');
        g.ell(hx + dx * 26, hy + dy * 26, 7, 7, '#8a6040'); g.ell(hx + dx * 25 - 2, hy + dy * 25 - 2, 3, 3, '#a87a50');
        for (let i = 0; i < 6; i++) { const b = i / 6 * 6.283; g.poly([[hx + dx * 26 + Math.cos(b) * 6, hy + dy * 26 + Math.sin(b) * 6], [hx + dx * 26 + Math.cos(b) * 10, hy + dy * 26 + Math.sin(b) * 10], [hx + dx * 26 + Math.cos(b + 0.4) * 6, hy + dy * 26 + Math.sin(b + 0.4) * 6]], '#d0d0d8'); }
        g.ell(68, 56, 5, 5, Sk); g.r(63, 48, 8, 8, Sk);
      });
    },
    spiderqueen(P) {
      const k = P.f % 2, act = P.act ? 1 : 0;
      return mk('squeen' + k + act + (P.p2 ? 1 : 0), 112, 92, 56, 86, g => {
        const L = '#2a3048', LH = '#4a5478';
        for (let i = 0; i < 4; i++) mirror(g, 112, (X, m) => {
          const sh = ((i + (m > 0 ? k : 1 - k)) % 2 ? 2 : -2) - (act && i === 0 ? 14 : 0);
          const kx = 30 - i * 3, ky = 30 + i * 6 + sh;
          g.line(X(46), 48 + i * 3, X(kx), ky - 10, 3.6, L); g.line(X(kx), ky - 10, X(6 + i * 4), 70 + i * 4 + sh, 3, L); g.ell(X(kx), ky - 10, 2.4, 2.4, LH);
        });
        // crystal abdomen
        g.ell(56, 64, 24, 18, '#3a4060'); g.ell(50, 58, 12, 7, LH);
        for (const [x, y, h, c] of [[42, 58, 16, '#7ad8ff'], [52, 54, 22, '#c8f4ff'], [62, 56, 18, '#7ad8ff'], [70, 62, 12, '#9fe8ff'], [48, 66, 10, '#c8f4ff']]) { g.poly([[x - 4, y], [x, y - h], [x + 4, y]], c); g.line(x - 1, y - 2, x - 1, y - h + 4, 1, '#ffffff'); }
        // head + tiara
        g.ell(56, 38, 15, 13, L); g.ell(52, 34, 6, 4, LH);
        const ec = P.p2 ? '#ffffff' : '#ff4060';
        for (const [ex, ey, r] of [[50, 36, 2.6], [62, 36, 2.6], [46, 41, 1.8], [66, 41, 1.8], [53, 42, 1.4], [59, 42, 1.4]]) g.ell(ex, ey, r, r, ec);
        g.poly([[50, 48], [52, 56], [54, 49]], '#e8e8f0'); g.poly([[62, 48], [60, 56], [58, 49]], '#e8e8f0');
        g.r(44, 24, 24, 3, '#c8d8f0'); for (const [x, h] of [[46, 6], [52, 9], [56, 13], [60, 9], [66, 6]]) g.poly([[x - 2, 24], [x, 24 - h], [x + 2, 24]], '#c8d8f0'); g.ell(56, 18, 2, 2, '#e04080');
      });
    },
    lich(P) {
      const k = P.f % 3, act = P.act ? 1 : 0;
      return mk('lich' + k + act + (P.p2 ? 1 : 0), 84, 104, 42, 98, g => {
        const R = '#2a1a48', RS = '#180c2c', RH = '#4a3478', G = '#f2c14e', Bn = '#e8e2cf', E = P.p2 ? '#ff5aa0' : '#b48cff';
        // robe with tattered hem
        g.poly([[28, 34], [56, 34], [68, 88], [16, 88]], R); g.poly([[46, 34], [56, 34], [68, 88], [50, 88]], RS);
        for (let i = 0; i < 7; i++) g.poly([[16 + i * 7.4, 87], [19.7 + i * 7.4, 95 + ((i + k) % 3) * 2], [23.4 + i * 7.4, 87]], i % 2 ? RS : R);
        g.r(40, 36, 4, 50, G); g.r(20, 80, 44, 2, G);
        // arms + staff
        const ay = act ? -10 : 0;
        g.poly([[26, 38], [14, 52 + ay], [20, 56 + ay], [30, 46]], RH); g.ell(15, 55 + ay, 3, 3, Bn);
        g.poly([[58, 38], [70, 52 + ay], [64, 56 + ay], [54, 46]], R); g.ell(69, 55 + ay, 3, 3, Bn);
        g.line(72, 92 + ay, 72, 16 + ay, 2.4, '#4a3020'); g.ell(72, 14 + ay, act ? 6 : 4.5, act ? 6 : 4.5, E); g.ell(71, 13 + ay, 2, 2, '#ffffff');
        g.line(68, 22 + ay, 76, 22 + ay, 2, Bn); g.p(68, 20 + ay, Bn); g.p(76, 20 + ay, Bn);
        // hood + skull
        g.ell(42, 26, 15, 15, R); g.ell(42, 29, 10, 11, '#0c0614');
        g.ell(42, 29, 8, 8, Bn); g.r(37, 35, 10, 4, Bn); for (const tx of [38, 40, 42, 44, 46]) g.p(tx, 36, '#2a2026');
        g.ell(39, 28, 2.4, 2.6, '#140a1e'); g.ell(46, 28, 2.4, 2.6, '#140a1e'); g.p(39, 28, E); g.p(46, 28, E); g.p(42, 32, '#2a2026');
        g.r(32, 13, 20, 3, G); for (const x of [34, 42, 50]) g.poly([[x - 2, 13], [x, 8], [x + 2, 13]], G); g.p(42, 14, '#e04080');
      });
    },
    dragon(P) {
      const key = 'drg' + [P.f % 4, P.act ? 1 : 0, P.p2 ? 1 : 0].join('');
      let s = cache.get(key);
      if (!s) { s = { c: dragon({ flap: [-1, -0.25, 1, 0.25][P.f % 4], open: P.act ? 1 : 0, firing: !!P.act, rage: !!P.p2, breath: P.act ? 0 : 0.5 }), ax: 52, ay: 76 }; cache.set(key, s); }
      return s;
    },
    icequeen(P) {
      const k = P.f % 3, act = P.act ? 1 : 0;
      return mk('iceq' + k + act + (P.p2 ? 1 : 0), 84, 108, 42, 102, g => {
        const D = '#b8e8ff', DS = '#7ab8e0', DH = '#eaf8ff', Sk = '#e8f4ff', Hr = '#d8f0ff', HS = '#a8d0f0', C = '#9fe8ff';
        // gown
        g.poly([[32, 44], [52, 44], [72, 94], [12, 94]], D); g.poly([[46, 44], [52, 44], [72, 94], [54, 94]], DS);
        for (let i = 0; i < 8; i++) g.ell(14 + i * 8, 94 + ((i + k) % 3), 4.4, 3, i % 2 ? DS : DH);
        for (const [x, y] of [[28, 70], [44, 80], [58, 66], [36, 88]]) { g.r(x - 2, y, 5, 1, '#ffffff'); g.r(x, y - 2, 1, 5, '#ffffff'); }
        g.r(34, 44, 16, 10, DH); g.r(40, 46, 4, 6, C);
        // hair (long, behind)
        g.poly([[26, 22], [58, 22], [62, 60], [52, 52], [42, 58], [32, 52], [22, 60]], Hr); g.poly([[50, 22], [58, 22], [62, 60], [52, 52]], HS);
        // arms + scepter
        const ay = act ? -8 : 0;
        g.line(32, 46, 22, 58 + ay, 3, Sk); g.line(52, 46, 64, 56 + ay, 3, Sk);
        g.line(66, 90 + ay, 66, 22 + ay, 2, '#c8d8f0');
        g.poly([[66, 10 + ay], [71, 18 + ay], [66, 26 + ay], [61, 18 + ay]], C); g.p(65, 15 + ay, '#ffffff');
        if (act) for (const [dx, dy] of [[-8, 0], [8, 0], [0, -10], [0, 14]]) g.p(66 + dx, 18 + ay + dy, '#ffffff');
        // face
        g.ell(42, 32, 10, 11, Sk); g.r(33, 22, 18, 5, Hr); g.p(34, 27, Hr); g.p(50, 27, Hr);
        const ec = P.p2 ? '#ff4a8a' : '#3a6a9a';
        g.r(37, 31, 3, 2, ec); g.r(45, 31, 3, 2, ec); g.p(37, 30, '#1a2a4a'); g.p(47, 30, '#1a2a4a'); g.r(41, 38, 3, 1, '#9a6aa8');
        // crown
        g.r(32, 19, 20, 3, C); for (const [x, h] of [[33, 6], [37, 9], [42, 15], [47, 9], [51, 6]]) g.poly([[x - 2, 20], [x, 20 - h], [x + 2, 20]], C); g.p(42, 8, '#ffffff');
      });
    },
    thunderbird(P) {
      const k = P.f % 4;
      return mk('tbird' + k + (P.p2 ? 1 : 0), 120, 92, 60, 86, g => {
        const W = '#3a5ad8', WS = '#24389a', Y = '#ffe14a', YS = '#d8a020', O = '#ff9a2a';
        const o = [-14, -4, 10, -4][k];
        mirror(g, 120, (X, m) => {
          g.poly([[X(50), 40], [X(28), 22 + o], [X(4), 18 + o * 1.4], [X(10), 30 + o], [X(2), 34 + o * 1.2], [X(12), 42 + o * 0.8], [X(6), 50 + o * 0.6], [X(20), 52 + o * 0.4], [X(34), 56], [X(48), 56]], m > 0 ? W : WS);
          g.line(X(46), 42, X(30), 34 + o * 0.6, 1.4, Y); g.line(X(30), 34 + o * 0.6, X(26), 42 + o * 0.5, 1.4, Y); g.line(X(26), 42 + o * 0.5, X(12), 38 + o * 0.9, 1.4, Y);
        });
        // tail feathers
        g.poly([[52, 64], [46, 84], [54, 80], [60, 88], [66, 80], [74, 84], [68, 64]], WS);
        // body + talons
        g.ell(60, 54, 15, 18, Y); g.ell(64, 56, 8, 14, YS); for (let yy = 48; yy < 68; yy += 4) g.r(54, yy, 10, 1, YS);
        for (const m of [-1, 1]) { g.r(60 + m * 6 - 1, 70, 3, 6, O); g.poly([[60 + m * 6 - 3, 76], [60 + m * 6 + 4, 76], [60 + m * 6 + 2, 80]], '#fff6d0'); }
        // head
        g.ell(60, 32, 11, 10, Y); g.ell(64, 34, 6, 7, YS);
        g.poly([[52, 24], [50, 10], [56, 20], [60, 6], [63, 20], [70, 10], [68, 24]], W);
        g.poly([[56, 36], [64, 36], [60, 46]], O); g.poly([[60, 41], [64, 36], [60, 46]], '#c86a10');
        const ec = P.p2 ? '#ff3a3a' : '#1a1420';
        g.r(53, 30, 4, 3, '#ffffff'); g.r(63, 30, 4, 3, '#ffffff'); g.r(54, 31, 2, 2, ec); g.r(64, 31, 2, 2, ec);
        g.line(51, 27, 57, 29, 1.6, WS); g.line(69, 27, 63, 29, 1.6, WS);
      });
    },
    deathknight(P) {
      const act = P.act ? 1 : 0, k = P.f % 2;
      return mk('dknight' + act + k + (P.p2 ? 1 : 0), 96, 108, 46, 104, g => {
        const A = '#2a2a3a', AS = '#1a1a26', AH = '#4a4a62', T = '#c8ccd8', C = '#6a0a14', E = P.p2 ? '#ff2a4a' : '#ff8a3a';
        g.poly([[28, 36], [60, 36], [70, 96], [62, 90], [54, 98], [44, 90], [34, 98], [26, 90], [18, 96]], C);
        g.r(32, 78, 10, 18, AS); g.r(50, 78, 10, 18, AS); g.r(30, 94, 14, 4, A); g.r(48, 94, 14, 4, A); g.r(32, 80, 10, 2, T); g.r(50, 80, 10, 2, T);
        g.r(28, 42, 36, 38, A); g.r(54, 42, 10, 38, AS); g.r(30, 44, 4, 14, AH); g.r(28, 64, 36, 3, T); g.r(43, 46, 6, 14, '#5a0a14');
        for (const m of [-1, 1]) { const sx = m < 0 ? 16 : 60; g.r(sx, 36, 18, 12, AH); g.r(sx, 46, 18, 2, T); g.poly([[sx + (m < 0 ? 2 : 14), 36], [sx + (m < 0 ? -4 : 20), 26], [sx + (m < 0 ? 8 : 10), 36]], T); }
        g.r(18, 48, 9, 20, A); g.r(18, 66, 9, 6, AH);
        // helmet + horns
        g.r(32, 12, 28, 26, A); g.r(52, 12, 8, 26, AS); g.r(34, 14, 5, 8, AH);
        g.r(34, 22, 24, 5, '#08080c'); g.r(37, 23, 6, 2, E); g.r(49, 23, 6, 2, E); g.r(44, 28, 4, 8, '#08080c');
        mirror(g, 92, (X, m) => { g.line(X(34), 16, X(24), 8, 4, T); g.line(X(24), 8, X(24), -2 + 6, 3, T); g.line(X(24), 4, X(28), 0, 2, T); });
        // greatsword
        const a = act ? 3.0 : 0.25 + k * 0.03, hx = 70, hy = 62, dx = Math.sin(a), dy = Math.cos(a), nx = dy, ny = -dx;
        g.poly([[hx + dx * 4 + nx * 3.4, hy + dy * 4 + ny * 3.4], [hx + dx * 38 + nx * 3, hy + dy * 38 + ny * 3], [hx + dx * 44, hy + dy * 44], [hx + dx * 38 - nx * 3, hy + dy * 38 - ny * 3], [hx + dx * 4 - nx * 3.4, hy + dy * 4 - ny * 3.4]], '#b8bcc8');
        g.line(hx + dx * 6, hy + dy * 6, hx + dx * 36, hy + dy * 36, 1, '#ffffff');
        g.line(hx + nx * 8, hy + ny * 8, hx - nx * 8, hy - ny * 8, 3, '#8a1a24'); g.line(hx - dx * 6, hy - dy * 6, hx, hy, 2.6, '#2a1a1a');
        g.r(64, 52, 10, 14, A); g.ell(70, 62, 4, 4, AH);
      });
    },
    kraken(P) {
      const k = P.f % 4, act = P.act ? 1 : 0;
      return mk('kraken' + k + act + (P.p2 ? 1 : 0), 112, 104, 56, 98, g => {
        const B = '#a85ad8', S = '#6a2a9a', H = '#d8a0f8', Su = '#f0d0ff';
        for (let i = 0; i < 8; i++) {
          const a0 = (i / 7) * Math.PI, side = Math.cos(a0), wv = Math.sin(k * 1.57 + i * 1.3) * 5 - (act && i % 2 ? 14 : 0);
          const pts = [[56 + side * 10, 66], [56 + side * 28, 74 + wv * 0.5], [56 + side * 40, 82 + wv], [56 + side * 46, 70 + wv * 1.5], [56 + side * 44, 60 + wv * 2]];
          for (let j = 1; j < pts.length; j++) g.line(pts[j - 1][0], pts[j - 1][1], pts[j][0], pts[j][1], 8 - j * 1.4, i % 2 ? S : B);
          for (let j = 1; j < 4; j++) g.p(Math.round(pts[j][0]), Math.round(pts[j][1] + 2), Su);
        }
        g.ell(56, 40, 26, 32, B); g.ell(64, 44, 14, 26, S); g.ell(48, 26, 10, 12, H);
        for (const [x, y, r] of [[44, 18, 2.4], [64, 22, 2], [52, 48, 1.8], [40, 40, 1.6]]) g.ell(x, y, r, r, S);
        const ec = P.p2 ? '#ff4a4a' : '#ffe14a';
        for (const ex of [46, 66]) { g.ell(ex, 58, 6, 5, ec); g.r(ex - 1, 55, 2, 7, '#200'); g.p(ex - 2, 56, '#fff'); }
        g.line(38, 51, 50, 54, 2, S); g.line(74, 51, 62, 54, 2, S);
        g.ell(56, 70, 5, 3, '#3a0a4a');
      });
    },
    pharaoh(P) {
      const act = P.act ? 1 : 0, k = P.f % 2;
      return mk('phar' + act + k + (P.p2 ? 1 : 0), 88, 108, 44, 104, g => {
        const G = '#f2c14e', GS = '#c08a2a', Bl = '#2a4aa8', L = '#e8dcc0', LS = '#b8a888', E = P.p2 ? '#ff4a3a' : '#3ad8ff';
        g.poly([[30, 52], [58, 52], [66, 100], [22, 100]], L); g.poly([[48, 52], [58, 52], [66, 100], [50, 100]], LS);
        for (let i = 0; i < 6; i++) g.line(24, 60 + i * 7, 64, 62 + i * 7, 1, LS);
        g.r(38, 52, 12, 46, Bl); g.r(40, 52, 2, 46, '#4a6ad8'); g.r(24, 96, 40, 4, G);
        // collar
        g.ell(44, 50, 18, 8, G); g.ell(44, 50, 14, 5.5, '#3ad8a0'); g.ell(44, 50, 10, 3.5, '#e04050'); g.ell(44, 49, 6, 2, G);
        // arms + crook & flail
        const ay = act ? -12 : 0;
        g.line(28, 54, 22, 66 + ay, 4, L); g.line(60, 54, 66, 66 + ay, 4, L);
        g.line(20, 74 + ay, 26, 50 + ay, 2, G); g.line(26, 50 + ay, 30, 46 + ay, 2, G); g.line(30, 46 + ay, 30, 50 + ay, 2, G);
        g.line(68, 74 + ay, 64, 54 + ay, 2, G); for (const dx of [-3, 0, 3]) g.line(64, 54 + ay, 64 + dx * 2, 46 + ay + Math.abs(dx), 1.4, Bl);
        // nemes
        g.poly([[24, 24], [64, 24], [68, 52], [58, 48], [30, 48], [20, 52]], G);
        for (let i = 0; i < 5; i++) g.r(22 + (i < 2 ? i : 0), 30 + i * 4, 44, 2, Bl);
        g.ell(44, 20, 18, 12, G); for (let i = 0; i < 4; i++) g.r(28, 12 + i * 4, 32, 1.4, Bl);
        g.ell(44, 30, 10, 12, '#e8c060'); g.ell(47, 32, 6, 9, '#c89a40');
        g.r(37, 27, 5, 2, '#1a1a3a'); g.r(46, 27, 5, 2, '#1a1a3a'); g.r(38, 27, 2, 2, E); g.r(48, 27, 2, 2, E);
        g.r(43, 30, 2, 5, '#c89a40'); g.r(41, 37, 6, 1, '#8a5a2a'); g.r(42, 40, 4, 8, Bl); g.r(42, 40, 4, 1, G);
        g.poly([[42, 10], [44, 4], [46, 10]], G); g.ell(44, 12, 2, 2, '#e04050');
      });
    },
    clockmachine(P) {
      const k = P.f % 4, act = P.act ? 1 : 0;
      return mk('clock' + k + act + (P.p2 ? 1 : 0), 104, 108, 52, 104, g => {
        const Br = '#c9a24a', BrS = '#8a6a30', BrH = '#f0d080', Cu = '#b06a3a', Fc = '#f3ecda', Dk = '#3a2a1a';
        const gear = (cx, cy, r, ph) => { for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + ph; g.r(Math.round(cx + Math.cos(a) * r - 2), Math.round(cy + Math.sin(a) * r - 2), 4, 4, BrS); } g.ell(cx, cy, r, r, Cu); g.ell(cx, cy, r * 0.4, r * 0.4, BrS); };
        g.r(36, 84, 12, 16, BrS); g.r(56, 84, 12, 16, BrS); g.r(33, 98, 18, 4, Dk); g.r(53, 98, 18, 4, Dk);
        gear(22, 34, 10, k * 0.39); gear(82, 34, 10, -k * 0.39);
        const ay = act ? -12 : 0;
        for (const m of [-1, 1]) { const x0 = m < 0 ? 10 : 84; g.r(x0, 44 + ay, 10, 22, BrS); g.r(x0 + 2, 46 + ay, 2, 18, BrH); g.poly([[x0 - 2, 66 + ay], [x0 + 5, 72 + ay], [x0 + 12, 66 + ay], [x0 + 9, 76 + ay], [x0 + 1, 76 + ay]], Cu); }
        g.ell(52, 58, 32, 30, Br); g.ell(52, 58, 28, 26, BrS); g.ell(52, 58, 25, 23, Fc);
        for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; g.r(Math.round(52 + Math.cos(a) * 20 - 1), Math.round(58 + Math.sin(a) * 18 - 1), i % 3 ? 2 : 3, i % 3 ? 2 : 3, Dk); }
        const hm = k * 0.5 - 1.57, mm = k * 1.57 - 1.57;
        g.line(52, 58, 52 + Math.cos(hm) * 11, 58 + Math.sin(hm) * 10, 2.6, Dk); g.line(52, 58, 52 + Math.cos(mm) * 17, 58 + Math.sin(mm) * 16, 1.6, Dk);
        g.ell(52, 58, 3, 3, P.p2 ? '#ff3b4a' : Br);
        // head dome + lamp eye
        g.ell(52, 24, 14, 12, Br); g.r(38, 24, 28, 8, Br); g.ell(47, 18, 4, 3, BrH);
        g.r(40, 24, 24, 6, Dk); g.ell(52, 27, 4, 3, P.p2 || act ? '#ff3b4a' : '#ffb03a'); g.p(51, 26, '#ffffff');
        g.r(50, 6, 4, 6, BrS); g.ell(52, 6, 3, 2, Cu);
        g.r(26, 22, 6, 4, BrS); g.r(72, 22, 6, 4, BrS); if (k % 2) { g.ell(24, 14, 4, 3, '#e8e8f0'); g.ell(80, 12, 3, 3, '#e8e8f0'); }
      });
    },
    voideye(P) {
      const k = P.f % 3, look = P.look == null ? 8 : P.look;
      return mk('void' + k + look + (P.p2 ? 1 : 0), 104, 100, 52, 94, g => {
        const T = '#5a2a8a', TS = '#3a1a5a';
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * 6.283 + 0.3, wv = Math.sin(k * 2.1 + i) * 0.25;
          const p1 = [52 + Math.cos(a) * 30, 48 + Math.sin(a) * 30], p2 = [52 + Math.cos(a + 0.4 + wv) * 42, 48 + Math.sin(a + 0.4 + wv) * 40], p3 = [52 + Math.cos(a + 0.2 - wv) * 50, 48 + Math.sin(a + 0.2 - wv) * 46];
          g.line(p1[0], p1[1], p2[0], p2[1], 6, i % 2 ? T : TS); g.line(p2[0], p2[1], p3[0], p3[1], 4, i % 2 ? T : TS); g.ell(p3[0], p3[1], 2.4, 2.4, '#c86bff');
        }
        g.ell(52, 48, 32, 32, '#d8c8f0'); g.ell(50, 46, 30, 30, '#f0e8ff'); g.ell(42, 36, 8, 5, '#ffffff');
        for (const [a, l] of [[0.4, 12], [1.6, 10], [2.6, 13], [3.7, 9], [4.9, 12], [5.6, 8]]) g.line(52 + Math.cos(a) * 30, 48 + Math.sin(a) * 30, 52 + Math.cos(a + 0.15) * (30 - l), 48 + Math.sin(a + 0.15) * (30 - l), 1, '#d05a70');
        const la = look < 8 ? look / 8 * 6.283 : 0, lr = look < 8 ? 9 : 0;
        const ix = 52 + Math.cos(la) * lr, iy = 48 + Math.sin(la) * lr * 0.8;
        g.ell(ix, iy, 15, 15, P.p2 ? '#ff3a6a' : '#c86bff'); g.ell(ix, iy, 11, 11, P.p2 ? '#c01040' : '#8a3ad8');
        g.ell(ix, iy, 3, 10, '#100820'); g.ell(ix - 5, iy - 5, 2.4, 2, '#ffffff');
      });
    },
    cerberus(P) {
      const act = P.act ? 1 : 0, k = P.f % 2;
      return mk('cerb' + act + k + (P.p2 ? 1 : 0), 116, 100, 58, 96, g => {
        const B = '#3a1a14', BS = '#24100c', M = '#c8402a', MS = '#8a2a1a', E = P.p2 ? '#ffffff' : '#ffe14a';
        g.line(84, 70, 102, 56 - k * 3, 6, B); g.ell(104, 52 - k * 3, 4, 6, '#ff8a2a'); g.ell(104, 50 - k * 3, 2, 3, '#ffe14a');
        g.ell(58, 70, 30, 20, B); g.ell(66, 74, 16, 14, BS);
        for (const x of [36, 48, 68, 80]) { g.r(x - 4, 80, 8, 14, x > 58 ? BS : B); g.poly([[x - 5, 94], [x + 5, 94], [x + 3, 97], [x - 3, 97]], '#1a0806'); for (const c of [-3, 0, 3]) g.p(x + c, 96, '#e8e0d0'); }
        const head = (hx, hy, s) => {
          g.ell(hx, hy + 6 * s, 16 * s, 10 * s, M);
          for (const m of [-1, 1]) g.poly([[hx + m * 6 * s, hy - 8 * s], [hx + m * 12 * s, hy - 20 * s], [hx + m * 14 * s, hy - 4 * s]], B);
          g.ell(hx, hy, 12 * s, 11 * s, B); g.ell(hx + 4 * s, hy + 2 * s, 6 * s, 8 * s, BS);
          g.ell(hx, hy + 9 * s, 8 * s, 5 * s, B);
          g.r(Math.round(hx - 7 * s), Math.round(hy - 3 * s), 3, 2, E); g.r(Math.round(hx + 4 * s), Math.round(hy - 3 * s), 3, 2, E);
          if (act) { g.ell(hx, hy + 12 * s, 6 * s, 4 * s, '#2a0606'); g.ell(hx, hy + 12 * s, 3.4 * s, 2.4 * s, '#ffb030'); g.p(Math.round(hx - 4 * s), Math.round(hy + 9 * s), '#fff'); g.p(Math.round(hx + 4 * s), Math.round(hy + 9 * s), '#fff'); }
          else { g.r(Math.round(hx - 5 * s), Math.round(hy + 11 * s), Math.round(10 * s), 1, '#1a0806'); g.p(Math.round(hx - 3 * s), Math.round(hy + 12 * s), '#fff'); g.p(Math.round(hx + 3 * s), Math.round(hy + 12 * s), '#fff'); }
          g.ell(hx, hy + 6 * s, 2, 1.4, '#1a0806');
          for (let i = 0; i < 5; i++) g.r(Math.round(hx - 12 * s + i * 6 * s), Math.round(hy + 15 * s), 3, 2, '#8a8a9a');
        };
        head(28, 46 + k, 0.85); head(88, 46 - k, 0.85); head(58, 34, 1.05);
        g.r(44, 56, 28, 3, MS);
      });
    },
    leviathan(P) {
      const k = P.f % 4, act = P.act ? 1 : 0, p2 = P.p2 ? 1 : 0;
      return mk('levi' + k + act + p2, 132, 116, 66, 108, g => {
        const C = { d: '#123a7a', m: '#2a6ac8', h: '#8ac4ff' }, Fn = { d: '#0d6a74', m: '#2ad0c8', h: '#b0fff6' }, BL = { c: '#a8d0f0', s: '#5a8ac0', w: 0.42 };
        const E = p2 ? '#ff4a3a' : '#ffe14a', sw = [0, 1, 0, -1][k];
        // water
        g.ell(66, 106, 64, 9, '#0c2e5a'); g.ell(66, 104, 60, 6.5, '#1f64b0'); g.ell(60, 103, 44, 3.5, '#3a8ad8');
        // two back coils arching out of the water, with fins along the crest
        for (const [cx, w, hh, rr] of [[26, 16, 30, 8], [106, 14, 24, 7]]) {
          const pts = []; for (let i = 0; i <= 12; i++) { const a = Math.PI * i / 12; pts.push([cx - Math.cos(a) * w, 104 - Math.sin(a) * hh, rr - Math.abs(i - 6) * 0.18]); }
          for (let i = 2; i <= 10; i += 2) { const a = Math.PI * i / 12; spike(g, cx - Math.cos(a) * w, 104 - Math.sin(a) * hh - rr + 2, -Math.PI / 2 - Math.cos(a) * 0.6, 8, 2.6, Fn); }
          tube(g, pts, C, { scale: true });
        }
        // the neck rises in an S, fins down its back
        const neck = [[60, 106, 17], [70, 94, 16], [77, 82, 14.5], [74, 70, 13], [66 + sw, 60, 12], [61 + sw, 51, 11], [63 + sw, 43, 10]];
        for (let i = 1; i < neck.length - 1; i++) { const [x, y, r] = neck[i]; spike(g, x + r * 0.7, y - 2, -0.35, 11, 3, Fn); }
        tube(g, neck, C, { belly: BL, scale: true });
        // splash where it breaks the surface
        for (let i = 0; i < 7; i++) { const x = 44 + i * 6, hgt = 4 + ((i + k) % 3) * 3; g.poly([[x - 2, 103], [x, 103 - hgt], [x + 2, 103]], '#d8f4ff'); }
        for (let i = 0; i < 8; i++) g.p(10 + i * 15 + (k % 2) * 4, 105 + (i % 2), '#e8faff');
        // head: frilled fins, horned brow, long snout toward us
        const hx = 63 + sw, hy = 30 - act * 3;
        for (const m of [-1, 1]) {
          const bx = hx + 9 * m, by = hy - 2;
          for (let j = 0; j < 4; j++) { const a = (m > 0 ? 0 : Math.PI) + (m > 0 ? -1 : 1) * (0.2 + j * 0.42); spike(g, bx, by, a, 18 - j * 2, 3.2, Fn); }
        }
        blob(g, hx, hy, 17, 12.5, C);
        g.poly([[hx - 9, hy + 1], [hx + 9, hy + 1], [hx + 6, hy + 12], [hx + 3, hy + 20], [hx - 3, hy + 20], [hx - 6, hy + 12]], C.m);
        g.poly([[hx + 1, hy + 1], [hx + 9, hy + 1], [hx + 6, hy + 12], [hx + 3, hy + 20], [hx + 1, hy + 20]], C.d);
        g.poly([[hx - 4, hy + 6], [hx + 4, hy + 6], [hx + 2, hy + 18], [hx - 2, hy + 18]], '#3a80d8');
        g.line(hx - 7, hy + 3, hx - 4, hy + 15, 1, C.h); g.line(hx - 2, hy + 7, hx - 1, hy + 16, 1, C.h);
        g.r(hx - 3, hy + 16, 2, 1, '#06122a'); g.r(hx + 2, hy + 16, 2, 1, '#06122a');
        for (const m of [-1, 1]) g.line(hx + m * 8, hy + 3, hx + m * 5, hy + 12, 1, '#0a2a5a');
        for (const m of [-1, 1]) {
          g.poly([[hx + m * 3, hy - 4], [hx + m * 13, hy - 7], [hx + m * 12, hy - 3]], C.d); g.line(hx + m * 3, hy - 6, hx + m * 12, hy - 8, 1, C.h);   // brow ridge
          spike(g, hx + m * 6, hy - 9, -Math.PI / 2 + m * 0.5, 9, 2.2, { d: '#9ab8d0', m: '#e8f4ff', h: '#ffffff' });   // horns
          g.ell(hx + m * 8, hy - 1, 4, 3, '#06122a'); g.ell(hx + m * 8, hy - 1, 3.2, 2.4, E); g.r(hx + m * 8, hy - 3, 1, 4, '#160a08'); g.p(hx + m * 8 - 1, hy - 2, '#ffffff');
        }
        if (act) {
          g.ell(hx, hy + 20, 9, 6, '#061a34'); g.ell(hx, hy + 21, 5.5, 3.5, '#7ad0ff'); g.ell(hx, hy + 21, 2.5, 1.6, '#ffffff');
          for (const x of [-6, -3, 0, 3, 6]) { g.poly([[hx + x - 1, hy + 15], [hx + x, hy + 18], [hx + x + 1, hy + 15]], '#ffffff'); g.poly([[hx + x - 1, hy + 26], [hx + x, hy + 23], [hx + x + 1, hy + 26]], '#ffffff'); }
          g.ell(hx, hy + 27, 7, 2.5, C.d);
        } else { g.r(hx - 5, hy + 19, 10, 1, '#06122a'); for (const x of [-4, -1, 2]) g.p(hx + x, hy + 20, '#ffffff'); }
      }, '#06122a');
    },
    quetzal(P) {
      const k = P.f % 4, act = P.act ? 1 : 0, p2 = P.p2 ? 1 : 0;
      return mk('quet' + k + act + p2, 140, 116, 70, 108, g => {
        const C = { d: '#0f6a50', m: '#22b07c', h: '#8af4c8' }, BL = { c: '#e8cc60', s: '#a8822a', w: 0.34 };
        const BLU = { m: '#2a6ad8', d: '#163a8a', tip: '#7ad8ff' }, GRN = { m: '#1fb88a', d: '#0c6a4e', tip: '#f2c14e' }, GLD = { m: '#f2c14e', d: '#b0782a', tip: '#ffffff' }, RED = { m: '#e04a4a', d: '#8a1e22', tip: '#f2c14e' };
        const E = p2 ? '#ff3a3a' : '#ffe14a', flap = [-0.28, -0.1, 0.14, -0.1][k];
        // wings: primaries, secondaries, coverts, layered back to front
        mirror(g, 140, (X, m) => {
          const rx = X(80), ry = 50, A = a => m > 0 ? a : Math.PI - a;
          // the arm runs out along the top edge; feathers hang from it in rows
          const ex = rx + Math.cos(A(-0.78 + flap)) * 30, ey = ry + Math.sin(A(-0.78 + flap)) * 30;
          { // a dark underside so the feather rows read as one wing
            const pts = [[rx, ry]]; for (let i = 0; i <= 6; i++) { const t = i / 6, bx = rx + (ex - rx) * (0.35 + t * 0.65), by = ry + (ey - ry) * (0.35 + t * 0.65), a = A(-0.45 + t * 0.95 + flap * 0.4), L = (34 + t * 12) * 0.8; pts.push([bx + Math.cos(a) * L, by + Math.sin(a) * L]); }
            pts.push([rx + (ex - rx) * 0.2, ry + 10]); g.poly(pts, '#0c3a5a');
          }
          for (let i = 0; i < 7; i++) { const t = i / 6, bx = rx + (ex - rx) * (0.35 + t * 0.65), by = ry + (ey - ry) * (0.35 + t * 0.65); feather(g, bx, by, A(-0.45 + t * 0.95 + flap * 0.4), 34 + t * 12, 4.4, i % 2 ? BLU : GRN); }
          for (let i = 0; i < 6; i++) { const t = i / 5, bx = rx + (ex - rx) * (0.2 + t * 0.7), by = ry + (ey - ry) * (0.2 + t * 0.7) + 2; feather(g, bx, by, A(0.05 + t * 0.7 + flap * 0.3), 20 + t * 6, 3.4, GLD); }
          for (let i = 0; i < 5; i++) { const t = i / 4, bx = rx + (ex - rx) * (0.1 + t * 0.7), by = ry + (ey - ry) * (0.1 + t * 0.7) + 3; feather(g, bx, by, A(0.3 + t * 0.6), 11 + t * 3, 3, RED); }
          g.line(rx, ry, ex, ey, 4, C.d); g.line(rx, ry - 1, ex, ey - 1, 1.4, C.h); g.ell(ex, ey, 2.2, 2.2, '#f2c14e');
        });
        // body: an S coil from the tail tip up to the neck, feather tufts on the spine
        const body = [[28, 98, 2.5], [38, 104, 5], [54, 107, 8], [74, 106, 10], [92, 99, 11], [96, 87, 11], [86, 79, 11], [68, 79, 11], [54, 73, 10], [54, 63, 9.5], [63, 56, 9], [70, 48, 8.5], [70, 40, 8]];
        tube(g, body, C, { belly: BL, scale: true });
        for (let i = 3; i < body.length - 1; i++) { const [x, y, r] = body[i]; const F = [RED, GLD, BLU][i % 3]; feather(g, x + r * 0.2, y - r * 0.7, -Math.PI / 2 - 0.5 + (i % 2) * 0.9, 9, 2.4, F); }
        g.poly([[22, 96], [28, 98], [26, 103]], RED.m); g.poly([[24, 92], [29, 97], [21, 99]], GLD.m);   // tail plume
        // head: crest fan, beaked snout, golden eyes
        const hx = 70, hy = 28 - act * 3;
        for (let i = 0; i < 5; i++) feather(g, hx + (i - 2) * 2, hy - 6, -Math.PI / 2 + (i - 2) * 0.28, 17 - Math.abs(i - 2) * 2, 2.8, [GLD, RED, GLD, RED, GLD][i]);
        blob(g, hx, hy, 11, 9, C);
        g.poly([[hx - 6, hy + 2], [hx + 6, hy + 2], [hx + 3, hy + 14], [hx - 3, hy + 14]], C.m);
        g.poly([[hx + 1, hy + 2], [hx + 6, hy + 2], [hx + 3, hy + 14], [hx + 1, hy + 14]], C.d);
        g.poly([[hx - 3, hy + 12], [hx + 3, hy + 12], [hx, hy + 17]], '#f2c14e'); g.p(hx, hy + 15, '#b0782a');
        for (const m of [-1, 1]) {
          g.ell(hx + m * 5, hy - 1, 2.8, 2.2, E); g.r(hx + m * 5, hy - 2, 1, 3, '#140a04'); g.p(hx + m * 5 - 1, hy - 2, '#ffffff');
          g.line(hx + m * 2, hy - 4, hx + m * 9, hy - 5, 1.4, C.d);
          feather(g, hx + m * 7, hy + 6, Math.PI / 2 + m * 0.6, 8, 2, GLD);   // whisker plumes
        }
        if (act) { g.line(hx, hy + 16, hx, hy + 24, 1.4, '#e0507a'); g.line(hx, hy + 24, hx - 2, hy + 27, 1, '#e0507a'); g.line(hx, hy + 24, hx + 2, hy + 27, 1, '#e0507a'); }
      }, '#082a20');
    },
    hydra(P) {
      const k = P.f % 4, act = P.act ? 1 : 0, p2 = P.p2 ? 1 : 0;
      return mk('hydra' + k + act + p2, 132, 112, 66, 106, g => {
        const C = { d: '#1e5a1a', m: '#3e9a32', h: '#9ade6a' }, BL = { c: '#d0d890', s: '#98a058', w: 0.36 }, HN = { d: '#a89a70', m: '#e8e0c0', h: '#ffffff' };
        const E = p2 ? '#ff3a3a' : '#ffe14a';
        // tail curling out to the left, spiked
        const tail = [[44, 96, 10], [30, 99, 8], [18, 95, 6], [10, 87, 4.5], [8, 79, 3]];
        for (let i = 1; i < tail.length; i++) spike(g, tail[i][0], tail[i][1] - tail[i][2] + 1, -Math.PI / 2 - 0.3, 6, 2, HN);
        tube(g, tail, C, { scale: true });
        for (const x of [40, 92]) { blob(g, x, 98, 9, 8, C); for (const c of [-4, 0, 4]) spike(g, x + c, 104, Math.PI / 2, 4, 1.4, HN); }
        // body: scaled hide, pale belly, dorsal spikes
        for (const [x, y] of [[44, 74], [56, 70], [76, 70], [88, 74]]) spike(g, x, y, -Math.PI / 2 + (x - 66) * 0.012, 8, 2.6, HN);
        blob(g, 66, 86, 40, 19, C);
        g.ell(70, 93, 26, 8, BL.c); for (let x = 50; x < 92; x += 5) g.r(x, 88, 1, 9, BL.s);
        for (let r2 = 0; r2 < 3; r2++) for (let x = 34 + r2 * 4; x < 98 - r2 * 4; x += 8) { g.p(x + (r2 % 2) * 4, 75 + r2 * 4, C.d); g.p(x + 1 + (r2 % 2) * 4, 76 + r2 * 4, C.d); }
        for (const x of [46, 86]) { blob(g, x, 99, 8, 7, C); for (const c of [-3, 0, 3]) spike(g, x + c, 104, Math.PI / 2, 3.5, 1.3, HN); }
        // necks and heads (three, five when enraged)
        const heads = p2 ? [[-48, 34], [-26, 18], [0, 8], [26, 18], [48, 34]] : [[-34, 26], [0, 10], [34, 26]];
        heads.forEach(([dx, hy0], i) => {
          const sw = Math.sin(k * 1.57 + i * 1.9) * 3, hx = 66 + dx + sw, hy = hy0 - act * 4 + Math.round(Math.cos(k * 1.57 + i) * 2), bx = 66 + dx * 0.45;
          const neck = []; for (let j = 0; j <= 5; j++) { const t = j / 5; neck.push([bx + (hx - bx) * t + Math.sin(t * Math.PI) * dx * 0.18, 80 + (hy + 12 - 80) * t, 8 - t * 2.5]); }
          tube(g, neck, C, { belly: BL, scale: true });
          for (const m of [-1, 1]) spike(g, hx + m * 5, hy - 3, -Math.PI / 2 + m * 0.55, 8, 2, HN);
          blob(g, hx, hy + 2, 9, 7.5, C);
          g.poly([[hx - 6, hy + 4], [hx + 6, hy + 4], [hx + 4, hy + 14], [hx - 4, hy + 14]], C.m); g.poly([[hx + 1, hy + 4], [hx + 6, hy + 4], [hx + 4, hy + 14], [hx + 1, hy + 14]], C.d);
          for (const m of [-1, 1]) { g.ell(hx + m * 4, hy + 1, 2.2, 1.8, E); g.p(hx + m * 4, hy + 1, '#140a04'); g.line(hx + m * 1, hy - 1, hx + m * 7, hy - 2, 1, C.d); }
          g.p(hx - 2, hy + 12, '#0c2008'); g.p(hx + 2, hy + 12, '#0c2008');
          if (act) { g.ell(hx, hy + 16, 5, 4, '#2a0a1a'); g.ell(hx, hy + 17, 3, 2, '#b8f040'); for (const m of [-1, 1]) g.poly([[hx + m * 3, hy + 13], [hx + m * 2, hy + 17], [hx + m * 4, hy + 13]], '#ffffff'); g.line(hx + 1, hy + 19, hx + 1, hy + 23, 1, '#b8f040'); }
          else { g.r(hx - 4, hy + 14, 8, 1, '#0c2008'); for (const m of [-1, 1]) g.p(hx + m * 3, hy + 15, '#ffffff'); }
        });
      }, '#0c2008');
    },
    ghostcaptain(P) {
      const k = P.f % 4, act = P.act ? 1 : 0, p2 = P.p2 ? 1 : 0;
      return mk('gcap' + k + act + p2, 108, 116, 54, 112, g => {
        const GH = { d: '#4aa89a', m: '#8ae8d8', h: '#e0fff8' }, CO = { d: '#141c34', m: '#26385e', h: '#4a6a9a' }, G = '#f2c14e', GS = '#a8782a', R = '#9a2030', RS = '#5a1018', E = p2 ? '#ff4a6a' : '#7affd8';
        for (let i = 0; i < 6; i++) { const w = Math.sin(k * 1.57 + i * 1.3) * 3; g.ell(36 + i * 7 + w, 100 + (i % 2) * 4, 5, 8, i % 2 ? GH.d : GH.m); g.p(Math.round(35 + i * 7 + w), 96, GH.h); }
        g.poly([[34, 74], [74, 74], [80, 100], [28, 100]], GH.d); g.poly([[36, 74], [60, 74], [56, 98], [32, 98]], GH.m);
        g.poly([[36, 42], [72, 42], [82, 90], [74, 86], [70, 94], [62, 88], [54, 95], [46, 88], [38, 94], [34, 86], [26, 90]], CO.m);
        g.poly([[58, 42], [72, 42], [82, 90], [74, 86], [70, 94], [62, 88], [60, 60]], CO.d);
        g.poly([[36, 42], [44, 42], [32, 86], [28, 88]], CO.h);
        for (const x of [40, 66]) g.line(x, 60, x - (x < 54 ? 4 : -4), 86, 1, CO.d);
        g.poly([[48, 44], [60, 44], [58, 80], [50, 80]], '#e8e0d0'); g.poly([[55, 44], [60, 44], [58, 80], [55, 80]], '#b8b0a0');
        for (let y = 50; y < 78; y += 7) { g.p(47, y, G); g.p(61, y, G); }
        g.r(36, 63, 36, 4, '#3a2010'); g.r(36, 63, 36, 1, '#6a4020'); bevel(g, 51, 62, 7, 6, { d: GS, m: G, h: '#fff2c0' });
        g.poly([[38, 44], [44, 44], [64, 66], [58, 68]], R); g.poly([[44, 44], [64, 66], [60, 67]], RS);
        for (const x of [36, 72]) { g.ell(x, 44, 7, 3.5, G); g.ell(x - 1, 43, 5, 2, '#fff2c0'); for (let i = -5; i <= 5; i += 2) g.r(x + i, 46, 1, 4, GS); }
        tube(g, [[36, 46, 5], [30, 56, 4.5], [26, 64, 4]], CO); g.ell(26, 66, 3.5, 2.5, '#e8e0d0');
        g.line(26, 67, 26, 72, 2, '#c8ccd4'); g.line(26, 72, 22, 70, 2, '#c8ccd4'); g.p(26, 69, '#ffffff');
        const ay = act ? -18 : 0, cx = 84, cy = 62 + ay, ca = act ? -1.9 : -0.75;
        tube(g, [[72, 46, 5], [79, 54 + ay * 0.5, 4.5], [cx, cy, 4]], CO);
        const bx = cx + Math.cos(ca) * 24, by = cy + Math.sin(ca) * 24, nx = -Math.sin(ca), ny = Math.cos(ca);
        g.poly([[cx, cy], [bx + nx * 3, by + ny * 3], [bx, by], [cx + nx * 4, cy + ny * 4]], '#d8e8f0'); g.line(cx, cy, bx, by, 1, '#ffffff');
        g.ell(cx, cy, 4, 3.2, G); g.ell(cx - 1, cy - 1, 1.6, 1.2, '#fff2c0');
        blob(g, 54, 32, 12, 12, GH);
        g.poly([[43, 36], [65, 36], [61, 49], [54, 54], [47, 49]], '#d8ece8'); g.poly([[54, 38], [65, 36], [61, 49], [54, 54]], '#a8c8c0');
        for (let i = 0; i < 4; i++) g.line(47 + i * 4, 40, 48 + i * 4, 50 - Math.abs(i - 1.5), 1, '#a8c8c0');
        for (const m of [-1, 1]) { g.ell(54 + m * 5, 30, 3, 2.6, '#0a1a20'); g.r(54 + m * 5 - 1, 30, 2, 1, E); }
        g.r(50, 38, 8, 2, '#1a2a30');
        g.poly([[32, 22], [54, 11], [76, 22], [70, 25], [54, 20], [38, 25]], '#120e18'); g.poly([[38, 22], [44, 6], [64, 6], [70, 22]], '#2a2234'); g.poly([[54, 6], [64, 6], [70, 22], [54, 22]], '#1a1424');
        g.line(40, 22, 46, 8, 1, '#4a3e58'); g.r(38, 20, 32, 2, G); g.r(38, 20, 32, 1, '#fff2c0');
        g.ell(54, 13, 3.5, 3.2, '#e8e2cf'); g.p(53, 13, '#120e18'); g.p(55, 13, '#120e18'); g.line(50, 17, 58, 17, 1, '#e8e2cf');
        g.poly([[66, 8], [72, 2], [70, 12]], '#e8e0d0');
      }, '#081418');
    },
    cyclops(P) {
      const k = P.f % 2, act = P.act ? 1 : 0, p2 = P.p2 ? 1 : 0;
      return mk('cyc' + k + act + p2, 120, 124, 60, 120, g => {
        const S = { d: '#8a5a32', m: '#c8945e', h: '#f0c890' }, F = { d: '#3a2410', m: '#6a4a2a', h: '#9a7448' }, W = { d: '#5a3818', m: '#8a5a2a', h: '#b88a50' };
        const E = p2 ? '#ff3a2a' : '#ffe14a';
        tube(g, [[46, 86, 9], [44, 100, 8], [44, 112, 7.5]], S); tube(g, [[72, 86, 9], [74, 100, 8], [74, 112, 7.5]], S);
        for (const x of [44, 74]) { g.ell(x, 116, 11, 5, F.d); g.ell(x - 1, 115, 9, 3.5, F.m); for (let i = -8; i <= 8; i += 3) g.p(x + i, 119, F.d); }
        blob(g, 60, 68, 30, 26, S);
        blob(g, 50, 58, 11, 8, S); blob(g, 70, 58, 11, 8, S);
        g.ell(61, 80, 15, 10, S.m); for (const [x, y] of [[55, 75], [64, 75], [55, 82], [64, 82]]) { g.r(x, y, 4, 1, S.d); g.r(x, y - 1, 4, 1, S.h); }
        g.r(59, 62, 1, 22, S.d);
        g.poly([[32, 86], [88, 86], [92, 98], [84, 95], [80, 104], [72, 97], [66, 106], [58, 98], [52, 106], [46, 97], [38, 104], [34, 95], [28, 98]], F.m);
        for (let x = 34; x < 88; x += 4) g.line(x, 89, x + 1, 96 + (x % 8 ? 2 : 0), 1, F.d);
        g.r(32, 85, 56, 3, F.d); g.r(34, 85, 52, 1, F.h);
        tube(g, [[34, 56, 9], [26, 70, 8], [22, 82 - k, 7]], S); blob(g, 21, 86 - k, 7, 6, S);
        const ay = act ? -34 : 0, hx = 94, hy = 80 + ay;
        tube(g, [[84, 56, 9], [90, 68 + ay * 0.5, 8], [hx, hy, 7]], S);
        blob(g, 60, 34, 19, 17, S);
        for (const m of [-1, 1]) blob(g, 60 + m * 18, 36, 3.5, 4.5, S, 0);
        g.poly([[42, 24], [48, 12], [54, 18], [60, 10], [66, 18], [72, 12], [78, 24], [60, 20]], F.m); g.poly([[48, 14], [54, 18], [60, 12], [60, 20]], F.h);
        spike(g, 60, 16, -Math.PI / 2, 10, 3, { d: '#a89a70', m: '#e8dcc0', h: '#ffffff' });
        g.ell(60, 31, 10, 8.5, S.d); g.ell(60, 31, 9, 7.5, '#ffffff'); g.ell(60, 31, 5.5, 5.5, E); g.ell(60, 31, 2.2, 3.5, '#1a0a04'); g.p(57, 28, '#ffffff'); g.p(58, 28, '#ffffff');
        for (const [x1, y1, x2, y2] of [[52, 29, 55, 31], [67, 33, 64, 32], [54, 35, 56, 34]]) g.line(x1, y1, x2, y2, 1, '#e88080');
        g.line(48, 22, 72, 22, 2.4, S.d); g.line(49, 21, 71, 21, 1, S.h);
        g.ell(60, 45, 10, 5, '#5a1a10'); for (const x of [55, 59, 63]) g.poly([[x - 1.5, 44], [x, 41], [x + 1.5, 44]], '#fff6e0'); g.poly([[50, 47], [52, 42], [54, 47]], '#fff6e0'); g.poly([[66, 47], [68, 42], [70, 47]], '#fff6e0');
        const ca = act ? -2.0 : -1.4, ex = hx + Math.cos(ca) * 32, ey = hy + Math.sin(ca) * 32;
        tube(g, [[hx, hy, 3.5], [hx + (ex - hx) * 0.6, hy + (ey - hy) * 0.6, 5.5], [ex, ey, 9.5]], W);
        for (const a of [0.3, 1.6, 2.9, 4.2, 5.4]) { const nx = ex + Math.cos(a) * 9, ny = ey + Math.sin(a) * 9; g.r(Math.round(nx) - 1, Math.round(ny) - 1, 2, 2, '#c8ccd4'); g.p(Math.round(nx) - 1, Math.round(ny) - 1, '#ffffff'); }
        blob(g, hx, hy + 3, 6.5, 6, S);
      }, '#2a1408');
    },
    archmage(P) {
      const k = P.f % 4, act = P.act ? 1 : 0, p2 = P.p2 ? 1 : 0;
      return mk('amage' + k + act + p2, 100, 118, 50, 114, g => {
        const RB = { d: '#141c4a', m: '#2a3a8a', h: '#5a78d8' }, G = '#f2c14e', GS = '#a8782a', Bd = { d: '#a8a8c0', m: '#e0e0ec', h: '#ffffff' }, Sk = { d: '#b8906a', m: '#e8c8a0', h: '#fff0d8' }, E = p2 ? '#ff4a6a' : '#7ad8ff', RN = p2 ? '#ff7aa0' : '#7ab8ff';
        g.ell(50, 106, 30, 4, '#1a2a6a');
        for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + k * 0.2; g.r(Math.round(50 + Math.cos(a) * 42) - 1, Math.round(106 + Math.sin(a) * 7) - 1, 3, 3, RN); }
        g.poly([[38, 42], [62, 42], [76, 104], [24, 104]], RB.m); g.poly([[54, 42], [62, 42], [76, 104], [58, 104]], RB.d); g.poly([[38, 42], [44, 42], [32, 104], [24, 104]], RB.h);
        for (const [x1, x2] of [[42, 36], [50, 50], [58, 64]]) g.line(x1, 56, x2, 102, 1, RB.d);
        g.r(24, 100, 52, 4, G); g.r(24, 100, 52, 1, '#fff2c0'); for (let x = 26; x < 76; x += 6) g.p(x, 102, GS);
        g.r(48, 46, 4, 54, G); g.r(48, 46, 1, 54, '#fff2c0');
        for (const [x, y] of [[33, 84], [64, 74], [41, 94], [61, 92], [37, 64]]) { g.p(x, y, '#fff27a'); g.p(x - 1, y, '#fff27a'); g.p(x + 1, y, '#fff27a'); g.p(x, y - 1, '#fff27a'); g.p(x, y + 1, '#fff27a'); }
        const ay = act ? -16 : 0;
        g.poly([[38, 46], [22, 62 + ay], [32, 68 + ay], [46, 54]], RB.m); g.poly([[24, 62 + ay], [32, 68 + ay], [34, 64 + ay]], RB.d); g.r(22, 62 + ay, 10, 2, G);
        blob(g, 26, 67 + ay, 3.6, 3.4, Sk);
        g.poly([[62, 46], [76, 60], [68, 66], [56, 54]], RB.d); g.r(68, 60, 9, 2, G); blob(g, 72, 63, 3.6, 3.4, Sk);
        if (act) { g.ell(26, 56 + ay, 7, 7, '#5a7aff'); g.ell(26, 56 + ay, 5, 5, '#a8c8ff'); g.ell(25, 55 + ay, 2, 2, '#ffffff'); }
        g.line(73, 108, 73, 24, 3, '#4a2a10'); g.line(72, 106, 72, 26, 1, '#8a5a30');
        g.poly([[66, 26], [70, 16], [73, 22], [76, 16], [80, 26], [73, 30]], '#6a4020');
        const cr = act ? 7 : 5.5, CC = p2 ? ['#a01040', '#ff4a8a', '#ffc0d8'] : ['#1a6aa8', '#7ad8ff', '#e0f8ff'];
        g.poly([[73, 18 - cr * 1.4], [73 + cr, 18], [73, 18 + cr * 0.9], [73 - cr, 18]], CC[1]); g.poly([[73, 18 - cr * 1.4], [73 + cr, 18], [73, 18 + cr * 0.9]], CC[0]); g.poly([[73, 18 - cr * 1.4], [73 - cr * 0.5, 17], [73, 18]], CC[2]);
        blob(g, 50, 32, 9, 9, Sk);
        g.poly([[40, 33], [60, 33], [57, 56], [50, 66], [43, 56]], Bd.m); g.poly([[50, 35], [60, 33], [57, 56], [50, 66]], Bd.d);
        for (let i = 0; i < 5; i++) g.line(43 + i * 3.5, 38, 44 + i * 3.3, 56 + (i % 2) * 4, 1, i % 2 ? Bd.d : Bd.h);
        g.poly([[44, 36], [50, 34], [56, 36], [50, 38]], Bd.h);
        for (const m of [-1, 1]) { g.r(50 + m * 4 - 1, 29, 3, 2, '#2a2a4a'); g.r(50 + m * 4 - (m < 0 ? 1 : 0), 30, 2, 1, E); g.poly([[50 + m * 1, 27], [50 + m * 8, 25], [50 + m * 8, 27]], Bd.m); }
        g.ell(50, 24, 17, 4.5, RB.d); g.ell(50, 23, 15, 3, RB.m);
        g.poly([[37, 23], [63, 23], [57, 10], [66, 2], [52, 4], [44, 13]], RB.m); g.poly([[50, 23], [63, 23], [57, 10], [52, 4]], RB.d); g.line(42, 21, 47, 11, 1, RB.h);
        g.r(38, 20, 24, 2, G); g.r(38, 20, 24, 1, '#fff2c0');
        g.p(48, 14, '#fff27a'); g.p(47, 14, '#fff27a'); g.p(49, 14, '#fff27a'); g.p(48, 13, '#fff27a'); g.p(48, 15, '#fff27a'); g.ell(66, 3, 2, 2, G);
      }, '#080a20');
    },
    colossus(P) {
      const k = P.f % 2, act = P.act ? 1 : 0, p2 = P.p2 ? 1 : 0;
      return mk('colo' + k + act + p2, 128, 126, 64, 122, g => {
        const M = { d: '#3a4250', m: '#6e7a8a', h: '#b8c4d4' }, D2 = { d: '#2a3040', m: '#4e5868', h: '#8a96a8' }, Fi = p2 ? '#ff5a2a' : '#ffa23a', Fh = p2 ? '#ffd0a0' : '#fff2a0', Dk = '#16181e';
        const rivet = (x, y) => { g.r(x, y, 2, 2, M.d); g.p(x, y, M.h); };
        for (const x of [40, 70]) { bevel(g, x, 90, 18, 14, D2); bevel(g, x - 1, 102, 20, 12, M); g.r(x - 3, 112, 24, 8, Dk); bevel(g, x - 3, 112, 24, 7, D2); rivet(x + 3, 94); rivet(x + 12, 94); }
        bevel(g, 38, 84, 52, 8, D2);
        g.poly([[30, 44], [98, 44], [92, 86], [36, 86]], M.m); g.poly([[30, 44], [98, 44], [96, 48], [32, 48]], M.h); g.poly([[64, 44], [98, 44], [92, 86], [64, 86]], M.d);
        g.poly([[66, 48], [94, 48], [90, 84], [66, 84]], '#5a6676');
        for (const [x, y] of [[34, 50], [92, 50], [38, 80], [88, 80], [52, 50], [76, 50]]) rivet(x, y);
        g.ell(64, 66, 15, 13, Dk); g.ell(64, 66, 12.5, 10.5, '#5a1a08');
        for (let i = 0; i < 5; i++) g.r(53 + i * 5, 58, 3, 16, Fi);
        g.ell(64, 67, 6, 5, Fh); g.ell(64, 67, 3, 2.5, '#ffffff');
        g.r(51, 57, 26, 2, M.d); g.r(51, 75, 26, 2, M.d);
        const ay = act ? -24 : 0;
        for (const m of [-1, 1]) {
          const cx = 64 + m * 38, Cm = m < 0 ? M : D2;
          bevel(g, cx - 8, 56 + ay, 16, 12, Cm); bevel(g, cx - 8, 68 + ay, 16, 10, Cm);
          g.r(cx - 10, 78 + ay, 20, 14, Dk); bevel(g, cx - 9, 79 + ay, 18, 12, M); for (const c of [-6, -1, 4]) { g.r(cx + c, 88 + ay, 3, 3, M.d); g.p(cx + c, 88 + ay, M.h); }
          blob(g, cx, 46, 14, 11, Cm);
          g.r(cx - 10, 40, 20, 2, Cm.h); rivet(cx - 6, 46); rivet(cx + 4, 46);
        }
        bevel(g, 48, 16, 32, 26, M); g.poly([[64, 17], [79, 17], [79, 41], [64, 41]], '#5a6676'); g.r(48, 16, 32, 2, M.h);
        g.r(50, 26, 28, 7, Dk); g.r(52, 28, 24, 3, Fi); g.r(54, 29, 8, 1, Fh); g.r(66, 29, 8, 1, Fh);
        for (let i = 0; i < 3; i++) g.r(54 + i * 8, 36, 4, 4, M.d);
        g.poly([[60, 16], [64, 2], [68, 16]], D2.m); g.poly([[64, 2], [68, 16], [64, 16]], D2.d); g.line(61, 15, 64, 4, 1, D2.h);
        rivet(51, 20); rivet(75, 20);
        if (k) for (const [x, y] of [[42, 12], [86, 8]]) { g.ell(x, y, 4, 3, '#d8d8e0'); g.ell(x + 2, y - 3, 3, 2.4, '#e8e8f0'); }
      }, '#0e1016');
    },
    shadowhero(P) {
      const k = P.f % 2, act = P.act ? 1 : 0, p2 = P.p2 ? 1 : 0;
      return mk('shero' + k + act + p2, 100, 110, 48, 106, g => {
        const A = { d: '#1a1430', m: '#3a2e5a', h: '#7a64b8' }, CA = { d: '#140612', m: '#2e0e2e', h: '#5a2a5a' }, Sk = { d: '#2a2040', m: '#4a3c6a', h: '#7a6aa8' }, E = p2 ? '#ff2a4a' : '#ff6a6a', Bl = '#8a6aff', BlH = '#e8dcff', G = '#c9a24a';
        g.ell(48, 102, 32, 5, '#3a1a6a'); g.ell(48, 102, 22, 3, '#6a3aaa');
        g.poly([[30, 52], [66, 52], [76, 100], [68, 94], [62, 102], [54, 94], [46, 102], [38, 94], [30, 100], [22, 98]], CA.m);
        g.poly([[52, 52], [66, 52], [76, 100], [68, 94], [62, 102], [56, 70]], CA.d); g.line(30, 56, 24, 96, 1, CA.h);
        for (const [x, o] of [[38, 0], [52, -k]]) { bevel(g, x, 78 + o, 9, 18, A); g.r(x - 1, 94 + o, 11, 5, '#0e0a18'); bevel(g, x - 1, 94 + o, 11, 4, Sk); }
        g.poly([[32, 52], [64, 52], [62, 80], [34, 80]], A.m); g.poly([[48, 52], [64, 52], [62, 80], [48, 80]], A.d); g.line(33, 54, 35, 78, 1, A.h);
        g.poly([[40, 56], [56, 56], [52, 66], [44, 66]], Sk.m); g.ell(48, 61, 3.5, 3.5, '#120a1a'); g.ell(48, 61, 2, 2, E);
        g.r(32, 73, 32, 3, '#120a1a'); bevel(g, 45, 72, 6, 5, { d: '#6a4aaa', m: Bl, h: BlH });
        blob(g, 26, 66, 10, 13, A); g.ell(26, 66, 7, 10, A.m); g.r(25, 57, 2, 18, Bl); g.r(20, 63, 12, 2, Bl); g.p(25, 57, BlH);
        for (const m of [-1, 1]) { blob(g, 48 + m * 16, 52, 8, 5.5, A); g.r(48 + m * 16 - 6, 50, 12, 1, A.h); }
        blob(g, 48, 34, 20, 17, Sk);
        g.r(36, 36, 7, 5, '#0a0614'); g.r(54, 36, 7, 5, '#0a0614'); g.r(37, 37, 5, 3, E); g.r(55, 37, 5, 3, E); g.p(37, 37, '#ffd0d0'); g.p(55, 37, '#ffd0d0');
        g.r(45, 46, 6, 1, '#120a1a');
        g.ell(48, 24, 22, 13, A.d); g.ell(46, 22, 20, 11, A.m); g.ell(40, 17, 7, 3.5, A.h);
        g.r(26, 28, 44, 3, G); g.r(26, 28, 44, 1, '#fff2c0');
        g.poly([[44, 12], [48, 0], [52, 12]], '#8a2a4a'); g.line(45, 11, 48, 2, 1, '#c84a6a'); g.r(46, 24, 4, 3, '#ff2a4a');
        const ay = act ? -26 : 0, hx = act ? 72 : 70, hy = 72 + ay * 0.6, L = 42, a = act ? -1.25 : -1.45, dx = Math.cos(a), dy = Math.sin(a);
        tube(g, [[62, 56, 4.5], [66, 64 + ay * 0.3, 4], [hx, hy, 3.5]], A);
        g.line(hx + dx * 6, hy + dy * 6, hx + dx * L, hy + dy * L, 5.5, '#4a2aa8'); g.line(hx + dx * 6, hy + dy * 6, hx + dx * L, hy + dy * L, 3.5, Bl); g.line(hx + dx * 8 - 1, hy + dy * 8, hx + dx * (L - 3) - 1, hy + dy * (L - 3), 1.2, BlH);
        g.line(hx - dy * 8 + dx * 5, hy + dx * 8 + dy * 5, hx + dy * 8 + dx * 5, hy - dx * 8 + dy * 5, 3, G); blob(g, hx, hy, 3.2, 3.2, Sk);
      }, '#06040c');
    },
    bonedragon(P) {
      const k = P.f % 4, act = P.act ? 1 : 0, p2 = P.p2 ? 1 : 0;
      return mk('bdrag' + k + act + p2, 132, 114, 66, 108, (g, x) => {
        const B = { d: '#8a8068', m: '#d8d0b8', h: '#fffaf0' }, Dk = '#1e1418', Gl = p2 ? '#ff4a6a' : '#6affc0', GlD = p2 ? '#a01030' : '#1a8a5a', MEM = { d: '#1e3a32', m: '#3a6052' };
        const o = [-8, 0, 6, 0][k];
        mirror(g, 132, X => {
          const sh = [X(52), 46], el = [X(26), 22 + o], tips = [[X(6), 18 + o], [X(8), 38 + o * 0.6], [X(18), 50 + o * 0.3], [X(32), 56]];
          g.poly([sh, el, ...tips], MEM.m); g.poly([sh, el, tips[1], tips[2], tips[3]], MEM.d);
          x.save(); x.globalCompositeOperation = 'destination-out'; for (const [hx2, hy2, r2] of [[X(16), 32 + o * 0.7, 3.5], [X(24), 44 + o * 0.4, 2.5], [X(12), 24 + o, 2]]) { x.beginPath(); x.ellipse(hx2, hy2, r2, r2 * 0.8, 0, 0, 7); x.fill(); } x.restore();
          tube(g, [[sh[0], sh[1], 3], [el[0], el[1], 2.6]], B); for (const T of tips) tube(g, [[el[0], el[1], 1.8], [T[0], T[1], 1.2]], B);
          g.ell(el[0], el[1], 2.6, 2.6, B.h);
        });
        for (let i = 0; i < 8; i++) { const tx = 80 + i * 6, ty = 100 - i * 2.5 + Math.sin(i + k) * 2; blob(g, tx, ty, 4 - i * 0.35, 3.4 - i * 0.3, B); if (i % 2) g.p(tx, ty - 3, B.d); }
        for (const [lx, m] of [[46, -1], [84, 1]]) { tube(g, [[lx, 84, 4.5], [lx + m * 5, 96, 3.5], [lx + m * 3, 103, 3]], B); for (const c of [-4, 0, 4]) tube(g, [[lx + m * 3, 103, 1.6], [lx + m * 3 + c, 107, 1]], B); }
        tube(g, [[66, 52, 3.2], [66, 90, 3]], B);
        g.ell(66, 72, 9, 12, '#14241e'); g.ell(66, 72, 5, 7, GlD); g.ell(66, 71, 3, 4.5, Gl); g.p(65, 69, '#ffffff');
        for (let i = 0; i < 5; i++) { const y = 58 + i * 6, w = 19 - Math.abs(i - 2) * 3; for (const m of [-1, 1]) tube(g, [[66, y, 1.8], [66 + m * w * 0.7, y + 1, 1.7], [66 + m * w, y + 6, 1.4], [66 + m * w * 0.85, y + 10, 1.1]], B); }
        blob(g, 66, 92, 14, 5, B);
        for (let j = 0; j < 5; j++) blob(g, 66 + Math.sin(j * 0.8 + k * 0.5) * 3, 50 - j * 6, 4.5, 3.4, B);
        const hy = 20 - act * 3;
        for (const m of [-1, 1]) tube(g, [[66 + m * 9, hy - 5, 2.6], [66 + m * 18, hy - 15, 2], [66 + m * 21, hy - 20, 1.2]], B);
        blob(g, 66, hy, 14, 10.5, B);
        g.poly([[56, hy + 3], [76, hy + 3], [73, hy + 15], [59, hy + 15]], B.m); g.poly([[67, hy + 3], [76, hy + 3], [73, hy + 15], [67, hy + 15]], B.d);
        for (const m of [-1, 1]) { g.ell(66 + m * 6, hy - 1, 4.2, 3.8, Dk); g.ell(66 + m * 6, hy - 1, 2, 2, Gl); g.p(66 + m * 6, hy - 1, '#ffffff'); g.line(66 + m * 2, hy - 6, 66 + m * 11, hy - 4, 1, B.d); }
        g.r(63, hy + 7, 2, 2, Dk); g.r(68, hy + 7, 2, 2, Dk);
        const jw = act ? 8 : 2;
        g.poly([[58, hy + 15], [74, hy + 15], [72, hy + 19 + jw], [60, hy + 19 + jw]], B.d); g.line(59, hy + 16, 61, hy + 18 + jw, 1, B.m);
        for (const xx of [59, 62, 65, 68, 71]) g.poly([[xx, hy + 14], [xx + 1, hy + 17], [xx + 2, hy + 14]], '#ffffff');
        if (act) { g.ell(66, hy + 16 + jw / 2, 6, 3, GlD); g.ell(66, hy + 16 + jw / 2, 4, 1.8, Gl); }
      }, '#141010');
    },
    demongeneral(P) {
      const k = P.f % 2, act = P.act ? 1 : 0, p2 = P.p2 ? 1 : 0;
      return mk('dgen' + k + act + p2, 116, 122, 58, 118, g => {
        const AR = { d: '#1a060c', m: '#3a1a22', h: '#7a3a48' }, CP = { d: '#3a0408', m: '#8a1a1a', h: '#c83a3a' }, G = '#c9a24a', GH = '#fff0b0', SK = { d: '#5a1a2a', m: '#a04a5a', h: '#d8808a' }, HN = { d: '#8a7a5a', m: '#e8dcc0', h: '#ffffff' }, E = p2 ? '#ffffff' : '#ffe14a';
        g.poly([[40, 44], [76, 44], [94, 112], [22, 112]], CP.m); g.poly([[58, 44], [76, 44], [94, 112], [62, 112]], CP.d); g.poly([[40, 44], [46, 44], [30, 112], [22, 112]], CP.h);
        for (const xx of [38, 50, 70, 82]) g.line(xx > 58 ? 64 + (xx - 64) * 0.4 : 52 - (52 - xx) * 0.4, 50, xx, 110, 1, CP.d);
        for (const [lx, o] of [[42, 0], [62, -k]]) { bevel(g, lx, 84 + o, 12, 24, AR); g.poly([[lx, 92 + o], [lx + 12, 92 + o], [lx + 6, 86 + o]], G); g.r(lx - 2, 106 + o, 16, 6, '#0a0204'); bevel(g, lx - 2, 106 + o, 16, 5, AR); }
        g.poly([[36, 46], [80, 46], [76, 86], [40, 86]], AR.m); g.poly([[58, 46], [80, 46], [76, 86], [58, 86]], AR.d); g.line(37, 48, 41, 84, 1, AR.h);
        g.poly([[44, 52], [58, 62], [72, 52], [72, 58], [58, 70], [44, 58]], G); g.line(45, 53, 58, 63, 1, GH); g.ell(58, 62, 3.4, 3.4, '#c83a3a'); g.p(57, 61, '#ffb0b0');
        g.r(36, 78, 44, 4, G); g.r(36, 78, 44, 1, GH);
        for (const m of [-1, 1]) { const px = 58 + m * 25; for (const d of [-6, 0, 6]) spike(g, px + d, 44, -Math.PI / 2 + m * 0.35 + d * 0.03, 9, 2.2, HN); blob(g, px, 48, 12, 8, AR); g.r(px - 9, 51, 18, 1, G); }
        const ay = act ? -22 : 0;
        for (const m of [-1, 1]) {
          const hx = 58 + m * 35, hy = 76 + ay;
          tube(g, [[58 + m * 25, 54, 5.5], [58 + m * 31, 66 + ay * 0.5, 5], [hx, hy, 4.5]], AR);
          const a = act ? (m < 0 ? -2.0 : -1.1) : (m < 0 ? 1.9 : 1.25), L = 36, dx = Math.cos(a), dy = Math.sin(a);
          g.line(hx + dx * 4, hy + dy * 4, hx + dx * L, hy + dy * L, 6, '#8a1a0a'); g.line(hx + dx * 4, hy + dy * 4, hx + dx * L, hy + dy * L, 4, '#ff6a3a'); g.line(hx + dx * 6, hy + dy * 6, hx + dx * (L - 3), hy + dy * (L - 3), 1.2, '#ffe0a0');
          for (let i = 1; i < 4; i++) g.p(Math.round(hx + dx * L * i / 4 - dy * 3), Math.round(hy + dy * L * i / 4 + dx * 3), '#ffd24a');
          g.line(hx - dy * 6, hy + dx * 6, hx + dy * 6, hy - dx * 6, 2.6, G); blob(g, hx, hy, 4, 4, SK);
        }
        blob(g, 58, 30, 13, 13, SK);
        g.poly([[45, 34], [71, 34], [66, 43], [50, 43]], '#2a0610');
        for (const xx of [51, 55, 59, 63]) g.poly([[xx, 36], [xx + 1, 40], [xx + 2, 36]], '#ffffff');
        for (const m of [-1, 1]) { g.poly([[58 + m * 12, 27], [58 + m * 4, 29], [58 + m * 12, 31]], E); g.line(58 + m * 3, 25, 58 + m * 13, 23, 1.6, '#2a0610'); }
        g.ell(58, 20, 16, 9, AR.d); g.ell(57, 19, 14, 7.5, AR.m); g.ell(52, 16, 5, 2.4, AR.h); g.r(43, 22, 30, 4, AR.m); g.r(43, 25, 30, 2, G); g.r(43, 25, 30, 1, GH);
        for (const m of [-1, 1]) tube(g, [[58 + m * 13, 18, 3.5], [58 + m * 24, 10, 3], [58 + m * 28, 3, 2], [58 + m * 26, 1, 1]], HN);
        g.poly([[54, 14], [58, 4], [62, 14]], '#c83a3a'); g.line(56, 13, 58, 6, 1, '#ff8a8a');
      }, '#120408');
    },
    // ----- fenrir: the great frost wolf, sitting tall; the broken chains still hang from its forelegs -----
    fenrir(P) {
      const k = P.f % 4, act = P.act ? 1 : 0, p2 = P.p2 ? 1 : 0;
      return mk('fenr' + k + act + p2, 140, 116, 70, 108, g => {
        const F = { d: '#5a7aa8', m: '#c8dcf0', h: '#ffffff' }, FD = { d: '#2e4470', m: '#7a98c4', h: '#d8e8fa' }, IC = { d: '#3a8ac8', m: '#a8e8ff', h: '#ffffff' }, CH = { d: '#3a3e4a', m: '#7a8090', h: '#c8ccd8' };
        const E = p2 ? '#ff4a5a' : '#7af0ff', EH = p2 ? '#ffd0d0' : '#ffffff', br = [0, 1, 0, -1][k];
        g.ell(70, 106, 60, 7, '#3a5a8a'); g.ell(70, 105, 52, 4.5, '#8ab8e8');   // frost on the ground
        // tail curling up behind
        tube(g, [[100, 92, 9], [116, 84, 8.5], [126, 68, 7.5], [124, 52 + br, 6.5], [116, 44 + br, 5]], FD);
        for (let i = 0; i < 6; i++) spike(g, 112 + i * 2.4, 88 - i * 8, -0.2 - i * 0.28, 9, 3, F);
        // haunches
        blob(g, 70, 80, 44, 24, FD);
        for (const m of [-1, 1]) { for (let j = 0; j < 4; j++) spike(g, 70 + m * (40 - j * 2), 70 + j * 7, m > 0 ? -0.3 + j * 0.3 : Math.PI + 0.3 - j * 0.3, 10, 3.4, FD); blob(g, 70 + m * 30, 88, 16, 15, FD); g.line(70 + m * 22, 80, 70 + m * 36, 82, 1, FD.d); for (const c of [-5, 0, 5]) spike(g, 70 + m * 34 + c, 101, Math.PI / 2, 4, 1.6, IC); }
        // chest ruff: two layers of fur spikes
        for (let i = 0; i < 13; i++) { const a = Math.PI * 0.05 + i / 12 * Math.PI * 0.9; spike(g, 70 + Math.cos(a) * 22, 52 + Math.sin(a) * 18, a, 18, 6, FD); }
        for (let i = 0; i < 11; i++) { const a = Math.PI * 0.12 + i / 10 * Math.PI * 0.76; spike(g, 70 + Math.cos(a) * 16, 50 + Math.sin(a) * 14, a, 17, 5.5, F); }
        blob(g, 70, 58, 22, 18, F);
        // forelegs with broken chain cuffs
        for (const m of [-1, 1]) {
          const lx = 70 + m * 15;
          tube(g, [[lx, 64, 8], [lx + m, 82, 7], [lx + m * 2, 98, 6.5]], F);
          g.line(lx - m * 4, 66, lx - m * 3, 96, 2, FD.m);
          for (let j = 0; j < 3; j++) spike(g, lx + m * 6, 66 + j * 7, m > 0 ? 0.5 : Math.PI - 0.5, 8 - j, 2.6, F);
          blob(g, lx + m * 2, 101, 9, 5.5, F); for (const c of [-5, -1.5, 2, 5.5]) spike(g, lx + m * 2 + c, 104, Math.PI / 2, 4, 1.4, IC);
          bevel(g, lx - 7, 84, 15, 5, CH); g.r(lx - 7, 86, 15, 1, CH.d);
          for (let j = 0; j < 3; j++) { g.x.strokeStyle = j % 2 ? CH.h : CH.m; g.x.lineWidth = 1.4; g.x.beginPath(); g.x.ellipse(lx + m * (10 + j * 4), 88 + j * 3, 2.2, 1.4, 0.5 * m, 0, 7); g.x.stroke(); }
        }
        // head
        const hy = 30 - act * 2;
        for (const m of [-1, 1]) { spike(g, 70 + m * 12, hy - 7, -Math.PI / 2 + m * 0.42, 21, 6.5, FD); spike(g, 70 + m * 12, hy - 7, -Math.PI / 2 + m * 0.42, 14, 3.2, { d: '#7a5a8a', m: '#d8a8c8', h: '#ffe0f0' }); }
        for (const m of [-1, 1]) for (let i = 0; i < 3; i++) spike(g, 70 + m * 16, hy + 4 + i * 5, m > 0 ? 0.25 + i * 0.32 : Math.PI - 0.25 - i * 0.32, 12, 4.4, F);
        blob(g, 70, hy, 19, 15, F);
        g.poly([[60, hy + 2], [80, hy + 2], [77, hy + 16], [63, hy + 16]], F.m); g.poly([[70, hy + 2], [80, hy + 2], [77, hy + 16], [70, hy + 16]], FD.m);
        g.line(62, hy + 3, 64, hy + 14, 1, F.h);
        g.ell(70, hy + 15, 5, 3, '#1a1e2a'); g.p(68, hy + 14, '#8a9ab0');
        for (const m of [-1, 1]) {
          g.poly([[70 + m * 3, hy - 4], [70 + m * 14, hy - 7], [70 + m * 13, hy - 2]], FD.d);
          g.poly([[70 + m * 5, hy - 1], [70 + m * 12, hy - 3], [70 + m * 11, hy + 2], [70 + m * 6, hy + 2]], '#0e1424'); g.poly([[70 + m * 6, hy], [70 + m * 11, hy - 2], [70 + m * 10, hy + 1]], E); g.p(70 + m * 9, hy - 1, EH);
        }
        if (act) {
          g.poly([[62, hy + 17], [78, hy + 17], [75, hy + 28], [65, hy + 28]], '#14182a'); g.ell(70, hy + 23, 5, 4, IC.m); g.ell(70, hy + 23, 2.6, 2, '#ffffff');
          for (const x2 of [63, 66, 73, 76]) { g.poly([[x2, hy + 17], [x2 + 1, hy + 21], [x2 + 2, hy + 17]], '#ffffff'); g.poly([[x2, hy + 28], [x2 + 1, hy + 25], [x2 + 2, hy + 28]], '#ffffff'); }
        } else { g.r(64, hy + 18, 12, 1, '#1a1e2a'); for (const x2 of [65, 74]) g.poly([[x2, hy + 18], [x2 + 1, hy + 21], [x2 + 2, hy + 18]], '#ffffff'); }
        // drifting ice crystals
        for (const [cx, cy] of [[16, 40 + br * 2], [126, 22 - br * 2], [28, 12 - br], [118, 104]]) { g.poly([[cx, cy - 5], [cx + 2.4, cy], [cx, cy + 5], [cx - 2.4, cy]], IC.m); g.p(cx, cy - 2, '#ffffff'); }
        if (p2) for (const [cx, cy] of [[8, 70], [132, 80], [40, 4], [102, 8]]) { g.poly([[cx, cy - 7], [cx + 3, cy], [cx, cy + 7], [cx - 3, cy]], '#ff8a9a'); g.p(cx, cy - 3, '#ffffff'); }
      }, '#0e1626');
    },
    // ----- nightmare: a black horse of bad dreams, mane and tail of violet dream-fire; it rears to attack -----
    nightmare(P) {
      const k = P.f % 4, act = P.act ? 1 : 0, p2 = P.p2 ? 1 : 0;
      return mk('nmare' + k + act + p2, 144, 116, 70, 108, g => {
        const C = { d: '#0c0616', m: '#2e1e4a', h: '#6a58a0' }, CF = { d: '#06030c', m: '#1a1030', h: '#3e3266' };
        const F1 = p2 ? '#a01a6a' : '#5a1aa0', F2 = p2 ? '#ff4ab0' : '#b04aff', F3 = p2 ? '#ffd0ec' : '#f0c0ff', E = p2 ? '#ffffff' : '#ff3a6a';
        const lr = (a, b, t) => a + (b - a) * t;
        const flick = (x, y, h, w, ang, ph) => {   // one tongue of dream-fire
          const o = Math.sin(k * 1.6 + ph) * 0.12;
          spike(g, x, y, ang + o, h, w, { d: F1, m: F2, h: F3 });
          spike(g, x, y, ang - o, h * 0.55, w * 0.5, { d: F2, m: F3, h: '#ffffff' });
        };
        const rear = act;
        g.ell(68, 106, 56, 6, '#1e1030'); g.ell(68, 105, 46, 3.5, '#3a2060');
        // tail of flame
        for (let i = 0; i < 6; i++) flick(34 - i * 2, 58 + i * 4 + rear * 6, 22 - i * 1.5, 5.5, Math.PI + 0.35 + i * 0.16, i);
        const leg = (pts, C2) => { tube(g, pts, C2); const [fx, fy] = pts[pts.length - 1]; g.r(Math.round(fx - 4), Math.round(fy), 8, 4, '#120a1a'); g.ell(fx, fy + 4, 5.5, 2, F2); g.p(Math.round(fx), Math.round(fy + 3), F3); };
        const by = 66 + rear * 4, tilt = rear * 8;
        // far legs
        leg([[44, by + 6, 7], [41, 86, 5], [43, 98, 4]], CF);
        if (rear) leg([[92, by - 10, 6.5], [102, by - 14, 5], [108, by - 24, 4]], CF); else leg([[92, by + 6, 6.5], [94, 86, 5], [92, 98, 4]], CF);
        // body
        tube(g, [[38, by + 2, 15], [56, by, 16], [76, by - tilt * 0.5, 16.5], [90, by - 4 - tilt, 15]], C);
        blob(g, 42, by - 1, 15, 15, C); blob(g, 88, by - 4 - tilt, 15, 16, C);   // haunch + shoulder
        g.ell(64, by + 12, 18, 3, C.d);
        for (const [sx, sy2] of [[48, by - 6], [62, by - 9], [74, by - 8 - tilt * 0.5]]) g.p(sx, sy2, '#b8a8ff');   // starlight on the coat
        // near legs
        leg([[52, by + 8, 7.5], [50, 86, 5.4], [53, 98, 4.2]], C);
        if (rear) leg([[96, by - 6, 7], [110, by - 8, 5.2], [116, by - 20, 4.2]], C); else leg([[86, by + 6, 7.5], [84, 86, 5.4], [86, 98, 4.2]], C);
        // neck + head
        const hx = 110 + rear * 2, hy = 30 - rear * 10, Z = 1.3, hp = pts => pts.map(([a, b]) => [hx + a * Z, hy + b * Z]);
        tube(g, [[88, by - 6 - tilt, 13], [100, by - 22 - tilt * 0.6, 11.5], [hx - 6, hy + 8, 10.5]], C);
        g.poly(hp([[-12, -2], [4, -4], [20, 10], [21, 16], [12, 18], [-6, 14]]), C.m);
        g.poly(hp([[-6, 8], [20, 10], [21, 16], [12, 18], [-6, 14]]), C.d); g.line(hx - 10, hy - 2, hx + 7, hy - 4, 1, C.h); g.line(hx + 5, hy + 2, hx + 23, hy + 12, 1, C.h);
        g.r(hx + 22, hy + 15, 2, 2, '#06030c');
        if (act) { g.poly(hp([[10, 16], [21, 16], [18, 23], [10, 19]]), '#06030c'); g.ell(hx + 19, hy + 23, 3.6, 1.8, F2); }
        for (const o of [-3, 2]) spike(g, hx - 6 + o, hy - 1, -Math.PI / 2 - 0.4, 8, 2.4, C);
        flick(hx - 1, hy - 3, 15, 3.4, -Math.PI / 2 + 0.4, 2);   // a horn of dream-fire
        g.ell(hx + 3, hy + 5, 4, 2.8, '#06030c'); g.ell(hx + 3, hy + 5, 2.6, 1.8, E); g.p(hx + 4, hy + 4, '#ffffff');
        for (let i = 0; i < 3; i++) g.p(hx - 2 - i * 3, hy + 4 + i, E);
        // flaming mane along the neck
        for (let i = 0; i < 7; i++) { const t = i / 6; flick(lr(hx - 8, 84, t), lr(hy - 1, by - 14 - tilt, t), 17 - i, 4.6, -Math.PI / 2 - 0.9 - t * 0.35, i * 1.3); }
        // dream bubbles
        for (const [cx, cy, r] of [[14, 24 + (k % 2) * 2, 4.4], [28, 10, 2.6], [130, 72 - (k % 2) * 2, 3.6]]) { g.x.strokeStyle = F3; g.x.lineWidth = 1.2; g.x.beginPath(); g.x.arc(cx, cy, r, 0, 7); g.x.stroke(); g.p(Math.round(cx - r * 0.4), Math.round(cy - r * 0.4), '#ffffff'); }
      }, '#06030c');
    },
    // ----- gorgon: serpent-tailed, snake-haired, bronze shield and bow; the eyes flare when she gazes -----
    gorgon(P) {
      const k = P.f % 4, act = P.act ? 1 : 0, p2 = P.p2 ? 1 : 0;
      return mk('gorg' + k + act + p2, 136, 118, 68, 110, g => {
        const S = { d: '#2a5a3a', m: '#5aa86a', h: '#b8f0b0' }, BL = { c: '#e0d890', s: '#a89a50', w: 0.4 }, SK = { d: '#6a9a7a', m: '#a8d8b0', h: '#e8fff0' }, BR = { d: '#7a4a1a', m: '#c8862a', h: '#ffd27a' }, SN = { d: '#1e4a2a', m: '#3e8a4a', h: '#9ad88a' };
        const E = p2 ? '#ff3a3a' : act ? '#ffffff' : '#c8ff6a', cx = 68;
        // serpent tail coiled on the ground
        tube(g, [[104, 104, 4.5], [116, 98, 6.5], [120, 88, 8], [110, 80, 9], [92, 84, 11], [72, 96, 13], [52, 100, 13], [32, 96, 12], [24, 86, 10], [32, 76, 9.5], [50, 74, 10], [62, 70, 10.5]], S, { belly: BL, scale: true });
        // torso
        g.poly([[54, 44], [82, 44], [78, 72], [58, 72]], SK.m); g.poly([[68, 44], [82, 44], [78, 72], [68, 72]], SK.d);
        g.poly([[54, 46], [82, 46], [80, 64], [56, 64]], BR.m); g.poly([[68, 46], [82, 46], [80, 64], [68, 64]], BR.d); g.line(55, 47, 57, 62, 1, BR.h);
        g.ell(cx, 54, 5, 5, BR.d); g.ell(cx, 54, 3.4, 3.4, BR.h); g.ell(cx, 54, 1.6, 1.6, '#3a8a4a');
        g.r(56, 64, 24, 4, BR.d); g.r(56, 64, 24, 1, BR.h);
        for (const m of [-1, 1]) blob(g, cx + m * 15, 47, 6, 4.5, BR);
        // left arm: a bronze shield with a face; right arm: a bow
        const ay = act ? -10 : 0;
        tube(g, [[54, 48, 4], [44, 58 + ay, 3.6], [38, 62 + ay, 3.2]], SK);
        g.ell(32, 64 + ay, 13, 14, BR.d); g.ell(31, 63 + ay, 11.5, 12.5, BR.m); g.ell(27, 58 + ay, 4, 3, BR.h);
        g.ell(31, 63 + ay, 5, 5.5, BR.d); g.ell(31, 63 + ay, 3.6, 4, BR.h); for (const m of [-1, 1]) g.p(31 + m * 1.5, 62 + ay, '#2a1a0a'); g.r(30, 65 + ay, 3, 1, '#2a1a0a');
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.p(Math.round(31 + Math.cos(a) * 9), Math.round(63 + ay + Math.sin(a) * 9.5), BR.h); }
        tube(g, [[82, 48, 4], [92, 56, 3.6], [96, 50 + ay, 3.2]], SK);
        g.x.strokeStyle = '#5a2e12'; g.x.lineWidth = 2.6; g.x.beginPath(); g.x.arc(94, 52 + ay, 20, -1.2, 1.2); g.x.stroke();
        g.x.strokeStyle = '#a8682a'; g.x.lineWidth = 1; g.x.beginPath(); g.x.arc(94, 52 + ay, 20, -1.1, 0.4); g.x.stroke();
        g.line(94 + Math.cos(-1.2) * 20, 52 + ay + Math.sin(-1.2) * 20, 94 + Math.cos(1.2) * 20, 52 + ay + Math.sin(1.2) * 20, 1, '#e8e0c0');
        // snake hair
        const hy = 30;
        for (let i = 0; i < 11; i++) {
          const a = Math.PI + 0.15 + i / 10 * (Math.PI - 0.3), ph = Math.sin(k * 1.5 + i * 1.7) * 0.22 + (act ? -0.08 : 0);
          const r2 = 18 + (i % 3) * 3, r3 = 25 + (i % 2) * 4;
          const p0 = [cx + Math.cos(a) * 8, hy + Math.sin(a) * 7], p1 = [cx + Math.cos(a + ph) * r2, hy - 2 + Math.sin(a + ph) * r2 * 0.8], q2 = [cx + Math.cos(a - ph) * r3, hy - 3 + Math.sin(a - ph) * r3 * 0.8];
          tube(g, [[p0[0], p0[1], 2.6], [p1[0], p1[1], 2.2], [q2[0], q2[1], 2]], SN);
          g.ell(q2[0], q2[1], 2.8, 2.2, SN.m); g.p(Math.round(q2[0] + Math.cos(a) * 1.4), Math.round(q2[1] - 1), '#ff3a3a');
          if (act && i % 2) g.line(q2[0], q2[1], q2[0] + Math.cos(a - ph) * 4, q2[1] + Math.sin(a - ph) * 3, 1, '#e04a4a');
        }
        blob(g, cx, hy + 2, 11, 12, SK);
        g.r(57, hy - 6, 22, 3, '#f2c14e'); g.p(cx, hy - 5, '#e04050'); g.p(cx - 1, hy - 6, '#ffe8a0');
        for (const m of [-1, 1]) { g.poly([[cx + m * 2, hy + 1], [cx + m * 8, hy - 1], [cx + m * 8, hy + 3], [cx + m * 3, hy + 3]], '#0a1a10'); g.poly([[cx + m * 3, hy + 2], [cx + m * 7, hy], [cx + m * 7, hy + 2]], E); g.p(cx + m * 5, hy + 1, '#000000'); }
        if (act || p2) for (const m of [-1, 1]) for (let i = 0; i < 3; i++) g.p(cx + m * (9 + i * 2), hy + 1 - i, E);
        g.r(cx - 1, hy + 5, 2, 3, SK.d); g.r(cx - 4, hy + 10, 8, 1, '#3a1a2a');
        if (act) { g.r(cx - 3, hy + 10, 6, 3, '#3a0a1a'); g.p(cx - 2, hy + 10, '#ffffff'); g.p(cx + 1, hy + 10, '#ffffff'); }
      }, '#0a1a10');
    },
    // ----- fallen angel: one wing still white, one burnt black; a cracked halo and a sword of light -----
    fallenangel(P) {
      const k = P.f % 4, act = P.act ? 1 : 0, p2 = P.p2 ? 1 : 0;
      return mk('fang' + k + act + p2, 148, 122, 74, 116, (g, x) => {
        const WH = { m: '#f6f8ff', d: '#a8b0cc', tip: '#ffffff' }, WH2 = { m: '#dfe4f2', d: '#9098b8' }, BK = { m: '#3a2a4a', d: '#140a1e', tip: '#7a4aa8' }, BK2 = { m: '#281c36', d: '#0c0614' };
        const AR = { d: '#1e1a30', m: '#3e3860', h: '#8a84b8' }, G = '#f2c14e', GH = '#fff2c0', SK = { d: '#c8a8a0', m: '#f4e0d8', h: '#ffffff' }, HR = { d: '#9aa0b8', m: '#e0e4f0', h: '#ffffff' };
        const E = p2 ? '#ff3a5a' : '#ffe680', flap = [-0.06, 0, 0.06, 0][k] - act * 0.12, cx = 74;
        for (const m of [-1, 1]) {
          const black = m > 0 || p2, F1 = black ? BK : WH, F2 = black ? BK2 : WH2, rx = cx + m * 9, ry = 44;
          const A = a => m > 0 ? a : Math.PI - a;
          for (let i = 0; i < 9; i++) { const t = i / 8; feather(g, rx + m * t * 24, ry - 14 - t * 10 + Math.sin(t * 3) * 4, A(-0.9 + t * 1.55 + flap), 34 + Math.sin(t * Math.PI) * 12, 5, i % 2 ? F2 : F1); }
          for (let i = 0; i < 7; i++) { const t = i / 6; feather(g, rx + m * t * 20, ry - 12 - t * 6, A(-0.5 + t * 1.2 + flap), 20 + t * 4, 4, F1); }
          if (black && !p2) for (const [dx, dy] of [[30, 6], [42, 22], [22, 30]]) { g.p(rx + m * dx, ry + dy, '#ff7a3a'); g.p(rx + m * dx, ry + dy - 1, '#ffd24a'); }
          g.line(rx, ry - 12, rx + m * 26, ry - 25, 4, black ? '#0c0614' : '#c0c6dc');
        }
        // tattered robe
        g.poly([[cx - 20, 64], [cx + 20, 64], [cx + 32, 108], [cx + 24, 102], [cx + 18, 112], [cx + 10, 104], [cx + 2, 114], [cx - 6, 104], [cx - 14, 112], [cx - 22, 102], [cx - 32, 108]], AR.m);
        g.poly([[cx, 64], [cx + 20, 64], [cx + 32, 108], [cx + 24, 102], [cx + 18, 112], [cx + 10, 104], [cx + 2, 114], [cx, 80]], AR.d);
        g.line(cx - 18, 68, cx - 28, 104, 1, AR.h); g.r(cx - 2, 64, 4, 46, G); g.r(cx - 2, 64, 1, 46, GH);
        // breastplate
        g.poly([[cx - 18, 42], [cx + 18, 42], [cx + 14, 66], [cx - 14, 66]], AR.m); g.poly([[cx, 42], [cx + 18, 42], [cx + 14, 66], [cx, 66]], AR.d); g.line(cx - 17, 44, cx - 13, 64, 1, AR.h);
        g.poly([[cx - 10, 46], [cx, 56], [cx + 10, 46], [cx + 10, 50], [cx, 60], [cx - 10, 50]], G); g.line(cx - 9, 47, cx, 57, 1, GH);
        g.ell(cx, 52, 3, 3, p2 ? '#ff3a5a' : '#9ad8ff'); g.p(cx - 1, 51, '#ffffff');
        for (const m of [-1, 1]) { blob(g, cx + m * 19, 44, 8, 6, AR); g.r(cx + m * 19 - 7, 46, 14, 1, G); }
        // arms; the sword of light rises when it attacks
        const ay = act ? -24 : 0;
        tube(g, [[cx - 18, 46, 4.5], [cx - 26, 58, 4], [cx - 28, 70, 3.6]], AR); blob(g, cx - 28, 72, 3.6, 3.6, SK);
        tube(g, [[cx + 18, 46, 4.5], [cx + 26, 56 + ay * 0.4, 4], [cx + 30, 66 + ay, 3.6]], AR);
        const sa = act ? -1.35 : -1.75, L = 46, sx = cx + 30, sy = 66 + ay, dx = Math.cos(sa), dy = Math.sin(sa);
        g.line(sx + dx * 6, sy + dy * 6, sx + dx * L, sy + dy * L, 7, p2 ? '#ff5a8c' : '#ffe68c'); g.line(sx + dx * 6, sy + dy * 6, sx + dx * L, sy + dy * L, 4, p2 ? '#ffb0d0' : '#fff6d0'); g.line(sx + dx * 8, sy + dy * 8, sx + dx * (L - 2), sy + dy * (L - 2), 1.4, '#ffffff');
        g.line(sx - dy * 7 + dx * 5, sy + dx * 7 + dy * 5, sx + dy * 7 + dx * 5, sy - dx * 7 + dy * 5, 3, G); blob(g, sx, sy, 3.6, 3.6, SK);
        // head: long silver hair; the eyes stay closed until it fights in earnest
        const hy = 28;
        g.poly([[cx - 12, hy - 6], [cx + 12, hy - 6], [cx + 16, hy + 26], [cx + 8, hy + 18], [cx, hy + 24], [cx - 8, hy + 18], [cx - 16, hy + 26]], HR.m); g.poly([[cx, hy - 6], [cx + 12, hy - 6], [cx + 16, hy + 26], [cx + 8, hy + 18], [cx, hy + 24]], HR.d);
        blob(g, cx, hy + 2, 10, 11, SK);
        g.ell(cx, hy - 6, 12, 6, HR.m); g.ell(cx - 4, hy - 8, 5, 2.4, HR.h); g.poly([[cx - 10, hy - 4], [cx - 6, hy + 6], [cx - 4, hy - 2]], HR.m); g.poly([[cx + 10, hy - 4], [cx + 6, hy + 6], [cx + 4, hy - 2]], HR.d);
        if (act || p2) for (const m of [-1, 1]) { g.r(cx + m * 4 - 1, hy + 1, 3, 2, '#1a0a14'); g.r(cx + m * 4 - 1, hy + 1, 2, 1, E); }
        else for (const m of [-1, 1]) g.line(cx + m * 2, hy + 2, cx + m * 6, hy + 2, 1, '#6a4a5a');
        g.r(cx - 2, hy + 7, 4, 1, '#a05a6a');
        x.save(); x.translate(cx, hy - 16); x.rotate(-0.2); x.strokeStyle = p2 ? '#ff4a6a' : '#ffe680'; x.lineWidth = 2.4; x.beginPath(); x.ellipse(0, 0, 15, 4, 0, 0.5, Math.PI * 2 - 0.3); x.stroke(); x.restore();
        for (const [px, py] of [[cx + 14, hy - 22], [cx + 18, hy - 26]]) g.p(px, py, p2 ? '#ff4a6a' : '#ffe680');
        for (const [fx, fy, a, b] of [[18, 98 + (k % 2) * 2, 0.6, 0], [130, 92 - (k % 2) * 2, 2.4, 1], [34, 110, 1.2, 0]]) feather(g, fx, fy, a, 9, 2.2, b ? BK : WH);
      }, '#0a0612');
    },
    // ----- god of ruin: four arms, a bone mask with a third eye, a crown of black crystal, a rune ring behind it;
    //       the lower arms hold a cracked world. It floats on void tendrils. -----
    hakaishin(P) {
      const k = P.f % 4, act = P.act ? 1 : 0, p2 = P.p2 ? 1 : 0;
      return mk('haka' + k + act + p2, 152, 140, 76, 134, (g, x) => {
        const B = { d: '#140824', m: '#2e1450', h: '#6a3aa8' }, B2 = { d: '#0a0414', m: '#1e0a36', h: '#4a2a7a' }, CR = { d: '#3a0a5a', m: '#8a2aff', h: '#ffc0ff' }, G = '#f2c14e';
        const V = p2 ? '#ff3a7a' : '#ff4ad8', VH = '#ffe0f8', E = p2 ? '#ffffff' : '#ffe14a', cx = 76;
        // the rune ring behind it
        x.save(); x.strokeStyle = '#2a1040'; x.lineWidth = 7; x.beginPath(); x.ellipse(cx, 52, 66, 46, 0, 0, 7); x.stroke();
        x.strokeStyle = p2 ? '#a02a6a' : '#7a3ad8'; x.lineWidth = 3; x.stroke(); x.restore();
        for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + k * 0.05, px = cx + Math.cos(a) * 66, py = 52 + Math.sin(a) * 46; g.r(Math.round(px) - 1, Math.round(py) - 1, 3, 3, i % 4 ? '#e0b0ff' : G); }
        // void tendrils for a lower body
        for (let i = 0; i < 7; i++) { const bx = cx - 24 + i * 8, sw = Math.sin(k * 1.57 + i) * 4; tube(g, [[bx, 90, 6 - Math.abs(i - 3) * 0.4], [bx + sw - (i - 3) * 2, 106, 4], [bx - sw - (i - 3) * 4, 120, 2.6], [bx + sw * 0.5 - (i - 3) * 5, 131, 1.2]], B2); }
        for (let i = 0; i < 5; i++) g.p(cx - 20 + i * 10, 114 + (i % 2) * 6, V);
        // lower arms holding a cracked world
        const ay = act ? -3 : 0, wy = 101 + ay;
        for (const m of [-1, 1]) { tube(g, [[cx + m * 22, 70, 6], [cx + m * 34, 80, 5.4], [cx + m * 22, wy, 5]], B); blob(g, cx + m * 18, wy + 2, 5.5, 5, B); }
        g.ell(cx, wy, 13, 13, '#0a1a3a'); g.ell(cx - 1, wy - 1, 11.5, 11.5, '#2a6ab0'); g.ell(cx - 4, wy - 4, 5, 3, '#4ac07a'); g.ell(cx + 4, wy + 3, 4, 2.5, '#4ac07a'); g.ell(cx - 5, wy - 6, 2.4, 1.6, '#ffffff');
        g.line(cx - 6, wy - 10, cx + 2, wy + 2, 1.4, V); g.line(cx + 2, wy + 2, cx + 8, wy + 6, 1.4, V); g.line(cx + 2, wy + 2, cx - 2, wy + 10, 1, V);
        // torso: starry skin, crystal plates, a core
        g.poly([[cx - 28, 44], [cx + 28, 44], [cx + 16, 88], [cx - 16, 88]], B.m); g.poly([[cx, 44], [cx + 28, 44], [cx + 16, 88], [cx, 88]], B.d); g.line(cx - 27, 46, cx - 16, 86, 1, B.h);
        for (const [sx, sy2] of [[cx - 14, 64], [cx + 10, 72], [cx - 6, 80], [cx + 16, 56], [cx - 18, 76], [cx + 4, 66]]) { g.p(sx, sy2, '#ffffff'); g.p(sx + 1, sy2, '#c8a0ff'); }
        g.poly([[cx - 12, 50], [cx, 62], [cx + 12, 50], [cx + 10, 56], [cx, 70], [cx - 10, 56]], CR.m); g.line(cx - 11, 51, cx, 63, 1, CR.h);
        g.ell(cx, 58, 4.6, 4.6, '#0a0414'); g.ell(cx, 58, 3.2, 3.2, V); g.p(cx - 1, 57, VH);
        g.r(cx - 18, 86, 36, 4, G); g.r(cx - 18, 86, 36, 1, '#fff2c0'); for (const xx of [-11, 0, 11]) g.ell(cx + xx, 88, 2, 2, CR.m);
        for (const m of [-1, 1]) { blob(g, cx + m * 27, 46, 11, 8, B); for (const d of [-6, 0, 6]) spike(g, cx + m * 27 + d, 41, -Math.PI / 2 + m * 0.4 + d * 0.04, 11 + (d === 0 ? 4 : 0), 2.6, CR); }
        // upper arms raised, each palm cradling a star of ruin
        const uy = act ? -12 : 0;
        for (const m of [-1, 1]) {
          const hx = cx + m * 54, hy2 = 34 + uy;
          tube(g, [[cx + m * 30, 48, 6.5], [cx + m * 44, 46 + uy * 0.4, 5.6], [hx, hy2, 5]], B);
          blob(g, hx, hy2 - 2, 5.5, 5, B);
          g.ell(hx, hy2 - 10, act ? 7 : 5.5, act ? 7 : 5.5, p2 ? '#a0103a' : '#6a10a0'); g.ell(hx, hy2 - 10, act ? 5 : 3.8, act ? 5 : 3.8, V); g.ell(hx - 1, hy2 - 11, 1.8, 1.8, VH);
          for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + k * 0.4; g.p(Math.round(hx + Math.cos(a) * 9), Math.round(hy2 - 10 + Math.sin(a) * 9), VH); }
        }
        // head: crown of crystal, curling horns, a bone mask with three eyes
        const hy = 26;
        for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.32, L = 22 - Math.abs(i - 3) * 3; spike(g, cx + Math.cos(a) * 9, hy - 6 + Math.sin(a) * 4, a, L, 3.2, { d: '#0a0414', m: '#2a1040', h: '#8a4ad0' }); }
        for (const m of [-1, 1]) tube(g, [[cx + m * 10, hy - 4, 3.4], [cx + m * 20, hy - 10, 2.8], [cx + m * 26, hy - 20, 2], [cx + m * 24, hy - 26, 1]], { d: '#7a6a3a', m: '#e8d8a0', h: '#ffffff' });
        blob(g, cx, hy + 2, 13, 13, B);
        g.poly([[cx - 11, hy - 2], [cx + 11, hy - 2], [cx + 9, hy + 12], [cx, hy + 16], [cx - 9, hy + 12]], '#e8e0f4'); g.poly([[cx, hy - 2], [cx + 11, hy - 2], [cx + 9, hy + 12], [cx, hy + 16]], '#a89ac8');
        for (const m of [-1, 1]) { g.poly([[cx + m * 2, hy + 3], [cx + m * 9, hy + 1], [cx + m * 8, hy + 6]], '#0a0414'); g.poly([[cx + m * 3, hy + 3], [cx + m * 8, hy + 2], [cx + m * 7, hy + 5]], E); }
        g.ell(cx, hy - 3, 2.4, 3.4, '#0a0414'); g.ell(cx, hy - 3, 1.4, 2.4, V); g.p(cx, hy - 4, VH);
        g.line(cx + 4, hy + 8, cx + 7, hy + 13, 1, '#6a5a8a'); g.line(cx - 3, hy - 1, cx - 6, hy + 2, 1, '#6a5a8a');
        if (act) { g.r(cx - 4, hy + 10, 8, 3, '#0a0414'); g.r(cx - 3, hy + 11, 6, 1, V); }
        if (p2) for (const [a2, b2, c2, d2] of [[cx - 20, 50, cx - 8, 70], [cx + 18, 60, cx + 6, 80], [cx - 10, 76, cx - 16, 86]]) { g.line(a2, b2, c2, d2, 2, '#6a0a3a'); g.line(a2, b2, c2, d2, 1, V); }
      }, '#06020c');
    },
    maou(P) {
      const act = P.act ? 1 : 0, k = P.f % 2, p2 = P.p2 ? 1 : 0;
      return mk('maou' + act + k + p2, 112, 124, 56, 120, g => {
        const Cl = '#1e1030', ClS = '#120820', Lin = '#8a1830', Ar = '#3a2a4a', ArH = '#6a5a8a', Sk = '#b8a8d8', SkS = '#8a78b0', Hn = '#ffe9a0', HnS = '#c8a860', G = '#f2c14e';
        const E = p2 ? '#ff2a4a' : '#ffe14a';
        if (p2) mirror(g, 112, (X) => { g.poly([[X(40), 44], [X(4), 14], [X(10), 34], [X(0), 40], [X(12), 50], [X(4), 60], [X(36), 64]], '#2a0a20'); g.line(X(40), 44, X(4), 14, 2, '#5a1a3a'); });
        // cloak
        g.poly([[34, 40], [78, 40], [96, 116], [16, 116]], Cl); g.poly([[60, 40], [78, 40], [96, 116], [70, 116]], ClS);
        g.poly([[26, 30], [42, 44], [40, 58]], Lin); g.poly([[86, 30], [70, 44], [72, 58]], Lin);
        g.r(42, 46, 28, 46, Ar); g.r(62, 46, 8, 46, '#2a1e38'); g.r(44, 48, 4, 20, ArH); g.r(42, 70, 28, 3, G); g.ell(56, 60, 4, 4, '#c03aff'); g.p(55, 59, '#ffffff');
        g.r(44, 92, 10, 22, Ar); g.r(58, 92, 10, 22, '#2a1e38'); g.r(42, 112, 14, 4, '#120a18'); g.r(56, 112, 14, 4, '#120a18');
        // arms + scepter / dark orb
        const ay = act ? -20 : 0;
        g.poly([[42, 48], [30, 64 + ay], [36, 68 + ay], [46, 56]], Ar); g.ell(32, 68 + ay, 4, 4, Sk);
        g.poly([[70, 48], [82, 64 + ay], [76, 68 + ay], [66, 56]], '#2a1e38'); g.ell(80, 68 + ay, 4, 4, SkS);
        g.line(84, 112 + ay, 84, 40 + ay, 2.6, '#3a2a1a'); g.ell(84, 34 + ay, act ? 7 : 5.5, act ? 7 : 5.5, p2 ? '#ff3a6a' : '#a03aff'); g.ell(83, 33 + ay, 2.4, 2.4, '#ffd0ff');
        g.poly([[78, 40 + ay], [84, 28 + ay], [90, 40 + ay]], G);
        if (act) g.ell(32, 60 + ay, 5, 5, p2 ? '#ff6a8a' : '#c86bff');
        // head
        g.poly([[42, 20], [70, 20], [74, 48], [66, 40], [56, 46], [46, 40], [38, 48]], '#e8e4f0');
        g.ell(56, 28, 12, 13, Sk); g.ell(60, 31, 7, 10, SkS);
        g.poly([[48, 27], [54, 29], [48, 30]], E); g.poly([[64, 27], [58, 29], [64, 30]], E);
        g.line(46, 24, 54, 27, 1.8, '#3a2a4a'); g.line(66, 24, 58, 27, 1.8, '#3a2a4a');
        g.r(52, 36, 8, 1, '#3a1a2a'); g.p(53, 37, '#ffffff'); g.p(58, 37, '#ffffff');
        // horns + crown
        mirror(g, 112, (X) => { g.line(X(46), 18, X(34), 12, 5, HnS); g.line(X(34), 12, X(30), -2 + 6, 4, Hn); g.line(X(30), 4, X(34), 0 + 2, 3, Hn); g.line(X(46), 18, X(36), 13, 2.4, Hn); });
        g.r(46, 14, 20, 4, G); for (const x of [48, 56, 64]) g.poly([[x - 2, 14], [x, 8], [x + 2, 14]], G); g.p(56, 15, '#e04050');
      });
    },
  };

  // ---------------------------------------------------------------
  //  RIGGED BOSSES (31-35): drawn as separate parts that the game moves, turns and squashes every frame,
  //  so the motion is smooth while each part stays plain pixel art.
  // ---------------------------------------------------------------
  const PARTS = {
    // ===== sandworm (seen along its body: a round maw, armoured rings) =====
    sw_head(P) {
      const o = P.open || 0, p2 = P.p2 ? 1 : 0;
      return mk('swh' + o + p2, 56, 56, 28, 28, g => {
        const S = { d: '#7a5228', m: '#c89050', h: '#f0cc88' }, Fl = p2 ? '#c02a4a' : '#8a2a5a', E = p2 ? '#ff4a3a' : '#ffb03a';
        // four mandibles, spreading as the maw opens
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; spike(g, 28 + Math.cos(a) * 15, 28 + Math.sin(a) * 15, a + (o - 1.5) * 0.12, 10 + o * 2.5, 4, { d: '#5a3a1a', m: '#a8783a', h: '#e8c890' }); }
        g.ell(28, 28, 19, 19, S.d); g.ell(27, 27, 17.5, 17.5, S.m);
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.line(28 + Math.cos(a) * 11, 28 + Math.sin(a) * 11, 28 + Math.cos(a) * 18, 28 + Math.sin(a) * 18, 1, S.d); }   // plate seams
        g.ell(23, 21, 6, 3, S.h);
        for (const a of [-0.6, 0.6, Math.PI - 0.6, Math.PI + 0.6]) { g.ell(28 + Math.cos(a) * 14.5, 28 + Math.sin(a) * 14.5, 1.6, 1.6, E); }
        const R = 7 + o * 2;   // the maw
        g.ell(28, 28, R + 1.5, R + 1.5, '#2a1018'); g.ell(28, 28, R, R, Fl); g.ell(28, 28, R * 0.6, R * 0.6, '#1a0610');
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.poly([[28 + Math.cos(a - 0.2) * R, 28 + Math.sin(a - 0.2) * R], [28 + Math.cos(a) * R * 0.55, 28 + Math.sin(a) * R * 0.55], [28 + Math.cos(a + 0.2) * R, 28 + Math.sin(a + 0.2) * R]], '#fff4e0'); }
      }, '#2a1608');
    },
    sw_seg(P) {
      const s = P.s || 0, p2 = P.p2 ? 1 : 0, R = [17, 15, 12.5, 10][s];
      return mk('sws' + s + p2, 44, 44, 22, 22, g => {
        const S = { d: '#6a4620', m: '#b8844a', h: '#e8c080' };
        spike(g, 22, 22 - R + 2, -Math.PI / 2, 5, 2.4, S); spike(g, 22, 22 + R - 2, Math.PI / 2, 5, 2.4, S);   // side spines
        g.ell(22, 22, R, R * 0.92, S.d); g.ell(21, 21, R * 0.88, R * 0.8, S.m); g.ell(18, 17, R * 0.35, R * 0.22, S.h);
        g.line(22, 22 - R * 0.8, 22, 22 + R * 0.8, 1.5, S.d); g.line(23, 22 - R * 0.7, 23, 22 + R * 0.7, 1, S.h);   // the ridge across
        if (p2) { g.p(18, 24, '#ff6a3a'); g.p(26, 20, '#ff6a3a'); }
      }, '#2a1608');
    },
    sw_mound(P) {
      return mk('swm' + (P.f % 2), 46, 24, 23, 14, g => {
        g.ell(23, 14, 21, 8, '#8a6438'); g.ell(22, 12, 17, 6, '#c8a060'); g.ell(19, 10, 8, 2.4, '#ecd090');
        g.line(14, 14, 20, 11, 1, '#6a4a28'); g.line(26, 9, 31, 14, 1, '#6a4a28');
        for (const [x, y] of P.f % 2 ? [[8, 6], [36, 4]] : [[12, 3], [33, 7]]) g.r(x, y, 2, 2, '#e8c890');
      }, '#3a2410');
    },
    // ===== giga crab (front view) =====
    cr_body(P) {
      const p2 = P.p2 ? 1 : 0;
      return mk('crb' + p2, 92, 58, 46, 34, g => {
        const C = p2 ? { d: '#7a1010', m: '#c82a1e', h: '#ff7a5a' } : { d: '#8a2a14', m: '#e0582a', h: '#ffa070' }, U = { d: '#c8a078', m: '#f0d0a8', h: '#fff4e0' };
        g.ell(46, 40, 34, 12, U.d); g.ell(46, 39, 30, 9, U.m);   // underside
        g.ell(46, 30, 42, 22, C.d); g.ell(45, 28, 39, 19.5, C.m); g.ell(34, 19, 14, 5, C.h);
        for (let i = 0; i < 7; i++) { const x = 14 + i * 10.5, y = 14 + Math.abs(i - 3) * 2.4; spike(g, x, y, -Math.PI / 2 + (i - 3) * 0.25, 5, 2.4, C); }
        g.line(18, 32, 74, 32, 1, C.d); for (const x of [30, 46, 62]) g.ell(x, 26, 3, 2, C.d);   // shell grooves
        g.r(38, 40, 16, 5, '#5a1a10'); for (let i = 0; i < 4; i++) g.r(39 + i * 4, 40, 2, 3, U.h);   // mouthparts
        if (p2) for (const [x, y] of [[24, 24], [66, 27], [52, 18]]) { g.line(x, y, x + 5, y + 4, 1, '#ffb03a'); }
      }, '#2a0a06');
    },
    cr_eye(P) {
      const p2 = P.p2 ? 1 : 0;
      return mk('cre' + p2, 14, 22, 7, 21, g => {
        g.r(5, 8, 4, 13, '#c84a24'); g.r(5, 8, 1, 13, '#ff9a6a');
        g.ell(7, 6, 5, 5, '#1a0a08'); g.ell(7, 6, 4, 4, p2 ? '#ff3a2a' : '#2a1a14'); g.ell(6, 5, 1.4, 1.4, '#ffffff');
      }, '#2a0a06');
    },
    cr_leg(P) {
      return mk('crl' + (P.far ? 1 : 0), 40, 22, 3, 6, g => {
        const C = P.far ? { d: '#6a1e0e', m: '#a83a1a', h: '#d86a4a' } : { d: '#8a2a14', m: '#d0502a', h: '#ff9a6a' };
        tube(g, [[3, 6, 3.2], [18, 4, 2.8]], C); tube(g, [[18, 4, 2.6], [30, 12, 2], [36, 19, 0.8]], C);
      }, '#2a0a06');
    },
    cr_arm(P) {
      return mk('cra' + (P.p2 ? 1 : 0), 34, 16, 3, 8, g => { const C = { d: '#8a2a14', m: '#d8562a', h: '#ff9a6a' }; tube(g, [[3, 8, 4.5], [16, 7, 4], [30, 8, 5]], C); spike(g, 18, 3, -1.8, 4, 1.6, C); }, '#2a0a06');
    },
    cr_claw(P) {
      const p2 = P.p2 ? 1 : 0;
      return mk('crc' + p2, 54, 40, 6, 20, g => {
        const C = p2 ? { d: '#7a1010', m: '#d02a1e', h: '#ff7a5a' } : { d: '#8a2a14', m: '#e86030', h: '#ffa878' }, T = { d: '#2a1a14', m: '#4a3428', h: '#7a6050' };
        g.ell(20, 20, 17, 13, C.d); g.ell(19, 19, 15, 11, C.m); g.ell(14, 14, 6, 3, C.h);
        g.poly([[28, 22], [50, 26], [52, 30], [30, 31]], C.m); g.poly([[30, 27], [52, 30], [30, 31]], C.d);   // the fixed lower finger
        g.poly([[48, 25], [53, 28], [50, 31]], T.m); for (const x of [34, 39, 44]) g.poly([[x, 25], [x + 1.5, 22], [x + 3, 25]], '#fff0d8');
      }, '#2a0a06');
    },
    cr_finger(P) {
      const p2 = P.p2 ? 1 : 0;
      return mk('crf' + p2, 40, 18, 3, 12, g => {
        const C = p2 ? { d: '#7a1010', m: '#d02a1e', h: '#ff7a5a' } : { d: '#8a2a14', m: '#e86030', h: '#ffa878' };
        g.poly([[2, 8], [24, 4], [38, 10], [36, 14], [3, 15]], C.m); g.poly([[3, 12], [36, 14], [38, 10], [24, 11]], C.d); g.line(5, 8, 24, 5, 1, C.h);
        g.poly([[34, 9], [39, 11], [35, 14]], '#4a3428'); for (const x of [12, 18, 24]) g.poly([[x, 14], [x + 1.5, 17], [x + 3, 14]], '#fff0d8');
      }, '#2a0a06');
    },
    // ===== raijin (front view): cloud, body, head, arms with drumsticks, drums =====
    rj_cloud(P) {
      return mk('rjc' + (P.f % 2) + (P.p2 ? 1 : 0), 104, 44, 52, 20, g => {
        const C = P.p2 ? ['#2a1a3a', '#4a3060', '#7a5a9a'] : ['#3a3a5a', '#5a5a80', '#9a9ac0'];
        for (const [x, y, r] of [[22, 24, 16], [40, 18, 19], [62, 17, 20], [82, 24, 16], [52, 28, 22]]) g.ell(x, y, r, r * 0.72, C[0]);
        for (const [x, y, r] of [[22, 22, 14], [40, 16, 17], [62, 15, 18], [82, 22, 14], [52, 25, 19]]) g.ell(x - 1, y - 1, r, r * 0.66, C[1]);
        for (const [x, y, r] of [[38, 11, 8], [60, 10, 9], [20, 17, 5]]) g.ell(x, y, r, r * 0.45, C[2]);
        if (P.f % 2) { g.line(30, 34, 34, 40, 1, '#fff6a0'); g.line(34, 40, 31, 43, 1, '#fff6a0'); } else { g.line(70, 34, 66, 39, 1, '#fff6a0'); g.line(66, 39, 69, 43, 1, '#fff6a0'); }
      }, '#14102a');
    },
    rj_body(P) {
      return mk('rjb' + (P.p2 ? 1 : 0), 60, 50, 30, 46, g => {
        const S = P.p2 ? { d: '#1a5a5a', m: '#2a9a8a', h: '#7ae8d0' } : { d: '#1e5a6a', m: '#3a8aa0', h: '#8ad0e0' }, T = { d: '#a86a10', m: '#f2b030', h: '#ffe080' };
        g.poly([[14, 12], [46, 12], [42, 34], [18, 34]], S.m); g.poly([[30, 12], [46, 12], [42, 34], [30, 34]], S.d);
        g.ell(22, 18, 7, 6, S.h); g.ell(38, 18, 7, 6, S.m); g.line(30, 14, 30, 30, 1, S.d); for (const y of [24, 28]) { g.line(24, y, 29, y, 1, S.d); g.line(31, y, 36, y, 1, S.d); }   // chest + abs
        for (const m of [-1, 1]) blob(g, 30 + m * 17, 13, 7.5, 6, S);
        // tiger-skin wrap and a belt rope
        g.poly([[16, 34], [44, 34], [48, 48], [12, 48]], T.m); g.poly([[30, 34], [44, 34], [48, 48], [30, 48]], T.d);
        for (const x of [18, 25, 33, 40]) g.poly([[x, 36], [x + 3, 38], [x + 1, 44]], '#2a1a08');
        g.r(14, 33, 32, 3, '#e8e0d0'); g.r(14, 33, 32, 1, '#ffffff');
      }, '#0a1a20');
    },
    rj_head(P) {
      const m = P.mouth ? 1 : 0, p2 = P.p2 ? 1 : 0;
      return mk('rjh' + m + p2, 50, 46, 25, 40, g => {
        const S = p2 ? { d: '#1a5a5a', m: '#2a9a8a', h: '#7ae8d0' } : { d: '#1e5a6a', m: '#3a8aa0', h: '#8ad0e0' }, Hr = ['#c8c8d8', '#f4f4ff', '#ffffff'], Hn = { d: '#a89a70', m: '#f0e8c8', h: '#ffffff' };
        for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.36, L = 16 - Math.abs(i - 4) * 1.2; spike(g, 25 + Math.cos(a) * 9, 22 + Math.sin(a) * 8, a, L, 4.2, { d: Hr[0], m: Hr[1], h: Hr[2] }); }   // wild hair
        for (const s of [-1, 1]) spike(g, 25 + s * 8, 12, -Math.PI / 2 + s * 0.5, 10, 2.6, Hn);
        blob(g, 25, 26, 13, 12.5, S);
        g.poly([[13, 21], [22, 24], [13, 25]], '#0a1418'); g.poly([[37, 21], [28, 24], [37, 25]], '#0a1418');
        g.poly([[15, 22], [21, 24], [15, 24]], p2 ? '#ff4a3a' : '#ffe14a'); g.poly([[35, 22], [29, 24], [35, 24]], p2 ? '#ff4a3a' : '#ffe14a');
        g.line(13, 18, 22, 21, 2, '#0a1418'); g.line(37, 18, 28, 21, 2, '#0a1418');
        g.r(23, 26, 4, 4, S.d);
        if (m) { g.ell(25, 33, 7, 4.5, '#3a0a10'); g.ell(25, 34, 4, 2, '#c03a3a'); for (const x of [20, 29]) g.poly([[x, 30], [x + 1, 34], [x + 2, 30]], '#ffffff'); }
        else { g.r(19, 32, 12, 2, '#0a1418'); for (const x of [20, 29]) g.poly([[x, 33], [x + 1, 36], [x + 2, 33]], '#ffffff'); }
      }, '#0a1418');
    },
    rj_arm(P) {
      return mk('rja' + (P.p2 ? 1 : 0), 56, 18, 4, 9, g => {
        const S = P.p2 ? { d: '#1a5a5a', m: '#2a9a8a', h: '#7ae8d0' } : { d: '#1e5a6a', m: '#3a8aa0', h: '#8ad0e0' };
        tube(g, [[4, 9, 5], [18, 9, 4.4], [30, 9, 4.6]], S); g.r(14, 6, 3, 6, '#f2b030');   // armband
        blob(g, 33, 9, 5, 5, S);
        g.line(35, 9, 54, 9, 2.6, '#8a5a2a'); g.line(35, 8, 54, 8, 1, '#c89050'); g.ell(54, 9, 2.4, 2.4, '#e8d0a0');   // drumstick
      }, '#0a1418');
    },
    rj_drum(P) {
      const lit = P.lit ? 1 : 0;
      return mk('rjd' + lit, 24, 24, 12, 12, g => {
        g.ell(12, 12, 10, 10, lit ? '#ffe080' : '#8a3a1a'); g.ell(12, 12, 8, 8, lit ? '#ffffff' : '#e8d8b8');
        for (let i = 0; i < 3; i++) { const a = i * 2.09; g.ell(12 + Math.cos(a) * 3, 12 + Math.sin(a) * 3, 2.4, 2.4, lit ? '#ffb030' : '#3a2a6a'); }   // tomoe
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.p(Math.round(12 + Math.cos(a) * 9), Math.round(12 + Math.sin(a) * 9), '#f2c14e'); }
      }, '#1a0a04');
    },
    // ===== demon hands: one great eye, two clawed hands =====
    dh_eye(P) {
      const p2 = P.p2 ? 1 : 0;
      return mk('dhe' + p2, 76, 72, 38, 36, g => {
        const F = p2 ? { d: '#3a0a2a', m: '#7a1a4a', h: '#c84a7a' } : { d: '#2a0a3a', m: '#5a1a6a', h: '#9a4ab0' };
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + 0.3; spike(g, 38 + Math.cos(a) * 24, 36 + Math.sin(a) * 22, a, 9 + (i % 3) * 3, 4, F); }
        g.ell(38, 36, 29, 27, F.d); g.ell(37, 35, 27, 25, F.m); g.ell(30, 24, 9, 4, F.h);
        g.ell(38, 37, 21, 19, '#1a0614'); g.ell(38, 37, 19.5, 17.5, '#f4ece4'); g.ell(35, 33, 9, 6, '#ffffff');
        for (const [a, b, c, d] of [[20, 32, 26, 36], [56, 40, 50, 37], [30, 52, 33, 47], [48, 24, 45, 29]]) g.line(a, b, c, d, 1, '#c84a5a');   // veins
      }, '#10020c');
    },
    dh_pupil(P) {
      const p2 = P.p2 ? 1 : 0;
      return mk('dhp' + p2, 22, 22, 11, 11, g => { g.ell(11, 11, 9, 9, '#2a0a10'); g.ell(11, 11, 8, 8, p2 ? '#ff3a3a' : '#e8a02a'); g.ell(11, 11, 5, 5, p2 ? '#c01020' : '#c86a10'); g.ell(11, 11, 2, 6, '#100004'); g.ell(8, 8, 1.6, 1.6, '#ffffff'); }, null);
    },
    dh_lid(P) {   // k = 1..4: how far the lids have closed
      const k = P.k || 1, p2 = P.p2 ? 1 : 0;
      return mk('dhl' + k + p2, 46, 42, 23, 21, g => {
        const F = p2 ? { d: '#3a0a2a', m: '#7a1a4a' } : { d: '#2a0a3a', m: '#5a1a6a' }, h = k / 4 * 19;
        g.x.save(); g.x.beginPath(); g.x.ellipse(23, 22, 20.5, 18.5, 0, 0, 7); g.x.clip();
        g.r(0, 0, 46, 3 + h, F.m); g.r(0, 41 - h * 0.9, 46, h + 2, F.m); g.r(0, 2 + h, 46, 2, F.d); g.r(0, 40 - h * 0.9, 46, 2, F.d);
        g.x.restore();
      }, null);
    },
    dh_hand(P) {
      const pose = P.pose || 'open', p2 = P.p2 ? 1 : 0;
      return mk('dhh' + pose + p2, 60, 64, 30, 40, g => {
        const S = p2 ? { d: '#3a1a3a', m: '#6a3a6a', h: '#a86aa8' } : { d: '#2a2040', m: '#4a3a6a', h: '#8a7ab0' }, Cl = { d: '#a89a8a', m: '#f0e8dc', h: '#ffffff' }, Rn = p2 ? '#ff4a8a' : '#c86aff';
        const finger = (bx, by, a, L, w, curl) => {
          const mx = bx + Math.cos(a) * L * 0.55, my = by + Math.sin(a) * L * 0.55, a2 = a + curl, ex = mx + Math.cos(a2) * L * 0.5, ey = my + Math.sin(a2) * L * 0.5;
          tube(g, [[bx, by, w], [mx, my, w * 0.85], [ex, ey, w * 0.7]], S); spike(g, ex, ey, a2 + curl * 0.6, 5, w * 0.55, Cl);
        };
        if (pose === 'fist') {
          blob(g, 30, 36, 17, 15, S); for (let i = 0; i < 4; i++) { blob(g, 19 + i * 7.5, 26, 4.2, 4, S); spike(g, 19 + i * 7.5, 22, -Math.PI / 2, 4, 1.6, Cl); }
          blob(g, 13, 40, 5, 6, S);
        } else {
          const open = pose === 'open';
          const fs = open ? [[-0.55, 22], [-0.2, 25], [0.15, 24], [0.48, 20]] : [[-0.4, 14], [-0.12, 30], [0.2, 13], [0.45, 12]];   // 'point' sticks out the 2nd finger
          fs.forEach(([da, L], i) => finger(19 + i * 7.5, 28, -Math.PI / 2 + da, L, 3.6, open || i === 1 ? 0.15 : 1.4));
          blob(g, 30, 38, 16, 14, S); finger(15, 40, Math.PI + 0.5, 16, 3.8, 0.5);
        }
        g.ell(26, 36, 6, 3.4, S.h);
        g.poly([[26, 42], [30, 36], [34, 42], [30, 46]], Rn); g.p(30, 41, '#ffffff');   // a rune on the back of the hand
        g.r(22, 50, 16, 10, S.d); g.r(22, 50, 16, 2, Rn);   // wrist cuff
      }, '#0a0612');
    },
    // ===== sky whale (seen from above, head to the right) =====
    wh_head(P) {
      const o = P.open || 0, p2 = P.p2 ? 1 : 0;
      return mk('whh' + o + p2, 74, 62, 26, 31, g => {
        const C = { d: '#14224a', m: '#24427a', h: '#4a7ab8' }, Gl = p2 ? '#ff7ad0' : '#9ae8ff';
        g.ell(32, 31, 36, 27, C.d); g.ell(31, 30, 34, 25, C.m); g.ell(24, 20, 14, 5, C.h);
        g.ell(44, 31, 8, 4, '#0a1430'); g.ell(44, 31, 4, 2, Gl);   // blowhole
        for (const s of [-1, 1]) { g.ell(52, 31 + s * 19, 3.4, 2.6, '#0a0a1a'); g.ell(52, 31 + s * 19, 2, 1.6, p2 ? '#ff4a6a' : '#ffffff'); }
        if (o) { const w = 4 + o * 5; g.poly([[48, 31 - w], [72, 31 - w * 1.4], [72, 31 + w * 1.4], [48, 31 + w]], '#2a0a1a'); for (let y = -w; y <= w; y += 3) g.line(54, 31 + y, 68, 31 + y * 1.3, 1, '#e8e0d0'); g.ell(56, 31, 4, w * 0.6, '#c84a6a'); }
        else g.line(60, 18, 66, 31, 1, '#0a1430'), g.line(66, 31, 60, 44, 1, '#0a1430');
        for (const [x, y] of [[20, 30], [30, 40], [36, 22], [14, 38]]) { g.p(x, y, '#ffffff'); g.p(x + 1, y, Gl); }
        g.line(20, 30, 30, 40, 1, Gl); g.line(30, 40, 36, 22, 1, Gl);   // a constellation on its back
      }, '#060c20');
    },
    wh_body(P) {
      const i = P.i || 0, p2 = P.p2 ? 1 : 0, R = [[34, 26], [29, 21], [23, 15]][i];
      return mk('whb' + i + p2, R[0] * 2 + 6, R[1] * 2 + 6, R[0] + 3, R[1] + 3, g => {
        const C = { d: '#14224a', m: '#24427a', h: '#4a7ab8' }, Gl = p2 ? '#ff7ad0' : '#9ae8ff', cx = R[0] + 3, cy = R[1] + 3;
        g.ell(cx, cy, R[0], R[1], C.d); g.ell(cx - 1, cy - 1, R[0] - 2, R[1] - 2, C.m); g.ell(cx - R[0] * 0.3, cy - R[1] * 0.45, R[0] * 0.4, R[1] * 0.18, C.h);
        for (const s of [-1, 1]) g.line(cx - R[0] * 0.6, cy + s * R[1] * 0.7, cx + R[0] * 0.6, cy + s * R[1] * 0.75, 1, '#3a6aa8');
        const st = [[0.2, -0.3], [-0.3, 0.2], [0.5, 0.35], [-0.5, -0.4]].slice(0, 4 - i);
        st.forEach(([a, b], k) => { const x = Math.round(cx + a * R[0]), y = Math.round(cy + b * R[1]); g.p(x, y, '#ffffff'); if (k) { const [a2, b2] = st[k - 1]; g.line(cx + a2 * R[0], cy + b2 * R[1], x, y, 1, Gl); } });
      }, '#0c1636');
    },
    wh_fluke(P) {
      const p2 = P.p2 ? 1 : 0;
      return mk('whf' + p2, 56, 56, 52, 28, g => {
        const C = { d: '#14224a', m: '#24427a', h: '#4a7ab8' }, Gl = p2 ? '#ff7ad0' : '#9ae8ff';
        for (const s of [-1, 1]) { g.poly([[52, 28], [36, 28 + s * 6], [14, 28 + s * 25], [4, 28 + s * 24], [10, 28 + s * 12], [26, 28 + s * 3]], C.m); g.poly([[52, 28], [36, 28 + s * 6], [14, 28 + s * 25], [20, 28 + s * 13]], C.d); g.line(44, 28 + s * 2, 10, 28 + s * 22, 1, Gl); }
        g.ell(46, 28, 8, 6, C.m);
      }, '#060c20');
    },
    wh_fin(P) {
      return mk('whn' + (P.p2 ? 1 : 0), 40, 18, 3, 9, g => { const C = { d: '#14224a', m: '#2a4a86', h: '#5a8ac8' }; g.poly([[3, 4], [24, 1], [38, 9], [24, 17], [3, 14]], C.m); g.poly([[3, 9], [38, 9], [24, 17], [3, 14]], C.d); g.line(6, 7, 26, 5, 1, C.h); }, '#060c20');
    },
  };
  function part(name, P = {}) {
    const f = PARTS[name]; if (!f) return null;
    let s = f(P);
    if (P.flash) s = white(s);
    return s;
  }

  // ---------------------------------------------------------------
  //  public API
  // ---------------------------------------------------------------
  // colour variants of existing monsters: the base sprite with its colours shifted.
  // h = hue shift (degrees), s = saturation factor, l = lightness shift, tint/a = blend toward a colour.
  // Outlines, eye-blacks and pure whites are left alone.
  const VAR = {
    fireslime: { base: 'slime', h: -125, s: 1.2 }, iceslime: { base: 'slime', h: 70, l: 0.06 },
    vampbat: { base: 'bat', h: 80, s: 1.3 }, hobgoblin: { base: 'goblin', h: -55, s: 0.9, l: -0.08 }, firearcher: { base: 'archer', h: -70, s: 1.2 },
    generalskel: { base: 'skeleton', tint: '#f2b83a', a: 0.45 }, wraith: { base: 'ghost', tint: '#7a20d0', a: 0.62 }, frostmage: { base: 'mage', h: -55 },
    frostlizard: { base: 'lizard', h: 175 }, lavagolem: { base: 'golem', tint: '#ff5a1a', a: 0.4 }, crimsonknight: { base: 'knight', tint: '#c81a2a', a: 0.45 },
    snowwolf: { base: 'wolf', s: 0.25, l: 0.2 }, sleepshroom: { base: 'mushroom', h: -95 }, poisonspider: { base: 'spider', h: -95, s: 1.2 },
    deepfishman: { base: 'fishman', h: 95, l: -0.08 }, goldscorpion: { base: 'scorpion', s: 1.6, l: 0.08 }, cursemummy: { base: 'mummy', tint: '#7a3ab0', a: 0.4 },
    iceimp: { base: 'imp', h: -160 }, goldslime: { base: 'slime', tint: '#ffcc2a', a: 0.62 }, icewyvern: { base: 'wyvern', h: 25, l: 0.12 }, shadowarmor: { base: 'armor', tint: '#3a1060', a: 0.55 },
  };
  function toHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
    if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    return [h, s, l];
  }
  function toRgb(h, s, l) {
    const f = n => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
    return [f(0), f(8), f(4)];
  }
  function recolor(src, V) {
    const [c, x] = canvas(src.c.width, src.c.height); x.drawImage(src.c, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), a = d.data, T = V.tint ? hex(V.tint) : null;
    for (let i = 0; i < a.length; i += 4) {
      if (!a[i + 3]) continue;
      let [h, s2, l] = toHsl(a[i], a[i + 1], a[i + 2]);
      if (l < 0.13 || (l > 0.93 && s2 < 0.2)) continue;   // outline, pupils, white glints
      if (T) { const k = V.a; a[i] = Math.round(a[i] * (1 - k) + T[0] * k * (0.4 + l)); a[i + 1] = Math.round(a[i + 1] * (1 - k) + T[1] * k * (0.4 + l)); a[i + 2] = Math.round(a[i + 2] * (1 - k) + T[2] * k * (0.4 + l)); continue; }
      h = (h + (V.h || 0) + 360) % 360; s2 = Math.min(1, s2 * (V.s || 1)); l = Math.max(0, Math.min(1, l + (V.l || 0)));
      [a[i], a[i + 1], a[i + 2]] = toRgb(h, s2, l);
    }
    x.putImageData(d, 0, 0);
    return { c, ax: src.ax, ay: src.ay };
  }
  function enemy(type, P) {
    const V = VAR[type];
    if (V) {
      const b = EN[V.base](P), key = 'v_' + type;
      if (!b[key]) b[key] = recolor(b, V);
      let s = b[key]; if (P.flip) s = flipped(s); if (P.flash) s = white(s); return s;
    }
    const f = EN[type]; if (!f) return null;
    let s = f(P);
    if (P.flip) s = flipped(s);
    if (P.flash) s = white(s);
    return s;
  }
  function boss(type, P) {
    const f = BOSS[type]; if (!f) return null;
    let s = f(P);
    if (P.flip) s = flipped(s);
    if (P.flash) s = white(s);
    return s;
  }
  function heroS(P) {
    const key = 'H' + [P.dir, P.step || 0, P.dash ? 1 : 0, P.hurt ? 1 : 0, P.blink ? 1 : 0, P.bob || 0, P.wave || 0, P.w, P.a].join('|');
    let s = cache.get(key);
    if (!s) { s = { c: hero(P), ax: 16, ay: 45 }; cache.set(key, s); }
    if (P.flash) s = white(s);
    return s;
  }
  // 指示3: the charms of the trials float beside the hero (16 x 16, anchor = centre)
  function relic(id, f) {
    const k = f % 4;
    return mk('relic' + id + k, 16, 18, 8, 9, g => {
      if (id === 'c11') {   // hourglass of the dunes: the sand runs
        g.r(4, 2, 8, 2, '#a8823a'); g.r(4, 14, 8, 2, '#a8823a'); g.r(5, 2, 6, 1, '#e8c880'); g.r(5, 14, 6, 1, '#e8c880');
        g.poly([[5, 4], [11, 4], [8.5, 9], [7.5, 9]], '#d8ecff'); g.poly([[5, 14], [11, 14], [8.5, 9], [7.5, 9]], '#d8ecff');
        g.poly([[6, 4 + k * 0.6], [10, 4 + k * 0.6], [8.3, 8], [7.7, 8]], '#f0c060'); g.poly([[5.5, 14], [10.5, 14], [8, 14 - 1.5 - k]], '#f0c060'); g.r(8, 9, 1, 3, '#f0c060');
      } else if (id === 'c12') {   // pearl of the sea in an open shell
        g.poly([[1, 10], [8, 15], [15, 10], [12, 14], [4, 14]], '#ff8a9a'); g.poly([[2, 10], [8, 13], [14, 10]], '#ffc0c8'); for (const x of [4, 8, 12]) g.p(x, 12, '#c04a5a');
        g.ell(8, 7, 4, 4, '#c8d0e8'); g.ell(7.5, 6.5, 3.2, 3.2, '#f4f6ff'); g.r(6, 5, 2, 1, '#ffffff'); g.p(9 + (k % 2), 8, '#b0f0ff');
      } else if (id === 'c13') {   // thunder orb: crackles
        g.ell(8, 8, 6, 6, '#283a9a'); g.ell(7.5, 7.5, 5, 5, '#4a6ae0'); g.ell(6, 6, 2, 1.6, '#a8c0ff');
        const z = k % 2 ? [[5, 4], [9, 7], [7, 8], [11, 12]] : [[10, 4], [7, 7], [9, 8], [5, 12]];
        for (let i = 0; i < 3; i++) g.line(z[i][0], z[i][1], z[i + 1][0], z[i + 1][1], 1, '#fff27a');
        if (k === 1 || k === 3) { g.p(1, 3, '#fff27a'); g.p(14, 13, '#fff27a'); }
      } else if (id === 'c14') {   // demon's eye: it looks around
        g.ell(8, 8, 7, 5.5, '#4a0a1e'); g.ell(8, 8, 6, 4.5, '#f0e4d8'); const lx = [0, 2, 0, -2][k];
        g.ell(8 + lx, 8, 2.8, 3.2, '#c01a3a'); g.ell(8 + lx, 8, 1, 2.4, '#140208'); g.p(7 + lx, 6, '#ffffff');
        for (const [x, y] of [[2, 3], [14, 3], [8, 1]]) g.line(8, 4, x, y, 1, '#4a0a1e');
      } else {   // shard of a shooting star, with a little tail
        for (let i = 0; i < 3; i++) g.p(1 + i * 2, 15 - i * 2 - (k % 2), ['#6a7ad8', '#9aa8ff', '#d8e0ff'][i]);
        g.poly([[10, 1], [12, 6], [16, 8], [12, 10], [10, 16], [8, 10], [4, 8], [8, 6]], '#ffd84a'); g.poly([[10, 3], [11, 7], [14, 8], [11, 9], [10, 13], [9, 9], [6, 8], [9, 7]], '#fff6c0'); g.p(10, 8, '#ffffff');
      }
    }, '#140c1c');
  }
  // item icons (18 x 18) for the item shop, the じゅんび slots and the bag tray
  function itemIcon(id) {
    return mk('icon_' + id, 18, 18, 9, 9, g => {
      const flask = (L, big, tall) => {   // a round flask: cork, neck, glass body with liquid and a highlight
        const cy = big ? 11 : 12, r = big ? 6 : 5;
        g.r(7, tall ? 1 : 2, 4, 2, '#a0703a'); g.r(7, tall ? 1 : 2, 4, 1, '#d0a060');   // cork
        g.r(7, tall ? 3 : 4, 4, tall ? 4 : 3, '#d8e8f0');                                   // neck
        if (tall) { g.r(4, 7, 10, 10, '#d8e8f0'); g.r(5, 9, 8, 7, L.m); g.r(5, 9, 8, 2, L.h); g.r(11, 9, 2, 7, L.d); }
        else { g.ell(9, cy, r + 0.6, r + 0.6, '#d8e8f0'); g.ell(9, cy + 0.5, r - 0.4, r - 0.8, L.m); g.ell(9, cy - r * 0.35, r - 0.8, 1.4, L.h); g.ell(10.5, cy + 1.5, r * 0.45, r * 0.5, L.d); }
        g.r(5, tall ? 9 : cy - 2, 1, 3, '#ffffff');
      };
      if (id === 'herb') {
        g.line(9, 16, 9, 8, 1.4, '#3a7a2a');
        g.poly([[9, 9], [3, 6], [2, 2], [7, 3]], '#4aa83a'); g.poly([[9, 9], [4, 5], [7, 3]], '#7ad85a');
        g.poly([[9, 11], [15, 7], [16, 3], [11, 5]], '#4aa83a'); g.poly([[9, 11], [14, 6], [11, 5]], '#7ad85a');
        g.poly([[9, 13], [5, 12], [4, 15], [8, 15]], '#3a8a2a');
      } else if (id === 'potion') flask({ d: '#8a1a1a', m: '#e5483c', h: '#ff9a8a' });
      else if (id === 'hipotion') { flask({ d: '#1a4a9a', m: '#4a8ae8', h: '#a8d0ff' }); g.p(14, 3, '#ffffff'); g.p(13, 3, '#a8d0ff'); g.p(15, 3, '#a8d0ff'); g.p(14, 2, '#a8d0ff'); g.p(14, 4, '#a8d0ff'); }
      else if (id === 'megapotion') { flask({ d: '#4a1a8a', m: '#9a50f0', h: '#d8b0ff' }, true); g.r(8, 10, 2, 4, '#ffffff'); g.r(7, 11, 4, 2, '#ffffff'); }
      else if (id === 'lifewater') { flask({ d: '#147a8a', m: '#3ac8e0', h: '#b0f4ff' }, false, true); g.poly([[9, 10], [7, 13], [9, 15], [11, 13]], '#ffffff'); }
      else if (id === 'lifedrop') {   // a big shining droplet
        g.poly([[9, 1], [4, 9], [4, 12], [6, 15], [12, 15], [14, 12], [14, 9]], '#2a8a3a'); g.poly([[9, 3], [5, 10], [5, 12], [7, 14], [11, 14], [13, 12], [13, 10]], '#5ad86a');
        g.r(6, 9, 2, 3, '#d8ffd8'); g.p(7, 8, '#ffffff'); g.ell(11, 12, 1.4, 1.2, '#2a9a3a');
      } else if (id === 'elixir') {   // a gold-capped bottle with golden liquid and sparkles
        g.poly([[6, 1], [12, 1], [11, 4], [7, 4]], '#c8901a'); g.r(7, 1, 4, 1, '#ffe080');
        g.r(7, 4, 4, 2, '#e8f0f8'); g.poly([[5, 6], [13, 6], [15, 10], [13, 17], [5, 17], [3, 10]], '#e8f0f8');
        g.poly([[5, 8], [13, 8], [14, 10], [12, 16], [6, 16], [4, 10]], '#f2c14e'); g.poly([[6, 8], [12, 8], [12, 10], [6, 10]], '#fff2a0'); g.r(11, 11, 2, 4, '#c8901a');
        g.p(1, 3, '#ffffff'); g.p(16, 6, '#ffffff'); g.p(2, 14, '#fff2a0');
      } else if (id === 'power') { flask({ d: '#a03a10', m: '#ff7a2a', h: '#ffc080' }); g.r(9, 7, 1, 6, '#ffffff'); g.p(9, 6, '#ffffff'); g.r(7, 12, 5, 1, '#ffe080'); g.r(9, 13, 1, 2, '#6a3a10'); }   // a little sword
      else if (id === 'guard') { flask({ d: '#1a3a7a', m: '#4a7ad8', h: '#a8c0ff' }); g.poly([[6, 9], [12, 9], [12, 12], [9, 15], [6, 12]], '#e8ecf4'); g.r(9, 9, 1, 6, '#a8b4c8'); }
    }, '#1a1420');
  }
  // equipment icons (20 x 20) drawn from the same look tables the hero uses. e = {id, slot, vis, name, fx}
  const BOOTS = {
    b0: { m: '#8a5a2a', d: '#5a3a18', h: '#b88a50' }, b1: { m: '#4aa86a', d: '#2a6a3a', h: '#8ae0a0', lines: 1 }, b2: { m: '#f0f0f8', d: '#a8b0c8', h: '#ffffff', wing: 1 },
    b3: { m: '#6a8ad0', d: '#3a4a8a', h: '#b0c8ff', lines: 2 }, b4: { m: '#3a3a7a', d: '#20204a', h: '#7a7ad0', star: 1 }, b5: { m: '#7ac8f0', d: '#3a7aa8', h: '#d0f0ff', wing: 1 },
    b6: { m: '#7a4ab0', d: '#4a2a70', h: '#c0a0f0', clock: 1 }, b7: { m: '#fff8e0', d: '#d0b060', h: '#ffffff', wing: 2 },
  };
  const FXCOL = { herbal: '#6ad870', gold: '#f2c14e', exp: '#7ab8ff', double: '#ff7a5a', buff: '#c08aff', recoil: '#ff9a3a', chain: '#5ac8ff' };
  function gearIcon(e) {
    return mk('gear_' + e.id, 20, 20, 10, 10, (g, x) => {
      if (e.slot === 'weapon') {
        const W = WEAP[e.vis || e.id] || WEAP.w0, w = 2 + (W.wide || 0), L = Math.round(8 + W.bladeLen * 0.33), T = L + 6, top = -T / 2;
        x.translate(10, 10); x.rotate(Math.PI / 4);
        g.r(-w / 2, top, w, L, W.blade); g.r(-w / 2, top + 1, 1, L - 1, W.bladeH); g.r(-w / 2 + (w > 2 ? 1 : 0), top - 1, Math.max(1, w - 2), 1, W.blade);
        const D = W.deco || W.bladeH, P = (u, v, col) => g.r(-w / 2 + v, top + u, 1, 1, col);
        if (W.shape === 'curve') { for (let u = 0; u < L * 0.6; u++) P(u, w, W.blade); for (let u = 2; u < L * 0.35; u++) P(u, w + 1, W.bladeH); }
        else if (W.shape === 'branch') for (const [u, v] of [[2, -1], [5, w], [8, -1]]) P(u, v, D);
        else if (W.shape === 'zig') for (let u = 1; u < L - 2; u += 4) { P(u, -1, W.bladeH); P(u + 2, w, W.bladeH); }
        else if (W.shape === 'serrated') for (let u = 2; u < L - 1; u += 2) { P(u, -1, W.blade); P(u + 1, w, W.blade); }
        else if (W.shape === 'star') { const m = Math.floor((w - 1) / 2); for (const [u, v] of [[-2, m], [-3, m], [-2, m - 1], [-2, m + 1]]) P(u, v, D); }
        if (W.rune) { g.r(-w / 2 + w - 1, top + 3, 1, 1, W.rune); g.r(-w / 2 + w - 1, top + 6, 1, 1, W.rune); }
        g.r(-w / 2 - 2, top + L, w + 4, 1, '#f2c14e'); g.r(-w / 2, top + L + 1, w, 3, '#5a3a20'); g.r(-w / 2, top + L + 4, w, 1, '#f2c14e');
        if (W.glow) { x.setTransform(1, 0, 0, 1, 0, 0); const gc = '#' + W.glow.match(/\d+/g).slice(0, 3).map(v => (+v).toString(16).padStart(2, '0')).join(''); for (const [px, py] of [[16, 2], [17, 6], [12, 1]]) { g.p(px, py, '#ffffff'); g.p(px - 1, py, gc); g.p(px + 1, py, gc); g.p(px, py - 1, gc); g.p(px, py + 1, gc); } }   // glowing blades sparkle
        return;
      }
      if (e.slot === 'armor') {
        const A2 = ARM[e.vis || e.id] || ARM.a0, cloth = !A2.plate, M = cloth ? '#3a6fd8' : A2.plate, S2 = cloth ? '#2648a0' : A2.plateS, H2 = cloth ? '#79a6f5' : A2.plateH;
        if (A2.wings) for (const m of [-1, 1]) { g.poly([[10 + m * 4, 6], [10 + m * 10, 2], [10 + m * 10, 9], [10 + m * 7, 13]], A2.wings); g.line(10 + m * 6, 5, 10 + m * 9, 4, 1, A2.wingsS); }
        g.poly([[3, 4], [17, 4], [16, 9], [14, 18], [6, 18], [4, 9]], M);   // the chest piece
        g.poly([[10, 4], [17, 4], [16, 9], [14, 18], [10, 18]], S2); g.poly([[4, 5], [7, 5], [7, 12], [5, 9]], H2);
        g.poly([[7, 3], [13, 3], [11, 6], [9, 6]], cloth ? '#f8d0a8' : '#1a1420');   // neck opening
        if (A2.scale || A2.chain) for (let yy = 8; yy < 17; yy += 2) for (let xx = 6 + (yy % 4 ? 1 : 0); xx < 15; xx += 2) g.p(xx, yy, S2);
        if (cloth) { g.r(5, 13, 10, 2, '#6a4020'); g.r(9, 13, 2, 2, '#f2c14e'); }
        else { g.r(8, 9, 4, 4, A2.emblem || '#f2c14e'); g.p(8, 9, '#ffffff'); g.r(5, 15, 10, 1, '#f2c14e'); }
        if (A2.pauldron) for (const m of [-1, 1]) { g.ell(10 + m * 7, 5, 3.6, 2.8, M); g.ell(10 + m * 7 - 0.6, 4.4, 2, 1.2, H2); g.r(10 + m * 7, 7, 1, 1, A2.emblem); }
        if (A2.fin) for (const m of [-1, 1]) for (let i = 0; i < 3; i++) g.poly([[10 + m * (5 + i), 4], [10 + m * (6 + i), 0 + i], [10 + m * (7 + i), 4]], i % 2 ? A2.finS : A2.fin);
        if (A2.horns) for (const m of [-1, 1]) { g.poly([[10 + m * 5, 4], [10 + m * 9, -1], [10 + m * 8, 4]], A2.horns); g.p(10 + m * 7, 3, A2.hornsS); }
        if (A2.spark) for (const [px, py] of [[1, 3], [18, 7], [2, 15], [17, 17]]) { g.p(px, py, '#ffffff'); g.p(px - 1, py, A2.spark); g.p(px + 1, py, A2.spark); g.p(px, py - 1, A2.spark); g.p(px, py + 1, A2.spark); }
        return;
      }
      if (e.slot === 'boots') {
        const fxk = e.fx ? Object.keys(e.fx)[0] : null, B = BOOTS[e.id] || (fxk ? { m: FXCOL[fxk] || '#8a5a2a', d: '#3a2a1a', h: '#ffffff', spring: fxk === 'recoil', lines: fxk === 'chain' ? 1 : 0 } : BOOTS.b0);
        g.r(5, 2, 7, 11, B.m); g.r(10, 2, 2, 11, B.d); g.r(5, 2, 7, 2, B.h); g.r(5, 2, 1, 11, B.h);   // shaft with a turned-down cuff
        g.poly([[5, 12], [12, 11], [16, 13], [17, 16], [5, 16]], B.m); g.poly([[12, 13], [16, 13], [17, 16], [12, 16]], B.d);
        g.r(4, 16, 14, 2, B.spring ? '#8a8a90' : '#2a1a10'); g.r(6, 4, 5, 1, B.d);
        if (B.spring) for (let i = 0; i < 3; i++) g.r(6 + i * 4, 18, 2, 2, '#c8c8d0');
        if (B.wing) { g.poly([[5, 5], [0, 2], [1, 6], [0, 9], [5, 9]], '#ffffff'); g.line(1, 4, 4, 6, 1, '#c8d0e8'); g.line(1, 7, 4, 8, 1, '#c8d0e8'); if (B.wing > 1) g.p(14, 3, '#f2c14e'); }
        if (B.lines) for (let i = 0; i < B.lines + 1; i++) g.r(0, 11 + i * 2, 3, 1, '#ffffff');
        if (B.star) { g.poly([[8, 6], [9, 8], [11, 8], [9, 9], [10, 11], [8, 10], [6, 11], [7, 9], [5, 8], [7, 8]], '#ffe14a'); }
        if (B.clock) { g.ell(8.5, 8, 2.6, 2.6, '#e8e0ff'); g.r(8, 6, 1, 2, '#2a1a40'); g.r(8, 8, 2, 1, '#2a1a40'); }
        return;
      }
      // charms: c11-c15 are the floating relics; the rest by kind
      if (/^c1[1-5]$/.test(e.id)) { x.translate(2, 1); const r = relic(e.id, 0); x.drawImage(r.c, 0, 0); return; }
      const fxk = e.fx ? Object.keys(e.fx)[0] : null, fc = FXCOL[fxk] || '#7ad8ff';
      const kind = { c1: 'amulet', c2: 'ring', c3: 'bracelet', c4: 'pendant', c5: 'ring', c6: 'bracelet', c7: 'crown', c8: 'medal', c9: 'orb', c10: 'drop' }[e.id]
        || (/ゆびわ/.test(e.name) ? 'ring' : /うでわ/.test(e.name) ? 'bracelet' : /ペンダント/.test(e.name) ? 'pendant' : 'amulet');
      const C = { c1: ['#d03a3a', '#ffe080'], c2: ['#c8d0dc', '#4a8ae8'], c3: ['#c08040', '#e8e0c0'], c4: ['#f2c14e', '#e5483c'], c5: ['#f2c14e', '#ffffff'], c6: ['#8a6a20', '#e5483c'], c7: ['#f2c14e', '#4a8ae8'], c8: ['#f2c14e', '#c0303a'], c9: ['#fff6c0', '#ffffff'], c10: ['#4ab05a', '#b0f0a0'] }[e.id] || ['#f2c14e', fc];
      const [m, gem] = C;
      if (kind === 'ring') { g.ell(10, 12, 6, 5, m); g.ell(10, 12, 3.6, 2.8, 'rgba(0,0,0,0)'); x.clearRect(7, 10, 6, 4); x.clearRect(8, 9, 4, 6); g.ell(10, 5, 3, 3, gem); g.p(9, 4, '#ffffff'); g.r(8, 7, 4, 1, m); }
      else if (kind === 'bracelet') { g.ell(10, 11, 8, 6, m); x.clearRect(5, 9, 10, 4); x.clearRect(6, 8, 8, 6); g.ell(10, 15.5, 2.4, 2, gem); g.p(9, 15, '#ffffff'); g.r(3, 10, 1, 2, '#ffffff'); }
      else if (kind === 'pendant') { g.line(4, 1, 10, 9, 1, '#c8c0a0'); g.line(16, 1, 10, 9, 1, '#c8c0a0'); g.poly([[10, 8], [15, 13], [10, 19], [5, 13]], m); g.poly([[10, 10], [13, 13], [10, 16], [7, 13]], gem); g.p(9, 12, '#ffffff'); }
      else if (kind === 'crown') { g.poly([[2, 16], [2, 6], [6, 11], [10, 3], [14, 11], [18, 6], [18, 16]], m); g.r(2, 14, 16, 2, '#c8901a'); g.ell(10, 10, 1.6, 1.6, gem); g.p(4, 13, gem); g.p(16, 13, gem); }
      else if (kind === 'medal') { g.poly([[6, 0], [9, 0], [10, 6], [7, 6]], '#3a6ad8'); g.poly([[11, 0], [14, 0], [13, 6], [10, 6]], '#c0303a'); g.ell(10, 12, 6, 6, m); g.ell(10, 12, 4, 4, '#c8901a'); g.poly([[8, 10], [12, 9], [11, 12], [13, 14], [8, 14]], gem); }
      else if (kind === 'orb') { g.ell(10, 10, 7, 7, '#e8c860'); g.ell(10, 10, 5.6, 5.6, m); g.ell(8, 8, 2, 1.6, gem); for (const [px, py] of [[2, 2], [17, 4], [3, 17]]) g.p(px, py, '#ffffff'); }
      else if (kind === 'drop') { g.poly([[10, 1], [4, 10], [5, 16], [10, 18], [15, 16], [16, 10]], m); g.poly([[10, 4], [6, 11], [7, 15], [10, 16]], gem); g.poly([[10, 1], [13, 0], [12, 3]], '#2a8a3a'); }
      else { g.line(10, 1, 10, 5, 1, '#e8e0c0'); g.poly([[5, 6], [15, 6], [16, 17], [4, 17]], fxk ? fc : m); g.r(5, 6, 10, 2, '#f2c14e'); g.r(8, 10, 4, 4, '#ffffff'); g.r(9, 11, 2, 2, fxk ? fc : m); }   // omamori pouch
    }, '#1a1420');
  }
  // draw a sprite with its feet at (x, y) in logical px
  function draw(ctx, s, x, y, alpha) {
    if (!s) return;
    const k = SCALE;
    ctx.imageSmoothingEnabled = false;
    if (alpha != null && alpha < 1) { const a = ctx.globalAlpha; ctx.globalAlpha = a * alpha; ctx.drawImage(s.c, Math.round(x / k - s.ax) * k, Math.round(y / k - s.ay) * k, s.c.width * k, s.c.height * k); ctx.globalAlpha = a; }
    else ctx.drawImage(s.c, Math.round(x / k - s.ax) * k, Math.round(y / k - s.ay) * k, s.c.width * k, s.c.height * k);
  }
  // ---------------------------------------------------------------
  //  ENVIRONMENT: tiles, props, pickups, projectiles, effects, NPCs
  // ---------------------------------------------------------------
  const sh = (h, k) => {   // lighten (k > 0) / darken (k < 0) a hex colour
    const c = hex(h).map(v => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)));
    return '#' + c.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
  };
  function seeded(n) { let s = n * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
  function tileCanvas(key, w, h, draw) {
    let c = cache.get(key); if (c) return c;
    const [cv, x] = canvas(w, h); draw(api(x), x); cache.set(key, cv); return cv;
  }
  // floor tiles per dungeon style (32 x 32 art px, seamless)
  const FLOOR_STYLE = ['stone', 'earth', 'mine', 'crystal', 'crypt', 'lava', 'ice', 'marble', 'fort', 'wet', 'sand', 'wood', 'void', 'hell',
    'swamp', 'deck', 'peak', 'library', 'jungle', 'forge', 'mirror', 'abyss', 'bone', 'waste', 'castle', 'canopy', 'dream', 'ruins', 'heaven', 'chaos', 'dune', 'coral', 'storm', 'flesh', 'galaxy'];
  function floorTile(di, pal) {
    const style = FLOOR_STYLE[di] || 'stone';
    return tileCanvas('floor' + di + pal.floor, 32, 32, g => {
      const r = seeded(di + 7), F = pal.floor, L = pal.floorLn, Hh = sh(F, 0.12), Dk = sh(F, -0.18);
      const slabs = (w, h, off) => {
        g.r(0, 0, 32, 32, L);
        for (let y = 0; y < 32; y += h) for (let x = ((y / h) % 2) * off - off; x < 32; x += w) {
          const v = r(); g.r(x + 1, y + 1, w - 1, h - 1, v < 0.33 ? F : v < 0.66 ? sh(F, 0.05) : sh(F, -0.05));
          g.r(x + 1, y + 1, w - 2, 1, Hh); g.r(x + 1, y + h - 1, w - 1, 1, Dk);
          if (r() < 0.4) g.p(x + 2 + Math.floor(r() * (w - 4)), y + 2 + Math.floor(r() * (h - 4)), Dk);
        }
      };
      switch (style) {
        case 'earth': {
          g.r(0, 0, 32, 32, F);
          for (let i = 0; i < 40; i++) g.p(Math.floor(r() * 32), Math.floor(r() * 32), r() < 0.5 ? Dk : Hh);
          for (let i = 0; i < 5; i++) { const x = Math.floor(r() * 30), y = Math.floor(r() * 29); g.p(x, y + 2, '#6aa848'); g.p(x + 1, y + 1, '#8ac860'); g.p(x + 2, y + 2, '#6aa848'); }
          for (let i = 0; i < 2; i++) { const x = Math.floor(r() * 28), y = Math.floor(r() * 28); g.r(x, y, 3, 2, '#a86a3a'); g.p(x + 1, y, '#c88a4a'); }
          break;
        }
        case 'mine': slabs(10, 8, 5); for (let i = 0; i < 6; i++) g.p(Math.floor(r() * 32), Math.floor(r() * 32), '#c8a060'); break;
        case 'crystal': slabs(16, 16, 8); for (let i = 0; i < 3; i++) { const x = 3 + Math.floor(r() * 26), y = 4 + Math.floor(r() * 24); g.p(x, y, '#9fe8ff'); g.p(x, y - 1, '#ffffff'); g.p(x + 1, y, '#7ad8ff'); } break;
        case 'crypt': slabs(16, 10, 8); g.p(6, 14, '#e8e2cf'); g.r(7, 14, 3, 1, '#d8d2bf'); g.p(22, 27, '#e8e2cf'); g.line(20, 3, 25, 8, 1, Dk); break;
        case 'lava': case 'hell': {
          g.r(0, 0, 32, 32, F);
          for (let y = 0; y < 32; y += 8) for (let x = (y / 8) % 2 * 4; x < 32; x += 8) g.r(x, y, 7, 7, r() < 0.5 ? F : sh(F, -0.1));
          const glow = style === 'hell' ? '#ff4a1a' : '#ff8a2a';
          g.line(2, 5, 12, 10, 1, glow); g.line(12, 10, 16, 20, 1, glow); g.line(16, 20, 28, 24, 1, glow); g.line(22, 2, 29, 9, 1, glow);
          g.p(12, 10, '#ffe080'); g.p(16, 20, '#ffe080');
          break;
        }
        case 'ice': slabs(16, 16, 0); g.line(3, 12, 9, 6, 1, '#ffffff'); g.line(19, 28, 25, 22, 1, '#ffffff'); g.p(26, 5, '#ffffff'); break;
        case 'marble': {
          g.r(0, 0, 32, 32, F); g.r(0, 0, 32, 1, '#d8c070'); g.r(0, 0, 1, 32, '#d8c070'); g.r(16, 0, 1, 32, L); g.r(0, 16, 32, 1, L);
          g.line(3, 20, 12, 26, 1, sh(F, -0.08)); g.line(20, 4, 28, 10, 1, sh(F, -0.08)); g.r(14, 14, 5, 5, '#d8c070'); g.r(15, 15, 3, 3, F);
          break;
        }
        case 'fort': slabs(16, 8, 8); g.p(5, 4, '#7a1a20'); g.p(21, 20, '#7a1a20'); break;
        case 'wet': slabs(16, 16, 8); g.r(4, 20, 6, 3, '#5ac0b8'); g.r(5, 20, 3, 1, '#a8f0e8'); for (let i = 0; i < 6; i++) g.p(Math.floor(r() * 32), Math.floor(r() * 32), '#3a8a4a'); break;
        case 'sand': slabs(16, 8, 8); for (let i = 0; i < 10; i++) g.p(Math.floor(r() * 32), Math.floor(r() * 32), sh(F, 0.2)); g.p(9, 5, '#a8784a'); break;
        case 'wood': {
          for (let y = 0; y < 32; y += 6) { g.r(0, y, 32, 6, r() < 0.5 ? F : sh(F, 0.06)); g.r(0, y + 5, 32, 1, L); g.r(0, y, 32, 1, Hh); const s = Math.floor(r() * 24); g.r(s, y, 1, 5, L); g.p(s + 2, y + 2, '#d8b070'); }
          break;
        }
        case 'void': {
          g.r(0, 0, 32, 32, F); for (let i = 0; i < 12; i++) g.p(Math.floor(r() * 32), Math.floor(r() * 32), r() < 0.7 ? sh(F, 0.25) : '#ffffff');
          g.r(0, 31, 32, 1, L); g.r(31, 0, 1, 32, L); g.p(8, 8, '#c86bff'); g.p(24, 19, '#7ad8ff');
          break;
        }
        case 'castle': { for (let y = 0; y < 32; y += 16) for (let x = 0; x < 32; x += 16) { g.r(x, y, 16, 16, ((x + y) / 16) % 2 ? F : sh(F, -0.25)); g.r(x, y, 16, 1, Hh); } break; }
        case 'swamp': {
          g.r(0, 0, 32, 32, F);
          for (let i = 0; i < 36; i++) g.p(Math.floor(r() * 32), Math.floor(r() * 32), r() < 0.5 ? Dk : Hh);
          g.ell(9, 22, 6, 3, '#3a4a2a'); g.ell(9, 22, 4.6, 2, '#5a7a3a'); g.r(7, 21, 3, 1, '#a8d070');
          g.ell(25, 8, 4, 2, '#3a4a2a'); g.r(24, 7, 2, 1, '#8ab050'); g.p(18, 12, '#c8f060'); g.p(28, 26, '#9a4ad8');
          for (const [x, y] of [[19, 28], [3, 6]]) { g.r(x, y - 4, 1, 4, '#4a7a2a'); g.r(x + 2, y - 3, 1, 3, '#5a8a3a'); }
          break;
        }
        case 'deck': {
          for (let y = 0; y < 32; y += 8) { g.r(0, y, 32, 8, r() < 0.5 ? F : sh(F, 0.06)); g.r(0, y + 7, 32, 1, L); g.r(0, y, 32, 1, Hh); const s = 4 + Math.floor(r() * 22); g.r(s, y, 1, 7, L); g.p(s - 2, y + 3, '#c8c0a0'); g.p(s + 2, y + 3, '#c8c0a0'); }
          g.p(12, 20, sh(F, -0.25)); g.r(22, 12, 3, 1, sh(F, -0.2));
          break;
        }
        case 'peak': {
          g.r(0, 0, 32, 32, F);
          for (let i = 0; i < 5; i++) { const x = Math.floor(r() * 26), y = Math.floor(r() * 26), w = 4 + Math.floor(r() * 5); g.r(x, y, w, 3, sh(F, -0.12)); g.r(x, y, w, 1, Hh); }
          for (let i = 0; i < 14; i++) g.p(Math.floor(r() * 32), Math.floor(r() * 32), r() < 0.5 ? '#f0f4ff' : Dk);
          break;
        }
        case 'library': {
          g.r(0, 0, 32, 32, F); g.r(0, 0, 32, 2, '#c9a24a'); g.r(0, 30, 32, 2, '#c9a24a'); g.r(0, 2, 32, 1, '#7a1a20'); g.r(0, 29, 32, 1, '#7a1a20');
          g.r(14, 10, 4, 12, sh(F, 0.12)); g.r(10, 14, 12, 4, sh(F, 0.12)); g.r(15, 15, 2, 2, '#c9a24a');
          for (const [x, y] of [[4, 8], [27, 23]]) g.p(x, y, sh(F, -0.2));
          break;
        }
        case 'jungle': slabs(16, 12, 8);
          for (let i = 0; i < 10; i++) { const x = Math.floor(r() * 31), y = Math.floor(r() * 31); g.r(x, y, 2, 1, '#4a8a2a'); g.p(x, y + 1, '#2e5a1a'); }
          g.line(0, 4, 8, 10, 1, '#3a7a22'); g.line(8, 10, 10, 18, 1, '#3a7a22'); g.p(8, 10, '#8ad050');
          break;
        case 'forge': {
          for (let y = 0; y < 32; y += 16) for (let x = 0; x < 32; x += 16) { g.r(x, y, 16, 16, ((x + y) / 16) % 2 ? F : sh(F, -0.06)); g.r(x, y, 16, 1, Hh); g.r(x, y + 15, 16, 1, L); g.r(x + 15, y, 1, 16, L); for (const [a, b] of [[2, 2], [13, 2], [2, 13], [13, 13]]) g.p(x + a, y + b, '#9a9aa8'); }
          g.r(0, 15, 32, 1, '#ff8a2a'); g.p(7, 15, '#ffe060'); g.p(23, 15, '#ffe060');
          break;
        }
        case 'mirror': {
          for (let y = 0; y < 32; y += 16) for (let x = 0; x < 32; x += 16) { g.r(x, y, 16, 16, ((x + y) / 16) % 2 ? F : sh(F, -0.15)); g.r(x, y, 16, 1, '#ffffff'); g.r(x, y, 1, 16, sh(F, 0.3)); }
          g.line(3, 12, 11, 4, 1, '#ffffff'); g.line(19, 28, 27, 20, 1, '#e8f0ff'); g.p(5, 12, '#ffffff');
          break;
        }
        case 'abyss': {
          g.r(0, 0, 32, 32, F);
          for (let i = 0; i < 24; i++) g.p(Math.floor(r() * 32), Math.floor(r() * 32), r() < 0.6 ? Dk : Hh);
          g.r(6, 24, 1, 5, '#c84a6a'); g.r(4, 25, 1, 3, '#c84a6a'); g.r(8, 26, 1, 3, '#e06a8a');
          g.ell(24, 9, 2, 2, '#4a9ad8'); g.p(24, 8, '#c0f0ff'); g.p(27, 4, '#c0f0ff'); g.p(14, 16, '#3ad8d8');
          break;
        }
        case 'bone': {
          g.r(0, 0, 32, 32, F);
          for (let i = 0; i < 30; i++) g.p(Math.floor(r() * 32), Math.floor(r() * 32), r() < 0.5 ? Dk : Hh);
          g.r(6, 8, 7, 2, '#d8d0b8'); g.r(5, 7, 2, 4, '#e8e2cf'); g.r(12, 7, 2, 4, '#e8e2cf');
          g.ell(23, 22, 3, 2.6, '#e8e2cf'); g.p(22, 22, '#2a2420'); g.p(24, 22, '#2a2420'); g.r(22, 24, 3, 1, '#b4ab90');
          g.line(14, 26, 18, 30, 1, '#b4ab90');
          break;
        }
        case 'waste': {
          g.r(0, 0, 32, 32, F);
          for (let i = 0; i < 20; i++) g.p(Math.floor(r() * 32), Math.floor(r() * 32), r() < 0.5 ? Dk : Hh);
          g.line(0, 10, 9, 13, 1, Dk); g.line(9, 13, 14, 22, 1, Dk); g.line(14, 22, 26, 25, 1, Dk); g.line(9, 13, 20, 6, 1, Dk); g.line(26, 25, 32, 20, 1, Dk);
          g.p(14, 22, '#ff4a2a'); g.p(20, 6, '#ff6a3a');
          break;
        }
        case 'canopy': {   // branches of the world tree: bark planks, moss, a fallen leaf
          for (let y = 0; y < 32; y += 8) { g.r(0, y, 32, 8, r() < 0.5 ? F : sh(F, 0.07)); g.r(0, y + 7, 32, 1, L); for (let x = 0; x < 32; x += 3) if (r() < 0.5) g.r(x, y + 1 + Math.floor(r() * 5), 2, 1, sh(F, -0.12)); }
          g.ell(8, 12, 4, 2, '#4a8a2a'); g.r(6, 11, 4, 1, '#7ac04a'); g.ell(25, 27, 3, 1.6, '#4a8a2a');
          g.poly([[20, 4], [26, 6], [22, 9]], '#9ad860'); g.line(20, 4, 23, 7, 1, '#5a9a2a'); g.p(14, 22, '#ffe880');
          break;
        }
        case 'dream': {    // soft cloud tiles, little stars
          g.r(0, 0, 32, 32, F);
          for (const [x, y, w] of [[2, 4, 10], [18, 18, 11], [8, 24, 7]]) { g.ell(x + w / 2, y + 3, w / 2, 2.6, sh(F, 0.16)); g.ell(x + w / 2 - 1, y + 2, w / 2 - 1.5, 1.4, sh(F, 0.3)); }
          for (const [x, y, c] of [[24, 6, '#fff6c0'], [6, 16, '#ffd0f8'], [28, 28, '#d0e8ff']]) { g.p(x, y, c); g.p(x - 1, y, sh(F, 0.3)); g.p(x + 1, y, sh(F, 0.3)); g.p(x, y - 1, sh(F, 0.3)); g.p(x, y + 1, sh(F, 0.3)); }
          break;
        }
        case 'ruins': {    // cracked flagstones of the petrified city
          slabs(16, 16, 8);
          g.line(3, 6, 9, 11, 1, Dk); g.line(9, 11, 8, 15, 1, Dk); g.line(20, 21, 27, 24, 1, Dk); g.line(27, 24, 30, 30, 1, Dk);
          g.r(22, 4, 4, 3, sh(F, -0.1)); g.r(22, 4, 4, 1, Hh); g.p(12, 26, '#6a8a4a'); g.p(13, 26, '#8aa85a');
          break;
        }
        case 'heaven': {   // white marble, gold inlay, a wisp of cloud
          g.r(0, 0, 32, 32, F); g.r(0, 0, 32, 1, Hh); g.r(0, 0, 1, 32, Hh); g.r(0, 31, 32, 1, L); g.r(31, 0, 1, 32, L);
          g.r(15, 0, 2, 32, '#e8c870'); g.r(0, 15, 32, 2, '#e8c870'); g.r(15, 15, 2, 2, '#fff2c0');
          g.line(4, 6, 10, 9, 1, sh(F, -0.06)); g.line(20, 24, 27, 22, 1, sh(F, -0.06));
          g.ell(24, 7, 5, 1.6, '#ffffff'); g.ell(7, 25, 4, 1.4, '#ffffff');
          break;
        }
        case 'chaos': {    // a broken floor over the void, magenta cracks and stars
          g.r(0, 0, 32, 32, F);
          for (let y = 0; y < 32; y += 16) for (let x = 0; x < 32; x += 16) { g.r(x + 1, y + 1, 14, 14, ((x + y) / 16) % 2 ? sh(F, 0.06) : sh(F, -0.08)); g.r(x + 1, y + 1, 14, 1, Hh); }
          g.line(0, 9, 7, 12, 1, '#ff4ad8'); g.line(7, 12, 10, 20, 1, '#ff4ad8'); g.line(10, 20, 22, 23, 1, '#c03aff'); g.line(22, 23, 32, 19, 1, '#ff4ad8'); g.p(10, 20, '#ffd0f4');
          for (const [x, y] of [[25, 6], [4, 28], [18, 4]]) g.p(x, y, '#ffffff');
          break;
        }
        case 'dune': {     // wind-rippled sand
          g.r(0, 0, 32, 32, F);
          for (let y = 2; y < 32; y += 7) { for (let x = 0; x < 32; x++) { const yy = y + Math.round(Math.sin((x + y * 3) * 0.35) * 1.5); g.p(x, yy, Hh); g.p(x, yy + 1, Dk); } }
          g.p(9, 20, '#8a6a3a'); g.p(24, 9, '#f0e0b0'); break;
        }
        case 'coral': {    // wet rock with coral and shells
          slabs(16, 16, 8);
          for (const [x, y, c] of [[5, 6, '#ff7a8a'], [22, 20, '#ffb0a0']]) { g.r(x, y, 1, 4, c); g.r(x - 2, y + 1, 1, 2, c); g.r(x + 2, y, 1, 3, c); }
          g.ell(14, 27, 2.4, 1.6, '#f0e8d0'); g.p(14, 26, '#ffffff'); g.p(27, 5, '#8ae8d0'); break;
        }
        case 'storm': {    // cloud-top flagstones with a crackle of lightning
          slabs(16, 12, 8); g.line(4, 4, 9, 9, 1, '#fff6a0'); g.line(9, 9, 7, 13, 1, '#fff6a0'); g.ell(24, 24, 5, 2, sh(F, 0.18)); break;
        }
        case 'flesh': {    // the demon's palm: dark skin, veins, a faint rune
          g.r(0, 0, 32, 32, F);
          for (let i = 0; i < 24; i++) g.p(Math.floor(r() * 32), Math.floor(r() * 32), r() < 0.5 ? Dk : Hh);
          g.line(0, 12, 8, 15, 1, '#7a2a5a'); g.line(8, 15, 14, 24, 1, '#7a2a5a'); g.line(14, 24, 24, 26, 1, '#7a2a5a'); g.line(20, 2, 26, 8, 1, '#5a1a4a');
          g.p(26, 16, '#c86aff'); g.p(27, 17, '#c86aff'); g.p(25, 17, '#8a3ab0'); break;
        }
        case 'galaxy': {   // floating glass tiles over the night sky
          g.r(0, 0, 32, 32, F);
          for (let y = 0; y < 32; y += 16) for (let x = 0; x < 32; x += 16) { g.r(x + 1, y + 1, 14, 14, sh(F, ((x + y) / 16) % 2 ? 0.08 : 0.02)); g.r(x + 1, y + 1, 14, 1, '#4a5aa0'); }
          for (const [x, y, c] of [[6, 5, '#ffffff'], [21, 11, '#fff2a0'], [12, 23, '#a8d0ff'], [27, 27, '#ffffff']]) g.p(x, y, c);
          g.line(6, 5, 12, 23, 1, 'rgba(160,200,255,0.5)'); break;
        }
        default: slabs(16, 16, 8);
      }
    });
  }
  function wallTile(di, pal) {
    return tileCanvas('wall' + di + pal.wall, 32, 16, g => {
      g.r(0, 0, 32, 16, pal.wall);
      for (const [x, y] of [[1, 1], [17, 1], [-7, 9], [9, 9], [25, 9]]) { g.r(x, y, 14, 6, pal.wallHi); g.r(x, y, 14, 1, sh(pal.wallHi, 0.18)); g.r(x, y + 5, 14, 1, sh(pal.wallHi, -0.25)); }
      g.p(5, 3, sh(pal.wallHi, -0.2)); g.p(21, 11, sh(pal.wallHi, -0.2));
    });
  }
  // 2x2 dither used for telegraph areas
  function dither(rgb, a) {
    return tileCanvas('dith' + rgb + a, 2, 2, g => { g.p(0, 0, `rgba(${rgb},${a})`); g.p(1, 1, `rgba(${rgb},${a})`); g.p(1, 0, `rgba(${rgb},${a * 0.35})`); g.p(0, 1, `rgba(${rgb},${a * 0.35})`); });
  }

  // breath colours: outer, middle, core, outline
  const FLAME = { fire: ['#c83a10', '#ff8a2a', '#ffe060', '#3a0a04'], poison: ['#3a8a10', '#8ae02a', '#e8ff90', '#0e2a04'],
    water: ['#1a5ac8', '#4ab0ff', '#d0f4ff', '#04142a'], ghost: ['#1a8a6a', '#4affc0', '#e0fff4', '#04261c'], void: ['#5a0aa0', '#c03aff', '#ffc8ff', '#14021e'] };
  const ENV = {
    // ---- surprise events ----
    qbox(f) {          // ハテナ箱: a floating rune box; the "？" glimmers
      return mk('qbox' + (f % 4), 26, 28, 13, 24, g => {
        const F = { d: '#2a1a6a', m: '#5a3ad8', h: '#9a80ff' }, G = '#f2c14e', GH = '#fff2c0';
        g.poly([[3, 8], [13, 3], [23, 8], [13, 13]], '#b8a8ff'); g.poly([[13, 3], [23, 8], [13, 13]], '#8a70f0');   // top face
        g.poly([[3, 8], [13, 13], [13, 25], [3, 20]], F.m); g.poly([[13, 13], [23, 8], [23, 20], [13, 25]], F.d);
        g.line(3, 8, 13, 13, 1, G); g.line(13, 13, 23, 8, 1, G); g.line(13, 13, 13, 25, 1, G); g.line(3, 8, 3, 20, 1, G); g.line(23, 8, 23, 20, 1, G);
        for (const [x, y] of [[3, 8], [23, 8], [13, 13], [13, 3]]) g.p(x, y, GH);
        const C = ['#ffffff', '#fff2a0', '#ffd0ff', '#c0f0ff'][f % 4];
        // "？" on the front-left face
        g.r(6, 12, 4, 1, C); g.r(9, 13, 1, 2, C); g.r(7, 15, 2, 1, C); g.r(7, 16, 1, 1, C); g.r(7, 18, 1, 1, C);
        g.r(16, 12, 4, 1, '#c8b0ff'); g.r(19, 13, 1, 2, '#c8b0ff'); g.r(17, 15, 2, 1, '#c8b0ff'); g.r(17, 16, 1, 1, '#c8b0ff'); g.r(17, 18, 1, 1, '#c8b0ff');
        if (f % 2) { g.p(24, 2, '#ffffff'); g.p(1, 14, '#fff2a0'); } else { g.p(2, 3, '#ffffff'); g.p(25, 16, '#fff2a0'); }
      }, '#120a2a');
    },
    qicon(kind) {      // what came out of the box
      return mk('qi' + kind, 22, 22, 11, 11, g => {
        if (kind === 'giant') { g.poly([[11, 2], [19, 10], [14, 10], [14, 19], [8, 19], [8, 10], [3, 10]], '#ff5a3a'); g.poly([[11, 2], [19, 10], [14, 10], [14, 19], [11, 19]], '#c8301a'); g.line(8, 10, 11, 4, 1, '#ffd0a0'); }
        else if (kind === 'bolt') { g.poly([[13, 1], [5, 12], [10, 12], [8, 21], [17, 8], [12, 8], [15, 1]], '#ffe14a'); g.poly([[13, 1], [10, 9], [12, 8], [15, 1]], '#ffffff'); }
        else if (kind === 'clone') { for (const [x, c, c2] of [[8, '#5a8ad8', '#3a5aa0'], [14, '#a8d0ff', '#6a98d8']]) { g.ell(x, 7, 3.4, 3.4, c); g.poly([[x - 4, 20], [x - 3.5, 11], [x + 3.5, 11], [x + 4, 20]], c2); g.r(x - 3, 11, 6, 3, c); } g.p(13, 6, '#1a1420'); g.p(15, 6, '#1a1420'); }
        else if (kind === 'bomb') { g.ell(10, 13, 7, 7, '#2a2a34'); g.ell(8, 11, 2.4, 2, '#6a6a80'); g.r(13, 4, 3, 3, '#5a5a6a'); g.line(15, 4, 18, 1, 1, '#c8b890'); g.r(17, 0, 3, 3, '#ffd24a'); g.p(18, 1, '#ffffff'); }
        else if (kind === 'rush') { for (const [x, y] of [[7, 15], [15, 15], [11, 9]]) { g.ell(x, y, 5, 4.4, '#f2c14e'); g.ell(x, y, 3.4, 2.8, '#ffe08a'); g.r(x, y - 2, 1, 4, '#c8902a'); } g.p(18, 3, '#ffffff'); g.p(4, 5, '#ffffff'); }
        else if (kind === 'slip') { g.ell(11, 15, 9, 4.4, '#3a8ad8'); g.ell(11, 14, 7, 3, '#8ad0ff'); g.ell(8, 13, 2, 1, '#ffffff'); for (const [x, y] of [[6, 5], [14, 3], [17, 8]]) { g.ell(x, y, 1.6, 2.2, '#8ad0ff'); } }
        else { for (const [y, d] of [[6, 1], [15, -1]]) { g.r(5, y - 1, 12, 3, '#c070ff'); g.poly(d > 0 ? [[17, y - 4], [21, y], [17, y + 4]] : [[5, y - 4], [1, y], [5, y + 4]], '#c070ff'); g.r(6, y - 1, 10, 1, '#f0c8ff'); } }
      }, '#1a1420');
    },
    star(f) {          // a fallen shooting star
      return mk('star' + (f % 3), 26, 26, 13, 13, g => {
        const R = [11, 12, 11.5][f % 3], pts = [];
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * 0.45 : R; pts.push([13 + Math.cos(a) * r, 13 + Math.sin(a) * r]); }
        g.poly(pts, '#ffcc2a'); g.poly(pts.map(([x, y]) => [13 + (x - 13) * 0.6, 12 + (y - 13) * 0.6]), '#fff2a0'); g.ell(12, 11, 2.4, 2, '#ffffff');
      }, '#5a3a08');
    },
    // ---- field gimmicks ----
    bumper(rgb, lit) {   // a post that flings the hero back
      return mk('bump' + rgb + (lit ? 1 : 0), 30, 34, 15, 26, g => {
        const C = `rgb(${rgb})`;
        g.ell(15, 26, 13, 6, '#2a2430'); g.r(4, 14, 22, 12, '#3a3448'); g.ell(15, 14, 11, 6, '#5a5470');
        g.ell(15, 13, 8, 4.4, lit ? '#ffffff' : C); g.ell(13, 12, 3, 1.6, '#ffffff');
        for (const x of [6, 15, 24]) g.r(x - 1, 17, 2, 7, lit ? C : '#6a6488');
        g.r(4, 24, 22, 2, '#1a1622');
      }, '#120e18');
    },
    barrel(lit, f) {     // explodes when rammed hard
      return mk('barrel' + (lit ? 1 : 0) + (f % 2), 24, 30, 12, 26, g => {
        g.ell(12, 26, 9, 3, '#1a1010');
        g.r(4, 8, 16, 18, '#a83a28'); g.r(15, 8, 5, 18, '#7a2418'); g.r(5, 9, 3, 16, '#d8604a');
        g.r(3, 10, 18, 2, '#3a3038'); g.r(3, 21, 18, 2, '#3a3038'); g.ell(12, 8, 8, 3, '#c8503a'); g.ell(12, 8, 5, 1.6, '#5a2018');
        g.r(10, 13, 4, 6, '#f2c14e'); g.r(11, 14, 2, 3, '#1a1010'); g.p(11, 18, '#1a1010');
        g.line(14, 6, 17, 2, 1, '#c8b890');
        if (lit) { g.ell(17, 2, 2.4 + (f % 2), 2.4 + (f % 2), '#ffd24a'); g.p(17, 2, '#ffffff'); }
      }, '#120a08');
    },
    mace() {             // spiked ball on a chain
      return mk('mace', 24, 24, 12, 12, g => {
        for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; g.poly([[12 + Math.cos(a - 0.3) * 6, 12 + Math.sin(a - 0.3) * 6], [12 + Math.cos(a) * 11, 12 + Math.sin(a) * 11], [12 + Math.cos(a + 0.3) * 6, 12 + Math.sin(a + 0.3) * 6]], '#c8ccd4'); }
        g.ell(12, 12, 7, 7, '#5a5e6a'); g.ell(10, 10, 3, 2.4, '#a8b0c0'); g.p(9, 9, '#ffffff');
      }, '#16141c');
    },
    // a piece of dropped equipment, ringed by a glow in its rarity colour
    gear(slot, rar, f) {
      const C = { lo: ['#c8c0b0', '#8a8478'], fx: ['#7ad8ff', '#2a7ab0'], rare: ['#ffe14a', '#c08a2a'] }[rar] || ['#fff', '#888'], tw = f % 2;
      return mk('gear' + slot + rar + tw, 22, 22, 11, 11, g => {
        g.ell(11, 11, 9 + tw * 0.6, 9 + tw * 0.6, C[1]); g.ell(11, 11, 7.6, 7.6, '#1e1830');
        if (slot === 'weapon') { g.line(6, 16, 15, 7, 2.4, '#dfe6f2'); g.line(6, 16, 14, 8, 1, '#ffffff'); g.line(5, 12, 10, 17, 2, '#f2c14e'); g.r(4, 16, 3, 3, '#6a4020'); }
        else if (slot === 'armor') { g.poly([[6, 7], [16, 7], [17, 16], [11, 18], [5, 16]], '#9aa4b8'); g.r(9, 7, 4, 2, '#1e1830'); g.r(10, 10, 2, 5, '#f2c14e'); g.r(6, 8, 2, 7, '#c8d0dc'); }
        else if (slot === 'boots') { g.r(8, 6, 5, 8, '#8a5a2a'); g.r(8, 13, 9, 4, '#8a5a2a'); g.r(8, 16, 10, 1, '#4a2a10'); g.r(9, 6, 2, 7, '#b07a46'); }
        else { g.ell(11, 12, 5, 5, '#f2c14e'); g.ell(11, 12, 3, 3, '#1e1830'); g.ell(11, 7, 2.4, 2.4, '#e04050'); g.p(10, 6, '#ffffff'); }
        g.p(4 + tw * 13, 4, C[0]); g.p(17 - tw * 12, 18, C[0]);
      }, '#1a1420');
    },
    torch(light, f) {
      return mk('torch' + light + (f % 3), 10, 20, 5, 16, g => {
        const L = `rgb(${light})`;
        g.r(3, 10, 4, 6, '#5a4030'); g.r(2, 9, 6, 2, '#8a6040'); g.r(4, 16, 2, 3, '#3a2818');
        const h = [7, 8, 6][f % 3], w = [3, 2.6, 3.3][f % 3];
        g.ell(5, 8 - h / 2 + 1, w, h / 2 + 1, L); g.ell(5, 7, w * 0.55, h * 0.3, '#fff6d0');
        g.p(5 + (f % 2 ? 1 : -1), 8 - h, L);
      }, '#1a1420');
    },
    rock(col, v, R = 11) {
      const W2 = Math.round(R * 2.6) + 4, H2 = Math.round(R * 2.1) + 4, cx = W2 / 2, cy = H2 / 2;
      return mk('rock' + col + (v % 3) + 'r' + R, W2, H2, Math.round(cx), Math.round(cy + R * 0.3), g => {
        const Hc = sh(col, 0.25), Dc = sh(col, -0.35), r = seeded(v + 3);
        const pts = []; for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283, rr = R * (0.82 + r() * 0.28); pts.push([cx + Math.cos(a) * rr * 1.15, cy + Math.sin(a) * rr * 0.85]); }
        g.poly(pts, col); g.ell(cx + R * 0.15, cy + R * 0.3, R * 0.8, R * 0.45, Dc); g.ell(cx, cy, R * 0.8, R * 0.6, col);
        g.ell(cx - R * 0.35, cy - R * 0.35, R * 0.45, R * 0.25, Hc); g.p(Math.round(cx - R * 0.5), Math.round(cy - R * 0.45), sh(col, 0.5));
        g.line(cx + R * 0.15, cy - R * 0.45, cx + R * 0.4, cy + R * 0.1, 1, Dc);
      }, '#141018');
    },
    crate(dark) {
      return mk('crate', 18, 18, 9, 9, g => {
        g.r(0, 0, 18, 18, '#9a6a3a'); g.r(0, 0, 18, 2, '#c08a4a'); g.r(0, 16, 18, 2, '#6a4422'); g.r(0, 0, 2, 18, '#b07a40'); g.r(16, 0, 2, 18, '#6a4422');
        g.line(2, 2, 15, 15, 2, '#6a4422'); g.line(15, 2, 2, 15, 1, '#5a3a1a'); for (const [x, y] of [[1, 1], [15, 1], [1, 15], [15, 15]]) g.r(x, y, 2, 2, '#c8c8c8');
      }, '#2a1a10');
    },
    chest(open) {
      return mk('chest' + (open ? 1 : 0), 22, 18, 11, 12, g => {
        const W = '#a8642a', WD = '#6a3e1e', G2 = '#e8b84a', GD = '#a87a1a';
        if (open) { g.r(1, 0, 20, 6, WD); g.r(2, 1, 18, 4, '#3a2010'); g.r(1, 7, 20, 10, W); g.r(1, 7, 20, 2, '#2a1408'); g.r(1, 11, 20, 2, G2); g.r(9, 10, 4, 4, G2); g.r(4, 7, 3, 1, '#f2c14e'); g.r(13, 7, 4, 1, '#f2c14e'); }
        else { g.r(1, 2, 20, 6, W); g.r(1, 1, 20, 2, sh(W, 0.2)); g.r(1, 8, 20, 9, W); g.r(1, 16, 20, 1, WD); g.r(1, 7, 20, 2, G2); g.r(1, 2, 2, 15, G2); g.r(19, 2, 2, 15, G2); g.r(9, 6, 4, 5, G2); g.r(10, 8, 2, 2, GD); g.p(3, 3, '#ffffff'); }
      }, '#2a1408');
    },
    spring(f, used) {
      return mk('spring' + (f % 3) + (used ? 1 : 0), 36, 22, 18, 11, g => {
        g.ell(18, 12, 17, 9, '#6a7a90'); g.ell(18, 11, 16, 8, '#8a9ab0'); g.ell(18, 12, 13, 6, used ? '#4a6a8a' : '#3a8ad8');
        if (!used) { g.ell(18, 11, 10, 4, '#6ec8ff'); for (const [x, y] of [[12, 10], [22, 13], [17, 9]]) g.p(x + (f % 3) - 1, y, '#e8f8ff'); g.r(17, 2 + (f % 3), 2, 4, '#c8f0ff'); g.p(18, 1 + (f % 3), '#ffffff'); }
        g.r(3, 10, 3, 2, '#b8c4d4'); g.r(30, 10, 3, 2, '#b8c4d4');
      }, '#1a1a2a');
    },
    coin(f) {
      const w = [4, 3, 1, 3][f % 4];
      return mk('coin' + (f % 4), 10, 10, 5, 5, g => { g.ell(5, 5, w, 4, '#f2c14e'); if (w > 2) { g.ell(5, 5, w - 1.4, 2.6, '#ffe08a'); g.r(5, 3, 1, 4, '#c8902a'); } else g.r(4, 1, 2, 8, '#c8902a'); }, '#6a4a10');
    },
    herb() { return mk('herbdrop', 12, 12, 6, 7, g => { g.r(5, 6, 2, 5, '#3a7a2a'); g.ell(3.5, 5, 3, 2, '#6fd38a'); g.ell(8.5, 4, 3, 2, '#58b85a'); g.ell(6, 2.5, 2, 2.4, '#8ae09a'); }, '#14301a'); },
    potion(col) { return mk('potion' + col, 10, 14, 5, 12, g => { g.r(4, 1, 3, 2, '#c8a070'); g.r(4, 3, 3, 2, '#d8f0ff'); g.ell(5.5, 9, 4, 4, col); g.p(4, 7, '#ffffff'); g.p(3, 9, sh(col, 0.4)); }, '#1a1420'); },
    // projectiles
    orb(rgb, R = 4) {
      return mk('orb' + rgb + 'r' + R, R * 2 + 6, R * 2 + 6, R + 3, R + 3, g => { g.ell(R + 3, R + 3, R + 2, R + 2, `rgba(${rgb},0.55)`); g.ell(R + 3, R + 3, R, R, `rgb(${rgb})`); g.ell(R + 2, R + 2, Math.max(1, R * 0.45), Math.max(1, R * 0.45), '#ffffff'); }, null);
    },
    flame(f, big, tint) {
      const R = big ? 9 : 5, T = FLAME[tint] || FLAME.fire;
      return mk('flame' + (f % 3) + big + (tint || ''), R * 2 + 8, R * 2 + 10, R + 4, R + 5, g => {
        const o = [0, 1, -1][f % 3];
        g.ell(R + 4, R + 6, R + 2, R + 2, T[0]); g.poly([[R + 4 - R, R + 5], [R + 4 + o, 1], [R + 4 + R, R + 5]], T[0]);
        g.ell(R + 4, R + 6, R, R, T[1]); g.ell(R + 4, R + 6, R * 0.55, R * 0.55, T[2]); g.p(R + 3, R + 4, '#ffffff');
      }, T[3]);
    },
    spore() { return mk('spore', 10, 10, 5, 5, g => { g.ell(5, 5, 4, 4, '#bee678'); g.ell(4, 4, 1.6, 1.6, '#f0ffd0'); g.p(7, 6, '#8ab048'); }, null); },
    web() { return mk('web', 16, 16, 8, 8, g => { for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4; g.line(8 - Math.cos(a) * 7, 8 - Math.sin(a) * 7, 8 + Math.cos(a) * 7, 8 + Math.sin(a) * 7, 1, '#e8f0ff'); } g.ell(8, 8, 4, 4, 'rgba(0,0,0,0)'); x0ring(g); }, null); },
    rockShot() { return mk('rockshot', 16, 16, 8, 8, g => { g.ell(8, 8, 6, 5.5, '#8a7a6a'); g.ell(7, 7, 3, 2.5, '#aa9a8a'); g.p(10, 10, '#5a4a3a'); }, '#2a1a10'); },
    // hit effects
    spark(f, big) {
      const S = big ? 15 : 11;
      return mk('spark' + f + (big ? 1 : 0), S * 2 + 1, S * 2 + 1, S, S, g => {
        const k = f / 3, c = S;
        if (f === 0) { g.r(c - 3, c - 3, 7, 7, '#ffffff'); g.r(c - 1, c - S + 2, 3, S * 2 - 4, '#fff6c0'); g.r(c - S + 2, c - 1, S * 2 - 4, 3, '#fff6c0'); }
        else for (let i = 0; i < 8; i++) {
          const a = i / 8 * 6.283, d0 = 2 + k * S * 0.6, d1 = d0 + (S - d0) * 0.6;
          for (let d = d0; d < d1; d += 1) g.r(Math.round(c + Math.cos(a) * d), Math.round(c + Math.sin(a) * d), i % 2 ? 1 : 2, i % 2 ? 1 : 2, d < (d0 + d1) / 2 ? '#ffffff' : (big ? '#ffd23a' : '#fff6c0'));
        }
      }, null);
    },
    poof(f) {
      return mk('poof' + f, 28, 24, 14, 12, g => {
        const k = f / 4, c = f < 3 ? '#e8e0f0' : '#a8a0b8';
        for (const [ox, oy, rr] of [[-6, 2, 5], [5, 3, 5], [0, -3, 6], [-3, 5, 4], [6, -3, 4]]) g.ell(14 + ox * (0.6 + k), 12 + oy * (0.6 + k), rr * (1 - k * 0.6), rr * (1 - k * 0.6), c);
      }, f < 3 ? '#4a4258' : null);
    },
    // town people
    npc(kind, f) {
      return mk('npc' + kind + (f % 2), 40, 46, 20, 44, g => {
        const sk = '#f8d0a8', b = f % 2;
        if (kind === 'merchant') {   // hooded traveller with a huge pack, lantern swinging
          g.poly([[6, 14 + b], [34, 14 + b], [33, 36 + b], [7, 36 + b]], '#7a5a3a'); g.poly([[24, 14 + b], [34, 14 + b], [33, 36 + b], [24, 36 + b]], '#5a3e24');
          for (const [x, y, c] of [[9, 10, '#c84a3a'], [27, 11, '#3a8a5a'], [14, 8, '#e0c060']]) g.r(x, y + b, 6, 5, c);   // things strapped on top
          g.line(8, 18 + b, 32, 18 + b, 1, '#3a2614'); g.line(8, 28 + b, 32, 28 + b, 1, '#3a2614');
          g.poly([[11, 20 + b], [29, 20 + b], [32, 44], [8, 44]], '#5a2a5a'); g.poly([[20, 20 + b], [29, 20 + b], [32, 44], [20, 44]], '#3e1a40'); g.r(19, 22 + b, 2, 20, '#f2c14e');
          g.poly([[12, 22 + b], [20, 4 + b], [28, 22 + b]], '#6a3a6a'); g.poly([[20, 4 + b], [28, 22 + b], [20, 22 + b]], '#4a2450');
          g.ell(20, 17 + b, 5.5, 5, '#1a0e1a'); g.p(18, 16 + b, '#ffe14a'); g.p(22, 16 + b, '#ffe14a'); g.r(18, 19 + b, 5, 1, '#e8e0d0');
          g.line(31, 26 + b, 35, 30, 1, '#8a8a90'); g.r(33, 30, 5, 6, '#3a3a40'); g.r(34, 31, 3, 4, f % 2 ? '#ffe880' : '#ffc040');
        } else if (kind === 'smith') {
          g.r(9, 22 + b, 22, 18, '#8a5a3a'); g.r(12, 26 + b, 16, 14, '#5a3a2a'); g.r(19, 26 + b, 2, 14, '#3a2418');
          g.r(5, 24 + b, 5, 12, sk); g.r(30, 24 + b, 5, 12, sk); g.r(4, 35 + b, 6, 4, sk); g.r(30, 35 + b, 6, 4, sk);
          g.ell(20, 14 + b, 9, 9, sk); g.ell(20, 22 + b, 9, 6, '#a8683a'); g.r(13, 7 + b, 14, 4, '#d8d0c0'); g.r(12, 9 + b, 16, 2, '#b8b0a0');
          g.r(15, 13 + b, 2, 2, EYE); g.r(23, 13 + b, 2, 2, EYE); g.r(18, 16 + b, 4, 2, '#e8a080'); g.line(14, 11 + b, 17, 12 + b, 1, '#7a4a2a'); g.line(26, 11 + b, 23, 12 + b, 1, '#7a4a2a');
        } else {
          g.poly([[11, 22 + b], [29, 22 + b], [32, 42], [8, 42]], '#5a8a5a'); g.r(14, 24 + b, 12, 10, '#f0ece0'); g.r(19, 24 + b, 2, 10, '#e05a6a');
          g.r(8, 24 + b, 4, 10, '#5a8a5a'); g.r(28, 24 + b, 4, 10, '#5a8a5a'); g.r(8, 33 + b, 4, 3, sk); g.r(28, 33 + b, 4, 3, sk);
          g.poly([[9, 10 + b], [31, 10 + b], [30, 24 + b], [10, 24 + b]], '#c86a3a');
          g.ell(20, 15 + b, 8, 8, sk); g.r(12, 8 + b, 16, 4, '#c86a3a');
          g.poly([[8, 9 + b], [20, -1 + b + 4], [32, 9 + b]], '#7a4a8a'); g.ell(20, 9 + b, 13, 2.4, '#5a2a6a'); g.p(20, 4 + b, '#f2c14e');
          g.r(16, 15 + b, 2, 2, EYE); g.r(22, 15 + b, 2, 2, EYE); g.p(16, 15 + b, '#fff'); g.p(22, 15 + b, '#fff'); g.r(19, 19 + b, 2, 1, '#c05050'); g.p(14, 18 + b, '#f4a090'); g.p(25, 18 + b, '#f4a090');
        }
      });
    },
  };
  function x0ring(g) { g.x.strokeStyle = '#e8f0ff'; g.x.lineWidth = 1; g.x.beginPath(); g.x.arc(8, 8, 4, 0, 7); g.x.stroke(); }

  return { SCALE, shadeOf, stoneOf, part, relic, itemIcon, gearIcon, hero: heroS, enemy, boss, draw, skeletonParts, ENV, floorTile, wallTile, dither, tileCanvas, shade: sh, seeded, cacheSize: () => cache.size, types: () => ({ enemies: Object.keys(EN), bosses: Object.keys(BOSS) }) };
})();
