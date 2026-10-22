import { test } from "@playwright/test";
import { RecordPages } from "../_pages";

test("@RCA-010 @RCA-010-S2 sales rep: partner account without Industry shows the validation message", async ({ page }) => {
  const ui = new RecordPages(page);
  await ui.newAccount({ name: `ACC-ui-${Date.now()}`, type: "Partner" });
  await ui.validationMessageContaining(/industry/i);
});
