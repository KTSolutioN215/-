// =============================================================
//  ARRANGEMENTS — how each place plays the three themes (fantasy.js)
//
//  theme  : dungeon | boss | town        mode : ionian dorian phrygian lydian mixolydian
//  key    : MIDI note of degree 0               aeolian harmonic phrygdom dblharm
//  bpm, swing (0 .. 0.67 of a 16th), room (reverb seconds), wet (reverb level)
//  lead   : instrument per section {intro, A, A2, B, C}   leadOct / stac / lv per section too
//  dbl    : [instrument, semitones, volume] doubling the melody (per section)
//  echo   : {i, d: delay in 16ths, o: semitones, v}  a canon answering the melody
//  orn    : 'grace' = quick upper-neighbour grace notes on long notes
//  harm   : accompaniment layers [{p: pad|drone|line3|arp8|arp16|alberti|shimmer|arpup|stab|stab2|
//           oompah|strum|power|waltz|boss, i: instrument, o: octave shift, v, sec: [...], r: rhythm}]
//  bass   : {p: march|sustain|half|walk|drive|boss|gallop|pizz|tresillo|maqsum|pedal|waltz|waltz2, i, o, v, stac}
//  drums  : pattern name per section (fantasy.js DR)   dv: drum volume   crash: cymbal on section starts
//  fx     : ambience  wind | chimes | drops | embers | owl
//  rage   : boss phase-2 overrides {tempo, dbl, harm, drums, key}
//  layers : (town) per-building overrides, switched on the next bar
//
//  Instruments: strings violin trem pizz contrabass pizzbass trumpet horn brass tuba flute recorder ney
//  oboe clarinet bassoon harp harpsichord guitar oud celesta musicbox glass bell xylophone choir organ
//  organbass synthpad distlead distguitar
// =============================================================
const FARR = {
  // ---------------- 冒険のマーチ (dungeon) ----------------
  dungeon: [
    { name: 'はじまりの洞窟', mood: '勇ましく', theme: 'dungeon', mode: 'ionian', key: 62, bpm: 116, room: 1.8, wet: 0.3,
      lead: { intro: 'trumpet', A: 'trumpet', A2: 'strings', B: 'horn' }, leadOct: { A2: 12 }, dbl: { A2: ['horn', 0, 0.45] },
      harm: { def: [{ p: 'oompah', i: 'strings', v: 0.55 }], B: [{ p: 'pad', i: 'strings', v: 0.45 }, { p: 'arp8', i: 'harp', o: 12, v: 0.5 }] },
      bass: { p: 'march', i: 'tuba', v: 0.9 }, drums: { intro: 'fanfare', A: 'march', A2: 'march', B: 'march2' }, crash: true },

    { name: 'まよいの森', mood: 'くらく、あやしく', theme: 'dungeon', mode: 'aeolian', key: 62, bpm: 90, room: 2.8, wet: 0.42,
      lead: { intro: 'recorder', A: 'flute', A2: 'oboe', B: 'flute' }, leadOct: { A: 12, intro: 12, B: 12 },
      echo: { i: 'recorder', d: 6, o: 12, v: 0.25, sec: ['A', 'B'] },
      harm: [{ p: 'pad', i: 'strings', o: -12, v: 0.5 }, { p: 'arp8', i: 'harp', v: 0.4, sec: ['A2', 'B'] }],
      bass: { p: 'sustain', i: 'contrabass', v: 0.8 }, drums: { intro: 'heartbeat', A: 'heartbeat', A2: 'forest', B: 'forest' }, fx: ['wind', 'owl'] },

    { name: 'ゴブリンの坑道', mood: 'こっけいに、はねて', theme: 'dungeon', mode: 'dorian', key: 64, bpm: 118, swing: 0.4, room: 1.3, wet: 0.25,
      lead: { intro: 'bassoon', A: 'bassoon', A2: 'clarinet', B: 'xylophone' }, leadOct: { A: -12, intro: -12, B: 12 }, stac: { A: 0.55, intro: 0.55, A2: 0.7, B: 0.9 },
      harm: [{ p: 'oompah', i: 'pizz', v: 0.7 }, { p: 'stab', i: 'pizz', o: 12, v: 0.35, sec: ['B'] }],
      bass: { p: 'pizz', i: 'pizzbass', v: 0.9 }, drums: 'mine' },

    { name: '水晶の洞くつ', mood: 'きらめいて、ふしぎに', theme: 'dungeon', mode: 'lydian', key: 64, bpm: 98, room: 3.6, wet: 0.48,
      lead: { intro: 'celesta', A: 'celesta', A2: 'glass', B: 'flute' }, leadOct: { def: 12, A2: 12, B: 12, intro: 12 },
      dbl: { A2: ['strings', 0, 0.35] },
      harm: [{ p: 'shimmer', i: 'celesta', o: 12, v: 0.3 }, { p: 'pad', i: 'strings', v: 0.42 }],
      bass: { p: 'sustain', i: 'contrabass', v: 0.6 }, drums: { def: 'hush', B: 'ice' }, dv: 0.6, fx: ['chimes'] },

    { name: 'のろいの地下墓地', mood: 'ぶきみに、おもく', theme: 'dungeon', mode: 'phrygian', key: 57, bpm: 78, room: 3.4, wet: 0.45,
      lead: { intro: 'organ', A: 'choir', A2: 'organ', B: 'choir' }, leadOct: { A2: 0 },
      harm: [{ p: 'trem', i: 'trem', o: -12, v: 0.45 }, { p: 'pad', i: 'organ', o: -12, v: 0.4, sec: ['A2'] }],
      bass: { p: 'sustain', i: 'contrabass', v: 0.8 }, drums: { def: 'toll', B: 'tollb' } },

    { name: 'しゃくねつの溶岩洞', mood: 'じょうねつてきに', theme: 'dungeon', mode: 'phrygdom', key: 64, bpm: 144, room: 1.5, wet: 0.26, orn: 'grace',
      lead: { intro: 'guitar', A: 'guitar', A2: 'trumpet', B: 'violin' }, leadOct: { A: 0, B: 12 },
      dbl: { A2: ['violin', 12, 0.4] },
      harm: { def: [{ p: 'strum', i: 'guitar', o: -12, v: 0.55 }], A2: [{ p: 'strum', i: 'guitar', o: -12, v: 0.55 }, { p: 'stab', i: 'brass', v: 0.5 }] },
      bass: { p: 'tresillo', i: 'contrabass', v: 0.9 }, drums: { intro: 'flamenco', A: 'flamenco', A2: 'flamenco2', B: 'flamenco' }, fx: ['embers'] },

    { name: 'こおりの塔', mood: 'つめたく、せつなく', theme: 'dungeon', mode: 'harmonic', key: 67, bpm: 106, room: 3.0, wet: 0.42,
      lead: { intro: 'musicbox', A: 'musicbox', A2: 'violin', B: 'flute' }, leadOct: { A: 12, intro: 12, B: 12 },
      harm: [{ p: 'alberti', i: 'celesta', v: 0.35 }, { p: 'pad', i: 'strings', o: -12, v: 0.45 }],
      bass: { p: 'half', i: 'contrabass', v: 0.7 }, drums: { def: 'ice', A2: 'ice2' }, fx: ['wind'] },

    { name: '天空の遺跡', mood: 'はばたくように', theme: 'dungeon', mode: 'lydian', key: 67, bpm: 136, room: 2.4, wet: 0.36,
      lead: { intro: 'flute', A: 'flute', A2: 'strings', B: 'trumpet' }, leadOct: { A: 12, intro: 12, A2: 12 }, dbl: { A2: ['flute', 12, 0.5] },
      harm: [{ p: 'arp16', i: 'harp', v: 0.4 }, { p: 'pad', i: 'strings', o: -12, v: 0.4 }],
      bass: { p: 'half', i: 'contrabass', v: 0.8 }, drums: 'sky', crash: true, fx: ['wind'] },

    { name: 'やみの砦', mood: 'しっこくの行進', theme: 'dungeon', mode: 'harmonic', key: 57, bpm: 110, room: 2.2, wet: 0.32,
      lead: { intro: 'horn', A: 'horn', A2: 'trumpet', B: 'strings' }, leadOct: { B: 12 }, dbl: { A2: ['horn', -12, 0.5] },
      harm: { def: [{ p: 'stab', i: 'brass', o: -12, v: 0.55 }], B: [{ p: 'trem', i: 'trem', v: 0.4 }, { p: 'stab', i: 'brass', o: -12, v: 0.4 }] },
      bass: { p: 'gallop', i: 'contrabass', v: 0.9 }, drums: { def: 'military', B: 'military2', intro: 'military2' }, crash: true },

    { name: 'しずみの神殿', mood: 'みなそこで、ゆらめいて', theme: 'dungeon', mode: 'dorian', key: 65, bpm: 86, room: 4.2, wet: 0.5,
      lead: { intro: 'harp', A: 'choir', A2: 'flute', B: 'choir' }, leadOct: { A2: 12 },
      echo: { i: 'harp', d: 3, o: 12, v: 0.3 },
      harm: [{ p: 'arp8', i: 'harp', v: 0.45 }, { p: 'pad', i: 'synthpad', o: -12, v: 0.5 }],
      bass: { p: 'sustain', i: 'contrabass', v: 0.7 }, drums: 'hush', fx: ['drops'] },

    { name: 'さばくの大ピラミッド', mood: 'いこくの風', theme: 'dungeon', mode: 'dblharm', key: 62, bpm: 112, swing: 0.15, room: 2.4, wet: 0.34, orn: 'grace',
      lead: { intro: 'oud', A: 'oud', A2: 'ney', B: 'oud' }, leadOct: { A2: 12 },
      harm: [{ p: 'drone', i: 'strings', v: 0.4 }, { p: 'stab2', i: 'oud', o: -12, v: 0.3, sec: ['A2', 'B'] }],
      bass: { p: 'maqsum', i: 'pizzbass', v: 0.8 }, drums: 'maqsum' },

    { name: 'からくりの時計塔', mood: 'カチコチ、せいかくに', theme: 'dungeon', mode: 'ionian', key: 67, bpm: 126, room: 1.6, wet: 0.26,
      lead: { intro: 'harpsichord', A: 'harpsichord', A2: 'clarinet', B: 'musicbox' }, leadOct: { B: 12 }, stac: { A: 0.6, intro: 0.6 },
      harm: [{ p: 'alberti', i: 'harpsichord', o: -12, v: 0.5 }],
      bass: { p: 'pizz', i: 'bassoon', o: 12, v: 0.8, stac: 0.5 }, drums: { def: 'clock', A2: 'clock2' } },

    { name: '星界のさけめ', mood: 'うちゅうのしじま', theme: 'dungeon', mode: 'lydian', key: 61, bpm: 92, room: 4.6, wet: 0.55,
      lead: { intro: 'glass', A: 'glass', A2: 'choir', B: 'glass' }, leadOct: { A: 12, intro: 12, B: 12 },
      harm: [{ p: 'pad', i: 'synthpad', v: 0.5 }, { p: 'shimmer', i: 'glass', o: 12, v: 0.22 }],
      bass: { p: 'sustain', i: 'organbass', v: 0.6 }, drums: 'gong', fx: ['chimes'] },

    { name: 'ほのおの魔界門', mood: 'もえさかる地獄', theme: 'dungeon', mode: 'harmonic', key: 62, bpm: 150, room: 2.0, wet: 0.28,
      lead: { intro: 'brass', A: 'brass', A2: 'distlead', B: 'choir' }, leadOct: { A2: 12 },
      harm: { def: [{ p: 'trem', i: 'trem', o: -12, v: 0.45 }], A2: [{ p: 'trem', i: 'trem', o: -12, v: 0.4 }, { p: 'power', i: 'distguitar', v: 0.55 }] },
      bass: { p: 'drive', i: 'contrabass', v: 0.9 }, drums: { def: 'taiko', A2: 'taiko2' }, fx: ['embers'] },

    { name: '毒の大沼', mood: 'よどんだ毒気', theme: 'dungeon', mode: 'phrygian', key: 58, bpm: 84, swing: 0.2, room: 3.0, wet: 0.42,
      lead: { intro: 'bassoon', A: 'bassoon', A2: 'clarinet', B: 'oboe' }, leadOct: { A: -12, intro: -12 }, stac: { A: 0.8 },
      harm: [{ p: 'pad', i: 'strings', o: -12, v: 0.45 }, { p: 'trem', i: 'trem', v: 0.3, sec: ['A2', 'B'] }],
      bass: { p: 'sustain', i: 'contrabass', v: 0.8 }, drums: { def: 'heartbeat', B: 'forest' }, fx: ['drops', 'owl'] },

    { name: 'ゆうれい船', mood: 'ゆらゆら亡霊の舟歌', theme: 'dungeon', mode: 'dorian', key: 62, bpm: 104, swing: 0.5, room: 2.8, wet: 0.4,
      lead: { intro: 'violin', A: 'violin', A2: 'clarinet', B: 'glass' }, leadOct: { B: 12 },
      echo: { i: 'glass', d: 6, o: 12, v: 0.22, sec: ['A2', 'B'] },
      harm: [{ p: 'oompah', i: 'pizz', v: 0.6 }, { p: 'drone', i: 'strings', v: 0.3 }],
      bass: { p: 'pizz', i: 'pizzbass', v: 0.85 }, drums: { def: 'mine', B: 'hush' }, fx: ['drops', 'wind'] },

    { name: 'きょじんの峰', mood: 'そびえる山なみ', theme: 'dungeon', mode: 'mixolydian', key: 62, bpm: 120, room: 3.0, wet: 0.36,
      lead: { intro: 'horn', A: 'horn', A2: 'brass', B: 'flute' }, leadOct: { B: 12 }, dbl: { A2: ['strings', 12, 0.4] },
      harm: [{ p: 'pad', i: 'strings', o: -12, v: 0.42 }, { p: 'stab', i: 'brass', o: -12, v: 0.4, sec: ['A2'] }],
      bass: { p: 'march', i: 'tuba', v: 0.9 }, drums: { def: 'taiko', A2: 'taiko2' }, crash: true, fx: ['wind'] },

    { name: 'まどうの図書館', mood: 'しずかな魔法のページ', theme: 'dungeon', mode: 'harmonic', key: 64, bpm: 96, room: 2.6, wet: 0.4,
      lead: { intro: 'celesta', A: 'celesta', A2: 'harpsichord', B: 'clarinet' }, leadOct: { A: 12, intro: 12 },
      harm: [{ p: 'alberti', i: 'harpsichord', o: -12, v: 0.4 }, { p: 'shimmer', i: 'glass', o: 12, v: 0.2 }],
      bass: { p: 'pizz', i: 'pizzbass', v: 0.7, stac: 0.6 }, drums: 'clock', dv: 0.6, fx: ['chimes'] },

    { name: 'ジャングルの神殿', mood: 'みどりの鼓動', theme: 'dungeon', mode: 'dorian', key: 65, bpm: 128, room: 2.2, wet: 0.34,
      lead: { intro: 'flute', A: 'flute', A2: 'xylophone', B: 'horn' }, leadOct: { A: 12, intro: 12, A2: 12 },
      harm: [{ p: 'arp8', i: 'xylophone', v: 0.32 }, { p: 'drone', i: 'strings', o: -12, v: 0.35 }],
      bass: { p: 'tresillo', i: 'contrabass', v: 0.85 }, drums: 'tribal', fx: ['owl'] },

    { name: 'ドワーフの溶鉱炉', mood: 'てつとほのおの鍛冶歌', theme: 'dungeon', mode: 'aeolian', key: 57, bpm: 132, room: 1.8, wet: 0.28,
      lead: { intro: 'brass', A: 'brass', A2: 'bassoon', B: 'horn' }, leadOct: { A2: -12 },
      harm: { def: [{ p: 'stab2', i: 'brass', o: -12, v: 0.5 }], A2: [{ p: 'stab2', i: 'brass', o: -12, v: 0.4 }, { p: 'power', i: 'distguitar', v: 0.45 }] },
      bass: { p: 'drive', i: 'tuba', v: 0.9 }, drums: 'smith', dv: 0.9, crash: true, fx: ['embers'] },

    { name: 'かがみの迷宮', mood: 'ゆがむ鏡像', theme: 'dungeon', mode: 'phrygian', key: 66, bpm: 108, room: 3.4, wet: 0.46,
      lead: { intro: 'glass', A: 'glass', A2: 'musicbox', B: 'violin' }, leadOct: { A: 12, intro: 12, A2: 12 },
      echo: { i: 'glass', d: 3, o: 12, v: 0.3 },
      harm: [{ p: 'arpup', i: 'celesta', v: 0.3 }, { p: 'pad', i: 'synthpad', o: -12, v: 0.4 }],
      bass: { p: 'half', i: 'contrabass', v: 0.7 }, drums: { def: 'ice', A2: 'ice2' }, fx: ['chimes'] },

    { name: 'しんかいの海溝', mood: 'くらやみの水圧', theme: 'dungeon', mode: 'aeolian', key: 55, bpm: 72, room: 4.8, wet: 0.55,
      lead: { intro: 'choir', A: 'choir', A2: 'ney', B: 'horn' }, leadOct: { A2: 12 },
      harm: [{ p: 'pad', i: 'synthpad', o: -12, v: 0.5 }, { p: 'trem', i: 'trem', o: -12, v: 0.3, sec: ['B'] }],
      bass: { p: 'pedal', i: 'organbass', v: 0.7 }, drums: 'gong', fx: ['drops'] },

    { name: 'りゅうの墓場', mood: 'ねむれる竜の挽歌', theme: 'dungeon', mode: 'harmonic', key: 57, bpm: 88, room: 3.8, wet: 0.46,
      lead: { intro: 'horn', A: 'horn', A2: 'choir', B: 'oboe' }, dbl: { A2: ['organ', -12, 0.35] },
      harm: [{ p: 'pad', i: 'organ', o: -12, v: 0.4 }, { p: 'trem', i: 'trem', v: 0.3, sec: ['A2', 'B'] }],
      bass: { p: 'sustain', i: 'contrabass', v: 0.8 }, drums: { def: 'toll', B: 'tollb' }, fx: ['wind'] },

    { name: 'まかいの荒野', mood: 'あれくるう魔の大地', theme: 'dungeon', mode: 'phrygdom', key: 61, bpm: 156, room: 2.0, wet: 0.28,
      lead: { intro: 'distlead', A: 'distlead', A2: 'brass', B: 'choir' }, leadOct: { A: 12, intro: 12 },
      harm: [{ p: 'power', i: 'distguitar', v: 0.5 }, { p: 'trem', i: 'trem', o: -12, v: 0.35 }],
      bass: { p: 'drive', i: 'contrabass', v: 0.9 }, drums: { def: 'taiko2', B: 'doom2' }, crash: true, fx: ['embers'] },

    { name: '魔王城', mood: 'まがまがしく、おごそかに', theme: 'dungeon', mode: 'harmonic', key: 60, bpm: 104, room: 4.2, wet: 0.46,
      lead: { intro: 'organ', A: 'organ', A2: 'choir', B: 'violin' }, leadOct: { B: 12 }, dbl: { A2: ['organ', -12, 0.5] },
      harm: [{ p: 'pad', i: 'organ', o: -12, v: 0.45 }, { p: 'trem', i: 'trem', v: 0.32, sec: ['A2', 'B'] }],
      bass: { p: 'sustain', i: 'organbass', v: 0.9 }, drums: { def: 'doom', A2: 'doom2' }, crash: true },
    // ---- the rift (post-game) ----
    { name: 'せかいじゅの こずえ', mood: 'こもれびの大樹', theme: 'dungeon', mode: 'lydian', key: 65, bpm: 112, room: 3.0, wet: 0.4,
      lead: { intro: 'recorder', A: 'flute', A2: 'strings', B: 'harp' }, leadOct: { A: 12, intro: 12, A2: 12 }, dbl: { A2: ['flute', 12, 0.35] },
      echo: { i: 'harp', d: 3, o: 12, v: 0.25, sec: ['A', 'B'] },
      harm: [{ p: 'arp8', i: 'harp', v: 0.4 }, { p: 'pad', i: 'strings', o: -12, v: 0.4 }],
      bass: { p: 'half', i: 'contrabass', v: 0.75 }, drums: { def: 'forest', A2: 'sky' }, fx: ['wind', 'chimes'] },

    { name: 'ゆめの かいろう', mood: 'ゆらめく夢うつつ', theme: 'dungeon', mode: 'dorian', key: 63, bpm: 84, swing: 0.33, room: 4.4, wet: 0.52,
      lead: { intro: 'musicbox', A: 'musicbox', A2: 'glass', B: 'celesta' }, leadOct: { def: 12, A: 12, intro: 12, B: 12 },
      echo: { i: 'glass', d: 6, o: 12, v: 0.25 },
      harm: [{ p: 'shimmer', i: 'celesta', o: 12, v: 0.25 }, { p: 'pad', i: 'synthpad', o: -12, v: 0.48 }],
      bass: { p: 'sustain', i: 'organbass', v: 0.6 }, drums: 'hush', dv: 0.6, fx: ['chimes'] },

    { name: 'いしの みやこ', mood: '石と化した都のしじま', theme: 'dungeon', mode: 'phrygian', key: 59, bpm: 96, room: 3.6, wet: 0.44, orn: 'grace',
      lead: { intro: 'ney', A: 'oboe', A2: 'ney', B: 'horn' }, leadOct: { A2: 12 },
      harm: [{ p: 'drone', i: 'strings', v: 0.4 }, { p: 'stab2', i: 'oud', o: -12, v: 0.3, sec: ['A2', 'B'] }],
      bass: { p: 'pedal', i: 'contrabass', v: 0.75 }, drums: { def: 'gong', B: 'toll' }, fx: ['wind'] },

    { name: 'てんかいの もん', mood: 'そらへつづく階段', theme: 'dungeon', mode: 'ionian', key: 67, bpm: 120, room: 4.0, wet: 0.44,
      lead: { intro: 'choir', A: 'trumpet', A2: 'strings', B: 'choir' }, leadOct: { A2: 12 }, dbl: { A: ['horn', -12, 0.35], A2: ['flute', 12, 0.4] },
      harm: [{ p: 'arp16', i: 'harp', v: 0.38 }, { p: 'pad', i: 'organ', o: -12, v: 0.4 }],
      bass: { p: 'march', i: 'contrabass', v: 0.85 }, drums: { def: 'sky', B: 'military2' }, crash: true, fx: ['chimes'] },

    { name: 'はかいしんの ざ', mood: 'ほうかいの序曲', theme: 'dungeon', mode: 'dblharm', key: 61, bpm: 132, room: 3.4, wet: 0.4,
      lead: { intro: 'choir', A: 'organ', A2: 'distlead', B: 'choir' }, leadOct: { A2: 12 }, dbl: { A: ['organ', -12, 0.45] },
      harm: { def: [{ p: 'trem', i: 'trem', o: -12, v: 0.42 }], A2: [{ p: 'trem', i: 'trem', o: -12, v: 0.38 }, { p: 'power', i: 'distguitar', v: 0.5 }] },
      bass: { p: 'drive', i: 'organbass', v: 0.9 }, drums: { def: 'doom2', A2: 'taikofast' }, crash: true, fx: ['embers', 'wind'] },
  ],

  // ---------------- たたかいのテーマ (boss) ----------------
  boss: {
    kingslime: { name: 'キングスライム', mood: 'ぷるぷる決戦', theme: 'boss', mode: 'mixolydian', key: 60, bpm: 140, room: 1.6, wet: 0.26,
      lead: { def: 'trumpet', B: 'xylophone', C: 'bassoon' }, leadOct: { B: 12, C: -12 }, stac: { A: 0.7, A2: 0.7, C: 0.6 },
      harm: [{ p: 'stab', i: 'pizz', v: 0.7 }, { p: 'oompah', i: 'brass', v: 0.35, sec: ['A2'] }],
      bass: { p: 'boss', i: 'pizzbass', v: 0.9 }, drums: { intro: 'bossintro', def: 'bosslight' }, crash: true },
    treant: { name: 'ジャイアントトレント', mood: 'もりのいかり', theme: 'boss', mode: 'dorian', key: 62, bpm: 132, room: 2.6, wet: 0.36,
      lead: { def: 'horn', B: 'strings', C: 'oboe' }, leadOct: { B: 12 },
      harm: [{ p: 'stab', i: 'strings', v: 0.5 }, { p: 'pad', i: 'strings', o: -12, v: 0.35, sec: ['B'] }],
      bass: { p: 'drive', i: 'contrabass', v: 0.9 }, drums: { intro: 'bossintro', def: 'tribal' } },
    goblinking: { name: 'ゴブリンキング', mood: 'ごうかいに', theme: 'boss', mode: 'dorian', key: 64, bpm: 138, swing: 0.3, room: 1.5, wet: 0.26,
      lead: { def: 'trumpet', B: 'clarinet', C: 'bassoon' }, leadOct: { C: -12 },
      harm: [{ p: 'stab', i: 'brass', o: -12, v: 0.5 }],
      bass: { p: 'gallop', i: 'tuba', v: 0.85 }, drums: { intro: 'bossintro', def: 'mineboss' }, crash: true },
    spiderqueen: { name: 'クイーンスパイダー', mood: 'からみつく', theme: 'boss', mode: 'harmonic', key: 64, bpm: 146, room: 2.6, wet: 0.36,
      lead: { def: 'xylophone', B: 'violin', C: 'harpsichord' }, leadOct: { def: 12, B: 12 },
      harm: [{ p: 'trem', i: 'trem', v: 0.45 }, { p: 'arp16', i: 'harpsichord', o: -12, v: 0.35, sec: ['A', 'A2', 'C'] }],
      bass: { p: 'drive', i: 'pizzbass', v: 0.9 }, drums: { intro: 'bossintro', def: 'boss' } },
    lich: { name: 'リッチ', mood: 'しのまじゅつ', theme: 'boss', mode: 'phrygian', key: 57, bpm: 134, room: 3.4, wet: 0.44,
      lead: { def: 'organ', B: 'choir', C: 'bell' },
      harm: { def: [{ p: 'trem', i: 'trem', v: 0.42 }], B: [{ p: 'trem', i: 'trem', v: 0.35 }, { p: 'pad', i: 'organ', o: -12, v: 0.4 }] },
      bass: { p: 'drive', i: 'organbass', v: 0.85 }, drums: { intro: 'bossintro', def: 'bossdoom' } },
    dragon: { name: 'えんりゅう', mood: 'ほのおのつばさ', theme: 'boss', mode: 'phrygdom', key: 64, bpm: 152, room: 2.0, wet: 0.3, orn: 'grace',
      lead: { def: 'brass', B: 'violin', C: 'guitar' }, leadOct: { B: 12 },
      harm: [{ p: 'strum', i: 'guitar', o: -12, v: 0.5 }, { p: 'stab', i: 'brass', v: 0.45, sec: ['A', 'A2'] }],
      bass: { p: 'tresillo', i: 'contrabass', v: 0.9 }, drums: { intro: 'bossintro', def: 'taiko2' } },
    icequeen: { name: 'こおりの女王', mood: 'こおてつく', theme: 'boss', mode: 'harmonic', key: 67, bpm: 144, room: 3.2, wet: 0.42,
      lead: { def: 'violin', B: 'celesta', C: 'flute' }, leadOct: { def: 12, B: 12, C: 12 },
      harm: [{ p: 'arp16', i: 'celesta', v: 0.3 }, { p: 'trem', i: 'trem', o: -12, v: 0.42 }],
      bass: { p: 'drive', i: 'contrabass', v: 0.85 }, drums: { intro: 'bossintro', def: 'bossice' } },
    thunderbird: { name: 'サンダーバード', mood: 'いかずちの空', theme: 'boss', mode: 'aeolian', key: 65, bpm: 160, room: 2.4, wet: 0.34,
      lead: { def: 'trumpet', B: 'strings', C: 'horn' }, leadOct: { B: 12 },
      harm: [{ p: 'stab', i: 'brass', o: -12, v: 0.5 }, { p: 'arp16', i: 'harp', v: 0.35 }],
      bass: { p: 'drive', i: 'contrabass', v: 0.9 }, drums: { intro: 'bossintro', def: 'thunder' }, crash: true },
    deathknight: { name: 'デスナイト', mood: 'くろがねの剣', theme: 'boss', mode: 'harmonic', key: 57, bpm: 136, room: 2.4, wet: 0.32,
      lead: { def: 'horn', B: 'trumpet', C: 'choir' },
      harm: [{ p: 'stab2', i: 'brass', o: -12, v: 0.5 }, { p: 'trem', i: 'trem', v: 0.3, sec: ['B', 'C'] }],
      bass: { p: 'gallop', i: 'contrabass', v: 0.9 }, drums: { intro: 'bossintro', def: 'military' }, crash: true },
    kraken: { name: 'クラーケン', mood: 'うずまく深海', theme: 'boss', mode: 'dorian', key: 60, bpm: 140, room: 3.8, wet: 0.46,
      lead: { def: 'choir', B: 'horn', C: 'harp' }, leadOct: { C: 12 },
      harm: [{ p: 'arp16', i: 'harp', v: 0.38 }, { p: 'trem', i: 'trem', o: -12, v: 0.4 }],
      bass: { p: 'drive', i: 'contrabass', v: 0.9 }, drums: { intro: 'bossintro', def: 'tribal' }, fx: ['drops'] },
    pharaoh: { name: 'ファラオ', mood: 'すなのおう', theme: 'boss', mode: 'dblharm', key: 62, bpm: 144, room: 2.4, wet: 0.32, orn: 'grace',
      lead: { def: 'oud', B: 'ney', C: 'oud' }, leadOct: { B: 12 },
      harm: [{ p: 'drone', i: 'strings', v: 0.38 }, { p: 'stab', i: 'strings', v: 0.42 }],
      bass: { p: 'drive', i: 'pizzbass', v: 0.85 }, drums: { intro: 'bossintro', def: 'maqsumfast' } },
    clockmachine: { name: 'クロックマシン', mood: 'くるう歯車', theme: 'boss', mode: 'aeolian', key: 64, bpm: 150, room: 1.8, wet: 0.28,
      lead: { def: 'harpsichord', B: 'organ', C: 'musicbox' }, leadOct: { C: 12 },
      harm: [{ p: 'alberti', i: 'harpsichord', o: -12, v: 0.5 }, { p: 'stab', i: 'brass', o: -12, v: 0.35, sec: ['B'] }],
      bass: { p: 'drive', i: 'bassoon', v: 0.85 }, drums: { intro: 'bossintro', def: 'clockboss' } },
    voideye: { name: 'ヴォイドアイ', mood: 'きょむのまなざし', theme: 'boss', mode: 'phrygian', key: 61, bpm: 132, room: 4.4, wet: 0.5,
      lead: { def: 'choir', B: 'glass', C: 'distlead' }, leadOct: { B: 12 },
      harm: [{ p: 'pad', i: 'synthpad', v: 0.45 }, { p: 'trem', i: 'trem', o: -12, v: 0.35 }],
      bass: { p: 'drive', i: 'organbass', v: 0.85 }, drums: { intro: 'bossintro', def: 'gongboss' }, fx: ['chimes'] },
    cerberus: { name: 'ケルベロス', mood: 'みつくびの番犬', theme: 'boss', mode: 'phrygdom', key: 62, bpm: 160, room: 2.0, wet: 0.28,
      lead: { def: 'distlead', B: 'brass', C: 'choir' }, leadOct: { def: 12 },
      harm: [{ p: 'power', i: 'distguitar', v: 0.55 }, { p: 'trem', i: 'trem', o: -12, v: 0.35 }],
      bass: { p: 'drive', i: 'contrabass', v: 0.9 }, drums: { intro: 'bossintro', def: 'taikofast' }, fx: ['embers'] },
    hydra: { name: 'ヒュドラ', mood: 'どくの多頭竜', theme: 'boss', mode: 'phrygian', key: 58, bpm: 150, room: 2.6, wet: 0.36,
      lead: { def: 'brass', B: 'oboe', C: 'distlead' }, leadOct: { B: 12 },
      harm: [{ p: 'trem', i: 'trem', v: 0.4 }, { p: 'stab', i: 'brass', o: -12, v: 0.4, sec: ['A', 'A2'] }],
      bass: { p: 'drive', i: 'contrabass', v: 0.9 }, drums: { intro: 'bossintro', def: 'tribal' }, fx: ['drops'] },
    ghostcaptain: { name: 'ゆうれいせんちょう', mood: 'まぼろしの決闘', theme: 'boss', mode: 'dorian', key: 62, bpm: 152, swing: 0.3, room: 2.6, wet: 0.36,
      lead: { def: 'violin', B: 'clarinet', C: 'trumpet' }, leadOct: { def: 12 },
      harm: [{ p: 'oompah', i: 'strings', v: 0.45 }, { p: 'stab', i: 'brass', o: -12, v: 0.35, sec: ['B', 'C'] }],
      bass: { p: 'gallop', i: 'contrabass', v: 0.85 }, drums: { intro: 'bossintro', def: 'mineboss' }, crash: true },
    cyclops: { name: 'サイクロプス', mood: 'きょじんの一撃', theme: 'boss', mode: 'mixolydian', key: 60, bpm: 136, room: 2.4, wet: 0.32,
      lead: { def: 'horn', B: 'brass', C: 'bassoon' }, leadOct: { C: -12 },
      harm: [{ p: 'power', i: 'distguitar', v: 0.45 }, { p: 'stab', i: 'brass', o: -12, v: 0.45 }],
      bass: { p: 'drive', i: 'tuba', v: 0.9 }, drums: { intro: 'bossintro', def: 'taiko2' }, crash: true },
    archmage: { name: 'だいまどうし', mood: 'ひじゅつの嵐', theme: 'boss', mode: 'harmonic', key: 64, bpm: 148, room: 3.2, wet: 0.42,
      lead: { def: 'harpsichord', B: 'choir', C: 'celesta' }, leadOct: { C: 12 },
      harm: [{ p: 'arp16', i: 'harpsichord', o: -12, v: 0.35 }, { p: 'pad', i: 'organ', o: -12, v: 0.4 }],
      bass: { p: 'drive', i: 'organbass', v: 0.85 }, drums: { intro: 'bossintro', def: 'bossdoom' }, fx: ['chimes'] },
    quetzal: { name: 'ケツァルコアトル', mood: 'はねある蛇神', theme: 'boss', mode: 'lydian', key: 65, bpm: 158, room: 2.4, wet: 0.34,
      lead: { def: 'flute', B: 'trumpet', C: 'xylophone' }, leadOct: { def: 12, C: 12 },
      harm: [{ p: 'arp16', i: 'harp', v: 0.38 }, { p: 'stab', i: 'strings', v: 0.42 }],
      bass: { p: 'tresillo', i: 'contrabass', v: 0.9 }, drums: { intro: 'bossintro', def: 'thunder' }, crash: true },
    colossus: { name: 'くろがねの巨兵', mood: 'くろがねの進撃', theme: 'boss', mode: 'aeolian', key: 55, bpm: 138, room: 2.2, wet: 0.3,
      lead: { def: 'brass', B: 'horn', C: 'distlead' }, leadOct: { C: 12 },
      harm: [{ p: 'stab2', i: 'brass', o: -12, v: 0.5 }, { p: 'power', i: 'distguitar', v: 0.45, sec: ['A2', 'C'] }],
      bass: { p: 'drive', i: 'tuba', v: 0.9 }, drums: { intro: 'bossintro', def: 'boss' }, crash: true, fx: ['embers'] },
    shadowhero: { name: 'かげの勇者', mood: 'もうひとりの勇者', theme: 'boss', mode: 'aeolian', key: 62, bpm: 150, room: 2.6, wet: 0.34,
      lead: { def: 'trumpet', B: 'strings', C: 'horn' }, leadOct: { B: 12 }, dbl: { A2: ['strings', 12, 0.4] },
      harm: [{ p: 'stab', i: 'brass', o: -12, v: 0.45 }, { p: 'trem', i: 'trem', v: 0.32 }],
      bass: { p: 'gallop', i: 'contrabass', v: 0.9 }, drums: { intro: 'bossintro', def: 'boss' }, crash: true },
    leviathan: { name: 'リヴァイアサン', mood: 'うみの覇王', theme: 'boss', mode: 'dorian', key: 57, bpm: 146, room: 4.0, wet: 0.46,
      lead: { def: 'choir', B: 'horn', C: 'strings' }, leadOct: { C: 12 },
      harm: [{ p: 'arp16', i: 'harp', v: 0.36 }, { p: 'trem', i: 'trem', o: -12, v: 0.4 }],
      bass: { p: 'drive', i: 'contrabass', v: 0.9 }, drums: { intro: 'bossintro', def: 'gongboss' }, fx: ['drops'] },
    bonedragon: { name: 'ボーンドラゴン', mood: 'しせる竜のさけび', theme: 'boss', mode: 'phrygdom', key: 57, bpm: 150, room: 3.4, wet: 0.42,
      lead: { def: 'organ', B: 'choir', C: 'distlead' }, leadOct: { C: 12 },
      harm: [{ p: 'trem', i: 'trem', v: 0.4 }, { p: 'pad', i: 'organ', o: -12, v: 0.38 }],
      bass: { p: 'drive', i: 'organbass', v: 0.85 }, drums: { intro: 'bossintro', def: 'bossdoom' }, fx: ['wind'] },
    demongeneral: { name: 'まぐんしょうぐん', mood: 'まぐんの総攻撃', theme: 'boss', mode: 'harmonic', key: 62, bpm: 162, room: 2.2, wet: 0.3,
      lead: { def: 'brass', B: 'distlead', C: 'choir' }, leadOct: { B: 12 },
      harm: [{ p: 'power', i: 'distguitar', v: 0.5 }, { p: 'stab', i: 'brass', o: -12, v: 0.42 }],
      bass: { p: 'drive', i: 'contrabass', v: 0.9 }, drums: { intro: 'bossintro', def: 'taikofast' }, crash: true, fx: ['embers'] },
    maou: { name: 'まおう', mood: 'さいごのたたかい', theme: 'boss', mode: 'harmonic', key: 60, bpm: 144, room: 3.6, wet: 0.4,
      lead: { intro: 'organ', A: 'brass', A2: 'brass', B: 'choir', C: 'organ' }, dbl: { A: ['strings', 12, 0.45], A2: ['strings', 12, 0.45], B: ['violin', 12, 0.4] },
      harm: [{ p: 'pad', i: 'organ', o: -12, v: 0.4 }, { p: 'trem', i: 'trem', v: 0.32 }, { p: 'stab', i: 'brass', o: -12, v: 0.4, sec: ['A', 'A2'] }],
      bass: { p: 'drive', i: 'organbass', v: 0.9 }, drums: { intro: 'bossintro', def: 'final' }, crash: true,
      rage: { key: 1, tempo: 1.05, dbl: ['choir', 12, 0.5] } },
    fenrir: { name: 'フェンリル', mood: 'いてつく牙', theme: 'boss', mode: 'aeolian', key: 62, bpm: 156, room: 3.2, wet: 0.4,
      lead: { def: 'horn', B: 'strings', C: 'flute' }, leadOct: { B: 12, C: 12 }, dbl: { A2: ['strings', 12, 0.4] },
      harm: [{ p: 'trem', i: 'trem', v: 0.4 }, { p: 'stab', i: 'brass', o: -12, v: 0.42 }],
      bass: { p: 'gallop', i: 'contrabass', v: 0.9 }, drums: { intro: 'bossintro', def: 'bossice' }, crash: true, fx: ['wind'] },
    nightmare: { name: 'ナイトメア', mood: 'あくむの疾走', theme: 'boss', mode: 'harmonic', key: 61, bpm: 160, room: 3.4, wet: 0.42,
      lead: { def: 'violin', B: 'glass', C: 'choir' }, leadOct: { B: 12 },
      harm: [{ p: 'arp16', i: 'harpsichord', o: -12, v: 0.34 }, { p: 'pad', i: 'synthpad', o: -12, v: 0.42 }],
      bass: { p: 'gallop', i: 'organbass', v: 0.85 }, drums: { intro: 'bossintro', def: 'boss' }, fx: ['chimes'] },
    gorgon: { name: 'ゴルゴーン', mood: 'せきかの魔眼', theme: 'boss', mode: 'phrygdom', key: 64, bpm: 150, room: 2.6, wet: 0.34, orn: 'grace',
      lead: { def: 'oud', B: 'ney', C: 'brass' }, leadOct: { B: 12 },
      harm: [{ p: 'drone', i: 'strings', v: 0.38 }, { p: 'stab2', i: 'oud', o: -12, v: 0.36 }],
      bass: { p: 'maqsum', i: 'pizzbass', v: 0.85 }, drums: { intro: 'bossintro', def: 'maqsumfast' }, crash: true },
    fallenangel: { name: 'だてんし', mood: 'おちた天使の讃美歌', theme: 'boss', mode: 'harmonic', key: 62, bpm: 148, room: 4.2, wet: 0.46,
      lead: { def: 'choir', B: 'organ', C: 'violin' }, leadOct: { C: 12 }, dbl: { A: ['strings', 12, 0.4], A2: ['brass', -12, 0.4] },
      harm: [{ p: 'pad', i: 'organ', o: -12, v: 0.4 }, { p: 'arp16', i: 'harp', v: 0.34 }],
      bass: { p: 'drive', i: 'organbass', v: 0.88 }, drums: { intro: 'bossintro', def: 'gongboss' }, crash: true, fx: ['chimes'] },
    hakaishin: { name: 'はかいしん', mood: 'せかいの終わりのたたかい', theme: 'boss', mode: 'harmonic', key: 61, bpm: 152, room: 3.8, wet: 0.42,
      lead: { intro: 'choir', A: 'brass', A2: 'distlead', B: 'choir', C: 'organ' }, leadOct: { A2: 12 }, dbl: { A: ['strings', 12, 0.45], B: ['violin', 12, 0.4] },
      harm: [{ p: 'pad', i: 'organ', o: -12, v: 0.4 }, { p: 'trem', i: 'trem', v: 0.32 }, { p: 'power', i: 'distguitar', v: 0.45, sec: ['A2', 'C'] }],
      bass: { p: 'drive', i: 'organbass', v: 0.92 }, drums: { intro: 'bossintro', def: 'final' }, crash: true,
      rage: { key: 1, tempo: 1.06, dbl: ['choir', 12, 0.5] } },
  },

  // ---------------- 村のワルツ (town) ----------------
  town: {
    name: '村のワルツ', mood: 'のどかに', theme: 'town', mode: 'ionian', key: 65, bpm: 104, room: 2.0, wet: 0.32,
    lead: { def: 'flute', B: 'oboe' }, leadOct: { def: 12, B: 0 },
    harm: { def: [{ p: 'waltz', i: 'strings', v: 0.42 }], B: [{ p: 'waltz', i: 'strings', v: 0.4 }, { p: 'arp8', i: 'harp', v: 0.4 }] },
    bass: { p: 'waltz2', i: 'pizzbass', v: 0.8 }, drums: 'waltz', dv: 0.8,
    layers: {
      gate: {},
      house: { name: '勇者の家', lead: { def: 'musicbox' }, leadOct: { def: 12 }, harm: [{ p: 'waltz', i: 'harp', v: 0.45 }],
        bass: { p: 'waltz', i: 'harp', o: 12, v: 0.7 }, drums: 'hush' },
      item: { name: 'どうぐや', lead: { def: 'clarinet', B: 'xylophone' }, leadOct: { def: 0, B: 12 }, echo: { i: 'celesta', d: 2, o: 24, v: 0.2 },
        harm: [{ p: 'waltz', i: 'pizz', v: 0.7 }], bass: { p: 'waltz2', i: 'pizzbass', v: 0.85 }, drums: 'waltzbright' },
      smith: { name: 'かじや', lead: { def: 'horn', B: 'bassoon' }, leadOct: { def: 0, B: -12 },
        harm: [{ p: 'waltz', i: 'brass', o: -12, v: 0.4 }], bass: { p: 'waltz', i: 'tuba', v: 0.85 }, drums: 'smith' },
    },
  },
};

// ---- measured mix: K-weighted stems balanced to lead (harm -3 dB, bass -5 dB, perc <= -5 dB), loudness matched ----
const FMIX = {"d4":{"harm":-3.5,"bass":0.5,"perc":12,"gain":1.75},"d2":{"harm":-0.2,"bass":1.1,"perc":0,"gain":1.22},"d3":{"harm":-0.4,"bass":-6.3,"perc":-5.8,"gain":1.93},"d1":{"harm":7.4,"bass":2.5,"perc":-4.2,"gain":1.23},"d7":{"harm":-2.1,"bass":-0.3,"perc":2,"gain":1.55},"d5":{"harm":4.6,"bass":0.1,"perc":0,"gain":1.64},"d8":{"harm":0.2,"bass":1.5,"perc":-2.4,"gain":1.04},"d6":{"harm":0.1,"bass":-1.9,"perc":-7.9,"gain":1.45},"d10":{"harm":-1.0,"bass":0.5,"perc":12,"gain":1.48},"d9":{"harm":2.2,"bass":1.6,"perc":-6.5,"gain":1.1},"d12":{"harm":4.4,"bass":3.7,"perc":0,"gain":2.0},"d11":{"harm":1.9,"bass":-1.8,"perc":-3.2,"gain":1.45},"d14":{"harm":5.4,"bass":-0.2,"perc":-13.0,"gain":1.2},"b_kingslime":{"harm":-3.2,"bass":-5.9,"perc":-2.8,"gain":1.48},"d13":{"harm":-2.5,"bass":-1.0,"perc":2,"gain":1.72},"b_treant":{"harm":3.1,"bass":1.0,"perc":-10.7,"gain":1.11},"b_lich":{"harm":2.4,"bass":-0.3,"perc":-9.4,"gain":1.33},"b_goblinking":{"harm":1.6,"bass":1.0,"perc":-5.1,"gain":1.23},"b_spiderqueen":{"harm":6.3,"bass":-4.4,"perc":-6.0,"gain":1.09},"b_icequeen":{"harm":5.1,"bass":1.3,"perc":-2.2,"gain":1.07},"b_deathknight":{"harm":1.4,"bass":2.1,"perc":-7.9,"gain":1.16},"b_dragon":{"harm":2.7,"bass":0.6,"perc":-13.8,"gain":1.14},"b_thunderbird":{"harm":1.1,"bass":0.9,"perc":-8.1,"gain":1.1},"b_kraken":{"harm":0.1,"bass":-0.7,"perc":-14.1,"gain":1.43},"b_pharaoh":{"harm":1.9,"bass":-3.0,"perc":-4.5,"gain":1.14},"b_clockmachine":{"harm":4.5,"bass":-1.5,"perc":-6.0,"gain":1.48},"t_gate":{"harm":8.9,"bass":2.0,"perc":12,"gain":1.18},"b_voideye":{"harm":-0.6,"bass":-3.1,"perc":-14.5,"gain":1.59},"b_cerberus":{"harm":3.9,"bass":1.3,"perc":-13.9,"gain":1.09},"t_house":{"harm":0.2,"bass":0.1,"perc":12,"gain":2.04},"t_item":{"harm":3.0,"bass":0.6,"perc":10,"gain":1.29},"t_smith":{"harm":8.2,"bass":6.5,"perc":0,"gain":1.22},"b_maou":{"harm":-1.1,"bass":0.4,"perc":-7.9,"gain":1.06},"d25":{"harm":-2.6,"bass":-1.9,"perc":-8.0,"gain":1.29},"d15":{"harm":-3.3,"bass":-1.0,"perc":0,"gain":1.72},"d17":{"harm":0.7,"bass":3.4,"perc":-10.9,"gain":1.12},"d16":{"harm":2.5,"bass":-1.4,"perc":-2.8,"gain":1.27},"d19":{"harm":3.5,"bass":-0.4,"perc":-11.2,"gain":1.23},"d18":{"harm":2.6,"bass":-2.3,"perc":4,"gain":1.88},"d23":{"harm":-0.2,"bass":2.9,"perc":-0.2,"gain":1.14},"d22":{"harm":-1.8,"bass":1.9,"perc":2,"gain":1.87},"d21":{"harm":0.6,"bass":0.6,"perc":0,"gain":1.39},"d20":{"harm":0,"bass":0.1,"perc":0,"gain":1.39},"b_hydra":{"harm":5.1,"bass":1.5,"perc":-11.4,"gain":1.18},"b_ghostcaptain":{"harm":6.1,"bass":1.8,"perc":-4.1,"gain":1.09},"d24":{"harm":3.1,"bass":0.1,"perc":-13.7,"gain":1.16},"b_cyclops":{"harm":0.8,"bass":1.4,"perc":-13.2,"gain":1.18},"b_archmage":{"harm":-2.2,"bass":-2.0,"perc":-9.2,"gain":1.29},"b_colossus":{"harm":1.2,"bass":2.5,"perc":-6.0,"gain":1.22},"b_quetzal":{"harm":2.6,"bass":0.8,"perc":-8.0,"gain":1.06},"b_shadowhero":{"harm":3.3,"bass":1.2,"perc":-6.2,"gain":1.11},"b_bonedragon":{"harm":-2.8,"bass":-0.8,"perc":-11.6,"gain":1.37},"b_leviathan":{"harm":-0.3,"bass":0.1,"perc":-11.5,"gain":1.41},"b_demongeneral":{"harm":1.1,"bass":0.8,"perc":-14.1,"gain":1.15},"d28":{"harm":1.9,"bass":2.3,"perc":4,"gain":1.5},"d27":{"harm":-2.9,"bass":-1.8,"perc":4,"gain":1.86},"d30":{"harm":6.9,"bass":-0.3,"perc":-8.7,"gain":0.98},"d26":{"harm":0.9,"bass":1.8,"perc":0,"gain":1.1},"d29":{"harm":-1.6,"bass":3.9,"perc":-1.7,"gain":1.05},"b_gorgon":{"harm":0.8,"bass":-0.5,"perc":-3.5,"gain":1.05},"b_nightmare":{"harm":1.0,"bass":-1.3,"perc":-7.9,"gain":1.29},"b_fenrir":{"harm":3.7,"bass":1.5,"perc":-2.6,"gain":1.09},"b_fallenangel":{"harm":-2.9,"bass":-1.7,"perc":-10.4,"gain":1.26},"b_hakaishin":{"harm":-0.1,"bass":-0.1,"perc":-7.8,"gain":1.04}};
(function () {   // apply the measured mix (FMIX) to every arrangement
  FARR.dungeon.forEach((a, i) => Object.assign(a, { mix: FMIX['d' + (i + 1)], gain: (FMIX['d' + (i + 1)] || {}).gain }));
  for (const k in FARR.boss) if (FMIX['b_' + k]) Object.assign(FARR.boss[k], { mix: FMIX['b_' + k], gain: FMIX['b_' + k].gain });
  const T = FARR.town; if (FMIX.t_gate) Object.assign(T, { mix: FMIX.t_gate, gain: FMIX.t_gate.gain });
  for (const k in T.layers) { const m = FMIX['t_' + k]; if (m) Object.assign(T.layers[k], { mix: m, gain: m.gain }); }
})();
