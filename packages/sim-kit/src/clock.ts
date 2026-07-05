export type Clock = {
  readonly fixed: boolean;
  nowMs(): number;
  now(): Date;
  iso(): string;
};

export function createClock(nowIso?: string | null): Clock {
  if (nowIso) {
    const fixedMs = Date.parse(nowIso);
    if (Number.isNaN(fixedMs)) {
      throw new Error(`createClock: invalid "now" value "${nowIso}"`);
    }
    return {
      fixed: true,
      nowMs: () => fixedMs,
      now: () => new Date(fixedMs),
      iso: () => new Date(fixedMs).toISOString(),
    };
  }
  return {
    fixed: false,
    nowMs: () => Date.now(),
    now: () => new Date(Date.now()),
    iso: () => new Date(Date.now()).toISOString(),
  };
}
