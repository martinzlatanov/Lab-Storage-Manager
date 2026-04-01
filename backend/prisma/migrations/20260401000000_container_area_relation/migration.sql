-- Migration: add direct storageAreaId FK on Container
-- Container.storageAreaId → StorageArea

-- 1. Add the nullable column (no default needed — backfill handles existing rows)
ALTER TABLE "Container"
  ADD COLUMN "storageAreaId" TEXT;

-- 2. Backfill from existing location→area relationship
--    Only containers with a locationId get an area; external and unassigned stay NULL
UPDATE "Container" c
SET    "storageAreaId" = sl."storageAreaId"
FROM   "StorageLocation" sl
WHERE  c."locationId" = sl.id
  AND  c."locationId" IS NOT NULL;

-- 3. Add the foreign key constraint
ALTER TABLE "Container"
  ADD CONSTRAINT "Container_storageAreaId_fkey"
  FOREIGN KEY ("storageAreaId")
  REFERENCES "StorageArea"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Optional index for the new FK column (improves filter-by-area queries)
CREATE INDEX "Container_storageAreaId_idx" ON "Container"("storageAreaId");
