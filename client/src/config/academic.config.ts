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

export function maskPrn(prn?: string | null): string | null {
  if (!prn || prn.length < 4) return null;
  if (prn.startsWith('••••••')) return prn;
  return `••••••${prn.slice(-4)}`;
}

export function formatOwnIdentityLabel(user: {
  department?: string | null;
  year?: string | null;
  prn?: string | null;
  maskedPrn?: string | null;
}): string {
  const masked = user.maskedPrn || maskPrn(user.prn);
  const parts = [user.department, user.year, masked].filter(Boolean);
  return parts.join(' • ') || 'Student';
}

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
