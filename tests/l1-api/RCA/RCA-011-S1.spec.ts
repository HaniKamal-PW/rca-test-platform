import { test, expect, loadExpected, expectClose } from "../_harness";
import { Chain } from "../../l2-lifecycle/_chain";

const E = loadExpected("RCA", "RCA-011-S1");

test("@RCA-011 @RCA-011-S1 Opportunity: synced quote drives Amount", async ({ sf }) => {
  const c = new Chain(sf, E);
  await c.account(); await c.opportunity(); await c.quote();
  const q = await c.quoteTotals();
  expectClose(Number(q.TotalPrice), E.expected.quoteTotal, E.tolerance, "quote total");

  const opp = await c.syncQuoteToOpportunity();
  expectClose(Number(opp.Amount), E.expected.opportunityAmountAfterSync, E.tolerance, "opportunity amount after sync");

  // a second, unsynced quote must not move the amount
  const first = c.ids.quote;
  await c.quote();
  const after = await sf.get("Opportunity", c.ids.opportunity, ["Amount", "SyncedQuoteId"]);
  expect(after.SyncedQuoteId).toBe(first);
  expectClose(Number(after.Amount), E.expected.opportunityAmountAfterSync, E.tolerance, "amount unchanged by unsynced quote");
});
