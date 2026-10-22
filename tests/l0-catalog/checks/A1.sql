-- A1 BLOCKER: Active product with no active standard price book entry
SELECT p.Id, p.ProductCode, p.Name
FROM product2 p
WHERE p.IsActive
  AND NOT EXISTS (
    SELECT 1 FROM pricebookentry pbe
    JOIN pricebook2 pb ON pb.Id = pbe.Pricebook2Id
    WHERE pbe.Product2Id = p.Id AND pbe.IsActive AND pb.IsStandard);
