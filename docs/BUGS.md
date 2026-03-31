# Bug Report — Lab Storage Manager

> Updated: 2026-03-31
> Scope: Frontend + Backend

---

## Open Issues

### BUG-023 — Edit site / building / area saves nothing

**Status:** Open — backend endpoints now implemented; frontend wiring still missing
**Scope:** Frontend (`pages/admin/AdminPages.tsx`, line 420–424)
**Severity:** Critical — core admin functionality silently broken

**Description:** The inline edit flow for sites, buildings, and storage areas shows an editable input and a "Save" button. When saved, `saveEdit()` resets the edit state but makes no API call — the change is discarded silently. A comment at line 423 reads: `// Note: Edit functionality disabled until backend PUT endpoints are implemented`.

**Steps to reproduce:**
1. Go to Admin → Location Config.
2. Click the pencil icon on any site, building, or area.
3. Change the name and click Save.
4. Observe: the UI reverts to the original name. No error, no success feedback.

**Backend endpoints (now available):**
- `PATCH /sites/:id` — `{ name: string }`
- `PATCH /buildings/:id` — `{ name: string }`
- `PATCH /areas/:id` — `{ code: string }` (also cascades label updates to all child locations)

**Remaining work:** Wire `saveEdit()` in `AdminPages.tsx` to call the appropriate PATCH endpoint, then update local state on success.

---

### BUG-027 — System Settings save buttons are all stubs

**Status:** Open
**Scope:** Frontend (`pages/admin/AdminPages.tsx`, lines 1173, 1211, 1233)
**Severity:** High — no system configuration can be saved

**Description:** Three configuration sections on the System Settings page (LDAP Config, Printer Config, Alert Thresholds) each have a "Save" button with no `onClick` handler. None of them submit data anywhere.

**Affected buttons:**
- "Save LDAP Config" (line 1173)
- "Save Printer Config" (line 1211)
- "Save Alert Thresholds" (line 1233)

**Expected:** Each button submits the corresponding form to the appropriate backend endpoint.
**Actual:** Buttons are completely inert.

---

### BUG-028 — Export CSV buttons have no handler

**Status:** Open
**Scope:** Frontend (`pages/reports/ReportsPages.tsx`, lines 86–89, 234–237, 426–429, 607–610)
**Severity:** High — report data cannot be exported

**Description:** All four report pages (Items by Location, External/Overdue, Consumables Expiry, Audit Log) display an "Export CSV" / "Export" button with no `onClick` handler. Clicking exports nothing.

**Expected:** Triggers a CSV download of the currently filtered/loaded report data.
**Actual:** No response on click.

---

### BUG-031 — Audit log search only filters already-loaded records

**Status:** Open
**Scope:** Frontend (`pages/reports/ReportsPages.tsx`, `AuditLogPage`)
**Severity:** Medium — search returns incomplete results for large datasets

**Description:** The search input in the Audit Log filters the currently loaded page of records client-side. It does not trigger a new API request with the search term as a query parameter. On a large dataset where results are paginated, most matching records will not appear in search results.

**Expected:** Search input triggers `GET /operations?search=…` to filter server-side across all records.
**Actual:** Only filters the records already in memory for the current page.

---

### BUG-035 — Pagination count calculated differently in mock vs. API mode

**Status:** Open
**Scope:** Frontend (`pages/items/ItemListPage.tsx`)
**Severity:** Medium — incorrect total page count displayed in API mode

**Description:** In mock mode, total pages are calculated client-side from the filtered array length. In API mode, the backend returns `meta.totalPages` but the code may recalculate based on `meta.total` and a local `perPage` constant, which can diverge if the backend uses a different page size.

**Expected:** Total page count always read from `meta.totalPages` returned by the API.
**Actual:** Potential mismatch between displayed page count and actual pages available.

---

### BUG-036 — Overdue detection compares timestamps instead of calendar dates

**Status:** Open
**Scope:** Frontend (DashboardPage, StoragePages, ReportsPages — multiple locations)
**Severity:** Low — overdue items appear correctly but the boundary condition is off by up to 24 hours

**Description:** Overdue items are detected with `new Date(item.expectedReturnDate) < new Date()`. `expectedReturnDate` is stored as a date string (e.g., `2026-03-31`). Parsing it with `new Date()` produces midnight UTC. If the server is in a different timezone, an item due "today" may show as overdue in the morning or not overdue at night.

**Expected:** Comparison truncated to date only (e.g., compare `YYYY-MM-DD` strings directly, or use `startOfDay` equivalent).
**Actual:** Timestamp comparison causes timezone-dependent false positives/negatives at day boundaries.

---

### BUG-037 — "Add Item" form missing client-side required-field validation before API submission

**Status:** Open
**Scope:** Frontend (`pages/items/AddItemPage.tsx`)
**Severity:** Low — UX degradation; user gets an API error instead of inline validation

**Description:** Required fields (e.g., OEM, part number, lab ID for Electronics; manufacturer/model for Spare Part) are not validated client-side before the form is submitted. If a required field is empty, the backend rejects the request and the user sees a generic API error rather than an inline field-level validation message.

**Expected:** Required fields highlighted in red before form submission, with a message such as "This field is required".
**Actual:** Empty required fields cause an API error that surfaces as a top-level error banner.

---

### BUG-038 — "Add Item" and edit forms have no unsaved-changes warning on navigation

**Status:** Open
**Scope:** Frontend (`pages/items/AddItemPage.tsx`, `pages/items/EditItemPage.tsx`)
**Severity:** Low — accidental data loss possible

**Description:** If a user has partially filled a multi-step item form and clicks a sidebar link or browser Back, the form data is lost without any confirmation prompt.

**Expected:** A browser `beforeunload` dialog or React Router `useBlocker` prompt asks "Leave page? Your changes will be lost."
**Actual:** Navigation proceeds immediately and all entered data is discarded.

---

## Resolved Issues

All previously reported bugs (BUG-001 through BUG-020, excluding BUG-011) have been fixed. See [CHANGELOG.md](CHANGELOG.md) for details.

### BUG-023 — Edit site / building / area saves nothing *(Fixed 2026-03-31)*

**Fix:** Added `PATCH /sites/:siteId`, `PATCH /buildings/:buildingId`, `PATCH /areas/:areaId` backend routes. Area rename regenerates child location labels in a DB transaction. Frontend `saveEdit()` now calls the API; errors surface in the error banner.

### BUG-024 — Delete site only removes from UI state *(Fixed — already in code)*

**Fix:** `handleDeleteSite()` calls `deleteSite(siteId)` API and reloads the tree. Same for buildings and areas.

### BUG-025 — "Invite User" button has no action *(Fixed — already in code)*

**Fix:** Button calls `openInvite()` which opens a full modal wired to `POST /users`.

### BUG-026 — External Location "Save" button is a stub *(Fixed 2026-03-31)*

**Fix:** Form is now controlled with state. Save calls `POST /external-locations`. Edit button opens a modal wired to `PATCH /external-locations/:id`. List loads from API on mount.

### BUG-029 — Corrupted HTML in Move page Cancel link *(Fixed — already in code)*

**Fix:** Cancel button uses `onClick={() => navigate(-1)}` with correct `className`.

### BUG-030 — Cancel buttons redirect to `/` instead of going back *(Fixed — already in code)*

**Fix:** All Cancel buttons on operation pages use `navigate(-1)`.

### BUG-032 — Debug console.log in location creation *(Fixed — already in code)*

**Fix:** All console.log / console.error calls removed from `doAddLocation()`.

### BUG-033 — Return allows submission without location *(Fixed — already in code)*

**Fix:** Submit button disabled unless both item and `returnLocationId` are set.

### BUG-034 — Item fetch errors silently discarded *(Fixed — already in code)*

**Fix:** `.catch()` now clears `selectedItemId` and sets an error message.

### BUG-011 — Barcode silently set to labIdNumber *(Fixed — strategy resolved)*

**Scope:** Backend (`routes/items.ts`, `schema.prisma`)
**Fix:** All create schemas require `barcode` as a non-optional field (`z.string().min(1).max(100)`). A 409 conflict check at the application layer and a `@unique` constraint at the DB level together prevent duplicate barcodes. The silent fallback to `labIdNumber` no longer exists. Strategy: user-supplied, required, DB-enforced unique.

---

### BUG-022 — Dev auto-login redirected to login page on JWT expiry *(Fixed 2026-03-31)*

**Scope:** Frontend (`context/AuthContext.tsx`)
**Fix:** The `auth:session-expired` handler now checks `DEV_AUTO_LOGIN` and re-calls `authApi.login()` instead of just clearing user state. The initial auto-login `useEffect` has empty deps so it only fires at mount — it would not re-run after expiry, leaving the user on the login screen in dev mode.

### BUG-021 — Session expiry showed error in-page instead of redirecting to login *(Fixed 2026-03-31)*

**Scope:** Frontend (`api/client.ts`, `context/AuthContext.tsx`)
**Fix:** `client.ts` now dispatches `auth:session-expired` on `window` when token refresh fails. `AuthContext` listens and clears `user` state, triggering the `ProtectedRoute` redirect to `/login`.
