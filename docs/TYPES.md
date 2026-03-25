# TypeScript Type Definitions

> Shared types between frontend and backend, defined in frontend/src/types/index.ts and backend/src/types/index.ts.
> **IMPORTANT:** TypeScript enums are BANNED due to `erasableSyntaxOnly: true` in tsconfig. All enum-like types use `const` object + type pattern.
> Status: **✅ IMPLEMENTED** — all types are in use across frontend and backend.

---

## Status Legend
- ✅ Implemented
- 🔨 In Progress  
- 🔲 Planned

---

## Pattern for Enum-Like Types

**DO NOT use TypeScript enum:**
```typescript
// ❌ WRONG
export enum UserRole {
  ADMIN = 'ADMIN',
}
```

**DO use const object + type pattern:**
```typescript
// ✅ CORRECT
export const UserRole = {
  ADMIN: 'ADMIN',
  USER: 'USER',
  VIEWER: 'VIEWER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
```

This pattern:
- Is erased by TypeScript compiler (no runtime overhead)
- Provides full type safety at compile time
- Works with `noUnusedLocals: true`
- Allows `Object.values(UserRole)` for iteration if needed

---

## Enums (as const objects)

### ✅ UserRole
```typescript
export const UserRole = {
  ADMIN: 'ADMIN',
  USER: 'USER',
  VIEWER: 'VIEWER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
```

### ✅ ItemType
```typescript
export const ItemType = {
  ELECTRONICS_SAMPLE: 'ELECTRONICS_SAMPLE',
  FIXTURE: 'FIXTURE',
  SPARE_PART: 'SPARE_PART',
  CONSUMABLE: 'CONSUMABLE',
  MISC: 'MISC',
} as const;
export type ItemType = (typeof ItemType)[keyof typeof ItemType];
```

### ✅ FixtureType (Multi-select — used in array)
```typescript
export const FixtureType = {
  VIBRATION: 'VIBRATION',
  MECHANICAL_SHOCK: 'MECHANICAL_SHOCK',
  CLIMATIC: 'CLIMATIC',
  DUST: 'DUST',
  SALT: 'SALT',
  WATER: 'WATER',
  OTHER: 'OTHER',
} as const;
export type FixtureType = (typeof FixtureType)[keyof typeof FixtureType];
```

### ✅ DevelopmentPhase
```typescript
export const DevelopmentPhase = {
  PRE_DV: 'PRE_DV',
  DV: 'DV',
  PV: 'PV',
} as const;
export type DevelopmentPhase = (typeof DevelopmentPhase)[keyof typeof DevelopmentPhase];
```

### ✅ ItemStatus
```typescript
export const ItemStatus = {
  IN_STORAGE: 'IN_STORAGE',
  TEMP_EXIT: 'TEMP_EXIT',
  SCRAPPED: 'SCRAPPED',
  DEPLETED: 'DEPLETED', // consumables only
} as const;
export type ItemStatus = (typeof ItemStatus)[keyof typeof ItemStatus];
```

### ✅ OperationType
```typescript
export const OperationType = {
  RECEIPT: 'RECEIPT',
  MOVE: 'MOVE',
  TEMP_EXIT: 'TEMP_EXIT',
  RETURN: 'RETURN',
  SCRAP: 'SCRAP',
  CONSUME: 'CONSUME', // consumables only
} as const;
export type OperationType = (typeof OperationType)[keyof typeof OperationType];
```

## User Types

### ✅ User & JWT

```typescript
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

export interface JwtPayload {
  sub: string;            // user id (cuid)
  username: string;       // ldapUsername
  role: UserRole;
  siteId?: string;
  iat: number;
  exp: number;
}
```

---

## Location Types

### ✅ Site, Building, Area, Location

```typescript
export interface Site {
  id: string;
  name: string;           // e.g. "Paris", "Munich", "Sofia"
  createdAt: Date;
  updatedAt: Date;
}

export interface Building {
  id: string;
  siteId: string;
  name: string;           // e.g. "Main building", "Lab building"
  createdAt: Date;
  updatedAt: Date;
}

export interface StorageArea {
  id: string;
  buildingId: string;
  code: string;           // e.g. "A", "B", "C"
  createdAt: Date;
  updatedAt: Date;
}

export interface StorageLocation {
  id: string;
  storageAreaId: string;
  row: string;            // e.g. "01"
  shelf: string;          // e.g. "02"
  level: string;          // e.g. "5"
  label: string;          // computed: "A-01-02-5"
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Container / Box Types

### ✅ Container

```typescript
export interface Container {
  id: string;
  barcode: string;        // unique barcode value
  label: string;          // human-readable label + barcode value
  locationId?: string;    // null if at external location
  externalLocationId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
}
```

---

## Item Types

### ✅ Base Item Interface

```typescript
export interface BaseItem {
  id: string;
  itemType: ItemType;
  status: ItemStatus;
  barcode: string;        // unique identifier for scanning
  containerId?: string;   // null = standalone (fixtures)
  locationId?: string;    // direct location if not in container
  externalLocationId?: string;
  labIdNumber: string;    // user-entered identifier (assigned manually or auto-generated)
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
}
```

### ✅ ElectronicsSample

```typescript
export interface ElectronicsSample extends BaseItem {
  itemType: 'ELECTRONICS_SAMPLE';
  oem: string;                          // BMW, RSA, MB, STLA
  productName: string;                  // BR206 CID
  productType: string;                  // Cluster, CID, HUD, BDC
  oemPartNumber: string;                // A 01 01 205
  serialNumber?: string;
  developmentPhase?: DevelopmentPhase;
  plantLocation?: string;
  testRequestNumber: string;            // TR.EL26.012345
  requester?: string;
}
```

### ✅ Fixture

```typescript
export interface Fixture extends BaseItem {
  itemType: 'FIXTURE';
  fixtureCategories: Array<FixtureType>;  // multi-select
  productName: string;
  pictureUrl?: string;
}
```

### ✅ SparePart

```typescript
export interface SparePart extends BaseItem {
  itemType: 'SPARE_PART';
  manufacturer: string;
  model: string;
  partType: string;                     // Compressor, Valve, Fan
  variant?: string;
  forMachines?: string[];               // TH710-W5, TS130
}
```

### ✅ Consumable (Quantity-tracked)

```typescript
export interface Consumable extends BaseItem {
  itemType: 'CONSUMABLE';
  manufacturer: string;
  model: string;
  consumableType: string;               // Arizona A2 dust, NaCl
  quantity: number;
  unit: string;                         // kg, L, pcs (free-form string)
  lotNumber?: string;
  expiryDate?: Date;
  shelfLifeMonths?: number;
}
```

### ✅ MiscItem

```typescript
export interface MiscItem extends BaseItem {
  itemType: 'MISC';
  miscName: string;
  miscDescription?: string;
}
```

### ✅ Union Type

```typescript
export type AnyItem =
  | ElectronicsSample
  | Fixture
  | SparePart
  | Consumable
  | MiscItem;
```

---

## Operation / Audit Types

### ✅ OperationRecord

```typescript
export interface OperationRecord {
  id: string;
  operationType: OperationType;
  itemId: string;
  performedById: string;           // user who performed the operation
  performedAt: Date;
  fromLocationId?: string;         // for MOVE, RETURN
  toLocationId?: string;           // for MOVE, RECEIPT, RETURN
  fromContainerId?: string;        // for MOVE
  toContainerId?: string;          // for MOVE, RECEIPT
  fromExternalLocationId?: string; // for RETURN
  toExternalLocationId?: string;   // for TEMP_EXIT
  expectedReturnDate?: Date;       // for TEMP_EXIT — when item is expected back
  quantityConsumed?: number;       // for CONSUME
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## API Response Wrappers

### ✅ ApiSuccess, ApiError, Paginated

```typescript
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

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

---

## Design Notes & Resolutions

### ✅ labIdNumber Generation
**Resolution:** User-entered (manual assignment). System does not auto-generate. Frontend should validate uniqueness.

### ✅ Consumable.unit
**Resolution:** Free-form string (not enum). Allows flexibility for different measurement units (kg, L, pcs, mL, etc.) without schema changes.

### ✅ Container Barcode
**Resolution:** Yes — `barcode` field on Container entity, separate from location label. Each container has its own unique barcode for scanning/tracking.

### ✅ ExternalLocation.expectedReturnDate
**Resolution:** Stored on `OperationRecord` (not on item or external location). Each TEMP_EXIT operation specifies when that particular exit is expected to return.

### ✅ Misc Item Attributes
**Resolution:** Minimal — `miscName` (required) + `miscDescription` (optional). Added barcode/location/container tracking inherited from BaseItem.

---

## Implementation Notes

- All types are source-of-truth for frontend and backend
- Frontend: `frontend/src/types/index.ts`
- Backend: `backend/src/types/index.ts` (mirrors frontend, plus utility types like `RequestUser`, `JwtPayload`)
- Prisma schema independently defines DB structure but types are generated automatically
- Use discriminated unions (`itemType` field) to type-narrow on item type in TypeScript
- Example TypeScript narrowing:
  ```typescript
  function handleItem(item: AnyItem) {
    if (item.itemType === ItemType.CONSUMABLE) {
      console.log(item.quantity, item.unit); // OK — narrowed to Consumable
    }
  }
  ```
