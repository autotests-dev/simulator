import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { Button, Field, Input, Spinner } from '@autotests-simulator/ui';
import { api, ApiError } from '../../lib/api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(undefined);
    try {
      await api.post('/api/auth/forgot', { email });
      setSent(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (err.fieldErrors?.email ?? err.message)
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Reset your password</h1>
      <p className="mb-8 text-muted-foreground">
        Tell us your email and we&rsquo;ll send you a link to set a new password.
      </p>

      {sent ? (
        <div
          data-testid="reset-sent"
          className="flex flex-col items-start gap-3 rounded-2xl border border-teal/40 bg-teal/10 p-6"
        >
          <p className="flex items-center gap-2 font-bold">
            <MailCheck className="size-5 text-teal" /> Check your inbox
          </p>
          <p className="text-sm text-muted-foreground">
            If that email matches an account, a reset link is on its way. It can take a couple of
            minutes to arrive.
          </p>
          <Button asChild variant="outline">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      ) : (
        <form
          onSubmit={submit}
          noValidate
          className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6"
        >
          {error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}
          <Field label="Email" htmlFor="forgot-email" required>
            <Input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </Field>
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? <Spinner /> : null}
            {submitting ? 'Sending…' : 'Send reset link'}
          </Button>
          <Link
            to="/login"
            className="text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Back to sign in
          </Link>
        </form>
      )}
    </div>
  );
}
