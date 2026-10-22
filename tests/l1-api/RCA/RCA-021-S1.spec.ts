import { test, expect, loadExpected, expectClose, tag } from "../_harness";

const E = loadExpected("RCA", "RCA-021-S1");

for (const tier of Object.keys(E.expected)) {
  test(`@RCA-021 @RCA-021-S1 attribute Tier=${tier} prices the line`, async ({ sf }) => {
    const pbId = await sf.idByName("Pricebook2", E.input.priceBook);
    const r = await sf.placeSalesTransaction({
      pricingPref: "System", configurationPref: "RunAndAllowErrors",
      graph: { graphId: `${E.scenarioId}-${tier}`, records: [
        { referenceId: "quote", record: { attributes: { type: "Quote" }, Name: tag("Q", E.scenarioId), Pricebook2Id: pbId } },
        { referenceId: "line1", record: { attributes: { type: "QuoteLineItem" }, QuoteId: "@{quote.id}", Product2Id: E.input.product.productId, Quantity: E.input.product.quantity,
          ProductSellingModelId: E.input.product.sellingModelId, AttributeSelections: { [E.input.attribute]: tier } } },
      ] },
    });
    expect(r.status, JSON.stringify(r.json).slice(0, 400)).toBe(200);
    const line = (r.json as any).records?.find((x: any) => x.referenceId === "line1")?.record ?? {};
    expectClose(Number(line.NetUnitPrice), Number(E.expected[tier]), E.tolerance, `net unit price for ${tier}`);
  });
}
