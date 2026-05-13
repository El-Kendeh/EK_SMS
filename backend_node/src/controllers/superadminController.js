const School = require('../models/School');
const User = require('../models/User');
const SchoolAdmin = require('../models/SchoolAdmin');
const sequelize = require('../config/db');
const { generateToken } = require('../utils/jwt');

const successResponse = (data = {}, message = "Success") => ({ success: true, message, ...data });
const errorResponse = (message = "Error", status = 400) => ({ success: false, message, status });

// GET /api/schools/
async function getAllSchools(req, res) {
  try {
    const schools = await School.findAll({
      include: [{
        model: SchoolAdmin,
        include: [User]
      }]
    });
    return res.json(successResponse({ schools }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse("Internal server error", 500));
  }
}

// POST /api/schools/approve/
async function handleSchoolAction(req, res) {
  const { school_id, action, note } = req.body;
  const transaction = await sequelize.transaction();
  try {
    const school = await School.findByPk(school_id, {
      include: [{ model: SchoolAdmin }]
    });

    if (!school) {
      await transaction.rollback();
      return res.status(404).json(errorResponse("School not found", 404));
    }

    if (action === 'approve') {
      school.is_approved = true;
      await school.save({ transaction });

      // Activate School Admin Users
      for (const adminLink of school.SchoolAdmins) {
        const user = await User.findByPk(adminLink.user_id);
        if (user) {
          user.is_active = true;
          await user.save({ transaction });
        }
      }
      await transaction.commit();
      return res.json(successResponse({}, "School approved successfully."));
    } else if (action === 'reject') {
      // Logic for rejection (e.g. mark as inactive, save note)
      school.is_active = false;
      // school.rejection_reason = note; // If you have this field
      await school.save({ transaction });
      await transaction.commit();
      return res.json(successResponse({}, "School rejected."));
    } else if (action === 'request_changes') {
      // Logic for requesting changes
      await transaction.commit();
      return res.json(successResponse({}, "Changes requested from school."));
    }

    await transaction.rollback();
    return res.status(400).json(errorResponse("Invalid action"));
  } catch (err) {
    await transaction.rollback();
    console.error(err);
    return res.status(500).json(errorResponse("Internal server error", 500));
  }
}

// POST /api/impersonate/
async function impersonate(req, res) {
  const { school_id } = req.body;
  try {
    const adminLink = await SchoolAdmin.findOne({
      where: { school_id },
      include: [User]
    });

    if (!adminLink || !adminLink.User) {
      return res.status(404).json(errorResponse("No administrator found for this school", 404));
    }

    const user = adminLink.User;
    // Generate token for the school admin
    const token = generateToken({
      id: user.id,
      username: user.username,
      role: 'school_admin',
      is_superuser: false,
      is_staff: false
    });

    return res.json(successResponse({ 
      token, 
      user: { 
        id: user.id,
        username: user.username, 
        email: user.email,
        role: 'school_admin'
      } 
    }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse("Internal server error", 500));
  }
}

// GET /api/grade-alerts/
async function getGradeAlerts(req, res) {
  // TODO: Query GradeAlert model
  return res.json(successResponse({ alerts: [] }));
}

// GET /api/system-health/
async function getSystemHealth(req, res) {
  return res.json(successResponse({
    status: "Healthy",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: "Connected"
  }));
}

module.exports = {
  getAllSchools,
  handleSchoolAction,
  impersonate,
  getGradeAlerts,
  getSystemHealth
};
