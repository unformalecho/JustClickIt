import { describe, expect, it } from 'vitest';
import { pickNoRepeat, rand, pick } from '../../src/lib/random';

describe('random helpers', () => {
  it('pick returns an element of the array', () => {
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) expect(arr).toContain(pick(arr));
  });

  it('rand stays in [0, n)', () => {
    for (let i = 0; i < 200; i++) {
      const v = rand(5);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
    }
  });

  it('pickNoRepeat never returns the same index twice in a row', () => {
    const arr = ['a', 'b', 'c', 'd'];
    let last = 1;
    for (let i = 0; i < 100; i++) {
      const { index } = pickNoRepeat(arr, last);
      expect(index).not.toBe(last);
      last = index;
    }
  });

  it('pickNoRepeat handles a single-element array', () => {
    expect(pickNoRepeat(['only'], 0)).toEqual({ value: 'only', index: 0 });
  });

  it('pickNoRepeat throws on an empty array', () => {
    expect(() => pickNoRepeat([], 0)).toThrow();
  });
});
