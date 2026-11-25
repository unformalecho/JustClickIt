import { rand } from '../lib/random';
import { blip } from '../lib/audio/blips';
import { confetti } from '../lib/fx';
import type { GameDef } from './types';

export const reactionGame: GameDef = {
  id: 'reaction',
  name: 'Reaction Test',
  tag: 'How fast are you?',
  icon: '⚡',
  desc: "Wait for the flip, tap instantly, find out if you're a cheetah or a potato.",
  mount(stage, ctx) {
    type Mode = 'idle' | 'waiting' | 'go' | 'done' | 'early';
    let mode: Mode = 'idle';
    let t0 = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tries: number[] = [];

    stage.innerHTML =
      '<button class="pad" id="rPad" type="button"><span id="rMain">Tap to start</span><small id="rSub">Wait for the pad to flip, then tap as fast as you can</small></button>' +
      '<p class="cardnote" id="rLog" style="margin-top:14px;">Average human: ~250ms. Cheetahs declined to comment.</p>';
    const pad = stage.querySelector<HTMLButtonElement>('#rPad');
    const main = stage.querySelector<HTMLElement>('#rMain');
    const sub = stage.querySelector<HTMLElement>('#rSub');
    const log = stage.querySelector<HTMLElement>('#rLog');
    if (!pad || !main || !sub || !log) return;

    function setPad(cls: string, m: string, s: string): void {
      pad!.className = `pad ${cls}`;
      main!.textContent = m;
      sub!.textContent = s;
    }
    function arm(): void {
      mode = 'waiting';
      setPad('waiting', 'Wait for it…', "Don't tap yet. Patience. Breathe.");
      timer = setTimeout(
        () => {
          mode = 'go';
          t0 = performance.now();
          setPad('go', 'TAP!', 'Now now now');
          blip(880, 0.08);
        },
        1200 + rand(2800),
      );
    }

    // Keyboard activation fires 'click', not 'pointerdown'. A pointer tap
    // fires both, so ignore a click that closely follows a pointerdown
    // (and pointerdown is cancelable here, which already suppresses the
    // synthetic click) to keep one physical tap counting exactly once.
    // Starts at -Infinity, not 0: performance.now() counts from page load,
    // so 0 would wrongly swallow a keyboard click in the first 500 ms.
    let lastPointerDown = Number.NEGATIVE_INFINITY;

    const onPress = (): void => {
      if (mode === 'idle' || mode === 'done' || mode === 'early') {
        arm();
        return;
      }
      if (mode === 'waiting') {
        if (timer) clearTimeout(timer);
        mode = 'early';
        setPad('early', 'Too soon!', 'You jumped the gun. Tap to try again.');
        blip(160, 0.15, 'sawtooth');
        return;
      }
      if (mode === 'go') {
        const ms = Math.round(performance.now() - t0);
        mode = 'done';
        tries.push(ms);
        const verdict =
          ms < 180
            ? 'Superhuman. Are you a robot?'
            : ms < 230
              ? 'Lightning fast.'
              : ms < 300
                ? 'Solidly average. Respect.'
                : ms < 400
                  ? 'A bit sleepy, but alive.'
                  : 'Bold strategy: reacting eventually.';
        setPad('', `${ms} ms`, `${verdict} — tap to go again`);
        const isBest =
          ctx.store.state.best.reactionMs === null || ms < ctx.store.state.best.reactionMs;
        ctx.store.update((s) => {
          if (s.best.reactionMs === null || ms < s.best.reactionMs) s.best.reactionMs = ms;
        });
        if (isBest && ms < 220) confetti();
        const avg = Math.round(tries.reduce((a, b) => a + b, 0) / tries.length);
        log.textContent = `Attempts: ${tries.length} · Your average: ${avg}ms · Your best: ${ctx.store.state.best.reactionMs}ms`;
        ctx.recordPlay('reaction', ms);
        ctx.checkAchievements();
        blip(740, 0.09);
      }
    };

    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      lastPointerDown = performance.now();
      onPress();
    });
    pad.addEventListener('click', () => {
      if (performance.now() - lastPointerDown < 500) return;
      onPress();
    });
    return () => {
      if (timer) clearTimeout(timer);
    };
  },
};
