import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, RotateCcw, Truck } from 'lucide-react';
import { config } from '@autotests-simulator/config';
import { Button } from '@autotests-simulator/ui';
import type { ProductPage } from '@autotests-simulator/domain';
import { useApi, useFormat } from '../../lib/hooks';
import { ProductCard } from '../../components/ProductCard';
import { ProductGridSkeleton } from '../../components/ProductGridSkeleton';

function ConsentModal() {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem('kotes::consent') === null;
    } catch {
      return false;
    }
  });
  const declineRef = useRef<HTMLButtonElement>(null);
  const acceptRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) acceptRef.current?.focus();
  }, [open]);

  if (!open) return null;
  function dismiss(choice: string) {
    try {
      localStorage.setItem('kotes::consent', choice);
    } catch {}
    setOpen(false);
  }
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      dismiss('essential');
      return;
    }
    if (e.key !== 'Tab') return;
    e.preventDefault();
    (document.activeElement === acceptRef.current ? declineRef : acceptRef).current?.focus();
  }
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cookie consent"
      data-testid="consent-modal"
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-4 backdrop-blur-sm sm:items-center"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h2 className="text-lg font-bold">We use cookies</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We use cookies to remember your cart and make your visit better.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button ref={declineRef} variant="outline" onClick={() => dismiss('essential')}>
            Decline
          </Button>
          <Button ref={acceptRef} onClick={() => dismiss('all')} data-testid="consent-accept">
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const { data, loading, error } = useApi<ProductPage>('/api/products?sort=rating&pageSize=4');
  const { moneyWhole } = useFormat();

  const promises = [
    {
      icon: Truck,
      title: `Free shipping over ${moneyWhole(config.seed.shipping.freeThresholdCents)}`,
      body: `Flat ${moneyWhole(config.seed.shipping.flatCents)} below that. No surprises at checkout.`,
    },
    { icon: RotateCcw, title: '30-day returns', body: 'Changed your mind? Send it back, no fuss.' },
    {
      icon: Leaf,
      title: 'Carbon-neutral delivery',
      body: 'Every order ships plastic-free and offset.',
    },
  ];

  return (
    <div>
      <ConsentModal />
      <section className="border-b border-border bg-gradient-to-b from-secondary/50 to-background">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="flex flex-col items-start gap-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
              <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
              New season picks are in
            </span>
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
              Big on the <span className="text-primary">little things.</span>
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              Homeware, kitchen and outdoor goods chosen to be used, not shelved — and priced to
              feel good about.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/store">
                  Start shopping
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/store?category=kitchen">Browse the kitchen</Link>
              </Button>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="relative hidden aspect-[4/3] overflow-hidden rounded-[2rem] shadow-lg md:block"
            style={{
              background:
                'radial-gradient(120% 120% at 0% 0%, oklch(0.82 0.13 33), oklch(0.7 0.12 18) 55%, oklch(0.5 0.12 300))',
            }}
          >
            <span className="absolute inset-0 flex items-center justify-center text-[10rem] font-black text-white/15">
              K
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Loved right now</h2>
          <Link to="/store" className="text-sm font-semibold text-primary hover:underline">
            View all
          </Link>
        </div>
        {error ? (
          <p className="text-sm text-muted-foreground">
            We couldn’t load these picks right now — browse the full shop instead.
          </p>
        ) : loading && !data ? (
          <ProductGridSkeleton count={4} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(data?.items ?? []).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
          {promises.map((promise) => (
            <div key={promise.title} className="flex items-start gap-4">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
                <promise.icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-semibold">{promise.title}</h3>
                <p className="text-sm text-muted-foreground">{promise.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
