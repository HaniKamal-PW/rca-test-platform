-- A8s BLOCKER: Duplicate price book entry for the same product and price book (standard orgs)
SELECT Product2Id, Pricebook2Id, count(*) AS n
FROM pricebookentry
GROUP BY 1,2 HAVING count(*) > 1;
