import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { config } from '@autotests-simulator/config';
import { formatDate, formatMoney } from '@autotests-simulator/sim-kit';
import { api, ApiError } from './api';
import { useSession } from '../app/SessionContext';

export type AsyncState<T> = {
  data: T | undefined;
  loading: boolean;
  error: string | undefined;
  reload: () => void;
};

export function useApi<T>(url: string | null, options?: { keepData?: boolean }): AsyncState<T> {
  const keepData = options?.keepData ?? false;
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(url !== null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!keepData) setData(undefined);
    setError(undefined);
    if (url === null) {
      setData(undefined);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    const controller = new AbortController();
    api
      .get<T>(url, controller.signal)
      .then((d) => {
        if (active) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!active || controller.signal.aborted) return;
        setError(e instanceof ApiError ? e.message : 'Something went wrong loading this page.');
        setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [url, tick, keepData]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}

type SubmitResult<T> = { ok: true; data: T } | { ok: false };

// The shared submit lifecycle: reset errors, run the request, map an ApiError's
// fieldErrors/message onto form state, and always clear the busy flag. `run` returns
// { ok, data } so a caller can navigate on success without a second try/catch.
export function useFormSubmit() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const run = useCallback(
    async <T>(
      action: () => Promise<T>,
      fallback = 'Something went wrong. Please try again.',
    ): Promise<SubmitResult<T>> => {
      setSubmitting(true);
      setErrors({});
      setFormError(undefined);
      try {
        return { ok: true, data: await action() };
      } catch (err) {
        if (err instanceof ApiError) {
          setErrors(err.fieldErrors ?? {});
          setFormError(err.message);
        } else {
          setFormError(fallback);
        }
        return { ok: false };
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  return { errors, formError, submitting, run, setErrors, setFormError };
}

// The URL-param plumbing shared by the back-office tables: a `q`/`sort`/`page` query,
// a debounced search input mirrored into the URL, and a `patchParams` merge helper. The
// page owns its own filter param (stock, status) and reads it off the returned `params`.
export function useTableQuery() {
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const sort = params.get('sort') ?? undefined;
  const page = Number(params.get('page') ?? '1') || 1;

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const typedRef = useRef(false);

  const patchParams = useCallback(
    (next: Record<string, string | undefined>) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(next)) {
            if (value === undefined || value === '') p.delete(key);
            else p.set(key, value);
          }
          return p;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  useEffect(() => {
    typedRef.current = false;
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    if (typedRef.current && debouncedSearch === searchInput && debouncedSearch !== search) {
      patchParams({ q: debouncedSearch || undefined, page: undefined });
    }
  }, [debouncedSearch, searchInput, search, patchParams]);

  const onSearchInput = useCallback((value: string) => {
    typedRef.current = true;
    setSearchInput(value);
  }, []);

  return { params, search, sort, page, searchInput, onSearchInput, patchParams };
}

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function useFormat() {
  const { user } = useSession();
  const locale = user?.locale ?? config.defaults.locale;
  return useMemo(
    () => ({
      locale,
      money: (cents: number) => formatMoney(cents, { locale, currency: config.defaults.currency }),
      moneyWhole: (cents: number) =>
        formatMoney(cents, { locale, currency: config.defaults.currency, whole: true }),
      date: (iso: string) => formatDate(iso, { locale, timeZone: config.defaults.timeZone }),
    }),
    [locale],
  );
}
