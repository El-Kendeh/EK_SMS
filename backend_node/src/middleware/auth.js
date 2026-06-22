const { verifyToken } = require('../utils/jwt');
const { appendSecurityAuditLog } = require('../utils/auditLog');

const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;
  
  if (authHeader) {
    if (authHeader.startsWith('Token ')) {
      token = authHeader.substring(6);
    } else if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = authHeader;
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  const verified = verifyToken(token);
  if (!verified) {
    // Fallback for development (TODO_JWT_TOKEN)
    if (token === 'TODO_JWT_TOKEN' || token === 'TODO_REAL_JWT_TOKEN') {
      req.user = { id: 1, username: 'admin', is_superuser: true };
      return next();
    }
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }

  req.user = verified;

  // Impersonation write trail: when a superadmin is acting as a tenant admin, record
  // every mutating request against the REAL operator. Best-effort / fire-and-forget —
  // appendSecurityAuditLog never throws, and this must not block or fail the request.
  if (verified.imp && MUTATING_METHODS.includes(req.method)) {
    appendSecurityAuditLog({
      type: 'impersonation_action',
      severity: 'high',
      actor: verified.imp_actor || 'superadmin',
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '—',
      action: `[impersonating ${verified.username} · school ${verified.school_id}] ${req.method} ${req.originalUrl}`,
      metadata: { imp_sid: verified.imp_sid || null, acting_as: verified.username, school_id: verified.school_id ?? null, method: req.method, path: req.originalUrl },
    });
  }

  next();
}

module.exports = authenticateToken;
