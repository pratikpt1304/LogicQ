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

async function getDoc(path) {
  const res = await fetch(`${BASE}/${path}`, { headers });
  if (!res.ok) return null;
  return await res.json();
}

function arePrnsMatching(p1, p2) {
  if (!p1 || !p2) return false;
  const c1 = String(p1).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const c2 = String(p2).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (c1 === c2) return true;
  // Last 4 digits match?
  if (c1.length >= 4 && c2.length >= 4) {
    const s1 = c1.slice(-4);
    const s2 = c2.slice(-4);
    if (s1 === s2 && (c1.includes('PMI') || c2.includes('PMI') || c1.includes('1051') || c2.includes('1051'))) {
      console.log(`arePrnsMatching matched: "${p1}" and "${p2}"!`);
      return true;
    }
  }
  return false;
}

const assessSnap = await listDocs('assessment_test_submissions');
const subSnap = await listDocs('submissions');

const assessSubs = assessSnap.map(d => {
  const f = d.fields || {};
  const res = {};
  for (const [k, v] of Object.entries(f)) {
    res[k] = v.stringValue ?? v.integerValue ?? v.booleanValue ?? v;
  }
  return res;
});

const genSubs = subSnap.map(d => {
  const f = d.fields || {};
  const res = {};
  for (const [k, v] of Object.entries(f)) {
    res[k] = v.stringValue ?? v.integerValue ?? v.booleanValue ?? v;
  }
  return res;
});

const prnClean = '2126PMIM1051';
const userEmail = 'riteshadhav538@gmail.com';
const userId = '2126PMIM1051';

const matchedSubs = [...assessSubs, ...genSubs].filter((s) => {
  const sPrn = s.studentPrn || s.prn || '';
  const sEmail = (s.studentEmail || s.email || '').toLowerCase().trim();
  const sUid = (s.userId || s.studentId || '').trim();
  return (prnClean && arePrnsMatching(sPrn, prnClean)) ||
         (userEmail && sEmail && sEmail === userEmail) ||
         (userId && sUid && sUid === userId);
});

console.log('Total matchedSubs:', matchedSubs.length);

const uniqueProblems = new Set();
matchedSubs.forEach((s) => {
  if (s.verdict === 'ACCEPTED' || s.status === 'PASSED' || s.academicScore > 0 || (s.testOutcomes && s.testOutcomes.some((t) => t.passed))) {
    uniqueProblems.add(s.problemId || s.problemTitle || s.problemSlug || s.title || s.id);
  }
});

console.log('Unique problems from matchedSubs:', uniqueProblems.size);
console.log('Unique problem IDs:', Array.from(uniqueProblems));
