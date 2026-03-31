# Architecture Decision Log

> Every significant decision is recorded here with date, choice, alternatives considered, and rationale.
> Format: `## YYYY-MM-DD — Topic`

---

## 2026-03-31 — PostgreSQL Data Volume: Host Bind-Mount at /var/storage

**Decision:** Mount the PostgreSQL data directory from a fixed host path `/var/storage` instead of a named Docker volume.

**Problem:** Named Docker volumes are ephemeral on Kubernetes — when a pod is rescheduled to a different node, or the node is restarted without persistent volume claims, data is lost. A bind-mount to a known host path makes the storage location predictable and independent of container/pod lifecycle.

**Alternatives considered:**
- Option A (chosen): Host bind-mount at `/var/storage` — simple, no extra tooling, works on any Linux host, path is known and can be backed up predictably
- Option B: Kubernetes PersistentVolumeClaim — correct for production K8s but adds cluster-level configuration that is outside the scope of this on-premises deployment
- Option C: Named Docker volume (previous setup) — convenient for local dev but unreliable when containers restart on a different node

**Rationale:**
- On-premises single-node Linux server; a bind-mount is the simplest and most reliable approach
- `/var/storage` is a memorable, infra-owned path that can be on a dedicated data partition or NFS mount
- Backup scripts can target `/var/storage` directly without needing to know Docker volume internals

**Pre-condition for deployment:**
```bash
mkdir -p /var/storage
chown 999:999 /var/storage  # postgres user inside the container
```

---

## 2026-03-31 — Dev Auth Bypass – Active for Frontend Integration Phase

**Decision:** Keep dev auth bypass enabled during frontend integration phase. This allows rapid development iteration without LDAP or manual login on every page reload.

**Status:** ✅ ACTIVE IN DEVELOPMENT
- **Backend:** `DEV_AUTH=true` in `.env` — auto-creates admin user, accepts any password
- **Frontend:** `VITE_DEV_AUTO_LOGIN=true` in `.env` — skips login page, auto-logs in as `admin`/`admin`

**When to disable:** Before any production deployment, remove both env flags.

**Details:** See 2026-03-30 decision below for full architecture rationale.

---

## 2026-03-31 — Location / Area / Building Deletion Rules

**Decision:** Allow hard deletion of storage locations, areas, and buildings — but only if no `IN_STORAGE` items or containers exist within them. Deletion cascades downward (building → areas → locations). Items, containers, and operation records that referenced the deleted location have their FK set to `NULL` (preserved via `ON DELETE SET NULL` already in the migration).

**Problem:** Admins need to clean up the storage hierarchy (e.g. remove a decommissioned room or shelf) without being blocked by historical records that no longer represent physical reality.

**Alternatives considered:**
- Option A (chosen): Hard delete with occupancy guard — clean, irreversible, matches the physical world (a location that no longer exists shouldn't linger in the system)
- Option B: Soft delete (`isActive: false`) — adds complexity to every location query; historical references would still be meaningful; unclear benefit
- Option C: Block if any operation records reference the location — too restrictive; nearly every used location would become undeletable even after all items are removed

**Rationale:**
- `ON DELETE SET NULL` is already defined in the initial migration for `Item.locationId`, `Container.locationId`, and `OperationRecord.from/toLocationId` — no schema migration needed
- SCRAPPED and DEPLETED items are not counted as "stored" — they are end-of-life records and don't block deletion
- TEMP_EXIT items have `locationId = null` (cleared on exit) — they also don't block deletion
- Operation records that lose their `locationId` reference still preserve all other fields (item, user, timestamp, type) — audit trail integrity is maintained
- Inline UI confirmation ("Delete Area B?") with immediate backend error display prevents accidental deletes

**Consequences / Trade-offs:**
- Operation records referencing a deleted location will show `null` for from/to location — acceptable because the location no longer physically exists
- Deletion is permanent and cannot be undone from the UI — admin should verify the location is truly empty before confirming

---

## 2026-03-31 — Local Password as LDAP Fallback

**Decision:** Add an optional `passwordHash` field (scrypt, nullable) to the `User` model. During login, if LDAP throws an error, the backend tries the stored local password as a fallback. Admin can set any user's password via `PATCH /users/:id/password`; non-admins can change their own by supplying `currentPassword`.

**Problem:** Manually-created accounts (`POST /users`) have no LDAP entry, so they can never log in when LDAP is the only auth path. Also needed a self-service "change my password" flow for all roles.

**Alternatives considered:**
- Option A (chosen): Nullable `passwordHash` on `User`, checked only when LDAP fails — zero cost for pure LDAP users, works for hybrid environments
- Option B: Separate `/auth/local-login` endpoint — cleaner URL surface, but adds a permanent second login route that must be hidden or secured separately
- Option C: Only support LDAP — blocks all manually-provisioned accounts from ever logging in

**Rationale:**
- Most users will always use LDAP; the fallback is silent and only triggers on LDAP failure
- Keeps a single `POST /auth/login` endpoint — clients need no changes
- `passwordHash` is nullable: existing users are completely unaffected until an admin sets a password
- scrypt is built into Node.js `crypto` — no additional dependency needed
- Aligns with the existing "manually-created users" path already in `POST /users`

**Consequences / Trade-offs:**
- Users with both an LDAP entry AND a local password always authenticate via LDAP first; local password is only a fallback
- If an admin sets a local password for an LDAP user, it only takes effect when LDAP is unreachable (not a silent bypass)
- Self-service password change requires that an admin has first set an initial local password

---

## 2026-03-30 — Dev Auth Bypass Strategy

**Decision:** Gate dev auth behind `DEV_AUTH=true` (backend) and `VITE_DEV_AUTO_LOGIN=true` (frontend) env flags. When enabled: backend skips LDAP and accepts any password; frontend silently auto-logs in on app mount as the configured dev user (default: `admin`/`admin`).

**Problem:** LDAP is unavailable during local development. Previous workarounds (hard-coded dev user in `auth.ts`, no-op `login()` in `AuthContext`) were leaking into production paths or leaving the API client without tokens, causing 401 errors on every page.

**Alternatives considered:**
- Option A (chosen): Env-flag bypass on both ends — explicit opt-in, easy to audit, zero risk of leaking to production unless env vars are set
- Option B: Separate `/auth/dev-token` endpoint — cleaner URL surface, but adds a permanent route that must be disabled/hidden in prod
- Option C: `VITE_USE_MOCKS=true` everywhere — avoids auth entirely but disconnects frontend from real backend behavior, masking integration bugs

**Rationale:**
- Env flags are the standard dev-vs-prod toggle; they are explicitly excluded from production deployments
- Auto-login on mount means the login page is never shown during development — zero friction
- Backend auto-creates the admin user on first login, so no manual DB seed step is required
- LDAP import is deferred (dynamic `import()`) in the production path — no connection attempt is made at all when `DEV_AUTH` is not set

**To disable for production:** remove `DEV_AUTH` from `backend/.env` and `VITE_DEV_AUTO_LOGIN` from `frontend/.env`.

---

## 2026-03-24 — Location Dropdown Auto-Refresh Polling

**Decision:** Implement 5-second client-side polling for location dropdowns in AddItemPage and OperationsPages to automatically reflect newly created locations from Admin Locations Config page.

**Problem:** When admins created a new location in `/admin/locations`, the location dropdown in item add/operation forms did not update until the user manually refreshed the page.

**Alternatives considered:**
- Option A (chosen): 5-second polling interval via `setInterval()` in useEffect cleanup — simple, no infrastructure needed, good UX for typical admin workflows (create 1-2 locations then navigate to item form)
- Option B: WebSocket/server-sent events — adds backend complexity, requires persistent connections, overkill for warehouse management UI (not real-time critical)
- Option C: Manual refresh button — minimal code but requires user action, poor UX, defeats purpose of admin workflow efficiency
- Option D: On-demand refresh via navigation event — requires route transition hooks, complex state management, misses case where user opens new tab to item form

**Rationale:**
- 5-second interval balances responsiveness vs. API load: admin operations are infrequent, polling is lightweight
- Users expect dropdown state to reflect backend after admin creates location; polling satisfies this without explicit action
- Polling cleanup via interval return prevents memory leaks across component unmounts
- Dual implementation (AddItemPage + OperationsPages) with shared pattern ensures consistency across all item/operation workflows
- Non-blocking: polling runs silently in background, doesn't block form submission or user interaction
- No backend changes required; leverages existing `GET /api/v1/locations` endpoint

**Implementation details:**
- `AddItemPage.tsx`: created `refreshLocations()` async function, setup auto-refresh in first useEffect with interval cleanup
- `OperationsPages.tsx`: added polling logic to `useLocations()` custom hook, centralized for Receipt/Move/Exit/Return/etc.
- `N.Mitev/` variants: applied identical pattern to maintain feature parity across frontend branches

**Future considerations:**
- If location creation becomes high-frequency (bulk import), consider increasing interval to 10s or switching to on-demand refresh button
- Monitor API load during peak admin usage; may need to add debounce if endpoint becomes bottleneck
- If WebSocket infrastructure is later added for other features (real-time item tracking), migrate to event-driven location updates

---

## 2026-03-24 — Role-Based Route Protection & Location Hierarchy Discoverability

**Decision:** Implement `AdminRoute` guard component to enforce admin-only access to `/admin/*` paths. Add admin-only CTA in Location Browser (Storage page) linking to Location Configuration (Admin page).

**Alternatives considered:**
- Option A (chosen): Admin-only CTA button/link from storage page to admin config — clearer domain separation, lower complexity, admin users discover URL naturally from browsing context
- Option B: Embed add-form components directly in storage browser page — higher complexity, code duplication, blurs boundary between browsing and management
- Option C: Show disabled placeholder buttons for non-admin users — clutters UI without value

**Rationale:**
- Location hierarchy management (add/edit sites, buildings, areas, locations) is admin-exclusive and should be behind both UI and route-level access control
- Separating browsing (`/storage/locations`) from management (`/admin/locations`) keeps the information architecture clear
- Route-level guard prevents URL-based access bypass: non-admin users attempting to navigate directly to `/admin/*` are redirected to home page
- Sidebar role filtering provides UX-level hiding, but route guard provides security-level enforcement
- Admin-only CTA in Location Browser makes the management interface discoverable without cluttering the browse-only view for non-admin users
- Blue info box styling signals "admin exclusive" without being aggressive

**Implementation details:**
- `AdminRoute` component in App.tsx checks `user.role === UserRole.ADMIN` and renders either children or `<Navigate to="/" />`
- All four admin routes (`/admin/users`, `/admin/locations`, `/admin/external-locations`, `/admin/settings`) wrapped with `<AdminRoute>`
- Location Browser renders admin-only banner only when `user?.role === UserRole.ADMIN`, providing one-click navigation to `/admin/locations`
- No backend changes required; frontend-only enforcement (backend will enforce via JWT role claim when implemented)

**Future considerations:**
- If User role gains location hierarchy creation rights in future, introduce granular permissions (`create_location_hierarchy`) instead of widening admin access globally
- Ensure backend mirrors role checks once API mutations are live

---

## 2026-03-10 — Barcode Format

**Decision:** Code 128 (1D) + QR Code (2D)

**Alternatives considered:**
- Code 39 — simpler but lower density, uppercase only, larger labels needed
- Data Matrix — good for small labels but less common scanner support on Android terminals

**Rationale:**
- Code 128 supports full ASCII (uppercase + lowercase + numbers), better density than Code 39
- QR Code is universally supported on Android scanners and encodes URLs/JSON payloads
- Using both allows flexibility: 1D for simple label scanning, QR for rich data (location, item ID, link)

---

## 2026-03-10 — Backend Framework

**Decision:** Fastify (Node.js)

**Alternatives considered:**
- Express — widely used but less TypeScript-native, slower
- NestJS — good TypeScript support but heavy abstraction for a 2-person team

**Rationale:**
- Fastify has first-class TypeScript support
- Faster than Express out of the box
- Schema-based validation (JSON Schema / Zod) fits well with Prisma types
- Lightweight enough for a 2-person team to maintain

---

## 2026-03-10 — ORM

**Decision:** Prisma

**Alternatives considered:**
- TypeORM — more complex, decorator-heavy
- Drizzle — newer, good TS support but less mature ecosystem
- Raw SQL — too verbose for CRUD-heavy warehouse app

**Rationale:**
- Prisma schema is readable and acts as living DB documentation
- Excellent TypeScript type generation (types flow from schema → ORM → API → frontend)
- Prisma Migrate handles schema evolution cleanly
- Strong PostgreSQL support

---

## 2026-03-10 — Auth Strategy

**Decision:** LDAP (ldapts) → JWT (stateless)

**Alternatives considered:**
- Session-based auth — stateful, requires sticky sessions or Redis
- OAuth2 / OIDC — overkill for on-prem AD environment without an identity provider

**Rationale:**
- Corporate environment uses Active Directory — LDAP is the natural integration
- JWT is stateless: no session store needed, scales across containers
- Short-lived access token + refresh token pattern balances security and UX
- Role claim embedded in JWT (admin / user / viewer)

---

## 2026-03-10 — Database

**Decision:** PostgreSQL

**Alternatives considered:**
- MS SQL Express — 10 GB per DB hard limit (too small for hundreds of thousands of records)
- MySQL — viable but weaker JSON support, less strict type system
- SQLite — not suitable for multi-user concurrent access

**Rationale:**
- No storage size limits
- Strong JSON support (useful for flexible attributes on miscellaneous items)
- Runs well on Linux (preferred deployment OS)
- Excellent Prisma support
- ACID compliant, handles concurrent warehouse operations safely

---

## 2026-03-10 — Multi-Site Strategy

**Decision:** Single global database with role+site filtered queries

**Alternatives considered:**
- Separate DB per site — complex sync, harder reporting across sites
- Separate schema per site — possible in PostgreSQL but complex migrations

**Rationale:**
- Simpler architecture for a 2-person team
- Cross-site reporting (e.g. find a part across all sites) is trivial with a global DB
- Site-level access control enforced at query layer (Prisma middleware or Fastify hooks)
- Namespace collision (same area code in different buildings) handled by Site+Building compound key

---

## 2026-03-10 — Soft Delete Strategy

**Decision:** Soft delete only — users flagged `isActive: false`, items flagged `status: SCRAPPED`

**Rationale:**
- Spec explicitly requires full history preservation
- Scrapped items must remain queryable for audit purposes
- UI hides scrapped items by default; admin can view full history
- Users are never removed — inactive flag preserves attribution on historical operations

---

## 2026-03-10 — Label Printer Abstraction

**Decision:** Abstract print service interface, with drivers per printer brand (Zebra/Citizen/Brother)

**Rationale:**
- Lab may use different printer brands at different sites
- ZPL (Zebra), ESC/P (Citizen), and Brother-specific protocols differ
- Abstract `PrintService` interface allows swapping printer backend without changing business logic
- Labels generated as ZPL or rendered to PDF/PNG depending on printer capability

---

## 2026-03-10 — Consumables Handling

**Decision:** Quantity tracking with dedicated `Consume` operation

**Rationale:**
- Consumables differ from tracked parts: they are used up, not moved or scrapped individually
- `Consume` operation records: quantity consumed, date, person, purpose
- Expiry date tracked per batch (lot number); alerts when approaching shelf life end
- Quantity goes to zero → item flagged as depleted (not scrapped)

---

## 2026-03-10 — External Location Returns

**Decision:** Scan-in required to confirm return + due-date alert system

**Rationale:**
- Items at external locations are in a `TEMP_EXIT` state
- System must alert when expected return date is approaching or passed
- Return is only confirmed by explicit scan-in operation (prevents "assumed returned" errors)
- External location record stores: contact person, address, city, expected return date

---

## Template for Future Decisions

```markdown
## YYYY-MM-DD — Topic

**Decision:** [What was decided]

**Alternatives considered:**
- Option A — [why not chosen]
- Option B — [why not chosen]

**Rationale:**
[Why this decision was made]

**Consequences / Trade-offs:**
[What this means going forward]
```
