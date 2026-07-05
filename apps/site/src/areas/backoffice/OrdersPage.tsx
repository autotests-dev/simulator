import { Search } from 'lucide-react';
import {
  Badge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  cn,
} from '@autotests-simulator/ui';
import type { AdminOrderPage } from '@autotests-simulator/domain';
import { useApi, useFormat, useTableQuery } from '../../lib/hooks';
import { STATUS_VARIANT } from '../../components/orderStatus';
import { Pagination } from '../../components/Pagination';
import { SortHeader } from './SortHeader';

type SortCol = 'date' | 'total';

export function OrdersPage() {
  const { money, date } = useFormat();
  const { params, search, sort, page, searchInput, onSearchInput, patchParams } = useTableQuery();
  const status = params.get('status') ?? 'all';

  const apiParams = new URLSearchParams();
  if (search) apiParams.set('search', search);
  if (status !== 'all') apiParams.set('status', status);
  if (sort) apiParams.set('sort', sort);
  if (page > 1) apiParams.set('page', String(page));
  const { data, loading } = useApi<AdminOrderPage>(`/api/admin/orders?${apiParams.toString()}`, {
    keepData: true,
  });

  const items = data?.items ?? [];

  function toggleSort(col: SortCol) {
    const next = sort === `${col}-desc` ? `${col}-asc` : `${col}-desc`;
    patchParams({ sort: next, page: undefined });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground" data-testid="orders-result-count">
          {data ? `${data.total} ${data.total === 1 ? 'order' : 'orders'}` : ' '}
        </p>
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
            placeholder="Search orders"
            aria-label="Search orders"
            className="pl-9"
          />
        </div>
        <div className="w-44">
          <Select
            value={status}
            onValueChange={(value) =>
              patchParams({ status: value === 'all' ? undefined : value, page: undefined })
            }
          >
            <SelectTrigger aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table
          className={cn('w-full text-sm transition-opacity', loading && data && 'opacity-60')}
          aria-busy={loading || undefined}
          data-testid="admin-orders-table"
        >
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Number</th>
              <th className="px-3 py-2 text-left font-semibold">Customer</th>
              <SortHeader col="date" label="Date" sort={sort} onToggle={toggleSort} />
              <th className="px-3 py-2 text-left font-semibold">Status</th>
              <SortHeader col="total" label="Total" sort={sort} onToggle={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {loading && data === undefined ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">
                  <Spinner className="mx-auto" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">
                  No orders match these filters.
                </td>
              </tr>
            ) : (
              items.map((order) => (
                <tr
                  key={order.id}
                  data-testid="admin-order-row"
                  className="border-b border-border last:border-0 hover:bg-secondary/40"
                >
                  <td className="px-3 py-2 font-medium">{order.number}</td>
                  <td className="px-3 py-2">{order.customer}</td>
                  <td className="px-3 py-2 text-muted-foreground">{date(order.createdAt)}</td>
                  <td className="px-3 py-2">
                    <Badge variant={STATUS_VARIANT[order.status]} className="capitalize">
                      {order.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 tabular-nums" data-testid="admin-order-total">
                    {money(order.totals.totalCents)}
                  </td>
                </tr>
              ))
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
