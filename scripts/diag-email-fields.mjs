/**
 * Diagnostic: Check enrolled_students docs for bound email fields
 */
import fs from 'fs';

const PROJECT_ID = 'logicq-clanguage';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const cfg = JSON.parse(fs.readFileSync(process.env.USERPROFILE + '/.config/configstore/firebase-tools.json', 'utf8'));
const token = cfg.tokens.access_token;
const headers = { 'Authorization': `Bearer ${token}` };

function getStr(f, k) { return f?.[k]?.stringValue || ''; }
function getBool(f, k) { return f?.[k]?.booleanValue || false; }

// Check enrolled_students
const res = await fetch(`${BASE}/enrolled_students?pageSize=300`, { headers });
const data = await res.json();
const docs = data.documents || [];

console.log(`\nTotal enrolled_students docs: ${docs.length}\n`);
console.log('PRN                 | email field                        | boundEmail field                   | isEmailBound');
console.log('-'.repeat(110));

let boundCount = 0;
for (const doc of docs) {
  const f = doc.fields || {};
  const prn = getStr(f, 'prn') || doc.name.split('/').pop();
  const email = getStr(f, 'email');
  const boundEmail = getStr(f, 'boundEmail');
  const isEmailBound = getBool(f, 'isEmailBound') || getBool(f, 'isEmailBoundV2') || getBool(f, 'emailVerified') || getStr(f, 'identityStatus') === 'BOUND';
  if (boundEmail || isEmailBound || (email && !email.endsWith('@sanjivani.edu.in'))) {
    boundCount++;
    console.log(`${prn.padEnd(20)}| ${email.substring(0,34).padEnd(35)}| ${boundEmail.substring(0,34).padEnd(35)}| ${isEmailBound}`);
  }
}
console.log(`\nStudents with bound email data: ${boundCount}`);

// Also check cohort_progress for boundEmail
console.log('\n\nChecking cohort_progress for boundEmail...');
const cpRes = await fetch(`${BASE}/cohort_progress?pageSize=300`, { headers });
const cpData = await cpRes.json();
const cpDocs = cpData.documents || [];
let cpBound = 0;
for (const doc of cpDocs) {
  const f = doc.fields || {};
  const prn = doc.name.split('/').pop();
  const boundEmail = getStr(f, 'boundEmail') || getStr(f, 'studentEmail');
  const isPersonal = boundEmail && !boundEmail.endsWith('@sanjivani.edu.in') && boundEmail.includes('@');
  if (isPersonal) {
    cpBound++;
    console.log(`  ${prn}: boundEmail = ${boundEmail}`);
  }
}
console.log(`cohort_progress docs with personal email: ${cpBound}`);
