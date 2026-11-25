import { DRUMS } from '../lib/audio/drums';
import { ensureAudio } from '../lib/audio/engine';
import type { GameDef } from './types';

export const beatGame: GameDef = {
  id: 'beat',
  name: 'Beat Pad',
  tag: 'Pocket drum kit',
  icon: '🥁',
  desc: 'Eight synthesized drums, an auto-beat machine, zero musical talent needed.',
  mount(stage, ctx) {
    let beatIv: ReturnType<typeof setInterval> | null = null;
    let step = 0;
    let playing = false;

    stage.innerHTML =
      '<p class="cardnote" style="margin:0 0 14px;">A pocket drum kit. Tap the pads, mash the keys, or let the machine cook.</p>' +
      '<div class="pads" id="pads"></div>' +
      '<div class="btnrow"><button class="btn" id="autoBtn" type="button">▶ Auto-beat</button></div>';
    const padsEl = stage.querySelector<HTMLElement>('#pads');
    const autoBtn = stage.querySelector<HTMLButtonElement>('#autoBtn');
    if (!padsEl || !autoBtn) return;
    const padBtns: HTMLButtonElement[] = [];

    function hit(i: number): void {
      DRUMS[i]?.fn();
      ctx.store.update((s) => {
        s.counts.beatHits += 1;
      });
      ctx.checkAchievements();
      const b = padBtns[i];
      if (!b) return;
      b.classList.add('hit');
      setTimeout(() => b.classList.remove('hit'), 130);
    }

    // Keyboard activation fires 'click', not 'pointerdown'. A pointer tap
    // fires both, so ignore a click that closely follows a pointerdown
    // (and pointerdown is cancelable here, which already suppresses the
    // synthetic click) to keep one physical tap counting exactly once.
    let lastPointerDown = 0;

    DRUMS.forEach((d, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'drum';
      b.innerHTML = `${d.name}<span class="key">KEY ${d.key}</span>`;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        lastPointerDown = performance.now();
        hit(i);
      });
      b.addEventListener('click', () => {
        if (performance.now() - lastPointerDown < 500) return;
        hit(i);
      });
      padsEl.appendChild(b);
      padBtns.push(b);
    });

    autoBtn.addEventListener('click', () => {
      if (playing) {
        if (beatIv) clearInterval(beatIv);
        playing = false;
        autoBtn.textContent = '▶ Auto-beat';
        return;
      }
      ensureAudio();
      playing = true;
      step = 0;
      autoBtn.textContent = '■ Stop the beat';
      ctx.store.update((s) => {
        s.counts.beatAutoStarts += 1;
      });
      ctx.checkAchievements();
      beatIv = setInterval(() => {
        const s = step % 16;
        if (s % 4 === 0) hit(0);
        if (s % 8 === 4) hit(1);
        if (s % 2 === 0) hit(2);
        if (s === 14 && Math.random() < 0.6) hit(4);
        if (s === 0 && Math.random() < 0.3) hit(5);
        step++;
      }, 215);
    });

    function onKey(e: KeyboardEvent): void {
      if (ctx.currentId() !== 'beat') return;
      const i = parseInt(e.key, 10);
      if (i >= 1 && i <= 8) hit(i - 1);
    }
    document.addEventListener('keydown', onKey);
    return () => {
      if (beatIv) clearInterval(beatIv);
      document.removeEventListener('keydown', onKey);
    };
  },
};
