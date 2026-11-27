import { describe, expect, it } from 'vitest';
import { defaultState, validateState } from '../../src/lib/store/schema';

describe('validateState', () => {
  it('accepts a complete valid state', () => {
    const s = validateState(defaultState());
    expect(s).not.toBeNull();
    expect(s?.version).toBe(1);
    expect(s?.clicks).toBe(0);
  });

  it('rejects non-objects and wrong versions', () => {
    expect(validateState(null)).toBeNull();
    expect(validateState('nope')).toBeNull();
    expect(validateState([])).toBeNull();
    expect(validateState({ version: 2 })).toBeNull();
    expect(validateState({})).toBeNull();
  });

  it('repairs partial states with defaults', () => {
    const s = validateState({ version: 1, clicks: 5, best: { reactionMs: 123 } });
    expect(s?.clicks).toBe(5);
    expect(s?.best.reactionMs).toBe(123);
    expect(s?.best.tapRush).toBeNull();
    expect(s?.best.memoryLevel).toBe(0);
    expect(s?.deviceId.length).toBeGreaterThan(0);
  });

  it('clamps invalid numbers and drops bad fields', () => {
    const s = validateState({
      version: 1,
      clicks: -3,
      best: { reactionMs: 'fast', tapRush: -1, memoryLevel: 2.7 },
      streak: { lastVisit: 'not-a-date', count: -1, best: 2 },
      settings: { theme: 'neon', sound: 'yes' },
      history: [{ gameId: 'dare', at: '2026-01-01T00:00:00.000Z' }, { nope: true }],
    });
    expect(s?.clicks).toBe(0);
    expect(s?.best.reactionMs).toBeNull();
    expect(s?.best.tapRush).toBeNull();
    expect(s?.best.memoryLevel).toBe(2);
    expect(s?.streak.lastVisit).toBeNull();
    expect(s?.streak.count).toBe(0);
    expect(s?.settings.theme).toBe('system');
    expect(s?.settings.sound).toBe(true);
    expect(s?.history).toHaveLength(1);
  });

  it('drops unknown tried / triedAt keys', () => {
    const s = validateState({
      version: 1,
      tried: { dare: true, chess: true, bogus: true, snack: 'yes' },
      triedAt: {
        dare: '2026-01-01T00:00:00.000Z',
        bogus: '2026-01-01T00:00:00.000Z',
        chess: 'not-a-date',
      },
    });
    expect(Object.keys(s?.tried ?? {}).sort()).toEqual(['chess', 'dare']);
    expect(s?.triedAt).toEqual({ dare: '2026-01-01T00:00:00.000Z' });
  });

  it('repairs history scores and drops bad entries', () => {
    const s = validateState({
      version: 1,
      history: [
        { gameId: 'reaction', at: '2026-01-01T00:00:00.000Z', score: 123 },
        { gameId: 'chess', at: '2026-01-01T00:00:00.000Z', score: 'win' },
        { gameId: 'taprush', at: '2026-01-01T00:00:00.000Z', score: { value: 5 } },
        { gameId: 'memory', at: '2026-01-01T00:00:00.000Z', score: true },
        { gameId: 'bogus-game', at: '2026-01-01T00:00:00.000Z', score: 1 },
        { gameId: 'dare', at: 'yesterday' },
      ],
    });
    expect(s?.history).toEqual([
      { gameId: 'reaction', at: '2026-01-01T00:00:00.000Z', score: 123 },
      { gameId: 'chess', at: '2026-01-01T00:00:00.000Z', score: 'win' },
      { gameId: 'taprush', at: '2026-01-01T00:00:00.000Z' },
      { gameId: 'memory', at: '2026-01-01T00:00:00.000Z' },
    ]);
  });

  it('drops achievement values that are not ISO dates', () => {
    const s = validateState({
      version: 1,
      achievements: {
        'first-click': '2026-01-01T00:00:00.000Z',
        'explorer-4': 'garbage',
        'streak-3': '2026-13-45T99:99:99.000Z',
      },
    });
    expect(s?.achievements).toEqual({ 'first-click': '2026-01-01T00:00:00.000Z' });
  });
});
