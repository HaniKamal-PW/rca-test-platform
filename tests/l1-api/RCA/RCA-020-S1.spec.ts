import { test, expect, loadExpected, expectClose, tag } from "../_harness";

const E = loadExpected("RCA", "RCA-020-S1");

/** Bundle structure proven at the API: required child always present, optional child toggles lines and total. */
async function place(sf: any, withOptional: boolean) {
  const pbId = await sf.idByName("Pricebook2", E.input.priceBook);
  const accountId = await sf.create("Account", { Name: tag("ACC", E.scenarioId), CurrencyIsoCode: E.input.account.currency });
  const records: any[] = [
    { referenceId: "quote", record: { attributes: { type: "Quote" }, Name: tag("Q", E.scenarioId), Pricebook2Id: pbId } },
    { referenceId: "bundle", record: { attributes: { type: "QuoteLineItem" }, QuoteId: "@{quote.id}", Product2Id: E.input.bundle.productId, Quantity: E.input.bundle.quantity, ProductSellingModelId: E.input.bundle.sellingModelId } },
  ];
  const r = await sf.placeSalesTransaction({
    pricingPref: "System", configurationPref: "RunAndAllowErrors",
    configurationOptions: { addDefaultConfiguration: true, executeConfigurationRules: true, validateProductCatalog: true },
    // optional component selection is expressed through the configuration input of the bundle line; confirm shape in your org
    configurationInput: withOptional ? { bundle: { components: [{ productCode: E.input.optionalChild, quantity: 1 }] } } : {},
    graph: { graphId: E.scenarioId + (withOptional ? "-opt" : "-noopt"), records },
  });
  expect(r.status, JSON.stringify(r.json).slice(0, 400)).toBe(200);
  const quoteId = (r.json as any).records?.find((x: any) => x.referenceId === "quote")?.record?.Id;
  const lines = await sf.query(`SELECT Product2.ProductCode, TotalPrice FROM QuoteLineItem WHERE QuoteId='${quoteId}'`);
  const total = lines.reduce((s: number, l: any) => s + Number(l.TotalPrice), 0);
  return { lines, total, accountId };
}

test.describe("@RCA-020 @RCA-020-S1 Bundle: required + optional children", () => {
  test("with optional child", async ({ sf }) => {
    const { lines, total } = await place(sf, true);
    expect(lines).toHaveLength(E.expected.linesWithOptional);
    expect(lines.map((l: any) => l.Product2.ProductCode)).toContain(E.input.requiredChild);
    expect(lines.map((l: any) => l.Product2.ProductCode)).toContain(E.input.optionalChild);
    expectClose(total, E.expected.totalWithOptional, E.tolerance, "total with optional");
  });
  test("without optional child", async ({ sf }) => {
    const { lines, total } = await place(sf, false);
    expect(lines).toHaveLength(E.expected.linesWithoutOptional);
    expect(lines.map((l: any) => l.Product2.ProductCode)).toContain(E.input.requiredChild);
    expectClose(total, E.expected.totalWithoutOptional, E.tolerance, "total without optional");
  });
});
