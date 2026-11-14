/**
 * Backfill bound emails from cohort_progress into enrolled_students
 */
import fs from 'fs';

const PROJECT_ID = 'logicq-clanguage';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const cfg = JSON.parse(fs.readFileSync(process.env.USERPROFILE + '/.config/configstore/firebase-tools.json', 'utf8'));
const token = cfg.tokens.access_token;
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

async function fetchAll(col) {
  const res = await fetch(`${BASE}/${col}?pageSize=300`, { headers });
  const data = await res.json();
  return data.documents || [];
}

console.log('Fetching collections...');
const [enrolledDocs, cohortDocs] = await Promise.all([
  fetchAll('enrolled_students'),
  fetchAll('cohort_progress')
]);

console.log(`enrolled_students: ${enrolledDocs.length}, cohort_progress: ${cohortDocs.length}`);

// Build map of bound emails from cohort_progress
const boundMap = new Map();
for (const doc of cohortDocs) {
  const id = doc.name.split('/').pop().toUpperCase().trim();
  const f = doc.fields || {};
  const b = f.boundEmail?.stringValue || f.studentEmail?.stringValue || '';
  if (b && !b.endsWith('@sanjivani.edu.in') && b.includes('@')) {
    boundMap.set(id, b.toLowerCase().trim());
  }
}

console.log(`Found ${boundMap.size} bound emails in cohort_progress.`);

let updatedCount = 0;

for (const doc of enrolledDocs) {
  const docId = doc.name.split('/').pop();
  const f = doc.fields || {};
  const prn = (f.prn?.stringValue || docId).toUpperCase().trim();

  // Try direct match, or 1226/2126 match
  let targetEmail = boundMap.get(prn) || boundMap.get(docId.toUpperCase().trim());
  if (!targetEmail) {
    if (prn.startsWith('1226')) {
      targetEmail = boundMap.get('2126' + prn.slice(4));
    } else if (prn.startsWith('2126')) {
      targetEmail = boundMap.get('1226' + prn.slice(4));
    }
  }

  if (targetEmail) {
    const currentEmail = f.email?.stringValue || '';
    const currentBound = f.boundEmail?.stringValue || '';
    const isBound = f.isEmailBound?.booleanValue || false;

    // Patch document
    const patchBody = {
      fields: {
        ...f,
        boundEmail: { stringValue: targetEmail },
        email: { stringValue: targetEmail },
        isEmailBound: { booleanValue: true },
        isEmailBoundV2: { booleanValue: true },
        emailVerified: { booleanValue: true },
        identityStatus: { stringValue: 'BOUND' }
      }
    };

    const updateMask = 'updateMask.fieldPaths=boundEmail&updateMask.fieldPaths=email&updateMask.fieldPaths=isEmailBound&updateMask.fieldPaths=isEmailBoundV2&updateMask.fieldPaths=emailVerified&updateMask.fieldPaths=identityStatus';
    const patchUrl = `${BASE}/enrolled_students/${docId}?${updateMask}`;

    const patchRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(patchBody)
    });

    if (patchRes.ok) {
      updatedCount++;
      console.log(`[UPDATED] ${docId} (${prn}) -> ${targetEmail}`);
    } else {
      const err = await patchRes.text();
      console.error(`[FAILED] ${docId}:`, err);
    }
  }
}

console.log(`\nSuccessfully backfilled ${updatedCount} enrolled_students documents.`);
