#!/usr/bin/env node
// Writes runlogs/<project>/<runId>.md from the current run's events, test results and l0 report.
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";

const run = JSON.parse(readFileSync("runlogs/.current-run", "utf8"));
const events = existsSync("runlogs/agent-events.jsonl")
  ? readFileSync("runlogs/agent-events.jsonl", "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((e) => e.runId === run.runId)
  : [];
const stories = [...new Set(events.map((e) => e.target).filter((t) => /^[A-Z]+-\d+$/.test(t)))];

let tests = "not run";
if (existsSync("test-results/results.json")) {
  const r = JSON.parse(readFileSync("test-results/results.json", "utf8"));
  const s = r.stats ?? {}; tests = `${(s.expected ?? 0) + (s.unexpected ?? 0)} run · ${s.expected ?? 0} pass · ${s.unexpected ?? 0} fail · ${s.flaky ?? 0} flaky`;
}
let l0 = "not run";
if (existsSync("l0-report.json")) {
  const r = JSON.parse(readFileSync("l0-report.json", "utf8"));
  l0 = r.map((c) => `${c.check} ${c.count ? c.severity : "ok"}${c.count ? ` (${c.count})` : ""}`).join(" · ");
}
const rejections = events.filter((e) => e.agent === "Gatekeeper" && e.state === "rejected").length;
const expectedTypes = { CORRECTNESS: 0, REGRESSION: 0 };
for (const f of ["expected"]) {
  try {
    const { readdirSync, statSync } = await import("node:fs");
    const walk = (d) => readdirSync(d).flatMap((n) => { const p = `${d}/${n}`; return statSync(p).isDirectory() ? walk(p) : [p]; });
    for (const p of walk(f).filter((p) => p.endsWith(".yaml"))) {
      const t = readFileSync(p, "utf8").match(/expectedType:\s*(\w+)/)?.[1]; if (t in expectedTypes) expectedTypes[t]++;
    }
  } catch {}
}
const md = `Run       ${run.runId} · ${run.project} · ${run.org}
Stories   ${stories.join(", ") || "-"}
L0        ${l0}
Tests     ${tests}
Expected  ${expectedTypes.CORRECTNESS} CORRECTNESS · ${expectedTypes.REGRESSION} REGRESSION
Gate      ${rejections} Gatekeeper rejection(s) · human merge required
Reports   playwright-report/index.html · l0-report.json · runlogs/agent-events.jsonl
`;
mkdirSync(`runlogs/${run.project}`, { recursive: true });
writeFileSync(`runlogs/${run.project}/${run.runId}.md`, md);
console.log(md);
