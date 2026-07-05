# Contributing to Simulator

Thanks for helping build Simulator! This guide gets you from zero to a merged change.
The golden rule that keeps the project coherent:

> **Config drives data, accounts, and behavior toggles. Code provides the pages,
> components, behavior implementations, and the design system.**

## Prerequisites

- Node.js ≥ 24 and pnpm ≥ 11.
- `pnpm install` once at the repo root. (The MSW worker is committed; run `pnpm msw:init`
  only after upgrading `msw`.)

## The config-vs-code boundary

| Change                                                                      | Where                     |
| --------------------------------------------------------------------------- | ------------------------- |
| Add / edit an **account** (email, password, owned-data amount)              | **config**                |
| **Assign** an existing behavior to an account (e.g. `slowNetwork: true`)    | **config**                |
| Add / edit **seed data** (a product, a coupon), incl. flags like `stock: 0` | **config**                |
| Change the baked **seed / clock / locale / timezone**                       | **config**                |
| Teach components a **new behavior kind** (e.g. `flakyImages`)               | **code** (+ config types) |
| Add a **new page / flow / surface**, or change a page's structure           | **code** (a reviewed PR)  |
| The **design system / components**                                          | **code**                  |

Everything in [`packages/config/src/simulator.config.ts`](packages/config/src/simulator.config.ts)
is data; adding a brand-new page or a brand-new _kind_ of behavior is code.

## Add or change an account (config only)

1. Add a profile to `simulator.config.ts` with a stable `id`, `email`, `password`,
   `displayName`, and any `behaviors`.
2. Document the new known input in [`docs/whats-deployed.md`](docs/whats-deployed.md).
3. `pnpm validate && pnpm test`.

## Add a new behavior _kind_ (code)

1. Extend `BehaviorAssignments` (and its Zod schema) in `packages/config`.
2. Implement it where the handlers/components read the behavior context — e.g.
   `packages/domain` for data behavior, or `apps/site/src/mocks` for network behavior.
   Use `sim-kit` helpers, never ad hoc timers.
3. Assign it to an account in config and add a Playwright spec proving the behavior.

## Add a new page / flow (code)

1. Build it as hand-crafted components under `apps/site/src/areas/<surface>` using the
   `@autotests-simulator/ui` design system. Talk to your MSW handlers over real
   `fetch()`; read/write data through `@autotests-simulator/domain` (never bypass it),
   so state stays consistent across surfaces.
2. Add stable `data-testid`s and keep the DOM accessible — except where the page
   _deliberately_ exercises an accessibility pitfall (note it in `docs/best-practices.md`).
3. Use `sim-kit` for all determinism. **No bare `Math.random()` / `Date.now()` /
   `new Date()`** (ESLint blocks them in product code).
4. Wire localized variants as **data** where possible (a flagged seed item) so they're
   config-tunable; reserve structural differences for genuinely different pages.
5. Add a Playwright spec under `tests/` covering the flow and any deliberate pitfall,
   modelling the _robust_ approach from [`docs/best-practices.md`](docs/best-practices.md).
   Specs are regression guards — they are **not** shipped to the agent surface.
6. Keep it realistic: **no** difficulty/condition metadata, **no** seed/timing readouts,
   **no** repo link, **no** pitfall hints on the page.

## The checks

Every change must pass the full gate:

```bash
pnpm validate     # simulator.config is valid (unique ids/slugs, behaviors, references)
pnpm lint         # incl. determinism rules for product code
pnpm typecheck
pnpm test         # Playwright
```

## Commit & PR

- Keep PRs focused. One change per PR where possible.
- Run the checks above locally and fill in the PR template.
- By contributing you agree your work is licensed under [Apache-2.0](LICENSE) and that you
  follow our [Code of Conduct](CODE_OF_CONDUCT.md).
