import { cn } from '@autotests-simulator/ui';
import { useFormat } from '../lib/hooks';

export function Price({
  priceCents,
  compareAtCents,
  className,
}: {
  priceCents: number;
  compareAtCents?: number;
  className?: string;
}) {
  const { money } = useFormat();
  return (
    <span className={cn('inline-flex items-baseline gap-2', className)}>
      <span className="font-bold text-foreground" data-testid="price">
        {money(priceCents)}
      </span>
      {compareAtCents ? (
        <span
          className="text-sm font-medium text-muted-foreground line-through"
          data-testid="compare-at-price"
        >
          {money(compareAtCents)}
        </span>
      ) : null}
    </span>
  );
}
