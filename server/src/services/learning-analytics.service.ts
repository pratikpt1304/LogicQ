import { prisma } from '../utils/prisma.js';

export class LearningAnalyticsService {
  /**
   * Generates student-level dashboard metrics (Sections 40, 41, 42, 43, 44, 45, 46, 59).
   * STRICT SEPARATION: Academic Score (X/100) and Integrity Score (Y/100) are never combined (Section 59).
   */
  static async getStudentDashboardAnalytics(studentId: string) {
    // 1. Fetch all test assignments, question attempts, and mini-project accesses for student
    const assignments = await prisma.assessmentTestAssignment.findMany({
      where: { studentId },
      include: {
        test: {
          include: {
            questions: {
              include: { problem: true },
            },
          },
        },
        attempts: {
          include: { problem: true },
        },
        vivaQuestions: true,
      },
    });

    const miniProjectAccesses = await prisma.studentMiniProjectAccess.findMany({
      where: { studentId },
      include: { miniProject: true },
    });

    // 2. Compute Overall Academic Score (Max 100: 80 from questions + 20 from mini-project)
    const allAttempts = assignments.flatMap((a) => a.attempts);
    const lockedAttempts = allAttempts.filter((a) => a.isLocked);

    // Sum question marks (up to 80 marks across 4 sections)
    const questionMarks = lockedAttempts.reduce((sum, a) => sum + (a.academicScore || 0), 0);
    // Sum mini-project marks (up to 20 marks)
    const miniProjectMarks = miniProjectAccesses.reduce((sum, m) => sum + (m.academicScore || 0), 0);
    const totalAcademicScore = Math.min(100, questionMarks + miniProjectMarks);

    // 3. Compute Assessment Integrity Score (0 - 100) and Risk Tier (Sections 45, 57, 58)
    let avgIntegrityScore = 0;
    if (allAttempts.length > 0) {
      const sumIntegrity = allAttempts.reduce((sum, a) => sum + (a.integrityScore || 0), 0);
      avgIntegrityScore = Math.round(sumIntegrity / allAttempts.length);
    }

    let integrityRisk: 'NORMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'NORMAL';
    if (avgIntegrityScore <= 20) integrityRisk = 'NORMAL';
    else if (avgIntegrityScore <= 40) integrityRisk = 'LOW';
    else if (avgIntegrityScore <= 60) integrityRisk = 'MODERATE';
    else if (avgIntegrityScore <= 80) integrityRisk = 'HIGH';
    else integrityRisk = 'CRITICAL';

    // 4. Section & Difficulty Breakdown (Section 41)
    const difficultyStats = {
      EASY: { solved: 0, total: 0, avgTimeSec: 0 },
      MEDIUM: { solved: 0, total: 0, avgTimeSec: 0 },
      HARD: { solved: 0, total: 0, avgTimeSec: 0 },
    };

    let totalHiddenPassed = 0;
    let totalHiddenEvaluated = 0;
    let totalTimeTakenSec = 0;
    let totalExpectedTimeSec = 0;

    for (const attempt of allAttempts) {
      const diff = (attempt.problem?.difficulty || 'EASY') as 'EASY' | 'MEDIUM' | 'HARD';
      if (difficultyStats[diff]) {
        difficultyStats[diff].total += 1;
        if (attempt.isLocked) difficultyStats[diff].solved += 1;
        if (attempt.actualTimeTakenSec) {
          difficultyStats[diff].avgTimeSec += attempt.actualTimeTakenSec;
        }
      }
      if (attempt.actualTimeTakenSec) totalTimeTakenSec += attempt.actualTimeTakenSec;
      if (attempt.expectedRefTimeSec) totalExpectedTimeSec += attempt.expectedRefTimeSec;
      if (attempt.firstPassT3At) totalHiddenPassed += 1;
      if (attempt.submittedAt) totalHiddenEvaluated += 1;
    }

    // Average times
    Object.keys(difficultyStats).forEach((k) => {
      const d = difficultyStats[k as 'EASY' | 'MEDIUM' | 'HARD'];
      if (d.total > 0) d.avgTimeSec = Math.round(d.avgTimeSec / d.total);
    });

    const netTimeDeviationSec = totalTimeTakenSec - totalExpectedTimeSec;

    // 5. AI Gap Analysis & Learner Insights (Sections 42, 43, 44)
    const incorrectCount = allAttempts.filter((a) => !a.isLocked && a.status !== 'IN_PROGRESS').length;
    const vivaCount = assignments.flatMap((a) => a.vivaQuestions).length;
    const passedVivaCount = assignments.flatMap((a) => a.vivaQuestions).filter((v) => v.submittedBeforeTimeout).length;

    let learnerClassification: 'ADVANCED_LEARNER' | 'SUPPORT_NEEDING' | 'STEADY_PROGRESS' = 'STEADY_PROGRESS';
    let learnerInsightTitle = 'Steady Progress';
    let learnerInsightMessage = 'Consistent algorithmic problem-solving with steady accuracy.';
    const recommendations: string[] = [];

    if (totalAcademicScore >= 75 && avgIntegrityScore <= 35 && difficultyStats.HARD.solved > 0) {
      // Section 44: AI Advanced-Learner Insights
      learnerClassification = 'ADVANCED_LEARNER';
      learnerInsightTitle = 'AI Advanced Learner Alert';
      learnerInsightMessage = 'Demonstrates high accuracy, strong hidden test pass rates, and rapid execution times.';
      recommendations.push('Explore dynamic memory allocation, graph algorithms, and competitive pointer manipulation.');
      recommendations.push('Eligible for module integrated mini-project activation.');
    } else if (incorrectCount > 3 || (totalAcademicScore < 40 && allAttempts.length >= 3) || netTimeDeviationSec > 600) {
      // Section 43: AI Support-Needing Learner Insights (Non-punitive support need)
      learnerClassification = 'SUPPORT_NEEDING';
      learnerInsightTitle = 'AI Support Need Alert';
      learnerInsightMessage = 'Frequent test case deviations or overtime threshold delays observed. Needs concept reinforcement.';
      recommendations.push('Review array boundary conditions and loops to eliminate out-of-bounds errors.');
      recommendations.push('Practice basic control structures before attempting hard recursive challenges.');
    } else {
      recommendations.push('Continue solving section problem sets within the prescribed time windows.');
      recommendations.push('Maintain clean typing rhythms to ensure low integrity variance.');
    }

    // 6. Behavioral Integrity Telemetry Breakdown (Section 45)
    const telemetry = {
      totalClipboardAttempts: allAttempts.reduce((sum, a) => sum + a.copyPasteAttempts + a.cutAttempts, 0),
      totalTabSwitches: allAttempts.reduce((sum, a) => sum + a.tabSwitchCount, 0),
      totalFocusLossDurationSec: Math.round(allAttempts.reduce((sum, a) => sum + a.totalFocusLossDurationMs, 0) / 1000),
      totalFullScreenExits: allAttempts.reduce((sum, a) => sum + a.fullScreenExitCount, 0),
      totalKeystrokes: allAttempts.reduce((sum, a) => sum + a.totalKeystrokes, 0),
      vivaCompletedRatio: vivaCount > 0 ? `${passedVivaCount}/${vivaCount}` : 'None triggered',
    };

    return {
      academicScore: totalAcademicScore,         // X / 100
      maxAcademicScore: 100,
      integrityScore: avgIntegrityScore,         // Y / 100 (Separate per Section 59)
      integrityRisk,
      totalQuestionsSolved: lockedAttempts.length,
      totalQuestionsAttempted: allAttempts.length,
      miniProjectStatus: miniProjectAccesses[0]?.status || 'INACTIVE',
      miniProjectScore: miniProjectMarks,
      difficultyStats,
      netTimeDeviationSec,
      hiddenTestPassRatio: totalHiddenEvaluated > 0 ? `${totalHiddenPassed}/${totalHiddenEvaluated}` : '0/0',
      learnerClassification,
      learnerInsightTitle,
      learnerInsightMessage,
      recommendations,
      telemetry,
      assignments: assignments.map((a) => ({
        assignmentId: a.id,
        testTitle: a.test.title,
        status: a.status,
        academicScore: a.academicScore,
        integrityScore: a.integrityScore,
        integrityRisk: a.integrityRisk,
      })),
    };
  }

  /**
   * Generates faculty dashboard intelligence (Sections 48, 49, 50, 51, 56).
   */
  static async getFacultyOverviewAnalytics(facultyId: string) {
    const sections = await prisma.section.findMany({
      where: { facultyId },
      include: {
        students: {
          include: {
            student: {
              select: { id: true, fullName: true, prn: true, email: true },
            },
          },
        },
        assessmentTests: {
          include: {
            assignments: {
              include: { attempts: true, vivaQuestions: true },
            },
          },
        },
      },
    });

    const totalSections = sections.length;
    const totalStudents = sections.reduce((sum, s) => sum + s.students.length, 0);

    const allAssignments = sections.flatMap((s) => s.assessmentTests.flatMap((t) => t.assignments));
    const allAttempts = allAssignments.flatMap((a) => a.attempts);

    const totalAcademicSum = allAssignments.reduce((sum, a) => sum + (a.academicScore || 0), 0);
    const avgAcademicScore = allAssignments.length > 0 ? +(totalAcademicSum / allAssignments.length).toFixed(1) : 0;

    const totalIntegritySum = allAssignments.reduce((sum, a) => sum + (a.integrityScore || 0), 0);
    const avgIntegrityScore = allAssignments.length > 0 ? Math.round(totalIntegritySum / allAssignments.length) : 0;

    const highRiskCount = allAssignments.filter((a) => a.integrityRisk === 'HIGH' || a.integrityRisk === 'CRITICAL').length;
    const activeTestsCount = sections.flatMap((s) => s.assessmentTests).filter((t) => t.status === 'PUBLISHED' || t.status === 'ACTIVE').length;

    // Students needing support vs advanced
    let supportNeedCount = 0;
    let advancedCount = 0;

    for (const a of allAssignments) {
      if (a.academicScore < 1.0 && a.attempts.length >= 2) supportNeedCount += 1;
      if (a.academicScore >= 2.0 && a.integrityScore <= 20) advancedCount += 1;
    }

    // Question Quality Intelligence (Section 56): detect questions with high failure rates
    const questionStatsMap = new Map<string, { title: string; failures: number; attempts: number }>();
    for (const att of allAttempts) {
      const qId = att.problemId;
      if (!questionStatsMap.has(qId)) {
        questionStatsMap.set(qId, { title: 'Question', failures: 0, attempts: 0 });
      }
      const item = questionStatsMap.get(qId)!;
      item.attempts += 1;
      if (!att.isLocked && att.status !== 'IN_PROGRESS') item.failures += 1;
    }

    const flaggedQuestions: any[] = [];
    questionStatsMap.forEach((val, id) => {
      if (val.attempts >= 3 && val.failures / val.attempts >= 0.6) {
        flaggedQuestions.push({
          problemId: id,
          title: val.title,
          attempts: val.attempts,
          failureRate: Math.round((val.failures / val.attempts) * 100),
          flagReason: 'Unusually high failure rate (>60%). Review for ambiguous constraints or test cases (Section 56).',
        });
      }
    });

    return {
      topCards: {
        totalSections,
        totalStudents,
        activeTestsCount,
        avgAcademicScore,
        avgIntegrityScore,
        studentsRequiringReview: highRiskCount,
        studentsNeedingSupport: supportNeedCount,
        advancedStudents: advancedCount,
      },
      flaggedQuestions,
      sections: sections.map((s) => ({
        sectionId: s.id,
        sectionName: s.sectionName,
        course: s.course,
        studentCount: s.students.length,
        testCount: s.assessmentTests.length,
      })),
    };
  }

  /**
   * Faculty Student Deep Dive (Section 52 & 53).
   */
  static async getStudentDeepDive(studentId: string) {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        fullName: true,
        prn: true,
        email: true,
        department: true,
        year: true,
        division: true,
      },
    });

    if (!student) throw new Error('Student not found.');

    const assignments = await prisma.assessmentTestAssignment.findMany({
      where: { studentId },
      include: {
        test: true,
        attempts: {
          include: {
            problem: {
              select: {
                id: true,
                title: true,
                difficulty: true,
                expectedTimeMin: true,
                expectedTimeMax: true,
              },
            },
          },
        },
        vivaQuestions: true,
      },
    });

    const miniProjects = await prisma.studentMiniProjectAccess.findMany({
      where: { studentId },
      include: { miniProject: true },
    });

    return {
      student,
      assignments,
      miniProjects,
    };
  }

  /**
   * Student Institutional Performance Report Data (Section 47: Part A Solutions + Part B Integrity Audit).
   */
  static async generateStudentReportData(studentId: string, testId: string) {
    const assignment = await prisma.assessmentTestAssignment.findUnique({
      where: {
        testId_studentId: { testId, studentId },
      },
      include: {
        student: {
          select: { id: true, fullName: true, prn: true, email: true, department: true, year: true, division: true },
        },
        test: {
          include: {
            section: true,
          },
        },
        attempts: {
          include: { problem: true },
          orderBy: { startedAt: 'asc' },
        },
        vivaQuestions: true,
      },
    });

    if (!assignment) throw new Error('Test assignment not found.');

    const miniProjectAccess = await prisma.studentMiniProjectAccess.findFirst({
      where: { studentId },
      include: { miniProject: true },
    });

    // Part A: Submitted Solutions
    const partASolutions = assignment.attempts.map((att) => ({
      questionId: att.problemId,
      title: att.problem.title,
      difficulty: att.problem.difficulty,
      submittedCode: att.submittedCode || 'No code submitted',
      submittedAt: att.submittedAt,
      verdict: att.verdict,
      academicScore: att.academicScore,
    }));

    // Part B: Behavioral & Integrity Audit Trail
    const partBTelemetry = assignment.attempts.map((att) => ({
      questionId: att.problemId,
      variantId: att.questionVariantId,
      startedAt: att.startedAt,
      firstPassT1At: att.firstPassT1At,
      firstPassT2At: att.firstPassT2At,
      firstPassT3At: att.firstPassT3At,
      submittedAt: att.submittedAt,
      actualTimeTakenSec: att.actualTimeTakenSec,
      expectedRefTimeSec: att.expectedRefTimeSec,
      timeDeviationSec: att.timeDeviationSec,
      deviationPercent: att.deviationPercent,
      academicScore: att.academicScore,
      integrityScore: att.integrityScore,
      integrityRisk: att.integrityRisk,
      copyPasteAttempts: att.copyPasteAttempts,
      tabSwitchCount: att.tabSwitchCount,
      fullScreenExitCount: att.fullScreenExitCount,
      totalKeystrokes: att.totalKeystrokes,
      largestBurstChars: att.largestBurstChars,
      codeBurstRatio: att.codeBurstRatio,
      activeInteractionTimeSec: att.activeInteractionTimeSec,
      activeWorkRatio: att.activeWorkRatio,
      suspiciousFlags: att.suspiciousFlags ? JSON.parse(att.suspiciousFlags) : [],
    }));

    return {
      institution: 'Sanjivani University',
      reportType: 'OFFICIAL_ACADEMIC_AND_INTEGRITY_AUDIT_REPORT',
      student: assignment.student,
      test: {
        title: assignment.test.title,
        section: assignment.test.section?.sectionName,
        module: assignment.test.moduleId,
        scheduledStart: assignment.test.startTime,
      },
      summary: {
        academicScore: assignment.academicScore,
        integrityScore: assignment.integrityScore,
        integrityRisk: assignment.integrityRisk,
      },
      partA_Solutions: partASolutions,
      partB_IntegrityAudit: partBTelemetry,
      vivaVerificationAudit: assignment.vivaQuestions,
      miniProjectAudit: miniProjectAccess,
    };
  }

  /**
   * Generates CSV export for faculty (Section 55).
   */
  static async generateSectionCsv(sectionId: string, facultyId: string): Promise<string> {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: {
        students: {
          include: { student: true },
        },
        assessmentTests: {
          include: {
            assignments: true,
          },
        },
      },
    });

    if (!section || section.facultyId !== facultyId) {
      throw new Error('Section not found or unauthorized.');
    }

    const header = [
      'PRN',
      'Student Name',
      'Email',
      'Test Title',
      'Academic Score',
      'Integrity Score',
      'Integrity Risk',
      'Status',
      'Submitted At',
    ].join(',');

    const rows: string[] = [header];

    for (const st of section.students) {
      for (const test of section.assessmentTests) {
        const assign = test.assignments.find((a) => a.studentId === st.studentId);
        const row = [
          `"${st.prn}"`,
          `"${st.student.fullName}"`,
          `"${st.student.email}"`,
          `"${test.title}"`,
          assign?.academicScore ?? 0,
          assign?.integrityScore ?? 0,
          `"${assign?.integrityRisk || 'NOT_STARTED'}"`,
          `"${assign?.status || 'ASSIGNED'}"`,
          assign?.submittedAt ? `"${assign.submittedAt.toISOString()}"` : '"N/A"',
        ].join(',');
        rows.push(row);
      }
    }

    return rows.join('\n');
  }
}
