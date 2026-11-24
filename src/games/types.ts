import type { Store } from '../lib/store/storage';
import type { AchievementDef } from '../lib/store/achievements';

export interface GameContext {
  store: Store;
  /** Current game id (for keyboard handlers that must ignore other games). */
  currentId: () => string | null;
  reduced: boolean;
  /** Record a play: marks tried, adds a history entry, saves. */
  recordPlay: (gameId: string, score?: number | string) => void;
  /** Re-check achievements; toast any newly unlocked ones. */
  checkAchievements: () => AchievementDef[];
  /** Show a toast directly. */
  toast: (title: string, body?: string) => void;
}

export interface GameDef {
  id: string;
  name: string;
  tag: string;
  icon: string;
  desc: string;
  /** Render into `stage`. Return a cleanup function (optional). */
  mount: (stage: HTMLElement, ctx: GameContext) => void | (() => void);
}
