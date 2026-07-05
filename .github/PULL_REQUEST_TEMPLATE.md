## What & why

Briefly describe the change. Link any related issue.

## Checklist

- [ ] `pnpm validate` passes (simulator.config is valid)
- [ ] `pnpm lint` and `pnpm typecheck` pass
- [ ] `pnpm test` (Playwright) passes
- [ ] Money is in integer cents; no `Math.random()` / `Date.now()` / `new Date()` in product code
- [ ] New variants are reached by a route or an account — no on-page knobs or control plane
- [ ] Stable `data-testid`s + accessible DOM (except declared a11y-pitfall pages)
- [ ] No test-rig tells, no repo link, and no pitfall hints on any page
