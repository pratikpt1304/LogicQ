/**
 * Anti-Cheating Question Distribution & Personalization
 * 
 * Ensures that for any assessment test with a question pool,
 * students receive distinct subsets of questions (e.g. 2 questions each)
 * deterministically rotated based on their PRN / student roll number.
 * 
 * Adjacent students sitting in the same lab will never receive the same questions.
 */

export function getStudentPersonalizedQuestions(
  allQuestions: any[],
  questionCount: number,
  studentPrnOrId: string
): any[] {
  if (!allQuestions || !Array.isArray(allQuestions) || allQuestions.length === 0) {
    return [];
  }

  const targetCount = Math.max(1, Math.min(Number(questionCount) || allQuestions.length, allQuestions.length));

  // If pool has fewer or equal questions than requested, return all
  if (allQuestions.length <= targetCount) {
    return allQuestions;
  }

  // Extract student numeric identifier (e.g. 1001 from 2126PMIM1001)
  const cleanStr = String(studentPrnOrId || '').trim().toUpperCase();
  const digits = cleanStr.replace(/\D/g, '').slice(-4);
  let studentNumber = parseInt(digits, 10);

  if (isNaN(studentNumber)) {
    // Deterministic string hash fallback for non-numeric IDs
    studentNumber = 0;
    for (let i = 0; i < cleanStr.length; i++) {
      studentNumber = (studentNumber * 31 + cleanStr.charCodeAt(i)) >>> 0;
    }
  }

  const totalPool = allQuestions.length;

  // Stride offset based on student number:
  // Ensures student i and student i+1 get distinct slices of questions
  const startIndex = Math.abs((studentNumber * targetCount) % totalPool);

  const personalized: any[] = [];
  for (let i = 0; i < targetCount; i++) {
    const questionIndex = (startIndex + i) % totalPool;
    personalized.push(allQuestions[questionIndex]);
  }

  return personalized;
}
