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

async function deleteDoc(path) {
  const res = await fetch(`${BASE}/${path}`, { method: 'DELETE', headers });
  if (res.ok || res.status === 204 || res.status === 404) {
    console.log(`  ✅ Deleted: ${path}`);
    return true;
  }
  return false;
}

console.log('\n--- RESETTING STUDENT 1039 ---');

// 1. Reset enrolled_students
for (const prn of TARGET_PRNS) {
  const doc = await getDoc(`enrolled_students/${prn}`);
  if (doc) {
    console.log(`Found enrolled_students/${prn}: resetting...`);
    const cleanFields = {
      ...doc.fields,
      boundEmail: { stringValue: '' },
      email: { stringValue: `${prn.toLowerCase()}@sanjivani.edu.in` },
      isEmailBound: { booleanValue: false },
      isEmailBoundV2: { booleanValue: false },
      emailVerified: { booleanValue: false },
      identityStatus: { stringValue: 'PENDING' },
      registeredDevices: { arrayValue: { values: [] } },
      activeSession: { booleanValue: false },
      academicScore: { integerValue: '0' },
      integrityScore: { integerValue: '100' },
      totalSolved: { integerValue: '0' },
      totalPoints: { integerValue: '0' },
      completedProblems: { arrayValue: { values: [] } },
      tabSwitches: { integerValue: '0' },
      pasteBursts: { integerValue: '0' },
      fullscreenExits: { integerValue: '0' },
      status: { stringValue: 'ACTIVE' },
      lastActive: { stringValue: new Date().toISOString() },
    };
    // remove customPassword if any
    delete cleanFields.customPassword;
    delete cleanFields.customPasswordHash;
    delete cleanFields.passwordChangedAt;
    delete cleanFields.passwordChangeCount;

    const patchRes = await fetch(`${BASE}/enrolled_students/${prn}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields: cleanFields }),
    });
    console.log(`  ✅ enrolled_students/${prn} reset status: ${patchRes.status}`);
  }
}

// 2. Reset cohort_progress
for (const prn of TARGET_PRNS) {
  const doc = await getDoc(`cohort_progress/${prn}`);
  if (doc) {
    console.log(`Found cohort_progress/${prn}: resetting...`);
    const cleanFields = {
      ...doc.fields,
      boundEmail: { stringValue: '' },
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
      lastActive: { stringValue: new Date().toISOString() }
    };
    const patchRes = await fetch(`${BASE}/cohort_progress/${prn}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields: cleanFields }),
    });
    console.log(`  ✅ cohort_progress/${prn} reset status: ${patchRes.status}`);
  }

  // Delete subcollection drafts
  const drafts = ['proctoring_telemetry', 'device_session', 'draft', 'current_session', 'scratchpad'];
  for (const draft of drafts) {
    await deleteDoc(`cohort_progress/${prn}/drafts/${draft}`);
  }
}

// 3. Delete submissions
console.log('\nChecking submissions...');
const subs = await listDocs('submissions');
for (const doc of subs) {
  const prn = doc.fields?.prn?.stringValue || doc.fields?.studentId?.stringValue || '';
  if (TARGET_PRNS.includes(prn.toUpperCase())) {
    const docName = doc.name.split('/').slice(-2).join('/');
    await deleteDoc(docName);
  }
}

// 4. Delete assessment_test_submissions
console.log('\nChecking assessment_test_submissions...');
const testSubs = await listDocs('assessment_test_submissions');
for (const doc of testSubs) {
  const prn = doc.fields?.prn?.stringValue || doc.fields?.studentId?.stringValue || '';
  if (TARGET_PRNS.includes(prn.toUpperCase())) {
    const docName = doc.name.split('/').slice(-2).join('/');
    await deleteDoc(docName);
  }
}

// 5. Force logout & check users collection in Firestore
console.log('\nChecking users collection for 1039...');
const usersDocs = await listDocs('users');
for (const u of usersDocs) {
  const uprn = u.fields?.prn?.stringValue || '';
  const uemail = u.fields?.email?.stringValue || '';
  if (TARGET_PRNS.includes(uprn.toUpperCase()) || uemail.includes('1039') || uemail === 'thoratpratik2323@gmail.com') {
    const uid = u.name.split('/').pop();
    console.log(`Found user ${uid} (${uprn}, ${uemail}) -> resetting/deleting device sessions & resetting user doc`);
    await deleteDoc(`users/${uid}/drafts/device_session`);
    await deleteDoc(`users/${uid}/drafts/current_session`);
    // Delete user from users collection or unbind
    await deleteDoc(`users/${uid}`);
  }
}

console.log('\n🎉 Student 1039 has been completely reset to fresh state!');
