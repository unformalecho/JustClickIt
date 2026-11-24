import { rand } from '../lib/random';
import { blip } from '../lib/audio/blips';
import { confetti } from '../lib/fx';
import type { GameDef } from './types';

export const guessGame: GameDef = {
  id: 'guess',
  name: 'Guess the Number',
  tag: '1 to 100',
  icon: '🔮',
  desc: 'A number hides between 1 and 100. Thermal hints guide your hunt.',
  mount(stage, ctx) {
    let secret = 1 + rand(100);
    let attempts = 0;
    let over = false;

    stage.innerHTML =
      '<p class="cardkind">I am thinking of a number between 1 and 100</p>' +
      '<p class="cardtext" id="gMsg">Take a guess. I will judge it thermally.</p>' +
      '<div class="guessrow"><input id="gInput" type="number" min="1" max="100" inputmode="numeric" placeholder="1–100" aria-label="Your guess" />' +
      '<button class="btn" id="gBtn" type="button">Guess</button></div>' +
      '<div class="chips" id="gChips"></div>' +
      '<div class="btnrow"><button class="btn ghost" id="gNew" type="button" style="display:none;">New number</button></div>';
    const msg = stage.querySelector<HTMLElement>('#gMsg');
    const input = stage.querySelector<HTMLInputElement>('#gInput');
    const chips = stage.querySelector<HTMLElement>('#gChips');
    const newBtn = stage.querySelector<HTMLButtonElement>('#gNew');
    if (!msg || !input || !chips || !newBtn) return;

    function judge(): void {
      if (over) return;
      const v = parseInt(input!.value, 10);
      if (Number.isNaN(v) || v < 1 || v > 100) {
        msg!.textContent = 'Between 1 and 100. That is the whole game.';
        return;
      }
      attempts++;
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = String(v);
      chips!.appendChild(chip);
      const d = Math.abs(v - secret);
      if (v === secret) {
        over = true;
        msg!.textContent = `🎉 ${secret}! Got it in ${attempts}${attempts === 1 ? ' attempt. Actual wizard.' : ' attempts.'}`;
        newBtn!.style.display = '';
        blip(880, 0.12);
        setTimeout(() => blip(1174, 0.16), 110);
        confetti();
        ctx.store.update((s) => {
          if (s.best.guessFewest === null || attempts < s.best.guessFewest)
            s.best.guessFewest = attempts;
        });
        ctx.recordPlay('guess', attempts);
        ctx.checkAchievements();
      } else {
        const heat =
          d >= 30
            ? 'Freezing. Arctic. Embarrassing.'
            : d >= 20
              ? 'Cold. Very cold.'
              : d >= 10
                ? 'Warm. Getting somewhere.'
                : d >= 5
                  ? 'Hot! So close.'
                  : 'BURNING. Basically touching it.';
        msg!.textContent = `${v < secret ? 'Higher. ' : 'Lower. '}${heat}`;
        if (d < 10) chip.classList.add('hot');
        blip(v < secret ? 500 : 340, 0.06);
      }
      input!.value = '';
      input!.focus();
    }

    stage.querySelector('#gBtn')?.addEventListener('click', judge);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') judge();
    });
    newBtn.addEventListener('click', () => {
      // Re-mount this game with a fresh secret (same as the prototype).
      ctx.recordPlay('guess');
      secret = 1 + rand(100);
      attempts = 0;
      over = false;
      msg.textContent = 'Take a guess. I will judge it thermally.';
      chips.innerHTML = '';
      newBtn.style.display = 'none';
      input.value = '';
      input.focus();
    });
  },
};
