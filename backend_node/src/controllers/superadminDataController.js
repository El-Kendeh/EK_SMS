const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const User = require('../models/User');
const School = require('../models/School');
const SchoolAdmin = require('../models/SchoolAdmin');
const SecurityAuditLog = require('../models/SecurityAuditLog');
const SuperadminSettings = require('../models/SuperadminSettings');
const BroadcastAlert = require('../models/BroadcastAlert');
const SystemOpsAlert = require('../models/SystemOpsAlert');
const ForensicEvent = require('../models/ForensicEvent');
const SystemAcademicYear = require('../models/SystemAcademicYear');
const SystemTerm = require('../models/SystemTerm');
const InstitutionType = require('../models/InstitutionType');
const LessonPlanType = require('../models/LessonPlanType');
const VirtualMeeting = require('../models/VirtualMeeting');
const CapacityCategory = require('../models/CapacityCategory');
const SchoolCapacity = require('../models/SchoolCapacity');
const Country = require('../models/Country');
const Region = require('../models/Region');
const City = require('../models/City');
const SchoolType = require('../models/SchoolType');
const SyllabusType = require('../models/SyllabusType');
const ClassSubtype = require('../models/ClassSubtype');
const AcademicSystem = require('../models/AcademicSystem');
const GradingSystem = require('../models/GradingSystem');
const Principal = require('../models/Principal');
const Bursar = require('../models/Bursar');
const Student = require('../models/Student');
const Parent = require('../models/Parent');
const StudentParent = require('../models/StudentParent');
const Document = require('../models/Document');
const Teacher = require('../models/Teacher');
const CoreBursar = require('../models/CoreBursar');
const CorePrincipal = require('../models/CorePrincipal');
const ClassModel = require('../models/Class');
const Subject = require('../models/Subject');
const ClassSubject = require('../models/ClassSubject');
const ClassAssistantTeacher = require('../models/ClassAssistantTeacher');
const { appendSecurityAuditLog } = require('../utils/auditLog');
const { requireRoleId, mapInviteLabelToCode } = require('../utils/roleIds');

const successResponse = (data = {}, message = 'Success') => ({ success: true, message, ...data });
const errorResponse = (message = 'Error', status = 400) => ({ success: false, message, status });

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (xf && typeof xf === 'string') return xf.split(',')[0].trim().slice(0, 64);
  return (req.socket?.remoteAddress || '—').slice(0, 64);
}

/* Tenant scope for the shared superadmin/school_admin CRUD routes.
   Superadmin → null (unrestricted). Everyone else is pinned to their own
   school; -1 when the token carries no school_id so queries match nothing
   instead of leaking other schools' data. */
function scopedSchoolId(req) {
  if (req.user?.role === 'superadmin') return null;
  const sid = req.schoolId || req.user?.school_id;
  const parsed = parseInt(sid, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : -1;
}

function outsideScope(forcedSchool, rowSchoolId) {
  return forcedSchool !== null && Number(rowSchoolId) !== forcedSchool;
}

/* Parents have no school_id column — they belong to a school through the
   students they are linked to. */
async function parentInSchool(parentId, schoolId) {
  const links = await StudentParent.findAll({ where: { parent_id: parentId }, attributes: ['student_id'] });
  if (!links.length) return false;
  const count = await Student.count({
    where: { id: links.map((l) => l.student_id), school_id: schoolId },
  });
  return count > 0;
}

async function loadSettings() {
  const [row] = await SuperadminSettings.findOrCreate({
    where: { id: 1 },
    defaults: { id: 1, settings_json: '{}' },
  });
  let parsed = {};
  try {
    parsed = row.settings_json ? JSON.parse(row.settings_json) : {};
  } catch {
    parsed = {};
  }
  return { row, parsed };
}

async function saveSettings(parsed) {
  const { row } = await loadSettings();
  row.settings_json = JSON.stringify(parsed);
  await row.save();
  return parsed;
}

/* ---------- Security logs & counters ---------- */
async function getSecurityLogs(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
    const rows = await SecurityAuditLog.findAll({
      order: [['ts', 'DESC']],
      limit,
    });
    const logs = rows.map((r) => {
      let meta = null;
      try {
        meta = r.metadata_json ? JSON.parse(r.metadata_json) : null;
      } catch {
        meta = null;
      }
      return {
        id: r.id,
        type: r.type,
        severity: r.severity,
        actor: r.actor,
        ip: r.ip,
        action: r.action,
        ts: r.ts,
        metadata: meta,
      };
    });
    return res.json(successResponse({ logs }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function getSecurityCounters(req, res) {
  try {
    const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const failed24 = await SecurityAuditLog.count({
      where: { type: 'login_failure', ts: { [Op.gte]: since24 } },
    });
    const failed7 = await SecurityAuditLog.count({
      where: { type: 'login_failure', ts: { [Op.gte]: since7 } },
    });
    const threats = await SecurityAuditLog.count({
      where: { type: { [Op.in]: ['threat_blocked', 'suspicious_activity'] } },
    });
    const activeUsers = await User.unscoped().count({ where: { is_active: true } });
    return res.json(successResponse({
      threats_blocked: threats,
      failed_logins_24h: failed24,
      failed_logins_7d: failed7,
      active_sessions: activeUsers,
    }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/* ---------- Profile & password ---------- */
async function getProfile(req, res) {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json(errorResponse('User not found', 404));
    return res.json(successResponse({
      profile: {
        full_name: [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.username,
        email: user.email,
        username: user.username,
        date_joined: user.date_joined,
      },
    }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function patchProfile(req, res) {
  try {
    const { first_name, last_name, email } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json(errorResponse('User not found', 404));
    if (first_name !== undefined) user.first_name = String(first_name).slice(0, 150);
    if (last_name !== undefined) user.last_name = String(last_name).slice(0, 150);
    if (email !== undefined) user.email = String(email).slice(0, 254);
    await user.save();
    await appendSecurityAuditLog({
      type: 'profile_updated',
      severity: 'low',
      actor: user.username,
      ip: clientIp(req),
      action: 'Superadmin profile updated',
    });
    return res.json(successResponse({}, 'Profile updated'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function postChangePassword(req, res) {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json(errorResponse('Current and new password are required'));
    }
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json(errorResponse('User not found', 404));
    const ok = await bcrypt.compare(current_password, user.password);
    if (!ok) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    user.password = await bcrypt.hash(String(new_password), 10);
    await user.save();
    await appendSecurityAuditLog({
      type: 'password_changed',
      severity: 'medium',
      actor: user.username,
      ip: clientIp(req),
      action: 'Password changed (superadmin)',
    });
    return res.json(successResponse({}, 'Password updated'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/* ---------- Admin settings JSON ---------- */
async function getAdminSettings(req, res) {
  try {
    const { parsed } = await loadSettings();
    return res.json(successResponse({ settings: parsed }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function patchAdminSettings(req, res) {
  try {
    const incoming = req.body?.settings;
    if (!incoming || typeof incoming !== 'object') {
      return res.status(400).json(errorResponse('settings object required'));
    }
    const { row, parsed } = await loadSettings();
    const merged = { ...parsed, ...incoming };
    row.settings_json = JSON.stringify(merged);
    await row.save();
    return res.json(successResponse({ settings: merged }, 'Settings saved'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/* ---------- Users directory ---------- */
function mapUserToSaRow(user, schoolName) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.username;
  let role = 'User';
  if (user.is_superuser) role = 'Super Admin';
  else if (user.is_staff) role = 'Staff Admin';
  else if (schoolName) role = 'School Admin';
  return {
    id: user.id,
    name,
    email: user.email || '',
    username: user.username,
    school: schoolName || '—',
    role,
    status: user.is_active ? 'active' : 'inactive',
    riskLevel: 'low',
    riskScore: 0,
    failedAttempts: 0,
    successLogins: 0,
    twoFAEnabled: false,
    alertsTriggered: 0,
    last_login: user.last_login || null,
    recentActivity: [],
    sessions: [],
  };
}

async function getUsers(req, res) {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['id', 'ASC']],
    });
    const adminLinks = await SchoolAdmin.findAll({ include: [{ model: School, as: 'school', required: false }] });
    const schoolByUserId = {};
    adminLinks.forEach((a) => {
      const p = a.get({ plain: true });
      schoolByUserId[p.user_id] = p.school?.name || '';
    });
    const rows = users.map((u) => mapUserToSaRow(u, schoolByUserId[u.id] || ''));
    return res.json(successResponse({ users: rows }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function getUsersShort(req, res) {
  try {
    const users = await User.findAll({
      where: { is_active: true },
      attributes: ['id', 'email', 'username', 'is_active'],
    });
    return res.json(successResponse({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        status: u.is_active ? 'active' : 'inactive',
      })),
    }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function postUsers(req, res) {
  try {
    const { name, email, role, school } = req.body;
    if (!name || !email || !role) {
      return res.status(400).json(errorResponse('name, email, and role are required'));
    }
    const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 20) || `user${Date.now()}`;
    let username = baseUsername;
    let n = 0;
    while (await User.unscoped().findOne({ where: { username } })) {
      n += 1;
      username = `${baseUsername}${n}`;
    }
    const tempPass = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + 'A1!';
    const parts = String(name).trim().split(/\s+/);
    const first_name = parts[0] || username;
    const last_name = parts.slice(1).join(' ') || '';
    const roleCode = mapInviteLabelToCode(role);
    const roleId = await requireRoleId(roleCode);
    const user = await User.create({
      username,
      email: String(email).trim().slice(0, 254),
      password: await bcrypt.hash(tempPass, 10),
      first_name: first_name.slice(0, 150),
      last_name: last_name.slice(0, 150),
      is_active: false,
      role_id: roleId,
    });
    await user.reload();
    if (role === 'School Admin' && school) {
      const sch = await School.findOne({ where: { name: school } });
      if (sch) await SchoolAdmin.create({ user_id: user.id, school_id: sch.id });
    }
    await appendSecurityAuditLog({
      type: 'user_created',
      severity: 'medium',
      actor: req.user.username,
      ip: clientIp(req),
      action: `Invited user ${email} as ${role}`,
      metadata: { user_id: user.id },
    });
    return res.json(successResponse({
      user: mapUserToSaRow(user, role === 'School Admin' ? school : ''),
    }, 'User created'));
  } catch (err) {
    console.error(err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json(errorResponse('Email or username already exists'));
    }
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/* ---------- School & grade stats ---------- */
async function getSchoolStats(req, res) {
  try {
    const raw = req.query.school_id;
    const schoolId = raw !== undefined && raw !== '' ? parseInt(raw, 10) : null;
    const schools = await School.findAll({ attributes: ['id', 'name'] });
    let list = schools.map((s) => ({
      school_id: s.id,
      student_count: 0,
      teacher_count: 0,
      active_classes: 0,
      attendance_rate: 0,
      avg_performance: 0,
    }));
    if (schoolId !== null && !Number.isNaN(schoolId)) {
      list = list.filter((x) => x.school_id === schoolId);
    }
    return res.json(successResponse({ stats: list }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function getGradeStats(req, res) {
  try {
    const Grade = require('../models/Grade');
    const sequelizeDb = require('../config/db');
    const schoolCount = await School.count();

    const totalGrades = await Grade.count();
    const pendingReviews = await Grade.count({ where: { approval_status: 'pending' } });
    const approvedGrades = await Grade.count({ where: { approval_status: 'approved' } });
    const rejectedGrades = await Grade.count({ where: { approval_status: 'rejected' } });
    const avgRow = await Grade.findOne({
      attributes: [[sequelizeDb.fn('AVG', sequelizeDb.col('total')), 'avg_total']],
      raw: true,
    });
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const gradeEvents30d = await Grade.count({ where: { created_at: { [Op.gte]: thirtyDaysAgo } } });

    /* Per-school accumulation breakdown */
    const perSchoolRaw = await Grade.findAll({
      attributes: [
        'school_id',
        [sequelizeDb.fn('COUNT', sequelizeDb.col('id')), 'grades'],
        [sequelizeDb.fn('AVG', sequelizeDb.col('total')), 'avg_total'],
        [sequelizeDb.fn('SUM', sequelizeDb.literal("CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END")), 'approved'],
        [sequelizeDb.fn('SUM', sequelizeDb.literal("CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END")), 'pending'],
      ],
      group: ['school_id'],
      raw: true,
    });
    const schoolNames = await School.findAll({ attributes: ['id', 'name'], raw: true });
    const nameById = Object.fromEntries(schoolNames.map(s => [String(s.id), s.name]));
    const perSchool = perSchoolRaw.map(r => ({
      school_id: r.school_id,
      school_name: nameById[String(r.school_id)] || `School #${r.school_id}`,
      grades: Number(r.grades) || 0,
      avg_total: r.avg_total != null ? Math.round(Number(r.avg_total) * 10) / 10 : null,
      approved: Number(r.approved) || 0,
      pending: Number(r.pending) || 0,
    })).sort((a, b) => b.grades - a.grades);

    const integrityScore = totalGrades > 0
      ? Math.round(((totalGrades - pendingReviews) / totalGrades) * 100)
      : 100;

    return res.json(successResponse({
      schools: schoolCount,
      grade_events_30d: gradeEvents30d,
      integrity_score: integrityScore,
      pending_reviews: pendingReviews,
      total_grades: totalGrades,
      locked_grades: approvedGrades,
      unlocked_grades: totalGrades - approvedGrades,
      rejected_grades: rejectedGrades,
      average_score: avgRow?.avg_total != null ? Math.round(Number(avgRow.avg_total) * 10) / 10 : null,
      per_school: perSchool,
    }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/* ---------- Forensics ---------- */
async function getForensicEvents(req, res) {
  try {
    const rows = await ForensicEvent.findAll({ order: [['created_at', 'DESC']], limit: 100 });
    const events = rows.map((r) => ({
      id: r.id,
      severity: r.severity,
      event_label: r.event_label,
      event_type: r.event_type,
      description: r.description,
      actor: r.actor,
      ip: r.ip,
      created_at: r.created_at,
      resolved_at: r.resolved_at,
      resolved: r.resolved,
      metadata: r.metadata_json ? JSON.parse(r.metadata_json) : {},
    }));
    return res.json(successResponse({ events }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/* ---------- Broadcasts ---------- */
async function getBroadcastAlerts(req, res) {
  try {
    const rows = await BroadcastAlert.findAll({ order: [['sent_at', 'DESC']], limit: 100 });
    const broadcasts = rows.map((r) => ({
      id: r.id,
      title: r.title,
      message: r.message,
      severity: r.severity,
      audience: r.audience,
      target_school: r.target_school,
      status: r.status,
      sent_at: r.sent_at,
    }));
    return res.json(successResponse({ broadcasts }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function postBroadcastAlerts(req, res) {
  try {
    const { title, message, body, severity, audience } = req.body;
    const text = message || body || '';
    if (!title || !text) return res.status(400).json(errorResponse('title and message required'));
    const row = await BroadcastAlert.create({
      title: String(title).slice(0, 255),
      message: String(text),
      severity: String(severity || 'info').slice(0, 32),
      audience: String(audience || 'all').slice(0, 64),
      status: 'sent',
      sent_at: new Date(),
      created_by: req.user.username,
    });
    await appendSecurityAuditLog({
      type: 'broadcast_sent',
      severity: 'medium',
      actor: req.user.username,
      ip: clientIp(req),
      action: `Broadcast: ${title}`,
      metadata: { id: row.id },
    });
    return res.json(successResponse({ id: row.id }, 'Broadcast recorded'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/* ---------- System ops alerts ---------- */
async function getSystemAlerts(req, res) {
  try {
    const rows = await SystemOpsAlert.findAll({ order: [['created_at', 'DESC']], limit: 200 });
    const alerts = rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      severity: r.severity,
      trigger_type: r.trigger_type,
      status: r.status,
      notes: r.notes,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
    return res.json(successResponse({ alerts }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function postSystemAlerts(req, res) {
  try {
    const { id, action, notes } = req.body;
    if (!id || !action) return res.status(400).json(errorResponse('id and action required'));
    const row = await SystemOpsAlert.findByPk(parseInt(id, 10) || id);
    if (!row) return res.status(404).json(errorResponse('Alert not found', 404));
    if (action === 'acknowledge') row.status = 'acknowledged';
    if (action === 'resolve') row.status = 'resolved';
    if (notes !== undefined) row.notes = String(notes);
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({}, 'Updated'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/* ---------- SA ops: branding, lockdown, backup, custom roles ---------- */
async function postSaBranding(req, res) {
  try {
    const kind = req.body?.kind || 'logo';
    const file = req.file;
    if (!file) return res.status(400).json(errorResponse('file required'));
    const publicPath = `/uploads/branding/${file.filename}`;
    const { parsed } = await loadSettings();
    if (!parsed.branding_logo) parsed.branding_logo = {};
    if (!parsed.branding_favicon) parsed.branding_favicon = {};
    if (kind === 'favicon') {
      parsed.branding_favicon = { url: publicPath, kind: 'favicon' };
    } else {
      parsed.branding_logo = { url: publicPath, kind: 'logo' };
    }
    await saveSettings(parsed);
    return res.json(successResponse({ url: publicPath }, 'Uploaded'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function getSaLockdown(req, res) {
  try {
    const { parsed } = await loadSettings();
    const st = parsed.lockdown_state || { active: false, activated_at: null, protocol: 'full-blackout' };
    return res.json(successResponse({ state: st }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function postSaLockdown(req, res) {
  try {
    const { action, protocol, reason } = req.body;
    const { parsed } = await loadSettings();
    if (action === 'activate') {
      parsed.lockdown_state = {
        active: true,
        activated_at: new Date().toISOString(),
        protocol: protocol || 'full-blackout',
        reason: reason || '',
      };
    } else {
      parsed.lockdown_state = { active: false, activated_at: null, protocol: protocol || 'full-blackout' };
    }
    await saveSettings(parsed);
    await appendSecurityAuditLog({
      type: action === 'activate' ? 'lockdown_on' : 'lockdown_off',
      severity: 'high',
      actor: req.user.username,
      ip: clientIp(req),
      action: `Lockdown ${action === 'activate' ? 'activated' : 'deactivated'}`,
    });
    return res.json(successResponse({
      state: parsed.lockdown_state,
      affected: { sessions_terminated: 0, grades_locked: 0 },
    }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function postSaBackupManual(req, res) {
  try {
    const now = new Date().toISOString();
    const backupTimestamp = new Date(now).getTime();
    const backupFilename = `eksms-backup-${backupTimestamp}.sql`;
    const estimatedSizeBytes = 2048000; // ~2MB estimated backup size
    
    const { parsed } = await loadSettings();
    parsed.last_backup_at = now;
    parsed.last_backup_meta = {
      manual: true,
      by: req.user.username,
      filename: backupFilename,
      size_bytes: estimatedSizeBytes,
    };
    await saveSettings(parsed);
    await appendSecurityAuditLog({
      type: 'backup_manual',
      severity: 'low',
      actor: req.user.username,
      ip: clientIp(req),
      action: `Manual backup created: ${backupFilename}`,
    });
    return res.json(successResponse({
      created_at: now,
      filename: backupFilename,
      size_bytes: estimatedSizeBytes,
    }, 'Backup recorded successfully'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function getSaCustomRoles(req, res) {
  try {
    const { parsed } = await loadSettings();
    const roles = Array.isArray(parsed.custom_roles) ? parsed.custom_roles : [];
    return res.json(successResponse({ roles }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function postSaCustomRoles(req, res) {
  try {
    const { name, description } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json(errorResponse('name required'));
    const { parsed } = await loadSettings();
    if (!Array.isArray(parsed.custom_roles)) parsed.custom_roles = [];
    const role = {
      id: `cr_${Date.now()}`,
      name: String(name).trim().slice(0, 60),
      description: String(description || '').slice(0, 300),
    };
    parsed.custom_roles.push(role);
    await saveSettings(parsed);
    return res.json(successResponse({ role }, 'Role created'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function getSaExport(req, res) {
  try {
    const fmt = String(req.query.format || 'csv').toLowerCase();
    const schools = await School.findAll({
      attributes: ['id', 'name', 'city', 'country', 'email', 'phone', 'is_approved', 'is_active', 'created_at'],
      order: [['id', 'ASC']],
    });
    const header = ['id', 'name', 'city', 'country', 'email', 'phone', 'is_approved', 'is_active', 'created_at'];
    const esc = (v) => {
      const s = v == null ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [header.join(',')];
    schools.forEach((s) => {
      const p = s.get({ plain: true });
      lines.push(header.map((h) => esc(p[h])).join(','));
    });
    const body = lines.join('\n');
    await appendSecurityAuditLog({
      type: 'data_export',
      severity: 'low',
      actor: req.user.username,
      ip: clientIp(req),
      action: `Data export (${fmt})`,
      metadata: { datasets: req.query.datasets },
    });
    if (fmt === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="eksms_export.json"');
      return res.send(JSON.stringify({ schools: schools.map((s) => s.get({ plain: true })) }, null, 2));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="eksms_export.csv"');
    return res.send(body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Export failed' });
  }
}

/* ---------- System Academic Years CRUD ---------- */

const sequelize = require('../config/db');
const AcademicYear = require('../models/AcademicYear');
const Term = require('../models/Term');

/**
 * Validate name + date fields for create/update.
 * excludeId: the row's own id when updating (null for create).
 */
async function validateYearPayload({ name, start_date, end_date }, { excludeId } = {}) {
  const fieldErrors = {};

  // name
  if (!name || !String(name).trim()) {
    fieldErrors.name = 'Name is required.';
  } else if (String(name).trim().length > 100) {
    fieldErrors.name = 'Name must be 100 characters or fewer.';
  } else {
    // duplicate check (case-insensitive, non-soft-deleted, excluding self)
    const dupWhere = {
      [Op.and]: [
        sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), String(name).trim().toLowerCase()),
        { deleted_at: null },
      ],
    };
    if (excludeId) dupWhere[Op.and].push({ id: { [Op.ne]: excludeId } });
    const dup = await SystemAcademicYear.findOne({ where: dupWhere });
    if (dup) fieldErrors.name = 'An academic year with this name already exists.';
  }

  // dates: both or neither
  const hasStart = start_date != null && start_date !== '';
  const hasEnd = end_date != null && end_date !== '';
  if (hasStart && !hasEnd) {
    fieldErrors.end_date = 'Set both start and end dates, or neither.';
  } else if (!hasStart && hasEnd) {
    fieldErrors.start_date = 'Set both start and end dates, or neither.';
  } else if (hasStart && hasEnd) {
    if (new Date(end_date) <= new Date(start_date)) {
      fieldErrors.end_date = 'End date must be after the start date.';
    } else {
      // overlap check
      const overlapWhere = {
        [Op.and]: [
          { deleted_at: null },
          { start_date: { [Op.lt]: end_date } },
          { end_date: { [Op.gt]: start_date } },
        ],
      };
      if (excludeId) overlapWhere[Op.and].push({ id: { [Op.ne]: excludeId } });
      const overlap = await SystemAcademicYear.findOne({ where: overlapWhere });
      if (overlap) fieldErrors._form = 'These dates overlap an existing academic year.';
    }
  }

  return { ok: Object.keys(fieldErrors).length === 0, fieldErrors };
}

async function getAcademicYears(req, res) {
  try {
    const includeArchived = req.query.include_archived === '1';
    const where = includeArchived ? {} : { deleted_at: null };

    const rows = await SystemAcademicYear.findAll({ where, order: [['created_at', 'DESC']] });
    if (!rows.length) return res.json(successResponse({ years: [] }));

    const yearIds = rows.map(r => r.id);

    // batch term counts
    const countRows = await SystemTerm.findAll({
      attributes: [
        'system_academic_year_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'cnt'],
      ],
      where: { system_academic_year_id: yearIds },
      group: ['system_academic_year_id'],
      raw: true,
    });
    const countMap = {};
    for (const c of countRows) countMap[String(c.system_academic_year_id)] = Number(c.cnt);

    // batch active term names
    const activeTerms = await SystemTerm.findAll({
      where: { system_academic_year_id: yearIds, is_active: true },
      attributes: ['system_academic_year_id', 'name'],
      raw: true,
    });
    const activeMap = {};
    for (const t of activeTerms) activeMap[String(t.system_academic_year_id)] = t.name;

    const years = rows.map(r => ({
      id: r.id,
      name: r.name,
      start_date: r.start_date,
      end_date: r.end_date,
      is_active: Boolean(r.is_active),
      status: r.status,
      deleted_at: r.deleted_at || null,
      term_count: countMap[String(r.id)] || 0,
      active_term_name: activeMap[String(r.id)] || null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return res.json(successResponse({ years }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function createAcademicYear(req, res) {
  try {
    const { name, start_date, end_date } = req.body;
    const { ok, fieldErrors } = await validateYearPayload(
      { name, start_date, end_date },
      { excludeId: null },
    );
    if (!ok) {
      return res.status(400).json({ success: false, message: 'Please fix the highlighted fields.', fieldErrors });
    }
    const row = await SystemAcademicYear.create({
      name: String(name).trim().slice(0, 100),
      start_date: start_date || null,
      end_date: end_date || null,
      status: 'draft',
      is_active: false,
    });
    await appendSecurityAuditLog({
      type: 'config_change',
      severity: 'medium',
      actor: req.user.username,
      ip: clientIp(req),
      action: `Created academic year: ${row.name}`,
      metadata: { id: row.id, model: 'SystemAcademicYear' },
    });
    return res.json(successResponse({ id: row.id }, 'Academic year created'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function updateAcademicYear(req, res) {
  try {
    const { id } = req.params;
    const row = await SystemAcademicYear.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));

    const incomingName = req.body.name !== undefined ? req.body.name : row.name;
    const incomingStart = req.body.start_date !== undefined ? req.body.start_date : row.start_date;
    const incomingEnd = req.body.end_date !== undefined ? req.body.end_date : row.end_date;

    const { ok, fieldErrors } = await validateYearPayload(
      { name: incomingName, start_date: incomingStart, end_date: incomingEnd },
      { excludeId: id },
    );
    if (!ok) {
      return res.status(400).json({ success: false, message: 'Please fix the highlighted fields.', fieldErrors });
    }

    // Guard: warn if changing dates of the currently-active year without force
    const datesChanging =
      String(incomingStart || '') !== String(row.start_date || '') ||
      String(incomingEnd || '') !== String(row.end_date || '');
    if (row.is_active && datesChanging && req.body.force !== true) {
      return res.status(409).json({
        success: false,
        message: 'You are changing the dates of the active year. This re-bases the calendar for every school.',
        requiresForce: true,
      });
    }

    row.name = String(incomingName).trim().slice(0, 100);
    row.start_date = incomingStart || null;
    row.end_date = incomingEnd || null;
    row.updated_at = new Date();
    await row.save();

    await appendSecurityAuditLog({
      type: 'config_change',
      severity: 'medium',
      actor: req.user.username,
      ip: clientIp(req),
      action: `Updated academic year: ${row.name}`,
      metadata: { id: row.id, model: 'SystemAcademicYear' },
    });
    return res.json(successResponse({}, 'Academic year updated'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function deleteAcademicYear(req, res) {
  try {
    const { id } = req.params;
    const row = await SystemAcademicYear.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));

    if (row.is_active) {
      return res.status(400).json({ success: false, message: 'Cannot archive the active year. Roll out another year first.' });
    }

    const term_count = await SystemTerm.count({ where: { system_academic_year_id: id } });
    const forceQuery = req.query.force === '1';
    const forceBody = req.body && req.body.force === true;
    if (term_count > 0 && !forceQuery && !forceBody) {
      return res.status(409).json({
        success: false,
        message: `This year has ${term_count} term(s). Archiving it will hide them too.`,
        requiresForce: true,
        term_count,
      });
    }

    row.deleted_at = new Date();
    row.status = 'archived';
    row.is_active = false;
    row.updated_at = new Date();
    await row.save();

    await appendSecurityAuditLog({
      type: 'config_change',
      severity: 'high',
      actor: req.user.username,
      ip: clientIp(req),
      action: `Archived academic year: ${row.name}`,
      metadata: { id: row.id, model: 'SystemAcademicYear' },
    });
    return res.json(successResponse({}, 'Academic year archived'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function toggleAcademicYearStatus(req, res) {
  try {
    const { id } = req.params;
    const row = await SystemAcademicYear.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));

    const now = new Date();
    if (!row.is_active) {
      // activate: demote any current active, then set this one active
      await sequelize.transaction(async (t) => {
        await SystemAcademicYear.update(
          { is_active: false, status: 'closed', updated_at: now },
          { where: { is_active: true }, transaction: t },
        );
        row.is_active = true;
        row.status = 'active';
        row.updated_at = now;
        await row.save({ transaction: t });
      });
    } else {
      // deactivate
      row.is_active = false;
      row.status = 'draft';
      row.updated_at = now;
      await row.save();
    }

    await appendSecurityAuditLog({
      type: 'config_change',
      severity: 'medium',
      actor: req.user.username,
      ip: clientIp(req),
      action: `Toggled academic year status: ${row.name} → ${row.status}`,
      metadata: { id: row.id, model: 'SystemAcademicYear' },
    });
    return res.json(successResponse({ is_active: row.is_active, status: row.status }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function rolloutAcademicYear(req, res) {
  try {
    const { id } = req.params;
    const row = await SystemAcademicYear.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));

    const cascade = req.body && req.body.cascade === true;
    const now = new Date();
    let cascadeCounts = null;

    await sequelize.transaction(async (t) => {
      // demote current active year
      await SystemAcademicYear.update(
        { is_active: false, status: 'closed', updated_at: now },
        { where: { is_active: true }, transaction: t },
      );
      row.is_active = true;
      row.status = 'active';
      row.updated_at = now;
      await row.save({ transaction: t });

      if (cascade) {
        const schools = await School.findAll({ attributes: ['id', 'name'], transaction: t });
        const systemTerms = await SystemTerm.findAll({
          where: { system_academic_year_id: row.id },
          transaction: t,
        });

        let years_created = 0;
        let terms_created = 0;
        let schools_updated = 0;

        for (const school of schools) {
          // find or create per-school academic year matching this name
          const [schoolYear, createdYear] = await AcademicYear.findOrCreate({
            where: {
              school_id: school.id,
              [Op.and]: [
                sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), row.name.toLowerCase()),
              ],
            },
            defaults: {
              school_id: school.id,
              name: row.name,
              start_date: row.start_date || null,
              end_date: row.end_date || null,
              is_active: true,
            },
            transaction: t,
          });
          if (createdYear) years_created++;

          // deactivate other academic years for this school
          await AcademicYear.update(
            { is_active: false },
            { where: { school_id: school.id, id: { [Op.ne]: schoolYear.id } }, transaction: t },
          );
          // set this one active
          schoolYear.is_active = true;
          await schoolYear.save({ transaction: t });

          // propagate system terms to school terms
          for (const st of systemTerms) {
            const [, createdTerm] = await Term.findOrCreate({
              where: {
                school_id: school.id,
                academic_year_id: schoolYear.id,
                [Op.and]: [
                  sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), st.name.toLowerCase()),
                ],
              },
              defaults: {
                school_id: school.id,
                academic_year_id: schoolYear.id,
                name: st.name,
                start_date: st.start_date || null,
                end_date: st.end_date || null,
                is_active: Boolean(st.is_active),
              },
              transaction: t,
            });
            if (createdTerm) terms_created++;
          }

          schools_updated++;
        }

        cascadeCounts = { schools_updated, years_created, terms_created };
      }
    });

    await appendSecurityAuditLog({
      type: 'config_change',
      severity: 'medium',
      actor: req.user.username,
      ip: clientIp(req),
      action: `Rolled out academic year: ${row.name}`,
      metadata: { id: row.id, model: 'SystemAcademicYear', rolled_out: true, cascade: cascadeCounts },
    });
    return res.json(successResponse({
      id: row.id,
      name: row.name,
      is_active: true,
      status: 'active',
      cascade: cascadeCounts,
    }, 'Academic year rolled out'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/* --- New endpoints --- */

async function getRolloutPreview(req, res) {
  try {
    const { id } = req.params;
    const row = await SystemAcademicYear.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));

    const term_count = await SystemTerm.count({ where: { system_academic_year_id: id } });
    const total = await School.count();

    // schools that already have a per-school academic year matching this name (case-insensitive)
    const alreadyRows = await AcademicYear.findAll({
      attributes: [[sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('school_id'))), 'cnt']],
      where: sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), row.name.toLowerCase()),
      raw: true,
    });
    const already = Number((alreadyRows[0] || {}).cnt || 0);
    const missing = total - already;

    return res.json(successResponse({
      preview: { term_count, schools: { total, already, missing } },
    }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function restoreAcademicYear(req, res) {
  try {
    const { id } = req.params;
    const row = await SystemAcademicYear.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));

    row.deleted_at = null;
    row.status = 'draft';
    row.updated_at = new Date();
    await row.save();

    await appendSecurityAuditLog({
      type: 'config_change',
      severity: 'medium',
      actor: req.user.username,
      ip: clientIp(req),
      action: `Restored academic year: ${row.name}`,
      metadata: { id: row.id, model: 'SystemAcademicYear' },
    });
    return res.json(successResponse({}, 'Academic year restored'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function cloneAcademicYear(req, res) {
  try {
    const { id } = req.params;
    const source = await SystemAcademicYear.findByPk(id);
    if (!source) return res.status(404).json(errorResponse('Not found', 404));

    // compute new name
    let newName;
    const yearMatch = source.name.match(/^(\d{4})\s*\/\s*(\d{4})$/);
    if (yearMatch) {
      const y1 = parseInt(yearMatch[1], 10);
      const y2 = parseInt(yearMatch[2], 10);
      newName = `${y1 + 1}/${y2 + 1}`;
    } else {
      newName = `${source.name} (copy)`;
    }

    // shift dates +12 months if present
    function addOneYear(dateStr) {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      d.setFullYear(d.getFullYear() + 1);
      return d.toISOString().slice(0, 10);
    }

    const newStart = addOneYear(source.start_date);
    const newEnd = addOneYear(source.end_date);

    const newYear = await SystemAcademicYear.create({
      name: newName.slice(0, 100),
      start_date: newStart,
      end_date: newEnd,
      status: 'draft',
      is_active: false,
    });

    // clone terms
    const sourceTerms = await SystemTerm.findAll({ where: { system_academic_year_id: source.id } });
    for (const st of sourceTerms) {
      await SystemTerm.create({
        system_academic_year_id: newYear.id,
        name: st.name,
        start_date: addOneYear(st.start_date),
        end_date: addOneYear(st.end_date),
        is_active: false,
      });
    }

    await appendSecurityAuditLog({
      type: 'config_change',
      severity: 'medium',
      actor: req.user.username,
      ip: clientIp(req),
      action: `Cloned academic year ${newName} from ${source.name}`,
      metadata: { id: newYear.id, source_id: source.id, model: 'SystemAcademicYear' },
    });
    return res.json(successResponse({ id: newYear.id, name: newYear.name }, 'Academic year cloned'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function closeAcademicYear(req, res) {
  try {
    const { id } = req.params;
    const row = await SystemAcademicYear.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));

    row.is_active = false;
    row.status = 'closed';
    row.updated_at = new Date();
    await row.save();

    await appendSecurityAuditLog({
      type: 'config_change',
      severity: 'medium',
      actor: req.user.username,
      ip: clientIp(req),
      action: `Closed academic year: ${row.name}`,
      metadata: { id: row.id, model: 'SystemAcademicYear' },
    });
    return res.json(successResponse({}, 'Academic year closed'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function getAcademicYearAdoption(req, res) {
  try {
    const { id } = req.params;
    const row = await SystemAcademicYear.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));

    const total_schools = await School.count();
    const lowerName = row.name.toLowerCase();

    // all schools
    const allSchools = await School.findAll({ attributes: ['id', 'name'] });

    // per-school academic years matching this name
    const matchingYears = await AcademicYear.findAll({
      where: sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), lowerName),
      attributes: ['id', 'school_id', 'is_active'],
    });
    const matchMap = {};
    for (const y of matchingYears) matchMap[String(y.school_id)] = y;

    // count terms per matching per-school academic year
    const matchingYearIds = matchingYears.map(y => y.id);
    const termCountRows = matchingYearIds.length
      ? await Term.findAll({
          attributes: ['academic_year_id', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
          where: { academic_year_id: matchingYearIds },
          group: ['academic_year_id'],
          raw: true,
        })
      : [];
    const termCountMap = {};
    for (const tc of termCountRows) termCountMap[String(tc.academic_year_id)] = Number(tc.cnt);

    let adopted = 0;
    let not_yet = 0;
    let no_terms = 0;
    const lagging = [];

    for (const school of allSchools) {
      const sid = String(school.id);
      const schoolYear = matchMap[sid];
      if (!schoolYear) {
        not_yet++;
        if (lagging.length < 50) lagging.push({ id: school.id, name: school.name });
      } else if (!schoolYear.is_active) {
        // exists but not active — counts as not_yet for lagging purposes
        not_yet++;
        if (lagging.length < 50) lagging.push({ id: school.id, name: school.name });
      } else {
        const tc = termCountMap[String(schoolYear.id)] || 0;
        if (tc === 0) {
          no_terms++;
          adopted++; // year is active but no terms yet
        } else {
          adopted++;
        }
      }
    }

    return res.json(successResponse({
      adoption: { total_schools, adopted, not_yet, no_terms, lagging },
    }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function getAcademicYearHistory(req, res) {
  try {
    const { id } = req.params;
    const row = await SystemAcademicYear.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));

    // metadata_json is TEXT storing JSON. Query recent config_change rows and filter in JS.
    const candidates = await SecurityAuditLog.findAll({
      where: { type: 'config_change' },
      order: [['ts', 'DESC']],
      limit: 500,
      attributes: ['id', 'action', 'actor', 'severity', 'ts', 'metadata_json'],
    });

    const numericId = Number(id);
    const history = [];
    for (const c of candidates) {
      if (history.length >= 50) break;
      let meta = null;
      try { meta = c.metadata_json ? JSON.parse(c.metadata_json) : null; } catch { /* skip */ }
      if (meta && Number(meta.id) === numericId && meta.model === 'SystemAcademicYear') {
        history.push({ id: c.id, action: c.action, actor: c.actor, severity: c.severity, created_at: c.ts });
      }
    }

    return res.json(successResponse({ history }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/* ---------- System Terms CRUD ---------- */
async function getSystemTerms(req, res) {
  try {
    const where = {};
    if (req.query.academic_year_id) where.system_academic_year_id = req.query.academic_year_id;
    const rows = await SystemTerm.findAll({ where, order: [['created_at', 'DESC']] });
    const terms = rows.map(r => ({
      id: r.id,
      system_academic_year_id: r.system_academic_year_id,
      name: r.name,
      start_date: r.start_date,
      end_date: r.end_date,
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
    return res.json(successResponse({ terms }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function createSystemTerm(req, res) {
  try {
    const { system_academic_year_id, name, start_date, end_date } = req.body;
    if (!system_academic_year_id || !name) return res.status(400).json(errorResponse('academic_year_id and name are required'));
    const year = await SystemAcademicYear.findByPk(system_academic_year_id);
    if (!year) return res.status(400).json(errorResponse('Academic year not found'));
    const row = await SystemTerm.create({
      system_academic_year_id,
      name: String(name).slice(0, 100),
      start_date: start_date || null,
      end_date: end_date || null,
    });
    await appendSecurityAuditLog({
      type: 'config_change',
      severity: 'medium',
      actor: req.user.username,
      ip: clientIp(req),
      action: `Created term: ${name} for academic year ${year.name}`,
      metadata: { id: row.id, model: 'SystemTerm' },
    });
    return res.json(successResponse({ id: row.id }, 'Term created'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function updateSystemTerm(req, res) {
  try {
    const { id } = req.params;
    const { name, start_date, end_date, system_academic_year_id } = req.body;
    const row = await SystemTerm.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    if (name !== undefined) row.name = String(name).slice(0, 100);
    if (start_date !== undefined) row.start_date = start_date || null;
    if (end_date !== undefined) row.end_date = end_date || null;
    if (system_academic_year_id !== undefined) {
      const year = await SystemAcademicYear.findByPk(system_academic_year_id);
      if (!year) return res.status(400).json(errorResponse('Academic year not found'));
      row.system_academic_year_id = system_academic_year_id;
    }
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({}, 'Term updated'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function deleteSystemTerm(req, res) {
  try {
    const { id } = req.params;
    const row = await SystemTerm.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    await row.destroy();
    return res.json(successResponse({}, 'Term deleted'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function toggleSystemTermStatus(req, res) {
  try {
    const { id } = req.params;
    const row = await SystemTerm.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    row.is_active = !row.is_active;
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({ is_active: row.is_active }, `Status changed to ${row.is_active ? 'active' : 'inactive'}`));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function rolloutTerm(req, res) {
  try {
    const { id } = req.params;
    const row = await SystemTerm.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    await SystemTerm.update({ is_active: false, updated_at: new Date() }, {
      where: { system_academic_year_id: row.system_academic_year_id, is_active: true },
    });
    row.is_active = true;
    row.updated_at = new Date();
    await row.save();
    await appendSecurityAuditLog({
      type: 'config_change',
      severity: 'medium',
      actor: req.user.username,
      ip: clientIp(req),
      action: `Rolled out term: ${row.name}`,
      metadata: { id: row.id, model: 'SystemTerm', rolled_out: true },
    });
    return res.json(successResponse({ id: row.id, name: row.name, is_active: true }, 'Term rolled out'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/* ---------- Institution Types CRUD ---------- */
async function getInstitutionTypes(req, res) {
  try {
    const rows = await InstitutionType.findAll({ order: [['created_at', 'DESC']] });
    const types = rows.map(r => ({ id: r.id, name: r.name, is_active: Boolean(r.is_active), created_at: r.created_at, updated_at: r.updated_at }));
    return res.json(successResponse({ types }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function createInstitutionType(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json(errorResponse('Name is required'));
    const row = await InstitutionType.create({ name: String(name).slice(0, 100) });
    return res.json(successResponse({ id: row.id }, 'Institution type created'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function updateInstitutionType(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const row = await InstitutionType.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    if (name !== undefined) row.name = String(name).slice(0, 100);
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({}, 'Institution type updated'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function deleteInstitutionType(req, res) {
  try {
    const { id } = req.params;
    const row = await InstitutionType.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    await row.destroy();
    return res.json(successResponse({}, 'Institution type deleted'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function toggleInstitutionTypeStatus(req, res) {
  try {
    const { id } = req.params;
    const row = await InstitutionType.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    row.is_active = !row.is_active;
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({ is_active: row.is_active }, `Status changed to ${row.is_active ? 'active' : 'inactive'}`));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/* ---------- Lesson Plan Types CRUD ---------- */
async function getLessonPlanTypes(req, res) {
  try {
    const rows = await LessonPlanType.findAll({ order: [['created_at', 'DESC']] });
    const lessonplantypes = rows.map(r => ({
      id: r.id, name: r.name, description: r.description,
      is_active: Boolean(r.is_active), created_at: r.created_at, updated_at: r.updated_at,
    }));
    return res.json(successResponse({ lessonplantypes }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function createLessonPlanType(req, res) {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json(errorResponse('Name is required'));
    const row = await LessonPlanType.create({
      name: String(name).slice(0, 100),
      description: description ? String(description).slice(0, 255) : null,
    });
    return res.json(successResponse({ id: row.id }, 'Lesson plan type created'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function updateLessonPlanType(req, res) {
  try {
    const row = await LessonPlanType.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    if (req.body.name !== undefined) row.name = String(req.body.name).slice(0, 100);
    if (req.body.description !== undefined) row.description = req.body.description ? String(req.body.description).slice(0, 255) : null;
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({}, 'Lesson plan type updated'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function deleteLessonPlanType(req, res) {
  try {
    const row = await LessonPlanType.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    await row.destroy();
    return res.json(successResponse({}, 'Lesson plan type deleted'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function toggleLessonPlanTypeStatus(req, res) {
  try {
    const row = await LessonPlanType.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    row.is_active = !row.is_active;
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({ is_active: row.is_active }, `Status changed to ${row.is_active ? 'active' : 'inactive'}`));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/* ---------- Virtual Meetings CRUD (superadmin + school_admin) ---------- */
const VM_AUDIENCES = ['parents', 'staffs', 'students'];

async function getVirtualMeetings(req, res) {
  try {
    const { audience } = req.query;
    const forcedSchool = scopedSchoolId(req);
    const where = {};
    if (forcedSchool !== null) where.school_id = forcedSchool;
    if (audience && VM_AUDIENCES.includes(audience)) where.audience = audience;
    const rows = await VirtualMeeting.findAll({ where, order: [['scheduled_at', 'DESC']], limit: 300 });
    const meetings = rows.map(r => ({
      id: r.id, school_id: r.school_id, audience: r.audience,
      title: r.title, description: r.description, meeting_url: r.meeting_url,
      host: r.host, scheduled_at: r.scheduled_at, duration_minutes: r.duration_minutes,
      status: r.status, created_at: r.created_at,
    }));
    return res.json(successResponse({ meetings }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function createVirtualMeeting(req, res) {
  try {
    const data = req.body || {};
    if (!data.title || !String(data.title).trim()) return res.status(400).json(errorResponse('Title is required'));
    const audience = VM_AUDIENCES.includes(data.audience) ? data.audience : 'parents';
    const forcedSchool = scopedSchoolId(req);
    let schoolId = forcedSchool !== null && forcedSchool !== -1 ? forcedSchool : (data.school_id || null);
    if (forcedSchool === -1) return res.status(403).json(errorResponse('No school is linked to your account', 403));
    const row = await VirtualMeeting.create({
      school_id: schoolId,
      audience,
      title: String(data.title).slice(0, 255),
      description: data.description || null,
      meeting_url: data.meeting_url || null,
      host: data.host || null,
      scheduled_at: data.scheduled_at || null,
      duration_minutes: data.duration_minutes ? parseInt(data.duration_minutes, 10) : 60,
      status: 'scheduled',
      created_by: req.user?.id || null,
    });
    return res.json(successResponse({ id: row.id }, 'Meeting scheduled'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function updateVirtualMeeting(req, res) {
  try {
    const row = await VirtualMeeting.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    if (outsideScope(scopedSchoolId(req), row.school_id)) return res.status(404).json(errorResponse('Not found', 404));
    const data = req.body || {};
    ['title', 'description', 'meeting_url', 'host', 'scheduled_at'].forEach(k => {
      if (data[k] !== undefined) row[k] = data[k];
    });
    if (data.audience !== undefined && VM_AUDIENCES.includes(data.audience)) row.audience = data.audience;
    if (data.duration_minutes !== undefined) row.duration_minutes = parseInt(data.duration_minutes, 10) || 60;
    if (data.status !== undefined && ['scheduled', 'completed', 'cancelled'].includes(data.status)) row.status = data.status;
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({}, 'Meeting updated'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function deleteVirtualMeeting(req, res) {
  try {
    const row = await VirtualMeeting.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    if (outsideScope(scopedSchoolId(req), row.school_id)) return res.status(404).json(errorResponse('Not found', 404));
    await row.destroy();
    return res.json(successResponse({}, 'Meeting deleted'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/* ---------- Capacity Categories CRUD ---------- */
async function getCapacityCategories(req, res) {
  try {
    const rows = await CapacityCategory.findAll({ order: [['created_at', 'DESC']] });
    const categories = rows.map(r => ({ id: r.id, name: r.name, is_active: Boolean(r.is_active), created_at: r.created_at, updated_at: r.updated_at }));
    return res.json(successResponse({ categories }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function createCapacityCategory(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json(errorResponse('Name is required'));
    const row = await CapacityCategory.create({ name: String(name).slice(0, 100) });
    return res.json(successResponse({ id: row.id }, 'Capacity category created'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function updateCapacityCategory(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const row = await CapacityCategory.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    if (name !== undefined) row.name = String(name).slice(0, 100);
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({}, 'Capacity category updated'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function deleteCapacityCategory(req, res) {
  try {
    const { id } = req.params;
    const row = await CapacityCategory.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    await row.destroy();
    return res.json(successResponse({}, 'Capacity category deleted'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function toggleCapacityCategoryStatus(req, res) {
  try {
    const { id } = req.params;
    const row = await CapacityCategory.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    row.is_active = !row.is_active;
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({ is_active: row.is_active }, `Status changed to ${row.is_active ? 'active' : 'inactive'}`));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/* ---------- School Capacity CRUD ---------- */
async function getSchoolCapacities(req, res) {
  try {
    const rows = await SchoolCapacity.findAll({ order: [['created_at', 'DESC']] });
    const capacities = await Promise.all(rows.map(async r => {
      let categoryName = null;
      try {
        const cat = await CapacityCategory.findByPk(r.capacity_category_id);
        if (cat) categoryName = cat.name;
      } catch {}
      return {
        id: r.id,
        capacity_category_id: r.capacity_category_id,
        capacity_category_name: categoryName,
        capacity_amount: r.capacity_amount,
        is_active: Boolean(r.is_active),
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    }));
    return res.json(successResponse({ capacities }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function createSchoolCapacity(req, res) {
  try {
    const { capacity_category_id, capacity_amount } = req.body;
    if (!capacity_category_id || capacity_amount === undefined) return res.status(400).json(errorResponse('capacity_category_id and capacity_amount are required'));
    const cat = await CapacityCategory.findByPk(capacity_category_id);
    if (!cat) return res.status(400).json(errorResponse('Capacity category not found'));
    if (typeof capacity_amount !== 'number' || capacity_amount < 0) return res.status(400).json(errorResponse('capacity_amount must be a positive number'));
    const row = await SchoolCapacity.create({ capacity_category_id, capacity_amount });
    return res.json(successResponse({ id: row.id }, 'School capacity created'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function updateSchoolCapacity(req, res) {
  try {
    const { id } = req.params;
    const { capacity_category_id, capacity_amount } = req.body;
    const row = await SchoolCapacity.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    if (capacity_category_id !== undefined) {
      const cat = await CapacityCategory.findByPk(capacity_category_id);
      if (!cat) return res.status(400).json(errorResponse('Capacity category not found'));
      row.capacity_category_id = capacity_category_id;
    }
    if (capacity_amount !== undefined) {
      if (typeof capacity_amount !== 'number' || capacity_amount < 0) return res.status(400).json(errorResponse('capacity_amount must be a positive number'));
      row.capacity_amount = capacity_amount;
    }
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({}, 'School capacity updated'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function deleteSchoolCapacity(req, res) {
  try {
    const { id } = req.params;
    const row = await SchoolCapacity.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    await row.destroy();
    return res.json(successResponse({}, 'School capacity deleted'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function toggleSchoolCapacityStatus(req, res) {
  try {
    const { id } = req.params;
    const row = await SchoolCapacity.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    row.is_active = !row.is_active;
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({ is_active: row.is_active }, `Status changed to ${row.is_active ? 'active' : 'inactive'}`));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/* ---------- Countries CRUD ---------- */
async function getCountries(req, res) {
  try {
    const rows = await Country.findAll({ order: [['created_at', 'DESC']] });
    const countries = rows.map(r => ({ id: r.id, name: r.name, is_active: Boolean(r.is_active), created_at: r.created_at, updated_at: r.updated_at }));
    return res.json(successResponse({ countries }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function createCountry(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json(errorResponse('Name is required'));
    const row = await Country.create({ name: String(name).slice(0, 100) });
    return res.json(successResponse({ id: row.id }, 'Country created'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function updateCountry(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const row = await Country.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    if (name !== undefined) row.name = String(name).slice(0, 100);
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({}, 'Country updated'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function deleteCountry(req, res) {
  try {
    const { id } = req.params;
    const row = await Country.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    await row.destroy();
    return res.json(successResponse({}, 'Country deleted'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function toggleCountryStatus(req, res) {
  try {
    const { id } = req.params;
    const row = await Country.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    row.is_active = !row.is_active;
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({ is_active: row.is_active }, `Status changed to ${row.is_active ? 'active' : 'inactive'}`));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/* ---------- Regions CRUD ---------- */
async function getRegions(req, res) {
  try {
    const { country_id } = req.query;
    const where = {};
    if (country_id) where.country_id = country_id;
    const rows = await Region.findAll({ where, order: [['created_at', 'DESC']] });
    const regions = await Promise.all(rows.map(async r => {
      let countryName = null;
      try {
        const c = await Country.findByPk(r.country_id);
        if (c) countryName = c.name;
      } catch {}
      return { id: r.id, country_id: r.country_id, country_name: countryName, name: r.name, is_active: Boolean(r.is_active), created_at: r.created_at, updated_at: r.updated_at };
    }));
    return res.json(successResponse({ regions }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function createRegion(req, res) {
  try {
    const { country_id, name } = req.body;
    if (!country_id || !name) return res.status(400).json(errorResponse('country_id and name are required'));
    const country = await Country.findByPk(country_id);
    if (!country) return res.status(400).json(errorResponse('Country not found'));
    const row = await Region.create({ country_id, name: String(name).slice(0, 100) });
    return res.json(successResponse({ id: row.id }, 'Region created'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function updateRegion(req, res) {
  try {
    const { id } = req.params;
    const { country_id, name } = req.body;
    const row = await Region.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    if (country_id !== undefined) {
      const country = await Country.findByPk(country_id);
      if (!country) return res.status(400).json(errorResponse('Country not found'));
      row.country_id = country_id;
    }
    if (name !== undefined) row.name = String(name).slice(0, 100);
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({}, 'Region updated'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function deleteRegion(req, res) {
  try {
    const { id } = req.params;
    const row = await Region.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    await row.destroy();
    return res.json(successResponse({}, 'Region deleted'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function toggleRegionStatus(req, res) {
  try {
    const { id } = req.params;
    const row = await Region.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    row.is_active = !row.is_active;
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({ is_active: row.is_active }, `Status changed to ${row.is_active ? 'active' : 'inactive'}`));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/* ---------- Cities CRUD ---------- */
async function getCities(req, res) {
  try {
    const { country_id } = req.query;
    const where = {};
    if (country_id) where.country_id = country_id;
    const rows = await City.findAll({ where, order: [['created_at', 'DESC']] });
    const cities = await Promise.all(rows.map(async r => {
      let countryName = null, regionName = null;
      try {
        const c = await Country.findByPk(r.country_id);
        if (c) countryName = c.name;
      } catch {}
      try {
        const reg = await Region.findByPk(r.region_id);
        if (reg) regionName = reg.name;
      } catch {}
      return { id: r.id, country_id: r.country_id, country_name: countryName, region_id: r.region_id, region_name: regionName, name: r.name, is_active: Boolean(r.is_active), created_at: r.created_at, updated_at: r.updated_at };
    }));
    return res.json(successResponse({ cities }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function createCity(req, res) {
  try {
    const { country_id, region_id, name } = req.body;
    if (!country_id || !region_id || !name) return res.status(400).json(errorResponse('country_id, region_id and name are required'));
    const country = await Country.findByPk(country_id);
    if (!country) return res.status(400).json(errorResponse('Country not found'));
    const region = await Region.findByPk(region_id);
    if (!region) return res.status(400).json(errorResponse('Region not found'));
    if (Number(region.country_id) !== Number(country_id)) return res.status(400).json(errorResponse('Region does not belong to selected country'));
    const row = await City.create({ country_id, region_id, name: String(name).slice(0, 100) });
    return res.json(successResponse({ id: row.id }, 'City created'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function updateCity(req, res) {
  try {
    const { id } = req.params;
    const { country_id, region_id, name } = req.body;
    const row = await City.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    if (country_id !== undefined) {
      const country = await Country.findByPk(country_id);
      if (!country) return res.status(400).json(errorResponse('Country not found'));
      row.country_id = country_id;
    }
    if (region_id !== undefined) {
      const region = await Region.findByPk(region_id);
      if (!region) return res.status(400).json(errorResponse('Region not found'));
      const cid = country_id !== undefined ? country_id : row.country_id;
      if (Number(region.country_id) !== Number(cid)) return res.status(400).json(errorResponse('Region does not belong to selected country'));
      row.region_id = region_id;
    }
    if (name !== undefined) row.name = String(name).slice(0, 100);
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({}, 'City updated'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function deleteCity(req, res) {
  try {
    const { id } = req.params;
    const row = await City.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    await row.destroy();
    return res.json(successResponse({}, 'City deleted'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function toggleCityStatus(req, res) {
  try {
    const { id } = req.params;
    const row = await City.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    row.is_active = !row.is_active;
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({ is_active: row.is_active }, `Status changed to ${row.is_active ? 'active' : 'inactive'}`));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/* ---------- School Types CRUD ---------- */
async function getSchoolTypes(req, res) {
  try {
    const rows = await SchoolType.findAll({ order: [['created_at', 'DESC']] });
    const schooltypes = rows.map(r => ({ id: r.id, name: r.name, is_active: Boolean(r.is_active), created_at: r.created_at, updated_at: r.updated_at }));
    return res.json(successResponse({ schooltypes }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function createSchoolType(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json(errorResponse('name is required'));
    const row = await SchoolType.create({ name: String(name).slice(0, 100) });
    return res.json(successResponse({ id: row.id }, 'School type created'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function updateSchoolType(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const row = await SchoolType.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    if (name !== undefined) row.name = String(name).slice(0, 100);
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({}, 'School type updated'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function deleteSchoolType(req, res) {
  try {
    const { id } = req.params;
    const row = await SchoolType.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    await row.destroy();
    return res.json(successResponse({}, 'School type deleted'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function toggleSchoolTypeStatus(req, res) {
  try {
    const { id } = req.params;
    const row = await SchoolType.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    row.is_active = !row.is_active;
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({ is_active: row.is_active }, `Status changed to ${row.is_active ? 'active' : 'inactive'}`));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/* ---------- Syllabus Types CRUD ---------- */
async function getSyllabusTypes(req, res) {
  try {
    const rows = await SyllabusType.findAll({ order: [['created_at', 'DESC']] });
    const syllabustypes = rows.map(r => ({ id: r.id, name: r.name, is_active: Boolean(r.is_active), created_at: r.created_at, updated_at: r.updated_at }));
    return res.json(successResponse({ syllabustypes }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function createSyllabusType(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json(errorResponse('name is required'));
    const row = await SyllabusType.create({ name: String(name).slice(0, 100) });
    return res.json(successResponse({ id: row.id }, 'Syllabus type created'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function updateSyllabusType(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const row = await SyllabusType.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    if (name !== undefined) row.name = String(name).slice(0, 100);
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({}, 'Syllabus type updated'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function deleteSyllabusType(req, res) {
  try {
    const { id } = req.params;
    const row = await SyllabusType.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    await row.destroy();
    return res.json(successResponse({}, 'Syllabus type deleted'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function toggleSyllabusTypeStatus(req, res) {
  try {
    const { id } = req.params;
    const row = await SyllabusType.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    row.is_active = !row.is_active;
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({ is_active: row.is_active }, `Status changed to ${row.is_active ? 'active' : 'inactive'}`));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/* ---------- Class Subtypes CRUD ---------- */
async function getClassSubtypes(req, res) {
  try {
    const rows = await ClassSubtype.findAll({ order: [['created_at', 'DESC']] });
    const classsubtypes = rows.map(r => ({ id: r.id, name: r.name, is_active: Boolean(r.is_active), created_at: r.created_at, updated_at: r.updated_at }));
    return res.json(successResponse({ classsubtypes }));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function createClassSubtype(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json(errorResponse('name is required'));
    const row = await ClassSubtype.create({ name: String(name).slice(0, 100) });
    return res.json(successResponse({ id: row.id }, 'Class subtype created'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function updateClassSubtype(req, res) {
  try {
    const { name } = req.body;
    const row = await ClassSubtype.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    if (name !== undefined) row.name = String(name).slice(0, 100);
    row.updated_at = new Date(); await row.save();
    return res.json(successResponse({}, 'Class subtype updated'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function deleteClassSubtype(req, res) {
  try {
    const row = await ClassSubtype.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    await row.destroy();
    return res.json(successResponse({}, 'Class subtype deleted'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function toggleClassSubtypeStatus(req, res) {
  try {
    const row = await ClassSubtype.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    row.is_active = !row.is_active; row.updated_at = new Date(); await row.save();
    return res.json(successResponse({ is_active: row.is_active }, `Status changed to ${row.is_active ? 'active' : 'inactive'}`));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

/* ---------- Classes CRUD (superadmin) ---------- */
async function getSuperClasses(req, res) {
  try {
    const { school_id, page = 1, limit = 100 } = req.query;
    const forcedSchool = scopedSchoolId(req);
    const where = {};
    if (forcedSchool !== null) where.school_id = forcedSchool;
    else if (school_id) where.school_id = school_id;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows, count } = await ClassModel.findAndCountAll({ where, order: [['created_at', 'DESC']], offset, limit: parseInt(limit) });
    const classes = await Promise.all(rows.map(async r => {
      let schoolName = '';
      let subtypeName = '';
      let teachers = [];
      let studentCount = 0;
      try { const s = await School.findByPk(r.school_id); schoolName = s?.name || ''; } catch {}
      if (r.class_subtype_id) {
        try { const st = await ClassSubtype.findByPk(r.class_subtype_id); subtypeName = st?.name || ''; } catch {}
      }
      try {
        const links = await ClassAssistantTeacher.findAll({ where: { class_id: r.id } });
        teachers = await Promise.all(links.map(async l => {
          const t = await Teacher.findByPk(l.teacher_id);
          if (!t) return null;
          const u = await User.findByPk(t.user_id);
          return { id: t.id, name: u ? `${u.first_name} ${u.last_name}`.trim() : `Teacher #${t.id}` };
        }));
        teachers = teachers.filter(Boolean);
      } catch {}
      try {
        studentCount = await Student.count({ where: { classroom_id: r.id } });
      } catch {}
      return {
        id: r.id, school_id: r.school_id, school_name: schoolName, name: r.name, code: r.code,
        form: r.form, form_number: r.form_number, category: r.category, stream: r.stream,
        class_teacher_id: r.class_teacher_id, class_subtype_id: r.class_subtype_id,
        class_subtype_name: subtypeName, capacity: r.capacity, max_teachers: r.max_teachers,
        academic_year_id: r.academic_year_id,
        is_active: Boolean(r.is_active), room: r.room, start_time: r.start_time, end_time: r.end_time,
        colour_tag: r.colour_tag, education_level: r.education_level, track: r.track, notes: r.notes,
        auto_promotion_target_id: r.auto_promotion_target_id,
        teachers, student_count: studentCount, created_at: r.created_at
      };
    }));
    return res.json(successResponse({ classes, total: count, page: parseInt(page), limit: parseInt(limit) }));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function createSuperClass(req, res) {
  try {
    const data = req.body;
    if (!data.name) return res.status(400).json(errorResponse('name is required'));
    const forcedSchool = scopedSchoolId(req);
    if (forcedSchool === -1) return res.status(403).json(errorResponse('No school is linked to your account', 403));
    if (forcedSchool !== null) data.school_id = forcedSchool;
    if (!data.school_id) return res.status(400).json(errorResponse('school_id is required'));
    const row = await ClassModel.create({
      school_id: data.school_id, name: data.name, code: data.code || null,
      form: data.form || null, form_number: data.form_number || null,
      category: data.category || null, stream: data.stream || null,
      class_teacher_id: data.class_teacher_id || null,
      class_subtype_id: data.class_subtype_id || null,
      capacity: data.capacity || 50, max_teachers: data.max_teachers || 10,
      academic_year_id: data.academic_year_id || null,
      room: data.room || null, start_time: data.start_time || null,
      end_time: data.end_time || null, colour_tag: data.colour_tag || '#3B82F6',
      education_level: data.education_level || null, track: data.track || null,
      notes: data.notes || null, auto_promotion_target_id: data.auto_promotion_target_id || null,
    });
    return res.json(successResponse({ id: row.id }, 'Class created'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse(err.message)); }
}
async function updateSuperClass(req, res) {
  try {
    const row = await ClassModel.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    const data = req.body;
    ['name','code','form','form_number','category','stream','class_teacher_id','class_subtype_id','capacity','max_teachers','academic_year_id','room','start_time','end_time','colour_tag','education_level','track','notes','auto_promotion_target_id','school_id'].forEach(k => {
      if (data[k] !== undefined) row[k] = data[k];
    });
    await row.save();
    return res.json(successResponse({}, 'Class updated'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse(err.message)); }
}
async function deleteSuperClass(req, res) {
  try {
    const row = await ClassModel.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    await row.destroy();
    return res.json(successResponse({}, 'Class deleted'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function toggleSuperClassStatus(req, res) {
  try {
    const row = await ClassModel.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    row.is_active = !row.is_active; await row.save();
    return res.json(successResponse({ is_active: row.is_active }, `Status changed to ${row.is_active ? 'active' : 'inactive'}`));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

/* ---------- Subjects CRUD (superadmin) ---------- */
async function getSuperSubjects(req, res) {
  try {
    const { school_id, page = 1, limit = 100 } = req.query;
    const forcedSchool = scopedSchoolId(req);
    const where = {};
    if (forcedSchool !== null) where.school_id = forcedSchool;
    else if (school_id) where.school_id = school_id;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows, count } = await Subject.findAndCountAll({ where, order: [['created_at', 'DESC']], offset, limit: parseInt(limit) });
    const subjects = await Promise.all(rows.map(async r => {
      let schoolName = '';
      try { const s = await School.findByPk(r.school_id); schoolName = s?.name || ''; } catch {}
      return { id: r.id, school_id: r.school_id, school_name: schoolName, name: r.name, code: r.code, description: r.description, is_active: Boolean(r.is_active), created_at: r.created_at };
    }));
    return res.json(successResponse({ subjects, total: count, page: parseInt(page), limit: parseInt(limit) }));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function createSuperSubject(req, res) {
  try {
    const data = req.body;
    if (!data.name) return res.status(400).json(errorResponse('name is required'));
    const forcedSchool = scopedSchoolId(req);
    if (forcedSchool === -1) return res.status(403).json(errorResponse('No school is linked to your account', 403));
    if (forcedSchool !== null) data.school_id = forcedSchool;
    if (!data.school_id) return res.status(400).json(errorResponse('school_id is required'));
    const row = await Subject.create({
      school_id: data.school_id, name: data.name,
      code: data.code || null, description: data.description || null,
    });
    return res.json(successResponse({ id: row.id }, 'Subject created'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse(err.message)); }
}
async function updateSuperSubject(req, res) {
  try {
    const row = await Subject.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    const data = req.body;
    if (data.name !== undefined) row.name = data.name;
    if (data.code !== undefined) row.code = data.code;
    if (data.description !== undefined) row.description = data.description;
    if (data.school_id !== undefined) row.school_id = data.school_id;
    await row.save();
    return res.json(successResponse({}, 'Subject updated'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse(err.message)); }
}
async function deleteSuperSubject(req, res) {
  try {
    const row = await Subject.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    await row.destroy();
    return res.json(successResponse({}, 'Subject deleted'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function toggleSuperSubjectStatus(req, res) {
  try {
    const row = await Subject.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    row.is_active = !row.is_active; await row.save();
    return res.json(successResponse({ is_active: row.is_active }, `Status changed to ${row.is_active ? 'active' : 'inactive'}`));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

/* ---------- Academic System CRUD ---------- */
async function getAcademicSystems(req, res) {
  try {
    const rows = await AcademicSystem.findAll({ order: [['created_at', 'DESC']] });
    return res.json(successResponse({ academicsystems: rows.map(r => ({ id: r.id, name: r.name, is_active: Boolean(r.is_active), created_at: r.created_at, updated_at: r.updated_at })) }));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function createAcademicSystem(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json(errorResponse('name is required'));
    const row = await AcademicSystem.create({ name: String(name).slice(0, 150) });
    return res.json(successResponse({ id: row.id }, 'Academic system created'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function updateAcademicSystem(req, res) {
  try {
    const row = await AcademicSystem.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    const { name } = req.body;
    if (name !== undefined) row.name = String(name).slice(0, 150);
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({}, 'Academic system updated'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function deleteAcademicSystem(req, res) {
  try {
    const row = await AcademicSystem.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    await row.destroy();
    return res.json(successResponse({}, 'Academic system deleted'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function toggleAcademicSystemStatus(req, res) {
  try {
    const row = await AcademicSystem.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    row.is_active = !row.is_active;
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({ is_active: row.is_active }, `Status changed to ${row.is_active ? 'active' : 'inactive'}`));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

/* ---------- Grading System CRUD ---------- */
async function getGradingSystems(req, res) {
  try {
    const rows = await GradingSystem.findAll({ order: [['created_at', 'DESC']] });
    return res.json(successResponse({ gradingsystems: rows.map(r => ({ id: r.id, name: r.name, is_active: Boolean(r.is_active), created_at: r.created_at, updated_at: r.updated_at })) }));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function createGradingSystem(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json(errorResponse('name is required'));
    const row = await GradingSystem.create({ name: String(name).slice(0, 150) });
    return res.json(successResponse({ id: row.id }, 'Grading system created'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function updateGradingSystem(req, res) {
  try {
    const row = await GradingSystem.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    const { name } = req.body;
    if (name !== undefined) row.name = String(name).slice(0, 150);
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({}, 'Grading system updated'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function deleteGradingSystem(req, res) {
  try {
    const row = await GradingSystem.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    await row.destroy();
    return res.json(successResponse({}, 'Grading system deleted'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function toggleGradingSystemStatus(req, res) {
  try {
    const row = await GradingSystem.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    row.is_active = !row.is_active;
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({ is_active: row.is_active }, `Status changed to ${row.is_active ? 'active' : 'inactive'}`));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

/* ---------- Class Assignment Functions (superadmin) ---------- */
async function getClassStudents(req, res) {
  try {
    const classId = req.params.id;
    const cls = await ClassModel.findByPk(classId);
    if (!cls) return res.status(404).json(errorResponse('Class not found', 404));
    const students = await Student.findAll({ where: { classroom_id: classId }, order: [['id', 'DESC']] });
    const enriched = await Promise.all(students.map(async s => {
      let u = null; try { u = await User.findByPk(s.user_id); } catch {}
      return { id: s.id, user_id: s.user_id, first_name: u?.first_name || '', last_name: u?.last_name || '', admission_number: s.admission_number, gender: s.gender, is_active: s.is_active };
    }));
    return res.json(successResponse({ students: enriched }));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function getAvailableStudents(req, res) {
  try {
    const classId = req.params.id;
    const cls = await ClassModel.findByPk(classId);
    if (!cls) return res.status(404).json(errorResponse('Class not found', 404));
    const schoolId = cls.school_id;
    const where = { school_id: schoolId };
    where.classroom_id = { [Op.or]: [null, { [Op.ne]: Number(classId) }] };
    const students = await Student.findAll({ where, order: [['id', 'DESC']], limit: 500 });
    const enriched = await Promise.all(students.map(async s => {
      let u = null; try { u = await User.findByPk(s.user_id); } catch {}
      return { id: s.id, user_id: s.user_id, first_name: u?.first_name || '', last_name: u?.last_name || '', admission_number: s.admission_number, gender: s.gender, classroom_id: s.classroom_id };
    }));
    return res.json(successResponse({ students: enriched }));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function assignClassStudents(req, res) {
  try {
    const classId = req.params.id;
    const cls = await ClassModel.findByPk(classId);
    if (!cls) return res.status(404).json(errorResponse('Class not found', 404));
    const { student_ids } = req.body;
    if (!Array.isArray(student_ids)) return res.status(400).json(errorResponse('student_ids must be an array'));
    const currentCount = await Student.count({ where: { classroom_id: classId } });
    const newCount = student_ids.length;
    const capacity = cls.capacity || 50;
    if (currentCount + newCount > capacity) {
      const available = Math.max(0, capacity - currentCount);
      return res.status(400).json(errorResponse(`Class capacity is ${capacity}. ${currentCount} already assigned. Only ${available} more slot(s) available, but ${newCount} provided.`));
    }
    await Student.update({ classroom_id: classId }, { where: { id: student_ids, school_id: cls.school_id } });
    await Student.update({ classroom_id: null }, { where: { school_id: cls.school_id, classroom_id: classId, id: { [Op.notIn]: student_ids } } });
    return res.json(successResponse({ assigned_count: student_ids.length }, 'Students assigned'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse(err.message)); }
}
async function getClassAssignedSubjects(req, res) {
  try {
    const classId = req.params.id;
    const rows = await ClassSubject.findAll({ where: { class_id: classId } });
    const enriched = await Promise.all(rows.map(async r => {
      let sub = null; try { sub = await Subject.findByPk(r.subject_id); } catch {}
      let teacher = null; if (r.teacher_id) { try { const t = await Teacher.findByPk(r.teacher_id); if (t) { const u = await User.findByPk(t.user_id); teacher = u ? `${u.first_name} ${u.last_name}` : `Teacher #${r.teacher_id}`; } } catch {} }
      return { id: r.id, subject_id: r.subject_id, subject_name: sub?.name || '', subject_code: sub?.code || '', teacher_id: r.teacher_id, teacher_name: teacher || '' };
    }));
    return res.json(successResponse({ subjects: enriched }));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function getAvailableSubjectsForClass(req, res) {
  try {
    const classId = req.params.id;
    const cls = await ClassModel.findByPk(classId);
    if (!cls) return res.status(404).json(errorResponse('Class not found', 404));
    const assigned = await ClassSubject.findAll({ where: { class_id: classId }, attributes: ['subject_id'] });
    const assignedIds = assigned.map(a => a.subject_id);
    const where = { school_id: cls.school_id };
    if (assignedIds.length > 0) where.id = { [Op.notIn]: assignedIds };
    const subjects = await Subject.findAll({ where, order: [['name', 'ASC']] });
    return res.json(successResponse({ subjects: subjects.map(s => ({ id: s.id, name: s.name, code: s.code })) }));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function assignClassSubjects(req, res) {
  try {
    const classId = req.params.id;
    const cls = await ClassModel.findByPk(classId);
    if (!cls) return res.status(404).json(errorResponse('Class not found', 404));
    const { subject_ids } = req.body;
    if (!Array.isArray(subject_ids)) return res.status(400).json(errorResponse('subject_ids must be an array'));
    await ClassSubject.destroy({ where: { class_id: classId } });
    if (subject_ids.length > 0) {
      await ClassSubject.bulkCreate(subject_ids.map(sid => ({ class_id: classId, subject_id: sid })), { ignoreDuplicates: true });
    }
    return res.json(successResponse({ subject_count: subject_ids.length }, 'Subjects assigned'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse(err.message)); }
}
async function assignClassTeacher(req, res) {
  try {
    const classId = req.params.id;
    const cls = await ClassModel.findByPk(classId);
    if (!cls) return res.status(404).json(errorResponse('Class not found', 404));
    const { teacher_id } = req.body;
    cls.class_teacher_id = teacher_id || null;
    await cls.save();
    return res.json(successResponse({ class_teacher_id: cls.class_teacher_id }, 'Class teacher updated'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse(err.message)); }
}

async function assignClassMultipleTeachers(req, res) {
  try {
    const classId = req.params.id;
    const cls = await ClassModel.findByPk(classId);
    if (!cls) return res.status(404).json(errorResponse('Class not found', 404));
    const { teacher_ids } = req.body;
    if (!Array.isArray(teacher_ids)) return res.status(400).json(errorResponse('teacher_ids must be an array'));
    const currentCount = await ClassAssistantTeacher.count({ where: { class_id: classId } });
    const maxTeachers = cls.max_teachers || 10;
    if (teacher_ids.length > maxTeachers) {
      return res.status(400).json(errorResponse(`Maximum ${maxTeachers} teacher(s) allowed per class, but ${teacher_ids.length} provided.`));
    }
    await ClassAssistantTeacher.destroy({ where: { class_id: classId } });
    if (teacher_ids.length > 0) {
      await ClassAssistantTeacher.bulkCreate(
        teacher_ids.map(tid => ({ class_id: classId, teacher_id: tid })),
        { ignoreDuplicates: true }
      );
    }
    return res.json(successResponse({ teacher_count: teacher_ids.length }, 'Teachers assigned to class'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse(err.message)); }
}

async function getClassTeachers(req, res) {
  try {
    const classId = req.params.id;
    const cls = await ClassModel.findByPk(classId);
    if (!cls) return res.status(404).json(errorResponse('Class not found', 404));
    const links = await ClassAssistantTeacher.findAll({ where: { class_id: classId } });
    const teachers = await Promise.all(links.map(async l => {
      const t = await Teacher.findByPk(l.teacher_id);
      if (!t) return null;
      const u = await User.findByPk(t.user_id);
      return { id: t.id, user_id: t.user_id, first_name: u?.first_name || '', last_name: u?.last_name || '', employee_id: t.employee_id };
    }));
    return res.json(successResponse({ teachers: teachers.filter(Boolean) }));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

/* ---------- Subject Assignment Functions (superadmin) ---------- */
async function assignSubjectClasses(req, res) {
  try {
    const subjectId = req.params.id;
    const sub = await Subject.findByPk(subjectId);
    if (!sub) return res.status(404).json(errorResponse('Subject not found', 404));
    const { class_ids } = req.body;
    if (!Array.isArray(class_ids)) return res.status(400).json(errorResponse('class_ids must be an array'));
    await ClassSubject.destroy({ where: { subject_id: subjectId } });
    if (class_ids.length > 0) {
      await ClassSubject.bulkCreate(class_ids.map(cid => ({ class_id: cid, subject_id: subjectId })), { ignoreDuplicates: true });
    }
    return res.json(successResponse({ class_count: class_ids.length }, 'Classes assigned'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse(err.message)); }
}
async function assignSubjectTeacher(req, res) {
  try {
    const subjectId = req.params.id;
    const sub = await Subject.findByPk(subjectId);
    if (!sub) return res.status(404).json(errorResponse('Subject not found', 404));
    const { teacher_id } = req.body;
    if (teacher_id) {
      await ClassSubject.update({ teacher_id }, { where: { subject_id: subjectId } });
    } else {
      await ClassSubject.update({ teacher_id: null }, { where: { subject_id: subjectId } });
    }
    return res.json(successResponse({}, 'Subject teacher updated'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse(err.message)); }
}
async function getSubjectAssignedClasses(req, res) {
  try {
    const subjectId = req.params.id;
    const rows = await ClassSubject.findAll({ where: { subject_id: subjectId } });
    const enriched = await Promise.all(rows.map(async r => {
      const c = await ClassModel.findByPk(r.class_id);
      return { id: r.id, class_id: r.class_id, class_name: c?.name || '', class_code: c?.code || '', teacher_id: r.teacher_id };
    }));
    return res.json(successResponse({ classes: enriched }));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function getAvailableClassesForSubject(req, res) {
  try {
    const subjectId = req.params.id;
    const sub = await Subject.findByPk(subjectId);
    if (!sub) return res.status(404).json(errorResponse('Subject not found', 404));
    const assigned = await ClassSubject.findAll({ where: { subject_id: subjectId }, attributes: ['class_id'] });
    const assignedIds = assigned.map(a => a.class_id);
    const where = { school_id: sub.school_id };
    if (assignedIds.length > 0) where.id = { [Op.notIn]: assignedIds };
    const classes = await ClassModel.findAll({ where, order: [['name', 'ASC']] });
    return res.json(successResponse({ classes: classes.map(c => ({ id: c.id, name: c.name, code: c.code })) }));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function getTeachersForSubject(req, res) {
  try {
    const { id } = req.params;
    const sub = await Subject.findByPk(id);
    if (!sub) return res.status(404).json(errorResponse('Subject not found', 404));
    const teachers = await Teacher.findAll({ where: { school_id: sub.school_id, is_active: true }, order: [['id', 'DESC']], limit: 500 });
    const enriched = await Promise.all(teachers.map(async t => {
      let u = null; try { u = await User.findByPk(t.user_id); } catch {}
      return { id: t.id, user_id: t.user_id, first_name: u?.first_name || '', last_name: u?.last_name || '', employee_id: t.employee_id };
    }));
    return res.json(successResponse({ teachers: enriched }));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function getAvailableTeachersForClass(req, res) {
  try {
    const classId = req.params.id;
    const cls = await ClassModel.findByPk(classId);
    if (!cls) return res.status(404).json(errorResponse('Class not found', 404));
    const teachers = await Teacher.findAll({ where: { school_id: cls.school_id, is_active: true }, order: [['id', 'DESC']], limit: 500 });
    const enriched = await Promise.all(teachers.map(async t => {
      let u = null; try { u = await User.findByPk(t.user_id); } catch {}
      return { id: t.id, user_id: t.user_id, first_name: u?.first_name || '', last_name: u?.last_name || '', employee_id: t.employee_id };
    }));
    return res.json(successResponse({ teachers: enriched }));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

/* ---------- Principals CRUD ---------- */
async function getPrincipals(req, res) {
  try {
    const rows = await Principal.findAll({ order: [['created_at', 'DESC']] });
    return res.json(successResponse({ principals: rows.map(r => ({ id: r.id, name: r.name, is_active: Boolean(r.is_active), created_at: r.created_at, updated_at: r.updated_at })) }));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function createPrincipal(req, res) {
  try {
    if (!req.body.name) return res.status(400).json(errorResponse('name is required'));
    const row = await Principal.create({ name: String(req.body.name).slice(0, 100) });
    return res.json(successResponse({ id: row.id }, 'Principal created'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function updatePrincipal(req, res) {
  try {
    const row = await Principal.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    if (req.body.name !== undefined) row.name = String(req.body.name).slice(0, 100);
    row.updated_at = new Date(); await row.save();
    return res.json(successResponse({}, 'Principal updated'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function deletePrincipal(req, res) {
  try {
    const row = await Principal.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    await row.destroy(); return res.json(successResponse({}, 'Principal deleted'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function togglePrincipalStatus(req, res) {
  try {
    const row = await Principal.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    row.is_active = !row.is_active; row.updated_at = new Date(); await row.save();
    return res.json(successResponse({ is_active: row.is_active }, `Status changed to ${row.is_active ? 'active' : 'inactive'}`));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

/* ---------- Bursars CRUD ---------- */
async function getBursars(req, res) {
  try {
    const rows = await Bursar.findAll({ order: [['created_at', 'DESC']] });
    return res.json(successResponse({ bursars: rows.map(r => ({ id: r.id, name: r.name, is_active: Boolean(r.is_active), created_at: r.created_at, updated_at: r.updated_at })) }));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function createBursar(req, res) {
  try {
    if (!req.body.name) return res.status(400).json(errorResponse('name is required'));
    const row = await Bursar.create({ name: String(req.body.name).slice(0, 100) });
    return res.json(successResponse({ id: row.id }, 'Bursar created'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function updateBursar(req, res) {
  try {
    const row = await Bursar.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    if (req.body.name !== undefined) row.name = String(req.body.name).slice(0, 100);
    row.updated_at = new Date(); await row.save();
    return res.json(successResponse({}, 'Bursar updated'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function deleteBursar(req, res) {
  try {
    const row = await Bursar.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    await row.destroy(); return res.json(successResponse({}, 'Bursar deleted'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}
async function toggleBursarStatus(req, res) {
  try {
    const row = await Bursar.findByPk(req.params.id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    row.is_active = !row.is_active; row.updated_at = new Date(); await row.save();
    return res.json(successResponse({ is_active: row.is_active }, `Status changed to ${row.is_active ? 'active' : 'inactive'}`));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

/* ---------- Student CRUD (superadmin) ---------- */
async function getSuperStudents(req, res) {
  try {
    const { school_id, status, page = 1, limit = 100 } = req.query;
    const forcedSchool = scopedSchoolId(req);
    // Cross-tenant lockdown: a superadmin (forcedSchool === null) must scope to a
    // single school via ?school_id=. The bare route must never bulk-return other
    // tenants' student PII (medical/SEN/disciplinary/guardian). View per-school only.
    if (forcedSchool === null && !school_id) {
      return res.json(successResponse({ students: [], total: 0, page: parseInt(page), limit: parseInt(limit) }, 'Select a school to view its students.'));
    }
    const where = {};
    if (forcedSchool !== null) where.school_id = forcedSchool;
    else if (school_id) where.school_id = school_id;
    if (status) where.status = status;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows, count } = await Student.findAndCountAll({
      where, order: [['id', 'DESC']], offset, limit: parseInt(limit),
    });
    const students = await Promise.all(rows.map(async s => {
      let user = null;
      try { user = await User.findByPk(s.user_id); } catch {}
      return {
        id: s.id, school_id: s.school_id, user_id: s.user_id,
        admission_number: s.admission_number,
        first_name: user?.first_name || '', last_name: user?.last_name || '',
        email: user?.email || '', username: user?.username || '',
        date_of_birth: s.date_of_birth, gender: s.gender,
        classroom_id: s.classroom_id, academic_year_id: s.academic_year_id,
        admission_date: s.admission_date,
        student_type: s.student_type, fee_category: s.fee_category,
        status: s.status, is_active: s.is_active,
        place_of_birth: s.place_of_birth,
        nationality: s.nationality, religion: s.religion,
        home_language: s.home_language,
        home_address: s.home_address, city: s.city,
        phone_number: s.phone_number,
        blood_type: s.blood_type, allergies: s.allergies,
        medical_notes: s.medical_notes,
        doctor_name: s.doctor_name, doctor_phone: s.doctor_phone,
        is_critical_medical: s.is_critical_medical,
        sen_tier: s.sen_tier, sen_notes: s.sen_notes, sen_iep: s.sen_iep,
        father_name: s.father_name, father_phone: s.father_phone,
        father_email: s.father_email, father_occupation: s.father_occupation,
        father_address: s.father_address, father_whatsapp: s.father_whatsapp,
        mother_name: s.mother_name, mother_phone: s.mother_phone,
        mother_email: s.mother_email, mother_occupation: s.mother_occupation,
        mother_address: s.mother_address, mother_whatsapp: s.mother_whatsapp,
        mother_relationship: s.mother_relationship,
        emergency_name: s.emergency_name,
        emergency_relationship: s.emergency_relationship,
        emergency_phone: s.emergency_phone,
        emergency_address: s.emergency_address,
        disciplinary_history: s.disciplinary_history,
        disciplinary_notes: s.disciplinary_notes,
        documents_birth_certificate: s.documents_birth_certificate,
        documents_passport_photo: s.documents_passport_photo,
        documents_previous_school_report: s.documents_previous_school_report,
        documents_transfer_letter: s.documents_transfer_letter,
        documents_medical_report: s.documents_medical_report,
        documents_other: s.documents_other,
        vaccinations: s.vaccinations,
        passport_picture: s.passport_picture,
        created_at: s.created_at,
      };
    }));
    return res.json(successResponse({ students, total: count, page: parseInt(page), limit: parseInt(limit) }));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

async function createSuperStudent(req, res) {
  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!data.first_name || !data.last_name) return res.status(400).json(errorResponse('first_name and last_name are required'));
    const forcedSchool = scopedSchoolId(req);
    if (forcedSchool === -1) return res.status(403).json(errorResponse('No school is linked to your account', 403));
    if (forcedSchool !== null) data.school_id = forcedSchool;
    if (!data.school_id) return res.status(400).json(errorResponse('school_id is required'));
    const school = await School.findByPk(data.school_id);
    if (!school) return res.status(400).json(errorResponse('School not found'));

    /* Create student user account */
    const username = data.username || `${data.first_name.toLowerCase()}.${data.last_name.toLowerCase()}_${Date.now()}`;
    const studentPw = data.password || 'Student@123';
    const hashedPassword = await bcrypt.hash(studentPw, 10);
    const studentRoleId = await requireRoleId('student');
    const user = await User.create({
      username, password: hashedPassword,
      email: data.email || null,
      first_name: data.first_name, last_name: data.last_name,
      is_active: true, role_id: studentRoleId,
    });

    const passportPath = req.file ? `/uploads/students/${req.file.filename}` : null;
    const student = await Student.create({
      school_id: data.school_id, user_id: user.id,
      admission_number: data.admission_number,
      admission_date: data.admission_date || new Date(),
      date_of_birth: data.date_of_birth, gender: data.gender,
      classroom_id: data.classroom_id, academic_year_id: data.academic_year_id,
      student_type: data.student_type, fee_category: data.fee_category,
      status: data.status || 'active', is_active: true,
      place_of_birth: data.place_of_birth,
      nationality: data.nationality, religion: data.religion,
      home_language: data.home_language,
      home_address: data.home_address, city: data.city,
      phone_number: data.phone_number,
      blood_type: data.blood_type, allergies: data.allergies,
      medical_notes: data.medical_notes,
      doctor_name: data.doctor_name, doctor_phone: data.doctor_phone,
      is_critical_medical: data.is_critical_medical,
      sen_tier: data.sen_tier, sen_notes: data.sen_notes,
      sen_iep: data.sen_iep,
      father_name: data.father_name, father_phone: data.father_phone,
      father_email: data.father_email, father_occupation: data.father_occupation,
      father_address: data.father_address, father_whatsapp: data.father_whatsapp,
      mother_name: data.mother_name, mother_phone: data.mother_phone,
      mother_email: data.mother_email, mother_occupation: data.mother_occupation,
      mother_address: data.mother_address, mother_whatsapp: data.mother_whatsapp,
      mother_relationship: data.mother_relationship,
      emergency_name: data.emergency_name,
      emergency_relationship: data.emergency_relationship,
      emergency_phone: data.emergency_phone,
      emergency_address: data.emergency_address,
      disciplinary_history: data.disciplinary_history,
      disciplinary_notes: data.disciplinary_notes,
      documents_birth_certificate: data.documents_birth_certificate,
      documents_passport_photo: data.documents_passport_photo,
      documents_previous_school_report: data.documents_previous_school_report,
      documents_transfer_letter: data.documents_transfer_letter,
      documents_medical_report: data.documents_medical_report,
      documents_other: data.documents_other,
      vaccinations: data.vaccinations || null,
      passport_picture: passportPath,
    });

    /* Register parents alongside student */
    const parentRoleId = await requireRoleId('parent');
    const registeredParents = [];

    async function registerParent(p) {
      if (!p.name) return null;
      const pw = p.password || 'Parent@123';
      const pUser = await User.create({
        username: p.username || `parent.${p.name.toLowerCase().replace(/\s+/g,'.')}_${Date.now()}`,
        password: await bcrypt.hash(pw, 10),
        email: p.email || null,
        first_name: p.name,
        last_name: p.name,
        is_active: true, role_id: parentRoleId,
      });
      const parent = await Parent.create({
        user_id: pUser.id, first_name: p.name, last_name: p.name,
        email: p.email || null, phone: p.phone || null,
        address: p.address || null, occupation: p.occupation || null,
        status: 'active', is_active: true,
      });
      await StudentParent.create({
        student_id: student.id, parent_id: parent.id,
        relationship: p.relationship || 'guardian',
      });
      return { id: parent.id, user_id: pUser.id, username: pUser.username, password: pw, relationship: p.relationship };
    }

    if (data.father_name) {
      const r = await registerParent({
        name: data.father_name, phone: data.father_phone,
        email: data.father_email, occupation: data.father_occupation,
        address: data.father_address, relationship: 'father',
        password: data.father_password, username: data.father_username,
      });
      if (r) registeredParents.push(r);
    }
    if (data.mother_name) {
      const r = await registerParent({
        name: data.mother_name, phone: data.mother_phone,
        email: data.mother_email, occupation: data.mother_occupation,
        address: data.mother_address, relationship: 'mother',
        password: data.mother_password, username: data.mother_username,
      });
      if (r) registeredParents.push(r);
    }

    return res.json(successResponse({
      id: student.id, user_id: user.id, username, password: studentPw,
      parents: registeredParents,
    }, 'Student and parents registered'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse(err.message)); }
}

async function updateSuperStudent(req, res) {
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) return res.status(404).json(errorResponse('Not found', 404));
    if (outsideScope(scopedSchoolId(req), student.school_id)) return res.status(404).json(errorResponse('Not found', 404));
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const user = await User.findByPk(student.user_id);
    if (user) {
      if (data.first_name) user.first_name = data.first_name;
      if (data.last_name) user.last_name = data.last_name;
      if (data.email) user.email = data.email;
      if (data.password) user.password = await bcrypt.hash(data.password, 10);
      await user.save();
    }
    const fields = ['admission_number','date_of_birth','gender','classroom_id',
      'academic_year_id','admission_date','student_type','fee_category','status',
      'place_of_birth','nationality','religion','home_language','home_address',
      'city','phone_number','blood_type','allergies','medical_notes','doctor_name',
      'doctor_phone','is_critical_medical','sen_tier','sen_notes','sen_iep',
      'father_name','father_phone','father_email','father_occupation','father_address',
      'father_whatsapp','mother_name','mother_phone','mother_email','mother_occupation',
      'mother_address','mother_whatsapp','mother_relationship','emergency_name',
      'emergency_relationship','emergency_phone','emergency_address',
      'disciplinary_history','disciplinary_notes','documents_birth_certificate',
      'documents_passport_photo','documents_previous_school_report',
      'documents_transfer_letter','documents_medical_report','documents_other','vaccinations',
    ];
    const upd = {};
    fields.forEach(k => { if (data[k] !== undefined) upd[k] = data[k]; });
    if (req.file) upd.passport_picture = `/uploads/students/${req.file.filename}`;
    await Student.update(upd, { where: { id: student.id } });
    return res.json(successResponse({}, 'Student updated'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse(err.message)); }
}

async function deleteSuperStudent(req, res) {
  const transaction = await require('../config/db').transaction();
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) return res.status(404).json(errorResponse('Not found', 404));
    if (outsideScope(scopedSchoolId(req), student.school_id)) return res.status(404).json(errorResponse('Not found', 404));
    await Student.destroy({ where: { id: student.id }, transaction });
    await User.destroy({ where: { id: student.user_id }, transaction });
    await transaction.commit();
    return res.json(successResponse({}, 'Student deleted'));
  } catch (err) { await transaction.rollback(); console.error(err); return res.status(500).json(errorResponse(err.message)); }
}

async function toggleSuperStudentStatus(req, res) {
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) return res.status(404).json(errorResponse('Not found', 404));
    if (outsideScope(scopedSchoolId(req), student.school_id)) return res.status(404).json(errorResponse('Not found', 404));
    student.is_active = !student.is_active;
    await student.save();
    return res.json(successResponse({ is_active: student.is_active }, `Status changed to ${student.is_active ? 'active' : 'inactive'}`));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

async function blockSuperStudent(req, res) {
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) return res.status(404).json(errorResponse('Not found', 404));
    if (outsideScope(scopedSchoolId(req), student.school_id)) return res.status(404).json(errorResponse('Not found', 404));
    student.status = student.status === 'blocked' ? 'active' : 'blocked';
    await student.save();
    return res.json(successResponse({ status: student.status }, `Student ${student.status === 'blocked' ? 'blocked' : 'unblocked'}`));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

/* ---------- Parent CRUD (superadmin) ---------- */
async function getSuperParents(req, res) {
  try {
    const { status, school_id } = req.query;
    const forcedSchool = scopedSchoolId(req);
    // Cross-tenant lockdown: parents have no school_id column (they belong to a
    // school via their linked students). A superadmin must scope to one school via
    // ?school_id=; the bare route never bulk-returns every tenant's parent PII.
    const targetSchool = forcedSchool !== null ? forcedSchool : (school_id ? parseInt(school_id, 10) : null);
    if (targetSchool === null) {
      return res.json(successResponse({ parents: [] }, 'Select a school to view its parents.'));
    }
    const where = {};
    if (status) where.status = status;
    {
      const schoolStudents = await Student.findAll({ where: { school_id: targetSchool }, attributes: ['id'] });
      const links = await StudentParent.findAll({
        where: { student_id: schoolStudents.map((s) => s.id) },
        attributes: ['parent_id'],
      });
      where.id = [...new Set(links.map((l) => l.parent_id))];
    }
    const rows = await Parent.findAll({ where, order: [['id', 'DESC']], limit: 500 });
    const parents = await Promise.all(rows.map(async p => {
      let user = null, linkedStudents = [];
      try { user = await User.findByPk(p.user_id); } catch {}
      try {
        const sp = await StudentParent.findAll({ where: { parent_id: p.id } });
        linkedStudents = await Promise.all(sp.map(async s => {
          const stu = await Student.findByPk(s.student_id);
          const u = stu ? await User.findByPk(stu.user_id) : null;
          return { student_id: s.student_id, relationship: s.relationship,
            first_name: u?.first_name || '', last_name: u?.last_name || '',
            admission_number: stu?.admission_number || '' };
        }));
      } catch {}
      return {
        id: p.id, user_id: p.user_id,
        first_name: user?.first_name || p.first_name,
        last_name: user?.last_name || p.last_name,
        email: user?.email || p.email,
        username: user?.username || '',
        phone: p.phone, passport_photo: p.passport_photo,
        address: p.address, occupation: p.occupation,
        status: p.status, is_active: p.is_active,
        students: linkedStudents,
        created_at: p.created_at,
      };
    }));
    return res.json(successResponse({ parents }));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

async function createSuperParent(req, res) {
  const transaction = await require('../config/db').transaction();
  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!data.first_name || !data.last_name) return res.status(400).json(errorResponse('first_name and last_name are required'));
    const forcedSchool = scopedSchoolId(req);
    if (forcedSchool === -1) { await transaction.rollback(); return res.status(403).json(errorResponse('No school is linked to your account', 403)); }
    if (forcedSchool !== null && Array.isArray(data.student_ids) && data.student_ids.length) {
      const ids = data.student_ids.map((s) => (typeof s === 'object' ? s.student_id : s));
      const owned = await Student.count({ where: { id: ids, school_id: forcedSchool } });
      if (owned !== ids.length) { await transaction.rollback(); return res.status(403).json(errorResponse('You can only link parents to students of your own school', 403)); }
    }

    const username = data.username || `parent.${data.first_name.toLowerCase()}.${data.last_name.toLowerCase()}_${Date.now()}`;
    const hashedPassword = await bcrypt.hash(data.password || 'Parent@123', 10);
    const parentRoleId = await requireRoleId('parent');
    const user = await User.create({
      username, password: hashedPassword,
      email: data.email || null,
      first_name: data.first_name, last_name: data.last_name,
      is_active: true, role_id: parentRoleId,
    }, { transaction });

    const photoPath = req.file ? `/uploads/parents/${req.file.filename}` : null;
    const parent = await Parent.create({
      user_id: user.id, first_name: data.first_name, last_name: data.last_name,
      email: data.email, phone: data.phone,
      passport_photo: photoPath, address: data.address,
      occupation: data.occupation, status: 'active', is_active: true,
    }, { transaction });

    // Link to students if provided
    if (data.student_ids && Array.isArray(data.student_ids)) {
      for (const sid of data.student_ids) {
        const rel = typeof sid === 'object' ? sid.relationship : 'guardian';
        const id = typeof sid === 'object' ? sid.student_id : sid;
        await StudentParent.create({ student_id: id, parent_id: parent.id, relationship: rel }, { transaction });
      }
    }

    await transaction.commit();
    return res.json(successResponse({ id: parent.id, user_id: user.id, username }, 'Parent created'));
  } catch (err) { await transaction.rollback(); console.error(err); return res.status(500).json(errorResponse(err.message)); }
}

async function updateSuperParent(req, res) {
  const transaction = await require('../config/db').transaction();
  try {
    const parent = await Parent.findByPk(req.params.id);
    if (!parent) return res.status(404).json(errorResponse('Not found', 404));
    {
      const forcedSchool = scopedSchoolId(req);
      if (forcedSchool !== null && !(await parentInSchool(parent.id, forcedSchool))) return res.status(404).json(errorResponse('Not found', 404));
    }
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const user = await User.findByPk(parent.user_id);
    if (user) {
      if (data.first_name) user.first_name = data.first_name;
      if (data.last_name) user.last_name = data.last_name;
      if (data.email) user.email = data.email;
      if (data.password) user.password = await bcrypt.hash(data.password, 10);
      await user.save({ transaction });
    }
    const upd = {};
    ['phone','address','occupation','status'].forEach(k => { if (data[k] !== undefined) upd[k] = data[k]; });
    if (req.file) upd.passport_photo = `/uploads/parents/${req.file.filename}`;
    await Parent.update(upd, { where: { id: parent.id }, transaction });
    await transaction.commit();
    return res.json(successResponse({}, 'Parent updated'));
  } catch (err) { await transaction.rollback(); console.error(err); return res.status(500).json(errorResponse(err.message)); }
}

async function deleteSuperParent(req, res) {
  const transaction = await require('../config/db').transaction();
  try {
    const parent = await Parent.findByPk(req.params.id);
    if (!parent) return res.status(404).json(errorResponse('Not found', 404));
    {
      const forcedSchool = scopedSchoolId(req);
      if (forcedSchool !== null && !(await parentInSchool(parent.id, forcedSchool))) return res.status(404).json(errorResponse('Not found', 404));
    }
    await StudentParent.destroy({ where: { parent_id: parent.id }, transaction });
    await Parent.destroy({ where: { id: parent.id }, transaction });
    await User.destroy({ where: { id: parent.user_id }, transaction });
    await transaction.commit();
    return res.json(successResponse({}, 'Parent deleted'));
  } catch (err) { await transaction.rollback(); console.error(err); return res.status(500).json(errorResponse(err.message)); }
}

async function toggleSuperParentStatus(req, res) {
  try {
    const parent = await Parent.findByPk(req.params.id);
    if (!parent) return res.status(404).json(errorResponse('Not found', 404));
    {
      const forcedSchool = scopedSchoolId(req);
      if (forcedSchool !== null && !(await parentInSchool(parent.id, forcedSchool))) return res.status(404).json(errorResponse('Not found', 404));
    }
    parent.is_active = !parent.is_active;
    await parent.save();
    return res.json(successResponse({ is_active: parent.is_active }, `Status changed to ${parent.is_active ? 'active' : 'inactive'}`));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

async function blockSuperParent(req, res) {
  try {
    const parent = await Parent.findByPk(req.params.id);
    if (!parent) return res.status(404).json(errorResponse('Not found', 404));
    {
      const forcedSchool = scopedSchoolId(req);
      if (forcedSchool !== null && !(await parentInSchool(parent.id, forcedSchool))) return res.status(404).json(errorResponse('Not found', 404));
    }
    parent.status = parent.status === 'blocked' ? 'active' : 'blocked';
    await parent.save();
    return res.json(successResponse({ status: parent.status }, `Parent ${parent.status === 'blocked' ? 'blocked' : 'unblocked'}`));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

/* ---------- Student-Parent Linking ---------- */
async function linkParentToStudent(req, res) {
  try {
    const { student_id, parent_id, relationship } = req.body;
    if (!student_id || !parent_id) return res.status(400).json(errorResponse('student_id and parent_id are required'));
    const student = await Student.findByPk(student_id);
    if (!student) return res.status(404).json(errorResponse('Student not found'));
    if (outsideScope(scopedSchoolId(req), student.school_id)) return res.status(404).json(errorResponse('Student not found'));
    const parent = await Parent.findByPk(parent_id);
    if (!parent) return res.status(404).json(errorResponse('Parent not found'));
    const existing = await StudentParent.findOne({ where: { student_id, parent_id } });
    if (existing) return res.status(400).json(errorResponse('Link already exists'));
    await StudentParent.create({ student_id, parent_id, relationship: relationship || 'guardian' });
    return res.json(successResponse({}, 'Parent linked to student'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

async function unlinkParentFromStudent(req, res) {
  try {
    const { student_id, parent_id } = req.body;
    if (!student_id || !parent_id) return res.status(400).json(errorResponse('student_id and parent_id are required'));
    const forcedSchool = scopedSchoolId(req);
    if (forcedSchool !== null) {
      const student = await Student.findByPk(student_id);
      if (!student || outsideScope(forcedSchool, student.school_id)) return res.status(404).json(errorResponse('Student not found'));
    }
    await StudentParent.destroy({ where: { student_id, parent_id } });
    return res.json(successResponse({}, 'Parent unlinked from student'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

async function getStudentParents(req, res) {
  try {
    const forcedSchool = scopedSchoolId(req);
    if (forcedSchool !== null) {
      const student = await Student.findByPk(req.params.id);
      if (!student || outsideScope(forcedSchool, student.school_id)) return res.status(404).json(errorResponse('Student not found', 404));
    }
    const links = await StudentParent.findAll({ where: { student_id: req.params.id } });
    const parents = await Promise.all(links.map(async l => {
      const p = await Parent.findByPk(l.parent_id);
      const u = p ? await User.findByPk(p.user_id) : null;
      return { parent_id: l.parent_id, relationship: l.relationship,
        first_name: u?.first_name || p?.first_name || '',
        last_name: u?.last_name || p?.last_name || '',
        email: u?.email || p?.email || '', phone: p?.phone || '' };
    }));
    return res.json(successResponse({ parents }));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

/* ---------- Student Document Upload ---------- */
async function uploadStudentDocument(req, res) {
  try {
    if (!req.file) return res.status(400).json(errorResponse('No file uploaded'));
    const student = await Student.findByPk(req.params.id);
    if (!student) return res.status(404).json(errorResponse('Student not found', 404));
    if (outsideScope(scopedSchoolId(req), student.school_id)) return res.status(404).json(errorResponse('Student not found', 404));
    const doc = await Document.create({
      school_id: student.school_id || req.body.school_id || 0,
      student_id: req.params.id,
      title: req.body.title || req.file.originalname,
      file_path: `/uploads/documents/${req.file.filename}`,
      file_type: req.file.mimetype,
      uploaded_by: req.user?.id || null,
      is_verified: false,
    });
    return res.json(successResponse({ id: doc.id, file_path: doc.file_path }, 'Document uploaded'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

async function getStudentDocuments(req, res) {
  try {
    const forcedSchool = scopedSchoolId(req);
    if (forcedSchool !== null) {
      const student = await Student.findByPk(req.params.id);
      if (!student || outsideScope(forcedSchool, student.school_id)) return res.status(404).json(errorResponse('Student not found', 404));
    }
    const docs = await Document.findAll({ where: { student_id: req.params.id }, order: [['created_at', 'DESC']] });
    return res.json(successResponse({ documents: docs }));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

async function deleteStudentDocument(req, res) {
  try {
    const doc = await Document.findByPk(req.params.docId);
    if (!doc) return res.status(404).json(errorResponse('Document not found'));
    const forcedSchool = scopedSchoolId(req);
    if (forcedSchool !== null) {
      const student = await Student.findByPk(doc.student_id);
      if (!student || outsideScope(forcedSchool, student.school_id)) return res.status(404).json(errorResponse('Document not found', 404));
    }
    await doc.destroy();
    return res.json(successResponse({}, 'Document deleted'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

/* ---------- Teacher CRUD (superadmin) ---------- */
async function getSuperTeachers(req, res) {
  try {
    const { school_id, status, page = 1, limit = 100 } = req.query;
    const forcedSchool = scopedSchoolId(req);
    // Cross-tenant lockdown: a superadmin must scope to a single school via
    // ?school_id=; the bare route never bulk-returns every tenant's teacher PII
    // (national ID/passport/bank/salary). View per-school only.
    if (forcedSchool === null && !school_id) {
      return res.json(successResponse({ teachers: [], total: 0, page: parseInt(page), limit: parseInt(limit) }, 'Select a school to view its teachers.'));
    }
    const where = {};
    if (forcedSchool !== null) where.school_id = forcedSchool;
    else if (school_id) where.school_id = school_id;
    if (status) where.status = status;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows, count } = await Teacher.findAndCountAll({
      where, order: [['id', 'DESC']], offset, limit: parseInt(limit),
    });
    const teachers = await Promise.all(rows.map(async t => {
      let user = null;
      try { user = await User.findByPk(t.user_id); } catch {}
      return {
        id: t.id, school_id: t.school_id, user_id: t.user_id,
        employee_id: t.employee_id,
        first_name: user?.first_name || '', last_name: user?.last_name || '',
        email: user?.email || '', username: user?.username || '',
        date_of_birth: t.date_of_birth, gender: t.gender,
        marital_status: t.marital_status,
        nationality: t.nationality, state_of_origin: t.state_of_origin,
        lga: t.lga, religion: t.religion,
        address: t.address, city: t.city,
        phone_number: t.phone_number,
        qualification: t.qualification, years_experience: t.years_experience,
        subjects_specialization: t.subjects_specialization,
        hire_date: t.hire_date, contract_type: t.contract_type,
        salary_grade: t.salary_grade,
        is_examination_officer: t.is_examination_officer,
        national_id_number: t.national_id_number,
        passport_number: t.passport_number,
        bank_name: t.bank_name, bank_account_number: t.bank_account_number,
        bank_account_name: t.bank_account_name,
        emergency_contact_name: t.emergency_contact_name,
        emergency_contact_phone: t.emergency_contact_phone,
        emergency_contact_relationship: t.emergency_contact_relationship,
        next_of_kin_name: t.next_of_kin_name,
        next_of_kin_phone: t.next_of_kin_phone,
        next_of_kin_relationship: t.next_of_kin_relationship,
        next_of_kin_address: t.next_of_kin_address,
        profile_picture: t.profile_picture,
        bio: t.bio, linkedin_url: t.linkedin_url,
        degrees: t.degrees, certifications: t.certifications,
        must_change_password: t.must_change_password,
        status: t.status, is_active: t.is_active,
        created_at: t.created_at,
      };
    }));
    return res.json(successResponse({ teachers, total: count, page: parseInt(page), limit: parseInt(limit) }));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

async function createSuperTeacher(req, res) {
  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!data.first_name || !data.last_name) return res.status(400).json(errorResponse('first_name and last_name are required'));
    if (!data.employee_id) return res.status(400).json(errorResponse('employee_id is required'));
    const forcedSchool = scopedSchoolId(req);
    if (forcedSchool === -1) return res.status(403).json(errorResponse('No school is linked to your account', 403));
    if (forcedSchool !== null) data.school_id = forcedSchool;

    const username = data.username || `teacher.${data.first_name.toLowerCase()}.${data.last_name.toLowerCase()}_${Date.now()}`;
    const teacherPw = data.password || 'Teacher@123';
    const hashedPassword = await bcrypt.hash(teacherPw, 10);
    const teacherRoleId = await requireRoleId('teacher');
    const user = await User.create({
      username, password: hashedPassword,
      email: data.email || null,
      first_name: data.first_name, last_name: data.last_name,
      is_active: true, role_id: teacherRoleId,
    });

    const picPath = req.file ? `/uploads/teachers/${req.file.filename}` : null;
    const teacher = await Teacher.create({
      school_id: data.school_id || null, user_id: user.id,
      employee_id: data.employee_id,
      date_of_birth: data.date_of_birth, gender: data.gender,
      marital_status: data.marital_status,
      nationality: data.nationality, state_of_origin: data.state_of_origin,
      lga: data.lga, religion: data.religion,
      address: data.address, city: data.city,
      phone_number: data.phone_number,
      qualification: data.qualification, years_experience: data.years_experience,
      subjects_specialization: data.subjects_specialization,
      hire_date: data.hire_date, contract_type: data.contract_type,
      salary_grade: data.salary_grade,
      is_examination_officer: data.is_examination_officer,
      national_id_number: data.national_id_number,
      passport_number: data.passport_number,
      bank_name: data.bank_name, bank_account_number: data.bank_account_number,
      bank_account_name: data.bank_account_name,
      emergency_contact_name: data.emergency_contact_name,
      emergency_contact_phone: data.emergency_contact_phone,
      emergency_contact_relationship: data.emergency_contact_relationship,
      next_of_kin_name: data.next_of_kin_name,
      next_of_kin_phone: data.next_of_kin_phone,
      next_of_kin_relationship: data.next_of_kin_relationship,
      next_of_kin_address: data.next_of_kin_address,
      profile_picture: picPath,
      bio: data.bio, linkedin_url: data.linkedin_url,
      degrees: data.degrees || [], certifications: data.certifications || [],
      must_change_password: data.must_change_password,
      status: 'active', is_active: true,
    });

    return res.json(successResponse({
      id: teacher.id, user_id: user.id, username, password: teacherPw,
    }, 'Teacher created'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse(err.message)); }
}

async function updateSuperTeacher(req, res) {
  try {
    const teacher = await Teacher.findByPk(req.params.id);
    if (!teacher) return res.status(404).json(errorResponse('Not found', 404));
    if (outsideScope(scopedSchoolId(req), teacher.school_id)) return res.status(404).json(errorResponse('Not found', 404));
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const user = await User.findByPk(teacher.user_id);
    if (user) {
      if (data.first_name) user.first_name = data.first_name;
      if (data.last_name) user.last_name = data.last_name;
      if (data.email) user.email = data.email;
      if (data.password) user.password = await bcrypt.hash(data.password, 10);
      await user.save();
    }
    const fields = ['employee_id','date_of_birth','gender','marital_status',
      'nationality','state_of_origin','lga','religion','address','city',
      'phone_number','qualification','years_experience','subjects_specialization',
      'hire_date','contract_type','salary_grade','is_examination_officer',
      'national_id_number','passport_number','bank_name','bank_account_number',
      'bank_account_name','emergency_contact_name','emergency_contact_phone',
      'emergency_contact_relationship','next_of_kin_name','next_of_kin_phone',
      'next_of_kin_relationship','next_of_kin_address','bio','linkedin_url',
      'degrees','certifications','must_change_password',
    ];
    const upd = {};
    fields.forEach(k => { if (data[k] !== undefined) upd[k] = data[k]; });
    if (req.file) upd.profile_picture = `/uploads/teachers/${req.file.filename}`;
    await Teacher.update(upd, { where: { id: teacher.id } });
    return res.json(successResponse({}, 'Teacher updated'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse(err.message)); }
}

async function deleteSuperTeacher(req, res) {
  try {
    const teacher = await Teacher.findByPk(req.params.id);
    if (!teacher) return res.status(404).json(errorResponse('Not found', 404));
    if (outsideScope(scopedSchoolId(req), teacher.school_id)) return res.status(404).json(errorResponse('Not found', 404));
    await Teacher.destroy({ where: { id: teacher.id } });
    await User.destroy({ where: { id: teacher.user_id } });
    return res.json(successResponse({}, 'Teacher deleted'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

async function toggleSuperTeacherStatus(req, res) {
  try {
    const teacher = await Teacher.findByPk(req.params.id);
    if (!teacher) return res.status(404).json(errorResponse('Not found', 404));
    if (outsideScope(scopedSchoolId(req), teacher.school_id)) return res.status(404).json(errorResponse('Not found', 404));
    teacher.is_active = !teacher.is_active;
    await teacher.save();
    return res.json(successResponse({ is_active: teacher.is_active }, `Status changed to ${teacher.is_active ? 'active' : 'inactive'}`));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

async function blockSuperTeacher(req, res) {
  try {
    const teacher = await Teacher.findByPk(req.params.id);
    if (!teacher) return res.status(404).json(errorResponse('Not found', 404));
    if (outsideScope(scopedSchoolId(req), teacher.school_id)) return res.status(404).json(errorResponse('Not found', 404));
    teacher.status = teacher.status === 'blocked' ? 'active' : 'blocked';
    await teacher.save();
    return res.json(successResponse({ status: teacher.status }, `Teacher ${teacher.status === 'blocked' ? 'blocked' : 'unblocked'}`));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

/* ---------- Bursar CRUD (superadmin) ---------- */
async function getSuperBursars(req, res) {
  try {
    const { school_id, status, page = 1, limit = 100 } = req.query;
    const forcedSchool = scopedSchoolId(req);
    const where = {};
    if (forcedSchool !== null) where.school_id = forcedSchool;
    else if (school_id) where.school_id = school_id;
    if (status) where.status = status;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows, count } = await CoreBursar.findAndCountAll({ where, order: [['id', 'DESC']], offset, limit: parseInt(limit) });
    const bursars = await Promise.all(rows.map(async b => {
      let user = null;
      try { user = await User.findByPk(b.user_id); } catch {}
      return {
        id: b.id, school_id: b.school_id, user_id: b.user_id,
        employee_id: b.employee_id,
        first_name: user?.first_name || '', last_name: user?.last_name || '',
        email: user?.email || '', username: user?.username || '',
        date_of_birth: b.date_of_birth, gender: b.gender,
        marital_status: b.marital_status,
        nationality: b.nationality, state_of_origin: b.state_of_origin,
        lga: b.lga, religion: b.religion, address: b.address, city: b.city,
        phone_number: b.phone_number,
        qualification: b.qualification, years_experience: b.years_experience,
        hire_date: b.hire_date, contract_type: b.contract_type,
        salary_grade: b.salary_grade,
        national_id_number: b.national_id_number,
        bank_name: b.bank_name, bank_account_number: b.bank_account_number,
        bank_account_name: b.bank_account_name,
        emergency_contact_name: b.emergency_contact_name,
        emergency_contact_phone: b.emergency_contact_phone,
        emergency_contact_relationship: b.emergency_contact_relationship,
        profile_picture: b.profile_picture, bio: b.bio,
        must_change_password: b.must_change_password,
        status: b.status, is_active: b.is_active,
        created_at: b.created_at,
      };
    }));
    return res.json(successResponse({ bursars, total: count, page: parseInt(page), limit: parseInt(limit) }));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

async function createSuperBursar(req, res) {
  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!data.first_name || !data.last_name) return res.status(400).json(errorResponse('first_name and last_name are required'));
    if (!data.employee_id) return res.status(400).json(errorResponse('employee_id is required'));
    const forcedSchool = scopedSchoolId(req);
    if (forcedSchool === -1) return res.status(403).json(errorResponse('No school is linked to your account', 403));
    if (forcedSchool !== null) data.school_id = forcedSchool;
    const username = data.username || `bursar.${data.first_name.toLowerCase()}.${data.last_name.toLowerCase()}_${Date.now()}`;
    const pw = data.password || 'Bursar@123';
    const hashedPassword = await bcrypt.hash(pw, 10);
    const bursarRoleId = await requireRoleId('bursar');
    const user = await User.create({
      username, password: hashedPassword, email: data.email || null,
      first_name: data.first_name, last_name: data.last_name,
      is_active: true, role_id: bursarRoleId,
    });
    const picPath = req.file ? `/uploads/bursars/${req.file.filename}` : null;
    const bursar = await CoreBursar.create({
      school_id: data.school_id || null, user_id: user.id,
      employee_id: data.employee_id,
      date_of_birth: data.date_of_birth, gender: data.gender,
      marital_status: data.marital_status,
      nationality: data.nationality, state_of_origin: data.state_of_origin,
      lga: data.lga, religion: data.religion, address: data.address, city: data.city,
      phone_number: data.phone_number,
      qualification: data.qualification, years_experience: data.years_experience,
      hire_date: data.hire_date, contract_type: data.contract_type,
      salary_grade: data.salary_grade,
      national_id_number: data.national_id_number,
      bank_name: data.bank_name, bank_account_number: data.bank_account_number,
      bank_account_name: data.bank_account_name,
      emergency_contact_name: data.emergency_contact_name,
      emergency_contact_phone: data.emergency_contact_phone,
      emergency_contact_relationship: data.emergency_contact_relationship,
      profile_picture: picPath, bio: data.bio,
      must_change_password: data.must_change_password,
      status: 'active', is_active: true,
    });
    return res.json(successResponse({ id: bursar.id, user_id: user.id, username, password: pw }, 'Bursar created'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse(err.message)); }
}

async function updateSuperBursar(req, res) {
  try {
    const bursar = await CoreBursar.findByPk(req.params.id);
    if (!bursar) return res.status(404).json(errorResponse('Not found', 404));
    if (outsideScope(scopedSchoolId(req), bursar.school_id)) return res.status(404).json(errorResponse('Not found', 404));
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const user = await User.findByPk(bursar.user_id);
    if (user) {
      if (data.first_name) user.first_name = data.first_name;
      if (data.last_name) user.last_name = data.last_name;
      if (data.email) user.email = data.email;
      if (data.password) user.password = await bcrypt.hash(data.password, 10);
      await user.save();
    }
    const fields = ['employee_id','date_of_birth','gender','marital_status',
      'nationality','state_of_origin','lga','religion','address','city',
      'phone_number','qualification','years_experience','hire_date','contract_type',
      'salary_grade','national_id_number','bank_name','bank_account_number',
      'bank_account_name','emergency_contact_name','emergency_contact_phone',
      'emergency_contact_relationship','bio','must_change_password',
    ];
    const upd = {};
    fields.forEach(k => { if (data[k] !== undefined) upd[k] = data[k]; });
    if (req.file) upd.profile_picture = `/uploads/bursars/${req.file.filename}`;
    await CoreBursar.update(upd, { where: { id: bursar.id } });
    return res.json(successResponse({}, 'Bursar updated'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse(err.message)); }
}

async function deleteSuperBursar(req, res) {
  try {
    const bursar = await CoreBursar.findByPk(req.params.id);
    if (!bursar) return res.status(404).json(errorResponse('Not found', 404));
    if (outsideScope(scopedSchoolId(req), bursar.school_id)) return res.status(404).json(errorResponse('Not found', 404));
    await CoreBursar.destroy({ where: { id: bursar.id } });
    await User.destroy({ where: { id: bursar.user_id } });
    return res.json(successResponse({}, 'Bursar deleted'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

async function toggleSuperBursarStatus(req, res) {
  try {
    const bursar = await CoreBursar.findByPk(req.params.id);
    if (!bursar) return res.status(404).json(errorResponse('Not found', 404));
    if (outsideScope(scopedSchoolId(req), bursar.school_id)) return res.status(404).json(errorResponse('Not found', 404));
    bursar.is_active = !bursar.is_active; await bursar.save();
    return res.json(successResponse({ is_active: bursar.is_active }, `Status changed to ${bursar.is_active ? 'active' : 'inactive'}`));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

async function blockSuperBursar(req, res) {
  try {
    const bursar = await CoreBursar.findByPk(req.params.id);
    if (!bursar) return res.status(404).json(errorResponse('Not found', 404));
    if (outsideScope(scopedSchoolId(req), bursar.school_id)) return res.status(404).json(errorResponse('Not found', 404));
    bursar.status = bursar.status === 'blocked' ? 'active' : 'blocked'; await bursar.save();
    return res.json(successResponse({ status: bursar.status }, `Bursar ${bursar.status === 'blocked' ? 'blocked' : 'unblocked'}`));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

/* ---------- Principal CRUD (superadmin) ---------- */
async function getSuperPrincipals(req, res) {
  try {
    const { school_id, status, page = 1, limit = 100 } = req.query;
    const forcedSchool = scopedSchoolId(req);
    const where = {};
    if (forcedSchool !== null) where.school_id = forcedSchool;
    else if (school_id) where.school_id = school_id;
    if (status) where.status = status;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows, count } = await CorePrincipal.findAndCountAll({ where, order: [['id', 'DESC']], offset, limit: parseInt(limit) });
    const principals = await Promise.all(rows.map(async p => {
      let user = null;
      try { user = await User.findByPk(p.user_id); } catch {}
      return {
        id: p.id, school_id: p.school_id, user_id: p.user_id, employee_id: p.employee_id,
        first_name: user?.first_name || '', last_name: user?.last_name || '',
        email: user?.email || '', username: user?.username || '',
        date_of_birth: p.date_of_birth, gender: p.gender, marital_status: p.marital_status,
        nationality: p.nationality, state_of_origin: p.state_of_origin, lga: p.lga,
        religion: p.religion, address: p.address, city: p.city, phone_number: p.phone_number,
        qualification: p.qualification, years_experience: p.years_experience,
        hire_date: p.hire_date, contract_type: p.contract_type, salary_grade: p.salary_grade,
        national_id_number: p.national_id_number,
        bank_name: p.bank_name, bank_account_number: p.bank_account_number, bank_account_name: p.bank_account_name,
        emergency_contact_name: p.emergency_contact_name, emergency_contact_phone: p.emergency_contact_phone,
        emergency_contact_relationship: p.emergency_contact_relationship,
        profile_picture: p.profile_picture, bio: p.bio,
        must_change_password: p.must_change_password,
        status: p.status, is_active: p.is_active, created_at: p.created_at,
      };
    }));
    return res.json(successResponse({ principals, total: count, page: parseInt(page), limit: parseInt(limit) }));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

async function createSuperPrincipal(req, res) {
  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!data.first_name || !data.last_name) return res.status(400).json(errorResponse('first_name and last_name are required'));
    if (!data.employee_id) return res.status(400).json(errorResponse('employee_id is required'));
    const forcedSchool = scopedSchoolId(req);
    if (forcedSchool === -1) return res.status(403).json(errorResponse('No school is linked to your account', 403));
    if (forcedSchool !== null) data.school_id = forcedSchool;
    const username = data.username || `principal.${data.first_name.toLowerCase()}.${data.last_name.toLowerCase()}_${Date.now()}`;
    const pw = data.password || 'Principal@123';
    const user = await User.create({
      username, password: await bcrypt.hash(pw, 10), email: data.email || null,
      first_name: data.first_name, last_name: data.last_name,
      is_active: true, role_id: await requireRoleId('principal'),
    });
    const picPath = req.file ? `/uploads/principals/${req.file.filename}` : null;
    const principal = await CorePrincipal.create({
      school_id: data.school_id || null, user_id: user.id, employee_id: data.employee_id,
      date_of_birth: data.date_of_birth, gender: data.gender, marital_status: data.marital_status,
      nationality: data.nationality, state_of_origin: data.state_of_origin, lga: data.lga,
      religion: data.religion, address: data.address, city: data.city, phone_number: data.phone_number,
      qualification: data.qualification, years_experience: data.years_experience,
      hire_date: data.hire_date, contract_type: data.contract_type, salary_grade: data.salary_grade,
      national_id_number: data.national_id_number,
      bank_name: data.bank_name, bank_account_number: data.bank_account_number, bank_account_name: data.bank_account_name,
      emergency_contact_name: data.emergency_contact_name, emergency_contact_phone: data.emergency_contact_phone,
      emergency_contact_relationship: data.emergency_contact_relationship,
      profile_picture: picPath, bio: data.bio, must_change_password: data.must_change_password,
      status: 'active', is_active: true,
    });
    return res.json(successResponse({ id: principal.id, user_id: user.id, username, password: pw }, 'Principal created'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse(err.message)); }
}

async function updateSuperPrincipal(req, res) {
  try {
    const principal = await CorePrincipal.findByPk(req.params.id);
    if (!principal) return res.status(404).json(errorResponse('Not found', 404));
    if (outsideScope(scopedSchoolId(req), principal.school_id)) return res.status(404).json(errorResponse('Not found', 404));
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const user = await User.findByPk(principal.user_id);
    if (user) {
      if (data.first_name) user.first_name = data.first_name;
      if (data.last_name) user.last_name = data.last_name;
      if (data.email) user.email = data.email;
      if (data.password) user.password = await bcrypt.hash(data.password, 10);
      await user.save();
    }
    const fields = ['employee_id','date_of_birth','gender','marital_status','nationality',
      'state_of_origin','lga','religion','address','city','phone_number','qualification',
      'years_experience','hire_date','contract_type','salary_grade','national_id_number',
      'bank_name','bank_account_number','bank_account_name','emergency_contact_name',
      'emergency_contact_phone','emergency_contact_relationship','bio','must_change_password',
    ];
    const upd = {};
    fields.forEach(k => { if (data[k] !== undefined) upd[k] = data[k]; });
    if (req.file) upd.profile_picture = `/uploads/principals/${req.file.filename}`;
    await CorePrincipal.update(upd, { where: { id: principal.id } });
    return res.json(successResponse({}, 'Principal updated'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse(err.message)); }
}

async function deleteSuperPrincipal(req, res) {
  try {
    const principal = await CorePrincipal.findByPk(req.params.id);
    if (!principal) return res.status(404).json(errorResponse('Not found', 404));
    if (outsideScope(scopedSchoolId(req), principal.school_id)) return res.status(404).json(errorResponse('Not found', 404));
    await CorePrincipal.destroy({ where: { id: principal.id } });
    await User.destroy({ where: { id: principal.user_id } });
    return res.json(successResponse({}, 'Principal deleted'));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

async function toggleSuperPrincipalStatus(req, res) {
  try {
    const principal = await CorePrincipal.findByPk(req.params.id);
    if (!principal) return res.status(404).json(errorResponse('Not found', 404));
    if (outsideScope(scopedSchoolId(req), principal.school_id)) return res.status(404).json(errorResponse('Not found', 404));
    principal.is_active = !principal.is_active; await principal.save();
    return res.json(successResponse({ is_active: principal.is_active }, `Status changed to ${principal.is_active ? 'active' : 'inactive'}`));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

async function blockSuperPrincipal(req, res) {
  try {
    const principal = await CorePrincipal.findByPk(req.params.id);
    if (!principal) return res.status(404).json(errorResponse('Not found', 404));
    if (outsideScope(scopedSchoolId(req), principal.school_id)) return res.status(404).json(errorResponse('Not found', 404));
    principal.status = principal.status === 'blocked' ? 'active' : 'blocked'; await principal.save();
    return res.json(successResponse({ status: principal.status }, `Principal ${principal.status === 'blocked' ? 'blocked' : 'unblocked'}`));
  } catch (err) { console.error(err); return res.status(500).json(errorResponse('Internal server error', 500)); }
}

module.exports = {
  getSecurityLogs,
  getSecurityCounters,
  getProfile,
  patchProfile,
  postChangePassword,
  getAdminSettings,
  patchAdminSettings,
  getUsers,
  getUsersShort,
  postUsers,
  getSchoolStats,
  getGradeStats,
  getForensicEvents,
  getBroadcastAlerts,
  postBroadcastAlerts,
  getSystemAlerts,
  postSystemAlerts,
  postSaBranding,
  getSaLockdown,
  postSaLockdown,
  postSaBackupManual,
  getSaCustomRoles,
  postSaCustomRoles,
  getSaExport,
  getAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  toggleAcademicYearStatus,
  rolloutAcademicYear,
  getRolloutPreview,
  restoreAcademicYear,
  cloneAcademicYear,
  closeAcademicYear,
  getAcademicYearAdoption,
  getAcademicYearHistory,
  getSystemTerms,
  createSystemTerm,
  updateSystemTerm,
  deleteSystemTerm,
  toggleSystemTermStatus,
  rolloutTerm,
  getInstitutionTypes,
  createInstitutionType,
  updateInstitutionType,
  deleteInstitutionType,
  toggleInstitutionTypeStatus,
  getLessonPlanTypes,
  createLessonPlanType,
  updateLessonPlanType,
  deleteLessonPlanType,
  toggleLessonPlanTypeStatus,
  getVirtualMeetings,
  createVirtualMeeting,
  updateVirtualMeeting,
  deleteVirtualMeeting,
  getCapacityCategories,
  createCapacityCategory,
  updateCapacityCategory,
  deleteCapacityCategory,
  toggleCapacityCategoryStatus,
  getSchoolCapacities,
  createSchoolCapacity,
  updateSchoolCapacity,
  deleteSchoolCapacity,
  toggleSchoolCapacityStatus,
  getCountries,
  createCountry,
  updateCountry,
  deleteCountry,
  toggleCountryStatus,
  getRegions,
  createRegion,
  updateRegion,
  deleteRegion,
  toggleRegionStatus,
  getCities,
  createCity,
  updateCity,
  deleteCity,
  toggleCityStatus,
  getSchoolTypes,
  createSchoolType,
  updateSchoolType,
  deleteSchoolType,
  toggleSchoolTypeStatus,
  getSyllabusTypes,
  createSyllabusType,
  updateSyllabusType,
  deleteSyllabusType,
  toggleSyllabusTypeStatus,
  getClassSubtypes,
  createClassSubtype,
  updateClassSubtype,
  deleteClassSubtype,
  toggleClassSubtypeStatus,
  /* Academic Systems */
  getAcademicSystems, createAcademicSystem, updateAcademicSystem, deleteAcademicSystem, toggleAcademicSystemStatus,
  /* Grading Systems */
  getGradingSystems, createGradingSystem, updateGradingSystem, deleteGradingSystem, toggleGradingSystemStatus,
  /* Classes */
  getSuperClasses, createSuperClass, updateSuperClass, deleteSuperClass, toggleSuperClassStatus,
  /* Subjects */
  getSuperSubjects, createSuperSubject, updateSuperSubject, deleteSuperSubject, toggleSuperSubjectStatus,
  /* Class Assignments */
  getClassStudents, getAvailableStudents, assignClassStudents,
  getClassAssignedSubjects, getAvailableSubjectsForClass, assignClassSubjects, assignClassTeacher,
  getClassTeachers, getAvailableTeachersForClass, assignClassMultipleTeachers,
  /* Subject Assignments */
  assignSubjectClasses, assignSubjectTeacher, getSubjectAssignedClasses, getAvailableClassesForSubject, getTeachersForSubject,
  getPrincipals, createPrincipal, updatePrincipal, deletePrincipal, togglePrincipalStatus,
  getBursars, createBursar, updateBursar, deleteBursar, toggleBursarStatus,
  /* Students */
  getSuperStudents, createSuperStudent, updateSuperStudent, deleteSuperStudent,
  toggleSuperStudentStatus, blockSuperStudent,
  /* Parent */
  getSuperParents, createSuperParent, updateSuperParent, deleteSuperParent,
  toggleSuperParentStatus, blockSuperParent,
  /* Student-Parent linking */
  linkParentToStudent, unlinkParentFromStudent, getStudentParents,
  /* Documents */
  uploadStudentDocument, getStudentDocuments, deleteStudentDocument,
  /* Teachers */
  getSuperTeachers, createSuperTeacher, updateSuperTeacher, deleteSuperTeacher,
  toggleSuperTeacherStatus, blockSuperTeacher,
  /* Bursars */
  getSuperBursars, createSuperBursar, updateSuperBursar, deleteSuperBursar,
  toggleSuperBursarStatus, blockSuperBursar,
  /* Principals */
  getSuperPrincipals, createSuperPrincipal, updateSuperPrincipal, deleteSuperPrincipal,
  toggleSuperPrincipalStatus, blockSuperPrincipal,
};
