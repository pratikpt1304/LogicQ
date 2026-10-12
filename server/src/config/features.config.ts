/**
 * Feature Flags Configuration (Server)
 *
 * FEATURE_ARENA, FEATURE_ARCHIVE, and FEATURE_BADGES are disabled by default
 * per the amended Master Specification. Existing database tables and records
 * (contests, badges, problems, submissions, weekly results) remain intact,
 * while API endpoints return 404 Not Found and badge awarding is skipped when disabled.
 */

export const FEATURES = {
  ARENA: process.env.FEATURE_ARENA === 'true' ? true : false,
  ARCHIVE: process.env.FEATURE_ARCHIVE === 'true' ? true : false,
  BADGES: process.env.FEATURE_BADGES === 'true' ? true : false,
} as const;
