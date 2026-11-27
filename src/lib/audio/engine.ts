let actx: AudioContext | null = null;
let muted = false;

export function setMuted(m: boolean): void {
  muted = m;
}

/** Lazily created AudioContext singleton. Returns null when audio is unavailable. */
export function ensureAudio(): AudioContext | null {
  if (muted) return null;
  if (!actx) {
    try {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
    } catch {
      actx = null;
    }
  }
  if (actx && actx.state === 'suspended') void actx.resume();
  return actx;
}
