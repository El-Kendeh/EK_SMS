const crypto = require('crypto');

/**
 * Canonical fingerprint of a published report card (one student, one term).
 * Sorted by grade id so row ordering can never change the hash. Used by BOTH
 * the parent PDF generator (to mint receipts) and the public verify route
 * (to prove the published set still matches the printed document) — keep the
 * payload identical in both places or verification breaks.
 */
function reportCardContentHash(studentId, termId, grades) {
  const canonical = JSON.stringify({
    type: 'report_card',
    student_id: Number(studentId),
    term_id: Number(termId),
    grades: grades
      .map(g => ({
        id: Number(g.id),
        subject_id: Number(g.subject_id),
        ca: g.ca ?? null,
        midterm: g.midterm ?? null,
        final: g.final ?? null,
        total: g.total ?? null,
        grade_letter: g.grade_letter || null,
      }))
      .sort((a, b) => a.id - b.id),
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

module.exports = { reportCardContentHash };
