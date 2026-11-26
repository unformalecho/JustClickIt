import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Router,
  ViewStack,
  hashToState,
  stateToHash,
  type RouterHost,
  type ViewState,
} from '../../src/lib/router';

describe('ViewStack', () => {
  it('starts on Home with depth 1 and no way back', () => {
    const stack = new ViewStack();
    expect(stack.current()).toEqual({ id: 'home' });
    expect(stack.depth()).toBe(1);
    expect(stack.canGoBack()).toBe(false);
  });

  it('pushes views and pops back to Home', () => {
    const stack = new ViewStack();
    expect(stack.go({ id: 'games' })).toBe(true);
    expect(stack.current()).toEqual({ id: 'games' });
    expect(stack.depth()).toBe(2);
    expect(stack.canGoBack()).toBe(true);
    expect(stack.go({ id: 'game', gameId: 'reaction' })).toBe(true);
    expect(stack.depth()).toBe(3);
    expect(stack.back()).toEqual({ id: 'games' });
    expect(stack.back()).toEqual({ id: 'home' });
    expect(stack.depth()).toBe(1);
  });

  it('back at the root returns null and stays on Home', () => {
    const stack = new ViewStack();
    expect(stack.back()).toBeNull();
    expect(stack.current()).toEqual({ id: 'home' });
    expect(stack.depth()).toBe(1);
  });

  it('going to the current view is a no-op', () => {
    const stack = new ViewStack();
    expect(stack.go({ id: 'home' })).toBe(false);
    expect(stack.depth()).toBe(1);
    stack.go({ id: 'games' });
    expect(stack.go({ id: 'games' })).toBe(false);
    expect(stack.depth()).toBe(2);
  });

  it('the same view with a different game is a different entry', () => {
    const stack = new ViewStack();
    stack.go({ id: 'game', gameId: 'reaction' });
    expect(stack.go({ id: 'game', gameId: 'taprush' })).toBe(true);
    expect(stack.current()).toEqual({ id: 'game', gameId: 'taprush' });
    expect(stack.back()).toEqual({ id: 'game', gameId: 'reaction' });
  });
});

function fakeHost(): {
  host: RouterHost;
  render: ReturnType<typeof vi.fn>;
  onLeave: ReturnType<typeof vi.fn>;
} {
  const render = vi.fn((_state: ViewState, _direction: 'forward' | 'back') => null);
  const onLeave = vi.fn((_state: ViewState) => undefined);
  const host: RouterHost = {
    render: (state, direction) => render(state, direction) as HTMLElement | null,
    onLeave: (state) => onLeave(state),
    isMenuOpen: () => false,
    closeMenu: () => undefined,
    menuButton: () => ({}) as HTMLElement,
    fallbackHeading: () => null,
  };
  return { host, render, onLeave };
}

describe('Router', () => {
  it('renders forward on go and calls onLeave for the view left behind', () => {
    const { host, render, onLeave } = fakeHost();
    const router = new Router(host);
    router.go({ id: 'games' });
    expect(render).toHaveBeenCalledWith({ id: 'games' }, 'forward');
    expect(onLeave).toHaveBeenCalledWith({ id: 'home' });
    expect(router.current()).toEqual({ id: 'games' });
    expect(router.canGoBack()).toBe(true);
  });

  it('back renders the previous view and runs cleanup for the game left behind', () => {
    const { host, render, onLeave } = fakeHost();
    const router = new Router(host);
    router.go({ id: 'games' });
    router.go({ id: 'game', gameId: 'reaction' });
    render.mockClear();
    onLeave.mockClear();
    router.back();
    expect(onLeave).toHaveBeenCalledWith({ id: 'game', gameId: 'reaction' });
    expect(render).toHaveBeenCalledWith({ id: 'games' }, 'back');
    expect(router.current()).toEqual({ id: 'games' });
  });

  it('back at the root renders nothing and leaves nothing', () => {
    const { host, render, onLeave } = fakeHost();
    const router = new Router(host);
    router.back();
    expect(render).not.toHaveBeenCalled();
    expect(onLeave).not.toHaveBeenCalled();
    expect(router.current()).toEqual({ id: 'home' });
  });

  it('going to the current view renders nothing', () => {
    const { host, render, onLeave } = fakeHost();
    const router = new Router(host);
    router.go({ id: 'home' });
    expect(render).not.toHaveBeenCalled();
    expect(onLeave).not.toHaveBeenCalled();
  });

  it('renderCurrent paints Home without navigating', () => {
    const { host, render } = fakeHost();
    const router = new Router(host);
    router.renderCurrent();
    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith({ id: 'home' }, 'forward');
    expect(router.current()).toEqual({ id: 'home' });
  });
});

describe('hash routes', () => {
  it('stateToHash covers every view', () => {
    expect(stateToHash({ id: 'home' })).toBe('#/');
    expect(stateToHash({ id: 'games' })).toBe('#/games');
    expect(stateToHash({ id: 'game', gameId: 'chess' })).toBe('#/game/chess');
    expect(stateToHash({ id: 'stats' })).toBe('#/stats');
    expect(stateToHash({ id: 'achievements' })).toBe('#/achievements');
    expect(stateToHash({ id: 'settings' })).toBe('#/settings');
    expect(stateToHash({ id: 'about' })).toBe('#/about');
  });

  it('hashToState parses every route and round-trips', () => {
    const states: ViewState[] = [
      { id: 'home' },
      { id: 'games' },
      { id: 'game', gameId: 'reaction' },
      { id: 'stats' },
      { id: 'achievements' },
      { id: 'settings' },
      { id: 'about' },
    ];
    for (const state of states) {
      expect(hashToState(stateToHash(state))).toEqual(state);
    }
  });

  it('unknown hashes fall back to Home', () => {
    for (const hash of [
      '',
      '#',
      '#/nope',
      '#/games/extra',
      '#/game/',
      '#/game/reaction/extra',
      '#/STATS',
    ]) {
      expect(hashToState(hash)).toEqual({ id: 'home' });
    }
  });

  it('unknown game ids fall back to Home when a validator is given', () => {
    expect(hashToState('#/game/chess', (id) => id === 'chess')).toEqual({
      id: 'game',
      gameId: 'chess',
    });
    expect(hashToState('#/game/nope', (id) => id === 'chess')).toEqual({ id: 'home' });
  });

  it('resetTo rebuilds the stack: game sits under Games', () => {
    const stack = new ViewStack();
    stack.resetTo({ id: 'game', gameId: 'chess' });
    expect(stack.depth()).toBe(3);
    expect(stack.current()).toEqual({ id: 'game', gameId: 'chess' });
    expect(stack.back()).toEqual({ id: 'games' });
    expect(stack.back()).toEqual({ id: 'home' });
    stack.resetTo({ id: 'stats' });
    expect(stack.depth()).toBe(2);
    stack.resetTo({ id: 'home' });
    expect(stack.depth()).toBe(1);
  });
});

describe('Router hash sync', () => {
  /** Minimal fake window: records hashchange listeners so tests can fire them. */
  function fakeWindow(initialHash = ''): {
    location: { hash: string };
    addEventListener: ReturnType<typeof vi.fn>;
    fire: (type: string) => void;
  } {
    const listeners: Record<string, Array<() => void>> = {};
    const addEventListener = vi.fn((type: string, fn: () => void) => {
      (listeners[type] ??= []).push(fn);
    });
    return {
      location: { hash: initialHash },
      addEventListener,
      fire: (type: string) => {
        for (const fn of listeners[type] ?? []) fn();
      },
    };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('go() writes the hash', () => {
    const win = fakeWindow();
    vi.stubGlobal('window', win);
    const { host } = fakeHost();
    const router = new Router(host);
    router.go({ id: 'stats' });
    expect(win.location.hash).toBe('#/stats');
    router.go({ id: 'game', gameId: 'chess' });
    expect(win.location.hash).toBe('#/game/chess');
  });

  it('back() writes the hash of the view it lands on', () => {
    const win = fakeWindow();
    vi.stubGlobal('window', win);
    const { host } = fakeHost();
    const router = new Router(host);
    router.go({ id: 'games' });
    router.go({ id: 'game', gameId: 'reaction' });
    router.back();
    expect(win.location.hash).toBe('#/games');
    router.back();
    expect(win.location.hash).toBe('#/');
  });

  it('a hashchange from outside rebuilds the stack and renders', () => {
    const win = fakeWindow('#/stats');
    vi.stubGlobal('window', win);
    const { host, render, onLeave } = fakeHost();
    const router = new Router(host);
    expect(router.current()).toEqual({ id: 'home' });
    win.fire('hashchange');
    expect(router.current()).toEqual({ id: 'stats' });
    expect(render).toHaveBeenCalledWith({ id: 'stats' }, 'forward');
    expect(onLeave).toHaveBeenCalledWith({ id: 'home' });
    // Back from a restored view returns Home.
    router.back();
    expect(router.current()).toEqual({ id: 'home' });
  });

  it('a hashchange to an unknown hash falls back to Home and normalizes the hash', () => {
    const win = fakeWindow('#/nope');
    vi.stubGlobal('window', win);
    const { host, render } = fakeHost();
    const router = new Router(host, { initialState: { id: 'stats' } });
    win.fire('hashchange');
    expect(router.current()).toEqual({ id: 'home' });
    expect(render).toHaveBeenCalledWith({ id: 'home' }, 'forward');
    expect(win.location.hash).toBe('#/');
  });

  it('a hashchange to the current state is ignored', () => {
    const win = fakeWindow('#/games');
    vi.stubGlobal('window', win);
    const { host, render } = fakeHost();
    new Router(host, { initialState: { id: 'games' } });
    render.mockClear();
    win.fire('hashchange');
    expect(render).not.toHaveBeenCalled();
  });

  it('a hashchange to a game rebuilds the stack under Games', () => {
    const win = fakeWindow('#/game/chess');
    vi.stubGlobal('window', win);
    const { host, render, onLeave } = fakeHost();
    const router = new Router(host);
    win.fire('hashchange');
    expect(router.current()).toEqual({ id: 'game', gameId: 'chess' });
    expect(render).toHaveBeenCalledWith({ id: 'game', gameId: 'chess' }, 'forward');
    expect(onLeave).toHaveBeenCalledWith({ id: 'home' });
    router.back();
    expect(router.current()).toEqual({ id: 'games' });
    router.back();
    expect(router.current()).toEqual({ id: 'home' });
  });

  it('starts on the initial state from the hash', () => {
    const { host, render } = fakeHost();
    const router = new Router(host, { initialState: { id: 'game', gameId: 'chess' } });
    expect(router.current()).toEqual({ id: 'game', gameId: 'chess' });
    expect(router.canGoBack()).toBe(true);
    router.renderCurrent();
    expect(render).toHaveBeenCalledWith({ id: 'game', gameId: 'chess' }, 'forward');
  });
});
