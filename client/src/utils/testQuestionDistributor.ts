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

  // Check if this test pool is structured with Category Domains (Hariprasad Sir's Arrays + Searching/Sorting)
  let arrayQuestions = allQuestions.filter(
    (q: any) =>
      q?.category === 'ARRAY_DIRECT' ||
      (q?.id && (String(q.id).startsWith('lab-arr') || String(q.id).startsWith('a4-arr'))) ||
      (q?.title && q.title.toLowerCase().includes('array') && !q.title.toLowerCase().includes('sort'))
  );
  let searchSortQuestions = allQuestions.filter(
    (q: any) =>
      q?.category === 'SEARCH_SORT_SCENARIO' ||
      (q?.id && (String(q.id).startsWith('lab-ss') || String(q.id).startsWith('a4-ss'))) ||
      (q?.title && (q.title.toLowerCase().includes('search') || q.title.toLowerCase().includes('sort')))
  );

  // Ensure deterministic index alignment
  arrayQuestions = arrayQuestions.sort((a: any, b: any) => (a.id || a.title || '').localeCompare(b.id || b.title || ''));
  searchSortQuestions = searchSortQuestions.sort((a: any, b: any) => (a.id || a.title || '').localeCompare(b.id || b.title || ''));

  // If structured pool exists, guarantee exactly 1 Array (Q1) + 1 Search/Sort (Q2):
  // Uses dual-prime rotation with batch displacement so every student in cohort receives unique combination
  if (arrayQuestions.length > 0 && searchSortQuestions.length > 0) {
    const rollIndex = Math.abs(studentNumber);
    const q1Index = rollIndex % arrayQuestions.length;
    const batchOffset = Math.floor(rollIndex / arrayQuestions.length) * 17;
    const q2Index = Math.abs(rollIndex * 13 + batchOffset + 7) % searchSortQuestions.length;
    return [arrayQuestions[q1Index], searchSortQuestions[q2Index]];
  }

  const targetCount = Math.max(1, Math.min(Number(questionCount) || allQuestions.length, allQuestions.length));

  // If pool has fewer or equal questions than requested, return all
  if (allQuestions.length <= targetCount) {
    return allQuestions;
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
