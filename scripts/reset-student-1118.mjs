/**
 * Reset all data for PRN 2126PMIM1118, force-logout all sessions, and set password to PRN.
 */
import fs from 'fs';

const TARGET_PRN = '2126PMIM1118';
const TARGET_EMAIL = '2126pmim1118@sanjivani.edu.in';
const PROJECT_ID = 'logicq-clanguage';
const BASE_FS = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const cfgPath = process.env.USERPROFILE + '/.config/configstore/firebase-tools.json';
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const token = cfg.tokens.access_token;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

async function listDocs(col) {
  try {
    const res = await fetch(`${BASE_FS}/${col}?pageSize=500`, { headers });
    if (!res.ok) return [];
    const d = await res.json();
    return d.documents || [];
  } catch (e) {
    console.warn(`List ${col} error:`, e.message);
    return [];
  }
}

async function deleteDoc(path) {
  try {
    const res = await fetch(`${BASE_FS}/${path}`, { method: 'DELETE', headers });
    if (res.ok || res.status === 204 || res.status === 404) {
      console.log(`  ✅ Deleted: ${path}`);
      return true;
    }
    console.warn(`  ⚠️ Delete failed (${res.status}): ${path}`);
    return false;
  } catch (e) {
    console.warn(`Delete ${path} error:`, e.message);
    return false;
  }
}

async function patchDoc(path, fields) {
  try {
    const res = await fetch(`${BASE_FS}/${path}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields }),
    });
    if (res.ok) {
      console.log(`  ✅ Patched: ${path}`);
      return true;
    }
    console.warn(`  ⚠️ Patch failed (${res.status}): ${path}`);
    return false;
  } catch (e) {
    console.warn(`Patch ${path} error:`, e.message);
    return false;
  }
}

async function setDoc(path, fields) {
  return patchDoc(path, fields);
}

function getStr(fields, key) {
  return fields?.[key]?.stringValue || '';
}

console.log(`\n============================================================`);
console.log(`🔄 PURGING & RESETTING STUDENT: ${TARGET_PRN}`);
console.log(`============================================================\n`);

// ─── 1. FIND FIREBASE AUTH ACCOUNT ──────────────────────────────────────────
console.log('🔍 Locating student in Firebase Auth & Firestore users...');
let userUid = null;

// 1a. Check Firestore users
const usersDocs = await listDocs('users');
for (const doc of usersDocs) {
  const f = doc.fields || {};
  const prn = (getStr(f, 'prn') || '').toUpperCase().trim();
  const em = (getStr(f, 'email') || '').toLowerCase().trim();
  if (prn === TARGET_PRN || em === TARGET_EMAIL) {
    userUid = doc.name.split('/').pop();
    console.log(`  ✅ Found user doc in Firestore: ${userUid}`);
    break;
  }
}

// 1b. Check Firebase Auth accounts via batchGet / lookup
try {
  const lookupRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ email: [TARGET_EMAIL] }),
    }
  );
  if (lookupRes.ok) {
    const lookupData = await lookupRes.json();
    if (lookupData.users && lookupData.users.length > 0) {
      userUid = lookupData.users[0].localId;
      console.log(`  ✅ Found Firebase Auth account: UID = ${userUid}`);
    }
  }
} catch (e) {
  console.warn('  ⚠️ Auth lookup error:', e.message);
}

// ─── 2. REVOKE ALL SESSIONS (FORCE LOGOUT) ──────────────────────────────────
if (userUid) {
  console.log(`\n🔐 Revoking all active sessions for UID: ${userUid}...`);
  try {
    const revokeRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          localId: userUid,
          validSince: String(Math.floor(Date.now() / 1000)),
          disableUser: false,
          password: TARGET_PRN,
        }),
      }
    );
    if (revokeRes.ok) {
      console.log(`  ✅ ALL sessions revoked & password reset to PRN: ${TARGET_PRN}`);
    } else {
      const errTxt = await revokeRes.text();
      console.warn(`  ⚠️ Session revoke / pw reset response:`, errTxt);
    }
  } catch (e) {
    console.warn(`  ⚠️ Session revoke error:`, e.message);
  }
} else {
  // If user doesn't exist in Firebase Auth yet, create fresh account!
  console.log(`\n👤 User not in Firebase Auth — creating fresh account with password = ${TARGET_PRN}...`);
  try {
    const createRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:signUp`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: TARGET_EMAIL,
          password: TARGET_PRN,
          returnSecureToken: false,
        }),
      }
    );
    if (createRes.ok) {
      const createdData = await createRes.json();
      userUid = createdData.localId;
      console.log(`  ✅ Created Firebase Auth user with UID: ${userUid}`);
    } else {
      console.warn(`  ⚠️ Auth create response:`, await createRes.text());
    }
  } catch (e) {
    console.warn(`  ⚠️ Auth create error:`, e.message);
  }
}

// ─── 3. DELETE SUBMISSIONS ──────────────────────────────────────────────────
console.log('\n🗑️  Deleting all submissions...');
const subs = await listDocs('submissions');
for (const doc of subs) {
  const f = doc.fields || {};
  const prn = (getStr(f, 'prn') || getStr(f, 'studentPrn')).toUpperCase().trim();
  const em = (getStr(f, 'email') || getStr(f, 'studentEmail')).toLowerCase().trim();
  if (prn === TARGET_PRN || em === TARGET_EMAIL) {
    const id = doc.name.split('/').pop();
    await deleteDoc(`submissions/${id}`);
  }
}

// ─── 4. DELETE ASSESSMENT SUBMISSIONS ───────────────────────────────────────
console.log('\n🗑️  Deleting assessment submissions...');
const assessSubs = await listDocs('assessment_test_submissions');
for (const doc of assessSubs) {
  const f = doc.fields || {};
  const prn = (getStr(f, 'studentPrn') || getStr(f, 'prn')).toUpperCase().trim();
  const em = (getStr(f, 'studentEmail') || getStr(f, 'email')).toLowerCase().trim();
  if (prn === TARGET_PRN || em === TARGET_EMAIL) {
    const id = doc.name.split('/').pop();
    await deleteDoc(`assessment_test_submissions/${id}`);
  }
}

// ─── 5. DELETE DRAFTS & SUBCOLLECTIONS ──────────────────────────────────────
console.log('\n🗑️  Deleting drafts and session markers...');
const draftSubDocs = [
  'proctoring_telemetry',
  'device_session',
  'draft',
  'current_session',
  'scratchpad',
  'active_session',
  'session',
  'telemetry',
];
for (const d of draftSubDocs) {
  await deleteDoc(`cohort_progress/${TARGET_PRN}/drafts/${d}`);
}

// ─── 6. DELETE LIVE TELEMETRY & PURGE MARKERS ───────────────────────────────
await deleteDoc(`student_live_telemetry/${TARGET_PRN}`);
if (userUid) {
  await deleteDoc(`student_live_telemetry/${userUid}`);
}
await deleteDoc(`purged_students/${TARGET_PRN}`);

// ─── 7. RESET COHORT PROGRESS TO CLEAN ZERO ─────────────────────────────────
console.log('\n🔄 Setting pristine cohort_progress...');
await setDoc(`cohort_progress/${TARGET_PRN}`, {
  prn: { stringValue: TARGET_PRN },
  studentEmail: { stringValue: TARGET_EMAIL },
  boundEmail: { stringValue: '' },
  isEmailBound: { booleanValue: false },
  isEmailBoundV2: { booleanValue: false },
  emailVerified: { booleanValue: false },
  identityStatus: { stringValue: 'PENDING' },
  totalSolved: { integerValue: 0 },
  totalPoints: { integerValue: 0 },
  academicScore: { doubleValue: 0 },
  integrityScore: { integerValue: 100 },
  tabSwitches: { integerValue: 0 },
  pasteBursts: { integerValue: 0 },
  fullscreenExits: { integerValue: 0 },
  registeredDevices: { arrayValue: { values: [] } },
  activeSession: { booleanValue: false },
  completedProblems: { arrayValue: { values: [] } },
  topicAttempts: { mapValue: { fields: {} } },
  updatedAt: { stringValue: new Date().toISOString() },
  moduleProgress: {
    mapValue: {
      fields: {
        totalSolved: { integerValue: 0 },
        totalPoints: { integerValue: 0 },
        academicScore: { doubleValue: 0 },
        integrityScore: { integerValue: 100 },
        tabSwitches: { integerValue: 0 },
        pasteBursts: { integerValue: 0 },
        fullscreenExits: { integerValue: 0 },
        registeredDevices: { arrayValue: { values: [] } },
        status: { stringValue: 'CLEAN' },
        activeSession: { booleanValue: false },
        lastActiveTime: { stringValue: new Date().toISOString() },
      },
    },
  },
});

// ─── 8. RESET ENROLLED STUDENTS ─────────────────────────────────────────────
console.log('\n🔄 Setting clean enrolled_students...');
await setDoc(`enrolled_students/${TARGET_PRN}`, {
  prn: { stringValue: TARGET_PRN },
  name: { stringValue: 'Student 1118' },
  fullName: { stringValue: 'Student 1118' },
  email: { stringValue: TARGET_EMAIL },
  boundEmail: { stringValue: '' },
  isEmailBound: { booleanValue: false },
  isEmailBoundV2: { booleanValue: false },
  emailVerified: { booleanValue: false },
  identityStatus: { stringValue: 'PENDING' },
  section: { stringValue: 'Integrated Mtech' },
  sectionName: { stringValue: 'Integrated Mtech' },
  status: { stringValue: 'ACTIVE' },
  totalPoints: { integerValue: 0 },
  totalSolved: { integerValue: 0 },
  academicScore: { integerValue: 0 },
  integrityScore: { integerValue: 100 },
  tabSwitches: { integerValue: 0 },
  pasteBursts: { integerValue: 0 },
  fullscreenExits: { integerValue: 0 },
  registeredDevices: { arrayValue: { values: [] } },
  activeSession: { booleanValue: false },
  completedProblems: { arrayValue: { values: [] } },
  updatedAt: { stringValue: new Date().toISOString() },
});

// ─── 9. RESET / RECREATE USER PROFILE IN USERS COLLECTION ───────────────────
if (userUid) {
  console.log(`\n🔄 Updating users/${userUid} doc...`);
  await setDoc(`users/${userUid}`, {
    uid: { stringValue: userUid },
    id: { stringValue: userUid },
    prn: { stringValue: TARGET_PRN },
    email: { stringValue: TARGET_EMAIL },
    displayName: { stringValue: 'Student 1118' },
    fullName: { stringValue: 'Student 1118' },
    role: { stringValue: 'STUDENT' },
    status: { stringValue: 'ACTIVE' },
    password: { stringValue: TARGET_PRN },
    isEmailBound: { booleanValue: false },
    isEmailBoundV2: { booleanValue: false },
    emailVerified: { booleanValue: false },
    identityStatus: { stringValue: 'PENDING' },
    boundEmail: { stringValue: '' },
    totalPoints: { integerValue: 0 },
    totalSolved: { integerValue: 0 },
    academicScore: { integerValue: 0 },
    integrityScore: { integerValue: 100 },
    tabSwitchCount: { integerValue: 0 },
    tabSwitches: { integerValue: 0 },
    clipboardAttempts: { integerValue: 0 },
    pasteBursts: { integerValue: 0 },
    registeredDevices: { arrayValue: { values: [] } },
    activeSession: { booleanValue: false },
    section: { stringValue: 'Integrated Mtech' },
    updatedAt: { stringValue: new Date().toISOString() },
  });
}

console.log(`\n============================================================`);
console.log(`🎉 COMPLETED FULL RESET FOR ${TARGET_PRN}`);
console.log(`   • Password set to PRN: ${TARGET_PRN}`);
console.log(`   • All sessions revoked (Logged out on all devices)`);
console.log(`   • All submissions & telemetry deleted`);
console.log(`   • Scores & progress zeroed (Academic: 0, Integrity: 100)`);
console.log(`   • Email binding reset to PENDING (Ready as brand new student)`);
console.log(`============================================================\n`);
