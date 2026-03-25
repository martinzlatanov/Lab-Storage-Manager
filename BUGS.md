# Bug Report — Lab Storage Manager

**Audited:** 2026-03-25
**Method:** Static code review across frontend and backend source
**Scope:** `frontend/src/`, `backend/src/`, `backend/prisma/`
**Last updated:** 2026-03-25 — frontend and backend bug passes complete

### Resolution Status

| Bug | Severity | Status |
|---|---|---|
| BUG-001 | CRITICAL | ✅ Fixed (backend) |
| BUG-003 | HIGH | ✅ Fixed (frontend) |
| BUG-004 | HIGH | ✅ Fixed (frontend) |
| BUG-005 | HIGH | ✅ Fixed (backend) |
| BUG-006 | HIGH | ✅ Fixed (frontend) |
| BUG-007 | HIGH | ✅ Fixed (frontend) |
| BUG-008 | MEDIUM | ✅ Fixed (backend) |
| BUG-009 | MEDIUM | ✅ Fixed (backend) |
| BUG-010 | MEDIUM | ✅ Fixed (backend adds labIdNumber to UpdateItemBody; frontend makes field read-only — design intent pending Venelin review) |
| BUG-011 | MEDIUM | ⏳ Open (barcode generation strategy not yet decided) |
| BUG-012 | MEDIUM | ✅ Fixed (frontend) |
| BUG-013 | MEDIUM | ✅ Fixed (frontend) |
| BUG-014 | MEDIUM | ✅ Fixed (frontend) |
| BUG-015 | MEDIUM | ✅ Fixed (frontend) |
| BUG-016 | MEDIUM | ✅ Fixed (frontend) |
| BUG-017 | LOW | ✅ Fixed (frontend) |
| BUG-018 | LOW | ✅ Fixed (frontend) |
| BUG-019 | LOW | ✅ Fixed (frontend) |
| BUG-020 | LOW | ✅ Fixed (frontend) |

---

## Severity Legend

| Label | Meaning |
|---|---|
| **CRITICAL** | Security hole or data loss in production |
| **HIGH** | Core feature broken or data integrity issue |
| **MEDIUM** | Feature incomplete, incorrect behaviour, or silent failure |
| **LOW** | Minor inconsistency, UX issue, or code quality |

---

## CRITICAL

---

### ~~BUG-001~~ — ✅ FIXED (2026-03-25) — Backend auth dev fallback permanently active in production path

**File:** [backend/src/plugins/auth.ts](backend/src/plugins/auth.ts)
**Lines:** 53–66

When JWT verification fails (missing or expired token), the `authenticate` decorator silently falls back to the seeded `mzlatanov` user (ADMIN role) instead of returning `401`. The comment in the code itself reads: *"Remove this block before going to production."*

```ts
} catch {
  // Dev fallback: allow requests without JWT by using the seeded dev user.
  // Remove this block before going to production.
  const devUser = await prisma.user.findUnique({ where: { ldapUsername: "mzlatanov" } });
  if (devUser && devUser.isActive) {
    req.user = { ... };
    return;   // ← any unauthenticated request succeeds as ADMIN
  }
```

**Effect:**
- Any HTTP client (curl, Postman, scanner, attacker) can call any protected API endpoint without credentials and succeed as ADMIN.
- Deactivating the `mzlatanov` account would suddenly re-enable proper auth, which would be a breaking change in production.

**Expected:** The `catch` block should only call `reply.status(401).send(...)`. The dev fallback must be removed entirely (or gated strictly behind `NODE_ENV === 'development'`).

---

## HIGH

---

### BUG-003 — Fixture field name mismatch: `fixtureTypes` vs `fixtureCategories`

**Files:**
- [frontend/src/types/index.ts](frontend/src/types/index.ts) — Line 160: `fixtureTypes: FixtureType[]`
- [frontend/src/pages/items/ItemDetailPage.tsx](frontend/src/pages/items/ItemDetailPage.tsx) — Line 296: `fx.fixtureTypes.map(...)`
- [frontend/src/pages/items/AddItemPage.tsx](frontend/src/pages/items/AddItemPage.tsx) — Line 324: `setFixtureTypes(fx.fixtureTypes)`
- Backend returns: `fixtureCategories` (schema.prisma, routes/items.ts line 184)

The frontend `Fixture` interface declares `fixtureTypes`, but the backend stores and returns `fixtureCategories`.

**Effect:**
- When viewing any Fixture item via the real API, `fx.fixtureTypes` is `undefined`.
- Line 296 — `fx.fixtureTypes.map(...)` throws `TypeError: Cannot read properties of undefined (reading 'map')`, crashing the Item Detail page with an unhandled runtime error.
- When editing a Fixture item, `setFixtureTypes(fx.fixtureTypes)` sets fixture types to `undefined`, so the checkboxes are pre-populated empty and saving would send an empty array, violating the backend's `min(1)` validation.

**Expected:** Rename `fixtureTypes` → `fixtureCategories` in `frontend/src/types/index.ts` and all consuming code.

---

### BUG-004 — MiscItem field name mismatch: `name`/`description` vs `miscName`/`miscDescription`

**Files:**
- [frontend/src/types/index.ts](frontend/src/types/index.ts) — Lines 188–189: `name: string`, `description?: string`
- [frontend/src/pages/items/ItemDetailPage.tsx](frontend/src/pages/items/ItemDetailPage.tsx) — Lines 353–354: `misc.name`, `misc.description`
- [frontend/src/pages/items/AddItemPage.tsx](frontend/src/pages/items/AddItemPage.tsx) — Line 339: `miscName: misc.name`
- Backend returns: `miscName`, `miscDescription` (schema.prisma, routes/items.ts line 183)

**Effect:**
- `misc.name` and `misc.description` are both `undefined` from the real API.
- Item Detail page renders no name or description for any Misc item.
- Edit Misc item page reads `misc.name` (undefined) and writes it as `miscName` into the form, so the form loads empty even for existing items.

**Expected:** Rename `name` → `miscName` and `description` → `miscDescription` in `MiscItem` interface and all consuming code.

---

### ~~BUG-005~~ — ✅ FIXED (2026-03-25) — No RECEIPT operation created when an item is added with a location

**File:** [backend/src/routes/items.ts](backend/src/routes/items.ts) — Lines 362–384 (and all other `POST /items/*` handlers)

When creating an item via `POST /api/v1/items/*` and supplying a `locationId` or `containerId`, the backend sets the item's location field directly but does **not** create an `OperationRecord` of type `RECEIPT`.

**Effect:**
- Every newly created item has no operation history at all, even though it has a physical location.
- The audit trail requirement ("every movement tracked") is violated from the moment of creation.
- The `GET /items/:id/history` endpoint returns an empty array for all newly added items.
- The "Full history" link on Item Detail shows "No operations recorded" even for items that have been in storage since creation.

**Expected:** Each item creation handler should create a `RECEIPT` operation record in the same `$transaction` as the `item.create` when a `locationId` or `containerId` is provided.

---

### BUG-006 — `/items/:id/history` route does not exist — "Full history" link is a dead link

**Files:**
- [frontend/src/pages/items/ItemDetailPage.tsx](frontend/src/pages/items/ItemDetailPage.tsx) — Line 384
- [frontend/src/App.tsx](frontend/src/App.tsx) — Lines 104–107

ItemDetailPage renders:
```tsx
<Link to={`/items/${item.id}/history`}>Full history</Link>
```

But App.tsx registers only:
```
/items          → ItemListPage
/items/new/:type → AddItemPage
/items/:id/edit  → EditItemPage
/items/:id       → ItemDetailPage   ← `:id` catches everything
```

The path `/items/:id/history` is caught by `/items/:id` (ItemDetailPage) with `id = "<uuid>/history"`, which then fails to find the item and shows "Item not found".

**Expected:** Either register a dedicated `/items/:id/history` route and page, or remove the "Full history" link until the page exists.

---

### BUG-007 — "Temp Exit" button in ItemDetailPage does not pass the item ID

**File:** [frontend/src/pages/items/ItemDetailPage.tsx](frontend/src/pages/items/ItemDetailPage.tsx) — Lines 204–215

The **Move** button correctly passes `state={{ itemId: item.id }}` via React Router state:
```tsx
<Link to="/operations/move" state={{ itemId: item.id }}>Move</Link>
```

The **Temp Exit** button does not:
```tsx
<Link to="/operations/exit">Temp Exit</Link>   {/* ← no state */}
```

**Effect:** Navigating to Temp Exit from Item Detail does not pre-select or pre-fill the item. The user must manually search for the item again. Inconsistent UX and extra steps for a frequent workflow.

**Expected:** Add `state={{ itemId: item.id }}` to the Temp Exit link (same pattern as Move).

---

## MEDIUM

---

### ~~BUG-008~~ — ✅ FIXED (2026-03-25) — Move operation allows empty destination — item silently loses its location

**File:** [backend/src/routes/operations.ts](backend/src/routes/operations.ts) — Lines 198–218

The `MoveBody` schema makes both `toLocationId` and `toContainerId` optional. When a Move is submitted with neither field set, the backend updates the item to `locationId: null, containerId: null`.

**Effect:**
- An item can be moved "to nowhere", effectively removing its location from the system.
- The audit trail records a MOVE but the item becomes unlocatable (`No location assigned`).

**Expected:** Add a `refine` check requiring at least one of `toLocationId` or `toContainerId` to be set, similar to how `LocationFields` prevents conflicting location types.

---

### ~~BUG-009~~ — ✅ FIXED (2026-03-25) — Receipt operation allows no location — item can be received without a location

**File:** [backend/src/routes/operations.ts](backend/src/routes/operations.ts) — Lines 116–166

Both `locationId` and `containerId` in `ReceiptBody` are optional with no requirement to supply at least one. An item can be "received" with no location.

**Effect:**
- The primary purpose of Receipt is to place an item in storage. Allowing a locationless receipt defeats the purpose and leaves items untracked.

**Expected:** Require at least `locationId` or `containerId` when recording a Receipt (unless the design intentionally allows "received but not yet shelved").

---

### ~~BUG-010~~ — ✅ FIXED (2026-03-25) — `labIdNumber` is editable in EditItemPage form but backend silently ignores it

**Files:**
- [frontend/src/pages/items/AddItemPage.tsx](frontend/src/pages/items/AddItemPage.tsx) — Line 377: `labIdNumber: fields.labIdNumber` in PATCH payload
- [backend/src/routes/items.ts](backend/src/routes/items.ts) — Lines 77–108: `UpdateItemBody` schema does not include `labIdNumber`

The edit form shows `Lab ID Number` as an editable field, and the PATCH payload includes it. However, the backend `UpdateItemBody` schema doesn't define `labIdNumber`, so Prisma ignores it silently.

**Effect:**
- Users believe they can update the Lab ID but the field never actually changes.
- No error or feedback is shown — the save "succeeds" but the old value remains.

**Expected:** Either add `labIdNumber` to `UpdateItemBody` (if it should be editable), or make the field read-only in the edit form with a clear label like "Lab ID (cannot be changed)".

---

### BUG-011 — Barcode silently set to `labIdNumber` — collision risk with misleading error

**File:** [frontend/src/pages/items/AddItemPage.tsx](frontend/src/pages/items/AddItemPage.tsx) — Line 563

```ts
barcode: fields.labIdNumber,  // use labIdNumber as barcode until scanner is implemented
```

The barcode (which must be globally unique in the DB) is silently set to whatever the user types as `labIdNumber`.

**Effect:**
- If a user enters the same Lab ID for two different items (e.g., duplicate test request entries), the second POST fails with `409: "An item with this barcode already exists"`.
- The error message mentions "barcode" but the user never saw or entered a barcode field — confusing.
- Two items with different Lab IDs but the same barcode cannot coexist, which may not be the intended constraint.

**Expected:** Either expose a barcode input field to the user (so they know what value is being checked for uniqueness), or auto-generate barcodes server-side and document the strategy.

---

### BUG-012 — Fixture picture file input is non-functional (dead UI)

**File:** [frontend/src/pages/items/AddItemPage.tsx](frontend/src/pages/items/AddItemPage.tsx) — Line 149

```tsx
<input type="file" accept="image/*" className="..." />
```

The file input has no `onChange` handler. No file is ever captured or submitted.

**Effect:**
- Users can click "Choose file" and select an image, but it is silently discarded on submit.
- The `pictureUrl` field on the Fixture item is never populated.

**Expected:** Either implement image upload (multipart or URL-based) with proper state wiring, or remove the input until the feature is ready.

---

### BUG-013 — `Container` frontend type missing `barcode` field

**File:** [frontend/src/types/index.ts](frontend/src/types/index.ts) — Lines 114–122

The backend `container` DB model has `barcode String @unique`. The API responses for containers (e.g., `itemListSelect` at items.ts:192) include `barcode`. The frontend `Container` interface does not declare it.

**Effect:**
- Accessing the barcode of a container in the frontend requires unsafe `any` casting.
- Container scanning workflows (scan a container barcode to find items inside) cannot be typed safely.

**Expected:** Add `barcode: string` to the `Container` interface.

---

### BUG-014 — `ExternalLocationOption.country` is required but `ExternalLocation.country` is optional

**File:** [frontend/src/pages/operations/OperationsPages.tsx](frontend/src/pages/operations/OperationsPages.tsx) — Lines 29, 64

```ts
type ExternalLocationOption = { id: string; name: string; city: string; country: string }  // country: required

const MOCK_EXTERNAL_OPTS = MOCK_EXTERNAL_LOCATIONS.map(el => ({
  ...
  country: el.country,  // el.country is string | undefined
}))
```

And the real API mapping (in `useExternalLocations`) would have the same issue when the API omits `country` for locations without one.

**Effect:**
- TypeScript type mismatch: assigning `string | undefined` to `string` for `country`.
- At runtime, `country` would be `undefined` for locations without a country, potentially rendering `"undefined"` in dropdowns.

**Expected:** Change `ExternalLocationOption.country` to `country?: string` and guard its rendering.

---

### BUG-015 — Location and container API errors silently swallowed — no user feedback

**Files:**
- [frontend/src/pages/operations/OperationsPages.tsx](frontend/src/pages/operations/OperationsPages.tsx) — Line 78: `.catch(() => {})`
- [frontend/src/pages/operations/OperationsPages.tsx](frontend/src/pages/operations/OperationsPages.tsx) — Line 92: `.catch(() => {})`

Both `useLocations` and `useContainers` hooks silently discard any API errors.

**Effect:**
- If the location API fails (network error, server down), the dropdown stays empty with no feedback.
- Users cannot distinguish between "no locations configured" and "API is unreachable".
- The 5-second polling interval means silent failures repeat indefinitely.

**Expected:** At minimum log errors; ideally surface a warning indicator or retry message in the UI.

---

### BUG-016 — Debug `console.log` statements left in AddItemPage

**File:** [frontend/src/pages/items/AddItemPage.tsx](frontend/src/pages/items/AddItemPage.tsx) — Lines 497–513, 518–519, 521, 524, 532–533, 536

The `refreshLocations` function and `useEffect` in AddItemPage contain extensive debug logging:

```ts
console.log('📍 Refreshing locations from API...')
console.log('✅ API Response:', JSON.stringify(res, null, 2))
console.log('📊 Total locations:', res.data?.length ?? 0)
console.log('🚀 AddItemPage mounted. USE_MOCKS=', USE_MOCKS)
// ...etc
```

**Effect:**
- Pollutes the browser console for every user on every Add Item page load and every 5-second poll.
- Exposes internal API response data in the console (potential information disclosure in shared environments).

**Expected:** Remove all debug console statements before production deployment.

---

## LOW

---

### BUG-017 — `NotFoundPage` renders a `<Navigate>` that immediately redirects — 404 UI is never shown

**File:** [frontend/src/App.tsx](frontend/src/App.tsx) — Lines 59–68

```tsx
function NotFoundPage() {
  return (
    <div>
      <p>404</p>
      <Navigate to="/" replace />   {/* ← renders immediately, discards the JSX above */}
    </div>
  )
}
```

`<Navigate>` is a render-time redirect. The 404 text is never displayed.

**Expected:** Use `useNavigate()` in a `useEffect` to redirect after a delay (with user-visible message), or remove the redirect and let users navigate back manually.

---

### BUG-018 — `BaseItem` type does not expose `barcode` field

**File:** [frontend/src/types/index.ts](frontend/src/types/index.ts) — Lines 126–143

The backend returns `barcode` on every item (it is selected in `itemListSelect`). The `BaseItem` interface does not declare it, making the field inaccessible without type casting. The `GET /items/scan/:barcode` endpoint is designed to look items up by barcode (e.g., from a scanner), but the frontend has no typed way to handle the scanned barcode value.

**Expected:** Add `barcode: string` to `BaseItem`.

---

### BUG-019 — Consume, Scrap, and Temp Exit action buttons visible for items they don't apply to

**File:** [frontend/src/pages/items/ItemDetailPage.tsx](frontend/src/pages/items/ItemDetailPage.tsx) — Lines 187–235

- **Consume** is correctly shown only for `CONSUMABLE` items.
- **Scrap** is shown for items that are `TEMP_EXIT` status — scrapping an externally-held item is unusual and potentially incorrect workflow.
- **Temp Exit** is shown for items already in `TEMP_EXIT` status — the backend will correctly reject it with 409, but the button should be hidden or disabled in the UI.

**Expected:** Add status-based visibility guards: hide Temp Exit for `TEMP_EXIT` items; consider hiding Scrap for `TEMP_EXIT` items or requiring a Return first.

---

### BUG-020 — Mock container options in OperationsPages use hardcoded IDs that don't match mock data

**File:** [frontend/src/pages/operations/OperationsPages.tsx](frontend/src/pages/operations/OperationsPages.tsx) — Lines 57–62

```ts
const MOCK_CONTAINER_OPTIONS: ContainerOption[] = [
  { id: 'c1', label: 'BOX-0001' },
  { id: 'c2', label: 'BOX-0002' },
  ...
]
```

The mock data in `frontend/src/mock/data.ts` uses different container IDs. Selecting a container in mock mode for an operation submits an ID that doesn't match any mock item's `containerId`.

**Effect:** In mock mode, container-related operations appear to succeed but produce inconsistent mock state — item moves to a container ID that doesn't correspond to any real mock container.

**Expected:** Import container IDs from `MOCK_CONTAINERS` in `mock/data.ts` instead of hardcoding.

---

*End of bug report. Total: 1 Critical, 5 High, 9 Medium, 4 Low = 19 bugs.*
*Fixed (2026-03-25): BUG-001 (Critical), BUG-005, BUG-008, BUG-009, BUG-010 — 5 backend bugs resolved. Remaining open: 14 bugs (4 High frontend, 5 Medium frontend, 4 Low frontend).*
