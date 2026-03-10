# Architecture Decision Log

> Every significant decision is recorded here with date, choice, alternatives considered, and rationale.
> Format: `## YYYY-MM-DD — Topic`

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
