/**
 * In-memory view navigation for JustClickIt (no hash routes, no URL changes).
 *
 * The app is a stack of views: Home is the root, every navigation pushes a
 * view, Back pops one. A refresh always returns to Home. `ViewStack` is the
 * pure stack (unit-tested); `Router` adds the DOM glue — rendering, focus
 * management, Escape = Back, and the leave hook that runs a game's cleanup
 * on every exit from a game view.
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

/**
 * Navigation controller. Owns the stack, dispatches renders, moves focus to
 * the new view's heading, and restores focus to the trigger element on Back.
 */
export class Router {
  private stack = new ViewStack();
  /** Trigger element per stack entry, aligned by index (entry 0 = Home). */
  private triggers: Array<HTMLElement | null> = [null];
  private host: RouterHost;
  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    if (this.host.isMenuOpen()) {
      this.host.closeMenu();
      return;
    }
    this.back();
  };

  constructor(host: RouterHost) {
    this.host = host;
    // Guarded so the class stays constructible in node (unit tests), where
    // there is no document and no keyboard to listen to.
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', this.onKeyDown);
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
    this.focusHeading(heading);
  }

  back(): void {
    const leaving = this.stack.current();
    const next = this.stack.back();
    if (!next) return;
    const trigger = this.triggers.pop() ?? null;
    this.host.onLeave(leaving);
    const heading = this.host.render(next, 'back');
    this.restoreFocus(trigger, heading);
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
