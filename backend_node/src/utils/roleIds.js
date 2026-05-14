const Role = require('../models/Role');

/**
 * Resolve a role primary key from `roles.code`, or throw so callers surface a clear ops error.
 */
async function requireRoleId(code) {
  const row = await Role.findOne({ where: { code } });
  if (!row) {
    throw new Error(`Role "${code}" not found. Run: npm run seed:roles`);
  }
  return row.id;
}

/** Maps superadmin UI labels to `roles.code`. */
function mapInviteLabelToCode(label) {
  const m = String(label || '').trim();
  if (m === 'Super Admin') return 'superadmin';
  if (m === 'School Admin') return 'schooladmin';
  if (m === 'Teacher') return 'teacher';
  if (m === 'Parent') return 'parent';
  if (m === 'Principal') return 'principal';
  if (m === 'Bursar') return 'bursar';
  if (m === 'Student') return 'student';
  return 'schooladmin';
}

module.exports = { requireRoleId, mapInviteLabelToCode };
