/**
 * View navigation for JustClickIt, synced with the URL hash.
 *
 * The app is a stack of views: Home is the root, every navigation pushes a
 * view, Back pops one. Every navigation also writes the matching hash, so a
 * refresh restores the current view instead of returning to Home, and the
 * browser Back button works through `hashchange`. `ViewStack` is the pure
 * stack (unit-tested); `Router` adds the DOM glue — rendering, focus
 * management, Escape = Back, the leave hook that runs a game's cleanup on
 * every exit from a game view, and hash sync.
 *
 * Routes: `#/` Home, `#/games`, `#/game/<id>`, `#/stats`,
 * `#/achievements`, `#/settings`, `#/about`. An unknown hash falls back
 * to Home.
 */

export type ViewId = 'home' | 'games' | 'game' | 'stats' | 'achievements' | 'settings' | 'about';

export interface ViewState {
  id: ViewId;
  /** Only for the game view: which game is mounted. */
  gameId?: string;
}

export type ViewDirection = 'forward' | 'back';

export function sameState(a: ViewState, b: ViewState): boolean {
  return a.id === b.id && a.gameId === b.gameId;
}

/** The hash for a view state. Home is `#/`. */
export function stateToHash(state: ViewState): string {
  switch (state.id) {
    case 'home':
      return '#/';
    case 'games':
      return '#/games';
    case 'game':
      return `#/game/${state.gameId ?? ''}`;
    case 'stats':
      return '#/stats';
    case 'achievements':
      return '#/achievements';
    case 'settings':
      return '#/settings';
    case 'about':
      return '#/about';
  }
}

/**
 * Parse a hash into a view state. Unknown routes, extra segments, and
 * unknown game ids (when `isKnownGame` is given) fall back to Home.
 */
export function hashToState(hash: string, isKnownGame?: (id: string) => boolean): ViewState {
  const parts = hash
    .replace(/^#/, '')
    .split('/')
    .filter((p) => p.length > 0);
  if (parts.length === 0) return { id: 'home' };
  const [first, second] = parts;
  switch (first) {
    case 'games':
      return parts.length === 1 ? { id: 'games' } : { id: 'home' };
    case 'game': {
      if (parts.length !== 2 || !second) return { id: 'home' };
      if (isKnownGame && !isKnownGame(second)) return { id: 'home' };
      return { id: 'game', gameId: second };
    }
    case 'stats':
      return parts.length === 1 ? { id: 'stats' } : { id: 'home' };
    case 'achievements':
      return parts.length === 1 ? { id: 'achievements' } : { id: 'home' };
    case 'settings':
      return parts.length === 1 ? { id: 'settings' } : { id: 'home' };
    case 'about':
      return parts.length === 1 ? { id: 'about' } : { id: 'home' };
    default:
      return { id: 'home' };
  }
}

/** Pure navigation stack. No DOM access, safe to unit test. */
export class ViewStack {
  private stack: ViewState[] = [{ id: 'home' }];

  current(): ViewState {
    return this.stack[this.stack.length - 1] as ViewState;
  }

  depth(): number {
    return this.stack.length;
  }

  canGoBack(): boolean {
    return this.stack.length > 1;
  }

  /**
   * Push a view. Returns false (and pushes nothing) when the top of the
   * stack is already that view.
   */
  go(state: ViewState): boolean {
    if (sameState(this.current(), state)) return false;
    this.stack.push({ ...state });
    return true;
  }

  /** Pop to the previous view. Returns the new top, or null at the root. */
  back(): ViewState | null {
    if (this.stack.length <= 1) return null;
    this.stack.pop();
    return this.current();
  }

  /**
   * Rebuild the stack from a deep link (refresh, browser Back): Home, then
   * the target. A game view sits under Games, so Back from a restored game
   * returns to the picker.
   */
  resetTo(state: ViewState): void {
    if (state.id === 'home') this.stack = [{ id: 'home' }];
    else if (state.id === 'game') this.stack = [{ id: 'home' }, { id: 'games' }, { ...state }];
    else this.stack = [{ id: 'home' }, { ...state }];
  }
}

export interface RouterHost {
  /**
   * Render a view into the page. Returns the element to focus (the view
   * heading), or null when the heading lives elsewhere (the header title).
   */
  render(state: ViewState, direction: ViewDirection): HTMLElement | null;
  /** Called before leaving a view — e.g. run a game's cleanup. */
  onLeave(state: ViewState): void;
  /** True while the More menu popover is open (Escape closes it first). */
  isMenuOpen(): boolean;
  closeMenu(): void;
  /** The ⋯ button, used as a focus fallback when restoring from the menu. */
  menuButton(): HTMLElement;
  /**
   * Fallback heading when the view has none of its own (the header title).
   * Returns null when there is no usable fallback (e.g. the header title
   * is empty on Home and on game views).
   */
  fallbackHeading(): HTMLElement | null;
}

export interface RouterOptions {
  /** View to start on (from the URL hash on load). Defaults to Home. */
  initialState?: ViewState;
  /** Game-id validator for hash parsing (unknown ids fall back to Home). */
  isKnownGame?: (id: string) => boolean;
}

/**
 * Navigation controller. Owns the stack, dispatches renders, moves focus to
 * the new view's heading, and restores focus to the trigger element on Back.
 * Keeps `location.hash` in sync with the stack, and rebuilds the stack from
 * the hash when it changes underneath (refresh, browser Back, typed URL).
 */
export class Router {
  private stack = new ViewStack();
  /** Trigger element per stack entry, aligned by index (entry 0 = Home). */
  private triggers: Array<HTMLElement | null> = [null];
  private host: RouterHost;
  private isKnownGame?: (id: string) => boolean;
  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    if (this.host.isMenuOpen()) {
      this.host.closeMenu();
      return;
    }
    this.back();
  };
  private onHashChange = (): void => {
    if (typeof window === 'undefined') return;
    const target = hashToState(window.location.hash, this.isKnownGame);
    const current = this.stack.current();
    // Our own go()/back() writes the hash first, so this event usually
    // names the state we are already on. Ignore it; only an outside change
    // (browser Back, typed URL) needs a rebuild.
    if (sameState(target, current)) return;
    const leaving = current;
    this.stack.resetTo(target);
    this.triggers = Array.from({ length: this.stack.depth() }, () => null);
    this.host.onLeave(leaving);
    const heading = this.host.render(target, 'forward');
    // Normalize the URL to the canonical hash (an unknown hash that fell
    // back to Home becomes #/, a trailing slash is dropped). The hashchange
    // this write fires names the state we are already on, so it is ignored.
    this.writeHash(target);
    this.focusHeading(heading);
  };

  constructor(host: RouterHost, options: RouterOptions = {}) {
    this.host = host;
    this.isKnownGame = options.isKnownGame;
    if (options.initialState) this.stack.resetTo(options.initialState);
    // Guarded so the class stays constructible in node (unit tests), where
    // there is no document, no window, and no keyboard to listen to.
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', this.onKeyDown);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', this.onHashChange);
    }
  }

  current(): ViewState {
    return this.stack.current();
  }

  canGoBack(): boolean {
    return this.stack.canGoBack();
  }

  /** Render the current view without navigating (initial paint, refresh). */
  renderCurrent(): void {
    // Initial paint / refresh: render without moving focus.
    this.host.render(this.stack.current(), 'forward');
  }

  go(state: ViewState, trigger: HTMLElement | null = null): void {
    const leaving = this.stack.current();
    if (!this.stack.go(state)) return;
    this.triggers.push(trigger);
    this.host.onLeave(leaving);
    const heading = this.host.render(state, 'forward');
    this.writeHash(state);
    this.focusHeading(heading);
  }

  back(): void {
    const leaving = this.stack.current();
    const next = this.stack.back();
    if (!next) return;
    const trigger = this.triggers.pop() ?? null;
    this.host.onLeave(leaving);
    const heading = this.host.render(next, 'back');
    this.writeHash(next);
    this.restoreFocus(trigger, heading);
  }

  private writeHash(state: ViewState): void {
    if (typeof window === 'undefined') return;
    const hash = stateToHash(state);
    if (window.location.hash !== hash) window.location.hash = hash;
  }

  private focusHeading(heading: HTMLElement | null): void {
    const target = heading ?? this.host.fallbackHeading();
    target?.focus();
  }

  private restoreFocus(trigger: HTMLElement | null, heading: HTMLElement | null): void {
    let target: HTMLElement | null = null;
    if (trigger && trigger.isConnected) {
      // A trigger inside the (now closed) menu can't take focus: fall back
      // to the ⋯ button that opened it.
      target = trigger.closest('[data-menu-popover]') ? this.host.menuButton() : trigger;
    }
    (target ?? heading ?? this.host.fallbackHeading())?.focus();
  }
}
