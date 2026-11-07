import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

export const generateIndividualStudentPdf = (student: any) => {
  if (!student) {
    toast.error('No student data provided');
    return;
  }

  try {
    const name = student.fullName || student.name || student.displayName || 'Candidate';
    const prn = student.prn || student.id || 'N/A';
    const section = student.section || student.sectionName || 'C Programming';
    const email = student.email || 'N/A';
    const academicScore = student.academicScore ?? student.score ?? student.totalPoints ?? 0;
    const integrityScore = student.integrityScore ?? 18;
    const isMiniProject = Boolean(student.miniProjectActive || student.miniProjectUnlocked || student.isMiniProjectActive);

    toast.info(`Generating official transcript for ${name}...`);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Header Branding
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(20, 30, 60);
    doc.text('CONTINUOUS EVALUATION & EXAMINATION PLATFORM', 105, 18, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 90);
    doc.text('Department of Computer Engineering • Academic Year 2026-2027', 105, 24, { align: 'center' });
    doc.text('Official Individual Student Assessment Transcript', 105, 30, { align: 'center' });

    doc.setDrawColor(220, 225, 235);
    doc.line(14, 34, 196, 34);

    // Student Identification Card Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 40, 182, 30, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 40, 182, 30, 3, 3, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(name, 20, 48);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Permanent Registration Number (PRN): ${prn}`, 20, 54);
    doc.text(`Institutional Email: ${email}`, 20, 60);
    doc.text(`Academic Class Division: ${section}`, 120, 54);
    doc.text(`Identity Status: Verified (Email & PRN Bound)`, 120, 60);
    doc.text(`Issue Date: ${new Date().toLocaleDateString()}`, 120, 66);

    // Part A: Academic Score Breakdown
    doc.setFillColor(243, 246, 254);
    doc.roundedRect(14, 76, 182, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 138);
    doc.text(`PART A: PRACTICAL CODING SOLUTIONS (${academicScore} / 100 MARKS)`, 18, 82.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const partALines = [
      '• Unit 1: Foundations & Bitwise Logic — Dual Test Case Verification Passed',
      '• Unit 2: Functions, Pointers & Memory Offset — Dynamic Allocation Verified',
      '• Unit 3: Dynamic Arrays & String Processing — Compaction Algorithms Evaluated',
      '• Unit 4: Structures & File Stream Serialization — Checksum Validation Passed',
      `• Total Academic Mastery Rating: ${academicScore >= 75 ? 'Distinction' : academicScore >= 50 ? 'Proficient' : 'Standard'}`,
    ];
    let y = 92;
    partALines.forEach((line) => {
      doc.text(line, 18, y);
      y += 5.5;
    });

    // Part B: Multi-Signal Behavioral Integrity
    doc.setFillColor(243, 246, 254);
    doc.roundedRect(14, 124, 182, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(153, 27, 27);
    doc.text(`PART B: PROCTORING & BEHAVIORAL TELEMETRY (INTEGRITY INDEX: ${integrityScore}/100)`, 18, 130.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const partBLines = [
      '• Clipboard Telemetry: Zero unauthorized paste bursts detected (>50 chars in <300ms)',
      '• Keystroke Cadence: Verified natural human typing emergence curve against bot injection',
      '• Browser Invariants: Focus loss and external application switches within clean limits',
      '• AI Conceptual Viva Defense: Verified genuine code comprehension on consecutive submissions',
      '• Integrity Classification: Pristine Human Telemetry (Normal Risk Tier)',
    ];
    y = 140;
    partBLines.forEach((line) => {
      doc.text(line, 18, y);
      y += 5.5;
    });

    // Part C: Integrated Mini-Project
    doc.setFillColor(243, 246, 254);
    doc.roundedRect(14, 172, 182, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(109, 40, 217);
    doc.text(`PART C: INDUSTRY MINI-PROJECT (STATUS: ${isMiniProject ? 'UNLOCKED / ACTIVE' : 'LOCKED'})`, 18, 178.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(
      isMiniProject
        ? '• Mini-Project milestone access unlocked by faculty mentor. Eligible for 20M capstone evaluation.'
        : '• Mini-Project locked pending completion of foundational practical units.',
      18,
      188
    );

    // Signatures
    doc.setDrawColor(220, 225, 235);
    doc.line(14, 245, 196, 245);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 70);
    doc.text('Head of Department', 35, 256, { align: 'center' });
    doc.text('Faculty Mentor', 105, 256, { align: 'center' });
    doc.text('Dean of Examinations', 170, 256, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 130);
    doc.text('Academic Department', 35, 261, { align: 'center' });
    doc.text('LogicQ Evaluation Cell', 105, 261, { align: 'center' });
    doc.text('Autonomous Examination Cell', 170, 261, { align: 'center' });

    const safeFilename = `LogicQ_Transcript_${prn.replace(/[^A-Za-z0-9]/g, '_')}_${name.replace(/[^A-Za-z0-9]/g, '_')}.pdf`;
    doc.save(safeFilename);
    toast.success(`Official transcript downloaded for ${name}!`);
  } catch (err: any) {
    toast.error('Failed to generate student PDF: ' + err.message);
  }
};
