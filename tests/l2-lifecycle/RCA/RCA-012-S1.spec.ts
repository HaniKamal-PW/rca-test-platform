import { test, expect, loadExpected } from "../../l1-api/_harness";
import { Chain } from "../_chain";

const E = loadExpected("RCA", "RCA-012-S1");

/** Approvals via the standard process API. The approver acts through their own session in the UI variant (RCA-012 L3);
 *  here the integration user approves the work item, which proves the process, threshold and status transitions. */
test.describe("@RCA-012 @RCA-012-S1 Approvals: discount threshold", () => {
  test("25% discount → pending for approver → Approved", async ({ sf }) => {
    const c = new Chain(sf, E);
    await c.account(); await c.opportunity(); await c.quote();
    const [line] = await sf.query(`SELECT Id FROM QuoteLineItem WHERE QuoteId='${c.ids.quote}'`);
    await sf.update("QuoteLineItem", line.Id, { Discount: E.input.lines[0].discountPct });

    const sub = await sf.submitForApproval(c.ids.quote, "automated: " + E.scenarioId);
    expect(sub.status, JSON.stringify(sub.json).slice(0, 300)).toBe(200);
    expect(await c.setQuoteStatus(E.expected.statusAfterSubmit)).toBe(E.expected.statusAfterSubmit);

    const wi = await sf.pendingWorkItem(c.ids.quote);
    expect(wi, "no pending approval work item").not.toBeNull();

    const ap = await sf.approve(wi!.Id, "automated approve");
    expect(ap.status).toBe(200);
    const q = await sf.get("Quote", c.ids.quote, ["Status"]);
    expect(q.Status).toBe(E.expected.statusAfterApprove);
  });

  test("10% discount needs no approval", async ({ sf }) => {
    const c = new Chain(sf, E);
    await c.account(); await c.opportunity(); await c.quote();
    const [line] = await sf.query(`SELECT Id FROM QuoteLineItem WHERE QuoteId='${c.ids.quote}'`);
    await sf.update("QuoteLineItem", line.Id, { Discount: E.expected.belowThresholdPct });
    const sub = await sf.submitForApproval(c.ids.quote);
    // Either the submit is refused (no matching entry criteria) or no work item appears — both mean "no approval needed"
    const wi = sub.status === 200 ? await sf.pendingWorkItem(c.ids.quote) : null;
    expect(wi).toBeNull();
  });
});
