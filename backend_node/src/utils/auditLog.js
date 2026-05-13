const SecurityAuditLog = require('../models/SecurityAuditLog');

/**
 * Best-effort audit row (MySQL). Never throws to callers — logs errors only.
 */
async function appendSecurityAuditLog({
  type,
  severity = 'info',
  actor = '',
  ip = '—',
  action,
  metadata = null,
}) {
  try {
    await SecurityAuditLog.create({
      type: String(type || 'event').slice(0, 64),
      severity: String(severity || 'info').slice(0, 32),
      actor: String(actor || '').slice(0, 255),
      ip: String(ip || '—').slice(0, 64),
      action: String(action || ''),
      metadata_json: metadata ? JSON.stringify(metadata) : null,
      ts: new Date(),
    });
  } catch (e) {
    console.error('[audit]', e.message);
  }
}

module.exports = { appendSecurityAuditLog };
