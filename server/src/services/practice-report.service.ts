import crypto from 'crypto';

export interface VerifiedReportRecord {
  reportId: string;
  scope: 'SINGLE_MODULE' | 'ALL_MODULES';
  moduleSlug: string | null;
  moduleTitle: string;
  status: 'COMPLETED' | 'IN_PROGRESS';
  isComplete: boolean;
  statusLabel: string;
  questionsSolved: number;
  totalQuestions: number;
  completionPercentage: number;
  generatedAt: string;
  verificationNotice: string;
  // Metadata for internal checks / rate-limiting (NEVER returned publicly)
  _internalUserId: string;
}

class PracticeReportRegistry {
  private reports = new Map<string, VerifiedReportRecord>();
  private userLastGeneratedAt = new Map<string, number>();

  /**
   * Generates a cryptographically unguessable report ID:
   * "lqr_" + 24 base64url bytes (192 bits of entropy)
   */
  public generateReportId(): string {
    const randomBytes = crypto.randomBytes(24).toString('base64url');
    return `lqr_${randomBytes}`;
  }

  /**
   * Checks rate limiting for a student regenerating reports (30-second cooldown).
   * Returns remaining seconds to wait if rate-limited, or 0 if allowed.
   */
  public checkRateLimit(userId: string, cooldownSeconds = 30): { allowed: boolean; retryAfterSeconds: number } {
    const lastGen = this.userLastGeneratedAt.get(userId);
    if (!lastGen) {
      return { allowed: true, retryAfterSeconds: 0 };
    }
    const elapsed = (Date.now() - lastGen) / 1000;
    if (elapsed < cooldownSeconds) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(cooldownSeconds - elapsed),
      };
    }
    return { allowed: true, retryAfterSeconds: 0 };
  }

  /**
   * Registers a newly generated verified report.
   */
  public registerReport(record: VerifiedReportRecord): VerifiedReportRecord {
    this.reports.set(record.reportId, record);
    this.userLastGeneratedAt.set(record._internalUserId, Date.now());
    return record;
  }

  /**
   * Looks up a report for public verification.
   * STRICT ZERO PII GUARANTEE:
   * Strips all internal metadata and ensures no name, PRN, email, or user identifier is present.
   */
  public getPublicVerificationRecord(reportId: string): Omit<VerifiedReportRecord, '_internalUserId'> | null {
    if (!reportId || typeof reportId !== 'string') return null;
    const cleanId = reportId.trim();
    const record = this.reports.get(cleanId);
    if (!record) return null;

    // Return strictly non-PII verification response
    return {
      reportId: record.reportId,
      scope: record.scope,
      moduleSlug: record.moduleSlug,
      moduleTitle: record.moduleTitle,
      status: record.status,
      isComplete: record.isComplete,
      statusLabel: record.statusLabel,
      questionsSolved: record.questionsSolved,
      totalQuestions: record.totalQuestions,
      completionPercentage: record.completionPercentage,
      generatedAt: record.generatedAt,
      verificationNotice: record.verificationNotice,
    };
  }

  /**
   * Clear stores (used in test suites)
   */
  public clear(): void {
    this.reports.clear();
    this.userLastGeneratedAt.clear();
  }
}

export const practiceReportService = new PracticeReportRegistry();
