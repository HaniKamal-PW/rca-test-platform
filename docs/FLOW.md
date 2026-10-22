# How a story becomes tests — four agents, one human gate

```
you paste a story
   │
   ▼
Intake ──── resolves project / org / persona (platform.config.yaml) · saves stories/<P>/<KEY>.md · starts the run
            readiness gate: READY / WEAK / BLOCKED   (pricing story without numbers → BLOCKED, stops here)
            derives scenarios by area → scenarios/<P>/<KEY>.yaml · picks tests → runlogs/<P>/<KEY>.selection.yaml
   │
   ▼
Builder ─── checks the story's prerequisites exist in the org (missing → DATA finding in runlogs/<P>/<KEY>.prereqs.md)
            fixtures · expected/<P>/<ID>.yaml (CORRECTNESS | REGRESSION)
            L1 API test on `sf` · L2 chain test on `Chain` · L3 test on `TransactionLineEditor` verbs only (no locators in specs)
            dry-runs each test · heals locators/waits inside _tle.ts only (🎭 healer)
   │
   ▼
Gatekeeper  lint + review → runlogs/<P>/<KEY>.review.md
            rejects: hard waits · #id · nth() · locators in UI specs · literals in expect() · weakened assertions ·
                     _tle.ts changes without an updated @verified line and a reason
            REJECTED → back to Builder · APPROVED → you
   │
   ▼
YOU merge (git)  ← the human gate; no agent merges
   │
   ▼
Triager ─── runs @KEY tests · classifies each failure:
            data / environment / configuration drift / platform automation / UI change (names the helper method → metric 9) / defect / flake
            explains L0 findings → runlogs/<P>/l0-explained.md · writes the run summary (npm run runlog)
```

Every agent appends to `runlogs/agent-events.jsonl`: `{ts, runId, project, org, agent, state, tool, target, message, pr}` —
the shape the RCA Agent Board replays.

## Why four agents, not nine
| Agent | Absorbs | Why |
|---|---|---|
| Intake | Grader, Picker | resolve, grade, derive scenarios, pick — all one read of the same story |
| Builder | Seeder, Coder, Tester | fixture, API test and UI test for one scenario belong in one head; uses `Chain` and `TransactionLineEditor`, calls 🎭 generator/healer for DOM work |
| Gatekeeper | — | a reviewer that didn't write the code is the point |
| Triager | Auditor | both are "explain what the run found"; one agent, two report types |

Fewer hand-offs means fewer stalls in Copilot Chat and one place to fix when the agent format changes. Split an agent back out only when its prompt outgrows a screen.

## Rules that never bend
- No agent decides pass/fail. Tests do. · No agent invents an expected number. · No agent picks the org. · No agent merges.
- API first (L1/L2); the Transaction Line Editor only for what a persona must see or do (L3 ≈ 10%).
- UI specs hold no locators; `tests/l3-ui/_tle.ts` and `_pages.ts` are the only files that know the DOM.
