import fs from 'fs';
import path from 'path';

export const ALLOWED_COLLEGES = ['Sanjivani University'] as const;
export type AllowedCollege = (typeof ALLOWED_COLLEGES)[number];

export const ALLOWED_DEPARTMENTS = [
  'AIML',
  'AIDS',
  'Integrated M.Tech',
  'Mechanical',
  'CSE',
  'Integrated B.Tech',
] as const;
export type AllowedDepartment = (typeof ALLOWED_DEPARTMENTS)[number];

export const ALLOWED_YEARS = ['FY', 'SY', 'TY'] as const;
export type AllowedYear = (typeof ALLOWED_YEARS)[number];

export const PRN_REGEX = /^[0-9]{12}$/;
export const DIVISION_REGEX = /^[A-Za-z0-9]{0,3}$/;
export const DISPLAY_NAME_MIN = 3;
export const DISPLAY_NAME_MAX = 20;

const PROFANITY_LIST = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'dick',
  'pussy',
  'cunt',
  'whore',
  'slut',
  'nigger',
  'faggot',
  'chutiya',
  'madarchod',
  'bhenchod',
  'gandu',
  'harami',
];

export function containsProfanity(value: string): boolean {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  return PROFANITY_LIST.some((word) => normalized.includes(word));
}

export function normalizePrn(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim();
}

export function normalizeDivision(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string') return String(raw);
  const trimmed = raw.trim().toUpperCase();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Masks a 12-digit PRN showing only the last 4 digits as "••••••5678"
 * Strictly for the student's own view. Never expose to other students.
 */
export function maskPrn(prn?: string | null): string | null {
  if (!prn || prn.length < 4) return null;
  return `••••••${prn.slice(-4)}`;
}

/**
 * Formats the student's own identity label: Department, Year, and masked PRN ("••••••5678")
 */
export function formatOwnIdentityLabel(user: {
  department?: string | null;
  year?: string | null;
  prn?: string | null;
}): string {
  const masked = maskPrn(user.prn);
  const parts = [user.department, user.year, masked].filter(Boolean);
  return parts.join(' • ') || 'Student';
}

/**
 * Generates a short 4-character uppercase hex/alphanumeric suffix for fallback public labels.
 */
export function generateShortId(seed?: string): string {
  if (seed && seed.length >= 4) {
    return seed.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase().padStart(4, '0');
  }
  return Math.random().toString(36).substring(2, 6).toUpperCase().padEnd(4, 'X');
}

/**
 * Formats the public display label visible to other students on leaderboards and profiles.
 * Uses optional displayName (3-20 chars) if set, falling back to "Student " + shortId.
 * NEVER includes any part of the PRN.
 */
export function formatPublicDisplayName(user: {
  displayName?: string | null;
  shortId?: string | null;
  id?: string;
}): string {
  if (user.displayName && user.displayName.trim().length >= DISPLAY_NAME_MIN) {
    return user.displayName.trim();
  }
  const suffix =
    user.shortId ||
    (user.id ? user.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() : '0000');
  return `Student ${suffix}`;
}

/**
 * Checks if the admin allowlist CSV is enabled and validates (prn, email) against it.
 * Supports:
 * - process.env.ALLOWLIST_CSV_ENABLED === 'true'
 * - process.env.ALLOWLIST_CSV_CONTENT (inline CSV lines: "prn,email")
 * - process.env.ALLOWLIST_CSV_PATH (path to CSV file)
 */
export function verifyAllowlistCsv(
  prn: string,
  email: string
): { allowed: boolean; reason?: string } {
  const enabled =
    process.env.ALLOWLIST_CSV_ENABLED === 'true' ||
    process.env.AUTH_MODE === 'ALLOWLIST_CSV';
  if (!enabled) {
    return { allowed: true };
  }

  let csvRaw = process.env.ALLOWLIST_CSV_CONTENT || '';
  if (!csvRaw && process.env.ALLOWLIST_CSV_PATH) {
    const resolved = path.resolve(process.env.ALLOWLIST_CSV_PATH);
    if (fs.existsSync(resolved)) {
      csvRaw = fs.readFileSync(resolved, 'utf8');
    }
  }

  if (!csvRaw.trim()) {
    return {
      allowed: false,
      reason: 'Student allowlist is enabled, but no allowlist records matched your PRN and email.',
    };
  }

  const normalizedPrn = prn.trim();
  const normalizedEmail = email.trim().toLowerCase();

  const lines = csvRaw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.toLowerCase().startsWith('prn,') && !l.toLowerCase().startsWith('roll'));

  for (const line of lines) {
    const [rowPrn, rowEmail] = line.split(',').map((s) => s?.trim());
    if (rowPrn === normalizedPrn && rowEmail?.toLowerCase() === normalizedEmail) {
      return { allowed: true };
    }
  }

  return {
    allowed: false,
    reason: 'Your PRN and college email do not match the official Sanjivani University allowlist.',
  };
}
