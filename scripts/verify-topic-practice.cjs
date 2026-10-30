const fs = require('fs');

const files = [
  './client/src/data/topic-practice.data.ts',
  './client/src/data/topic-practice-part2.data.ts',
  './client/src/data/topic-practice-hard.data.ts',
  './client/src/data/topic-practice-expansion-1.data.ts',
  './client/src/data/topic-practice-expansion-2.data.ts'
];

let allIds = [];
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const matches = [...content.matchAll(/id:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
  allIds.push(...matches);
});

console.log('Total Topic IDs found:', allIds.length);
console.log('Unique Topic IDs:', new Set(allIds).size);

const m1 = allIds.filter(id => id.startsWith('m1-'));
const m2 = allIds.filter(id => id.startsWith('m2-'));
const m3 = allIds.filter(id => id.startsWith('m3-'));
const m4 = allIds.filter(id => id.startsWith('m4-'));

console.log('Module 1 (Control Structures):', m1.length);
console.log('Module 2 (Pointers & Functions):', m2.length);
console.log('Module 3 (Arrays & Strings):', m3.length);
console.log('Module 4 (Structs & Memory):', m4.length);
