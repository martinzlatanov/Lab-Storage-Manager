-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER', 'VIEWER');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('ELECTRONICS_SAMPLE', 'FIXTURE', 'SPARE_PART', 'CONSUMABLE', 'MISC');

-- CreateEnum
CREATE TYPE "FixtureCategory" AS ENUM ('VIBRATION', 'MECHANICAL_SHOCK', 'CLIMATIC', 'DUST', 'SALT', 'WATER', 'OTHER');

-- CreateEnum
CREATE TYPE "DevelopmentPhase" AS ENUM ('PRE_DV', 'DV', 'PV');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('IN_STORAGE', 'TEMP_EXIT', 'SCRAPPED', 'DEPLETED');

-- CreateEnum
CREATE TYPE "OperationType" AS ENUM ('RECEIPT', 'MOVE', 'TEMP_EXIT', 'RETURN', 'SCRAP', 'CONSUME');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "ldapUsername" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "siteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageArea" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorageArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageLocation" (
    "id" TEXT NOT NULL,
    "storageAreaId" TEXT NOT NULL,
    "row" TEXT NOT NULL,
    "shelf" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorageLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Container" (
    "id" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "notes" TEXT,
    "locationId" TEXT,
    "externalLocationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Container_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "itemType" "ItemType" NOT NULL,
    "status" "ItemStatus" NOT NULL DEFAULT 'IN_STORAGE',
    "labIdNumber" TEXT NOT NULL,
    "comment" TEXT,
    "containerId" TEXT,
    "locationId" TEXT,
    "externalLocationId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "oem" TEXT,
    "productName" TEXT,
    "productType" TEXT,
    "oemPartNumber" TEXT,
    "serialNumber" TEXT,
    "developmentPhase" "DevelopmentPhase",
    "plantLocation" TEXT,
    "testRequestNumber" TEXT,
    "requester" TEXT,
    "fixtureCategories" "FixtureCategory"[],
    "pictureUrl" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "partType" TEXT,
    "variant" TEXT,
    "forMachines" TEXT[],
    "consumableType" TEXT,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "lotNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "shelfLifeMonths" INTEGER,
    "miscName" TEXT,
    "miscDescription" TEXT,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationRecord" (
    "id" TEXT NOT NULL,
    "operationType" "OperationType" NOT NULL,
    "itemId" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "fromContainerId" TEXT,
    "toContainerId" TEXT,
    "fromExternalLocationId" TEXT,
    "toExternalLocationId" TEXT,
    "expectedReturnDate" TIMESTAMP(3),
    "quantityConsumed" DOUBLE PRECISION,

    CONSTRAINT "OperationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_ldapUsername_key" ON "User"("ldapUsername");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_ldapUsername_idx" ON "User"("ldapUsername");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Site_name_key" ON "Site"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Building_siteId_name_key" ON "Building"("siteId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "StorageArea_buildingId_code_key" ON "StorageArea"("buildingId", "code");

-- CreateIndex
CREATE INDEX "StorageLocation_label_idx" ON "StorageLocation"("label");

-- CreateIndex
CREATE UNIQUE INDEX "StorageLocation_storageAreaId_row_shelf_level_key" ON "StorageLocation"("storageAreaId", "row", "shelf", "level");

-- CreateIndex
CREATE UNIQUE INDEX "Container_barcode_key" ON "Container"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "Item_barcode_key" ON "Item"("barcode");

-- CreateIndex
CREATE INDEX "Item_itemType_idx" ON "Item"("itemType");

-- CreateIndex
CREATE INDEX "Item_status_idx" ON "Item"("status");

-- CreateIndex
CREATE INDEX "Item_barcode_idx" ON "Item"("barcode");

-- CreateIndex
CREATE INDEX "Item_labIdNumber_idx" ON "Item"("labIdNumber");

-- CreateIndex
CREATE INDEX "Item_testRequestNumber_idx" ON "Item"("testRequestNumber");

-- CreateIndex
CREATE INDEX "Item_locationId_idx" ON "Item"("locationId");

-- CreateIndex
CREATE INDEX "Item_containerId_idx" ON "Item"("containerId");

-- CreateIndex
CREATE INDEX "OperationRecord_itemId_idx" ON "OperationRecord"("itemId");

-- CreateIndex
CREATE INDEX "OperationRecord_performedById_idx" ON "OperationRecord"("performedById");

-- CreateIndex
CREATE INDEX "OperationRecord_performedAt_idx" ON "OperationRecord"("performedAt");

-- CreateIndex
CREATE INDEX "OperationRecord_operationType_idx" ON "OperationRecord"("operationType");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageArea" ADD CONSTRAINT "StorageArea_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageLocation" ADD CONSTRAINT "StorageLocation_storageAreaId_fkey" FOREIGN KEY ("storageAreaId") REFERENCES "StorageArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Container" ADD CONSTRAINT "Container_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StorageLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Container" ADD CONSTRAINT "Container_externalLocationId_fkey" FOREIGN KEY ("externalLocationId") REFERENCES "ExternalLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "Container"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StorageLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_externalLocationId_fkey" FOREIGN KEY ("externalLocationId") REFERENCES "ExternalLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationRecord" ADD CONSTRAINT "OperationRecord_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationRecord" ADD CONSTRAINT "OperationRecord_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationRecord" ADD CONSTRAINT "OperationRecord_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "StorageLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationRecord" ADD CONSTRAINT "OperationRecord_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "StorageLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationRecord" ADD CONSTRAINT "OperationRecord_fromContainerId_fkey" FOREIGN KEY ("fromContainerId") REFERENCES "Container"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationRecord" ADD CONSTRAINT "OperationRecord_toContainerId_fkey" FOREIGN KEY ("toContainerId") REFERENCES "Container"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationRecord" ADD CONSTRAINT "OperationRecord_fromExternalLocationId_fkey" FOREIGN KEY ("fromExternalLocationId") REFERENCES "ExternalLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationRecord" ADD CONSTRAINT "OperationRecord_toExternalLocationId_fkey" FOREIGN KEY ("toExternalLocationId") REFERENCES "ExternalLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

