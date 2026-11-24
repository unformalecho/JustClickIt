import { describe, expect, it } from 'vitest';
import { DARES, FACTS, JOKES, RIDDLES, WYR, ANSWERS } from '../../src/lib/data';

/**
 * Content parity with the prototype (justclickit.html).
 * NOTE: the TODO said RIDDLES 9 / WYR 11, but the actual file has 8 riddles
 * and 10 WYR pairs (76 items total). These counts assert the real file.
 */
describe('content decks (parity with prototype)', () => {
  it('has the exact item counts', () => {
    expect(DARES).toHaveLength(24);
    expect(FACTS).toHaveLength(12);
    expect(JOKES).toHaveLength(10);
    expect(RIDDLES).toHaveLength(8);
    expect(WYR).toHaveLength(10);
    expect(ANSWERS).toHaveLength(12);
  });

  it('every item has a stable unique id and non-empty text', () => {
    const check = (items: Array<{ id: string; text?: string; q?: string; a?: string }>) => {
      const ids = items.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const item of items) {
        expect(item.id).toMatch(/^[a-z]+-\d{2}$/);
        expect((item.text ?? item.q ?? '').length).toBeGreaterThan(0);
      }
    };
    check(DARES);
    check(FACTS);
    check(JOKES);
    check(ANSWERS);
    check(RIDDLES);
    for (const p of WYR) {
      expect(p.a.length).toBeGreaterThan(0);
      expect(p.b.length).toBeGreaterThan(0);
    }
    for (const r of RIDDLES) expect(r.a.length).toBeGreaterThan(0);
  });
});
