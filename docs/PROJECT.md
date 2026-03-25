# Lab Storage Manager — Project Context

> **Paste this file at the start of every Claude session to restore full context.**

## Status
`In Development` — Backend fully implemented. Frontend integration in progress. Location dropdown auto-refresh implemented.

## Team
- Martin (developer)
- Venelin (lab manager / domain expert / co-developer)

## Last Updated
2026-03-25

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

## Next Steps (Remaining)

### Phase 3: Testing & Hardware Integration (In Progress)
- [ ] **Hardware label printing** — integrate actual printer drivers (Zebra ZPL / Citizen / Brother)
- [ ] **Barcode scanner input handling** — web form submit + Android terminal integration
- [ ] **UI/UX refinement** — operations pages (Move, Receipt, Exit, Return, Scrap, Consume)
- [ ] **API error handling** — standardize responses, retry logic, validation messages
- [ ] **Frontend form validation** — schema-based validation for all add/edit forms

### Phase 4: QA & Deployment
- [ ] **Full system testing** — operations workflows, edge cases
- [ ] **Performance optimization** — API query optimization, frontend bundle size
- [ ] **Deployment runbook** — DEPLOYMENT.md completion + smoke tests
- [ ] **User training materials** — screenshots, walkthrough videos
- [ ] **LDAP integration testing** — with real Visteon AD (development: fallback mode active)
- [ ] **Containerization** — Docker Compose validation on Linux server

### Completed
- [x] TypeScript type definitions (` const` enums pattern, `src/shared/types/`)
- [x] Screen inventory (`SCREENS.md`)
- [x] Prisma schema init (`prisma/schema.prisma`)
- [x] Docker Compose setup (`docker-compose.yml`)
- [x] Backend scaffolded with Fastify + TS
- [x] Frontend scaffolded with React + Vite + routing
- [x] Mock data system for frontend development
- [x] Database seed script + initial migration SQL
- [x] **Backend API routes** — all CRUD routes for items, operations, sites, containers, users, reports
- [x] **LDAP/JWT authentication** — backend plugin + login route
- [x] **Frontend-Backend integration** — API client layer + AuthContext
- [x] **Major pages wired to API** — Items, Dashboard, Storage, Labels  
- [x] **Admin route protection** — `AdminRoute` component + role-based access control
- [x] **API client improvements** — fallback to `/api/v1` when `VITE_API_URL` is empty- [x] **Location dropdown auto-refresh** — 5-second polling in AddItemPage & OperationsPages for real-time admin sync
- [x] **Edit item** — EditItemPage with pre-populated type-specific forms, accessible via Edit button on ItemDetailPage
- [x] **Backend security fix** — dev auth fallback gated behind `NODE_ENV === "development"` (BUG-001)
- [x] **Audit trail on item create** — RECEIPT OperationRecord created atomically in `$transaction` for all 5 item types when location is supplied (BUG-005)
- [x] **Move/Receipt validation** — Move requires at least one destination; Receipt requires at least one location (BUG-008, BUG-009)
- [x] **Lab ID editable via API** — `labIdNumber` added to `UpdateItemBody` schema so PATCH persists changes (BUG-010)

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
