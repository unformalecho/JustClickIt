import { describe, expect, it } from 'vitest';
import { applyStreakVisit, localDateString } from '../../src/lib/streak';

const d = (iso: string) => new Date(`${iso}T12:00:00`);

describe('daily streak (local dates)', () => {
  it('starts at 1 on the first visit', () => {
    const s = applyStreakVisit({ lastVisit: null, count: 0, best: 0 }, d('2026-11-25'));
    expect(s).toEqual({ lastVisit: '2026-11-25', count: 1, best: 1 });
  });

  it('same day is a no-op', () => {
    const s = applyStreakVisit({ lastVisit: '2026-11-25', count: 3, best: 3 }, d('2026-11-25'));
    expect(s).toEqual({ lastVisit: '2026-11-25', count: 3, best: 3 });
  });

  it('next day increments', () => {
    const s = applyStreakVisit({ lastVisit: '2026-11-25', count: 3, best: 5 }, d('2026-11-26'));
    expect(s).toEqual({ lastVisit: '2026-11-26', count: 4, best: 5 });
  });

  it('a gap day resets to 1 but keeps best', () => {
    const s = applyStreakVisit({ lastVisit: '2026-11-25', count: 4, best: 4 }, d('2026-11-27'));
    expect(s).toEqual({ lastVisit: '2026-11-27', count: 1, best: 4 });
  });

  it('month boundary: Jan 31 → Feb 1 increments', () => {
    const s = applyStreakVisit({ lastVisit: '2026-01-31', count: 2, best: 2 }, d('2026-02-01'));
    expect(s.count).toBe(3);
  });

  it('year boundary: Dec 31 → Jan 1 increments', () => {
    const s = applyStreakVisit({ lastVisit: '2026-12-31', count: 9, best: 9 }, d('2027-01-01'));
    expect(s).toEqual({ lastVisit: '2027-01-01', count: 10, best: 10 });
  });

  it('leap day: Feb 28 → Feb 29 increments in a leap year', () => {
    const s = applyStreakVisit({ lastVisit: '2028-02-28', count: 1, best: 1 }, d('2028-02-29'));
    expect(s.count).toBe(2);
  });

  it('corrupt lastVisit resets to 1', () => {
    const s = applyStreakVisit({ lastVisit: '2026-02-30', count: 5, best: 5 }, d('2026-03-01'));
    expect(s.count).toBe(1);
    expect(s.lastVisit).toBe('2026-03-01');
    expect(s.best).toBe(5);
  });

  it('localDateString uses local (not UTC) components', () => {
    const date = new Date(2026, 0, 5, 23, 30);
    expect(localDateString(date)).toBe('2026-01-05');
  });
});
