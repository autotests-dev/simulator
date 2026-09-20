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

Domain records retain their original JSON shape; schema versions live beside them
in `kotes::$version:<record>` keys. Every read validates the value. Startup unwraps
valid v0.1.2 `{ version: 1, value: ... }` envelopes, including records on unvisited
pages, so v0.1.1 readers and rollback builds can still read the saved state.
Valid unversioned saves acquire version metadata without changing their shape. Malformed JSON, invalid nested
data, and unsupported versions re-seed only the affected record; unrelated records
and other storage namespaces are preserved. Consent remains a plain preference.
Recovered order/address counters continue beyond IDs in the retained records.
When changing a persisted shape incompatibly, bump its version in
`packages/domain/src/persistence.ts` and decide whether to migrate or re-seed it.

If storage reads or writes fail after startup, a page-local copy keeps domain
operations usable. Unsaved changes cannot survive a reload or propagate to another
tab. A reset still takes effect in the current page when removal is blocked, but
cannot guarantee removal of inaccessible disk data. With healthy storage, reads
continue to see persisted changes made by other tabs.

A new tab can exchange compatible records with either prior release. A v0.1.2 tab
still writes envelopes, so reload those tabs before also using a v0.1.1 tab; a new
build cannot repair communication between two already-running old builds.
Incompatible future shape changes still require an explicit migration/rollback plan.

The app renders a loading screen until MSW is ready. Startup times out after 15
seconds; late completion cannot replace the recovery screen. A rejected startup (including
MSW's own storage initialization when browser storage is blocked) shows a retry
screen. Retry reloads the same URL to recover failed module imports and worker
registration without creating duplicate workers or React roots. Startup errors do
not trigger a domain reset; the explicit `?reset=1` behavior still applies.

## Page loading and browser checks

Route components load on demand with an accessible loading state and reload-based
recovery if a chunk download fails. Dynamic JavaScript preloads are disabled to
avoid [WebKit bug 270357](https://bugs.webkit.org/show_bug.cgi?id=270357), which
caches failed preloads across reloads. HTML entry preloads remain enabled; dynamic
imports may incur an extra dependency round trip. `pnpm check:bundle` caps the entry plus all
static JavaScript imports at 135 KiB gzip. This is a parsing budget, not total
startup transfer: the domain and MSW also load before the app becomes interactive.
The command separately reports the combined size of all JavaScript chunks.

Chromium runs the full regression suite plus a mobile viewport. Firefox and WebKit
run login, checkout, lazy-page, storage, and startup smoke checks. Upgrade tests use
frozen v0.1.1/v0.1.2 storage readers in a second tab in Chromium and WebKit. Firefox
skips those two tests because of [Playwright #37012](https://github.com/microsoft/playwright/issues/37012):
the patched browser loses service-worker control after a navigation bypasses the
worker. Chunk-failure injection after worker activation is Chromium-only because
Playwright cannot reliably route worker-owned requests in the other engines.
These are explicit coverage gaps, not claims of complete browser parity.

## Why there are no "coordinates" in the deployed app

The shipped app contains **no** hint of where the pitfalls are — not in the DOM, the
bundle, or any in-page API — so an agent operating the live site can't read the answers.
The threat model is an agent _using the site_, not one reading this repository; the
Playwright specs under `tests/` are ordinary tests that name routes and assertions, and
are treated as spoilers. Ground truth for _kinds_ of pitfalls lives in
[`best-practices.md`](./best-practices.md); scoring a generated suite is
[`judging.md`](./judging.md).
