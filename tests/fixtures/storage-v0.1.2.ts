// Frozen v0.1.2 reader for upgrade/rollback regression tests.
export type KvStorage = {
  readonly namespace: string;
  get<T>(subkey: string): T | undefined;
  set<T>(subkey: string, value: T): void;
  remove(subkey: string): void;
  clear(): void;
};

export function createStorage(namespace: string): KvStorage {
  const prefix = `${namespace}::`;
  const cache = new Map<string, string>();
  const pending = new Set<string>();
  let ignoreStoredValues = false;

  return {
    namespace,
    get<T>(subkey: string): T | undefined {
      let raw = cache.get(subkey);
      if (!ignoreStoredValues && !pending.has(subkey)) {
        try {
          raw = localStorage.getItem(prefix + subkey) ?? undefined;
          if (raw === undefined) cache.delete(subkey);
          else cache.set(subkey, raw);
        } catch {
          // Keep the last known value when browser storage becomes unavailable.
        }
      }
      try {
        return raw === undefined ? undefined : (JSON.parse(raw) as T);
      } catch {
        return undefined;
      }
    },
    set<T>(subkey: string, value: T): void {
      const raw = JSON.stringify(value);
      cache.set(subkey, raw);
      try {
        localStorage.setItem(prefix + subkey, raw);
        pending.delete(subkey);
      } catch {
        // A failed write must not be replaced by an older persisted value on read.
        pending.add(subkey);
      }
    },
    remove(subkey: string): void {
      cache.delete(subkey);
      try {
        localStorage.removeItem(prefix + subkey);
        pending.delete(subkey);
      } catch {
        pending.add(subkey);
      }
    },
    clear(): void {
      cache.clear();
      pending.clear();
      try {
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) toRemove.push(key);
        }
        for (const key of toRemove) localStorage.removeItem(key);
        ignoreStoredValues = false;
      } catch {
        // A reset still takes effect in this page even if removal is blocked.
        ignoreStoredValues = true;
      }
    },
  };
}

export type StateHandle<T> = {
  get(): T;
  set(value: T): void;
  update(updater: (current: T) => T): T;
  reset(): void;
};

type StateOptions<T> = {
  version: number;
  schema: {
    safeParse(value: unknown): { success: true; data: T } | { success: false };
  };
};

export function defineState<T>(
  storage: KvStorage,
  name: string,
  initial: () => T,
  { version, schema }: StateOptions<T>,
): StateHandle<T> {
  const write = (value: T): void => storage.set(name, { version, value });
  const read = (): T => {
    const stored = storage.get<unknown>(name);
    const wrapped = typeof stored === 'object' && stored !== null && 'version' in stored;
    const compatible = !wrapped || stored.version === version;
    const value = wrapped ? ('value' in stored ? stored.value : undefined) : stored;
    if (compatible) {
      const parsed = schema.safeParse(value);
      if (parsed.success) {
        // Existing unversioned records are migrated only after validation.
        if (!wrapped) write(parsed.data);
        return parsed.data;
      }
    }
    const seeded = initial();
    write(seeded);
    return seeded;
  };
  return {
    get: read,
    set: write,
    update(updater) {
      const next = updater(read());
      write(next);
      return next;
    },
    reset() {
      write(initial());
    },
  };
}
