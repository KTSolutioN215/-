// Headless rig review without a browser. Executes the real sprites, R3 renderer and runMove.
// Native Canvas is only a drawing backend; no attack timings or poses are reimplemented here.
// NODE_PATH must contain @napi-rs/canvas. FONT points to a Japanese TTF/TTC.
// BOSS=goblinking OUT=out/gk_canvas node tools/anim/capture_canvas.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
if (process.env.FONT) GlobalFonts.registerFromPath(process.env.FONT, 'ReviewJP');
const root = path.resolve(__dirname, '../..'), out = path.resolve(process.env.OUT || path.join(root, 'out/gk_canvas'));
fs.mkdirSync(out, { recursive: true });
const source = fs.readFileSync(process.env.SOURCE || path.join(root, 'web/yusha.js'), 'utf8');
const between = (a, b) => { const i = source.indexOf(a), j = source.indexOf(b, i); if (i < 0 || j < 0) throw Error('Missing source section: ' + a); return source.slice(i, j); };
const canvas = createCanvas(1000, 1080), ctx = canvas.getContext('2d');
const world = { console, document: { createElement: () => createCanvas(1, 1) }, ctx, globalT: 0, hero: { x: 0, y: -150, vx: 0, vy: 0 },
  arena: { cx: 0, cy: 0, R: 260 }, RIG: {}, WR: {}, zones: [], bullets: [], rings: [], shake: 0,
  A: { sfx() {} }, burst() {}, shoot() {}, addCircle() {}, arenaSpot: () => ({ x: 0, y: 0 }),
  clamp: (x, a, b) => Math.max(a, Math.min(b, x)), lerp: (a, b, k) => a + (b - a) * k, hyp: Math.hypot, rnd: (a, b) => (a + b) / 2 };
vm.createContext(world);
vm.runInContext('Math.random = () => 0.25;', world); // identical sweep direction in every comparison panel
vm.runInContext(fs.readFileSync(path.join(root, 'web/sprites.js'), 'utf8') + '\nthis.SPR = SPR;', world);
const helpers = between('  const easeIO =', '  // the lower body for moves') + between('  function settle(', '  function cyPose(');
const code = between('  function pd(', '  function blob2(') + helpers + between('  const hits =', '  function wrPose(') + between('  const R3 =', '  function drawBoss(') + between('  function addSweep(', '  // ---- floor blasts') + between('  function runMove(', '  // ---------------------------------------------------------------\n  //  MAIN UPDATE');
vm.runInContext(code + '\nthis.renderRig = drawR3; this.poseRig = r3Pose; this.faceRig = r3Face; this.moveRig = runMove; this.defs = R3;', world);
const bossType = process.env.BOSS || 'goblinking', dirs = ['f', 'r', 'l', 'b'], dirName = ['正面', '右向き', '左向き', '後ろ'];
const bossName = bossType === 'deathknight' ? 'デスナイト' : 'ゴブリンキング';
const angles = [-Math.PI / 2, 0, Math.PI, Math.PI / 2];
const plan = process.env.PLAN ? JSON.parse(process.env.PLAN) : [['idle', 1.2, '待機'], ['stalk', 1.5, '歩く'], ['quake', 2.7, '地響き'], ['rocks', 2.5, '岩飛ばし'], ['bombs', 3.1, '爆弾投げ'], ['sweep', 3.1, '大振り'], ['charge', 2.8, '突進'], ['dash3', 4.1, '三連突進'], ['mines', 3.1, '爆弾の合図'], ['ringaimed', 1.8, '衝撃波']];
let frame = 0, absolute = 0;
const snapshots = [], records = [], events = [];
world.addCircle = () => { const B = world.activeBoss; events.push({ move: B.mv.name, direction: B.reviewDir, time: B.mv.t, heldBomb: world.poseRig(B).bomb || 0 }); };
for (const [move, duration, label] of plan) {
  const bosses = dirs.map((f, i) => ({ type: bossType, phase: Number(process.env.PHASE || 1), reviewDir: f, x: 0, y: 0, vx: 0, vy: 0, r: 38, atk: 17, col: '#86b84a', f3: f, sweeps: [], mv: move === 'idle' ? null : { name: move, t: 0, a0: angles[i], n: 0, acc: 0 } }));
  const count = Math.round(duration * 30);
  for (let n = 0; n < count; n++) {
    ctx.resetTransform(); ctx.fillStyle = '#141820'; ctx.fillRect(0, 0, 1000, 1080);
    ctx.fillStyle = '#eee7cd'; ctx.font = 'bold 30px ReviewJP'; ctx.textAlign = 'center'; ctx.fillText(bossName + ' ／ 3方向リグ', 500, 38);
    ctx.font = '24px ReviewJP'; ctx.fillStyle = '#c5d3a1'; ctx.fillText(label, 500, 70);
    for (let i = 0; i < 4; i++) {
      const B = bosses[i], x0 = (i % 2) * 500, y0 = 90 + Math.floor(i / 2) * 480;
      world.activeBoss = B;
      for (let sub = 0; sub < 2; sub++) {
        world.globalT = absolute + sub / 60; world.hero.x = B.x + Math.cos(angles[i]) * 150; world.hero.y = B.y + Math.sin(angles[i]) * 150;
        if (B.mv) world.moveRig(B, 1 / 60, angles[i], 1);
        for (const sw of B.sweeps) { sw.t += 1 / 60; if (sw.t >= sw.tele) { sw.ang += sw.vel / 60; sw.left -= Math.abs(sw.vel / 60); } }
        B.sweeps = B.sweeps.filter(sw => sw.left > 0);
      }
      ctx.save(); ctx.beginPath(); ctx.rect(x0 + 4, y0, 492, 465); ctx.clip(); ctx.translate(x0 + 250, y0 + 322); ctx.scale(1.2, 1.2);
      ctx.fillStyle = '#21272b'; ctx.fillRect(-205, -265, 410, 370);
      ctx.strokeStyle = '#293032'; ctx.lineWidth = 1; for (let x = -200; x <= 200; x += 32) { ctx.beginPath(); ctx.moveTo(x, -250); ctx.lineTo(x, 50); ctx.stroke(); }
      for (let y = -250; y <= 50; y += 32) { ctx.beginPath(); ctx.moveTo(-200, y); ctx.lineTo(200, y); ctx.stroke(); }
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(0, -3, 48, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.imageSmoothingEnabled = false;
      world.renderRig(B, world.defs[bossType], 0, 0, false);
      // Pose/bone math must stay finite for every frame, direction, and move.
      const pose = world.poseRig(B); for (const [key, val] of Object.entries(pose)) if (Array.isArray(val) && val.some(v => !Number.isFinite(v))) throw Error(move + ' non-finite ' + key);
      ctx.restore(); ctx.fillStyle = '#eee7cd'; ctx.font = '24px ReviewJP'; ctx.fillText(dirName[i], x0 + 250, y0 + 442);
      if (B.mv && n === Math.round(count / 2)) records.push({ move, direction: dirs[i], face: B.f3, pose });
    }
    ctx.fillStyle = '#9da8b4'; ctx.font = '18px ReviewJP'; ctx.fillText('同じゲーム描画コードを使用・カメラ固定の動作比較', 500, 1067);
    const file = path.join(out, `f${String(frame).padStart(4, '0')}.png`); fs.writeFileSync(file, canvas.toBuffer('image/png'));
    if ((move === 'idle' && n === 15) || (move === 'quake' && [10, 15].includes(n)) || (move === 'bombs' && [8, 13].includes(n))) { const dst = path.join(out, `still_${move}_${n}.png`); fs.copyFileSync(file, dst); snapshots.push(dst); }
    frame++; absolute += 1 / 30;
  }
  console.log(move, count, 'frames');
}
fs.writeFileSync(path.join(out, 'checks.json'), JSON.stringify({ frames: frame, snapshots, records, events }, null, 2));
console.log(frame, 'frames; all poses finite');
