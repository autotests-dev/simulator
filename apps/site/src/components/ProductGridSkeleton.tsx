import { Skeleton, cn } from '@autotests-simulator/ui';

// The placeholder grid shown while a product listing loads.
export function ProductGridSkeleton({
  count = 8,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn('grid gap-5 sm:grid-cols-2 lg:grid-cols-4', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading products"
    >
      {Array.from({ length: count }, (_unused, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}
