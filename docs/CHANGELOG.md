# Changelog

> All notable changes, milestones, and completions are recorded here.
> Format follows [Keep a Changelog](https://keepachangelog.com) conventions.
> Versions use `YYYY-MM-DD` until a formal versioning scheme is adopted.

---

## [2026-04-01]

### Fixed
- **`prisma` CLI missing in production Docker image** (`backend/package.json`): Moved `prisma` from `devDependencies` to `dependencies` so it is included when the runner stage runs `npm ci --omit=dev`. Without it, `npx prisma migrate deploy` at container startup could not find the CLI, causing `P1001: Can't reach database server at postgres:5432`.

### Fixed
- **Prisma OpenSSL error on Alpine Docker** (`backend/Dockerfile`, `backend/prisma/schema.prisma`): Added `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` to the Prisma generator so the correct engine binary is compiled for Alpine (musl libc). Added `RUN apk add --no-cache openssl` to the runner stage so the library is available at runtime. Resolves `Could not parse schema engine response` crash on container startup.

### Fixed
- **Router runtime error on item navigation (`useBlocker` context)** (`frontend/src/App.tsx`): Switched app routing from `BrowserRouter` + `Routes` to React Router Data Router (`createBrowserRouter` + `RouterProvider`). This resolves `useBlocker must be used within a data router` when opening item-related screens with unsaved-changes protection.
- **BUG-037 — Add Item form now validates required fields client-side** (`frontend/src/pages/items/AddItemPage.tsx`): Added `validate()` function in `AddItemPage` that checks all required fields per item type (OEM, product name, part number, lab ID for electronics; manufacturer, model, type, lab ID for spare parts; etc.) before allowing submission. Missing fields are listed in the error banner; the API is never called with an incomplete form.
- **BUG-038 — Unsaved-changes warning added to Add Item and Edit Item forms** (`frontend/src/pages/items/AddItemPage.tsx`): Both `AddItemPage` and `EditItemPage` now use `useBlocker` from React Router v6 to intercept in-app navigation when the form is dirty. A `beforeunload` event handler also blocks browser-native navigation (browser back, tab close). A modal confirmation dialog ("Leave page? / Stay / Leave") is shown when navigation is blocked. The blocker is automatically cleared on successful save.
- **BUG-023/027/028/031/035/036 — All remaining open issues confirmed fixed**: Audited code against each open bug entry. All were already fixed in prior sessions. `saveEdit()` calls PATCH APIs (BUG-023); System Settings save buttons have `onClick` handlers (BUG-027); Export buttons call `downloadCsv()` (BUG-028); Audit log search sends `search` param to API (BUG-031); pagination reads `meta.totalPages` from API (BUG-035); overdue detection uses date-string comparison (BUG-036). BUGS.md open issues section cleared.

### Added
- **Item Operation History page (ITEM-08)** — new standalone page at `/items/:id/history` accessible to all roles.
  - `frontend/src/pages/items/ItemOperationHistoryPage.tsx`: filterable, sortable table of all operations for an item with resizable columns (Date/Time, Operation, Performed By, Details). Shows operation badge, timestamp, performer, and type-specific details (location for MOVE/RECEIPT, external location + expected return for TEMP_EXIT, quantity for CONSUME). Includes CSV export.
  - Operation type dropdown filter (client-side); empty state and loading/error handling.
  - Supports both mock and API modes using the existing `getItem` + `getItemHistory` calls with the same API mapping as `ItemDetailPage`.
  - `frontend/src/App.tsx`: updated route `/items/:id/history` to point to `ItemOperationHistoryPage`.
  - `frontend/src/pages/items/ItemDetailPage.tsx`: "View full history →" link already present in the Operation History card header.

---

## [2026-03-31]

### Fixed
- **Dashboard "Items by Type" widgets now filter the item list** (`frontend/src/pages/items/ItemListPage.tsx`): added `useSearchParams` to read the `?type=` query param on mount and initialize `typeFilter` from it, so clicking a type widget on the dashboard opens the items list pre-filtered to that type.

### Changed
- **UI design refresh — typography, sidebar, dashboard** (`frontend/index.html`, `frontend/tailwind.config.js`, `frontend/src/index.css`, `frontend/src/components/layout/Sidebar.tsx`, `frontend/src/components/layout/Header.tsx`, `frontend/src/components/ui/Card.tsx`, `frontend/src/pages/dashboard/DashboardPage.tsx`):
  - Added **Barlow** (UI font) + **IBM Plex Mono** (data/numbers) via Google Fonts; replaced system-ui
  - **Sidebar active state** changed from full `bg-blue-600` fill to left-border accent (`border-l-2 border-blue-500 bg-blue-500/10 text-blue-300`) — more refined
  - **Sidebar logo** upgraded to gradient background with drop shadow; subtitle colour changed to `blue-500/60`
  - **Header page title** enlarged (`text-lg tracking-tight`); search bar now has a visible border
  - **Dashboard stat cards** each get a contextual icon, stat numbers use `font-mono`, labels use `tracking-widest`
  - **Items-by-type grid** icon containers fixed: were `bg-{color}` (same as parent card, invisible) → now `bg-white/80 shadow-sm`
  - `CardHeader` title uses `tracking-tight` for sharper rendering

### Fixed
- **BUG-023 — Site/building/area rename now works** (`backend/src/routes/sites.ts`, `frontend/src/api/sites.ts`, `frontend/src/pages/admin/AdminPages.tsx`): Added `PATCH /sites/:siteId`, `PATCH /buildings/:buildingId`, `PATCH /areas/:areaId` backend routes with 409 conflict checks. Area rename regenerates all child location labels in a DB transaction (label format `{areaCode}-{row}-{shelf}-{level}`). Frontend `saveEdit()` now calls the API and updates local state; errors surface in the error banner.
- **BUG-011 — Barcode uniqueness fully enforced (Backend)** (`backend/src/routes/items.ts`, `schema.prisma`): Confirmed all item creation endpoints require `barcode` as a non-optional field; 409 conflict check at application layer + `@unique` DB constraint prevent duplicates. Silent fallback to `labIdNumber` does not exist. Bug closed.
- **BUG-026 — External Location form is now functional** (`frontend/src/pages/admin/AdminPages.tsx`): Form inputs are now controlled with state. Save button calls `POST /external-locations`. Also added an Edit modal wired to `PATCH /external-locations/:id`. List loads from API on mount instead of mock data.
- **Backend debug logs removed** (`backend/src/routes/sites.ts`): Removed 12 debug `console.log`/`console.error` statements left in `POST /areas/:areaId/locations` and `GET /locations` handlers.

### Added
- **`docker-compose.dev.yml`** — single-command dev stack with auth fully bypassed: `DEV_AUTH=true` on backend (skips LDAP, accepts any credentials, auto-creates ADMIN user), `VITE_DEV_AUTO_LOGIN=true` on frontend (skips login form entirely). Run with `docker compose -f docker-compose.dev.yml up --build`.
- **Frontend Dockerfile** — added `ARG`/`ENV` support for `VITE_DEV_AUTO_LOGIN`, `VITE_DEV_USERNAME`, `VITE_DEV_PASSWORD` so Vite bakes them into the bundle at build time.

### Added
- **QA audit — 16 new defects logged** (`docs/BUGS.md`):
  - BUG-023: Edit site/building/area saves nothing — `saveEdit()` is a no-op stub (AdminPages.tsx:420–424)
  - BUG-024: Delete site only removes from UI state, never calls API (AdminPages.tsx:559–562)
  - BUG-025: "Invite User" button has no onClick handler (AdminPages.tsx:149–153)
  - BUG-026: External Location "Save" button is a stub — no API call made (AdminPages.tsx:1083–1124)
  - BUG-027: All three System Settings save buttons (LDAP, Printer, Alerts) are stubs (AdminPages.tsx:1173/1211/1233)
  - BUG-028: All four Export CSV/Export buttons in Reports have no onClick handler (ReportsPages.tsx)
  - BUG-029: Corrupted HTML in Move page Cancel link — JS expression embedded in className (OperationsPages.tsx:502)
  - BUG-030: Cancel buttons on operation pages redirect to `/` instead of going back
  - BUG-031: Audit log search only filters loaded records client-side; does not query API
  - BUG-032: 5 debug `console.log` statements left in `doAddLocation()` (AdminPages.tsx:485–499)
  - BUG-033: Return operation allows submission without a return location selected
  - BUG-034: Item fetch errors in operation search flow are silently swallowed (`.catch(() => {})`)
  - BUG-035: Pagination total-page count calculated differently in mock vs. API mode
  - BUG-036: Overdue detection uses timestamp comparison instead of calendar-date comparison
  - BUG-037: Add Item form has no client-side required-field validation before API submission
  - BUG-038: Add Item / Edit Item forms have no unsaved-changes warning on navigation

- **Item list pagination** — `ItemListPage` now paginates at 50 items/page with Prev/Next controls and "Showing X–Y of Z items" footer.
  - `frontend/src/pages/items/ItemListPage.tsx`: added `page`/`totalPages` state, `PAGE_SIZE = 50` constant, `pagedItems` memo for mock-mode client-side slicing, `handleSearch`/`handleTypeFilter`/`handleStatusFilter` wrappers that reset page to 1 on filter change, and pagination footer with ChevronLeft/ChevronRight buttons.
  - Real API path passes `page` and `pageSize: 50` to `GET /items`; backend already supported `page`/`pageSize`/`totalPages` in its response meta.

### Changed
- **PostgreSQL data volume** — changed from a named Docker volume (`postgres_data`) to a host bind-mount at `/var/storage` so data persists at a known, stable path that survives Kubernetes pod/container restarts and node rescheduling.
  - `docker-compose.yml`: `postgres_data:/var/lib/postgresql/data` → `/var/storage:/var/lib/postgresql/data`; removed the `volumes:` named-volume declaration at the bottom of the file.
  - **Pre-condition:** the directory `/var/storage` must exist on the host with correct ownership (`chown 999:999 /var/storage` for the `postgres` user inside the container) before `docker compose up`.


### Added
- **Site deletion** — Sites can now be deleted from the Location Config page.
  - `frontend/src/pages/admin/AdminPages.tsx`: Added delete button (trash icon) next to each site name with inline confirmation dialog.
  - Delete button only appears when site is not being edited.

### Fixed
- **Delete location/area/building requests** — error "Body cannot be empty when content-type is set to 'application/json'".
  - `frontend/src/api/client.ts`: Fixed `apiFetch` function to only set `Content-Type: application/json` header when request has a body.
  - DELETE requests without body no longer send the `Content-Type` header, preventing middleware validation errors.
- **Deleted locations reappearing after page refresh** — hierarchy could be repopulated from stale GET cache/local optimistic state.
  - `frontend/src/api/client.ts`: `apiFetch` now forces `cache: 'no-store'` for GET requests by default, so location hierarchy always reloads from fresh backend state.
  - `frontend/src/pages/admin/AdminPages.tsx`: `LocationConfigPage` now reloads the full `/sites/tree` from backend after deleting location/area/building, ensuring the UI matches persisted data immediately.
- **Delete in Location Config not persisted for site-level entries** — site deletion was UI-only and always came back after refresh.
  - `backend/src/routes/sites.ts`: Added `DELETE /sites/:siteId` with Admin auth, same safety checks as lower-level deletes (blocks on active `IN_STORAGE` items and containers), and cascading deletion of child locations/areas/buildings.
  - `frontend/src/api/sites.ts` + `frontend/src/api/index.ts`: Added/exported `deleteSite` API function.
  - `frontend/src/pages/admin/AdminPages.tsx`: `handleDeleteSite` now calls backend `deleteSite` and reloads hierarchy from `/sites/tree` instead of local-only state mutation.
- **Delete building icon visibility** — trash icon was too light to see in LocationConfigPage.
  - `frontend/src/pages/admin/AdminPages.tsx`: Changed color of delete icon from `text-slate-300` to `text-slate-400` for better visibility.
- **Move Item operation** — form was allowing submission without required destination, causing backend validation errors.
  - `frontend/src/pages/operations/OperationsPages.tsx`: `MovePage` component updated:
    - Submit button now disabled until both item AND at least one destination (location or container) are selected.
    - Added client-side validation in `handleSubmit` to check at least one destination is selected, shows error if not.
    - Updated labels to clarify both location and container are optional but at least one must be selected.
    - Changed placeholder text from "Select destination" to "Select location" and "Select container" respectively.
    - Added helper text: "Select at least one destination (location or container)".

### Added
- **Password management** — users can now set and change local passwords.
  - `backend/prisma/schema.prisma`: Added nullable `passwordHash String?` to `User` model. Stores scrypt-derived hash (`hash:salt`, hex-encoded). LDAP users may never have this set.
  - `backend/prisma/migrations/20260331000000_add_password_hash/migration.sql`: Migration to `ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT`.
  - `backend/src/routes/users.ts`: Added `PATCH /users/:id/password` endpoint.
    - **Admin**: can set any user's password without providing a current password.
    - **Any authenticated user**: can change their own password; must provide `currentPassword` for verification. Returns 400 if no local password has been set yet (admin must set one first).
    - Minimum 8 characters, max 128.
  - `backend/src/routes/auth.ts`: Login now falls back to local password when LDAP is unavailable. If LDAP throws, the backend checks whether the user has a stored `passwordHash` and verifies it. This supports manually-created accounts that are not in Active Directory.
  - `frontend/src/api/users.ts`: Added `setUserPassword(id, newPassword)` and `changeMyPassword(id, currentPassword, newPassword)`.
  - `frontend/src/api/index.ts`: Exported new functions + `PasswordResponse` type.
  - `frontend/src/pages/admin/AdminPages.tsx`: Added **"Pwd" button** in the Actions column of the Users table. Opens a modal to set the password for any user (Admin only, no current password required). Shows success state and auto-closes.
  - `frontend/src/components/layout/Header.tsx`: Added **user avatar dropdown** visible to all authenticated users (top-right of header). Shows display name, role, and two actions: **Change Password** (opens modal requiring current + new password) and **Sign Out**. The "Change Password" flow calls the backend with `currentPassword` for verification.

### Fixed
- `frontend/src/context/AuthContext.tsx`: Dev auto-login no longer drops to the login page when a JWT session expires. The `auth:session-expired` handler now re-triggers `authApi.login(DEV_USERNAME, DEV_PASSWORD)` instead of just clearing user state — the auto-login `useEffect` has empty deps so it only runs once at mount and wouldn't re-run after expiry.

- `backend/src/routes/sites.ts`: DELETE endpoints for locations, areas, and buildings.
  - `DELETE /locations/:locationId` — blocks if any `IN_STORAGE` items or containers are at the location.
  - `DELETE /areas/:areaId` — blocks if any active items or containers exist in any location within the area; cascades deletion of all child locations.
  - `DELETE /buildings/:buildingId` — blocks if any active items or containers exist anywhere in the building; cascades deletion of all locations and areas.
  - All three return `409 Conflict` with a human-readable count ("Cannot delete: 3 items stored at this location").
  - All require Admin role.
- `frontend/src/api/sites.ts`: Added `deleteLocation`, `deleteArea`, `deleteBuilding` API functions (use `apiDelete`).
- `frontend/src/api/index.ts`: Exported the three new delete functions.
- `frontend/src/pages/admin/AdminPages.tsx`: Delete buttons with inline confirmation in `LocationConfigPage`.
  - Trash icon on each location row, area chip, and building header (visible to Admin only, which is the entire page).
  - Clicking shows an inline "Delete X?" prompt with **Delete** / **Cancel** buttons — no full-page modal needed.
  - On 409 error the message from the backend (e.g. "Cannot delete: 2 items stored in this area") is shown inline next to the buttons.
  - On success the deleted entity is removed from local state immediately.

### Changed
- `frontend/src/pages/items/AddItemPage.tsx`: Redesigned Electronics, Spare Part, and Consumable forms to use compact inline label layout.
  - Added `InlineField` component (renders as fragment → two direct grid children: label + content div).
  - Added `INLINE_GRID` constant: `grid-cols-[max-content_1fr]` on mobile, `grid-cols-[max-content_1fr_max-content_1fr]` on desktop (4-col).
  - Fields now appear as `[label] [input] [label] [input]` per row — same data-table density as ItemListPage.
  - Comment textarea uses `wide` + `alignTop` props to span full remaining width with top-aligned label.
  - Electronics: 11 fields now fit in 6 rows instead of ~11. Spare Part: 7 fields in 4 rows. Consumable: 10 fields in 6 rows.
  - Fixture and Misc forms unchanged (not requested).

### Fixed
- `frontend/src/api/client.ts` + `frontend/src/context/AuthContext.tsx`: Session expiry now correctly redirects to login.
  - When a 401 response can't be refreshed, `client.ts` now dispatches `auth:session-expired` on `window` before throwing.
  - `AuthContext` listens for this event and clears `user` state, which causes `ProtectedRoute` to redirect to `/login`.
  - Previously, tokens were cleared but the user remained "authenticated" in context, so the session expired error was shown in-page with no redirect.
- `frontend/src/pages/items/AddItemPage.tsx`: Removed horizontal scrollbars from all Comment textareas.
  - Added `overflow-x-hidden` to every textarea's className (5 occurrences across all form types).
  - Root cause: textarea intrinsic min-width could exceed the grid column width, causing browser to render a horizontal scrollbar.

### Decided
- **Dev Auth Bypass — Active for Frontend Integration Phase**
  - Keep `DEV_AUTH=true` (backend) and `VITE_DEV_AUTO_LOGIN=true` (frontend) enabled during development/integration phase.
  - Rationale: Rapid frontend development iteration without LDAP or manual login on every page reload.
  - Status: ✅ Active — bypass is fully functional with auto-login as `admin`/`admin`.
  - When to disable: Before production deployment, remove both env flags. See [DECISIONS.md](DECISIONS.md#2026-03-31--dev-auth-bypass--active-for-frontend-integration-phase).

---

## [2026-03-31] — Forms & Cards: Condensed Padding Across All Pages

### Changed
- `frontend/src/pages/items/AddItemPage.tsx` / `EditItemPage`: Reduced all form density.
  - `inputClass`: `py-2.5` → `py-1.5` on all text/select/textarea inputs.
  - `FormField` label: `mb-1.5` → `mb-1`.
  - All form grid gaps: `gap-5` → `gap-3`.
  - Page and form wrappers: `space-y-5` → `space-y-3`.
  - Card content areas: `p-5` → `p-4`; storage location section `gap-5` → `gap-3`.
  - Read-only Lab ID input in EditItemPage: `py-2.5` → `py-1.5`.
  - Action buttons: `px-5 py-2` / `px-4 py-2` → `px-4 py-1.5` / `px-3 py-1.5`.
- `frontend/src/pages/operations/OperationsPages.tsx`: Condensed all operation forms.
  - `inputClass`: `py-2.5` → `py-1.5`.
  - All field labels: `mb-1.5` → `mb-1`.
  - StepHeader margin: `mb-6` → `mb-3`.
  - Item search result rows: `px-4 py-3` → `px-3 py-2`.
  - Page wrappers: `space-y-5` → `space-y-3`.
  - Card form containers: `p-5 space-y-4` → `p-4 space-y-3`; all inline `space-y-4` → `space-y-3`.
  - Confirmation/warning boxes: `p-4` → `p-3`.
  - Action button rows: `pt-2` → `pt-1`; buttons `px-5 py-2` / `px-4 py-2` → `px-4 py-1.5` / `px-3 py-1.5`.
- `frontend/src/pages/items/ItemDetailPage.tsx`: Tightened detail view.
  - Page wrapper: `space-y-5` → `space-y-3`.
  - Header card: `p-5` → `p-4`; location bar `mt-4 pt-4` → `mt-3 pt-3`.
  - Two-column grid: `gap-5` → `gap-4`.
  - Item Details body: `p-5 gap-x-6 gap-y-4` → `p-4 gap-x-4 gap-y-2.5`.
  - Footer metadata row: `pt-4 gap-4` → `pt-3 gap-3`.
  - Operation History body: `p-5` → `p-4`; timeline `space-y-4` → `space-y-3`.
  - Header action buttons: `px-3 py-1.5` → `px-2.5 py-1` for all 6 action buttons.
- `frontend/src/pages/storage/StoragePages.tsx`: Condensed storage browsing.
  - Admin banner: `p-4` → `p-3`.
  - Tree panel rows (Sites, Buildings, Areas): `px-4 py-3` → `px-3 py-2`.
  - Location grid (area view): container `p-4` → `p-3`; location buttons `p-4` → `p-3`.
  - Items-at-location links: `py-3` → `py-2`.
  - Container cards: `p-4` → `p-3`; icon `w-9 h-9` → `w-8 h-8`; icon size `18` → `15`.
  - External location cards: body and footer both `p-4` → `p-3`.
  - Page wrappers: `space-y-5` → `space-y-4`.

---

## [2026-03-30] — All Tables: Dense View, No Word Wrap & Resizable Columns

### Changed
- `frontend/src/pages/reports/ReportsPages.tsx`: Applied condensed table treatment to all 3 report tables.
  - **ExternalReportPage** (5 cols): Lab ID 90 / Type 110 / External Location 200 / Expected Return 130 / Status 90px defaults.
  - **ExpiryReportPage** (7 cols): Lab ID 90 / Type 160 / Quantity 90 / Lot# 110 / Expiry Date 110 / Days Left 80 / Location 140px defaults.
  - **AuditLogPage** (5 cols): Date/Time 130 / Operation 100 / Item 90 / Performed by 130 / Details 280px defaults.
  - All cells: `px-3 py-1 overflow-hidden whitespace-nowrap` — single-line rows, hard clip at column edge.
  - All headers: `px-3 py-1.5` with drag-to-resize handle (60px minimum per column).
  - `table-layout: fixed` + `<colgroup>` on every table; `useRef` + `useEffect` resize logic per component.
- `frontend/src/pages/admin/AdminPages.tsx`: Applied same treatment to `UserManagementPage` table.
  - 5 cols: User 200 / Role 100 / Site 130 / Status 90 / Actions 160px defaults.
  - Avatar reduced from 8×8 to 6×6 to fit condensed row height; button padding tightened to `py-0.5`.

---

## [2026-03-30] — Item List UI: Dense View & Resizable Columns

### Changed
- `frontend/src/pages/items/ItemListPage.tsx`: Redesigned table for higher information density and usability.
  - Reduced all padding (toolbar controls `py-2` → `py-1`, row cells `py-3.5` → `py-1`, header `py-3` → `py-1.5`, overall spacing `space-y-4` → `space-y-2`).
  - Columns are now resizable via drag handles on each header's right edge; widths stored in component state with a 60px minimum. Default widths: Lab ID 100px, Type 120px, Name 260px, Status 110px, Location 150px, Updated 100px.
  - Table uses `table-layout: fixed` with a `<colgroup>` so column widths are respected exactly.
  - All cells use `overflow: hidden` + `whitespace: nowrap` — text is clipped at the column boundary with no word wrap.
  - Removed `max-w-xs truncate` from the Name cell (width is now controlled by the column, not a Tailwind max-width class).

---

## [2026-03-30] — Dev Auth Bypass & Auto-Login

### Changed
- `backend/src/routes/auth.ts`: LDAP call is now conditional on `DEV_AUTH != "true"`. When `DEV_AUTH=true`, any password is accepted; user is looked up by username in the DB or auto-created with `ADMIN` role. LDAP library is only imported dynamically when actually needed (production mode).
- `frontend/src/context/AuthContext.tsx`: Restored real JWT auth flow (replaced previous dev no-op). Added dev auto-login: when `VITE_DEV_AUTO_LOGIN=true`, the app silently calls `/auth/login` on mount with dev credentials and skips the login page entirely. Existing session from `localStorage` is reused on refresh.
- `backend/.env`: Added `DEV_AUTH=true` flag.
- `frontend/.env`: Added `VITE_DEV_AUTO_LOGIN=true`, `VITE_DEV_USERNAME=admin`, `VITE_DEV_PASSWORD=admin` flags.

### Fixed
- "Session expired" error on every page load caused by `AuthContext` being in a no-op dev bypass while `VITE_USE_MOCKS=false` — API calls had no JWT token, backend returned 401 on every request.
- Item list (and all other pages) showing empty/error state for the same reason.

### Decided
- [Decision ADC-12](DECISIONS.md#2026-03-30--dev-auth-bypass-strategy): Environment-flag-gated dev auth bypass on both backend and frontend; disabled by removing flags for production.

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
