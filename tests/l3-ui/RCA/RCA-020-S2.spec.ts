import { test, expect } from "@playwright/test";
import { loadExpected, expectClose } from "../../l1-api/_harness";
import { TransactionLineEditor } from "../_tle";

const E = loadExpected("RCA", "RCA-020-S1");

/** The ONE Transaction Line Editor journey for bundles: what the sales rep sees and does. No locators here — all in _tle.ts. */
test("@RCA-020 @RCA-020-S2 sales rep adds the bundle, selects the optional child, sees children and total", async ({ page }) => {
  const quoteId = process.env.QUOTE_ID;
  test.skip(!quoteId, "set QUOTE_ID to an empty draft quote on the Standard GBP price book");
  const tle = new TransactionLineEditor(page);
  await tle.open(quoteId!);
  await tle.addLine(E.input.bundle.productCode, E.input.bundle.quantity);
  await tle.configure(E.input.bundle.productCode, { [E.input.optionalChild]: true });
  await tle.price();
  const children = await tle.bundleChildren(E.input.bundle.productCode);
  expect(children.join(" ")).toContain(E.input.requiredChild);
  expect(children.join(" ")).toContain(E.input.optionalChild);
  expectClose(await tle.quoteTotal(), E.expected.totalWithOptional, E.tolerance, "quote total");
  await tle.save();
});
