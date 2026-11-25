import { ACTIVITIES, getActivity } from './games/registry';
import type { GameContext } from './games/types';
import { Store } from './lib/store/storage';
import { checkAchievements, ACHIEVEMENTS, type AchievementDef } from './lib/store/achievements';
import { applyStreakVisit } from './lib/streak';
import { pick } from './lib/random';
import { $, $$, isReducedMotion } from './lib/dom';
import { ensureAudio, setMuted } from './lib/audio/engine';
import { blip } from './lib/audio/blips';
import { confetti } from './lib/fx';
import { createToastHost, type ToastHost } from './components/toast';

export interface App {
  store: Store;
  openActivity: (id: string) => void;
}

export function createApp(store: Store, toast: ToastHost): App {
  const reduced = isReducedMotion() || store.state.settings.reducedMotion;
  let currentId: string | null = null;
  let cleanup: (() => void) | null = null;

  const stage = $('#stage') as HTMLElement;
  const stageTitle = $('#stageTitle') as HTMLElement;
  const stageTag = $('#stageTag') as HTMLElement;

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

  function renderStats(): void {
    const s = store.state;
    const set = (id: string, v: string) => {
      const n = $(`#${id}`);
      if (n) n.textContent = v;
    };
    set('statClicks', String(s.clicks));
    set('statTried', `${Object.keys(s.tried).length}/8`);
    set('statReaction', s.best.reactionMs === null ? '—' : `${s.best.reactionMs}ms`);
    set('statTap', s.best.tapRush === null ? '—' : `${s.best.tapRush} taps`);
    set('statStreak', s.streak.count > 0 ? `🔥 ${s.streak.count}` : '—');
    $$('.tile').forEach((t) => {
      const id = t.getAttribute('data-id') ?? '';
      const done = $('.done', t);
      if (done) done.textContent = s.tried[id] ? '✓ Tried it' : '';
      t.classList.toggle('active', currentId === id);
    });
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
    reduced,
    recordPlay(gameId, score) {
      store.markTried(gameId);
      store.recordHistory(gameId, score);
      renderStats();
    },
    checkAchievements() {
      return runAchievementCheck();
    },
    toast: (title, body) => toast.show(title, body),
  };

  function openActivity(id: string): void {
    const a = getActivity(id);
    if (!a) return;
    if (cleanup) {
      try {
        cleanup();
      } catch {
        // ignore cleanup errors
      }
      cleanup = null;
    }
    currentId = id;
    store.markTried(id);
    stage.innerHTML = '';
    stageTitle.textContent = a.name;
    stageTag.textContent = a.tag;
    const result = a.mount(stage, ctx);
    cleanup = typeof result === 'function' ? result : null;
    renderStats();
    runAchievementCheck();
    stage.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
  }

  // Picker grid
  const grid = $('#grid') as HTMLElement;
  for (const a of ACTIVITIES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.setAttribute('data-id', a.id);
    const icon = document.createElement('span');
    icon.className = 'ticon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = a.icon;
    const name = document.createElement('span');
    name.className = 'tname';
    name.textContent = a.name;
    const desc = document.createElement('span');
    desc.className = 'tdesc';
    desc.textContent = a.desc;
    const done = document.createElement('span');
    done.className = 'done';
    b.append(icon, name, desc, done);
    b.addEventListener('click', () => {
      blip(500, 0.06);
      openActivity(a.id);
    });
    grid.appendChild(b);
  }

  // Marquee
  const words =
    'CLICK RESPONSIBLY ✦ BOREDOM IS TEMPORARY ✦ PRODUCTIVITY IS OPTIONAL ✦ JUST CLICK IT ✦ ';
  const track = $('#marqueeTrack');
  if (track) track.innerHTML = `<span>${words.repeat(4)}</span>`.repeat(2);

  // Big button: slot-machine shuffle, then launch (ported from the prototype).
  const bigBtn = $('#bigBtn') as HTMLButtonElement;
  const nextUp = $('#nextUp') as HTMLElement;
  let shuffling = false;
  bigBtn.addEventListener('click', () => {
    if (shuffling) return;
    store.update((s) => {
      s.clicks += 1;
    });
    renderStats();
    runAchievementCheck();
    ensureAudio();
    blip(392, 0.07);
    const pool = ACTIVITIES.filter((a) => a.id !== currentId);
    const target = pick(pool.length > 0 ? pool : ACTIVITIES);
    if (reduced) {
      nextUp.textContent = target.name;
      openActivity(target.id);
      return;
    }
    shuffling = true;
    bigBtn.disabled = true;
    let ticks = 0;
    const iv = setInterval(() => {
      nextUp.textContent = pick(ACTIVITIES).name;
      blip(300 + ticks * 30, 0.03, 'square', 0.03);
      ticks++;
      if (ticks >= 11) {
        clearInterval(iv);
        nextUp.textContent = `${target.name}!`;
        shuffling = false;
        bigBtn.disabled = false;
        blip(784, 0.1);
        openActivity(target.id);
      }
    }, 70);
  });

  // ---- Toolbar ----
  $('#themeBtn')?.addEventListener('click', () => {
    const order = ['system', 'light', 'dark'] as const;
    const cur = store.state.settings.theme;
    const next = order[(order.indexOf(cur) + 1) % order.length] ?? 'system';
    store.update((s) => {
      s.settings.theme = next;
    });
    applyTheme();
    blip(500, 0.05);
  });
  $('#soundBtn')?.addEventListener('click', () => {
    store.update((s) => {
      s.settings.sound = !s.settings.sound;
    });
    applySound();
    blip(500, 0.05);
  });
  $('#achBtn')?.addEventListener('click', () => openAchievementsModal());
  $('#histBtn')?.addEventListener('click', () => openHistoryModal());
  $('#clearBtn')?.addEventListener('click', () => {
    if (
      window.confirm(
        'Clear all JustClickIt data on this device? Clicks, records, streak and achievements will be gone.',
      )
    ) {
      store.reset();
      currentId = null;
      cleanup = null;
      stage.innerHTML =
        '<div class="empty"><span class="face">¯\\_(ツ)_/¯</span>Nothing here yet. Hit the big button up top, or pick a distraction below. Your boredom ends in 3… 2…</div>';
      stageTitle.textContent = 'The Stage';
      stageTag.textContent = 'Standing by';
      applyTheme();
      applySound();
      renderStats();
      toast.show('Data cleared', 'Fresh start. Your boredom is brand new.');
    }
  });

  // ---- Modals ----
  // The element that opened the modal, so focus can go back to it on close.
  let modalTrigger: HTMLElement | null = null;

  function openModal(title: string, body: HTMLElement): void {
    // Capture the trigger before closeModal() removes the old backdrop:
    // a trigger inside the old modal is about to be detached, so ignore it.
    const trigger = document.activeElement;
    const usableTrigger =
      trigger instanceof HTMLElement && !trigger.closest('#modalBackdrop') ? trigger : null;
    closeModal(false);
    modalTrigger = usableTrigger;

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'modalBackdrop';
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'modalTitle');
    const h = document.createElement('h2');
    h.id = 'modalTitle';
    h.textContent = title;
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'btn ghost';
    close.textContent = 'Close';
    close.addEventListener('click', () => closeModal());
    modal.append(h, body, close);
    backdrop.appendChild(modal);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });
    // Trap Tab inside the modal so keyboard users cannot tab through to
    // the page behind the backdrop.
    backdrop.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const focusable = [
        ...modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => !el.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
    document.body.appendChild(backdrop);
    close.focus();
  }
  function closeModal(restore = true): void {
    document.querySelector('#modalBackdrop')?.remove();
    if (restore && modalTrigger && document.contains(modalTrigger)) {
      modalTrigger.focus();
    }
    modalTrigger = null;
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  function openAchievementsModal(): void {
    const s = store.state;
    const wrap = document.createElement('div');
    const unlocked = ACHIEVEMENTS.filter((a) => s.achievements[a.id]).length;
    const head = document.createElement('p');
    head.textContent = `${unlocked}/${ACHIEVEMENTS.length} unlocked · ${Object.keys(s.tried).length}/8 distractions tried`;
    wrap.appendChild(head);
    for (const a of ACHIEVEMENTS) {
      const row = document.createElement('div');
      row.className = `ach-row${s.achievements[a.id] ? '' : ' locked'}`;
      const icon = document.createElement('span');
      icon.className = 'aicon';
      icon.textContent = s.achievements[a.id] ? a.icon : '🔒';
      const mid = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'aname';
      name.textContent = a.name;
      const desc = document.createElement('div');
      desc.className = 'adesc';
      desc.textContent = a.description;
      const prog = document.createElement('div');
      prog.className = 'adesc';
      const pct = Math.round(a.progress(s) * 100);
      prog.textContent = s.achievements[a.id]
        ? `Unlocked ${new Date(s.achievements[a.id] as string).toLocaleDateString()}`
        : `Progress: ${pct}%`;
      mid.append(name, desc, prog);
      row.append(icon, mid);
      wrap.appendChild(row);
    }
    openModal('Achievements', wrap);
  }

  function openHistoryModal(): void {
    const wrap = document.createElement('div');
    const s = store.state;
    if (s.history.length === 0) {
      const p = document.createElement('p');
      p.textContent = 'No history yet. Go click something.';
      wrap.appendChild(p);
    } else {
      const ul = document.createElement('ul');
      ul.className = 'history-list';
      for (const entry of s.history) {
        const li = document.createElement('li');
        const game = getActivity(entry.gameId);
        const name = document.createElement('span');
        name.textContent = `${game?.name ?? entry.gameId}${entry.score !== undefined ? ` — ${entry.score}` : ''}`;
        const time = document.createElement('time');
        time.textContent = new Date(entry.at).toLocaleString();
        li.append(name, time);
        ul.appendChild(li);
      }
      wrap.appendChild(ul);
    }
    openModal('History (last 50)', wrap);
  }

  // ---- Init ----
  store.update((s) => {
    const next = applyStreakVisit(s.streak);
    s.streak = next;
  });
  applyTheme();
  applySound();
  renderStats();
  runAchievementCheck();
  window.addEventListener('beforeunload', () => store.flush());

  return { store, openActivity };
}

export function mountApp(store: Store): App {
  return createApp(store, createToastHost());
}
