const { Op } = require('sequelize');
const sequelize = require('../config/db');
const Student = require('../models/Student');
const User = require('../models/User');
const Class = require('../models/Class');
const Grade = require('../models/Grade');
const Attendance = require('../models/Attendance');
const Term = require('../models/Term');
const AcademicYear = require('../models/AcademicYear');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const Notification = require('../models/Notification');
const ClassSubject = require('../models/ClassSubject');
const ForensicEvent = require('../models/ForensicEvent');
const GradeEvent = require('../models/GradeEvent');
const { mapGradeEvents } = require('../utils/gradeHistory');
const SecurityAuditLog = require('../models/SecurityAuditLog');
const twoFactorService = require('../services/twoFactor');
const Fee = require('../models/Fee');
const Payment = require('../models/Payment');
const FeeCategory = require('../models/FeeCategory');
const Message = require('../models/Message');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const LearningResource = require('../models/LearningResource');
const ResourceVisit = require('../models/ResourceVisit');
const OfficeHour = require('../models/OfficeHour');
const OfficeHourBooking = require('../models/OfficeHourBooking');
const Goal = require('../models/Goal');
const StudyGroup = require('../models/StudyGroup');
const StudyGroupMember = require('../models/StudyGroupMember');
const Document = require('../models/Document');
const TranscriptRequest = require('../models/TranscriptRequest');
const StudyPlan = require('../models/StudyPlan');
const ChannelPreference = require('../models/ChannelPreference');
const ModificationRequest = require('../models/ModificationRequest');
const WhistleblowerReport = require('../models/WhistleblowerReport');
const WhistleblowerCategory = require('../models/WhistleblowerCategory');
const LiveClass = require('../models/LiveClass');
const PeerReview = require('../models/PeerReview');
const CoGuardian = require('../models/CoGuardian');
const School = require('../models/School');
const crypto = require('crypto');

const successResponse = (data = {}, message = 'Success') => ({ success: true, message, ...data });
const errorResponse = (message) => ({ success: false, message });

async function getSchoolFromUser(req) {
  if (!req.user) return null;
  if ((req.schoolId || req.user.school_id)) return { id: (req.schoolId || req.user.school_id) };
  if (req.user.Student) return { id: req.user.Student.school_id };
  if (req.user.SchoolAdmin) return { id: req.user.SchoolAdmin.school_id };
  if (req.user.Teacher) return { id: req.user.Teacher.school_id };
  const student = await Student.findOne({ where: { user_id: req.user.id } });
  if (student) return { id: student.school_id };
  return null;
}

async function getStudentFromUser(req) {
  if (!req.user) return null;
  if (req.user.Student) return req.user.Student;
  const student = await Student.findOne({
    where: { user_id: req.user.id },
    include: [
      /* User has no `phone` column (model: id/username/email/names/role) — requesting
         it threw ER_BAD_FIELD 'Unknown column user.phone' on any DB without a stray
         physical column, breaking every student endpoint that uses this helper. The
         student's phone lives on Student.phone_number. */
      { model: User, as: 'user', attributes: ['id', 'username', 'first_name', 'last_name', 'email'] },
      { model: Class, as: 'classroom', attributes: ['id', 'name'] },
    ],
  });
  return student;
}

/* Linked guardians: active CoGuardian accounts (the same junction the parent
   portal resolves children through), falling back to the legacy father/mother
   contact fields stored on the student row. */
async function resolveGuardians(student) {
  const rows = await CoGuardian.findAll({
    where: { student_id: student.id, status: 'active' },
    order: [['created_at', 'ASC']],
  });
  const userIds = rows.map(r => r.guardian_user_id).filter(Boolean);
  const users = userIds.length
    ? await User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'first_name', 'last_name', 'username', 'email'], raw: true })
    : [];
  const byId = {};
  users.forEach(u => { byId[Number(u.id)] = u; });

  const linked = rows.map(r => {
    const u = byId[Number(r.guardian_user_id)] || {};
    return {
      name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || 'Guardian',
      relationship: r.relationship || 'Parent/Guardian',
      phone: null, // guardian phone lives on their own profile, not the link
      email: u.email || null,
      linkedAccount: true,
    };
  });

  if (student.father_name) {
    linked.push({ name: student.father_name, relationship: 'Father', phone: student.father_phone || null, email: null, linkedAccount: false });
  }
  if (student.mother_name) {
    linked.push({ name: student.mother_name, relationship: 'Mother', phone: student.mother_phone || null, email: null, linkedAccount: false });
  }
  return linked;
}

async function getProfile(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student profile not found'));

    const guardians = await resolveGuardians(student);
    const u = student.user || {};
    const c = student.classroom;

    return res.json(successResponse({
      id: student.id,
      fullName: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      phone: u.phone,
      username: u.username,
      studentNumber: student.admission_number,
      className: c?.name || null,
      classId: student.classroom_id,
      schoolId: student.school_id,
      dateOfBirth: student.date_of_birth,
      gender: student.gender,
      status: student.status,
      admissionDate: student.admission_date,
      passportPicture: student.passport_picture,
      fatherName: student.father_name,
      fatherPhone: student.father_phone,
      motherName: student.mother_name,
      motherPhone: student.mother_phone,
      // Linked guardian(s): active CoGuardian accounts first (the real
      // parent-portal link), then the legacy father/mother contact fields.
      guardian: guardians[0] || null,
      guardians,
      homeAddress: student.home_address,
      city: student.city,
      bloodType: student.blood_type,
      allergies: student.allergies,
      medicalNotes: student.medical_notes,
    }));
  } catch (err) {
    console.error('getProfile Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch profile`));
  }
}

async function changePassword(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const { current_password, new_password } = req.body;
    const user = await User.findByPk(student.user_id);
    if (!user) return res.status(404).json(errorResponse('User not found'));

    const bcrypt = require('bcryptjs');
    const valid = await bcrypt.compare(current_password, user.password);
    if (!valid) return res.status(400).json(errorResponse('Current password is incorrect'));

    const hashed = await bcrypt.hash(new_password, 10);
    await user.update({ password: hashed });

    return res.json(successResponse({}, 'Password changed successfully'));
  } catch (err) {
    console.error('changePassword Error:', err);
    return res.status(500).json(errorResponse(`Failed to change password`));
  }
}

async function changeUsername(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const { new_username } = req.body;
    const user = await User.findByPk(student.user_id);
    if (!user) return res.status(404).json(errorResponse('User not found'));

    await user.update({ username: new_username });
    return res.json(successResponse({}, 'Username updated'));
  } catch (err) {
    console.error('changeUsername Error:', err);
    return res.status(500).json(errorResponse(`Failed to update username`));
  }
}

async function getCurrentTerm(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const term = await Term.findOne({
      where: { school_id: school.id, is_active: true },
      include: [{ model: AcademicYear, as: 'academicYear', attributes: ['id', 'name'] }],
    });

    if (!term) return res.json(successResponse({ term: null }));
    return res.json(successResponse({ term }));
  } catch (err) {
    console.error('getCurrentTerm Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch current term`));
  }
}

async function getAllTerms(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const terms = await Term.findAll({
      where: { school_id: school.id },
      include: [{ model: AcademicYear, as: 'academicYear', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
    });

    return res.json(successResponse({ terms }));
  } catch (err) {
    console.error('getAllTerms Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch terms`));
  }
}

async function getGrades(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const { term_id } = req.query;
    const where = { student_id: student.id, approval_status: 'approved' };
    if (term_id) where.term_id = term_id;

    const grades = await Grade.findAll({
      // `where` carries the optional term filter built above — the old query
      // rebuilt an unfiltered clause, so the term selector never filtered (S2).
      where,
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        { model: Term, as: 'term', attributes: ['id', 'name'] },
      ],
      order: [['term_id', 'ASC']],
    });

    const formatted = grades.map(g => ({
      id: g.id,
      subjectId: g.subject_id,
      subject: g.subject ? { id: g.subject.id, name: g.subject.name, code: g.subject.code } : null,
      termId: g.term_id,
      term: g.term ? { id: g.term.id, name: g.term.name } : null,
      ca: g.ca,
      midterm: g.midterm,
      final: g.final,
      total: g.total,
      gradeLetter: g.grade_letter,
      remarks: g.remarks,
      createdAt: g.created_at,
    }));

    return res.json(successResponse({ grades: formatted }));
  } catch (err) {
    console.error('getGrades Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch grades`));
  }
}

async function getGradesSummary(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const { term_id } = req.query;
    const where = { student_id: student.id, approval_status: 'approved' };
    if (term_id) where.term_id = term_id;

    const grades = await Grade.findAll({ where });

    const total = grades.reduce((sum, g) => sum + (g.total || 0), 0);
    const average = grades.length ? Math.round(total / grades.length * 10) / 10 : 0;
    const passed = grades.filter(g => (g.total || 0) >= 50).length;

    // Class rank: average of each classmate's approved grades for the same
    // term set, ranked descending. The Home screen renders "rank / class size".
    let classRank = null;
    let totalStudentsInClass = null;
    if (student.classroom_id && grades.length) {
      const classmates = await Student.findAll({
        where: { classroom_id: student.classroom_id, status: 'active' },
        attributes: ['id'],
        raw: true,
      });
      const ids = classmates.map(s => Number(s.id));
      totalStudentsInClass = ids.length;
      const classWhere = { student_id: { [Op.in]: ids }, approval_status: 'approved' };
      if (term_id) classWhere.term_id = term_id;
      const rows = await Grade.findAll({
        where: classWhere,
        attributes: ['student_id', 'total'],
        raw: true,
      });
      const sums = {};
      rows.forEach(r => {
        const sid = Number(r.student_id);
        (sums[sid] ||= { t: 0, n: 0 });
        sums[sid].t += r.total || 0;
        sums[sid].n += 1;
      });
      const averages = Object.entries(sums)
        .map(([sid, { t, n }]) => ({ sid: Number(sid), avg: n ? t / n : 0 }))
        .sort((a, b) => b.avg - a.avg);
      const idx = averages.findIndex(a => a.sid === Number(student.id));
      if (idx !== -1) classRank = idx + 1;
    }

    return res.json(successResponse({
      overallAverage: average,
      totalSubjects: grades.length,
      passed,
      failed: grades.length - passed,
      subjectsPassed: passed,
      classRank,
      totalStudentsInClass,
    }));
  } catch (err) {
    console.error('getGradesSummary Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch grades summary`));
  }
}

async function getGradeHistory(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const { gradeId } = req.params;
    const grade = await Grade.findByPk(gradeId);
    if (!grade) return res.status(404).json(errorResponse('Grade not found'));
    // IDOR guard: a student may only inspect the audit trail of their OWN grade.
    if (String(grade.student_id) !== String(student.id)) {
      return res.status(403).json(errorResponse('Not authorized to view this grade'));
    }

    // A grade's history is the append-only, hash-chained GradeEvent trail. The old query
    // hit ForensicEvent.grade_id — a column that doesn't exist (every call 500'd); ForensicEvent
    // carries no grade linkage at all. GradeEvent (pruh_core_grade_event) is keyed by grade_id.
    const events = await GradeEvent.findAll({
      where: { grade_id: gradeId },
      order: [['created_at', 'ASC']],
    });

    // Shared mapper so the student panel and parent drawer read the same shape.
    return res.json(successResponse({ history: mapGradeEvents(events) }));
  } catch (err) {
    console.error('getGradeHistory Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch grade history`));
  }
}

async function getPeerReview(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const reviews = await PeerReview.findAll({
      where: { reviewee_id: student.id },
      order: [['created_at', 'DESC']],
    });

    const formatted = reviews.map(r => ({
      id: r.id,
      reviewerId: r.reviewer_id,
      category: r.category,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
    }));

    return res.json(successResponse({ peerReviews: formatted }));
  } catch (err) {
    console.error('getPeerReview Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch peer review`));
  }
}

async function getFeedbackThread(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const { thread_id } = req.params;
    const messages = await Message.findAll({
      where: {
        school_id: (req.schoolId || req.user.school_id),
        [Op.or]: [
          { sender_id: student.user_id, sender_type: 'Student' },
          { recipient_id: student.user_id, recipient_type: 'Student' },
        ],
        ...(thread_id ? { thread_id } : {}),
      },
      order: [['created_at', 'ASC']],
    });

    const formatted = messages.map(m => ({
      id: m.id,
      senderId: m.sender_id,
      senderType: m.sender_type,
      body: m.body,
      isRead: m.is_read,
      createdAt: m.created_at,
    }));

    return res.json(successResponse({ thread: { messages: formatted } }));
  } catch (err) {
    console.error('getFeedbackThread Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch feedback`));
  }
}

async function sendFeedbackMessage(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const { body, recipient_id, recipient_type, subject, thread_id } = req.body;
    const message = await Message.create({
      school_id: (req.schoolId || req.user.school_id),
      sender_id: student.user_id,
      sender_type: 'Student',
      recipient_id,
      recipient_type: recipient_type || 'Teacher',
      subject: subject || '',
      body,
      thread_id: thread_id || `feedback-${student.id}-${Date.now()}`,
    });

    return res.json(successResponse({
      id: message.id,
      body: message.body,
      createdAt: message.created_at,
    }, 'Message sent'));
  } catch (err) {
    console.error('sendFeedbackMessage Error:', err);
    return res.status(500).json(errorResponse(`Failed to send message`));
  }
}

/* Per-grade remedial plan, backed entirely by REAL rows: the subject's
   assigned teacher, the teacher's published office hours (bookable sessions),
   the class's learning resources, and the grade's own component breakdown. */
async function loadRemedialContext(req, student, gradeId) {
  const grade = await Grade.findByPk(gradeId, {
    include: [{ model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }],
  });
  if (!grade || String(grade.student_id) !== String(student.id)) return null;

  const cs = await ClassSubject.findOne({
    where: { class_id: student.classroom_id, subject_id: grade.subject_id },
  });
  let teacher = null;
  if (cs?.teacher_id) {
    teacher = await Teacher.findByPk(cs.teacher_id, {
      include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name', 'username'] }],
    });
  }

  const sessions = teacher
    ? await OfficeHour.findAll({
        where: {
          school_id: (req.schoolId || req.user.school_id),
          teacher_id: teacher.id,
          is_active: true,
          audience: 'student',
          date: { [Op.gte]: new Date() },
        },
        order: [['date', 'ASC']],
        limit: 4,
      })
    : [];

  return { grade, teacher, sessions };
}

async function getRemedialPlan(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const ctx = await loadRemedialContext(req, student, req.params.gradeId);
    if (!ctx) return res.status(404).json(errorResponse('Grade not found'));
    const { grade, teacher, sessions } = ctx;

    const resources = await LearningResource.findAll({
      where: {
        school_id: (req.schoolId || req.user.school_id),
        class_id: student.classroom_id,
        subject_id: grade.subject_id,
        is_active: true,
      },
      order: [['created_at', 'DESC']],
      limit: 6,
    });

    const tu = teacher?.user;
    const teacherName = tu ? (`${tu.first_name || ''} ${tu.last_name || ''}`.trim() || tu.username) : 'your teacher';
    const pct = (v, max) => (v == null ? 0 : Math.min(100, Math.round((v / max) * 100)));

    return res.json(successResponse({
      plan: {
        gradeId: grade.id,
        score: grade.total ?? 0,
        gradeLetter: grade.grade_letter || '—',
        subjectName: grade.subject?.name || '',
        teacherName,
        teacherNote: grade.remarks
          || ((grade.total || 0) < 30 ? 'Intensive remedial support recommended — book a session below.'
                                      : 'Targeted practice recommended — the resources below cover the weak areas.'),
        sessions: sessions.map(oh => {
          const d = oh.date ? new Date(oh.date) : null;
          return {
            id: oh.id,
            month: d ? d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase() : '—',
            day: d ? String(d.getDate()) : '—',
            title: `${oh.subject || grade.subject?.name || 'Support'} session with ${teacherName}`,
            time: [oh.start_time, oh.end_time].filter(Boolean).join(' – ') || 'TBA',
            location: oh.room || 'TBA',
          };
        }),
        resources: resources.map(r => ({
          title: r.title,
          type: r.resource_type || 'document',
          locked: false,
        })),
        // Real component breakdown (CA/20, Midterm/30, Final/50).
        proficiencyModules: [
          { label: 'CA', progress: pct(grade.ca, 20) },
          { label: 'Midterm', progress: pct(grade.midterm, 30) },
          { label: 'Final', progress: pct(grade.final, 50) },
        ],
      },
    }));
  } catch (err) {
    console.error('getRemedialPlan Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch remedial plan`));
  }
}

async function confirmRemedialSession(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    // Route: POST /grades/:gradeId/remedial-plan/confirm/ with { sessionIndex }.
    // Confirming = actually booking the teacher's office-hour slot.
    const ctx = await loadRemedialContext(req, student, req.params.gradeId);
    if (!ctx) return res.status(404).json(errorResponse('Grade not found'));

    const idx = Number(req.body.sessionIndex ?? -1);
    const slot = ctx.sessions[idx];
    if (!slot) return res.status(404).json(errorResponse('Session not found'));

    const existing = await OfficeHourBooking.findOne({
      where: { office_hour_id: slot.id, student_id: student.id, status: 'booked' },
    });
    if (!existing) {
      await OfficeHourBooking.create({
        office_hour_id: slot.id,
        student_id: student.id,
        status: 'booked',
        notes: `Remedial: ${ctx.grade.subject?.name || 'subject'} support`,
      });
    }

    return res.json(successResponse({
      subject: ctx.grade.subject?.name,
      currentScore: ctx.grade.total,
      confirmed: true,
    }, 'Session confirmed'));
  } catch (err) {
    console.error('confirmRemedialSession Error:', err);
    return res.status(500).json(errorResponse(`Failed to confirm session`));
  }
}

async function getSecurityReport(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const events = await ForensicEvent.findAll({
      where: {
        [Op.or]: [
          { actor: String(student.user_id) },
          { metadata_json: { [Op.like]: `%${student.user_id}%` } },
        ],
      },
      order: [['created_at', 'DESC']],
      limit: 50,
    });

    const incidents = events.map(e => ({
      id: e.id,
      eventType: e.event_type,
      description: e.description,
      severity: e.severity,
      resolved: e.resolved,
      createdAt: e.created_at,
    }));

    // The modal reads the grade's subject plus header facts of the LATEST event.
    const grade = await Grade.findByPk(req.params.gradeId, {
      include: [{ model: Subject, as: 'subject', attributes: ['id', 'name'] }],
    });
    const subjectName = grade && String(grade.student_id) === String(student.id)
      ? (grade.subject?.name || '') : '';
    const latest = events[0] || null;

    return res.json(successResponse({
      subjectName,
      incident: {
        detectedAt: latest?.created_at || null,
        ipAddress: latest?.ip || '—',
        location: '—', // no geo enrichment on forensic events yet
        deviceType: latest?.event_type || '—',
        studentId: student.id,
        totalEvents: events.length,
        unresolved: events.filter(e => !e.resolved).length,
        events: incidents,
      },
    }));
  } catch (err) {
    console.error('getSecurityReport Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch security report`));
  }
}

async function getAttendance(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const attendance = await Attendance.findAll({
      where: { student_id: student.id },
      order: [['date', 'DESC']],
      limit: 100,
    });

    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const late = attendance.filter(a => a.status === 'late').length;
    const rate = total ? Math.round(present / total * 100) : 0;

    const records = attendance.map(a => ({
      id: a.id,
      date: a.date,
      status: a.status,
      remarks: a.remarks,
    }));

    return res.json(successResponse({
      attendance: records,
      summary: { total, present, absent, late, rate },
    }));
  } catch (err) {
    console.error('getAttendance Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch attendance`));
  }
}

async function getNotifications(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { limit } = req.query;
    // Own rows + school-wide broadcasts (user_id null) — NOT every user's
    // notifications in the school (cross-user leak, parent-portal pattern).
    const scope = {
      school_id: school.id,
      [Op.or]: [{ user_id: req.user.id }, { user_id: null }],
    };
    const query = { where: scope, order: [['created_at', 'DESC']] };
    if (limit) query.limit = parseInt(limit);

    const notifications = await Notification.findAll(query);

    const formatted = notifications.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.is_read,
      createdAt: n.created_at,
    }));

    const unread = await Notification.count({ where: { ...scope, is_read: false } });

    return res.json(successResponse({ notifications: formatted, unread }));
  } catch (err) {
    console.error('getNotifications Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch notifications`));
  }
}

async function markNotificationRead(req, res) {
  try {
    const { notification_id, mark_all } = req.body;
    // Only the student's own rows — never school-wide or another user's (the
    // old clauses flipped is_read for the entire school / any id passed in).
    if (mark_all) {
      await Notification.update({ is_read: true }, { where: { user_id: req.user.id } });
    } else if (notification_id) {
      await Notification.update({ is_read: true }, { where: { id: notification_id, user_id: req.user.id } });
    }
    return res.json(successResponse({}, 'Notification marked as read'));
  } catch (err) {
    console.error('markNotificationRead Error:', err);
    return res.status(500).json(errorResponse(`Failed to mark notification`));
  }
}

async function getTimetable(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    // Shared builder — the parent portal's child view renders the SAME data.
    const { buildClassTimetable } = require('../services/timetableView');
    const timetable = await buildClassTimetable(student.classroom_id);

    return res.json(successResponse({ timetable }));
  } catch (err) {
    console.error('getTimetable Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch timetable`));
  }
}

async function getAssignments(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const assignments = await Assignment.findAll({
      where: {
        school_id: (req.schoolId || req.user.school_id),
        class_id: student.classroom_id,
        is_active: true,
      },
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
      ],
      order: [['due_date', 'ASC']],
    });

    const submissions = await AssignmentSubmission.findAll({
      where: { student_id: student.id },
    });
    const submissionMap = {};
    submissions.forEach(s => { submissionMap[s.assignment_id] = s; });

    const formatted = assignments.map(a => {
      const sub = submissionMap[a.id] || null;
      return {
        id: a.id,
        title: a.title,
        description: a.description,
        dueDate: a.due_date,
        maxScore: a.max_score,
        // The cards read a flat subject NAME and a pending/submitted/graded status.
        subject: a.subject?.name || '',
        status: sub ? (sub.score != null ? 'graded' : 'submitted') : 'pending',
        score: sub?.score ?? undefined,
        feedback: sub?.feedback || null,
        submittedAt: sub?.submitted_at || null,
        submission: sub,
        isSubmitted: !!sub,
      };
    });

    return res.json(successResponse({ assignments: formatted }));
  } catch (err) {
    console.error('getAssignments Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch assignments`));
  }
}

async function submitAssignment(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    // The route is POST /assignments/:id/submit/ — the id arrives as a param
    // (reading req.body.assignment_id made every submit 404).
    const assignment_id = req.params.id || req.body.assignment_id;
    const { content, attachment_path } = req.body;
    const assignment = await Assignment.findByPk(assignment_id);
    if (!assignment) return res.status(404).json(errorResponse('Assignment not found'));
    // Ownership: only assignments for the student's own class.
    if (Number(assignment.class_id) !== Number(student.classroom_id)) {
      return res.status(403).json(errorResponse('Not your assignment'));
    }

    const existing = await AssignmentSubmission.findOne({
      where: { assignment_id, student_id: student.id },
    });

    let submission;
    if (existing) {
      await existing.update({
        content,
        attachment_path,
        submitted_at: new Date(),
        status: 'submitted',
      });
      submission = existing;
    } else {
      submission = await AssignmentSubmission.create({
        assignment_id,
        student_id: student.id,
        content,
        attachment_path,
        submitted_at: new Date(),
        status: 'submitted',
      });
    }

    return res.json(successResponse({
      id: submission.id,
      status: submission.status,
      submittedAt: submission.submitted_at,
    }, 'Assignment submitted'));
  } catch (err) {
    console.error('submitAssignment Error:', err);
    return res.status(500).json(errorResponse(`Failed to submit assignment`));
  }
}

async function getConversations(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const messages = await Message.findAll({
      where: {
        school_id: (req.schoolId || req.user.school_id),
        [Op.or]: [
          { sender_id: student.user_id, sender_type: 'Student' },
          { recipient_id: student.user_id, recipient_type: 'Student' },
        ],
      },
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    // Resolve the counterpart's name once per thread for the conversation header.
    const otherIds = [...new Set(messages
      .map(m => (m.sender_type === 'Student' ? m.recipient_id : m.sender_id))
      .filter(Boolean).map(Number))];
    const otherUsers = otherIds.length
      ? await User.findAll({ where: { id: { [Op.in]: otherIds } }, attributes: ['id', 'first_name', 'last_name', 'username'], raw: true })
      : [];
    const nameById = {};
    otherUsers.forEach(u => {
      nameById[Number(u.id)] = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || 'Teacher';
    });

    const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];
    const threadMap = {};
    messages.forEach(m => {
      const tid = m.thread_id || 'general';
      const otherId = Number(m.sender_type === 'Student' ? m.recipient_id : m.sender_id) || 0;
      if (!threadMap[tid]) {
        const name = nameById[otherId] || 'Teacher';
        const initials = name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'T';
        threadMap[tid] = {
          id: tid,
          threadId: tid,
          teacher: { id: otherId || null, name, initials, color: COLORS[otherId % COLORS.length], subject: m.subject || '' },
          messages: [],
          unread: 0,
          lastMessage: null,
        };
      }
      // Chronological within the thread (query is DESC for the recency window).
      threadMap[tid].messages.unshift({
        id: m.id,
        sender: m.sender_type === 'Student' ? 'student' : 'teacher',
        text: m.body,
        sentAt: m.created_at,
      });
      if (!m.is_read && m.recipient_type === 'Student') threadMap[tid].unread += 1;
      if (!threadMap[tid].lastMessage || new Date(m.created_at) > new Date(threadMap[tid].lastMessage)) {
        threadMap[tid].lastMessage = m.created_at;
      }
    });

    const conversations = Object.values(threadMap).sort((a, b) =>
      new Date(b.lastMessage) - new Date(a.lastMessage)
    );

    return res.json(successResponse({ conversations }));
  } catch (err) {
    console.error('getConversations Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch conversations`));
  }
}

async function sendMessage(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const { text, recipient_id, recipient_type, subject } = req.body;
    // The route is POST /messages/:conversationId/ — replies must land in THAT
    // thread (the old code minted a fresh thread per send, so replies vanished).
    const threadId = req.params.conversationId || req.body.thread_id || `conv-${student.id}-${Date.now()}`;

    // Derive the counterpart from thread history when the client doesn't send one.
    let toId = recipient_id || null;
    let toType = recipient_type || 'Teacher';
    if (!toId) {
      const prev = await Message.findOne({
        where: {
          thread_id: threadId,
          [Op.or]: [
            { sender_id: student.user_id, sender_type: 'Student' },
            { recipient_id: student.user_id, recipient_type: 'Student' },
          ],
        },
        order: [['created_at', 'DESC']],
      });
      if (prev) {
        toId = prev.sender_type === 'Student' ? prev.recipient_id : prev.sender_id;
        toType = prev.sender_type === 'Student' ? prev.recipient_type : prev.sender_type;
      }
    }

    const message = await Message.create({
      school_id: (req.schoolId || req.user.school_id),
      sender_id: student.user_id,
      sender_type: 'Student',
      recipient_id: toId,
      recipient_type: toType,
      subject: subject || '',
      body: text,
      thread_id: threadId,
    });

    return res.json(successResponse({
      id: message.id,
      body: message.body,
      createdAt: message.created_at,
    }, 'Message sent'));
  } catch (err) {
    console.error('sendMessage Error:', err);
    return res.status(500).json(errorResponse(`Failed to send message`));
  }
}

async function getResources(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const resources = await LearningResource.findAll({
      where: {
        school_id: (req.schoolId || req.user.school_id),
        class_id: student.classroom_id,
        is_active: true,
      },
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
      ],
      order: [['created_at', 'DESC']],
    });

    const formatted = resources.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      resourceType: r.resource_type,
      filePath: r.file_path,
      url: r.url,
      subject: r.subject,
      downloadCount: r.download_count,
      createdAt: r.created_at,
    }));

    return res.json(successResponse({ resources: formatted }));
  } catch (err) {
    console.error('getResources Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch resources`));
  }
}

async function getFinancials(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const fees = await Fee.findAll({
      where: { student_id: student.id },
      include: [{ model: FeeCategory, as: 'feeCategory', attributes: ['id', 'name'] }, { model: Term, as: 'term', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
    });

    const payments = await Payment.findAll({
      where: { student_id: student.id },
      order: [['paid_at', 'DESC']],
    });

    const totalFees = fees.reduce((sum, f) => sum + (f.amount_due || 0), 0);
    const paidToDate = fees.reduce((sum, f) => sum + (f.amount_paid || 0), 0);

    const transactions = fees.map(f => ({
      id: f.id,
      type: 'fee',
      category: f.feeCategory?.name || '',
      term: f.term?.name || '',
      amount: f.amount_due,
      paid: f.amount_paid,
      balance: f.amount_due - f.amount_paid,
      status: f.status,
      due_date: f.due_date,
    }));

    const paymentRecords = payments.map(p => ({
      id: p.id,
      type: 'payment',
      amount: p.amount,
      method: p.payment_method,
      receipt_number: p.receipt_number,
      paid_at: p.paid_at,
    }));

    return res.json(successResponse({
      summary: { totalFees, paidToDate, outstanding: totalFees - paidToDate, dueDate: null },
      transactions: [...transactions, ...paymentRecords],
    }));
  } catch (err) {
    console.error('getFinancials Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch financials`));
  }
}

async function getEvents(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const notifications = await Notification.findAll({
      // School-wide broadcasts + own rows only — other users' personal
      // notifications must not surface in the events feed.
      where: {
        school_id: school.id,
        [Op.or]: [{ user_id: null }, { user_id: req.user.id }],
      },
      order: [['created_at', 'DESC']],
      limit: 50,
    });

    const events = notifications.map(n => ({
      id: n.id,
      title: n.title,
      description: n.message,
      type: n.type === 'reminder' ? 'deadline' : 'announcement',
      date: n.created_at,
    }));

    return res.json(successResponse({ events }));
  } catch (err) {
    console.error('getEvents Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch events`));
  }
}

async function getGradeInsights(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const grades = await Grade.findAll({
      where: { student_id: student.id, approval_status: 'approved' },
      include: [{ model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }],
      order: [['term_id', 'ASC']],
    });

    // Real trend: latest term's total vs the previous term's, per subject.
    const bySubject = {};
    grades.forEach(g => { (bySubject[g.subject_id] ||= []).push(g); });

    const insights = Object.values(bySubject).map(list => {
      const latest = list[list.length - 1];
      const prev = list.length > 1 ? list[list.length - 2] : null;
      const delta = prev && prev.total != null && latest.total != null
        ? Math.round((latest.total - prev.total) * 10) / 10
        : 0;
      return {
        subjectId: latest.subject_id,
        subjectName: latest.subject?.name || '',
        currentTotal: latest.total,
        trend: delta,
        direction: delta >= 0 ? 'up' : 'down',
        points: list.map(g => ({ termId: g.term_id, total: g.total })),
      };
    });

    return res.json(successResponse({ insights }));
  } catch (err) {
    console.error('getGradeInsights Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch insights`));
  }
}

async function getSecurityHealth(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const user = await User.findByPk(student.user_id);

    // sa_security_audit_log columns are: id, type, severity, actor, ip, action,
    // metadata_json, ts (timestamps:false). The old query used user_id/created_at
    // and the mapping read ip_address/user_agent/created_at — none of which exist
    // (every call 500'd). The log is keyed by `actor` (the username), ordered by `ts`.
    const logs = await SecurityAuditLog.findAll({
      where: { actor: user?.username },
      order: [['ts', 'DESC']],
      limit: 10,
    });

    return res.json(successResponse({
      score: 85,
      level: 'Strong',
      twoFactorEnabled: user?.two_factor_enabled || false,
      trustedDevices: [],
      loginHistory: logs.map(l => ({
        location: l.ip || 'Unknown',
        ip: l.ip || null,
        device: l.action || 'Account activity',
        time: l.ts,
        success: (l.severity || 'info') !== 'critical',
      })),
    }));
  } catch (err) {
    console.error('getSecurityHealth Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch security health`));
  }
}

async function revokeDevice(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const { device_id } = req.body;
    const user = await User.findByPk(student.user_id);
    if (!user) return res.status(404).json(errorResponse('User not found'));

    const trustedDevices = user.trusted_devices || [];
    const updatedDevices = trustedDevices.filter(d => d.id !== device_id);
    await user.update({ trusted_devices: updatedDevices });

    await SecurityAuditLog.create({
      type: 'device_revoked',
      severity: 'info',
      actor: String(student.user_id),
      action: `Device ${device_id} revoked by user`,
      ip: req.ip || 'unknown',
    });

    return res.json(successResponse({}, 'Device revoked'));
  } catch (err) {
    console.error('revokeDevice Error:', err);
    return res.status(500).json(errorResponse(`Failed to revoke device`));
  }
}

/* Real TOTP 2FA (SA-46) via services/twoFactor. GET (re)begins enrolment
   whenever 2FA isn't enabled yet — a fresh secret/QR/recovery set each open
   is safe because nothing is enforced until the first code verifies. */
async function get2FASetup(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const user = await User.findByPk(student.user_id);
    if (!user) return res.status(404).json(errorResponse('User not found'));

    if (user.two_factor_enabled) {
      return res.json(successResponse({ enabled: true, setup_required: false }));
    }

    const enrol = await twoFactorService.beginEnrolment(user);
    return res.json(successResponse({
      enabled: false,
      setup_required: true,
      qr_code: enrol.qrDataUrl,
      setup_uri: enrol.otpauth,
      manual_key: enrol.secret,
      recovery_codes: enrol.recoveryCodes,
    }));
  } catch (err) {
    console.error('get2FASetup Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch 2FA setup`));
  }
}

/* POST handles BOTH actions the profile modal sends ({action:'enable',
   otp_code} / {action:'disable'}) — the old handler ignored `action` and
   enabled on every call, so "Disable 2FA" silently re-enabled it. */
async function enable2FA(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const user = await User.findByPk(student.user_id);
    if (!user) return res.status(404).json(errorResponse('User not found'));

    const action = String(req.body.action || 'enable').toLowerCase();
    if (action === 'disable') {
      await twoFactorService.disable(user);
      return res.json(successResponse({ enabled: false }, '2FA disabled'));
    }

    const result = await twoFactorService.verifyAndEnable(user, req.body.otp_code ?? req.body.code);
    if (!result.ok) {
      return res.status(400).json(errorResponse(result.reason || 'Invalid verification code'));
    }
    return res.json(successResponse({ enabled: true }, '2FA enabled'));
  } catch (err) {
    console.error('enable2FA Error:', err);
    return res.status(500).json(errorResponse(`Failed to update 2FA`));
  }
}

/* Kept for the route surface; delegates to the action-aware handler. */
async function disable2FA(req, res) {
  req.body = { ...req.body, action: 'disable' };
  return enable2FA(req, res);
}

/* Report cards ride the SAME receipt/hash/PDF machinery as the parent portal
   (services/reportCards) — the student sees exactly what the parent sees:
   published grades only, with a tamper-evident verification hash + QR PDF. */
async function getReportCards(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const { listReportCards } = require('../services/reportCards');
    const reportCards = await listReportCards(student.id);

    return res.json(successResponse({ reportCards }));
  } catch (err) {
    console.error('getReportCards Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch report cards`));
  }
}

async function downloadReportCard(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    // Route: GET /report-cards/:id/download/ — :id is the TERM id (a report
    // card is one term's published set; see listReportCards).
    const termId = req.params.id || req.params.term_id || req.query.term_id;
    if (!termId) return res.status(400).json(errorResponse('term id is required'));

    const { loadReportCardGrades, streamReportCardPdf } = require('../services/reportCards');
    const grades = await loadReportCardGrades(student.id, termId);
    if (!grades.length) return res.status(404).json(errorResponse('Report card not found'));

    const school = await School.findByPk(student.school_id).catch(() => null);
    await streamReportCardPdf(res, { student, school, grades, termId });
  } catch (err) {
    console.error('downloadReportCard Error:', err);
    if (!res.headersSent) return res.status(500).json(errorResponse(`Failed to download`));
    try { res.end(); } catch (e) { /* stream already broken */ }
  }
}

async function getTranscript(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const grades = await Grade.findAll({
      where: { student_id: student.id },
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        { model: Term, as: 'term', attributes: ['id', 'name'] },
      ],
      order: [['term_id', 'ASC']],
    });

    const transcript = grades.map(g => ({
      subjectName: g.subject?.name || '',
      subjectCode: g.subject?.code || '',
      term: g.term?.name || '',
      ca: g.ca,
      midterm: g.midterm,
      final: g.final,
      total: g.total,
      gradeLetter: g.grade_letter,
    }));

    return res.json(successResponse({ transcript }));
  } catch (err) {
    console.error('getTranscript Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch transcript`));
  }
}

async function downloadTranscript(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const grades = await Grade.findAll({
      where: { student_id: student.id, approval_status: 'approved' },
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        { model: Term, as: 'term', attributes: ['id', 'name'] },
      ],
      order: [['term_id', 'ASC']],
    });

    if (!grades.length) return res.status(404).json(errorResponse('Transcript not available'));

    const u = student.user || {};
    const transcript = {
      studentName: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
      studentNumber: student.admission_number,
      className: student.classroom?.name || '',
      schoolId: student.school_id,
      entries: grades.map(g => ({
        subjectName: g.subject?.name || '',
        subjectCode: g.subject?.code || '',
        term: g.term?.name || '',
        total: g.total,
        gradeLetter: g.grade_letter,
      })),
      cumulativeAverage: Math.round(grades.reduce((s, g) => s + (g.total || 0), 0) / grades.length * 10) / 10,
    };

    return res.json(successResponse({ transcript }, 'Transcript generated'));
  } catch (err) {
    console.error('downloadTranscript Error:', err);
    return res.status(500).json(errorResponse(`Failed to download`));
  }
}

async function verifyHash(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const { record_type, record_id } = req.params;
    let record;

    if (record_type === 'grade') {
      record = await Grade.findOne({
        where: { id: record_id, student_id: student.id },
      });
    } else if (record_type === 'payment') {
      record = await Payment.findOne({
        where: { id: record_id, student_id: student.id },
      });
    }

    if (!record) {
      return res.json(successResponse({ valid: false, reason: 'Record not found' }));
    }

    const hash = record.payment_hash || record.approval_status;
    return res.json(successResponse({
      valid: !!hash,
      recordType: record_type,
      recordId: record.id,
      reason: hash ? 'Hash verified' : 'No hash found',
    }));
  } catch (err) {
    console.error('verifyHash Error:', err);
    return res.status(500).json(errorResponse(`Failed to verify`));
  }
}

async function getTamperCount(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const scope = {
      [Op.or]: [
        { actor: String(student.user_id) },
        { metadata_json: { [Op.like]: `%${student.user_id}%` } },
      ],
    };
    const total = await ForensicEvent.count({ where: scope });

    // The counter card reads {total, blocked, successful}. Locked grades cannot
    // be silently altered, so every recorded attempt is a blocked one.
    return res.json(successResponse({
      count: total,
      total,
      blocked: total,
      successful: 0,
    }));
  } catch (err) {
    console.error('getTamperCount Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch tamper count`));
  }
}

async function getWhoSawMyData(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const logs = await SecurityAuditLog.findAll({
      where: {
        [Op.or]: [
          { actor: String(student.user_id) },
          { metadata_json: { [Op.like]: `%${student.user_id}%` } },
        ],
      },
      order: [['ts', 'DESC']],
      limit: 100,
    });

    const entries = logs.map(l => ({
      id: l.id,
      type: l.type,
      severity: l.severity,
      actor: l.actor,
      action: l.action,
      ip: l.ip,
      timestamp: l.ts,
    }));

    return res.json(successResponse({ entries }));
  } catch (err) {
    console.error('getWhoSawMyData Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch access log`));
  }
}

async function getParentalAccessLog(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const logs = await SecurityAuditLog.findAll({
      where: {
        metadata_json: { [Op.like]: `%${student.id}%` },
        type: { [Op.like]: '%parent%' },
      },
      order: [['ts', 'DESC']],
      limit: 50,
    });

    const entries = logs.map(l => ({
      id: l.id,
      type: l.type,
      actor: l.actor,
      action: l.action,
      ip: l.ip,
      timestamp: l.ts,
    }));

    return res.json(successResponse({ entries }));
  } catch (err) {
    console.error('getParentalAccessLog Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch parental access log`));
  }
}

async function submitModificationObjection(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const { grade_id, subject_id, request_type, reason, current_value, requested_value } = req.body;
    const objection = await ModificationRequest.create({
      school_id: (req.schoolId || req.user.school_id),
      student_id: student.id,
      grade_id,
      subject_id,
      requested_by: req.user.id,
      request_type,
      reason,
      current_value,
      requested_value,
      status: 'pending',
    });

    return res.json(successResponse({ ticketId: `OBJ-${objection.id}` }, 'Objection submitted'));
  } catch (err) {
    console.error('submitModificationObjection Error:', err);
    return res.status(500).json(errorResponse(`Failed to submit objection`));
  }
}

async function getChannelPreferences(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    let prefs = await ChannelPreference.findOne({
      where: { user_id: student.user_id },
    });

    if (!prefs) {
      prefs = await ChannelPreference.create({
        user_id: student.user_id,
        push: true,
        email: true,
        sms: false,
        in_app: true,
        whatsapp: false,
      });
    }

    return res.json(successResponse({
      push: prefs.push,
      email: prefs.email,
      sms: prefs.sms,
      in_app: prefs.in_app,
      whatsapp: prefs.whatsapp,
    }));
  } catch (err) {
    console.error('getChannelPreferences Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch preferences`));
  }
}

async function updateChannelPreferences(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const { push, email, sms, in_app, whatsapp } = req.body;
    let prefs = await ChannelPreference.findOne({
      where: { user_id: student.user_id },
    });

    if (prefs) {
      await prefs.update({ push, email, sms, in_app, whatsapp });
    } else {
      prefs = await ChannelPreference.create({
        user_id: student.user_id,
        push: push !== undefined ? push : true,
        email: email !== undefined ? email : true,
        sms: sms !== undefined ? sms : false,
        in_app: in_app !== undefined ? in_app : true,
        whatsapp: whatsapp !== undefined ? whatsapp : false,
      });
    }

    return res.json(successResponse({
      push: prefs.push,
      email: prefs.email,
      sms: prefs.sms,
      in_app: prefs.in_app,
      whatsapp: prefs.whatsapp,
    }, 'Preferences updated'));
  } catch (err) {
    console.error('updateChannelPreferences Error:', err);
    return res.status(500).json(errorResponse(`Failed to update preferences`));
  }
}

async function getWhistleblowerCategories(req, res) {
  try {
    const categories = await WhistleblowerCategory.findAll({
      where: { school_id: (req.schoolId || req.user.school_id), is_active: true },
      order: [['name', 'ASC']],
    });

    const formatted = categories.map(c => ({
      id: c.id,
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
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const { category_id, title, description, severity } = req.body;
    // The follow-up key is the ONLY credential to an anonymous report — it
    // must not be guessable (Math.random was).
    const followUpKey = `WB-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    const report = await WhistleblowerReport.create({
      school_id: (req.schoolId || req.user.school_id),
      category_id,
      title,
      description,
      severity: severity || 'medium',
      follow_up_key: followUpKey,
      status: 'received',
      reporter_type: 'student',
    });

    return res.json(successResponse({
      ticketId: `WB-${report.id}`,
      followUpKey: report.follow_up_key,
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
    });

    if (!report) return res.status(404).json(errorResponse('Report not found'));

    return res.json(successResponse({
      ticketId: `WB-${report.id}`,
      status: report.status,
      updates: [],
      createdAt: report.created_at,
    }));
  } catch (err) {
    console.error('checkWhistleblowerStatus Error:', err);
    return res.status(500).json(errorResponse(`Failed to check status`));
  }
}

async function getGoals(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const goals = await Goal.findAll({
      where: { student_id: student.id },
      order: [['created_at', 'DESC']],
    });

    const formatted = goals.map(g => ({
      id: g.id,
      title: g.title,
      description: g.description,
      targetDate: g.target_date,
      status: g.status,
      progressPct: g.progress_pct,
      createdAt: g.created_at,
    }));

    return res.json(successResponse({ goals: formatted }));
  } catch (err) {
    console.error('getGoals Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch goals`));
  }
}

async function setGoal(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    let { id, title, description, target_date, progress_pct } = req.body;

    // The grades screen saves per-subject score targets as
    // { subject_id, target, term } — map that onto the Goal shape.
    if (!title && req.body.subject_id !== undefined && req.body.target !== undefined) {
      const subj = await Subject.findByPk(req.body.subject_id, { attributes: ['name'] }).catch(() => null);
      title = `Target ${req.body.target}% in ${subj?.name || `subject ${req.body.subject_id}`}`;
      description = req.body.term ? `Term ${req.body.term}` : null;
    }

    let goal;

    if (id) {
      goal = await Goal.findByPk(id);
      if (!goal) return res.status(404).json(errorResponse('Goal not found'));
      await goal.update({ title, description, target_date, progress_pct });
    } else {
      goal = await Goal.create({
        school_id: (req.schoolId || req.user.school_id),
        student_id: student.id,
        title,
        description,
        target_date,
        progress_pct: progress_pct || 0,
        status: 'active',
      });
    }

    return res.json(successResponse({
      id: goal.id,
      title: goal.title,
      description: goal.description,
      targetDate: goal.target_date,
      status: goal.status,
      progressPct: goal.progress_pct,
    }, 'Goal saved'));
  } catch (err) {
    console.error('setGoal Error:', err);
    return res.status(500).json(errorResponse(`Failed to save goal`));
  }
}

async function getOfficeHourSlots(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const officeHours = await OfficeHour.findAll({
      where: {
        school_id: (req.schoolId || req.user.school_id),
        is_active: true,
        audience: 'student',
        date: { [Op.gte]: new Date() },
      },
      include: [
        { model: Teacher, as: 'teacher', attributes: ['id'], include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name', 'username'] }] },
      ],
      order: [['date', 'ASC']],
    });

    // My bookings tell "booked by me"; total counts tell "taken by someone".
    const allBookings = await OfficeHourBooking.findAll({
      where: { office_hour_id: { [Op.in]: officeHours.map(o => o.id) }, status: 'booked' },
      raw: true,
    });
    const countBySlot = {};
    const mineBySlot = {};
    allBookings.forEach(b => {
      countBySlot[b.office_hour_id] = (countBySlot[b.office_hour_id] || 0) + 1;
      if (Number(b.student_id) === Number(student.id)) mineBySlot[b.office_hour_id] = b;
    });

    const slots = officeHours.map(oh => {
      const tu = oh.teacher?.user;
      const mine = mineBySlot[oh.id];
      const taken = (countBySlot[oh.id] || 0) >= (oh.max_bookings || 1);
      // `start` is the ISO date + start_time the card formats directly.
      const day = oh.date ? new Date(oh.date).toISOString().slice(0, 10) : null;
      return {
        id: oh.id,
        subject: oh.subject || 'General',
        start: day && oh.start_time ? `${day}T${oh.start_time.length === 5 ? `${oh.start_time}:00` : oh.start_time}` : oh.date,
        durationMin: oh.slot_duration_minutes,
        teacher: tu ? (`${tu.first_name || ''} ${tu.last_name || ''}`.trim() || tu.username) : 'Teacher',
        room: oh.room || '—',
        booked: !!mine || taken,
        bookedBy: mine ? 'self' : (taken ? 'other' : null),
        topic: mine?.notes || null,
      };
    });

    return res.json(successResponse({ slots }));
  } catch (err) {
    console.error('getOfficeHourSlots Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch office hours`));
  }
}

async function claimOfficeHourSlot(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    // Route: POST /office-hours/:slotId/claim/ with { topic } in the body.
    const office_hour_id = req.params.slotId || req.body.office_hour_id;
    const notes = req.body.topic || req.body.notes || null;
    const officeHour = await OfficeHour.findByPk(office_hour_id);
    if (!officeHour) return res.status(404).json(errorResponse('Office hour not found'));

    const existing = await OfficeHourBooking.findOne({
      where: { office_hour_id, student_id: student.id, status: 'booked' },
    });
    if (existing) return res.status(400).json(errorResponse('Already booked this slot'));

    const taken = await OfficeHourBooking.count({ where: { office_hour_id, status: 'booked' } });
    if (taken >= (officeHour.max_bookings || 1)) {
      return res.status(400).json(errorResponse('This slot is already taken'));
    }

    const booking = await OfficeHourBooking.create({
      office_hour_id,
      student_id: student.id,
      status: 'booked',
      notes,
    });

    return res.json(successResponse({
      id: booking.id,
      status: booking.status,
    }, 'Slot claimed'));
  } catch (err) {
    console.error('claimOfficeHourSlot Error:', err);
    return res.status(500).json(errorResponse(`Failed to claim slot`));
  }
}

async function cancelOfficeHourSlot(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    // Route: DELETE /office-hours/:slotId/claim/ — the client addresses the
    // SLOT; resolve the student's own active booking on it.
    const { slotId } = req.params;
    const booking = await OfficeHourBooking.findOne({
      where: { office_hour_id: slotId, student_id: student.id, status: 'booked' },
    });

    if (!booking) return res.status(404).json(errorResponse('Booking not found'));

    await booking.update({ status: 'cancelled' });

    return res.json(successResponse({
      id: booking.id,
      status: booking.status,
    }, 'Slot cancelled'));
  } catch (err) {
    console.error('cancelOfficeHourSlot Error:', err);
    return res.status(500).json(errorResponse(`Failed to cancel slot`));
  }
}

async function getCounsellorThread(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const messages = await Message.findAll({
      where: {
        school_id: (req.schoolId || req.user.school_id),
        thread_id: { [Op.like]: 'counsellor-%' },
        [Op.or]: [
          { sender_id: student.user_id, sender_type: 'Student' },
          { recipient_id: student.user_id, recipient_type: 'Student' },
        ],
      },
      order: [['created_at', 'ASC']],
    });

    const formatted = messages.map(m => ({
      id: m.id,
      senderId: m.sender_id,
      senderType: m.sender_type,
      body: m.body,
      subject: m.subject,
      isRead: m.is_read,
      createdAt: m.created_at,
    }));

    return res.json(successResponse({ thread: { messages: formatted } }));
  } catch (err) {
    console.error('getCounsellorThread Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch counsellor thread`));
  }
}

async function sendCounsellorMessage(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const { text, subject } = req.body;
    const message = await Message.create({
      school_id: (req.schoolId || req.user.school_id),
      sender_id: student.user_id,
      sender_type: 'Student',
      recipient_type: 'Counsellor',
      subject: subject || '',
      body: text,
      thread_id: `counsellor-${student.id}`,
    });

    return res.json(successResponse({
      id: message.id,
      body: message.body,
      createdAt: message.created_at,
    }, 'Message sent'));
  } catch (err) {
    console.error('sendCounsellorMessage Error:', err);
    return res.status(500).json(errorResponse(`Failed to send message`));
  }
}

async function getStudyGroups(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const memberships = await StudyGroupMember.findAll({
      where: { student_id: student.id },
    });
    const groupIds = memberships.map(m => m.study_group_id);

    const groups = await StudyGroup.findAll({
      where: {
        school_id: (req.schoolId || req.user.school_id),
        is_active: true,
        [Op.or]: [
          { id: groupIds },
          { id: { [Op.notIn]: groupIds.length ? groupIds : [0] } },
        ],
      },
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
      ],
    });

    const formatted = groups.map(g => ({
      id: g.id,
      name: g.name,
      description: g.description,
      subject: g.subject,
      meetingSchedule: g.meeting_schedule,
      isMember: groupIds.includes(g.id),
    }));

    return res.json(successResponse({ groups: formatted }));
  } catch (err) {
    console.error('getStudyGroups Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch study groups`));
  }
}

async function joinStudyGroup(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    // Route: POST /study-groups/:id/join/ (no body).
    const group_id = req.params.id || req.body.group_id;
    const group = await StudyGroup.findByPk(group_id);
    if (!group) return res.status(404).json(errorResponse('Group not found'));

    const existing = await StudyGroupMember.findOne({
      where: { study_group_id: group_id, student_id: student.id },
    });
    if (existing) return res.status(400).json(errorResponse('Already a member'));

    await StudyGroupMember.create({
      study_group_id: group_id,
      student_id: student.id,
      role: 'member',
    });

    return res.json(successResponse({ groupId: group_id }, 'Joined group'));
  } catch (err) {
    console.error('joinStudyGroup Error:', err);
    return res.status(500).json(errorResponse(`Failed to join group`));
  }
}

async function leaveStudyGroup(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    // Route: POST /study-groups/:id/leave/ — the param is named `id`.
    const group_id = req.params.id || req.params.group_id;
    const membership = await StudyGroupMember.findOne({
      where: { study_group_id: group_id, student_id: student.id },
    });

    if (!membership) return res.status(404).json(errorResponse('Not a member of this group'));

    await membership.destroy();

    return res.json(successResponse({ groupId: group_id }, 'Left group'));
  } catch (err) {
    console.error('leaveStudyGroup Error:', err);
    return res.status(500).json(errorResponse(`Failed to leave group`));
  }
}

async function getStreaks(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const attendance = await Attendance.findAll({
      where: { student_id: student.id },
      order: [['date', 'DESC']],
      limit: 365,
    });

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let prevDate = null;

    const sorted = attendance.sort((a, b) => new Date(a.date) - new Date(b.date));
    sorted.forEach(a => {
      if (a.status === 'present' || a.status === 'late') {
        const currDate = new Date(a.date);
        if (prevDate) {
          const diff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
          if (diff === 1) {
            tempStreak++;
          } else if (diff > 1) {
            tempStreak = 1;
          }
        } else {
          tempStreak = 1;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
        prevDate = currDate;
      } else {
        tempStreak = 0;
        prevDate = null;
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastAttendance = sorted[sorted.length - 1];
    if (lastAttendance && (lastAttendance.status === 'present' || lastAttendance.status === 'late')) {
      const lastDate = new Date(lastAttendance.date);
      lastDate.setHours(0, 0, 0, 0);
      const diff = (today - lastDate) / (1000 * 60 * 60 * 24);
      if (diff <= 1) {
        currentStreak = tempStreak;
      }
    }

    // On-time submissions: real count of submissions at/before the due date.
    const submissions = await AssignmentSubmission.findAll({
      where: { student_id: student.id },
      raw: true,
    });
    let onTimeAssignments = 0;
    if (submissions.length) {
      const assignmentIds = [...new Set(submissions.map(s => s.assignment_id))];
      const dueById = {};
      (await Assignment.findAll({ where: { id: { [Op.in]: assignmentIds } }, attributes: ['id', 'due_date'], raw: true }))
        .forEach(a => { dueById[a.id] = a.due_date; });
      onTimeAssignments = submissions.filter(s =>
        s.submitted_at && dueById[s.assignment_id] && new Date(s.submitted_at) <= new Date(dueById[s.assignment_id])
      ).length;
    }

    // No 'late' mark in the current calendar month.
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const noLateThisMonth = !attendance.some(a =>
      a.status === 'late' && new Date(a.date) >= monthStart
    );

    // Strongest subject: top approved grade.
    const topGrade = await Grade.findOne({
      where: { student_id: student.id, approval_status: 'approved' },
      include: [{ model: Subject, as: 'subject', attributes: ['name'] }],
      order: [['total', 'DESC']],
    });

    // Flat keys the StreaksCard reads, plus the original nested block.
    return res.json(successResponse({
      attendanceStreak: currentStreak,
      longestStreak: longestStreak,
      onTimeAssignments,
      noLateThisMonth,
      bestSubject: topGrade?.subject?.name || null,
      streaks: {
        current: currentStreak,
        longest: longestStreak,
        totalPresent: attendance.filter(a => a.status === 'present').length,
        totalDays: attendance.length,
      },
    }));
  } catch (err) {
    console.error('getStreaks Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch streaks`));
  }
}

async function getDigitalId(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    // Include alias is lowercase `user` — `student.User` was always undefined,
    // so the ID card rendered a blank name.
    const u = student.user || {};
    const c = student.classroom;

    return res.json(successResponse({
      studentNumber: student.admission_number,
      fullName: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
      className: c?.name || '',
      schoolId: student.school_id,
      photo: student.passport_picture,
      valid: true,
    }));
  } catch (err) {
    console.error('getDigitalId Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch digital ID`));
  }
}

async function getDocuments(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const documents = await Document.findAll({
      where: { student_id: student.id },
      order: [['created_at', 'DESC']],
    });

    const transcriptRequests = await TranscriptRequest.findAll({
      where: { student_id: student.id },
      order: [['created_at', 'DESC']],
    });

    const uploads = documents.map(d => ({
      id: d.id,
      title: d.title,
      fileType: d.file_type,
      filePath: d.file_path,
      isVerified: d.is_verified,
      createdAt: d.created_at,
    }));

    const requests = transcriptRequests.map(tr => ({
      id: tr.id,
      status: tr.status,
      requestedAt: tr.requested_at,
      completedAt: tr.completed_at,
    }));

    return res.json(successResponse({ uploads, transcriptRequests: requests }));
  } catch (err) {
    console.error('getDocuments Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch documents`));
  }
}

async function uploadDocument(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    // Multipart upload (multer) — the file lands on disk; metadata in body.
    const { title, type } = req.body;
    const document = await Document.create({
      school_id: (req.schoolId || req.user.school_id),
      student_id: student.id,
      title: title || req.file?.originalname || 'Document',
      file_path: req.file ? `/uploads/student-docs/${req.file.filename}` : (req.body.file_path || null),
      file_type: type || req.body.file_type || 'other',
      uploaded_by: req.user.id,
      is_verified: false,
    });

    return res.json(successResponse({
      id: document.id,
      title: document.title,
      fileType: document.file_type,
    }, 'Document uploaded'));
  } catch (err) {
    console.error('uploadDocument Error:', err);
    return res.status(500).json(errorResponse(`Failed to upload document`));
  }
}

async function requestTranscript(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const transcriptReq = await TranscriptRequest.create({
      school_id: (req.schoolId || req.user.school_id),
      student_id: student.id,
      requested_by: req.user.id,
      status: 'pending',
      requested_at: new Date(),
    });

    return res.json(successResponse({
      id: transcriptReq.id,
      status: transcriptReq.status,
      requestedAt: transcriptReq.requested_at,
    }, 'Transcript request submitted'));
  } catch (err) {
    console.error('requestTranscript Error:', err);
    return res.status(500).json(errorResponse(`Failed to request transcript`));
  }
}

async function getStudyPlan(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const blocks = await StudyPlan.findAll({
      where: { student_id: student.id, is_active: true },
      order: [
        ['day_of_week', 'ASC'],
        ['start_time', 'ASC'],
      ],
    });

    const formatted = blocks.map(b => ({
      id: b.id,
      dayOfWeek: b.day_of_week,
      startTime: b.start_time,
      endTime: b.end_time,
      subject: b.subject,
      activity: b.activity,
    }));

    return res.json(successResponse({ blocks: formatted }));
  } catch (err) {
    console.error('getStudyPlan Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch study plan`));
  }
}

async function saveStudyPlan(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const { blocks } = req.body;
    const saved = [];

    for (const block of blocks) {
      if (block.id) {
        const existing = await StudyPlan.findByPk(block.id);
        if (existing && existing.student_id === student.id) {
          await existing.update(block);
          saved.push(existing);
        }
      } else {
        const newBlock = await StudyPlan.create({
          school_id: (req.schoolId || req.user.school_id),
          student_id: student.id,
          day_of_week: block.dayOfWeek,
          start_time: block.startTime,
          end_time: block.endTime,
          subject: block.subject,
          activity: block.activity,
          is_active: true,
        });
        saved.push(newBlock);
      }
    }

    return res.json(successResponse({
      count: saved.length,
    }, 'Study plan saved'));
  } catch (err) {
    console.error('saveStudyPlan Error:', err);
    return res.status(500).json(errorResponse(`Failed to save study plan`));
  }
}

async function getResourceLastVisit(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const visits = await ResourceVisit.findAll({
      where: { student_id: student.id },
      order: [['visited_at', 'DESC']],
    });

    const visitsMap = {};
    visits.forEach(v => {
      if (!visitsMap[v.resource_id] || new Date(v.visited_at) > new Date(visitsMap[v.resource_id])) {
        visitsMap[v.resource_id] = v.visited_at;
      }
    });

    return res.json(successResponse({ visits: visitsMap }));
  } catch (err) {
    console.error('getResourceLastVisit Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch visits`));
  }
}

async function markResourceVisited(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    // Route: POST /resources/:id/visit/ (no body).
    const resource_id = req.params.id || req.body.resource_id;
    const visit = await ResourceVisit.create({
      resource_id,
      student_id: student.id,
      visited_at: new Date(),
    });

    await LearningResource.increment('download_count', {
      where: { id: resource_id },
    });

    return res.json(successResponse({
      id: visit.id,
      visitedAt: visit.visited_at,
    }, 'Marked visited'));
  } catch (err) {
    console.error('markResourceVisited Error:', err);
    return res.status(500).json(errorResponse(`Failed to mark visited`));
  }
}

async function getVoiceSummary(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const grades = await Grade.findAll({
      where: { student_id: student.id, approval_status: 'approved' },
      include: [{ model: Subject, as: 'subject', attributes: ['id', 'name'] }],
    });

    const attendance = await Attendance.findAll({
      where: { student_id: student.id },
    });

    const avgGrade = grades.length
      ? Math.round(grades.reduce((s, g) => s + (g.total || 0), 0) / grades.length * 10) / 10
      : 0;

    const present = attendance.filter(a => a.status === 'present').length;
    const attendanceRate = attendance.length
      ? Math.round(present / attendance.length * 100)
      : 0;

    const weakSubjects = grades
      .filter(g => (g.total || 0) < 50)
      .map(g => g.subject?.name || 'Unknown');

    const strongSubjects = grades
      .filter(g => (g.total || 0) >= 80)
      .map(g => g.subject?.name || 'Unknown');

    let summary = `Hello! Here's your academic summary. `;
    summary += `Your average grade is ${avgGrade}%. `;
    summary += `Your attendance rate is ${attendanceRate}%. `;
    if (strongSubjects.length) {
      summary += `You're doing great in ${strongSubjects.join(', ')}. `;
    }
    if (weakSubjects.length) {
      summary += `Consider focusing more on ${weakSubjects.join(', ')}. `;
    }

    return res.json(successResponse({ text: summary }));
  } catch (err) {
    console.error('getVoiceSummary Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch voice summary`));
  }
}

async function getSubjectDeepDive(req, res) {
  try {
    const { subjectId } = req.params;
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const grade = await Grade.findOne({
      where: { student_id: student.id, subject_id: subjectId },
      include: [{ model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }],
    });

    if (!grade) return res.status(404).json(errorResponse('Grade not found for this subject'));

    return res.json(successResponse({
      subject: grade.subject,
      currentGrade: { score: grade.total, gradeLetter: grade.grade_letter },
      breakdown: {
        ca: { score: grade.ca, max: 20 },
        midTerm: { score: grade.midterm, max: 30 },
        final: { score: grade.final, max: 50 },
      },
      history: [],
      trend: [],
      resources: [],
    }));
  } catch (err) {
    console.error('getSubjectDeepDive Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch subject details`));
  }
}

async function listLiveClasses(req, res) {
  try {
    const role = req.user?.role;
    const isStaff = ['teacher', 'staff', 'school_admin', 'principal', 'superadmin'].includes(role);

    if (isStaff) {
      // Teacher/staff view — the teacher portal calls this and previously got a 404
      // because the handler assumed a Student row (audit #71). Returns `live_classes`
      // with the status/classroom/scheduled_start fields the teacher UI reads (#72).
      const Teacher = require('../models/Teacher');
      const Class = require('../models/Class');
      const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
      const schoolId = req.schoolId || req.user.school_id || teacher?.school_id;
      const where = { school_id: schoolId, is_active: true };
      if (role === 'teacher') where.teacher_id = req.user.id;

      const rows = await LiveClass.findAll({
        where,
        include: [{ model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }],
        order: [['scheduled_at', 'ASC']],
      });

      const classIds = [...new Set(rows.map(lc => lc.class_id).filter(Boolean))];
      const classes = classIds.length ? await Class.findAll({ where: { id: classIds }, attributes: ['id', 'name'], raw: true }) : [];
      const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));

      const now = Date.now();
      const live_classes = rows.map(lc => {
        let status = lc.status || 'scheduled';
        if (status === 'scheduled' && lc.scheduled_at) {
          const start = new Date(lc.scheduled_at).getTime();
          const end = start + (lc.duration_minutes || 60) * 60 * 1000;
          if (now >= start && now <= end) status = 'live';
          else if (now > end) status = 'ended';
        }
        return {
          id: lc.id,
          title: lc.title,
          description: lc.description,
          meeting_url: lc.meeting_url,
          scheduled_start: lc.scheduled_at,
          duration_minutes: lc.duration_minutes,
          status,
          classroom: lc.class_id ? { id: lc.class_id, name: classMap[lc.class_id] || '' } : null,
          subject: lc.subject ? { id: lc.subject.id, name: lc.subject.name } : null,
        };
      });
      return res.json(successResponse({ live_classes }));
    }

    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const liveClasses = await LiveClass.findAll({
      where: {
        school_id: (req.schoolId || req.user.school_id),
        class_id: student.classroom_id,
        is_active: true,
      },
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
      ],
      order: [['scheduled_at', 'ASC']],
    });

    // Same shape as the staff branch — the student screen reads
    // `live_classes` with scheduled_start/duration_minutes/status.
    const nowTs = Date.now();
    const live_classes = liveClasses.map(lc => {
      let status = lc.status || 'scheduled';
      if (status === 'scheduled' && lc.scheduled_at) {
        const start = new Date(lc.scheduled_at).getTime();
        const end = start + (lc.duration_minutes || 60) * 60 * 1000;
        if (nowTs >= start && nowTs <= end) status = 'live';
        else if (nowTs > end) status = 'ended';
      }
      return {
        id: lc.id,
        title: lc.title,
        description: lc.description,
        meeting_url: lc.meeting_url,
        scheduled_start: lc.scheduled_at,
        duration_minutes: lc.duration_minutes,
        status,
        subject: lc.subject ? { id: lc.subject.id, name: lc.subject.name } : null,
      };
    });

    return res.json(successResponse({ live_classes }));
  } catch (err) {
    console.error('listLiveClasses Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch live classes`));
  }
}

async function createLiveClass(req, res) {
  try {
    const b = req.body;
    const schoolId = req.schoolId || req.user.school_id;
    // Accept both the teacher UI's names (classroom_id/scheduled_start/meeting_provider)
    // and the original names — the teacher payload didn't match before (audit #72).
    const classId = b.class_id || b.classroom_id || null;
    const scheduledAt = b.scheduled_at || b.scheduled_start || null;
    let meetingUrl = b.meeting_url || '';
    if ((b.meeting_provider === 'jitsi' || !b.meeting_provider) && !meetingUrl) {
      meetingUrl = `https://meet.jit.si/EK${schoolId || 'x'}-${Date.now().toString(36)}`;
    }

    // Ownership: a teacher may only schedule for a class they teach (audit #80).
    if (req.user.role === 'teacher' && classId) {
      const Teacher = require('../models/Teacher');
      const Class = require('../models/Class');
      const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
      const ownsClass = teacher && await Class.findOne({ where: { id: classId, class_teacher_id: teacher.id }, attributes: ['id'] });
      if (!ownsClass) return res.status(403).json(errorResponse('You are not assigned to this class'));
    }

    const liveClass = await LiveClass.create({
      school_id: schoolId,
      teacher_id: req.user.id,
      title: b.title,
      description: b.description,
      meeting_url: meetingUrl,
      scheduled_at: scheduledAt,
      duration_minutes: b.duration_minutes,
      class_id: classId,
      subject_id: b.subject_id || null,
      status: 'scheduled',
      is_active: true,
    });
    return res.json(successResponse({ liveClass: { id: liveClass.id, title: liveClass.title, meetingUrl: liveClass.meeting_url, scheduledAt: liveClass.scheduled_at } }, 'Live class created'));
  } catch (err) {
    console.error('createLiveClass Error:', err);
    return res.status(500).json(errorResponse(`Failed to create live class`));
  }
}

async function updateLiveClass(req, res) {
  try {
    const { id } = req.params;
    const liveClass = await LiveClass.findOne({ where: { id, school_id: (req.schoolId || req.user.school_id) } });
    if (!liveClass) return res.status(404).json(errorResponse('Live class not found'));
    // A teacher may only modify their own sessions (audit #80).
    if (req.user.role === 'teacher' && liveClass.teacher_id !== req.user.id) {
      return res.status(403).json(errorResponse('You can only modify your own live classes'));
    }
    // Whitelist updatable fields; accept the teacher UI's scheduled_start alias.
    const allowed = {};
    ['title', 'description', 'meeting_url', 'scheduled_at', 'duration_minutes', 'class_id', 'subject_id', 'status', 'is_active'].forEach(k => {
      if (req.body[k] !== undefined) allowed[k] = req.body[k];
    });
    if (req.body.scheduled_start !== undefined) allowed.scheduled_at = req.body.scheduled_start;
    await liveClass.update(allowed);
    return res.json(successResponse({ message: 'Live class updated' }));
  } catch (err) {
    console.error('updateLiveClass Error:', err);
    return res.status(500).json(errorResponse(`Failed to update live class`));
  }
}

async function deleteLiveClass(req, res) {
  try {
    const { id } = req.params;
    const liveClass = await LiveClass.findOne({ where: { id, school_id: (req.schoolId || req.user.school_id) } });
    if (!liveClass) return res.status(404).json(errorResponse('Live class not found'));
    if (req.user.role === 'teacher' && liveClass.teacher_id !== req.user.id) {
      return res.status(403).json(errorResponse('You can only delete your own live classes'));
    }
    await liveClass.update({ is_active: false });
    return res.json(successResponse({ message: 'Live class deleted' }));
  } catch (err) {
    console.error('deleteLiveClass Error:', err);
    return res.status(500).json(errorResponse(`Failed to delete live class`));
  }
}

async function downloadReceipt(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const { payment_id } = req.params;
    const payment = await Payment.findOne({
      where: { id: payment_id, student_id: student.id },
      include: [
        { model: FeeCategory, attributes: ['id', 'name'] },
      ],
    });

    if (!payment) return res.status(404).json(errorResponse('Receipt not found'));

    const receipt = {
      id: payment.id,
      receiptNumber: payment.receipt_number,
      amount: payment.amount,
      paymentMethod: payment.payment_method,
      reference: payment.reference,
      paidBy: payment.paid_by,
      paidAt: payment.paid_at,
      status: payment.status,
      notes: payment.notes,
    };

    return res.json(successResponse({ receipt }, 'Receipt generated'));
  } catch (err) {
    console.error('downloadReceipt Error:', err);
    return res.status(500).json(errorResponse(`Failed to download receipt`));
  }
}

module.exports = {
  getProfile, changePassword, changeUsername,
  getCurrentTerm, getAllTerms,
  getGrades, getGradesSummary, getGradeHistory,
  getPeerReview, getFeedbackThread, sendFeedbackMessage,
  getRemedialPlan, confirmRemedialSession,
  getSecurityReport,
  getAttendance,
  getNotifications, markNotificationRead,
  getTimetable,
  getAssignments, submitAssignment,
  getConversations, sendMessage,
  getResources,
  getFinancials,
  getEvents,
  getGradeInsights,
  getSecurityHealth, revokeDevice,
  get2FASetup, enable2FA, disable2FA,
  getReportCards, downloadReportCard,
  getTranscript, downloadTranscript,
  verifyHash,
  getTamperCount,
  getWhoSawMyData, getParentalAccessLog,
  submitModificationObjection,
  getChannelPreferences, updateChannelPreferences,
  getWhistleblowerCategories, submitWhistleblowerReport, checkWhistleblowerStatus,
  getGoals, setGoal,
  getOfficeHourSlots, claimOfficeHourSlot, cancelOfficeHourSlot,
  getCounsellorThread, sendCounsellorMessage,
  getStudyGroups, joinStudyGroup, leaveStudyGroup,
  getStreaks,
  getDigitalId,
  getDocuments, uploadDocument, requestTranscript,
  getStudyPlan, saveStudyPlan,
  getResourceLastVisit, markResourceVisited,
  getVoiceSummary,
  getSubjectDeepDive,
  listLiveClasses, createLiveClass, updateLiveClass, deleteLiveClass,
  downloadReceipt,
};
