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

const sections = await listDocs('sections');
for (const s of sections) {
  const f = s.fields || {};
  const str = JSON.stringify(f);
  if (str.includes('1051') || str.includes('ritesh')) {
    console.log('Found 1051 in section:', s.name.split('/').pop());
    // Parse students in this section
    const stArr = f.students?.arrayValue?.values || [];
    for (const st of stArr) {
      const stMap = st.mapValue?.fields || {};
      const prn = stMap.prn?.stringValue || '';
      if (prn.includes('1051')) {
        console.log('Student object in section:', JSON.stringify(stMap, null, 2));
      }
    }
  }
}
