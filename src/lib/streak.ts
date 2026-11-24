/**
 * Daily streak, using the *local* date (TODO §6.5). UTC is deliberately not
 * used: a streak is about the user's day, not a server's day.
 */

export function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseLocalDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // Reject impossible dates like 2026-02-30 (JS rolls them over).
  if (
    d.getFullYear() !== Number(m[1]) ||
    d.getMonth() !== Number(m[2]) - 1 ||
    d.getDate() !== Number(m[3])
  ) {
    return null;
  }
  return d;
}

export interface Streak {
  lastVisit: string | null;
  count: number;
  best: number;
}

/**
 * Apply a visit on `today` (defaults to now). Pure function.
 * - same day as lastVisit → no change
 * - next calendar day → count + 1
 * - any gap (or corrupt/missing lastVisit) → count = 1
 * `best` is the max count ever reached.
 */
export function applyStreakVisit(streak: Streak, today: Date = new Date()): Streak {
  const todayStr = localDateString(today);
  if (streak.lastVisit === todayStr) return { ...streak };
  const last = streak.lastVisit ? parseLocalDate(streak.lastVisit) : null;
  let count = 1;
  if (last) {
    const next = new Date(last);
    next.setDate(next.getDate() + 1);
    if (localDateString(next) === todayStr) count = streak.count + 1;
  }
  return { lastVisit: todayStr, count, best: Math.max(streak.best, count) };
}
