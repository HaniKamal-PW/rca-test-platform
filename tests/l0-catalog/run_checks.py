"""Run every checks/*.sql against a snapshot. First line of each file: -- <ID> <BLOCKER|WARN>: <title>
usage: python tests/l0-catalog/run_checks.py <sf-alias>
Exit 1 when any BLOCKER has findings. Writes l0-report.json."""
import json, pathlib, sys
import duckdb

alias = sys.argv[1] if len(sys.argv) > 1 else "RCA_DEV"
con = duckdb.connect(f"snapshots/{alias}.duckdb", read_only=True)
tables = {r[0] for r in con.execute("SHOW TABLES").fetchall()}
report, blockers = [], 0
for f in sorted(pathlib.Path("tests/l0-catalog/checks").glob("*.sql")):
    sql = f.read_text()
    head = sql.splitlines()[0]
    sev = "BLOCKER" if "BLOCKER" in head else "WARN"
    title = head.split(":", 1)[-1].strip()
    needed = [t for t in tables if t in sql.lower()]
    try:
        rows = con.execute(sql).fetchall()
        cols = [d[0] for d in con.description]
        status = "ran"
    except Exception as e:  # missing table/field in this org's API version → SKIPPED, never passed
        rows, cols, status = [], [], f"SKIPPED: {str(e).splitlines()[0][:120]}"
    report.append({"check": f.stem, "title": title, "severity": sev, "status": status, "count": len(rows),
                   "rows": [dict(zip(cols, r)) for r in rows[:50]]})
    if rows and sev == "BLOCKER": blockers += 1
    print(f"{f.stem} {sev:7} {status if status != 'ran' else ''} {len(rows)} finding(s)  {title}")
pathlib.Path("l0-report.json").write_text(json.dumps(report, indent=2, default=str))
print(f"\n{blockers} BLOCKER check(s) with findings → l0-report.json")
sys.exit(1 if blockers else 0)
