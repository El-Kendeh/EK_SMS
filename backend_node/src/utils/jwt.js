const jwt = require('jsonwebtoken');

// In production, refuse to start on a public default signing key — a known
// secret means anyone can forge a token for any user (incl. superadmin).
// Dev/test may fall back to a fixed insecure secret so local work isn't blocked.
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not set. Refusing to start with a public default signing key.');
  }
  console.warn('⚠️  JWT_SECRET not set — using an insecure dev-only key. NEVER run production like this.');
  return 'dev-only-insecure-secret-do-not-use-in-production';
})();

function generateToken(user, options = {}) {
  const { expiresIn = '24h', extraClaims = {} } = options;
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      role: user.role, // Custom role if any
      is_superuser: user.is_superuser,
      is_staff: user.is_staff,
      // school_id is REQUIRED for tenant scoping (schoolScope middleware +
      // scopedSchoolId). Without it, school_admin/teacher/etc. requests are
      // rejected with "No school is linked to your account".
      school_id: user.school_id ?? null,
      // Optional impersonation claims (imp / imp_actor / imp_sid / imp_started)
      // injected by impersonate() so the auth layer can time-box + audit the session.
      ...extraClaims,
    },
    JWT_SECRET,
    { expiresIn }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = { generateToken, verifyToken };
