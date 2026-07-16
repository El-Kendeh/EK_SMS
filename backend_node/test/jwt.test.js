process.env.JWT_SECRET = 'test-secret-1234567890';
const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const { generateToken, verifyToken } = require('../src/utils/jwt');

test('generate → verify round trip preserves identity + tenant claims', () => {
  const t = generateToken({ id: 7, username: 'ada', role: 'teacher', school_id: 3 });
  const v = verifyToken(t);
  assert.equal(v.id, 7);
  assert.equal(v.role, 'teacher');
  assert.equal(v.school_id, 3);
});

test('tampered token is rejected', () => {
  const t = generateToken({ id: 1, username: 'x', role: 'student' });
  assert.equal(verifyToken(t.slice(0, -3) + 'aaa'), null);
});

test('token signed with a different secret is rejected (C1: no forged superadmin)', () => {
  const forged = jwt.sign({ id: 1, role: 'superadmin' }, 'attacker-guess', { expiresIn: '1h' });
  assert.equal(verifyToken(forged), null);
});

test('expired token is rejected', () => {
  const expired = jwt.sign({ id: 1, role: 'student' }, 'test-secret-1234567890', { expiresIn: -10 });
  assert.equal(verifyToken(expired), null);
});
