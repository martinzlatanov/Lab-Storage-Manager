# Bug Report — Lab Storage Manager

> Updated: 2026-04-01
> Scope: Frontend + Backend

---

## Open Issues

*No open issues.*

---

## Resolved Issues

All previously reported bugs (BUG-001 through BUG-020, excluding BUG-011) have been fixed. See [CHANGELOG.md](CHANGELOG.md) for details.

### BUG-037 — "Add Item" form missing client-side required-field validation *(Fixed 2026-04-01)*

**Scope:** Frontend (`pages/items/AddItemPage.tsx`)
**Fix:** `validate()` function checks all required fields per item type before API submission. If any are missing, a banner lists them and submission is blocked. No API call is made for an incomplete form.

### BUG-038 — "Add Item" and edit forms have no unsaved-changes warning *(Fixed 2026-04-01)*

**Scope:** Frontend (`pages/items/AddItemPage.tsx` — both `AddItemPage` and `EditItemPage`)
**Fix:** `useBlocker` from React Router v6 blocks in-app navigation when the form is dirty (any field has been changed). A `beforeunload` handler blocks browser-native navigation (back button, tab close). A confirmation dialog ("Leave page? / Stay / Leave") is rendered when the blocker fires.

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
