import type { ReactNode } from 'react';

export function StateMessage({
  title,
  description,
  action,
  testId,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? <p className="max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}
