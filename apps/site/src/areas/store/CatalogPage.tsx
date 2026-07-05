import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@autotests-simulator/ui';
import type { ProductPage } from '@autotests-simulator/domain';
import type { Category } from '@autotests-simulator/config';
import { useApi, useDebouncedValue } from '../../lib/hooks';
import { ProductCard } from '../../components/ProductCard';
import { ProductGridSkeleton } from '../../components/ProductGridSkeleton';
import { Pagination } from '../../components/Pagination';
import { StateMessage } from '../../components/StateMessage';

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
];

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? undefined;
  const search = params.get('q') ?? '';
  const sort = params.get('sort') ?? 'featured';
  const page = Number(params.get('page') ?? '1') || 1;

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const typedRef = useRef(false);

  const patchParams = useCallback(
    (next: Record<string, string | undefined>, resetPage = false) => {
      setParams((prev) => {
        const p = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(next)) {
          if (value === undefined || value === '') p.delete(key);
          else p.set(key, value);
        }
        if (resetPage) p.delete('page');
        return p;
      });
    },
    [setParams],
  );

  useEffect(() => {
    typedRef.current = false;
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    if (typedRef.current && debouncedSearch === searchInput && debouncedSearch !== search) {
      patchParams({ q: debouncedSearch || undefined }, true);
    }
  }, [debouncedSearch, searchInput, search, patchParams]);

  const query = new URLSearchParams();
  if (category) query.set('category', category);
  if (search) query.set('search', search);
  if (sort && sort !== 'featured') query.set('sort', sort);
  if (page > 1) query.set('page', String(page));

  const { data, loading, error, reload } = useApi<ProductPage>(
    `/api/products?${query.toString()}`,
    { keepData: true },
  );
  const { data: categories } = useApi<Category[]>('/api/categories');

  const activeCategory = categories?.find((c) => c.slug === category);
  const heading = activeCategory?.name ?? 'Shop all';
  const chips: Array<{ label: string; slug: string | undefined }> = [
    { label: 'All', slug: undefined },
    ...(categories ?? []).map((c) => ({ label: c.name, slug: c.slug })),
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{heading}</h1>
            <p className="mt-1 text-sm text-muted-foreground" data-testid="result-count">
              {data ? `${data.total} ${data.total === 1 ? 'product' : 'products'}` : ' '}
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative sm:w-60">
              <Search
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={searchInput}
                onChange={(e) => {
                  typedRef.current = true;
                  setSearchInput(e.target.value);
                }}
                placeholder="Search the shop"
                aria-label="Search the shop"
                className="pl-9"
              />
            </div>
            <div className="sm:w-56">
              <Select value={sort} onValueChange={(value) => patchParams({ sort: value }, true)}>
                <SelectTrigger aria-label="Sort products">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORTS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2" aria-label="Filter by category">
          {chips.map((chip) => {
            const active = chip.slug === category;
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => patchParams({ category: chip.slug }, true)}
                aria-pressed={active}
                className={cn(
                  'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </nav>
      </div>

      {error ? (
        <StateMessage
          title="We couldn’t load the catalog"
          description={error}
          testId="catalog-error"
          action={
            <button
              type="button"
              onClick={reload}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Try again
            </button>
          }
        />
      ) : loading && !data ? (
        <ProductGridSkeleton count={8} />
      ) : data && data.items.length === 0 ? (
        <StateMessage
          title="Nothing here yet"
          description="No products match. Try a different search or category."
          testId="catalog-empty"
        />
      ) : (
        <>
          <div
            className={cn(
              'grid gap-5 transition-opacity sm:grid-cols-2 lg:grid-cols-4',
              loading && 'opacity-60',
            )}
            aria-busy={loading || undefined}
            data-testid="product-grid"
          >
            {data?.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="mt-10">
            <Pagination
              page={data?.page ?? 1}
              pageCount={data?.pageCount ?? 1}
              onPage={(p) => patchParams({ page: String(p) })}
            />
          </div>
        </>
      )}
    </div>
  );
}
