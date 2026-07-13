/* Real TOTP 2FA (SA-46) — shared by the superadmin wizard, the student
   profile toggle, and the login gate. RFC-6238 via otplib v13 (functional
   API, default noble/scure plugins); QR via the already-installed qrcode
   lib. Recovery codes: 8 one-time codes, stored as sha256 hashes, burned
   on use. */
const crypto = require('crypto');
const { generateSecret, verify, generateURI } = require('otplib');
const QRCodeLib = require('qrcode');

// Accept ±30s of clock drift (one TOTP step) — standard authenticator UX.
const EPOCH_TOLERANCE = 30;

const hash = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

/* otplib v13 throws on malformed tokens (wrong length/charset) instead of
   returning {valid:false} — normalise both to a boolean. */
async function totpValid(secret, token) {
  try {
    const r = await verify({ secret, token: String(token), epochTolerance: EPOCH_TOLERANCE });
    return !!r.valid;
  } catch {
    return false;
  }
}

function generateRecoveryCodes(n = 8) {
  // 6 bytes → 12 hex chars → three 4-char groups = 48 bits of entropy.
  // (The old randomBytes(5) + /.{4}/g silently dropped the last 2 hex chars,
  //  leaving only 32 bits; the trailing slice(0,14) was dead.)
  return Array.from({ length: n }, () =>
    crypto.randomBytes(6).toString('hex').toUpperCase().match(/.{4}/g).join('-')
  );
}

/* Begin enrolment: new secret + otpauth URI + QR data-URL + recovery codes.
   Secret/codes are persisted but 2FA stays DISABLED until verifyAndEnable. */
async function beginEnrolment(user, issuer = 'EK-SMS') {
  const secret = generateSecret();
  const label = user.email || user.username;
  const otpauth = generateURI({ issuer, label, secret });
  const qrDataUrl = await QRCodeLib.toDataURL(otpauth, { margin: 1, width: 220 });
  const recoveryCodes = generateRecoveryCodes();

  await user.update({
    two_factor_secret: secret,
    two_factor_recovery: JSON.stringify(recoveryCodes.map(hash)),
    two_factor_enabled: false,
  });

  return { otpauth, qrDataUrl, recoveryCodes, secret };
}

/* First valid code proves the authenticator is set up → enable. */
async function verifyAndEnable(user, code) {
  if (!user.two_factor_secret) return { ok: false, reason: 'No enrolment in progress' };
  if (!(await totpValid(user.two_factor_secret, String(code || '').trim()))) {
    return { ok: false, reason: 'Invalid code' };
  }
  await user.update({ two_factor_enabled: true });
  return { ok: true };
}

async function disable(user) {
  await user.update({ two_factor_enabled: false, two_factor_secret: null, two_factor_recovery: null });
}

/* Login-time check: TOTP first, then recovery codes (burn on use). */
async function checkLoginCode(user, code) {
  const c = String(code || '').trim();
  if (!c) return { ok: false };
  if (user.two_factor_secret && (await totpValid(user.two_factor_secret, c))) {
    return { ok: true, method: 'totp' };
  }
  let stored = [];
  try { stored = JSON.parse(user.two_factor_recovery || '[]'); } catch { stored = []; }
  const h = hash(c.toUpperCase());
  if (stored.includes(h)) {
    await user.update({ two_factor_recovery: JSON.stringify(stored.filter(x => x !== h)) });
    return { ok: true, method: 'recovery', remaining: stored.length - 1 };
  }
  return { ok: false };
}

module.exports = { beginEnrolment, verifyAndEnable, disable, checkLoginCode };
