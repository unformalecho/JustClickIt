export function rand(n: number): number {
  return Math.floor(Math.random() * n);
}

export function pick<T>(arr: readonly T[]): T {
  return arr[rand(arr.length)] as T;
}

/** Pick an element different from `lastIndex` (when possible). Returns value + index. */
export function pickNoRepeat<T>(arr: readonly T[], lastIndex: number): { value: T; index: number } {
  if (arr.length === 0) throw new Error('pickNoRepeat: empty array');
  if (arr.length === 1) return { value: arr[0] as T, index: 0 };
  let i = rand(arr.length);
  while (i === lastIndex) i = rand(arr.length);
  return { value: arr[i] as T, index: i };
}

/** Random integer in [min, max] inclusive. */
export function randInt(min: number, max: number): number {
  return min + rand(max - min + 1);
}
