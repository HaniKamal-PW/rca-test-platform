import { test, expect, loadExpected, expectClose } from "../../l1-api/_harness";
import { Chain } from "../_chain";

const E = loadExpected("RCA", "RCA-023-S1");

test("@RCA-023 @RCA-023-S1 Amendment: quantity increase is prorated", async ({ sf }) => {
  const c = new Chain(sf, E);
  await c.account(); await c.opportunity(); await c.placeQuoteRCA();
  await c.setQuoteStatus("Accepted"); await c.order(); await c.activateOrder();

  const before = await c.assets();
  expect(before.length, "activation should create an asset").toBeGreaterThan(0);

  const effective = new Date(); effective.setMonth(effective.getMonth() + E.input.amend.monthsIn);
  await c.amend({ newQuantity: E.input.amend.newQuantity, effectiveDate: effective.toISOString().slice(0, 10) });
  const lines = await c.quoteLines(c.ids.amendQuote);
  expect(lines).toHaveLength(1);
  expect(Number(lines[0].Quantity)).toBe(E.expected.deltaQuantity);
  expectClose(Number(lines[0].TotalPrice), E.expected.proratedTotal, E.tolerance, "prorated total");

  // activate the amendment order, then the asset reflects the new quantity
  c.ids.quote = c.ids.amendQuote; await c.setQuoteStatus("Accepted"); await c.order(); await c.activateOrder();
  const after = await c.assets();
  expect(Number(after[0].CurrentQuantity)).toBe(E.expected.assetQuantityAfter);
});
