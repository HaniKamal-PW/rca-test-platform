import { test } from "@playwright/test";
import { RecordPages } from "../_pages";

test("@SMOKE-001 Lightning home loads for the logged-in user", async ({ page }) => {
  await new RecordPages(page).homeLoaded();
});
