#!/usr/bin/env node
// The ONE place environment rules are enforced. Every other script imports this.
// usage: node scripts/resolve-org.mjs <project> [orgName] [--write] [--persona <name>]
import { cfg } from "./config.mjs";

export function resolveOrg(project, orgName, { needsWrite = false, persona } = {}) {
  const p = cfg.projects[project];
  if (!p) throw new Error(`Project ${project} is not configured in platform.config.yaml`);
  const name = orgName ?? p.defaultOrg;
  const o = p.orgs?.[name];
  if (!o) throw new Error(`${name} is not a declared environment for ${project}`);
  if (o.kind === "production" && needsWrite) throw new Error("Writes to production are never allowed");
  if (!o.writes && needsWrite) throw new Error(`${name} is read-only for ${project}`);
  if (/prod/i.test(o.alias) && o.kind !== "production") throw new Error(`Alias ${o.alias} looks like production but is not declared as such`);
  let personaAlias = null;
  if (persona) {
    personaAlias = o.personas?.[persona];
    if (!personaAlias) throw new Error(`Persona ${persona} has no login declared for ${project}/${name}`);
  }
  return { name, ...o, personaAlias };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const pi = args.indexOf("--persona");
  const persona = pi >= 0 ? args[pi + 1] : undefined;
  const pos = args.filter((a, i) => !a.startsWith("--") && i !== pi + 1);
  try {
    const o = resolveOrg(pos[0] ?? cfg.defaultProject, pos[1], { needsWrite: args.includes("--write"), persona });
    console.log(persona ? o.personaAlias : o.alias);
  } catch (e) { console.error(e.message); process.exit(2); }
}
