const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const QRCodeLib = require('qrcode');
const sequelize = require('../config/db');
const School = require('../models/School');
const ReportCardReceipt = require('../models/ReportCardReceipt');
const Student = require('../models/Student');
const User = require('../models/User');
const Class = require('../models/Class');
const ClassSubject = require('../models/ClassSubject');
const Grade = require('../models/Grade');
const Term = require('../models/Term');
const AcademicYear = require('../models/AcademicYear');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const Teacher = require('../models/Teacher');
const Notification = require('../models/Notification');
const SecurityAuditLog = require('../models/SecurityAuditLog');
const GradeEvent = require('../models/GradeEvent');
const GradeReceipt = require('../models/GradeReceipt');
const { mapGradeEvents } = require('../utils/gradeHistory');
const Fee = require('../models/Fee');
const Payment = require('../models/Payment');
const FeeCategory = require('../models/FeeCategory');
const BehaviourIncident = require('../models/BehaviourIncident');
const ModificationRequest = require('../models/ModificationRequest');
const ChannelPreference = require('../models/ChannelPreference');
const WhistleblowerCategory = require('../models/WhistleblowerCategory');
const WhistleblowerReport = require('../models/WhistleblowerReport');
const ConferenceSlot = require('../models/ConferenceSlot');
const Message = require('../models/Message');
const CoGuardian = require('../models/CoGuardian');
const PickupPerson = require('../models/PickupPerson');
const PermissionSlip = require('../models/PermissionSlip');
const PermissionSlipSignature = require('../models/PermissionSlipSignature');
const Acknowledgment = require('../models/Acknowledgment');
const DonationCampaign = require('../models/DonationCampaign');
const Donation = require('../models/Donation');
const { requireRoleId } = require('../utils/roleIds');

const successResponse = (data = {}, message = 'Success') => ({ success: true, message, ...data });
const errorResponse = (message) => ({ success: false, message });

const fullName = (u) => (u ? (`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || null) : null);
const initialsOf = (name) => (name || '').split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || null;
const jsonBytes = (obj) => Buffer.byteLength(JSON.stringify(obj || {}), 'utf8');

async function getParentStudentIds(req) {
  const coGuardians = await CoGuardian.findAll({
    where: { guardian_user_id: req.user.id, status: 'active' },
    attributes: ['student_id'],
  });
  const guardianStudentIds = coGuardians.map(cg => cg.student_id);

  // Trusted links first: the parent's own account + active co-guardian rows.
  const primary = await Student.findAll({
    where: {
      [Op.or]: [
        { user_id: req.user.id },
        ...(guardianStudentIds.length ? [{ id: { [Op.in]: guardianStudentIds } }] : []),
      ],
      status: 'active',
    },
    attributes: ['id', 'school_id'],
  });
  const ids = new Set(primary.map(s => Number(s.id)));

  // Phone fallback is LEGACY linkage (father/mother/emergency phone on the
  // student row). Phone numbers are not unique across tenants, and parent
  // tokens carry no school_id — so it MUST be scoped to a school the parent is
  // already linked to, or a shared/reused number leaks another school's
  // children. No anchor school => no phone matching at all.
  const phone = (req.user.phone || '').trim();
  const anchorSchoolIds = [...new Set(primary.map(s => Number(s.school_id)).filter(Boolean))];
  if (phone && anchorSchoolIds.length) {
    const byPhone = await Student.findAll({
      where: {
        school_id: { [Op.in]: anchorSchoolIds },
        status: 'active',
        [Op.or]: [{ father_phone: phone }, { mother_phone: phone }, { emergency_phone: phone }],
      },
      attributes: ['id'],
    });
    byPhone.forEach(s => ids.add(Number(s.id)));
  }
  return [...ids];
}

// users has no school_id column, so a parent token may carry none — writes
// that stamped `req.user.school_id || 0` FK-violated for such parents. Resolve
// the family's school from the first linked child instead; cached per request.
async function resolveParentSchoolId(req) {
  if (req._parentSchoolId !== undefined) return req._parentSchoolId;
  let sid = Number(req.schoolId || req.user.school_id) || null;
  if (!sid) {
    const ids = await getParentStudentIds(req);
    if (ids.length) {
      const s = await Student.findByPk(ids[0], { attributes: ['school_id'] });
      sid = s ? Number(s.school_id) : null;
    }
  }
  req._parentSchoolId = sid;
  return sid;
}

// Shared ownership guard: 403 unless :childId belongs to the requesting parent.
async function assertOwnChild(req, res, childId) {
  const studentIds = await getParentStudentIds(req);
  if (!studentIds.includes(Number(childId))) {
    res.status(403).json(errorResponse('Access denied'));
    return null;
  }
  return studentIds;
}

/* ─── Children ──────────────────────────────────────────────────────────── */

async function getChildren(req, res) {
  try {
    if (!req.user) return res.status(401).json(errorResponse('Not authenticated'));

    const me = await User.findByPk(req.user.id, { attributes: ['id', 'username', 'first_name', 'last_name', 'email', 'phone'] });
    const parent = {
      id: req.user.id,
      fullName: fullName(me) || req.user.username,
      email: me?.email ?? req.user.email ?? null,
      phone: me?.phone ?? null,
    };

    const studentIds = await getParentStudentIds(req);
    if (!studentIds.length) return res.json(successResponse({ children: [], parent }));

    // Relationship labels come from active co-guardian links (when present).
    const coRows = await CoGuardian.findAll({
      where: { guardian_user_id: req.user.id, status: 'active', student_id: { [Op.in]: studentIds } },
      attributes: ['student_id', 'relationship'],
    });
    const relByStudent = {};
    coRows.forEach(r => { if (r.relationship) relByStudent[Number(r.student_id)] = r.relationship; });

    const students = await Student.findAll({
      where: { id: { [Op.in]: studentIds } },
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'first_name', 'last_name', 'email'] },
        { model: Class, as: 'classroom', attributes: ['id', 'name'] },
      ],
    });

    // Real per-child aggregates (approved grades + attendance). Null = no data.
    const [gradeRows, attRows] = await Promise.all([
      Grade.findAll({
        where: { student_id: { [Op.in]: studentIds }, approval_status: 'approved' },
        attributes: ['student_id', 'subject_id', 'total'],
        raw: true,
      }),
      Attendance.findAll({
        where: { student_id: { [Op.in]: studentIds } },
        attributes: ['student_id', 'status'],
        raw: true,
      }),
    ]);

    const gradesByStudent = {};
    gradeRows.forEach(g => { (gradesByStudent[Number(g.student_id)] ||= []).push(g); });
    const attByStudent = {};
    attRows.forEach(a => { (attByStudent[Number(a.student_id)] ||= []).push(a); });

    // Class position: rank each child among ACTIVE classmates by average approved total.
    const classIds = [...new Set(students.map(s => s.classroom_id).filter(Boolean).map(Number))];
    const classSize = {};
    const rankByStudent = {};
    if (classIds.length) {
      const classmates = await Student.findAll({
        where: { classroom_id: { [Op.in]: classIds }, status: 'active' },
        attributes: ['id', 'classroom_id'],
        raw: true,
      });
      const byClass = {};
      classmates.forEach(c => {
        const cid = Number(c.classroom_id);
        (byClass[cid] ||= []).push(Number(c.id));
        classSize[cid] = (classSize[cid] || 0) + 1;
      });
      const allIds = classmates.map(c => Number(c.id));
      if (allIds.length) {
        const avgRows = await Grade.findAll({
          where: { student_id: { [Op.in]: allIds }, approval_status: 'approved' },
          attributes: ['student_id', [sequelize.fn('AVG', sequelize.col('total')), 'avg_total']],
          group: ['student_id'],
          raw: true,
        });
        const avgByStudent = {};
        avgRows.forEach(r => { avgByStudent[Number(r.student_id)] = Number(r.avg_total); });
        Object.values(byClass).forEach(ids => {
          const ranked = ids.filter(id => avgByStudent[id] != null).sort((a, b) => avgByStudent[b] - avgByStudent[a]);
          ranked.forEach((id, i) => { rankByStudent[id] = i + 1; });
        });
      }
    }

    const children = students.map((s, idx) => {
      const sid = Number(s.id);
      const name = fullName(s.user);
      const gs = gradesByStudent[sid] || [];
      const avg = gs.length ? Math.round((gs.reduce((sum, g) => sum + (g.total || 0), 0) / gs.length) * 10) / 10 : null;
      const passed = gs.filter(g => (g.total || 0) >= 50).length;
      const atts = attByStudent[sid] || [];
      const attRate = atts.length ? Math.round(atts.filter(a => a.status === 'present').length / atts.length * 100) : null;
      const clsId = s.classroom_id ? Number(s.classroom_id) : null;
      return {
        id: sid,
        fullName: name,
        initials: initialsOf(name),
        admissionNumber: s.admission_number || null,
        classroom: s.classroom?.name || null,
        classId: clsId,
        schoolId: Number(s.school_id),
        dateOfBirth: s.date_of_birth || null,
        gender: s.gender || null,
        status: s.status,
        passportPicture: s.passport_picture || null,
        relationship: relByStudent[sid] || 'Parent',
        program: s.student_type || null,
        // Computed academics — null when there is genuinely no data yet.
        currentAverage: avg,
        averageGrade: avg,
        trend: null, // no historical baseline stored yet — never invent one
        subjectsPassed: gs.length ? passed : null,
        totalSubjects: gs.length ? new Set(gs.map(g => Number(g.subject_id))).size : null,
        attendance: attRate,
        classPosition: rankByStudent[sid] || null,
        classRank: rankByStudent[sid] || null,
        totalStudents: (clsId && classSize[clsId]) || null,
        hasAlert: false, // per-student tamper alerts are not tracked yet
        alertMessage: null,
        colorIndex: idx,
      };
    });

    return res.json(successResponse({ children, parent }));
  } catch (err) {
    console.error('getChildren Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch children`));
  }
}

/* ─── Grades ────────────────────────────────────────────────────────────── */

async function getChildGrades(req, res) {
  try {
    const { childId } = req.params;
    const { term_id } = req.query;

    if (!(await assertOwnChild(req, res, childId))) return;

    const where = { student_id: childId, approval_status: 'approved' };
    if (term_id) where.term_id = term_id;

    const grades = await Grade.findAll({
      where,
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        { model: Term, as: 'term', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    });

    // Subject teacher names (real assignment via ClassSubject; null when unassigned).
    const teacherBySubject = {};
    const student = await Student.findByPk(childId, { attributes: ['id', 'classroom_id'] });
    if (student?.classroom_id) {
      const cs = await ClassSubject.findAll({
        where: { class_id: student.classroom_id },
        include: [{ model: Teacher, as: 'teacher', include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name', 'username'] }] }],
      });
      cs.forEach(r => {
        const n = fullName(r.teacher?.user);
        if (n) teacherBySubject[Number(r.subject_id)] = n;
      });
    }

    const formatted = grades.map(g => ({
      id: g.id,
      subjectId: g.subject_id,
      subject: g.subject?.name || '—',
      subjectCode: g.subject?.code || null,
      termId: g.term_id,
      term: g.term?.name || null,
      ca: g.ca,
      midterm: g.midterm,
      finalExam: g.final,
      score: g.total,
      gradeLetter: g.grade_letter,
      status: (g.is_published || g.is_locked) ? 'locked' : 'pending',
      remarks: g.remarks || '',
      teacher: teacherBySubject[Number(g.subject_id)] || null,
      hasAlert: false,
      alertMessage: null,
      createdAt: g.created_at,
    }));

    return res.json(successResponse({ grades: formatted }));
  } catch (err) {
    console.error('getChildGrades Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch grades`));
  }
}

async function getChildGradeHistory(req, res) {
  try {
    const { gradeId } = req.params;
    const grade = await Grade.findByPk(gradeId);
    if (!grade) return res.status(404).json(errorResponse('Grade not found'));
    // A parent may only inspect the audit trail of a grade belonging to one of their children.
    const studentIds = await getParentStudentIds(req);
    if (!studentIds.map(String).includes(String(grade.student_id))) {
      return res.status(403).json(errorResponse('Not authorized to view this grade'));
    }

    // A grade's history is the hash-chained GradeEvent trail.
    const events = await GradeEvent.findAll({
      where: { grade_id: gradeId },
      order: [['created_at', 'ASC']],
    });

    return res.json(successResponse({ history: mapGradeEvents(events) }));
  } catch (err) {
    console.error('getChildGradeHistory Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch history`));
  }
}

async function submitModificationObjection(req, res) {
  try {
    const { childId, gradeId } = req.params;
    const reason = req.body.reason || req.body.message;
    if (!reason) return res.status(400).json(errorResponse('reason is required'));

    if (!(await assertOwnChild(req, res, childId))) return;

    let grade = null;
    if (gradeId) {
      grade = await Grade.findByPk(gradeId);
      if (!grade || String(grade.student_id) !== String(childId)) {
        return res.status(404).json(errorResponse('Grade not found for this child'));
      }
    }

    const objection = await ModificationRequest.create({
      school_id: await resolveParentSchoolId(req),
      student_id: childId,
      subject_id: grade?.subject_id || req.body.subject_id || null,
      grade_id: gradeId || null,
      requested_by: req.user.id,
      request_type: req.body.request_type || 'objection',
      reason,
      current_value: req.body.current_value || (grade?.total != null ? String(grade.total) : ''),
      requested_value: req.body.requested_value || '',
      status: 'pending',
    });

    return res.json(successResponse({ ticketId: `OBJ-${objection.id}` }, 'Objection submitted'));
  } catch (err) {
    console.error('submitModificationObjection Error:', err);
    return res.status(500).json(errorResponse(`Failed to submit objection`));
  }
}

/* ─── Report cards ──────────────────────────────────────────────────────── */

// Shared with the student portal (services/reportCards) so the two views can
// never drift — same grades loader, same receipt/hash rules, same PDF.
const {
  loadReportCardGrades,
  listReportCards,
  streamReportCardPdf,
} = require('../services/reportCards');

async function getChildReportCards(req, res) {
  try {
    const { childId } = req.params;
    const { term_id } = req.query;

    if (!(await assertOwnChild(req, res, childId))) return;

    const reportCards = await listReportCards(childId, term_id);

    const attendance = await Attendance.findAll({
      where: { student_id: childId },
      attributes: ['status'],
    });
    const totalAttendance = attendance.length;
    const presentCount = attendance.filter(a => a.status === 'present').length;
    const attendanceRate = totalAttendance ? Math.round(presentCount / totalAttendance * 100) : null;

    return res.json(successResponse({ reportCards, attendanceRate, attendance_rate: attendanceRate }));
  } catch (err) {
    console.error('getChildReportCards Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch report cards`));
  }
}

async function downloadChildReportCard(req, res) {
  try {
    const { childId, reportCardId } = req.params;
    // A report card is the published grade set of ONE term; the FE passes the
    // term id as :reportCardId (see getChildReportCards).
    const termId = reportCardId || req.query.term_id || null;

    if (!(await assertOwnChild(req, res, childId))) return;
    if (!termId) return res.status(400).json(errorResponse('term id is required'));

    const grades = await loadReportCardGrades(childId, termId);
    if (grades.length === 0) {
      return res.status(404).json(errorResponse('Report card not found'));
    }

    const student = await Student.findByPk(childId, {
      include: [
        { model: User, as: 'user', attributes: ['first_name', 'last_name'] },
        { model: Class, as: 'classroom', attributes: ['name'] },
      ],
    });
    const school = await School.findByPk(student?.school_id).catch(() => null);

    // Same tamper-evident PDF the student portal streams (shared service).
    await streamReportCardPdf(res, { student, school, grades, termId });
  } catch (err) {
    console.error('downloadChildReportCard Error:', err);
    if (!res.headersSent) return res.status(500).json(errorResponse(`Failed to download`));
    try { res.end(); } catch (e) { /* stream already broken */ }
  }
}

/* ─── Child timetable (the student-dashboard connection) ────────────────── */

async function getChildTimetable(req, res) {
  try {
    const { childId } = req.params;
    if (!(await assertOwnChild(req, res, childId))) return;

    const child = await Student.findByPk(childId, {
      attributes: ['id', 'classroom_id'],
      include: [{ model: Class, as: 'classroom', attributes: ['name'] }],
    });
    if (!child) return res.status(404).json(errorResponse('Child not found'));

    // SAME builder the student dashboard uses — the parent sees exactly what
    // the child sees; the two views cannot drift.
    const { buildClassTimetable } = require('../services/timetableView');
    const timetable = await buildClassTimetable(child.classroom_id);
    const hasSlots = Object.values(timetable).some(day => day.length > 0);

    return res.json(successResponse({
      timetable,
      className: child.classroom?.name || null,
      hasData: hasSlots,
    }));
  } catch (err) {
    console.error('getChildTimetable Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch timetable`));
  }
}

/* ─── Notifications ─────────────────────────────────────────────────────── */

function parentNotificationScope(req, schoolId) {
  return {
    [Op.or]: [
      { user_id: req.user.id },
      // Global notices only from the parent's OWN school — never cross-tenant.
      // schoolId comes from resolveParentSchoolId (token OR first linked child);
      // 0 matches nothing when the parent has no school at all.
      { user_id: null, school_id: schoolId || 0 },
    ],
  };
}

async function getParentNotifications(req, res) {
  try {
    if (!req.user) return res.status(401).json(errorResponse('Not authenticated'));

    const { limit } = req.query;
    const query = {
      where: parentNotificationScope(req, await resolveParentSchoolId(req)),
      order: [['created_at', 'DESC']],
    };
    if (limit) query.limit = parseInt(limit, 10);

    const notifications = await Notification.findAll(query);

    const formatted = notifications.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: !!n.is_read,
      is_read: !!n.is_read,
      createdAt: n.created_at,
      childId: null,   // notifications are not attributed to a student yet
      childName: null,
    }));

    // Unread badge counts only the parent's OWN unread rows — school-wide
    // notices (user_id: null) are shared and can't be marked read per-user, so
    // counting them would leave the badge stuck forever.
    const unread = await Notification.count({
      where: { user_id: req.user.id, is_read: false },
    });

    return res.json(successResponse({ notifications: formatted, unread }));
  } catch (err) {
    console.error('getParentNotifications Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch notifications`));
  }
}

async function markParentNotificationRead(req, res) {
  try {
    const { notification_id, mark_all } = req.body;
    if (mark_all) {
      await Notification.update({ is_read: true }, { where: { user_id: req.user.id } });
    } else if (notification_id) {
      // Only the parent's own rows — never mark another user's notification.
      await Notification.update({ is_read: true }, { where: { id: notification_id, user_id: req.user.id } });
    }
    return res.json(successResponse({}, 'Notification marked as read'));
  } catch (err) {
    console.error('markParentNotificationRead Error:', err);
    return res.status(500).json(errorResponse(`Failed to mark notification`));
  }
}

/* ─── Profile + 2FA ─────────────────────────────────────────────────────── */

function serializeProfile(u) {
  return {
    id: u.id,
    username: u.username,
    firstName: u.first_name || '',
    lastName: u.last_name || '',
    fullName: fullName(u),
    email: u.email || null,
    phone: u.phone || null,
    relationship: 'Parent / Guardian',
    linkedSince: u.created_at || null,
    twoFactorEnabled: false,   // no TOTP infrastructure yet — never claim otherwise
    twoFactorAvailable: false,
  };
}

async function getParentProfile(req, res) {
  try {
    if (!req.user) return res.status(401).json(errorResponse('Not authenticated'));
    // req.user is the JWT payload (possibly stale) — read the real row.
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json(errorResponse('User not found'));
    return res.json(successResponse({ profile: serializeProfile(user) }));
  } catch (err) {
    console.error('getParentProfile Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch profile`));
  }
}

async function updateParentProfile(req, res) {
  try {
    if (!req.user) return res.status(401).json(errorResponse('Not authenticated'));

    // req.user is a plain JWT payload, NOT a model instance — load the row.
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json(errorResponse('User not found'));

    const patch = {};
    ['first_name', 'last_name', 'phone', 'email'].forEach(k => {
      const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      const v = req.body[k] !== undefined ? req.body[k] : req.body[camel];
      if (v !== undefined) patch[k] = v === '' ? null : v;
    });
    if (!Object.keys(patch).length) {
      return res.status(400).json(errorResponse('Nothing to update'));
    }

    try {
      await user.update(patch);
    } catch (e) {
      if (e.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json(errorResponse('That email is already in use'));
      }
      throw e;
    }

    return res.json(successResponse({ profile: serializeProfile(user) }, 'Profile updated'));
  } catch (err) {
    console.error('updateParentProfile Error:', err);
    return res.status(500).json(errorResponse(`Failed to update profile`));
  }
}

// 2FA has no TOTP secret storage or OTP verification yet. Be honest about it:
// report available:false and never flip any state.
async function get2FASetup(req, res) {
  return res.json(successResponse({
    available: false,
    enabled: false,
    qr_code: null,
    setup_uri: null,
  }, 'Two-factor authentication is not available yet'));
}

async function set2FA(req, res) {
  return res.status(200).json({
    success: false,
    available: false,
    enabled: false,
    message: 'Two-factor authentication is not available yet',
  });
}

/* ─── Attendance ────────────────────────────────────────────────────────── */

const ATT_TITLES = {
  present: 'Marked present',
  absent: 'Marked absent',
  late: 'Late arrival',
  excused: 'Excused absence',
};

async function getChildAttendance(req, res) {
  try {
    const { childId } = req.params;
    const { month } = req.query;

    if (!(await assertOwnChild(req, res, childId))) return;

    const base = month ? new Date(month) : new Date();
    if (isNaN(base.getTime())) return res.status(400).json(errorResponse('Invalid month'));
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
    const today = new Date();

    const rows = await Attendance.findAll({
      where: { student_id: childId, date: { [Op.between]: [start, end] } },
      order: [['date', 'ASC']],
    });

    const byDay = {};
    rows.forEach(r => { byDay[new Date(r.date).getDate()] = r; });

    const total = rows.length;
    const present = rows.filter(a => a.status === 'present').length;
    const absent = rows.filter(a => a.status === 'absent').length;
    const late = rows.filter(a => a.status === 'late').length;
    const excused = rows.filter(a => a.status === 'excused').length;
    const rate = total ? Math.round(present / total * 100) : 0;

    // Calendar cells: Monday-first grid, leading blanks, one cell per day.
    const daysInMonth = end.getDate();
    const offset = (start.getDay() + 6) % 7; // JS Sunday=0 → Monday-first
    const calendar = [];
    for (let i = 0; i < offset; i++) calendar.push({ day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const rec = byDay[d];
      const dateObj = new Date(start.getFullYear(), start.getMonth(), d);
      const dow = dateObj.getDay();
      let status;
      if (rec) status = rec.status;
      else if (dow === 0 || dow === 6) status = 'weekend';
      else if (dateObj > today) status = 'future';
      else status = 'none'; // school day with no record — shown neutrally, never invented
      calendar.push({ day: d, status });
    }

    const logs = [...rows].reverse().map(a => ({
      id: a.id,
      date: a.date,
      status: a.status,
      title: ATT_TITLES[a.status] || `Marked ${a.status}`,
      detail: a.remarks || '',
      method: null, // capture method (biometric/manual) is not recorded yet
    }));

    return res.json(successResponse({
      month: start.toLocaleString('en-GB', { month: 'long', year: 'numeric' }),
      monthStart: start.toISOString().slice(0, 10),
      stats: { total, present, absent, late, excused, rate, percentage: rate },
      calendar,
      logs,
    }));
  } catch (err) {
    console.error('getChildAttendance Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch attendance`));
  }
}

/* ─── Behaviour ─────────────────────────────────────────────────────────── */

function mapIncidentType(t) {
  const v = String(t || '').toLowerCase();
  if (v.includes('commend') || v.includes('positive') || v.includes('merit') || v.includes('award')) return 'commendation';
  if (v.includes('policy') || v.includes('uniform') || v.includes('minor')) return 'policy_violation';
  if (v) return 'disciplinary';
  return 'note';
}

async function getChildBehavior(req, res) {
  try {
    const { childId } = req.params;
    if (!(await assertOwnChild(req, res, childId))) return;

    const incidents = await BehaviourIncident.findAll({
      where: { student_id: childId },
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    // Resolve reporter names (reported_by = user id) in one query.
    const reporterIds = [...new Set(incidents.map(i => i.reported_by).filter(Boolean).map(Number))];
    const reporterById = {};
    if (reporterIds.length) {
      const users = await User.findAll({ where: { id: { [Op.in]: reporterIds } }, attributes: ['id', 'first_name', 'last_name', 'username'] });
      users.forEach(u => { reporterById[Number(u.id)] = fullName(u); });
    }

    const entries = incidents.map(i => ({
      id: i.id,
      studentId: i.student_id,
      type: mapIncidentType(i.incident_type),
      incidentType: i.incident_type,
      title: i.title || i.incident_type || 'Behaviour note',
      severity: i.severity || null,
      description: i.description || '',
      actionTaken: i.action_taken || null,
      followUpRequired: !!i.follow_up_required,
      followUpDate: i.follow_up_date || null,
      parentNotified: !!i.parent_notified,
      date: i.created_at,
      teacher: i.reported_by ? (reporterById[Number(i.reported_by)] || null) : null,
      teacherRole: i.reported_by ? 'Staff' : null,
      refId: `BHV-${i.id}`,
    }));

    return res.json(successResponse({ entries }));
  } catch (err) {
    console.error('getChildBehavior Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch behavior`));
  }
}

/* ─── Fees / payments / receipts ────────────────────────────────────────── */

function serializeReceipt(p) {
  return {
    id: p.id,
    receiptNumber: p.receipt_number,
    studentId: p.student_id,
    transactionId: p.fee_id || null,
    amount: p.amount,
    method: p.payment_method,
    status: p.status,
    paidAt: p.paid_at || null,
    notes: p.notes || null,
    verificationHash: p.payment_hash || null,
    paidBy: p.paid_by || null,
  };
}

async function getChildFees(req, res) {
  try {
    const { childId } = req.params;
    if (!(await assertOwnChild(req, res, childId))) return;

    const fees = await Fee.findAll({
      where: { student_id: childId },
      include: [
        { model: FeeCategory, as: 'feeCategory', attributes: ['id', 'name', 'frequency'] },
        { model: Term, as: 'term', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    });

    const payments = await Payment.findAll({
      where: { student_id: childId },
      order: [['created_at', 'DESC']],
    });

    const pendingByFee = {};
    payments.filter(p => p.status === 'pending').forEach(p => {
      if (p.fee_id) pendingByFee[Number(p.fee_id)] = (pendingByFee[Number(p.fee_id)] || 0) + (p.amount || 0);
    });

    const totalFees = fees.reduce((sum, f) => sum + (f.amount_due || 0), 0);
    const totalPaid = fees.reduce((sum, f) => sum + (f.amount_paid || 0), 0);

    const transactions = fees.map(f => {
      const balance = (f.amount_due || 0) - (f.amount_paid || 0);
      return {
        id: f.id,
        description: [f.feeCategory?.name, f.term?.name].filter(Boolean).join(' — ') || 'School fee',
        category: f.feeCategory?.name || null,
        term: f.term?.name || null,
        date: f.created_at,
        dueDate: f.due_date || null,
        amount: f.amount_due,
        discount: f.discount || 0,
        amountPaid: f.amount_paid || 0,
        balance,
        status: balance <= 0 ? 'paid' : 'pending',
        // Money the parent has initiated but the school has NOT confirmed yet.
        pendingAmount: pendingByFee[Number(f.id)] || 0,
      };
    });

    const unpaid = fees.filter(f => ((f.amount_due || 0) - (f.amount_paid || 0)) > 0 && f.due_date);
    const nextInstalmentDate = unpaid.length
      ? unpaid.map(f => new Date(f.due_date)).sort((a, b) => a - b)[0].toISOString()
      : null;

    return res.json(successResponse({
      totalFees,
      paidToDate: totalPaid,
      outstanding: totalFees - totalPaid,
      siblingDiscountPct: 0, // no sibling-discount rules configured yet
      academicYear: null,
      nextInstalmentDate,
      transactions,
      payments: payments.map(serializeReceipt),
    }));
  } catch (err) {
    console.error('getChildFees Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch fees`));
  }
}

async function getPaymentChannels(req, res) {
  try {
    return res.json(successResponse({
      channels: [
        { id: 'orange_money', label: 'Orange Money', icon: 'mobile_friendly' },
        { id: 'africell_money', label: 'Africell Money', icon: 'mobile_friendly' },
        { id: 'bank_transfer', label: 'Bank Transfer', icon: 'account_balance' },
        { id: 'card', label: 'Card Payment', icon: 'credit_card' },
      ],
    }));
  } catch (err) {
    console.error('getPaymentChannels Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch payment channels`));
  }
}

async function startPayment(req, res) {
  try {
    const { child_id, transaction_id, amount, channel_id, instalments } = req.body;
    if (!child_id || !amount) return res.status(400).json(errorResponse('child_id and amount are required'));
    if (!(Number(amount) > 0)) return res.status(400).json(errorResponse('amount must be positive'));

    // Ownership: a parent can only initiate payments for their own children.
    if (!(await assertOwnChild(req, res, child_id))) return;

    // No payment gateway is connected yet, so nothing is settled here. The
    // intent is recorded as PENDING; the fee balance only moves when the
    // bursar confirms receipt (or a real gateway callback lands). Never mark
    // money as paid that no one has received.
    const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}`;
    const paymentHash = `${child_id}-${transaction_id || 'none'}-${amount}-${Date.now()}`.replace(/[^a-zA-Z0-9-]/g, '');

    let fee = null;
    if (transaction_id) {
      fee = await Fee.findOne({ where: { id: transaction_id, student_id: child_id } });
      if (!fee) return res.status(404).json(errorResponse('Fee not found for this child'));
    }

    // The payment belongs to the CHILD's school — a parent token may carry no
    // school_id at all (users has no such column), and 0 violates the FK.
    const child = await Student.findByPk(child_id, { attributes: ['id', 'school_id'] });
    if (!child) return res.status(404).json(errorResponse('Child not found'));

    const payment = await Payment.create({
      school_id: Number(child.school_id),
      student_id: child_id,
      fee_id: fee?.id || null,
      amount,
      payment_method: channel_id || 'cash',
      receipt_number: receiptNumber,
      payment_hash: paymentHash,
      status: 'pending',
      paid_by: req.user.username || 'parent',
      paid_at: null, // not paid until the school confirms — the model default is NOW, so null it explicitly
      notes: instalments && Number(instalments) > 1 ? `Instalment plan requested: ${instalments}` : null,
    });

    return res.json(successResponse({
      receipt: serializeReceipt(payment),
      redirectUrl: null,
    }, 'Payment initiated — it will reflect on the balance once the school confirms receipt'));
  } catch (err) {
    console.error('startPayment Error:', err);
    return res.status(500).json(errorResponse(`Failed to start payment`));
  }
}

async function getReceipts(req, res) {
  try {
    const { child } = req.query;

    // Same ownership set as every other child-scoped endpoint (includes
    // co-guardian links; the raw phone-match alone missed them).
    const studentIds = await getParentStudentIds(req);
    if (!studentIds.length) return res.json(successResponse({ receipts: [] }));
    const where = { student_id: { [Op.in]: studentIds } };
    if (child && studentIds.includes(Number(child))) where.student_id = Number(child);

    const payments = await Payment.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    return res.json(successResponse({ receipts: payments.map(serializeReceipt) }));
  } catch (err) {
    console.error('getReceipts Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch receipts`));
  }
}

async function downloadReceipt(req, res) {
  try {
    // Route param is :id.
    const receiptId = req.params.id || req.params.receiptId;

    const payment = await Payment.findByPk(receiptId);
    if (!payment) {
      return res.status(404).json(errorResponse('Receipt not found'));
    }

    const studentIds = await getParentStudentIds(req);
    if (!studentIds.includes(Number(payment.student_id))) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    const student = await Student.findByPk(payment.student_id, {
      include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }],
    });
    const school = await School.findByPk(payment.school_id).catch(() => null);
    const studentName = fullName(student?.user) || `Student #${payment.student_id}`;
    const isPending = payment.status !== 'completed';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="receipt-${String(payment.receipt_number || payment.id).replace(/[^a-z0-9-]+/gi, '-')}.pdf"`);

    const doc = new PDFDocument({ size: 'A5', margin: 40 });
    doc.pipe(res);

    doc.font('Helvetica-Bold').fontSize(15).text(school?.name || 'EK-SMS School', { align: 'center' });
    doc.font('Helvetica').fontSize(9).fillColor('#555').text('Payment receipt', { align: 'center' });
    doc.moveDown(1);

    // Honesty first: a parent-initiated payment is only an INTENT until the
    // school confirms receipt — never print a pending receipt as if paid.
    if (isPending) {
      doc.save();
      doc.rotate(-18, { origin: [210, 300] });
      doc.font('Helvetica-Bold').fontSize(46).fillColor('#d33').opacity(0.18)
        .text('PENDING', 60, 270, { width: 300, align: 'center' });
      doc.restore().opacity(1);
    }

    const rows = [
      ['Receipt no.', payment.receipt_number || `#${payment.id}`],
      ['Status', isPending ? 'PENDING — awaiting school confirmation' : 'COMPLETED'],
      ['Student', studentName],
      ['Amount', `L$${Number(payment.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
      ['Method', payment.payment_method || '—'],
      ['Date', payment.paid_at ? new Date(payment.paid_at).toLocaleString('en-GB') : '—'],
      ['Recorded by', payment.paid_by || '—'],
    ];
    let ry = doc.y + 4;
    doc.fontSize(10);
    rows.forEach(([k, v]) => {
      doc.font('Helvetica-Bold').fillColor('#333').text(k, 40, ry, { width: 110 });
      doc.font('Helvetica').fillColor('#000').text(String(v), 155, ry, { width: 220 });
      ry = Math.max(doc.y, ry + 16) + 2;
    });

    ry += 12;
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000').text('Reference hash', 40, ry);
    // The payment hash is a ledger reference, not (yet) publicly verifiable —
    // print it plainly without pretending there is a QR-verify flow for it.
    doc.font('Courier').fontSize(7.5).fillColor('#333').text(payment.payment_hash || '—', 40, ry + 12, { width: 340 });

    doc.end();
  } catch (err) {
    console.error('downloadReceipt Error:', err);
    if (!res.headersSent) return res.status(500).json(errorResponse(`Failed to download`));
    try { res.end(); } catch (e) { /* stream already broken */ }
  }
}

async function verifyHash(req, res) {
  try {
    // The route supplies the hash as a PATH param; keep the query fallback for
    // any legacy caller.
    const hash = req.params.hash || req.query.hash;
    const { type } = req.query;
    if (!hash) return res.status(400).json(errorResponse('hash is required'));

    if (type === 'grade') {
      const rec = await GradeReceipt.findOne({ where: { verification_hash: hash } });
      if (rec) {
        const [subject, term] = await Promise.all([
          rec.subject_id ? Subject.findByPk(rec.subject_id).catch(() => null) : null,
          rec.term_id ? Term.findByPk(rec.term_id).catch(() => null) : null,
        ]);
        return res.json(successResponse({
          valid: true,
          type: 'grade',
          data: {
            subject: subject?.name || '',
            term: term?.name || '',
            count: rec.count,
            average: rec.average,
            chain_position: rec.chain_position,
            created_at: rec.submitted_at,
          },
        }));
      }
    }

    const payment = await Payment.findOne({ where: { payment_hash: hash } });
    if (payment) {
      return res.json(successResponse({
        valid: true,
        type: 'payment',
        data: {
          receipt_number: payment.receipt_number,
          amount: payment.amount,
          method: payment.payment_method,
          paid_at: payment.paid_at,
          status: payment.status,
        },
      }));
    }

    return res.json(successResponse({ valid: false, reason: 'Hash not found' }));
  } catch (err) {
    console.error('verifyHash Error:', err);
    return res.status(500).json(errorResponse(`Failed to verify`));
  }
}

/* ─── Security widgets ──────────────────────────────────────────────────── */

async function getTamperCount(req, res) {
  try {
    // ForensicEvent has no student/school columns, so a per-child count cannot
    // be computed. Say so instead of returning a platform-wide number.
    return res.json(successResponse({
      available: false,
      total: null,
      blocked: null,
      successful: null,
    }, 'Per-student tamper analytics are not tracked yet'));
  } catch (err) {
    console.error('getTamperCount Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch tamper count`));
  }
}

async function getAccessLog(req, res) {
  try {
    const { limit } = req.query;
    // "Where I've Been" = the requesting parent's OWN access trail only. The
    // SecurityAuditLog table is platform-wide — an unscoped read here leaked
    // every school's audit events to any parent.
    const entries = await SecurityAuditLog.findAll({
      where: { actor: req.user.username || '__none__' },
      order: [['ts', 'DESC']],
      limit: Math.min(parseInt(limit, 10) || 50, 200),
    });

    const formatted = entries.map(e => ({
      id: e.id,
      type: e.type,
      severity: e.severity,
      section: e.action || e.type || 'Activity',
      device: e.ip && e.ip !== '—' ? `IP ${e.ip}` : null,
      location: null, // geo lookup not implemented
      accessedAt: e.ts,
      timestamp: e.ts,
    }));

    return res.json(successResponse({ entries: formatted }));
  } catch (err) {
    console.error('getAccessLog Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch access log`));
  }
}

/* ─── Channel preferences ───────────────────────────────────────────────── */

function serializePrefs(pref) {
  return {
    inApp: !!pref.in_app,
    push: !!pref.push,
    email: !!pref.email,
    sms: !!pref.sms,
    whatsapp: !!pref.whatsapp,
  };
}

async function getChannelPreferences(req, res) {
  try {
    let pref = await ChannelPreference.findOne({ where: { user_id: req.user.id } });
    if (!pref) {
      pref = await ChannelPreference.create({
        user_id: req.user.id,
        push: true, email: true, sms: false, in_app: true, whatsapp: false,
      });
    }
    return res.json(successResponse({ preferences: serializePrefs(pref) }));
  } catch (err) {
    console.error('getChannelPreferences Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch preferences`));
  }
}

async function updateChannelPreferences(req, res) {
  try {
    const b = req.body || {};
    const pick = (snake, camel) => (b[snake] !== undefined ? b[snake] : b[camel]);
    const patch = {
      in_app: pick('in_app', 'inApp'),
      push: b.push,
      email: b.email,
      sms: b.sms,
      whatsapp: b.whatsapp,
    };

    let pref = await ChannelPreference.findOne({ where: { user_id: req.user.id } });
    if (!pref) pref = await ChannelPreference.create({ user_id: req.user.id });
    const updates = {};
    Object.entries(patch).forEach(([k, v]) => { if (v !== undefined) updates[k] = !!v; });
    if (Object.keys(updates).length) await pref.update(updates);

    return res.json(successResponse({ preferences: serializePrefs(pref) }, 'Preferences updated'));
  } catch (err) {
    console.error('updateChannelPreferences Error:', err);
    return res.status(500).json(errorResponse(`Failed to update preferences`));
  }
}

/* ─── Whistleblower ─────────────────────────────────────────────────────── */

async function getWhistleblowerCategories(req, res) {
  try {
    const categories = await WhistleblowerCategory.findAll({
      where: { is_active: true },
      order: [['name', 'ASC']],
    });

    const formatted = categories.map(c => ({
      id: c.id,
      name: c.name,
      label: c.name,
      description: c.description,
    }));

    return res.json(successResponse({ categories: formatted }));
  } catch (err) {
    console.error('getWhistleblowerCategories Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch categories`));
  }
}

async function submitWhistleblowerReport(req, res) {
  try {
    // Accept both the FE's {category, message} and the canonical
    // {category_id, title, description}.
    const rawCategory = req.body.category_id ?? req.body.category;
    const categoryId = rawCategory != null && Number.isFinite(Number(rawCategory)) ? Number(rawCategory) : null;
    const description = req.body.description || req.body.message;
    const title = req.body.title || 'Safe report';
    const { severity, anonymous } = req.body;

    if (!description) {
      return res.status(400).json(errorResponse('A report description is required'));
    }

    const followUpKey = `WB-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

    await WhistleblowerReport.create({
      school_id: await resolveParentSchoolId(req),
      category_id: categoryId,
      title,
      description,
      severity: severity || 'medium',
      follow_up_key: followUpKey,
      status: 'received',
      reporter_type: anonymous === false ? 'parent' : 'anonymous',
    });

    return res.json(successResponse({
      ticketId: followUpKey,
      followUpKey,
      note: 'Your report reached the school compliance queue. No name, account id, IP, or device details were stored with it.',
    }, 'Report submitted'));
  } catch (err) {
    console.error('submitWhistleblowerReport Error:', err);
    return res.status(500).json(errorResponse(`Failed to submit report`));
  }
}

async function checkWhistleblowerStatus(req, res) {
  try {
    const { key } = req.params;

    const report = await WhistleblowerReport.findOne({
      where: { follow_up_key: key },
      include: [{ model: WhistleblowerCategory, as: 'category', attributes: ['name'] }],
    });

    if (!report) {
      return res.status(404).json(errorResponse('Report not found'));
    }

    return res.json(successResponse({
      ticketId: report.follow_up_key,
      status: report.status,
      category: report.category?.name || '',
      created_at: report.created_at,
      updates: [],
    }));
  } catch (err) {
    console.error('checkWhistleblowerStatus Error:', err);
    return res.status(500).json(errorResponse(`Failed to check status`));
  }
}

/* ─── Conferences ───────────────────────────────────────────────────────── */

function composeSlotTime(date, hhmm) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  if (hhmm && /^\d{1,2}:\d{2}/.test(hhmm)) {
    const [h, m] = hhmm.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  }
  return d;
}

async function getConferenceSlots(req, res) {
  try {
    const slots = await ConferenceSlot.findAll({
      where: {
        school_id: await resolveParentSchoolId(req),
        // Available slots + the parent's own bookings (so Cancel is reachable).
        [Op.or]: [
          { status: 'available' },
          { status: 'booked', parent_id: req.user.id },
        ],
      },
      order: [['date', 'ASC'], ['start_time', 'ASC']],
    });

    const teacherIds = [...new Set(slots.map(s => s.teacher_id).filter(Boolean).map(Number))];
    const teacherById = {};
    if (teacherIds.length) {
      const teachers = await Teacher.findAll({
        where: { id: { [Op.in]: teacherIds } },
        include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name', 'username'] }],
      });
      teachers.forEach(t => { teacherById[Number(t.id)] = fullName(t.user); });
    }

    const formatted = slots.map(s => {
      const start = composeSlotTime(s.date, s.start_time);
      const end = composeSlotTime(s.date, s.end_time);
      const durationMin = start && end && end > start ? Math.round((end - start) / 60000) : 30;
      const mine = s.status === 'booked' && Number(s.parent_id) === Number(req.user.id);
      return {
        id: s.id,
        start: start ? start.toISOString() : s.date,
        durationMin,
        date: s.date,
        startTime: s.start_time,
        endTime: s.end_time,
        teacher: s.teacher_id ? (teacherById[Number(s.teacher_id)] || null) : null,
        subject: null, // slots are not subject-scoped yet
        room: null,    // room assignment not recorded yet
        status: s.status,
        booked: s.status === 'booked',
        bookedBy: mine ? 'self' : (s.status === 'booked' ? 'other' : null),
        topic: mine ? (s.notes || null) : null,
      };
    });

    return res.json(successResponse({ slots: formatted }));
  } catch (err) {
    console.error('getConferenceSlots Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch conference slots`));
  }
}

async function claimConferenceSlot(req, res) {
  try {
    const { slotId } = req.params;
    const { topic } = req.body || {};

    const slot = await ConferenceSlot.findOne({
      where: { id: slotId, school_id: await resolveParentSchoolId(req), status: 'available' },
    });

    if (!slot) {
      return res.status(404).json(errorResponse('Slot not available'));
    }

    await slot.update({
      status: 'booked',
      parent_id: req.user.id,
      // Persist the discussion topic (was silently dropped before).
      notes: topic ? String(topic).slice(0, 500) : slot.notes,
    });

    return res.json(successResponse({
      id: slot.id,
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      topic: topic || null,
    }, 'Slot claimed'));
  } catch (err) {
    console.error('claimConferenceSlot Error:', err);
    return res.status(500).json(errorResponse(`Failed to claim slot`));
  }
}

async function cancelConferenceSlot(req, res) {
  try {
    const { slotId } = req.params;

    const slot = await ConferenceSlot.findOne({
      where: { id: slotId, parent_id: req.user.id, status: 'booked' },
    });

    if (!slot) {
      return res.status(404).json(errorResponse('Slot not found'));
    }

    await slot.update({
      status: 'available',
      parent_id: null,
      notes: null,
    });

    return res.json(successResponse({}, 'Slot cancelled'));
  } catch (err) {
    console.error('cancelConferenceSlot Error:', err);
    return res.status(500).json(errorResponse(`Failed to cancel slot`));
  }
}

/* ─── Counsellor ────────────────────────────────────────────────────────── */

async function getCounsellor(req, res) {
  try {
    const messages = await Message.findAll({
      where: {
        school_id: await resolveParentSchoolId(req),
        [Op.or]: [
          { sender_id: req.user.id, recipient_type: 'counsellor' },
          { recipient_id: req.user.id, sender_type: 'counsellor' },
        ],
      },
      order: [['created_at', 'ASC']],
      limit: 100,
    });

    const thread = messages.map(m => ({
      id: m.id,
      sender: Number(m.sender_id) === Number(req.user.id) ? 'parent' : 'counsellor',
      text: m.body,
      sentAt: m.created_at,
      isRead: !!m.is_read,
    }));

    return res.json(successResponse({
      counsellorName: 'School counsellor',
      availability: 'Replies in-app',
      thread,
    }));
  } catch (err) {
    console.error('getCounsellor Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch counsellor`));
  }
}

async function sendCounsellorMessage(req, res) {
  try {
    const { text, subject, anonymous } = req.body;
    if (!text) return res.status(400).json(errorResponse('text is required'));

    const message = await Message.create({
      school_id: await resolveParentSchoolId(req),
      sender_id: req.user.id,
      // Flag anonymity on the row so the counsellor view can hide the sender.
      sender_type: anonymous ? 'parent_anonymous' : 'parent',
      recipient_type: 'counsellor',
      subject: subject || (anonymous ? 'Anonymous message to counsellor' : 'Message to Counsellor'),
      body: text,
      is_read: false,
    });

    return res.json(successResponse({
      sent: {
        id: message.id,
        sender: 'parent',
        text: message.body,
        sentAt: message.created_at,
        anonymous: !!anonymous,
      },
    }, 'Message sent'));
  } catch (err) {
    console.error('sendCounsellorMessage Error:', err);
    return res.status(500).json(errorResponse(`Failed to send message`));
  }
}

/* ─── Teacher threads ───────────────────────────────────────────────────── */

async function getTeacherThreads(req, res) {
  try {
    const { childId } = req.params;
    if (!(await assertOwnChild(req, res, childId))) return;

    const student = await Student.findByPk(childId, { attributes: ['id', 'classroom_id'] });

    // Seed one thread per teacher actually teaching this child's class, so a
    // parent can start a conversation (threads used to appear only after the
    // teacher wrote first).
    const threads = {};
    if (student?.classroom_id) {
      const cs = await ClassSubject.findAll({
        where: { class_id: student.classroom_id },
        include: [
          { model: Subject, as: 'subject', attributes: ['id', 'name'] },
          { model: Teacher, as: 'teacher', include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'username'] }] },
        ],
      });
      cs.forEach(r => {
        const u = r.teacher?.user;
        if (!u) return;
        const key = `t-${u.id}`;
        if (!threads[key]) {
          threads[key] = { key, teacherId: Number(u.id), teacherName: fullName(u), subjects: [], subjectId: r.subject_id ? Number(r.subject_id) : null, unread: 0, messages: [] };
        }
        if (r.subject?.name) threads[key].subjects.push(r.subject.name);
      });

      const klass = await Class.findByPk(student.classroom_id, {
        include: [{ model: Teacher, as: 'classTeacher', include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'username'] }] }],
      });
      const ctU = klass?.classTeacher?.user;
      if (ctU) {
        const key = `t-${ctU.id}`;
        if (!threads[key]) {
          threads[key] = { key, teacherId: Number(ctU.id), teacherName: fullName(ctU), subjects: [], subjectId: null, unread: 0, messages: [] };
        }
        threads[key].isClassTeacher = true;
      }
    }

    const teacherUserIds = Object.values(threads).map(t => t.teacherId);
    if (teacherUserIds.length) {
      const msgs = await Message.findAll({
        where: {
          school_id: await resolveParentSchoolId(req),
          [Op.or]: [
            { sender_id: req.user.id, recipient_id: { [Op.in]: teacherUserIds } },
            { recipient_id: req.user.id, sender_id: { [Op.in]: teacherUserIds } },
          ],
        },
        order: [['created_at', 'ASC']],
        limit: 300,
      });
      msgs.forEach(m => {
        const mine = Number(m.sender_id) === Number(req.user.id);
        const other = mine ? Number(m.recipient_id) : Number(m.sender_id);
        const t = threads[`t-${other}`];
        if (!t) return;
        t.messages.push({ id: m.id, sender: mine ? 'parent' : 'teacher', text: m.body, sentAt: m.created_at });
        if (!m.is_read && Number(m.recipient_id) === Number(req.user.id)) t.unread++;
      });
    }

    const list = Object.values(threads).map(t => ({
      key: t.key,
      teacherId: t.teacherId,
      teacherName: t.teacherName,
      teacherRole: [t.isClassTeacher ? 'Class teacher' : null, ...t.subjects].filter(Boolean).join(' · ') || 'Teacher',
      subjectId: t.subjectId,
      unread: t.unread,
      lastMessage: t.messages.length ? t.messages[t.messages.length - 1].text : null,
      messages: t.messages,
    }));

    return res.json(successResponse({ threads: list }));
  } catch (err) {
    console.error('getTeacherThreads Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch threads`));
  }
}

async function sendTeacherMessage(req, res) {
  try {
    const { childId } = req.params;
    const teacherId = req.body.teacher_id || req.params.teacherId;
    const { text, subject } = req.body;
    if (!teacherId || !text) return res.status(400).json(errorResponse('teacher_id and text are required'));

    if (!(await assertOwnChild(req, res, childId))) return;

    const teacherUser = await User.findByPk(teacherId, { attributes: ['id'] });
    if (!teacherUser) return res.status(404).json(errorResponse('Teacher not found'));

    const threadId = `pt-${req.user.id}-${teacherId}`;

    const message = await Message.create({
      school_id: await resolveParentSchoolId(req),
      sender_id: req.user.id,
      sender_type: 'parent',
      recipient_id: teacherId,
      recipient_type: 'teacher',
      subject: subject || `Re: student #${childId}`,
      body: text,
      thread_id: threadId,
      is_read: false,
    });

    return res.json(successResponse({
      sent: {
        id: message.id,
        threadId: message.thread_id,
        sender: 'parent',
        text: message.body,
        sentAt: message.created_at,
      },
    }, 'Message sent'));
  } catch (err) {
    console.error('sendTeacherMessage Error:', err);
    return res.status(500).json(errorResponse(`Failed to send message`));
  }
}

/* ─── Co-guardians ──────────────────────────────────────────────────────── */

async function getCoGuardians(req, res) {
  try {
    const studentIds = await getParentStudentIds(req);
    if (!studentIds.length) return res.json(successResponse({ guardians: [] }));

    const rows = await CoGuardian.findAll({
      where: { student_id: { [Op.in]: studentIds } },
      include: [{ model: User, as: 'guardian', attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'last_login'] }],
      order: [['created_at', 'DESC']],
    });

    // One entry per guardian PERSON (the UI removes a person, not a link row).
    const byGuardian = {};
    rows.forEach(g => {
      if (!g.guardian_user_id) return;
      const gid = Number(g.guardian_user_id);
      if (!byGuardian[gid]) {
        byGuardian[gid] = {
          id: gid,
          name: fullName(g.guardian) || g.guardian?.email || 'Guardian',
          email: g.guardian?.email || null,
          phone: g.guardian?.phone || null,
          relationship: g.relationship || 'Guardian',
          status: g.status,
          lastLogin: g.guardian?.last_login || null,
          invitedAt: g.invited_at || g.created_at,
          primary: gid === Number(req.user.id),
          children: [],
        };
      }
      byGuardian[gid].children.push(Number(g.student_id));
      if (g.status === 'active') byGuardian[gid].status = 'active';
    });

    return res.json(successResponse({ guardians: Object.values(byGuardian) }));
  } catch (err) {
    console.error('getCoGuardians Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch guardians`));
  }
}

async function inviteCoGuardian(req, res) {
  try {
    // Accept the FE contract {name, email, relationship, children[]} and the
    // legacy {student_id, guardian_email, relationship}.
    const email = req.body.email || req.body.guardian_email;
    const name = req.body.name || '';
    const relationship = req.body.relationship || 'co-guardian';
    let children = Array.isArray(req.body.children) ? req.body.children.map(Number).filter(Boolean) : [];
    if (!children.length && req.body.student_id) children = [Number(req.body.student_id)];

    if (!email) return res.status(400).json(errorResponse('email is required'));
    if (!children.length) return res.status(400).json(errorResponse('Select at least one child to link'));

    const studentIds = await getParentStudentIds(req);
    const invalid = children.filter(id => !studentIds.includes(id));
    if (invalid.length) return res.status(403).json(errorResponse('Access denied'));

    let guardianUser = await User.findOne({ where: { email } });
    if (!guardianUser) {
      const [firstName, ...rest] = String(name).trim().split(/\s+/);
      const parentRoleId = await requireRoleId('parent');
      guardianUser = await User.create({
        username: email,
        email,
        first_name: firstName || null,
        last_name: rest.join(' ') || null,
        // Random placeholder credential — the invitee cannot log in until the
        // school activates the account and issues a real password.
        password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10),
        is_active: false,
        role_id: parentRoleId,
      });
    }

    if (Number(guardianUser.id) === Number(req.user.id)) {
      return res.status(400).json(errorResponse('You are already a guardian of these children'));
    }

    const created = [];
    for (const studentId of children) {
      const existing = await CoGuardian.findOne({
        where: { student_id: studentId, guardian_user_id: guardianUser.id },
      });
      if (existing) continue;
      const row = await CoGuardian.create({
        school_id: await resolveParentSchoolId(req),
        student_id: studentId,
        guardian_user_id: guardianUser.id,
        relationship,
        status: 'pending',
        invited_at: new Date(),
      });
      created.push(Number(row.student_id));
    }

    return res.json(successResponse({
      id: Number(guardianUser.id),
      status: 'pending',
      children: created,
    }, 'Invitation recorded — the school office must activate the guardian account'));
  } catch (err) {
    console.error('inviteCoGuardian Error:', err);
    return res.status(500).json(errorResponse(`Failed to invite guardian`));
  }
}

async function removeCoGuardian(req, res) {
  try {
    // Route param :id = the guardian's USER id (one entry per person in the UI).
    const guardianUserId = Number(req.params.id || req.params.guardianId);
    if (!guardianUserId) return res.status(400).json(errorResponse('Invalid guardian id'));
    if (guardianUserId === Number(req.user.id)) {
      return res.status(400).json(errorResponse('You cannot remove yourself'));
    }

    const studentIds = await getParentStudentIds(req);
    if (!studentIds.length) return res.status(404).json(errorResponse('Guardian not found'));

    const removed = await CoGuardian.destroy({
      where: { guardian_user_id: guardianUserId, student_id: { [Op.in]: studentIds } },
    });

    if (!removed) return res.status(404).json(errorResponse('Guardian not found'));

    return res.json(successResponse({}, 'Guardian removed'));
  } catch (err) {
    console.error('removeCoGuardian Error:', err);
    return res.status(500).json(errorResponse(`Failed to remove guardian`));
  }
}

/* ─── Pickup allow-list ─────────────────────────────────────────────────── */

async function getPickupAllowList(req, res) {
  try {
    const studentIds = await getParentStudentIds(req);
    if (!studentIds.length) return res.json(successResponse({ pickups: [] }));

    const rows = await PickupPerson.findAll({
      where: { student_id: { [Op.in]: studentIds }, is_authorized: true },
      order: [['name', 'ASC']],
    });

    // One entry per PERSON (grouped on name+phone) with the linked children.
    const byPerson = {};
    rows.forEach(p => {
      const key = `${p.name}|${p.phone || ''}`;
      if (!byPerson[key]) {
        byPerson[key] = {
          id: p.id,
          name: p.name,
          phone: p.phone || null,
          relationship: p.relationship || null,
          expiry: p.expiry || null,
          photoColor: p.photo_color || null,
          isAuthorized: !!p.is_authorized,
          children: [],
        };
      }
      byPerson[key].children.push(Number(p.student_id));
    });

    return res.json(successResponse({ pickups: Object.values(byPerson) }));
  } catch (err) {
    console.error('getPickupAllowList Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch pickups`));
  }
}

async function addPickup(req, res) {
  try {
    const { name, phone, relationship, expiry } = req.body;
    const photoColor = req.body.photo_color || req.body.photoColor || null;
    if (!name) return res.status(400).json(errorResponse('name is required'));

    const studentIds = await getParentStudentIds(req);
    if (!studentIds.length) return res.status(403).json(errorResponse('No linked children'));

    let children = Array.isArray(req.body.children) ? req.body.children.map(Number).filter(Boolean) : [];
    if (req.body.student_id) children.push(Number(req.body.student_id));
    children = [...new Set(children)];
    const invalid = children.filter(id => !studentIds.includes(id));
    if (invalid.length) return res.status(403).json(errorResponse('Access denied'));
    if (!children.length) children = studentIds; // default: authorised for all linked children

    const createdIds = [];
    for (const studentId of children) {
      const existing = await PickupPerson.findOne({
        where: { student_id: studentId, name, phone: phone || '' },
      });
      if (existing) {
        await existing.update({ is_authorized: true, relationship: relationship || existing.relationship, expiry: expiry || existing.expiry, photo_color: photoColor || existing.photo_color });
        createdIds.push(existing.id);
        continue;
      }
      const row = await PickupPerson.create({
        school_id: await resolveParentSchoolId(req),
        student_id: studentId,
        name,
        phone: phone || '',
        relationship: relationship || '',
        expiry: expiry || null,
        photo_color: photoColor,
        is_authorized: true,
      });
      createdIds.push(row.id);
    }

    return res.json(successResponse({
      id: createdIds[0] || null,
      name,
      phone: phone || null,
      relationship: relationship || null,
      expiry: expiry || null,
      photoColor,
      children,
    }, 'Pickup person added'));
  } catch (err) {
    console.error('addPickup Error:', err);
    return res.status(500).json(errorResponse(`Failed to add pickup`));
  }
}

async function removePickup(req, res) {
  try {
    // Route param is :id — one row of the person's group; remove the person
    // across ALL of this parent's children (matches the UI semantics).
    const rowId = req.params.id || req.params.pickupId;

    const studentIds = await getParentStudentIds(req);
    const pickup = await PickupPerson.findOne({
      where: { id: rowId, student_id: { [Op.in]: studentIds.length ? studentIds : [0] } },
    });

    if (!pickup) {
      return res.status(404).json(errorResponse('Pickup person not found'));
    }

    await PickupPerson.destroy({
      where: {
        name: pickup.name,
        phone: pickup.phone || '',
        student_id: { [Op.in]: studentIds },
      },
    });

    return res.json(successResponse({}, 'Pickup person removed'));
  } catch (err) {
    console.error('removePickup Error:', err);
    return res.status(500).json(errorResponse(`Failed to remove pickup`));
  }
}

/* ─── Permission slips ──────────────────────────────────────────────────── */

async function getPermissionSlips(req, res) {
  try {
    const slips = await PermissionSlip.findAll({
      where: {
        school_id: await resolveParentSchoolId(req),
        is_active: true,
      },
      order: [['event_date', 'DESC']],
    });

    const studentIds = await getParentStudentIds(req);

    const signatures = slips.length && studentIds.length ? await PermissionSlipSignature.findAll({
      where: {
        slip_id: { [Op.in]: slips.map(s => s.id) },
        student_id: { [Op.in]: studentIds },
        parent_id: req.user.id,
      },
    }) : [];
    const sigByKey = {};
    signatures.forEach(sig => { sigByKey[`${sig.slip_id}-${sig.student_id}`] = sig; });

    // One row per slip PER CHILD — a signature is per student.
    const formatted = [];
    slips.forEach(s => {
      studentIds.forEach(studentId => {
        const sig = sigByKey[`${s.id}-${studentId}`];
        formatted.push({
          id: s.id,
          childId: studentId,
          title: s.title,
          body: s.description || '',
          description: s.description || '',
          eventDate: s.event_date || null,
          issuedAt: s.created_at,
          dueBy: s.expiry_date || null,
          status: sig ? 'signed' : 'pending',
          signedAt: sig?.signed_at || null,
          isExpired: s.expiry_date ? new Date(s.expiry_date) < new Date() : false,
        });
      });
    });

    return res.json(successResponse({ slips: formatted }));
  } catch (err) {
    console.error('getPermissionSlips Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch slips`));
  }
}

async function signPermissionSlip(req, res) {
  try {
    // Slip id comes from the ROUTE (:id); the child from the body.
    const slipId = req.params.id || req.body.slip_id;
    const studentId = req.body.student_id || req.body.studentId;
    if (!slipId || !studentId) {
      return res.status(400).json(errorResponse('slip id and student_id are required'));
    }

    if (!(await assertOwnChild(req, res, studentId))) return;

    const slip = await PermissionSlip.findOne({
      where: { id: slipId, school_id: await resolveParentSchoolId(req), is_active: true },
    });

    if (!slip) {
      return res.status(404).json(errorResponse('Slip not found'));
    }

    const existing = await PermissionSlipSignature.findOne({
      where: { slip_id: slipId, student_id: studentId, parent_id: req.user.id },
    });

    if (existing) {
      return res.json(successResponse({ signedAt: existing.signed_at }, 'Already signed'));
    }

    const signatureHash = `${slipId}-${studentId}-${req.user.id}-${Date.now()}`.replace(/[^a-zA-Z0-9-]/g, '');

    const sig = await PermissionSlipSignature.create({
      slip_id: slipId,
      student_id: studentId,
      parent_id: req.user.id,
      signed_at: new Date(),
      signature_hash: signatureHash,
    });

    return res.json(successResponse({ signedAt: sig.signed_at, signatureHash }, 'Slip signed'));
  } catch (err) {
    console.error('signPermissionSlip Error:', err);
    return res.status(500).json(errorResponse(`Failed to sign slip`));
  }
}

/* ─── Acknowledgments ───────────────────────────────────────────────────── */

async function acknowledgeRecord(req, res) {
  try {
    // Accept both {record_type, record_id} and the FE's {kind, id}.
    const record_type = req.body.record_type || req.body.kind;
    const record_id = req.body.record_id || req.body.id;
    if (!record_type || !record_id) {
      return res.status(400).json(errorResponse('record_type and record_id are required'));
    }

    const existing = await Acknowledgment.findOne({
      where: { user_id: req.user.id, record_type, record_id },
    });

    if (existing) {
      return res.json(successResponse({}, 'Already acknowledged'));
    }

    await Acknowledgment.create({
      school_id: await resolveParentSchoolId(req),
      user_id: req.user.id,
      record_type,
      record_id,
      acknowledged_at: new Date(),
    });

    return res.json(successResponse({}, 'Acknowledged'));
  } catch (err) {
    console.error('acknowledgeRecord Error:', err);
    return res.status(500).json(errorResponse(`Failed to acknowledge`));
  }
}

async function getAcknowledgments(req, res) {
  try {
    const acknowledgments = await Acknowledgment.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
    });

    const formatted = acknowledgments.map(a => ({
      id: a.id,
      recordType: a.record_type,
      recordId: a.record_id,
      record_type: a.record_type,
      record_id: a.record_id,
      acknowledgedAt: a.acknowledged_at,
    }));

    return res.json(successResponse({ acknowledgments: formatted }));
  } catch (err) {
    console.error('getAcknowledgments Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch acknowledgments`));
  }
}

/* ─── Events / donations ────────────────────────────────────────────────── */

async function getParentEvents(req, res) {
  try {
    const events = await Notification.findAll({
      where: parentNotificationScope(req, await resolveParentSchoolId(req)),
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    const formatted = events.map(e => ({
      id: e.id,
      title: e.title,
      message: e.message,
      type: e.type,
      isRead: !!e.is_read,
      createdAt: e.created_at,
    }));

    return res.json(successResponse({ events: formatted }));
  } catch (err) {
    console.error('getParentEvents Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch events`));
  }
}

async function getDonations(req, res) {
  try {
    const campaigns = await DonationCampaign.findAll({
      where: {
        school_id: await resolveParentSchoolId(req),
        is_active: true,
      },
      order: [['created_at', 'DESC']],
    });

    const donations = await Donation.findAll({
      where: { donor_id: req.user.id },
    });

    // "Contributed" = confirmed money only; pledges awaiting confirmation are
    // reported separately.
    const totalSponsored = donations.filter(d => d.paid_at).reduce((sum, d) => sum + (d.amount || 0), 0);
    const totalPledged = donations.filter(d => !d.paid_at).reduce((sum, d) => sum + (d.amount || 0), 0);

    const formatted = campaigns.map(c => ({
      id: c.id,
      name: c.title,
      title: c.title,
      description: c.description,
      goalSll: c.target_amount,
      raisedSll: c.current_amount || 0,
      progress: c.target_amount ? Math.round((c.current_amount || 0) / c.target_amount * 100) : 0,
      beneficiaries: null, // beneficiary counts are not tracked yet
      startDate: c.start_date,
      endDate: c.end_date,
    }));

    return res.json(successResponse({ campaigns: formatted, totalSponsored, totalPledged }));
  } catch (err) {
    console.error('getDonations Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch donations`));
  }
}

async function donateToCampaign(req, res) {
  try {
    const { campaign_id, amount, anonymous } = req.body;
    if (!campaign_id || !amount) {
      return res.status(400).json(errorResponse('campaign_id and amount are required'));
    }

    const campaign = await DonationCampaign.findOne({
      where: { id: campaign_id, school_id: await resolveParentSchoolId(req) },
    });
    if (!campaign) {
      return res.status(404).json(errorResponse('Campaign not found'));
    }

    if (!(Number(amount) > 0)) {
      return res.status(400).json(errorResponse('amount must be positive'));
    }

    // No payment gateway exists yet, so this records a PLEDGE (paid_at null)
    // and does NOT move the campaign total — a campaign thermometer must only
    // count money someone actually received.
    const receiptHash = `DON-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8)}`;

    const donation = await Donation.create({
      campaign_id,
      donor_id: anonymous ? null : req.user.id,
      amount,
      is_anonymous: anonymous || false,
      receipt_hash: receiptHash,
      paid_at: null,
    });

    return res.json(successResponse({
      id: donation.id,
      amount: donation.amount,
      isAnonymous: donation.is_anonymous,
      receiptHash: donation.receipt_hash,
      receipt_hash: donation.receipt_hash,
      paidAt: null,
      status: 'pledged',
      note: 'This is a pledge — the campaign total moves only after the school confirms the money arrived.',
    }, 'Donation pledged — the school will confirm once payment is received'));
  } catch (err) {
    console.error('donateToCampaign Error:', err);
    return res.status(500).json(errorResponse(`Failed to donate`));
  }
}

/* ─── End-of-term pack / digests / family activity ──────────────────────── */

async function getEndOfTermPack(req, res) {
  try {
    const { childId } = req.params;

    const studentIds = await getParentStudentIds(req);
    if (childId && !studentIds.includes(Number(childId))) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    const targetStudentId = childId || studentIds[0];
    if (!targetStudentId) {
      return res.status(404).json(errorResponse('No children found'));
    }

    const grades = await Grade.findAll({
      where: { student_id: targetStudentId, approval_status: 'approved' },
      include: [
        { model: Subject, as: 'subject', attributes: ['name', 'code'] },
        { model: Term, as: 'term', attributes: ['name'] },
      ],
    });

    const attendance = await Attendance.findAll({
      where: { student_id: targetStudentId },
    });

    const fees = await Fee.findAll({
      where: { student_id: targetStudentId },
      include: [{ model: FeeCategory, as: 'feeCategory', attributes: ['name'] }],
    });

    const totalFees = fees.reduce((sum, f) => sum + (f.amount_due || 0), 0);
    const totalPaid = fees.reduce((sum, f) => sum + (f.amount_paid || 0), 0);

    const totalAttendance = attendance.length;
    const presentCount = attendance.filter(a => a.status === 'present').length;
    const attendanceRate = totalAttendance ? Math.round(presentCount / totalAttendance * 100) : null;

    const gradesData = grades.map(g => ({
      subject: g.subject?.name || '',
      term: g.term?.name || '',
      total: g.total,
      grade_letter: g.grade_letter,
    }));
    const attendanceData = { rate: attendanceRate, total_days: totalAttendance, present_days: presentCount };
    const feesData = { total_due: totalFees, total_paid: totalPaid, balance: totalFees - totalPaid };

    const items = [
      { name: `Grades (${grades.length} record${grades.length === 1 ? '' : 's'})`, type: 'grades', size: jsonBytes(gradesData), count: grades.length, data: gradesData },
      { name: 'Attendance summary', type: 'attendance', size: jsonBytes(attendanceData), ...attendanceData },
      { name: 'Fees summary', type: 'fees', size: jsonBytes(feesData), ...feesData },
    ];

    return res.json(successResponse({
      generatedAt: new Date().toISOString(),
      generated_at: new Date().toISOString(),
      studentId: Number(targetStudentId),
      size: items.reduce((s, it) => s + it.size, 0),
      items,
    }));
  } catch (err) {
    console.error('getEndOfTermPack Error:', err);
    return res.status(500).json(errorResponse(`Failed to generate pack`));
  }
}

async function getWeeklyDigest(req, res) {
  try {
    const studentIds = await getParentStudentIds(req);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [grades, attendance, notifications] = await Promise.all([
      studentIds.length ? Grade.findAll({
        where: {
          student_id: { [Op.in]: studentIds },
          approval_status: 'approved',
          created_at: { [Op.gte]: weekAgo },
        },
        include: [{ model: Subject, as: 'subject', attributes: ['name'] }],
      }) : [],
      studentIds.length ? Attendance.findAll({
        where: { student_id: { [Op.in]: studentIds }, date: { [Op.gte]: weekAgo } },
      }) : [],
      Notification.findAll({
        where: { user_id: req.user.id, created_at: { [Op.gte]: weekAgo } },
        order: [['created_at', 'DESC']],
        limit: 10,
      }),
    ]);

    const perChild = {};
    studentIds.forEach(sid => {
      const gs = grades.filter(g => Number(g.student_id) === sid);
      const atts = attendance.filter(a => Number(a.student_id) === sid);
      const present = atts.filter(a => a.status === 'present').length;
      const avg = gs.length ? Math.round(gs.reduce((s, g) => s + (g.total || 0), 0) / gs.length) : null;
      const best = gs.length ? gs.reduce((a, b) => ((a.total || 0) >= (b.total || 0) ? a : b)) : null;
      perChild[sid] = {
        attendancePct: atts.length ? Math.round(present / atts.length * 100) : null,
        assignmentsGraded: gs.length,
        avgScore: avg,
        missedHomework: null, // homework tracking not wired to the digest yet
        flagged: atts.filter(a => a.status === 'absent').map(a => `Absent on ${new Date(a.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`),
        highlight: best ? `Best result this week: ${best.subject?.name || 'a subject'} (${best.total})` : null,
      };
    });

    const summary = `${grades.length} new grade${grades.length === 1 ? '' : 's'} were approved and ${attendance.length} attendance record${attendance.length === 1 ? ' was' : 's were'} logged across your ${studentIds.length} linked child${studentIds.length === 1 ? '' : 'ren'} this week. You received ${notifications.length} notification${notifications.length === 1 ? '' : 's'}.`;

    return res.json(successResponse({
      weekOf: weekAgo.toISOString(),
      summary,
      perChild,
      notifications: notifications.map(n => ({ title: n.title, type: n.type, createdAt: n.created_at })),
      period: { from: weekAgo, to: new Date() },
    }));
  } catch (err) {
    console.error('getWeeklyDigest Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch digest`));
  }
}

async function getVoiceDigest(req, res) {
  try {
    const studentIds = await getParentStudentIds(req);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const grades = studentIds.length ? await Grade.findAll({
      where: {
        student_id: { [Op.in]: studentIds },
        approval_status: 'approved',
        created_at: { [Op.gte]: weekAgo },
      },
      include: [{ model: Subject, as: 'subject', attributes: ['name'] }],
    }) : [];

    const attendance = studentIds.length ? await Attendance.findAll({
      where: { student_id: { [Op.in]: studentIds }, date: { [Op.gte]: weekAgo } },
    }) : [];

    const notifications = await Notification.count({
      where: { user_id: req.user.id, created_at: { [Op.gte]: weekAgo } },
    });

    const presentCount = attendance.filter(a => a.status === 'present').length;
    const absentCount = attendance.filter(a => a.status === 'absent').length;

    let text = `Weekly digest for your children. `;
    text += `${grades.length} new grades were recorded this week. `;
    text += `Attendance: ${presentCount} days present, ${absentCount} days absent. `;
    text += `You have ${notifications} new notifications. `;

    if (grades.length > 0) {
      text += 'Recent grades: ';
      grades.slice(0, 5).forEach(g => {
        text += `${g.subject?.name || 'Subject'}: ${g.total} points (${g.grade_letter || 'N/A'}). `;
      });
    }

    return res.json(successResponse({ text }));
  } catch (err) {
    console.error('getVoiceDigest Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch voice digest`));
  }
}

async function getFamilyActivity(req, res) {
  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Family activity = this parent's own actions + their own notifications.
    // SecurityAuditLog is platform-wide; never return it unscoped to a tenant user.
    const auditLogs = await SecurityAuditLog.findAll({
      where: {
        actor: req.user.username || '__none__',
        ts: { [Op.gte]: weekAgo },
      },
      order: [['ts', 'DESC']],
      limit: 50,
    });

    const notifications = await Notification.findAll({
      where: {
        user_id: req.user.id,
        created_at: { [Op.gte]: weekAgo },
      },
      order: [['created_at', 'DESC']],
      limit: 50,
    });

    const activity = [
      ...auditLogs.map(l => ({
        id: `audit-${l.id}`,
        type: 'security_log',
        title: l.action,
        action: l.action,
        severity: l.severity,
        actor: l.actor,
        timestamp: l.ts,
      })),
      ...notifications.map(n => ({
        id: `notif-${n.id}`,
        type: 'notification',
        title: n.title,
        message: n.message,
        notification_type: n.type,
        timestamp: n.created_at,
      })),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const limit = parseInt(req.query.limit, 10);
    return res.json(successResponse({ activity: limit ? activity.slice(0, limit) : activity }));
  } catch (err) {
    console.error('getFamilyActivity Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch activity`));
  }
}

module.exports = {
  getChildren,
  getChildGrades, getChildGradeHistory,
  getChildReportCards, downloadChildReportCard,
  getParentNotifications, markParentNotificationRead,
  getParentProfile, updateParentProfile,
  get2FASetup, set2FA,
  getChildTimetable,
  getChildAttendance,
  getChildBehavior,
  getChildFees,
  getPaymentChannels, startPayment, getReceipts, downloadReceipt,
  verifyHash,
  getTamperCount,
  getAccessLog,
  submitModificationObjection,
  getChannelPreferences, updateChannelPreferences,
  getWhistleblowerCategories, submitWhistleblowerReport, checkWhistleblowerStatus,
  getConferenceSlots, claimConferenceSlot, cancelConferenceSlot,
  getCounsellor, sendCounsellorMessage,
  getTeacherThreads, sendTeacherMessage,
  getCoGuardians, inviteCoGuardian, removeCoGuardian,
  getPickupAllowList, addPickup, removePickup,
  getPermissionSlips, signPermissionSlip,
  acknowledgeRecord, getAcknowledgments,
  getParentEvents,
  getDonations, donateToCampaign,
  getEndOfTermPack,
  getWeeklyDigest, getVoiceDigest,
  getFamilyActivity,
};
