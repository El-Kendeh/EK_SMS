/**
 * Role-based access control middleware.
 * Verifies that the authenticated user has one of the allowed roles.
 *
 * Usage:
 *   router.get('/sensitive-route', requireRole(['superadmin']), handler);
 *   router.get('/school-route', requireRole(['superadmin', 'school_admin']), handler);
 *
 * @param {string[]} allowedRoles — array of role codes that can access this route
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ success: false, message: `Access denied. Requires one of: ${allowedRoles.join(', ')}.` });
    }
    next();
  };
}

module.exports = requireRole;
