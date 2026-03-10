# Lab Storage Manager — Full Specification

> Source: Original spec document provided by client. Do not modify this file — it is the reference baseline.
> For implementation interpretations and decisions, see `DECISIONS.md`.

---

## Abstract

"Storage manager" program for the purposes of electronics testing labs and R&D centers.

All parts location must be known at any time. Movement of parts shall be tracked and recorded until its EOL.

---

## Item Types

### 1. Automotive Electronics Test Samples

| # | Attribute | M/O | Example |
|---|---|---|---|
| 1 | OEM | M | BMW, RSA, MB, STLA |
| 2 | Product name | M | BR206 CID, BR223m |
| 3 | Product type | M | Cluster, CID, HUD, BDC, Infotainment |
| 4 | OEM part number | M | A 01 01 205, 142-235-523-1 |
| 5 | Serial number | O | |
| 6 | Lab ID number | M | TR.EL26.012345.1.1 |
| 7 | Development Phase | O | Pre-DV, DV, PV |
| 8 | Plant location | O | Palmela, Bir El Bay, Namestovo |
| 9 | Test request number | M | TR.EL26.012345 |
| 10 | Requester | O | Name or Company ID |
| 11 | Comment | O | Free text |

> Note: Each part is tracked individually — bulk quantity not required for this type.

---

### 2. Fixtures (Mechanical, Climatic, Water, Dust)

| # | Attribute | M/O | Example |
|---|---|---|---|
| 1 | Type | M | Vibration, Mechanical shock, Climatic, Dust, Salt, Water, Other |
| 2 | Product name | M | BR206 CID, BR223m |
| 3 | Lab ID number | M | Numeric identifier: 432, 1236, 3256 |
| 4 | Picture | O | Photo for visual identification |
| 5 | Comment | O | Free text |

> Note: Type supports multiple selections (e.g. a climatic fixture can also serve dust and water tests).

---

### 3. Machine Spare Parts

| # | Attribute | M/O | Example |
|---|---|---|---|
| 1 | Manufacturer | M | ETS Solutions, Danfoss, Long Hui |
| 2 | Model | M | OP-31, X-522 |
| 3 | Type | M | Compressor, Valve, Fan, etc. |
| 4 | Variant | O | Single phase, 3-phase, 7 bar |
| 5 | For machine(s) | O | TH710-W5, TS130, etc. |
| 6 | Comment | O | Free text |

---

### 4. Consumables

| # | Attribute | M/O | Example |
|---|---|---|---|
| 1 | Manufacturer | M | Valerus, Hydratek, etc. |
| 2 | Model | M | |
| 3 | Type | M | Arizona A2 dust, 7 ph solution, NaHCO3, NaCl, Mixed-bed resin |
| 4 | Shelf life | O | 12 months, 24 months |
| 5 | Comment | O | Free text |

> Note: Consumables require quantity tracking and expiry date management.

---

### 5. Miscellaneous Parts

Non-specific parts with fewer attributes. Exact attribute set TBD during implementation.

---

## Storage Location Hierarchy

```
Site (city: Paris, Munich, Sofia…)
└── Building (Main building, Lab building…)
    └── Storage Area (letter code: A, B, C…)
        └── Location: [Area]-[Row]-[Shelf]-[Level]
            Example: A-01-02-5
            = Storage area A, row 01, shelf 02, level 5
```

**Namespace rule:** Site + Building form the unique namespace. The same area code (e.g. A-01-02-5) can exist in multiple buildings/sites and must be handled correctly in DB and UI.

**External Locations:** External labs or R&D centers. When a part is shipped there it is a temporary exit. Must store: contact person, city, address.

---

## Box / Container Organization

### Parts
1. A part can be alone in a box.
2. Multiple parts of the same part number can share a box.
3. Mixed parts (different part numbers/products) can share a box to optimize space.
4. Multiple boxes can hold parts of the same part number (e.g. 21 parts, 3/box = 7 boxes).

### Fixtures
1. A fixture can be standalone (no box).
2. A fixture can be in a single box.
3. Multiple fixtures can share a box.
4. Fixtures of different products and types can share a box.

> All boxes must have proper labeling: barcode/QR code + human-readable text.

---

## Warehouse Operations

| Operation | Description |
|---|---|
| **Receipt** | Item(s) enter warehouse. Type, date, owner, and receiving person recorded. |
| **Exit** | Item(s) leave temporarily. Expected to return. |
| **Permanent Exit / Scrap** | Item no longer needed. Marked scrapped with date + person. Past info preserved. Item becomes immutable in UI. |
| **Move** | Between containers, shelf levels, shelves, storage areas, or sites. |
| **Consume** | Reduce quantity of a consumable (added requirement). |

---

## Software Requirements

### User Management
- Create, update, deactivate users (never hard delete)
- 3 roles: **Admin**, **User**, **Viewer**
- Authentication: LDAP (Active Directory)
- Authorization: JWT with role claim

### Audit & Immutability
- Every operation timestamped
- Scrapped items immutable in frontend (admin-only override)
- Full history preserved — no data loss ever

### Barcode Support
- Work with 1D barcodes (Code 128), 2D (QR codes, Data Matrix)
- Print labels for: parts, fixtures, storage locations (shelf/level addresses)

---

## Database Requirements
- Must run on Linux (preferred) and Windows
- Must handle hundreds of thousands of records without hard limits
- PostgreSQL chosen (no size cap unlike MS SQL Express)

## UI Requirements
- Web-based: runs on Firefox, Chrome, Edge
- Mobile: Android terminal with 2D scanner support

## Auth Requirements
- LDAP authentication (Active Directory / ldapts)
- JWT-based session after auth
- 3-level RBAC: Admin / User / Viewer
