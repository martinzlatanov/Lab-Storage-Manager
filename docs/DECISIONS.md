# Architecture Decision Log

> Every significant decision is recorded here with date, choice, alternatives considered, and rationale.
> Format: `## YYYY-MM-DD — Topic`

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
