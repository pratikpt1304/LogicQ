import fs from 'fs';

const content = fs.readFileSync('client/src/data/assessment4-questions.data.ts', 'utf8');

// Check test cases format for all questions
const openTestCases = content.match(/"visibleTestCase1":/g) || [];
const hiddenTestCases = content.match(/"hiddenTestCase":/g) || [];
const starterCodes = content.match(/"starterCode":/g) || [];
const solutions = content.match(/"solutionCode":/g) || [];

console.log('visibleTestCase1 count:', openTestCases.length);
console.log('hiddenTestCase count:', hiddenTestCases.length);
console.log('starterCode count:', starterCodes.length);
console.log('solutionCode count:', solutions.length);
