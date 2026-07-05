import type { Coupon } from '@autotests-simulator/config';
import type { Totals } from './types';

export function computeTotals(input: {
  lines: ReadonlyArray<{ priceCents: number; qty: number }>;
  coupon?: Coupon | undefined;
  shipping: { freeThresholdCents: number; flatCents: number };
  taxRate: number;
}): Totals {
  const subtotalCents = input.lines.reduce((sum, l) => sum + l.priceCents * l.qty, 0);
  const empty = subtotalCents === 0;

  let discountCents = 0;
  let couponCode: string | undefined;
  const coupon = input.coupon;
  if (coupon && !empty && subtotalCents >= (coupon.minSubtotalCents ?? 0)) {
    if (coupon.percentOff != null) {
      discountCents = Math.round((subtotalCents * coupon.percentOff) / 100);
    } else if (coupon.amountOffCents != null) {
      discountCents = Math.min(coupon.amountOffCents, subtotalCents);
    }
    if (discountCents > 0) couponCode = coupon.code;
  }

  const taxableCents = subtotalCents - discountCents;
  const freeShippingApplied = !empty && subtotalCents >= input.shipping.freeThresholdCents;
  const shippingCents = empty ? 0 : freeShippingApplied ? 0 : input.shipping.flatCents;
  const taxCents = Math.round(taxableCents * input.taxRate);
  const totalCents = taxableCents + shippingCents + taxCents;

  return {
    subtotalCents,
    discountCents,
    shippingCents,
    taxCents,
    totalCents,
    couponCode,
    freeShippingApplied,
  };
}
