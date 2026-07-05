import { Link } from 'react-router-dom';

const STOCKISTS = [
  {
    shop: 'Kote’s Flagship',
    city: 'Portland, OR',
    neighborhood: 'Pearl District',
    phone: '(503) 555-0114',
    hours: 'Mon–Sat 10–6, Sun 11–5',
  },
  {
    shop: 'Kote’s Workshop Store',
    city: 'Portland, OR',
    neighborhood: 'Hawthorne',
    phone: '(503) 555-0187',
    hours: 'Thu–Sun 11–5',
  },
  {
    shop: 'Terrace & Twine',
    city: 'Austin, TX',
    neighborhood: 'South Congress',
    phone: '(512) 555-0132',
    hours: 'Daily 10–7',
  },
  {
    shop: 'North Fork Goods',
    city: 'Denver, CO',
    neighborhood: 'RiNo',
    phone: '(303) 555-0166',
    hours: 'Tue–Sun 10–6',
  },
  {
    shop: 'The Everyday Shelf',
    city: 'Madison, WI',
    neighborhood: 'Willy Street',
    phone: '(608) 555-0149',
    hours: 'Mon–Sat 10–6',
  },
  {
    shop: 'Blue Ridge Provisions',
    city: 'Asheville, NC',
    neighborhood: 'River Arts District',
    phone: '(828) 555-0173',
    hours: 'Daily 11–6',
  },
  {
    shop: 'Lakeview Mercantile',
    city: 'Burlington, VT',
    neighborhood: 'Church Street',
    phone: '(802) 555-0128',
    hours: 'Mon–Sat 10–6, Sun 12–5',
  },
];

export function StockistsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-3 text-3xl font-bold tracking-tight">Stockists</h1>
      <p className="mb-8 text-lg text-muted-foreground">
        Prefer to pick things up in person? Our own shops and a few kindred stores carry the core
        range.
      </p>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm" data-testid="stockists-table">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Shop</th>
              <th className="px-4 py-3 font-semibold">City</th>
              <th className="hidden px-4 py-3 font-semibold sm:table-cell">Phone</th>
              <th className="px-4 py-3 font-semibold">Hours</th>
            </tr>
          </thead>
          <tbody>
            {STOCKISTS.map((stockist) => (
              <tr
                key={stockist.shop}
                data-testid="stockist-row"
                className="border-b border-border last:border-0"
              >
                <td className="px-4 py-3">
                  <span className="font-medium">{stockist.shop}</span>
                  <span className="block text-xs text-muted-foreground">
                    {stockist.neighborhood}
                  </span>
                </td>
                <td className="px-4 py-3">{stockist.city}</td>
                <td className="hidden px-4 py-3 tabular-nums sm:table-cell">{stockist.phone}</td>
                <td className="px-4 py-3 text-muted-foreground">{stockist.hours}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Want to stock Kote&rsquo;s? Say hello through the{' '}
        <Link to="/contact" className="text-primary underline-offset-4 hover:underline">
          contact page
        </Link>{' '}
        and tell us about your shop.
      </p>
    </div>
  );
}
