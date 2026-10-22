-- A6 WARN: Active price book entry on an inactive product
SELECT pbe.Id, p.ProductCode, p.Name
FROM pricebookentry pbe JOIN product2 p ON p.Id = pbe.Product2Id
WHERE pbe.IsActive AND NOT p.IsActive;
