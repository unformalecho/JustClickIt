import { rand } from '../lib/random';
import { blip } from '../lib/audio/blips';
import type { GameDef } from './types';

export const memoryGame: GameDef = {
  id: 'memory',
  name: 'Memory Echo',
  tag: 'Simon says: remember',
  icon: '🔢',
  desc: 'The tiles flash a pattern. Repeat it back. It only gets longer.',
  mount(stage, ctx) {
    let seq: number[] = [];
    let input: number[] = [];
    let accepting = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const shades = [18, 38, 58, 78];

    stage.innerHTML =
      '<p class="statusline" id="sStatus">Watch the pattern. Repeat it. Survive.</p>' +
      '<div class="simon" id="sGrid"></div>' +
      '<div class="btnrow"><button class="btn" id="sStart" type="button">Start</button></div>';
    const grid = stage.querySelector<HTMLElement>('#sGrid');
    const status = stage.querySelector<HTMLElement>('#sStatus');
    const startBtn = stage.querySelector<HTMLButtonElement>('#sStart');
    if (!grid || !status || !startBtn) return;
    const tiles: HTMLButtonElement[] = [];

    for (let i = 0; i < 4; i++) {
      const idx = i;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'stile';
      b.textContent = String(idx + 1);
      b.style.background = `color-mix(in srgb, var(--ink) ${shades[idx]}%, var(--paper))`;
      b.style.color = (shades[idx] ?? 0) > 50 ? 'var(--inv-ink)' : 'var(--ink)';
      b.addEventListener('click', () => tap(idx));
      grid.appendChild(b);
      tiles.push(b);
    }

    function later(fn: () => void, ms: number): void {
      timers.push(setTimeout(fn, ms));
    }
    function light(idx: number, silent = false): void {
      tiles[idx]?.classList.add('lit');
      if (!silent) blip(280 + idx * 130, 0.12, 'triangle', 0.09);
      later(() => tiles[idx]?.classList.remove('lit'), 260);
    }
    function playSeq(): void {
      accepting = false;
      input = [];
      status!.textContent = `Level ${seq.length} — watch closely…`;
      seq.forEach((idx, k) => {
        later(() => light(idx), 550 * (k + 1));
      });
      later(
        () => {
          accepting = true;
          status!.textContent = `Level ${seq.length} — your turn.`;
        },
        550 * seq.length + 350,
      );
    }
    function nextLevel(): void {
      seq.push(rand(4));
      playSeq();
    }
    function tap(idx: number): void {
      if (!accepting) return;
      light(idx);
      input.push(idx);
      const k = input.length - 1;
      if (input[k] !== seq[k]) {
        accepting = false;
        const score = seq.length - 1;
        status!.textContent = `Wrong tile! You reached level ${seq.length}.`;
        ctx.store.update((s) => {
          if (score > s.best.memoryLevel) s.best.memoryLevel = score;
        });
        ctx.recordPlay('memory', score);
        ctx.checkAchievements();
        startBtn!.textContent = `Try again (best: level ${ctx.store.state.best.memoryLevel})`;
        startBtn!.style.display = '';
        blip(140, 0.3, 'sawtooth', 0.08);
        return;
      }
      if (input.length === seq.length) {
        accepting = false;
        status!.textContent = `Level ${seq.length} cleared. It gets worse.`;
        // Clearing a level counts as reaching it (so level 8 is achievable).
        ctx.store.update((s) => {
          if (seq.length > s.best.memoryLevel) s.best.memoryLevel = seq.length;
        });
        ctx.checkAchievements();
        blip(760, 0.1);
        later(nextLevel, 900);
      }
    }

    startBtn.addEventListener('click', () => {
      seq = [];
      startBtn.style.display = 'none';
      blip(520, 0.08);
      nextLevel();
    });
    return () => {
      timers.forEach(clearTimeout);
    };
  },
};
