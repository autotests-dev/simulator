import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ClipboardList, LayoutDashboard, LogOut, Package, ShieldAlert, Store } from 'lucide-react';
import { Button, Field, Input, Spinner, cn } from '@autotests-simulator/ui';
import { ApiError } from '../../lib/api';
import { useSession } from '../../app/SessionContext';
import { FormError } from '../../components/FormError';

const NAV = [
  { to: '/backoffice', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/backoffice/products', label: 'Products', icon: Package, end: false },
  { to: '/backoffice/orders', label: 'Orders', icon: ClipboardList, end: false },
];

function AdminSignIn() {
  const { login } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(undefined);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <form
        onSubmit={submit}
        noValidate
        data-testid="admin-signin"
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight">Kote&rsquo;s Back office</h1>
          <p className="text-sm text-muted-foreground">Sign in with an admin account.</p>
        </div>
        {error ? <FormError>{error}</FormError> : null}
        <Field label="Email" htmlFor="admin-email" required>
          <Input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </Field>
        <Field label="Password" htmlFor="admin-password" required>
          <Input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Field>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? <Spinner /> : null}
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
        <Link to="/" className="text-center text-xs text-muted-foreground hover:text-foreground">
          Back to the store
        </Link>
      </form>
    </div>
  );
}

function AccessDenied() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <div
        data-testid="access-denied"
        className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-sm"
      >
        <ShieldAlert className="size-10 text-destructive" aria-hidden="true" />
        <h1 className="text-xl font-bold tracking-tight">Access denied</h1>
        <p className="text-sm text-muted-foreground">
          The account {user?.email} doesn&rsquo;t have access to the back office. You need an admin
          account.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void logout()}>
            Sign out
          </Button>
          <Button onClick={() => navigate('/')}>Back to the store</Button>
        </div>
      </div>
    </div>
  );
}

export function BackofficeLayout() {
  const { user, loading, logout } = useSession();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <AdminSignIn />;
  if (user.role !== 'admin') return <AccessDenied />;

  async function signOut() {
    await logout();
    navigate('/');
  }

  return (
    <div className="flex min-h-screen flex-col bg-secondary/40" data-testid="admin-shell">
      <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-4">
        <Link to="/backoffice" className="flex items-center gap-2 font-extrabold tracking-tight">
          <span className="inline-block size-3 rounded-full bg-primary" aria-hidden="true" />
          Kote&rsquo;s
          <span className="rounded-md bg-secondary px-1.5 py-0.5 text-xs font-bold text-muted-foreground">
            Back office
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link to="/store">
              <Store className="size-4" /> View store
            </Link>
          </Button>
          <span className="px-2 text-sm font-medium">{user.displayName}</span>
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-4 py-6">
        <aside className="hidden w-48 shrink-0 sm:block">
          <nav className="flex flex-col gap-1" aria-label="Back office">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
                  )
                }
              >
                <item.icon className="size-4" aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
