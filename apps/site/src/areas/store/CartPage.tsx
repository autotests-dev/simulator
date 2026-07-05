import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Tag, Trash2 } from 'lucide-react';
import { Button, Input, Separator, Skeleton, cn } from '@autotests-simulator/ui';
import { ApiError } from '../../lib/api';
import { useFormat } from '../../lib/hooks';
import { useCart } from '../../app/CartContext';
import { OrderTotals } from '../../components/OrderTotals';
import { ProductImage } from '../../components/ProductImage';
import { QuantityStepper } from '../../components/QuantityStepper';
import { StateMessage } from '../../components/StateMessage';
import { FormError } from '../../components/FormError';

export function CartPage() {
  const { cart, loading, updateLine, removeLine, applyCoupon, removeCoupon } = useCart();
  const { money } = useFormat();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | undefined>(undefined);
  const [cartError, setCartError] = useState<string | undefined>(undefined);
  const [mutating, setMutating] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setMutating(true);
    setCartError(undefined);
    try {
      await fn();
    } catch (err) {
      setCartError(err instanceof ApiError ? err.message : 'Could not update your cart.');
    } finally {
      setMutating(false);
    }
  }

  async function onApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponError(undefined);
    setMutating(true);
    try {
      await applyCoupon(couponInput.trim());
      setCouponInput('');
    } catch (err) {
      setCouponError(err instanceof ApiError ? err.message : 'Could not apply that code.');
    } finally {
      setMutating(false);
    }
  }

  if (loading && !cart) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold tracking-tight">Your cart</h1>
        <div className="grid gap-8 lg:grid-cols-3" role="status" aria-label="Loading your cart">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-80 w-full rounded-2xl lg:col-span-1" />
        </div>
      </div>
    );
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="mb-6 text-3xl font-bold tracking-tight">Your cart</h1>
        <StateMessage
          testId="cart-empty"
          title="Your cart is empty"
          description="Browse the shop and add a few good things."
          action={
            <Button asChild>
              <Link to="/store">Start shopping</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { totals } = cart;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Your cart</h1>
      {cartError ? (
        <FormError data-testid="cart-error" className="mb-4">
          {cartError}
        </FormError>
      ) : null}
      <div className="grid gap-8 lg:grid-cols-3">
        <ul className="flex flex-col gap-4 lg:col-span-2" data-testid="cart-lines">
          {cart.lines.map((line) => (
            <li
              key={line.id}
              data-testid="cart-line"
              data-line-id={line.id}
              className="flex gap-4 rounded-2xl border border-border bg-card p-4"
            >
              <ProductImage
                slug={line.slug}
                name={line.name}
                className="size-24 shrink-0 rounded-xl"
              />
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      to={`/store/p/${line.slug}`}
                      className="font-semibold leading-tight hover:text-primary"
                    >
                      {line.name}
                    </Link>
                    {line.variant ? (
                      <p className="text-sm text-muted-foreground">
                        {Object.entries(line.variant)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')}
                      </p>
                    ) : null}
                    <p className="mt-1 text-sm text-muted-foreground">
                      {money(line.priceCents)} each
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void run(() => removeLine(line.id))}
                    disabled={mutating}
                    aria-label={`Remove ${line.name}`}
                    className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <QuantityStepper
                    value={line.qty}
                    max={line.stock}
                    disabled={mutating}
                    onChange={(n) => void run(() => updateLine(line.id, n))}
                  />
                  <span className="font-semibold tabular-nums" data-testid="line-total">
                    {money(line.lineTotalCents)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="lg:col-span-1">
          <div
            className={cn(
              'flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 transition-opacity',
              mutating && 'opacity-60',
            )}
            data-testid="order-summary"
            aria-busy={mutating}
          >
            <h2 className="text-lg font-bold">Order summary</h2>

            <form onSubmit={onApplyCoupon} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Promo code"
                  aria-label="Promo code"
                  aria-invalid={couponError ? true : undefined}
                  autoComplete="off"
                />
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={mutating || !couponInput.trim()}
                >
                  Apply
                </Button>
              </div>
              {couponError ? (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {couponError}
                </p>
              ) : null}
              {cart.couponCode ? (
                <div className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Tag className="size-3.5" /> {cart.couponCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => void run(() => removeCoupon())}
                    disabled={mutating}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                </div>
              ) : null}
              {cart.couponNote ? (
                <p className="text-xs text-muted-foreground" data-testid="coupon-note">
                  {cart.couponNote}
                </p>
              ) : null}
            </form>

            <Separator />

            <OrderTotals totals={totals} idPrefix="cart" />

            <Button asChild size="lg" className="w-full">
              <Link to="/store/checkout">Checkout</Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
