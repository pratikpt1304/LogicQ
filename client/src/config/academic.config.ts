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

export const PRN_CHANGE_COOLDOWN_DAYS = 30;
export const PRN_RELEASE_RESERVATION_DAYS = 30;

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

export function generateShortId(seed?: string): string {
  if (seed && seed.length >= 4) {
    return seed.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase().padStart(4, '0');
  }
  return '0000';
}

export function formatPublicDisplayName(user: {
  displayName?: string | null;
  shortId?: string | null;
  id?: string;
}): string {
  if (user.displayName && user.displayName.trim().length >= DISPLAY_NAME_MIN) {
    return user.displayName.trim();
  }
  const suffix = user.shortId || generateShortId(user.id);
  return `Student ${suffix}`;
}

