import fs from 'fs';

const TARGET_PRNS = ['2126PMIM1051', '2126PMIF1051'];
const TARGET_EMAILS = ['riteshadhav538@gmail.com', '2126pmim1051@sanjivani.edu.in'];
const PROJECT_ID = 'logicq-clanguage';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const cfgPath = process.env.USERPROFILE + '/.config/configstore/firebase-tools.json';
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const token = cfg.tokens.access_token;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

async function listDocs(col) {
  const res = await fetch(`${BASE}/${col}?pageSize=500`, { headers });
  if (!res.ok) return [];
  const d = await res.json();
  return d.documents || [];
}

const subs = await listDocs('submissions');
console.log('Total submissions in collection "submissions":', subs.length);
let matchedSubsCount = 0;
const uniqueProblems = new Set();

for (const d of subs) {
  const f = d.fields || {};
  const prn = (f.studentPrn?.stringValue || f.prn?.stringValue || '').toUpperCase().trim();
  const email = (f.studentEmail?.stringValue || f.email?.stringValue || '').toLowerCase().trim();
  const verdict = f.verdict?.stringValue || f.status?.stringValue || '';
  const score = f.academicScore?.integerValue || f.score?.integerValue || 0;
  
  if (TARGET_PRNS.includes(prn) || TARGET_EMAILS.includes(email)) {
    matchedSubsCount++;
    const prob = f.problemId?.stringValue || f.problemTitle?.stringValue || f.problemSlug?.stringValue || f.title?.stringValue || d.name.split('/').pop();
    if (verdict === 'ACCEPTED' || verdict === 'PASSED' || score > 0) {
      uniqueProblems.add(prob);
    }
  }
}

console.log('Matched submissions for 1051 in "submissions":', matchedSubsCount);
console.log('Unique problems with ACCEPTED/PASSED/score>0:', uniqueProblems.size, Array.from(uniqueProblems));

const testSubs = await listDocs('assessment_test_submissions');
console.log('\nTotal submissions in "assessment_test_submissions":', testSubs.length);
let matchedTestCount = 0;
for (const d of testSubs) {
  const f = d.fields || {};
  const prn = (f.studentPrn?.stringValue || f.prn?.stringValue || '').toUpperCase().trim();
  const email = (f.studentEmail?.stringValue || f.email?.stringValue || '').toLowerCase().trim();
  if (TARGET_PRNS.includes(prn) || TARGET_EMAILS.includes(email)) {
    matchedTestCount++;
  }
}
console.log('Matched in assessment_test_submissions:', matchedTestCount);
