/**
 * The ⋯ More menu: a popover anchored to its button.
 *
 * Keyboard: ArrowUp/ArrowDown move between items, Home/End jump to the
 * ends, Enter/Space activate (native button behavior), Escape closes and
 * returns focus to the ⋯ button, Tab closes and lets focus move on.
 * Clicking outside the popover (or on the ⋯ button again) closes it.
 * The popover stays mounted while closed (hidden), so menu items stay
 * connected — the router can restore focus to them on Back.
 */

export interface MenuEntry {
  id: string;
  label: string;
}

export interface Menu {
  open(): void;
  close(): void;
  toggle(): void;
  isOpen(): boolean;
  /** Mark the menu item for the current view (aria-current="page"). */
  setCurrent(id: string): void;
}

export function createMenu(
  button: HTMLElement,
  entries: MenuEntry[],
  onSelect: (id: string, item: HTMLElement) => void,
): Menu {
  const pop = document.createElement('div');
  pop.className = 'menu-popover';
  pop.setAttribute('data-menu-popover', '');
  pop.setAttribute('role', 'menu');
  pop.hidden = true;

  const items = entries.map((entry) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'menu-item';
    item.setAttribute('role', 'menuitem');
    item.dataset.id = entry.id;
    item.textContent = entry.label;
    item.addEventListener('click', () => {
      close(false);
      onSelect(entry.id, item);
    });
    pop.appendChild(item);
    return item;
  });

  // The header is position:relative, so the popover anchors under the ⋯.
  const parent = button.parentElement;
  if (parent) parent.appendChild(pop);

  let outsideHandler: ((e: PointerEvent) => void) | null = null;

  function setExpanded(open: boolean): void {
    button.setAttribute('aria-expanded', String(open));
  }

  function close(restoreFocus: boolean): void {
    if (pop.hidden) return;
    pop.hidden = true;
    setExpanded(false);
    if (outsideHandler) {
      document.removeEventListener('pointerdown', outsideHandler);
      outsideHandler = null;
    }
    if (restoreFocus) button.focus();
  }

  function open(): void {
    if (!pop.hidden) return;
    pop.hidden = false;
    setExpanded(true);
    outsideHandler = (e: PointerEvent): void => {
      const target = e.target as Node | null;
      if (target && !pop.contains(target) && target !== button && !button.contains(target)) {
        close(false);
      }
    };
    document.addEventListener('pointerdown', outsideHandler);
    items[0]?.focus();
  }

  button.addEventListener('click', () => {
    if (pop.hidden) open();
    else close(false);
  });
  button.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && pop.hidden) {
      e.preventDefault();
      open();
    }
  });
  pop.addEventListener('keydown', (e) => {
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(current + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(current - 1 + items.length) % items.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (e.key === 'Tab') {
      close(false);
    }
  });

  return {
    open,
    close: () => close(false),
    toggle: () => {
      if (pop.hidden) open();
      else close(false);
    },
    isOpen: () => !pop.hidden,
    setCurrent(id: string): void {
      for (const item of items) {
        if (item.dataset.id === id) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
      }
    },
  };
}
