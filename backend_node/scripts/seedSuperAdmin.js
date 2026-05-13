/**
 * One-time / ops: create or update the platform superadmin in auth_user.
 * Password MUST be supplied via environment or backend_node/.env (never commit secrets).
 *
 * From the backend_node directory (where package.json lives):
 *
 * Linux / macOS (bash):
 *   export SUPERADMIN_SEED_PASSWORD='your-password-here'
 *   npm run seed:superadmin
 *
 * Or one line:
 *   SUPERADMIN_SEED_PASSWORD='your-password-here' npm run seed:superadmin
 *
 * Windows PowerShell:
 *   $env:SUPERADMIN_SEED_PASSWORD = 'your-password-here'; npm run seed:superadmin
 *
 * Or add SUPERADMIN_SEED_PASSWORD=... to backend_node/.env and run: npm run seed:superadmin
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
    console.error(
      'SUPERADMIN_SEED_PASSWORD is not set.\n\n' +
        'Linux/macOS (bash), from this folder:\n' +
        "  export SUPERADMIN_SEED_PASSWORD='your-password'\n" +
        '  npm run seed:superadmin\n\n' +
        'One line:\n' +
        "  SUPERADMIN_SEED_PASSWORD='your-password' npm run seed:superadmin\n\n" +
        'Or put SUPERADMIN_SEED_PASSWORD=... in backend_node/.env\n'
    );
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
