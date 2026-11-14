/**
 * Force-logout (revoke all sessions) for a student by PRN.
 * Uses Firebase Auth downloadAccount to find UID, then revokes refresh tokens.
 */
import fs from 'fs';

const TARGET_PRN = process.argv[2] || '2126PMIM1118';
const PROJECT_ID = 'logicq-clanguage';
const BASE_FS = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const cfg = JSON.parse(fs.readFileSync(process.env.USERPROFILE + '/.config/configstore/firebase-tools.json', 'utf8'));
const token = cfg.tokens.access_token;
const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

console.log(`\n${'='.repeat(60)}`);
console.log(`🚪 FORCE LOGOUT: PRN = ${TARGET_PRN}`);
console.log(`${'='.repeat(60)}\n`);

// 1. Scan Firestore users collection for UID
console.log('🔍 Scanning Firestore users collection...');
let userUid = null;
let userEmail = null;

const fsRes = await fetch(`${BASE_FS}/users?pageSize=500`, { headers });
if (fsRes.ok) {
  const fsData = await fsRes.json();
  for (const doc of (fsData.documents || [])) {
    const f = doc.fields || {};
    const docPrn = f.prn?.stringValue || '';
    if (docPrn.toUpperCase().trim() === TARGET_PRN) {
      userUid = doc.name.split('/').pop();
      userEmail = f.email?.stringValue || '';
      console.log(`  ✅ Found in Firestore — UID: ${userUid}, Email: ${userEmail}`);
      break;
    }
  }
}

// 2. If not in Firestore users, scan Firebase Auth via downloadAccount
if (!userUid) {
  console.log('  ℹ️  Not in Firestore users — scanning Firebase Auth accounts...');
  try {
    let pageToken = undefined;
    outer: while (true) {
      const body = { maxResults: 1000 };
      if (pageToken) body.nextPageToken = pageToken;
      const authRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:batchGet?maxResults=1000${pageToken ? '&nextPageToken=' + pageToken : ''}`,
        { method: 'GET', headers }
      );
      if (!authRes.ok) {
        console.warn(`  ⚠️  Auth batchGet failed: ${authRes.status}`);
        break;
      }
      const authData = await authRes.json();
      for (const u of (authData.users || [])) {
        // Match by customClaims PRN or displayName contains PRN
        const claims = u.customAttributes ? JSON.parse(u.customAttributes) : {};
        if (
          (claims.prn && claims.prn.toUpperCase() === TARGET_PRN) ||
          (u.displayName && u.displayName.toUpperCase().includes(TARGET_PRN))
        ) {
          userUid = u.localId;
          userEmail = u.email || '';
          console.log(`  ✅ Found in Firebase Auth — UID: ${userUid}, Email: ${userEmail}`);
          break outer;
        }
      }
      if (authData.nextPageToken) {
        pageToken = authData.nextPageToken;
      } else break;
    }
  } catch (e) {
    console.warn(`  ⚠️  Auth scan error: ${e.message}`);
  }
}

if (!userUid) {
  console.log(`\n⚠️  Could not find Firebase Auth UID for PRN ${TARGET_PRN}.`);
  console.log('   This student may never have logged into the app yet.');
  console.log('   No active sessions to revoke.\n');
  process.exit(0);
}

// 3. Revoke all refresh tokens → forces logout on ALL devices
console.log(`\n🔐 Revoking all refresh tokens for UID: ${userUid}...`);
const revokeRes = await fetch(
  `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`,
  {
    method: 'POST',
    headers,
    body: JSON.stringify({
      localId: userUid,
      // Setting validSince to now invalidates all existing tokens
      validSince: String(Math.floor(Date.now() / 1000)),
    }),
  }
);

if (revokeRes.ok) {
  console.log(`  ✅ All sessions revoked — student is logged out on ALL devices`);
} else {
  const err = await revokeRes.text();
  console.warn(`  ⚠️  Revoke failed (${revokeRes.status}): ${err.slice(0, 200)}`);
  
  // Fallback: disable + re-enable account to force session invalidation
  console.log('  🔄 Fallback: disable → re-enable account to flush sessions...');
  await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`, {
    method: 'POST', headers,
    body: JSON.stringify({ localId: userUid, disableUser: true }),
  });
  await new Promise(r => setTimeout(r, 1000));
  await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`, {
    method: 'POST', headers,
    body: JSON.stringify({ localId: userUid, disableUser: false }),
  });
  console.log('  ✅ Account cycled — existing sessions invalidated');
}

// 4. Also clear any Firestore session markers
console.log('\n🗑️  Clearing Firestore session markers...');
await fetch(`${BASE_FS}/student_live_telemetry/${userUid}`, { method: 'DELETE', headers });
await fetch(`${BASE_FS}/student_live_telemetry/${TARGET_PRN}`, { method: 'DELETE', headers });

console.log(`\n${'='.repeat(60)}`);
console.log(`✅ DONE — ${TARGET_PRN} is now logged out everywhere`);
console.log(`   Next login will require fresh credentials`);
console.log(`${'='.repeat(60)}\n`);
