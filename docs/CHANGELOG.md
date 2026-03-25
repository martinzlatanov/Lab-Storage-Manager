# Changelog

> All notable changes, milestones, and completions are recorded here.
> Format follows [Keep a Changelog](https://keepachangelog.com) conventions.
> Versions use `YYYY-MM-DD` until a formal versioning scheme is adopted.

---

## [2026-03-25] — Frontend Bug Fix Pass (BUG-003 – BUG-020)

### Fixed

- **BUG-003** `frontend/src/types/index.ts`, `mock/data.ts`, `ItemDetailPage.tsx`, `AddItemPage.tsx`: renamed `Fixture.fixtureTypes` → `fixtureCategories` everywhere to align with the backend schema. Previously caused a `TypeError: Cannot read properties of undefined (reading 'map')` crash on Item Detail for any Fixture item.
- **BUG-004** `frontend/src/types/index.ts`, `mock/data.ts`, `ItemDetailPage.tsx`, `AddItemPage.tsx`: renamed `MiscItem.name`/`.description` → `miscName`/`miscDescription` to match backend field names. Both fields were rendering as `undefined` from the real API.
- **BUG-006** `ItemDetailPage.tsx`: removed dead "Full history" link (`/items/:id/history`); route does not exist — clicking it showed "Item not found".
- **BUG-007** `ItemDetailPage.tsx`: added `state={{ itemId: item.id }}` to the Temp Exit link (same pattern as the Move button) so the item is pre-selected on the Exit page.
- **BUG-010 (frontend)** `AddItemPage.tsx` (EditItemPage): `labIdNumber` is now rendered as a read-only field with explanatory note; removed from PATCH payload. Note: backend separately fixed this in the same session by adding it to `UpdateItemBody` — a design decision for Venelin to resolve (editable vs. immutable).
- **BUG-012** `AddItemPage.tsx` (FixtureForm): removed non-functional picture file `<input>` (had no `onChange` handler — file was silently discarded on submit).
- **BUG-013** `frontend/src/types/index.ts`, `mock/data.ts`: added `barcode: string` to `Container` interface and all 6 mock container objects.
- **BUG-014** `OperationsPages.tsx`: changed `ExternalLocationOption.country` from required `string` to optional `string | undefined`; added null-guard in dropdown rendering to prevent `"undefined"` text appearing.
- **BUG-015** `OperationsPages.tsx`: `useLocations()` and `useContainers()` hooks now return `{ options, error }` instead of bare arrays; API load errors are surfaced with an inline `AlertTriangle` warning above the affected select in Receipt, Move, and Return pages.
- **BUG-016** `AddItemPage.tsx`: removed all debug `console.log` / `console.warn` / `console.error` statements from location polling, API response dumps, and mount/unmount handlers.
- **BUG-017** `App.tsx`: `NotFoundPage` no longer renders an inline `<Navigate>` (which silently redirected before the 404 message could appear); replaced with `useEffect` + `setTimeout` 3-second redirect while keeping the 404 UI visible.
- **BUG-018** `frontend/src/types/index.ts`, `mock/data.ts`: added `barcode: string` to `BaseItem` interface and all 13 mock item objects.
- **BUG-019** `ItemDetailPage.tsx`: Temp Exit button is now hidden when `item.status === TEMP_EXIT` (was always visible for non-scrapped items; backend would reject with 409).
- **BUG-020** `OperationsPages.tsx`: `MOCK_CONTAINER_OPTIONS` now derived from imported `MOCK_CONTAINERS` instead of a hardcoded array; all 6 containers (BOX-0001 – BOX-0006) are included with correct IDs.

### Not fixed (backend scope — deferred)
- BUG-001 (auth dev fallback in non-dev environments), BUG-005 (no RECEIPT on item creation), BUG-008 (Move allows empty destination), BUG-009 (Receipt allows no location), BUG-011 (barcode silently set to labIdNumber)

---

## [2026-03-25] — Backend Bug Fixes (Security, Audit Trail, Validation)

### Fixed

- **BUG-001** `backend/src/plugins/auth.ts`: Dev auth fallback (seeded `mzlatanov` user) now only activates when `NODE_ENV === "development"`. Previously any unauthenticated request silently succeeded as ADMIN in all environments.
- **BUG-005** `backend/src/routes/items.ts`: All five item creation handlers (`/items/electronics`, `/fixture`, `/sparepart`, `/consumable`, `/misc`) now create a `RECEIPT` `OperationRecord` inside the same `$transaction` as `item.create` when a `locationId`, `containerId`, or `externalLocationId` is supplied. Previously every newly created item had an empty audit trail.
- **BUG-008** `backend/src/routes/operations.ts`: `MoveBody` now requires at least one of `toLocationId` or `toContainerId` via `.refine()`. Previously a Move with no destination silently set the item's location to `null`.
- **BUG-009** `backend/src/routes/operations.ts`: `ReceiptBody` now requires at least one of `locationId` or `containerId` via `.refine()`. Previously a Receipt with no location was accepted, leaving items untracked.
- **BUG-010** `backend/src/routes/items.ts`: `labIdNumber` added to `UpdateItemBody` schema. Previously the field was silently ignored on `PATCH /items/:id` even though the edit form sent it.

---

## [2026-03-25] — Edit Item Functionality

### Added
- `frontend/src/pages/items/AddItemPage.tsx`: new `EditItemPage` component that loads an existing item, pre-populates all type-specific fields, and saves via `PATCH /items/:id` (`updateItem`)
- `frontend/src/App.tsx`: route `/items/:id/edit` registered, pointing to `EditItemPage`
- `frontend/src/pages/items/ItemDetailPage.tsx`: **Edit** button added to the header action bar (visible for all non-scrapped items); links to `/items/:id/edit`

### Changed
- `AddItemPage.tsx` imports extended with `ItemType`, `AnyItem`, `ElectronicsSample`, `Fixture`, `SparePart`, `Consumable`, `MiscItem` types and `getItem`, `updateItem` API calls
- Edit form reuses all existing form sub-components (`ElectronicsForm`, `FixtureForm`, `SparePartForm`, `ConsumableForm`, `MiscForm`) — no duplication
- Location assignment is intentionally excluded from the edit form; location changes must go through the Move operation

---

## [2026-03-24] — Location Dropdown Auto-Refresh During Admin Edits

### Fixed
- `frontend/src/pages/items/AddItemPage.tsx`: location dropdown now auto-refreshes every 5 seconds via `getLocationsFlat()` to immediately reflect newly created locations from Admin Locations Config page (no page reload required)
- `frontend/src/pages/operations/OperationsPages.tsx`: `useLocations()` hook updated with same 5-second auto-refresh strategy; all operations (Receipt, Move, Exit, Return) now show new locations without page reload
- `frontend/N.Mitev/src/pages/items/AddItemPage.tsx` and `frontend/N.Mitev/src/pages/operations/OperationsPages.tsx`: applied same fixes to secondary frontend variant
- **Issue:** When a new location was created in Admin Locations Config, it did not appear in AddItemPage or OperationsPages dropdowns until the user refreshed the browser
- **Solution:** Client-side polling every 5 seconds ensures dropdowns stay in sync with backend data without user intervention

### Decided
- [Decision ADC-11](DECISIONS.md#2026-03-24--location-dropdown-auto-refresh-polling): Implement 5-second client-side polling for location dropdowns during admin workflow

---

## [2026-03-24] — Dynamic Location Hierarchy & Pleven Site Added

### Added
- `frontend/src/mock/data.ts`: new Pleven site (s4) with Main Storage building, storage areas A & B, and 5 locations (l14–l18)

### Fixed
- `frontend/src/pages/items/AddItemPage.tsx`: replaced hardcoded MOCK_LOCATION_OPTIONS with dynamic generation from MOCK_SITES; ensures all sites (including newly added ones) appear in location dropdowns
- `frontend/src/pages/operations/OperationsPages.tsx`: same dynamic location generation fix; all operations (Receipt, Move, Exit, Return) now show complete location list
- **Impact:** Pleven location now appears on Add Item and all Operations pages; adding new sites/buildings no longer requires code changes

---

## [2026-03-24] — Admin Route Protection & API Client Fixes

### Added
- `frontend/src/App.tsx`: `AdminRoute` component for role-based route protection (denies non-admin users access to `/admin/*` paths)
- `frontend/src/pages/storage/StoragePages.tsx`: admin-only "Manage Location Hierarchy" CTA in Location Browser, with link to Admin Locations Config page

### Changed
- `frontend/src/App.tsx`: wrapped all four `/admin/*` routes with `<AdminRoute>` guard component  
- Location Browser (LOC-01) UX: admin users now see blue info box with direct link to location hierarchy management
- Project status: moved from "Pre-scaffold phase" to "Backend fully implemented, Frontend integration in progress"

### Fixed
- `frontend/src/api/client.ts` and `frontend/N.Mitev/src/api/client.ts`: treat empty `VITE_API_URL` as unset and correctly fall back to `/api/v1`; this fixes the Items page error banner `Server error (200)` caused by requests going to the frontend HTML route instead of the API
- `backend/src/plugins/auth.ts`: added a non-production fallback user resolution to align local development behavior with the frontend dev-auth bypass and allow protected API routes to load during local testing

### Decided
- [Decision ADC-10](DECISIONS.md#2026-03-24--role-based-route-protection--location-hierarchy-discoverability): Implement role-based route guards at component level with AdminRoute wrapper; admin-only CTA in storage pages for location management discovery

### Planned
- Hardware label printing integration (Zebra/Citizen/Brother drivers)
- Barcode scan input handling (web + Android terminals)  
- Complete form validation + error handling on Operations pages
- Performance optimization + bundle size reduction

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
