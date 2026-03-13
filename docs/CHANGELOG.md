# Changelog

> All notable changes, milestones, and completions are recorded here.
> Format follows [Keep a Changelog](https://keepachangelog.com) conventions.
> Versions use `YYYY-MM-DD` until a formal versioning scheme is adopted.

---

## [Unreleased]

### Planned
- Remaining page wiring (AddItemPage, OperationsPages, ReportsPages)
- Barcode scan input handling (web + Android)
- Label print service hardware integration

---

## [2026-03-13] — Seed data fixes

### Fixed
- `prisma/seed.ts`: replaced `as const` string literals on `operationType` with `OperationType` enum imported from `@prisma/client` — eliminates the unused-import hint and makes typos a compile error
- `prisma/seed.ts`: added missing RECEIPT operations (op11 for item3 at l1, op12 for item6 at l4) so that the `fromLocationId` values in the subsequent TEMP_EXIT operations (op4, op10) are traceable in the audit log — previously the exit operations referenced locations the items were never recorded at

---

## [2026-03-13] — Frontend-Backend Integration

### Added
- `prisma/seed.ts` — database seed script with all sample data (5 users, 3 sites, 13 items, 10 operations)
- `prisma/migration_init.sql` — full initial migration SQL
- `prisma.seed` config in `package.json` for `npx prisma db seed`
- `frontend/src/api/` — complete API client layer (client, auth, items, operations, sites, containers)
- `frontend/src/context/AuthContext.tsx` — React auth context with JWT token management
- Vite proxy config for `/api` → backend
- `VITE_USE_MOCKS` env toggle for mock vs API data on all pages
- Sortable Item List table columns
- Deep-linking from Print Label buttons to Labels page

### Changed
- `ItemListPage` — fetches from API with loading/error states
- `ItemDetailPage` — fetches item + operation history from API
- `DashboardPage` — computes stats from API responses
- `StoragePages` (Location, Container, External) — all wired to API
- `LoginPage` — real LDAP auth via AuthContext
- `App.tsx` — wrapped with `AuthProvider`
- `LabelsPage` — accepts URL search params for pre-selection

---

## [2026-03-10] — Project Kickoff / Documentation Phase

### Added
- `docs/PROJECT.md` — master context file
- `docs/SPEC.md` — full specification from source document
- `docs/DECISIONS.md` — architecture decision log (initial 9 decisions)
- `docs/TYPES.md` — TypeScript type definitions (DRAFT)
- `docs/SCREENS.md` — screen inventory (DRAFT, 25 screens planned)
- `docs/API.md` — API route catalogue (DRAFT)
- `docs/CHANGELOG.md` — this file

### Decided
- Stack locked: React/Vite/TS + Fastify + Prisma + PostgreSQL
- Auth: LDAP → JWT, 3 roles
- Barcodes: Code 128 + QR Code
- Deployment: Docker Compose, on-prem, Nginx reverse proxy
- Multi-site: global DB with role+site filtered queries
- Soft-delete strategy for users and items

---

## Template for Future Entries

```markdown
## [YYYY-MM-DD] — Milestone Name

### Added
- New feature or file

### Changed
- What was updated

### Fixed
- Bug or issue resolved

### Decided
- New architecture or design decision (link to DECISIONS.md)

### Removed
- What was deprecated or removed
```
