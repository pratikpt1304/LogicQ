const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const u = await prisma.user.findFirst({ where: { email: 'faculty.demo@sanjivani.edu.in' } });
  console.log('User found:', u);
}
main().finally(() => prisma.$disconnect());
