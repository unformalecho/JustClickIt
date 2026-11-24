import { ensureAudio } from './engine';

/** Tiny synth blip (UI feedback), ported from the prototype. */
export function blip(freq: number, dur = 0.09, type: OscillatorType = 'square', vol = 0.06): void {
  const ac = ensureAudio();
  if (!ac) return;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
  o.connect(g);
  g.connect(ac.destination);
  o.start();
  o.stop(ac.currentTime + dur);
}
