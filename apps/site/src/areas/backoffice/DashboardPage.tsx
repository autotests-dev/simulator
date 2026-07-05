import { Link } from 'react-router-dom';
import { AlertTriangle, Boxes, PackageX, Plus, Tag } from 'lucide-react';
import { Button } from '@autotests-simulator/ui';
import type { AdminSummary } from '@autotests-simulator/domain';
import { useApi } from '../../lib/hooks';

export function DashboardPage() {
  const { data, loading, error, reload } = useApi<AdminSummary>('/api/admin/summary', {
    keepData: true,
  });

  const stats = [
    {
      key: 'total',
      testId: 'stat-total',
      label: 'Products',
      value: data?.totalProducts,
      icon: Boxes,
    },
    {
      key: 'out',
      testId: 'stat-out',
      label: 'Out of stock',
      value: data?.outOfStock,
      icon: PackageX,
    },
    {
      key: 'low',
      testId: 'stat-low',
      label: 'Low stock',
      value: data?.lowStock,
      icon: AlertTriangle,
    },
    { key: 'sale', testId: 'stat-onsale', label: 'On sale', value: data?.onSale, icon: Tag },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">An overview of your catalog.</p>
        </div>
        <Button asChild>
          <Link to="/backoffice/products/new">
            <Plus className="size-4" /> Add product
          </Link>
        </Button>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          <span>We couldn’t load the overview.</span>
          <Button variant="outline" size="sm" onClick={reload}>
            Try again
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.key}
            className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
              <stat.icon className="size-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <span className="text-3xl font-bold tabular-nums" data-testid={stat.testId}>
              {loading && data === undefined ? '—' : stat.value}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-1 text-lg font-bold">Inventory</h2>
        <p className="text-sm text-muted-foreground">
          {data ? `${data.inventoryUnits} units across ${data.totalProducts} products.` : ' '}
        </p>
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link to="/backoffice/products">Manage products</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
