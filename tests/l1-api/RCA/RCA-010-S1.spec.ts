import { test, expect, loadExpected, tag } from "../_harness";
import { Chain } from "../../l2-lifecycle/_chain";

const E = loadExpected("RCA", "RCA-010-S1");

test.describe("@RCA-010 @RCA-010-S1 Account: partner type drives price book", () => {
  test("positive: partner account → opportunity uses the partner price book", async ({ sf }) => {
    const c = new Chain(sf, E);
    await sf.create("Account", { Name: tag("ACC", E.scenarioId), Type: E.input.account.type, Industry: E.input.account.industry, CurrencyIsoCode: E.input.account.currency })
      .then((id: string) => (c.ids.account = id));
    await c.opportunity();
    const opp = await sf.get("Opportunity", c.ids.opportunity, ["Pricebook2Id"]);
    const pb = await sf.get("Pricebook2", opp.Pricebook2Id, ["Name"]);
    expect(pb.Name).toBe(E.expected.opportunityPriceBook);
  });

  test("negative: partner account without Industry is rejected by the validation rule", async ({ sf }) => {
    const r = await sf.tryCreate("Account", { Name: tag("ACC", E.scenarioId), Type: E.input.account.type, CurrencyIsoCode: E.input.account.currency });
    expect(r.status).toBe(400);
    expect(r.body[0]?.errorCode).toBe(E.expected.negative.errorCode);
  });
});
