import { el } from '../lib/dom';
import { blip } from '../lib/audio/blips';
import type { ViewDeps } from './types';

function themeLabel(theme: string): string {
  return `Theme: ${theme[0]?.toUpperCase()}${theme.slice(1)}`;
}

/**
 * Settings: theme cycle, sound toggle, reduced-motion toggle (new UI for
 * the existing stored setting), and Clear my data. Handlers moved verbatim
 * from the old toolbar; labels update in place.
 */
export function renderSettingsView(deps: ViewDeps): HTMLElement {
  const root = el('div');

  function settingRow(name: string, desc: string, button: HTMLButtonElement): HTMLElement {
    const row = el('div', 'setting-row');
    const mid = el('div');
    mid.append(el('div', 'setting-name', name), el('div', 'setting-desc', desc));
    row.append(mid, button);
    return row;
  }

  function makeButton(id: string, label: string): HTMLButtonElement {
    const b = el('button', 'btn ghost') as HTMLButtonElement;
    b.type = 'button';
    b.id = id;
    b.textContent = label;
    return b;
  }

  const themeBtn = makeButton('themeBtn', themeLabel(deps.store.state.settings.theme));
  themeBtn.addEventListener('click', () => {
    const order = ['system', 'light', 'dark'] as const;
    const cur = deps.store.state.settings.theme;
    const next = order[(order.indexOf(cur) + 1) % order.length] ?? 'system';
    deps.store.update((s) => {
      s.settings.theme = next;
    });
    deps.applyTheme();
    blip(500, 0.05);
  });

  const soundBtn = makeButton(
    'soundBtn',
    `Sound: ${deps.store.state.settings.sound ? 'On' : 'Off'}`,
  );
  soundBtn.addEventListener('click', () => {
    deps.store.update((s) => {
      s.settings.sound = !s.settings.sound;
    });
    deps.applySound();
    blip(500, 0.05);
  });

  const motionBtn = makeButton(
    'motionBtn',
    `Motion: ${deps.store.state.settings.reducedMotion ? 'Reduced' : 'Full'}`,
  );
  motionBtn.addEventListener('click', () => {
    deps.store.update((s) => {
      s.settings.reducedMotion = !s.settings.reducedMotion;
    });
    const btn = document.querySelector<HTMLElement>('#motionBtn');
    if (btn) {
      btn.textContent = `Motion: ${deps.store.state.settings.reducedMotion ? 'Reduced' : 'Full'}`;
    }
    deps.applyMotion();
    blip(500, 0.05);
  });

  const clearBtn = makeButton('clearBtn', 'Clear my data');
  clearBtn.addEventListener('click', () => {
    if (
      window.confirm(
        'Clear all JustClickIt data on this device? Clicks, records, streak and achievements will be gone.',
      )
    ) {
      deps.clearAll();
    }
  });

  root.append(
    settingRow('Theme', 'System follows your device, or pick light / dark.', themeBtn),
    settingRow('Sound', 'Blips and boops while you play.', soundBtn),
    settingRow('Motion', 'Reduced turns off the shuffle and view animations.', motionBtn),
    settingRow('Your data', 'Everything is stored on this device only.', clearBtn),
  );
  return root;
}
