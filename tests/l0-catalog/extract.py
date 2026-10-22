"""Extract catalog objects from one org into a local DuckDB snapshot.
usage: python tests/l0-catalog/extract.py <sf-alias> [--rca]
Uses the Salesforce CLI (read-only). Switch to `sf data export bulk` for large volumes."""
import json, pathlib, subprocess, sys
import duckdb, yaml

alias = sys.argv[1] if len(sys.argv) > 1 else "RCA_DEV"
include_rca = "--rca" in sys.argv
objects = yaml.safe_load(open("tests/l0-catalog/objects.yaml"))
todo = dict(objects["standard"])
if include_rca:
    todo.update(objects["rca"])   # rca entries override standard ones of the same name (richer PBE)

snap = pathlib.Path(f"snapshots/{alias}.duckdb"); snap.parent.mkdir(exist_ok=True)
con = duckdb.connect(str(snap))
skipped = []
for name, soql in todo.items():
    r = subprocess.run(["sf", "data", "query", "-q", soql, "-o", alias, "--json"], capture_output=True, text=True)
    try:
        payload = json.loads(r.stdout)
    except json.JSONDecodeError:
        skipped.append((name, r.stderr.strip()[:120])); continue
    if payload.get("status") != 0:
        skipped.append((name, str(payload.get("message", ""))[:120])); continue
    rows = payload["result"]["records"]
    for row in rows: row.pop("attributes", None)
    tmp = pathlib.Path("snapshots/_tmp.json"); tmp.write_text(json.dumps(rows))
    if rows:
        con.execute(f"CREATE OR REPLACE TABLE {name} AS SELECT * FROM read_json_auto('{tmp}')")
    else:
        con.execute(f"CREATE OR REPLACE TABLE {name} AS SELECT NULL::VARCHAR AS Id WHERE 1=0")
    print(f"{name}: {len(rows)} rows")
con.execute("CREATE OR REPLACE TABLE _skipped (object VARCHAR, reason VARCHAR)")
for s in skipped:
    con.execute("INSERT INTO _skipped VALUES (?, ?)", s); print(f"SKIPPED {s[0]}: {s[1]}")
print(f"snapshot → {snap}")
