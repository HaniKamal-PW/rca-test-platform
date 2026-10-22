import { test, expect, loadExpected, expectClose } from "../../l1-api/_harness";
import { Chain } from "../_chain";

const E = loadExpected("RCA", "RCA-013-S1");

test("@RCA-013 @RCA-013-S1 Orders: accepted quote → activated order → opportunity closed", async ({ sf }) => {
  const c = new Chain(sf, E);
  await c.account(); await c.opportunity(); await c.quote();
  await c.syncQuoteToOpportunity();
  await c.setQuoteStatus("Accepted");

  await c.order();
  const items = await c.orderItems();
  expect(items).toHaveLength(E.input.lines.length);
  expect(Number(items[0].Quantity)).toBe(E.expected.orderItem.quantity);
  expectClose(Number(items[0].UnitPrice), E.expected.orderItem.unitPrice, E.tolerance, "unit price");

  const o = await c.activateOrder();
  expect(o.Status).toBe(E.expected.orderStatus);
  expectClose(Number(o.TotalAmount), E.expected.orderTotal, E.tolerance, "order total");

  const opp = await sf.get("Opportunity", c.ids.opportunity, ["StageName"]);
  expect(opp.StageName).toBe(E.expected.opportunityStage);
});
