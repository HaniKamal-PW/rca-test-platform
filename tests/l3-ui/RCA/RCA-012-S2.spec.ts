import { test } from "@playwright/test";
import { PERSONA_ALIAS } from "../../../playwright.config";
import { RecordPages } from "../_pages";

/** The APPROVER persona actions the pending request. QUOTE_ID comes from RCA-012-S1 or a fixture. */
test.use({ storageState: `.auth/${PERSONA_ALIAS("approver")}.json` });

test("@RCA-012 @RCA-012-S2 approver approves the pending quote", async ({ page }) => {
  const quoteId = process.env.QUOTE_ID;
  test.skip(!quoteId, "set QUOTE_ID to a quote with a pending approval");
  await new RecordPages(page).approveQuote(quoteId!, "approved by automation");
});
