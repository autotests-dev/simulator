import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button, Field, Input, Spinner } from '@autotests-simulator/ui';
import { ApiError } from '../../lib/api';
import { useSession } from '../../app/SessionContext';
import { FormError } from '../../components/FormError';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, loading } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/account';

  if (!loading && user && !submitting) {
    return <Navigate to="/account" replace />;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(undefined);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Welcome back</h1>
      <p className="mb-8 text-muted-foreground">Sign in to see your orders and check out faster.</p>
      <form
        onSubmit={submit}
        noValidate
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6"
      >
        {error ? <FormError>{error}</FormError> : null}
        <Field label="Email" htmlFor="login-email" required>
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </Field>
        <Field label="Password" htmlFor="login-password" required>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Field>
        <div className="-mt-2 text-right">
          <Link
            to="/forgot-password"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? <Spinner /> : null}
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          New here?{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}
