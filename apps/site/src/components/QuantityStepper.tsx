import { Minus, Plus } from 'lucide-react';

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  disabled,
  label = 'Quantity',
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  label?: string;
}) {
  const canDecrease = !disabled && value > min;
  const canIncrease = !disabled && (max === undefined || value < max);
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center rounded-full border border-input bg-card"
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={!canDecrease}
        aria-label="Decrease quantity"
        className="inline-flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
      >
        <Minus className="size-4" />
      </button>
      <span className="w-10 text-center text-sm font-semibold tabular-nums" data-testid="quantity">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={!canIncrease}
        aria-label="Increase quantity"
        className="inline-flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
