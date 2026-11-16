import { FirestoreDataService } from './firestoreData.service.js';

const GAS_MAIL_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbyKujXwhftWWyvIYmmJolrtTQ2ubwWzsrs88nmdDZcMncXs7fbR1BxdXLDXTriYAkV2/exec';

export interface TestNotificationPayload {
  id: string;
  title: string;
  durationMinutes: number;
  totalMarks?: number;
  questionCount?: number | string;
  sectionTarget?: string;
  unitTarget?: string | number;
}

export class NotificationDispatchService {
  /**
   * Helper to chunk an array into smaller sub-arrays
   */
  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Formats official academic test alert email HTML
   */
  public static buildTestEmailHtml(test: TestNotificationPayload): string {
    const duration = test.durationMinutes || 60;
    const marks = test.totalMarks || 20;
    const qCount = test.questionCount || 20;
    const unitStr =
      test.unitTarget && test.unitTarget !== 'ALL'
        ? `Unit ${test.unitTarget}`
        : 'All Units (Comprehensive Syllabus)';

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://logicq-clanguage.web.app';
    const testListUrl = `${baseUrl}/student/tests`;
    const examUrl = `${baseUrl}/exam/${encodeURIComponent(test.id)}`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Lab Test Scheduled</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #0c101d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <div style="max-width: 560px; margin: 0 auto; background: #13192b; border: 1px solid #1e293b; border-radius: 18px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
    
    <!-- Top Pill Badge -->
    <div style="display: inline-block; background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.35); padding: 5px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase;">
      🚨 LOGICQ ACADEMIC ASSESSMENT ALERT
    </div>

    <!-- Main Headline -->
    <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 18px 0 10px 0; line-height: 1.3;">
      ${test.title}
    </h1>

    <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px;">
      Dear Student,<br>
      A new practical programming test has been scheduled on the LogicQ portal for your academic coursework.
    </p>

    <!-- Assessment Metadata Card -->
    <div style="background: #090d16; border: 1px solid #222f49; border-radius: 14px; padding: 18px 20px; margin-bottom: 22px;">
      <div style="display: flex; margin-bottom: 10px;">
        <span style="font-size: 13px; color: #64748b; width: 140px; font-weight: 600;">⏱️ Duration:</span>
        <span style="font-size: 13px; color: #38bdf8; font-weight: 700;">${duration} Minutes</span>
      </div>
      <div style="display: flex; margin-bottom: 10px;">
        <span style="font-size: 13px; color: #64748b; width: 140px; font-weight: 600;">🎯 Total Marks:</span>
        <span style="font-size: 13px; color: #34d399; font-weight: 700;">${marks} Marks</span>
      </div>
      <div style="display: flex; margin-bottom: 10px;">
        <span style="font-size: 13px; color: #64748b; width: 140px; font-weight: 600;">❓ Question Pool:</span>
        <span style="font-size: 13px; color: #f1f5f9; font-weight: 600;">${qCount} Questions (PRN Randomized)</span>
      </div>
      <div style="display: flex; margin-bottom: 10px;">
        <span style="font-size: 13px; color: #64748b; width: 140px; font-weight: 600;">📚 Scope:</span>
        <span style="font-size: 13px; color: #f1f5f9; font-weight: 600;">${unitStr}</span>
      </div>
      <div style="display: flex;">
        <span style="font-size: 13px; color: #64748b; width: 140px; font-weight: 600;">🛡️ Proctoring:</span>
        <span style="font-size: 13px; color: #fbbf24; font-weight: 700;">Full-Screen Tab Lock Active</span>
      </div>
    </div>

    <!-- Critical Exam Instructions Box -->
    <div style="background: rgba(239, 68, 68, 0.08); border-left: 4px solid #ef4444; border-radius: 8px; padding: 14px 16px; margin-bottom: 26px;">
      <div style="font-size: 12px; color: #f87171; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
        ⚠️ Strict Academic Integrity Rules:
      </div>
      <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #cbd5e1; line-height: 1.7;">
        <li>Log in using your verified institutional <strong>PRN &amp; Password</strong>.</li>
        <li><strong>Do not exit full-screen mode</strong> or switch tabs. Window blurs and tab switches are logged directly to faculty audit reports.</li>
        <li>Submissions are verified with the <strong>GCC 14.2 compiler</strong> across hidden academic test cases.</li>
      </ul>
    </div>

    <!-- Primary Action Button -->
    <a href="${testListUrl}" style="display: block; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 15px 24px; border-radius: 12px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4); margin-bottom: 12px;">
      🚀 Open Student Assessment Portal
    </a>

    <!-- Footer -->
    <div style="text-align: center; font-size: 11px; color: #64748b; margin-top: 26px; border-top: 1px solid #1e293b; padding-top: 18px; line-height: 1.6;">
      Sanjivani University • Department of Computer Science &amp; Engineering<br>
      LogicQ Academic Automated Examination Board<br>
      <span style="color: #475569;">Have queries? Contact your course faculty instructor.</span>
    </div>

  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Dispatches email to a single recipient or a list of recipients via GAS Relay
   */
  private static async dispatchGasEmail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      const response = await fetch(GAS_MAIL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          to,
          subject,
          html,
        }),
      });
      return response.ok;
    } catch (err) {
      console.warn('[NotificationDispatchService] GAS dispatch error for', to, err);
      return false;
    }
  }

  /**
   * Broadcasts a new assessment test notification to all enrolled students
   */
  public static async broadcastTestNotification(
    test: TestNotificationPayload
  ): Promise<{ success: boolean; dispatchedCount: number; totalStudents: number; error?: string }> {
    try {
      // 1. Fetch all active students from Firestore
      const users = await FirestoreDataService.getAllFirestoreUsers();

      // 2. Extract valid, active student email addresses
      const validStudentEmails = users
        .filter((u) => {
          if (u.role && u.role !== 'STUDENT') return false;
          if (FirestoreDataService.isPurgedStudent(u)) return false;
          if ((u as any).isBanned) return false;
          const email = (u.email || '').toLowerCase().trim();
          if (!email || !email.includes('@')) return false;
          if (email === 'logicqarena@gmail.com' || email === 'hariprasathset@sanjivani.edu.in') return false;
          if (email.includes('placeholder') || email.includes('dummy')) return false;
          return true;
        })
        .map((u) => ((u as any).boundEmail || u.email || '').toLowerCase().trim())
        .filter((e) => Boolean(e) && e.includes('@'));

      // 3. De-duplicate list
      const uniqueEmails = Array.from(new Set(validStudentEmails));

      if (uniqueEmails.length === 0) {
        return {
          success: false,
          dispatchedCount: 0,
          totalStudents: 0,
          error: 'No enrolled students with a valid email found in roster.',
        };
      }

      const emailSubject = `📢 [New Lab Test Assigned]: ${test.title} (${test.durationMinutes || 60}m) | LogicQ Arena`;
      const emailHtml = this.buildTestEmailHtml(test);

      // 4. Batch dispatch in chunks of 20 recipients to prevent GAS payload or rate limit timeouts
      const emailChunks = this.chunkArray(uniqueEmails, 20);
      let successfulDispatches = 0;

      for (const chunk of emailChunks) {
        const commaSeparated = chunk.join(', ');
        const ok = await this.dispatchGasEmail(commaSeparated, emailSubject, emailHtml);
        if (ok) {
          successfulDispatches += chunk.length;
        } else {
          // If comma-separated call returned non-200, fallback to individual parallel dispatch for this chunk
          const individualResults = await Promise.allSettled(
            chunk.map((email) => this.dispatchGasEmail(email, emailSubject, emailHtml))
          );
          successfulDispatches += individualResults.filter((r) => r.status === 'fulfilled' && (r as any).value === true).length;
        }
      }

      return {
        success: successfulDispatches > 0,
        dispatchedCount: successfulDispatches,
        totalStudents: uniqueEmails.length,
      };
    } catch (err: any) {
      console.error('[NotificationDispatchService] broadcastTestNotification exception:', err);
      return {
        success: false,
        dispatchedCount: 0,
        totalStudents: 0,
        error: err?.message || 'Failed to dispatch test notification.',
      };
    }
  }
}
