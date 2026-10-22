#!/usr/bin/env node
// usage: node scripts/new-run.mjs <project> [orgName]
import { writeFileSync, mkdirSync } from "node:fs";
import { cfg } from "./config.mjs";
import { resolveOrg } from "./resolve-org.mjs";

const [project = cfg.defaultProject, orgName] = process.argv.slice(2);
const org = resolveOrg(project, orgName);
mkdirSync(`runlogs/${project}`, { recursive: true });
const id = `local-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}`;
writeFileSync("runlogs/.current-run", JSON.stringify({ runId: id, project, org: org.name, alias: org.alias }));
console.log(`${id} · ${project} · ${org.name} (${org.alias})`);
