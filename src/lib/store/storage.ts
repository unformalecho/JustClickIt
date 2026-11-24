import {
  STORAGE_KEY,
  STORAGE_VERSION,
  defaultState,
  validateState,
  type LocalStateV1,
} from './schema';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LoadResult {
  state: LocalStateV1;
  /** True when stored data was corrupt / wrong version and was backed up. */
  recoveredFromCorrupt: boolean;
  corruptBackupKey?: string;
}

/** Load and validate. Never throws: corrupt data is backed up, fresh state returned. */
export function loadState(storage: StorageLike): LoadResult {
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { state: defaultState(), recoveredFromCorrupt: false };
  }
  if (raw === null) return { state: defaultState(), recoveredFromCorrupt: false };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return backupAndFresh(storage, raw);
  }
  const validated = validateState(parsed);
  if (!validated) return backupAndFresh(storage, raw);
  return { state: validated, recoveredFromCorrupt: false };
}

function backupAndFresh(storage: StorageLike, raw: string): LoadResult {
  const key = `${STORAGE_KEY}:corrupt:${Date.now()}`;
  try {
    storage.setItem(key, raw);
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable — still return a fresh in-memory state.
  }
  return { state: defaultState(), recoveredFromCorrupt: true, corruptBackupKey: key };
}

/** Minimal store: in-memory state + debounced persistence. */
export class Store {
  readonly storage: StorageLike;
  state: LocalStateV1;
  recoveredFromCorrupt: boolean;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(storage: StorageLike) {
    this.storage = storage;
    const loaded = loadState(storage);
    this.state = loaded.state;
    this.recoveredFromCorrupt = loaded.recoveredFromCorrupt;
  }

  /** Mutate state, then persist (debounced 150 ms). */
  update(fn: (s: LocalStateV1) => void): void {
    fn(this.state);
    this.saveSoon();
  }

  /** Write immediately (used by tests and before unload). */
  flush(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.saveNow();
  }

  saveSoon(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveNow();
    }, 150);
  }

  saveNow(): void {
    try {
      this.storage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...this.state, version: STORAGE_VERSION }),
      );
    } catch {
      // Storage full / unavailable — the app keeps working in memory.
    }
  }

  /** Add a history entry (newest first, capped at 50). */
  recordHistory(gameId: string, score?: number | string): void {
    this.update((s) => {
      s.history.unshift({ gameId, at: new Date().toISOString(), score });
      if (s.history.length > 50) s.history.length = 50;
    });
  }

  markTried(gameId: string): void {
    this.update((s) => {
      if (!s.tried[gameId]) {
        s.tried[gameId] = true;
        s.triedAt[gameId] = new Date().toISOString();
      }
    });
  }

  /** Wipe all local data (caller must confirm first). Returns a fresh state. */
  reset(): LocalStateV1 {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    try {
      this.storage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    this.state = defaultState();
    return this.state;
  }
}
