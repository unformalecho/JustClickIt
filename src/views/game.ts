import { getActivity } from '../games/registry';
import { el } from '../lib/dom';

/**
 * Game view: the stage head (game name + tag) and the stage the game
 * mounts into. The app mounts the game right after this renders.
 */
export function renderGameView(gameId: string): HTMLElement {
  const a = getActivity(gameId);
  const root = el('div');

  const head = el('div', 'stage-head');
  const h2 = el('h2', undefined, a?.name ?? 'The Stage');
  h2.id = 'stageTitle';
  h2.setAttribute('tabindex', '-1');
  h2.setAttribute('data-view-heading', '');
  const tag = el('span', 'tag', a?.tag ?? 'Standing by');
  tag.id = 'stageTag';
  head.append(h2, tag);

  const stage = el('section', 'stage');
  stage.id = 'stage';
  stage.innerHTML = '<div class="empty"><span class="face">¯\\_(ツ)_/¯</span>Loading…</div>';

  root.append(head, stage);
  return root;
}
