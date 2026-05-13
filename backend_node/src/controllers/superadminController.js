const School = require('../models/School');
const User = require('../models/User');
const SchoolAdmin = require('../models/SchoolAdmin');
const SystemOpsAlert = require('../models/SystemOpsAlert');
const sequelize = require('../config/db');
const { Op } = require('sequelize');
const { generateToken } = require('../utils/jwt');
const { sendSchoolApprovedEmail } = require('../services/mailer');
const { appendSecurityAuditLog } = require('../utils/auditLog');

const successResponse = (data = {}, message = "Success") => ({ success: true, message, ...data });
const errorResponse = (message = "Error", status = 400) => ({ success: false, message, status });

function serializeSchool(school) {
  const p = school.get({ plain: true });
  const admins = p.SchoolAdmins || [];
  const firstLink = admins[0];
  const usr = firstLink?.User;
  const adminFull = usr ? [usr.first_name, usr.last_name].filter(Boolean).join(' ').trim() : '';
  const regDate = p.created_at ? new Date(p.created_at).toISOString() : null;
  const approved = !!p.is_approved;
  return {
    id: p.id,
    name: p.name,
    institution_type: p.institution_type,
    address: p.address,
    city: p.city,
    country: p.country,
    phone: p.phone,
    email: p.email,
    capacity: p.capacity,
    brand_colors: p.brand_colors,
    badge_path: p.badge_path,
    is_approved: approved,
    is_active: p.is_active !== false,
    registration_date: regDate,
    approval_date: approved ? regDate : null,
    changes_requested: !!p.changes_requested,
    rejection_reason: p.rejection_reason || null,
    principal_name: adminFull || null,
    admin_full_name: adminFull || null,
    admin_email: usr?.email || null,
    code: String(p.id),
  };
}

// GET /api/schools/
async function getAllSchools(req, res) {
  try {
    const schools = await School.findAll({
      include: [{
        model: SchoolAdmin,
        include: [User]
      }],
      order: [['id', 'DESC']],
    });
    const payload = schools.map(serializeSchool);
    return res.json(successResponse({ schools: payload }));
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
      const alreadyApproved = !!school.is_approved;
      school.is_approved = true;
      school.is_active = true;
      school.rejection_reason = null;
      school.changes_requested = false;
      await school.save({ transaction });

      const emailQueue = [];
      for (const adminLink of school.SchoolAdmins) {
        const user = await User.findByPk(adminLink.user_id, { transaction });
        if (user) {
          user.is_active = true;
          await user.save({ transaction });
          if (user.email && String(user.email).trim()) {
            emailQueue.push({ email: String(user.email).trim(), username: user.username });
          }
        }
      }
      await transaction.commit();

      await appendSecurityAuditLog({
        type: 'school_approved',
        severity: 'low',
        actor: req.user?.username || 'superadmin',
        ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '—',
        action: `School approved: ${school.name}`,
        metadata: { school_id: school.id },
      });

      if (!alreadyApproved && emailQueue.length) {
        for (const row of emailQueue) {
          try {
            await sendSchoolApprovedEmail({
              toEmail: row.email,
              schoolName: school.name,
              adminUsername: row.username,
            });
          } catch (err) {
            console.error('Approval email failed:', err.message || err);
          }
        }
      }

      return res.json(successResponse({}, "School approved successfully."));
    } else if (action === 'reject') {
      school.is_active = false;
      school.is_approved = false;
      school.rejection_reason = note || 'Rejected by superadmin';
      school.changes_requested = false;
      await school.save({ transaction });
      await transaction.commit();
      await appendSecurityAuditLog({
        type: 'school_rejected',
        severity: 'medium',
        actor: req.user?.username || 'superadmin',
        ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '—',
        action: `School rejected: ${school.name}`,
        metadata: { school_id: school.id, note },
      });
      return res.json(successResponse({}, "School rejected."));
    } else if (action === 'request_changes') {
      school.changes_requested = true;
      await school.save({ transaction });
      await transaction.commit();
      await appendSecurityAuditLog({
        type: 'school_changes_requested',
        severity: 'low',
        actor: req.user?.username || 'superadmin',
        ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '—',
        action: `Changes requested: ${school.name}`,
        metadata: { school_id: school.id, note },
      });
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

    await appendSecurityAuditLog({
      type: 'impersonation',
      severity: 'medium',
      actor: req.user?.username || 'superadmin',
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '—',
      action: `Impersonate school admin for school_id ${school_id}`,
      metadata: { target_user: user.username },
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
  try {
    const rows = await SystemOpsAlert.findAll({
      where: { trigger_type: { [Op.like]: 'grade%' } },
      order: [['created_at', 'DESC']],
      limit: 200,
    });
    const mapStatus = (s) => {
      if (s === 'new') return 'Pending';
      if (s === 'acknowledged' || s === 'resolved') return 'Approved';
      return 'Flagged';
    };
    const alerts = rows.map((r) => ({
      id: r.id,
      status: mapStatus(r.status),
      school: '',
      student: '',
      subject: (r.body || '').slice(0, 120),
      requester: { name: r.title || 'System' },
    }));
    return res.json(successResponse({ alerts }));
  } catch (e) {
    console.error(e);
    return res.json(successResponse({ alerts: [] }));
  }
}

// GET /api/system-health/
async function getSystemHealth(req, res) {
  let database = 'Connected';
  try {
    await sequelize.authenticate();
  } catch {
    database = 'Disconnected';
  }
  return res.json(successResponse({
    status: 'Healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database,
  }));
}

module.exports = {
  getAllSchools,
  handleSchoolAction,
  impersonate,
  getGradeAlerts,
  getSystemHealth
};
