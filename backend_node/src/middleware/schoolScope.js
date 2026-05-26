module.exports = function schoolScope(req, res, next) {
  // For non-superadmin, always scope to their school_id from JWT
  if (req.user.role !== 'superadmin' && req.user.school_id) {
    req.schoolId = req.user.school_id;
  }
  // For superadmin, allow ?school_id query param override
  if (req.user.role === 'superadmin' && req.query.school_id) {
    req.schoolId = parseInt(req.query.school_id);
  }
  next();
};
