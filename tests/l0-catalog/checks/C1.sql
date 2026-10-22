-- C1 BLOCKER: Class-attribute default is not an active picklist value of the attribute (RCA)
SELECT pc.Name AS product_class, ad.Name AS attribute, pca.DefaultValue
FROM productclassificationattr pca
JOIN productclassification pc ON pc.Id = pca.ProductClassificationId
JOIN attributedefinition   ad ON ad.Id = pca.AttributeDefinitionId
WHERE pca.DefaultValue IS NOT NULL
  AND ad.PicklistId IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM attributepicklistvalue v
    WHERE v.PicklistId = ad.PicklistId AND v.Value = pca.DefaultValue AND v.Status = 'Active');
