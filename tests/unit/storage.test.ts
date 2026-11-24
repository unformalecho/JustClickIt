import { describe, expect, it } from 'vitest';
import { Store, type StorageLike } from '../../src/lib/store/storage';
import { STORAGE_KEY } from '../../src/lib/store/schema';

function memStorage(initial?: Record<string, string>): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

describe('Store / localStorage', () => {
  it('starts fresh with defaults when storage is empty', () => {
    const store = new Store(memStorage());
    expect(store.state.clicks).toBe(0);
    expect(store.state.version).toBe(1);
    expect(store.recoveredFromCorrupt).toBe(false);
  });

  it('persists and reloads state', () => {
    const storage = memStorage();
    const a = new Store(storage);
    a.update((s) => {
      s.clicks = 7;
      s.tried.dare = true;
    });
    a.flush();
    const b = new Store(storage);
    expect(b.state.clicks).toBe(7);
    expect(b.state.tried.dare).toBe(true);
    expect(b.state.deviceId).toBe(a.state.deviceId);
  });

  it('backs up corrupt JSON and starts fresh instead of crashing', () => {
    const storage = memStorage({ [STORAGE_KEY]: '{not json' });
    const store = new Store(storage);
    expect(store.recoveredFromCorrupt).toBe(true);
    expect(store.state.clicks).toBe(0);
    const backupKeys = [...storage.map.keys()].filter((k) =>
      k.startsWith(`${STORAGE_KEY}:corrupt:`),
    );
    expect(backupKeys).toHaveLength(1);
    expect(storage.map.get(backupKeys[0]!)).toBe('{not json');
    expect(storage.map.has(STORAGE_KEY)).toBe(false);
  });

  it('backs up wrong-version data too', () => {
    const storage = memStorage({ [STORAGE_KEY]: JSON.stringify({ version: 99, clicks: 5 }) });
    const store = new Store(storage);
    expect(store.recoveredFromCorrupt).toBe(true);
    expect(store.state.clicks).toBe(0);
  });

  it('caps history at 50 entries', () => {
    const store = new Store(memStorage());
    for (let i = 0; i < 60; i++) store.recordHistory('dare', i);
    expect(store.state.history).toHaveLength(50);
    expect(store.state.history[0]?.score).toBe(59);
  });

  it('reset() wipes stored data', () => {
    const storage = memStorage();
    const store = new Store(storage);
    store.update((s) => {
      s.clicks = 3;
    });
    store.flush();
    expect(storage.map.has(STORAGE_KEY)).toBe(true);
    store.reset();
    expect(store.state.clicks).toBe(0);
    expect(storage.map.has(STORAGE_KEY)).toBe(false);
  });
});
