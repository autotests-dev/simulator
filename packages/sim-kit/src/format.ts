export function formatMoney(
  minorUnits: number,
  options?: { currency?: string; locale?: string; whole?: boolean },
): string {
  const currency = options?.currency ?? 'USD';
  const locale = options?.locale ?? 'en-US';
  const digits = options?.whole && minorUnits % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(minorUnits / 100);
}

export function formatDate(iso: string, options?: { locale?: string; timeZone?: string }): string {
  const locale = options?.locale ?? 'en-US';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone: options?.timeZone,
  }).format(new Date(iso));
}
