# Set up on your machine (free, ~1 hour) — API 68.0 / Winter '26

## 0. Install
- Node.js 20+, Git, Python 3.11+, VS Code (+ extensions: Playwright Test for VS Code, GitHub Copilot Chat, Python — recommended automatically)
- Salesforce CLI: `npm i -g @salesforce/cli`
- An org. A Developer Edition (e.g. instance SWE126, API 68.0) runs Account / Opportunity / Quote / Approvals / Order. RCA pricing, bundles,
  amend/renew and the `--rca` catalog checks need an org with Revenue Cloud Advanced (Trailhead Revenue Cloud trial, an RCA scratch org, or a client sandbox).

## 1. Clone and install
```bash
git clone https://github.com/<you>/rca-test-platform.git && cd rca-test-platform
npm install && npx playwright install chromium
python -m venv .venv && . .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## 2. Log in — once per org and per persona
```bash
sf org login web --alias RCA_DEV
sf org login web --alias RCA_DEV_APPROVER        # optional second user for approval tests
sf org display -o RCA_DEV --json                 # "apiVersion": "68.0"
```
Aliases must match `platform.config.yaml`. Until you have separate users, point every persona at `RCA_DEV`.
Check for RCA: `sf data query -q "SELECT Id FROM ProductSellingModel LIMIT 1" -o RCA_DEV` — an error means no RCA in this org (normal on a plain Developer Edition).

## 3. First visible test
```bash
npx playwright test tests/l3-ui/RCA/SMOKE-001.spec.ts --project=l3-ui --headed
```
A browser opens already logged in. In VS Code: Testing sidebar → tick **Show browser** and **Show trace viewer** → run `SMOKE-001`.

## 4. First catalog check
```bash
npm run l0:extract -- RCA_DEV            # add --rca on an RCA org
npm run l0:check -- RCA_DEV              # → l0-report.json; SKIPPED checks are normal without RCA / multi-currency
```

## 5. First chain test (standard objects)
Edit `expected/RCA/RCA-011-S1.yaml` so the price book and product code exist in your org, then:
```bash
npm run run:new -- RCA DEV
npm run test:l1 -- --grep @RCA-011
```

## 6. Agents
```bash
npx playwright init-agents --loop=vscode         # adds 🎭 planner / generator / healer
```
Our four agents — **Intake, Builder, Gatekeeper, Triager** — are already in `.github/agents/`.

## 7. Paste a story
Copilot Chat → **Agent** mode → **Intake** → paste a story (template: `stories/TEMPLATE.md`; worked examples RCA-001, 010–013, 020–024).
Follow the handoff buttons: Intake → Builder → Gatekeeper → (you merge) → Triager.
Paste `stories/RCA/RCA-002.md` to see Intake return **BLOCKED**.

## 8. RCA org (when you have one)
`sf org login web --alias RCA_QA` → add it to `platform.config.yaml` → `npm run l0:extract -- RCA_QA --rca` → fill the `01t…` / `0jP…` Ids in
`expected/RCA/*.yaml` → `TARGET_ORG=RCA_QA npm run test:l1 -- --grep @RCA-020`. Then calibrate the editor labels once:
`QUOTE_ID=<a draft quote id> TARGET_ORG=RCA_QA npm run test:l3 -- --grep @RCA-020-S2` and adjust `tests/l3-ui/_tle.ts` (see docs/RELEASES.md).

## 9. See it · clean up · releases
- `runlogs/agent-events.jsonl` — every agent event (what the RCA Agent Board replays)
- `npm run runlog` — run summary · `npx playwright show-report`
- `npm run sweep -- RCA DEV --dry` — test data that would be removed
- `npm run helper-churn` — TLE helper methods changed since the last `release/*` tag (metric 9)

## Troubleshooting
| Symptom | Fix |
|---|---|
| Agents not in the mode picker | files must be `.github/agents/*.agent.md`; reload the window; recent Copilot Chat required |
| No handoff buttons | switch agent manually and type the prompt line |
| `sf org open` fails in global-setup | re-login the alias (a sandbox refresh invalidates it); unauthenticated personas are skipped with a warning |
| L0 check SKIPPED | object/field absent in this org or API version — normal without RCA / multi-currency |
| `… not found in this org` | the price book / product / rule the story names doesn't exist → **data** finding; edit the expected file or the org |
| Lint: "No locators in UI spec files" | move the locator into `_tle.ts` or `_pages.ts` as a verb |
| TLE helper fails on a label | confirm the editor's accessible names (`npx playwright codegen`), fix in `_tle.ts`, update `@verified` |
| `npm run log` rejects the agent name | names must be in `platform.config.yaml` → `agents.roster` (Intake, Builder, Gatekeeper, Triager) |
