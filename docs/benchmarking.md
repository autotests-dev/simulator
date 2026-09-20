# Reproducible account comparisons

The matrix runner repeats one parametrized Playwright suite against a snapshot of a
local production build. It records outcomes and evidence for the [judging rubric](judging.md);
it does not assign a quality score or expose benchmark controls in Kote's.

## Run a suite

Use Node 24 and the pinned pnpm version on Linux or macOS (WSL on Windows):

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium
pnpm build
pnpm benchmark --suite benchmarks/example
```

The default matrix is baseline, slow connection, flaky connection, German, French,
and expiring-session accounts (`prof-demo`, `prof-ays`, `prof-noor`, `prof-lena`,
`prof-marc`, `prof-tomas`) on Chromium. The included example attempts two cart writes:
five rows pass and the flaky account reports the injected second-write failure.
That nonzero exit is intentional evidence, not a broken runner. The example does not
exercise every account condition, including session expiration.

Select accounts and engines explicitly:

```bash
pnpm exec playwright install --with-deps chromium firefox webkit
pnpm benchmark --suite benchmarks/example \
  --accounts prof-demo,prof-ays \
  --browsers chromium,firefox,webkit \
  --timeout-ms 120000 \
  --output artifacts/my-comparison
```

`--accounts all` includes every configured account, including the suspended account;
a suite that expects every login to succeed will report failures. Unknown accounts,
unknown browsers, stale build evidence, and an existing output directory are errors.
The runner starts its own loopback server on an available port and stops it when done.
It runs a local build; it does not label an arbitrary remote URL as a known release.

## Suite contract

Point `--suite` at a dedicated directory containing `*.spec.ts`, `*.spec.js`,
`*.spec.mts`, or `*.spec.mjs`. Specs must import this installation of
`@playwright/test`; install suites beneath this checkout, or arrange equivalent
module resolution. Read the credentials from the environment:

```ts
process.env.SIMULATOR_ACCOUNT_ID;
process.env.SIMULATOR_ACCOUNT_EMAIL;
process.env.SIMULATOR_ACCOUNT_PASSWORD;
```

Use Playwright's `page` fixture and relative navigation (`page.goto('/login')`).
The runner config supplies `baseURL`, desktop viewport 1280 × 720, UTC timezone,
`en-US` browser locale, one worker, zero retries, and a fresh context per test. The
account's own locale still controls the app's formatting. Rows run sequentially in
separate processes. Suites with custom fixtures can import them; the suite's own
Playwright config is not loaded. External services or additional fixture inputs
must be pinned and documented by the suite author.

The default per-test timeout is 30 seconds (specs can override it), and each suite process has
a 120-second wall-clock deadline. `--timeout-ms` changes that deadline; hangs
terminate the test and browser process group, with a two-second forced-kill grace
period. Checking a browser version before its first row has a separate 15-second
launch timeout. Failed, timed-out, incomplete, and
interrupted runs return nonzero. Skipped-only or partially skipped suites cannot
produce a green row. A failure does not prevent later rows from running. Ctrl+C
preserves completed rows and marks unfinished rows; incomplete results are not a
completed comparison.

## Evidence and identity

Every build emits `artifacts/benchmark-build.json`, outside the static deployment:

- Simulator version, Git commit and dirty flag; Git fields are `null` in source
  archives or Docker contexts without Git metadata.
- SHA-256 of the baked config and pnpm lockfile.
- Per-file hashes and an aggregate hash of the static build.

The runner verifies those hashes and copies the exact build into its output's
`site/` directory before starting. Changing the working build cannot change an
in-progress run. It also records suite file hashes, Node/Playwright/browser versions,
platform, architecture, viewport, timezone, retry policy and deadlines. Editing
suite files during a run invalidates the comparison. Git commit plus a dirty flag
alone is not an exact source revision; retain the build snapshot and suite source
when reproducing a dirty run.

Each output directory contains:

- `results.json` and `results.md`: all account/browser rows, durations and statuses.
  “Expected” counts follow Playwright's semantics, including expected failures.
- A directory per row with `run.log`, `playwright.json`, and failure traces/screenshots
  when Playwright can finish writing them. Forced termination may leave no JSON or
  trace; the matrix still records the timeout and retains the log.
- `site/`: the verified static build used by the comparison.

The summary does not include passwords. Raw test logs and traces can contain typed
credentials or other suite inputs; account credentials shipped by this simulator
are public test data. All output is ignored by Git and excluded from Docker builds.
CI retains benchmark artifacts for 14 days; release deployment identities are kept
for 90 days. Archive evidence externally when longer retention is needed.

The [browser coverage notes](architecture.md#page-loading-and-browser-checks) describe
Playwright's Firefox multi-tab and worker-request interception limitations. These
also apply to supplied suites; the runner records their failures without suppressing
them. Browser-version fingerprints help distinguish those failures from app changes.
