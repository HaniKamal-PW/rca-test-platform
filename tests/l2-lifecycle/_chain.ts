import { SF, expect, tag, type Expected } from "../l1-api/_harness";

/** Account → Opportunity → Quote → Order chain. Each step returns ids and asserts record state.
 *  Field names follow standard Salesforce + RCA defaults; confirm Quote/Order fields against your org. */
export class Chain {
  ids: Record<string, string> = {};
  constructor(private sf: SF, private E: Expected) {}

  async account() {
    const i = this.E.input.account ?? {};
    this.ids.account = await this.sf.create("Account", {
      Name: tag("ACC", this.E.scenarioId), Type: i.type, CurrencyIsoCode: i.currency, ...(i.recordType ? { RecordTypeId: await this.sf.idByName("RecordType", i.recordType, "AND SobjectType='Account'") } : {}),
    });
    const a = await this.sf.get("Account", this.ids.account, ["Id", "Type"]);
    expect(a.Id).toBeTruthy();
    return this.ids.account;
  }

  async opportunity() {
    const i = this.E.input.opportunity ?? {};
    const close = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    this.ids.opportunity = await this.sf.create("Opportunity", {
      Name: tag("OPP", this.E.scenarioId), AccountId: this.ids.account, StageName: i.stage ?? "Prospecting", CloseDate: close,
      ...(i.priceBook ? { Pricebook2Id: await this.sf.idByName("Pricebook2", i.priceBook) } : {}),
    });
    return this.ids.opportunity;
  }

  /** Standard Quote with QuoteLineItems. For RCA pricing use placeQuoteRCA instead. */
  async quote() {
    const i = this.E.input;
    const pbId = await this.sf.idByName("Pricebook2", i.priceBook);
    this.ids.quote = await this.sf.create("Quote", { Name: tag("Q", this.E.scenarioId), OpportunityId: this.ids.opportunity, Pricebook2Id: pbId });
    for (const line of i.lines ?? []) {
      const pbe = await this.sf.query(`SELECT Id, UnitPrice FROM PricebookEntry WHERE Pricebook2Id='${pbId}' AND Product2.ProductCode='${line.productCode}' AND IsActive=true LIMIT 1`);
      expect(pbe.length, `no active PBE for ${line.productCode} in ${i.priceBook}`).toBe(1);
      await this.sf.create("QuoteLineItem", { QuoteId: this.ids.quote, PricebookEntryId: pbe[0].Id, Quantity: line.quantity, UnitPrice: pbe[0].UnitPrice });
    }
    return this.ids.quote;
  }

  /** RCA: one Place Sales Transaction call prices and configures the quote. */
  async placeQuoteRCA() {
    const i = this.E.input;
    const records: any[] = [{ referenceId: "quote", record: { attributes: { type: "Quote" }, Name: tag("Q", this.E.scenarioId), OpportunityId: this.ids.opportunity, Pricebook2Id: await this.sf.idByName("Pricebook2", i.priceBook) } }];
    (i.lines ?? []).forEach((l: any, n: number) => records.push({ referenceId: `line${n + 1}`, record: { attributes: { type: "QuoteLineItem" }, QuoteId: "@{quote.id}", Product2Id: l.productId, Quantity: l.quantity, ProductSellingModelId: l.sellingModelId } }));
    const r = await this.sf.placeSalesTransaction({ pricingPref: "System", configurationPref: "RunAndAllowErrors", graph: { graphId: this.E.scenarioId, records } });
    expect(r.status, `Place Sales Transaction: ${JSON.stringify(r.json).slice(0, 400)}`).toBe(200);
    this.ids.quote = (r.json as any).records?.find((x: any) => x.referenceId === "quote")?.record?.Id ?? this.ids.quote;
    return r.json;
  }

  async quoteTotals() {
    return this.sf.get("Quote", this.ids.quote, ["Id", "Status", "TotalPrice", "GrandTotal", "Subtotal"]);
  }

  async setQuoteStatus(status: string) {
    await this.sf.update("Quote", this.ids.quote, { Status: status });
    return (await this.sf.get("Quote", this.ids.quote, ["Status"])).Status;
  }

  async syncQuoteToOpportunity() {
    await this.sf.update("Opportunity", this.ids.opportunity, { SyncedQuoteId: this.ids.quote });
    return this.sf.get("Opportunity", this.ids.opportunity, ["Amount", "StageName", "SyncedQuoteId"]);
  }

  /** Standard Order from the quote's lines (RCA orgs typically create it from the quote action; API path shown). */
  async order() {
    const pbId = (await this.sf.get("Quote", this.ids.quote, ["Pricebook2Id"])).Pricebook2Id;
    this.ids.order = await this.sf.create("Order", {
      AccountId: this.ids.account, OpportunityId: this.ids.opportunity, QuoteId: this.ids.quote, Pricebook2Id: pbId,
      EffectiveDate: new Date().toISOString().slice(0, 10), Status: "Draft",
    });
    const lines = await this.sf.query(`SELECT PricebookEntryId, Quantity, UnitPrice FROM QuoteLineItem WHERE QuoteId='${this.ids.quote}'`);
    for (const l of lines) await this.sf.create("OrderItem", { OrderId: this.ids.order, PricebookEntryId: l.PricebookEntryId, Quantity: l.Quantity, UnitPrice: l.UnitPrice });
    return this.ids.order;
  }

  async activateOrder() {
    await this.sf.update("Order", this.ids.order, { Status: "Activated" });
    return this.sf.get("Order", this.ids.order, ["Status", "TotalAmount"]);
  }

  async orderItems() {
    return this.sf.query(`SELECT Quantity, UnitPrice, TotalPrice FROM OrderItem WHERE OrderId='${this.ids.order}'`);
  }

  // ---------- RCA lifecycle (API 68.0). Request bodies follow the Revenue Cloud developer guide; confirm against your org. ----------

  /** Assets created by the activated order (RCA asset lifecycle). */
  async assets() {
    return this.sf.query(`SELECT Id, Name, LifecycleStartDate, LifecycleEndDate, CurrentQuantity, CurrentMrr, CurrentLifecycleEndDate FROM Asset WHERE AccountId='${this.ids.account}'`);
  }

  /** Mid-term amendment: quantity change on an asset → amendment quote; returns the priced quote records. */
  async amend(changes: { assetName?: string; newQuantity: number; effectiveDate?: string }) {
    const asset = (await this.assets()).find((a: any) => !changes.assetName || a.Name.includes(changes.assetName));
    expect(asset, "no asset to amend").toBeTruthy();
    const body = { assetIds: [asset.Id], startDate: changes.effectiveDate ?? new Date().toISOString().slice(0, 10), quoteId: null,
      lineChanges: [{ assetId: asset.Id, quantity: changes.newQuantity }] };
    const res = await this.sf.ctx.post(`/services/data/v${this.sf.v}/connect/rev/sales-transaction/actions/amend`, { data: body });
    const json = res.ok() ? await res.json() : await res.text();
    expect(res.status(), `amend: ${JSON.stringify(json).slice(0, 400)}`).toBe(200);
    this.ids.amendQuote = (json as any).quoteId ?? (json as any).records?.[0]?.record?.Id;
    return json;
  }

  /** Renewal: new term with optional uplift %. */
  async renew(opts: { termMonths: number; upliftPct?: number }) {
    const assets = await this.assets();
    expect(assets.length, "no assets to renew").toBeGreaterThan(0);
    const body = { assetIds: assets.map((a: any) => a.Id), renewalTerm: opts.termMonths, upliftPercent: opts.upliftPct ?? 0 };
    const res = await this.sf.ctx.post(`/services/data/v${this.sf.v}/connect/rev/sales-transaction/actions/renew`, { data: body });
    const json = res.ok() ? await res.json() : await res.text();
    expect(res.status(), `renew: ${JSON.stringify(json).slice(0, 400)}`).toBe(200);
    this.ids.renewalQuote = (json as any).quoteId ?? (json as any).records?.[0]?.record?.Id;
    return json;
  }

  /** Cancellation from a date; returns the cancellation quote/order payload (credits are asserted from its lines). */
  async cancel(effectiveDate?: string) {
    const assets = await this.assets();
    const body = { assetIds: assets.map((a: any) => a.Id), cancellationDate: effectiveDate ?? new Date().toISOString().slice(0, 10) };
    const res = await this.sf.ctx.post(`/services/data/v${this.sf.v}/connect/rev/sales-transaction/actions/cancel`, { data: body });
    const json = res.ok() ? await res.json() : await res.text();
    expect(res.status(), `cancel: ${JSON.stringify(json).slice(0, 400)}`).toBe(200);
    return json;
  }

  /** Quote lines with pricing fields (works for the main quote or any amendment/renewal quote id). */
  async quoteLines(quoteId = this.ids.quote) {
    return this.sf.query(`SELECT Product2.ProductCode, Quantity, ListPrice, UnitPrice, NetUnitPrice, TotalPrice, ProductSellingModelId, StartDate, EndDate FROM QuoteLineItem WHERE QuoteId='${quoteId}'`);
  }
}
