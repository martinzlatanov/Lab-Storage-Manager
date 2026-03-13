// ─── Shared backend types ─────────────────────────────────────────────────────

export const UserRole = {
  ADMIN: "ADMIN",
  USER: "USER",
  VIEWER: "VIEWER",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// JWT payload shape embedded in every access token
export interface JwtPayload {
  sub: string;       // user id (cuid)
  username: string;  // ldapUsername
  role: UserRole;
  siteId?: string;
}

// Fastify request user decoration (set by auth plugin after token verification)
export interface RequestUser {
  id: string;
  username: string;
  role: UserRole;
  siteId?: string;
}

// Standard API response wrappers
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
