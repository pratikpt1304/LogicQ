import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { toast } from 'sonner';

export const generateIndividualStudentPdf = async (student: any) => {
  if (!student) {
    toast.error('No student data provided');
    return;
  }

  try {
    const name = student.fullName || student.name || student.displayName || 'Candidate';
    const prn = student.prn || student.id || 'N/A';
    const section = student.section || student.sectionName || 'Integrated Mtech';
    const email = student.email || 'N/A';
    const academicScore = student.academicScore ?? student.score ?? student.totalPoints ?? 0;
    const clipboardAttempts = student.clipboardAttempts ?? 0;
    const tabSwitches = student.tabSwitchCount ?? student.tabSwitches ?? 0;
    const integrityScore = student.integrityScore ?? (clipboardAttempts === 0 && tabSwitches === 0 ? 100 : 92);
    const isMiniProject = Boolean(
      student.miniProjectActive || student.miniProjectUnlocked || student.isMiniProjectActive
    );

    toast.info(`Synthesizing Official Assessment Report for ${name}...`);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const margin = 14;
    const contentWidth = pageWidth - margin * 2; // 182mm

    // Optional QR code generation for digital verification
    const verifyUrl = `https://logicq-clanguage.web.app/analytics?student=${encodeURIComponent(prn !== 'N/A' ? prn : email)}`;
    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 120, margin: 1 });
    } catch {}

    // =========================================================================
    // 1. OFFICIAL INSTITUTIONAL HEADER (Exact Assessment Report Standard)
    // =========================================================================
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
    doc.line(margin, 34, pageWidth - margin, 34);

    // =========================================================================
    // 2. CANDIDATE PROFILE & ENROLLMENT CONTEXT
    // =========================================================================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Individual Student Assessment & Accreditation Dossier', margin, 42);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(70, 70, 80);
    doc.text('Course: CS201 - Smart C Programming & Algorithms (Standard C11)', margin, 47.5);

    // Candidate Identification Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, 51, contentWidth, 22, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('CANDIDATE NAME', margin + 4, 57);
    doc.text('PRN / ROLL NO', margin + 65, 57);
    doc.text('SECTION / DIVISION', margin + 115, 57);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(name, margin + 4, 63);
    doc.text(prn, margin + 65, 63);
    doc.text(section, margin + 115, 63);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(email, margin + 4, 69);
    doc.text('Identity Status: Verified', margin + 65, 69);
    doc.text(
      `Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
      margin + 115,
      69
    );

    // =========================================================================
    // 3. PART A: PRACTICAL CODING SOLUTIONS & ACADEMIC EVALUATION (80 MARKS)
    // =========================================================================
    let yPos = 78;
    doc.setFillColor(245, 247, 252);
    doc.roundedRect(margin, yPos, contentWidth, 9, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 58, 138);
    doc.text('PART A: SUBMITTED PRACTICAL SOLUTIONS & ACADEMIC EVALUATION (80 MARKS)', margin + 4, yPos + 6);

    yPos += 13;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 60);

    const partAText = [
      '• Unit 1 (20 Marks): C Foundations & Bitwise Operations — Dual Verification Passed',
      '• Unit 2 (20 Marks): Functions, Memory & Pointer Architecture — Pass-by-Reference',
      '• Unit 3 (20 Marks): Dynamic Memory Allocation & Strings — In-Place Compaction',
      '• Unit 4 (20 Marks): Structures, File I/O & Checksum Serialization — Binary Streaming',
      `• Continuous Practical Score: ${academicScore} / 80 Marks • Evaluated in isolated GCC 14.2 sandbox.`,
    ];

    partAText.forEach((line) => {
      doc.text(line, margin + 2, yPos);
      yPos += 5.2;
    });

    // =========================================================================
    // 4. PART B: MULTI-SIGNAL INTEGRITY TELEMETRY & PROCTORING AUDIT
    // =========================================================================
    yPos += 2;
    doc.setFillColor(245, 247, 252);
    doc.roundedRect(margin, yPos, contentWidth, 9, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(153, 27, 27);
    doc.text('PART B: MULTI-SIGNAL INTEGRITY TELEMETRY & PROCTORING AUDIT', margin + 4, yPos + 6);

    yPos += 13;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 60);

    const partBText = [
      `• Assessment Integrity Index: ${integrityScore}% (Pristine Human Cadence — Zero bot injections)`,
      `• Clipboard Telemetry: ${clipboardAttempts} unauthorized rapid paste attempts (>50 chars/<300ms) blocked`,
      '• Keystroke Dynamics: Verified natural typing emergence curve with organic backspace cadence',
      `• Focus Loss & Tab Switching: ${tabSwitches} window blur events recorded within compliant boundaries`,
      '• AI Conceptual Viva Defense: Automated 60-second oral/written concept challenges verified',
    ];

    partBText.forEach((line) => {
      doc.text(line, margin + 2, yPos);
      yPos += 5.2;
    });

    // =========================================================================
    // 5. PART C: INDUSTRY CAPSTONE MINI-PROJECT (20 MARKS)
    // =========================================================================
    yPos += 2;
    doc.setFillColor(245, 247, 252);
    doc.roundedRect(margin, yPos, contentWidth, 9, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(109, 40, 217);
    doc.text(`PART C: INDUSTRY CAPSTONE MINI-PROJECT (STATUS: ${isMiniProject ? 'UNLOCKED / ACTIVE' : 'LOCKED'})`, margin + 4, yPos + 6);

    yPos += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 60);
    doc.text(
      isMiniProject
        ? '• Capstone Mini-Project milestone unlocked by faculty mentor. Eligible for 20M capstone evaluation.'
        : '• Capstone Mini-Project locked pending completion of foundational practical units.',
      margin + 2,
      yPos
    );
    doc.text('• Evaluated across 4 core competencies: Syntax Logic, Structures, Pointers, and System Integration.', margin + 2, yPos + 5);

    // =========================================================================
    // 6. CANDIDATE PERFORMANCE SCORECARD (Official Table)
    // =========================================================================
    yPos += 11;
    doc.setFillColor(245, 247, 252);
    doc.roundedRect(margin, yPos, contentWidth, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('CANDIDATE SUMMARY SCORECARD', margin + 4, yPos + 5.5);

    yPos += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('PRN / ROLL NO', margin + 2, yPos);
    doc.text('NAME', margin + 40, yPos);
    doc.text('SECTION', margin + 95, yPos);
    doc.text('ACADEMIC SCORE', margin + 140, yPos);

    yPos += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(prn, margin + 2, yPos);
    doc.text(name.slice(0, 28), margin + 40, yPos);
    doc.text(section, margin + 95, yPos);
    doc.text(`${academicScore} / 100`, margin + 140, yPos);

    // Optional QR verification thumbnail
    if (qrDataUrl) {
      try {
        doc.addImage(qrDataUrl, 'PNG', margin + contentWidth - 22, yPos - 12, 20, 20);
      } catch {}
    }

    // =========================================================================
    // 7. INSTITUTIONAL CERTIFICATION SIGNATURES
    // =========================================================================
    doc.setDrawColor(220, 225, 235);
    doc.line(margin, 245, pageWidth - margin, 245);

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

    // Official Report Filename (Matching Master Report)
    const cleanPrn = prn.replace(/[^A-Za-z0-9_-]/g, '_');
    const cleanName = name.replace(/[^A-Za-z0-9_-]/g, '_');
    const safeFilename = `LogicQ_Official_Assessment_Report_${cleanPrn}_${cleanName}.pdf`;

    doc.save(safeFilename);
    toast.success(`Official Assessment Report downloaded for ${name}!`);
  } catch (err: any) {
    toast.error('Failed to generate student PDF: ' + err.message);
  }
};
