# Robust testing — best practices

Kote's looks like an ordinary store, but it deliberately reproduces the places where
browser agents and test-generation tools usually produce brittle or incomplete coverage.
This document names the **kinds** of pitfalls it exercises and the **robust practice**
each one teaches — in general terms only.

> **The one rule:** this document contains **no coordinates**. It never says "the trap is
> on page X" or "assert testid Y". It describes pitfall _families_ and good habits, the
> kind of thing you could learn from the open web. The only deployment-specific facts it
> publishes are **known inputs** — see [`whats-deployed.md`](./whats-deployed.md).
>
> **What "no coordinates" covers.** Nothing location-specific is shipped in the **deployed
> app** — not in the DOM, the bundle, or any in-page API — so an agent operating the live
> site cannot read the answers. The **source repository is a separate artifact**: these
> docs are coordinate-free, but the Playwright specs under `tests/` are ordinary tests
> that name concrete routes and assertions. The threat model is an agent **using the
> site**, not one reading the source — if you point an agent at the repo, treat the tests
> as spoilers.

There is no scoring engine and no oracle. A human (or an AI judge) scores generated tests
against the rubric in [`judging.md`](./judging.md), which operationalizes this document.

## How a robust test should behave (short version)

- Prefer **stable anchors** — a `data-testid`, or a role + accessible name scoped to a
  meaningful region. Avoid raw visible-text and CSS-class locators.
- **Wait for observable state**, never fixed sleeps; assert the value that changed.
- **Report the current UI**, never inferred capability.
- **Set up your own state**, or reset; don't rely on exploration leftovers.
- **Derive expected values from the rules and the actions performed**, not a single
  happy-path guess.
- **Assert disabled / empty / error / out-of-stock states**, not only success.
- Handle **responsive** layouts and **locale** formatting deliberately.
- **Parametrize credentials** and derive expectations from the account in use — its
  locale, its connection, its data — never from one account's rendering.
- Keep each test **single-session** — set up and observe within one browser context. A
  fresh context is a clean, seeded baseline.

## Pitfall families & the lesson each teaches

"Catches" = the brittle/incomplete pattern the family exposes. "Robust practice" = what a
good test does instead. (No locations — by design.)

### Locator

| Family                         | Catches                                                                 | Robust practice                                                                             |
| ------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `locator.repeated-text`        | Unscoped text locators when the same text appears in many places        | Scope to the smallest meaningful region; prefer role + name or a testid                     |
| `locator.hidden-duplicate-dom` | Strict-mode failures from elements duplicated across responsive layouts | Use the accessibility tree (role/name), which excludes hidden duplicates; assert visibility |
| `locator.unstable-css`         | Coupling to CSS classes / DOM shape                                     | Avoid class selectors and brittle `nth()` chains                                            |
| `locator.iframe-or-shadow`     | Missing content inside an iframe (or shadow root)                       | Enter the frame (`frameLocator`) / pierce shadow DOM before asserting                       |

### Visibility

| Family                         | Catches                                                    | Robust practice                                                         |
| ------------------------------ | ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| `visibility.inference`         | Claiming availability from expectation, not the current UI | Report what's shown; assert the unavailable state and any fallback      |
| `visibility.disabled-state`    | Force-clicking or ignoring disabled controls               | Assert the disabled state and its reason; never force the click         |
| `visibility.permission-gate`   | Assuming a control is available regardless of role         | Check role-specific access; assert the gate for non-privileged accounts |
| `visibility.hover-reveal`      | Clicking controls that only appear on hover or focus       | Hover (or focus) the container first; assert the control is actionable  |
| `visibility.collapsed-content` | Asserting content inside a collapsed disclosure            | Expand it first; assert visibility, not mere DOM presence               |

### Async

| Family                          | Catches                                                   | Robust practice                                                       |
| ------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------- |
| `async.delayed-update`          | Asserting before the UI settles                           | Wait for the visible value to change, not a fixed timeout             |
| `async.slow-or-failing-network` | Fixed sleeps / short default assumptions                  | Use state-based waits; the same flow may run under a slow connection  |
| `async.debounce`                | Racing a debounced input (e.g. search)                    | Type, then wait for the debounced result, not the keystroke           |
| `async.optimistic-rollback`     | Asserting the optimistic state before the server confirms | Wait for the settled state; assert the rollback + error when it fails |
| `async.transient-toast`         | Racing an auto-dismissing toast                           | Assert durable state (badge/record), not the transient message        |
| `async.lazy-content`            | Asserting only what loads by default (show-more, scroll)  | Trigger the load and wait for the appended items before asserting     |

### State

| Family                | Catches                                                 | Robust practice                                                    |
| --------------------- | ------------------------------------------------------- | ------------------------------------------------------------------ |
| `state.clean-session` | Relying on exploration leftovers                        | Create the state you need, or reset; don't assume a populated cart |
| `state.reauth`        | Not handling a step-up prompt before a sensitive action | Detect the re-auth prompt, re-authenticate, and resume the action  |
| `state.expiry`        | Not handling a session that ends mid-flow               | Detect the signed-out state, sign in again, and resume the action  |

### Domain

| Family                     | Catches                                  | Robust practice                                                 |
| -------------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| `domain.pricing-threshold` | Incorrect business-rule coverage         | Derive totals from the labelled rules and the actions performed |
| `domain.invalid-noop`      | Treating "no error" as success           | Assert unchanged values and the explicit explanation            |
| `domain.inventory`         | Ignoring stock limits                    | Test out-of-stock and quantity caps, not just the happy path    |
| `domain.partial-failure`   | Treating a bulk action as all-or-nothing | Assert per-row outcomes and the success/skipped summary         |

### Forms

| Family                     | Catches                                                                                         | Robust practice                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `forms.submit-validation`  | Checking validation before it exists                                                            | Submit invalid data, assert field errors, fix, verify recovery                                             |
| `forms.conditional-fields` | Missing dynamic requirements                                                                    | Drive the condition; assert controls enable/disable as required                                            |
| `forms.multi-step`         | Skipping wizard navigation / back behavior                                                      | Test each step, that Back preserves data, and per-step validation                                          |
| `forms.custom-widgets`     | Driving styled widgets with native-control APIs (selectOption on a listbox that isn't a select) | Interact like a user — open, choose, then assert the committed value                                       |
| `forms.file-upload`        | Flows that require attaching a file                                                             | Drive the file input (set files / handle the chooser); assert the selection is reflected before submitting |

### Navigation, responsive & data

| Family                      | Catches                                                     | Robust practice                                                                          |
| --------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `navigation.pagination`     | Assuming the target is on page one                          | Paginate like a user; assert the final target                                            |
| `responsive.mobile-first`   | Desktop-only assumptions                                    | Work at the declared viewport, or test both layouts deliberately                         |
| `navigation.overlay`        | Click interception by a modal/consent overlay               | Detect the overlay and dismiss it via its controls before proceeding                     |
| `navigation.new-window`     | Losing the flow when a link opens a new tab                 | Handle the new page/popup deliberately, or assert the link's target                      |
| `navigation.in-page-anchor` | Waiting for a page navigation after an in-page anchor click | Assert the target section scrolls into view; don't await a load that never comes         |
| `data.locale-format`        | Hardcoded money/date text                                   | Scope by label; use format-tolerant assertions                                           |
| `data.sorting-filtering`    | Wrong table semantics                                       | Assert ordered/filtered rows within the active table scope                               |
| `data.truncated-text`       | Matching the ellipsized string you can see                  | Anchor on stable attributes or scoped partial matches; read the full value at its source |
| `data.empty-state`          | Assuming data exists (an order to open, a saved address)    | Assert the empty state and the path out of it                                            |

### Security-relevant UI & accessibility

| Family                             | Catches                             | Robust practice                                                                       |
| ---------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------- |
| `security.authz-ui`                | Missing authorization behavior      | Assert denial + a visible explanation, and that no state mutated                      |
| `security.sanitization-ui`         | Over-trusting rendered user content | Assert HTML-like input renders as escaped text, never executes                        |
| `accessibility.degraded-semantics` | Over-trusting the a11y tree         | Use robust anchors; report weak semantics; don't assume every control has a role/name |

## Global review rules (properties of the output, not the page)

| Rule                           | What it catches                                                           |
| ------------------------------ | ------------------------------------------------------------------------- |
| `process.output-hygiene`       | Debug specs, temp files, dependency churn, unrequested rewrites           |
| `process.reproducible-command` | Tests that can't be run with a clear command or assume hidden local state |
| `process.minimal-change-scope` | Broad project changes when only tests were requested                      |
