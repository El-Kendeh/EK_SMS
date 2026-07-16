const test = require('node:test');
const assert = require('node:assert');
const { sqlValue } = require('../scripts/backup');

test('null / undefined → NULL', () => {
  assert.equal(sqlValue(null), 'NULL');
  assert.equal(sqlValue(undefined), 'NULL');
});

test('string → single-quoted literal', () => {
  assert.equal(sqlValue('2025/2026'), "'2025/2026'");
});

test('number → bare literal', () => {
  assert.equal(sqlValue(42), '42');
});

test("string with a quote is escaped (no SQL break)", () => {
  assert.equal(sqlValue("O'Brien"), "'O\\'Brien'");
});

test('JSON-column array → ONE quoted string, not `key`=val garbage', () => {
  const out = sqlValue(['covid', 'polio']);
  assert.match(out, /^'.*'$/);          // a single string literal
  assert.ok(out.includes('covid'));
  assert.ok(!out.includes('`'));        // NOT the broken object/identifier form
});

test('JSON-column object → ONE quoted string literal', () => {
  const out = sqlValue({ mmr: true });
  assert.match(out, /^'.*'$/);
  assert.ok(!out.includes('`'));        // old mysql.escape(object) emitted `mmr` = true
});
