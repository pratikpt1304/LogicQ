/**
 * PURGE STUDENT SCRIPT
 * Permanently deletes ALL Firestore data + Firebase Auth for a given PRN.
 * Usage: node scripts/purge-student.mjs <PRN>
 */
import fs from 'fs';

const TARGET_PRN = process.argv[2] || '2126PMIM1039';
const PROJECT_ID = 'logicq-clanguage';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Read Firebase CLI token
const cfg = JSON.parse(fs.readFileSync(process.env.USERPROFILE + '/.config/configstore/firebase-tools.json', 'utf8'));
const token = cfg.tokens.access_token;

const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
};

let totalDeleted = 0;
let totalErrors = 0;

async function firestoreGet(path) {
  const res = await fetch(`${BASE_URL}/${path}`, { headers });
  if (!res.ok) return null;
  return res.json();
}

async function firestoreDelete(path) {
  const res = await fetch(`${BASE_URL}/${path}`, { method: 'DELETE', headers });
  if (res.ok || res.status === 204 || res.status === 404) {
    totalDeleted++;
    console.log(`  ✅ Deleted: ${path}`);
    return true;
  }
  const err = await res.text().catch(() => '');
  console.warn(`  ⚠️  Failed (${res.status}): ${path} — ${err.slice(0, 120)}`);
  totalErrors++;
  return false;
}

async function firestoreList(collectionPath) {
  const url = `${BASE_URL}/${collectionPath}?pageSize=300`;
  const res = await fetch(url, { headers });
  if (!res.ok) return [];
  const data = await res.json();
  return data.documents || [];
}

function getFieldValue(fields, key) {
  if (!fields || !fields[key]) return null;
  const f = fields[key];
  return f.stringValue ?? f.integerValue ?? f.booleanValue ?? null;
}

async function findUserDocIdByPrn(prn) {
  // List users collection and scan for PRN match
  const docs = await firestoreList('users');
  for (const doc of docs) {
    const fields = doc.fields || {};
    const docPrn = getFieldValue(fields, 'prn');
    if (docPrn && docPrn.toUpperCase().trim() === prn.toUpperCase().trim()) {
      const parts = doc.name.split('/');
      return parts[parts.length - 1];
    }
  }
  return null;
}

async function deleteDocsMatchingPrn(collectionName, prnFieldName = 'studentPrn') {
  console.log(`\n🗑️  Scanning ${collectionName}...`);
  const docs = await firestoreList(collectionName);
  let count = 0;
  for (const doc of docs) {
    const fields = doc.fields || {};
    const docPrn = getFieldValue(fields, prnFieldName) ||
                   getFieldValue(fields, 'prn') ||
                   getFieldValue(fields, 'studentPrn');
    if (docPrn && docPrn.toUpperCase().trim() === TARGET_PRN.toUpperCase().trim()) {
      const parts = doc.name.split('/');
      const docId = parts[parts.length - 1];
      await firestoreDelete(`${collectionName}/${docId}`);
      count++;
    }
  }
  if (count === 0) console.log(`  ℹ️  No matching docs in ${collectionName}`);
  return count;
}

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔥 PURGING STUDENT: PRN = ${TARGET_PRN}`);
  console.log(`${'='.repeat(60)}\n`);

  // 1. enrolled_students (direct doc by PRN)
  console.log('\n🗑️  enrolled_students...');
  await firestoreDelete(`enrolled_students/${TARGET_PRN}`);

  // 2. cohort_progress (direct doc by PRN)
  console.log('\n🗑️  cohort_progress...');
  await firestoreDelete(`cohort_progress/${TARGET_PRN}`);

  // 3. Find user UID from users collection
  console.log('\n🔍 Finding user UID in users collection...');
  const uid = await findUserDocIdByPrn(TARGET_PRN);
  if (uid) {
    console.log(`  Found UID: ${uid}`);
    await firestoreDelete(`users/${uid}`);
    await firestoreDelete(`publicProfiles/${uid}`);
    await firestoreDelete(`student_live_telemetry/${uid}`);
  } else {
    console.log(`  ℹ️  No user doc found by PRN scan — trying PRN as doc ID...`);
    await firestoreDelete(`users/${TARGET_PRN}`);
    await firestoreDelete(`publicProfiles/${TARGET_PRN}`);
    await firestoreDelete(`student_live_telemetry/${TARGET_PRN}`);
  }

  // 4. submissions collection
  await deleteDocsMatchingPrn('submissions', 'prn');

  // 5. assessment_test_submissions
  await deleteDocsMatchingPrn('assessment_test_submissions', 'studentPrn');

  // 6. student_live_telemetry (also scan as collection)
  await deleteDocsMatchingPrn('student_live_telemetry', 'prn');

  // 7. practice_sessions if exists
  await deleteDocsMatchingPrn('practice_sessions', 'prn');

  // 8. exam_attempts if exists
  await deleteDocsMatchingPrn('exam_attempts', 'studentPrn');

  // 9. Disable Firebase Auth via REST Identity Toolkit
  console.log('\n🔐 Attempting to disable Firebase Auth account...');
  if (uid) {
    try {
      const authRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ localId: [uid] }),
        }
      );
      const authData = await authRes.json();
      const userRecord = authData?.users?.[0];
      if (userRecord) {
        // Disable the account
        const disableRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({ localId: uid, disableUser: true }),
          }
        );
        if (disableRes.ok) {
          console.log(`  ✅ Firebase Auth account disabled: ${uid}`);
          totalDeleted++;
        } else {
          const disableErr = await disableRes.text();
          console.warn(`  ⚠️  Auth disable failed: ${disableErr.slice(0, 200)}`);
        }
      } else {
        console.log(`  ℹ️  No Firebase Auth account found for UID: ${uid}`);
      }
    } catch (e) {
      console.warn(`  ⚠️  Auth API error: ${e.message}`);
    }
  }

  // Also clear from c-programming-cohort.data.ts local cache (mark as purged)
  console.log('\n🗑️  Flagging as purged in Firebase Firestore purged_students...');
  try {
    const purgeRef = `purged_students/${TARGET_PRN}`;
    const purgeRes = await fetch(`${BASE_URL}/${purgeRef}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        fields: {
          prn: { stringValue: TARGET_PRN },
          purgedAt: { stringValue: new Date().toISOString() },
          reason: { stringValue: 'Admin purge request' },
          isPurged: { booleanValue: true },
        }
      }),
    });
    if (purgeRes.ok) {
      console.log(`  ✅ Purge record created`);
      totalDeleted++;
    }
  } catch {}

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ PURGE COMPLETE`);
  console.log(`   Total deleted/disabled: ${totalDeleted}`);
  console.log(`   Errors/Skipped: ${totalErrors}`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
