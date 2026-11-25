import { ACHIEVEMENTS } from '../lib/store/achievements';
import { el } from '../lib/dom';
import type { ViewDeps } from './types';

/**
 * Achievements: the list moved verbatim out of the old modal — same rows,
 * same progress text, same unlock dates.
 */
export function renderAchievementsView(deps: ViewDeps): HTMLElement {
  const s = deps.store.state;
  const root = el('div');

  const unlocked = ACHIEVEMENTS.filter((a) => s.achievements[a.id]).length;
  const head = el(
    'p',
    undefined,
    `${unlocked}/${ACHIEVEMENTS.length} unlocked · ${Object.keys(s.tried).length}/8 distractions tried`,
  );
  root.appendChild(head);

  for (const a of ACHIEVEMENTS) {
    const row = el('div', `ach-row${s.achievements[a.id] ? '' : ' locked'}`);
    const icon = el('span', 'aicon', s.achievements[a.id] ? a.icon : '🔒');
    const mid = el('div');
    const name = el('div', 'aname', a.name);
    const desc = el('div', 'adesc', a.description);
    const prog = el('div', 'adesc');
    const pct = Math.round(a.progress(s) * 100);
    prog.textContent = s.achievements[a.id]
      ? `Unlocked ${new Date(s.achievements[a.id] as string).toLocaleDateString()}`
      : `Progress: ${pct}%`;
    mid.append(name, desc, prog);
    row.append(icon, mid);
    root.appendChild(row);
  }

  return root;
}
