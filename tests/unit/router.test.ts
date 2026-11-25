import { describe, expect, it, vi } from 'vitest';
import { Router, ViewStack, type RouterHost, type ViewState } from '../../src/lib/router';

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
