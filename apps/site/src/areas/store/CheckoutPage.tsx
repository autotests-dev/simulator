import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
  Spinner,
} from '@autotests-simulator/ui';
import type { Address, Order } from '@autotests-simulator/domain';
import { api, ApiError } from '../../lib/api';
import { useApi, useFormat } from '../../lib/hooks';
import { useCart } from '../../app/CartContext';
import { useSession } from '../../app/SessionContext';
import { OrderTotals } from '../../components/OrderTotals';
import { StateMessage } from '../../components/StateMessage';
import { FormError } from '../../components/FormError';
import { COUNTRIES } from '../../lib/countries';

type FormState = {
  email: string;
  name: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

const EMPTY: FormState = {
  email: '',
  name: '',
  line1: '',
  line2: '',
  city: '',
  region: '',
  postalCode: '',
  country: 'US',
};

export function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, loading } = useCart();
  const { user } = useSession();
  const { money } = useFormat();
  const { data: addresses } = useApi<Address[]>(user ? '/api/addresses' : null);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const touched = useRef(false);
  const prefilled = useRef(false);

  useEffect(() => {
    if (user?.email) setForm((f) => ({ ...f, email: f.email || user.email }));
  }, [user]);

  useEffect(() => {
    const a = addresses?.[0];
    if (!a || prefilled.current || touched.current) return;
    prefilled.current = true;
    setForm((f) => ({
      ...f,
      name: a.name,
      line1: a.line1,
      line2: a.line2 ?? '',
      city: a.city,
      region: a.region,
      postalCode: a.postalCode,
      country: a.country || f.country,
    }));
  }, [addresses]);

  const set = (key: keyof FormState) => (value: string) => {
    touched.current = true;
    setForm((f) => ({ ...f, [key]: value }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError(undefined);
    try {
      const order = await api.post<Order>('/api/checkout', {
        email: form.email,
        address: {
          name: form.name,
          line1: form.line1,
          line2: form.line2 || undefined,
          city: form.city,
          region: form.region,
          postalCode: form.postalCode,
          country: form.country,
        },
      });
      navigate(`/store/order/${order.number}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors ?? {});
        setFormError(err.message);
      } else {
        setFormError('Something went wrong placing your order.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !cart) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold tracking-tight">Checkout</h1>
        <div className="grid gap-8 lg:grid-cols-3" role="status" aria-label="Loading checkout">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-80 w-full rounded-2xl lg:col-span-1" />
        </div>
      </div>
    );
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <StateMessage
          testId="checkout-empty"
          title="There’s nothing to check out"
          description="Add something to your cart first."
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
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Checkout</h1>
      <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {formError ? <FormError>{formError}</FormError> : null}

          <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold">Contact</h2>
            <Field label="Email" htmlFor="email" required error={errors.email}>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set('email')(e.target.value)}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? 'email-error' : undefined}
                autoComplete="email"
                placeholder="you@example.com"
              />
            </Field>
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold">Shipping address</h2>
            <Field label="Full name" htmlFor="name" required error={errors.name}>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set('name')(e.target.value)}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? 'name-error' : undefined}
                autoComplete="name"
              />
            </Field>
            <Field label="Street address" htmlFor="line1" required error={errors.line1}>
              <Input
                id="line1"
                value={form.line1}
                onChange={(e) => set('line1')(e.target.value)}
                aria-invalid={errors.line1 ? true : undefined}
                aria-describedby={errors.line1 ? 'line1-error' : undefined}
                autoComplete="address-line1"
              />
            </Field>
            <Field label="Apartment, suite, etc." htmlFor="line2">
              <Input
                id="line2"
                value={form.line2}
                onChange={(e) => set('line2')(e.target.value)}
                autoComplete="address-line2"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City" htmlFor="city" required error={errors.city}>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => set('city')(e.target.value)}
                  aria-invalid={errors.city ? true : undefined}
                  aria-describedby={errors.city ? 'city-error' : undefined}
                  autoComplete="address-level2"
                />
              </Field>
              <Field label="State / region" htmlFor="region" required error={errors.region}>
                <Input
                  id="region"
                  value={form.region}
                  onChange={(e) => set('region')(e.target.value)}
                  aria-invalid={errors.region ? true : undefined}
                  aria-describedby={errors.region ? 'region-error' : undefined}
                  autoComplete="address-level1"
                />
              </Field>
              <Field label="Postal code" htmlFor="postalCode" required error={errors.postalCode}>
                <Input
                  id="postalCode"
                  value={form.postalCode}
                  onChange={(e) => set('postalCode')(e.target.value)}
                  aria-invalid={errors.postalCode ? true : undefined}
                  aria-describedby={errors.postalCode ? 'postalCode-error' : undefined}
                  autoComplete="postal-code"
                />
              </Field>
              <Field label="Country" htmlFor="country" required error={errors.country}>
                <Select value={form.country} onValueChange={set('country')}>
                  <SelectTrigger id="country" aria-label="Country">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </section>
        </div>

        <aside className="lg:col-span-1">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold">Order summary</h2>
            <ul className="flex flex-col gap-3">
              {cart.lines.map((line) => (
                <li key={line.id} className="flex justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">
                    {line.name} × {line.qty}
                  </span>
                  <span className="tabular-nums">{money(line.lineTotalCents)}</span>
                </li>
              ))}
            </ul>
            <Separator />
            <OrderTotals totals={totals} idPrefix="checkout" />
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? <Spinner /> : null}
              {submitting ? 'Placing order…' : 'Place order'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Secure checkout. Your details are kept private and never shared.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
