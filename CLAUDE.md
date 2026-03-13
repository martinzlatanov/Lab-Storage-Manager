# Lab Storage Manager — Claude Context

## Project Identity

**What it is:** Warehouse management system for electronics testing labs and R&D centers (Visteon).
**Purpose:** Every item must be locatable at all times. Every movement tracked until EOL.
**Status:** Frontend UI implemented with mock data. Backend not yet scaffolded.
**Team:** Martin (developer), Venelin (lab manager / domain expert)
**Deployment:** On-premises, Linux server, accessed via browser + Android 2D scanners.

---

## Documentation Files — Read Before Implementing

| File | When to read |
|---|---|
| [docs/PROJECT.md](docs/PROJECT.md) | Start of every major feature — master context, next steps |
| [docs/SPEC.md](docs/SPEC.md) | Any item type, field, or operation question — source of truth |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Before proposing any architectural or technology choice |
| [docs/TYPES.md](docs/TYPES.md) | Before adding/changing any TypeScript types (frontend or backend) |
| [docs/SCREENS.md](docs/SCREENS.md) | Before implementing or modifying any UI screen |
| [docs/API.md](docs/API.md) | Before implementing any backend route or frontend API call |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | To understand what has been done and what is planned |

**Always read the relevant doc(s) before writing code. Do not rely on memory alone.**

---

## Stack (Locked — Do Not Change)

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| Backend | Node.js + Fastify + TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | LDAP (ldapts) → JWT |
| Reverse proxy | Nginx |
| Containers | Docker Compose |
| Barcodes | Code 128 (1D) + QR Code (2D) |
| Label printers | Zebra / Citizen / Brother (abstracted print service) |
| Icons | lucide-react |
| CSS | Tailwind CSS v3 (NOT v4) |
| Routing | React Router v6 |

---
## Backend and Database
  - Keep a copy of the migration SQL file in the code.


## Critical TypeScript Constraints

- `erasableSyntaxOnly: true` in tsconfig — **TypeScript `enum` is BANNED**. Use `const` object + type pattern instead:
  ```ts
  export const ItemType = { ELECTRONICS_SAMPLE: 'ELECTRONICS_SAMPLE', ... } as const;
  export type ItemType = typeof ItemType[keyof typeof ItemType];
  ```
- `noUnusedLocals: true` — every import must be used or the build fails.
- Tailwind is v3 — do not use v4 syntax or `npx tailwindcss init` (it fails on v3).

---

## Frontend Structure (`frontend/src/`)

```
types/index.ts               — all shared types (const + type pattern, no enums)
mock/data.ts                 — mock data for all entities (3 sites, 13 items, 10 ops)
components/layout/           — AppShell, Sidebar, Header
components/ui/               — Badge, StatusBadge, Card
pages/auth/                  — LoginPage
pages/dashboard/             — DashboardPage
pages/items/                 — ItemListPage, ItemDetailPage, AddItemPage
pages/operations/            — OperationsPages.tsx (Receipt, Move, Exit, Return, Scrap, Consume)
pages/storage/               — StoragePages.tsx (LocationBrowser, ContainerManager, ExternalLocations)
pages/reports/               — ReportsPages.tsx (ByLocation, External, Expiry, AuditLog)
pages/admin/                 — AdminPages.tsx (Users, LocationConfig, ExternalLocationAdmin, Settings)
pages/LabelsPage.tsx         — label printing
```

**All routes** defined in `frontend/src/App.tsx`. Public: `/login`. All others wrapped in `AppShell`.

---

## Roles & Permissions

| Role | What they can do |
|---|---|
| Admin | Everything: configuration, user management, edit scrapped items |
| User | Warehouse operations: receipt, move, exit, return, scrap, consume, print labels |
| Viewer | Read-only queries and reports |

- Auth: LDAP → JWT with role claim embedded
- Users are **never hard-deleted** — only `isActive: false`

---

## Item Types (6 total)

1. **Electronics Sample** — OEM part, tracked individually, fields: OEM, product name, part number, lab ID, test request number
2. **Fixture (Mechanical)** — vibration/shock fixtures, multi-select type field
3. **Fixture (Climatic)** — climatic/dust/salt/water fixtures, same model as mechanical
4. **Spare Part** — machine parts with manufacturer/model/type/variant
5. **Consumable** — quantity-tracked, expiry date, lot number, `Consume` operation
6. **Misc** — non-specific, fewer attributes

---

## Storage Hierarchy

```
Site (e.g. Sofia, Munich, Paris)
└── Building (e.g. Main building, Lab building)
    └── Storage Area (letter code: A, B, C…)
        └── Location: [Area]-[Row]-[Shelf]-[Level]  e.g. A-01-02-5
```

- Site + Building form the **namespace** — same area code can exist in multiple buildings/sites
- **External Locations** — external labs with contact person, address, city (temporary exits)

---

## Warehouse Operations

| Operation | Description |
|---|---|
| Receipt | Item enters storage; date, person, facility recorded |
| Move | Between containers, shelves, areas, or sites |
| Exit (Temp) | Item leaves to external location; expected return date tracked |
| Return | Scan-in required to confirm return; overdue items flagged |
| Scrap | Item marked scrapped; becomes immutable in UI (admin-only edits) |
| Consume | Reduce quantity of consumable; records quantity + person |

---

## Immutability Rules (Non-Negotiable)

- **Items are never deleted.** Scrapped items become read-only in the UI (admin-only override).
- **Users are never deleted.** Only flagged `isActive: false`.
- **Every operation is timestamped** and attributed to a user — full audit trail forever.

---

## Dev Commands

```bash
# Run frontend dev server (port 5173)
cd frontend && npm run dev

# Type check
cd frontend && npx tsc --noEmit
```

Backend not yet scaffolded. See [docs/PROJECT.md](docs/PROJECT.md) for next steps.
