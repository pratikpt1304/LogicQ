import fs from 'fs';

function updateCohortFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/export const C_PROGRAMMING_COHORT_STUDENTS: EnrolledCohortStudent\[\] = (\[[\s\S]*?\]);/);
  if (!match) throw new Error('Match failed for ' + filePath);
  
  // Safely evaluate array
  const arr = Function('return ' + match[1])();
  arr.sort((a, b) => {
    const numA = parseInt((a.prn || '').replace(/\D/g, '').slice(-4), 10) || 0;
    const numB = parseInt((b.prn || '').replace(/\D/g, '').slice(-4), 10) || 0;
    if (numA !== numB) return numA - numB;
    return a.prn.localeCompare(b.prn);
  });
  arr.forEach((item, idx) => { item.index = idx + 1; });
  
  const formattedRows = arr.map(s => 
    `  { index: ${s.index}, prn: "${s.prn}", fullName: "${s.fullName}", department: "${s.department}", year: "${s.year}", college: "${s.college}", sectionId: "${s.sectionId}", sectionName: "${s.sectionName}", joinCode: "${s.joinCode}", email: "${s.email}", role: 'STUDENT', profileComplete: true },`
  ).join('\n');
  
  const newArrayCode = `export const C_PROGRAMMING_COHORT_STUDENTS: EnrolledCohortStudent[] = [\n${formattedRows}\n];`;
  content = content.replace(/export const C_PROGRAMMING_COHORT_STUDENTS: EnrolledCohortStudent\[\] = \[[\s\S]*?\];/, newArrayCode);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated ' + filePath);
}

updateCohortFile('client/src/data/c-programming-cohort.data.ts');
updateCohortFile('server/src/data/c-programming-cohort.data.ts');
