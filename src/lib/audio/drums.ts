import { ensureAudio } from './engine';
import { blip } from './blips';

let noiseBufCache: AudioBuffer | null = null;

function noiseBuf(ac: AudioContext): AudioBuffer {
  if (noiseBufCache) return noiseBufCache;
  const buf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBufCache = buf;
  return buf;
}

function env(g: GainNode, peak: number, dur: number): void {
  const ac = ensureAudio();
  if (!ac) return;
  g.gain.setValueAtTime(peak, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
}

function osc(type: OscillatorType, freq: number, endFreq: number, peak: number, dur: number): void {
  const ac = ensureAudio();
  if (!ac) return;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, ac.currentTime);
  if (endFreq !== freq)
    o.frequency.exponentialRampToValueAtTime(endFreq, ac.currentTime + dur * 0.5);
  env(g, peak, dur);
  o.connect(g);
  g.connect(ac.destination);
  o.start();
  o.stop(ac.currentTime + dur + 0.01);
}

function filteredNoise(
  filterType: BiquadFilterType,
  freq: number,
  peak: number,
  dur: number,
): void {
  const ac = ensureAudio();
  if (!ac) return;
  const s = ac.createBufferSource();
  s.buffer = noiseBuf(ac);
  const f = ac.createBiquadFilter();
  f.type = filterType;
  f.frequency.value = freq;
  const g = ac.createGain();
  env(g, peak, dur);
  s.connect(f);
  f.connect(g);
  g.connect(ac.destination);
  s.start();
  s.stop(ac.currentTime + dur + 0.01);
}

export function drumKick(): void {
  osc('sine', 150, 40, 0.5, 0.25);
}
export function drumSnare(): void {
  filteredNoise('highpass', 1200, 0.35, 0.14);
}
export function drumHat(): void {
  filteredNoise('highpass', 7000, 0.18, 0.05);
}
export function drumClap(): void {
  for (let i = 0; i < 3; i++) setTimeout(drumSnare, i * 28);
}
export function drumTom(): void {
  osc('triangle', 220, 90, 0.35, 0.22);
}
export function drumCymbal(): void {
  filteredNoise('highpass', 5500, 0.22, 0.7);
}
export function drumBass(): void {
  const ac = ensureAudio();
  if (!ac) return;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'sawtooth';
  o.frequency.value = 55;
  const f = ac.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 300;
  env(g, 0.3, 0.3);
  o.connect(f);
  f.connect(g);
  g.connect(ac.destination);
  o.start();
  o.stop(ac.currentTime + 0.31);
}
export function drumBlip(): void {
  blip(980, 0.12, 'square', 0.08);
  setTimeout(() => blip(1320, 0.1, 'square', 0.06), 60);
}

export const DRUMS = [
  { name: 'Kick', key: '1', fn: drumKick },
  { name: 'Snare', key: '2', fn: drumSnare },
  { name: 'Hi-Hat', key: '3', fn: drumHat },
  { name: 'Clap', key: '4', fn: drumClap },
  { name: 'Tom', key: '5', fn: drumTom },
  { name: 'Cymbal', key: '6', fn: drumCymbal },
  { name: 'Bass', key: '7', fn: drumBass },
  { name: 'Blip', key: '8', fn: drumBlip },
] as const;
