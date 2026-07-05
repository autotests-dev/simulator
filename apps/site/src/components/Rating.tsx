import { Star } from 'lucide-react';
import { cn } from '@autotests-simulator/ui';

export function Rating({ value, className }: { value: number; className?: string }) {
  return (
    <span
      role="img"
      className={cn('inline-flex items-center gap-1 text-sm', className)}
      aria-label={`Rated ${value.toFixed(1)} out of 5`}
    >
      <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" />
      <span className="font-medium">{value.toFixed(1)}</span>
    </span>
  );
}
