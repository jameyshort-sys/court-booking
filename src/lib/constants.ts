export const ROLES = ["MEMBER", "DIRECTOR", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const MEMBER_STATUSES = [
  "PENDING",
  "ACTIVE",
  "REJECTED",
  "DISABLED",
] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const AMENITY_TYPES = ["TENNIS", "PICKLEBALL", "OTHER"] as const;
export type AmenityType = (typeof AMENITY_TYPES)[number];

export const IMPORT_MODES = ["invite", "active", "pending"] as const;
export type ImportMode = (typeof IMPORT_MODES)[number];

export const MAX_IMPORT_ROWS = 2000;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export const DEFAULT_RULES = {
  advanceDays: 14,
  openMinutes: 7 * 60,
  closeMinutes: 21 * 60,
  minDurationMinutes: 30,
  maxDurationMinutes: 180,
  maxConcurrentCourts: 2,
  cancelCutoffMinutes: 60,
} as const;

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function isAmenityType(value: string): value is AmenityType {
  return (AMENITY_TYPES as readonly string[]).includes(value);
}

export function isMemberStatus(value: string): value is MemberStatus {
  return (MEMBER_STATUSES as readonly string[]).includes(value);
}

export function isImportMode(value: string): value is ImportMode {
  return (IMPORT_MODES as readonly string[]).includes(value);
}
