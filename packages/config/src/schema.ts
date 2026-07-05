import { z } from 'zod';

const slug = z
  .string()
  .min(1)
  .regex(/^[a-z0-9-]+$/, 'must be a lowercase kebab-case slug');

const localeTag = z
  .string()
  .min(2)
  .refine(
    (value) => {
      try {
        new Intl.NumberFormat(value);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'must be a valid BCP 47 locale tag (e.g. "en-US")' },
  );

const timeZoneId = z
  .string()
  .min(1)
  .refine(
    (value) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: value });
        return true;
      } catch {
        return false;
      }
    },
    { message: 'must be a valid IANA time zone (e.g. "UTC", "Europe/Berlin")' },
  );

const currencyCode = z
  .string()
  .length(3)
  .refine(
    (value) => {
      try {
        new Intl.NumberFormat('en-US', { style: 'currency', currency: value });
        return true;
      } catch {
        return false;
      }
    },
    { message: 'must be a valid ISO 4217 currency code (e.g. "USD")' },
  );

export const RoleSchema = z.enum(['guest', 'member', 'admin']);

export const BehaviorAssignmentsSchema = z
  .object({
    role: RoleSchema.optional(),
    locale: localeTag.optional(),
    slowNetwork: z.boolean().optional(),
    highErrorRate: z.number().min(0).max(1).optional(),
    locked: z.boolean().optional(),
    stepUpReauth: z.boolean().optional(),
    sessionExpiresAfter: z.number().int().positive().optional(),
  })
  .strict();

export const ProfileSchema = z
  .object({
    id: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(1),
    displayName: z.string().min(1),
    behaviors: BehaviorAssignmentsSchema.optional(),
    seed: z
      .object({
        orders: z.number().int().min(0).optional(),
        addresses: z.number().int().min(0).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const ProductVariantSchema = z
  .object({
    name: z.string().min(1),
    options: z.array(z.string().min(1)).min(1),
  })
  .strict();

export const ProductSchema = z
  .object({
    id: z.string().min(1),
    slug,
    name: z.string().min(1),
    category: slug,
    priceCents: z.number().int().nonnegative(),
    compareAtCents: z.number().int().positive().optional(),
    stock: z.number().int().min(0),
    rating: z.number().min(0).max(5),
    blurb: z.string().min(1),
    description: z.string().min(1),
    tags: z.array(z.string().min(1)).optional(),
    variants: z.array(ProductVariantSchema).optional(),
    badge: z.enum(['new', 'sale', 'bestseller']).optional(),
  })
  .strict()
  .refine((p) => p.compareAtCents === undefined || p.compareAtCents > p.priceCents, {
    message: 'compareAtCents must be greater than priceCents',
    path: ['compareAtCents'],
  });

export const CategorySchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    slug,
  })
  .strict();

export const CouponSchema = z
  .object({
    code: z.string().min(1).toUpperCase(),
    percentOff: z.number().positive().max(100).optional(),
    amountOffCents: z.number().int().positive().optional(),
    minSubtotalCents: z.number().int().nonnegative().optional(),
  })
  .strict()
  .refine((c) => c.percentOff !== undefined || c.amountOffCents !== undefined, {
    message: 'a coupon needs percentOff or amountOffCents',
  });

export const SeedDataSchema = z
  .object({
    categories: z.array(CategorySchema).min(1),
    products: z.array(ProductSchema).min(1),
    coupons: z.array(CouponSchema),
    shipping: z
      .object({
        freeThresholdCents: z.number().int().nonnegative(),
        flatCents: z.number().int().nonnegative(),
      })
      .strict(),
    taxRate: z.number().min(0).max(1),
  })
  .strict();

export const SimulatorConfigSchema = z
  .object({
    meta: z
      .object({
        product: z.string().min(1),
        brand: z.string().min(1),
        tagline: z.string().min(1),
      })
      .strict(),
    defaults: z
      .object({
        seed: z.number().int(),
        now: z.string().datetime(),
        locale: localeTag,
        currency: currencyCode,
        timeZone: timeZoneId,
      })
      .strict(),
    profiles: z.array(ProfileSchema),
    seed: SeedDataSchema,
  })
  .strict()
  .superRefine((cfg, ctx) => {
    const dupe = (label: string, values: string[]) => {
      const seen = new Set<string>();
      for (const v of values) {
        if (seen.has(v)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate ${label}: ${v}` });
        }
        seen.add(v);
      }
    };
    dupe(
      'product id',
      cfg.seed.products.map((p) => p.id),
    );
    dupe(
      'product slug',
      cfg.seed.products.map((p) => p.slug),
    );
    dupe(
      'category slug',
      cfg.seed.categories.map((c) => c.slug),
    );
    dupe(
      'coupon code',
      cfg.seed.coupons.map((c) => c.code),
    );
    dupe(
      'profile id',
      cfg.profiles.map((p) => p.id),
    );
    dupe(
      'profile email',
      cfg.profiles.map((p) => p.email.toLowerCase()),
    );

    const categorySlugs = new Set(cfg.seed.categories.map((c) => c.slug));
    for (const p of cfg.seed.products) {
      if (!categorySlugs.has(p.category)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `product "${p.slug}" references unknown category "${p.category}"`,
        });
      }
    }
  });

export type Role = z.infer<typeof RoleSchema>;
export type BehaviorAssignments = z.infer<typeof BehaviorAssignmentsSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type ProductVariant = z.infer<typeof ProductVariantSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Coupon = z.infer<typeof CouponSchema>;
export type SeedData = z.infer<typeof SeedDataSchema>;
export type SimulatorConfig = z.infer<typeof SimulatorConfigSchema>;
