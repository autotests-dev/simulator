import { Link, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Badge, Button, Separator, Skeleton } from '@autotests-simulator/ui';
import type { Order } from '@autotests-simulator/domain';
import { useApi, useFormat } from '../../lib/hooks';
import { OrderTotals } from '../../components/OrderTotals';
import { STATUS_VARIANT } from '../../components/orderStatus';
import { StateMessage } from '../../components/StateMessage';

export function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, loading, error } = useApi<Order>(id ? `/api/orders/${id}` : null);
  const { money, date } = useFormat();

  if (loading && !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12" role="status" aria-label="Loading your order">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="mt-10 h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <StateMessage
          testId="order-error"
          title="We couldn’t find that order"
          description={error ?? 'The order may belong to a different session.'}
          action={
            <Button asChild>
              <Link to="/store">Back to the shop</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <CheckCircle2 className="size-12 text-teal" aria-hidden="true" />
        <h1 className="text-3xl font-bold tracking-tight">Thanks for your order!</h1>
        <p className="text-muted-foreground">
          Order{' '}
          <span className="font-semibold text-foreground" data-testid="order-number">
            {order.number}
          </span>{' '}
          is confirmed. We’ve sent a receipt to {order.email}.
        </p>
        <Badge variant={STATUS_VARIANT[order.status]} className="capitalize">
          {order.status}
        </Badge>
      </div>

      <div className="mt-10 flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Order details</h2>
          <span className="text-sm text-muted-foreground">{date(order.createdAt)}</span>
        </div>
        <ul className="flex flex-col gap-3">
          {order.items.map((item, i) => (
            <li key={i} className="flex items-start justify-between gap-3 text-sm">
              <span>
                <span className="font-medium">{item.name}</span>
                {item.variant ? (
                  <span className="text-muted-foreground">
                    {' '}
                    ({Object.values(item.variant).join(', ')})
                  </span>
                ) : null}
                <span className="text-muted-foreground"> × {item.qty}</span>
              </span>
              <span className="tabular-nums">{money(item.priceCents * item.qty)}</span>
            </li>
          ))}
        </ul>
        <Separator />
        <OrderTotals totals={order.totals} totalLabel="Total paid" />

        {order.shippingAddress ? (
          <>
            <Separator />
            <div className="text-sm">
              <h3 className="mb-1 font-semibold">Shipping to</h3>
              <address className="not-italic text-muted-foreground">
                {order.shippingAddress.name}
                <br />
                {order.shippingAddress.line1}
                {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.region}{' '}
                {order.shippingAddress.postalCode}
              </address>
            </div>
          </>
        ) : null}
      </div>

      <div className="mt-6 flex justify-center">
        <Button asChild variant="outline">
          <Link to="/store">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}
