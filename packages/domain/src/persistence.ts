import { ProductSchema, ProfileSchema } from '@autotests-simulator/config/schema';
import { z } from 'zod';
import type { Address, Note, Order, ProductOverride, Review, Totals } from './types';

const count = z.number().int().nonnegative();
const text = z.string();
const variant = z.record(text, text).optional();
const timestamp = z.string().datetime();
const badge = z.enum(['new', 'sale', 'bestseller']);

const address: z.ZodType<Address> = z.object({
  id: text,
  name: text,
  line1: text,
  line2: text.optional(),
  city: text,
  region: text,
  postalCode: text,
  country: text,
  phone: text.optional(),
});

const totals: z.ZodType<Totals> = z.object({
  subtotalCents: count,
  discountCents: count,
  shippingCents: count,
  taxCents: count,
  totalCents: count,
  couponCode: text.optional(),
  freeShippingApplied: z.boolean(),
});

const order: z.ZodType<Order> = z.object({
  id: text,
  number: text,
  createdAt: timestamp,
  status: z.enum(['processing', 'shipped', 'delivered']),
  items: z.array(
    z.object({ productId: text, name: text, priceCents: count, qty: count.positive(), variant }),
  ),
  totals,
  email: text,
  shippingAddress: address.optional(),
});

const override: z.ZodType<ProductOverride> = z.object({
  name: text.optional(),
  priceCents: count.optional(),
  compareAtCents: count.nullable().optional(),
  badge: badge.nullable().optional(),
  published: z.boolean().optional(),
});

const note: z.ZodType<Note> = z.object({ id: text, body: text, createdAt: timestamp });
const review: z.ZodType<Review> = z.object({
  id: text,
  author: text,
  rating: z.number().int().min(1).max(5),
  body: text,
  createdAt: timestamp,
});

// Each record is versioned independently. Keep version 1 while its shape is compatible;
// a future incompatible shape must get a new version and an explicit migration policy.
function versioned<T>(schema: z.ZodType<T>) {
  return { version: 1, schema };
}

export const persistedState = {
  stock: versioned(z.record(text, count)),
  cart: versioned(
    z.object({
      lines: z.array(z.object({ id: text, productId: text, variant, qty: count.positive() })),
      couponCode: text.nullable(),
    }),
  ),
  session: versioned(z.object({ userId: text.nullable() })),
  orders: versioned(z.record(text, z.array(order))),
  addresses: versioned(z.record(text, z.array(address))),
  sequence: versioned(count),
  overrides: versioned(z.record(text, override)),
  customProducts: versioned(z.array(ProductSchema)),
  notes: versioned(z.record(text, z.array(note))),
  reauth: versioned(z.object({ reauthed: z.boolean() })),
  // Match the signup form's email validation, including existing short TLDs.
  customAccounts: versioned(
    z.array(ProfileSchema.extend({ email: text.regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/) })),
  ),
  userReviews: versioned(z.record(text, z.array(review))),
};
