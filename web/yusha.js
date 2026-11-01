// =============================================================
//  ぶつかり勇者 (BUMP HERO)
//  A dungeon crawler built on DOPAMINE TUNNEL's tunnel + music engine.
//  Drag anywhere to move the hero; slam into monsters fast to attack.
//  World units: the screen is always 360 wide; y grows "up" (deeper).
// =============================================================
(() => {
  'use strict';
  const cv = document.getElementById('cv'), mainCtx = cv.getContext('2d');
  let ctx = mainCtx;   // swapped to the pixel layer while the world is drawn
  // ---- pixel layer: the world is drawn at 1 art pixel = 1.5 logical px, then scaled up without smoothing ----
  const PXS = 1.5;
  const q = v => Math.round(v / PXS) * PXS;   // snap to the art grid
  // The world is drawn at 1 art pixel per canvas pixel into #px, and the browser scales that canvas up on screen (CSS, nearest neighbour):
  // no big upscale copy every frame, the GPU compositor does it. HUD and text go on #cv (full resolution) above it.
  const pixC = document.getElementById('px'); let pixX = pixC.getContext('2d', { alpha: false }), pixCss = '';
  function sizePix() {
    const w = Math.ceil(W / PXS) + 2, h = Math.ceil(H / PXS) + 2;
    if (pixC.width !== w || pixC.height !== h) { pixC.width = w; pixC.height = h; pixX = pixC.getContext('2d', { alpha: false }); pixCss = ''; }
    const css = (w * PXS * S).toFixed(2) + 'x' + (h * PXS * S).toFixed(2);
    if (css !== pixCss) { pixCss = css; pixC.style.width = (w * PXS * S) + 'px'; pixC.style.height = (h * PXS * S) + 'px'; }
  }
  function beginPix() {
    sizePix();
    ctx = pixX; ctx.setTransform(1 / PXS, 0, 0, 1 / PXS, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#0e0c16'; ctx.fillRect(0, 0, W + 6, H + 6);
  }
  function endPix() { ctx = mainCtx; ctx.imageSmoothingEnabled = false; }
  const $ = id => document.getElementById(id);
  const VW = 360;
  let W = VW, H = 640, S = 1, dpr = 1, WX = 0;   // W = screen width (logical, ≥ 360); WX = where the 360-wide field starts
  const FONT = '"DotGothic16", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif';

  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, k) => a + (b - a) * k;
  const hyp = Math.hypot;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function wpick(obj, r = Math.random()) {
    let tot = 0; for (const k in obj) tot += obj[k];
    let x = r * tot; for (const k in obj) { x -= obj[k]; if (x <= 0) return k; }
    return Object.keys(obj)[0];
  }
  function mulberry(a) { return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---------------------------------------------------------------
  //  DATA
  // ---------------------------------------------------------------
  const EQUIP = [
    { id: 'w0', slot: 'weapon', name: '木の剣', atk: 0, price: 0 },
    { id: 'w1', slot: 'weapon', name: '銅の剣', atk: 4, price: 120 },
    { id: 'w2', slot: 'weapon', name: '鋼の剣', atk: 9, price: 420 },
    { id: 'w3', slot: 'weapon', name: '炎の剣', atk: 16, price: 1100 },
    { id: 'w4', slot: 'weapon', name: '紫電の剣', atk: 26, price: 2600 },
    { id: 'w5', slot: 'weapon', name: 'ミスリルの剣', atk: 38, price: 5200 },
    { id: 'w6', slot: 'weapon', name: '竜殺しの大剣', atk: 52, price: 9000 },
    { id: 'w7', slot: 'weapon', name: '勇者の剣', atk: 70, price: 15000 },
    { id: 'w8', slot: 'weapon', name: 'オリハルコンの剣', atk: 92, price: 24000 },
    { id: 'w9', slot: 'weapon', name: 'ほしくだきの剣', atk: 118, price: 38000 },
    { id: 'w10', slot: 'weapon', name: '蒼穹の剣', atk: 148, price: 60000 },
    { id: 'w11', slot: 'weapon', name: 'ルーンブレード', atk: 180, price: 90000 },
    { id: 'w12', slot: 'weapon', name: 'ドラゴンファング', atk: 215, price: 135000 },
    { id: 'w13', slot: 'weapon', name: '風霊の剣', atk: 255, price: 200000 },
    { id: 'w14', slot: 'weapon', name: '退魔の剣', atk: 300, price: 290000 },
    { id: 'w15', slot: 'weapon', name: '聖光の剣', atk: 350, price: 420000 },
    { id: 'w16', slot: 'weapon', name: '大樹の剣', atk: 420, price: 600000 },
    { id: 'w17', slot: 'weapon', name: '天翼の剣', atk: 500, price: 860000 },
    // 指示3: the trials (31-35) had no gear of their own; one new tier per trial
    { id: 'w18', slot: 'weapon', name: 'さきゅうの曲刀', atk: 540, price: 980000 },
    { id: 'w19', slot: 'weapon', name: 'さんごの剣', atk: 585, price: 1150000 },
    { id: 'w20', slot: 'weapon', name: 'らいめいの剣', atk: 630, price: 1350000 },
    { id: 'w21', slot: 'weapon', name: 'まじんごろし', atk: 680, price: 1600000 },
    { id: 'w22', slot: 'weapon', name: '星河の剣', atk: 735, price: 1900000 },
    { id: 'a0', slot: 'armor', name: '布の服', def: 0, price: 0 },
    { id: 'a1', slot: 'armor', name: '革のよろい', def: 3, price: 100 },
    { id: 'a2', slot: 'armor', name: 'くさりかたびら', def: 7, price: 380 },
    { id: 'a3', slot: 'armor', name: '鋼のよろい', def: 12, price: 950 },
    { id: 'a4', slot: 'armor', name: '竜鱗のよろい', def: 19, price: 2300 },
    { id: 'a5', slot: 'armor', name: 'ミスリルのよろい', def: 27, price: 5000 },
    { id: 'a6', slot: 'armor', name: '白銀のよろい', def: 36, price: 11000 },
    { id: 'a7', slot: 'armor', name: 'オリハルコンのよろい', def: 47, price: 20000 },
    { id: 'a8', slot: 'armor', name: '星のよろい', def: 59, price: 34000 },
    { id: 'a9', slot: 'armor', name: '蒼穹のよろい', def: 73, price: 55000 },
    { id: 'a10', slot: 'armor', name: 'ルーンメイル', def: 88, price: 85000 },
    { id: 'a11', slot: 'armor', name: '竜騎士のよろい', def: 104, price: 125000 },
    { id: 'a12', slot: 'armor', name: '風霊のよろい', def: 122, price: 185000 },
    { id: 'a13', slot: 'armor', name: '鳳凰のよろい', def: 142, price: 270000 },
    { id: 'a14', slot: 'armor', name: '聖光のよろい', def: 165, price: 390000 },
    { id: 'a15', slot: 'armor', name: '大樹のよろい', def: 192, price: 560000 },
    { id: 'a16', slot: 'armor', name: 'てんしのよろい', def: 222, price: 800000 },
    { id: 'a17', slot: 'armor', name: 'すなかぜのよろい', def: 240, price: 920000 },
    { id: 'a18', slot: 'armor', name: 'さんごのよろい', def: 259, price: 1080000 },
    { id: 'a19', slot: 'armor', name: 'らいうんのよろい', def: 280, price: 1270000 },
    { id: 'a20', slot: 'armor', name: 'まじんのよろい', def: 302, price: 1500000 },
    { id: 'a21', slot: 'armor', name: '星河のよろい', def: 326, price: 1780000 },
    { id: 'b0', slot: 'boots', name: '旅人のくつ', ram: 1, price: 0 },
    { id: 'b1', slot: 'boots', name: '疾風のくつ', ram: 1.12, price: 320 },
    { id: 'b2', slot: 'boots', name: '飛燕のくつ', ram: 1.25, price: 1500 },
    { id: 'b3', slot: 'boots', name: '神速のくつ', ram: 1.38, price: 6500 },
    { id: 'b4', slot: 'boots', name: '流星のくつ', ram: 1.5, price: 26000 },
    { id: 'b5', slot: 'boots', name: '天翔のくつ', ram: 1.6, price: 110000 },
    { id: 'b6', slot: 'boots', name: '時空のくつ', ram: 1.7, price: 320000 },
    { id: 'b7', slot: 'boots', name: 'てんしのくつ', ram: 1.8, price: 700000 },
    { id: 'c1', slot: 'charm', name: 'いのちのお守り', hp: 30, price: 450 },
    { id: 'c2', slot: 'charm', name: '守護の指輪', def: 6, price: 900 },
    { id: 'c3', slot: 'charm', name: '戦士のうでわ', atk: 8, price: 1400 },
    { id: 'c4', slot: 'charm', name: '勇者のペンダント', atk: 14, def: 10, hp: 60, price: 8000 },
    { id: 'c5', slot: 'charm', name: '神々の指輪', def: 22, hp: 120, price: 20000 },
    { id: 'c6', slot: 'charm', name: '覇王のうでわ', atk: 32, price: 30000 },
    { id: 'c7', slot: 'charm', name: '蒼穹のかんむり', atk: 28, def: 28, hp: 200, price: 58000, fx: { skillcd: 0.3 } },
    { id: 'c8', slot: 'charm', name: '竜神のメダル', atk: 40, def: 40, hp: 300, price: 150000, fx: { thorns: 0.8 } },
    { id: 'c9', slot: 'charm', name: '聖光の宝玉', atk: 60, def: 55, hp: 450, price: 400000, fx: { aegis: 20 } },
    { id: 'c10', slot: 'charm', name: '大樹のしずく', atk: 85, def: 75, hp: 650, price: 900000, fx: { regen: 0.015 } },
    { id: 'c11', slot: 'charm', name: 'さばくのすなどけい', atk: 92, def: 81, hp: 700, price: 1150000, fx: { hourglass: 2.5 } },
    { id: 'c12', slot: 'charm', name: 'うみなりのしんじゅ', atk: 99, def: 87, hp: 755, price: 1400000, fx: { roller: 0.6 } },
    { id: 'c13', slot: 'charm', name: 'いかずちのたま', atk: 107, def: 94, hp: 815, price: 1700000, fx: { thunder: 8 } },
    { id: 'c14', slot: 'charm', name: 'まじんのめだま', atk: 115, def: 101, hp: 880, price: 2050000, fx: { blast: 0.8 } },
    { id: 'c15', slot: 'charm', name: 'ながれぼしのかけら', atk: 124, def: 109, hp: 950, price: 2500000, fx: { revive: 0.5 } },
  ];
  // ---- equipment that monsters drop (never sold in the shop) ----
  // special effects. Kept mild, and the same effect on two items does not stack.
  const FX = {
    spin: { v: 0.2, name: 'かいてん', note: 'ぐるぐる まわりながら ぶつかると いりょく+20%' },
    slowcrit: { v: 0.3, name: 'しずかな一撃', note: 'ゆっくり ぶつかるほど かいしんが でやすい（さいだい30%）' },
    recoil: { v: 0.5, name: 'はねかえり', note: 'ぶつかった ときの はねかえりが 1.5ばい。てきも おおきく ふっとぶ' },
    double: { v: 1, name: 'れんげき', note: 'ヒットすうが 2ばいで ふえる' },
    drain: { v: 0.03, name: 'きゅうけつ', note: 'てきを たおすと HPが 3%かいふく（ボスは あてるたび 1%）' },
    gold: { v: 0.15, name: 'しょうにん', note: 'ひろう ゴールド+15%' },
    exp: { v: 0.1, name: 'まなび', note: 'もらえる けいけんち+10%' },
    medic: { v: 2, name: 'くすし', note: 'どうぐの クールタイム-2びょう' },
    herbal: { v: 0.3, name: 'やくそうし', note: 'かいふくアイテムの かいふくりょう+30%' },
    brave: { v: 0.15, name: 'ゆうき', note: 'HPが まんたんの とき いりょく+15%' },
    desperate: { v: 0.25, name: 'はいすい', note: 'HPが 30%いかの とき いりょく+25%' },
    chain: { v: 1, name: 'れんぞく', note: 'コンボが きれるまでの じかん+1びょう' },
    bossbane: { v: 0.1, name: 'ボスごろし', note: 'ボスへの いりょく+10%' },
    guard: { v: 0.3, name: 'みかわし', note: 'こうげきを うけた あとの むてき じかん+0.3びょう' },
    buff: { v: 0.5, name: 'れんきん', note: 'ちから・まもりの くすりの こうか じかん+50%' },
    // the unique powers of the later charms (shop items)
    skillcd: { v: 0.3, name: 'ちえ', note: 'スキルの クールタイム -30%' },
    thorns: { v: 0.8, name: 'りゅうのうろこ', note: 'てきや ボスに ふれられて ダメージを うけると、あいてに こうげき×0.8 の はんげき' },
    aegis: { v: 20, name: 'まもりのひかり', note: 'こうげきを 1かい ふせぐ ひかりの たてが 20びょうごとに はられる' },
    regen: { v: 0.015, name: 'さいせい', note: '3びょう ダメージを うけないと、まいびょう さいだいHPの 1.5% かいふく' },
    hourglass: { v: 2.5, name: 'すなどけい', note: 'HPが 30%を きると 2.5びょう てきの 弾が とまる（40びょうに 1かい）' },
    roller: { v: 0.6, name: 'うずしお', note: 'ころがりの まちじかん はんぶん。ころがって ぶつかった てきに こうげき×0.6' },
    thunder: { v: 8, name: 'いかずち', note: '8かい あてるごとに ちかくの てきへ かみなり（こうげき×1.2）' },
    blast: { v: 0.8, name: 'ばくはつ', note: 'てきを たおすと ばくはつし、まわりの てきに こうげき×0.8' },
    revive: { v: 0.5, name: 'きせき', note: '1かいの ぼうけんで 1ど、たおれても HP 50% で ふっかつ' },
  };
  // the shop tier a player usually has in each dungeon: drops are pinned to it
  const DROP_WT = [1, 1, 2, 2, 3, 4, 5, 5, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 15, 15, 16, 16, 17, 17, 18, 19, 20, 21, 22];
  const DROP_AT = [1, 1, 2, 2, 3, 4, 4, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15, 16, 16, 17, 18, 19, 20, 21];
  // ふるびた (common, a weaker copy of a shop item) and 名工の (rare, a stronger copy)
  for (const base of EQUIP.filter(e => (e.slot === 'weapon' || e.slot === 'armor') && e.price > 0)) {
    const k = base.slot === 'weapon' ? 'atk' : 'def';
    EQUIP.push({ id: base.id + 'lo', slot: base.slot, name: (base.slot === 'weapon' ? 'さびた' : 'ぼろぼろの') + base.name, [k]: Math.max(1, Math.round(base[k] * 0.8)), price: 0, drop: 'lo', vis: base.id, val: Math.round(base.price * 0.2) });
    EQUIP.push({ id: base.id + 'rr', slot: base.slot, name: '名工の' + base.name, [k]: Math.round(base[k] * 1.3), price: 0, drop: 'rare', vis: base.id, val: Math.round(base.price * 0.5) });
  }
  // items with a special effect: [effect, slot, dungeon index, name]. Their stats are a bit below the shop tier of that dungeon.
  const SPECIALS = [
    ['herbal', 'charm', 1, 'やくそうのペンダント'], ['recoil', 'boots', 1, 'はずむくつ'],
    ['spin', 'weapon', 2, 'つむじの剣'], ['gold', 'charm', 2, 'しょうにんのゆびわ'],
    ['exp', 'charm', 3, 'まなびのおまもり'],
    ['slowcrit', 'weapon', 4, 'しずかなる刃'], ['medic', 'armor', 4, 'くすしのころも'],
    ['double', 'charm', 5, 'ふたごのうでわ'], ['chain', 'boots', 5, 'れんげきのくつ'],
    ['drain', 'weapon', 6, 'きゅうけつの剣'], ['guard', 'armor', 6, 'ひらりのころも'],
    ['brave', 'weapon', 7, 'ゆうきの剣'],
    ['desperate', 'armor', 8, 'はいすいのよろい'],
    ['bossbane', 'weapon', 9, 'かいぶつごろし'],
    ['buff', 'charm', 10, 'くすりびんのおまもり'],
    ['recoil', 'boots', 11, 'ばねじかけのくつ'],
    ['gold', 'charm', 13, 'おうごんのゆびわ'],
    ['spin', 'weapon', 14, 'たつまきの大剣'],
    ['herbal', 'charm', 15, 'いのちのペンダント'],
    ['exp', 'charm', 16, 'けんじゃのおまもり'],
    ['slowcrit', 'weapon', 17, 'めいきょうの太刀'],
    ['double', 'charm', 18, 'れんげきのうでわ'], ['chain', 'boots', 18, 'しっぷうのくつ'],
    ['medic', 'armor', 19, 'せいじょのころも'],
    ['drain', 'weapon', 20, 'ちのけいやくの剣'], ['guard', 'armor', 20, 'かげのころも'],
    ['brave', 'weapon', 21, 'えいゆうの剣'], ['buff', 'charm', 21, 'れんきんじゅつしのおまもり'],
    ['desperate', 'armor', 22, 'しにものぐるいのよろい'],
    ['bossbane', 'weapon', 23, 'まものほろぼしの剣'],
    ['spin', 'weapon', 25, '大樹のつむじ剣'], ['exp', 'charm', 26, 'ゆめのおまもり'], ['chain', 'boots', 26, 'ゆめみのくつ'],
    ['guard', 'armor', 27, 'いしのころも'], ['herbal', 'charm', 28, '風霊のペンダント'], ['brave', 'weapon', 28, 'てんしの剣'],
    ['bossbane', 'weapon', 29, 'かみごろしの剣'],
  ];
  SPECIALS.forEach(([fx, slot, d, name], i) => {
    const w = EQUIP.find(e => e.id === 'w' + DROP_WT[d]), a = EQUIP.find(e => e.id === 'a' + DROP_AT[d]);
    const e = { id: 'x' + i, slot, name, price: 0, drop: 'fx', fx: { [fx]: FX[fx].v }, from: d };
    if (slot === 'weapon') Object.assign(e, { atk: Math.round(w.atk * 0.85), vis: w.id, val: Math.round(w.price * 0.35) });
    else if (slot === 'armor') Object.assign(e, { def: Math.round(a.def * 0.85), vis: a.id, val: Math.round(a.price * 0.35) });
    else if (slot === 'boots') Object.assign(e, { ram: d < 5 ? 1.06 : d < 8 ? 1.18 : d < 12 ? 1.3 : d < 17 ? 1.44 : d < 21 ? 1.55 : 1.65, val: Math.round(w.price * 0.3) });
    else Object.assign(e, { hp: 10 + d * 8, val: Math.round(w.price * 0.3) });
    EQUIP.push(e);
  });
  const DROP_RATE = { lo: 0.012, fx: 0.002, rare: 0.0003, boss: 0.05 };   // per kill (boss: per clear)
  const RARITY = { lo: { mark: '', col: '#c8c0b0' }, fx: { mark: '◆', col: '#7ad8ff' }, rare: { mark: '★', col: '#f2c14e' } };
  const EQ = Object.fromEntries(EQUIP.map(e => [e.id, e]));
  const visOf = id => (EQ[id] && EQ[id].vis) || id;
  const SLOT_NAME = { weapon: 'ぶき', armor: 'よろい', boots: 'くつ', charm: 'そうしょく' };
  // heal = max(fixed amount, share of max HP), so items stay useful late in the game
  // heal = fixed HP (early game), pct = share of max HP (late game only). carry = how many of it one adventure can take.
  // unlock = the dungeon you must clear before the shop sells it. Up to 3 kinds go into a dungeon (set on the 準備 screen).
  const ITEMS = {
    herb: { name: 'やくそう', heal: 40, price: 8, carry: 10, note: 'HPを 40 かいふく' },
    potion: { name: 'ポーション', heal: 120, price: 30, carry: 6, note: 'HPを 120 かいふく' },
    hipotion: { name: 'ハイポーション', heal: 300, price: 90, carry: 4, unlock: 5, note: 'HPを 300 かいふく' },
    megapotion: { name: 'メガポーション', heal: 600, price: 320, carry: 3, unlock: 13, note: 'HPを 600 かいふく' },
    lifewater: { name: 'いのちの水', pct: 0.5, price: 3000, carry: 4, unlock: 20, note: 'さいだいHPの 50% かいふく' },
    lifedrop: { name: 'せいめいのしずく', pct: 0.75, price: 12000, carry: 3, unlock: 26, note: 'さいだいHPの 75% かいふく' },
    elixir: { name: 'エリクサー', pct: 1, price: 50000, carry: 2, unlock: 30, note: 'HPを ぜんかいふく' },
    power: { name: 'ちからのくすり', buff: 'atk', dur: 20, price: 150, carry: 2, note: '20びょう こうげき1.5ばい' },
    guard: { name: 'まもりのくすり', buff: 'def', dur: 20, price: 150, carry: 2, note: '20びょう うけるダメージはんぶん' },
  };
  const BAG_KINDS = 3;
  const POTCOL = { potion: '#e5483c', hipotion: '#7ab8ff', megapotion: '#b070ff', lifewater: '#4ad8e8', lifedrop: '#6ad870', elixir: '#f2c14e', power: '#ff8a3a', guard: '#5a8aff' };   // kinds of item one adventure can carry
  // skills: bought at the item shop, one is set at the hero's house, used in a dungeon by tapping the screen twice quickly.
  // dmg = multiple of こうげき (minus half the target's ぼうぎょ), like a weak-to-medium ram; every one has its own cooldown.
  const SKILLS = {
    shock: { name: 'しょうげきは', ch: '波', cd: 10, price: 1200, col: '#ffd27a', note: 'まわりの てきに こうげき×1.3 の ダメージ＋ふきとばす' },
    guard: { name: 'てっぺきのかまえ', ch: '盾', cd: 16, price: 4500, col: '#9fd0ff', note: '3びょう うける ダメージ -60%・ふきとばされにくい' },
    cry: { name: 'ときのこえ', ch: '吼', cd: 28, price: 15000, col: '#ff9a5a', note: '10びょう こうげき +25%' },
    heal: { name: 'いやしのいのり', ch: '癒', cd: 35, price: 30000, col: '#6fd38a', note: 'HPを 20% かいふく' },
    thunder: { name: 'いかずち', ch: '雷', cd: 12, price: 70000, col: '#ffe14a', note: 'ちかくの てき3たい（ボスも）に こうげき×1.6' },
    whirl: { name: 'つむじかぜ', ch: '旋', cd: 15, price: 130000, col: '#b8f0d8', note: '1.8びょう まわりを きりきざむ（0.3びょうごとに こうげき×0.45）' },
    barrier: { name: 'バリア', ch: '護', cd: 20, price: 250000, col: '#c8b0ff', note: '8びょう いない、つぎの こうげきを 1かい ふせぐ' },
    frost: { name: 'いてつくはどう', ch: '氷', cd: 20, price: 450000, col: '#a8e8ff', note: 'まわりに こうげき×0.8・てきを 2.5びょう こおらせ、ちかくの 弾を けす' },
    meteor: { name: 'メテオ', ch: '星', cd: 22, price: 900000, col: '#ff7a4a', note: 'ちかくの てき（ボス）に いんせき。0.9びょう後 はんい こうげき×3' },
    sand: { name: 'じかんのすな', ch: '時', cd: 40, price: 1500000, col: '#e8ecff', note: '2びょう てきの 弾が とまる' },
    holy: { name: 'せいなるいちげき', ch: '聖', cd: 24, price: 2000000, col: '#fff2a0', note: '10びょう いない、つぎの たいあたり3かいが いりょく +60%' },
  };
  const STARTER_SKILL = 'shock';   // known from the start (DEF_SAVE / loadSave)
  const healOf = (id, maxHp, fx) => Math.round((ITEMS[id].pct ? maxHp * ITEMS[id].pct : ITEMS[id].heal) * (1 + ((fx && fx.herbal) || 0)));
  const ITEM_MAX = 99;   // stock kept at home (shop items)
  const itemOpen = id => !ITEMS[id].unlock || !!(save.cleared && save.cleared[ITEMS[id].unlock - 1]);

  // monsters: base stats (scaled by the dungeon's multiplier)
  const EN = {
    slime: { name: 'スライム', hp: 14, atk: 5, def: 0, r: 13, mass: 1, spd: 45, exp: 4, gold: 3, ai: 'hop', col: '#58d36b' },
    bat: { name: 'コウモリ', hp: 10, atk: 5, def: 0, r: 11, mass: 0.6, spd: 95, exp: 4, gold: 3, ai: 'flutter', col: '#9b6bd8', fly: true },
    goblin: { name: 'ゴブリン', hp: 22, atk: 8, def: 1, r: 13, mass: 1.1, spd: 70, exp: 7, gold: 6, ai: 'lunge', col: '#7fb04a' },
    archer: { name: 'ゴブリンの弓兵', hp: 16, atk: 7, def: 0, r: 12, mass: 0.9, spd: 55, exp: 8, gold: 7, ai: 'shooter', col: '#a4b84a' },
    skeleton: { name: 'ガイコツ剣士', hp: 30, atk: 10, def: 2, r: 14, mass: 1.2, spd: 55, exp: 10, gold: 8, ai: 'swing', col: '#e8e2cf' },
    ghost: { name: 'ゴースト', hp: 22, atk: 9, def: 0, r: 13, mass: 0.7, spd: 40, exp: 10, gold: 9, ai: 'phase', col: '#cfe3ff', fly: true },
    mage: { name: 'やみのまどうし', hp: 24, atk: 11, def: 1, r: 13, mass: 0.9, spd: 0, exp: 13, gold: 12, ai: 'caster', col: '#8a4fd8' },
    lizard: { name: 'サラマンダー', hp: 34, atk: 12, def: 2, r: 14, mass: 1.2, spd: 80, exp: 14, gold: 12, ai: 'breath', col: '#ff7a3c' },
    golem: { name: 'ゴーレム', hp: 80, atk: 16, def: 5, r: 22, mass: 4, spd: 28, exp: 26, gold: 25, ai: 'slam', col: '#9a8f86' },
    knight: { name: 'やみの騎士', hp: 60, atk: 15, def: 4, r: 16, mass: 2, spd: 60, exp: 22, gold: 20, ai: 'guard', col: '#5a5f7a' },
    imp: { name: 'インプ', hp: 20, atk: 10, def: 0, r: 11, mass: 0.6, spd: 110, exp: 10, gold: 9, ai: 'imp', col: '#e0483c', fly: true },
    wolf: { name: 'オオカミ', hp: 18, atk: 7, def: 0, r: 13, mass: 1, spd: 105, exp: 6, gold: 5, ai: 'lunge', col: '#8a98b0', dash: 430, wind: 0.35 },
    mushroom: { name: 'おばけキノコ', hp: 20, atk: 6, def: 1, r: 13, mass: 1.2, spd: 30, exp: 6, gold: 5, ai: 'spore', col: '#e0503c' },
    spider: { name: 'クリスタルグモ', hp: 22, atk: 8, def: 1, r: 13, mass: 0.9, spd: 70, exp: 8, gold: 7, ai: 'web', col: '#7ad8ff' },
    fishman: { name: 'サハギン', hp: 34, atk: 11, def: 2, r: 14, mass: 1.2, spd: 75, exp: 12, gold: 10, ai: 'swing', col: '#3aa8a0' },
    scorpion: { name: 'デススコーピオン', hp: 40, atk: 12, def: 5, r: 15, mass: 1.6, spd: 85, exp: 14, gold: 12, ai: 'lunge', col: '#c8963a', dash: 460, wind: 0.4 },
    mummy: { name: 'ミイラ男', hp: 55, atk: 12, def: 3, r: 15, mass: 1.8, spd: 42, exp: 15, gold: 13, ai: 'shamble', col: '#d8cfa8' },
    toad: { name: 'どくガエル', hp: 30, atk: 10, def: 1, r: 14, mass: 1.2, spd: 70, exp: 10, gold: 9, ai: 'lunge', col: '#7ac83a', dash: 400, wind: 0.4 },
    mandrake: { name: 'マンドラゴラ', hp: 26, atk: 9, def: 1, r: 13, mass: 1.1, spd: 25, exp: 9, gold: 8, ai: 'spore', col: '#9ad86a' },
    wyvern: { name: 'ワイバーン', hp: 40, atk: 13, def: 2, r: 16, mass: 1.4, spd: 85, exp: 16, gold: 14, ai: 'breath', col: '#5a9a8a', fly: true },
    book: { name: 'まどうしょ', hp: 22, atk: 11, def: 0, r: 12, mass: 0.6, spd: 0, exp: 12, gold: 11, ai: 'caster', col: '#c84a4a', fly: true },
    armor: { name: 'さまようよろい', hp: 58, atk: 14, def: 5, r: 16, mass: 2, spd: 50, exp: 18, gold: 16, ai: 'swing', col: '#8a96b0' },
    mimic: { name: 'ミミック', hp: 45, atk: 15, def: 3, r: 15, mass: 1.5, spd: 90, exp: 20, gold: 30, ai: 'lunge', col: '#c08a4a', dash: 480, wind: 0.3 },
    angler: { name: 'チョウチンアンコウ', hp: 34, atk: 12, def: 1, r: 15, mass: 1.1, spd: 40, exp: 13, gold: 11, ai: 'phase', col: '#3a5a8a', fly: true },
    jelly: { name: 'デンキクラゲ', hp: 20, atk: 10, def: 0, r: 12, mass: 0.5, spd: 80, exp: 9, gold: 8, ai: 'flutter', col: '#c8a8ff', fly: true },
    hellhound: { name: 'ヘルハウンド', hp: 30, atk: 11, def: 1, r: 14, mass: 1.1, spd: 115, exp: 11, gold: 10, ai: 'lunge', col: '#c8402a', dash: 480, wind: 0.3 },
    fairy: { name: 'ようせい', hp: 22, atk: 11, def: 1, r: 11, mass: 0.5, spd: 115, exp: 13, gold: 12, ai: 'imp', col: '#ffb0f0', fly: true, mod: { spark: 1 } },
    baku: { name: 'バク', hp: 50, atk: 13, def: 3, r: 16, mass: 1.8, spd: 45, exp: 16, gold: 14, ai: 'spore', col: '#a090e0', mod: { dream: 1 } },
    gargoyle: { name: 'ガーゴイル', hp: 58, atk: 13, def: 8, r: 15, mass: 2, spd: 90, exp: 20, gold: 18, ai: 'lunge', col: '#8a8a94', fly: true, dash: 450, wind: 0.45, mod: { stone: 1 } },
    angel: { name: 'てんしへい', hp: 52, atk: 13, def: 5, r: 15, mass: 1.6, spd: 70, exp: 20, gold: 18, ai: 'swing', col: '#f0e8c0', fly: true, mod: { holy: 1 } },
    chaosbeast: { name: 'カオスビースト', hp: 76, atk: 13, def: 5, r: 18, mass: 3, spd: 60, exp: 24, gold: 22, ai: 'breath', col: '#6a2aa0', mod: { void: 1 } },
    harpy: { name: 'ハーピー', hp: 26, atk: 10, def: 0, r: 13, mass: 0.8, spd: 100, exp: 11, gold: 10, ai: 'lunge', col: '#3a9a8a', fly: true, dash: 470, wind: 0.5, mod: { feather: 1 } },
    crossbow: { name: 'ボウガンへい', hp: 30, atk: 12, def: 2, r: 13, mass: 1.1, spd: 50, exp: 13, gold: 12, ai: 'shooter', col: '#4e5468', mod: { bolt: 1 } },
    clockwork: { name: 'ぜんまいへい', hp: 50, atk: 13, def: 5, r: 15, mass: 1.8, spd: 55, exp: 18, gold: 18, ai: 'spin', col: '#c8902a' },
    starspirit: { name: 'ほしのせいれい', hp: 26, atk: 12, def: 0, r: 13, mass: 0.6, spd: 0, exp: 15, gold: 14, ai: 'caster', col: '#ffd84a', fly: true, mod: { star: 1 } },
    fireelem: { name: 'ほのおのせいれい', hp: 32, atk: 13, def: 1, r: 14, mass: 0.8, spd: 95, exp: 15, gold: 14, ai: 'lunge', col: '#ff5a1a', fly: true, dash: 440, wind: 0.5, mod: { trail: 1 } },
    ghostpirate: { name: 'ゆうれいかいぞく', hp: 36, atk: 13, def: 1, r: 14, mass: 1, spd: 55, exp: 15, gold: 16, ai: 'shooter', col: '#5ac0b0', fly: true, mod: { cannonball: 1 } },
    dwarf: { name: 'ドワーフせんし', hp: 64, atk: 13, def: 6, r: 15, mass: 2.2, spd: 58, exp: 22, gold: 22, ai: 'swing', col: '#e0702a', mod: { quake: 1 } },
    magicmirror: { name: 'まきょう', hp: 40, atk: 13, def: 2, r: 15, mass: 1.4, spd: 35, exp: 20, gold: 18, ai: 'mirror', col: '#e0b04a', fly: true },
    bonewyvern: { name: 'ボーンワイバーン', hp: 46, atk: 14, def: 3, r: 16, mass: 1.4, spd: 85, exp: 20, gold: 18, ai: 'breath', col: '#d8d0b8', fly: true, mod: { ghost: 1 } },
    darkpriest: { name: 'やみのしんかん', hp: 34, atk: 14, def: 2, r: 14, mass: 1, spd: 0, exp: 20, gold: 20, ai: 'caster', col: '#3a1a4a', mod: { homing: 1 } },
    archdemon: { name: 'アークデーモン', hp: 90, atk: 17, def: 5, r: 22, mass: 4, spd: 32, exp: 30, gold: 28, ai: 'slam', col: '#8a2a4a' },
    // 指示2: ten more, each with a big readable wind-up
    bomber: { name: 'ゴブリンボマー', hp: 30, atk: 12, def: 2, r: 13, mass: 1, spd: 55, exp: 13, gold: 13, ai: 'lob', col: '#7fb04a' },
    minotaur: { name: 'ミノタウロス', hp: 72, atk: 15, def: 5, r: 18, mass: 3, spd: 50, exp: 22, gold: 20, ai: 'charge', col: '#8e4c26' },
    mantis: { name: 'カマキリナイト', hp: 40, atk: 13, def: 3, r: 14, mass: 1.3, spd: 75, exp: 16, gold: 14, ai: 'swing', col: '#5ab03a', mod: { double: 1, leap: 1, reach: 84 } },
    snowman: { name: 'ゆきだるま', hp: 46, atk: 12, def: 3, r: 16, mass: 2, spd: 35, exp: 15, gold: 14, ai: 'roll', col: '#eaf2fa' },
    assassin: { name: 'かげのアサシン', hp: 34, atk: 14, def: 2, r: 13, mass: 0.9, spd: 95, exp: 18, gold: 18, ai: 'assassin', col: '#24243e', mod: { crit: 0.4 } },
    stormeagle: { name: 'いかずちワシ', hp: 38, atk: 13, def: 2, r: 16, mass: 1.2, spd: 90, exp: 17, gold: 16, ai: 'thunder', col: '#2a5ad0', fly: true },
    dullahan: { name: 'デュラハン', hp: 66, atk: 15, def: 6, r: 16, mass: 2.2, spd: 50, exp: 22, gold: 22, ai: 'dullahan', col: '#3e3658' },
    shark: { name: 'ブレードシャーク', hp: 44, atk: 14, def: 2, r: 16, mass: 1.5, spd: 120, exp: 17, gold: 15, ai: 'shark', col: '#5a7a9a' },
    basilisk: { name: 'バジリスク', hp: 56, atk: 13, def: 4, r: 17, mass: 2.4, spd: 45, exp: 19, gold: 17, ai: 'gaze', col: '#6a8a3a' },
    clown: { name: 'あくむのピエロ', hp: 36, atk: 12, def: 1, r: 14, mass: 1, spd: 60, exp: 16, gold: 18, ai: 'juggle', col: '#8a3ad8' },
  };

  // colour variants of existing monsters: tougher, worth more, and each with a twist on its attack
  // [base, name, stat factors, attack twist]
  const VARIANTS = {
    fireslime: ['slime', 'ほのおスライム', { hp: 1.3, atk: 1.2, xp: 1.6 }, { burst: 4 }],          // lands and sprays fire
    iceslime: ['slime', 'こおりスライム', { hp: 1.5, atk: 1.1, xp: 1.6 }, { chill: 1.4 }],        // touching it slows you
    vampbat: ['bat', 'ちすいコウモリ', { hp: 1.4, atk: 1.2, spd: 1.15, xp: 1.7 }, { shot: 1 }],   // spits blood orbs
    hobgoblin: ['goblin', 'ホブゴブリン', { hp: 1.7, atk: 1.3, r: 1.15, mass: 1.5, xp: 1.8 }, { twice: 1 }],   // lunges twice
    firearcher: ['archer', 'ほのおの弓兵', { hp: 1.3, atk: 1.2, xp: 1.6 }, { spread: 1 }],      // three arrows
    generalskel: ['skeleton', 'ガイコツ将軍', { hp: 1.6, atk: 1.25, xp: 1.8 }, { double: 1 }],   // two slashes
    wraith: ['ghost', 'レイス', { hp: 1.4, atk: 1.2, xp: 1.6 }, { fan: 1 }],                    // three orbs
    frostmage: ['mage', 'こおりのまどうし', { hp: 1.3, atk: 1.1, xp: 1.6 }, { ice: 1 }],         // freezing bolts slow you
    frostlizard: ['lizard', 'フロストリザード', { hp: 1.3, atk: 1.1, xp: 1.6 }, { ice: 1 }],     // frost breath
    lavagolem: ['golem', 'マグマゴーレム', { hp: 1.3, atk: 1.2, xp: 1.6 }, { fire: 1 }],         // stomp also throws fire
    crimsonknight: ['knight', 'あかの騎士', { hp: 1.3, atk: 1.25, xp: 1.6 }, { twice: 1 }],     // charges twice
    snowwolf: ['wolf', 'ゆきオオカミ', { hp: 1.4, atk: 1.15, spd: 1.1, xp: 1.6 }, { twice: 1 }],
    sleepshroom: ['mushroom', 'ねむりダケ', { hp: 1.3, atk: 1.1, xp: 1.5 }, { sleep: 1 }],        // spores slow you
    poisonspider: ['spider', 'どくグモ', { hp: 1.3, atk: 1.2, xp: 1.6 }, { poison: 1 }],         // venom spit instead of webs
    deepfishman: ['fishman', 'ディープサハギン', { hp: 1.4, atk: 1.2, xp: 1.6 }, { double: 1 }],
    goldscorpion: ['scorpion', 'ゴールドスコーピオン', { hp: 1.3, atk: 1.2, xp: 1.5, gp: 2.2 }, { twice: 1 }],
    cursemummy: ['mummy', 'のろいのミイラ', { hp: 1.3, atk: 1.2, xp: 1.6 }, { curse: 1 }],          // curse orbs
    iceimp: ['imp', 'アイスインプ', { hp: 1.3, atk: 1.1, xp: 1.5 }, { spread: 1, ice: 1 }],
    icewyvern: ['wyvern', 'アイスワイバーン', { hp: 1.3, atk: 1.15, xp: 1.6 }, { ice: 1 }],
    shadowarmor: ['armor', 'やみのよろい', { hp: 1.4, atk: 1.25, xp: 1.6 }, { double: 1 }],
  };
  for (const id in VARIANTS) {
    const [b, name, M, mod] = VARIANTS[id], B = EN[b];
    EN[id] = Object.assign({}, B, { name, base: b, mod, hp: Math.round(B.hp * (M.hp || 1)), atk: Math.round(B.atk * (M.atk || 1)), spd: Math.round(B.spd * (M.spd || 1)), r: Math.round(B.r * (M.r || 1)), mass: B.mass * (M.mass || 1), exp: Math.round(B.exp * (M.xp || 1)), gold: Math.round(B.gold * (M.gp || M.xp || 1)) });
  }
  // the golden slime: a rare runaway worth a fortune (rewards are set when it spawns)
  EN.goldslime = Object.assign({}, EN.slime, { name: 'ゴールデンスライム', hp: 34, atk: 0, def: 0, spd: 190, ai: 'flee', col: '#ffd23a', mod: {} });
  const PINK_DIAMOND_RATE = 0.001; // one independent roll per dungeon entry (0.1%), at most one
  EN.pinkdiamondslime = {...EN.slime,name:'ピンクダイアモンドスライム',hp:24,atk:0,def:0,spd:195,ai:'pinkflee',col:'#f28bc4',mod:{}};
  // where the variants turn up (added to each dungeon's pool)
  const VAR_POOL = [
    {}, { sleepshroom: 0.6 }, { hobgoblin: 0.7 }, { iceslime: 0.8 }, { wraith: 0.6 },
    { fireslime: 1, lavagolem: 0.4 }, { snowwolf: 1, frostmage: 0.6, iceslime: 0.5, frostlizard: 0.5 }, { firearcher: 0.7, vampbat: 0.6 }, { crimsonknight: 0.6, generalskel: 0.5 }, { deepfishman: 0.8, poisonspider: 0.4 },
    { goldscorpion: 0.6, cursemummy: 0.6 }, { crimsonknight: 0.5, firearcher: 0.5 }, { wraith: 0.8, frostmage: 0.5 }, { lavagolem: 0.8, fireslime: 0.6 },
    { poisonspider: 0.8, sleepshroom: 0.6 }, { generalskel: 0.6, wraith: 0.6, deepfishman: 0.5 }, { snowwolf: 1, icewyvern: 0.8, frostlizard: 0.5 }, { frostmage: 0.8, shadowarmor: 0.5 }, { poisonspider: 0.6, goldscorpion: 0.5 },
    { lavagolem: 0.8, shadowarmor: 0.6 }, { crimsonknight: 0.6, shadowarmor: 0.6, wraith: 0.5 }, { deepfishman: 1 }, { generalskel: 1, cursemummy: 0.6, icewyvern: 0.5 }, { lavagolem: 0.6, iceimp: 0.8, vampbat: 0.6 },
    { crimsonknight: 0.6, generalskel: 0.5, shadowarmor: 0.5, wraith: 0.5 },
    { snowwolf: 0.6, sleepshroom: 0.5 }, { wraith: 0.6, iceimp: 0.5 }, { cursemummy: 0.6, shadowarmor: 0.5 }, { wraith: 0.5, icewyvern: 0.5 }, { lavagolem: 0.5, shadowarmor: 0.6, wraith: 0.5 },
    { goldscorpion: 0.6, cursemummy: 0.5 }, { deepfishman: 0.8, poisonspider: 0.4 }, { icewyvern: 0.6, vampbat: 0.4 }, { shadowarmor: 0.6, iceimp: 0.5 }, { wraith: 0.5, icewyvern: 0.4 },
  ];

  // 35 dungeons (26-30: the rift that opens once the demon king falls; 31-35: the trials beyond it). m = monster HP multiplier, a = monster attack multiplier.
  // xp / gp = EXP and gold one full run is worth (monsters + boss + boxes); the numbers are set so that
  // stages 1-5 clear first time, and from 6 on: clear + about 3 more runs of the newest stage = ready for the next.
  const DUNGEONS = [
    { name: 'はじまりの洞窟', en: 'BEGINNER CAVE', rec: 1, len: 2500, w: [0.64, 0.86], pool: { slime: 3, bat: 1.4 }, groups: 9, rocks: 4, spikes: 0, chests: 2, crates: 4,
      pal: { wall: '#1d1926', wallHi: '#3a3249', floor: '#655a72', floorLn: '#4c4258', light: '255,196,130', fog: 0.42 }, song: 'H', key: 0, bpm: 128, boss: 'kingslime', m: 1.0, a: 1.0, xp: 27, gp: 145 },
    { name: 'まよいの森', en: 'LOST WOODS', rec: 3, len: 2650, w: [0.62, 0.88], pool: { wolf: 2, mushroom: 2, slime: 1, bat: 0.6 }, groups: 10, rocks: 6, spikes: 0, chests: 2, crates: 4,
      pal: { wall: '#0f1f12', wallHi: '#24442a', floor: '#4f6a3e', floorLn: '#3d5530', light: '210,255,150', fog: 0.44 }, song: 'c17', key: 2, bpm: 124, boss: 'treant', m: 1.15, a: 1.12, xp: 85, gp: 210 },
    { name: 'ゴブリンの坑道', en: 'GOBLIN MINE', rec: 4, len: 2800, w: [0.62, 0.9], pool: { goblin: 3, archer: 2, wolf: 0.8, bat: 0.6 }, groups: 10, rocks: 7, spikes: 3, chests: 2, crates: 5,
      pal: { wall: '#211810', wallHi: '#4a3626', floor: '#7a6046', floorLn: '#5e4834', light: '255,180,90', fog: 0.46 }, song: 'c7', key: 2, bpm: 128, boss: 'goblinking', m: 1.25, a: 1.18, xp: 197, gp: 305 },
    { name: '水晶の洞くつ', en: 'CRYSTAL CAVERN', rec: 6, len: 2950, w: [0.62, 0.9], pool: { spider: 3, bat: 1.2, golem: 0.6, mushroom: 0.8 }, groups: 11, rocks: 7, spikes: 3, chests: 2, crates: 4,
      pal: { wall: '#151530', wallHi: '#353a6e', floor: '#4a4a7a', floorLn: '#38385e', light: '150,210,255', fog: 0.5 }, song: 'K', key: 4, bpm: 132, boss: 'spiderqueen', m: 1.64, a: 1.51, xp: 314, gp: 442 },
    { name: 'のろいの地下墓地', en: 'CURSED CATACOMB', rec: 7, len: 3100, w: [0.62, 0.9], pool: { skeleton: 3, ghost: 2, mage: 1, spider: 0.6 }, groups: 11, rocks: 6, spikes: 5, chests: 2, crates: 4,
      pal: { wall: '#121a21', wallHi: '#2c3b47', floor: '#4a5a66', floorLn: '#36444f', light: '140,220,255', fog: 0.62 }, song: 'warp', key: 9, bpm: 132, boss: 'lich', m: 1.9, a: 1.65, xp: 511, gp: 641 },
    { name: 'しゃくねつの溶岩洞', en: 'MAGMA DEPTHS', rec: 12, len: 3200, w: [0.62, 0.9], pool: { lizard: 3, golem: 0.9, imp: 1, bat: 0.8 }, groups: 12, rocks: 7, spikes: 6, chests: 2, crates: 4,
      pal: { wall: '#240e0b', wallHi: '#4e2218', floor: '#6e3a28', floorLn: '#552c1e', light: '255,120,60', fog: 0.46 }, song: 'c18', key: 4, bpm: 132, boss: 'dragon', m: 3.05, a: 2.39, xp: 895, gp: 929 },
    { name: 'こおりの塔', en: 'FROZEN SPIRE', rec: 16, len: 3300, w: [0.62, 0.9], pool: { wolf: 2, ghost: 1.2, golem: 0.6, mage: 0.8, knight: 0.5, snowman: 1.4 }, groups: 12, rocks: 6, spikes: 6, chests: 2, crates: 4,
      pal: { wall: '#16283a', wallHi: '#365a78', floor: '#8aa8c0', floorLn: '#6a8aa4', light: '190,240,255', fog: 0.4 }, song: 'laser', key: 7, bpm: 134, boss: 'icequeen', m: 3.94, a: 2.87, xp: 1428, gp: 1348 },
    { name: '天空の遺跡', en: 'SKY RUINS', rec: 20, len: 3400, w: [0.62, 0.9], pool: { harpy: 2, imp: 1.5, archer: 1.2, mage: 0.8, knight: 0.6 }, groups: 13, rocks: 5, spikes: 6, chests: 2, crates: 4,
      pal: { wall: '#2a3a5a', wallHi: '#5a7aa8', floor: '#b0a890', floorLn: '#8e8670', light: '255,240,170', fog: 0.3 }, song: 'A', key: 7, bpm: 136, boss: 'thunderbird', m: 4.87, a: 3.33, xp: 2065, gp: 1954 },
    { name: 'やみの砦', en: 'DARK FORTRESS', rec: 24, len: 3500, w: [0.62, 0.9], pool: { knight: 1.6, crossbow: 1.3, skeleton: 0.9, mage: 0.4, golem: 0.5, imp: 0.5, assassin: 1.2, bomber: 1 }, groups: 13, rocks: 5, spikes: 7, chests: 2, crates: 3,
      pal: { wall: '#140d10', wallHi: '#3a2228', floor: '#4a3a40', floorLn: '#382a30', light: '255,80,90', fog: 0.56 }, song: 'piston', key: 9, bpm: 138, boss: 'deathknight', m: 6.08, a: 3.88, xp: 2799, gp: 2833 },
    { name: 'しずみの神殿', en: 'SUNKEN TEMPLE', rec: 28, len: 3500, w: [0.62, 0.9], pool: { fishman: 3, ghost: 1, spider: 1, mushroom: 0.8 }, groups: 13, rocks: 6, spikes: 5, chests: 2, crates: 3,
      pal: { wall: '#0c2028', wallHi: '#1f4a58', floor: '#3a6a74', floorLn: '#2c545c', light: '120,230,220', fog: 0.5 }, song: 'c8', key: 5, bpm: 134, boss: 'kraken', m: 7.9, a: 4.71, xp: 3628, gp: 4108 },
    { name: 'さばくの大ピラミッド', en: 'GREAT PYRAMID', rec: 32, len: 3600, w: [0.62, 0.9], pool: { mummy: 2.5, scorpion: 2, imp: 1, mage: 0.8 }, groups: 13, rocks: 5, spikes: 8, chests: 2, crates: 3,
      pal: { wall: '#3a2a12', wallHi: '#6a5022', floor: '#c8a868', floorLn: '#a88a50', light: '255,220,140', fog: 0.38 }, song: 'mine', key: 4, bpm: 138, boss: 'pharaoh', m: 8.96, a: 5.17, xp: 4548, gp: 5957 },
    { name: 'からくりの時計塔', en: 'CLOCKWORK TOWER', rec: 36, len: 3700, w: [0.62, 0.9], pool: { clockwork: 1.8, golem: 0.8, knight: 0.8, imp: 0.6, crossbow: 0.5, archer: 0.4, scorpion: 0.4, bomber: 1.2, clown: 1.1 }, groups: 14, rocks: 5, spikes: 8, chests: 2, crates: 3,
      pal: { wall: '#2a1e14', wallHi: '#5a4430', floor: '#8a7058', floorLn: '#6a5440', light: '255,200,120', fog: 0.45 }, song: 'swing', key: 7, bpm: 140, boss: 'clockmachine', m: 10.25, a: 5.7, xp: 5555, gp: 8638 },
    { name: '星界のさけめ', en: 'ASTRAL RIFT', rec: 40, len: 3800, w: [0.62, 0.9], pool: { starspirit: 1.8, ghost: 1.3, mage: 0.7, imp: 0.7, spider: 0.6, knight: 0.4, clown: 1.3 }, groups: 14, rocks: 4, spikes: 6, chests: 2, crates: 3,
      pal: { wall: '#08061a', wallHi: '#241e5a', floor: '#2e2a5e', floorLn: '#221e48', light: '200,160,255', fog: 0.6 }, song: 'gravity', key: 9, bpm: 142, boss: 'voideye', m: 11.67, a: 6.25, xp: 6647, gp: 12525 },
    { name: 'ほのおの魔界門', en: 'INFERNO GATE', rec: 44, len: 3900, w: [0.62, 0.9], pool: { fireelem: 1.6, lizard: 1.5, golem: 0.7, knight: 0.8, imp: 0.6, scorpion: 0.5, minotaur: 1.5 }, groups: 15, rocks: 5, spikes: 9, chests: 2, crates: 3,
      pal: { wall: '#2a0806', wallHi: '#5a1410', floor: '#6a2418', floorLn: '#521a10', light: '255,90,40', fog: 0.5 }, song: 'slam', key: 2, bpm: 142, boss: 'cerberus', m: 12.74, a: 6.65, xp: 7822, gp: 18162 },
    { name: '毒の大沼', en: 'POISON MIRE', rec: 48, len: 3900, w: [0.62, 0.9], pool: { toad: 2.6, mandrake: 1.3, mushroom: 0.8, spider: 0.5, bat: 0.5, mantis: 1.2 }, groups: 15, rocks: 6, spikes: 6, chests: 2, crates: 3,
      pal: { wall: '#14200e', wallHi: '#2e4420', floor: '#4a5a2e', floorLn: '#3a4822', light: '170,255,90', fog: 0.55 }, song: 'c17', key: 5, bpm: 142, boss: 'hydra', m: 14.14, a: 7.22, xp: 9103, gp: 22702 },
    { name: 'ゆうれい船', en: 'GHOST SHIP', rec: 52, len: 3900, w: [0.62, 0.86], pool: { ghostpirate: 1.6, ghost: 1.2, skeleton: 1.2, fishman: 0.8, jelly: 0.9, shark: 1.3 }, groups: 15, rocks: 4, spikes: 6, chests: 2, crates: 4,
      pal: { wall: '#1a1410', wallHi: '#3e3020', floor: '#6a5640', floorLn: '#4e3e2c', light: '140,255,200', fog: 0.6 }, song: 'warp', key: 9, bpm: 142, boss: 'ghostcaptain', m: 15.7, a: 7.83, xp: 10472, gp: 27697 },
    { name: 'きょじんの峰', en: "GIANTS' PEAK", rec: 56, len: 4000, w: [0.62, 0.9], pool: { wyvern: 1.8, wolf: 1.1, harpy: 0.7, dwarf: 0.8, golem: 0.5, archer: 0.6, snowman: 1.2 }, groups: 15, rocks: 8, spikes: 6, chests: 2, crates: 3,
      pal: { wall: '#2a2a34', wallHi: '#5a5a6a', floor: '#8a8478', floorLn: '#6a655a', light: '255,230,190', fog: 0.32 }, song: 'A', key: 2, bpm: 144, boss: 'cyclops', m: 17.42, a: 8.49, xp: 11922, gp: 33790 },
    { name: 'まどうの図書館', en: 'ARCANE LIBRARY', rec: 60, len: 4000, w: [0.62, 0.88], pool: { book: 2.5, mage: 1.3, ghost: 1, magicmirror: 0.6, imp: 0.6, armor: 0.6 }, groups: 15, rocks: 3, spikes: 6, chests: 2, crates: 4,
      pal: { wall: '#20142a', wallHi: '#4a2e3a', floor: '#5a3a2a', floorLn: '#44281c', light: '255,210,140', fog: 0.5 }, song: 'swing', key: 7, bpm: 144, boss: 'archmage', m: 19.34, a: 9.22, xp: 13452, gp: 41224 },
    { name: 'ジャングルの神殿', en: 'JUNGLE TEMPLE', rec: 64, len: 4000, w: [0.62, 0.9], pool: { mandrake: 1.2, toad: 1.2, scorpion: 0.7, lizard: 0.7, mimic: 0.5, mantis: 1.3, basilisk: 1.1 }, groups: 16, rocks: 6, spikes: 8, chests: 2, crates: 3,
      pal: { wall: '#102a14', wallHi: '#2e5a2a', floor: '#7a8a5a', floorLn: '#5e6e44', light: '200,255,140', fog: 0.45 }, song: 'mine', key: 4, bpm: 146, boss: 'quetzal', m: 21.47, a: 10.0, xp: 15061, gp: 50294 },
    { name: 'ドワーフの溶鉱炉', en: 'DWARF FORGE', rec: 68, len: 4000, w: [0.62, 0.9], pool: { dwarf: 1.5, armor: 1, golem: 0.6, lizard: 0.8, clockwork: 0.6, knight: 0.4, bomber: 1.4 }, groups: 16, rocks: 5, spikes: 9, chests: 2, crates: 3,
      pal: { wall: '#1a1612', wallHi: '#4a3a2a', floor: '#5a5a62', floorLn: '#44444c', light: '255,150,60', fog: 0.45 }, song: 'piston', key: 9, bpm: 146, boss: 'colossus', m: 23.83, a: 10.85, xp: 16746, gp: 61358 },
    { name: 'かがみの迷宮', en: 'MIRROR MAZE', rec: 72, len: 4100, w: [0.6, 0.86], pool: { magicmirror: 1.5, mimic: 1, armor: 0.7, mage: 0.5, ghost: 0.5, knight: 0.4, book: 0.4, assassin: 1.4, minotaur: 1.2 }, groups: 16, rocks: 4, spikes: 8, chests: 2, crates: 3,
      pal: { wall: '#1a2238', wallHi: '#4a5a8a', floor: '#9aa8c8', floorLn: '#7a88a8', light: '220,230,255', fog: 0.35 }, song: 'gravity', key: 2, bpm: 148, boss: 'shadowhero', m: 26.45, a: 11.77, xp: 18508, gp: 74857 },
    { name: 'しんかいの海溝', en: 'ABYSSAL TRENCH', rec: 76, len: 4100, w: [0.62, 0.9], pool: { angler: 1.8, jelly: 1.8, fishman: 1.2, ghostpirate: 0.6, spider: 0.4, shark: 1.4 }, groups: 16, rocks: 6, spikes: 6, chests: 2, crates: 3,
      pal: { wall: '#04101c', wallHi: '#10304a', floor: '#1e3a52', floorLn: '#162c40', light: '90,200,255', fog: 0.66 }, song: 'c8', key: 5, bpm: 148, boss: 'leviathan', m: 29.36, a: 12.77, xp: 20345, gp: 91326 },
    { name: 'りゅうの墓場', en: 'DRAGON GRAVEYARD', rec: 80, len: 4100, w: [0.62, 0.9], pool: { bonewyvern: 1.5, skeleton: 1.5, ghost: 0.8, mummy: 0.6, hellhound: 0.7, dullahan: 1.3 }, groups: 16, rocks: 6, spikes: 8, chests: 2, crates: 3,
      pal: { wall: '#1c1a18', wallHi: '#3e3a34', floor: '#6a6258', floorLn: '#524a40', light: '200,255,220', fog: 0.55 }, song: 'c15', key: 9, bpm: 150, boss: 'bonedragon', m: 32.59, a: 13.86, xp: 22256, gp: 111417 },
    { name: 'まかいの荒野', en: 'DEMON WASTES', rec: 84, len: 4100, w: [0.62, 0.9], pool: { hellhound: 2, archdemon: 1.2, imp: 1.2, fireelem: 0.8, darkpriest: 0.8, lizard: 0.6, knight: 0.5 }, groups: 16, rocks: 6, spikes: 9, chests: 2, crates: 3,
      pal: { wall: '#2a0a10', wallHi: '#5a1a24', floor: '#5a2a2a', floorLn: '#441e1e', light: '255,70,70', fog: 0.52 }, song: 'slam', key: 2, bpm: 150, boss: 'demongeneral', m: 36.17, a: 15.04, xp: 24239, gp: 135929 },
    { name: '魔王城', en: "DEMON KING'S CASTLE", rec: 88, len: 4100, w: [0.62, 0.9], pool: { knight: 1, darkpriest: 1, crossbow: 0.5, magicmirror: 0.4, mage: 0.4, ghost: 0.4, imp: 0.6, archdemon: 0.7, armor: 0.6, hellhound: 0.6, dullahan: 1.2, assassin: 1 }, groups: 17, rocks: 5, spikes: 9, chests: 2, crates: 3,
      pal: { wall: '#170d22', wallHi: '#35214c', floor: '#54406a', floorLn: '#3f2f52', light: '220,120,255', fog: 0.56 }, song: 'c3', key: 2, bpm: 152, boss: 'maou', m: 40.15, a: 16.31, xp: 26295, gp: 165833 },
    // --- the rift (post-game) ---
    { name: 'せかいじゅの こずえ', en: 'WORLD TREE CANOPY', rec: 92, len: 4200, w: [0.6, 0.86], pool: { fairy: 2.3, mandrake: 1, toad: 0.7, wyvern: 0.9, wolf: 0.5, mantis: 1.3 }, groups: 17, rocks: 4, spikes: 6, chests: 2, crates: 3,
      pal: { wall: '#16260e', wallHi: '#3e5a24', floor: '#6a5a3a', floorLn: '#4e4028', light: '210,255,170', fog: 0.4 }, song: 'c17', key: 2, bpm: 150, boss: 'fenrir', m: 44.57, a: 17.0, xp: 28422, gp: 202316 },
    { name: 'ゆめの かいろう', en: 'DREAM CORRIDOR', rec: 96, len: 4200, w: [0.6, 0.86], pool: { baku: 2.2, fairy: 0.9, starspirit: 0.7, ghost: 0.6, book: 0.4, mimic: 0.4, clown: 1.4 }, groups: 17, rocks: 3, spikes: 6, chests: 2, crates: 3,
      pal: { wall: '#2a1a3a', wallHi: '#5a3a7a', floor: '#7a5e98', floorLn: '#604880', light: '255,180,240', fog: 0.42 }, song: 'gravity', key: 7, bpm: 150, boss: 'nightmare', m: 49.47, a: 17.6, xp: 30620, gp: 246826 },
    { name: 'いしの みやこ', en: 'PETRIFIED CITY', rec: 100, len: 4200, w: [0.6, 0.88], pool: { gargoyle: 1.8, golem: 0.6, magicmirror: 0.5, armor: 0.5, mummy: 0.5, scorpion: 0.4, basilisk: 1.3, minotaur: 1.1 }, groups: 17, rocks: 7, spikes: 7, chests: 2, crates: 3,
      pal: { wall: '#262624', wallHi: '#5a5a56', floor: '#8a867a', floorLn: '#6e6a5e', light: '240,230,200', fog: 0.4 }, song: 'mine', key: 4, bpm: 152, boss: 'gorgon', m: 54.92, a: 18.2, xp: 32888, gp: 301128 },
    { name: 'てんかいの もん', en: 'GATE OF HEAVEN', rec: 104, len: 4300, w: [0.6, 0.88], pool: { angel: 1.8, fairy: 1, harpy: 0.7, gargoyle: 0.7, starspirit: 0.5, ghost: 0.4, stormeagle: 1.3 }, groups: 17, rocks: 3, spikes: 5, chests: 2, crates: 3,
      pal: { wall: '#5a5a7a', wallHi: '#b8b8d8', floor: '#d8d2c0', floorLn: '#b8ae94', light: '255,250,220', fog: 0.22 }, song: 'A', key: 7, bpm: 152, boss: 'fallenangel', m: 60.96, a: 18.8, xp: 35224, gp: 367376 },
    { name: 'はかいしんの ざ', en: 'THRONE OF RUIN', rec: 108, len: 4300, w: [0.6, 0.88], pool: { chaosbeast: 1.5, angel: 0.9, gargoyle: 0.7, darkpriest: 0.7, bonewyvern: 0.5, archdemon: 0.5, hellhound: 0.6, fairy: 0.5, dullahan: 1.2 }, groups: 17, rocks: 4, spikes: 5, chests: 2, crates: 3,
      pal: { wall: '#0a0410', wallHi: '#2a0a3a', floor: '#2a1236', floorLn: '#1c0a26', light: '255,70,210', fog: 0.6 }, song: 'c3', key: 2, bpm: 156, boss: 'hakaishin', m: 67.66, a: 19.4, xp: 37629, gp: 448198 },
    // --- the trials beyond (31-35): new bosses built from moving parts ---
    { name: 'すなあらしの さきゅう', en: 'SANDSTORM DUNES', rec: 112, len: 4300, w: [0.6, 0.88], pool: { scorpion: 1.6, mummy: 1, fireelem: 0.6, harpy: 0.4, gargoyle: 0.4, toad: 0.3, basilisk: 1.5, minotaur: 1.1 }, groups: 17, rocks: 6, spikes: 5, chests: 2, crates: 3,
      pal: { wall: '#4a3018', wallHi: '#8a6234', floor: '#d0a868', floorLn: '#b08a50', light: '255,220,150', fog: 0.36 }, song: 'mine', key: 4, bpm: 150, boss: 'sandworm', m: 79.64, a: 21.18, xp: 40080, gp: 546802 },
    { name: 'さんごの らせんどう', en: 'CORAL SPIRAL', rec: 116, len: 4300, w: [0.6, 0.86], pool: { angler: 1.3, jelly: 1.3, fishman: 1, ghostpirate: 0.7, mimic: 0.4, shark: 1.8 }, groups: 17, rocks: 5, spikes: 5, chests: 2, crates: 3,
      pal: { wall: '#0a2a3a', wallHi: '#1a5a6a', floor: '#3a7a8a', floorLn: '#2a5e6c', light: '140,255,230', fog: 0.5 }, song: 'c8', key: 5, bpm: 150, boss: 'gigacrab', m: 85.22, a: 21.81, xp: 42620, gp: 667098 },
    { name: 'らいうんの たかみ', en: 'THUNDERHEAD', rec: 120, len: 4400, w: [0.6, 0.88], pool: { harpy: 1.5, angel: 1, wyvern: 0.8, starspirit: 0.6, jelly: 0.5, crossbow: 0.5, stormeagle: 1.6, snowman: 1 }, groups: 17, rocks: 3, spikes: 5, chests: 2, crates: 3,
      pal: { wall: '#2a2a4a', wallHi: '#5a5a8a', floor: '#8a8ab0', floorLn: '#6a6a90', light: '230,240,255', fog: 0.34 }, song: 'A', key: 7, bpm: 152, boss: 'raijin', m: 91.18, a: 22.47, xp: 45220, gp: 813860 },
    { name: 'まじんの てのひら', en: "DEMON'S PALM", rec: 124, len: 4400, w: [0.6, 0.88], pool: { archdemon: 0.8, darkpriest: 1, magicmirror: 0.8, chaosbeast: 0.8, hellhound: 0.8, imp: 0.5, assassin: 1.3, dullahan: 1.2 }, groups: 18, rocks: 4, spikes: 5, chests: 2, crates: 3,
      pal: { wall: '#1a0a1e', wallHi: '#3e1a44', floor: '#4a2a50', floorLn: '#361e3c', light: '220,120,255', fog: 0.58 }, song: 'c3', key: 2, bpm: 154, boss: 'demonhands', m: 97.56, a: 23.15, xp: 47890, gp: 992909 },
    { name: 'ほしふる てんくう', en: 'STARFALL SKY', rec: 128, len: 4400, w: [0.6, 0.88], pool: { starspirit: 1.4, fairy: 1, angel: 0.8, harpy: 0.6, bonewyvern: 0.6, baku: 0.5, stormeagle: 1.4, clown: 1 }, groups: 18, rocks: 3, spikes: 5, chests: 2, crates: 3,
      pal: { wall: '#0a0e2a', wallHi: '#1e2a5a', floor: '#1a2250', floorLn: '#121a40', light: '170,200,255', fog: 0.5 }, song: 'gravity', key: 9, bpm: 154, boss: 'skywhale', m: 104.39, a: 23.84, xp: 50620, gp: 1211349 },
  ];

  DUNGEONS.forEach((d, i) => Object.assign(d.pool, VAR_POOL[i] || {}));

  // field gimmicks per dungeon. Floor patches (mud / poison / ice / belt / stream / crumble / vent) are few, never span the
  // whole corridor, and are spaced apart, so there is always a plain way through.
  const GIM = [
    {}, { mud: 3, bumper: 3 }, { boulder: 2, barrel: 3 }, { bumper: 4 }, { crumble: 3, swing: 2 },
    { vent: 5 }, { ice: 3 }, { crumble: 3, warp: 1 }, { mace: 3, barrel: 3 }, { stream: 3 },
    { boulder: 2, crumble: 2 }, { belt: 3, mace: 2, bumper: 2 }, { warp: 2, bumper: 3 }, { vent: 4, mace: 1 },
    { poison: 3, barrel: 2 }, { barrel: 4, swing: 2 }, { boulder: 3, bumper: 2 }, { warp: 2, bumper: 2, swing: 1 }, { mud: 2, boulder: 2 },
    { belt: 3, vent: 3 }, { ice: 2, bumper: 4, warp: 1 }, { stream: 3, bumper: 2 }, { crumble: 3, swing: 2 }, { vent: 4, boulder: 2 },
    { mace: 3, crumble: 2, warp: 1 },
    { bumper: 3, crumble: 2, mud: 1 }, { warp: 1, ice: 2, bumper: 3 }, { boulder: 2, swing: 1, crumble: 2 }, { stream: 2, warp: 1, bumper: 3 }, { vent: 3, mace: 2, crumble: 2 },
    { mud: 2, boulder: 2, barrel: 2 }, { stream: 2, bumper: 3 }, { warp: 1, bumper: 2, crumble: 2 }, { mace: 2, vent: 2, swing: 1 }, { ice: 2, warp: 1, bumper: 2 },
  ];
  // each boss's own technique: [move, name shown when it starts]
  const SIG = {
    kingslime: ['split', 'ぶんれつジャンプ'], treant: ['roots', 'ねっこしばり'], goblinking: ['bombs', 'ばくだんなげ'], spiderqueen: ['webnet', 'くものす ばくだん'],
    lich: ['soulstorm', 'たましいの うず'], dragon: ['firestorm', 'ほのおの たつまき'], icequeen: ['icecage', 'こおりの おり'], thunderbird: ['thunderlines', 'いかずちの あみ'],
    deathknight: ['darkwave', 'やみの ざんげき'], kraken: ['ink', 'すみの うみ'], pharaoh: ['quicksand', 'すなじごく'], clockmachine: ['timestop', 'タイムストップ'],
    voideye: ['gaze', 'ついびの まなざし'], cerberus: ['firetrail', 'じごくの とっしん'], hydra: ['regen', 'さいせい'], ghostcaptain: ['cannons', 'いっせい ほうげき'],
    cyclops: ['boulders', 'いわなだれ'], archmage: ['illusion', 'げんえいじゅつ'], quetzal: ['tornado', 'たつまきの つばさ'], colossus: ['rocketfist', 'ロケットパンチ'],
    shadowhero: ['mirror', 'かげうつし'], leviathan: ['tsunami', 'だいつなみ'], bonedragon: ['raisedead', 'しりょうの よびごえ'], demongeneral: ['whirlblade', 'まぐんの せんぷう'],
    maou: ['despair', 'ぜつぼうの まほうじん'],
    sandworm: ['burrow', 'すなじごくの ひとのみ'], gigacrab: ['pincer', 'ギロチンばさみ'], raijin: ['taiko', 'いかずちの たいこ'], demonhands: ['clap', 'まじんの はくしゅ'], skywhale: ['breach', 'ほしくじらの ダイブ'],
    fenrir: ['packhunt', 'まぼろしの むれ'], nightmare: ['dreamorbs', 'あくむの あわ'], gorgon: ['petrify', 'せきかの まなざし'], fallenangel: ['pillars', 'さばきの ひかり'], hakaishin: ['collapse', 'せかいの ほうかい'],
  };
  const FLOOR_GIM = { mud: 1, poison: 1, ice: 1, belt: 1, stream: 1, crumble: 1, vent: 1 };

  // bosses live in a big round room. moves = phase 1, moves2 = below half HP (faster, nastier)
  const BOSSES = {
    kingslime: { name: 'キングスライム', hp: 290, atk: 11, def: 0, r: 40, exp: 70, gold: 120, col: '#4fd468', song: 'guardian', key: 0, bpm: 136,
      moves: ['ring', 'jump', 'aimed3', 'stalk', 'jump'], moves2: ['triple', 'jump', 'gapring', 'stalk', 'jump', 'aimed5'] },
    treant: { name: 'ジャイアントトレント', hp: 370, atk: 13, def: 1, r: 44, exp: 150, gold: 220, col: '#6a9a3a', song: 'guardian', key: 2, bpm: 134,
      moves: ['rain:thorn', 'spiral', 'wave', 'homing', 'ring'], moves2: ['rain:thorn', 'spiral3', 'gapring', 'homing', 'wave', 'quake'] },
    goblinking: { name: 'ゴブリンキング', hp: 540, atk: 17, def: 2, r: 38, exp: 300, gold: 400, col: '#86b84a', song: 'guardian', key: 4, bpm: 138,
      moves: ['sweep', 'rocks', 'charge', 'mines', 'stalk'], moves2: ['sweep', 'dash3', 'mines', 'rocks', 'ringaimed', 'quake'] },
    spiderqueen: { name: 'クイーンスパイダー', hp: 700, atk: 20, def: 4, r: 42, exp: 520, gold: 650, col: '#7ad8ff', song: 'rave', key: 4, bpm: 140,
      moves: ['homing', 'gapring', 'laser', 'charge', 'wave'], moves2: ['laser3', 'cross', 'homing', 'dash3', 'triple'] },
    lich: { name: 'リッチ', hp: 780, atk: 22, def: 5, r: 36, exp: 800, gold: 900, col: '#b48cff', song: 'rave', key: 9, bpm: 140,
      moves: ['spiral', 'scythe', 'warp', 'homing', 'rain:curse', 'ring'], moves2: ['spiral3', 'cross', 'warp', 'triple', 'rain:curse', 'scythe'] },
    dragon: { name: 'えんりゅう', hp: 2080, atk: 41, def: 9, r: 44, exp: 1150, gold: 1300, col: '#ff6a3a', song: 'rave', key: 4, bpm: 142,
      moves: ['breath', 'fireball', 'tail', 'charge', 'rain:meteor'], moves2: ['breath', 'dash3', 'wave', 'mines', 'rain:meteor', 'tail', 'fireball'] },
    icequeen: { name: 'こおりの女王', hp: 2640, atk: 49, def: 13, r: 38, exp: 1600, gold: 1800, col: '#9fe8ff', song: 'c13', key: 7, bpm: 140,
      moves: ['gapring', 'laser3', 'rain:ice', 'spiral', 'wave'], moves2: ['cross', 'triple', 'homing', 'rain:ice', 'laser3', 'gapring'] },
    thunderbird: { name: 'サンダーバード', hp: 4950, atk: 75, def: 16, r: 42, exp: 2200, gold: 2400, col: '#ffe14a', song: 'c13', key: 9, bpm: 144,
      moves: ['rain:bolt', 'dash3', 'wave', 'aimed5', 'laser'], moves2: ['rain:bolt', 'cross', 'homing', 'dash3', 'triple', 'laser3'] },
    deathknight: { name: 'デスナイト', hp: 3200, atk: 61, def: 20, r: 40, exp: 3000, gold: 3200, col: '#6a6f8a', song: 'c15', key: 9, bpm: 144,
      moves: ['twin', 'dash3', 'ringaimed', 'quake', 'sweep'], moves2: ['cross', 'mines', 'laser3', 'twin', 'dash3', 'quake'] },
    kraken: { name: 'クラーケン', hp: 8990, atk: 113, def: 24, r: 46, exp: 3900, gold: 4200, col: '#a85ad8', song: 'c13', key: 5, bpm: 144,
      moves: ['tentacles', 'rain:ink', 'wave', 'homing', 'gapring'], moves2: ['tentacles', 'cross', 'rain:ink', 'triple', 'dash3', 'wave'] },
    pharaoh: { name: 'ファラオ', hp: 8600, atk: 109, def: 27, r: 40, exp: 5000, gold: 5400, col: '#f2c14e', song: 'rave', key: 4, bpm: 146,
      moves: ['rain:sand', 'laser3', 'summon', 'warp', 'gapring'], moves2: ['cross', 'rain:sand', 'laser3', 'homing', 'warp', 'triple'] },
    clockmachine: { name: 'クロックマシン', hp: 6890, atk: 97, def: 30, r: 44, exp: 6300, gold: 6800, col: '#d8b070', song: 'c20', key: 7, bpm: 148,
      moves: ['clock', 'mines', 'triple', 'dash3', 'spiral'], moves2: ['clock', 'cross', 'mines', 'spiral3', 'dash3', 'gapring'] },
    voideye: { name: 'ヴォイドアイ', hp: 11820, atk: 130, def: 32, r: 44, exp: 7800, gold: 8400, col: '#c86bff', song: 'c15', key: 9, bpm: 148,
      moves: ['laser3', 'homing', 'spiral3', 'warp', 'rain:void', 'gapring'], moves2: ['cross', 'laser3', 'homing', 'spiral3', 'warp', 'triple', 'rain:void'] },
    cerberus: { name: 'ケルベロス', hp: 13160, atk: 142, def: 34, r: 48, exp: 9600, gold: 10000, col: '#c8402a', song: 'c15', key: 2, bpm: 150,
      moves: ['breath3', 'dash3', 'rain:meteor', 'quake', 'fireball'], moves2: ['breath3', 'dash3', 'rain:meteor', 'mines', 'tail', 'wave'] },
    hydra: { name: 'ヒュドラ', hp: 19090, atk: 174, def: 40, r: 48, col: '#5aa83a', wcol: '#4a9a3a', fcol: 'poison',
      moves: ['breath3', 'rain:poison', 'tentacles', 'homing', 'gapring'], moves2: ['breath3', 'rain:poison', 'tentacles', 'cross', 'dash3', 'triple'] },
    ghostcaptain: { name: 'ゆうれいせんちょう', hp: 22760, atk: 197, def: 43, r: 40, col: '#7ad8c8', wcol: '#c8e8ff', ocol: '120,255,200',
      moves: ['sweep', 'aimed5', 'rain:curse', 'warp', 'wave', 'summon'], moves2: ['sweep', 'cross', 'rain:curse', 'warp', 'triple', 'aimed5'] },
    cyclops: { name: 'サイクロプス', hp: 25430, atk: 178, def: 46, r: 50, col: '#c89a6a', wcol: '#8a6a40',
      moves: ['sweep', 'rocks', 'quake', 'laser', 'charge', 'jump'], moves2: ['sweep', 'rocks', 'quake', 'laser3', 'dash3', 'jump'] },
    archmage: { name: 'だいまどうし', hp: 20890, atk: 194, def: 49, r: 36, col: '#5a7aff', ocol: '140,170,255',
      moves: ['spiral3', 'laser3', 'warp', 'homing', 'rain:bolt', 'summon'], moves2: ['spiral3', 'cross', 'warp', 'homing', 'rain:ice', 'triple', 'rain:meteor'] },
    quetzal: { name: 'ケツァルコアトル', hp: 28980, atk: 210, def: 52, r: 44, col: '#3ad8a0', wcol: '#3ad8a0',
      moves: ['wave', 'dash3', 'rain:bolt', 'homing', 'tail', 'gapring'], moves2: ['wave', 'dash3', 'rain:bolt', 'cross', 'tail', 'spiral3'] },
    colossus: { name: 'くろがねの巨兵', hp: 20490, atk: 194, def: 56, r: 50, col: '#8a9aaa', wcol: '#a0a8b8', ocol: '255,170,80',
      moves: ['quake', 'laser3', 'rocks', 'mines', 'charge', 'twin'], moves2: ['quake', 'laser3', 'mines', 'dash3', 'clock', 'rocks'] },
    shadowhero: { name: 'かげの勇者', hp: 22750, atk: 210, def: 58, r: 34, col: '#6a5a9a', wcol: '#8a6aff', ocol: '170,120,255',
      moves: ['dash3', 'twin', 'aimed5', 'warp', 'charge', 'gapring'], moves2: ['dash3', 'twin', 'cross', 'warp', 'triple', 'laser3'] },
    leviathan: { name: 'リヴァイアサン', hp: 41100, atk: 308, def: 61, r: 50, col: '#3a7ad8', wcol: '#3a8ad8', fcol: 'water', ocol: '120,200,255',
      moves: ['tentacles', 'breath', 'rain:water', 'wave', 'homing'], moves2: ['tentacles', 'breath3', 'rain:water', 'cross', 'dash3', 'wave'] },
    bonedragon: { name: 'ボーンドラゴン', hp: 48890, atk: 291, def: 64, r: 48, col: '#e8e2cf', wcol: '#d8d0b8', fcol: 'ghost', ocol: '140,255,200',
      moves: ['breath', 'tail', 'rain:curse', 'quake', 'homing', 'fireball'], moves2: ['breath3', 'tail', 'rain:curse', 'cross', 'dash3', 'fireball'] },
    demongeneral: { name: 'まぐんしょうぐん', hp: 26040, atk: 268, def: 67, r: 44, col: '#c83a3a', wcol: '#ff4a3a',
      moves: ['twin', 'dash3', 'rain:meteor', 'laser3', 'sweep', 'summon'], moves2: ['twin', 'dash3', 'rain:meteor', 'cross', 'mines', 'laser3', 'triple'] },
    fenrir: { name: 'フェンリル', hp: 52000, atk: 330, def: 75, r: 50, col: '#cfe8ff', wcol: '#bfe0ff', fcol: 'water', ocol: '170,230,255',
      moves: ['dash3', 'breath', 'rain:ice', 'gapring', 'homing'], moves2: ['dash3', 'breath3', 'rain:ice', 'cross', 'triple'] },
    nightmare: { name: 'ナイトメア', hp: 48000, atk: 345, def: 78, r: 48, col: '#7a3ab0', wcol: '#d080ff', fcol: 'ghost', ocol: '210,130,255',
      moves: ['charge', 'spiral', 'homing', 'wave', 'warp'], moves2: ['dash3', 'charge', 'homing', 'cross', 'warp', 'wave'] },
    gorgon: { name: 'ゴルゴーン', hp: 48000, atk: 360, def: 81, r: 46, col: '#5aa86a', wcol: '#7ad86a', fcol: 'poison', ocol: '170,255,140',
      moves: ['aimed5', 'tentacles', 'rain:poison', 'homing', 'gapring'], moves2: ['aimed5', 'tentacles', 'rain:poison', 'cross', 'homing', 'gapring'] },
    fallenangel: { name: 'だてんし', hp: 46000, atk: 380, def: 84, r: 44, col: '#e8e0ff', wcol: '#fff2b0', ocol: '255,240,180',
      moves: ['twin', 'laser3', 'homing', 'warp', 'aimed5'], moves2: ['twin', 'cross', 'laser3', 'aimed5', 'warp', 'gapring'] },
    hakaishin: { name: 'はかいしん', hp: 44000, atk: 368, def: 90, r: 54, col: '#a03aff', wcol: '#ff4a9a', fcol: 'ghost', ocol: '255,90,210', song: 'M', key: 2, bpm: 158, rage: 1.4,
      moves: ['wave', 'laser3', 'rain:void', 'twin', 'homing', 'gapring', 'despair'], moves2: ['cross', 'spiral3', 'rain:meteor', 'mines', 'warp', 'despair', 'tentacles'] },
    sandworm: { name: 'サンドワーム', hp: 60000, atk: 402, def: 101, r: 40, col: '#c89050', wcol: '#c89050', ocol: '240,200,130',
      moves: ['sandspit', 'slither', 'rocks', 'quake', 'gapring'], moves2: ['sandspit', 'slither', 'rocks', 'quake', 'triple', 'slither'] },
    gigacrab: { name: 'ギガクラブ', hp: 57000, atk: 410, def: 103, r: 50, col: '#e0582a', wcol: '#e86030', ocol: '200,240,255',
      moves: ['sidestep', 'bubbles', 'clawspin', 'bubbleshield', 'aimed5'], moves2: ['sidestep', 'bubbles', 'clawspin', 'bubbleshield', 'gapring', 'sidestep'] },
    raijin: { name: 'らいじん', hp: 62000, atk: 419, def: 106, r: 44, col: '#3a8aa0', wcol: '#fff6a0', ocol: '255,240,140',
      moves: ['thunderdash', 'chainbolt', 'rain:bolt', 'gapring', 'homing'], moves2: ['thunderdash', 'chainbolt', 'rain:bolt', 'cross', 'triple', 'homing'] },
    demonhands: { name: 'まじんのて', hp: 57000, atk: 428, def: 108, r: 40, col: '#5a1a6a', ocol: '220,140,255',
      moves: ['slam', 'fingerlaser', 'grab', 'flick', 'homing'], moves2: ['slam', 'fingerlaser', 'grab', 'flick', 'spiral3', 'slam'] },
    skywhale: { name: 'そらくじら', hp: 60000, atk: 436, def: 110, r: 34, col: '#24427a', ocol: '255,230,120', rage: 1.4,
      moves: ['inhale', 'rain:water', 'tailslam', 'swimby', 'starsong'], moves2: ['inhale', 'rain:water', 'tailslam', 'swimby', 'starsong', 'triple'] },
    maou: { name: 'まおう', hp: 27300, atk: 251, def: 72, r: 42, exp: 15000, gold: 15000, col: '#c04cff', song: 'M', key: 2, bpm: 150, rage: 1.45,
      moves: ['twin', 'spiral3', 'rain:meteor', 'warp', 'homing', 'laser3', 'gapring', 'clock'], moves2: ['cross', 'triple', 'rain:void', 'warp', 'dash3', 'mines', 'laser3', 'twin', 'spiral3', 'breath3'] },
  };

  // the signature shows up in both phases (twice in phase 2), so every fight has its own centrepiece
  for (const k in SIG) { const B = BOSSES[k], m = SIG[k][0]; B.moves = B.moves.concat([m]); B.moves2 = B.moves2.concat([m, m]); }

  // CRAFTING BEGIN — assembled from tools/crafting/runtime.inc.js; catalogue in crafting.js.
  const CRAFT = window.CRAFT_DATA, craftRecipes = {}, craftMats = CRAFT.materials;
  const craftStageFor = id => { const m=craftMats[id]; if(m.boss)return Math.max(0,DUNGEONS.findIndex(d=>d.boss===m.boss));const types=Object.keys(CRAFT.enemy).filter(t=>CRAFT.enemy[t].common.includes(id)||CRAFT.enemy[t].special.includes(id));const n=DUNGEONS.findIndex(d=>types.some(t=>d.pool[t]));return n<0?0:n; };
  for(const raw of CRAFT.recipes){
    const r={...raw,req:{...raw.req}},stage=r.boss?DUNGEONS.findIndex(d=>d.boss===r.boss):Math.max(...Object.keys(r.req).map(craftStageFor));r.stage=Math.max(0,stage);
    const w=EQ['w'+DROP_WT[r.stage]],a=EQ['a'+DROP_AT[r.stage]];
    r.fee=r.slot==='item'?Math.max(30,Math.round(w.price*.015)):Math.max(300,Math.round(w.price*(r.boss?1.5:1)));
    if(r.slot==='tool')r.fee=50000;
    craftRecipes[r.id]=r;
    if(r.slot==='item'){ITEMS['craft_'+r.id]={name:r.name,carry:r.id==='p05'?1:3,price:0,craft:r.id,note:r.note};continue;}
    if(r.slot==='tool')continue;
    const key='craft_'+r.id;FX[key]={v:1,name:r.name,note:r.note};
    const e={id:key,slot:r.slot,name:r.name,price:0,craft:r.id,fx:{[key]:1},val:0};
    if(r.slot==='weapon'){e.atk=Math.max(1,Math.round(w.atk*.85));e.vis=w.id;}
    if(r.slot==='armor'){e.def=Math.max(1,Math.round(a.def*.85));e.vis=a.id;}
    if(r.slot==='boots'){e.ram=+(1+Math.min(.7,r.stage*.022)).toFixed(2);e.vis='b'+Math.min(7,Math.floor(r.stage/4));}
    if(r.slot==='charm'){e.hp=20+r.stage*12;e.vis='c1';}
    EQUIP.push(e);EQ[e.id]=e;
  }
  let runMaterials={},craftDirty=0;
  function craftNormalize(){
    if(!save.materials||typeof save.materials!=='object'||Array.isArray(save.materials))save.materials={};
    for(const k of Object.keys(save.materials)){const n=save.materials[k];if(!craftMats[k]||!Number.isSafeInteger(n)||n<0)delete save.materials[k];else save.materials[k]=Math.min(999999,n);}
    save.craftTools=Array.isArray(save.craftTools)?save.craftTools.filter(x=>x==='f12'):[];
    save.craftCount=Number.isSafeInteger(save.craftCount)&&save.craftCount>=0?save.craftCount:0;
    save.craftSeed=Number.isSafeInteger(save.craftSeed)?save.craftSeed>>>0:2152026;
    save.craftSkills=Array.isArray(save.craftSkills)?save.craftSkills.filter(x=>save.skills.includes(x)).slice(0,2):[];
  }
  const craftHave=k=>Number.isSafeInteger(save.materials&&save.materials[k])?save.materials[k]:0;
  const craftOwned=r=>r.slot==='tool'?save.craftTools.includes(r.id):r.slot!=='item'&&save.owned.includes('craft_'+r.id);
  const craftOpen=r=>r.stage===0||!!save.cleared[r.stage-1];
  function craftCanMake(r,n=1){return !!r&&state==='town'&&Number.isInteger(n)&&n>=1&&n<=10&&craftOpen(r)&&!craftOwned(r)&&save.gold>=r.fee*n&&Object.entries(r.req).every(([k,v])=>craftHave(k)>=v*n)&&(r.slot!=='item'||(save.items['craft_'+r.id]||0)+n<=ITEM_MAX);}
  function craftMake(id,n=1){
    const r=craftRecipes[id];if(!r||!craftCanMake(r,n))return false;
    const before={gold:save.gold,materials:{...save.materials},owned:save.owned.slice(),items:{...save.items},tools:save.craftTools.slice(),count:save.craftCount};
    save.gold-=r.fee*n;for(const[k,v]of Object.entries(r.req))save.materials[k]-=v*n;
    if(r.slot==='item')save.items['craft_'+id]=(save.items['craft_'+id]||0)+n;else if(r.slot==='tool')save.craftTools.push(id);else save.owned.push('craft_'+id);
    save.craftCount+=n;
    try{localStorage.setItem('bumphero_save',JSON.stringify(save));}
    catch(e){Object.assign(save,{gold:before.gold,materials:before.materials,owned:before.owned,items:before.items,craftTools:before.tools,craftCount:before.count});toast('保存できませんでした。素材は消費していません。','#ff9a8a');return false;}
    guildCraft(id);toast(r.name+' を合成した！','#f2c14e');A.sfx('chest');return true;
  }
  function craftRand(){save.craftSeed=(Math.imul(save.craftSeed,1664525)+1013904223)>>>0;return save.craftSeed/4294967296;}
  function craftGain(k,n=1){if(!craftMats[k]||!Number.isSafeInteger(n)||n<=0)return;bestObtain('mat:'+k);const old=craftHave(k);save.materials[k]=Math.min(999999,old+n);const gained=save.materials[k]-old;if(!gained)return;guildMaterial(k,gained);runMaterials[k]=(runMaterials[k]||0)+gained;craftDirty=1;if(hero)popText(hero.x,hero.y+64,craftMats[k].name+' +'+gained,'#b3e2be',11,.7);}
  function craftDropEnemy(e){if(e.craftDropped)return;e.craftDropped=true;const d=CRAFT.enemy[e.type];if(!d)return;if(craftRand()<.7){const k=d.common[Math.floor(craftRand()*d.common.length)];craftGain(k,craftRand()<.25?2:1);}for(const k of d.special)if(craftRand()<(e.type==='goldslime'||e.type==='goldscorpion'?1:.25))craftGain(k);}
  function craftDropBoss(B){if(B.craftDropped)return;B.craftDropped=true;const id=DUNGEONS[dIdx].boss,k=Object.keys(craftMats).find(k=>craftMats[k].boss===id);if(k)craftGain(k);if(id==='treant'){craftGain('m20',3);craftGain('m09',2);}persist();}
  function craftLootHtml(){const ks=Object.keys(runMaterials);return ks.length?'<p class="craft-intro">てにいれた素材（敗北しても残ります）</p><div class="craft-tags">'+ks.map(k=>'<span>'+craftArtImg('material',k,24)+craftMats[k].name+' ×'+runMaterials[k]+'</span>').join('')+'</div>':'';}
  const craftArtCache={};
  function craftArtImg(kind,id,sz=32){const key=kind+':'+id;const src=craftArtCache[key]||(craftArtCache[key]=(kind==='material'?InventoryArt.material(id):InventoryArt.equipment({craft:id})).c.toDataURL());return `<img class="craft-art" src="${src}" width="${sz}" height="${sz}" alt="">`;}
  let craftTab='all';
  function craftBind(sel,fn,sound='select'){panelBody.querySelectorAll(sel).forEach(b=>b.addEventListener('click',()=>{if(b.disabled)return;if(sound)A.sfx(sound);fn(b);}));}
  function openCraftShop(){
    facilitySelect('craft','make');
    craftNormalize();
    const labels={all:'すべて',weapon:'ぶき',armor:'よろい',boots:'くつ',charm:'装飾品',item:'どうぐ',tool:'恒久道具'};
    const list=Object.values(craftRecipes).filter(r=>craftTab==='all'||r.slot===craftTab);
    openPanel('合成屋',`<div class="craft-head"><span>${save.gold.toLocaleString()} G</span></div><div class="tabs craft-tabs">${Object.entries(labels).map(([id,n])=>`<button data-ct="${id}" aria-pressed="${craftTab===id}">${n}</button>`).join('')}</div>`+list.map(r=>`<button class="craft-card" data-recipe="${r.id}"><span class="craft-symbol">${craftArtImg('equipment',r.id,40)}</span><span><b>${r.name}</b><small>${SLOT_NAME[r.slot]|| (r.slot==='tool'?'恒久道具':'どうぐ')}</small><em>${craftOwned(r)?'作成済み':!craftOpen(r)?'解放：'+DUNGEONS[r.stage].name+' に到達':craftCanMake(r)?'合成できます':r.fee.toLocaleString()+' G・素材が必要'}</em></span><span aria-hidden="true">›</span></button>`).join(''),[['店を出る',closePanel]],'craft');
    craftBind('[data-ct]',b=>{craftTab=b.dataset.ct;openCraftShop();});craftBind('[data-recipe]',b=>openCraftRecipe(b.dataset.recipe));craftBind('[data-materials]',()=>openCraftMaterials());
  }
  function openCraftRecipe(id,n=1){
    const r=craftRecipes[id];if(!r)return;n=Math.max(1,Math.min(10,Math.floor(n)||1));if(r.slot!=='item')n=1;
    const item=EQ['craft_'+id],owned=craftOwned(r),can=craftCanMake(r,n);
    openPanel(r.name,`<div class="craft-detail-art">${craftArtImg('equipment',id,64)}</div>${facilityDetail(r.name,[r.note])}${item?'<p>'+eqStats(item)+'</p>':''}<p class="craft-intro">${r.slot==='item'?'所持 '+(save.items['craft_'+id]||0)+' / '+ITEM_MAX:r.slot==='tool'?'恒久道具':''}</p>${!craftOpen(r)?'<p class="hpc">解放条件：'+DUNGEONS[r.stage].name+' に到達</p>':''}<h3>必要な素材 ${n>1?'×'+n:''}</h3>`+Object.entries(r.req).map(([k,v])=>`<button class="craft-material" data-source="${k}">${craftArtImg('material',k)}<span class="craft-material-name">${craftMats[k].name}<small>入手先を確認 ›</small></span><b class="${craftHave(k)<v*n?'hpc':'craft-ready'}">${craftHave(k)} / ${v*n}</b></button>`).join('')+`<p class="craft-cost ${save.gold<r.fee*n?'hpc':''}">製作費 ${r.fee*n} G / 所持 ${save.gold} G</p>${r.slot==='item'?`<div class="craft-count"><button class="sbtn" data-count="${n-1}" ${n<=1?'disabled':''}>−</button><b>作る数 ${n}</b><button class="sbtn" data-count="${n+1}" ${n>=10?'disabled':''}>＋</button></div>`:''}${owned?'<p class="gold">作成済み</p>':''}<button class="btn primary craft-make" data-make ${can?'':'disabled'}>${owned?'作成済み':can?'合成する':'素材・ゴールド・解放条件を確認'}</button>`,[['もどる',openCraftShop]],'craft');
    craftBind('[data-source]',b=>openCraftSource(b.dataset.source,()=>openCraftRecipe(id,n)));craftBind('[data-count]',b=>openCraftRecipe(id,+b.dataset.count));craftBind('[data-make]',()=>{if(craftMake(id,n))openCraftRecipe(id,n);},null);
    if(id==='b18'&&(owned||forgeHasEffect('craft_b18'))){const b=document.createElement('button');b.className='btn';b.textContent='二つのスキルを選ぶ';b.addEventListener('click',()=>{A.sfx('select');openCraftSkills();});panelFoot.appendChild(b);}
    if(id==='f12'&&owned){const b=document.createElement('button');b.className='btn';b.textContent='素材を交換する';b.addEventListener('click',()=>{A.sfx('select');openCraftExchange();});panelFoot.appendChild(b);}
  }
  function openCraftSource(k,back=()=>openCraftMaterials(),room='craft'){
    const m=craftMats[k];if(!m)return;openPanel(m.name,`<div class="craft-detail-art">${craftArtImg('material',k,64)}</div><p>所持数：${craftHave(k)}</p><h3>入手先</h3><div class="ui-source-grid">${uiSourceEntries(k).map(uiMonsterCard).join('')}</div>`,[['もどる',back]],room);
    uiBindEnemies(()=>openCraftSource(k,back,room),room);
  }

  function openCraftMaterials({room='craft',back=openCraftShop,ownedOnly=false}={}){
    facilitySelect(room,'materials');
    const reopen=only=>openCraftMaterials({room,back,ownedOnly:only}),list=Object.entries(craftMats).filter(([k])=>!ownedOnly||craftHave(k)>0);
    openPanel('素材袋',`<div class="tabs craft-tabs"><button data-material-filter="owned" aria-pressed="${ownedOnly}">所持している素材</button><button data-material-filter="all" aria-pressed="${!ownedOnly}">すべての素材</button></div>`+(list.length?list.map(([k,m])=>`<button class="craft-material" data-source="${k}">${craftArtImg('material',k)}<span class="craft-material-name">${m.name}<small>${m.kind==='boss'?'ボス専用':m.kind==='special'?'特徴素材':'共通素材'}</small></span><b>×${craftHave(k)}</b></button>`).join(''):'<p class="craft-intro">所持素材はありません。</p>')+forgeCrystalBagHtml(ownedOnly),[[room==='house'?'勇者の家へ':'合成屋へ',back]],room);
    craftBind('[data-forge-crystal]',()=>openForgeCrystal(()=>reopen(ownedOnly),room));craftBind('[data-material-filter]',b=>reopen(b.dataset.materialFilter==='owned'));craftBind('[data-source]',b=>openCraftSource(b.dataset.source,()=>reopen(ownedOnly),room));
  }
  function craftExchange(a,b){if(state!=='town'||!save.craftTools.includes('f12')||a===b||craftMats[a]?.kind!=='common'||craftMats[b]?.kind!=='common'||craftHave(a)<10||craftHave(b)>=999999)return false;const old={...save.materials};save.materials[a]-=10;save.materials[b]=Math.min(999999,craftHave(b)+1);try{localStorage.setItem('bumphero_save',JSON.stringify(save));return true;}catch{save.materials=old;return false;}}
  function openCraftExchange(from='m01'){facilitySelect('craft','exchange');if(!save.craftTools.includes('f12'))return;const common=Object.entries(craftMats).filter(([k,m])=>m.kind==='common');openPanel('黄金の錬成器',`<h3>渡す素材</h3><div class="tabs craft-tabs">${common.map(([k,m])=>`<button data-from="${k}" aria-pressed="${from===k}">${craftArtImg('material',k,24)}${m.name} ×${craftHave(k)}</button>`).join('')}</div><h3>受け取る素材</h3>`+common.filter(([k])=>k!==from).map(([k,m])=>`<button class="craft-material" data-exchange="${k}" ${craftHave(from)<10?'disabled':''}>${craftArtImg('material',k)}<span class="craft-material-name">${m.name} ×1 ← ${craftMats[from].name} ×10</span></button>`).join(''),[['もどる',()=>openCraftRecipe('f12')]],'craft');craftBind('[data-from]',b=>openCraftExchange(b.dataset.from));craftBind('[data-exchange]',b=>{if(craftExchange(from,b.dataset.exchange)){A.sfx('buy');openCraftExchange(from);}},null);}
  function openCraftSkills(){facilitySelect('craft','dual');if(!save.owned.includes('craft_b18')&&!forgeHasEffect('craft_b18'))return;craftNormalize();const known=save.skills.filter(k=>SKILLS[k]);openPanel('双術環のスキル',``+known.map(id=>`<button class="craft-material" data-dual="${id}">${SKILLS[id].name}<b>${save.craftSkills.includes(id)?'選択中':'選ぶ'}</b></button>`).join(''),[['もどる',()=>openCraftRecipe('b18')]],'craft');craftBind('[data-dual]',b=>{const id=b.dataset.dual;if(save.craftSkills.includes(id))save.craftSkills=save.craftSkills.filter(k=>k!==id);else{if(save.craftSkills.length>=2)save.craftSkills.shift();save.craftSkills.push(id);}persist();openCraftSkills();});}
  // Equipped effects. Proc damage never recursively triggers another craft proc.
  function craftHas(id){return !!(hero&&hero.s.fx['craft_'+id]);}
  function craftState(){return hero&&(hero.craft||(hero.craft={clock:0,cd:{},pending:[],visual:[],shots:[],skillUntil:{},dual:0,rollId:0,heat:0,stars:0,bones:0,beats:0,stored:0,shield:0,scales:0}));}
  function craftReady(k,seconds){const c=craftState();if(!c||c.cd[k]>c.clock)return false;c.cd[k]=c.clock+seconds;return true;}
  const CRAFT_TORNADO_TURN=.5,CRAFT_TORNADO_CD=4;
  // A curved flick carries its arc into the roll after the finger leaves the screen.
  function craftFlickStart(){drag.curve=craftHas('b19')?{x:drag.px,y:drag.py,first:null,last:null,turn:0,peak:0}:null;}
  function craftFlickMove(){
    const p=drag.curve;if(!p||!craftHas('b19'))return;
    const dx=drag.px-p.x,dy=-(drag.py-p.y);if(hyp(dx,dy)<8)return;
    const a=Math.atan2(dy,dx);if(p.first==null)p.first=a;
    if(p.last!=null){p.turn+=Math.atan2(Math.sin(a-p.last),Math.cos(a-p.last));if(Math.abs(p.turn)>Math.abs(p.peak))p.peak=p.turn;}
    p.last=a;p.x=drag.px;p.y=drag.py;
  }
  const craftCurvedFlick=()=>craftHas('b19')&&drag.curve?.first!=null&&Math.abs(drag.curve.peak)>=CRAFT_TORNADO_TURN;
  function craftFlickRoll(dx,dy){
    const p=drag.curve,curved=craftCurvedFlick();
    if(!curved)return startRoll(dx,dy);
    const ok=startRoll(Math.cos(p.first),-Math.sin(p.first));
    if(ok)craftState().rollCurve=clamp(p.peak,-Math.PI/2,Math.PI/2);
    return ok;
  }
  let craftBusy=0,craftOrigin=null;
  function craftLive(t){return !!(t&&!t.dead&&!t.sub&&t.hp>0&&(t.alpha==null||t.alpha>=.5)&&!(isBoss(t)&&(t.shield||t.intro>0)));}
  function craftVisual(x,y,x2,y2,col='#b8e8ff',life=.35){const c=craftState();if(c){c.visual.push({x,y,x2,y2,col,life,max:life});if(c.visual.length>50)c.visual.shift();}}
  function craftHit(t,m,x=hero.x,y=hero.y,power=120,col='#b8e8ff',origin=null,meta=null){if(!craftLive(t)||m<=0||!arenaAttackAllowed(t,origin||'craft'))return 0;const before=t.hp,previousOrigin=craftOrigin;craftOrigin={kind:origin||'craft',meta};craftBusy++;try{craftVisual(x,y,t.x,t.y,col);skillHit(t,m,x,y,isBoss(t)?0:power,col);}finally{craftBusy--;craftOrigin=previousOrigin;}const dealt=Math.max(0,before-t.hp);if(origin&&dealt>0)arenaEvent(origin,1,t,meta);return dealt;}
  function craftArea(x,y,r,m,power=150,col='#b8e8ff',except=null,origin=null,meta=null){for(const t of targetsNear(x,y,r).filter(craftLive).slice(0,16))if(t!==except)craftHit(t,m,x,y,power,col,origin,meta);}
  function craftLater(sec,fn){const c=craftState();if(c&&c.pending.length<24)c.pending.push({at:c.clock+sec,fn});}
  function craftNearest(x,y,R=250){return targetsNear(x,y,R).filter(craftLive).sort((a,b)=>hyp(a.x-x,a.y-y)-hyp(b.x-x,b.y-y))[0];}
  function craftSlow(t,sec){if(!craftLive(t))return;if(isBoss(t)){craftHit(t,.12);return;}t.craftSlow=Math.min(2,Math.max(t.craftSlow||0,sec));}
  function craftSleep(t,sec,origin=null,meta=null){if(!craftLive(t))return;if(isBoss(t)){craftHit(t,.15);return;}const c=craftState();if((t.craftSleepUntil||0)>c.clock)return;t.craftSleep=sec;t.craftSleepUntil=c.clock+sec+4;t.vx*=.2;t.vy*=.2;if(origin)arenaEvent(origin,1,t,meta);}
  function craftPull(x,y,r,power){for(const t of targetsNear(x,y,r).filter(t=>!isBoss(t)&&craftLive(t))){const d=hyp(x-t.x,y-t.y)||1;t.vx+=(x-t.x)/d*power;t.vy+=(y-t.y)/d*power;craftVisual(x,y,t.x,t.y,'#d9d6ed');}}
  function craftShot(x,y,a,m,col='#b8e8ff',speed=320,origin=null,meta=null){const c=craftState();if(c&&c.shots.length<24)c.shots.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,m,col,origin,meta,life:1.5});}
  function craftClearBullets(radius,mode='clear',max=6){
    const h=hero,c=craftState();let n=0;if(!h)return 0;
    for(const b of bullets){if(n>=max)break;if(b.life<=0||b.harmless||b.pierce||hyp(b.x-h.x,b.y-h.y)>radius+(b.r||0))continue;b.life=0;n++;
      if(mode==='reflect')craftShot(b.x,b.y,Math.atan2(-b.vy,-b.vx),.65,'#e8f4ff',320,'reflect');
      else if(mode==='store')c.absorb=Math.min(3,(c.absorb||0)+1);
      else if(mode==='star'){const t=craftNearest(h.x,h.y);if(t)craftShot(h.x,h.y,Math.atan2(t.y-h.y,t.x-h.x),.45,'#ffe8a0');}
      craftVisual(h.x,h.y,b.x,b.y,'#c8e8ff');
    }return n;
  }
  function craftPerfect(){const c=craftState();if(!c||!craftReady('perfect',.35))return;c.perfectAt=c.clock;pfxEmit('impacts/parry',hero.x,hero.y,100,.35);if(craftHas('b09'))c.riposte=1;if(craftHas('b33'))c.beats=Math.min(3,c.beats+1);}
  function craftDamageAdjust(d,fromX,fromY,power,cause){
    const h=hero,c=craftState();if(!c)return {d,power};
    if(c.coffin>0)return {d:0,power:0};
    if(c.steel>0)power*=.2;
    if(craftHas('b20')&&/touch:|boss/.test(cause))c.stored=Math.min(h.s.atk*4,c.stored+d*.5);
    if(craftHas('b25')&&!/zone:poison|poison/.test(cause))c.vengeance=Math.min(h.s.maxHp*.5,(c.vengeance||0)+d*.45);
    if(craftHas('b02')&&c.shield>0){const cut=Math.min(c.shield,d);d-=cut;c.shield-=cut;}
    if(craftHas('b15')&&c.scales>0){c.scales--;d*=.6;}
    if(craftHas('b07')){if(c.iceShields>0){c.iceShields--;d*=.65;craftArea(h.x,h.y,65,.25,100,'#b0e8ff');}else if(craftReady('iceShields',35))c.iceShields=3;}
    if(craftHas('b11')&&h.hp-d<=h.s.maxHp*.2&&!c.coffinUsed){c.coffinUsed=true;c.coffin=2;h.inv=Math.max(h.inv,2);h.recoil=0;return {d:0,power:0};}
    if(craftHas('b26'))c.hunt=0;
    return {d:Math.max(0,Math.round(d)),power};
  }
  // Presentation only: read the real effect counters, including inherited effects.
  // No random draws, damage, hit stop or shared cooldowns are changed by feedback.
  function craftGauges(){
    const h=hero;if(!h)return[];const c=h.craft||{},rows=[],t=craftLive(c.lastTarget)?c.lastTarget:null;
    const add=(id,label,value,max,col,ready=value>=max,text)=>{if(craftHas(id))rows.push({id,label,value:clamp(value||0,0,max),max,col,ready:!!ready,text});};
    add('f01','火種→スキル',t?.craftFire||0,3,'#ffad50');
    add('b03','大槌→衝撃',combo%3,3,'#ffc980');
    add('b06','蓄熱→突進',c.heat,1,'#ff9650');
    add('b08','充電→回避',c.charge,1,'#fff080');
    add('b09','返し刃→突進',c.riposte,1,'#d9a0ff');
    add('b12','待機→スキル',h.skCD>0?0:c.readyAt==null?0:Math.min(3,c.clock-c.readyAt),3,'#e8d494');
    add('b13','吸弾→スキル',c.absorb,3,'#b8a0ff');
    add('b14','方向印→追撃',t?.craftDirections?.size||0,3,'#ffb080');
    if(craftHas('b19')){const wait=Math.max(0,(c.cd?.tornado||0)-(c.clock||0)),turn=Math.min(1,Math.max(Math.abs(c.turn||0),c.turnPeak||0)/CRAFT_TORNADO_TURN);if(wait>0)add('b19','竜巻：待ち',CRAFT_TORNADO_CD-wait,CRAFT_TORNADO_CD,'#90e0c0',false,Math.ceil(wait)+'秒');else add('b19',h.roll>0?'旋回→竜巻':'弧フリック',h.roll>0?turn:0,1,'#90e0c0',h.roll>0&&turn>=1,h.roll>0?(turn>=1?'発動OK':Math.floor(turn*100)+'％'):'曲げる');}
    add('b20','蓄力→突進',c.stored,h.s.atk*4,'#dac8a0');
    add('b24','双撃→スキル',c.cross,3,'#ff9a90',(c.cross||0)>=2);
    add('b25','反攻→スキル',c.vengeance,h.s.maxHp*.5,'#e098ef');
    add('b26','追跡',c.hunt,1,'#c8eeff');
    add('b30','亀裂→衝撃',t&&c.fractureTarget===t&&c.clock-c.fractureAt<=3?c.fracture:0,4,'#ff80d8');
    add('b33','拍→スキル',c.beats,3,'#fff2a0');
    return rows;
  }
  function craftHudRows(){return Math.ceil(craftGauges().length/2);}
  function craftDrawHud(){
    const rows=craftGauges();if(!rows.length)return;const top=safeTop()+62,w=Math.min((W-24)/2,220);
    rows.forEach((r,i)=>{const x=8+(i%2)*(w+8),y=top+Math.floor(i/2)*16,ratio=r.value/r.max,bx=x+68,bw=w-74;
      ctx.fillStyle='rgba(19,24,58,.92)';ctx.fillRect(x,y,w,14);txt(r.label,x+4,y+10,9,r.col,'left',false);
      ctx.fillStyle='#343747';ctx.fillRect(bx,y+3,bw,8);ctx.fillStyle=r.col;ctx.fillRect(bx,y+3,bw*ratio,8);
      ctx.strokeStyle=r.ready?'#fff4c0':'#a39981';ctx.lineWidth=1;ctx.strokeRect(bx,y+3,bw,8);
      const label=r.text??(r.max===1?(ratio>=1?'MAX':Math.floor(ratio*100)+'％'):r.max<=4?Math.floor(r.value)+'/'+r.max:Math.floor(ratio*100)+'％');
      txt(label,bx+bw/2,y+10,8,r.ready?'#fff9d8':'#ffffff','center',true);
    });
  }
  function craftFeedback(kind,x,y,label='',scale=1,angle=0){
    const c=craftState();if(!c)return;c.procs=c.procs||[];c.procs.push({kind,x,y,label,scale,angle,life:.48,max:.48});if(c.procs.length>16)c.procs.shift();
    const key=kind==='fire'?'craftFire':kind==='thunder'?'craftThunder':'craftBurst',last=c.feedbackSounds||(c.feedbackSounds={});
    if(last[key]==null||c.clock-last[key]>.12){last[key]=c.clock;A.sfx(key);}
  }
  function craftNotifyReady(){
    const c=hero?.craft;if(!c)return;const ready=c.feedbackReady||(c.feedbackReady={});
    for(const r of craftGauges()){if(r.ready&&!ready[r.id]&&(c.readySoundAt==null||c.clock-c.readySoundAt>.35)){c.readySoundAt=c.clock;pfxEmit('lightning/charge-up',hero.x,hero.y,85,.45);A.sfx('chargeReady');}ready[r.id]=r.ready;}
  }
  function craftDrawProcs(c){
    for(const p of c.procs||[]){const u=1-p.life/p.max,col=p.kind==='fire'?'#ff9850':p.kind==='thunder'?'#fff080':p.kind==='water'?'#80d8ff':'#d6a0ff',R=(8+u*46)*p.scale,x=p.x,y=sy(p.y);
      ctx.globalAlpha=(1-u)*.9;ctx.fillStyle=col;
      if(!pfxProc(p)){
      for(let i=0;i<12;i++){const a=i*Math.PI/6+p.angle,r=R*(i%2?1:.78),sz=Math.max(2,6*(1-u));ctx.fillRect(q(x+Math.cos(a)*r-sz/2),q(y+Math.sin(a)*r-sz/2),sz,sz);}
      ctx.strokeStyle=col;ctx.lineWidth=3*(1-u)+1;ctx.beginPath();ctx.arc(x,y,R*.68,0,Math.PI*2);ctx.stroke();
      if(u<.3){ctx.globalAlpha=(.3-u)*2;ctx.fillStyle='#fff7dc';ctx.fillRect(x-9*p.scale,y-9*p.scale,18*p.scale,18*p.scale);}
      }
      if(p.label){ctx.globalAlpha=Math.min(1,(1-u)*2);txt(p.label,x,y-26-u*14,11,col,'center');}
    }ctx.globalAlpha=1;
  }
  function craftOnHeal(total,actual,from='item'){if(actual>0&&hero)pfxEmit('holy/heal',hero.x,hero.y,80,.75);guildHeal(actual,from);const h=hero,c=craftState();if(!c)return;if(craftHas('b02')){c.shield=Math.min(h.s.maxHp*.3,c.shield+Math.max(0,total-actual));c.shieldLife=10;}if(craftHas('b15')&&from==='item')c.scales=Math.min(3,c.scales+1);if(craftHas('f08')&&from==='item')craftClearBullets(85,'clear',8);}
  function craftOnRam(t,damage){
    const h=hero,c=craftState();if(!c||craftBusy)return;const alive=craftLive(t),angle=Math.atan2(t.y-h.y,t.x-h.x);if(c.lastTarget!==t)c.hunt=0;c.lastTarget=t;c.lastTargetAt=c.clock;
    arenaEvent('ram',1,t);
    if(craftHas('b01')&&craftReady('rebound',6))c.rebound=.65;
    if(craftHas('b03')&&combo>=3&&combo%3===0&&!isBoss(t)&&alive){t.vx+=Math.cos(angle)*300;t.vy+=Math.sin(angle)*300;t.craftBowling={until:c.clock+1,hit:new Set()};craftFeedback('fire',t.x,t.y,'大槌衝撃');}
    if(craftHas('f01')&&alive)t.craftFire=Math.min(3,(t.craftFire||0)+1);
    if(craftHas('f04')&&alive){if(t.craftPoison>0){t.craftPoison=0;craftHit(t,.8);}else{t.craftPoison=3;t.craftPoisonTick=.5;}}
    if(t.craftSleep>0){t.craftSleep=0;if(craftHas('f05'))craftHit(t,.4,h.x,h.y,360);}
    if(craftHas('b05')&&c.echo&&craftReady('echoHit',1)){const e=c.echo;c.echo=null;craftLater(.18,()=>craftHit(t,.6,e.x,e.y,100,'#c8a0ff'));}
    if(craftHas('b06')&&c.heat>=1&&craftReady('flame',1.2)){c.heat=0;craftFeedback('fire',h.x+Math.cos(angle)*35,h.y+Math.sin(angle)*35,'蓄熱放出',1.2,angle);const landed=[];for(const o of targetsNear(h.x,h.y,130).filter(craftLive))if(Math.abs(Math.atan2(Math.sin(Math.atan2(o.y-h.y,o.x-h.x)-angle),Math.cos(Math.atan2(o.y-h.y,o.x-h.x)-angle)))<.6&&craftHit(o,.8,h.x,h.y,160,'#ff9a50')>0)landed.push(o);if(landed.length)arenaEvent('flame',1,landed);}
    if(craftHas('b09')&&c.riposte){c.riposte=0;if(alive)craftFeedback('magic',t.x,t.y,'返し刃');craftHit(t,.5+t.def/Math.max(1,h.s.atk)*.25,h.x,h.y,0,'#d9a0ff','riposte');}
    if(craftHas('b14')&&alive){const side=Math.round(angle/(Math.PI*2)*6+6)%6;t.craftDirections=t.craftDirections||new Set();t.craftDirections.add(side);if(t.craftDirections.size>=3&&craftReady('cerberus',5)){t.craftDirections.clear();craftFeedback('fire',t.x,t.y,'三頭の追撃');const cast={};for(let i=0;i<3;i++)craftLater(i*.12,()=>craftHit(t,.45,h.x,h.y,0,'#ff9a50','cerberus',{cast}));}}
    if(craftHas('b17')&&craftReady('heavy',1)){h.vx*=.5;h.vy*=.5;h.recoil=Math.min(h.recoil,.18);craftArea(t.x,t.y,75,.5,100,'#d8c8a0',t);}
    if(craftHas('b20')&&c.stored>0){const m=Math.min(2,c.stored/h.s.atk);c.stored=0;if(alive)craftFeedback('magic',t.x,t.y,'蓄力放出',1.1);craftHit(t,m);}
    if(craftHas('b21')&&c.shadow){const s=c.shadow;c.shadow=null;craftLater(.15,()=>craftHit(t,.65,s.x,s.y,150,'#a890ff'));}
    if(craftHas('b24')){const side=Math.cos(angle)>=0?1:-1;if(c.lastSide&&side!==c.lastSide)c.cross=Math.min(3,(c.cross||0)+1);else c.cross=0;c.lastSide=side;}
    if(craftHas('b29')){c.lightMode=c.lastAction==='skill'?!c.lightMode:c.lightMode;c.lastAction='ram';if(craftReady('lightDark',2)){if(c.lightMode)craftArea(t.x,t.y,85,.35,120,'#fff0b0',t);else craftHit(t,.45,h.x,h.y,0,'#b890ff');}}
    if(craftHas('b30')&&alive){if(c.fractureTarget!==t||c.clock-c.fractureAt>3){c.fractureTarget=t;c.fracture=0;}c.fractureAt=c.clock;if(++c.fracture>=4){c.fracture=0;craftFeedback('magic',t.x,t.y,'裂界衝撃',1.4);craftArea(t.x,t.y,100,1.4,220,'#ff80d8',null,'fracture',{quarry:t});}}
    if(craftHas('b32')&&alive&&!isBoss(t)&&craftReady('grab',8)){c.grab=t;t.craftSleep=1;t.craftSleepUntil=c.clock+6;craftVisual(h.x,h.y,t.x,t.y,'#ffb090');}
    else if(craftHas('b32')&&c.grab&&craftLive(c.grab)){const e=c.grab;c.grab=null;e.craftSleep=0;e.vx=Math.cos(angle)*450;e.vy=Math.sin(angle)*450;e.craftBowling={until:c.clock+1,hit:new Set()};}
    if(craftHas('f13')&&craftReady('scythe',2)){const x=h.x,y=h.y;craftLater(.3,()=>{craftVisual(x+Math.cos(angle)*100,y+Math.sin(angle)*100,x,y,'#d8f0a0');craftArea(x+Math.cos(angle)*70,y+Math.sin(angle)*70,70,.4,100,'#d8f0a0');});}
    if(c.finish>0&&t.dead&&craftReady('finish',.4)){c.finish--;const o=craftNearest(t.x,t.y,140);if(o)craftHit(o,.45,t.x,t.y);}
  }
  function craftOnKill(e){const c=craftState();if(!c||craftBusy)return;if(craftHas('b23'))c.bones=Math.min(5,c.bones+1);}
  function craftOnWall(e){if(e===hero||!craftLive(e))return;const c=craftState();if(c&&craftHas('f11')&&craftReady('wallbomb',2)){craftFeedback('fire',e.x,e.y,'導爆');craftArea(e.x,e.y,75,.65,160,'#ffad70',null,'wall',arenaWallMeta(e));}}
  function craftSkillId(){const c=craftState();if(craftHas('b18')&&save.craftSkills.length===2){const id=save.craftSkills[c.dual%2];hero.skCD=Math.max(0,(c.skillUntil[id]||0)-c.clock);return id;}return save.skill;}
  function craftOnSkill(id,readySeconds){
    const h=hero,c=craftState();if(!c||craftBusy)return;c.skillUntil[id]=c.clock+h.skCD;
    if(craftHas('b18')&&save.craftSkills.length===2)c.dual=(c.dual+1)%2;
    if(craftHas('f01'))for(const t of targetsNear(h.x,h.y,300).filter(craftLive))if(t.craftFire){const n=t.craftFire;t.craftFire=0;craftFeedback('fire',t.x,t.y,'火種爆発 ×'+n,.8+n*.2);craftHit(t,.3*n,t.x,t.y,120,'#ff9850',n===3?'seed':null);}
    if(craftHas('f07')){c.stars=3;craftFeedback('magic',h.x,h.y,'星を装填',.7);}
    if(craftHas('b05')){c.echo={x:h.x,y:h.y};craftFeedback('magic',h.x,h.y,'残像待機',.7);}
    if(craftHas('b10')){craftPull(h.x,h.y,160,270);craftFeedback('water',h.x,h.y,'吸引');}
    if(craftHas('b12')&&readySeconds>=3){const t=craftNearest(h.x,h.y);if(t)craftLater(.45,()=>{if(craftLive(t))craftFeedback('magic',t.x,t.y,'時限追撃',1.1);craftHit(t,1.2);});}
    if(craftHas('b13')&&c.absorb){const n=c.absorb;c.absorb=0;craftFeedback('magic',h.x,h.y,'吸弾放出 ×'+n);for(let i=0;i<n;i++){const t=craftNearest(h.x,h.y);if(t)craftShot(h.x,h.y,Math.atan2(t.y-h.y,t.x-h.x)+(i-(n-1)/2)*.1,.6,'#b8e8ff',320,'absorb');}}
    if(craftHas('b16')){const x=h.x,y=h.y,a=h.face;craftLater(.4,()=>{craftFeedback('water',x,y,'幽霊砲',1,a);craftShot(x,y,a,.8,'#a0f0d0');craftShot(x,y,a+.12,.6,'#a0f0d0');});}
    if(craftHas('b22')){const a=h.face;craftFeedback('water',h.x+Math.cos(a)*40,h.y+Math.sin(a)*40,'潮流放出',1.2,a);for(const t of targetsNear(h.x,h.y,200).filter(craftLive))if(Math.abs(Math.atan2(Math.sin(Math.atan2(t.y-h.y,t.x-h.x)-a),Math.cos(Math.atan2(t.y-h.y,t.x-h.x)-a)))<.8)craftHit(t,.6,h.x,h.y,420,'#80c8ff');}
    if(craftHas('b24')&&c.cross>=2){c.cross=0;craftFeedback('fire',h.x,h.y,'双撃解放',1.2);craftArea(h.x,h.y,150,1,220,'#ff9a90');}
    if(craftHas('b25')&&c.vengeance){const m=Math.min(2.5,c.vengeance/h.s.atk);c.vengeance=0;craftFeedback('magic',h.x,h.y,'反攻解放',1.3);craftArea(h.x,h.y,170,m,200,'#d080ff');}
    if(craftHas('b29')){c.lightMode=c.lastAction==='ram'?!c.lightMode:c.lightMode;c.lastAction='skill';craftFeedback(c.lightMode?'thunder':'magic',h.x,h.y,c.lightMode?'光へ転換':'闇へ転換');if(c.lightMode)craftArea(h.x,h.y,130,.6,100,'#fff0b0');else{const t=craftNearest(h.x,h.y);if(t)craftHit(t,.9,h.x,h.y,0,'#b890ff');}}
    if(craftHas('b33')&&c.beats>=3){c.beats=0;for(const t of targetsNear(h.x,h.y,240).filter(craftLive).slice(0,4)){craftFeedback('thunder',t.x,t.y,'三拍雷撃',1.2);craftHit(t,1.2,t.x,t.y,0,'#fff2a0');anims.push({kind:'bolt',x:t.x,y:t.y,t:0,dur:.4,frames:1});}}
  }
  function craftOnRoll(){const h=hero,c=craftState();if(!c)return;c.rollId++;c.rollFrom={x:h.x,y:h.y};c.wasRoll=true;c.rollAge=0;c.turn=0;c.turnPeak=0;c.rollCurve=0;
    if(craftHas('b04')&&craftReady('webLine',2))c.webStart={x:h.x,y:h.y};
    if(craftHas('b08')&&c.charge>=1){c.lightningRoll=1;c.charge=0;craftFeedback('thunder',h.x,h.y,'充電放出',1.1,h.rollA);}
    if(craftHas('b21'))c.shadow={x:h.x,y:h.y};
    if(craftHas('b27')&&craftReady('dreamDecoy',6))c.decoy={x:h.x,y:h.y,life:2};
    if(craftHas('f05')&&craftReady('dreamSleep',5))for(const t of targetsNear(h.x,h.y,75))craftSleep(t,.65);
    if(craftHas('f06')&&craftReady('lightningLine',2))c.lightLineFrom={x:h.x,y:h.y};
    if(craftHas('f07')&&c.stars>0){const t=craftNearest(h.x,h.y);if(t){c.stars--;craftShot(h.x,h.y,Math.atan2(t.y-h.y,t.x-h.x),.6,'#ffe8a0');}}
    if(craftHas('b23')&&c.bones>0){c.bones--;craftShot(h.x,h.y,h.rollA,.55,'#e8e0cc',320,'bone');}
  }
  function craftOnRollEnd(){const h=hero,c=craftState();if(!c)return;
    if(craftHas('f03')&&craftReady('pullRoll',2))craftPull(h.x,h.y,85,170);
    if(c.webStart){const p=c.webStart;c.webStart=null;c.lines=c.lines||[];c.lines.push({...p,x2:h.x,y2:h.y,life:2.5,mode:'web',hit:new Set()});}
    if(c.lightLineFrom){const p=c.lightLineFrom;c.lightLineFrom=null;c.lines=c.lines||[];c.lines.push({...p,x2:h.x,y2:h.y,life:1.2,mode:'bolt',hit:new Set()});}
    if(craftHas('b19')&&Math.max(Math.abs(c.turn||0),c.turnPeak||0)>=CRAFT_TORNADO_TURN&&craftReady('tornado',CRAFT_TORNADO_CD)){const x=h.x,y=h.y,cast={};craftFeedback('water',x,y,'旋回竜巻',1);for(let i=0;i<3;i++)craftLater(i*.25,()=>craftArea(x,y,75,.3,180,'#90e0c0',null,'tornado',{cast}));}
    if(craftHas('b35'))craftClearBullets(95,'star',5);
    c.lightningRoll=0;c.wasRoll=false;
  }
  function craftUsePotion(id){const h=hero,c=craftState();if(!h||!c)return false;switch(id){
    case 'p01':if(!(h.poisonT>0||h.slow>0))return false;h.poisonT=0;h.slow=0;c.cleanse=4;break;
    case 'p02':c.steel=10;break;
    case 'p03':c.lure=12;break;
    case 'p04':c.gather=30;break;
    case 'p05':if(!(h.skCD>0)||c.cycleUsed)return false;h.skCD=Math.max(0,h.skCD-12);for(const k in c.skillUntil)c.skillUntil[k]=Math.max(c.clock,c.skillUntil[k]-12);c.cycleUsed=true;break;
    case 'p06':c.finish=5;break;
    default:return false;
  }return true;}
  function craftFloorImmune(){return !!(craftHas('b35')&&hero.roll>0);}
  function craftTick(dt){
    const h=hero,c=craftState();if(!c)return;c.clock+=dt;
    if(craftDirty){craftDirty+=dt;if(craftDirty>2){persist();craftDirty=0;}}
    for(const k of ['coffin','steel','lure','gather','cleanse','rebound','shieldLife'])if(c[k]>0)c[k]=Math.max(0,c[k]-dt);
    if(c.shieldLife===0)c.shield=0;
    if(c.coffin>0){h.vx=h.vy=0;h.recoil=dt*2;}
    if(c.cleanse>0){h.poisonT=0;h.slow=0;}
    if(craftHas('b06'))c.heat=clamp(c.heat+(heroSpeed()>120?dt/3:-dt*.5),0,1);
    if(craftHas('b08'))c.charge=clamp((c.charge||0)+(heroSpeed()>160?dt/4:0),0,1);
    if(craftHas('b26')&&c.lastTarget&&craftLive(c.lastTarget)&&c.clock-c.lastTargetAt<4&&heroSpeed()>80&&Math.cos(Math.atan2(c.lastTarget.y-h.y,c.lastTarget.x-h.x)-h.face)>.5){c.hunt=Math.min(1,(c.hunt||0)+dt*.3);if(drag.down&&!h.roll){h.vx*=1+dt*c.hunt*.6;h.vy*=1+dt*c.hunt*.6;}}else c.hunt=0;
    if(craftHas('b01')&&c.rebound>0&&drag.down){h.recoil=Math.min(h.recoil,.04);const dx=drag.px-drag.ox,dy=-(drag.py-drag.oy),d=hyp(dx,dy);if(d>20){h.vx=dx/d*PAD_MAX*h.s.ram;h.vy=dy/d*PAD_MAX*h.s.ram;c.rebound=0;arenaEvent('redirect',1,c.lastTarget);}}
    if(h.roll>0){
      c.rollAge=(c.rollAge||0)+dt;
      if(craftHas('b19')){let turn=0;const dx=drag.px-drag.ox,dy=-(drag.py-drag.oy);if(drag.down&&hyp(dx,dy)>12){const a=Math.atan2(dy,dx),da=Math.atan2(Math.sin(a-h.rollA),Math.cos(a-h.rollA));turn=clamp(da,-dt*5,dt*5);c.rollCurve=0;}else if(c.rollCurve){turn=clamp(c.rollCurve,-dt*5,dt*5);c.rollCurve-=turn;}h.rollA+=turn;c.turn=(c.turn||0)+turn;c.turnPeak=Math.max(c.turnPeak||0,Math.abs(c.turn));}
      const near=bullets.some(b=>b.life>0&&!b.harmless&&!b.pierce&&hyp(b.x-h.x,b.y-h.y)<h.r+(b.r||4)+5);
      if(near)guildDodge();if(near&&c.rollAge<=.14)craftPerfect();
      if(near&&c.rollAge<=.14&&craftHas('f02')&&craftReady('frostParry',.2))craftClearBullets(h.r+7,'clear',3);
      if(near&&c.rollAge<=.14&&craftHas('f09')&&craftReady('mirrorParry',.2))craftClearBullets(h.r+7,'reflect',3);
      if(craftHas('b13'))craftClearBullets(h.r+5,'store',3);
      for(const t of targetsNear(h.x,h.y,h.r+10).filter(craftLive)){
        if(craftHas('f10')&&t.craftRollSeen!==c.rollId){if(t.craftStoneMark&&c.clock-t.craftStoneMark.at<5&&t.craftStoneMark.id!==c.rollId){t.craftStoneMark=null;craftSleep(t,.8);}else t.craftStoneMark={id:c.rollId,at:c.clock};t.craftRollSeen=c.rollId;}
        if(c.lightningRoll&&t.craftLightningRoll!==c.rollId){t.craftLightningRoll=c.rollId;craftHit(t,.75,h.x,h.y,200,'#fff2a0');}
        if(craftHas('b31')&&!isBoss(t))c.tunnelTarget=t;
      }
    }else if(c.wasRoll){if(craftHas('b31')&&craftLive(c.tunnelTarget)){const t=c.tunnelTarget;h.x=t.x+Math.cos(h.rollA)*(t.r+h.r+4);h.y=t.y+Math.sin(h.rollA)*(t.r+h.r+4);confine(h,.3);arenaEvent('tunnelExit',1,t);}c.tunnelTarget=null;craftOnRollEnd();}
    if(craftHas('b28')&&craftReady('gazeSample',.2))for(const t of targetsNear(h.x,h.y,150).filter(craftLive)){const toward=Math.atan2(t.y-h.y,t.x-h.x),front=Math.cos(toward-h.face)>.75,faces=Math.cos((t.face||0)-toward)<-.5;t.craftGaze=front&&faces?(t.craftGaze||0)+.2:0;if(t.craftGaze>=1.2){t.craftGaze=0;craftSleep(t,.7);}}
    if(c.lure>0||c.decoy)for(const t of targetsNear(h.x,h.y,280).filter(t=>!isBoss(t)&&craftLive(t))){const x=c.decoy?c.decoy.x:h.x,y=c.decoy?c.decoy.y:h.y,d=hyp(x-t.x,y-t.y)||1;t.vx+=(x-t.x)/d*110*dt;t.vy+=(y-t.y)/d*110*dt;if(c.decoy&&d<t.r+18){craftArea(x,y,90,.25,100,'#d8a8f0');for(const o of targetsNear(x,y,90))craftSleep(o,.8,'decoySleep',{cast:c.decoy});c.decoy=null;break;}}
    if(c.decoy){c.decoy.life-=dt;if(c.decoy.life<=0)c.decoy=null;}
    if(c.gather>0)for(const d of drops){const dx=h.x-d.x,dy=h.y-d.y,l=hyp(dx,dy)||1;if(l<220){d.x+=dx/l*Math.min(l,240*dt);d.y+=dy/l*Math.min(l,240*dt);}}
    if(craftHas('b34')&&heroSpeed()>RAM_MIN&&craftReady('farHand',2.5)){const a=h.face,t=targetsNear(h.x,h.y,120).filter(craftLive).find(t=>{const d=hyp(t.x-h.x,t.y-h.y),ang=Math.atan2(t.y-h.y,t.x-h.x);return d>h.r+t.r+10&&Math.cos(ang-a)>.9;});if(t)craftHit(t,.55,h.x,h.y,150,'#c8a0e8');}
    for(const e of enemies){if(e.dead)continue;
      if(e.craftSlow>0)e.craftSlow-=dt;
      if(e.craftSleep>0){e.craftSleep-=dt;e.zap=Math.max(e.zap||0,.1);}
      if(e.craftPoison>0){e.craftPoison-=dt;e.craftPoisonTick-=dt;if(e.craftPoisonTick<=0){e.craftPoisonTick=.5;craftHit(e,.08,e.x,e.y,0,'#b8e080');}}
      if(e.craftBowling){if(e.craftBowling.until<c.clock)e.craftBowling=null;else for(const o of targetsNear(e.x,e.y,e.r+4).filter(t=>t!==e&&craftLive(t)))if(!e.craftBowling.hit.has(o)){e.craftBowling.hit.add(o);craftHit(o,.5,e.x,e.y,180,'#ffcf90','bowling',{projectile:e});}}
    }
    for(const line of c.lines||[]){line.life-=dt;for(const t of targetsNear((line.x+line.x2)/2,(line.y+line.y2)/2,hyp(line.x2-line.x,line.y2-line.y)/2+40).filter(craftLive))if(!line.hit.has(t)&&segDist(t.x,t.y,line.x,line.y,line.x2,line.y2)<t.r+8){line.hit.add(t);if(line.mode==='web'){craftSlow(t,1.2);arenaEvent('web',1,t);}else craftHit(t,.4,line.x,line.y,60,'#fff2a0','bolt');}}
    c.lines=(c.lines||[]).filter(l=>l.life>0).slice(-3);
    for(const b of c.shots){const x=b.x,y=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;const t=targetsNear((x+b.x)/2,(y+b.y)/2,hyp(b.x-x,b.y-y)/2+25).filter(craftLive).find(t=>segDist(t.x,t.y,x,y,b.x,b.y)<t.r+5);if(t){craftHit(t,b.m,x,y,70,b.col,b.origin,b.meta);b.life=0;}}
    c.shots=c.shots.filter(b=>b.life>0);for(const v of c.visual)v.life-=dt;c.visual=c.visual.filter(v=>v.life>0);
    const ready=c.pending.filter(p=>p.at<=c.clock);c.pending=c.pending.filter(p=>p.at>c.clock);for(const p of ready)if(h.hp>0&&state!=='over')p.fn();
    if(craftHas('b18')&&save.craftSkills.length===2){const id=save.craftSkills[c.dual%2];h.skCD=Math.max(0,(c.skillUntil[id]||0)-c.clock);}
    if(!(h.skCD>0)&&c.readyAt==null)c.readyAt=c.clock;else if(h.skCD>0)c.readyAt=null;
    for(const p of c.procs||[])p.life-=dt;if(c.procs)c.procs=c.procs.filter(p=>p.life>0);craftNotifyReady();
  }
  function craftDraw(){const c=hero&&hero.craft;if(!c)return;ctx.save();ctx.lineWidth=3;
    for(const l of c.lines||[]){ctx.strokeStyle=l.mode==='bolt'?'#fff0a0':'#c8d8ed';ctx.beginPath();ctx.moveTo(l.x,sy(l.y));ctx.lineTo(l.x2,sy(l.y2));ctx.stroke();}
    for(const v of c.visual){ctx.globalAlpha=v.life/v.max;ctx.strokeStyle=v.col;ctx.beginPath();ctx.moveTo(v.x,sy(v.y));ctx.lineTo(v.x2,sy(v.y2));ctx.stroke();ctx.fillStyle=v.col;ctx.fillRect(v.x2-3,sy(v.y2)-3,6,6);}
    ctx.globalAlpha=1;for(const b of c.shots){ctx.fillStyle=b.col;ctx.fillRect(b.x-3,sy(b.y)-3,6,6);}
    if(c.decoy){ctx.globalAlpha=.45;ctx.fillStyle='#d0a8ee';ctx.fillRect(c.decoy.x-8,sy(c.decoy.y)-25,16,24);}
    if(c.coffin>0){ctx.globalAlpha=.9;ctx.fillStyle='#d8b050';ctx.fillRect(hero.x-13,sy(hero.y)-34,26,38);}
    if(c.decoy)pfxSprite('shadow/shadow-tendrils',c.decoy.x,sy(c.decoy.y),pfxClock%2/2,95,0,.6);
    if(c.shield>0){ctx.globalAlpha=.6;ctx.strokeStyle='#a8e098';ctx.beginPath();ctx.arc(hero.x,sy(hero.y)-12,23,0,Math.PI*2);ctx.stroke();}
    if(craftHas('f01'))for(const e of [...enemies,...livingBosses()]){if(!craftLive(e)||!e.craftFire)continue;for(let i=0;i<3;i++){ctx.fillStyle=e.craftFire>i?'#ffad50':'#54483e';ctx.fillRect(e.x-10+i*8,sy(e.y)-e.r-20,5,6);}}
    craftDrawProcs(c);ctx.restore();
  }
  // CRAFTING END

  // ---------------------------------------------------------------
  //  SAVE
  // ---------------------------------------------------------------
  // BESTIARY BEGIN — maintained in tools/bestiary/runtime.inc.js.
  const bestEntries=[...Object.entries(EN).map(([type,def])=>({key:'enemy:'+type,type,def,boss:false})),...Object.entries(BOSSES).map(([type,def])=>({key:'boss:'+type,type,def,boss:true}))];
  const bestByKey=Object.fromEntries(bestEntries.map(e=>[e.key,e])),bestThumbs=new Map();
  let bestPreview=null,bestTab='all',bestScroll=0,bestDirty=false,bestSaveT=0,bestPainting=false;
  function bestNormalize(){
    const old=save.bestiary&&typeof save.bestiary==='object'?save.bestiary:{};
    const seen={},obtained={};
    if(old.seen&&typeof old.seen==='object')for(const[k,v]of Object.entries(old.seen))if(bestByKey[k]&&v){seen[k]={places:Array.isArray(v.places)?v.places.filter(i=>Number.isInteger(i)&&DUNGEONS[i]):[]};}
    if(old.obtained&&typeof old.obtained==='object')for(const[k,v]of Object.entries(old.obtained))if(v&&bestValidDrop(k))obtained[k]=true;
    save.bestiary={seen,obtained};
    // A cleared boss is certain evidence of an encounter; a dungeon's pool is not.
    DUNGEONS.forEach((d,i)=>{if(save.cleared[i])seen['boss:'+d.boss]||={places:[i]};});
    bestSyncOwned();
  }
  function bestValidDrop(k){const[a,b]=k.split(':');return k==='forge:crystal'||k==='gold'||a==='mat'&&!!craftMats[b]||a==='item'&&!!ITEMS[b]||a==='gear'&&!!EQ[b];}
  function bestSyncOwned(){
    if(!save.bestiary)return;
    const o=save.bestiary.obtained;
    // Existing zero-valued material keys also prove past possession (used in crafting).
    for(const[k,n]of Object.entries(save.materials||{}))if(craftMats[k]&&Number.isSafeInteger(n)&&n>=0)o['mat:'+k]=true;
    for(const[k,n]of Object.entries(save.items||{}))if(ITEMS[k]&&n>0)o['item:'+k]=true;
    for(const k of save.owned||[])if(EQ[k])o['gear:'+k]=true;
    if(save.gold>0)o.gold=true;if(save.forge&&(save.forge.crystals>0||save.forge.receipts.length))o['forge:crystal']=true;
  }
  function bestObtain(key){if(!save.bestiary||!bestValidDrop(key)||save.bestiary.obtained[key])return;save.bestiary.obtained[key]=true;bestDirty=true;}
  function bestEncounter(key){
    if(bestPainting||!save.bestiary||!bestByKey[key]||(state!=='play'&&state!=='boss'))return;
    if(arenaEncounter(key))return;
    const seen=save.bestiary.seen,entry=seen[key]||(seen[key]={places:[]});
    if(!entry.places.includes(dIdx)){entry.places.push(dIdx);bestDirty=true;}
  }
  function bestPlaces(e){
    const indices=new Set();DUNGEONS.forEach((d,i)=>{if(e.boss?d.boss===e.type:d.pool[e.type]||['goldslime','pinkdiamondslime'].includes(e.type))indices.add(i);});
    // King slime splits into slimes, and the lich summons skeletons.
    if(!e.boss&&e.type==='slime')DUNGEONS.forEach((d,i)=>{if(d.boss==='kingslime')indices.add(i);});
    if(!e.boss&&e.type==='skeleton')DUNGEONS.forEach((d,i)=>{if(d.boss==='lich')indices.add(i);});
    for(const i of save.bestiary.seen[e.key]?.places||[])indices.add(i);
    return [...indices].sort((a,b)=>a-b);
  }
  function bestDrops(e){
    if(e.type==='pinkdiamondslime')return ['forge:crystal'];
    const keys=new Set(),add=k=>keys.add(k);
    if(e.boss){for(const[k,m]of Object.entries(craftMats))if(m.boss===e.type)add('mat:'+k);if(e.type==='treant'){add('mat:m20');add('mat:m09');}}
    else{const m=CRAFT.enemy[e.type];for(const k of [...(m?.common||[]),...(m?.special||[])])add('mat:'+k);add('item:herb');}
    add('gold');
    // Equipment rolls belong to the dungeon, not to an individual species.
    for(const i of bestPlaces(e)){
      for(const slot of ['w','a'])for(const suffix of e.boss?['rr']:['rr','lo']){const k=slot+(slot==='w'?DROP_WT[i]:DROP_AT[i])+suffix;if(EQ[k])add('gear:'+k);}
      if(!e.boss)for(const item of EQUIP)if(item.drop==='fx'&&Math.abs(item.from-i)<=1)add('gear:'+item.id);
    }
    return [...keys];
  }
  function bestDropRow(k){
    if(!save.bestiary.obtained[k])return '<div class="best-drop best-unknown"><span class="best-drop-mark" aria-hidden="true">?</span><span>？？？<small>未入手</small></span></div>';
    const[kind,id]=k.split(':');let pic='',name='',note='';
    if(kind==='forge'){pic=forgeCrystalIcon();name=FORGE_CRYSTAL;note='効果継承専用・1個確定';}
    else if(kind==='mat'){pic=craftArtImg('material',id);name=craftMats[id].name;note=craftMats[id].kind==='boss'?'ボス専用素材':'素材';}
    else if(kind==='gear'){pic=eqIcon(EQ[id]);name=EQ[id].name;note='出現ダンジョン共通の装備';}
    else if(kind==='item'){pic=icon(id);name=ITEMS[id].name;note='どうぐ';}
    else{pic='<span class="best-drop-mark best-gold" aria-hidden="true">G</span>';name='ゴールド';note='お金';}
    return `<div class="best-drop">${pic}<span>${name}<small>${note}</small></span></div>`;
  }
  function bestModel(e){
    const b=e.def,model={type:e.type,name:b.name,x:0,y:0,vx:0,vy:0,r:e.boss?Math.round(b.r*1.4):Math.round(b.r*CS),maxHp:b.hp,hp:b.hp,atk:b.atk,def:b.def,col:b.col,wcol:b.wcol,fcol:b.fcol,ocol:b.ocol,ai:b.ai,mod:b.mod||{},fly:!!b.fly,st:'idle',t:0,cd:99,phase:e.boss?1:0,face:-Math.PI/2,hurt:0,hitCD:0,active:true,alpha:1,headOut:false,awake:!b.mod?.stone,guard:b.ai==='guard',z:0,sweeps:[],intro:0,dead:0,mv:null,mt:0,moves:b.moves,moves2:b.moves2};
    if(e.boss&&RIG[e.type])rigInit(model);
    if(e.type==='archmage'){model.sizeK=.68;model.grow=-1;}
    return model;
  }
  const bestRaw=SPR.util.canvas(1024,768)[0],bestRawX=bestRaw.getContext('2d');
  function bestDrawModel(e,model,time,face='f'){
    // Reuse the real game renderer with isolated draw objects. Never run combat AI.
    const previous={ctx,hero,boss,arena,camY,bcamX,bcamY,globalT,bullets,zones,state,random:Math.random,painting:bestPainting};
    let seed=9181;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    bestRawX.resetTransform();bestRawX.clearRect(0,0,1024,768);bestRawX.imageSmoothingEnabled=false;bestRawX.save();
    try{
      bestPainting=true;ctx=bestRawX;arena=null;camY=0;globalT=time;state='play';bullets=[];zones=[];
      const a={f:-Math.PI/2,r:0,b:Math.PI/2,l:Math.PI}[face];
      hero={x:Math.cos(a)*200,y:Math.sin(a)*200,r:HERO_R,face:a,hp:1};boss=e.boss?model:null;
      model.face=a;model.t=time;model.f3=face;model.f3s=null;
      if(model.zakoView)model.zakoView.face=model.zakoView.candidate=face;
      if(e.boss&&RIG[e.type]){
        model.dir=a;model.an.walk=time*.3;model.an.ring=time*.35;model.an.flap=Math.sin(time*3.2);model.an.open=Math.max(0,Math.sin(time*2));
        if(RIG_FREE[e.type]){const lengths=e.type==='sandworm'?[36,30,28,26,25,24,23,22,21,20,19]:[40,36,31,30];let dist=0;model.segs=lengths.map((l,i)=>{dist+=l;return{x:-Math.cos(a)*dist+Math.sin(a)*Math.sin(time*3-i*.6)*5,y:-Math.sin(a)*dist+Math.cos(a)*Math.sin(time*3-i*.6)*5,a};});}
        for(const hand of model.hands||[]){hand.x=hand.s*125+Math.sin(time*1.4+hand.s)*10;hand.y=10+Math.cos(time*1.1+hand.s)*12;hand.z=.35+Math.sin(time*2+hand.s)*.08;}
        for(const claw of model.claws||[]){claw.y=-4+Math.sin(time*2.4+claw.s)*6;claw.open=Math.max(0,Math.sin(time*1.3+claw.s*2))*.5;}
      }
      ctx.translate(512,440-sy(0));if(e.boss)drawBoss();else drawEnemy(model);
    }finally{bestRawX.restore();ctx=previous.ctx;hero=previous.hero;boss=previous.boss;arena=previous.arena;camY=previous.camY;bcamX=previous.bcamX;bcamY=previous.bcamY;globalT=previous.globalT;bullets=previous.bullets;zones=previous.zones;state=previous.state;Math.random=previous.random;bestPainting=previous.painting;}
    return bestRaw;
  }
  function bestBounds(c){const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let l=c.width,r=0,t=c.height,b=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]>24){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}return r>=l?{x:l,y:t,w:r-l+1,h:b-t+1}:{x:500,y:400,w:24,h:24};}
  function bestBlit(raw,canvas,b){
    const x=canvas.getContext('2d'),w=canvas.width,h=canvas.height;x.resetTransform();x.clearRect(0,0,w,h);x.imageSmoothingEnabled=false;x.fillStyle='#13183a';x.fillRect(0,0,w,h);
    const scale=Math.min((w-24)/(b.w+20),(h-24)/(b.h+20),4);x.drawImage(raw,b.x-10,b.y-10,b.w+20,b.h+20,(w-(b.w+20)*scale)/2,(h-(b.h+20)*scale)/2,(b.w+20)*scale,(b.h+20)*scale);
  }
  function bestFrame(p,canvas){bestBlit(bestDrawModel(p.entry,p.model,p.time,p.face),canvas,p.views?.[p.face]||p.bounds);}
  function bestPlayback(e){
    const p={entry:e,model:bestModel(e),time:1,face:'f',paused:false,elapsed:0,views:{}};
    for(const face of ['f','r','b','l']){const z=bestBounds(bestDrawModel(e,p.model,1,face)),mx=Math.max(12,z.w*.12),my=Math.max(12,z.h*.12);p.views[face]={x:z.x-mx,y:z.y-my,w:z.w+mx*2,h:z.h+my*2};}
    p.bounds=p.views.f;return p;
  }
  function bestThumb(e){if(!bestThumbs.has(e.key)){const model=bestModel(e),raw=bestDrawModel(e,model,1,'f'),b=bestBounds(raw),c=SPR.util.canvas(112,96)[0];bestBlit(raw,c,b);bestThumbs.set(e.key,c.toDataURL());}return bestThumbs.get(e.key);}
  function openBestiary(reset=false){
    facilitySelect('house','bestiary');
    bestSyncOwned();if(reset){bestTab='all';bestScroll=0;}
    const seen=save.bestiary.seen,list=bestEntries.filter(e=>bestTab==='all'||(bestTab==='boss')===e.boss),total=bestEntries.filter(e=>seen[e.key]).length;
    openPanel('魔物図鑑',`<p class="best-progress">遭遇 ${total} / ${bestEntries.length}</p><div class="tabs craft-tabs">${Object.entries({all:'すべて',enemy:'ザコ',boss:'ボス'}).map(([k,v])=>`<button data-best-tab="${k}" aria-pressed="${bestTab===k}">${v}</button>`).join('')}</div><div class="best-grid">`+list.map(e=>seen[e.key]?`<button class="best-card" data-best="${e.key}"><img width="112" height="96" src="${bestThumb(e)}" alt=""><span>${e.def.name}</span></button>`:'<div class="best-card best-locked" aria-label="未遭遇"><span class="best-question" aria-hidden="true">?</span><span>？？？<small>未遭遇</small></span></div>').join('')+'</div>',[['勇者の家へ',openHouse]],'house');
    panelWrap.classList.add('bestiary');panelBody.scrollTop=bestScroll;
    craftBind('[data-best-tab]',b=>{bestTab=b.dataset.bestTab;bestScroll=0;openBestiary();});craftBind('[data-best]',b=>{bestScroll=panelBody.scrollTop;openBestiaryEntry(b.dataset.best);});
  }
  function openBestiaryEntry(key,{back=()=>openBestiary(),room='house'}={}){
    if(room==='house')facilitySelect('house','bestiary');
    const e=bestByKey[key];if(!e||!save.bestiary.seen[key])return;
    const fixed=e.boss&&['gigacrab','raijin','demonhands'].includes(e.type),drops=bestDrops(e),known=drops.filter(k=>save.bestiary.obtained[k]).length;
    openPanel(e.def.name,`<p class="best-kind">${e.boss?'ボス':'魔物'}</p><div class="best-stage" id="bestStage"></div><div class="tabs best-controls">${fixed?'':Object.entries({f:'正面',r:'右',b:'後ろ',l:'左'}).map(([k,v])=>`<button data-best-face="${k}" aria-pressed="${k==='f'}">${v}</button>`).join('')}<button data-best-pause aria-pressed="false">一時停止</button></div>${e.type==='pinkdiamondslime'?facilityDetail(e.def.name,['勇者を見つけると逃げ出し、まもなく姿を消してしまいます。']):''}<h3>出現ダンジョン</h3><ul class="best-places">${bestPlaces(e).map(i=>`<li class="ui-best-place">${uiBossButton([i],i===0||save.cleared[i-1])}${DUNGEONS[i].name}${e.type==='pinkdiamondslime'?'（超低確率で出現）':e.type==='goldslime'?'（まれに出現）':''}</li>`).join('')}</ul><h3>ドロップアイテム <small>${known} / ${drops.length}</small></h3><div class="best-drops">${drops.map(bestDropRow).join('')}</div>`,[['もどる',back]],room);
    panelWrap.classList.add('bestiary');panelBody.scrollTop=0;
    const canvas=document.createElement('canvas');canvas.id='bestModel';canvas.width=600;canvas.height=360;canvas.setAttribute('aria-label',e.def.name+'のモデル再生');$('bestStage').appendChild(canvas);
    uiBindStages(()=>openBestiaryEntry(key,{back,room}));
    bestPreview=bestPlayback(e);bestPreview.canvas=canvas;bestFrame(bestPreview,canvas);
    craftBind('[data-best-face]',b=>{bestPreview.face=b.dataset.bestFace;panelBody.querySelectorAll('[data-best-face]').forEach(c=>c.setAttribute('aria-pressed',String(c===b)));bestFrame(bestPreview,canvas);});
    craftBind('[data-best-pause]',b=>{bestPreview.paused=!bestPreview.paused;b.setAttribute('aria-pressed',String(bestPreview.paused));b.textContent=bestPreview.paused?'再生':'一時停止';});
  }
  function bestTick(dt){
    if(bestDirty&&(bestSaveT+=dt)>=.75){persist();bestDirty=false;bestSaveT=0;}
    const p=bestPreview;if(!p||!panelOpen||panelWrap.hidden||document.hidden)return;if(p.paused)return;
    p.time+=dt;p.elapsed+=dt;if(p.elapsed<1/30)return;p.elapsed%=1/30;bestFrame(p,p.canvas);
  }
  function bestStop(){bestPreview=null;panelWrap.classList.remove('bestiary');}
  // BESTIARY END

  // GUILD BEGIN — maintained in tools/guild/runtime.inc.js.
  const GUILD=window.GUILD_DATA,guildById=Object.fromEntries(GUILD.map(q=>[q.id,q]));
  const guildGear=[
    {id:'guild_lantern',slot:'charm',name:'探索者のランタン',hp:45,note:'近くの透明化・潜行中の敵の位置を薄く示す。姿や名前は明かさない。'},
    {id:'guild_spacing',slot:'weapon',name:'間合いの剣',atk:Math.round(EQ.w3.atk*.85),vis:'w3',note:'敵の斬撃・武器の薙ぎ払いが空振りした直後1秒以内、その敵への体当たり威力+40％。'},
    {id:'guild_gale',slot:'boots',name:'追い風のくつ',ram:1.06,note:'2秒以内に回避を続けると距離が段階的に伸びる。最大+24％。被弾で解除。'},
    {id:'guild_rescue',slot:'armor',name:'救援隊のよろい',def:Math.round(EQ.a2.def*.85),vis:'a2',note:'回復アイテムで実際に回復した量の25％を4秒かけて追加回復。被弾で中断。'}
  ];
  for(const e of guildGear){FX[e.id]={v:1,name:e.name,note:e.note};Object.assign(e,{fx:{[e.id]:1},guild:true,price:0,val:0});EQUIP.push(e);EQ[e.id]=e;}
  let guildRun=null,guildTab='recommended',guildDetailId=null,guildDirty=false,guildSaveT=0,guildDateT=0,guildReadyCache={at:-99,count:0};
  const guildNumber=n=>Number.isFinite(n)&&n>=0?Math.min(1e9,n):0;
  const guildDay=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
  const guildStage=()=>Math.min(34,Math.max(0,save.cleared.reduce((m,v,i)=>v?Math.max(m,i+1):m,0)));
  function guildCleanReceipt(r){r=r&&typeof r==='object'?r:{};const map=(o,table)=>Object.fromEntries(Object.entries(o||{}).filter(([k,n])=>table[k]&&Number.isSafeInteger(n)&&n>0&&n<=999999));return{mats:map(r.mats,craftMats),items:map(r.items,ITEMS),gear:Array.isArray(r.gear)?r.gear.filter(k=>EQ[k]).slice(0,3):[],gold:guildNumber(r.gold),title:['魔物博士','世界の素材収集家'].includes(r.title)?r.title:''};}
  function guildNormalize(){
    const old=save.guild&&typeof save.guild==='object'?save.guild:{},s=old.stats&&typeof old.stats==='object'?old.stats:{},clean=o=>Object.fromEntries(Object.entries(o||{}).filter(([k,v])=>/^[a-zA-Z0-9_:-]+$/.test(k)&&Number.isFinite(v)&&v>=0).map(([k,v])=>[k,guildNumber(v)]));
    const stats={values:clean(s.values),crafts:{},skills:{},builds:{}},claimed={};
    for(const k of Object.keys(s.crafts||{}))if(craftRecipes[k]&&s.crafts[k])stats.crafts[k]=true;
    for(const k of Object.keys(s.skills||{}))if(SKILLS[k]&&s.skills[k])stats.skills[k]=true;
    for(const[k,v]of Object.entries(s.builds||{}))if(/^\d+$/.test(k)&&DUNGEONS[k]&&Array.isArray(v))stats.builds[k]=[...new Set(v.filter(x=>typeof x==='string'&&x.length<250))].slice(0,64);
    for(const k of Object.keys(old.claimed||{}))if(guildById[k]&&old.claimed[k])claimed[k]=true;
    save.guild={v:1,stats,claimed,receipts:{},titles:Array.isArray(old.titles)?[...new Set(old.titles.filter(t=>['魔物博士','世界の素材収集家'].includes(t)))]:[],daily:old.daily&&typeof old.daily==='object'?old.daily:null};
    for(const[id,r]of Object.entries(old.receipts||{}))if(claimed[id])save.guild.receipts[id]=guildCleanReceipt(r);
    if(!old.v){stats.values.kill=guildNumber(save.kills);DUNGEONS.forEach((d,i)=>{if(save.cleared[i]){stats.values['clear:'+i]=1;stats.values['boss:'+d.boss]=1;stats.values['damage:'+d.boss]=100;}});for(const[k,n]of Object.entries(save.materials||{}))if(craftMats[k]){stats.values['mat:'+k]=guildNumber(n);stats.values.materialCount=(stats.values.materialCount||0)+guildNumber(n);}}
    guildReadyCache.at=-99;guildSyncCrafts();guildEnsureDay();
  }
  function guildSyncCrafts(){if(!save.guild)return;const c=save.guild.stats.crafts;for(const id of save.owned||[])if(id.startsWith('craft_')&&craftRecipes[id.slice(6)])c[id.slice(6)]=true;for(const id of save.craftTools||[])if(craftRecipes[id])c[id]=true;for(const[id,n]of Object.entries(save.items||{}))if(n>0&&id.startsWith('craft_')&&craftRecipes[id.slice(6)])c[id.slice(6)]=true;}
  function guildEnsureDay(){
    if(!save.guild)return;const g=save.guild,now=guildDay(),d=g.daily,valid=d&&/^\d{4}-\d{2}-\d{2}$/.test(d.day)&&Array.isArray(d.ids)&&d.ids.length===2&&new Set(d.ids).size===2&&d.ids.every(k=>['kill','clear','boss','mat'].includes(k));
    if(valid&&d.day>=now){d.counts=d.counts&&typeof d.counts==='object'?d.counts:{};for(const k of ['kill','clear','boss','mat'])d.counts[k]=guildNumber(d.counts[k]);d.claimed=Array.isArray(d.claimed)?[...new Set(d.claimed.filter(k=>[...d.ids,'bonus'].includes(k)))]:[];d.tier=Math.min(34,Math.floor(guildNumber(d.tier)));d.receipts=Object.fromEntries(Object.entries(d.receipts||{}).filter(([k])=>d.claimed.includes(k)).map(([k,r])=>[k,guildCleanReceipt(r)]));return;}
    let seed=Number(now.replace(/-/g,''))>>>0;const pool=['kill','clear','boss','mat'],ids=[];for(let i=0;i<2;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;ids.push(pool.splice(seed%pool.length,1)[0]);}g.daily={day:now,ids,counts:{kill:0,clear:0,boss:0,mat:0},claimed:[],receipts:{},tier:guildStage()};guildDirty=true;
  }
  function guildDaily(){guildEnsureDay();const d=save.guild.daily,defs={kill:['今日の魔物退治','魔物を15体倒す。',15,{choose:{kind:'common',n:10}}],clear:['ダンジョンの見回り','好きなダンジョンを1回クリアする。',1,{choose:{kind:'feature',n:3}}],boss:['今日の大物狩り','好きなボスを1体倒す。',1,{choose:{kind:'common',n:15}}],mat:['素材を集めよう','冒険で素材を合計10個入手する。報酬・交換は除く。',10,{items:{herb:3}}]};return [...d.ids,'bonus'].map(k=>{const z=defs[k]||['本日の依頼完了','本日のデイリー2件の報酬を受け取る。',2,{choose:{kind:'feature',n:3}}];return{id:'daily:'+d.day+':'+k,name:z[0],desc:z[1],stage:d.tier,group:'daily',dailyKind:k,day:d.day,needs:[['day:'+k,z[2]]],reward:{...z[3],gold:Math.max(20,Math.round(DUNGEONS[d.tier].gp*.03))}};});}
  function guildInc(k,n=1){if(!save.guild||bestPainting||!Number.isFinite(n)||n<=0)return;const v=save.guild.stats.values;v[k]=Math.min(1e9,(v[k]||0)+n);guildDirty=true;}
  function guildDayInc(k,n=1){guildEnsureDay();save.guild.daily.counts[k]=Math.min(1e9,(save.guild.daily.counts[k]||0)+n);guildDirty=true;}
  function guildValue(k){const s=save.guild.stats,v=s.values;
    if(k==='seen')return bestEntries.filter(e=>e.type!=='pinkdiamondslime'&&save.bestiary.seen[e.key]).length;
    if(k==='materialsKinds')return Object.keys(craftMats).filter(id=>save.bestiary.obtained['mat:'+id]).length;
    if(k==='clearKinds')return DUNGEONS.filter((d,i)=>v['clear:'+i]>0).length;
    if(k==='craftKinds')return Object.keys(s.crafts).length;
    if(k==='craftEquipKinds')return Object.keys(s.crafts).filter(id=>['weapon','armor','boots','charm'].includes(craftRecipes[id]?.slot)).length;
    if(k==='clearSkillKinds')return Object.keys(s.skills).length;
    if(k==='earlyNoSkill'||k==='earlyNoHeal')return [0,1,2,3,4].filter(i=>v[(k==='earlyNoSkill'?'noSkill:':'noHeal:')+i]>0).length;
    if(k.startsWith('builds:'))return(s.builds[k.split(':')[1]]||[]).length;
    if(k.startsWith('chapter:')){const[,a,b]=k.split(':').map(Number);return DUNGEONS.filter((d,i)=>i>=a&&i<=b&&v['clear:'+i]>0).length;}
    if(k.startsWith('day:'))return k==='day:bonus'?save.guild.daily.ids.filter(id=>save.guild.daily.claimed.includes(id)).length:save.guild.daily.counts[k.slice(4)]||0;
    return k.startsWith('damage:')?Math.round((v[k]||0)*1000)/1000:v[k]||0;
  }
  const guildOpen=q=>q.group==='daily'||q.stage===0||!!save.cleared[q.stage-1];
  const guildClaimed=q=>q.dailyKind?save.guild.daily.day===q.day&&save.guild.daily.claimed.includes(q.dailyKind):!!save.guild.claimed[q.id];
  function guildProgress(q){const rows=q.needs.map(([k,n])=>[guildValue(k),n]);if(q.delivery){if(q.delivery.pick)rows.push([Object.entries(craftMats).filter(([k,m])=>m.kind==='common'&&craftHave(k)>=q.delivery.n).length,q.delivery.pick]);else for(const[k,n]of Object.entries(q.delivery.mats))rows.push([craftHave(k),n]);}if(guildClaimed(q))return{rows:rows.map(([v,n])=>[n,n]),ready:true,ratio:1};return{rows,ready:rows.length>0&&rows.every(([v,n])=>v+1e-6>=n),ratio:rows.length?rows.reduce((a,[v,n])=>a+Math.min(1,v/n),0)/rows.length:0};}
  function guildMaterialPool(kind,tier){return Object.entries(craftMats).filter(([k,m])=>kind==='bossMat'?m.kind==='boss'&&save.cleared[DUNGEONS.findIndex(d=>d.boss===m.boss)]:m.kind===(kind==='feature'?'special':'common')&&craftStageFor(k)<=tier).map(([k])=>k);}
  function guildChoices(q){const c=q.reward.choose;if(!c)return null;let ids=[],type='gear',tier=c.current||c.kind==='specialCurrent'?guildStage():q.stage;
    if(c.kind==='gear')ids=c.ids;else if(c.kind==='special')ids=EQUIP.filter(e=>c.names.includes(e.name)).map(e=>e.id);else if(c.kind==='specialCurrent')ids=EQUIP.filter(e=>e.drop==='fx'&&e.from<=tier).map(e=>e.id);else if(c.kind==='rare')ids=(c.slots||['weapon','armor']).map(s=>s==='weapon'?'w'+DROP_WT[tier]+'rr':'a'+DROP_AT[tier]+'rr');else{type='mat';ids=guildMaterialPool(c.kind,tier);if(!ids.length)ids=guildMaterialPool('common',tier);}
    let fallback=false;if(type==='gear'){ids=ids.filter(id=>EQ[id]&&!save.owned.includes(id));if(!ids.length){type='mat';ids=guildMaterialPool('common',tier);fallback=true;}}return{type,ids,n:fallback?25:c.n||1,pick:c.pick||1,fallback};
  }
  function guildFind(id){return guildById[id]||guildDaily().find(q=>q.id===id);}
  function guildClaim(id,selected=[],donated=[]){guildEnsureDay();const q=guildFind(id);if(state!=='town'||!q||!guildOpen(q)||guildClaimed(q)||!guildProgress(q).ready)return false;const c=guildChoices(q),unique=a=>Array.isArray(a)&&new Set(a).size===a.length;
    if(c&&(!unique(selected)||selected.length!==c.pick||!selected.every(k=>c.ids.includes(k))))return false;
    const consume={...(q.delivery?.mats||{})};if(q.delivery?.pick){if(!unique(donated)||donated.length!==q.delivery.pick||!donated.every(k=>craftMats[k]?.kind==='common'&&craftHave(k)>=q.delivery.n))return false;for(const k of donated)consume[k]=q.delivery.n;}if(Object.entries(consume).some(([k,n])=>craftHave(k)<n))return false;
    const mats={...(q.reward.mats||{})},items={...(q.reward.items||{})},equipment=[];if(c)for(const k of selected)if(c.type==='mat')mats[k]=(mats[k]||0)+c.n;else equipment.push(k);
    if(Object.entries(mats).some(([k,n])=>craftHave(k)-(consume[k]||0)+n>999999)||Object.entries(items).some(([k,n])=>(save.items[k]||0)+n>ITEM_MAX)){toast('所持上限です。素材や道具を使ってから報告してください。','#ffbb88');return false;}
    const before=JSON.stringify(save);try{if(q.dailyKind)save.guild.daily.claimed.push(q.dailyKind);else save.guild.claimed[q.id]=true;for(const[k,n]of Object.entries(consume))save.materials[k]-=n;for(const[k,n]of Object.entries(mats))save.materials[k]=craftHave(k)+n;for(const[k,n]of Object.entries(items))save.items[k]=(save.items[k]||0)+n;for(const k of equipment)save.owned.push(k);save.gold+=q.reward.gold||0;if(q.reward.title&&!save.guild.titles.includes(q.reward.title))save.guild.titles.push(q.reward.title);const receipt={mats,items,gear:equipment,gold:q.reward.gold||0,title:q.reward.title||''};if(q.dailyKind)save.guild.daily.receipts[q.dailyKind]=receipt;else save.guild.receipts[q.id]=receipt;bestSyncOwned();localStorage.setItem('bumphero_save',JSON.stringify(save));}catch(e){save=JSON.parse(before);toast('保存できませんでした。納品と報酬は元に戻しました。','#ff9a8a');return false;}
    guildReadyCache.at=-99;toast('依頼達成！ 報酬を受け取りました。','#f2d180');A.sfx('chest');return true;
  }
  function guildRunStart(){guildRun={clock:0,skills:{},skillUses:0,healUses:0,killed:new Set(),lowHeal:false,hitSeq:0,dodges:0,bossDodges:0,rollId:0,dodgeRoll:-1,comboActive:false,swings:new Map(),boss:null,bossHp:0,bossDamage:0,finalized:false,build:['weapon','armor','boots','charm'].map(k=>save.eq[k]||'-').join('|'),gearAtStart:Object.values(save.eq).filter(Boolean),rescue:0,rescueTime:0,gale:0,lastRoll:-99};}
  function guildBossStart(B){if(guildRun){guildRun.boss=B;guildRun.bossHp=B.maxHp;guildRun.bossDamage=0;guildRun.bossDodges=0;}}
  function guildSampleBoss(){if(hardRun?.bosses.length){for(const B of hardRun.bosses){const hp=Math.max(0,B.hp);if(hp<B.hardPrevHp){const n=Math.min(100-B.hardDamage,(B.hardPrevHp-hp)/B.maxHp*100);if(n>0){guildInc('damage:'+B.type,n);B.hardDamage+=n;}}B.hardPrevHp=hp;}return;}const r=guildRun,B=r?.boss;if(!B)return;const hp=Math.max(0,B.hp);if(hp<r.bossHp){const n=Math.min(100-r.bossDamage,(r.bossHp-hp)/B.maxHp*100);if(n>0){guildInc('damage:'+B.type,n);r.bossDamage+=n;}}r.bossHp=hp;}
  function guildRetreat(){if(guildRun&&!guildRun.finalized){guildSampleBoss();if(guildRun.lowHeal)guildInc('lowClear');guildRun.finalized=true;}}
  function guildClear(){const r=guildRun;if(!r||r.finalized)return;guildSampleBoss();r.finalized=true;guildInc('clear:'+dIdx);guildInc('boss:'+D.boss);guildDayInc('clear');guildDayInc('boss');for(const id of Object.keys(r.skills))save.guild.stats.skills[id]=true;if(!r.skillUses)guildInc('noSkill:'+dIdx);if(!r.healUses)guildInc('noHeal:'+dIdx);if(r.lowHeal)guildInc('lowClear');if(r.dodges>=5)guildInc('clearDodge5');if(r.bossDodges>=3)guildInc('bossDodge3:'+dIdx);if(hero.hp>=hero.s.maxHp*.5)guildInc('highHp:'+dIdx);if(r.killed.size>=4)guildInc('diverseClear:'+dIdx);if(r.gearAtStart.some(k=>EQ[k]?.craft||forgeDonor(EQ[k])?.craft))guildInc('craftEquipClear');if(['weapon','armor','boots'].every(k=>!!save.eq[k])){const a=save.guild.stats.builds[dIdx]||(save.guild.stats.builds[dIdx]=[]);if(!a.includes(r.build)&&a.length<64&&(!a.length||a.some(old=>r.build.split('|').some((id,i)=>id!=='-'&&id!==old.split('|')[i]))))a.push(r.build);}}
  function guildKill(e){if(guildRun&&!bestPainting){guildInc('kill');guildInc('kill:'+e.type);guildRun.killed.add(e.type);guildDayInc('kill');}}
  function guildMaterial(k,n){if(guildRun&&!bestPainting){guildInc('mat:'+k,n);guildInc('materialCount',n);guildDayInc('mat',n);}}
  function guildCraft(id){if(save.guild){save.guild.stats.crafts[id]=true;guildDirty=true;persist();}}
  function guildSkill(id){if(guildRun){guildRun.skills[id]=true;guildRun.skillUses++;}}
  function guildItem(healing=false){if(guildRun&&healing){guildRun.healUses++;if(hero.hp<=hero.s.maxHp*.3)guildRun.lowHeal=true;}}
  function guildHeal(n,from){if(guildRun&&from==='item'&&n>0&&hero.s.fx.guild_rescue){guildRun.rescue=n*.25;guildRun.rescueTime=4;}}
  function guildHit(){if(guildRun){guildRun.hitSeq++;guildRun.rescue=guildRun.rescueTime=guildRun.gale=0;guildRun.lastRoll=-99;}}
  function guildRoll(){if(guildRun){const r=guildRun;r.rollId++;r.gale=r.clock-r.lastRoll<=2?Math.min(3,r.gale+1):0;r.lastRoll=r.clock;}}
  function guildDodge(){const r=guildRun;if(!r||!(hero?.roll>0)||r.dodgeRoll===r.rollId)return;r.dodgeRoll=r.rollId;r.dodges++;if(state==='boss')r.bossDodges++;guildInc('dodge');}
  const guildRollScale=()=>hero?.s.fx.guild_gale&&guildRun?1+guildRun.gale*.08:1;
  function guildWhiffReady(e){return!!(guildRun&&e.guildWhiffUntil>guildRun.clock);}
  function guildRam(e){if(guildWhiffReady(e)){guildInc('whiffRam');e.guildWhiffUntil=0;}e.guildRamUntil=(guildRun?.clock||0)+1.4;e.guildWallSeen=false;}
  function guildWall(e){if(guildRun&&!e.guildWallSeen&&e.guildRamUntil>guildRun.clock){e.guildWallSeen=true;guildInc('wall');}}
  function guildTick(dt){const r=guildRun;if(!r||!hero||bestPainting)return;r.clock+=dt;guildSampleBoss();if(combo>=10&&!r.comboActive){guildInc('combo10');r.comboActive=true;}if(combo<10)r.comboActive=false;if(r.rescueTime>0&&hero.s.fx.guild_rescue){const n=Math.min(r.rescue,dt*r.rescue/Math.max(dt,r.rescueTime));hero.hp=Math.min(hero.s.maxHp,hero.hp+n);r.rescue-=n;r.rescueTime=Math.max(0,r.rescueTime-dt);}
    for(const B of livingBosses()){const active=new Set(B.sweeps.filter(s=>s.t>=s.tele&&s.left>0));for(const s of active)if(!r.swings.has(s))r.swings.set(s,{owner:B,hit:r.hitSeq,near:hyp(B.x-hero.x,B.y-hero.y)<s.len+hero.r+15});for(const[s,rec]of r.swings){if(rec.owner!==B)continue;if(active.has(s)&&!(hero.roll>0)&&segDist(hero.x,hero.y,B.x+Math.cos(s.ang)*B.r*.6,B.y+Math.sin(s.ang)*B.r*.6,B.x+Math.cos(s.ang)*s.len,B.y+Math.sin(s.ang)*s.len)<s.w+hero.r*.7)rec.contact=true;if(!active.has(s)){if(rec.near&&!rec.contact&&rec.hit===r.hitSeq)B.guildWhiffUntil=r.clock+1;r.swings.delete(s);}}}
    for(const e of enemies){if(e.dead)continue;const slash=e.st==='slash'&&(e.ai==='swing'||e.ai==='assassin');if(slash&&!e.guildSlash)e.guildSlash={hit:r.hitSeq,near:hyp(e.x-hero.x,e.y-hero.y)<(e.mod.reach||72)+hero.r+25};if(slash&&e.guildSlash&&!(hero.roll>0)){const a=Math.atan2(hero.y-e.y,hero.x-e.x),da=Math.abs(Math.atan2(Math.sin(a-e.face),Math.cos(a-e.face)));if(hyp(hero.x-e.x,hero.y-e.y)<(e.mod.reach||72)+hero.r&&da<1.25)e.guildSlash.contact=true;}if(!slash&&e.guildSlash){if(e.guildSlash.near&&!e.guildSlash.contact&&e.guildSlash.hit===r.hitSeq)e.guildWhiffUntil=r.clock+1;e.guildSlash=null;}}
  }
  function guildPoll(dt){if(!save.guild)return;guildDateT+=dt;if(guildDateT>=1){guildDateT=0;const before=save.guild.daily.day;guildEnsureDay();if(before!==save.guild.daily.day&&state==='town'&&inside==='guild'&&panelOpen&&(guildTab==='daily'||guildDetailId?.startsWith('daily:'))){toast('デイリー依頼を更新しました。','#d8ce98');openGuild();}}if(guildDirty&&(guildSaveT+=dt)>=1){persist();guildDirty=false;guildSaveT=0;}}
  function guildDraw(){if(!hero?.s.fx.guild_lantern)return;ctx.save();ctx.strokeStyle='rgba(234,213,133,.55)';ctx.lineWidth=1.5;for(const e of enemies)if(!e.dead&&(e.sub||e.alpha<.2)&&hyp(e.x-hero.x,e.y-hero.y)<260){const y=sy(e.y);ctx.beginPath();ctx.ellipse(e.x,y,Math.max(8,e.r*.7),4,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='rgba(234,213,133,.7)';ctx.fillRect(e.x-1.5,y-10,3,3);}ctx.restore();}
  function guildReadyCount(){if(!save.guild)return 0;if(globalT-guildReadyCache.at>.75||guildReadyCache.at>globalT){guildReadyCache.count=[...GUILD,...guildDaily()].filter(q=>guildOpen(q)&&!guildClaimed(q)&&guildProgress(q).ready).length;guildReadyCache.at=globalT;}return guildReadyCache.count;}
  function guildNoticeHtml(){const n=guildReadyCount();return n?'<p class="guild-note">ギルドに報告できる依頼が '+n+'件あります。</p>':'';}
  function guildRewardHtml(q){const received=guildClaimed(q)&&(q.dailyKind?save.guild.daily.receipts?.[q.dailyKind]:save.guild.receipts[q.id]);if(received)return '受取済み：<br>'+[...Object.entries(received.mats).map(([k,n])=>craftArtImg('material',k,24)+craftMats[k].name+' ×'+n),...Object.entries(received.items).map(([k,n])=>icon(k,24)+ITEMS[k].name+' ×'+n),...received.gear.map(k=>eqIcon(EQ[k],24)+EQ[k].name),...(received.gold?[received.gold+' G']:[]),...(received.title?['記念称号「'+received.title+'」']:[])].join('<br>');const r=q.reward,a=[];for(const[k,n]of Object.entries(r.mats||{}))a.push(craftArtImg('material',k,24)+craftMats[k].name+' ×'+n);for(const[k,n]of Object.entries(r.items||{}))a.push(icon(k,24)+ITEMS[k].name+' ×'+n);if(r.gold)a.push(r.gold+' G');if(r.title)a.push('記念称号「'+r.title+'」');const c=guildChoices(q);if(c)a.push(c.type==='gear'?'装備を'+c.pick+'個選択：'+c.ids.slice(0,3).map(k=>EQ[k].name).join('／')+(c.ids.length>3?' ほか'+(c.ids.length-3)+'品':''):(c.fallback?'装備は所持済み：':'')+'素材を'+c.pick+'種類選択（各'+c.n+'個）');return a.join('<br>');}
  function openGuild(){facilitySelect('guild',guildTab);guildDetailId=null;guildEnsureDay();guildSyncCrafts();bestSyncOwned();let list=[...GUILD,...guildDaily()].filter(guildOpen);const ready=list.filter(q=>!guildClaimed(q)&&guildProgress(q).ready).length,labels={recommended:'おすすめ',regular:'常設',challenge:'挑戦',collection:'長期',daily:'デイリー',claimed:'受取済み',titles:'称号'};if(guildTab==='claimed')list=list.filter(guildClaimed);else if(guildTab==='titles')list=[];else{list=list.filter(q=>!guildClaimed(q));if(guildTab!=='recommended')list=list.filter(q=>q.group===guildTab);}list.sort((a,b)=>Number(guildProgress(b).ready)-Number(guildProgress(a).ready)||guildProgress(b).ratio-guildProgress(a).ratio||a.stage-b.stage);if(guildTab==='recommended')list=list.filter(q=>q.group==='regular'||q.group==='daily'||guildProgress(q).ready||guildProgress(q).ratio>=.5).slice(0,6);
    openPanel('冒険者ギルド',`<div class="guild-head"><b>報告できる依頼 ${ready}件</b><span>受取済み ${Object.keys(save.guild.claimed).length} / ${GUILD.length}</span></div>${guildTab==='daily'?'<p class="guild-note">'+save.guild.daily.day+' の依頼・毎日0時（日本時間）に更新。未受取の報酬も更新されます。</p>':''}`+(guildTab==='titles'?''+['魔物博士','世界の素材収集家'].map(t=>'<div class="guild-title">'+(save.guild.titles.includes(t)?t:'？？？（未獲得）')+'</div>').join(''):list.map(q=>{const p=guildProgress(q);return `<button class="guild-card${p.ready?' guild-complete':''}" data-guild="${q.id}"><span class="guild-status">${guildClaimed(q)?'受取済み':p.ready?'報告可能':q.dailyKind?'デイリー':q.group==='challenge'?'任意の挑戦':'進行中'}</span><b>${q.name}</b><small>${q.id.startsWith('b')?DUNGEONS[q.stage].name+'／':''}${q.desc}</small><span class="guild-progress" role="progressbar" aria-valuenow="${Math.round(p.ratio*100)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p.ratio*100}%"></i></span><span>${p.rows.map(([v,n])=>Math.min(n,Math.floor(v))+' / '+n).join(' ・ ')}</span><em>${guildRewardHtml(q)}</em></button>`;}).join('')||'<p class="craft-intro">この分類の依頼は、今はありません。</p>'),[['ギルドを出る',closePanel]],'guild');craftBind('[data-guild-tab]',b=>{guildTab=b.dataset.guildTab;openGuild();});craftBind('[data-guild]',b=>openGuildMission(b.dataset.guild));
  }
  function openGuildMission(id){guildEnsureDay();const q=guildFind(id);if(!q||!guildOpen(q)){openGuild();return;}guildDetailId=id;const p=guildProgress(q),c=guildChoices(q),selected=[],donated=[],done=guildClaimed(q);
    openPanel(q.name,`${q.id.startsWith('b')?'<p class="guild-note">対象：'+DUNGEONS[q.stage].name+'／'+BOSSES[DUNGEONS[q.stage].boss].name+'</p>':''}<p class="guild-status">${q.group==='challenge'?'挑戦依頼':q.dailyKind?'本日の依頼':'常設依頼'}</p><p class="craft-effect${p.ready?' guild-complete':''}">${q.desc}</p><p>進捗：${p.rows.map(([v,n])=>Math.min(n,Math.floor(v))+' / '+n).join(' ・ ')}</p><h3>報酬</h3><div class="guild-reward">${guildRewardHtml(q)}</div>${c&&!done?'<h3>受け取る品を'+c.pick+'個選ぶ</h3>'+c.ids.map(k=>`<button class="guild-choice" data-guild-choice="${k}" aria-pressed="false">${c.type==='gear'?eqIcon(EQ[k])+`<span><b>${EQ[k].name}</b><small>${eqStats(EQ[k])}</small><small>${Object.keys(EQ[k].fx||{}).map(f=>FX[f].note).join('・')||'固有効果なし'}</small><small>現在の装備：${EQ[save.eq[EQ[k].slot]]?.name||'なし'} ${EQ[save.eq[EQ[k].slot]]?eqStats(EQ[save.eq[EQ[k].slot]]):''}</small></span>`:craftArtImg('material',k)+`<span>${craftMats[k].name} ×${c.n}<small>所持 ${craftHave(k)}</small></span>`}</button>`).join(''):''}${q.delivery?.pick&&!done?'<h3>納品する素材を3種類選ぶ（各10個）</h3>'+Object.entries(craftMats).filter(([k,m])=>m.kind==='common'&&craftHave(k)>=10).map(([k,m])=>`<button class="guild-choice" data-guild-donate="${k}" aria-pressed="false">${craftArtImg('material',k)}${m.name} ×10（所持 ${craftHave(k)}）</button>`).join(''):''}<p class="guild-note">${done?'受取済み':!p.ready?'進行中':'報告可能'}</p><button class="btn primary" data-guild-claim ${done||!p.ready||c||q.delivery?.pick?'disabled':''}>${done?'受取済み':q.delivery?'納品して報酬を受け取る':'報酬を受け取る'}</button>`,[['依頼一覧へ',openGuild]],'guild');
    const toggle=(arr,k,max,sel)=>{const i=arr.indexOf(k);if(i>=0)arr.splice(i,1);else{if(arr.length>=max)arr.shift();arr.push(k);}panelBody.querySelectorAll(sel).forEach(b=>b.setAttribute('aria-pressed',String(arr.includes(b.dataset.guildChoice||b.dataset.guildDonate))));panelBody.querySelector('[data-guild-claim]').disabled=done||!p.ready||!!c&&selected.length!==c.pick||!!q.delivery?.pick&&donated.length!==q.delivery.pick;};craftBind('[data-guild-choice]',b=>toggle(selected,b.dataset.guildChoice,c.pick,'[data-guild-choice]'));craftBind('[data-guild-donate]',b=>toggle(donated,b.dataset.guildDonate,q.delivery.pick,'[data-guild-donate]'));craftBind('[data-guild-claim]',()=>{if(guildClaim(id,selected,donated))openGuildMission(id);else{toast('条件・選択・更新日時を確認してください。','#ffbf8a');openGuild();}},null);
  }
  // GUILD END

  // FORGE BEGIN — maintained in tools/forge/runtime.inc.js.
  const FORGE_CRYSTAL='継承結晶',FORGE_CAP=999999;
  const forgeRawFx=e=>e?Object.fromEntries(Object.entries(e.fx||{}).filter(([k,v])=>Object.hasOwn(FX,k)&&Number.isFinite(v)&&v>0)):{};
  function forgeDonor(e){const id=e&&save.forge?.inherited?.[e.id];return id&&Object.hasOwn(EQ,id)?EQ[id]:null;}
  function forgeFx(e){return {...forgeRawFx(e),...forgeRawFx(forgeDonor(e))};}
  const forgeHasEffect=k=>(save.owned||[]).some(id=>forgeFx(EQ[id])[k]);
  function forgeNormalize(){
    const f=save.forge&&typeof save.forge==='object'?save.forge:{},inherited={};
    for(const [id,source] of Object.entries(f.inherited||{})){
      const b=Object.hasOwn(EQ,id)&&EQ[id],d=typeof source==='string'&&Object.hasOwn(EQ,source)&&EQ[source];
      if(b&&d&&save.owned.includes(id)&&id!==source&&b.slot===d.slot&&!Object.keys(forgeRawFx(b)).length&&Object.keys(forgeRawFx(d)).length)inherited[id]=source;
    }
    const upgrades={};for(const[id,values]of Object.entries(f.upgrades||{})){const e=EQ[id];if(!e||!save.owned.includes(id)||!values||typeof values!=='object')continue;const clean={};for(const k of smithKeys(e)){const n=values[k];if(Number.isSafeInteger(n)&&n>0)clean[k]=Math.min(n,Math.max(0,SMITH_CAP-smithBase(e,k)));}if(Object.keys(clean).length)upgrades[id]=clean;}
    save.forge={v:2,upgrades,pinkSerial:Number.isSafeInteger(f.pinkSerial)&&f.pinkSerial>=0?f.pinkSerial:0,crystals:Number.isSafeInteger(f.crystals)&&f.crystals>=0?Math.min(FORGE_CAP,f.crystals):0,inherited,receipts:Array.isArray(f.receipts)?[...new Set(f.receipts.filter(k=>typeof k==='string'&&/^[a-zA-Z0-9_:-]{1,120}$/.test(k)))]:[]};
  }
  // Future drop/reward callers must supply a stable, unique receipt. No ad bridge or free grant is installed.
  function forgeGrantCrystals(n,receipt){
    const f=save.forge;if(!f||!Number.isSafeInteger(n)||n<1||typeof receipt!=='string'||!/^[a-zA-Z0-9_:-]{1,120}$/.test(receipt)||f.receipts.includes(receipt)||f.crystals+n>FORGE_CAP)return false;
    const before=JSON.stringify(save);try{f.crystals+=n;f.receipts.push(receipt);bestObtain('forge:crystal');localStorage.setItem('bumphero_save',JSON.stringify(save));}catch(e){save=JSON.parse(before);return false;}return true;
  }
  function pinkCrystalDrop(e){
    if(e.crystalAwarded)return true;
    const before=JSON.stringify(save),serial=save.forge.pinkSerial+1;save.forge.pinkSerial=serial;
    if(!forgeGrantCrystals(1,'pink:'+serial)){save=JSON.parse(before);e.crystalPending=true;e.hp=Math.max(1,e.hp);if(!e.crystalNotice){e.crystalNotice=true;toast('結晶を保存できませんでした。獲得を再試行します。','#ffbbdd');}return false;}
    e.crystalAwarded=true;e.crystalPending=false;return true;
  }
  const forgeBase=e=>!!e&&save.owned.includes(e.id)&&['weapon','armor','boots','charm'].includes(e.slot)&&!Object.keys(forgeFx(e)).length;
  const forgeSource=e=>!!e&&save.owned.includes(e.id)&&!forgeDonor(e)&&Object.keys(forgeRawFx(e)).length>0;
  function forgeCheck(base,source){
    const b=Object.hasOwn(EQ,base)&&EQ[base],d=Object.hasOwn(EQ,source)&&EQ[source];
    if(state!=='town')return '町の合成屋で継承してください。';
    if(!forgeBase(b))return '受け皿は、所持している特殊効果なしの装備を選んでください。';
    if(!forgeSource(d)||base===source||b.slot!==d.slot)return '効果元は、同じ部位の特殊効果つき装備を選んでください。継承済み装備は使えません。';
    if(save.forge.crystals<1)return FORGE_CRYSTAL+'が1個必要です。';
    return '';
  }
  function forgeInherit(base,source){
    const error=forgeCheck(base,source);if(error){toast(error,'#ffbb88');return false;}
    const before=JSON.stringify(save),b=EQ[base];
    try{
      bestSyncOwned();guildSyncCrafts();save.forge.crystals--;save.forge.inherited[base]=source;
      save.owned=save.owned.filter(id=>id!==source);delete save.forge.upgrades[source];if(save.eq[b.slot]===source)save.eq[b.slot]=base;
      if(save.hp!=null)save.hp=Math.min(save.hp,stats().maxHp);
      localStorage.setItem('bumphero_save',JSON.stringify(save));
    }catch(e){save=JSON.parse(before);toast('保存できませんでした。装備と結晶は元に戻しました。','#ff9a8a');return false;}
    guildReadyCache.at=-99;toast('特殊効果を継承しました！','#f2c14e');A.sfx('equip');return true;
  }
  let forgeCrystalSrc='';
  function forgeCrystalIcon(size=32){
    if(!forgeCrystalSrc){const[c,x]=SPR.util.canvas(32,32),g=SPR.util.api(x);g.poly([[16,3],[25,11],[23,23],[16,28],[7,23],[6,11]],'#5b4b91');g.poly([[16,5],[22,12],[16,18],[9,12]],'#d1c5fc');g.poly([[9,13],[16,19],[16,26],[9,22]],'#9b80d0');g.poly([[17,19],[23,13],[21,22],[17,26]],'#7960b6');g.line(16,7,16,15,1,'#fff1d4');g.r(3,6,4,1,'#f2c14e');g.r(5,4,1,5,'#f2c14e');g.r(25,24,4,1,'#f2c14e');g.r(27,22,1,5,'#f2c14e');SPR.util.pixelize(c,'#181c32');forgeCrystalSrc=c.toDataURL();}
    return `<img class="ico" src="${forgeCrystalSrc}" width="${size}" height="${size}" alt="">`;
  }
  function forgeCrystalBagHtml(ownedOnly){return ownedOnly&&!save.forge.crystals?'':`<button class="craft-material" data-forge-crystal>${forgeCrystalIcon()}<span class="craft-material-name">${FORGE_CRYSTAL}<small>効果継承専用・希少スライム／連戦初回</small></span><b>×${save.forge.crystals}</b></button>`;}
  function openForgeCrystal(back,room='craft'){
    openPanel(FORGE_CRYSTAL,`<div class="craft-detail-art">${forgeCrystalIcon(64)}</div><p>所持数：${save.forge.crystals}</p><h3>入手先</h3>${uiMonsterCard(bestByKey['enemy:pinkdiamondslime'])}<p>連戦場の初回クリア報酬</p>${facilityDetail(FORGE_CRYSTAL,['効果継承に使う希少な結晶です。希少なスライムの討伐や、連戦場の初回クリアで手に入ります。'])}`,[['もどる',back]],room);
    uiBindEnemies(()=>openForgeCrystal(back,room),room);
  }

  const forgeEffectHtml=e=>Object.keys(forgeFx(e)).map(k=>'◆'+FX[k].note).join('<br>');
  const forgeObtainNote=e=>e.craft?'消費後は合成屋で再作成できます。':e.guild?'ギルド限定品です。同じ依頼の報酬は再受取できません。':e.drop?'消費後はドロップなどで再入手が必要です。':'消費後は再入手が必要です。';
  let forgeSlot='weapon';
  function openForge(base='',source=''){
    facilitySelect('craft','inherit');
    const b=Object.hasOwn(EQ,base)&&EQ[base],d=Object.hasOwn(EQ,source)&&EQ[source];
    if(b&&forgeBase(b))forgeSlot=b.slot;else base='';if(!forgeSource(d)||d.slot!==forgeSlot)source='';
    const targets=EQUIP.filter(e=>e.slot===forgeSlot&&forgeBase(e)),donors=EQUIP.filter(e=>e.slot===forgeSlot&&forgeSource(e));
    const row=(e,kind,selected)=>`<button class="pickrow forge-choice" data-forge-${kind}="${e.id}" aria-pressed="${selected===e.id}">${eqIcon(e)}<span class="sn"><span>${e.name}${save.eq[e.slot]===e.id?'（装備中）':''}</span><small>${eqStats(e)||'数値補正なし'}</small>${kind==='source'?'<small>'+forgeEffectHtml(e)+'</small>':''}</span></button>`;
    openPanel('合成屋：効果継承',`<div class="tabs craft-tabs">${Object.entries(SLOT_NAME).map(([slot,name])=>`<button data-forge-slot="${slot}" aria-pressed="${slot===forgeSlot}">${name}</button>`).join('')}</div><button class="pickrow" data-forge-crystal>${forgeCrystalIcon()}<span class="sn">${FORGE_CRYSTAL} ×${save.forge.crystals}<small>1回につき1個消費・希少スライム／連戦初回</small></span></button><h3>1. 受け皿の装備（残ります）</h3>${targets.map(e=>row(e,'base',base)).join('')||'<p class="craft-intro">この部位の、特殊効果なしの装備を持っていません。</p>'}<h3>2. 効果元の装備（消えます）</h3>${donors.map(e=>row(e,'source',source)).join('')||'<p class="craft-intro">この部位の、特殊効果つき装備を持っていません。</p>'}<button class="btn primary" data-forge-preview ${!base||!source?'disabled':''}>継承内容を確認</button>`,[['合成屋へ',openCraftShop]],'craft');
    craftBind('[data-forge-slot]',el=>{forgeSlot=el.dataset.forgeSlot;openForge();});craftBind('[data-forge-base]',el=>openForge(el.dataset.forgeBase,source));craftBind('[data-forge-source]',el=>openForge(base,el.dataset.forgeSource));craftBind('[data-forge-crystal]',()=>openForgeCrystal(()=>openForge(base,source)));craftBind('[data-forge-preview]',()=>openForgeConfirm(base,source));
  }
  function openForgeConfirm(base,source){facilitySelect('craft','inherit');
    const b=Object.hasOwn(EQ,base)&&EQ[base],d=Object.hasOwn(EQ,source)&&EQ[source];if(!forgeBase(b)||!forgeSource(d)||b.slot!==d.slot){openForge();return;}
    const error=forgeCheck(base,source);
    openPanel('効果継承の確認',`<h3>完成する装備</h3><div class="craft-effect">${eqIcon(b)} ${b.name}<br>${eqStats(b)||'数値補正なし'}<br><span class="forge-effect">${forgeEffectHtml(d)}</span></div><h3>消費するもの</h3><p>${eqIcon(d)} ${d.name} ×1<br>${forgeCrystalIcon(24)} ${FORGE_CRYSTAL} ×1（所持 ${save.forge.crystals}）</p><p class="craft-intro">${forgeObtainNote(d)}${save.eq[d.slot]===source?' 装備中の効果元が消えるため、完成装備へ自動で付け替えます。':''}</p><label class="forge-consent"><input type="checkbox" data-forge-consent>効果元の装備と結晶が消費されることを確認しました</label>${error?'<p class="hpc">'+error+'</p>':''}<button class="btn primary" data-forge-confirm disabled>消費して継承する</button>`,[['選び直す',()=>openForge(base,source)]],'craft');
    const consent=panelBody.querySelector('[data-forge-consent]'),button=panelBody.querySelector('[data-forge-confirm]');consent.addEventListener('change',()=>{A.sfx('select');button.disabled=!consent.checked||!!forgeCheck(base,source);});
    craftBind('[data-forge-confirm]',()=>{if(!consent.checked)return;button.disabled=true;if(forgeInherit(base,source)){openPanel('効果を継承しました',`<div class="craft-effect">${eqIcon(b)} ${eqName(b)}<br>${eqStats(b)}<br><span class="forge-effect">${forgeEffectHtml(b)}</span></div><p class="craft-intro">${d.name}と${FORGE_CRYSTAL}1個を消費しました。${forgeObtainNote(d)}</p>`,[['効果継承へ',openForge],['合成屋へ',openCraftShop]],'craft');}else openForgeConfirm(base,source);},null);
  }
  const SMITH_CAP=999,SMITH_STEP=5,SMITH_NAMES={atk:'攻撃',def:'防御',hp:'HP',ram:'突進値'};
  function smithKeys(e){return e?['atk','def','hp','ram'].filter(k=>(k==='ram'?e.slot==='boots':e[k]>0)||k==={weapon:'atk',armor:'def',charm:'hp'}[e.slot]&&(!['atk','def','hp'].some(j=>e[j]>0)||e.slot!=='charm')):[];}
  const smithBase=(e,k)=>k==='ram'?Math.round((e.ram||1)*100):Math.round(e[k]||0);
  function smithValue(e,k){return Math.min(SMITH_CAP,smithBase(e,k)+(save.owned.includes(e.id)?save.forge?.upgrades?.[e.id]?.[k]||0:0));}
  function smithBootEffects(e,value=smithValue(e,'ram')){const base=smithBase(e,'ram'),t=clamp((value-base)/Math.max(1,SMITH_CAP-base),0,1);return{speed:(e.ram||1)+(3-(e.ram||1))*t,power:1+2*t};}
  function smithEquipment(e){if(!e)return e;const out={...e};for(const k of smithKeys(e)){const v=smithValue(e,k);if(k==='ram'){const b=smithBootEffects(e,v);out.ram=b.speed;out.ramPower=b.power;}else if(v!==smithBase(e,k))out[k]=v;}return out;}
  function smithQuote(id,k){
    const e=EQ[id];if(!e||!save.owned.includes(id)||!smithKeys(e).includes(k))return null;
    const v=smithValue(e,k);if(v>=SMITH_CAP)return {current:v,next:v,cap:true,gold:0,mats:{}};
    const rank=k==='ram'?Math.max(0,v-100):v;
    const mats={[{weapon:'m11',armor:'m15',boots:'m02',charm:'m18'}[e.slot]]:1+Math.ceil(rank*rank/10000)};
    if(rank>=150)mats.m18=(mats.m18||0)+Math.ceil((rank-100)/30);
    if(rank>=300)mats.s07=Math.ceil((rank-250)/80);
    if(rank>=600)mats.core20=1+Math.floor((rank-600)/100);
    if(rank>=850)mats.core30=Math.ceil((rank-800)/100);
    if(k==='ram'){for(const m of Object.keys(mats))mats[m]*=3;if(rank>=100)mats.s06=1+Math.floor(rank/200);if(rank>=300)mats.core08=Math.ceil(rank/200);if(rank>=600)mats.core19=Math.ceil((rank-500)/200);}
    return{current:v,next:Math.min(SMITH_CAP,v+SMITH_STEP),cap:false,gold:20+Math.ceil(rank*rank/100)+Math.ceil(rank**3/100),mats};
  }
  function smithUpgrade(id,k,expected){
    if(state!=='town'||arenaRun)return false;const q=smithQuote(id,k);if(!q||q.cap||q.current!==expected||save.gold<q.gold||Object.entries(q.mats).some(([m,n])=>(save.materials[m]||0)<n))return false;
    const before=JSON.stringify(save);try{save.gold-=q.gold;for(const[m,n]of Object.entries(q.mats))save.materials[m]-=n;(save.forge.upgrades[id]||={})[k]=q.next-smithBase(EQ[id],k);localStorage.setItem('bumphero_save',JSON.stringify(save));}catch(e){save=JSON.parse(before);return false;}
    A.sfx('equip');return true;
  }
  let smithSlot='weapon';
  function openSmith(){
    facilitySelect('smith','upgrade');
    if(state!=='town'||arenaRun)return;
    const list=EQUIP.filter(e=>e.slot===smithSlot&&save.owned.includes(e.id));
    openPanel('鍛冶屋：装備強化',`<div class="tabs">${Object.entries(SLOT_NAME).map(([k,n])=>`<button data-smith-slot="${k}" aria-pressed="${k===smithSlot}">${n}</button>`).join('')}</div>`+list.map(e=>`<button class="pickrow" data-smith-item="${e.id}">${eqIcon(e)}<span class="sn">${eqName(e)}<small>${eqStats(e)||'数値補正なし'}</small></span></button>`).join(''),[['店を出る',closePanel]],'smith');
    craftBind('[data-smith-slot]',b=>{smithSlot=b.dataset.smithSlot;openSmith();});craftBind('[data-smith-item]',b=>openSmithItem(b.dataset.smithItem));
  }
  function openSmithItem(id){
    facilitySelect('smith','upgrade');
    const e=EQ[id];if(!e||!save.owned.includes(id)||state!=='town'||arenaRun)return;
    openPanel(e.name+'：強化',`<div class="craft-effect">${eqIcon(e)} ${eqName(e)}<br>${eqStats(e)}</div><p class="ui-summary">所持 ${save.gold.toLocaleString()} G ／ 上限999</p>`+smithKeys(e).map(k=>{const q=smithQuote(id,k),ok=!q.cap&&save.gold>=q.gold&&Object.entries(q.mats).every(([m,n])=>(save.materials[m]||0)>=n);return `<div class="row"><span class="nm">${SMITH_NAMES[k]} ${q.current} → ${q.next}${q.cap?'（上限）':''}</span><span class="sub">基礎 ${smithBase(e,k)} ／ 上限まであと ${Math.ceil((SMITH_CAP-q.current)/SMITH_STEP)}回<br>${q.cap?'':q.gold.toLocaleString()+' G'+Object.entries(q.mats).map(([m,n])=>uiMaterialCost(m,n)).join('')}${k==='ram'?'<br>移動 ×'+smithBootEffects(e,q.current).speed.toFixed(2)+' → ×'+smithBootEffects(e,q.next).speed.toFixed(2)+'<br>体当たり威力 ×'+smithBootEffects(e,q.current).power.toFixed(2)+' → ×'+smithBootEffects(e,q.next).power.toFixed(2):''}</span><span class="act"><button class="sbtn" data-smith-preview="${k}" ${ok?'':'disabled'}>${q.cap?'上限到達':'強化内容を確認'}</button></span></div>`;}).join(''),[['装備一覧へ',openSmith]],'smith');
    uiBindMaterials(()=>openSmithItem(id),'smith');craftBind('[data-smith-preview]',b=>openSmithConfirm(id,b.dataset.smithPreview));
  }
  function openSmithConfirm(id,k){
    facilitySelect('smith','upgrade');
    const q=smithQuote(id,k);if(!q||q.cap||state!=='town'||arenaRun)return;
    openPanel('装備強化の確認',`<p>${EQ[id].name}<br>${SMITH_NAMES[k]} ${q.current} → ${q.next}</p><p>消費：${q.gold.toLocaleString()} G<br>${Object.entries(q.mats).map(([m,n])=>uiMaterialCost(m,n,false)).join('')}</p><p>強化すると費用・素材を消費します。元には戻せません。</p>`,[['消費して強化',()=>{if(smithUpgrade(id,k,q.current))openSmithItem(id);else openPanel('強化できませんでした','<p>所持数・現在値を確認してください。保存失敗の場合は素材とゴールドを元に戻しています。</p>',[['装備へ',()=>openSmithItem(id)]],'smith');},true],['やめる',()=>openSmithItem(id)]],'smith');uiBindMaterials(()=>openSmithConfirm(id,k),'smith');
  }
  // FORGE END

  // HARD BEGIN — maintained in tools/hard/runtime.inc.js.
  const HARD_BONUS=1.5,HARD_AREA=1.5,HARD_PAIRS=Array.from({length:17},(_,i)=>[i*2,i*2+1]);
  let hardRun=null,gateMode='normal';
  const hardToday=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
  function hardNormalize(){const h=save.hard&&typeof save.hard==='object'?save.hard:{};save.hard={v:1,cleared:Object.fromEntries(Object.entries(h.cleared||{}).filter(([k,v])=>/^\d+$/.test(k)&&HARD_PAIRS[+k]&&typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)))};}
  const hardUnlocked=i=>!!HARD_PAIRS[i]&&HARD_PAIRS[i].every(k=>save.cleared[k]);
  const hardDone=i=>(save.hard?.cleared[i]||'')>=hardToday();
  function fightBosses(){return !bestPainting&&hardRun&&state==='boss'?hardRun.bosses:boss?[boss]:[];}
  const isBoss=t=>!!t&&(t===boss||!bestPainting&&hardRun?.bosses.includes(t));
  const livingBosses=()=>fightBosses().filter(b=>!b.dead);
  function withFightBoss(B,fn){
    if(!hardRun||bestPainting)return fn();
    const old=boss,ss=shades,ts=twisters,dk=darkT;boss=B;shades=B.hardShades||[];twisters=B.hardTwisters||[];darkT=B.hardDark||0;
    const before=new Set([...bullets,...zones,...rings,...enemies]);
    try{return fn();}finally{B.hardShades=B.dead?[]:shades;B.hardTwisters=B.dead?[]:twisters;B.hardDark=B.dead?0:darkT;for(const o of [...bullets,...zones,...rings,...enemies])if(!before.has(o)&&!o.hardOwner)o.hardOwner=B;boss=old;shades=ss;twisters=ts;darkT=Math.max(dk,...hardRun.bosses.filter(b=>!b.dead).map(b=>b.hardDark||0));}
  }
  function hardSegment(a,b,r){
    const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy,l=Math.sqrt(l2)||1,nx=-dy/l*r,ny=dx/l*r;
    return{a,b,dx,dy,l2,quad:[[a.x+nx,a.y+ny],[b.x+nx,b.y+ny],[b.x-nx,b.y-ny],[a.x-nx,a.y-ny]]};
  }
  function hardDistance2(s,x,y){const t=clamp(((x-s.a.x)*s.dx+(y-s.a.y)*s.dy)/s.l2,0,1);return(x-s.a.x-t*s.dx)**2+(y-s.a.y-t*s.dy)**2;}
  function hardSection(segments,r,y){
    const spans=[];
    for(const s of segments){
      let lo=Infinity,hi=-Infinity;
      for(const p of[s.a,s.b]){const d=y-p.y;if(Math.abs(d)<=r){const w=Math.sqrt(Math.max(0,r*r-d*d));lo=Math.min(lo,p.x-w);hi=Math.max(hi,p.x+w);}}
      for(let i=0;i<4;i++){const a=s.quad[i],b=s.quad[(i+1)%4];if(y<Math.min(a[1],b[1])||y>Math.max(a[1],b[1]))continue;if(a[1]===b[1]){lo=Math.min(lo,a[0],b[0]);hi=Math.max(hi,a[0],b[0]);}else{const x=lerp(a[0],b[0],(y-a[1])/(b[1]-a[1]));lo=Math.min(lo,x);hi=Math.max(hi,x);}}
      if(hi>=lo)spans.push({l:lo,r:hi});
    }
    spans.sort((a,b)=>a.l-b.l);const bands=[];for(const s of spans){const b=bands[bands.length-1];if(b&&s.l<=b.r+1e-6)b.r=Math.max(b.r,s.r);else bands.push(s);}return bands;
  }
  function hardBands(y){const m=hardRun.maze;return hardSection(m.yBins.get(Math.floor(y/m.binSize))||[],m.radius,y);}
  function hardCandidates(x,y){const m=hardRun.maze;return m.bins.get(Math.floor(x/m.binSize)+','+Math.floor(y/m.binSize))||[];}
  function hardPoint(x,y){const r=hardRun.maze.radius;return hardCandidates(x,y).some(s=>hardDistance2(s,x,y)<=r*r+1e-6);}
  function hardContains(x,y,r=0){
    const radius=hardRun.maze.radius,candidates=hardCandidates(x,y);if(!candidates.some(s=>hardDistance2(s,x,y)<=radius*radius+1e-6))return false;
    // Most actors fit wholly inside one corridor capsule; only junction edges need perimeter checks.
    if(r<=radius&&candidates.some(s=>hardDistance2(s,x,y)<=(radius-r)**2+1e-6))return true;
    for(let i=0;i<16&&r>0;i++){const a=i*Math.PI/8;if(!hardPoint(x+Math.cos(a)*r,y+Math.sin(a)*r))return false;}return true;
  }
  function hardRoom(x,y){let best=0,d=Infinity;hardRun.maze.rooms.forEach((p,i)=>{const n=(p.x-x)**2+(p.y-y)**2;if(n<d){d=n;best=i;}});return best;}
  function hardSnap(o){if(hardContains(o.x,o.y,o.r||0))return;const p=hardRun.maze.rooms[hardRoom(o.x,o.y)];o.x=p.x;o.y=p.y;o.mazeX=o.x;o.mazeY=o.y;}
  function hardConfine(o,restitution){
    let x=o.x,y=o.y,r=o.r||0,px=o.mazeX,py=o.mazeY,hit=false;
    if(!Number.isFinite(px)||!hardContains(px,py,r)){if(hardContains(x,y,r)){o.mazeX=x;o.mazeY=y;return false;}hardSnap(o);return true;}
    if(!hardContains(x,y,r)){
      if(hardContains(x,py,r)){y=py;o.vy=-(o.vy||0)*restitution;}
      else if(hardContains(px,y,r)){x=px;o.vx=-(o.vx||0)*restitution;}
      else{x=px;y=py;o.vx=-(o.vx||0)*restitution;o.vy=-(o.vy||0)*restitution;}
      hit=true;
    }
    o.x=o.mazeX=x;o.y=o.mazeY=y;if(hit)craftOnWall(o);return hit;
  }
  function hardTunnelAt(y){
    const m=hardRun.maze,bands=hardBands(clamp(y,m.minY+1,m.maxY-1)),x=hero?.x??VW/2;if(!bands.length){const p=m.rooms[hardRoom(x,y)];return{cx:p.x,w:m.radius*2};}const b=bands.reduce((a,b)=>Math.abs((a.l+a.r)/2-x)<Math.abs((b.l+b.r)/2-x)?a:b);
    return{cx:(b.l+b.r)/2,w:(b.r-b.l)*.9};
  }
  function hardSteer(e,wx,wy){
    if(e.ai==='flee'||e.ai==='pinkflee')return[wx,wy];
    // Only route a pursuit when an intervening wall blocks the direct line.
    let blocked=false;for(let k=1;k<=8;k++)if(!hardContains(e.x+(hero.x-e.x)*k/8,e.y+(hero.y-e.y)*k/8,Math.min(e.r,18))){blocked=true;break;}
    if(!blocked)return[wx,wy];const m=hardRun.maze,start=hardRoom(e.x,e.y),end=hardRoom(hero.x,hero.y),prev=Array(m.rooms.length).fill(-1),q=[end];prev[end]=end;
    for(let k=0;k<q.length&&prev[start]<0;k++)for(const n of m.adj[q[k]])if(prev[n]<0){prev[n]=q[k];q.push(n);}
    if(prev[start]<0||start===end)return[wx,wy];const p=m.rooms[start],n=m.rooms[prev[start]];
    // Follow the next point on the gently curved route when a branch wall blocks pursuit.
    const target=Math.hypot(e.x-p.x,e.y-p.y)>m.room*.25?p:n;return[target.x-e.x,target.y-e.y];
  }
  function hardGenerate(pair){
    const indices=HARD_PAIRS[pair],a=DUNGEONS[indices[0]],b=DUNGEONS[indices[1]],normalArea=nodes.slice(1).reduce((s,p,i)=>{const q=nodes[i],lo=Math.max(0,q.y),hi=Math.min(goalY,p.y);if(hi<=lo)return s;const w=y=>q.w+(p.w-q.w)*(y-q.y)/(p.y-q.y);return s+(hi-lo)*(w(lo)+w(hi))/2;},0);
    const r=mulberry(Math.floor(Math.random()*1e9)),unit=b.len/2650,mirror=r()<.5?-1:1,spread=.97+r()*.06;
    const m=hardRun.maze={rooms:[],adj:[],edges:[],routes:[],sections:[],forks:[],deadEnds:[],normalArea,radius:125,binSize:240,bins:new Map(),yBins:new Map(),startIndex:0};
    // Navigation follows the very same rounded centre lines as floor drawing and collision.
    const point=(x,y)=>({x:VW/2+x*unit*mirror*spread*.9,y:y*unit*.85}),add=p=>{const id=m.rooms.length;m.rooms.push(p);m.adj.push([]);return id;},link=(i,j)=>{m.adj[i].push(j);m.adj[j].push(i);m.edges.push([i,j]);};
    const curve=controls=>{
      const points=[controls[0]],keys=[0];
      for(let i=0;i<controls.length-1;i++){
        const a=controls[Math.max(0,i-1)],b=controls[i],c=controls[i+1],d=controls[Math.min(controls.length-1,i+2)],n=Math.max(2,Math.ceil(Math.hypot(c.x-b.x,c.y-b.y)/40));
        for(let j=1;j<=n;j++){const t=j/n,t2=t*t,t3=t2*t,p={};for(const k of['x','y'])p[k]=.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t2+(-a[k]+3*b[k]-3*c[k]+d[k])*t3);points.push(p);}keys.push(points.length-1);
      }return{points,keys};
    };
    const route=(controls,kind,start=null,end=null)=>{
      const c=curve(controls),ids=c.points.map((p,i)=>i===0&&start!=null?start:i===c.points.length-1&&end!=null?end:add(p));
      for(let i=1;i<ids.length;i++)link(ids[i-1],ids[i]);const q={kind,ids,keys:c.keys.map(i=>ids[i])};m.routes.push(q);return q;
    };
    const start=add(point(0,0)),f1=add(point(0,300)),j1=add(point(120,900)),f2=add(point(120,1000)),j2=add(point(-120,1600)),f3=add(point(-120,1700)),exit=add(point(160,2300));m.startIndex=start;m.exitIndex=exit;
    const connect=(i,j)=>route([m.rooms[i],m.rooms[j]],'link',i,j);
    route([m.rooms[start],point(-15,150),m.rooms[f1]],'entry',start,f1);
    // Every section has two real ways onward. There is no centre corridor across its island.
    const fork=(from,to,left,right)=>{const a=route([m.rooms[from],...left,m.rooms[to]],'route',from,to),b=route([m.rooms[from],...right,m.rooms[to]],'detour',from,to);m.sections.push({from,to,paths:[a,b]});return[a,b];};
    const first=fork(f1,j1,[point(-240,430),point(-300,700),point(0,880)],[point(280,430),point(360,710),point(300,850)]);connect(j1,f2);
    fork(f2,j2,[point(-180,1150),point(-420,1360),point(-300,1540)],[point(460,1150),point(520,1400),point(180,1570)]);connect(j2,f3);
    const last=fork(f3,exit,[point(-410,1870),point(-480,2110),point(-120,2290)],[point(160,1870),point(420,2100),point(360,2240)]);
    const dead=(from,controls)=>{const q=route([m.rooms[from],...controls],'deadEnd',from);m.deadEnds.push({node:q.ids[q.ids.length-1],from,route:q});return q;};
    const branch=(from,offsets)=>dead(from,offsets.map(([x,y])=>({x:m.rooms[from].x+x*unit*mirror*spread,y:m.rooms[from].y+y*unit})));
    branch(first[0].keys[2],[[-400,50],[-800,110],[-1150,150]]);
    branch(f2,[[430,-70],[830,-20],[1180,30]]);
    branch(last[0].keys[2],[[-370,20],[-770,70],[-1120,110]]);
    m.forks=[{node:f1,choices:2},{node:f2,choices:3},{node:f3,choices:2}];
    const segments=()=>m.edges.map(([i,j])=>hardSegment(m.rooms[i],m.rooms[j],m.radius));let raw=segments(),lo=Math.min(...m.rooms.map(p=>p.y))-m.radius,hi=Math.max(...m.rooms.map(p=>p.y))+m.radius,rawArea=0,step=4;
    for(let y=lo;y<hi;y+=step){const h=Math.min(step,hi-y);rawArea+=hardSection(raw,m.radius,y+h/2).reduce((v,s)=>v+s.r-s.l,0)*h;}
    const scale=Math.sqrt(normalArea*HARD_AREA/rawArea),shift=140;
    for(const p of m.rooms){p.x=VW/2+(p.x-VW/2)*scale;p.y=p.y*scale+shift;p.w=p.h=m.radius*2*scale;}
    m.radius*=scale;m.area=rawArea*scale*scale;m.room=m.radius*2;m.minY=lo*scale+shift;m.maxY=hi*scale+shift;m.length=m.maxY;m.start=m.rooms[m.startIndex];m.exit=m.rooms[m.exitIndex];m.segments=segments();
    for(const s of m.segments){const x0=Math.floor((Math.min(s.a.x,s.b.x)-m.radius)/m.binSize),x1=Math.floor((Math.max(s.a.x,s.b.x)+m.radius)/m.binSize),y0=Math.floor((Math.min(s.a.y,s.b.y)-m.radius)/m.binSize),y1=Math.floor((Math.max(s.a.y,s.b.y)+m.radius)/m.binSize);for(let y=y0;y<=y1;y++){const row=m.yBins.get(y)||[];row.push(s);m.yBins.set(y,row);for(let x=x0;x<=x1;x++){const key=x+','+y,list=m.bins.get(key)||[];list.push(s);m.bins.set(key,list);}}}
    for(const q of m.routes){q.length=0;for(let i=1;i<q.ids.length;i++){const a=m.rooms[q.ids[i-1]],b=m.rooms[q.ids[i]];q.length+=Math.hypot(a.x-b.x,a.y-b.y);}q.minY=Math.min(...q.ids.map(i=>m.rooms[i].y))-m.radius;q.maxY=Math.max(...q.ids.map(i=>m.rooms[i].y))+m.radius;}
    D={...b,pool:{...a.pool},xp:a.xp+b.xp,gp:a.gp+b.gp,len:m.length,groups:a.groups+b.groups};for(const[k,v]of Object.entries(b.pool))D.pool[k]=(D.pool[k]||0)+v;
    goalY=m.exit.y;enemies=[];props=[];bullets=[];drops=[];rings=[];evs=[];ev={qT:999};
    const spots=m.rooms.filter(p=>Math.hypot(p.x-m.start.x,p.y-m.start.y)>300&&Math.hypot(p.x-m.exit.x,p.y-m.exit.y)>200);let exp=0,gold=0;
    for(let i=0;i<D.groups*2;i++){const p=spots[Math.floor(r()*spots.length)],type=wpick(D.pool,r()),e=spawnEnemy(type,p.x+(r()-.5)*p.w*.4,p.y+(r()-.5)*28);hardSnap(e);exp+=EN[type].exp;gold+=EN[type].gold;}
    D.xk=D.xp*.7/Math.max(1,exp);D.gk=D.gp*.55/Math.max(1,gold);for(const e of enemies){e.exp=Math.max(1,Math.round(EN[e.type].exp*D.xk));e.gold=Math.max(1,Math.round(EN[e.type].gold*D.gk));}
    gateNeed=Math.max(1,Math.ceil(enemies.length*.7));gateKills=0;gateCallT=0;
    for(const q of [...m.deadEnds.map(d=>d.route),m.routes.find(q=>q.kind==='detour')]){const p=m.rooms[q.ids[Math.floor((q.ids.length-1)*(q.kind==='deadEnd'?.92:.5))]];props.push({type:'chest',x:p.x,y:p.y,r:14,open:false});}
    if(r()<.22){const p=spots[Math.floor(r()*spots.length)],e=spawnEnemy('goldslime',p.x,p.y);e.exp=Math.round(D.xp*.05);e.gold=Math.round(D.gp*.12);}
    if(r()<PINK_DIAMOND_RATE){const p=spots[Math.floor(r()*spots.length)];spawnEnemy('pinkdiamondslime',p.x,p.y);}
  }
  function hardEnter(pair){
    if(!hardUnlocked(pair)||hardDone(pair)){toast(hardDone(pair)?'このハードは本日クリア済みです。':'対象2面のノーマルクリアが必要です。','#ffbb88');return false;}
    hardRun={pair,indices:HARD_PAIRS[pair].slice(),maze:null,bosses:[],settled:false,clearT:0,camX:VW/2};enterDungeon(HARD_PAIRS[pair][1],true);return true;
  }
  function hardCreateBoss(index,x,y){
    const d=DUNGEONS[index],b=BOSSES[d.boss],B={type:d.boss,name:b.name,x,y,vx:0,vy:0,r:Math.round(b.r*1.4),hp:b.hp,maxHp:b.hp,atk:b.atk,def:b.def,col:b.col,wcol:b.wcol,fcol:b.fcol,ocol:b.ocol,exp:Math.round(d.xp*.3),gold:Math.round(d.gp*.25),moves:b.moves.slice(),moves2:b.moves2.slice(),phase:1,mv:null,mt:0,cd:2.2,last:'',hurt:0,hitCD:0,z:0,sweeps:[],intro:2.6,face:-Math.PI/2,dead:0,rage:b.rage,waveT:9,hx:x,hy:y,homeT:0,alpha:1,hardHomeX:x,hardHomeY:y,hardStage:index,hardPrevHp:b.hp,hardDamage:0};
    if(RIG[B.type])rigInit(B);if(B.type==='archmage'){B.r0=B.r;B.r1=Math.round(B.r*.68);B.r=B.r1;B.sizeK=.68;B.grow=-1;}return B;
  }
  function hardBossRoom(){
    state='boss';arena={cx:VW/2,cy:0,R:360*Math.sqrt(HARD_AREA)};enemies=[];bullets=[];drops=[];rings=[];props=[];zones=[];freezeT=0;darkT=0;shades=[];twisters=[];evs=[];ev={qT:30};
    hero.x=arena.cx;hero.y=-arena.R+70;hero.vx=hero.vy=0;bcamX=hero.x;bcamY=hero.y+120;
    hardRun.bosses=hardRun.indices.map((i,k)=>hardCreateBoss(i,arena.cx+(k?150:-150),30));boss=hardRun.bosses[0];guildBossStart(boss);
    for(const B of hardRun.bosses)bestEncounter('boss:'+B.type);
    banner={a:hardRun.bosses.map(b=>b.name).join(' ＆ '),b:'HARD ・ DOUBLE BOSS',t:2.6,boss:true};persist();A.bgm(FARR.boss[boss.type]);A.sfx('bossAppear');flash=.6;flashCol='255,255,255';shake=14;
  }
  function hardBossDeath(B){if(B.dead)return;B.hp=0;B.dead=.01;B.sweeps=[];B.hardShades=[];B.hardTwisters=[];B.hardDark=0;for(const z of zones)if(z.hardOwner===B&&z.type==='shrink')arena.R=z.r0;bullets=bullets.filter(o=>o.hardOwner!==B);zones=zones.filter(o=>o.hardOwner!==B);rings=rings.filter(o=>o.hardOwner!==B);for(const e of enemies)if(e.hardOwner===B)e.dead=true;A.sfx('bossKill');hitStop=.2;shake=20;flash=.7;flashCol='255,255,255';if(hardRun.bosses.every(b=>b.dead)){hardRun.clearT=1.2;bullets=[];zones=[];rings=[];for(const e of enemies)e.dead=true;}}
  function hardUpdateBosses(dt){
    if(hardRun.clearT>0){hardRun.clearT-=dt;for(const B of hardRun.bosses)B.dead+=dt;if(hardRun.clearT<=0&&hero.hp>0)hardSettle();return;}
    for(const B of hardRun.bosses){if(B.dead){B.dead+=dt;continue;}withFightBoss(B,()=>bossUpdate(dt));}
    const live=livingBosses();boss=live[0]||hardRun.bosses[0];if(live.length===2){const[a,b]=live,dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,min=(a.r+b.r)*.85;if(d<min){const p=(min-d)/2;a.x-=dx/d*p;a.y-=dy/d*p;b.x+=dx/d*p;b.y+=dy/d*p;confine(a,.2);confine(b,.2);}}
    darkT=Math.max(0,...live.map(b=>b.hardDark||0));
  }
  function hardSettle(){
    const r=hardRun;if(!r||r.settled||r.bosses.length!==2||r.bosses.some(b=>!b.dead))return false;
    if(hardDone(r.pair)){state='over';openPanel('本日はクリア済みです','<p>この組のハード報酬は、すでに本日受取済みです。</p>',[['街へ',goTown]]);return false;}
    const before=JSON.stringify(save),oldExp=runExp,oldGold=runGold,oldMats={...runMaterials},oldStats=hero.s,oldHp=hero.hp,oldFinal=guildRun?.finalized,oldDamage=r.bosses.map(b=>[b.hardPrevHp,b.hardDamage]);
    const mats=r.indices.map(i=>Object.keys(craftMats).find(k=>craftMats[k].boss===DUNGEONS[i].boss));if(mats.some(k=>craftHave(k)>999997)){paused=true;openPanel('素材の所持上限です','<p>クリア報酬を保存できません。所持上限を確認してください。</p>',[['街へ',()=>{paused=false;goTown();}]]);return false;}
    try{
      guildSampleBoss();for(let j=0;j<2;j++){const k=mats[j];save.materials[k]=craftHave(k)+2;runMaterials[k]=(runMaterials[k]||0)+2;bestObtain('mat:'+k);guildMaterial(k,2);guildInc('boss:'+r.bosses[j].type);gainExp(r.bosses[j].exp);gainGold(r.bosses[j].gold);}
      guildDayInc('boss',2);guildDayInc('clear');if(guildRun){for(const k of Object.keys(guildRun.skills))save.guild.stats.skills[k]=true;guildRun.finalized=true;}
      save.hard.cleared[r.pair]=hardToday();save.hp=null;bestSyncOwned();localStorage.setItem('bumphero_save',JSON.stringify(save));
    }catch(e){save=JSON.parse(before);runExp=oldExp;runGold=oldGold;runMaterials=oldMats;hero.s=oldStats;hero.hp=oldHp;if(guildRun)guildRun.finalized=oldFinal;r.bosses.forEach((b,i)=>{[b.hardPrevHp,b.hardDamage]=oldDamage[i];});paused=true;openPanel('保存できませんでした','<p>報酬とクリア回数は元に戻しました。再試行できます。</p>',[['保存を再試行',()=>{paused=false;hardSettle();}],['街へ',()=>{paused=false;goTown();}]]);return false;}
    r.settled=true;paused=false;state='over';A.jingle('clear');openPanel('ハードモード せいは！',`<p>${r.bosses.map(b=>b.name).join(' と ')} を倒した！</p><dl class="stat"><dt>経験値（1.5倍）</dt><dd>+${runExp}</dd><dt>ゴールド（1.5倍）</dt><dd>+${runGold} G</dd></dl><p class="gold">ボス素材 各2個を獲得！</p>${craftLootHtml()}<p class="craft-intro">この組は本日クリア済みです。日本時間0時に更新します。</p>`,[['街へもどる',goTown,true]]);return true;
  }
  function hardFieldTick(dt){
    const m=hardRun.maze;hardRun.camX=lerp(hardRun.camX,hero.x,1-Math.exp(-dt*6));WX=W/2-hardRun.camX;
    const exit=m.exit,d=Math.hypot(hero.x-exit.x,hero.y-exit.y);if(d<65){if(gateKills>=gateNeed&&!transition){hero.vx=hero.vy=0;transition={t:0,mid:.5,fn:enterBossRoom};A.sfx('door');}else if((gateMsgT-=dt)<=0){gateMsgT=1.5;toast('扉の封印：あと '+(gateNeed-gateKills)+'体倒そう。','#d8b0ff');}}
  }
  function hardDrawField(){
    // Reuse normal-mode tiles and simple wall borders. No extra scenery or parallax layers.
    makePatterns();const m=hardRun.maze;patShift(wallPat,0,sy(0)%24);ctx.fillStyle=wallPat;ctx.fillRect(-WX-3,0,W+6,H);patShift(floorPat,0,sy(0)%48);
    const visible=m.routes.filter(q=>sy(q.maxY)<H+m.radius+12&&sy(q.minY)>-m.radius-12);
    const trace=()=>{ctx.beginPath();for(const q of visible){q.ids.forEach((id,i)=>{const p=m.rooms[id];if(i)ctx.lineTo(p.x,sy(p.y));else ctx.moveTo(p.x,sy(p.y));});}};
    ctx.save();ctx.lineJoin='round';ctx.lineCap='round';trace();ctx.lineWidth=m.radius*2+6;ctx.strokeStyle=SPR.shade(D.pal.wallHi,.25);ctx.stroke();ctx.lineWidth=m.radius*2;ctx.strokeStyle='rgba(0,0,0,.35)';ctx.stroke();ctx.lineWidth=m.radius*2-12;ctx.strokeStyle=floorPat;ctx.stroke();ctx.restore();
    const p=m.exit,y=sy(p.y);if(y>-100&&y<H+100){ctx.fillStyle='#c9a24a';ctx.fillRect(p.x-36,y-55,72,58);ctx.fillStyle='#1a0f12';ctx.fillRect(p.x-29,y-48,58,48);txt(gateKills>=gateNeed?'BOSS ×2':'封印中',p.x,y-65,13,gateKills>=gateNeed?'#f2c14e':'#c8a0ff','center');}
  }
  function hardDrawHud(){
    if(!hardRun)return;if(state==='boss'){hardRun.bosses.forEach((b,i)=>{const y=safeTop()+74+craftHudRows()*16+i*35;txt(b.name+(b.dead?'（撃破）':''),W/2,y-3,12,'#fff','center');bar(20,y,W-40,8,Math.max(0,b.hp)/b.maxHp,b.dead?'#777':'#e5483c');});return;}
    if(state!=='play')return;const label='HARD '+(hardRun.pair*2+1)+'–'+(hardRun.pair*2+2)+'  扉 '+gateKills+'/'+gateNeed;
    ctx.fillStyle='rgba(19,24,58,.82)';ctx.fillRect(W-168,safeTop()+78+craftHudRows()*16,156,23);txt(label,W-90,safeTop()+94+craftHudRows()*16,11,'#f3ecda','center');

  }
  // HARD END

  // ARENA BEGIN — maintained in tools/arena/runtime.inc.js.
  const ARENA_RULE=4;
  const ARENA_EXTRA_TRIALS=[{"id":"a11","extra":true,"theme":"魔物を弾にせよ","name":"魔物を弾にせよ","goal":"bowling","lv":8,"gate":2,"stage":2,"need":3,"eq":["w0","a1","b1",null],"inherit":{"w0":"craft_b03"},"foes":[["slime",6,30],["archer",3,12]],"roles":{"slime":"射手へ飛ばす弾","archer":"巻き込みの標的"},"rule":"飛ばしたスライムを弓兵3体それぞれへ命中。直接攻撃では数えない。","hint":"矢を避けて連撃を作り、スライムと射手が一直線に並ぶ位置から打とう。","formation":{"archer":[[-170,165],[0,205],[170,165]]},"limit":100,"difficulty":"中級","skill":"guard","reward":{"mats":{"core03":2,"m11":40}},"enemyScale":1.64},{"id":"a12","extra":true,"theme":"糸を張って迎え撃て","name":"糸を張って迎え撃て","goal":"webRam","lv":10,"gate":3,"stage":3,"need":4,"eq":["w0","a1","b1",null],"inherit":{"b1":"craft_b04"},"foes":[["wolf",5,20],["spider",2,15]],"roles":{"wolf":"自分の糸で鈍らせる追手","spider":"勇者を鈍らせる射手"},"rule":"異なるオオカミ4体を自分の糸で鈍らせ、効果中に体当たりを当てる。","hint":"追手の通り道を横切って糸を張ろう。敵のクモの糸に捕まらず、鈍った相手へ反撃する。","formation":{"spider":[[-170,170],[170,170]]},"limit":100,"difficulty":"中級","skill":"guard","reward":{"mats":{"core04":2,"s03":10}},"enemyScale":1.8},{"id":"a13","extra":true,"theme":"吸う弾・避ける弾","name":"吸う弾・避ける弾","goal":"absorb","lv":14,"gate":12,"stage":12,"need":6,"eq":["w1","a2","b1","c1"],"inherit":{"c1":"craft_b13"},"foes":[["mage",2,24],["crossbow",1,24]],"roles":{"mage":"吸収する通常弾・反撃の標的","crossbow":"吸収できない貫通弾"},"rule":"吸収弾をスキルで撃ち返し、まどうしへ合計6発命中。両方のまどうしに当てる。","hint":"通常弾へ回避して弾をため、射程内から撃ち返そう。ボウガンの貫通弾は吸収できない。","formation":{"mage":[[-140,95],[140,95]],"crossbow":[[0,210]]},"limit":100,"difficulty":"中級","skill":"guard","reward":{"mats":{"core13":2,"m18":50}},"unique":2,"enemyScale":2.12},{"id":"a14","extra":true,"theme":"三方向から崩せ","name":"三方向から崩せ","goal":"cerberus","lv":16,"gate":13,"stage":13,"need":2,"eq":["w1","a2","b1",null],"inherit":{"w1":"craft_b14"},"foes":[["golem",2,20],["skeleton",3,20],["archer",1,20]],"roles":{"golem":"三方向の追撃を当てる相手","skeleton":"周囲への移動を妨げる斬撃","archer":"移動先を狙う射手"},"rule":"両方のゴーレムへ異なる3方向から当て、三頭の追撃を命中させる。","hint":"狙った相手の周囲を回り、攻撃方向を変えよう。骸骨の斬撃が重なる前に離れる。","formation":{"golem":[[-110,40],[110,40]],"archer":[[0,220]]},"limit":100,"difficulty":"中級","skill":"guard","reward":{"mats":{"core14":2,"m13":50}},"enemyScale":2.28},{"id":"a15","extra":true,"theme":"触れずに鏡を砕け","name":"触れずに鏡を砕け","goal":"wall","lv":18,"gate":17,"stage":17,"need":2,"eq":["w1","a2","b1",null],"inherit":{"w1":"craft_f11","b1":"x1"},"foes":[["magicmirror",2,2],["mummy",5,16]],"roles":{"magicmirror":"壁爆発で倒す標的・直接攻撃禁止","mummy":"壁へ押し込む起爆役"},"rule":"ミイラを壁へ押し当てた爆発で、まきょう2体を撃破。まきょうへの直接攻撃は禁止。","hint":"貸出の靴には「はずむくつ」の効果があり、体当たりで敵を大きく飛ばせる。ミイラを壁際へ誘導し、鏡が近づいたら内側から壁へ押し込もう。鏡へ直接ぶつからず、起爆役を倒しすぎないよう注意。","formation":{"magicmirror":[[-230,80],[230,80]]},"limit":120,"difficulty":"上級","skill":"guard","reward":{"mats":{"s11":12,"m11":60}},"enemyScale":2.44},{"id":"a16","extra":true,"theme":"曲がって巻き込め","name":"曲がって巻き込め","goal":"tornado","lv":20,"gate":18,"stage":18,"need":3,"eq":["w1","a2","b2",null],"inherit":{"b2":"craft_b19"},"foes":[["fishman",5,20],["crossbow",1,24]],"roles":{"fishman":"着地点へ集める追手","crossbow":"曲がる方向を制限する射手"},"rule":"旋回回避で作った竜巻を、1回につき異なる敵2体以上へ当てる。3回成功。","hint":"追手を引きつけ、指で弧を描いてフリックしよう。指を離した後も回避が曲がり、ゲージが満ちると着地点に竜巻が出る。再使用待ちはゲージで確認し、追手の進路へ重ねよう。","formation":{"crossbow":[[0,215]]},"limit":100,"difficulty":"上級","skill":"guard","reward":{"mats":{"core19":2,"m04":40}},"enemyScale":2.6},{"id":"a17","extra":true,"theme":"骨弾を補給せよ","name":"骨弾を補給せよ","goal":"bone","lv":20,"gate":22,"stage":22,"need":3,"eq":["w0","a2","b1",null],"inherit":{"a2":"craft_b23"},"foes":[["goblin",8,1],["crossbow",3,1]],"roles":{"goblin":"骨弾を補給する相手","crossbow":"骨弾だけで倒す標的"},"rule":"ゴブリンで骨片を補給し、ボウガン兵3体を骨弾だけで撃破。射手への他の攻撃は禁止。","hint":"回避すると骨弾も発射される。逃げるための回避と、射手へ向けて撃つ回避を使い分けよう。","formation":{"crossbow":[[-170,160],[0,210],[170,160]]},"limit":100,"difficulty":"上級","skill":"guard","reward":{"mats":{"core23":2,"m13":60}},"enemyScale":2.6},{"id":"a18","extra":true,"theme":"眠りの隙をつかめ","name":"眠りの隙をつかめ","goal":"decoy","lv":22,"gate":26,"stage":26,"need":3,"eq":["w0","a3","b2","c1"],"inherit":{"c1":"craft_b27"},"foes":[["clockwork",2,40],["archer",3,5]],"roles":{"clockwork":"夢影で眠らせる相手・撃破禁止","archer":"眠りの隙に倒す標的"},"rule":"夢影でぜんまい兵を眠らせ、2秒以内に弓兵1体を撃破。新しい夢影で3回成功。ぜんまい兵撃破は失敗。","hint":"回転攻撃を夢影へ誘い、止まった隙に射手を狙おう。眠らせる前に弓兵を倒さないよう注意。","formation":{"clockwork":[[-100,20],[100,20]],"archer":[[-160,160],[0,205],[160,160]]},"limit":120,"difficulty":"上級","skill":"guard","reward":{"mats":{"core27":2,"s05":12}},"enemyScale":2.76},{"id":"a19","extra":true,"theme":"狙いを変えるな","name":"狙いを変えるな","goal":"fracture","lv":24,"gate":29,"stage":29,"need":2,"eq":["w1","a3","b2",null],"inherit":{"w1":"craft_b30"},"foes":[["minotaur",2,20],["bomber",2,24]],"roles":{"minotaur":"亀裂をためる突進役","bomber":"追跡の進路を妨げる爆弾"},"rule":"両方のミノタウロスへ、亀裂を途切れさせず裂界衝撃を命中させる。別の相手への体当たりで蓄積がリセット。","hint":"狙った相手を追い、命中の間隔を空けすぎないようにしよう。爆弾を避けるときも別の相手にぶつからない進路を選ぶ。","formation":{"minotaur":[[-195,135],[195,135]],"bomber":[[-80,-35],[80,-35]]},"limit":120,"difficulty":"上級","skill":"guard","reward":{"mats":{"core30":2,"m17":60}},"enemyScale":2.92,"readyThreats":["bomber"]},{"id":"a20","extra":true,"theme":"盾の向こう側へ","name":"盾の向こう側へ","goal":"tunnel","lv":24,"gate":30,"stage":30,"need":3,"eq":["w1","a3","b2",null],"inherit":{"b2":"craft_b31"},"foes":[["knight",3,20],["clockwork",1,30]],"roles":{"knight":"潜行して背後から当てる標的","clockwork":"抜けた先をふさぐ回転攻撃"},"rule":"潜行回避で騎士をすり抜け、1.2秒以内に背後から体当たり。異なる騎士3体で成功。","hint":"盾の向きと抜けた先の安全を見よう。回転中のぜんまい兵がいる場所へ抜けず、騎士の背を狙う。","formation":{"knight":[[-215,75],[0,235],[215,75]],"clockwork":[[0,-125]]},"limit":100,"difficulty":"上級","skill":"guard","reward":{"mats":{"core31":2,"m08":50}},"enemyScale":2.92,"readyThreats":["clockwork"]}];
  const ARENA_CLASSES=[50,100,200,300,500];
  const ARENA_TRIALS=[
    {id:'a01',formation:{skeleton:[[0,60]]},unique:4,maxHits:4,difficulty:'入門',name:'はね返り入門',lv:4,gate:0,stage:0,eq:['w0','a0','craft_b01',null],skill:'shock',foes:[['slime',6,40],['skeleton',1,24]],goal:'redirect',need:6,limit:65,rule:'反動中に向きを変え、別の敵への再突進を6回成功。合計4体以上を狙う。被弾は4回まで。',theme:'包囲からの脱出',roles:{slime:'跳ね返りの足場',skeleton:'進路をふさぐ斬撃'},hint:'スライムで跳ね返り、剣士が振りかぶったら別の相手へ抜けよう。同じ場所への往復より、安全な着地点を選ぶのが大切。'},
    {id:'a02',formation:{golem:[[-110,-10],[0,55],[110,-10]],archer:[[-135,170],[135,170]]},targetTypes:['golem'],unique:3,maxHits:8,difficulty:'中級',name:'炎をつなげ',lv:6,gate:5,stage:2,eq:['craft_f01','a0','b0',null],skill:'shock',foes:[['golem',3,20],['archer',2,12]],goal:'seed',need:3,limit:75,rule:'火種を3個ためた爆発を、3回のスキルで成功させる。ゴーレム3体以上が対象。被弾は8回まで。',theme:'重装兵への火種',roles:{golem:'火種爆発の対象',archer:'足を止めると危険な射手'},hint:'ゴーレムの振りかぶりを体当たりで止めて火種をためよう。弓兵の射線が重なったら離れ、追手を引きつけてから爆発させる。'},
    {id:'a03',recordRule:3,theme:'斬撃を避けて連撃をつなぐ',roles:{skeleton:'近づくと斬りつける追手',golem:'攻撃を止めてコンボを稼ぐ相手'},hold:5,maxHits:6,difficulty:'中級',name:'連撃を刻め',lv:8,gate:7,stage:4,eq:['w1','a1','x8','x7'],skill:'whirl',foes:[['skeleton',6,24],['golem',3,24]],goal:'combo',need:32,limit:60,rule:'32コンボ以上を5秒間維持する。被弾で途切れたら維持時間はやり直し。被弾は6回まで。',hint:'骸骨の斬撃を避けながら、ゴーレムの振りかぶりを体当たりで止めよう。打って離れ、戻ってコンボをつなぐ。'},
    {id:'a04',formation:{skeleton:[[-150,-65],[150,-65],[0,110]],archer:[[0,190]]},recover:.4,finishHp:.65,hold:4,maxHits:6,difficulty:'中級',name:'きゅうけつ包囲戦',lv:10,gate:9,stage:4,eq:['x9','a1','b1',null],skill:'guard',foes:[['goblin',14,3],['slime',4,4],['skeleton',3,18],['archer',1,12]],goal:'drain',need:50,limit:75,startHp:.3,noPotion:true,rule:'HP30％で開始。吸血で最大HPの40％分を回復し、HP65％以上を4秒維持。被弾は6回まで。回復道具なし。',theme:'狩る相手と避ける相手',roles:{goblin:'撃破して回復する相手',slime:'撃破して回復する相手',skeleton:'回復を妨げる追手',archer:'移動先を狙う射手'},hint:'手近な敵に突っ込まず、倒しやすい相手を選んで吸血しよう。剣士を引き離して回復し、回復後は無理に追わず安全な場所を保つ。'},
    {id:'a05',formation:{mage:[[-115,100],[115,100]],archer:[[-155,-15],[155,-15]]},unique:2,difficulty:'上級',name:'鏡で返せ',lv:12,gate:17,stage:8,eq:['w1','a2','b1',null],inherit:{a2:'craft_f09'},skill:'guard',foes:[['mage',2,18],['archer',2,18]],goal:'reflect',need:5,limit:90,rule:'回避開始直後に弾を反射し、反射弾を敵へ5発命中させ、合計2体以上を狙う。反射するだけでは数えない。',theme:'射線をそろえて返す',roles:{mage:'扇状の反射可能弾',archer:'狙い撃ちの反射可能矢'},hint:'射手を画面の片側へ集め、来た弾を回避の出始めで返そう。まどうしの広がる弾は正面から、弓兵の矢は射線をそろえて狙う。'},
    {id:'a06',formation:{wolf:[[-160,50],[-60,140],[60,140],[160,50]],fishman:[[-115,-40],[-40,30],[40,30],[115,-40]]},difficulty:'上級',name:'ころがりの雷',lv:14,gate:28,stage:7,eq:['w1','a1','b1',null],inherit:{b1:'craft_f06'},skill:'frost',foes:[['wolf',4,20],['fishman',4,20]],goal:'bolt',need:6,limit:80,rule:'回避で残した雷の軌跡を、異なる敵6体に踏ませる。同じ敵の重複は数えない。',theme:'追手を雷の通り道へ',roles:{wolf:'速い直線突進の追手',fishman:'斬りつけながら追う相手'},hint:'追手を引きつけてから横切るように回避し、残した雷へ誘導しよう。まだ雷を踏んでいない相手へ回り込むと、同じ群れへの空振りを減らせる。'},
    {id:'a07',formation:{knight:[[0,70]],skeleton:[[-95,-40],[95,-40]]},targetTypes:['knight'],difficulty:'上級',name:'一閃の反撃',lv:18,gate:14,stage:8,eq:['w2','a2','b1',null],inherit:{w2:'craft_b09'},skill:'guard',foes:[['knight',1,20],['skeleton',2,20]],goal:'riposte',need:4,limit:90,rule:'回避開始直後に攻撃を見切り、強化された返し刃を生きたやみの騎士に4回当てる。',theme:'盾持ちへの見切り反撃',roles:{knight:'返し刃の対象・盾と突進',skeleton:'見切りのきっかけとなる斬撃'},hint:'先に殴ると敵の攻撃が止まる。斬撃や突進を回避の出始めで見切り、やみの騎士の盾が開く隙へ返し刃を当てよう。'},
    {id:'a08',formation:{goblin:[[-140,-10],[-85,20],[-30,40],[30,40],[85,20],[140,-10]],archer:[[-135,165],[135,165]]},minTargets:2,maxHits:8,difficulty:'中級',name:'熱をためろ',lv:20,gate:11,stage:5,eq:['w2','a2','b2',null],inherit:{w2:'craft_b06'},skill:'cry',foes:[['goblin',6,25],['archer',2,20]],goal:'flame',need:3,limit:75,rule:'移動で熱を満タンにし、体当たりで放つ炎を同時に2体以上へ命中する放出を3回成功。1体だけでは数えない。被弾は8回まで。',theme:'追手を束ねる炎',roles:{goblin:'炎へまとめて誘導する追手',archer:'周回ルートを狙う射手'},hint:'広く回って熱をため、追ってくるゴブリンをひとかたまりにしよう。射線を避けて向き直り、先頭への体当たりで後ろの相手も炎へ巻き込む。'},
    {id:'a09',formation:{golem:[[-75,-40],[75,-40]],archer:[[-150,140],[0,180],[150,140]]},skillTargets:{shock:['golem'],thunder:['archer']},difficulty:'上級',name:'二つの術を使いこなせ',lv:22,gate:21,stage:12,eq:['w2','a2','b1','craft_b18'],skill:'shock',dual:['shock','thunder'],foes:[['golem',2,35],['archer',3,30]],goal:'dual',need:3,limit:90,rule:'ゴーレムにしょうげきは→弓兵にいかずち、の順に命中させる組を3組作る。別の敵や空撃ちは数えない。',theme:'前衛と後衛へ術を使い分ける',roles:{golem:'しょうげきはを当てる前衛',archer:'いかずちを当てる後衛'},hint:'近づいてゴーレムへしょうげきはを当てたら、弓兵を雷の射程へ入れよう。近くの相手だけを攻撃し続けず、次の術に合わせて位置を変える。'},
    {id:'a10',recordRule:3,theme:'守る時間と攻める時間',difficulty:'上級',name:'死騎士の試験',lv:24,gate:29,stage:8,eq:['w4','a4','b2','c9'],skill:'guard',boss:true,goal:'shield',need:2,limit:100,maxHits:2,rule:'聖光の宝玉の盾で攻撃を2回防いでからデスナイトを倒す。HPが減る被弾は2回まで。',hint:'光の盾がない間は予告を見て回避し、盾が戻ったら攻撃を受け止めよう。防御の条件を満たしてから、技の終わりの隙を攻める。'}
    ,...ARENA_EXTRA_TRIALS
  ].sort((a,b)=>a.gate-b.gate);
  const arenaGear=[
    {id:'arena_chainboots',slot:'boots',name:'連舞のくつ',ram:1.18,vis:'b2',fx:{chain:1,double:1}},
    {id:'arena_thunderboots',slot:'boots',name:'雷走のくつ',ram:1.25,vis:'b3',fx:{craft_f06:1,guard:.3}},
    {id:'arena_dualcharm',slot:'charm',name:'双術の証',hp:90,vis:'c7',fx:{craft_b18:1,skillcd:.3}},
    {id:'arena_championblade',slot:'weapon',name:'闘王の剣',atk:Math.round(EQ.w6.atk*.85),vis:'w6',fx:{bossbane:.1,brave:.15}}
  ];
  for(const e of arenaGear){Object.assign(e,{arenaReward:true,price:0,val:0});EQUIP.push(e);EQ[e.id]=e;}
  const ARENA_REWARDS={
    a01:{mats:{m01:30,m11:20}},a02:{mats:{s01:15,m11:30}},
    a03:{mats:{m13:30},gear:'arena_chainboots'},a04:{mats:{m13:40,m14:20}},
    a05:{mats:{s09:10,m18:30}},a06:{mats:{s06:10},gear:'arena_thunderboots'},
    a07:{mats:{core09:2,m11:40}},a08:{mats:{core06:2,s01:20}},
    a09:{mats:{m18:40},gear:'arena_dualcharm'},a10:{mats:{core09:3},gear:'arena_championblade'},
    ...Object.fromEntries(ARENA_EXTRA_TRIALS.map(q=>[q.id,q.reward]))
  };
  const arenaRewardKey=(kind,id)=>kind+':'+id;
  const arenaRewardFor=(kind,id)=>kind==='trial'?ARENA_REWARDS[id]:kind==='chain'&&ARENA_CLASSES.includes(+id)?{crystals:1}:null;
  function arenaRewardHtml(kind,id){
    const r=arenaRewardFor(kind,id);if(!r)return'';
    return Object.entries(r.mats||{}).map(([k,n])=>craftMats[k].name+' ×'+n).concat(r.gear?[eqIcon(EQ[r.gear],24)+' '+EQ[r.gear].name+'（限定）<br><small>'+eqStats(EQ[r.gear])+' ／ '+Object.keys(EQ[r.gear].fx).map(k=>FX[k].note).join('・')+'</small>']:[],r.crystals?['継承結晶 ×'+r.crystals]:[]).join(' ／ ');
  }
  function arenaRewardEligible(s,kind,id){const r=(kind==='trial'?s.arena.trials:s.arena.chains)[id];return !!r&&(kind!=='trial'||[2,3,ARENA_RULE].includes(r.rule)&&arenaTrialUnlocked(s,arenaTrial(id)));}
  // Apply only to a cloned real save; the caller commits record and reward together.
  function arenaGrant(s,kind,id){
    const key=arenaRewardKey(kind,id),r=arenaRewardFor(kind,id);if(!r||s.arena.rewards[key]||!arenaRewardEligible(s,kind,id))return false;
    if(Object.entries(r.mats||{}).some(([k,n])=>(s.materials[k]||0)+n>999999)||r.crystals&&!s.forge.receipts.includes('arena:'+key)&&s.forge.crystals+r.crystals>FORGE_CAP)throw Error('報酬の所持上限を超えます。素材・結晶を使ってから受け取ってください。');
    for(const[k,n]of Object.entries(r.mats||{})){s.materials[k]=(s.materials[k]||0)+n;s.bestiary.obtained['mat:'+k]=true;}
    if(r.gear){if(!s.owned.includes(r.gear))s.owned.push(r.gear);s.bestiary.obtained['gear:'+r.gear]=true;}
    if(r.crystals){const receipt='arena:'+key;if(!s.forge.receipts.includes(receipt)){s.forge.crystals+=r.crystals;s.forge.receipts.push(receipt);}s.bestiary.obtained['forge:crystal']=true;}
    s.arena.rewards[key]=true;return true;
  }
  function arenaClaim(kind,id){
    if(!['trial','chain'].includes(kind)||arenaRun||state!=='town'||!arenaRewardEligible(save,kind,id)||save.arena.rewards[arenaRewardKey(kind,id)])return false;
    const next=JSON.parse(JSON.stringify(save));try{if(!arenaGrant(next,kind,id))return false;localStorage.setItem('bumphero_save',JSON.stringify(next));}catch(e){toast(e.message.includes('所持上限')?e.message:'保存できませんでした。報酬は未受取です。','#ff9a8a');return false;}
    save=next;bestDirty=true;A.sfx('chest');openPanel('闘技場・報酬を受け取りました','<p>'+arenaRewardHtml(kind,id)+'</p>',[['一覧へ',()=>openArena(kind==='trial'?'trial':'chain'),true]],'arena');return true;
  }
  let arenaRun=null,arenaTab='trial';
  const arenaSource=()=>arenaRun?arenaRun.home:save;
  function arenaEncounter(key){
    if(!arenaRun)return false;const seen=arenaRun.home.bestiary.seen;if(!seen[key]){seen[key]={places:[]};bestDirty=true;}return true;
  }
  function arenaNormalize(){
    const old=save.arena&&typeof save.arena==='object'?save.arena:{},clean=(data,keys)=>Object.fromEntries(keys.filter(k=>data?.[k]&&Number.isSafeInteger(data[k].clears)&&data[k].clears>0).map(k=>{const r=data[k];return[k,{clears:Math.min(999999,r.clears),best:Number.isFinite(r.best)&&r.best>=0?r.best:0,rule:[2,3,ARENA_RULE].includes(r.rule)?r.rule:1,perfect:!!r.perfect,battles:Number.isSafeInteger(r.battles)&&r.battles>=0?r.battles:0}];}));
    save.arena={v:5,rewards:Object.fromEntries(Object.entries(old.rewards||{}).filter(([k,v])=>v===true&&(ARENA_TRIALS.some(q=>k==='trial:'+q.id)||ARENA_CLASSES.some(n=>k==='chain:'+n)))),trials:clean(old.trials,ARENA_TRIALS.map(q=>q.id)),chains:clean(old.chains,ARENA_CLASSES.map(String))};
  }
  const arenaTrialRule=q=>q?.recordRule||ARENA_RULE;
  const arenaTrial=id=>ARENA_TRIALS.find(q=>q.id===id);
  const arenaTrialUnlocked=(s,q)=>!!q&&(q.gate<0||!!s.cleared[q.gate]);
  const arenaTrialOpen=q=>arenaTrialUnlocked(arenaSource(),q);
  const arenaPool=tier=>DUNGEONS.map((d,i)=>i).filter(i=>arenaSource().cleared[i]&&DUNGEONS[i].rec<=tier).filter((i,n,a)=>a.findIndex(j=>DUNGEONS[j].boss===DUNGEONS[i].boss)===n);
  const arenaPoolTotal=pool=>pool.reduce((sum,i)=>sum+DUNGEONS[i].rec,0);
  const arenaCanChain=tier=>ARENA_CLASSES.includes(tier)&&arenaPoolTotal(arenaPool(tier))>tier;
  function arenaChainRange(tier,pool){const rec=pool.map(i=>DUNGEONS[i].rec).sort((a,b)=>a-b),count=list=>{let sum=0,n=0;for(const r of list){sum+=r;n++;if(sum>tier)return n;}return null;};return[count(rec.slice().reverse()),count(rec)];}
  const arenaTime=n=>Math.floor(n/60)+'分'+String(Math.floor(n%60)).padStart(2,'0')+'秒';
  function arenaLoadout(q){
    return q.eq.map((id,i)=>{const e=EQ[id];if(!e)return'';const source=EQ[q.inherit?.[id]],fx={...forgeRawFx(e),...forgeRawFx(source)};return `<div class="arena-kit">${eqIcon(e,30)}<span>${SLOT_NAME[['weapon','armor','boots','charm'][i]]}：${e.name}${source?'（貸出継承）':''}<small>${eqStats(e)||'数値補正なし'}${Object.keys(fx).length?'<br>'+Object.keys(fx).map(k=>FX[k].note).join('・'):''}</small></span></div>`;}).join('');
  }
  function openArena(tab=arenaTab){
    if(arenaRun||state!=='town')return;facilitySelect('arena',tab==='chain'?'chain':'trial');arenaTab=tab==='chain'?'chain':'trial';arenaNormalize();
    const nav='';
    let body=nav;
    if(arenaTab==='trial')body+=''+ARENA_TRIALS.map((q,i)=>{const ok=arenaTrialOpen(q),r=save.arena.trials[q.id];return `<div class="row"><span class="nm">${String(i+1).padStart(2,'0')}. ${q.name}</span><span class="sub">${q.difficulty}・貸出 Lv ${q.lv} ／ ${r?.rule===arenaTrialRule(q)?'CLEAR・最短 '+arenaTime(r.best)+(r.perfect?'・ノーダメージ勲章':''):r?'旧条件クリア／新条件未達成':'未クリア'}<br>解放：第${q.gate+1}面 ${DUNGEONS[q.gate].name}をクリア${ok?' <span class="tag">達成済み</span>':''}</span>${arenaRewardEligible(save,'trial',q.id)&&!save.arena.rewards['trial:'+q.id]?'<button class="sbtn" data-arena-claim-trial="'+q.id+'">未受取の報酬</button>':''}<span class="act"><button class="sbtn" data-arena-trial="${q.id}" ${ok?'':'disabled'}>詳細</button></span></div>`;}).join('');
    else{body+=''+ARENA_CLASSES.map(n=>{const r=save.arena.chains[n],pool=arenaPool(n),ok=arenaCanChain(n),range=arenaChainRange(n,pool);return `<div class="row"><span class="nm">${n}レベル級</span><span class="sub">${r?'CLEAR・最短 '+arenaTime(r.best):'未クリア'}<br>候補 ${pool.length}体 ／ 推奨Lv ${pool.length?Math.min(...pool.map(i=>DUNGEONS[i].rec)):0}〜${pool.length?Math.max(...pool.map(i=>DUNGEONS[i].rec)):0}${ok?'<br>'+range[0]+'〜'+range[1]+'戦が目安':'<br>候補の推奨Lv合計が'+n+'を超えるまでノーマルを攻略しよう'}</span>${r&&!save.arena.rewards['chain:'+n]?'<button class="sbtn" data-arena-claim-chain="'+n+'">継承結晶を受け取る</button>':''}<span class="act"><button class="sbtn" data-arena-class="${n}" ${ok?'':'disabled'}>詳細</button></span></div>`;}).join('');}
    openPanel('闘技場',body,[['街へもどる',closePanel]],'arena');craftBind('[data-arena-claim-trial]',b=>arenaClaim('trial',b.dataset.arenaClaimTrial));craftBind('[data-arena-claim-chain]',b=>arenaClaim('chain',b.dataset.arenaClaimChain));craftBind('[data-arena-tab]',b=>openArena(b.dataset.arenaTab));craftBind('[data-arena-trial]',b=>openArenaTrial(b.dataset.arenaTrial));craftBind('[data-arena-class]',b=>openArenaChain(+b.dataset.arenaClass));
  }
  function openArenaTrial(id){facilitySelect('arena','trial');
    const q=arenaTrial(id);if(!arenaTrialOpen(q)||state!=='town'||arenaRun)return;
    openPanel(q.name,`<p class="arena-rule">${q.difficulty}・固定 Lv ${q.lv} ／ 制限 ${q.limit}秒<br><b>${q.rule}</b></p>${facilityDetail(q.theme||q.name,q.extra?[q.hint,'敵の攻撃・防御も貸出の強さに合わせた訓練用です。']:[q.hint])}<h3>貸し出し装備</h3>${arenaLoadout(q)}<p>スキル：${q.dual?q.dual.map(k=>SKILLS[k].name).join(' ／ '):SKILLS[q.skill].name}<br>支給：${q.noPotion?'回復道具なし':'ポーション ×1'}</p><h3>対戦相手</h3><p>${q.boss?uiMonsterImage('boss:'+DUNGEONS[q.stage].boss)+ (save.bestiary.seen['boss:'+DUNGEONS[q.stage].boss]?BOSSES[DUNGEONS[q.stage].boss].name:'？？？'):q.foes.map(([k,n,hp])=>uiMonsterImage('enemy:'+k)+(save.bestiary.seen['enemy:'+k]?EN[k].name:'？？？')+' ×'+n+(q.roles?.[k]?' <span class="tag">'+q.roles[k]+'</span>':'')+(hp?'（訓練HP×'+hp+'）':'')).join('・')}</p><p class="gold">初回報酬：${arenaRewardHtml('trial',id)}${save.arena.rewards['trial:'+id]?'（受取済み）':''}</p>`,[['挑戦する',()=>arenaStartTrial(id),true],['課題一覧へ',()=>openArena('trial')]],'arena');
  }
  function openArenaChain(tier){facilitySelect('arena','chain');
    if(!ARENA_CLASSES.includes(tier)||!arenaCanChain(tier)||state!=='town'||arenaRun)return;
    const s=stats(),r=save.arena.chains[tier];openPanel(tier+'レベル級',`<p class="arena-rule">目標：推奨Lv合計 ＞ ${tier}</p><p>現在の勇者 Lv ${save.lv}<br>HP ${s.maxHp} ／ 攻撃 ${s.atk} ／ 防御 ${s.def}</p><p>支給：${icon('lifewater',24)} いのちの水 ×2</p><h3>抽選候補（推奨Lv ${tier}以下・重複なし）</h3><p>${arenaPool(tier).map(i=>'<span class="ui-arena-foe">'+uiMonsterImage('boss:'+DUNGEONS[i].boss)+(save.bestiary.seen['boss:'+DUNGEONS[i].boss]?BOSSES[DUNGEONS[i].boss].name:'？？？')+' Lv'+DUNGEONS[i].rec+'</span>').join('')}</p><p class="gold">初回報酬：${arenaRewardHtml('chain',tier)}${save.arena.rewards['chain:'+tier]?'（受取済み）':''}</p>`,[['連戦を始める',()=>arenaStartChain(tier),true],['級の一覧へ',()=>openArena('chain')]],'arena');
  }
  function arenaBegin(kind,q,tier){
    if(state!=='town'||arenaRun)return false;
    pfxClear();persist();const home=save,temp=JSON.parse(JSON.stringify(home));temp.settings=home.settings;
    arenaRun={kind,q,tier,home,pool:kind==='chain'?arenaPool(tier):[],used:[],phase:'starting',wins:0,total:0,elapsed:0,hits:0,supplied:0,lastStage:-1,clearDelay:0,settled:false,objective:{count:0,targets:new Set(),pair:0,cast:null,hold:0,web:new Set(),pushes:new Map(),groups:new Map(),sleepUntil:-1},failure:''};
    save=temp;save.hp=null;save.items=Object.fromEntries(Object.keys(ITEMS).map(k=>[k,0]));
    if(kind==='trial'){save.lv=q.lv;save.exp=0;save.gold=0;save.eq=Object.fromEntries(['weapon','armor','boots','charm'].map((k,i)=>[k,q.eq[i]]));save.owned=q.eq.filter(Boolean);save.skills=[...new Set([q.skill,...q.dual||[]])];save.skill=q.skill;save.craftSkills=q.dual||[];save.forge.inherited={...q.inherit};save.forge.upgrades={};}
    hardRun=null;closeTray();closePanel();deathT=0;transition=null;slowMo=hitStop=0;flash=shake=0;hint=0;tut=null;runExp=runGold=runKills=0;runLoot=[];runMaterials={};fx=[];texts=[];anims=[];toasts=[];combo=0;comboT=0;
    hero=newHero(VW/2,0);bag=kind==='trial'?(q.noPotion?{}:{potion:1}):{lifewater:2};if(kind==='trial'&&q.startHp)hero.hp=Math.ceil(hero.s.maxHp*q.startHp);for(const[k,n]of Object.entries(bag))save.items[k]=n;guildRunStart();showHud(true);arenaNextBattle();return true;
  }
  function arenaStartTrial(id){const q=arenaTrial(id);return arenaTrialOpen(q)?arenaBegin('trial',q,0):false;}
  function arenaStartChain(tier){return arenaCanChain(tier)?arenaBegin('chain',null,tier):false;}
  function arenaNextBattle(){
    const r=arenaRun;if(!r||r.settled||!hero||hero.hp<=0||!['starting','between','ready'].includes(r.phase)||r.phase==='ready'&&r.supplied!==r.wins)return false;closePanel();
    const choices=r.pool.filter(i=>!r.used.includes(DUNGEONS[i].boss));if(r.kind==='chain'&&!choices.length){r.failure='抽選候補がなくなったため挑戦を終了しました。';arenaFinish(false);return false;}const stage=r.kind==='trial'?r.q.stage:pick(choices);if(r.kind==='chain')r.used.push(DUNGEONS[stage].boss);
    r.currentStage=stage;r.lastStage=stage;r.currentRec=DUNGEONS[stage].rec;r.phase='fight';r.clearDelay=0;D={...DUNGEONS[stage],xp:0,gp:0,xk:0,gk:0};dIdx=stage;if(r.kind==='trial'&&r.q.extra)D.a=r.q.enemyScale;
    if(r.kind==='chain'||r.q.boss){enterBossRoom();ev.qT=1e9;banner.b=r.kind==='chain'?`連戦場 ${r.tier}レベル級・第${r.wins+1}戦／推奨Lv ${r.currentRec}`:'固定装備チャレンジ';}
    else{
      state='boss';arena={cx:VW/2,cy:0,R:330};boss=null;enemies=[];bullets=[];drops=[];rings=[];props=[];zones=[];freezeT=darkT=0;shades=[];twisters=[];evs=[];ev={qT:1e9};hero.x=arena.cx;hero.y=-230;hero.vx=hero.vy=0;bcamX=hero.x;bcamY=hero.y+120;
      const roster=r.q.foes.flatMap(([k,n,hp])=>Array.from({length:n},()=>({type:k,hp:hp||1})));const placed={};roster.forEach((entry,i)=>{const pos=r.q.formation?.[entry.type]?.[placed[entry.type]||0];placed[entry.type]=(placed[entry.type]||0)+1;const a=i/roster.length*Math.PI*2,rad=115+(i%3)*32,e=spawnEnemy(entry.type,arena.cx+(pos?pos[0]:Math.cos(a)*rad),arena.cy+(pos?pos[1]:30+Math.sin(a)*rad),true);e.hp=e.maxHp=EN[entry.type].hp*entry.hp;e.exp=e.gold=0;e.cd+=1.5;if(r.q.readyThreats?.includes(entry.type))e.cd=.2;confine(e,.2);});
      banner={a:r.q.name,b:'固定装備チャレンジ',t:2.4};A.bgm(FARR.dungeon[stage]);A.sfx('confirm');
    }
    hero.trail=[];paused=false;updateHudButtons();return true;
  }
  function arenaExtraRun(){const r=arenaRun;return r?.kind==='trial'&&r.q.extra&&r.phase==='fight'&&hero?.hp>0?r:null;}
  function arenaExtraScore(target,unique=true){const r=arenaExtraRun();if(!r)return;const o=r.objective;if(unique&&o.targets.has(target))return;o.targets.add(target);o.count++;A.sfx('confirm');}
  function arenaExtraEvent(kind,t,meta){
    const r=arenaExtraRun();if(!r)return;const o=r.objective,q=r.q;
    switch(q.goal){
      case 'bowling':if(kind==='bowling'&&t.type==='archer'&&meta?.projectile?.type==='slime')arenaExtraScore(t);break;
      case 'webRam':if(kind==='web'&&t.type==='wolf')o.web.add(t);if(kind==='ram'&&o.web.has(t)&&t.craftSlow>0)arenaExtraScore(t);break;
      case 'absorb':if(kind==='absorb'&&t.type==='mage')arenaExtraScore(t,false);break;
      case 'cerberus':if(kind==='cerberus'&&t.type==='golem')arenaExtraScore(t);break;
      case 'wall':if(kind==='ram'&&t.type==='mummy')o.pushes.set(t,r.elapsed);break;
      case 'tornado':if(kind==='tornado'&&meta?.cast){let g=o.groups.get(meta.cast);if(!g){g={targets:new Set(),scored:false};o.groups.set(meta.cast,g);}g.targets.add(t);if(g.targets.size>=2&&!g.scored){g.scored=true;o.count++;A.sfx('confirm');}}break;
      case 'decoy':if(kind==='decoySleep'&&t.type==='clockwork'&&meta?.cast&&o.sleepToken!==meta.cast){o.sleepToken=meta.cast;o.sleepUntil=r.elapsed+2;o.sleepUsed=false;A.sfx('confirm');popText(hero.x,hero.y+40,'今！ 射手を狙う','#e8d8ff',13,.8);}break;
      case 'fracture':if(kind==='fracture'&&t.type==='minotaur'&&meta?.quarry===t)arenaExtraScore(t);break;
      case 'tunnel':
        if(kind==='tunnelExit'&&t.type==='knight')o.tunnel={target:t,until:r.elapsed+1.2};
        if(kind==='ram'&&o.tunnel){const p=o.tunnel;o.tunnel=null;if(p.target===t&&r.elapsed<=p.until&&Math.cos(Math.atan2(hero.y-t.y,hero.x-t.x)-(t.face||0))<-.5)arenaExtraScore(t);}
        break;
    }
  }
  function arenaWallMeta(t){const r=arenaExtraRun(),at=r?.objective.pushes.get(t);return {pusher:t,qualified:r?.q.goal==='wall'&&t.type==='mummy'&&at!=null&&r.elapsed-at<=1.2};}
  function arenaAttackAllowed(t,kind){
    const r=arenaExtraRun();if(!r)return true;
    if(r.q.goal==='wall'&&t.type==='magicmirror'&&kind!=='wall'){arenaFail('まきょうへ直接攻撃しました。ミイラを壁へ押し当てた爆発で狙いましょう。');return false;}
    if(r.q.goal==='bone'&&t.type==='crossbow'&&kind!=='bone'){arenaFail('ボウガン兵への攻撃は骨弾だけです。');return false;}
    return true;
  }
  function arenaEnemyKilled(t,origin){
    const r=arenaExtraRun();if(!r)return;const o=r.objective;
    switch(r.q.goal){
      case 'wall':if(t.type==='magicmirror'){if(origin?.kind==='wall'&&origin.meta?.qualified)arenaExtraScore(t);else arenaFail('指定の壁爆発でまきょうを倒せませんでした。');}break;
      case 'bone':if(t.type==='crossbow'){if(origin?.kind==='bone')arenaExtraScore(t);else arenaFail('ボウガン兵を骨弾以外で倒しました。');}break;
      case 'decoy':
        if(t.type==='clockwork')arenaFail('ぜんまい兵を倒してしまいました。');
        if(t.type==='archer'){if(o.sleepToken&&!o.sleepUsed&&r.elapsed<=o.sleepUntil){o.sleepUsed=true;arenaExtraScore(t);}else arenaFail('新しい夢影で眠らせてから2秒以内に弓兵を倒しましょう。');}
        break;
    }
  }
  function arenaExtraFeasible(){
    const r=arenaRun,q=r.q,o=r.objective,types={bowling:'archer',webRam:'wolf',cerberus:'golem',fracture:'minotaur',tunnel:'knight'},type=types[q.goal];
    if(type&&o.count+enemies.filter(t=>!t.dead&&t.type===type&&!o.targets.has(t)).length<q.need)return '達成前に標的を倒し、必要な相手が足りなくなりました。';
    if(q.goal==='wall'&&o.count<q.need&&!enemies.some(t=>!t.dead&&t.type==='mummy'))return '起爆役のミイラを倒し切りました。';
    if(q.goal==='bone'&&o.count<q.need&&!enemies.some(t=>!t.dead&&t.type==='goblin')&&!(hero.craft?.bones>0)&&!hero.craft?.shots.some(b=>b.origin==='bone'&&b.life>0))return '補給役と骨弾がなくなりました。';
    if(q.goal==='absorb'&&(new Set([...o.targets,...enemies.filter(t=>!t.dead&&t.type==='mage')]).size<2||o.count<q.need&&!enemies.some(t=>!t.dead&&t.type==='mage')))return '反撃を当てるまどうしが足りなくなりました。';
    return '';
  }
  function arenaExtraLines(){
    const r=arenaRun,q=r.q,o=r.objective,n=Math.min(q.need,o.count),p=n+'/'+q.need;
    switch(q.goal){
      case 'bowling':return['射手への巻き込み '+p,'スライムを飛ばして当てる'];
      case 'webRam':return['糸→体当たり '+p+'体','自分の糸の鈍足中に当てる'];
      case 'absorb':return['吸収弾 '+p+'・相手 '+Math.min(2,o.targets.size)+'/2','貯蔵 '+(hero.craft?.absorb||0)+'/3・貫通弾は避ける'];
      case 'cerberus':return['三頭の追撃 '+p+'体','同じ相手へ異なる3方向'];
      case 'wall':return['壁爆発で撃破 '+p,'鏡への直接攻撃は禁止'];
      case 'tornado':return['複数への竜巻 '+p,'旋回して異なる2体へ命中'];
      case 'bone':return['骨弾で撃破 '+p,'骨片 '+(hero.craft?.bones||0)+'/5・射手は骨弾だけ'];
      case 'decoy':return['眠りの隙で撃破 '+p,o.sleepToken&&!o.sleepUsed&&r.elapsed<=o.sleepUntil?'弓兵を狙う！ 残り'+Math.max(0,o.sleepUntil-r.elapsed).toFixed(1)+'秒':'夢影で隙を作る・ぜんまい兵撃破禁止'];
      case 'fracture':return['裂界衝撃 '+p+'体','亀裂 '+(hero.craft?.fracture||0)+'/4・同じ相手へ'];
      case 'tunnel':return['潜行→背後の一撃 '+p,o.tunnel&&r.elapsed<=o.tunnel.until?'今！ 騎士の背後へ':'騎士をすり抜けて当てる'];
    }
  }

  // Only successful production combat effects report progress; casts/buttons do not.
  function arenaEvent(kind,amount=1,target=null,meta=null){
    const r=arenaRun;if(!r||r.kind!=='trial'||r.phase!=='fight'||hero.hp<=0||amount<=0)return;
    if(r.q.extra){arenaExtraEvent(kind,target,meta);return;}
    const o=r.objective,q=r.q;let add=0;
    if(kind==='ram'){
      if(q.goal==='redirect'&&o.redirect&&o.redirect.target!==target&&r.elapsed<=o.redirect.until){add=1;o.targets.add(target);o.redirect=null;}
      if(q.goal==='combo')o.count=Math.max(o.count,combo);
    }else if(kind==='redirect'&&q.goal==='redirect')o.redirect={target,until:r.elapsed+1.4};
    else if(kind==='skillHit'&&o.cast){if(!q.skillTargets||q.skillTargets[o.cast.id]?.includes(target?.type))o.cast.hit=true;}
    else if(kind==='seed'&&q.goal==='seed'){if(o.cast&&target&&(!q.targetTypes||q.targetTypes.includes(target.type)))o.cast.seeds.add(target);}
    else if(kind===q.goal){
      if(q.targetTypes&&!q.targetTypes.includes(target?.type))return;
      if(kind==='flame'&&q.minTargets&&(!Array.isArray(target)||new Set(target).size<q.minTargets))return;
      if(q.unique&&target)o.targets.add(target);
      if(kind==='bolt'){if(!o.targets.has(target)){o.targets.add(target);add=1;}}
      else add=amount;
    }
    if(add){o.count+=add;A.sfx('confirm');}
  }
  function arenaSkillBegin(id){const r=arenaRun;if(r?.kind==='trial'&&r.phase==='fight'&&['dual','seed'].includes(r.q.goal))r.objective.cast={id,hit:false,seeds:new Set()};}
  function arenaSkillEnd(){
    const r=arenaRun;if(!r?.objective.cast)return;const o=r.objective,c=o.cast;o.cast=null;
    if(r.q.goal==='seed'){if(c.seeds.size){o.count++;for(const t of c.seeds)o.targets.add(t);A.sfx('confirm');}return;}
    if(!c.hit){o.pair=0;return;}
    if(c.id==='shock')o.pair=1;
    else if(c.id==='thunder'&&o.pair===1){o.pair=0;arenaEvent('dual');}
  }
  function arenaBaseObjectiveMet(){
    const r=arenaRun;if(!r||r.kind!=='trial')return false;const q=r.q,o=r.objective;
    if(q.goal==='combo')return combo>=q.need;
    if(q.goal==='drain')return o.count>=Math.ceil(hero.s.maxHp*q.recover)&&hero.hp>=Math.ceil(hero.s.maxHp*q.finishHp);
    return o.count>=q.need&&(!q.unique||o.targets.size>=q.unique);
  }
  function arenaObjectiveMet(){return arenaBaseObjectiveMet()&&(!arenaRun.q.hold||arenaRun.objective.hold>=arenaRun.q.hold);}

  function arenaProgress(){
    const r=arenaRun,o=r.objective,q=r.q,n=Math.min(o.count,q.need);
    if(q.extra)return arenaExtraLines()[0];
    switch(q.goal){
      case 'redirect':return '再突進 '+n+'/'+q.need+'回 ／ 相手 '+Math.min(o.targets.size,q.unique)+'/'+q.unique+'体';
      case 'seed':return '最大火種のスキル爆発 '+n+'/'+q.need+'回 ／ 相手 '+Math.min(o.targets.size,q.unique)+'/'+q.unique+'体';
      case 'combo':return '現在 '+combo+' ／ 目標'+q.need+'コンボ・維持 '+Math.min(q.hold,o.hold).toFixed(1)+'/'+q.hold+'秒';
      case 'drain':return '吸血 '+Math.min(o.count,Math.ceil(hero.s.maxHp*q.recover))+'/'+Math.ceil(hero.s.maxHp*q.recover)+' HP ／ 現在'+Math.floor(hero.hp/hero.s.maxHp*100)+'％ → '+Math.round(q.finishHp*100)+'％・維持 '+o.hold.toFixed(1)+'/'+q.hold+'秒';
      case 'reflect':return '反射弾 '+n+'/'+q.need+'発 ／ 相手 '+Math.min(o.targets.size,q.unique)+'/'+q.unique+'体';
      case 'bolt':return '雷の軌跡 '+n+'/'+q.need+'体';
      case 'riposte':return '騎士への返し刃 '+n+'/'+q.need+'回';
      case 'flame':return '蓄熱 '+Math.floor((hero.craft?.heat||0)*100)+'％ ／ 複数への炎 '+n+'/'+q.need+'回';
      case 'dual':return '術の連携 '+n+'/'+q.need+'組 ／ 次は'+(o.pair?'弓兵へ雷':'ゴーレムへ衝撃波');
      case 'shield':return '盾 '+n+'/'+q.need+'回 ／ 被弾 '+r.hits+'/2 ／ ボス撃破';
    }
  }
  function arenaFail(reason){const r=arenaRun;if(!r||r.phase!=='fight')return false;r.failure=reason;return arenaFinish(false);}
  function arenaTick(dt){
    const r=arenaRun;if(!r||r.phase!=='fight')return;r.elapsed+=dt;
    if(r.kind!=='trial'||hero.hp<=0)return;
    if(r.q.maxHits!=null&&r.hits>r.q.maxHits){arenaFail('被弾回数の上限を超えました。');return;}
    if(r.elapsed>r.q.limit){arenaFail('制限時間を超えました。');return;}
    if(r.q.hold)r.objective.hold=arenaBaseObjectiveMet()?Math.min(r.q.hold,r.objective.hold+dt):0;
    if(arenaObjectiveMet()&&(!r.q.boss||boss?.dead)){arenaBattleWon();return;}
    if(r.q.extra){const reason=arenaExtraFeasible();if(reason){arenaFail(reason);return;}}
    if(!r.q.boss&&enemies.every(e=>e.dead)&&!(r.q.goal==='drain'&&arenaBaseObjectiveMet())){r.clearDelay+=dt;if(r.clearDelay>=.7)arenaFail('条件未達成のまま対戦相手を倒し切りました。');}
  }
  function arenaBattleWon(){
    const r=arenaRun;if(!r||r.phase!=='fight'||hero.hp<=0)return false;
    if(r.kind==='trial'){
      if(r.elapsed>r.q.limit||r.q.maxHits!=null&&r.hits>r.q.maxHits)return arenaFail('制限条件を満たしていません。');
      if(!arenaObjectiveMet()){if(r.q.boss&&boss?.dead)return arenaFail('盾で'+r.q.need+'回防ぐ前にボスを倒しました。');return false;}
      if(r.q.boss&&(!boss||!boss.dead))return false;
    }else{if(boss&&!boss.dead)return false;if(!boss&&enemies.some(e=>!e.dead))return false;}
    r.phase='between';r.wins++;bullets=[];zones=[];rings=[];drops=[];evs=[];for(const e of enemies)e.dead=true;
    if(r.kind==='trial')return arenaFinish(true);
    r.total+=r.currentRec;
    if(r.total>r.tier)return arenaFinish(true);
    if(r.wins%3===0){r.phase='rest';hero.itemCD=0;paused=true;arenaRest();return true;}
    transition={t:0,mid:.45,fn:arenaNextBattle};return true;
  }
  function arenaRest(){
    const r=arenaRun;if(!r||!['rest','ready'].includes(r.phase))return;paused=true;const taken=r.supplied===r.wins;
    openPanel('連戦場の休憩所',`<p class="arena-rule">${r.wins}連勝 ／ 推奨Lv合計 ${r.total} / ${r.tier}超</p><p>HP ${Math.ceil(hero.hp)} / ${hero.s.maxHp}<br>支給のいのちの水：${bag.lifewater||0}個</p><p>この休憩では回復アイテムを<b>1個だけ</b>補給できます。補給だけではHPは回復しません。</p><button class="btn" data-arena-supply ${taken?'disabled':''}>${taken?'補給済み':'いのちの水を1個受け取る'}</button><button class="btn" data-arena-heal ${(bag.lifewater||0)<=0||hero.hp>=hero.s.maxHp||hero.itemCD>0?'disabled':''}>いのちの水を使う（基本HP50％回復）</button><button class="btn primary" data-arena-next ${taken?'':'disabled'}>次の戦いへ</button><p class="arena-note">HPと残った支給品、一度きりの効果の使用状況を引き継ぎます。</p>`,[['挑戦を終えて街へ',arenaWithdraw]],'arena');
    craftBind('[data-arena-supply]',()=>{if(arenaSupply())arenaRest();},null);craftBind('[data-arena-heal]',()=>{if(useItem('lifewater'))arenaRest();},null);craftBind('[data-arena-next]',()=>{if(!arenaRun||arenaRun.phase!=='ready'||arenaRun.supplied!==arenaRun.wins)return;closePanel();arenaRun.phase='between';transition={t:0,mid:.45,fn:arenaNextBattle};},'confirm');
  }
  function arenaSupply(){const r=arenaRun;if(!r||r.phase!=='rest'||r.wins%3||r.supplied===r.wins)return false;bag.lifewater=(bag.lifewater||0)+1;save.items.lifewater=(save.items.lifewater||0)+1;r.supplied=r.wins;r.phase='ready';A.sfx('chest');updateHudButtons();return true;}
  function arenaRestore(){if(arenaRun){save=arenaRun.home;arenaRun=null;guildRun=null;guildDirty=false;guildSaveT=0;guildReadyCache.at=-99;craftDirty=0;}transition=null;}
  function arenaWithdraw(){if(!arenaRun)return;goTown();openArena(arenaTab);}
  function arenaPause(){
    const r=arenaRun;if(!r)return;if(['rest','ready'].includes(r.phase)){arenaRest();return;}if(r.phase==='saving'){arenaFinish(true);return;}if(r.phase==='between')return;
    paused=true;openPanel('闘技場・ポーズ',statusHtml()+(r.kind==='trial'?'<p class="arena-rule">'+r.q.rule+'<br>残り '+Math.max(0,Math.ceil(r.q.limit-r.elapsed))+'秒 ／ '+arenaProgress()+'</p>':'<p class="arena-rule">'+r.wins+'勝・推奨Lv合計 '+r.total+' / '+r.tier+'超</p>')+'<p class="arena-note">挑戦中の装備・スキルは固定です。支給品だけを使い、所持品は消費しません。</p>',[['つづける',()=>{paused=false;closePanel();},true],['挑戦を終える',arenaWithdraw]]);
  }
  function arenaFinish(won){
    const r=arenaRun;if(!r||r.settled||won&&!['between','saving'].includes(r.phase))return false;r.phase='saving';paused=true;let reward=0,next=r.home;
    if(won){
      next=JSON.parse(JSON.stringify(r.home));const group=r.kind==='trial'?'trials':'chains',key=r.kind==='trial'?r.q.id:String(r.tier),old=next.arena[group][key];reward=!next.arena.rewards[arenaRewardKey(r.kind,key)];
      next.arena[group][key]={clears:Math.min(999999,(old?.clears||0)+1),rule:r.kind==='trial'?arenaTrialRule(r.q):1,best:old&&(r.kind!=='trial'||old.rule===arenaTrialRule(r.q))?Math.min(old.best,r.elapsed):r.elapsed,perfect:(r.kind!=='trial'||old?.rule===arenaTrialRule(r.q))&&!!old?.perfect||r.kind==='trial'&&r.hits===0,battles:r.wins};
      try{if(reward)arenaGrant(next,r.kind,key);localStorage.setItem('bumphero_save',JSON.stringify(next));}catch(e){openPanel('記録を保存できませんでした','<p>報酬はまだ受け取っていません。'+(e.message.includes('所持上限')?e.message:'保存を再試行できます。')+'</p>',[['保存を再試行',()=>arenaFinish(true),true],['報酬を受け取らず街へ',arenaWithdraw]],'arena');return false;}
    }
    r.settled=true;r.phase='result';r.home=next;guildRun=null;state='over';paused=false;transition=null;A.jingle(won?'clear':'defeat');
    const name=r.kind==='trial'?r.q.name:r.tier+'レベル級',detail=r.kind==='trial'?`${r.hits===0&&won?'ノーダメージ勲章を獲得！':'被弾 '+r.hits+'回'}`:`${r.wins}勝 ／ 推奨Lv合計 ${r.total}（目標 ${r.tier}超）`;
    openPanel(won?'闘技場 クリア！':'闘技場 挑戦終了',`<p class="gold">${name}</p><p>${detail}${r.kind==='trial'?'<br>'+arenaProgress():''}${r.failure?'<br>'+r.failure:''}<br>挑戦時間 ${arenaTime(r.elapsed)}</p>${won?'<p>初回報酬：'+arenaRewardHtml(r.kind,r.kind==='trial'?r.q.id:r.tier)+(reward?' を獲得！':'（受取済み）')+'</p>':''}`,[...(r.kind==='trial'?[["もう一度挑戦",()=>{const id=r.q.id;goTown();arenaStartTrial(id);},!won]]:[]),['闘技場の一覧へ',()=>{goTown();openArena(r.kind==='trial'?'trial':'chain');},true],['街へもどる',goTown]]);return true;
  }
  function arenaHudBox(){const hpW=W<440?148:196,x=hpW+16;return{x,y:safeTop()+8,w:Math.min(220,W-x-Math.max(54,56/S)),h:50,hpW};}
  function arenaHudLines(){
    const r=arenaRun;if(!r)return[];
    if(r.kind==='trial'&&r.q.extra)return[r.q.name+' '+Math.max(0,Math.ceil(r.q.limit-r.elapsed))+'秒',...arenaExtraLines()];
    if(r.kind==='chain')return[r.tier+'級・第'+(r.wins+1)+'戦',r.wins+'勝　合計 '+r.total+'/'+r.tier+'超','相手Lv'+r.currentRec+'・3勝ごと補給'];
    const q=r.q,o=r.objective,n=Math.min(o.count,q.need),held=()=>Math.min(q.hold||0,o.hold).toFixed(1)+'/'+q.hold+'秒',labels={redirect:['再突進 '+n+'/'+q.need+'・相手 '+Math.min(o.targets.size,q.unique)+'/'+q.unique,'反動で別の敵へ'],seed:['爆発 '+n+'/'+q.need+'・相手 '+Math.min(o.targets.size,q.unique)+'/'+q.unique,'最大火種→別々のスキル'],combo:[combo+'/'+q.need+'コンボ','維持 '+held()],drain:['吸血 '+Math.min(o.count,Math.ceil(hero.s.maxHp*q.recover))+'/'+Math.ceil(hero.s.maxHp*q.recover)+' HP','HP'+Math.round(q.finishHp*100)+'％維持 '+held()],reflect:['反射 '+n+'/'+q.need+'・相手 '+Math.min(o.targets.size,q.unique)+'/'+q.unique,'射線をそろえて返す'],bolt:['雷の軌跡 '+n+'/'+q.need+'体','異なる敵に踏ませる'],riposte:['騎士への返し刃 '+n+'/'+q.need,'見切り→盾の隙へ'],flame:['複数への炎 '+n+'/'+q.need,'熱満タン→'+q.minTargets+'体を巻き込む'],dual:['術の連携 '+n+'/'+q.need+'組','次は'+(o.pair?'弓兵へ雷':'ゴーレムへ衝撃波')],shield:['盾 '+n+'/'+q.need,'盾を使ってからボス撃破']};
    if(q.maxHits!=null)labels[q.goal][1]+='・被弾'+r.hits+'/'+q.maxHits;

    const titles={redirect:'はね返り',seed:'火種爆発',combo:'連撃',drain:'吸血',reflect:'鏡返し',bolt:'雷の軌跡',riposte:'一閃反撃',flame:'蓄熱',dual:'双術',shield:'死騎士の試験'};
    return[titles[q.goal]+'　'+Math.max(0,Math.ceil(q.limit-r.elapsed))+'秒',...labels[q.goal]];
  }
  function arenaDrawHud(){
    const r=arenaRun;if(!r||state==='over')return;const b=arenaHudBox(),lines=arenaHudLines();
    ctx.fillStyle='rgba(19,24,58,.94)';ctx.fillRect(b.x,b.y,b.w,b.h);ctx.strokeStyle='#d6c49c';ctx.lineWidth=1;ctx.strokeRect(b.x,b.y,b.w,b.h);
    lines.forEach((s,i)=>{let size=i===2?9:10.5;ctx.font=`${size}px ${FONT}`;const width=ctx.measureText(s).width;if(width>b.w-10)size*= (b.w-10)/width;txt(s,b.x+6,b.y+13+i*15,size,i===0?'#f2c14e':'#f3ecda','left',false);});
  }
  function arenaDrawMarks(){
    const r=arenaRun;if(!r||r.kind!=='trial'||r.phase!=='fight')return;
    for(const e of enemies){if(e.dead)continue;const x=e.x,y=sy(e.y)-e.r-20;
      if(r.q.extra){const label=r.q.goal==='wall'&&e.type==='magicmirror'?'爆風のみ':r.q.goal==='bone'&&e.type==='crossbow'?'骨弾のみ':r.q.goal==='decoy'&&e.type==='clockwork'?'撃破禁止':r.q.goal==='webRam'&&e.type==='wolf'&&e.craftSlow>0&&!r.objective.targets.has(e)?'今！':'';if(label)txt(label,x,y-10,9,'#ffe1b0','center',false);}
      if((r.q.goal==='bolt'||r.q.extra)&&r.objective.targets.has(e)){ctx.strokeStyle='#fff2a0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x-1,y+4);ctx.lineTo(x+7,y-5);ctx.stroke();}
    }
    if(r.q.goal==='riposte'&&hero.craft?.riposte)txt('返し刃 準備！',hero.x,sy(hero.y)-42,12,'#e0b0ff','center',false);
    if(r.q.goal==='redirect'&&hero.craft?.rebound>0)txt('向きを変えて再突進！',hero.x,sy(hero.y)-42,12,'#ffe190','center',false);
  }
  function arenaDrawCombat(){
    const x=arena.cx,y=sy(arena.cy),r=arena.R;ctx.fillStyle='#373137';ctx.fillRect(-W*3,0,W*7,H);
    ctx.beginPath();ctx.arc(x,y,r+24,0,Math.PI*2);ctx.fillStyle='#796957';ctx.fill();ctx.lineWidth=6;ctx.strokeStyle='#b4a087';ctx.stroke();ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle='#9b8665';ctx.fill();
    ctx.save();ctx.clip();ctx.fillStyle='#8c785d';for(let yy=Math.floor((y-r)/42)*42;yy<y+r;yy+=42)ctx.fillRect(x-r,yy,r*2,1.5);ctx.fillStyle='#aa9673';for(let i=0;i<40;i++){const px=x+((i*97)%Math.round(r*2))-r,py=y+((i*131)%Math.round(r*2))-r;ctx.fillRect(px,py,3,1.5);}ctx.restore();ctx.lineWidth=12;ctx.strokeStyle='rgba(36,29,29,.35)';ctx.stroke();
  }
  function arenaDrawBuilding(p,x0){
    const r=townBuildingRect(),x=q(x0+r.x-8),y=q(r.y+12),w=q(r.w+16),by=q(r.by),cx=x+w/2;ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(x-6,by-3,w+12,10);ctx.fillStyle='#796c61';ctx.fillRect(x,y+20,w,by-y-20);ctx.fillStyle='#c6b798';ctx.fillRect(x-6,y+15,w+12,18);ctx.fillRect(x-9,by-9,w+18,9);
    for(let i=0;i<7;i++){const px=x+12+i*(w-24)/6;ctx.fillStyle='#4d4442';ctx.fillRect(px-10,y+49,20,38);ctx.fillStyle='#d4c3a0';ctx.fillRect(px-13,y+34,26,12);ctx.fillRect(px-13,y+89,26,9);ctx.fillStyle='#a8977e';ctx.fillRect(px-12,y+98,24,by-y-107);ctx.fillStyle='#e0d0ab';ctx.fillRect(px-12,y+98,4,by-y-107);}
    ctx.fillStyle='#28212b';ctx.fillRect(cx-29,by-67,58,58);ctx.fillRect(cx-23,by-79,46,12);ctx.fillRect(cx-13,by-85,26,6);ctx.fillStyle='#b64c45';ctx.fillRect(cx-44,y-26,3,42);ctx.fillRect(cx+41,y-26,3,42);ctx.fillRect(cx-41,y-26,28,18);ctx.fillRect(cx+44,y-26,28,18);ctx.fillStyle='#d4b86b';ctx.fillRect(cx-37,y-23,4,12);ctx.fillRect(cx+48,y-23,4,12);ctx.save();ctx.translate(cx,y+9);for(const sign of[-1,1]){ctx.save();ctx.rotate(sign*.65);ctx.fillStyle='#dfe3dd';ctx.fillRect(-2,-30,4,35);ctx.fillStyle='#d1ad54';ctx.fillRect(-9,3,18,4);ctx.fillStyle='#5a3626';ctx.fillRect(-2,7,4,12);ctx.restore();}ctx.restore();
  }
  function arenaDrawInterior(){
    ctx.fillStyle='#4c4243';ctx.fillRect(0,0,W,H);for(let i=0;i<5;i++){ctx.fillStyle=i%2?'#796a58':'#88785f';ctx.fillRect(0,H*.1+i*24,W,20);}ctx.fillStyle='#9c3d3c';ctx.fillRect(W*.18,H*.10,46,H*.18);ctx.fillRect(W*.70,H*.10,46,H*.18);ctx.fillStyle='#d6b76c';ctx.fillRect(W*.18+9,H*.12,28,5);ctx.fillRect(W*.70+9,H*.12,28,5);ctx.fillStyle='#a48d6b';ctx.fillRect(0,H*.34,W,H*.66);SPR.draw(ctx,SPR.ENV.npc('smith',Math.floor(globalT*1.5)),W/2,H*.34+30);ctx.fillStyle='#654d37';ctx.fillRect(0,H*.34+20,W,21);ctx.fillStyle='#b9a17d';ctx.fillRect(0,H*.34+20,W,3);
  }
  function arenaDrawRest(){
    ctx.fillStyle='#38333c';ctx.fillRect(0,0,W,H);ctx.fillStyle='#84735c';for(let i=0;i<6;i++)ctx.fillRect(0,60+i*25,W,22);ctx.fillStyle='#a18b68';ctx.fillRect(0,H*.30,W,H*.70);ctx.fillStyle='#614735';ctx.fillRect(W*.16,H*.27,110,13);ctx.fillRect(W*.18,H*.27+13,9,28);ctx.fillRect(W*.40,H*.27+13,9,28);ctx.fillStyle='#c8b680';ctx.fillRect(W*.65,H*.24,56,46);ctx.fillStyle='#6b5238';ctx.fillRect(W*.65,H*.24,56,5);SPR.draw(ctx,SPR.ENV.potion('#4ad8e8'),W*.73,H*.24);const oldArena=arena,oldCam=camY;arena=null;drawTownHero(W*.48,H*.35);arena=oldArena;camY=oldCam;
  }
  // ARENA END

  const DEF_SAVE = () => ({ v: 1, lv: 1, exp: 0, gold: 40, hp: null, items: { herb: 5, potion: 0, hipotion: 0, megapotion: 0, lifewater: 0, lifedrop: 0, elixir: 0, power: 0, guard: 0 }, loadout: null, slots: null,
    eq: { weapon: 'w0', armor: 'a0', boots: 'b0', charm: null }, owned: ['w0', 'a0', 'b0'], cleared: Array(35).fill(false), layout10: true, layout15: true, layout25: true,
    bestiary:{seen:{},obtained:{}}, kills: 0, skills: ['shock'], skill: 'shock', tut: 0, tutTown: 0, defense: {}, settings: { bgm: 0.8, sfx: 0.8, fps: 0, pad: 1 } });
  let save = DEF_SAVE();
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem('bumphero_save') || 'null');
      if (s && s.v === 1) { const d = DEF_SAVE(); save = Object.assign(d, s, { items: Object.assign(d.items, s.items), eq: Object.assign(d.eq, s.eq), settings: Object.assign(d.settings, s.settings) }); }
      // 5 -> 10 dungeons: old order was cave, goblin, catacomb, lava, castle
      if (s && s.v === 1 && !s.layout10) {
        const old = save.cleared || [], c = Array(10).fill(false);
        [0, 2, 4, 5, 9].forEach((ni, oi) => { if (old[oi]) c[ni] = true; });
        save.cleared = c; save.layout10 = true;
      }
      // 10 -> 15 dungeons: the castle moved from 10th to 15th
      if (s && s.v === 1 && !s.layout15) {
        const old = save.cleared || [], c = Array(15).fill(false);
        for (let i = 0; i < 9; i++) c[i] = !!old[i];
        c[14] = !!old[9]; save.cleared = c; save.layout15 = true;
      }
      // 15 -> 25 dungeons: ten new stages before the castle, which moved from 15th to 25th
      if (s && s.v === 1 && !s.layout25) {
        const old = save.cleared || [], c = Array(25).fill(false);
        for (let i = 0; i < 14; i++) c[i] = !!old[i];
        c[24] = !!old[14]; save.cleared = c; save.layout25 = true;
      }
      // ステップ (skill) became the basic roll: refund it
      if (save.skills && save.skills.includes('dash')) { save.skills = save.skills.filter(k => k !== 'dash'); if (save.skill === 'dash') save.skill = save.skills[0] || null; save.gold += 300; }
      // 指示: さいしょから つかえる スキル — しょうげきは is known from the start (older saves get it too)
      if (!Array.isArray(save.skills)) save.skills = [];
      if (!save.skills.includes('shock')) save.skills.unshift('shock');
      if (!save.skill) save.skill = save.skills[0];
      if (!save.defense || typeof save.defense !== 'object') save.defense = {};
      // a save that has already been adventuring skips the tutorial
      if (s && s.tut == null && (save.lv > 1 || (save.cleared || []).some(Boolean))) { save.tut = 1; save.tutTown = 1; }
    } catch (e) { /* storage blocked: play without saving */ }
  }
  function persist() { bestSyncOwned();try { localStorage.setItem('bumphero_save', JSON.stringify(arenaRun?arenaRun.home:save)); } catch (e) { } }

  function stats() {
    const L = save.lv;
    const s = { maxHp: 60 + (L - 1) * 10, atk: 8 + (L - 1) * 2, def: 2 + (L - 1), ram: 1, ramPower:1, fx: {} };
    for (const slot in save.eq) {
      const e = smithEquipment(EQ[save.eq[slot]]); if (!e) continue;
      if (e.atk) s.atk += e.atk; if (e.def) s.def += e.def; if (e.hp) s.maxHp += e.hp; if (e.ram) {s.ram = e.ram;s.ramPower=e.ramPower||1;}
      const fx=forgeFx(e);for (const k in fx) s.fx[k] = Math.max(s.fx[k] || 0, fx[k]);
    }
    return s;
  }
  const expNeed = L => Math.round(10 * Math.pow(L, 1.75));
  function curHp() { const m = stats().maxHp; return save.hp == null ? m : Math.min(save.hp, m); }

  // ---------------------------------------------------------------
  //  AUDIO — BGM: fantasy orchestra (fantasy.js + arrangements.js); SFX / voices: music.js
  // ---------------------------------------------------------------
  let audioOn = false;
  const A = {
    bgm(arr, opt) { if (audioOn && arr) try { FMusic.play(arr, opt); } catch (e) { } },
    jingle(n) { if (audioOn) try { FMusic.jingle(n); } catch (e) { } },
    sfx(name, a) { if (audioOn) FMusic.sfx(name, a); },
  };

  // ---------------------------------------------------------------
  //  STATE
  // ---------------------------------------------------------------
  let state = 'title';          // title | town | play | boss | over
  let paused = false;
  let D = null, dIdx = 0;       // current dungeon
  let nodes = [], goalY = 0;
  let gateNeed = 0, gateKills = 0, gateMsgT = 0, gateCallT = 0;   // the boss door opens once 70% of the corridor's monsters are down
  let hero = null, enemies = [], bullets = [], drops = [], props = [], fx = [], texts = [], rings = [], zones = [], anims = [];
  let bcamX = 180, bcamY = 0;   // boss-room camera
  let freezeT = 0, darkT = 0, shades = [], twisters = [];   // boss signature effects
  let boss = null, arena = null;
  let camY = 0, shake = 0, flash = 0, flashCol = '255,255,255', hitStop = 0, slowMo = 0;
  let t = 0, globalT = 0, beatPulse = 0, beatN = 0;
  let combo = 0, comboT = 0, runExp = 0, runGold = 0, runKills = 0;
  let banner = null, transition = null, hint = 0;
  // ---- tutorial (指示: チュートリアル): the first time in the first dungeon, seven guided steps; each waits until it is done ----
  const TUT = [
    { g: 'move', t: 'いどう', a: 'どこでも 指を おいて スライド', b: '勇者が その ほうこうに うごく' },
    { g: 'ram', t: 'とっしん', a: 'おおきく たおすと とっしん', b: 'オレンジに 光ったら こうげきの あいず' },
    { g: 'hit', t: 'たいあたり', a: 'とっしんで スライムに ぶつかろう', b: 'ぶつかると こうげき！ そのあと はねかえる' },
    { g: 'roll', t: 'かいひ', a: '指を すばやく はじくと ころがる', b: 'ころがって いる あいだは むてき' },
    { g: 'skill', t: 'スキル', a: 'がめんを すばやく 2かい タップ', b: 'スキル「しょうげきは」で ふきとばす' },
    { g: 'item', t: 'どうぐ', a: 'みぎしたの「どうぐ」を おしてみよう', b: 'やくそうで HPを かいふく できる' },
    { g: 'door', t: 'ボスへ', a: 'まものを 7わり たおすと', b: 'ボスの とびら（みぎうえ）が ひらく' },
  ];
  let tut = null;   // { i: step, t: time in step, okT: the 「できた！」 moment, moved, ramT, slime }
  // ---- surprise events: ハテナ箱 / 流れ星 / 魔物の大行進 / ゴールデンスライム / 行商人 ----
  let evs = [], ev = {}, noMerchant = false;
  const QB = {   // what a ハテナ箱 can give (dur = seconds; bomb = 3 hits)
    giant: { name: 'きょだいか', dur: 8, col: '#ff8a5a' },
    bolt: { name: 'いなずま', dur: 0, col: '#ffe14a' },
    clone: { name: 'ぶんしん', dur: 9, col: '#9ad0ff' },
    bomb: { name: 'ばくだんもち', dur: 15, col: '#ff9a5a' },
    rush: { name: 'ゴールドラッシュ', dur: 20, col: '#f2c14e' },
    slip: { name: 'ハズレ…つるつる', dur: 6, col: '#8ad0ff', bad: true },
    mirror: { name: 'ハズレ…あべこべ', dur: 5, col: '#d08aff', bad: true },
  };
  const QB_KEYS = Object.keys(QB);
  // a boss's temper when it gets angry (phase 2): [name, what it means]
  const PERS = { speed: ['はやて', 'うごきが すばやい'], barrage: ['だんまく', 'わざのあとに たまを ばらまく'], summon: ['しょうかん', 'てしたを よびつづける'], iron: ['てっぺき', 'かたいが こうげきは おそい'], berserk: ['もうしん', 'はげしいが まもりが あまい'] };
  const RAM_MIN = 127, HERO_R = 21, MAXSPD = 760;
  const CS = 1.5;   // character scale (hero / monsters drawn and collided 1.5x)
  const PAD_R = 76, PAD_MAX = 314;   // floating slide pad: radius (logical px; bigger = finer control) and full-tilt speed (0.49x of the first version)

  // ---------------------------------------------------------------
  //  DUNGEON GENERATION (the old tunnel, made wide)
  // ---------------------------------------------------------------
  function tunnelAt(y) {
    if(hardRun?.maze&&state!=='boss')return hardTunnelAt(y);
    let i = 0, lo = 0, hi = nodes.length - 1;
    while (lo < hi - 1) { const m = (lo + hi) >> 1; if (nodes[m].y <= y) lo = m; else hi = m; }
    i = lo;
    const a = nodes[i], b = nodes[Math.min(i + 1, nodes.length - 1)];
    const k = b.y === a.y ? 0 : clamp((y - a.y) / (b.y - a.y), 0, 1);
    const kk = k * k * (3 - 2 * k);
    return { cx: lerp(a.cx, b.cx, kk), w: lerp(a.w, b.w, kk) };
  }

  function genDungeon(di) {
    D = DUNGEONS[di]; dIdx = di;
    const r = mulberry(di * 7919 + 101 + Math.floor(Math.random() * 1e6));
    const R = (a, b) => a + r() * (b - a);
    nodes = [{ y: -400, cx: VW / 2, w: VW * 0.7 }, { y: 0, cx: VW / 2, w: VW * 0.7 }, { y: 260, cx: VW / 2, w: VW * 0.74 }];
    let y = 260, cx = VW / 2;
    while (y < D.len - 200) {
      y += R(160, 240);
      const hall = r() < 0.24;
      const w = hall ? VW * R(0.86, 0.9) : VW * R(D.w[0], D.w[1]);
      cx = clamp(cx + R(-70, 70), w / 2 + 6, VW - w / 2 - 6);
      nodes.push({ y, cx, w, hall });
    }
    goalY = D.len;
    nodes.push({ y: goalY - 120, cx: VW / 2, w: VW * 0.62 }, { y: goalY, cx: VW / 2, w: VW * 0.5 }, { y: goalY + 600, cx: VW / 2, w: VW * 0.5 });

    enemies = []; bullets = []; drops = []; props = []; fx = []; texts = []; rings = []; anims = [];
    // EXP / gold per run come from the dungeon's targets (monsters 70% / 55%, boss 30% / 25%, boxes 20% gold)
    let baseExp = 0, baseGold = 0;
    // monster groups, spaced through the dungeon
    for (let g = 0; g < D.groups; g++) {
      const gy = 420 + (g + R(0.1, 0.8)) * (D.len - 700) / D.groups;
      const tn = tunnelAt(gy);
      const n = (tn.w > VW * 0.85 ? 3 : 2) + (r() < 0.45 ? 1 : 0) + (di >= 2 && r() < 0.3 ? 1 : 0);
      for (let k = 0; k < n; k++) {
        const ey = gy + R(-60, 60), t2 = tunnelAt(ey);
        const e = spawnEnemy(wpick(D.pool, r()), t2.cx + R(-0.35, 0.35) * t2.w, ey);
        baseExp += EN[e.type].exp; baseGold += EN[e.type].gold;
      }
    }
    gateNeed = Math.max(1, Math.ceil(enemies.length * 0.7)); gateKills = 0; gateMsgT = 0; gateCallT = 0;
    D.xk = D.xp * 0.7 / Math.max(1, baseExp); D.gk = D.gp * 0.55 / Math.max(1, baseGold);
    for (const e of enemies) { e.exp = Math.max(1, Math.round(EN[e.type].exp * D.xk)); e.gold = Math.max(1, Math.round(EN[e.type].gold * D.gk)); }
    // props: rocks, crates, chests, spike traps, torches
    const place = (min, max) => { const py = R(min, max), tn = tunnelAt(py); return { x: tn.cx + R(-0.38, 0.38) * tn.w, y: py }; };
    for (let i = 0; i < D.rocks; i++) { const p = place(380, D.len - 300); props.push({ type: 'rock', x: p.x, y: p.y, r: R(14, 22), seed: r() }); }
    for (let i = 0; i < D.crates; i++) { const p = place(300, D.len - 300); props.push({ type: 'crate', x: p.x, y: p.y, r: 13, hp: 1 }); }
    for (let i = 0; i < D.chests; i++) { const p = place(D.len * (0.25 + i * 0.4), D.len * (0.4 + i * 0.4)); props.push({ type: 'chest', x: p.x, y: p.y, r: 14, open: false }); }
    // gimmicks and spike traps each claim a stretch of corridor so they never pile up
    const used = props.filter(p => p.type === 'chest').map(p => [p.y - 90, p.y + 90]);
    used.push([D.len - 420, D.len + 999]);
    const claim = (half, tries = 30) => {
      for (let k = 0; k < tries; k++) {
        const y = R(560, D.len - 440);
        if (used.every(([a, b]) => y + half + 60 < a || y - half - 60 > b)) { used.push([y - half, y + half]); return y; }
      }
      return null;
    };
    const G = GIM[di] || {}, side = () => (r() < 0.5 ? -1 : 1);
    let hazards = 0;
    for (const kind in G) for (let i = 0; i < G[kind]; i++) {
      if (kind === 'mud' || kind === 'poison' || kind === 'ice') {
        const y = claim(70); if (y == null) continue; const tn = tunnelAt(y), rx = tn.w * R(0.2, 0.26), sd = side();
        props.push({ type: kind, x: tn.cx + sd * (tn.w / 2 - rx * 1.15), y, rx, ry: R(55, 75), seed: r() });
        if (kind === 'poison') hazards++;
      } else if (kind === 'belt' || kind === 'stream') {
        const y = claim(80); if (y == null) continue; const tn = tunnelAt(y), w2 = tn.w * 0.44, sd = side();
        const dir = kind === 'stream' ? (r() < 0.55 ? 1 : -1) : (r() < 0.5 ? 1 : -1);
        props.push({ type: kind, x: tn.cx + sd * (tn.w / 2 - w2 / 2 - 10), y, w: w2, h: 150, dir, spd: kind === 'belt' ? 170 : 150 });
      } else if (kind === 'crumble') {
        const y = claim(45); if (y == null) continue; const tn = tunnelAt(y), w2 = tn.w * R(0.36, 0.44);
        props.push({ type: 'crumble', x: tn.cx + R(-0.22, 0.22) * tn.w, y, w: w2, h: 72, st: 0, t: 0 }); hazards++;
      } else if (kind === 'vent') {
        const y = claim(40); if (y == null) continue; const tn = tunnelAt(y);
        props.push({ type: 'vent', x: tn.cx + R(-0.3, 0.3) * tn.w, y, r: 34, ph: r() * 3.4, hit: new Set() }); hazards++;
      } else if (kind === 'bumper') {
        const y = claim(30); if (y == null) continue; const tn = tunnelAt(y);
        props.push({ type: 'bumper', x: tn.cx + R(-0.3, 0.3) * tn.w, y, r: 17, lit: 0 });
      } else if (kind === 'barrel') {
        const y = claim(25); if (y == null) continue; const tn = tunnelAt(y);
        for (let k = 0; k < (r() < 0.5 ? 2 : 1); k++) props.push({ type: 'barrel', x: tn.cx + R(-0.32, 0.32) * tn.w, y: y + k * 30, vx: 0, vy: 0, r: 14, fuse: 0 });
      } else if (kind === 'boulder') {
        const y = claim(60); if (y == null) continue;
        props.push({ type: 'roller', x: tunnelAt(y).cx, y, lane: side() * R(0.15, 0.3), t: r() * 2, warn: 0 });
      } else if (kind === 'warp') {
        const y1 = claim(35), y2 = y1 == null ? null : claim(35); if (y1 == null || y2 == null) continue;
        const a = Math.min(y1, y2), b = Math.max(y1, y2), id = props.length, t1 = tunnelAt(a), t2 = tunnelAt(b);
        props.push({ type: 'warp', x: t1.cx + R(-0.25, 0.25) * t1.w, y: a, r: 24, pair: id + 1 }, { type: 'warp', x: t2.cx + R(-0.25, 0.25) * t2.w, y: b, r: 24, pair: id });
      } else if (kind === 'mace') {
        const y = claim(95); if (y == null) continue; const tn = tunnelAt(y);
        props.push({ type: 'mace', x: tn.cx + R(-0.12, 0.12) * tn.w, y, len: Math.min(84, tn.w * 0.3), ang: r() * 6.28, w: side() * R(1.7, 2.2), hit: new Map() });
      } else if (kind === 'swing') {
        const y = claim(70); if (y == null) continue; const tn = tunnelAt(y), sd = side();
        props.push({ type: 'swing', x: tn.cx + sd * (tn.w / 2 - 4), y, sd, len: tn.w * 0.72, ph: r() * 6.28, hit: new Map() });
      }
    }
    // fewer spike traps where the floor already hurts
    const nSpikes = D.spikes ? Math.max(1, D.spikes - hazards) : 0;
    for (let i = 0; i < nSpikes; i++) {
      const py = claim(17); if (py == null) continue; const tn = tunnelAt(py), w2 = R(0.35, 0.6) * tn.w;
      props.push({ type: 'spike', x: tn.cx + R(-0.2, 0.2) * tn.w, y: py, w: w2, h: 34, ph: r() * 2 });
    }
    // surprise events for this run
    evs = []; ev = {};
    for (let i = 0, nq = r() < 0.5 ? 1 : 2; i < nq; i++) { const y = claim(22); if (y == null) continue; const tn = tunnelAt(y); evs.push({ type: 'qbox', x: tn.cx + R(-0.25, 0.25) * tn.w, y, t: r() * 3 }); }
    if (di >= 2 && r() < 0.15) { const y = claim(40); if (y != null) { const tn = tunnelAt(y), sd = r() < 0.5 ? -1 : 1; evs.push({ type: 'merchant', x: tn.cx + sd * (tn.w / 2 - 34), y, r: 18, t: 0 }); } }
    if (r() < 0.2) ev.starY = R(D.len * 0.25, D.len * 0.75);
    if (di >= 1 && r() < 0.25) ev.paradeY = R(D.len * 0.35, D.len * 0.7);
    if (r() < 0.22) { const gy = R(D.len * 0.3, D.len * 0.75), tn = tunnelAt(gy), e = spawnEnemy('goldslime', tn.cx, gy); e.exp = Math.round(D.xp * 0.05); e.gold = Math.round(D.gp * 0.12); }
    if (r() < PINK_DIAMOND_RATE) { const gy=R(D.len*.3,D.len*.75),tn=tunnelAt(gy);spawnEnemy('pinkdiamondslime',tn.cx,gy); }
    // warp pads point at each other by index, so link them before sorting
    for (const p of props) if (p.type === 'warp') p.to = props[p.pair];
    for (let ty = 200; ty < D.len; ty += 230) props.push({ type: 'torch', side: (ty / 230) % 2 < 1 ? -1 : 1, y: ty });
    props.push({ type: 'spring', x: VW / 2, y: goalY - 190, r: 26, used: false });
    props.sort((a, b) => a.y - b.y);
  }

  function spawnEnemy(type, x, y, arenaSpawn) {
    const b = EN[type], m = D.m, a = D.a;
    const e = {
      type, name: b.name, x, y, vx: 0, vy: 0, r: Math.round(b.r * CS), mass: b.mass, spd: b.spd, ai: b.ai, col: b.col, fly: !!b.fly,
      hp: Math.round(b.hp * m), maxHp: Math.round(b.hp * m), atk: Math.round(b.atk * a), def: Math.round(b.def * a),
      exp: Math.max(1, Math.round(b.exp * (D.xk || 1))), gold: Math.max(1, Math.round(b.gold * (D.gk || 1))),
      mod: b.mod || {}, st: 'idle', t: rnd(0, 1), cd: rnd(0.5, 1.5), face: -Math.PI / 2, hurt: 0, hitCD: 0, active: !!arenaSpawn, alpha: 1, guard: false, phase: rnd(0, 6),
    };
    if (e.ai === 'guard') e.guard = true;
    e.dashSpd = b.dash || 360; e.windT = b.wind || 0.45;
    if(hardRun?.maze&&state!=='boss')hardSnap(e);
    enemies.push(e);
    return e;
  }

  // ---------------------------------------------------------------
  //  HERO
  // ---------------------------------------------------------------
  function newHero(x, y) {
    const s = stats();
    return { x, y, vx: 0, vy: 0, r: HERO_R, hp: curHp(), inv: 0, face: Math.PI / 2, trail: [], lvFlash: 0, s, recoil: 0, ramSafe: 0, stun: 0, stunImm: 0, buff: { atk: 0, def: 0 } };
  }
  function heroSpeed() { return hyp(hero.vx, hero.vy); }

  function gainExp(n) {
    if(arenaRun)return;
    if(hardRun)n=Math.round(n*HARD_BONUS);
    if (hero && hero.s.fx.exp) n = Math.round(n * (1 + hero.s.fx.exp));
    runExp += n; save.exp += n;
    let up = 0;
    while (save.exp >= expNeed(save.lv)) { save.exp -= expNeed(save.lv); save.lv++; up++; }
    if (up) {
      const old = hero.s; hero.s = stats();
      hero.hp = Math.min(hero.s.maxHp, hero.hp + (hero.s.maxHp - old.maxHp) + Math.round(hero.s.maxHp * 0.3));
      hero.lvFlash = 1.6;
      popText(hero.x, hero.y + 40, `LEVEL UP!  Lv ${save.lv}`, '#f2c14e', 22, 1.6);
      popText(hero.x, hero.y + 16, `HP+${hero.s.maxHp - old.maxHp}  こうげき+${hero.s.atk - old.atk}  ぼうぎょ+${hero.s.def - old.def}`, '#fff', 12, 1.6);
      flash = 0.5; flashCol = '255,220,120';
      A.sfx('levelup');
      burst(hero.x, hero.y, 26, '#f2c14e', 260);
    }
  }
  function gainGold(n) { if(arenaRun)return;if(hardRun)n=Math.round(n*HARD_BONUS);bestObtain('gold');if (hero && hero.s.fx.gold) n = Math.round(n * (1 + hero.s.fx.gold)); runGold += n; save.gold += n; }

  const hurtLog = {};
  // put the hero to sleep / turn them to stone for a moment (no control); a short immunity follows so it can't chain
  function stunHero(t, kind) {
    if (defAimT && defAimT !== hero) return;
    const h = hero; if (!h || h.hp <= 0 || h.roll > 0 || h.stunImm > 0 || (h.pw && h.pw.kind === 'giant')) return;
    h.stun = t; h.stunKind = kind; h.stunImm = t + 2.6; h.vx *= 0.3; h.vy *= 0.3;
    popText(h.x, h.y + 36, kind === 'stone' ? 'せきか！' : 'ねむってしまった…', kind === 'stone' ? '#e0dcd0' : '#e8c0ff', 15, 1.1);
    A.sfx(kind === 'stone' ? 'block' : 'magic2');
  }
  function hurtHero(dmg, fromX, fromY, power = 300, cause = '?', crit = false) {
    if (defAimT && defAimT !== hero) { defHurtUnit(defAimT, dmg, fromX, fromY, power); return; }   // 防衛戦: the blow was aimed at a companion / the gate
    if(hero&&hero.roll>0&&!/patch:|spike|vent|poison/.test(cause))guildDodge();
    if(hero&&hero.roll>0&&craftState().rollAge<=.14&&!/patch:|spike|vent|poison/.test(cause))craftPerfect();
    if(craftFloorImmune()&&/patch:|spike|vent|crumble/.test(cause))return;
    if (tut && tut.i < TUT.length - 1) return;   // no damage while learning the controls
    if (hero.inv > 0 || hero.hp <= 0 || (hero.pw && hero.pw.kind === 'giant')) return;
    let d = Math.max(1, Math.round(dmg - hero.s.def * 0.5));
    hurtLog[cause] = (hurtLog[cause] || 0) + d;
    if (hero.buff.def > 0) d = Math.max(1, Math.round(d * 0.5));
    if (hero.barrierT > 0) { if(hero.s.fx.aegis)arenaEvent('shield');pfxEmit('impacts/shield-block',hero.x,hero.y,110,.4);hero.barrierT = 0; hero.inv = 0.6; popText(hero.x, hero.y + 30, 'バリア！', '#c8b0ff', 16, 0.9); burst(hero.x, hero.y, 24, '#c8b0ff', 240, 0.5); A.sfx('block'); return; }
    if (hero.guardT > 0) { d = Math.max(1, Math.round(d * 0.4)); power *= 0.3; }
    const adjusted=craftDamageAdjust(d,fromX,fromY,power,cause);d=adjusted.d;power=adjusted.power;if(d<=0)return;
    guildHit();if(arenaRun)arenaRun.hits++;hero.hp -= d; hero.inv = 0.85 + (hero.s.fx.guard || 0); hero.calmT = 0;
    const dx = hero.x - fromX, dy = hero.y - fromY, l = hyp(dx, dy) || 1;
    hero.vx += dx / l * power; hero.vy += dy / l * power;
    popText(hero.x, hero.y + 20, '-' + d, crit ? '#ffb020' : '#ff5a4a', crit ? 24 : 18, 0.9);
    if (crit) { popText(hero.x, hero.y + 46, 'つうこんの いちげき！', '#ffd23a', 15, 1.1); shake = Math.max(shake, 16); hitStop = Math.max(hitStop, 0.1); }
    shake = Math.max(shake, 10); flash = 0.35; flashCol = '255,40,40'; hitStop = Math.max(hitStop, 0.05);
    A.sfx('hurt'); combo = 0;
    if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) { }
    if (hero.hp <= 0 && !tryRevive()) { hero.hp = 0; heroDown(); }
    if (hero.s.fx.hourglass && hero.hp > 0 && hero.hp < hero.s.maxHp * 0.3 && !(hero.hgCD > 0)) {   // すなどけい: the shots stop
      hero.hgCD = 40; freezeT = Math.max(freezeT, hero.s.fx.hourglass); flash = 0.35; flashCol = '230,210,150'; A.sfx('warp');
      popText(hero.x, hero.y + 48, 'すなどけいが まわった！', '#f0d890', 15, 1.2);
    }
  }
  function tryRevive() {   // ながれぼしのかけら: once per adventure
    const h = hero; if (!h.s.fx.revive || h.revived) return false;
    h.revived = true; h.hp = Math.round(h.s.maxHp * h.s.fx.revive); h.inv = 2.2; h.stun = 0;
    flash = 0.9; flashCol = '255,240,170'; shake = 12; burst(h.x, h.y, 40, '#ffe680', 320, 0.9); A.sfx('levelup');
    popText(h.x, h.y + 56, 'ながれぼしの きせき！ ふっかつ！', '#ffe680', 18, 1.6);
    return true;
  }

  const HEALS = ['herb', 'potion', 'hipotion', 'megapotion', 'lifewater', 'lifedrop', 'elixir'];
  // what goes into the dungeon: the loadout, topped up from the stock at home (never more than you own or the carry limit)
  let bag = {};
  function fillBag(lo) {
    const b = {};
    for (const id in lo || {}) { if (!ITEMS[id] || Object.keys(b).length >= BAG_KINDS) continue; const n = Math.min(lo[id], ITEMS[id].carry, save.items[id] || 0); if (n > 0) b[id] = n; }
    return b;
  }
  function autoLoadout() {   // no loadout yet: the three strongest heals you have, as many as you can take
    const lo = {}, mh = stats().maxHp;
    HEALS.filter(id => (save.items[id] || 0) > 0).sort((a, b) => healOf(b, mh) * ITEMS[b].carry - healOf(a, mh) * ITEMS[a].carry).slice(0, BAG_KINDS).forEach(id => { lo[id] = ITEMS[id].carry; });
    return lo;
  }
  function gainItem(id, n = 1) { bestObtain('item:'+id);save.items[id] = Math.min(ITEM_MAX, (save.items[id] || 0) + n); bag[id] = (bag[id] || 0) + n; updateHudButtons(); }
  const tierHeal = () => ['megapotion', 'hipotion', 'potion'].find(itemOpen);   // the best fixed heal of this point in the game (chests etc.)
  const ITEM_CD = 6;   // seconds before the next item can be used (shared by every item)
  // use an item. no id = pick a sensible heal automatically (also used by the test bot)
  function useItem(id) {
    if (!hero || hero.hp <= 0) return false;
    const it = bag, miss = hero.s.maxHp - hero.hp;
    if (!id) {
      if (miss <= 0) return false;
      const order = HEALS.filter(k => it[k] > 0);
      id = order.find(k => healOf(k, hero.s.maxHp, hero.s.fx) >= miss) || order[order.length - 1];
      if (!id) { popText(hero.x, hero.y + 26, 'かいふくアイテムがない', '#ff9a8a', 13, 0.9); return false; }
    }
    if (!it[id]) return false;
    if (!ITEMS[id].buff && !ITEMS[id].craft && !craftHas('b02') && miss <= 0) { popText(hero.x, hero.y + 26, 'HPは まんたん', '#fff', 13, 0.8); return false; }
    if (hero.itemCD > 0) { popText(hero.x, hero.y + 26, `あと ${Math.ceil(hero.itemCD)}びょう`, '#ff9a8a', 13, 0.8); A.sfx('block'); return false; }
    const I = ITEMS[id];
    if(I.craft){if(!craftUsePotion(I.craft)){popText(hero.x,hero.y+26,'今は効果がありません','#ff9a8a',13,.8);return false;}save.items[id]=Math.max(0,(save.items[id]||0)-1);it[id]--;hero.itemCD=ITEM_CD-(hero.s.fx.medic||0);persist();popText(hero.x,hero.y+26,I.name+'！','#b0d8b8',15,1);A.sfx('buff');updateHudButtons();return true;}
    guildItem(!I.buff);save.items[id] = Math.max(0, (save.items[id] || 0) - 1);   // used up for good (what you didn't use stays at home)
    if (I.buff) {
      it[id]--; hero.buff[I.buff] = I.dur * (1 + (hero.s.fx.buff || 0));
      popText(hero.x, hero.y + 26, I.name + '！', I.buff === 'atk' ? '#ff9a5a' : '#9fd0ff', 16, 1.1);
      burst(hero.x, hero.y, 18, I.buff === 'atk' ? '#ff9a5a' : '#9fd0ff', 180); A.sfx('buff');
    } else {
      it[id]--;
      const h = Math.min(miss, healOf(id, hero.s.maxHp, hero.s.fx));
      hero.hp += h;craftOnHeal(healOf(id,hero.s.maxHp,hero.s.fx),h);
      popText(hero.x, hero.y + 26, `${I.name}  +${h}`, '#6fd38a', 16, 1.1);
      burst(hero.x, hero.y, 16, '#6fd38a', 160); A.sfx('heal');
    }
    hero.itemCD = ITEM_CD - (hero.s.fx.medic || 0);
    updateHudButtons(); return true;
  }


  // ---------------------------------------------------------------
  //  FX helpers
  // ---------------------------------------------------------------
  function popText(x, y, s, col, size = 16, life = 0.9) { texts.push({ x, y, s, col, size, life, max: life }); if (texts.length > 40) texts.shift(); }
  function burst(x, y, n, col, spd = 200, life = 0.6) {
    for (let i = 0; i < n; i++) { const a = rnd(0, 6.283), v = rnd(0.3, 1) * spd; fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.5, 1) * life, max: life, col, r: rnd(1.5, 3.5) }); }
    if (fx.length > 400) fx.splice(0, fx.length - 400);
  }
  // PIXELFX BEGIN — atlas playback only; no combat RNG, damage or physics.
  const pfxData=window.PIXELFX_ATLAS,pfxImages=[],pfxEvents=[],pfxUsed=new Set(),pfxImpactAt=new WeakMap();
  let pfxClock=0,pfxCalls=0,pfxSerial=0,pfxLoaded=0;
  if(pfxData&&typeof Image!=='undefined')for(const src of pfxData.images){const img=new Image();img.onload=()=>{pfxLoaded++;};img.src=src;pfxImages.push(img);}
  const pfxEnabled=()=>!!pfxData&&save.settings.pixelfx!==false;
  function pfxSprite(id,x,y,u,width=100,angle=0,alpha=1,ys=1,attached=false,ui=false){
    if(!pfxData||(!ui&&!pfxEnabled())||pfxCalls>=42||!Number.isFinite(x+y+u+width+angle+alpha)||alpha<=0)return false;
    const e=pfxData.effects[id];if(!e)return false;const at=Math.min(e.frames.length-1,Math.max(0,Math.floor(clamp(u,0,.99999)*e.frames.length))),r=e.frames[at];if(!r)return false;
    const img=pfxImages[r[0]];if(!img||!img.complete||!img.width)return false;
    const pin=Array.isArray(attached)?attached:attached&&e.socket?e.socket:e.anchors?.[at]||[e.ox,e.oy],k=width/e.w;if(!ui&&(x+width*2<bcamX-W||x-width*2>bcamX+W||y+width*2< -200||y-width*2>H+200))return false;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha*=clamp(alpha,0,1);ctx.translate(q(x),q(y));if(angle)ctx.rotate(angle);ctx.scale(k,k*ys);ctx.drawImage(img,r[1],r[2],r[3],r[4],r[5]-pin[0],r[6]-pin[1],r[3],r[4]);ctx.restore();pfxCalls++;pfxUsed.add(id);return true;
  }
  function pfxEmit(id,x,y,width=120,dur=.65,angle=0,back=false){
    if(!pfxEnabled()||!pfxData.effects[id])return;
    // Events are visual-only and bounded even during a dense boss barrage.
    if(pfxEvents.length>=28)pfxEvents.shift();pfxEvents.push({id,x,y,width,dur,angle,back,t:0,serial:++pfxSerial});
  }
  function pfxTick(dt){pfxClock+=dt;for(let i=pfxEvents.length-1;i>=0;i--){pfxEvents[i].t+=dt;if(pfxEvents[i].t>=pfxEvents[i].dur)pfxEvents.splice(i,1);}}
  function pfxClear(){pfxEvents.length=0;}
  function pfxDrawEvents(back){for(const e of pfxEvents)if(e.back===back){const u=e.t/e.dur;pfxSprite(e.id,e.x,sy(e.y),u,e.width,e.angle,Math.min(1,(1-u)*5));}}
  function pfxCast(id){
    const h=hero;if(!h)return;const map={shock:['impacts/ground-slam',260,.65],cry:['fire/fire-ring',160,.7],heal:['holy/heal-aoe',165,1],frost:['ice/frost-nova',320,.85],sand:['arcane/time-stop',220,.8],holy:['holy/holy-pillar',140,.8],meteor:['arcane/magic-circle-cast',100,.6],thunder:['lightning/charge-up',100,.45]};const m=map[id];if(m)pfxEmit(m[0],h.x,h.y,m[1],m[2]);
  }
  function pfxHero(back){
    const h=hero;if(!h||h.hp<=0)return;
    if(back){if(h.guardT>0)pfxSprite('holy/divine-shield',h.x,sy(h.y),pfxClock%2.4/2.4,85,0,.8);if(h.barrierT>0)pfxSprite('arcane/magic-circle-cast',h.x,sy(h.y),pfxClock%2/2,110,0,.6);if(h.cryT>0)pfxSprite('fire/fire-ring',h.x,sy(h.y),pfxClock%1.3/1.3,90,0,.45);}
    else{
      if(h.whirlT>0)pfxSprite('melee/spin-slash',h.x,sy(h.y)-12,pfxClock%.3/.3,200,-h.face,.85);
      if(h.holy)pfxSprite('holy/blessing',h.x,sy(h.y),pfxClock%3/3,75,0,.75);
      if(h.barrierT>0)pfxSprite('holy/divine-shield',h.x,sy(h.y),pfxClock%2.4/2.4,95,0,.5);
      if(h.meteor){const k=clamp(h.meteor.t/.9,0,1);pfxSprite('fire/fireball',h.meteor.x-150*(1-k),sy(h.meteor.y)-340*(1-k),pfxClock%1.2/1.2,85,Math.PI/3,.9);}
    }
  }
  function pfxAnim(a){
    const u=a.t/a.dur;
    if(a.kind==='bolt')return pfxSprite('lightning/lightning-strike',a.x,sy(a.y),u,160,0,.95);
    if(a.kind==='spark')return pfxSprite(a.big?'impacts/crit-hit':'impacts/hit-spark',a.x,sy(a.y),u,a.big?135:82,0,.95);
    if(a.kind==='poof')return pfxSprite('spawn/poof',a.x,sy(a.y),u,92,0,.8);
    return false;
  }
  function pfxProc(p){
    let id=p.kind==='fire'?'explosions/small-explosion':p.kind==='thunder'?'lightning/thunderclap':p.kind==='water'?'water/splash':'arcane/mana-burst',width=140*(p.scale||1),angle=0;
    const s=p.label||'';
    const labels=[[/旋回竜巻/,'nature/tornado',165],[/導爆/,'explosions/big-explosion',220],[/火種/,'explosions/small-explosion',170],[/蓄熱/,'fire/fire-breath',200],[/三頭/,'fire/flame-pillar',150],[/裂界/,'nature/earth-spike',225],[/潮流/,'water/wave-crash',220],[/吸引/,'explosions/implosion',190],[/幽霊砲/,'shadow/soul-drain',170],[/吸弾/,'arcane/mana-burst',150],[/夢|影|残像/,'arcane/blink-in',125],[/蓄力/,'impacts/ground-slam',190],[/反攻/,'shadow/dark-explosion',220],[/大槌/,'melee/hammer-smash',140],[/双撃/,'melee/heavy-cleave',185],[/氷|凍/,'ice/ice-shatter',150],[/光へ/,'holy/holy-pillar',160],[/闇へ/,'shadow/shadow-tendrils',160],[/充電|三拍/,'lightning/thunderclap',180]];
    for(const[re,key,size]of labels)if(re.test(s)){id=key;width=size*(p.scale||1);break;}
    if(/蓄熱|潮流|幽霊砲/.test(s))angle=-(p.angle||hero?.face||0);
    return pfxSprite(id,p.x,sy(p.y),1-p.life/p.max,Math.min(300,width),angle,.9);
  }
  function pfxSweep(s,x,y,B){if(s.t<s.tele)return;const id=/thrust|stab|lunge/.test(B?.mv?.name||'')?'melee/thrust':s.kind==='club'?'melee/hammer-smash':s.kind==='tail'?'melee/claw-swipe':s.kind==='scythe'?'melee/heavy-cleave':'melee/sword-slash';pfxSprite(id,x,y,clamp((s.t-s.tele)/Math.max(.15,s.act||.45),0,.99),s.kind==='club'?90:80,-s.ang+Math.PI/2,.75);}
  function pfxImpact(t,col,power){
    if(!pfxEnabled()||(pfxImpactAt.get(t)||-99)>pfxClock-.16)return;pfxImpactAt.set(t,pfxClock);
    const ids={'#ffe14a':'lightning/zap-hit','#fff2a0':'lightning/zap-hit','#fff27a':'lightning/zap-hit','#a8e8ff':'ice/snowflake-burst','#b0e8ff':'ice/ice-shatter','#ff9850':'fire/fire-ring','#ff9a50':'fire/flame-pillar','#a0f0d0':'shadow/soul-drain','#80c8ff':'water/splash','#ff80d8':'shadow/dark-explosion'};
    const id=ids[col]||(power>=350?'impacts/heavy-landing':'impacts/blunt-hit');pfxEmit(id,t.x,t.y+12,id==='impacts/blunt-hit'?65:100,.35);
  }
  function pfxField(){for(const tw of twisters){const fire=tw.fire||boss?.type==='dragon';pfxSprite(fire?'fire/fire-tornado':'nature/tornado',tw.x,sy(tw.y),pfxClock%2/2,Math.min(200,(tw.r||35)*3),0,.7);}}
  // Nozzle and directional effects use the same attack phases as the real shots.
  function pfxJet(x,y,angle,age,remaining,ice=false,kind='fire',speed=210){
    if(age<=0||remaining<=0)return;
    const len=Math.min(115,age*speed),width=len*(ice||kind!=='fire'?184/170:160/126);
    if(len<4)return;
    const id=kind==='void'?'shadow/void-breath':kind==='ghost'?'shadow/ghost-breath':kind==='poison'?'nature/poison-breath':ice?'ice/frost-breath':'fire/fire-breath';
    ctx.save();
    // Only a short jet: the original moving particles continue to show the true reach.
    const c=Math.cos(angle),s=Math.sin(angle),point=(dx,dy)=>[x+dx*c+dy*s,y-dx*s+dy*c];
    ctx.beginPath();ctx.moveTo(...point(-2,-5));ctx.lineTo(...point(len,-8-len*.35));ctx.lineTo(...point(len,8+len*.35));ctx.lineTo(...point(-2,5));ctx.closePath();ctx.clip();
    pfxSprite(id,x,y,(age%1.2)/1.2,width,-angle,Math.min(.8,remaining*8));ctx.restore();
  }
  function pfxEnemyBreath(e,yy,view,back){
    if(!pfxEnabled()||e.dead||e.ai!=='breath'||e.st!=='fire'||(view?.face==='b')!==back)return;
    const base=zakoBase(e.type),side=view?.face==='l'||view?.face==='r',sgn=view?.face==='l'?-1:1;
    // Mouth offsets from the existing pixel art (relative to the feet anchor); no model edits.
    const pin=base==='lizard'?(side?[22,-9]:[0,view?.face==='b'?-19:-4]):base==='chaosbeast'?(side?[30,-23]:[0,-22]):(side?[27,-26]:[0,-23]);
    const x=e.x+pin[0]*SPR.SCALE*sgn,y=yy+e.r*.75+pin[1]*SPR.SCALE;
    // Join the mouth to the existing projectile lane, rather than moving its hitbox.
    const tx=e.x+Math.cos(e.face)*(e.r+80),ty=yy-Math.sin(e.face)*(e.r+80),angle=-Math.atan2(ty-y,tx-x);
    pfxJet(x,y,angle,e.t,.65-e.t,!!e.mod.ice,e.mod.void?'void':e.mod.ghost?'ghost':'fire');
  }
  function pfxBossBreath(B){
    const m=B.mv;if(!pfxEnabled()||B.dead||!m)return;
    const triple=m.name==='breath3',start=triple?.55:.5,end=triple?2.3:2.1;
    if(!['breath','breath3'].includes(m.name)||m.t<start||m.t>=end||!Number.isFinite(m.a0))return;
    const a=m.a0+(m.t-start)/(end-start)*(triple?1:1.8)*(m.dir||1),nm=(B.mouths||[]).length,c0=Math.max(0,Math.round((nm-1)/2)-1);
    for(const[j,off]of(triple?[-.85,0,.85]:[0]).entries()){
      const M=mouthOf(B,triple&&nm>=3?c0+j:0),ang=a+off,dist=M.at?6:B.r;
      pfxJet(M.x+Math.cos(ang)*dist,sy(M.y+Math.sin(ang)*dist),ang,m.t-start,end-m.t,B.fcol==='water',B.fcol==='poison'?'poison':B.fcol==='ghost'?'ghost':'fire',270);
    }
  }
  function pfxEnemyMelee(e,x,y){
    if(!pfxEnabled()||e.dead)return;
    const slash=(e.ai==='swing'||e.ai==='assassin')&&e.st==='slash',thrust=(e.ai==='guard'||e.ai==='lunge')&&e.st==='dash';
    if(!slash&&!thrust)return;
    const len=thrust?Math.max(36,e.r*2.2):e.ai==='assassin'?70:(e.mod.reach||72),span=thrust?.6:e.ai==='assassin'?1.2:1.25;
    const id=thrust?'melee/thrust':e.mod.quake?'melee/hammer-smash':/mantis|werewolf|beast/.test(e.type)?'melee/claw-swipe':'melee/sword-slash';
    const u=clamp(e.t/(thrust?.3:e.ai==='assassin'?.18:.2),0,.99);
    ctx.save();ctx.beginPath();ctx.moveTo(x,y);ctx.arc(x,y,len,-e.face-span,-e.face+span);ctx.closePath();ctx.clip();
    pfxSprite(id,x,y,u*.5,thrust?len*196/66:len*136/42,-e.face,.8,1,true);ctx.restore();
  }
  function pfxBullet(b){
    let id;
    // Continuous breath has one nozzle per head, not one expensive fireball per flame particle.
    if(b.kind==='flame')return;
    if(b.kind==='orb')id=b.slow?'ice/ice-lance':Math.hypot(b.vx,b.vy)>=210?'projectiles/laser-bolt':'arcane/arcane-orb';
    else if(b.kind==='big'||b.kind==='fire')id='fire/fireball';else if(b.kind==='homing'||b.kind==='dream')id='shadow/life-steal';else if(b.kind==='bubble')id='water/whirlpool';else if(b.kind==='crescent')id='melee/sword-slash';else if(b.kind==='rock'||b.kind==='sandball')id='nature/quake';
    if(id&&Math.hypot(b.x-hero.x,b.y-hero.y)<450){
      const orb=id==='arcane/arcane-orb',width=orb?Math.max(30,b.r*136/17):id==='projectiles/laser-bolt'?65:Math.min(60,Math.max(26,b.r*4));
      pfxSprite(id,b.x,sy(b.y)-(b.z||0),((b.t||0)%(orb?2.4:1.2))/(orb?2.4:1.2),width,orb?0:-Math.atan2(b.vy,b.vx),.65);
    }
  }
  const pfxKind=kind=>({fire:'fire/flame-pillar',burn:'fire/fire-ring',ice:'ice/frost-nova',bolt:'lightning/lightning-strike',holy:'holy/holy-pillar',mine:'explosions/big-explosion',poison:'nature/poison-cloud',web:'nature/root-snare',dark:'shadow/dark-explosion',void:'shadow/black-hole',sand:'water/whirlpool',quake:'nature/quake',root:'nature/root-snare',water:'water/geyser',wind:'nature/tornado'})[kind]||'explosions/dirt-explosion';
  function pfxBeam(z,u){
    if(!pfxEnabled()||z.dead||z.t<z.tele||z.t>=z.tele+z.act||!(z.len>0&&z.w>0))return;
    const e=pfxData.effects['arcane/arcane-beam'];if(!e)return;
    // Upstream: hand=(15,-24), beam length=168, half-width=6 in a 264px frame.
    // Map that hand to the collision segment's start; scale length and width separately.
    const unit=e.w/264,pin=[e.ox+15*unit,e.oy-24*unit],width=z.len*264/168;
    const x=z.x,y=sy(z.y),c=Math.cos(z.ang),s=Math.sin(z.ang),half=z.w*1.5;
    ctx.save();ctx.beginPath();
    ctx.moveTo(x-s*half,y-c*half);ctx.lineTo(x+c*z.len-s*half,y-s*z.len-c*half);
    ctx.lineTo(x+c*z.len+s*half,y-s*z.len+c*half);ctx.lineTo(x+s*half,y+c*half);ctx.closePath();ctx.clip();
    pfxSprite('arcane/arcane-beam',x,y,u,width,-z.ang,.65,z.w*1.6*168/(12*z.len),pin);
    ctx.restore();
  }
  function pfxZones(){
    for(const z of zones){
      if(z.type==='patch'){if(['burn','poison','sand','web'].includes(z.kind))pfxSprite(pfxKind(z.kind),z.x,sy(z.y),pfxClock%2/2,Math.min(210,z.r*2),0,.35);continue;}
      if(z.t<z.tele)continue;
      const u=clamp((z.t-z.tele)/Math.max(.15,z.act||.5),0,.99);
      if(z.type==='circle'&&z.fired)pfxSprite(pfxKind(z.kind),z.x,sy(z.y),u,Math.min(390,z.r*2.4),0,.75);
      else if(z.type==='seg'&&z.dmg){const dx=z.x2-z.x,dy=z.y2-z.y;pfxSprite('melee/heavy-cleave',z.x,sy(z.y)+18,u,Math.min(260,Math.hypot(dx,dy)*1.6),-Math.atan2(dy,dx),.75);}
      else if(z.type==='cone'&&z.fired){ctx.save();ctx.beginPath();ctx.moveTo(z.x,sy(z.y));ctx.arc(z.x,sy(z.y),z.len,-z.ang-z.spread,-z.ang+z.spread);ctx.closePath();ctx.clip();pfxSprite(z.kind==='ice'?'ice/frost-breath':z.kind==='fire'?'fire/fire-breath':'nature/leaf-storm',z.x,sy(z.y),u,z.len*1.5,-z.ang,.8);ctx.restore();}
      else if(z.type==='beam'||z.type==='laser')pfxBeam(z,u);
      else if(z.type==='doom'&&z.fired)pfxSprite('shadow/dark-explosion',arena.cx,sy(arena.cy),u,Math.min(600,arena.R*1.6),0,.5);
    }
  }
  function gateFx(kind,x,y,width,hard,alpha=1,progress=null){
    const id=hard?{portal:'gate/portal-hard',rune:'gate/rune-hard',open:'gate/open-hard'}[kind]:{portal:'arcane/portal',rune:'arcane/rune-circle',open:'spawn/spawn-portal'}[kind];
    const e=pfxData?.effects[id];if(!e)return false;
    const u=progress==null?(globalT%e.duration)/e.duration:clamp(progress,0,.999);
    return pfxSprite(id,x,y,u,width,0,alpha,1,false,true);
  }
  function drawGateRune(cx,floor,height,hard){
    gateFx('rune',cx,floor+6,height*1.65,hard,.55);
  }
  function drawGateVortex(cx,floor,height,hard,depart=null){
    // Same portal and palette outside and inside. The static well survives missing images.
    const ry=height/2,cy=floor-height*34/58;
    ctx.fillStyle='#070912';ctx.beginPath();ctx.ellipse(cx,cy,height*17/58,ry,0,0,Math.PI*2);ctx.fill();
    if(!gateFx('portal',cx,floor,height*152/58,hard,.96)){
      ctx.strokeStyle=hard?'#b4589e':'#6278bc';ctx.lineWidth=3;ctx.stroke();
      ctx.fillStyle=hard?'#35152f':'#161e42';ctx.beginPath();ctx.ellipse(cx,cy,height*12/58,ry*.82,0,0,Math.PI*2);ctx.fill();
    }
    if(depart!=null)gateFx('open',cx,floor,height*1.55,hard,Math.sin(Math.PI*clamp(depart,0,1)),depart);
  }
  function gateChamberSize(){return {floor:Math.min(H*.39,H*.44-28),height:Math.min(178,H*.23)};}
  const gateMistCache=new Map();
  function gateMist(hard){
    const key=hard?'hard':'normal';if(gateMistCache.has(key))return gateMistCache.get(key);
    // Two tiny cached images; no full-screen filters, simulation or combat RNG.
    const c=document.createElement('canvas');c.width=128;c.height=96;const g=c.getContext('2d'),col=hard?'158,64,126':'76,96,168';
    for(const[x,y,r,a]of[[22,48,38,.42],[63,34,41,.38],[107,52,37,.32]]){
      const glow=g.createRadialGradient(x,y,0,x,y,r);glow.addColorStop(0,`rgba(${col},${a})`);glow.addColorStop(.52,`rgba(${col},${a*.52})`);glow.addColorStop(1,`rgba(${col},0)`);g.fillStyle=glow;g.fillRect(x-r,y-r,r*2,r*2);
    }
    gateMistCache.set(key,c);return c;
  }
  function drawGateAtmosphere(hard,floor){
    const mist=gateMist(hard),drift=Math.sin(globalT*.11)*W*.045;
    ctx.save();ctx.globalAlpha=.85;ctx.drawImage(mist,-W*.17+drift,58,W*1.12,floor*.83);
    ctx.globalAlpha=.52;ctx.drawImage(mist,W*.11-drift,floor*.35,W*1.03,floor*.75);
    // Sparse embers float through the chamber, behind the door and menu.
    ctx.fillStyle=hard?'#dba1c9':'#a7bbef';const span=Math.max(1,floor-56);
    for(let i=0;i<18;i++){
      const x=((i*97+globalT*(i%2?1.8:-1.2))%(W+24)+W+24)%(W+24)-12,y=floor+22-(i*37+globalT*(3+i%3))%span;
      ctx.globalAlpha=.16+.23*(.5+.5*Math.sin(globalT*.65+i*2.3));const size=i%5===0?3:1.5;
      ctx.fillRect(q(x),q(y),size,size);if(i%6===0){ctx.globalAlpha*=.35;ctx.fillRect(q(x)-3,q(y),size+6,1.5);}
    }
    ctx.restore();
  }
  function drawGateChamber(){
    const hard=transition?.gate&&!transition.done?transition.gate.hard:gateMode==='hard',{floor,height}=gateChamberSize(),cx=W/2,inner=height*.46,top=floor-height-23;
    ctx.fillStyle='#0c0e1b';ctx.fillRect(0,0,W,H);drawGateAtmosphere(hard,floor);
    // Stonework and dais remain still; the atmosphere drifts on its own clock.
    const TP=townTiles();patShift(TP.stone,0,top);ctx.fillStyle=TP.stone;
    ctx.fillRect(cx-inner-23,top,20,floor-top);ctx.fillRect(cx+inner+3,top,20,floor-top);ctx.fillRect(cx-inner-23,top,inner*2+46,24);
    ctx.fillStyle='#a0a0b2';ctx.fillRect(cx-inner-25,top-3,inner*2+50,4.5);
    ctx.fillStyle='#444257';ctx.beginPath();ctx.ellipse(cx,floor+7,height*.77,22,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#716b85';ctx.lineWidth=3;ctx.stroke();
    ctx.fillStyle='#080a14';ctx.fillRect(cx-inner,top+24,inner*2,floor-top-24);ctx.beginPath();ctx.moveTo(cx-inner,floor);ctx.lineTo(cx-inner,top+45);ctx.quadraticCurveTo(cx,top+4,cx+inner,top+45);ctx.lineTo(cx+inner,floor);ctx.closePath();ctx.fill();
    drawGateRune(cx,floor,height,hard);
    ctx.save();ctx.beginPath();ctx.rect(cx-inner,top+24,inner*2,floor-top-18);ctx.clip();
    const depart=transition?.gate&&!transition.done?transition.t/transition.mid:null;
    drawGateVortex(cx,floor-3,height,hard,depart);ctx.restore();
    ctx.fillStyle=hard?'#d775b2':'#8299d3';for(const m of[-1,1])for(let i=0;i<3;i++){const x=cx+m*(inner+12),y=top+52+i*32;ctx.fillRect(q(x-1.5),q(y),3,10.5);ctx.fillRect(q(x-4.5),q(y+3),9,3);}
  }
  // PIXELFX END
  // ---- equipment drops ----
  let runLoot = [], toasts = [];
  function toast(s, col) { toasts.push({ s, col, t: 2.6 }); if (toasts.length > 3) toasts.shift(); }
  function dropPool(kind) {
    if (kind === 'fx') return EQUIP.filter(e => e.drop === 'fx' && Math.abs(e.from - dIdx) <= 1);
    return [EQ['w' + DROP_WT[dIdx] + (kind === 'rare' ? 'rr' : 'lo')], EQ['a' + DROP_AT[dIdx] + (kind === 'rare' ? 'rr' : 'lo')]].filter(Boolean);
  }
  function rollLoot(x, y) {
    const r = Math.random();
    const kind = r < DROP_RATE.rare ? 'rare' : r < DROP_RATE.rare + DROP_RATE.fx ? 'fx' : r < DROP_RATE.rare + DROP_RATE.fx + DROP_RATE.lo ? 'lo' : null;
    if (!kind) return;
    const pool = dropPool(kind); if (pool.length) giveLoot(pick(pool), x, y);
  }
  // equipment goes straight into the bag (so nothing is lost on the way to the boss room); a copy you already own turns into gold
  function giveLoot(e, x, y) {
    bestObtain('gear:'+e.id);
    const R = RARITY[e.drop];
    if (save.owned.includes(e.id)) {
      const g = hardRun?Math.round((e.val||10)*HARD_BONUS):e.val||10; save.gold += g; runGold += g;   // not counted twice by the gold bonus
      toast(`${e.name}（もっている）→ +${g} G`, '#f2c14e');
      A.sfx('coin', 6);
    } else {
      save.owned.push(e.id); runLoot.push(e.id);
      toast(`${R.mark}${e.name} を てにいれた！`, R.col);
      A.sfx(e.drop === 'rare' ? 'levelup' : 'chest');
      burst(x, y, e.drop === 'rare' ? 40 : 20, R.col, 260, 0.8);
      if (e.drop === 'rare') { flash = 0.35; flashCol = '255,230,140'; }
    }
    anims.push({ kind: 'loot', x, y, t: 0, dur: 1.2, frames: 1, slot: e.slot, rar: e.drop });
    persist();
  }

  function dropCoins(x, y, gold) {
    const n = Math.min(8, Math.max(1, Math.round(gold / 4)));
    for (let i = 0; i < n; i++) { const a = rnd(0, 6.283), v = rnd(60, 170); drops.push({ type: 'gold', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, val: Math.round(gold / n) || 1, t: 0 }); }
  }

  // ---------------------------------------------------------------
  //  START / END RUNS
  // ---------------------------------------------------------------
  function enterDungeon(di,hard=false) {
    pfxClear();defRun=null;
    if(arenaRun)arenaRestore();
    if(!hard)hardRun=null;
    closePanel(); deathT = 0;
    bag = fillBag(Array.isArray(save.slots) ? slotsLoadout(getSlots()) : save.loadout || autoLoadout());
    genDungeon(di);if(hard)hardGenerate(hardRun.pair);
    hero = newHero(VW / 2, 70);
    if(hard){hero.x=hardRun.maze.start.x;hero.y=hardRun.maze.start.y;hero.mazeX=hero.x;hero.mazeY=hero.y;hardRun.camX=hero.x;WX=W/2-hero.x;}else WX=(W-VW)/2;
    camY = hero.y; boss = null; arena = null; zones = []; freezeT = 0; darkT = 0; shades = []; twisters = []; combo = 0; runExp = 0; runGold = 0; runKills = 0; runLoot = []; toasts = []; runMaterials={};
    guildRunStart();state = 'play'; paused = false; hint = di === 0 ? 6 : 0; tut = null;
    if (!hard && di === 0 && !save.tut) tutStart();
    banner = { a: D.name, b: D.en, t: 2.4 };
    A.bgm(FARR.dungeon[di]);
    showHud(true);
  }


  // ---------------------------------------------------------------
  //  防衛戦 (指示: 5ステージごとに 村を まもる モード → 巨大な円形の ステージの 中心に 村、360度 から まものが せめてくる)
  //  The field is a big round arena (the boss-room machinery: state 'boss', 2D camera, round walls) with the village in the
  //  middle. Waves come in from a few directions at a time and march on the village. Monsters: HP and speed x0.7.
  //  The boss of the last wave: HP x1.5. Three NPC heroes, a little under the recommended level, fight with you; the whistle
  //  sends them to where you blew it.
  // ---------------------------------------------------------------
  const DEF_STAGES = [4, 9, 14, 19, 24, 29, 34];   // after every 5th dungeon (index of the dungeon it follows)
  const DEF_NAMES = ['ひなたの村', 'かざぐるまの村', 'みなとの村', 'すなかぜの村', 'ほしみの村', 'こもれびの村', 'さいはての村'];
  const DEF_K = 0.7, DEF_BOSS_HP = 1.5, DEF_R = 780, DEF_VR = 112, DEF_WAVES = 5, DEF_VHP = 6, DEF_MARCH = 90, DEF_BOSS_MARCH = 26;   // DEF_VHP: the village has 6x a companion's HP
  const DEF_NPC = [
    { name: 'アレン', col: '#8ac4ff', hp: 1.25, atk: 0.9, def: 1.2, spd: 0.95, wo: 0, ao: 1, say: 'まかせろ！' },
    { name: 'リナ', col: '#ff9ad0', hp: 0.85, atk: 1.2, def: 0.85, spd: 1.12, wo: 1, ao: -1, say: 'いくよ！' },
    { name: 'ガルド', col: '#a8f0a0', hp: 1, atk: 1, def: 1, spd: 1, wo: -1, ao: 0, say: 'おう！' },
  ];
  let defRun = null, defAimT = null;
  const defUnlocked = k => !!save.cleared[DEF_STAGES[k]];
  const defDone = k => !!(save.defense && save.defense[k]);
  const defDist = o => hyp(o.x - arena.cx, o.y - arena.cy);   // from the middle of the village
  const DIR8 = ['ひがし', 'きたひがし', 'きた', 'きたにし', 'にし', 'みなみにし', 'みなみ', 'みなみひがし'];   // +y is up on screen = north
  const dirName = a => DIR8[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
  function defPool(di) {   // every monster met so far; the newer dungeons a little more often
    const P = {};
    for (let j = 0; j <= di; j++) {
      const w = 0.4 + 0.6 * j / Math.max(1, di);
      for (const [t, v] of Object.entries(DUNGEONS[j].pool)) if (EN[t] && !['goldslime', 'pinkdiamondslime'].includes(t)) P[t] = (P[t] || 0) + v * w;
    }
    return P;
  }
  function defNpcs(di) {
    const rec = DUNGEONS[di].rec, L = Math.max(1, rec - Math.max(1, Math.round(rec * 0.12))), g = Math.round(di * 0.6);
    return DEF_NPC.map((p, i) => {
      const w = EQ['w' + clamp(g + p.wo, 0, 22)], a = EQ['a' + clamp(g + p.ao, 0, 21)];
      const s = { maxHp: Math.round((60 + (L - 1) * 10) * 1.6 * p.hp), atk: Math.round((8 + (L - 1) * 2 + w.atk) * p.atk), def: Math.round((2 + (L - 1) + a.def) * p.def) };
      const ga = Math.PI / 2 + (i - 1) * 2.1;
      return { npc: true, i, name: p.name, col: p.col, say: p.say, lv: L, s, hp: s.maxHp, x: Math.cos(ga) * (DEF_VR + 70), y: Math.sin(ga) * (DEF_VR + 70), vx: 0, vy: 0, r: HERO_R, face: ga,
        walk: 0, inv: 0, cd: rnd(0.3, 1), st: 'run', dashT: 0, down: 0, spd: 210 * p.spd, w: visOf(w.id), a: visOf(a.id), slow: 0, ramSafe: 0, pw: null, hitSet: null, post: ga };
    });
  }
  function defEnter(k) {
    pfxClear(); if (arenaRun) arenaRestore(); hardRun = null;
    closePanel(); deathT = 0;
    bag = fillBag(Array.isArray(save.slots) ? slotsLoadout(getSlots()) : save.loadout || autoLoadout());
    const di = DEF_STAGES[k];
    D = DUNGEONS[di]; dIdx = di; nodes = [{ y: -2000, cx: VW / 2, w: VW }, { y: 2000, cx: VW / 2, w: VW }]; goalY = 1e9;
    enemies = []; bullets = []; drops = []; props = []; fx = []; texts = []; rings = []; anims = []; evs = []; ev = { qT: 40 };
    gateNeed = 0; gateKills = 0; gateMsgT = 0; gateCallT = 0;
    state = 'boss'; arena = { cx: 0, cy: 0, R: DEF_R };   // a big round field; the village sits in the middle
    hero = newHero(0, DEF_VR + 130); WX = (W - VW) / 2; bcamX = hero.x; bcamY = hero.y;
    boss = null; zones = []; freezeT = 0; darkT = 0; shades = []; twisters = []; combo = 0; runExp = 0; runGold = 0; runKills = 0; runLoot = []; toasts = []; runMaterials = {};
    guildRunStart(); paused = false; hint = 0; tut = null;
    const total = 60 + k * 10;   // 指示: なかまが つよいので まものを ふやす
    const npcs = defNpcs(di), G = npcs[2].s, vMax = Math.round(G.maxHp * DEF_VHP);   // 指示: 村は うごかない なかまのように HPと まもりを もつ
    defRun = { k, di, vHp: vMax, vMax, vDef: Math.round(G.def * 0.5), total, spawned: 0, q: 0, qT: 0, wave: 0, waveT: 4, dirs: [], npcs, whistle: null, whCD: 0, vHitCD: 0, hitFlash: 0, end: 0,
      pool: defPool(di), vPt: { village: true, x: 0, y: 0, vx: 0, vy: 0, r: 24, slow: 0, ramSafe: 0, pw: null } };
    banner = { a: `防衛戦：${DEF_NAMES[k]}`, b: 'まわりじゅうから まものが くる！', t: 2.6 };
    A.bgm(FARR.dungeon[di]); A.sfx('bossAppear');
    showHud(true);
  }
  function defNextWave() {
    const R = defRun; R.wave++;
    const left = R.total - R.spawned, n = R.wave >= DEF_WAVES ? left : Math.min(left, Math.ceil(R.total / DEF_WAVES));
    // each wave comes from a few directions at once (more of them as the waves go on)
    const nd = Math.min(4, 1 + Math.ceil(R.wave / 2)), a0 = rnd(0, Math.PI * 2);
    R.dirs = Array.from({ length: nd }, (_, i) => a0 + i * Math.PI * 2 / nd + rnd(-0.4, 0.4));
    R.q = n; R.qT = 0; R.waveT = 32; R.qi = 0;
    banner = { a: R.wave >= DEF_WAVES ? 'さいごの 波が くる！' : `だい${R.wave}波 が くる！`, b: [...new Set(R.dirs.map(dirName))].join('・') + ' から', t: 2 };
    A.sfx('summon');
    if (R.wave >= DEF_WAVES && !R.bossDone) { R.bossDone = 1; R.bossT = 2.2; }   // 指示: ボスも せめてくる（さいごの波と いっしょに）
  }
  function defSpawnOne() {
    const R = defRun, a = R.dirs[R.qi++ % R.dirs.length] + rnd(-0.22, 0.22), rr = DEF_R * rnd(0.84, 0.92);
    const type = wpick(R.pool), x = arena.cx + Math.cos(a) * rr, y = arena.cy + Math.sin(a) * rr;
    const e = spawnEnemy(type, x, y, true);
    e.hp = e.maxHp = Math.max(1, Math.round(e.maxHp * DEF_K));   // 指示: たいりょく 0.7ばい
    e.spd = Math.max(20, e.spd) * DEF_K; e.dashSpd *= DEF_K;      // 指示: しんこう そくど 0.7ばい
    e.lane = rnd(-0.3, 0.3); e.march = true; e.defK = 1;
    e.exp = Math.max(1, Math.round(D.xp * 0.8 / R.total)); e.gold = Math.max(1, Math.round(D.gp * 0.6 / R.total));
    R.spawned++;
    anims.push({ kind: 'poof', x: e.x, y: e.y, t: 0, dur: 0.4, frames: 5 }); burst(e.x, e.y, 12, '#c8a0ff', 150, 0.4);
  }
  // who a monster is after: you or a companion close by, otherwise the village
  function defAim(e) {
    const R = defRun; let best = null, bd = e.engaged ? 330 : 230;
    if (!e.defK) { e.defK = 1; e.lane = rnd(-0.3, 0.3); e.hp = e.maxHp = Math.max(1, Math.round(e.maxHp * DEF_K)); e.spd = Math.max(20, e.spd) * DEF_K; e.dashSpd *= DEF_K; }   // the boss's helpers
    if (hero.hp > 0) { const d = hyp(hero.x - e.x, hero.y - e.y); if (d < bd) { bd = d; best = hero; } }
    for (const n of R.npcs) if (n.down <= 0) { const d = hyp(n.x - e.x, n.y - e.y); if (d < bd) { bd = d; best = n; } }
    e.engaged = !!best;
    const dv = defDist(e) || 1;
    e.march = !best && dv > DEF_VR + 160;   // far from the village: walk straight at it
    if (best) return best;
    R.vPt.x = arena.cx + (e.x - arena.cx) / dv * DEF_VR; R.vPt.y = arena.cy + (e.y - arena.cy) / dv * DEF_VR; return R.vPt;
  }
  function defMarch(e) {   // the march: toward the middle, each on a slightly curved line so they don't stack
    const dx = arena.cx - e.x, dy = arena.cy - e.y, d = hyp(dx, dy) || 1;
    return [dx / d - dy / d * e.lane, dy / d + dx / d * e.lane];
  }
  function defVillageHit(atk, x, y, msg) {
    const R = defRun; if (!R || R.end) return;
    const d = Math.max(1, Math.round(atk - R.vDef * 0.5));
    R.vHp = Math.max(0, R.vHp - d); R.hitFlash = 0.6; shake = Math.max(shake, 6); R.hitA = Math.atan2(y - arena.cy, x - arena.cx); R.hitAT = 1.2;
    if (msg && (R.msgT || 0) > globalT) msg = null;   // one big message at a time; the rest just show the damage
    if (msg) R.msgT = globalT + 1.2;
    popText(x, y + rnd(0, 16), '-' + d, '#ff9a5a', 13, 0.7);
    if (msg) popText(x, y + 44, msg, '#ff7a6a', 14, 1.2);
    if (msg || d >= R.vMax * 0.02) A.sfx('hurt');
  }
  // an enemy's attack (redirected from hurtHero) lands on a companion or the village
  function defHurtUnit(u, dmg, fx2, fy2, power) {
    const R = defRun; if (!R) return;
    if (u.village) { defVillageHit(dmg, u.x, u.y); return; }
    if (u.down > 0 || u.inv > 0) return;
    const d = Math.max(1, Math.round(dmg - u.s.def * 0.5));
    u.hp -= d; u.inv = 0.6;
    const dx = u.x - fx2, dy = u.y - fy2, l = hyp(dx, dy) || 1; u.vx += dx / l * power * 0.8; u.vy += dy / l * power * 0.8; if (u.st === 'dash') u.st = 'run';
    popText(u.x, u.y + 20, '-' + d, '#ff9a7a', 14, 0.7);
    if (u.hp <= 0) {
      u.hp = 0; u.down = 12; burst(u.x, u.y, 20, u.col, 200, 0.6); anims.push({ kind: 'poof', x: u.x, y: u.y, t: 0, dur: 0.4, frames: 5 });
      popText(u.x, u.y + 46, `${u.name}は たおれた… 村で てあて中`, u.col, 13, 1.6); A.sfx('down');
    }
  }
  function defBulletHit(b) {
    const R = defRun;
    for (const n of R.npcs) if (n.down <= 0 && n.inv <= 0 && hyp(b.x - n.x, b.y - n.y) < b.r + n.r * 0.6) { defHurtUnit(n, b.dmg, b.x - b.vx * 0.05, b.y - b.vy * 0.05, 200); if (!b.pierce) { b.life = 0; return; } }
    if (defDist(b) < DEF_VR) { b.life = 0; burst(b.x, b.y, 6, '#ffb070', 100, 0.3); defVillageHit(b.dmg, b.x, b.y); }
  }
  function defNpcHit(n, e) {
    if (e === boss) {
      const B = boss, dmg = Math.max(1, Math.round((n.s.atk * rnd(1.0, 1.3) - B.def * 0.5) * (B.dmgTake || 1)));
      B.hp -= dmg; B.hurt = 0.15; burst(n.x + (B.x - n.x) * 0.5, n.y + (B.y - n.y) * 0.5, 10, n.col, 180, 0.35); A.sfx('hit');
      popText(B.x + rnd(-20, 20), B.y + B.r + 10, '' + dmg, n.col, 16, 0.8);
      if (B.hp <= 0) { B.hp = 0; bossDefeated(B); }
      return;
    }
    const dmg = Math.max(1, Math.round(n.s.atk * rnd(1.0, 1.3) - e.def * 0.5));
    burst(e.x, e.y, 10, n.col, 180, 0.35); A.sfx('hit');
    hazardHit(e, dmg, n.x, n.y, 300);
  }
  // keep a body out of the village (the fence) and inside the round field
  function defKeepOut(o, r) {
    const dx = o.x - arena.cx, dy = o.y - arena.cy, d = hyp(dx, dy) || 1, lo = DEF_VR + r, hi = DEF_R - r;
    if (d < lo) { const nx = dx / d, ny = dy / d; o.x = arena.cx + nx * lo; o.y = arena.cy + ny * lo; const vn = o.vx * nx + o.vy * ny; if (vn < 0) { o.vx -= vn * nx; o.vy -= vn * ny; } }
    else if (d > hi) { const nx = dx / d, ny = dy / d; o.x = arena.cx + nx * hi; o.y = arena.cy + ny * hi; }
  }
  function defNpc(n, dt) {
    const R = defRun;
    if (n.down > 0) {
      if ((n.down -= dt) <= 0) {
        const a = Math.atan2(hero.y - arena.cy, hero.x - arena.cx) + (n.i - 1) * 0.5;   // comes out of the village on your side
        n.down = 0; n.hp = Math.round(n.s.maxHp * 0.6); n.x = arena.cx + Math.cos(a) * (DEF_VR + 30); n.y = arena.cy + Math.sin(a) * (DEF_VR + 30); n.vx = Math.cos(a) * 120; n.vy = Math.sin(a) * 120; n.inv = 1.5; n.st = 'run';
        popText(n.x, n.y + 40, `${n.name} ふっかつ！`, n.col, 14, 1.2); burst(n.x, n.y, 16, '#8af07a', 160, 0.5); A.sfx('heal');
      }
      return;
    }
    if (n.inv > 0) n.inv -= dt; if (n.cd > 0) n.cd -= dt;
    const live = enemies.filter(e => !e.dead && !e.sub && !(e.ai === 'phase' && e.alpha < 0.5));
    if (boss && !boss.dead && !(boss.intro > 0) && !(boss.alpha < 0.5) && !boss.sub) live.push(boss);
    const Wh = R.whistle;
    let gx = null, gy = null, foe = null;
    if (Wh) {   // ふえ: run to the spot; fight what is around it
      const ox = Wh.x + Math.cos(n.i * 2.1) * 40, oy = Wh.y + Math.sin(n.i * 2.1) * 40, dW = hyp(ox - n.x, oy - n.y);
      let bd = 1e9; for (const e of live) { const d = hyp(e.x - Wh.x, e.y - Wh.y); if (d < 180 && d < bd) { bd = d; foe = e; } }
      if (dW > 60 && !(foe && hyp(foe.x - n.x, foe.y - n.y) < 110)) { gx = ox; gy = oy; foe = null; }
    } else {   // the monster nearest the village matters most, then the nearest one
      let bs = 1e9; for (const e of live) { const s2 = defDist(e) * 0.8 + hyp(e.x - n.x, e.y - n.y); if (s2 < bs) { bs = s2; foe = e; } }
    }
    let tx = 0, ty = 0, sp = 0;
    if (n.st === 'dash') { if ((n.dashT -= dt) <= 0) n.st = 'run'; }
    else if (gx != null) { tx = gx - n.x; ty = gy - n.y; sp = n.spd * 1.3; }
    else if (foe) {
      const dx = foe.x - n.x, dy = foe.y - n.y, d = hyp(dx, dy) || 1, reach = 140 + (foe === boss ? foe.r : 0);
      if (d < reach && n.cd <= 0) { n.st = 'dash'; n.dashT = 0.34 + (foe === boss ? 0.15 : 0); n.vx = dx / d * 440; n.vy = dy / d * 440; n.hitSet = new Set(); }
      else { tx = dx; ty = dy; sp = d > 100 + (foe === boss ? foe.r : 0) ? n.spd : n.spd * 0.4; }
    } else { const px = arena.cx + Math.cos(n.post) * (DEF_VR + 70), py = arena.cy + Math.sin(n.post) * (DEF_VR + 70); tx = px - n.x; ty = py - n.y; sp = hyp(tx, ty) > 20 ? n.spd * 0.6 : 0; }   // nothing to fight: guard the village
    if (n.st !== 'dash') {
      const l = hyp(tx, ty) || 1, k = 1 - Math.exp(-dt * 6);
      n.vx = lerp(n.vx, sp ? tx / l * sp : 0, k); n.vy = lerp(n.vy, sp ? ty / l * sp : 0, k);
    }
    for (const e of live) {
      const dx = e.x - n.x, dy = e.y - n.y, d = hyp(dx, dy), rr = e.r + n.r; if (d >= rr || d === 0) continue;
      const nx = dx / d, ny = dy / d, big = e === boss;
      n.x -= nx * (rr - d) * (big ? 1 : 0.7); n.y -= ny * (rr - d) * (big ? 1 : 0.7); if (!big && e.mass < 50) { e.x += nx * (rr - d) * 0.3; e.y += ny * (rr - d) * 0.3; }
      if (n.st === 'dash' && !n.hitSet.has(e)) { n.hitSet.add(e); defNpcHit(n, e); n.vx = -nx * 230; n.vy = -ny * 230; n.st = 'run'; n.cd = rnd(0.8, 1.3); }
      else if (n.inv <= 0 && e.atk > 0 && !(e.zap > 0)) defHurtUnit(n, big ? e.atk * 0.7 : e.atk, e.x, e.y, big ? 380 : 220);
      if (n.down > 0) return;
    }
    n.x += n.vx * dt; n.y += n.vy * dt; defKeepOut(n, n.r);
    const s3 = hyp(n.vx, n.vy); n.walk += s3 * dt; if (s3 > 20) n.face = Math.atan2(n.vy, n.vx);
  }
  function defWhistle() {
    const R = defRun; if (!R || R.end || state !== 'boss' || paused || !hero || hero.hp <= 0 || R.whCD > 0) return;
    R.whistle = { x: hero.x, y: hero.y, t: 8 }; R.whCD = 0.8;
    for (let i = 0; i < 3; i++) rings.push({ x: hero.x, y: hero.y, r: 6 + i * 14, max: 150, spd: 260, dmg: 0, w: 3, fx: true });
    popText(hero.x, hero.y + 56, 'ピーッ！ ここに あつまれ！', '#ffe680', 15, 1.1);
    for (const n of R.npcs) if (n.down <= 0) popText(n.x, n.y + 40, n.say, n.col, 12, 0.9);
    A.sfx('whistle');
  }
  // a boss from this stretch of dungeons leads the last wave; it runs the normal boss AI around a "home" that creeps to the village
  function defSpawnBoss(type) {
    const R = defRun, lo = Math.max(0, R.di - 4), j = lo + Math.floor(Math.random() * (R.di - lo + 1)), d = DUNGEONS[j], T = type || d.boss, Bd = BOSSES[T];
    const a = R.dirs.length ? R.dirs[0] : rnd(0, Math.PI * 2), r0 = DEF_R * 0.8, x = arena.cx + Math.cos(a) * r0, y = arena.cy + Math.sin(a) * r0;
    const hp = Math.round(Bd.hp * DEF_BOSS_HP);   // 指示: ボスの たいりょく 1.5ばい
    boss = { type: T, name: Bd.name, x, y, vx: 0, vy: 0, r: Math.round(Bd.r * 1.4), hp, maxHp: hp, atk: Bd.atk, def: Bd.def, col: Bd.col, wcol: Bd.wcol, fcol: Bd.fcol, ocol: Bd.ocol,
      exp: Math.round(d.xp * 0.3), gold: Math.round(d.gp * 0.25), moves: Bd.moves, moves2: Bd.moves2, phase: 1, mv: null, mt: 0, cd: 2.2, last: '', hurt: 0, hitCD: 0, z: 0,
      sweeps: [], intro: 2.6, face: a + Math.PI, dead: 0, rage: Bd.rage, waveT: 1e9, hx: x, hy: y, homeT: 0, alpha: 1, hardHomeX: x, hardHomeY: y - 20, defA: a, defR: r0 };
    if (RIG[T]) rigInit(boss);
    if (T === 'archmage') { boss.r0 = boss.r; boss.r1 = Math.round(boss.r * 0.68); boss.r = boss.r1; boss.sizeK = 0.68; boss.grow = -1; }
    banner = { a: `${Bd.name} が せめてきた！`, b: `${dirName(a)}から ボスが 村を ねらっている`, t: 2.6, boss: true };
    bestEncounter('boss:' + T); A.bgm(FARR.boss[T]); A.sfx('bossAppear');
    flash = 0.5; flashCol = '255,255,255'; shake = 14;
  }
  function defBossTick(dt) {
    const R = defRun, B = boss;
    if (!B.dead && !(B.intro > 0)) B.defR = Math.max(DEF_VR + B.r * 0.4, B.defR - DEF_BOSS_MARCH * DEF_K * dt);   // 指示: しんこう そくど 0.7ばい
    B.hardHomeX = arena.cx + Math.cos(B.defA) * B.defR; B.hardHomeY = arena.cy + Math.sin(B.defA) * B.defR - 20;
    B.waveT = Math.max(B.waveT, 1e8);   // no endless reinforcements: the waves are the reinforcements
    bossUpdate(dt);
    if (!boss || B.dead) return;
    if (defDist(B) < DEF_VR + B.r * 0.6 && (R.bossHitT || 0) < globalT) {   // at the fence: it smashes the village, then is driven back a little
      R.bossHitT = globalT + 2.5; defVillageHit(B.atk * 1.5, B.x, B.y, `${B.name}が 村を こわしている！`); shake = Math.max(shake, 16); A.sfx('quake');
      B.defR = Math.min(DEF_R * 0.8, B.defR + 170);
    }
  }
  function defBossDown(B) {
    B.dead = 0.01; A.sfx('bossKill');
    hitStop = 0.2; slowMo = 1.1; shake = 24; flash = 0.9; flashCol = '255,255,255';
    B.sweeps = []; zones = zones.filter(z => z.boss !== B);
    craftDropBoss(B); gainExp(B.exp); gainGold(B.gold);
    popText(B.x, B.y + B.r + 40, `${B.name}を たおした！`, '#f2c14e', 20, 1.6); popText(B.x, B.y + B.r + 16, `+${B.exp} EXP`, '#9fd0ff', 13, 1.2);
    if (audioOn) FMusic.setRage(false); A.bgm(FARR.dungeon[defRun.di]);
  }
  function defTick(dt) {
    const R = defRun; if (!R || R.end) return;
    if (R.whCD > 0) R.whCD -= dt; if (R.vHitCD > 0) R.vHitCD -= dt; if (R.hitFlash > 0) R.hitFlash -= dt; if (R.hitAT > 0) R.hitAT -= dt;
    if (R.whistle && (R.whistle.t -= dt) <= 0) R.whistle = null;
    if (R.bossT > 0 && (R.bossT -= dt) <= 0) defSpawnBoss(R.forceBoss);
    if (boss) defBossTick(dt);
    if (state !== 'boss') return;
    if (R.q > 0) { if ((R.qT -= dt) <= 0) { R.qT = 0.28; R.q--; defSpawnOne(); } }
    else if (R.spawned < R.total) {
      R.waveT -= dt;
      if (R.waveT <= 0 || (R.wave > 0 && enemies.filter(e => !e.dead).length <= 3 && R.waveT < 28)) defNextWave();
    }
    for (const e of enemies) {   // at the fence: they can't get in, they keep hitting it (the village is like a companion that can't move)
      if (e.dead || e.sub) continue;
      if (defDist(e) < DEF_VR + e.r + 4) {
        defKeepOut(e, e.r * 0.8);
        if ((e.vilCD = (e.vilCD || 0) - dt) <= 0 && e.atk > 0 && !(e.zap > 0)) {
          e.vilCD = 1.1; burst(e.x + (arena.cx - e.x) * 0.25, e.y + (arena.cy - e.y) * 0.25, 6, '#ffb070', 120, 0.3);
          defVillageHit(e.atk, e.x, e.y, (R.msgT || 0) < globalT - 4 ? '村が こうげきされている！' : null);
        }
      }
    }
    if (hero.hp > 0) defKeepOut(hero, hero.r);
    for (const n of R.npcs) defNpc(n, dt);
    if (R.vHp <= 0) { defLose(); return; }
    if (R.spawned >= R.total && R.q <= 0 && !(R.bossT > 0) && !boss && !enemies.some(e => !e.dead)) defWin();
  }
  function defWin() {
    const R = defRun; R.end = 1; R.whistle = null;
    const first = !defDone(R.k); (save.defense = save.defense || {})[R.k] = true;
    const kx = first ? 2 : 1, safe = R.vHp / R.vMax;
    gainExp(Math.round(D.xp * 0.3 * kx)); gainGold(Math.round(D.gp * 0.4 * kx * (0.5 + 0.5 * safe)));
    save.hp = null; persist(); A.jingle('clear'); state = 'over';
    openPanel('村を まもりきった！', `
      <p>${DEF_NAMES[R.k]}は ぶじだ！ 村の人たちが てを ふっている。</p>
      <dl class="stat" style="margin-top:10px">
        <dt>村の のこりHP</dt><dd>${R.vHp} / ${R.vMax}</dd>
        <dt>けいけんち</dt><dd>+${runExp}</dd>
        <dt>ゴールド</dt><dd class="gold">+${runGold} G</dd>
        <dt>たおした数</dt><dd>${runKills}</dd>
        <dt>レベル</dt><dd>Lv ${save.lv}</dd>
      </dl>
      ${lootHtml()}
      ${first ? '<p style="margin-top:10px" class="gold">はじめての ぼうえい せいこう！ ほうしゅうが 2ばい！</p>' : ''}
      <p style="color:var(--muted);font-size:13px;margin-top:6px">ほうしゅうの ゴールドは 村が ぶじなほど ふえる。</p>`,
      [['街へもどる', () => goTown(), true]]);
  }
  function defLose() {
    const R = defRun; R.end = 1; R.whistle = null;
    save.hp = null; persist(); A.jingle('defeat'); state = 'over';
    openPanel('村が おとされた…', `
      <p>まものたちが 村に なだれこんだ。<br>村の人たちは なんとか にげのびた。</p>
      <dl class="stat" style="margin-top:10px">
        <dt>この たたかいで ひろった</dt><dd class="gold">${runGold} G</dd>
        <dt>たおした数</dt><dd>${runKills}</dd>
      </dl>
      ${lootHtml()}
      <p style="color:var(--muted);font-size:14px;margin-top:8px">レベル・けいけんち・ひろった ものは そのまま。<br>ふえで なかまを うごかして もう一度 まもろう。</p>`,
      [['街へもどる', () => goTown(), true]]);
  }
  // ---- drawing ----
  let defIconUrl = null;
  function defIcon() {   // a little village for the dungeon list
    if (defIconUrl) return defIconUrl;
    const c = document.createElement('canvas'); c.width = 28; c.height = 24; const g = c.getContext('2d');
    g.fillStyle = '#4f7a3a'; g.fillRect(0, 18, 28, 6);
    const house = (x, y, w, h, roof) => { g.fillStyle = '#e2d2a8'; g.fillRect(x, y, w, h); g.fillStyle = roof; g.beginPath(); g.moveTo(x - 2, y + 1); g.lineTo(x + w / 2, y - 6); g.lineTo(x + w + 2, y + 1); g.fill(); g.fillStyle = '#ffd27a'; g.fillRect(x + 2, y + 3, 2, 2); g.fillStyle = '#5a3a24'; g.fillRect(x + w - 4, y + h - 4, 2, 4); };
    house(3, 11, 9, 8, '#b4503a'); house(15, 9, 10, 10, '#3a68b4');
    g.fillStyle = '#8a5a30'; for (let x = 0; x < 28; x += 3) g.fillRect(x, 17, 2, 6); g.fillStyle = '#c8945a'; g.fillRect(0, 19, 28, 1);
    return (defIconUrl = c.toDataURL());
  }
  function defGateRow(k) {
    const ok = defUnlocked(k), di = DEF_STAGES[k], d = DUNGEONS[di];
    return `<div class="row ui-stage-row ${ok ? '' : 'lock'}" style="background:rgba(232,160,74,.10);border-radius:6px"><span class="ui-stage-boss" style="display:flex;align-items:center;justify-content:center"><img src="${defIcon()}" width="56" height="48" alt="" style="image-rendering:pixelated"></span>
      <span class="nm">防衛戦：${ok ? DEF_NAMES[k] : '？？？'} ${defDone(k) ? '<span class="tag">★まもりきった</span>' : ''}</span>
      <span class="sub">${ok ? `まわりから くる まものから 村を まもれ・1〜${di + 1}の まものと ボス・なかま 3人・すいしょう Lv ${d.rec}${save.lv < d.rec ? '<span class="hpc">（きけん）</span>' : ''}` : `${di + 1}. を クリアすると 解放`}</span>
      <span class="act"><button class="sbtn" data-def="${k}" ${ok ? '' : 'disabled'}>いく</button></span></div>`;
  }
  function defDrawVillage() {   // the village in the middle: grass, a round palisade with four gates, houses and a well
    const R = defRun, cx = q(arena.cx), cy = q(sy(arena.cy)), VR = DEF_VR, dmg = 1 - R.vHp / R.vMax;
    if (cx < bcamX - W / 2 - VR - 60 || cx > bcamX + W / 2 + VR + 60 || cy < -VR - 80 || cy > H + VR + 60) return;
    ctx.fillStyle = '#41662f'; ctx.beginPath(); ctx.arc(cx, cy, VR + 4, 0, 7); ctx.fill();
    ctx.fillStyle = '#4f7a3a'; for (let y = -VR; y < VR; y += 12) for (let x = -VR + ((y / 12) & 1) * 9; x < VR; x += 18) if (x * x + y * y < (VR - 6) ** 2) ctx.fillRect(cx + x, cy + y, 4.5, 1.5);
    ctx.fillStyle = '#9a8460'; ctx.fillRect(cx - 12, cy - VR, 24, VR * 2); ctx.fillRect(cx - VR, cy - 12, VR * 2, 24);   // the cross roads to the four gates
    // stakes behind the houses (upper half), houses back to front, then the front stakes
    const broken = Math.floor(dmg * 20);
    const stakes = front => { for (let i = 0; i < 64; i++) {
      const a = i / 64 * Math.PI * 2, sx = cx + Math.cos(a) * VR, syy = cy - Math.sin(a) * VR;
      if ((syy > cy) !== front) continue;
      if (Math.abs(Math.cos(a)) > 0.985 || Math.abs(Math.sin(a)) > 0.985) continue;   // the gates
      if (broken && (i * 7) % 20 < broken) { ctx.fillStyle = '#6a4424'; ctx.fillRect(q(sx) - 3, q(syy) - 3, 7.5, 4.5); continue; }
      ctx.fillStyle = '#8a5a30'; ctx.fillRect(q(sx) - 3, q(syy) - 21, 7.5, 24); ctx.fillStyle = '#b07a44'; ctx.fillRect(q(sx) - 3, q(syy) - 21, 3, 24);
      ctx.fillStyle = '#8a5a30'; ctx.fillRect(q(sx) - 1.5, q(syy) - 24, 4.5, 3);
    } };
    stakes(false);
    const houses = [[-58, 44, 40, '#b4503a'], [22, 58, 44, '#3a68b4'], [-74, -18, 38, '#7a4ab0'], [46, 0, 40, '#b47a2a'], [-34, -62, 42, '#4a8a3a'], [34, -56, 38, '#b4503a']];
    houses.sort((a, b) => b[1] - a[1]).forEach(([hx, hy, hw, roof], i) => {
      const x = q(cx + hx - hw / 2), y = q(cy - hy - hw * 0.3), hh = q(hw * 0.6);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + 3, y + hh, hw, 4.5);
      ctx.fillStyle = '#e2d2a8'; ctx.fillRect(x, y, hw, hh); ctx.fillStyle = '#c4b088'; ctx.fillRect(x, y + hh - 4.5, hw, 4.5);
      ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(x - 5, y + 3); ctx.lineTo(x + hw / 2, y - q(hw * 0.4)); ctx.lineTo(x + hw + 5, y + 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.moveTo(x + hw / 2, y - q(hw * 0.4)); ctx.lineTo(x + hw + 5, y + 3); ctx.lineTo(x + hw / 2, y + 3); ctx.closePath(); ctx.fill();
      const lit = 0.7 + 0.3 * Math.sin(globalT * 2 + i);
      ctx.fillStyle = `rgba(255,210,122,${lit})`; ctx.fillRect(x + 4.5, y + 6, 6, 6); ctx.fillRect(x + hw - 10.5, y + 6, 6, 6);
      ctx.fillStyle = '#5a3a24'; ctx.fillRect(x + hw / 2 - 4.5, y + hh - 12, 9, 12);
      if (dmg > 0.2 + i * 0.1) {   // the village burns as it takes damage
        for (let k = 0; k < 2; k++) { const f = Math.floor(globalT * 10 + k * 3 + i) % 3, fx2 = x + 9 + k * (hw - 18); ctx.save(); ctx.translate(fx2, y + 2); ctx.scale(0.4, 0.4); SPR.draw(ctx, SPR.ENV.flame(f, true), 0, 0, 0.95); ctx.restore(); }
        ctx.fillStyle = 'rgba(40,36,40,.35)'; for (let k = 0; k < 3; k++) { const kk = (globalT * 0.4 + k / 3 + i * 0.17) % 1; ctx.beginPath(); ctx.arc(x + hw / 2 + Math.sin(kk * 6 + i) * 8, y - 18 - kk * 46, 5 + kk * 9, 0, 7); ctx.fill(); }
      }
    });
    // the well in the square
    ctx.fillStyle = '#7a7a86'; ctx.beginPath(); ctx.ellipse(cx, cy, 13.5, 7.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#1a2a3a'; ctx.beginPath(); ctx.ellipse(cx, cy, 9, 4.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#6a4424'; ctx.fillRect(cx - 12, cy - 24, 3, 22); ctx.fillRect(cx + 9, cy - 24, 3, 22); ctx.fillStyle = '#b4503a'; ctx.fillRect(cx - 15, cy - 27, 30, 4.5);
    stakes(true);
    if (R.hitFlash > 0) { ctx.fillStyle = `rgba(255,60,40,${R.hitFlash * 0.3})`; ctx.beginPath(); ctx.arc(cx, cy, VR + 8, 0, 7); ctx.fill(); }
  }
  function defDrawNpcs() {
    const R = defRun, Wh = R.whistle;
    if (Wh) {   // the whistle spot: a little flag and a pulsing ring
      const x = q(Wh.x), y = q(sy(Wh.y)), k = (globalT * 1.5) % 1;
      ctx.strokeStyle = `rgba(255,230,128,${0.8 * (1 - k)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y + 8, 20 + k * 30, (20 + k * 30) * 0.42, 0, 0, 7); ctx.stroke();
      ctx.fillStyle = '#8a5a30'; ctx.fillRect(x - 1.5, y - 30, 3, 39);
      ctx.fillStyle = '#ffe680'; ctx.beginPath(); ctx.moveTo(x + 1.5, y - 30); ctx.lineTo(x + 21 + Math.sin(globalT * 8) * 3, y - 24); ctx.lineTo(x + 1.5, y - 18); ctx.fill();
    }
    for (const n of R.npcs) {
      if (n.down > 0) continue;
      const sp = hyp(n.vx, n.vy), c = Math.cos(n.face), s = Math.sin(n.face), x = n.x, y = sy(n.y);
      const dir = Math.abs(c) > Math.abs(s) * 1.1 ? (c > 0 ? 'right' : 'left') : (s > 0 ? 'up' : 'down');
      const moving = sp > 30, ph = n.walk * 0.07, step = moving ? (Math.sin(ph) > 0.3 ? 1 : Math.sin(ph) < -0.3 ? -1 : 0) : 0;
      const spr = SPR.hero({ dir, step, dash: n.st === 'dash' && dir !== 'down', hurt: n.inv > 0.4, blink: false, bob: !moving && (globalT + n.i * 0.37) % 1.1 < 0.55 ? 1 : 0, wave: Math.floor(globalT * 10) % 2, w: n.w, a: n.a });
      shadow(x, y, n.r);
      ctx.strokeStyle = n.col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y + n.r * 0.75, n.r * 0.95, n.r * 0.4, 0, 0, 7); ctx.stroke();
      if (n.st === 'dash') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,170,70,.32)'; ctx.beginPath(); ctx.ellipse(x, y, n.r * 1.6, n.r * 1.8, 0, 0, 7); ctx.fill(); ctx.restore(); }
      if (n.inv > 0) ctx.globalAlpha = 0.6 + 0.3 * Math.cos(n.inv * 18);
      SPR.draw(ctx, spr, x, y + n.r * 0.75);
      ctx.globalAlpha = 1;
    }
  }
  function defDrawTags() {   // names and HP over the companions and the village (sharp text layer)
    const R = defRun, vy = sy(arena.cy) - DEF_VR - 34;
    if (vy > -20 && vy < H) { txt(`${DEF_NAMES[R.k]}`, arena.cx, vy - 6, 11, '#ffd9a0', 'center'); bar(arena.cx - 50, vy, 100, 6, R.vHp / R.vMax, R.vHp < R.vMax * 0.3 ? '#e5483c' : '#e8a04a'); }
    for (const n of defRun.npcs) {
      if (n.down > 0) continue;
      const x = n.x, y = sy(n.y);
      txt(n.name, x, y - 50, 10, n.col, 'center');
      bar(x - 16, y - 46, 32, 4, n.hp / n.s.maxHp, n.hp < n.s.maxHp * 0.3 ? '#e5483c' : '#6fd38a');
    }
  }
  function defDrawHud(top, chargeH) {
    const R = defRun, bw = 150, x0 = W - 8 - bw, y0 = top + 56 + chargeH, k = R.vHp / R.vMax;
    ctx.fillStyle = 'rgba(19,24,58,.86)'; roundRect(x0, y0, bw, 54, 6); ctx.fill();
    ctx.strokeStyle = R.hitFlash > 0 && Math.floor(globalT * 12) % 2 ? '#ff6a5a' : '#e8a04a'; ctx.lineWidth = 2; roundRect(x0, y0, bw, 54, 6); ctx.stroke();
    txt('村', x0 + 8, y0 + 15, 12, '#ffd9a0', 'left', false); txt(`HP ${R.vHp}/${R.vMax}`, x0 + bw - 8, y0 + 15, 12, k < 0.3 ? '#ff7a6a' : '#ffd9a0', 'right', false);
    bar(x0 + 8, y0 + 21, bw - 16, 8, k, k < 0.3 ? '#e5483c' : '#e8a04a');
    const left = R.total - R.spawned + enemies.filter(e => !e.dead).length + (boss && !boss.dead ? 1 : 0);
    const lab = R.q <= 0 && R.spawned < R.total && R.wave > 0 ? `つぎの波 ${Math.max(0, Math.ceil(R.waveT))}s・のこり ${left}` : R.wave === 0 ? `まもなく 襲来…` : `波 ${R.wave}/${DEF_WAVES}・のこり ${left}`;
    txt(lab, x0 + bw / 2, y0 + 46, 11, '#f3ecda', 'center', false);
    // radar: the whole round field, the village in the middle
    const mr = 37, mx = W - 8 - mr, my = y0 + 62 + mr, sc = mr / DEF_R;
    ctx.fillStyle = 'rgba(10,12,30,.78)'; ctx.beginPath(); ctx.arc(mx, my, mr + 2, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(243,236,218,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(mx, my, mr + 2, 0, 7); ctx.stroke();
    const P = (x, y) => [mx + (x - arena.cx) * sc, my - (y - arena.cy) * sc];
    ctx.fillStyle = R.hitFlash > 0 ? '#ff6a5a' : '#e8a04a'; ctx.beginPath(); ctx.arc(mx, my, Math.max(3, DEF_VR * sc), 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.strokeRect(...(([a, b]) => [a - W / 2 * sc, b - H * 0.5 * sc])(P(bcamX, bcamY)), W * sc, H * sc);
    ctx.fillStyle = '#ff5a5a'; for (const e of enemies) if (!e.dead) { const [a, b] = P(e.x, e.y); ctx.fillRect(a - 1, b - 1, 2.5, 2.5); }
    for (const n of R.npcs) if (n.down <= 0) { const [a, b] = P(n.x, n.y); ctx.fillStyle = n.col; ctx.fillRect(a - 1.5, b - 1.5, 3.5, 3.5); }
    if (boss && !boss.dead) { const [a, b] = P(boss.x, boss.y); ctx.fillStyle = Math.floor(globalT * 4) % 2 ? '#ff2a2a' : '#ffd0d0'; ctx.beginPath(); ctx.arc(a, b, 3.5, 0, 7); ctx.fill(); }
    { const [a, b] = P(hero.x, hero.y); ctx.fillStyle = '#ffe14a'; ctx.beginPath(); ctx.arc(a, b, 2.5, 0, 7); ctx.fill(); }
    if (R.whistle) { const [a, b] = P(R.whistle.x, R.whistle.y); ctx.strokeStyle = '#ffe680'; ctx.beginPath(); ctx.arc(a, b, 4, 0, 7); ctx.stroke(); }
    // the village off screen: an arrow at the edge pointing to it (red while it is being hit)
    const vx = arena.cx - bcamX + W / 2, vy = sy(arena.cy);
    if (vx < -DEF_VR * 0.6 || vx > W + DEF_VR * 0.6 || vy < -DEF_VR * 0.6 || vy > H + DEF_VR * 0.6) {
      const m = 40, ax = clamp(vx, m, W - m), ay = clamp(vy, 150, H - 140), an = Math.atan2(vy - ay, vx - ax), hot = R.hitAT > 0;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(an); ctx.fillStyle = hot ? `rgba(255,80,60,${0.7 + 0.3 * Math.sin(globalT * 10)})` : 'rgba(232,160,74,.85)'; ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-8, -11); ctx.lineTo(-8, 11); ctx.fill(); ctx.restore();
      txt(hot ? '村が あぶない！' : '村', ax, ay + 24, hot ? 12 : 11, hot ? '#ff8a7a' : '#ffd9a0', 'center');
    }
    // companions: bottom left, above the skill button
    const by = H - safeBottom() - 118;
    R.npcs.forEach((n, i) => {
      const yy = by - (2 - i) * 17;
      ctx.fillStyle = 'rgba(19,24,58,.78)'; roundRect(8, yy - 12, 112, 15, 4); ctx.fill();
      txt(`${n.name} Lv${n.lv}`, 13, yy, 10, n.down > 0 ? 'rgba(243,236,218,.45)' : n.col, 'left', false);
      if (n.down > 0) txt(`てあて ${Math.ceil(n.down)}`, 116, yy, 9, '#ff9a8a', 'right', false);
      else bar(76, yy - 7, 40, 4, n.hp / n.s.maxHp, n.hp < n.s.maxHp * 0.3 ? '#e5483c' : '#6fd38a');
    });
    if (R.whistle) txt(`ふえ：あつまれ！ ${Math.ceil(R.whistle.t)}`, 10, by - 52, 11, '#ffe680', 'left');
    if (boss && !boss.dead) {
      const B = boss, yb = y0 + 74, bw2 = W - 8 - 2 * mr - 30;
      txt(B.name + (B.pers ? `（${PERS[B.pers][0]}がた）` : ''), 16 + bw2 / 2, yb - 4, 13, '#fff', 'center');
      bar(16, yb, bw2, 9, B.hp / B.maxHp, B.phase === 2 ? '#ff3b6a' : '#e5483c');
      if (B.callout) { ctx.globalAlpha = Math.min(1, B.callout.t * 2); txt(B.callout.s, 16 + bw2 / 2, yb + 26, 14, '#ffd24a', 'center'); ctx.globalAlpha = 1; }
    }
  }
  function tutStart() { tut = { i: 0, t: 0, okT: 0, moved: 0, ramT: 0, slime: null, mark: 0 }; hint = 0; }
  function tutDone(g) { if (tut && !tut.okT && TUT[tut.i] && TUT[tut.i].g === g) { tut.okT = 1; A.sfx('chest'); } }
  function tutEnd(skip) { tut = null; save.tut = 1; persist(); if (!skip) { toast('チュートリアル クリア！ ボスを めざそう', '#f2c14e'); A.sfx('levelup'); } }
  function updateTut(dt) {
    if (!tut || state !== 'play' || !hero) return;
    const h = hero, S = TUT[tut.i]; tut.t += dt;
    if (tut.okT > 0) { if ((tut.okT -= dt) <= 0) { tut.okT = 0; tut.i++; tut.t = 0; if (tut.i >= TUT.length) tutEnd(); } return; }
    if (S.g === 'move') { if (drag.down) tut.moved += heroSpeed() * dt; if (tut.moved > 170) tutDone('move'); }
    else if (S.g === 'ram') { tut.ramT = heroSpeed() > RAM_MIN ? tut.ramT + dt : 0; if (tut.ramT > 0.2) tutDone('ram'); }
    else if (S.g === 'hit') {
      if (tut.slime && tut.slime.dead) tutDone('hit');
      else if (!tut.slime || !enemies.includes(tut.slime)) {   // a slime to practise on, a little ahead
        const y2 = h.y + 150, tn = tunnelAt(y2), e = spawnEnemy('slime', tn.cx + rnd(-30, 30), y2); e.atk = 0; e.cd = 3; tut.slime = e; burst(e.x, e.y, 14, '#9ff0a8', 160, 0.4);
      } else if ((tut.mark -= dt) <= 0) { tut.mark = 0.9; popText(tut.slime.x, tut.slime.y + 40, '▼', '#f2c14e', 18, 0.8); }
    }
    else if (S.g === 'door' && tut.t > 6) tutDone('door');
  }
  function drawTut() {
    const st = TUT[tut.i]; if (!st) return;
    const bw = Math.min(W - 20, 350), bx = W / 2 - bw / 2, bh = 76, ok = tut.okT > 0, T2 = tut.t;
    // the card sits between the door counter (top right) and the hero (just below the middle)
    const by = Math.round(Math.max(H * 0.4, safeTop() + 272));
    ctx.fillStyle = 'rgba(12,10,30,.88)'; roundRect(bx, by, bw, bh, 10); ctx.fill();
    ctx.strokeStyle = ok ? '#6fd38a' : '#f2c14e'; ctx.lineWidth = 2; roundRect(bx, by, bw, bh, 10); ctx.stroke();
    const tx0 = bx + 70 + (bw - 78) / 2;   // text to the right of the little gesture picture
    txt(`チュートリアル ${tut.i + 1}/${TUT.length}　${st.t}`, tx0, by + 19, 12, ok ? '#6fd38a' : '#f2c14e', 'center');
    txt(st.a, tx0, by + 43, 13, '#fff', 'center');
    txt(st.b, tx0, by + 63, 11, '#d8d0e8', 'center');
    if (ok) { ctx.globalAlpha = Math.min(1, tut.okT * 3); txt('できた！', W / 2, by - 12, 22, '#6fd38a', 'center'); ctx.globalAlpha = 1; }
    // the gesture, drawn small at the left of the card
    const gx = bx + 38, gy = by + bh / 2;
    const pad = (dx, dy, hot) => { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(gx, gy, 22, 0, 7); ctx.stroke();
      ctx.fillStyle = hot ? '#ff9a3a' : '#fff'; ctx.beginPath(); ctx.arc(gx + dx, gy + dy, 8, 0, 7); ctx.fill(); };
    if (ok) { ctx.strokeStyle = '#6fd38a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(gx - 12, gy); ctx.lineTo(gx - 3, gy + 10); ctx.lineTo(gx + 14, gy - 10); ctx.stroke(); return; }
    if (st.g === 'move') pad(Math.sin(T2 * 2.4) * 11, Math.cos(T2 * 1.7) * 6, false);
    else if (st.g === 'ram') { const k = (T2 % 1.4) / 1.4, r = Math.min(1, k * 2.2) * 25; pad(r * 0.7, -r * 0.7, r > 19); }
    else if (st.g === 'hit') { const k = (T2 % 1.2) / 1.2; ctx.fillStyle = '#58d36b'; ctx.beginPath(); ctx.ellipse(gx + 14, gy + 4, 9, 7, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#ff9a3a'; ctx.beginPath(); ctx.arc(gx - 16 + Math.min(1, k * 1.8) * 20, gy + 2, 7, 0, 7); ctx.fill(); }
    else if (st.g === 'roll') { const k = (T2 % 1.1) / 1.1; ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx - 22, gy); ctx.lineTo(gx - 22 + k * 48, gy); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(gx - 22 + Math.min(1, k * 1.6) * 42, gy, 7, 0, 7); ctx.fill(); }
    else if (st.g === 'skill') { for (let i = 0; i < 2; i++) { const k = ((T2 + i * 0.25) % 1.2) / 1.2; ctx.strokeStyle = `rgba(255,210,122,${1 - k})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(gx, gy, 6 + k * 20, 0, 7); ctx.stroke(); }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(gx, gy, 6, 0, 7); ctx.fill(); }
    else {   // どうぐ / とびら: an arrow from the card to the button / the counter
      let tx, ty;
      if (st.g === 'item') { const r = $('itemBtn').getBoundingClientRect(), c = cv.getBoundingClientRect(); tx = (r.left + r.width / 2 - c.left) / S; ty = (r.top - c.top) / S - 6; }
      else { tx = W - 56; ty = safeTop() + 260; }
      const bob = Math.sin(T2 * 6) * 5, down = ty > by, fx0 = tx - 26, fy0 = down ? ty - 46 : ty + 46, ex = tx, ey = ty + (down ? bob : -bob);
      ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(fx0, fy0 + (down ? bob : -bob)); ctx.lineTo(ex, ey); ctx.stroke();
      const a = Math.atan2(ty - fy0, tx - fx0);
      ctx.fillStyle = '#f2c14e'; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - Math.cos(a - 0.5) * 13, ey - Math.sin(a - 0.5) * 13); ctx.lineTo(ex - Math.cos(a + 0.5) * 13, ey - Math.sin(a + 0.5) * 13); ctx.fill();
      txt(st.g === 'item' ? 'どうぐ' : 'とびら', gx, gy + 5, 13, '#f2c14e', 'center');
    }
  }
  function enterBossRoom() {
    pfxClear();
    if(hardRun)return hardBossRoom();
    const B = BOSSES[D.boss];
    state = 'boss';
    arena = { cx: VW / 2, cy: 0, R: 360 };   // much wider than the screen (1.2x the old 300); the camera follows the hero
    enemies = []; bullets = []; drops = []; rings = []; props = []; zones = []; freezeT = 0; darkT = 0; shades = []; twisters = [];
    evs = []; ev = { qT: 30 };   // ハテナ箱: first after 30 s, then every 60 s
    hero.x = VW / 2; hero.y = -arena.R + 70; hero.vx = 0; hero.vy = 0;
    bcamX = hero.x; bcamY = hero.y + 120;
    boss = { type: D.boss, name: B.name, x: arena.cx, y: arena.cy + 20, vx: 0, vy: 0, r: Math.round(B.r * 1.4), hp: B.hp, maxHp: B.hp, atk: B.atk, def: B.def, col: B.col, wcol: B.wcol, fcol: B.fcol, ocol: B.ocol,
      exp: Math.round(D.xp * 0.3), gold: Math.round(D.gp * 0.25), moves: B.moves, moves2: B.moves2, phase: 1, mv: null, mt: 0, cd: 2.2, last: '', hurt: 0, hitCD: 0, z: 0,
      sweeps: [], intro: 2.6, face: -Math.PI / 2, dead: 0, rage: B.rage, waveT: 9, hx: arena.cx, hy: arena.cy + 20, homeT: 0, alpha: 1 };
    if (RIG[boss.type]) rigInit(boss);
    if (boss.type === 'archmage') { boss.r0 = boss.r; boss.r1 = Math.round(boss.r * 0.68); boss.r = boss.r1; boss.sizeK = 0.68; boss.grow = -1; }   // small at first; grows when it reaches half HP
    banner = { a: `${B.name} が あらわれた！`, b: 'BOSS BATTLE', t: 2.6, boss: true };
    guildBossStart(boss);bestEncounter('boss:'+D.boss);persist();
    A.bgm(FARR.boss[D.boss]); A.sfx('bossAppear');
    flash = 0.6; flashCol = '255,255,255'; shake = 14;
  }

  function heroDown() {
    if (state === 'over') return;
    slowMo = 1.2; A.sfx('down');
    if (audioOn) FMusic.fadeOut(1.2);
    deathT = 1.3;
  }
  let deathT = 0;
  function showDefeat() {
    if(arenaRun){arenaFinish(false);return;}
    guildSampleBoss();
    {
      state = 'over'; A.jingle('defeat');
      // penalty: half of the gold picked up on THIS run is lost
      const lost = Math.min(save.gold, Math.floor(runGold / 2));
      save.gold -= lost; save.hp = null; persist();
      openPanel('ゆうしゃは ちからつきた…', `
        <p>街に はこばれ、目をさました。</p>
        <dl class="stat" style="margin-top:10px">
          <dt>この ぼうけんで ひろった</dt><dd class="gold">${runGold} G</dd>
          <dt>おとした（はんぶん）</dt><dd class="hpc">-${lost} G</dd>
          <dt>のこりの ゴールド</dt><dd class="gold">${save.gold} G</dd>
        </dl>
        ${lootHtml()}
        <p style="color:var(--muted);font-size:14px;margin-top:8px">レベルと けいけんちは そのまま。<br>そうびを ととのえて もう一度いどもう。</p>`,
        [['街へもどる', () => goTown(), true]]);
    }
  }

  function bossDefeated(B=boss) {
    pfxEmit('shadow/dark-explosion',B.x,B.y,330,1);
    if(hardRun)return hardBossDeath(B);
    if(defRun)return defBossDown(B);
    B.dead = 0.01; A.sfx('bossKill');   // ズバーン！
    hitStop = 0.25; slowMo = 1.5; shake = 26; flash = 1; flashCol = '255,255,255';
    bullets = []; B.sweeps = []; rings = [];
    for (const e of enemies) e.dead = true;
  }
  function showClear() {
    if(arenaRun)return arenaBattleWon();
    if(hardRun)return hardSettle();
    const B = boss;
    {
      guildClear();craftDropBoss(B);gainExp(B.exp); gainGold(B.gold);
      if (Math.random() < DROP_RATE.boss) giveLoot(pick(dropPool('rare')), B.x, B.y);
      const first = !save.cleared[dIdx];
      save.cleared[dIdx] = true; save.hp = null; persist();
      A.jingle('clear');
      state = 'over';
      openPanel('ダンジョン せいは！', `
        <p>${B.name} を たおした！</p>
        <dl class="stat" style="margin-top:10px">
          <dt>けいけんち</dt><dd>+${runExp}</dd>
          <dt>ゴールド</dt><dd class="gold">+${runGold} G</dd>
          <dt>たおした数</dt><dd>${runKills + 1}</dd>
          <dt>レベル</dt><dd>Lv ${save.lv}</dd>
        </dl>
        ${lootHtml()}
        ${first && dIdx === 24 ? `<p style="margin-top:10px" class="gold">まおうを たおし、せかいに へいわが もどった！<br>…しかし、そらに ぶきみな じげんの さけめが ひらいた。<br>あたらしいダンジョン「${DUNGEONS[25].name}」に いけるようになった！</p>`
          : first && dIdx < DUNGEONS.length - 1 ? `<p style="margin-top:10px" class="gold">あたらしいダンジョン「${DUNGEONS[dIdx + 1].name}」に いけるようになった！</p>` : ''}
        ${first && dIdx === 29 ? `<p style="margin-top:10px" class="gold">はかいしんを たおし、じげんの さけめは とじた。<br>せかいに ほんとうの へいわが もどった！ おめでとう！</p><p style="margin-top:6px">…さけめの あとに、いにしえの しれんへ つづく みちが のこった。</p>` : ''}
        ${first && dIdx === DUNGEONS.length - 1 ? `<p style="margin-top:10px" class="gold">そらくじらは ほしの うみへ かえっていった。<br>すべての しれんを のりこえた！ あなたこそ さいきょうの ぶつかり勇者だ！<br>（ダンジョンには なんどでも いどめます）</p>` : ''}`,
        [['街へもどる', () => goTown(), true]]);
    }
  }

  function retreat() {
    guildRetreat();
    save.hp = null; persist();
    goTown();
  }

  // ---------------------------------------------------------------
  //  UPDATE — dungeon / boss
  // ---------------------------------------------------------------
  // slide pad: touch anywhere = pad center (ox,oy); the finger's offset (px,py) steers. Full tilt = charge speed.
  const drag = { down: false, id: null, ox: 0, oy: 0, px: 0, py: 0 };

  // ころがり回避: a quick flick on the pad rolls the hero that way. Can't be hit and passes through monsters while rolling.
  const ROLL_T = 0.3, ROLL_CD = 0.7;
  function charmTick(h, dt) {
    const F = h.s.fx;
    if (h.hgCD > 0) h.hgCD -= dt;
    if (F.regen) {   // 大樹のしずく
      h.calmT = (h.calmT || 0) + dt;
      if (h.calmT > 3 && h.hp > 0 && h.hp < h.s.maxHp) { h.regAcc = (h.regAcc || 0) + h.s.maxHp * F.regen * dt; if (h.regAcc >= 1) { const v = Math.floor(h.regAcc); h.regAcc -= v; h.hp = Math.min(h.s.maxHp, h.hp + v); if (Math.random() < dt * 3) fx.push({ x: h.x + rnd(-10, 10), y: h.y - 4, vx: 0, vy: 40, life: 0.6, max: 0.6, col: '#8af07a', r: 2 }); } }
    }
    if (F.aegis) {   // 聖光の宝玉: a shield of light every 20 s
      if (h.barrierT > 0) h.aegisT = F.aegis;
      else if ((h.aegisT = (h.aegisT == null ? 2 : h.aegisT) - dt) <= 0) { h.barrierT = 9999; h.aegisT = F.aegis; popText(h.x, h.y + 40, 'ひかりの たて', '#e8d8ff', 13, 0.9); A.sfx('magic2'); }
    }
    if (F.roller && h.roll > 0) {   // うみなりのしんじゅ: the roll hits
      h.rollHit = h.rollHit || new Set();
      const T = enemies.filter(e => !e.dead && !e.sub && hyp(e.x - h.x, e.y - h.y) < e.r + h.r); for(const B of livingBosses())if(hyp(B.x-h.x,B.y-h.y)<B.r+h.r)T.push(B);
      for (const t of T) if (!h.rollHit.has(t)) { h.rollHit.add(t); skillHit(t, F.roller, h.x, h.y, 220, '#9ae8ff'); burst(t.x, t.y, 10, '#9ae8ff', 180, 0.4); A.sfx('hit'); }
    } else h.rollHit = null;
  }
  function charmHit(t) {   // いかずちのたま: every 8th hit calls a bolt on the nearest other monster (or the boss)
    const h = hero, F = h.s.fx; if (!F.thunder) return;
    h.hitN = (h.hitN || 0) + 1; if (h.hitN % F.thunder) return;
    const L = enemies.filter(e => !e.dead && e.active && !e.sub && hyp(e.x - h.x, e.y - h.y) < 300).sort((a, b) => hyp(a.x - h.x, a.y - h.y) - hyp(b.x - h.x, b.y - h.y));
    const tg = L.find(e => e !== t) || L[0] || (hardRun?livingBosses().filter(b=>b!==t).sort((a,b)=>hyp(a.x-h.x,a.y-h.y)-hyp(b.x-h.x,b.y-h.y))[0]||livingBosses()[0]:boss && !boss.dead ? boss : null); if (!tg) return;
    anims.push({ kind: 'bolt', x: tg.x, y: tg.y, t: 0, dur: 0.4, frames: 1 }); skillHit(tg, 1.2, tg.x, tg.y + 10, 0, '#fff27a'); if (!isBoss(tg) && !tg.dead) tg.zap = Math.max(tg.zap || 0, 0.4);
    flash = Math.max(flash, 0.15); flashCol = '255,250,200'; A.sfx('boom');
  }
  function thornsHit(t) {   // 竜神のメダル: hurt the one that touched you
    const h = hero; if (!h.s.fx.thorns || !t || t.dead) return;
    skillHit(t, h.s.fx.thorns, h.x, h.y, 200, '#ffb070'); burst(t.x, t.y, 8, '#ffb070', 160, 0.35);
  }
  function startRoll(dx, dy) {
    const h = hero; if (!h || h.hp <= 0 || h.stun > 0 || (h.rollCD || 0) > 0 || paused || (state !== 'play' && state !== 'boss')) return false;
    const flip = h.pw && h.pw.kind === 'mirror' ? -1 : 1;
    if(craftState().coffin>0)return false;
    h.rollA = Math.atan2(-dy * flip, dx * flip); h.roll = ROLL_T; h.rollCD = ROLL_CD * (h.s.fx.roller ? 0.5 : 1); h.recoil = 0; h.inv = Math.max(h.inv, ROLL_T + 0.06);craftOnRoll();guildRoll();
    burst(h.x, h.y - 6, 10, '#d8ccb0', 140, 0.35); A.sfx('roll'); tutDone('roll');
    return true;
  }
  function updateHero(dt) {
    craftTick(dt);if(arenaRun?.settled)return;guildTick(dt);
    const h = hero, maxS = MAXSPD * h.s.ram, pk = h.pw ? h.pw.kind : '', G = craftFloorImmune()?{}:pk === 'slip' ? Object.assign({ ice: 1 }, h.gnd) : (h.gnd || {}), flip = pk === 'mirror' ? -1 : 1;
    if (h.stunImm > 0) h.stunImm -= dt;
    if (h.rollCD > 0) h.rollCD -= dt;
    charmTick(h, dt);
    if (h.roll > 0) {   // rolling: fast at first, easing out
      h.roll -= dt; const k = Math.max(0, h.roll / ROLL_T), v = (230 + 400 * k) * Math.min(1.3, h.s.ram)*guildRollScale();
      h.vx = Math.cos(h.rollA) * v; h.vy = Math.sin(h.rollA) * v;
      if (Math.random() < dt * 30) fx.push({ x: h.x + rnd(-6, 6), y: h.y - 14, vx: rnd(-30, 30), vy: rnd(10, 40), life: 0.35, max: 0.35, col: '#d8ccb0', r: 2.5 });
    } else if (h.stun > 0) {     // asleep / petrified: no control, slides to a stop
      h.stun -= dt; const f = Math.exp(-dt * 6); h.vx *= f; h.vy *= f;
      if (h.recoil > 0) h.recoil -= dt;
    } else if (h.recoil > 0) {   // 反動: just after a ram the hero flies back and the pad is ignored for a moment
      h.recoil -= dt; const f = Math.exp(-dt * 3); h.vx *= f; h.vy *= f;
    } else if (drag.down) {
      const dx = drag.px - drag.ox, dy = drag.py - drag.oy, d = hyp(dx, dy);
      const mag = d < 6 ? 0 : clamp((d - 6) / (PAD_R - 6), 0, 1);
      const top = PAD_MAX * h.s.ram * (h.slow > 0 ? 0.55 : 1) * (G.mud ? 0.6 : 1) * (G.ice ? 1.12 : 1);
      const tvx = (d ? flip * dx / d * mag * top : 0) + (G.px || 0), tvy = (d ? -flip * dy / d * mag * top : 0) + (G.py || 0);
      const k = 1 - Math.exp(-dt * (G.ice ? 2.6 : 25));   // snappy like a joystick (bounces come from the recoil above); ice slides
      h.vx = lerp(h.vx, tvx, k); h.vy = lerp(h.vy, tvy, k);
    } else {
      const f = Math.exp(-dt * (G.ice ? 0.5 : 5)), px = G.px || 0, py = G.py || 0;
      h.vx = (h.vx - px) * f + px; h.vy = (h.vy - py) * f + py;   // a belt / current carries you
    }
    const sp = hyp(h.vx, h.vy);
    if (sp > maxS) { h.vx *= maxS / sp; h.vy *= maxS / sp; }
    h.x += h.vx * dt; h.y += h.vy * dt;
    if (sp > 30) h.face = Math.atan2(h.vy, h.vx);
    h.walk = (h.walk || 0) + sp * dt;   // drives the walk cycle of the sprite
    if (h.inv > 0) h.inv -= dt;
    {   // how hard the hero is turning (decaying sum of heading changes); bounces off targets are ignored
      const sp = hyp(h.vx, h.vy);
      if (sp > 120) { const a = Math.atan2(h.vy, h.vx); if (h.lastA != null) { const d = ((a - h.lastA + Math.PI * 3) % (Math.PI * 2)) - Math.PI; if (Math.abs(d) < 1.2) h.spin = (h.spin || 0) * Math.exp(-dt / 0.8) + d; } h.lastA = a; }
      else { h.spin = (h.spin || 0) * Math.exp(-dt / 0.3); h.lastA = null; }
    }
    if (h.itemCD > 0) { h.itemCD -= dt; if (h.itemCD <= 0) { h.itemCD = 0; updateHudButtons(); } else itemCdShow(h.itemCD); }
    if (h.ramSafe > 0) h.ramSafe -= dt;
    if (h.warpCD > 0) h.warpCD -= dt;
    if (h.slow > 0) h.slow -= dt;
    if (h.buff.atk > 0) h.buff.atk -= dt; if (h.buff.def > 0) h.buff.def -= dt;
    updateSkill(dt);
    if (h.lvFlash > 0) h.lvFlash -= dt;
    if (sp > RAM_MIN) { h.trail.push({ x: h.x, y: h.y, a: 1 }); if (h.trail.length > 8) h.trail.shift(); }
    for (const p of h.trail) p.a -= dt * 4;
    while (h.trail.length && h.trail[0].a <= 0) h.trail.shift();
    confine(h, 0.45);
  }

  // keep a body inside the dungeon walls / round arena; bounce with restitution e
  function confine(o, e) {
    if (state === 'boss') {
      const dx = o.x - arena.cx, dy = o.y - arena.cy, d = hyp(dx, dy), lim = arena.R - o.r;
      if (d > lim) {
        const nx = dx / d, ny = dy / d; o.x = arena.cx + nx * lim; o.y = arena.cy + ny * lim;
        const vn = o.vx * nx + o.vy * ny; if (vn > 0) { o.vx -= (1 + e) * vn * nx; o.vy -= (1 + e) * vn * ny; }
        craftOnWall(o);return true;
      }
      return false;
    }
    let hit = false;
    if(hardRun?.maze)return hardConfine(o,e);
    const tn = tunnelAt(o.y), L = tn.cx - tn.w / 2 + o.r, Rr = tn.cx + tn.w / 2 - o.r;
    if (o.x < L) { o.x = L; if (o.vx < 0) o.vx = -o.vx * e; hit = true; }
    if (o.x > Rr) { o.x = Rr; if (o.vx > 0) o.vx = -o.vx * e; hit = true; }
    if (o.y < o.r + 4) { o.y = o.r + 4; if (o.vy < 0) o.vy = -o.vy * e; hit = true; }
    const top = goalY + 40;
    if (o !== hero && o.y > goalY - 40) { o.y = goalY - 40; if (o.vy > 0) o.vy = -o.vy * e; }
    if (o === hero && o.y > top) o.y = top;
    if(hit)craftOnWall(o);return hit;
  }

  // hero vs a body. returns 'ram' | 'bump' | null
  function collide(o, mass) {
    if (hero.roll > 0) return null;   // rolling through
    const h = hero, dx = o.x - h.x, dy = o.y - h.y, d = hyp(dx, dy), rr = o.r + h.r;
    if (d >= rr || d === 0) return null;
    const nx = dx / d, ny = dy / d;
    const rel = (h.vx - (o.vx || 0)) * nx + (h.vy - (o.vy || 0)) * ny;   // closing speed
    const heroIn = h.vx * nx + h.vy * ny;
    // separate
    const push = rr - d, wH = mass / (mass + 1), wO = 1 / (mass + 1);
    h.x -= nx * push * wH; h.y -= ny * push * wH;
    if (mass < 50) { o.x += nx * push * wO; o.y += ny * push * wO; }
    if (rel > 0) {
      const imp = rel;
      // hero bounces back (反動)
      const e = 0.55, R = heroIn >= RAM_MIN ? 1 + (h.s.fx.recoil || 0) : 1;
      h.vx -= (1 + e) * rel * nx * wH * 1.6 * R; h.vy -= (1 + e) * rel * ny * wH * 1.6 * R;
      const outV = h.vx * -nx + h.vy * -ny;
      if (outV < 160) { h.vx += -nx * (160 - outV); h.vy += -ny * (160 - outV); }
      if (mass < 50 && o.vx != null) { o.vx += nx * imp * 0.9 * R / Math.max(0.5, mass); o.vy += ny * imp * 0.9 * R / Math.max(0.5, mass); }
      // only the hero's OWN speed into the target counts as an attack (a charging enemy can't hurt itself)
      const ram = heroIn >= RAM_MIN;
      if (ram) { h.recoil = 0.2; h.ramSafe = 0.5; }
      return { kind: ram ? 'ram' : 'bump', imp: heroIn, nx, ny };
    }
    return { kind: 'bump', imp: 0, nx, ny };
  }

  // combo: from the 5th hit in a row, every hit adds 2% (up to +50%)
  const comboStep = () => hero && hero.s.fx.double ? 2 : 1;
  const comboBonus = n => clamp((n - 4) * 0.02, 0, 0.5);
  const SPIN_MIN = 3.2;   // radians of turning (decaying) that count as "spinning"
  function ramDamage(target, imp, isBoss, bootBonus=true) {
    const s = hero.s, F = s.fx, k = Math.min(imp / (PAD_MAX * s.ram), 1.5);
    let dmg = s.atk * (0.8 + 1.0 * k) * rnd(0.9, 1.1) - target.def * 0.5;
    let critP = imp > PAD_MAX * s.ram * 0.88 ? 0.35 : 0;   // full-tilt charges can land かいしん
    if (F.slowcrit) critP = Math.max(critP, Math.min(F.slowcrit, F.slowcrit * (1 - k) / 0.6));
    const crit = Math.random() < critP;
    if (crit) dmg *= 1.5;
    if (hero.buff.atk > 0) dmg *= 1.5;
    if (hero.cryT > 0) dmg *= 1.25;
    if (hero.holy && hero.holy.n > 0) dmg *= 1.6;
    let mul = 1 + comboBonus(combo + comboStep()), tag = '';
    if (F.spin && Math.abs(hero.spin || 0) > SPIN_MIN) { mul += F.spin; tag = 'かいてん'; }
    if (F.brave && hero.hp >= s.maxHp * 0.99) mul += F.brave;
    if (F.desperate && hero.hp <= s.maxHp * 0.3) mul += F.desperate;
    if (F.bossbane && isBoss) mul += F.bossbane;
    if (hero.pw && hero.pw.kind === 'giant') mul += 0.5;
    if(F.guild_spacing&&guildWhiffReady(target)){mul+=.4;tag='間合い';}
    dmg *= mul;
    if(craftState().coffin>0)dmg=0;
    const base=Math.max(craftState().coffin>0?0:1,Math.round(dmg));return {dmg:Math.round(base*(bootBonus?(s.ramPower||1):1)),crit,tag};
  }

  function hitEnemy(e, res) {
    if (e.hitCD > 0) return;
    if ((e.ai === 'phase' && e.alpha < 0.5) || e.sub) return;
    if(!arenaAttackAllowed(e,'ram'))return;
    // knight's shield blocks hits from the front
    if (e.ai === 'guard' && e.guard) {
      const fx2 = Math.cos(e.face), fy2 = Math.sin(e.face);
      if (-res.nx * fx2 + -res.ny * fy2 > 0.45) {
        e.hitCD = 0.25; popText(e.x, e.y + 22, 'ガード！', '#9fd0ff', 14, 0.7);
        A.sfx('block'); burst(e.x - res.nx * e.r, e.y - res.ny * e.r, 10, '#9fd0ff', 150);
        return;
      }
    }
    if (e.ai === 'spin' && e.st === 'spin' && !(hero.pw && hero.pw.kind === 'giant')) {
      e.hitCD = 0.3; popText(e.x, e.y + 22, 'はじかれた！', '#ffd27a', 14, 0.7); A.sfx('block'); burst(e.x - res.nx * e.r, e.y - res.ny * e.r, 10, '#ffe08a', 160);
      hero.vx -= res.nx * 260; hero.vy -= res.ny * 260; return;
    }
    if (e.ai === 'mirror' && e.shine && !(hero.pw && hero.pw.kind === 'giant')) {
      e.hitCD = 0.4; popText(e.x, e.y + 24, 'はねかえされた！', '#c8e4ff', 14, 0.8); burst(e.x, e.y, 16, '#ffffff', 220);
      hurtHero(e.atk, e.x, e.y, 460, 'mirror'); return;
    }
    let { dmg, crit, tag } = ramDamage(e, res.imp, false);
    if ((e.ai === 'spin' && e.st === 'dizzy') || e.st === 'stun') { dmg = Math.round(dmg * 1.5); tag = 'めまい'; }
    if (e.mod.stone && !e.awake) { dmg = Math.max(1, Math.round(dmg * 0.5)); tag = 'いしの からだ'; wakeStatue(e); }
    guildRam(e);e.hp -= dmg; e.hurt = 0.18; e.hitCD = 0.12; charmHit(e);
    if (e.st === 'wind' || e.st === 'aim') { e.st = 'idle'; e.cd = 0.6; }   // a hit interrupts the attack
    combo += comboStep(); comboT = 1.6 + (hero.s.fx.chain || 0);
    popText(e.x, e.y + 20, (crit ? 'かいしん！ ' : '') + dmg, crit ? '#f2c14e' : '#fff', crit ? 22 : 17, 0.8);
    if (tag) popText(e.x, e.y + 40, tag + '！', '#9fe8ff', 12, 0.6);
    burst(e.x - res.nx * e.r, e.y - res.ny * e.r, crit ? 22 : 12, crit ? '#f2c14e' : '#fff', crit ? 330 : 220, 0.45);
    anims.push({ kind: 'spark', x: e.x - res.nx * e.r, y: e.y - res.ny * e.r, t: 0, dur: 0.24, frames: 4, big: crit });
    hitStop = Math.max(hitStop, crit ? 0.1 : 0.05); shake = Math.max(shake, crit ? 12 : 6);
    A.sfx(crit ? 'crit' : 'hit');
    if (hero.pw && hero.pw.kind === 'bomb') heroBomb(e.x - res.nx * e.r, e.y - res.ny * e.r, e);
    if (hero.holy && hero.holy.n > 0 && --hero.holy.n <= 0) hero.holy = null;
    if (e.hp <= 0) killEnemy(e);craftOnRam(e,dmg);
  }

  function killEnemy(e) {
    if(!e.dead&&/ghost|wraith|spirit/.test(e.type))pfxEmit('arcane/mana-burst',e.x,e.y,85,.7);else if(!e.dead&&/armor|golem|crystal/.test(e.type))pfxEmit('ice/ice-shatter',e.x,e.y,100,.6);
    if(e.dead)return;arenaEnemyKilled(e,craftOrigin);if(e.type==='pinkdiamondslime'&&!pinkCrystalDrop(e))return;guildKill(e);if(!arenaRun)craftDropEnemy(e);craftOnKill(e);
    e.hp = 0; e.dead = true; runKills++; save.kills++;
    if (state === 'play' && !['goldslime','pinkdiamondslime'].includes(e.type) && gateKills < gateNeed && ++gateKills >= gateNeed) {   // the seal on the boss door breaks
      toast('ボスの とびらの ふういんが とけた！', '#ff8a8a'); A.sfx('chest');
    }
    if (hero && hero.s.fx.blast && !['goldslime','pinkdiamondslime'].includes(e.type)) {   // まじんのめだま: it goes off
      rings.push({ x: e.x, y: e.y, r: 8, max: 90, spd: 420, dmg: 0, w: 8, fx: true }); burst(e.x, e.y, 18, '#ff6a8a', 240, 0.5); A.sfx('boom');
      for (const o of enemies) if (o !== e && !o.dead && !o.sub && hyp(o.x - e.x, o.y - e.y) < 85 + o.r) skillHit(o, hero.s.fx.blast, e.x, e.y, 260, '#ff8aa0');
    }
    if (e.parade && ev.parade) ev.parade.killed++;
    if (e.type === 'goldslime') { popText(e.x, e.y + 56, 'おおもうけ！', '#ffe14a', 20, 1.4); flash = 0.35; flashCol = '255,230,120'; burst(e.x, e.y, 40, '#ffe14a', 320, 0.9); }
    anims.push({ kind: 'poof', x: e.x, y: e.y, t: 0, dur: 0.4, frames: 5 });
    burst(e.x, e.y, 24, e.col, 260, 0.7);
    gainExp(e.exp);
    if(!arenaRun)popText(e.x, e.y + 36, `+${e.exp} EXP`, '#9fd0ff', 12, 0.9);
    if (hero.s.fx.drain && hero.hp > 0) { const hh = Math.min(hero.s.maxHp - hero.hp, Math.round(hero.s.maxHp * hero.s.fx.drain)); if (hh > 0) { hero.hp += hh;arenaEvent('drain',hh); popText(hero.x, hero.y + 30, '+' + hh, '#6fd38a', 12, 0.6); } }
    if(e.type==='pinkdiamondslime'){popText(e.x,e.y+56,'継承結晶 +1','#ffb9e3',18,1.6);burst(e.x,e.y,36,'#ffc9ef',260,.8);A.sfx('chest');}
    else{if(!arenaRun){rollLoot(e.x, e.y);dropCoins(e.x, e.y, e.gold);if (Math.random() < 0.06) drops.push({ type: 'herb', x: e.x, y: e.y, vx: 0, vy: 0, t: 0 });}A.sfx('kill');}
  }

  function updateEnemies(dt) {
    const h0 = hero; let h = h0;
    for (const e of enemies) {
      if(arenaRun?.settled)break;
      if (e.dead) continue;
      if (defRun) { h = defAim(e); defAimT = h; } else { h = h0; defAimT = null; }
      if(e.type==='pinkdiamondslime'){
        if(e.crystalPending){e.crystalRetry=(e.crystalRetry||0)-dt;if(e.crystalRetry<=0){e.crystalRetry=1;killEnemy(e);}continue;}
        if(e.hp<e.maxHp)e.active=true;
      }
      if (!e.active) { if (Math.abs(e.y - h.y) < H * 0.62) e.active = true; else continue; }
      e.t += dt; if (e.hurt > 0) e.hurt -= dt; if (e.hitCD > 0) e.hitCD -= dt;
      const dx = h.x - e.x, dy = h.y - e.y, d = hyp(dx, dy) || 1, ux = dx / d, uy = dy / d;
      if(e.type==='pinkdiamondslime'){
        if(!e.alerted&&(d<=260||e.hp<e.maxHp)){e.alerted=true;e.escapeT=0;popText(e.x,e.y+36,'！','#ffd3eb',18,.7);}
        if(e.alerted){e.escapeT+=dt;if(e.escapeT>=10-1e-8){e.dead=true;e.escaped=true;burst(e.x,e.y,26,'#f7a8d9',200,.7);popText(e.x,e.y+26,'にげられた…','#ffbbe6',14,1.2);A.sfx('warp');continue;}}
      }
      let want = 0, wx = 0, wy = 0;   // desired movement
      e.cd -= dt;
      if (e.zap > 0) { e.zap -= dt; e.st = 'idle'; e.cd = Math.max(e.cd, 0.3); }
      switch (e.zap > 0 ? 'zapped' : e.march ? 'march' : e.ai) {
        case 'zapped': break;   // しびれ: stands still for a moment
        case 'spin':            // clockwork soldier: winds up, spins at you with blades out (rams bounce off), then gets dizzy
          if (e.st === 'wind') { want = 0; if (e.t > 0.8) { e.st = 'spin'; e.t = 0; A.sfx('magic2'); } }
          else if (e.st === 'spin') { want = 1; wx = ux; wy = uy; e.spd2 = 165; if (e.t > 1.6) { e.st = 'dizzy'; e.t = 0; } }
          else if (e.st === 'dizzy') { want = 0; if (e.t > 1.4) { e.st = 'idle'; e.cd = rnd(1.4, 2); } }
          else { want = d > 80 ? 0.8 : 0.2; wx = ux; wy = uy; if (d < 190 && e.cd <= 0) { e.st = 'wind'; e.t = 0; } }
          break;
        case 'mirror': {        // magic mirror: drifts at a distance; while it shines a ram is thrown back at you, and it ends with a ring of light
          const cyc = (e.t + e.phase) % 4.2, sh = cyc > 2.8;
          if (e.shine && !sh) { for (let k = 0; k < 8; k++) shootFx(e, k / 8 * Math.PI * 2 + e.phase, 140, 'orb', 'mirror'); A.sfx('magic'); }
          e.shine = sh; want = 0.6; const s2 = d < 120 ? -1 : d > 200 ? 1 : 0; wx = ux * s2 - uy * 0.6; wy = uy * s2 + ux * 0.6;
          break;
        }
        case 'march': {         // 魔物の大行進: they march down the corridor and leave if you let them
          if (defRun) { want = Math.max(1, DEF_MARCH * DEF_K / e.spd); [wx, wy] = defMarch(e); e.st = 'idle'; break; }
          const tn = tunnelAt(e.y); want = 1; wx = (tn.cx + e.lane * tn.w - e.x) / 60; wy = -1; e.st = 'idle';
          if (e.y < h.y - H * 0.8) { e.dead = true; e.escaped = true; }
          break;
        }
        case 'pinkflee': {
          if(!e.alerted){e.st='idle';break;}
          want=1;wx=-ux;wy=-uy;
          if(state==='play'){const tn=tunnelAt(e.y);wx+=(tn.cx-e.x)/(tn.w*.5)*.8;}
          const pose=e.escapeT%.62<.22?'hop':'idle';if(e.st!==pose){e.st=pose;e.t=0;}
          break;
        }
        case 'flee': {          // golden slime: runs from you, sidesteps, and digs away after a while
          e.fleeT = (e.fleeT || 0) + dt;
          if (e.fleeT > 15) { e.dead = true; burst(e.x, e.y, 22, '#ffe14a', 220); popText(e.x, e.y + 26, 'にげられた…', '#f2c14e', 14, 1.2); A.sfx('warp'); break; }
          want = 1; wx = -ux; wy = -uy;
          if (state === 'play') { const tn = tunnelAt(e.y); wx += (tn.cx - e.x) / (tn.w * 0.5) * 0.8; }
          if (d < 110 && (e.dodgeAt || 0) < globalT) { e.dodgeAt = globalT + 0.9; const s2 = Math.random() < 0.5 ? 1 : -1; e.vx += -uy * s2 * 380; e.vy += ux * s2 * 380; }
          e.st = Math.floor(e.fleeT * 3) % 2 ? 'hop' : 'idle';
          break;
        }
        case 'hop':
          if (e.st === 'hop') { if (e.t > 0.38) { e.st = 'idle'; e.cd = rnd(0.7, 1.3); if (e.mod.burst) { for (let k = 0; k < e.mod.burst; k++) shootFx(e, k / e.mod.burst * Math.PI * 2 + e.phase, 150, 'fire'); } } }
          else if (e.cd <= 0 && d < 240) { e.st = 'hop'; e.t = 0; e.vx = ux * 230 + rnd(-30, 30); e.vy = uy * 230 + rnd(-30, 30); }
          else { want = 0.3; wx = Math.cos(e.phase + e.t * 0.7); wy = Math.sin(e.phase + e.t * 0.9); }
          break;
        case 'flutter': case 'imp': {
          const wob = Math.sin(e.t * 6 + e.phase);
          if (e.st === 'retreat') { want = 1; wx = -ux; wy = -uy; if (e.t > 0.6) { e.st = 'idle'; e.t = 0; } }
          else { want = 1; wx = ux - uy * wob * 0.9; wy = uy + ux * wob * 0.9; }
          if (e.ai === 'imp' && e.cd <= 0 && d < 300) {
            e.cd = rnd(1.6, 2.2); const a0 = Math.atan2(uy, ux);
            if (e.mod.spark) { for (const o of [-0.3, 0, 0.3]) shootFx(e, a0 + o, 160, 'orb', 'spark'); fairyHeal(e); }   // fairy: sparkles + mends the monsters round it
            else for (const o of e.mod.spread ? [-0.22, 0.22] : [0]) shootFx(e, a0 + o, 180, e.mod.ice ? 'orb' : 'fire', e.mod.ice ? 'ice' : null);
          }
          if (e.mod.shot && e.cd <= 0 && d < 260) { e.cd = rnd(2, 2.6); shootFx(e, Math.atan2(uy, ux), 170, 'orb', 'blood'); }
          break;
        }
        case 'lunge':
          if (e.mod.stone && !e.awake) {   // gargoyle: a statue until you come close (or hit it)
            want = 0; e.vx *= 0.8; e.vy *= 0.8;
            if (d < 170) wakeStatue(e);
            break;
          }
          if (e.st === 'wind') { want = 0; if (e.t > e.windT) { e.st = 'dash'; e.t = 0; e.vx = e.lx * e.dashSpd; e.vy = e.ly * e.dashSpd; } }
          else if (e.st === 'dash') {
            if (e.mod.trail) { e.trailAcc = (e.trailAcc || 0) + dt; if (e.trailAcc > 0.05) { e.trailAcc = 0; const fb = shoot(e.x, e.y, 0, 0, 0, Math.round(e.atk * 0.6), 'flame', 1.3); fb.r = 9; } }   // fire spirit: leaves fire behind
            if (e.t > 0.32 && e.mod.feather && !e.fthr) { e.fthr = 1; const a0 = Math.atan2(h.y - e.y, h.x - e.x); for (const o of [-0.25, 0, 0.25]) { const b = shootFx(e, a0 + o, 230, 'feather'); b.r = 6; } }   // harpy: flings feathers as the dive ends
            if (e.t > 0.32) { e.fthr = 0; if ((e.mod.twice || e.mod.stone) && !e.again) { e.again = 1; e.st = 'wind'; e.t = e.windT * 0.45; e.lx = ux; e.ly = uy; } else { e.again = 0; e.st = 'idle'; e.cd = rnd(1, 1.5); } } }
          else { want = d > 90 ? 1 : 0.2; wx = ux; wy = uy; if (d < 135 && e.cd <= 0) { e.st = 'wind'; e.t = 0; e.lx = ux; e.ly = uy; } }
          break;
        case 'shooter':
          if (e.st === 'aim') {
            want = 0; e.face = Math.atan2(dy, dx);
            if (e.t > (e.mod.bolt ? 0.85 : e.mod.cannonball ? 0.7 : 0.55)) {
              e.st = 'idle'; e.cd = rnd(1.8, 2.4); const a0 = Math.atan2(uy, ux);
              if (e.mod.bolt) { const b = shootFx(e, a0, 400, 'arrow'); b.pierce = true; A.sfx('magic'); }   // crossbow: one fast bolt that goes through
              else if (e.mod.cannonball) { const b = shootFx(e, a0, 165, 'cannon'); b.r = 12; b.pierce = true; b.life = 3.2; e.cd = rnd(2.4, 3); A.sfx('boom'); }   // ghost pirate: a slow cannonball
              else for (const o of e.mod.spread ? [-0.2, 0, 0.2] : [0]) shootFx(e, a0 + o, 260, 'arrow');
            }
          }
          else { want = 0.8; const s2 = d < 130 ? -1 : d > 210 ? 1 : 0; wx = ux * s2 + -uy * 0.4 * Math.sin(e.t); wy = uy * s2 + ux * 0.4 * Math.sin(e.t); if (e.cd <= 0 && d < 320) { e.st = 'aim'; e.t = 0; } }
          break;
        case 'swing':
          if (e.st === 'wind') { want = 0; if (e.t > 0.5) { e.st = 'slash'; e.t = 0; if (e.mod.leap) { e.vx += Math.cos(e.face) * 240; e.vy += Math.sin(e.face) * 240; } } }   // mantis hops into each cut
          else if (e.st === 'slash') {
            if (e.t < 0.2) { const ang = Math.atan2(dy, dx), da = Math.abs(((ang - e.face + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (d < (e.mod.reach || 72) + h.r && da < 1.25) hurtHero(e.atk, e.x, e.y, 360, 'slash'); }
            else if ((e.mod.double || e.mod.holy) && !e.again) { e.again = 1; e.st = 'wind'; e.t = 0.28; e.face = Math.atan2(dy, dx); }
            else {
              if (e.mod.quake) { rings.push({ x: e.x + Math.cos(e.face) * 30, y: e.y + Math.sin(e.face) * 30, r: 10, max: 85, spd: 260, dmg: Math.round(e.atk * 0.6), w: 10 }); shake = Math.max(shake, 6); A.sfx('quake'); }   // dwarf: the hammer shakes the floor
              if (e.mod.holy) { const b = shoot(e.x + Math.cos(e.face) * e.r, e.y + Math.sin(e.face) * e.r, Math.cos(e.face), Math.sin(e.face), 220, Math.round(e.atk * 0.7), 'crescent', 1.4); b.pierce = true; b.holy = true; A.sfx('magic'); }   // angel: the second swing throws a blade of light
              e.again = 0; e.st = 'idle'; e.cd = rnd(1, 1.4);
            }
          } else { want = d > 58 ? 1 : 0; wx = ux; wy = uy; e.face = Math.atan2(dy, dx); if (d < 84 && e.cd <= 0) { e.st = 'wind'; e.t = 0; } }
          break;
        case 'phase': {
          const cyc = (e.t + e.phase) % 4; e.alpha = cyc < 2.8 ? Math.min(1, (e.alpha || 0) + dt * 3) : Math.max(0.12, e.alpha - dt * 3);
          want = 0.6; wx = ux + Math.sin(e.t * 2) * 0.5; wy = uy;
          if (e.alpha > 0.8 && e.cd <= 0 && d < 300) { e.cd = rnd(2.2, 2.8); const a0 = Math.atan2(uy, ux); for (const o of e.mod.fan ? [-0.3, 0, 0.3] : [0]) shootFx(e, a0 + o, 120, 'orb', e.mod.fan ? 'curse' : null); }
          break;
        }
        case 'caster':
          if (e.st === 'cast') {
            if (e.t > 0.6) {
              e.st = 'idle'; e.cd = rnd(2.2, 2.8); e.casts = (e.casts || 0) + 1;
              const a0 = Math.atan2(dy, dx);
              if (e.mod.star) { const r0 = rnd(0, 1.26); for (let k = 0; k < 5; k++) shootFx(e, r0 + k * Math.PI * 0.4, 150, 'orb', 'star'); }   // star spirit: starlight in five directions
              else if (e.mod.homing) { for (const o of [-0.9, 0.9]) { const b = shootFx(e, a0 + o, 130, 'homing'); b.life = 3; b.dmg = Math.round(e.atk * 0.8); } e.cd += 0.6; }   // dark priest: two seeking curses
              else for (const o of [-0.3, 0, 0.3]) shootFx(e, a0 + o, 170, e.mod.ice ? 'orb' : 'fire', e.mod.ice ? 'ice' : null);
              if (e.casts % 3 === 0) blink(e);
            }
          } else if (e.cd <= 0 && d < 330) { e.st = 'cast'; e.t = 0; }
          if (d < 70 && e.st !== 'cast' && e.cd > 0.5) { blink(e); e.cd = 1; }
          break;
        case 'breath':
          if (e.st === 'wind') { want = 0; e.face = Math.atan2(dy, dx); if (e.t > 0.42) { e.st = 'fire'; e.t = 0; } }
          else if (e.st === 'fire') {
            if (e.t < 0.65) { e.fireAcc = (e.fireAcc || 0) + dt; while (e.fireAcc > 0.045) { e.fireAcc -= 0.045; const a = e.face + rnd(-0.32, 0.32); const fb = shoot(e.x + Math.cos(e.face) * e.r, e.y + Math.sin(e.face) * e.r, Math.cos(a), Math.sin(a), 210, e.atk, 'flame', 0.55); if (e.mod.ice) { fb.tint = 'water'; fb.slow = 0.8; } if (e.mod.void) fb.tint = 'void'; if (e.mod.ghost) fb.tint = 'ghost'; } }
            else { e.st = 'idle'; e.cd = rnd(1.4, 1.9); if (e.mod.void) for (let k = 0; k < 5; k++) shootFx(e, k / 5 * Math.PI * 2 + e.phase + e.t, 100, 'orb', 'void'); }   // chaos beast: the void it breathed bursts outward
          } else { want = d > 110 ? 1 : 0.2; wx = ux; wy = uy; e.face = Math.atan2(dy, dx); if (d < 170 && e.cd <= 0) { e.st = 'wind'; e.t = 0; } }
          break;
        case 'slam':
          if (e.st === 'wind') { want = 0; if (e.t > 0.7) { e.st = 'idle'; e.cd = rnd(1.8, 2.4); pfxEmit('impacts/ground-slam',e.x,e.y,170,.45); rings.push({ x: e.x, y: e.y, r: e.r, max: 100, spd: 280, dmg: e.atk, w: 12 }); shake = Math.max(shake, 10); A.sfx('quake'); if (e.mod.fire) for (let k = 0; k < 8; k++) shootFx(e, k / 8 * Math.PI * 2, 160, 'fire'); } }
          else { want = 1; wx = ux; wy = uy; if (d < 100 && e.cd <= 0) { e.st = 'wind'; e.t = 0; } }
          break;
        case 'spore':   // swells up, then puffs a ring of slow spores
          if (e.st === 'swell') { want = 0; if (e.t > 0.55) { e.st = 'idle'; e.cd = rnd(2.4, 3.2); if (e.mod.dream) { for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + e.phase; const sb = shoot(e.x, e.y, Math.cos(a), Math.sin(a), 75, Math.round(e.atk * 0.6), 'bubble', 2.8); sb.col = SHOTCOL.dream; sb.stun = 0.6; sb.stunKind = 'sleep'; } }   // baku: dream bubbles put you to sleep
            else for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + e.phase; const sb = shoot(e.x, e.y, Math.cos(a), Math.sin(a), 85, e.atk, 'spore', 2.4); if (e.mod.sleep) sb.slow = 1.6; } } }
          else { want = 0.4; wx = ux + Math.sin(e.t + e.phase); wy = uy; if (e.cd <= 0 && d < 260) { e.st = 'swell'; e.t = 0; } }
          break;
        case 'shamble': // mummy: keeps walking at you, flings bandages that slow you down
          want = 1; wx = ux; wy = uy;
          if (e.cd <= 0 && d < 240 && d > 70) { e.cd = rnd(2.6, 3.4); if (e.mod.curse) { const a0 = Math.atan2(uy, ux); for (const o of [-0.25, 0, 0.25]) shootFx(e, a0 + o, 170, 'orb', 'curse'); } else shoot(e.x, e.y, ux, uy, 200, Math.round(e.atk * 0.6), 'web', 2.5); }
          break;
        case 'web':     // keeps its distance and spits webs that slow you down
          if (e.st === 'aim') { want = 0; e.face = Math.atan2(dy, dx); if (e.t > 0.45) { e.st = 'idle'; e.cd = rnd(2, 2.6); if (e.mod.poison) { const a0 = Math.atan2(uy, ux); for (const o of [-0.2, 0, 0.2]) shootFx(e, a0 + o, 210, 'orb', 'poison'); } else shoot(e.x, e.y, ux, uy, 230, Math.round(e.atk * 0.6), 'web', 3); } }
          else { want = 0.9; const s2 = d < 140 ? -1 : d > 230 ? 1 : 0; wx = ux * s2 - uy * 0.7 * Math.sin(e.t * 1.3 + e.phase); wy = uy * s2 + ux * 0.7 * Math.sin(e.t * 1.3 + e.phase); if (e.cd <= 0 && d < 330) { e.st = 'aim'; e.t = 0; } }
          break;
        case 'guard': {
          // shield faces the hero (turns slowly) -> go around it!
          const ta = Math.atan2(dy, dx); let da = ((ta - e.face + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          if (e.st !== 'dash') e.face += clamp(da, -2.4 * dt, 2.4 * dt);
          if (e.st === 'wind') { want = 0; e.guard = false; if (e.t > 0.45) { e.st = 'dash'; e.t = 0; e.vx = Math.cos(e.face) * 380; e.vy = Math.sin(e.face) * 380; } }
          else if (e.st === 'dash') { e.guard = false; if (e.t > 0.3) { if (e.mod.twice && !e.again) { e.again = 1; e.st = 'wind'; e.t = 0.2; e.face = Math.atan2(dy, dx); } else { e.again = 0; e.st = 'tired'; e.t = 0; } } }
          else if (e.st === 'tired') { e.guard = false; want = 0; if (e.t > 0.9) { e.st = 'idle'; e.guard = true; e.cd = rnd(1.4, 2); } }
          else { e.guard = true; want = d > 100 ? 0.8 : 0.1; wx = ux; wy = uy; if (d < 140 && e.cd <= 0) { e.st = 'wind'; e.t = 0; } }
          break;
        }
        case 'lob':             // goblin bomber: keeps its distance, lifts a lit bomb overhead and lobs it where you are
          if (e.st === 'aim') { want = 0; if (e.t > 0.75) { e.st = 'throw'; e.t = 0; lobBomb(e); } }
          else if (e.st === 'throw') { want = 0; if (e.t > 0.3) { e.st = 'idle'; e.cd = rnd(2.2, 2.8); } }
          else { want = 0.8; const s2 = d < 140 ? -1 : d > 220 ? 1 : 0, w2 = 0.5 * Math.sin(e.t + e.phase); wx = ux * s2 - uy * w2; wy = uy * s2 + ux * w2; if (e.cd <= 0 && d < 300) { e.st = 'aim'; e.t = 0; } }
          break;
        case 'charge':          // minotaur: paws the floor, drops its horns and charges in a straight line; hitting a wall leaves it dazed
          if (e.st === 'wind') { want = 0; if (e.t < 0.55) { e.lx = ux; e.ly = uy; } if (e.t > 0.9) { e.st = 'dash'; e.t = 0; A.sfx('roar'); } }
          else if (e.st === 'dash') { want = 0; e.vx = e.lx * 520; e.vy = e.ly * 520; if (e.t > 0.75) { e.st = 'tired'; e.t = 0; } }
          else if (e.st === 'stun' || e.st === 'tired') { want = 0; if (e.t > (e.st === 'stun' ? 1.7 : 0.7)) { e.st = 'idle'; e.cd = rnd(1.2, 1.8); } }
          else { want = d > 100 ? 0.8 : 0.3; wx = ux; wy = uy; if (d < 260 && d > 60 && e.cd <= 0) { e.st = 'wind'; e.t = 0; e.lx = ux; e.ly = uy; } }
          break;
        case 'roll':            // snowman: rolls a snowball bigger and bigger in front of it, then sends it rolling at you
          if (e.st === 'aim') { want = 0; e.face = Math.atan2(dy, dx); if (e.t > 0.9) { e.st = 'throw'; e.t = 0; const b = shoot(e.x + ux * 22, e.y + uy * 22, ux, uy, 175, e.atk, 'snowball', 2.8); b.r = 9; b.grow = 7; b.rmax = 19; b.slow = 1; A.sfx('crate'); } }
          else if (e.st === 'throw') { want = 0; if (e.t > 0.35) { e.st = 'idle'; e.cd = rnd(2, 2.6); } }
          else { want = 0.7; const s2 = d < 130 ? -1 : d > 220 ? 1 : 0, w2 = 0.4 * Math.sin(e.t * 0.8 + e.phase); wx = ux * s2 - uy * w2; wy = uy * s2 + ux * w2; if (e.cd <= 0 && d < 300) { e.st = 'aim'; e.t = 0; } }
          break;
        case 'assassin':        // shadow assassin: vanishes in smoke, appears behind you and slashes. A golden blade is a critical hit (x2)
          if (e.st === 'vanish') { want = 0; e.sub = true; e.alpha = Math.max(0, 1 - e.t / 0.3); if (e.t > 0.4) { appearBehind(e); e.sub = false; e.alpha = 1; e.st = 'wind'; e.t = 0; e.critNext = Math.random() < e.mod.crit; e.face = Math.atan2(h.y - e.y, h.x - e.x); A.sfx(e.critNext ? 'crit' : 'block'); } }
          else if (e.st === 'wind') { want = 0; e.face = Math.atan2(dy, dx); if (e.t > 0.55) { e.st = 'slash'; e.t = 0; e.hitDone = 0; e.vx += Math.cos(e.face) * 220; e.vy += Math.sin(e.face) * 220; } }
          else if (e.st === 'slash') {
            if (e.t < 0.18) { const da = Math.abs(((Math.atan2(dy, dx) - e.face + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (!e.hitDone && d < 70 + h.r && da < 1.2) { e.hitDone = 1; hurtHero(Math.round(e.atk * (e.critNext ? 2 : 1)), e.x, e.y, e.critNext ? 480 : 340, e.critNext ? 'crit' : 'slash', e.critNext); } }
            else { e.st = 'recover'; e.t = 0; }
          }
          else if (e.st === 'recover') { want = 0; if (e.t > 0.8) { e.st = 'idle'; e.cd = rnd(1.8, 2.6); e.critNext = false; } }
          else { e.alpha = 1; e.sub = false; e.critNext = false; want = 0.8; const s2 = d < 140 ? -1 : d > 210 ? 1 : 0, w2 = 0.7 * Math.sin(e.t * 1.4 + e.phase); wx = ux * s2 - uy * w2; wy = uy * s2 + ux * w2; if (e.cd <= 0 && d < 300) { e.st = 'vanish'; e.t = 0; burst(e.x, e.y, 16, '#8a8aa0', 140, 0.5); A.sfx('warp'); } }
          break;
        case 'thunder':         // storm eagle: circles you, throws its wings up and calls three bolts down around you
          if (e.st === 'cast') { want = 0.2; wx = -uy; wy = ux; if (e.t > 0.7) { e.st = 'idle'; e.cd = rnd(3, 3.6); for (let i = 0; i < 3; i++) { const tx = h.x + (i ? rnd(-75, 75) : h.vx * 0.2), ty = h.y + (i ? rnd(-75, 75) : h.vy * 0.2); addCircle(tx, ty, 34, 0.75 + i * 0.25, e.atk, 'bolt', () => A.sfx('boom')); } } }
          else { want = 1; const s2 = d < 140 ? -1 : d > 200 ? 1 : 0, dir = e.phase > 3 ? 1 : -1; wx = ux * s2 - uy * 0.9 * dir; wy = uy * s2 + ux * 0.9 * dir; if (e.cd <= 0 && d < 320) { e.st = 'cast'; e.t = 0; A.sfx('magic2'); } }
          break;
        case 'dullahan':        // dullahan: lifts its own head high and hurls it; the head flies at you and comes back
          if (e.st === 'wind') { want = 0; if (e.t > 0.65) { e.st = 'throw'; e.t = 0; e.headOut = true; const b = shoot(e.x, e.y, ux, uy, 290, e.atk, 'dhead', 4); b.r = 11; b.pierce = true; b.ret = 0.62; b.owner = e; A.sfx('magic'); } }
          else if (e.st === 'throw') { want = 0.4; wx = ux; wy = uy; if (!e.headOut || e.t > 3.5) { e.headOut = false; e.st = 'idle'; e.cd = rnd(1.8, 2.4); } }
          else { want = d > 90 ? 0.9 : 0.2; wx = ux; wy = uy; if (e.cd <= 0 && d < 280 && d > 70) { e.st = 'wind'; e.t = 0; } }
          break;
        case 'shark':           // blade shark: circles you under the floor with only its fin out, then bursts out jaws first
          if (e.st === 'idle') { e.st = 'swim'; e.t = 0; e.swimT = rnd(1.8, 2.6); }
          e.sub = e.st === 'swim' || e.st === 'wind';
          if (e.st === 'swim') { want = 1; const s2 = d < 100 ? -0.6 : d > 140 ? 0.8 : 0, dir = e.phase > 3 ? 1 : -1; wx = ux * s2 - uy * dir; wy = uy * s2 + ux * dir; if (e.t > e.swimT && d < 260) { e.st = 'wind'; e.t = 0; } }
          else if (e.st === 'wind') { want = 0; if (e.t > 0.5) { e.st = 'leap'; e.t = 0; e.sub = false; e.vx = ux * 470; e.vy = uy * 470; burst(e.x, e.y, 16, '#a8d8ff', 200, 0.5); A.sfx('warp'); } }
          else if (e.st === 'leap') { want = 0; if (e.t > 0.4) { e.st = 'flop'; e.t = 0; burst(e.x, e.y, 10, '#a8d8ff', 140, 0.4); } }
          else if (e.st === 'flop') { want = 0; if (e.t > 1.1) { e.st = 'swim'; e.t = 0; e.swimT = rnd(1.8, 2.6); burst(e.x, e.y, 14, '#a8d8ff', 160, 0.5); } }
          break;
        case 'gaze':            // basilisk: rears up and spreads its frill; whatever stands in its stare turns to stone. Hit it to stop the stare
          if (e.st === 'wind') { want = 0; if (e.t > 0.95) { e.st = 'gaze'; e.t = 0; } }
          else if (e.st === 'gaze') { want = 0; if (e.t > 0.45) { e.st = 'idle'; e.cd = rnd(2.6, 3.2); } }
          else { want = d > 120 ? 0.8 : 0.3; wx = ux; wy = uy; e.face = Math.atan2(dy, dx); if (d < 210 && e.cd <= 0) { e.st = 'wind'; e.t = 0; zones.push({ type: 'cone', boss: e, src: e, ang: e.face, spread: 0.4, len: 190, tele: 0.95, act: 0.3, track: 1.1, dmg: Math.round(e.atk * 0.8), stun: 0.8, t: 0 }); A.sfx('magic2'); } }
          break;
        case 'juggle':          // nightmare clown: always juggling; it speeds up, then throws three balls that bounce after you
          if (e.st === 'aim') { want = 0; if (e.t > 0.65) { e.st = 'throw'; e.t = 0; const a0 = Math.atan2(uy, ux), dd = clamp(d, 90, 200); for (let i = 0; i < 3; i++) { const o = (i - 1) * 0.45; jball(e, e.x, e.y, e.x + Math.cos(a0 + o) * dd, e.y + Math.sin(a0 + o) * dd, i * 0.14, 1, i); } A.sfx('magic'); } }
          else if (e.st === 'throw') { want = 0; if (e.t > 0.4) { e.st = 'idle'; e.cd = rnd(2.4, 3); } }
          else { want = 0.7; const s2 = d < 140 ? -1 : d > 220 ? 1 : 0, w2 = 0.6 * Math.sin(e.t * 1.1 + e.phase); wx = ux * s2 - uy * w2; wy = uy * s2 + ux * w2; if (e.cd <= 0 && d < 300) { e.st = 'aim'; e.t = 0; } }
          break;
      }
      if(hardRun?.maze&&state==='play'&&want>0)[wx,wy]=hardSteer(e,wx,wy);
      if (want > 0 && e.spd > 0) {
        const l = hyp(wx, wy) || 1, ts = (e.st === 'spin' ? 165 : e.spd) * want*(e.craftSlow>0?.55:1);
        e.vx = lerp(e.vx, wx / l * ts, 1 - Math.exp(-dt * 4)); e.vy = lerp(e.vy, wy / l * ts, 1 - Math.exp(-dt * 4));
      } else { const f = Math.exp(-dt * (e.st === 'dash' || e.st === 'hop' || e.st === 'leap' ? 0.8 : 5)); e.vx *= f; e.vy *= f; }
      // knockback speed limit
      const sp = hyp(e.vx, e.vy); if (sp > 520) { e.vx *= 520 / sp; e.vy *= 520 / sp; }
      e.x += e.vx * dt; e.y += e.vy * dt;
      const wallTouched=confine(e,0.6);if(wallTouched)guildWall(e);
      if (wallTouched && e.ai === 'charge' && e.st === 'dash' && e.t > 0.08) {   // minotaur into a wall: dazed
        e.st = 'stun'; e.t = 0; e.vx *= 0.2; e.vy *= 0.2; shake = Math.max(shake, 10); A.sfx('quake'); burst(e.x, e.y, 18, '#c8b090', 220, 0.5); popText(e.x, e.y + 34, 'ドシーン！', '#ffd27a', 14, 0.8);
      }
      if (!['guard', 'swing', 'breath', 'shooter', 'web', 'roll', 'assassin', 'gaze'].includes(e.ai)) { if (sp > 20) e.face = Math.atan2(e.vy, e.vx); }
      // hero contact
      h = h0; defAimT = null;
      if ((e.ai === 'phase' && e.alpha < 0.5) || e.sub) continue;
      const res = collide(e, e.mass);
      if (res && h.pw && h.pw.kind === 'giant') { res.kind = 'ram'; res.imp = Math.max(res.imp, PAD_MAX * h.s.ram); }   // きょだいか: everything you touch gets rammed
      if (res) {
        if (res.kind === 'ram') hitEnemy(e, res);
        else if (e.hitCD <= 0 && h.ramSafe <= 0 && !(e.zap > 0) && !['flee','pinkflee'].includes(e.ai)) { if (e.mod.chill) h.slow = Math.max(h.slow, e.mod.chill); const big = (e.ai === 'charge' && e.st === 'dash') || (e.ai === 'shark' && e.st === 'leap'); const hp0 = h.hp; hurtHero(Math.round(e.atk * (big ? 1.3 : 1)), e.x, e.y, big ? 520 : 260, 'touch:' + e.type); if (h.hp < hp0) thornsHit(e); if (e.ai === 'flutter' || e.ai === 'imp') { e.st = 'retreat'; e.t = 0; } }
      }
    }
    defAimT = null;
    // enemies push each other apart
    for (let i = 0; i < enemies.length; i++) {
      const a = enemies[i]; if (a.dead || !a.active) continue;
      for (let j = i + 1; j < enemies.length; j++) {
        const b = enemies[j]; if (b.dead || !b.active) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = hyp(dx, dy), rr = a.r + b.r;
        if (d > 0 && d < rr) { const p = (rr - d) / 2, nx = dx / d, ny = dy / d; a.x -= nx * p; a.y -= ny * p; b.x += nx * p; b.y += ny * p; }
      }
    }
    enemies = enemies.filter(e => !e.dead);
  }

  function wakeStatue(e) {
    e.awake = 1; e.cd = 0.35; e.st = 'idle'; burst(e.x, e.y, 16, '#b8b8c0', 180, 0.5);
    popText(e.x, e.y + 28, 'うごきだした！', '#e0dcd0', 13, 0.8); A.sfx('block');
  }
  function fairyHeal(e) {
    for (const o of enemies) {
      if (o === e || o.dead || o.hp >= o.maxHp || hyp(o.x - e.x, o.y - e.y) > 170) continue;
      const hh = Math.round(o.maxHp * 0.12); o.hp = Math.min(o.maxHp, o.hp + hh);
      popText(o.x, o.y + 26, '+' + hh, '#8af07a', 12, 0.7); burst(o.x, o.y, 8, '#ffb0f0', 110, 0.4);
    }
  }
  function lob(x, y, tx, ty, spd, kind, extra) {   // a thrown thing on an arc; lands at (tx, ty)
    const d0 = hyp(tx - x, ty - y) || 1, b = Object.assign({ x, y, vx: 0, vy: 0, r: 8, dmg: 0, kind, life: 9, t: 0, dest: { x: tx, y: ty }, spd, d0, harmless: true }, extra);
    bullets.push(b); return d0 / spd;
  }
  function lobBomb(e) {   // goblin bomber: the landing spot is marked the moment it throws; the bomb fizzes there, then goes off
    const tx = hero.x + hero.vx * 0.25, ty = hero.y + hero.vy * 0.25;
    const ft = lob(e.x, e.y + 14, tx, ty, 260, 'gbomb', { onLand: b => bullets.push({ x: b.x, y: b.y, vx: 0, vy: 0, r: 8, dmg: 0, kind: 'gbomb', lit: 1, life: 0.42, t: 0, harmless: true }) });
    addCircle(tx, ty, 46, ft + 0.42, Math.round(e.atk * 1.2), 'blast', () => A.sfx('boom'));
  }
  function jball(e, x, y, tx, ty, delay, hops, ci) {   // clown ball: lands, then bounces once more toward where you are
    const ft = lob(x, y, tx, ty, 240, 'jball', { ci, delay, onLand: b => {
      if (hops <= 0 || e.dead) return;
      const a = Math.atan2(hero.y - b.y, hero.x - b.x), dd = clamp(hyp(hero.x - b.x, hero.y - b.y), 40, 130);
      jball(e, b.x, b.y, b.x + Math.cos(a) * dd, b.y + Math.sin(a) * dd, 0, hops - 1, ci);
    } });
    addCircle(tx, ty, 28, delay + ft, Math.round(e.atk * 0.8), 'confetti');
  }
  function appearBehind(e) {   // assassin: steps out of the smoke on the far side of you
    const h = hero, sp = hyp(h.vx, h.vy);
    let ax = sp > 60 ? -h.vx / sp : (h.x - e.x), ay = sp > 60 ? -h.vy / sp : (h.y - e.y); const l = hyp(ax, ay) || 1; ax /= l; ay /= l;
    burst(e.x, e.y, 14, '#8a8aa0', 140, 0.5);
    e.x = h.x + ax * 64; e.y = h.y + ay * 64; e.vx = e.vy = 0; confine(e, 0);
    burst(e.x, e.y, 16, '#c8c8d8', 160, 0.5);
  }
  function blink(e) {
    for (let k = 0; k < 10; k++) {
      let x, y;
      if (state === 'boss') { const a = rnd(0, 6.28), r = rnd(0.3, 0.8) * arena.R; x = arena.cx + Math.cos(a) * r; y = arena.cy + Math.sin(a) * r; }
      else { y = e.y + rnd(-120, 120); const tn = tunnelAt(y); x = tn.cx + rnd(-0.35, 0.35) * tn.w; }
      if (hyp(x - hero.x, y - hero.y) > 120) { pfxEmit('arcane/blink-out',e.x,e.y,100,.45);pfxEmit('arcane/blink-in',x,y,100,.45);burst(e.x, e.y, 12, '#b48cff', 120); e.x = x; e.y = y; e.vx = e.vy = 0; burst(x, y, 12, '#b48cff', 120); return; }
    }
  }

  function shoot(x, y, ux, uy, spd, dmg, kind, life = 4) {
    const b = { x, y, vx: ux * spd, vy: uy * spd, r: ({ orb: 8, flame: 7, big: 14, rock: 9, spore: 8, web: 9, homing: 9, bubble: 10, crescent: 14 })[kind] || 6, dmg, kind, life, t: 0 };
    bullets.push(b); return b;
  }
  // tinted shots for the variants: frost (slows), venom, curse, blood
  const SHOTCOL = { ice: '150,225,255', poison: '150,230,60', curse: '190,120,255', blood: '230,50,70', spark: '255,150,230', dream: '220,170,255', void: '210,70,255', star: '255,230,120', mirror: '200,230,255' };
  function shootFx(e, a, spd, kind, fx) { const b = shoot(e.x, e.y, Math.cos(a), Math.sin(a), spd, e.atk, kind); if (fx) { b.col = SHOTCOL[fx]; if (fx === 'ice') b.slow = 1.2; } return b; }

  function updateBullets(dt) {
    if (freezeT > 0) freezeT -= dt;
    for (const b of bullets) {
      if (freezeT > 0 && !b.noFreeze) continue;   // time stop: shots hang in the air
      b.t += dt; b.life -= dt;
      if (b.delay && b.t < b.delay) continue;   // lined up, waiting for the telegraph to finish
      if (b.wait != null) {   // parked until b.wait, then flies at the hero
        if (b.t < b.wait) continue;
        const a = Math.atan2(hero.y - b.y, hero.x - b.x); b.vx = Math.cos(a) * b.aim; b.vy = Math.sin(a) * b.aim; b.wait = null;
      }
      if (b.dest) {           // lobbed: fly to a spot, then go off there
        const dx = b.dest.x - b.x, dy = b.dest.y - b.y, d = hyp(dx, dy), st = b.spd * dt;
        if (d <= st) { b.life = 0; if (b.onLand) b.onLand(b); continue; }
        b.x += dx / d * st; b.y += dy / d * st; b.z = Math.sin(clamp(1 - d / b.d0, 0, 1) * Math.PI) * 40;
        continue;
      }
      if (b.orbit) {          // circles a fixed point on a widening radius
        const o = b.orbit; o.a += o.w * dt; o.r += o.dr * dt;
        b.x = o.cx + Math.cos(o.a) * o.r; b.y = o.cy + Math.sin(o.a) * o.r;
        if (hyp(b.x - hero.x, b.y - hero.y) < b.r + hero.r * 0.6 && hero.inv <= 0) hurtHero(b.dmg, b.x, b.y, 260, 'shot:' + b.kind);
        if (o.r > arena.R) b.life = 0;
        continue;
      }
      if (b.ret != null && b.t > b.ret && (b.owner || boss)) {   // boomerang: home back to the boss (or the monster that threw it)
        const o = b.owner || boss; if (b.owner && b.owner.dead) { b.life = 0; continue; }
        const dx = o.x - b.x, dy = o.y - b.y, d = hyp(dx, dy) || 1, sp0 = hyp(b.vx, b.vy);
        b.vx = lerp(b.vx, dx / d * Math.max(sp0, 380), 1 - Math.exp(-dt * 6)); b.vy = lerp(b.vy, dy / d * Math.max(sp0, 380), 1 - Math.exp(-dt * 6));
        if (d < o.r) { b.life = 0; if (b.owner) b.owner.headOut = false; continue; }
      }
      if (b.grow) b.r = Math.min(b.rmax, b.r + b.grow * dt);   // a snowball picks up snow as it rolls
      if (b.kind === 'big' && b.t > (b.fuse || 1.1)) { b.life = 0; explodeBig(b); continue; }
      if (b.kind === 'homing' && b.t < 3.2) {   // turn toward the hero at a limited rate
        const cur = Math.atan2(b.vy, b.vx), want = Math.atan2(hero.y - b.y, hero.x - b.x);
        let da = ((want - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI; da = clamp(da, -2.1 * dt, 2.1 * dt);
        const sp2 = hyp(b.vx, b.vy); b.vx = Math.cos(cur + da) * sp2; b.vy = Math.sin(cur + da) * sp2;
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.kind === 'flame') { b.vx *= 0.985; b.vy *= 0.985; }
      if (state === 'boss') {
        const ax = b.x - arena.cx, ay = b.y - arena.cy, ad = hyp(ax, ay);
        if (b.bounce > 0 && ad > arena.R - b.r) {   // bounce off the round wall
          const nx = ax / ad, ny = ay / ad, vn = b.vx * nx + b.vy * ny;
          if (vn > 0) { b.vx -= 2 * vn * nx; b.vy -= 2 * vn * ny; b.bounce--; shake = Math.max(shake, 6); A.sfx('quake'); }
          b.x = arena.cx + nx * (arena.R - b.r); b.y = arena.cy + ny * (arena.R - b.r);
        } else if (ad > arena.R + 30 && b.ret == null) { if (b.kind === 'big') explodeBig(b); b.life = 0; }
      }
      else if (b.ret == null) { const tn = tunnelAt(b.y); if (hardRun?.maze?!hardContains(b.x,b.y,Math.min(b.r||0,8)):Math.abs(b.x - tn.cx) > tn.w / 2 + 4) { b.life = 0; burst(b.x, b.y, 4, '#ccc', 60, 0.3); } }
      if (!b.harmless && hyp(b.x - hero.x, b.y - hero.y) < b.r + hero.r * 0.6 && hero.inv <= 0) {
        if (b.slow) hero.slow = Math.max(hero.slow, b.slow);
        if (b.stun) { b.hitHero = true; stunHero(b.stun, b.stunKind || 'sleep'); }
        if (b.kind === 'web') { hero.slow = 1.8; popText(hero.x, hero.y + 30, 'クモの糸！', '#dfe8ff', 13, 0.9); }
        hurtHero(b.dmg, b.x - b.vx * 0.05, b.y - b.vy * 0.05, b.pierce ? 420 : 220, 'shot:' + b.kind); if (!b.pierce) b.life = 0;
      }
      if (defRun && !b.harmless && b.life > 0) defBulletHit(b);
    }
    const dying = bullets.filter(b => b.life <= 0 && b.onDie);
    bullets = bullets.filter(b => b.life > 0);
    for (const b of dying) { const f = b.onDie; b.onDie = null; f(b); }
    for (const r of rings) {
      r.r += r.spd * dt;
      const d = hyp(hero.x - r.x, hero.y - r.y);
      if (!r.fx && !r.hit && Math.abs(d - r.r) < r.w + hero.r * 0.5) { r.hit = true; hurtHero(r.dmg, r.x, r.y, 380, 'ring'); }
    }
    rings = rings.filter(r => r.r < r.max);
  }
  function explodeBig(b) {
    pfxEmit('explosions/big-explosion',b.x,b.y,240,.75);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; shoot(b.x, b.y, Math.cos(a), Math.sin(a), 150, b.dmg, 'fire', 2.5); }
    burst(b.x, b.y, 24, '#ff8a3a', 240); shake = Math.max(shake, 8); A.sfx('boom');
  }

  // damage a monster with a trap / barrel / boulder (no combo, but the kill still pays out)
  function hazardHit(e, dmg, fx, fy, power) {
    if (e.dead || e.hp <= 0 || e.sub) return;
    dmg = Math.max(1, Math.round(dmg)); e.hp -= dmg; e.hurt = 0.18;
    const dx = e.x - fx, dy = e.y - fy, d = hyp(dx, dy) || 1; e.vx += dx / d * power; e.vy += dy / d * power;
    popText(e.x, e.y + 20, '' + dmg, '#ffb070', 15, 0.7);
    if (e.hp <= 0) killEnemy(e);
  }
  function explodeBarrel(p) {
    p.gone = true; const R = 85;
    for (const e of enemies) if (!e.dead && hyp(e.x - p.x, e.y - p.y) < R + e.r) hazardHit(e, hero.s.atk * 2.5 - e.def * 0.5, p.x, p.y, 420);
    if (hero.hp > 0 && hyp(hero.x - p.x, hero.y - p.y) < R + hero.r * 0.5) hurtHero(trapDmg('barrel'), p.x, p.y, 520, 'barrel');
    for (const o of props) if (o.type === 'barrel' && !o.gone && hyp(o.x - p.x, o.y - p.y) < R + 10) o.fuse = o.fuse > 0 ? Math.min(o.fuse, 0.15) : 0.15;
    burst(p.x, p.y, 46, '#ff9a3a', 380, 0.7); burst(p.x, p.y, 20, '#ffe080', 240, 0.5);
    anims.push({ kind: 'poof', x: p.x, y: p.y, t: 0, dur: 0.4, frames: 5 });
    rings.push({ x: p.x, y: p.y, r: 10, max: R, spd: 420, dmg: 0, w: 6, fx: true });
    shake = Math.max(shake, 14); flash = 0.25; flashCol = '255,180,90'; A.sfx('boom');
  }
  // trap damage scales with the dungeon like monster attacks do (a mid-sized monster's punch), then armour applies as usual
  const TRAP = { spike: 13, vent: 15, boulder: 15, mace: 14, swing: 16, barrel: 13 };
  const trapDmg = kind => Math.round(TRAP[kind] * D.a * Math.min(1, 0.6 + dIdx * 0.1));   // gentler in the first few dungeons
  const inRect = (o, p) => Math.abs(o.x - p.x) < p.w / 2 && Math.abs(o.y - p.y) < p.h / 2;
  const inEll = (o, p) => ((o.x - p.x) / p.rx) ** 2 + ((o.y - p.y) / p.ry) ** 2 < 1;

  function updateProps(dt) {
    const h = hero, gnd = {}, spawned = [];
    for (const p of props) {
      if (Math.abs(p.y - h.y) > H && p.type !== 'boulder') continue;
      if(craftFloorImmune()&&['mud','poison','ice','belt','stream','crumble','vent','spike','warp'].includes(p.type))continue;
      // ---------- field gimmicks ----------
      if (p.type === 'mud' || p.type === 'poison') {
        if (inEll(h, p)) { gnd.mud = 1; if (p.type === 'poison' && h.hp > 1 && !(craftState().cleanse>0)) { h.hp = Math.max(1, h.hp - h.s.maxHp * 0.035 * dt); h.poisonT = 0.25; } }
        continue;
      }
      if (p.type === 'ice') { if (inEll(h, p)) gnd.ice = 1; continue; }
      if (p.type === 'belt' || p.type === 'stream') { if (inRect(h, p)) gnd.py = p.dir * p.spd; continue; }
      if (p.type === 'crumble') {
        const on = inRect(h, p);
        if (p.st === 0) { if (on) { p.t += dt; if (p.t > 0.6) { p.st = 1; p.t = 0; A.sfx('crate'); burst(p.x, p.y, 16, '#8a7a6a', 160); } } else p.t = Math.max(0, p.t - dt * 0.5); }
        else {
          p.t += dt; if (p.t > 6) { p.st = 0; p.t = 0; }
          else if (on && h.hp > 0 && h.inv <= 0) {   // fell through: hurt a little and climb back out before the hole
            const d2 = Math.max(1, Math.round(h.s.maxHp * 0.08)); h.hp -= d2; h.inv = 1.0;
            popText(h.x, h.y + 26, 'おちた！ -' + d2, '#ff5a4a', 16, 1); A.sfx('hurt'); combo = 0;
            h.y = p.y - p.h / 2 - 50; h.x = tunnelAt(h.y).cx; h.vx = 0; h.vy = 0; h.recoil = 0.2;
            if (h.hp <= 0 && !tryRevive()) { h.hp = 0; heroDown(); }
          }
        }
        continue;
      }
      if (p.type === 'vent') {
        const c = (t + p.ph) % 3.4, st = c < 2.0 ? 0 : c < 2.8 ? 1 : 2;
        if (st === 2 && p.st !== 2) { A.sfx('boom'); shake = Math.max(shake, 5); }
        if (st !== 2) p.hit.clear();
        p.st = st;
        if (st === 2) {
          if (h.hp > 0 && hyp(h.x - p.x, h.y - p.y) < p.r + h.r * 0.4) hurtHero(trapDmg('vent'), p.x, p.y, 320, 'vent');
          for (const e of enemies) if (!e.dead && !p.hit.has(e) && hyp(e.x - p.x, e.y - p.y) < p.r + e.r * 0.5) { p.hit.add(e); hazardHit(e, e.maxHp * 0.3, p.x, p.y, 200); }
        }
        continue;
      }
      if (p.type === 'warp') {
        const d2 = hyp(h.x - p.x, h.y - p.y);
        if (h.warpLock === p && d2 > p.r + h.r) h.warpLock = null;
        if (p.to && h.hp > 0 && h.warpLock !== p && d2 < p.r * 0.8 + h.r * 0.3) {
          burst(p.x, p.y, 20, '#c88aff', 200); h.x = p.to.x; h.y = p.to.y; h.warpLock = p.to;
          burst(h.x, h.y, 24, '#c88aff', 220); A.sfx('warp'); flash = 0.2; flashCol = '200,140,255';
          camY = Math.max(h.y + 40, H * 0.38 - 30);
        }
        continue;
      }
      if (p.type === 'bumper') {
        if (p.lit > 0) p.lit -= dt;
        const dx = h.x - p.x, dy = h.y - p.y, d = hyp(dx, dy), rr = p.r + h.r;
        if (d < rr && d > 0) {
          const nx = dx / d, ny = dy / d, sp = Math.max(480, hyp(h.vx, h.vy) * 1.05);
          h.x = p.x + nx * rr; h.y = p.y + ny * rr; h.vx = nx * sp; h.vy = ny * sp; h.recoil = 0.24; p.lit = 0.2;
          anims.push({ kind: 'spark', x: p.x + nx * p.r, y: p.y + ny * p.r, t: 0, dur: 0.2, frames: 4, big: false }); A.sfx('block');
        }
        for (const e of enemies) { const ex = e.x - p.x, ey = e.y - p.y, ed = hyp(ex, ey), er = p.r + e.r; if (ed < er && ed > 0 && !e.fly) { e.x = p.x + ex / ed * er; e.y = p.y + ey / ed * er; e.vx += ex / ed * 220; e.vy += ey / ed * 220; } }
        continue;
      }
      if (p.type === 'barrel') {
        const res = h.hp > 0 ? collide(p, 1.3) : null;
        if (res && res.kind === 'ram' && !(p.fuse > 0)) { p.fuse = 1.1; popText(p.x, p.y + 24, '！', '#ffd24a', 18, 0.6); A.sfx('magic2'); }
        p.x += p.vx * dt; p.y += p.vy * dt; const f = Math.exp(-dt * 2.2); p.vx *= f; p.vy *= f;
        const wall = confine(p, 0.5);
        if (p.fuse > 0) {
          p.fuse -= dt;
          let boom = p.fuse <= 0 || (wall && hyp(p.vx, p.vy) > 120);
          for (const e of enemies) if (!e.dead && hyp(e.x - p.x, e.y - p.y) < e.r + p.r) boom = true;
          if (boom) explodeBarrel(p);
        }
        continue;
      }
      if (p.type === 'roller') {   // a crack up the slope that sends boulders rolling down at you
        const ahead = p.y - h.y;
        if (ahead > 60 && ahead < 720) {
          p.t -= dt; p.warn = p.t < 0.8;
          if (p.t <= 0) { p.t = rnd(3.2, 4.4); p.warn = false; const tn = tunnelAt(p.y); spawned.push({ type: 'boulder', x: tn.cx + p.lane * tn.w, y: p.y, r: 22, vy: -185, lane: p.lane, roll: 0, from: p.y, hit: new Set() }); A.sfx('quake'); }
        } else p.warn = false;
        continue;
      }
      if (p.type === 'boulder') {
        p.y += p.vy * dt; p.roll += dt * 7; const tn = tunnelAt(p.y); p.x = lerp(p.x, tn.cx + p.lane * tn.w, 1 - Math.exp(-dt * 3));
        if (p.y < p.from - 1100 || p.y < 60) { p.gone = true; continue; }
        for (const o of props) if (o.type === 'rock' && hyp(o.x - p.x, o.y - p.y) < o.r + p.r) { p.gone = true; burst(p.x, p.y, 18, '#8a8478', 200); }
        if (p.gone) continue;
        const dx = h.x - p.x, dy = h.y - p.y, d = hyp(dx, dy) || 1;
        if (h.hp > 0 && d < p.r + h.r) {
          const into = -(h.vx * dx + h.vy * dy) / d;
          if (into > PAD_MAX * h.s.ram * 0.75) {   // a full-tilt charge smashes it
            p.gone = true; burst(p.x, p.y, 30, '#a89a88', 280); A.sfx('crate'); popText(p.x, p.y + 30, 'こなごな！', '#fff', 15, 0.9);
            dropCoins(p.x, p.y, Math.max(1, Math.round(D.gp * 0.012))); h.vx = dx / d * 300; h.vy = dy / d * 300; h.recoil = 0.15; continue;
          }
          h.x = p.x + dx / d * (p.r + h.r); h.y = p.y + dy / d * (p.r + h.r);
          hurtHero(trapDmg('boulder'), p.x, p.y, 420, 'boulder');
        }
        for (const e of enemies) if (!e.dead && !e.fly && !p.hit.has(e) && hyp(e.x - p.x, e.y - p.y) < p.r + e.r) { p.hit.add(e); hazardHit(e, e.maxHp * 0.25, p.x, p.y, 260); }
        continue;
      }
      if (p.type === 'mace') {
        p.ang += p.w * dt;
        const bx = p.x + Math.cos(p.ang) * p.len, by = p.y + Math.sin(p.ang) * p.len;
        if (h.hp > 0 && hyp(h.x - bx, h.y - by) < 12 + h.r * 0.8) hurtHero(trapDmg('mace'), bx, by, 450, 'mace');
        for (const e of enemies) if (!e.dead && (p.hit.get(e) || 0) < t && hyp(e.x - bx, e.y - by) < 12 + e.r) { p.hit.set(e, t + 1); hazardHit(e, e.maxHp * 0.2, bx, by, 300); }
        continue;
      }
      if (p.type === 'swing') {
        p.a = (p.sd > 0 ? Math.PI : 0) + Math.sin(t * 1.5 + p.ph) * 1.05;
        const ca = Math.cos(p.a), sa = Math.sin(p.a), x1 = p.x + ca * p.len * 0.45, y1 = p.y + sa * p.len * 0.45, x2 = p.x + ca * p.len, y2 = p.y + sa * p.len;
        if (h.hp > 0 && segDist(h.x, h.y, x1, y1, x2, y2) < 9 + h.r * 0.7) hurtHero(trapDmg('swing'), x2, y2, 450, 'swing');
        for (const e of enemies) if (!e.dead && (p.hit.get(e) || 0) < t && segDist(e.x, e.y, x1, y1, x2, y2) < 9 + e.r) { p.hit.set(e, t + 1); hazardHit(e, e.maxHp * 0.2, x2, y2, 300); }
        continue;
      }
      if (p.type === 'rock') {
        const dx = h.x - p.x, dy = h.y - p.y, d = hyp(dx, dy), rr = p.r + h.r;
        if (d < rr && d > 0) { const nx = dx / d, ny = dy / d; h.x = p.x + nx * rr; h.y = p.y + ny * rr; const vn = h.vx * nx + h.vy * ny; if (vn < 0) { h.vx -= 1.6 * vn * nx; h.vy -= 1.6 * vn * ny; } }
        for (const e of enemies) { const ex = e.x - p.x, ey = e.y - p.y, ed = hyp(ex, ey), er = p.r + e.r; if (ed < er && ed > 0 && !e.fly) { e.x = p.x + ex / ed * er; e.y = p.y + ey / ed * er; } }
      } else if (p.type === 'crate' || p.type === 'chest') {
        if (p.gone || (p.type === 'chest' && p.open)) continue;
        const res = collide(p, 999);
        if (res && res.kind === 'ram') {
          if (p.type === 'crate') { p.gone = true; burst(p.x, p.y, 18, '#c08a4a', 220); A.sfx('crate'); dropCoins(p.x, p.y, Math.round(D.gp * 0.12 / Math.max(1, D.crates) * rnd(0.7, 1.3))); }
          else {
            p.open = true; guildInc('chests');A.sfx('chest'); burst(p.x, p.y, 26, '#f2c14e', 260);
            const roll = Math.random();
            if (roll < 0.4) { const th = tierHeal(); drops.push({ type: th, x: p.x, y: p.y + 10, vx: 0, vy: 60, t: 0 }); popText(p.x, p.y + 30, ITEMS[th].name + '！', '#6fd38a', 15, 1.2); }
            else if (roll < 0.7) { drops.push({ type: 'herb', x: p.x - 8, y: p.y + 10, vx: -40, vy: 60, t: 0 }); drops.push({ type: 'herb', x: p.x + 8, y: p.y + 10, vx: 40, vy: 60, t: 0 }); popText(p.x, p.y + 30, 'やくそう×2！', '#6fd38a', 15, 1.2); }
            else { dropCoins(p.x, p.y, Math.round(D.gp * 0.08)); popText(p.x, p.y + 30, 'ゴールド！', '#f2c14e', 15, 1.2); }
          }
        } else if (res && res.kind === 'bump' && p.type === 'chest' && !p.toldT) { p.toldT = 1; popText(p.x, p.y + 28, 'いきおいよく ぶつかれ！', '#fff', 12, 1); }
      } else if (p.type === 'spring') {
        if (!p.used && hyp(h.x - p.x, h.y - p.y) < p.r + h.r + 30) {
          p.used = true; const heal = h.s.maxHp - h.hp; h.hp = h.s.maxHp;
          popText(p.x, p.y + 40, 'いやしの泉', '#9fe8ff', 18, 1.6); popText(p.x, p.y + 18, heal > 0 ? `HPが ぜんかいふく！ +${Math.round(heal)}` : 'HPは まんたん', '#6fd38a', 13, 1.6);
          burst(p.x, p.y, 30, '#9fe8ff', 220, 1); A.sfx('spring'); flash = 0.3; flashCol = '160,230,255';
        }
      } else if (p.type === 'spike') {
        const c = ((globalT + p.ph) % 2.2); p.state = c < 1.3 ? 0 : c < 1.65 ? 1 : 2;
        if (p.state === 2 && Math.abs(h.x - p.x) < p.w / 2 + h.r * 0.3 && Math.abs(h.y - p.y) < p.h / 2 + h.r * 0.3) hurtHero(trapDmg('spike'), h.x, h.y - 30, 200, 'spike');
      }
    }
    h.gnd = gnd;
    if (h.poisonT > 0) h.poisonT -= dt;
    if (spawned.length) props.push(...spawned);
    props = props.filter(p => !p.gone);
    // pickups fly to the hero
    for (const d of drops) {
      d.t += dt;
      const dx = hero.x - d.x, dy = hero.y - d.y, dist = hyp(dx, dy) || 1;
      if (d.t > 0.35 && dist < 140) { const k = 900 * dt; d.vx += dx / dist * k; d.vy += dy / dist * k; }
      const f = Math.exp(-dt * 3); d.vx *= f; d.vy *= f;
      d.x += d.vx * dt; d.y += d.vy * dt;
      if (dist < hero.r + 8 && d.t > 0.25) {
        d.got = true;
        if (d.type === 'gold') { gainGold(d.val * (hero.pw && hero.pw.kind === 'rush' ? 2 : 1)); A.sfx('coin', Math.min(14, combo)); }
        else { gainItem(d.type); popText(hero.x, hero.y + 30, ITEMS[d.type].name + ' をてにいれた', '#6fd38a', 12, 1); A.sfx('item'); }
      }
    }
    drops = drops.filter(d => !d.got);
  }

  // ---------------------------------------------------------------
  //  RIGGED BOSSES (stages 31-35): each is several pixel-art parts moved by springs every frame,
  //  so wind-ups, hits and recoils are smooth and weighty without heavy sprite detail.
  // ---------------------------------------------------------------
  const RIG = { sandworm: 1, gigacrab: 1, raijin: 1, demonhands: 1, skywhale: 1 };
  const RIG_FREE = { sandworm: 1, skywhale: 1 };   // these steer themselves around the room
  const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  function spring(an, k, target, dt, st = 160, dp = 15) {
    if (an[k] == null) { an[k] = target; an[k + 'v'] = 0; }
    let v = an[k + 'v'] + (target - an[k]) * st * dt; v *= Math.exp(-dp * dt); an[k + 'v'] = v; an[k] += v * dt; return an[k];
  }
  const kick = (an, k, v) => { an[k + 'v'] = (an[k + 'v'] || 0) + v; };
  // a body that follows the head's path: segments sit at fixed distances back along the trail
  function chainUpdate(B, spacing, n) {
    const T = B.trail, last = T[T.length - 1];
    if (!last || hyp(B.x - last.x, B.y - last.y) > 3) { T.push({ x: B.x, y: B.y }); if (T.length > 700) T.shift(); }
    const segs = []; let need = spacing[0], i = T.length - 1, px = B.x, py = B.y, acc = 0;
    while (segs.length < n && i >= 0) {
      const p = T[i], d = hyp(px - p.x, py - p.y);
      if (d > 0 && acc + d >= need) { const f = (need - acc) / d, x = px + (p.x - px) * f, y = py + (p.y - py) * f; segs.push({ x, y }); px = x; py = y; acc = 0; need = spacing[Math.min(segs.length, spacing.length - 1)]; continue; }
      acc += d; px = p.x; py = p.y; i--;
    }
    while (segs.length < n) { const l = segs[segs.length - 1] || { x: B.x, y: B.y }; segs.push({ x: l.x, y: l.y - 2 }); }
    let ax = B.x, ay = B.y; for (const s of segs) { s.a = Math.atan2(ay - s.y, ax - s.x); ax = s.x; ay = s.y; }
    B.segs = segs;
  }
  function steer(B, ta, turn, spd, dt) {
    let da = ((ta - B.dir + Math.PI * 3) % (Math.PI * 2)) - Math.PI; B.dir += clamp(da, -turn * dt, turn * dt);
    B.x += Math.cos(B.dir) * spd * dt; B.y += Math.sin(B.dir) * spd * dt;
    const ax = B.x - arena.cx, ay = B.y - arena.cy, d = hyp(ax, ay), lim = arena.R - 30;
    if (d > lim) { B.x = arena.cx + ax / d * lim; B.y = arena.cy + ay / d * lim; }
  }
  function rigInit(B) {
    B.an = {}; B.trail = []; B.segs = []; B.dir = Math.PI / 2; B.under = 0;
    if (RIG_FREE[B.type]) for (let i = 80; i >= 0; i--) B.trail.push({ x: B.x, y: B.y - i * 5 });
    if (B.type === 'demonhands') B.hands = [-1, 1].map(s => ({ s, x: B.x + s * 120, y: B.y + 10, z: 0.3, pose: 'open', tx: 0, ty: 0, tz: 0.3, fixed: false }));
    if (B.type === 'gigacrab') B.claws = [-1, 1].map(s => ({ s, x: B.x + s * 80, y: B.y - 6, open: 0, busy: false }));
    if (B.type === 'raijin') { B.drums = Array(6).fill(0); B.beatSeen = beatN; }
  }
  function rigUpdate(B, dt) {
    const an = B.an, mv = B.mv, mn = mv ? mv.name.split(':')[0] : '', t = globalT;
    an.hit = B.hurt > 0 ? 1 : 0;
    if (B.type === 'sandworm') {
      if (!mv || !['burrow', 'slither'].includes(mn)) {   // idle: weave around the middle so the body undulates
        const tx = arena.cx + Math.cos(t * 0.5) * 120, ty = arena.cy + Math.sin(t * 0.8) * 80;
        steer(B, Math.atan2(ty - B.y, tx - B.x), 2, mn === 'sandspit' ? 30 : 75, dt);
      }
      chainUpdate(B, [36, 30, 28, 26, 25, 24, 23, 22, 21, 20, 19], 11);
      spring(an, 'under', B.under, dt, 120, 14);
      spring(an, 'open', mn === 'burrow' && mv.ph === 'erupt' ? 3 : mn === 'sandspit' && mv.t > 0.4 && mv.t < 1.2 ? 2.4 : mn === 'slither' ? 1.5 : 0.4 + Math.max(0, Math.sin(t * 2)) * 0.6, dt);
      spring(an, 'rear', mn === 'slither' && mv.ph === 'aim' ? 1 : mn === 'sandspit' && mv.t < 0.6 ? 1 : 0, dt, 120, 12);
      spring(an, 'pop', 0, dt, 90, 9);
      if (B.hot) for (const s of B.segs) if (hyp(hero.x - s.x, hero.y - s.y) < 24 + hero.r * 0.6) hurtHero(B.atk * 0.8, s.x, s.y, 380, 'body');
    } else if (B.type === 'skywhale') {
      if (!mv || !['inhale', 'breach', 'swimby', 'tailslam'].includes(mn)) {   // idle: cruise round the room
        B.orb = (B.orb || 0) + dt * 0.45 * (B.orbDir || 1); const R0 = 170 + Math.sin(t * 0.7) * 40;
        const tx = arena.cx + Math.cos(B.orb) * R0, ty = arena.cy + Math.sin(B.orb) * R0;
        steer(B, Math.atan2(ty - B.y, tx - B.x), 1.6, 115, dt);
      }
      chainUpdate(B, [40, 36, 31, 30], 4);
      spring(an, 'open', mn === 'inhale' ? 3 : mn === 'starsong' ? 1.4 : 0, dt);
      spring(an, 'flap', Math.sin(t * (mn === 'swimby' ? 9 : 3.2)), dt, 200, 18);
      spring(an, 'tail', 0, dt, 70, 8);
      if (B.hot) for (const s of B.segs.slice(0, 3)) if (hyp(hero.x - s.x, hero.y - s.y) < 34 + hero.r * 0.6) hurtHero(B.atk * 0.8, s.x, s.y, 420, 'body');
    } else if (B.type === 'gigacrab') {
      const moving = hyp(B.x - (an.px ?? B.x), B.y - (an.py ?? B.y)) / Math.max(dt, 1e-3); an.px = B.x; an.py = B.y;
      an.walk = (an.walk || 0) + dt * (2 + Math.min(moving, 400) * 0.06);
      spring(an, 'crouch', (mn === 'pincer' && mv.ph === 'wind') || (mn === 'bubbles' && mv.t < 0.5) ? 1 : 0, dt);
      spring(an, 'spin', 0, dt, 60, 8);
      for (const C of B.claws) {   // claws return to their rest spot unless a move holds them
        if (!C.busy) { const rx = B.x + C.s * 78, ry = B.y - 4 + Math.sin(t * 2.4 + C.s) * 6; C.x = lerp(C.x, rx, 1 - Math.exp(-dt * 8)); C.y = lerp(C.y, ry, 1 - Math.exp(-dt * 8)); C.open = lerp(C.open, Math.max(0, Math.sin(t * 1.3 + C.s * 2)) * 0.5, 1 - Math.exp(-dt * 6)); }
      }
      const sw = B.sweeps.filter(s => s.crab);
      sw.forEach((s, i) => { const C = B.claws[i]; if (!C) return; C.busy = true; const L = s.t < s.tele ? 95 : s.len; C.x = lerp(C.x, B.x + Math.cos(s.ang) * L, 1 - Math.exp(-dt * 20)); C.y = lerp(C.y, B.y + Math.sin(s.ang) * L, 1 - Math.exp(-dt * 20)); C.open = 0.25; });
      if (B.shield) {
        const S = B.shield; S.t -= dt; S.a += dt * 0.9;
        S.n.forEach((nd, i) => { if (!nd.alive) return; const a = S.a + i * Math.PI / 2, x = B.x + Math.cos(a) * (B.r + 46), y = B.y + Math.sin(a) * (B.r + 46); nd.x = x; nd.y = y; if (hyp(hero.x - x, hero.y - y) < 18 + hero.r) { nd.alive = false; burst(x, y, 16, '#d0f0ff', 200, 0.5); A.sfx('crate'); popText(x, y + 24, 'パチン！', '#d0f0ff', 14, 0.7); } });
        if (S.n.every(nd => !nd.alive)) { B.shield = null; B.dizzy = 2.4; B.mv = null; B.cd = 2.4; burst(B.x, B.y, 40, '#d0f0ff', 320); banner = { a: 'あわの たてが われた！', b: 'CHANCE', t: 1.4, boss: true }; A.sfx('boom'); }
        else if (S.t <= 0) { B.shield = null; for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; const b = shoot(B.x, B.y, Math.cos(a), Math.sin(a), 130, B.atk * 0.8, 'bubble', 4); b.col = '200,240,255'; } A.sfx('boom'); }
      }
      if (B.dizzy > 0) { B.dizzy -= dt; B.cd = Math.max(B.cd, 0.4); }
    } else if (B.type === 'raijin') {
      an.ring = (an.ring || 0) + dt * (mn === 'taiko' ? 1.2 : 0.35);
      for (let i = 0; i < 6; i++) B.drums[i] = Math.max(0, B.drums[i] - dt * 2.5);
      spring(an, 'armL', 0, dt, 140, 11); spring(an, 'armR', 0, dt, 140, 11);
      spring(an, 'lean', mn === 'thunderdash' ? 1 : 0, dt); spring(an, 'mouth', 0, dt, 80, 10);
    } else if (B.type === 'demonhands') {
      for (const H of B.hands) {
        if (!H.fixed) { H.tx = B.x + H.s * 125 + Math.sin(t * 1.4 + H.s) * 10; H.ty = B.y + 10 + Math.cos(t * 1.1 + H.s) * 12; H.tz = 0.35 + Math.sin(t * 2 + H.s) * 0.08; H.pose = 'open'; }
        const k = H.fast ? 26 : 7; H.x = lerp(H.x, H.tx, 1 - Math.exp(-dt * k)); H.y = lerp(H.y, H.ty, 1 - Math.exp(-dt * k)); H.z = lerp(H.z, H.tz, 1 - Math.exp(-dt * (H.fast ? 30 : 8)));
      }
      an.blink = (an.blink || 0) - dt; if (an.blink < -3.2) an.blink = 0.25;
      spring(an, 'look', 0, dt);
      if (B.grab) {   // hero held in a hand, then flung
        const G = B.grab, H = B.hands[G.h]; G.t -= dt; hero.x = H.x; hero.y = H.y; hero.vx = hero.vy = 0; hero.stun = Math.max(hero.stun, 0.1);
        if (G.t <= 0) { B.grab = null; H.fixed = false; const a = rnd(0, 6.28); hero.stun = 0; hero.inv = 0; hurtHero(B.atk * 0.9, H.x - Math.cos(a) * 30, H.y - Math.sin(a) * 30, 700, 'throw'); }
      }
    }
  }
  // ---- the five bosses' own moves ----
  function rigMove(B, dt, ang, name, arg) {
    const mv = B.mv, p2 = B.phase === 2, an = B.an, done = cd => { B.mv = null; B.cd = cd; B.tele = null; B.hot = false; };
    switch (name) {
      // ===== sandworm =====
      case 'burrow': {   // dives, tunnels after you, and bursts out of the sand where you stand
        const reps = p2 ? 2 : 1;
        if (mv.ph == null) { mv.ph = 'dive'; mv.pt = 0; mv.k = 0; }
        mv.pt += dt;
        if (mv.ph === 'dive') { B.under = Math.min(1, mv.pt / 0.45); if (mv.pt > 0.45) { mv.ph = 'track'; mv.pt = 0; B.alpha = 0.3; burst(B.x, B.y, 26, '#c8a060', 220, 0.6); A.sfx('quake'); shake = 10; } }
        else if (mv.ph === 'track') {
          if (mv.pt < 1.1) { mv.tx = hero.x; mv.ty = hero.y; }
          else if (!mv.circ) { mv.circ = 1; const ax = mv.tx - arena.cx, ay = mv.ty - arena.cy, ad = hyp(ax, ay), lim = arena.R - 60; if (ad > lim) { mv.tx = arena.cx + ax / ad * lim; mv.ty = arena.cy + ay / ad * lim; } addCircle(mv.tx, mv.ty, 78, 0.7, B.atk * 1.2, 'sand'); }
          const dx = mv.tx - B.x, dy = mv.ty - B.y, d = hyp(dx, dy), s2 = 320 * dt;
          if (d > s2) { B.dir = Math.atan2(dy, dx); B.x += dx / d * s2; B.y += dy / d * s2; } else { B.x = mv.tx; B.y = mv.ty; }
          if (Math.random() < dt * 30) burst(B.x, B.y, 3, '#d8b070', 90, 0.4);
          if (mv.pt > 1.8) {
            mv.ph = 'erupt'; mv.pt = 0; B.under = 0; B.alpha = 1; B.x = mv.tx; B.y = mv.ty; B.dir = -Math.PI / 2 + rnd(-0.6, 0.6);
            kick(an, 'pop', 9); rings.push({ x: B.x, y: B.y, r: B.r, max: 170, spd: 360, dmg: B.atk * 0.7, w: 12 }); shake = 22; A.sfx('roar'); A.sfx('quake');
            burst(B.x, B.y, 50, '#d8b070', 380, 0.8); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; shoot(B.x, B.y, Math.cos(a), Math.sin(a), 170, B.atk, 'rock', 2.4); }
          }
        } else if (mv.pt > 0.9) { mv.k++; if (mv.k < reps) { mv.ph = 'dive'; mv.pt = 0; mv.circ = 0; } else done(1.2); }
        return true;
      }
      case 'slither': {  // rears up, then charges through the room steering after you; the whole body hurts
        if (mv.ph == null) { mv.ph = 'aim'; mv.pt = 0; }
        mv.pt += dt;
        if (mv.ph === 'aim') { B.tele = Math.atan2(hero.y - B.y, hero.x - B.x); steer(B, B.tele, 3, 20, dt); if (mv.pt > 0.75) { mv.ph = 'go'; mv.pt = 0; B.tele = null; B.hot = true; A.sfx('roar'); } }
        else if (mv.ph === 'go') {
          const toC = hyp(B.x - arena.cx, B.y - arena.cy) > arena.R - 70, ta = toC ? Math.atan2(arena.cy - B.y, arena.cx - B.x) : Math.atan2(hero.y - B.y, hero.x - B.x);
          steer(B, ta, toC ? 4 : (p2 ? 1.7 : 1.25), p2 ? 410 : 360, dt);
          if (Math.random() < dt * 25) burst(B.x, B.y, 3, '#d8b070', 120, 0.4);
          if (mv.pt > 2.3) { mv.ph = 'rest'; mv.pt = 0; B.hot = false; }
        } else if (mv.pt > 0.5) done(1.1);
        return true;
      }
      case 'sandspit':   // rears back and spits sand balls that leave sinking sand
        if (mv.t > 0.55 && !mv.n) {
          mv.n = 1; kick(an, 'pop', 5); A.sfx('magic');
          for (let i = 0; i < (p2 ? 6 : 4); i++) { const tx = hero.x + rnd(-110, 110), ty = hero.y + rnd(-110, 110), d0 = hyp(tx - B.x, ty - B.y) || 1; bullets.push({ x: B.x, y: B.y, vx: 0, vy: 0, r: 10, dmg: 0, kind: 'sandball', life: 9, t: 0, dest: { x: tx, y: ty }, spd: 300, d0, harmless: true, onLand: b => { zones.push({ type: 'patch', kind: 'sand', x: b.x, y: b.y, r: 46, core: 11, pr: 76, pull: 130, life: 5.5, dmg: B.atk * 0.4, t: 0 }); burst(b.x, b.y, 14, '#d8b070', 160); } }); }
        }
        if (mv.t > 1.4 && mv.n === 1) { mv.n = 2; for (const o of [-0.25, 0, 0.25]) shoot(B.x, B.y, Math.cos(ang + o), Math.sin(ang + o), 230, B.atk, 'rock'); }
        if (mv.t > 2) done(1.1);
        return true;
      // ===== giga crab =====
      case 'pincer': {   // a claw winds back wide open, then shoots out and snaps shut where you were
        const n = p2 ? 3 : 2;
        if (mv.ph == null) { mv.ph = 'wind'; mv.pt = 0; mv.k = 0; mv.c = hero.x < B.x ? 0 : 1; }
        mv.pt += dt; const C = B.claws[mv.c]; C.busy = true;
        if (mv.ph === 'wind') {
          if (mv.pt < 0.45) { const a = Math.atan2(hero.y - B.y, hero.x - B.x), d = Math.min(240, hyp(hero.x - B.x, hero.y - B.y)); mv.tx = B.x + Math.cos(a) * d; mv.ty = B.y + Math.sin(a) * d; }
          else if (!mv.circ) { mv.circ = 1; addCircle(mv.tx, mv.ty, 50, 0.38, B.atk * 1.15, 'mine'); }
          const bx = B.x + C.s * 70, by = B.y + 46; C.x = lerp(C.x, bx, 1 - Math.exp(-dt * 10)); C.y = lerp(C.y, by, 1 - Math.exp(-dt * 10)); C.open = lerp(C.open, 1, 1 - Math.exp(-dt * 10));
          if (mv.pt > 0.62) { mv.ph = 'snap'; mv.pt = 0; mv.sx = C.x; mv.sy = C.y; }
        } else if (mv.ph === 'snap') {
          const k = ease(mv.pt / 0.18); C.x = lerp(mv.sx, mv.tx, k); C.y = lerp(mv.sy, mv.ty, k); C.open = 1 - k * 0.2;
          if (mv.pt > 0.18) { mv.ph = 'hold'; mv.pt = 0; C.open = 0; shake = 12; burst(mv.tx, mv.ty, 18, '#fff0d8', 240, 0.4); A.sfx('crit'); }
        } else if (mv.ph === 'hold') { if (mv.pt > 0.32) { mv.ph = 'back'; mv.pt = 0; } }
        else { C.busy = false; if (mv.pt > 0.25) { mv.k++; mv.circ = 0; if (mv.k < n) { mv.ph = 'wind'; mv.pt = 0.2; mv.c = 1 - mv.c; } else done(1.1); } }
        return true;
      }
      case 'sidestep': { // crabs walk sideways: quick scuttles across the room, blowing bubbles at you after each
        const reps = p2 ? 3 : 2;
        if (mv.ph == null) { mv.ph = 'go'; mv.pt = 0; mv.k = 0; mv.dir = Math.random() < 0.5 ? 1 : -1; }
        mv.pt += dt;
        if (mv.ph === 'go') {
          const a = Math.atan2(hero.y - B.y, hero.x - B.x) + Math.PI / 2 * mv.dir; B.x += Math.cos(a) * 340 * dt; B.y += Math.sin(a) * 340 * dt;
          const ax = B.x - arena.cx, ay = B.y - arena.cy, d = hyp(ax, ay), lim = arena.R - B.r - 20; if (d > lim) { B.x = arena.cx + ax / d * lim; B.y = arena.cy + ay / d * lim; mv.dir = -mv.dir; }
          if (mv.pt > 0.62) { mv.ph = 'shoot'; mv.pt = 0; for (const o of [-0.3, 0, 0.3]) { const b = shoot(B.x, B.y - 10, Math.cos(ang + o), Math.sin(ang + o), 150, B.atk * 0.8, 'bubble', 3.2); b.col = '200,240,255'; } A.sfx('magic'); }
        } else if (mv.pt > 0.35) { mv.k++; if (mv.k < reps) { mv.ph = 'go'; mv.pt = 0; mv.dir = Math.random() < 0.6 ? -mv.dir : mv.dir; } else { B.hx = B.x; B.hy = B.y; B.homeT = 2.5; done(1); } }
        return true;
      }
      case 'bubbles':    // a spray of big slow bubbles that bounce off the walls
        if (mv.t > 0.5 && !mv.n) { mv.n = 1; const k = p2 ? 9 : 7; for (let i = 0; i < k; i++) { const a = ang + (i - (k - 1) / 2) * 0.32, s2 = rnd(90, 140); const b = shoot(B.x, B.y - 10, Math.cos(a), Math.sin(a), s2, B.atk * 0.8, 'bubble', 5.5); b.r = 15; b.bounce = 2; b.col = '200,240,255'; } A.sfx('magic2'); }
        if (mv.t > 1.4) done(1.1);
        return true;
      case 'clawspin':   // spins on the spot with both claws out
        if (!mv.n) { mv.n = 1; const v = (Math.random() < 0.5 ? 1 : -1) * (p2 ? 3.4 : 2.8); for (const o of [0, Math.PI]) addSweep(B, { ang: ang + o, vel: v, len: 150, w: 16, left: Math.PI * 2.4, col: '#e86030', kind: 'club', tele: 0.7, crab: true }); }
        if (mv.t > 3.1) { for (const C of B.claws) C.busy = false; done(1.1); }
        return true;
      case 'bubbleshield':   // blows a dome of bubbles round itself: pop the four bubbles to break it
        if (!mv.n) { mv.n = 1; if (!B.shield) { B.shield = { t: p2 ? 8 : 9, a: rnd(0, 6.28), n: [0, 1, 2, 3].map(() => ({ alive: true, x: B.x, y: B.y })) }; popText(B.x, B.y + B.r + 40, 'あわの たて！ まわりの あわを わろう', '#d0f0ff', 14, 1.6); A.sfx('magic2'); } }
        if (mv.t > 0.8) done(0.8);
        return true;
      // ===== raijin =====
      case 'taiko': {    // beats the drums in time with the music; every beat calls a bolt two beats later
        const N = p2 ? 12 : 8;
        if (mv.k == null) { mv.k = 0; mv.last = 0; mv.int = 0.42; B.beatSeen = beatN; }
        const beat = audioOn ? beatN !== B.beatSeen || mv.t - mv.last > 0.9 : mv.t - mv.last >= mv.int;
        if (beat && mv.k < N && mv.t > 0.3) {
          if (mv.k > 0) mv.int = clamp(mv.t - mv.last, 0.28, 0.7);
          B.beatSeen = beatN; mv.last = mv.t; mv.k++;
          const side = mv.k % 2 ? 'armL' : 'armR'; kick(an, side, 28); kick(an, 'mouth', 8); B.drums[mv.k % 6] = 1; A.sfx('hit');
          const lead = 0.35, tx = hero.x + hero.vx * lead, ty = hero.y + hero.vy * lead;
          addCircle(tx, ty, 46, mv.int * 2, B.atk, 'bolt');
          if (p2) { const pt = arenaSpot(80); addCircle(pt.x, pt.y, 46, mv.int * 2, B.atk, 'bolt'); }
          shake = Math.max(shake, 4);
        }
        if (mv.k >= N && mv.t - mv.last > mv.int * 2.4) done(1.2);
        return true;
      }
      case 'thunderdash': {   // rides the cloud across the room three times; each path is struck a moment later
        const total = p2 ? 3 : 2;
        if (mv.ph == null) { mv.ph = 'aim'; mv.pt = 0; mv.k = 0; }
        mv.pt += dt;
        if (mv.ph === 'aim') { mv.a0 = Math.atan2(hero.y - B.y, hero.x - B.x); B.tele = mv.a0; if (mv.pt > (mv.k ? 0.4 : 0.65)) { mv.ph = 'go'; mv.pt = 0; B.tele = null; mv.sx = B.x; mv.sy = B.y; A.sfx('magic'); } }
        else if (mv.ph === 'go') {
          B.x += Math.cos(mv.a0) * 560 * dt; B.y += Math.sin(mv.a0) * 560 * dt;
          const ddx = B.x - arena.cx, ddy = B.y - arena.cy, d = hyp(ddx, ddy);
          if (d > arena.R - B.r) {
            B.x = arena.cx + ddx / d * (arena.R - B.r); B.y = arena.cy + ddy / d * (arena.R - B.r); shake = 12; A.sfx('quake');
            zones.push({ type: 'seg', kind: 'bolt', x: mv.sx, y: mv.sy, x2: B.x, y2: B.y, w: 16, tele: 0.55, act: 0.25, dmg: B.atk, t: 0 });
            mv.k++; mv.ph = mv.k >= total ? 'rest' : 'aim'; mv.pt = 0;
          }
        } else if (mv.pt > 0.9) { B.hx = B.x; B.hy = B.y; B.homeT = 2; done(1.1); }
        return true;
      }
      case 'chainbolt':  // a bolt to where you stand, which then forks outward
        if (!mv.n) { mv.n = 1; mv.tx = hero.x; mv.ty = hero.y; zones.push({ type: 'seg', kind: 'bolt', x: B.x, y: B.y, x2: mv.tx, y2: mv.ty, w: 13, tele: 0.65, act: 0.2, dmg: B.atk, t: 0 }); kick(an, 'armR', 30); }
        if (mv.t > 0.85 && mv.n === 1) { mv.n = 2; const k = p2 ? 6 : 5, off = rnd(0, 1); for (let i = 0; i < k; i++) { const a = (i + off) / k * Math.PI * 2; zones.push({ type: 'seg', kind: 'bolt', x: mv.tx, y: mv.ty, x2: mv.tx + Math.cos(a) * 170, y2: mv.ty + Math.sin(a) * 170, w: 12, tele: 0.5, act: 0.2, dmg: B.atk, t: 0 }); } kick(an, 'armL', 30); }
        if (mv.t > 1.7) done(1.1);
        return true;
      // ===== demon hands =====
      case 'slam': {     // a hand rises over you, its shadow follows, then it slams down
        const n = p2 ? 3 : 2;
        if (mv.ph == null) { mv.ph = 'raise'; mv.pt = 0; mv.k = 0; mv.h = hero.x < B.x ? 0 : 1; }
        mv.pt += dt; const H = B.hands[mv.h]; H.fixed = true;
        if (mv.ph === 'raise') {
          if (mv.pt < 0.55) { H.tx = hero.x; H.ty = hero.y; } else if (!mv.circ) { mv.circ = 1; addCircle(H.tx, H.ty, 54, 0.3, B.atk, 'curse'); }
          H.tz = 1.3; H.pose = 'fist'; H.fast = false;
          if (mv.pt > 0.75) { mv.ph = 'drop'; mv.pt = 0; H.tz = 0; H.fast = true; }
        } else if (mv.ph === 'drop') {
          if (mv.pt > 0.1 && !mv.boom) { mv.boom = 1; shake = 18; A.sfx('quake'); rings.push({ x: H.x, y: H.y, r: 20, max: 130, spd: 380, dmg: 0, w: 10, fx: true }); burst(H.x, H.y, 26, '#c8a0ff', 280, 0.6); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + rnd(0, 1); shoot(H.x, H.y, Math.cos(a), Math.sin(a), 160, B.atk, 'rock', 1.6); } }
          if (mv.pt > 0.35) { H.fast = false; H.fixed = false; mv.k++; mv.boom = 0; mv.circ = 0; if (mv.k < n) { mv.ph = 'raise'; mv.pt = 0.15; mv.h = 1 - mv.h; } else done(1); }
        }
        return true;
      }
      case 'clap': {     // the hands spread either side of you and clap together
        const reps = p2 ? 2 : 1, [L, R] = B.hands;
        if (mv.ph == null) { mv.ph = 'spread'; mv.pt = 0; mv.k = 0; }
        mv.pt += dt; L.fixed = R.fixed = true;
        const vert = mv.k % 2 === 1, ox = vert ? 0 : 190, oy = vert ? 190 : 0;
        if (mv.ph === 'spread') {
          if (mv.pt < 0.6) { mv.cx = hero.x; mv.cy = hero.y; }
          else if (!mv.z) { mv.z = 1; zones.push({ type: 'seg', kind: 'curse', x: mv.cx - ox, y: mv.cy - oy, x2: mv.cx + ox, y2: mv.cy + oy, w: 30, tele: 0.32, act: 0.14, dmg: B.atk * 1.1, t: 0 }); }
          L.tx = mv.cx - ox; L.ty = mv.cy - oy; R.tx = mv.cx + ox; R.ty = mv.cy + oy; L.tz = R.tz = 0.25; L.pose = R.pose = 'open'; L.fast = R.fast = false;
          if (mv.pt > 0.92) { mv.ph = 'clap'; mv.pt = 0; L.tx = R.tx = mv.cx; L.ty = R.ty = mv.cy; L.tx -= vert ? 0 : 22; R.tx += vert ? 0 : 22; L.ty -= vert ? 22 : 0; R.ty += vert ? 22 : 0; L.fast = R.fast = true; }
        } else if (mv.ph === 'clap') {
          if (mv.pt > 0.12 && !mv.boom) { mv.boom = 1; flash = 0.5; flashCol = '230,180,255'; shake = 24; A.sfx('boom'); rings.push({ x: mv.cx, y: mv.cy, r: 10, max: 150, spd: 520, dmg: 0, w: 10, fx: true }); burst(mv.cx, mv.cy, 40, '#e0c0ff', 360, 0.6); }
          if (mv.pt > 0.45) { mv.k++; mv.boom = 0; mv.z = 0; L.fast = R.fast = false; if (mv.k < reps) { mv.ph = 'spread'; mv.pt = 0.2; } else { L.fixed = R.fixed = false; done(1.2); } }
        }
        return true;
      }
      case 'fingerlaser': {   // a hand points; a beam shoots from the fingertip and sweeps
        if (!mv.n) {
          mv.n = 1; const hs = p2 ? [0, 1] : [hero.x < B.x ? 0 : 1];
          for (const i of hs) { const H = B.hands[i]; H.fixed = true; H.tx = B.x + H.s * 95; H.ty = B.y - 30; H.tz = 0.4; H.pose = 'point'; }
          mv.hs = hs;
        }
        if (mv.t > 0.45 && mv.n === 1) { mv.n = 2; const v = (Math.random() < 0.5 ? 1 : -1) * 0.65; for (const i of mv.hs) { const H = B.hands[i], a = Math.atan2(hero.y - H.y, hero.x - H.x); zones.push({ type: 'beam', boss: null, x: H.x, y: H.y, ang: a, len: arena.R * 2.2, w: 13, tele: 0.75, act: 1.5, vel: v * H.s, t: 0, dmg: B.atk, kind: 'beam', hand: H }); } }
        if (mv.t > 2.9) { for (const i of mv.hs) B.hands[i].fixed = false; done(1.1); }
        return true;
      }
      case 'grab': {     // a hand chases you; if it catches you, it lifts you and throws you
        if (mv.ph == null) { mv.ph = 'chase'; mv.pt = 0; mv.h = hero.x < B.x ? 0 : 1; }
        mv.pt += dt; const H = B.hands[mv.h]; H.fixed = true;
        if (mv.ph === 'chase') {
          const a = Math.atan2(hero.y - H.y, hero.x - H.x), s2 = (p2 ? 270 : 230) * dt; H.tx = H.x + Math.cos(a) * s2 * 6; H.ty = H.y + Math.sin(a) * s2 * 6; H.tz = 0.25; H.pose = 'open'; H.fast = false;
          if (hyp(hero.x - H.x, hero.y - H.y) < 34 && hero.hp > 0 && !(hero.pw && hero.pw.kind === 'giant') && hero.stunImm <= 0 && hero.inv <= 0) { mv.ph = 'hold'; mv.pt = 0; H.pose = 'fist'; H.tx = H.x; H.ty = H.y; H.tz = 1; B.grab = { h: mv.h, t: 0.9 }; hero.stunKind = 'grab'; popText(hero.x, hero.y + 40, 'つかまれた！', '#e0c0ff', 16, 1); A.sfx('block'); hero.stunImm = 2.5; }
          else if (mv.pt > 2.2) { H.fixed = false; done(1.1); }
        } else if (!B.grab) { done(1.2); }
        return true;
      }
      case 'flick': {    // flicks a spray of rocks from a hand
        if (!mv.n) { mv.n = 1; mv.h = Math.random() < 0.5 ? 0 : 1; const H = B.hands[mv.h]; H.fixed = true; H.pose = 'fist'; H.tz = 0.5; H.tx = H.x; H.ty = H.y; }
        if (mv.t > 0.5 && mv.n === 1) { mv.n = 2; const H = B.hands[mv.h]; H.pose = 'open'; const a = Math.atan2(hero.y - H.y, hero.x - H.x); for (let i = 0; i < (p2 ? 7 : 5); i++) shoot(H.x, H.y, Math.cos(a + (i - (p2 ? 3 : 2)) * 0.2), Math.sin(a + (i - (p2 ? 3 : 2)) * 0.2), 250 + rnd(-20, 20), B.atk, 'rock'); A.sfx('magic'); }
        if (mv.t > 1.1) { B.hands[mv.h].fixed = false; done(1); }
        return true;
      }
      // ===== sky whale =====
      case 'inhale': {   // turns to you, opens wide and breathes in: everything is pulled toward its mouth
        if (mv.t < 0.5) steer(B, Math.atan2(hero.y - B.y, hero.x - B.x), 3, 60, dt);
        else if (mv.t < (p2 ? 3.2 : 2.8)) {
          steer(B, Math.atan2(hero.y - B.y, hero.x - B.x), 1.2, 25, dt);
          const dx = B.x + Math.cos(B.dir) * 40 - hero.x, dy = B.y + Math.sin(B.dir) * 40 - hero.y, d = hyp(dx, dy) || 1, pull = p2 ? 420 : 340;
          if (hero.recoil <= 0) { hero.vx += dx / d * pull * dt; hero.vy += dy / d * pull * dt; }
          if (d < 40 + hero.r) hurtHero(B.atk, B.x, B.y, 500, 'mouth');
          for (const b of bullets) { const ex = B.x - b.x, ey = B.y - b.y, ed = hyp(ex, ey) || 1; if (ed < 220) { b.vx += ex / ed * 400 * dt; b.vy += ey / ed * 400 * dt; if (ed < 40) b.life = 0; } }
          if (Math.random() < dt * 30) { const a = rnd(0, 6.28), r0 = rnd(120, 220); fx.push({ x: B.x + Math.cos(a) * r0, y: B.y + Math.sin(a) * r0, vx: -Math.cos(a) * 300, vy: -Math.sin(a) * 300, life: 0.6, max: 0.6, col: '#c8f0ff', r: 3 }); }
        } else if (!mv.n) { mv.n = 1; const k = 10; for (let i = 0; i < k; i++) { const a = B.dir + (i - (k - 1) / 2) * 0.16; const b = shoot(B.x, B.y, Math.cos(a), Math.sin(a), 230, B.atk, 'orb'); b.col = SHOTCOL.star; } A.sfx('boom'); }
        if (mv.t > (p2 ? 3.6 : 3.2)) done(1.1);
        return true;
      }
      case 'breach': {   // leaps out of the room... a shadow finds you... and it comes crashing down
        if (mv.ph == null) { mv.ph = 'leap'; mv.pt = 0; }
        mv.pt += dt;
        if (mv.ph === 'leap') { an.z = ease(mv.pt / 0.8); steer(B, B.dir, 0, 220, dt); if (mv.pt > 0.8) { mv.ph = 'air'; mv.pt = 0; B.alpha = 0.3; A.sfx('warp'); } }
        else if (mv.ph === 'air') {
          an.z = 1; if (mv.pt < 1.0) { mv.tx = hero.x; mv.ty = hero.y; } else if (!mv.circ) { mv.circ = 1; addCircle(mv.tx, mv.ty, 115, 0.55, B.atk * 1.4, 'water'); }
          if (mv.pt > 1.55) { mv.ph = 'crash'; mv.pt = 0; B.x = mv.tx; B.y = mv.ty; B.dir = rnd(0, 6.28); B.trail.length = 0; for (let i = 40; i >= 0; i--) B.trail.push({ x: B.x - Math.cos(B.dir) * i * 5, y: B.y - Math.sin(B.dir) * i * 5 }); }
        } else if (mv.ph === 'crash') {
          an.z = 1 - ease(mv.pt / 0.22);
          if (mv.pt > 0.22 && !mv.boom) { mv.boom = 1; B.alpha = 1; an.z = 0; shake = 28; flash = 0.4; flashCol = '200,230,255'; A.sfx('quake'); A.sfx('boom'); rings.push({ x: B.x, y: B.y, r: 30, max: 270, spd: 420, dmg: B.atk * 0.8, w: 14 }); burst(B.x, B.y, 60, '#c8f0ff', 420, 0.9); for (let k = 0; k < (p2 ? 18 : 14); k++) { const a = k / (p2 ? 18 : 14) * Math.PI * 2; const b = shoot(B.x, B.y, Math.cos(a), Math.sin(a), 150, B.atk, 'orb', 3); b.col = SHOTCOL.star; } }
          if (mv.pt > 1.1) done(1.2);
        }
        return true;
      }
      case 'swimby': {   // moves off to the edge, then charges straight through the room; its body hurts
        if (mv.ph == null) { mv.ph = 'pos'; mv.pt = 0; const a = Math.atan2(B.y - hero.y, B.x - hero.x); mv.px = arena.cx + Math.cos(a) * (arena.R - 60); mv.py = arena.cy + Math.sin(a) * (arena.R - 60); }
        mv.pt += dt;
        if (mv.ph === 'pos') { steer(B, Math.atan2(mv.py - B.y, mv.px - B.x), 4, 300, dt); if (mv.pt > 0.9 || hyp(mv.px - B.x, mv.py - B.y) < 30) { mv.ph = 'aim'; mv.pt = 0; } }
        else if (mv.ph === 'aim') { const a = Math.atan2(hero.y - B.y, hero.x - B.x); steer(B, a, 5, 30, dt); B.tele = B.dir; if (mv.pt > 0.55) { mv.ph = 'go'; mv.pt = 0; B.tele = null; B.hot = true; A.sfx('roar'); } }
        else if (mv.ph === 'go') { steer(B, B.dir, 0, p2 ? 600 : 520, dt); if (Math.random() < dt * 20) burst(B.x, B.y, 3, '#c8f0ff', 120, 0.4); if (mv.pt > 1.15) { mv.ph = 'rest'; mv.pt = 0; B.hot = false; } }
        else if (mv.pt > 0.5) done(1.1);
        return true;
      }
      case 'tailslam': { // swings round and slaps its tail: waves roll out from the tail
        if (mv.t < 0.6) steer(B, Math.atan2(B.y - hero.y, B.x - hero.x), 3.5, 60, dt);
        const n = p2 ? 3 : 2;
        if (mv.t > 0.6 + (mv.n || 0) * 0.45 && (mv.n || 0) < n) { mv.n = (mv.n || 0) + 1; const T = B.segs[B.segs.length - 1]; kick(an, 'tail', 14 * (mv.n % 2 ? 1 : -1)); rings.push({ x: T.x, y: T.y, r: 20, max: 230, spd: 300, dmg: B.atk * 0.8, w: 12 }); shake = 14; A.sfx('quake'); burst(T.x, T.y, 24, '#c8f0ff', 260, 0.6); }
        if (mv.t > 0.8 + n * 0.45) done(1.1);
        return true;
      }
      case 'starsong': { // it sings: rings of starlight with a gap roll out from its head
        const n = 3;
        if (mv.t > 0.4 + (mv.n || 0) * 0.55 && (mv.n || 0) < n) {
          mv.n = (mv.n || 0) + 1; const N = 30, gap = mv.gap = mv.n === 1 ? rnd(0, N) : mv.gap + 5;
          for (let i = 0; i < N; i++) { const di = Math.abs(((i - gap + N * 1.5) % N) - N / 2); if (di < 2.5) continue; const a = i / N * Math.PI * 2; const b = shoot(B.x, B.y, Math.cos(a), Math.sin(a), 110, B.atk, 'orb', 4.5); b.col = SHOTCOL.star; }
          A.sfx('magic2'); for (let k = 0; k < 3; k++) fx.push({ x: B.x + rnd(-20, 20), y: B.y + 20, vx: rnd(-30, 30), vy: 80, life: 1, max: 1, col: '#fff2a0', r: 3 });
        }
        if (mv.t > 0.6 + n * 0.55) done(1.2);
        return true;
      }
    }
    return false;
  }

  // ---- drawing the rigged bosses ----
  function pd(s, x, y, rot = 0, sx = 1, sy2 = 1, a = 1) {
    if (!s) return;
    if (!rot && sx === 1 && sy2 === 1) { SPR.draw(ctx, s, x, y, a); return; }
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(sx, sy2); SPR.draw(ctx, s, 0, 0, a); ctx.restore();
  }
  const P_ = (name, P, fl) => SPR.part(name, Object.assign({ flash: fl }, P));
  function blob2(x, y, rx, ry, a) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); }
  function drawRigBoss(B) {
    const an = B.an, p2 = B.phase === 2 ? 1 : 0, fl = B.hurt > 0, x = B.x, y = sy(B.y), t = globalT, mv = B.mv, mn = mv ? mv.name.split(':')[0] : '';
    ctx.save(); ctx.globalAlpha = B.dead ? Math.max(0, 1 - B.dead / 0.6) : 1;
    if (B.type === 'sandworm') {
      const U = clamp(an.under || 0, 0, 1), pop = an.pop || 0, rear = an.rear || 0;
      if (U < 0.95) {
        for (let i = B.segs.length - 1; i >= 0; i--) {   // tail first; each ring bobs a little out of phase
          const s = B.segs[i], k = Math.max(0, 1 - U * 1.4 - (B.segs.length - i) * 0.03), sc = (1 - i * 0.035) * k; if (sc <= 0.05) continue;
          const sxp = s.x, syp = sy(s.y) - Math.sin(t * 5 - i * 0.6) * 3 - (i < 2 ? rear * 10 * (2 - i) : 0);
          blob2(sxp, sy(s.y) + 10, 20 * sc, 7 * sc, 0.25);
          pd(P_('sw_seg', { s: Math.min(3, Math.floor(i / 3)), p2 }, fl), sxp, syp, -s.a, sc * (1 + Math.sin(t * 5 - i * 0.6) * 0.04), sc);
        }
      }
      if (U > 0.05) pd(SPR.part('sw_mound', { f: Math.floor(t * 8) }), x, y + 6, 0, 1 + U * 0.3, 1 + U * 0.2);
      if (U < 0.98) {
        const sc = (1 - U) * (1.25 + rear * 0.2 + pop * 0.06), lift = rear * 18 + pop * 3;
        blob2(x, y + 14, 30 * sc, 10 * sc, 0.3);
        pd(P_('sw_head', { open: clamp(Math.round(an.open || 0), 0, 3), p2 }, fl), x, y - lift, -B.dir + Math.sin(t * 3) * 0.08, sc * (1 + pop * 0.03), sc * (1 - pop * 0.02));
      }
    } else if (B.type === 'skywhale') {
      const z = an.z || 0, sc = 1 + z * 0.55, lift = z * 120, al = 1 - z * 0.9, open = clamp(Math.round(an.open || 0), 0, 3), flap = an.flap || 0;
      const S = B.segs, b0 = S[0];
      // shadow on the floor for the whole body (stays put while it leaps)
      for (const s of [{ x: B.x, y: B.y }, ...S.slice(0, 3)]) blob2(s.x, sy(s.y) + 18, 34 * (1 - z * 0.5), 12 * (1 - z * 0.5), 0.22);
      if (mn === 'breach' && mv.ph === 'air') { const k = clamp(mv.pt / 1.55, 0, 1); blob2(mv.tx ?? hero.x, sy(mv.ty ?? hero.y), 40 + k * 70, 16 + k * 28, 0.2 + k * 0.25); }
      if (al > 0.05) {
        ctx.save(); ctx.globalAlpha *= al;
        const T = S[3], tw = (an.tail || 0) * 0.04 + Math.sin(t * 3.2) * 0.25;
        pd(P_('wh_fluke', { p2 }, fl), T.x, sy(T.y) - lift, -T.a + tw, sc, sc);
        pd(P_('wh_body', { i: 2, p2 }, fl), S[2].x, sy(S[2].y) - lift, -S[2].a, sc, sc);
        pd(P_('wh_body', { i: 1, p2 }, fl), S[1].x, sy(S[1].y) - lift, -S[1].a, sc, sc);
        for (const s2 of [-1, 1]) { const a = -b0.a + s2 * (Math.PI / 2 + 0.3 + flap * 0.35); pd(P_('wh_fin', { p2 }, fl), b0.x + Math.cos(-b0.a + s2 * Math.PI / 2) * 22 * sc, sy(b0.y) - lift + Math.sin(-b0.a + s2 * Math.PI / 2) * 22 * sc, a, sc, sc); }
        pd(P_('wh_body', { i: 0, p2 }, fl), b0.x, sy(b0.y) - lift, -b0.a, sc, sc);
        pd(P_('wh_head', { open, p2 }, fl), x, y - lift, -B.dir, sc * (1 + (an.open || 0) * 0.02), sc);
        if (mn === 'rain') for (let i = 0; i < 6; i++) { const k = (t * 2 + i / 6) % 1; ctx.fillStyle = `rgba(200,240,255,${1 - k})`; ctx.fillRect(q(x + Math.cos(-B.dir) * 6 + rnd(-4, 4)), q(y - lift - 10 - k * 60), 3, 6); }
        ctx.restore();
      }
    } else if (B.type === 'gigacrab') {
      const cr = an.crouch || 0, bob = Math.sin(t * 3) * 2 - cr * 6, spin = an.spin || 0, dz = B.dizzy > 0;
      blob2(x, y + 30, 92, 22, 0.3);
      const body = [x, y - 6 + bob];
      // legs, far ones first; they step with the walk phase
      for (const pass of [1, 0]) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
        const ph = an.walk * 6 + i * 2.1 + (s > 0 ? Math.PI : 0) + pass, lift = Math.max(0, Math.sin(ph)) * 0.25;
        const hx = body[0] + s * (34 + i * 8), hy = body[1] + 14 + pass * -4 + i * 2, rot = s > 0 ? (0.35 + i * 0.25 - lift) : Math.PI - (0.35 + i * 0.25 - lift);
        pd(P_('cr_leg', { far: pass }, fl), hx, hy, rot, 1.5, s > 0 ? 1.5 : -1.5);
      }
      // eyes on stalks
      for (const s of [-1, 1]) pd(P_('cr_eye', { p2 }, fl), body[0] + s * 13, body[1] - 22, s * (0.15 + Math.sin(t * 2.6 + s) * 0.12) + (dz ? Math.sin(t * 9) * 0.4 : 0), 1.5, 1.5);
      pd(P_('cr_body', { p2 }, fl), body[0], body[1], spin * 0.15 + (dz ? Math.sin(t * 8) * 0.06 : 0), 1.5 * (1 + cr * 0.06), 1.5 * (1 - cr * 0.07));
      if (dz) for (let i = 0; i < 3; i++) { const a = t * 4 + i * 2.1; ctx.fillStyle = '#ffe14a'; ctx.fillRect(q(body[0] + Math.cos(a) * 30), q(body[1] - 46 + Math.sin(a) * 8), 4.5, 4.5); }
      // arms + claws (claws sit wherever the move put them)
      for (const C of B.claws) {
        const sxp = body[0] + C.s * 52, syp = body[1] + 4, cx = C.x, cy = sy(C.y) - 6;
        const dx = cx - sxp, dy = cy - syp, L = Math.max(10, hyp(dx, dy)), a = Math.atan2(dy, dx);
        const n = Math.max(1, Math.ceil(L / 34));   // the arm is a row of shell segments, so a long reach still looks like a crab's arm
        for (let i = 0; i < n; i++) { const k = i / n; pd(P_('cr_arm', { p2 }, fl), sxp + dx * k, syp + dy * k, a, Math.min(1.5, (L / n) / 30 * 1.1), 1.5 * (1 - k * 0.15)); }
        const left = Math.cos(a) < 0, fy = left ? -1 : 1;
        pd(P_('cr_claw', { p2 }, fl), cx, cy, a, 1.5, 1.5 * fy);
        const jx = cx + Math.cos(a) * 33 + Math.sin(a) * 2 * fy, jy = cy + Math.sin(a) * 33 - Math.cos(a) * 2 * fy;
        pd(P_('cr_finger', { p2 }, fl), jx, jy, a - fy * (C.open * 0.75), 1.5, 1.5 * fy);
      }
      if (B.shield) {   // the bubble dome and its four bubbles
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(150,220,255,${0.12 + 0.05 * Math.sin(t * 6)})`; ctx.beginPath(); ctx.arc(x, y - 6, B.r + 26, 0, 7); ctx.fill(); ctx.restore();
        ctx.strokeStyle = 'rgba(210,240,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 6, B.r + 26, 0, 7); ctx.stroke();
        for (const nd of B.shield.n) if (nd.alive) { const nx = nd.x, ny = sy(nd.y); ctx.fillStyle = 'rgba(180,230,255,.35)'; ctx.beginPath(); ctx.arc(nx, ny, 16, 0, 7); ctx.fill(); ctx.strokeStyle = '#e8f8ff'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#ffffff'; ctx.fillRect(q(nx - 7.5), q(ny - 9), 4.5, 3); }
      }
    } else if (B.type === 'raijin') {
      const hov = Math.sin(t * 2.2) * 6, lean = an.lean || 0, cy0 = y - 20 + hov, ring = an.ring || 0;
      blob2(x, y + 34, 60, 16, 0.25);
      const drum = (i, front) => { const a = ring + i / 6 * Math.PI * 2, s = Math.sin(a); if ((s > 0) !== front) return; pd(P_('rj_drum', { lit: B.drums[i] > 0.4 ? 1 : 0 }, false), x + Math.cos(a) * 92, cy0 - 40 + s * 30, 0, 1.5 * (1 + B.drums[i] * 0.25), 1.5 * (1 + B.drums[i] * 0.25)); };
      ctx.strokeStyle = 'rgba(230,220,200,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, cy0 - 40, 92, 30, 0, Math.PI, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 6; i++) drum(i, false);
      pd(P_('rj_cloud', { f: Math.floor(t * 5), p2 }, fl), x, cy0 + 22, lean * 0.12, 1.5, 1.5);
      const bx = x + lean * 6, by2 = cy0 + 8;
      // arms: rest raised; a hit swings one down hard and it springs back
      const armBase = [-2.4, -0.75], hits = [an.armL || 0, an.armR || 0];
      for (const [i, s] of [[0, -1], [1, 1]]) {
        const rot = s < 0 ? armBase[0] - hits[0] * 0.7 : armBase[1] + hits[1] * 0.7;
        pd(P_('rj_arm', { p2 }, fl), bx + s * 26, by2 - 52, rot + Math.sin(t * 2 + i) * 0.06, 1.5, s < 0 ? -1.5 : 1.5);
      }
      pd(P_('rj_body', { p2 }, fl), bx, by2, lean * 0.15, 1.5, 1.5);
      pd(P_('rj_head', { mouth: (an.mouth || 0) > 0.2 || mn === 'taiko' ? 1 : 0, p2 }, fl), bx + lean * 4, by2 - 58 + Math.sin(t * 4) * 1.5, Math.sin(t * 1.7) * 0.08 + lean * 0.2, 1.5, 1.5);
      for (let i = 0; i < 6; i++) drum(i, true);
      if (p2 && Math.sin(t * 13) > 0.7) { ctx.strokeStyle = '#fff6a0'; ctx.lineWidth = 2; ctx.beginPath(); let px = x + rnd(-60, 60), py = cy0 - 90; ctx.moveTo(px, py); for (let k = 0; k < 4; k++) { px += rnd(-12, 12); py += 14; ctx.lineTo(px, py); } ctx.stroke(); }
    } else if (B.type === 'demonhands') {
      const lid = an.blink > 0 ? 4 : 0;
      // hands' shadows on the floor
      for (const H of B.hands) blob2(H.x, sy(H.y) + 10, 34 * (1 - H.z * 0.35), 12 * (1 - H.z * 0.35), 0.18 + (1 - H.z) * 0.15);
      blob2(x, y + 40, 46, 14, 0.25);
      const ey = y - 16 + Math.sin(t * 1.6) * 5;
      pd(P_('dh_eye', { p2 }, fl), x, ey, Math.sin(t * 0.9) * 0.05, 1.5 * (1 + Math.sin(t * 2.4) * 0.02), 1.5 * (1 - Math.sin(t * 2.4) * 0.02));
      const la = Math.atan2(-(hero.y - B.y), hero.x - B.x), ld = Math.min(1, hyp(hero.x - B.x, hero.y - B.y) / 200);
      pd(P_('dh_pupil', { p2 }, false), x + Math.cos(la) * 12 * ld, ey + 2 + Math.sin(la) * 10 * ld, 0, 1.5, 1.5);
      if (lid) pd(P_('dh_lid', { k: lid, p2 }, false), x, ey + 2, 0, 1.5, 1.5);
      for (const H of B.hands) {
        const hx = H.x, hy = sy(H.y) - H.z * 80, sc = 1.5 * (1 + H.z * 0.22);
        let rot = H.pose === 'point' ? Math.atan2(sy(hero.y) - hy, hero.x - hx) + Math.PI / 2 : Math.sin(t * 2 + H.s) * 0.08 + H.s * 0.15;
        pd(P_('dh_hand', { pose: H.pose, p2 }, fl), hx, hy, rot, H.s < 0 ? -sc : sc, sc);
      }
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------
  //  SKILLS (double tap)
  // ---------------------------------------------------------------
  function skillDmg(t, mult) {
    const isB = isBoss(t);
    let d = hero.s.atk * mult * (hero.buff.atk > 0 ? 1.5 : 1) * (hero.cryT > 0 ? 1.25 : 1) - t.def * 0.5;
    return Math.max(1, Math.round(d * (isB ? (t.dmgTake || 1) : 1)));
  }
  function skillHit(t, mult, fx, fy, power = 260, col = '#fff') {
    if (t.sub) return;   // under the floor / vanished
    if(!craftBusy&&!arenaAttackAllowed(t,'skill'))return;
    const dmg = skillDmg(t, mult);
    if (isBoss(t)) {
      if (t.dead || (t.alpha != null && t.alpha < 0.5)||hardRun&&t.intro>0) return;
      t.hp -= dmg;pfxImpact(t,col,power);if(!craftBusy)arenaEvent('skillHit',1,t); t.hurt = 0.15; popText(t.x + rnd(-14, 14), t.y + t.r + 10, '' + dmg, col, 20, 0.9);
      if (t.hp <= 0) { t.hp = 0; bossDefeated(t); }
      return;
    }
    if (t.dead) return;
    if (t.mod.stone && !t.awake) wakeStatue(t);
    t.hp -= dmg;pfxImpact(t,col,power);if(!craftBusy)arenaEvent('skillHit',1,t); t.hurt = 0.18; popText(t.x, t.y + 20, '' + dmg, col, 16, 0.8);
    const dx = t.x - fx, dy = t.y - fy, l = hyp(dx, dy) || 1; t.vx += dx / l * power / Math.max(0.6, t.mass); t.vy += dy / l * power / Math.max(0.6, t.mass);
    if (t.hp <= 0) killEnemy(t);
  }
  const targetsNear = (x, y, R) => { const L = enemies.filter(e => !e.dead && e.active && hyp(e.x - x, e.y - y) < R + e.r); for(const B of livingBosses())if(hyp(B.x-x,B.y-y)<R+B.r)L.push(B); return L; };
  function useSkill() {
    const h = hero, id = h?craftSkillId():save.skill, S = SKILLS[id];
    if (!S || !h || h.hp <= 0 || paused || (state !== 'play' && state !== 'boss') || transition) return;
    if (h.skCD > 0) { popText(h.x, h.y + 30, `${S.name} あと ${Math.ceil(h.skCD)}びょう`, '#ff9a8a', 13, 0.8); A.sfx('block'); return; }
    if(craftState().coffin>0)return;
    const craftWait=craftState().readyAt==null?0:craftState().clock-craftState().readyAt;craftState().readyAt=null;
    h.skCD = S.cd * (1 - (h.s.fx.skillcd || 0)); h.skFlash = 0.5; tutDone('skill');
    pfxCast(id);
    arenaSkillBegin(id);
    guildSkill(id);craftOnSkill(id,craftWait);popText(h.x, h.y + 46, S.name + '！', S.col, 17, 1);
    switch (id) {
      case 'shock':
        rings.push({ x: h.x, y: h.y, r: 10, max: 120, spd: 520, dmg: 0, w: 8, fx: true }); burst(h.x, h.y, 30, S.col, 300, 0.5); shake = Math.max(shake, 10); A.sfx('quake');
        for (const t of targetsNear(h.x, h.y, 110)) skillHit(t, 1.3, h.x, h.y, 420, S.col);
        break;
      case 'guard': h.guardT = 3; A.sfx('block'); break;
      case 'cry': h.cryT = 10; flash = 0.3; flashCol = '255,150,90'; A.sfx('buff'); break;
      case 'heal': { const hh = Math.min(h.s.maxHp - h.hp, Math.round(h.s.maxHp * 0.2)); h.hp += hh;craftOnHeal(Math.round(h.s.maxHp*.2),hh,'skill'); popText(h.x, h.y + 26, '+' + hh, '#6fd38a', 16, 1); burst(h.x, h.y, 20, S.col, 180); A.sfx('heal'); break; }
      case 'thunder': {
        const L = enemies.filter(e => !e.dead && e.active && hyp(e.x - h.x, e.y - h.y) < 280); for(const B of livingBosses())if(hyp(B.x-h.x,B.y-h.y)<280+B.r)L.push(B);
        L.sort((a, b) => hyp(a.x - h.x, a.y - h.y) - hyp(b.x - h.x, b.y - h.y));
        for (const t of L.slice(0, 3)) { anims.push({ kind: 'bolt', x: t.x, y: t.y, t: 0, dur: 0.4, frames: 1 }); skillHit(t, 1.6, t.x, t.y + 10, 0, S.col); if (!isBoss(t) && !t.dead) t.zap = Math.max(t.zap || 0, 0.6); }
        flash = 0.3; flashCol = '255,250,200'; A.sfx('boom'); break;
      }
      case 'whirl': h.whirlT = 1.8; h.whirlAcc = 0.3; A.sfx('magic2'); break;
      case 'barrier': h.barrierT = 8; A.sfx('magic2'); break;
      case 'frost':
        rings.push({ x: h.x, y: h.y, r: 10, max: 160, spd: 480, dmg: 0, w: 8, fx: true }); burst(h.x, h.y, 34, S.col, 320, 0.6); A.sfx('magic');
        for (const t of targetsNear(h.x, h.y, 150)) { skillHit(t, 0.8, h.x, h.y, 200, S.col); if (!isBoss(t) && !t.dead) t.zap = Math.max(t.zap || 0, 2.5); }
        for (const b of bullets) if (!b.pierce && hyp(b.x - h.x, b.y - h.y) < 150) { b.life = 0; burst(b.x, b.y, 4, S.col, 80, 0.3); }
        break;
      case 'meteor': {
        let tx = h.x + Math.cos(h.face) * 160, ty = h.y + Math.sin(h.face) * 160;
        if (boss && !boss.dead) { tx = boss.x; ty = boss.y; }
        else { const L = enemies.filter(e => !e.dead && e.active && hyp(e.x - h.x, e.y - h.y) < 360).sort((a, b) => hyp(a.x - h.x, a.y - h.y) - hyp(b.x - h.x, b.y - h.y)); if (L.length) { tx = L[0].x; ty = L[0].y; } }
        h.meteor = { x: tx, y: ty, t: 0 }; A.sfx('magic2'); break;
      }
      case 'sand': freezeT = Math.max(freezeT, 2); flash = 0.3; flashCol = '220,220,255'; A.sfx('warp'); break;
      case 'holy': h.holy = { n: 3, t: 10 }; flash = 0.3; flashCol = '255,240,170'; A.sfx('buff'); break;
    }
    arenaSkillEnd();
  }
  function updateSkill(dt) {
    const h = hero;
    if (h.skCD > 0) h.skCD -= dt; if (h.skFlash > 0) h.skFlash -= dt;
    if (h.guardT > 0) h.guardT -= dt; if (h.cryT > 0) h.cryT -= dt; if (h.barrierT > 0) h.barrierT -= dt;
    if (h.holy) { h.holy.t -= dt; if (h.holy.t <= 0) h.holy = null; }
    if (h.whirlT > 0) {
      h.whirlT -= dt; h.whirlAcc += dt;
      if (h.whirlAcc >= 0.3) { h.whirlAcc -= 0.3; for (const t of targetsNear(h.x, h.y, 85)) skillHit(t, 0.45, h.x, h.y, 160, '#b8f0d8'); A.sfx('hit'); }
    }
    if (h.meteor) {
      const M = h.meteor; M.t += dt;
      if (M.t >= 0.9) {
        pfxEmit('fire/meteor',M.x,M.y,300,.8);h.meteor = null; burst(M.x, M.y, 50, '#ff8a3a', 420, 0.8); burst(M.x, M.y, 20, '#ffe080', 260, 0.6); anims.push({ kind: 'poof', x: M.x, y: M.y, t: 0, dur: 0.4, frames: 5 });
        rings.push({ x: M.x, y: M.y, r: 10, max: 130, spd: 520, dmg: 0, w: 10, fx: true }); shake = Math.max(shake, 18); A.sfx('boom');
        for (const t of targetsNear(M.x, M.y, 120)) skillHit(t, 3, M.x, M.y, 420, '#ff9a5a');
      }
    }
  }

  // ---------------------------------------------------------------
  //  SURPRISE EVENTS
  // ---------------------------------------------------------------
  function updateEvents(dt) {
    const h = hero; if (!h) return;
    if (h.pw && h.pw.t > 0) { h.pw.t -= dt; if (h.pw.t <= 0) endPower(); }
    if (h.roul) { h.roul.t += dt; if (h.roul.t >= 1.2) { const k = h.roul.res; h.roul = null; applyPower(k); } }
    if (h.pw && h.pw.kind === 'clone') { (h.hist = h.hist || []).push([h.x, h.y, hyp(h.vx, h.vy)]); if (h.hist.length > 22) h.hist.shift(); cloneHits(); }
    for (const o of evs) {
      o.t = (o.t || 0) + dt;
      if (o.type === 'qbox') {
        if (!h.roul && h.hp > 0 && hyp(h.x - o.x, h.y - o.y) < 16 + h.r) { o.gone = true; openQBox(o); }
      } else if (o.type === 'star') {
        if (o.t < o.fall) continue;
        if (!o.landed) { o.landed = true; burst(o.x, o.y, 30, '#ffe680', 280, 0.7); shake = Math.max(shake, 6); A.sfx('chest'); }
        if (o.t > o.fall + 9) { o.gone = true; popText(o.x, o.y + 20, 'ほしが きえた…', '#c8c0ff', 13, 1); continue; }
        if (h.hp > 0 && hyp(h.x - o.x, h.y - o.y) < 18 + h.r) { o.gone = true; starLoot(o); }
      } else if (o.type === 'merchant') {
        const d = hyp(h.x - o.x, h.y - o.y);
        if (o.leave) { o.leave -= dt; if (o.leave <= 0) o.gone = true; continue; }
        if (!o.told && d < 170) { o.told = true; popText(o.x, o.y + 46, 'あやしい行商人', '#e0c8ff', 14, 1.6); }
        if (o.cool && d > 90) o.cool = false;
        if (!o.cool && !noMerchant && d < o.r + h.r + 6 && h.hp > 0 && state === 'play') { o.cool = true; openMerchant(o); }
        if (d < o.r + h.r && d > 0) { const nx = (h.x - o.x) / d, ny = (h.y - o.y) / d; h.x = o.x + nx * (o.r + h.r); h.y = o.y + ny * (o.r + h.r); }
      }
    }
    evs = evs.filter(o => !o.gone);
    if (state === 'play') {
      if (ev.starY != null && h.y > ev.starY) { ev.starY = null; dropStar(); }
      if (ev.paradeY != null && h.y > ev.paradeY) { ev.paradeY = null; startParade(); }
      const P = ev.parade;
      if (P && !P.done && !enemies.some(e => e.parade && !e.dead)) {
        P.done = true;
        if (P.killed >= P.total) paradeBonus(); else popText(h.x, h.y + 46, `だいこうしん：${P.killed}/${P.total}たい たおした`, '#fff', 13, 1.6);
      }
    }
    if (state === 'boss' && boss && !boss.dead && !(boss.intro > 0)) {
      ev.qT -= dt;
      if (ev.qT <= 0) {
        ev.qT = 60;
        if (!evs.some(o => o.type === 'qbox')) { const pt = arenaSpot(160); evs.push({ type: 'qbox', x: pt.x, y: pt.y, t: 0, pop: true }); burst(pt.x, pt.y, 26, '#c8b0ff', 240); popText(pt.x, pt.y + 34, 'ハテナばこ！', '#e0d0ff', 15, 1.4); A.sfx('summon'); }
      }
    }
  }
  // ハテナ箱: a roulette, then one surprise. The lower your HP, the better the odds of a big one.
  function openQBox(o) {
    const h = hero, low = h.hp < h.s.maxHp * 0.35, inBoss = state === 'boss';
    const W8 = { giant: low ? 3 : 1, bolt: low ? 3 : 1.6, clone: 1.5, bomb: 1.5, rush: inBoss ? 0.6 : 2, slip: low ? 0.4 : 0.9, mirror: low ? 0.3 : 0.7 };
    h.roul = { t: 0, res: wpick(W8) };
    burst(o.x, o.y, 30, '#c8b0ff', 260); A.sfx('chest');
  }
  function applyPower(k) {
    const h = hero, Q = QB[k]; if (!h || h.hp <= 0) return;
    endPower();
    popText(h.x, h.y + 46, Q.name + (Q.bad ? '' : '！'), Q.col, 18, 1.4);
    if (k === 'bolt') { zapAll(); return; }
    h.pw = { kind: k, t: Q.dur, max: Q.dur, n: k === 'bomb' ? 3 : 0 };
    if (k === 'giant') { h.r = HERO_R * 1.55; A.sfx('levelup'); flash = 0.4; flashCol = '255,180,120'; burst(h.x, h.y, 30, '#ff9a6a', 260); }
    else A.sfx(Q.bad ? 'block' : 'buff');
  }
  function endPower() { const h = hero; if (!h || !h.pw) return; if (h.pw.kind === 'giant') h.r = HERO_R; h.pw = null; h.hist = null; }
  function zapAll() {   // いなずま: every monster on screen is struck and numbed; the boss loses a slice of HP
    const h = hero; flash = 0.8; flashCol = '255,250,200'; shake = 16; A.sfx('boom');
    for (const e of enemies) {
      if (e.dead || (state === 'play' && Math.abs(e.y - h.y) > H * 0.75)) continue;
      anims.push({ kind: 'bolt', x: e.x, y: e.y, t: 0, dur: 0.4, frames: 1 });
      e.zap = 2.5; hazardHit(e, e.maxHp * 0.5 + h.s.atk, e.x, e.y + 10, 0);
    }
    for(const B of livingBosses()) {
      const d2 = Math.round(B.maxHp * 0.04); B.hp -= d2; B.hurt = 0.3;
      anims.push({ kind: 'bolt', x: B.x, y: B.y, t: 0, dur: 0.5, frames: 1 }); popText(B.x, B.y + B.r + 20, '' + d2, '#ffe14a', 24, 1);
      if (B.hp <= 0) { B.hp = 0; bossDefeated(B); }
    }
  }
  function heroBomb(x, y, src) {   // ばくだんもち: the hit goes off like a barrel (the hero is not hurt)
    const h = hero, P = h.pw; P.n--; if (P.n <= 0) endPower();
    burst(x, y, 40, '#ff9a3a', 380, 0.7); burst(x, y, 18, '#ffe080', 240, 0.5); rings.push({ x, y, r: 10, max: 95, spd: 450, dmg: 0, w: 6, fx: true });
    anims.push({ kind: 'poof', x, y, t: 0, dur: 0.4, frames: 5 }); shake = Math.max(shake, 14); A.sfx('boom');
    for (const e of enemies) if (e !== src && !e.dead && hyp(e.x - x, e.y - y) < 95 + e.r) hazardHit(e, h.s.atk * 2.2 - e.def * 0.5, x, y, 380);
    if (isBoss(src)) { const d2 = Math.max(1, Math.round(h.s.atk * 2.5 - src.def * 0.5)); src.hp -= d2; popText(x, y + 34, 'ドカン！ ' + d2, '#ff9a5a', 20, 1); }
  }
  function cloneHits() {   // ぶんしん: a copy follows your path a moment behind; its charges hurt too
    const h = hero, Hs = h.hist; if (!Hs || Hs.length < 22) return;
    const [cx, cy, sp] = Hs[0]; if (sp < RAM_MIN) return;
    const targets = enemies.filter(e => !e.dead && !e.sub); for(const B of livingBosses())if(!(B.alpha!=null&&B.alpha<.5))targets.push(B);
    for (const e of targets) {
      if ((e.cloneAt || 0) > globalT || hyp(e.x - cx, e.y - cy) > e.r + HERO_R) continue;
      e.cloneAt = globalT + 0.45;
      const isB = isBoss(e), dmg = Math.max(1, Math.round(ramDamage(e, sp, isB,false).dmg * 0.7 * (isB ? (e.dmgTake || 1) : 1)));
      e.hp -= dmg; e.hurt = 0.15; popText(e.x, e.y + 20, '' + dmg, '#9ad0ff', 16, 0.7); burst(e.x, e.y, 10, '#9ad0ff', 200, 0.4); A.sfx('hit');
      if (!isB) { const dx = e.x - cx, dy = e.y - cy, l = hyp(dx, dy) || 1; e.vx += dx / l * 300; e.vy += dy / l * 300; if (e.hp <= 0) killEnemy(e); }
      else if (e.hp <= 0) { e.hp = 0; bossDefeated(e); }
    }
  }
  function dropStar() {
    const h = hero, ty = Math.min(goalY - 300, h.y + rnd(240, 340)), tn = tunnelAt(ty);
    evs.push({ type: 'star', x: tn.cx + rnd(-0.25, 0.25) * tn.w, y: ty, t: 0, fall: 1.1 });
    banner = { a: 'ながれぼしが おちてきた！', b: 'SHOOTING STAR', t: 2 }; A.sfx('magic2');
  }
  function starLoot(o) {   // a shooting star always holds equipment: ◆ special or ★ masterwork
    flash = 0.4; flashCol = '255,240,160'; burst(o.x, o.y, 40, '#ffe680', 300, 0.8);
    let pool = dropPool(Math.random() < 0.3 ? 'rare' : 'fx'); if (!pool.length) pool = dropPool('lo');
    if (pool.length) giveLoot(pick(pool), o.x, o.y);
  }
  function startParade() {   // 魔物の大行進: a column of (weaker) monsters marches past; wipe it out for a bonus
    const h = hero, n = 10, y0 = Math.min(goalY - 280, h.y + H * 0.62);
    const keys = Object.keys(D.pool).filter(k => EN[k] && EN[k].spd > 0 && !['golem', 'lavagolem', 'archdemon', 'mimic'].includes(k));
    ev.parade = { total: n, killed: 0, done: false };
    for (let i = 0; i < n; i++) {
      const y = y0 + Math.floor(i / 2) * 44, tn = tunnelAt(y), lane = (i % 2 ? 1 : -1) * 0.17;
      const e = spawnEnemy(pick(keys.length ? keys : ['slime']), tn.cx + lane * tn.w, y, true);
      e.parade = e.march = true; e.lane = lane; e.spd = 120; e.hp = e.maxHp = Math.max(1, Math.round(e.maxHp * 0.6));
    }
    banner = { a: 'まものの だいこうしん！', b: 'MONSTER PARADE', t: 2.2 }; A.sfx('summon'); shake = Math.max(shake, 8);
  }
  function paradeBonus() {
    const h = hero, xp = Math.round(D.xp * 0.03);
    banner = { a: 'だいこうしんを ぜんめつさせた！', b: 'PERFECT', t: 2 };
    dropCoins(h.x, h.y + 40, Math.round(D.gp * 0.06)); gainExp(xp); popText(h.x, h.y + 60, `ボーナス +${xp} EXP`, '#9fd0ff', 15, 1.4);
    drops.push({ type: tierHeal(), x: h.x, y: h.y + 30, vx: 0, vy: 40, t: 0 }); A.sfx('levelup');
  }
  function openMerchant(o) {   // あやしい行商人: a mystery bag of equipment, or a random potion
    const h = hero, bag = Math.max(20, Math.round(D.gp * 0.3 / 10) * 10), med = Math.max(10, Math.round(D.gp * 0.05 / 10) * 10);
    paused = true; drag.down = false; h.vx = h.vy = 0;
    const leave = () => { paused = false; closePanel(); };
    const buyBag = () => {
      if (save.gold < bag) { A.sfx('block'); return; }
      save.gold -= bag; leave();
      const r = Math.random(), first = r < 0.1 ? 'rare' : r < 0.55 ? 'fx' : 'lo';   // only things you don't have yet
      let pool = []; for (const k of [first, 'fx', 'lo', 'rare']) { pool = dropPool(k).filter(e => !save.owned.includes(e.id)); if (pool.length) break; }
      if (pool.length) giveLoot(pick(pool), h.x, h.y);
      else { const back = Math.round(bag / 2); save.gold += back; toast(`もう もっている しなばかり… ${back} G かえってきた`, '#f2c14e'); }
      o.leave = 1.2; popText(o.x, o.y + 46, 'まいど あり… ひっひっ', '#e0c8ff', 13, 1.4);
    };
    const buyMed = () => {
      if (save.gold < med || (o.meds || 0) >= 2) { A.sfx('block'); return; }
      save.gold -= med; o.meds = (o.meds || 0) + 1;
      const hs = HEALS.filter(itemOpen), id = wpick({ [hs[hs.length - 1]]: 0.3, [hs[Math.max(0, hs.length - 2)]]: 0.2, power: 0.25, guard: 0.25 });   // the best heals you could buy now, or a buff
      gainItem(id); A.sfx('item');
      toast(`あやしいくすり → ${ITEMS[id].name}！`, '#6fd38a'); persist(); openMerchant(o);
    };
    openPanel('あやしい行商人', `
      <p>「ひっひっ… めずらしい しなが あるよ。<br>なにが でるかは おたのしみ…」</p>
      <dl class="stat" style="margin-top:10px">
        <dt>なぞの そうびぶくろ</dt><dd class="gold">${bag} G</dd>
        <dt>あやしい くすり（のこり${2 - (o.meds || 0)}）</dt><dd class="gold">${med} G</dd>
        <dt>もっている ゴールド</dt><dd class="gold">${save.gold} G</dd>
      </dl>
      <p style="color:var(--muted);font-size:13px;margin-top:8px">ふくろ：ぼろぼろの品・◆とくしゅこうかの品・★めいこうの品（まれ）のどれか<br>くすり：ハイポーション・エリクサー・ちからのくすり・まもりのくすりのどれか</p>`,
      [['ふくろを かう', buyBag, true], ['くすりを かう', buyMed], ['いらない', leave]]);
  }

  // ---------------------------------------------------------------
  //  BOSS AI
  // ---------------------------------------------------------------
  function bossUpdate(dt) {
    const B = boss, h = hero;
    if (B.dead) {
      const was = B.dead; B.dead += dt;
      for (const k of [0.15, 0.3, 0.45, 0.6]) if (was < k && B.dead >= k) { burst(B.x + rnd(-30, 30), B.y + rnd(-30, 30), 40, pick([B.col, '#fff', '#f2c14e']), 380, 1); shake = 16; }
      if (was < 1.2 && B.dead >= 1.2) { if (defRun) boss = null; else showClear(); }
      return;
    }
    if (RIG[B.type]) rigUpdate(B, dt);
    if (B.intro > 0) { B.intro -= dt; if (B.intro <= 0) minionWave(B, 2); return; }
    if (B.hurt > 0) B.hurt -= dt; if (B.hitCD > 0) B.hitCD -= dt;
    const dx = h.x - B.x, dy = h.y - B.y, ang = Math.atan2(dy, dx);
    const sp = (B.phase === 2 ? (B.rage || 1.3) : 1) * (B.pers === 'speed' ? 1.18 : B.pers === 'iron' ? 0.88 : 1);
    if (B.grow != null && B.grow >= 0 && B.phase === 2 && B.grow < 1) {   // archmage: grows to its full size when it gets angry
      B.grow = Math.min(1, B.grow + dt / 1.3); const k = B.grow, e = 1 + 2.7 * (k - 1) ** 3 + 1.7 * (k - 1) ** 2;   // ease out with a little overshoot
      B.sizeK = lerp(0.68, 1, e) * (1 + Math.sin(k * 40) * 0.03 * (1 - k)); B.r = Math.round(lerp(B.r1, B.r0, e));
      if (Math.random() < 0.4) burst(B.x + rnd(-30, 30), B.y + rnd(-30, 30), 3, '#c8b8ff', 160, 0.5);
    }
    if (B.phase === 1 && B.hp < B.maxHp * 0.5) {
      if (B.grow != null) { B.grow = 0; shake = 22; A.sfx('roar'); }
      B.phase = 2; B.pers = pick(Object.keys(PERS));   // its temper this time
      banner = { a: `いかりの オーラ…「${PERS[B.pers][0]}」がた！`, b: 'PHASE 2 ・ ' + PERS[B.pers][1], t: 2.2, boss: true };
      if (B.pers === 'berserk') { B.atk = Math.round(B.atk * 1.2); B.dmgTake = 1.25; B.moves2 = B.moves2.concat(['dash3']); }
      if (B.pers === 'iron') B.dmgTake = 0.75;
      flash = 0.6; flashCol = '255,60,60'; shake = 16; if (audioOn) FMusic.setRage(true); A.sfx('roar');
      minionWave(B, 3);
    }
    // reinforcements keep coming
    B.waveT -= dt;
    if (B.waveT <= 0) { B.waveT = B.phase === 2 ? (B.pers === 'summon' ? 4 : 6.5) : 9; minionWave(B, B.phase === 2 ? 3 : 2); }
    // home drift (back to its spot unless it is charging / jumping / walking)
    if (B.homeT > 0) B.homeT -= dt; else { B.hx = B.hardHomeX??arena.cx; B.hy = B.hardHomeY??arena.cy + 20; }
    const mvn = B.mv ? B.mv.name : '';
    if (!RIG_FREE[B.type] && !['charge', 'jump', 'dash3', 'stalk', 'split', 'firetrail', 'sidestep', 'thunderdash'].includes(mvn)) {
      const hx = B.hx + Math.sin(globalT * 0.7) * 16, hy = B.hy + Math.cos(globalT * 0.9) * 10;
      B.x = lerp(B.x, hx, 1 - Math.exp(-dt * 2.2)); B.y = lerp(B.y, hy, 1 - Math.exp(-dt * 2.2));
    }
    if (!B.mv) {
      B.cd -= dt * sp;
      if (B.cd <= 0) {
        const list = B.phase === 2 ? B.moves2 : B.moves;
        let m; do { m = pick(list); } while (m === B.last && list.length > 1);
        B.last = m; B.mv = { name: m, t: 0, a0: ang, n: 0, acc: 0 }; B.mt = 0;
        if (SIG[B.type] && m === SIG[B.type][0]) { B.callout = { s: `${B.name}の「${SIG[B.type][1]}」！`, t: 2 }; A.sfx('magic2'); }
      }
    } else runMove(B, dt * sp, ang, sp);
    if (B.callout) { B.callout.t -= dt; if (B.callout.t <= 0) B.callout = null; }
    if (darkT > 0) darkT -= dt;
    if (B.regen) {   // hydra: heals unless you keep hitting it
      B.regen.t -= dt; B.regen.acc += dt;
      while (B.regen.acc > 0.25) { B.regen.acc -= 0.25; const hh = Math.round(B.maxHp * 0.004); B.hp = Math.min(B.maxHp, B.hp + hh); popText(B.x + rnd(-20, 20), B.y + B.r + 20, '+' + hh, '#8af07a', 13, 0.6); }
      if (B.regen.t <= 0) B.regen = null;
    }
    if (B.decoys) {  // illusions: popping one costs nothing, only the real one takes damage
      for (const d of B.decoys) {
        d.t += dt; d.x = lerp(d.x, d.hx + Math.sin(globalT * 0.7 + d.ph) * 16, 1 - Math.exp(-dt * 2.2)); d.y = lerp(d.y, d.hy + Math.cos(globalT * 0.9 + d.ph) * 10, 1 - Math.exp(-dt * 2.2));
        if (!d.shot && d.t > 1.1) { d.shot = true; const a = Math.atan2(h.y - d.y, h.x - d.x); for (const o of [-0.25, 0, 0.25]) shoot(d.x, d.y, Math.cos(a + o), Math.sin(a + o), 190, B.atk * 0.8, 'orb'); }
        if (hyp(h.x - d.x, h.y - d.y) < B.r + h.r && h.hp > 0) { d.gone = true; burst(d.x, d.y, 30, '#c8b8ff', 240); popText(d.x, d.y + 30, 'まぼろし！', '#c8b8ff', 15, 0.9); A.sfx('warp'); const dx2 = h.x - d.x, dy2 = h.y - d.y, l2 = hyp(dx2, dy2) || 1; h.vx = dx2 / l2 * 420; h.vy = dy2 / l2 * 420; h.recoil = 0.3; }
        if (d.t > 7) d.gone = true;
      }
      B.decoys = B.decoys.filter(d => !d.gone); if (!B.decoys.length) B.decoys = null;
    }
    for (const sd of shades) {   // the shadow copies the hero, mirrored through the middle of the room
      sd.t += dt; sd.x = arena.cx * 2 - h.x; sd.y = arena.cy * 2 - h.y;
      if (sd.t > 0.6 && hyp(sd.x - h.x, sd.y - h.y) < h.r * 1.7) hurtHero(B.atk * 0.8, sd.x, sd.y, 420, 'shade');
    }
    shades = shades.filter(sd => sd.t < sd.life);
    for (const tw of twisters) {   // tornadoes drift after the hero, pull a little and fling on contact
      tw.t += dt; const dx2 = h.x - tw.x, dy2 = h.y - tw.y, d2 = hyp(dx2, dy2) || 1;
      tw.vx = lerp(tw.vx, dx2 / d2 * tw.spd, 1 - Math.exp(-dt * 0.9)); tw.vy = lerp(tw.vy, dy2 / d2 * tw.spd, 1 - Math.exp(-dt * 0.9));
      tw.x += tw.vx * dt; tw.y += tw.vy * dt; confine(tw, 0.8);
      if (d2 < 150 && h.recoil <= 0) { h.vx -= dx2 / d2 * 140 * dt; h.vy -= dy2 / d2 * 140 * dt; }
      if (d2 < tw.r + h.r * 0.6) hurtHero(B.atk * 0.8, tw.x, tw.y, 520, 'tornado');
    }
    twisters = twisters.filter(tw => tw.t < tw.life);
    // sweeping weapons
    for (const s of B.sweeps) {
      s.t += dt * sp;
      if (s.t < s.tele) continue;
      s.ang += s.vel * dt * sp; s.left -= Math.abs(s.vel * dt * sp);
      if (s.grow) s.len = Math.min(s.lmax, s.len + s.grow * dt * sp);
      const ex = B.x + Math.cos(s.ang) * s.len, ey = B.y + Math.sin(s.ang) * s.len;
      const dd = segDist(h.x, h.y, B.x + Math.cos(s.ang) * B.r * 0.6, B.y + Math.sin(s.ang) * B.r * 0.6, ex, ey);
      if (dd < s.w + h.r * 0.7) hurtHero(B.atk * 0.9, B.x, B.y, 420, 'sweep');
    }
    B.sweeps = B.sweeps.filter(s => s.left > 0);
    // ram / contact
    if (B.alpha != null && B.alpha < 0.5) return;   // mid-teleport: can't touch it
    const res = collide(B, 999);
    if (res && h.pw && h.pw.kind === 'giant') { res.kind = 'ram'; res.imp = Math.max(res.imp, PAD_MAX * h.s.ram); }
    if (res) {
      if (res.kind === 'ram' && B.hitCD <= 0 && B.shield) {   // giga crab's bubble dome
        B.hitCD = 0.3; popText(B.x, B.y + B.r + 20, 'あわの たてで はじかれた！', '#d0f0ff', 14, 0.8); A.sfx('block');
        h.vx = -res.nx * 460; h.vy = -res.ny * 460; h.recoil = 0.35; h.ramSafe = 0.6;
      } else if (res.kind === 'ram' && B.hitCD <= 0) {
        let { dmg, crit, tag } = ramDamage(B, res.imp, true);
        dmg = Math.max(1, Math.round(dmg * (B.dmgTake || 1) * (B.dizzy > 0 ? 1.3 : 1)));
        if (B.regen) { B.regen = null; popText(B.x, B.y + B.r + 44, 'さいせいを とめた！', '#fff', 15, 1); }
        guildRam(B);B.hp -= dmg; B.hurt = 0.15; B.hitCD = 0.2; charmHit(B); combo += comboStep(); comboT = 2.2 + (h.s.fx.chain || 0);
        if (h.pw && h.pw.kind === 'bomb') heroBomb(B.x - res.nx * B.r, B.y - res.ny * B.r, B);
        if (h.holy && h.holy.n > 0 && --h.holy.n <= 0) h.holy = null;
        if (tag) popText(B.x, B.y + B.r + 32, tag + '！', '#9fe8ff', 13, 0.6);
        if (h.s.fx.drain) h.hp = Math.min(h.s.maxHp, h.hp + h.s.maxHp * h.s.fx.drain / 3);
        popText(B.x + rnd(-14, 14), B.y + B.r + 10, (crit ? 'かいしん！ ' : '') + dmg, crit ? '#f2c14e' : '#fff', crit ? 26 : 20, 0.9);
        burst(B.x - res.nx * B.r, B.y - res.ny * B.r, crit ? 28 : 14, crit ? '#f2c14e' : '#fff', crit ? 360 : 240, 0.5);
        anims.push({ kind: 'spark', x: B.x - res.nx * B.r, y: B.y - res.ny * B.r, t: 0, dur: 0.28, frames: 4, big: true });
        hitStop = Math.max(hitStop, crit ? 0.12 : 0.06); shake = Math.max(shake, crit ? 16 : 10);
        // big recoil: the hero is flung far back and has to come in again
        const fl = 480 * (1 + (h.s.fx.recoil || 0) * 0.4); h.vx = -res.nx * fl; h.vy = -res.ny * fl; h.recoil = 0.45; h.ramSafe = 0.75;
        craftOnRam(B,dmg);A.sfx(crit ? 'crit' : 'bosshit');
        if (B.hp <= 0) { B.hp = 0; bossDefeated(); }
      } else if (res.kind === 'bump' && h.ramSafe <= 0) { const hp0 = h.hp; hurtHero(B.atk * 0.7, B.x, B.y, 380, 'boss'); if (h.hp < hp0) thornsHit(B); }
    }
  }
  // minions from this dungeon join the fight (capped so the room never floods)
  function minionWave(B, n) {
    const cap = B.phase === 2 ? (B.pers === 'summon' ? 7 : 5) : 3;
    const alive = enemies.filter(e => !e.dead).length;
    for (let i = 0; i < Math.min(n, cap - alive); i++) {
      let x, y;
      for (let k = 0; k < 12; k++) { const a = rnd(0, 6.28); x = arena.cx + Math.cos(a) * arena.R * 0.82; y = arena.cy + Math.sin(a) * arena.R * 0.82; if (hyp(x - hero.x, y - hero.y) > 200) break; }
      const e = spawnEnemy(wpick(Number.isInteger(B.hardStage)?DUNGEONS[B.hardStage].pool:D.pool), x, y, true);
      e.exp = Math.round(e.exp * 0.5); e.gold = Math.round(e.gold * 0.5);
      burst(x, y, 16, '#b48cff', 160);
    }
    if (n > 0) A.sfx('summon');
  }
  function segDist(px, py, ax, ay, bx, by) {
    const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy, k = clamp(((px - ax) * vx + (py - ay) * vy) / l2, 0, 1);
    return hyp(px - ax - vx * k, py - ay - vy * k);
  }
  function addSweep(B, opt) { B.sweeps.push(Object.assign({ t: 0, tele: 0.75, len: 180, w: 11, vel: 2.4, left: Math.PI * 2, ang: 0, col: '#fff' }, opt)); }

  // ---- floor blasts & beams (telegraphed, then they hurt) ----
  const ZCOL = { sand: '235,200,120', ink: '140,70,190', void: '200,80,255', thorn: '120,210,80', curse: '190,140,255', meteor: '255,120,50', ice: '150,225,255', bolt: '255,240,120', poison: '150,230,60', water: '90,170,255', mine: '255,90,60', beam: '255,80,160', holy: '255,240,170', blast: '255,120,50', confetti: '255,120,220' };
  function addCircle(x, y, r, tele, dmg, kind, after) { zones.push({ type: 'circle', x, y, r, tele, dmg, kind, t: 0, after }); }
  function addBeam(B, ang, opt) { zones.push(Object.assign({ type: 'beam', boss: B, ang, len: arena.R * 2.2, w: 16, tele: 0.8, act: 0.45, vel: 0, t: 0, dmg: B.atk, kind: 'beam', hit: false }, opt)); }
  function updateZones(dt) {
    const h = hero;
    for (const z of zones) {
      z.t += dt;
      if (z.type === 'patch') {   // lingers on the floor: webs, ice, poison, fire, quicksand
        const d = hyp(h.x - z.x, h.y - z.y);
        if (d < z.r + h.r * 0.3 && h.hp > 0 && !craftFloorImmune()) {
          if (z.kind === 'web') h.slow = Math.max(h.slow, 0.15);
          if (z.kind === 'ice') { h.gnd = h.gnd || {}; h.gnd.ice = 1; }
          if (z.dmg && (z.kind !== 'sand' || d < z.core)) hurtHero(z.dmg, z.x, z.y, 160, 'patch:' + z.kind);
        }
        if (!craftFloorImmune()&&z.pull && d < z.pr && d > 4 && h.recoil <= 0) { h.vx += (z.x - h.x) / d * z.pull * dt; h.vy += (z.y - h.y) / d * z.pull * dt; }
        z.dead = z.t > z.life;
        continue;
      }
      if (z.type === 'seg') {
        if (z.t >= z.tele && !z.fired) { z.fired = true; if (z.dmg) A.sfx('boom'); shake = Math.max(shake, 4); }
        if (z.fired && z.dmg && z.t < z.tele + z.act && segDist(h.x, h.y, z.x, z.y, z.x2, z.y2) < z.w + h.r * 0.55) hurtHero(z.dmg, h.x, h.y - 10, 380, 'zone:' + z.kind);
        z.dead = z.t > z.tele + z.act;
        continue;
      }
      if (z.type === 'doom') {   // everything outside the safe circles goes off
        if (z.t >= z.tele && !z.fired) {
          z.fired = true; flash = 0.7; flashCol = '255,60,140'; shake = 22; A.sfx('boom');
          if (!z.safe.some(s2 => hyp(h.x - s2.x, h.y - s2.y) < s2.r)) hurtHero(z.dmg, arena.cx, arena.cy, 500, 'zone:doom');
        }
        z.dead = z.t > z.tele + 0.4;
        continue;
      }
      if (z.type === 'cone') {   // gorgon's gaze: a wedge from the boss; inside it when it fires = petrified
        if (z.src && !z.fired && (z.src.dead || (z.src.st !== 'wind' && z.src.st !== 'gaze'))) { z.dead = true; continue; }   // hit the basilisk and the stare is broken
        if (z.boss) { const M = mouthOf(z.boss); z.x = M.x; z.y = M.y; }   // from her eyes
        if (z.track && z.t < z.tele - 0.3) { const want = Math.atan2(h.y - z.y, h.x - z.x); let da = ((want - z.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI; z.ang += clamp(da, -z.track * dt, z.track * dt); }
        if (z.t >= z.tele && !z.fired) {
          z.fired = true; flash = 0.45; flashCol = '200,255,170'; A.sfx('boom');
          const a = Math.atan2(h.y - z.y, h.x - z.x), da = Math.abs(((a - z.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          if (da < z.spread && h.hp > 0 && hyp(h.x - z.x, h.y - z.y) < z.len + h.r) { hurtHero(z.dmg, z.x, z.y, 120, 'zone:gaze'); stunHero(z.stun || 1.1, 'stone'); }
        }
        z.dead = z.t > z.tele + z.act;
        continue;
      }
      if (z.type === 'shrink') {  // the edge of the world closes in; outside the ring hurts and pushes you back in
        const T1 = z.tele, T2 = T1 + z.close, T3 = T2 + z.hold, T4 = T3 + z.open;
        z.r = z.t < T1 ? z.r0 : z.t < T2 ? lerp(z.r0, z.r1, 1 - (1 - (z.t - T1) / z.close) ** 2) : z.t < T3 ? z.r1 : lerp(z.r1, z.r0, (z.t - T3) / z.open);
        const dx = h.x - arena.cx, dy = h.y - arena.cy, d = hyp(dx, dy) || 1;
        if (z.t >= T1 && z.t < T3 && d > z.r - h.r * 0.3 && h.hp > 0) {
          hurtHero(z.dmg, h.x + dx / d * 40, h.y + dy / d * 40, 420, 'zone:collapse');
          if (d > z.r && h.recoil <= 0) { h.vx -= dx / d * 600 * dt; h.vy -= dy / d * 600 * dt; }
        }
        z.dead = z.t > T4;
        continue;
      }
      if (z.type === 'circle') {
        if (!z.fired && z.t >= z.tele) {
          z.fired = true;
          if (hyp(h.x - z.x, h.y - z.y) < z.r + h.r * 0.4) hurtHero(z.dmg, z.x, z.y, 360, 'zone:' + z.kind);
          burst(z.x, z.y, 18, `rgb(${ZCOL[z.kind]})`, 260, 0.5); shake = Math.max(shake, 5);
          if (z.after) z.after(z);
        }
        z.dead = z.t > z.tele + 0.3;
      } else {
        if (z.boss) { const M = mouthOf(z.boss); z.x = M.x; z.y = M.y; }   // beams come out of the eye / mouth
        if (z.hand) { z.x = z.hand.x; z.y = z.hand.y + z.hand.z * 80 + 20; }
        if (z.track) {   // a gaze that turns after the hero at a limited speed
          const want = Math.atan2(h.y - z.y, h.x - z.x); let da = ((want - z.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          z.ang += clamp(da, -z.track * dt, z.track * dt);
        }
        if (z.t >= z.tele) {
          z.ang += z.vel * dt;
          const ex = z.x + Math.cos(z.ang) * z.len, ey = z.y + Math.sin(z.ang) * z.len;
          if (segDist(h.x, h.y, z.x, z.y, ex, ey) < z.w + h.r * 0.55) hurtHero(z.dmg, h.x - Math.cos(z.ang + 1.57) * 10, h.y - Math.sin(z.ang + 1.57) * 10, 380, 'beam');
          if (!z.sfx) { z.sfx = true; A.sfx('boom'); shake = Math.max(shake, 6); }
        }
        z.dead = z.t > z.tele + z.act;
      }
    }
    zones = zones.filter(z => !z.dead);
  }
  function arenaSpot(minFromHero = 0) {
    for (let k = 0; k < 20; k++) {
      const a = rnd(0, 6.28), r = Math.sqrt(Math.random()) * (arena.R - 50);
      const x = arena.cx + Math.cos(a) * r, y = arena.cy + Math.sin(a) * r;
      if (hyp(x - hero.x, y - hero.y) >= minFromHero) return { x, y };
    }
    return { x: arena.cx, y: arena.cy };
  }

  // where a boss's shots come out: its mouth (or eye) as last drawn, else its centre. i = which head (breath3)
  function mouthOf(B, i = 0) {
    const m = B.mouths;
    if (!m || !m.length || globalT - (B.mouthT || -9) > 0.3) return { x: B.x, y: B.y, at: false };
    const p = m[clamp(i, 0, m.length - 1)];
    return { x: p.x, y: p.y, at: true };
  }
  const aimFrom = p => Math.atan2(hero.y - p.y, hero.x - p.x);
  function runMove(B, dt, ang, sp) {
    const mv = B.mv; mv.t += dt;
    const done = cd => {
      B.mv = null; B.cd = cd; B.tele = null;
      if (B.pers === 'barrage' && B.phase === 2 && !B.dead) { const n = 14, off = rnd(0, 1); for (let i = 0; i < n; i++) { const a = (i + off) / n * Math.PI * 2; shoot(B.x, B.y, Math.cos(a), Math.sin(a), 115, B.atk * 0.8, 'orb'); } }   // だんまく
    };
    const name = mv.name.split(':')[0], arg = mv.name.split(':')[1];
    const bc = B.col, p2 = B.phase === 2;
    if (RIG[B.type] && rigMove(B, dt, ang, name, arg)) return;
    switch (name) {
      case 'ring': case 'ringaimed':
        if (mv.t > 0.55 && !mv.n) {
          mv.n = 1; const n = B.type === 'kingslime' ? 14 : 20, off = rnd(0, 1);
          for (let i = 0; i < n; i++) { const a = (i + off) / n * Math.PI * 2; shoot(B.x, B.y, Math.cos(a), Math.sin(a), 130, B.atk, 'orb'); }
          A.sfx('boom');
          if (name === 'ringaimed') for (const o of [-0.2, 0, 0.2]) shoot(B.x, B.y, Math.cos(ang + o), Math.sin(ang + o), 260, B.atk, 'fire');
        }
        if (mv.t > 1.2) done(1.2);
        break;
      case 'triple':   // three quick rings, each twisted half a step
        if (mv.t > 0.4 + mv.n * 0.32 && mv.n < 3) {
          const n = 16; for (let i = 0; i < n; i++) { const a = (i + mv.n * 0.5) / n * Math.PI * 2 + mv.a0; shoot(B.x, B.y, Math.cos(a), Math.sin(a), 125 + mv.n * 15, B.atk, 'orb'); }
          mv.n++; A.sfx('magic');
        }
        if (mv.t > 1.8) done(1.2);
        break;
      case 'gapring': {  // a dense ring with one gap: find it and slip through
        if (mv.t > 0.5 + mv.n * 0.75 && mv.n < 2) {
          const n = 32, gapAt = (mv.gap = mv.n === 0 ? rnd(0, 32) : mv.gap + 8) % n;
          for (let i = 0; i < n; i++) { const di = Math.abs(((i - gapAt + n * 1.5) % n) - n / 2); if (di < 2.6) continue; const a = i / n * Math.PI * 2; shoot(B.x, B.y, Math.cos(a), Math.sin(a), 105, B.atk, 'orb', 4.5); }
          mv.n++; A.sfx('boom');
        }
        if (mv.t > 2.1) done(1.2);
        break;
      }
      case 'aimed3': case 'aimed5': case 'rocks': {
        const n = name === 'aimed3' ? 3 : 5, waves = name === 'rocks' ? 3 : 2;
        if (mv.t > 0.45 + mv.n * 0.45 && mv.n < waves) {
          mv.n++;
          const M = name === 'rocks' ? { x: B.x, y: B.y } : mouthOf(B), a0 = name === 'rocks' ? ang : aimFrom(M);
          for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * 0.22; shoot(M.x, M.y, Math.cos(a), Math.sin(a), name === 'rocks' ? 220 : 240, B.atk, name === 'rocks' ? 'rock' : 'fire'); }
          A.sfx('magic');
        }
        if (mv.t > 0.6 + waves * 0.45) done(1.1);
        break;
      }
      case 'spiral': case 'spiral3': {
        const arms = name === 'spiral3' ? 3 : 2, dur = 2.6;
        if (mv.t > 0.4 && mv.t < 0.4 + dur) {
          mv.acc += dt;
          while (mv.acc > 0.1) { mv.acc -= 0.1; mv.n++; const M = mouthOf(B); for (let k = 0; k < arms; k++) { const a = mv.a0 + mv.n * 0.32 + k * Math.PI * 2 / arms; shoot(M.x, M.y, Math.cos(a), Math.sin(a), 135, B.atk, 'orb', 3.5); } }
        }
        if (mv.t > dur + 0.8) done(1.2);
        break;
      }
      case 'wave': {   // three wobbling streams
        if (mv.t > 0.4 && mv.t < 2.2) {
          mv.acc += dt;
          while (mv.acc > 0.09) { mv.acc -= 0.09; mv.n++; const w = Math.sin(mv.n * 0.55) * 0.38; const M = mouthOf(B); for (const o of [-0.7, 0, 0.7]) { const a = mv.a0 + o + w; shoot(M.x, M.y, Math.cos(a), Math.sin(a), 175, B.atk, 'orb', 3.5); } }
        }
        if (mv.t > 2.6) done(1.2);
        break;
      }
      case 'homing':   // slow seekers that curve after the hero
        if (mv.t > 0.5 && !mv.n) {
          mv.n = 1; const n = p2 ? 7 : 5;
          const M = mouthOf(B); for (let i = 0; i < n; i++) { const a = ang + Math.PI + (i - (n - 1) / 2) * 0.5; const b = { x: M.x, y: M.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, r: 9, dmg: B.atk, kind: 'homing', life: 4.6, t: 0 }; bullets.push(b); }
          A.sfx('magic2');
        }
        if (mv.t > 1.3) done(1.3);
        break;
      case 'rain': {   // telegraphed floor blasts: around the hero + all over the room
        if (!mv.n) {
          mv.n = 1; const n = p2 ? 11 : 8;
          for (let i = 0; i < n; i++) {
            const near = i < 3, pt = near ? { x: hero.x + rnd(-70, 70), y: hero.y + rnd(-70, 70) } : arenaSpot();
            addCircle(pt.x, pt.y, arg === 'bolt' ? 38 : 46, 0.95 + i * 0.09, B.atk, arg);
          }
        }
        if (mv.t > 2.3) done(1.1);
        break;
      }
      case 'mines':    // bombs that burst into small rings
        if (!mv.n) {
          mv.n = 1;
          for (let i = 0; i < (p2 ? 9 : 7); i++) { const pt = arenaSpot(90); addCircle(pt.x, pt.y, 32, 1.5 + i * 0.12, B.atk, 'mine', z => { for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + rnd(0, 1); shoot(z.x, z.y, Math.cos(a), Math.sin(a), 140, B.atk, 'fire', 1.6); } }); }
          A.sfx('magic');
        }
        if (mv.t > 2.6) done(1.1);
        break;
      case 'laser': case 'laser3':   // aimed beams across the whole room
        if (!mv.n) { mv.n = 1; const aB = aimFrom(mouthOf(B)); for (const o of name === 'laser3' ? [-0.38, 0, 0.38] : [0]) addBeam(B, aB + o, { tele: 0.85, act: 0.5, w: 15, boss: B }); }
        if (mv.t > 1.6) done(1.1);
        break;
      case 'cross': {  // four beams that slowly rotate: walk around with them
        if (!mv.n) { mv.n = 1; const v = (Math.random() < 0.5 ? 1 : -1) * (p2 ? 0.7 : 0.55); for (let k = 0; k < 4; k++) addBeam(B, mv.a0 + Math.PI / 4 + k * Math.PI / 2, { tele: 1.0, act: 2.8, w: 12, vel: v, boss: B }); }
        if (mv.t > 4) done(1.2);
        break;
      }
      case 'sweep':   // club / sword swung all the way round
        if (!mv.n) { mv.n = 1; addSweep(B, { ang: ang + Math.PI * 0.75, vel: (Math.random() < 0.5 ? 1 : -1) * 2.5, len: 170, w: 13, left: Math.PI * 1.7, col: B.wcol || '#c99a5a', kind: 'club', own: !B3HAS(B.type) && (B.type === 'cyclops' || !!(WR[B.type] || R3[B.type])) }); }
        if (mv.t > 2.6) done(1.1);
        break;
      case 'tentacles': {   // kraken: four tentacles swing round together
        if (!mv.n) { mv.n = 1; const v = (Math.random() < 0.5 ? 1 : -1) * (p2 ? 1.9 : 1.6); for (let k = 0; k < 4; k++) addSweep(B, { ang: mv.a0 + Math.PI / 4 + k * Math.PI / 2, vel: v, len: 195, w: 14, left: Math.PI * 1.6, col: B.wcol || '#a85ad8', kind: 'tentacle', tele: 0.9 }); }
        if (mv.t > 4) done(1.1);
        break;
      }
      case 'clock': {       // clock hands: a long slow hour hand + a fast short minute hand
        if (!mv.n) { mv.n = 1; addSweep(B, { ang: mv.a0 + Math.PI, vel: 1.1, len: 230, w: 13, left: Math.PI * 1.4, col: '#f2c14e', kind: 'blade', tele: 0.9 }); addSweep(B, { ang: mv.a0 + Math.PI / 2, vel: -3.4, len: 140, w: 10, left: Math.PI * 4, col: '#ffe9a0', kind: 'blade', tele: 0.9 }); }
        if (mv.t > 4.6) done(1.1);
        break;
      }
      case 'breath3': {     // cerberus: three heads breathe fire at once, sweeping
        if (mv.t < 0.55) { mv.dir = mv.dir || (Math.random() < 0.5 ? 1 : -1); mv.a0 = ang - 0.5 * mv.dir; B.tele = ang; }
        else if (mv.t < 2.3) {
          B.tele = null; mv.acc += dt;
          const a = mv.a0 + (mv.t - 0.55) / 1.75 * 1.0 * mv.dir;
          while (mv.acc > 0.05) { mv.acc -= 0.05; const nm = (B.mouths || []).length, c0 = Math.max(0, Math.round((nm - 1) / 2) - 1); [-0.85, 0, 0.85].forEach((o, j) => { const M = mouthOf(B, nm >= 3 ? c0 + j : 0), aa = a + o + rnd(-0.1, 0.1), off = M.at ? 6 : B.r; shoot(M.x + Math.cos(aa) * off, M.y + Math.sin(aa) * off, Math.cos(aa), Math.sin(aa), 270, B.atk, 'flame', 1.1); }); }
        } else done(1.1);
        break;
      }
      case 'scythe':
        if (!mv.n) { mv.n = 1; addSweep(B, { ang: ang + Math.PI, vel: 2.8, len: 190, w: 10, left: Math.PI * 2.3, col: '#d8c8ff', kind: 'scythe', own: B.type === 'lich' }); }
        if (mv.t > 2.8) done(1.1);
        break;
      case 'tail':
        if (!mv.n) { mv.n = 1; addSweep(B, { ang: ang + Math.PI, vel: (Math.random() < 0.5 ? 1 : -1) * 3.1, len: 175, w: 14, left: Math.PI * 2, col: B.wcol || '#ff8a4a', kind: 'tail' }); }
        if (mv.t > 2.6) done(1.1);
        break;
      case 'twin':
        if (!mv.n) { mv.n = 1; const v = (Math.random() < 0.5 ? 1 : -1) * 2.2; for (const o of [0, Math.PI]) addSweep(B, { ang: ang + o, vel: v, len: 200, w: 10, left: Math.PI * 2, col: B.wcol || '#ff5aa0', kind: 'blade', own: !o && !B3HAS(B.type) && !!(WR[B.type] || R3[B.type]) }); }
        if (mv.t > 3.6) done(1.1);
        break;
      case 'charge': case 'dash3': case 'firetrail': {   // rush to the wall (dash3 = three times in a row; firetrail leaves burning ground)
        const total = name === 'charge' ? 1 : 3;
        if (mv.ph == null) { mv.ph = 'aim'; mv.pt = 0; mv.k = 0; }
        mv.pt += dt;
        if (mv.ph === 'aim') { mv.a0 = Math.atan2(hero.y - B.y, hero.x - B.x); B.tele = mv.a0; if (mv.pt > (mv.k ? 0.42 : 0.7)) { mv.ph = 'go'; mv.pt = 0; B.tele = null; B.vx = Math.cos(mv.a0) * 520; B.vy = Math.sin(mv.a0) * 520; A.sfx('magic'); } }
        else if (mv.ph === 'go') {
          B.x += B.vx * dt; B.y += B.vy * dt;
          if (name === 'firetrail') { mv.acc += dt; if (mv.acc > 0.07) { mv.acc = 0; zones.push({ type: 'patch', kind: 'burn', x: B.x, y: B.y, r: 26, life: p2 ? 5 : 4, dmg: B.atk * 0.5, t: 0 }); } }
          const ddx = B.x - arena.cx, ddy = B.y - arena.cy, d = hyp(ddx, ddy);
          if (d > arena.R - B.r) {
            B.x = arena.cx + ddx / d * (arena.R - B.r); B.y = arena.cy + ddy / d * (arena.R - B.r); B.vx = B.vy = 0;
            shake = 18; A.sfx('quake'); burst(B.x, B.y, 20, '#ccc', 200);
            for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; shoot(B.x, B.y, Math.cos(a), Math.sin(a), 140, B.atk, 'rock', 2); }
            mv.k++; mv.ph = mv.k >= total ? 'rest' : 'aim'; mv.pt = 0;
          }
        } else if (mv.pt > 0.9) done(1.2);
        break;
      }
      case 'stalk':    // walks after the hero for a while (touching it hurts)
        if (mv.t < 2.8) { const s2 = p2 ? 115 : 85; B.x += Math.cos(ang) * s2 * dt; B.y += Math.sin(ang) * s2 * dt; const ddx = B.x - arena.cx, ddy = B.y - arena.cy, d = hyp(ddx, ddy); if (d > arena.R - B.r) { B.x = arena.cx + ddx / d * (arena.R - B.r); B.y = arena.cy + ddy / d * (arena.R - B.r); } }
        else { B.hx = B.x; B.hy = B.y; B.homeT = 2; done(0.8); }
        break;
      case 'quake':    // three stomps, each sends a shockwave
        if (mv.t > 0.45 + mv.n * 0.55 && mv.n < 3) { mv.n++; rings.push({ x: B.x, y: B.y, r: B.r, max: 300, spd: 320, dmg: B.atk, w: 13 }); shake = 14; A.sfx('quake'); }
        if (mv.t > 2.2) done(1.1);
        break;
      case 'warp':     // vanish, reappear somewhere else and fire a ring
        if (mv.t < 0.4) B.alpha = 1 - mv.t / 0.4;
        else if (!mv.n) { mv.n = 1; const pt = arenaSpot(170); B.x = B.hx = pt.x; B.y = B.hy = pt.y; B.homeT = 4; burst(B.x, B.y, 20, bc, 200); }
        else if (mv.t < 0.75) B.alpha = (mv.t - 0.4) / 0.35;
        else if (mv.n === 1) { mv.n = 2; B.alpha = 1; const n = 18; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; shoot(B.x, B.y, Math.cos(a), Math.sin(a), 140, B.atk, 'orb'); } A.sfx('warp'); }
        else if (mv.t > 1.4) { B.alpha = 1; done(1); }
        break;
      case 'jump':     // leap onto the hero's position, shockwave on landing
        if (mv.n === 0) { B.z = Math.min(1, mv.t / 0.35); mv.tx = lerp(mv.tx || hero.x, hero.x, 0.15); mv.ty = lerp(mv.ty || hero.y, hero.y, 0.15); if (mv.t > 1.1) { mv.n = 1; mv.t1 = mv.t; } }
        else if (mv.n === 1) {
          const k = Math.min(1, (mv.t - mv.t1) / 0.3); B.x = lerp(B.x, mv.tx, k); B.y = lerp(B.y, mv.ty, k); B.z = 1 - k;
          if (k >= 1) { mv.n = 2; B.z = 0; rings.push({ x: B.x, y: B.y, r: B.r * 0.6, max: 130, spd: 280, dmg: B.atk, w: 12 }); shake = 18; A.sfx('quake'); burst(B.x, B.y, 26, bc, 260); }
        } else if (mv.t - mv.t1 > 1.1) { B.hx = B.x; B.hy = B.y; B.homeT = 1.5; done(0.9); }
        break;
      case 'breath':   // sweeping cone of fire
        if (mv.t < 0.5) { mv.a0 = ang - 0.9 * (mv.dir = mv.dir || (Math.random() < 0.5 ? 1 : -1)); B.tele = ang; }
        else if (mv.t < 2.1) {
          B.tele = null; mv.acc += dt;
          const a = mv.a0 + (mv.t - 0.5) / 1.6 * 1.8 * mv.dir;
          while (mv.acc > 0.035) { mv.acc -= 0.035; const aa = a + rnd(-0.12, 0.12), M = mouthOf(B), off = M.at ? 6 : B.r; shoot(M.x + Math.cos(aa) * off, M.y + Math.sin(aa) * off, Math.cos(aa), Math.sin(aa), 280, B.atk, 'flame', 1.2); }
        } else done(1.1);
        break;
      case 'fireball':
        if (mv.t > 0.5 && mv.n < (p2 ? 3 : 2) && mv.t > 0.5 + mv.n * 0.4) { mv.n++; const M = mouthOf(B), a = aimFrom(M); bullets.push({ x: M.x, y: M.y, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, r: 14, dmg: B.atk, kind: 'big', life: 5, t: 0, fuse: 1.2 }); A.sfx('magic'); }
        if (mv.t > 1.8) done(1.1);
        break;
      case 'summon':
        if (!mv.n) { mv.n = 1; minionWave(B, 2); }
        if (mv.t > 1) done(1.2);
        break;
      // ================= signature techniques =================
      case 'split':        // king slime: leap onto you and burst into little slimes
        if (mv.n === 0) { B.z = Math.min(1, mv.t / 0.35); mv.tx = lerp(mv.tx || hero.x, hero.x, 0.15); mv.ty = lerp(mv.ty || hero.y, hero.y, 0.15); if (mv.t > 1.0) { mv.n = 1; mv.t1 = mv.t; } }
        else if (mv.n === 1) {
          const k = Math.min(1, (mv.t - mv.t1) / 0.3); B.x = lerp(B.x, mv.tx, k); B.y = lerp(B.y, mv.ty, k); B.z = 1 - k;
          if (k >= 1) {
            mv.n = 2; B.z = 0; rings.push({ x: B.x, y: B.y, r: B.r * 0.6, max: 150, spd: 300, dmg: B.atk, w: 12 }); shake = 18; A.sfx('quake'); burst(B.x, B.y, 30, bc, 280);
            const n = Math.min(p2 ? 4 : 3, 7 - enemies.filter(e => !e.dead).length);
            for (let i = 0; i < n; i++) { const a = i / Math.max(1, n) * 6.28 + rnd(0, 1); const e = spawnEnemy('slime', B.x + Math.cos(a) * 70, B.y + Math.sin(a) * 70, true); e.exp = Math.round(e.exp * 0.5); e.gold = Math.round(e.gold * 0.5); e.vx = Math.cos(a) * 200; e.vy = Math.sin(a) * 200; }
          }
        } else if (mv.t - mv.t1 > 1.1) { B.hx = B.x; B.hy = B.y; B.homeT = 1.5; done(1); }
        break;
      case 'roots': {      // treant: roots burst out of the floor in lines toward you; caught = slowed
        const lines = p2 ? [-0.5, 0, 0.5] : [0];
        if (mv.t > 0.35 && mv.n < 9 && mv.t > 0.35 + mv.n * 0.11) {
          mv.n++;
          for (const o of lines) { const a = mv.a0 + o, x = B.x + Math.cos(a) * (B.r + mv.n * 38), y = B.y + Math.sin(a) * (B.r + mv.n * 38); if (hyp(x - arena.cx, y - arena.cy) < arena.R - 20) addCircle(x, y, 30, 0.55, B.atk, 'thorn', z => { if (hyp(hero.x - z.x, hero.y - z.y) < z.r + hero.r * 0.4) hero.slow = 1.6; }); }
        }
        if (mv.t > 2.4) done(1.1);
        break;
      }
      case 'bombs':        // goblin king: lobbed bombs; the landing spot is marked
        if (mv.t > 0.4 && mv.n < (p2 ? 5 : 3) && mv.t > 0.4 + mv.n * 0.28) {
          mv.n++; const tx = hero.x + hero.vx * 0.5 + rnd(-60, 60), ty = hero.y + hero.vy * 0.5 + rnd(-60, 60), d0 = hyp(tx - B.x, ty - B.y) || 1, spd = 300;
          addCircle(tx, ty, 54, d0 / spd + 0.7, B.atk, 'mine', z => { for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; shoot(z.x, z.y, Math.cos(a), Math.sin(a), 150, B.atk, 'fire', 1.4); } A.sfx('boom'); });
          bullets.push({ x: B.x, y: B.y, vx: 0, vy: 0, r: 8, dmg: 0, kind: 'bomb', life: 9, t: 0, dest: { x: tx, y: ty }, spd, d0, harmless: true, onLand: () => {} });
          A.sfx('magic');
        }
        if (mv.t > 2.6) done(1.1);
        break;
      case 'webnet':       // spider queen: web bombs that leave sticky patches on the floor
        if (mv.t > 0.4 && mv.n < (p2 ? 5 : 3) && mv.t > 0.4 + mv.n * 0.3) {
          mv.n++; const tx = hero.x + rnd(-70, 70), ty = hero.y + rnd(-70, 70), d0 = hyp(tx - B.x, ty - B.y) || 1;
          bullets.push({ x: B.x, y: B.y, vx: 0, vy: 0, r: 9, dmg: 0, kind: 'web', life: 9, t: 0, dest: { x: tx, y: ty }, spd: 320, d0, harmless: true, onLand: b => { zones.push({ type: 'patch', kind: 'web', x: b.x, y: b.y, r: 58, life: 7, t: 0 }); burst(b.x, b.y, 14, '#e8f0ff', 160); } });
          A.sfx('magic2');
        }
        if (mv.t > 1.6 && mv.n2 == null) { mv.n2 = 1; for (const o of [-0.2, 0, 0.2]) shoot(B.x, B.y, Math.cos(ang + o), Math.sin(ang + o), 230, B.atk, 'orb'); }
        if (mv.t > 2.4) done(1.1);
        break;
      case 'soulstorm': {  // lich: souls pour in from the walls toward it; find the gap
        const waves = p2 ? 2 : 1;
        if (mv.t > 0.5 + mv.n * 1.1 && mv.n < waves) {
          const n = 30, gap = rnd(0, n), sw = mv.n % 2 ? 0.5 : -0.5; mv.n++;
          for (let i = 0; i < n; i++) {
            const di = Math.abs(((i - gap + n * 1.5) % n) - n / 2); if (di < 2.2) continue;
            const a = i / n * Math.PI * 2, x = arena.cx + Math.cos(a) * (arena.R - 12), y = arena.cy + Math.sin(a) * (arena.R - 12);
            const ia = a + Math.PI + sw * 0.25; bullets.push({ x, y, vx: Math.cos(ia) * 115, vy: Math.sin(ia) * 115, r: 8, dmg: B.atk, kind: 'orb', life: (arena.R - 40) / 115, t: 0 });
          }
          A.sfx('summon');
        }
        if (mv.t > 1.4 + waves * 1.1) done(1.1);
        break;
      }
      case 'firestorm':    // dragon: spiral arms of fire that circle outward
        if (!mv.n && mv.t > 0.5) {
          mv.n = 1; const arms = p2 ? 5 : 4, dir = Math.random() < 0.5 ? 1 : -1;
          for (let k = 0; k < arms; k++) for (let j = 0; j < 4; j++) bullets.push({ x: B.x, y: B.y, vx: 0, vy: 0, r: 8, dmg: B.atk, kind: 'flame', life: 4.2, t: 0, orbit: { cx: B.x, cy: B.y, a: k / arms * Math.PI * 2 + j * 0.16, r: 30 + j * 14, w: 1.5 * dir, dr: 62 } });
          A.sfx('boom');
        }
        if (mv.t > 3.2) done(1.1);
        break;
      case 'icecage':      // ice queen: pillars ring you in, leave by the gap before the centre freezes
        if (!mv.n) {
          mv.n = 1; const cx = hero.x, cy = hero.y, n = 12, gap = Math.floor(rnd(0, n)); mv.cx = cx; mv.cy = cy;
          for (let i = 0; i < n; i++) { if (i === gap || i === (gap + 1) % n) continue; const a = i / n * Math.PI * 2; addCircle(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120, 32, 0.9, B.atk, 'ice'); }
          addCircle(cx, cy, 95, 1.6, B.atk * 1.2, 'ice');
          if (p2) for (let i = 0; i < 3; i++) { const pt = arenaSpot(120); zones.push({ type: 'patch', kind: 'ice', x: pt.x, y: pt.y, r: 70, life: 7, t: 0 }); }
        }
        if (mv.t > 2.2) done(1.1);
        break;
      case 'thunderlines': {   // thunderbird: lightning strikes along lines across the room
        const sets = p2 ? 3 : 2;
        if (mv.t > 0.3 + mv.n * 0.9 && mv.n < sets) {
          mv.n++;
          for (let i = 0; i < 4; i++) {
            const a1 = i === 0 ? Math.atan2(hero.y - arena.cy, hero.x - arena.cx) + rnd(0.3, 0.8) : rnd(0, 6.28), a2 = i === 0 ? a1 + Math.PI - rnd(0.3, 0.9) : a1 + rnd(1.6, 3.1);
            zones.push({ type: 'seg', kind: 'bolt', x: arena.cx + Math.cos(a1) * arena.R, y: arena.cy + Math.sin(a1) * arena.R, x2: arena.cx + Math.cos(a2) * arena.R, y2: arena.cy + Math.sin(a2) * arena.R, w: 12, tele: 0.95, act: 0.3, dmg: B.atk, t: 0 });
          }
        }
        if (mv.t > 0.6 + sets * 0.9) done(1.1);
        break;
      }
      case 'darkwave':     // death knight: crescent slashes that fly and pierce
        if (mv.t > 0.5 + mv.n * 0.6 && mv.n < (p2 ? 3 : 2)) {
          mv.n++; const a = Math.atan2(hero.y - B.y, hero.x - B.x);
          for (const o of [-0.4, 0, 0.4]) bullets.push({ x: B.x + Math.cos(a + o) * B.r, y: B.y + Math.sin(a + o) * B.r, vx: Math.cos(a + o) * 240, vy: Math.sin(a + o) * 240, r: 22, dmg: B.atk, kind: 'crescent', life: 3, t: 0, pierce: true });
          A.sfx('crit');
        }
        if (mv.t > 2.2) done(1.1);
        break;
      case 'ink':          // kraken: ink blacks out the room, then the tentacles come
        if (!mv.n) { mv.n = 1; darkT = p2 ? 5 : 4; burst(B.x, B.y, 40, '#2a1440', 300, 1); A.sfx('magic2'); }
        if (mv.t > 0.8 && mv.n === 1) { mv.n = 2; const v = (Math.random() < 0.5 ? 1 : -1) * 1.5; for (let k = 0; k < 2; k++) addSweep(B, { ang: mv.a0 + k * Math.PI, vel: v, len: 200, w: 14, left: Math.PI * 1.5, col: B.wcol || '#a85ad8', kind: 'tentacle', tele: 0.9 }); }
        if (mv.t > 2.0 && mv.n === 2) { mv.n = 3; for (const o of [-0.3, 0, 0.3]) shoot(B.x, B.y, Math.cos(ang + o), Math.sin(ang + o), 200, B.atk, 'orb'); }
        if (mv.t > 3.6) done(1.1);
        break;
      case 'quicksand':    // pharaoh: a sand pit that drags you to its deadly centre
        if (!mv.n) { mv.n = 1; const pt = arenaSpot(150); zones.push({ type: 'patch', kind: 'sand', x: pt.x, y: pt.y, r: 80, core: 26, pr: 230, pull: p2 ? 420 : 330, life: 5, dmg: B.atk * 0.7, t: 0 }); A.sfx('quake'); }
        if (mv.t > 1.2 && mv.n === 1) { mv.n = 2; for (let i = 0; i < (p2 ? 5 : 3); i++) addCircle(hero.x + rnd(-80, 80), hero.y + rnd(-80, 80), 40, 0.9 + i * 0.15, B.atk, 'sand'); }
        if (mv.t > 3) done(1.1);
        break;
      case 'timestop':     // clock machine: time stops; knives appear around you and fly when it starts again
        if (!mv.n) {
          mv.n = 1; freezeT = 1.4; flash = 0.5; flashCol = '220,220,255'; A.sfx('warp');
          for (const R0 of p2 ? [140, 210] : [150]) { const n = R0 > 160 ? 20 : 14, off = rnd(0, 1); for (let i = 0; i < n; i++) { const a = (i + off) / n * Math.PI * 2; bullets.push({ x: hero.x + Math.cos(a) * R0, y: hero.y + Math.sin(a) * R0, vx: 0, vy: 0, r: 7, dmg: B.atk, kind: 'knife', life: 4, t: 0, wait: 1.45 + (R0 > 160 ? 0.25 : 0), aim: 230, noFreeze: true }); } }
        }
        if (mv.t > 2.6) done(1.2);
        break;
      case 'gaze':         // void eye: a beam that follows you
        if (!mv.n) { mv.n = 1; const aB = aimFrom(mouthOf(B)); addBeam(B, aB, { tele: 0.9, act: 3.2, w: 13, track: p2 ? 0.95 : 0.7, boss: B }); if (p2) addBeam(B, aB + Math.PI, { tele: 0.9, act: 3.2, w: 13, track: 0.6, boss: B }); }
        if (mv.t > 4.3) done(1.1);
        break;
      case 'regen':        // hydra: the heads drop venom pools, then it regrows its wounds unless you hit it
        if (!mv.n) { mv.n = 1; for (let i = 0; i < (p2 ? 4 : 3); i++) { const tx = hero.x + rnd(-110, 110), ty = hero.y + rnd(-110, 110), d0 = hyp(tx - B.x, ty - B.y) || 1; bullets.push({ x: B.x, y: B.y, vx: 0, vy: 0, r: 9, dmg: 0, kind: 'spore', life: 9, t: 0, dest: { x: tx, y: ty }, spd: 300, d0, harmless: true, onLand: b => zones.push({ type: 'patch', kind: 'poison', x: b.x, y: b.y, r: 50, life: 6, dmg: B.atk * 0.5, t: 0 }) }); } A.sfx('magic2'); }
        if (mv.t > 0.8 && mv.n === 1) { mv.n = 2; B.regen = { t: 3.5, acc: 0 }; }
        if (mv.t > 1.4) done(1.4);
        break;
      case 'cannons': {    // ghost captain: cannonballs sweep the room in lanes; stand in a safe lane
        const vol = p2 ? 2 : 1;
        if (mv.t > 0.2 + mv.n * 1.6 && mv.n < vol) {
          const a = (mv.n ? mv.dir + Math.PI / 2 : (mv.dir = rnd(0, 6.28))), ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux; mv.n++;
          const lanes = [], safe = Math.floor(rnd(1, 5));
          for (let o = -arena.R * 0.83; o <= arena.R * 0.83 + 1; o += arena.R * 0.24) lanes.push(o);
          lanes.forEach((o, i) => {
            if (i === safe || i === safe + 1) return;
            const half = Math.sqrt(Math.max(0, arena.R * arena.R - o * o)), x0 = arena.cx + px * o - ux * half, y0 = arena.cy + py * o - uy * half;
            zones.push({ type: 'seg', kind: 'meteor', x: x0, y: y0, x2: x0 + ux * half * 2, y2: y0 + uy * half * 2, w: 14, tele: 1.0, act: 0.05, dmg: 0, t: 0 });
            bullets.push({ x: x0, y: y0, vx: ux * 420, vy: uy * 420, r: 15, dmg: B.atk, kind: 'cannon', life: 3, t: 0, wait: null, delay: 1.0, pierce: true });
          });
          A.sfx('door');
        }
        if (mv.t > 0.6 + vol * 1.6) done(1.1);
        break;
      }
      case 'boulders':     // cyclops: hurls boulders that bounce off the walls
        if (mv.t > 0.6 + mv.n * 0.5 && mv.n < (p2 ? 3 : 2)) { mv.n++; const a = Math.atan2(hero.y - B.y, hero.x - B.x) + rnd(-0.15, 0.15); bullets.push({ x: B.x, y: B.y, vx: Math.cos(a) * 270, vy: Math.sin(a) * 270, r: 20, dmg: B.atk, kind: 'boulder', life: 6, t: 0, bounce: p2 ? 3 : 2, pierce: true }); A.sfx('boom'); shake = 8; }
        if (mv.t > 2.2) done(1.1);
        break;
      case 'illusion':     // archmage: three copies appear; only the real one can be hurt
        if (!mv.n && mv.t > 0.3) {
          mv.n = 1; const spots = [arenaSpot(150), arenaSpot(150), arenaSpot(150), arenaSpot(150)], real = Math.floor(rnd(0, 4));
          burst(B.x, B.y, 30, '#c8b8ff', 260); A.sfx('warp');
          B.x = B.hx = spots[real].x; B.y = B.hy = spots[real].y; B.homeT = 6;
          B.decoys = spots.filter((_, i) => i !== real).slice(0, p2 ? 3 : 2).map(pt => ({ x: pt.x, y: pt.y, hx: pt.x, hy: pt.y, t: 0, ph: rnd(0, 6) }));
          for (const pt of spots) burst(pt.x, pt.y, 16, '#c8b8ff', 180);
        }
        if (mv.t > 1.4 && mv.n === 1) { mv.n = 2; const M = mouthOf(B), a0 = aimFrom(M); for (const o of [-0.25, 0, 0.25]) shoot(M.x, M.y, Math.cos(a0 + o), Math.sin(a0 + o), 190, B.atk, 'orb'); }
        if (mv.t > 2) done(1.2);
        break;
      case 'tornado':      // quetzalcoatl: tornadoes that wander after you
        if (!mv.n && mv.t > 0.4) { mv.n = 1; for (let i = 0; i < (p2 ? 3 : 2); i++) { const pt = arenaSpot(170); twisters.push({ x: pt.x, y: pt.y, vx: 0, vy: 0, r: 24, spd: p2 ? 95 : 75, t: 0, life: p2 ? 7 : 6, ph: rnd(0, 6) }); burst(pt.x, pt.y, 20, '#c8ffe8', 200); } A.sfx('summon'); }
        if (mv.t > 1.4) done(1.4);
        break;
      case 'rocketfist':   // colossus: its fists fly out and come back
        if (mv.t > 0.6 && mv.n < (p2 ? 2 : 1) && mv.t > 0.6 + mv.n * 1.1) {
          mv.n++; const a = Math.atan2(hero.y - B.y, hero.x - B.x);
          for (const o of [-0.28, 0.28]) { const M = mouthOf(B, o < 0 ? 2 : 1), fx = M.at ? M.x : B.x + Math.cos(a + o * 3) * B.r, fy = M.at ? M.y : B.y + Math.sin(a + o * 3) * B.r; bullets.push({ x: fx, y: fy, vx: Math.cos(a + o) * 420, vy: Math.sin(a + o) * 420, r: 18, dmg: B.atk, kind: 'fist', life: 5, t: 0, ret: 0.8, pierce: true }); }
          A.sfx('boom'); shake = 8;
        }
        if (mv.t > (p2 ? 3.4 : 2.4)) done(1.1);
        break;
      case 'mirror':       // shadow hero: your own shadow, mirrored through the room's centre
        if (!mv.n) { mv.n = 1; shades.push({ x: arena.cx * 2 - hero.x, y: arena.cy * 2 - hero.y, t: 0, life: p2 ? 7 : 5 }); A.sfx('warp'); flash = 0.3; flashCol = '120,80,200'; }
        if (mv.t > 1.0 && mv.n === 1) { mv.n = 2; for (const o of [-0.2, 0.2]) shoot(B.x, B.y, Math.cos(ang + o), Math.sin(ang + o), 230, B.atk, 'orb'); }
        if (mv.t > 1.5) done(1.4);
        break;
      case 'tsunami': {    // leviathan: a wall of water crosses the room with one gap
        const waves = p2 ? 2 : 1;
        if (mv.t > 0.2 + mv.n * 1.7 && mv.n < waves) {
          const a = mv.n ? mv.dir + Math.PI : (mv.dir = rnd(0, 6.28)), ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux, gap = rnd(-170, 170); mv.n++;
          zones.push({ type: 'seg', kind: 'water', x: arena.cx - ux * arena.R + px * arena.R, y: arena.cy - uy * arena.R + py * arena.R, x2: arena.cx - ux * arena.R - px * arena.R, y2: arena.cy - uy * arena.R - py * arena.R, w: 14, tele: 0.8, act: 0.05, dmg: 0, t: 0 });
          for (let o = -arena.R + 14; o <= arena.R - 14; o += 24) { if (Math.abs(o - gap) < 64) continue; const half = Math.sqrt(arena.R * arena.R - o * o); bullets.push({ x: arena.cx - ux * half + px * o, y: arena.cy - uy * half + py * o, vx: ux * 170, vy: uy * 170, r: 13, dmg: B.atk, kind: 'wave', life: 0.8 + (half * 2) / 170, t: 0, delay: 0.8 }); }
          A.sfx('quake');
        }
        if (mv.t > 1 + waves * 1.7) done(1.1);
        break;
      }
      case 'raisedead':    // bone dragon: skeletons climb out of the ground around you
        if (!mv.n) {
          mv.n = 1; const n = Math.min(p2 ? 6 : 4, 8 - enemies.filter(e => !e.dead).length), off = rnd(0, 6.28);
          for (let i = 0; i < Math.max(2, n); i++) {
            const a = off + i / Math.max(2, n) * Math.PI * 2; let x = hero.x + Math.cos(a) * 110, y = hero.y + Math.sin(a) * 110;
            const ax = x - arena.cx, ay = y - arena.cy, ad = hyp(ax, ay); if (ad > arena.R - 40) { x = arena.cx + ax / ad * (arena.R - 40); y = arena.cy + ay / ad * (arena.R - 40); }
            addCircle(x, y, 34, 1.0, B.atk * 0.7, 'curse', z => { if (i < n) { const e = spawnEnemy('skeleton', z.x, z.y, true); e.exp = Math.round(e.exp * 0.5); e.gold = Math.round(e.gold * 0.5); } });
          }
          A.sfx('summon');
        }
        if (mv.t > 1.8) done(1.2);
        break;
      case 'whirlblade':   // demon general: steps to the centre and spins, the blades growing longer
        if (!mv.n) { mv.n = 1; B.hx = arena.cx; B.hy = arena.cy; B.homeT = 4; }
        if (mv.t > 0.6 && mv.n === 1) { mv.n = 2; const k = p2 ? 3 : 2, v = (Math.random() < 0.5 ? 1 : -1) * 2.0; for (let i = 0; i < k; i++) addSweep(B, { ang: mv.a0 + i / k * Math.PI * 2, vel: v, len: 60, grow: 80, lmax: 260, w: 11, left: Math.PI * 4.2, col: B.wcol || '#ff4a3a', kind: 'blade', tele: 0.7 }); }
        if (mv.t > 4.6) done(1.2);
        break;
      case 'despair': {    // demon king: the whole room is about to explode except a few circles
        if (!mv.n) {
          mv.n = 1; const safe = []; for (let i = 0; i < (p2 ? 2 : 3); i++) { let pt; for (let k = 0; k < 20; k++) { pt = arenaSpot(150); if (safe.every(q2 => hyp(q2.x - pt.x, q2.y - pt.y) > 140)) break; } safe.push({ x: pt.x, y: pt.y, r: 56 }); }
          zones.push({ type: 'doom', safe, tele: p2 ? 1.9 : 2.2, dmg: B.atk * 1.3, t: 0 }); A.sfx('roar');
        }
        if (mv.t > 2.6 && mv.n === 1) { mv.n = 2; const n = p2 ? 7 : 5; for (let i = 0; i < n; i++) { const a = ang + Math.PI + (i - (n - 1) / 2) * 0.5; bullets.push({ x: B.x, y: B.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, r: 9, dmg: B.atk, kind: 'homing', life: 4.6, t: 0 }); } }
        if (mv.t > 3.2) done(1.2);
        break;
      }
      case 'packhunt': {   // fenrir: phantom wolves dash across the room one after another, each through where you stand
        const n = p2 ? 5 : 3;
        if (mv.t > 0.3 + mv.n * 0.45 && mv.n < n) {
          mv.n++;
          const a = rnd(0, 6.28), cx0 = Math.cos(a), cy0 = Math.sin(a), sx = arena.cx + cx0 * (arena.R - 4), sy0 = arena.cy + cy0 * (arena.R - 4);
          let ux = hero.x + hero.vx * 0.2 - sx, uy = hero.y + hero.vy * 0.2 - sy0; const l = hyp(ux, uy) || 1; ux /= l; uy /= l;
          const len = Math.max(arena.R * 0.8, -2 * arena.R * (cx0 * ux + cy0 * uy)), spd = p2 ? 600 : 540;
          zones.push({ type: 'seg', kind: 'ice', x: sx, y: sy0, x2: sx + ux * len, y2: sy0 + uy * len, w: 16, tele: 0.75, act: 0.05, dmg: 0, t: 0 });
          bullets.push({ x: sx, y: sy0, vx: ux * spd, vy: uy * spd, r: 18, dmg: B.atk, kind: 'spiritwolf', life: 0.75 + len / spd, t: 0, delay: 0.75, pierce: true });
          A.sfx('warp');
        }
        if (mv.t > 0.3 + n * 0.45 + 1.3) done(1.1);
        break;
      }
      case 'dreamorbs':    // nightmare: big dream bubbles bounce round the room; touch one and you fall asleep
        if (mv.t > 0.4 && mv.n < (p2 ? 4 : 3) && mv.t > 0.4 + mv.n * 0.22) {
          mv.n++; const a = mv.a0 + (mv.n - (p2 ? 2.5 : 2)) * 0.8 + rnd(-0.15, 0.15);
          bullets.push({ x: B.x, y: B.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, r: 20, dmg: Math.round(B.atk * 0.6), kind: 'dream', life: 5, t: 0, bounce: 3, stun: 0.75, stunKind: 'sleep',
            onDie: b => { burst(b.x, b.y, 18, '#e8c0ff', 200, 0.5); A.sfx('magic'); if (!b.hitHero && p2) for (let k = 0; k < 4; k++) { const a2 = k / 4 * Math.PI * 2 + b.t; const o = shoot(b.x, b.y, Math.cos(a2), Math.sin(a2), 120, B.atk, 'orb', 2.4); o.col = SHOTCOL.dream; } } });
          A.sfx('magic2');
        }
        if (mv.t > 1.9 && mv.n2 == null) { mv.n2 = 1; for (const o of [-0.2, 0.2]) { const b = shoot(B.x, B.y, Math.cos(ang + o), Math.sin(ang + o), 220, B.atk, 'orb'); b.col = SHOTCOL.dream; } }
        if (mv.t > 2.3) done(1.3);
        break;
      case 'petrify': {    // gorgon: a wide cone of petrifying gaze; be outside it when her eyes flash
        if (!mv.n) { mv.n = 1; for (const o of p2 ? [0, Math.PI] : [0]) zones.push({ type: 'cone', boss: B, ang: ang + o, spread: 0.52, len: arena.R * 2.2, tele: 1.2, act: 0.3, track: 0.55, dmg: B.atk * 0.8, t: 0 }); A.sfx('magic2'); }
        if (mv.t > 1.7 && mv.n === 1) { mv.n = 2; const M = mouthOf(B), a0 = aimFrom(M); for (const o of [-0.3, 0, 0.3]) { const b = shoot(M.x, M.y, Math.cos(a0 + o), Math.sin(a0 + o), 210, B.atk, 'orb'); b.col = SHOTCOL.poison; } A.sfx('magic'); }
        if (mv.t > 2.3) done(1.1);
        break;
      }
      case 'pillars': {    // fallen angel: judgement falls on a checkerboard, then on the other squares
        const waves = p2 ? 3 : 2, S = 84;
        if (mv.t > 0.2 + mv.n * 1.0 && mv.n < waves) {
          if (mv.off == null) { mv.off = rnd(0, S); mv.off2 = rnd(0, S); }
          const par = mv.n % 2; mv.n++;
          for (let gx = -5; gx <= 4; gx++) for (let gy = -5; gy <= 4; gy++) {
            if ((((gx + gy) % 2) + 2) % 2 !== par) continue;
            const x = arena.cx + gx * S + mv.off, y = arena.cy + gy * S + mv.off2;
            if (hyp(x - arena.cx, y - arena.cy) > arena.R - 18) continue;
            addCircle(x, y, 44, 1.05, B.atk, 'holy');
          }
          A.sfx('magic');
        }
        if (mv.t > 0.2 + waves * 1.0 + 0.5) done(1.1);
        break;
      }
      case 'collapse': {   // god of ruin: the world crumbles in from the edge while it spins out stars of ruin
        if (!mv.n) { mv.n = 1; B.hx = arena.cx; B.hy = arena.cy; B.homeT = 6; zones.push({ type: 'shrink', r0: arena.R, r1: p2 ? 160 : 180, tele: 1.0, close: 1.4, hold: 2.2, open: 0.8, dmg: B.atk * 0.6, t: 0 }); A.sfx('roar'); shake = 14; }
        if (mv.t > 1.4 && mv.t < 4.6) { mv.acc += dt; while (mv.acc > 0.24) { mv.acc -= 0.24; mv.n++; for (let k = 0; k < 2; k++) { const a = mv.a0 + mv.n * 0.36 + k * Math.PI; shoot(B.x, B.y, Math.cos(a), Math.sin(a), 100, B.atk, 'orb', 3.2); } } }
        if (mv.t > 5.8) done(1.2);
        break;
      }
      default: done(1);
    }
  }

  // ---------------------------------------------------------------
  //  MAIN UPDATE
  // ---------------------------------------------------------------
  function update(dt) {
    globalT += dt;bestTick(dt);guildPoll(dt);
    if (audioOn) for (const e of FMusic.pollEvents()) if (e.type === 'beat') { beatPulse = 1; beatN++; }
    beatPulse = Math.max(0, beatPulse - dt * 4);
    if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
    if (transition) { transition.t += dt; if (transition.t >= transition.mid && !transition.done) { transition.done = true; transition.fn(); } if (transition.t >= transition.mid * 2) transition = null; }
    for (const p of fx) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; p.life -= dt; }
    fx = fx.filter(p => p.life > 0);
    for (const a of anims) a.t += dt;
    if (!paused) { for (const q2 of toasts) q2.t -= dt; toasts = toasts.filter(q2 => q2.t > 0); }
    anims = anims.filter(a => a.t < a.dur);
    for (const s of texts) { s.y += 30 * dt; s.life -= dt; }
    texts = texts.filter(s => s.life > 0);
    if (flash > 0) flash = Math.max(0, flash - dt * 2.5);
    if (shake > 0) shake = Math.max(0, shake - dt * 40);
    if (state === 'town' && tdrag.id == null) townX = lerp(townX, townPage, 1 - Math.exp(-dt * 12));
    if (state !== 'play' && state !== 'boss') return;
    if (paused) return;
    if(arenaRun&&arenaRun.phase!=='fight')return;
    if (hitStop > 0) { hitStop -= dt; return; }
    if (slowMo > 0) { slowMo -= dt; dt *= 0.3; }
    pfxTick(dt);
    t += dt;
    if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }
    if (hint > 0) hint -= dt;
    updateTut(dt);
    if (deathT > 0) { deathT -= dt / Math.max(0.3, slowMo > 0 ? 0.3 : 1); if (deathT <= 0) { showDefeat(); return; } }
    if (hero.hp > 0) updateHero(dt);
    if(arenaRun?.settled)return;
    updateEnemies(dt);
    if(arenaRun?.settled)return;
    updateBullets(dt);
    if(arenaRun?.settled)return;
    if (state === 'play') {
      updateProps(dt);
      updateEvents(dt);
      updateZones(dt);   // lightning marks, bomb blasts, a basilisk's stare
      camY = lerp(camY, Math.max(hero.y + 40, H * 0.38 - 30), 1 - Math.exp(-dt * 6));
      camY = Math.min(camY, goalY + 60 - (H * 0.38) + 60);
      if(hardRun)hardFieldTick(dt);else{
      // boss door
      if (gateMsgT > 0) gateMsgT -= dt;
      if (gateKills < gateNeed && hero.y > goalY - 220) {   // waiting at the sealed door: the seal calls the monsters left behind, a few at a time
        if ((gateCallT -= dt) <= 0) {
          gateCallT = 2.4;
          const far = enemies.filter(e => !e.dead && !['goldslime','pinkdiamondslime'].includes(e.type) && !e.march && hyp(e.x - hero.x, e.y - hero.y) > 330).sort((a, b) => a.y - b.y).slice(-3);
          for (const e of far) { burst(e.x, e.y, 12, '#c8a0ff', 140, 0.4); const y2 = goalY - rnd(300, 460), tn = tunnelAt(y2); e.x = tn.cx + rnd(-0.3, 0.3) * tn.w; e.y = y2; e.vx = e.vy = 0; e.active = true; burst(e.x, e.y, 16, '#c8a0ff', 180, 0.5); anims.push({ kind: 'poof', x: e.x, y: e.y, t: 0, dur: 0.4, frames: 5 }); }
          if (far.length) { A.sfx('summon'); if (!gateMsgT) popText(hero.x, hero.y + 60, 'ふういんが まものを よびよせた！', '#d8b0ff', 13, 1.2); }
        }
      }
      if (gateKills < gateNeed && hero.y > goalY - 30) {   // sealed: pushed back from the door
        hero.y = goalY - 30; if (hero.vy > 0) hero.vy = -Math.max(160, hero.vy * 0.5); hero.recoil = Math.max(hero.recoil, 0.12);
        if (gateMsgT <= 0) { gateMsgT = 1.6; popText(hero.x, hero.y + 40, `ふういんされている… あと ${gateNeed - gateKills}たい たおそう`, '#ff9a8a', 14, 1.4); A.sfx('block'); shake = Math.max(shake, 5); }
      } else if (hero.y > goalY + 10 && !transition) { hero.vx = hero.vy = 0; transition = { t: 0, mid: 0.5, fn: enterBossRoom }; A.sfx('door'); }
      }
    } else {
      updateProps(dt);
      updateEvents(dt);
      updateZones(dt);
      if(defRun)defTick(dt);else if(hardRun)hardUpdateBosses(dt);else if (boss) bossUpdate(dt);
      // camera follows the hero, kept inside the room
      const kx = arena.R + 30 - W / 2, ky = arena.R + 30 - H * 0.5;
      const tx = clamp(hero.x, arena.cx - kx, arena.cx + kx), ty = ky > 0 ? clamp(hero.y, arena.cy - ky, arena.cy + ky) : arena.cy;
      bcamX = lerp(bcamX, tx, 1 - Math.exp(-dt * 6)); bcamY = lerp(bcamY, ty, 1 - Math.exp(-dt * 6));
    }
    arenaTick(dt);
  }

  // ---------------------------------------------------------------
  //  RENDER
  // ---------------------------------------------------------------
  const sy = y => (arena ? H * 0.5 - (y - bcamY) : H * 0.62 - (y - camY));
  let floorPat = null, wallPat = null, patFor = -1, patCtx = null, townPats = null;
  function makePatterns() {
    if (patFor === dIdx && floorPat && patCtx === ctx) return;
    patFor = dIdx; patCtx = ctx;
    floorPat = ctx.createPattern(SPR.floorTile(dIdx, D.pal), 'repeat');
    wallPat = ctx.createPattern(SPR.wallTile(dIdx, D.pal), 'repeat');
  }
  // patterns are drawn 1 tile pixel = 1 art pixel, aligned to the art grid
  function patShift(p, x, y) { try { p.setTransform(new DOMMatrix([PXS, 0, 0, PXS, q(x), q(y)])); } catch (e) { } }
  function drawDungeon() {
    makePatterns();
    const P = D.pal;
    patShift(wallPat, 0, sy(0) % 24); ctx.fillStyle = wallPat; ctx.fillRect(-WX - 3, 0, W + 6, H);
    // corridor floor
    const y0 = camY - H * 0.5, y1 = camY + H * 0.75;
    const L = [], R = [];
    for (let y = Math.floor(y0 / 18) * 18; y <= y1; y += 18) { const tn = tunnelAt(y); L.push([q(tn.cx - tn.w / 2), sy(y)]); R.push([q(tn.cx + tn.w / 2), sy(y)]); }
    ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
    for (const p of L) ctx.lineTo(p[0], p[1]);
    for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.closePath();
    patShift(floorPat, 0, sy(0) % 48); ctx.fillStyle = floorPat; ctx.fill();
    // wall lip: dark inner shadow + lit top edge so the walls read as solid
    ctx.save(); ctx.clip(); ctx.lineWidth = 18; ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.stroke(); ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke(); ctx.restore();
    ctx.lineWidth = 3; ctx.strokeStyle = SPR.shade(P.wallHi, 0.25);
    ctx.beginPath(); L.forEach((p, i) => i ? ctx.lineTo(p[0] - 2, p[1]) : ctx.moveTo(p[0] - 2, p[1])); ctx.stroke();
    ctx.beginPath(); R.forEach((p, i) => i ? ctx.lineTo(p[0] + 2, p[1]) : ctx.moveTo(p[0] + 2, p[1])); ctx.stroke();
    // bottom wall at the entrance
    if (sy(0) < H + 40) { ctx.fillStyle = wallPat; ctx.fillRect(-WX - 3, q(sy(0)), W + 6, H); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(0, q(sy(0)), W, 4.5); }
    // boss door (pixel arch)
    const dy = q(sy(goalY + 20));
    if (dy > -80 && dy < H + 80) {
      ctx.fillStyle = wallPat; ctx.fillRect(-WX - 3, dy - 400, W + 6, 400);
      const dw = 138, dx = q(VW / 2 - dw / 2);
      ctx.fillStyle = '#c9a24a'; ctx.fillRect(dx - 6, dy - 72, dw + 12, 72); ctx.fillRect(dx + 9, dy - 84, dw - 18, 12); ctx.fillRect(dx + 30, dy - 93, dw - 60, 9);
      ctx.fillStyle = '#7a5a20'; ctx.fillRect(dx - 6, dy - 3, dw + 12, 3);
      ctx.fillStyle = '#1a0f12'; ctx.fillRect(dx, dy - 66, dw, 66); ctx.fillRect(dx + 12, dy - 78, dw - 24, 12); ctx.fillRect(dx + 33, dy - 87, dw - 66, 9);
      ctx.fillStyle = '#3a2428'; for (let i = 0; i < 6; i++) ctx.fillRect(dx + 6 + i * 22.5, dy - 63, 3, 63);
      ctx.fillStyle = '#c9a24a'; ctx.fillRect(q(VW / 2) - 1.5, dy - 87, 3, 87); ctx.fillRect(q(VW / 2) - 9, dy - 36, 6, 6); ctx.fillRect(q(VW / 2) + 3, dy - 36, 6, 6);
      const glow = 0.5 + 0.5 * Math.sin(globalT * 3);
      ctx.fillStyle = `rgba(255,60,60,${0.25 + glow * 0.3})`; ctx.fillRect(dx + 6, dy - 3, dw - 12, 3);
      if (gateKills < gateNeed) {   // the seal: crossed chains and a glowing lock
        ctx.fillStyle = '#6a6a78'; for (let i = 0; i < 9; i++) { const k = i / 8; ctx.fillRect(q(dx + 4 + k * (dw - 14)), q(dy - 70 + k * 60), 7.5, 4.5); ctx.fillRect(q(dx + dw - 11 - k * (dw - 14)), q(dy - 70 + k * 60), 7.5, 4.5); }
        ctx.fillStyle = '#a8a8b8'; for (let i = 0; i < 9; i += 2) { const k = i / 8; ctx.fillRect(q(dx + 5.5 + k * (dw - 14)), q(dy - 70 + k * 60), 4.5, 1.5); ctx.fillRect(q(dx + dw - 9.5 - k * (dw - 14)), q(dy - 70 + k * 60), 4.5, 1.5); }
        const lx = q(VW / 2), ly = q(dy - 40);
        ctx.fillStyle = `rgba(200,120,255,${0.25 + glow * 0.35})`; ctx.fillRect(lx - 21, ly - 21, 42, 42);
        ctx.fillStyle = '#c9a24a'; ctx.fillRect(lx - 9, ly - 15, 18, 3); ctx.fillRect(lx - 9, ly - 15, 3, 9); ctx.fillRect(lx + 6, ly - 15, 3, 9);
        ctx.fillStyle = '#e8c860'; ctx.fillRect(lx - 12, ly - 6, 24, 18); ctx.fillStyle = '#7a5a20'; ctx.fillRect(lx - 12, ly + 9, 24, 3); ctx.fillStyle = '#1a0f12'; ctx.fillRect(lx - 1.5, ly, 3, 6);
      }
    }
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }

  function drawArena() {
    makePatterns();
    const vx0 = bcamX - W / 2 - 20;
    patShift(wallPat, 0, sy(0) % 24); ctx.fillStyle = wallPat; ctx.fillRect(vx0, 0, W + 40, H);
    const cx = arena.cx, cy = sy(arena.cy);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, arena.R, 0, Math.PI * 2);
    patShift(floorPat, cx, cy); ctx.fillStyle = floorPat; ctx.fill();
    ctx.clip();
    // magic circle (thick pixel lines)
    ctx.strokeStyle = `rgba(${D.pal.light},${0.16 + beatPulse * 0.14})`; ctx.lineWidth = 3;
    for (const rr of [arena.R * 0.92, arena.R * 0.62, arena.R * 0.3]) { ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath();
    for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 4 / 5 + globalT * 0.1; const x = cx + Math.cos(a) * arena.R * 0.62, y = cy + Math.sin(a) * arena.R * 0.62; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = `rgba(${D.pal.light},${0.35 + beatPulse * 0.3})`;
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2 + globalT * 0.1; ctx.fillRect(q(cx + Math.cos(a) * arena.R * 0.77) - 1.5, q(cy + Math.sin(a) * arena.R * 0.77) - 1.5, 3, 3); }
    ctx.restore();
    ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.arc(cx, cy, arena.R + 3, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 4.5; ctx.strokeStyle = SPR.shade(D.pal.wallHi, 0.25); ctx.beginPath(); ctx.arc(cx, cy, arena.R + 6, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; drawTorch(cx + Math.cos(a) * (arena.R + 14), cy + Math.sin(a) * (arena.R + 14)); }
  }
  // pre-rendered glow sprites (gradients every frame are expensive on phones)
  let glowFor = null, glowImg = null, vigFor = null, vigImg = null;
  function glowSprite() {
    if (glowFor === D.pal.light && glowImg) return glowImg;
    glowFor = D.pal.light; glowImg = document.createElement('canvas'); glowImg.width = glowImg.height = 64;
    const g2 = glowImg.getContext('2d'), g = g2.createRadialGradient(32, 32, 1, 32, 32, 32);
    g.addColorStop(0, `rgba(${D.pal.light},0.35)`); g.addColorStop(1, `rgba(${D.pal.light},0)`);
    g2.fillStyle = g; g2.fillRect(0, 0, 64, 64); return glowImg;
  }
  function drawTorch(x, y) {
    // gentle, slow flicker (fast flicker strobes when the frame rate drops)
    const fl = 0.93 + Math.sin(globalT * 3.1 + x) * 0.04 + Math.sin(globalT * 1.7 + y) * 0.03;
    const gr = 70 * fl;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(glowSprite(), x - gr, y - gr, gr * 2, gr * 2);
    ctx.restore();
    SPR.draw(ctx, SPR.ENV.torch(D.pal.light, Math.floor(globalT * 6 + x * 0.1) % 3), x, y + 10);
  }
  // ---------- field gimmicks: floor patches first, then the objects with the other props ----------
  const GIM_OBJ = { vent: 1, bumper: 1, barrel: 1, roller: 1, boulder: 1, mace: 1, swing: 1 };
  const FLOOR_DRAW = { mud: 1, poison: 1, ice: 1, belt: 1, stream: 1, crumble: 1, vent: 1, warp: 1 };
  function ellPath(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); }
  function drawFloorGim(p, y) {
    const x = p.x;
    if (p.type === 'mud' || p.type === 'poison') {
      const P = p.type === 'poison';
      ellPath(x, y, p.rx + 3, p.ry + 3); ctx.fillStyle = P ? 'rgba(40,60,20,.6)' : 'rgba(50,34,20,.6)'; ctx.fill();
      ellPath(x, y, p.rx, p.ry); ctx.fillStyle = P ? '#5a2a78' : 'rgba(96,66,38,.9)'; ctx.fill();
      ctx.fillStyle = ditherFill(P ? '150,235,70' : '70,46,26', P ? 0.75 : 0.6); ellPath(x, y, p.rx * 0.85, p.ry * 0.8); ctx.fill();
      if (P) { ctx.fillStyle = '#a8f04a'; ellPath(x, y, p.rx * 0.35, p.ry * 0.3); ctx.fill(); }
      for (let i = 0; i < 5; i++) {   // bubbles
        const k = (globalT * 0.6 + i * 0.37 + p.seed) % 1, bx = x + Math.sin(i * 2.4 + p.seed * 9) * p.rx * 0.6, by = y + Math.cos(i * 1.7) * p.ry * 0.5;
        const r2 = q(1.5 + k * 4.5); ctx.strokeStyle = P ? `rgba(220,255,140,${1 - k})` : `rgba(200,170,130,${1 - k})`; ctx.lineWidth = 1.5; ctx.strokeRect(q(bx) - r2 / 2, q(by) - r2 / 2, r2, r2);
      }
    } else if (p.type === 'ice') {
      ellPath(x, y, p.rx, p.ry); ctx.fillStyle = 'rgba(190,230,255,.7)'; ctx.fill();
      ctx.fillStyle = ditherFill('255,255,255', 0.4); ellPath(x, y, p.rx * 0.85, p.ry * 0.8); ctx.fill();
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 4; i++) { const sx = q(x - p.rx * 0.5 + i * p.rx * 0.32), sy2 = q(y - p.ry * 0.3 + (i % 2) * p.ry * 0.4); for (let k = 0; k < 4; k++) ctx.fillRect(sx + k * 1.5, sy2 - k * 1.5, 1.5, 1.5); }
      if ((globalT * 1.3 + p.seed) % 2 < 0.25) { ctx.fillRect(q(x + p.rx * 0.3), q(y - p.ry * 0.5), 1.5, 4.5); ctx.fillRect(q(x + p.rx * 0.3) - 1.5, q(y - p.ry * 0.5) + 1.5, 4.5, 1.5); }
    } else if (p.type === 'belt' || p.type === 'stream') {
      const x0 = q(x - p.w / 2), y0 = q(y - p.h / 2), w = q(p.w), hh = q(p.h), B = p.type === 'belt';
      ctx.fillStyle = B ? '#2a2a32' : 'rgba(60,150,230,.45)'; ctx.fillRect(x0, y0, w, hh);
      if (B) { for (let yy = 0; yy < hh; yy += 6) { ctx.fillStyle = (yy / 6) % 2 ? '#f2c14e' : '#1a1a1a'; ctx.fillRect(x0, y0 + yy, 3, 3); ctx.fillRect(x0 + w - 3, y0 + yy, 3, 3); } }
      const sh2 = ((t * p.spd) % 24) * p.dir;   // world y goes up, the screen y goes down
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, hh); ctx.clip();
      for (let yy = -24; yy < hh + 24; yy += 24) {
        const cy = q(y0 + yy - sh2 + 24) - 12;
        if (B) { ctx.fillStyle = '#c8962a'; for (let k = 0; k < 4; k++) { const dy = p.dir > 0 ? k : -k; ctx.fillRect(q(x - 9 + k * 1.5), cy + dy * 1.5, 3, 3); ctx.fillRect(q(x + 6 - k * 1.5), cy + dy * 1.5, 3, 3); } }
        else { ctx.fillStyle = 'rgba(220,245,255,.7)'; ctx.fillRect(q(x0 + w * 0.25), cy, 1.5, 9); ctx.fillRect(q(x0 + w * 0.6), cy + 9, 1.5, 7.5); ctx.fillRect(q(x0 + w * 0.8), cy - 6, 1.5, 6); }
      }
      ctx.restore();
    } else if (p.type === 'crumble') {
      const shk = p.st === 0 && p.t > 0 ? q(rnd(-1.5, 1.5)) : 0, x0 = q(x - p.w / 2) + shk, y0 = q(y - p.h / 2), w = q(p.w), hh = q(p.h);
      if (p.st === 1) {
        const k = p.t > 5.4 ? (p.t - 5.4) / 0.6 : 0;
        ctx.fillStyle = '#05040a'; ctx.fillRect(x0, y0, w, hh); ctx.fillStyle = 'rgba(60,50,70,.9)'; ctx.fillRect(x0, y0, w, 4.5);
        if (k) { ctx.fillStyle = `rgba(160,150,140,${k})`; ctx.fillRect(x0, y0, w, hh); }
      } else {
        ctx.fillStyle = '#16121a'; ctx.fillRect(x0 - 1.5, y0 - 1.5, w + 3, hh + 3);
        ctx.fillStyle = SPR.shade(D.pal.floor, 0.12); ctx.fillRect(x0, y0, w, hh);
        ctx.fillStyle = '#16121a';
        for (let i = 1; i < 4; i++) ctx.fillRect(x0 + q(w * i / 4), y0, 3, hh);
        ctx.fillRect(x0, y0 + q(hh / 2), w, 3);
        for (let i = 0; i < 4; i++) for (let k = 0; k < 5; k++) ctx.fillRect(x0 + q(w * (i + 0.2) / 4 + k * 3), y0 + q(hh * 0.15 + ((k + i) % 3) * 4.5 + (i % 2) * hh * 0.5), 3, 1.5);
        if (p.t > 0.25) { ctx.fillStyle = 'rgba(255,80,60,.6)'; ctx.fillRect(x0, y0, w, 1.5); ctx.fillRect(x0, y0 + hh - 1.5, w, 1.5); }
      }
    } else if (p.type === 'vent') {
      ellPath(x, y, p.r * 0.75, p.r * 0.5); ctx.fillStyle = '#1a0a08'; ctx.fill();
      ctx.fillStyle = '#3a1810';
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; for (let k = 2; k < 6; k++) ctx.fillRect(q(x + Math.cos(a) * p.r * k / 5), q(y + Math.sin(a) * p.r * 0.7 * k / 5), 1.5, 1.5); }
      if (p.st === 1) { const pul = 0.4 + 0.4 * Math.sin(globalT * 22); ctx.fillStyle = ditherFill('255,110,40', 0.35 + pul * 0.4); ellPath(x, y, p.r, p.r * 0.7); ctx.fill(); ctx.fillStyle = '#ff8a2a'; ellPath(x, y, p.r * 0.35, p.r * 0.22); ctx.fill(); }
      else if (p.st !== 2) { ctx.fillStyle = `rgba(255,90,40,${0.25 + 0.15 * Math.sin(globalT * 3 + p.ph)})`; ellPath(x, y, p.r * 0.3, p.r * 0.18); ctx.fill(); }
    } else if (p.type === 'warp') {
      const rot = globalT * 1.6;
      ellPath(x, y, p.r, p.r * 0.62); ctx.fillStyle = 'rgba(120,60,200,.45)'; ctx.fill();
      ctx.strokeStyle = '#c88aff'; ctx.lineWidth = 1.5; ellPath(x, y, p.r, p.r * 0.62); ctx.stroke(); ellPath(x, y, p.r * 0.6, p.r * 0.37); ctx.stroke();
      ctx.fillStyle = '#f0d8ff';
      for (let i = 0; i < 6; i++) { const a = rot + i / 6 * 6.28; ctx.fillRect(q(x + Math.cos(a) * p.r * 0.8) - 1.5, q(y + Math.sin(a) * p.r * 0.5) - 1.5, 3, 3); }
      for (let i = 0; i < 3; i++) { const k = (globalT * 0.9 + i / 3) % 1; ctx.fillStyle = `rgba(220,180,255,${1 - k})`; ctx.fillRect(q(x + Math.sin(i * 2.1) * p.r * 0.5), q(y - k * 26), 1.5, 3); }
    }
  }
  function drawObjGim(p, y) {
    const x = p.x;
    if (p.type === 'vent' && p.st === 2) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,140,60,.45)'; ellPath(x, y, p.r, p.r * 0.7); ctx.fill(); ctx.restore();
      const f = Math.floor(globalT * 12);
      for (let i = 0; i < 5; i++) SPR.draw(ctx, SPR.ENV.flame(f + i, true, D.boss === 'hydra' ? 'poison' : null), x + Math.sin(f * 0.7 + i) * 4, y - i * 13);
    } else if (p.type === 'bumper') {
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(q(x - 15), q(y + 6), 30, 4.5);
      SPR.draw(ctx, SPR.ENV.bumper(D.pal.light, p.lit > 0), x, y + 8);
    } else if (p.type === 'barrel') {
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(q(x - 10.5), q(y + 9), 21, 3);
      const lit = p.fuse > 0, blink = lit && Math.sin(globalT * (p.fuse < 0.5 ? 40 : 18)) > 0;
      SPR.draw(ctx, SPR.ENV.barrel(lit, Math.floor(globalT * 10)), x, y + 10);
      if (blink) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(q(x - 9), q(y - 18), 18, 22.5); }
    } else if (p.type === 'roller') {
      ctx.fillStyle = '#120e10'; ctx.fillRect(q(x - 30), q(y - 12), 60, 21); ctx.fillStyle = '#2a2224'; ctx.fillRect(q(x - 27), q(y - 9), 54, 4.5);
      if (p.warn) { for (let i = 0; i < 4; i++) { const k = (globalT * 2 + i / 4) % 1; ctx.fillStyle = `rgba(200,180,150,${1 - k})`; ctx.fillRect(q(x - 24 + i * 15), q(y - 12 - k * 18), 3, 3); } ctx.fillStyle = 'rgba(255,80,60,.7)'; ctx.fillRect(q(x - 30), q(y + 9), 60, 1.5); }
    } else if (p.type === 'boulder') {
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(q(x - p.r), q(y + p.r * 0.5), q(p.r * 2), 4.5);
      SPR.draw(ctx, SPR.ENV.rock('#8a7a68', Math.floor(p.roll) % 3, 15), x, y + p.r * 0.3);
    } else if (p.type === 'mace') {
      const bx = x + Math.cos(p.ang) * p.len, by = y - Math.sin(p.ang) * p.len;
      ctx.fillStyle = '#3a3640'; ctx.fillRect(q(x - 6), q(y - 15), 12, 18); ctx.fillStyle = '#6a6474'; ctx.fillRect(q(x - 4.5), q(y - 15), 3, 15);
      ctx.fillStyle = '#9a96a4'; for (let k = 1; k < 7; k++) ctx.fillRect(q(x + (bx - x) * k / 7) - 1.5, q(y - 9 + (by - y + 9) * k / 7) - 1.5, 3, 3);
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(q(bx - 9), q(by + 9), 18, 3);
      SPR.draw(ctx, SPR.ENV.mace(), bx, by);
    } else if (p.type === 'swing') {
      const ca = Math.cos(p.a), sa = -Math.sin(p.a), ex = x + ca * p.len, ey = y + sa * p.len;
      ctx.fillStyle = '#4a4450'; ctx.fillRect(q(x - 6), q(y - 6), 12, 12); ctx.fillStyle = '#c9a24a'; ctx.fillRect(q(x - 1.5), q(y - 1.5), 3, 3);
      ctx.fillStyle = '#8a8694'; for (let k = 1; k < 9; k++) ctx.fillRect(q(x + ca * p.len * 0.45 * k / 9) - 1.5, q(y + sa * p.len * 0.45 * k / 9) - 1.5, 3, 3);
      const x1 = x + ca * p.len * 0.45, y1 = y + sa * p.len * 0.45;
      ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 15; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = '#a8b0c0'; ctx.lineWidth = 10.5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1 - sa * 3, y1 + ca * 3); ctx.lineTo(ex - sa * 3, ey + ca * 3); ctx.stroke(); ctx.lineCap = 'butt';
      ctx.fillStyle = '#c9a24a'; ctx.fillRect(q(x1) - 4.5, q(y1) - 4.5, 9, 9);
    }
  }
  // ハテナ箱 / falling star / the merchant
  function drawEvents() {
    for (const o of evs) {
      const y = sy(o.y); if (y < -460 || y > H + 140) continue;
      if (o.type === 'qbox') {
        const bob = Math.round(Math.sin(globalT * 3 + o.x) * 2) * 1.5, sc = o.pop ? Math.min(1, o.t / 0.35) : 1;
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(q(o.x - 10), q(y + 10), 21, 4.5);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(170,140,255,${0.14 + 0.1 * Math.sin(globalT * 5)})`; ctx.beginPath(); ctx.arc(o.x, y - 4, 26, 0, 7); ctx.fill(); ctx.restore();
        if (sc < 1) { ctx.save(); ctx.translate(o.x, y); ctx.scale(sc, sc); ctx.translate(-o.x, -y); }
        SPR.draw(ctx, SPR.ENV.qbox(Math.floor(globalT * 6)), o.x, y - 2 + bob);
        if (sc < 1) ctx.restore();
      } else if (o.type === 'star') {
        if (o.t < o.fall) {
          const k = o.t / o.fall, sx = o.x + (1 - k) * 150, syy = y - (1 - k) * 420;
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,240,170,.55)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(sx + 60, syy - 170); ctx.lineTo(sx, syy); ctx.stroke(); ctx.strokeStyle = '#fffbe8'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
          SPR.draw(ctx, SPR.ENV.star(Math.floor(globalT * 10)), sx, syy);
        } else {
          const left = o.fall + 9 - o.t; if (left < 2 && Math.floor(globalT * 8) % 2) continue;
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,230,140,${0.2 + 0.12 * Math.sin(globalT * 6)})`; ctx.beginPath(); ctx.arc(o.x, y, 30, 0, 7); ctx.fill(); ctx.restore();
          SPR.draw(ctx, SPR.ENV.star(Math.floor(globalT * 6)), o.x, y - 4 + Math.round(Math.sin(globalT * 4)) * 1.5);
          for (let i = 0; i < 4; i++) { const kk = (globalT * 0.9 + i / 4) % 1; ctx.fillStyle = `rgba(255,250,210,${1 - kk})`; ctx.fillRect(q(o.x + Math.sin(i * 2.1) * 14), q(y - 8 - kk * 26), 1.5, 3); }
        }
      } else if (o.type === 'merchant') {
        const a = o.leave != null ? clamp(o.leave / 1.2, 0, 1) : 1;
        ctx.globalAlpha = a; shadow(o.x, y + 2, 14);
        SPR.draw(ctx, SPR.ENV.npc('merchant', Math.floor(globalT * 2)), o.x, y + 14);
        if (o.leave == null) SPR.draw(ctx, SPR.ENV.coin(Math.floor(globalT * 8)), o.x, y - 42 + Math.round(Math.sin(globalT * 3) * 2) * 1.5);
        ctx.globalAlpha = 1;
      }
    }
  }
  function drawProps() {
    for (const p of props) {   // floor patches under everything
      if (!FLOOR_DRAW[p.type]) continue;
      const y = sy(p.y); if (y < -120 || y > H + 120) continue;
      drawFloorGim(p, y);
    }
    for (const p of props) {
      const y = sy(p.y);
      if (y < -130 || y > H + 130) continue;
      if (FLOOR_DRAW[p.type] && !(p.type === 'vent' && p.st === 2)) continue;
      if (GIM_OBJ[p.type]) { drawObjGim(p, y); continue; }
      if (p.type === 'torch') { const tn = tunnelAt(p.y); drawTorch(tn.cx + p.side * (tn.w / 2 + 7), y); continue; }
      if (p.type === 'rock') {
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(q(p.x - p.r * 0.9), q(y + p.r * 0.45), q(p.r * 1.9), 4.5);
        SPR.draw(ctx, SPR.ENV.rock(D.pal.wallHi, Math.floor(p.seed * 3), Math.round(p.r / 1.5)), p.x, y + p.r * 0.2);
      } else if (p.type === 'crate') {
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(q(p.x - 12), q(y + 12), 27, 4.5);
        SPR.draw(ctx, SPR.ENV.crate(), p.x, y);
      } else if (p.type === 'chest') {
        const bob = p.open ? 0 : Math.round(Math.sin(globalT * 4) * 1.5);
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(q(p.x - 15), q(y + 9), 30, 4.5);
        if (!p.open) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,220,120,${0.12 + 0.1 * Math.sin(globalT * 5)})`; ctx.beginPath(); ctx.arc(p.x, y, 24, 0, 7); ctx.fill(); ctx.restore();
          if ((globalT * 2 + p.x) % 1 < 0.3) { ctx.fillStyle = '#fff6c0'; ctx.fillRect(q(p.x + 9), q(y - 12), 1.5, 4.5); ctx.fillRect(q(p.x + 7.5), q(y - 10.5), 4.5, 1.5); } }
        SPR.draw(ctx, SPR.ENV.chest(p.open), p.x, y + bob);
      } else if (p.type === 'spring') {
        if (!p.used) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(140,220,255,${0.12 + 0.08 * Math.sin(globalT * 3)})`; ctx.beginPath(); ctx.arc(p.x, y, p.r * 2.2, 0, 7); ctx.fill(); ctx.restore(); }
        SPR.draw(ctx, SPR.ENV.spring(Math.floor(globalT * 5), p.used), p.x, y);
        if (!p.used) for (let i = 0; i < 5; i++) { const k = (globalT * 0.8 + i / 5) % 1; ctx.fillStyle = `rgba(220,250,255,${1 - k})`; ctx.fillRect(q(p.x + Math.sin(i * 2.3) * p.r * 0.6), q(y - 6 - k * 30), 1.5, 3); }
      } else if (p.type === 'spike') {
        const st = p.state || 0, x0 = q(p.x - p.w / 2), y0 = q(y - p.h / 2), w = q(p.w), h = q(p.h);
        ctx.fillStyle = '#2a2430'; ctx.fillRect(x0, y0, w, h); ctx.fillStyle = '#4a4250'; ctx.fillRect(x0 + 1.5, y0 + 1.5, w - 3, h - 3);
        const n = Math.max(3, Math.floor(p.w / 16));
        for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) {
          const x = q(x0 + (i + 0.5) * w / n), yy = q(y0 + h * (0.3 + j * 0.45));
          if (st === 0) { ctx.fillStyle = '#121016'; ctx.fillRect(x - 3, yy - 1.5, 6, 3); }
          else {
            const hgt = st === 1 ? 2 : 5;
            ctx.fillStyle = st === 1 ? '#a8a8b0' : '#e8e8f0';
            for (let k = 0; k < hgt; k++) ctx.fillRect(x - (hgt - k) * 1.5 + 1.5, yy - k * 1.5, (hgt - k) * 3 - 1.5, 1.5);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1.5, yy - (hgt - 1) * 1.5, 1.5, 1.5);
          }
        }
        if (st === 1) { ctx.fillStyle = 'rgba(255,60,60,.8)'; ctx.fillRect(x0, y0, w, 1.5); ctx.fillRect(x0, y0 + h - 1.5, w, 1.5); ctx.fillRect(x0, y0, 1.5, h); ctx.fillRect(x0 + w - 1.5, y0, 1.5, h); }
      }
    }
  }
  // ---- characters ----
  function shadow(x, y, r, a = 0.3) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.beginPath(); ctx.ellipse(x, y + r * 0.75, r * 0.95, r * 0.4, 0, 0, 7); ctx.fill(); }
  function eyes(x, y, r, look, col = '#fff', pupil = '#111', sep = 0.38) {
    const lx = Math.cos(look) * r * 0.12, ly = -Math.sin(look) * r * 0.12;
    for (const s of [-1, 1]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + s * r * sep, y - r * 0.1, r * 0.2, 0, 7); ctx.fill(); ctx.fillStyle = pupil; ctx.beginPath(); ctx.arc(x + s * r * sep + lx, y - r * 0.1 + ly, r * 0.1, 0, 7); ctx.fill(); }
  }

  function drawFin(e, x, y) {   // blade shark under the floor: only the fin and its wake show
    const wind = e.st === 'wind';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 2; k++) { const kk = (globalT * 1.6 + k / 2 + e.phase) % 1; ctx.strokeStyle = `rgba(170,220,255,${0.6 * (1 - kk)})`; ctx.beginPath(); ctx.ellipse(x, y + 3, 10 + kk * 24, 4 + kk * 9, 0, 0, 7); ctx.stroke(); }
    if (wind) { const k = Math.min(1, e.t / 0.5); ctx.strokeStyle = `rgba(255,80,60,${0.4 + k * 0.5})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y + 3, 14 + k * 18, 6 + k * 8, 0, 0, 7); ctx.stroke(); }
    const view=ZAKO4.has(e.type)?zakoFacing(e):null;
    SPR.draw(ctx,SPR.enemy('sharkfin',{view:view&&view.face,motion7:view?{fin:1}:null,st:e.st,f:Math.floor(globalT*8+e.phase),flip:!view&&e.vx<0}),x,y+4);
    if (wind) { ctx.fillStyle = '#ff4040'; ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 3; ctx.font = `bold 16px ${FONT}`; ctx.textAlign = 'center'; ctx.strokeText('!', x, y - 30); ctx.fillText('!', x, y - 30); }
  }
  // ---- weapon arms of the humanoid zako (指示: 腕を振って武器を振る). Poses: ha/hr = hand angle/reach from the shoulder, wa = weapon angle ----
  const ZP = {
    goblin: { rest: { lean: 0, cr: 0, sp: 0, ha: 1.35, hr: 0.85, wa: -0.8 }, up: { lean: -2, cr: -1, sp: -1, ha: -1.2, hr: 1, wa: -2.0 }, hit: { lean: 3, cr: 2, sp: 1, ha: 0.55, hr: 1, wa: 1.0 }, low: { lean: 2, cr: 1.5, sp: 1, ha: 1.0, hr: 0.95, wa: 1.45 } },
    skeleton: { rest: { lean: 0, cr: 0, sp: 0, ha: 1.25, hr: 0.85, wa: 1.2 }, up: { lean: -2, cr: -1, sp: -1, ha: -1.9, hr: 1, wa: -2.05 }, hit: { lean: 3, cr: 2, sp: 1, ha: 0.6, hr: 1, wa: 0.55 }, low: { lean: 2, cr: 1.5, sp: 1, ha: 1.3, hr: 0.95, wa: 1.6 } },
    knight: { rest: { lean: 0, cr: 0, sp: 0, ha: 1.35, hr: 0.75, wa: -1.57 }, up: { lean: -2, cr: -1, sp: -1, ha: 2.9, hr: 0.45, wa: -0.05 }, hit: { lean: 3, cr: 2, sp: 1, ha: 0.0, hr: 1, wa: 0.0 }, low: { lean: 2, cr: 1.5, sp: 1, ha: 1.25, hr: 0.95, wa: 1.3 } },
    fishman: { rest: { lean: 0, cr: 0, sp: 0, ha: 1.35, hr: 0.8, wa: -1.45 }, up: { lean: -2, cr: -1, sp: -1, ha: -2.3, hr: 0.8, wa: 0.15 }, hit: { lean: 3, cr: 2, sp: 1, ha: 0.2, hr: 1, wa: 0.3 }, low: { lean: 2, cr: 1.5, sp: 1, ha: 0.9, hr: 0.95, wa: 0.85 } },
  };
  const lerpP = (a, b, k) => lerpO(a, b, k);
  const easeOut = k => 1 - (1 - k) ** 3;
  function zakoArm(e) {
    const base = VARIANTS[e.type] ? VARIANTS[e.type][0] : e.type, Z = ZP[base]; if (!Z) return null;
    if (e._ps !== e.st) { e._pp = e._ps; e._ps = e.st; e._p0 = globalT; }
    const since = globalT - e._p0, prev = e._pp, cl = v => clamp(v, 0, 1);
    const idle = () => {   // back to rest after an attack, then a little breathing
      const from = prev === 'slash' ? Z.low : prev === 'dash' ? (e.ai === 'guard' ? Z.hit : Z.low) : prev === 'tired' ? Z.low : null;
      const r0 = Object.assign({}, Z.rest, { wa: Z.rest.wa + Math.sin(globalT * 2.4 + e.phase * 6) * 0.1, sp: null });
      return from && since < 0.4 ? lerpP(from, r0, easeIO(cl(since / 0.4))) : r0;
    };
    if (e.ai === 'swing') {
      if (e.st === 'wind') { const again = prev === 'slash'; return lerpP(again ? Z.low : Z.rest, Z.up, easeOut(cl(since / (again ? 0.2 : 0.42)))); }
      if (e.st === 'slash') { const k = cl(e.t / 0.2); return k < 0.55 ? lerpP(Z.up, Z.hit, easeIn(k / 0.55)) : lerpP(Z.hit, Z.low, easeOut((k - 0.55) / 0.45)); }
      return idle();
    }
    if (e.ai === 'lunge') {
      if (e.st === 'wind') { const again = prev === 'dash'; return lerpP(again ? Z.low : Z.rest, Z.up, easeOut(cl(since / (again ? 0.18 : e.windT * 0.8)))); }
      if (e.st === 'dash') { const k = cl(e.t / 0.22); return k < 0.6 ? lerpP(Z.up, Z.hit, easeIn(k / 0.6)) : lerpP(Z.hit, Z.low, easeOut((k - 0.6) / 0.4)); }
      return idle();
    }
    if (e.ai === 'guard') {
      if (e.st === 'wind') return lerpP(prev === 'dash' ? Z.hit : Z.rest, Z.up, easeOut(cl(since / 0.3)));   // draws the sword back
      if (e.st === 'dash') return lerpP(Z.up, Z.hit, easeIn(cl(e.t / 0.1)));                               // thrust
      if (e.st === 'tired') return lerpP(Z.hit, Z.low, easeIO(cl(since / 0.35)));                            // the point drops to the floor
      return idle();
    }
    return null;
  }
  // Draw-only state. Movement, collision and attack timing are never changed here.
  const ZAKO4 = new Set(['frostlizard','lavagolem','crimsonknight','snowwolf','sleepshroom','poisonspider','deepfishman','goldscorpion','cursemummy','iceimp','icewyvern','shadowarmor','goldslime','pinkdiamondslime','basilisk','clown','fireslime','iceslime','vampbat','hobgoblin','firearcher','generalskel','wraith','frostmage','darkpriest','archdemon','bomber','minotaur','mantis','snowman','assassin','stormeagle','dullahan','shark','chaosbeast','harpy','crossbow','clockwork','starspirit','fireelem','ghostpirate','dwarf','magicmirror','bonewyvern','book','armor','mimic','angler','jelly','hellhound','fairy','baku','gargoyle','angel','slime','bat','goblin','archer','skeleton','ghost','mage','lizard','golem','knight','imp','wolf','mushroom','spider','fishman','scorpion','mummy','toad','mandrake','wyvern']);
  function clockSpin6(e){return (Math.round(e.t*2.5*32)%32)*Math.PI*2/32;}
  function zakoBase(t) { return VARIANTS[t] ? VARIANTS[t][0] : ['goldslime','pinkdiamondslime'].includes(t) ? 'slime' : t; }
  function zakoFacing(e) {
    let dx=hero.x-e.x,dy=hero.y-e.y;
    const locked=(e.ai==='shark'&&e.st==='leap')||(e.type==='clockwork'&&e.st==='spin')||(e.st==='wind'&&e.ai!=='slam')||e.st==='dash'||e.st==='slash'||e.st==='fire';
    if(e.type==='clockwork'&&e.st==='spin'){const a=clockSpin6(e);dx=Math.cos(a);dy=-Math.sin(a);}
    else if(e.ai==='shark'&&e.st==='leap'){dx=e.vx;dy=e.vy;}
    else if((e.ai==='shark'||e.ai==='dullahan')&&e.st==='wind'){dx=hero.x-e.x;dy=hero.y-e.y;}
    else if(e.ai==='gaze'&&(e.st==='wind'||e.st==='gaze')){const cone=zones.find(z=>z.src===e&&!z.dead),a=cone?cone.ang:e.face;dx=Math.cos(a);dy=Math.sin(a);}
    else if(e.ai==='guard'){dx=Math.cos(e.face);dy=Math.sin(e.face);}
    else if(locked){if(e.ai==='lunge'||e.type==='minotaur'){dx=e.lx;dy=e.ly;}else{dx=Math.cos(e.face);dy=Math.sin(e.face);}}
    else if(e.ai!=='phase'&&e.st!=='wind'&&e.st!=='aim'&&hyp(e.vx,e.vy)>18){dx=e.vx;dy=e.vy;}
    const angle=Math.atan2(dy,dx),wanted=face4(angle);
    let s=e.zakoView;
    if(!s)s=e.zakoView={face:wanted,candidate:wanted,since:globalT,st:e.st,changed:globalT,prev:e.st};
    if(e.st!==s.st){s.prev=s.st;s.st=e.st;s.changed=globalT;}
    if(locked||e.st==='aim'||(e.ai==='gaze'&&e.st==='gaze')){s.face=wanted;s.candidate=wanted;s.since=globalT;}
    else {
      // Keep the current facing in a 10 degree margin around the diagonal.
      const center={r:0,b:Math.PI/2,l:Math.PI,f:-Math.PI/2}[s.face],delta=Math.abs(Math.atan2(Math.sin(angle-center),Math.cos(angle-center)));
      if(wanted===s.face||delta<Math.PI/4+.17){s.candidate=s.face;s.since=globalT;}
      else if(s.candidate!==wanted){s.candidate=wanted;s.since=globalT;}
      else if(globalT-s.since>=.15)s.face=wanted;
    }
    return s;
  }
  function skeletonUpSlash(e,view) {
    if(!['skeleton','generalskel'].includes(e.type)||view.face!=='b')return null;
    const arc0=-e.face-1.25, arc1=-e.face+1.25, rest=Math.PI-1.2,
      turn=(a,b,k)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*k;
    if(e.st==='wind') {
      const k=easeIO(clamp(e.t/.5,0,1));
      return {a:turn(rest,arc0,k),w:k};
    }
    if(e.st==='slash')return {a:lerp(arc0,arc1,easeIO(clamp(e.t/.2,0,1))),w:1};
    const since=globalT-view.changed;
    if(view.prev==='slash'&&since<.4) {
      const k=easeIO(clamp(since/.4,0,1));
      return {a:turn(arc1,rest,k),w:1-k};
    }
    return null;
  }
  function zakoMotion2(e,view) {
    if(e.type==='wraith'||e.type==='frostmage')e={...e,type:VARIANTS[e.type][0]};
    if(!['ghost','mage','lizard','golem','knight'].includes(e.type))return null;
    const q=v=>Math.round(v*16)/16, since=globalT-view.changed;
    const m=view.motion||(view.motion={cd:e.cd,fireAt:-100});
    if(e.cd>m.cd+.1)m.fireAt=globalT;m.cd=e.cd;
    const p={raise:0,drop:0,impact:0,jaw:0,pulse:0,weight:0,extend:0,theta:0};
    if(e.type==='ghost')p.pulse=Math.max(0,1-(globalT-m.fireAt)/.35);
    if(e.type==='mage')p.raise=e.st==='cast'?easeIO(clamp(e.t/.6,0,1)):view.prev==='cast'?1-easeIO(clamp(since/.35,0,1)):0;
    if(e.type==='lizard')p.jaw=e.st==='wind'?easeIO(clamp(e.t/.42,0,1)):e.st==='fire'?1:view.prev==='fire'?1-easeIO(clamp(since/.3,0,1)):0;
    if(e.type==='golem') {
      if(e.st==='wind') {const strike=easeIn(clamp((e.t-.5)/.2,0,1));p.raise=easeIO(clamp(e.t/.5,0,1))*(1-strike);p.impact=strike;p.drop=-p.raise+3*strike;}
      else if(view.prev==='wind'){p.impact=1-easeIO(clamp(since/.3,0,1));p.drop=3*p.impact;}
    }
    if(e.type==='knight') {
      if(e.st==='wind'){p.weight=easeIO(clamp(e.t/.3,0,1));p.extend=-2;}
      else if(e.st==='dash'){p.weight=1;p.extend=lerp(-2,8.5,easeIO(clamp(e.t/.1,0,1)));}
      else if(e.st==='tired'){const k=easeIO(clamp(e.t/.35,0,1));p.weight=1-k;p.extend=8.5*(1-k);}
      if(p.weight>0)p.theta=Math.round(-e.face*20)/20;
    }
    for(const k of Object.keys(p))if(k!=='theta')p[k]=q(p[k]);return p;
  }
  function zakoMotion3(e,view) {
    if(!['imp','wolf','mushroom','spider','fishman'].includes(e.type))return null;
    const q=v=>Math.round(v*16)/16,since=globalT-view.changed,state=view.motion3||(view.motion3={cd:e.cd,fireAt:-100});
    if(e.cd>state.cd+.1)state.fireAt=globalT;state.cd=e.cd;
    const p={pulse:0,swell:0,crouch:0,dash:0,jaw:0,weight:0,theta:0,face:0};
    if(e.type==='imp')p.pulse=Math.max(0,1-(globalT-state.fireAt)/.3);
    if(e.type==='mushroom')p.swell=e.st==='swell'?easeIO(clamp(e.t/.55,0,1)):view.prev==='swell'?1-easeIO(clamp(since/.3,0,1)):0;
    if(e.type==='spider')p.crouch=e.st==='aim'?easeIO(clamp(e.t/.45,0,1)):view.prev==='aim'?1-easeIO(clamp(since/.25,0,1)):0;
    if(e.type==='wolf') {
      p.crouch=e.st==='wind'?easeIO(clamp(e.t/e.windT,0,1)):0;
      p.dash=e.st==='dash'?easeIO(clamp(e.t/.08,0,1)):view.prev==='dash'?1-easeIO(clamp(since/.2,0,1)):0;p.jaw=Math.max(p.crouch*.6,p.dash);
    }
    if(e.type==='fishman') {
      const center=-e.face,a0=center-.65,a1=center+.65;
      if(e.st==='wind'){p.weight=easeIO(clamp(e.t/.5,0,1));p.theta=a0;}
      else if(e.st==='slash'){p.weight=1;p.theta=lerp(a0,a1,easeIO(clamp(e.t/.2,0,1)));}
      else if(view.prev==='slash'&&since<.4){p.weight=1-easeIO(clamp(since/.4,0,1));p.theta=a1;}
      if(p.weight>0)p.face=center;
    }
    for(const k of Object.keys(p))p[k]=Math.round(p[k]*(k==='theta'||k==='face'?40:16))/(k==='theta'||k==='face'?40:16);return p;
  }
  function zakoMotion4(e,view) {
    if(!['scorpion','mummy','toad','mandrake','wyvern'].includes(e.type))return null;
    const state=view.motion4||(view.motion4={cd:e.cd,fireAt:-100}),since=globalT-view.changed;
    if(e.cd>state.cd+.1)state.fireAt=globalT;state.cd=e.cd;
    const p={ready:0,dash:0,release:0};
    if(e.type==='mummy')p.release=Math.max(0,1-(globalT-state.fireAt)/.35);
    if(e.type==='scorpion'||e.type==='toad'){
      p.ready=e.st==='wind'?easeIO(clamp(e.t/e.windT,0,1)):0;
      p.dash=e.st==='dash'?easeIO(clamp(e.t/.08,0,1)):view.prev==='dash'?1-easeIO(clamp(since/.2,0,1)):0;
    }
    if(e.type==='mandrake')p.ready=e.st==='swell'?easeIO(clamp(e.t/.55,0,1)):view.prev==='swell'?1-easeIO(clamp(since/.3,0,1)):0;
    if(e.type==='wyvern')p.ready=e.st==='wind'?easeIO(clamp(e.t/.42,0,1)):e.st==='fire'?1:view.prev==='fire'?1-easeIO(clamp(since/.3,0,1)):0;
    for(const k of Object.keys(p))p[k]=Math.round(p[k]*16)/16;return p;
  }
  function zakoMotion5(e,view) {
    if(!['book','armor','mimic','angler','jelly','hellhound','fairy','baku','gargoyle','angel'].includes(e.type))return null;
    const since=globalT-view.changed,state=view.motion5||(view.motion5={cd:e.cd,fireAt:-100});
    if(e.cd>state.cd+.1)state.fireAt=globalT;state.cd=e.cd;
    const p={ready:0,dash:0,pulse:0,weight:0,face:0,theta:0,drop:0};
    if(['mimic','hellhound','gargoyle'].includes(e.type)){
      p.ready=e.st==='wind'?easeIO(clamp(e.t/e.windT,0,1)):0;
      p.dash=e.st==='dash'?easeIO(clamp(e.t/.08,0,1)):view.prev==='dash'?1-easeIO(clamp(since/.2,0,1)):0;
    }
    if(e.type==='baku')p.ready=e.st==='swell'?easeIO(clamp(e.t/.55,0,1)):view.prev==='swell'?1-easeIO(clamp(since/.3,0,1)):0;
    if(e.type==='book')p.ready=e.st==='cast'?easeIO(clamp(e.t/.6,0,1)):view.prev==='cast'?1-easeIO(clamp(since/.3,0,1)):0;
    if(e.type==='fairy'||e.type==='angler')p.pulse=Math.max(0,1-(globalT-state.fireAt)/.3);
    if(e.type==='armor'||e.type==='angel'){
      p.face=-e.face;const arc=e.type==='angel'?.42:.55;
      if(e.st==='wind'){p.weight=easeIO(clamp(e.t/.5,0,1));p.theta=p.face-arc;p.ready=p.weight;p.drop=p.weight;}
      else if(e.st==='slash'){p.weight=1;p.theta=p.face-arc+arc*2*easeIO(clamp(e.t/.2,0,1));p.drop=2;}
      else if(view.prev==='slash'){p.weight=1-easeIO(clamp(since/.35,0,1));p.theta=p.face+arc;p.drop=p.weight*2;}
      if(!p.weight){p.face=0;p.theta=0;}
    }
    for(const k of Object.keys(p))p[k]=Math.round(p[k]*(k==='theta'||k==='face'?40:16))/(k==='theta'||k==='face'?40:16);return p;
  }
  function zakoMotion6(e,view){
    if(!['chaosbeast','harpy','crossbow','clockwork','starspirit','fireelem','ghostpirate','dwarf','magicmirror','bonewyvern'].includes(e.type))return null;
    const since=globalT-view.changed,state=view.motion6||(view.motion6={cd:e.cd,fireAt:-100});
    if(e.cd>state.cd+.1)state.fireAt=globalT;state.cd=e.cd;
    const p={ready:0,dash:0,pulse:0,aim:0,face:0,weight:0,theta:0,drop:0,spin:0,key:0};
    if(e.type==='chaosbeast'||e.type==='bonewyvern')p.ready=e.st==='wind'?easeIO(clamp(e.t/.42,0,1)):e.st==='fire'?1:view.prev==='fire'?1-easeIO(clamp(since/.3,0,1)):0;
    if(e.type==='harpy'||e.type==='fireelem'){p.ready=e.st==='wind'?easeIO(clamp(e.t/e.windT,0,1)):0;p.dash=e.st==='dash'?easeIO(clamp(e.t/.08,0,1)):view.prev==='dash'?1-easeIO(clamp(since/.2,0,1)):0;}
    if(e.type==='crossbow'||e.type==='ghostpirate'){
      p.ready=e.st==='aim'?easeIO(clamp(e.t/(e.type==='crossbow'?.85:.7),0,1)):view.prev==='aim'?1-easeIO(clamp(since/.3,0,1)):0;
      p.aim=e.st==='aim'||(view.prev==='aim'&&since<.3)?1:0;p.face=p.aim?-e.face:0;p.pulse=Math.max(0,1-(globalT-state.fireAt)/.25);
    }
    if(e.type==='starspirit')p.ready=e.st==='cast'?easeIO(clamp(e.t/.6,0,1)):view.prev==='cast'?1-easeIO(clamp(since/.3,0,1)):0;
    if(e.type==='clockwork'){p.ready=e.st==='wind'?easeIO(clamp(e.t/.8,0,1)):0;p.spin=e.st==='spin'?clockSpin6(e):0;p.key=e.st==='wind'?Math.round(e.t/.8*32)*Math.PI*2/32:p.spin;}
    if(e.type==='dwarf'){
      p.face=-e.face;const arc=.5;
      if(e.st==='wind'){p.weight=easeIO(clamp(e.t/.5,0,1));p.theta=p.face-arc;p.ready=p.weight;p.drop=p.weight;}
      else if(e.st==='slash'){p.weight=1;p.theta=p.face-arc+arc*2*easeIO(clamp(e.t/.2,0,1));p.drop=2;}
      else if(view.prev==='slash'){p.weight=1-easeIO(clamp(since/.35,0,1));p.theta=p.face+arc;p.drop=p.weight*2;}
      if(!p.weight){p.face=0;p.theta=0;}
    }
    for(const k of Object.keys(p))if(k!=='spin'&&k!=='key')p[k]=Math.round(p[k]*(k==='theta'||k==='face'?64:16))/(k==='theta'||k==='face'?64:16);return p;
  }
  function zakoMotion7(e,view){
    if(!['darkpriest','archdemon','bomber','minotaur','mantis','snowman','assassin','stormeagle','dullahan','shark'].includes(e.type))return null;
    const since=globalT-view.changed,p={ready:0,release:0,dash:0,raise:0,hit:0,drop:0,tired:0,weight:0,face:0,theta:0,cross:0};
    const timing={darkpriest:['cast',.6],bomber:['aim',.75],minotaur:['wind',.9],snowman:['aim',.9],stormeagle:['cast',.7],dullahan:['wind',.65]};
    if(timing[e.type]){const[st,time]=timing[e.type];p.ready=e.st===st?easeIO(clamp(e.t/time,0,1)):view.prev===st?1-easeIO(clamp(since/.3,0,1)):0;}
    if(e.type==='bomber')p.release=e.st==='throw'?1-easeIO(clamp(e.t/.3,0,1)):0;
    if(e.type==='minotaur'){p.dash=e.st==='dash'?easeIO(clamp(e.t/.1,0,1)):0;p.tired=e.st==='tired'?1:0;}
    if(e.type==='archdemon'){
      if(e.st==='wind'){p.raise=e.t<.5?easeIO(clamp(e.t/.5,0,1)):1-easeIO(clamp((e.t-.5)/.2,0,1));p.hit=easeIO(clamp((e.t-.5)/.2,0,1));p.drop=p.hit*3;}
      else if(view.prev==='wind'){p.hit=1-easeIO(clamp(since/.3,0,1));p.drop=p.hit*3;}
      p.ready=p.raise;
    }
    if(e.type==='mantis'||e.type==='assassin'){
      const time=e.type==='mantis'?.5:.55,slash=e.type==='mantis'?.2:.18,arc=e.type==='mantis'?.5:.35;p.face=-e.face;
      if(e.st==='wind'){p.weight=easeIO(clamp(e.t/time,0,1));p.theta=e.type==='mantis'?p.face:p.face-arc;p.cross=arc;p.ready=p.weight;}
      else if(e.st==='slash'){const t=easeIO(clamp(e.t/slash,0,1));p.weight=1;p.theta=e.type==='mantis'?p.face:p.face-arc+arc*2*t;p.cross=arc*(1-t*2);}
      else if(view.prev==='slash'||e.st==='recover'){p.weight=1-easeIO(clamp((e.st==='recover'?e.t:since)/.35,0,1));p.theta=e.type==='mantis'?p.face:p.face+arc;p.cross=-arc;}
      if(!p.weight){p.face=0;p.theta=0;p.cross=0;}
    }
    for(const k of Object.keys(p))p[k]=Math.round(p[k]*(k==='face'||k==='theta'||k==='cross'?64:16))/(k==='face'||k==='theta'||k==='cross'?64:16);return p;
  }
  function zakoMotion8(e,view){
    if(e.type!=='basilisk'&&e.type!=='clown')return null;
    const ready=e.type==='basilisk'?(e.st==='wind'?easeIO(clamp(e.t/.95,0,1)):e.st==='gaze'?1:view.prev==='gaze'?1-easeIO(clamp((globalT-view.changed)/.3,0,1)):0):(e.st==='aim'?easeIO(clamp(e.t/.65,0,1)):0);
    const phase=view.motion8||(view.motion8={loop:(globalT*1.25)%1,last:globalT});
    phase.loop=(phase.loop+Math.max(0,globalT-phase.last)*(e.st==='aim'?2.5:1.25))%1;phase.last=globalT;
    return {ready:Math.round(ready*16)/16,loop:e.type==='clown'?Math.round(phase.loop*24)/24*Math.PI*2:0};
  }
  function drawEnemy(e) {
    const x = e.x, y = sy(e.y), r = e.r;
    if (y < -70 || y > H + 70) return;
    if (e.ai === 'shark' && e.sub) { if(y>=0&&y<=H&&x+(arena?W/2-bcamX:WX)>0&&x+(arena?W/2-bcamX:WX)<W)bestEncounter('enemy:'+e.type);drawFin(e, x, y); return; }
    ctx.save();
    if (e.ai === 'phase' || e.ai === 'assassin') ctx.globalAlpha = e.alpha;
    const fly = e.fly ? 6 + Math.sin(e.t * 5) * 3 : 0, lift = e.ai === 'shark' && e.st === 'leap' ? Math.sin(Math.min(1, e.t / 0.4) * Math.PI) * 26 : 0;
    shadow(x, y, r * 0.8, e.fly ? 0.18 : 0.3);
    const yy = y - fly - lift;
    const hurt = e.hurt > 0;
    const telegraph = e.st === 'wind' || e.st === 'aim' || e.st === 'cast' || e.st === 'swell';
    // gameplay telegraphs under the sprite
    if (e.st === 'wind') {
      if (e.ai === 'swing') { ctx.fillStyle = 'rgba(255,60,60,.18)'; ctx.beginPath(); ctx.moveTo(x, yy); ctx.arc(x, yy, e.mod.reach || 72, -e.face - 1.25, -e.face + 1.25); ctx.fill(); }
      else if (e.ai === 'assassin') { ctx.fillStyle = e.critNext ? 'rgba(255,200,40,.3)' : 'rgba(255,60,60,.18)'; ctx.beginPath(); ctx.moveTo(x, yy); ctx.arc(x, yy, 72, -e.face - 1.2, -e.face + 1.2); ctx.fill(); if (e.critNext) { ctx.strokeStyle = `rgba(255,230,120,${0.5 + 0.4 * Math.sin(globalT * 20)})`; ctx.lineWidth = 2; ctx.stroke(); } }
      else if (e.ai === 'charge') { const k = Math.min(1, e.t / 0.9), L = 250; ctx.strokeStyle = `rgba(20,10,20,${0.3 + k * 0.3})`; ctx.lineWidth = 2 * r + 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + e.lx * L, y - e.ly * L); ctx.stroke(); ctx.strokeStyle = `rgba(255,70,50,${0.4 + k * 0.6})`; ctx.lineWidth = 3 + Math.round(k * 2) * 1.5; ctx.setLineDash([9, 7]); ctx.stroke(); ctx.setLineDash([]); }
      else if (e.ai === 'breath') { ctx.fillStyle = 'rgba(255,120,40,.2)'; ctx.beginPath(); ctx.moveTo(x, yy); ctx.arc(x, yy, 120, -e.face - 0.35, -e.face + 0.35); ctx.fill(); }
      else if (e.ai === 'slam') { ctx.strokeStyle = `rgba(255,80,60,${Math.min(1, e.t)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, yy, 100 * Math.min(1, e.t / 0.7), 0, 7); ctx.stroke(); }
      else if (e.ai === 'spin') { ctx.strokeStyle = `rgba(255,190,80,${0.3 + Math.min(0.6, e.t)})`; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(x, yy, 40, globalT * 6, globalT * 6 + 5.5); ctx.stroke(); ctx.setLineDash([]); }
      else if (e.ai === 'guard') { ctx.strokeStyle = 'rgba(255,60,60,.6)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + Math.cos(e.face) * 120, yy - Math.sin(e.face) * 120); ctx.stroke(); ctx.setLineDash([]); }
    }
    if (e.st === 'aim' && (e.ai === 'shooter' || e.ai === 'web' || e.ai === 'roll')) {
      ctx.strokeStyle = e.ai === 'shooter' ? `rgba(255,80,80,${0.3 + e.t})` : 'rgba(220,235,255,.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(hero.x, sy(hero.y)); ctx.stroke(); ctx.setLineDash([]);
    }
    if (e.guard) { ctx.strokeStyle = `rgba(160,210,255,${0.25 + 0.2 * Math.sin(globalT * 8)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, yy, r + 4, -e.face - 1, -e.face + 1); ctx.stroke(); }
    // the monster itself (pixel sprite, feet on the shadow, turned toward the hero)
    const moving = hyp(e.vx, e.vy) > 12;
    const f = Math.floor((globalT + e.phase) * (e.ai === 'flutter' || e.ai === 'imp' ? (e.type === 'jelly' ? 5 : 10) : e.type === 'clown' || e.type === 'stormeagle' ? 8 : 4));
    const step = moving ? (Math.sin((globalT + e.phase) * 11) > 0 ? 1 : -1) : 0;
    const arm = zakoArm(e), bx = arm ? x + arm.lean * SPR.SCALE * (hero.x < e.x - 2 ? -1 : 1) : x, byy = arm ? yy + arm.cr * SPR.SCALE : yy;   // the body leans back into the wind-up and steps into the blow
    const view = ZAKO4.has(e.type) ? zakoFacing(e) : null;
    pfxEnemyBreath(e,yy,view,true);
    // colour variants (フロストリザード…ゴールデンスライム) move exactly like the monster they are made from
    const em = view && zakoBase(e.type) !== e.type ? Object.assign({}, e, { type: zakoBase(e.type) }) : e;
    const spr = SPR.enemy(e.type, { view:view&&view.face, upSlash:view?skeletonUpSlash(em,view):null, motion:view?zakoMotion2(em,view):null, motion3:view?zakoMotion3(em,view):null, motion4:view?zakoMotion4(em,view):null, motion5:view?zakoMotion5(em,view):null, motion6:view?zakoMotion6(em,view):null, motion7:view?zakoMotion7(em,view):null, motion8:view?zakoMotion8(em,view):null, bodyX:view&&arm?Math.round(arm.lean*(view.face==='r'?1:view.face==='l'?-1:0)):0, bodyY:view&&arm?Math.round(arm.cr):0, pull:e.st==='aim'?easeIO(clamp(e.t/.55,0,1)):0, release:view&&view.prev==='aim'?Math.max(0,1-(globalT-view.changed)/.2):0, st: e.st, f: e.st === 'spin' ? Math.floor(globalT * 16) : f, step: arm && arm.sp != null ? Math.round(arm.sp) : step, k: e.st === 'slash' ? e.t / 0.2 : 0, flip: !view && hero.x < e.x - 2, flash: hurt, perch: e.mod.stone && !e.awake, shine: e.shine, w: e.st === 'aim' || e.st === 'wind' ? Math.min(1, e.t / 0.9) : 0, crit: e.critNext, head: !e.headOut, arm });
    if(!bestPainting&&e.alpha>=.15&&spr){const left=x+(arena?W/2-bcamX:WX)-spr.ax*SPR.SCALE,top=yy+r*.75-spr.ay*SPR.SCALE;if(left<W&&left+spr.c.width*SPR.SCALE>0&&top<H&&top+spr.c.height*SPR.SCALE>0)bestEncounter('enemy:'+e.type);}
    if(!ZAKO4.has(e.type)&&R3[e.type] && R3[e.type].enemy) drawR3Enemy(e,R3[e.type],x,yy+r*.75,hurt);
    else {
      const hop=['slime','fireslime','iceslime','goldslime','pinkdiamondslime'].includes(e.type)&&e.st==='hop'?Math.sin(clamp(e.t/.38,0,1)*Math.PI)*7:0;
      SPR.draw(ctx, spr, view?x:bx, (view?yy:byy) + r * .75-hop);
    }
    pfxEnemyBreath(e,yy,view,false);pfxEnemyMelee(e,x,yy);
    if (e.ai === 'swing' && e.st === 'slash') { ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(x, yy, (e.mod.reach || 72) - 8, -e.face - 1.25, -e.face + 1.25); ctx.stroke(); }
    if (e.ai === 'assassin' && e.st === 'slash') { ctx.strokeStyle = e.critNext ? 'rgba(255,220,90,.75)' : 'rgba(255,255,255,.55)'; ctx.lineWidth = e.critNext ? 12 : 9; ctx.beginPath(); ctx.arc(x, yy, 60, -e.face - 1.2, -e.face + 1.2); ctx.stroke(); }
    if (telegraph && e.ai !== 'swing') { const top = yy + r * 0.75 - (spr ? spr.ay * SPR.SCALE : r * 2), mk2 = e.critNext ? '!!' : '!'; ctx.fillStyle = e.critNext ? '#ffd23a' : '#ff4040'; ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 3; ctx.font = `bold 16px ${FONT}`; ctx.textAlign = 'center'; ctx.strokeText(mk2, x, top - 2); ctx.fillText(mk2, x, top - 2); }
    ctx.restore();
    if (e.st === 'spin') { ctx.strokeStyle = 'rgba(255,240,180,.55)'; ctx.lineWidth = 3; for (let k = 0; k < 2; k++) { const a = globalT * 20 + k * Math.PI; ctx.beginPath(); ctx.arc(x, yy, r + 14, a, a + 1.4); ctx.stroke(); } }
    if (e.shine) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(200,230,255,${0.18 + 0.12 * Math.sin(globalT * 20)})`; ctx.beginPath(); ctx.arc(x, yy - r * 0.4, r + 12, 0, 7); ctx.fill(); ctx.restore(); }
    if (e.zap > 0) { ctx.strokeStyle = Math.floor(globalT * 20) % 2 ? '#fff6a0' : '#ffe14a'; ctx.lineWidth = 1.5; for (let k = 0; k < 2; k++) { const a = globalT * 9 + k * 3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r, yy - r * 0.4 + Math.sin(a) * r * 0.6); ctx.lineTo(x + Math.cos(a + 0.5) * r * 0.5, yy - r * 0.4); ctx.lineTo(x + Math.cos(a + 1) * r, yy - r * 0.4 - Math.sin(a + 1) * r * 0.6); ctx.stroke(); } }
    if (e.type === 'goldslime') for (let k = 0; k < 3; k++) { const kk = (globalT * 1.4 + k / 3) % 1; ctx.fillStyle = `rgba(255,250,200,${1 - kk})`; ctx.fillRect(q(x + Math.sin(k * 2.4 + Math.floor(globalT)) * r), q(yy - r - kk * 20), 3, 3); }
    if(e.type==='pinkdiamondslime')for(let k=0;k<3;k++){const kk=(globalT*1.6+k/3)%1;ctx.fillStyle=`rgba(255,210,243,${1-kk})`;ctx.fillRect(q(x+Math.sin(k*2.4+Math.floor(globalT))*r),q(yy-r-kk*20),3,3);}
    if (e.hp < e.maxHp) { const w = Math.max(24, r * 2); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - w / 2, y + r + 4, w, 4); ctx.fillStyle = '#e5483c'; ctx.fillRect(x - w / 2, y + r + 4, w * e.hp / e.maxHp, 4); }
  }

  // pixel sprite of the hero for the current motion
  function heroSprite(h) {
    const sp = hyp(h.vx, h.vy), ram = sp > RAM_MIN && state !== 'town';
    const c = Math.cos(h.face), s = Math.sin(h.face);
    const dir = Math.abs(c) > Math.abs(s) * 1.1 ? (c > 0 ? 'right' : 'left') : (s > 0 ? 'up' : 'down');
    const moving = sp > 30, ph = (h.walk || 0) * 0.07;
    const step = moving ? (Math.sin(ph) > 0.3 ? 1 : Math.sin(ph) < -0.3 ? -1 : 0) : 0;
    return SPR.hero({ dir, step, dash: ram && dir !== 'down', hurt: h.inv > 0.55, blink: !moving && (globalT % 3.1) < 0.12, bob: !moving && (globalT % 1.1) < 0.55 ? 1 : 0, wave: Math.floor(globalT * 10) % 2, w: visOf(save.eq.weapon), a: visOf(save.eq.armor) });
  }

  function drawHero() {
    const h = hero, x = h.x, y = sy(h.y), sp = heroSpeed(), ram = sp > RAM_MIN;
    const spr = heroSprite(h);
    for (const p of h.trail) SPR.draw(ctx, spr, p.x, sy(p.y) + h.r * 0.75, p.a * 0.22);   // after-images while charging
    if (h.hist && h.hist.length >= 22) {   // ぶんしん
      const [cx, cy] = h.hist[0], cyy = sy(cy) + HERO_R * 0.75;
      SPR.draw(ctx, spr, cx, cyy, 0.5); ctx.save(); ctx.globalCompositeOperation = 'lighter'; SPR.draw(ctx, spr, cx, cyy, 0.35); ctx.restore();
    }
    if (h.inv > 0 && !(h.roll > 0)) ctx.globalAlpha = 0.55 + 0.35 * Math.cos(h.inv * 18);   // soft pulse instead of a hard 20Hz blink
    shadow(x, y, h.r);
    // charge aura: shows the hit will count
    if (ram && !(h.roll > 0)) {   // (a roll doesn't attack, so no aura)
      const k = Math.min(1, (sp - RAM_MIN) / 350);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,${180 - k * 80},60,${0.22 + k * 0.25})`; ctx.beginPath(); ctx.ellipse(x, y, h.r * (1.4 + k * 0.5), h.r * (1.6 + k * 0.5), 0, 0, 7); ctx.fill();
      ctx.restore();
    }
    const giant = h.pw && h.pw.kind === 'giant', fy = y + h.r * 0.75;
    const rel = save.eq.charm && /^c1[1-5]$/.test(save.eq.charm) ? save.eq.charm : null;   // the trial charms float beside you
    const relA = globalT * 1.7, relX = x + Math.cos(relA) * 17, relY = y - 26 + Math.sin(relA * 2) * 3, relBehind = Math.sin(relA) < 0;
    const drawRel = () => { const rs = SPR.relic(rel, Math.floor(globalT * 6)); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(q(relX - 4.5), q(y + 4), 9, 3); SPR.draw(ctx, rs, relX, relY); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.18 + 0.1 * Math.sin(globalT * 5); ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.arc(relX, relY, 9, 0, 7); ctx.fill(); ctx.restore(); };
    if (rel && relBehind) drawRel();
    if (giant) { ctx.save(); ctx.translate(x, fy); ctx.scale(1.55, 1.55); ctx.translate(-x, -fy); }
    if (h.roll > 0) {   // ころがり: the sprite tumbles once around its middle, tucked a little
      const k = 1 - h.roll / ROLL_T, dirS = Math.cos(h.rollA) >= 0 ? 1 : -1, cy = fy - 30;
      ctx.save(); ctx.translate(x, cy); ctx.rotate(dirS * k * Math.PI * 2); ctx.scale(0.88, 0.88); SPR.draw(ctx, spr, 0, 30); ctx.restore();
    } else SPR.draw(ctx, h.stun > 0 && h.stunKind === 'stone' ? SPR.stoneOf(spr) : spr, x, fy);
    if (rel && !relBehind) drawRel();
    if (giant) {   // rainbow shimmer, faster as it runs out
      ctx.globalCompositeOperation = 'lighter'; SPR.draw(ctx, spr, x, fy, 0.25 + 0.2 * Math.sin(globalT * (h.pw.t < 2 ? 30 : 14))); ctx.restore();
      const hue = (globalT * 400) % 360; ctx.strokeStyle = `hsla(${hue},100%,70%,.7)`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, h.r + 6, 0, 7); ctx.stroke();
    }
    if (h.stun > 0 && h.stunKind === 'sleep') {   // drifting z's and a dream bubble
      for (let k = 0; k < 3; k++) { const kk = (globalT * 0.9 + k / 3) % 1, zx = q(x + 8 + kk * 14), zy = q(y - h.r - 10 - kk * 26), s3 = k === 1 ? 3 : 1.5; ctx.fillStyle = `rgba(232,200,255,${1 - kk})`; ctx.fillRect(zx, zy, s3 * 3, s3); ctx.fillRect(zx + s3 * 2, zy + s3, s3, s3); ctx.fillRect(zx + s3, zy + s3 * 2, s3, s3); ctx.fillRect(zx, zy + s3 * 3, s3 * 3, s3); }
    }
    if (h.stun > 0 && h.stunKind === 'stone') { ctx.fillStyle = 'rgba(40,36,30,.55)'; for (const [a, b] of [[-6, -18], [3, -10], [-2, -2]]) ctx.fillRect(q(x + a), q(y + b), 4.5, 1.5); }
    if (h.guardT > 0) { ctx.strokeStyle = `rgba(160,210,255,${0.55 + 0.3 * Math.sin(globalT * 12)})`; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.arc(x, y, h.r + 9, 0, 7); ctx.stroke(); }
    if (h.barrierT > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(170,140,255,.16)'; ctx.beginPath(); ctx.arc(x, y - 4, h.r + 14, 0, 7); ctx.fill(); ctx.restore(); ctx.strokeStyle = 'rgba(210,190,255,.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y - 4, h.r + 14, 0, 7); ctx.stroke(); }
    if (h.cryT > 0) for (let k = 0; k < 3; k++) { const kk = (globalT * 1.6 + k / 3) % 1; ctx.fillStyle = `rgba(255,140,80,${0.9 * (1 - kk)})`; ctx.fillRect(q(x - 12 + k * 12), q(y + 8 - kk * 34), 3, 4.5); }
    if (h.holy) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,240,160,${0.2 + 0.1 * Math.sin(globalT * 10)})`; ctx.beginPath(); ctx.arc(x, y - 6, h.r + 8, 0, 7); ctx.fill(); ctx.restore(); }
    if (h.whirlT > 0) { ctx.strokeStyle = 'rgba(200,255,230,.8)'; ctx.lineWidth = 3; for (let k = 0; k < 3; k++) { const a = globalT * 14 + k * 2.09; ctx.beginPath(); ctx.arc(x, y, 70, a, a + 1.1); ctx.stroke(); } }
    if (h.meteor) {   // the target ring, and the rock coming down
      const M = h.meteor, mx = M.x, my = sy(M.y), k = M.t / 0.9;
      ctx.fillStyle = ditherFill('255,120,60', 0.25 + k * 0.35); ctx.beginPath(); ctx.arc(mx, my, 120, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,150,80,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(mx, my, 120 * k, 0, 7); ctx.stroke();
      SPR.draw(ctx, SPR.ENV.flame(Math.floor(globalT * 12), true), mx + (1 - k) * 90, my - (1 - k) * 380);
    }
    if (h.lvFlash > 0) { ctx.strokeStyle = `rgba(242,193,78,${h.lvFlash / 1.6})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, h.r + 8 + (1.6 - h.lvFlash) * 30, 0, 7); ctx.stroke(); }
    if (h.poisonT > 0) { ctx.fillStyle = '#b4f05a'; for (let k = 0; k < 3; k++) { const kk = (globalT * 1.5 + k / 3) % 1; ctx.fillRect(q(x - 9 + k * 9), q(y - h.r - kk * 22), 3, 3); } }
    if (h.slow > 0) { ctx.strokeStyle = 'rgba(235,240,255,.8)'; ctx.lineWidth = 1.5; for (let k = 0; k < 3; k++) { const a = k * 1.05 + 0.3; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * h.r * 1.3, y - Math.sin(a) * h.r * 1.3); ctx.lineTo(x + Math.cos(a) * h.r * 1.3, y + Math.sin(a) * h.r * 1.3); ctx.stroke(); } }
    ctx.globalAlpha = 1;
  }

  // bosses drawn by beasts3.js mark the sweeps they draw themselves (sw.own); the rest is drawn here
  function B3HAS(t) { return typeof BEAST3 !== 'undefined' && BEAST3.has(t); }
  function drawSweeps(B, x, y, r) {   // weapons
    for (const [si,s] of B.sweeps.entries()) {
      if (s.crab && s.t >= s.tele) continue;   // the crab's own claws are the blades
      const ex = x + Math.cos(s.ang) * s.len, ey = y - Math.sin(s.ang) * s.len;
      if (s.t < s.tele) {
        const k = s.t / s.tele;
        ctx.strokeStyle = `rgba(255,60,60,${0.25 + k * 0.4})`; ctx.lineWidth = s.w * 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke(); ctx.lineCap = 'butt';
        ctx.strokeStyle = 'rgba(255,60,60,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, s.len, 0, 7); ctx.stroke();
        continue;
      }
      pfxSweep(s,ex,ey,B);
      for (let k = 1; k <= 4; k++) { const a = s.ang - Math.sign(s.vel) * k * 0.09; ctx.strokeStyle = hexA(s.col, 0.18 / k * 2); ctx.lineWidth = s.w * 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * s.len, y - Math.sin(a) * s.len); ctx.stroke(); }
      if (B3HAS(B.type) ? s.own : ((R3[B.type] && ((B.type==='kraken' && s.kind==='tentacle') || (B.type==='dragon' && s.kind==='tail'))) || (s.own && !(R3[B.type] && R3[B.type].magicSweep)) || (R3[B.type] && R3[B.type].dual && si<2))) continue;   // the held blades already draw their own weapons
      ctx.strokeStyle = s.col; ctx.lineWidth = s.w * (s.kind === 'club' || s.kind === 'tail' ? 2 : 1.2); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + Math.cos(s.ang) * r * 0.6, y - Math.sin(s.ang) * r * 0.6); ctx.lineTo(ex, ey); ctx.stroke(); ctx.lineCap = 'butt';
      if (s.kind === 'scythe') { ctx.strokeStyle = s.col; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(ex, ey, 22, -s.ang - Math.sign(s.vel) * 0.2, -s.ang + Math.sign(s.vel) * 2.2, s.vel > 0); ctx.stroke(); }
      if (s.kind === 'club') { ctx.fillStyle = '#8a5a2a'; ctx.beginPath(); ctx.arc(ex, ey, 16, 0, 7); ctx.fill(); }
    }
  }
  // ===== bosses drawn from parts (指示: 腕を振って武器を振る / 下半身も連動). The arm swings the weapon; the hips drop, turn and
  // shift and the legs bend and step under it, so every swing has the whole body behind it.
  // Lower-body pose: lean = hips sideways, cr = hips drop (< 0 rises up onto the toes), tilt = torso turn (rad), st = feet wider, fL/fR = lift a foot
  const LBP = {
    rest: { lean: 0, cr: 0, tilt: 0, st: 0, fL: 0, fR: 0 },
    up: { lean: -4, cr: -2, tilt: -0.09, st: 2, fL: 0, fR: 4 },      // wound up: rears back, weight on the back foot, the front foot comes up
    slam: { lean: 5, cr: 8, tilt: 0.11, st: 6, fL: 0, fR: 0 },       // stamps down into a deep, wide squat behind the blow
    low: { lean: 4, cr: 7, tilt: 0.12, st: 5, fL: 0, fR: 0 },        // dropped low to scoop
    hi: { lean: -4, cr: -4, tilt: -0.1, st: 2, fL: 4, fR: 0 },       // drives up off the floor
    sideB: { lean: 5, cr: 4, tilt: 0.09, st: 4, fL: 4, fR: 0 },      // coiled to the right
    sideF: { lean: -6, cr: 5, tilt: -0.12, st: 5, fL: 0, fR: 4 },    // the whole body turns through the cut
    ready: { lean: -1, cr: 5, tilt: 0.03, st: 4, fL: 0, fR: 0 },     // crouched to spring
    thrust: { lean: 6, cr: 4, tilt: 0.12, st: 4, fL: 3, fR: 0 },     // driving forward
    point: { lean: 3, cr: 2, tilt: 0.05, st: 3, fL: 0, fR: 0 },
  };
  const withLB = (o, n) => Object.assign({}, o, LBP[n]);
  // ---- cyclops: both arms swing the club ----
  const CYP = {   // ht/hr: right hand (angle, distance from the shoulder); ca: club angle; la/lr: left hand
    rest: withLB({ ht: 1.2, hr: 28, ca: -1.75, la: 1.75, lr: 28 }, 'rest'),     // club resting up against the shoulder
    up: withLB({ ht: -1.6, hr: 32, ca: -2.6, la: -2.3, lr: 30 }, 'up'),         // wound up high, club back over the head
    slam: withLB({ ht: 1.0, hr: 32, ca: 1.25, la: 2.5, lr: 30 }, 'slam'),       // smashed into the ground in front
    low: withLB({ ht: 1.9, hr: 30, ca: 2.6, la: -2.6, lr: 30 }, 'low'),         // scooped low and back
    hi: withLB({ ht: -0.6, hr: 32, ca: -1.1, la: 2.3, lr: 30 }, 'hi'),          // flung up and forward
    sideB: withLB({ ht: -0.4, hr: 32, ca: -0.2, la: 2.9, lr: 30 }, 'sideB'),    // cocked out to the right
    sideF: withLB({ ht: 2.0, hr: 30, ca: 3.0, la: 1.3, lr: 28 }, 'sideF'),      // swung across to the left
    ready: withLB({ ht: -1.0, hr: 30, ca: -1.4, la: 2.0, lr: 28 }, 'ready'),    // held up, about to charge
  };
  const easeIO = k => k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2, easeIn = k => k * k * k;
  function lerpO(a, b, k) { const o = {}; for (const q in a) o[q] = typeof a[q] === 'number' && typeof b[q] === 'number' ? lerp(a[q], b[q], k) : Array.isArray(a[q]) && Array.isArray(b[q]) ? a[q].map((v, i) => lerp(v, b[q][i], k)) : a[q]; return o; }
  function keysAt(P, keys, t) {   // keys: [time, pose, 'in' = a strike (accelerates into the hit)]
    if (t <= keys[0][0]) return P(keys[0][1]);
    for (let i = 1; i < keys.length; i++) {
      const [t1, n1, e] = keys[i]; if (t > t1) continue;
      const [t0, n0] = keys[i - 1], k0 = (t - t0) / Math.max(0.001, t1 - t0);
      return lerpO(P(n0), P(n1), e === 'in' ? easeIn(k0) : easeIO(k0));
    }
    return P(keys[keys.length - 1][1]);
  }
  // the lower body for moves that are not keyframed: sweeping round, running, walking, breathing
  const sweepLB = (sa, act) => { const c = Math.cos(sa); return { lean: c * 6, cr: act ? 6 : 7, tilt: c * 0.12, st: 6, fL: c > 0.3 ? (c - 0.3) * 6 : 0, fR: c < -0.3 ? (-c - 0.3) * 6 : 0 }; };
  const runLB = (B, spd) => { const s = Math.sin(globalT * spd), d = Math.sign(B.vx || 0); return { lean: d * 4, cr: 3 + Math.abs(s) * 1.5, tilt: d * 0.08, st: 2, fL: Math.max(0, s) * 5, fR: Math.max(0, -s) * 5 }; };
  const breathe = () => ({ cr: 0.4 + Math.sin(globalT * 2.2) * 0.4 });
  function settle(B, p, rest) {   // after a move, ease back to the resting pose instead of snapping
    if (p) { B.wrLast = p; B.wrEnd = globalT; return p; }
    if (B.wrLast) { const k = (globalT - B.wrEnd) / 0.45; if (k < 1) return lerpO(B.wrLast, rest, easeIO(k)); B.wrLast = null; }
    return rest;
  }
  function cyPose(B) {
    const mv = B.mv, n = mv ? mv.name : '', t = mv ? mv.t : 0, p2 = B.phase === 2, K = s => keysAt(q => CYP[q], s, t);
    let p = null;
    if (n === 'sweep' && B.sweeps.length) { const sw = B.sweeps[0], sa = -sw.ang; p = Object.assign({ ht: sa, hr: 32, ca: sa, la: sa + Math.PI, lr: 28, sweep: sw }, sweepLB(sa, sw.t >= sw.tele)); }
    else if (n === 'quake') p = K([[0, 'rest'], [0.33, 'up'], [0.45, 'slam', 'in'], [0.6, 'slam'], [0.88, 'up'], [1.0, 'slam', 'in'], [1.15, 'slam'], [1.43, 'up'], [1.55, 'slam', 'in'], [1.85, 'slam'], [2.3, 'rest']]);
    else if (n === 'rocks') p = K([[0, 'rest'], [0.3, 'low'], [0.45, 'hi', 'in'], [0.75, 'low'], [0.9, 'hi', 'in'], [1.2, 'low'], [1.35, 'hi', 'in'], [1.75, 'rest']]);
    else if (n === 'boulders') { const K2 = [[0, 'rest']], c = p2 ? 3 : 2; for (let i = 0; i < c; i++) { const T = 0.6 + i * 0.5; K2.push([T - 0.22, 'sideB'], [T, 'sideF', 'in']); } K2.push([0.6 + c * 0.5 + 0.3, 'rest']); p = K(K2); }
    else if (n === 'charge' || n === 'dash3') p = mv.ph === 'go' ? Object.assign({}, CYP.ready, runLB(B, 16)) : K([[0, 'rest'], [0.35, 'ready']]);
    else if (n === 'jump') {
      if (mv.n === 0) p = K([[0, 'rest'], [0.3, 'up']]);
      else if (mv.n === 1) p = keysAt(q => CYP[q], [[0, 'up'], [0.3, 'slam', 'in']], t - mv.t1);
      else p = keysAt(q => CYP[q], [[0, 'slam'], [0.35, 'slam'], [0.8, 'rest']], t - mv.t1 - 0.3);
    }
    else if (mv) p = K([[0, 'rest'], [0.3, 'ready'], [Math.max(0.6, (mv.dur || 1.6) - 0.3), 'ready'], [Math.max(0.9, mv.dur || 1.9), 'rest']]);
    const b = Math.sin(globalT * 2.2);   // idle: the club rocks a little on the shoulder
    return settle(B, p, Object.assign({}, CYP.rest, { ht: CYP.rest.ht + b * 0.05, ca: CYP.rest.ca + b * 0.07, la: CYP.rest.la - b * 0.06 }, breathe()));
  }
  // ---- lower bodies, in art px from the feet anchor: hip height, hip / foot spread, ankle height, bones, a size factor; capes and tails ----
  const LBD = {
    goblinking: { hipY: -18, hips: 11, feet: 12, ank: -4, L1: 8, L2: 7, p: 'gk', cape: [0, -52, 48], m: 1, front: 1 },   // front: the legs come out over the bottom of the body
    deathknight: { hipY: -28, hips: 9, feet: 10, ank: -9, L1: 10, L2: 9, p: 'dk', cape: [-2, -68, 62], m: 1.15, front: 1 },
    ghostcaptain: { hipY: -38, tail: [0, -38], p: 'gc', m: 1 },
    cyclops: { hipY: -34, hips: 13, feet: 15, ank: -8, L1: 13, L2: 13, p: 'cy', m: 1.4 },
  };
  // the body frame: the torso pivots on its hips. T(art x, art y) -> screen point on the moved / turned torso
  function bodyFrame(L, p, x, yFeet) {
    const K = SPR.SCALE, m = L.m, pv = [x + p.lean * m * K, yFeet + (p.cr * m + L.hipY) * K], c = Math.cos(p.tilt), s = Math.sin(p.tilt);
    return { K, m, pv, rot: p.tilt, T: (ax, ay) => { const dx = ax * K, dy = (ay - L.hipY) * K; return [pv[0] + dx * c - dy * s, pv[1] + dx * s + dy * c]; } };
  }
  function drawTorso(spr, F, L) { ctx.save(); ctx.translate(F.pv[0], F.pv[1]); if (F.rot) ctx.rotate(F.rot); SPR.draw(ctx, spr, 0, -L.hipY * F.K); ctx.restore(); }
  function drawLower(L, F, p, x, yFeet, fl, legsNow) {
    const K = F.K, m = F.m;
    if (legsNow) return drawLegs(L, F, p, x, yFeet, fl);
    if (L.cape) { const top = F.T(L.cape[0], L.cape[1]); pd(P_(L.p + '_cape', {}, fl), top[0], top[1], F.rot * 0.4 + p.lean * m * 0.012, 1, clamp((yFeet - 3 * K - top[1]) / (L.cape[2] * K), 0.7, 1.4)); }   // hangs from the shoulders down to the floor, swinging behind
    if (L.tail) { const top = F.T(L.tail[0], L.tail[1]); pd(P_(L.p + '_tail', { f: Math.floor(globalT * 4) }, fl), top[0], top[1], F.rot * 0.7 + p.lean * m * 0.035, 1, clamp(1 - p.cr * 0.03, 0.75, 1.3)); }   // the ghost's wisp trails the swing
    if (!L.front) drawLegs(L, F, p, x, yFeet, fl);
  }
  function drawLegs(L, F, p, x, yFeet, fl) {
    if (!L.L1) return;
    const K = F.K, m = F.m, L1 = L.L1 * K, L2 = L.L2 * K;
    for (const sd of [-1, 1]) {
      const hip = F.T(sd * L.hips, L.hipY), lift = (sd < 0 ? p.fL : p.fR) * m;
      let ft = [x + sd * (L.feet + p.st * m) * K, yFeet + (L.ank - lift) * K];
      const dx = ft[0] - hip[0], dy = ft[1] - hip[1], d0 = Math.hypot(dx, dy) || 1, d = Math.min(d0, L1 + L2 - 0.5), a = Math.atan2(dy, dx);
      if (d < d0) ft = [hip[0] + Math.cos(a) * d, hip[1] + Math.sin(a) * d];   // fully stretched: the foot leaves the floor
      const off = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
      const k1 = [hip[0] + Math.cos(a + off) * L1, hip[1] + Math.sin(a + off) * L1], k2 = [hip[0] + Math.cos(a - off) * L1, hip[1] + Math.sin(a - off) * L1];
      const kn = (k1[0] - hip[0]) * sd > (k2[0] - hip[0]) * sd ? k1 : k2;   // knees bend outward: a wide, low stance
      pd(P_(L.p + '_thigh', {}, fl), hip[0], hip[1], Math.atan2(kn[1] - hip[1], kn[0] - hip[0]));
      pd(P_(L.p + '_shin', {}, fl), kn[0], kn[1], Math.atan2(ft[1] - kn[1], ft[0] - kn[0]), Math.max(0.6, Math.hypot(ft[0] - kn[0], ft[1] - kn[1]) / L2), 1);
      pd(P_(L.p + '_foot', { m: sd }, fl), ft[0], ft[1]);
    }
  }
  function drawCyclops(B, x, yFeet, yMid, fl) {
    const K = SPR.SCALE, L = LBD.cyclops, p = cyPose(B), p2 = B.phase === 2 ? 1 : 0, mn = B.mv ? B.mv.name : '';
    const act = /laser/.test(mn) && B.mv.t < 1.4 ? 1 : 0, bob = !B.mv && Math.sin(globalT * 2.2) > 0.4 ? 1 : 0;
    const F = bodyFrame(L, p, x, yFeet);
    const sR = F.T(24, -63 + bob), sL = F.T(-26, -63 + bob);
    const hand = [sR[0] + Math.cos(p.ht) * p.hr * K, sR[1] + Math.sin(p.ht) * p.hr * K];
    const lhand = [sL[0] + Math.cos(p.la) * p.lr * K, sL[1] + Math.sin(p.la) * p.lr * K];   // the free hand swings the other way for balance
    const L1 = 18 * K, L2 = 16 * K;
    const arm = (sh, hd, outSide) => {   // two-bone arm; the elbow bends away from the body
      const dx = hd[0] - sh[0], dy = hd[1] - sh[1], d = Math.min(Math.hypot(dx, dy) || 1, L1 + L2 - 0.5), a = Math.atan2(dy, dx);
      const off = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
      const ea1 = a + off, ea2 = a - off, e1x = sh[0] + Math.cos(ea1) * L1, e2x = sh[0] + Math.cos(ea2) * L1;
      const ea = (outSide > 0 ? e1x > e2x : e1x < e2x) ? ea1 : ea2, ex = sh[0] + Math.cos(ea) * L1, ey = sh[1] + Math.sin(ea) * L1;
      pd(P_('cy_upper', {}, fl), sh[0], sh[1], ea);
      pd(P_('cy_fore', {}, fl), ex, ey, Math.atan2(hd[1] - ey, hd[0] - ex), Math.max(0.6, Math.hypot(hd[0] - ex, hd[1] - ey) / L2), 1);
    };
    // the club: in a sweep it reaches all the way out (the swing's hit area); fast swings leave two ghost clubs behind
    let sc = 1; if (p.sweep && p.sweep.t >= p.sweep.tele) sc = Math.max(1, (p.sweep.len - Math.hypot(hand[0] - x, hand[1] - yMid)) / (48 * K));
    const ghosts = B.cyG || (B.cyG = []);
    const club = () => {
      for (let i = 0; i < ghosts.length; i++) { const g0 = ghosts[i]; if (Math.abs(g0[2] - p.ca) > 0.18) pd(P_('cy_club', {}, false), g0[0], g0[1], g0[2], g0[3], 1, 0.22 / (i + 1)); }
      pd(P_('cy_club', {}, fl), hand[0], hand[1], p.ca, sc, sc > 1 ? 1.2 : 1);
    };
    const fists = () => { pd(P_('cy_fist', {}, fl), hand[0], hand[1]); pd(P_('cy_fist', {}, fl), lhand[0], lhand[1]); };
    drawLower(L, F, p, x, yFeet, fl);
    const torso = () => drawTorso(P_('cy_torso', { k: bob, act, p2 }, fl), F, L);
    if (hand[1] < sR[1] - 12 * K) { club(); arm(sR, hand, 1); pd(P_('cy_fist', {}, fl), hand[0], hand[1]); torso(); arm(sL, lhand, -1); pd(P_('cy_fist', {}, fl), lhand[0], lhand[1]); }   // club up behind the head
    else { torso(); arm(sL, lhand, -1); arm(sR, hand, 1); club(); fists(); }
    ghosts.unshift([hand[0], hand[1], p.ca, sc]); if (ghosts.length > 2) ghosts.length = 2;
  }
  // ---- bosses that hold a weapon in one hand: the arm (shoulder → elbow → hand) swings it. hr = reach 0..1 ----
  const WRP = {
    up: withLB({ ht: -1.55, hr: 0.95, ca: -2.15 }, 'up'),         // wound up overhead, the weapon sticking up behind the head
    slam: withLB({ ht: 0.95, hr: 0.95, ca: 1.25 }, 'slam'),       // chopped down in front
    low: withLB({ ht: 1.9, hr: 0.9, ca: 2.6 }, 'low'),            // scooped low
    hi: withLB({ ht: -0.6, hr: 0.95, ca: -1.1 }, 'hi'),           // flung up
    sideB: withLB({ ht: -0.3, hr: 0.95, ca: -0.35 }, 'sideB'),    // cocked out to the right
    sideF: withLB({ ht: 2.15, hr: 0.9, ca: 2.95 }, 'sideF'),      // cut across to the left
    ready: withLB({ ht: -0.9, hr: 0.85, ca: -1.35 }, 'ready'),    // held up, about to rush
    thrust: withLB({ ht: 0.25, hr: 1, ca: 0.3 }, 'thrust'),       // run through, weapon forward
    point: withLB({ ht: -0.35, hr: 1, ca: -0.5 }, 'point'),       // pointed out: "fire!"
  };
  const WR = {   // sh: shoulder (art px from the feet anchor); L1/L2: bones; reach: weapon length; parts prefix
    goblinking: { sh: [20, -41], L1: 11, L2: 10, reach: 42, p: 'gk', rest: withLB({ ht: 1.15, hr: 0.75, ca: -0.7 }, 'rest') },
    deathknight: { sh: [22, -58], L1: 12, L2: 12, reach: 47, p: 'dk', rest: withLB({ ht: 1.4, hr: 0.75, ca: 1.4 }, 'rest') },
    ghostcaptain: { sh: [18, -66], L1: 10, L2: 10, reach: 30, p: 'gc', rest: withLB({ ht: 0.95, hr: 0.9, ca: -0.75 }, 'rest') },
  };
  const hits = (times, a, b, pre = 0.25) => { const K = [[0, 'rest']]; times.forEach((T, i) => { const [w, s] = i % 2 && a === 'sideB' ? [b, a] : [a, b]; K.push([T - pre, w], [T, s, 'in'], [T + 0.14, s]); }); K.push([times[times.length - 1] + 0.55, 'rest']); return K; };
  const hold = (t0, t1) => [[0, 'rest'], [t0 - 0.22, 'up'], [t0, 'point', 'in'], [t1, 'point'], [t1 + 0.4, 'rest']];
  function wrPose(B, def) {
    const mv = B.mv, p2 = B.phase === 2, b = Math.sin(globalT * 2.2);
    const rest = Object.assign({}, def.rest, { ht: def.rest.ht + b * 0.04, ca: def.rest.ca + b * 0.06 }, breathe());
    if (!mv) return settle(B, null, rest);
    const n = mv.name.split(':')[0], t = mv.t, K = s => keysAt(q => q === 'rest' ? def.rest : WRP[q], s, t);
    let p;
    if ((n === 'sweep' || n === 'twin') && B.sweeps.length) {   // the weapon IS the sweep: it reaches out along it
      const sw = B.sweeps[0], sa = -sw.ang, act = sw.t >= sw.tele, back = act ? 0 : Math.sign(sw.vel) * 0.7 * Math.min(1, sw.t / 0.3);
      p = Object.assign({ ht: sa + back * 0.6, hr: act ? 1 : 0.85, ca: sa + back, sweep: sw }, sweepLB(sa + back, act));
    }
    else if (n === 'quake') p = K(hits([0.45, 1.0, 1.55], 'up', 'slam'));
    else if (n === 'rocks') p = K(hits([0.45, 0.9, 1.35], 'low', 'hi'));
    else if (n === 'aimed3' || n === 'aimed5') p = K(hits([0.45, 0.9], 'sideB', 'sideF'));
    else if (n === 'darkwave') p = K(hits(p2 ? [0.5, 1.1, 1.7] : [0.5, 1.1], 'sideB', 'sideF'));
    else if (n === 'bombs') p = K(hits(Array.from({ length: p2 ? 5 : 3 }, (_, i) => 0.4 + i * 0.28), 'low', 'hi', 0.14));
    else if (n === 'ring' || n === 'ringaimed') p = K(hits([0.55], 'up', 'slam', 0.3));
    else if (n === 'triple') p = K(hits([0.4, 0.72, 1.04], 'up', 'slam', 0.18));
    else if (n === 'charge' || n === 'dash3' || n === 'firetrail') p = mv.ph === 'go' ? Object.assign({}, WRP.thrust, runLB(B, 16)) : keysAt(q => q === 'rest' ? def.rest : WRP[q], mv.ph === 'rest' ? [[0, 'thrust'], [0.5, 'rest']] : [[0, mv.k ? 'thrust' : 'rest'], [0.35, 'ready']], mv.pt || 0);
    else if (n === 'stalk') { const s = Math.sin(t * 7); p = Object.assign({}, WRP.ready, { ht: WRP.ready.ht + s * 0.15, ca: WRP.ready.ca + s * 0.25 }, runLB(B, 9), { cr: 3 }); }
    else if (n === 'jump') p = mv.n === 0 ? K([[0, 'rest'], [0.3, 'up']]) : mv.n === 1 ? keysAt(q => q === 'rest' ? def.rest : WRP[q], [[0, 'up'], [0.3, 'slam', 'in']], t - mv.t1) : keysAt(q => q === 'rest' ? def.rest : WRP[q], [[0, 'slam'], [0.35, 'slam'], [0.8, 'rest']], t - mv.t1 - 0.3);
    else if (def.caster && n === 'soulstorm') p = K(hits(p2?[.5,1.6]:[.5],'up','point',.22));
    else if (def.caster && n === 'icecage') p = K([[0,'point'],[.9,'up'],[1.6,'slam','in'],[2.2,'rest']]);
    else if (def.caster && n === 'quicksand') p = K([[0,'point'],[.9,'up'],[1.2,'slam','in'],[2.5,'point'],[3.1,'rest']]);
    else if (def.caster && n === 'illusion') p = K([[0,'ready'],[.3,'up'],[1.4,'point','in'],[1.7,'point'],[2.1,'rest']]);
    else if (def.caster && n === 'scythe') p = K([[0,'sideB'],[.75,'sideF','in'],[1.5,'sideB'],[2.25,'sideF','in'],[2.9,'rest']]);
    else if (def.unarmed && n === 'rocketfist') p = K(hits(p2?[.6,1.7]:[.6],'punchBack','punch',.3));
    else if (n === 'cannons') p = K(p2 ? [[0, 'rest'], [0.15, 'up'], [0.35, 'point', 'in'], [1.3, 'point'], [1.55, 'up'], [1.95, 'point', 'in'], [2.9, 'point'], [3.3, 'rest']] : hold(0.35, 1.3));
    else if (n === 'laser' || n === 'laser3') p = K(hold(0.45, 1.3));
    else if (n === 'cross') p = K(hold(0.6, 3.6));
    else if (n === 'wave') p = K(hold(0.4, 2.2));
    else p = K([[0, 'rest'], [0.3, 'up'], [0.5, 'slam', 'in'], [0.7, 'slam'], [1.1, 'rest']]);   // anything else: a commanding swing as it casts
    return settle(B, p, rest);
  }
  function drawWeaponBoss(B, def, x, yFeet, yMid, spr, fl) {
    const L = LBD[B.type], p = wrPose(B, def), F = bodyFrame(L, p, x, yFeet), K = F.K, LL = (def.L1 + def.L2) * K;
    drawLower(L, F, p, x, yFeet, fl);
    const sh = F.T(def.sh[0], def.sh[1]);
    const hand = [sh[0] + Math.cos(p.ht) * Math.min(p.hr, 0.99) * LL, sh[1] + Math.sin(p.ht) * Math.min(p.hr, 0.99) * LL];
    const L1 = def.L1 * K, L2 = def.L2 * K, dx = hand[0] - sh[0], dy = hand[1] - sh[1], d = Math.max(1, Math.hypot(dx, dy)), a = Math.atan2(dy, dx);
    const off = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const E = [a + off, a - off].map(ea => [sh[0] + Math.cos(ea) * L1, sh[1] + Math.sin(ea) * L1, ea]);
    const el = (E[0][1] - E[0][0] * 0.3) > (E[1][1] - E[1][0] * 0.3) ? E[0] : E[1];   // the elbow drops down and out
    let sc = 1; if (p.sweep && p.sweep.t >= p.sweep.tele) sc = Math.max(1, (p.sweep.len - Math.hypot(hand[0] - x, hand[1] - yMid)) / (def.reach * K));
    const wn = def.p + '_' + (def.p === 'gk' ? 'club' : 'sword'), ghosts = B.wrG || (B.wrG = []);
    const weapon = () => {
      for (let i = 0; i < ghosts.length; i++) { const g0 = ghosts[i]; if (Math.abs(g0[2] - p.ca) > 0.18) pd(P_(wn, {}, false), g0[0], g0[1], g0[2], g0[3], 1, 0.22 / (i + 1)); }
      pd(P_(wn, {}, fl), hand[0], hand[1], p.ca, sc, 1);
    };
    const arm = () => { pd(P_(def.p + '_upper', {}, fl), sh[0], sh[1], el[2]); pd(P_(def.p + '_fore', {}, fl), el[0], el[1], Math.atan2(hand[1] - el[1], hand[0] - el[0]), Math.max(0.6, Math.hypot(hand[0] - el[0], hand[1] - el[1]) / L2), 1); pd(P_(def.p + '_hand', {}, fl), hand[0], hand[1]); };
    const torso = () => { drawTorso(spr, F, L); if (L.front) drawLegs(L, F, p, x, yFeet, fl); };
    if (hand[1] < sh[1] - 10 * K) { weapon(); arm(); torso(); }   // raised overhead: behind the head
    else { torso(); arm(); weapon(); pd(P_(def.p + '_hand', {}, fl), hand[0], hand[1]); }
    ghosts.unshift([hand[0], hand[1], p.ca, sc]); if (ghosts.length > 2) ghosts.length = 2;
  }
  // ===== 3-view rigs (指示: 正面・左右・後ろ). A small 3D skeleton in art px — x = the weapon side, y = down, z = forward —
  // projected for the way the boss faces (front / side / back; left = the side mirrored). The knees bend forward, a stance is a
  // stride, and a swing travels through depth, so the motion reads properly from every angle instead of squatting bow-legged.
  const R3 = {
    deathknight: { p: 'dk3', hipY: -25, hipX: 7, L1: 11, L2: 11, ank: -3, shY: -29, shX: 17, neckY: -35, A1: 12, A2: 12, reach: 47, sword: 'dk_sword', hand: 'dk_hand', upper: 'dk_upper', fore: 'dk_fore', capeY: -31, capeH: 62 },
    goblinking: { p: 'gk3', hipY: -20, hipX: 10, L1: 9, L2: 9, ank: -4, shY: -21, shX: 20, neckY: -26, A1: 11, A2: 10, reach: 36, sword: 'gk_club', hand: 'gk_hand', upper: 'gk_upper', fore: 'gk_fore', capeY: -26, capeH: 44,
      pose: {
        base: { wid: 10, stride: 6, bomb: 0 },
        rest: { hd: [4, 14, 8], oh: [-3, 15, 5], sw: [0.2, 0.8, 0.55], drop: 0.5 },
        ready: { hd: [0, -1, 15], oh: [-3, 8, 10], drop: 2, stride: 9, pitch: 0.06 },
        up: { hd: [-1, -18, -3], oh: [-3, 5, 12], drop: -1, stride: 10, lf: 2, pitch: -0.09 },
        slam: { hd: [0, 8, 17], oh: [-4, 12, -7], drop: 4, sz: 2, pitch: 0.18, stride: 12 },
        low: { hd: [5, 15, -7], oh: [-3, 5, 10], drop: 3, pitch: 0.12, stride: 10 },
        hi: { hd: [2, -17, 8], oh: [-4, 10, -6], drop: -2, stride: 8, lb: 2, pitch: -0.06 },
        sideB: { hd: [10, -3, -10], oh: [-4, 6, 10], drop: 2, stride: 10, yaw: 0.45 },
        sideF: { hd: [-10, 2, 15], oh: [-10, 10, -6], drop: 3, sz: 2, stride: 11, pitch: 0.12, yaw: -0.45 },
        thrust: { hd: [0, -2, 19], oh: [-4, 10, -8], drop: 2, sz: 3, stride: 12, pitch: 0.16, lb: 2 },
        point: { hd: [2, -6, 17], oh: [-4, -4, 15], drop: 1, stride: 8 },
        bombUp: { hd: [4, 14, 5], oh: [-3, -17, -7], sw: [0.2, 0.9, 0.3], yaw: -0.18, pitch: -0.06, drop: -0.5, bomb: 1 },
        bombThrow: { hd: [4, 14, 5], oh: [-3, -6, 19], sw: [0.2, 0.9, 0.3], yaw: 0.22, pitch: 0.12, drop: 2, sz: 2, stride: 10 },
      },
    },
  };
  // Additional humanoids: normalized motion scales with body size, while combat stays in world units.
  const H3R = {
    spiderqueen: { creature: 'spider', motion: 1, pose: { base: {} } },
    dragon: { creature: 'dragon', motion: 1, pose: { base: {} } },
    thunderbird: { creature: 'bird', motion: 1, float: true, pose: { base: {} } },
    kraken: { creature: 'kraken', motion: 1, pose: { base: {} } },
    clockmachine: { creature: 'clock', motion: 1, pose: { base: {} } },
    gorgon: { motion: 1, hipY: -38, hipX: 8, L1: 12, L2: 12, ank: -4, shY: -27, shX: 16, neckY: -23, A1: 12, A2: 11, reach: 30, legs: false, tail: true, shield: true, archer: true, pose: { base: { drop: 0, stride: 3, wid: 6 }, rest: { hd: [0,12,10], sw: [0,0,1], oh: [-3,13,10] }, point: { hd: [0,-3,22], sw: [0,0,1], oh: [-2,7,10] }, bowDraw: { hd: [0,-3,19], sw: [0,0,1], oh: [-3,3,9], yaw: .12 }, bowRelease: { hd: [0,-2,23], sw: [0,0,1], oh: [-3,6,10], yaw: -.08 }, gazeReady: { hd: [0,8,10], sw: [0,0,1], pitch: -.06, gaze: 0 }, gazeFlash: { hd: [0,5,15], sw: [0,0,1], pitch: .08, gaze: 1 } } },
    hakaishin: { motion: 1.1, hipY: -45, hipX: 10, L1: 14, L2: 14, ank: -4, shY: -35, shX: 29, neckY: -39, A1: 13.2, A2: 12.1, reach: 1, legs: false, tail: true, float: true, unarmed: true, fourArms: true, halo: true, ritual: true, magicSweep: true, pose: { base: { drop: 0, stride: 4, orb: 1 }, rest: { hd: [7,-8,9], oh: [-7,-8,9] }, up: { hd: [1,-21,8], oh: [-1,-21,8], pitch: -.06 }, point: { hd: [0,-7,23], oh: [0,-7,23], pitch: .08 }, low: { hd: [3,10,15], oh: [-3,10,15] } } },
    maou: { motion: 1, hipY: -28, hipX: 8, L1: 12.5, L2: 12.5, ank: -4, shY: -31, shX: 18, neckY: -33, A1: 12, A2: 11, reach: 57, capeY: -33, capeH: 64, wings: true, rageWings: true, ritual: true, magicSweep: true, pose: { base: { stride: 7, wid: 7, orb: 1 }, rest: { hd: [0,18,6], sw: [0,-1,.1], oh: [-4,12,12] }, ready: { hd: [0,8,12], sw: [0,-.96,.2], oh: [-3,1,14] }, up: { hd: [0,-15,6], sw: [0,-1,.1], oh: [-3,-18,12], pitch: -.08 }, point: { hd: [0,-3,19], sw: [0,-.8,.6], oh: [-4,-7,22], pitch: .08 }, slam: { hd: [0,16,16], sw: [0,-.7,.7], oh: [-3,13,19], drop: 4, pitch: .14 } } },
    kingslime: { natural: 'slime', motion: 1, pose: { base: {} } },
    treant: { natural: 'tree', motion: 1, pose: { base: {} } },

    lich: { boneNeck: true, motion: 1, hipY: -46, hipX: 8, L1: 13, L2: 13, ank: -4, shY: -27, shX: 15, neckY: -31, A1: 12, A2: 12, reach: 47, legs: false, skirt: true, caster: true, float: true, pose: { base: { drop: 0, wid: 7, stride: 4 }, rest: { hd: [1,17,5], sw: [0,-1,.1], oh: [-3,12,6] }, ready: { hd: [0,10,9], sw: [0,-.98,.15] }, up: { hd: [0,-12,6], sw: [0,-1,.1], oh: [-5,-13,12], pitch: -.05 }, point: { hd: [0,-3,17], sw: [0,-.8,.6], oh: [-3,-6,21] }, slam: { hd: [1,14,14], sw: [0,-.75,.65], oh: [-4,10,16], pitch: .1, drop: 2 } } },
    icequeen: { motion: 1, hipY: -46, hipX: 8, L1: 13, L2: 13, ank: -4, shY: -27, shX: 15, neckY: -31, A1: 12, A2: 12, reach: 47, legs: false, skirt: true, caster: true, float: true, pose: { base: { drop: 0, wid: 7, stride: 4 }, rest: { hd: [1,17,5], sw: [0,-1,.1], oh: [-3,12,6] }, ready: { hd: [0,10,9], sw: [0,-.98,.15] }, up: { hd: [0,-12,6], sw: [0,-1,.1], oh: [-5,-13,12], pitch: -.05 }, point: { hd: [0,-3,17], sw: [0,-.8,.6], oh: [-3,-6,21] }, slam: { hd: [1,14,14], sw: [0,-.75,.65], oh: [-4,10,16], pitch: .1, drop: 2 } } },
    pharaoh: { motion: 1, hipY: -46, hipX: 8, L1: 13, L2: 13, ank: -4, shY: -27, shX: 15, neckY: -31, A1: 12, A2: 12, reach: 47, legs: false, skirt: true, caster: true,  offWeapon: true, pose: { base: { drop: 0, wid: 7, stride: 4 }, rest: { hd: [1,17,5], sw: [0,-1,.1], oh: [-3,12,6] }, ready: { hd: [0,10,9], sw: [0,-.98,.15] }, up: { hd: [0,-12,6], sw: [0,-1,.1], oh: [-5,-13,12], pitch: -.05 }, point: { hd: [0,-3,17], sw: [0,-.8,.6], oh: [-3,-6,21] }, slam: { hd: [1,14,14], sw: [0,-.75,.65], oh: [-4,10,16], pitch: .1, drop: 2 } } },
    archmage: { motion: 1, hipY: -46, hipX: 8, L1: 13, L2: 13, ank: -4, shY: -27, shX: 15, neckY: -31, A1: 12, A2: 12, reach: 47, legs: false, skirt: true, caster: true, float: true, pose: { base: { drop: 0, wid: 7, stride: 4 }, rest: { hd: [1,17,5], sw: [0,-1,.1], oh: [-3,12,6] }, ready: { hd: [0,10,9], sw: [0,-.98,.15] }, up: { hd: [0,-12,6], sw: [0,-1,.1], oh: [-5,-13,12], pitch: -.05 }, point: { hd: [0,-3,17], sw: [0,-.8,.6], oh: [-3,-6,21] }, slam: { hd: [1,14,14], sw: [0,-.75,.65], oh: [-4,10,16], pitch: .1, drop: 2 } } },
    colossus: { motion: 1.15, hipY: -34, hipX: 14, L1: 15, L2: 15, ank: -5, shY: -36, shX: 33, neckY: -39, A1: 19, A2: 18, reach: 12, unarmed: true, skirtOccludesLegs: true, pose: { base: { wid: 13, stride: 7 }, rest: { hd: [0,26,2], oh: [-1,26,2] }, up: { hd: [-3,-17,5], oh: [3,-17,5], pitch: -.07 }, slam: { hd: [-4,14,20], oh: [4,14,20], drop: 6, pitch: .18 }, point: { hd: [-2,0,28], oh: [-3,12,12], pitch: .08 }, punchBack: { hd: [0,-4,-8], oh: [2,-4,-8], yaw: .1 }, punch: { hd: [-4,-5,30], oh: [4,-5,30], drop: 3, pitch: .14 } } },
    armor: { enemy: true, motion: .6, hipY: -15, hipX: 5, L1: 7.8, L2: 7.8, ank: -3, shY: -17, shX: 10, neckY: -17, A1: 7.2, A2: 6.6, reach: 21, shield: true, height: 58, pose: { base: { oh: [-2,8,14], wid: 7, stride: 6 }, rest: { sw: [0,-.7,.7] } } },
    dwarf: { enemy: true, motion: .6, hipY: -13, hipX: 5, L1: 7.8, L2: 7.8, ank: -3, shY: -14, shX: 12, neckY: -14, A1: 7.2, A2: 6.6, reach: 20, height: 54, pose: { base: { wid: 9, stride: 5 }, up: { hd: [0,-18,-2], pitch: -.08 }, slam: { drop: 4, pitch: .18, stride: 11 } } },
    angel: { enemy: true, motion: .55, hipY: -15, hipX: 5, L1: 7.2, L2: 7.2, ank: -3, shY: -20, shX: 10, neckY: -22, A1: 6.6, A2: 6.05, reach: 27, wings: true, float: true, height: 66, pose: { base: { wid: 7, stride: 4, drop: 0 }, rest: { sw: [.2,-.7,.6] } } },
    dullahan: { enemy: true, motion: .6, hipY: -15, hipX: 5, L1: 7.8, L2: 7.8, ank: -3, shY: -18, shX: 10, neckY: -21, A1: 7.2, A2: 6.6, reach: 21, capeY: -19, capeH: 38.4, carriedHead: true, height: 62, pose: { base: { wid: 7, stride: 6, oh: [-2,18,4] }, rest: { sw: [0,-.85,.5] }, headLift: { hd: [3,16,4], sw: [0,-.85,.5], oh: [-3,-19,-3], drop: -1, yaw: -.15 }, headThrow: { hd: [3,16,4], sw: [0,-.85,.5], oh: [-2,-2,21], drop: 3, pitch: .13, yaw: .2, stride: 10 } } },
    ghostcaptain: { motion: 1, hipY: -38, hipX: 7, L1: 11, L2: 11, ank: -3, shY: -28, shX: 18, neckY: -34, A1: 12, A2: 12, reach: 38, legs: false, tail: true, skirt: true, float: true, hook: true, pose: { base: { drop: 0, stride: 4, pitch: .03 }, rest: { hd: [3,18,7], oh: [-4,12,6], sw: [.2,-.65,.7] }, point: { oh: [-3,-4,19] } } },
    cyclops: { motion: 1.35, hipY: -34, hipX: 13, L1: 17.55, L2: 17.55, ank: -8, shY: -30, shX: 26, neckY: -35, A1: 19, A2: 18, reach: 65, upperSpan: 12*1.35, foreSpan: 11*1.35, twoHand: true, skirtOccludesLegs: true, pose: { base: { wid: 10, stride: 6, hd: [-18,8,7], freeHand: 0, heldRock: 0 }, rest: { hd: [-18,8,7], sw: [.4,-.85,.3] }, ready: { hd: [-18,1,11] }, up: { hd: [-18,-12,-4], sw: [.1,-.6,-.8] }, slam: { hd: [-18,8,13], drop: 5, stride: 12, pitch: .2 }, low: { hd: [-18,14,-3], drop: 5 }, hi: { hd: [-18,-12,9] }, sideB: { hd: [-16,-2,-8], yaw: .4 }, thrust: { hd: [-18,0,15], pitch: .2, stride: 12 }, rockUp: { hd: [1,15,5], sw: [.2,-.8,.5], oh: [-3,-17,-6], heldRock: 1, freeHand: 1, drop: -1 }, rockThrow: { hd: [1,15,5], sw: [.2,-.8,.5], oh: [-3,-3,21], freeHand: 1, drop: 3, pitch: .16 } } },
    shadowhero: { motion: 1, hipY: -27, hipX: 7, L1: 13, L2: 13, ank: -4, shY: -27, shX: 16, neckY: -28, A1: 12, A2: 11, reach: 45, capeY: -27, capeH: 64, shield: true, pose: { base: { oh: [-1,8,13], wid: 6, stride: 7 }, ready: { oh: [1,2,18] }, thrust: { oh: [1,2,18] }, point: { oh: [1,1,18] } } },
    demongeneral: { motion: 1.15, hipY: -33, hipX: 9, L1: 14.95, L2: 14.95, ank: -5, shY: -35, shX: 24, neckY: -40, A1: 13.8, A2: 12.65, reach: 46, capeY: -35, capeH: 73.6, dual: true, pose: { base: { wid: 8, stride: 7 }, rest: { hd: [4,18,6], sw: [.3,.9,.3] }, sideB: { hd: [12,-4,-8], yaw: .5 }, sideF: { hd: [-10,2,17], yaw: -.5 } } },
    fallenangel: { motion: 1, hipY: -48, hipX: 8, L1: 13, L2: 13, ank: -5, shY: -24, shX: 19, neckY: -20, A1: 12, A2: 11, reach: 49, legs: false, wings: true, skirt: true, float: true, pose: { base: { drop: 0, stride: 4 }, rest: { hd: [3,17,4], sw: [.1,-.9,.4], oh: [-3,12,6] }, up: { oh: [-4,-15,7], pitch: -.08 }, slam: { drop: 2, pitch: .16 }, point: { oh: [-3,-9,17] } } },
  };
  H3R.shadowarmor = Object.assign({}, H3R.armor);
  for (const type in H3R) {
    const d = H3R[type], p = 'h3_' + type;
    R3[type] = Object.assign({ p, sword: p+'_weapon', hand: p+'_hand', upper: p+'_upper', fore: p+'_fore', cape: false }, d, { cape: !!d.capeH, pose: d.pose || { base: {} } });
  }

  // Farthest authored weapon point relative to its grip (art px); curved blades retain their offset.
  for(const [type,tip] of Object.entries({deathknight:[47,0],goblinking:[36.5,0],ghostcaptain:[40,-10],cyclops:[55*1.35,0],shadowhero:[45,0],fallenangel:[49,0],demongeneral:[39*1.15,0]})) R3[type].spinTip=tip;

  const P3B = { hd: [3, 19, 5], sw: [0.1, 0.95, 0.3], oh: [-3, 19, 3], drop: 1, sz: 0, pitch: 0.02, yaw: 0, stride: 4, wid: 6, lf: 0, lb: 0, fz: 0, nz: 0 };
  const p3 = o => Object.assign({}, P3B, o);
  const P3 = {   // hd: weapon hand from its shoulder, sw: weapon direction, oh: free hand; drop/sz: hips down/forward; pitch: lean in; yaw: shoulders turned (+ = weapon side back); stride: feet apart front-to-back; lf/lb: lift the front/back foot
    rest: p3({}),
    ready: p3({ hd: [0, 0, 14], sw: [0, -0.75, 0.66], oh: [-2, 10, 10], drop: 3, sz: 1, pitch: 0.08, yaw: -0.1, stride: 10 }),
    up: p3({ hd: [-2, -21, -5], sw: [0.1, -0.6, -0.8], oh: [-4, 6, 13], drop: -1, sz: -2, pitch: -0.15, yaw: 0.2, stride: 12, lf: 3 }),
    slam: p3({ hd: [0, 8, 19], sw: [0, 0.72, 0.7], oh: [-4, 14, -9], drop: 7, sz: 4, pitch: 0.32, yaw: -0.25, stride: 17 }),
    low: p3({ hd: [6, 18, -9], sw: [0.2, 0.6, -0.78], oh: [-4, 6, 12], drop: 7, sz: 1, pitch: 0.25, yaw: 0.2, stride: 13, wid: 7 }),
    hi: p3({ hd: [2, -20, 9], sw: [0, -0.95, 0.3], oh: [-4, 10, -8], drop: -3, sz: 2, pitch: -0.1, yaw: -0.1, stride: 9, lb: 4 }),
    sideB: p3({ hd: [14, -4, -10], sw: [0.45, -0.15, -0.88], oh: [-6, 6, 12], drop: 4, sz: -1, pitch: 0.05, yaw: 0.6, stride: 12, wid: 7 }),
    sideF: p3({ hd: [-12, 2, 16], sw: [-0.85, 0.05, 0.5], oh: [-14, 10, -6], drop: 5, sz: 3, pitch: 0.18, yaw: -0.6, stride: 15, wid: 7, lb: 3 }),
    thrust: p3({ hd: [0, -4, 22], sw: [0, 0.02, 1], oh: [-6, 12, -10], drop: 4, sz: 6, pitch: 0.28, yaw: -0.3, stride: 18, lb: 3 }),
    point: p3({ hd: [2, -10, 19], sw: [0, -0.3, 0.95], oh: [-4, 14, 4], drop: 2, sz: 2, pitch: 0.05, yaw: -0.15, stride: 10 }),
  };
  const V3 = { add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len: a => Math.hypot(a[0], a[1], a[2]) };
  const norm3 = a => V3.mul(a, 1 / (V3.len(a) || 1));
  function rot3(p, yaw, pitch) {   // turn the shoulders (yaw), then lean forward (pitch)
    const cw = Math.cos(yaw), sw = Math.sin(yaw), x = p[0] * cw + p[2] * sw, z0 = p[2] * cw - p[0] * sw;
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    return [x, p[1] * cp + z0 * sp, z0 * cp - p[1] * sp];
  }
  function ik3(S, H, L1, L2, pole) {   // two bones from S toward H; the joint bends toward pole
    let d = V3.sub(H, S), dl = V3.len(d) || 0.01; const mx = L1 + L2 - 0.3;
    if (dl > mx) { H = V3.add(S, V3.mul(d, mx / dl)); d = V3.sub(H, S); dl = mx; }
    const u = V3.mul(d, 1 / dl), a = (L1 * L1 - L2 * L2 + dl * dl) / (2 * dl), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    const v = norm3(V3.sub(pole, V3.mul(u, V3.dot(pole, u))));
    return [V3.add(V3.add(S, V3.mul(u, a)), V3.mul(v, h)), H];
  }
  const face4 = a => { const c = Math.cos(a), s = Math.sin(a); return Math.abs(c) > 0.7 ? (c > 0 ? 'r' : 'l') : s > 0 ? 'b' : 'f'; };   // world angle (y up) -> facing
  function proj3(f, p) {   // model point -> [screen x, screen y, depth] (art px); a slight top-down slant puts nearer things lower
    if (f === 'f') return [p[0], p[1] + p[2] * 0.3, p[2]];
    if (f === 'b') return [-p[0], p[1] - p[2] * 0.3, -p[2]];
    return [f === 'r' ? p[2] : -p[2], p[1] + p[0] * 0.22, p[0]];
  }
  function r3Face(B, p) {
    const mv = B.mv, look = Math.atan2(hero.y - B.y, hero.x - B.x);
    let want;
    if(B.type==='dragon' && B.sweeps.some(s=>s.kind==='tail'&&s.t>=s.tele))want=face4(B.sweeps.find(s=>s.kind==='tail').ang+Math.PI);
    else if(B.type==='dragon' && mv && mv.name==='breath' && mv.t>=.5 && mv.t<2.1) want=face4(mv.a0+(mv.t-.5)/1.6*1.8*(mv.dir||1));
    else if (p.sweep) want = face4(p.sweep.ang + (R3[B.type].spinTip && !R3[B.type].twoHand && p.sweep.t>=p.sweep.tele ? Math.PI/2 : 0));   // a full swing turns the whole body round with the blade
    else if (mv && /charge|dash3|firetrail/.test(mv.name) && mv.a0 != null && mv.ph) want = face4(mv.a0);
    else if (mv) { if (mv.f3 == null) mv.f3 = face4(look); want = mv.f3; }
    else { want = face4(look); if (want !== B.f3 && B.f3) { if (B.f3s == null) B.f3s = globalT; if (globalT - B.f3s < 0.25) want = B.f3; else B.f3s = null; } else B.f3s = null; }
    return (B.f3 = want);
  }
  function r3Pose(B) {
    const mv = B.mv, p2 = B.phase === 2, b = Math.sin(globalT * 2.2);
    const def = R3[B.type], custom = def.pose, Q = q => Object.assign({}, P3[q] || P3.rest, custom && custom.base, custom && custom[q]);
    const scaled = p => {
      if (!def.motion) return p;
      const r = Object.assign({}, p), m = def.motion;
      for (const k of ['hd','oh']) r[k] = p[k].map(v => v*m);
      for (const k of ['drop','sz','stride','wid','lf','lb','fz','nz']) r[k] = p[k]*m;
      if (def.float) { r.drop *= .25; r.lf = r.lb = 0; r.fz *= .12; r.nz *= .12; r.stride *= .35; }
      if (def.shield && !def.carriedHead) r.oh = Q('ready').oh.map(v => v*m);
      if (def.dual) { r.oh = [-r.hd[0],r.hd[1],r.hd[2]]; r.osw = [-r.sw[0],r.sw[1],r.sw[2]]; }
      return r;
    };
    const rest = custom ? Object.assign({}, Q('rest'), { drop: Q('rest').drop + b * 0.4, hd: Q('rest').hd.map((v, i) => i === 1 ? v - b * 0.35 : v) }) : p3({ drop: 1 + b * 0.5, sw: [0.1, 0.95, 0.3 + b * 0.05], hd: [3, 19 - b * 0.4, 5] });
    // Some rotating hitboxes outlive the move timer: keep the held blades on them until they expire.
    if(def.spinTip && B.sweeps[0] && B.sweeps[0].t>=B.sweeps[0].tele && (!mv || !['sweep','twin','whirlblade'].includes(mv.name)))
      return settle(B,Object.assign({},scaled(Q('thrust')),{sweep:B.sweeps[0]}),scaled(rest));
    if (!mv) return settle(B, null, scaled(rest));
    const n = mv.name.split(':')[0], t = mv.t, K = s => keysAt(Q, s, t);
    const walk = (spd, st) => { const ph = globalT * spd; return { stride: 0, fz: Math.sin(ph) * st, nz: -Math.sin(ph) * st, lf: Math.max(0, Math.cos(ph)) * 3, lb: Math.max(0, -Math.cos(ph)) * 3 }; };
    let p;
    if (def.archer && n === 'petrify') p = K([[0,'gazeReady'],[.55,'gazeReady'],[1.2,'gazeFlash','in'],[1.5,'gazeFlash'],[1.7,'point'],[2.4,'rest']]);
    else if (def.archer && (n === 'aimed3' || n === 'aimed5')) p = K(hits([.45,.9],'bowDraw','bowRelease',.22));
    else if (B.type==='hakaishin' && n==='collapse') p = K([[0,'up'],[1.0,'up'],[1.4,'point','in'],[4.6,'point'],[5.8,'rest']]);
    else if (B.type==='maou' && n==='despair') p = K([[0,'ready'],[.5,'up'],[p2?1.9:2.2,'point','in'],[2.6,'slam','in'],[3.3,'rest']]);
    else if (def.ritual && n==='twin') p = K(hold(.5,3.3));
    else if (n === 'enemyWind') p = K([[0,'rest'],[.42,'up']]);
    else if (n === 'enemySlash') p = K([[0,'up'],[.06,'slam','in'],[.2,'low']]);
    else if (n === 'headLift') p = K([[0,'rest'],[.5,'headLift'],[.65,'headLift']]);
    else if (n === 'headThrow') p = K([[0,'headThrow'],[.18,'headThrow'],[.65,'ready']]);
    else if ((n === 'sweep' || n === 'twin' || n === 'whirlblade') && B.sweeps.length) { const sw = B.sweeps[0], act = sw.t >= sw.tele; p = Object.assign({}, Q(act ? 'thrust' : 'sideB'), act ? { hd: def.twoHand ? [-18,3,10] : [6, -2, custom ? 18 : 21], sw: [0, 0, 1], drop: custom ? 3 : 6, stride: custom ? 11 : 16 } : {}, { sweep: sw }); }
    else if (n === 'boulders' && def.twoHand) {
      const keys = [[0,'rest']];
      for(let i=0;i<(p2?3:2);i++){const at=.6+i*.5;keys.push([at-.25,'rockUp'],[at,'rockThrow','in'],[at+.12,'rockThrow']);}
      keys.push([2.3,'rest']);p=K(keys);
    }
    else if (def.caster && n === 'soulstorm') p = K(hits(p2?[.5,1.6]:[.5],'up','point',.22));
    else if (def.caster && n === 'icecage') p = K([[0,'point'],[.9,'up'],[1.6,'slam','in'],[2.2,'rest']]);
    else if (def.caster && n === 'quicksand') p = K([[0,'point'],[.9,'up'],[1.2,'slam','in'],[2.5,'point'],[3.1,'rest']]);
    else if (def.caster && n === 'illusion') p = K([[0,'ready'],[.3,'up'],[1.4,'point','in'],[1.7,'point'],[2.1,'rest']]);
    else if (def.caster && n === 'scythe') p = K([[0,'sideB'],[.75,'sideF','in'],[1.5,'sideB'],[2.25,'sideF','in'],[2.9,'rest']]);
    else if (def.unarmed && n === 'rocketfist') p = K(hits(p2?[.6,1.7]:[.6],'punchBack','punch',.3));
    else if (n === 'cannons') p = K(hits(p2?[.2,1.8]:[.2],'up','point',.18));
    else if (n === 'pillars') p = K(hits(p2?[.2,1.2,2.2]:[.2,1.2],'up','point',.18));
    else if (n === 'mirror') p = K([[0,'point'],[.7,'point'],[1,'sideF','in'],[1.5,'rest']]);
    else if (n === 'warp') p = K([[0,'ready'],[.4,'low'],[.75,'hi','in'],[1.4,'rest']]);
    else if (n === 'rain') p = K(hold(.4,2.3));
    else if (n === 'summon' || n === 'homing' || n === 'spiral' || n === 'spiral3' || n === 'gapring') p = K(hold(.35,1.8));
    else if (n === 'bombs' && B.type === 'goblinking') {
      // The free hand throws at exactly the three/five existing launch times; the club stays in the other hand.
      const keys = [[0, 'rest']];
      for (let i = 0; i < (p2 ? 5 : 3); i++) { const at = 0.4 + i * 0.28; keys.push([at - 0.15, 'bombUp'], [at, 'bombThrow', 'in'], [at + 0.06, 'bombThrow']); }
      keys.push([p2 ? 2 : 1.45, 'rest']); p = K(keys);
    }
    else if (n === 'mines' && B.type === 'goblinking') p = K([[0, 'point'], [0.65, 'point'], [1.25, 'ready'], [2.2, 'rest']]);
    else if (n === 'quake') p = K(hits([0.45, 1.0, 1.55], 'up', 'slam'));
    else if (n === 'rocks') p = K(hits([0.45, 0.9, 1.35], 'low', 'hi'));
    else if (n === 'aimed3' || n === 'aimed5') p = K(hits([0.45, 0.9], 'sideB', 'sideF'));
    else if (n === 'darkwave') p = K(hits(p2 ? [0.5, 1.1, 1.7] : [0.5, 1.1], 'sideB', 'sideF'));
    else if (n === 'ring' || n === 'ringaimed') p = K(hits([0.55], 'up', 'slam', 0.3));
    else if (n === 'triple') p = K(hits([0.4, 0.72, 1.04], 'up', 'slam', 0.18));
    else if (n === 'charge' || n === 'dash3' || n === 'firetrail') p = mv.ph === 'go' ? Object.assign({}, Q('thrust'), walk(22, custom ? 6 : 9), { pitch: custom ? 0.18 : 0.34 }) : keysAt(Q, mv.ph === 'rest' ? [[0, 'thrust'], [0.5, 'rest']] : [[0, mv.k ? 'thrust' : 'rest'], [0.35, 'ready']], mv.pt || 0);
    else if (n === 'stalk') p = Object.assign({}, Q('ready'), walk(9, custom ? 4 : 6));
    else if (n === 'jump') p = mv.n === 0 ? K([[0, 'rest'], [0.3, 'up']]) : mv.n === 1 ? keysAt(Q, [[0, 'up'], [0.3, 'slam', 'in']], t - mv.t1) : keysAt(Q, [[0, 'slam'], [0.35, 'slam'], [0.8, 'rest']], t - mv.t1 - 0.3);
    else if (n === 'laser' || n === 'laser3') p = K(hold(0.45, 1.3));
    else if (n === 'cross') p = K(hold(0.6, 3.6));
    else if (n === 'wave') p = K(hold(0.4, 2.2));
    else p = K([[0, 'rest'], [0.3, 'up'], [0.5, 'slam', 'in'], [0.7, 'slam'], [1.1, 'rest']]);
    return settle(B, scaled(p), scaled(rest));
  }
  // Render-only adapter: read the enemy's real attack state; never advance its AI or change combat timers.
  function drawR3Enemy(e, def, x, yFeet, fl) {
    const B = e.r3B || (e.r3B = { type:e.type, phase:1, sweeps:[] });
    B.x=e.x; B.y=e.y; B.headOut=!!e.headOut;
    const name=e.st==='wind'?(def.carriedHead?'headLift':'enemyWind'):e.st==='slash'?'enemySlash':e.st==='throw'?'headThrow':hyp(e.vx,e.vy)>12?'stalk':null;
    if(name) {
      if(!B.mv || B.mv.name!==name) B.mv={name,t:0,f3:face4(e.face == null ? Math.atan2(hero.y-e.y,hero.x-e.x) : e.face)};
      B.mv.t=e.t; if(name==='stalk') B.mv.f3=face4(Math.atan2(hero.y-e.y,hero.x-e.x));
    } else B.mv=null;
    drawR3(B,def,x,yFeet,fl);
  }
  // Screen-space orbit: place the authored tip first, then solve the grip and both elbows.
  function generalSpinGeometry(B, def, x, yFeet, K) {
    const center=[x,yFeet+(def.hipY+def.shY)*K], tipArt=def.spinTip;
    const result=B.sweeps.slice(0,def.dual?2:1).map((sw,i)=>{
      const a=sw.ang, u=[Math.cos(a),-Math.sin(a)], radius=sw.len;
      const reach=def.A1+def.A2;
      const gripR=Math.min((def.twoHand?reach-def.shX-1:reach+def.shX*.3-1)*K,radius*.4);
      const shoulder=[center[0]+u[0]*def.shX*K,center[1]+u[1]*def.shX*K*.3,0];
      const hand=[center[0]+u[0]*gripR,center[1]+u[1]*gripR,0];
      // Cyclops' broad shoulders rotate through depth. Solving them flat made the
      // elbows double back when the projected shoulder approached the grip.
      if(def.twoHand) {
        shoulder[0]=center[0]+Math.sin(a)*def.shX*K;
        shoulder[1]=center[1]+Math.cos(a)*def.shX*K*.3;
        shoulder[2]=Math.cos(a)*def.shX*K*Math.sqrt(1-.3*.3);
        // Both grips stay on the character's forward axis. Height compensates the
        // view tilt so the on-screen tip still follows the approved circle.
        hand[2]=u[1]*gripR*.7/Math.sqrt(1-.3*.3);
      }
      const pole=def.twoHand?[u[0],u[1]*.3,u[1]*Math.sqrt(1-.3*.3)]:[-u[1]*(i?-1:1),u[0]*(i?-1:1),0];
      const [elbow,reached]=ik3(shoulder,hand,def.A1*K,def.A2*K,pole);
      const tip=[center[0]+u[0]*radius,center[1]+u[1]*radius];
      // A cutlass tip is above its axis; account for that offset without changing blade thickness.
      const bladeLength=radius-gripR, scale=Math.sqrt(Math.max(1,bladeLength**2-(tipArt[1]*K)**2))/(tipArt[0]*K);
      const angle=-a-Math.atan2(tipArt[1],tipArt[0]*scale);
      return {center,shoulder,hand:reached,elbow,tip,angle,scale,depth:u[1]*20,weapon:true};
    });
    if(!def.dual && result.length) {
      const first=result[0],a=B.sweeps[0].ang,u=[Math.cos(a),-Math.sin(a)];
      const shoulder=[center[0]-u[0]*def.shX*K,center[1]-u[1]*def.shX*K*.3,0];
      if(def.twoHand) {
        shoulder[0]=center[0]-Math.sin(a)*def.shX*K;
        shoulder[1]=center[1]-Math.cos(a)*def.shX*K*.3;
        shoulder[2]=-Math.cos(a)*def.shX*K*Math.sqrt(1-.3*.3);
      }
      const hand=def.twoHand?[first.hand[0]-Math.cos(first.angle)*4*K,first.hand[1]-Math.sin(first.angle)*4*K,first.hand[2]-u[1]*4*K*.7/Math.sqrt(1-.3*.3)]:[shoulder[0],shoulder[1]+Math.min(18,def.A1+def.A2-1)*K,0];
      const [elbow,reached]=ik3(shoulder,hand,def.A1*K,def.A2*K,def.twoHand?[u[0],u[1]*.3,u[1]*Math.sqrt(1-.3*.3)]:[1,0,0]);
      result.push({center,shoulder,hand:reached,elbow,depth:def.twoHand?first.depth:-first.depth,weapon:false});
    }
    return result;
  }
  function creaturePose(B) {
    const mv=B.mv,n=mv?mv.name.split(':')[0]:'idle',t=mv?mv.t:0,p2=B.phase===2;
    const pulse=(times,w=.15)=>times.reduce((best,a)=>Math.max(best,Math.exp(-(((t-a)/w)**2))),0);
    const moving=n==='stalk'||((n==='charge'||n==='dash3')&&mv.ph==='go');
    let open=0,flare=0,lift=0;
    // Shared projectile releases; species-specific techniques below replace these cues.
    if(['ring','ringaimed'].includes(n))flare=pulse([.55]);
    if(n==='triple')flare=pulse([.4,.72,1.04]);
    if(n==='gapring')flare=pulse([.5,1.25]);
    if(['aimed3','aimed5'].includes(n))flare=pulse([.45,.9]);
    if(n==='homing')flare=pulse([.5]);
    if(n==='laser'||n==='laser3')flare=t>=.85&&t<1.35?1:0;
    if(n==='cross')flare=t>=1&&t<3.8?.65:0;
    if(['wave','spiral','spiral3'].includes(n))flare=t>.4&&t<2.2?.45+.2*Math.sin(t*22):0;
    if(n==='rain'||n==='mines')flare=pulse([0],.35);
    open=flare>.3?1:0;
    if(B.type==='spiderqueen') { flare=n==='webnet'?pulse(p2?[.4,.7,1,1.3,1.6]:[.4,.7,1,1.6]):flare;open=flare>.25?1:0;lift=flare*.15; }
    if(B.type==='dragon') { const firing=n==='breath'&&t>=.5&&t<2.1;flare=firing?1:n==='fireball'?pulse(p2?[.5,.9,1.3]:[.5,.9]):n==='firestorm'?pulse([.5],.25):flare;open=flare>.25?2:(n==='breath'&&t<.5?1:0);lift=n==='firestorm'&&t>.3&&t<3.2?1:0; }
    if(B.type==='thunderbird') { flare=n==='thunderlines'?pulse(p2?[.3,1.2,2.1,1.25,2.15,3.05]:[.3,1.2,1.25,2.15],.13):flare;open=flare>.3?1:0;lift=flare; }
    if(B.type==='kraken') {open=n==='ink'&&t<.65?1:open;lift=n==='ink'||n==='tentacles'?Math.min(1,t/.4):0;flare=n==='ink'?pulse([0,.8,2],.2):flare;}
    if(B.type==='clockmachine') {
      if(n==='timestop') {if(!B.clockHold||B.clockHold.mv!==mv)B.clockHold={mv,offset:B.clockOffset||0};}
      else if(B.clockHold){B.clockOffset=B.clockHold.offset+1.4;B.clockHold=null;}
      flare=n==='timestop'&&t<1.4?1:flare;
    }
    const clockTime=B.clockHold?globalT-B.clockHold.offset-Math.min(t,1.4):globalT-(B.clockOffset||0);
    return {n,t,p2,moving,open,flare,lift,clockTime};
  }
  function creatureMotion(B) {
    const cue=creaturePose(B),mv=B.mv,n=cue.n,t=cue.t,T=globalT,cl=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=cl(x);return x*x*(3-2*x);};
    const prepare=(at,w=.32)=>t<at?smooth((t-at+w)/w):Math.exp(-(t-at)*14);
    let times=['aimed3','aimed5'].includes(n)?[.45,.9]:n==='webnet'?(cue.p2?[.4,.7,1,1.3,1.6]:[.4,.7,1,1.6]):n==='fireball'?(cue.p2?[.5,.9,1.3]:[.5,.9]):n==='thunderlines'?(cue.p2?[.3,1.2,2.1]:[.3,1.2]):n==='triple'?[.4,.72,1.04]:n==='gapring'?[.5,1.25]:[.5];
    let wind=mv?Math.max(...times.map(a=>prepare(a))):0,release=cue.flare;
    if(['wave','spiral','spiral3','cross'].includes(n))wind=smooth(t/.35)*(t<2.2?1:Math.exp(-(t-2.2)*6));
    const sweep=B.sweeps.find(s=>s.kind==='tail'||s.kind==='tentacle'),spinning=!!sweep&&sweep.t>=sweep.tele;
    if(sweep)wind=sweep.t<sweep.tele?smooth(sweep.t/sweep.tele):.15;
    const jaw=B.type==='dragon'?(n==='breath'?(t<.5?smooth(t/.5)*.65:t<2.1?1:0):n==='fireball'?Math.min(1,release*1.35):release*.5):B.type==='kraken'?(n==='ink'?(t<.25?smooth(t/.25):Math.exp(-(t-.25)*4)):release*.6):release*.4;
    const go=cue.moving,clock=B.type==='clockmachine',animTime=clock?cue.clockTime:T;
    const target={wind,release,jaw,drop:wind*(B.type==='spiderqueen'?3.5:2)-release*1.3,shift:release*(B.type==='dragon'?-1.8:-.7),pitch:clock?-.075*wind+.06*release:B.type==='dragon'?-.08*wind+.07*release:.035*Math.sin(animTime*2)-wind*.035,
      headLift:-wind*1.5-jaw*.8,headPitch:-wind*.09+release*.07,flap:Math.sin(animTime*(B.type==='thunderbird'?8:5)),fold:go&&B.type==='thunderbird'?1:0,step:go?1:0,clockTime:cue.clockTime};
    if(spinning&&B.type==='dragon'){target.pitch=Math.sin(sweep.ang)*.09;target.drop=1.2;target.headPitch=-target.pitch*.6;target.step=.65;}
    if(B.type==='thunderbird'){target.drop=-Math.sin(animTime*8-.5)*1.3-wind*2;target.pitch=go?.18:target.pitch;}
    const state=B.creatureAnim||(B.creatureAnim={time:T,pose:{...target},limbs:{}}),dt=Math.min(.1,Math.max(0,T-state.time));state.time=T;
    if(clock&&n==='timestop'&&t<1.4){if(!state.frozen)state.frozen={...state.pose,clockTime:cue.clockTime};state.pose={...state.frozen};}
    else{state.frozen=null;const k=1-Math.exp(-dt*18);for(const key in target)state.pose[key]=key==='clockTime'?target[key]:state.pose[key]+(target[key]-state.pose[key])*k;}
    return {...state.pose,cue,spinning,sweep,time:animTime,state,dt};
  }
  function drawCreatureBoss(B,def,x,yFeet,fl,f) {
    const frontLimbs=[];
    const K=SPR.SCALE,m=creatureMotion(B),v=f==='f'?'f':f==='b'?'b':'s',mir=f==='l'?-1:1,parts=SPR.creatureParts(B.type,{v,p2:B.phase===2?1:0,flash:fl}),anchor=parts[0].anchor;
    const head=parts.find(p=>p.name==='head'),body=parts.find(p=>p.name==='body'),pivot=[anchor[0],(body?body.origin[1]:anchor[1])+10];
    const rot=(v==='s'?1:.45)*m.pitch,cs=Math.cos(rot),sn=Math.sin(rot),movePoint=p=>{const dx=p[0]-pivot[0],dy=p[1]-pivot[1];return[pivot[0]+dx*cs-dy*sn+(v==='s'?m.shift:0),pivot[1]+dx*sn+dy*cs+m.drop];};
    const screen=p=>[x+(p[0]-anchor[0])*K*mir,yFeet+(p[1]-anchor[1])*K];
    const headPoint=p=>{if(!head)return movePoint(p);const a=m.headPitch*(v==='s'?1:.4),dx=p[0]-head.origin[0],dy=p[1]-head.origin[1];return movePoint([head.origin[0]+dx*Math.cos(a)-dy*Math.sin(a)+(v==='s'?-m.wind*.8:0),head.origin[1]+dx*Math.sin(a)+dy*Math.cos(a)+m.headLift]);};
    // Each recorded primitive retains the source art. Animate its original pivots.
    const drawPart=(p,pos,angle=0,sx=1,sy2=1,isHead=false)=>{
      const at=screen(isHead?headPoint(pos||p.origin):movePoint(pos||p.origin));
      pd(p.s,at[0],at[1],(rot+angle)*mir,mir*sx,sy2);
    };
    const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
    const tube=(pts,r,dragon,index)=>{
      const edge=[[],[]],radii=pts.map((_,i)=>r*(1-i/(pts.length-1)*.86));
      for(let i=0;i<pts.length;i++){const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1;for(let side=0;side<2;side++){const sign=side?1:-1;edge[side].push([pts[i][0]-dy/len*radii[i]*sign,pts[i][1]+dx/len*radii[i]*sign]);}}
      const poly=edge[0].concat(edge[1].slice().reverse());ctx.save();ctx.beginPath();poly.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=fl?'#fff':dragon?'#b03a1a':index%2?'#6a2a9a':'#a85ad8';ctx.strokeStyle=fl?'#fff':dragon?'#2a0c06':'#1a1420';ctx.lineWidth=K;ctx.lineJoin='round';ctx.fill();ctx.stroke();
      // A narrow highlight follows the curve; the underside retains the source shadow palette.
      const stripe=pts.map((p,i)=>[(p[0]+edge[0][i][0])*.5,(p[1]+edge[0][i][1])*.5]);ctx.beginPath();stripe.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle=fl?'#fff':dragon?'#e8562a':'#d8a0f8';ctx.lineWidth=Math.max(K,r*.37);ctx.stroke();
      for(let i=3;i<pts.length-2;i+=4){const p=pts[i];ctx.fillStyle=fl?'#fff':dragon?'#f0e0c0':'#f0d0ff';if(dragon){ctx.beginPath();ctx.moveTo(p[0]-K,p[1]-radii[i]*.6);ctx.lineTo(p[0],p[1]-radii[i]-2*K);ctx.lineTo(p[0]+K,p[1]-radii[i]*.6);ctx.fill();}else{ctx.beginPath();ctx.ellipse(p[0],p[1]+radii[i]*.35,K*1.15,K*.65,0,0,Math.PI*2);ctx.fill();}}ctx.restore();
    };
    const cubic=(a,b,c,d)=>Array.from({length:25},(_,i)=>{const t=i/24,u=1-t;return[a[0]*u*u*u+3*b[0]*u*u*t+3*c[0]*u*t*t+d[0]*t*t*t,a[1]*u*u*u+3*b[1]*u*u*t+3*c[1]*u*t*t+d[1]*t*t*t];});
    const limb=(p,sw,dragon=false)=>{
      const id=p.name,now=globalT,root=screen(movePoint(p.origin)),saved=m.state.limbs[id],points=p.meta.points||[],baseEnd=points.length?screen(movePoint(points[points.length-1])):screen(movePoint([v==='s'?15:89,51]));
      let end=baseEnd,amount=0;
      if(sw){const reach=sw.t<sw.tele?smooth((sw.t-sw.tele+.28)/.28):1,tip=[x+Math.cos(sw.ang)*sw.len,yFeet-B.r*.7-Math.sin(sw.ang)*sw.len];end=[baseEnd[0]+(tip[0]-baseEnd[0])*reach,baseEnd[1]+(tip[1]-baseEnd[1])*reach];amount=reach;m.state.limbs[id]={end,time:now};}
      else if(saved&&now-saved.time<.42){const t=smooth((now-saved.time)/.42);end=[saved.end[0]+(baseEnd[0]-saved.end[0])*t,saved.end[1]+(baseEnd[1]-saved.end[1])*t];amount=1-t;}
      const wave=Math.sin(m.time*3+(p.meta.i||0)*1.2),curl=m.wind*(dragon?8:14)*K;
      let controls;
      if(amount>.01){const dx=end[0]-root[0],dy=end[1]-root[1],len=Math.hypot(dx,dy)||1,bend=(dragon?12:18)*K*Math.sin(now*2+(p.meta.i||0));controls=[root,[root[0]+dx*.25-dy/len*bend,root[1]+dy*.25+dx/len*bend],[root[0]+dx*.7-dy/len*bend,root[1]+dy*.7+dx/len*bend],end];}
      else if(points.length){const b=screen(movePoint(points[1])),c=screen(movePoint(points[2]));end=[baseEnd[0]+wave*1.5*K,baseEnd[1]-curl+wave*2*K];controls=[root,[b[0],b[1]-curl*.35],[c[0],c[1]-curl*.75+wave*K],end];}
      else{const sign=v==='s'?-1:1;controls=[root,[root[0]+sign*13*K,root[1]+9*K],[root[0]+sign*37*K,root[1]+10*K],[baseEnd[0]+wave*2*K,baseEnd[1]-curl*.4]];}
      const pts=cubic(...controls),radius=(dragon?4.4:3.7)*K;tube(pts,radius,dragon,p.meta.i||0);
      if(pts[pts.length-1][1]>root[1]+3*K)frontLimbs.push(()=>tube(pts.slice(3),radius*(1-3/24*.86),dragon,p.meta.i||0));
      m.state.geometry||(m.state.geometry={});m.state.geometry[id]={root:pts[0],tip:pts[pts.length-1],active:!!sw&&sw.t>=sw.tele};
    };
    // Draw flexible appendages behind the source torso, so their roots are embedded.
    for(const p of parts){if(B.type==='dragon'&&p.name==='tail')limb(p,B.sweeps.find(s=>s.kind==='tail'),true);if(B.type==='kraken'&&p.name.startsWith('tentacle')){const map=B.sweeps.length===2?[1,6]:[0,2,5,7],j=map.indexOf(p.meta.i);limb(p,j>=0?B.sweeps[j]:null);}}
    const legs={};
    if(B.type==='spiderqueen')for(const p of parts.filter(p=>p.name.startsWith('legUpper'))){
      const {id,a,b,c,side,i}=p.meta,hip=movePoint(a),phase=m.time*11+i*Math.PI+side*.7,walking=m.step,foot=[c[0]+Math.sin(phase)*3*walking,c[1]-Math.max(0,Math.cos(phase))*4*walking-(i===0?m.wind*6:0)],L1=Math.hypot(b[0]-a[0],b[1]-a[1]),L2=Math.hypot(c[0]-b[0],c[1]-b[1]),dx=foot[0]-hip[0],dy=foot[1]-hip[1],dist=Math.min(L1+L2-.01,Math.hypot(dx,dy)),theta=Math.atan2(dy,dx),bend=Math.acos(Math.max(-1,Math.min(1,(L1*L1+dist*dist-L2*L2)/(2*L1*dist)))),oldCross=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),ang=theta+(oldCross>0?-bend:bend),knee=[hip[0]+Math.cos(ang)*L1,hip[1]+Math.sin(ang)*L1];legs[id]={hip,knee,foot,a,b,c,L1,L2};
    }
    let mouthDrawn=false;
    for(const p of parts){const name=p.name;
      if(name==='tail'&&B.type==='dragon'||name.startsWith('tentacle'))continue;
      if(name.startsWith('legUpper')||name.startsWith('legLower')||name.startsWith('joint')){
        const leg=legs[p.meta.id],upper=name.startsWith('legUpper'),a=upper?leg.hip:leg.knee,b=upper?leg.knee:leg.foot,originalA=upper?leg.a:leg.b,originalB=upper?leg.b:leg.c,at=screen(a);
        if(name.startsWith('joint'))pd(p.s,at[0],at[1],0,mir,1);else{const angle=Math.atan2(b[1]-a[1],b[0]-a[0])-Math.atan2(originalB[1]-originalA[1],originalB[0]-originalA[0]);pd(p.s,at[0],at[1],angle*mir,mir,1);}continue;
      }
      if(B.type==='dragon'&&name==='snout'&&m.jaw>.015&&!mouthDrawn){
        const openParts=SPR.creatureParts(B.type,{v,p2:B.phase===2?1:0,act:1,flash:fl}),mouth=openParts.find(p=>p.name==='mouth'),openHead=openParts.find(p=>p.name==='head');
        if(mouth){const pos=[mouth.origin[0]+head.origin[0]-openHead.origin[0],mouth.origin[1]+head.origin[1]-openHead.origin[1]];drawPart(mouth,pos,(v==='s'?.25:0)*m.jaw,1,Math.max(.06,m.jaw),true);}mouthDrawn=true;
      }
      if(name.startsWith('wing')){const side=v==='s'?1:p.meta.side||1,fold=m.fold,phase=Math.sin(m.time*(B.type==='thunderbird'?8:5)+(p.meta.side<0?-.2:0)),angle=side*(phase*.22-m.wind*.17+fold*.65);drawPart(p,null,angle,1-fold*.48,1+phase*.08);continue;}
      if(name.startsWith('foot')){
        const walk=m.step*Math.sin(m.time*13+(p.meta.side>0?Math.PI:0)),at=screen([p.origin[0]+walk*1.6,p.origin[1]-Math.max(0,walk)*3+(B.type==='thunderbird'?m.fold*4:0)]);pd(p.s,at[0],at[1],0,mir,1);continue;
      }
      if(name.startsWith('gear')){drawPart(p,null,(m.clockTime*2.4-.39)*(p.meta.side||1));continue;}
      if(name.startsWith('dial')){
        const i=name==='dialHour'?0:1,sw=B.sweeps[i],target=sw?-sw.ang:-Math.PI/2+m.clockTime*(i?2.5:.35);m.state.hands||(m.state.hands=[]);let angle=m.state.hands[i]==null?target:m.state.hands[i];if(!m.state.frozen){if(sw&&sw.t>=sw.tele)angle=target;else angle+=Math.atan2(Math.sin(target-angle),Math.cos(target-angle))*(1-Math.exp(-m.dt*12));}m.state.hands[i]=angle;const len=i?17:11,a=p.origin,b=[a[0]+Math.cos(angle)*len*(v==='s'?.16:1),a[1]+Math.sin(angle)*len*(i?16/17:10/11)],A=screen(movePoint(a)),Z=screen(movePoint(b));ctx.strokeStyle=fl?'#fff':'#3a2a1a';ctx.lineWidth=(i?1.6:2.6)*K;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(...A);ctx.lineTo(...Z);ctx.stroke();ctx.lineCap='butt';continue;
      }
      if(name.startsWith('arm')){drawPart(p,null,(p.meta.side||1)*(-m.wind*.35+m.release*.2));continue;}
      if(name==='head'||name==='eyes'||name==='snout'||name==='crown'||name==='fangs'||name==='beak'||name==='mouth'){
        const face=p.origin.slice();if(name==='fangs'||name==='mouth')face[1]+=m.jaw*2;if(name==='beak')drawPart(p,face,(v==='s'?.12:0)*m.jaw,1,1,true);else drawPart(p,face,m.headPitch*(v==='s'?1:.4),1,1+(name==='mouth'?m.jaw*.8:0),true);continue;
      }
      if(name==='neck'){drawPart(p,[p.origin[0],p.origin[1]+m.headLift*.3],m.headPitch*.4,1,1-m.headLift/16);continue;}
      drawPart(p,null,0,1+m.wind*(B.type==='kraken'?.025:.012),1-m.wind*.025);
      if(name==='body')for(const draw of frontLimbs)draw();
    }
  }
  function drawNaturalBoss(B,def,x,yFeet,fl,p,f) {
    const K=SPR.SCALE,v=f==='f'?'f':f==='b'?'b':'s',mir=f==='l'?-1:1,mv=B.mv,n=mv?mv.name.split(':')[0]:'idle',t=mv?mv.t:0;
    const part=(name,at,rot=0,sx=1,sy2=1)=>pd(P_(def.p+'_'+name,{v,p2:B.phase===2?1:0,f:Math.floor(globalT*7)%4},fl),x+at[0]*mir*K,yFeet+at[1]*K,rot*mir,mir*sx,sy2);
    if(def.natural==='slime') {
      let squeeze=1+Math.sin(globalT*3.5)*.025;
      if(n==='jump'||n==='split') {
        if(mv.n===0)squeeze=t<.25?1+.18*Math.sin(t/.25*Math.PI):.88;
        else if(mv.n===1)squeeze=.84;
        else squeeze=1+.28*Math.exp(-Math.max(0,t-mv.t1-.3)*8);
      } else if(['ring','triple','gapring','aimed3','aimed5'].includes(n)) squeeze+=.10*Math.exp(-(((t-.5)% .75)**2)*70);
      const sy2=1/squeeze,top=-52*sy2,lean=n==='stalk'?Math.sin(globalT*7)*.035:0;
      part('body',[0,0],lean,squeeze,sy2);
      const lag=Math.sin(globalT*5)*.04+(squeeze-1)*.12;
      part('crown',[0,top+2],lean+lag,1,1);return;
    }
    const emit=n==='roots'&&t>=.35&&t<1.35?Math.exp(-((t-.35)% .11)*25):0;
    const slam=n==='quake'?[.45,1,1.55].reduce((q,a)=>Math.max(q,Math.exp(-(((t-a)*12)**2))),0):emit*.5;
    const raise=['rain','spiral','spiral3','homing','wave','ring','gapring','roots'].includes(n)?Math.min(1,t/.35)*(t<2.3?1:Math.max(0,1-(t-2.3)*3)):0;
    const sway=Math.sin(globalT*1.8)*.025+(slam*.035),drop=slam*3;
    part('roots',[0,0],0,1+slam*.06,1);
    const branch=(side)=>{
      // In profile the near socket is on the visible side of the trunk, below
      // and behind the mouth. The far arm is masked by the trunk itself.
      const shoulder=v==='s'?[-5,-26+drop]:[side*19,-38+drop];
      const el=[v==='s'?-side*23:side*32,-47-raise*14+drop],hand=[v==='s'?-side*31:side*43,-62-raise*15+drop];
      for(const [a,b]of[[shoulder,el],[el,hand]]){const dx=b[0]-a[0],dy=b[1]-a[1];part('branch',a,Math.atan2(dy,dx),Math.hypot(dx,dy)/14,1);}
      part('twig',hand,side*raise*.15);
    };
    if(v==='b'){branch(-1);branch(1);}else branch(-1);
    part('trunk',[0,drop],sway,1,1);
    if(v!=='b')branch(1);
    part('canopy',[0,-67+drop],sway*.7+Math.sin(globalT*3)*.015,1+slam*.03,1);
  }
  function drawR3(B, def, x, yFeet, fl) {
    const K = SPR.SCALE, p = r3Pose(B), f = r3Face(B, p), v = f === 'f' ? 'f' : f === 'b' ? 'b' : 's', mir = f === 'l' ? -1 : 1, P2 = B.phase === 2 ? 1 : 0;
    if(def.creature) { drawCreatureBoss(B,def,x,yFeet,fl,f);return; }
    if(def.natural) { drawNaturalBoss(B,def,x,yFeet,fl,p,f);return; }
    const S = q => { const r = proj3(f, q); return [x + r[0] * K, yFeet + r[1] * K, r[2]]; }, dp = q => proj3(f, q)[2];
    const hip = [0, def.hipY + p.drop, p.sz], R = q => rot3(q, p.yaw, p.pitch), T = q => V3.add(hip, R(q));
    const shS = T([def.shX, def.shY, 0]), shO = T([-def.shX, def.shY, 0]);
    const held=def.twoHand?[p.hd[0],p.hd[1],Math.max(6,p.hd[2])]:p.hd;
    let targetS=V3.add(shS,R(held));
    if(def.twoHand && !p.freeHand) {
      // A shared grip must be reachable by both arms, including while winding up.
      // Project it into the intersection of their reach spheres before solving either elbow.
      const gripGap=V3.mul(norm3(R(p.sw)),6), reach=def.A1+def.A2-.35;
      for(let i=0;i<12;i++)for(const center of [shS,V3.sub(shO,gripGap)]) {
        const d=V3.sub(targetS,center),len=V3.len(d);if(len>reach)targetS=V3.add(center,V3.mul(d,reach/len));
      }
    }
    const [elS, hS] = ik3(shS, targetS, def.A1, def.A2, R(def.twoHand?[0.2,0.6,1]:[0.7, 0.6, -0.4]));
    const offTarget = def.twoHand && !p.freeHand ? V3.add(hS,V3.mul(norm3(R(p.sw)),6)) : V3.add(shO,R(def.twoHand?[p.oh[0],p.oh[1],Math.max(6,p.oh[2])]:p.oh));
    const [elO, hO] = ik3(shO, offTarget, def.A1, def.A2, R(def.twoHand?[-0.2,0.6,1]:[-0.7, 0.6, -0.4]));
    const hipS = V3.add(hip, rot3([def.hipX, 0, 0], p.yaw * 0.5, 0)), hipO = V3.add(hip, rot3([-def.hipX, 0, 0], p.yaw * 0.5, 0));
    const ftO = [-p.wid, def.ank - p.lf, p.stride / 2 + p.fz + p.sz * 0.4], ftS = [p.wid, def.ank - p.lb, -p.stride / 2 + p.nz + p.sz * 0.4];
    const [knS, aS] = ik3(hipS, ftS, def.L1, def.L2, [0.15, 0, 1]), [knO, aO] = ik3(hipO, ftO, def.L1, def.L2, [-0.15, 0, 1]);
    const items = [], add = (d, fn) => items.push([d, fn]);
    const seg = (part, a, b, L, d) => add(d, () => { const A = S(a), Q = S(b); pd(P_(part, {}, fl), A[0], A[1], Math.atan2(Q[1] - A[1], Q[0] - A[0]), Math.max(0.3, Math.hypot(Q[0] - A[0], Q[1] - A[1]) / ((part===def.upper?(def.upperSpan||L):part===def.fore?(def.foreSpan||L):L) * K)), 1); });
    const spr = (part, P, at, rot, d, sy2 = 1) => add(d, () => { const A = S(at); pd(P_(part, P, fl), A[0], A[1], rot, mir, sy2); });
    const mid = (a, b) => V3.mul(V3.add(a, b), 0.5);
    // the cape hangs from the shoulders to the floor and trails the lunge
    if (def.cape !== false) {
      const capeTop = T([0, def.capeY, -5]), cT = S(capeTop);
      add(v === 'b' ? 0.5 : -40, () => pd(P_(def.p + '_cape', { v }, fl), cT[0], cT[1], v === 's' ? mir * (p.pitch * 0.5 + p.sz * 0.03) : Math.sin(globalT * 1.6) * 0.02, mir, clamp((yFeet - 2 * K - cT[1]) / (def.capeH * K), 0.7, 1.4)));
    }
    const animF=Math.floor(globalT*6)%4;
    if(def.halo) spr(def.p+'_halo',{v,p2:P2,f:animF},T([0,def.shY+6,-6]),0,-45);
    if(def.wings && (!def.rageWings || P2)) spr(def.p+'_wings',{v,p2:P2,f:animF},T([0,def.shY,-4]),v==='s'?mir*p.pitch*.4:0,v==='b'?.4:-30);
    if(def.skirt) spr(def.p+'_skirt',{v},hip,v==='s'?mir*(p.pitch*.35+Math.sin(globalT*2)*.025):Math.sin(globalT*2)*.025,-.5);
    if(def.tail) spr(def.p+'_tail',{v,f:animF},hip,B.type==='hakaishin'?(v==='s'?mir*p.pitch:0):(v==='s'?-mir*(p.pitch*.4+p.sz*.025):Math.sin(globalT*2)*.04),-3);
    // legs (behind the torso's tassets): near leg over far leg
    if(def.legs!==false) for (const [hp, kn, an] of [[hipO, knO, aO], [hipS, knS, aS]]) {
      // Cyclops' wrap is part of the torso sprite: even a raised near knee
      // must stay underneath it, while the exposed lower leg remains visible.
      const d = def.skirtOccludesLegs ? Math.min(dp(kn) - 8, -1) : dp(kn) - 8;
      seg(def.p + '_thigh', hp, kn, def.L1, d); seg(def.p + '_shin', kn, an, def.L2, d + 0.05);
      spr(def.p + '_foot', { v }, an, 0, d + 0.1);
    }
    spr(def.p + '_torso', { v, p2: P2 }, hip, v === 's' ? mir * p.pitch : 0, 0);
    // The exposed cervical bones connect the robe collar to the underside of the skull.
    if(def.boneNeck) seg(def.p+'_neck',T([0,def.shY+2,0]),T([0,def.neckY-7,4]),11,.6);
    if(def.carriedHead) {
      spr(def.p+'_neck',{v,f:animF},T([0,def.neckY,0]),0,1);
      if(!B.headOut) spr(def.p+'_head',{v,p2:P2},V3.add(hO,[0,8,0]),0,dp(hO)+1.8);
    } else spr(def.p + '_head', { v, p2: P2, f:animF, gaze:p.gaze>.5?1:0 }, T([0, def.neckY, 0]), v === 's' ? mir * p.pitch * 0.6 : 0, 1);
    if(def.fourArms) {
      for(const side of[-1,1]) {
        const sh=T([side*22,def.shY+17,0]),hd=T([side*11,10,15]);
        const [el,hand]=ik3(sh,hd,def.A1,def.A2,R([side*.3,.6,1]));
        seg(def.upper,sh,el,def.A1,dp(el));seg(def.fore,el,hand,def.A2,dp(hand)+.1);spr(def.hand,{},hand,0,dp(hand)+.3);
      }
      spr(def.p+'_world',{v,p2:P2,f:animF},T([0,9,17]),0,dp(T([0,9,17]))+.4);
    }
    if(p.orb && !def.natural) for(const hand of(def.fourArms?[hS,hO]:[hO])) spr(def.p+'_orb',{p2:P2,f:animF},V3.add(hand,[0,-8,0]),0,dp(hand)+1.7);
    const orbit = def.spinTip && B.sweeps.length && p.sweep && p.sweep.t>=p.sweep.tele ? generalSpinGeometry(B,def,x,yFeet,K) : null;
    if(!orbit) {
    B.r3SpinG=null;
    const armDepth=d=>def.twoHand?(v==='b'?Math.min(d,-3):v==='f'?Math.max(d,2):d):d;
    const pm = sd => v === 's' ? 1 : (v === 'f' ? sd : -sd) * mir;
    spr(def.p + '_pauld', { v, m: pm(-1) }, shO, 0, armDepth(dp(shO)) + 0.8); spr(def.p + '_pauld', { v, m: pm(1) }, shS, 0, armDepth(dp(shS)) + 0.8);
    for (const [sh, el, hd, ex] of [[shO, elO, hO, 0], [shS, elS, hS, 0.2]]) {
      seg(def.upper, sh, el, def.A1, armDepth(dp(mid(sh, el))) + 1 + ex); seg(def.fore, el, hd, def.A2, armDepth(dp(mid(el, hd))) + 1.1 + ex);
      add(armDepth(dp(hd)) + 1.3 + ex, () => { const A = S(hd); pd(P_(def.hand, {}, fl), A[0], A[1]); });
    }
    if (B.type === 'goblinking' && p.bomb > 0.55) spr('gk3_bomb', {}, V3.add(hO, [0, -4, 0]), 0, dp(hO) + 1.5);
    if(def.shield) spr(def.p+'_shield',{v},hO,v==='s'?mir*p.pitch*.4:0,dp(hO)+1.6);
    if(def.hook) add(dp(hO)+1.5,()=>{const A=S(hO);ctx.strokeStyle='#c8ccd4';ctx.lineWidth=2*K;ctx.beginPath();ctx.moveTo(A[0],A[1]);ctx.lineTo(A[0],A[1]+7*K);ctx.lineTo(A[0]-3*K,A[1]+5*K);ctx.stroke();});
    if(p.heldRock>.55) spr(def.p+'_rock',{},V3.add(hO,[0,-6,0]),0,dp(hO)+1.6);
    // the sword: in 3D it foreshortens as it points at you; in a full swing it reaches out along the swing
    const swd = norm3(R(p.sw)), H = S(hS), Tp = S(V3.add(hS, V3.mul(swd, def.reach)));
    let ang = Math.atan2(Tp[1] - H[1], Tp[0] - H[0]), sc = Math.max(0.25, Math.hypot(Tp[0] - H[0], Tp[1] - H[1]) / (def.reach * K));
    if (p.sweep && p.sweep.t >= p.sweep.tele) { ang = -p.sweep.ang; sc = Math.max(1, (p.sweep.len - Math.hypot(H[0] - x, H[1] - (yFeet - 40 * K))) / (def.reach * K)); }
    const ghosts = B.r3G || (B.r3G = []);
    if(!def.unarmed) add(armDepth(dp(V3.add(hS, V3.mul(swd, 14)))) + 1.25, () => {
      for (let i = 0; i < ghosts.length; i++) { const g0 = ghosts[i]; if (Math.abs(g0[2] - ang) > 0.2) pd(P_(def.sword, {}, false), g0[0], g0[1], g0[2], g0[3], 1, 0.22 / (i + 1)); }
      pd(P_(def.sword, {p2:P2}, fl), H[0], H[1], ang, sc, 1);
      ghosts.unshift([H[0], H[1], ang, sc]); if (ghosts.length > 2) ghosts.length = 2;
    });
    add(armDepth(dp(hS)) + 1.4, () => { pd(P_(def.hand, {}, fl), H[0], H[1]); });   // the fist closes over the grip
    if(def.offWeapon) spr(def.p+'_offweapon',{},hO,Math.atan2(Tp[1]-H[1],Tp[0]-H[0]),dp(hO)+1.25);
    if(def.dual) {
      const d=norm3(R(p.osw||p.sw)), O=S(hO), tip=S(V3.add(hO,V3.mul(d,def.reach))), second=B.sweeps[1];
      let a=Math.atan2(tip[1]-O[1],tip[0]-O[0]), k=Math.max(.25,Math.hypot(tip[0]-O[0],tip[1]-O[1])/(def.reach*K));
      if(second&&second.t>=second.tele){a=-second.ang;k=Math.max(1,(second.len-Math.hypot(O[0]-x,O[1]-(yFeet-40*K)))/(def.reach*K));}
      add(dp(V3.add(hO,V3.mul(d,14)))+1.25,()=>pd(P_(def.sword,{p2:P2},fl),O[0],O[1],a,k,1));
      add(dp(hO)+1.4,()=>pd(P_(def.hand,{},fl),O[0],O[1]));
    }
    } else {
      const line=(part,a,b,L)=>pd(P_(part,{},fl),a[0],a[1],Math.atan2(b[1]-a[1],b[0]-a[0]),Math.hypot(b[0]-a[0],b[1]-a[1])/((part===def.upper?(def.upperSpan||L):part===def.fore?(def.foreSpan||L):L)*K),1);
      // Draw each complete arm in its rotating depth order; no four-view hand-position jumps.
      const history=B.r3SpinG||(B.r3SpinG=[[],[]]);
      orbit.forEach((g,i)=>{
        const order=q=>v==='b'?Math.min(q,-3):v==='f'?Math.max(q,2):q;
        const d=def.twoHand?order(g.hand[2]/K):g.depth, da=def.twoHand?order((g.shoulder[2]+g.elbow[2]+g.hand[2])/(3*K)):d, ghosts=history[i];
        add(da+.8,()=>{pd(P_(def.p+'_pauld',{v,m:i?-1:1},fl),g.shoulder[0],g.shoulder[1],0,mir,1);line(def.upper,g.shoulder,g.elbow,def.A1);line(def.fore,g.elbow,g.hand,def.A2);});
        add(d+1.25,()=>{
          if(g.weapon) {
          for(let j=0;j<ghosts.length;j++){const h=ghosts[j];pd(P_(def.sword,{p2:P2},false),h[0],h[1],h[2],h[3],1,.18/(j+1));}
          pd(P_(def.sword,{p2:P2},fl),g.hand[0],g.hand[1],g.angle,g.scale,1);
          ghosts.unshift([g.hand[0],g.hand[1],g.angle,g.scale]);if(ghosts.length>2)ghosts.length=2;
          }
          pd(P_(def.hand,{},fl),g.hand[0],g.hand[1]);
          if(!g.weapon && def.shield) pd(P_(def.p+'_shield',{v},fl),g.hand[0],g.hand[1],0,mir,1);
          if(!g.weapon && def.hook){ctx.strokeStyle='#c8ccd4';ctx.lineWidth=2*K;ctx.beginPath();ctx.moveTo(g.hand[0],g.hand[1]);ctx.lineTo(g.hand[0],g.hand[1]+7*K);ctx.lineTo(g.hand[0]-3*K,g.hand[1]+5*K);ctx.stroke();}
        });
      });
    }
    items.sort((a, b) => a[0] - b[0]);
    for (const it of items) it[1]();
  }
  function drawBoss() {
    const B = boss; if (!B) return;
    const x = B.x, by = sy(B.y), r = B.r, z = (B.z || 0) * 70;
    if (B.dead > 0.6) return;
    if (RIG[B.type]) { drawSweeps(B, x, by, r); if (B.tele != null) { ctx.strokeStyle = 'rgba(255,60,60,.55)'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x + Math.cos(B.tele) * 300, by - Math.sin(B.tele) * 300); ctx.stroke(); ctx.setLineDash([]); } drawRigBoss(B); pfxBossBreath(B); return; }
    const y = by - z;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, by + r * 0.7, r * (1 - B.z * 0.4), r * 0.4 * (1 - B.z * 0.4), 0, 0, 7); ctx.fill();
    if (B.mv && (B.mv.name === 'jump' || B.mv.name === 'split') && B.mv.n === 0) { ctx.strokeStyle = 'rgba(255,60,60,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(B.mv.tx, sy(B.mv.ty), r, 0, 7); ctx.stroke(); }
    if (B.tele != null) { const M = B.mv && /^breath/.test(B.mv.name) ? mouthOf(B) : { at: false }, tx = M.at ? M.x : x, ty = M.at ? sy(M.y) : y; ctx.strokeStyle = 'rgba(255,60,60,.55)'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + Math.cos(B.tele) * 300, ty - Math.sin(B.tele) * 300); ctx.stroke(); ctx.setLineDash([]); }
    drawSweeps(B, x, y, r);
    const hurt = B.hurt > 0, look = Math.atan2(hero.y - B.y, hero.x - B.x);
    ctx.save();
    ctx.globalAlpha = B.alpha == null ? 1 : clamp(B.alpha, 0, 1);
    if (B.dead) ctx.globalAlpha = Math.max(0, 1 - B.dead / 0.6);
    // effects behind the body
    if (B.phase === 2) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 1.7); g.addColorStop(0, `rgba(255,40,60,${0.18 + beatPulse * 0.12})`); g.addColorStop(1, 'rgba(255,40,60,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, 7); ctx.fill(); ctx.restore(); }
    if (B.type === 'lich') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(180,140,255,${0.1 + beatPulse * 0.12})`; ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, 7); ctx.fill(); ctx.restore(); }
    if (B.type === 'hakaishin') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 10; i++) { const a = globalT * (i % 2 ? 0.6 : -0.45) + i * 0.63, rr = r * (1.25 + (i % 3) * 0.18); ctx.fillStyle = i % 3 ? 'rgba(255,90,220,.7)' : 'rgba(255,240,170,.8)'; ctx.fillRect(q(x + Math.cos(a) * rr) - 1.5, q(y - Math.sin(a) * rr * 0.6) - 1.5, 3, 3); } ctx.restore(); }
    if (B.type === 'fenrir') for (let i = 0; i < 5; i++) { const kk = (globalT * 0.4 + i / 5) % 1; ctx.fillStyle = `rgba(220,245,255,${0.8 * (1 - kk)})`; ctx.fillRect(q(x - r + (i * 37) % (r * 2)), q(y + r * 0.4 - kk * 60), 3, 3); }
    if (B.type === 'icequeen') for (let i = 0; i < 6; i++) { const a = globalT * 0.8 + i / 6 * Math.PI * 2, ox = x + Math.cos(a) * r * 1.5, oy = y - Math.sin(a) * r * 1.0; ctx.fillStyle = 'rgba(190,240,255,.85)'; ctx.fillRect(Math.round(ox) - 2, Math.round(oy) - 6, 4, 12); ctx.fillRect(Math.round(ox) - 5, Math.round(oy) - 2, 10, 4); }
    // the boss (pixel sprite, feet on the shadow; fliers hover above it)
    const FLOAT = { lich: 1, icequeen: 1, thunderbird: 1, voideye: 1, ghostcaptain: 1, archmage: 1, quetzal: 1, fallenangel: 1, hakaishin: 1 };
    const hov = FLOAT[B.type] ? 12 + Math.sin(globalT * 2.2) * 4 : 0;
    const lk = Math.round((((-look) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 4)) % 8;
    const spr = SPR.boss(B.type, { f: Math.floor(globalT * (B.type === 'thunderbird' ? 8 : 4)), act: B.mv && B.mv.t < 0.7 ? 1 : 0, p2: B.phase === 2, look: lk, air: (B.z || 0) > 0.05, flash: hurt, noArm: WR[B.type] ? 1 : 0 });
    for (const d of B.decoys || []) { if (typeof BEAST3 !== 'undefined' && BEAST3.has(B.type)) { ctx.save(); ctx.globalAlpha *= 0.92; BEAST3.draw(ctx, Object.assign({}, B, { x: d.x, y: d.y, sweeps: [], b3: B.b3d || (B.b3d = {}) }), d.x, sy(d.y) + r * 0.7 - hov, false, { t: globalT, hero, cy: sy(d.y) }); ctx.restore(); } else SPR.draw(ctx, spr, d.x, sy(d.y) + r * 0.7 - hov, 0.92); }   // illusions (no shadow)
    if (B.regen) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(120,255,100,${0.18 + 0.12 * Math.sin(globalT * 9)})`; ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, 7); ctx.fill(); ctx.restore(); }
    if (typeof BEAST3 !== 'undefined' && BEAST3.has(B.type)) BEAST3.draw(ctx, B, x, by + r * 0.7 - z - hov, hurt, { t: globalT, hero, cy: y, by, fistOut: B.type === 'colossus' && bullets.some(b => b.kind === 'fist') });   // beasts in three views (beasts3.js)
    else if (B.type === 'cyclops') drawCyclops(B, x, by + r * 0.7 - z, y, hurt);
    else if (R3[B.type]) drawR3(B, R3[B.type], x, by + r * 0.7 - z - hov, hurt);
    else if (WR[B.type]) drawWeaponBoss(B, WR[B.type], x, by + r * 0.7 - z - hov, y, spr, hurt);
    else SPR.draw(ctx, spr, x, by + r * 0.7 - z - hov);
    pfxBossBreath(B);
    if (B.type === 'thunderbird' && Math.sin(globalT * 13) > 0.6) { ctx.strokeStyle = '#fff6a0'; ctx.lineWidth = 2; ctx.beginPath(); let px = x + rnd(-r, r), py = y - r * 1.2; ctx.moveTo(px, py); for (let k = 0; k < 4; k++) { px += rnd(-12, 12); py += 12; ctx.lineTo(px, py); } ctx.stroke(); }
    ctx.restore();
  }
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }

  // dithered fills for the danger areas (cached per colour / strength)
  const ditherPats = new Map();
  function ditherFill(col, a) {
    const k = col + '|' + Math.round(a * 10);
    let p = ditherPats.get(k);
    if (!p || p.ctx !== ctx) { p = { pat: ctx.createPattern(SPR.dither(col, Math.round(a * 10) / 10), 'repeat'), ctx }; ditherPats.set(k, p); }
    patShift(p.pat, 0, 0); return p.pat;
  }
  const PATCH = { web: ['230,236,255', 0.35], ice: ['190,230,255', 0.5], poison: ['150,230,60', 0.45], burn: ['255,110,40', 0.5], sand: ['220,180,110', 0.45] };
  // ---- boss signature effects: the hero's shadow, tornadoes, darkness ----
  function drawSigFx() {
    for (const sd of shades) {
      const x = sd.x, y = sy(sd.y), a = Math.min(1, sd.t / 0.5, (sd.life - sd.t) / 0.5);
      ctx.fillStyle = 'rgba(40,0,60,.4)'; ctx.beginPath(); ctx.ellipse(x, y + hero.r * 0.75, hero.r, hero.r * 0.4, 0, 0, 7); ctx.fill();
      SPR.draw(ctx, SPR.shadeOf(heroSprite(hero)), x, y + hero.r * 0.75, a * (sd.t < 0.6 ? 0.5 : 1));
      ctx.fillStyle = '#ff3a5a'; ctx.fillRect(q(x - 4.5), q(y - 25.5), 3, 3); ctx.fillRect(q(x + 3), q(y - 25.5), 3, 3);
    }
    for (const tw of twisters) {
      const x = tw.x, y = sy(tw.y), a = Math.min(1, tw.t / 0.4, (tw.life - tw.t) / 0.4);
      ctx.globalAlpha = a; ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y + 6, tw.r, tw.r * 0.4, 0, 0, 7); ctx.fill();
      for (let i = 0; i < 7; i++) {
        const k = i / 6, rw = tw.r * (0.35 + k * 0.9), off = Math.sin(globalT * 9 + i * 0.9 + tw.ph) * 6 * k;
        ctx.fillStyle = i % 2 ? 'rgba(200,255,232,.85)' : 'rgba(140,220,190,.85)'; ctx.fillRect(q(x - rw + off), q(y - i * 9), q(rw * 2), 6);
      }
      ctx.globalAlpha = 1;
    }
  }
  function drawDark() {   // kraken's ink: only a small circle around the hero stays lit
    const a = Math.min(1, darkT / 0.5) * 0.86;
    ctx.beginPath(); ctx.rect(-W, -H, W * 4, H * 3); ctx.moveTo(hero.x + 115, sy(hero.y)); ctx.arc(hero.x, sy(hero.y), 115, 0, 7, true);
    ctx.fillStyle = `rgba(14,6,24,${a})`; ctx.fill('evenodd');
  }

  function drawZones(telegraphsOnly=false) {
    for (const z of zones) {
      if(telegraphsOnly&&(z.type==='patch'||z.t>=z.tele))continue;
      const col = ZCOL[z.kind] || '255,80,80';
      if (z.type === 'patch') {
        const x = z.x, y = sy(z.y), P = PATCH[z.kind] || ['255,80,80', 0.4], fade = Math.min(1, (z.life - z.t) / 0.6, z.t / 0.25);
        ctx.globalAlpha = fade;
        ctx.fillStyle = ditherFill(P[0], P[1]); ctx.beginPath(); ctx.arc(x, y, z.r, 0, 7); ctx.fill();
        if (z.kind === 'web') { ctx.strokeStyle = 'rgba(240,244,255,.8)'; ctx.lineWidth = 1.5; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * z.r, y - Math.sin(a) * z.r); ctx.lineTo(x + Math.cos(a) * z.r, y + Math.sin(a) * z.r); ctx.stroke(); } for (const k of [0.35, 0.7]) { ctx.beginPath(); ctx.arc(x, y, z.r * k, 0, 7); ctx.stroke(); } }
        else if (z.kind === 'sand') { for (let i = 0; i < 3; i++) { ctx.strokeStyle = `rgba(160,120,60,${0.8 - i * 0.2})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, z.r * (0.3 + i * 0.25), globalT * 3 + i, globalT * 3 + i + 3.5); ctx.stroke(); } ctx.fillStyle = '#3a2810'; ctx.beginPath(); ctx.arc(x, y, z.core, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(220,180,110,.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(x, y, z.pr, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
        else if (z.kind === 'burn') { const f = Math.floor(globalT * 10 + z.x); SPR.draw(ctx, SPR.ENV.flame(f, false), x, y - 3); }
        else if (z.kind === 'poison') { for (let i = 0; i < 3; i++) { const k = (globalT * 0.8 + i / 3 + z.x * 0.01) % 1; ctx.fillStyle = `rgba(200,255,120,${1 - k})`; ctx.fillRect(q(x + Math.sin(i * 2.3) * z.r * 0.5), q(y - k * 20), 3, 3); } }
        ctx.globalAlpha = 1; continue;
      }
      if (z.type === 'seg') {
        const x1 = z.x, y1 = sy(z.y), x2 = z.x2, y2 = sy(z.y2);
        if (z.t < z.tele) { const k = z.t / z.tele; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = `rgba(20,10,30,${0.35 + k * 0.3})`; ctx.lineWidth = z.w * 2 + 3; ctx.stroke(); ctx.strokeStyle = `rgba(${col},${0.55 + k * 0.45})`; ctx.lineWidth = 3 + Math.round(k * 2) * 1.5; ctx.setLineDash([9, 9]); ctx.stroke(); ctx.setLineDash([]); }
        else if (z.dmg) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(${col},.5)`; ctx.lineWidth = z.w * 2.6; ctx.beginPath();
          ctx.moveTo(x1, y1); const n = 7; for (let i = 1; i <= n; i++) { const k = i / n; ctx.lineTo(lerp(x1, x2, k) + (i < n ? rnd(-8, 8) : 0), lerp(y1, y2, k) + (i < n ? rnd(-8, 8) : 0)); } ctx.stroke();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
        }
        continue;
      }
      if (z.type === 'doom') {
        const k = clamp(z.t / z.tele, 0, 1);
        if (!z.fired) {
          ctx.beginPath(); ctx.arc(arena.cx, sy(arena.cy), arena.R, 0, 7); for (const s2 of z.safe) { ctx.moveTo(s2.x + s2.r, sy(s2.y)); ctx.arc(s2.x, sy(s2.y), s2.r, 0, 7, true); }
          ctx.fillStyle = ditherFill('200,40,140', 0.25 + k * 0.45); ctx.fill('evenodd');
          for (const s2 of z.safe) { ctx.strokeStyle = `rgba(255,255,255,${0.6 + 0.4 * Math.sin(globalT * 10)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s2.x, sy(s2.y), s2.r, 0, 7); ctx.stroke(); }
        } else { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,80,180,${0.6 * (1 - (z.t - z.tele) / 0.4)})`; ctx.beginPath(); ctx.arc(arena.cx, sy(arena.cy), arena.R, 0, 7); ctx.fill(); ctx.restore(); }
        continue;
      }
      if (z.type === 'cone') {
        const x = z.x, y = sy(z.y), k = clamp(z.t / z.tele, 0, 1), a0 = -z.ang;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, z.len, a0 - z.spread, a0 + z.spread); ctx.closePath();
        if (!z.fired) {
          ctx.fillStyle = ditherFill('170,255,140', 0.18 + k * 0.4); ctx.fill();
          ctx.strokeStyle = `rgba(200,255,170,${0.5 + k * 0.5})`; ctx.lineWidth = 3; ctx.setLineDash([9, 7]); ctx.beginPath(); ctx.moveTo(x + Math.cos(a0 - z.spread) * z.len, y + Math.sin(a0 - z.spread) * z.len); ctx.lineTo(x, y); ctx.lineTo(x + Math.cos(a0 + z.spread) * z.len, y + Math.sin(a0 + z.spread) * z.len); ctx.stroke(); ctx.setLineDash([]);
        } else { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(220,255,190,${0.65 * (1 - (z.t - z.tele) / z.act)})`; ctx.fill(); ctx.restore(); }
        continue;
      }
      if (z.type === 'shrink') {
        const T1 = z.tele, cx = arena.cx, cyy = sy(arena.cy), r = z.r || z.r0;
        if (z.t < T1) { ctx.strokeStyle = `rgba(255,80,210,${0.4 + 0.4 * Math.sin(globalT * 12)})`; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.arc(cx, cyy, z.r1, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
        if (r < arena.R - 1) {
          ctx.beginPath(); ctx.arc(cx, cyy, arena.R + 40, 0, 7); ctx.moveTo(cx + r, cyy); ctx.arc(cx, cyy, r, 0, 7, true);
          ctx.fillStyle = 'rgba(12,2,22,.82)'; ctx.fill('evenodd'); ctx.fillStyle = ditherFill('200,40,180', 0.35); ctx.fill('evenodd');
          ctx.strokeStyle = '#ff4ad8'; ctx.lineWidth = 3; ctx.beginPath();
          for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2, rr = r + (i % 2 ? 4 : -3) + Math.sin(globalT * 20 + i) * 2; if (i) ctx.lineTo(cx + Math.cos(a) * rr, cyy + Math.sin(a) * rr); else ctx.moveTo(cx + Math.cos(a) * rr, cyy + Math.sin(a) * rr); }
          ctx.stroke(); ctx.strokeStyle = 'rgba(255,220,250,.8)'; ctx.lineWidth = 1.5; ctx.stroke();
        }
        continue;
      }
      if (z.type === 'circle') {
        const x = z.x, y = sy(z.y);
        if (!z.fired) {
          const k = clamp(z.t / z.tele, 0, 1);
          ctx.fillStyle = ditherFill(col, 0.35 + k * 0.4); ctx.beginPath(); ctx.arc(x, y, z.r, 0, 7); ctx.fill();
          ctx.fillStyle = `rgba(${col},${0.25 + k * 0.3})`; ctx.beginPath(); ctx.arc(x, y, z.r * k, 0, 7); ctx.fill();
          ctx.strokeStyle = `rgba(${col},.95)`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, z.r, 0, 7); ctx.stroke();
          if (z.kind === 'mine') { ctx.fillStyle = '#2a2a2a'; ctx.fillRect(q(x) - 7.5, q(y) - 7.5, 15, 15); ctx.fillStyle = '#4a4a4a'; ctx.fillRect(q(x) - 6, q(y) - 6, 6, 3); ctx.fillStyle = Math.sin(z.t * 20) > 0 ? '#ff4040' : '#ffcc40'; ctx.fillRect(q(x) - 1.5, q(y) - 12, 3, 4.5); }
        } else {
          const k = (z.t - z.tele) / 0.3;
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = `rgba(${col},${0.7 * (1 - k)})`; ctx.beginPath(); ctx.arc(x, y, z.r * (1 + k * 0.3), 0, 7); ctx.fill();
          if (z.kind === 'holy') { ctx.fillStyle = `rgba(255,245,200,${0.75 * (1 - k)})`; ctx.fillRect(q(x - z.r * 0.45), q(y - 420), q(z.r * 0.9), 420); ctx.fillStyle = `rgba(255,255,255,${1 - k})`; ctx.fillRect(q(x - z.r * 0.15), q(y - 420), q(z.r * 0.3), 420); }
          if (z.kind === 'bolt') { ctx.strokeStyle = `rgba(255,255,220,${1 - k})`; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(x + 9, y - 400); ctx.lineTo(x - 10.5, y - 199.5); ctx.lineTo(x + 6, y - 100.5); ctx.lineTo(x, y); ctx.stroke(); }
          ctx.restore();
        }
      } else {
        const x = z.x, y = sy(z.y), ex = x + Math.cos(z.ang) * z.len, ey = y - Math.sin(z.ang) * z.len;
        if (z.t < z.tele) {
          const k = z.t / z.tele;
          ctx.strokeStyle = `rgba(${col},${0.3 + k * 0.5})`; ctx.lineWidth = 3 + Math.round(k * 2) * 1.5; ctx.setLineDash([9, 9]);
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
        } else {
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'butt';
          ctx.strokeStyle = `rgba(${col},.35)`; ctx.lineWidth = z.w * 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
          ctx.strokeStyle = `rgba(${col},.9)`; ctx.lineWidth = z.w * 1.6; ctx.stroke();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(3, z.w * 0.6); ctx.stroke();
          ctx.restore();
        }
      }
    }
  }
  function drawBullets() {
    const f = Math.floor(globalT * 12);
    for (const b of bullets) {
      const x = b.x, y = sy(b.y), R = Math.max(2, Math.round(b.r / 1.5));
      if (b.delay && b.t < b.delay) continue;
      const lift = b.z || 0;
      pfxBullet(b);
      if (b.kind === 'web') { SPR.draw(ctx, SPR.ENV.web(), x, y - lift); continue; }
      if (b.kind === 'bomb') { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(q(x - 6), q(y + 4), 12, 3); SPR.draw(ctx, SPR.ENV.barrel(true, f), x, y + 8 - lift); continue; }
      if (b.kind === 'knife') { const a = b.vx || b.vy ? Math.atan2(-b.vy, b.vx) : Math.atan2(-(hero.y - b.y), hero.x - b.x); ctx.strokeStyle = '#e8ecf4'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 9, y + Math.sin(a) * 9); ctx.lineTo(x + Math.cos(a) * 7, y - Math.sin(a) * 7); ctx.stroke(); ctx.fillStyle = '#f2c14e'; ctx.fillRect(q(x - Math.cos(a) * 9) - 1.5, q(y + Math.sin(a) * 9) - 1.5, 3, 3); continue; }
      if (b.kind === 'crescent') { const a = Math.atan2(-b.vy, b.vx); ctx.strokeStyle = b.holy ? 'rgba(255,230,140,.6)' : 'rgba(160,90,255,.55)'; ctx.lineWidth = b.holy ? 9 : 12; ctx.beginPath(); ctx.arc(x - Math.cos(a) * 10, y + Math.sin(a) * 10, b.r, -a - 1.1, -a + 1.1); ctx.stroke(); ctx.strokeStyle = b.holy ? '#fffbe8' : '#e8d8ff'; ctx.lineWidth = b.holy ? 3 : 4.5; ctx.stroke(); continue; }
      if (b.kind === 'spiritwolf') {
        const s2 = SPR.enemy('snowwolf', { st: 'dash', f: 0, step: 0, flip: b.vx < 0 }), sp = hyp(b.vx, b.vy) || 1;
        for (let k = 3; k >= 1; k--) SPR.draw(ctx, s2, x - b.vx / sp * k * 16, y + b.vy / sp * k * 16 + 12, 0.14 * (4 - k));
        SPR.draw(ctx, s2, x, y + 12, 0.85); ctx.save(); ctx.globalCompositeOperation = 'lighter'; SPR.draw(ctx, s2, x, y + 12, 0.35); ctx.restore(); continue;
      }
      if (b.kind === 'dream' || b.kind === 'bubble') {
        const rr = b.r * (1 + Math.sin(globalT * 6 + b.x * 0.05) * 0.06), fade = Math.min(1, b.life * 2);
        ctx.globalAlpha = fade; ctx.fillStyle = 'rgba(200,140,255,.22)'; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(235,200,255,.95)'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(q(x - rr * 0.5), q(y - rr * 0.55), 4.5, 3); ctx.fillRect(q(x - rr * 0.6), q(y - rr * 0.3), 1.5, 3);
        if (b.kind === 'dream') { ctx.fillStyle = '#ffd8ff'; ctx.fillRect(q(x - 4.5), q(y - 4.5), 9, 1.5); ctx.fillRect(q(x + 1.5), q(y - 3), 1.5, 3); ctx.fillRect(q(x - 1.5), q(y), 1.5, 3); ctx.fillRect(q(x - 4.5), q(y + 3), 9, 1.5); }
        ctx.globalAlpha = 1; continue;
      }
      if (b.kind === 'cannon') { SPR.draw(ctx, SPR.ENV.orb('40,40,50', 10), x, y); ctx.fillStyle = '#9a9aa8'; ctx.fillRect(q(x - 4.5), q(y - 6), 4.5, 3); continue; }
      if (b.kind === 'boulder') { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(q(x - b.r), q(y + b.r * 0.6), q(b.r * 2), 4.5); SPR.draw(ctx, SPR.ENV.rock('#9a7a58', Math.floor(b.t * 8) % 3, 14), x, y + b.r * 0.3); continue; }
      if (b.kind === 'fist') { ctx.fillStyle = '#22262e'; ctx.fillRect(q(x - 15), q(y - 13.5), 30, 27); ctx.fillStyle = '#7a8696'; ctx.fillRect(q(x - 12), q(y - 10.5), 24, 21); ctx.fillStyle = '#b8c4d4'; ctx.fillRect(q(x - 12), q(y - 10.5), 24, 3); ctx.fillStyle = '#ffa23a'; ctx.fillRect(q(x - 3), q(y + 3), 6, 4.5); continue; }
      if (b.kind === 'wave') { ctx.fillStyle = 'rgba(60,140,230,.85)'; ctx.fillRect(q(x - 12), q(y - 12), 24, 24); ctx.fillStyle = '#c8f0ff'; ctx.fillRect(q(x - 12), q(y - 12), 24, 4.5); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(q(x - 6 + Math.sin(globalT * 9 + b.x) * 4), q(y - 3), 6, 3); continue; }
      if (b.kind === 'gbomb') {   // goblin bomb: arcs over, then fizzes on the floor
        if (lift) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(q(x - 6), q(y + 4), 12, 3); }
        const blink2 = b.lit && f % 2; ctx.fillStyle = blink2 ? '#6a2a2a' : '#1a1a26'; ctx.beginPath(); ctx.arc(x, y - lift, 7.5, 0, 7); ctx.fill();
        ctx.fillStyle = '#6a6a84'; ctx.fillRect(q(x - 4.5), q(y - lift - 4.5), 3, 3); ctx.fillStyle = '#8a8a90'; ctx.fillRect(q(x - 1.5), q(y - lift - 10.5), 3, 3);
        ctx.fillStyle = f % 2 ? '#ffe14a' : '#ff6a1a'; ctx.fillRect(q(x + 1.5), q(y - lift - 13.5), 3, 3); continue;
      }
      if (b.kind === 'jball') {   // clown's juggling ball
        const C = ['#ff4a5a', '#4ad0ff', '#ffe14a'][b.ci % 3];
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(q(x - 6), q(y + 4), 12, 3);
        ctx.fillStyle = '#2a1020'; ctx.beginPath(); ctx.arc(x, y - lift, 8, 0, 7); ctx.fill(); ctx.fillStyle = C; ctx.beginPath(); ctx.arc(x, y - lift, 6.5, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(q(x - 3), q(y - lift - 4.5), 3, 3); continue;
      }
      if (b.kind === 'snowball') {   // gets bigger as it rolls
        const rr = b.r; ctx.fillStyle = 'rgba(40,60,90,.3)'; ctx.beginPath(); ctx.ellipse(x, y + rr * 0.55, rr, rr * 0.35, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#7a98b8'; ctx.beginPath(); ctx.arc(x, y - rr * 0.3, rr, 0, 7); ctx.fill(); ctx.fillStyle = '#eaf2fa'; ctx.beginPath(); ctx.arc(x - 1.5, y - rr * 0.3 - 1.5, rr - 2, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(q(x - rr * 0.5), q(y - rr * 0.95), 4.5, 3);
        const sp2 = b.t * 10; ctx.fillStyle = '#b8cce0'; for (let k = 0; k < 2; k++) ctx.fillRect(q(x + Math.cos(sp2 + k * 3) * rr * 0.55), q(y - rr * 0.3 + Math.sin(sp2 + k * 3) * rr * 0.55), 3, 3); continue;
      }
      if (b.kind === 'dhead') {   // the dullahan's head, spinning, trailing blue fire
        const s2 = SPR.enemy('dlhead', { f: Math.floor(b.t * 12) }), sp = hyp(b.vx, b.vy) || 1;
        for (let k = 1; k <= 3; k++) { ctx.fillStyle = `rgba(90,160,255,${0.5 - k * 0.13})`; ctx.fillRect(q(x - b.vx / sp * k * 7 - 4.5), q(y - b.vy / sp * k * 7 * -1 - 4.5), 9, 9); }
        SPR.draw(ctx, s2, x, y + 8); continue;
      }
      if (b.kind === 'sandball') { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(q(x - 7), q(y + 6), 15, 4.5); ctx.fillStyle = '#a87a40'; ctx.beginPath(); ctx.arc(x, y - lift, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#e0b878'; ctx.fillRect(q(x - 4.5), q(y - lift - 4.5), 4.5, 3); continue; }
      if (b.kind === 'spore' && b.dest) { SPR.draw(ctx, SPR.ENV.spore(), x, y - lift); continue; }
      if (b.kind === 'spore') { SPR.draw(ctx, SPR.ENV.spore(), x, y, Math.min(1, b.life) * 0.9); continue; }
      if (b.kind === 'homing') { SPR.draw(ctx, SPR.ENV.orb('255,110,210', R), x, y); continue; }
      if (b.kind === 'feather') { const a = Math.atan2(-b.vy, b.vx); ctx.strokeStyle = '#5ac0b0'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 9, y + Math.sin(a) * 9); ctx.lineTo(x + Math.cos(a) * 6, y - Math.sin(a) * 6); ctx.stroke(); ctx.strokeStyle = '#e8fff8'; ctx.lineWidth = 1.5; ctx.stroke(); continue; }
      if (b.kind === 'arrow') { const a = Math.atan2(-b.vy, b.vx); ctx.strokeStyle = '#d8c8a0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 12, y - Math.sin(a) * 12); ctx.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4); ctx.stroke(); ctx.fillStyle = '#e8e8f0'; ctx.fillRect(q(x + Math.cos(a) * 5) - 1.5, q(y + Math.sin(a) * 5) - 1.5, 4.5, 4.5); ctx.fillStyle = '#c84040'; ctx.fillRect(q(x - Math.cos(a) * 12) - 1.5, q(y - Math.sin(a) * 12) - 1.5, 3, 3); continue; }
      if (b.kind === 'rock') { SPR.draw(ctx, SPR.ENV.rockShot(), x, y); continue; }
      if (b.kind === 'flame' || b.kind === 'big') { SPR.draw(ctx, SPR.ENV.flame(f + Math.floor(b.x), b.kind === 'big', b.tint || (state === 'boss' && boss ? boss.fcol : null)), x, y, b.kind === 'flame' ? Math.min(1, Math.max(0, b.life / 0.9) + 0.3) : 1); continue; }
      const col = b.col ? b.col : b.kind === 'orb' ? (state === 'boss' && boss && boss.ocol ? boss.ocol : boss && boss.type === 'lich' ? '180,140,255' : boss && boss.type === 'maou' ? '255,80,160' : '120,220,255') : '255,140,50';
      SPR.draw(ctx, SPR.ENV.orb(col, R), x, y);
    }
    for (const r of rings) { ctx.strokeStyle = `rgba(255,190,120,${1 - r.r / r.max})`; ctx.lineWidth = Math.max(3, q(r.w)); ctx.beginPath(); ctx.arc(r.x, sy(r.y), r.r, 0, 7); ctx.stroke(); }
  }
  function drawDrops() {
    for (const d of drops) {
      const x = d.x, y = sy(d.y);
      if (d.type === 'gold') SPR.draw(ctx, SPR.ENV.coin(Math.floor(globalT * 10 + d.x * 0.1)), x, y);
      else if (d.type === 'herb') SPR.draw(ctx, SPR.ENV.herb(), x, y);
      else SPR.draw(ctx, SPR.ENV.potion(POTCOL[d.type] || '#f2c14e'), x, y + 4);
    }
  }
  function drawFx() {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of fx) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.col; const s = p.r > 2.5 ? 3 : 1.5; ctx.fillRect(q(p.x) - s / 2, q(sy(p.y)) - s / 2, s, s); }
    ctx.restore(); ctx.globalAlpha = 1;
    // hit sparks / defeat puffs (pixel animations)
    for (const a of anims) {
      if(pfxAnim(a))continue;
      const f = Math.min(a.frames - 1, Math.floor(a.t / a.dur * a.frames));
      if (a.kind === 'bolt') {
        const k = a.t / a.dur, x0 = a.x, y1 = sy(a.y); let py = y1 - 420, px = x0 + 20;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,250,170,${1 - k})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(px, py);
        for (let i = 1; i <= 6; i++) { py = y1 - 420 + i * 70; px = i === 6 ? x0 : x0 + ((i * 37 + Math.floor(a.x)) % 40) - 20; ctx.lineTo(px, py); }
        ctx.stroke(); ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); continue;
      }
      if (a.kind === 'loot') { const k = a.t / a.dur; SPR.draw(ctx, SPR.ENV.gear(a.slot, a.rar, Math.floor(a.t * 8)), a.x, sy(a.y + 20 + k * 40), 1 - Math.max(0, k - 0.7) / 0.3); continue; }
      const s = a.kind === 'spark' ? SPR.ENV.spark(f, a.big) : SPR.ENV.poof(f);
      SPR.draw(ctx, s, a.x, sy(a.y));
    }
  }
  // crisp text that lives in the world (damage numbers, the boss door sign) — drawn after the pixel layer
  function drawWorldText() {
    ctx.textAlign = 'center';
    for (const s of texts) {
      const a = Math.min(1, s.life / s.max * 2.5), sc = 1 + Math.max(0, (s.life / s.max - 0.8)) * 2;
      ctx.globalAlpha = a; ctx.font = `${Math.round(s.size * sc)}px ${FONT}`;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.strokeText(s.s, s.x, sy(s.y)); ctx.fillStyle = s.col; ctx.fillText(s.s, s.x, sy(s.y));
    }
    ctx.globalAlpha = 1;
    if (D && !arena && !hardRun) {
      const dy = sy(goalY + 20);
      if (dy > -80 && dy < H + 80) { const glow = 0.5 + 0.5 * Math.sin(globalT * 3); txt('BOSS', VW / 2, dy - 100, 16, `rgba(255,${80 + glow * 60},${80 + glow * 60},1)`, 'center'); if (gateKills < gateNeed) txt(`ふういん：あと ${gateNeed - gateKills}たい`, VW / 2, dy - 122, 13, '#d8b0ff', 'center'); }
    }
  }
  function lighting() {
    const x = hero.x, y = sy(hero.y), fog = D.pal.fog, M = Math.max(W, H), RS = M * 1.05;
    const key = fog + ':' + M;
    if (vigFor !== key) {   // one low-res vignette, reused every frame
      vigFor = key; vigImg = document.createElement('canvas'); vigImg.width = vigImg.height = 256;
      const g2 = vigImg.getContext('2d'), g = g2.createRadialGradient(128, 128, 128 * 60 / RS, 128, 128, 128);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.75 * M / RS, `rgba(0,0,0,${fog})`); g.addColorStop(1, `rgba(0,0,0,${fog})`);
      g2.fillStyle = g; g2.fillRect(0, 0, 256, 256);
    }
    ctx.drawImage(vigImg, x - RS, y - RS, RS * 2, RS * 2);
  }

  // ---- HUD ----
  function bar(x, y, w, h, k, col, bg = 'rgba(0,0,0,.6)') { ctx.fillStyle = bg; ctx.fillRect(x, y, w, h); ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(k, 0, 1), h); ctx.strokeStyle = 'rgba(243,236,218,.8)'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h); }
  function txt(s, x, y, size, col = '#f3ecda', align = 'left', stroke = true) {
    ctx.font = `${size}px ${FONT}`; ctx.textAlign = align;
    if (stroke) { ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function drawHud() {
    const h = hero, top = safeTop() + 8, hpW=arenaRun?arenaHudBox().hpW:196, chargeH=craftHudRows()*16;
    // status window
    ctx.fillStyle = 'rgba(19,24,58,.86)'; roundRect(8, top, hpW, 50, 6); ctx.fill();
    ctx.strokeStyle = '#f3ecda'; ctx.lineWidth = 2; roundRect(8, top, hpW, 50, 6); ctx.stroke();
    txt(`Lv ${save.lv}`, 16, top + 18, arenaRun?11:14, '#f2c14e', 'left', false);
    txt(`HP ${Math.ceil(h.hp)}/${h.s.maxHp}`, arenaRun?58:66, top + 18, arenaRun?10.5:13, h.hp < h.s.maxHp * 0.3 ? '#ff7a6a' : '#f3ecda', 'left', false);
    bar(16, top + 25, hpW-16, 8, h.hp / h.s.maxHp, h.hp < h.s.maxHp * 0.3 ? '#e5483c' : '#6fd38a');
    bar(16, top + 38, hpW-16, 4, save.exp / expNeed(save.lv), '#7ab8ff');
    let bx = 10;
    for (const [k, lab, c] of [['atk', 'ちから', '#ff9a5a'], ['def', 'まもり', '#9fd0ff']]) {
      if (!(h.buff[k] > 0)) continue;
      ctx.fillStyle = 'rgba(19,24,58,.86)'; roundRect(bx, top + 54+chargeH, 86, 20, 5); ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 1.5; roundRect(bx, top + 54+chargeH, 86, 20, 5); ctx.stroke();
      txt(`${lab} ${Math.ceil(h.buff[k])}s`, bx + 43, top + 69+chargeH, 12, c, 'center', false); bx += 92;
    }
    if (h.pw) {
      const Q = QB[h.pw.kind], lab = h.pw.kind === 'bomb' ? `ばくだん ×${h.pw.n}` : `${Q.name.replace('ハズレ…', '')} ${Math.ceil(h.pw.t)}s`, bw = 22 + lab.length * 12;
      ctx.fillStyle = 'rgba(19,24,58,.86)'; roundRect(bx, top + 54+chargeH, bw, 20, 5); ctx.fill(); ctx.strokeStyle = Q.col; ctx.lineWidth = 1.5; roundRect(bx, top + 54+chargeH, bw, 20, 5); ctx.stroke();
      txt(lab, bx + bw / 2, top + 69+chargeH, 12, Q.col, 'center', false);
    }
    if (save.skill && SKILLS[save.skill]) {   // the set skill: double tap to use; the dark sweep is its cooldown
      const S = SKILLS[save.skill], cx = 40, cy = H - 52 - safeBottom(), cd = Math.max(0, h.skCD || 0), ready = cd <= 0;
      ctx.fillStyle = 'rgba(19,24,58,.86)'; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, 7); ctx.fill();
      ctx.strokeStyle = ready ? S.col : 'rgba(243,236,218,.4)'; ctx.lineWidth = ready ? 3 : 2; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, 7); ctx.stroke();
      txt(S.ch, cx, cy + 8, 22, ready ? S.col : 'rgba(243,236,218,.5)', 'center', false);
      if (!ready) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cd / S.cd); ctx.fill(); txt('' + Math.ceil(cd), cx, cy + 6, 16, '#fff', 'center'); }
      if ((h.skFlash || 0) > 0) { ctx.strokeStyle = `rgba(255,255,255,${h.skFlash * 2})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 26 + (0.5 - h.skFlash) * 30, 0, 7); ctx.stroke(); }
      txt(ready ? '2かいタップ' : S.name, cx, cy + 40, 10, ready ? '#f3ecda' : 'rgba(243,236,218,.6)', 'center');
    }
    if (h.roul) {   // the box's roulette: spins fast, slows, then stops on the prize
      const R = h.roul, cx = W / 2, cy = top + (state === 'boss' ? 196 : 150), stop = R.t > 0.95;
      const k = stop ? R.res : QB_KEYS[Math.floor(Math.pow(R.t, 0.6) * 22) % QB_KEYS.length];
      ctx.fillStyle = 'rgba(19,24,58,.9)'; roundRect(cx - 34, cy - 34, 68, 68, 8); ctx.fill();
      ctx.strokeStyle = stop ? QB[k].col : '#c8b0ff'; ctx.lineWidth = 3; roundRect(cx - 34, cy - 34, 68, 68, 8); ctx.stroke();
      ctx.save(); ctx.translate(cx, cy); ctx.scale(2.2, 2.2); ctx.translate(-cx, -cy); SPR.draw(ctx, SPR.ENV.qicon(k), cx, cy); ctx.restore();
      txt(stop ? QB[k].name : '？？？', cx, cy + 54, 15, stop ? QB[k].col : '#e0d0ff', 'center');
    }
    craftDrawHud();if(!arenaRun)txt(`${save.gold} G`, 214, top + 18, 13, '#f2c14e', 'left');
    if (defRun && state === 'boss') defDrawHud(top, chargeH);
    if (state === 'play'&&!hardRun&&!defRun) {
      // depth meter
      const k = clamp(h.y / goalY, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(W - 14, top + 72, 6, 150);
      ctx.fillStyle = '#f2c14e'; ctx.fillRect(W - 14, top + 72 + 150 * (1 - k), 6, 150 * k);
      txt('BOSS', W - 11, top + 66, 10, '#ff6a5a', 'center');
      const open = gateKills >= gateNeed, lab = open ? 'とびら OK' : `とびら ${gateKills}/${gateNeed}`, bw = 14 + lab.length * 9;
      ctx.fillStyle = 'rgba(19,24,58,.86)'; roundRect(W - 8 - bw, top + 228, bw, 20, 5); ctx.fill(); ctx.strokeStyle = open ? '#f2c14e' : '#c8a0ff'; ctx.lineWidth = 1.5; roundRect(W - 8 - bw, top + 228, bw, 20, 5); ctx.stroke();
      txt(lab, W - 8 - bw / 2, top + 243, 12, open ? '#f2c14e' : '#e0d0ff', 'center', false);
    }
    for(const B of state==='boss'?livingBosses():[]) {   // arrow to an off-screen boss
      const bx = B.x - bcamX + W / 2, byy = sy(B.y), m = 34;
      if (bx < -10 || bx > W + 10 || byy < 60 || byy > H + 10) {
        const ax = clamp(bx, m, W - m), ay = clamp(byy, 110, H - 90), a = Math.atan2(byy - ay, bx - ax);
        ctx.save(); ctx.translate(ax, ay); ctx.rotate(a);
        ctx.fillStyle = `rgba(255,70,70,${0.7 + 0.3 * Math.sin(globalT * 8)})`; ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-8, -11); ctx.lineTo(-8, 11); ctx.fill();
        ctx.restore(); txt(hardRun?B.name:'BOSS', ax, ay + 24, 10, '#ff8a8a', 'center');
      }
    }
    if (state === 'boss' && boss&&!hardRun&&!defRun) {
      const bw = W - 40, by = top + 76+chargeH;
      txt(boss.name + (boss.pers ? `（${PERS[boss.pers][0]}がた）` : ''), W / 2, by - 4, 14, '#fff', 'center');
      bar(20, by, bw, 10, boss.hp / boss.maxHp, boss.phase === 2 ? '#ff3b6a' : '#e5483c');
      if (boss.callout) { ctx.globalAlpha = Math.min(1, boss.callout.t * 2); txt(boss.callout.s, W / 2, by + 30, 16, '#ffd24a', 'center'); ctx.globalAlpha = 1; }
      else if (boss.regen) txt('さいせい中！ たいあたりで とめろ', W / 2, by + 30, 13, '#8af07a', 'center');
      else if (boss.decoys) txt('ほんものは ひとりだけ', W / 2, by + 30, 13, '#c8b8ff', 'center');
    }
    if (freezeT > 0) { ctx.fillStyle = `rgba(200,205,255,${0.16 * Math.min(1, freezeT * 3)})`; ctx.fillRect(0, 0, W, H); txt('TIME STOP', W / 2, H * 0.4, 22, '#e8ecff', 'center'); }
    toasts.forEach((q2, i) => {   // equipment found: short notices under the status bar
      ctx.globalAlpha = Math.min(1, q2.t * 2); const y2 = top + (arenaRun?154+chargeH:hardRun&&state==='boss'?160:defRun?208+chargeH:92) + i * 22;
      ctx.fillStyle = 'rgba(10,8,24,.75)'; ctx.fillRect(16, y2 - 15, W - 50, 20);
      txt(q2.s, W / 2 - 9, y2, 13, q2.col, 'center'); ctx.globalAlpha = 1;
    });
    if (combo >= 2) {
      const k = Math.min(1, comboT);
      ctx.globalAlpha = k; const cy2 = top + (defRun ? 250 : state === 'boss' ? 112+chargeH : 240); txt(`${combo} HIT!`, W - 16, cy2, 18 + Math.min(combo, 20) * 0.6, combo >= 10 ? '#ff6ad0' : '#f2c14e', 'right');
      const cb = comboBonus(combo); if (cb > 0) txt(`いりょく +${Math.round(cb * 100)}%`, W - 16, cy2 + 20, 12, '#fff', 'right'); ctx.globalAlpha = 1;
    }
    if (tut && state === 'play') drawTut();
    else if (hint > 0 && state === 'play') {
      ctx.globalAlpha = Math.min(1, hint);
      txt('どこでも指をおいて スライドで移動', W / 2, H * 0.78, 16, '#fff', 'center');
      txt('おおきく たおして とっしん → こうげき！', W / 2, H * 0.78 + 24, 14, '#f2c14e', 'center');
      ctx.globalAlpha = 1;
    }
  }
  function safeTop() { return safeT; }
  function safeBottom() { return safeB; }
  function drawPad() {
    if (!drag.down || paused || (state !== 'play' && state !== 'boss')) return;
    const charge = hero && heroSpeed() > RAM_MIN;
    padShape(ctx, drag.ox, drag.oy, drag.px, drag.py, PAD_R, charge, hero ? clamp(RAM_MIN / (PAD_MAX * hero.s.ram), 0, 1) : 0);
  }
  // the pad itself; every alpha is scaled by せってい → スライドパッドの こさ
  function padShape(c, ox, oy, px, py, R, charge, ringK) {
    const S2 = save.settings.pad || 1, al = v => Math.min(1, v * S2).toFixed(3);
    const dx = px - ox, dy = py - oy, d = hyp(dx, dy), k = Math.min(1, d / R);
    const kx = d > R ? ox + dx / d * R : px, ky = d > R ? oy + dy / d * R : py;
    c.fillStyle = `rgba(19,24,58,${al(0.35)})`; c.beginPath(); c.arc(ox, oy, R, 0, 7); c.fill();
    c.strokeStyle = `rgba(243,236,218,${al(0.55)})`; c.lineWidth = 2; c.stroke();
    // the outer band = charge zone
    c.strokeStyle = `rgba(255,170,60,${al(charge ? 0.9 : 0.35)})`; c.lineWidth = 4;
    c.beginPath(); c.arc(ox, oy, R - 4, 0, 7); c.stroke();
    if (ringK) {   // where a charge starts: outside this ring the hero is fast enough to ram
      const rr = 6 + ringK * (R - 6);
      c.strokeStyle = charge ? `rgba(255,170,60,${al(0.55)})` : `rgba(243,236,218,${al(0.28)})`; c.lineWidth = 1.5; c.setLineDash([4, 5]);
      c.beginPath(); c.arc(ox, oy, rr, 0, 7); c.stroke(); c.setLineDash([]);
    }
    c.fillStyle = charge ? `rgba(255,170,60,${al(0.9)})` : `rgba(243,236,218,${al(0.55 + k * 0.3)})`;
    c.beginPath(); c.arc(kx, ky, Math.min(22, R * 0.3), 0, 7); c.fill();
  }

  function drawBanner() {
    if (!banner) return;
    const k = Math.min(1, banner.t * 2, (2.6 - banner.t + 0.3) * 3);
    ctx.globalAlpha = clamp(k, 0, 1);
    const y = H * 0.36;
    ctx.fillStyle = banner.boss ? 'rgba(60,0,10,.75)' : 'rgba(10,10,30,.7)'; ctx.fillRect(0, y - 34, W, 62);
    ctx.fillStyle = banner.boss ? '#e5483c' : '#f2c14e'; ctx.fillRect(0, y - 34, W, 2); ctx.fillRect(0, y + 26, W, 2);
    txt(banner.b, W / 2, y - 12, 12, banner.boss ? '#ff8a8a' : '#f2c14e', 'center');
    txt(banner.a, W / 2, y + 14, banner.a.length > 12 ? 18 : 22, '#fff', 'center');
    ctx.globalAlpha = 1;
  }

  // ---- town: one building per screen, swipe left/right, tap to go inside ----
  const TOWN_PAGES = [
    { id: 'house', name: '勇者の家', sub: 'つよさ・せってい・あそびかた', roof: '#3b6ab8', wall: '#e8d8b8' },
    { id: 'gate', name: 'ダンジョンの門', sub: 'ぼうけんに でかける' },
    { id: 'item', name: 'どうぐや', sub: 'かいふくアイテムを かう', roof: '#3b9a5a', wall: '#efe2c4' },
    { id: 'smith', name: 'かじや', sub: 'ぶき・ぼうぐを かう', roof: '#b8463b', wall: '#d8c8b0' },
    { id: 'craft', name: '合成屋', sub: '素材で 特別な装備・道具をつくる', roof: '#487968', wall: '#e0d6b8' },
    { id: 'guild', name: '冒険者ギルド', sub: '依頼の確認・報酬を うけとる', roof: '#596c86', wall: '#d8d2bb' },
    { id: 'arena', name: '闘技場', sub: '固定装備チャレンジ・ボス連戦', roof: '#a54c45', wall: '#c9b89a' },
  ];
  let townPage = 1, townX = 1, inside = null;   // townPage is a slot that keeps counting while you swipe round: the town loops
  const pIdx = i => ((i % TOWN_PAGES.length) + TOWN_PAGES.length) % TOWN_PAGES.length;
  const curPage = () => TOWN_PAGES[pIdx(townPage)];
  const tdrag = { id: null, x0: 0, y0: 0, dx: 0, moved: false };
  function townBuildingRect() { const bw = 236, bh = 210, by = H * 0.64; return { x: W / 2 - bw / 2, y: by - bh, w: bw, h: bh, by }; }

  // ---- town tiles ----
  function townTiles() {
    if (townPats && townPats.ctx === ctx) return townPats;
    const T = SPR.tileCanvas;
    const grass = T('t_grass', 16, 16, g => { g.r(0, 0, 16, 16, '#4a7a3a'); const r = SPR.seeded(3); for (let i = 0; i < 14; i++) g.p(Math.floor(r() * 16), Math.floor(r() * 16), r() < 0.5 ? '#5a8a44' : '#3e6a30'); g.p(4, 9, '#7ab050'); g.p(5, 8, '#8ac860'); g.p(12, 3, '#7ab050'); });
    const road = T('t_road', 24, 12, g => { g.r(0, 0, 24, 12, '#8a7458'); for (const [x, y, w] of [[1, 1, 10], [13, 1, 10], [-5, 7, 10], [7, 7, 10], [19, 7, 10]]) { g.r(x, y, w, 4, '#c8b088'); g.r(x, y, w, 1, '#e0caa0'); g.r(x, y + 3, w, 1, '#a8906c'); } });
    const pats = { ctx, grass: ctx.createPattern(grass, 'repeat'), road: ctx.createPattern(road, 'repeat') };
    const wall = (key, col) => T(key, 16, 12, g => { g.r(0, 0, 16, 12, col); for (const [y] of [[3], [7], [11]]) g.r(0, y, 16, 1, SPR.shade(col, -0.18)); g.r(5, 0, 1, 3, SPR.shade(col, -0.18)); g.r(12, 4, 1, 3, SPR.shade(col, -0.18)); g.r(3, 8, 1, 3, SPR.shade(col, -0.18)); g.r(0, 0, 16, 1, SPR.shade(col, 0.15)); });
    const roof = (key, col) => T(key, 12, 8, g => { g.r(0, 0, 12, 8, col); g.r(0, 3, 12, 1, SPR.shade(col, -0.3)); g.r(0, 7, 12, 1, SPR.shade(col, -0.3)); g.r(0, 0, 1, 4, SPR.shade(col, -0.3)); g.r(6, 4, 1, 4, SPR.shade(col, -0.3)); g.r(1, 0, 4, 1, SPR.shade(col, 0.2)); g.r(7, 4, 4, 1, SPR.shade(col, 0.2)); });
    const stone = T('t_stone', 16, 12, g => { g.r(0, 0, 16, 12, '#4a4252'); for (const [x, y] of [[1, 1], [9, 1], [-3, 7], [5, 7], [13, 7]]) { g.r(x, y, 7, 5, '#6a6078'); g.r(x, y, 7, 1, '#847a94'); } });
    for (const p of TOWN_PAGES) if (p.wall) { pats['w_' + p.id] = ctx.createPattern(wall('tw' + p.wall, p.wall), 'repeat'); pats['r_' + p.id] = ctx.createPattern(roof('tr' + p.roof, p.roof), 'repeat'); }
    pats.stone = ctx.createPattern(stone, 'repeat');
    townPats = pats; return pats;
  }
  function drawTownBackdrop(off) {
    const TP = townTiles();
    // banded sunset sky with dithered seams
    const bands = ['#1b1d4a', '#28245a', '#3e2c66', '#5e3668', '#86406a', '#b45a62', '#dc7a54', '#f0a35a'];
    const bh = q(H * 0.48 / bands.length);
    bands.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, i * bh, W, bh + 1.5); });
    for (let i = 1; i < bands.length; i++) { ctx.fillStyle = bands[i]; for (let x = 0; x < W; x += 6) ctx.fillRect(x + ((i % 2) ? 0 : 3), i * bh - 1.5, 3, 1.5); }
    for (let i = 0; i < 40; i++) { const x = q(((i * 97.3 - off * 0.05) % W + W) % W), y = q((i * 53.7) % (H * 0.28)); if (Math.sin(globalT * 2 + i) > -0.3) { ctx.fillStyle = i % 5 ? 'rgba(255,255,255,.7)' : '#fff6c0'; ctx.fillRect(x, y, 1.5, 1.5); } }
    const wrapX = v => ((v + 60) % (W + 120) + (W + 120)) % (W + 120) - 60, mx = q(wrapX(W * 0.2 - off * 0.02));
    ctx.fillStyle = '#fff2c8'; ctx.beginPath(); ctx.arc(mx, q(H * 0.12), 13.5, 0, 7); ctx.fill(); ctx.fillStyle = bands[1]; ctx.beginPath(); ctx.arc(mx + 6, q(H * 0.12) - 3, 12, 0, 7); ctx.fill();
    // far mountains + the demon castle on the horizon (slow parallax)
    const px = -off * 0.15;
    for (const [col, hgt, fr, base] of [['#2e1f40', 52, 0.017, 0.46], ['#3a2547', 40, 0.021, 0.48]]) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H * 0.52);
      for (let x = 0; x <= W; x += 6) { const wx = x - px * (base > 0.47 ? 1 : 0.6); ctx.lineTo(x, q(H * base - Math.abs(Math.sin(wx * fr)) * hgt - Math.sin(wx * 0.07) * 7)); }
      ctx.lineTo(W, H * 0.52); ctx.fill();
    }
    const cx = q(wrapX(W * 0.82 + px * 0.6)), cy = q(H * 0.4);
    ctx.fillStyle = '#25163a'; ctx.fillRect(cx - 18, cy - 9, 36, 30); ctx.fillRect(cx - 27, cy - 22.5, 10.5, 42); ctx.fillRect(cx + 16.5, cy - 22.5, 10.5, 42); ctx.fillRect(cx - 4.5, cy - 34.5, 9, 30);
    for (const tx of [cx - 27, cx + 16.5, cx - 4.5]) { ctx.fillRect(tx - 1.5, (tx === cx - 4.5 ? cy - 37.5 : cy - 25.5), 3, 3); ctx.fillRect(tx + 7.5, (tx === cx - 4.5 ? cy - 37.5 : cy - 25.5), 3, 3); }
    ctx.fillStyle = `rgba(255,60,120,${0.6 + 0.3 * Math.sin(globalT * 2)})`; ctx.fillRect(cx - 1.5, cy - 27, 3, 4.5);
    // ground + cobbled street
    const gy = q(H * 0.48), ry = q(H * 0.62);
    patShift(TP.grass, q(-off), 0); ctx.fillStyle = TP.grass; ctx.fillRect(0, gy, W, H - gy);
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, gy, W, 3);
    patShift(TP.road, q(-off), ry); ctx.fillStyle = TP.road; ctx.fillRect(0, ry, W, q(H * 0.16));
    ctx.fillStyle = '#6a5640'; ctx.fillRect(0, ry, W, 3); ctx.fillRect(0, ry + q(H * 0.16) - 3, W, 3);
  }
  function drawShopFront(p, x0) {
    if(p.id==='arena'){arenaDrawBuilding(p,x0);return;}
    const TP = townTiles();
    const r = townBuildingRect(), x = q(x0 + r.x), y = q(r.y), w = q(r.w), h = q(r.h), by = q(r.by), cx = q(x + w / 2);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - 6, by - 4.5, w + 12, 9);
    if (p.id === 'gate') {
      // stone gate with a glowing portal
      patShift(TP.stone, x, y); ctx.fillStyle = TP.stone;
      ctx.fillRect(x + 9, y + 21, 45, h - 21); ctx.fillRect(x + w - 54, y + 21, 45, h - 21); ctx.fillRect(x, y, w, 36);
      ctx.fillStyle = '#847a94'; for (let i = 0; i < 6; i++) ctx.fillRect(q(x + 4.5 + i * (w - 9) / 6), y - 10.5, q((w - 9) / 6 - 6), 12);
      ctx.fillStyle = '#2e2838'; ctx.fillRect(x, y + 33, w, 3); ctx.fillRect(x + 51, y + 36, 3, h - 36); ctx.fillRect(x + w - 54, y + 36, 3, h - 36);
      // Opaque recess fills the whole opening, including the space above the curved portal.
      ctx.fillStyle = '#140c18';ctx.fillRect(x+54,y+36,w-108,by-y-36);
      ctx.beginPath(); ctx.moveTo(x + 54, by); ctx.lineTo(x + 54, y + 69); ctx.quadraticCurveTo(cx, y + 30, x + w - 54, y + 69); ctx.lineTo(x + w - 54, by); ctx.fill();
      drawGateRune(cx,by-3,128,false);
      ctx.save();ctx.beginPath();ctx.moveTo(x+54,by);ctx.lineTo(x+54,y+69);ctx.quadraticCurveTo(cx,y+30,x+w-54,y+69);ctx.lineTo(x+w-54,by);ctx.closePath();ctx.clip();
      drawGateVortex(cx,by-6,128,false);ctx.restore();
      drawTorchAt(x + 31.5, y + 60); drawTorchAt(x + w - 31.5, y + 60);
    } else {
      // walls (planks/bricks), shingled roof, door, windows, sign
      patShift(TP['w_' + p.id], x, y); ctx.fillStyle = TP['w_' + p.id]; ctx.fillRect(x + 13.5, y + 69, w - 27, h - 69);
      ctx.fillStyle = SPR.shade(p.wall, -0.35); ctx.fillRect(x + 13.5, y + 69, 4.5, h - 69); ctx.fillRect(x + w - 18, y + 69, 4.5, h - 69);
      ctx.fillStyle = TP['r_' + p.id]; patShift(TP['r_' + p.id], x, y); ctx.beginPath(); ctx.moveTo(x - 6, y + 78); ctx.lineTo(cx, y + 6); ctx.lineTo(x + w + 6, y + 78); ctx.fill();
      ctx.fillStyle = SPR.shade(p.roof, -0.4); ctx.fillRect(x - 6, y + 75, w + 12, 6);
      ctx.fillStyle = SPR.shade(p.roof, 0.25); for (let i = 0; i < 12; i++) ctx.fillRect(q(cx - i * 6) - 1.5, q(y + 6 + i * 6) - 1.5, 3, 3), ctx.fillRect(q(cx + i * 6) - 1.5, q(y + 6 + i * 6) - 1.5, 3, 3);
      // door
      ctx.fillStyle = '#4a3018'; ctx.fillRect(cx - 24, by - 66, 48, 66);
      ctx.fillStyle = '#6a4a2a'; ctx.fillRect(cx - 21, by - 63, 42, 63); ctx.fillRect(cx - 15, by - 69, 30, 6);
      ctx.fillStyle = '#4a3018'; for (const dx of [-9, 0, 9]) ctx.fillRect(cx + dx - 0.75, by - 63, 1.5, 63);
      ctx.fillStyle = '#f2c14e'; ctx.fillRect(cx + 10.5, by - 31.5, 4.5, 4.5);
      // windows
      const lit = `rgba(255,210,120,${0.9 + 0.1 * Math.sin(globalT * 2 + x0)})`;
      for (const wx of [x + 31.5, x + w - 72]) {
        ctx.fillStyle = '#4a3018'; ctx.fillRect(wx - 3, y + 102, 46.5, 37.5);
        ctx.fillStyle = p.id === 'smith' && wx < cx ? `rgba(255,120,40,${0.75 + 0.25 * Math.sin(globalT * 6)})` : lit; ctx.fillRect(wx, y + 105, 40.5, 31.5);
        ctx.fillStyle = '#4a3018'; ctx.fillRect(wx + 19.5, y + 105, 3, 31.5); ctx.fillRect(wx, y + 118.5, 40.5, 3);
        ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(wx + 3, y + 108, 6, 1.5); ctx.fillRect(wx + 3, y + 108, 1.5, 6);
        ctx.fillStyle = '#5a8a3a'; ctx.fillRect(wx - 3, y + 139.5, 46.5, 6); ctx.fillStyle = '#e05a6a'; for (let k = 0; k < 4; k++) ctx.fillRect(wx + 3 + k * 10.5, y + 138, 3, 3);
      }
      if (p.id === 'smith') {
        ctx.fillStyle = '#5a4a44'; ctx.fillRect(x + w - 63, y + 1.5, 22.5, 51); ctx.fillStyle = '#3a302c'; ctx.fillRect(x + w - 66, y, 28.5, 6);
        for (let i = 0; i < 4; i++) { const k = (globalT * 0.5 + i / 4) % 1; ctx.fillStyle = `rgba(200,200,210,${0.55 * (1 - k)})`; const s = q(9 + k * 15); ctx.fillRect(q(x + w - 52 + Math.sin(k * 6 + i) * 6) - s / 2, q(y - k * 60) - s / 2, s, s); }
        // anvil sign
        ctx.fillStyle = '#3a3a44'; ctx.fillRect(cx - 21, y + 51, 48, 7.5); ctx.fillRect(cx - 12, y + 58.5, 24, 4.5); ctx.fillRect(cx - 9, y + 63, 18, 7.5); ctx.fillStyle = '#6a6a78'; ctx.fillRect(cx - 21, y + 51, 48, 1.5);
      } else if (p.id === 'item') {
        ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + w - 10.5, y + 94.5, 28.5, 3);
        const sw = Math.round(Math.sin(globalT * 2) * 1.5) * 1.5;
        SPR.draw(ctx, SPR.ENV.potion('#e5483c'), x + w + 7.5 + sw, y + 130);
        ctx.fillStyle = '#9a6a3a'; ctx.fillRect(x + 18, by - 25.5, 30, 25.5); ctx.fillStyle = '#6a4422'; ctx.fillRect(x + 18, by - 25.5, 30, 3);
        for (let i = 0; i < 4; i++) SPR.draw(ctx, SPR.ENV.herb(), x + 22.5 + i * 7.5, by - 24);
      } else if(p.id==='craft'){
        SPR.draw(ctx,SPR.ENV.potion('#82bca0'),cx,y+70);
        ctx.fillStyle='#cfb46c';ctx.fillRect(cx-28,y+65,16,4.5);ctx.fillRect(cx+13,y+65,16,4.5);
        ctx.fillStyle='#426a54';ctx.fillRect(x+22,by-24,30,24);ctx.fillStyle='#d3c18b';ctx.fillRect(x+25,by-21,24,3);
      } else if(p.id==='guild'){
        ctx.fillStyle='#d1ba73';ctx.beginPath();ctx.moveTo(cx-16,y+47);ctx.lineTo(cx+16,y+47);ctx.lineTo(cx+13,y+68);ctx.lineTo(cx,y+76);ctx.lineTo(cx-13,y+68);ctx.fill();ctx.fillStyle='#476b60';ctx.fillRect(cx-2,y+52,4,17);ctx.fillRect(cx-8,y+57,16,3);
        ctx.fillStyle='#4c3828';ctx.fillRect(x+19,by-47,45,47);ctx.fillStyle='#dfd1a5';ctx.fillRect(x+23,by-43,37,35);for(let i=0;i<3;i++){ctx.fillStyle='#917c55';ctx.fillRect(x+27,by-36+i*8,26-i*4,2);}
      } else if (p.id === 'house') {
        ctx.fillStyle = '#6a4a2a'; ctx.fillRect(cx - 1.5, y - 30, 3, 39);
        const fw = Math.round(Math.sin(globalT * 4) * 2) * 1.5;
        ctx.fillStyle = '#e5483c'; ctx.beginPath(); ctx.moveTo(cx + 1.5, y - 30); ctx.lineTo(cx + 25.5 + fw, y - 22.5); ctx.lineTo(cx + 1.5, y - 15); ctx.fill();
        ctx.fillStyle = '#5aa84a'; for (let i = 0; i < 5; i++) ctx.fillRect(x + 16.5 + i * 9, by - 12, 7.5, 12); ctx.fillStyle = '#f2c14e'; for (let i = 0; i < 5; i++) ctx.fillRect(x + 18 + i * 9, by - 13.5, 3, 3);
      }
    }
  }
  // the name board above each building (crisp UI layer)
  function drawShopBoard(p, x0) {
    const r = townBuildingRect(), cx = x0 + r.x + r.w / 2, sy0 = r.y - 52;
    ctx.font = `20px ${FONT}`; const tw = ctx.measureText(p.name).width + 30;
    ctx.fillStyle = 'rgba(19,24,58,.94)'; roundRect(cx - tw / 2, sy0, tw, 34, 6); ctx.fill();
    ctx.strokeStyle = '#f3ecda'; ctx.lineWidth = 2; roundRect(cx - tw / 2, sy0, tw, 34, 6); ctx.stroke();
    txt(p.name, cx, sy0 + 24, 20, '#f3ecda', 'center', false);
    if(p.id==='guild'&&guildReadyCount())txt('報告できる依頼 '+guildReadyCount()+'件',cx,sy0-8,13,'#f4d180','center',true);
  }
  function drawTorchAt(x, y) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,190,110,.12)'; ctx.beginPath(); ctx.arc(x, y - 4, 22, 0, 7); ctx.fill(); ctx.restore();
    SPR.draw(ctx, SPR.ENV.torch('255,192,112', Math.floor(globalT * 6 + x * 0.1) % 3), x, y + 13);
  }
  function drawTownHero(x, y) {
    hero = hero || newHero(0, 0);
    const saveState = state; state = 'town';
    const tmp = { x: hero.x, y: hero.y, face: hero.face, inv: hero.inv, trail: hero.trail, vx: hero.vx, vy: hero.vy };
    hero.x = x; hero.y = 0; hero.face = -Math.PI / 2; hero.inv = 0; hero.trail = []; hero.vx = hero.vy = 0; camY = 0;
    ctx.save(); ctx.translate(0, y - H * 0.62); drawHero(); ctx.restore();
    Object.assign(hero, tmp); state = saveState;
  }

  function drawTown() {
    const off = townX * W;
    drawTownBackdrop(off);
    for (let i = Math.floor(townX) - 1; i <= Math.floor(townX) + 2; i++) {
      const dx = (i - townX) * W;
      if (Math.abs(dx) > W * 1.1) continue;
      drawShopFront(TOWN_PAGES[pIdx(i)], dx);
    }
    const r = townBuildingRect();
    drawTownHero(W / 2 + 88, r.by + 22 + (Math.sin(globalT * 3) > 0 ? 0 : 1.5));
  }
  function drawTownUI() {
    const off = townX * W;
    for (let i = Math.floor(townX) - 1; i <= Math.floor(townX) + 2; i++) { const dx = (i - townX) * W; if (Math.abs(dx) <= W * 1.1) drawShopBoard(TOWN_PAGES[pIdx(i)], dx); }
    const r = townBuildingRect(), p = curPage();
    // what this screen does + how to enter
    const settled = Math.abs(townX - townPage) < 0.05;
    ctx.globalAlpha = settled ? 1 : 0.4;
    txt(p.sub, W / 2, r.by + 78, 15, '#fff', 'center');
    ctx.globalAlpha = settled ? 0.6 + 0.4 * Math.sin(globalT * 4) : 0;
    txt('タップして はいる', W / 2, r.by + 104, 14, '#f2c14e', 'center');
    ctx.globalAlpha = 1;
    // page dots
    const dy = Math.min(H - 40, r.by + 140);
    TOWN_PAGES.forEach((q2, i) => { const on = i === pIdx(townPage); ctx.fillStyle = on ? '#f3ecda' : 'rgba(243,236,218,.35)'; const s = on ? 9 : 7; ctx.fillRect(W / 2 + (i - (TOWN_PAGES.length - 1) / 2) * 20 - s / 2, dy - s / 2, s, s); });
    txt('◀ スワイプで いどう ▶', W / 2, dy + 26, 12, 'rgba(243,236,218,.6)', 'center', false);
    void off;
    drawTownTop();
  }
  function drawTownTop() {
    const top = 8;
    ctx.fillStyle = 'rgba(19,24,58,.88)'; roundRect(8, top, W - 16, 40, 6); ctx.fill(); ctx.strokeStyle = '#f3ecda'; ctx.lineWidth = 2; roundRect(8, top, W - 16, 40, 6); ctx.stroke();
    txt(`Lv ${save.lv}`, 20, top + 22, 16, '#f2c14e', 'left', false);
    bar(76, top + 15, 120, 6, save.exp / expNeed(save.lv), '#7ab8ff');
    txt('EXP', 76, top + 34, 10, 'rgba(243,236,218,.6)', 'left', false);
    txt(`${save.gold} G`, W - 20, top + 27, 17, '#f2c14e', 'right', false);
  }

  // interiors (the shop window sits on the lower half; the room shows above)
  function drawInterior(id) {
    if(id==='arena'){arenaDrawInterior();return;}
    if (id === 'gate') { drawGateChamber(); return; }
    const T = SPR.tileCanvas, wallCol = id === 'smith' ? '#4a3428' : id === 'house' ? '#5a4868' : '#5a4430';
    const plank = T('t_plank' + wallCol, 12, 16, g => { g.r(0, 0, 12, 16, wallCol); g.r(0, 0, 1, 16, SPR.shade(wallCol, -0.3)); g.r(6, 0, 1, 16, SPR.shade(wallCol, -0.2)); g.r(2, 5, 1, 2, SPR.shade(wallCol, -0.3)); g.r(9, 11, 1, 2, SPR.shade(wallCol, -0.3)); g.r(1, 0, 4, 1, SPR.shade(wallCol, 0.12)); });
    const board = T('t_board', 24, 8, g => { g.r(0, 0, 24, 8, '#6a4a2a'); g.r(0, 3, 24, 1, '#4a3018'); g.r(0, 7, 24, 1, '#4a3018'); g.r(10, 0, 1, 3, '#4a3018'); g.r(20, 4, 1, 3, '#4a3018'); g.r(0, 0, 24, 1, '#8a6a40'); });
    const wp = ctx.createPattern(plank, 'repeat'), bp = ctx.createPattern(board, 'repeat');
    patShift(wp, 0, 0); ctx.fillStyle = wp; ctx.fillRect(0, 0, W, q(H * 0.42));
    patShift(bp, 0, q(H * 0.42)); ctx.fillStyle = bp; ctx.fillRect(0, q(H * 0.42), W, H);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(0, q(H * 0.42), W, 4.5);
    if (id === 'house') {
      const bx = q(W * 0.08), byy = q(H * 0.24);
      ctx.fillStyle = '#4a3018'; ctx.fillRect(bx - 3, byy - 6, 96, 60); ctx.fillStyle = '#7a4a7a'; ctx.fillRect(bx, byy, 90, 48); ctx.fillStyle = '#9a6a9a'; ctx.fillRect(bx, byy, 90, 4.5);
      ctx.fillStyle = '#f3ecda'; ctx.fillRect(bx + 4.5, byy + 4.5, 30, 18); ctx.fillStyle = '#d8d0c0'; ctx.fillRect(bx + 4.5, byy + 19.5, 30, 3);
      const fx0 = q(W * 0.66), fy0 = q(H * 0.18);
      ctx.fillStyle = '#5a5060'; ctx.fillRect(fx0, fy0, 81, 81); ctx.fillStyle = '#6e6478'; for (let i = 0; i < 6; i++) ctx.fillRect(fx0 + (i % 3) * 27 + 1.5, fy0 + Math.floor(i / 3) * 12 + 1.5, 24, 9);
      ctx.fillStyle = '#1a1018'; ctx.fillRect(fx0 + 16.5, fy0 + 33, 48, 45);
      for (let i = 0; i < 6; i++) { const fh = q(12 + Math.sin(globalT * 9 + i) * 6); ctx.fillStyle = i % 2 ? '#ff8a2a' : '#ffd060'; ctx.fillRect(fx0 + 21 + i * 6.5, fy0 + 78 - fh, 6, fh); }
      drawTownHero(W / 2, H * 0.36);
    } else {
      // shelves with goods
      for (const yy of [q(H * 0.1), q(H * 0.2)]) { ctx.fillStyle = '#4a3018'; ctx.fillRect(13.5, yy, W - 27, 7.5); ctx.fillStyle = '#7a5a30'; ctx.fillRect(13.5, yy, W - 27, 3); }
      for (let i = 0; i < 9; i++) {
        const x = q(30 + i * (W - 60) / 8);
        if(id==='guild'){if(i<4){ctx.fillStyle='#dacba0';ctx.fillRect(x-8,q(H*.1)-33,18,26);ctx.fillStyle='#8f805d';ctx.fillRect(x-5,q(H*.1)-27,12,2);ctx.fillRect(x-5,q(H*.1)-22,9,2);ctx.fillStyle='#a45243';ctx.fillRect(x+2,q(H*.1)-13,3,3);}}
        else if (id === 'item'||id==='craft') { SPR.draw(ctx, SPR.ENV.potion(['#e5483c', '#6fd38a', '#7ab8ff'][i % 3]), x, q(H * 0.1)); SPR.draw(ctx, SPR.ENV.potion(['#f2c14e', '#e5483c', '#c86bff'][i % 3]), x + 4.5, q(H * 0.2)); }
        else {
          ctx.fillStyle = '#c9ced8'; ctx.fillRect(x - 1.5, q(H * 0.1) - 33, 4.5, 33); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1.5, q(H * 0.1) - 33, 1.5, 30); ctx.fillStyle = '#c9a24a'; ctx.fillRect(x - 6, q(H * 0.1) - 9, 13.5, 3);
          if (i % 2 === 0) { ctx.fillStyle = '#5a6070'; ctx.fillRect(x - 10.5, q(H * 0.2) - 24, 21, 24); ctx.fillStyle = '#8a8f9a'; ctx.fillRect(x - 9, q(H * 0.2) - 22.5, 18, 21); ctx.fillStyle = '#f2c14e'; ctx.fillRect(x - 1.5, q(H * 0.2) - 19.5, 3, 15); ctx.fillRect(x - 6, q(H * 0.2) - 15, 12, 3); }
        }
      }
      // shopkeeper behind the counter
      const kx = W / 2, ky = q(H * 0.33);
      SPR.draw(ctx, SPR.ENV.npc(id === 'guild' ? 'receptionist' : id === 'craft' ? 'witch' : id === 'smith' ? 'smith' : 'shop', Math.floor(globalT * 1.5)), kx, ky + 34);
      ctx.fillStyle = '#4a3018'; ctx.fillRect(0, ky + 21, W, 27); ctx.fillStyle = '#8a5a2a'; ctx.fillRect(0, ky + 21, W, 21); ctx.fillStyle = '#a8784a'; ctx.fillRect(0, ky + 21, W, 3);
      if (id === 'smith') { ctx.fillStyle = '#3a3a44'; ctx.fillRect(W * 0.72, ky + 6, 39, 9); ctx.fillRect(W * 0.72 + 12, ky + 15, 15, 6); ctx.fillStyle = '#6a6a78'; ctx.fillRect(W * 0.72, ky + 6, 39, 1.5); }
    }
  }
  function drawInteriorUI(id) {
    if (id === 'gate') { txt('どこへ むかう？', W / 2, 76, 20, '#fff', 'center'); drawTownTop(); return; }
    if (id !== 'house') {
      const kx = W / 2, ky = H * 0.33;
      const say = id==='arena'?'挑戦を 待っているぞ！':id==='guild'?'ようこそ、冒険者ギルドへ！':id==='craft'?'いらっしゃい、合成屋へ。':'いらっしゃい！';
      ctx.font = `14px ${FONT}`; const tw = ctx.measureText(say).width + 22;
      ctx.fillStyle = '#f3ecda'; roundRect(kx - tw / 2, ky - 86, tw, 30, 8); ctx.fill();
      ctx.beginPath(); ctx.moveTo(kx - 6, ky - 56); ctx.lineTo(kx + 6, ky - 56); ctx.lineTo(kx, ky - 48); ctx.fill();
      txt(say, kx, ky - 66, 14, '#13183a', 'center', false);
    }
    drawTownTop();
  }
  function townSwipeTo(i) {
    townPage = i; updateNav();   // no sound: just slide (and loop round)
    if (audioOn && !musicRoom) FMusic.setLayer(['guild','arena'].includes(curPage().id)?'house':curPage().id);   // each building re-orchestrates the waltz
  }
  function enterBuilding(id) {
    A.sfx('select');
    facilityEnter(id);
  }

  function render() {
    mainCtx.setTransform(dpr * S, 0, 0, dpr * S, 0, 0);
    mainCtx.clearRect(0, 0, W, H);
    ctx = mainCtx;pfxCalls=0;
    if (state === 'title') { beginPix(); drawTitleBg(); endPix(); return; }
    if (state === 'town' || (state === 'over' && !D)) {
      const gateLeaving=transition?.gate&&!transition.done;
      beginPix(); if (gateLeaving) drawGateChamber(); else if (inside) drawInterior(inside); else drawTown(); endPix();
      if (gateLeaving) drawTownTop(); else if (inside) drawInteriorUI(inside); else drawTownUI();
      drawFade(); return;
    }
    if(arenaRun&&['rest','ready'].includes(arenaRun.phase)){
      beginPix();arenaDrawRest();endPix();txt('連戦場の休憩所',W/2,safeTop()+38,20,'#f3ecda','center');txt('HP '+Math.ceil(hero.hp)+' / '+hero.s.maxHp+'  ・  支給品 '+(bag.lifewater||0)+'個',W/2,safeTop()+64,13,'#f2c14e','center');return;
    }
    // the world is drawn into the low-res pixel layer, camera snapped to the art grid
    const cam0 = camY, bx0 = bcamX, by0 = bcamY;
    camY = q(camY); bcamX = q(bcamX); bcamY = q(bcamY);
    const shx = shake > 0 ? q(rnd(-1, 1) * shake * 0.5) : 0, shy = shake > 0 ? q(rnd(-1, 1) * shake * 0.5) : 0;
    beginPix();
    ctx.save();
    ctx.translate(shx, shy);
    if (arena) ctx.translate(q(W / 2 - bcamX), 0);   // boss room camera
    else ctx.translate(q(WX), 0);                    // corridor: the 360-wide field in the middle of a wider screen
    if (arena) {if(arenaRun)arenaDrawCombat();else{drawArena();if(defRun)defDrawVillage();}} else if(hardRun)hardDrawField();else drawDungeon();
    if (state !== 'boss' && !arena) drawProps();
    pfxDrawEvents(true);pfxHero(true);
    drawEvents();
    drawDrops();
    const list = enemies.filter(e => !e.dead);
    list.sort((a, b) => b.y - a.y);
    for (const e of list) drawEnemy(e);
    if(hardRun&&arena){for(const B of fightBosses().slice().sort((a,b)=>b.y-a.y))withFightBoss(B,()=>{drawBoss();drawSigFx();});}else{if (boss) drawBoss();if (boss) drawSigFx();}
    if (defRun) defDrawNpcs();
    if (hero.hp > 0 || slowMo > 0) drawHero();craftDraw();guildDraw();arenaDrawMarks();
    if (darkT > 0) drawDark();
    drawZones();
    pfxZones();pfxField();drawBullets();
    drawFx();pfxDrawEvents(false);pfxHero(false);if(pfxEnabled())drawZones(true);
    if (D) lighting();
    ctx.restore();
    endPix();
    ctx.save(); ctx.translate(shx, shy); ctx.translate(arena ? q(W / 2 - bcamX) : q(WX), 0); drawWorldText(); if (defRun) defDrawTags(); ctx.restore();
    camY = cam0; bcamX = bx0; bcamY = by0;
    if (flash > 0) { ctx.fillStyle = `rgba(${flashCol},${flash * 0.5})`; ctx.fillRect(0, 0, W, H); }
    drawHud();hardDrawHud();arenaDrawHud();
    drawPad();
    if(!arenaRun)drawBanner();
    drawFade();
    if (paused) { ctx.fillStyle = trayOpen ? 'rgba(0,0,0,.3)' : 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, W, H); }
  }
  function drawFade() { if (transition) { if(transition.gate&&!transition.done){const u=clamp(transition.t/transition.mid,0,1),{floor,height}=gateChamberSize(),cy=floor-height*.58,r=height*(.55+u*.5),g=ctx.createRadialGradient(W/2,cy,0,W/2,cy,r);g.addColorStop(0,`rgba(${transition.gate.hard?'255,180,224':'190,210,255'},${Math.sin(u*Math.PI)*.38})`);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(W/2-r,cy-r,r*2,r*2);} const k = transition.t < transition.mid ? transition.t / transition.mid : 2 - transition.t / transition.mid; ctx.fillStyle = `rgba(0,0,0,${clamp(k, 0, 1)})`; ctx.fillRect(0, 0, W, H); } }
  // ---- title (指示: ロゴが主役、中央に剣を掲げる勇者を大きく、奥にボスのシルエット) ----
  // the hero: hand-drawn at half the art resolution and shown at 2x, so it reads big and bold
  const TH = {};   // cached hero frames (cape wave)
  function titleHero(f, SC) {   // SC: drawing scale — the shapes are vectors, so a bigger screen gets a finer hero, not bigger pixels
    const key = f + '|' + SC; if (TH[key]) return TH[key];
    const U = SPR.util, [c, x] = U.canvas(Math.ceil(76 * SC), Math.ceil(133 * SC)), g = U.api(x), wv = [0, 1, 2, 1][f]; x.scale(SC, SC);
    const C = { cape: '#c0303a', capeS: '#80182a', capeL: '#e0524a', tun: '#3a6fd8', tunS: '#2648a0', tunH: '#79a6f5', belt: '#6a4020', gold: '#f2c14e', goldS: '#c08a2a', pants: '#2c2c4a', pantsH: '#44446a',
      boot: '#6a4022', bootS: '#40250f', skin: '#f8d0a8', skinS: '#e0a078', hair: '#7a4a22', hairS: '#4e2c12', helm: '#b58a5a', helmS: '#7d5a36', helmH: '#e0c090', crest: '#c0303a', eye: '#1e1830',
      blade: '#dfe6f4', bladeS: '#9aa6c0', bladeH: '#ffffff', grip: '#5a3a20', sh: '#8a5a2a', shS: '#5a3618', shE: '#f2c14e' };
    const Y = 30;   // the sword rises above the body
    // cape, flaring out behind the legs
    g.poly([[24, Y + 46], [52, Y + 46], [66 + wv, Y + 100], [58, Y + 97], [50 - wv, Y + 102], [38, Y + 98], [26 + wv, Y + 102], [17, Y + 97], [9 - wv, Y + 100]], C.capeS);
    g.poly([[26, Y + 46], [50, Y + 46], [61 + wv, Y + 96], [12 - wv, Y + 96]], C.cape);
    for (const xx of [20, 31, 45, 56]) g.line(38 + (xx - 38) * 0.35, Y + 52, xx + (xx < 38 ? -wv : wv), Y + 95, 1.2, C.capeS);
    // legs, feet apart
    for (const [hx, fx, d] of [[33, 25, -1], [43, 51, 1]]) {
      g.poly([[hx - 4, Y + 70], [hx + 4, Y + 70], [fx + 4, Y + 90], [fx - 4, Y + 90]], C.pants); g.line(hx - 2 * d, Y + 72, fx - 2 * d, Y + 88, 1, d < 0 ? C.pantsH : '#1c1c34');
      g.poly([[fx - 5, Y + 88], [fx + 5, Y + 88], [fx + 5 + d * 2, Y + 100], [fx - 5 + d * 2, Y + 100]], C.boot); g.r(fx - 6 + d * 2, Y + 98, 12, 3, C.bootS); g.r(fx - 5, Y + 88, 10, 2, C.bootS);
    }
    // the tunic, belt and skirt
    g.poly([[25, Y + 46], [51, Y + 46], [48, Y + 66], [28, Y + 66]], C.tun); g.poly([[42, Y + 46], [51, Y + 46], [48, Y + 66], [42, Y + 66]], C.tunS); g.r(29, Y + 48, 2, 12, C.tunH);
    g.poly([[27, Y + 66], [49, Y + 66], [53, Y + 76], [23, Y + 76]], C.tun); g.poly([[42, Y + 66], [49, Y + 66], [53, Y + 76], [43, Y + 76]], C.tunS);
    g.r(27, Y + 63, 22, 4, C.belt); g.r(35, Y + 62, 6, 6, C.gold); g.r(37, Y + 64, 2, 2, C.belt);
    g.poly([[33, Y + 46], [43, Y + 46], [38, Y + 53]], C.tunS); g.line(31, Y + 46, 45, Y + 46, 2, C.gold);   // collar
    // the shield arm (screen left), shield held in front
    g.line(26, Y + 49, 20, Y + 60, 6, C.tun); g.line(20, Y + 60, 23, Y + 69, 5, C.tunS);
    g.ell(20, Y + 70, 11, 13, C.shS); g.ell(19, Y + 69, 9.5, 11.5, C.sh); g.ell(17, Y + 66, 4, 5, '#a8784a');
    g.r(18, Y + 61, 3, 17, C.shE); g.r(13, Y + 67, 13, 3, C.shE); g.ell(19.5, Y + 68.5, 2.4, 2.4, '#e04050');
    // the sword arm raised high (screen right)
    g.line(50, Y + 49, 56, Y + 36, 6.5, C.tun); g.line(56, Y + 36, 54, Y + 24, 5.5, C.tunS); g.ell(51, Y + 47, 5, 4, C.tun);
    // the sword, pointing straight up; the fist closes round the grip (drawn over it, so the blade doesn't run through the hand)
    g.r(52, Y + 12, 4, 13, C.grip); g.ell(54, Y + 26.5, 2.6, 2.6, C.gold);
    g.r(46, Y + 10, 16, 3, C.gold); g.r(46, Y + 12, 16, 1, C.goldS); g.ell(54, Y + 11, 3, 3, '#e04050');
    g.poly([[51, Y + 10], [57, Y + 10], [57, Y - 22], [54, Y - 28], [51, Y - 22]], C.blade); g.poly([[54, Y + 10], [57, Y + 10], [57, Y - 22], [54, Y - 28]], C.bladeS);
    g.r(52, Y - 20, 1, 28, C.bladeH); g.r(54, Y - 24, 1, 32, '#c0c8dc');
    g.ell(54, Y + 19.5, 4.6, 4.4, C.skin); g.ell(55.5, Y + 21, 3, 2.6, C.skinS);
    g.r(50, Y + 17, 8, 1, C.skinS); g.r(50, Y + 19.5, 8, 1, C.skinS); g.r(50, Y + 22, 7, 1, C.skinS); g.ell(49.5, Y + 19.5, 1.6, 2.4, C.skin);
    // the head: a big chibi head with the helmet and its red crest
    g.ell(38, Y + 34, 13, 12, C.skin); g.ell(44, Y + 36, 6, 8, C.skinS); g.ell(37, Y + 33, 11, 10.5, C.skin);
    g.r(25, Y + 28, 6, 12, C.hair); g.r(45, Y + 28, 6, 12, C.hairS); g.poly([[26, Y + 30], [50, Y + 30], [47, Y + 34], [41, Y + 31], [35, Y + 34], [29, Y + 31]], C.hair);
    g.ell(38, Y + 26, 14, 9, C.helm); g.poly([[24, Y + 26], [52, Y + 26], [52, Y + 31], [24, Y + 31]], C.helm); g.ell(44, Y + 25, 7, 6, C.helmS); g.ell(32, Y + 22, 5, 3, C.helmH);
    g.r(24, Y + 29, 28, 3, C.gold); g.r(46, Y + 29, 6, 3, C.goldS); g.r(36, Y + 28, 4, 4, '#e04050');
    g.poly([[36, Y + 18], [40, Y + 18], [44, Y + 8], [41, Y + 9], [38, Y + 4], [35, Y + 9], [32, Y + 8]], C.crest);
    // a determined face
    for (const ex of [32, 42]) { g.r(ex, Y + 35, 3, 5, C.eye); g.p(ex, Y + 35, '#ffffff'); g.p(ex + 1, Y + 35, '#ffffff'); }
    g.line(30, Y + 33, 35, Y + 34, 1.4, C.hairS); g.line(41, Y + 34, 46, Y + 33, 1.4, C.hairS);
    g.r(36, Y + 42, 4, 1, '#b0504a'); g.p(29, Y + 40, '#f4a090'); g.p(47, Y + 40, '#f4a090');
    x.setTransform(1, 0, 0, 1, 0, 0); U.pixelize(c, '#140c1c');
    return (TH[key] = c);
  }
  // the boss behind: a beast drawn by beasts3.js, turned into a black silhouette with burning eyes
  let TS = null;
  function titleBoss(T) {
    if (typeof BEAST3 === 'undefined' || !BEAST3.has('dragon')) return null;
    if (!TS) { const [c, x] = SPR.util.canvas(640, 560); TS = { c, x, B: { type: 'dragon', x: 0, y: 0, r: 46, phase: 2, mv: null, sweeps: [], hp: 1, maxHp: 1, sizeK: 1 } }; }
    const { c, x, B } = TS;
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, 640, 560);
    BEAST3.draw(x, B, 320, 520, false, { t: T, hero: { x: 0, y: -200 }, cy: 470 });
    x.globalCompositeOperation = 'source-in'; x.fillStyle = '#0d0716'; x.fillRect(0, 0, 640, 560); x.globalCompositeOperation = 'source-over';
    return c;
  }
  function drawTitleBg() {
    const T = globalT, cx2 = W / 2;
    // a night sky reddening toward the horizon, where the beast rises
    const bands = ['#0d0a1c', '#120c22', '#180e28', '#20102c', '#2a122e', '#38142e', '#4a182c', '#5e1e2a', '#742a28', '#8a3a26'];
    bands.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, q(i * H * 0.8 / bands.length), W, q(H * 0.8 / bands.length) + 3); });
    ctx.fillStyle = '#8a3a26'; ctx.fillRect(0, q(H * 0.79), W, H);
    for (let i = 0; i < 44; i++) {   // stars, twinkling
      const x = q((i * 83.7) % W), y = q((i * 151.3) % (H * 0.5)), tw = 0.35 + 0.65 * Math.abs(Math.sin(T * (0.8 + i % 5 * 0.3) + i));
      ctx.fillStyle = `rgba(255,240,200,${(0.25 + (i % 3) * 0.2) * tw})`; const sz = i % 7 ? 1.5 : 3; ctx.fillRect(x, y, sz, sz);
    }
    // a huge moon behind the beast, so its shape stands out
    const my = H * 0.53, mr = Math.min(W * 0.44, H * 0.23);
    ctx.fillStyle = 'rgba(255,170,90,.12)'; ctx.beginPath(); ctx.arc(cx2, my, mr * 1.35, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8865a'; ctx.beginPath(); ctx.arc(cx2, my, mr, 0, 7); ctx.fill();
    ctx.fillStyle = '#f2a070'; ctx.beginPath(); ctx.arc(cx2 - mr * 0.08, my - mr * 0.08, mr * 0.9, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(200,100,70,.5)'; for (const [dx, dy, r] of [[-0.35, -0.2, 0.16], [0.3, 0.25, 0.12], [0.1, -0.45, 0.08], [-0.15, 0.4, 0.1]]) { ctx.beginPath(); ctx.arc(cx2 + dx * mr, my + dy * mr, r * mr, 0, 7); ctx.fill(); }
    // the beast's silhouette, wings spread over the whole sky, slowly breathing
    const sil = titleBoss(T * 0.6);
    if (sil) {   // crop: the dragon fills [185..455] x [365..535] of its canvas; its head rises just under the logo
      const k = Math.min(W * 1.02 / 270, H * 0.44 / 155), top = H * 0.335 - 15 * k + Math.sin(T * 0.9) * 3;
      const dx0 = cx2 - 22 * k;   // a little to the left, so the raised sword doesn't cover its head
      ctx.drawImage(sil, 185, 360, 270, 175, q(dx0 - 135 * k), q(top - 5 * k), 270 * k, 175 * k);
      const ey = top + 33 * k, gl = 0.7 + 0.3 * Math.sin(T * 3);   // burning eyes
      for (const m of [-1, 1]) { const ex = dx0 + m * 9 * k; ctx.fillStyle = `rgba(255,60,40,${0.4 * gl})`; ctx.fillRect(q(ex - 3 * k), q(ey - 1.6 * k), 6 * k, 3.4 * k); ctx.fillStyle = `rgb(255,${120 + 80 * gl | 0},60)`; ctx.fillRect(q(ex - 1.8 * k), q(ey - 0.6 * k), 3.6 * k, 1.6 * k); }
    }
    // far crags on the horizon, then the cliff the hero stands on
    ctx.fillStyle = '#1a0e1e'; ctx.beginPath(); ctx.moveTo(0, H * 0.84); for (let i = 0; i <= 12; i++) ctx.lineTo(W * i / 12, H * (0.8 - ((i * 37) % 7) * 0.008)); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    const gy = H * 0.86;
    ctx.fillStyle = '#100a14'; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, gy + 24); ctx.lineTo(cx2 - 95, gy + 6); ctx.lineTo(cx2 - 40, gy - 4); ctx.lineTo(cx2 + 45, gy - 4); ctx.lineTo(cx2 + 100, gy + 8); ctx.lineTo(W, gy + 26); ctx.lineTo(W, H); ctx.fill();
    ctx.fillStyle = '#3a2430'; ctx.fillRect(q(cx2 - 40), q(gy - 4), 85, 3);
    // the hero, big, sword raised — light pours from the blade
    const SC = Math.round(Math.min(H * 0.56, W * 1.15) / 138 / PXS * 4) / 4, hs = PXS * SC, hc = titleHero(Math.floor(T * 5) % 4, SC), hw = hc.width * PXS, hh = hc.height * PXS, hx = q(cx2 - hw / 2 - 1.5 * hs), hy = q(gy + 2 - hh);
    const tipX = hx + 54 * hs, tipY = hy + 2 * hs;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.6 + 0.4 * Math.sin(T * 2.2);
    for (const [r, a] of [[46, 0.08], [30, 0.14], [17, 0.3]]) { ctx.fillStyle = `rgba(255,230,160,${a * (0.7 + 0.5 * pulse)})`; ctx.beginPath(); ctx.arc(tipX, tipY, r * (0.9 + 0.1 * pulse), 0, 7); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(cx2, gy, 42, 7, 0, 0, 7); ctx.fill();
    ctx.drawImage(hc, hx, hy, hw, hh);
    const sp = 8 + 6 * pulse;   // the twinkle at the tip
    ctx.fillStyle = '#ffffff'; ctx.fillRect(q(tipX - 1.5), q(tipY - sp), 3, sp * 2); ctx.fillRect(q(tipX - sp), q(tipY - 1.5), sp * 2, 3);
    ctx.fillStyle = '#fff6c8'; ctx.fillRect(q(tipX - 3), q(tipY - 3), 6, 6);
    // embers drifting up
    for (let i = 0; i < 24; i++) { const k = (T * (0.08 + (i % 5) * 0.02) + i * 0.137) % 1, x = q((i * 67.3 + Math.sin(T + i) * 14) % W), y = q(H * (1 - k));
      ctx.fillStyle = `rgba(255,${150 + (i % 3) * 40},80,${0.8 * (1 - k)})`; ctx.fillRect(x, y, 1.5, 1.5); }
  }
  // ---------------------------------------------------------------
  //  DOM UI — town commands, shops, panels
  // ---------------------------------------------------------------
  const panelWrap = $('panelWrap'), panelTitle = $('panelTitle'), panelBody = $('panelBody'), panelFoot = $('panelFoot');
  let panelOpen = false;
  // FACILITIES BEGIN — maintained in tools/facilities/runtime.inc.js.
  const FACILITIES={
    smith:{name:'鍛冶屋',first:'shop',tabs:[['shop','装備購入',()=>openEquipShop()],['upgrade','装備強化',()=>openSmith()]],help:[
      ['装備購入','冒険に使う装備を買えます。まずはこちらで装備を整えましょう。'],
      ['装備強化','所持している装備を素材とゴールドで育てます。特殊効果や見た目は変わりません。育つほど必要な素材と費用が重くなります。'],
      ['靴の強化','移動の速さと体当たりの威力を一緒に伸ばせます。画面の性能表示で、強化前後を比べられます。']]},
    item:{name:'どうぐや',first:'items',tabs:[['items','どうぐ',()=>{shopTab='item';openItemShop();}],['books','スキルの書',()=>openSkillShop()]],help:[
      ['どうぐ','回復や冒険を助ける道具を買えます。出発前に持っていく道具を選びましょう。'],
      ['スキルの書','新しいスキルを覚えられます。覚えたスキルは勇者の家でセットします。使い方は操作練習で確認できます。']]},
    craft:{name:'合成屋',first:'make',tabs:[['make','合成',()=>openCraftShop()],['inherit','効果継承',()=>openForge()],['materials','素材袋',()=>openCraftMaterials()],['exchange','素材交換',()=>openCraftExchange()],['dual','双術設定',()=>openCraftSkills()]],help:[
      ['合成','魔物から集めた素材で、特別な効果の装備や道具を作れます。完成した装備は勇者の家で装備しましょう。素材のアイコンから入手先を見られます。'],
      ['効果継承','同じ部位の特殊効果を、効果のない装備へ移せます。残す装備の性能と強化は引き継ぎます。効果元の装備と継承結晶は消費され、効果元の強化は移りません。継承済みの効果を再び移すことはできません。'],
      ['素材袋と入手先','素材は使い切っても入手した記録が残ります。魔物の姿や名前は図鑑と同じように、出会ってから分かります。冒険で集めた素材は敗北や撤退でもなくなりません。'],
      ['素材交換・双術設定','対応する合成品を手に入れると使えます。素材交換は余った共通素材を別の共通素材へ変えます。双術設定では、覚えたスキルを組み合わせて交互に使えます。']]},
    house:{name:'勇者の家',first:'gear',tabs:[['gear','そうび',()=>openEquip(openHouse)],['skills','スキル',()=>openSkills()],['materials','素材袋',()=>openCraftMaterials({room:'house',back:openHouse,ownedOnly:true})],['bestiary','魔物図鑑',()=>openBestiary()],['status','ステータス',()=>openHouseStatus()],['music','音楽室',()=>openMusicRoom()],['settings','設定',()=>openOptions()]],help:[
      ['そうび・スキル','手に入れた装備と覚えたスキルをセットできます。自分の戦い方に合う組み合わせを探しましょう。'],
      ['素材袋・魔物図鑑','所持素材や入手先、出会った魔物を確認できます。図鑑のドロップは入手した品だけが分かり、使い切っても記録が残ります。'],
      ['ステータス・音楽室・設定','勇者の状態や称号を確認し、冒険で聴いた曲を楽しめます。音量や画面の表示も調整できます。画面の更新を控えると電池の消費を抑えられます。セーブは利用中の端末へ自動で保存されます。']]},
    gate:{name:'ダンジョンの門',first:'normal',tabs:[['normal','ノーマル',()=>{gateMode='normal';openGate();}],['hard','ハード',()=>{gateMode='hard';openGate();}]],help:[
      ['ノーマル','まずはノーマルを進めましょう。行き先を選んで、持っていく道具を準備します。ボスのアイコンから、その場所に現れる魔物を見られます。'],
      ['魔物の情報','姿と名前は図鑑と同じ遭遇記録、ドロップは入手記録で開示されます。まだ分からない情報は伏せられます。'],
      ['ハード','組になったダンジョンのノーマルをすべてクリアすると挑戦できます。分岐する道と、複数のボスが待っています。報酬が増えますが、クリア後は日付が変わるまで再挑戦できません。'],
      ['冒険の準備','道具の枠を選んで持ち物を入れ、必要な量を調整します。使わなかった分は持ち物に残り、次の準備では同じ組み合わせを補充します。'],
      ['封印と敗北','道中の魔物を倒すとボス扉の封印が解けます。敗北すると、その冒険で拾ったゴールドの一部を失います。']]},
    arena:{name:'闘技場',first:'trial',tabs:[['trial','チャレンジ',()=>openArena('trial')],['chain','連戦場',()=>openArena('chain')]],help:[
      ['チャレンジ','装備やスキルを借りて挑む腕試しです。装備の特殊効果を使って、お題を達成しましょう。お題・制限時間・支給品は課題の詳細で確認できます。条件を満たす前に敵を倒し切ると失敗します。'],
      ['連戦場','普段の勇者で、選んだ級に合う攻略済みボスと戦います。同じ挑戦中に同じ相手は再登場せず、倒したボスの推奨レベル合計が目標を超えるとクリアです。'],
      ['休憩と記録','体力や装備効果の使用状況は次の戦いへ引き継ぎます。休憩所では回復道具を補給し、使うタイミングを選べます。初回報酬と最短記録を目指しましょう。'],
      ['本編の持ち物','貸出品や支給品は本編の持ち物を消費しません。訓練中の戦利品や経験値は持ち帰れず、途中からの再開はできません。']]},
    guild:{name:'冒険者ギルド',first:'recommended',tabs:['recommended','regular','challenge','collection','daily','claimed','titles'].map((id,i)=>[id,['おすすめ','常設','挑戦','長期','デイリー','受取済み','称号'][i],()=>{guildTab=id;openGuild();}]),help:[
      ['依頼','受注しなくても、冒険に合わせて依頼が進みます。まずはおすすめを確認しましょう。達成した依頼は緑色で表示されます。'],
      ['報告と納品','条件を満たしたら報酬を受け取れます。選択報酬は欲しい品を選び、納品依頼は消費する素材を確認してください。納品以外で素材は減りません。'],
      ['デイリーと称号','デイリーは日本時間の日付が変わると入れ替わり、未受取の報酬も更新されます。称号は冒険の記念で、勇者の能力には影響しません。']]}
  };
  let facilityRoom=null,facilityTab=null,facilityHelpOwner=null,facilityHelpFocus=null;
  function facilitySelect(room,tab){if(state==='town'&&FACILITIES[room]){facilityRoom=room;facilityTab=tab;}}
  function facilityLocked(room,id){return room==='craft'&&(id==='exchange'&&!save.craftTools.includes('f12')||id==='dual'&&!save.owned.includes('craft_b18')&&!forgeHasEffect('craft_b18'));}
  function facilityChrome(room){
    const tabs=$('facilityTabs'),help=$('facilityHelp');tabs.innerHTML='';help.hidden=true;
    if(state!=='town'||!FACILITIES[room]){tabs.hidden=true;return;}
    if(facilityRoom!==room)facilitySelect(room,FACILITIES[room].first);
    const config=FACILITIES[room];tabs.hidden=false;help.hidden=false;help.setAttribute('aria-label',config.name+'の説明');
    for(const [id,label]of config.tabs){const b=document.createElement('button');b.textContent=label;b.dataset.facilityTab=id;b.setAttribute('role','tab');b.setAttribute('aria-selected',String(facilityTab===id));b.setAttribute('aria-pressed',String(facilityTab===id));b.disabled=facilityLocked(room,id);if(b.disabled)b.setAttribute('title','対応する合成品が必要です');b.addEventListener('click',()=>{A.sfx('select');facilityGo(room,id);});tabs.appendChild(b);}
    tabs.querySelector('[aria-selected="true"]')?.scrollIntoView?.({block:'nearest',inline:'nearest'});
  }
  function facilityGo(room,tab){
    const entry=FACILITIES[room]?.tabs.find(t=>t[0]===tab);if(!entry||facilityLocked(room,tab))return;
    facilityDismissHelp();if(facilityTab==='music')stopMusicRoom();facilitySelect(room,tab);entry[2]();
  }
  function facilityEnter(room){
    if(!FACILITIES[room]||state!=='town')return;shopTab='item';equipTab='weapon';eqTab='weapon';craftTab='all';bestTab='all';bestScroll=0;
    facilityGo(room,FACILITIES[room].first);
    if(!tut&&save.settings.facilityHelp?.[room]!==true)facilityShowHelp(room);
  }
  function facilityShowHelp(room=facilityRoom){
    const config=FACILITIES[room];if(!config)return;
    facilityMessage(config.name+'の使い方',config.help.map(([h,p])=>`<section><h3>${h}</h3><p>${p}</p></section>`).join(''),room);
  }
  function facilityMessage(title,html,owner=null){
    facilityHelpFocus=document.activeElement;facilityHelpOwner=owner;
    $('helpTitle').textContent=title;$('helpBody').innerHTML=html;$('helpError').textContent='';$('helpRemember').hidden=!owner;$('helpHide').checked=owner&&save.settings.facilityHelp?.[owner]===true;
    $('helpWrap').hidden=false;$('panel').inert=true;$('panel').setAttribute('aria-hidden','true');$('helpOK').focus?.({preventScroll:true});
  }
  function facilityDismissHelp(){
    if(!$('helpWrap'))return;$('helpWrap').hidden=true;$('panel').inert=false;$('panel').removeAttribute('aria-hidden');facilityHelpOwner=null;
  }
  function facilityCloseHelp(){
    if(facilityHelpOwner){const old=save.settings.facilityHelp;save.settings.facilityHelp={...old,[facilityHelpOwner]:!!$('helpHide').checked};
      try{localStorage.setItem('bumphero_save',JSON.stringify(save));}catch{if(old===undefined)delete save.settings.facilityHelp;else save.settings.facilityHelp=old;$('helpError').textContent='設定を保存できませんでした。もう一度お試しください。';return;}}
    const focus=facilityHelpFocus;facilityDismissHelp();if(focus?.isConnected)focus.focus?.({preventScroll:true});
  }
  function facilityDetail(title,paragraphs){return `<button class="sbtn ui-detail" data-ui-description="${encodeURIComponent(JSON.stringify({title,paragraphs}))}">説明を見る</button>`;}
  function facilityBindDescriptions(){panelBody.querySelectorAll('[data-ui-description]').forEach(b=>b.addEventListener('click',()=>{A.sfx('select');const q=JSON.parse(decodeURIComponent(b.dataset.uiDescription));facilityMessage(q.title,q.paragraphs.map(p=>'<p>'+p+'</p>').join(''));}));}
  function uiMonsterImage(key,sz=48){const e=bestByKey[key],known=e&&!!save.bestiary.seen[key];return known?`<img class="ui-monster-art" src="${bestThumb(e)}" width="${sz}" height="${sz}" alt="${e.def.name}">`:`<span class="ui-unknown" style="width:${sz}px;height:${sz}px" aria-label="未遭遇">？</span>`;}
  function uiMonsterCard(e){const known=!!save.bestiary.seen[e.key];return `<button class="ui-monster-card" ${known?'data-ui-enemy="'+e.key+'"':'disabled'}>${uiMonsterImage(e.key,64)}<span>${known?e.def.name:'？？？'}<small>${known?(e.boss?'ボス':'魔物'):'未遭遇'}</small></span></button>`;}
  function uiBindEnemies(back,room){craftBind('[data-ui-enemy]',b=>openBestiaryEntry(b.dataset.uiEnemy,{back,room}));}
  function uiSourceEntries(k){const m=craftMats[k];return bestEntries.filter(e=>e.boss?m.boss===e.type||m.sources.includes(e.def.name):CRAFT.enemy[e.type]&&(CRAFT.enemy[e.type].common.includes(k)||CRAFT.enemy[e.type].special.includes(k)));}
  function uiMaterialCost(k,n,have=true){return `<button class="ui-material-cost" data-ui-material="${k}">${craftArtImg('material',k,32)}<span>${craftMats[k].name}</span><b>${have?craftHave(k)+' / ':''}${n}</b></button>`;}
  function uiBindMaterials(back,room){craftBind('[data-ui-material]',b=>openCraftSource(b.dataset.uiMaterial,back,room));}
  function uiBossButton(indices,enabled=true){return `<button class="ui-stage-boss${indices.length>1?' ui-boss-pair':''}" data-stage-enemies="${indices.join(',')}" ${enabled?'':'disabled'} aria-label="出現する魔物を見る">${indices.map(i=>uiMonsterImage('boss:'+DUNGEONS[i].boss,56)).join('')}<span>魔物一覧</span></button>`;}
  function uiBindStages(back=openGate){craftBind('[data-stage-enemies]',b=>{const scroll=panelBody.scrollTop,room=inside;uiStageEnemies(b.dataset.stageEnemies.split(',').map(Number),()=>{back();panelBody.scrollTop=scroll;},room);});}
  function uiStageEnemies(indices,back=openGate,room='gate'){
    if(!indices.length||indices.some(i=>!Number.isInteger(i)||!DUNGEONS[i]||i>0&&!save.cleared[i-1]))return;
    const entries=bestEntries.filter(e=>bestPlaces(e).some(i=>indices.includes(i))).sort((a,b)=>Number(b.boss)-Number(a.boss));
    openPanel('出現する魔物',`<p class="ui-location">${indices.map(i=>DUNGEONS[i].name).join(' ／ ')}</p><div class="ui-roster-grid">`+entries.map(e=>`<section class="ui-roster-entry">${uiMonsterCard(e)}${save.bestiary.seen[e.key]?'<div class="ui-roster-materials">'+bestDrops(e).filter(k=>(k.startsWith('mat:')||k==='forge:crystal')&&save.bestiary.obtained[k]).map(bestDropRow).join('')+'</div>':''}</section>`).join('')+'</div>',[['もどる',back]],room);
    uiBindEnemies(()=>uiStageEnemies(indices,back,room),room);
  }
  function openHouseStatus(){facilitySelect('house','status');openPanel('ステータス',statusHtml(),[['いえを出る',closePanel]],'house');}
  // FACILITIES END
  // room: which building we are inside (the window then sits at the bottom over the interior)
  function openPanel(title, html, buttons, room = null) {
    const scroll=panelOpen&&inside===room&&panelTitle.textContent===title?panelBody.scrollTop:0;
    bestStop();facilityDismissHelp();
    inside = room; panelWrap.classList.toggle('inside', !!room); $('navL').hidden = $('navR').hidden = true;
    panelTitle.textContent = title; panelBody.innerHTML = html;panelBody.scrollTop=scroll; panelFoot.innerHTML = '';
    for (const [label, fn, primary] of buttons || []) {
      const b = document.createElement('button'); b.className = 'btn' + (primary ? ' primary' : ''); b.textContent = label;
      b.addEventListener('click', () => { A.sfx('select'); fn(); }); panelFoot.appendChild(b);
    }
    facilityChrome(room);facilityBindDescriptions();
    panelWrap.hidden = false; panelOpen = true;
    const f = panelFoot.querySelector('.primary') || panelFoot.querySelector('button'); if (f) f.focus({ preventScroll: true });
  }
  function closePanel() { facilityDismissHelp();facilityRoom=facilityTab=null;bestStop();stopMusicRoom(); panelWrap.hidden = true; panelOpen = false; inside = null; panelWrap.classList.remove('inside'); updateNav(); }
  $('facilityHelp').addEventListener('click',()=>{A.sfx('select');facilityShowHelp();});
  $('helpOK').addEventListener('click',()=>{A.sfx('select');facilityCloseHelp();});
  $('helpHide').addEventListener('change',()=>A.sfx('select'));
  function updateNav() {
    const on = state === 'town' && !panelOpen && !transition;
    $('navL').hidden = $('navR').hidden = !on;
    $('navL').disabled = $('navR').disabled = false;   // the town loops
  }

  function showHud(on) { $('pauseBtn').hidden = !on; $('itemBtn').hidden = !on; $('whistleBtn').hidden = !(on && defRun); if (!on && trayOpen) closeTray(); updateNav(); updateHudButtons(); }
  function updateHudButtons() {
    $('itemCount').textContent = Object.keys(bag).reduce((a, k) => a + (bag[k] || 0), 0);
    itemCdShow(hero && hero.itemCD > 0 ? hero.itemCD : 0);
  }
  // cooldown on the bag button: a dark sweep that empties as the timer runs out, plus the seconds left
  let cdShown = '';
  function itemCdShow(cd) {
    const k = Math.round(clamp(cd / ITEM_CD, 0, 1) * 60) / 60, sec = Math.ceil(cd), key = k + '|' + sec + '|' + (cd > 0);
    if (key === cdShown) return; cdShown = key;
    const b = $('itemBtn');
    b.classList.toggle('cool', cd > 0);
    b.style.setProperty('--cd', (k * 360).toFixed(0) + 'deg');
    $('itemCd').textContent = cd > 0 ? sec : '';
  }
  // item tray: tap the bag → the game pauses and you pick what to use
  let trayOpen = false;
  function openTray() {
    if (!hero || hero.hp <= 0 || (state !== 'play' && state !== 'boss')) return;
    if (hero.itemCD > 0) { popText(hero.x, hero.y + 26, `どうぐは あと ${Math.ceil(hero.itemCD)}びょう`, '#ff9a8a', 13, 0.8); A.sfx('block'); return; }
    trayOpen = true; paused = true; tutDone('item');
    const s = hero.s;
    const ids = Object.keys(ITEMS).filter(id => id in bag);
    $('tray').innerHTML = (ids.length ? '' : `<p style="padding:6px 8px;font-size:13px;color:var(--muted)">どうぐを もってきていない</p>`) + ids.map(id => {
      const I = ITEMS[id], n = bag[id] || 0, eff = I.craft ? I.note : I.buff ? (I.buff === 'atk' ? 'こうげき×1.5' : 'ダメージ半分') : `+${Math.min(healOf(id, s.maxHp, s.fx), s.maxHp)}`;
      return `<button data-use="${id}" ${n ? '' : 'disabled'} class="trow">${icon(id, 30)}<span>${I.name}</span><span class="tn">${eff}</span><b>×${n}</b></button>`;
    }).join('') + `<button data-use="" class="tclose">とじる</button>`;
    $('tray').hidden = false;
    $('tray').querySelectorAll('[data-use]').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); const id = b.dataset.use; closeTray(); if (id) useItem(id); }));
  }
  function closeTray() { trayOpen = false; $('tray').hidden = true; if (!panelOpen) paused = false; }

  function goTown() {
    pfxClear();
    const fromArena=!!arenaRun;if(arenaRun)arenaRestore();
    tut = null;
    closePanel();hardRun=null;defRun=null;WX=(W-VW)/2; state = 'town'; D = null; arena = null; boss = null; enemies = []; bullets = []; hero = null; paused = false;
    save.hp = null;   // back in town = fully healed
    townPage = fromArena?TOWN_PAGES.findIndex(p=>p.id==='arena'):1; townX = townPage;
    A.bgm(FARR.town, { layer: curPage().id==='arena'?'house':curPage().id });
    showHud(false); persist();
  }

  // ---- equipment names / descriptions ----
  const gearCache = {};
  const eqIcon = (e, sz = 32) => `<img class="ico" src="${gearCache[e.id] || (gearCache[e.id] = SPR.gearIcon({ id: e.id, slot: e.slot, vis: e.vis, name: e.name, fx: e.fx, craft:e.craft }).c.toDataURL())}" width="${sz}" height="${sz}" alt="">`;
  const eqName = e => { const R = e.drop && RARITY[e.drop],name=R ? `<span style="color:${R.col}">${R.mark}${e.name}</span>` : e.name;return name+(e.arenaReward?' <span class="gold">闘技場限定</span>':'')+(forgeDonor(e)?' <span class="gold">◆継承</span>':''); };
  const eqStats = raw => {const e=smithEquipment(raw);return [e.atk && `こうげき +${e.atk}`, e.def && `ぼうぎょ +${e.def}`, e.hp && `さいだいHP +${e.hp}`, e.ram && `移動速度 ×${e.ram.toFixed(2)}・体当たり威力 ×${(e.ramPower||1).toFixed(2)}`].filter(Boolean).join('・');};
  const eqNote = e => [eqStats(e), Object.keys(forgeFx(e)).length && Object.keys(forgeFx(e)).map(k => `<span style="color:#7ad8ff">${FX[k].note}</span>`).join('・'),
    e.drop === 'lo' && 'ショップの ものより すこし よわい', e.drop === 'rare' && '<span class="gold">ショップの ものより つよい</span>'].filter(Boolean).join('<br>') || 'ふつうの そうび';
  function lootHtml() {
    if (!runLoot.length) return craftLootHtml()+guildNoticeHtml();
    return `<p style="margin-top:10px">てにいれた そうび</p><p style="font-size:14px;line-height:1.9">${runLoot.map(id => eqIcon(EQ[id], 24) + ' ' + eqName(EQ[id])).join('<br>')}</p>`+craftLootHtml()+guildNoticeHtml();
  }
  function fxHtml(s) {
    const ks = Object.keys(s.fx); if (!ks.length) return '';
    return `<p style="margin-top:6px;font-size:13px;color:#7ad8ff;line-height:1.6">${ks.map(k => '◆' + FX[k].note).join('<br>')}</p>`;
  }
  // change equipment (house and pause menu). In a dungeon the new stats apply at once.
  let eqTab = 'weapon';
  function equip(id, slot) {
    const before = stats().maxHp;
    save.eq[slot] = id;
    const after = stats();
    if (hero && (state === 'play' || state === 'boss')) {
      hero.s = after; hero.hp = Math.min(after.maxHp, hero.hp + Math.max(0, after.maxHp - before));
    } else if (save.hp != null) save.hp = Math.min(after.maxHp, save.hp + Math.max(0, after.maxHp - before));
    persist(); A.sfx('equip');
  }
  function openEquip(back) {
    const room = state === 'town' ? 'house' : null;
    if(room)facilitySelect('house','gear');
    const render2 = () => {
      const s = hero && (state === 'play' || state === 'boss') ? hero.s : stats();
      const list = EQUIP.filter(e => e.slot === eqTab && save.owned.includes(e.id))
        .sort((a, b) => {a=smithEquipment(a);b=smithEquipment(b);return (b.atk || b.def || b.ram || b.hp || 0) - (a.atk || a.def || a.ram || a.hp || 0);});
      const rows = list.map(e => {
        const on = save.eq[e.slot] === e.id;
        return `<div class="row"><span class="nm">${eqIcon(e)} ${eqName(e)}</span><span class="sub">${eqNote(e)}</span>
          <span class="act">${on ? '<span class="tag">そうびちゅう</span>' : `<button class="sbtn" data-eq="${e.id}">そうびする</button>`}</span></div>`;
      });
      if (eqTab === 'charm' && save.eq.charm) rows.push(`<div class="row"><span class="nm">はずす</span><span class="sub">そうしょくを つけない</span><span class="act"><button class="sbtn" data-eq="">はずす</button></span></div>`);
      openPanel('そうび', `<div class="tabs">${['weapon', 'armor', 'boots', 'charm'].map(sl => `<button data-tab="${sl}" aria-pressed="${sl === eqTab}">${SLOT_NAME[sl]}</button>`).join('')}</div>
        <p style="font-size:14px;color:var(--muted)">こうげき ${s.atk}・ぼうぎょ ${s.def}・HP ${s.maxHp}・移動 ×${s.ram.toFixed(2)}・体当たり ×${s.ramPower.toFixed(2)}</p>` +
        (rows.join('') || '<p style="color:var(--muted)">もっていない</p>') + fxHtml(s),
        [[room==='house'?'いえを出る':'もどる',room==='house'?closePanel:back,true]], room);
      panelBody.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { eqTab = b.dataset.tab; A.sfx('select'); render2(); }));
      panelBody.querySelectorAll('[data-eq]').forEach(b => b.addEventListener('click', () => { equip(b.dataset.eq || null, eqTab); const sc = panelBody.scrollTop; render2(); panelBody.scrollTop = sc; }));
    };
    render2();
  }

  function statusHtml() {
    const s = hero && (state === 'play' || state === 'boss') ? hero.s : stats();
    return `<dl class="stat">
      <dt>レベル</dt><dd>${save.lv}</dd>
      <dt>HP</dt><dd>${hero && (state === 'play' || state === 'boss') ? Math.ceil(hero.hp) : s.maxHp} / ${s.maxHp}</dd>
      <dt>こうげき</dt><dd>${s.atk}</dd>
      <dt>ぼうぎょ</dt><dd>${s.def}</dd>
      <dt>移動速度</dt><dd>×${s.ram.toFixed(2)}</dd><dt>体当たり威力</dt><dd>×${s.ramPower.toFixed(2)}</dd>
      <dt>つぎのレベルまで</dt><dd>${expNeed(save.lv) - save.exp} EXP</dd>
      <dt>ゴールド</dt><dd class="gold">${save.gold} G</dd>
      <dt>たおした数</dt><dd>${save.kills}</dd>
    </dl>
    <div style="margin-top:10px;font-size:14px;line-height:1.7">${['weapon', 'armor', 'boots', 'charm'].map(sl => `${SLOT_NAME[sl]}：${save.eq[sl] ? eqIcon(EQ[save.eq[sl]], 24) + ' ' + eqName(EQ[save.eq[sl]]) : 'なし'}`).join('<br>')}<br>スキル：${save.skill ? SKILLS[save.skill].name : 'なし'}</div>${fxHtml(s)}${save.guild?.titles.length?'<p class="guild-note">称号：'+save.guild.titles.join('・')+'</p>':''}`;
  }

  let shopTab = 'item';
  function openItemShop() {
    facilitySelect('item','items');
    if (shopTab === 'skill') return openSkillShop();
    const tabs = '';
    const render2 = () => {
      openPanel('どうぐや', tabs + `<p style="font-size:14px;color:var(--muted);margin-bottom:4px">もちもの：<span class="gold">${save.gold} G</span></p>` +
        Object.entries(ITEMS).filter(([id,it])=>!it.craft).map(([id, it]) => {
          const n = save.items[id] || 0;
          if (!itemOpen(id) && !n) return `<div class="row lock"><span class="nm">？？？</span><span class="sub">${it.unlock}ばんめの ダンジョンを せいはすると ならぶ</span></div>`;
          const can = k => itemOpen(id) && save.gold >= it.price * k && n + k <= ITEM_MAX;
          return `<div class="row"><span class="nm">${icon(id, 28)} ${it.name} <span style="color:var(--muted);font-size:13px">×${n}</span></span>
          <span class="sub">${it.note}・もちこみ ${it.carry}こまで（いえに ${ITEM_MAX}こまで）</span>
          <span class="act"><span class="price">${it.price} G</span><span style="display:flex;gap:4px"><button class="sbtn" data-buy="${id}" data-k="1" ${can(1) ? '' : 'disabled'}>かう</button><button class="sbtn" data-buy="${id}" data-k="10" ${can(10) ? '' : 'disabled'}>×10</button></span></span></div>`;
        }).join(''),
        [['みせを でる', closePanel]], 'item');
      panelBody.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => {
        const id = b.dataset.buy, it = ITEMS[id], k = +b.dataset.k || 1; if (!itemOpen(id) || save.gold < it.price * k || (save.items[id] || 0) + k > ITEM_MAX) return;
        save.gold -= it.price * k; save.items[id] = (save.items[id] || 0) + k; persist(); A.sfx('buy'); const sc = panelBody.scrollTop; render2(); panelBody.scrollTop = sc;
      }));
      panelBody.querySelectorAll('[data-st]').forEach(b => b.addEventListener('click', () => { shopTab = b.dataset.st; A.sfx('select'); openItemShop(); }));
    };
    render2();
  }
  const skillRow = (id, act) => { const S = SKILLS[id]; return `<div class="row"><span class="nm"><span style="color:${S.col}">【${S.ch}】</span>${S.name}</span><span class="sub">${S.note}<br>クールタイム ${S.cd}びょう</span><span class="act">${act}</span></div>`; };
  function openSkillShop() {
    facilitySelect('item','books');
    openPanel('どうぐや', `
      <p style="font-size:14px;color:var(--muted);margin-bottom:4px">もちもの：<span class="gold">${save.gold} G</span></p>` +
      Object.keys(SKILLS).map(id => skillRow(id, save.skills.includes(id) ? `<span class="tag">${save.skill === id ? 'セットちゅう' : STARTER_SKILL === id ? 'はじめから' : 'おぼえた'}</span>` : `<span class="price">${SKILLS[id].price} G</span><button class="sbtn" data-sk="${id}" ${save.gold < SKILLS[id].price ? 'disabled' : ''}>かう</button>`)).join(''),
      [['みせを でる', closePanel]], 'item');
    panelBody.querySelectorAll('[data-st]').forEach(b => b.addEventListener('click', () => { shopTab = b.dataset.st; A.sfx('select'); openItemShop(); }));
    panelBody.querySelectorAll('[data-sk]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.sk, S = SKILLS[id]; if (save.gold < S.price || save.skills.includes(id)) return;
      save.gold -= S.price; save.skills.push(id); if (!save.skill) save.skill = id;
      persist(); A.sfx('buy'); toast && toast(`スキル「${S.name}」を おぼえた！`, S.col); const top = panelBody.scrollTop; openSkillShop(); panelBody.scrollTop = top;
    }));
  }
  function openSkills() {
    facilitySelect('house','skills');
    const html = save.skills.length ? save.skills.map(id => skillRow(id, save.skill === id ? '<span class="tag">セットちゅう</span>' : `<button class="sbtn" data-set="${id}">セットする</button>`)).join('')
      : '<p style="color:var(--muted)">まだ スキルを おぼえていない。どうぐやの「スキルのしょ」で かえる。</p>';
    openPanel('スキル', html,
      [['もどる', openHouse, true]], 'house');
    panelBody.querySelectorAll('[data-set]').forEach(b => b.addEventListener('click', () => { save.skill = b.dataset.set; persist(); A.sfx('equip'); openSkills(); }));
  }

  let equipTab = 'weapon';
  function openEquipShop() {
    facilitySelect('smith','shop');
    const render2 = () => {
      const s = stats();
      const list = EQUIP.filter(e => e.slot === equipTab && !e.drop && (e.price > 0 || save.owned.includes(e.id)));
      const statOf = eqStats;
      openPanel('かじや', `<div class="tabs">${['weapon', 'armor', 'boots', 'charm'].map(sl => `<button data-tab="${sl}" aria-pressed="${sl === equipTab}">${SLOT_NAME[sl]}</button>`).join('')}</div>
        <p style="font-size:14px;color:var(--muted)">こうげき ${s.atk}・ぼうぎょ ${s.def}・<span class="gold">${save.gold} G</span></p>` +
        list.map(e => {
          const own = save.owned.includes(e.id), eq = save.eq[e.slot] === e.id;
          return `<div class="row"><span class="nm">${eqIcon(e)} ${eqName(e)}</span><span class="sub">${statOf(e) || 'ふつうの そうび'}${Object.keys(forgeFx(e)).length ? '<br>' + Object.keys(forgeFx(e)).map(k => `<span style="color:#7ad8ff">◆${FX[k].note}</span>`).join('<br>') : ''}</span>
            <span class="act">${eq ? '<span class="tag">そうびちゅう</span>' : own ? `<button class="sbtn" data-eq="${e.id}">そうびする</button>` : `<span class="price">${e.price} G</span><button class="sbtn" data-buy="${e.id}" ${save.gold < e.price ? 'disabled' : ''}>かう</button>`}</span></div>`;
        }).join(''),
        [['みせを でる', closePanel]], 'smith');
      panelBody.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { equipTab = b.dataset.tab; A.sfx('select'); render2(); }));
      panelBody.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => {
        const e = EQ[b.dataset.buy]; if (save.gold < e.price) return;
        const before = stats().maxHp;
        save.gold -= e.price; save.owned.push(e.id); save.eq[e.slot] = e.id;
        if (save.hp != null) save.hp += Math.max(0, stats().maxHp - before);
        persist(); A.sfx('buy'); const sc = panelBody.scrollTop; render2(); panelBody.scrollTop = sc;
      }));
      panelBody.querySelectorAll('[data-eq]').forEach(b => b.addEventListener('click', () => { const e = EQ[b.dataset.eq]; save.eq[e.slot] = e.id; persist(); A.sfx('equip'); render2(); }));
    };
    render2();
  }

  // 準備: three slots, top to bottom. Tap a slot to pick its item from a list; the count sits beside the slot (− / ＋).
  // The slots are remembered and refilled from your stock at home every time.
  const iconCache = {};
  const icon = (id, sz = 32) => `<img class="ico" src="${iconCache[id] || (iconCache[id] = SPR.itemIcon(id).c.toDataURL())}" width="${sz}" height="${sz}" alt="">`;
  const effOf = (id, mh) => { const I = ITEMS[id]; return I.craft?I.note:I.buff ? (I.buff === 'atk' ? '20びょう こうげき×1.5' : '20びょう ダメージはんぶん') : I.pct ? `HP ${Math.round(I.pct * 100)}%（+${Math.round(mh * I.pct)}）` : `HP +${I.heal}`; };
  function getSlots() {
    if (!Array.isArray(save.slots)) { const lo = save.loadout || autoLoadout(); save.slots = Object.keys(lo).slice(0, BAG_KINDS).map(id => ({ id, n: lo[id] })); }
    const sl = save.slots.slice(0, BAG_KINDS).map(x => x && ITEMS[x.id] ? x : null); while (sl.length < BAG_KINDS) sl.push(null);
    return sl;
  }
  const slotsLoadout = sl => { const lo = {}; for (const x of sl) if (x && x.n > 0) lo[x.id] = x.n; return lo; };
  function openPrep(di,hardPair=null,defK=null) {
    const d = DUNGEONS[di], mh = stats().maxHp, sl = getSlots().map(x => x && Object.assign({}, x));
    const shown = x => Math.min(x.n, ITEMS[x.id].carry, save.items[x.id] || 0);
    const go = () => { if(hardPair!=null&&(!hardUnlocked(hardPair)||hardDone(hardPair))){openGate();return;}save.slots = sl; save.loadout = slotsLoadout(sl); persist(); transition = { t: 0, mid: 0.4, gate:{hard:hardPair!=null}, fn: () => defK!=null?defEnter(defK):hardPair==null?enterDungeon(di):hardEnter(hardPair) }; A.sfx('warp'); closePanel(); };
    const keep = fn => () => { const sc = panelBody.scrollTop; fn(); panelBody.scrollTop = sc; };
    const slotsView = () => {
      const html = sl.map((x, i) => {
        if (!x) return `<div class="slot"><button class="slotpick empty" data-pick="${i}"><span class="ico slotno">${i + 1}</span><span class="sn">＋ どうぐを えらぶ</span></button><div class="slotnum"></div></div>`;
        const I = ITEMS[x.id], have = save.items[x.id] || 0, n = shown(x), w = Math.min(x.n, I.carry);
        return `<div class="slot"><button class="slotpick" data-pick="${i}">${icon(x.id, 36)}<span class="sn">${I.name}<small>${effOf(x.id, mh)}<br>もちもの ×${have}・さいだい ${I.carry}こ${n < w ? ` <span class="hpc">${w - n}こ たりない</span>` : ''}</small></span></button>
          <div class="slotnum"><button class="sbtn" data-m="${i}" ${n > 0 ? '' : 'disabled'}>−</button><b>${n}</b><button class="sbtn" data-p="${i}" ${n >= I.carry || n >= have ? 'disabled' : ''}>＋</button></div></div>`;
      }).join('');
      openPanel(`じゅんび：${defK!=null?'防衛戦・'+DEF_NAMES[defK]:hardPair==null?d.name:'ハード '+(hardPair*2+1)+'–'+(hardPair*2+2)}`, `${defK!=null?'<p class="ui-summary" style="line-height:1.7">村を背に、まものの 波を 5かい しのごう。<br>なかまの 勇者 3人が いっしょに たたかう。<br>「ふえ」で なかまを よびよせられる。</p>':uiBossButton(hardPair==null?[di]:HARD_PAIRS[hardPair])}
        <div class="slots">${html}</div>
        <p class="ui-summary">さいだいHP ${mh}</p>`,
        [['しゅっぱつ', go, true], ['もどる', openGate]], 'gate');
      uiBindStages(slotsView);panelBody.scrollTop = 0;
      panelBody.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => { A.sfx('select'); pickView(+b.dataset.pick); }));
      panelBody.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', keep(() => { const x = sl[+b.dataset.p]; x.n = Math.min(ITEMS[x.id].carry, save.items[x.id] || 0, shown(x) + 1); A.sfx('select'); slotsView(); })));
      panelBody.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', keep(() => { const x = sl[+b.dataset.m]; x.n = Math.max(0, shown(x) - 1); A.sfx('select'); slotsView(); })));
    };
    const pickView = i => {   // the item list for slot i
      const ids = Object.keys(ITEMS).filter(id => itemOpen(id) || (save.items[id] || 0) > 0);
      const html = ids.map(id => {
        const I = ITEMS[id], have = save.items[id] || 0, at = sl.findIndex(x => x && x.id === id);
        return `<button class="pickrow" data-id="${id}" ${have ? '' : 'disabled'}>${icon(id, 36)}<span class="sn">${I.name}${at >= 0 ? `<span class="tag">スロット${at + 1}</span>` : ''}<small>${effOf(id, mh)}・もちもの ×${have}・さいだい ${I.carry}こ</small></span></button>`;
      }).join('');
      openPanel(`スロット${i + 1}に いれる どうぐ`, `<div class="picklist">${html}</div>`,
        [['もどる', slotsView, true], ['スロットを からにする', () => { sl[i] = null; slotsView(); }]], 'gate');
      panelBody.scrollTop = 0;
      panelBody.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => {
        const id = b.dataset.id, at = sl.findIndex(x => x && x.id === id);
        if (at >= 0 && at !== i) { const t = sl[i]; sl[i] = sl[at]; sl[at] = t; }   // already in another slot: swap
        else if (at < 0) sl[i] = { id, n: Math.min(ITEMS[id].carry, save.items[id] || 0) };
        A.sfx('select'); slotsView();
      }));
    };
    slotsView();
  }
  function openGate() {
    const unlocked = i => i === 0 || save.cleared[i - 1];
    let open = 0; while (open < DUNGEONS.length - 1 && unlocked(open + 1)) open++;
    const cur = save.lastGate != null && unlocked(save.lastGate) ? save.lastGate : open;   // the last dungeon you went to (or the newest)
    facilitySelect('gate',gateMode);const modeTabs='';
    if(gateMode==='hard'){
      openPanel('ハードモード',modeTabs+HARD_PAIRS.map((pair,i)=>{const ok=hardUnlocked(i),done=hardDone(i);return `<div class="row ui-stage-row ${ok?'':'lock'}">${uiBossButton(pair,ok)}<span class="nm">${pair[0]+1}–${pair[1]+1}. ${pair.map(k=>DUNGEONS[k].name).join('／')}</span><span class="sub">${!ok?'未解放':done?'本日クリア済み':'本日挑戦できます'}</span><span class="act"><button class="sbtn" data-hard="${i}" ${!ok||done?'disabled':''}>${done?'クリア済み':'いく'}</button></span></div>`;}).join(''),[['街へもどる',closePanel]],'gate');craftBind('[data-mode]',b=>{gateMode=b.dataset.mode;openGate();});craftBind('[data-hard]',b=>openPrep(HARD_PAIRS[+b.dataset.hard][1],+b.dataset.hard));uiBindStages();return;
    }
    openPanel('ダンジョンを えらぶ',modeTabs+ DUNGEONS.map((d, i) => {
      const ok = unlocked(i), warn = save.lv < d.rec;
      return `<div class="row ui-stage-row ${ok ? '' : 'lock'}" ${i === cur ? 'data-cur="1" style="background:rgba(242,193,78,.14);border-radius:6px"' : ''}>${uiBossButton([i],ok)}<span class="nm">${i + 1}. ${ok ? d.name : '？？？'} ${save.cleared[i] ? '<span class="tag">★せいは</span>' : ''}</span>
        <span class="sub">${ok ? `${d.en}・すいしょう Lv ${d.rec}${warn ? '<span class="hpc">（きけん）</span>' : ''}` : '未解放'}</span>
        <span class="act"><button class="sbtn" data-go="${i}" ${ok ? '' : 'disabled'}>いく</button></span></div>` + (DEF_STAGES.includes(i) ? defGateRow(DEF_STAGES.indexOf(i)) : '');
    }).join(''),
      [['街に もどる', closePanel]], 'gate');
    craftBind('[data-mode]',b=>{gateMode=b.dataset.mode;openGate();});
    panelBody.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { A.sfx('confirm'); const i = +b.dataset.go; save.lastGate = i; persist(); openPrep(i); }));
    panelBody.querySelectorAll('[data-def]').forEach(b => b.addEventListener('click', () => { A.sfx('confirm'); const k = +b.dataset.def; save.lastGate = DEF_STAGES[k]; persist(); openPrep(DEF_STAGES[k], null, k); }));
    uiBindStages();
    const row = panelBody.querySelector('[data-cur]');   // open the list where you left off: that row in the middle
    if (row) { panelBody.scrollTop = Math.max(0, row.offsetTop - panelBody.offsetTop - (panelBody.clientHeight - row.offsetHeight) / 2); const bt = row.querySelector('[data-go]'); if (bt && !bt.disabled) bt.focus({ preventScroll: true }); }
  }

  // ---- music room: listen to every arrangement you have reached ----
  let musicRoom = null;
  function openMusicRoom() {
    facilitySelect('house','music');
    const unlocked = i => i === 0 || save.cleared[i - 1];
    const L = [];
    L.push(['村のワルツ', 'ダンジョンの門', () => [FARR.town, { layer: 'gate' }]]);
    for (const k of ['house', 'item', 'smith']) L.push(['村のワルツ', FARR.town.layers[k].name, () => [FARR.town, { layer: k }]]);
    DUNGEONS.forEach((d, i) => {
      const a = FARR.dungeon[i];
      L.push(unlocked(i) ? ['冒険のマーチ', `${a.name}（${a.mood}）`, () => [a]] : ['冒険のマーチ', '？？？', null]);
    });
    DUNGEONS.forEach((d, i) => {
      const b = FARR.boss[d.boss];
      L.push(save.cleared[i] ? ['たたかいのテーマ', `${b.name}（${b.mood}）`, () => [b]] : ['たたかいのテーマ', '？？？', null]);
      if (save.cleared[i]) L.push(['たたかいのテーマ', `${b.name}・いかり`, () => [b, { rage: true }]]);
    });
    const html = L.map(([t, n, f], i) => `<div class="row ${f ? '' : 'lock'}"><span class="nm">${n}</span><span class="sub">${t}</span>
      <span class="act"><button class="sbtn" data-mr="${i}" ${f ? '' : 'disabled'} aria-pressed="${musicRoom === i}">${musicRoom === i ? 'えんそう中' : 'きく'}</button></span></div>`).join('');
    openPanel('おんがくしつ', `${html}`,
      [['もどる', () => { stopMusicRoom(); openHouse(); }, true]], 'house');
    panelBody.querySelectorAll('[data-mr]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.mr, [arr, o] = L[i][2]();
      musicRoom = i; A.bgm(arr, o && o.layer ? { layer: o.layer } : undefined);
      if (o && o.rage && audioOn) FMusic.setRage(true);
      const top = panelBody.scrollTop; openMusicRoom(); panelBody.scrollTop = top;
    }));
  }
  function stopMusicRoom() {
    if (musicRoom === null) return;
    musicRoom = null; A.bgm(FARR.town, { layer: curPage().id });
  }

  function openHouse() { facilitySelect('house','gear');openEquip(openHouse); }

  // SAVE TRANSFER BEGIN — maintained in tools/save_transfer/runtime.inc.js.
  const TRANSFER_FORMAT='butsukari-yusha-save',TRANSFER_LIMIT=4*1024*1024,TRANSFER_BACKUP='bumphero_save_before_import';
  let transferPending=null,transferEpoch=0,transferExportBusy=false,transferInput=null;
  const transferAllowed=()=>state==='town'&&!arenaRun&&!hardRun;
  const transferObject=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const transferEscape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function transferChecksum(s){let n=2166136261;for(let i=0;i<s.length;i++){n^=s.charCodeAt(i);n=Math.imul(n,16777619);}return 'fnv1a32-utf16:'+((n>>>0).toString(16).padStart(8,'0'));}
  function transferValidate(s){
    const bad=()=>{throw Error('セーブデータの形式または値が正しくありません。');};
    let nodes=0;function walk(v,d=0){if(++nodes>120000||d>20)bad();if(v===null||typeof v==='boolean')return;if(typeof v==='number'){if(!Number.isFinite(v)||Math.abs(v)>Number.MAX_SAFE_INTEGER)bad();return;}if(typeof v==='string'){if(v.length>1000)bad();return;}if(!v||typeof v!=='object')bad();if(Array.isArray(v)){if(v.length>20000)bad();v.forEach(x=>walk(x,d+1));}else for(const[k,x]of Object.entries(v)){if(['__proto__','prototype','constructor'].includes(k)||k.length>300)bad();walk(x,d+1);}}
    walk(s);if(!transferObject(s)||s.v!==1)bad();
    const integer=n=>Number.isSafeInteger(n)&&n>=0,obj=v=>{if(!transferObject(v))bad();},strings=v=>{if(!Array.isArray(v)||v.some(x=>typeof x!=='string'))bad();};
    if(!integer(s.lv)||s.lv<1||!integer(s.gold)||!integer(s.exp))bad();
    strings(s.owned);strings(s.skills);if(s.owned.some(k=>!Object.hasOwn(EQ,k))||s.skills.some(k=>!Object.hasOwn(SKILLS,k)))throw Error('この版で使えない装備またはスキルが含まれています。');
    for(const k of ['kills','craftCount','craftSeed'])if(s[k]!=null&&!integer(s[k]))bad();
    for(const[k,v]of Object.entries({forge:2,guild:1,hard:1,arena:5}))if(s[k]?.v!=null&&(!integer(s[k].v)||s[k].v>v))throw Error('新しい版で作られたセーブです。ゲームを更新してください。');
    if(!Array.isArray(s.cleared)||s.cleared.length>DUNGEONS.length||s.cleared.some(v=>typeof v!=='boolean'))bad();
    obj(s.eq);for(const slot of ['weapon','armor','boots','charm']){const id=s.eq[slot];if(id==null){if(slot!=='charm')bad();}else if(!Object.hasOwn(EQ,id)||EQ[id].slot!==slot||!s.owned.includes(id))bad();}
    if(s.skill!=null&&!s.skills.includes(s.skill))bad();obj(s.items);for(const[k,n]of Object.entries(s.items))if(!Object.hasOwn(ITEMS,k)||!integer(n)||n>ITEM_MAX)bad();
    obj(s.settings);for(const k of ['bgm','sfx'])if(typeof s.settings[k]!=='number'||s.settings[k]<0||s.settings[k]>1)bad();
    if(s.settings.pixelfx!=null&&typeof s.settings.pixelfx!=='boolean')bad();
    if(![0,30,60,90,120].includes(s.settings.fps)||![.4,.7,1,1.5].includes(s.settings.pad))bad();
    for(const path of ['materials','bestiary','bestiary.seen','bestiary.obtained','forge','forge.inherited','forge.upgrades','guild','guild.stats','guild.stats.values','guild.stats.crafts','guild.stats.skills','guild.stats.builds','guild.claimed','guild.receipts','arena','arena.trials','arena.chains','arena.rewards','hard','hard.cleared']){let v=s;for(const k of path.split('.'))v=v?.[k];if(v!=null)obj(v);}
    for(const path of ['craftTools','craftSkills','forge.receipts','guild.titles']){let v=s;for(const k of path.split('.'))v=v?.[k];if(v!=null)strings(v);}
    if(s.loadout!=null){obj(s.loadout);for(const[k,n]of Object.entries(s.loadout))if(!Object.hasOwn(ITEMS,k)||!integer(n)||n>ITEM_MAX)bad();}
    if(s.slots!=null){if(!Array.isArray(s.slots)||s.slots.length>10)bad();for(const x of s.slots)if(x!=null&&(!transferObject(x)||!Object.hasOwn(ITEMS,x.id)||!integer(x.n)||x.n>ITEM_MAX))bad();}
    for(const[id,values]of Object.entries(s.forge?.upgrades||{})){obj(values);if(!EQ[id]||!s.owned.includes(id))bad();for(const[k,n]of Object.entries(values))if(!smithKeys(EQ[id]).includes(k)||!integer(n)||n>SMITH_CAP-smithBase(EQ[id],k))bad();}
    for(const[id,source]of Object.entries(s.forge?.inherited||{}))if(!EQ[id]||!EQ[source]||!s.owned.includes(id)||EQ[id].slot!==EQ[source].slot)bad();
    for(const records of [s.arena?.trials,s.arena?.chains])for(const r of Object.values(records||{})){obj(r);if(!integer(r.clears)||!Number.isFinite(r.best)||r.best<0)bad();}
    if(s.guild?.daily!=null){obj(s.guild.daily);if(s.guild.daily.ids!=null)strings(s.guild.daily.ids);if(s.guild.daily.claimed!=null)strings(s.guild.daily.claimed);}
    return s;
  }
  function transferEncode(data=save){transferValidate(data);const copy=JSON.parse(JSON.stringify(data));return JSON.stringify({format:TRANSFER_FORMAT,version:1,exportedAt:new Date().toISOString(),checksum:transferChecksum(JSON.stringify(copy)),data:copy},null,2);}
  function transferParse(text){
    if(typeof text!=='string'||text.length>TRANSFER_LIMIT)throw Error('ファイルが大きすぎます。');
    let file;try{file=JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw Error('JSONファイルを読み取れません。ファイルの破損を確認してください。');}
    if(!transferObject(file)||file.format!==TRANSFER_FORMAT||file.version!==1||!file.data)throw Error('ぶつかり勇者の対応するセーブファイルではありません。');
    if(file.checksum!==transferChecksum(JSON.stringify(file.data)))throw Error('セーブ内容の照合に失敗しました。ファイルが変更または破損しています。');
    return transferValidate(file.data);
  }
  function transferSummary(s){return `<p>Lv ${s.lv} ／ ${s.gold.toLocaleString()} G<br>ノーマルクリア ${s.cleared.filter(Boolean).length}面<br>装備 ${s.owned.length}個 ／ 素材 ${Object.keys(s.materials||{}).length}種類<br>闘技場クリア ${Object.keys(s.arena?.trials||{}).length}課題</p>`;}
  function transferNotice(message){toast(message,'#f2c14e');const el=$('transferStatus');if(el)el.textContent=message;}
  function openSaveTransfer(){
    if(!transferAllowed()){transferNotice('セーブデータの操作は、街の勇者の家で行ってください。');return;}
    facilitySelect('house','settings');transferEpoch++;transferPending=null;let backup=false;try{backup=!!localStorage.getItem(TRANSFER_BACKUP);}catch{}
    openPanel('セーブデータ',`${facilityDetail('セーブデータの持ち出し',["書き出したファイルを保管し、別の端末やブラウザへ冒険記録を移せます。装備・素材・図鑑・依頼・闘技場・設定も含みます。","読み込みは現在の記録を置き換えます。内容を確認してから実行してください。読み込み直前の記録は端末内に残り、この画面から戻せます。","ファイルには冒険途中の戦闘状態を含めません。端末内の控えも、ゲーム内のデータ消去やアプリのデータ削除では消えるため、大切な記録はファイルでも保管してください。"])}${transferSummary(save)}<button class="btn" id="transferExport" ${transferExportBusy?'disabled':''}>ファイルへ書き出す</button><button class="btn" id="transferImport">ファイルから読み込む</button>${backup?'<button class="btn" id="transferRestore">読み込み前の記録に戻す</button>':''}<p id="transferStatus" role="status" class="optn"></p>`,[['設定へ',openOptions]],'house');
    $('transferExport').addEventListener('click',()=>{A.sfx('select');transferExportFile();});$('transferImport').addEventListener('click',()=>{A.sfx('select');transferChooseFile();});if(backup)$('transferRestore').addEventListener('click',()=>{A.sfx('select');try{transferPreview(localStorage.getItem(TRANSFER_BACKUP),'端末内に残した記録');}catch(e){transferNotice(e.message);}});
  }
  function transferPreview(text,name='セーブファイル'){
    if(!transferAllowed())return false;const data=transferParse(text);const token={data:JSON.parse(JSON.stringify(data))};transferPending=token;
    openPanel('この記録を読み込みますか？',`<p>${transferEscape(name)}</p>${transferSummary(data)}<p class="gold">現在の記録を置き換えます。合算はされません。</p>`,[['読み込む',()=>transferCommit(token),true],['やめる',openSaveTransfer]],'house');return true;
  }
  function transferNormalize(data){
    const previous=save,flags={bestDirty,guildDirty,craftDirty,at:guildReadyCache.at};
    try{save=JSON.parse(JSON.stringify(data));const d=DEF_SAVE();save={...d,...save,items:{...d.items,...save.items},eq:{...d.eq,...save.eq},settings:{...d.settings,...save.settings}};save.cleared=Array.from({length:DUNGEONS.length},(_,i)=>!!save.cleared[i]);save.hp=null;craftNormalize();forgeNormalize();bestNormalize();guildNormalize();hardNormalize();arenaNormalize();return save;}
    finally{save=previous;bestDirty=flags.bestDirty;guildDirty=flags.guildDirty;craftDirty=flags.craftDirty;guildReadyCache.at=flags.at;}
  }
  function transferCommit(token=transferPending){
    if(!transferAllowed()||!token||token!==transferPending)return false;
    let next;try{next=transferNormalize(token.data);transferValidate(next);const backup=transferEncode(save),serialized=JSON.stringify(next);let oldBackup=localStorage.getItem(TRANSFER_BACKUP);localStorage.setItem(TRANSFER_BACKUP,backup);try{localStorage.setItem('bumphero_save',serialized);}catch(e){try{if(oldBackup==null)localStorage.removeItem(TRANSFER_BACKUP);else localStorage.setItem(TRANSFER_BACKUP,oldBackup);}catch{}throw e;}}
    catch(e){transferNotice('読み込めませんでした。現在のセーブは変更していません。'+(e.message.includes('形式')?e.message:''));return false;}
    transferPending=null;transferEpoch++;save=next;guildRun=null;bestDirty=false;guildDirty=false;craftDirty=0;guildReadyCache.at=-99;transition=null;nextT=0;if(audioOn)FMusic.setVolume(save.settings.bgm,save.settings.sfx);goTown();openSaveTransfer();A.sfx('confirm');transferNotice('セーブデータを読み込みました。');return true;
  }
  function transferChooseFile(){
    if(!transferAllowed())return;transferInput?.remove();const epoch=transferEpoch,input=document.createElement('input');transferInput=input;input.type='file';input.accept='.json,application/json';input.style.display='none';document.body.appendChild(input);
    input.addEventListener('change',async()=>{try{const file=input.files?.[0];if(!file)return;if(file.size>TRANSFER_LIMIT)throw Error('ファイルが大きすぎます。');const text=await file.text();if(transferInput!==input||epoch!==transferEpoch||!transferAllowed()||panel.hidden||$('panelTitle').textContent!=='セーブデータ')return;transferPreview(text,file.name);}catch(e){transferNotice(e.message);}finally{input.remove();if(transferInput===input)transferInput=null;}});input.addEventListener('cancel',()=>{input.remove();if(transferInput===input)transferInput=null;});input.click();
  }
  function transferExportFile(){
    if(!transferAllowed()||transferExportBusy)return false;try{const text=transferEncode(),name='butsukari-yusha-save-'+(()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'T'+p(d.getHours())+p(d.getMinutes())+p(d.getSeconds());})()+'.json';
      if(window.YushaSave?.exportSave){transferExportBusy=true;const button=$('transferExport');if(button)button.disabled=true;window.YushaSave.exportSave(text,name);transferNotice('保存先を選んでください。');}
      else{const blob=new Blob([text],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);transferNotice('セーブファイルを書き出しました。ブラウザのダウンロードを確認してください。');}return true;
    }catch(e){transferExportBusy=false;const button=$('transferExport');if(button)button.disabled=false;transferNotice('書き出せませんでした。'+e.message);return false;}
  }
  window.__saveTransferNativeResult=(ok,message)=>{transferExportBusy=false;const button=$('transferExport');if(button)button.disabled=false;transferNotice(message||(ok?'保存しました。':'保存を中止しました。'));};
  // SAVE TRANSFER END

  function openOptions() {
    facilitySelect('house','settings');
    openPanel('せってい', `<label class="sl" for="optBgm">BGM<input id="optBgm" type="range" min="0" max="1" step="0.1" value="${save.settings.bgm}"></label>
      <label class="sl" for="optSfx">こうかおん<input id="optSfx" type="range" min="0" max="1" step="0.1" value="${save.settings.sfx}"></label>
      <div class="optg">がめんの なめらかさ（リフレッシュレート）<div class="tabs" id="optFps">${[[0, 'じどう'], [30, '30'], [60, '60'], [90, '90'], [120, '120']].map(([v, l]) => `<button data-v="${v}" aria-pressed="${save.settings.fps === v}">${l}</button>`).join('')}</div>
        <span class="optn">現在の画面：約 ${Math.round(1000 / rafMs / 10) * 10}Hz</span></div>
      <div class="optg">スライドパッドの こさ<div class="tabs" id="optPad">${[[0.4, 'うすい'], [0.7, 'ややうすい'], [1, 'ふつう'], [1.5, 'こい']].map(([v, l]) => `<button data-v="${v}" aria-pressed="${save.settings.pad === v}">${l}</button>`).join('')}</div>
        <canvas id="optPadPrev" width="150" height="74" style="display:block;margin:6px auto 0;border-radius:8px;background:#2a2a3e"></canvas></div>
      <div class="optg">技のエフェクト<div class="tabs" id="optFx"><button data-v="1" aria-pressed="${save.settings.pixelfx!==false}">新しい演出</button><button data-v="0" aria-pressed="${save.settings.pixelfx===false}">従来の演出</button></div></div>
      <div class="optg"><button class="btn" id="optSaveTransfer">セーブデータの管理</button></div>
      `,
      [['もどる', openHouse, true], ['操作の説明',openHelp], ['操作練習をやり直す',()=>{save.tut=0;persist();toast('次に はじまりの洞窟へ入ると操作練習が始まります。','#f2c14e');}], ['データをけす', () => openPanel('ほんとうに けしますか？', '<p>冒険記録と端末内の読み込み前の控えを消し、すべて最初にもどします。</p>', [['けす', () => { localStorage.removeItem(TRANSFER_BACKUP); save = DEF_SAVE(); craftNormalize(); forgeNormalize(); bestNormalize(); guildNormalize(); hardNormalize(); arenaNormalize(); guildRun=null; persist(); goTown(); }], ['やめる', openOptions, true]], 'house')]], 'house');
    const apply = () => { save.settings.bgm = +$('optBgm').value; save.settings.sfx = +$('optSfx').value; if (audioOn) FMusic.setVolume(save.settings.bgm, save.settings.sfx); persist(); };
    $('optBgm').addEventListener('input', apply); $('optSfx').addEventListener('input', apply);
    const seg = (id, key, after) => $(id).querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      save.settings[key] = +b.dataset.v; persist(); A.sfx('select');
      $(id).querySelectorAll('button').forEach(o => o.setAttribute('aria-pressed', String(o === b))); if (after) after();
    }));
    const prev = () => { const c = $('optPadPrev'), x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); padShape(x, 75, 37, 105, 30, 30, false, 0.6); };
    $('optFx').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{save.settings.pixelfx=b.dataset.v==='1';pfxClear();persist();A.sfx('select');$('optFx').querySelectorAll('button').forEach(o=>o.setAttribute('aria-pressed',String(o===b)));}));
    $('optSaveTransfer').addEventListener('click',()=>{A.sfx('select');openSaveTransfer();});
    seg('optFps', 'fps', () => { nextT = 0; }); seg('optPad', 'pad', prev); prev();
  }

  function openHelp() {
    facilityMessage('操作の説明',`<section><h3>移動と体当たり</h3><p>画面に触れると、その場所がスライドパッドになります。大きく倒して勢いをつけ、敵へ体当たりしましょう。命中すると跳ね返ります。</p></section><section><h3>回避とスキル</h3><p>指をすばやくはじくと回避します。ダブルタップでセットしたスキルを使えます。道具は袋のボタンから選びます。</p></section><section><h3>冒険</h3><p>魔物を倒して封印を解き、奥のボスを目指しましょう。宝箱や木箱は体当たりで開けられます。盾を構えた相手には横から攻めましょう。</p></section><section><h3>操作練習</h3><p>勇者の家の設定から、操作練習をやり直せます。</p></section>`);
  }

  function openPause() {
    if(arenaRun){arenaPause();return;}
    paused = true;
    openPanel('ポーズ', statusHtml() + '<p style="font-size:13px;color:var(--muted);margin-top:8px">街へ かえっても ひろった ゴールドは なくならない。</p>', [['つづける', () => { paused = false; closePanel(); }, true], ['そうび', () => openEquip(openPause)],
      ...(tut ? [['チュートリアルを とばす', () => { tutEnd(true); paused = false; closePanel(); }]] : []), ['街へかえる', () => { paused = false; retreat(); }]]);
  }

  $('navL').addEventListener('click', () => { if (state === 'town' && !panelOpen) townSwipeTo(townPage - 1); });
  $('navR').addEventListener('click', () => { if (state === 'town' && !panelOpen) townSwipeTo(townPage + 1); });
  $('pauseBtn').addEventListener('click', () => { if (state === 'play' || state === 'boss') { if (trayOpen) closeTray(); A.sfx('select'); openPause(); } });
  $('itemBtn').addEventListener('click', e => { e.stopPropagation(); if (trayOpen) closeTray(); else openTray(); });
  $('whistleBtn').addEventListener('click', e => { e.stopPropagation(); if (trayOpen) closeTray(); defWhistle(); });
  // audio: made at load (the app's WebView may play at once); a browser lets it sound from the first touch on
  function startAudio() {
    try { if (!audioOn) { audioOn = FMusic.init(); FMusic.setVolume(save.settings.bgm, save.settings.sfx); } FMusic.resume(); } catch (e) { audioOn = false; }
  }
  document.addEventListener('pointerdown', () => { if (state === 'title') startAudio(); }, true);
  $('startBtn').addEventListener('click', () => {
    startAudio();
    $('title').hidden = true; goTown();
  });
  document.addEventListener('keydown', e => {
    if ((state === 'play' || state === 'boss') && (e.key === ' ' || e.key === 'Shift')) { e.preventDefault(); useSkill(); return; }
    if (state !== 'town') return;
    if (e.key === 'Escape' && !$('helpWrap').hidden) { e.preventDefault();facilityCloseHelp();return; }
    if (e.key === 'Escape' && panelOpen) closePanel();
    else if (!panelOpen && e.key === 'ArrowLeft') townSwipeTo(townPage - 1);
    else if (!panelOpen && e.key === 'ArrowRight') townSwipeTo(townPage + 1);
    else if (!panelOpen && e.key === 'Enter') enterBuilding(curPage().id);
  });

  // canvas input: drag to move (dungeon) / tap a building (town)
  cv.addEventListener('pointerdown', e => {
    if (trayOpen) { closeTray(); return; }
    if (panelOpen) return;
    if (state === 'town') {
      if (inside) return;
      tdrag.id = e.pointerId; tdrag.x0 = e.clientX; tdrag.y0 = e.clientY; tdrag.dx = 0; tdrag.moved = false;
      try { cv.setPointerCapture(e.pointerId); } catch (er) { }
      return;
    }
    if ((state !== 'play' && state !== 'boss') || paused) return;
    const r = cv.getBoundingClientRect(), now = performance.now(), tx = (e.clientX - r.left) / S, ty = (e.clientY - r.top) / S;
    if (now - lastTap.t < 320 && hyp(tx - lastTap.x, ty - lastTap.y) < 70) { lastTap.t = 0; useSkill(); }   // double tap = skill
    if (drag.down) return;
    drag.down = true; drag.id = e.pointerId; drag.t0 = now; drag.far = 0;
    drag.ox = drag.px = drag.sx = (e.clientX - r.left) / S; drag.oy = drag.py = drag.sy = (e.clientY - r.top) / S;craftFlickStart();
    try { cv.setPointerCapture(e.pointerId); } catch (er) { }
  });
  cv.addEventListener('pointermove', e => {
    if (state === 'town' && e.pointerId === tdrag.id) {
      tdrag.dx = (e.clientX - tdrag.x0) / S;
      if (Math.abs(tdrag.dx) > 8) tdrag.moved = true;
      if (tdrag.moved) townX = townPage - tdrag.dx / W;
      return;
    }
    if (!drag.down || e.pointerId !== drag.id) return;
    const r = cv.getBoundingClientRect();
    drag.px = (e.clientX - r.left) / S; drag.py = (e.clientY - r.top) / S;craftFlickMove();
    // the pad follows the finger when it slides past the rim
    const dx = drag.px - drag.ox, dy = drag.py - drag.oy, d = hyp(dx, dy);
    drag.far = Math.max(drag.far || 0, d);
    if (d > PAD_R) { drag.ox = drag.px - dx / d * PAD_R; drag.oy = drag.py - dy / d * PAD_R; }
  });
  const up = e => {
    if (e.pointerId === tdrag.id) {
      tdrag.id = null;
      if (state !== 'town' || panelOpen) return;
      if (tdrag.moved) { if (tdrag.dx < -W * 0.15) townSwipeTo(townPage + 1); else if (tdrag.dx > W * 0.15) townSwipeTo(townPage - 1); }
      else {   // tap: on the building (or its sign) = go inside
        const r = cv.getBoundingClientRect(), y = (e.clientY - r.top) / S, x = (e.clientX - r.left) / S, b = townBuildingRect();
        if (y > b.y - 60 && y < b.by + 110 && x > b.x - 20 && x < b.x + b.w + 20) enterBuilding(curPage().id);
      }
      return;
    }
    if (e.pointerId === drag.id) {
      const now = performance.now();
      const fdx = drag.px - drag.sx, fdy = drag.py - drag.sy, fd = hyp(fdx, fdy), ft = now - (drag.t0 || 0);
      if (ft < 230 && (drag.far || 0) < 16) { lastTap.t = now; lastTap.x = drag.ox; lastTap.y = drag.oy; }   // a short tap: the 1st half of a double tap
      else if (ft < (craftCurvedFlick()?360:240) && fd > 30 && fd / ft > 0.22) craftFlickRoll(fdx, fdy);   // a quick flick = roll that way
      drag.down = false; drag.id = null;
    }
  };
  const lastTap = { t: 0, x: 0, y: 0 };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

  // ---------------------------------------------------------------
  //  LOOP
  // ---------------------------------------------------------------
  // resolution: device pixel ratio capped at 2 and ~1.2M pixels, then lowered automatically if frames are slow
  let quality = 1;
  // any phone shape: the play field is always 360 wide (logical); a taller screen just sees more of the dungeon.
  // Screens wider than 360:540 (tablets, foldables, landscape) get side bars so the field never gets too short.
  let safeT = 0, safeB = 0;
  function resize() {
    const r = cv.getBoundingClientRect();
    const cap = Math.sqrt(1.2e6 / Math.max(1, r.width * r.height));
    dpr = Math.max(0.75, Math.min(2, window.devicePixelRatio || 1, cap) * quality);
    // the whole screen is used. Characters keep one size: fit 360 to the width on phones; on wider screens
    // (tablets, foldables, landscape) the scale is set by the height (and capped) and the extra width shows more around the field
    S = Math.max(0.5, Math.min(r.width / VW, r.height / 540, 560 / VW)); W = Math.max(VW, r.width / S); H = Math.round(r.height / S); WX = hardRun?.maze&&state==='play'?W/2-hardRun.camX:(W-VW)/2;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    const pr = $('safeProbe'), cs = pr ? getComputedStyle(pr) : null, T = window.__safeTest;   // notch / punch-hole and the gesture bar, in logical px
    safeT = (T ? T.t : cs ? parseFloat(cs.paddingTop) || 0 : 0) / S; safeB = (T ? T.b : cs ? parseFloat(cs.paddingBottom) || 0 : 0) / S;
    sizePix();
  }
  window.addEventListener('resize', resize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);   // foldables / split screen
  window.addEventListener('orientationchange', () => setTimeout(resize, 120));
  // app in the background (other app, screen off, tab hidden): stop the music and the game loop entirely
  let sleeping = false;
  function sleep() {
    if (sleeping) return; sleeping = true;
    if ((state === 'play' || state === 'boss') && !paused && !panelOpen) openPause();
    drag.down = false; drag.id = null;
    if (audioOn) try { FMusic.suspend(); } catch (e) { }
  }
  function wake() {
    if (!sleeping) return; sleeping = false;
    last = performance.now();
    if (audioOn) try { FMusic.resume(); } catch (e) { }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) sleep(); else wake(); });
  window.addEventListener('pagehide', sleep);
  window.addEventListener('pageshow', () => { if (!document.hidden) wake(); });
  window.addEventListener('freeze', sleep);
  window.addEventListener('resume', () => { if (!document.hidden) wake(); });
  // Android shell (WebView in the APK): app switched away / back, and the Back key
  window.__appPause = sleep;
  window.__appResume = wake;
  window.__appBack = () => {
    if (state === 'title') return false;
    if (!$('helpWrap').hidden) { facilityCloseHelp();return true; }
    if(arenaRun&&['rest','ready','saving','between'].includes(arenaRun.phase)){arenaPause();return true;}
    if (trayOpen) { closeTray(); return true; }
    if (state === 'over') { goTown(); return true; }
    if (panelOpen) { if (state === 'play' || state === 'boss') paused = false; closePanel(); return true; }
    if (state === 'play' || state === 'boss') { openPause(); return true; }
    if (state === 'town' && pIdx(townPage) !== 1) { let d = 1 - pIdx(townPage); if (d > TOWN_PAGES.length / 2) d -= TOWN_PAGES.length; if (d < -TOWN_PAGES.length / 2) d += TOWN_PAGES.length; townSwipeTo(townPage + d); return true; }
    return false;   // gate page in town: let Android close the app
  };
  let last = performance.now(), lastRaf = last, rafMs = 16.7, nextT = 0;
  const perfWin = { n: 0, sum: 0 };
  function frame(now) {
    requestAnimationFrame(frame);
    const rd = now - lastRaf; lastRaf = now; if (rd > 2 && rd < 100) rafMs += (rd - rafMs) * 0.05;   // the display's own refresh interval
    if (sleeping) { last = now; return; }   // nothing runs while the app is hidden
    const cap = save.settings.fps ? 1000 / save.settings.fps : 0;   // せってい: refresh rate cap
    if (cap) { if (now < nextT - 1) return; nextT = Math.max(nextT + cap, now - cap); }
    const raw = now - last;
    const dt = Math.min(0.05, raw / 1000); last = now;
    // auto quality: if gameplay runs under ~45fps for 1.5 seconds, render fewer pixels
    if ((state === 'play' || state === 'boss') && !paused && raw < 250) {
      perfWin.n++; perfWin.sum += raw;
      if (perfWin.sum >= 1500) {
        if (perfWin.sum / perfWin.n > Math.max(22, cap * 1.3) && quality > 0.5) { quality = Math.max(0.5, quality - 0.25); resize(); }
        perfWin.n = 0; perfWin.sum = 0;
      }
    }
    if (!manual) update(dt);
    render();
  }
  let manual = false;
  loadSave(); craftNormalize(); forgeNormalize(); bestNormalize(); guildNormalize(); hardNormalize(); arenaNormalize(); resize();
  startAudio(); A.bgm(FARR.title);   // 勇者のテーマ on the title screen
  window.claude?.hot?.snapshot?.(() => arenaRun?arenaRun.home:save);
  requestAnimationFrame(frame);
  // test hooks
  window.__yusha = { pixelfx:{emit:pfxEmit,clear:pfxClear,get data(){return {effects:Object.keys(pfxData?.effects||{}),decodedBytes:pfxData?.decodedBytes||0,loaded:pfxLoaded,images:pfxImages.length,calls:pfxCalls,events:pfxEvents.length,used:[...pfxUsed]};}},saveTransfer:{validate:transferValidate,open:openSaveTransfer,encode:transferEncode,parse:transferParse,preview:transferPreview,commit:transferCommit,export:transferExportFile,get pending(){return transferPending;}},arenaMode:{ruleVersion:ARENA_RULE,ruleFor:id=>arenaTrialRule(arenaTrial(id)),open:openArena,trial:openArenaTrial,chain:openArenaChain,startTrial:arenaStartTrial,startChain:arenaStartChain,trials:ARENA_TRIALS,classes:ARENA_CLASSES,pool:arenaPool,canChain:arenaCanChain,rewards:ARENA_REWARDS,gear:arenaGear,claim:arenaClaim,normalize:arenaNormalize,supply:arenaSupply,rest:arenaRest,withdraw:arenaWithdraw,finish:arenaFinish,win:arenaBattleWon,next:arenaNextBattle,get run(){return arenaRun;},hudBox:arenaHudBox,hudLines:arenaHudLines,get circle(){return arena;}},enterBuilding,townSwipeTo, hard:{enter:hardEnter,pairs:HARD_PAIRS,normalize:hardNormalize,done:hardDone,unlocked:hardUnlocked,settle:hardSettle,contains:hardContains,confine:hardConfine,allBosses:fightBosses,hit:skillHit,openGate,get run(){return hardRun;},get arena(){return arena;}},facilities:{enter:facilityEnter,help:facilityShowHelp,closeHelp:facilityCloseHelp,stage:uiStageEnemies,get config(){return FACILITIES;},get active(){return{room:facilityRoom,tab:facilityTab};}},smith:{open:openSmith,detail:openSmithItem,confirm:openSmithConfirm,quote:smithQuote,upgrade:smithUpgrade,value:smithValue,keys:smithKeys,boots:smithBootEffects},forge:{open:openForge,confirm:openForgeConfirm,inherit:forgeInherit,check:forgeCheck,fx:forgeFx,normalize:forgeNormalize,grant:forgeGrantCrystals,hasEffect:forgeHasEffect},guild:{open:openGuild,detail:openGuildMission,missions:GUILD,claim:guildClaim,progress:guildProgress,choices:guildChoices,daily:guildDaily,normalize:guildNormalize,value:guildValue,inc:guildInc,clear:guildClear,sample:guildSampleBoss,dodge:guildDodge,ram:guildRam,wall:guildWall,hit:guildHit,heal:guildHeal,tick:guildTick,gear:guildGear,damage:ramDamage,hurt:hurtHero,rollScale:guildRollScale,get run(){return guildRun;}},bestiary:{open:openBestiary,detail:openBestiaryEntry,entries:bestEntries,drops:bestDrops,places:bestPlaces,normalize:bestNormalize,frame:bestFrame,playback:bestPlayback,get preview(){return bestPreview;}},crafting:{materials:craftMats,recipes:craftRecipes,make:craftMake,can:craftCanMake,open:openCraftShop,detail:openCraftRecipe,inventory:openCraftMaterials,exchange:craftExchange,normalize:craftNormalize,has:craftHas,ram:craftOnRam,roll:craftOnRoll,tick:craftTick,potion:craftUsePotion,skill:craftOnSkill,drop:craftDropEnemy,bossDrop:craftDropBoss,hasState:craftState,damage:craftDamageAdjust,gauges:craftGauges,feedback:craftFeedback},startRoll,useSkill,useItem, get tut() { return tut; }, get state() { return state; }, get hero() { return hero; }, get boss() { return boss; }, get enemies() { return enemies; }, get save() { return save; }, set save(v) { save = v; },
    defense: { enter: defEnter, whistle: defWhistle, stages: DEF_STAGES, spawnBoss: defSpawnBoss, get run() { return defRun; }, get arena() { return arena; } },
    enter: enterDungeon, hurtLog, get runExp() { return runExp; }, get runGold() { return runGold; }, get zones() { return zones; }, dropTest: (x, y, g) => dropCoins(x, y, g), kill: () => { hero.inv = 0; hurtHero(99999, hero.x, hero.y - 10, 100, 'test'); }, set manual(v) { manual = v; }, set noMerchant(v) { noMerchant = v; }, useSkill, data: { DUNGEONS, EN, ITEMS, EQUIP }, get bag() { return bag; }, openPrep, charmHit, stats, spawn: (t, x, y) => spawnEnemy(t, x, y, true), get evs() { return evs; }, get ev() { return ev; }, applyPower, useItem, get rings() { return rings; }, set audio(v) { audioOn = v; }, toBoss: () => { transition = null; enterBossRoom(); }, goTown, update, render, get goalY() { return goalY; }, get gate() { return [gateKills, gateNeed]; }, killE: e => killEnemy(e), hitE:hitEnemy, drag, get bullets() { return bullets; }, get props() { return props; }, stats, tunnelAt, openOptions };
})();
