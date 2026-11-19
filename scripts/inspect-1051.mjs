import fs from 'fs';

const TARGET_PRNS = ['2126PMIM1051', '2126PMIF1051'];
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

console.log('=== users query ===');
const users = await listDocs('users');
for (const u of users) {
  const prn = u.fields?.prn?.stringValue || '';
  const email = u.fields?.email?.stringValue || '';
  if (TARGET_PRNS.includes(prn.toUpperCase()) || email.includes('1051') || email.includes('ritesh')) {
    console.log('Found user:', u.name.split('/').pop(), JSON.stringify(u.fields, null, 2));
  }
}

console.log('\n=== cohort_members query ===');
const cm1 = await getDoc('cohort_members/2126PMIM1051');
console.log('cohort_members/2126PMIM1051:', JSON.stringify(cm1?.fields, null, 2));

console.log('\n=== enrolled_students/2126PMIM1051 ===');
const en = await getDoc('enrolled_students/2126PMIM1051');
console.log('enrolled_students/2126PMIM1051:', JSON.stringify(en?.fields, null, 2));

console.log('\n=== cohort_progress/2126PMIM1051 ===');
const cp = await getDoc('cohort_progress/2126PMIM1051');
console.log('cohort_progress/2126PMIM1051:', JSON.stringify(cp?.fields, null, 2));

console.log('\n=== student_profiles query ===');
const sp = await getDoc('student_profiles/2126PMIM1051');
console.log('student_profiles/2126PMIM1051:', JSON.stringify(sp?.fields, null, 2));
