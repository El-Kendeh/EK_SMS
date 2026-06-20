const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';

function generateToken(user) {
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
    },
    JWT_SECRET,
    { expiresIn: '24h' }
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
