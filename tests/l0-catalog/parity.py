"""Natural-key parity diff between two snapshots.
usage: python tests/l0-catalog/parity.py <source-alias> <target-alias>
Keys come from keys.yaml. Reports MISSING / EXTRA / CHANGED / AMBIGUOUS_KEY per object."""
import json, sys
import duckdb, yaml

src, tgt = sys.argv[1], sys.argv[2]
keys = yaml.safe_load(open("tests/l0-catalog/keys.yaml"))
ignore = set(k.lower() for k in keys.pop("ignore", []))
con = duckdb.connect()
con.execute(f"ATTACH 'snapshots/{src}.duckdb' AS s (READ_ONLY)")
con.execute(f"ATTACH 'snapshots/{tgt}.duckdb' AS t (READ_ONLY)")
out = {}
for obj, spec in keys.items():
    key = [k.lower() for k in spec["key"]]
    try:
        cols = [c[0].lower() for c in con.execute(f"DESCRIBE s.{obj}").fetchall()]
    except Exception:
        out[obj] = {"status": "SKIPPED"}; continue
    comp = [c for c in cols if c not in ignore and c not in key]
    kexpr = " || '|' || ".join(f"coalesce(trim(cast({k} as varchar)),'')" for k in key)
    def side(a):
        return f"(SELECT {kexpr} AS k, {', '.join(f'trim(cast({c} as varchar)) AS {c}' for c in comp)} FROM {a}.{obj})"
    amb = con.execute(f"SELECT k, count(*) FROM {side('s')} GROUP BY k HAVING count(*)>1").fetchall()
    missing = con.execute(f"SELECT k FROM {side('s')} EXCEPT SELECT k FROM {side('t')}").fetchall()
    extra = con.execute(f"SELECT k FROM {side('t')} EXCEPT SELECT k FROM {side('s')}").fetchall()
    changed = []
    if comp:
        diff = " OR ".join(f"a.{c} IS DISTINCT FROM b.{c}" for c in comp)
        sel = ", ".join(f"a.{c} AS s_{c}, b.{c} AS t_{c}" for c in comp)
        changed = con.execute(f"SELECT a.k, {sel} FROM {side('s')} a JOIN {side('t')} b USING (k) WHERE {diff}").fetchall()
    out[obj] = {"MISSING": [m[0] for m in missing], "EXTRA": [e[0] for e in extra],
                "CHANGED": [list(c) for c in changed[:100]], "AMBIGUOUS_KEY": [a[0] for a in amb]}
    print(f"{obj:28} MISSING {len(missing):4} EXTRA {len(extra):4} CHANGED {len(changed):4} AMBIGUOUS {len(amb):3}")
json.dump(out, open("parity-report.json", "w"), indent=2, default=str)
blocker = any(v.get("MISSING") or v.get("AMBIGUOUS_KEY") for v in out.values() if isinstance(v, dict))
sys.exit(1 if blocker else 0)
