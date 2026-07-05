import { cn } from '@autotests-simulator/ui';

// The destructive form/error banner shared by every form and list surface.
export function FormError({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
