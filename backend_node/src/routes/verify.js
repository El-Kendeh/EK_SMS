const express = require('express');
const router = express.Router();
const GradeReceipt = require('../models/GradeReceipt');
const ReportCardReceipt = require('../models/ReportCardReceipt');
const Student = require('../models/Student');
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
    if (!rec) {
      // Fallback: parent-facing report-card receipts share the same public
      // verify surface (hash printed + QR-encoded on the report-card PDF).
      const rc = await ReportCardReceipt.findOne({ where: { verification_hash: hash } });
      if (!rc) return res.json({ valid: false, reason: 'No matching record was found in the ledger.' });

      // Tamper evidence: recompute the fingerprint of the CURRENTLY published
      // grade set. If it no longer matches the receipt, the printed document
      // no longer reflects the school's records — report it invalid.
      const Grade = require('../models/Grade');
      const { reportCardContentHash } = require('../utils/reportCardHash');
      const currentGrades = await Grade.findAll({
        where: { student_id: rc.student_id, term_id: rc.term_id, is_published: true },
        attributes: ['id', 'subject_id', 'ca', 'midterm', 'final', 'total', 'grade_letter'],
        raw: true,
      });
      const currentHash = reportCardContentHash(rc.student_id, rc.term_id, currentGrades);
      if (currentHash !== rc.content_hash) {
        return res.json({
          valid: false,
          type: 'report_card',
          reason: 'The published grades no longer match this document — it may be outdated or altered. Ask the school for a freshly issued report card.',
        });
      }

      const [rcSchool, rcStudent, rcTerm] = await Promise.all([
        School.findByPk(rc.school_id).catch(() => null),
        Student.findByPk(rc.student_id, {
          include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }],
        }).catch(() => null),
        Term.findByPk(rc.term_id).catch(() => null),
      ]);
      const studentName = rcStudent?.user
        ? `${rcStudent.user.first_name || ''} ${rcStudent.user.last_name || ''}`.trim()
        : `Student #${rc.student_id}`;

      return res.json({
        valid: true,
        type: 'report_card',
        signedBy: rcSchool?.name || 'EK-SMS school',
        student: studentName,
        // Admission number is a record identifier used elsewhere and is not
        // needed to confirm authenticity — omit it from the public payload.
        studentNumber: '—',
        term: rcTerm?.name || '—',
        academicYear: '',
        average: null,
        signedAt: rc.generated_at,
        chainPosition: null,
        chainTip: null,
        note: 'Report card verified: the published grades still match this document exactly. If grades were altered after printing, this code would no longer verify.',
      });
    }

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
