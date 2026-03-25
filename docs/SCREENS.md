# Screen Inventory

> All UI screens and their purpose, role access, and status.
> Status: DRAFT — to be reviewed with lab manager.

---

## Status Legend
- 🔲 Planned
- 🔨 In Progress  
- ✅ Implemented

---

## Screen Map

```
App
├── Auth
│   └── Login (LDAP)
├── Dashboard (home)
├── Items
│   ├── Item List / Search
│   ├── Item Detail
│   ├── Add Item (per type)
│   │   ├── Add Electronics Sample
│   │   ├── Add Fixture
│   │   ├── Add Spare Part
│   │   ├── Add Consumable
│   │   └── Add Misc Item
│   └── Item History
├── Operations
│   ├── Receipt
│   ├── Move
│   ├── Temp Exit
│   ├── Return (scan-in)
│   ├── Scrap
│   └── Consume (consumables only)
├── Storage
│   ├── Location Browser (site → building → area → shelf)
│   ├── Container / Box Manager
│   └── External Locations
├── Labels
│   ├── Print Item Label
│   ├── Print Location Label
│   └── Print Container Label
├── Reports / Queries
│   ├── Items by Location
│   ├── Items at External Locations (overdue alerts)
│   ├── Consumables Expiry Report
│   └── Operation History / Audit Log
└── Admin
    ├── User Management
    ├── Site / Building / Area Configuration
    ├── External Location Management
    └── System Settings
```

---

## Screen Details

### AUTH-01 — Login 🔲
**Route:** `/login`
**Access:** Public
**Description:** LDAP credentials form. On success, issues JWT and redirects to Dashboard.
**Notes:** No local account creation. Error messages must not reveal LDAP structure.

---

### DASH-01 — Dashboard 🔲
**Route:** `/`
**Access:** Admin, User, Viewer
**Description:** Overview cards: total items by type, items at external locations, expiring consumables, recent operations.
**Notes:** Cards are filtered by user's site unless Admin (global view).

---

### ITEM-01 — Item List / Search 🔲
**Route:** `/items`
**Access:** Admin, User, Viewer
**Description:** Filterable, searchable table of all items. Filters: type, status, site, location, OEM, product name.
**Columns (default):** Lab ID, Type, Product Name, Status, Location, Last Operation
**Notes:** Scrapped items hidden by default; toggle to show. Barcode scan input in search bar.

---

### ITEM-02 — Item Detail 🔲
**Route:** `/items/:id`
**Access:** Admin, User, Viewer
**Description:** Full item attributes + current location + operation history timeline.
**Actions (User/Admin):** Move, Exit, Scrap, Print Label, Consume (if consumable)
**Notes:** Scrapped items show all data read-only. Admin can edit scrapped items.

---

### ITEM-03 — Add Electronics Sample 🔲
**Route:** `/items/new/electronics`
**Access:** Admin, User
**Description:** Form with all mandatory + optional fields per spec. Lab ID auto-generated or manual entry (TBD).

---

### ITEM-04 — Add Fixture 🔲
**Route:** `/items/new/fixture`
**Access:** Admin, User
**Description:** Form with fixture type (multi-select checkboxes), product name, lab ID, optional picture upload.

---

### ITEM-05 — Add Spare Part 🔲
**Route:** `/items/new/sparepart`
**Access:** Admin, User

---

### ITEM-06 — Add Consumable 🔲
**Route:** `/items/new/consumable`
**Access:** Admin, User
**Description:** Form includes quantity, unit, lot number, expiry date, shelf life.

---

### ITEM-07 — Add Misc Item 🔲
**Route:** `/items/new/misc`
**Access:** Admin, User

---

### ITEM-08 — Item Operation History 🔲
**Route:** `/items/:id/history`
**Access:** Admin, User, Viewer
**Description:** Timeline of all operations on the item: receipt, moves, exits, returns, scrap.

---

### OPS-01 — Receipt 🔲
**Route:** `/operations/receipt`
**Access:** Admin, User
**Description:** Multi-step: select/create item → assign to container or location → confirm → print label option.
**Notes:** Can receive multiple items in one session.

---

### OPS-02 — Move 🔲
**Route:** `/operations/move`
**Access:** Admin, User
**Description:** Scan or search item → select destination (container or location) → confirm.
**Notes:** Supports moving between sites.

---

### OPS-03 — Temp Exit 🔲
**Route:** `/operations/exit`
**Access:** Admin, User
**Description:** Select item → select external location → set expected return date → confirm.

---

### OPS-04 — Return (Scan-in) 🔲
**Route:** `/operations/return`
**Access:** Admin, User
**Description:** Scan item barcode → confirm return → assign back to storage location.
**Notes:** Clears TEMP_EXIT status. Overdue items flagged prominently.

---

### OPS-05 — Scrap 🔲
**Route:** `/operations/scrap`
**Access:** Admin, User
**Description:** Select item → confirm scrap → item becomes read-only.
**Notes:** Requires confirmation dialog. Logs person + timestamp.

---

### OPS-06 — Consume 🔲
**Route:** `/operations/consume`
**Access:** Admin, User
**Description:** Select consumable → enter quantity consumed → confirm. Updates remaining quantity.
**Notes:** Consumable-only operation.

---

### LOC-01 — Location Browser 🔲
**Route:** `/storage/locations`
**Access:** Admin, User, Viewer (browse); Admin only (management CTA visible)
**Description:** Tree browser: Site → Building → Area → Shelf → Level. Click location to see items there.
**Admin-only CTA:** Blue info box at top with link to Location Configuration screen (`/admin/locations`) for managing hierarchy. Visible only to admin users.
**Notes:** Non-admin users see browse-only view (no add/edit actions). Admin users see CTA to transition to management interface.

---

### LOC-02 — Container Manager 🔲
**Route:** `/storage/containers`
**Access:** Admin, User
**Description:** List of boxes/containers. View contents, reassign location, print label.

---

### LOC-03 — External Locations 🔲
**Route:** `/storage/external`
**Access:** Admin, User, Viewer
**Description:** List of external locations + items currently there + overdue return alerts.

---

### LABEL-01 — Print Item Label 🔲
**Route:** Modal / inline action
**Access:** Admin, User
**Description:** Preview + print label for an item. Shows Lab ID, product name, QR code.

---

### LABEL-02 — Print Location Label 🔲
**Route:** Modal / inline action
**Access:** Admin, User
**Description:** Preview + print shelf/level label. Shows address (A-01-02-5) + barcode.

---

### LABEL-03 — Print Container Label 🔲
**Route:** Modal / inline action
**Access:** Admin, User
**Description:** Preview + print container/box label. Shows container ID + QR code + contents summary.

---

### RPT-01 — Items by Location 🔲
**Route:** `/reports/by-location`
**Access:** Admin, User, Viewer

---

### RPT-02 — Items at External Locations 🔲
**Route:** `/reports/external`
**Access:** Admin, User, Viewer
**Description:** Shows all items currently at external locations. Highlights overdue returns in red.

---

### RPT-03 — Consumables Expiry Report 🔲
**Route:** `/reports/expiry`
**Access:** Admin, User, Viewer
**Description:** Lists consumables sorted by expiry date. Warning thresholds: 30 days, 7 days, expired.

---

### RPT-04 — Audit Log 🔲
**Route:** `/reports/audit`
**Access:** Admin, Viewer (read), User (own operations only)
**Description:** Full operation history with filters: date range, operation type, user, item, site.

---

### ADMIN-01 — User Management 🔲
**Route:** `/admin/users`
**Access:** Admin only
**Description:** List users, assign roles, deactivate. Cannot hard-delete.

---

### ADMIN-02 — Site / Building / Area Config 🔲
**Route:** `/admin/locations`
**Access:** Admin only
**Description:** Manage the storage hierarchy: add/edit sites, buildings, areas, shelves.

---

### ADMIN-03 — External Location Management 🔲
**Route:** `/admin/external-locations`
**Access:** Admin only
**Description:** Add/edit external location records (contact, address, city).

---

### ADMIN-04 — System Settings 🔲
**Route:** `/admin/settings`
**Access:** Admin only
**Description:** LDAP config, printer config, alert thresholds, site defaults.

---

## Open Questions

- [ ] Should receipt and move be a single "scan station" screen optimized for scanner use?
- [ ] Mobile (Android terminal) — separate simplified UI or responsive same app?
- [ ] Dashboard: per-site view vs global toggle for admins?
- [ ] Label print: direct to printer via backend API or browser print dialog?
