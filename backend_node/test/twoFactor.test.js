const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { checkLoginCode } = require('../src/services/twoFactor');

const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
function fakeUser(recoveryCodes) {
  return {
    two_factor_secret: null, // force the recovery-code path (TOTP is otplib's concern)
    two_factor_recovery: JSON.stringify(recoveryCodes.map(c => sha(c))),
    async update(fields) { Object.assign(this, fields); },
  };
}

test('valid recovery code is accepted (case-insensitive) and burned on use', async () => {
  const u = fakeUser(['AAAA-BBBB-CCCC']);
  const first = await checkLoginCode(u, 'aaaa-bbbb-cccc');
  assert.equal(first.ok, true);
  assert.equal(first.method, 'recovery');
  // Replay protection: the same code must not work a second time.
  const replay = await checkLoginCode(u, 'AAAA-BBBB-CCCC');
  assert.equal(replay.ok, false);
});

test('unknown code is rejected', async () => {
  assert.equal((await checkLoginCode(fakeUser(['AAAA-BBBB-CCCC']), 'ZZZZ-ZZZZ-ZZZZ')).ok, false);
});

test('empty code is rejected', async () => {
  assert.equal((await checkLoginCode(fakeUser(['AAAA-BBBB-CCCC']), '')).ok, false);
});
