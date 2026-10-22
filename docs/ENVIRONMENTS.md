# Projects and environments

`platform.config.yaml` is the registry. One project → several orgs; each org has a Salesforce CLI alias, a kind and a writes flag.

| You type in Intake | Result |
|---|---|
| `RCA-7` | project RCA, its default org |
| `RCA-7 on QA` or a line `Env: QA` | project RCA, org QA |
| `Project: BILL` + story | project BILL (must be in the registry) |
| anything on a production org | refused except L0 read-only extract |

`scripts/resolve-org.mjs` is the only place the rules live; every script calls it.
Add a project: copy the RCA block, change the key, aliases and keywords. Add folders `stories/<KEY>`, `scenarios/<KEY>`, `expected/<KEY>`, `tests/l1-api/<KEY>`, `tests/l3-ui/<KEY>`.

## Sandbox refresh runbook
1. `sf org login web --alias <alias>` again
2. redeploy catalog data from `baseline/`
3. delete `.auth/<alias>.json` (regenerated on next run)
4. `npm run l0:extract -- <alias> --rca && npm run l0:parity -- RCA_DEV <alias>` as acceptance
