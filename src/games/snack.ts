import { FACTS, JOKES, RIDDLES, WYR } from '../lib/data';
import { pick, pickNoRepeat, rand } from '../lib/random';
import { blip } from '../lib/audio/blips';
import type { GameDef } from './types';

/**
 * Brain Snack. NOTE (Phase 2): the Would You Rather percentages are still
 * locally generated placeholders (34 + rand(34)), exactly as in the
 * prototype. Phase 2 replaces them with real votes from the database.
 */
export const snackGame: GameDef = {
  id: 'snack',
  name: 'Brain Snack',
  tag: 'Facts · jokes · riddles',
  icon: '🧠',
  desc: 'Facts, jokes, riddles and impossible choices, served bite-size.',
  mount(stage, ctx) {
    let lastFact = -1;
    let lastJoke = -1;
    let riddle: (typeof RIDDLES)[number] | null = null;
    stage.innerHTML =
      '<p class="cardkind" id="snackKind">Brain snack bar</p>' +
      '<div id="snackBody"><p class="cardtext">Pick a flavor. All snacks are calorie-free and mostly true.</p></div>' +
      '<div class="btnrow">' +
      '<button class="btn ghost" data-snack="fact" type="button">Fact</button>' +
      '<button class="btn ghost" data-snack="joke" type="button">Joke</button>' +
      '<button class="btn ghost" data-snack="riddle" type="button">Riddle</button>' +
      '<button class="btn" data-snack="wyr" type="button">Would You Rather</button>' +
      '</div>';
    const kindEl = stage.querySelector<HTMLElement>('#snackKind');
    const body = stage.querySelector<HTMLElement>('#snackBody');
    if (!kindEl || !body) return;

    function show(html: string, kind: string): void {
      kindEl!.textContent = kind;
      body!.innerHTML = html;
      body!.classList.remove('flip');
      void body!.offsetWidth;
      body!.classList.add('flip');
    }

    stage.querySelectorAll<HTMLButtonElement>('[data-snack]').forEach((b) => {
      b.addEventListener('click', () => {
        const type = b.getAttribute('data-snack');
        blip(440, 0.06);
        ctx.recordPlay('snack');
        if (type === 'fact') {
          const { value, index } = pickNoRepeat(FACTS, lastFact);
          lastFact = index;
          show(`<p class="cardtext"></p>`, 'Random fact');
          const p = body.querySelector('.cardtext');
          if (p) p.textContent = value.text;
        } else if (type === 'joke') {
          const { value, index } = pickNoRepeat(JOKES, lastJoke);
          lastJoke = index;
          show(
            '<p class="cardtext"></p><p class="cardnote">You are contractually obligated to at least exhale through your nose.</p>',
            'Joke of the moment',
          );
          const p = body.querySelector('.cardtext');
          if (p) p.textContent = value.text;
        } else if (type === 'riddle') {
          riddle = pick(RIDDLES);
          show(
            '<p class="cardtext"></p>' +
              '<div class="btnrow"><button class="btn" id="revealBtn" type="button">Reveal answer</button></div>',
            'Riddle me this',
          );
          const p = body.querySelector('.cardtext');
          if (p) p.textContent = riddle.q;
          body.querySelector('#revealBtn')?.addEventListener('click', () => {
            show(
              '<p class="cardtext"></p><p class="cardnote">No, you may not say “I knew that.”</p>',
              'The answer',
            );
            const a = body.querySelector('.cardtext');
            if (a) a.textContent = riddle?.a ?? '';
            blip(660, 0.08);
          });
        } else {
          const pair = pick(WYR);
          show(
            '<div class="wyr">' +
              '<button type="button" data-wyr="0"></button>' +
              '<span class="vs">OR</span>' +
              '<button type="button" data-wyr="1"></button></div>' +
              '<p class="cardnote">Choose wisely. There are no refunds.</p>',
            'Would you rather',
          );
          const opts = Array.from(body.querySelectorAll<HTMLButtonElement>('[data-wyr]'));
          opts[0]?.appendChild(document.createTextNode(pair.a));
          opts[1]?.appendChild(document.createTextNode(pair.b));
          opts.forEach((opt) => {
            opt.addEventListener('click', () => {
              const mine = 34 + rand(34);
              const other = 100 - mine;
              opts.forEach((o) => {
                o.disabled = true;
                const pct = document.createElement('span');
                pct.className = 'pct';
                pct.textContent = `${o === opt ? mine : other}%`;
                o.appendChild(pct);
              });
              const note = body.querySelector('.cardnote');
              if (note) {
                note.textContent =
                  'That is what the other bored humans picked. Statistically speaking. Probably.';
              }
              blip(590, 0.08);
            });
          });
        }
      });
    });
  },
};
