import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@autotests-simulator/ui';

export function SortHeader<C extends string>({
  col,
  label,
  sort,
  onToggle,
  className,
}: {
  col: C;
  label: string;
  sort: string | undefined;
  onToggle: (col: C) => void;
  className?: string;
}) {
  const direction =
    sort === `${col}-asc` ? 'ascending' : sort === `${col}-desc` ? 'descending' : undefined;
  return (
    <th aria-sort={direction} className={cn('px-3 py-2 text-left font-semibold', className)}>
      <button
        type="button"
        onClick={() => onToggle(col)}
        className="inline-flex items-center gap-1 hover:text-foreground"
        aria-label={`Sort by ${label}`}
      >
        {label}
        {direction === 'ascending' ? (
          <ArrowUp className="size-3.5" />
        ) : direction === 'descending' ? (
          <ArrowDown className="size-3.5" />
        ) : null}
      </button>
    </th>
  );
}
