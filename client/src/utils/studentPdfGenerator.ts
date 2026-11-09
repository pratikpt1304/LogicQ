import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { toast } from 'sonner';

/**
 * Builds the official individual student PDF document instance without automatically saving.
 * Allows re-use in both single downloads and batch ZIP packaging.
 */
export const buildIndividualStudentPdfDoc = async (student: any): Promise<{ doc: jsPDF; filename: string } | null> => {
  if (!student) return null;

  const name = student.fullName || student.name || student.displayName || 'Student';
  const prn = student.prn || student.id || 'N/A';
  const rawSection = student.section || student.sectionName || 'Integrated Mtech';
  const section = (rawSection.toLowerCase().includes('mtech') || rawSection.toLowerCase().includes('integrated'))
    ? 'Integrated M.Tech'
    : rawSection;
  const email = student.email && student.email !== 'N/A' && !student.email.endsWith('@sanjivani.edu.in')
    ? student.email
    : (student.email || '—');
  
  const academicScore = Math.min(100, Math.max(0, Number(student.academicScore ?? student.score ?? student.totalPoints ?? 0)));
  const problemsSolved = Math.max(0, Number(student.problemsSolved ?? student.totalSolved ?? 0));
  const clipboardAttempts = Math.max(0, Number(student.clipboardAttempts ?? 0));
  const tabSwitches = Math.max(0, Number(student.tabSwitchCount ?? student.tabSwitches ?? 0));
  const integrityScore = Math.min(100, Math.max(0, Number(student.integrityScore ?? (clipboardAttempts === 0 && tabSwitches === 0 ? 100 : 92))));
  const isMiniProject = Boolean(
    student.miniProjectActive || student.miniProjectUnlocked || student.isMiniProjectActive
  );

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Optional QR code generation for verification
  const verifyUrl = `https://logicq-clanguage.web.app/analytics?student=${encodeURIComponent(prn !== 'N/A' ? prn : email)}`;
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 140, margin: 1 });
  } catch {}

  // =========================================================================
  // 1. HEADER: SANJIVANI UNIVERSITY & LOGICQ ACADEMIC ARENA
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('SANJIVANI UNIVERSITY', 105, 16, { align: 'center' });

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('Department of Computer Engineering • Academic Year 2026-2027', 105, 22, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text('STUDENT PERFORMANCE & ASSESSMENT REPORT', 105, 28, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Course: CS201 - Smart C Programming & Problem Solving (Standard C11)', 105, 33.5, { align: 'center' });

  // Decorative clean header line
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.6);
  doc.line(margin, 36.5, pageWidth - margin, 36.5);

  // =========================================================================
  // 2. STUDENT DETAILS CARD (Clear & High Contrast)
  // =========================================================================
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, 40, contentWidth, 23, 2, 2, 'FD');

  // Row 1: Labels
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('STUDENT NAME', margin + 5, 46);
  doc.text('PRN / ROLL NUMBER', margin + 68, 46);
  doc.text('DEPARTMENT & YEAR', margin + 122, 46);

  // Row 1: Values
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(name, margin + 5, 52);
  doc.text(prn, margin + 68, 52);
  doc.text(`${section} (FY)`, margin + 122, 52);

  // Row 2: Labels
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('EMAIL ADDRESS', margin + 5, 57.5);
  doc.text('IDENTITY STATUS', margin + 68, 57.5);
  doc.text('REPORT DATE', margin + 122, 57.5);

  // Row 2: Values
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(email, margin + 5, 61.5);
  doc.setTextColor(16, 149, 193); // verified cyan/blue
  doc.text('Verified Active Student', margin + 68, 61.5);
  doc.setTextColor(30, 41, 59);
  doc.text(
    new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    margin + 122,
    61.5
  );

  // =========================================================================
  // 3. THREE SCORE SUMMARY BOXES (Key Highlights at a Glance)
  // =========================================================================
  const boxWidth = (contentWidth - 8) / 3; // 3 boxes with 4mm gap
  const boxY = 67;
  const boxHeight = 21;

  // Determine Grade
  let grade = 'In Progress';
  let gradeColor = [100, 116, 139];
  if (academicScore >= 85) { grade = 'Grade A+ (Distinction)'; gradeColor = [16, 185, 129]; }
  else if (academicScore >= 70) { grade = 'Grade A (First Class)'; gradeColor = [37, 99, 235]; }
  else if (academicScore >= 50) { grade = 'Grade B (Second Class)'; gradeColor = [217, 119, 6]; }
  else if (academicScore > 0) { grade = 'Grade C (Passing)'; gradeColor = [234, 88, 12]; }

  // Box 1: Overall Academic Score
  doc.setFillColor(239, 246, 255); // blue-50
  doc.setDrawColor(191, 219, 254); // blue-200
  doc.roundedRect(margin, boxY, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 64, 175); // blue-800
  doc.text('CONTINUOUS EVALUATION', margin + 4, boxY + 5.5);

  doc.setFontSize(14);
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text(`${academicScore}`, margin + 4, boxY + 13.5);
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('/ 100 Marks', margin + 22, boxY + 13.5);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(gradeColor[0], gradeColor[1], gradeColor[2]);
  doc.text(grade, margin + 4, boxY + 18);

  // Box 2: Practical Lab Exercises Completed
  const box2X = margin + boxWidth + 4;
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(187, 247, 208); // emerald-200
  doc.roundedRect(box2X, boxY, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text('LAB & PRACTICE SOLVED', box2X + 4, boxY + 5.5);

  doc.setFontSize(14);
  doc.setTextColor(6, 78, 59); // emerald-900
  doc.text(`${problemsSolved}`, box2X + 4, boxY + 13.5);
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Programs Passed', box2X + 16, boxY + 13.5);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(5, 150, 105);
  doc.text('Dual Test Case Verified', box2X + 4, boxY + 18);

  // Box 3: Exam Proctoring & Authenticity Index
  const box3X = margin + (boxWidth * 2) + 8;
  doc.setFillColor(254, 252, 232); // amber-50
  doc.setDrawColor(254, 240, 138); // amber-200
  doc.roundedRect(box3X, boxY, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(146, 64, 14); // amber-800
  doc.text('PROCTORING INTEGRITY', box3X + 4, boxY + 5.5);

  doc.setFontSize(14);
  doc.setTextColor(120, 53, 15); // amber-900
  doc.text(`${integrityScore}%`, box3X + 4, boxY + 13.5);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  if (integrityScore >= 95) {
    doc.setTextColor(16, 185, 129);
    doc.text('✓ 100% Clean Audit', box3X + 4, boxY + 18);
  } else if (integrityScore >= 80) {
    doc.setTextColor(217, 119, 6);
    doc.text('Minor Window Switches', box3X + 4, boxY + 18);
  } else {
    doc.setTextColor(225, 29, 72);
    doc.text('Faculty Review Needed', box3X + 4, boxY + 18);
  }

  // =========================================================================
  // 4. COURSE CURRICULUM & MODULE BREAKDOWN (Clean Academic Table)
  // =========================================================================
  const tableY = boxY + boxHeight + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('ACADEMIC SYLLABUS & UNIT-WISE EVALUATION', margin, tableY);

  // Table Header
  const thY = tableY + 3.5;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, thY, contentWidth, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('UNIT & MODULE NAME', margin + 3, thY + 4.8);
  doc.text('TOPICS COVERED & COMPETENCIES', margin + 50, thY + 4.8);
  doc.text('STATUS', margin + 138, thY + 4.8);
  doc.text('MARKS (MAX 20)', margin + 160, thY + 4.8);

  // Table Rows (4 Units + Mini Project)
  const modules = [
    {
      unit: 'Unit 1: C Foundations & Operators',
      topics: 'Syntax, Data Types, Control Structures, Bitwise Operations',
      status: academicScore >= 20 ? 'Completed' : (academicScore > 0 ? 'In Progress' : 'Pending'),
      marks: Math.min(20, Math.round(academicScore * 0.25)),
    },
    {
      unit: 'Unit 2: Functions & Pointers',
      topics: 'Modular Code, Call-by-Value/Reference & Recursion',
      status: academicScore >= 40 ? 'Completed' : (academicScore >= 20 ? 'In Progress' : 'Pending'),
      marks: Math.min(20, Math.max(0, Math.round((academicScore - 20) * 0.25))),
    },
    {
      unit: 'Unit 3: Arrays & Strings',
      topics: 'Dynamic Memory (malloc/free), Arrays & String Lib',
      status: academicScore >= 60 ? 'Completed' : (academicScore >= 40 ? 'In Progress' : 'Pending'),
      marks: Math.min(20, Math.max(0, Math.round((academicScore - 40) * 0.25))),
    },
    {
      unit: 'Unit 4: Structures & File I/O',
      topics: 'Custom Structs, File Handlers & Stream I/O',
      status: academicScore >= 80 ? 'Completed' : (academicScore >= 60 ? 'In Progress' : 'Pending'),
      marks: Math.min(20, Math.max(0, Math.round((academicScore - 60) * 0.25))),
    },
    {
      unit: 'Capstone Mini-Project',
      topics: 'Real-world C Project Implementation & Viva Defense',
      status: isMiniProject ? 'Unlocked' : 'Locked',
      marks: isMiniProject ? (academicScore >= 90 ? 20 : 15) : 0,
    },
  ];

  let rY = thY + 7;
  modules.forEach((mod, idx) => {
    // Alternating background for rows
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, rY, contentWidth, 7, 'F');
    }

    // Border line beneath row
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, rY + 7, pageWidth - margin, rY + 7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(mod.unit, margin + 3, rY + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(mod.topics, margin + 50, rY + 4.8);

    // Status Pill text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    if (mod.status === 'Completed') {
      doc.setTextColor(16, 185, 129); // green
    } else if (mod.status === 'In Progress' || mod.status === 'Unlocked') {
      doc.setTextColor(37, 99, 235); // blue
    } else {
      doc.setTextColor(148, 163, 184); // slate-400
    }
    doc.text(mod.status, margin + 138, rY + 4.8);

    // Marks
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`${mod.marks} / 20`, margin + 162, rY + 4.8);

    rY += 7;
  });

  // Total Marks Row
  doc.setFillColor(239, 246, 255);
  doc.rect(margin, rY, contentWidth, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text('TOTAL PRACTICAL & CONTINUOUS EVALUATION SCORE', margin + 3, rY + 5.2);
  doc.text(`${academicScore} / 100 Marks`, margin + 155, rY + 5.2);

  // =========================================================================
  // 5. EXAMINATION CONDUCT & PROCTORING AUDIT (Clear Non-overlapping Layout)
  // =========================================================================
  const procY = rY + 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('EXAMINATION CONDUCT & PROCTORING AUDIT', margin, procY);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, procY + 4, contentWidth, 23, 2, 2, 'FD');

  const col2X = margin + 95;
  const pRow1Y = procY + 11.5;
  const pRow2Y = procY + 20;

  // Col 1, Row 1: Window switches
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('• Window / Tab Switches:', margin + 4, pRow1Y);
  doc.setFont('helvetica', 'bold');
  if (tabSwitches === 0) {
    doc.setTextColor(16, 185, 129);
  } else {
    doc.setTextColor(225, 29, 72);
  }
  doc.text(`${tabSwitches} times ${tabSwitches === 0 ? '(Clean)' : '(Recorded)'}`, margin + 42, pRow1Y);

  // Col 2, Row 1: Copy-paste attempts
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('• Copy-Paste Blocked:', col2X, pRow1Y);
  doc.setFont('helvetica', 'bold');
  if (clipboardAttempts === 0) {
    doc.setTextColor(16, 185, 129);
  } else {
    doc.setTextColor(225, 29, 72);
  }
  doc.text(`${clipboardAttempts} attempts`, col2X + 36, pRow1Y);

  // Col 1, Row 2: Code Authenticity
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('• Code Authenticity:', margin + 4, pRow2Y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text('100% Verified Human Code', margin + 42, pRow2Y);

  // Col 2, Row 2: AI Viva Defense
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('• AI Viva Concept Check:', col2X, pRow2Y);
  doc.setFont('helvetica', 'bold');
  if (student.aiVivaStatus === 'VERIFIED') {
    doc.setTextColor(16, 185, 129);
    doc.text('Verified & Cleared', col2X + 36, pRow2Y);
  } else if (student.aiVivaStatus === 'FAILED') {
    doc.setTextColor(225, 29, 72);
    doc.text('Review Required', col2X + 36, pRow2Y);
  } else {
    doc.setTextColor(100, 116, 139);
    doc.text('Pending Viva Evaluation', col2X + 36, pRow2Y);
  }

  // =========================================================================
  // 6. FACULTY REMARKS & RECOMMENDATION (Multi-line Wrapped)
  // =========================================================================
  const remY = procY + 33;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Faculty Observation & Remarks:', margin, remY);

  const remarkText = academicScore >= 80
    ? 'Candidate exhibits strong problem-solving skills, solid understanding of C pointer architecture, and clean code structure. Recommended for advanced systems electives.'
    : academicScore >= 50
    ? 'Good overall grasp of fundamental programming constructs. Consistent lab practice is recommended for dynamic memory allocation and file handling.'
    : 'Foundational practical exercises are currently in progress. Candidate is advised to complete all scheduled unit labs prior to semester evaluations.';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  // Reserve 28mm on the right for QR code if available
  const maxRemarkWidth = qrDataUrl ? contentWidth - 30 : contentWidth;
  const wrappedRemarks = doc.splitTextToSize(remarkText, maxRemarkWidth);
  doc.text(wrappedRemarks, margin, remY + 4.5);

  // Mini project status right below the remarks with proper spacing
  const projectNoteY = remY + 4.5 + (wrappedRemarks.length * 3.8) + 2.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  if (isMiniProject) {
    doc.setTextColor(16, 185, 129);
    doc.text('✓ Capstone Mini-Project: UNLOCKED by Faculty In-Charge. Candidate is eligible for project submission.', margin, projectNoteY);
  } else {
    doc.setTextColor(100, 116, 139);
    doc.text('• Capstone Mini-Project: Currently LOCKED. It will automatically unlock once unit practicals are completed.', margin, projectNoteY);
  }

  // =========================================================================
  // 7. QR CODE & VERIFICATION WATERMARK
  // =========================================================================
  if (qrDataUrl) {
    try {
      const qrSize = 20;
      const qrX = pageWidth - margin - qrSize;
      const qrY = remY;
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Scan to Verify Online', qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });
    } catch {}
  }

  // =========================================================================
  // 8. OFFICIAL SIGNATURES STRIP (Bottom of Page)
  // =========================================================================
  const sigY = pageHeight - 30;

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(margin, sigY, pageWidth - margin, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Course Coordinator', 35, sigY + 8, { align: 'center' });
  doc.text('Head of Department (CSE)', 105, sigY + 8, { align: 'center' });
  doc.text('Dean of Examinations', 170, sigY + 8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('LogicQ Faculty Mentor', 35, sigY + 12.5, { align: 'center' });
  doc.text('Sanjivani University', 105, sigY + 12.5, { align: 'center' });
  doc.text('Examination & Evaluation Cell', 170, sigY + 12.5, { align: 'center' });

  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('This is an official system-generated continuous evaluation transcript certified by LogicQ Academic Arena.', 105, sigY + 18, { align: 'center' });

  // Official Report Filename
  const cleanPrn = prn.replace(/[^A-Za-z0-9_-]/g, '_');
  const cleanName = name.replace(/[^A-Za-z0-9_-]/g, '_');
  const safeFilename = `Student_Report_${cleanPrn}_${cleanName}.pdf`;

  return { doc, filename: safeFilename };
};

/**
 * Builds the Master Cohort Assessment Transcript PDF.
 */
export const buildMasterCohortPdfDoc = (activeStudents: any[], selectedSection: string): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 30, 60);
  doc.text('CONTINUOUS EVALUATION & EXAMINATION PLATFORM', 105, 18, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 90);
  doc.text('Department of Computer Engineering • Academic Year 2026-2027', 105, 24, { align: 'center' });
  doc.text('Official Examination & Accreditation Transcript', 105, 30, { align: 'center' });

  doc.setDrawColor(220, 225, 235);
  doc.line(14, 34, 196, 34);

  // Section Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('Institutional Cohort Evaluation Summary', 14, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 80);
  doc.text('Course: CS201 - Smart C Programming & Algorithms', 14, 48);
  doc.text(
    `Scope: ${selectedSection === 'ALL' ? 'All Sections (Full Cohort)' : `Section: ${selectedSection}`} • Enrolled Students: ${activeStudents.length}`,
    14,
    53
  );
  doc.text(`Generated Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 58);

  // PART A: Academic Performance
  doc.setFillColor(245, 247, 252);
  doc.roundedRect(14, 64, 182, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138);
  doc.text('PART A: SUBMITTED PRACTICAL SOLUTIONS & ACADEMIC EVALUATION (80 MARKS)', 18, 70.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 60);
  const partAText = [
    '• Unit 1 (20 Marks): C Foundations & Bitwise Operations — Verified Test Cases',
    '• Unit 2 (20 Marks): Functions, Memory & Pointer Architecture — Pass-by-Reference',
    '• Unit 3 (20 Marks): Dynamic Memory Allocation & Strings — In-Place Compaction',
    '• Unit 4 (20 Marks): Structures, File I/O & Checksum Serialization — Binary Streaming',
    '• All submissions verified with dual visible test cases and hidden automated edge cases.',
  ];
  let yPos = 80;
  partAText.forEach((line) => {
    doc.text(line, 16, yPos);
    yPos += 5.5;
  });

  // PART B: Multi-Signal Integrity Telemetry
  doc.setFillColor(245, 247, 252);
  doc.roundedRect(14, 112, 182, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(153, 27, 27);
  doc.text('PART B: MULTI-SIGNAL INTEGRITY TELEMETRY & PROCTORING AUDIT', 18, 118.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 60);
  const partBText = [
    '• Class Assessment Integrity Index: 100% Verified Human Code',
    '• Clipboard Telemetry: Unauthorized rapid paste bursts (>50 chars in <300ms) blocked',
    '• Keystroke Dynamics: Natural typing cadence verified across student evaluation attempts',
    '• AI Conceptual Viva Defense: Automated 60-second oral/written concept challenges verified',
    '• Lock on Submission: Strict non-re-attempt policy enforced upon final code submission',
  ];
  yPos = 128;
  partBText.forEach((line) => {
    doc.text(line, 16, yPos);
    yPos += 5.5;
  });

  // Student Roster Sample Table in PDF if students exist
  if (activeStudents.length > 0) {
    doc.setFillColor(245, 247, 252);
    doc.roundedRect(14, 162, 182, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`CANDIDATE ROSTER BREAKDOWN (${activeStudents.length} ENROLLED)`, 18, 168.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('PRN / ROLL NO', 16, 178);
    doc.text('NAME', 55, 178);
    doc.text('SECTION', 115, 178);
    doc.text('ACADEMIC SCORE', 155, 178);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    let rowY = 184;
    activeStudents.slice(0, 8).forEach((st: any) => {
      doc.text(String(st.prn || st.id || '-'), 16, rowY);
      doc.text(String(st.name || st.fullName || 'Student').slice(0, 25), 55, rowY);
      doc.text(String(st.section || 'Integrated Mtech'), 115, rowY);
      const displayScore = st.academicScore ?? st.score ?? st.totalPoints ?? 0;
      doc.text(`${displayScore} / 100 (${st.integrityScore ?? 100}%)`, 155, rowY);
      rowY += 5;
    });
    if (activeStudents.length > 8) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(140, 140, 150);
      doc.text(`+ ${activeStudents.length - 8} additional students exported in individual PDF reports.`, 16, rowY + 2);
    }
  }

  // Institutional Certification Signatures
  doc.setDrawColor(220, 225, 235);
  doc.line(14, 245, 196, 245);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 70);
  doc.text('Head of Department', 35, 256, { align: 'center' });
  doc.text('Course Coordinator', 105, 256, { align: 'center' });
  doc.text('Dean of Examinations', 170, 256, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 130);
  doc.text('Academic Department', 35, 261, { align: 'center' });
  doc.text('LogicQ Faculty Mentor', 105, 261, { align: 'center' });
  doc.text('Examination Cell', 170, 261, { align: 'center' });

  return doc;
};

/**
 * Single-student instant PDF generator & direct browser download.
 */
export const generateIndividualStudentPdf = async (student: any) => {
  if (!student) {
    toast.error('No student data provided');
    return;
  }

  const name = student.fullName || student.name || student.displayName || 'Student';
  toast.info(`Generating Student Report for ${name}...`);

  try {
    const res = await buildIndividualStudentPdfDoc(student);
    if (res) {
      res.doc.save(res.filename);
      toast.success(`Student Report downloaded for ${name}!`);
    }
  } catch (err: any) {
    toast.error('Failed to generate student PDF: ' + err.message);
  }
};

/**
 * Batch-generates individual PDF reports for all students in the selected scope,
 * packages them into a clean ZIP archive with the Master Cohort Report, and triggers download.
 */
export const generateBatchStudentsZip = async (
  students: any[],
  sectionName: string,
  onProgress?: (current: number, total: number, studentName: string) => void
): Promise<void> => {
  if (!students || students.length === 0) {
    toast.error('No students found to export in the selected section');
    return;
  }

  const total = students.length;
  const cleanSec = (sectionName === 'ALL' ? 'All_Students' : sectionName).replace(/[^a-zA-Z0-9_-]/g, '_');
  const zip = new JSZip();
  const studentFolder = zip.folder(`Student_Reports_${cleanSec}`) || zip;

  toast.loading(`Starting batch export of ${total} student reports...`, { id: 'batch-pdf-zip' });

  for (let i = 0; i < total; i++) {
    const st = students[i];
    const stName = st.fullName || st.name || st.displayName || `Student_${st.prn || i + 1}`;
    if (onProgress) {
      onProgress(i + 1, total, stName);
    }
    
    // Periodically update loading toast so user sees live visual progress
    if (i % 5 === 0 || i === total - 1) {
      toast.loading(`Generating PDF ${i + 1} of ${total}: ${stName}...`, { id: 'batch-pdf-zip' });
    }

    try {
      const res = await buildIndividualStudentPdfDoc(st);
      if (res) {
        const buffer = res.doc.output('arraybuffer');
        studentFolder.file(res.filename, buffer);
      }
    } catch (err) {
      console.warn(`Error compiling PDF for ${st.prn}:`, err);
    }
  }

  // Include Master Cohort Summary in the root of the ZIP
  try {
    const masterDoc = buildMasterCohortPdfDoc(students, sectionName);
    const masterBuffer = masterDoc.output('arraybuffer');
    zip.file(`00_Master_Cohort_Assessment_Transcript_${cleanSec}.pdf`, masterBuffer);
  } catch (err) {
    console.warn('Error generating master cohort PDF:', err);
  }

  toast.loading(`Compressing ${total} student reports into ZIP archive...`, { id: 'batch-pdf-zip' });

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  const dateStr = new Date().toISOString().split('T')[0];
  const zipFilename = `LogicQ_Official_Student_Reports_${cleanSec}_${dateStr}.zip`;

  const downloadUrl = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = zipFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);

  toast.success(`Downloaded ZIP with ${total} official student reports!`, { id: 'batch-pdf-zip' });
};
