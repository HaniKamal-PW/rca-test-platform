-- A8 BLOCKER: Duplicate entry for the same product, price book, currency and selling model (RCA / multi-currency)
-- On a standard org the extra columns do not exist and this check is reported SKIPPED, never passed. See A8s.
SELECT Product2Id, Pricebook2Id, CurrencyIsoCode, ProductSellingModelId, count(*) AS n
FROM pricebookentry
GROUP BY 1,2,3,4 HAVING count(*) > 1;
