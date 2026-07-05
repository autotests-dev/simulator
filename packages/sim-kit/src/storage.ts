export type KvStorage = {
  readonly namespace: string;
  get<T>(subkey: string): T | undefined;
  set<T>(subkey: string, value: T): void;
  remove(subkey: string): void;
  clear(): void;
};

export function createStorage(namespace: string): KvStorage {
  const prefix = `${namespace}::`;
  return {
    namespace,
    get<T>(subkey: string): T | undefined {
      try {
        const raw = localStorage.getItem(prefix + subkey);
        return raw == null ? undefined : (JSON.parse(raw) as T);
      } catch {
        return undefined;
      }
    },
    set<T>(subkey: string, value: T): void {
      try {
        localStorage.setItem(prefix + subkey, JSON.stringify(value));
      } catch {}
    },
    remove(subkey: string): void {
      try {
        localStorage.removeItem(prefix + subkey);
      } catch {}
    },
    clear(): void {
      try {
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) toRemove.push(key);
        }
        for (const key of toRemove) localStorage.removeItem(key);
      } catch {}
    },
  };
}

export type StateHandle<T> = {
  get(): T;
  set(value: T): void;
  update(updater: (current: T) => T): T;
  reset(): void;
};

export function defineState<T>(storage: KvStorage, name: string, initial: () => T): StateHandle<T> {
  const read = (): T => {
    const current = storage.get<T>(name);
    if (current === undefined) {
      const seeded = initial();
      storage.set(name, seeded);
      return seeded;
    }
    return current;
  };
  return {
    get: read,
    set(value) {
      storage.set(name, value);
    },
    update(updater) {
      const next = updater(read());
      storage.set(name, next);
      return next;
    },
    reset() {
      storage.set(name, initial());
    },
  };
}
