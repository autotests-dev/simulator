import { Button } from '@autotests-simulator/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (p: number) => void;
}) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_unused, i) => i + 1);
  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-1"
      aria-label="Pagination"
      data-testid="pagination"
    >
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft />
      </Button>
      {pages.map((p) => (
        <Button
          key={p}
          variant={p === page ? 'default' : 'ghost'}
          size="icon"
          onClick={() => onPage(p)}
          aria-current={p === page ? 'page' : undefined}
          aria-label={`Page ${p}`}
        >
          {p}
        </Button>
      ))}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPage(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
      >
        <ChevronRight />
      </Button>
    </nav>
  );
}
