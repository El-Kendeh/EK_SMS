/**
 * Creates / updates the platform superadmin in `auth_user` (login + JWT + dashboard)
 * and mirrors the same account in `users` + `roles` (PortalUser / superadmin).
 *
 * Defaults match platform owner (override with env):
 *   SUPERADMIN_SEED_USERNAME   (default Elkendeh@1)
 *   SUPERADMIN_SEED_EMAIL      (default admin@elkendeh.com)
 *   SUPERADMIN_SEED_FIRST_NAME (default Elkendeh)
 *   SUPERADMIN_SEED_LAST_NAME  (default Pruh)
 *
 * Password is NEVER stored in this file. Provide one of:
 *   - SUPERADMIN_SEED_PASSWORD in backend_node/.env
 *   - Or pass as first argument after -- :
 *       npm run seed:superadmin -- 'your-password'
 *   Linux one-liner:
 *       SUPERADMIN_SEED_PASSWORD='your-password' npm run seed:superadmin
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const sequelize = require('../src/config/db');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const PortalUser = require('../src/models/PortalUser');

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
  await PortalUser.sync();

  const [superRole] = await Role.findOrCreate({
    where: { code: 'superadmin' },
    defaults: { name: 'Superadmin' },
  });

  const hash = await bcrypt.hash(String(PASSWORD), 10);

  const [row, created] = await User.findOrCreate({
    where: { username: USERNAME },
    defaults: {
      password: hash,
      email: EMAIL,
      first_name: FIRST_NAME,
      last_name: LAST_NAME,
      is_active: true,
      is_staff: true,
      is_superuser: true,
    },
  });

  if (!created) {
    row.password = hash;
    row.email = EMAIL;
    row.first_name = FIRST_NAME;
    row.last_name = LAST_NAME;
    row.is_active = true;
    row.is_staff = true;
    row.is_superuser = true;
    await row.save();
    console.log('Updated auth_user superadmin:', USERNAME);
  } else {
    console.log('Created auth_user superadmin:', USERNAME);
  }

  const [portal, portalCreated] = await PortalUser.findOrCreate({
    where: { username: USERNAME },
    defaults: {
      password_hash: hash,
      email: EMAIL,
      first_name: FIRST_NAME,
      last_name: LAST_NAME,
      is_active: true,
      role_id: superRole.id,
    },
  });

  if (!portalCreated) {
    await portal.update({
      password_hash: hash,
      email: EMAIL,
      first_name: FIRST_NAME,
      last_name: LAST_NAME,
      is_active: true,
      role_id: superRole.id,
    });
    console.log('Updated PortalUser (users table):', USERNAME);
  } else {
    console.log('Created PortalUser (users table):', USERNAME);
  }

  console.log('Email:', EMAIL);
  console.log('Role: superadmin (JWT uses auth_user.is_superuser for dashboard access).');
  console.log('Sign in at your app /login with username or email, then open the Superadmin dashboard.');
  await sequelize.close();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
