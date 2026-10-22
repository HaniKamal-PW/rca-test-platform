-- B1 WARN: Orphan product class: no product is based on it (RCA)
SELECT pc.Id, pc.Name FROM productclassification pc
WHERE NOT EXISTS (SELECT 1 FROM product2 p WHERE p.BasedOnId = pc.Id);
