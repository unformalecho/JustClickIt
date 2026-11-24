import { blip } from '../lib/audio/blips';
import { confetti } from '../lib/fx';
import type { GameDef } from './types';

export const tapRushGame: GameDef = {
  id: 'taprush',
  name: 'Tap Rush',
  tag: '10 seconds of chaos',
  icon: '👆',
  desc: 'Ten seconds. One pad. Tap like your boredom depends on it.',
  mount(stage, ctx) {
    let count = 0;
    let running = false;
    let iv: ReturnType<typeof setInterval> | null = null;
    let left = 0;

    stage.innerHTML =
      '<div class="timebar"><i id="tBar"></i></div>' +
      '<button class="pad" id="tPad" type="button"><span id="tMain">Tap to start</span><small id="tSub">10 seconds. As many taps as humanly possible.</small></button>' +
      '<p class="cardnote" id="tLog" style="margin-top:14px;">Warning: your finger may file a complaint.</p>';
    const pad = stage.querySelector<HTMLButtonElement>('#tPad');
    const main = stage.querySelector<HTMLElement>('#tMain');
    const sub = stage.querySelector<HTMLElement>('#tSub');
    const bar = stage.querySelector<HTMLElement>('#tBar');
    const log = stage.querySelector<HTMLElement>('#tLog');
    if (!pad || !main || !sub || !bar || !log) return;

    function finish(): void {
      running = false;
      if (iv) clearInterval(iv);
      bar!.style.width = '0%';
      main!.textContent = `${count} taps!`;
      const cps = (count / 10).toFixed(1);
      sub!.textContent = `That's ${cps} taps per second. Tap to play again.`;
      const isBest = ctx.store.state.best.tapRush === null || count > ctx.store.state.best.tapRush;
      ctx.store.update((s) => {
        if (s.best.tapRush === null || count > s.best.tapRush) s.best.tapRush = count;
      });
      if (isBest) {
        log!.textContent = `New personal best: ${count} taps. Your finger is a athlete now.`;
        confetti();
      } else {
        log!.textContent = `Your best remains ${ctx.store.state.best.tapRush} taps. The crown holds.`;
      }
      ctx.recordPlay('taprush', count);
      ctx.checkAchievements();
      blip(700, 0.1);
    }

    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (!running) {
        count = 0;
        left = 100;
        running = true;
        main.textContent = '0';
        sub.textContent = 'GO GO GO';
        iv = setInterval(() => {
          left--;
          bar.style.width = `${left}%`;
          if (left <= 0) finish();
        }, 100);
      }
      if (running) {
        count++;
        main.textContent = String(count);
        blip(300 + (count % 8) * 40, 0.03, 'square', 0.03);
      }
    });
    return () => {
      if (iv) clearInterval(iv);
    };
  },
};
