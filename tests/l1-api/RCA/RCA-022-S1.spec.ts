import { test, expect, loadExpected, tag } from "../_harness";

const E = loadExpected("RCA", "RCA-022-S1");

/** Constraint-model rules are logic → proven at L1. configurationPref "RunAndBlock" makes an invalid selection fail the transaction. */
async function place(sf: any, tier: string) {
  const pbId = await sf.idByName("Pricebook2", E.input.priceBook);
  return sf.placeSalesTransaction({
    pricingPref: "System", configurationPref: "RunAndBlock",
    configurationOptions: { executeConfigurationRules: true, validateProductCatalog: true },
    configurationInput: { bundle: { attributes: { [E.input.attribute]: tier }, components: [{ productCode: E.input.optionalChild, quantity: 1 }] } },
    graph: { graphId: `${E.scenarioId}-${tier}`, records: [
      { referenceId: "quote", record: { attributes: { type: "Quote" }, Name: tag("Q", E.scenarioId), Pricebook2Id: pbId } },
      { referenceId: "bundle", record: { attributes: { type: "QuoteLineItem" }, QuoteId: "@{quote.id}", Product2Id: E.input.bundle.productId, Quantity: E.input.bundle.quantity, ProductSellingModelId: E.input.bundle.sellingModelId } },
    ] },
  });
}

test.describe("@RCA-022 @RCA-022-S1 Configuration rules", () => {
  test("invalid selection is rejected and nothing is saved", async ({ sf }) => {
    const r = await place(sf, E.expected.invalidTier);
    const text = JSON.stringify(r.json);
    const rejected = r.status !== 200 || /configuration|constraint|rule|invalid/i.test(text);
    expect(rejected, `expected a configuration error, got ${r.status}: ${text.slice(0, 300)}`).toBeTruthy();
    const quoteId = (r.json as any)?.records?.find?.((x: any) => x.referenceId === "quote")?.record?.Id;
    if (quoteId) expect(await sf.query(`SELECT Id FROM QuoteLineItem WHERE QuoteId='${quoteId}'`)).toHaveLength(0);
  });
  test("valid selection is accepted", async ({ sf }) => {
    const r = await place(sf, E.expected.validTier);
    expect(r.status, JSON.stringify(r.json).slice(0, 300)).toBe(200);
    const quoteId = (r.json as any).records?.find((x: any) => x.referenceId === "quote")?.record?.Id;
    expect(await sf.query(`SELECT Id FROM QuoteLineItem WHERE QuoteId='${quoteId}'`)).toHaveLength(E.expected.validLines);
  });
});
