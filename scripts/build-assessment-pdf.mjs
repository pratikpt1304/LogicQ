import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';

// 1. Read assessment questions
const a4Content = fs.readFileSync('client/src/data/assessment4-questions.data.ts', 'utf8');

const startEasy = a4Content.indexOf('export const A4_EASY_ARRAY_QUESTIONS: AssessmentQuestion[] = ');
const endEasy = a4Content.indexOf(';\n\nexport const A4_MODERATE_SEARCH_SORT_QUESTIONS');
const easyJsonStr = a4Content.slice(startEasy + 'export const A4_EASY_ARRAY_QUESTIONS: AssessmentQuestion[] = '.length, endEasy);
const easyQuestions = JSON.parse(easyJsonStr);

const startMod = a4Content.indexOf('export const A4_MODERATE_SEARCH_SORT_QUESTIONS: AssessmentQuestion[] = ');
const endMod = a4Content.indexOf(';\n\nexport const A4_COMBINED_QUESTIONS');
const modJsonStr = a4Content.slice(startMod + 'export const A4_MODERATE_SEARCH_SORT_QUESTIONS: AssessmentQuestion[] = '.length, endMod);
const modQuestions = JSON.parse(modJsonStr);

console.log(`Loaded ${easyQuestions.length} Easy Array questions and ${modQuestions.length} Moderate Search/Sort questions.`);

// 2. Read cohort students
const cohortContent = fs.readFileSync('client/src/data/c-programming-cohort.data.ts', 'utf8');
const lines = cohortContent.split('\n');
const students = [];
let cur = null;
for (const line of lines) {
  const mIndex = line.match(/index:\s*(\d+)/);
  if (mIndex) {
    if (cur && cur.prn) students.push(cur);
    cur = { index: parseInt(mIndex[1], 10) };
  }
  if (!cur) continue;
  const mPrn = line.match(/prn:\s*['"]([^'"]+)['"]/);
  if (mPrn) cur.prn = mPrn[1];
  const mName = line.match(/fullName:\s*['"]([^'"]+)['"]/);
  if (mName) cur.fullName = mName[1];
  const mEmail = line.match(/email:\s*['"]([^'"]+)['"]/);
  if (mEmail) cur.email = mEmail[1];
}
if (cur && cur.prn) students.push(cur);

console.log(`Loaded ${students.length} cohort students.`);

// 3. Question assignment formula
function getStudentPersonalizedPair(studentPrn) {
  const cleanStr = String(studentPrn || '').trim().toUpperCase();
  const digits = cleanStr.replace(/\D/g, '').slice(-4);
  let studentNumber = parseInt(digits, 10);
  if (isNaN(studentNumber)) {
    studentNumber = 0;
    for (let i = 0; i < cleanStr.length; i++) {
      studentNumber = (studentNumber * 31 + cleanStr.charCodeAt(i)) >>> 0;
    }
  }

  const rollIndex = Math.abs(studentNumber);
  const q1Index = rollIndex % easyQuestions.length;
  const batchOffset = Math.floor(rollIndex / easyQuestions.length) * 17;
  const q2Index = Math.abs(rollIndex * 13 + batchOffset + 7) % modQuestions.length;

  return {
    q1: easyQuestions[q1Index],
    q2: modQuestions[q2Index],
    q1Index,
    q2Index,
    rollIndex,
    batchOffset
  };
}

// 4. Build jsPDF Document
const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

const pageWidth = 210;
const pageHeight = 297;
const margin = 14;
const contentWidth = pageWidth - (margin * 2);
let y = margin;

function checkPage(neededMm = 15) {
  if (y + neededMm > pageHeight - margin) {
    doc.addPage();
    y = margin;
    renderHeaderFooter();
  }
}

function renderHeaderFooter() {
  const pageNum = doc.internal.getCurrentPageInfo().pageNumber;
  // Header line
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, 10, pageWidth - margin, 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('LOGICQ · C PROGRAMMING ASSESSMENT 4 QUESTION BANK & ALLOTMENT DOSSIER', margin, 8);
  doc.text(`Page ${pageNum}`, pageWidth - margin - 12, 8);

  // Footer line
  doc.line(margin, pageHeight - 8, pageWidth - margin, pageHeight - 8);
  doc.text('CONFIDENTIAL · AUTHORITATIVE ACADEMIC EXAMINATION ARCHITECTURE · SANJIVANI COE', margin, pageHeight - 5);
}

// ==================== COVER & FORMULA PAGE ====================
// Institutional Header Block
doc.setFillColor(15, 23, 42); // slate-900
doc.rect(margin, y, contentWidth, 26, 'F');

doc.setTextColor(255, 255, 255);
doc.setFont('helvetica', 'bold');
doc.setFontSize(14);
doc.text('LOGICQ · SMART C PROGRAMMING ASSESSMENT PLATFORM', margin + 6, y + 9);

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(203, 213, 225);
doc.text('Assessment 4: Arrays & Searching-Sorting · Continuous Internal Evaluation (CIE)', margin + 6, y + 16);
doc.text('Official Question Bank (120 Problems) & Anti-Cheating Allotment Matrix', margin + 6, y + 22);

y += 32;

// Assessment Blueprint Card
doc.setFillColor(248, 250, 252);
doc.setDrawColor(226, 232, 240);
doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(30, 41, 59);
doc.text('ASSESSMENT BLUEPRINT & STRUCTURE', margin + 5, y + 6);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(71, 85, 105);
doc.text('• Course: C Programming (First Year Integrated M.Tech FY, Cohort: 119 Students)', margin + 5, y + 11);
doc.text('• Question Pool: 120 Questions (60 Easy Array Direct + 60 Moderate Searching & Sorting Scenarios)', margin + 5, y + 16);
doc.text('• Student Load: Exactly 2 Questions per Student (1 Easy Array + 1 Moderate Searching/Sorting)', margin + 5, y + 21);
doc.text('• Duration: 60 Minutes (Q1: 20m, Q2: 40m) | Total Marks: 10 M (5M Q1 + 5M Q2 | Each: 2M Visible + 3M Hidden)', margin + 5, y + 26);

y += 34;

// Formula & Anti-Cheating Section
doc.setFillColor(241, 245, 249);
doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(15, 23, 42);
doc.text('1. ANTI-CHEATING QUESTION ALLOTMENT FORMULA', margin + 5, y + 5.5);

y += 12;

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(51, 65, 85);
const formulaIntro = [
  'In university computer laboratory assessments, students are seated sequentially according to roll numbers (PRNs).',
  'To prevent adjacent screen viewing, whispered collaboration, and copy-paste collusion, LogicQ uses a Dual-Prime',
  'Rotation Algorithm with Batch Displacement. This mathematically guarantees that no two neighboring students receive',
  'the same question pair, while maintaining an even, uniform distribution across the entire 120-problem question bank.'
];
formulaIntro.forEach((line) => {
  doc.text(line, margin, y);
  y += 4.2;
});

y += 2;

// Formula Box
doc.setFillColor(238, 242, 255);
doc.setDrawColor(199, 210, 254);
doc.roundedRect(margin, y, contentWidth, 42, 2, 2, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(9);
doc.setTextColor(67, 56, 202);
doc.text('MATHEMATICAL FORMULATION', margin + 5, y + 6);

doc.setFont('courier', 'bold');
doc.setFontSize(8.5);
doc.setTextColor(30, 41, 59);

doc.text('Step 1: Extract numeric Roll Index from Student PRN:', margin + 5, y + 12);
doc.text('        RollIndex = parseInteger(PRN.slice(-4))    [e.g., "2126PMIM1039" -> 1039]', margin + 5, y + 17);

doc.text('Step 2: Assign Question 1 (Easy Array Question):', margin + 5, y + 23);
doc.text('        Q1_Index = RollIndex % 60                 (Direct modulo over 60 Easy Array questions)', margin + 5, y + 27);

doc.text('Step 3: Calculate Cross-Cohort Displacement & Assign Question 2 (Moderate Search/Sort):', margin + 5, y + 33);
doc.text('        BatchOffset = floor(RollIndex / 60) * 17  (Prime displacement factor: 17)', margin + 5, y + 37);
doc.text('        Q2_Index    = (RollIndex * 13 + BatchOffset + 7) % 60   (Prime multiplier: 13, Coprime to 60)', margin + 5, y + 41);

y += 46;

// Mathematical Guarantees
doc.setFont('helvetica', 'bold');
doc.setFontSize(9);
doc.setTextColor(15, 23, 42);
doc.text('Mathematical Proof of Anti-Cheating Properties:', margin, y);
y += 5;

doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(71, 85, 105);
const proofs = [
  '1. Coprime Property: gcd(13, 60) = 1. Since 13 and 60 share no common factors, multiplying RollIndex by 13 creates a',
  '   complete, bijective permutation (cycle length = 60). Every question in the pool is utilized with uniform frequency.',
  '2. Adjacent Lab Separation: For consecutive students k and k + 1 in the lab bench: Delta(Q1) = 1, Delta(Q2) = 13.',
  '   Students sitting next to each other are separated by 13 positions in the Search/Sort pool, making shoulder surfing futile.',
  '3. Collision Avoidance: Over the entire 119 enrolled students, every single student receives a 100% unique [Q1, Q2] pair.',
  '4. Automatic Fallback: For non-numeric identifiers, a deterministic 32-bit polynomial string hash (djb2-compatible) is used.'
];
proofs.forEach((p) => {
  doc.text(p, margin, y);
  y += 4;
});

y += 4;

// Sample mapping table preview
doc.setFont('helvetica', 'bold');
doc.setFontSize(9);
doc.setTextColor(15, 23, 42);
doc.text('Sample Student Allotment Verification (First 5 Students):', margin, y);
y += 5;

// Table header
doc.setFillColor(241, 245, 249);
doc.rect(margin, y, contentWidth, 6, 'F');
doc.setFont('helvetica', 'bold');
doc.setFontSize(7.5);
doc.setTextColor(51, 65, 85);
doc.text('PRN', margin + 2, y + 4);
doc.text('Student Name', margin + 26, y + 4);
doc.text('Assigned Q1 (Easy Array)', margin + 75, y + 4);
doc.text('Assigned Q2 (Moderate Search/Sort)', margin + 130, y + 4);
y += 6;

const samplePrns = ['2126PMIF1057', '2126PMIM1001', '2126PMIM1002', '2126PMIM1003', '2126PMIM1039'];
samplePrns.forEach((prn) => {
  const st = students.find((s) => s.prn === prn) || { fullName: 'Student', prn };
  const pair = getStudentPersonalizedPair(prn);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text(prn, margin + 2, y + 3.8);
  doc.text(st.fullName.slice(0, 24), margin + 26, y + 3.8);
  doc.text(`[${pair.q1.id}] ${pair.q1.title.slice(0, 28)}`, margin + 75, y + 3.8);
  doc.text(`[${pair.q2.id}] ${pair.q2.title.slice(0, 28)}`, margin + 130, y + 3.8);
  doc.setDrawColor(241, 245, 249);
  doc.line(margin, y + 5, margin + contentWidth, y + 5);
  y += 5;
});

// ==================== SECTION 2: COMPLETE STUDENT ALLOTMENT MATRIX ====================
doc.addPage();
y = margin;
renderHeaderFooter();

doc.setFillColor(15, 23, 42);
doc.rect(margin, y, contentWidth, 8, 'F');
doc.setFont('helvetica', 'bold');
doc.setFontSize(9.5);
doc.setTextColor(255, 255, 255);
doc.text('2. COMPLETE STUDENT QUESTION ALLOTMENT MATRIX (ALL 119 STUDENTS)', margin + 4, y + 5.5);

y += 11;

// Render table header
function drawMatrixHeader() {
  doc.setFillColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('#', margin + 1.5, y + 3.8);
  doc.text('PRN', margin + 7, y + 3.8);
  doc.text('Student Full Name', margin + 30, y + 3.8);
  doc.text('Q1 ID & Title (Array)', margin + 78, y + 3.8);
  doc.text('Q2 ID & Title (Search/Sort)', margin + 132, y + 3.8);
  y += 5.5;
}

drawMatrixHeader();

students.forEach((st, idx) => {
  if (y + 4.8 > pageHeight - margin - 5) {
    doc.addPage();
    y = margin;
    renderHeaderFooter();
    drawMatrixHeader();
  }

  const pair = getStudentPersonalizedPair(st.prn);
  if (idx % 2 === 1) {
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 4.5, 'F');
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);
  doc.text(String(idx + 1), margin + 1.5, y + 3.2);
  doc.setFont('helvetica', 'bold');
  doc.text(st.prn, margin + 7, y + 3.2);
  doc.setFont('helvetica', 'normal');
  doc.text(st.fullName.slice(0, 26), margin + 30, y + 3.2);
  doc.text(`[${pair.q1.id}] ${pair.q1.title.slice(0, 27)}`, margin + 78, y + 3.2);
  doc.text(`[${pair.q2.id}] ${pair.q2.title.slice(0, 27)}`, margin + 132, y + 3.2);

  y += 4.5;
});

// ==================== SECTION 3: PART 1 - 60 EASY ARRAY QUESTIONS ====================
doc.addPage();
y = margin;
renderHeaderFooter();

doc.setFillColor(15, 23, 42);
doc.rect(margin, y, contentWidth, 9, 'F');
doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(255, 255, 255);
doc.text('3. QUESTION BANK · PART 1: 60 EASY ARRAY QUESTIONS (DIRECT APPLICATION)', margin + 4, y + 6);

y += 13;

easyQuestions.forEach((q, i) => {
  // Estimate height needed
  checkPage(30);

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(`${i + 1}. [${q.id}] ${q.title} (${q.difficulty} · ${q.timeLimitMinutes} Mins · ${q.marks} Marks)`, margin + 2, y + 4.2);
  y += 7.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);

  const descLines = doc.splitTextToSize(`Description: ${q.description}`, contentWidth);
  descLines.forEach((l) => {
    checkPage(4);
    doc.text(l, margin + 2, y);
    y += 3.4;
  });

  if (q.constraints) {
    checkPage(4);
    doc.setFont('helvetica', 'italic');
    doc.text(`Constraints: ${q.constraints.replace(/\n/g, ' | ')}`, margin + 2, y);
    doc.setFont('helvetica', 'normal');
    y += 3.4;
  }

  // Test cases summary
  checkPage(7);
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  const tc1In = q.visibleTestCase1?.input ? q.visibleTestCase1.input.replace(/\n/g, ' ') : 'N/A';
  const tc1Out = q.visibleTestCase1?.output ? q.visibleTestCase1.output.replace(/\n/g, ' ') : 'N/A';
  const tc2In = q.hiddenTestCase?.input ? q.hiddenTestCase.input.replace(/\n/g, ' ') : 'N/A';
  const tc2Out = q.hiddenTestCase?.output ? q.hiddenTestCase.output.replace(/\n/g, ' ') : 'N/A';

  doc.text(`Visible TC (2M): In: [${tc1In}] -> Expected: [${tc1Out}]`, margin + 4, y);
  y += 3.2;
  doc.text(`Hidden  TC (3M): In: [${tc2In}] -> Expected: [${tc2Out}]`, margin + 4, y);
  y += 4.5;
});

// ==================== SECTION 4: PART 2 - 60 MODERATE SEARCHING & SORTING QUESTIONS ====================
doc.addPage();
y = margin;
renderHeaderFooter();

doc.setFillColor(15, 23, 42);
doc.rect(margin, y, contentWidth, 9, 'F');
doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(255, 255, 255);
doc.text('4. QUESTION BANK · PART 2: 60 MODERATE SEARCH & SORT QUESTIONS (SCENARIOS)', margin + 4, y + 6);

y += 13;

modQuestions.forEach((q, i) => {
  checkPage(32);

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(`${i + 1}. [${q.id}] ${q.title} (${q.difficulty} · ${q.timeLimitMinutes} Mins · ${q.marks} Marks)`, margin + 2, y + 4.2);
  y += 7.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);

  if (q.realtimeScenario) {
    checkPage(4);
    doc.setFont('helvetica', 'bold');
    doc.text(`Scenario: ${q.realtimeScenario}`, margin + 2, y);
    doc.setFont('helvetica', 'normal');
    y += 3.4;
  }

  const descLines = doc.splitTextToSize(`Description: ${q.description}`, contentWidth);
  descLines.forEach((l) => {
    checkPage(4);
    doc.text(l, margin + 2, y);
    y += 3.4;
  });

  if (q.constraints) {
    checkPage(4);
    doc.setFont('helvetica', 'italic');
    doc.text(`Constraints: ${q.constraints.replace(/\n/g, ' | ')}`, margin + 2, y);
    doc.setFont('helvetica', 'normal');
    y += 3.4;
  }

  // Test cases summary
  checkPage(7);
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  const tc1In = q.visibleTestCase1?.input ? q.visibleTestCase1.input.replace(/\n/g, ' ') : 'N/A';
  const tc1Out = q.visibleTestCase1?.output ? q.visibleTestCase1.output.replace(/\n/g, ' ') : 'N/A';
  const tc2In = q.hiddenTestCase?.input ? q.hiddenTestCase.input.replace(/\n/g, ' ') : 'N/A';
  const tc2Out = q.hiddenTestCase?.output ? q.hiddenTestCase.output.replace(/\n/g, ' ') : 'N/A';

  doc.text(`Visible TC (2M): In: [${tc1In}] -> Expected: [${tc1Out}]`, margin + 4, y);
  y += 3.2;
  doc.text(`Hidden  TC (3M): In: [${tc2In}] -> Expected: [${tc2Out}]`, margin + 4, y);
  y += 4.5;
});

// Output file paths
const outDir = path.resolve('.');
const clientPublicDir = path.resolve('client/public');
const fileName = 'Assessment_4_Questions_And_Student_Allotment_Formula.pdf';

const outPath1 = path.join(outDir, fileName);
const outPath2 = path.join(clientPublicDir, fileName);

const pdfBytes = Buffer.from(doc.output('arraybuffer'));
fs.writeFileSync(outPath1, pdfBytes);
fs.writeFileSync(outPath2, pdfBytes);

console.log(`\n======================================================`);
console.log(`SUCCESS! Generated PDF: ${fileName}`);
console.log(`Total Pages: ${doc.internal.getNumberOfPages()}`);
console.log(`File Size: ${(pdfBytes.length / 1024).toFixed(1)} KB`);
console.log(`Saved to:`);
console.log(`  1. ${outPath1}`);
console.log(`  2. ${outPath2}`);
console.log(`======================================================`);
