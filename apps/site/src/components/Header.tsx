import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { config } from '@autotests-simulator/config';
import { useCart } from '../app/CartContext';
import { useSession } from '../app/SessionContext';

function HeaderSearch({ id, onSubmitted }: { id: string; onSubmitted?: () => void }) {
  const navigate = useNavigate();
  const [value, setValue] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const query = value.trim();
    navigate(query ? `/store?q=${encodeURIComponent(query)}` : '/store');
    onSubmitted?.();
  }

  return (
    <form onSubmit={submit} role="search" className="relative">
      <Search
        className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search"
        aria-label="Search Kote’s"
        className="h-9 w-full rounded-full border border-input bg-card pl-9 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </form>
  );
}

const NAV = [
  { label: 'Shop all', to: '/store' },
  ...config.seed.categories.map((c) => ({ label: c.name, to: `/store?category=${c.slug}` })),
];

export function Header() {
  const { count } = useCart();
  const { user } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-full text-foreground hover:bg-secondary md:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? 'mobile-nav' : undefined}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        <Link to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          <span className="inline-block size-3 rounded-full bg-primary" aria-hidden="true" />
          Kote&rsquo;s
        </Link>

        <nav className="ml-3 hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <div className="hidden w-44 lg:block">
            <HeaderSearch id="header-search" />
          </div>
          {user ? (
            <Link
              to="/account"
              aria-label={`Hi, ${user.displayName.split(' ')[0]}, your account`}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
            >
              <User className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Hi, {user.displayName.split(' ')[0]}</span>
            </Link>
          ) : (
            <Link
              to="/login"
              aria-label="Sign in"
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
            >
              <User className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sign in</span>
            </Link>
          )}

          <Link
            to="/store/cart"
            className="relative inline-flex size-10 items-center justify-center rounded-full text-foreground hover:bg-secondary"
            aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? '' : 's'}` : 'Cart, empty'}
          >
            <ShoppingBag className="size-5" aria-hidden="true" />
            {count > 0 ? (
              <span
                data-testid="cart-count"
                className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground"
              >
                {count}
              </span>
            ) : null}
          </Link>
        </div>
      </div>

      {menuOpen ? (
        <nav
          id="mobile-nav"
          className="border-t border-border bg-background px-4 py-2 md:hidden"
          aria-label="Mobile"
        >
          <div className="px-3 py-2">
            <HeaderSearch id="mobile-search" onSubmitted={() => setMenuOpen(false)} />
          </div>
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-secondary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
