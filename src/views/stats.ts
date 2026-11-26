import { ACTIVITIES, getActivity } from '../games/registry';
import { el } from '../lib/dom';
import type { ViewDeps } from './types';

/**
 * Statistics: the stats strip plus the History list (last 50), moved out
 * of the old modal. Values are read fresh from the store on every render.
 */
export function renderStatsView(deps: ViewDeps): HTMLElement {
  const s = deps.store.state;
  const root = el('div');

  const stats = el('section', 'stats');
  stats.setAttribute('aria-label', 'Your stats');
  const cells: Array<[string, string, string]> = [
    ['statClicks', String(s.clicks), 'Times clicked'],
    ['statTried', `${Object.keys(s.tried).length}/${ACTIVITIES.length}`, 'Distractions tried'],
    ['statReaction', s.best.reactionMs === null ? '—' : `${s.best.reactionMs}ms`, 'Best reaction'],
    ['statTap', s.best.tapRush === null ? '—' : `${s.best.tapRush} taps`, 'Best tap rush'],
    ['statStreak', s.streak.count > 0 ? `🔥 ${s.streak.count}` : '—', 'Day streak'],
  ];
  for (const [id, value, caption] of cells) {
    const stat = el('div', 'stat');
    const num = el('div', 'num', value);
    num.id = id;
    const cap = el('div', 'cap', caption);
    stat.append(num, cap);
    stats.appendChild(stat);
  }

  const histHead = el('h2', 'view-subhead', 'History');
  const history = el('div');
  if (s.history.length === 0) {
    history.appendChild(el('p', undefined, 'No history yet. Go click something.'));
  } else {
    const ul = el('ul', 'history-list');
    for (const entry of s.history) {
      const li = document.createElement('li');
      const game = getActivity(entry.gameId);
      const name = document.createElement('span');
      name.textContent = `${game?.name ?? entry.gameId}${entry.score !== undefined ? ` — ${entry.score}` : ''}`;
      const time = document.createElement('time');
      time.textContent = new Date(entry.at).toLocaleString();
      li.append(name, time);
      ul.appendChild(li);
    }
    history.appendChild(ul);
  }

  root.append(stats, histHead, history);
  return root;
}
