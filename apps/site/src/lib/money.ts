export function centsToInput(cents?: number): string {
  return cents === undefined ? '' : (cents / 100).toFixed(2);
}

export function inputToCents(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const n = Number.parseFloat(trimmed);
  return Number.isFinite(n) ? Math.round(n * 100) : undefined;
}
