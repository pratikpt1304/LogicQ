export const ALLOWED_COLLEGES = ['LogicQ'] as const;
export type AllowedCollege = (typeof ALLOWED_COLLEGES)[number];

export const ALLOWED_DEPARTMENTS = [
  'CSE',
  'IT',
  'AIML',
  'AIDS',
  'Integrated M.Tech',
  'Mechanical',
  'Civil',
  'Electrical',
  'E&TC',
  'Integrated B.Tech',
] as const;
export type AllowedDepartment = (typeof ALLOWED_DEPARTMENTS)[number];

export function normalizeDepartment(raw: unknown): AllowedDepartment | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Exact match first (case-insensitive)
  const exact = (ALLOWED_DEPARTMENTS as readonly string[]).find(
    (d) => d.toLowerCase() === trimmed.toLowerCase()
  );
  if (exact) return exact as AllowedDepartment;

  const upper = trimmed.toUpperCase();

  // Information Technology (must come before general checks)
  if (
    upper.includes('INFORMATION TECH') ||
    upper.includes('INFO TECH') ||
    upper === 'IT' ||
    upper === 'IF' ||
    upper.startsWith('IT ') ||
    upper.endsWith(' IT')
  ) {
    return 'IT';
  }

  // Computer Science & Engineering variations (NEVER include IT here)
  if (
    upper.includes('COMPUTER') ||
    upper.includes('COMP') ||
    upper === 'CS' ||
    upper === 'CSE' ||
    upper.includes('SOFTWARE')
  ) {
    return 'CSE';
  }

  // Artificial Intelligence & Machine Learning
  if (
    upper.includes('MACHINE LEARNING') ||
    upper.includes('AIML') ||
    upper.includes('AI/ML') ||
    upper.includes('AI & ML') ||
    (upper.includes('INTELLIGENCE') && upper.includes('LEARNING'))
  ) {
    return 'AIML';
  }

  // Artificial Intelligence & Data Science
  if (
    upper.includes('DATA SCIENCE') ||
    upper.includes('AIDS') ||
    upper.includes('AI/DS') ||
    upper.includes('AI & DS') ||
    (upper.includes('INTELLIGENCE') && upper.includes('DATA'))
  ) {
    return 'AIDS';
  }

  // Integrated M.Tech
  if (
    upper.includes('INTEGRATED M') ||
    upper.includes('INT M') ||
    upper.includes('M.TECH') ||
    upper.includes('MTECH')
  ) {
    return 'Integrated M.Tech';
  }

  // Integrated B.Tech
  if (
    upper.includes('INTEGRATED B') ||
    upper.includes('INT B')
  ) {
    return 'Integrated B.Tech';
  }

  // Mechanical
  if (upper.includes('MECH')) {
    return 'Mechanical';
  }

  // Civil
  if (upper.includes('CIVIL')) {
    return 'Civil';
  }

  // Electrical
  if (upper.includes('ELECTRICAL') || upper === 'EE') {
    return 'Electrical';
  }

  // Electronics & Telecommunication (E&TC)
  if (
    upper.includes('ELECTRONIC') ||
    upper.includes('TELECOM') ||
    upper === 'ENTC' ||
    upper === 'E&TC' ||
    upper === 'ETC'
  ) {
    return 'E&TC';
  }

  return null;
}

export function deriveDepartmentFromPrn(prn?: string | null): AllowedDepartment | null {
  if (!prn || typeof prn !== 'string') return null;
  const upper = prn.toUpperCase().trim();
  // Check program / branch codes in PRN (e.g., 2126PMIF1057 -> IF -> IT)
  if (upper.includes('IF') || upper.includes('IT')) return 'IT';
  if (upper.includes('AIML') || upper.includes('AIM')) return 'AIML';
  if (upper.includes('AIDS') || upper.includes('AID')) return 'AIDS';
  if (upper.includes('IMTC') || upper.includes('MTECH')) return 'Integrated M.Tech';
  if (upper.includes('IBTC') || upper.includes('BTECH')) return 'Integrated B.Tech';
  if (upper.includes('MECH') || upper.includes('ME')) return 'Mechanical';
  if (upper.includes('CIVIL') || upper.includes('CE')) return 'Civil';
  if (upper.includes('ELECT') || upper.includes('EE')) return 'Electrical';
  if (upper.includes('ETC') || upper.includes('ENTC')) return 'E&TC';
  if (upper.includes('CSE') || upper.includes('CS') || upper.includes('CO')) return 'CSE';
  return null;
}

export const ALLOWED_YEARS = ['FY', 'SY', 'TY'] as const;
export type AllowedYear = (typeof ALLOWED_YEARS)[number];

export const PRN_REGEX = /^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$/;
export const PRN_ERROR_MESSAGE = 'Enter your 12-character PRN: 4 digits, 3 letters, M or F, then 4 digits.';

/**
 * Configurable list of allowed 3-letter program codes (e.g., ['AIM', 'CSE']).
 * Default: empty list [] = any 3 letters are accepted.
 */
export let ALLOWED_PROGRAM_CODES: string[] = [];

export function setAllowedProgramCodes(codes: string[]) {
  ALLOWED_PROGRAM_CODES = codes.map((c) => c.trim().toUpperCase());
}

export const DIVISION_REGEX = /^[A-Za-z0-9]{0,3}$/;
export const DISPLAY_NAME_MIN = 3;
export const DISPLAY_NAME_MAX = 30;

export const PRN_CHANGE_COOLDOWN_DAYS = 30;
export const PRN_RELEASE_RESERVATION_DAYS = 30;

export function normalizePrn(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().toUpperCase();
}

/**
 * Validates a PRN against the 12-character pattern ^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$
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

/**
 * Masks a 12-character PRN showing only the last 4 digits as "••••••••1039" (8 bullets + last 4 digits).
 * Letters (including M/F) are never shown masked or unmasked to peers.
 */
export function maskPrn(prn?: string | null): string | null {
  if (!prn || prn.length < 4) return null;
  if (prn.startsWith('••••••••')) return prn;
  if (prn.startsWith('••••••')) return `••••••••${prn.slice(-4)}`;
  return `••••••••${prn.slice(-4)}`;
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
  fullName?: string | null;
  name?: string | null;
  email?: string | null;
  username?: string | null;
  shortId?: string | null;
  id?: string;
}): string {
  const realName = [user.displayName, user.fullName, (user as any).name].find(isRealPersonName);
  if (realName && realName.trim().length >= 2) {
    return realName.trim();
  }
  if (user.username && isRealPersonName(user.username)) {
    return user.username.trim();
  }
  if (user.email) {
    const fromEmail = formatNameFromEmail(user.email);
    if (fromEmail) return fromEmail;
  }
  const suffix = user.shortId || generateShortId(user.id);
  return `Student ${suffix}`;
}

export function formatNameFromEmail(email?: string | null): string | null {
  if (!email || typeof email !== 'string') return null;
  const localPart = email.split('@')[0];
  if (!localPart || localPart.startsWith('stu_') || localPart.startsWith('student_') || localPart === 'student') return null;
  const cleaned = localPart.replace(/[0-9]+/g, '').replace(/[._-]/g, ' ').trim();
  if (cleaned.length < 2) return null;
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function isRealPersonName(name?: string | null): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  if (trimmed.includes('••••') || trimmed.includes(' • ')) return false;
  if (/^Student\s+[a-z0-9]+/i.test(trimmed) || trimmed.toLowerCase() === 'student' || trimmed.toLowerCase() === 'enrolled student') return false;
  if (/^(stu|student|sec_stu|std|admin|usr|user|qa_student)_[a-z0-9_]+/i.test(trimmed)) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) return false;
  if (/^[a-zA-Z0-9_-]{18,}$/i.test(trimmed) && !trimmed.includes(' ')) return false;
  if (trimmed.length === 25 && trimmed.startsWith('c')) return false;
  return true;
}

export function resolveGreetingName(
  user?: {
    displayName?: string | null;
    fullName?: string | null;
    username?: string | null;
    prn?: string | null;
  } | null,
  fallbackAuthName?: string | null
): string {
  const prn = (user as any)?.prn?.toUpperCase();
  if (prn === '2126PMIM1039') return 'Pratik Thorat';
  if (prn === '2126DEMO1001') return 'Divya Sonawane';
  if (user) {
    if (isRealPersonName(user.displayName)) return user.displayName!.trim();
    if (isRealPersonName(user.fullName)) return user.fullName!.trim();
  }
  if (isRealPersonName(fallbackAuthName)) {
    return fallbackAuthName!.trim();
  }
  if (user?.username && isRealPersonName(user.username)) {
    return user.username.trim();
  }
  return 'Student';
}

