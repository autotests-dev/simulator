import { config } from '@autotests-simulator/config';
import { CARE_TIPS } from '../../lib/careTips';

const FAQ = [
  {
    question: 'How often should I re-oil wooden boards and stands?',
    answer: 'Once a month with a food-safe mineral oil keeps end-grain boards from drying out.',
  },
  {
    question: 'Can enamel plates go over an open fire?',
    answer: 'Yes — enamel is campfire-friendly. Let it cool before washing to avoid crazing.',
  },
  {
    question: 'My cast iron looks dull. Is it ruined?',
    answer:
      'Not at all. Scrub, dry, and bake a thin layer of oil at 450°F for an hour to re-season it.',
  },
  {
    question: 'Do you repair items out of warranty?',
    answer:
      'Often, yes. Reply to your order email with a photo and we’ll quote a repair or suggest a fix.',
  },
];

export function CarePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-3 text-3xl font-bold tracking-tight">Care guide</h1>
      <p className="mb-10 text-lg text-muted-foreground">
        Good things last longer with a little attention. Here&rsquo;s how to keep everything from
        Kote&rsquo;s in daily rotation.
      </p>

      <div className="mb-12 grid gap-6 sm:grid-cols-2">
        {config.seed.categories.map((category) => (
          <section
            key={category.slug}
            data-testid="care-category"
            className="rounded-2xl border border-border bg-card p-5"
          >
            <h2 className="mb-2 text-base font-bold">{category.name}</h2>
            <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm text-muted-foreground">
              {(CARE_TIPS[category.slug] ?? []).map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section>
        <h2 className="mb-4 text-xl font-bold">Care questions we hear a lot</h2>
        <div className="flex flex-col gap-3">
          {FAQ.map((item) => (
            <details
              key={item.question}
              data-testid="care-faq"
              className="group rounded-2xl border border-border bg-card px-5 py-4"
            >
              <summary className="cursor-pointer select-none text-sm font-semibold marker:text-primary">
                {item.question}
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
