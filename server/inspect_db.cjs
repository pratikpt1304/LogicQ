const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, prn: true, role: true, fullName: true },
  });
  console.log('=== USERS ===', users);

  const sections = await prisma.section.findMany({
    include: {
      _count: { select: { students: true, assessmentTests: true } },
    },
  });
  console.log('=== SECTIONS ===', sections);

  const sectionStudents = await prisma.sectionStudent.findMany();
  console.log('=== SECTION STUDENTS ===', sectionStudents);

  const tests = await prisma.assessmentTest.findMany({
    include: {
      _count: { select: { questions: true, assignments: true } },
    },
  });
  console.log('=== ASSESSMENT TESTS ===', tests);

  const assignments = await prisma.assessmentTestAssignment.findMany();
  console.log('=== TEST ASSIGNMENTS ===', assignments);
}

inspect().finally(() => prisma.$disconnect());
