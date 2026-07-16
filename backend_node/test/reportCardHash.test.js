const test = require('node:test');
const assert = require('node:assert');
const { reportCardContentHash } = require('../src/utils/reportCardHash');

const grades = [
  { id: 2, subject_id: 5, ca: 10, midterm: 20, final: 30, total: 60, grade_letter: 'B' },
  { id: 1, subject_id: 4, ca: 15, midterm: 25, final: 35, total: 75, grade_letter: 'A' },
];

test('hash is independent of row order', () => {
  assert.equal(reportCardContentHash(1, 1, grades), reportCardContentHash(1, 1, [...grades].reverse()));
});

test('changing a grade changes the hash (tamper detection)', () => {
  const tampered = grades.map(g => (g.id === 1 ? { ...g, total: 99 } : g));
  assert.notEqual(reportCardContentHash(1, 1, grades), reportCardContentHash(1, 1, tampered));
});

test('same content yields the same hash across calls (verify route parity)', () => {
  assert.equal(reportCardContentHash(1, 1, grades), reportCardContentHash(1, 1, [...grades]));
});
