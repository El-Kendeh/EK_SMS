const test = require('node:test');
const assert = require('node:assert');
const requireRole = require('../src/middleware/requireRole');
const schoolScope = require('../src/middleware/schoolScope');

function fakeRes() {
  return { code: null, body: null, status(c) { this.code = c; return this; }, json(o) { this.body = o; return this; } };
}

test('requireRole allows a listed role', () => {
  let called = false;
  requireRole(['teacher', 'school_admin'])({ user: { role: 'teacher' } }, fakeRes(), () => { called = true; });
  assert.equal(called, true);
});

test('requireRole 403s an unlisted role', () => {
  const res = fakeRes(); let called = false;
  requireRole(['school_admin'])({ user: { role: 'student' } }, res, () => { called = true; });
  assert.equal(called, false);
  assert.equal(res.code, 403);
});

test('requireRole 401s when no role present', () => {
  const res = fakeRes();
  requireRole(['school_admin'])({ user: {} }, res, () => {});
  assert.equal(res.code, 401);
});

test('schoolScope pins a tenant user to their own school', () => {
  const req = { user: { role: 'teacher', school_id: 42 }, query: {} };
  schoolScope(req, fakeRes(), () => {});
  assert.equal(req.schoolId, 42);
});

test('schoolScope blocks a tenant user from overriding school via query (cross-tenant)', () => {
  const req = { user: { role: 'teacher', school_id: 42 }, query: { school_id: '999' } };
  schoolScope(req, fakeRes(), () => {});
  assert.equal(req.schoolId, 42); // NOT 999
});

test('schoolScope lets superadmin target a school via query', () => {
  const req = { user: { role: 'superadmin', school_id: null }, query: { school_id: '7' } };
  schoolScope(req, fakeRes(), () => {});
  assert.equal(req.schoolId, 7);
});
