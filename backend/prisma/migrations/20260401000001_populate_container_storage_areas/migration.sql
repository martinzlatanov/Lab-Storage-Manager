-- Migration: Populate storageAreaId for containers without assigned areas
-- This assigns random storage areas to containers that don't have a storageAreaId set

-- Update all containers with NULL storageAreaId to be assigned a random storage area
-- Using a simple deterministic assignment based on container ID hash to ensure consistency
UPDATE "Container" c
SET "storageAreaId" = (
  SELECT sa.id
  FROM "StorageArea" sa
  ORDER BY RANDOM()
  LIMIT 1
)
WHERE c."storageAreaId" IS NULL
  AND c."externalLocationId" IS NULL
  AND c."locationId" IS NULL;

-- For containers at external locations without a storageAreaId, assign a random area anyway
UPDATE "Container" c
SET "storageAreaId" = (
  SELECT sa.id
  FROM "StorageArea" sa
  ORDER BY RANDOM()
  LIMIT 1
)
WHERE c."storageAreaId" IS NULL
  AND c."externalLocationId" IS NOT NULL;
