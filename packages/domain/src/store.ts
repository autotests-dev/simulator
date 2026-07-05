import { config } from '@autotests-simulator/config';
import type { BehaviorAssignments, Coupon, Product, Profile } from '@autotests-simulator/config';
import {
  createClock,
  createRng,
  createStorage,
  defineState,
  formatMoney,
  type Clock,
} from '@autotests-simulator/sim-kit';
import { computeTotals } from './totals';
import type {
  Address,
  AdminOrderPage,
  AdminOrderQuery,
  AdminOrderRow,
  AdminProductQuery,
  AdminSummary,
  BehaviorsView,
  BulkAction,
  BulkResult,
  BulkResultRow,
  Cart,
  CartLine,
  ContactInput,
  ContactReceipt,
  Note,
  Order,
  OrderItem,
  OrderPage,
  OrderStatus,
  PaymentMethod,
  ProductInput,
  ProductListItem,
  ProductOverride,
  ProductPage,
  ProductPatch,
  ProductQuery,
  PublicUser,
  Review,
  ReviewInput,
  ReviewPage,
  SignupInput,
} from './types';

const NS = 'kotes';
const GUEST = 'guest';
const DEFAULT_PAGE_SIZE = 8;
const ADMIN_PAGE_SIZE = 8;
const ORDERS_PAGE_SIZE = 10;
const REVIEWS_PAGE_SIZE = 3;
const LOW_STOCK = 5;
const DAY_MS = 86_400_000;

const REVIEWERS = [
  'Maya R.',
  'Dev P.',
  'June L.',
  'Theo M.',
  'Sana K.',
  'Ruth B.',
  'Omar F.',
  'Iris V.',
  'Cole D.',
  'Nina S.',
];
const REVIEW_BODIES = [
  'Exactly as pictured. It has held up beautifully so far.',
  'Solid quality for the price. Would order again.',
  'Arrived quickly and well packed. Very happy with it.',
  'Nice weight and finish. It feels more expensive than it is.',
  'Does what it promises. The color is slightly warmer in person.',
  'A small size surprise at first, but it grew on me fast.',
  'Good, not perfect — one seam is a little uneven.',
  'This replaced a pricier version and I honestly prefer it.',
  'Bought one as a gift and kept one for myself.',
  'Three months in and it still looks brand new.',
];

export class DomainError extends Error {
  readonly status: number;
  readonly fieldErrors?: Record<string, string>;
  readonly code?: string;
  constructor(
    status: number,
    message: string,
    fieldErrors?: Record<string, string>,
    code?: string,
  ) {
    super(message);
    this.name = 'DomainError';
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.code = code;
  }
}

type StockMap = Record<string, number>;
type StoredLine = { id: string; productId: string; variant?: Record<string, string>; qty: number };
type CartState = { lines: StoredLine[]; couponCode: string | null };
type SessionState = { userId: string | null };
type OrdersState = Record<string, Order[]>;
type AddressesState = Record<string, Address[]>;

const storage = createStorage(NS);
const clock: Clock = createClock(config.defaults.now);

function buildSeed(): {
  stock: StockMap;
  orders: OrdersState;
  addresses: AddressesState;
  orderSeq: number;
} {
  const rng = createRng(config.defaults.seed);
  const products = config.seed.products;

  const stock: StockMap = {};
  for (const p of products) stock[p.id] = p.stock;

  const streets = [
    'Maple Ave',
    'Birch Street',
    'Cedar Lane',
    'Harbor Road',
    'Juniper Way',
    'Linden Court',
    'Marigold Drive',
    'Sutter Street',
  ];
  const cities: Array<[string, string, string]> = [
    ['Portland', 'OR', '97201'],
    ['Austin', 'TX', '78701'],
    ['Denver', 'CO', '80202'],
    ['Madison', 'WI', '53703'],
    ['Asheville', 'NC', '28801'],
    ['Burlington', 'VT', '05401'],
  ];

  const orders: OrdersState = { [GUEST]: [] };
  const addresses: AddressesState = { [GUEST]: [] };
  let seq = 1000;

  for (const profile of config.profiles) {
    const list: Order[] = [];
    const orderCount = profile.seed?.orders ?? 0;
    for (let i = 0; i < orderCount; i++) {
      const itemCount = rng.int(1, 3);
      const items: OrderItem[] = [];
      for (let j = 0; j < itemCount; j++) {
        const p = rng.pick(products);
        items.push({ productId: p.id, name: p.name, priceCents: p.priceCents, qty: rng.int(1, 2) });
      }
      const totals = computeTotals({
        lines: items.map((it) => ({ priceCents: it.priceCents, qty: it.qty })),
        shipping: config.seed.shipping,
        taxRate: config.seed.taxRate,
      });
      const daysAgo = rng.int(3, 320);
      const createdAt = new Date(clock.nowMs() - daysAgo * DAY_MS).toISOString();
      const status: OrderStatus =
        daysAgo > 14 ? 'delivered' : daysAgo > 4 ? 'shipped' : 'processing';
      list.push({
        id: `ord-${seq}`,
        number: `KO-${seq}`,
        createdAt,
        status,
        items,
        totals,
        email: profile.email,
      });
      seq += 1;
    }
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    orders[profile.id] = list;

    const addressCount = profile.seed?.addresses ?? 0;
    addresses[profile.id] = Array.from({ length: addressCount }, (_unused, i) => {
      const [city, region, postalCode] = rng.pick(cities);
      return {
        id: `addr-${profile.id}-${i}`,
        name: profile.displayName,
        line1: `${rng.int(100, 9899)} ${rng.pick(streets)}`,
        city,
        region,
        postalCode,
        country: 'US',
      } satisfies Address;
    });
  }

  return { stock, orders, addresses, orderSeq: seq };
}

const SEED = buildSeed();

const stockState = defineState<StockMap>(storage, 'stock', () => ({ ...SEED.stock }));
const cartState = defineState<CartState>(storage, 'cart', () => ({ lines: [], couponCode: null }));
const sessionState = defineState<SessionState>(storage, 'session', () => ({ userId: null }));
const ordersState = defineState<OrdersState>(storage, 'orders', () =>
  structuredCloneSafe(SEED.orders),
);
const addressesState = defineState<AddressesState>(storage, 'addresses', () =>
  structuredCloneSafe(SEED.addresses),
);
const orderSeqState = defineState<number>(storage, 'orderSeq', () => SEED.orderSeq);

const overridesState = defineState<Record<string, ProductOverride>>(
  storage,
  'overrides',
  () => ({}),
);
const customProductsState = defineState<Product[]>(storage, 'customProducts', () => []);
const writeSeqState = defineState<number>(storage, 'writeSeq', () => 0);

const notesState = defineState<Record<string, Note[]>>(storage, 'notes', () => ({
  'p-aera-mug': [
    {
      id: 'note-p-aera-mug-1',
      body: "Top seller this month. A customer wrote: Love it! <b>5/5</b> <script>alert('hi')</script>",
      createdAt: config.defaults.now,
    },
  ],
}));
const reauthState = defineState<{ reauthed: boolean }>(storage, 'reauth', () => ({
  reauthed: false,
}));
const sessionSeqState = defineState<number>(storage, 'sessionSeq', () => 0);
const contactSeqState = defineState<number>(storage, 'contactSeq', () => 1000);
const customAccountsState = defineState<Profile[]>(storage, 'customAccounts', () => []);
const addressSeqState = defineState<number>(storage, 'addressSeq', () => 0);
const userReviewsState = defineState<Record<string, Review[]>>(storage, 'userReviews', () => ({}));

const CONTACT_TOPICS = ['order', 'returns', 'care', 'other'];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function structuredCloneSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const listeners = new Set<() => void>();
function emit(): void {
  for (const listener of listeners) listener();
}
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function customProducts(): Product[] {
  return customProductsState.get();
}
function allBaseProducts(): Product[] {
  return [...config.seed.products, ...customProducts()];
}
function baseProductById(id: string): Product | undefined {
  return allBaseProducts().find((p) => p.id === id);
}
function baseProductBySlug(slug: string): Product | undefined {
  return allBaseProducts().find((p) => p.slug === slug);
}
function mergeProduct(base: Product): ProductListItem {
  const ov = overridesState.get()[base.id] ?? {};
  const stock = stockState.get()[base.id] ?? 0;
  const compareAtCents =
    ov.compareAtCents === null ? undefined : (ov.compareAtCents ?? base.compareAtCents);
  const badge = ov.badge === null ? undefined : (ov.badge ?? base.badge);
  return {
    ...base,
    name: ov.name ?? base.name,
    priceCents: ov.priceCents ?? base.priceCents,
    compareAtCents,
    badge,
    stock,
    inStock: stock > 0,
    published: ov.published ?? true,
  };
}
function liveById(id: string): ProductListItem | undefined {
  const base = baseProductById(id);
  return base ? mergeProduct(base) : undefined;
}
function liveBySlug(slug: string): ProductListItem | undefined {
  const base = baseProductBySlug(slug);
  return base ? mergeProduct(base) : undefined;
}
function allLive(): ProductListItem[] {
  return allBaseProducts().map(mergeProduct);
}
function requireAdmin(): Profile {
  const profile = currentProfile();
  if (!profile || (profile.behaviors?.role ?? 'member') !== 'admin') {
    throw new DomainError(403, 'You need an admin account to do that.');
  }
  return profile;
}
function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
function rollWriteFailure(): boolean {
  const rate = behaviors().highErrorRate ?? 0;
  if (rate <= 0) return false;
  const seq = writeSeqState.update((n) => n + 1);
  return Math.floor(seq * rate) > Math.floor((seq - 1) * rate);
}
function findCoupon(code: string): Coupon | undefined {
  const upper = code.trim().toUpperCase();
  return config.seed.coupons.find((c) => c.code === upper);
}
function allProfiles(): Profile[] {
  return [...config.profiles, ...customAccountsState.get()];
}
function currentProfile(): Profile | undefined {
  const id = sessionState.get().userId;
  return id ? allProfiles().find((p) => p.id === id) : undefined;
}
function currentScope(): string {
  return sessionState.get().userId ?? GUEST;
}
function behaviors(): BehaviorAssignments {
  return currentProfile()?.behaviors ?? {};
}
function currentLocale(): string {
  return behaviors().locale ?? config.defaults.locale;
}
function toPublicUser(profile: Profile): PublicUser {
  const b = profile.behaviors ?? {};
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    role: b.role ?? 'member',
    locale: b.locale ?? config.defaults.locale,
    behaviors: b,
  };
}
function makeLineId(productId: string, variant?: Record<string, string>): string {
  if (!variant || Object.keys(variant).length === 0) return productId;
  const parts = Object.keys(variant)
    .sort()
    .map((k) => `${k}:${variant[k]}`);
  return `${productId}|${parts.join('|')}`;
}

function resolveCart(): Cart {
  const cs = cartState.get();
  const lines: CartLine[] = cs.lines.map((l) => {
    const p = liveById(l.productId);
    const priceCents = p?.priceCents ?? 0;
    return {
      id: l.id,
      productId: l.productId,
      name: p?.name ?? 'Unknown item',
      slug: p?.slug ?? '',
      priceCents,
      qty: l.qty,
      variant: l.variant,
      lineTotalCents: priceCents * l.qty,
      stock: p?.stock ?? 0,
    };
  });

  const coupon = cs.couponCode ? findCoupon(cs.couponCode) : undefined;
  const totals = computeTotals({
    lines: lines.map((l) => ({ priceCents: l.priceCents, qty: l.qty })),
    coupon,
    shipping: config.seed.shipping,
    taxRate: config.seed.taxRate,
  });

  let couponNote: string | undefined;
  if (coupon && totals.discountCents === 0 && coupon.minSubtotalCents) {
    const remaining = coupon.minSubtotalCents - totals.subtotalCents;
    if (remaining > 0) {
      const amount = formatMoney(remaining, {
        locale: currentLocale(),
        currency: config.defaults.currency,
      });
      couponNote = `Spend ${amount} more to use code ${coupon.code}.`;
    }
  }

  return { lines, couponCode: cs.couponCode ?? undefined, couponNote, totals };
}

function validateAddress(address: Partial<Address>): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!address.name?.trim()) errors.name = 'Name is required.';
  if (!address.line1?.trim()) errors.line1 = 'Street address is required.';
  if (!address.city?.trim()) errors.city = 'City is required.';
  if (!address.region?.trim()) errors.region = 'State / region is required.';
  if (!address.postalCode?.trim()) errors.postalCode = 'Postal code is required.';
  else if (!/^[A-Za-z0-9 -]{3,10}$/.test(address.postalCode.trim())) {
    errors.postalCode = 'Enter a valid postal code.';
  }
  if (!address.country?.trim()) errors.country = 'Country is required.';
  return errors;
}

function validateCheckout(email: string, address: Partial<Address>): Record<string, string> {
  const errors = validateAddress(address);
  if (!email || !EMAIL_RE.test(email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  return errors;
}

function toAddress(id: string, input: Partial<Address>): Address {
  return {
    id,
    name: input.name?.trim() ?? '',
    line1: input.line1?.trim() ?? '',
    line2: input.line2?.trim() || undefined,
    city: input.city?.trim() ?? '',
    region: input.region?.trim() ?? '',
    postalCode: input.postalCode?.trim() ?? '',
    country: input.country?.trim() ?? '',
    phone: input.phone,
  };
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    slice: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    pageCount,
  };
}

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (Math.imul(h, 31) + value.charCodeAt(i)) | 0;
  return h >>> 0;
}

function reviewsFor(product: ProductListItem): Review[] {
  const rng = createRng((config.defaults.seed ^ hashString(product.id)) >>> 0);
  const count = rng.int(6, 14);
  const list: Review[] = [];
  for (let i = 0; i < count; i++) {
    const daysAgo = rng.int(2, 400);
    list.push({
      id: `rev-${product.id}-${i + 1}`,
      author: rng.pick(REVIEWERS),
      rating: Math.max(2, Math.min(5, Math.round(product.rating) + rng.int(-1, 1))),
      body: rng.pick(REVIEW_BODIES),
      createdAt: new Date(clock.nowMs() - daysAgo * DAY_MS).toISOString(),
    });
  }
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const domain = {
  behaviors(): BehaviorsView {
    const b = behaviors();
    return {
      role: b.role ?? (sessionState.get().userId ? 'member' : 'guest'),
      locale: currentLocale(),
      slowNetwork: b.slowNetwork ?? false,
    };
  },

  getCategories() {
    return config.seed.categories;
  },
  listProducts(query: ProductQuery = {}): ProductPage {
    let items = allLive().filter((p) => p.published);
    if (query.category) items = items.filter((p) => p.category === query.category);
    const search = query.search?.trim().toLowerCase();
    if (search) {
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.blurb.toLowerCase().includes(search) ||
          (p.tags ?? []).some((t) => t.toLowerCase().includes(search)),
      );
    }
    switch (query.sort) {
      case 'price-asc':
        items = [...items].sort((a, b) => a.priceCents - b.priceCents);
        break;
      case 'price-desc':
        items = [...items].sort((a, b) => b.priceCents - a.priceCents);
        break;
      case 'rating':
        items = [...items].sort((a, b) => b.rating - a.rating);
        break;
      default:
        break;
    }
    const { slice, total, page, pageSize, pageCount } = paginate(
      items,
      query.page ?? 1,
      query.pageSize ?? DEFAULT_PAGE_SIZE,
    );
    return { items: slice, total, page, pageSize, pageCount };
  },
  getProduct(slug: string): ProductListItem {
    const product = liveBySlug(slug);
    if (!product || !product.published) throw new DomainError(404, 'Product not found');
    return product;
  },
  listReviews(slug: string, query: { page?: number } = {}): ReviewPage {
    const product = liveBySlug(slug);
    if (!product || !product.published) throw new DomainError(404, 'Product not found');
    const rows = [...(userReviewsState.get()[product.id] ?? []), ...reviewsFor(product)];
    const { slice, total, page, pageSize, pageCount } = paginate(
      rows,
      query.page ?? 1,
      REVIEWS_PAGE_SIZE,
    );
    return { items: slice, total, page, pageSize, pageCount };
  },
  addReview(slug: string, input: ReviewInput): Review {
    const profile = currentProfile();
    if (!profile) throw new DomainError(401, 'Please sign in to review.');
    const product = liveBySlug(slug);
    if (!product || !product.published) throw new DomainError(404, 'Product not found');
    const fieldErrors: Record<string, string> = {};
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
      fieldErrors.rating = 'Choose a rating.';
    }
    if (input.body.trim().length < 10) {
      fieldErrors.body = 'Tell us a little more (at least 10 characters).';
    }
    if (Object.keys(fieldErrors).length) {
      throw new DomainError(422, 'Please fix the highlighted fields.', fieldErrors);
    }
    const existing = userReviewsState.get()[product.id] ?? [];
    const review: Review = {
      id: `rev-${product.id}-u${existing.length + 1}`,
      author: profile.displayName,
      rating: input.rating,
      body: input.body.trim(),
      createdAt: clock.iso(),
    };
    userReviewsState.update((all) => ({ ...all, [product.id]: [review, ...existing] }));
    emit();
    return review;
  },

  getCart(): Cart {
    return resolveCart();
  },
  addToCart(input: { productId: string; variant?: Record<string, string>; qty?: number }): Cart {
    const base = baseProductById(input.productId);
    if (!base) throw new DomainError(404, 'Product not found');
    const product = mergeProduct(base);
    if (!product.published) throw new DomainError(404, 'Product not found');
    const stock = product.stock;
    if (stock <= 0) throw new DomainError(409, 'This item is out of stock.');

    if (product.variants?.length) {
      const chosen = input.variant ?? {};
      const fieldErrors: Record<string, string> = {};
      for (const axis of product.variants) {
        const value = chosen[axis.name];
        if (!value) fieldErrors[axis.name] = `Choose a ${axis.name.toLowerCase()}.`;
        else if (!axis.options.includes(value))
          fieldErrors[axis.name] = `Invalid ${axis.name.toLowerCase()}.`;
      }
      if (Object.keys(fieldErrors).length) {
        throw new DomainError(422, 'Please choose options before adding to cart.', fieldErrors);
      }
    }

    const qty = Math.max(1, Math.floor(input.qty ?? 1));
    const lineId = makeLineId(product.id, input.variant);
    cartState.update((cs) => {
      const existing = cs.lines.find((l) => l.id === lineId);
      const nextQty = Math.min((existing?.qty ?? 0) + qty, stock);
      const lines = existing
        ? cs.lines.map((l) => (l.id === lineId ? { ...l, qty: nextQty } : l))
        : [
            ...cs.lines,
            { id: lineId, productId: product.id, variant: input.variant, qty: nextQty },
          ];
      return { ...cs, lines };
    });
    emit();
    return resolveCart();
  },
  updateCartLine(lineId: string, qty: number): Cart {
    cartState.update((cs) => {
      const desired = Math.floor(qty);
      const lines = cs.lines.flatMap((l) => {
        if (l.id !== lineId) return [l];
        const stock = stockState.get()[l.productId] ?? 0;
        const next = Math.min(desired, stock);
        return next <= 0 ? [] : [{ ...l, qty: next }];
      });
      return { ...cs, lines };
    });
    emit();
    return resolveCart();
  },
  removeCartLine(lineId: string): Cart {
    cartState.update((cs) => ({ ...cs, lines: cs.lines.filter((l) => l.id !== lineId) }));
    emit();
    return resolveCart();
  },
  applyCoupon(code: string): Cart {
    const coupon = findCoupon(code);
    if (!coupon) throw new DomainError(422, `"${code.trim()}" is not a valid code.`);
    cartState.update((cs) => ({ ...cs, couponCode: coupon.code }));
    emit();
    return resolveCart();
  },
  removeCoupon(): Cart {
    cartState.update((cs) => ({ ...cs, couponCode: null }));
    emit();
    return resolveCart();
  },

  checkout(input: { email: string; address: Partial<Address> }): Order {
    const cart = resolveCart();
    if (cart.lines.length === 0) throw new DomainError(409, 'Your cart is empty.');

    const errors = validateCheckout(input.email, input.address);
    if (Object.keys(errors).length) {
      throw new DomainError(422, 'Please fix the highlighted fields.', errors);
    }

    const stock = stockState.get();
    for (const line of cart.lines) {
      if ((stock[line.productId] ?? 0) < line.qty) {
        throw new DomainError(
          409,
          `Only ${stock[line.productId] ?? 0} of "${line.name}" left in stock.`,
        );
      }
    }

    stockState.update((s) => {
      const next = { ...s };
      for (const line of cart.lines) next[line.productId] = (next[line.productId] ?? 0) - line.qty;
      return next;
    });

    const seq = orderSeqState.update((n) => n + 1) - 1;
    const a = input.address;
    const order: Order = {
      id: `ord-${seq}`,
      number: `KO-${seq}`,
      createdAt: clock.iso(),
      status: 'processing',
      items: cart.lines.map((l) => ({
        productId: l.productId,
        name: l.name,
        priceCents: l.priceCents,
        qty: l.qty,
        variant: l.variant,
      })),
      totals: cart.totals,
      email: input.email.trim(),
      shippingAddress: {
        id: `addr-order-${seq}`,
        name: a.name ?? '',
        line1: a.line1 ?? '',
        line2: a.line2,
        city: a.city ?? '',
        region: a.region ?? '',
        postalCode: a.postalCode ?? '',
        country: a.country ?? '',
        phone: a.phone,
      },
    };

    const scope = currentScope();
    ordersState.update((o) => ({ ...o, [scope]: [order, ...(o[scope] ?? [])] }));
    cartState.set({ lines: [], couponCode: null });
    emit();
    return order;
  },

  me(): PublicUser | null {
    const profile = currentProfile();
    return profile ? toPublicUser(profile) : null;
  },
  login(email: string, password: string): PublicUser {
    const profile = allProfiles().find(
      (p) => p.email.toLowerCase() === email.trim().toLowerCase() && p.password === password,
    );
    if (!profile) throw new DomainError(401, 'That email and password don’t match an account.');
    if (profile.behaviors?.locked) {
      throw new DomainError(403, 'This account has been suspended. Please contact support.');
    }
    sessionState.set({ userId: profile.id });
    reauthState.set({ reauthed: false });
    sessionSeqState.set(0);
    emit();
    return toPublicUser(profile);
  },
  logout(): void {
    sessionState.set({ userId: null });
    reauthState.set({ reauthed: false });
    sessionSeqState.set(0);
    emit();
  },

  signup(input: SignupInput): PublicUser {
    const fieldErrors: Record<string, string> = {};
    const name = input.name.trim();
    const email = input.email.trim();
    if (!name) fieldErrors.name = 'Name is required.';
    if (!EMAIL_RE.test(email)) fieldErrors.email = 'Enter a valid email address.';
    else if (allProfiles().some((p) => p.email.toLowerCase() === email.toLowerCase())) {
      fieldErrors.email = 'That email is already registered. Try signing in instead.';
    }
    if (input.password.length < 8) fieldErrors.password = 'Use at least 8 characters.';
    if (Object.keys(fieldErrors).length) {
      throw new DomainError(422, 'Please fix the highlighted fields.', fieldErrors);
    }
    const profile: Profile = {
      id: `prof-custom-${customAccountsState.get().length + 1}`,
      email,
      password: input.password,
      displayName: name,
      behaviors: { role: 'member' },
    };
    customAccountsState.update((list) => [...list, profile]);
    sessionState.set({ userId: profile.id });
    reauthState.set({ reauthed: false });
    sessionSeqState.set(0);
    emit();
    return toPublicUser(profile);
  },

  requestPasswordReset(email: string): void {
    if (!EMAIL_RE.test(email.trim())) {
      throw new DomainError(422, 'Please fix the highlighted fields.', {
        email: 'Enter a valid email address.',
      });
    }
  },

  subscribeNewsletter(email: string): void {
    if (!EMAIL_RE.test(email.trim())) {
      throw new DomainError(422, 'Enter a valid email address.', {
        email: 'Enter a valid email address.',
      });
    }
  },

  tickSession(): boolean {
    const limit = behaviors().sessionExpiresAfter;
    if (!limit) return false;
    const seq = sessionSeqState.update((n) => n + 1);
    if (seq <= limit) return false;
    sessionState.set({ userId: null });
    reauthState.set({ reauthed: false });
    sessionSeqState.set(0);
    emit();
    return true;
  },

  listOrders(query: { page?: number; pageSize?: number } = {}): OrderPage {
    const list = ordersState.get()[currentScope()] ?? [];
    const { slice, total, page, pageSize, pageCount } = paginate(
      list,
      query.page ?? 1,
      query.pageSize ?? ORDERS_PAGE_SIZE,
    );
    return { items: slice, total, page, pageSize, pageCount };
  },
  getOrder(idOrNumber: string): Order {
    const key = idOrNumber.trim();
    const list = ordersState.get()[currentScope()] ?? [];
    const order = list.find((o) => o.id === key || o.number === key);
    if (!order) throw new DomainError(404, 'Order not found');
    return order;
  },
  listAddresses(): Address[] {
    return addressesState.get()[currentScope()] ?? [];
  },
  addAddress(input: Partial<Address>): Address[] {
    if (!currentProfile()) throw new DomainError(401, 'Please sign in.');
    const errors = validateAddress(input);
    if (Object.keys(errors).length) {
      throw new DomainError(422, 'Please fix the highlighted fields.', errors);
    }
    const scope = currentScope();
    const seq = addressSeqState.update((n) => n + 1);
    const address = toAddress(`addr-${scope}-u${seq}`, input);
    addressesState.update((all) => ({ ...all, [scope]: [...(all[scope] ?? []), address] }));
    emit();
    return addressesState.get()[scope] ?? [];
  },
  updateAddress(id: string, input: Partial<Address>): Address[] {
    if (!currentProfile()) throw new DomainError(401, 'Please sign in.');
    const scope = currentScope();
    const list = addressesState.get()[scope] ?? [];
    if (!list.some((a) => a.id === id)) throw new DomainError(404, 'Address not found');
    const errors = validateAddress(input);
    if (Object.keys(errors).length) {
      throw new DomainError(422, 'Please fix the highlighted fields.', errors);
    }
    addressesState.update((all) => ({
      ...all,
      [scope]: (all[scope] ?? []).map((a) => (a.id === id ? toAddress(id, input) : a)),
    }));
    emit();
    return addressesState.get()[scope] ?? [];
  },
  removeAddress(id: string): Address[] {
    if (!currentProfile()) throw new DomainError(401, 'Please sign in.');
    const scope = currentScope();
    const list = addressesState.get()[scope] ?? [];
    if (!list.some((a) => a.id === id)) throw new DomainError(404, 'Address not found');
    addressesState.update((all) => ({
      ...all,
      [scope]: (all[scope] ?? []).filter((a) => a.id !== id),
    }));
    emit();
    return addressesState.get()[scope] ?? [];
  },

  listPaymentMethods(): PaymentMethod[] {
    if (!currentProfile()) throw new DomainError(401, 'Please sign in.');
    if (behaviors().stepUpReauth && !reauthState.get().reauthed) {
      throw new DomainError(
        401,
        'For your security, please re-enter your password to view payment methods.',
        undefined,
        'reauth_required',
      );
    }
    if ((currentProfile()?.seed?.orders ?? 0) === 0) return [];
    return [
      { id: 'pm-1', brand: 'Visa', last4: '4242', expMonth: 8, expYear: 2028 },
      { id: 'pm-2', brand: 'Mastercard', last4: '5454', expMonth: 3, expYear: 2027 },
    ];
  },
  reauth(password: string): void {
    const profile = currentProfile();
    if (!profile) throw new DomainError(401, 'Please sign in.');
    if (profile.password !== password) throw new DomainError(401, 'That password is incorrect.');
    reauthState.set({ reauthed: true });
    emit();
  },

  rollWriteFailure(): boolean {
    return rollWriteFailure();
  },

  submitContact(input: ContactInput): ContactReceipt {
    const fieldErrors: Record<string, string> = {};
    if (!input.name.trim()) fieldErrors.name = 'Name is required.';
    if (!EMAIL_RE.test(input.email.trim())) fieldErrors.email = 'Enter a valid email address.';
    if (!CONTACT_TOPICS.includes(input.topic)) fieldErrors.topic = 'Choose a topic.';
    if (input.message.trim().length < 10) {
      fieldErrors.message = 'Tell us a little more (at least 10 characters).';
    }
    if (input.topic === 'order') {
      const orderNumber = input.orderNumber?.trim() ?? '';
      if (!orderNumber) fieldErrors.orderNumber = 'Add your order number so we can look it up.';
      else if (!/^KO-\d+$/.test(orderNumber)) {
        fieldErrors.orderNumber = 'Order numbers look like KO-1234.';
      }
    }
    if (Object.keys(fieldErrors).length) {
      throw new DomainError(422, 'Please fix the highlighted fields.', fieldErrors);
    }
    const seq = contactSeqState.update((n) => n + 1);
    return { reference: `KS-${seq}`, attachmentName: input.attachmentName };
  },

  adminSummary(): AdminSummary {
    requireAdmin();
    const items = allLive();
    return {
      totalProducts: items.length,
      outOfStock: items.filter((p) => p.stock === 0).length,
      lowStock: items.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK).length,
      onSale: items.filter((p) => p.compareAtCents !== undefined).length,
      inventoryUnits: items.reduce((sum, p) => sum + p.stock, 0),
    };
  },
  adminListOrders(query: AdminOrderQuery = {}): AdminOrderPage {
    requireAdmin();
    const profiles = allProfiles();
    const customer = (scope: string): string =>
      scope === GUEST ? 'Guest' : (profiles.find((p) => p.id === scope)?.displayName ?? 'Guest');
    const rows: AdminOrderRow[] = [];
    for (const [scope, list] of Object.entries(ordersState.get())) {
      for (const order of list) rows.push({ ...order, customer: customer(scope) });
    }

    let items = rows;
    if (query.status && query.status !== 'all') {
      items = items.filter((o) => o.status === query.status);
    }
    const search = query.search?.trim().toLowerCase();
    if (search) {
      items = items.filter(
        (o) =>
          o.number.toLowerCase().includes(search) ||
          o.customer.toLowerCase().includes(search) ||
          o.email.toLowerCase().includes(search),
      );
    }

    const sorted = [...items];
    switch (query.sort) {
      case 'date-asc':
        sorted.sort(
          (a, b) => a.createdAt.localeCompare(b.createdAt) || a.number.localeCompare(b.number),
        );
        break;
      case 'total-asc':
        sorted.sort((a, b) => a.totals.totalCents - b.totals.totalCents);
        break;
      case 'total-desc':
        sorted.sort((a, b) => b.totals.totalCents - a.totals.totalCents);
        break;
      default:
        sorted.sort(
          (a, b) => b.createdAt.localeCompare(a.createdAt) || b.number.localeCompare(a.number),
        );
        break;
    }
    const { slice, total, page, pageSize, pageCount } = paginate(
      sorted,
      query.page ?? 1,
      ADMIN_PAGE_SIZE,
    );
    return { items: slice, total, page, pageSize, pageCount };
  },
  adminListProducts(query: AdminProductQuery = {}): ProductPage {
    requireAdmin();
    let items = allLive();
    const search = query.search?.trim().toLowerCase();
    if (search) {
      items = items.filter(
        (p) => p.name.toLowerCase().includes(search) || p.category.includes(search),
      );
    }
    if (query.stockStatus === 'out') items = items.filter((p) => p.stock === 0);
    else if (query.stockStatus === 'low')
      items = items.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK);
    else if (query.stockStatus === 'in') items = items.filter((p) => p.stock > LOW_STOCK);

    const sorted = [...items];
    switch (query.sort) {
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'price-asc':
        sorted.sort((a, b) => a.priceCents - b.priceCents);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.priceCents - a.priceCents);
        break;
      case 'stock-asc':
        sorted.sort((a, b) => a.stock - b.stock);
        break;
      case 'stock-desc':
        sorted.sort((a, b) => b.stock - a.stock);
        break;
      default:
        break;
    }
    const { slice, total, page, pageSize, pageCount } = paginate(
      sorted,
      query.page ?? 1,
      query.pageSize ?? ADMIN_PAGE_SIZE,
    );
    return { items: slice, total, page, pageSize, pageCount };
  },
  adminGetProduct(id: string): ProductListItem {
    requireAdmin();
    const product = liveById(id);
    if (!product) throw new DomainError(404, 'Product not found');
    return product;
  },
  adminUpdateProduct(id: string, patch: ProductPatch): ProductListItem {
    requireAdmin();
    const base = baseProductById(id);
    if (!base) throw new DomainError(404, 'Product not found');

    const current = mergeProduct(base);
    const fieldErrors: Record<string, string> = {};
    if (patch.name !== undefined && !patch.name.trim()) fieldErrors.name = 'Name is required.';
    if (patch.priceCents !== undefined && !(patch.priceCents > 0)) {
      fieldErrors.priceCents = 'Price must be greater than zero.';
    }
    if (patch.stock !== undefined && (!Number.isInteger(patch.stock) || patch.stock < 0)) {
      fieldErrors.stock = 'Stock must be a whole number of zero or more.';
    }
    const nextPrice = patch.priceCents ?? current.priceCents;
    if (patch.compareAtCents != null && patch.compareAtCents <= nextPrice) {
      fieldErrors.compareAtCents = 'Compare-at price must exceed the price.';
    }
    if (Object.keys(fieldErrors).length) {
      throw new DomainError(422, 'Please fix the highlighted fields.', fieldErrors);
    }

    overridesState.update((all) => {
      const next: ProductOverride = { ...(all[id] ?? {}) };
      if (patch.name !== undefined) next.name = patch.name.trim();
      if (patch.priceCents !== undefined) next.priceCents = patch.priceCents;
      if ('compareAtCents' in patch) next.compareAtCents = patch.compareAtCents ?? null;
      if ('badge' in patch) next.badge = patch.badge ?? null;
      return { ...all, [id]: next };
    });
    const nextStock = patch.stock;
    if (nextStock !== undefined) {
      stockState.update((s) => ({ ...s, [id]: nextStock }));
    }
    emit();
    return mergeProduct(base);
  },
  adminCreateProduct(input: ProductInput): ProductListItem {
    requireAdmin();
    const fieldErrors: Record<string, string> = {};
    if (!input.name?.trim()) fieldErrors.name = 'Name is required.';
    if (!config.seed.categories.some((c) => c.slug === input.category)) {
      fieldErrors.category = 'Choose a category.';
    }
    if (!input.blurb?.trim()) fieldErrors.blurb = 'A short blurb is required.';
    if (!input.description?.trim()) fieldErrors.description = 'A description is required.';
    if (!(input.priceCents > 0)) fieldErrors.priceCents = 'Price must be greater than zero.';
    if (input.compareAtCents != null && input.compareAtCents <= input.priceCents) {
      fieldErrors.compareAtCents = 'Compare-at price must exceed the price.';
    }
    if (!Number.isInteger(input.stock) || input.stock < 0) {
      fieldErrors.stock = 'Stock must be a whole number of zero or more.';
    }
    if (Object.keys(fieldErrors).length) {
      throw new DomainError(422, 'Please fix the highlighted fields.', fieldErrors);
    }

    const baseSlug = slugify(input.name) || 'product';
    const taken = new Set(allBaseProducts().map((p) => p.slug));
    let slug = baseSlug;
    let suffix = 2;
    while (taken.has(slug)) slug = `${baseSlug}-${suffix++}`;
    const id = `p-custom-${slug}`;

    const product: Product = {
      id,
      slug,
      name: input.name.trim(),
      category: input.category,
      priceCents: input.priceCents,
      compareAtCents: input.compareAtCents,
      stock: input.stock,
      rating: 0,
      blurb: input.blurb.trim(),
      description: input.description.trim(),
      badge: input.badge,
      variants: input.variants,
    };
    customProductsState.update((list) => [...list, product]);
    stockState.update((s) => ({ ...s, [id]: input.stock }));
    emit();
    return mergeProduct(product);
  },
  adminDeleteProduct(id: string): void {
    requireAdmin();
    if (!customProducts().some((p) => p.id === id)) {
      throw new DomainError(400, 'Only products you created can be deleted.');
    }
    customProductsState.update((list) => list.filter((p) => p.id !== id));
    overridesState.update((all) => {
      const next = { ...all };
      delete next[id];
      return next;
    });
    stockState.update((s) => {
      const next = { ...s };
      delete next[id];
      return next;
    });
    emit();
  },
  adminBulkUpdate(ids: string[], action: BulkAction): BulkResult {
    requireAdmin();
    const results: BulkResultRow[] = [];
    for (const id of ids) {
      const base = baseProductById(id);
      if (!base) {
        results.push({ id, name: id, ok: false, error: 'Product not found' });
        continue;
      }
      const live = mergeProduct(base);
      if (action === 'restock') {
        stockState.update((s) => ({ ...s, [id]: 50 }));
        results.push({ id, name: live.name, ok: true });
      } else {
        if (live.compareAtCents !== undefined) {
          results.push({ id, name: live.name, ok: false, error: 'Already on sale' });
          continue;
        }
        overridesState.update((all) => ({
          ...all,
          [id]: {
            ...(all[id] ?? {}),
            priceCents: Math.round(live.priceCents * 0.9),
            compareAtCents: live.priceCents,
            badge: 'sale',
          },
        }));
        results.push({ id, name: live.name, ok: true });
      }
    }
    emit();
    const updated = results.filter((r) => r.ok).length;
    return { action, results, updated, skipped: results.length - updated };
  },
  adminSetPublished(id: string, published: boolean): ProductListItem {
    requireAdmin();
    const base = baseProductById(id);
    if (!base) throw new DomainError(404, 'Product not found');
    if (published && (stockState.get()[id] ?? 0) <= 0) {
      throw new DomainError(409, 'You can’t publish an out-of-stock product. Restock it first.');
    }
    overridesState.update((all) => ({ ...all, [id]: { ...(all[id] ?? {}), published } }));
    emit();
    return mergeProduct(base);
  },
  adminListNotes(id: string): Note[] {
    requireAdmin();
    return notesState.get()[id] ?? [];
  },
  adminAddNote(id: string, body: string): Note[] {
    requireAdmin();
    if (!baseProductById(id)) throw new DomainError(404, 'Product not found');
    if (!body.trim())
      throw new DomainError(422, 'Please write a note first.', { body: 'Required.' });
    notesState.update((all) => {
      const existing = all[id] ?? [];
      const note: Note = {
        id: `note-${id}-${existing.length + 1}`,
        body: body.trim(),
        createdAt: clock.iso(),
      };
      return { ...all, [id]: [note, ...existing] };
    });
    emit();
    return notesState.get()[id] ?? [];
  },

  reset(): void {
    storage.clear();
    emit();
  },
};

export function resetDomain(): void {
  domain.reset();
}
