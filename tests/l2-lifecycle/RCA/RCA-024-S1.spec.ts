import { test, expect, loadExpected, expectClose } from "../../l1-api/_harness";
import { Chain } from "../_chain";

const E = loadExpected("RCA", "RCA-024-S1");

test("@RCA-024 @RCA-024-S1 Renewal with uplift", async ({ sf }) => {
  const c = new Chain(sf, E);
  await c.account(); await c.opportunity(); await c.placeQuoteRCA();
  await c.setQuoteStatus("Accepted"); await c.order(); await c.activateOrder();
  const [asset] = await c.assets();

  await c.renew({ termMonths: E.input.renew.termMonths, upliftPct: E.input.renew.upliftPct });
  const lines = await c.quoteLines(c.ids.renewalQuote);
  expect(lines).toHaveLength(1);
  expect(Number(lines[0].Quantity)).toBe(E.expected.quantity);
  expectClose(Number(lines[0].NetUnitPrice), E.expected.netUnitPrice, E.tolerance, "uplifted unit price");
  expectClose(Number(lines[0].TotalPrice), E.expected.total, E.tolerance, "renewal total");

  if (E.expected.startsDayAfterCurrentEnd) {
    const end = new Date(asset.CurrentLifecycleEndDate ?? asset.LifecycleEndDate); end.setDate(end.getDate() + 1);
    expect(String(lines[0].StartDate).slice(0, 10)).toBe(end.toISOString().slice(0, 10));
  }
});
