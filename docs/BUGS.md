# Bug Report — Lab Storage Manager

> Updated: 2026-04-15
> Scope: Frontend + Backend

---

## Open Issues

### BUG-013: PATCH rename endpoints for sites, buildings, and areas are documented but not implemented

- **Severity:** Medium
- **Area:** Backend
- **Files:** `backend/src/routes/sites.ts` (missing endpoints); `docs/API.md` lines 47, 54, 58
- **Description:** `docs/API.md` documents three PATCH endpoints: `PATCH /sites/:id` (rename site), `PATCH /buildings/:id` (rename building), and `PATCH /areas/:id` (rename area with cascade to child location labels). None of these endpoints exist in `sites.ts`. The file only implements POST (create) and DELETE for each resource. Renaming an area is also expected to cascade label updates to all child locations (e.g., area code "A" → "B" should rename all location labels from "A-01-02-5" to "B-01-02-5").
- **Domain Impact:** Admins cannot correct mistakes made during initial site/building/area setup. If a site, building, or area is created with a wrong name or code, it is permanent. The cascade rename requirement for areas means all child location labels would also remain wrong.
- **Status:** Open

---

### BUG-014: ItemSearchBox in operation pages returns scrapped and depleted items with no visual indicator

- **Severity:** Medium
- **Area:** Frontend
- **Files:** `frontend/src/pages/operations/OperationsPages.tsx:159-221`
- **Description:** The `ItemSearchBox` component calls `getItems({ search: query, pageSize: 8 })` with no status filter. Search results include items with `SCRAPPED` and `DEPLETED` status. While the result card does render a status badge, there is no visual dimming, strikethrough, or "ineligible" label. Selecting a scrapped item in the Move, Exit, Return, or Scrap flow will proceed to the form and only fail at the backend — wasting the operator's time and generating a confusing error message.
- **Domain Impact:** In a fast-paced lab environment with a barcode scanner, operators expect the system to immediately indicate if a scanned item cannot be processed. Having to attempt an operation and receive a backend error is a poor experience that slows warehouse throughput.
- **Status:** Open

---

## Closed Issues

### BUG-001: CONSUME operation does not block items in TEMP_EXIT status

- **Severity:** Critical | **Area:** Backend
- **Fixed:** 2026-04-15 — Added `TEMP_EXIT` status check before the CONSUME operation in `backend/src/routes/operations.ts`. Returns 409 with "Item is currently at an external location — record a return before consuming."

### BUG-002: Return operation allows returning item with no destination

- **Severity:** Critical | **Area:** Backend
- **Fixed:** 2026-04-15 — Added `.refine()` to `ReturnBody` Zod schema requiring at least one of `toLocationId` or `toContainerId`, matching the pattern already used by `ReceiptBody` and `MoveBody`.

### BUG-003: Receipt operation allows re-receiving a DEPLETED consumable

- **Severity:** Critical | **Area:** Backend
- **Fixed:** 2026-04-15 — Added `DEPLETED` status check to the RECEIPT handler in `backend/src/routes/operations.ts`. Returns 409 with "Cannot re-receive a depleted consumable — create a new item for new stock."

### BUG-004: Move operation does not update `storageAreaId`

- **Severity:** Critical | **Area:** Backend
- **Closed as Invalid:** 2026-04-15 — The `Item` model has no `storageAreaId` column in the Prisma schema. The "By Location" report derives the area hierarchy entirely through `StorageLocation.storageAreaId`, not from any field on the `Item` record itself. The MOVE handler correctly updates `locationId` and `containerId`; reports resolve the area through the location relation.

### BUG-005: Expiry report `includeExpired` filter is a no-op

- **Severity:** High | **Area:** Backend
- **Fixed:** 2026-04-15 — Changed `{ gte: undefined }` to `{ gte: now }` in the expiry report Prisma query in `backend/src/routes/reports.ts`. Prisma ignores `undefined` values so the filter was previously non-functional.

### BUG-006: ConsumePage dropdown includes consumables in TEMP_EXIT status

- **Severity:** High | **Area:** Frontend
- **Fixed:** 2026-04-15 — Added `i.status !== ItemStatus.TEMP_EXIT` filter alongside the existing `DEPLETED` filter in `ConsumePage` (`frontend/src/pages/operations/OperationsPages.tsx`), for both the mock and API data paths.

### BUG-007: Expiry report table missing "Unit" column

- **Severity:** High | **Area:** Frontend
- **Fixed:** 2026-04-15 — Added `'Unit'` to the table header array, added a 70px column to `colWidths`, and split each table row's Quantity cell into separate Quantity and Unit cells in `frontend/src/pages/reports/ReportsPages.tsx`. Table now matches the 8-column CSV export.

### BUG-008: Dashboard "Recent Ops" card subtitle says "this week"

- **Severity:** High | **Area:** Frontend
- **Fixed:** 2026-04-15 — Changed subtitle text from "this week" to "last 6 operations" in `frontend/src/pages/dashboard/DashboardPage.tsx`. The card shows the last 6 operations regardless of date; the label now accurately reflects that.

### BUG-009: Scrap operation allowed on TEMP_EXIT items

- **Severity:** High | **Area:** Backend
- **Fixed:** 2026-04-15 — Added `TEMP_EXIT` status check to the SCRAP handler in `backend/src/routes/operations.ts`. Returns 409 with "Item is currently at an external location — record a return before scrapping."

### BUG-010: ReceiptPage Step 2 — Location required but step can be advanced without selecting one

- **Severity:** High | **Area:** Frontend
- **Fixed:** 2026-04-15 — Added `|| (step === 2 && !locationId && !containerId)` to the submit button's `disabled` prop in `frontend/src/pages/operations/OperationsPages.tsx`. The "Continue →" button is now disabled when on step 2 and neither location nor container has been selected.

### BUG-011: ExitPage does not display selected item details

- **Severity:** High | **Area:** Frontend
- **Fixed:** 2026-04-15 — Added `selectedItem` state and a `handleSelectItem` function (matching the `MovePage` pattern) to `ExitPage` in `frontend/src/pages/operations/OperationsPages.tsx`. After selecting an item, a detail card showing lab ID, type badge, status badge, and current location is rendered. The submit button is now gated on `!selectedItem`.

### BUG-012: ScrapPage shows no warning when scrapping a DEPLETED consumable

- **Severity:** High | **Area:** Frontend
- **Fixed:** 2026-04-15 — Added an amber warning banner in `ScrapPage` (`frontend/src/pages/operations/OperationsPages.tsx`) that renders when `selectedItem.status === ItemStatus.DEPLETED`, informing the operator they are scrapping an empty container or spent material.

### BUG-015: Mock data — container `c5` has both `externalLocationId` and `storageAreaId` set

- **Severity:** Medium | **Area:** Frontend (mock data)
- **Fixed:** 2026-04-15 — Removed `storageAreaId` and `storageAreaCode` from container `c5` in `frontend/src/mock/data.ts`. A container at an external location must not have a storage area assigned.
