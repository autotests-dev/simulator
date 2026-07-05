import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Check, RotateCcw, Star, Truck } from 'lucide-react';
import { config } from '@autotests-simulator/config';
import { Badge, Button, Skeleton, Spinner, cn } from '@autotests-simulator/ui';
import type { ProductListItem, Review, ReviewPage } from '@autotests-simulator/domain';
import { api, ApiError } from '../../lib/api';
import { CARE_TIPS } from '../../lib/careTips';
import { useApi, useFormat } from '../../lib/hooks';
import { useCart } from '../../app/CartContext';
import { useSession } from '../../app/SessionContext';
import { useToast } from '../../app/ToastContext';
import { ProductImage } from '../../components/ProductImage';
import { BADGE_VARIANT } from '../../components/ProductCard';
import { Price } from '../../components/Price';
import { Rating } from '../../components/Rating';
import { QuantityStepper } from '../../components/QuantityStepper';
import { StateMessage } from '../../components/StateMessage';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function qaSrcDoc(productName: string): string {
  const name = escapeHtml(productName);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:ui-sans-serif,system-ui,sans-serif;margin:14px;color:#2b2b2b}
    .q{font-weight:600;margin-top:10px}.a{color:#666;margin:2px 0 8px}
  </style></head><body>
    <div class="q">Is the ${name} dishwasher safe?</div><div class="a">Yes — top rack recommended.</div>
    <div class="q">Where does it ship from?</div><div class="a">Our Portland warehouse, usually within two days.</div>
    <div class="q" data-testid="qa-question">Does it come with a warranty?</div>
    <div class="a" data-testid="qa-answer">Yes, a one-year limited warranty is included.</div>
  </body></html>`;
}

function CareGuide({ category }: { category: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    const tips = CARE_TIPS[category] ?? CARE_TIPS.home;
    root.innerHTML = `<style>
      p{margin:0 0 .5rem;font-weight:700;font-size:.875rem;font-family:inherit}
      ul{margin:0;padding-left:1.1rem;color:#78716c;font-size:.875rem;line-height:1.6;font-family:inherit}
      li{margin:.15rem 0}
    </style>
    <p>Care</p>
    <ul>${tips.map((tip) => `<li data-testid="care-item">${escapeHtml(tip)}</li>`).join('')}</ul>`;
  }, [category]);

  return <div ref={ref} data-testid="care-guide" />;
}

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const {
    data: product,
    loading,
    error,
  } = useApi<ProductListItem>(slug ? `/api/products/${slug}` : null);
  const { money, moneyWhole, date } = useFormat();
  const { addItem } = useCart();

  const [selected, setSelected] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [addError, setAddError] = useState<string | undefined>(undefined);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { toast } = useToast();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsPages, setReviewsPages] = useState(0);
  const [reviewsBusy, setReviewsBusy] = useState(false);
  const reviewsRequestRef = useRef(0);
  const { user } = useSession();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewBody, setReviewBody] = useState('');
  const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({});
  const [reviewFormError, setReviewFormError] = useState<string | undefined>(undefined);
  const [reviewBusy, setReviewBusy] = useState(false);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!slug) return;
    setReviewBusy(true);
    setReviewErrors({});
    setReviewFormError(undefined);
    try {
      const review = await api.post<Review>(`/api/products/${slug}/reviews`, {
        rating: reviewRating,
        body: reviewBody,
      });
      setReviews((prev) => [review, ...prev]);
      setReviewsTotal((n) => n + 1);
      setReviewOpen(false);
      setReviewRating(0);
      setReviewBody('');
      toast('Thanks for your review');
    } catch (err) {
      if (err instanceof ApiError) {
        setReviewErrors(err.fieldErrors ?? {});
        setReviewFormError(err.message);
      } else {
        setReviewFormError('Could not post your review.');
      }
    } finally {
      setReviewBusy(false);
    }
  }

  const loadReviews = useCallback(
    async (nextPage: number) => {
      if (!slug) return;
      const requestId = ++reviewsRequestRef.current;
      setReviewsBusy(true);
      try {
        const r = await api.get<ReviewPage>(`/api/products/${slug}/reviews?page=${nextPage}`);
        if (requestId !== reviewsRequestRef.current) return;
        // A just-posted review is prepended both locally and server-side, so a
        // later page can overlap page 1 — drop anything already rendered.
        setReviews((prev) => {
          if (nextPage === 1) return r.items;
          const seen = new Set(prev.map((x) => x.id));
          return [...prev, ...r.items.filter((x) => !seen.has(x.id))];
        });
        setReviewsTotal(r.total);
        setReviewsPages(nextPage);
      } catch {
      } finally {
        if (requestId === reviewsRequestRef.current) setReviewsBusy(false);
      }
    },
    [slug],
  );

  useEffect(() => {
    setSelected({});
    setQty(1);
    setAdded(false);
    setAddError(undefined);
    setDetailsOpen(false);
  }, [slug]);

  useEffect(() => {
    setReviews([]);
    setReviewsTotal(0);
    setReviewsPages(0);
    void loadReviews(1);
  }, [loadReviews]);

  if (loading && !product) {
    return (
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-3xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-11 w-40 rounded-full" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20">
        <StateMessage
          testId="product-error"
          title="That product isn’t available"
          description={error ?? 'It may have been removed from the shop.'}
          action={
            <Button asChild>
              <Link to="/store">Back to the shop</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const allChosen = !product.variants || product.variants.every((axis) => selected[axis.name]);
  const canAdd = product.inStock && allChosen && !adding;

  async function handleAdd() {
    if (!product) return;
    setAdding(true);
    setAddError(undefined);
    setAdded(false);
    try {
      await addItem({ productId: product.id, variant: selected, qty });
      setAdded(true);
      toast('Added to your cart');
    } catch (e) {
      setAddError(e instanceof ApiError ? e.message : 'Could not add to cart.');
    } finally {
      setAdding(false);
    }
  }

  const stockNote = !product.inStock
    ? 'Out of stock'
    : product.stock <= 5
      ? `Only ${product.stock} left`
      : 'In stock';

  const addLabel = adding ? 'Adding…' : product.inStock ? 'Add to cart' : 'Out of stock';

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-28 md:pb-10">
      <nav
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground"
        aria-label="Breadcrumb"
      >
        <Link to="/store" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="size-4" /> Shop
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          to={`/store?category=${product.category}`}
          className="capitalize hover:text-foreground"
        >
          {product.category}
        </Link>
      </nav>

      <div className="grid gap-10 md:grid-cols-2">
        <div className="relative">
          <ProductImage
            slug={product.slug}
            name={product.name}
            className="aspect-square w-full rounded-3xl"
          />
          {product.badge ? (
            <Badge
              variant={BADGE_VARIANT[product.badge]}
              className="absolute left-4 top-4 capitalize"
            >
              {product.badge}
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
            <div className="flex items-center gap-3">
              <Rating value={product.rating} />
              <span
                className={cn(
                  'text-sm font-medium',
                  product.inStock ? 'text-muted-foreground' : 'text-destructive',
                )}
                data-testid="stock-status"
              >
                {stockNote}
              </span>
            </div>
          </div>

          <Price
            priceCents={product.priceCents}
            compareAtCents={product.compareAtCents}
            className="gap-3 text-2xl"
          />

          <p className="text-muted-foreground">{product.description}</p>

          {product.variants?.map((axis) => (
            <div key={axis.name} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{axis.name}</span>
                {!selected[axis.name] ? (
                  <span className="text-xs text-muted-foreground">
                    Choose a {axis.name.toLowerCase()}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label={axis.name}>
                {axis.options.map((option) => {
                  const active = selected[axis.name] === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelected((s) => ({ ...s, [axis.name]: option }))}
                      className={cn(
                        'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input bg-card hover:bg-secondary',
                      )}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {product.inStock ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">Quantity</span>
              <QuantityStepper
                value={qty}
                max={product.stock}
                onChange={(n) => setQty(Math.max(1, n))}
              />
            </div>
          ) : null}

          <div className="hidden md:block">
            <Button size="lg" onClick={handleAdd} disabled={!canAdd} aria-label="Add to cart">
              {adding ? <Spinner /> : null}
              {addLabel}
            </Button>
          </div>

          {added ? (
            <div
              role="status"
              data-testid="add-confirmation"
              className="flex items-center gap-2 rounded-xl border border-teal/40 bg-teal/10 px-4 py-3 text-sm font-medium"
            >
              <Check className="size-4 text-teal" />
              Added to your cart.
              <Link to="/store/cart" className="font-semibold text-primary hover:underline">
                View cart
              </Link>
            </div>
          ) : null}

          {addError ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {addError}
            </p>
          ) : null}

          <ul className="mt-2 flex flex-col gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Truck className="size-4" aria-hidden="true" />
              <span>
                Free shipping over {moneyWhole(config.seed.shipping.freeThresholdCents)}, flat{' '}
                {moneyWhole(config.seed.shipping.flatCents)} below.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <RotateCcw className="size-4" aria-hidden="true" />
              <span>30-day returns, no questions asked.</span>
            </li>
            <li className="flex items-center gap-2">
              <ArrowUpRight className="size-4" aria-hidden="true" />
              <a
                href="/policies/shipping"
                target="_blank"
                rel="noopener"
                className="underline underline-offset-4 hover:text-foreground"
              >
                Shipping &amp; returns policy
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <div className="border-t border-border pt-4">
          <div
            data-testid="details-toggle"
            onClick={() => setDetailsOpen((o) => !o)}
            className="flex cursor-pointer select-none items-center justify-between text-sm font-bold"
          >
            Product details
            <span aria-hidden="true">{detailsOpen ? '–' : '+'}</span>
          </div>
          {detailsOpen ? (
            <p data-testid="details-body" className="mt-3 text-sm text-muted-foreground">
              {product.description} Hand-finished; slight variation is normal. Wipe clean with a
              damp cloth.
            </p>
          ) : null}
          <div className="mt-6">
            <CareGuide category={product.category} />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h2 className="mb-2 text-sm font-bold">Questions &amp; answers</h2>
          <iframe
            title="Questions and answers"
            data-testid="qa-frame"
            srcDoc={qaSrcDoc(product.name)}
            className="h-56 w-full rounded-xl border border-border bg-card"
          />
        </div>
      </div>

      <section className="mt-10 border-t border-border pt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold" data-testid="reviews-heading">
            Reviews{reviewsTotal > 0 ? ` (${reviewsTotal})` : ''}
          </h2>
          {!reviewOpen ? (
            <Button variant="outline" size="sm" onClick={() => setReviewOpen(true)}>
              Write a review
            </Button>
          ) : null}
        </div>

        {reviewOpen ? (
          user ? (
            <form
              onSubmit={submitReview}
              noValidate
              data-testid="review-form"
              className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
            >
              {reviewFormError ? (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {reviewFormError}
                </p>
              ) : null}
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Your rating</span>
                <div className="flex gap-1" role="group" aria-label="Your rating">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={reviewRating >= value}
                      aria-label={`Rate ${value} star${value === 1 ? '' : 's'}`}
                      onClick={() => setReviewRating(value)}
                      className="rounded-full p-1 hover:bg-secondary"
                    >
                      <Star
                        className={cn(
                          'size-5',
                          reviewRating >= value
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-muted-foreground',
                        )}
                      />
                    </button>
                  ))}
                </div>
                {reviewErrors.rating ? (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {reviewErrors.rating}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="review-body" className="text-sm font-medium">
                  Your review
                </label>
                <textarea
                  id="review-body"
                  value={reviewBody}
                  onChange={(e) => setReviewBody(e.target.value)}
                  rows={3}
                  aria-invalid={reviewErrors.body ? true : undefined}
                  className="flex w-full rounded-xl border border-input bg-card px-4 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {reviewErrors.body ? (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {reviewErrors.body}
                  </p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={reviewBusy}>
                  {reviewBusy ? <Spinner /> : null}
                  Post review
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setReviewOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div
              data-testid="review-signin"
              className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm"
            >
              <span className="text-muted-foreground">Sign in to share your experience.</span>
              <Link
                to="/login"
                state={{ from: location.pathname }}
                className="font-medium text-primary hover:underline"
              >
                Sign in
              </Link>
            </div>
          )
        ) : null}

        {reviews.length === 0 && reviewsBusy ? (
          <div className="flex flex-col gap-4" role="status" aria-label="Loading reviews">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {reviews.map((review) => (
              <li
                key={review.id}
                data-testid="review"
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="mb-1 flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold">{review.author}</span>
                  <Rating value={review.rating} />
                  <span className="text-xs text-muted-foreground">{date(review.createdAt)}</span>
                </div>
                <p className="text-sm text-muted-foreground">{review.body}</p>
              </li>
            ))}
          </ul>
        )}
        {reviews.length > 0 && reviews.length < reviewsTotal ? (
          <div className="mt-4">
            <Button
              variant="outline"
              disabled={reviewsBusy}
              onClick={() => void loadReviews(reviewsPages + 1)}
            >
              {reviewsBusy ? <Spinner /> : null}
              Show more reviews
            </Button>
          </div>
        ) : null}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <span className="text-lg font-bold">{money(product.priceCents)}</span>
          <Button
            className="flex-1"
            onClick={handleAdd}
            disabled={!canAdd}
            aria-label="Add to cart"
          >
            {adding ? <Spinner /> : null}
            {addLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
