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
      email: s.email,
      phone: s.phone,
      address: s.address,
      city: s.city,
      region: s.region,
      country: s.country,
      website: s.website,
      badge: s.badge_path,
      badge_path: s.badge_path,
      brand_colors: s.brand_colors || '',
      motto: s.motto,
      institution_type: s.institution_type || '',
      academic_system: s.academic_system,
      capacity: s.capacity,
      is_approved: !!s.is_approved,
      is_active: s.is_active !== false,
      code: String(s.id),
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
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const link = await SchoolAdmin.findOne({
      where: { user_id: req.user.id },
      include: [{ model: School }],
    });

    if (!link || !link.School) {
      return res.status(404).json({ success: false, message: 'School not found.' });
    }

    const school = link.School;
    const { phone, address, city, country, brand_colors, motto } = req.body;

    // Update fields
    if (phone !== undefined) school.phone = phone;
    if (address !== undefined) school.address = address;
    if (city !== undefined) school.city = city;
    if (country !== undefined) school.country = country;
    if (brand_colors !== undefined) school.brand_colors = brand_colors;
    if (motto !== undefined) school.motto = motto;

    // Handle badge file if uploaded
    if (req.file) {
      school.badge_path = req.file.path;
    }

    await school.save();

    return res.json(successResponse({
      school: {
        id: school.id,
        name: school.name,
        phone: school.phone,
        address: school.address,
        city: school.city,
        country: school.country,
        badge: school.badge_path,
        badge_path: school.badge_path,
        brand_colors: school.brand_colors,
        motto: school.motto,
      }
    }, 'School information updated successfully'));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to update school information' });
  }
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
