#!/usr/bin/env node
// Deletes run-tagged test records older than N hours. Sandboxes only; refuses production and read-only orgs.
// usage: node scripts/sweep.mjs <project> <orgName> [--hours 48] [--dry]
import { execSync } from "node:child_process";
import { cfg } from "./config.mjs";
import { resolveOrg } from "./resolve-org.mjs";

const a = process.argv.slice(2);
const project = a[0] ?? cfg.defaultProject, orgName = a[1];
const hours = Number(a[a.indexOf("--hours") + 1] || 48);
const dry = a.includes("--dry");
const org = resolveOrg(project, orgName, { needsWrite: true });   // throws on production / read-only
const since = new Date(Date.now() - hours * 36e5).toISOString();

// Order matters: children before parents. Activated orders cannot be deleted → set to Draft first where allowed.
const plan = [
  ["Order",        `Name LIKE 'ORD-%' OR QuoteId IN (SELECT Id FROM Quote WHERE Name LIKE 'Q-local-%' OR Name LIKE 'Q-nightly-%')`],
  ["Quote",        `(Name LIKE 'Q-local-%' OR Name LIKE 'Q-nightly-%')`],
  ["Opportunity",  `(Name LIKE 'OPP-local-%' OR Name LIKE 'OPP-nightly-%')`],
  ["Account",      `(Name LIKE 'ACC-local-%' OR Name LIKE 'ACC-nightly-%' OR Name LIKE 'ACC-ui-%')`],
];
for (const [obj, where] of plan) {
  const soql = `SELECT Id FROM ${obj} WHERE ${where} AND CreatedDate < ${since}`;
  const r = JSON.parse(execSync(`sf data query -q "${soql.replace(/"/g, '\\"')}" -o ${org.alias} --json`, { encoding: "utf8" }));
  const ids = (r.result?.records ?? []).map((x) => x.Id);
  console.log(`${obj}: ${ids.length} record(s)${dry ? " (dry run)" : ""}`);
  if (dry || !ids.length) continue;
  if (obj === "Order") for (const id of ids) { try { execSync(`sf data update record -s Order -i ${id} -v "Status=Draft" -o ${org.alias} --json`, { stdio: "ignore" }); } catch {} }
  for (const id of ids) { try { execSync(`sf data delete record -s ${obj} -i ${id} -o ${org.alias} --json`, { stdio: "ignore" }); } catch (e) { console.warn(`  could not delete ${obj} ${id} (archive it)`); } }
}
