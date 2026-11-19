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
console.log('Total submissions across all pages:', allSubs.length);

const allTestSubs = await getAllDocs('assessment_test_submissions');
console.log('Total assessment_test_submissions across all pages:', allTestSubs.length);

const TARGET_PRN = '2126PMIM1051';
const TARGET_EMAIL = 'riteshadhav538@gmail.com';

const matched = [];
for (const d of [...allSubs, ...allTestSubs]) {
  const f = d.fields || {};
  const prn = (f.studentPrn?.stringValue || f.prn?.stringValue || '').toUpperCase().trim();
  const email = (f.studentEmail?.stringValue || f.email?.stringValue || '').toLowerCase().trim();
  if (prn === TARGET_PRN || email === TARGET_EMAIL) {
    matched.push(f);
  }
}

console.log('Total matched submissions for Ritesh:', matched.length);

const uniqueProblems = new Set();
for (const f of matched) {
  const verdict = f.verdict?.stringValue || f.status?.stringValue || '';
  const score = Number(f.academicScore?.integerValue || f.score?.integerValue || f.points?.integerValue || 0);
  if (verdict === 'ACCEPTED' || verdict === 'PASSED' || score > 0) {
    const probKey = f.problemId?.stringValue || f.problemTitle?.stringValue || f.problemSlug?.stringValue || f.title?.stringValue || f.id?.stringValue;
    if (probKey) uniqueProblems.add(probKey);
  }
}

console.log('Unique problems computed with probKey:', uniqueProblems.size);
console.log('Keys:', Array.from(uniqueProblems));
