import { ANSWERS, DIE_FACES } from '../lib/data';
import { pick, rand } from '../lib/random';
import { blip } from '../lib/audio/blips';
import { confetti } from '../lib/fx';
import type { GameDef } from './types';

export const oracleGame: GameDef = {
  id: 'oracle',
  name: 'The Oracle',
  tag: 'Coin · dice · decisions',
  icon: '🪙',
  desc: 'Flip a coin, roll the dice, or let the decision ball run your life.',
  mount(stage, ctx) {
    stage.innerHTML =
      '<div class="oracle-tools" role="group" aria-label="Choose your oracle">' +
      '<button class="otool" data-tool="coin" type="button" aria-pressed="true">Coin flip</button>' +
      '<button class="otool" data-tool="dice" type="button" aria-pressed="false">Dice roll</button>' +
      '<button class="otool" data-tool="ball" type="button" aria-pressed="false">Decision ball</button></div>' +
      '<div id="oBody"></div>';
    const body = stage.querySelector<HTMLElement>('#oBody');
    if (!body) return;

    function ask(): void {
      ctx.store.update((s) => {
        s.counts.oracleAsks += 1;
      });
      ctx.checkAchievements();
    }

    function showCoin(): void {
      body!.innerHTML =
        '<div class="coin" id="coin">?</div>' +
        '<p class="cardnote" id="coinNote">Heads you win. Tails you also win, emotionally.</p>' +
        '<div class="btnrow"><button class="btn" id="coinBtn" type="button">Flip it</button></div>';
      const coin = body!.querySelector<HTMLElement>('#coin');
      const note = body!.querySelector<HTMLElement>('#coinNote');
      body!.querySelector('#coinBtn')?.addEventListener('click', () => {
        const heads = Math.random() < 0.5;
        ask();
        if (!coin) return;
        coin.classList.remove('spinning');
        void coin.offsetWidth;
        coin.classList.add('spinning');
        coin.textContent = '…';
        blip(980, 0.07);
        setTimeout(
          () => {
            coin.textContent = heads ? 'Heads' : 'Tails';
            if (note) {
              note.textContent = heads
                ? 'HEADS. The universe has spoken. No appeals.'
                : 'TAILS. The universe has spoken. It mumbled, but still.';
            }
            blip(700, 0.09);
          },
          ctx.reduced ? 60 : 880,
        );
      });
    }

    function showDice(): void {
      body!.innerHTML =
        '<div class="dice"><span class="die" id="d1">⚄</span><span class="die" id="d2">⚂</span></div>' +
        '<p class="cardtext" id="diceTotal" style="font-size:1.4rem;">Total: 8</p>' +
        '<div class="btnrow"><button class="btn" id="diceBtn" type="button">Roll them</button></div>';
      const d1 = body!.querySelector<HTMLElement>('#d1');
      const d2 = body!.querySelector<HTMLElement>('#d2');
      const total = body!.querySelector<HTMLElement>('#diceTotal');
      body!.querySelector('#diceBtn')?.addEventListener('click', () => {
        const a = 1 + rand(6);
        const b = 1 + rand(6);
        ask();
        [d1, d2].forEach((d) => {
          d?.classList.remove('rolling');
          void d?.offsetWidth;
          d?.classList.add('rolling');
        });
        blip(500, 0.06);
        setTimeout(
          () => {
            if (d1) d1.textContent = DIE_FACES[a - 1] ?? '';
            if (d2) d2.textContent = DIE_FACES[b - 1] ?? '';
            if (total) {
              total.textContent = `Total: ${a + b}${a === b ? ' — DOUBLES! Extremely official.' : ''}`;
            }
            if (a === b) confetti();
            blip(640, 0.08);
          },
          ctx.reduced ? 60 : 480,
        );
      });
    }

    function showBall(): void {
      body!.innerHTML =
        '<input class="qinput" id="qInput" type="text" placeholder="Ask a yes-or-no question… (optional, the ball judges silently)" aria-label="Your question" />' +
        '<div class="ball" id="ball" style="margin-top:18px;">Ask, then shake</div>' +
        '<div class="btnrow"><button class="btn" id="ballBtn" type="button">Shake the ball</button></div>';
      const ball = body!.querySelector<HTMLElement>('#ball');
      body!.querySelector('#ballBtn')?.addEventListener('click', () => {
        ask();
        if (!ball) return;
        ball.classList.remove('shaking');
        void ball.offsetWidth;
        ball.classList.add('shaking');
        ball.textContent = '…';
        blip(300, 0.08, 'triangle');
        setTimeout(
          () => {
            ball.textContent = pick(ANSWERS).text;
            blip(560, 0.09);
          },
          ctx.reduced ? 60 : 540,
        );
      });
    }

    stage.querySelectorAll<HTMLButtonElement>('.otool').forEach((b) => {
      b.addEventListener('click', () => {
        stage.querySelectorAll('.otool').forEach((o) => {
          o.setAttribute('aria-pressed', o === b ? 'true' : 'false');
        });
        const t = b.getAttribute('data-tool');
        if (t === 'coin') showCoin();
        else if (t === 'dice') showDice();
        else showBall();
        blip(440, 0.05);
      });
    });
    showCoin();
  },
};
