/**
 * One-time / ops: create or update the platform superadmin in auth_user.
 * Password MUST be supplied via environment variable (never commit secrets).
 *
 * Defaults match your requested account identifiers; set password when running:
 *   set SUPERADMIN_SEED_PASSWORD=YourSecurePasswordHere
 *   node scripts/seedSuperAdmin.js
 *
 * (PowerShell: $env:SUPERADMIN_SEED_PASSWORD="..." ; node scripts/seedSuperAdmin.js)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const sequelize = require('../src/config/db');
const User = require('../src/models/User');

const USERNAME = process.env.SUPERADMIN_SEED_USERNAME || 'Elkendeh@1';
const EMAIL = process.env.SUPERADMIN_SEED_EMAIL || 'admin@elkendeh.com';
const PASSWORD = process.env.SUPERADMIN_SEED_PASSWORD;

async function main() {
  if (!PASSWORD || !String(PASSWORD).trim()) {
    console.error('Set SUPERADMIN_SEED_PASSWORD in the environment before running this script.');
    process.exit(1);
  }

  await sequelize.authenticate();
  const hash = await bcrypt.hash(String(PASSWORD), 10);

  const [row, created] = await User.findOrCreate({
    where: { username: USERNAME },
    defaults: {
      password: hash,
      email: EMAIL,
      first_name: 'Super',
      last_name: 'Admin',
      is_active: true,
      is_staff: true,
      is_superuser: true,
    },
  });

  if (!created) {
    row.password = hash;
    row.email = EMAIL;
    row.is_active = true;
    row.is_staff = true;
    row.is_superuser = true;
    await row.save();
    console.log('Updated existing superadmin user:', USERNAME);
  } else {
    console.log('Created superadmin user:', USERNAME);
  }

  console.log('Email:', EMAIL);
  console.log('Sign in at your FRONTEND_APP_URL /login (e.g. https://pruhsms.africa/login) then open the Superadmin dashboard.');
  await sequelize.close();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
