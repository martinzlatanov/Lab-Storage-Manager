# Lab Storage Manager — Project Context

> **Paste this file at the start of every Claude session to restore full context.**

## Status
`In Development` — Pre-scaffold phase

## Team
- Martin (developer)
- Venelin Lab manager (domain expert / co-developer)

## Last Updated
2026-03-10

---

## Purpose
A warehouse management system for electronics testing labs and R&D centers.
All parts must be locatable at any time. Every movement is tracked and recorded until EOL.

## Deployment
- On-premises, Visteon corporate infrastructure
- Preferred OS: Linux (server); Windows also supported
- Accessed via web browser (Firefox, Chrome, Edge) and Android terminals with 2D scanners

---

## Stack (Locked)

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| Backend | Node.js + Fastify + TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | LDAP (ldapts) → JWT |
| Reverse Proxy | Nginx |
| Containers | Docker Compose |
| Barcodes | Code 128 (1D), QR Code (2D) |
| Label Printers | Zebra / Citizen / Brother (abstracted print service) |

---
## Module Design 
  - Use modular code organization with clear separation of components, and features. For example, separate frontend components, backend logic, and database schema into distinct directories.
  
## Item Types Tracked

1. **Automotive Electronics Test Samples** — clusters, displays, body controllers, etc.
2. **Mechanical Fixtures** — for vibration and mechanical shock tests
3. **Climatic Fixtures** — for climatic, temperature, salt, dust, water tests
4. **Machine Spare Parts** — OEM spare parts with model/type/variant
5. **Consumables** — chemicals/liquids/solids with expiry date and lot number
6. **Miscellaneous Parts** — non-specific parts with fewer attributes

---

## Roles & Auth

| Role | Permissions |
|---|---|
| Admin | Full access: configuration, user management, DB corrections |
| User | Warehouse operations: receipt, move, scrap, print labels |
| Viewer | Read-only queries |

- Authentication via **LDAP** (Active Directory)
- Authorization via **JWT** with role claim
- Users are **never deleted** — only marked inactive
- Parts/items are **never deleted** — scrapped items become immutable in UI (admin-only edits)

---

## Storage Hierarchy

```
Site (city)
└── Building
    └── Storage Area (letter code: A, B, C…)
        └── Location (row-shelf-level: A-01-02-5)
```

- Site + Building form the **namespace** (same area code can exist in multiple buildings)
- **External Locations** — external labs/R&D centers with contact person, address, city

---

## Key Design Decisions
See `DECISIONS.md` for full log.

- Multi-site: global DB, role+site filtered queries
- Consumables: quantity tracking with dedicated `Consume` operation
- External returns: scan-in required + due-date alert system
- Users: soft-delete only (inactive flag)
- Items: soft-delete only (scrapped flag, immutable in UI for non-admins)
- Boxes/containers: parts can share boxes; fixtures can be standalone or boxed
- Barcodes: Code 128 chosen over Code 39 for density and lowercase support

---

## Warehouse Operations

| Operation | Description |
|---|---|
| Receipt | Item enters warehouse; date, person, facility recorded |
| Exit (Temp) | Item leaves temporarily; expected return tracked |
| Permanent Exit / Scrap | Item marked scrapped with date + person; history preserved |
| Move | Between containers, shelves, areas, or sites |
| Consume | Reduce quantity of consumables |

---

## Next Steps (Ordered)

- [x] TypeScript type definitions (`TYPES.md` → `src/shared/types/`)
- [x] Screen inventory (`SCREENS.md`)
- [x] Prisma schema init (`prisma/schema.prisma`)
- [x] Docker Compose setup (`docker-compose.yml`)
- [x] Backend scaffolded (Fastify + TS)
- [x] Frontend scaffolded (React + Vite + routing)
- [x] Mock data system implementation
- [x] Item List & Detail screens
- [x] Location Browser & Container Manager
- [x] Label printing preview system
- [x] **Bugfixes: Print Label buttons connection**
- [x] **Feature: Sortable Item List table**
- [x] Backend API routes implemented (items, operations, sites, containers, users, reports, auth)
- [x] LDAP/JWT auth implementation (backend plugin + route)
- [x] Database seed script (`prisma/seed.ts`)
- [x] Initial migration SQL (`prisma/migration_init.sql`)
- [x] Frontend-Backend integration (API client + major pages wired)
- [ ] Remaining page wiring (AddItemPage, OperationsPages, ReportsPages)
- [ ] Label print service hardware integration
- [ ] Barcode scan input handling (web + Android)

---

## Related Files

| File | Purpose |
|---|---|
| `docs/SPEC.md` | Full original specification |
| `docs/DECISIONS.md` | Architecture decision log |
| `docs/SCREENS.md` | Screen inventory and UI map |
| `docs/TYPES.md` | TypeScript type definitions |
| `docs/API.md` | API route catalogue |
| `docs/CHANGELOG.md` | What changed and when |
