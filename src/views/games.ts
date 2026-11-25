import { ACTIVITIES } from '../games/registry';
import { el } from '../lib/dom';
import { blip } from '../lib/audio/blips';
import type { ViewDeps } from './types';

const MARQUEE_WORDS =
  'CLICK RESPONSIBLY ✦ BOREDOM IS TEMPORARY ✦ PRODUCTIVITY IS OPTIONAL ✦ JUST CLICK IT ✦ ';

/**
 * Games: the picker grid ("Or pick your poison") with the marquee kept as
 * a strip at the bottom. Tile builder moved verbatim from the old app.
 */
export function renderGames(deps: ViewDeps): HTMLElement {
  const root = el('div');

  const head = el('div', 'pick-head');
  const h2 = el('h2', undefined, 'Or pick your poison');
  const p = el('p', undefined, 'Commitment issues? Fine. Choose your own distraction:');
  head.append(h2, p);

  const grid = el('div', 'grid');
  grid.id = 'grid';
  for (const a of ACTIVITIES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.setAttribute('data-id', a.id);
    const icon = document.createElement('span');
    icon.className = 'ticon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = a.icon;
    const name = document.createElement('span');
    name.className = 'tname';
    name.textContent = a.name;
    const desc = document.createElement('span');
    desc.className = 'tdesc';
    desc.textContent = a.desc;
    const done = document.createElement('span');
    done.className = 'done';
    done.textContent = deps.store.state.tried[a.id] ? '✓ Tried it' : '';
    b.append(icon, name, desc, done);
    b.addEventListener('click', () => {
      blip(500, 0.06);
      deps.openGame(a.id, b);
    });
    grid.appendChild(b);
  }

  const marquee = el('div', 'marquee');
  marquee.setAttribute('aria-hidden', 'true');
  const track = el('div', 'track');
  track.id = 'marqueeTrack';
  track.innerHTML = `<span>${MARQUEE_WORDS.repeat(4)}</span>`.repeat(2);
  marquee.appendChild(track);

  root.append(head, grid, marquee);
  return root;
}
