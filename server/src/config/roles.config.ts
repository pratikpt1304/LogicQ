/**
 * ROLES_REGISTRY - Extensible role definition table for LogicQ.
 * Exactly 3 supported roles currently: 'admin', 'checker', 'student'.
 * Kept in a centralized registry so future roles can be added without architectural rewrites.
 */

export type RoleName = 'ADMIN' | 'CHECKER' | 'STUDENT';

export interface RoleDefinition {
  name: RoleName;
  displayName: string;
  description: string;
  permissions: {
    canAccessAdminPortal: boolean;
    canAccessCheckerPortal: boolean;
    canViewAllSubmissions: boolean;
    canViewHiddenTests: boolean;
    canReviewUploadsBlind: boolean;
    canReviewUploadsFull: boolean;
    canManageUsers: boolean;
    canChangeRoles: boolean;
    canOverrideReviews: boolean;
    canViewAuditLogs: boolean;
    canExportReports: boolean;
  };
  idleTimeoutMs: number;
}

export const ROLES_REGISTRY: Record<RoleName, RoleDefinition> = {
  ADMIN: {
    name: 'ADMIN',
    displayName: 'Administrator',
    description: 'Full access to all 12 admin pages, APIs, settings, and user/checker management.',
    permissions: {
      canAccessAdminPortal: true,
      canAccessCheckerPortal: true, // admin can supervise / test checker reviews
      canViewAllSubmissions: true,
      canViewHiddenTests: true,
      canReviewUploadsBlind: true,
      canReviewUploadsFull: true,
      canManageUsers: true,
      canChangeRoles: true,
      canOverrideReviews: true,
      canViewAuditLogs: true,
      canExportReports: true,
    },
    idleTimeoutMs: 30 * 60 * 1000, // 30 minutes
  },
  CHECKER: {
    name: 'CHECKER',
    displayName: 'Solution Checker',
    description: 'Restricted blind review portal (/checker/reviews). Zero access to admin portal or student PII.',
    permissions: {
      canAccessAdminPortal: false,
      canAccessCheckerPortal: true,
      canViewAllSubmissions: false,
      canViewHiddenTests: false,
      canReviewUploadsBlind: true,
      canReviewUploadsFull: false,
      canManageUsers: false,
      canChangeRoles: false,
      canOverrideReviews: false,
      canViewAuditLogs: false,
      canExportReports: false,
    },
    idleTimeoutMs: 8 * 60 * 60 * 1000, // 8 hours
  },
  STUDENT: {
    name: 'STUDENT',
    displayName: 'Student',
    description: 'Standard student portal: daily challenge, submissions, personal history & leaderboard.',
    permissions: {
      canAccessAdminPortal: false,
      canAccessCheckerPortal: false,
      canViewAllSubmissions: false,
      canViewHiddenTests: false,
      canReviewUploadsBlind: false,
      canReviewUploadsFull: false,
      canManageUsers: false,
      canChangeRoles: false,
      canOverrideReviews: false,
      canViewAuditLogs: false,
      canExportReports: false,
    },
    idleTimeoutMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
};

export const ALLOWED_ROLES: RoleName[] = ['ADMIN', 'CHECKER', 'STUDENT'];

export function isValidRole(role: string): role is RoleName {
  return ALLOWED_ROLES.includes(role.toUpperCase() as RoleName);
}

export function normalizeRole(role: string): RoleName {
  const upper = role.toUpperCase();
  if (upper === 'ADMIN' || upper === 'CHECKER' || upper === 'STUDENT') {
    return upper as RoleName;
  }
  return 'STUDENT';
}
