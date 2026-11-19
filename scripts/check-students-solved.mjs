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

const cpDocs = await listDocs('cohort_progress');
console.log('Total cohort_progress documents:', cpDocs.length);

for (const d of cpDocs) {
  const prn = d.name.split('/').pop();
  const f = d.fields || {};
  const totalSolved = f.totalSolved?.integerValue || 0;
  const compCount = f.completedProblems?.arrayValue?.values?.length || 0;
  if (totalSolved > 0 || compCount > 0) {
    console.log(`PRN: ${prn}, totalSolved: ${totalSolved}, completedProblems: ${compCount}, name: ${f.studentName?.stringValue}`);
  }
}
