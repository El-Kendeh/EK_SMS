/**
 * Per-request account-active / approval enforcement.
 *
 * Product rule: a school admin (and their school's users) may access tenant data
 * only AFTER the Super Admin approves the school. That approval is encoded in
 * User.is_active — registration creates the admin with is_active=false, approval
 * sets it true, rejection/suspension sets it false (see superadminController's
 * handleSchoolAction + registrationController). check-status gates the UI on `school.is_approved &&
 * user.is_active`.
 *
 * Login already blocks inactive non-superusers, but a token minted WHILE approved
 * would otherwise keep working after a later suspension/rejection — there is no
 * token revocation. This middleware re-checks is_active on every protected data
 * request, so access is withdrawn immediately when an account is deactivated.
 *
 * Notes:
 *  - Superadmin operators are never gated.
 *  - Apply this ONLY to tenant DATA routers (school routes + the shared
 *    superadmin/school_admin `sla` routes). Do NOT wrap auth/status/profile
 *    endpoints, so a pending user can still log out and call check-status.
 *  - Fails OPEN on a transient DB error (logs it) so a database blip can't become
 *    a global lockout; the route's own queries are still tenant-scoped.
 */
const User = require('../models/User');

async function requireActiveAccount(req, res, next) {
  // Superadmin operators are never gated by tenant approval.
  if (req.user?.role === 'superadmin' || req.user?.is_superuser) return next();

  if (!req.user?.id) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  try {
    const user = await User.findByPk(req.user.id, { attributes: ['id', 'is_active'] });
    if (!user || user.is_active === false) {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_INACTIVE',
        message: 'Your account is not active. Access requires Super Admin approval of your school.',
      });
    }
    return next();
  } catch (err) {
    // Fail OPEN on a transient lookup error — do not turn a DB blip into a global
    // lockout. The downstream handler's own (tenant-scoped) queries still run.
    console.error('requireActiveAccount lookup failed:', err.message);
    return next();
  }
}

module.exports = requireActiveAccount;
