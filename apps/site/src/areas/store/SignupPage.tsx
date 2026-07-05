import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button, Field, Input, Spinner } from '@autotests-simulator/ui';
import { useSession } from '../../app/SessionContext';
import { useFormSubmit } from '../../lib/hooks';
import { FormError } from '../../components/FormError';

export function SignupPage() {
  const navigate = useNavigate();
  const { user, loading, signup } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const { errors, formError, submitting, run, setErrors, setFormError } = useFormSubmit();

  if (!loading && user && !submitting) {
    return <Navigate to="/account" replace />;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (confirm !== password) {
      setFormError(undefined);
      setErrors({ confirm: 'Passwords don’t match.' });
      return;
    }
    const result = await run(
      () => signup(name, email, password),
      'Something went wrong creating your account.',
    );
    if (result.ok) navigate('/account', { replace: true });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Create an account</h1>
      <p className="mb-8 text-muted-foreground">
        Track orders, save addresses, and check out faster.
      </p>
      <form
        onSubmit={submit}
        noValidate
        data-testid="signup-form"
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6"
      >
        {formError ? <FormError>{formError}</FormError> : null}
        <Field label="Full name" htmlFor="signup-name" required error={errors.name}>
          <Input
            id="signup-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={errors.name ? true : undefined}
            autoComplete="name"
          />
        </Field>
        <Field label="Email" htmlFor="signup-email" required error={errors.email}>
          <Input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={errors.email ? true : undefined}
            autoComplete="email"
          />
        </Field>
        <Field
          label="Password"
          htmlFor="signup-password"
          required
          error={errors.password}
          hint="At least 8 characters"
        >
          <Input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={errors.password ? true : undefined}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm password" htmlFor="signup-confirm" required error={errors.confirm}>
          <Input
            id="signup-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={errors.confirm ? true : undefined}
            autoComplete="new-password"
          />
        </Field>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? <Spinner /> : null}
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
