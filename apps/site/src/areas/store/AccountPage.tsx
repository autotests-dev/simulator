import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Badge,
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
  cn,
} from '@autotests-simulator/ui';
import { COUNTRIES } from '../../lib/countries';
import type { Address, OrderPage, PaymentMethod } from '@autotests-simulator/domain';
import { api, ApiError } from '../../lib/api';
import { useApi, useFormat } from '../../lib/hooks';
import { useSession } from '../../app/SessionContext';
import { STATUS_VARIANT } from '../../components/orderStatus';
import { Pagination } from '../../components/Pagination';
import { StateMessage } from '../../components/StateMessage';

function PaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(undefined);
    try {
      const data = await api.get<PaymentMethod[]>('/api/account/payment-methods');
      setMethods(data);
      setNeedsReauth(false);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'reauth_required') {
        setNeedsReauth(true);
        setMethods(null);
      } else {
        setError('Could not load payment methods.');
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api.post('/api/auth/reauth', { password });
      setPassword('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold">Payment methods</h2>
      {needsReauth ? (
        <form
          onSubmit={verify}
          noValidate
          data-testid="reauth-form"
          className="flex max-w-sm flex-col gap-3 rounded-2xl border border-border bg-card p-5"
        >
          <p className="text-sm text-muted-foreground">
            For your security, please re-enter your password to view saved cards.
          </p>
          {error ? (
            <p role="alert" className="text-xs font-medium text-destructive">
              {error}
            </p>
          ) : null}
          <Field label="Password" htmlFor="reauth-password" required>
            <Input
              id="reauth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <Button type="submit" disabled={busy}>
            {busy ? <Spinner /> : null}
            Verify
          </Button>
        </form>
      ) : error ? (
        <div
          role="alert"
          data-testid="payment-methods-error"
          className="flex max-w-sm flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : methods ? (
        methods.length > 0 ? (
          <ul className="flex flex-col gap-2" data-testid="payment-methods">
            {methods.map((m) => (
              <li key={m.id} className="rounded-2xl border border-border bg-card px-4 py-3 text-sm">
                {m.brand} •••• {m.last4}
                <span className="text-muted-foreground">
                  {' '}
                  — expires {m.expMonth}/{m.expYear}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No saved cards yet.</p>
        )
      ) : (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}
    </section>
  );
}

export function AccountPage() {
  const navigate = useNavigate();
  const { user, loading: sessionLoading, logout } = useSession();
  const { money, date } = useFormat();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? '1') || 1;

  function setPage(next: number) {
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      if (next > 1) p.set('page', String(next));
      else p.delete('page');
      return p;
    });
  }

  const {
    data: orders,
    loading: ordersLoading,
    error: ordersError,
    reload: reloadOrders,
  } = useApi<OrderPage>(user ? `/api/orders?page=${page}` : null, { keepData: true });

  if (sessionLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8" role="status" aria-label="Loading your account">
        <Skeleton className="mb-8 h-9 w-64" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <StateMessage
          testId="account-signed-out"
          title="Sign in to view your account"
          description="Your orders and addresses live here once you’re signed in."
          action={
            <Button asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          }
        />
      </div>
    );
  }

  async function onLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hi, {user.displayName}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="outline" onClick={() => void onLogout()}>
          Sign out
        </Button>
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-bold">Order history</h2>
        {ordersError ? (
          <StateMessage
            testId="orders-error"
            title="We couldn’t load your orders"
            description={ordersError}
            action={
              <Button variant="outline" onClick={reloadOrders}>
                Try again
              </Button>
            }
          />
        ) : ordersLoading && !orders ? (
          <div className="flex flex-col gap-3" role="status" aria-label="Loading orders">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        ) : orders && orders.items.length > 0 ? (
          <div className="flex flex-col gap-4">
            <ul
              className={cn(
                'flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card transition-opacity',
                ordersLoading && 'opacity-60',
              )}
              aria-busy={ordersLoading || undefined}
              data-testid="order-list"
            >
              {orders.items.map((order) => (
                <li key={order.id} data-testid="order-row">
                  <Link
                    to={`/store/order/${order.number}`}
                    className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-secondary/50"
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold">{order.number}</span>
                      <span className="text-sm text-muted-foreground">
                        {date(order.createdAt)} · {order.items.length}{' '}
                        {order.items.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={STATUS_VARIANT[order.status]} className="capitalize">
                        {order.status}
                      </Badge>
                      <span className="font-semibold tabular-nums" data-testid="order-total">
                        {money(order.totals.totalCents)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination page={orders.page} pageCount={orders.pageCount} onPage={setPage} />
          </div>
        ) : (
          <StateMessage
            title="No orders yet"
            description="When you place an order it’ll show up here."
            action={
              <Button asChild>
                <Link to="/store">Start shopping</Link>
              </Button>
            }
          />
        )}
      </section>

      <Separator className="my-8" />

      <AddressBook />

      <Separator className="my-8" />

      <PaymentMethods />
    </div>
  );
}

type AddressFormState = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

const EMPTY_ADDRESS: AddressFormState = {
  name: '',
  line1: '',
  line2: '',
  city: '',
  region: '',
  postalCode: '',
  country: 'US',
};

function AddressForm({
  initial,
  busy,
  errors,
  onSave,
  onCancel,
}: {
  initial: AddressFormState;
  busy: boolean;
  errors: Record<string, string>;
  onSave: (form: AddressFormState) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<AddressFormState>(initial);
  const set = (key: keyof AddressFormState) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <form
      data-testid="address-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
      noValidate
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
    >
      <Field label="Full name" htmlFor="addr-name" required error={errors.name}>
        <Input
          id="addr-name"
          value={form.name}
          onChange={(e) => set('name')(e.target.value)}
          aria-invalid={errors.name ? true : undefined}
          autoComplete="name"
        />
      </Field>
      <Field label="Street address" htmlFor="addr-line1" required error={errors.line1}>
        <Input
          id="addr-line1"
          value={form.line1}
          onChange={(e) => set('line1')(e.target.value)}
          aria-invalid={errors.line1 ? true : undefined}
          autoComplete="address-line1"
        />
      </Field>
      <Field label="Apartment, suite, etc." htmlFor="addr-line2">
        <Input
          id="addr-line2"
          value={form.line2}
          onChange={(e) => set('line2')(e.target.value)}
          autoComplete="address-line2"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="City" htmlFor="addr-city" required error={errors.city}>
          <Input
            id="addr-city"
            value={form.city}
            onChange={(e) => set('city')(e.target.value)}
            aria-invalid={errors.city ? true : undefined}
            autoComplete="address-level2"
          />
        </Field>
        <Field label="State / region" htmlFor="addr-region" required error={errors.region}>
          <Input
            id="addr-region"
            value={form.region}
            onChange={(e) => set('region')(e.target.value)}
            aria-invalid={errors.region ? true : undefined}
            autoComplete="address-level1"
          />
        </Field>
        <Field label="Postal code" htmlFor="addr-postal" required error={errors.postalCode}>
          <Input
            id="addr-postal"
            value={form.postalCode}
            onChange={(e) => set('postalCode')(e.target.value)}
            aria-invalid={errors.postalCode ? true : undefined}
            autoComplete="postal-code"
          />
        </Field>
        <Field label="Country" htmlFor="addr-country" required error={errors.country}>
          <Select value={form.country} onValueChange={set('country')}>
            <SelectTrigger id="addr-country" aria-label="Country">
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
      <div className="mt-1 flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? <Spinner /> : null}
          Save address
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function AddressBook() {
  const { data, loading, error } = useApi<Address[]>('/api/addresses');
  const [list, setList] = useState<Address[] | null>(null);
  const addresses = list ?? data;
  const [mode, setMode] = useState<'idle' | 'add' | string>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  async function save(form: AddressFormState) {
    setBusy(true);
    setErrors({});
    setFormError(undefined);
    try {
      const next =
        mode === 'add'
          ? await api.post<Address[]>('/api/addresses', form)
          : await api.patch<Address[]>(`/api/addresses/${mode}`, form);
      setList(next);
      setMode('idle');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors ?? {});
        setFormError(err.message);
      } else {
        setFormError('Could not save the address.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setFormError(undefined);
    try {
      setList(await api.del<Address[]>(`/api/addresses/${id}`));
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not remove the address.');
    } finally {
      setBusy(false);
    }
  }

  function toForm(address: Address): AddressFormState {
    return {
      name: address.name,
      line1: address.line1,
      line2: address.line2 ?? '',
      city: address.city,
      region: address.region,
      postalCode: address.postalCode,
      country: address.country,
    };
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Saved addresses</h2>
        {mode === 'idle' ? (
          <Button
            variant="outline"
            size="sm"
            data-testid="add-address"
            onClick={() => setMode('add')}
          >
            Add address
          </Button>
        ) : null}
      </div>

      {formError ? (
        <p role="alert" className="mb-3 text-sm font-medium text-destructive">
          {formError}
        </p>
      ) : null}

      {loading && !addresses ? (
        <div className="grid gap-4 sm:grid-cols-2" role="status" aria-label="Loading addresses">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : error && !addresses ? (
        <p className="text-sm text-muted-foreground">We couldn’t load your addresses right now.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {mode === 'add' ? (
            <AddressForm
              initial={EMPTY_ADDRESS}
              busy={busy}
              errors={errors}
              onSave={(form) => void save(form)}
              onCancel={() => setMode('idle')}
            />
          ) : null}

          {(addresses ?? []).length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {(addresses ?? []).map((address) =>
                mode === address.id ? (
                  <li key={address.id} className="sm:col-span-2">
                    <AddressForm
                      initial={toForm(address)}
                      busy={busy}
                      errors={errors}
                      onSave={(form) => void save(form)}
                      onCancel={() => setMode('idle')}
                    />
                  </li>
                ) : (
                  <li
                    key={address.id}
                    data-testid="address-card"
                    className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 text-sm"
                  >
                    <div>
                      <p className="font-semibold">{address.name}</p>
                      <address className="not-italic text-muted-foreground">
                        {address.line1}
                        {address.line2 ? `, ${address.line2}` : ''}
                        <br />
                        {address.city}, {address.region} {address.postalCode}
                      </address>
                    </div>
                    <div className="mt-auto flex gap-3 text-xs">
                      <button
                        type="button"
                        aria-label={`Edit ${address.line1}`}
                        disabled={busy}
                        onClick={() => {
                          setErrors({});
                          setFormError(undefined);
                          setMode(address.id);
                        }}
                        className="font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${address.line1}`}
                        disabled={busy}
                        onClick={() => void remove(address.id)}
                        className="font-medium text-muted-foreground underline-offset-2 hover:text-destructive hover:underline disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ),
              )}
            </ul>
          ) : mode !== 'add' ? (
            <p className="text-sm text-muted-foreground">No saved addresses yet.</p>
          ) : null}
        </div>
      )}
    </section>
  );
}
