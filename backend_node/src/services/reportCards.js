/* Shared report-card machinery — used by BOTH the parent portal (child view)
   and the student portal, so the two can never drift. Extracted verbatim from
   parentController (which pioneered the receipt/hash/PDF flow). */
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const QRCodeLib = require('qrcode');
const { Op } = require('sequelize');

const Grade = require('../models/Grade');
const Subject = require('../models/Subject');
const Term = require('../models/Term');
const AcademicYear = require('../models/AcademicYear');
const ReportCardReceipt = require('../models/ReportCardReceipt');
const { reportCardContentHash } = require('../utils/reportCardHash');

// Where the QR on a report-card PDF points. Matches utils/email.js.
const PUBLIC_VERIFY_BASE = `${(process.env.FRONTEND_URL || 'https://pruhsms.africa').replace(/\/+$/, '')}/verify`;

async function loadReportCardGrades(studentId, termId) {
  const where = { student_id: studentId, is_published: true };
  if (termId) where.term_id = termId;
  return Grade.findAll({
    where,
    include: [
      { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
      { model: Term, as: 'term', attributes: ['id', 'name', 'academic_year_id'] },
    ],
    order: [[{ model: Subject, as: 'subject' }, 'name', 'ASC']],
  });
}

// One receipt per school+student+term. The verification hash is DERIVED from
// the content hash, so an unchanged report card re-downloads to the SAME hash;
// if the published set changes, the hash (and generated_at) rotate.
async function upsertReportCardReceipt({ schoolId, studentId, termId, contentHash }) {
  const verificationHash = crypto
    .createHash('sha256')
    .update(`report_card|${schoolId}|${studentId}|${termId}|${contentHash}`)
    .digest('hex');

  let receipt = await ReportCardReceipt.findOne({
    where: { school_id: schoolId, student_id: studentId, term_id: termId },
  });
  if (!receipt) {
    receipt = await ReportCardReceipt.create({
      school_id: schoolId,
      student_id: studentId,
      term_id: termId,
      content_hash: contentHash,
      verification_hash: verificationHash,
      generated_at: new Date(),
    });
  } else if (receipt.content_hash !== contentHash) {
    await receipt.update({
      content_hash: contentHash,
      verification_hash: verificationHash,
      generated_at: new Date(),
    });
  }
  return receipt;
}

/* One card per term holding published grades, with the verification hash
   attached only while the receipt still fingerprints the CURRENT content. */
async function listReportCards(studentId, termId) {
  const grades = await loadReportCardGrades(studentId, termId);

  const yearIds = [...new Set(grades.map(g => g.term?.academic_year_id).filter(Boolean).map(Number))];
  const yearById = {};
  if (yearIds.length) {
    const years = await AcademicYear.findAll({ where: { id: { [Op.in]: yearIds } }, attributes: ['id', 'name'], raw: true });
    years.forEach(y => { yearById[Number(y.id)] = y.name; });
  }

  const terms = {};
  grades.forEach(g => {
    const tid = Number(g.term_id);
    if (!terms[tid]) {
      terms[tid] = {
        id: tid, // a "report card" is the published set for one term
        term: g.term?.name || `Term ${tid}`,
        termId: tid,
        academicYear: g.term?.academic_year_id ? (yearById[Number(g.term.academic_year_id)] || null) : null,
        subjects: [],
      };
    }
    terms[tid].subjects.push({
      id: g.id,
      subject: g.subject?.name || '—',
      subjectCode: g.subject?.code || null,
      ca: g.ca,
      midterm: g.midterm,
      finalExam: g.final,
      score: g.total,
      gradeLetter: g.grade_letter,
      remarks: g.remarks || '',
    });
  });

  const receipts = await ReportCardReceipt.findAll({ where: { student_id: studentId }, raw: true });
  const receiptByTerm = {};
  receipts.forEach(r => { receiptByTerm[Number(r.term_id)] = r; });

  const gradesByTerm = {};
  grades.forEach(g => { (gradesByTerm[Number(g.term_id)] ||= []).push(g); });

  return Object.values(terms).map(t => {
    const scores = t.subjects.map(s => s.score).filter(v => v != null);
    const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : null;
    const receipt = receiptByTerm[Number(t.termId)];
    const currentHash = reportCardContentHash(studentId, t.termId, gradesByTerm[Number(t.termId)] || []);
    const isVerified = !!(receipt && receipt.content_hash === currentHash);
    return {
      ...t,
      average,
      grade: null,             // no school-configured overall letter scheme yet
      position: null,          // per-term class ranking not computed yet
      totalStudents: null,
      isVerified,
      verificationHash: isVerified ? receipt.verification_hash : null,
      verifiedAt: isVerified ? receipt.generated_at : null,
    };
  });
}

const fmtScore = (v) => (v == null ? '—' : String(Math.round(v * 10) / 10));

/* Streams the tamper-evident PDF into `res` (headers included).
   Caller resolves+authorizes the student first. */
async function streamReportCardPdf(res, { student, school, grades, termId }) {
  const studentId = Number(student.id);
  const contentHash = reportCardContentHash(studentId, termId, grades);
  const receipt = await upsertReportCardReceipt({
    schoolId: Number(student.school_id),
    studentId,
    termId: Number(termId),
    contentHash,
  });
  const verifyUrl = `${PUBLIC_VERIFY_BASE}/${receipt.verification_hash}`;
  const qrPng = await QRCodeLib.toBuffer(verifyUrl, { margin: 1, width: 110 });

  const u = student.user || {};
  const studentName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || `Student #${studentId}`;
  const termName = grades[0]?.term?.name || `Term ${termId}`;
  const scores = grades.map(g => g.total).filter(v => v != null);
  const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : null;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition',
    `attachment; filename="report-card-${String(studentName).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${String(termName).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf"`);

  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  doc.pipe(res);

  // ── Header ──
  doc.font('Helvetica-Bold').fontSize(18).text(school?.name || 'EK-SMS School', { align: 'center' });
  if (school?.address) doc.font('Helvetica').fontSize(9).fillColor('#555').text(school.address, { align: 'center' });
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#000').text('STUDENT REPORT CARD', { align: 'center' });
  doc.font('Helvetica').fontSize(10).fillColor('#333').text(termName, { align: 'center' });
  doc.moveDown(0.8);

  // ── Student block ──
  const infoY = doc.y;
  doc.font('Helvetica').fontSize(10).fillColor('#000');
  doc.text(`Student: ${studentName}`, 48, infoY);
  doc.text(`Class: ${student?.classroom?.name || '—'}`, 48, infoY + 14);
  doc.text(`Admission No: ${student?.admission_number || '—'}`, 300, infoY);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 300, infoY + 14);
  doc.y = infoY + 34;

  // ── Grades table ──
  const cols = [
    { label: 'Subject', x: 48,  w: 190, align: 'left'  },
    { label: 'CA',      x: 238, w: 55,  align: 'right' },
    { label: 'Midterm', x: 293, w: 60,  align: 'right' },
    { label: 'Final',   x: 353, w: 55,  align: 'right' },
    { label: 'Total',   x: 408, w: 55,  align: 'right' },
    { label: 'Grade',   x: 463, w: 80,  align: 'center' },
  ];
  let y = doc.y + 6;
  doc.rect(48, y - 4, 495, 20).fill('#1a2b4a');
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#fff');
  cols.forEach(c => doc.text(c.label, c.x + 4, y, { width: c.w - 8, align: c.align }));
  y += 20;

  doc.font('Helvetica').fontSize(9);
  grades.forEach((g, i) => {
    if (y > 720) { doc.addPage(); y = 60; }
    if (i % 2 === 0) doc.rect(48, y - 4, 495, 18).fill('#f2f4f8');
    doc.fillColor('#000');
    const cells = [
      `${g.subject?.name || '—'}${g.subject?.code ? ` (${g.subject.code})` : ''}`,
      fmtScore(g.ca), fmtScore(g.midterm), fmtScore(g.final), fmtScore(g.total),
      g.grade_letter || '—',
    ];
    cells.forEach((text, ci) => doc.text(text, cols[ci].x + 4, y, { width: cols[ci].w - 8, align: cols[ci].align }));
    y += 18;
  });

  // ── Summary ──
  y += 10;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#000')
    .text(`Term average: ${average == null ? '—' : `${average}%`}   ·   Subjects: ${grades.length}`, 48, y);
  y += 26;

  // ── Verification footer ──
  if (y > 640) { doc.addPage(); y = 60; }
  doc.rect(48, y, 495, 96).lineWidth(0.8).stroke('#aab3c5');
  doc.image(qrPng, 58, y + 10, { width: 76, height: 76 });
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#000').text('Verify this document', 148, y + 12);
  doc.font('Helvetica').fontSize(8).fillColor('#333').text(
    `Scan the QR code or visit ${PUBLIC_VERIFY_BASE}/<code> with the code below. ` +
    'If the published grades are ever altered, this code stops verifying — that is the tamper protection working.',
    148, y + 26, { width: 380 });
  doc.font('Courier').fontSize(7.5).fillColor('#000').text(receipt.verification_hash, 148, y + 62, { width: 380 });

  doc.end();
}

module.exports = {
  PUBLIC_VERIFY_BASE,
  loadReportCardGrades,
  upsertReportCardReceipt,
  listReportCards,
  streamReportCardPdf,
};
