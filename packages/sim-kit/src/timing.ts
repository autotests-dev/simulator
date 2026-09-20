import type { Rng } from './rng';

/** Bound infrastructure startup without changing account-specific latency. */
export async function withTimeout<T>(operation: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Startup timed out')), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export type Timing = {
  readonly slowFactor: number;
  delay(ms: number): Promise<void>;
  latency(bounds?: readonly [number, number]): Promise<void>;
};

export function createTiming(opts: { rng: Rng; slowFactor?: number }): Timing {
  const slowFactor = Math.max(0, opts.slowFactor ?? 1);
  const sleep = (ms: number): Promise<void> =>
    ms <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));

  return {
    slowFactor,
    delay(ms) {
      return sleep(ms * slowFactor);
    },
    latency(bounds = [120, 320]) {
      return sleep(opts.rng.int(bounds[0], bounds[1]) * slowFactor);
    },
  };
}
