import { Separator } from '@autotests-simulator/ui';
import type { Totals } from '@autotests-simulator/domain';
import { useFormat } from '../lib/hooks';

export function OrderTotals({
  totals,
  totalLabel = 'Total',
  idPrefix,
}: {
  totals: Totals;
  totalLabel?: string;
  idPrefix?: string;
}) {
  const { money } = useFormat();
  const testId = (name: string) => (idPrefix ? `${idPrefix}-${name}` : undefined);
  return (
    <>
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="font-medium tabular-nums" data-testid={testId('subtotal')}>
            {money(totals.subtotalCents)}
          </dd>
        </div>
        {totals.discountCents > 0 ? (
          <div className="flex justify-between text-primary">
            <dt>Discount</dt>
            <dd className="font-medium tabular-nums" data-testid={testId('discount')}>
              −{money(totals.discountCents)}
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Shipping</dt>
          <dd className="font-medium tabular-nums" data-testid={testId('shipping')}>
            {totals.freeShippingApplied ? 'Free' : money(totals.shippingCents)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Tax</dt>
          <dd className="font-medium tabular-nums" data-testid={testId('tax')}>
            {money(totals.taxCents)}
          </dd>
        </div>
      </dl>
      <Separator />
      <div className="flex items-baseline justify-between">
        <span className="font-bold">{totalLabel}</span>
        <span className="text-xl font-bold tabular-nums" data-testid={testId('total')}>
          {money(totals.totalCents)}
        </span>
      </div>
    </>
  );
}
