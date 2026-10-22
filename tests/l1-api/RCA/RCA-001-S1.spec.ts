import { test, expect, loadExpected, expectClose } from "../_harness";

const E = loadExpected("RCA", "RCA-001-S1");

test(`@RCA-001 @RCA-001-S1 ${E.expectedType}: volume tier 2 discount, annual, GBP`, async ({ sf }) => {
  // Request body is illustrative; confirm field names against your org's API version (Revenue Cloud developer guide).
  const { status, json } = await sf.placeSalesTransaction({
    pricingPref: "System", configurationPref: "RunAndAllowErrors",
    graph: { graphId: E.scenarioId, records: [
      { referenceId: "quote", record: { attributes: { type: "Quote" }, Name: `Q-${E.scenarioId}`, Pricebook2Id: E.input.priceBookId, CurrencyIsoCode: E.input.currency } },
      { referenceId: "line1", record: { attributes: { type: "QuoteLineItem" }, QuoteId: "@{quote.id}", Product2Id: E.input.productId, Quantity: E.input.quantity, ProductSellingModelId: E.input.sellingModelId } },
    ] },
  });
  expect(status, `API status: ${JSON.stringify(json).slice(0, 300)}`).toBe(200);
  const line = (json as any).records?.find((r: any) => r.referenceId === "line1")?.record ?? {};
  expectClose(Number(line.NetUnitPrice), Number(E.expected.netUnitPrice), E.tolerance, "netUnitPrice");
  expectClose(Number(line.TotalPrice), Number(E.expected.totalPrice), E.tolerance, "totalPrice");
});
