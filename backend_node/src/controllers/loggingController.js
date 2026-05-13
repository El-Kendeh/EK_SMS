const { appendSecurityAuditLog } = require('../utils/auditLog');

const successResponse = (data = {}, message = "Success") => ({ success: true, message, ...data });

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (xf && typeof xf === 'string') return xf.split(',')[0].trim().slice(0, 64);
  return (req.socket?.remoteAddress || '—').slice(0, 64);
}

async function logFrontendEvent(req, res) {
  const { level, message, metadata } = req.body;
  console.log(`[FRONTEND ${level || 'INFO'}]`, message, metadata || '');

  const actor = metadata?.userAgent ? 'client' : 'client';
  const sev = String(level || 'info').toLowerCase() === 'error' ? 'medium' : 'low';
  await appendSecurityAuditLog({
    type: 'frontend_event',
    severity: sev,
    actor,
    ip: clientIp(req),
    action: String(message || 'frontend event').slice(0, 500),
    metadata: { ...(metadata || {}), url: metadata?.url },
  });

  return res.json(successResponse({}, "Log received"));
}

module.exports = { logFrontendEvent };
