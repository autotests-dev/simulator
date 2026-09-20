import { test, expect } from '@playwright/test';
import { createStorage, defineState } from '../packages/sim-kit/src/storage';
import { persistedState } from '../packages/domain/src/persistence';

let savedDescriptor: PropertyDescriptor | undefined;
let records: Map<string, string>;
let denied: boolean;
let full: boolean;

test.beforeEach(() => {
  savedDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  records = new Map();
  denied = false;
  full = false;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      if (denied) throw new Error('Storage denied');
      return {
        getItem: (key: string) => records.get(key) ?? null,
        setItem(key: string, value: string) {
          if (full) throw new Error('Quota exceeded');
          records.set(key, value);
        },
        removeItem: (key: string) => records.delete(key),
        key: (index: number) => [...records.keys()][index] ?? null,
        get length() {
          return records.size;
        },
      };
    },
  });
});

test.afterEach(() => {
  if (savedDescriptor) Object.defineProperty(globalThis, 'localStorage', savedDescriptor);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});

test('quota failures retain the newest state and can persist again after recovery', () => {
  const storage = createStorage('test');
  storage.set('cart', { qty: 1 });
  full = true;
  storage.set('cart', { qty: 2 });
  expect(storage.get('cart')).toEqual({ qty: 2 });
  expect(JSON.parse(records.get('test::cart')!)).toEqual({ qty: 1 });
  full = false;
  storage.set('cart', { qty: 3 });
  expect(createStorage('test').get('cart')).toEqual({ qty: 3 });
});

test('failed removal and reset cannot resurrect stale persisted values in the page', () => {
  const storage = createStorage('test');
  storage.set('cart', { qty: 1 });
  records.set('test::unread', '42');
  denied = true;
  storage.remove('cart');
  denied = false;
  expect(storage.get('cart')).toBeUndefined();
  denied = true;
  storage.clear();
  denied = false;
  expect(storage.get('unread')).toBeUndefined();
  storage.set('cart', { qty: 2 });
  expect(storage.get('cart')).toEqual({ qty: 2 });
});

test('healthy storage still observes changes from another tab and clears only its namespace', () => {
  const storage = createStorage('test');
  storage.set('cart', 1);
  records.set('test::cart', '2');
  records.set('other::cart', '3');
  expect(storage.get('cart')).toBe(2);
  records.delete('test::cart');
  expect(storage.get('cart')).toBeUndefined();
  storage.clear();
  expect(records.get('other::cart')).toBe('3');
});

test('state migration preserves legacy values and rejects malformed or incompatible records', () => {
  const storage = createStorage('test');
  const state = defineState(storage, 'sequence', () => 10, persistedState.sequence);
  records.set('test::sequence', '27');
  expect(state.get()).toBe(27);
  expect(JSON.parse(records.get('test::sequence')!)).toEqual({ version: 1, value: 27 });
  expect(state.update((value) => value + 1)).toBe(28);

  for (const raw of ['{', 'null', '"27"', '-1', '{"version":2,"value":27}', '{"version":1}']) {
    records.set('test::sequence', raw);
    expect(state.get()).toBe(10);
  }
  state.set(30);
  state.reset();
  expect(state.get()).toBe(10);
});

test('nested invalid records are rejected for every persisted domain collection', () => {
  const badRecords = {
    stock: { product: -1 },
    cart: { lines: [{ id: 'a', productId: 'b', qty: '1' }], couponCode: null },
    session: { userId: [] },
    orders: { guest: [{ id: 'order' }] },
    addresses: { guest: [null] },
    sequence: 0.5,
    overrides: { product: { published: 'false' } },
    customProducts: [{ id: 'product' }],
    notes: { product: [{ id: 'note', body: 42, createdAt: 'invalid' }] },
    reauth: { reauthed: 'false' },
    customAccounts: [{ id: 'profile' }],
    userReviews: { product: [{ rating: 6 }] },
  };
  for (const [name, schema] of Object.entries(persistedState)) {
    expect(schema.schema.safeParse(badRecords[name as keyof typeof badRecords]).success, name).toBe(
      false,
    );
    expect(schema.schema.safeParse(null).success, name).toBe(false);
  }
});
