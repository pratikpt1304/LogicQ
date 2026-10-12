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

export const PRN_REGEX = /^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$/;
export const PRN_ERROR_MESSAGE = 'Enter your 12-character PRN: 4 digits, 3 letters, M or F, then 4 digits.';

/**
 * Config list of allowed 3-letter program codes (e.g., ['AIM', 'CSE']).
 * Default: empty list [] = any 3 letters are accepted.
 * If filled, only listed codes are accepted.
 */
export let ALLOWED_PROGRAM_CODES: string[] = [];

export function setAllowedProgramCodes(codes: string[]) {
  ALLOWED_PROGRAM_CODES = codes.map((c) => c.trim().toUpperCase());
}

export const DIVISION_REGEX = /^[A-Za-z0-9]{0,3}$/;
export const DISPLAY_NAME_MIN = 3;
export const DISPLAY_NAME_MAX = 20;

export const PRN_CHANGE_COOLDOWN_DAYS = 30;
export const PRN_RELEASE_RESERVATION_DAYS = 30;
export const PRN_CHANGE_RATE_LIMIT_HOURLY = 5;

/**
 * Calculates whether student is currently under the 30-day PRN change cooldown.
 */
export function getPrnChangeCooldownStatus(prnChangedAt?: Date | string | null): {
  isEligible: boolean;
  nextAllowedDate: Date | null;
  daysRemaining: number;
} {
  if (!prnChangedAt) {
    return { isEligible: true, nextAllowedDate: null, daysRemaining: 0 };
  }
  const changedTime = new Date(prnChangedAt).getTime();
  const cooldownMs = PRN_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  const nextAllowedTime = changedTime + cooldownMs;
  const now = Date.now();
  if (now >= nextAllowedTime) {
    return { isEligible: true, nextAllowedDate: null, daysRemaining: 0 };
  }
  const daysRemaining = Math.ceil((nextAllowedTime - now) / (24 * 60 * 60 * 1000));
  return {
    isEligible: false,
    nextAllowedDate: new Date(nextAllowedTime),
    daysRemaining,
  };
}

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
  return raw.trim().toUpperCase();
}

/**
 * Validates a PRN against the 12-char pattern ^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$
 * and checks the configurable 3-letter program code if allowedProgramCodes is non-empty.
 */
export function isValidPrn(raw: unknown, allowedProgramCodes: string[] = ALLOWED_PROGRAM_CODES): boolean {
  if (typeof raw !== 'string') return false;
  const prn = normalizePrn(raw);
  if (!PRN_REGEX.test(prn)) return false;
  if (allowedProgramCodes && allowedProgramCodes.length > 0) {
    const programCode = prn.slice(4, 7);
    if (!allowedProgramCodes.includes(programCode)) {
      return false;
    }
  }
  return true;
}

export function normalizeDivision(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string') return String(raw);
  const trimmed = raw.trim().toUpperCase();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Masks a 12-character PRN showing only the last 4 digits as "••••••••1039" (8 bullets + last 4 digits).
 * Letters (including M/F) are never shown masked or unmasked to anyone except the student themself.
 * Never expose to other students.
 */
export function maskPrn(prn?: string | null): string | null {
  if (!prn || prn.length < 4) return null;
  return `••••••••${prn.slice(-4)}`;
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

  const normalizedPrn = normalizePrn(prn);
  const normalizedEmail = email.trim().toLowerCase();

  const lines = csvRaw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.toLowerCase().startsWith('prn,') && !l.toLowerCase().startsWith('roll'));

  for (const line of lines) {
    const [rowPrn, rowEmail] = line.split(',').map((s) => s?.trim());
    if (normalizePrn(rowPrn) === normalizedPrn && rowEmail?.toLowerCase() === normalizedEmail) {
      return { allowed: true };
    }
  }

  return {
    allowed: false,
    reason: 'Your PRN and college email do not match the official Sanjivani University allowlist.',
  };
}

export interface AllowlistValidationReport {
  validRows: Array<{ prn: string; email: string }>;
  malformedRows: Array<{ rowNumber: number; raw: string; error: string }>;
  duplicateRows: Array<{ rowNumber: number; prn: string; email: string }>;
  duplicatePrns: string[];
  errors: string[];
}

export function parseAndValidateAllowlistCsv(csvContent: string): AllowlistValidationReport {
  const lines = csvContent.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const validRows: Array<{ prn: string; email: string }> = [];
  const malformedRows: Array<{ rowNumber: number; raw: string; error: string }> = [];
  const duplicateRows: Array<{ rowNumber: number; prn: string; email: string }> = [];
  const duplicatePrns: string[] = [];
  const errors: string[] = [];

  const seenPrns = new Set<string>();
  const seenEmails = new Set<string>();

  let rowNumber = 0;
  for (const line of lines) {
    rowNumber++;
    if (rowNumber === 1 && (line.toLowerCase().startsWith('prn') || line.toLowerCase().startsWith('roll'))) {
      continue;
    }

    const parts = line.split(',').map((p) => p.trim());
    if (parts.length < 2) {
      malformedRows.push({ rowNumber, raw: line, error: 'Row must contain prn and email comma-separated' });
      errors.push(`Row ${rowNumber}: Invalid format`);
      continue;
    }

    const rawPrn = parts[0];
    const rawEmail = parts[1];
    const normalizedPrn = normalizePrn(rawPrn);
    const normalizedEmail = rawEmail.toLowerCase();

    if (!isValidPrn(normalizedPrn)) {
      malformedRows.push({ rowNumber, raw: line, error: PRN_ERROR_MESSAGE });
      errors.push(`Row ${rowNumber}: Invalid PRN format ${rawPrn}`);
      continue;
    }

    if (!normalizedEmail.includes('@') || !normalizedEmail.endsWith('@sanjivani.org.in')) {
      malformedRows.push({ rowNumber, raw: line, error: 'Email must be a valid @sanjivani.org.in address' });
      errors.push(`Row ${rowNumber}: Invalid email domain`);
      continue;
    }

    if (seenPrns.has(normalizedPrn) || seenEmails.has(normalizedEmail)) {
      duplicateRows.push({ rowNumber, prn: normalizedPrn, email: normalizedEmail });
      duplicatePrns.push(normalizedPrn);
      errors.push(`Row ${rowNumber}: Duplicate PRN or Email (${normalizedPrn})`);
      continue;
    }

    seenPrns.add(normalizedPrn);
    seenEmails.add(normalizedEmail);
    validRows.push({ prn: normalizedPrn, email: normalizedEmail });
  }

  return {
    validRows,
    malformedRows,
    duplicateRows,
    duplicatePrns,
    errors,
  };
}
