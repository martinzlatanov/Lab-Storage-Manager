/**
 * Database seed script for Lab Storage Manager.
 *
 * Populates the database with the same sample data used in the frontend mocks,
 * so that the system can be tested end-to-end once the frontend switches from
 * mocks to real API calls.
 *
 * Run:  npm run db:seed
 * Requires:  DATABASE_URL to be set (postgres running)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // ─── Users ──────────────────────────────────────────────────────────────────
  console.log("  → Users...");
  const users = await Promise.all([
    prisma.user.upsert({
      where: { ldapUsername: "mzlatanov" },
      update: {},
      create: {
        id: "u1",
        ldapUsername: "mzlatanov",
        displayName: "Martin Zlatanov",
        email: "m.zlatanov@visteon.com",
        role: "ADMIN",
        siteId: "s1",
      },
    }),
    prisma.user.upsert({
      where: { ldapUsername: "vpenev" },
      update: {},
      create: {
        id: "u2",
        ldapUsername: "vpenev",
        displayName: "Venelin Penev",
        email: "v.penev@visteon.com",
        role: "USER",
        siteId: "s1",
      },
    }),
    prisma.user.upsert({
      where: { ldapUsername: "gdimitrov" },
      update: {},
      create: {
        id: "u3",
        ldapUsername: "gdimitrov",
        displayName: "Georgi Dimitrov",
        email: "g.dimitrov@visteon.com",
        role: "USER",
        siteId: "s2",
      },
    }),
    prisma.user.upsert({
      where: { ldapUsername: "aperez" },
      update: {},
      create: {
        id: "u4",
        ldapUsername: "aperez",
        displayName: "Ana Perez",
        email: "a.perez@visteon.com",
        role: "VIEWER",
        siteId: "s3",
      },
    }),
    prisma.user.upsert({
      where: { ldapUsername: "rschmidt" },
      update: {},
      create: {
        id: "u5",
        ldapUsername: "rschmidt",
        displayName: "Robert Schmidt",
        email: "r.schmidt@visteon.com",
        role: "USER",
        siteId: "s2",
        isActive: false,
      },
    }),
  ]);
  console.log(`    ✓ ${users.length} users`);

  // ─── Sites → Buildings → Areas → Locations ─────────────────────────────────
  console.log("  → Storage hierarchy...");

  // Sofia
  const sofia = await prisma.site.upsert({
    where: { id: "s1" },
    update: {},
    create: { id: "s1", name: "Sofia" },
  });
  const mainBldg = await prisma.building.upsert({
    where: { id: "b1" },
    update: {},
    create: { id: "b1", name: "Main Building", siteId: sofia.id },
  });
  const labBldg = await prisma.building.upsert({
    where: { id: "b2" },
    update: {},
    create: { id: "b2", name: "Lab Building", siteId: sofia.id },
  });

  // Area A (Main Building)
  const areaA = await prisma.storageArea.upsert({
    where: { id: "sa1" },
    update: {},
    create: { id: "sa1", code: "A", buildingId: mainBldg.id },
  });
  const locationsA = [
    { id: "l1", row: "01", shelf: "01", level: "1", label: "A-01-01-1" },
    { id: "l2", row: "01", shelf: "01", level: "2", label: "A-01-01-2" },
    { id: "l3", row: "01", shelf: "02", level: "1", label: "A-01-02-1" },
    { id: "l4", row: "01", shelf: "02", level: "2", label: "A-01-02-2" },
    { id: "l5", row: "02", shelf: "01", level: "1", label: "A-02-01-1" },
  ];
  for (const loc of locationsA) {
    await prisma.storageLocation.upsert({
      where: { id: loc.id },
      update: {},
      create: { ...loc, storageAreaId: areaA.id },
    });
  }

  // Area B (Main Building)
  const areaB = await prisma.storageArea.upsert({
    where: { id: "sa2" },
    update: {},
    create: { id: "sa2", code: "B", buildingId: mainBldg.id },
  });
  const locationsB = [
    { id: "l6", row: "01", shelf: "01", level: "1", label: "B-01-01-1" },
    { id: "l7", row: "01", shelf: "01", level: "2", label: "B-01-01-2" },
    { id: "l8", row: "01", shelf: "02", level: "1", label: "B-01-02-1" },
  ];
  for (const loc of locationsB) {
    await prisma.storageLocation.upsert({
      where: { id: loc.id },
      update: {},
      create: { ...loc, storageAreaId: areaB.id },
    });
  }

  // Area C (Lab Building)
  const areaC = await prisma.storageArea.upsert({
    where: { id: "sa3" },
    update: {},
    create: { id: "sa3", code: "C", buildingId: labBldg.id },
  });
  const locationsC = [
    { id: "l9", row: "01", shelf: "01", level: "1", label: "C-01-01-1" },
    { id: "l10", row: "01", shelf: "01", level: "2", label: "C-01-01-2" },
  ];
  for (const loc of locationsC) {
    await prisma.storageLocation.upsert({
      where: { id: loc.id },
      update: {},
      create: { ...loc, storageAreaId: areaC.id },
    });
  }

  // Munich
  const munich = await prisma.site.upsert({
    where: { id: "s2" },
    update: {},
    create: { id: "s2", name: "Munich" },
  });
  const techCenter = await prisma.building.upsert({
    where: { id: "b3" },
    update: {},
    create: { id: "b3", name: "Tech Center", siteId: munich.id },
  });
  const areaAMunich = await prisma.storageArea.upsert({
    where: { id: "sa4" },
    update: {},
    create: { id: "sa4", code: "A", buildingId: techCenter.id },
  });
  for (const loc of [
    { id: "l11", row: "01", shelf: "01", level: "1", label: "A-01-01-1" },
    { id: "l12", row: "01", shelf: "01", level: "2", label: "A-01-01-2" },
  ]) {
    await prisma.storageLocation.upsert({
      where: { id: loc.id },
      update: {},
      create: { ...loc, storageAreaId: areaAMunich.id },
    });
  }

  // Paris
  const paris = await prisma.site.upsert({
    where: { id: "s3" },
    update: {},
    create: { id: "s3", name: "Paris" },
  });
  const rdCenter = await prisma.building.upsert({
    where: { id: "b4" },
    update: {},
    create: { id: "b4", name: "R&D Center", siteId: paris.id },
  });
  const areaAParis = await prisma.storageArea.upsert({
    where: { id: "sa5" },
    update: {},
    create: { id: "sa5", code: "A", buildingId: rdCenter.id },
  });
  await prisma.storageLocation.upsert({
    where: { id: "l13" },
    update: {},
    create: { id: "l13", row: "01", shelf: "01", level: "1", label: "A-01-01-1", storageAreaId: areaAParis.id },
  });

  console.log("    ✓ 3 sites, 4 buildings, 5 areas, 13 locations");

  // ─── External Locations ─────────────────────────────────────────────────────
  console.log("  → External locations...");
  const extLocs = [
    {
      id: "el1", name: "BMW Test Center", contactPerson: "Klaus Weber",
      address: "Petuelring 130", city: "Munich", country: "Germany",
      phone: "+49 89 382 0", email: "k.weber@bmw.de",
      notes: "Main BMW automotive testing facility",
    },
    {
      id: "el2", name: "IDIADA Testing Lab", contactPerson: "Maria Sanchez",
      address: "L'Albornar s/n", city: "Santa Oliva", country: "Spain",
      phone: "+34 977 168 030", email: "m.sanchez@idiada.com",
    },
    {
      id: "el3", name: "TÜV Rheinland", contactPerson: "Hans Müller",
      address: "Am Grauen Stein", city: "Cologne", country: "Germany",
      phone: "+49 221 806 0", email: "h.muller@tuv.com",
      notes: "Certification testing partner",
    },
  ];
  for (const ext of extLocs) {
    await prisma.externalLocation.upsert({
      where: { id: ext.id },
      update: {},
      create: ext,
    });
  }
  console.log(`    ✓ ${extLocs.length} external locations`);

  // ─── Containers ─────────────────────────────────────────────────────────────
  console.log("  → Containers...");
  const containers = [
    { id: "c1", barcode: "BOX-0001", label: "BOX-0001", locationId: "l1", notes: "Electronics samples Q1 2026" },
    { id: "c2", barcode: "BOX-0002", label: "BOX-0002", locationId: "l2" },
    { id: "c3", barcode: "BOX-0003", label: "BOX-0003", locationId: "l6", notes: "Spare parts mixed" },
    { id: "c4", barcode: "BOX-0004", label: "BOX-0004", locationId: "l9" },
    { id: "c5", barcode: "BOX-0005", label: "BOX-0005", externalLocationId: "el1", notes: "At BMW for testing" },
    { id: "c6", barcode: "BOX-0006", label: "BOX-0006", locationId: "l11" },
  ];
  for (const c of containers) {
    await prisma.container.upsert({
      where: { id: c.id },
      update: {},
      create: c,
    });
  }
  console.log(`    ✓ ${containers.length} containers`);

  // ─── Items ──────────────────────────────────────────────────────────────────
  console.log("  → Items...");

  // Electronics Samples
  await prisma.item.upsert({
    where: { id: "item1" },
    update: {},
    create: {
      id: "item1", barcode: "TR.EL26.012345.1.1", itemType: "ELECTRONICS_SAMPLE",
      status: "IN_STORAGE", labIdNumber: "TR.EL26.012345.1.1",
      oem: "BMW", productName: "BR206 CID", productType: "CID",
      oemPartNumber: "A 01 01 205", serialNumber: "SN-2026-001",
      testRequestNumber: "TR.EL26.012345", developmentPhase: "DV",
      plantLocation: "Regensburg", requester: "Klaus Weber",
      containerId: "c1", locationId: "l1", createdById: "u2",
      createdAt: new Date("2026-01-15T09:00:00Z"), updatedAt: new Date("2026-02-20T14:30:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item2" },
    update: {},
    create: {
      id: "item2", barcode: "TR.EL26.012345.1.2", itemType: "ELECTRONICS_SAMPLE",
      status: "IN_STORAGE", labIdNumber: "TR.EL26.012345.1.2",
      oem: "BMW", productName: "BR206 CID", productType: "CID",
      oemPartNumber: "A 01 01 205", serialNumber: "SN-2026-002",
      testRequestNumber: "TR.EL26.012345", developmentPhase: "DV",
      containerId: "c1", locationId: "l1", createdById: "u2",
      createdAt: new Date("2026-01-15T09:00:00Z"), updatedAt: new Date("2026-01-15T09:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item3" },
    update: {},
    create: {
      id: "item3", barcode: "TR.EL26.009871.2.1", itemType: "ELECTRONICS_SAMPLE",
      status: "TEMP_EXIT", labIdNumber: "TR.EL26.009871.2.1",
      oem: "STLA", productName: "DS7 HUD", productType: "HUD",
      oemPartNumber: "STL-HUD-2025-44",
      testRequestNumber: "TR.EL26.009871", developmentPhase: "PV",
      plantLocation: "Palmela", requester: "Ana Perez",
      externalLocationId: "el1", createdById: "u1",
      createdAt: new Date("2025-11-01T10:00:00Z"), updatedAt: new Date("2026-02-28T08:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item4" },
    update: {},
    create: {
      id: "item4", barcode: "TR.EL25.007500.1.1", itemType: "ELECTRONICS_SAMPLE",
      status: "SCRAPPED", labIdNumber: "TR.EL25.007500.1.1",
      oem: "MB", productName: "W206 Cluster", productType: "Cluster",
      oemPartNumber: "A2229006515", testRequestNumber: "TR.EL25.007500",
      developmentPhase: "DV",
      containerId: "c4", locationId: "l9",
      comment: "Failed drop test — ESD damage confirmed",
      createdById: "u2",
      createdAt: new Date("2025-05-20T08:00:00Z"), updatedAt: new Date("2025-12-15T11:00:00Z"),
    },
  });

  // Fixtures
  await prisma.item.upsert({
    where: { id: "item5" },
    update: {},
    create: {
      id: "item5", barcode: "FIX-1236", itemType: "FIXTURE",
      status: "IN_STORAGE", labIdNumber: "1236",
      productName: "BR206 CID Vib Fixture",
      fixtureCategories: ["VIBRATION", "MECHANICAL_SHOCK"],
      locationId: "l3", createdById: "u2",
      createdAt: new Date("2025-06-10T08:00:00Z"), updatedAt: new Date("2026-01-05T09:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item6" },
    update: {},
    create: {
      id: "item6", barcode: "FIX-3256", itemType: "FIXTURE",
      status: "TEMP_EXIT", labIdNumber: "3256",
      productName: "Generic Climatic Holder",
      fixtureCategories: ["CLIMATIC", "DUST", "WATER"],
      externalLocationId: "el2",
      comment: "On loan for IP67 water ingress tests",
      createdById: "u1",
      createdAt: new Date("2025-09-01T08:00:00Z"), updatedAt: new Date("2026-03-01T08:00:00Z"),
    },
  });

  // Spare Parts
  await prisma.item.upsert({
    where: { id: "item7" },
    update: {},
    create: {
      id: "item7", barcode: "SP-2025-0011", itemType: "SPARE_PART",
      status: "IN_STORAGE", labIdNumber: "SP-2025-0011",
      manufacturer: "ETS Solutions", model: "OP-31", partType: "Compressor",
      variant: "3-phase, 7 bar", forMachines: ["TH710-W5", "TS130"],
      containerId: "c3", locationId: "l6", createdById: "u1",
      createdAt: new Date("2025-08-15T10:00:00Z"), updatedAt: new Date("2025-08-15T10:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item8" },
    update: {},
    create: {
      id: "item8", barcode: "SP-2025-0012", itemType: "SPARE_PART",
      status: "IN_STORAGE", labIdNumber: "SP-2025-0012",
      manufacturer: "Danfoss", model: "MBD-22", partType: "Valve",
      forMachines: ["TS130"],
      containerId: "c3", locationId: "l6", createdById: "u1",
      createdAt: new Date("2025-08-20T10:00:00Z"), updatedAt: new Date("2025-08-20T10:00:00Z"),
    },
  });

  // Consumables
  await prisma.item.upsert({
    where: { id: "item9" },
    update: {},
    create: {
      id: "item9", barcode: "CON-2025-001", itemType: "CONSUMABLE",
      status: "IN_STORAGE", labIdNumber: "CON-2025-001",
      manufacturer: "Powder Technology", model: "A2 Fine",
      consumableType: "Arizona A2 Dust", quantity: 2.5, unit: "kg",
      lotNumber: "LOT-2025-0441",
      expiryDate: new Date("2026-04-01"), shelfLifeMonths: 12,
      locationId: "l5", createdById: "u2",
      createdAt: new Date("2025-04-01T08:00:00Z"), updatedAt: new Date("2026-01-10T15:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item10" },
    update: {},
    create: {
      id: "item10", barcode: "CON-2025-002", itemType: "CONSUMABLE",
      status: "IN_STORAGE", labIdNumber: "CON-2025-002",
      manufacturer: "Valerus", model: "pH7-Solution",
      consumableType: "7 pH Buffer Solution", quantity: 5, unit: "L",
      lotNumber: "LOT-2025-0882",
      expiryDate: new Date("2026-03-15"), shelfLifeMonths: 12,
      locationId: "l5", createdById: "u2",
      createdAt: new Date("2025-03-15T08:00:00Z"), updatedAt: new Date("2025-10-20T11:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item11" },
    update: {},
    create: {
      id: "item11", barcode: "CON-2026-001", itemType: "CONSUMABLE",
      status: "IN_STORAGE", labIdNumber: "CON-2026-001",
      manufacturer: "Hydratek", model: "MBR-200",
      consumableType: "Mixed-bed Resin", quantity: 10, unit: "L",
      lotNumber: "LOT-2026-0120",
      expiryDate: new Date("2028-01-01"), shelfLifeMonths: 24,
      locationId: "l5", createdById: "u1",
      createdAt: new Date("2026-01-01T08:00:00Z"), updatedAt: new Date("2026-01-01T08:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item12" },
    update: {},
    create: {
      id: "item12", barcode: "CON-2024-003", itemType: "CONSUMABLE",
      status: "DEPLETED", labIdNumber: "CON-2024-003",
      manufacturer: "Sigma-Aldrich", model: "NaCl-Fine",
      consumableType: "NaCl Salt", quantity: 0, unit: "kg",
      lotNumber: "LOT-2024-0201",
      expiryDate: new Date("2025-12-01"),
      locationId: "l5",
      comment: "Depleted — reorder needed",
      createdById: "u2",
      createdAt: new Date("2024-12-01T08:00:00Z"), updatedAt: new Date("2026-02-15T10:00:00Z"),
    },
  });

  // Misc
  await prisma.item.upsert({
    where: { id: "item13" },
    update: {},
    create: {
      id: "item13", barcode: "MISC-001", itemType: "MISC",
      status: "IN_STORAGE", labIdNumber: "MISC-001",
      miscName: "M5 Hex Bolt Set",
      miscDescription: "Pack of 100 M5 hex bolts, stainless steel",
      containerId: "c3", locationId: "l6", createdById: "u2",
      createdAt: new Date("2025-07-01T08:00:00Z"), updatedAt: new Date("2025-07-01T08:00:00Z"),
    },
  });

  console.log("    ✓ 13 items (4 electronics, 2 fixtures, 2 spare parts, 4 consumables, 1 misc)");

  // ─── Operations (audit log) ─────────────────────────────────────────────────
  console.log("  → Operations...");
  const operations = [
    {
      id: "op1", operationType: "RECEIPT" as const,
      itemId: "item1", performedById: "u2",
      performedAt: new Date("2026-01-15T09:00:00Z"),
      toLocationId: "l1", toContainerId: "c1",
      notes: "Received from BMW supplier via DHL",
    },
    {
      id: "op2", operationType: "RECEIPT" as const,
      itemId: "item2", performedById: "u2",
      performedAt: new Date("2026-01-15T09:05:00Z"),
      toLocationId: "l1", toContainerId: "c1",
    },
    {
      id: "op3", operationType: "MOVE" as const,
      itemId: "item2", performedById: "u1",
      performedAt: new Date("2026-02-20T14:30:00Z"),
      fromLocationId: "l2", fromContainerId: "c2",
      toLocationId: "l1", toContainerId: "c1",
    },
    {
      id: "op4", operationType: "TEMP_EXIT" as const,
      itemId: "item3", performedById: "u1",
      performedAt: new Date("2026-02-28T08:00:00Z"),
      fromLocationId: "l1",
      toExternalLocationId: "el1",
      expectedReturnDate: new Date("2026-03-28"),
      notes: "Sent for environmental testing",
    },
    {
      id: "op5", operationType: "SCRAP" as const,
      itemId: "item4", performedById: "u2",
      performedAt: new Date("2025-12-15T11:00:00Z"),
      notes: "Failed drop test — ESD damage confirmed",
    },
    {
      id: "op6", operationType: "CONSUME" as const,
      itemId: "item9", performedById: "u2",
      performedAt: new Date("2026-01-10T15:00:00Z"),
      quantityConsumed: 0.5,
      notes: "Used for IP5x dust ingress test batch #12",
    },
    {
      id: "op7", operationType: "CONSUME" as const,
      itemId: "item12", performedById: "u2",
      performedAt: new Date("2026-02-15T10:00:00Z"),
      quantityConsumed: 2.0,
      notes: "Last batch consumed — stock depleted",
    },
    {
      id: "op8", operationType: "RECEIPT" as const,
      itemId: "item9", performedById: "u2",
      performedAt: new Date("2025-04-01T08:00:00Z"),
      toLocationId: "l5",
    },
    {
      id: "op9", operationType: "RECEIPT" as const,
      itemId: "item5", performedById: "u2",
      performedAt: new Date("2025-06-10T08:00:00Z"),
      toLocationId: "l3",
    },
    {
      id: "op10", operationType: "TEMP_EXIT" as const,
      itemId: "item6", performedById: "u1",
      performedAt: new Date("2026-03-01T08:00:00Z"),
      fromLocationId: "l4",
      toExternalLocationId: "el2",
      expectedReturnDate: new Date("2026-03-22"),
      notes: "IP67 water ingress test campaign",
    },
  ];

  for (const op of operations) {
    await prisma.operationRecord.upsert({
      where: { id: op.id },
      update: {},
      create: op,
    });
  }
  console.log(`    ✓ ${operations.length} operations`);

  console.log("\n✅ Seed complete!\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
