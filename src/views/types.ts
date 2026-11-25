import type { Store } from '../lib/store/storage';
import type { AchievementDef } from '../lib/store/achievements';
import type { ToastHost } from '../components/toast';

/** Everything a view needs from the app. Views never touch the router. */
export interface ViewDeps {
  store: Store;
  toast: ToastHost;
  /** Open a game: navigate to the game view and mount it. */
  openGame: (id: string, trigger?: HTMLElement | null) => void;
  /** Re-render the current view (used after Clear my data). */
  refresh: () => void;
  /** Apply the stored theme and update the theme button label, if mounted. */
  applyTheme: () => void;
  /** Apply the stored sound setting and update the sound button label. */
  applySound: () => void;
  /** Apply the stored reduced-motion setting (sets the data-motion flag). */
  applyMotion: () => void;
  /** Live reduced-motion check (system setting or the stored toggle). */
  isReduced: () => boolean;
  /** Check achievements and toast any newly unlocked ones. */
  checkAchievements: () => AchievementDef[];
  /** Id of the currently mounted game, if any. */
  currentGameId: () => string | null;
  /** Wipe all local data (after the view confirms): reset, re-apply settings, toast. */
  clearAll: () => void;
}
