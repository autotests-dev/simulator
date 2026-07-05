# Judging a generated test suite

Simulator ships no oracle and no scoring engine. This document is the replacement: a
rubric a **human reviewer or an AI judge** can apply to a suite of tests that an agent
generated against Kote's. Every check is observable from the suite's code and its runs —
no knowledge of where any pitfall lives is required, and none is given here.

## How to produce the evidence

1. Have the agent generate its suite as a **guest** or signed in as the **baseline
   account** (`demo@kotes.test` — see [`whats-deployed.md`](./whats-deployed.md)), with
   **credentials parametrized**.
2. Run the suite once per relevant **condition account**, and — if it claims responsive
   coverage — once at a **mobile viewport**.
3. Judge with three inputs: the suite's source, the per-account run results, and this
   rubric.

**A failure is not automatically a defect.** Under the flaky-connection account, a test
that fails _with an accurate report of the surfaced server error_ is doing its job. The
defects the matrix exposes are suites that **hang, false-pass, crash without explanation,
or assert one account's rendering** — judge the failure mode, not the red X.

Score each applicable check `pass` / `flag` / `n/a` (n/a when the suite's stated scope
never touches that surface). A `flag` is a concrete finding to report, with the test and
line in question.

## Rubric

### Selectors & structure

| Check                                                                                     | Fails when…                                                      |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Locators are testids, roles + accessible names, or labels — scoped to a meaningful region | raw visible-text or CSS-class/`nth()` chains are load-bearing    |
| Repeated UI text is disambiguated by scoping, not by index                                | the same visible string in another region would break the test   |
| Assertions distinguish the visible control from hidden responsive duplicates              | strict-mode violations, or force-clicks on the hidden duplicate  |
| Content inside embedded frames and shadow roots is reached with the proper mechanism      | the suite asserts such content is absent, or greps the outer DOM |
| Truncated display text is not asserted as the full value                                  | assertions bake in an ellipsized string                          |

### Waiting & timing

| Check                                                                         | Fails when…                                                 |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------- |
| No fixed sleeps; waits target observable state                                | `waitForTimeout`-style pauses gate assertions               |
| The suite passes unchanged under the slow-connection account                  | timeouts or ordering assumptions break at higher latency    |
| Debounced inputs are given their settle time via state-based waits            | assertions race the keystroke                               |
| Transient messages (toasts) are not the durable evidence                      | the only assertion is on a message that auto-dismisses      |
| Optimistic UI is asserted at its settled value, including rollback on failure | the optimistic intermediate state is treated as the outcome |
| Lazily loaded content is loaded before being asserted                         | only the default-visible page of content is ever considered |

### State & sessions

| Check                                                                            | Fails when…                                                     |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Each test builds its own state (or resets) in a fresh context                    | tests depend on leftovers from exploration or other tests       |
| Credentials are parameters; expectations derive from the account in use          | one account's locale/data rendering is hardcoded                |
| A mid-flow re-authentication demand is detected and handled                      | the suite hangs or errors uninformatively at the step-up prompt |
| A session that ends mid-flow is detected; the suite re-authenticates and resumes | an unexplained failure or a false pass after the sign-out       |
| Empty-data accounts produce empty-state assertions, not crashes                  | the suite assumes an order/address exists for every account     |

### Domain correctness

| Check                                                                         | Fails when…                                            |
| ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| Expected totals derive from the published rules and the actions performed     | a single observed value is replayed as the expectation |
| Threshold behaviors (coupon minimums, free shipping) are exercised both sides | only the qualifying side is tested                     |
| Out-of-stock, disabled, error, and empty states are asserted, not skipped     | only happy paths exist                                 |
| Invalid operations assert the explanation and the unchanged value             | "no crash" is treated as success                       |
| Bulk/partial outcomes are asserted per row plus summary                       | a partial failure is read as all-or-nothing            |

### Flows & environment

| Check                                                                             | Fails when…                                                   |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Overlays (consent) are dismissed via their controls before acting                 | clicks are forced through the overlay                         |
| Hover/focus-revealed controls are revealed before use                             | the suite clicks blind or forces actionability                |
| Collapsed disclosures are expanded before their content is asserted               | hidden text is asserted by DOM presence alone                 |
| In-page anchor clicks assert the scrolled-to section, not a navigation            | the suite waits for a page load that never happens            |
| File-upload steps drive the input or the chooser and verify the selection         | the attachment flow is skipped or crashes the run             |
| New-tab links are handled deliberately (popup handled or target asserted)         | the suite loses its page context or silently ignores the flow |
| Multi-step forms are tested per step, including Back and per-step validation      | only the end-to-end happy path is covered                     |
| Custom widgets are driven like a user                                             | native-control APIs are aimed at non-native widgets           |
| The declared viewport is respected; responsive claims are tested at that viewport | desktop assumptions run against a mobile claim                |
| The suite runs with one documented command from a clean checkout                  | hidden local state or manual steps are required               |

## Suggested verdict

- **Robust** — no flags across the matrix; failures (if any) are accurate reports.
- **Brittle** — flags concentrated in _Waiting & timing_ or _Selectors & structure_: the
  suite would fight legitimate app changes.
- **Shallow** — flags concentrated in _Domain correctness_ or _State & sessions_: the
  suite passes today but verifies too little to catch regressions.

Report each flag with the family it maps to (see
[`best-practices.md`](./best-practices.md)) so the author gets the lesson, not just the
location.
