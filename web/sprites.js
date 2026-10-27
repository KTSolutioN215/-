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
    };
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
        R(17, 17, 1, w + 4, HC.gold); R(15, 19, 2, w, HC.grip);
      } else sword(16, 18 - G.bladeLen, G.bladeLen);
    }
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
    wolf(P) {
      const st = P.st === 'wind' ? 1 : P.st === 'dash' ? 2 : 0, k = P.step ? (P.step > 0 ? 1 : 2) : 0;
      return mk('wolf' + st + k, 50, 36, 25, 33, g => {
        const B = '#8a98b0', S = '#5a6680', H = '#c4cede', L = '#d8dee8';
        const cy = st === 1 ? 21 : st === 2 ? 15 : 19;
        g.poly([[11, cy - 2], [3, cy - 7 + (st === 2 ? 4 : 0)], [1, cy - 3], [8, cy + 3]], S); g.p(2, cy - 4, H);
        const leg = (x, dx, back) => { if (st === 2) { g.line(x, cy + 3, x + (back ? -7 : 7), cy + 9, 2.4, back ? S : B); return; } const ly = st === 1 ? 2 : 0; g.r(x + dx, cy + 3, 3, 9 - ly, back ? S : B); g.r(x + dx - 1, cy + 11 - ly, 4, 1, '#3a4258'); };
        leg(13, k === 1 ? -2 : k === 2 ? 2 : 0, true); leg(31, k === 1 ? 2 : k === 2 ? -2 : 0, true);
        g.ell(23, cy, 13, 6.5, B); g.ell(23, cy - 4, 11, 3, H); g.ell(26, cy + 3, 8, 2.6, L);
        leg(16, k === 1 ? 2 : k === 2 ? -2 : 0, false); leg(34, k === 1 ? -2 : k === 2 ? 2 : 0, false);
        const hx = 38, hy = cy - 6 + (st === 1 ? 2 : 0);
        g.ell(hx, hy, 6.5, 5.5, B); g.poly([[hx + 3, hy - 1], [hx + 12, hy + 1], [hx + 11, hy + 4], [hx + 3, hy + 4]], B); g.r(hx + 4, hy + 3, 7, 1, S);
        g.poly([[hx - 4, hy - 3], [hx - 3, hy - 11], [hx + 1, hy - 4]], B); g.poly([[hx - 3, hy - 4], [hx - 3, hy - 8], [hx, hy - 4]], '#e8a0a0');
        g.p(hx + 11, hy, '#1a1420'); g.r(hx + 2, hy - 2, 2, 2, '#ffe14a'); g.p(hx + 3, hy - 1, EYE);
        if (st) { g.r(hx + 5, hy + 4, 6, 2, '#5a1010'); g.p(hx + 6, hy + 4, '#fff'); g.p(hx + 9, hy + 4, '#fff'); }
      });
    },
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
  };
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
  //  public API
  // ---------------------------------------------------------------
  function enemy(type, P) {
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
  const FLOOR_STYLE = ['stone', 'earth', 'mine', 'crystal', 'crypt', 'lava', 'ice', 'marble', 'fort', 'wet', 'sand', 'wood', 'void', 'hell', 'castle'];
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

  const ENV = {
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
    flame(f, big) {
      const R = big ? 9 : 5;
      return mk('flame' + (f % 3) + big, R * 2 + 8, R * 2 + 10, R + 4, R + 5, g => {
        const o = [0, 1, -1][f % 3];
        g.ell(R + 4, R + 6, R + 2, R + 2, '#c83a10'); g.poly([[R + 4 - R, R + 5], [R + 4 + o, 1], [R + 4 + R, R + 5]], '#c83a10');
        g.ell(R + 4, R + 6, R, R, '#ff8a2a'); g.ell(R + 4, R + 6, R * 0.55, R * 0.55, '#ffe060'); g.p(R + 3, R + 4, '#ffffff');
      }, '#3a0a04');
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
        if (kind === 'smith') {
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

  return { SCALE, hero: heroS, enemy, boss, draw, skeletonParts, ENV, floorTile, wallTile, dither, tileCanvas, shade: sh, seeded, cacheSize: () => cache.size, types: () => ({ enemies: Object.keys(EN), bosses: Object.keys(BOSS) }) };
})();
