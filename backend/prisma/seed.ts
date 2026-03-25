/**
 * Database seed script for Lab Storage Manager.
 *
 * Populates the database with realistic sample data reflecting a Visteon
 * automotive electronics lab — real OEM names, part numbers, test request
 * formats, and machine references.
 *
 * Run:  npm run db:seed
 * Requires:  DATABASE_URL to be set (postgres running)
 */

import { OperationType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // ─── Sites (created first — users reference them) ───────────────────────────
  await prisma.site.upsert({ where: { id: "s1" }, update: {}, create: { id: "s1", name: "Sofia" } });
  await prisma.site.upsert({ where: { id: "s2" }, update: {}, create: { id: "s2", name: "Munich" } });
  await prisma.site.upsert({ where: { id: "s3" }, update: {}, create: { id: "s3", name: "Paris" } });

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
    prisma.user.upsert({
      where: { ldapUsername: "tnedyalkov" },
      update: {},
      create: {
        id: "u6",
        ldapUsername: "tnedyalkov",
        displayName: "Todor Nedyalkov",
        email: "t.nedyalkov@visteon.com",
        role: "USER",
        siteId: "s1",
      },
    }),
    prisma.user.upsert({
      where: { ldapUsername: "pkostadinov" },
      update: {},
      create: {
        id: "u7",
        ldapUsername: "pkostadinov",
        displayName: "Pavel Kostadinov",
        email: "p.kostadinov@visteon.com",
        role: "USER",
        siteId: "s1",
      },
    }),
    prisma.user.upsert({
      where: { ldapUsername: "mkrause" },
      update: {},
      create: {
        id: "u8",
        ldapUsername: "mkrause",
        displayName: "Markus Krause",
        email: "m.krause@visteon.com",
        role: "VIEWER",
        siteId: "s2",
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

  // Area A — Main Building (electronics samples, fixtures)
  const areaA = await prisma.storageArea.upsert({
    where: { id: "sa1" },
    update: {},
    create: { id: "sa1", code: "A", buildingId: mainBldg.id },
  });
  for (const loc of [
    { id: "l1", row: "01", shelf: "01", level: "1", label: "A-01-01-1" },
    { id: "l2", row: "01", shelf: "01", level: "2", label: "A-01-01-2" },
    { id: "l3", row: "01", shelf: "02", level: "1", label: "A-01-02-1" },
    { id: "l4", row: "01", shelf: "02", level: "2", label: "A-01-02-2" },
    { id: "l5", row: "02", shelf: "01", level: "1", label: "A-02-01-1" },
  ]) {
    await prisma.storageLocation.upsert({
      where: { id: loc.id },
      update: {},
      create: { ...loc, storageAreaId: areaA.id },
    });
  }

  // Area B — Main Building (spare parts, misc)
  const areaB = await prisma.storageArea.upsert({
    where: { id: "sa2" },
    update: {},
    create: { id: "sa2", code: "B", buildingId: mainBldg.id },
  });
  for (const loc of [
    { id: "l6", row: "01", shelf: "01", level: "1", label: "B-01-01-1" },
    { id: "l7", row: "01", shelf: "01", level: "2", label: "B-01-01-2" },
    { id: "l8", row: "01", shelf: "02", level: "1", label: "B-01-02-1" },
  ]) {
    await prisma.storageLocation.upsert({
      where: { id: loc.id },
      update: {},
      create: { ...loc, storageAreaId: areaB.id },
    });
  }

  // Area C — Lab Building (scrapped / quarantine)
  const areaC = await prisma.storageArea.upsert({
    where: { id: "sa3" },
    update: {},
    create: { id: "sa3", code: "C", buildingId: labBldg.id },
  });
  for (const loc of [
    { id: "l9",  row: "01", shelf: "01", level: "1", label: "C-01-01-1" },
    { id: "l10", row: "01", shelf: "01", level: "2", label: "C-01-01-2" },
  ]) {
    await prisma.storageLocation.upsert({
      where: { id: loc.id },
      update: {},
      create: { ...loc, storageAreaId: areaC.id },
    });
  }

  // Munich — Tech Center
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

  // Paris — R&D Center
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
    create: {
      id: "l13", row: "01", shelf: "01", level: "1",
      label: "A-01-01-1", storageAreaId: areaAParis.id,
    },
  });

  // Additional locations — Area A Sofia (rows 02+)
  for (const loc of [
    { id: "l14", row: "02", shelf: "01", level: "2", label: "A-02-01-2" },
    { id: "l15", row: "02", shelf: "02", level: "1", label: "A-02-02-1" },
  ]) {
    await prisma.storageLocation.upsert({
      where: { id: loc.id },
      update: {},
      create: { ...loc, storageAreaId: areaA.id },
    });
  }

  // Additional locations — Area B Sofia (row 02)
  await prisma.storageLocation.upsert({
    where: { id: "l16" },
    update: {},
    create: { id: "l16", row: "02", shelf: "01", level: "1", label: "B-02-01-1", storageAreaId: areaB.id },
  });

  // Additional locations — Area C Sofia (row 01, shelf 02)
  await prisma.storageLocation.upsert({
    where: { id: "l17" },
    update: {},
    create: { id: "l17", row: "01", shelf: "02", level: "1", label: "C-01-02-1", storageAreaId: areaC.id },
  });

  // Additional location — Area A Munich (row 02)
  await prisma.storageLocation.upsert({
    where: { id: "l18" },
    update: {},
    create: { id: "l18", row: "02", shelf: "01", level: "1", label: "A-02-01-1", storageAreaId: areaAMunich.id },
  });

  console.log("    ✓ 3 sites, 4 buildings, 5 areas, 18 locations (+5 new)");

  // ─── External Locations ─────────────────────────────────────────────────────
  console.log("  → External locations...");
  for (const ext of [
    {
      id: "el1", name: "BMW Forschungs- und Innovationszentrum",
      contactPerson: "Klaus Weber",
      address: "Petuelring 130", city: "Munich", country: "Germany",
      phone: "+49 89 382 0", email: "k.weber@bmw.de",
      notes: "BMW FIZ — primary partner for CID and Cluster environmental testing",
    },
    {
      id: "el2", name: "IDIADA Automotive Technology",
      contactPerson: "Maria Sanchez",
      address: "L'Albornar s/n", city: "Santa Oliva", country: "Spain",
      phone: "+34 977 168 030", email: "m.sanchez@idiada.com",
      notes: "IDIADA proving ground — IP67 and water ingress campaigns",
    },
    {
      id: "el3", name: "TÜV Rheinland — EMC & Product Safety",
      contactPerson: "Hans Müller",
      address: "Am Grauen Stein", city: "Cologne", country: "Germany",
      phone: "+49 221 806 0", email: "h.mueller@tuv.com",
      notes: "E-mark / EMC / UN-ECE R10 certification testing",
    },
    {
      id: "el4", name: "Moog Industrial — Calibration Services",
      contactPerson: "James Thornton",
      address: "East Aurora", city: "New York", country: "USA",
      phone: "+1 716 652 2000", email: "j.thornton@moog.com",
      notes: "Servo-hydraulic actuator and valve calibration & repair",
    },
  ]) {
    await prisma.externalLocation.upsert({
      where: { id: ext.id },
      update: {},
      create: ext,
    });
  }
  console.log("    ✓ 4 external locations");

  // ─── Containers ─────────────────────────────────────────────────────────────
  console.log("  → Containers...");
  for (const c of [
    { id: "c1", barcode: "BOX-0001", label: "BOX-0001", locationId: "l1",  notes: "BMW electronics samples — Q1 2026" },
    { id: "c2", barcode: "BOX-0002", label: "BOX-0002", locationId: "l2",  notes: "VW / Ford samples intake" },
    { id: "c3", barcode: "BOX-0003", label: "BOX-0003", locationId: "l6",  notes: "Spare parts — mixed" },
    { id: "c4", barcode: "BOX-0004", label: "BOX-0004", locationId: "l9",  notes: "Scrapped / quarantine items" },
    { id: "c5", barcode: "BOX-0005", label: "BOX-0005", externalLocationId: "el1", notes: "At BMW FIZ for env. testing" },
    { id: "c6", barcode: "BOX-0006", label: "BOX-0006", locationId: "l11", notes: "MB / BMW samples — Munich" },
    { id: "c7", barcode: "BOX-0007", label: "BOX-0007", locationId: "l10", notes: "Lab building overflow" },
    { id: "c8", barcode: "BOX-0008", label: "BOX-0008", locationId: "l13", notes: "Paris R&D intake" },
  ]) {
    await prisma.container.upsert({
      where: { id: c.id },
      update: {},
      create: c,
    });
  }
  console.log("    ✓ 8 containers");

  // ─── Items ──────────────────────────────────────────────────────────────────
  console.log("  → Items...");

  // ── Electronics Samples ────────────────────────────────────────────────────

  // BMW BR206 CID — two samples received on the same TR
  await prisma.item.upsert({
    where: { id: "item1" },
    update: {},
    create: {
      id: "item1", barcode: "TR.EL26.012345.1.1", itemType: "ELECTRONICS_SAMPLE",
      status: "IN_STORAGE", labIdNumber: "TR.EL26.012345.1.1",
      oem: "BMW", productName: "BR206 CID", productType: "CID",
      oemPartNumber: "61316830594", serialNumber: "SN-2026-001",
      testRequestNumber: "TR.EL26.012345", developmentPhase: "DV",
      plantLocation: "Regensburg", requester: "Klaus Weber",
      containerId: "c1", locationId: "l1", createdById: "u2",
      createdAt: new Date("2026-01-15T09:00:00Z"),
      updatedAt: new Date("2026-02-20T14:30:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item2" },
    update: {},
    create: {
      id: "item2", barcode: "TR.EL26.012345.1.2", itemType: "ELECTRONICS_SAMPLE",
      status: "IN_STORAGE", labIdNumber: "TR.EL26.012345.1.2",
      oem: "BMW", productName: "BR206 CID", productType: "CID",
      oemPartNumber: "61316830594", serialNumber: "SN-2026-002",
      testRequestNumber: "TR.EL26.012345", developmentPhase: "DV",
      plantLocation: "Regensburg", requester: "Klaus Weber",
      containerId: "c1", locationId: "l1", createdById: "u2",
      createdAt: new Date("2026-01-15T09:00:00Z"),
      updatedAt: new Date("2026-02-20T14:30:00Z"),
    },
  });

  // STLA DS7 HUD — currently at BMW FIZ for environmental testing
  await prisma.item.upsert({
    where: { id: "item3" },
    update: {},
    create: {
      id: "item3", barcode: "TR.EL26.009871.2.1", itemType: "ELECTRONICS_SAMPLE",
      status: "TEMP_EXIT", labIdNumber: "TR.EL26.009871.2.1",
      oem: "STLA", productName: "DS7 Crossback E-Tense HUD", productType: "HUD",
      oemPartNumber: "9832 44 80", serialNumber: "SN-2025-003",
      testRequestNumber: "TR.EL26.009871", developmentPhase: "PV",
      plantLocation: "Mulhouse", requester: "Jean-Pierre Moreau",
      externalLocationId: "el1", createdById: "u1",
      createdAt: new Date("2025-11-01T10:00:00Z"),
      updatedAt: new Date("2026-02-28T08:00:00Z"),
    },
  });

  // MB W206 Cluster — scrapped after ESD damage
  await prisma.item.upsert({
    where: { id: "item4" },
    update: {},
    create: {
      id: "item4", barcode: "TR.EL25.007500.1.1", itemType: "ELECTRONICS_SAMPLE",
      status: "SCRAPPED", labIdNumber: "TR.EL25.007500.1.1",
      oem: "MB", productName: "W206 C-Class Cluster", productType: "Cluster",
      oemPartNumber: "A2229006515", serialNumber: "SN-2025-004",
      testRequestNumber: "TR.EL25.007500", developmentPhase: "DV",
      plantLocation: "Sindelfingen",
      containerId: "c4", locationId: "l9",
      comment: "Failed 1.5 m drop test — ESD damage confirmed, PCB cracked at BGA solder joints",
      createdById: "u2",
      createdAt: new Date("2025-05-20T08:00:00Z"),
      updatedAt: new Date("2025-12-15T11:00:00Z"),
    },
  });

  // VW Polo AW Cluster — new PRE_DV intake
  await prisma.item.upsert({
    where: { id: "item14" },
    update: {},
    create: {
      id: "item14", barcode: "TR.EL26.011200.3.1", itemType: "ELECTRONICS_SAMPLE",
      status: "IN_STORAGE", labIdNumber: "TR.EL26.011200.3.1",
      oem: "VW", productName: "Polo AW Instrument Cluster", productType: "Cluster",
      oemPartNumber: "3G0 920 740", serialNumber: "SN-2026-014",
      testRequestNumber: "TR.EL26.011200", developmentPhase: "PRE_DV",
      plantLocation: "Wolfsburg", requester: "Tobias Langer",
      containerId: "c2", locationId: "l2", createdById: "u6",
      createdAt: new Date("2026-02-01T10:00:00Z"),
      updatedAt: new Date("2026-02-01T10:00:00Z"),
    },
  });

  // Ford Mustang Mach-E CID — DV testing in progress
  await prisma.item.upsert({
    where: { id: "item15" },
    update: {},
    create: {
      id: "item15", barcode: "TR.EL26.009400.1.1", itemType: "ELECTRONICS_SAMPLE",
      status: "IN_STORAGE", labIdNumber: "TR.EL26.009400.1.1",
      oem: "Ford", productName: "Mustang Mach-E CID", productType: "CID",
      oemPartNumber: "LJ9T-18E245-AC", serialNumber: "SN-2025-015",
      testRequestNumber: "TR.EL26.009400", developmentPhase: "DV",
      plantLocation: "Cuautitlán Izcalli", requester: "Emily Carter",
      locationId: "l7", createdById: "u2",
      createdAt: new Date("2025-10-15T11:00:00Z"),
      updatedAt: new Date("2025-10-15T11:00:00Z"),
    },
  });

  // JLR L663 Defender HUD — at TÜV Rheinland for E-mark certification
  await prisma.item.upsert({
    where: { id: "item16" },
    update: {},
    create: {
      id: "item16", barcode: "TR.EL26.013100.1.1", itemType: "ELECTRONICS_SAMPLE",
      status: "TEMP_EXIT", labIdNumber: "TR.EL26.013100.1.1",
      oem: "JLR", productName: "L663 Defender HUD", productType: "HUD",
      oemPartNumber: "J9A3-17K810-AA", serialNumber: "SN-2026-016",
      testRequestNumber: "TR.EL26.013100", developmentPhase: "PV",
      plantLocation: "Halewood", requester: "David Pearson",
      externalLocationId: "el3", createdById: "u2",
      createdAt: new Date("2025-12-01T09:00:00Z"),
      updatedAt: new Date("2026-02-10T08:30:00Z"),
    },
  });

  // Volvo EX90 BCM — early DV samples
  await prisma.item.upsert({
    where: { id: "item17" },
    update: {},
    create: {
      id: "item17", barcode: "TR.EL26.010450.1.1", itemType: "ELECTRONICS_SAMPLE",
      status: "IN_STORAGE", labIdNumber: "TR.EL26.010450.1.1",
      oem: "Volvo", productName: "EX90 Body Control Module", productType: "BCM",
      oemPartNumber: "32494810", serialNumber: "SN-2026-017",
      testRequestNumber: "TR.EL26.010450", developmentPhase: "DV",
      plantLocation: "Gothenburg", requester: "Erik Lindqvist",
      locationId: "l8", createdById: "u7",
      createdAt: new Date("2026-02-01T13:00:00Z"),
      updatedAt: new Date("2026-02-01T13:00:00Z"),
    },
  });

  // Renault Megane E-Tech HMI — destroyed during PV soak test
  await prisma.item.upsert({
    where: { id: "item18" },
    update: {},
    create: {
      id: "item18", barcode: "TR.EL25.006700.2.1", itemType: "ELECTRONICS_SAMPLE",
      status: "SCRAPPED", labIdNumber: "TR.EL25.006700.2.1",
      oem: "Renault", productName: "Megane E-Tech HMI Panel", productType: "HMI",
      oemPartNumber: "284B21874R", serialNumber: "SN-2025-018",
      testRequestNumber: "TR.EL25.006700", developmentPhase: "DV",
      plantLocation: "Douai", requester: "Sophie Renard",
      locationId: "l3",
      comment: "Thermal runaway during +85 °C soak — electrolytic capacitor burst, unit destroyed",
      createdById: "u2",
      createdAt: new Date("2025-07-15T09:00:00Z"),
      updatedAt: new Date("2025-09-30T16:00:00Z"),
    },
  });

  // MB W223 S-Class Digital Cluster — Munich, PV stage
  await prisma.item.upsert({
    where: { id: "item19" },
    update: {},
    create: {
      id: "item19", barcode: "TR.EL26.012800.1.1", itemType: "ELECTRONICS_SAMPLE",
      status: "IN_STORAGE", labIdNumber: "TR.EL26.012800.1.1",
      oem: "MB", productName: "W223 S-Class Digital Cluster", productType: "Cluster",
      oemPartNumber: "A2239006100", serialNumber: "SN-2026-019",
      testRequestNumber: "TR.EL26.012800", developmentPhase: "PV",
      plantLocation: "Sindelfingen", requester: "Stefan Bauer",
      containerId: "c6", locationId: "l11", createdById: "u3",
      createdAt: new Date("2025-11-20T10:00:00Z"),
      updatedAt: new Date("2025-11-20T10:00:00Z"),
    },
  });

  // BMW G70 7-Series Cluster — Munich, returned from BMW after short loan
  await prisma.item.upsert({
    where: { id: "item20" },
    update: {},
    create: {
      id: "item20", barcode: "TR.EL26.011750.1.1", itemType: "ELECTRONICS_SAMPLE",
      status: "IN_STORAGE", labIdNumber: "TR.EL26.011750.1.1",
      oem: "BMW", productName: "G70 7-Series Cluster", productType: "Cluster",
      oemPartNumber: "62109850614", serialNumber: "SN-2026-020",
      testRequestNumber: "TR.EL26.011750", developmentPhase: "DV",
      plantLocation: "Dingolfing", requester: "Klaus Huber",
      locationId: "l12", createdById: "u3",
      createdAt: new Date("2025-08-10T09:00:00Z"),
      updatedAt: new Date("2025-11-01T11:00:00Z"),
    },
  });

  // ── Fixtures ───────────────────────────────────────────────────────────────

  // Vibration/shock fixture for CID testing
  await prisma.item.upsert({
    where: { id: "item5" },
    update: {},
    create: {
      id: "item5", barcode: "FIX-1236", itemType: "FIXTURE",
      status: "IN_STORAGE", labIdNumber: "1236",
      productName: "BR206 CID Vibration & Shock Fixture",
      fixtureCategories: ["VIBRATION", "MECHANICAL_SHOCK"],
      locationId: "l3", createdById: "u2",
      createdAt: new Date("2025-06-10T08:00:00Z"),
      updatedAt: new Date("2026-01-05T09:00:00Z"),
    },
  });

  // Climatic / IP67 fixture — currently at IDIADA
  await prisma.item.upsert({
    where: { id: "item6" },
    update: {},
    create: {
      id: "item6", barcode: "FIX-3256", itemType: "FIXTURE",
      status: "TEMP_EXIT", labIdNumber: "3256",
      productName: "Universal IP67 Water Ingress Test Fixture",
      fixtureCategories: ["CLIMATIC", "DUST", "WATER"],
      externalLocationId: "el2",
      comment: "On loan to IDIADA for ISO 20653 water ingress campaign",
      createdById: "u1",
      createdAt: new Date("2025-09-01T08:00:00Z"),
      updatedAt: new Date("2026-03-01T08:00:00Z"),
    },
  });

  // Salt-spray fixture
  await prisma.item.upsert({
    where: { id: "item21" },
    update: {},
    create: {
      id: "item21", barcode: "FIX-0820", itemType: "FIXTURE",
      status: "IN_STORAGE", labIdNumber: "0820",
      productName: "Multi-OEM Salt-Spray & Humidity Adapter Kit",
      fixtureCategories: ["SALT", "CLIMATIC"],
      locationId: "l4", createdById: "u1",
      createdAt: new Date("2024-03-15T08:00:00Z"),
      updatedAt: new Date("2024-03-15T08:00:00Z"),
    },
  });

  // ── Spare Parts ────────────────────────────────────────────────────────────

  // ETS Solutions compressor — climate chamber spare
  await prisma.item.upsert({
    where: { id: "item7" },
    update: {},
    create: {
      id: "item7", barcode: "SP-2025-0011", itemType: "SPARE_PART",
      status: "IN_STORAGE", labIdNumber: "SP-2025-0011",
      manufacturer: "ETS Solutions", model: "OP-31",
      partType: "Compressor", variant: "3-phase, 7 bar, 2.2 kW",
      forMachines: ["TH710-W5", "TS-130", "TS-070"],
      containerId: "c3", locationId: "l6", createdById: "u1",
      createdAt: new Date("2025-08-15T10:00:00Z"),
      updatedAt: new Date("2025-08-15T10:00:00Z"),
    },
  });

  // Danfoss solenoid valve — climate chamber spare
  await prisma.item.upsert({
    where: { id: "item8" },
    update: {},
    create: {
      id: "item8", barcode: "SP-2025-0012", itemType: "SPARE_PART",
      status: "IN_STORAGE", labIdNumber: "SP-2025-0012",
      manufacturer: "Danfoss", model: "EVRAT 10",
      partType: "Solenoid Valve", variant: "10 mm, 230 V AC, flare",
      forMachines: ["TS-130"],
      containerId: "c3", locationId: "l6", createdById: "u1",
      createdAt: new Date("2025-08-20T10:00:00Z"),
      updatedAt: new Date("2025-08-20T10:00:00Z"),
    },
  });

  // Moog D633 servo valve — shaker spare (sent for calibration)
  await prisma.item.upsert({
    where: { id: "item22" },
    update: {},
    create: {
      id: "item22", barcode: "SP-2024-0031", itemType: "SPARE_PART",
      status: "TEMP_EXIT", labIdNumber: "SP-2024-0031",
      manufacturer: "Moog", model: "D633-R02K01M0NGK2",
      partType: "Servo Valve", variant: "2-stage, ±10 V, 11 L/min @ 210 bar",
      forMachines: ["MTS 322.31", "MTS 248.10"],
      externalLocationId: "el4",
      comment: "Sent to Moog for annual calibration and seal replacement",
      createdById: "u1",
      createdAt: new Date("2024-10-20T08:00:00Z"),
      updatedAt: new Date("2026-01-15T09:00:00Z"),
    },
  });

  // Weiss Technik heating cartridge — climate chamber spare
  await prisma.item.upsert({
    where: { id: "item23" },
    update: {},
    create: {
      id: "item23", barcode: "SP-2025-0022", itemType: "SPARE_PART",
      status: "IN_STORAGE", labIdNumber: "SP-2025-0022",
      manufacturer: "Weiss Technik", model: "WK11-600",
      partType: "Heating Cartridge", variant: "600 W, 230 V, M8 thread",
      forMachines: ["WK-11 -40/+170", "WK-34 -40/+170"],
      locationId: "l8", createdById: "u1",
      createdAt: new Date("2025-02-10T10:00:00Z"),
      updatedAt: new Date("2025-02-10T10:00:00Z"),
    },
  });

  // Vötsch humidity/temperature sensor — climate chamber spare
  await prisma.item.upsert({
    where: { id: "item24" },
    update: {},
    create: {
      id: "item24", barcode: "SP-2026-0035", itemType: "SPARE_PART",
      status: "IN_STORAGE", labIdNumber: "SP-2026-0035",
      manufacturer: "Vötsch Industrietechnik", model: "VC-7018-HSA",
      partType: "Humidity / Temperature Sensor", variant: "0–100 % RH, -20 to +70 °C",
      forMachines: ["VCS 7018-5", "VCS 7034-5"],
      containerId: "c4", locationId: "l9", createdById: "u7",
      createdAt: new Date("2026-01-25T09:00:00Z"),
      updatedAt: new Date("2026-01-25T09:00:00Z"),
    },
  });

  // ── Consumables ────────────────────────────────────────────────────────────

  // Arizona A2 Fine dust — partially consumed
  await prisma.item.upsert({
    where: { id: "item9" },
    update: {},
    create: {
      id: "item9", barcode: "CON-2025-001", itemType: "CONSUMABLE",
      status: "IN_STORAGE", labIdNumber: "CON-2025-001",
      manufacturer: "Powder Technology Inc.", model: "A2 Fine",
      consumableType: "Arizona Road Dust A2 Fine", quantity: 2.5, unit: "kg",
      lotNumber: "LOT-2025-0441",
      expiryDate: new Date("2026-10-01"), shelfLifeMonths: 18,
      locationId: "l5", createdById: "u2",
      createdAt: new Date("2025-04-01T08:00:00Z"),
      updatedAt: new Date("2026-01-10T15:00:00Z"),
    },
  });

  // pH 7.0 Buffer Solution — expired (useful for expiry report demo)
  await prisma.item.upsert({
    where: { id: "item10" },
    update: {},
    create: {
      id: "item10", barcode: "CON-2025-002", itemType: "CONSUMABLE",
      status: "IN_STORAGE", labIdNumber: "CON-2025-002",
      manufacturer: "Valerus Chemicals", model: "pH7.00-1L",
      consumableType: "pH 7.00 Buffer Solution", quantity: 5, unit: "L",
      lotNumber: "LOT-2025-0882",
      expiryDate: new Date("2026-03-15"), shelfLifeMonths: 12,
      locationId: "l5", createdById: "u2",
      createdAt: new Date("2025-03-15T08:00:00Z"),
      updatedAt: new Date("2025-10-20T11:00:00Z"),
    },
  });

  // Mixed-bed deionisation resin — fresh stock
  await prisma.item.upsert({
    where: { id: "item11" },
    update: {},
    create: {
      id: "item11", barcode: "CON-2026-001", itemType: "CONSUMABLE",
      status: "IN_STORAGE", labIdNumber: "CON-2026-001",
      manufacturer: "Hydratek", model: "MBR-200",
      consumableType: "Mixed-Bed Deionisation Resin", quantity: 10, unit: "L",
      lotNumber: "LOT-2026-0120",
      expiryDate: new Date("2028-01-01"), shelfLifeMonths: 24,
      locationId: "l5", createdById: "u1",
      createdAt: new Date("2026-01-01T08:00:00Z"),
      updatedAt: new Date("2026-01-01T08:00:00Z"),
    },
  });

  // NaCl — fully depleted
  await prisma.item.upsert({
    where: { id: "item12" },
    update: {},
    create: {
      id: "item12", barcode: "CON-2024-003", itemType: "CONSUMABLE",
      status: "DEPLETED", labIdNumber: "CON-2024-003",
      manufacturer: "Sigma-Aldrich", model: "NaCl ≥99.5 %",
      consumableType: "Sodium Chloride (NaCl) — salt spray grade", quantity: 0, unit: "kg",
      lotNumber: "LOT-2024-0201",
      expiryDate: new Date("2025-12-01"),
      locationId: "l5",
      comment: "Depleted after salt-spray campaign S-2026-03 — reorder P/N S7653-1KG",
      createdById: "u2",
      createdAt: new Date("2024-12-01T08:00:00Z"),
      updatedAt: new Date("2026-02-15T10:00:00Z"),
    },
  });

  // Isopropanol 99.9 % — cleaning solvent
  await prisma.item.upsert({
    where: { id: "item25" },
    update: {},
    create: {
      id: "item25", barcode: "CON-2026-002", itemType: "CONSUMABLE",
      status: "IN_STORAGE", labIdNumber: "CON-2026-002",
      manufacturer: "Sigma-Aldrich", model: "IPA ≥99.9 %",
      consumableType: "Isopropanol (IPA) 99.9 % — PCB grade", quantity: 10, unit: "L",
      lotNumber: "LOT-2025-2401",
      expiryDate: new Date("2027-01-01"), shelfLifeMonths: 24,
      locationId: "l5", createdById: "u2",
      createdAt: new Date("2026-01-08T08:00:00Z"),
      updatedAt: new Date("2026-03-05T10:00:00Z"),
    },
  });

  // Bergquist GP3000 thermal interface pads
  await prisma.item.upsert({
    where: { id: "item26" },
    update: {},
    create: {
      id: "item26", barcode: "CON-2025-003", itemType: "CONSUMABLE",
      status: "IN_STORAGE", labIdNumber: "CON-2025-003",
      manufacturer: "Henkel (Bergquist)", model: "GP3000",
      consumableType: "Thermal Interface Pad 3.0 W/m·K", quantity: 20, unit: "pcs",
      lotNumber: "LOT-2025-1140",
      expiryDate: new Date("2027-06-01"), shelfLifeMonths: 24,
      locationId: "l5", createdById: "u2",
      createdAt: new Date("2025-11-10T10:00:00Z"),
      updatedAt: new Date("2025-11-10T10:00:00Z"),
    },
  });

  // ── Misc ───────────────────────────────────────────────────────────────────

  // M5 hex bolt assortment
  await prisma.item.upsert({
    where: { id: "item13" },
    update: {},
    create: {
      id: "item13", barcode: "MISC-001", itemType: "MISC",
      status: "IN_STORAGE", labIdNumber: "MISC-001",
      miscName: "M5 × 16 Hex Cap Screw Set — DIN 912 A2",
      miscDescription: "Pack of 100 M5 × 16 mm hex cap screws, A2 stainless, used for fixture assembly",
      containerId: "c3", locationId: "l6", createdById: "u2",
      createdAt: new Date("2025-07-01T08:00:00Z"),
      updatedAt: new Date("2025-07-01T08:00:00Z"),
    },
  });

  // Cable tie assortment
  await prisma.item.upsert({
    where: { id: "item27" },
    update: {},
    create: {
      id: "item27", barcode: "MISC-002", itemType: "MISC",
      status: "IN_STORAGE", labIdNumber: "MISC-002",
      miscName: "Cable Tie Assortment — UV-resistant",
      miscDescription: "300-piece kit: 100 × 100 mm, 200 mm, 300 mm lengths. Used for harness routing during vibration tests.",
      containerId: "c3", locationId: "l6", createdById: "u7",
      createdAt: new Date("2025-10-05T09:00:00Z"),
      updatedAt: new Date("2025-10-05T09:00:00Z"),
    },
  });

  // ── Additional Electronics Samples (item28–item35) ────────────────────────

  await prisma.item.upsert({
    where: { id: "item28" },
    update: {},
    create: {
      id: "item28", barcode: "TR.EL26.014100.1.1", itemType: "ELECTRONICS_SAMPLE",
      status: "IN_STORAGE", labIdNumber: "TR.EL26.014100.1.1",
      oem: "Audi", productName: "Q8 e-tron Head-Up Display", productType: "HUD",
      oemPartNumber: "4M0919234A", serialNumber: "SN-2026-028",
      testRequestNumber: "TR.EL26.014100", developmentPhase: "DV",
      plantLocation: "Brussels", requester: "Andreas Hofmann",
      locationId: "l14", createdById: "u2",
      createdAt: new Date("2026-02-10T09:00:00Z"),
      updatedAt: new Date("2026-02-10T09:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item29" },
    update: {},
    create: {
      id: "item29", barcode: "TR.EL26.013400.1.1", itemType: "ELECTRONICS_SAMPLE",
      status: "IN_STORAGE", labIdNumber: "TR.EL26.013400.1.1",
      oem: "BMW", productName: "F40 1-Series Instrument Cluster", productType: "Cluster",
      oemPartNumber: "62109450321", serialNumber: "SN-2026-029",
      testRequestNumber: "TR.EL26.013400", developmentPhase: "PV",
      plantLocation: "Leipzig", requester: "Klaus Huber",
      containerId: "c1", locationId: "l1", createdById: "u2",
      createdAt: new Date("2026-01-20T10:00:00Z"),
      updatedAt: new Date("2026-01-20T10:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item30" },
    update: {},
    create: {
      id: "item30", barcode: "TR.EL26.014200.1.1", itemType: "ELECTRONICS_SAMPLE",
      status: "IN_STORAGE", labIdNumber: "TR.EL26.014200.1.1",
      oem: "Hyundai", productName: "IONIQ 6 Centre Information Display", productType: "CID",
      oemPartNumber: "96160-AA090", serialNumber: "SN-2026-030",
      testRequestNumber: "TR.EL26.014200", developmentPhase: "DV",
      plantLocation: "Ulsan", requester: "Ji-Won Park",
      locationId: "l15", createdById: "u6",
      createdAt: new Date("2026-02-18T11:00:00Z"),
      updatedAt: new Date("2026-02-18T11:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item31" },
    update: {},
    create: {
      id: "item31", barcode: "TR.EL26.014350.1.1", itemType: "ELECTRONICS_SAMPLE",
      status: "IN_STORAGE", labIdNumber: "TR.EL26.014350.1.1",
      oem: "Porsche", productName: "992 Carrera HUD Module", productType: "HUD",
      oemPartNumber: "9Y0919034C", serialNumber: "SN-2026-031",
      testRequestNumber: "TR.EL26.014350", developmentPhase: "PRE_DV",
      plantLocation: "Zuffenhausen", requester: "Tobias Ritter",
      containerId: "c8", locationId: "l13", createdById: "u4",
      createdAt: new Date("2026-03-01T09:00:00Z"),
      updatedAt: new Date("2026-03-01T09:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item32" },
    update: {},
    create: {
      id: "item32", barcode: "TR.EL26.013750.1.1", itemType: "ELECTRONICS_SAMPLE",
      status: "TEMP_EXIT", labIdNumber: "TR.EL26.013750.1.1",
      oem: "Nissan", productName: "Ariya Body Control Module", productType: "BCM",
      oemPartNumber: "284B1-5MT0A", serialNumber: "SN-2026-032",
      testRequestNumber: "TR.EL26.013750", developmentPhase: "DV",
      plantLocation: "Oppama", requester: "Kenji Watanabe",
      externalLocationId: "el2", createdById: "u2",
      createdAt: new Date("2026-01-05T09:00:00Z"),
      updatedAt: new Date("2026-02-25T08:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item33" },
    update: {},
    create: {
      id: "item33", barcode: "TR.EL25.008400.1.1", itemType: "ELECTRONICS_SAMPLE",
      status: "SCRAPPED", labIdNumber: "TR.EL25.008400.1.1",
      oem: "Toyota", productName: "RAV4 PHEV Instrument Cluster", productType: "Cluster",
      oemPartNumber: "83800-0R031", serialNumber: "SN-2025-033",
      testRequestNumber: "TR.EL25.008400", developmentPhase: "DV",
      plantLocation: "Tsutsumi",
      containerId: "c4", locationId: "l9",
      comment: "PCB delamination after 50-cycle thermal shock (-40/+85 °C) — failed IPC-6012 class 3",
      createdById: "u2",
      createdAt: new Date("2025-06-01T09:00:00Z"),
      updatedAt: new Date("2025-11-20T14:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item34" },
    update: {},
    create: {
      id: "item34", barcode: "TR.EL26.013900.1.1", itemType: "ELECTRONICS_SAMPLE",
      status: "IN_STORAGE", labIdNumber: "TR.EL26.013900.1.1",
      oem: "Skoda", productName: "Octavia IV Digital Cockpit", productType: "Cluster",
      oemPartNumber: "5E0 920 771 A", serialNumber: "SN-2026-034",
      testRequestNumber: "TR.EL26.013900", developmentPhase: "DV",
      plantLocation: "Mladá Boleslav", requester: "Pavel Novák",
      locationId: "l16", createdById: "u6",
      createdAt: new Date("2026-02-05T10:00:00Z"),
      updatedAt: new Date("2026-02-05T10:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item35" },
    update: {},
    create: {
      id: "item35", barcode: "TR.EL26.014050.1.1", itemType: "ELECTRONICS_SAMPLE",
      status: "IN_STORAGE", labIdNumber: "TR.EL26.014050.1.1",
      oem: "Kia", productName: "EV6 HMI Control Panel", productType: "HMI",
      oemPartNumber: "96560-CV011", serialNumber: "SN-2026-035",
      testRequestNumber: "TR.EL26.014050", developmentPhase: "PRE_DV",
      plantLocation: "Hwaseong", requester: "Min-jun Lee",
      containerId: "c6", locationId: "l11", createdById: "u3",
      createdAt: new Date("2026-03-05T10:00:00Z"),
      updatedAt: new Date("2026-03-05T10:00:00Z"),
    },
  });

  // ── Additional Fixtures (item36–item38) ────────────────────────────────────

  await prisma.item.upsert({
    where: { id: "item36" },
    update: {},
    create: {
      id: "item36", barcode: "FIX-0412", itemType: "FIXTURE",
      status: "IN_STORAGE", labIdNumber: "0412",
      productName: "Multi-OEM Cluster Vibration Fixture — 180 mm DIN rail",
      fixtureCategories: ["VIBRATION", "MECHANICAL_SHOCK"],
      locationId: "l14", createdById: "u1",
      createdAt: new Date("2025-04-01T08:00:00Z"),
      updatedAt: new Date("2025-04-01T08:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item37" },
    update: {},
    create: {
      id: "item37", barcode: "FIX-0915", itemType: "FIXTURE",
      status: "IN_STORAGE", labIdNumber: "0915",
      productName: "EMC Absorber Panel Fixture — 300×200 mm",
      fixtureCategories: ["OTHER"],
      locationId: "l17", createdById: "u1",
      createdAt: new Date("2025-09-15T08:00:00Z"),
      updatedAt: new Date("2025-09-15T08:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item38" },
    update: {},
    create: {
      id: "item38", barcode: "FIX-1102", itemType: "FIXTURE",
      status: "TEMP_EXIT", labIdNumber: "1102",
      productName: "HUD Optical Alignment Jig — AR Combiner",
      fixtureCategories: ["OTHER"],
      externalLocationId: "el1",
      comment: "Sent to BMW FIZ for HUD combiner angle verification campaign",
      createdById: "u1",
      createdAt: new Date("2025-11-02T08:00:00Z"),
      updatedAt: new Date("2026-01-10T09:00:00Z"),
    },
  });

  // ── Additional Spare Parts (item39–item43) ─────────────────────────────────

  await prisma.item.upsert({
    where: { id: "item39" },
    update: {},
    create: {
      id: "item39", barcode: "SP-2025-0040", itemType: "SPARE_PART",
      status: "IN_STORAGE", labIdNumber: "SP-2025-0040",
      manufacturer: "ebm-papst", model: "3214 NH/2 HH",
      partType: "Fan Motor", variant: "24 V DC, 120 × 120 × 38 mm, 228 m³/h",
      forMachines: ["WK-11 -40/+170", "TH710-W5"],
      locationId: "l16", createdById: "u1",
      createdAt: new Date("2025-05-10T10:00:00Z"),
      updatedAt: new Date("2025-05-10T10:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item40" },
    update: {},
    create: {
      id: "item40", barcode: "SP-2025-0041", itemType: "SPARE_PART",
      status: "IN_STORAGE", labIdNumber: "SP-2025-0041",
      manufacturer: "Schneider Electric", model: "ATV312H055M2",
      partType: "Variable Frequency Drive", variant: "0.55 kW, 230 V 1-ph in / 3-ph out",
      forMachines: ["TH710-W5"],
      locationId: "l16", createdById: "u1",
      createdAt: new Date("2025-05-12T10:00:00Z"),
      updatedAt: new Date("2025-05-12T10:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item41" },
    update: {},
    create: {
      id: "item41", barcode: "SP-2026-0050", itemType: "SPARE_PART",
      status: "IN_STORAGE", labIdNumber: "SP-2026-0050",
      manufacturer: "Parker Hannifin", model: "06F-1/4-B",
      partType: "Pneumatic Filter / Regulator", variant: "1/4 BSP, 40 µm, 0–10 bar",
      forMachines: ["MTS 322.31", "TS-130", "TS-070"],
      containerId: "c3", locationId: "l6", createdById: "u1",
      createdAt: new Date("2026-01-10T10:00:00Z"),
      updatedAt: new Date("2026-01-10T10:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item42" },
    update: {},
    create: {
      id: "item42", barcode: "SP-2025-0042", itemType: "SPARE_PART",
      status: "IN_STORAGE", labIdNumber: "SP-2025-0042",
      manufacturer: "Omron", model: "G9SB-3012-D",
      partType: "Safety Relay", variant: "24 V DC, 3 N/O + 1 N/C, DIN rail",
      forMachines: ["MTS 248.10", "WK-34 -40/+170"],
      locationId: "l17", createdById: "u1",
      createdAt: new Date("2025-06-20T10:00:00Z"),
      updatedAt: new Date("2025-06-20T10:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item43" },
    update: {},
    create: {
      id: "item43", barcode: "SP-2025-0043", itemType: "SPARE_PART",
      status: "IN_STORAGE", labIdNumber: "SP-2025-0043",
      manufacturer: "Siemens", model: "5SL6 316-7",
      partType: "Miniature Circuit Breaker", variant: "3P, 16 A, C-curve, 6 kA",
      forMachines: ["TH710-W5", "VCS 7018-5"],
      locationId: "l18", createdById: "u3",
      createdAt: new Date("2025-07-08T10:00:00Z"),
      updatedAt: new Date("2025-07-08T10:00:00Z"),
    },
  });

  // ── Additional Consumables (item44–item49) ─────────────────────────────────

  await prisma.item.upsert({
    where: { id: "item44" },
    update: {},
    create: {
      id: "item44", barcode: "CON-2026-003", itemType: "CONSUMABLE",
      status: "IN_STORAGE", labIdNumber: "CON-2026-003",
      manufacturer: "Shin-Etsu", model: "X-23-7762-2",
      consumableType: "Thermal Interface Compound 6.0 W/m·K", quantity: 250, unit: "g",
      lotNumber: "LOT-2026-0310",
      expiryDate: new Date("2028-06-01"), shelfLifeMonths: 36,
      locationId: "l5", createdById: "u2",
      createdAt: new Date("2026-02-01T08:00:00Z"),
      updatedAt: new Date("2026-02-01T08:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item45" },
    update: {},
    create: {
      id: "item45", barcode: "CON-2025-010", itemType: "CONSUMABLE",
      status: "IN_STORAGE", labIdNumber: "CON-2025-010",
      manufacturer: "HumiSeal", model: "1B31 Aerosol",
      consumableType: "Acrylic Conformal Coating", quantity: 12, unit: "pcs",
      lotNumber: "LOT-2025-1820",
      expiryDate: new Date("2026-12-01"), shelfLifeMonths: 18,
      locationId: "l15", createdById: "u2",
      createdAt: new Date("2025-06-15T08:00:00Z"),
      updatedAt: new Date("2025-06-15T08:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item46" },
    update: {},
    create: {
      id: "item46", barcode: "CON-2025-011", itemType: "CONSUMABLE",
      status: "IN_STORAGE", labIdNumber: "CON-2025-011",
      manufacturer: "Desco", model: "ESD-250-200",
      consumableType: "Anti-Static Shielding Bags 250×200 mm", quantity: 200, unit: "pcs",
      lotNumber: "LOT-2025-0990",
      expiryDate: new Date("2030-01-01"), shelfLifeMonths: 60,
      locationId: "l16", createdById: "u7",
      createdAt: new Date("2025-08-01T08:00:00Z"),
      updatedAt: new Date("2025-08-01T08:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item47" },
    update: {},
    create: {
      id: "item47", barcode: "CON-2026-004", itemType: "CONSUMABLE",
      status: "IN_STORAGE", labIdNumber: "CON-2026-004",
      manufacturer: "Air Liquide", model: "H2/N2-5-CAL",
      consumableType: "Calibration Gas 5 % H₂ in N₂ — LEL sensor cal", quantity: 1, unit: "pcs",
      lotNumber: "LOT-2026-0042",
      expiryDate: new Date("2027-03-01"), shelfLifeMonths: 12,
      locationId: "l5", createdById: "u1",
      createdAt: new Date("2026-03-01T08:00:00Z"),
      updatedAt: new Date("2026-03-01T08:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item48" },
    update: {},
    create: {
      id: "item48", barcode: "CON-2025-012", itemType: "CONSUMABLE",
      status: "IN_STORAGE", labIdNumber: "CON-2025-012",
      manufacturer: "Clariant", model: "TROCKENPERLEN-1KG",
      consumableType: "Silica Gel Desiccant Beads (indicating)", quantity: 3, unit: "kg",
      lotNumber: "LOT-2025-0710",
      expiryDate: new Date("2027-09-01"), shelfLifeMonths: 24,
      locationId: "l14", createdById: "u2",
      createdAt: new Date("2025-09-10T08:00:00Z"),
      updatedAt: new Date("2025-09-10T08:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item49" },
    update: {},
    create: {
      id: "item49", barcode: "CON-2025-013", itemType: "CONSUMABLE",
      status: "IN_STORAGE", labIdNumber: "CON-2025-013",
      manufacturer: "Berkshire", model: "TX4003",
      consumableType: "Clean Room Wipes ISO Class 5 — 150×150 mm", quantity: 1000, unit: "pcs",
      lotNumber: "LOT-2025-1560",
      expiryDate: new Date("2030-01-01"), shelfLifeMonths: 60,
      locationId: "l15", createdById: "u2",
      createdAt: new Date("2025-08-20T08:00:00Z"),
      updatedAt: new Date("2025-08-20T08:00:00Z"),
    },
  });

  // ── Additional Misc (item50–item52) ────────────────────────────────────────

  await prisma.item.upsert({
    where: { id: "item50" },
    update: {},
    create: {
      id: "item50", barcode: "MISC-003", itemType: "MISC",
      status: "IN_STORAGE", labIdNumber: "MISC-003",
      miscName: "ESD Wrist Strap & Bench Mat Set",
      miscDescription: "3× adjustable wrist strap + 600×400 mm bench mat, compliant with IEC 61340-5-1",
      containerId: "c3", locationId: "l6", createdById: "u7",
      createdAt: new Date("2025-09-05T09:00:00Z"),
      updatedAt: new Date("2025-09-05T09:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item51" },
    update: {},
    create: {
      id: "item51", barcode: "MISC-004", itemType: "MISC",
      status: "IN_STORAGE", labIdNumber: "MISC-004",
      miscName: "Adjustable Shelf Bracket Kit — 80/20 T-slot",
      miscDescription: "12× L-brackets + 24× M8 T-nuts for 80/20 aluminium extrusion shelving in Area C",
      locationId: "l17", createdById: "u1",
      createdAt: new Date("2025-10-12T09:00:00Z"),
      updatedAt: new Date("2025-10-12T09:00:00Z"),
    },
  });

  await prisma.item.upsert({
    where: { id: "item52" },
    update: {},
    create: {
      id: "item52", barcode: "MISC-005", itemType: "MISC",
      status: "IN_STORAGE", labIdNumber: "MISC-005",
      miscName: "Zebra ZT230 Label Printer Ribbon — Wax/Resin 110 mm",
      miscDescription: "5× wax/resin ribbon rolls, 110 mm × 74 m, for Zebra ZT230 barcode label printer",
      locationId: "l16", createdById: "u1",
      createdAt: new Date("2026-01-03T09:00:00Z"),
      updatedAt: new Date("2026-01-03T09:00:00Z"),
    },
  });

  console.log("    ✓ 52 items (19 electronics, 6 fixtures, 10 spare parts, 12 consumables, 5 misc)");

  // ─── Operations (full audit trail) ──────────────────────────────────────────
  console.log("  → Operations...");

  // Each item needs a RECEIPT as its first operation.
  // Then moves, temp-exits, returns, scraps, and consumes follow.
  const operations = [

    // ── Item 1 — BMW BR206 CID #1 ─────────────────────────────────────────
    {
      id: "op-item1-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item1", performedById: "u2",
      performedAt: new Date("2026-01-15T09:00:00Z"),
      toLocationId: "l1", toContainerId: "c1",
      notes: "Received from BMW Regensburg — shipped via DHL, 2 units on TR.EL26.012345",
    },
    {
      id: "op-item1-move", operationType: OperationType.MOVE,
      itemId: "item1", performedById: "u1",
      performedAt: new Date("2026-02-20T14:30:00Z"),
      fromLocationId: "l2", fromContainerId: "c2",
      toLocationId: "l1", toContainerId: "c1",
      notes: "Consolidated into BOX-0001 after intake inspection",
    },

    // ── Item 2 — BMW BR206 CID #2 ─────────────────────────────────────────
    {
      id: "op-item2-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item2", performedById: "u2",
      performedAt: new Date("2026-01-15T09:05:00Z"),
      toLocationId: "l1", toContainerId: "c1",
    },

    // ── Item 3 — STLA DS7 HUD ─────────────────────────────────────────────
    {
      id: "op-item3-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item3", performedById: "u1",
      performedAt: new Date("2025-11-01T10:00:00Z"),
      toLocationId: "l1",
      notes: "Received from Stellantis Mulhouse — attached test request TR.EL26.009871",
    },
    {
      id: "op-item3-exit", operationType: OperationType.TEMP_EXIT,
      itemId: "item3", performedById: "u1",
      performedAt: new Date("2026-02-28T08:00:00Z"),
      fromLocationId: "l1",
      toExternalLocationId: "el1",
      expectedReturnDate: new Date("2026-03-28"),
      notes: "Shipped to BMW FIZ for -40 / +85 °C thermal shock and EMC pre-compliance",
    },

    // ── Item 4 — MB W206 Cluster (scrapped) ───────────────────────────────
    {
      id: "op-item4-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item4", performedById: "u2",
      performedAt: new Date("2025-05-20T08:00:00Z"),
      toLocationId: "l9", toContainerId: "c4",
      notes: "Received from MB Sindelfingen — 1 unit on TR.EL25.007500",
    },
    {
      id: "op-item4-scrap", operationType: OperationType.SCRAP,
      itemId: "item4", performedById: "u2",
      performedAt: new Date("2025-12-15T11:00:00Z"),
      notes: "1.5 m free-fall drop test failure — ESD damage, BGA cracked. Approved for scrap by V.Penev.",
    },

    // ── Item 5 — Vibration fixture ────────────────────────────────────────
    {
      id: "op-item5-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item5", performedById: "u2",
      performedAt: new Date("2025-06-10T08:00:00Z"),
      toLocationId: "l3",
      notes: "Custom fixture received from Visteon tooling — FIX-1236 for BR206 CID vib/shock",
    },

    // ── Item 6 — Climatic fixture (at IDIADA) ─────────────────────────────
    {
      id: "op-item6-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item6", performedById: "u1",
      performedAt: new Date("2025-09-01T08:00:00Z"),
      toLocationId: "l4",
      notes: "Universal IP67 water fixture received from manufacturer",
    },
    {
      id: "op-item6-exit", operationType: OperationType.TEMP_EXIT,
      itemId: "item6", performedById: "u1",
      performedAt: new Date("2026-03-01T08:00:00Z"),
      fromLocationId: "l4",
      toExternalLocationId: "el2",
      expectedReturnDate: new Date("2026-03-22"),
      notes: "Shipped to IDIADA for ISO 20653 IPX7 water ingress campaign — return by 2026-03-22",
    },

    // ── Item 7 — ETS compressor ───────────────────────────────────────────
    {
      id: "op-item7-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item7", performedById: "u1",
      performedAt: new Date("2025-08-15T10:00:00Z"),
      toLocationId: "l6", toContainerId: "c3",
      notes: "ETS OP-31 replacement compressor ordered after TH710-W5 failure report #MNT-2025-012",
    },

    // ── Item 8 — Danfoss solenoid valve ───────────────────────────────────
    {
      id: "op-item8-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item8", performedById: "u1",
      performedAt: new Date("2025-08-20T10:00:00Z"),
      toLocationId: "l6", toContainerId: "c3",
    },

    // ── Item 9 — Arizona A2 dust (partially consumed) ──────────────────────
    {
      id: "op-item9-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item9", performedById: "u2",
      performedAt: new Date("2025-04-01T08:00:00Z"),
      toLocationId: "l5",
      notes: "3 kg bag received — initial qty 3.0 kg",
    },
    {
      id: "op-item9-con1", operationType: OperationType.CONSUME,
      itemId: "item9", performedById: "u2",
      performedAt: new Date("2026-01-10T15:00:00Z"),
      quantityConsumed: 0.5,
      notes: "Used for IP5x dust ingress test batch #12 on project DS7 HUD",
    },

    // ── Item 10 — pH 7.0 Buffer (expired) ────────────────────────────────
    {
      id: "op-item10-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item10", performedById: "u2",
      performedAt: new Date("2025-03-15T08:00:00Z"),
      toLocationId: "l5",
      notes: "pH calibration consumable for conductivity meter — 5 L",
    },

    // ── Item 11 — Mixed-bed resin ─────────────────────────────────────────
    {
      id: "op-item11-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item11", performedById: "u1",
      performedAt: new Date("2026-01-01T08:00:00Z"),
      toLocationId: "l5",
    },

    // ── Item 12 — NaCl (depleted) ─────────────────────────────────────────
    {
      id: "op-item12-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item12", performedById: "u2",
      performedAt: new Date("2024-12-01T08:00:00Z"),
      toLocationId: "l5",
      notes: "2 kg NaCl for salt-spray test campaign S-2026-03",
    },
    {
      id: "op-item12-con1", operationType: OperationType.CONSUME,
      itemId: "item12", performedById: "u2",
      performedAt: new Date("2026-02-15T10:00:00Z"),
      quantityConsumed: 2.0,
      notes: "Last 2 kg consumed for salt-spray batch — stock now zero, reorder required",
    },

    // ── Item 13 — M5 hex bolts ────────────────────────────────────────────
    {
      id: "op-item13-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item13", performedById: "u2",
      performedAt: new Date("2025-07-01T08:00:00Z"),
      toLocationId: "l6", toContainerId: "c3",
    },

    // ── Item 14 — VW Polo Cluster (PRE_DV intake) ─────────────────────────
    {
      id: "op-item14-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item14", performedById: "u6",
      performedAt: new Date("2026-02-01T10:00:00Z"),
      toLocationId: "l2", toContainerId: "c2",
      notes: "3 units received on TR.EL26.011200 — only sample .3.1 logged; others pending barcoding",
    },

    // ── Item 15 — Ford Mach-E CID ─────────────────────────────────────────
    {
      id: "op-item15-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item15", performedById: "u2",
      performedAt: new Date("2025-10-15T11:00:00Z"),
      toLocationId: "l7",
      notes: "Received from Ford Cuautitlán — DHL air freight, 1 unit on TR.EL26.009400",
    },

    // ── Item 16 — JLR Defender HUD (at TÜV) ──────────────────────────────
    {
      id: "op-item16-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item16", performedById: "u2",
      performedAt: new Date("2025-12-01T09:00:00Z"),
      toLocationId: "l8",
      notes: "Received from JLR Halewood — PV unit for E-mark / EMC certification",
    },
    {
      id: "op-item16-exit", operationType: OperationType.TEMP_EXIT,
      itemId: "item16", performedById: "u2",
      performedAt: new Date("2026-02-10T08:30:00Z"),
      fromLocationId: "l8",
      toExternalLocationId: "el3",
      expectedReturnDate: new Date("2026-03-31"),
      notes: "Sent to TÜV Rheinland Cologne for UN-ECE R10 and CISPR 25 measurements",
    },

    // ── Item 17 — Volvo EX90 BCM ──────────────────────────────────────────
    {
      id: "op-item17-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item17", performedById: "u7",
      performedAt: new Date("2026-02-01T13:00:00Z"),
      toLocationId: "l8",
      notes: "Volvo EX90 BCM — early DV sample; received from Volvo Cars Gothenburg via UPS",
    },

    // ── Item 18 — Renault HMI (scrapped) ──────────────────────────────────
    {
      id: "op-item18-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item18", performedById: "u2",
      performedAt: new Date("2025-07-15T09:00:00Z"),
      toLocationId: "l3",
      notes: "Received from Renault Douai — DV sample for thermal and vibration testing",
    },
    {
      id: "op-item18-scrap", operationType: OperationType.SCRAP,
      itemId: "item18", performedById: "u1",
      performedAt: new Date("2025-09-30T16:00:00Z"),
      notes: "Electrolytic capacitor (C42, 25 V 100 µF) burst during +85 °C 72 h soak — thermal runaway. Unit destroyed, non-recoverable.",
    },

    // ── Item 19 — MB W223 S-Class Cluster (Munich) ────────────────────────
    {
      id: "op-item19-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item19", performedById: "u3",
      performedAt: new Date("2025-11-20T10:00:00Z"),
      toLocationId: "l11", toContainerId: "c6",
      notes: "W223 PV cluster received at Munich Tech Center from MB Sindelfingen",
    },

    // ── Item 20 — BMW G70 Cluster — returned from BMW FIZ ────────────────
    {
      id: "op-item20-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item20", performedById: "u3",
      performedAt: new Date("2025-08-10T09:00:00Z"),
      toLocationId: "l12",
      notes: "G70 DV cluster received at Munich — single unit on TR.EL26.011750",
    },
    {
      id: "op-item20-exit", operationType: OperationType.TEMP_EXIT,
      itemId: "item20", performedById: "u3",
      performedAt: new Date("2025-09-15T08:00:00Z"),
      fromLocationId: "l12",
      toExternalLocationId: "el1",
      expectedReturnDate: new Date("2025-10-30"),
      notes: "Sent to BMW FIZ for OEM factory acceptance check — short 6-week loan",
    },
    {
      id: "op-item20-rtrn", operationType: OperationType.RETURN,
      itemId: "item20", performedById: "u3",
      performedAt: new Date("2025-11-01T11:00:00Z"),
      fromExternalLocationId: "el1",
      toLocationId: "l12",
      notes: "Returned from BMW FIZ in good condition. All BMW acceptance criteria passed.",
    },

    // ── Item 21 — Salt/climatic fixture ───────────────────────────────────
    {
      id: "op-item21-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item21", performedById: "u1",
      performedAt: new Date("2024-03-15T08:00:00Z"),
      toLocationId: "l4",
      notes: "Adapter kit received from Visteon tooling — covers 6 DUT footprints",
    },

    // ── Item 22 — Moog servo valve (at Moog calibration lab) ──────────────
    {
      id: "op-item22-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item22", performedById: "u1",
      performedAt: new Date("2024-10-20T08:00:00Z"),
      toLocationId: "l7",
      notes: "Moog D633 spare valve received — stored as cold standby for MTS 322.31",
    },
    {
      id: "op-item22-exit", operationType: OperationType.TEMP_EXIT,
      itemId: "item22", performedById: "u1",
      performedAt: new Date("2026-01-15T09:00:00Z"),
      fromLocationId: "l7",
      toExternalLocationId: "el4",
      expectedReturnDate: new Date("2026-04-15"),
      notes: "Shipped to Moog East Aurora for annual calibration certificate renewal and O-ring replacement",
    },

    // ── Item 23 — Weiss Technik heating cartridge ─────────────────────────
    {
      id: "op-item23-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item23", performedById: "u1",
      performedAt: new Date("2025-02-10T10:00:00Z"),
      toLocationId: "l8",
      notes: "WK11-600 heating cartridge ordered as preventive stock — climate chamber maintenance",
    },

    // ── Item 24 — Vötsch humidity sensor ──────────────────────────────────
    {
      id: "op-item24-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item24", performedById: "u7",
      performedAt: new Date("2026-01-25T09:00:00Z"),
      toLocationId: "l9", toContainerId: "c4",
      notes: "Replacement sensor for VCS 7018-5 — previous sensor failed calibration Jan 2026",
    },

    // ── Item 25 — Isopropanol ─────────────────────────────────────────────
    {
      id: "op-item25-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item25", performedById: "u2",
      performedAt: new Date("2026-01-08T08:00:00Z"),
      toLocationId: "l5",
      notes: "10 L IPA ordered for PCB and connector cleaning prior to conformal coating",
    },
    {
      id: "op-item25-con1", operationType: OperationType.CONSUME,
      itemId: "item25", performedById: "u7",
      performedAt: new Date("2026-03-05T10:00:00Z"),
      quantityConsumed: 1.5,
      notes: "1.5 L used for pre-coating PCB cleaning on CID samples (items item1, item2) — batch clean",
    },

    // ── Item 26 — Bergquist GP3000 TIM pads ──────────────────────────────
    {
      id: "op-item26-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item26", performedById: "u2",
      performedAt: new Date("2025-11-10T10:00:00Z"),
      toLocationId: "l5",
      notes: "20 pcs thermal interface pads — used during DUT preparation for thermal testing",
    },

    // ── Item 27 — Cable tie assortment ────────────────────────────────────
    {
      id: "op-item27-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item27", performedById: "u7",
      performedAt: new Date("2025-10-05T09:00:00Z"),
      toLocationId: "l6", toContainerId: "c3",
    },

    // ── Item 28 — Audi Q8 HUD ─────────────────────────────────────────────
    {
      id: "op-item28-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item28", performedById: "u2",
      performedAt: new Date("2026-02-10T09:00:00Z"),
      toLocationId: "l14",
      notes: "Received from Audi Brussels — DV HUD unit on TR.EL26.014100",
    },

    // ── Item 29 — BMW F40 Cluster ─────────────────────────────────────────
    {
      id: "op-item29-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item29", performedById: "u2",
      performedAt: new Date("2026-01-20T10:00:00Z"),
      toLocationId: "l1", toContainerId: "c1",
      notes: "PV cluster received from BMW Leipzig — consolidated with BR206 box",
    },

    // ── Item 30 — Hyundai IONIQ 6 CID ────────────────────────────────────
    {
      id: "op-item30-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item30", performedById: "u6",
      performedAt: new Date("2026-02-18T11:00:00Z"),
      toLocationId: "l15",
      notes: "IONIQ 6 CID DV sample shipped from Hyundai Ulsan via air freight",
    },

    // ── Item 31 — Porsche 992 HUD ─────────────────────────────────────────
    {
      id: "op-item31-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item31", performedById: "u4",
      performedAt: new Date("2026-03-01T09:00:00Z"),
      toLocationId: "l13", toContainerId: "c8",
      notes: "PRE_DV HUD module received at Paris R&D — TR.EL26.014350",
    },

    // ── Item 32 — Nissan Ariya BCM (TEMP_EXIT) ────────────────────────────
    {
      id: "op-item32-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item32", performedById: "u2",
      performedAt: new Date("2026-01-05T09:00:00Z"),
      toLocationId: "l3",
      notes: "Nissan Ariya BCM DV unit received from Oppama plant",
    },
    {
      id: "op-item32-exit", operationType: OperationType.TEMP_EXIT,
      itemId: "item32", performedById: "u2",
      performedAt: new Date("2026-02-25T08:00:00Z"),
      fromLocationId: "l3",
      toExternalLocationId: "el2",
      expectedReturnDate: new Date("2026-04-10"),
      notes: "Shipped to IDIADA for IPX7 immersion and dust ingress validation",
    },

    // ── Item 33 — Toyota RAV4 Cluster (SCRAPPED) ──────────────────────────
    {
      id: "op-item33-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item33", performedById: "u2",
      performedAt: new Date("2025-06-01T09:00:00Z"),
      toLocationId: "l9", toContainerId: "c4",
      notes: "Toyota RAV4 PHEV cluster received from Tsutsumi — 1 unit on TR.EL25.008400",
    },
    {
      id: "op-item33-scrap", operationType: OperationType.SCRAP,
      itemId: "item33", performedById: "u1",
      performedAt: new Date("2025-11-20T14:00:00Z"),
      notes: "PCB delamination after thermal shock test — IPC-6012 class 3 failure. Approved for scrap.",
    },

    // ── Item 34 — Skoda Octavia IV Cluster ────────────────────────────────
    {
      id: "op-item34-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item34", performedById: "u6",
      performedAt: new Date("2026-02-05T10:00:00Z"),
      toLocationId: "l16",
      notes: "Skoda Digital Cockpit DV unit received from Mladá Boleslav",
    },

    // ── Item 35 — Kia EV6 HMI ─────────────────────────────────────────────
    {
      id: "op-item35-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item35", performedById: "u3",
      performedAt: new Date("2026-03-05T10:00:00Z"),
      toLocationId: "l11", toContainerId: "c6",
      notes: "Kia EV6 HMI PRE_DV sample received at Munich from Hwaseong",
    },

    // ── Item 36 — Cluster vibration fixture ───────────────────────────────
    {
      id: "op-item36-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item36", performedById: "u1",
      performedAt: new Date("2025-04-01T08:00:00Z"),
      toLocationId: "l14",
      notes: "Visteon tooling FIX-0412 — cluster vib/shock fixture delivered from workshop",
    },

    // ── Item 37 — EMC absorber panel fixture ──────────────────────────────
    {
      id: "op-item37-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item37", performedById: "u1",
      performedAt: new Date("2025-09-15T08:00:00Z"),
      toLocationId: "l17",
      notes: "EMC absorber fixture received — Area C quarantine shelf used for large fixtures",
    },

    // ── Item 38 — HUD alignment jig (TEMP_EXIT) ───────────────────────────
    {
      id: "op-item38-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item38", performedById: "u1",
      performedAt: new Date("2025-11-02T08:00:00Z"),
      toLocationId: "l3",
      notes: "HUD optical alignment jig received from Visteon optical lab",
    },
    {
      id: "op-item38-exit", operationType: OperationType.TEMP_EXIT,
      itemId: "item38", performedById: "u1",
      performedAt: new Date("2026-01-10T09:00:00Z"),
      fromLocationId: "l3",
      toExternalLocationId: "el1",
      expectedReturnDate: new Date("2026-04-30"),
      notes: "Sent to BMW FIZ to support 992 HUD combiner angle verification",
    },

    // ── Item 39 — ebm-papst fan motor ─────────────────────────────────────
    {
      id: "op-item39-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item39", performedById: "u1",
      performedAt: new Date("2025-05-10T10:00:00Z"),
      toLocationId: "l16",
      notes: "ebm-papst 3214 fan ordered as preventive stock for WK-11 and TH710-W5",
    },

    // ── Item 40 — Schneider VFD ───────────────────────────────────────────
    {
      id: "op-item40-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item40", performedById: "u1",
      performedAt: new Date("2025-05-12T10:00:00Z"),
      toLocationId: "l16",
      notes: "Spare VFD for TH710-W5 blower motor drive — ordered after 2024 failure report",
    },

    // ── Item 41 — Parker filter/regulator ────────────────────────────────
    {
      id: "op-item41-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item41", performedById: "u1",
      performedAt: new Date("2026-01-10T10:00:00Z"),
      toLocationId: "l6", toContainerId: "c3",
      notes: "Parker pneumatic filter/regulator — spare for compressed air lines on test benches",
    },

    // ── Item 42 — Omron safety relay ──────────────────────────────────────
    {
      id: "op-item42-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item42", performedById: "u1",
      performedAt: new Date("2025-06-20T10:00:00Z"),
      toLocationId: "l17",
      notes: "Omron G9SB safety relay — replacement for MTS 248.10 E-stop circuit",
    },

    // ── Item 43 — Siemens circuit breaker ─────────────────────────────────
    {
      id: "op-item43-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item43", performedById: "u3",
      performedAt: new Date("2025-07-08T10:00:00Z"),
      toLocationId: "l18",
      notes: "Siemens MCB received at Munich — spare for TH710-W5 main panel",
    },

    // ── Item 44 — Shin-Etsu thermal compound ──────────────────────────────
    {
      id: "op-item44-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item44", performedById: "u2",
      performedAt: new Date("2026-02-01T08:00:00Z"),
      toLocationId: "l5",
      notes: "250 g syringe thermal compound for heatsink application on DUT prep",
    },

    // ── Item 45 — HumiSeal conformal coating ──────────────────────────────
    {
      id: "op-item45-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item45", performedById: "u2",
      performedAt: new Date("2025-06-15T08:00:00Z"),
      toLocationId: "l15",
      notes: "12 aerosol cans 1B31 coating ordered for PCB conformal coating batch",
    },

    // ── Item 46 — ESD shielding bags ──────────────────────────────────────
    {
      id: "op-item46-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item46", performedById: "u7",
      performedAt: new Date("2025-08-01T08:00:00Z"),
      toLocationId: "l16",
      notes: "200-pack ESD bags for sample packaging during transit",
    },

    // ── Item 47 — Calibration gas cylinder ───────────────────────────────
    {
      id: "op-item47-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item47", performedById: "u1",
      performedAt: new Date("2026-03-01T08:00:00Z"),
      toLocationId: "l5",
      notes: "H₂/N₂ calibration gas for flammable gas sensor zero-span calibration",
    },

    // ── Item 48 — Silica gel desiccant ────────────────────────────────────
    {
      id: "op-item48-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item48", performedById: "u2",
      performedAt: new Date("2025-09-10T08:00:00Z"),
      toLocationId: "l14",
      notes: "3 kg indicating silica gel for desiccant containers in storage cabinets",
    },

    // ── Item 49 — Clean room wipes ────────────────────────────────────────
    {
      id: "op-item49-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item49", performedById: "u2",
      performedAt: new Date("2025-08-20T08:00:00Z"),
      toLocationId: "l15",
      notes: "1000-pack ISO class 5 wipes for optical surface cleaning on HUD combiners",
    },

    // ── Item 50 — ESD wrist strap set ─────────────────────────────────────
    {
      id: "op-item50-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item50", performedById: "u7",
      performedAt: new Date("2025-09-05T09:00:00Z"),
      toLocationId: "l6", toContainerId: "c3",
      notes: "ESD personal protection kit for lab benches — 3 workstations",
    },

    // ── Item 51 — Shelf bracket kit ───────────────────────────────────────
    {
      id: "op-item51-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item51", performedById: "u1",
      performedAt: new Date("2025-10-12T09:00:00Z"),
      toLocationId: "l17",
      notes: "80/20 bracket kit for reconfiguring Area C shelving to accommodate large fixtures",
    },

    // ── Item 52 — Zebra ZT230 ribbon ──────────────────────────────────────
    {
      id: "op-item52-rcpt", operationType: OperationType.RECEIPT,
      itemId: "item52", performedById: "u1",
      performedAt: new Date("2026-01-03T09:00:00Z"),
      toLocationId: "l16",
      notes: "5 wax/resin ribbon rolls for ZT230 — label printing for incoming samples",
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
