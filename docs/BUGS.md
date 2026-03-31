# Bug Report — Lab Storage Manager

> Updated: 2026-03-31
> Scope: Frontend + Backend

---

## Open Issues

### BUG-023 — Edit site / building / area saves nothing

**Status:** Open
**Scope:** Frontend (`pages/admin/AdminPages.tsx`, line 420–424)
**Severity:** Critical — core admin functionality silently broken

**Description:** The inline edit flow for sites, buildings, and storage areas shows an editable input and a "Save" button. When saved, `saveEdit()` resets the edit state but makes no API call — the change is discarded silently. A comment at line 423 reads: `// Note: Edit functionality disabled until backend PUT endpoints are implemented`.

**Steps to reproduce:**
1. Go to Admin → Location Config.
2. Click the pencil icon on any site, building, or area.
3. Change the name and click Save.
4. Observe: the UI reverts to the original name. No error, no success feedback.

**Expected:** Name is updated via `PUT /admin/sites/:id`, `PUT /admin/buildings/:id`, or `PUT /admin/areas/:id`.
**Actual:** Silent no-op. Change is lost.

---

### BUG-024 — Delete site only removes from UI state, never calls API

**Status:** Open
**Scope:** Frontend (`pages/admin/AdminPages.tsx`, line 559–562)
**Severity:** Critical — data appears deleted but survives on the server

**Description:** `handleDeleteSite()` contains a `TODO` comment (line 559) and only filters the site from local React state. No `DELETE /admin/sites/:id` API call is made. On page refresh the site reappears.

**Steps to reproduce:**
1. Admin → Location Config → expand any site → click the trash icon → confirm deletion.
2. Refresh the page.
3. Observe: the site is still present.

**Expected:** Site deleted via API and removed from DB.
**Actual:** Only removed from in-memory UI state; reappears on reload.

---

### BUG-025 — "Invite User" button has no action

**Status:** Open
**Scope:** Frontend (`pages/admin/AdminPages.tsx`, line 149–153)
**Severity:** High — user creation is completely unavailable in the UI

**Description:** The "Invite User" button in User Management has no `onClick` handler and opens no modal, form, or navigation. Clicking it does nothing.

**Expected:** Opens a form or dialog to create a new user account.
**Actual:** No response.

---

### BUG-026 — External Location "Save" button is a stub

**Status:** Open
**Scope:** Frontend (`pages/admin/AdminPages.tsx`, lines 1083–1124)
**Severity:** High — external location creation is broken

**Description:** The "New External Location" section contains a full form (name, contact, city, address, country, phone, email, notes) but the Save button has no `onClick` handler. Submitting the form does nothing — no API call is made, no state is updated.

**Steps to reproduce:**
1. Admin → External Locations → fill in all fields → click Save.
2. Observe: nothing happens. The form is not cleared, no location is created.

**Expected:** Calls `POST /external-locations` and adds the entry to the list.
**Actual:** Silent no-op.

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

### BUG-029 — Corrupted HTML in Move page Cancel link

**Status:** Open
**Scope:** Frontend (`pages/operations/OperationsPages.tsx`, line 502)
**Severity:** High — visual corruption / broken button on Move page

**Description:** The Cancel link on the Move operation page contains corrupted text inside the `className` attribute:

```
className="px-3 py-1.5 border border-slate-200 r || (!destLocationId && !destContainerId)ounded-lg text-sm …"
```

The string `r || (!destLocationId && !destContainerId)ounded-lg` is JavaScript expression residue embedded in a className string. This breaks the border-radius class (`rounded-lg`) and results in malformed Tailwind output.

**Expected:** `className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50"`
**Actual:** Garbled class string; button renders without rounded corners and with garbage text leaked into the DOM.

---

### BUG-030 — Move page Cancel button incorrectly uses `<Link>` to `/` instead of `navigate(-1)`

**Status:** Open
**Scope:** Frontend (`pages/operations/OperationsPages.tsx`, line 502)
**Severity:** Medium — poor navigation UX; user loses context

**Description:** All Cancel buttons on operation pages (Move, Temp Exit, Return, Scrap, Consume) link to `/` (dashboard). If the user navigated to the operation from an item detail page, Cancel does not return them to where they came from.

**Expected:** Cancel navigates back to the previous page (e.g., item detail or operations hub).
**Actual:** Cancel always redirects to the dashboard, losing navigation context.

---

### BUG-031 — Audit log search only filters already-loaded records

**Status:** Open
**Scope:** Frontend (`pages/reports/ReportsPages.tsx`, `AuditLogPage`)
**Severity:** Medium — search returns incomplete results for large datasets

**Description:** The search input in the Audit Log filters the currently loaded page of records client-side. It does not trigger a new API request with the search term as a query parameter. On a large dataset where results are paginated, most matching records will not appear in search results.

**Expected:** Search input triggers `GET /operations?search=…` to filter server-side across all records.
**Actual:** Only filters the records already in memory for the current page.

---

### BUG-032 — Debug `console.log` statements left in location creation flow

**Status:** Open
**Scope:** Frontend (`pages/admin/AdminPages.tsx`, lines 485–499)
**Severity:** Medium — exposes internal state in browser console

**Description:** Five `console.log` / `console.error` calls remain in `doAddLocation()`:
- Line 485: `📍 Creating location in area …`
- Line 487: `✅ Location created successfully: …` (dumps full API response)
- Line 488: `🔄 Updating local state…`
- Line 499: `✅ Local state updated`
- Line 502: `❌ Location creation failed: …` (dumps full error object)

**Expected:** No debug output in the browser console in production.
**Actual:** Every location creation logs implementation details to the console.

---

### BUG-033 — Return operation allows submission without selecting a return location

**Status:** Open
**Scope:** Frontend (`pages/operations/OperationsPages.tsx`, ReturnPage)
**Severity:** Medium — backend will reject the request with no clear UX explanation

**Description:** The "Confirm Return" submit button is only disabled when no item is selected (`disabled={submitting || !selectedItem}`). It does not require a return location to be selected. The backend `POST /operations/return` endpoint requires a `locationId`. Submitting without one will fail at the API layer, but the user sees no preventive validation in the form.

**Expected:** Submit button disabled unless both an item and a return location are selected. Inline validation message shown if location is missing.
**Actual:** Form submits without location, fails silently at API, user receives no clear feedback.

---

### BUG-034 — Item search in operation pages silently discards fetch errors

**Status:** Open
**Scope:** Frontend (`pages/operations/OperationsPages.tsx`, line ~393)
**Severity:** Medium — user selects an item that fails to load with no feedback

**Description:** After the user selects an item from search results, the page fetches full item details. If this fetch fails, the `.catch(() => {})` swallows the error — no error banner is shown, no state is cleared, and the form appears to have an item selected while it actually has incomplete data.

**Expected:** On fetch error: clear the selected item, show an inline error message ("Failed to load item details — please try again").
**Actual:** Silent failure. The UI may show partial/stale item data.

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
