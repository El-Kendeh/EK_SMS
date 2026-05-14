/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/** Stable codes for RBAC checks (match Prisma `Role.code`). */
const ROLES = [
  { code: 'superadmin', name: 'Superadmin' },
  { code: 'teacher', name: 'Teacher' },
  { code: 'student', name: 'Student' },
  { code: 'parent', name: 'Parent' },
  { code: 'bursar', name: 'Bursar' },
  { code: 'schooladmin', name: 'School admin' },
  { code: 'principal', name: 'Principal' },
];

async function main() {
  for (const r of ROLES) {
    await prisma.role.upsert({
      where: { code: r.code },
      create: { code: r.code, name: r.name },
      update: { name: r.name },
    });
  }
  console.log(`Seeded ${ROLES.length} roles.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
