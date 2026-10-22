# RCA Test Platform

Agentic test platform for **Salesforce Revenue Cloud Advanced (RCA)** — Account, Opportunity, Quote, bundles and
configuration rules, pricing, approvals, orders, amendments and renewals. Built for **API 68.0 (Winter '26)**;
the harness reads the org's live API version at runtime.

**Pattern:** create Accounts, Opportunities, Quotes, lines and baseline data through the API and prove the logic there.
Use Playwright only for the **Transaction Line Editor** steps a persona must see or do, through one reusable helper
(`search · add line · configure · price · save · validate price`). After a Salesforce release only that helper changes —
and `npm run helper-churn` counts how much.

- **L0** catalog integrity and org parity — one read-only extract per org into a local SQL snapshot (DuckDB), then SQL checks and a natural-key diff
- **L1 / L2** Place Sales Transaction, lifecycle actions (amend / renew / cancel), approvals, standard REST — against human-owned expected results
- **L3** one Transaction Line Editor journey per area, per persona; zero locators in spec files (lint-enforced)
- **Four agents** write, review and explain tests. **They never decide pass/fail and never merge.**

## Quick start
```bash
npm install && npx playwright install chromium && pip install -r requirements.txt
sf org login web --alias RCA_DEV
npx playwright test tests/l3-ui/RCA/SMOKE-001.spec.ts --project=l3-ui --headed
```
Then Copilot Chat → Agent mode → **Intake** → paste a story. Full steps: [docs/SETUP.md](docs/SETUP.md).

## The four agents
| Agent | Job |
|---|---|
| **Intake** | you paste the story; resolves project / env / persona; readiness gate (READY / WEAK / BLOCKED); derives scenarios; picks tests |
| **Builder** | checks prerequisites exist; fixtures; expected files; L1/L2 tests on `sf` + `Chain`; L3 tests on `TransactionLineEditor`; dry-runs; heals in the helper only |
| **Gatekeeper** | read-only review: hard waits, ID selectors, locators outside the helper, literal or weakened assertions, helper changes without a cited reason |
| **Triager** | runs the tests; classifies failures (data / environment / drift / platform automation / **UI change** / defect / flake); explains L0 findings; run summary |

Why four and not nine: Intake owns everything that is "read the story and decide"; Builder owns everything that is "write code";
Gatekeeper must be a different agent from the one that wrote the code; Triager owns "explain what the run found". Fewer hand-offs, same guardrails.

## Worked examples (one per area)
| Area | Story | Area | Story |
|---|---|---|---|
| Account | RCA-010 | Bundle (API + one TLE journey) | RCA-020 |
| Opportunity | RCA-011 | Attribute pricing | RCA-021 |
| RCA pricing | RCA-001 | Configuration rules | RCA-022 |
| Approvals (approver persona) | RCA-012 | Amendment (proration) | RCA-023 |
| Order | RCA-013 | Renewal (uplift) | RCA-024 |

Details and what to confirm in your org: [docs/AREAS.md](docs/AREAS.md) · Flow: [docs/FLOW.md](docs/FLOW.md) ·
Releases and metric 9: [docs/RELEASES.md](docs/RELEASES.md) · Orgs and personas: [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md)

## Demo: the RCA Agent Board
**Live board:** https://play.managedapps.cloud.microsoft/apps/d9182f1a-3a8d-440d-bdb7-cff081273931

A visual companion for demos, built around the same four agents and the same human gate as this repo.

- **Four lanes — Intake → Builder → Gatekeeper → Triager** — each showing state (idle · running · waiting-review · done · rejected), current run and target, and last action.
- **Pipeline bar** — stories → scenarios → tests → in review → merged. Nothing reaches *merged* without the human gate.
- **Human merge gate** — when Gatekeeper approves, the replay pauses and shows the PR, its changed files and the review findings. **Approve & merge** records a `Human merged PR` event and lets Triager run; **Reject (send back to Builder)** records the reason, puts Builder into rework and brings the PR back through Gatekeeper. The human is a distinct actor in the feed.
- **Live event feed** and a **guardrail tile** — Gatekeeper rejections, REGRESSION-tagged tests, production access attempts (always 0), and *Helper changes this release* (metric 9 — increments when Builder edits `tests/l3-ui/_tle.ts`).
- **Replay / Pause / Resume / Reset** at 1× / 5× / 10× playing a recorded RCA-020 run (bundle story): Intake grades READY 7/7, Builder writes `RCA-020-S1` (API) and `RCA-020-S2` (Transaction Line Editor) and opens PR #14, Gatekeeper rejects a `waitForTimeout` in the TLE helper, Builder heals it, Gatekeeper approves, you merge, Triager classifies one failure as **data** and one as **UI change**.

The board consumes the same event shape every agent writes to `runlogs/agent-events.jsonl`
(`{ts, runId, project, org, agent, state, tool, target, message, pr}`), so your own runs can replace the built-in recording once a
"Load run" option is added. Today it is a **replay of a recorded run, not a live monitor**. The link opens for people in the
organisation's Microsoft 365 tenant.

## Layout
```
.github/agents/            intake · builder · gatekeeper · triager      .github/copilot-instructions.md  shared rules
platform.config.yaml       projects · orgs · personas · areas · pricing keywords · roster · apiVersion
scripts/                   new-run · log-event · resolve-org (guardrail) · runlog · sweep · helper-churn
stories/RCA/               RCA-001 010 011 012 013 020 021 022 023 024 (+ RCA-002 deliberately weak) · TEMPLATE.md
expected/RCA/              expected results per scenario (CORRECTNESS | REGRESSION)
tests/l0-catalog/          extract · checks/*.sql · parity · keys
tests/l1-api/_harness.ts   sf client: create / tryCreate / get / query / placeSalesTransaction / approvals
tests/l2-lifecycle/_chain.ts   account → opportunity → quote → order → activate → assets → amend → renew → cancel
tests/l3-ui/_tle.ts        Transaction Line Editor verbs (the only file that knows the editor's DOM) · _pages.ts standard pages
runlogs/                   agent-events.jsonl · summaries · reviews · triage · prereqs
```

## Rules that are enforced, not just written
- `npm run lint` bans `waitForTimeout`, `#id` selectors, `nth()`, and any locator inside a `tests/l3-ui/**/*.spec.ts`.
- `scripts/resolve-org.mjs` refuses undeclared orgs, any write to production, and writes to read-only sandboxes.
- A pricing story without an *Expected result* is **BLOCKED** by Intake; no agent invents a number.
- Every `_tle.ts` method carries `@since` / `@verified`; Gatekeeper rejects a change that doesn't update it with a reason.

## Status
Pilot skeleton implementing reference architecture v2.1. **Not yet run against a real RCA org.** A plain Developer Edition runs the
Account / Opportunity / Approvals / Order path and the standard L0 checks; RCA pricing, bundles, lifecycle and the `--rca` catalog
checks need an org with Revenue Cloud Advanced. The first run will calibrate names, Ids, request shapes and editor labels —
all listed in docs/AREAS.md; they land as **data** or **UI change** findings, not defects. Jira and CI-against-QA are documented but off.
