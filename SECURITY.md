# Security policy

## Supported versions

This project is distributed as a static site with no backend. Only the latest release
(and `main`) receives fixes; there are no long-term support branches.

## Reporting a vulnerability

Please report security issues **privately**, not in public issues or pull requests:

- Use GitHub's **[Report a vulnerability](https://github.com/autotests-dev/simulator/security/advisories/new)**
  (repository **Security → Advisories**) to open a private advisory.

We aim to acknowledge a report within a few days and will coordinate a fix and
disclosure with you.

## Scope — please read first

Kote's is a **deliberately imperfect** application. It reproduces the flaky selectors,
race conditions, missing ARIA semantics, and permissive-looking flows that make
automation brittle — these "pitfalls" are the product, are documented in
[`docs/best-practices.md`](docs/best-practices.md), and are **not** security
vulnerabilities. Likewise:

- There is **no real backend, database, or secrets** — all "API" behavior is a
  [Mock Service Worker](https://mswjs.io) running in the visitor's browser, and all
  accounts/passwords are fictional demo values published in
  [`docs/whats-deployed.md`](docs/whats-deployed.md).
- All state is per-browser `localStorage`; there is no cross-user data to exfiltrate.

Reports we **do** want: a way to execute untrusted code against a visitor (XSS via the
static site or a dependency), a supply-chain issue in the build, or anything that lets
one visitor affect another. When in doubt, report it privately and we'll triage.
