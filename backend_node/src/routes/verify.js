const express = require('express');
const router = express.Router();
const GradeReceipt = require('../models/GradeReceipt');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const School = require('../models/School');
const Subject = require('../models/Subject');
const Term = require('../models/Term');

// Public, UNAUTHENTICATED verification of a grade-submission receipt by its hash
// (scanned from the receipt QR at /verify/<hash>). Mounted without auth middleware so
// a third party can verify without an account. Returns only what's needed to confirm
// authenticity — no per-student PII. Audit #87.
router.get('/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const rec = await GradeReceipt.findOne({ where: { verification_hash: hash } });
    if (!rec) return res.json({ valid: false, reason: 'No matching record was found in the ledger.' });

    const [school, teacher, subject, term, tip] = await Promise.all([
      School.findByPk(rec.school_id).catch(() => null),
      rec.teacher_id ? Teacher.findByPk(rec.teacher_id).catch(() => null) : null,
      rec.subject_id ? Subject.findByPk(rec.subject_id).catch(() => null) : null,
      rec.term_id ? Term.findByPk(rec.term_id).catch(() => null) : null,
      GradeReceipt.findOne({ where: { school_id: rec.school_id }, order: [['chain_position', 'DESC']] }).catch(() => null),
    ]);
    let teacherName = 'A teacher';
    if (teacher && teacher.user_id) {
      const u = await User.findByPk(teacher.user_id).catch(() => null);
      if (u) teacherName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || teacherName;
    }

    return res.json({
      valid: true,
      signedBy: `${teacherName}${school && school.name ? ' · ' + school.name : ''}`,
      student: `Grade batch — ${subject && subject.name ? subject.name : 'subject'}`,
      studentNumber: `${rec.count} grades`,
      term: (term && term.name) || '—',
      academicYear: '',
      average: rec.average,
      signedAt: rec.submitted_at,
      chainPosition: rec.chain_position,
      chainTip: (tip && tip.chain_position) || rec.chain_position,
    });
  } catch (err) {
    console.error('verify Error:', err);
    return res.status(500).json({ valid: false, reason: 'Verification service error.' });
  }
});

module.exports = router;
