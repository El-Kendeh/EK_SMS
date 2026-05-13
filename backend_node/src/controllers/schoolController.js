const School = require('../models/School');
const SchoolAdmin = require('../models/SchoolAdmin');

const successResponse = (data = {}, message = "Success") => ({ success: true, message, ...data });

async function getSchoolInfo(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const link = await SchoolAdmin.findOne({
      where: { user_id: req.user.id },
      include: [{ model: School }],
    });

    if (!link || !link.School) {
      return res.json(successResponse({
        id: null,
        name: '',
        is_approved: false,
        brand_colors: '',
        institution_type: '',
        total_students: 0,
        total_teachers: 0,
        active_classes: 0,
        attendance_rate: 0,
        avg_performance: 0,
        pending_actions: 0,
        fees_collected: 0,
        fees_outstanding: 0,
      }));
    }

    const s = link.School;
    return res.json(successResponse({
      id: s.id,
      name: s.name,
      is_approved: !!s.is_approved,
      brand_colors: s.brand_colors || '',
      institution_type: s.institution_type || '',
      total_students: 0,
      total_teachers: 0,
      active_classes: 0,
      attendance_rate: 0,
      avg_performance: 0,
      pending_actions: 0,
      fees_collected: 0,
      fees_outstanding: 0,
    }));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

async function updateSchoolInfo(req, res) {
  return res.json(successResponse({}, "School info updated"));
}

async function checkSchoolName(req, res) {
  const { name } = req.query;
  if (!name) return res.json({ exists: false, available: false });

  try {
    const school = await School.findOne({ where: { name } });
    return res.json({
      exists: !!school,
      available: !school
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  getSchoolInfo,
  updateSchoolInfo,
  checkSchoolName
};
