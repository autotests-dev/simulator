import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';

function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api.post('/api/newsletter', { email });
      setJoined(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (joined) {
    return (
      <p className="text-sm font-medium text-teal" data-testid="newsletter-joined">
        You&rsquo;re on the list. Good things incoming.
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2">
      <label htmlFor="newsletter-email" className="text-sm font-bold">
        Join the list
      </label>
      <p className="text-xs text-muted-foreground">
        New arrivals and the occasional deal. No noise.
      </p>
      <div className="flex gap-2">
        <input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          aria-invalid={error ? true : undefined}
          className="h-9 w-full min-w-0 rounded-full border border-input bg-card px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={busy}
          className="h-9 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? 'Joining…' : 'Join'}
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}

const COLUMNS = [
  {
    heading: 'Shop',
    links: [
      { label: 'Home', to: '/store?category=home' },
      { label: 'Kitchen', to: '/store?category=kitchen' },
      { label: 'Outdoors', to: '/store?category=outdoors' },
      { label: 'Desk', to: '/store?category=desk' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'Our story', to: '/about' },
      { label: 'Sustainability', to: '/sustainability' },
      { label: 'Stockists', to: '/stockists' },
    ],
  },
  {
    heading: 'Help',
    links: [
      { label: 'Shipping & returns', to: '/policies/shipping' },
      { label: 'Care guide', to: '/care' },
      { label: 'Contact us', to: '/contact' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
            <span className="inline-block size-3 rounded-full bg-primary" aria-hidden="true" />
            Kote&rsquo;s
          </div>
          <p className="text-sm text-muted-foreground">Everyday goods, brightly done.</p>
          <NewsletterSignup />
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.heading} aria-label={col.heading} className="flex flex-col gap-2">
            <h2 className="text-sm font-bold">{col.heading}</h2>
            {col.links.map((link, i) => (
              <Link
                key={`${col.heading}-${i}`}
                to={link.to}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-muted-foreground sm:flex-row">
          <p>© 2026 Kote&rsquo;s &middot; by autotests.dev</p>
        </div>
      </div>
    </footer>
  );
}
