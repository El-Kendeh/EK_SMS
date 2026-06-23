/**
 * Approval Controller
 * Handles superadmin school approval/rejection workflow
 */

const { Op } = require('sequelize');
const User = require('../models/User');
const School = require('../models/School');
const SchoolAdmin = require('../models/SchoolAdmin');
const sequelize = require('../config/db');
const { appendSecurityAuditLog } = require('../utils/auditLog');
const { sendSchoolApprovedEmail, sendSchoolRejectedEmail } = require('../services/mailer');

const successResponse = (data = {}, message = "Success") => ({ success: true, message, ...data });
const errorResponse = (message = "Error", status = 400) => ({ success: false, message, status });

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (xf && typeof xf === 'string') return xf.split(',')[0].trim().slice(0, 64);
  return (req.socket?.remoteAddress || '—').slice(0, 64);
}

/**
 * GET /api/approval/pending-schools
 * List all schools awaiting approval
 */
async function getPendingSchools(req, res) {
  try {
    const schools = await School.findAll({
      where: { approval_status: 'pending' },
      include: [
        {
          model: SchoolAdmin,
          as: 'schoolAdmins',
          include: [{ model: User, as: 'user' }],
        },
      ],
      order: [['created_at', 'ASC']],
    });

    const payload = schools.map((s) => {
      const admin = s.schoolAdmins?.[0]?.user;
      return {
        id: s.id,
        name: s.name,
        institution_type: s.institution_type,
        city: s.city,
        country: s.country,
        phone: s.phone,
        email: s.email,
        submitted_at: s.created_at,
        admin: {
          id: admin?.id,
          username: admin?.username,
          first_name: admin?.first_name,
          last_name: admin?.last_name,
          email: admin?.email,
          phone: admin?.phone,
        },
      };
    });

    return res.json(successResponse({ schools: payload, count: payload.length }));
  } catch (err) {
    console.error('Get pending schools error:', err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/**
 * GET /api/approval/school/:schoolId
 * Get detailed school info for review
 */
async function getSchoolForReview(req, res) {
  try {
    const { schoolId } = req.params;
    const school = await School.findByPk(schoolId, {
      include: [
        {
          model: SchoolAdmin,
          as: 'schoolAdmins',
          include: [{ model: User, as: 'user' }],
        },
      ],
    });

    if (!school) {
      return res.status(404).json(errorResponse('School not found', 404));
    }

    const admin = school.schoolAdmins?.[0]?.user;

    return res.json(successResponse({
      id: school.id,
      name: school.name,
      institution_type: school.institution_type,
      address: school.address,
      city: school.city,
      country: school.country,
      region: school.region,
      phone: school.phone,
      email: school.email,
      website: school.website,
      capacity: school.capacity,
      academic_system: school.academic_system,
      badge: school.badge_path,
      submitted_at: school.created_at,
      status: school.approval_status,
      rejection_reason: school.rejection_reason,
      admin: admin ? {
        id: admin.id,
        username: admin.username,
        first_name: admin.first_name,
        last_name: admin.last_name,
        email: admin.email,
        phone: admin.phone,
        is_active: admin.is_active,
      } : null,
    }));
  } catch (err) {
    console.error('Get school for review error:', err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/**
 * POST /api/approval/approve-school
 * Approve a school registration
 */
async function approveSchool(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { school_id, note } = req.body;
    const superadminId = req.user?.id;

    if (!school_id) {
      await transaction.rollback();
      return res.status(400).json(errorResponse('school_id is required'));
    }

    const school = await School.findByPk(school_id, {
      include: [{ model: SchoolAdmin, as: 'schoolAdmins', include: [{ model: User, as: 'user' }] }],
      transaction,
    });

    if (!school) {
      await transaction.rollback();
      return res.status(404).json(errorResponse('School not found', 404));
    }

    if (school.approval_status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json(errorResponse(`School already ${school.approval_status}`));
    }

    // Update school
    school.approval_status = 'approved';
    school.is_approved = true;
    school.approved_by = superadminId;
    await school.save({ transaction });

    // Activate all school admins for this school
    const adminIds = [];
    for (const adminLink of school.schoolAdmins) {
      const user = adminLink.user;
      user.is_active = true;
      await user.save({ transaction });
      adminIds.push(user.id);
    }

    await transaction.commit();

    // Send approval emails asynchronously (don't block response)
    for (const adminLink of school.schoolAdmins) {
      const user = adminLink.user;
      if (user.email) {
        sendSchoolApprovedEmail({
          toEmail: user.email,
          schoolName: school.name,
          adminName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        }).catch((err) => console.error('Approval email failed:', err.message));
      }
    }

    // Audit log
    await appendSecurityAuditLog({
      type: 'school_approved',
      severity: 'info',
      actor: req.user?.username || 'superadmin',
      ip: clientIp(req),
      action: `School approved: ${school.name}`,
      metadata: { school_id: school.id, approved_by: superadminId, admin_ids: adminIds },
    });

    return res.json(successResponse(
      { school_id: school.id, status: 'approved', approved_at: school.updated_at },
      'School approved successfully.'
    ));
  } catch (err) {
    await transaction.rollback();
    console.error('Approve school error:', err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/**
 * POST /api/approval/reject-school
 * Reject a school registration
 */
async function rejectSchool(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { school_id, reason } = req.body;
    const superadminId = req.user?.id;

    if (!school_id || !reason?.trim()) {
      await transaction.rollback();
      return res.status(400).json(errorResponse('school_id and reason are required'));
    }

    const school = await School.findByPk(school_id, {
      include: [{ model: SchoolAdmin, as: 'schoolAdmins', include: [{ model: User, as: 'user' }] }],
      transaction,
    });

    if (!school) {
      await transaction.rollback();
      return res.status(404).json(errorResponse('School not found', 404));
    }

    if (school.approval_status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json(errorResponse(`School already ${school.approval_status}`));
    }

    // Update school
    school.approval_status = 'rejected';
    school.is_approved = false;
    school.rejection_reason = reason.trim();
    school.approved_by = superadminId;
    await school.save({ transaction });

    // Keep admins inactive on rejection
    // (optionally: could set is_active=false explicitly)
    for (const adminLink of school.schoolAdmins) {
      const user = adminLink.user;
      if (!user.is_staff && !user.is_superuser) {
        user.is_active = false;
        await user.save({ transaction });
      }
    }

    await transaction.commit();

    // Send rejection emails asynchronously
    for (const adminLink of school.schoolAdmins) {
      const user = adminLink.user;
      if (user.email) {
        sendSchoolRejectedEmail({
          toEmail: user.email,
          schoolName: school.name,
          adminName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          reason: reason.trim(),
        }).catch((err) => console.error('Rejection email failed:', err.message));
      }
    }

    // Audit log
    await appendSecurityAuditLog({
      type: 'school_rejected',
      severity: 'medium',
      actor: req.user?.username || 'superadmin',
      ip: clientIp(req),
      action: `School rejected: ${school.name}`,
      metadata: { school_id: school.id, rejection_reason: reason, rejected_by: superadminId },
    });

    return res.json(successResponse(
      { school_id: school.id, status: 'rejected' },
      'School rejected.'
    ));
  } catch (err) {
    await transaction.rollback();
    console.error('Reject school error:', err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/**
 * GET /api/approval/approved-schools
 * List all approved schools
 */
async function getApprovedSchools(req, res) {
  try {
    const schools = await School.findAll({
      where: { approval_status: 'approved' },
      include: [
        {
          model: SchoolAdmin,
          as: 'schoolAdmins',
          include: [{ model: User, as: 'user' }],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    const payload = schools.map((s) => {
      const admin = s.schoolAdmins?.[0]?.user;
      return {
        id: s.id,
        name: s.name,
        city: s.city,
        approved_at: s.updated_at,
        admin_name: admin ? `${admin.first_name} ${admin.last_name}`.trim() : 'N/A',
      };
    });

    return res.json(successResponse({ schools: payload, count: payload.length }));
  } catch (err) {
    console.error('Get approved schools error:', err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

module.exports = {
  getPendingSchools,
  getSchoolForReview,
  approveSchool,
  rejectSchool,
  getApprovedSchools,
};
