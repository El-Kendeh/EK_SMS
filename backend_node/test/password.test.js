const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { verifyDjangoPassword } = require('../src/utils/password');

function djangoHash(pw, salt = 'saltysalt', iter = 50000) {
  const h = crypto.pbkdf2Sync(pw, salt, iter, 32, 'sha256').toString('base64');
  return `pbkdf2_sha256$${iter}$${salt}$${h}`;
}

test('correct password verifies', () => {
  assert.equal(verifyDjangoPassword('hunter2', djangoHash('hunter2')), true);
});

test('wrong password fails', () => {
  assert.equal(verifyDjangoPassword('nope', djangoHash('hunter2')), false);
});

test('malformed / non-pbkdf2 hash fails closed', () => {
  assert.equal(verifyDjangoPassword('x', 'not-a-hash'), false);
  assert.equal(verifyDjangoPassword('x', ''), false);
  assert.equal(verifyDjangoPassword('x', null), false);
});
