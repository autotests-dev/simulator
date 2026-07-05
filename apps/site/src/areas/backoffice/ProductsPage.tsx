import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  cn,
} from '@autotests-simulator/ui';
import type {
  BulkAction,
  BulkResult,
  ProductListItem,
  ProductPage,
} from '@autotests-simulator/domain';
import { api, ApiError } from '../../lib/api';
import { useApi, useFormat, useTableQuery } from '../../lib/hooks';
import { Pagination } from '../../components/Pagination';
import { FormError } from '../../components/FormError';
import { SortHeader } from './SortHeader';

type SortCol = 'name' | 'price' | 'stock';

function statusBadge(p: ProductListItem) {
  if (p.stock === 0) return <Badge variant="muted">Out</Badge>;
  if (p.stock <= 5) return <Badge variant="new">Low</Badge>;
  return <Badge variant="secondary">In stock</Badge>;
}

export function ProductsPage() {
  const { money } = useFormat();
  const { params, search, sort, page, searchInput, onSearchInput, patchParams } = useTableQuery();
  const stockStatus = params.get('stock') ?? 'all';

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [publishError, setPublishError] = useState<string | undefined>(undefined);

  useEffect(() => {
    setSelected(new Set());
  }, [search, stockStatus, sort]);

  const apiParams = new URLSearchParams();
  if (search) apiParams.set('search', search);
  if (stockStatus !== 'all') apiParams.set('stockStatus', stockStatus);
  if (sort) apiParams.set('sort', sort);
  if (page > 1) apiParams.set('page', String(page));
  const { data, loading, reload } = useApi<ProductPage>(
    `/api/admin/products?${apiParams.toString()}`,
    { keepData: true },
  );

  const items = data?.items ?? [];
  const pageIds = items.map((p) => p.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  function toggleSort(col: SortCol) {
    const next = sort === `${col}-asc` ? `${col}-desc` : `${col}-asc`;
    patchParams({ sort: next, page: undefined });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(pageIds));
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const [bulkError, setBulkError] = useState<string | undefined>(undefined);

  async function runBulk(action: BulkAction) {
    setBulkBusy(true);
    setBulkResult(null);
    setBulkError(undefined);
    try {
      const res = await api.post<BulkResult>('/api/admin/products/bulk', {
        ids: [...selected],
        action,
      });
      setBulkResult(res);
      setSelected(new Set());
      reload();
    } catch (err) {
      setBulkError(err instanceof ApiError ? err.message : 'The bulk update failed.');
    } finally {
      setBulkBusy(false);
    }
  }

  async function togglePublished(p: ProductListItem) {
    const nextVal = !(optimistic[p.id] ?? p.published);
    setOptimistic((o) => ({ ...o, [p.id]: nextVal }));
    setPublishError(undefined);
    const clear = () =>
      setOptimistic((o) => {
        const n = { ...o };
        delete n[p.id];
        return n;
      });
    try {
      await api.patch(`/api/admin/products/${p.id}/published`, { published: nextVal });
      clear();
      reload();
    } catch (e) {
      clear();
      setPublishError(
        e instanceof ApiError ? `${p.name}: ${e.message}` : 'Could not update visibility.',
      );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground" data-testid="admin-result-count">
            {data ? `${data.total} products` : ' '}
          </p>
        </div>
        <Button asChild>
          <Link to="/backoffice/products/new">
            <Plus className="size-4" /> Add product
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={searchInput}
            onChange={(e) => onSearchInput(e.target.value)}
            placeholder="Search products"
            aria-label="Search products"
            className="pl-9"
          />
        </div>
        <div className="w-44">
          <Select
            value={stockStatus}
            onValueChange={(value) =>
              patchParams({ stock: value === 'all' ? undefined : value, page: undefined })
            }
          >
            <SelectTrigger aria-label="Filter by stock">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stock</SelectItem>
              <SelectItem value="in">In stock</SelectItem>
              <SelectItem value="low">Low stock</SelectItem>
              <SelectItem value="out">Out of stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {selected.size > 0 ? (
        <div
          className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2"
          data-testid="bulk-bar"
        >
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={bulkBusy}
              onClick={() => void runBulk('restock')}
            >
              Restock to 50
            </Button>
            <Button size="sm" disabled={bulkBusy} onClick={() => void runBulk('markOnSale')}>
              {bulkBusy ? <Spinner /> : null}
              Mark on sale
            </Button>
          </div>
        </div>
      ) : null}

      {bulkResult ? (
        <div
          role="status"
          data-testid="bulk-result"
          className="rounded-xl border border-border bg-card px-4 py-3 text-sm"
        >
          <p className="font-medium">
            {bulkResult.updated} updated
            {bulkResult.skipped > 0 ? `, ${bulkResult.skipped} skipped` : ''}.
          </p>
          {bulkResult.skipped > 0 ? (
            <ul className="mt-1 text-muted-foreground">
              {bulkResult.results
                .filter((r) => !r.ok)
                .map((r) => (
                  <li key={r.id}>
                    {r.name}: {r.error}
                  </li>
                ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {bulkError ? <FormError data-testid="bulk-error">{bulkError}</FormError> : null}

      {publishError ? <FormError data-testid="publish-error">{publishError}</FormError> : null}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table
          className={cn('w-full text-sm transition-opacity', loading && data && 'opacity-60')}
          aria-busy={loading || undefined}
          data-testid="admin-products-table"
        >
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  className="size-4 cursor-pointer accent-primary"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all on this page"
                />
              </th>
              <SortHeader col="name" label="Name" sort={sort} onToggle={toggleSort} />
              <th className="px-3 py-2 text-left font-semibold">Category</th>
              <SortHeader col="price" label="Price" sort={sort} onToggle={toggleSort} />
              <SortHeader col="stock" label="Stock" sort={sort} onToggle={toggleSort} />
              <th className="px-3 py-2 text-left font-semibold">Status</th>
              <th className="px-3 py-2 text-left font-semibold">Visibility</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {loading && data === undefined ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                  <Spinner className="mx-auto" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                  No products match these filters.
                </td>
              </tr>
            ) : (
              items.map((p) => {
                const isPublished = optimistic[p.id] ?? p.published;
                return (
                  <tr
                    key={p.id}
                    data-testid="admin-row"
                    data-product-id={p.id}
                    className="border-b border-border last:border-0 hover:bg-secondary/40"
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        className="size-4 cursor-pointer accent-primary"
                        checked={selected.has(p.id)}
                        onChange={() => toggleOne(p.id)}
                        aria-label={`Select ${p.name}`}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2 capitalize text-muted-foreground">{p.category}</td>
                    <td className="px-3 py-2 tabular-nums">{money(p.priceCents)}</td>
                    <td className="px-3 py-2 tabular-nums" data-testid="admin-stock">
                      {p.stock}
                    </td>
                    <td className="px-3 py-2">{statusBadge(p)}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => void togglePublished(p)}
                        aria-pressed={isPublished}
                        data-testid="publish-toggle"
                        className={cn(
                          'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                          isPublished ? 'bg-teal/15 text-teal' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {isPublished ? 'Published' : 'Hidden'}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/backoffice/products/${p.id}`}>Edit</Link>
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={data?.page ?? 1}
        pageCount={data?.pageCount ?? 1}
        onPage={(p) => patchParams({ page: p > 1 ? String(p) : undefined })}
      />
    </div>
  );
}
