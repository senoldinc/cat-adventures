// Tüm sesler WebAudio ile sentezlenir — dosya yok.
import { save } from './save.js';

let ctx = null;
let master = null;
let sfxBus = null;
let musicBus = null;
let noiseBuf = null;

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0;
    musicBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    applySettings();
    startMusic();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function applySettings() {
  if (!ctx) return;
  sfxBus.gain.value = save.settings.sfx ? 1 : 0;
  musicBus.gain.setTargetAtTime(save.settings.music ? 0.16 : 0, ctx.currentTime, 0.3);
}

function tone({ type = 'sine', f0, f1 = f0, dur = 0.15, vol = 0.3, attack = 0.005, delay = 0, bus = sfxBus, curve = 'exp' }) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) {
    if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    else o.frequency.linearRampToValueAtTime(f1, t + dur);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise({ dur = 0.2, vol = 0.3, freq = 1200, q = 1, type = 'bandpass', delay = 0, f1 }) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(sfxBus);
  s.start(t);
  s.stop(t + dur + 0.05);
}

let kibbleCombo = 0;
let kibbleComboT = 0;

export const sfx = {
  jump() { tone({ type: 'square', f0: 330, f1: 660, dur: 0.12, vol: 0.08 }); tone({ f0: 500, f1: 900, dur: 0.12, vol: 0.12 }); },
  doubleJump() { tone({ type: 'triangle', f0: 600, f1: 1200, dur: 0.16, vol: 0.18 }); tone({ f0: 900, f1: 1500, dur: 0.1, vol: 0.08, delay: 0.05 }); },
  land() { noise({ dur: 0.08, vol: 0.12, freq: 300, type: 'lowpass' }); },
  bounce() { tone({ f0: 200, f1: 700, dur: 0.25, vol: 0.25, curve: 'lin' }); tone({ type: 'triangle', f0: 400, f1: 1000, dur: 0.2, vol: 0.1, delay: 0.03 }); },
  glide() { noise({ dur: 0.25, vol: 0.05, freq: 900, f1: 600, q: 2 }); },
  climb() { noise({ dur: 0.05, vol: 0.06, freq: 2500, q: 3 }); },
  kibble() {
    if (!ctx) return;
    const now = ctx.currentTime;
    kibbleCombo = now - kibbleComboT < 0.6 ? Math.min(kibbleCombo + 1, 12) : 0;
    kibbleComboT = now;
    const f = 880 * Math.pow(2, kibbleCombo / 12);
    tone({ type: 'triangle', f0: f, dur: 0.09, vol: 0.18 });
    tone({ f0: f * 1.5, dur: 0.12, vol: 0.08, delay: 0.04 });
  },
  bone() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.25, vol: 0.18, delay: i * 0.07 })); },
  bell() {
    [0, 0.25, 0.5].forEach((d) => {
      tone({ f0: 1568, dur: 1.2, vol: 0.18, delay: d });
      tone({ f0: 1568 * 2.76, dur: 0.6, vol: 0.05, delay: d });
      tone({ f0: 1568 * 5.4, dur: 0.3, vol: 0.03, delay: d });
    });
  },
  checkpoint() { [659, 784, 988].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.3, vol: 0.18, delay: i * 0.1 })); },
  poof() { noise({ dur: 0.35, vol: 0.35, freq: 2000, f1: 300, q: 0.8 }); tone({ f0: 700, f1: 200, dur: 0.2, vol: 0.12 }); },
  hurt() { tone({ type: 'square', f0: 500, f1: 180, dur: 0.3, vol: 0.12 }); },
  splash() { noise({ dur: 0.5, vol: 0.35, freq: 1500, f1: 400, q: 0.6 }); },
  meow() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const pitch = 0.9 + Math.random() * 0.25;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(420 * pitch, t);
    o.frequency.linearRampToValueAtTime(720 * pitch, t + 0.12);
    o.frequency.linearRampToValueAtTime(520 * pitch, t + 0.45);
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass'; f1.Q.value = 6;
    f1.frequency.setValueAtTime(700, t);
    f1.frequency.linearRampToValueAtTime(1800, t + 0.15);
    f1.frequency.linearRampToValueAtTime(1000, t + 0.45);
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass'; f2.Q.value = 8; f2.frequency.value = 2600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.05);
    g.gain.setValueAtTime(0.5, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(f1).connect(g);
    o.connect(f2).connect(g);
    g.connect(sfxBus);
    o.start(t);
    o.stop(t + 0.55);
  },
  paw() { noise({ dur: 0.14, vol: 0.22, freq: 2400, f1: 900, q: 1.2 }); tone({ type: 'triangle', f0: 320, f1: 180, dur: 0.08, vol: 0.15, delay: 0.06 }); },
  bonk() { tone({ type: 'square', f0: 260, f1: 140, dur: 0.12, vol: 0.1 }); [1300, 1600, 1900].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.12, vol: 0.06, delay: 0.08 + i * 0.06 })); },
  alert() { tone({ type: 'square', f0: 900, f1: 1300, dur: 0.1, vol: 0.06 }); tone({ type: 'square', f0: 900, f1: 1300, dur: 0.1, vol: 0.06, delay: 0.13 }); },
  squeak() { tone({ type: 'sine', f0: 1800, f1: 2600, dur: 0.12, vol: 0.12 }); tone({ type: 'sine', f0: 2200, f1: 1600, dur: 0.1, vol: 0.08, delay: 0.1 }); },
  click() { tone({ type: 'triangle', f0: 700, dur: 0.06, vol: 0.15 }); },
  buy() { [1047, 1319, 1568, 2093].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.12, vol: 0.06, delay: i * 0.06 })); },
  error() { tone({ type: 'square', f0: 220, dur: 0.15, vol: 0.08 }); tone({ type: 'square', f0: 180, dur: 0.2, vol: 0.08, delay: 0.12 }); },
  win() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.3, vol: 0.16, delay: i * 0.12 })); },
  tick() { tone({ type: 'square', f0: 1200, dur: 0.04, vol: 0.05 }); },
  launch() { tone({ type: 'square', f0: 180, f1: 900, dur: 0.3, vol: 0.1, curve: 'lin' }); noise({ dur: 0.15, vol: 0.15, freq: 3000, q: 1 }); tone({ type: 'triangle', f0: 1200, dur: 0.1, vol: 0.1, delay: 0.05 }); },
  plate() { tone({ type: 'square', f0: 300, f1: 200, dur: 0.08, vol: 0.1 }); tone({ type: 'triangle', f0: 660, dur: 0.15, vol: 0.14, delay: 0.07 }); },
  button() { tone({ type: 'square', f0: 240, f1: 160, dur: 0.07, vol: 0.12 }); tone({ type: 'triangle', f0: 988, dur: 0.18, vol: 0.15, delay: 0.06 }); tone({ type: 'triangle', f0: 1319, dur: 0.22, vol: 0.12, delay: 0.14 }); },
  appear() { [784, 988, 1175, 1568].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.2, vol: 0.12, delay: i * 0.06 })); noise({ dur: 0.3, vol: 0.06, freq: 5000, q: 2, delay: 0.05 }); },
  bossRoar() { [0, 0.18, 0.36].forEach((d, i) => tone({ type: 'sawtooth', f0: 420 - i * 40, f1: 700 - i * 60, dur: 0.16, vol: 0.08, delay: d })); },
  charge() { noise({ dur: 0.35, vol: 0.12, freq: 600, f1: 1800, q: 1.5 }); },
  bossHit() { tone({ type: 'square', f0: 900, f1: 300, dur: 0.25, vol: 0.12 }); tone({ type: 'sine', f0: 1800, f1: 2600, dur: 0.12, vol: 0.12, delay: 0.1 }); noise({ dur: 0.2, vol: 0.2, freq: 1500, q: 0.8 }); },
  victory() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => { tone({ type: 'triangle', f0: f, dur: 0.35, vol: 0.15, delay: i * 0.1 }); tone({ type: 'square', f0: f / 2, dur: 0.2, vol: 0.04, delay: i * 0.1 }); }); },
};

// Oda müzikleri: kök nota, tempo, desen, akor yürüyüşü, melodi dalga türü
const TRACKS = {
  salon: { root: 261.63, bpm: 92, pattern: [0, 2, 4, 2, 3, 2, 4, 1], chords: [0, 5, 7, 3], wave: 'triangle', vol: 0.12 },
  kitchen: { root: 293.66, bpm: 116, pattern: [0, 4, 2, 4, 1, 4, 3, 4], chords: [0, 5, 0, 7], wave: 'triangle', vol: 0.11 },
  boss: { root: 220, bpm: 138, pattern: [0, 0, 3, 0, 4, 3, 2, 1], chords: [0, 0, 5, 7], wave: 'square', vol: 0.05 },
};
let track = TRACKS.salon;
let trackStep = 0;
export function setMusic(name) {
  const next = TRACKS[name] || TRACKS.salon;
  if (next === track) return;
  track = next;
  trackStep = 0;
}

// Yumuşak, döngüsel müzik: pentatonik arpej + bas.
function startMusic() {
  const scale = [0, 2, 4, 7, 9];
  let next = ctx.currentTime + 0.2;
  function schedule() {
    while (next < ctx.currentTime + 0.4) {
      const { root, bpm, pattern, chords, wave, vol } = track;
      const step = 60 / bpm / 2;
      const i = trackStep;
      const bar = Math.floor(i / 8) % chords.length;
      const c = chords[bar];
      const deg = pattern[i % 8];
      const oct = deg >= 4 ? 12 : 0;
      const semi = c + scale[deg % 5] + oct;
      const f = root * Math.pow(2, semi / 12);
      const delay = next - ctx.currentTime;
      tone({ type: wave, f0: f, dur: step * 1.8, vol, attack: 0.02, delay, bus: musicBus });
      if (i % 8 === 0) tone({ type: 'sine', f0: (root / 2) * Math.pow(2, c / 12), dur: step * 7, vol: 0.22, attack: 0.05, delay, bus: musicBus });
      if (i % 8 === 4) tone({ type: 'sine', f0: (root / 2) * Math.pow(2, (c + 7) / 12), dur: step * 3, vol: 0.12, attack: 0.05, delay, bus: musicBus });
      next += step;
      trackStep++;
    }
  }
  setInterval(schedule, 100);
}
