/**
 * 1. Count email-verified students in enrolled_students
 * 2. Reset PRN 2126PMIM1118 — wipe submissions, cohort progress, reset password to PRN
 */
import fs from 'fs';

const RESET_PRN = '2126PMIM1118';
const PROJECT_ID = 'logicq-clanguage';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const cfg = JSON.parse(fs.readFileSync(process.env.USERPROFILE + '/.config/configstore/firebase-tools.json', 'utf8'));
const token = cfg.tokens.access_token;
const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

async function listDocs(col) {
  const res = await fetch(`${BASE}/${col}?pageSize=500`, { headers });
  if (!res.ok) return [];
  const d = await res.json();
  return d.documents || [];
}

async function deleteDoc(path) {
  const res = await fetch(`${BASE}/${path}`, { method: 'DELETE', headers });
  if (res.ok || res.status === 204 || res.status === 404) {
    console.log(`  ✅ Deleted: ${path}`);
    return true;
  }
  console.warn(`  ⚠️  Failed (${res.status}): ${path}`);
  return false;
}

async function patchDoc(path, fields) {
  const res = await fetch(`${BASE}/${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields }),
  });
  if (res.ok) { console.log(`  ✅ Patched: ${path}`); return true; }
  console.warn(`  ⚠️  Patch failed (${res.status}): ${path}`);
  return false;
}

function getStr(fields, key) {
  return fields?.[key]?.stringValue || '';
}
function getBool(fields, key) {
  return fields?.[key]?.booleanValue || false;
}

// ─── 1. COUNT VERIFIED ──────────────────────────────────────────────────────
console.log('\n📊 COUNTING EMAIL-VERIFIED STUDENTS...');
const enrolledDocs = await listDocs('enrolled_students');
let verified = 0, pending = 0;

for (const doc of enrolledDocs) {
  const f = doc.fields || {};
  const email = getStr(f, 'email');
  const boundEmail = getStr(f, 'boundEmail');
  const isPersonal = (e) => e && !e.endsWith('@sanjivani.edu.in') && e.includes('@');
  const isBound =
    getBool(f, 'isEmailBound') ||
    getBool(f, 'isEmailBoundV2') ||
    getBool(f, 'emailVerified') ||
    getStr(f, 'identityStatus') === 'BOUND' ||
    isPersonal(boundEmail) ||
    isPersonal(email);
  if (isBound) verified++;
  else pending++;
}
console.log(`  Total enrolled docs : ${enrolledDocs.length}`);
console.log(`  ✅ Verified         : ${verified}`);
console.log(`  ⏳ Pending          : ${pending}`);

// ─── 2. RESET PRN 2126PMIM1118 ──────────────────────────────────────────────
console.log(`\n${'='.repeat(60)}`);
console.log(`🔄 RESETTING STUDENT: ${RESET_PRN}`);
console.log(`${'='.repeat(60)}`);

// 2a. Delete all submissions matching PRN
console.log('\n🗑️  Clearing submissions...');
const subs = await listDocs('submissions');
for (const doc of subs) {
  const f = doc.fields || {};
  const prn = getStr(f, 'prn') || getStr(f, 'studentPrn');
  if (prn.toUpperCase().trim() === RESET_PRN) {
    const id = doc.name.split('/').pop();
    await deleteDoc(`submissions/${id}`);
  }
}

// 2b. Delete assessment_test_submissions
console.log('\n🗑️  Clearing assessment submissions...');
const assessSubs = await listDocs('assessment_test_submissions');
for (const doc of assessSubs) {
  const f = doc.fields || {};
  const prn = getStr(f, 'studentPrn') || getStr(f, 'prn');
  if (prn.toUpperCase().trim() === RESET_PRN) {
    const id = doc.name.split('/').pop();
    await deleteDoc(`assessment_test_submissions/${id}`);
  }
}

// 2c. Reset cohort_progress (clear scores but keep enrollment)
console.log('\n🔄 Resetting cohort_progress...');
await patchDoc(`cohort_progress/${RESET_PRN}`, {
  prn:              { stringValue: RESET_PRN },
  totalPoints:      { integerValue: 0 },
  totalSolved:      { integerValue: 0 },
  completedProblems:{ arrayValue: { values: [] } },
  academicScore:    { doubleValue: 0 },
  integrityScore:   { integerValue: 100 },
  isEmailBound:     { booleanValue: false },
  isEmailBoundV2:   { booleanValue: false },
  emailVerified:    { booleanValue: false },
  identityStatus:   { stringValue: 'PENDING' },
  boundEmail:       { stringValue: '' },
  updatedAt:        { stringValue: new Date().toISOString() },
  moduleProgress: {
    mapValue: { fields: {
      totalSolved:    { integerValue: 0 },
      totalPoints:    { integerValue: 0 },
      academicScore:  { doubleValue: 0 },
      integrityScore: { integerValue: 100 },
      tabSwitches:    { integerValue: 0 },
      pasteBursts:    { integerValue: 0 },
      lastActiveTime: { stringValue: new Date().toISOString() },
    }}
  },
});

// 2d. Reset enrolled_students — keep identity but clear verification & scores
console.log('\n🔄 Resetting enrolled_students...');
await patchDoc(`enrolled_students/${RESET_PRN}`, {
  prn:            { stringValue: RESET_PRN },
  isEmailBound:   { booleanValue: false },
  isEmailBoundV2: { booleanValue: false },
  emailVerified:  { booleanValue: false },
  identityStatus: { stringValue: 'PENDING' },
  boundEmail:     { stringValue: '' },
  totalPoints:    { integerValue: 0 },
  totalSolved:    { integerValue: 0 },
  status:         { stringValue: 'ACTIVE' },
  updatedAt:      { stringValue: new Date().toISOString() },
});

// 2e. Reset users collection doc — find by PRN scan
console.log('\n🔍 Finding users doc for PRN...');
const userDocs = await listDocs('users');
let userUid = null;
for (const doc of userDocs) {
  const f = doc.fields || {};
  const docPrn = getStr(f, 'prn');
  if (docPrn.toUpperCase().trim() === RESET_PRN) {
    userUid = doc.name.split('/').pop();
    break;
  }
}

if (userUid) {
  console.log(`  Found UID: ${userUid}`);
  // Reset user profile — clear email binding, reset password field to PRN
  await patchDoc(`users/${userUid}`, {
    isEmailBound:    { booleanValue: false },
    isEmailBoundV2:  { booleanValue: false },
    emailVerified:   { booleanValue: false },
    identityStatus:  { stringValue: 'PENDING' },
    boundEmail:      { stringValue: '' },
    totalPoints:     { integerValue: 0 },
    totalSolved:     { integerValue: 0 },
    password:        { stringValue: RESET_PRN },
    updatedAt:       { stringValue: new Date().toISOString() },
  });

  // 2f. Reset Firebase Auth password via REST (if supported by token)
  console.log('\n🔐 Resetting Firebase Auth password to PRN...');
  try {
    const pwRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          localId: userUid,
          password: RESET_PRN,
          disableUser: false,
        }),
      }
    );
    if (pwRes.ok) {
      console.log(`  ✅ Firebase Auth password reset to: ${RESET_PRN}`);
    } else {
      const e = await pwRes.text();
      console.warn(`  ⚠️  Auth password reset failed: ${e.slice(0, 200)}`);
    }
  } catch (e) {
    console.warn(`  ⚠️  Auth API error: ${e.message}`);
  }
} else {
  console.log(`  ℹ️  No users doc found for PRN ${RESET_PRN} — skipping user doc reset`);
}

// 2g. Clear student_live_telemetry
console.log('\n🗑️  Clearing live telemetry...');
await deleteDoc(`student_live_telemetry/${RESET_PRN}`);
if (userUid) await deleteDoc(`student_live_telemetry/${userUid}`);

// 2h. Clear purged_students marker if any (fresh start)
await deleteDoc(`purged_students/${RESET_PRN}`);

console.log(`\n${'='.repeat(60)}`);
console.log(`✅ RESET COMPLETE for ${RESET_PRN}`);
console.log(`   • All submissions deleted`);
console.log(`   • Cohort progress zeroed`);
console.log(`   • Email verification cleared → PENDING`);
console.log(`   • Password reset to PRN: ${RESET_PRN}`);
console.log(`   • NOTE: Browser localStorage clears on next student login`);
console.log(`${'='.repeat(60)}\n`);
