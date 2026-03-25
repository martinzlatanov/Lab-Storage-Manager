// ─── Enums (as const objects for erasableSyntaxOnly compatibility) ────────────

export const UserRole = {
  ADMIN: 'ADMIN',
  USER: 'USER',
  VIEWER: 'VIEWER',
} as const
export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const ItemType = {
  ELECTRONICS_SAMPLE: 'ELECTRONICS_SAMPLE',
  FIXTURE: 'FIXTURE',
  SPARE_PART: 'SPARE_PART',
  CONSUMABLE: 'CONSUMABLE',
  MISC: 'MISC',
} as const
export type ItemType = (typeof ItemType)[keyof typeof ItemType]

export const FixtureType = {
  VIBRATION: 'VIBRATION',
  MECHANICAL_SHOCK: 'MECHANICAL_SHOCK',
  CLIMATIC: 'CLIMATIC',
  DUST: 'DUST',
  SALT: 'SALT',
  WATER: 'WATER',
  OTHER: 'OTHER',
} as const
export type FixtureType = (typeof FixtureType)[keyof typeof FixtureType]

export const DevelopmentPhase = {
  PRE_DV: 'PRE_DV',
  DV: 'DV',
  PV: 'PV',
} as const
export type DevelopmentPhase = (typeof DevelopmentPhase)[keyof typeof DevelopmentPhase]

export const ItemStatus = {
  IN_STORAGE: 'IN_STORAGE',
  TEMP_EXIT: 'TEMP_EXIT',
  SCRAPPED: 'SCRAPPED',
  DEPLETED: 'DEPLETED',
} as const
export type ItemStatus = (typeof ItemStatus)[keyof typeof ItemStatus]

export const OperationType = {
  RECEIPT: 'RECEIPT',
  MOVE: 'MOVE',
  TEMP_EXIT: 'TEMP_EXIT',
  RETURN: 'RETURN',
  SCRAP: 'SCRAP',
  CONSUME: 'CONSUME',
} as const
export type OperationType = (typeof OperationType)[keyof typeof OperationType]

// ─── User ───────────────────────────────────────────────────────────────────

export interface User {
  id: string
  ldapUsername: string
  displayName: string
  email: string
  role: UserRole
  siteId?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ─── Location ───────────────────────────────────────────────────────────────

export interface Site {
  id: string
  name: string
  buildings: Building[]
}

export interface Building {
  id: string
  siteId: string
  name: string
  storageAreas: StorageArea[]
}

export interface StorageArea {
  id: string
  buildingId: string
  code: string
  locations: StorageLocation[]
}

export interface StorageLocation {
  id: string
  storageAreaId: string
  row: string
  shelf: string
  level: string
  label: string
}

export interface ExternalLocation {
  id: string
  name: string
  contactPerson: string
  address: string
  city: string
  country?: string
  phone?: string
  email?: string
  notes?: string
}

// ─── Container ───────────────────────────────────────────────────────────────

export interface Container {
  id: string
  label: string
  barcode: string
  locationId?: string
  locationLabel?: string
  externalLocationId?: string
  notes?: string
  itemCount?: number
}

// ─── Items ───────────────────────────────────────────────────────────────────

export interface BaseItem {
  id: string
  itemType: ItemType
  status: ItemStatus
  barcode: string
  containerId?: string
  containerLabel?: string
  locationId?: string
  locationLabel?: string
  externalLocationId?: string
  externalLocationName?: string
  expectedReturnDate?: string
  labIdNumber: string
  comment?: string
  createdAt: string
  updatedAt: string
  createdById: string
  createdByName: string
}

export interface ElectronicsSample extends BaseItem {
  itemType: 'ELECTRONICS_SAMPLE'
  oem: string
  productName: string
  productType: string
  oemPartNumber: string
  serialNumber?: string
  developmentPhase?: DevelopmentPhase
  plantLocation?: string
  testRequestNumber: string
  requester?: string
}

export interface Fixture extends BaseItem {
  itemType: 'FIXTURE'
  fixtureCategories: FixtureType[]
  productName: string
  pictureUrl?: string
}

export interface SparePart extends BaseItem {
  itemType: 'SPARE_PART'
  manufacturer: string
  model: string
  partType: string
  variant?: string
  forMachines?: string[]
}

export interface Consumable extends BaseItem {
  itemType: 'CONSUMABLE'
  manufacturer: string
  model: string
  consumableType: string
  quantity: number
  unit: string
  lotNumber?: string
  expiryDate?: string
  shelfLifeMonths?: number
}

export interface MiscItem extends BaseItem {
  itemType: 'MISC'
  miscName: string
  miscDescription?: string
}

export type AnyItem = ElectronicsSample | Fixture | SparePart | Consumable | MiscItem

// ─── Operations ───────────────────────────────────────────────────────────────

export interface OperationRecord {
  id: string
  operationType: OperationType
  itemId: string
  itemLabId: string
  itemDescription: string
  performedById: string
  performedByName: string
  performedAt: string
  fromLocationLabel?: string
  toLocationLabel?: string
  fromContainerLabel?: string
  toContainerLabel?: string
  fromExternalLocationName?: string
  toExternalLocationName?: string
  expectedReturnDate?: string
  quantityConsumed?: number
  notes?: string
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: string
  code?: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  ELECTRONICS_SAMPLE: 'Electronics Sample',
  FIXTURE: 'Fixture',
  SPARE_PART: 'Spare Part',
  CONSUMABLE: 'Consumable',
  MISC: 'Misc Item',
}

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  IN_STORAGE: 'In Storage',
  TEMP_EXIT: 'Temp Exit',
  SCRAPPED: 'Scrapped',
  DEPLETED: 'Depleted',
}

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  RECEIPT: 'Receipt',
  MOVE: 'Move',
  TEMP_EXIT: 'Temp Exit',
  RETURN: 'Return',
  SCRAP: 'Scrap',
  CONSUME: 'Consume',
}

export const FIXTURE_TYPE_LABELS: Record<FixtureType, string> = {
  VIBRATION: 'Vibration',
  MECHANICAL_SHOCK: 'Mechanical Shock',
  CLIMATIC: 'Climatic',
  DUST: 'Dust',
  SALT: 'Salt',
  WATER: 'Water',
  OTHER: 'Other',
}

export const DEV_PHASE_LABELS: Record<DevelopmentPhase, string> = {
  PRE_DV: 'Pre-DV',
  DV: 'DV',
  PV: 'PV',
}
