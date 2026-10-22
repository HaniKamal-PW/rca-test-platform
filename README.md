# RCA Test Platform

**Automated testing for Salesforce Revenue Cloud Advanced (RCA), driven by user stories.**
You paste a story. AI agents turn it into tests, a reviewer agent checks the code, **you approve it**, and the tests run
against your Salesforce org. Agents write and explain; **deterministic tests decide pass/fail; a human merges.**

Built for API 68.0 (Winter '26). Covers Account, Opportunity, Quote, RCA pricing, bundles and configuration rules,
approvals, orders, amendments and renewals, and catalog integrity across orgs.

---

## How it works — the 60-second version

```
  You paste a story
        │
        ▼
  ┌───────────┐   grades the story, designs the test scenarios
  │  Intake   │   (a pricing story with no numbers is BLOCKED and sent back to you)
  └─────┬─────┘
        ▼
  ┌───────────┐   checks the org has what the story needs, writes the expected results
  │  Builder  │   and the test code (API first, UI only where a person must see it),
  └─────┬─────┘   dry-runs it, opens a pull request
        ▼
  ┌───────────┐   reviews the code — rejects hard waits, brittle selectors, numbers
  │Gatekeeper │   typed into assertions, weakened checks. Cannot edit; only approve/reject.
  └─────┬─────┘
        ▼
  ┌───────────┐   YOU decide: are these the right tests, with the right expected values?
  │   HUMAN   │   Approve → merged into the suite.  Reject → back to Builder with a reason.
  └─────┬─────┘   No agent can do this step.
        ▼
  ┌───────────┐   runs the tests, classifies every failure with evidence
  │  Triager  │   (data · environment · drift · platform automation · UI change · defect · flake),
  └─────┬─────┘   explains catalog findings, writes the run summary
        ▼
  You read the summary and act: raise the defect, fix the data, accept the helper fix.
```

**Merge** means: the new test code is accepted into the main branch and becomes part of the suite that runs from now on.
Until you merge, the tests are only a proposal.

---

## What each stage produces

| Stage | Who | Reads | Produces |
|---|---|---|---|
| 1 Intake | agent | your pasted story | `stories/<P>/<KEY>.md`, readiness verdict, `scenarios/<P>/<KEY>.yaml`, selection list |
| 2 Build | agent | scenarios | fixtures, `expected/<P>/<ID>.yaml`, test files, a pull request |
| 3 Review | agent | the pull request | `runlogs/<P>/<KEY>.review.md` — APPROVED or REJECTED with file:line reasons |
| 4 **Merge** | **you** | the PR + review | tests join the suite |
| 5 Triage | agent | test results, traces, L0 report | `runlogs/<P>/<KEY>.triage.md`, run summary |
| 6 **Act** | **you** | the triage | bugs raised, data fixed, helper fix approved |

---

## What the human actually does

**At the merge gate (step 4)** you are *not* checking whether the tests pass. You are checking whether they are the **right tests**:
- Does the test prove what the story asked for?
- Are the expected numbers the ones the business signed off? Every expected file is tagged
  **CORRECTNESS** (value came from the story owner) or **REGRESSION** (value captured from DEV — "it still does what it did").
  A REGRESSION tag on a pricing test is a flag to question.
- Is the negative / boundary case there?

**After the run (step 6)** you read Triager's report and decide:

| Triager says | It means | You do |
|---|---|---|
| **defect** | RCA behaved differently from the expected result | raise it — the test is the reproducer |
| **data** | something the story relies on isn't in the org (price book, product, rule) | add it, or fix the story, re-run |
| **environment** | login, API limits, sandbox refresh | re-login / wait, re-run |
| **configuration drift** | the catalog differs between orgs (L0 parity) | send to the catalog owner |
| **platform automation** | a validation rule / flow / trigger fired | decide: expected, or a rule problem? |
| **UI change** | a Transaction Line Editor helper broke (usually after a release) | approve the helper fix PR |
| **flake** | passes on retry with no change | if recurring, fix the wait/locator |

When everything is green and all expected values are CORRECTNESS, you close the story. Triager never does.

---

## Where the results show up

| Place | What you see |
|---|---|
| `runlogs/<P>/<RUN>.md` | the run summary: tests run / pass / fail, CORRECTNESS vs REGRESSION, Gatekeeper rejections, who merged |
| `runlogs/<P>/<KEY>.triage.md` | each failure → class → evidence → suggested action → link to trace |
| `runlogs/<P>/<KEY>.review.md` | Gatekeeper's findings on the PR |
| `playwright-report/` | per-test result, screenshot, video, trace (`npx playwright show-report`) |
| `l0-report.json`, `runlogs/<P>/l0-explained.md` | catalog findings, explained for catalog owners |
| `runlogs/agent-events.jsonl` | every agent event — what the demo board replays |

Example run summary:
```
Run       local-202610221510 · RCA · DEV
Stories   RCA-020
Tests     5 run · 3 pass · 2 fail
Expected  5 CORRECTNESS · 0 REGRESSION
Gate      1 Gatekeeper rejection (fixed) · merged by human
Failures  RCA-020-S1 → DATA: ADD-PREMIUM-SUPPORT not in "Standard GBP" in DEV
          RCA-020-S2 → UI CHANGE: helper bundleChildren (metric 9 +1)
```

When Jira is connected (later), Intake reads the story from the ticket and Triager posts this block as a ticket comment.
Nothing else in the flow changes.

---

## The testing approach

**Test where the logic lives.** RCA's behaviour is in pricing procedures, catalog records, lifecycle actions — all reachable by API.
So almost everything is proven through the API; the UI is used only for what a person must see or do.

| Layer | Proves | How | Share |
|---|---|---|---|
| **L0 Catalog** | catalog data is complete, consistent, and identical across orgs | one read-only extract per org into a local SQL snapshot (DuckDB), then SQL checks and a natural-key diff | ~10% |
| **L1 Engine / API** | pricing, attributes, bundles, configuration rules match the expected results | Place Sales Transaction API, standard REST | ~50% |
| **L2 Lifecycle** | Account → Opportunity → Quote → Order → Assets → amend / renew / cancel; approvals | chained API calls (`Chain` helper) | ~25% |
| **L3 UI** | what the sales rep / approver sees and does in the Transaction Line Editor | Playwright through one helper file | ~10% |

**Surviving Salesforce releases.** All editor knowledge lives in `tests/l3-ui/_tle.ts` (`open · searchProduct · addLine · configure ·
price · save · linePrice · quoteTotal …`). Spec files hold no locators — lint fails them. After a release only the helper changes, and
`npm run helper-churn` counts how many methods — **metric 9**, target ≤ 3 per release. See [docs/RELEASES.md](docs/RELEASES.md).

---

## Worked examples (one per area)

| Area | Story | Area | Story |
|---|---|---|---|
| Account | RCA-010 | Bundle (API + one editor journey) | RCA-020 |
| Opportunity | RCA-011 | Attribute pricing | RCA-021 |
| RCA pricing | RCA-001 | Configuration rules | RCA-022 |
| Approvals (approver persona) | RCA-012 | Amendment (proration) | RCA-023 |
| Order | RCA-013 | Renewal (uplift) | RCA-024 |

`stories/RCA/RCA-002.md` is deliberately weak — paste it to see Intake return **BLOCKED**.
Details and what to confirm in your org: [docs/AREAS.md](docs/AREAS.md).

---

## Quick start

```bash
npm install && npx playwright install chromium && pip install -r requirements.txt
sf org login web --alias RCA_DEV
npx playwright test tests/l3-ui/RCA/SMOKE-001.spec.ts --project=l3-ui --headed
```
Then in VS Code: Copilot Chat → Agent mode → **Intake** → paste a story → follow the handoff buttons.
Full setup: [docs/SETUP.md](docs/SETUP.md).

---

## Demo: the RCA Agent Board
**Live board:** https://play.managedapps.cloud.microsoft/apps/d9182f1a-3a8d-440d-bdb7-cff081273931

Four lanes — Intake → Builder → Gatekeeper → Triager — a pipeline bar (stories → scenarios → tests → in review → merged), a live
event feed, and a guardrail tile (Gatekeeper rejections, REGRESSION-tagged tests, production access attempts, helper changes this release).
**Replay** plays a recorded RCA-020 run at 1× / 5× / 10×. When Gatekeeper approves, the replay **pauses at the human gate**: you see the PR,
the changed files and the review findings, and click **Approve & merge** or **Reject (send back to Builder)**. Nothing reaches *merged*
without that click. Today it replays a recording; it consumes the same event shape the agents write to `runlogs/agent-events.jsonl`.
The link opens for people in the organisation's Microsoft 365 tenant.

---

## Rules that are enforced, not just written

- **No agent decides pass/fail.** Tests do.
- **No agent invents an expected number.** A pricing story without an *Expected result* is BLOCKED by Intake. REGRESSION values are labelled.
- **No agent picks the org.** `scripts/resolve-org.mjs` refuses undeclared orgs, any write to production, writes to read-only sandboxes.
- **No agent merges.**
- **No locators in UI specs.** `npm run lint` bans `waitForTimeout`, `#id`, `nth()`, and any `page.getBy*` outside the helper files.
- **Helper changes are traced.** Every `_tle.ts` method has `@since` / `@verified`; Gatekeeper rejects a change without an updated reason.

---

## Layout

```
.github/agents/            intake · builder · gatekeeper · triager      .github/copilot-instructions.md  rules every agent inherits
platform.config.yaml       projects · orgs (sf aliases) · personas · areas · pricing keywords · agent roster · apiVersion
scripts/                   new-run · log-event · resolve-org (guardrail) · runlog · sweep · helper-churn
stories/<P>/               pasted stories + readiness verdicts        scenarios/<P>/   derived scenarios
expected/<P>/              expected results per scenario (CORRECTNESS | REGRESSION)
tests/l0-catalog/          extract · checks/*.sql · parity · keys
tests/l1-api/_harness.ts   sf client: create / tryCreate / get / query / placeSalesTransaction / approvals
tests/l2-lifecycle/_chain.ts   account → opportunity → quote → order → activate → assets → amend → renew → cancel
tests/l3-ui/_tle.ts        Transaction Line Editor verbs (the only file that knows the editor's DOM) · _pages.ts standard pages
runlogs/                   agent-events.jsonl · run summaries · reviews · triage · prerequisites
docs/                      SETUP · FLOW · AREAS · RELEASES · ENVIRONMENTS
```

---

## Status

Pilot skeleton implementing reference architecture v2.1. **Not yet run against a real RCA org.** A plain Developer Edition runs the
Account / Opportunity / Approvals / Order path and the standard catalog checks; RCA pricing, bundles, lifecycle and the `--rca` catalog
checks need an org with Revenue Cloud Advanced. The first run will calibrate names, Ids, request shapes and editor labels — listed in
docs/AREAS.md; they surface as **data** or **UI change** findings, not defects. Jira and CI-against-QA are documented but switched off.
