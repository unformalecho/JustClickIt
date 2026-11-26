import { el } from '../lib/dom';

/** About: the old footer content, as its own view. */
export function renderAboutView(): HTMLElement {
  const root = el('div', 'about');
  const brand = el('p', 'mono', 'JustClickIt — est. the moment you got bored');
  const grass = el(
    'p',
    undefined,
    'Still bored after all nine? That is genuinely impressive. Go touch grass, then come back and click again.',
  );
  const note = el('p', 'mono', 'Your clicks, records and streak are saved on this device only.');
  note.id = 'footNote';
  root.append(brand, grass, note);
  return root;
}
