/**
 * Feature Flags Configuration (Client)
 *
 * FEATURE_ARENA, FEATURE_ARCHIVE, and FEATURE_BADGES are disabled by default
 * per the amended Master Specification.
 */

export const FEATURES = {
  ARENA: import.meta.env?.VITE_FEATURE_ARENA === 'true' ? true : false,
  ARCHIVE: import.meta.env?.VITE_FEATURE_ARCHIVE === 'true' ? true : false,
  BADGES: import.meta.env?.VITE_FEATURE_BADGES === 'true' ? true : false,
} as const;
