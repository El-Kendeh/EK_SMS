/**
 * School-scoping middleware.
 * Attaches req.schoolId based on the authenticated user's role and JWT data.
 *
 * - Non-superadmin users: always scoped to their own school_id from JWT.
 * - Superadmin users: can override via ?school_id query param (visibility switch).
 * - If no school_id is resolved, req.schoolId remains undefined (superadmin sees all).
 */
function schoolScope(req, res, next) {
  const role = req.user?.role;
  const jwtSchoolId = req.user?.school_id;

  if (role === 'superadmin') {
    // Superadmin can optionally scope to a specific school via query param
    if (req.query.school_id) {
      req.schoolId = parseInt(req.query.school_id, 10);
    }
    // Otherwise undefined → no filter (sees all schools)
  } else if (jwtSchoolId) {
    // All other roles are always scoped to their school
    req.schoolId = jwtSchoolId;
  }

  next();
}

module.exports = schoolScope;
