// ─── API barrel export ────────────────────────────────────────────────────────
// Import all modules from a single entrypoint:  import { getItems, login } from '../api'

export { apiFetch, apiGet, apiPost, apiPatch, apiDelete, setTokens, clearTokens, toQueryString, ApiError } from './client'
export { login, logout } from './auth'
export type { AuthUser, LoginResponse } from './auth'
export { getItems, getItem, getItemHistory, scanBarcode, createItem, updateItem } from './items'
export type { ItemListParams, ItemListResponse, ItemDetailResponse, ItemHistoryResponse } from './items'
export { getOperations, recordReceipt, recordMove, recordExit, recordReturn, recordScrap, recordConsume } from './operations'
export type { OperationListParams, OperationListResponse, OperationResponse } from './operations'
export { getSites, getBuildings, getAreas, getLocationDetail, getExternalLocations, createSite, createBuilding, createArea, createLocation, createExternalLocation } from './sites'
export type { SitesResponse, BuildingsResponse, AreasResponse, LocationDetailResponse, ExternalLocationsResponse } from './sites'
export { getContainers, getContainer, createContainer, updateContainer } from './containers'
export type { ContainerListResponse, ContainerResponse } from './containers'
