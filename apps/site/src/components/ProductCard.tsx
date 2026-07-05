import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, cn, type BadgeProps } from '@autotests-simulator/ui';
import type { ProductListItem } from '@autotests-simulator/domain';
import { ApiError } from '../lib/api';
import { useCart } from '../app/CartContext';
import { useToast } from '../app/ToastContext';
import { ProductImage } from './ProductImage';
import { Price } from './Price';
import { Rating } from './Rating';

export const BADGE_VARIANT: Record<NonNullable<ProductListItem['badge']>, BadgeProps['variant']> = {
  sale: 'sale',
  new: 'new',
  bestseller: 'default',
};

const QUICK_ACTION =
  'pointer-events-none absolute right-3 top-3 z-10 hidden rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-semibold shadow-sm opacity-0 transition-opacity hover:bg-secondary focus-visible:pointer-events-auto focus-visible:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 md:inline-flex';

export function ProductCard({ product }: { product: ProductListItem }) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const [quickAdding, setQuickAdding] = useState(false);

  async function quickAdd() {
    if (quickAdding) return;
    setQuickAdding(true);
    try {
      await addItem({ productId: product.id });
      toast('Added to your cart');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not add to cart.');
    } finally {
      setQuickAdding(false);
    }
  }

  return (
    <article
      data-testid="product-card"
      data-product-slug={product.slug}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <Link
        to={`/store/p/${product.slug}`}
        className="flex flex-1 flex-col rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative">
          <ProductImage slug={product.slug} name={product.name} className="aspect-[4/3] w-full" />
          {product.badge ? (
            <Badge
              variant={BADGE_VARIANT[product.badge]}
              className="absolute left-3 top-3 capitalize"
            >
              {product.badge}
            </Badge>
          ) : null}
          {!product.inStock ? (
            <Badge variant="muted" className="absolute right-3 top-3">
              Out of stock
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-4">
          <h3
            title={product.name}
            className="line-clamp-1 font-semibold leading-tight transition-colors group-hover:text-primary"
          >
            {product.name}
          </h3>
          <p className="line-clamp-1 text-sm text-muted-foreground">{product.blurb}</p>
          <div className="mt-2 flex items-center justify-between">
            <Price priceCents={product.priceCents} compareAtCents={product.compareAtCents} />
            <Rating value={product.rating} />
          </div>
        </div>
      </Link>
      {product.inStock ? (
        product.variants?.length ? (
          <Link
            to={`/store/p/${product.slug}`}
            data-testid="quick-add"
            aria-label={`Choose options for ${product.name}`}
            className={cn(QUICK_ACTION)}
          >
            Options
          </Link>
        ) : (
          <button
            type="button"
            data-testid="quick-add"
            aria-label={`Quick add ${product.name}`}
            disabled={quickAdding}
            onClick={() => void quickAdd()}
            className={cn(QUICK_ACTION, 'disabled:opacity-60')}
          >
            {quickAdding ? 'Adding…' : 'Quick add'}
          </button>
        )
      ) : null}
    </article>
  );
}
