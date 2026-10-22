#!/usr/bin/env node
// usage: node scripts/log-event.mjs <agent> <state> <target> "<message>" [tool] [pr]
// states: idle | running | waiting-review | done | rejected
import { appendFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { cfg } from "./config.mjs";

const [agent, state, target, message, tool = "", pr = ""] = process.argv.slice(2);
const roster = cfg.agents?.roster ?? [];
if (!agent || !state) { console.error("usage: log <agent> <state> <target> <message> [tool] [pr]"); process.exit(2); }
if (roster.length && !roster.includes(agent) && agent !== "Human") { console.error(`Unknown agent ${agent}. Roster: ${roster.join(", ")}`); process.exit(2); }

const run = existsSync("runlogs/.current-run") ? JSON.parse(readFileSync("runlogs/.current-run", "utf8")) : { runId: "local", project: cfg.defaultProject, org: "?" };
const ev = { ts: new Date().toISOString(), runId: run.runId, project: run.project, org: run.org, agent, state, tool, target, message, pr: pr ? Number(pr) : null };
mkdirSync("runlogs", { recursive: true });
appendFileSync("runlogs/agent-events.jsonl", JSON.stringify(ev) + "\n");
console.log(`[${agent}] ${state} ${target} — ${message}`);
