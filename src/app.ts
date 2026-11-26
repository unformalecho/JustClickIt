import { getActivity } from './games/registry';
import type { GameContext } from './games/types';
import { Store } from './lib/store/storage';
import { checkAchievements, type AchievementDef } from './lib/store/achievements';
import { applyStreakVisit } from './lib/streak';
import { $, isReducedMotion } from './lib/dom';
import { setMuted } from './lib/audio/engine';
import { confetti } from './lib/fx';
import { createToastHost, type ToastHost } from './components/toast';
import {
  Router,
  hashToState,
  stateToHash,
  type ViewDirection,
  type ViewId,
  type ViewState,
} from './lib/router';
import { createMenu } from './components/menu';
import { renderHome } from './views/home';
import { renderGames } from './views/games';
import { renderGameView } from './views/game';
import { renderStatsView } from './views/stats';
import { renderAchievementsView } from './views/achievements';
import { renderSettingsView } from './views/settings';
import { renderAboutView } from './views/about';
import type { ViewDeps } from './views/types';

export interface App {
  store: Store;
  openActivity: (id: string) => void;
}

/** Header title per view. Empty on Home and on game views: those views
 * carry their own prominent title, which is also the focus target. */
const VIEW_TITLES: Record<ViewId, string> = {
  home: '',
  games: 'Games',
  game: '',
  stats: 'Statistics',
  achievements: 'Achievements',
  settings: 'Settings',
  about: 'About',
};

export function createApp(store: Store, toast: ToastHost): App {
  /** Live check: system setting or the stored reduced-motion toggle. */
  const isReduced = (): boolean => isReducedMotion() || store.state.settings.reducedMotion;
  let currentId: string | null = null;
  let cleanup: (() => void) | null = null;

  const viewRoot = $('#view') as HTMLElement;
  const viewTitle = $('#viewTitle') as HTMLElement;
  const backBtn = $('#backBtn') as HTMLButtonElement;
  const moreBtn = $('#moreBtn') as HTMLButtonElement;

  function applyTheme(): void {
    const theme = store.state.settings.theme;
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;
    const btn = $('#themeBtn');
    if (btn) btn.textContent = `Theme: ${theme[0]?.toUpperCase()}${theme.slice(1)}`;
  }

  function applySound(): void {
    setMuted(!store.state.settings.sound);
    const btn = $('#soundBtn');
    if (btn) btn.textContent = `Sound: ${store.state.settings.sound ? 'On' : 'Off'}`;
  }

  function applyMotion(): void {
    document.documentElement.dataset.motion = store.state.settings.reducedMotion
      ? 'reduced'
      : 'full';
  }

  /** Run a mounted game's cleanup (if any) and forget the game. */
  function runCleanup(): void {
    if (cleanup) {
      try {
        cleanup();
      } catch {
        // ignore cleanup errors
      }
      cleanup = null;
    }
    currentId = null;
  }

  /** Check achievements, persist unlocks, toast each new one once. */
  function runAchievementCheck(): AchievementDef[] {
    const newly = checkAchievements(store.state);
    if (newly.length > 0) {
      store.saveSoon();
      for (const a of newly) {
        toast.show(`🏆 Achievement unlocked: ${a.name}`, a.description);
        if (a.id === 'completionist') confetti();
      }
    }
    return newly;
  }

  const ctx: GameContext = {
    store,
    currentId: () => currentId,
    get reduced() {
      return isReduced();
    },
    recordPlay(gameId, score) {
      store.markTried(gameId);
      store.recordHistory(gameId, score);
    },
    checkAchievements() {
      return runAchievementCheck();
    },
    toast: (title, body) => toast.show(title, body),
  };

  function mountIntoStage(id: string): void {
    const a = getActivity(id);
    if (!a) return;
    const stage = $('#stage', viewRoot) as HTMLElement | null;
    const stageTitle = $('#stageTitle', viewRoot) as HTMLElement | null;
    const stageTag = $('#stageTag', viewRoot) as HTMLElement | null;
    if (!stage || !stageTitle || !stageTag) return;
    runCleanup();
    currentId = id;
    store.markTried(id);
    stage.innerHTML = '';
    stageTitle.textContent = a.name;
    stageTag.textContent = a.tag;
    const result = a.mount(stage, ctx);
    cleanup = typeof result === 'function' ? result : null;
    runAchievementCheck();
    stage.scrollIntoView({ behavior: isReduced() ? 'auto' : 'smooth', block: 'nearest' });
  }

  function openActivity(id: string, trigger: HTMLElement | null = null): void {
    const a = getActivity(id);
    if (!a) return;
    const cur = router.current();
    if (cur.id === 'game' && cur.gameId === id) {
      mountIntoStage(id);
      return;
    }
    // renderView mounts the game, so hash-driven navigation mounts it too.
    router.go({ id: 'game', gameId: id }, trigger);
  }

  function renderView(state: ViewState, _direction: ViewDirection): HTMLElement | null {
    viewRoot.innerHTML = '';
    let node: HTMLElement;
    switch (state.id) {
      case 'home':
        node = renderHome(deps);
        break;
      case 'games':
        node = renderGames(deps);
        break;
      case 'game':
        node = renderGameView(state.gameId ?? '');
        break;
      case 'stats':
        node = renderStatsView(deps);
        break;
      case 'achievements':
        node = renderAchievementsView(deps);
        break;
      case 'settings':
        node = renderSettingsView(deps);
        break;
      case 'about':
        node = renderAboutView();
        break;
    }
    viewRoot.appendChild(node);
    updateHeader(state);
    // The game view's stage is mounted here (not in openActivity) so a
    // game reached by hash — refresh, browser Back, typed URL — mounts too.
    if (state.id === 'game') mountIntoStage(state.gameId ?? '');
    return node.querySelector<HTMLElement>('[data-view-heading]');
  }

  function updateHeader(state: ViewState): void {
    backBtn.classList.toggle('is-hidden', !router.canGoBack());
    viewTitle.textContent = VIEW_TITLES[state.id];
    menu.setCurrent(state.id);
  }

  /** Re-render the current view. Never re-renders a live game. */
  function refreshCurrentView(): void {
    const cur = router.current();
    if (cur.id === 'game') return;
    renderView(cur, 'forward');
  }

  function clearAll(): void {
    runCleanup();
    store.reset();
    applyTheme();
    applySound();
    applyMotion();
    refreshCurrentView();
    toast.show('Data cleared', 'Fresh start. Your boredom is brand new.');
  }

  const deps: ViewDeps = {
    store,
    toast,
    openGame: (id, trigger = null) => openActivity(id, trigger),
    refresh: () => refreshCurrentView(),
    applyTheme,
    applySound,
    applyMotion,
    isReduced,
    checkAchievements: () => runAchievementCheck(),
    currentGameId: () => currentId,
    clearAll,
  };

  const menu = createMenu(
    moreBtn,
    [
      { id: 'games', label: 'Games' },
      { id: 'stats', label: 'Statistics' },
      { id: 'achievements', label: 'Achievements' },
      { id: 'settings', label: 'Settings' },
      { id: 'about', label: 'About' },
    ],
    (id, item) => {
      router.go({ id: id as ViewId }, item);
    },
  );

  const router = new Router(
    {
      render: renderView,
      onLeave: (state) => {
        if (state.id === 'game') runCleanup();
      },
      isMenuOpen: () => menu.isOpen(),
      closeMenu: () => menu.close(),
      menuButton: () => moreBtn,
      fallbackHeading: () => (viewTitle.textContent ? viewTitle : null),
    },
    {
      // Start on the view the URL hash names (refresh restores the view);
      // an unknown hash falls back to Home.
      initialState: hashToState(window.location.hash, (id) => getActivity(id) !== undefined),
      isKnownGame: (id) => getActivity(id) !== undefined,
    },
  );

  // Normalize the URL to the canonical hash of the view we landed on
  // (no history entry, no hashchange event).
  const canonicalHash = stateToHash(router.current());
  if (window.location.hash !== canonicalHash) {
    window.history.replaceState(null, '', canonicalHash);
  }

  backBtn.addEventListener('click', () => router.back());

  // ---- Init ----
  store.update((s) => {
    const next = applyStreakVisit(s.streak);
    s.streak = next;
  });
  applyTheme();
  applySound();
  applyMotion();
  router.renderCurrent();
  runAchievementCheck();
  window.addEventListener('beforeunload', () => store.flush());

  return { store, openActivity };
}

export function mountApp(store: Store): App {
  return createApp(store, createToastHost());
}
