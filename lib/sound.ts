// Tiny synthesized sound effects (no audio files). Only ever played in response
// to a visitor action, and silenced by the sound toggle.
import { useStore } from "./store";

let ctx: AudioContext | null = null;

function audio() {
  if (!useStore.getState().soundOn || typeof window === "undefined") return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function noiseBuffer(ac: AudioContext, seconds: number) {
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * seconds), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/** A crisp mechanical light-switch click. */
export function playClick() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  for (const [delay, freq, gain] of [
    [0, 3200, 0.5],
    [0.035, 1800, 0.25],
  ] as const) {
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer(ac, 0.03);
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = freq;
    bp.Q.value = 3;
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, t + delay);
    g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.03);
    src.connect(bp).connect(g).connect(ac.destination);
    src.start(t + delay);
  }
  const thump = ac.createOscillator();
  thump.frequency.setValueAtTime(140, t);
  thump.frequency.exponentialRampToValueAtTime(60, t + 0.05);
  const tg = ac.createGain();
  tg.gain.setValueAtTime(0.25, t);
  tg.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  thump.connect(tg).connect(ac.destination);
  thump.start(t);
  thump.stop(t + 0.07);
}

/** A soft air whoosh for camera moves. */
export function playWhoosh() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, 0.7);
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 0.8;
  bp.frequency.setValueAtTime(300, t);
  bp.frequency.exponentialRampToValueAtTime(1400, t + 0.3);
  bp.frequency.exponentialRampToValueAtTime(500, t + 0.65);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.07, t + 0.22);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.68);
  src.connect(bp).connect(g).connect(ac.destination);
  src.start(t);
}

/** Inkjet printer: carriage buzz passes plus paper feed. */
export function playPrinter() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  for (let i = 0; i < 5; i++) {
    const start = t + 0.15 + i * 0.32;
    const osc = ac.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(i % 2 ? 210 : 190, start);
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.05, start + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.26);
    osc.connect(lp).connect(g).connect(ac.destination);
    osc.start(start);
    osc.stop(start + 0.28);
  }
  const feed = ac.createBufferSource();
  feed.buffer = noiseBuffer(ac, 1.8);
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2500;
  const fg = ac.createGain();
  fg.gain.setValueAtTime(0.0001, t);
  fg.gain.exponentialRampToValueAtTime(0.025, t + 0.1);
  fg.gain.setValueAtTime(0.025, t + 1.6);
  fg.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
  feed.connect(hp).connect(fg).connect(ac.destination);
  feed.start(t);
}
