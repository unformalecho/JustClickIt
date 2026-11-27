/**
 * Local persistence schema (TODO §4).
 * Key: `justclickit:v1`. Versioned; validated on load; corrupt data is backed
 * up to `justclickit:v1:corrupt:<timestamp>` and replaced with a fresh state.
 * The app must never crash because of stored data.
 */

import { ACTIVITIES } from '../../games/registry';

/** Ids that may appear in `tried`, `triedAt` and history. Unknown ids are dropped on load. */
const GAME_IDS = new Set(ACTIVITIES.map((a) => a.id));

export const STORAGE_KEY = 'justclickit:v1';
export const STORAGE_VERSION = 1;

export type ThemeSetting = 'system' | 'light' | 'dark';

export interface HistoryEntry {
  gameId: string;
  at: string; // ISO timestamp
  /** Finite number, or a short outcome string (Mini Chess: 'win' / 'loss' / 'draw'). */
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
    chessWins: number;
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
    counts: { beatHits: 0, beatAutoStarts: 0, oracleAsks: 0, chessWins: 0 },
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

/** Strict ISO-8601 timestamp, as produced by `new Date().toISOString()`. */
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;

function isIsoTimestamp(v: unknown): v is string {
  return typeof v === 'string' && ISO_TIMESTAMP.test(v) && !Number.isNaN(Date.parse(v));
}

/** Only known games count as tried; unknown keys (e.g. from a tampered save) are dropped. */
function validateTried(raw: unknown): Record<string, true> {
  const tried: Record<string, true> = {};
  if (isRecord(raw)) {
    for (const [k, v] of Object.entries(raw)) {
      if (v === true && GAME_IDS.has(k)) tried[k] = true;
    }
  }
  return tried;
}

function validateTriedAt(raw: unknown): Record<string, string> {
  const triedAt: Record<string, string> = {};
  if (isRecord(raw)) {
    for (const [k, v] of Object.entries(raw)) {
      if (GAME_IDS.has(k) && isIsoTimestamp(v)) triedAt[k] = v;
    }
  }
  return triedAt;
}

function validateBest(raw: unknown): LocalStateV1['best'] {
  const best: LocalStateV1['best'] = {
    reactionMs: null,
    tapRush: null,
    memoryLevel: 0,
    guessFewest: null,
  };
  if (isRecord(raw)) {
    best.reactionMs = asNullableNonNegativeInt(raw.reactionMs);
    best.tapRush = asNullableNonNegativeInt(raw.tapRush);
    best.memoryLevel = asNonNegativeInt(raw.memoryLevel, 0);
    best.guessFewest = asNullableNonNegativeInt(raw.guessFewest);
  }
  return best;
}

function validateCounts(raw: unknown): LocalStateV1['counts'] {
  const counts: LocalStateV1['counts'] = {
    beatHits: 0,
    beatAutoStarts: 0,
    oracleAsks: 0,
    chessWins: 0,
  };
  if (isRecord(raw)) {
    counts.beatHits = asNonNegativeInt(raw.beatHits, 0);
    counts.beatAutoStarts = asNonNegativeInt(raw.beatAutoStarts, 0);
    counts.oracleAsks = asNonNegativeInt(raw.oracleAsks, 0);
    counts.chessWins = asNonNegativeInt(raw.chessWins, 0);
  }
  return counts;
}

/** A history score is a finite number or a short outcome string; anything else is dropped. */
function asScore(v: unknown): number | string | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.length > 0 && v.length <= 20) return v;
  return undefined;
}

function validateHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const history: HistoryEntry[] = [];
  for (const e of raw) {
    if (!isRecord(e)) continue;
    if (typeof e.gameId !== 'string' || !GAME_IDS.has(e.gameId)) continue;
    if (!isIsoTimestamp(e.at)) continue;
    const entry: HistoryEntry = { gameId: e.gameId, at: e.at };
    const score = asScore(e.score);
    if (score !== undefined) entry.score = score;
    history.push(entry);
  }
  return history.slice(0, 50);
}

/** Achievement values must be ISO timestamps, or the Achievements view renders "Invalid Date". */
function validateAchievements(raw: unknown): Record<string, string> {
  const achievements: Record<string, string> = {};
  if (isRecord(raw)) {
    for (const [k, v] of Object.entries(raw)) {
      if (isIsoTimestamp(v)) achievements[k] = v;
    }
  }
  return achievements;
}

function validateStreak(raw: unknown): LocalStateV1['streak'] {
  const streak: LocalStateV1['streak'] = { lastVisit: null, count: 0, best: 0 };
  if (isRecord(raw)) {
    const lv = raw.lastVisit;
    streak.lastVisit = typeof lv === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(lv) ? lv : null;
    streak.count = asNonNegativeInt(raw.count, 0);
    streak.best = asNonNegativeInt(raw.best, 0);
  }
  return streak;
}

function validateSettings(raw: unknown): LocalStateV1['settings'] {
  const settings: LocalStateV1['settings'] = {
    theme: 'system',
    sound: true,
    reducedMotion: false,
  };
  if (isRecord(raw)) {
    const theme = raw.theme;
    if (theme === 'system' || theme === 'light' || theme === 'dark') settings.theme = theme;
    if (typeof raw.sound === 'boolean') settings.sound = raw.sound;
    if (typeof raw.reducedMotion === 'boolean') settings.reducedMotion = raw.reducedMotion;
  }
  return settings;
}

/**
 * Validate unknown parsed JSON. Returns a complete, safe state, or null when
 * the input is so wrong it cannot be repaired (caller then backs it up and
 * starts fresh). Unknown extra fields are dropped; missing fields get defaults.
 * Implausible values are repaired per section: unknown game ids are dropped
 * from `tried` / `triedAt` / history, history scores must be a finite number
 * or a short outcome string, and achievement / timestamp values must be valid
 * ISO timestamps.
 */
export function validateState(raw: unknown): LocalStateV1 | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== 1) return null;
  const s = defaultState();

  if (typeof raw.deviceId === 'string' && raw.deviceId.length > 0) s.deviceId = raw.deviceId;
  if (typeof raw.displayName === 'string' && raw.displayName.length <= 20) {
    s.displayName = raw.displayName;
  }
  s.clicks = asNonNegativeInt(raw.clicks, 0);
  s.tried = validateTried(raw.tried);
  s.triedAt = validateTriedAt(raw.triedAt);
  s.best = validateBest(raw.best);
  s.counts = validateCounts(raw.counts);
  s.history = validateHistory(raw.history);
  s.achievements = validateAchievements(raw.achievements);
  s.streak = validateStreak(raw.streak);
  s.settings = validateSettings(raw.settings);
  return s;
}
