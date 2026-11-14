import fs from 'fs';

const TARGET_PRNS = ['2126PMIM1039', '2126PMIF1039'];
const PROJECT_ID = 'logicq-clanguage';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const cfgPath = process.env.USERPROFILE + '/.config/configstore/firebase-tools.json';
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const token = cfg.tokens.access_token;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

async function deleteDoc(path) {
  const res = await fetch(`${BASE}/${path}`, { method: 'DELETE', headers });
  console.log(`Delete ${path}: ${res.status}`);
}

async function setDoc(path, fields) {
  const res = await fetch(`${BASE}/${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields }),
  });
  console.log(`Set ${path}: ${res.status}`);
}

for (const prn of TARGET_PRNS) {
  console.log(`\n=== PURGING PRN: ${prn} ===`);

  // 1. Delete all drafts / subcollections
  const drafts = [
    'proctoring_telemetry',
    'device_session',
    'draft',
    'current_session',
    'scratchpad',
    'active_session',
    'session'
  ];
  for (const d of drafts) {
    await deleteDoc(`cohort_progress/${prn}/drafts/${d}`);
  }

  // 2. Set clean enrolled_students
  await setDoc(`enrolled_students/${prn}`, {
    prn: { stringValue: prn },
    email: { stringValue: `${prn.toLowerCase()}@sanjivani.edu.in` },
    boundEmail: { stringValue: '' },
    isEmailBound: { booleanValue: false },
    isEmailBoundV2: { booleanValue: false },
    emailVerified: { booleanValue: false },
    identityStatus: { stringValue: 'UNREGISTERED' },
    registeredDevices: { arrayValue: { values: [] } },
    activeSession: { booleanValue: false },
    academicScore: { integerValue: '0' },
    integrityScore: { integerValue: '100' },
    totalSolved: { integerValue: '0' },
    totalPoints: { integerValue: '0' },
    completedProblems: { arrayValue: { values: [] } },
    tabSwitches: { integerValue: '0' },
    tabSwitchCount: { integerValue: '0' },
    pasteBursts: { integerValue: '0' },
    copyPasteAttempts: { integerValue: '0' },
    fullscreenExits: { integerValue: '0' },
    status: { stringValue: 'ACTIVE' },
  });

  // 3. Set clean cohort_progress (with empty moduleProgress, 0 tabs, 0 pastes)
  await setDoc(`cohort_progress/${prn}`, {
    prn: { stringValue: prn },
    boundEmail: { stringValue: '' },
    studentEmail: { stringValue: `${prn.toLowerCase()}@sanjivani.edu.in` },
    isEmailBound: { booleanValue: false },
    isEmailBoundV2: { booleanValue: false },
    emailVerified: { booleanValue: false },
    academicScore: { integerValue: '0' },
    integrityScore: { integerValue: '100' },
    totalSolved: { integerValue: '0' },
    totalPoints: { integerValue: '0' },
    completedProblems: { arrayValue: { values: [] } },
    topicAttempts: { mapValue: { fields: {} } },
    tabSwitches: { integerValue: '0' },
    pasteBursts: { integerValue: '0' },
    fullscreenExits: { integerValue: '0' },
    registeredDevices: { arrayValue: { values: [] } },
    activeSession: { booleanValue: false },
    moduleProgress: {
      mapValue: {
        fields: {
          boundEmail: { stringValue: '' },
          studentEmail: { stringValue: `${prn.toLowerCase()}@sanjivani.edu.in` },
          isEmailBound: { booleanValue: false },
          isEmailBoundV2: { booleanValue: false },
          tabSwitches: { integerValue: '0' },
          pasteBursts: { integerValue: '0' },
          fullscreenExits: { integerValue: '0' },
          integrityScore: { integerValue: '100' },
          academicScore: { integerValue: '0' },
          registeredDevices: { arrayValue: { values: [] } },
          status: { stringValue: 'CLEAN' },
          activeSession: { booleanValue: false }
        }
      }
    }
  });
}

console.log('\n=== CHECKING IF ANY USERS OR SESSIONS REMAIN ===');
const usersRes = await fetch(`${BASE}/users?pageSize=100`, { headers });
if (usersRes.ok) {
  const usersData = await usersRes.json();
  for (const doc of usersData.documents || []) {
    const f = doc.fields || {};
    const prn = (f.prn?.stringValue || '').toUpperCase();
    const em = (f.email?.stringValue || '').toLowerCase();
    if (TARGET_PRNS.includes(prn) || em.includes('1039') || em.includes('thoratpratik')) {
      const uid = doc.name.split('/').pop();
      console.log(`Found matching user doc: ${uid} -> deleting!`);
      await deleteDoc(`users/${uid}`);
    }
  }
}

console.log('\n🎉 PURGE COMPLETE! 1039 is completely fresh & unregistered.');
