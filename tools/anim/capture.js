// Capture a boss's (or zako's) animation frames headlessly, for checking motion and making review videos.
//
//   sh tools/wrap.sh                       # builds web/_test.html (the page wrapped as a full document)
//   BOSS=deathknight MODE=sheet node tools/anim/capture.js
//   BOSS=deathknight MODE=video PLAN='[["f",[["idle",1],["quake",2.2]]],["r",[["darkwave",1.9]]]]' node tools/anim/capture.js
//   python3 tools/anim/label.py out/frames out/labeled && ffmpeg -framerate 30 -i out/labeled/f%04d.png -pix_fmt yuv420p out/boss.mp4
//
// MODE=sheet : one still per facing x a few move moments -> OUT/s_<facing>_<n>.png
// MODE=video : PLAN = [[facing, [[move, seconds], ...]], ...]; facing f|r|l|b (where the hero stands). OUT/f0000.png ... + labels.json
// The hero is pinned (invincible) on the chosen side of the boss, the boss is pinned at the arena centre between moves.
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }
const ROOT = path.resolve(__dirname, '../..');
const BOSS = process.env.BOSS || 'deathknight', MODE = process.env.MODE || 'sheet', OUT = path.resolve(process.env.OUT || path.join(ROOT, 'out/frames'));
const TEST = process.env.TEST || path.join(ROOT, 'web/_test.html');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) }); const p = await b.newPage({ viewport: { width: 390, height: 640 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('file://' + TEST); await p.waitForTimeout(300);
  const ok = await p.evaluate((boss) => { document.getElementById('startBtn').click(); const Y = __yusha; Y.audio = false; Y.manual = true; Y.noMerchant = true; Y.save.lv = 70;
    const di = Y.data.DUNGEONS.findIndex(d => d.boss === boss); if (di < 0) return false; Y.enter(di); Y.toBoss(); Y.boss.intro = 0; return true; }, BOSS);
  if (!ok) { console.log('no dungeon has boss', BOSS); process.exit(1); }
  // where the hero stands for each facing (boss at 180,-25; the camera follows the hero) and the clip that keeps the boss in view
  const DIRS = { f: [180, -115], r: [270, -30], l: [90, -30], b: [180, 175] };
  let clip = null;
  const setup = async (dir) => { const hy = DIRS[dir][1], cy = 320 + (hy + 25) * 1.083; clip = { x: 0, y: dir === 'b' ? 160 : Math.max(0, Math.round(cy - 235)), width: 390, height: 380 };
    return p.evaluate((h0) => { const Y = __yusha, B = Y.boss, h = Y.hero; window.__h0 = h0; for (let k = 0; k < (window.__warm ? 60 : 300); k++) { h.inv = 9; h.x = h0[0]; h.y = h0[1]; h.vx = h.vy = 0; B.mv = null; B.cd = 9; B.x = 180; B.y = -25; Y.update(1 / 60); } window.__warm = 1; }, DIRS[dir]); };
  const shot = async (file) => p.screenshot({ path: file, clip });
  const step = async () => p.evaluate(() => { const Y = __yusha, B = Y.boss, h = Y.hero; for (let k = 0; k < 2; k++) { h.inv = 9; h.hp = h.s.maxHp; h.x = __h0[0]; h.y = __h0[1]; h.vx = h.vy = 0; if (!B.mv) { B.cd = 99; B.x = 180; B.y = -25; } Y.update(1 / 60); } Y.render(); });
  const start = async (m) => p.evaluate((m) => { const Y = __yusha, B = Y.boss; B.x = 180; B.y = -25; B.sweeps = []; B.z = 0; B.alpha = 1; for (const bl of Y.bullets) bl.life = 0; Y.zones.length = 0; B.waveT = 999; Y.enemies.forEach(e => e.dead = true);
    B.mv = m === 'idle' ? null : { name: m, t: 0, a0: Math.atan2(__h0[1] - B.y, __h0[0] - B.x), n: 0, acc: 0 }; B.cd = 99; }, m);
  let f = 0; const labels = [];
  if (MODE === 'sheet') {
    const moments = JSON.parse(process.env.MOMENTS || '[["idle",0.5],["quake",0.38],["quake",0.5],["darkwave",0.3],["darkwave",0.55],["stalk",0.4]]');
    for (const d of ['f', 'r', 'l', 'b']) { await setup(d); for (const [m, at] of moments) { await start(m); for (let i = 0; i < Math.round(at * 30); i++) await step(); await shot(`${OUT}/s_${d}_${f}.png`); labels.push(BOSS + '|' + d + '|' + m); f++; } }
  } else {
    const plan = JSON.parse(process.env.PLAN || '[["f",[["idle",1.2],["stalk",1.4],["quake",2.2]]],["r",[["idle",1],["quake",2.2]]],["l",[["quake",2.2]]],["b",[["idle",1],["quake",2.2]]],["f",[["sweep",2.6]]]]');
    for (const [d, moves] of plan) { await setup(d); for (const [m, dur] of moves) { await start(m); for (let i = 0; i < Math.round(dur * 30); i++) { await step(); await shot(`${OUT}/f${String(f).padStart(4, '0')}.png`); labels.push(BOSS + '|' + d + '|' + m); f++; } } }
  }
  fs.writeFileSync(OUT + '/labels.json', JSON.stringify(labels));
  console.log(f, 'frames', errs.length ? errs.slice(0, 3) : 'no page errors'); await b.close();
  if (errs.length) process.exitCode = 1;
})();
