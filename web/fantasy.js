// =============================================================
//  ぶつかり勇者 — fantasy orchestra engine (Web Audio, no samples)
//
//  Three original themes — DUNGEON (冒険のマーチ), BOSS (たたかいのテーマ)
//  and TOWN (村のワルツ) — are written in SCALE DEGREES (0 = tonic,
//  7 = octave, negatives go down). An ARRANGEMENT (arrangements.js)
//  re-casts a theme: mode (major / minor / phrygian ...), key, tempo,
//  swing, instruments per section, accompaniment layers, bass line,
//  drums, ambience and reverb. So the forest plays the march in a dark
//  natural minor with flutes, the volcano plays it as flamenco, etc.
//
//  Shares the AudioContext + BGM volume of music.js (Music._ctx()).
// =============================================================
const FMusic = (() => {
  let ac = null, out = null;
  const assets = new WeakMap();     // per-context noise buffer + reverb IRs
  const events = [];
  let S = null;                      // current session
  let LITE = false;                  // true while voicing accompaniment: cheaper voices (phones!)
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const mod = (a, n) => ((a % n) + n) % n;

  // ---------------------------------------------------------------
  //  MODES — s: scale used for melody + chords; dom: scale used in bars
  //  whose chord is on degree 4 (the dominant), e.g. the raised leading
  //  tone of harmonic minor.
  // ---------------------------------------------------------------
  const SC = {
    ionian: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10], aeolian: [0, 2, 3, 5, 7, 8, 10],
    harmonic: [0, 2, 3, 5, 7, 8, 11], melodic: [0, 2, 3, 5, 7, 9, 11], phrygdom: [0, 1, 4, 5, 7, 8, 10],
    dblharm: [0, 1, 4, 5, 7, 8, 11],
  };
  const MODES = {
    ionian: { s: SC.ionian }, lydian: { s: SC.lydian }, mixolydian: { s: SC.mixolydian, dom: SC.ionian },
    dorian: { s: SC.dorian, dom: SC.melodic }, aeolian: { s: SC.aeolian }, harmonic: { s: SC.aeolian, dom: SC.harmonic },
    phrygian: { s: SC.phrygian }, phrygdom: { s: SC.phrygdom }, dblharm: { s: SC.dblharm },
  };

  // ---------------------------------------------------------------
  //  THEMES  (bars: ch = chord root degree, mel = [step, degree, length(16ths), accidental?])
  // ---------------------------------------------------------------
  const THEMES = {
    // 冒険のマーチ — heroic 4/4 march, major. intro(2) | A(8) A2(8) B(8) → loop
    dungeon: {
      spb: 16,
      intro: { ch: [0, 4], mel: [[[0, -3, 2], [2, -3, 1], [3, -3, 1], [4, 0, 4], [8, -3, 2], [10, 0, 2], [12, 2, 4]], [[0, 4, 12]]] },
      sec: {
        A: {
          ch: [0, 3, 4, 0, 5, 3, 4, 4], mel: [
            [[0, -3, 3], [3, 0, 1], [4, 2, 4], [8, 4, 6], [14, 2, 2]],
            [[0, 3, 3], [3, 2, 1], [4, 1, 2], [6, 0, 2], [8, 5, 8]],
            [[0, 4, 3], [3, 3, 1], [4, 2, 2], [6, 3, 2], [8, 1, 4], [12, -1, 4]],
            [[0, 0, 12], [12, -3, 2], [14, -2, 2]],
            [[0, 0, 3], [3, 2, 1], [4, 5, 4], [8, 4, 4], [12, 2, 4]],
            [[0, 3, 3], [3, 5, 1], [4, 7, 4], [8, 5, 2], [10, 3, 2], [12, 5, 4]],
            [[0, 4, 6], [6, 3, 2], [8, 2, 2], [10, 3, 2], [12, 1, 4]],
            [[0, 4, 12], [12, 4, 1], [13, 5, 1], [14, 6, 2]],
          ],
        },
        A2: {
          ch: [0, 3, 4, 5, 3, 4, 0, 0], mel: [
            [[0, 7, 3], [3, 4, 1], [4, 2, 4], [8, 4, 6], [14, 7, 2]],
            [[0, 8, 3], [3, 7, 1], [4, 5, 2], [6, 3, 2], [8, 5, 8]],
            [[0, 6, 3], [3, 5, 1], [4, 4, 2], [6, 3, 2], [8, 4, 4], [12, 8, 4]],
            [[0, 7, 8], [8, 6, 2], [10, 5, 2], [12, 4, 4]],
            [[0, 5, 3], [3, 3, 1], [4, 5, 4], [8, 7, 4], [12, 9, 4]],
            [[0, 8, 6], [6, 7, 2], [8, 6, 4], [12, 4, 4]],
            [[0, 7, 8], [8, 4, 4], [12, 2, 4]],
            [[0, 0, 8], [8, 2, 2], [10, 3, 2], [12, 4, 4]],
          ],
        },
        B: {
          ch: [5, 2, 3, 0, 1, 4, 5, 4], mel: [
            [[0, 5, 6], [6, 4, 2], [8, 5, 4], [12, 7, 4]],
            [[0, 6, 8], [8, 4, 8]],
            [[0, 3, 6], [6, 5, 2], [8, 7, 4], [12, 8, 4]],
            [[0, 9, 8], [8, 7, 4], [12, 4, 4]],
            [[0, 3, 3], [3, 2, 1], [4, 1, 4], [8, 3, 4], [12, 5, 4]],
            [[0, 4, 6], [6, 6, 2], [8, 8, 8]],
            [[0, 5, 3], [3, 6, 1], [4, 7, 4], [8, 9, 4], [12, 7, 4]],
            [[0, 8, 8], [8, 6, 4], [12, 4, 4]],
          ],
        },
      },
      order: ['A', 'A2', 'B'],
    },

    // たたかいのテーマ — driving minor battle theme. intro(4) | A(8) B(8) A2(8) C(4) → loop
    boss: {
      spb: 16,
      intro: { ch: [0, 0, 5, 4], mel: [[], [], [[0, 0, 4], [4, 2, 4], [8, 5, 4], [12, 7, 4]], [[0, 4, 8], [8, 6, 4], [12, 8, 4]]] },
      sec: {
        A: {
          ch: [0, 0, 5, 6, 0, 0, 3, 4], mel: [
            [[0, 0, 2], [2, 0, 1], [3, 0, 1], [4, 4, 4], [8, 3, 2], [10, 2, 2], [12, 1, 2], [14, 2, 2]],
            [[0, 0, 6], [6, -1, 2], [8, 0, 2], [10, 2, 2], [12, 4, 4]],
            [[0, 5, 2], [2, 5, 1], [3, 5, 1], [4, 7, 4], [8, 6, 2], [10, 5, 2], [12, 4, 2], [14, 5, 2]],
            [[0, 6, 6], [6, 3, 2], [8, 6, 4], [12, 8, 4]],
            [[0, 7, 2], [2, 7, 1], [3, 7, 1], [4, 9, 4], [8, 8, 2], [10, 7, 2], [12, 6, 2], [14, 7, 2]],
            [[0, 4, 6], [6, 2, 2], [8, 4, 4], [12, 7, 4]],
            [[0, 10, 3], [3, 9, 1], [4, 8, 2], [6, 7, 2], [8, 8, 2], [10, 7, 2], [12, 5, 4]],
            [[0, 4, 6], [6, 3, 1], [7, 4, 1], [8, 6, 4], [12, 4, 4]],
          ],
        },
        B: {
          ch: [5, 6, 2, 5, 3, 6, 4, 4], mel: [
            [[0, 7, 8], [8, 5, 4], [12, 7, 4]],
            [[0, 8, 6], [6, 9, 2], [8, 10, 8]],
            [[0, 9, 12], [12, 8, 2], [14, 6, 2]],
            [[0, 9, 4], [4, 8, 2], [6, 7, 2], [8, 5, 8]],
            [[0, 3, 6], [6, 5, 2], [8, 7, 4], [12, 10, 4]],
            [[0, 9, 6], [6, 8, 2], [8, 6, 4], [12, 8, 4]],
            [[0, 7, 6], [6, 6, 2], [8, 4, 8]],
            [[0, 4, 8], [8, 6, 2], [10, 7, 2], [12, 8, 2], [14, 6, 2]],
          ],
        },
        C: {
          ch: [0, 5, 3, 4], mel: [
            [[0, 0, 4], [4, 1, 4], [8, 2, 4], [12, 1, 4]],
            [[0, 0, 4], [4, 1, 4], [8, 2, 4], [12, 5, 4]],
            [[0, 3, 4], [4, 2, 4], [8, 1, 4], [12, 3, 4]],
            [[0, 4, 16]],
          ],
        },
      },
      order: ['A', 'B', 'A2', 'C'],
    },

    // 村のワルツ — warm 3/4 waltz, major. intro(2) | A(8) A2(8) B(8) A2(8) → loop
    town: {
      spb: 12,
      intro: { ch: [0, 4], mel: [[], []] },
      sec: {
        A: {
          ch: [0, 0, 3, 0, 1, 4, 0, 4], mel: [
            [[0, 4, 6], [6, 5, 2], [8, 4, 4]],
            [[0, 2, 8], [8, 0, 4]],
            [[0, 3, 6], [6, 4, 2], [8, 5, 4]],
            [[0, 4, 12]],
            [[0, 5, 6], [6, 4, 2], [8, 3, 4]],
            [[0, 4, 4], [4, 6, 4], [8, 8, 4]],
            [[0, 7, 6], [6, 6, 2], [8, 4, 4]],
            [[0, 1, 12]],
          ],
        },
        A2: {
          ch: [0, 5, 3, 4, 0, 4, 0, 0], mel: [
            [[0, 4, 6], [6, 5, 2], [8, 4, 4]],
            [[0, 9, 8], [8, 7, 4]],
            [[0, 8, 6], [6, 7, 2], [8, 5, 4]],
            [[0, 4, 12]],
            [[0, 2, 6], [6, 3, 2], [8, 4, 4]],
            [[0, 8, 4], [4, 6, 4], [8, 4, 4]],
            [[0, 7, 12]],
            [[0, 0, 4], [4, 2, 4], [8, 4, 4]],
          ],
        },
        B: {
          ch: [5, 2, 3, 0, 1, 4, 3, 4], mel: [
            [[0, 5, 8], [8, 4, 4]],
            [[0, 6, 6], [6, 5, 2], [8, 4, 4]],
            [[0, 3, 8], [8, 5, 4]],
            [[0, 4, 12]],
            [[0, 3, 4], [4, 5, 4], [8, 8, 4]],
            [[0, 8, 6], [6, 7, 2], [8, 6, 4]],
            [[0, 5, 4], [4, 7, 4], [8, 5, 4]],
            [[0, 4, 12]],
          ],
        },
      },
      order: ['A', 'A2', 'B', 'A2'],
    },
  };
  THEMES.boss.sec.A2 = THEMES.boss.sec.A;

  // ---------------------------------------------------------------
  //  CONTEXT / ASSETS
  // ---------------------------------------------------------------
  // ---- audio output: BGM bus + SFX bus -> compressor -> speakers ----
  let liveAc = null, bgmBus = null, sfxBus = null, sfxOut = null, sfxRev = null;
  const vol = { bgm: 1, sfx: 1 };
  function init() {
    if (liveAc) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ac = liveAc = new AC({ latencyHint: 'balanced' }); } catch (e) { ac = liveAc = new AC(); }
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.1;
    const master = ac.createGain(); master.gain.value = 0.9;
    comp.connect(master); master.connect(ac.destination);
    bgmBus = ac.createGain(); bgmBus.gain.value = vol.bgm; bgmBus.connect(comp);
    sfxBus = ac.createGain(); sfxBus.gain.value = vol.sfx; sfxBus.connect(comp);
    out = bgmBus; sfxOut = sfxBus;
    // a little room on the effects so they sit in the same world as the music
    sfxRev = ac.createConvolver(); sfxRev.buffer = IR(1.1); const wet = ac.createGain(); wet.gain.value = 0.22; sfxRev.connect(wet); wet.connect(sfxBus);
    return true;
  }
  function bind() { return !!ac || init(); }
  function resume() { if (liveAc && liveAc.state !== 'running') liveAc.resume(); }
  function suspend() { if (liveAc && liveAc.state === 'running') liveAc.suspend(); }
  function setVolume(b, s) {
    vol.bgm = b; vol.sfx = s;
    if (!liveAc) return;
    bgmBus.gain.setTargetAtTime(Math.max(0.0001, b), liveAc.currentTime, 0.03);
    sfxBus.gain.setTargetAtTime(Math.max(0.0001, s), liveAc.currentTime, 0.03);
  }
  function A_() {
    let a = assets.get(ac);
    if (!a) {
      const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      a = { noise: nb, ir: {} }; assets.set(ac, a);
    }
    return a;
  }
  // synthetic hall: decaying stereo noise that gets darker as it fades
  function IR(sec) {
    const a = A_(), k = sec.toFixed(1);
    if (a.ir[k]) return a.ir[k];
    const sr = ac.sampleRate, len = Math.floor(sr * sec), b = ac.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c); let y = 0;
      for (let i = 0; i < len; i++) {
        const p = i / len, x = (Math.random() * 2 - 1) * Math.pow(1 - p, 2.4);
        const k2 = 0.85 - 0.7 * p; y += k2 * (x - y);
        d[i] = i < sr * 0.012 ? y * (i / (sr * 0.012)) : y;
      }
    }
    return (a.ir[k] = b);
  }

  // ---------------------------------------------------------------
  //  BUILDING BLOCKS
  // ---------------------------------------------------------------
  const VOICE_SOFT = 56, VOICE_HARD = 80;   // oscillators ringing at once
  const live = [];   // end times of the oscillators running on the live context
  function liveCount(t) { let n = 0, w = 0; for (let i = 0; i < live.length; i++) if (live[i] > t) { live[w++] = live[i]; n++; } live.length = w; return n; }
  function O(type, f, t, end, dest, det) {
    if (ac === liveAc) live.push(end);
    const o = ac.createOscillator(); o.type = type; o.frequency.value = f;
    if (det) o.detune.value = det;
    o.connect(dest); o.start(t); o.stop(end); return o;
  }
  function G(dest, v = 0) { const g = ac.createGain(); g.gain.value = v; g.connect(dest); return g; }
  function F(type, f, q, dest) { const x = ac.createBiquadFilter(); x.type = type; x.frequency.value = f; if (q != null) x.Q.value = q; x.connect(dest); return x; }
  function N(t, dur, dest) {   // the noise buffer is 2 s: loop it for longer sounds (an unlooped buffer just stops → pop)
    const s = ac.createBufferSource(); s.buffer = A_().noise; s.connect(dest);
    // keep it running a little past the note: the gain envelope (not the source) decides when it goes quiet
    if (dur > 0.5) { s.loop = true; s.start(t, Math.random() * 1.2); s.stop(t + dur + 0.25); } else s.start(t, Math.random() * 0.7, dur + 0.25);
    return s;
  }
  // sustained: attack a, hold to t+dur, release r  → returns end time
  // every note ends with a short linear fade to true silence, so stopping the oscillator never clicks
  const FADE = 0.03;
  function sus(g, t, a, peak, dur, r) {
    const p = g.gain, e = t + Math.max(dur, a + 0.01), t1 = e + r * 0.8;
    p.setValueAtTime(0, t); p.linearRampToValueAtTime(peak, t + a);
    p.setValueAtTime(peak, e); p.setTargetAtTime(0, e, r / 3.5);
    p.setValueAtTime(peak * Math.exp(-2.8), t1); p.linearRampToValueAtTime(0, t1 + FADE);
    return t1 + FADE + 0.01;
  }
  // percussive: attack a, exponential decay tau  → returns end time
  function dec(g, t, a, peak, tau) {
    const p = g.gain, t1 = t + a + tau * 3.6; p.setValueAtTime(0, t); p.linearRampToValueAtTime(peak, t + a);
    p.setTargetAtTime(0, t + a, tau);
    p.setValueAtTime(peak * Math.exp(-3.6), t1); p.linearRampToValueAtTime(0, t1 + FADE);   // -31 dB, then fade out
    return t1 + FADE + 0.01;
  }
  function vib(t, oscs, rate, cents, delay, end) {
    if (cents <= 0 || LITE) return;
    const l = ac.createOscillator(), g = ac.createGain();
    l.frequency.value = rate * (0.95 + Math.random() * 0.1);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0, t + delay * 0.4); g.gain.linearRampToValueAtTime(cents, t + delay + 0.01);
    l.connect(g); for (const o of oscs) g.connect(o.detune);
    l.start(t); l.stop(end);
  }
  let shaper = null;
  function drive() {
    if (!shaper || shaper.context !== ac) {
      shaper = ac.createWaveShaper(); const c = new Float32Array(1025);
      for (let i = 0; i < 1025; i++) { const x = i / 512 - 1; c[i] = Math.tanh(x * 4); }
      shaper.curve = c; shaper._c = c;
    }
    const w = ac.createWaveShaper(); w.curve = shaper._c; return w;
  }

  // ---------------------------------------------------------------
  //  INSTRUMENTS   fn(t, midi, dur, vel, dest)
  // ---------------------------------------------------------------
  const I = {
    // ----- strings -----
    strings(t, m, d, v, ch) {   // legato section strings
      const g = G(ch), f = F('lowpass', Math.min(8000, mtof(m) * 4 + 900), 0.6, g);
      const e = sus(g, t, 0.09, 0.05 * v, d, 0.3);
      const os = (LITE ? [-8, 8] : [-9, 0, 9]).map(dt => O('sawtooth', mtof(m), t, e, f, dt));
      vib(t, os, 5.3, 7, 0.25, e);
    },
    violin(t, m, d, v, ch) {    // expressive solo line
      const g = G(ch), f = F('lowpass', Math.min(7000, mtof(m) * 5 + 1200), 0.8, g), pk = F('peaking', 2600, 1.5, f); pk.gain.value = 5;
      const e = sus(g, t, 0.05, 0.075 * v, d, 0.18);
      const os = [-4, 4].map(dt => O('sawtooth', mtof(m), t, e, pk, dt));
      vib(t, os, 5.8, 12, 0.18, e);
    },
    trem(t, m, d, v, ch) {      // tremolo strings (tension)
      const g = G(ch), a = G(g, 0.55), f = F('lowpass', Math.min(7000, mtof(m) * 4 + 900), 0.6, a);
      const e = sus(g, t, 0.05, 0.06 * v, d, 0.15);
      const l = ac.createOscillator(), lg = G(a.gain, 0.45); l.frequency.value = 11 + Math.random(); l.connect(lg); l.start(t); l.stop(e);
      (LITE ? [0] : [-8, 8]).forEach(dt => O('sawtooth', mtof(m), t, e, f, dt));
    },
    pizz(t, m, d, v, ch) {
      const g = G(ch), f = F('lowpass', 2200, 1.2, g);
      if (!LITE) { f.frequency.setValueAtTime(2600, t); f.frequency.setTargetAtTime(400, t, 0.06); } else f.frequency.value = 1100;
      const e = dec(g, t, 0.003, 0.16 * v, m < 50 ? 0.18 : 0.11);
      O('triangle', mtof(m), t, e, f); if (!LITE) O('sawtooth', mtof(m), t, e, G(f, 0.4), 4);
    },
    contrabass(t, m, d, v, ch) {
      const g = G(ch), f = F('lowpass', 650, 0.7, g);
      const e = sus(g, t, 0.06, 0.12 * v, d, 0.2);
      if (LITE) O('sawtooth', mtof(m), t, e, G(f, 1.5)); else { O('sawtooth', mtof(m), t, e, f, -5); O('sawtooth', mtof(m), t, e, f, 5); }
      O('sine', mtof(m), t, e, G(g, 0.4 * v));
    },
    pizzbass(t, m, d, v, ch) {
      const g = G(ch), f = F('lowpass', 900, 1, g);
      f.frequency.setValueAtTime(1400, t); f.frequency.setTargetAtTime(300, t, 0.08);
      const e = dec(g, t, 0.004, 0.36 * v, 0.24);
      O('triangle', mtof(m), t, e, f); O('sine', mtof(m), t, e, f);
    },
    // ----- brass -----
    trumpet(t, m, d, v, ch) {
      const g = G(ch), f = F('lowpass', 800, 1.2, g), hz = mtof(m), top = Math.min(7500, hz * 7);
      f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(top, t + 0.05); f.frequency.setTargetAtTime(hz * 3.5 + 700, t + 0.05, 0.12);
      const e = sus(g, t, 0.025, 0.085 * v, d, 0.09);
      const os = [-5, 5].map(dt => { const o = O('sawtooth', hz * 0.975, t, e, f, dt); o.frequency.setTargetAtTime(hz, t, 0.015); return o; });
      vib(t, os, 5.6, 7, 0.22, e);
    },
    horn(t, m, d, v, ch) {
      const g = G(ch), hz = mtof(m), f = F('lowpass', hz * 2.2 + 400, 0.7, g);
      const e = sus(g, t, 0.06, 0.1 * v, d, 0.22);
      const os = [O('sawtooth', hz, t, e, f, -3), O('triangle', hz, t, e, G(f, 1.2), 3)];
      vib(t, os, 5, 5, 0.3, e);
    },
    brass(t, m, d, v, ch) {     // brass section (chords / stabs / big lead)
      const g = G(ch), hz = mtof(m), f = F('lowpass', 600, 1.4, g);
      if (!LITE) { f.frequency.setValueAtTime(450, t); f.frequency.linearRampToValueAtTime(Math.min(6000, hz * 6), t + 0.04); f.frequency.setTargetAtTime(hz * 3 + 600, t + 0.04, 0.15); } else f.frequency.value = Math.min(5000, hz * 3.5 + 600);
      const e = sus(g, t, 0.03, 0.06 * v, d, 0.12);
      (LITE ? [-9, 9] : [-10, 0, 10]).forEach(dt => { const o = O('sawtooth', hz * 0.98, t, e, f, dt); o.frequency.setTargetAtTime(hz, t, 0.02); });
    },
    tuba(t, m, d, v, ch) {
      const g = G(ch), hz = mtof(m), f = F('lowpass', 500, 1, g);
      f.frequency.setValueAtTime(300, t); f.frequency.linearRampToValueAtTime(hz * 5 + 200, t + 0.04); f.frequency.setTargetAtTime(hz * 3 + 150, t + 0.04, 0.1);
      const e = sus(g, t, 0.025, 0.15 * v, d, 0.1);
      O('sawtooth', hz, t, e, f); O('sine', hz, t, e, G(g, 0.5 * v));
    },
    // ----- winds -----
    flute(t, m, d, v, ch) {
      const g = G(ch), hz = mtof(m), lp = F('lowpass', 5000, 0.5, g);
      const e = sus(g, t, 0.05, 0.13 * v, d, 0.12);
      const os = [O('sine', hz, t, e, lp), O('triangle', hz, t, e, G(lp, 0.25))];
      vib(t, os, 5.1, 11, 0.22, e);
      const nb = F('bandpass', hz * 2, 1.5, G(g, 0.12)); N(t, d + 0.1, nb);   // breath
      const ch2 = G(ch); const e2 = dec(ch2, t, 0.004, 0.05 * v, 0.03); N(t, 0.08, F('highpass', 3000, 0.7, ch2)); void e2;   // chiff
    },
    recorder(t, m, d, v, ch) {
      const g = G(ch), hz = mtof(m), lp = F('lowpass', 3500, 0.5, g);
      const e = sus(g, t, 0.03, 0.12 * v, d, 0.08);
      const os = [O('triangle', hz, t, e, lp), O('sine', hz * 2, t, e, G(lp, 0.15))];
      vib(t, os, 5.5, 5, 0.25, e);
      N(t, d, F('bandpass', hz * 3, 2, G(g, 0.05)));
    },
    ney(t, m, d, v, ch) {        // breathy reed flute of the desert
      const g = G(ch), hz = mtof(m), lp = F('lowpass', 3000, 0.5, g);
      const e = sus(g, t, 0.09, 0.12 * v, d, 0.15);
      const o = O('sine', hz, t, e, lp); o.detune.setValueAtTime(-60, t); o.detune.setTargetAtTime(0, t, 0.05);
      vib(t, [o], 4.6, 14, 0.25, e);
      N(t, d + 0.15, F('bandpass', hz * 1.5, 3, G(g, 0.35)));
    },
    oboe(t, m, d, v, ch) {
      const g = G(ch), hz = mtof(m), lp = F('lowpass', 4200, 0.7, g), pk = F('peaking', 1400, 2, lp), hp = F('highpass', 350, 0.7, pk); pk.gain.value = 9;
      const e = sus(g, t, 0.04, 0.05 * v, d, 0.09);
      const os = [O('sawtooth', hz, t, e, hp)];
      vib(t, os, 5.5, 9, 0.2, e);
    },
    clarinet(t, m, d, v, ch) {
      const g = G(ch), hz = mtof(m), lp = F('lowpass', Math.min(3500, hz * 5), 0.7, g);
      const e = sus(g, t, 0.035, 0.06 * v, d, 0.08);
      vib(t, [O('square', hz, t, e, lp)], 5, 4, 0.3, e);
    },
    bassoon(t, m, d, v, ch) {
      const g = G(ch), hz = mtof(m), lp = F('lowpass', 1100, 0.8, g), pk = F('peaking', 480, 2, lp); pk.gain.value = 6;
      const e = sus(g, t, 0.03, 0.09 * v, d, 0.07);
      O('sawtooth', hz, t, e, pk); O('square', hz, t, e, G(pk, 0.5));
    },
    // ----- plucked / struck -----
    harp(t, m, d, v, ch) {
      const g = G(ch), hz = mtof(m), lp = F('lowpass', 4500, 0.5, g);
      const e = dec(g, t, 0.003, 0.16 * v, Math.max(0.35, Math.min(1.4, 0.5 + (72 - m) * 0.025)));
      O('triangle', hz, t, e, lp); if (!LITE) O('sine', hz * 2, t, e, G(lp, 0.25));
    },
    harpsichord(t, m, d, v, ch) {
      const g = G(ch), hz = mtof(m), lp = F('lowpass', 7000, 0.7, g), hp = F('highpass', 250, 0.7, lp);
      if (!LITE) { lp.frequency.setValueAtTime(7000, t); lp.frequency.setTargetAtTime(2200, t, 0.15); } else lp.frequency.value = 3500;
      const e = dec(g, t, 0.002, 0.05 * v, 0.32);
      O('sawtooth', hz, t, e, hp); if (!LITE) O('square', hz * 2, t, e, G(hp, 0.35));
    },
    guitar(t, m, d, v, ch) {     // nylon-string guitar
      const g = G(ch), hz = mtof(m), lp = F('lowpass', 3500, 1.5, g);
      if (!LITE) { lp.frequency.setValueAtTime(Math.min(6000, hz * 10), t); lp.frequency.setTargetAtTime(hz * 2 + 300, t, 0.12); } else lp.frequency.value = Math.min(4000, hz * 4 + 300);
      const e = dec(g, t, 0.002, 0.13 * v, 0.45);
      O('sawtooth', hz, t, e, lp);
    },
    oud(t, m, d, v, ch) {
      const g = G(ch), hz = mtof(m), bp = F('bandpass', hz * 2.5, 1.1, g), lp = F('lowpass', 3000, 1, bp);
      if (!LITE) { lp.frequency.setValueAtTime(4000, t); lp.frequency.setTargetAtTime(900, t, 0.1); } else lp.frequency.value = 1800;
      const e = dec(g, t, 0.002, 0.3 * v, 0.32);
      const o = O('sawtooth', hz, t, e, lp); o.detune.setValueAtTime(35, t); o.detune.setTargetAtTime(0, t, 0.03);
    },
    celesta(t, m, d, v, ch) {
      const g = G(ch), hz = mtof(m);
      const e = dec(g, t, 0.002, 0.13 * v, 0.7);
      O('sine', hz, t, e, g);
      if (!LITE) { const g2 = G(ch); const e2 = dec(g2, t, 0.002, 0.035 * v, 0.18); O('sine', hz * 4, t, e2, g2); }
    },
    musicbox(t, m, d, v, ch) {
      const g = G(ch), hz = mtof(m);
      const e = dec(g, t, 0.001, 0.12 * v, 0.55);
      O('sine', hz, t, e, g);
      const g2 = G(ch); const e2 = dec(g2, t, 0.001, 0.05 * v, 0.12); O('sine', hz * 3, t, e2, g2); O('sine', hz * 5.95, t, e2, G(g2, 0.5));
    },
    glass(t, m, d, v, ch) {      // glassy shimmer bell
      const g = G(ch), hz = mtof(m);
      const e = dec(g, t, 0.015, 0.075 * v, 1.3);
      O('sine', hz, t, e, g); O('sine', hz * 2.003, t, e, G(g, 0.4)); O('sine', hz * 3.01, t, e, G(g, 0.12));
    },
    bell(t, m, d, v, ch) {       // FM church / toll bell
      const g = G(ch), hz = mtof(m);
      const e = dec(g, t, 0.002, 0.1 * v, 1.6);
      const c = O('sine', hz, t, e, g), mo = ac.createOscillator(), mg = ac.createGain();
      mo.frequency.value = hz * 1.4; mg.gain.setValueAtTime(hz * 2.2, t); mg.gain.setTargetAtTime(hz * 0.2, t, 0.4);
      mo.connect(mg); mg.connect(c.frequency); mo.start(t); mo.stop(e);
    },
    xylophone(t, m, d, v, ch) {
      const g = G(ch), hz = mtof(m);
      const e = dec(g, t, 0.001, 0.2 * v, 0.13);
      O('sine', hz, t, e, g); O('sine', hz * 3.9, t, e, G(g, 0.3));
      const k = G(ch); dec(k, t, 0.001, 0.08 * v, 0.008); N(t, 0.03, F('bandpass', 3000, 1, k));
    },
    // ----- voices & keys -----
    choir(t, m, d, v, ch) {
      const g = G(ch), hz = mtof(m);
      const e = sus(g, t, 0.14, 0.42 * v, d, 0.32);
      // vowel formants: "oo" for low voices, "ah" above
      const fm = m < 60 ? [[400, 1], [800, 0.5], [2600, 0.12]] : [[700, 1], [1150, 0.55], [2800, 0.15]];
      const pre = ac.createGain();
      for (const [fr, gg] of fm) pre.connect(F('bandpass', fr, 5, G(g, gg)));
      const os = (LITE ? [-10, 10] : [-12, 0, 12]).map(dt => O('sawtooth', hz, t, e, pre, dt));
      vib(t, os, 5, 13, 0.25, e);
    },
    organ(t, m, d, v, ch) {
      const g = G(ch), hz = mtof(m);
      const e = sus(g, t, 0.015, 0.032 * v, d, 0.09);
      (LITE ? [[0.5, 0.6], [1, 1.2], [2, 0.8]] : [[0.5, 0.5], [1, 1], [2, 0.6], [3, 0.3], [4, 0.25]]).forEach(([r, a]) => O('sine', hz * r, t, e, G(g, a)));
    },
    organbass(t, m, d, v, ch) {
      const g = G(ch), hz = mtof(m);
      const e = sus(g, t, 0.02, 0.1 * v, d, 0.12);
      [[1, 1], [2, 0.45], [3, 0.15]].forEach(([r, a]) => O('sine', hz * r, t, e, G(g, a)));
    },
    synthpad(t, m, d, v, ch) {   // cosmic / underwater pad
      const g = G(ch), hz = mtof(m), lp = F('lowpass', 400, 1.2, g);
      if (!LITE) { lp.frequency.setValueAtTime(350, t); lp.frequency.linearRampToValueAtTime(Math.min(3000, hz * 5), t + Math.min(1.2, d)); } else lp.frequency.value = Math.min(2200, hz * 3.5);
      const e = sus(g, t, 0.45, 0.04 * v, d, 0.9);
      const os = [-14, 14].map(dt => O('sawtooth', hz, t, e, lp, dt));
      vib(t, os, 0.4, 9, 0, e);
    },
    distlead(t, m, d, v, ch) {   // overdriven infernal lead
      const g = G(ch), hz = mtof(m), lp = F('lowpass', 3200, 1, g), w = drive(); w.connect(lp);
      const pre = G(w, 0.6);
      const e = sus(g, t, 0.012, 0.05 * v, d, 0.1);
      const os = [-7, 7].map(dt => O('sawtooth', hz, t, e, pre, dt));
      vib(t, os, 5.8, 14, 0.25, e);
    },
    distguitar(t, m, d, v, ch) { // palm-muted power chord (root + 5th + octave)
      const g = G(ch), lp = F('lowpass', 2000, 1, g), w = drive(); w.connect(lp);
      const pre = G(w, 0.5);
      const e = dec(g, t, 0.004, 0.06 * v, Math.min(0.5, d * 0.6));
      [0, 7, 12].forEach(iv => O('sawtooth', mtof(m + iv), t, e, pre, iv ? 4 : -4));
    },
  };

  // loudness trims (dB) measured with _cal() so every instrument sits at a matched level
  const TRIM = { strings: 4.3, violin: 0.6, trem: 6, pizz: 1.4, contrabass: -6.6, pizzbass: -13.2, trumpet: 0.7, horn: -1.5, brass: 2.1, tuba: -6.4, flute: -4, recorder: -0.3, ney: -1.5, oboe: 4.9, clarinet: 2.2, bassoon: -5.1, harp: -3.4, harpsichord: 7, guitar: -2.4, oud: -0.8, celesta: -4, musicbox: -2.5, glass: -2.4, bell: -6, xylophone: -1.1, choir: -6.9, organ: 6.7, organbass: -2.8, synthpad: 4.5, distlead: 4.1, distguitar: 6.1 };
  for (const k in TRIM) { const f = I[k], g = Math.pow(10, TRIM[k] / 20); I[k] = (t, m, d, v, ch) => f(t, m, d, v * g, ch); I[k]._raw = f; }

  // ---------------------------------------------------------------
  //  PERCUSSION   fn(t, vel, dest, pitch?)
  // ---------------------------------------------------------------
  const P = {
    bd(t, v, ch) {            // concert bass drum
      const g = G(ch), o = ac.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(75, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
      o.connect(g); const e = dec(g, t, 0.004, 0.75 * v, 0.28); o.start(t); o.stop(e);
      const n = G(ch); dec(n, t, 0.002, 0.2 * v, 0.03); N(t, 0.1, F('lowpass', 300, 0.7, n));
    },
    sn(t, v, ch) {            // military snare
      const g = G(ch); dec(g, t, 0.001, 0.32 * v, 0.07);
      N(t, 0.3, F('bandpass', 2600, 0.5, g));
      const o = G(ch); const e = dec(o, t, 0.001, 0.14 * v, 0.04);
      const tr = O('triangle', 230, t, e, o); tr.frequency.setTargetAtTime(170, t, 0.03);
    },
    ti(t, v, ch, m) {         // timpani, tuned
      const hz = mtof(m), g = G(ch);
      const e = dec(g, t, 0.006, 0.42 * v, 0.6);
      const o = O('sine', hz * 1.03, t, e, g); o.frequency.setTargetAtTime(hz, t, 0.04);
      O('sine', hz * 1.5, t, e, G(g, 0.3)); O('sine', hz * 2, t, e, G(g, 0.15));
      const n = G(ch); dec(n, t, 0.002, 0.15 * v, 0.03); N(t, 0.1, F('lowpass', 500, 0.7, n));
    },
    cy(t, v, ch) {            // crash cymbal
      const g = G(ch); dec(g, t, 0.003, 0.11 * v, 0.8);
      N(t, 1.5, F('highpass', 5000, 0.6, g));
      const g2 = G(ch); dec(g2, t, 0.002, 0.06 * v, 0.3); N(t, 0.6, F('bandpass', 9000, 1.5, g2));
    },
    sus(t, v, ch, _m, len) {   // suspended-cymbal swell into a downbeat
      const g = G(ch), L = len || 1.2; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09 * v, t + L); g.gain.setValueAtTime(0, t + L + 0.01);
      N(t, L + 0.05, F('highpass', 4500, 0.6, g));
    },
    tb(t, v, ch) {            // tambourine
      const g = G(ch); dec(g, t, 0.002, 0.1 * v, 0.06); N(t, 0.25, F('bandpass', 9500, 1.2, g));
      const g2 = G(ch); dec(g2, t + 0.012, 0.002, 0.06 * v, 0.05); N(t + 0.012, 0.2, F('bandpass', 7200, 2, g2));
    },
    tr(t, v, ch) {            // triangle
      const g = G(ch); const e = dec(g, t, 0.001, 0.035 * v, 0.7);
      O('sine', 2730, t, e, g); O('sine', 7350, t, e, G(g, 0.35));
    },
    cs(t, v, ch) {            // castanets
      for (const dt of [0, 0.022]) { const g = G(ch); dec(g, t + dt, 0.001, 0.35 * v, 0.01); N(t + dt, 0.05, F('bandpass', 2800, 3, g)); }
    },
    cl(t, v, ch) {            // hand clap / palmas
      for (const dt of [0, 0.011, 0.022]) { const g = G(ch); dec(g, t + dt, 0.001, 0.22 * v, dt === 0.022 ? 0.05 : 0.012); N(t + dt, 0.15, F('bandpass', 1400, 1, g)); }
    },
    wb(t, v, ch, _m, hi) {    // woodblock tick / tock
      const g = G(ch), f = hi === false ? 980 : 1420; const e = dec(g, t, 0.001, 0.22 * v, 0.03);
      O('sine', f, t, e, g); O('sine', f * 2.4, t, e, G(g, 0.25));
    },
    an(t, v, ch) {            // anvil
      const g = G(ch); const e = dec(g, t, 0.001, 0.06 * v, 0.45);
      [[1, 1], [2.71, 0.7], [5.13, 0.5], [7.9, 0.25]].forEach(([r, a]) => O('sine', 980 * r, t, e, G(g, a)));
      const k = G(ch); dec(k, t, 0.001, 0.25 * v, 0.006); N(t, 0.03, F('highpass', 2000, 0.7, k));
    },
    tk(t, v, ch) {            // taiko
      const g = G(ch), o = ac.createOscillator(); o.frequency.setValueAtTime(125, t); o.frequency.exponentialRampToValueAtTime(58, t + 0.2);
      o.connect(g); const e = dec(g, t, 0.003, 0.8 * v, 0.25); o.start(t); o.stop(e);
      const n = G(ch); dec(n, t, 0.002, 0.3 * v, 0.04); N(t, 0.15, F('lowpass', 900, 0.7, n));
    },
    tm(t, v, ch, _m, hi) {    // tom
      const g = G(ch), o = ac.createOscillator(), f = hi ? 230 : 160; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.62, t + 0.15);
      o.connect(g); const e = dec(g, t, 0.002, 0.5 * v, 0.15); o.start(t); o.stop(e);
      const n = G(ch); dec(n, t, 0.001, 0.12 * v, 0.02); N(t, 0.06, F('bandpass', 1500, 0.8, n));
    },
    dm(t, v, ch) {            // darbuka doum
      const g = G(ch), o = ac.createOscillator(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(88, t + 0.12);
      o.connect(g); const e = dec(g, t, 0.002, 0.55 * v, 0.16); o.start(t); o.stop(e);
    },
    dt(t, v, ch) {            // darbuka tek / ka
      const g = G(ch); dec(g, t, 0.001, 0.3 * v, 0.02); N(t, 0.08, F('bandpass', 3800, 2, g));
      const o = G(ch); const e = dec(o, t, 0.001, 0.1 * v, 0.02); O('sine', 760, t, e, o);
    },
    zl(t, v, ch) {            // finger cymbals
      const g = G(ch); const e = dec(g, t, 0.001, 0.035 * v, 0.45);
      O('sine', 3150, t, e, g); O('sine', 4740, t, e, G(g, 0.6));
    },
    fd(t, v, ch) {            // frame drum
      const g = G(ch), o = ac.createOscillator(); o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.15);
      o.connect(g); const e = dec(g, t, 0.003, 0.45 * v, 0.2); o.start(t); o.stop(e);
      const n = G(ch); dec(n, t, 0.002, 0.08 * v, 0.03); N(t, 0.08, F('lowpass', 1200, 0.7, n));
    },
    sl(t, v, ch) {            // sleigh bells
      for (let i = 0; i < 4; i++) { const g = G(ch), tt = t + i * 0.011; dec(g, tt, 0.001, 0.05 * v, 0.04); N(tt, 0.2, F('bandpass', 7000 + i * 900, 3, g)); }
    },
    sh(t, v, ch) {            // shaker
      const g = G(ch); dec(g, t, 0.006, 0.05 * v, 0.03); N(t, 0.12, F('highpass', 6500, 0.7, g));
    },
    gg(t, v, ch) {            // gong
      const g = G(ch); const e = dec(g, t, 0.05, 0.12 * v, 2.2);
      [[82, 1], [123, 0.6], [197, 0.4], [311, 0.25]].forEach(([f, a]) => O('sine', f, t, e, G(g, a), Math.random() * 20));
      const s = G(ch); s.gain.setValueAtTime(0, t); s.gain.linearRampToValueAtTime(0.025 * v, t + 0.4); s.gain.setTargetAtTime(0, t + 0.4, 0.8);
      N(t, 3, F('bandpass', 2500, 0.8, s));
    },
    bl(t, v, ch, m) { I.bell(t, m, 2, 1.1 * v, ch); },   // bell toll on the tonic
  };

  // ---------------------------------------------------------------
  //  DRUM PATTERNS   x = 1, o = 0.6, - = 0.3 (ghost), r = 32nd roll, . = rest
  //  ti: x = root, o = fifth.  wb: x = tick, o = tock.  arrays alternate by bar.
  // ---------------------------------------------------------------
  const DR = {
    fanfare: { ti: 'x.......o...x...', sn: 'x..o-.o.x..or.r.', bd: 'x...............' },
    march: { bd: 'x.......x.......', sn: 'x.-ox.o.x.-ox.oo', ti: ['x...............', '........o.......'] },
    march2: { bd: 'x.......x.......', sn: '....o.......o-..', tr: 'x...............' },
    heartbeat: { fd: 'x..o............' },
    forest: { fd: 'x..o......o.....', sh: '..-...-...-...-.' },
    mine: { bd: 'x.......x.......', wb: ['....x.......x.o.', '....x.....o.x...'], an: ['......x.........', '..............x.'], sh: '-.-.-.-.-.-.-.-.' },
    toll: { bd: 'x...............', bl: ['x...............', '................'] },
    tollb: { bd: 'x.......o.......', bl: ['x...............', '................'], tr: '........-.......' },
    flamenco: { tm: 'x..o..x.x..o..x.', cs: 'x.xx.x.xx.xx.x.x', cl: '....x.......x...' },
    flamenco2: { tm: 'x..o..x.x..o..x.', cs: 'x.xx.x.xx.xx.x.x', cl: '....x..x....x..x', bd: 'x..x..x.x.......', ti: 'x...............' },
    ice: { sl: 'x...x...x...x...', tr: ['x...............', '........o.......'] },
    ice2: { sl: 'x.o.x.o.x.o.x.o.', tr: 'x.......o.......', ti: 'x...............' },
    sky: { sn: '....-...--..-...', tb: '..o...o...o...o.', ti: ['x.......o.......', 'x...............'] },
    military: { sn: 'x.oox.oox.oox.ox', bd: 'x...x...x...x...', ti: 'x.......x.......' },
    military2: { sn: 'r.......r...x.oo', bd: 'x.......x.......', ti: 'x...o...x...o...' },
    maqsum: { dm: 'x.......x.......', dt: '..x.-.x...-.x.-.', zl: ['x...............', '........x.......'] },
    clock: { wb: 'x...o...x...o...', tr: ['x...............', '................', '................', '................'] },
    clock2: { wb: 'x.o.x.o.x.o.x.o.', bd: 'x.......x.......', tr: 'x...............' },
    gong: { gg: ['x...............', '................', '................', '................'], fd: '........-.......' },
    taiko: { tk: 'x..x..x.x.x.x...', tm: '....o.......o.oo' },
    taiko2: { tk: 'x.xx.xx.x.xx.x.x', tm: '....x.......x.xx', cy: ['x...............', '................'] },
    doom: { ti: 'x.......x.......', bd: 'x...............', bl: ['x...............', '................'] },
    doom2: { ti: 'x...o...x...o...', bd: 'x.......x.......', sn: '............-.oo' },
    // battle
    boss: { bd: 'x...x...x...x...', sn: '....x.......x...', sh: '-.-.-.-.-.-.-.-.', ti: ['x.......o.......', 'x...............'] },
    bosslight: { bd: 'x.......x.......', sn: '....x.......x...', wb: '..o...o...o...o.', tb: '-.-.-.-.-.-.-.-.' },
    bossintro: { ti: 'x...x...x...x...', sn: '............r.rr' },
    tribal: { tk: 'x..x..x...x.x...', fd: '..o...o...o...o.', tm: '....x.......x.xx' },
    mineboss: { bd: 'x..x..x.x..x..x.', an: '....x.......x...', sn: '....x.......x...', sh: '-.-.-.-.-.-.-.-.' },
    bossdoom: { ti: 'x..x....x..x....', sn: '....x.......x...', bl: ['x...............', '................'] },
    bossice: { sn: '....x.......x...', bd: 'x...x...x...x...', sl: 'x.o.x.o.x.o.x.o.', tr: 'x...............' },
    thunder: { sn: 'x.oox.oox.oox.oo', bd: 'x...x...x...x...', ti: ['r.......x...r...', 'x.......x.......'] },
    maqsumfast: { dm: 'x..x....x.......', dt: '..x.-xx.-.x.xx-.', zl: 'x.......x.......', tm: '..............oo' },
    clockboss: { wb: 'x.o.x.o.x.o.x.o.', bd: 'x...x...x...x...', sn: '....x.......x...' },
    gongboss: { gg: ['x...............', '................', '................', '................'], tk: 'x.......x.x.....', sn: '....x.......x...', bd: 'x...x...x...x...' },
    taikofast: { tk: 'x.xx.xx.x.xx.xx.', tm: '....x.......x...', bd: 'x...x...x...x...', cy: ['x...............', '................'] },
    final: { bd: 'x...x...x...x...', sn: '....x.......x.oo', ti: 'x...o...x...o...' },
    rage: { tm: 'o.o.o.o.o.o.o.o.', sn: '...........-.-oo' },
    // town (3/4: 12 steps)
    waltz: { tb: '....o...o...', tr: ['x...........', '............'] },
    waltzbright: { tb: '....o...o...', tr: 'x...........', wb: '..-...-...-.' },
    smith: { an: ['x...........', 'x.......o...'], bd: 'x...........', tb: '....-...-...' },
    hush: {},
  };
  const VOL = { x: 1, o: 0.6, '-': 0.3, r: 0.55 };

  // accompaniment rhythm presets (16-step)
  const RHY = {
    stab: 'x..x..x...x.x...', stab2: 'x..x..x.x..x..x.', oompah: '....x.......x...', strum: 'x..x..x.x..x..x.',
    power: 'x.x.x.xxx.x.x.xx', waltz: '....x...x...', boss: 'x..x..x...x.x.x.',
  };
  const BASS = {
    march: [[0, 0, 4], [8, 2, 4]], sustain: [[0, 0, 16]], half: [[0, 0, 8], [8, 0, 8]],
    walk: [[0, 0, 4], [4, 1, 4], [8, 2, 4], [12, 'ap', 4]],
    drive: [[0, 0, 2], [2, 0, 2], [4, 7, 2], [6, 0, 2], [8, 0, 2], [10, 0, 2], [12, 7, 2], [14, 0, 2]],
    boss: [[0, 0, 2], [2, 0, 2], [4, 0, 2], [6, 2, 2], [8, 0, 2], [10, 0, 2], [12, 7, 2], [14, 2, 2]],
    gallop: [[0, 0, 2], [2, 0, 1], [3, 0, 1], [4, 0, 2], [6, 0, 1], [7, 0, 1], [8, 0, 2], [10, 0, 1], [11, 0, 1], [12, 2, 2], [14, 7, 1], [15, 7, 1]],
    pizz: [[0, 0, 1], [4, 2, 1], [8, 0, 1], [12, 2, 1]],
    tresillo: [[0, 0, 3], [3, 0, 3], [6, 7, 2], [8, 0, 3], [11, 0, 3], [14, 7, 2]],
    maqsum: [[0, 0, 3], [6, 0, 2], [8, 0, 3], [12, 2, 2]],
    pedal: [[0, 'T', 16]],
    waltz: [[0, 0, 4]], waltz2: [[0, 0, 4], [8, 2, 2]],
  };

  // ---------------------------------------------------------------
  //  SESSION
  // ---------------------------------------------------------------
  function strip(dest, conv, pan, send) {
    const i = ac.createGain(); let n = i;
    if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; i.connect(p); n = p; }
    n.connect(dest); const s = ac.createGain(); s.gain.value = send; n.connect(s); s.connect(conv);
    return i;
  }
  function makeSession(arr, kind, opt = {}) {
    const t = ac.currentTime, m = ac.createGain(), g0 = active({ arr, layer: opt.layer, rage: false }).gain || 1;
    m.gain.setValueAtTime(0.0001, t); m.gain.linearRampToValueAtTime(g0, t + (opt.fadeIn || 0.06));
    m.connect(out);
    const conv = ac.createConvolver(); conv.buffer = IR(Math.min(ac === liveAc ? 3 : 9, arr.room || 2));
    const wet = ac.createGain(); wet.gain.value = arr.wet != null ? arr.wet : 0.32; conv.connect(wet); wet.connect(m);
    const SD = opt.stemDest, D = k => SD ? SD[k] : m;     // stemDest: measure groups separately (dry)
    const ch = {
      lead: strip(D('lead'), conv, 0.05, 1), dbl: strip(D('lead'), conv, -0.3, 1), echo: strip(D('lead'), conv, 0.4, 1.4),
      h0: strip(D('harm'), conv, -0.28, 1), h1: strip(D('harm'), conv, 0.3, 1), h2: strip(D('harm'), conv, 0, 1.1),
      bass: strip(D('bass'), conv, 0, 0.35), perc: strip(D('perc'), conv, 0.12, 0.6), fx: strip(D('perc'), conv, 0, 1.6),
    };

    return { arr, kind, theme: THEMES[arr.theme], m, ch, step: 0, next: t + 0.08, playing: true, timer: null, rage: false, rageOn: false, layer: opt.layer || null, pendingLayer: null, A: null, bi: null, id: Math.random() };
  }

  // per-section value: {intro, A, A2, B, C, def} (A2 falls back to A, then def) or a plain value
  const SK = ['intro', 'A', 'A2', 'B', 'C', 'def'];
  // per-arrangement mix (measured, see arrangements.js `mix`): channel trims in dB + overall gain
  const GROUP = { lead: 'lead', dbl: 'lead', echo: 'lead', h0: 'harm', h1: 'harm', h2: 'harm', bass: 'bass', perc: 'perc', fx: 'perc' };
  const BASE_DB = { perc: -9 };   // the drum kit is voiced loud; sit it under the orchestra
  function applyMix(Ss, A, t) {
    const mx = A.mix || {};
    for (const k in Ss.ch) { const db = (mx[GROUP[k]] || 0) + (BASE_DB[GROUP[k]] || 0), g = Ss.ch[k].gain; if (Ss.muted && Ss.muted[k]) continue; g.setTargetAtTime(Math.pow(10, db / 20), t, 0.05); }
    if (Ss.started) Ss.m.gain.setTargetAtTime(A.gain || 1, t, 0.15);
  }
  const pick = (v, sec) => (v && typeof v === 'object' && !Array.isArray(v) && SK.some(k => k in v))
    ? (v[sec] !== undefined ? v[sec] : sec === 'A2' && v.A !== undefined ? v.A : v.def) : v;
  const RAGE = { tempo: 1.06, dbl: ['brass', 12, 0.55], harm: { p: 'trem', i: 'trem', o: 12, v: 0.4 }, drums: 'rage', key: 0 };

  function active(Ss) {         // arrangement with the building layer + rage merged in
    const base = Ss.arr, L = Ss.layer && base.layers ? base.layers[Ss.layer] || {} : {};
    const A = Object.assign({}, base, L);
    if (Ss.rage) {
      const R = Object.assign({}, RAGE, base.rage || {});
      A.rageR = R; A.key = (A.key || 60) + (R.key || 0);
    }
    return A;
  }
  function bpmOf(Ss) { return (Ss.A.bpm || 120) * (Ss.rage ? (Ss.A.rageR.tempo || 1) : 1); }

  function barInfo(th, bar) {
    const n = th.intro.ch.length;
    if (bar < n) return { sec: 'intro', i: bar, len: n, ch: th.intro.ch[bar], mel: th.intro.mel[bar], first: bar === 0, last: bar === n - 1, pass: 0 };
    let idx = bar - n, total = 0;
    for (const s of th.order) total += th.sec[s].ch.length;
    const pass = Math.floor(idx / total); idx %= total;
    for (let k = 0; k < th.order.length; k++) {
      const s = th.order[k], d = th.sec[s], L = d.ch.length;
      if (idx < L) return { sec: s, i: idx, len: L, ch: d.ch[idx], mel: d.mel[idx], first: idx === 0, last: idx === L - 1, pass, k };
      idx -= L;
    }
  }

  // pitch helpers
  function scaleFor(A, chDeg) { const M = MODES[A.mode] || MODES.ionian; return (mod(chDeg, 7) === 4 && M.dom) ? M.dom : M.s; }
  function degP(sc, d) { return Math.floor(d / 7) * 12 + sc[mod(d, 7)]; }
  function chordTones(sc, r) {          // semitones from key; drops a non-perfect fifth
    const a = degP(sc, r), b = degP(sc, r + 2), c = degP(sc, r + 4);
    return (c - a === 7) ? [a, b, c] : [a, b, a + 12];
  }
  function fold(p, lo) { while (p < lo) p += 12; while (p >= lo + 12) p -= 12; return p; }
  function voicing(A, sc, r, o) {
    const lo = A.key - 5 + (o || 0);
    return chordTones(sc, r).map(x => fold(A.key + x, lo)).sort((a, b) => a - b);
  }

  // ---------------------------------------------------------------
  //  STEP
  // ---------------------------------------------------------------
  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; }

  function playStep(Ss, s, t, sd) {
    const th = Ss.theme, SPB = th.spb, st = s % SPB, bar = Math.floor(s / SPB);
    if (st === 0) {
      if (Ss.pendingLayer !== null) { Ss.layer = Ss.pendingLayer; Ss.pendingLayer = null; Ss.A = null; }
      if (Ss.rage !== Ss.rageOn) { Ss.rageOn = Ss.rage; Ss.A = null; }
      if (!Ss.A) { Ss.A = active(Ss); applyMix(Ss, Ss.A, t); Ss.started = true; }
      Ss.bi = barInfo(th, bar);
    }
    const A = Ss.A, bi = Ss.bi, sec = bi.sec, sc = scaleFor(A, bi.ch);
    if (st % 4 === 0) events.push({ t, type: 'beat', beat: st / 4 });

    // ---------- drums ----------
    const dn = pick(A.drums, sec);
    const pats = [], SK = Ss.skip || {};
    if (dn && DR[dn] && !SK.drums) pats.push([DR[dn], A.dv || 1]);
    if (Ss.rageOn && DR[A.rageR.drums]) pats.push([DR[A.rageR.drums], 0.8]);
    const fill = bi.last && sec !== 'intro' && A.fill !== false && st >= SPB - 4;
    let filled = false;
    for (const [pat, dv] of pats) {
      for (const k in pat) {
        let row = pat[k]; if (Array.isArray(row)) row = row[bar % row.length];
        if (fill && (k === 'sn' || k === 'tk')) continue;
        const c = row[st]; if (!c || c === '.') continue;
        hitDrum(Ss, A, k, c, t, sd, dv, sc, bi);
      }
      if (fill && !filled) {
        filled = true; const j = st - (SPB - 4);
        if (pat.sn) P.sn(t, [0.45, 0.55, 0.75, 1][j] * dv, Ss.ch.perc);
        else if (pat.tk) { if (j !== 1) P.tk(t, [0.7, 0, 0.8, 1][j] * dv, Ss.ch.perc); }
        else if (pat.ti || pat.bd) for (let q = 0; q < 2; q++) P.ti(t + q * sd / 2, (0.3 + j * 0.12) * dv, Ss.ch.perc, timPitch(A, sc, bi.ch, false));
      }
    }
    if (st === 0 && bi.first && A.crash && (sec !== 'intro')) P.cy(t, 0.9, Ss.ch.perc);
    if (st === 0 && sec === 'intro' && bi.first && A.swell) P.sus(t, 0.8, Ss.ch.perc, 0, sd * SPB * bi.len * 0.95);

    // ---------- bass ----------
    const bs = pick(A.bass, sec);
    if (bs && !SK.bass) {
      const pat = BASS[bs.p] || BASS.sustain, k = SPB / 16;
      for (const [ps, tone, len] of pat) {
        const pst = Math.round(ps * k); if (pst !== st || pst >= SPB) continue;
        const lo = A.key - 28 + (bs.o || 0);
        let p;
        if (tone === 'T') p = fold(A.key, lo);
        else if (tone === 'ap') { const nx = Ss.theme && barInfo(th, bar + 1); p = fold(A.key + degP(scaleFor(A, nx.ch), nx.ch), lo) - 1; }
        else { const tt = chordTones(sc, bi.ch); p = fold(A.key + tt[0], lo) + (tone === 7 ? 12 : tone === 2 ? (tt[2] - tt[0]) : tone === 1 ? (tt[1] - tt[0]) : 0); }
        const L = (len * k) * sd * (bs.stac || 0.92);
        LITE = true; try { I[bs.i || 'contrabass'](t, p, L, bs.v || 1, Ss.ch.bass); } finally { LITE = false; }
      }
    }

    // ---------- harmony layers ----------
    let harm = pick(A.harm, sec) || [];
    if (!Array.isArray(harm)) harm = [harm];
    harm = harm.filter(L => !L.sec || L.sec.includes(sec));
    if (Ss.rageOn && A.rageR.harm) harm = harm.concat([A.rageR.harm]);
    // voice budget (live playback only): when many notes are still ringing, drop the extra accompaniment layers first
    const busy = ac === liveAc ? liveCount(t) : 0;
    if (busy > VOICE_SOFT) harm = harm.slice(0, busy > VOICE_HARD ? 0 : 1);
    LITE = true;
    try { if (!SK.harm) harm.forEach((L, li) => harmLayer(Ss, A, L, st, t, sd, sc, bi, Ss.ch['h' + Math.min(li, 2)], bar)); } finally { LITE = false; }

    // ---------- melody ----------
    const lead = pick(A.lead, sec), lo = pick(A.leadOct, sec) || 0, stac = pick(A.stac, sec) || 0.95, lv = pick(A.lv, sec) || 1;
    const dbl = Ss.rageOn ? A.rageR.dbl : pick(A.dbl, sec);
    const echo = A.echo && (!A.echo.sec || A.echo.sec.includes(sec)) ? A.echo : null;
    if (lead && bi.mel && !SK.lead) for (const nt of bi.mel) {
      if (nt[0] !== st) continue;
      const deg = nt[1], len = nt[2], acc = nt[3] || 0;
      const p = A.key + lo + degP(sc, deg) + acc, dur = len * sd * stac;
      let tt = t;
      if (A.orn === 'grace' && len >= 4) {          // quick upper-neighbour grace note
        const g = A.key + lo + degP(sc, deg + 1);
        I[lead](t, g, sd * 0.45, 0.7 * lv, Ss.ch.lead); tt = t + sd * 0.45;
      }
      I[lead](tt, p, dur - (tt - t), lv, Ss.ch.lead);
      const crowded = ac === liveAc && liveCount(t) > VOICE_HARD;
      if (dbl && !crowded) I[dbl[0]](tt, p + (dbl[1] || 0), dur - (tt - t), dbl[2] || 0.6, Ss.ch.dbl);
      if (echo && !crowded) I[echo.i](t + echo.d * sd, p + (echo.o || 0), Math.min(dur, sd * 4), echo.v || 0.35, Ss.ch.echo);
    }

    // ---------- ambience ----------
    if (A.fx) for (const f of A.fx) ambience(Ss, A, f, s, st, t, sd, sc, bi);
  }

  function timPitch(A, sc, r, fifth) { const lo = A.key - 22; const tt = chordTones(sc, r); return fold(A.key + tt[0] + (fifth ? 7 : 0), lo); }

  function hitDrum(Ss, A, k, c, t, sd, dv, sc, bi) {
    const v = VOL[c] * dv, ch = Ss.ch.perc;
    if (k === 'ti') {
      const m = timPitch(A, sc, bi.ch, c === 'o');
      if (c === 'r') for (let q = 0; q < 4; q++) P.ti(t + q * sd / 2, 0.35 + q * 0.1, ch, m);
      else P.ti(t, v, ch, m);
      return;
    }
    if (k === 'bl') { P.bl(t, v, Ss.ch.fx, fold(A.key, A.key - 14)); return; }
    if (k === 'wb') { P.wb(t, c === 'o' ? 0.8 * dv : v, ch, 0, c !== 'o'); return; }
    if (k === 'tm') { P.tm(t, v, ch, 0, c === 'x'); return; }
    if (c === 'r') { for (let q = 0; q < 2; q++) P[k](t + q * sd / 2, 0.45 * dv, ch); return; }
    P[k](t, v, ch);
  }

  function harmLayer(Ss, A, L, st, t, sd, sc, bi, ch, bar) {
    const SPB = Ss.theme.spb, ins = I[L.i] || I.strings, v = L.v || 0.6, o = L.o || 0;
    const V = voicing(A, sc, bi.ch, o);
    switch (L.p) {
      case 'pad': if (st === 0) for (const m of V) ins(t, m, sd * SPB * 1.02, v, ch); break;
      case 'drone': if (st === 0) { const r = fold(A.key, A.key - 17 + o); ins(t, r, sd * SPB * 1.02, v, ch); ins(t, r + 7, sd * SPB * 1.02, v * 0.8, ch); } break;
      case 'line3': if (st === 0) ins(t, V[1], sd * SPB * 1.0, v, ch); break;
      case 'arp8': case 'arp16': case 'alberti': case 'shimmer': case 'arpup': {
        const every = L.p === 'arp16' || L.p === 'shimmer' ? 1 : 2; if (st % every) break;
        const T = [V[0], V[1], V[2], V[0] + 12, V[1] + 12, V[2] + 12];
        const i = st / every;
        let m;
        if (L.p === 'alberti') m = [V[0], V[2], V[1], V[2]][i % 4];
        else if (L.p === 'shimmer') m = T[Math.floor(hash(bar * 97 + st) * 6)] + 12;
        else if (L.p === 'arpup') m = T[i % 6];
        else m = T[[0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 3, 2, 1][i % 16]];
        ins(t, m, sd * every * (L.p === 'shimmer' ? 3 : 2.5), v * (i % 4 === 0 ? 1 : 0.8), ch);
        break;
      }
      default: {        // rhythmic chord hits: stab / oompah / strum / power / waltz
        const r = L.r || RHY[L.p] || RHY.stab;
        const c = r[st]; if (!c || c === '.') break;
        const len = (L.len || 1.6) * sd, vv = v * (c === 'x' ? 1 : 0.7);
        if (L.p === 'strum') { const n = [V[0] - 12, V[0], V[1], V[2]]; n.forEach((m, k) => ins(t + k * 0.011, m, len * 2, vv * (k ? 0.7 : 1), ch)); }
        else if (L.p === 'power') ins(t, fold(V[0], A.key - 22 + o), len, vv, ch);
        else for (const m of V) ins(t, m, len, vv, ch);
      }
    }
  }

  function ambience(Ss, A, f, s, st, t, sd, sc, bi) {
    const ch = Ss.ch.fx, r = hash(s * 7 + 13);
    if (f === 'wind' && s % (Ss.theme.spb * 4) === 0) {
      const g = G(ch), bp = F('bandpass', 400, 4, g), L = sd * Ss.theme.spb * 3.5;
      bp.frequency.setValueAtTime(300, t); bp.frequency.linearRampToValueAtTime(1100, t + L * 0.5); bp.frequency.linearRampToValueAtTime(350, t + L);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + L * 0.5); g.gain.linearRampToValueAtTime(0, t + L);
      N(t, L, bp);
    } else if (f === 'chimes' && st % 2 === 0 && r < 0.1) {
      const d = [0, 1, 2, 4, 5][Math.floor(hash(s) * 5)];
      I.glass(t, A.key + 24 + degP(sc, d), 1, 0.35, ch);
    } else if (f === 'drops' && r < 0.045) {
      const g = G(ch), o = ac.createOscillator(), f0 = 900 + hash(s + 3) * 900;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 2.2, t + 0.05);
      o.connect(g); const e = dec(g, t, 0.002, 0.05, 0.03); o.start(t); o.stop(e);
    } else if (f === 'embers' && r < 0.08) {   // a few soft crackles (kept sparse: a dense crackle reads as line noise)
      const g = G(ch); dec(g, t, 0.002, 0.025 * hash(s + 9), 0.006); N(t, 0.02, F('highpass', 3000, 0.7, g));
    } else if (f === 'owl' && s % (Ss.theme.spb * 8) === Ss.theme.spb * 2) {
      for (const [dt, len] of [[0, 0.35], [0.5, 0.2], [0.75, 0.5]]) {
        const g = G(ch), o = ac.createOscillator(); o.frequency.setValueAtTime(380, t + dt); o.frequency.linearRampToValueAtTime(340, t + dt + len);
        o.connect(g); const e = sus(g, t + dt, 0.05, 0.03, len, 0.08); o.start(t + dt); o.stop(e);
      }
    }
  }

  // ---------------------------------------------------------------
  //  TRANSPORT
  // ---------------------------------------------------------------
  function tick() {
    const Ss = S; if (!Ss || !Ss.playing) return;
    const now = ac.currentTime;
    if (Ss.next < now - 0.05) { const A0 = Ss.A || active(Ss), sd = 60 / (A0.bpm || 120) / 4; const k = Math.ceil((now + 0.03 - Ss.next) / sd); Ss.next += k * sd; Ss.step += k; }
    while (Ss.next < now + 0.3) {
      const A0 = Ss.A || active(Ss);
      const sd = 60 / (A0.bpm || 120) / (Ss.rage && A0.rageR ? 1 / (A0.rageR.tempo || 1) : 1) / 4, sw = A0.swing || 0, st = Ss.step % Ss.theme.spb;
      const off = (st % 4 === 2) ? sw * sd : 0;
      playStep(Ss, Ss.step, Ss.next + off, sd);
      Ss.next += sd; Ss.step++;
    }
  }
  function stopSession(Ss, fade) {
    if (!Ss) return;
    Ss.playing = false; if (Ss.timer) { clearInterval(Ss.timer); Ss.timer = null; }
    const t = ac.currentTime;
    Ss.m.gain.cancelScheduledValues(t); Ss.m.gain.setValueAtTime(Ss.m.gain.value, t); Ss.m.gain.linearRampToValueAtTime(0.0001, t + (fade || 0.12));
    const m = Ss.m; setTimeout(() => { try { m.disconnect(); } catch (e) { } }, ((fade || 0.12) + 3) * 1000);
  }
  function play(arr, opt = {}) {
    if (!bind() || !arr) return;
    stopSession(S, opt.xfade || 0.15);
    events.length = 0;
    const Ss = makeSession(arr, arr.theme, opt);
    if (opt.layer) Ss.layer = opt.layer;
    S = Ss; Ss.timer = setInterval(tick, 25); tick();
  }
  function stop() { stopSession(S, 0.1); S = null; }
  function fadeOut(sec) { if (S) { stopSession(S, sec); S = null; } }
  function setLayer(name) { if (S && S.arr.layers) S.pendingLayer = name; }
  function setRage(on) { if (S) S.rage = !!on; }
  function pollEvents() {
    const o = []; if (!ac) return o;
    const tn = ac.currentTime; while (events.length && events[0].t <= tn) o.push(events.shift());
    if (events.length > 64) events.splice(0, events.length - 64);
    return o;
  }

  // ---------------------------------------------------------------
  //  JINGLES
  // ---------------------------------------------------------------
  function jingle(name) {
    if (!bind()) return;
    stopSession(S, 0.25); S = null;
    const arr = { theme: 'dungeon', room: 2.2, wet: 0.34, gain: 1 };
    const Ss = makeSession(arr, 'jingle', { fadeIn: 0.01 }); Ss.playing = false;
    const ch = Ss.ch, t0 = ac.currentTime + 0.08;
    if (name === 'clear') {
      const sd = 60 / 128 / 4, key = 62, sc = SC.ionian;
      const D = (d) => key + degP(sc, d);
      const mel = [[0, 4, 1], [1, 4, 1], [2, 4, 1], [3, 7, 5], [8, 5, 2], [10, 6, 2], [12, 7, 2], [14, 8, 2], [16, 9, 18]];
      for (const [s, d, l] of mel) { I.trumpet(t0 + s * sd, D(d), l * sd * 0.92, 1.1, ch.lead); I.strings(t0 + s * sd, D(d) + 12, l * sd, 0.5, ch.dbl); }
      const chords = [[0, 0, 8], [8, 3, 4], [12, 4, 4], [16, 0, 18]];
      for (const [s, r, l] of chords) {
        const V = chordTones(r === 4 ? sc : sc, r).map(x => fold(key + x, key - 7));
        for (const m of V) { I.brass(t0 + s * sd, m, l * sd * 0.95, 0.75, ch.h0); I.strings(t0 + s * sd, m - 12, l * sd, 0.45, ch.h1); }
        I.tuba(t0 + s * sd, fold(key + degP(sc, r), key - 28), l * sd * 0.9, 0.9, ch.bass);
      }
      for (let q = 0; q < 8; q++) P.ti(t0 + (12 + q * 0.5) * sd, 0.3 + q * 0.06, ch.perc, fold(key + 7, key - 22));
      P.ti(t0 + 16 * sd, 1.1, ch.perc, fold(key, key - 22)); P.cy(t0 + 16 * sd, 1, ch.perc); P.bd(t0 + 16 * sd, 1, ch.perc);
      for (let i = 0; i < 6; i++) I.harp(t0 + 16 * sd + i * 0.05, key + 12 + degP(sc, [0, 2, 4, 7, 9, 11][i]), 1, 0.6, ch.h2);
    } else if (name === 'defeat') {
      const sd = 60 / 76 / 4, key = 57, sc = SC.aeolian;
      const D = (d) => key + degP(sc, d);
      const mel = [[0, 4, 4], [4, 3, 4], [8, 2, 4], [12, 1, 4], [16, 0, 14]];
      for (const [s, d, l] of mel) I.flute(t0 + s * sd, D(d) + 12, l * sd * 0.95, 0.9, ch.lead);
      for (const [s, r, l] of [[0, 0, 8], [8, 5, 4], [12, 3, 4], [16, 0, 16]]) {
        for (const m of chordTones(sc, r).map(x => fold(key + x, key - 7))) I.strings(t0 + s * sd, m, l * sd, 0.55, ch.h0);
        I.contrabass(t0 + s * sd, fold(key + degP(sc, r), key - 28), l * sd, 0.9, ch.bass);
      }
      for (let i = 0; i < 5; i++) I.harp(t0 + 16 * sd + i * 0.09, key + degP(sc, [0, 2, 4, 7, 9][i]), 1.2, 0.5, ch.h2);
      P.ti(t0, 0.5, ch.perc, fold(key, key - 22)); P.bl(t0 + 16 * sd, 0.5, ch.fx, key - 12);
    }
    S = null;
    const m = Ss.m; setTimeout(() => { try { m.disconnect(); } catch (e) { } }, 9000);
  }

  // ---------------------------------------------------------------
  //  OFFLINE RENDER (tests / previews)
  // ---------------------------------------------------------------
  async function render(arr, secs, opt = {}) {
    const sr = opt.sr || 44100, oc = new OfflineAudioContext(opt.stems ? 4 : 2, Math.ceil(sr * secs), sr);
    const keep = [ac, out, S];
    ac = oc; S = null;
    const comp = oc.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.1;
    const g = oc.createGain(); g.gain.value = opt.bypass ? 1 : 0.9; out = oc.createGain(); if (!opt.stems) { out.connect(opt.bypass ? g : comp); comp.connect(g); g.connect(oc.destination); }
    try {
      if (opt.jingle) { jingle(opt.jingle); }
      else if (opt.sfx) { sfxOut = out; sfxIn = null; let tt = 0.1; for (const [n, x] of opt.sfx) { const g = ac.createGain(); g.gain.value = SFX_GAIN[n] || 1; g.connect(sfxRevIn()); SFX[n](tt, g, x); tt += opt.gap || 1.2; } }
      else {
        let stemDest = null;
        if (opt.stems) {   // 4 dry groups -> 4 output channels, K-weighted
          const mg = oc.createChannelMerger(4); mg.connect(oc.destination); stemDest = {};
          ['lead', 'harm', 'bass', 'perc'].forEach((k, i) => {
            const n = oc.createGain(); n.channelCount = 1; n.channelCountMode = 'explicit';
            const hp = oc.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 90; hp.Q.value = 0.5;
            const sh = oc.createBiquadFilter(); sh.type = 'highshelf'; sh.frequency.value = 1500; sh.gain.value = 4;
            n.connect(hp); hp.connect(sh); sh.connect(mg, 0, i); stemDest[k] = n;
          });
        }
        const Ss = makeSession(arr, arr.theme, { layer: opt.layer, stemDest }); Ss.skip = opt.skip;
        if (opt.solo) { Ss.muted = {}; for (const k in Ss.ch) if (!opt.solo.includes(k)) { Ss.ch[k].gain.value = 0; Ss.muted[k] = 1; } }
        if (opt.kw) {   // K-weighted measurement chain instead of the compressor
          const hp = oc.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 90; hp.Q.value = 0.5;
          const sh = oc.createBiquadFilter(); sh.type = 'highshelf'; sh.frequency.value = 1500; sh.gain.value = 4;
          Ss.m.disconnect(); Ss.m.connect(hp); hp.connect(sh); sh.connect(oc.destination);
        }
        Ss.next = 0.05; Ss.step = opt.fromBar ? opt.fromBar * THEMES[arr.theme].spb : 0;
        const until = T => {
          while (Ss.next < Math.min(T, secs - 0.2)) {
            if (opt.rageAt != null && Ss.next >= opt.rageAt) Ss.rage = true;
            if (opt.layers) { for (const [tt, nm] of opt.layers) if (Ss.next >= tt && Ss._ln !== nm) { Ss.pendingLayer = nm; Ss._ln = nm; } }
            const A0 = Ss.A || active(Ss);
            const sd = 60 / (A0.bpm || 120) / (Ss.rage && A0.rageR ? 1 / (A0.rageR.tempo || 1) : 1) / 4, st = Ss.step % Ss.theme.spb, off = st % 4 === 2 ? (A0.swing || 0) * sd : 0;
            playStep(Ss, Ss.step, Ss.next + off, sd); Ss.next += sd; Ss.step++;
          }
        };
        // schedule just ahead of the render head, like the live scheduler does (keeps the graph small)
        until(0.4);
        for (let tt = 0.25; tt < secs - 0.3; tt += 0.25) {
          const T = tt; oc.suspend(T).then(() => { const k = ac; ac = oc; try { until(T + 0.4); } finally { ac = k; } oc.resume(); });
        }
        Ss.m.gain.setValueAtTime(Ss.A ? Ss.A.gain || 1 : 1, secs - 1.2); Ss.m.gain.linearRampToValueAtTime(0.0001, secs - 0.05);
      }
      events.length = 0;
      return await oc.startRendering();
    } finally { [ac, out, S] = keep; sfxOut = sfxBus; sfxIn = null; }
  }

  // ---------------------------------------------------------------
  //  SOUND EFFECTS — fantasy flavoured, all synthesized.  FMusic.sfx(name, arg)
  // ---------------------------------------------------------------
  function nz(t, dur, dest, type, f, q, peak, tau, f2) {   // filtered noise burst (optionally sweeping to f2)
    const g = G(dest), fl = F(type, f, q, g);
    if (f2) { fl.frequency.setValueAtTime(f, t); fl.frequency.exponentialRampToValueAtTime(f2, t + dur); }
    dec(g, t, 0.003, peak, tau); N(t, dur, fl);
  }
  function thump(t, dest, f0, f1, peak, tau) {
    const g = G(dest), o = ac.createOscillator(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + tau * 2);
    o.connect(g); const e = dec(g, t, 0.002, peak, tau); o.start(t); o.stop(e);
  }
  function ring(t, dest, f, peak, tau, parts = [[1, 1], [1.5, 0.5], [2.37, 0.35], [3.4, 0.2]]) {   // struck metal
    const g = G(dest); const e = dec(g, t, 0.001, peak, tau);
    for (const [r, a] of parts) O('sine', f * r, t, e, G(g, a));
  }
  function sweep(t, dest, type, f0, f1, dur, peak) {
    const g = G(dest), o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    o.connect(g); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.start(t); o.stop(t + dur + 0.02);
  }
  function coinTone(t, d, m, v) {
    const g = G(d), hz = mtof(m); const e = dec(g, t, 0.001, 0.09 * v, 0.12);
    O('square', hz, t, e, F('lowpass', 7000, 0.7, g)); O('triangle', hz * 2, t, e, G(g, 0.5));
  }
  const PENTA = [0, 2, 4, 7, 9];
  const SFX = {
    select(t, d) { I.harp(t, 86, 0.2, 0.75, d); I.harp(t + 0.04, 93, 0.25, 0.5, d); nz(t, 0.02, d, 'highpass', 3000, 0.7, 0.05, 0.006); },
    confirm(t, d) { [79, 84, 88, 91].forEach((m, i) => I.harp(t + i * 0.05, m, 0.4, 0.8, d)); I.glass(t + 0.2, 96, 0.6, 0.45, d); },
    coin(t, d, n = 0) {
      const k = Math.min(14, n | 0), m = 83 + Math.floor(k / 5) * 12 + PENTA[k % 5];
      coinTone(t, d, m, 1); coinTone(t + 0.055, d, m + 5, 0.95); I.glass(t + 0.055, m + 17, 0.3, 0.25, d);
    },
    buy(t, d) { for (let i = 0; i < 4; i++) coinTone(t + i * 0.06, d, 86 + [0, 4, 2, 7][i], 0.8); I.bell(t + 0.28, 91, 1, 0.5, d); I.harp(t + 0.28, 79, 0.6, 0.6, d); },
    equip(t, d) { nz(t, 0.28, d, 'bandpass', 2000, 3, 0.25, 0.08, 9000); ring(t + 0.06, d, 1750, 0.07, 0.35); I.harp(t + 0.1, 91, 0.4, 0.4, d); },
    hit(t, d) { thump(t, d, 170, 55, 0.75, 0.07); nz(t, 0.1, d, 'bandpass', 1300, 1, 0.55, 0.035); nz(t, 0.04, d, 'highpass', 4000, 0.7, 0.25, 0.01); },
    crit(t, d) {
      thump(t, d, 200, 45, 0.95, 0.1); nz(t, 0.25, d, 'bandpass', 5500, 2, 0.55, 0.06, 700); nz(t, 0.06, d, 'highpass', 3500, 0.7, 0.35, 0.015);
      ring(t + 0.01, d, 2200, 0.06, 0.45); [91, 95, 98].forEach((m, i) => I.glass(t + 0.06 + i * 0.04, m, 0.4, 0.35, d));
    },
    bosshit(t, d) { thump(t, d, 130, 40, 0.9, 0.11); nz(t, 0.14, d, 'bandpass', 900, 1, 0.55, 0.05); ring(t, d, 620, 0.05, 0.25); },
    block(t, d) { ring(t, d, 1650, 0.11, 0.32, [[1, 1], [1.51, 0.7], [2.36, 0.5], [3.15, 0.3]]); nz(t, 0.03, d, 'highpass', 2500, 0.7, 0.3, 0.008); },
    hurt(t, d) { thump(t, d, 130, 40, 1, 0.12); nz(t, 0.18, d, 'lowpass', 900, 0.7, 0.5, 0.05); sweep(t + 0.01, d, 'triangle', 420, 150, 0.18, 0.12); },
    kill(t, d) { nz(t, 0.4, d, 'lowpass', 2600, 1, 0.5, 0.12, 250); thump(t, d, 110, 50, 0.4, 0.08); [86, 91, 95].forEach((m, i) => I.glass(t + 0.08 + i * 0.05, m, 0.4, 0.4, d)); },
    levelup(t, d) {
      [[0, 72, 0.08], [0.09, 76, 0.08], [0.18, 79, 0.08], [0.27, 84, 0.55]].forEach(([dt, m, l]) => { I.trumpet(t + dt, m, l, 0.9, d); I.trumpet(t + dt, m - 12, l, 0.5, d); });
      for (let i = 0; i < 8; i++) I.harp(t + 0.27 + i * 0.035, 79 + [0, 2, 4, 7, 9, 12, 14, 16][i], 0.5, 0.45, d);
      I.bell(t + 0.27, 96, 1, 0.35, d);
    },
    heal(t, d) { for (let i = 0; i < 9; i++) I.harp(t + i * 0.045, 72 + Math.floor(i / 5) * 12 + PENTA[i % 5], 0.6, 0.6, d); I.glass(t + 0.4, 96, 1, 0.4, d); I.glass(t + 0.45, 103, 1, 0.25, d); },
    spring(t, d) { SFX.heal(t, d); for (let i = 0; i < 6; i++) sweep(t + 0.05 + i * 0.08, d, 'sine', 500 + i * 90, 1100 + i * 140, 0.06, 0.08); },
    buff(t, d) { nz(t, 0.45, d, 'bandpass', 400, 2, 0.35, 0.18, 2600); for (const m of [60, 64, 67, 72]) I.brass(t + 0.38, m, 0.35, 0.7, d); P.ti(t + 0.38, 0.8, d, 48); I.glass(t + 0.42, 96, 0.8, 0.35, d); },
    chest(t, d) {
      const g = G(d), o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(95, t); o.frequency.linearRampToValueAtTime(140, t + 0.28);
      const bp = F('bandpass', 700, 4, g); o.connect(bp); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.04); g.gain.linearRampToValueAtTime(0, t + 0.3); o.start(t); o.stop(t + 0.32);
      [72, 76, 79, 84, 88].forEach((m, i) => I.harp(t + 0.3 + i * 0.05, m, 0.6, 0.75, d)); I.bell(t + 0.55, 96, 1.2, 0.4, d); I.glass(t + 0.55, 100, 1, 0.3, d);
    },
    item(t, d) { [79, 84, 91].forEach((m, i) => I.celesta(t + i * 0.07, m, 0.4, 0.8, d)); },
    crate(t, d) { thump(t, d, 160, 60, 0.6, 0.06); nz(t, 0.16, d, 'bandpass', 850, 2, 0.6, 0.04); for (let i = 0; i < 4; i++) nz(t + 0.03 + i * 0.03, 0.03, d, 'bandpass', 1400 + i * 300, 4, 0.25, 0.012); },
    door(t, d) {
      const g = G(d), fl = F('lowpass', 180, 1, g); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.7, t + 0.5); g.gain.linearRampToValueAtTime(0, t + 1.2); N(t, 1.25, fl);
      sweep(t, d, 'sawtooth', 48, 40, 1.1, 0.06); thump(t + 1.05, d, 90, 32, 1, 0.18); nz(t + 1.05, 0.4, d, 'lowpass', 600, 0.7, 0.5, 0.12);
    },
    bossAppear(t, d) {
      P.gg(t, 1.2, d); for (const m of [36, 43, 48]) I.brass(t, m, 0.9, 0.9, d);
      for (let i = 0; i < 6; i++) P.ti(t + i * 0.06, 0.4 + i * 0.1, d, 43); P.ti(t + 0.4, 1, d, 36);
    },
    roar(t, d) {
      const g = G(d), o = ac.createOscillator(), o2 = ac.createOscillator(); o.type = o2.type = 'sawtooth';
      o.frequency.setValueAtTime(95, t); o.frequency.linearRampToValueAtTime(80, t + 1); o2.frequency.setValueAtTime(97, t); o2.frequency.linearRampToValueAtTime(76, t + 1);
      const bp = F('bandpass', 400, 3, g); bp.frequency.setValueAtTime(350, t); bp.frequency.linearRampToValueAtTime(950, t + 0.3); bp.frequency.linearRampToValueAtTime(300, t + 1);
      const am = ac.createGain(); am.gain.value = 0.7; const l = ac.createOscillator(), lg = G(am.gain, 0.3); l.frequency.value = 28; l.connect(lg);
      o.connect(am); o2.connect(am); am.connect(bp); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.9, t + 0.12); g.gain.linearRampToValueAtTime(0, t + 1.05);
      for (const n of [o, o2, l]) { n.start(t); n.stop(t + 1.1); }
      nz(t, 1, d, 'bandpass', 700, 1, 0.25, 0.4);
    },
    down(t, d) { thump(t, d, 110, 35, 1, 0.16); sweep(t + 0.05, d, 'triangle', 600, 90, 0.7, 0.14); nz(t, 0.5, d, 'lowpass', 500, 0.7, 0.35, 0.15); },
    quake(t, d) { P.bd(t, 1.2, d); P.tk(t, 0.9, d); nz(t, 0.6, d, 'lowpass', 380, 0.7, 0.6, 0.18); },
    boom(t, d) { nz(t, 0.7, d, 'lowpass', 4000, 0.8, 0.7, 0.2, 150); thump(t, d, 95, 32, 0.9, 0.14); nz(t, 0.08, d, 'highpass', 2000, 0.7, 0.3, 0.02); },
    magic(t, d) { nz(t, 0.24, d, 'bandpass', 600, 4, 0.35, 0.09, 3200); sweep(t, d, 'sine', 900, 1700, 0.16, 0.07); },
    magic2(t, d) { for (const f of [700, 742]) { const g = G(d), o = ac.createOscillator(); o.frequency.value = f; o.connect(g); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.08); g.gain.linearRampToValueAtTime(0, t + 0.55); vib(t, [o], 7, 40, 0.01, t + 0.6); o.start(t); o.stop(t + 0.6); } },
    summon(t, d) { sweep(t, d, 'sine', 80, 220, 0.5, 0.25); const g = G(d), fl = F('bandpass', 900, 2, g); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.4, t + 0.45); g.gain.linearRampToValueAtTime(0, t + 0.55); N(t, 0.6, fl); I.glass(t + 0.45, 91, 0.8, 0.4, d); },
    warp(t, d) { sweep(t, d, 'sine', 1800, 260, 0.18, 0.12); sweep(t + 0.18, d, 'sine', 260, 1800, 0.18, 0.12); I.glass(t + 0.36, 98, 0.6, 0.35, d); },
  };
  // effects go dry to the bus and a little into the room
  let sfxIn = null;
  function sfxRevIn() {
    if (sfxIn && sfxIn.context === ac) return sfxIn;
    sfxIn = ac.createGain(); sfxIn.connect(sfxOut); if (sfxRev && sfxRev.context === ac) sfxIn.connect(sfxRev);
    return sfxIn;
  }
  // loudness trims (measured peaks -> impacts ~0.7, chimes and UI ~0.35)
  const SFX_GAIN = { select: 2.5, confirm: 1.4, coin: 1.67, buy: 1.67, equip: 2.06, hit: 0.67, crit: 0.54, bosshit: 0.64, block: 0.9, hurt: 0.65, kill: 1.06, levelup: 1.25, heal: 1.3, spring: 1.3, buff: 0.72, chest: 1.21, item: 2.06, crate: 1.01, door: 0.68, bossAppear: 0.63, roar: 1.35, down: 0.67, quake: 0.47, boom: 0.5, magic: 4.0, magic2: 2.92, summon: 1.6, warp: 2.92 };
  function sfx(name, arg) {
    if (!bind() || !SFX[name]) return;
    try { const g = ac.createGain(); g.gain.value = SFX_GAIN[name] || 1; g.connect(sfxRevIn()); SFX[name](ac.currentTime + 0.005, g, arg); setTimeout(() => { try { g.disconnect(); } catch (e) { } }, 4000); } catch (e) { }
  }

  // calibration: play an instrument alone (8 notes around middle C) and return its RMS / peak in dB
  async function _cal(name, oc, base = 60) {
    const keep = [ac, out, S]; ac = oc; S = null;
    try {
      out = oc.destination;
      // rough K-weighting (as in LUFS): high-pass the lows, lift the presence region
      const hp = oc.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 90; hp.Q.value = 0.5;
      const sh = oc.createBiquadFilter(); sh.type = 'highshelf'; sh.frequency.value = 1500; sh.gain.value = 4;
      const g = oc.createGain(); g.connect(hp); hp.connect(sh); sh.connect(oc.destination);
      const isP = !!P[name] && !I[name];
      for (let i = 0; i < 8; i++) { const t = 0.05 + i * 0.45; if (isP) P[name](t, 1, g, base); else (I[name]._raw || I[name])(t, base + [0, 2, 4, 5, 7, 9, 11, 12][i], 0.4, 1, g); }
      const buf = await oc.startRendering(), L = buf.getChannelData(0);
      let ss = 0, pk = 0; for (const x of L) { ss += x * x; if (Math.abs(x) > pk) pk = Math.abs(x); }
      return [+(10 * Math.log10(ss / L.length)).toFixed(1), +(20 * Math.log10(pk)).toFixed(1)];
    } finally { [ac, out, S] = keep; }
  }

  return { init, resume, suspend, setVolume, sfx, SFX, _cal, THEMES, MODES, play, stop, fadeOut, setLayer, setRage, pollEvents, jingle, render, I, P, get playing() { return !!(S && S.playing); }, get arr() { return S && S.arr; }, get layer() { return S && (S.pendingLayer || S.layer); }, get rage() { return !!(S && S.rage); } };
})();
