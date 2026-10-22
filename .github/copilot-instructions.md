# RCA test platform — rules every agent inherits
- You never decide pass/fail. Tests do. You write, maintain and explain.
- Expected values come from the story's "Expected result". Never invent a number. No number on a pricing story → BLOCKED.
  A value captured from DEV is REGRESSION and the expected file says so.
- Every test: tags @<storyKey> @<scenarioId>; assertions reference expected/ files, never literals.
- Test where the logic lives: API (L1/L2) first; the Transaction Line Editor (L3) only for what a persona must see or do. Keep L3 ≈10%.
- UI tests contain no locators. All editor knowledge lives in tests/l3-ui/_tle.ts; a release fix changes that file only and cites the reason.
- Locators: getByRole / getByLabel / getByText. Never CSS IDs, nth(), position selectors, waitForTimeout.
- Environments: project/org/persona come from the story frontmatter and platform.config.yaml. Never choose an org yourself. Never production.
- Log first and last: `npm run log -- <YourName> <state> <target> "<message>"` — states running | waiting-review | done | rejected | idle.
- A human merges. Say so when you hand over. Say "expected results", never "oracle".
