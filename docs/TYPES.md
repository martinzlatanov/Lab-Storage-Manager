# TypeScript Type Definitions

> This file documents the planned types for `src/shared/types/`.
> These types are shared between frontend and backend via the monorepo.
> Status: DRAFT — pending review before implementation.

---

## Status Legend
- 🔲 Planned
- 🔨 In Progress
- ✅ Implemented
- ⚠️ Needs revision

---

## Enums

```typescript
// 🔲 src/shared/types/enums.ts

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  VIEWER = 'VIEWER',
}

export enum ItemType {
  ELECTRONICS_SAMPLE = 'ELECTRONICS_SAMPLE',
  FIXTURE = 'FIXTURE',
  SPARE_PART = 'SPARE_PART',
  CONSUMABLE = 'CONSUMABLE',
  MISC = 'MISC',
}

export enum FixtureType {
  VIBRATION = 'VIBRATION',
  MECHANICAL_SHOCK = 'MECHANICAL_SHOCK',
  CLIMATIC = 'CLIMATIC',
  DUST = 'DUST',
  SALT = 'SALT',
  WATER = 'WATER',
  OTHER = 'OTHER',
}

export enum DevelopmentPhase {
  PRE_DV = 'PRE_DV',
  DV = 'DV',
  PV = 'PV',
}

export enum ItemStatus {
  IN_STORAGE = 'IN_STORAGE',
  TEMP_EXIT = 'TEMP_EXIT',
  SCRAPPED = 'SCRAPPED',
  DEPLETED = 'DEPLETED', // consumables only
}

export enum OperationType {
  RECEIPT = 'RECEIPT',
  MOVE = 'MOVE',
  TEMP_EXIT = 'TEMP_EXIT',
  RETURN = 'RETURN',
  SCRAP = 'SCRAP',
  CONSUME = 'CONSUME', // consumables only
}
```

---

## User Types

```typescript
// 🔲 src/shared/types/user.ts

export interface User {
  id: string;
  ldapUsername: string;
  displayName: string;
  email: string;
  role: UserRole;
  siteId?: string;        // home site (optional — admins may be global)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface JWTPayload {
  sub: string;            // user id
  username: string;
  role: UserRole;
  siteId?: string;
  iat: number;
  exp: number;
}
```

---

## Location Types

```typescript
// 🔲 src/shared/types/location.ts

export interface Site {
  id: string;
  name: string;           // e.g. "Paris", "Munich", "Sofia"
  buildings: Building[];
}

export interface Building {
  id: string;
  siteId: string;
  name: string;           // e.g. "Main building", "Lab building"
  storageAreas: StorageArea[];
}

export interface StorageArea {
  id: string;
  buildingId: string;
  code: string;           // e.g. "A", "B", "C"
  locations: StorageLocation[];
}

export interface StorageLocation {
  id: string;
  storageAreaId: string;
  row: string;            // e.g. "01"
  shelf: string;          // e.g. "02"
  level: string;          // e.g. "5"
  label: string;          // computed: "A-01-02-5"
}

export interface ExternalLocation {
  id: string;
  name: string;
  contactPerson: string;
  address: string;
  city: string;
  country?: string;
  phone?: string;
  email?: string;
  notes?: string;
}
```

---

## Container / Box Types

```typescript
// 🔲 src/shared/types/container.ts

export interface Container {
  id: string;
  label: string;          // human-readable label + barcode value
  locationId?: string;    // null if at external location
  externalLocationId?: string;
  notes?: string;
}
```

---

## Item Types

```typescript
// 🔲 src/shared/types/items.ts

// Base shared across all item types
export interface BaseItem {
  id: string;
  itemType: ItemType;
  status: ItemStatus;
  containerId?: string;   // null = standalone (fixtures)
  locationId?: string;    // direct location if not in container
  externalLocationId?: string;
  labIdNumber: string;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
}

// 1. Automotive Electronics Test Sample
export interface ElectronicsSample extends BaseItem {
  itemType: ItemType.ELECTRONICS_SAMPLE;
  oem: string;                          // BMW, RSA, MB, STLA
  productName: string;                  // BR206 CID
  productType: string;                  // Cluster, CID, HUD, BDC
  oemPartNumber: string;                // A 01 01 205
  serialNumber?: string;
  labIdNumber: string;                  // TR.EL26.012345.1.1
  developmentPhase?: DevelopmentPhase;
  plantLocation?: string;
  testRequestNumber: string;            // TR.EL26.012345
  requester?: string;
}

// 2. Fixture
export interface Fixture extends BaseItem {
  itemType: ItemType.FIXTURE;
  fixtureTypes: FixtureType[];          // multi-select
  productName: string;
  labIdNumber: string;                  // numeric string
  pictureUrl?: string;
}

// 3. Machine Spare Part
export interface SparePart extends BaseItem {
  itemType: ItemType.SPARE_PART;
  manufacturer: string;
  model: string;
  partType: string;                     // Compressor, Valve, Fan
  variant?: string;
  forMachines?: string[];               // TH710-W5, TS130
}

// 4. Consumable
export interface Consumable extends BaseItem {
  itemType: ItemType.CONSUMABLE;
  manufacturer: string;
  model: string;
  consumableType: string;               // Arizona A2 dust, NaCl
  quantity: number;
  unit: string;                         // kg, L, pcs
  lotNumber?: string;
  expiryDate?: Date;
  shelfLifeMonths?: number;
}

// 5. Miscellaneous
export interface MiscItem extends BaseItem {
  itemType: ItemType.MISC;
  name: string;
  description?: string;
}

// Union type for all items
export type AnyItem =
  | ElectronicsSample
  | Fixture
  | SparePart
  | Consumable
  | MiscItem;
```

---

## Operation / Audit Types

```typescript
// 🔲 src/shared/types/operations.ts

export interface OperationRecord {
  id: string;
  operationType: OperationType;
  itemId: string;
  performedById: string;
  performedAt: Date;
  fromLocationId?: string;
  toLocationId?: string;
  fromContainerId?: string;
  toContainerId?: string;
  fromExternalLocationId?: string;
  toExternalLocationId?: string;
  expectedReturnDate?: Date;          // for TEMP_EXIT
  quantityConsumed?: number;          // for CONSUME
  notes?: string;
}
```

---

## API Response Wrappers

```typescript
// 🔲 src/shared/types/api.ts

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

---

## Notes / Open Questions

- [ ] Should `labIdNumber` be generated by the system or entered manually?
- [ ] `Consumable.unit` — define enum or keep as free string?
- [ ] Should `Container` have its own barcode separate from location label?
- [ ] `ExternalLocation.expectedReturnDate` — stored on OperationRecord or on item?
- [ ] Misc item attributes — confirm minimal required fields with lab manager
