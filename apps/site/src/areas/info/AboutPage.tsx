const SECTIONS = [
  { id: 'story', label: 'Our story' },
  { id: 'goods', label: 'How we choose goods' },
  { id: 'people', label: 'The people' },
];

export function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-3 text-3xl font-bold tracking-tight">About Kote&rsquo;s</h1>
      <p className="mb-8 text-lg text-muted-foreground">
        A small shop with a simple idea: the things you touch every day should be the nicest things
        you own.
      </p>

      <nav aria-label="On this page" className="mb-10 flex flex-wrap gap-2">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {section.label}
          </a>
        ))}
      </nav>

      <section id="story" data-testid="about-story" className="mb-12 scroll-mt-24">
        <h2 className="mb-3 text-xl font-bold">Our story</h2>
        <div className="flex flex-col gap-4 text-muted-foreground">
          <p>
            Kote&rsquo;s started in 2014 as a single table at the Portland Saturday Market. Avery
            Kote sold hand-thrown mugs and enamel plates out of two milk crates, and kept a notebook
            of everything customers said they wished existed but couldn&rsquo;t find — a towel that
            actually dried things, a lamp that didn&rsquo;t glare, socks worth re-buying.
          </p>
          <p>
            That notebook became the catalog. We opened the first shop on Sutter Street in 2016,
            moved the workroom to a bigger space two years later, and started shipping nationwide
            when the wait-list for the cast-iron pan outgrew the neighborhood.
          </p>
          <p>
            We&rsquo;re still small on purpose. Every product page you see is something we use in
            our own kitchens, on our own desks, and on our own trails.
          </p>
        </div>
      </section>

      <section id="goods" data-testid="about-goods" className="mb-12 scroll-mt-24">
        <h2 className="mb-3 text-xl font-bold">How we choose goods</h2>
        <div className="flex flex-col gap-4 text-muted-foreground">
          <p>
            Three questions decide whether something earns a spot: Will you reach for it weekly?
            Will it survive five years of that? And does it feel better than what it replaces? If
            any answer is no, it doesn&rsquo;t ship.
          </p>
          <p>
            We work directly with a short list of makers — a stoneware studio in Oregon, a linen
            mill in Portugal, a family forge that seasons every pan by hand. Short list, long
            relationships: most of our makers have been with us for over five years.
          </p>
          <p>
            When something doesn&rsquo;t hold up, we retire it. The catalog stays small so the
            standard stays high.
          </p>
        </div>
      </section>

      <section id="people" data-testid="about-people" className="scroll-mt-24">
        <h2 className="mb-3 text-xl font-bold">The people</h2>
        <div className="flex flex-col gap-4 text-muted-foreground">
          <p>
            Eleven of us run the whole show — buying, photography, packing, and the help desk. Avery
            still approves every new product, and the person answering your email has probably
            packed your order too.
          </p>
          <p>
            We&rsquo;re hiring occasionally and hanging out at the Portland shop always. Come say hi
            — the kettle&rsquo;s usually on.
          </p>
        </div>
      </section>
    </div>
  );
}
