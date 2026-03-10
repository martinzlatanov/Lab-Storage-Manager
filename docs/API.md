# API Route Catalogue

> Planned REST API routes for the Fastify backend.
> Base URL: `/api/v1`
> All routes require JWT unless marked PUBLIC.
> Status: DRAFT

---

## Status Legend
- 🔲 Planned
- 🔨 In Progress
- ✅ Implemented

---

## Auth

| Method | Route | Role | Description | Status |
|---|---|---|---|---|
| POST | `/auth/login` | PUBLIC | LDAP auth → returns JWT | 🔲 |
| POST | `/auth/refresh` | All | Refresh access token | 🔲 |
| POST | `/auth/logout` | All | Invalidate refresh token | 🔲 |

---

## Users

| Method | Route | Role | Description | Status |
|---|---|---|---|---|
| GET | `/users` | Admin | List all users | 🔲 |
| GET | `/users/:id` | Admin | Get user by ID | 🔲 |
| POST | `/users` | Admin | Create user (manual override) | 🔲 |
| PATCH | `/users/:id` | Admin | Update user (role, site, active) | 🔲 |
| DELETE | `/users/:id` | Admin | Soft-deactivate user | 🔲 |
| GET | `/users/me` | All | Get current user profile | 🔲 |

---

## Sites & Locations

| Method | Route | Role | Description | Status |
|---|---|---|---|---|
| GET | `/sites` | All | List all sites | 🔲 |
| POST | `/sites` | Admin | Create site | 🔲 |
| GET | `/sites/:id/buildings` | All | List buildings in site | 🔲 |
| POST | `/sites/:id/buildings` | Admin | Create building | 🔲 |
| GET | `/buildings/:id/areas` | All | List storage areas in building | 🔲 |
| POST | `/buildings/:id/areas` | Admin | Create storage area | 🔲 |
| GET | `/areas/:id/locations` | All | List locations in area | 🔲 |
| POST | `/areas/:id/locations` | Admin | Create storage location | 🔲 |
| GET | `/locations/:id` | All | Get location + items there | 🔲 |
| GET | `/external-locations` | All | List external locations | 🔲 |
| POST | `/external-locations` | Admin | Create external location | 🔲 |
| PATCH | `/external-locations/:id` | Admin | Update external location | 🔲 |

---

## Containers / Boxes

| Method | Route | Role | Description | Status |
|---|---|---|---|---|
| GET | `/containers` | All | List containers (filterable) | 🔲 |
| POST | `/containers` | User, Admin | Create container | 🔲 |
| GET | `/containers/:id` | All | Get container + contents | 🔲 |
| PATCH | `/containers/:id` | User, Admin | Update container (location, label) | 🔲 |

---

## Items

| Method | Route | Role | Description | Status |
|---|---|---|---|---|
| GET | `/items` | All | List/search items (filterable, paginated) | 🔲 |
| GET | `/items/:id` | All | Get item detail | 🔲 |
| POST | `/items/electronics` | User, Admin | Create electronics sample | 🔲 |
| POST | `/items/fixture` | User, Admin | Create fixture | 🔲 |
| POST | `/items/sparepart` | User, Admin | Create spare part | 🔲 |
| POST | `/items/consumable` | User, Admin | Create consumable | 🔲 |
| POST | `/items/misc` | User, Admin | Create misc item | 🔲 |
| PATCH | `/items/:id` | User, Admin | Update item attributes | 🔲 |
| GET | `/items/:id/history` | All | Get operation history for item | 🔲 |
| GET | `/items/scan/:barcode` | All | Look up item by barcode | 🔲 |

---

## Operations

| Method | Route | Role | Description | Status |
|---|---|---|---|---|
| POST | `/operations/receipt` | User, Admin | Record receipt of item(s) | 🔲 |
| POST | `/operations/move` | User, Admin | Move item to new location/container | 🔲 |
| POST | `/operations/exit` | User, Admin | Record temporary exit to external location | 🔲 |
| POST | `/operations/return` | User, Admin | Record return from external location | 🔲 |
| POST | `/operations/scrap` | User, Admin | Mark item as scrapped | 🔲 |
| POST | `/operations/consume` | User, Admin | Record consumption of consumable | 🔲 |
| GET | `/operations` | All | Query audit log (filterable) | 🔲 |

---

## Labels & Printing

| Method | Route | Role | Description | Status |
|---|---|---|---|---|
| POST | `/labels/item/:id` | User, Admin | Generate item label (ZPL or PNG) | 🔲 |
| POST | `/labels/location/:id` | User, Admin | Generate location label | 🔲 |
| POST | `/labels/container/:id` | User, Admin | Generate container label | 🔲 |
| POST | `/labels/print` | User, Admin | Send label to printer | 🔲 |
| GET | `/printers` | Admin | List configured printers | 🔲 |

---

## Reports

| Method | Route | Role | Description | Status |
|---|---|---|---|---|
| GET | `/reports/by-location` | All | Items grouped by location | 🔲 |
| GET | `/reports/external` | All | Items at external locations (+ overdue flag) | 🔲 |
| GET | `/reports/expiry` | All | Consumables sorted by expiry date | 🔲 |
| GET | `/reports/audit` | All | Full audit log with filters | 🔲 |

---

## Query Parameters (Common)

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default: 1) |
| `pageSize` | number | Items per page (default: 25, max: 100) |
| `siteId` | string | Filter by site |
| `status` | ItemStatus | Filter by item status |
| `itemType` | ItemType | Filter by item type |
| `search` | string | Full-text search on name, ID, part number |
| `from` | ISO date | Date range start (for operations/reports) |
| `to` | ISO date | Date range end |

---

## Notes

- [ ] Should barcode scan resolve to item OR container OR location (unified scan endpoint)?
- [ ] Bulk receipt endpoint needed? (receive array of items in one request)
- [ ] WebSocket or polling for overdue return alerts on dashboard?
- [ ] File upload endpoint for fixture pictures?
