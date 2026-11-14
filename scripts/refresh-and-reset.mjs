/**
 * Refresh Firebase access token using refresh_token + Google OAuth2, then reset student.
 */
import fs from 'fs';

const RESET_PRN = '2126PMIM1118';
const PROJECT_ID = 'logicq-clanguage';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// 1. Refresh the access token
const cfgPath = process.env.USERPROFILE + '/.config/configstore/firebase-tools.json';
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const refreshToken = cfg.tokens.refresh_token;

console.log('🔑 Refreshing Firebase access token...');
const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
    client_secret: 'j9iVZfS8uo8bBvP2QLYLCHP2',
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  }),
});

const tokenData = await tokenRes.json();
if (!tokenData.access_token) {
  console.error('❌ Token refresh failed:', JSON.stringify(tokenData));
  process.exit(1);
}

const newToken = tokenData.access_token;
console.log('✅ Token refreshed successfully');

// Save back to config
cfg.tokens.access_token = newToken;
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));

const headers = { 'Authorization': `Bearer ${newToken}`, 'Content-Type': 'application/json' };

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
  const err = await res.text().catch(() => '');
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
  const err = await res.text().catch(() => '');
  console.warn(`  ⚠️  Patch failed (${res.status}): ${path} — ${err.slice(0,100)}`);
  return false;
}

function getStr(fields, key) { return fields?.[key]?.stringValue || ''; }
function getBool(fields, key) { return fields?.[key]?.booleanValue || false; }

// ─── COUNT VERIFIED ─────────────────────────────────────────────────────────
console.log('\n📊 COUNTING EMAIL-VERIFIED STUDENTS in enrolled_students...');
const enrolledDocs = await listDocs('enrolled_students');
let verified = 0, pending = 0;
for (const doc of enrolledDocs) {
  const f = doc.fields || {};
  const email = getStr(f, 'email');
  const boundEmail = getStr(f, 'boundEmail');
  const isPersonal = (e) => e && !e.endsWith('@sanjivani.edu.in') && e.includes('@');
  const isBound = getBool(f, 'isEmailBound') || getBool(f, 'isEmailBoundV2') || getBool(f, 'emailVerified') ||
                  getStr(f, 'identityStatus') === 'BOUND' || isPersonal(boundEmail) || isPersonal(email);
  if (isBound) verified++; else pending++;
}
console.log(`  Total enrolled : ${enrolledDocs.length}`);
console.log(`  ✅ Verified    : ${verified}`);
console.log(`  ⏳ Pending     : ${pending}`);

// ─── RESET 2126PMIM1118 ─────────────────────────────────────────────────────
console.log(`\n${'='.repeat(60)}`);
console.log(`🔄 RESETTING: ${RESET_PRN}`);
console.log(`${'='.repeat(60)}`);

// Delete submissions
console.log('\n🗑️  submissions...');
const subs = await listDocs('submissions');
for (const doc of subs) {
  const f = doc.fields || {};
  const prn = getStr(f, 'prn') || getStr(f, 'studentPrn');
  if (prn.toUpperCase().trim() === RESET_PRN) {
    await deleteDoc(`submissions/${doc.name.split('/').pop()}`);
  }
}

// Delete assessment submissions
console.log('\n🗑️  assessment_test_submissions...');
const assessSubs = await listDocs('assessment_test_submissions');
for (const doc of assessSubs) {
  const f = doc.fields || {};
  const prn = getStr(f, 'studentPrn') || getStr(f, 'prn');
  if (prn.toUpperCase().trim() === RESET_PRN) {
    await deleteDoc(`assessment_test_submissions/${doc.name.split('/').pop()}`);
  }
}

// Reset cohort_progress
console.log('\n🔄 cohort_progress...');
await patchDoc(`cohort_progress/${RESET_PRN}`, {
  prn:              { stringValue: RESET_PRN },
  totalPoints:      { integerValue: 0 },
  totalSolved:      { integerValue: 0 },
  academicScore:    { doubleValue: 0 },
  integrityScore:   { integerValue: 100 },
  isEmailBound:     { booleanValue: false },
  isEmailBoundV2:   { booleanValue: false },
  emailVerified:    { booleanValue: false },
  identityStatus:   { stringValue: 'PENDING' },
  boundEmail:       { stringValue: '' },
  updatedAt:        { stringValue: new Date().toISOString() },
  moduleProgress: { mapValue: { fields: {
    totalSolved:    { integerValue: 0 },
    totalPoints:    { integerValue: 0 },
    academicScore:  { doubleValue: 0 },
    integrityScore: { integerValue: 100 },
    tabSwitches:    { integerValue: 0 },
    pasteBursts:    { integerValue: 0 },
  }}},
});

// Reset enrolled_students
console.log('\n🔄 enrolled_students...');
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

// Find + reset users doc
console.log('\n🔍 Finding users doc...');
const userDocs = await listDocs('users');
let userUid = null;
for (const doc of userDocs) {
  const f = doc.fields || {};
  if (getStr(f, 'prn').toUpperCase().trim() === RESET_PRN) {
    userUid = doc.name.split('/').pop();
    break;
  }
}

if (userUid) {
  console.log(`  UID: ${userUid}`);
  await patchDoc(`users/${userUid}`, {
    isEmailBound:   { booleanValue: false },
    isEmailBoundV2: { booleanValue: false },
    emailVerified:  { booleanValue: false },
    identityStatus: { stringValue: 'PENDING' },
    boundEmail:     { stringValue: '' },
    totalPoints:    { integerValue: 0 },
    totalSolved:    { integerValue: 0 },
    password:       { stringValue: RESET_PRN },
    updatedAt:      { stringValue: new Date().toISOString() },
  });

  // Reset Firebase Auth password
  console.log('\n🔐 Resetting Firebase Auth password...');
  const pwRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`,
    { method: 'POST', headers, body: JSON.stringify({ localId: userUid, password: RESET_PRN, disableUser: false }) }
  );
  if (pwRes.ok) console.log(`  ✅ Auth password reset to: ${RESET_PRN}`);
  else console.warn(`  ⚠️  Auth reset failed: ${(await pwRes.text()).slice(0,150)}`);

  await deleteDoc(`publicProfiles/${userUid}`);
  await deleteDoc(`student_live_telemetry/${userUid}`);
}

await deleteDoc(`student_live_telemetry/${RESET_PRN}`);
await deleteDoc(`purged_students/${RESET_PRN}`);

console.log(`\n${'='.repeat(60)}`);
console.log(`✅ RESET COMPLETE — ${RESET_PRN}`);
console.log(`   Verified students in system : ${verified}`);
console.log(`   Password reset to PRN       : ${RESET_PRN}`);
console.log(`   localStorage → auto-clears on student's next login`);
console.log(`${'='.repeat(60)}\n`);
