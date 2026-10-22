import { defineConfig, devices } from "@playwright/test";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import YAML from "yaml";

/** Resolve project/org from env (PROJECT, ORG) via platform.config.yaml; TARGET_ORG overrides the alias directly. */
const cfg = YAML.parse(readFileSync("platform.config.yaml", "utf8"));
const project = process.env.PROJECT ?? cfg.defaultProject;
const p = cfg.projects[project];
const org = p.orgs[process.env.ORG ?? p.defaultOrg];
export const ALIAS: string = process.env.TARGET_ORG ?? org.alias;
export const PERSONA_ALIAS = (persona: string): string => org.personas?.[persona] ?? ALIAS;

let baseURL = process.env.SF_BASE_URL;
if (!baseURL) {
  try { baseURL = JSON.parse(execSync(`sf org display -o ${ALIAS} --json`, { encoding: "utf8" })).result.instanceUrl; }
  catch { /* log in with sf first, or set SF_BASE_URL */ }
}

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.spec\.ts/,
  globalSetup: "./global-setup.ts",
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,                      // sandboxes have modest API limits
  reporter: [["html", { open: "never" }], ["list"], ["json", { outputFile: "test-results/results.json" }]],
  use: {
    baseURL,
    storageState: `.auth/${PERSONA_ALIAS("sales_rep")}.json`,
    trace: process.env.CI ? "on-first-retry" : "on",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },
  projects: [
    { name: "l1-api", testDir: "./tests/l1-api" },
    { name: "l2-lifecycle", testDir: "./tests/l2-lifecycle" },
    { name: "l3-ui", testDir: "./tests/l3-ui", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
});
