import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Trash2 } from 'lucide-react';
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
} from '@autotests-simulator/ui';
import type {
  Note,
  ProductBadge,
  ProductListItem,
  ProductPatch,
} from '@autotests-simulator/domain';
import { api, ApiError } from '../../lib/api';
import { useApi } from '../../lib/hooks';
import { centsToInput, inputToCents } from '../../lib/money';
import { FormError } from '../../components/FormError';

const BADGES = [
  { value: 'none', label: 'None' },
  { value: 'new', label: 'New' },
  { value: 'sale', label: 'Sale' },
  { value: 'bestseller', label: 'Bestseller' },
];

type FormState = { name: string; price: string; compareAt: string; badge: string; stock: string };

function toForm(p: ProductListItem): FormState {
  return {
    name: p.name,
    price: centsToInput(p.priceCents),
    compareAt: centsToInput(p.compareAtCents),
    badge: p.badge ?? 'none',
    stock: String(p.stock),
  };
}

export function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    data: product,
    loading,
    error,
  } = useApi<ProductListItem>(id ? `/api/admin/products/${id}` : null);

  const [form, setForm] = useState<FormState | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>(undefined);
  const { data: notes, reload: reloadNotes } = useApi<Note[]>(
    id ? `/api/admin/products/${id}/notes` : null,
  );
  const [noteBody, setNoteBody] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteError, setNoteError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!product) return;
    setForm(toForm(product));
  }, [product]);

  if (error || (!loading && !product)) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground" data-testid="product-missing">
          We couldn’t find that product.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/backoffice/products">Back to products</Link>
        </Button>
      </div>
    );
  }
  if (!product || !form) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  const set = (key: keyof FormState) => (value: string) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setSaved(false);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !id) return;
    setSaving(true);
    setErrors({});
    setFormError(undefined);
    setSaved(false);
    const patch: ProductPatch = {
      name: form.name,
      priceCents: inputToCents(form.price),
      compareAtCents: form.compareAt.trim() === '' ? null : inputToCents(form.compareAt),
      badge: form.badge === 'none' ? null : (form.badge as ProductBadge),
      stock: Number.parseInt(form.stock, 10),
    };
    try {
      const next = await api.patch<ProductListItem>(`/api/admin/products/${id}`, patch);
      setSaved(true);
      setForm(toForm(next));
      setDisplayName(next.name);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors ?? {});
        setFormError(err.message);
      } else {
        setFormError('Could not save changes.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!id) return;
    setDeleteError(undefined);
    try {
      await api.del(`/api/admin/products/${id}`);
      navigate('/backoffice/products');
    } catch (err) {
      setConfirmDelete(false);
      setDeleteError(err instanceof ApiError ? err.message : 'Could not delete the product.');
    }
  }

  async function addNote() {
    if (!id || !noteBody.trim()) return;
    setNoteBusy(true);
    setNoteError(undefined);
    try {
      await api.post(`/api/admin/products/${id}/notes`, { body: noteBody });
      setNoteBody('');
      reloadNotes();
    } catch (err) {
      setNoteError(err instanceof ApiError ? err.message : 'Could not add the note.');
    } finally {
      setNoteBusy(false);
    }
  }

  const isCustom = product.id.startsWith('p-custom-');

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/backoffice/products"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Products
      </Link>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">{displayName ?? product.name}</h1>

      <form
        onSubmit={submit}
        noValidate
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6"
      >
        {formError ? <FormError>{formError}</FormError> : null}
        {saved ? (
          <p
            data-testid="edit-saved"
            className="flex items-center gap-2 rounded-xl border border-teal/40 bg-teal/10 px-4 py-3 text-sm font-medium"
          >
            <Check className="size-4 text-teal" /> Saved.
            <Link
              to={`/store/p/${product.slug}`}
              className="font-semibold text-primary hover:underline"
            >
              View in store
            </Link>
          </p>
        ) : null}

        <Field label="Name" htmlFor="name" required error={errors.name}>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => set('name')(e.target.value)}
            aria-invalid={errors.name ? true : undefined}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price ($)" htmlFor="price" required error={errors.priceCents}>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => set('price')(e.target.value)}
              aria-invalid={errors.priceCents ? true : undefined}
            />
          </Field>
          <Field
            label="Compare-at ($)"
            htmlFor="compareAt"
            hint="Leave blank for no sale"
            error={errors.compareAtCents}
          >
            <Input
              id="compareAt"
              type="number"
              step="0.01"
              min="0"
              value={form.compareAt}
              onChange={(e) => set('compareAt')(e.target.value)}
              aria-invalid={errors.compareAtCents ? true : undefined}
            />
          </Field>
          <Field label="Stock" htmlFor="stock" required error={errors.stock}>
            <Input
              id="stock"
              type="number"
              min="0"
              step="1"
              value={form.stock}
              onChange={(e) => set('stock')(e.target.value)}
              aria-invalid={errors.stock ? true : undefined}
            />
          </Field>
          <Field label="Badge" htmlFor="badge">
            <Select value={form.badge} onValueChange={set('badge')}>
              <SelectTrigger id="badge" aria-label="Badge">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BADGES.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {deleteError ? (
          <p
            role="alert"
            data-testid="delete-error"
            className="text-sm font-medium text-destructive"
          >
            {deleteError}
          </p>
        ) : null}
        <div className="flex items-center justify-between">
          <Button type="submit" disabled={saving}>
            {saving ? <Spinner /> : null}
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          {isCustom ? (
            confirmDelete ? (
              <span className="flex items-center gap-2 text-sm">
                <span className="font-medium">Delete this product?</span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  data-testid="confirm-delete"
                  onClick={() => void remove()}
                >
                  Delete
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </span>
            ) : (
              <Button
                type="button"
                variant="ghost"
                data-testid="delete-product"
                onClick={() => setConfirmDelete(true)}
                className="text-destructive"
              >
                <Trash2 className="size-4" /> Delete
              </Button>
            )
          ) : null}
        </div>
      </form>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-bold">Notes</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Internal notes. Text is shown exactly as written — markup is not rendered.
        </p>
        <ul className="mb-4 flex flex-col gap-2" data-testid="notes">
          {(notes ?? []).map((note) => (
            <li
              key={note.id}
              data-testid="note"
              className="rounded-xl bg-secondary/50 px-3 py-2 text-sm"
            >
              {note.body}
            </li>
          ))}
          {notes && notes.length === 0 ? (
            <li className="text-sm text-muted-foreground">No notes yet.</li>
          ) : null}
        </ul>
        {noteError ? (
          <p role="alert" className="mb-2 text-sm font-medium text-destructive">
            {noteError}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Input
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Add a note"
            aria-label="Add a note"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={noteBusy || !noteBody.trim()}
            onClick={() => void addNote()}
          >
            Add note
          </Button>
        </div>
      </section>
    </div>
  );
}
