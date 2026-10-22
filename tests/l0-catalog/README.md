# L0 — catalog integrity and parity

1. `python tests/l0-catalog/extract.py RCA_DEV`          (add `--rca` on an org with Revenue Cloud Advanced)
2. `python tests/l0-catalog/run_checks.py RCA_DEV`        → `l0-report.json`, exit 1 on BLOCKER findings
3. `python tests/l0-catalog/extract.py RCA_QA --rca && python tests/l0-catalog/parity.py RCA_DEV RCA_QA` → `parity-report.json`

Add a check: one `checks/<ID>.sql` with a first line `-- <ID> <BLOCKER|WARN>: <title>`.
The full catalogue A1–F2 is in the reference architecture (section 4.3); A1, A6, A8, B1, C1, D1 and R1 are included here.
A check whose table or field is missing in the org's API version is reported SKIPPED, never passed.
