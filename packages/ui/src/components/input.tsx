import * as React from 'react';
import { cn } from '../lib/cn';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      'flex h-11 w-full rounded-xl border border-input bg-card px-4 py-2 text-sm shadow-sm transition-colors',
      'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/30',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';
