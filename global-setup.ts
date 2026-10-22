import { chromium } from "@playwright/test";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import YAML from "yaml";

/** Logs in through the Salesforce CLI front-door URL and saves one storageState per persona.
 *  No test ever logs in through the UI; agents never see credentials.
 *  Personas come from platform.config.yaml → projects.<P>.orgs.<ORG>.personas (alias per test user). */
export default async function globalSetup() {
  const project = process.env.PROJECT ?? "RCA";
  const orgName = process.env.ORG ?? undefined;
  const cfg = YAML.parse(readFileSync("platform.config.yaml", "utf8"));
  const p = cfg.projects[project];
  const org = p.orgs[orgName ?? p.defaultOrg];
  const personas: Record<string, string> = { ...(org.personas ?? {}) };
  if (!Object.keys(personas).length) personas.default = org.alias;

  mkdirSync(".auth", { recursive: true });
  const browser = await chromium.launch();
  for (const [persona, alias] of Object.entries(personas)) {
    const path = `.auth/${alias}.json`;
    if (existsSync(path) && process.env.REUSE_AUTH) continue;
    let url: string;
    try {
      url = JSON.parse(execSync(`sf org open --url-only --json -o ${alias}`, { encoding: "utf8" })).result.url;
    } catch {
      console.warn(`[global-setup] persona ${persona}: alias ${alias} is not authenticated (sf org login web --alias ${alias}); skipping`);
      continue;
    }
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(url);
    await page.waitForURL(/lightning/, { timeout: 60_000 });
    await ctx.storageState({ path });
    await ctx.close();
    console.log(`[global-setup] persona ${persona} → ${path}`);
  }
  await browser.close();
}
