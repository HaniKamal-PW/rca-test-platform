#!/usr/bin/env node
// Metric 9: how many Transaction Line Editor helper methods changed since the last release tag.
// usage: node scripts/helper-churn.mjs [sinceRef]   (default: latest tag matching release/*, else first commit)
import { execSync } from "node:child_process";
const file = "tests/l3-ui/_tle.ts";
const sh = (c) => execSync(c, { encoding: "utf8" }).trim();
let since = process.argv[2];
if (!since) { try { since = sh("git describe --tags --match 'release/*' --abbrev=0"); } catch { since = sh("git rev-list --max-parents=0 HEAD"); } }
const diff = sh(`git diff ${since} -- ${file}`);
const methods = new Set();
let current = null;
for (const line of sh(`git show HEAD:${file}`).split("\n")) { const m = line.match(/^\s+(?:async\s+)?([a-zA-Z_]\w*)\s*\(/); if (m) current = m[1]; }
for (const h of diff.split("\n").filter((l) => l.startsWith("@@"))) {
  const ctx = h.match(/@@.*@@\s*(?:async\s+)?([a-zA-Z_]\w*)\s*\(/); if (ctx) methods.add(ctx[1]);
}
const verified = (sh(`git show HEAD:${file}`).match(/@verified ([^\n*]+)/g) ?? []).map((v) => v.replace("@verified ", "").trim());
const stale = verified.filter((v) => !/API \d+\.\d/.test(v));
console.log(`TLE helper changes since ${since}: ${methods.size} method(s)${methods.size ? " — " + [...methods].join(", ") : ""}`);
console.log(`methods with a @verified line: ${verified.length}; unparseable: ${stale.length}`);
console.log(methods.size > 3 ? "⚠ above target (3) — investigate locator strategy" : "✓ within target");
