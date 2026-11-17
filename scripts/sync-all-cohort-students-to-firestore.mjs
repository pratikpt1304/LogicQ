import fs from 'fs';

// 1. Read firebase token
const cfg = JSON.parse(fs.readFileSync(process.env.USERPROFILE + '/.config/configstore/firebase-tools.json', 'utf8'));
const token = cfg.tokens.access_token;
const PROJECT_ID = 'logicq-clanguage';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// 2. Parse all cohort students from c-programming-cohort.data.ts
const file = fs.readFileSync('client/src/data/c-programming-cohort.data.ts', 'utf8');
const studentBlocks = file.split(/\{\s*index:/).slice(1);

const cohortStudents = studentBlocks.map(block => {
  const getField = (field) => {
    const regex = new RegExp(field + ':\\s*[\'"]?([^\'",\n]+)[\'"]?');
    const match = block.match(regex);
    return match ? match[1].trim() : '';
  };
  return {
    prn: getField('prn'),
    fullName: getField('fullName'),
    department: getField('department') || 'Integrated Mtech',
    year: getField('year') || 'FY',
    college: getField('college') || 'LogicQ',
    sectionId: getField('sectionId') || 'sec-mw6l4r2s',
    sectionName: getField('sectionName') || 'Integrated Mtech',
    joinCode: getField('joinCode') || 'LQ-INTE34',
    email: getField('email'),
  };
}).filter(s => s.prn && s.prn !== 'string;');

console.log(`Loaded ${cohortStudents.length} cohort students from file.`);

// 3. Fetch existing enrolled_students docs to preserve existing bound personal emails and customized fields
console.log('Fetching existing enrolled_students from Firestore...');
const existingRes = await fetch(`${BASE_URL}/enrolled_students?pageSize=300`, {
  headers: { Authorization: `Bearer ${token}` }
});
const existingData = await existingRes.json();
const existingDocsMap = new Map();
if (existingData.documents) {
  for (const doc of existingData.documents) {
    const docId = doc.name.split('/').pop().toUpperCase().trim();
    const fields = doc.fields || {};
    existingDocsMap.set(docId, fields);
  }
}
console.log(`Found ${existingDocsMap.size} existing enrolled_students in Firestore.`);

// 4. Upsert each student into enrolled_students/{PRN}
let inserted = 0;
let updated = 0;

for (const student of cohortStudents) {
  const prn = student.prn.toUpperCase().trim();
  const existingFields = existingDocsMap.get(prn);

  // If already exists with personal email, preserve it!
  let emailValue = student.email || `${prn.toLowerCase()}@sanjivani.edu.in`;
  if (existingFields && existingFields.email && existingFields.email.stringValue) {
    emailValue = existingFields.email.stringValue;
  }

  let statusValue = 'ACTIVE';
  if (existingFields && existingFields.status && existingFields.status.stringValue) {
    statusValue = existingFields.status.stringValue;
  }

  const fields = {
    id: { stringValue: prn },
    prn: { stringValue: prn },
    name: { stringValue: student.fullName },
    fullName: { stringValue: student.fullName },
    displayName: { stringValue: student.fullName },
    email: { stringValue: emailValue },
    role: { stringValue: 'STUDENT' },
    status: { stringValue: statusValue },
    department: { stringValue: student.department || 'Integrated Mtech' },
    year: { stringValue: student.year || 'FY' },
    division: { stringValue: 'A' },
    college: { stringValue: student.college || 'LogicQ' },
    sectionId: { stringValue: 'sec-mw6l4r2s' },
    sectionName: { stringValue: 'Integrated Mtech' },
    joinCode: { stringValue: 'LQ-INTE34' },
    academicScore: existingFields?.academicScore || { integerValue: '0' },
    integrityScore: existingFields?.integrityScore || { integerValue: '100' },
    totalPoints: existingFields?.totalPoints || { integerValue: '0' },
    totalSolved: existingFields?.totalSolved || { integerValue: '0' },
    updatedAt: { timestampValue: new Date().toISOString() },
  };

  if (!existingFields) {
    fields.enrolledAt = { timestampValue: new Date().toISOString() };
  }

  const patchUrl = `${BASE_URL}/enrolled_students/${prn}`;
  const res = await fetch(patchUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    console.error(`Failed to upsert ${prn}:`, await res.text());
  } else {
    if (existingFields) updated++;
    else inserted++;
  }
}

console.log(`Finished enrolled_students sync: ${inserted} inserted, ${updated} updated. Total: ${inserted + updated}`);

// 5. Update sections/sec-mw6l4r2s studentsCount to cohortStudents.length
console.log('Updating sections/sec-mw6l4r2s studentsCount...');
const secRes = await fetch(`${BASE_URL}/sections/sec-mw6l4r2s?updateMask.fieldPaths=studentsCount&updateMask.fieldPaths=sectionName&updateMask.fieldPaths=joinCode&updateMask.fieldPaths=course&updateMask.fieldPaths=subject&updateMask.fieldPaths=institution&updateMask.fieldPaths=academicYear`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    fields: {
      studentsCount: { integerValue: String(cohortStudents.length) },
      sectionName: { stringValue: 'Integrated Mtech' },
      joinCode: { stringValue: 'LQ-INTE34' },
      course: { stringValue: 'Integrated M.Tech' },
      subject: { stringValue: 'C Programming' },
      institution: { stringValue: 'LogicQ' },
      academicYear: { stringValue: '2026-2027' },
    }
  })
});

console.log('sections/sec-mw6l4r2s update status:', secRes.status);
