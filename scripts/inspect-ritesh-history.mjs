import fs from 'fs';

const PROJECT_ID = 'logicq-clanguage';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const cfgPath = process.env.USERPROFILE + '/.config/configstore/firebase-tools.json';
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const token = cfg.tokens.access_token;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

async function getAllDocs(col) {
  let all = [];
  let pageToken = '';
  do {
    const url = `${BASE}/${col}?pageSize=300${pageToken ? '&pageToken=' + pageToken : ''}`;
    const res = await fetch(url, { headers });
    if (!res.ok) break;
    const d = await res.json();
    if (d.documents) all = all.concat(d.documents);
    pageToken = d.nextPageToken;
  } while (pageToken);
  return all;
}

const allSubs = await getAllDocs('submissions');
const allTestSubs = await getAllDocs('assessment_test_submissions');

const TARGET_PRN = '2126PMIM1051';
const TARGET_EMAIL = 'riteshadhav538@gmail.com';

const matched = [];
for (const d of [...allSubs, ...allTestSubs]) {
  const f = d.fields || {};
  const prn = (f.studentPrn?.stringValue || f.prn?.stringValue || '').toUpperCase().trim();
  const email = (f.studentEmail?.stringValue || f.email?.stringValue || '').toLowerCase().trim();
  if (prn === TARGET_PRN || email === TARGET_EMAIL) {
    matched.push({
      col: d.name.includes('assessment_test_submissions') ? 'assessment_test_submissions' : 'submissions',
      id: d.name.split('/').pop(),
      problemId: f.problemId?.stringValue || f.problemSlug?.stringValue,
      problemTitle: f.problemTitle?.stringValue,
      testTitle: f.testTitle?.stringValue,
      submissionType: f.submissionType?.stringValue,
      createdAt: f.createdAt?.stringValue || f.submittedAt?.stringValue,
      verdict: f.verdict?.stringValue,
      score: f.academicScore?.integerValue || f.score?.integerValue,
    });
  }
}

matched.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

console.log('Earliest 5 submissions:');
console.log(matched.slice(0, 5));

console.log('\nLatest 10 submissions:');
console.log(matched.slice(-10));

// Group by module
const m1 = matched.filter(s => (s.problemId || '').startsWith('m1-'));
const m2 = matched.filter(s => (s.problemId || '').startsWith('m2-'));
const m3 = matched.filter(s => (s.problemId || '').startsWith('m3-'));
console.log(`\nModule 1 submissions: ${m1.length}, Module 2: ${m2.length}, Module 3: ${m3.length}`);
