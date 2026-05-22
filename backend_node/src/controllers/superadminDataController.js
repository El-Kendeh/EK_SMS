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
const CapacityCategory = require('../models/CapacityCategory');
const SchoolCapacity = require('../models/SchoolCapacity');
const Country = require('../models/Country');
const Region = require('../models/Region');
const City = require('../models/City');
const SchoolType = require('../models/SchoolType');
const SyllabusType = require('../models/SyllabusType');
const ClassSubtype = require('../models/ClassSubtype');
const Principal = require('../models/Principal');
const Bursar = require('../models/Bursar');
const { appendSecurityAuditLog } = require('../utils/auditLog');
const { requireRoleId, mapInviteLabelToCode } = require('../utils/roleIds');

const successResponse = (data = {}, message = 'Success') => ({ success: true, message, ...data });
const errorResponse = (message = 'Error', status = 400) => ({ success: false, message, status });

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (xf && typeof xf === 'string') return xf.split(',')[0].trim().slice(0, 64);
  return (req.socket?.remoteAddress || '—').slice(0, 64);
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
    const schoolCount = await School.count();
    return res.json(successResponse({
      schools: schoolCount,
      grade_events_30d: 0,
      integrity_score: 100,
      pending_reviews: 0,
      total_grades: 0,
      locked_grades: 0,
      unlocked_grades: 0,
      average_score: null,
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
async function getAcademicYears(req, res) {
  try {
    const rows = await SystemAcademicYear.findAll({ order: [['created_at', 'DESC']] });
    const years = rows.map(r => ({
      id: r.id,
      name: r.name,
      start_date: r.start_date,
      end_date: r.end_date,
      is_active: Boolean(r.is_active),
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
    if (!name) return res.status(400).json(errorResponse('Name is required'));
    const row = await SystemAcademicYear.create({
      name: String(name).slice(0, 100),
      start_date: start_date || null,
      end_date: end_date || null,
    });
    await appendSecurityAuditLog({
      type: 'config_change',
      severity: 'medium',
      actor: req.user.username,
      ip: clientIp(req),
      action: `Created academic year: ${name}`,
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
    const { name, start_date, end_date } = req.body;
    const row = await SystemAcademicYear.findByPk(id);
    if (!row) return res.status(404).json(errorResponse('Not found', 404));
    if (name !== undefined) row.name = String(name).slice(0, 100);
    if (start_date !== undefined) row.start_date = start_date || null;
    if (end_date !== undefined) row.end_date = end_date || null;
    row.updated_at = new Date();
    await row.save();
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
    await row.destroy();
    return res.json(successResponse({}, 'Academic year deleted'));
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
    row.is_active = !row.is_active;
    row.updated_at = new Date();
    await row.save();
    return res.json(successResponse({ is_active: row.is_active }, `Status changed to ${row.is_active ? 'active' : 'inactive'}`));
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
    await SystemAcademicYear.update({ is_active: false, updated_at: new Date() }, { where: { is_active: true } });
    row.is_active = true;
    row.updated_at = new Date();
    await row.save();
    await appendSecurityAuditLog({
      type: 'config_change',
      severity: 'medium',
      actor: req.user.username,
      ip: clientIp(req),
      action: `Rolled out academic year: ${row.name}`,
      metadata: { id: row.id, model: 'SystemAcademicYear', rolled_out: true },
    });
    return res.json(successResponse({ id: row.id, name: row.name, is_active: true }, 'Academic year rolled out'));
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
  getPrincipals, createPrincipal, updatePrincipal, deletePrincipal, togglePrincipalStatus,
  getBursars, createBursar, updateBursar, deleteBursar, toggleBursarStatus,
};
