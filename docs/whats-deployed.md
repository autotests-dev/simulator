# What's deployed

The deployment-specific companion to [`best-practices.md`](./best-practices.md). It lists
the **known inputs** (meant to be discoverable) and **which pitfall families** this build
exercises — at the family level, with **no mapping to pages or selectors**. That mapping
lives only in the Playwright specs under [`tests/`](../tests) — part of this repository,
never shipped to the deployed site. If you point an agent at the repo, treat them as
spoilers (see [`best-practices.md`](./best-practices.md)).

## The design: a benign baseline, plus condition accounts

Kote's is built in two layers:

- **The baseline site** — what guests and the baseline account see — runs under **benign
  conditions**: normal latency, reliable writes, `en-US` formatting, a session that lasts.
  It is still a real store, and real stores have furniture: iframes, responsive layouts
  with duplicated controls, overlays, transient toasts, debounced inputs, out-of-stock
  items, business rules, and the occasional sloppy markup. A well-written test handles
  those from day one, on every account.
- **Condition accounts** each switch on one adverse condition — a slow connection, flaky
  writes, a different locale, a session that expires. The site's structure never changes
  between accounts; the conditions around your flow do.

The intended workflow — **the account matrix**:

1. Point your agent or test generator at the site as a **guest** or signed in as the
   **baseline account**, and have it write tests with **parametrized credentials**.
2. Re-run the same suite with each condition account — and, if you cover responsive
   behavior, at a mobile viewport.
3. A robust suite passes everywhere, or fails with an accurate, explained report (a
   surfaced server error is a legitimate result). What the matrix exposes are suites that
   hang, false-pass, or bake one account's rendering into their assertions.

## Known inputs

These are public and intended to be used — a normal sign-in page, normal promo codes.

### The baseline account

All seeded accounts use the password **`demo1234`**.

| Email             | Notes                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| `demo@kotes.test` | The **baseline member** — benign conditions, a short order history and a saved address. Generate your tests here. |

You can also create your own account at `/signup` — it exists only in your browser
context, starts with no data, and a reset clears it. Password resets are simulated: the
reset "email" is never actually sent, and the response never reveals whether an account
exists.

### Condition accounts

Each account carries one condition; everything else matches the baseline.

| Email               | Condition                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| `ren@kotes.test`    | Another plain member (no adverse condition).                                                       |
| `ays@kotes.test`    | A **slow connection**, plus a large order history that paginates.                                  |
| `noor@kotes.test`   | A **flaky connection** — a deterministic share of writes fail (a retry succeeds).                  |
| `lena@kotes.test`   | Locale: money and dates format as **`de-DE`**.                                                     |
| `marc@kotes.test`   | Locale: money and dates format as **`fr-FR`**.                                                     |
| `jordan@kotes.test` | **Suspended** — sign-in is refused with an explanation.                                            |
| `kai@kotes.test`    | A **brand-new member** — no orders, no saved addresses, no saved cards.                            |
| `priya@kotes.test`  | **Step-up re-auth** — viewing saved cards demands the password again once per sign-in.             |
| `tomas@kotes.test`  | **Expiring session** — the session ends after a fixed number of requests; sign in again to resume. |
| `avery@kotes.test`  | An **admin** — can sign in to the back office (`/backoffice`).                                     |

The back office lives at `/backoffice` and is not linked from the storefront; reach it by
URL and sign in with an admin account.

### Promo codes

| Code        | Effect                         |
| ----------- | ------------------------------ |
| `WELCOME10` | 10% off, no minimum.           |
| `HOME15`    | 15% off orders of $75 or more. |
| `TENOFF`    | $10 off orders of $40 or more. |

No real payment is taken. A fresh browser context (or loading any page with `?reset=1`)
returns everything to its seeded baseline.

The cart is stored per browser context — like a cookie cart, it survives signing in and out
within that context. Orders, addresses, and payment methods belong to the signed-in account.

## Pitfall families present in this build

Family-level only — not where they live.

**Baseline (structural — present for every account, including guests):**

- `locator.repeated-text`, `locator.hidden-duplicate-dom`, `locator.iframe-or-shadow` (both halves)
- `visibility.inference`, `visibility.disabled-state`, `visibility.hover-reveal`, `visibility.collapsed-content`
- `async.delayed-update`, `async.optimistic-rollback`, `async.transient-toast`, `async.debounce`, `async.lazy-content`
- `state.clean-session`
- `domain.pricing-threshold`, `domain.invalid-noop`, `domain.inventory`, `domain.partial-failure`
- `forms.submit-validation`, `forms.conditional-fields`, `forms.multi-step`, `forms.custom-widgets`, `forms.file-upload`
- `navigation.overlay`, `navigation.new-window`, `navigation.in-page-anchor`, `responsive.mobile-first`
- `data.sorting-filtering`, `data.truncated-text`
- `security.sanitization-ui`, `accessibility.degraded-semantics`

**Added by condition accounts:**

- `async.slow-or-failing-network`
- `data.locale-format`, `data.empty-state`
- `state.reauth`, `state.expiry`
- `navigation.pagination` (data volume)
- `visibility.permission-gate`, `security.authz-ui`

This is the menu the current deployment exercises, not a promise that every conceivable
family is present.
