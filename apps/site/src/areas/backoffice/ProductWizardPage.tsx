import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { config } from '@autotests-simulator/config';
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
  cn,
} from '@autotests-simulator/ui';
import type { ProductInput, ProductListItem } from '@autotests-simulator/domain';
import { api, ApiError } from '../../lib/api';
import { useFormat } from '../../lib/hooks';
import { inputToCents } from '../../lib/money';
import { FormError } from '../../components/FormError';

const STEPS = ['Details', 'Pricing', 'Inventory', 'Review'];

type WizardState = {
  name: string;
  category: string;
  blurb: string;
  description: string;
  price: string;
  onSale: boolean;
  compareAt: string;
  stock: string;
  hasSizes: boolean;
  sizes: string;
};

const INITIAL: WizardState = {
  name: '',
  category: '',
  blurb: '',
  description: '',
  price: '',
  onSale: false,
  compareAt: '',
  stock: '',
  hasSizes: false,
  sizes: '',
};

export function ProductWizardPage() {
  const navigate = useNavigate();
  const { money } = useFormat();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardState>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof WizardState) => (value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  function validateStep(i: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (i === 0) {
      if (!form.name.trim()) e.name = 'Name is required.';
      if (!form.category) e.category = 'Choose a category.';
      if (!form.blurb.trim()) e.blurb = 'A short blurb is required.';
      if (!form.description.trim()) e.description = 'A description is required.';
    }
    if (i === 1) {
      const price = inputToCents(form.price);
      if (!price || price <= 0) e.price = 'Enter a price greater than zero.';
      if (form.onSale) {
        const cmp = inputToCents(form.compareAt);
        if (!cmp || (price !== undefined && cmp <= price))
          e.compareAt = 'Compare-at must exceed the price.';
      }
    }
    if (i === 2) {
      const stock = Number.parseInt(form.stock, 10);
      if (!Number.isInteger(stock) || stock < 0) e.stock = 'Enter a whole number of zero or more.';
      if (form.hasSizes && form.sizes.split(',').filter((s) => s.trim()).length === 0) {
        e.sizes = 'List at least one size, comma-separated.';
      }
    }
    return e;
  }

  function next() {
    const e = validateStep(step);
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }

  async function create() {
    setSubmitting(true);
    setFormError(undefined);
    setErrors({});
    const input: ProductInput = {
      name: form.name,
      category: form.category,
      blurb: form.blurb,
      description: form.description,
      priceCents: inputToCents(form.price) ?? 0,
      compareAtCents: form.onSale ? inputToCents(form.compareAt) : undefined,
      stock: Number.parseInt(form.stock, 10),
      badge: form.onSale ? 'sale' : 'new',
      variants: form.hasSizes
        ? [
            {
              name: 'Size',
              options: form.sizes
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            },
          ]
        : undefined,
    };
    try {
      await api.post<ProductListItem>('/api/admin/products', input);
      navigate('/backoffice/products');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors ?? {});
        setFormError(err.message);
      } else {
        setFormError('Could not create the product.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl" data-testid="product-wizard">
      <Link
        to="/backoffice/products"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Products
      </Link>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Add a product</h1>

      <ol className="mb-6 flex items-center gap-2" aria-label="Steps">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? 'step' : undefined}
            className="flex items-center gap-2"
          >
            <span
              className={cn(
                'inline-flex size-6 items-center justify-center rounded-full text-xs font-bold',
                i < step
                  ? 'bg-primary text-primary-foreground'
                  : i === step
                    ? 'bg-primary/15 text-primary ring-2 ring-primary'
                    : 'bg-secondary text-muted-foreground',
              )}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                'text-sm font-medium',
                i === step ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 ? <span className="text-muted-foreground">›</span> : null}
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
        {formError ? <FormError>{formError}</FormError> : null}

        {step === 0 ? (
          <div className="flex flex-col gap-4" data-testid="wizard-details">
            <Field label="Name" htmlFor="w-name" required error={errors.name}>
              <Input
                id="w-name"
                value={form.name}
                onChange={(e) => set('name')(e.target.value)}
                aria-invalid={errors.name ? true : undefined}
              />
            </Field>
            <Field label="Category" htmlFor="w-category" required error={errors.category}>
              <Select value={form.category} onValueChange={set('category')}>
                <SelectTrigger id="w-category" aria-label="Category">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {config.seed.categories.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Short blurb" htmlFor="w-blurb" required error={errors.blurb}>
              <Input
                id="w-blurb"
                value={form.blurb}
                onChange={(e) => set('blurb')(e.target.value)}
                aria-invalid={errors.blurb ? true : undefined}
              />
            </Field>
            <Field label="Description" htmlFor="w-description" required error={errors.description}>
              <textarea
                id="w-description"
                value={form.description}
                onChange={(e) => set('description')(e.target.value)}
                rows={3}
                className="flex w-full rounded-xl border border-input bg-card px-4 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </Field>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="flex flex-col gap-4" data-testid="wizard-pricing">
            <Field label="Price ($)" htmlFor="w-price" required error={errors.price}>
              <Input
                id="w-price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => set('price')(e.target.value)}
                aria-invalid={errors.price ? true : undefined}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="size-4 cursor-pointer accent-primary"
                checked={form.onSale}
                onChange={(e) => set('onSale')(e.target.checked)}
              />
              Put this product on sale
            </label>
            {form.onSale ? (
              <Field
                label="Compare-at price ($)"
                htmlFor="w-compareAt"
                required
                error={errors.compareAt}
                hint="Shown struck through; must exceed the price"
              >
                <Input
                  id="w-compareAt"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.compareAt}
                  onChange={(e) => set('compareAt')(e.target.value)}
                  aria-invalid={errors.compareAt ? true : undefined}
                />
              </Field>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col gap-4" data-testid="wizard-inventory">
            <Field label="Stock" htmlFor="w-stock" required error={errors.stock}>
              <Input
                id="w-stock"
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={(e) => set('stock')(e.target.value)}
                aria-invalid={errors.stock ? true : undefined}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="size-4 cursor-pointer accent-primary"
                checked={form.hasSizes}
                onChange={(e) => set('hasSizes')(e.target.checked)}
              />
              This product comes in multiple sizes
            </label>
            {form.hasSizes ? (
              <Field
                label="Sizes"
                htmlFor="w-sizes"
                required
                error={errors.sizes}
                hint="Comma-separated, e.g. S, M, L"
              >
                <Input
                  id="w-sizes"
                  value={form.sizes}
                  onChange={(e) => set('sizes')(e.target.value)}
                  aria-invalid={errors.sizes ? true : undefined}
                />
              </Field>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
          <dl className="flex flex-col gap-2 text-sm" data-testid="wizard-review">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{form.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Category</dt>
              <dd className="font-medium capitalize">{form.category}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Price</dt>
              <dd className="font-medium">{money(inputToCents(form.price) ?? 0)}</dd>
            </div>
            {form.onSale ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Compare-at</dt>
                <dd className="font-medium">{money(inputToCents(form.compareAt) ?? 0)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Stock</dt>
              <dd className="font-medium">{form.stock}</dd>
            </div>
            {form.hasSizes ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Sizes</dt>
                <dd className="font-medium">{form.sizes}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <div className="mt-2 flex items-center justify-between">
          <Button type="button" variant="ghost" onClick={back} disabled={step === 0}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next}>
              Next
            </Button>
          ) : (
            <Button type="button" onClick={() => void create()} disabled={submitting}>
              {submitting ? <Spinner /> : null}
              {submitting ? 'Creating…' : 'Create product'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
