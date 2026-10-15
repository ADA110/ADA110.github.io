// A tiny lofi beat, synthesized live with the Web Audio API (no audio files): soft electric-piano
// chords over two jazzy progressions, a warm bass, a swung boom-bap kit, the odd bell melody, a little tape
// wobble, all through a muffled low-pass. Only starts on a visitor's click.

const BPM = 74;
const SIXTEENTH = 60 / BPM / 4;
const SWING = SIXTEENTH * 0.32; // the "and" of each beat lands a little late
const LOOKAHEAD = 0.15;

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);

/** Chord voicings (piano) and bass roots, one chord per bar; the two progressions alternate. */
const PROGRESSIONS: { piano: number[]; bass: number }[][] = [
  [
    { piano: [50, 53, 57, 60, 64], bass: 38 }, // Dm9
    { piano: [53, 59, 64, 69], bass: 43 }, // G13
    { piano: [52, 55, 59, 62], bass: 36 }, // Cmaj9
    { piano: [55, 60, 64, 71], bass: 45 }, // Am9
  ],
  [
    { piano: [53, 57, 60, 64], bass: 41 }, // Fmaj7
    { piano: [50, 55, 59, 62], bass: 40 }, // Em7
    { piano: [48, 53, 57, 60], bass: 38 }, // Dm7
    { piano: [50, 53, 55, 60], bass: 43 }, // G7sus
  ],
];
const BELL = [72, 74, 76, 79, 81, 84]; // C major pentatonic, up high

let ac: AudioContext | null = null;
let bus: GainNode | null = null;
let master: GainNode | null = null;
let wobble: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let step = 0;
let nextTime = 0;
let noise: AudioBuffer | null = null;

function noiseBuffer(seconds: number) {
  const buf = ac!.createBuffer(1, Math.ceil(ac!.sampleRate * seconds), ac!.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function build() {
  ac ??= new AudioContext();
  if (bus) return;
  noise = noiseBuffer(1);
  // master chain: muffle → gentle saturation → glue compressor → volume
  bus = ac.createGain();
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 3600;
  lp.Q.value = 0.5;
  const sat = ac.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(((i / 1023) * 2 - 1) * 1.6);
  sat.curve = curve;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.ratio.value = 3;
  master = ac.createGain();
  master.gain.value = 0;
  bus.connect(lp).connect(sat).connect(comp).connect(master).connect(ac.destination);
  // tape wobble: a slow LFO every piano note's pitch follows
  const lfo = ac.createOscillator();
  lfo.frequency.value = 0.45;
  wobble = ac.createGain();
  wobble.gain.value = 7; // cents
  lfo.connect(wobble);
  lfo.start();
}

function envelope(g: GainNode, t: number, peak: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
}

function piano(note: number, t: number, vel: number, length = 2.4) {
  const g = ac!.createGain();
  envelope(g, t, 0.11 * vel, length);
  const tone = ac!.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 1700;
  tone.connect(g).connect(bus!);
  for (const [type, mult, level] of [
    ["sine", 1, 1],
    ["triangle", 2, 0.18],
  ] as const) {
    const o = ac!.createOscillator();
    o.type = type;
    o.frequency.value = midi(note) * mult;
    o.detune.value = (Math.random() - 0.5) * 10;
    wobble!.connect(o.detune);
    const og = ac!.createGain();
    og.gain.value = level;
    o.connect(og).connect(tone);
    o.start(t);
    o.stop(t + length + 0.05);
  }
}

function bell(note: number, t: number) {
  const o = ac!.createOscillator();
  o.frequency.value = midi(note);
  wobble!.connect(o.detune);
  const g = ac!.createGain();
  envelope(g, t, 0.05, 1.4);
  o.connect(g).connect(bus!);
  o.start(t);
  o.stop(t + 1.5);
}

function bass(note: number, t: number, length: number) {
  const o = ac!.createOscillator();
  o.frequency.value = midi(note);
  const lp = ac!.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 320;
  const g = ac!.createGain();
  envelope(g, t, 0.32, length);
  o.connect(lp).connect(g).connect(bus!);
  o.start(t);
  o.stop(t + length + 0.05);
}

function kick(t: number) {
  const o = ac!.createOscillator();
  o.frequency.setValueAtTime(115, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  const g = ac!.createGain();
  envelope(g, t, 0.75, 0.38);
  o.connect(g).connect(bus!);
  o.start(t);
  o.stop(t + 0.42);
}

function noiseHit(t: number, type: BiquadFilterType, freq: number, peak: number, decay: number) {
  const src = ac!.createBufferSource();
  src.buffer = noise;
  const f = ac!.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = 0.7;
  const g = ac!.createGain();
  envelope(g, t, peak, decay);
  src.connect(f).connect(g).connect(bus!);
  src.start(t, Math.random() * 0.5);
  src.stop(t + decay + 0.05);
}

function snare(t: number) {
  noiseHit(t, "bandpass", 1800, 0.28, 0.2);
  const o = ac!.createOscillator();
  o.type = "triangle";
  o.frequency.value = 185;
  const g = ac!.createGain();
  envelope(g, t, 0.12, 0.1);
  o.connect(g).connect(bus!);
  o.start(t);
  o.stop(t + 0.12);
}

/** Schedules everything that happens on one sixteenth note. */
function schedule(s: number, t: number) {
  const bar = Math.floor(s / 16);
  const i = s % 16;
  const chord = PROGRESSIONS[Math.floor(bar / 4) % 2][bar % 4];
  // keys: the chord on the one (strummed), sometimes a soft push on the "and" of three
  if (i === 0) chord.piano.forEach((n, k) => piano(n, t + k * 0.022 + Math.random() * 0.01, 0.8 + Math.random() * 0.2, 2.8));
  if (i === 10 && Math.random() < 0.5) chord.piano.slice(1).forEach((n, k) => piano(n, t + k * 0.018, 0.45, 1.2));
  // bass: root on one, a pickup before three
  if (i === 0) bass(chord.bass, t, SIXTEENTH * 7);
  if (i === 7 && Math.random() < 0.6) bass(chord.bass + 7, t, SIXTEENTH * 2);
  if (i === 8) bass(chord.bass, t, SIXTEENTH * 6);
  // drums: boom-bap
  if (i === 0 || i === 10 || (i === 7 && Math.random() < 0.3)) kick(t);
  if (i === 4 || i === 12) snare(t);
  if (i % 2 === 0) noiseHit(t, "highpass", 7500, 0.045 * (0.5 + Math.random() * 0.5), 0.05);
  // the odd bell note on top
  if ((i === 2 || i === 6 || i === 14) && Math.random() < 0.22) bell(BELL[Math.floor(Math.random() * BELL.length)], t);
}

function tick() {
  while (nextTime < ac!.currentTime + LOOKAHEAD) {
    const swung = step % 4 === 2 ? SWING : 0;
    schedule(step, nextTime + swung);
    nextTime += SIXTEENTH;
    step++;
  }
}

export function isLofiPlaying() {
  return timer !== null;
}

export function startLofi() {
  if (typeof window === "undefined" || timer) return;
  build();
  void ac!.resume();
  const t = ac!.currentTime;
  master!.gain.cancelScheduledValues(t);
  master!.gain.setValueAtTime(master!.gain.value, t);
  master!.gain.linearRampToValueAtTime(0.85, t + 2.5); // fade in
  step = 0;
  nextTime = t + 0.1;
  timer = setInterval(tick, 25);
}

export function stopLofi() {
  if (!ac || !timer) return;
  clearInterval(timer);
  timer = null;
  const t = ac.currentTime;
  master!.gain.cancelScheduledValues(t);
  master!.gain.setValueAtTime(master!.gain.value, t);
  master!.gain.linearRampToValueAtTime(0, t + 0.6); // fade out
}
