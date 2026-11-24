/**
 * Local persistence schema (TODO §4).
 * Key: `justclickit:v1`. Versioned; validated on load; corrupt data is backed
 * up to `justclickit:v1:corrupt:<timestamp>` and replaced with a fresh state.
 * The app must never crash because of stored data.
 */

export const STORAGE_KEY = 'justclickit:v1';
export const STORAGE_VERSION = 1;

export type ThemeSetting = 'system' | 'light' | 'dark';

export interface HistoryEntry {
  gameId: string;
  at: string; // ISO timestamp
  score?: number | string;
}

export interface LocalStateV1 {
  version: 1;
  deviceId: string;
  displayName?: string;
  clicks: number;
  tried: Record<string, true>;
  triedAt: Record<string, string>;
  best: {
    reactionMs: number | null;
    tapRush: number | null;
    memoryLevel: number;
    guessFewest: number | null;
  };
  counts: {
    beatHits: number;
    beatAutoStarts: number;
    oracleAsks: number;
  };
  history: HistoryEntry[];
  achievements: Record<string, string>; // achievement id -> ISO date unlocked
  streak: {
    lastVisit: string | null; // YYYY-MM-DD, local date
    count: number;
    best: number;
  };
  settings: {
    theme: ThemeSetting;
    sound: boolean;
    reducedMotion: boolean;
  };
}

export function createDeviceId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `dev-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export function defaultState(): LocalStateV1 {
  return {
    version: 1,
    deviceId: createDeviceId(),
    clicks: 0,
    tried: {},
    triedAt: {},
    best: { reactionMs: null, tapRush: null, memoryLevel: 0, guessFewest: null },
    counts: { beatHits: 0, beatAutoStarts: 0, oracleAsks: 0 },
    history: [],
    achievements: {},
    streak: { lastVisit: null, count: 0, best: 0 },
    settings: { theme: 'system', sound: true, reducedMotion: false },
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asNonNegativeInt(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;
}

function asNullableNonNegativeInt(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null;
}

/**
 * Validate unknown parsed JSON. Returns a complete, safe state, or null when
 * the input is so wrong it cannot be repaired (caller then backs it up and
 * starts fresh). Unknown extra fields are dropped; missing fields get defaults.
 */
export function validateState(raw: unknown): LocalStateV1 | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== 1) return null;
  const base = defaultState();
  const s: LocalStateV1 = { ...base, deviceId: base.deviceId };

  if (typeof raw.deviceId === 'string' && raw.deviceId.length > 0) s.deviceId = raw.deviceId;
  if (typeof raw.displayName === 'string' && raw.displayName.length <= 20) {
    s.displayName = raw.displayName;
  }
  s.clicks = asNonNegativeInt(raw.clicks, 0);

  if (isRecord(raw.tried)) {
    for (const [k, v] of Object.entries(raw.tried)) if (v === true) s.tried[k] = true;
  }
  if (isRecord(raw.triedAt)) {
    for (const [k, v] of Object.entries(raw.triedAt)) {
      if (typeof v === 'string') s.triedAt[k] = v;
    }
  }
  if (isRecord(raw.best)) {
    s.best.reactionMs = asNullableNonNegativeInt(raw.best.reactionMs);
    s.best.tapRush = asNullableNonNegativeInt(raw.best.tapRush);
    s.best.memoryLevel = asNonNegativeInt(raw.best.memoryLevel, 0);
    s.best.guessFewest = asNullableNonNegativeInt(raw.best.guessFewest);
  }
  if (isRecord(raw.counts)) {
    s.counts.beatHits = asNonNegativeInt(raw.counts.beatHits, 0);
    s.counts.beatAutoStarts = asNonNegativeInt(raw.counts.beatAutoStarts, 0);
    s.counts.oracleAsks = asNonNegativeInt(raw.counts.oracleAsks, 0);
  }
  if (Array.isArray(raw.history)) {
    s.history = raw.history
      .filter(
        (e): e is HistoryEntry =>
          isRecord(e) && typeof e.gameId === 'string' && typeof e.at === 'string',
      )
      .slice(0, 50);
  }
  if (isRecord(raw.achievements)) {
    for (const [k, v] of Object.entries(raw.achievements)) {
      if (typeof v === 'string') s.achievements[k] = v;
    }
  }
  if (isRecord(raw.streak)) {
    const lv = raw.streak.lastVisit;
    s.streak.lastVisit = typeof lv === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(lv) ? lv : null;
    s.streak.count = asNonNegativeInt(raw.streak.count, 0);
    s.streak.best = asNonNegativeInt(raw.streak.best, 0);
  }
  if (isRecord(raw.settings)) {
    const theme = raw.settings.theme;
    if (theme === 'system' || theme === 'light' || theme === 'dark') s.settings.theme = theme;
    if (typeof raw.settings.sound === 'boolean') s.settings.sound = raw.settings.sound;
    if (typeof raw.settings.reducedMotion === 'boolean') {
      s.settings.reducedMotion = raw.settings.reducedMotion;
    }
  }
  return s;
}
