import { isReducedMotion } from '../lib/dom';

const MAX_VISIBLE = 3;
const DISMISS_MS = 4000;

export interface ToastHost {
  show: (title: string, body?: string) => void;
}

/** Toast queue. Auto-dismiss ~4s, role=status, max 3 visible, reduced-motion safe. */
export function createToastHost(): ToastHost {
  let host = document.querySelector<HTMLElement>('.toasts');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toasts';
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  const reduced = isReducedMotion();
  return {
    show(title, body) {
      const t = document.createElement('div');
      t.className = 'toast';
      t.setAttribute('role', 'status');
      const strong = document.createElement('div');
      strong.textContent = title;
      t.appendChild(strong);
      if (body) {
        const small = document.createElement('small');
        small.textContent = body;
        t.appendChild(small);
      }
      host!.appendChild(t);
      while (host!.children.length > MAX_VISIBLE) host!.firstElementChild?.remove();
      const remove = () => {
        if (reduced) {
          t.remove();
          return;
        }
        t.style.transition = 'opacity 0.3s ease';
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 320);
      };
      const timer = setTimeout(remove, DISMISS_MS);
      t.addEventListener('click', () => {
        clearTimeout(timer);
        remove();
      });
    },
  };
}
