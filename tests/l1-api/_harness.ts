import { test as base, expect, request, type APIRequestContext } from "@playwright/test";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import YAML from "yaml";

export type Expected = {
  scenarioId: string; storyKey: string; project: string;
  expectedType: "CORRECTNESS" | "REGRESSION";
  input: Record<string, any>; expected: Record<string, any>;
  tolerance?: number; approvedBy?: string;
};

export function loadExpected(project: string, scenarioId: string): Expected {
  return YAML.parse(readFileSync(`expected/${project}/${scenarioId}.yaml`, "utf8"));
}

/** Run id from runlogs/.current-run so every record this test creates is traceable and sweepable. */
export function runId(): string {
  try { return JSON.parse(readFileSync("runlogs/.current-run", "utf8")).runId; } catch { return "local"; }
}
export const tag = (prefix: string, scenarioId: string) => `${prefix}-${runId()}-${scenarioId}`;

/** Instance URL + access token from the Salesforce CLI at runtime. Nothing is stored. */
function sfSession() {
  const alias = process.env.TARGET_ORG ?? "RCA_DEV";
  const r = JSON.parse(execSync(`sf org display -o ${alias} --json`, { encoding: "utf8" })).result;
  return { baseURL: r.instanceUrl as string, token: r.accessToken as string, apiVersion: (r.apiVersion ?? "62.0") as string };
}

export class SF {
  constructor(public ctx: APIRequestContext, public v: string) {}
  private url(p: string) { return `/services/data/v${this.v}${p}`; }

  async create(sobject: string, record: Record<string, unknown>): Promise<string> {
    const res = await this.ctx.post(this.url(`/sobjects/${sobject}`), { data: record });
    const body = await res.json();
    expect(res.ok(), `create ${sobject}: ${JSON.stringify(body).slice(0, 400)}`).toBeTruthy();
    return body.id as string;
  }
  /** Returns the API error body instead of failing — for negative tests (validation rules). */
  async tryCreate(sobject: string, record: Record<string, unknown>) {
    const res = await this.ctx.post(this.url(`/sobjects/${sobject}`), { data: record });
    return { status: res.status(), body: await res.json() };
  }
  async update(sobject: string, id: string, patch: Record<string, unknown>) {
    const res = await this.ctx.patch(this.url(`/sobjects/${sobject}/${id}`), { data: patch });
    expect(res.status(), `update ${sobject} ${id}: ${await res.text()}`).toBe(204);
  }
  async get<T = any>(sobject: string, id: string, fields: string[]): Promise<T> {
    const res = await this.ctx.get(this.url(`/sobjects/${sobject}/${id}?fields=${fields.join(",")}`));
    expect(res.ok(), `get ${sobject} ${id}`).toBeTruthy();
    return res.json();
  }
  async query<T = any>(soql: string): Promise<T[]> {
    const res = await this.ctx.get(this.url(`/query?q=${encodeURIComponent(soql)}`));
    expect(res.ok(), `query: ${soql}`).toBeTruthy();
    return (await res.json()).records;
  }
  async idByName(sobject: string, name: string, extra = ""): Promise<string> {
    const r = await this.query(`SELECT Id FROM ${sobject} WHERE Name = '${name.replace("'", "\\'")}' ${extra} LIMIT 1`);
    expect(r.length, `${sobject} named "${name}" not found in this org`).toBe(1);
    return r[0].Id;
  }
  /** Place Sales Transaction API (RCA). Body shape per the Revenue Cloud developer guide; confirm in your org. */
  async placeSalesTransaction(body: unknown) {
    const res = await this.ctx.post(this.url(`/connect/rev/sales-transaction/actions/place`), { data: body });
    return { status: res.status(), json: res.ok() ? await res.json() : await res.text() };
  }
  /** Standard approval process API. */
  async submitForApproval(recordId: string, comments = "") {
    const res = await this.ctx.post(this.url(`/process/approvals/`), { data: { requests: [{ actionType: "Submit", contextId: recordId, comments }] } });
    return { status: res.status(), json: await res.json() };
  }
  async pendingWorkItem(recordId: string) {
    const r = await this.query(`SELECT Id, ActorId FROM ProcessInstanceWorkitem WHERE ProcessInstance.TargetObjectId = '${recordId}' AND ProcessInstance.Status = 'Pending' LIMIT 1`);
    return r[0] ?? null;
  }
  async approve(workItemId: string, comments = "") {
    const res = await this.ctx.post(this.url(`/process/approvals/`), { data: { requests: [{ actionType: "Approve", contextActorId: null, contextId: workItemId, comments }] } });
    return { status: res.status(), json: await res.json() };
  }
}

export const test = base.extend<{ sf: SF }>({
  sf: async ({}, use) => {
    const s = sfSession();
    const ctx = await request.newContext({ baseURL: s.baseURL, extraHTTPHeaders: { Authorization: `Bearer ${s.token}`, "Content-Type": "application/json" } });
    await use(new SF(ctx, s.apiVersion));
    await ctx.dispose();
  },
});

/** Compare an actual value against the expected file with tolerance. */
export function expectClose(actual: number, expectedValue: number, tolerance = 0.01, label = "value") {
  expect(Math.abs(actual - expectedValue), `${label}: expected ${expectedValue}, got ${actual}`).toBeLessThanOrEqual(tolerance);
}

export { expect };
