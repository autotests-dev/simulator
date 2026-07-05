export type Rng = {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
};

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    next,
    int(min, max) {
      const lo = Math.ceil(min);
      const hi = Math.floor(max);
      return lo + Math.floor(next() * (hi - lo + 1));
    },
    pick(items) {
      if (items.length === 0) throw new Error('rng.pick: empty array');
      return items[rng.int(0, items.length - 1)] as (typeof items)[number];
    },
  };
  return rng;
}
