# Surviving Salesforce releases

The real test of this suite is not whether it passes today; it is **how many helper methods you touch after each release**.

## Where UI knowledge lives
| File | Knows about |
|---|---|
| `tests/l3-ui/_tle.ts` | the Transaction Line Editor: open · searchProduct · addLine · setQuantity · configure · configurationError · setDiscount · price · save · linePrice · quoteTotal · bundleChildren |
| `tests/l3-ui/_pages.ts` | standard record pages: newAccount · approveQuote · validation messages · home |
| `tests/l3-ui/**/*.spec.ts` | **nothing** — lint fails on any `page.getBy*` / `locator(` in a spec |

Every helper method has `@since` and `@verified` lines. Change a method → update `@verified` and cite the DOM/release change in a comment, or Gatekeeper rejects it.

## Metric 9 — helper changes per release
```bash
git tag release/winter-26        # tag once per Salesforce release you have verified against
npm run helper-churn             # methods changed in _tle.ts since the last release/* tag
```
Target: ≤ 3 per release and falling. Above that, revisit the locator strategy (accessible names, roles), not the tests.

## Preview-day drill (each seasonal release)
1. The day the preview sandbox is upgraded: `sf org login web --alias RCA_PREVIEW`, add it to `platform.config.yaml`.
2. `npm run l0:extract -- RCA_PREVIEW --rca && npm run l0:check -- RCA_PREVIEW` — object/field renames show up as SKIPPED.
3. `TARGET_ORG=RCA_PREVIEW npm run test:l1 && npm run test:l2` — API changes surface here first; a failure is a behaviour change, not UI.
4. `TARGET_ORG=RCA_PREVIEW npx playwright test --project=l3-ui` — list the failing helper methods (Triager tags them **UI change**).
5. Fix in `_tle.ts` / `_pages.ts` / `objects.yaml` only; update `@verified API <n>.0`; `npm run helper-churn`; record the number.
6. `git tag release/<name>` once green.

## Why L3 stays ≈10%
Bundles, attribute pricing, constraint rules, amendments and renewals are **logic** — proven through Place Sales Transaction and the lifecycle actions (L1/L2), which change far less than the editor's DOM. One Transaction Line Editor journey per feature proves the persona can do it on screen.

Baseline: **API 68.0 (Winter '26)**. Accessible names in `_tle.ts` are defaults and must be confirmed on first contact with an RCA org.
