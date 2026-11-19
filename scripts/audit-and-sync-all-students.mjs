import fs from 'fs';

const PROJECT_ID = 'logicq-clanguage';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const cfgPath = process.env.USERPROFILE + '/.config/configstore/firebase-tools.json';
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const token = cfg.tokens.access_token;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

async function getAllDocs(col) {
  let all = [];
  let pageToken = '';
  do {
    const url = `${BASE}/${col}?pageSize=300${pageToken ? '&pageToken=' + pageToken : ''}`;
    const res = await fetch(url, { headers });
    if (!res.ok) break;
    const d = await res.json();
    if (d.documents) all = all.concat(d.documents);
    pageToken = d.nextPageToken;
  } while (pageToken);
  return all;
}

const allSubs = await getAllDocs('submissions');
const allTestSubs = await getAllDocs('assessment_test_submissions');

// Map of PRN -> Set of accepted practice topic problem IDs
const studentSolvedMap = new Map();

for (const d of [...allSubs, ...allTestSubs]) {
  const f = d.fields || {};
  const prn = (f.studentPrn?.stringValue || f.prn?.stringValue || '').toUpperCase().trim();
  const verdict = f.verdict?.stringValue || f.status?.stringValue || '';
  const score = Number(f.academicScore?.integerValue || f.score?.integerValue || f.points?.integerValue || 0);
  const pId = f.problemId?.stringValue || f.problemSlug?.stringValue;
  
  if (prn && pId && pId.startsWith('m') && (verdict === 'ACCEPTED' || verdict === 'PASSED' || score > 0)) {
    if (!studentSolvedMap.has(prn)) {
      studentSolvedMap.set(prn, new Set());
    }
    studentSolvedMap.get(prn).add(pId);
  }
}

console.log('Students with accepted submissions in database:', studentSolvedMap.size);

const cpDocs = await getAllDocs('cohort_progress');
let outOfSyncCount = 0;

for (const d of cpDocs) {
  const prn = d.name.split('/').pop().toUpperCase().trim();
  const f = d.fields || {};
  const currentTotal = Number(f.totalSolved?.integerValue || 0);
  const currentComp = f.completedProblems?.arrayValue?.values?.map(v => v.stringValue).filter(Boolean) || [];
  const compSet = new Set(currentComp);

  const subSet = studentSolvedMap.get(prn) || new Set();
  // Merge both
  const merged = new Set([...compSet, ...subSet]);
  
  if (merged.size > currentTotal || merged.size > compSet.size) {
    outOfSyncCount++;
    console.log(`Student ${prn} (${f.studentName?.stringValue}): cohort_progress=${currentTotal}, but actual merged=${merged.size}`);
    
    // Patch cohort_progress to be accurate
    const patchUrl = `${BASE}/cohort_progress/${prn}?updateMask.fieldPaths=completedProblems&updateMask.fieldPaths=totalSolved&updateMask.fieldPaths=totalPoints`;
    const body = {
      fields: {
        completedProblems: {
          arrayValue: {
            values: Array.from(merged).sort().map(p => ({ stringValue: p }))
          }
        },
        totalSolved: {
          integerValue: String(merged.size)
        },
        totalPoints: {
          integerValue: String(merged.size * 20)
        }
      }
    };
    await fetch(patchUrl, { method: 'PATCH', headers, body: JSON.stringify(body) });
  }
}

console.log(`Synced ${outOfSyncCount} students to full consistency between submissions and cohort_progress.`);
