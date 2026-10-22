/**
 * Transaction Line Editor (RCA) helper — THE ONLY FILE THAT KNOWS THE EDITOR'S DOM.
 * Tests call these verbs; they never hold locators. After a Salesforce release, fixes land here only.
 *
 * Each method carries:
 *   @since    the release it was written for
 *   @verified the last release / API version it was confirmed against
 * Gatekeeper rejects a changed method whose @verified line was not updated with a reason.
 * `npm run helper-churn` counts methods changed since the last release tag (metric 9).
 *
 * Written for API 68.0 (Winter '26). Accessible names below are the editor's default labels and
 * MUST be confirmed on first run against your org (`npx playwright codegen` or the planner agent helps).
 */
import { expect, type Page, type Locator } from "@playwright/test";

export type LinePrice = { list: number; net: number; total: number };

const money = (s: string | null) => Number((s ?? "").replace(/[^\d.-]/g, "")) || 0;

export class TransactionLineEditor {
  constructor(private page: Page) {}

  /** @since Winter'26  @verified API 68.0 — open a quote record and launch the editor */
  async open(quoteId: string) {
    await this.page.goto(`/lightning/r/Quote/${quoteId}/view`);
    await this.page.getByRole("button", { name: /edit lines|transaction line editor/i }).click();
    await expect(this.editor()).toBeVisible();
  }

  /** @since Winter'26  @verified API 68.0 — root of the editor; every other locator is scoped inside it */
  editor(): Locator {
    return this.page.getByRole("region", { name: /transaction line editor|quote lines/i }).or(this.page.getByRole("main"));
  }

  /** @since Winter'26  @verified API 68.0 */
  async searchProduct(code: string) {
    const e = this.editor();
    await e.getByRole("button", { name: /add products?/i }).click();
    const search = this.page.getByRole("searchbox", { name: /search products?/i }).or(this.page.getByRole("textbox", { name: /search/i }));
    await search.fill(code);
    await search.press("Enter");
    await expect(this.page.getByRole("row", { name: new RegExp(code, "i") })).toBeVisible();
  }

  /** @since Winter'26  @verified API 68.0 — add a product by code with a quantity */
  async addLine(code: string, qty: number) {
    await this.searchProduct(code);
    const row = this.page.getByRole("row", { name: new RegExp(code, "i") });
    await row.getByRole("checkbox").check();
    await this.page.getByRole("button", { name: /^add$|add to quote|done/i }).click();
    await this.setQuantity(code, qty);
  }

  /** @since Winter'26  @verified API 68.0 */
  async setQuantity(code: string, qty: number) {
    const cell = this.lineRow(code).getByRole("gridcell", { name: /quantity/i }).or(this.lineRow(code).getByRole("spinbutton", { name: /quantity/i }));
    await cell.click();
    const input = this.lineRow(code).getByRole("spinbutton").or(this.lineRow(code).getByRole("textbox", { name: /quantity/i }));
    await input.fill(String(qty));
    await input.press("Enter");
  }

  /** @since Winter'26  @verified API 68.0 — configure a bundle / product attributes: { attributeLabel: value, componentName: true|false } */
  async configure(code: string, options: Record<string, string | boolean>) {
    await this.lineRow(code).getByRole("button", { name: /configure/i }).click();
    const dlg = this.page.getByRole("dialog");
    for (const [label, value] of Object.entries(options)) {
      if (typeof value === "boolean") {
        const box = dlg.getByRole("checkbox", { name: new RegExp(label, "i") });
        value ? await box.check() : await box.uncheck();
      } else {
        const field = dlg.getByRole("combobox", { name: new RegExp(label, "i") });
        if (await field.count()) { await field.click(); await this.page.getByRole("option", { name: new RegExp(`^${value}$`, "i") }).click(); }
        else await dlg.getByRole("textbox", { name: new RegExp(label, "i") }).fill(value);
      }
    }
    await dlg.getByRole("button", { name: /^save$|apply|done/i }).click();
    await expect(dlg).toBeHidden();
  }

  /** @since Winter'26  @verified API 68.0 — the configurator's validation message, if any (for invalid-selection tests) */
  async configurationError(): Promise<string | null> {
    const alert = this.page.getByRole("dialog").getByRole("alert");
    return (await alert.count()) ? alert.first().textContent() : null;
  }

  /** @since Winter'26  @verified API 68.0 */
  async setDiscount(code: string, pct: number) {
    const cell = this.lineRow(code).getByRole("gridcell", { name: /discount/i });
    await cell.click();
    const input = this.lineRow(code).getByRole("spinbutton", { name: /discount/i }).or(this.lineRow(code).getByRole("textbox", { name: /discount/i }));
    await input.fill(String(pct));
    await input.press("Enter");
  }

  /** @since Winter'26  @verified API 68.0 — trigger pricing and wait for it to settle */
  async price() {
    const btn = this.editor().getByRole("button", { name: /^price$|calculate|reprice/i });
    if (await btn.count()) await btn.click();
    await expect(this.editor().getByText(/pricing|calculating/i)).toBeHidden({ timeout: 30_000 });
  }

  /** @since Winter'26  @verified API 68.0 */
  async save() {
    await this.editor().getByRole("button", { name: /^save$/i }).click();
    await expect(this.page.getByRole("status").or(this.page.getByText(/saved/i)).first()).toBeVisible();
  }

  /** @since Winter'26  @verified API 68.0 — list / net / total for one line */
  async linePrice(code: string): Promise<LinePrice> {
    const row = this.lineRow(code);
    const get = async (re: RegExp) => money(await row.getByRole("gridcell", { name: re }).first().textContent());
    return { list: await get(/list price/i), net: await get(/net (unit )?price/i), total: await get(/total price|net total/i) };
  }

  /** @since Winter'26  @verified API 68.0 */
  async quoteTotal(): Promise<number> {
    const el = this.editor().getByText(/total|grand total/i).locator("xpath=following::*[1]").first();
    return money(await el.textContent());
  }

  /** @since Winter'26  @verified API 68.0 — product codes of the child lines under a bundle */
  async bundleChildren(code: string): Promise<string[]> {
    const row = this.lineRow(code);
    const toggle = row.getByRole("button", { name: /expand|collapse/i });
    if (await toggle.count()) await toggle.click();
    const rows = this.page.getByRole("row", { name: /component|child/i });
    return (await rows.allTextContents()).map((t) => t.trim());
  }

  private lineRow(code: string): Locator {
    return this.editor().getByRole("row", { name: new RegExp(code, "i") }).first();
  }
}
