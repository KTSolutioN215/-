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
  const pixC = document.createElement('canvas'); let pixX = pixC.getContext('2d');
  function beginPix() {
    const w = Math.ceil(W / PXS) + 2, h = Math.ceil(H / PXS) + 2;
    if (pixC.width !== w || pixC.height !== h) { pixC.width = w; pixC.height = h; pixX = pixC.getContext('2d'); }
    ctx = pixX; ctx.setTransform(1 / PXS, 0, 0, 1 / PXS, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, W + 6, H + 6);
  }
  function endPix() { ctx = mainCtx; ctx.imageSmoothingEnabled = false; ctx.drawImage(pixC, 0, 0, pixC.width * PXS, pixC.height * PXS); }
  const $ = id => document.getElementById(id);
  const VW = 360;
  let W = VW, H = 640, S = 1, dpr = 1;
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
    { id: 'w4', slot: 'weapon', name: '雷神の剣', atk: 26, price: 2600 },
    { id: 'w5', slot: 'weapon', name: 'ミスリルの剣', atk: 38, price: 5200 },
    { id: 'w6', slot: 'weapon', name: '竜殺しの大剣', atk: 52, price: 9000 },
    { id: 'w7', slot: 'weapon', name: '勇者の剣', atk: 70, price: 15000 },
    { id: 'w8', slot: 'weapon', name: 'オリハルコンの剣', atk: 92, price: 24000 },
    { id: 'w9', slot: 'weapon', name: 'ほしくだきの剣', atk: 118, price: 38000 },
    { id: 'w10', slot: 'weapon', name: '天空の剣', atk: 148, price: 60000 },
    { id: 'w11', slot: 'weapon', name: 'ルーンブレード', atk: 180, price: 90000 },
    { id: 'w12', slot: 'weapon', name: 'ドラゴンファング', atk: 215, price: 135000 },
    { id: 'w13', slot: 'weapon', name: 'せいれいの剣', atk: 255, price: 200000 },
    { id: 'w14', slot: 'weapon', name: 'はじゃの剣', atk: 300, price: 290000 },
    { id: 'w15', slot: 'weapon', name: 'ひかりの聖剣', atk: 350, price: 420000 },
    { id: 'a0', slot: 'armor', name: '布の服', def: 0, price: 0 },
    { id: 'a1', slot: 'armor', name: '革のよろい', def: 3, price: 100 },
    { id: 'a2', slot: 'armor', name: 'くさりかたびら', def: 7, price: 380 },
    { id: 'a3', slot: 'armor', name: '鋼のよろい', def: 12, price: 950 },
    { id: 'a4', slot: 'armor', name: '竜のうろこよろい', def: 19, price: 2300 },
    { id: 'a5', slot: 'armor', name: 'ミスリルのよろい', def: 27, price: 5000 },
    { id: 'a6', slot: 'armor', name: '光のよろい', def: 36, price: 11000 },
    { id: 'a7', slot: 'armor', name: 'オリハルコンのよろい', def: 47, price: 20000 },
    { id: 'a8', slot: 'armor', name: '星のよろい', def: 59, price: 34000 },
    { id: 'a9', slot: 'armor', name: '天空のよろい', def: 73, price: 55000 },
    { id: 'a10', slot: 'armor', name: 'ルーンメイル', def: 88, price: 85000 },
    { id: 'a11', slot: 'armor', name: 'ドラゴンメイル', def: 104, price: 125000 },
    { id: 'a12', slot: 'armor', name: 'せいれいのよろい', def: 122, price: 185000 },
    { id: 'a13', slot: 'armor', name: 'ふしちょうのよろい', def: 142, price: 270000 },
    { id: 'a14', slot: 'armor', name: 'ひかりの聖よろい', def: 165, price: 390000 },
    { id: 'b0', slot: 'boots', name: '旅人のくつ', ram: 1, price: 0 },
    { id: 'b1', slot: 'boots', name: '疾風のくつ', ram: 1.12, price: 320 },
    { id: 'b2', slot: 'boots', name: '天馬のくつ', ram: 1.25, price: 1500 },
    { id: 'b3', slot: 'boots', name: '神速のくつ', ram: 1.38, price: 6500 },
    { id: 'b4', slot: 'boots', name: '流星のくつ', ram: 1.5, price: 26000 },
    { id: 'b5', slot: 'boots', name: '天翔のくつ', ram: 1.6, price: 110000 },
    { id: 'b6', slot: 'boots', name: '時空のくつ', ram: 1.7, price: 320000 },
    { id: 'c1', slot: 'charm', name: 'いのちのお守り', hp: 30, price: 450 },
    { id: 'c2', slot: 'charm', name: 'まもりの指輪', def: 6, price: 900 },
    { id: 'c3', slot: 'charm', name: '戦士のうでわ', atk: 8, price: 1400 },
    { id: 'c4', slot: 'charm', name: '勇者のペンダント', atk: 14, def: 10, hp: 60, price: 8000 },
    { id: 'c5', slot: 'charm', name: '神々の指輪', def: 22, hp: 120, price: 20000 },
    { id: 'c6', slot: 'charm', name: '覇王のうでわ', atk: 32, price: 30000 },
    { id: 'c7', slot: 'charm', name: '天空のかんむり', atk: 28, def: 28, hp: 200, price: 58000 },
    { id: 'c8', slot: 'charm', name: '竜王のメダル', atk: 40, def: 40, hp: 300, price: 150000 },
    { id: 'c9', slot: 'charm', name: 'ひかりの宝玉', atk: 60, def: 55, hp: 450, price: 400000 },
  ];
  const EQ = Object.fromEntries(EQUIP.map(e => [e.id, e]));
  const SLOT_NAME = { weapon: 'ぶき', armor: 'よろい', boots: 'くつ', charm: 'そうしょく' };
  // heal = max(fixed amount, share of max HP), so items stay useful late in the game
  const ITEMS = {
    herb: { name: 'やくそう', heal: 35, pct: 0.3, price: 12, note: 'HPを30%かいふく（さいてい35）' },
    potion: { name: 'ポーション', heal: 110, pct: 0.6, price: 50, note: 'HPを60%かいふく（さいてい110）' },
    hipotion: { name: 'ハイポーション', heal: 250, pct: 0.9, price: 160, note: 'HPを90%かいふく（さいてい250）' },
    elixir: { name: 'エリクサー', heal: 99999, pct: 1, price: 400, note: 'HPをぜんかいふく' },
    power: { name: 'ちからのくすり', buff: 'atk', dur: 20, price: 140, note: '20びょう こうげき1.5ばい' },
    guard: { name: 'まもりのくすり', buff: 'def', dur: 20, price: 140, note: '20びょう うけるダメージはんぶん' },
  };
  const healOf = (id, maxHp) => Math.max(ITEMS[id].heal || 0, Math.round(maxHp * (ITEMS[id].pct || 0)));
  const ITEM_MAX = 9;

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
    archdemon: { name: 'アークデーモン', hp: 90, atk: 17, def: 5, r: 22, mass: 4, spd: 32, exp: 30, gold: 28, ai: 'slam', col: '#8a2a4a' },
  };

  // 25 dungeons. m = monster HP multiplier, a = monster attack multiplier.
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
    { name: 'こおりの塔', en: 'FROZEN SPIRE', rec: 16, len: 3300, w: [0.62, 0.9], pool: { wolf: 2, ghost: 1.5, golem: 0.8, mage: 1, knight: 0.5 }, groups: 12, rocks: 6, spikes: 6, chests: 2, crates: 4,
      pal: { wall: '#16283a', wallHi: '#365a78', floor: '#8aa8c0', floorLn: '#6a8aa4', light: '190,240,255', fog: 0.4 }, song: 'laser', key: 7, bpm: 134, boss: 'icequeen', m: 3.94, a: 2.87, xp: 1428, gp: 1348 },
    { name: '天空の遺跡', en: 'SKY RUINS', rec: 20, len: 3400, w: [0.62, 0.9], pool: { imp: 2.5, archer: 1.5, mage: 1, knight: 0.8 }, groups: 13, rocks: 5, spikes: 6, chests: 2, crates: 4,
      pal: { wall: '#2a3a5a', wallHi: '#5a7aa8', floor: '#b0a890', floorLn: '#8e8670', light: '255,240,170', fog: 0.3 }, song: 'A', key: 7, bpm: 136, boss: 'thunderbird', m: 4.87, a: 3.33, xp: 2065, gp: 1954 },
    { name: 'やみの砦', en: 'DARK FORTRESS', rec: 24, len: 3500, w: [0.62, 0.9], pool: { knight: 2.2, skeleton: 1.2, mage: 1, golem: 0.8, imp: 1 }, groups: 13, rocks: 5, spikes: 7, chests: 2, crates: 3,
      pal: { wall: '#140d10', wallHi: '#3a2228', floor: '#4a3a40', floorLn: '#382a30', light: '255,80,90', fog: 0.56 }, song: 'piston', key: 9, bpm: 138, boss: 'deathknight', m: 6.08, a: 3.88, xp: 2799, gp: 2833 },
    { name: 'しずみの神殿', en: 'SUNKEN TEMPLE', rec: 28, len: 3500, w: [0.62, 0.9], pool: { fishman: 3, ghost: 1, spider: 1, mushroom: 0.8 }, groups: 13, rocks: 6, spikes: 5, chests: 2, crates: 3,
      pal: { wall: '#0c2028', wallHi: '#1f4a58', floor: '#3a6a74', floorLn: '#2c545c', light: '120,230,220', fog: 0.5 }, song: 'c8', key: 5, bpm: 134, boss: 'kraken', m: 7.9, a: 4.71, xp: 3628, gp: 4108 },
    { name: 'さばくの大ピラミッド', en: 'GREAT PYRAMID', rec: 32, len: 3600, w: [0.62, 0.9], pool: { mummy: 2.5, scorpion: 2, imp: 1, mage: 0.8 }, groups: 13, rocks: 5, spikes: 8, chests: 2, crates: 3,
      pal: { wall: '#3a2a12', wallHi: '#6a5022', floor: '#c8a868', floorLn: '#a88a50', light: '255,220,140', fog: 0.38 }, song: 'mine', key: 4, bpm: 138, boss: 'pharaoh', m: 8.96, a: 5.17, xp: 4548, gp: 5957 },
    { name: 'からくりの時計塔', en: 'CLOCKWORK TOWER', rec: 36, len: 3700, w: [0.62, 0.9], pool: { golem: 1.5, knight: 1.5, imp: 1.5, archer: 1.2, scorpion: 0.8 }, groups: 14, rocks: 5, spikes: 8, chests: 2, crates: 3,
      pal: { wall: '#2a1e14', wallHi: '#5a4430', floor: '#8a7058', floorLn: '#6a5440', light: '255,200,120', fog: 0.45 }, song: 'swing', key: 7, bpm: 140, boss: 'clockmachine', m: 10.25, a: 5.7, xp: 5555, gp: 8638 },
    { name: '星界のさけめ', en: 'ASTRAL RIFT', rec: 40, len: 3800, w: [0.62, 0.9], pool: { ghost: 2, mage: 2, imp: 1.5, spider: 1, knight: 0.8 }, groups: 14, rocks: 4, spikes: 6, chests: 2, crates: 3,
      pal: { wall: '#08061a', wallHi: '#241e5a', floor: '#2e2a5e', floorLn: '#221e48', light: '200,160,255', fog: 0.6 }, song: 'gravity', key: 9, bpm: 142, boss: 'voideye', m: 11.67, a: 6.25, xp: 6647, gp: 12525 },
    { name: 'ほのおの魔界門', en: 'INFERNO GATE', rec: 44, len: 3900, w: [0.62, 0.9], pool: { lizard: 2, golem: 1.2, knight: 1.5, imp: 1.5, scorpion: 1, mummy: 0.6 }, groups: 15, rocks: 5, spikes: 9, chests: 2, crates: 3,
      pal: { wall: '#2a0806', wallHi: '#5a1410', floor: '#6a2418', floorLn: '#521a10', light: '255,90,40', fog: 0.5 }, song: 'slam', key: 2, bpm: 142, boss: 'cerberus', m: 12.74, a: 6.65, xp: 7822, gp: 18162 },
    { name: '毒の大沼', en: 'POISON MIRE', rec: 48, len: 3900, w: [0.62, 0.9], pool: { toad: 3, mandrake: 1.5, mushroom: 1, spider: 0.6, bat: 0.6 }, groups: 15, rocks: 6, spikes: 6, chests: 2, crates: 3,
      pal: { wall: '#14200e', wallHi: '#2e4420', floor: '#4a5a2e', floorLn: '#3a4822', light: '170,255,90', fog: 0.55 }, song: 'c17', key: 5, bpm: 142, boss: 'hydra', m: 14.14, a: 7.22, xp: 9103, gp: 22702 },
    { name: 'ゆうれい船', en: 'GHOST SHIP', rec: 52, len: 3900, w: [0.62, 0.86], pool: { ghost: 2, skeleton: 2, fishman: 1.2, jelly: 1 }, groups: 15, rocks: 4, spikes: 6, chests: 2, crates: 4,
      pal: { wall: '#1a1410', wallHi: '#3e3020', floor: '#6a5640', floorLn: '#4e3e2c', light: '140,255,200', fog: 0.6 }, song: 'warp', key: 9, bpm: 142, boss: 'ghostcaptain', m: 15.7, a: 7.83, xp: 10472, gp: 27697 },
    { name: 'きょじんの峰', en: "GIANTS' PEAK", rec: 56, len: 4000, w: [0.62, 0.9], pool: { wyvern: 2, wolf: 1.5, golem: 1, archer: 1, imp: 0.6 }, groups: 15, rocks: 8, spikes: 6, chests: 2, crates: 3,
      pal: { wall: '#2a2a34', wallHi: '#5a5a6a', floor: '#8a8478', floorLn: '#6a655a', light: '255,230,190', fog: 0.32 }, song: 'A', key: 2, bpm: 144, boss: 'cyclops', m: 17.42, a: 8.49, xp: 11922, gp: 33790 },
    { name: 'まどうの図書館', en: 'ARCANE LIBRARY', rec: 60, len: 4000, w: [0.62, 0.88], pool: { book: 2.5, mage: 1.5, ghost: 1, imp: 0.8, armor: 0.6 }, groups: 15, rocks: 3, spikes: 6, chests: 2, crates: 4,
      pal: { wall: '#20142a', wallHi: '#4a2e3a', floor: '#5a3a2a', floorLn: '#44281c', light: '255,210,140', fog: 0.5 }, song: 'swing', key: 7, bpm: 144, boss: 'archmage', m: 19.34, a: 9.22, xp: 13452, gp: 41224 },
    { name: 'ジャングルの神殿', en: 'JUNGLE TEMPLE', rec: 64, len: 4000, w: [0.62, 0.9], pool: { mandrake: 1.5, toad: 1.5, scorpion: 1, lizard: 1, mimic: 0.5 }, groups: 16, rocks: 6, spikes: 8, chests: 2, crates: 3,
      pal: { wall: '#102a14', wallHi: '#2e5a2a', floor: '#7a8a5a', floorLn: '#5e6e44', light: '200,255,140', fog: 0.45 }, song: 'mine', key: 4, bpm: 146, boss: 'quetzal', m: 21.47, a: 10.0, xp: 15061, gp: 50294 },
    { name: 'ドワーフの溶鉱炉', en: 'DWARF FORGE', rec: 68, len: 4000, w: [0.62, 0.9], pool: { armor: 2, golem: 1.2, lizard: 1, archer: 0.8, knight: 0.8 }, groups: 16, rocks: 5, spikes: 9, chests: 2, crates: 3,
      pal: { wall: '#1a1612', wallHi: '#4a3a2a', floor: '#5a5a62', floorLn: '#44444c', light: '255,150,60', fog: 0.45 }, song: 'piston', key: 9, bpm: 146, boss: 'colossus', m: 23.83, a: 10.85, xp: 16746, gp: 61358 },
    { name: 'かがみの迷宮', en: 'MIRROR MAZE', rec: 72, len: 4100, w: [0.6, 0.86], pool: { mimic: 1.2, armor: 1, mage: 1, ghost: 1, knight: 1, book: 0.6 }, groups: 16, rocks: 4, spikes: 8, chests: 2, crates: 3,
      pal: { wall: '#1a2238', wallHi: '#4a5a8a', floor: '#9aa8c8', floorLn: '#7a88a8', light: '220,230,255', fog: 0.35 }, song: 'gravity', key: 2, bpm: 148, boss: 'shadowhero', m: 26.45, a: 11.77, xp: 18508, gp: 74857 },
    { name: 'しんかいの海溝', en: 'ABYSSAL TRENCH', rec: 76, len: 4100, w: [0.62, 0.9], pool: { angler: 2, jelly: 2, fishman: 1.5, spider: 0.6 }, groups: 16, rocks: 6, spikes: 6, chests: 2, crates: 3,
      pal: { wall: '#04101c', wallHi: '#10304a', floor: '#1e3a52', floorLn: '#162c40', light: '90,200,255', fog: 0.66 }, song: 'c8', key: 5, bpm: 148, boss: 'leviathan', m: 29.36, a: 12.77, xp: 20345, gp: 91326 },
    { name: 'りゅうの墓場', en: 'DRAGON GRAVEYARD', rec: 80, len: 4100, w: [0.62, 0.9], pool: { skeleton: 2, wyvern: 1, ghost: 1.2, mummy: 1, hellhound: 0.8 }, groups: 16, rocks: 6, spikes: 8, chests: 2, crates: 3,
      pal: { wall: '#1c1a18', wallHi: '#3e3a34', floor: '#6a6258', floorLn: '#524a40', light: '200,255,220', fog: 0.55 }, song: 'c15', key: 9, bpm: 150, boss: 'bonedragon', m: 32.59, a: 13.86, xp: 22256, gp: 111417 },
    { name: 'まかいの荒野', en: 'DEMON WASTES', rec: 84, len: 4100, w: [0.62, 0.9], pool: { hellhound: 2, archdemon: 1.2, imp: 1.5, lizard: 1, knight: 0.8 }, groups: 16, rocks: 6, spikes: 9, chests: 2, crates: 3,
      pal: { wall: '#2a0a10', wallHi: '#5a1a24', floor: '#5a2a2a', floorLn: '#441e1e', light: '255,70,70', fog: 0.52 }, song: 'slam', key: 2, bpm: 150, boss: 'demongeneral', m: 36.17, a: 15.04, xp: 24239, gp: 135929 },
    { name: '魔王城', en: "DEMON KING'S CASTLE", rec: 88, len: 4100, w: [0.62, 0.9], pool: { knight: 1.6, mage: 1, ghost: 0.8, golem: 0.6, imp: 1.2, archdemon: 0.8, armor: 1, hellhound: 0.8, book: 0.6 }, groups: 17, rocks: 5, spikes: 9, chests: 2, crates: 3,
      pal: { wall: '#170d22', wallHi: '#35214c', floor: '#54406a', floorLn: '#3f2f52', light: '220,120,255', fog: 0.56 }, song: 'c3', key: 2, bpm: 152, boss: 'maou', m: 40.15, a: 16.31, xp: 26295, gp: 165833 },
  ];

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
    hydra: { name: 'ヒュドラ', hp: 17680, atk: 174, def: 40, r: 48, col: '#5aa83a', wcol: '#4a9a3a', fcol: 'poison',
      moves: ['breath3', 'rain:poison', 'tentacles', 'homing', 'gapring'], moves2: ['breath3', 'rain:poison', 'tentacles', 'cross', 'dash3', 'triple'] },
    ghostcaptain: { name: 'ゆうれいせんちょう', hp: 25120, atk: 222, def: 43, r: 40, col: '#7ad8c8', wcol: '#c8e8ff', ocol: '120,255,200',
      moves: ['sweep', 'aimed5', 'rain:curse', 'warp', 'wave', 'summon'], moves2: ['sweep', 'cross', 'rain:curse', 'warp', 'triple', 'aimed5'] },
    cyclops: { name: 'サイクロプス', hp: 23520, atk: 178, def: 46, r: 50, col: '#c89a6a', wcol: '#8a6a40',
      moves: ['sweep', 'rocks', 'quake', 'laser', 'charge', 'jump'], moves2: ['sweep', 'rocks', 'quake', 'laser3', 'dash3', 'jump'] },
    archmage: { name: 'だいまどうし', hp: 19340, atk: 194, def: 49, r: 36, col: '#5a7aff', ocol: '140,170,255',
      moves: ['spiral3', 'laser3', 'warp', 'homing', 'rain:bolt', 'summon'], moves2: ['spiral3', 'cross', 'warp', 'homing', 'rain:ice', 'triple', 'rain:meteor'] },
    quetzal: { name: 'ケツァルコアトル', hp: 26840, atk: 210, def: 52, r: 44, col: '#3ad8a0', wcol: '#3ad8a0',
      moves: ['wave', 'dash3', 'rain:bolt', 'homing', 'tail', 'gapring'], moves2: ['wave', 'dash3', 'rain:bolt', 'cross', 'tail', 'spiral3'] },
    colossus: { name: 'くろがねの巨兵', hp: 19060, atk: 194, def: 56, r: 50, col: '#8a9aaa', wcol: '#a0a8b8', ocol: '255,170,80',
      moves: ['quake', 'laser3', 'rocks', 'mines', 'charge', 'twin'], moves2: ['quake', 'laser3', 'mines', 'dash3', 'clock', 'rocks'] },
    shadowhero: { name: 'かげの勇者', hp: 21160, atk: 210, def: 58, r: 34, col: '#6a5a9a', wcol: '#8a6aff', ocol: '170,120,255',
      moves: ['dash3', 'twin', 'aimed5', 'warp', 'charge', 'gapring'], moves2: ['dash3', 'twin', 'cross', 'warp', 'triple', 'laser3'] },
    leviathan: { name: 'リヴァイアサン', hp: 41100, atk: 308, def: 61, r: 50, col: '#3a7ad8', wcol: '#3a8ad8', fcol: 'water', ocol: '120,200,255',
      moves: ['tentacles', 'breath', 'rain:water', 'wave', 'homing'], moves2: ['tentacles', 'breath3', 'rain:water', 'cross', 'dash3', 'wave'] },
    bonedragon: { name: 'ボーンドラゴン', hp: 40740, atk: 291, def: 64, r: 48, col: '#e8e2cf', wcol: '#d8d0b8', fcol: 'ghost', ocol: '140,255,200',
      moves: ['breath', 'tail', 'rain:curse', 'quake', 'homing', 'fireball'], moves2: ['breath3', 'tail', 'rain:curse', 'cross', 'dash3', 'fireball'] },
    demongeneral: { name: 'まぐんしょうぐん', hp: 27130, atk: 284, def: 67, r: 44, col: '#c83a3a', wcol: '#ff4a3a',
      moves: ['twin', 'dash3', 'rain:meteor', 'laser3', 'sweep', 'summon'], moves2: ['twin', 'dash3', 'rain:meteor', 'cross', 'mines', 'laser3', 'triple'] },
    maou: { name: 'まおう', hp: 23290, atk: 251, def: 72, r: 42, exp: 15000, gold: 15000, col: '#c04cff', song: 'M', key: 2, bpm: 150, rage: 1.45,
      moves: ['twin', 'spiral3', 'rain:meteor', 'warp', 'homing', 'laser3', 'gapring', 'clock'], moves2: ['cross', 'triple', 'rain:void', 'warp', 'dash3', 'mines', 'laser3', 'twin', 'spiral3', 'breath3'] },
  };

  // ---------------------------------------------------------------
  //  SAVE
  // ---------------------------------------------------------------
  const DEF_SAVE = () => ({ v: 1, lv: 1, exp: 0, gold: 40, hp: null, items: { herb: 3, potion: 0, hipotion: 0, elixir: 0, power: 0, guard: 0 },
    eq: { weapon: 'w0', armor: 'a0', boots: 'b0', charm: null }, owned: ['w0', 'a0', 'b0'], cleared: Array(25).fill(false), layout10: true, layout15: true, layout25: true,
    kills: 0, settings: { bgm: 0.8, sfx: 0.8 } });
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
    } catch (e) { /* storage blocked: play without saving */ }
  }
  function persist() { try { localStorage.setItem('bumphero_save', JSON.stringify(save)); } catch (e) { } }

  function stats() {
    const L = save.lv;
    const s = { maxHp: 60 + (L - 1) * 10, atk: 8 + (L - 1) * 2, def: 2 + (L - 1), ram: 1 };
    for (const slot in save.eq) {
      const e = EQ[save.eq[slot]]; if (!e) continue;
      if (e.atk) s.atk += e.atk; if (e.def) s.def += e.def; if (e.hp) s.maxHp += e.hp; if (e.ram) s.ram = e.ram;
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
  let hero = null, enemies = [], bullets = [], drops = [], props = [], fx = [], texts = [], rings = [], zones = [], anims = [];
  let bcamX = 180, bcamY = 0;   // boss-room camera
  let boss = null, arena = null;
  let camY = 0, shake = 0, flash = 0, flashCol = '255,255,255', hitStop = 0, slowMo = 0;
  let t = 0, globalT = 0, beatPulse = 0;
  let combo = 0, comboT = 0, runExp = 0, runGold = 0, runKills = 0;
  let banner = null, transition = null, hint = 0;
  const RAM_MIN = 182, HERO_R = 21, MAXSPD = 950;
  const CS = 1.5;   // character scale (hero / monsters drawn and collided 1.5x)
  const PAD_R = 52, PAD_MAX = 448;   // floating slide pad: radius (logical px) and full-tilt speed (0.7x of the first version)

  // ---------------------------------------------------------------
  //  DUNGEON GENERATION (the old tunnel, made wide)
  // ---------------------------------------------------------------
  function tunnelAt(y) {
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
    nodes = [{ y: -400, cx: W / 2, w: W * 0.7 }, { y: 0, cx: W / 2, w: W * 0.7 }, { y: 260, cx: W / 2, w: W * 0.74 }];
    let y = 260, cx = W / 2;
    while (y < D.len - 200) {
      y += R(160, 240);
      const hall = r() < 0.24;
      const w = hall ? W * R(0.86, 0.9) : W * R(D.w[0], D.w[1]);
      cx = clamp(cx + R(-70, 70), w / 2 + 6, W - w / 2 - 6);
      nodes.push({ y, cx, w, hall });
    }
    goalY = D.len;
    nodes.push({ y: goalY - 120, cx: W / 2, w: W * 0.62 }, { y: goalY, cx: W / 2, w: W * 0.5 }, { y: goalY + 600, cx: W / 2, w: W * 0.5 });

    enemies = []; bullets = []; drops = []; props = []; fx = []; texts = []; rings = []; anims = [];
    // EXP / gold per run come from the dungeon's targets (monsters 70% / 55%, boss 30% / 25%, boxes 20% gold)
    let baseExp = 0, baseGold = 0;
    // monster groups, spaced through the dungeon
    for (let g = 0; g < D.groups; g++) {
      const gy = 420 + (g + R(0.1, 0.8)) * (D.len - 700) / D.groups;
      const tn = tunnelAt(gy);
      const n = (tn.w > W * 0.85 ? 3 : 2) + (r() < 0.45 ? 1 : 0) + (di >= 2 && r() < 0.3 ? 1 : 0);
      for (let k = 0; k < n; k++) {
        const ey = gy + R(-60, 60), t2 = tunnelAt(ey);
        const e = spawnEnemy(wpick(D.pool, r()), t2.cx + R(-0.35, 0.35) * t2.w, ey);
        baseExp += EN[e.type].exp; baseGold += EN[e.type].gold;
      }
    }
    D.xk = D.xp * 0.7 / Math.max(1, baseExp); D.gk = D.gp * 0.55 / Math.max(1, baseGold);
    for (const e of enemies) { e.exp = Math.max(1, Math.round(EN[e.type].exp * D.xk)); e.gold = Math.max(1, Math.round(EN[e.type].gold * D.gk)); }
    // props: rocks, crates, chests, spike traps, torches
    const place = (min, max) => { const py = R(min, max), tn = tunnelAt(py); return { x: tn.cx + R(-0.38, 0.38) * tn.w, y: py }; };
    for (let i = 0; i < D.rocks; i++) { const p = place(380, D.len - 300); props.push({ type: 'rock', x: p.x, y: p.y, r: R(14, 22), seed: r() }); }
    for (let i = 0; i < D.crates; i++) { const p = place(300, D.len - 300); props.push({ type: 'crate', x: p.x, y: p.y, r: 13, hp: 1 }); }
    for (let i = 0; i < D.chests; i++) { const p = place(D.len * (0.25 + i * 0.4), D.len * (0.4 + i * 0.4)); props.push({ type: 'chest', x: p.x, y: p.y, r: 14, open: false }); }
    for (let i = 0; i < D.spikes; i++) {
      const py = R(600, D.len - 400), tn = tunnelAt(py), w2 = R(0.35, 0.6) * tn.w;
      props.push({ type: 'spike', x: tn.cx + R(-0.2, 0.2) * tn.w, y: py, w: w2, h: 34, ph: r() * 2 });
    }
    for (let ty = 200; ty < D.len; ty += 230) props.push({ type: 'torch', side: (ty / 230) % 2 < 1 ? -1 : 1, y: ty });
    props.push({ type: 'spring', x: W / 2, y: goalY - 190, r: 26, used: false });
    props.sort((a, b) => a.y - b.y);
  }

  function spawnEnemy(type, x, y, arenaSpawn) {
    const b = EN[type], m = D.m, a = D.a;
    const e = {
      type, name: b.name, x, y, vx: 0, vy: 0, r: Math.round(b.r * CS), mass: b.mass, spd: b.spd, ai: b.ai, col: b.col, fly: !!b.fly,
      hp: Math.round(b.hp * m), maxHp: Math.round(b.hp * m), atk: Math.round(b.atk * a), def: Math.round(b.def * a),
      exp: Math.max(1, Math.round(b.exp * (D.xk || 1))), gold: Math.max(1, Math.round(b.gold * (D.gk || 1))),
      st: 'idle', t: rnd(0, 1), cd: rnd(0.5, 1.5), face: -Math.PI / 2, hurt: 0, hitCD: 0, active: !!arenaSpawn, alpha: 1, guard: false, phase: rnd(0, 6),
    };
    if (e.ai === 'guard') e.guard = true;
    e.dashSpd = b.dash || 360; e.windT = b.wind || 0.45;
    enemies.push(e);
    return e;
  }

  // ---------------------------------------------------------------
  //  HERO
  // ---------------------------------------------------------------
  function newHero(x, y) {
    const s = stats();
    return { x, y, vx: 0, vy: 0, r: HERO_R, hp: curHp(), inv: 0, face: Math.PI / 2, trail: [], lvFlash: 0, s, recoil: 0, ramSafe: 0, buff: { atk: 0, def: 0 } };
  }
  function heroSpeed() { return hyp(hero.vx, hero.vy); }

  function gainExp(n) {
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
  function gainGold(n) { runGold += n; save.gold += n; }

  const hurtLog = {};
  function hurtHero(dmg, fromX, fromY, power = 300, cause = '?') {
    if (hero.inv > 0 || hero.hp <= 0) return;
    let d = Math.max(1, Math.round(dmg - hero.s.def * 0.5));
    hurtLog[cause] = (hurtLog[cause] || 0) + d;
    if (hero.buff.def > 0) d = Math.max(1, Math.round(d * 0.5));
    hero.hp -= d; hero.inv = 0.85;
    const dx = hero.x - fromX, dy = hero.y - fromY, l = hyp(dx, dy) || 1;
    hero.vx += dx / l * power; hero.vy += dy / l * power;
    popText(hero.x, hero.y + 20, '-' + d, '#ff5a4a', 18, 0.9);
    shake = Math.max(shake, 10); flash = 0.35; flashCol = '255,40,40'; hitStop = Math.max(hitStop, 0.05);
    A.sfx('hurt'); combo = 0;
    if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) { }
    if (hero.hp <= 0) { hero.hp = 0; heroDown(); }
  }

  const HEALS = ['herb', 'potion', 'hipotion', 'elixir'];
  const ITEM_CD = 6;   // seconds before the next item can be used (shared by every item)
  // use an item. no id = pick a sensible heal automatically (also used by the test bot)
  function useItem(id) {
    if (!hero || hero.hp <= 0) return false;
    const it = save.items, miss = hero.s.maxHp - hero.hp;
    if (!id) {
      if (miss <= 0) return false;
      const order = HEALS.filter(k => it[k] > 0);
      id = order.find(k => healOf(k, hero.s.maxHp) >= miss) || order[order.length - 1];
      if (!id) { popText(hero.x, hero.y + 26, 'かいふくアイテムがない', '#ff9a8a', 13, 0.9); return false; }
    }
    if (!it[id]) return false;
    if (hero.itemCD > 0) { popText(hero.x, hero.y + 26, `あと ${Math.ceil(hero.itemCD)}びょう`, '#ff9a8a', 13, 0.8); A.sfx('block'); return false; }
    const I = ITEMS[id];
    if (I.buff) {
      it[id]--; hero.buff[I.buff] = I.dur;
      popText(hero.x, hero.y + 26, I.name + '！', I.buff === 'atk' ? '#ff9a5a' : '#9fd0ff', 16, 1.1);
      burst(hero.x, hero.y, 18, I.buff === 'atk' ? '#ff9a5a' : '#9fd0ff', 180); A.sfx('buff');
    } else {
      if (miss <= 0) { popText(hero.x, hero.y + 26, 'HPは まんたん', '#fff', 13, 0.8); return false; }
      it[id]--;
      const h = Math.min(miss, healOf(id, hero.s.maxHp));
      hero.hp += h;
      popText(hero.x, hero.y + 26, `${I.name}  +${h}`, '#6fd38a', 16, 1.1);
      burst(hero.x, hero.y, 16, '#6fd38a', 160); A.sfx('heal');
    }
    hero.itemCD = ITEM_CD;
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
  function dropCoins(x, y, gold) {
    const n = Math.min(8, Math.max(1, Math.round(gold / 4)));
    for (let i = 0; i < n; i++) { const a = rnd(0, 6.283), v = rnd(60, 170); drops.push({ type: 'gold', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, val: Math.round(gold / n) || 1, t: 0 }); }
  }

  // ---------------------------------------------------------------
  //  START / END RUNS
  // ---------------------------------------------------------------
  function enterDungeon(di) {
    closePanel(); deathT = 0;
    genDungeon(di);
    hero = newHero(W / 2, 70);
    camY = hero.y; boss = null; arena = null; zones = []; combo = 0; runExp = 0; runGold = 0; runKills = 0;
    state = 'play'; paused = false; hint = di === 0 ? 6 : 0;
    banner = { a: D.name, b: D.en, t: 2.4 };
    A.bgm(FARR.dungeon[di]);
    showHud(true);
  }

  function enterBossRoom() {
    const B = BOSSES[D.boss];
    state = 'boss';
    arena = { cx: W / 2, cy: 0, R: 300 };   // much wider than the screen; the camera follows the hero
    enemies = []; bullets = []; drops = []; rings = []; props = []; zones = [];
    hero.x = W / 2; hero.y = -arena.R + 70; hero.vx = 0; hero.vy = 0;
    bcamX = hero.x; bcamY = hero.y + 120;
    boss = { type: D.boss, name: B.name, x: arena.cx, y: arena.cy + 20, vx: 0, vy: 0, r: Math.round(B.r * 1.4), hp: B.hp, maxHp: B.hp, atk: B.atk, def: B.def, col: B.col, wcol: B.wcol, fcol: B.fcol, ocol: B.ocol,
      exp: Math.round(D.xp * 0.3), gold: Math.round(D.gp * 0.25), moves: B.moves, moves2: B.moves2, phase: 1, mv: null, mt: 0, cd: 2.2, last: '', hurt: 0, hitCD: 0, z: 0,
      sweeps: [], intro: 2.6, face: -Math.PI / 2, dead: 0, rage: B.rage, waveT: 9, hx: arena.cx, hy: arena.cy + 20, homeT: 0, alpha: 1 };
    banner = { a: `${B.name} が あらわれた！`, b: 'BOSS BATTLE', t: 2.6, boss: true };
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
        <p style="color:var(--muted);font-size:14px;margin-top:8px">レベルと けいけんちは そのまま。<br>そうびを ととのえて もう一度いどもう。</p>`,
        [['街へもどる', () => goTown(), true]]);
    }
  }

  function bossDefeated() {
    const B = boss;
    B.dead = 0.01;
    hitStop = 0.25; slowMo = 1.5; shake = 26; flash = 1; flashCol = '255,255,255';
    bullets = []; B.sweeps = []; rings = [];
    for (const e of enemies) e.dead = true;
  }
  function showClear() {
    const B = boss;
    {
      gainExp(B.exp); gainGold(B.gold);
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
        ${first && dIdx < DUNGEONS.length - 1 ? `<p style="margin-top:10px" class="gold">あたらしいダンジョン「${DUNGEONS[dIdx + 1].name}」に いけるようになった！</p>` : ''}
        ${first && dIdx === DUNGEONS.length - 1 ? `<p style="margin-top:10px" class="gold">まおうを たおし、せかいに へいわが もどった！<br>（ダンジョンには なんどでも いどめます）</p>` : ''}`,
        [['街へもどる', () => goTown(), true]]);
    }
  }

  function retreat() {
    save.hp = null; persist();
    goTown();
  }

  // ---------------------------------------------------------------
  //  UPDATE — dungeon / boss
  // ---------------------------------------------------------------
  // slide pad: touch anywhere = pad center (ox,oy); the finger's offset (px,py) steers. Full tilt = charge speed.
  const drag = { down: false, id: null, ox: 0, oy: 0, px: 0, py: 0 };

  function updateHero(dt) {
    const h = hero, maxS = MAXSPD * h.s.ram;
    if (h.recoil > 0) {   // 反動: just after a ram the hero flies back and the pad is ignored for a moment
      h.recoil -= dt; const f = Math.exp(-dt * 3); h.vx *= f; h.vy *= f;
    } else if (drag.down) {
      const dx = drag.px - drag.ox, dy = drag.py - drag.oy, d = hyp(dx, dy);
      const mag = d < 6 ? 0 : clamp((d - 6) / (PAD_R - 6), 0, 1);
      const top = PAD_MAX * h.s.ram * (h.slow > 0 ? 0.55 : 1);
      const tvx = d ? dx / d * mag * top : 0, tvy = d ? -dy / d * mag * top : 0;
      const k = 1 - Math.exp(-dt * 25);   // snappy like a joystick (bounces come from the recoil above)
      h.vx = lerp(h.vx, tvx, k); h.vy = lerp(h.vy, tvy, k);
    } else {
      const f = Math.exp(-dt * 5); h.vx *= f; h.vy *= f;
    }
    const sp = hyp(h.vx, h.vy);
    if (sp > maxS) { h.vx *= maxS / sp; h.vy *= maxS / sp; }
    h.x += h.vx * dt; h.y += h.vy * dt;
    if (sp > 30) h.face = Math.atan2(h.vy, h.vx);
    h.walk = (h.walk || 0) + sp * dt;   // drives the walk cycle of the sprite
    if (h.inv > 0) h.inv -= dt;
    if (h.itemCD > 0) { h.itemCD -= dt; if (h.itemCD <= 0) { h.itemCD = 0; updateHudButtons(); } else itemCdShow(h.itemCD); }
    if (h.ramSafe > 0) h.ramSafe -= dt;
    if (h.slow > 0) h.slow -= dt;
    if (h.buff.atk > 0) h.buff.atk -= dt; if (h.buff.def > 0) h.buff.def -= dt;
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
        return true;
      }
      return false;
    }
    let hit = false;
    const tn = tunnelAt(o.y), L = tn.cx - tn.w / 2 + o.r, Rr = tn.cx + tn.w / 2 - o.r;
    if (o.x < L) { o.x = L; if (o.vx < 0) o.vx = -o.vx * e; hit = true; }
    if (o.x > Rr) { o.x = Rr; if (o.vx > 0) o.vx = -o.vx * e; hit = true; }
    if (o.y < o.r + 4) { o.y = o.r + 4; if (o.vy < 0) o.vy = -o.vy * e; hit = true; }
    const top = goalY + 40;
    if (o !== hero && o.y > goalY - 40) { o.y = goalY - 40; if (o.vy > 0) o.vy = -o.vy * e; }
    if (o === hero && o.y > top) o.y = top;
    return hit;
  }

  // hero vs a body. returns 'ram' | 'bump' | null
  function collide(o, mass) {
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
      const e = 0.55;
      h.vx -= (1 + e) * rel * nx * wH * 1.6; h.vy -= (1 + e) * rel * ny * wH * 1.6;
      const outV = h.vx * -nx + h.vy * -ny;
      if (outV < 160) { h.vx += -nx * (160 - outV); h.vy += -ny * (160 - outV); }
      if (mass < 50 && o.vx != null) { o.vx += nx * imp * 0.9 / Math.max(0.5, mass); o.vy += ny * imp * 0.9 / Math.max(0.5, mass); }
      // only the hero's OWN speed into the target counts as an attack (a charging enemy can't hurt itself)
      const ram = heroIn >= RAM_MIN;
      if (ram) { h.recoil = 0.2; h.ramSafe = 0.5; }
      return { kind: ram ? 'ram' : 'bump', imp: heroIn, nx, ny };
    }
    return { kind: 'bump', imp: 0, nx, ny };
  }

  function ramDamage(target, imp) {
    const s = hero.s, k = Math.min(imp / (PAD_MAX * s.ram), 1.5);
    let dmg = s.atk * (0.8 + 1.0 * k) * rnd(0.9, 1.1) - target.def * 0.5;
    const crit = imp > PAD_MAX * s.ram * 0.88 && Math.random() < 0.35;   // full-tilt charges can land かいしん
    if (crit) dmg *= 1.5;
    if (hero.buff.atk > 0) dmg *= 1.5;
    return { dmg: Math.max(1, Math.round(dmg)), crit };
  }

  function hitEnemy(e, res) {
    if (e.hitCD > 0) return;
    if (e.ai === 'phase' && e.alpha < 0.5) return;
    // knight's shield blocks hits from the front
    if (e.ai === 'guard' && e.guard) {
      const fx2 = Math.cos(e.face), fy2 = Math.sin(e.face);
      if (-res.nx * fx2 + -res.ny * fy2 > 0.45) {
        e.hitCD = 0.25; popText(e.x, e.y + 22, 'ガード！', '#9fd0ff', 14, 0.7);
        A.sfx('block'); burst(e.x - res.nx * e.r, e.y - res.ny * e.r, 10, '#9fd0ff', 150);
        return;
      }
    }
    const { dmg, crit } = ramDamage(e, res.imp);
    e.hp -= dmg; e.hurt = 0.18; e.hitCD = 0.12;
    if (e.st === 'wind' || e.st === 'aim') { e.st = 'idle'; e.cd = 0.6; }   // a hit interrupts the attack
    combo++; comboT = 1.6;
    popText(e.x, e.y + 20, (crit ? 'かいしん！ ' : '') + dmg, crit ? '#f2c14e' : '#fff', crit ? 22 : 17, 0.8);
    burst(e.x - res.nx * e.r, e.y - res.ny * e.r, crit ? 22 : 12, crit ? '#f2c14e' : '#fff', crit ? 330 : 220, 0.45);
    anims.push({ kind: 'spark', x: e.x - res.nx * e.r, y: e.y - res.ny * e.r, t: 0, dur: 0.24, frames: 4, big: crit });
    hitStop = Math.max(hitStop, crit ? 0.1 : 0.05); shake = Math.max(shake, crit ? 12 : 6);
    A.sfx(crit ? 'crit' : 'hit');
    if (e.hp <= 0) killEnemy(e);
  }

  function killEnemy(e) {
    e.hp = 0; e.dead = true; runKills++; save.kills++;
    anims.push({ kind: 'poof', x: e.x, y: e.y, t: 0, dur: 0.4, frames: 5 });
    burst(e.x, e.y, 24, e.col, 260, 0.7);
    gainExp(e.exp);
    popText(e.x, e.y + 36, `+${e.exp} EXP`, '#9fd0ff', 12, 0.9);
    dropCoins(e.x, e.y, e.gold);
    if (Math.random() < 0.06) drops.push({ type: 'herb', x: e.x, y: e.y, vx: 0, vy: 0, t: 0 });
    A.sfx('kill');
  }

  function updateEnemies(dt) {
    const h = hero;
    for (const e of enemies) {
      if (e.dead) continue;
      if (!e.active) { if (Math.abs(e.y - h.y) < H * 0.62) e.active = true; else continue; }
      e.t += dt; if (e.hurt > 0) e.hurt -= dt; if (e.hitCD > 0) e.hitCD -= dt;
      const dx = h.x - e.x, dy = h.y - e.y, d = hyp(dx, dy) || 1, ux = dx / d, uy = dy / d;
      let want = 0, wx = 0, wy = 0;   // desired movement
      e.cd -= dt;
      switch (e.ai) {
        case 'hop':
          if (e.st === 'hop') { if (e.t > 0.38) { e.st = 'idle'; e.cd = rnd(0.7, 1.3); } }
          else if (e.cd <= 0 && d < 240) { e.st = 'hop'; e.t = 0; e.vx = ux * 230 + rnd(-30, 30); e.vy = uy * 230 + rnd(-30, 30); }
          else { want = 0.3; wx = Math.cos(e.phase + e.t * 0.7); wy = Math.sin(e.phase + e.t * 0.9); }
          break;
        case 'flutter': case 'imp': {
          const wob = Math.sin(e.t * 6 + e.phase);
          if (e.st === 'retreat') { want = 1; wx = -ux; wy = -uy; if (e.t > 0.6) { e.st = 'idle'; e.t = 0; } }
          else { want = 1; wx = ux - uy * wob * 0.9; wy = uy + ux * wob * 0.9; }
          if (e.ai === 'imp' && e.cd <= 0 && d < 300) { e.cd = rnd(1.6, 2.2); shoot(e.x, e.y, ux, uy, 180, e.atk, 'fire'); }
          break;
        }
        case 'lunge':
          if (e.st === 'wind') { want = 0; if (e.t > e.windT) { e.st = 'dash'; e.t = 0; e.vx = e.lx * e.dashSpd; e.vy = e.ly * e.dashSpd; } }
          else if (e.st === 'dash') { if (e.t > 0.32) { e.st = 'idle'; e.cd = rnd(1, 1.5); } }
          else { want = d > 90 ? 1 : 0.2; wx = ux; wy = uy; if (d < 135 && e.cd <= 0) { e.st = 'wind'; e.t = 0; e.lx = ux; e.ly = uy; } }
          break;
        case 'shooter':
          if (e.st === 'aim') { want = 0; e.face = Math.atan2(dy, dx); if (e.t > 0.55) { e.st = 'idle'; e.cd = rnd(1.8, 2.4); shoot(e.x, e.y, ux, uy, 260, e.atk, 'arrow'); } }
          else { want = 0.8; const s2 = d < 130 ? -1 : d > 210 ? 1 : 0; wx = ux * s2 + -uy * 0.4 * Math.sin(e.t); wy = uy * s2 + ux * 0.4 * Math.sin(e.t); if (e.cd <= 0 && d < 320) { e.st = 'aim'; e.t = 0; } }
          break;
        case 'swing':
          if (e.st === 'wind') { want = 0; if (e.t > 0.5) { e.st = 'slash'; e.t = 0; } }
          else if (e.st === 'slash') {
            if (e.t < 0.2) { const ang = Math.atan2(dy, dx), da = Math.abs(((ang - e.face + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (d < 72 + h.r && da < 1.25) hurtHero(e.atk, e.x, e.y, 360, 'slash'); }
            else { e.st = 'idle'; e.cd = rnd(1, 1.4); }
          } else { want = d > 58 ? 1 : 0; wx = ux; wy = uy; e.face = Math.atan2(dy, dx); if (d < 84 && e.cd <= 0) { e.st = 'wind'; e.t = 0; } }
          break;
        case 'phase': {
          const cyc = (e.t + e.phase) % 4; e.alpha = cyc < 2.8 ? Math.min(1, (e.alpha || 0) + dt * 3) : Math.max(0.12, e.alpha - dt * 3);
          want = 0.6; wx = ux + Math.sin(e.t * 2) * 0.5; wy = uy;
          if (e.alpha > 0.8 && e.cd <= 0 && d < 300) { e.cd = rnd(2.2, 2.8); shoot(e.x, e.y, ux, uy, 120, e.atk, 'orb'); }
          break;
        }
        case 'caster':
          if (e.st === 'cast') {
            if (e.t > 0.6) {
              e.st = 'idle'; e.cd = rnd(2.2, 2.8); e.casts = (e.casts || 0) + 1;
              const a0 = Math.atan2(dy, dx); for (const o of [-0.3, 0, 0.3]) shoot(e.x, e.y, Math.cos(a0 + o), Math.sin(a0 + o), 170, e.atk, 'fire');
              if (e.casts % 3 === 0) blink(e);
            }
          } else if (e.cd <= 0 && d < 330) { e.st = 'cast'; e.t = 0; }
          if (d < 70 && e.st !== 'cast' && e.cd > 0.5) { blink(e); e.cd = 1; }
          break;
        case 'breath':
          if (e.st === 'wind') { want = 0; e.face = Math.atan2(dy, dx); if (e.t > 0.42) { e.st = 'fire'; e.t = 0; } }
          else if (e.st === 'fire') {
            if (e.t < 0.65) { e.fireAcc = (e.fireAcc || 0) + dt; while (e.fireAcc > 0.045) { e.fireAcc -= 0.045; const a = e.face + rnd(-0.32, 0.32); shoot(e.x + Math.cos(e.face) * e.r, e.y + Math.sin(e.face) * e.r, Math.cos(a), Math.sin(a), 210, e.atk, 'flame', 0.55); } }
            else { e.st = 'idle'; e.cd = rnd(1.4, 1.9); }
          } else { want = d > 110 ? 1 : 0.2; wx = ux; wy = uy; e.face = Math.atan2(dy, dx); if (d < 170 && e.cd <= 0) { e.st = 'wind'; e.t = 0; } }
          break;
        case 'slam':
          if (e.st === 'wind') { want = 0; if (e.t > 0.7) { e.st = 'idle'; e.cd = rnd(1.8, 2.4); rings.push({ x: e.x, y: e.y, r: e.r, max: 100, spd: 280, dmg: e.atk, w: 12 }); shake = Math.max(shake, 10); A.sfx('quake'); } }
          else { want = 1; wx = ux; wy = uy; if (d < 100 && e.cd <= 0) { e.st = 'wind'; e.t = 0; } }
          break;
        case 'spore':   // swells up, then puffs a ring of slow spores
          if (e.st === 'swell') { want = 0; if (e.t > 0.55) { e.st = 'idle'; e.cd = rnd(2.4, 3.2); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + e.phase; shoot(e.x, e.y, Math.cos(a), Math.sin(a), 85, e.atk, 'spore', 2.4); } } }
          else { want = 0.4; wx = ux + Math.sin(e.t + e.phase); wy = uy; if (e.cd <= 0 && d < 260) { e.st = 'swell'; e.t = 0; } }
          break;
        case 'shamble': // mummy: keeps walking at you, flings bandages that slow you down
          want = 1; wx = ux; wy = uy;
          if (e.cd <= 0 && d < 240 && d > 70) { e.cd = rnd(2.6, 3.4); shoot(e.x, e.y, ux, uy, 200, Math.round(e.atk * 0.6), 'web', 2.5); }
          break;
        case 'web':     // keeps its distance and spits webs that slow you down
          if (e.st === 'aim') { want = 0; e.face = Math.atan2(dy, dx); if (e.t > 0.45) { e.st = 'idle'; e.cd = rnd(2, 2.6); shoot(e.x, e.y, ux, uy, 230, Math.round(e.atk * 0.6), 'web', 3); } }
          else { want = 0.9; const s2 = d < 140 ? -1 : d > 230 ? 1 : 0; wx = ux * s2 - uy * 0.7 * Math.sin(e.t * 1.3 + e.phase); wy = uy * s2 + ux * 0.7 * Math.sin(e.t * 1.3 + e.phase); if (e.cd <= 0 && d < 330) { e.st = 'aim'; e.t = 0; } }
          break;
        case 'guard': {
          // shield faces the hero (turns slowly) -> go around it!
          const ta = Math.atan2(dy, dx); let da = ((ta - e.face + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          if (e.st !== 'dash') e.face += clamp(da, -2.4 * dt, 2.4 * dt);
          if (e.st === 'wind') { want = 0; e.guard = false; if (e.t > 0.45) { e.st = 'dash'; e.t = 0; e.vx = Math.cos(e.face) * 380; e.vy = Math.sin(e.face) * 380; } }
          else if (e.st === 'dash') { e.guard = false; if (e.t > 0.3) { e.st = 'tired'; e.t = 0; } }
          else if (e.st === 'tired') { e.guard = false; want = 0; if (e.t > 0.9) { e.st = 'idle'; e.guard = true; e.cd = rnd(1.4, 2); } }
          else { e.guard = true; want = d > 100 ? 0.8 : 0.1; wx = ux; wy = uy; if (d < 140 && e.cd <= 0) { e.st = 'wind'; e.t = 0; } }
          break;
        }
      }
      if (want > 0 && e.spd > 0) {
        const l = hyp(wx, wy) || 1, ts = e.spd * want;
        e.vx = lerp(e.vx, wx / l * ts, 1 - Math.exp(-dt * 4)); e.vy = lerp(e.vy, wy / l * ts, 1 - Math.exp(-dt * 4));
      } else { const f = Math.exp(-dt * (e.st === 'dash' || e.st === 'hop' ? 0.8 : 5)); e.vx *= f; e.vy *= f; }
      // knockback speed limit
      const sp = hyp(e.vx, e.vy); if (sp > 520) { e.vx *= 520 / sp; e.vy *= 520 / sp; }
      e.x += e.vx * dt; e.y += e.vy * dt;
      confine(e, 0.6);
      if (!['guard', 'swing', 'breath', 'shooter', 'web'].includes(e.ai)) { if (sp > 20) e.face = Math.atan2(e.vy, e.vx); }
      // hero contact
      if (e.ai === 'phase' && e.alpha < 0.5) continue;
      const res = collide(e, e.mass);
      if (res) {
        if (res.kind === 'ram') hitEnemy(e, res);
        else if (e.hitCD <= 0 && h.ramSafe <= 0) { hurtHero(e.atk, e.x, e.y, 260, 'touch:' + e.type); if (e.ai === 'flutter' || e.ai === 'imp') { e.st = 'retreat'; e.t = 0; } }
      }
    }
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

  function blink(e) {
    for (let k = 0; k < 10; k++) {
      let x, y;
      if (state === 'boss') { const a = rnd(0, 6.28), r = rnd(0.3, 0.8) * arena.R; x = arena.cx + Math.cos(a) * r; y = arena.cy + Math.sin(a) * r; }
      else { y = e.y + rnd(-120, 120); const tn = tunnelAt(y); x = tn.cx + rnd(-0.35, 0.35) * tn.w; }
      if (hyp(x - hero.x, y - hero.y) > 120) { burst(e.x, e.y, 12, '#b48cff', 120); e.x = x; e.y = y; e.vx = e.vy = 0; burst(x, y, 12, '#b48cff', 120); return; }
    }
  }

  function shoot(x, y, ux, uy, spd, dmg, kind, life = 4) {
    bullets.push({ x, y, vx: ux * spd, vy: uy * spd, r: ({ orb: 8, flame: 7, big: 14, rock: 9, spore: 8, web: 9, homing: 9 })[kind] || 6, dmg, kind, life, t: 0 });
  }

  function updateBullets(dt) {
    for (const b of bullets) {
      b.t += dt; b.life -= dt;
      if (b.kind === 'big' && b.t > (b.fuse || 1.1)) { b.life = 0; explodeBig(b); continue; }
      if (b.kind === 'homing' && b.t < 3.2) {   // turn toward the hero at a limited rate
        const cur = Math.atan2(b.vy, b.vx), want = Math.atan2(hero.y - b.y, hero.x - b.x);
        let da = ((want - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI; da = clamp(da, -2.1 * dt, 2.1 * dt);
        const sp2 = hyp(b.vx, b.vy); b.vx = Math.cos(cur + da) * sp2; b.vy = Math.sin(cur + da) * sp2;
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.kind === 'flame') { b.vx *= 0.985; b.vy *= 0.985; }
      if (state === 'boss') { if (hyp(b.x - arena.cx, b.y - arena.cy) > arena.R + 30) { if (b.kind === 'big') explodeBig(b); b.life = 0; } }
      else { const tn = tunnelAt(b.y); if (Math.abs(b.x - tn.cx) > tn.w / 2 + 4) { b.life = 0; burst(b.x, b.y, 4, '#ccc', 60, 0.3); } }
      if (hyp(b.x - hero.x, b.y - hero.y) < b.r + hero.r * 0.6 && hero.inv <= 0) {
        if (b.kind === 'web') { hero.slow = 1.8; popText(hero.x, hero.y + 30, 'クモの糸！', '#dfe8ff', 13, 0.9); }
        hurtHero(b.dmg, b.x - b.vx * 0.05, b.y - b.vy * 0.05, 220, 'shot:' + b.kind); b.life = 0;
      }
    }
    bullets = bullets.filter(b => b.life > 0);
    for (const r of rings) {
      r.r += r.spd * dt;
      const d = hyp(hero.x - r.x, hero.y - r.y);
      if (!r.hit && Math.abs(d - r.r) < r.w + hero.r * 0.5) { r.hit = true; hurtHero(r.dmg, r.x, r.y, 380, 'ring'); }
    }
    rings = rings.filter(r => r.r < r.max);
  }
  function explodeBig(b) {
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; shoot(b.x, b.y, Math.cos(a), Math.sin(a), 150, b.dmg, 'fire', 2.5); }
    burst(b.x, b.y, 24, '#ff8a3a', 240); shake = Math.max(shake, 8); A.sfx('boom');
  }

  function updateProps(dt) {
    const h = hero;
    for (const p of props) {
      if (Math.abs(p.y - h.y) > H) continue;
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
            p.open = true; A.sfx('chest'); burst(p.x, p.y, 26, '#f2c14e', 260);
            const roll = Math.random();
            if (roll < 0.4) { drops.push({ type: 'potion', x: p.x, y: p.y + 10, vx: 0, vy: 60, t: 0 }); popText(p.x, p.y + 30, 'ポーション！', '#6fd38a', 15, 1.2); }
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
        if (p.state === 2 && Math.abs(h.x - p.x) < p.w / 2 + h.r * 0.3 && Math.abs(h.y - p.y) < p.h / 2 + h.r * 0.3) hurtHero(Math.round(6 * D.a), h.x, h.y - 30, 200, 'spike');
      }
    }
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
        if (d.type === 'gold') { gainGold(d.val); A.sfx('coin', Math.min(14, combo)); }
        else { if (save.items[d.type] < ITEM_MAX) save.items[d.type]++; popText(hero.x, hero.y + 30, ITEMS[d.type].name + ' をてにいれた', '#6fd38a', 12, 1); A.sfx('item'); updateHudButtons(); }
      }
    }
    drops = drops.filter(d => !d.got);
  }

  // ---------------------------------------------------------------
  //  BOSS AI
  // ---------------------------------------------------------------
  function bossUpdate(dt) {
    const B = boss, h = hero;
    if (B.dead) {
      const was = B.dead; B.dead += dt;
      for (const k of [0.15, 0.3, 0.45, 0.6]) if (was < k && B.dead >= k) { burst(B.x + rnd(-30, 30), B.y + rnd(-30, 30), 40, pick([B.col, '#fff', '#f2c14e']), 380, 1); shake = 16; }
      if (was < 1.2 && B.dead >= 1.2) showClear();
      return;
    }
    if (B.intro > 0) { B.intro -= dt; if (B.intro <= 0) minionWave(B, 2); return; }
    if (B.hurt > 0) B.hurt -= dt; if (B.hitCD > 0) B.hitCD -= dt;
    const dx = h.x - B.x, dy = h.y - B.y, ang = Math.atan2(dy, dx);
    const sp = B.phase === 2 ? (B.rage || 1.3) : 1;
    if (B.phase === 1 && B.hp < B.maxHp * 0.5) {
      B.phase = 2; banner = { a: 'いかりの オーラが ふくれあがる！', b: 'PHASE 2', t: 1.8, boss: true };
      flash = 0.6; flashCol = '255,60,60'; shake = 16; if (audioOn) FMusic.setRage(true); A.sfx('roar');
      minionWave(B, 3);
    }
    // reinforcements keep coming
    B.waveT -= dt;
    if (B.waveT <= 0) { B.waveT = B.phase === 2 ? 6.5 : 9; minionWave(B, B.phase === 2 ? 3 : 2); }
    // home drift (back to its spot unless it is charging / jumping / walking)
    if (B.homeT > 0) B.homeT -= dt; else { B.hx = arena.cx; B.hy = arena.cy + 20; }
    const mvn = B.mv ? B.mv.name : '';
    if (!['charge', 'jump', 'dash3', 'stalk'].includes(mvn)) {
      const hx = B.hx + Math.sin(globalT * 0.7) * 16, hy = B.hy + Math.cos(globalT * 0.9) * 10;
      B.x = lerp(B.x, hx, 1 - Math.exp(-dt * 2.2)); B.y = lerp(B.y, hy, 1 - Math.exp(-dt * 2.2));
    }
    if (!B.mv) {
      B.cd -= dt * sp;
      if (B.cd <= 0) {
        const list = B.phase === 2 ? B.moves2 : B.moves;
        let m; do { m = pick(list); } while (m === B.last && list.length > 1);
        B.last = m; B.mv = { name: m, t: 0, a0: ang, n: 0, acc: 0 }; B.mt = 0;
      }
    } else runMove(B, dt * sp, ang, sp);
    // sweeping weapons
    for (const s of B.sweeps) {
      s.t += dt * sp;
      if (s.t < s.tele) continue;
      s.ang += s.vel * dt * sp; s.left -= Math.abs(s.vel * dt * sp);
      const ex = B.x + Math.cos(s.ang) * s.len, ey = B.y + Math.sin(s.ang) * s.len;
      const dd = segDist(h.x, h.y, B.x + Math.cos(s.ang) * B.r * 0.6, B.y + Math.sin(s.ang) * B.r * 0.6, ex, ey);
      if (dd < s.w + h.r * 0.7) hurtHero(B.atk * 0.9, B.x, B.y, 420, 'sweep');
    }
    B.sweeps = B.sweeps.filter(s => s.left > 0);
    // ram / contact
    if (B.alpha != null && B.alpha < 0.5) return;   // mid-teleport: can't touch it
    const res = collide(B, 999);
    if (res) {
      if (res.kind === 'ram' && B.hitCD <= 0) {
        const { dmg, crit } = ramDamage(B, res.imp);
        B.hp -= dmg; B.hurt = 0.15; B.hitCD = 0.2; combo++; comboT = 2.2;
        popText(B.x + rnd(-14, 14), B.y + B.r + 10, (crit ? 'かいしん！ ' : '') + dmg, crit ? '#f2c14e' : '#fff', crit ? 26 : 20, 0.9);
        burst(B.x - res.nx * B.r, B.y - res.ny * B.r, crit ? 28 : 14, crit ? '#f2c14e' : '#fff', crit ? 360 : 240, 0.5);
        anims.push({ kind: 'spark', x: B.x - res.nx * B.r, y: B.y - res.ny * B.r, t: 0, dur: 0.28, frames: 4, big: true });
        hitStop = Math.max(hitStop, crit ? 0.12 : 0.06); shake = Math.max(shake, crit ? 16 : 10);
        // big recoil: the hero is flung far back and has to come in again
        h.vx = -res.nx * 640; h.vy = -res.ny * 640; h.recoil = 0.45; h.ramSafe = 0.75;
        A.sfx(crit ? 'crit' : 'bosshit');
        if (B.hp <= 0) { B.hp = 0; bossDefeated(); }
      } else if (res.kind === 'bump' && h.ramSafe <= 0) hurtHero(B.atk * 0.7, B.x, B.y, 380, 'boss');
    }
  }
  // minions from this dungeon join the fight (capped so the room never floods)
  function minionWave(B, n) {
    const cap = B.phase === 2 ? 5 : 3;
    const alive = enemies.filter(e => !e.dead).length;
    for (let i = 0; i < Math.min(n, cap - alive); i++) {
      let x, y;
      for (let k = 0; k < 12; k++) { const a = rnd(0, 6.28); x = arena.cx + Math.cos(a) * arena.R * 0.82; y = arena.cy + Math.sin(a) * arena.R * 0.82; if (hyp(x - hero.x, y - hero.y) > 200) break; }
      const e = spawnEnemy(wpick(D.pool), x, y, true);
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
  const ZCOL = { sand: '235,200,120', ink: '140,70,190', void: '200,80,255', thorn: '120,210,80', curse: '190,140,255', meteor: '255,120,50', ice: '150,225,255', bolt: '255,240,120', poison: '150,230,60', water: '90,170,255', mine: '255,90,60', beam: '255,80,160' };
  function addCircle(x, y, r, tele, dmg, kind, after) { zones.push({ type: 'circle', x, y, r, tele, dmg, kind, t: 0, after }); }
  function addBeam(B, ang, opt) { zones.push(Object.assign({ type: 'beam', boss: B, ang, len: arena.R * 2.2, w: 16, tele: 0.8, act: 0.45, vel: 0, t: 0, dmg: B.atk, kind: 'beam', hit: false }, opt)); }
  function updateZones(dt) {
    const h = hero;
    for (const z of zones) {
      z.t += dt;
      if (z.type === 'circle') {
        if (!z.fired && z.t >= z.tele) {
          z.fired = true;
          if (hyp(h.x - z.x, h.y - z.y) < z.r + h.r * 0.4) hurtHero(z.dmg, z.x, z.y, 360, 'zone:' + z.kind);
          burst(z.x, z.y, 18, `rgb(${ZCOL[z.kind]})`, 260, 0.5); shake = Math.max(shake, 5);
          if (z.after) z.after(z);
        }
        z.dead = z.t > z.tele + 0.3;
      } else {
        if (z.boss) { z.x = z.boss.x; z.y = z.boss.y; }
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

  function runMove(B, dt, ang, sp) {
    const mv = B.mv; mv.t += dt;
    const done = cd => { B.mv = null; B.cd = cd; B.tele = null; };
    const name = mv.name.split(':')[0], arg = mv.name.split(':')[1];
    const bc = B.col, p2 = B.phase === 2;
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
          for (let i = 0; i < n; i++) { const a = ang + (i - (n - 1) / 2) * 0.22; shoot(B.x, B.y, Math.cos(a), Math.sin(a), name === 'rocks' ? 220 : 240, B.atk, name === 'rocks' ? 'rock' : 'fire'); }
          A.sfx('magic');
        }
        if (mv.t > 0.6 + waves * 0.45) done(1.1);
        break;
      }
      case 'spiral': case 'spiral3': {
        const arms = name === 'spiral3' ? 3 : 2, dur = 2.6;
        if (mv.t > 0.4 && mv.t < 0.4 + dur) {
          mv.acc += dt;
          while (mv.acc > 0.1) { mv.acc -= 0.1; mv.n++; for (let k = 0; k < arms; k++) { const a = mv.a0 + mv.n * 0.32 + k * Math.PI * 2 / arms; shoot(B.x, B.y, Math.cos(a), Math.sin(a), 135, B.atk, 'orb', 3.5); } }
        }
        if (mv.t > dur + 0.8) done(1.2);
        break;
      }
      case 'wave': {   // three wobbling streams
        if (mv.t > 0.4 && mv.t < 2.2) {
          mv.acc += dt;
          while (mv.acc > 0.09) { mv.acc -= 0.09; mv.n++; const w = Math.sin(mv.n * 0.55) * 0.38; for (const o of [-0.7, 0, 0.7]) { const a = mv.a0 + o + w; shoot(B.x, B.y, Math.cos(a), Math.sin(a), 175, B.atk, 'orb', 3.5); } }
        }
        if (mv.t > 2.6) done(1.2);
        break;
      }
      case 'homing':   // slow seekers that curve after the hero
        if (mv.t > 0.5 && !mv.n) {
          mv.n = 1; const n = p2 ? 7 : 5;
          for (let i = 0; i < n; i++) { const a = ang + Math.PI + (i - (n - 1) / 2) * 0.5; const b = { x: B.x, y: B.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, r: 9, dmg: B.atk, kind: 'homing', life: 4.6, t: 0 }; bullets.push(b); }
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
        if (!mv.n) { mv.n = 1; for (const o of name === 'laser3' ? [-0.38, 0, 0.38] : [0]) addBeam(B, ang + o, { tele: 0.85, act: 0.5, w: 15, boss: B }); }
        if (mv.t > 1.6) done(1.1);
        break;
      case 'cross': {  // four beams that slowly rotate: walk around with them
        if (!mv.n) { mv.n = 1; const v = (Math.random() < 0.5 ? 1 : -1) * (p2 ? 0.7 : 0.55); for (let k = 0; k < 4; k++) addBeam(B, mv.a0 + Math.PI / 4 + k * Math.PI / 2, { tele: 1.0, act: 2.8, w: 12, vel: v, boss: B }); }
        if (mv.t > 4) done(1.2);
        break;
      }
      case 'sweep':   // club / sword swung all the way round
        if (!mv.n) { mv.n = 1; addSweep(B, { ang: ang + Math.PI * 0.75, vel: (Math.random() < 0.5 ? 1 : -1) * 2.5, len: 170, w: 13, left: Math.PI * 1.7, col: B.wcol || '#c99a5a', kind: 'club' }); }
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
          while (mv.acc > 0.05) { mv.acc -= 0.05; for (const o of [-0.85, 0, 0.85]) { const aa = a + o + rnd(-0.1, 0.1); shoot(B.x + Math.cos(aa) * B.r, B.y + Math.sin(aa) * B.r, Math.cos(aa), Math.sin(aa), 270, B.atk, 'flame', 1.1); } }
        } else done(1.1);
        break;
      }
      case 'scythe':
        if (!mv.n) { mv.n = 1; addSweep(B, { ang: ang + Math.PI, vel: 2.8, len: 190, w: 10, left: Math.PI * 2.3, col: '#d8c8ff', kind: 'scythe' }); }
        if (mv.t > 2.8) done(1.1);
        break;
      case 'tail':
        if (!mv.n) { mv.n = 1; addSweep(B, { ang: ang + Math.PI, vel: (Math.random() < 0.5 ? 1 : -1) * 3.1, len: 175, w: 14, left: Math.PI * 2, col: B.wcol || '#ff8a4a', kind: 'tail' }); }
        if (mv.t > 2.6) done(1.1);
        break;
      case 'twin':
        if (!mv.n) { mv.n = 1; const v = (Math.random() < 0.5 ? 1 : -1) * 2.2; for (const o of [0, Math.PI]) addSweep(B, { ang: ang + o, vel: v, len: 200, w: 10, left: Math.PI * 2, col: B.wcol || '#ff5aa0', kind: 'blade' }); }
        if (mv.t > 3.6) done(1.1);
        break;
      case 'charge': case 'dash3': {   // rush to the wall (dash3 = three times in a row)
        const total = name === 'dash3' ? 3 : 1;
        if (mv.ph == null) { mv.ph = 'aim'; mv.pt = 0; mv.k = 0; }
        mv.pt += dt;
        if (mv.ph === 'aim') { mv.a0 = Math.atan2(hero.y - B.y, hero.x - B.x); B.tele = mv.a0; if (mv.pt > (mv.k ? 0.42 : 0.7)) { mv.ph = 'go'; mv.pt = 0; B.tele = null; B.vx = Math.cos(mv.a0) * 520; B.vy = Math.sin(mv.a0) * 520; A.sfx('magic'); } }
        else if (mv.ph === 'go') {
          B.x += B.vx * dt; B.y += B.vy * dt;
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
          while (mv.acc > 0.035) { mv.acc -= 0.035; const aa = a + rnd(-0.12, 0.12); shoot(B.x + Math.cos(aa) * B.r, B.y + Math.sin(aa) * B.r, Math.cos(aa), Math.sin(aa), 280, B.atk, 'flame', 1.2); }
        } else done(1.1);
        break;
      case 'fireball':
        if (mv.t > 0.5 && mv.n < (p2 ? 3 : 2) && mv.t > 0.5 + mv.n * 0.4) { mv.n++; const a = Math.atan2(hero.y - B.y, hero.x - B.x); bullets.push({ x: B.x, y: B.y, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, r: 14, dmg: B.atk, kind: 'big', life: 5, t: 0, fuse: 1.2 }); A.sfx('magic'); }
        if (mv.t > 1.8) done(1.1);
        break;
      case 'summon':
        if (!mv.n) { mv.n = 1; minionWave(B, 2); }
        if (mv.t > 1) done(1.2);
        break;
      default: done(1);
    }
  }

  // ---------------------------------------------------------------
  //  MAIN UPDATE
  // ---------------------------------------------------------------
  function update(dt) {
    globalT += dt;
    if (audioOn) for (const e of FMusic.pollEvents()) if (e.type === 'beat') beatPulse = 1;
    beatPulse = Math.max(0, beatPulse - dt * 4);
    if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
    if (transition) { transition.t += dt; if (transition.t >= transition.mid && !transition.done) { transition.done = true; transition.fn(); } if (transition.t >= transition.mid * 2) transition = null; }
    for (const p of fx) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; p.life -= dt; }
    fx = fx.filter(p => p.life > 0);
    for (const a of anims) a.t += dt;
    anims = anims.filter(a => a.t < a.dur);
    for (const s of texts) { s.y += 30 * dt; s.life -= dt; }
    texts = texts.filter(s => s.life > 0);
    if (flash > 0) flash = Math.max(0, flash - dt * 2.5);
    if (shake > 0) shake = Math.max(0, shake - dt * 40);
    if (state === 'town' && tdrag.id == null) townX = lerp(townX, townPage, 1 - Math.exp(-dt * 12));
    if (state !== 'play' && state !== 'boss') return;
    if (paused) return;
    if (hitStop > 0) { hitStop -= dt; return; }
    if (slowMo > 0) { slowMo -= dt; dt *= 0.3; }
    t += dt;
    if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }
    if (hint > 0) hint -= dt;
    if (deathT > 0) { deathT -= dt / Math.max(0.3, slowMo > 0 ? 0.3 : 1); if (deathT <= 0) { showDefeat(); return; } }
    if (hero.hp > 0) updateHero(dt);
    updateEnemies(dt);
    updateBullets(dt);
    if (state === 'play') {
      updateProps(dt);
      camY = lerp(camY, Math.max(hero.y + 40, H * 0.38 - 30), 1 - Math.exp(-dt * 6));
      camY = Math.min(camY, goalY + 60 - (H * 0.38) + 60);
      // boss door
      if (hero.y > goalY + 10 && !transition) { hero.vx = hero.vy = 0; transition = { t: 0, mid: 0.5, fn: enterBossRoom }; A.sfx('door'); }
    } else {
      updateProps(dt);
      updateZones(dt);
      if (boss) bossUpdate(dt);
      // camera follows the hero, kept inside the room
      const kx = arena.R + 30 - W / 2, ky = arena.R + 30 - H * 0.5;
      const tx = clamp(hero.x, arena.cx - kx, arena.cx + kx), ty = ky > 0 ? clamp(hero.y, arena.cy - ky, arena.cy + ky) : arena.cy;
      bcamX = lerp(bcamX, tx, 1 - Math.exp(-dt * 6)); bcamY = lerp(bcamY, ty, 1 - Math.exp(-dt * 6));
    }
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
    patShift(wallPat, 0, sy(0) % 24); ctx.fillStyle = wallPat; ctx.fillRect(0, 0, W, H);
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
    if (sy(0) < H + 40) { ctx.fillStyle = wallPat; ctx.fillRect(0, q(sy(0)), W, H); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(0, q(sy(0)), W, 4.5); }
    // boss door (pixel arch)
    const dy = q(sy(goalY + 20));
    if (dy > -80 && dy < H + 80) {
      ctx.fillStyle = wallPat; ctx.fillRect(0, dy - 400, W, 400);
      const dw = 138, dx = q(W / 2 - dw / 2);
      ctx.fillStyle = '#c9a24a'; ctx.fillRect(dx - 6, dy - 72, dw + 12, 72); ctx.fillRect(dx + 9, dy - 84, dw - 18, 12); ctx.fillRect(dx + 30, dy - 93, dw - 60, 9);
      ctx.fillStyle = '#7a5a20'; ctx.fillRect(dx - 6, dy - 3, dw + 12, 3);
      ctx.fillStyle = '#1a0f12'; ctx.fillRect(dx, dy - 66, dw, 66); ctx.fillRect(dx + 12, dy - 78, dw - 24, 12); ctx.fillRect(dx + 33, dy - 87, dw - 66, 9);
      ctx.fillStyle = '#3a2428'; for (let i = 0; i < 6; i++) ctx.fillRect(dx + 6 + i * 22.5, dy - 63, 3, 63);
      ctx.fillStyle = '#c9a24a'; ctx.fillRect(q(W / 2) - 1.5, dy - 87, 3, 87); ctx.fillRect(q(W / 2) - 9, dy - 36, 6, 6); ctx.fillRect(q(W / 2) + 3, dy - 36, 6, 6);
      const glow = 0.5 + 0.5 * Math.sin(globalT * 3);
      ctx.fillStyle = `rgba(255,60,60,${0.25 + glow * 0.3})`; ctx.fillRect(dx + 6, dy - 3, dw - 12, 3);
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
  function drawProps() {
    for (const p of props) {
      const y = sy(p.y);
      if (y < -60 || y > H + 60) continue;
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

  function drawEnemy(e) {
    const x = e.x, y = sy(e.y), r = e.r;
    if (y < -70 || y > H + 70) return;
    ctx.save();
    if (e.ai === 'phase') ctx.globalAlpha = e.alpha;
    const fly = e.fly ? 6 + Math.sin(e.t * 5) * 3 : 0;
    shadow(x, y, r * 0.8, e.fly ? 0.18 : 0.3);
    const yy = y - fly;
    const hurt = e.hurt > 0;
    const telegraph = e.st === 'wind' || e.st === 'aim' || e.st === 'cast' || e.st === 'swell';
    // gameplay telegraphs under the sprite
    if (e.st === 'wind') {
      if (e.ai === 'swing') { ctx.fillStyle = 'rgba(255,60,60,.18)'; ctx.beginPath(); ctx.moveTo(x, yy); ctx.arc(x, yy, 72, -e.face - 1.25, -e.face + 1.25); ctx.fill(); }
      else if (e.ai === 'breath') { ctx.fillStyle = 'rgba(255,120,40,.2)'; ctx.beginPath(); ctx.moveTo(x, yy); ctx.arc(x, yy, 120, -e.face - 0.35, -e.face + 0.35); ctx.fill(); }
      else if (e.ai === 'slam') { ctx.strokeStyle = `rgba(255,80,60,${Math.min(1, e.t)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, yy, 100 * Math.min(1, e.t / 0.7), 0, 7); ctx.stroke(); }
      else if (e.ai === 'guard') { ctx.strokeStyle = 'rgba(255,60,60,.6)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + Math.cos(e.face) * 120, yy - Math.sin(e.face) * 120); ctx.stroke(); ctx.setLineDash([]); }
    }
    if (e.st === 'aim' && (e.ai === 'shooter' || e.ai === 'web')) {
      ctx.strokeStyle = e.ai === 'shooter' ? `rgba(255,80,80,${0.3 + e.t})` : 'rgba(220,235,255,.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(hero.x, sy(hero.y)); ctx.stroke(); ctx.setLineDash([]);
    }
    if (e.guard) { ctx.strokeStyle = `rgba(160,210,255,${0.25 + 0.2 * Math.sin(globalT * 8)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, yy, r + 4, -e.face - 1, -e.face + 1); ctx.stroke(); }
    // the monster itself (pixel sprite, feet on the shadow, turned toward the hero)
    const moving = hyp(e.vx, e.vy) > 12;
    const f = Math.floor((globalT + e.phase) * (e.ai === 'flutter' || e.ai === 'imp' ? (e.type === 'jelly' ? 5 : 10) : 4));
    const step = moving ? (Math.sin((globalT + e.phase) * 11) > 0 ? 1 : -1) : 0;
    const spr = SPR.enemy(e.type, { st: e.st, f, step, k: e.st === 'slash' ? e.t / 0.2 : 0, flip: hero.x < e.x - 2, flash: hurt });
    SPR.draw(ctx, spr, x, yy + r * 0.75);
    if (e.ai === 'swing' && e.st === 'slash') { ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(x, yy, 64, -e.face - 1.25, -e.face + 1.25); ctx.stroke(); }
    if (telegraph && e.ai !== 'swing') { const top = yy + r * 0.75 - (spr ? spr.ay * SPR.SCALE : r * 2); ctx.fillStyle = '#ff4040'; ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 3; ctx.font = `bold 16px ${FONT}`; ctx.textAlign = 'center'; ctx.strokeText('!', x, top - 2); ctx.fillText('!', x, top - 2); }
    ctx.restore();
    if (e.hp < e.maxHp) { const w = Math.max(24, r * 2); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - w / 2, y + r + 4, w, 4); ctx.fillStyle = '#e5483c'; ctx.fillRect(x - w / 2, y + r + 4, w * e.hp / e.maxHp, 4); }
  }

  // pixel sprite of the hero for the current motion
  function heroSprite(h) {
    const sp = hyp(h.vx, h.vy), ram = sp > RAM_MIN && state !== 'town';
    const c = Math.cos(h.face), s = Math.sin(h.face);
    const dir = Math.abs(c) > Math.abs(s) * 1.1 ? (c > 0 ? 'right' : 'left') : (s > 0 ? 'up' : 'down');
    const moving = sp > 30, ph = (h.walk || 0) * 0.07;
    const step = moving ? (Math.sin(ph) > 0.3 ? 1 : Math.sin(ph) < -0.3 ? -1 : 0) : 0;
    return SPR.hero({ dir, step, dash: ram && dir !== 'down', hurt: h.inv > 0.55, blink: !moving && (globalT % 3.1) < 0.12, bob: !moving && (globalT % 1.1) < 0.55 ? 1 : 0, wave: Math.floor(globalT * 10) % 2, w: save.eq.weapon, a: save.eq.armor });
  }

  function drawHero() {
    const h = hero, x = h.x, y = sy(h.y), sp = heroSpeed(), ram = sp > RAM_MIN;
    const spr = heroSprite(h);
    for (const p of h.trail) SPR.draw(ctx, spr, p.x, sy(p.y) + h.r * 0.75, p.a * 0.22);   // after-images while charging
    if (h.inv > 0) ctx.globalAlpha = 0.55 + 0.35 * Math.cos(h.inv * 18);   // soft pulse instead of a hard 20Hz blink
    shadow(x, y, h.r);
    // charge aura: shows the hit will count
    if (ram) {
      const k = Math.min(1, (sp - RAM_MIN) / 500);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,${180 - k * 80},60,${0.22 + k * 0.25})`; ctx.beginPath(); ctx.ellipse(x, y, h.r * (1.4 + k * 0.5), h.r * (1.6 + k * 0.5), 0, 0, 7); ctx.fill();
      ctx.restore();
    }
    SPR.draw(ctx, spr, x, y + h.r * 0.75);
    if (h.lvFlash > 0) { ctx.strokeStyle = `rgba(242,193,78,${h.lvFlash / 1.6})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, h.r + 8 + (1.6 - h.lvFlash) * 30, 0, 7); ctx.stroke(); }
    if (h.slow > 0) { ctx.strokeStyle = 'rgba(235,240,255,.8)'; ctx.lineWidth = 1.5; for (let k = 0; k < 3; k++) { const a = k * 1.05 + 0.3; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * h.r * 1.3, y - Math.sin(a) * h.r * 1.3); ctx.lineTo(x + Math.cos(a) * h.r * 1.3, y + Math.sin(a) * h.r * 1.3); ctx.stroke(); } }
    ctx.globalAlpha = 1;
  }

  function drawBoss() {
    const B = boss; if (!B) return;
    const x = B.x, by = sy(B.y), r = B.r, z = (B.z || 0) * 70;
    if (B.dead > 0.6) return;
    const y = by - z;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, by + r * 0.7, r * (1 - B.z * 0.4), r * 0.4 * (1 - B.z * 0.4), 0, 0, 7); ctx.fill();
    if (B.mv && B.mv.name === 'jump' && B.mv.n === 0) { ctx.strokeStyle = 'rgba(255,60,60,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(B.mv.tx, sy(B.mv.ty), r, 0, 7); ctx.stroke(); }
    if (B.tele != null) { ctx.strokeStyle = 'rgba(255,60,60,.55)'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(B.tele) * 300, y - Math.sin(B.tele) * 300); ctx.stroke(); ctx.setLineDash([]); }
    // weapons
    for (const s of B.sweeps) {
      const ex = x + Math.cos(s.ang) * s.len, ey = y - Math.sin(s.ang) * s.len;
      if (s.t < s.tele) {
        const k = s.t / s.tele;
        ctx.strokeStyle = `rgba(255,60,60,${0.25 + k * 0.4})`; ctx.lineWidth = s.w * 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke(); ctx.lineCap = 'butt';
        ctx.strokeStyle = 'rgba(255,60,60,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, s.len, 0, 7); ctx.stroke();
        continue;
      }
      for (let k = 1; k <= 4; k++) { const a = s.ang - Math.sign(s.vel) * k * 0.09; ctx.strokeStyle = hexA(s.col, 0.18 / k * 2); ctx.lineWidth = s.w * 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * s.len, y - Math.sin(a) * s.len); ctx.stroke(); }
      ctx.strokeStyle = s.col; ctx.lineWidth = s.w * (s.kind === 'club' || s.kind === 'tail' ? 2 : 1.2); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + Math.cos(s.ang) * r * 0.6, y - Math.sin(s.ang) * r * 0.6); ctx.lineTo(ex, ey); ctx.stroke(); ctx.lineCap = 'butt';
      if (s.kind === 'scythe') { ctx.strokeStyle = s.col; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(ex, ey, 22, -s.ang - Math.sign(s.vel) * 0.2, -s.ang + Math.sign(s.vel) * 2.2, s.vel > 0); ctx.stroke(); }
      if (s.kind === 'club') { ctx.fillStyle = '#8a5a2a'; ctx.beginPath(); ctx.arc(ex, ey, 16, 0, 7); ctx.fill(); }
    }
    const hurt = B.hurt > 0, look = Math.atan2(hero.y - B.y, hero.x - B.x);
    ctx.save();
    ctx.globalAlpha = B.alpha == null ? 1 : clamp(B.alpha, 0, 1);
    if (B.dead) ctx.globalAlpha = Math.max(0, 1 - B.dead / 0.6);
    // effects behind the body
    if (B.phase === 2) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 1.7); g.addColorStop(0, `rgba(255,40,60,${0.18 + beatPulse * 0.12})`); g.addColorStop(1, 'rgba(255,40,60,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, 7); ctx.fill(); ctx.restore(); }
    if (B.type === 'lich') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(180,140,255,${0.1 + beatPulse * 0.12})`; ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, 7); ctx.fill(); ctx.restore(); }
    if (B.type === 'icequeen') for (let i = 0; i < 6; i++) { const a = globalT * 0.8 + i / 6 * Math.PI * 2, ox = x + Math.cos(a) * r * 1.5, oy = y - Math.sin(a) * r * 1.0; ctx.fillStyle = 'rgba(190,240,255,.85)'; ctx.fillRect(Math.round(ox) - 2, Math.round(oy) - 6, 4, 12); ctx.fillRect(Math.round(ox) - 5, Math.round(oy) - 2, 10, 4); }
    // the boss (pixel sprite, feet on the shadow; fliers hover above it)
    const FLOAT = { lich: 1, icequeen: 1, thunderbird: 1, voideye: 1, ghostcaptain: 1, archmage: 1, quetzal: 1 };
    const hov = FLOAT[B.type] ? 12 + Math.sin(globalT * 2.2) * 4 : 0;
    const lk = Math.round((((-look) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 4)) % 8;
    const spr = SPR.boss(B.type, { f: Math.floor(globalT * (B.type === 'thunderbird' ? 8 : 4)), act: B.mv && B.mv.t < 0.7 ? 1 : 0, p2: B.phase === 2, look: lk, air: (B.z || 0) > 0.05, flash: hurt });
    SPR.draw(ctx, spr, x, by + r * 0.7 - z - hov);
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
  function drawZones() {
    for (const z of zones) {
      const col = ZCOL[z.kind] || '255,80,80';
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
      if (b.kind === 'web') { SPR.draw(ctx, SPR.ENV.web(), x, y); continue; }
      if (b.kind === 'spore') { SPR.draw(ctx, SPR.ENV.spore(), x, y, Math.min(1, b.life) * 0.9); continue; }
      if (b.kind === 'homing') { SPR.draw(ctx, SPR.ENV.orb('255,110,210', R), x, y); continue; }
      if (b.kind === 'arrow') { const a = Math.atan2(-b.vy, b.vx); ctx.strokeStyle = '#d8c8a0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 12, y - Math.sin(a) * 12); ctx.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4); ctx.stroke(); ctx.fillStyle = '#e8e8f0'; ctx.fillRect(q(x + Math.cos(a) * 5) - 1.5, q(y + Math.sin(a) * 5) - 1.5, 4.5, 4.5); ctx.fillStyle = '#c84040'; ctx.fillRect(q(x - Math.cos(a) * 12) - 1.5, q(y - Math.sin(a) * 12) - 1.5, 3, 3); continue; }
      if (b.kind === 'rock') { SPR.draw(ctx, SPR.ENV.rockShot(), x, y); continue; }
      if (b.kind === 'flame' || b.kind === 'big') { SPR.draw(ctx, SPR.ENV.flame(f + Math.floor(b.x), b.kind === 'big', state === 'boss' && boss ? boss.fcol : null), x, y, b.kind === 'flame' ? Math.min(1, Math.max(0, b.life / 0.9) + 0.3) : 1); continue; }
      const col = b.kind === 'orb' ? (state === 'boss' && boss && boss.ocol ? boss.ocol : boss && boss.type === 'lich' ? '180,140,255' : boss && boss.type === 'maou' ? '255,80,160' : '120,220,255') : '255,140,50';
      SPR.draw(ctx, SPR.ENV.orb(col, R), x, y);
    }
    for (const r of rings) { ctx.strokeStyle = `rgba(255,190,120,${1 - r.r / r.max})`; ctx.lineWidth = Math.max(3, q(r.w)); ctx.beginPath(); ctx.arc(r.x, sy(r.y), r.r, 0, 7); ctx.stroke(); }
  }
  function drawDrops() {
    for (const d of drops) {
      const x = d.x, y = sy(d.y);
      if (d.type === 'gold') SPR.draw(ctx, SPR.ENV.coin(Math.floor(globalT * 10 + d.x * 0.1)), x, y);
      else if (d.type === 'herb') SPR.draw(ctx, SPR.ENV.herb(), x, y);
      else SPR.draw(ctx, SPR.ENV.potion(d.type === 'potion' ? '#e5483c' : d.type === 'hipotion' ? '#7ab8ff' : '#f2c14e'), x, y + 4);
    }
  }
  function drawFx() {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of fx) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.col; const s = p.r > 2.5 ? 3 : 1.5; ctx.fillRect(q(p.x) - s / 2, q(sy(p.y)) - s / 2, s, s); }
    ctx.restore(); ctx.globalAlpha = 1;
    // hit sparks / defeat puffs (pixel animations)
    for (const a of anims) {
      const f = Math.min(a.frames - 1, Math.floor(a.t / a.dur * a.frames));
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
    if (D && !arena) {
      const dy = sy(goalY + 20);
      if (dy > -80 && dy < H + 80) { const glow = 0.5 + 0.5 * Math.sin(globalT * 3); txt('BOSS', W / 2, dy - 100, 16, `rgba(255,${80 + glow * 60},${80 + glow * 60},1)`, 'center'); }
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
    const h = hero, top = safeTop() + 8;
    // status window
    ctx.fillStyle = 'rgba(19,24,58,.86)'; roundRect(8, top, 196, 50, 6); ctx.fill();
    ctx.strokeStyle = '#f3ecda'; ctx.lineWidth = 2; roundRect(8, top, 196, 50, 6); ctx.stroke();
    txt(`Lv ${save.lv}`, 16, top + 18, 14, '#f2c14e', 'left', false);
    txt(`HP ${Math.ceil(h.hp)}/${h.s.maxHp}`, 66, top + 18, 13, h.hp < h.s.maxHp * 0.3 ? '#ff7a6a' : '#f3ecda', 'left', false);
    bar(16, top + 25, 180, 8, h.hp / h.s.maxHp, h.hp < h.s.maxHp * 0.3 ? '#e5483c' : '#6fd38a');
    bar(16, top + 38, 180, 4, save.exp / expNeed(save.lv), '#7ab8ff');
    let bx = 10;
    for (const [k, lab, c] of [['atk', 'ちから', '#ff9a5a'], ['def', 'まもり', '#9fd0ff']]) {
      if (!(h.buff[k] > 0)) continue;
      ctx.fillStyle = 'rgba(19,24,58,.86)'; roundRect(bx, top + 54, 86, 20, 5); ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 1.5; roundRect(bx, top + 54, 86, 20, 5); ctx.stroke();
      txt(`${lab} ${Math.ceil(h.buff[k])}s`, bx + 43, top + 69, 12, c, 'center', false); bx += 92;
    }
    txt(`${save.gold} G`, 214, top + 18, 13, '#f2c14e', 'left');
    if (state === 'play') {
      // depth meter
      const k = clamp(h.y / goalY, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(W - 14, top + 72, 6, 150);
      ctx.fillStyle = '#f2c14e'; ctx.fillRect(W - 14, top + 72 + 150 * (1 - k), 6, 150 * k);
      txt('BOSS', W - 11, top + 66, 10, '#ff6a5a', 'center');
    }
    if (state === 'boss' && boss && !boss.dead) {   // arrow to an off-screen boss
      const bx = boss.x - bcamX + W / 2, byy = sy(boss.y), m = 34;
      if (bx < -10 || bx > W + 10 || byy < 60 || byy > H + 10) {
        const ax = clamp(bx, m, W - m), ay = clamp(byy, 110, H - 90), a = Math.atan2(byy - ay, bx - ax);
        ctx.save(); ctx.translate(ax, ay); ctx.rotate(a);
        ctx.fillStyle = `rgba(255,70,70,${0.7 + 0.3 * Math.sin(globalT * 8)})`; ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-8, -11); ctx.lineTo(-8, 11); ctx.fill();
        ctx.restore(); txt('BOSS', ax, ay + 24, 10, '#ff8a8a', 'center');
      }
    }
    if (state === 'boss' && boss) {
      const bw = W - 40, by = top + 76;
      txt(boss.name, W / 2, by - 4, 14, '#fff', 'center');
      bar(20, by, bw, 10, boss.hp / boss.maxHp, boss.phase === 2 ? '#ff3b6a' : '#e5483c');
    }
    if (combo >= 2) {
      const k = Math.min(1, comboT);
      ctx.globalAlpha = k; txt(`${combo} HIT!`, W - 16, top + (state === 'boss' ? 112 : 240), 18 + Math.min(combo, 20) * 0.6, combo >= 10 ? '#ff6ad0' : '#f2c14e', 'right'); ctx.globalAlpha = 1;
    }
    if (hint > 0 && state === 'play') {
      ctx.globalAlpha = Math.min(1, hint);
      txt('どこでも指をおいて スライドで移動', W / 2, H * 0.78, 16, '#fff', 'center');
      txt('おおきく たおして とっしん → こうげき！', W / 2, H * 0.78 + 24, 14, '#f2c14e', 'center');
      ctx.globalAlpha = 1;
    }
  }
  function safeTop() { return 0; }
  function drawPad() {
    if (!drag.down || paused || (state !== 'play' && state !== 'boss')) return;
    const dx = drag.px - drag.ox, dy = drag.py - drag.oy, d = hyp(dx, dy), k = Math.min(1, d / PAD_R);
    const kx = d > PAD_R ? drag.ox + dx / d * PAD_R : drag.px, ky = d > PAD_R ? drag.oy + dy / d * PAD_R : drag.py;
    const charge = hero && heroSpeed() > RAM_MIN;
    ctx.fillStyle = 'rgba(19,24,58,.35)'; ctx.beginPath(); ctx.arc(drag.ox, drag.oy, PAD_R, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(243,236,218,.55)'; ctx.lineWidth = 2; ctx.stroke();
    // the outer band = charge zone
    ctx.strokeStyle = charge ? 'rgba(255,170,60,.9)' : 'rgba(255,170,60,.35)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(drag.ox, drag.oy, PAD_R - 4, 0, 7); ctx.stroke();
    ctx.fillStyle = charge ? 'rgba(255,170,60,.9)' : `rgba(243,236,218,${0.55 + k * 0.3})`;
    ctx.beginPath(); ctx.arc(kx, ky, 20, 0, 7); ctx.fill();
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
  ];
  let townPage = 1, townX = 1, inside = null;
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
    ctx.fillStyle = '#fff2c8'; ctx.beginPath(); ctx.arc(q(W * 0.2 - off * 0.02), q(H * 0.12), 13.5, 0, 7); ctx.fill(); ctx.fillStyle = bands[1]; ctx.beginPath(); ctx.arc(q(W * 0.2 - off * 0.02) + 6, q(H * 0.12) - 3, 12, 0, 7); ctx.fill();
    // far mountains + the demon castle on the horizon (slow parallax)
    const px = -off * 0.15;
    for (const [col, hgt, fr, base] of [['#2e1f40', 52, 0.017, 0.46], ['#3a2547', 40, 0.021, 0.48]]) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H * 0.52);
      for (let x = 0; x <= W; x += 6) { const wx = x - px * (base > 0.47 ? 1 : 0.6); ctx.lineTo(x, q(H * base - Math.abs(Math.sin(wx * fr)) * hgt - Math.sin(wx * 0.07) * 7)); }
      ctx.lineTo(W, H * 0.52); ctx.fill();
    }
    const cx = q(W * 0.82 + px * 0.6), cy = q(H * 0.4);
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
    const TP = townTiles();
    const r = townBuildingRect(), x = q(x0 + r.x), y = q(r.y), w = q(r.w), h = q(r.h), by = q(r.by), cx = q(x + w / 2);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - 6, by - 4.5, w + 12, 9);
    if (p.id === 'gate') {
      // stone gate with a glowing portal
      patShift(TP.stone, x, y); ctx.fillStyle = TP.stone;
      ctx.fillRect(x + 9, y + 21, 45, h - 21); ctx.fillRect(x + w - 54, y + 21, 45, h - 21); ctx.fillRect(x, y, w, 36);
      ctx.fillStyle = '#847a94'; for (let i = 0; i < 6; i++) ctx.fillRect(q(x + 4.5 + i * (w - 9) / 6), y - 10.5, q((w - 9) / 6 - 6), 12);
      ctx.fillStyle = '#2e2838'; ctx.fillRect(x, y + 33, w, 3); ctx.fillRect(x + 51, y + 36, 3, h - 36); ctx.fillRect(x + w - 54, y + 36, 3, h - 36);
      ctx.fillStyle = '#140c18'; ctx.beginPath(); ctx.moveTo(x + 54, by); ctx.lineTo(x + 54, y + 69); ctx.quadraticCurveTo(cx, y + 30, x + w - 54, y + 69); ctx.lineTo(x + w - 54, by); ctx.fill();
      for (let i = 0; i < 3; i++) { const k = (globalT * 0.6 + i / 3) % 1; ctx.strokeStyle = `rgba(255,120,220,${0.7 * (1 - k)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, by - 64.5, 49.5 * (1 - k * 0.7), 66 * (1 - k * 0.7), 0, 0, 7); ctx.stroke(); }
      ctx.fillStyle = ditherFill('255,120,220', 0.5 + 0.2 * Math.sin(globalT * 3)); ctx.beginPath(); ctx.ellipse(cx, by - 64.5, 39, 55.5, 0, 0, 7); ctx.fill();
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
    for (let i = 0; i < TOWN_PAGES.length; i++) {
      const dx = (i - townX) * W;
      if (Math.abs(dx) > W * 1.1) continue;
      drawShopFront(TOWN_PAGES[i], dx);
    }
    const r = townBuildingRect();
    drawTownHero(W / 2 + 88, r.by + 22 + (Math.sin(globalT * 3) > 0 ? 0 : 1.5));
  }
  function drawTownUI() {
    const off = townX * W;
    for (let i = 0; i < TOWN_PAGES.length; i++) { const dx = (i - townX) * W; if (Math.abs(dx) <= W * 1.1) drawShopBoard(TOWN_PAGES[i], dx); }
    const r = townBuildingRect(), p = TOWN_PAGES[townPage];
    // what this screen does + how to enter
    const settled = Math.abs(townX - townPage) < 0.05;
    ctx.globalAlpha = settled ? 1 : 0.4;
    txt(p.sub, W / 2, r.by + 78, 15, '#fff', 'center');
    ctx.globalAlpha = settled ? 0.6 + 0.4 * Math.sin(globalT * 4) : 0;
    txt('タップして はいる', W / 2, r.by + 104, 14, '#f2c14e', 'center');
    ctx.globalAlpha = 1;
    // page dots
    const dy = Math.min(H - 40, r.by + 140);
    TOWN_PAGES.forEach((q2, i) => { ctx.fillStyle = i === townPage ? '#f3ecda' : 'rgba(243,236,218,.35)'; const s = i === townPage ? 9 : 7; ctx.fillRect(W / 2 + (i - (TOWN_PAGES.length - 1) / 2) * 20 - s / 2, dy - s / 2, s, s); });
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
    if (id === 'gate') {
      ctx.fillStyle = '#0d0a16'; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 7; i++) { const k = (globalT * 0.4 + i / 7) % 1; ctx.strokeStyle = `rgba(255,120,220,${0.6 * (1 - k)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(W / 2, H * 0.24, W * 0.45 * (1 - k), H * 0.18 * (1 - k), 0, 0, 7); ctx.stroke(); }
      for (let i = 0; i < 24; i++) { const a = i * 2.4 + globalT * 0.3, rr = (i * 13 % 100) / 100 * W * 0.45; ctx.fillStyle = 'rgba(255,190,240,.7)'; ctx.fillRect(q(W / 2 + Math.cos(a) * rr), q(H * 0.24 + Math.sin(a) * rr * 0.4), 1.5, 1.5); }
      return;
    }
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
        if (id === 'item') { SPR.draw(ctx, SPR.ENV.potion(['#e5483c', '#6fd38a', '#7ab8ff'][i % 3]), x, q(H * 0.1)); SPR.draw(ctx, SPR.ENV.potion(['#f2c14e', '#e5483c', '#c86bff'][i % 3]), x + 4.5, q(H * 0.2)); }
        else {
          ctx.fillStyle = '#c9ced8'; ctx.fillRect(x - 1.5, q(H * 0.1) - 33, 4.5, 33); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1.5, q(H * 0.1) - 33, 1.5, 30); ctx.fillStyle = '#c9a24a'; ctx.fillRect(x - 6, q(H * 0.1) - 9, 13.5, 3);
          if (i % 2 === 0) { ctx.fillStyle = '#5a6070'; ctx.fillRect(x - 10.5, q(H * 0.2) - 24, 21, 24); ctx.fillStyle = '#8a8f9a'; ctx.fillRect(x - 9, q(H * 0.2) - 22.5, 18, 21); ctx.fillStyle = '#f2c14e'; ctx.fillRect(x - 1.5, q(H * 0.2) - 19.5, 3, 15); ctx.fillRect(x - 6, q(H * 0.2) - 15, 12, 3); }
        }
      }
      // shopkeeper behind the counter
      const kx = W / 2, ky = q(H * 0.33);
      SPR.draw(ctx, SPR.ENV.npc(id === 'smith' ? 'smith' : 'shop', Math.floor(globalT * 1.5)), kx, ky + 34);
      ctx.fillStyle = '#4a3018'; ctx.fillRect(0, ky + 21, W, 27); ctx.fillStyle = '#8a5a2a'; ctx.fillRect(0, ky + 21, W, 21); ctx.fillStyle = '#a8784a'; ctx.fillRect(0, ky + 21, W, 3);
      if (id === 'smith') { ctx.fillStyle = '#3a3a44'; ctx.fillRect(W * 0.72, ky + 6, 39, 9); ctx.fillRect(W * 0.72 + 12, ky + 15, 15, 6); ctx.fillStyle = '#6a6a78'; ctx.fillRect(W * 0.72, ky + 6, 39, 1.5); }
    }
  }
  function drawInteriorUI(id) {
    if (id === 'gate') { txt('どこへ むかう？', W / 2, H * 0.25, 20, '#fff', 'center'); drawTownTop(); return; }
    if (id !== 'house') {
      const kx = W / 2, ky = H * 0.33;
      const say = id === 'smith' ? 'いい ぶきが そろってるぜ！' : 'いらっしゃい！ なにを かう？';
      ctx.font = `14px ${FONT}`; const tw = ctx.measureText(say).width + 22;
      ctx.fillStyle = '#f3ecda'; roundRect(kx - tw / 2, ky - 86, tw, 30, 8); ctx.fill();
      ctx.beginPath(); ctx.moveTo(kx - 6, ky - 56); ctx.lineTo(kx + 6, ky - 56); ctx.lineTo(kx, ky - 48); ctx.fill();
      txt(say, kx, ky - 66, 14, '#13183a', 'center', false);
    }
    drawTownTop();
  }
  function townSwipeTo(i) {
    const n = clamp(i, 0, TOWN_PAGES.length - 1); if (n !== townPage) A.sfx('select'); townPage = n; updateNav();
    if (audioOn && !musicRoom) FMusic.setLayer(TOWN_PAGES[n].id);   // each building re-orchestrates the waltz
  }
  function enterBuilding(id) {
    A.sfx('select');
    if (id === 'gate') openGate(); else if (id === 'item') openItemShop(); else if (id === 'smith') openEquipShop(); else openHouse();
  }

  function render() {
    mainCtx.setTransform(dpr * S, 0, 0, dpr * S, 0, 0);
    mainCtx.clearRect(0, 0, W, H);
    ctx = mainCtx;
    if (state === 'title') { beginPix(); drawTitleBg(); endPix(); return; }
    if (state === 'town' || (state === 'over' && !D)) {
      beginPix(); if (inside) drawInterior(inside); else drawTown(); endPix();
      if (inside) drawInteriorUI(inside); else drawTownUI();
      drawFade(); return;
    }
    // the world is drawn into the low-res pixel layer, camera snapped to the art grid
    const cam0 = camY, bx0 = bcamX, by0 = bcamY;
    camY = q(camY); bcamX = q(bcamX); bcamY = q(bcamY);
    const shx = shake > 0 ? q(rnd(-1, 1) * shake * 0.5) : 0, shy = shake > 0 ? q(rnd(-1, 1) * shake * 0.5) : 0;
    beginPix();
    ctx.save();
    ctx.translate(shx, shy);
    if (arena) ctx.translate(q(W / 2 - bcamX), 0);   // boss room camera
    if (arena) drawArena(); else drawDungeon();
    if (state !== 'boss' && !arena) drawProps();
    drawDrops();
    const list = enemies.filter(e => !e.dead);
    list.sort((a, b) => b.y - a.y);
    for (const e of list) drawEnemy(e);
    if (boss) drawBoss();
    if (hero.hp > 0 || slowMo > 0) drawHero();
    drawZones();
    drawBullets();
    drawFx();
    if (D) lighting();
    ctx.restore();
    endPix();
    ctx.save(); ctx.translate(shx, shy); if (arena) ctx.translate(q(W / 2 - bcamX), 0); drawWorldText(); ctx.restore();
    camY = cam0; bcamX = bx0; bcamY = by0;
    if (flash > 0) { ctx.fillStyle = `rgba(${flashCol},${flash * 0.5})`; ctx.fillRect(0, 0, W, H); }
    drawHud();
    drawPad();
    drawBanner();
    drawFade();
    if (paused) { ctx.fillStyle = trayOpen ? 'rgba(0,0,0,.3)' : 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, W, H); }
  }
  function drawFade() { if (transition) { const k = transition.t < transition.mid ? transition.t / transition.mid : 2 - transition.t / transition.mid; ctx.fillStyle = `rgba(0,0,0,${clamp(k, 0, 1)})`; ctx.fillRect(0, 0, W, H); } }
  function drawTitleBg() {
    const bands = ['#120f22', '#161226', '#1b142a', '#20162c', '#25172e', '#2a1830'];
    bands.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, q(i * H / bands.length), W, q(H / bands.length) + 3); });
    for (let i = 0; i < 30; i++) {
      const x = q((i * 71 + globalT * 30 * (1 + i % 3)) % (W + 40) - 20), y = q(H * 0.12 + (i * 137) % (H * 0.8));
      ctx.fillStyle = `rgba(242,193,78,${0.25 + (i % 4) * 0.12})`; const s = i % 3 ? 1.5 : 3; ctx.fillRect(x, y, s, s);
    }
  }
  // ---------------------------------------------------------------
  //  DOM UI — town commands, shops, panels
  // ---------------------------------------------------------------
  const panelWrap = $('panelWrap'), panelTitle = $('panelTitle'), panelBody = $('panelBody'), panelFoot = $('panelFoot');
  let panelOpen = false;
  // room: which building we are inside (the window then sits at the bottom over the interior)
  function openPanel(title, html, buttons, room = null) {
    inside = room; panelWrap.classList.toggle('inside', !!room); $('navL').hidden = $('navR').hidden = true;
    panelTitle.textContent = title; panelBody.innerHTML = html; panelFoot.innerHTML = '';
    for (const [label, fn, primary] of buttons || []) {
      const b = document.createElement('button'); b.className = 'btn' + (primary ? ' primary' : ''); b.textContent = label;
      b.addEventListener('click', () => { A.sfx('select'); fn(); }); panelFoot.appendChild(b);
    }
    panelWrap.hidden = false; panelOpen = true;
    const f = panelFoot.querySelector('.primary') || panelFoot.querySelector('button'); if (f) f.focus({ preventScroll: true });
  }
  function closePanel() { stopMusicRoom(); panelWrap.hidden = true; panelOpen = false; inside = null; panelWrap.classList.remove('inside'); updateNav(); }
  function updateNav() {
    const on = state === 'town' && !panelOpen && !transition;
    $('navL').hidden = $('navR').hidden = !on;
    $('navL').disabled = townPage <= 0; $('navR').disabled = townPage >= TOWN_PAGES.length - 1;
  }

  function showHud(on) { $('pauseBtn').hidden = !on; $('itemBtn').hidden = !on; if (!on && trayOpen) closeTray(); updateNav(); updateHudButtons(); }
  function updateHudButtons() {
    const it = save.items; $('itemCount').textContent = Object.keys(ITEMS).reduce((a, k) => a + (it[k] || 0), 0);
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
    trayOpen = true; paused = true;
    const s = hero.s;
    $('tray').innerHTML = Object.entries(ITEMS).map(([id, I]) => {
      const n = save.items[id] || 0, eff = I.buff ? (I.buff === 'atk' ? 'こうげき×1.5' : 'ダメージ半分') : `+${Math.min(healOf(id, s.maxHp), s.maxHp)}`;
      return `<button data-use="${id}" ${n ? '' : 'disabled'}><span>${I.name}</span><span class="tn">${eff}</span><b>×${n}</b></button>`;
    }).join('') + `<button data-use="" class="tclose">とじる</button>`;
    $('tray').hidden = false;
    $('tray').querySelectorAll('[data-use]').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); const id = b.dataset.use; closeTray(); if (id) useItem(id); }));
  }
  function closeTray() { trayOpen = false; $('tray').hidden = true; if (!panelOpen) paused = false; }

  function goTown() {
    closePanel(); state = 'town'; D = null; arena = null; boss = null; enemies = []; bullets = []; hero = null; paused = false;
    save.hp = null;   // back in town = fully healed
    townPage = 1; townX = 1;
    A.bgm(FARR.town, { layer: TOWN_PAGES[townPage].id });
    showHud(false); persist();
  }

  function statusHtml() {
    const s = stats();
    return `<dl class="stat">
      <dt>レベル</dt><dd>${save.lv}</dd>
      <dt>HP</dt><dd>${hero && (state === 'play' || state === 'boss') ? Math.ceil(hero.hp) : s.maxHp} / ${s.maxHp}</dd>
      <dt>こうげき</dt><dd>${s.atk}</dd>
      <dt>ぼうぎょ</dt><dd>${s.def}</dd>
      <dt>とっしん力</dt><dd>×${s.ram.toFixed(2)}</dd>
      <dt>つぎのレベルまで</dt><dd>${expNeed(save.lv) - save.exp} EXP</dd>
      <dt>ゴールド</dt><dd class="gold">${save.gold} G</dd>
      <dt>たおした数</dt><dd>${save.kills}</dd>
    </dl>
    <div style="margin-top:10px;font-size:14px;line-height:1.7">${['weapon', 'armor', 'boots', 'charm'].map(sl => `${SLOT_NAME[sl]}：${save.eq[sl] ? EQ[save.eq[sl]].name : 'なし'}`).join('<br>')}</div>`;
  }

  function openItemShop() {
    const render2 = () => {
      openPanel('どうぐや', `<p style="font-size:14px;color:var(--muted);margin-bottom:4px">もちもの：<span class="gold">${save.gold} G</span></p>` +
        Object.entries(ITEMS).map(([id, it]) => `<div class="row"><span class="nm">${it.name} <span style="color:var(--muted);font-size:13px">×${save.items[id]}</span></span>
          <span class="sub">${it.note}（${ITEM_MAX}こまで）</span>
          <span class="act"><span class="price">${it.price} G</span><button class="sbtn" data-buy="${id}" ${save.gold < it.price || save.items[id] >= ITEM_MAX ? 'disabled' : ''}>かう</button></span></div>`).join(''),
        [['みせを でる', closePanel]], 'item');
      panelBody.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => {
        const id = b.dataset.buy, it = ITEMS[id]; if (save.gold < it.price || save.items[id] >= ITEM_MAX) return;
        save.gold -= it.price; save.items[id]++; persist(); A.sfx('buy'); render2();
      }));
    };
    render2();
  }

  let equipTab = 'weapon';
  function openEquipShop() {
    const render2 = () => {
      const s = stats();
      const list = EQUIP.filter(e => e.slot === equipTab && e.price > 0 || (e.slot === equipTab && save.owned.includes(e.id)));
      const statOf = e => [e.atk && `こうげき +${e.atk}`, e.def && `ぼうぎょ +${e.def}`, e.hp && `さいだいHP +${e.hp}`, e.ram && e.ram > 1 && `とっしん力 ×${e.ram}`].filter(Boolean).join('・');
      openPanel('かじや', `<div class="tabs">${['weapon', 'armor', 'boots', 'charm'].map(sl => `<button data-tab="${sl}" aria-pressed="${sl === equipTab}">${SLOT_NAME[sl]}</button>`).join('')}</div>
        <p style="font-size:14px;color:var(--muted)">こうげき ${s.atk}・ぼうぎょ ${s.def}・<span class="gold">${save.gold} G</span></p>` +
        list.map(e => {
          const own = save.owned.includes(e.id), eq = save.eq[e.slot] === e.id;
          return `<div class="row"><span class="nm">${e.name}</span><span class="sub">${statOf(e) || 'ふつうの そうび'}</span>
            <span class="act">${eq ? '<span class="tag">そうびちゅう</span>' : own ? `<button class="sbtn" data-eq="${e.id}">そうびする</button>` : `<span class="price">${e.price} G</span><button class="sbtn" data-buy="${e.id}" ${save.gold < e.price ? 'disabled' : ''}>かう</button>`}</span></div>`;
        }).join(''),
        [['みせを でる', closePanel]], 'smith');
      panelBody.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { equipTab = b.dataset.tab; A.sfx('select'); render2(); }));
      panelBody.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => {
        const e = EQ[b.dataset.buy]; if (save.gold < e.price) return;
        const before = stats().maxHp;
        save.gold -= e.price; save.owned.push(e.id); save.eq[e.slot] = e.id;
        if (save.hp != null) save.hp += Math.max(0, stats().maxHp - before);
        persist(); A.sfx('buy'); render2();
      }));
      panelBody.querySelectorAll('[data-eq]').forEach(b => b.addEventListener('click', () => { const e = EQ[b.dataset.eq]; save.eq[e.slot] = e.id; persist(); A.sfx('equip'); render2(); }));
    };
    render2();
  }

  function openGate() {
    const unlocked = i => i === 0 || save.cleared[i - 1];
    openPanel('ダンジョンを えらぶ', DUNGEONS.map((d, i) => {
      const ok = unlocked(i), warn = save.lv < d.rec;
      return `<div class="row ${ok ? '' : 'lock'}"><span class="nm">${i + 1}. ${ok ? d.name : '？？？'} ${save.cleared[i] ? '<span class="tag">★せいは</span>' : ''}</span>
        <span class="sub">${ok ? `${d.en}・すいしょう Lv ${d.rec}${warn ? '<span class="hpc">（きけん）</span>' : ''}・ボス：${BOSSES[d.boss].name}` : 'まえのダンジョンを せいはすると いける'}</span>
        <span class="act"><button class="sbtn" data-go="${i}" ${ok ? '' : 'disabled'}>いく</button></span></div>`;
    }).join('') + `<p style="font-size:13px;color:var(--muted);margin-top:6px">かいふくアイテム ${save.items.herb + save.items.potion + save.items.elixir}こ・やられると この ぼうけんで ひろった ゴールドの はんぶんを おとす</p>`,
      [['街に もどる', closePanel]], 'gate');
    panelBody.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { A.sfx('confirm'); const i = +b.dataset.go; transition = { t: 0, mid: 0.4, fn: () => enterDungeon(i) }; closePanel(); }));
  }

  // ---- music room: listen to every arrangement you have reached ----
  let musicRoom = null;
  function openMusicRoom() {
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
    openPanel('おんがくしつ', `<p style="color:var(--muted);font-size:14px;margin-bottom:4px">いちど たどりついた ダンジョンの曲と、たおした ボスの曲が きける。</p>${html}`,
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
    musicRoom = null; A.bgm(FARR.town, { layer: TOWN_PAGES[townPage].id });
  }

  function openHouse() {
    openPanel('勇者の家', statusHtml(), [['おんがくしつ', openMusicRoom], ['せってい', openOptions], ['あそびかた', openHelp], ['いえを でる', closePanel, true]], 'house');
  }
  function openOptions() {
    openPanel('せってい', `<label class="sl" for="optBgm">BGM<input id="optBgm" type="range" min="0" max="1" step="0.1" value="${save.settings.bgm}"></label>
      <label class="sl" for="optSfx">こうかおん<input id="optSfx" type="range" min="0" max="1" step="0.1" value="${save.settings.sfx}"></label>
      <p style="font-size:13px;color:var(--muted);margin-top:8px">セーブは このブラウザに じどうで ほぞんされます。</p>`,
      [['もどる', openHouse, true], ['データをけす', () => openPanel('ほんとうに けしますか？', '<p>レベル・そうび・ゴールドが すべて さいしょに もどります。</p>', [['けす', () => { save = DEF_SAVE(); persist(); goTown(); }], ['やめる', openOptions, true]], 'house')]], 'house');
    const apply = () => { save.settings.bgm = +$('optBgm').value; save.settings.sfx = +$('optSfx').value; if (audioOn) FMusic.setVolume(save.settings.bgm, save.settings.sfx); persist(); };
    $('optBgm').addEventListener('input', apply); $('optSfx').addEventListener('input', apply);
  }

  function openHelp() {
    openPanel('あそびかた', `<p>・画面のどこでも 指をおくと そこが スライドパッドになる。たおした ほうこうに 勇者が うごく。</p>
      <p>・パッドを <b class="gold">おおきく たおす</b>と とっしん。オレンジに 光っていれば ぶつかると こうげきになる。ぶつかった あとは はねかえる。</p>
      <p>・ゆっくり ふれると モンスターの こうげきを うける。弾や 剣にも ちゅうい。</p>
      <p>・てきを たおすと けいけんちと ゴールド。レベルが あがると つよくなる。</p>
      <p>・たからばこ と 木箱は たいあたりで あけられる。</p>
      <p>・ダンジョンの おくには ボスが いる。まるい へやで 弾幕を よけながら たいあたり！</p>
      <p>・盾を もつ騎士は 正面からの こうげきを ふせぐ。よこに まわりこもう。</p>
      <p>・右下の どうぐボタンで アイテムを えらんで つかう（えらんでいる あいだは ゲームが とまる）。ちから・まもりの くすりは 20びょう こうかが つづく。つかったあとは 6びょう まつと つぎの どうぐが つかえる。</p>
      <p>・街に もどると HPは ぜんかいふく。やられると その ぼうけんで ひろった ゴールドの はんぶんを おとす。</p>
      <p>・街は 左右に スワイプして たてものを えらび、タップで 中に はいる。</p>`, [['もどる', openHouse, true]], 'house');
  }

  function openPause() {
    paused = true;
    openPanel('ポーズ', statusHtml() + '<p style="font-size:13px;color:var(--muted);margin-top:8px">街へ かえっても ひろった ゴールドは なくならない。</p>', [['つづける', () => { paused = false; closePanel(); }, true], ['街へかえる', () => { paused = false; retreat(); }]]);
  }

  $('navL').addEventListener('click', () => { if (state === 'town' && !panelOpen) townSwipeTo(townPage - 1); });
  $('navR').addEventListener('click', () => { if (state === 'town' && !panelOpen) townSwipeTo(townPage + 1); });
  $('pauseBtn').addEventListener('click', () => { if (state === 'play' || state === 'boss') { if (trayOpen) closeTray(); A.sfx('select'); openPause(); } });
  $('itemBtn').addEventListener('click', e => { e.stopPropagation(); if (trayOpen) closeTray(); else openTray(); });
  $('startBtn').addEventListener('click', () => {
    try { audioOn = FMusic.init(); FMusic.resume(); FMusic.setVolume(save.settings.bgm, save.settings.sfx); } catch (e) { audioOn = false; }
    $('title').hidden = true; goTown();
  });
  document.addEventListener('keydown', e => {
    if (state !== 'town') return;
    if (e.key === 'Escape' && panelOpen) closePanel();
    else if (!panelOpen && e.key === 'ArrowLeft') townSwipeTo(townPage - 1);
    else if (!panelOpen && e.key === 'ArrowRight') townSwipeTo(townPage + 1);
    else if (!panelOpen && e.key === 'Enter') enterBuilding(TOWN_PAGES[townPage].id);
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
    if (drag.down) return;
    const r = cv.getBoundingClientRect();
    drag.down = true; drag.id = e.pointerId;
    drag.ox = drag.px = (e.clientX - r.left) / S; drag.oy = drag.py = (e.clientY - r.top) / S;
    try { cv.setPointerCapture(e.pointerId); } catch (er) { }
  });
  cv.addEventListener('pointermove', e => {
    if (state === 'town' && e.pointerId === tdrag.id) {
      tdrag.dx = (e.clientX - tdrag.x0) / S;
      if (Math.abs(tdrag.dx) > 8) tdrag.moved = true;
      if (tdrag.moved) townX = clamp(townPage - tdrag.dx / W, -0.25, TOWN_PAGES.length - 0.75);
      return;
    }
    if (!drag.down || e.pointerId !== drag.id) return;
    const r = cv.getBoundingClientRect();
    drag.px = (e.clientX - r.left) / S; drag.py = (e.clientY - r.top) / S;
    // the pad follows the finger when it slides past the rim
    const dx = drag.px - drag.ox, dy = drag.py - drag.oy, d = hyp(dx, dy);
    if (d > PAD_R) { drag.ox = drag.px - dx / d * PAD_R; drag.oy = drag.py - dy / d * PAD_R; }
  });
  const up = e => {
    if (e.pointerId === tdrag.id) {
      tdrag.id = null;
      if (state !== 'town' || panelOpen) return;
      if (tdrag.moved) { if (tdrag.dx < -W * 0.15) townSwipeTo(townPage + 1); else if (tdrag.dx > W * 0.15) townSwipeTo(townPage - 1); }
      else {   // tap: on the building (or its sign) = go inside
        const r = cv.getBoundingClientRect(), y = (e.clientY - r.top) / S, x = (e.clientX - r.left) / S, b = townBuildingRect();
        if (y > b.y - 60 && y < b.by + 110 && x > b.x - 20 && x < b.x + b.w + 20) enterBuilding(TOWN_PAGES[townPage].id);
      }
      return;
    }
    if (e.pointerId === drag.id) { drag.down = false; drag.id = null; }
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

  // ---------------------------------------------------------------
  //  LOOP
  // ---------------------------------------------------------------
  // resolution: device pixel ratio capped at 2 and ~1.2M pixels, then lowered automatically if frames are slow
  let quality = 1;
  function resize() {
    const r = cv.getBoundingClientRect();
    const cap = Math.sqrt(1.2e6 / Math.max(1, r.width * r.height));
    dpr = Math.max(0.75, Math.min(2, window.devicePixelRatio || 1, cap) * quality);
    S = r.width / VW; W = VW; H = Math.round(r.height / S);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  }
  window.addEventListener('resize', resize);
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
    if (trayOpen) { closeTray(); return true; }
    if (state === 'over') { goTown(); return true; }
    if (panelOpen) { if (state === 'play' || state === 'boss') paused = false; closePanel(); return true; }
    if (state === 'play' || state === 'boss') { openPause(); return true; }
    if (state === 'town' && townPage !== 1) { townSwipeTo(1); return true; }
    return false;   // gate page in town: let Android close the app
  };
  let last = performance.now();
  const perfWin = { n: 0, sum: 0 };
  function frame(now) {
    requestAnimationFrame(frame);
    if (sleeping) { last = now; return; }   // nothing runs while the app is hidden
    const raw = now - last;
    const dt = Math.min(0.05, raw / 1000); last = now;
    // auto quality: if gameplay runs under ~45fps for 1.5 seconds, render fewer pixels
    if ((state === 'play' || state === 'boss') && !paused && raw < 250) {
      perfWin.n++; perfWin.sum += raw;
      if (perfWin.sum >= 1500) {
        if (perfWin.sum / perfWin.n > 22 && quality > 0.5) { quality = Math.max(0.5, quality - 0.25); resize(); }
        perfWin.n = 0; perfWin.sum = 0;
      }
    }
    if (!manual) update(dt);
    render();
  }
  let manual = false;
  loadSave(); resize();
  window.claude?.hot?.snapshot?.(() => save);
  requestAnimationFrame(frame);
  // test hooks
  window.__yusha = { get state() { return state; }, get hero() { return hero; }, get boss() { return boss; }, get enemies() { return enemies; }, get save() { return save; }, set save(v) { save = v; },
    enter: enterDungeon, hurtLog, get runExp() { return runExp; }, get runGold() { return runGold; }, get zones() { return zones; }, dropTest: (x, y, g) => dropCoins(x, y, g), kill: () => { hero.inv = 0; hurtHero(99999, hero.x, hero.y - 10, 100, 'test'); }, set manual(v) { manual = v; }, useItem, get rings() { return rings; }, set audio(v) { audioOn = v; }, toBoss: () => { transition = null; enterBossRoom(); }, goTown, update, render, get goalY() { return goalY; }, drag, get bullets() { return bullets; }, get props() { return props; }, stats, tunnelAt };
})();
