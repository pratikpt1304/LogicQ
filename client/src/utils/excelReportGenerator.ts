import * as XLSX from 'xlsx';

export interface AssessmentExportRecord {
  id?: string;
  studentName?: string;
  name?: string;
  studentPrn?: string;
  prn?: string;
  studentEmail?: string;
  email?: string;
  attendanceStatus?: string;
  q1?: any;
  q2?: any;
  academicScore?: number;
  totalScore?: number;
  timeTakenSeconds?: number;
  submittedAt?: string | number;
  tabSwitchCount?: number;
  fullscreenExits?: number;
  fullScreenExitCount?: number;
  copyPasteAttempts?: number;
  cpm?: number;
  totalKeystrokes?: number;
  largestBurstChars?: number;
  focusLossCount?: number;
  isPlagiarized?: boolean;
  similarityPercent?: number;
  isLocked?: boolean;
  isLockedByProctor?: boolean;
  assignedQ1?: any;
  assignedQ2?: any;
  integrityRisk?: string;
}

export function comparePrnRollAscending(a: any, b: any): number {
  const prnA = String(a?.studentPrn || a?.prn || a?.id || '').trim();
  const prnB = String(b?.studentPrn || b?.prn || b?.id || '').trim();
  const numA = parseInt(prnA.replace(/\D/g, '').slice(-4), 10) || 999999;
  const numB = parseInt(prnB.replace(/\D/g, '').slice(-4), 10) || 999999;
  if (numA !== numB) return numA - numB;
  return prnA.localeCompare(prnB);
}

export function formatIndianTimestamp(ts?: string | number | null): string {
  if (!ts) return 'Not Submitted';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return String(ts);
  }
}

/**
 * Calculates auto-fit column widths with spacious padding so headers & data never truncate
 */
function calculateAutoFitColumns(rows: any[], minPadding: number = 4): { wch: number }[] {
  if (!rows || rows.length === 0) return [];
  const keys = Object.keys(rows[0]);

  return keys.map((key) => {
    let maxLen = key.length;
    for (const r of rows) {
      const val = r[key];
      const strLen = val != null ? String(val).length : 0;
      if (strLen > maxLen) maxLen = strLen;
    }
    // Set generous width bounds per column
    return { wch: Math.max(maxLen + minPadding, 12) };
  });
}

/**
 * Generates an executive, institutional-grade multi-sheet Excel workbook
 */
/**
 * Computes authoritative integrity risk classification based on real-time proctoring telemetry
 */
export function computeIntegrityVerdict(s: AssessmentExportRecord): 'FLAGGED' | 'SUSPICIOUS' | 'CLEAN' | 'NOT STARTED' {
  if (s.integrityRisk && ['FLAGGED', 'SUSPICIOUS', 'CLEAN', 'NOT STARTED', 'PENDING'].includes(s.integrityRisk)) {
    return s.integrityRisk === 'PENDING' ? 'NOT STARTED' : (s.integrityRisk as any);
  }

  const fullScreen = Number(s.fullscreenExits || s.fullScreenExitCount) || 0;
  const tabSwitches = Number(s.tabSwitchCount) || 0;
  const pasteTries = Number(s.copyPasteAttempts) || 0;
  const burst = Number(s.largestBurstChars) || 0;
  const isLocked = Boolean(s.isLocked || s.isLockedByProctor);

  if (isLocked || fullScreen >= 2 || pasteTries >= 2 || tabSwitches >= 2 || (tabSwitches + fullScreen + pasteTries >= 2) || burst > 70) {
    return 'FLAGGED';
  }
  if (fullScreen === 1 || pasteTries === 1 || tabSwitches === 1 || Number(s.focusLossCount) > 0 || s.isPlagiarized || (s.similarityPercent && s.similarityPercent >= 50)) {
    return 'SUSPICIOUS';
  }
  if (s.q1 || s.q2) {
    return 'CLEAN';
  }
  return 'NOT STARTED';
}

export function exportAssessmentMarkListExcel(test: any, rawSubmissions: AssessmentExportRecord[]): void {
  if (!test || !Array.isArray(rawSubmissions) || rawSubmissions.length === 0) {
    throw new Error('No assessment submission records available to export.');
  }

  // 1. Sort strictly by student roll number ascending (1001 to 1119)
  const sortedSubmissions = [...rawSubmissions].sort(comparePrnRollAscending);
  const totalTestMarks = Number(test.totalMarks) || 10;

  // 2. Prepare Sheet 1: Continuous Evaluation Marks
  const marksSheetRows = sortedSubmissions.map((s, idx) => {
    const q1Score = s.q1 ? Number(s.q1.academicScore != null ? s.q1.academicScore : 5) : 0;
    const q2Score = s.q2 ? Number(s.q2.academicScore != null ? s.q2.academicScore : 5) : 0;
    const totalScore = s.academicScore != null ? Number(s.academicScore) : (q1Score + q2Score);

    const verdict = computeIntegrityVerdict(s);
    const isLocked = Boolean(s.isLocked || s.isLockedByProctor || verdict === 'FLAGGED');

    const statusStr = isLocked
      ? 'PROCTOR LOCKED (DISQUALIFIED)'
      : (s.q1 && s.q2)
      ? 'COMPLETED (BOTH QUESTIONS)'
      : s.q1
      ? 'PARTIAL (Q1 ONLY)'
      : s.q2
      ? 'PARTIAL (Q2 ONLY)'
      : 'IN PROGRESS';

    const prn = String(s.studentPrn || s.prn || '').toUpperCase().trim();
    const isPresent = s.attendanceStatus === 'PRESENT' || (
      typeof window !== 'undefined' && localStorage.getItem(`logicq_lab_attendance_${test?.id}_${prn}`) === 'PRESENT'
    );
    const attendanceStr = isPresent ? 'PRESENT' : 'ABSENT';

    const integrityLabel = verdict === 'FLAGGED'
      ? 'FLAGGED (CHEATING BREACH)'
      : verdict === 'SUSPICIOUS'
      ? 'SUSPICIOUS (PROCTOR ALERT)'
      : verdict === 'CLEAN'
      ? 'CLEAN'
      : 'NOT STARTED';

    return {
      'Sr No': idx + 1,
      'Student Name': s.studentName || s.name || 'Student',
      'PRN Number': s.studentPrn || s.prn || 'N/A',
      'Attendance': attendanceStr,
      
      // Q1 Telemetry
      'Q1 Problem': s.q1?.problemTitle || s.assignedQ1?.title || 'Array Direct Application',
      'Q1 Score (5M)': q1Score,
      'Q1 Submission Time': formatIndianTimestamp(s.q1?.submittedAt),
      
      // Q2 Telemetry
      'Q2 Problem': s.q2?.problemTitle || s.assignedQ2?.title || 'Searching & Sorting Scenario',
      'Q2 Score (5M)': q2Score,
      'Q2 Submission Time': formatIndianTimestamp(s.q2?.submittedAt),
      
      // Aggregate Performance
      'Total Marks (10M)': totalScore,
      'Evaluation Status': statusStr,
      'Time Spent (Min)': s.timeTakenSeconds ? Math.round((s.timeTakenSeconds / 60) * 10) / 10 : 0,
      'Integrity Verdict': integrityLabel,
    };
  });

  // 3. Prepare Sheet 2: Detailed Integrity & Proctoring Telemetry
  const telemetrySheetRows = sortedSubmissions.map((s, idx) => {
    const prn = String(s.studentPrn || s.prn || '').toUpperCase().trim();
    const isPresent = s.attendanceStatus === 'PRESENT' || (
      typeof window !== 'undefined' && localStorage.getItem(`logicq_lab_attendance_${test?.id}_${prn}`) === 'PRESENT'
    );
    const attendanceStr = isPresent ? 'PRESENT' : 'ABSENT';

    const verdict = computeIntegrityVerdict(s);
    const integrityLabel = verdict === 'FLAGGED'
      ? 'FLAGGED (CHEATING BREACH)'
      : verdict === 'SUSPICIOUS'
      ? 'SUSPICIOUS (PROCTOR ALERT)'
      : verdict === 'CLEAN'
      ? 'CLEAN'
      : 'NOT STARTED';

    return {
      'Sr No': idx + 1,
      'Student Name': s.studentName || s.name || 'Student',
      'PRN Number': s.studentPrn || s.prn || 'N/A',
      'Attendance': attendanceStr,
      'Integrity Status': integrityLabel,
      'Tab Switches': s.tabSwitchCount || 0,
      'Fullscreen Exits': s.fullscreenExits || s.fullScreenExitCount || 0,
      'Clipboard Paste Attempts': s.copyPasteAttempts || 0,
      'Typing Speed (CPM)': s.cpm || (s.totalKeystrokes ? Math.round(s.totalKeystrokes * 0.7) : 0),
      'Total Keystrokes': s.totalKeystrokes || 0,
      'Final Submission Time': formatIndianTimestamp(s.submittedAt),
    };
  });

  // 4. Prepare Sheet 3: Assessment Summary & Statistics
  const presentCount = sortedSubmissions.filter((s) => {
    const prn = String(s.studentPrn || s.prn || '').toUpperCase().trim();
    return s.attendanceStatus === 'PRESENT' || (
      typeof window !== 'undefined' && localStorage.getItem(`logicq_lab_attendance_${test?.id}_${prn}`) === 'PRESENT'
    );
  }).length;
  const absentCount = sortedSubmissions.length - presentCount;

  const completedCount = sortedSubmissions.filter((s) => s.q1 && s.q2).length;
  const partialCount = sortedSubmissions.filter((s) => (s.q1 && !s.q2) || (!s.q1 && s.q2)).length;
  const inProgressCount = sortedSubmissions.length - completedCount - partialCount;

  const flaggedCount = sortedSubmissions.filter((s) => computeIntegrityVerdict(s) === 'FLAGGED').length;
  const suspiciousCount = sortedSubmissions.filter((s) => computeIntegrityVerdict(s) === 'SUSPICIOUS').length;
  const cleanCount = sortedSubmissions.filter((s) => computeIntegrityVerdict(s) === 'CLEAN').length;

  const scores = sortedSubmissions.map((s) => {
    const q1 = s.q1 ? Number(s.q1.academicScore != null ? s.q1.academicScore : 5) : 0;
    const q2 = s.q2 ? Number(s.q2.academicScore != null ? s.q2.academicScore : 5) : 0;
    return s.academicScore != null ? Number(s.academicScore) : (q1 + q2);
  });
  const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : '0';
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

  const summarySheetRows = [
    { 'Metric': 'Assessment Title', 'Details': test.title || 'Continuous Practical Evaluation' },
    { 'Metric': 'Target Section', 'Details': test.sectionTarget || 'Integrated Mtech' },
    { 'Metric': 'Total Enrolled Cohort', 'Details': sortedSubmissions.length },
    { 'Metric': 'Verified Present in Lab', 'Details': `${presentCount} Students` },
    { 'Metric': 'Absent / Unverified', 'Details': `${absentCount} Students` },
    { 'Metric': 'Fully Completed (Q1 & Q2)', 'Details': completedCount },
    { 'Metric': 'Partially Completed', 'Details': partialCount },
    { 'Metric': 'In Progress / Awaiting Submission', 'Details': inProgressCount },
    { 'Metric': 'Flagged Cheating Breaches', 'Details': `${flaggedCount} Students` },
    { 'Metric': 'Suspicious Proctoring Alerts', 'Details': `${suspiciousCount} Students` },
    { 'Metric': 'Verified Clean Submissions', 'Details': `${cleanCount} Students` },
    { 'Metric': 'Maximum Possible Marks', 'Details': `${totalTestMarks} Marks` },
    { 'Metric': 'Cohort Highest Score', 'Details': `${maxScore} / ${totalTestMarks}` },
    { 'Metric': 'Cohort Average Score', 'Details': `${avgScore} / ${totalTestMarks}` },
    { 'Metric': 'Report Generated At', 'Details': formatIndianTimestamp(Date.now()) },
    { 'Metric': 'Institution', 'Details': 'Sanjivani University - Department of Engineering & Technology' },
    { 'Metric': 'Proctoring System', 'Details': 'LogicQ Smart Continuous Proctoring & Real-Time Integrity Mesh' },
  ];

  // 5. Build Workbook
  const wb = XLSX.utils.book_new();

  // Sheet 1
  const ws1 = XLSX.utils.json_to_sheet(marksSheetRows);
  ws1['!cols'] = calculateAutoFitColumns(marksSheetRows, 4);
  XLSX.utils.book_append_sheet(wb, ws1, 'Continuous Evaluation Marks');

  // Sheet 2
  const ws2 = XLSX.utils.json_to_sheet(telemetrySheetRows);
  ws2['!cols'] = calculateAutoFitColumns(telemetrySheetRows, 4);
  XLSX.utils.book_append_sheet(wb, ws2, 'Integrity & Proctoring Audit');

  // Sheet 3
  const ws3 = XLSX.utils.json_to_sheet(summarySheetRows);
  ws3['!cols'] = [{ wch: 34 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Assessment Summary');

  // 6. Download file
  const cleanTitle = (test.title || 'Continuous_Practical_Evaluation').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
  const fileName = `${cleanTitle}_Official_Mark_List.xlsx`;
  XLSX.writeFile(wb, fileName);
}
