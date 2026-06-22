const School = require('../models/School');
const User = require('../models/User');
const SchoolAdmin = require('../models/SchoolAdmin');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const SystemOpsAlert = require('../models/SystemOpsAlert');
const sequelize = require('../config/db');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const os = require('os');
const { generateToken } = require('../utils/jwt');
const { sendSchoolApprovedEmail, sendPasswordResetEmail } = require('../utils/email');
const { sendSchoolRejectedEmail, sendSchoolChangeRequestEmail } = require('../services/mailer');
const { appendSecurityAuditLog } = require('../utils/auditLog');
const Role = require('../models/Role');

const successResponse = (data = {}, message = "Success") => ({ success: true, message, ...data });
const errorResponse = (message = "Error", status = 400) => ({ success: false, message, status });

function normalizePath(filePath) {
  if (!filePath) return null;
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.startsWith('http')) return normalized;
  if (normalized.startsWith('/uploads')) return normalized;
  if (normalized.startsWith('uploads')) return '/' + normalized;
  return normalized.includes('student') ? `/uploads/students/${normalized}` : `/uploads/badges/${normalized}`;
}

function serializeSchool(school) {
  const p = school.get({ plain: true });
  const admins = p.schoolAdmins || [];
  const firstLink = admins[0];
  const usr = firstLink?.user;
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
    region: p.region,
    phone: p.phone,
    email: p.email,
    website: p.website,
    capacity: p.capacity,
    motto: p.motto,
    established: p.established,
    registration_number: p.registration_number,
    estimated_teachers: p.estimated_teachers,
    academic_system: p.academic_system,
    grading_system: p.grading_system,
    language: p.language,
    brand_colors: p.brand_colors,
    badge_path: normalizePath(p.badge_path),
    badge: normalizePath(p.badge_path),
    admin_full_name: adminFull || null,
    admin_email: usr?.email || null,
    admin_username: usr?.username || null,
    admin_phone: usr?.phone || null,
    is_approved: approved,
    is_active: p.is_active !== false,
    registration_date: regDate,
    approval_date: approved ? regDate : null,
    changes_requested: !!p.changes_requested,
    rejection_reason: p.rejection_reason || null,
    principal_name: adminFull || null,
    code: String(p.id),
  };
}

// GET /api/schools/
async function getAllSchools(req, res) {
  try {
    const schools = await School.findAll({
      include: [{
        model: SchoolAdmin,
        as: 'schoolAdmins',
        include: [{ model: User, as: 'user' }]
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
      include: [{ model: SchoolAdmin, as: 'schoolAdmins' }]
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
      for (const adminLink of school.schoolAdmins) {
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
            await sendSchoolApprovedEmail(row.email, row.username || 'Admin', school.name, row.username, 'Please change on first login');
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

      // Revoke dashboard access for the school's admins (covers schools
      // that were approved earlier and are being rejected now).
      for (const adminLink of school.schoolAdmins || []) {
        const user = await User.findByPk(adminLink.user_id, { transaction });
        if (user && user.is_active) {
          user.is_active = false;
          await user.save({ transaction });
        }
      }
      await transaction.commit();

      // Send rejection email to school admin(s)
      for (const adminLink of school.schoolAdmins || []) {
        try {
          const user = await User.findByPk(adminLink.user_id);
          if (user && user.email && String(user.email).trim()) {
            await sendSchoolRejectedEmail({
              toEmail: String(user.email).trim(),
              schoolName: school.name,
              adminName: user.first_name || user.username || 'Admin',
              reason: note || 'Rejected by superadmin',
            });
          }
        } catch (err) {
          console.error('Rejection email failed:', err.message || err);
        }
      }

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

      // Send change request email to school admin(s)
      for (const adminLink of school.schoolAdmins || []) {
        try {
          const user = await User.findByPk(adminLink.user_id);
          if (user && user.email && String(user.email).trim()) {
            await sendSchoolChangeRequestEmail({
              toEmail: String(user.email).trim(),
              schoolName: school.name,
              adminName: user.first_name || user.username || 'Admin',
              note: note || 'Please review and update your application.',
            });
          }
        } catch (err) {
          console.error('Change request email failed:', err.message || err);
        }
      }

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
      include: [{ model: User, as: 'user' }]
    });

    if (!adminLink || !adminLink.user) {
      return res.status(404).json(errorResponse("No administrator found for this school", 404));
    }

    const user = adminLink.user;
    // Time-boxed, auditable impersonation session. The short-lived token carries
    // impersonation claims so the auth layer can (a) expire it server-side via the
    // JWT exp and (b) attribute every write back to the real operator. The matching
    // close is endImpersonation (POST /api/impersonate/end/).
    const IMPERSONATION_TTL = '30m';
    const impSessionId = require('crypto').randomUUID();
    const impStarted = Date.now();
    const token = generateToken(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: 'school_admin',
        is_superuser: false,
        is_staff: false,
        school_id: adminLink.school_id,
      },
      {
        expiresIn: IMPERSONATION_TTL,
        extraClaims: {
          imp: true,
          imp_actor: req.user?.username || 'superadmin',
          imp_actor_id: req.user?.id ?? null,
          imp_sid: impSessionId,
          imp_started: impStarted,
        },
      }
    );

    await appendSecurityAuditLog({
      type: 'impersonation',
      severity: 'high',
      actor: req.user?.username || 'superadmin',
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '—',
      action: `Started impersonating school admin '${user.username}' (school_id ${school_id})`,
      metadata: { imp_sid: impSessionId, target_user: user.username, school_id: adminLink.school_id, ttl: IMPERSONATION_TTL },
    });

    return res.json(successResponse({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: 'school_admin',
        is_active: user.is_active,
        school_id: adminLink.school_id
      }
    }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse("Internal server error", 500));
  }
}

// POST /api/impersonate/end/
// Called by the operator's "Return to Superadmin" action. The caller still holds
// the impersonation token, so we read its claims to close the audited session.
// Mounted as a SHARED route (the caller's role is school_admin during impersonation,
// so it cannot sit behind requireRole(['superadmin'])).
async function endImpersonation(req, res) {
  try {
    if (!req.user?.imp) {
      return res.status(400).json(errorResponse('Not an impersonation session', 400));
    }
    const startedMs = Number(req.user.imp_started) || null;
    const durationS = startedMs ? Math.max(0, Math.round((Date.now() - startedMs) / 1000)) : null;
    await appendSecurityAuditLog({
      type: 'impersonation_end',
      severity: 'high',
      actor: req.user.imp_actor || 'superadmin',
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '—',
      action: `Ended impersonation of '${req.user.username}' (school_id ${req.user.school_id})${durationS != null ? ` after ${durationS}s` : ''}`,
      metadata: { imp_sid: req.user.imp_sid || null, acting_as: req.user.username, school_id: req.user.school_id ?? null, duration_s: durationS },
    });
    return res.json(successResponse({ ended: true }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
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

    const alerts = rows.map((r) => {
      const bodyText = r.body || '';
      const titleText = r.title || '';
      const schoolMatch = bodyText.match(/school[:\s]+([^,\n]+)/i);
      const studentMatch = bodyText.match(/student[:\s]+([^,\n]+)/i);

      return {
        id: r.id,
        status: mapStatus(r.status),
        school: schoolMatch ? schoolMatch[1].trim() : '',
        student: studentMatch ? studentMatch[1].trim() : '',
        subject: bodyText.slice(0, 120),
        requester: { name: titleText || 'System' },
      };
    });

    return res.json(successResponse({ alerts }));
  } catch (e) {
    console.error(e);
    return res.json(successResponse({ alerts: [] }));
  }
}

// GET /api/system-health/
async function getSystemHealth(req, res) {
  let dbStatus = 'Operational';
  try {
    await sequelize.authenticate();
  } catch {
    dbStatus = 'Major Outage';
  }

  const services = [
    { id: 'api', label: 'Core API Server', status: 'Operational', uptime: 0.9998, icon: '⚡' },
    { id: 'db', label: 'Primary Database', status: dbStatus, uptime: 0.9995, icon: '🗄️' },
    { id: 'mail', label: 'Email Gateway (Resend)', status: process.env.RESEND_API_KEY ? 'Operational' : 'Degraded', uptime: 0.998, icon: '📧' },
    { id: 'auth', label: 'Identity Provider', status: 'Operational', uptime: 0.9999, icon: '🔑' },
  ];

  const mem = process.memoryUsage();
  const memoryUsagePct = Math.round((mem.heapUsed / mem.heapTotal) * 100);

  const cpus = os.cpus();
  let cpuLoad = 0;
  if (cpus.length > 0) {
    const totalIdle = cpus.reduce((sum, cpu) => sum + cpu.times.idle, 0);
    const totalTicks = cpus.reduce((sum, cpu) => sum + Object.values(cpu.times).reduce((a, b) => a + b, 0), 0);
    cpuLoad = totalTicks > 0 ? Math.round(((totalTicks - totalIdle) / totalTicks) * 100) : 0;
  }

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const sysMemPct = Math.round(((totalMem - freeMem) / totalMem) * 100);

  const networkInterfaces = os.networkInterfaces();
  let netIngress = 0;
  for (const iface of Object.values(networkInterfaces)) {
    for (const details of iface) {
      if (details.bytesReceived) {
        netIngress += details.bytesReceived;
      }
    }
  }
  const netIngressMB = Math.round((netIngress / (1024 * 1024)) * 100) / 100;

  const resources = [
    { label: 'CPU Load', value: cpuLoad, unit: '%' },
    { label: 'Memory Usage', value: sysMemPct, unit: '%' },
    { label: 'Node Heap', value: memoryUsagePct, unit: '%' },
    { label: 'Network Ingress', value: netIngressMB, unit: ' MB' },
  ];

  return res.json(successResponse({
    status: dbStatus === 'Operational' ? 'Healthy' : 'Degraded',
    uptime: Math.floor(process.uptime()),
    services,
    resources,
  }));
}

async function resetUserPassword(req, res) {
  const { user_id, new_password } = req.body;
  if (!user_id || !new_password) {
    return res.status(400).json(errorResponse("User ID and new password are required"));
  }

  try {
    const user = await User.findByPk(user_id);
    if (!user) return res.status(404).json(errorResponse("User not found"));

    // 1. Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);
    user.password = hashedPassword;
    await user.save();

    // 2. Identify Role
    const schoolAdminLink = await SchoolAdmin.findOne({ where: { user_id } });
    const teacherLink = await Teacher.findOne({ where: { user_id } });
    const studentLink = await Student.findOne({ where: { user_id } });
    let role = user.role?.code || 'user';
    if (user.is_superuser) role = 'superadmin';
    else if (schoolAdminLink) role = 'school_admin';
    else if (teacherLink) role = 'teacher';
    else if (studentLink) role = 'student';

    // 3. Mark for password change
    if (schoolAdminLink) {
      schoolAdminLink.must_change_password = true;
      await schoolAdminLink.save();
    }
    if (teacherLink) {
      teacherLink.must_change_password = true;
      await teacherLink.save();
    }

    // 4. Send Email
    if (user.email) {
      const fullName = `${user.first_name} ${user.last_name}`;
      await sendPasswordResetEmail(user.email, fullName, role, new_password);
    }

    await appendSecurityAuditLog({
      type: 'password_reset_admin',
      severity: 'medium',
      actor: req.user?.username || 'superadmin',
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '—',
      action: `Password reset by admin for user: ${user.username}`,
      metadata: { target_user_id: user_id },
    });

    return res.json(successResponse({}, "Password reset successfully and notification email sent."));
  } catch (err) {
    console.error('resetUserPassword Error:', err);
    return res.status(500).json(errorResponse("Internal server error during password reset"));
  }
}

// GET /api/superadmin/dashboard
async function getDashboard(req, res) {
  try {
    const schoolCount = await School.count();
    const totalUsers = await User.count();
    const pendingSchools = await School.count({ where: { is_approved: false, is_active: true } });
    const approvedSchools = await School.count({ where: { is_approved: true } });
    return res.json(successResponse({
      schools: schoolCount,
      total_users: totalUsers,
      pending_schools: pendingSchools,
      approved_schools: approvedSchools,
    }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse("Internal server error", 500));
  }
}

module.exports = {
  getAllSchools,
  handleSchoolAction,
  impersonate,
  endImpersonation,
  getGradeAlerts,
  getSystemHealth,
  resetUserPassword,
  getDashboard
};
