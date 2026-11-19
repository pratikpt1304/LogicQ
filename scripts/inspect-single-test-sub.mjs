import fs from 'fs';

const PROJECT_ID = 'logicq-clanguage';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const cfgPath = process.env.USERPROFILE + '/.config/configstore/firebase-tools.json';
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const token = cfg.tokens.access_token;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

async function listDocs(col) {
  const res = await fetch(`${BASE}/${col}?pageSize=500`, { headers });
  if (!res.ok) return [];
  const d = await res.json();
  return d.documents || [];
}

const testSubs = await listDocs('assessment_test_submissions');
for (const d of testSubs) {
  const f = d.fields || {};
  const prn = (f.studentPrn?.stringValue || f.prn?.stringValue || '').toUpperCase().trim();
  const email = (f.studentEmail?.stringValue || f.email?.stringValue || '').toLowerCase().trim();
  if (prn.includes('1051') || email.includes('1051') || email.includes('ritesh')) {
    console.log('assessment_test_submission document:', d.name.split('/').pop());
    console.log(JSON.stringify(f, null, 2));
    break;
  }
}
