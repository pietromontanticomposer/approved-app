// lib/validation.ts
// Centralized validation utilities

/**
 * Check if a string is a valid UUID v1-5
 */
export const isUuid = (value: string): boolean =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

/**
 * Check if a string is a valid email address
 */
export const isValidEmail = (value: string): boolean =>
  typeof value === "string" &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/**
 * Valid project member roles
 */
export const VALID_ROLES = ['owner', 'admin', 'editor', 'viewer'] as const;
export type ProjectRole = typeof VALID_ROLES[number];

/**
 * Check if a string is a valid project role
 */
export const isValidRole = (value: string): value is ProjectRole =>
  typeof value === "string" &&
  VALID_ROLES.includes(value as ProjectRole);
