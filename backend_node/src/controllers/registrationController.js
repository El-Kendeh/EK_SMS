/**
 * Registration & Approval Controller
 * Handles school admin registration and superadmin approval workflow
 */

const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const User = require('../models/User');
const Role = require('../models/Role');
const School = require('../models/School');
const SchoolAdmin = require('../models/SchoolAdmin');
const sequelize = require('../config/db');
const { generateToken } = require('../utils/jwt');
const { appendSecurityAuditLog } = require('../utils/auditLog');
const { sendSchoolApprovedEmail, sendSchoolRejectedEmail, sendRegistrationConfirmationEmail } = require('../services/mailer');

const successResponse = (data = {}, message = "Success") => ({ success: true, message, ...data });
const errorResponse = (message = "Error", status = 400) => ({ success: false, message, status });

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (xf && typeof xf === 'string') return xf.split(',')[0].trim().slice(0, 64);
  return (req.socket?.remoteAddress || '—').slice(0, 64);
}

/* The pruh_core_school table has no approval_status column — status is
   derived from the flags the approve/reject/request-changes actions set. */
function deriveApprovalStatus(school) {
  if (school.is_approved) return 'approved';
  if (school.changes_requested) return 'changes_requested';
  if (school.rejection_reason || school.is_active === false) return 'rejected';
  return 'pending';
}

function normalizeBrandColorsForDb(raw) {
  if (raw == null || raw === '') return null;
  if (Array.isArray(raw)) return JSON.stringify(raw);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return JSON.stringify(parsed);
    } catch (_) {}
    return raw;
  }
  return String(raw);
}

/**
 * POST /api/registration/register-school-admin
 * Register a new school with admin account
 */
async function registerSchoolAdmin(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const {
      institutionName, institutionType, address, city, country, phone, email,
      firstName, lastName, adminUsername, adminEmail, adminPhone, password, capacity, brandColors,
      website, region, academicSystem, motto, established, registrationNumber,
      estimatedTeachers, gradingSystem, language
    } = req.body;

    const schoolBadge = req.file ? req.file.path : null;

    // Validation
    if (!institutionName?.trim() || !adminUsername?.trim() || !adminEmail?.trim() || !password?.trim()) {
      await transaction.rollback();
      return res.status(400).json(errorResponse("Required fields missing"));
    }

    if (password.length < 8) {
      await transaction.rollback();
      return res.status(400).json(errorResponse("Password must be at least 8 characters"));
    }

    // Check for duplicate username
    const existingUser = await User.findOne({ where: { username: adminUsername.toLowerCase() } }, { transaction });
    if (existingUser) {
      await transaction.rollback();
      return res.status(400).json(errorResponse("Username already exists"));
    }

    // Check for duplicate email
    const existingEmail = await User.findOne({ where: { email: adminEmail.toLowerCase() } }, { transaction });
    if (existingEmail) {
      await transaction.rollback();
      return res.status(400).json(errorResponse("Email already registered"));
    }

    // Check for duplicate school email
    if (email?.trim()) {
      const existingSchool = await School.findOne({ where: { email: email.toLowerCase() } }, { transaction });
      if (existingSchool) {
        await transaction.rollback();
        return res.status(400).json(errorResponse("School email already registered"));
      }
    }

    // Get schooladmin role
    const schooladminRole = await Role.findOne({ where: { code: 'schooladmin' } }, { transaction });
    if (!schooladminRole) {
      await transaction.rollback();
      return res.status(400).json(errorResponse("Role not found"));
    }

    const brandColorsText = normalizeBrandColorsForDb(brandColors);
    const capacityInt = capacity === '' || capacity == null ? null : parseInt(capacity, 10);

    // 1. Create User (with is_active = false until approved)
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: adminUsername.toLowerCase(),
      password: hashedPassword,
      email: adminEmail.toLowerCase(),
      first_name: firstName,
      last_name: lastName,
      phone: adminPhone,
      is_active: false, // Blocked until school approval
      role_id: schooladminRole.id,
    }, { transaction });

    // 2. Create School
    const school = await School.create({
      name: institutionName,
      institution_type: institutionType,
      address,
      city,
      country,
      region,
      phone,
      email: email?.toLowerCase(),
      website,
      capacity: Number.isFinite(capacityInt) ? capacityInt : null,
      motto,
      established,
      registration_number: registrationNumber,
      estimated_teachers: estimatedTeachers ? parseInt(estimatedTeachers, 10) : null,
      academic_system: academicSystem,
      grading_system: gradingSystem,
      language,
      brand_colors: brandColorsText,
      badge_path: schoolBadge,
      is_approved: false,
      is_active: true,
    }, { transaction });

    // 3. Link Admin to School
    await SchoolAdmin.create({
      user_id: user.id,
      school_id: school.id,
    }, { transaction });

    await transaction.commit();

    // Send confirmation email
    try {
      await sendRegistrationConfirmationEmail({
        toEmail: adminEmail,
        schoolName: institutionName,
        adminName: `${firstName} ${lastName}`,
      });
    } catch (emailErr) {
      console.error('Registration confirmation email failed:', emailErr.message);
    }

    // Audit log
    await appendSecurityAuditLog({
      type: 'school_registration_submitted',
      severity: 'info',
      actor: adminUsername,
      ip: clientIp(req),
      action: `School registration: ${institutionName}`,
      metadata: { school_id: school.id, user_id: user.id },
    });

    return res.status(201).json(successResponse(
      { school_id: school.id, user_id: user.id, status: 'pending' },
      'Registration submitted successfully. Awaiting approval.'
    ));
  } catch (err) {
    await transaction.rollback();
    console.error('Registration error:', err);
    return res.status(500).json(errorResponse(err.message || 'Registration failed'));
  }
}

/**
 * GET /api/registration/status/:schoolId
 * Check school approval status
 */
async function getRegistrationStatus(req, res) {
  try {
    const { schoolId } = req.params;
    const school = await School.findByPk(schoolId, {
      include: [{ model: SchoolAdmin, as: 'schoolAdmins', include: [{ model: User, as: 'user' }] }],
    });

    if (!school) {
      return res.status(404).json(errorResponse('School not found', 404));
    }

    const admin = school.schoolAdmins?.[0]?.user;

    return res.json(successResponse({
      school_id: school.id,
      school_name: school.name,
      status: deriveApprovalStatus(school),
      is_approved: school.is_approved,
      submitted_at: school.created_at,
      approved_at: school.is_approved ? (school.updated_at || school.created_at) : null,
      rejection_reason: school.rejection_reason,
      admin: admin ? {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        is_active: admin.is_active,
      } : null,
    }));
  } catch (err) {
    console.error('Get registration status error:', err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/**
 * GET /api/registration/check-status
 * Get current user's school approval status (requires auth)
 */
async function checkMySchoolStatus(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(errorResponse('Unauthorized', 401));
    }

    const schoolAdmin = await SchoolAdmin.findOne({
      where: { user_id: userId },
      include: [{ model: School, as: 'school' }],
    });

    if (!schoolAdmin) {
      return res.status(404).json(errorResponse('No school found for this user', 404));
    }

    const school = schoolAdmin.school;
    const user = await User.findByPk(userId);

    return res.json(successResponse({
      school_id: school.id,
      school_name: school.name,
      status: deriveApprovalStatus(school),
      is_approved: school.is_approved,
      user_is_active: user.is_active,
      submitted_at: school.created_at,
      approved_at: school.is_approved ? (school.updated_at || school.created_at) : null,
      rejection_reason: school.rejection_reason,
      can_access_dashboard: school.is_approved && user.is_active,
    }));
  } catch (err) {
    console.error('Check school status error:', err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

module.exports = {
  registerSchoolAdmin,
  getRegistrationStatus,
  checkMySchoolStatus,
};
