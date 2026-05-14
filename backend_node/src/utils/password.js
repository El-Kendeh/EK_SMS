const crypto = require('crypto');

/**
 * Verifies a Django-style PBKDF2 SHA256 password hash.
 * Format: pbkdf2_sha256$<iterations>$<salt>$<hash>
 */
function verifyDjangoPassword(password, encoded) {
  if (!encoded || !encoded.startsWith('pbkdf2_sha256$')) {
    return false;
  }

  const parts = encoded.split('$');
  if (parts.length !== 4) return false;

  const iterations = parseInt(parts[1], 10);
  const salt = parts[2];
  const hash = parts[3];

  // PBKDF2 derivation
  const derivedHash = crypto.pbkdf2Sync(
    password,
    salt,
    iterations,
    32,
    'sha256'
  );

  return derivedHash.toString('base64') === hash;
}

module.exports = {
  verifyDjangoPassword
};
