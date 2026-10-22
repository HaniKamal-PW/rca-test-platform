-- R1 BLOCKER: Inactive record type on Account, Opportunity or Quote (reference data)
SELECT SobjectType, DeveloperName FROM recordtype WHERE NOT IsActive;
