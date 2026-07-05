import { useRef, useState } from 'react';
import { Check, Paperclip, X } from 'lucide-react';
import {
  Button,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Textarea,
} from '@autotests-simulator/ui';
import type { ContactReceipt } from '@autotests-simulator/domain';
import { api } from '../../lib/api';
import { useFormSubmit } from '../../lib/hooks';
import { FormError } from '../../components/FormError';

const TOPICS = [
  { value: 'order', label: 'Order question' },
  { value: 'returns', label: 'Returns & refunds' },
  { value: 'care', label: 'Product care' },
  { value: 'other', label: 'Something else' },
];

type FormState = {
  name: string;
  email: string;
  topic: string;
  orderNumber: string;
  message: string;
};

const EMPTY: FormState = { name: '', email: '', topic: '', orderNumber: '', message: '' };

export function ContactPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [receipt, setReceipt] = useState<ContactReceipt | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { errors, formError, submitting, run, setErrors, setFormError } = useFormSubmit();

  const set = (key: keyof FormState) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = new FormData();
    body.set('name', form.name);
    body.set('email', form.email);
    body.set('topic', form.topic);
    body.set('message', form.message);
    if (form.topic === 'order' && form.orderNumber) body.set('orderNumber', form.orderNumber);
    if (file) body.set('attachment', file);
    const result = await run(
      () => api.postForm<ContactReceipt>('/api/contact', body),
      'Something went wrong sending your message.',
    );
    if (result.ok) setReceipt(result.data);
  }

  function startOver() {
    setForm(EMPTY);
    setFile(null);
    setErrors({});
    setFormError(undefined);
    setReceipt(null);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-3 text-3xl font-bold tracking-tight">Contact us</h1>
      <p className="mb-8 text-lg text-muted-foreground">
        A real person reads every message — usually the same person who packed your order.
      </p>

      {receipt ? (
        <div
          data-testid="contact-success"
          className="flex flex-col items-start gap-3 rounded-2xl border border-teal/40 bg-teal/10 p-6"
        >
          <p className="flex items-center gap-2 text-lg font-bold">
            <Check className="size-5 text-teal" /> Message received
          </p>
          <p className="text-sm text-muted-foreground">
            We&rsquo;ll reply within two business days. Your reference is{' '}
            <span className="font-semibold text-foreground" data-testid="contact-reference">
              {receipt.reference}
            </span>
            .
          </p>
          {receipt.attachmentName ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Paperclip className="size-4" aria-hidden="true" />
              Attached: <span data-testid="contact-attachment">{receipt.attachmentName}</span>
            </p>
          ) : null}
          <Button variant="outline" onClick={startOver}>
            Send another message
          </Button>
        </div>
      ) : (
        <form
          onSubmit={submit}
          noValidate
          data-testid="contact-form"
          className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6"
        >
          {formError ? <FormError>{formError}</FormError> : null}

          <Field label="Full name" htmlFor="contact-name" required error={errors.name}>
            <Input
              id="contact-name"
              value={form.name}
              onChange={(e) => set('name')(e.target.value)}
              aria-invalid={errors.name ? true : undefined}
              autoComplete="name"
            />
          </Field>
          <Field label="Email" htmlFor="contact-email" required error={errors.email}>
            <Input
              id="contact-email"
              type="email"
              value={form.email}
              onChange={(e) => set('email')(e.target.value)}
              aria-invalid={errors.email ? true : undefined}
              autoComplete="email"
            />
          </Field>
          <Field label="Topic" htmlFor="contact-topic" required error={errors.topic}>
            <Select value={form.topic} onValueChange={set('topic')}>
              <SelectTrigger id="contact-topic" aria-label="Topic">
                <SelectValue placeholder="Choose a topic" />
              </SelectTrigger>
              <SelectContent>
                {TOPICS.map((topic) => (
                  <SelectItem key={topic.value} value={topic.value}>
                    {topic.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {form.topic === 'order' ? (
            <Field
              label="Order number"
              htmlFor="contact-order"
              required
              error={errors.orderNumber}
              hint="On your confirmation email, like KO-1234"
            >
              <Input
                id="contact-order"
                value={form.orderNumber}
                onChange={(e) => set('orderNumber')(e.target.value)}
                aria-invalid={errors.orderNumber ? true : undefined}
              />
            </Field>
          ) : null}
          <Field label="Message" htmlFor="contact-message" required error={errors.message}>
            <Textarea
              id="contact-message"
              value={form.message}
              onChange={(e) => set('message')(e.target.value)}
              rows={4}
              aria-invalid={errors.message ? true : undefined}
            />
          </Field>
          <Field
            label="Photo (optional)"
            htmlFor="contact-attachment"
            hint="A picture helps with damage or care questions"
          >
            <div className="flex items-center gap-3">
              <Input
                id="contact-attachment"
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="cursor-pointer file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-xs file:font-semibold"
              />
              {file ? (
                <button
                  type="button"
                  aria-label="Remove attachment"
                  onClick={() => {
                    setFile(null);
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-destructive"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          </Field>

          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? <Spinner /> : null}
            {submitting ? 'Sending…' : 'Send message'}
          </Button>
        </form>
      )}
    </div>
  );
}
