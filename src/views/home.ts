import { ACTIVITIES } from '../games/registry';
import { pick } from '../lib/random';
import { el } from '../lib/dom';
import { ensureAudio } from '../lib/audio/engine';
import { blip } from '../lib/audio/blips';
import handIcon from '../assets/icons/hand.svg?raw';
import type { ViewDeps } from './types';

/**
 * Home: only the JustClickIt title and the Let's Play button.
 * The button keeps the big button's slot-machine shuffle, then auto-opens
 * the random game. The "Next up:" line is hidden until a shuffle starts.
 */
export function renderHome(deps: ViewDeps): HTMLElement {
  const section = el('section', 'hero home-hero');
  const h1 = el('h1', undefined, 'JustClickIt');
  h1.id = 'homeTitle';
  h1.setAttribute('tabindex', '-1');
  h1.setAttribute('data-view-heading', '');

  const btn = el('button', 'bigbtn') as HTMLButtonElement;
  btn.type = 'button';
  btn.id = 'playBtn';
  // Pixel hand cursor (traced from Lio's reference image) + label. The
  // SVG uses currentColor, so it stays visible on the inverted button in
  // both themes. Decorative: hidden from screen readers.
  btn.innerHTML = `${handIcon}<span>Let's Play</span>`;

  const nextUp = el('p', 'nextup');
  nextUp.setAttribute('aria-live', 'polite');
  nextUp.hidden = true;
  const label = el('span', 'label', 'Next up:');
  const name = el('span', undefined, '???');
  name.id = 'nextUp';
  nextUp.append(label, document.createTextNode(' '), name);

  section.append(h1, btn, nextUp);

  let shuffling = false;
  btn.addEventListener('click', () => {
    if (shuffling) return;
    deps.store.update((s) => {
      s.clicks += 1;
    });
    deps.checkAchievements();
    ensureAudio();
    blip(392, 0.07);
    const current = deps.currentGameId();
    const pool = ACTIVITIES.filter((a) => a.id !== current);
    const target = pick(pool.length > 0 ? pool : ACTIVITIES);
    nextUp.hidden = false;
    if (deps.isReduced()) {
      name.textContent = target.name;
      deps.openGame(target.id, btn);
      return;
    }
    shuffling = true;
    btn.disabled = true;
    let ticks = 0;
    const iv = setInterval(() => {
      name.textContent = pick(ACTIVITIES).name;
      blip(300 + ticks * 30, 0.03, 'square', 0.03);
      ticks++;
      if (ticks >= 11) {
        clearInterval(iv);
        name.textContent = `${target.name}!`;
        shuffling = false;
        btn.disabled = false;
        blip(784, 0.1);
        deps.openGame(target.id, btn);
      }
    }, 70);
  });

  return section;
}
