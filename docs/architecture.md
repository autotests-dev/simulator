# Architecture

How a fully static site convincingly behaves like a real, stateful store — with no
application server, no database, and deterministic behavior.

## The one big idea

Everything a "backend" would normally do — serve a catalog, do cart math, authenticate,
validate forms, fail on bad input, add latency — happens **in the visitor's browser**. A
[Mock Service Worker](https://mswjs.io) (MSW) intercepts `fetch()` at the network layer,
so application code and the browser's network panel see ordinary HTTP requests and JSON
responses. The "server" is just JavaScript, and it ships inside the static bundle.

That makes the whole thing a pile of static files: build once, host anywhere that serves
HTTP(S), pay ~$0. The only hard requirement is a real origin (not `file://`), because a
service worker needs one.

## Request lifecycle

```
Component → fetch('/api/...') → MSW worker → handler → domain layer → localStorage
                                    │                        │
                                    └──── JSON Response ◄─────┘
```

1. A page calls `fetch()` through a thin [`api`](../apps/site/src/lib/api.ts) helper
   (usually via the `useApi` hook).
2. The MSW worker (`apps/site/src/mocks`) matches the route and runs a **handler**.
3. The handler calls the **domain layer** (`packages/domain`) — the real cart/checkout/
   auth logic — which reads and writes persisted state.
4. The handler shapes a `Response` (status, JSON, field errors), optionally after adding
   latency or injecting a deterministic failure for the active profile.

Nothing bypasses this path: every surface reads and writes the same domain layer, so the
cart on the storefront and the order in the back office stay consistent.

## Packages

| Package            | Responsibility                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `packages/config`  | `simulator.config` — typed, Zod-validated **build-time data**: accounts, seed catalog, behavior assignments.     |
| `packages/sim-kit` | Determinism toolkit: seeded RNG (mulberry32), injectable/frozen clock, deterministic ids, bounded timing.        |
| `packages/domain`  | The deterministic "backend": catalog resolution, cart/checkout math, auth, seeded order history, reset.          |
| `packages/ui`      | The Kote's design system — shadcn-style primitives, themed hard (coral/stone/teal, pill buttons, chunky radius). |
| `apps/site`        | The deployable app: pages/surfaces, the MSW handlers, and the client `api` helper.                               |

## Config drives data; code drives behavior

`simulator.config` is **data** — accounts, the seed catalog, and which behavior
_conditions_ each account carries. It is validated at build time (`pnpm validate`) and
baked into the bundle. Adding an account or a product is a config edit; adding a new
_page_ or a new _kind_ of behavior is code. (See [CONTRIBUTING.md](../CONTRIBUTING.md).)

## Determinism

Reproducibility is a hard constraint, so product code may not call `Math.random()`,
`Date.now()`, or `new Date()` (an ESLint rule enforces this; `sim-kit` is the only
exception). Instead:

- IDs, catalog jitter, and any "randomness" come from a **seeded RNG**.
- "Now" comes from an **injectable clock**, so dates and session expiry are stable.
- Latency and retries use **bounded, seeded timing**, never ad-hoc timers.

Same seed + same actions ⇒ same bytes, which is what lets a generated suite assert exact
values.

## Profiles: conditions resolved at the boundary

A profile's behaviors (`role`, `locale`, `slowNetwork`, `highErrorRate`, `locked`,
`stepUpReauth`, `sessionExpiresAfter`, …) are **not** scattered `if` checks in components.
Each condition is honored at the layer where it is naturally a property of that thing:

- **Network conditions** (`slowNetwork`, `highErrorRate`) live in the **MSW handlers** —
  they add latency or inject deterministic write failures. Components never see them.
- **Locale** is read once by a **`useFormat()` hook**; components format money/dates
  through it, never with an inline locale branch.
- **Role** gates the back office in the UI and is re-checked server-side (`requireAdmin`).
- **Auth conditions** (`locked`, `stepUpReauth`, `sessionExpiresAfter`) live in the
  **domain/auth layer** — refuse the login, demand a re-auth, or expire the session.

So a "slow connection" is a property of the network, not a prop threaded through the tree.
The site's DOM structure is identical across accounts; only the conditions around a flow
change.

## State and reset

All state is per-origin `localStorage` under a `kotes::` namespace (cart, session, seeded
orders/addresses, consent). A fresh browser context is a clean, seeded baseline;
loading any page with `?reset=1` clears the namespace and re-seeds.

## Why there are no "coordinates" in the deployed app

The shipped app contains **no** hint of where the pitfalls are — not in the DOM, the
bundle, or any in-page API — so an agent operating the live site can't read the answers.
The threat model is an agent _using the site_, not one reading this repository; the
Playwright specs under `tests/` are ordinary tests that name routes and assertions, and
are treated as spoilers. Ground truth for _kinds_ of pitfalls lives in
[`best-practices.md`](./best-practices.md); scoring a generated suite is
[`judging.md`](./judging.md).
