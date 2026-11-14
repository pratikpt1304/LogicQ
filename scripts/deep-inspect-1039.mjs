import fs from 'fs';

const TARGET_PRNS = ['2126PMIM1039', '2126PMIF1039'];
const PROJECT_ID = 'logicq-clanguage';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const cfgPath = process.env.USERPROFILE + '/.config/configstore/firebase-tools.json';
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const token = cfg.tokens.access_token;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

async function getDoc(path) {
  const res = await fetch(`${BASE}/${path}`, { headers });
  if (!res.ok) return null;
  return await res.json();
}

async function listDocs(col) {
  const res = await fetch(`${BASE}/${col}?pageSize=500`, { headers });
  if (!res.ok) return [];
  const d = await res.json();
  return d.documents || [];
}

console.log('=== enrolled_students/2126PMIM1039 ===');
const en = await getDoc('enrolled_students/2126PMIM1039');
console.log(JSON.stringify(en?.fields, null, 2));

console.log('\n=== cohort_progress/2126PMIM1039 ===');
const cp = await getDoc('cohort_progress/2126PMIM1039');
console.log(JSON.stringify(cp?.fields, null, 2));

console.log('\n=== Checking assessment_submissions for 1039 ===');
const asSubs = await listDocs('assessment_submissions');
for (const d of asSubs) {
  const prn = d.fields?.prn?.stringValue || d.fields?.studentId?.stringValue || '';
  if (TARGET_PRNS.includes(prn.toUpperCase())) {
    console.log('Found assessment_submissions:', d.name, JSON.stringify(d.fields));
  }
}

console.log('\n=== Checking assessment_test_submissions for 1039 ===');
const ats = await listDocs('assessment_test_submissions');
for (const d of ats) {
  const prn = d.fields?.prn?.stringValue || d.fields?.studentId?.stringValue || '';
  if (TARGET_PRNS.includes(prn.toUpperCase())) {
    console.log('Found assessment_test_submissions:', d.name, JSON.stringify(d.fields));
  }
}
