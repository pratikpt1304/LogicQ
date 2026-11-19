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

const enrolled = await listDocs('enrolled_students');
for (const d of enrolled) {
  const id = d.name.split('/').pop();
  const f = d.fields || {};
  if (id.includes('1051') || (f.prn?.stringValue || '').includes('1051')) {
    console.log('enrolled_students 1051:', id, JSON.stringify(f, null, 2));
  }
}
