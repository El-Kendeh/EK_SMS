/**
 * Creates `roles` / `users` tables (via Sequelize sync) and seeds the seven roles.
 * Run on Ubuntu after .env has DB_* set:
 *   node scripts/seedRoles.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const sequelize = require('../src/config/db');
const Role = require('../src/models/Role');
const User = require('../src/models/User');

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
  await Role.sync();
  await User.sync();

  for (const row of ROLES) {
    const [instance, created] = await Role.findOrCreate({
      where: { code: row.code },
      defaults: { name: row.name },
    });
    if (!created && instance.name !== row.name) {
      await instance.update({ name: row.name });
    }
  }

  console.log(`OK: tables roles + users ensured; ${ROLES.length} roles seeded.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await sequelize.close();
  });
