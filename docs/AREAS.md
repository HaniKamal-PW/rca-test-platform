# What the platform tests, by area — worked example for each

| Area | Story | Tests | Proves |
|---|---|---|---|
| **Account** | RCA-010 | `l1-api/RCA/RCA-010-S1` (positive + validation-rule negative) · `l3-ui/RCA/RCA-010-S2` | type → price book; rules; persona view |
| **Opportunity** | RCA-011 | `l1-api/RCA/RCA-011-S1` | synced quote drives Amount; unsynced does not |
| **Quote — RCA pricing** | RCA-001 | `l1-api/RCA/RCA-001-S1` | Place Sales Transaction totals vs expected results |
| **Bundles** | RCA-020 | `l1-api/RCA/RCA-020-S1` (with/without optional child) · `l3-ui/RCA/RCA-020-S2` (the ONE Transaction Line Editor journey) | required/optional children, totals; what the rep sees |
| **Attribute pricing** | RCA-021 | `l1-api/RCA/RCA-021-S1` | attribute value changes net unit price |
| **Configuration rules** | RCA-022 | `l1-api/RCA/RCA-022-S1` | constraint model rejects invalid, accepts valid |
| **Approvals** | RCA-012 | `l2-lifecycle/RCA/RCA-012-S1` · `l3-ui/RCA/RCA-012-S2` (approver persona) | threshold, approver, status transitions |
| **Order** | RCA-013 | `l2-lifecycle/RCA/RCA-013-S1` | quote → order lines → activation → opp Closed Won |
| **Amendment** | RCA-023 | `l2-lifecycle/RCA/RCA-023-S1` | prorated delta line; asset quantity after |
| **Renewal** | RCA-024 | `l2-lifecycle/RCA/RCA-024-S1` | uplift, total, new term start |
| **Catalog (L0)** | — | `tests/l0-catalog` | integrity A–F, reference data R, parity |

## API-first, UI-last
Opportunity, quote, lines, bundles, pricing, approvals, orders, amend/renew are **all proven through APIs** (`sf` client in `tests/l1-api/_harness.ts`, `Chain` in `tests/l2-lifecycle/_chain.ts`:
`account → opportunity → quote | placeQuoteRCA → setQuoteStatus → syncQuoteToOpportunity → order → activateOrder → assets → amend → renew → cancel`).
The Transaction Line Editor is used for exactly what a persona must see or do — one journey per area — through `tests/l3-ui/_tle.ts`. Specs hold no locators (lint-enforced). See `docs/RELEASES.md`.

## Personas
`platform.config.yaml → orgs.<ORG>.personas` maps a persona to a Salesforce CLI alias (one test user each). `global-setup.ts` saves one session per persona; a UI test picks it with `test.use({ storageState: \`.auth/${PERSONA_ALIAS("approver")}.json\` })`. Until you have separate users, point every persona at the same alias.

## Confirm in your org before the first green run (API 68.0 / Winter '26)
- Price book names (`Standard GBP`, `Partner GBP`), product codes (`SUB-ANALYTICS-PRO`, `BND-ANALYTICS-SUITE`, `ADD-PREMIUM-SUPPORT`), selling model `Term Annual`, attribute `Tier`; multi-currency on/off.
- The Ids marked `01tXXXX…` / `0jPXXXX…` in `expected/RCA/*.yaml`.
- Place Sales Transaction request shape (`pricingPref`, `configurationPref`, `configurationInput`, `AttributeSelections`) and the amend / renew / cancel action bodies — marked "confirm in your org" in `_harness.ts` and `_chain.ts`.
- The validation rule, approval process, flow and constraint model the stories name.
- Quote `Status` and Order `Status` picklist values; asset lifecycle fields.
- The editor's accessible names in `_tle.ts` (`npx playwright codegen <org-url>` once on the editor).
A missing prerequisite surfaces as a **data** finding in Triager's report, not as a defect.

## Cleanup
`npm run sweep -- RCA DEV --dry` lists run-tagged records older than 48h; without `--dry` deletes them (children first; activated orders → Draft first; undeletable → reported). Refuses production and read-only orgs.
