/** Standard-object page helpers (Account/Quote record pages). Same rule as _tle.ts: locators live here, not in specs.
 *  @since Winter'26  @verified API 68.0 */
import { expect, type Page } from "@playwright/test";

export class RecordPages {
  constructor(private page: Page) {}
  async newAccount(fields: { name: string; type?: string; industry?: string }) {
    await this.page.goto("/lightning/o/Account/new");
    await this.page.getByRole("textbox", { name: /account name/i }).fill(fields.name);
    if (fields.type) { await this.page.getByRole("combobox", { name: /^type$/i }).click(); await this.page.getByRole("option", { name: new RegExp(`^${fields.type}$`, "i") }).click(); }
    if (fields.industry) { await this.page.getByRole("combobox", { name: /^industry$/i }).click(); await this.page.getByRole("option", { name: new RegExp(`^${fields.industry}$`, "i") }).click(); }
    await this.page.getByRole("button", { name: /^save$/i }).click();
  }
  async validationMessageContaining(text: RegExp) { await expect(this.page.getByText(text).first()).toBeVisible(); }
  async approveQuote(quoteId: string, comment: string) {
    await this.page.goto(`/lightning/r/Quote/${quoteId}/view`);
    await this.page.getByRole("button", { name: /approve/i }).click();
    await this.page.getByRole("textbox", { name: /comment/i }).fill(comment);
    await this.page.getByRole("button", { name: /^approve$/i }).click();
    await expect(this.page.getByText(/approved/i).first()).toBeVisible();
  }
  async homeLoaded() { await this.page.goto("/lightning/page/home"); await expect(this.page.getByRole("navigation").first()).toBeVisible(); }
}
