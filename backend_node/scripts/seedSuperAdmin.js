/**
 * Creates / updates the platform superadmin in MySQL `users` with role `superadmin`.
 * Login uses this table; JWT sets superadmin when role.code is superadmin.
 *
 * Defaults (override with env):
 *   SUPERADMIN_SEED_USERNAME, SUPERADMIN_SEED_EMAIL,
 *   SUPERADMIN_SEED_FIRST_NAME, SUPERADMIN_SEED_LAST_NAME
 *
 * Password: SUPERADMIN_SEED_PASSWORD in .env or:
 *   npm run seed:superadmin -- 'your-password'
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const sequelize = require('../src/config/db');
const User = require('../src/models/User');
const Role = require('../src/models/Role');

const USERNAME = process.env.SUPERADMIN_SEED_USERNAME || 'Elkendeh@1';
const EMAIL = process.env.SUPERADMIN_SEED_EMAIL || 'admin@elkendeh.com';
const FIRST_NAME = process.env.SUPERADMIN_SEED_FIRST_NAME || 'Elkendeh';
const LAST_NAME = process.env.SUPERADMIN_SEED_LAST_NAME || 'Pruh';
const PASSWORD =
  process.env.SUPERADMIN_SEED_PASSWORD ||
  (process.argv[2] && String(process.argv[2]).trim() ? String(process.argv[2]).trim() : null);

async function main() {
  if (!PASSWORD) {
    console.error(
      'Set SUPERADMIN_SEED_PASSWORD in backend_node/.env, or run:\n' +
        "  npm run seed:superadmin -- 'your-password'\n"
    );
    process.exit(1);
  }

  await sequelize.authenticate();
  await Role.sync();
  await User.sync();

  const [superRole] = await Role.findOrCreate({
    where: { code: 'superadmin' },
    defaults: { name: 'Superadmin' },
  });

  const hash = await bcrypt.hash(String(PASSWORD), 10);

  const [row, created] = await User.unscoped().findOrCreate({
    where: { username: USERNAME },
    defaults: {
      password: hash,
      email: EMAIL,
      first_name: FIRST_NAME,
      last_name: LAST_NAME,
      is_active: true,
      role_id: superRole.id,
    },
  });

  if (!created) {
    row.password = hash;
    row.email = EMAIL;
    row.first_name = FIRST_NAME;
    row.last_name = LAST_NAME;
    row.is_active = true;
    row.role_id = superRole.id;
    await row.save();
    console.log('Updated superadmin user:', USERNAME);
  } else {
    console.log('Created superadmin user:', USERNAME);
  }

  console.log('Email:', EMAIL);
  console.log('Sign in at your app /login with username or email, then open the Superadmin dashboard.');
  await sequelize.close();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
