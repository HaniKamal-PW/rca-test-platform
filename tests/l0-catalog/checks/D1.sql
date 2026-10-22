-- D1 BLOCKER: Bundle component group with no components (RCA)
SELECT g.Id, g.Name, g.ParentProductId
FROM productcomponentgroup g
WHERE NOT EXISTS (SELECT 1 FROM productrelatedcomponent c WHERE c.ProductComponentGroupId = g.Id);
