const Teacher = require('../models/Teacher');
const User = require('../models/User');
const School = require('../models/School');
const Class = require('../models/Class');
const Student = require('../models/Student');
const ClassSubject = require('../models/ClassSubject');
const Subject = require('../models/Subject');
const Grade = require('../models/Grade');
const Term = require('../models/Term');
const AcademicYear = require('../models/AcademicYear');
const GradingScheme = require('../models/GradingScheme');
const Notification = require('../models/Notification');
const Exam = require('../models/Exam');
const ForensicEvent = require('../models/ForensicEvent');
// Models previously referenced as bare identifiers without being imported — every
// handler touching these threw ReferenceError at runtime (audit #106). Imported here.
const Message = require('../models/Message');
const Assignment = require('../models/Assignment');
const LearningResource = require('../models/LearningResource');
const OfficeHour = require('../models/OfficeHour');
const PeerReview = require('../models/PeerReview');
const SpotlightStudent = require('../models/SpotlightStudent');
const BehaviourIncident = require('../models/BehaviourIncident');
const LessonPlan = require('../models/LessonPlan');
const ChannelPreference = require('../models/ChannelPreference');
const WhistleblowerReport = require('../models/WhistleblowerReport');
const WhistleblowerCategory = require('../models/WhistleblowerCategory');
const SecurityAuditLog = require('../models/SecurityAuditLog');
const Attendance = require('../models/Attendance');
const ModificationRequest = require('../models/ModificationRequest');
const ExamResult = require('../models/ExamResult');
const GradeReceipt = require('../models/GradeReceipt');
const GradeEvent = require('../models/GradeEvent');
const crypto = require('crypto');
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const { appendGradeEvent, appendGradeEventSafe } = require('../utils/gradeEvent');

const successResponse = (data = {}, message = "Success") => ({ success: true, message, ...data });
const errorResponse = (message = "Error", status = 400) => ({ success: false, message, status });

// Helper: Normalize image paths
function normalizePath(filePath) {
  if (!filePath) return null;
  // If it's already a full URL, return it
  if (filePath.startsWith('http')) return filePath;
  // Ensure it starts with /uploads
  if (filePath.startsWith('/uploads')) return filePath;
  if (filePath.startsWith('uploads')) return '/' + filePath;
  // If it's just a filename, assume it's in badges (consistent with createTeacher)
  return '/uploads/badges/' + filePath;
}

async function getTeacherMe(req, res) {
  try {
    const teacher = await Teacher.findOne({
      where: { user_id: req.user.id },
      include: [
        { model: User, as: 'user', attributes: ['first_name', 'last_name', 'email', 'username', 'last_login'] },
        { model: School, as: 'school', attributes: ['name', 'badge_path', 'brand_colors'] }
      ]
    });

    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const firstName = teacher.user.first_name || '';
    const lastName = teacher.user.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const initials = (firstName[0] || '') + (lastName[0] || '');

    return res.json(successResponse({
      profile: {
        id: teacher.id,
        user_id: teacher.user_id,
        firstName,
        lastName,
        fullName,
        initials: initials.toUpperCase(),
        email: teacher.user.email,
        username: teacher.user.username,
        phone: teacher.phone_number,
        phone_number: teacher.phone_number,
        qualification: teacher.qualification,
        profile_picture: normalizePath(teacher.profile_picture),
        school: teacher.school?.name || 'EK-SMS School',
        school_name: teacher.school?.name || 'EK-SMS School',
        school_badge: normalizePath(teacher.school?.badge_path),
        school_colors: teacher.school?.brand_colors,
        employeeNumber: teacher.employee_id,
        employee_id: teacher.employee_id,
        joinedDate: teacher.hire_date || teacher.created_at,
        status: teacher.is_active ? 'active' : 'inactive',
        lastLogin: teacher.user.last_login || teacher.created_at,
        activeSessions: 1,
        twoFactorEnabled: false,
        specializations: teacher.qualification ? [teacher.qualification] : [],
        subjects: [],
        years_experience: teacher.years_experience,
        bio: teacher.bio,
        linkedin_url: teacher.linkedin_url,
        degrees: teacher.degrees || [],
        certifications: teacher.certifications || [],
      }
    }));
  } catch (err) {
    console.error('getTeacherMe Error:', err);
    return res.status(500).json(errorResponse('Failed to fetch teacher profile'));
  }
}

async function getTeacherClasses(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const Class = require('../models/Class');
    const ClassSubject = require('../models/ClassSubject');
    const Subject = require('../models/Subject');

    const classes = await Class.findAll({
      where: { class_teacher_id: teacher.id },
      attributes: ['id', 'name', 'form', 'category', 'capacity', 'room', 'code', 'stream', 'colour_tag'],
      include: [
        {
          model: ClassSubject,
          as: 'classSubjects',
          include: [{ model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }],
        },
      ],
    });

    // Resolve the school's active term so grade stats reflect the current term only.
    const activeTerm = await Term.findOne({
      where: { school_id: teacher.school_id, is_active: true },
      order: [['start_date', 'DESC']],
    });

    // Flatten to match frontend shape, enriching each class with a real student
    // count and real per-term grade stats (audit #2/#7/#20 — these were hardcoded
    // to {0,0,0,0}, so every home/classes/completion card showed fake zeros).
    const formatted = await Promise.all(classes.map(async (cls) => {
      const subjects = (cls.classSubjects || []).map(cs => cs.subject).filter(Boolean);

      const studentCount = await Student.count({
        where: { classroom_id: cls.id, school_id: teacher.school_id, status: 'active' },
      });

      // Expected grade entries this term = students × subjects taught in the class.
      const expected = studentCount * (subjects.length || 1);
      let gradeStats = { total: expected, locked: 0, draft: 0, pending: 0 };

      if (activeTerm) {
        const rows = await Grade.findAll({
          where: { school_id: teacher.school_id, classroom_id: cls.id, term_id: activeTerm.id },
          attributes: ['is_locked', 'approval_status'],
          raw: true,
        });
        // locked = finalised by the teacher (is_locked) or principal-approved;
        // pending = awaiting principal; draft = still editable. (pending overlaps
        // locked once a grade is locked-and-awaiting-approval — that's intentional.)
        let locked = 0, draft = 0, pending = 0;
        rows.forEach(r => {
          const st = r.approval_status;
          if (r.is_locked || st === 'approved') locked += 1;
          if (st === 'pending') pending += 1;
          if (!r.is_locked && st !== 'approved' && st !== 'pending') draft += 1;
        });
        gradeStats = { total: expected, locked, draft, pending };
      }

      return {
        id: cls.id,
        name: cls.name,
        form: cls.form,
        category: cls.category,
        capacity: cls.capacity,
        room: cls.room || '',
        code: cls.code || '',
        stream: cls.stream || '',
        colour_tag: cls.colour_tag || '',
        subject: subjects[0] || null,
        subjects,
        studentCount,
        gradeStats,
      };
    }));

    return res.json(successResponse({ classes: formatted }));
  } catch (err) {
    console.error('getTeacherClasses Error:', err);
    return res.status(500).json(errorResponse('Failed to fetch teacher classes'));
  }
}

async function getTeacherStudents(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { class_id } = req.query;
    if (!class_id) return res.status(400).json(errorResponse('class_id is required'));

    const students = await Student.findAll({
      where: { classroom_id: class_id, school_id: teacher.school_id, status: 'active' },
      include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email'] }],
      order: [[sequelize.fn('lower', sequelize.col('user.first_name')), 'ASC']],
    });

    const formatted = students.map(s => ({
      id: s.id,
      admission_number: s.admission_number,
      first_name: s.user?.first_name || '',
      last_name: s.user?.last_name || '',
      full_name: `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.trim(),
      email: s.user?.email || '',
      gender: s.gender,
      status: s.status,
    }));

    return res.json(successResponse({ students: formatted }));
  } catch (err) {
    console.error('getTeacherStudents Error:', err);
    return res.status(500).json(errorResponse('Failed to fetch students'));
  }
}

async function getTeacherGradebook(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { class_id, subject_id, term_id } = req.query;
    if (!class_id) {
      return res.status(400).json(errorResponse('class_id is required'));
    }

    const students = await Student.findAll({
      where: { classroom_id: class_id, school_id: teacher.school_id, status: 'active' },
      include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] }],
    });

    let grades = [];
    if (subject_id && term_id) {
      grades = await Grade.findAll({
        where: {
          school_id: teacher.school_id,
          classroom_id: class_id,
          subject_id,
          term_id,
          student_id: { [Op.in]: students.map(s => s.id) },
        },
      });
    }

    const gradeMap = {};
    grades.forEach(g => { gradeMap[g.student_id] = g; });

    const gradebook = students.map(s => {
      const g = gradeMap[s.id];
      return {
        student_id: s.id,
        admission_number: s.admission_number,
        full_name: `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.trim(),
        ca: g?.ca || null,
        midterm: g?.midterm || null,
        final: g?.final || null,
        total: g?.total || null,
        grade_letter: g?.grade_letter || null,
        remarks: g?.remarks || null,
        existing_grade_id: g?.id || null,
      };
    });

    return res.json(successResponse({ gradebook }));
  } catch (err) {
    console.error('getTeacherGradebook Error:', err);
    return res.status(500).json(errorResponse('Failed to fetch gradebook'));
  }
}

async function saveGradeDraft(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { classId, studentId, field, value } = req.body;
    const subjectId = req.body.subject_id || req.body.subjectId || null;
    const termId = req.body.term_id || req.body.termId || null;
    if (!studentId || !field) return res.status(400).json(errorResponse('studentId and field are required'));

    // The grade table has ca/midterm/final/total — there is no `score` column, so the
    // single-score entry field maps to `total` (audit #24).
    const dbField = field === 'score' ? 'total' : field;
    const numeric = ['ca', 'midterm', 'final', 'total'].includes(dbField);
    const storedValue = numeric ? (value === '' || value === null || value === undefined ? null : parseFloat(value)) : value;

    // Scope the lookup by subject + term (+ classroom) so editing one subject can't
    // overwrite a different subject's grade for the same student (audit #113).
    const lookup = { student_id: studentId, school_id: teacher.school_id };
    if (subjectId) lookup.subject_id = subjectId;
    if (termId) lookup.term_id = termId;
    if (classId) lookup.classroom_id = classId;

    const grade = await Grade.findOne({ where: lookup });

    if (grade) {
      // Locked grades are immutable to the teacher — corrections go via a modification request.
      if (grade.is_locked) {
        // Record the blocked tamper attempt in the append-only ledger so the tamper
        // counter reflects REAL blocked edits, not a heuristic guess (audit #27).
        await appendGradeEventSafe({
          grade_id: grade.id, school_id: grade.school_id, student_id: grade.student_id,
          subject_id: grade.subject_id, term_id: grade.term_id,
          actor_user_id: req.user?.id, actor_name: req.user?.username,
          event_type: 'blocked', field: dbField, old_value: grade[dbField], new_value: storedValue,
          approval_status_after: grade.approval_status,
        });
        return res.status(423).json(errorResponse('This grade is locked. File a modification request to change it.'));
      }
      const oldValue = grade[dbField];
      const updateData = { [dbField]: storedValue };
      if (['ca', 'midterm', 'final'].includes(dbField)) {
        const ca = dbField === 'ca' ? (parseFloat(value) || 0) : (grade.ca || 0);
        const midterm = dbField === 'midterm' ? (parseFloat(value) || 0) : (grade.midterm || 0);
        const finalExam = dbField === 'final' ? (parseFloat(value) || 0) : (grade.final || 0);
        updateData.total = ca + midterm + finalExam;
      }
      // Editing an already-approved/published grade sends it back through the principal.
      if (grade.approval_status === 'approved') {
        updateData.approval_status = 'pending';
        updateData.approved_by = null;
        updateData.approved_at = null;
        updateData.is_published = false;
        updateData.published_at = null;
        updateData.published_by = null;
      }
      await grade.update(updateData);
      await appendGradeEventSafe({
        grade_id: grade.id, school_id: grade.school_id, student_id: grade.student_id,
        subject_id: grade.subject_id, term_id: grade.term_id,
        actor_user_id: req.user?.id, actor_name: req.user?.username,
        event_type: 'update', field: dbField, old_value: oldValue, new_value: storedValue,
        approval_status_after: updateData.approval_status || grade.approval_status,
      });
    } else {
      const createData = {
        school_id: teacher.school_id,
        student_id: studentId,
        subject_id: subjectId || null,
        term_id: termId || 1,
        classroom_id: classId || null,
        approval_status: 'draft',
        [dbField]: storedValue,
      };
      if (['ca', 'midterm', 'final'].includes(dbField)) {
        const ca = dbField === 'ca' ? (parseFloat(value) || 0) : 0;
        const midterm = dbField === 'midterm' ? (parseFloat(value) || 0) : 0;
        const finalExam = dbField === 'final' ? (parseFloat(value) || 0) : 0;
        createData.total = ca + midterm + finalExam;
      }
      const created = await Grade.create(createData);
      await appendGradeEventSafe({
        grade_id: created.id, school_id: created.school_id, student_id: created.student_id,
        subject_id: created.subject_id, term_id: created.term_id,
        actor_user_id: req.user?.id, actor_name: req.user?.username,
        event_type: 'create', field: dbField, old_value: null, new_value: storedValue,
        approval_status_after: 'draft',
      });
    }

    return res.json(successResponse({}, 'Draft saved successfully'));
  } catch (err) {
    console.error('saveGradeDraft Error:', err);
    return res.status(500).json(errorResponse('Failed to save draft'));
  }
}

async function submitGradesForLocking(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) { await transaction.rollback(); return res.status(404).json(errorResponse('Teacher profile not found')); }

    const { student_ids, subject_id, term_id, grades, lock_all, class_id } = req.body;

    // ── Bulk path: lock every remaining draft grade for a class this term ──
    // (Grade Completion "Lock N" button — audit #21.) Locks across all the class's
    // subjects so the count matches the draft total shown on the card.
    if (lock_all) {
      if (!class_id || !term_id) {
        await transaction.rollback();
        return res.status(400).json(errorResponse('class_id and term_id are required to lock all drafts'));
      }
      const ownsClass = await Class.findOne({ where: { id: class_id, class_teacher_id: teacher.id }, attributes: ['id'], transaction });
      if (!ownsClass) { await transaction.rollback(); return res.status(403).json(errorResponse('You are not assigned to this class')); }

      const draftWhere = { school_id: teacher.school_id, classroom_id: class_id, term_id, approval_status: 'draft' };
      if (subject_id) draftWhere.subject_id = subject_id;
      const drafts = await Grade.findAll({ where: draftWhere, transaction });
      const lockedAt = new Date();
      let bulkCount = 0;
      for (const g of drafts) {
        await g.update({ approval_status: 'pending', is_locked: true, locked_at: lockedAt, locked_by: teacher.id }, { transaction });
        await appendGradeEvent({
          grade_id: g.id, school_id: g.school_id, student_id: g.student_id,
          subject_id: g.subject_id, term_id: g.term_id,
          actor_user_id: req.user?.id, actor_name: req.user?.username,
          event_type: 'lock', field: 'is_locked', old_value: false, new_value: true,
          approval_status_after: 'pending',
        }, { transaction });
        bulkCount += 1;
      }
      await transaction.commit();
      return res.json(successResponse({ count: bulkCount, locked: bulkCount }, `${bulkCount} grade(s) locked`));
    }

    if (!student_ids || !subject_id || !term_id) {
      await transaction.rollback();
      return res.status(400).json(errorResponse('student_ids, subject_id, and term_id are required'));
    }

    const term = await Term.findByPk(term_id);
    if (!term) { await transaction.rollback(); return res.status(404).json(errorResponse('Term not found')); }

    const gradingScheme = await GradingScheme.findOne({ where: { school_id: teacher.school_id } });
    const boundaries = gradingScheme ? JSON.parse(gradingScheme.boundaries || '{}') : {};

    let count = 0;
    const lockedItems = [];
    for (const sid of student_ids) {
      const gradeData = (grades || []).find(g => g.studentId === sid) || {};
      const score = parseFloat(gradeData.score || gradeData.total);
      if (isNaN(score)) continue;

      let gradeLetter = '';
      for (const [letter, boundary] of Object.entries(boundaries)) {
        if (score >= (boundary.min || 0) && score <= (boundary.max || 100)) {
          gradeLetter = letter;
          break;
        }
      }

      const ca = parseFloat(gradeData.ca) || 0;
      const midterm = parseFloat(gradeData.midterm) || 0;
      const finalExam = parseFloat(gradeData.final) || score;

      // Submitting (or re-submitting) ALWAYS sends the grade to the principal:
      // reset approval to pending and un-publish any prior report card so an
      // edited grade can never stay silently approved/published.
      const values = {
        school_id: teacher.school_id,
        student_id: sid,
        subject_id,
        term_id,
        classroom_id: gradeData.classroom_id || class_id || null,
        ca,
        midterm,
        final: finalExam,
        total: score,
        grade_letter: gradeLetter,
        remarks: gradeData.remarks || '',
        approval_status: 'pending',
        approved_by: null,
        approved_at: null,
        // Real teacher-side lock (audit #16) — immutable to the teacher from now on.
        is_locked: true,
        locked_at: new Date(),
        locked_by: teacher.id,
        is_published: false,
        published_at: null,
        published_by: null,
      };

      const existing = await Grade.findOne({
        where: { school_id: teacher.school_id, student_id: sid, subject_id, term_id },
        transaction,
      });
      let gradeId;
      let oldTotal = null;
      if (existing) {
        oldTotal = existing.total;
        await existing.update(values, { transaction });
        gradeId = existing.id;
      } else {
        const created = await Grade.create(values, { transaction });
        gradeId = created.id;
      }

      await appendGradeEvent({
        grade_id: gradeId, school_id: teacher.school_id, student_id: sid,
        subject_id, term_id,
        actor_user_id: req.user?.id, actor_name: req.user?.username,
        event_type: 'submit', field: 'total',
        old_value: oldTotal, new_value: score, approval_status_after: 'pending',
      }, { transaction });

      lockedItems.push({ student_id: sid, total: score });
      count++;
    }

    await Notification.create({
      school_id: teacher.school_id,
      title: 'Grades Submitted',
      message: `Teacher has submitted ${count} grade(s) for review.`,
      type: 'info',
      is_read: false,
    }, { transaction });

    // Hash-chained receipt for this locked batch — real defensible paperwork (audit #17).
    let receipt = null;
    if (count > 0) {
      const canonical = lockedItems.map(i => `${i.student_id}:${i.total}`).sort().join('|') + `|subj=${subject_id}|term=${term_id}`;
      const content_hash = crypto.createHash('sha256').update(canonical).digest('hex');
      const prev = await GradeReceipt.findOne({ where: { school_id: teacher.school_id }, order: [['chain_position', 'DESC']], transaction });
      const chain_position = (prev?.chain_position || 0) + 1;
      const submitted_at = new Date();
      const verification_hash = crypto.createHash('sha256')
        .update(`${content_hash}|${prev?.verification_hash || 'GENESIS'}|${chain_position}|${submitted_at.toISOString()}`)
        .digest('hex');
      const average = Math.round((lockedItems.reduce((a, i) => a + i.total, 0) / lockedItems.length) * 10) / 10;
      const rec = await GradeReceipt.create({
        school_id: teacher.school_id, teacher_id: teacher.id, subject_id, term_id,
        classroom_id: class_id || null, count, average, content_hash,
        verification_hash, prev_hash: prev?.verification_hash || null, chain_position, submitted_at,
      }, { transaction });
      receipt = { id: rec.id, count, submittedAt: submitted_at.toISOString(), chainPosition: chain_position, verificationHash: verification_hash };
    }

    await transaction.commit();
    return res.json(successResponse({ count, locked: count, receipt }, `${count} grade(s) submitted successfully`));
  } catch (err) {
    await transaction.rollback();
    console.error('submitGradesForLocking Error:', err);
    return res.status(500).json(errorResponse(`Failed to submit grades`));
  }
}

async function getGradeHistory(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { student_id, subject_id } = req.query;
    const where = { school_id: teacher.school_id };
    if (student_id) where.student_id = student_id;
    if (subject_id) where.subject_id = subject_id;

    const grades = await Grade.findAll({
      where,
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        { model: Term, as: 'term', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
      limit: 50,
    });

    const history = grades.map(g => ({
      id: g.id,
      student_id: g.student_id,
      subject: g.subject?.name || 'Unknown',
      term: g.term?.name || 'Unknown',
      ca: g.ca,
      midterm: g.midterm,
      final: g.final,
      total: g.total,
      grade_letter: g.grade_letter,
      approval_status: g.approval_status,
      created_at: g.created_at,
    }));

    return res.json(successResponse({ history }));
  } catch (err) {
    console.error('getGradeHistory Error:', err);
    return res.status(500).json(errorResponse('Failed to fetch grade history'));
  }
}

async function getTeacherTimetable(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const TimetableSlot = require('../models/TimetableSlot');
    const Class = require('../models/Class');
    const Subject = require('../models/Subject');

    // The teacher's own teaching slots, drawn from the persisted timetable.
    const slots = await TimetableSlot.findAll({
      where: { teacher_id: teacher.id, is_break: false },
      order: [['day', 'ASC'], ['period', 'ASC']],
    });

    const subjectIds = [...new Set(slots.map(s => s.subject_id).filter(Boolean))];
    const classIds = [...new Set(slots.map(s => s.class_id).filter(Boolean))];
    const subjects = subjectIds.length ? await Subject.findAll({ where: { id: subjectIds }, attributes: ['id', 'name'] }) : [];
    const subjectName = Object.fromEntries(subjects.map(s => [String(s.id), s.name]));
    const classes = classIds.length ? await Class.findAll({ where: { id: classIds }, attributes: ['id', 'name', 'room'] }) : [];
    const classById = Object.fromEntries(classes.map(c => [String(c.id), c]));

    const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const periods = slots.map(s => ({
      id: `tt-${s.id}`,
      day: DAYS[s.day] || 'monday',
      startTime: s.start_time || '08:00',
      endTime: s.end_time || '09:00',
      subject: subjectName[String(s.subject_id)] || 'Lesson',
      class: classById[String(s.class_id)]?.name || '',
      room: s.room || classById[String(s.class_id)]?.room || 'TBD',
      type: 'teaching',
    }));

    return res.json(successResponse({
      timetable: {
        teacher_id: teacher.id,
        periods,
        generated_at: new Date().toISOString(),
      },
    }));
  } catch (err) {
    console.error('getTeacherTimetable Error:', err);
    return res.json(successResponse({ timetable: { periods: [] } }));
  }
}

async function getTeacherExamDuties(req, res) {
  try {
    const Exam = require('../models/Exam');
    const ExamDuty = require('../models/ExamDuty');
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    let duties = [];
    if (ExamDuty) {
      duties = await ExamDuty.findAll({
        where: { teacher_id: teacher.id },
        include: [{ model: Exam, attributes: ['id', 'name', 'date', 'start_time', 'end_time', 'venue'] }],
        order: [['date', 'ASC']],
      });
    }

    const formatted = duties.map(d => ({
      id: d.id,
      exam_name: d.Exam?.name || 'Exam',
      date: d.Exam?.date || d.date,
      start_time: d.Exam?.start_time || d.start_time,
      end_time: d.Exam?.end_time || d.end_time,
      venue: d.Exam?.venue || d.venue,
      role: d.role || 'invigilator',
      status: new Date(d.Exam?.date) < new Date() ? 'completed' : 'upcoming',
    }));

    return res.json(successResponse({ duties: formatted }));
  } catch (err) {
    console.error('getTeacherExamDuties Error:', err);
    return res.json(successResponse({ duties: [] }));
  }
}

async function getTeacherAttendanceStatus(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const Class = require('../models/Class');
    const classes = await Class.findAll({
      where: { class_teacher_id: teacher.id },
      attributes: ['id', 'name'],
    });

    const today = new Date().toISOString().split('T')[0];
    const Attendance = require('../models/Attendance');
    let atRisk = [];

    if (Attendance) {
      atRisk = await Attendance.findAll({
        where: { teacher_id: teacher.id, date: today },
        attributes: ['student_id', 'student_name', 'classroom', 'status'],
      });
    }

    return res.json(successResponse({
      classes: classes.map(c => ({
        id: c.id,
        classroom_name: c.name,
        taken: false,
        total_students: 0,
        present_count: 0,
      })),
      at_risk: atRisk.map(a => ({
        id: a.student_id,
        name: a.student_name,
        classroom: a.classroom,
        att_rate: 70,
      })),
    }));
  } catch (err) {
    console.error('getTeacherAttendanceStatus Error:', err);
    return res.json(successResponse({ classes: [], at_risk: [] }));
  }
}

async function recordClassAttendance(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { classroom_id, date, records, notes } = req.body;
    if (!classroom_id || !records || !Array.isArray(records)) {
      return res.status(400).json(errorResponse('classroom_id and records array are required'));
    }

    // Ownership: only allow recording attendance for a class this teacher owns.
    const ownsClass = await Class.findOne({
      where: { id: classroom_id, class_teacher_id: teacher.id },
      attributes: ['id'],
    });
    if (!ownsClass) {
      return res.status(403).json(errorResponse('You are not assigned to this class'));
    }

    const today = date || new Date().toISOString().split('T')[0];

    // Persist each student's status. The Attendance model requires school_id and uses
    // a `remarks` column (not `notes`) — both were missing/wrong before, so the insert
    // always threw and nothing saved while the UI faked success (audit #42).
    let saved = 0;
    for (const r of records) {
      if (!r || !r.student_id) continue;
      const [row] = await Attendance.findOrCreate({
        where: { student_id: r.student_id, classroom_id, date: today },
        defaults: {
          school_id: teacher.school_id,
          student_id: r.student_id,
          classroom_id,
          date: today,
          status: r.status || 'absent',
          remarks: notes || null,
        },
      });
      await row.update({ status: r.status || 'absent', remarks: notes || null });
      saved += 1;
    }

    return res.json(successResponse({ count: saved, date: today }, 'Attendance recorded'));
  } catch (err) {
    console.error('recordClassAttendance Error:', err);
    return res.status(500).json(errorResponse('Failed to record attendance'));
  }
}

async function getTeacherAtRiskStudents(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const classes = await Class.findAll({
      where: { class_teacher_id: teacher.id },
      attributes: ['id'],
    });
    const classIds = classes.map(c => c.id);

    if (classIds.length === 0) return res.json(successResponse({ students: [] }));

    const students = await Student.findAll({
      where: { classroom_id: { [Op.in]: classIds }, school_id: teacher.school_id, status: 'active' },
      include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name', 'email'] }],
    });

    const grades = await Grade.findAll({
      where: {
        school_id: teacher.school_id,
        classroom_id: { [Op.in]: classIds },
        student_id: { [Op.in]: students.map(s => s.id) },
      },
    });

    const studentAvg = {};
    grades.forEach(g => {
      if (!studentAvg[g.student_id]) studentAvg[g.student_id] = [];
      if (g.total) studentAvg[g.student_id].push(g.total);
    });

    const atRisk = students
      .map(s => {
        const avgs = studentAvg[s.id] || [];
        const avg = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null;
        return {
          id: s.id,
          full_name: `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.trim(),
          admission_number: s.admission_number,
          average: avg ? Math.round(avg) : null,
          classroom_id: s.classroom_id,
          risk_level: avg !== null && avg < 40 ? 'high' : avg !== null && avg < 60 ? 'medium' : 'low',
        };
      })
      .filter(s => s.risk_level !== 'low')
      .sort((a, b) => (a.average || 0) - (b.average || 0));

    return res.json(successResponse({ students: atRisk }));
  } catch (err) {
    console.error('getTeacherAtRiskStudents Error:', err);
    return res.json(successResponse({ students: [] }));
  }
}

async function getTeacherModificationSummary(req, res) {
  try {
    const ModificationRequest = require('../models/ModificationRequest');
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    let mods = [];
    if (ModificationRequest) {
      mods = await ModificationRequest.findAll({
        where: { teacher_id: teacher.id },
        attributes: ['status'],
      });
    }

    const pending = mods.filter(m => m.status === 'pending').length;
    const approved = mods.filter(m => m.status === 'approved').length;
    const rejected = mods.filter(m => m.status === 'rejected').length;

    return res.json(successResponse({ pending, approved, rejected }));
  } catch (err) {
    console.error('getTeacherModificationSummary Error:', err);
    return res.json(successResponse({ pending: 0, approved: 0, rejected: 0 }));
  }
}

async function getTeacherAcademicCalendar(req, res) {
  try {
    const Term = require('../models/Term');
    const terms = await Term.findAll({
      attributes: ['id', 'name', 'start_date', 'end_date', 'academic_year'],
      order: [['start_date', 'ASC']],
    });

    const events = terms.map(t => ({
      id: `term-${t.id}`,
      name: `${t.name} Start`,
      date: t.start_date,
      type: 'term_start',
    })).concat(terms.map(t => ({
      id: `term-end-${t.id}`,
      name: `${t.name} End`,
      date: t.end_date,
      type: 'term_end',
    })));

    return res.json(successResponse({ events }));
  } catch (err) {
    console.error('getTeacherAcademicCalendar Error:', err);
    return res.json(successResponse({ events: [] }));
  }
}

async function getTeacherStudentActivity(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const classes = await Class.findAll({
      where: { class_teacher_id: teacher.id },
      attributes: ['id'],
    });
    const classIds = classes.map(c => c.id);

    const recentGrades = await Grade.count({
      where: { school_id: teacher.school_id, classroom_id: { [Op.in]: classIds }, created_at: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    });

    const recentAttendance = await Attendance.count({
      where: { school_id: teacher.school_id, classroom_id: { [Op.in]: classIds }, created_at: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    });

    const recentMessages = await Message.count({
      where: { school_id: teacher.school_id, sender_id: teacher.id, created_at: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    });

    const activities = [
      { type: 'grades', label: 'Grades Recorded', count: recentGrades, icon: 'book' },
      { type: 'attendance', label: 'Attendance Marked', count: recentAttendance, icon: 'check' },
      { type: 'messages', label: 'Messages Sent', count: recentMessages, icon: 'mail' },
    ];

    return res.json(successResponse({ activities }));
  } catch (err) {
    console.error('getTeacherStudentActivity Error:', err);
    return res.json(successResponse({ activities: [] }));
  }
}

async function getTeacherNotifications(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { limit } = req.query;
    const query = {
      where: { school_id: teacher.school_id },
      order: [['created_at', 'DESC']],
    };
    if (limit) query.limit = parseInt(limit);

    const notifications = await Notification.findAll(query);
    const unread = await Notification.count({ where: { school_id: teacher.school_id, is_read: false } });

    const formatted = notifications.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      is_read: n.is_read,
      created_at: n.created_at,
    }));

    return res.json(successResponse({ notifications: formatted, unread }));
  } catch (err) {
    console.error('getTeacherNotifications Error:', err);
    return res.status(500).json(errorResponse('Failed to fetch notifications'));
  }
}

async function getFeedbackStudents(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const classes = await Class.findAll({
      where: { class_teacher_id: teacher.id },
      attributes: ['id', 'name'],
    });
    const classIds = classes.map(c => c.id);
    const classNameMap = Object.fromEntries(classes.map(c => [c.id, c.name]));

    const students = await Student.findAll({
      where: { classroom_id: { [Op.in]: classIds }, school_id: teacher.school_id, status: 'active' },
      include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email'] }],
      order: [[sequelize.fn('lower', sequelize.col('user.first_name')), 'ASC']],
    });

    // Unread replies from each student to this teacher (drives the unread badge).
    const unreadRows = await Message.findAll({
      where: { school_id: teacher.school_id, recipient_id: teacher.id, recipient_type: 'teacher', is_read: false },
      attributes: ['sender_id', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
      group: ['sender_id'], raw: true,
    });
    const unreadMap = {};
    unreadRows.forEach(r => { unreadMap[r.sender_id] = parseInt(r.cnt, 10) || 0; });

    // Emit the field names the UI reads (name/className/class_id/unreadCount) — it
    // previously got full_name/classroom_id and rendered blank rows (audit #56).
    const formatted = students.map(s => {
      const name = `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.trim();
      return {
        id: s.id,
        name,
        full_name: name,
        className: classNameMap[s.classroom_id] || '',
        class_id: s.classroom_id,
        classroom_id: s.classroom_id,
        admission_number: s.admission_number,
        email: s.user?.email || '',
        unreadCount: unreadMap[s.id] || 0,
      };
    });

    return res.json(successResponse({ students: formatted }));
  } catch (err) {
    console.error('getFeedbackStudents Error:', err);
    return res.json(successResponse({ students: [] }));
  }
}

async function getFeedbackMessages(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    // Scope to the selected student's conversation (both directions) — previously this
    // ignored :studentId and returned EVERY message the teacher ever sent, with no text
    // (UI reads m.message/m.sender) (audit #57).
    const { studentId } = req.params;

    const messages = await Message.findAll({
      where: {
        school_id: teacher.school_id,
        [Op.or]: [
          { sender_id: teacher.id, recipient_id: studentId },
          { sender_id: studentId, recipient_id: teacher.id },
        ],
      },
      order: [['created_at', 'ASC']],
      limit: 200,
    });

    // Opening the thread clears the student's unread replies to this teacher.
    await Message.update(
      { is_read: true },
      { where: { school_id: teacher.school_id, sender_id: studentId, recipient_id: teacher.id, is_read: false } }
    );

    const formatted = messages.map(m => ({
      id: m.id,
      message: m.body,
      sender: m.sender_type || (String(m.sender_id) === String(teacher.id) ? 'teacher' : 'student'),
      created_at: m.created_at,
    }));

    return res.json(successResponse({ messages: formatted }));
  } catch (err) {
    console.error('getFeedbackMessages Error:', err);
    return res.json(successResponse({ messages: [] }));
  }
}

async function sendFeedback(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    // The student id comes from the URL; the UI posts just { message } (audit #58).
    const { studentId } = req.params;
    const recipient_id = req.body.recipient_id || studentId;
    const body = req.body.body || req.body.message;
    if (!recipient_id || !body) return res.status(400).json(errorResponse('message is required'));

    // Ownership: only message students in this teacher's classes (audit #64).
    const classes = await Class.findAll({ where: { class_teacher_id: teacher.id }, attributes: ['id'] });
    const classIds = classes.map(c => c.id);
    const student = await Student.findOne({ where: { id: recipient_id, school_id: teacher.school_id }, attributes: ['id', 'classroom_id'] });
    if (!student || (classIds.length > 0 && !classIds.includes(student.classroom_id))) {
      return res.status(403).json(errorResponse('You can only message students in your classes'));
    }

    const message = await Message.create({
      school_id: teacher.school_id,
      sender_id: teacher.id,
      sender_type: 'teacher',
      recipient_id,
      recipient_type: 'student',
      subject: req.body.subject || 'Feedback',
      body,
      thread_id: `t${teacher.id}-s${recipient_id}`,
      is_read: false,
    });

    return res.json(successResponse({ id: message.id, message: body, sender: 'teacher', created_at: message.created_at }, 'Feedback sent'));
  } catch (err) {
    console.error('sendFeedback Error:', err);
    return res.status(500).json(errorResponse('Failed to send feedback'));
  }
}

async function getTeacherTamperCount(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    // Real, defensible numbers (audit #27): blocked = actual blocked grade-edit attempts
    // logged in the append-only ledger; successful is always 0 — a locked grade cannot be
    // tampered, which is the whole point. (The old code counted generic ForensicEvents and
    // invented "successful = total - blocked", an alarming meaningless guess.)
    const { class_id } = req.query;
    const blocked = await GradeEvent.count({
      where: { actor_user_id: req.user.id, event_type: 'blocked' },
    });
    const gradeWhere = { school_id: teacher.school_id, is_locked: true };
    if (class_id) gradeWhere.classroom_id = class_id;
    const protectedCount = await Grade.count({ where: gradeWhere });

    return res.json(successResponse({ total: blocked, blocked, successful: 0, protected: protectedCount }));
  } catch (err) {
    console.error('getTeacherTamperCount Error:', err);
    return res.json(successResponse({ total: 0, blocked: 0, successful: 0 }));
  }
}

async function getTeacherAccessLog(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const logs = await SecurityAuditLog.findAll({
      where: { actor: req.user.id.toString() },
      order: [['ts', 'DESC']],
      limit: 50,
    });

    // Emit section/device/accessedAt (what the UI renders) alongside the raw fields —
    // the component got type/action/timestamp and showed blank rows (audit #89).
    const access_log = logs.map(l => ({
      id: l.id,
      section: l.action || l.type || 'Activity',
      device: l.ip || '—',
      accessedAt: l.ts,
      type: l.type,
      action: l.action,
      severity: l.severity,
      ip: l.ip,
      timestamp: l.ts,
    }));

    return res.json(successResponse({ access_log }));
  } catch (err) {
    console.error('getTeacherAccessLog Error:', err);
    return res.json(successResponse({ access_log: [] }));
  }
}

async function getTeacherChannelPreferences(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    let prefs = await ChannelPreference.findOne({ where: { user_id: req.user.id } });
    if (!prefs) {
      prefs = await ChannelPreference.create({
        user_id: req.user.id,
        push: true,
        email: true,
        sms: false,
        in_app: true,
        whatsapp: false,
      });
    }

    const preferences = {
      inApp: { enabled: prefs.in_app },
      push: { enabled: prefs.push },
      email: { enabled: prefs.email },
      sms: { enabled: prefs.sms },
      whatsapp: { enabled: prefs.whatsapp },
    };

    return res.json(successResponse({ preferences }));
  } catch (err) {
    console.error('getTeacherChannelPreferences Error:', err);
    return res.json(successResponse({ preferences: {} }));
  }
}

async function updateTeacherChannelPreferences(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { push, email, sms, in_app, whatsapp } = req.body;

    let prefs = await ChannelPreference.findOne({ where: { user_id: req.user.id } });
    if (prefs) {
      await prefs.update({
        push: push !== undefined ? push : prefs.push,
        email: email !== undefined ? email : prefs.email,
        sms: sms !== undefined ? sms : prefs.sms,
        in_app: in_app !== undefined ? in_app : prefs.in_app,
        whatsapp: whatsapp !== undefined ? whatsapp : prefs.whatsapp,
      });
    } else {
      prefs = await ChannelPreference.create({
        user_id: req.user.id,
        push: push !== undefined ? push : true,
        email: email !== undefined ? email : true,
        sms: sms !== undefined ? sms : false,
        in_app: in_app !== undefined ? in_app : true,
        whatsapp: whatsapp !== undefined ? whatsapp : false,
      });
    }

    return res.json(successResponse({ preferences: prefs }, 'Preferences updated'));
  } catch (err) {
    console.error('updateTeacherChannelPreferences Error:', err);
    return res.status(500).json(errorResponse('Failed to update preferences'));
  }
}

async function getTeacherWhistleblowerCategories(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const categories = await WhistleblowerCategory.findAll({
      where: { school_id: teacher.school_id, is_active: true },
      order: [['name', 'ASC']],
    });

    const formatted = categories.map(c => ({
      id: c.id,
      label: c.name,
      description: c.description,
    }));

    return res.json(successResponse({ categories: formatted }));
  } catch (err) {
    console.error('getTeacherWhistleblowerCategories Error:', err);
    return res.json(successResponse({ categories: [] }));
  }
}

async function submitWhistleblowerReport(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { category_id, title, description, severity } = req.body;
    if (!title || !description) return res.status(400).json(errorResponse('title and description are required'));

    const followUpKey = `WB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const report = await WhistleblowerReport.create({
      school_id: teacher.school_id,
      category_id,
      title,
      description,
      severity: severity || 'medium',
      follow_up_key: followUpKey,
      status: 'received',
      reporter_type: 'teacher',
    });

    return res.json(successResponse({ ticketId: report.id, followUpKey: report.follow_up_key }, 'Report submitted'));
  } catch (err) {
    console.error('submitWhistleblowerReport Error:', err);
    return res.status(500).json(errorResponse('Failed to submit report'));
  }
}

async function checkWhistleblowerStatus(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { key } = req.params;
    const report = await WhistleblowerReport.findOne({
      where: { follow_up_key: key, school_id: teacher.school_id },
    });

    if (!report) return res.status(404).json(errorResponse('Report not found'));

    return res.json(successResponse({
      ticketId: report.id,
      status: report.status,
      category_id: report.category_id,
      created_at: report.created_at,
    }));
  } catch (err) {
    console.error('checkWhistleblowerStatus Error:', err);
    return res.json(successResponse({ status: 'unknown' }));
  }
}

async function getTeacherOfficeHours(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const officeHours = await OfficeHour.findAll({
      where: { teacher_id: teacher.id, school_id: teacher.school_id, is_active: true },
      order: [['date', 'ASC']],
    });

    // Emit the shape the slot-management UI reads (start/durationMin/room/subject/
    // audience/booked) — it previously got date/start_time and crashed on the wrapper
    // object (audit #61).
    const slots = officeHours.map(oh => ({
      id: oh.id,
      start: oh.date,
      durationMin: oh.slot_duration_minutes,
      room: oh.room || '',
      subject: oh.subject || '',
      audience: oh.audience || 'student',
      booked: false,
      claimedBy: null,
      date: oh.date,
      start_time: oh.start_time,
      end_time: oh.end_time,
      slot_duration_minutes: oh.slot_duration_minutes,
      max_bookings: oh.max_bookings,
      is_active: oh.is_active,
    }));

    return res.json(successResponse({ slots }));
  } catch (err) {
    console.error('getTeacherOfficeHours Error:', err);
    return res.json(successResponse({ slots: [] }));
  }
}

async function createTeacherOfficeHour(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    // The UI publishes { start (datetime), duration_min, room, subject, audience }.
    // Derive date/start_time/end_time from start (the old handler demanded fields the
    // UI never sent → always 400; audit #61).
    const b = req.body;
    const start = b.start || b.date;
    if (!start) return res.status(400).json(errorResponse('start is required'));
    const durationMin = Number(b.duration_min || b.durationMin || b.slot_duration_minutes) || 30;
    const startDate = new Date(start);
    if (isNaN(startDate.getTime())) return res.status(400).json(errorResponse('start is not a valid date/time'));
    const pad = (n) => String(n).padStart(2, '0');
    const startTime = b.start_time || `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`;
    const endDate = new Date(startDate.getTime() + durationMin * 60000);
    const endTime = b.end_time || `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`;

    const officeHour = await OfficeHour.create({
      school_id: teacher.school_id,
      teacher_id: teacher.id,
      date: startDate,
      start_time: startTime,
      end_time: endTime,
      slot_duration_minutes: durationMin,
      max_bookings: b.max_bookings || 1,
      room: b.room || '',
      subject: b.subject || '',
      audience: b.audience || 'student',
      is_active: true,
    });

    return res.json(successResponse({ id: officeHour.id }, 'Office hour created'));
  } catch (err) {
    console.error('createTeacherOfficeHour Error:', err);
    return res.status(500).json(errorResponse('Failed to create office hour'));
  }
}

async function deleteTeacherOfficeHour(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    // The route param is :slotId, not :id — the old handler read req.params.id and
    // always 404'd (audit #62).
    const slotId = req.params.slotId || req.params.id;
    const officeHour = await OfficeHour.findOne({
      where: { id: slotId, teacher_id: teacher.id, school_id: teacher.school_id },
    });

    if (!officeHour) return res.status(404).json(errorResponse('Office hour not found'));

    await officeHour.update({ is_active: false });

    return res.json(successResponse({}, 'Office hour deleted'));
  } catch (err) {
    console.error('deleteTeacherOfficeHour Error:', err);
    return res.status(500).json(errorResponse('Failed to delete office hour'));
  }
}

async function getParentThreads(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const messages = await Message.findAll({
      where: {
        school_id: teacher.school_id,
        [Op.or]: [
          { sender_id: teacher.id, sender_type: 'teacher', recipient_type: 'parent' },
          { recipient_id: teacher.id, recipient_type: 'teacher', sender_type: 'parent' },
        ],
      },
      order: [['created_at', 'ASC']],
    });

    // Group by the child the thread is about (encoded in thread_id as `pc-<childId>`).
    // The component wants an ARRAY of { childId, parentName, relationship, childName,
    // unread, messages:[{id,text,sender,sentAt}] } — it got a {threads} wrapper (audit #60).
    const byChild = {};
    messages.forEach(m => {
      const fromTeacher = String(m.sender_id) === String(teacher.id);
      const childId = (m.thread_id && m.thread_id.startsWith('pc-')) ? m.thread_id.slice(3) : String(m.recipient_id || m.sender_id);
      if (!childId) return;
      if (!byChild[childId]) byChild[childId] = { messages: [], unread: 0 };
      byChild[childId].messages.push({ id: m.id, text: m.body, sender: fromTeacher ? 'teacher' : 'parent', sentAt: m.created_at });
      if (!fromTeacher && !m.is_read) byChild[childId].unread += 1;
    });

    const childIds = Object.keys(byChild);
    const students = childIds.length ? await Student.findAll({
      where: { id: childIds, school_id: teacher.school_id },
      include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }],
    }) : [];
    const childMap = Object.fromEntries(students.map(s => [String(s.id), `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.trim() || 'Student']));

    // (Resolving the specific guardian name/relationship from the child link is a
    // follow-up — kept generic so the thread renders and sends.)
    const threads = childIds.map(childId => ({
      childId,
      parentName: 'Parent/Guardian',
      relationship: 'Guardian',
      childName: childMap[childId] || `Student #${childId}`,
      unread: byChild[childId].unread,
      messages: byChild[childId].messages,
    }));

    return res.json(successResponse({ threads }));
  } catch (err) {
    console.error('getParentThreads Error:', err);
    return res.json(successResponse({ threads: [] }));
  }
}

async function sendParentMessage(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    // childId from the URL; the UI posts just { text } (audit #60).
    const { childId } = req.params;
    const body = req.body.body || req.body.text;
    if (!childId || !body) return res.status(400).json(errorResponse('text is required'));

    const message = await Message.create({
      school_id: teacher.school_id,
      sender_id: teacher.id,
      sender_type: 'teacher',
      recipient_id: childId,
      recipient_type: 'parent',
      subject: req.body.subject || 'Message from Teacher',
      body,
      thread_id: `pc-${childId}`,
      is_read: false,
    });

    return res.json(successResponse({ id: message.id, text: body, sender: 'teacher', sentAt: message.created_at }, 'Message sent'));
  } catch (err) {
    console.error('sendParentMessage Error:', err);
    return res.status(500).json(errorResponse('Failed to send message'));
  }
}

async function getStudentThreads(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const messages = await Message.findAll({
      where: {
        school_id: teacher.school_id,
        [Op.or]: [
          { sender_id: teacher.id, sender_type: 'teacher', recipient_type: 'student' },
          { recipient_id: teacher.id, recipient_type: 'teacher', sender_type: 'student' },
        ],
      },
      order: [['created_at', 'ASC']],
    });

    // Group by the student on the other end. The component wants an ARRAY of
    // { studentId, studentName, classroom, unread, messages:[{id,text,sender,sentAt}] }
    // — it previously got a {threads} wrapper keyed by thread_id and crashed (audit #59).
    const byStudent = {};
    messages.forEach(m => {
      const fromTeacher = String(m.sender_id) === String(teacher.id);
      const studentId = fromTeacher ? m.recipient_id : m.sender_id;
      if (!studentId) return;
      if (!byStudent[studentId]) byStudent[studentId] = { messages: [], unread: 0 };
      byStudent[studentId].messages.push({ id: m.id, text: m.body, sender: fromTeacher ? 'teacher' : 'student', sentAt: m.created_at });
      if (!fromTeacher && !m.is_read) byStudent[studentId].unread += 1;
    });

    // Include every student in the teacher's classes so a thread can be started fresh.
    const classes = await Class.findAll({ where: { class_teacher_id: teacher.id }, attributes: ['id', 'name'] });
    const classIds = classes.map(c => c.id);
    const classNameMap = Object.fromEntries(classes.map(c => [c.id, c.name]));
    const students = await Student.findAll({
      where: { classroom_id: { [Op.in]: classIds }, school_id: teacher.school_id, status: 'active' },
      include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }],
      order: [[sequelize.fn('lower', sequelize.col('user.first_name')), 'ASC']],
    });

    const threads = students.map(s => {
      const t = byStudent[s.id] || { messages: [], unread: 0 };
      return {
        studentId: s.id,
        studentName: `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.trim() || 'Student',
        classroom: classNameMap[s.classroom_id] || '',
        unread: t.unread,
        messages: t.messages,
      };
    });

    return res.json(successResponse({ threads }));
  } catch (err) {
    console.error('getStudentThreads Error:', err);
    return res.json(successResponse({ threads: [] }));
  }
}

async function sendStudentMessage(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    // studentId from the URL; the UI posts just { text } (audit #59).
    const { studentId } = req.params;
    const recipient_id = req.body.recipient_id || studentId;
    const body = req.body.body || req.body.text;
    if (!recipient_id || !body) return res.status(400).json(errorResponse('text is required'));

    const message = await Message.create({
      school_id: teacher.school_id,
      sender_id: teacher.id,
      sender_type: 'teacher',
      recipient_id,
      recipient_type: 'student',
      subject: req.body.subject || 'Message from Teacher',
      body,
      thread_id: `t${teacher.id}-s${recipient_id}`,
      is_read: false,
    });

    return res.json(successResponse({ id: message.id, text: body, sender: 'teacher', sentAt: message.created_at }, 'Message sent'));
  } catch (err) {
    console.error('sendStudentMessage Error:', err);
    return res.status(500).json(errorResponse('Failed to send message'));
  }
}

async function getBehaviourIncidents(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const incidents = await BehaviourIncident.findAll({
      where: { school_id: teacher.school_id, reported_by: teacher.id },
      order: [['created_at', 'DESC']],
      limit: 50,
    });

    // Map to the field names the list reads (type/title/notes/studentId/reportedAt) —
    // it previously got incident_type/description/created_at and showed blanks (audit #47).
    const formatted = incidents.map(i => {
      let evidence = [];
      try { evidence = i.evidence ? JSON.parse(i.evidence) : []; } catch { evidence = []; }
      return {
        id: i.id,
        studentId: i.student_id,
        student_id: i.student_id,
        type: i.incident_type,
        incident_type: i.incident_type,
        title: i.title || i.incident_type,
        severity: i.severity,
        notes: i.description,
        description: i.description,
        evidence,
        action_taken: i.action_taken,
        follow_up_required: i.follow_up_required,
        follow_up_date: i.follow_up_date,
        parent_notified: i.parent_notified,
        reportedAt: i.created_at,
        created_at: i.created_at,
      };
    });

    return res.json(successResponse({ incidents: formatted }));
  } catch (err) {
    console.error('getBehaviourIncidents Error:', err);
    return res.json(successResponse({ incidents: [] }));
  }
}

async function fileBehaviourIncident(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    // multer parses the multipart body; the UI sends type/title/notes + evidence files
    // (audit #46). Accept those names (and the snake_case originals).
    const student_id = req.body.student_id;
    const incident_type = req.body.incident_type || req.body.type;
    const severity = req.body.severity || 'medium';
    const title = req.body.title || '';
    const description = req.body.description || req.body.notes || '';
    if (!student_id || !incident_type) {
      return res.status(400).json(errorResponse('student and incident type are required'));
    }

    // Ownership: only file incidents for students in this teacher's classes.
    const classes = await Class.findAll({ where: { class_teacher_id: teacher.id }, attributes: ['id'] });
    const classIds = classes.map(c => c.id);
    const student = await Student.findOne({ where: { id: student_id, school_id: teacher.school_id }, attributes: ['id', 'classroom_id'] });
    if (!student || (classIds.length > 0 && !classIds.includes(student.classroom_id))) {
      return res.status(403).json(errorResponse('You can only file incidents for students in your classes'));
    }

    const evidence = (req.files || []).map(f => `/uploads/teacher/${f.filename}`);

    const incident = await BehaviourIncident.create({
      school_id: teacher.school_id,
      student_id,
      reported_by: teacher.id,
      incident_type,
      title,
      severity,
      description,
      evidence: JSON.stringify(evidence),
      action_taken: req.body.action_taken || '',
      follow_up_required: req.body.follow_up_required === 'true' || req.body.follow_up_required === true || false,
      follow_up_date: req.body.follow_up_date || null,
      parent_notified: req.body.parent_notified === 'true' || req.body.parent_notified === true || false,
    });

    return res.json(successResponse({ id: incident.id }, 'Incident filed'));
  } catch (err) {
    console.error('fileBehaviourIncident Error:', err);
    return res.status(500).json(errorResponse('Failed to file incident'));
  }
}

async function issueSubstituteToken(req, res) {
  try {
    const token = `SUB-${Date.now().toString(36).toUpperCase()}`;
    return res.json(successResponse({ token, expiresAt: new Date(Date.now() + (req.body.hours || 1) * 3600000).toISOString() }));
  } catch (err) {
    console.error('issueSubstituteToken Error:', err);
    return res.status(500).json(errorResponse('Failed to issue token'));
  }
}

async function revokeSubstituteToken(req, res) {
  try {
    return res.json(successResponse({}));
  } catch (err) {
    console.error('revokeSubstituteToken Error:', err);
    return res.status(500).json(errorResponse('Failed to revoke token'));
  }
}

async function listSubstituteTokens(req, res) {
  try {
    return res.json(successResponse({ tokens: [] }));
  } catch (err) {
    console.error('listSubstituteTokens Error:', err);
    return res.json(successResponse({ tokens: [] }));
  }
}

async function getLessonPlans(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { class_id, subject_id } = req.query;
    const where = { teacher_id: teacher.id, school_id: teacher.school_id };
    if (class_id) where.class_id = class_id;
    if (subject_id) where.subject_id = subject_id;

    const lessonPlans = await LessonPlan.findAll({
      where,
      order: [['date', 'DESC']],
      limit: 50,
    });

    // Emit title/weekOf and objectives-as-array (the composer reads those); keep the
    // raw topic/date too (audit #73).
    const formatted = lessonPlans.map(lp => {
      let objectives = [];
      try { objectives = lp.objectives ? JSON.parse(lp.objectives) : []; }
      catch { objectives = lp.objectives ? [lp.objectives] : []; }
      if (!Array.isArray(objectives)) objectives = objectives ? [String(objectives)] : [];
      return {
        id: lp.id,
        classId: lp.class_id,
        subjectId: lp.subject_id,
        class_id: lp.class_id,
        subject_id: lp.subject_id,
        title: lp.topic,
        topic: lp.topic,
        weekOf: lp.date ? new Date(lp.date).toISOString().split('T')[0] : '',
        date: lp.date,
        objectives,
        activities: lp.activities,
        materials: lp.materials,
        homework: lp.homework,
        reflection: lp.reflection,
        created_at: lp.created_at,
      };
    });

    return res.json(successResponse({ lesson_plans: formatted }));
  } catch (err) {
    console.error('getLessonPlans Error:', err);
    return res.json(successResponse({ lesson_plans: [] }));
  }
}

async function upsertLessonPlan(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    // Accept the composer's field names (title/weekOf/classId/subjectId, objectives as an
    // array) — the old handler required date+topic and 400'd on every save (audit #73).
    const b = req.body;
    const id = b.id;
    const topic = b.topic || b.title;
    if (!topic) return res.status(400).json(errorResponse('title is required'));
    const date = b.date || b.weekOf || new Date().toISOString().split('T')[0];
    const class_id = b.class_id ?? b.classId ?? null;
    const subject_id = b.subject_id ?? b.subjectId ?? null;
    const objectives = Array.isArray(b.objectives) ? JSON.stringify(b.objectives) : (b.objectives ?? null);
    const { activities, materials, homework, reflection } = b;

    let lessonPlan;
    if (id) {
      lessonPlan = await LessonPlan.findOne({
        where: { id, teacher_id: teacher.id, school_id: teacher.school_id },
      });
      if (lessonPlan) {
        await lessonPlan.update({
          class_id: class_id ?? lessonPlan.class_id,
          subject_id: subject_id ?? lessonPlan.subject_id,
          date: date ?? lessonPlan.date,
          topic: topic ?? lessonPlan.topic,
          objectives: objectives ?? lessonPlan.objectives,
          activities: activities ?? lessonPlan.activities,
          materials: materials ?? lessonPlan.materials,
          homework: homework ?? lessonPlan.homework,
          reflection: reflection ?? lessonPlan.reflection,
        });
      } else {
        return res.status(404).json(errorResponse('Lesson plan not found'));
      }
    } else {
      lessonPlan = await LessonPlan.create({
        school_id: teacher.school_id,
        teacher_id: teacher.id,
        class_id,
        subject_id,
        date,
        topic,
        objectives,
        activities,
        materials,
        homework,
        reflection,
      });
    }

    return res.json(successResponse({ id: lessonPlan.id }, 'Lesson plan saved'));
  } catch (err) {
    console.error('upsertLessonPlan Error:', err);
    return res.status(500).json(errorResponse('Failed to save lesson plan'));
  }
}

async function getFeedbackTemplates(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));
    const FeedbackTemplate = require('../models/FeedbackTemplate');
    const rows = await FeedbackTemplate.findAll({
      where: { teacher_id: teacher.id, school_id: teacher.school_id }, order: [['created_at', 'DESC']],
    });
    // 4 system defaults + the teacher's own persisted templates (audit #65).
    const SYSTEM = [
      { id: 'sys-excellent', label: 'Excellent', text: 'Excellent work. Keep this up.' },
      { id: 'sys-seeme', label: 'See me', text: 'Please come and see me before the next class.' },
      { id: 'sys-working', label: 'Show working', text: 'Show all working — partial credit is awarded for method.' },
      { id: 'sys-practice', label: 'Practice more', text: 'You are close - more practice on the homework set will help.' },
    ];
    const templates = [...SYSTEM, ...rows.map(t => ({ id: t.id, label: t.label, text: t.text }))];
    return res.json(successResponse({ templates }));
  } catch (err) {
    console.error('getFeedbackTemplates Error:', err);
    return res.json(successResponse({ templates: [] }));
  }
}

async function addFeedbackTemplate(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));
    const { label, text } = req.body;
    if (!text) return res.status(400).json(errorResponse('text is required'));
    const FeedbackTemplate = require('../models/FeedbackTemplate');
    const t = await FeedbackTemplate.create({
      school_id: teacher.school_id, teacher_id: teacher.id,
      label: label || String(text).slice(0, 30), text,
    });
    return res.json(successResponse({ id: t.id, label: t.label, text: t.text }, 'Template saved'));
  } catch (err) {
    console.error('addFeedbackTemplate Error:', err);
    return res.status(500).json(errorResponse('Failed to save template'));
  }
}

async function recommendResource(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { class_id, subject_id, title, description, resource_type, url } = req.body;
    if (!title) return res.status(400).json(errorResponse('title is required'));

    const resource = await LearningResource.create({
      school_id: teacher.school_id,
      class_id,
      subject_id,
      teacher_id: teacher.id,
      title,
      description: description || '',
      resource_type: resource_type || 'link',
      url: url || '',
      is_active: true,
      download_count: 0,
    });

    return res.json(successResponse({ id: resource.id }, 'Resource recommended'));
  } catch (err) {
    console.error('recommendResource Error:', err);
    return res.status(500).json(errorResponse('Failed to recommend resource'));
  }
}

async function referToCounsellor(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { student_id, reason, notify_parent } = req.body;
    if (!student_id || !reason) return res.status(400).json(errorResponse('student_id and reason are required'));

    const student = await Student.findOne({
      where: { id: student_id, school_id: teacher.school_id },
      include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }],
    });
    if (!student) return res.status(404).json(errorResponse('Student not found in your school'));
    const studentName = `${student.user?.first_name || ''} ${student.user?.last_name || ''}`.trim() || `#${student_id}`;

    // Persist a durable, auditable referral record routed for pastoral review.
    // Previously this wrote nothing and returned a fake id while the UI promised the
    // counsellor would see it (audit #43 — safeguarding). A dedicated counsellor-queue
    // model + real parent-notification delivery is a recommended follow-up.
    const note = await Notification.create({
      school_id: teacher.school_id,
      title: 'Counsellor referral',
      message: `${studentName} referred for pastoral support${notify_parent ? ' (parent to be notified)' : ''}: ${reason}`,
      type: 'counsellor_referral',
      is_read: false,
    });

    return res.json(successResponse({ referralId: `REF-${note.id}`, persisted: true }));
  } catch (err) {
    console.error('referToCounsellor Error:', err);
    return res.status(500).json(errorResponse('Failed to refer'));
  }
}

async function changeTeacherPassword(req, res) {
  try {
    const bcrypt = require('bcryptjs');
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json(errorResponse('Current and new password are required'));
    if (String(new_password).length < 8) return res.status(400).json(errorResponse('New password must be at least 8 characters'));
    if (String(new_password) === String(current_password)) return res.status(400).json(errorResponse('New password must differ from the current password'));
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json(errorResponse('User not found'));
    const ok = await bcrypt.compare(current_password, user.password);
    if (!ok) return res.status(400).json(errorResponse('Current password is incorrect'));
    user.password = await bcrypt.hash(String(new_password), 10);
    await user.save();
    return res.json(successResponse({}, 'Password updated'));
  } catch (err) {
    console.error('changeTeacherPassword Error:', err);
    return res.status(500).json(errorResponse('Failed to change password'));
  }
}

async function getTeacherWorkload(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    // The UI wants thisWeek as day buckets [{day:'mon', items:[{kind,label,start,...}]}] —
    // it previously got a flat assignment list and showed "No items" every day (audit #76).
    const TimetableSlot = require('../models/TimetableSlot');
    const DAY_IDS = ['mon', 'tue', 'wed', 'thu', 'fri'];
    const buckets = { mon: [], tue: [], wed: [], thu: [], fri: [] };

    const myClasses = await Class.findAll({ where: { class_teacher_id: teacher.id }, attributes: ['id'] });
    const myClassIds = myClasses.map(c => c.id);

    // Class periods from the teacher's own timetable slots.
    const slots = await TimetableSlot.findAll({
      where: { school_id: teacher.school_id, teacher_id: teacher.id, is_break: false },
      order: [['day', 'ASC'], ['period', 'ASC']],
    });
    const slotSubjectIds = [...new Set(slots.map(s => s.subject_id).filter(Boolean))];
    const slotClassIds = [...new Set(slots.map(s => s.class_id).filter(Boolean))];
    const [subs, cls] = await Promise.all([
      slotSubjectIds.length ? Subject.findAll({ where: { id: slotSubjectIds }, attributes: ['id', 'name'], raw: true }) : [],
      slotClassIds.length ? Class.findAll({ where: { id: slotClassIds }, attributes: ['id', 'name'], raw: true }) : [],
    ]);
    const subMap = Object.fromEntries(subs.map(s => [s.id, s.name]));
    const clsMap = Object.fromEntries(cls.map(c => [c.id, c.name]));
    slots.forEach(s => {
      const dayId = DAY_IDS[s.day];
      if (!dayId) return;
      buckets[dayId].push({
        kind: 'class',
        label: `${subMap[s.subject_id] || 'Class'}${clsMap[s.class_id] ? ' · ' + clsMap[s.class_id] : ''}`,
        start: s.start_time || '',
        durationMin: null,
      });
    });

    // This Monday → next Monday.
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
    const dayIdForDate = (d) => {
      const wd = new Date(d).getDay();
      return (wd >= 1 && wd <= 5) ? DAY_IDS[wd - 1] : null;
    };

    const assignments = await Assignment.findAll({
      where: { teacher_id: teacher.id, school_id: teacher.school_id },
      attributes: ['id', 'title', 'due_date'],
    });
    assignments.forEach(a => {
      if (!a.due_date) return;
      const due = new Date(a.due_date);
      if (due < weekStart || due >= weekEnd) return;
      const dayId = dayIdForDate(due);
      if (dayId) buckets[dayId].push({ kind: 'assignment-due', label: a.title || 'Assignment', dueAt: a.due_date });
    });

    const officeHours = await OfficeHour.findAll({ where: { teacher_id: teacher.id, school_id: teacher.school_id, is_active: true } });
    officeHours.forEach(oh => {
      if (!oh.date) return;
      const d = new Date(oh.date);
      if (d < weekStart || d >= weekEnd) return;
      const dayId = dayIdForDate(d);
      if (dayId) buckets[dayId].push({ kind: 'office-hour', label: `${oh.subject || 'Office hour'}${oh.room ? ' · ' + oh.room : ''}`, start: oh.start_time || '', durationMin: oh.slot_duration_minutes });
    });

    const thisWeek = DAY_IDS.map(day => ({ day, items: buckets[day] }));

    // Scope pending grades to THIS teacher's classes (was school-wide — audit #81).
    const pendingGrades = myClassIds.length ? await Grade.count({
      where: { school_id: teacher.school_id, classroom_id: { [Op.in]: myClassIds }, approval_status: 'draft' },
    }) : 0;
    const pendingAssignments = await Assignment.count({
      where: { teacher_id: teacher.id, school_id: teacher.school_id, due_date: { [Op.gte]: new Date() } },
    });
    const pendingMessages = await Message.count({
      where: { school_id: teacher.school_id, recipient_id: teacher.id, recipient_type: 'teacher', is_read: false },
    });

    return res.json(successResponse({
      thisWeek,
      totalHours: slots.length,
      pendingGrades,
      pendingAssignments,
      pendingMessages,
    }));
  } catch (err) {
    console.error('getTeacherWorkload Error:', err);
    return res.json(successResponse({ thisWeek: [] }));
  }
}

async function getTeacherPerformance(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const classes = await Class.findAll({
      where: { class_teacher_id: teacher.id },
      attributes: ['id'],
    });
    const classIds = classes.map(c => c.id);

    const grades = await Grade.findAll({
      where: { school_id: teacher.school_id, classroom_id: { [Op.in]: classIds } },
      include: [{ model: Subject, as: 'subject', attributes: ['id', 'name'] }],
    });

    const subjectAvgs = {};
    grades.forEach(g => {
      const name = g.subject?.name || 'Unknown';
      if (!subjectAvgs[name]) subjectAvgs[name] = [];
      if (g.total) subjectAvgs[name].push(g.total);
    });

    const classAverages = Object.entries(subjectAvgs).map(([subject, totals]) => ({
      subject,
      average: totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0,
      total_students: totals.length,
    }));

    return res.json(successResponse({
      // Add value/term so the chart plots (it reads p.value/p.term — audit #79).
      classAverages: classAverages.map(c => ({ ...c, value: c.average, term: c.subject, label: c.subject })),
      // These were hardcoded constants (3 days, 4.2/5, 95%) presented as real metrics
      // (audit #77). There is no grading-timeliness / parent-rating / attendance-
      // timeliness data source yet, so return null and let the UI show "—" rather than
      // invent numbers. (Computing them for real is a follow-up.)
      gradingTimelinessDays: null,
      parentFeedbackAvg: null,
      parentFeedbackCount: 0,
      attendanceTimelinessPct: null,
    }));
  } catch (err) {
    console.error('getTeacherPerformance Error:', err);
    return res.json(successResponse({}));
  }
}

async function getPeerReviews(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const givenByMe = await PeerReview.findAll({
      where: { school_id: teacher.school_id, reviewer_id: teacher.id },
      order: [['created_at', 'DESC']],
      limit: 20,
    });

    const receivedAboutMe = await PeerReview.findAll({
      where: { school_id: teacher.school_id, reviewee_id: teacher.id },
      order: [['created_at', 'DESC']],
      limit: 20,
    });

    const ratings = receivedAboutMe.map(r => r.rating).filter(Boolean);
    const avg = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0;

    // Count of reviews per star (1–5) — the UI reads breakdown[5..1] as star buckets, so
    // keying it by category produced an all-zero distribution (audit #75).
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    receivedAboutMe.forEach(r => {
      const star = Math.round(r.rating);
      if (star >= 1 && star <= 5) breakdown[star] += 1;
    });

    const recentComments = receivedAboutMe
      .filter(r => r.comment)
      .slice(0, 5)
      .map(r => ({ comment: r.comment, category: r.category, created_at: r.created_at }));

    // Resolve reviewee names so "Reviews I've given" shows a colleague, not an id (#75).
    const revieweeIds = [...new Set(givenByMe.map(r => r.reviewee_id).filter(Boolean))];
    const revTeachers = revieweeIds.length ? await Teacher.findAll({ where: { id: revieweeIds }, attributes: ['id', 'user_id'], raw: true }) : [];
    const revUserIds = revTeachers.map(t => t.user_id).filter(Boolean);
    const revUsers = revUserIds.length ? await User.findAll({ where: { id: revUserIds }, attributes: ['id', 'first_name', 'last_name'], raw: true }) : [];
    const revUserName = Object.fromEntries(revUsers.map(u => [String(u.id), `${u.first_name || ''} ${u.last_name || ''}`.trim()]));
    const nameByTeacherId = {};
    revTeachers.forEach(t => { nameByTeacherId[String(t.id)] = revUserName[String(t.user_id)] || `Teacher #${t.id}`; });

    return res.json(successResponse({
      givenByMe: givenByMe.map(r => ({
        id: r.id,
        reviewee_id: r.reviewee_id,
        toTeacher: nameByTeacherId[String(r.reviewee_id)] || `Teacher #${r.reviewee_id}`,
        subject: r.category,
        category: r.category,
        score: r.rating,
        rating: r.rating,
        comment: r.comment,
        anonymous: !!r.anonymous,
        created_at: r.created_at,
      })),
      receivedAboutMe: {
        average: avg,
        count: receivedAboutMe.length,
        breakdown,
        recentComments,
      },
    }));
  } catch (err) {
    console.error('getPeerReviews Error:', err);
    return res.json(successResponse({ givenByMe: [], receivedAboutMe: {} }));
  }
}

async function submitPeerReview(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { reviewee_id, rating, comment, anonymous } = req.body;
    const category = req.body.category || req.body.subject || 'general';
    if (!reviewee_id) return res.status(400).json(errorResponse('Please choose a colleague to review'));
    if (String(reviewee_id) === String(teacher.id)) return res.status(400).json(errorResponse('You cannot review yourself'));

    const review = await PeerReview.create({
      school_id: teacher.school_id,
      reviewer_id: teacher.id,
      reviewee_id,
      category,
      rating: rating != null ? Math.round(Number(rating)) : null,
      comment: comment || '',
      anonymous: anonymous === undefined ? true : !!anonymous,
    });

    return res.json(successResponse({ id: review.id }, 'Review submitted'));
  } catch (err) {
    console.error('submitPeerReview Error:', err);
    return res.status(500).json(errorResponse('Failed to submit review'));
  }
}

async function getColleagues(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const teachers = await Teacher.findAll({
      where: { school_id: teacher.school_id, id: { [Op.ne]: teacher.id } },
      attributes: ['id', 'user_id'],
    });
    const userIds = teachers.map(t => t.user_id).filter(Boolean);
    const users = userIds.length ? await User.findAll({ where: { id: userIds }, attributes: ['id', 'first_name', 'last_name'], raw: true }) : [];
    const userName = Object.fromEntries(users.map(u => [String(u.id), `${u.first_name || ''} ${u.last_name || ''}`.trim()]));
    const colleagues = teachers.map(t => ({
      id: t.id,
      name: userName[String(t.user_id)] || `Teacher #${t.id}`,
    }));

    return res.json(successResponse({ colleagues }));
  } catch (err) {
    console.error('getColleagues Error:', err);
    return res.json(successResponse({ colleagues: [] }));
  }
}

async function getSpotlightStudent(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const spotlight = await SpotlightStudent.findOne({
      where: {
        school_id: teacher.school_id,
        teacher_id: teacher.id,
        week_start: { [Op.lte]: weekEnd },
        week_end: { [Op.gte]: weekStart },
      },
      include: [{ model: Student, as: 'student', include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }] }],
    });

    if (!spotlight) return res.json(successResponse({}));

    return res.json(successResponse({
      id: spotlight.id,
      student_id: spotlight.student_id,
      student_name: spotlight.student?.user ? `${spotlight.student.user.first_name} ${spotlight.student.user.last_name}` : 'Unknown',
      reason: spotlight.reason,
      week_start: spotlight.week_start,
      week_end: spotlight.week_end,
    }));
  } catch (err) {
    console.error('getSpotlightStudent Error:', err);
    return res.json(successResponse({}));
  }
}

async function setSpotlightStudent(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { student_id, reason } = req.body;
    if (!student_id) return res.status(400).json(errorResponse('student_id is required'));

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    let spotlight = await SpotlightStudent.findOne({
      where: { school_id: teacher.school_id, teacher_id: teacher.id, week_start: { [Op.lte]: weekEnd }, week_end: { [Op.gte]: weekStart } },
    });

    if (spotlight) {
      await spotlight.update({ student_id, reason: reason || spotlight.reason, week_start: weekStart, week_end: weekEnd });
    } else {
      spotlight = await SpotlightStudent.create({
        school_id: teacher.school_id,
        teacher_id: teacher.id,
        student_id,
        reason: reason || '',
        week_start: weekStart,
        week_end: weekEnd,
      });
    }

    return res.json(successResponse({ id: spotlight.id }, 'Spotlight student set'));
  } catch (err) {
    console.error('setSpotlightStudent Error:', err);
    return res.status(500).json(errorResponse('Failed to set spotlight'));
  }
}

async function getCohortCompare(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const classes = await Class.findAll({
      where: { class_teacher_id: teacher.id },
      attributes: ['id'],
    });
    const classIds = classes.map(c => c.id);

    const grades = await Grade.findAll({
      where: { school_id: teacher.school_id, classroom_id: { [Op.in]: classIds } },
      include: [{ model: Subject, as: 'subject', attributes: ['id', 'name'] }, { model: Term, as: 'term', attributes: ['id', 'name'] }],
    });

    const subjectMap = {};
    grades.forEach(g => {
      const name = g.subject?.name || 'Unknown';
      const term = g.term?.name || 'Unknown';
      const key = `${name} - ${term}`;
      if (!subjectMap[key]) subjectMap[key] = [];
      if (g.total) subjectMap[key].push(g.total);
    });

    const thisYearPerSubject = Object.entries(subjectMap).map(([label, totals]) => ({
      label,
      average: totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0,
      highest: totals.length ? Math.max(...totals) : 0,
      lowest: totals.length ? Math.min(...totals) : 0,
      count: totals.length,
    }));

    return res.json(successResponse({ thisYearPerSubject }));
  } catch (err) {
    console.error('getCohortCompare Error:', err);
    return res.json(successResponse({ thisYearPerSubject: [] }));
  }
}

async function getVoiceDigest(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const classes = await Class.findAll({
      where: { class_teacher_id: teacher.id },
      attributes: ['id', 'name'],
    });

    const classIds = classes.map(c => c.id);
    const studentCount = await Student.count({
      where: { classroom_id: { [Op.in]: classIds }, school_id: teacher.school_id, status: 'active' },
    });

    const gradeCount = await Grade.count({
      where: { school_id: teacher.school_id, classroom_id: { [Op.in]: classIds } },
    });

    const attendanceCount = await Attendance.count({
      where: { school_id: teacher.school_id, classroom_id: { [Op.in]: classIds }, date: new Date().toISOString().split('T')[0] },
    });

    const text = `You have ${classes.length} class(es) with ${studentCount} total students. ${gradeCount} grade(s) recorded. ${attendanceCount} attendance record(s) today.`;

    return res.json(successResponse({ text }));
  } catch (err) {
    console.error('getVoiceDigest Error:', err);
    return res.json(successResponse({ text: '' }));
  }
}

async function getGradeReceipts(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const grades = await Grade.findAll({
      where: { school_id: teacher.school_id, approval_status: 'approved' },
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name'] },
        { model: Term, as: 'term', attributes: ['id', 'name'] },
      ],
      order: [['approved_at', 'DESC']],
      limit: 50,
    });

    const receipts = grades.map(g => ({
      id: g.id,
      subject: g.subject?.name || 'Unknown',
      term: g.term?.name || 'Unknown',
      total: g.total,
      grade_letter: g.grade_letter,
      approved_at: g.approved_at,
    }));

    return res.json(successResponse({ receipts }));
  } catch (err) {
    console.error('getGradeReceipts Error:', err);
    return res.json(successResponse({ receipts: [] }));
  }
}

async function getGradeReceipt(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { id } = req.params;
    const grade = await Grade.findOne({
      where: { id, school_id: teacher.school_id },
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        { model: Term, as: 'term', attributes: ['id', 'name'] },
      ],
    });

    if (!grade) return res.status(404).json(errorResponse('Grade receipt not found'));

    return res.json(successResponse({
      id: grade.id,
      student_id: grade.student_id,
      subject: grade.subject?.name || 'Unknown',
      term: grade.term?.name || 'Unknown',
      ca: grade.ca,
      midterm: grade.midterm,
      final: grade.final,
      total: grade.total,
      grade_letter: grade.grade_letter,
      remarks: grade.remarks,
      approval_status: grade.approval_status,
      approved_at: grade.approved_at,
    }));
  } catch (err) {
    console.error('getGradeReceipt Error:', err);
    return res.json(successResponse({}));
  }
}

async function getTeacherCredentials(req, res) {
  try {
    const teacher = await Teacher.findOne({
      where: { user_id: req.user.id },
      attributes: ['years_experience', 'bio', 'linkedin_url', 'degrees', 'certifications'],
    });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    return res.json(successResponse({
      years_experience: teacher.years_experience,
      bio: teacher.bio,
      linkedin_url: teacher.linkedin_url,
      degrees: teacher.degrees || [],
      certifications: teacher.certifications || [],
    }));
  } catch (err) {
    console.error('getTeacherCredentials Error:', err);
    return res.status(500).json(errorResponse('Failed to fetch credentials'));
  }
}

async function updateTeacherCredentials(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    await teacher.update({
      years_experience: req.body.years_experience ?? teacher.years_experience,
      bio: req.body.bio ?? teacher.bio,
      linkedin_url: req.body.linkedin_url ?? teacher.linkedin_url,
      degrees: req.body.degrees ?? teacher.degrees,
      certifications: req.body.certifications ?? teacher.certifications,
    });

    return res.json(successResponse({}));
  } catch (err) {
    console.error('updateTeacherCredentials Error:', err);
    return res.status(500).json(errorResponse('Failed to update credentials'));
  }
}

async function getModificationRequests(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const requests = await ModificationRequest.findAll({
      where: { requested_by: req.user.id, school_id: teacher.school_id },
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name'] },
        { model: Student, as: 'student', include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }] },
      ],
      order: [['created_at', 'DESC']],
    });

    const formatted = requests.map(r => ({
      id: r.id,
      student_id: r.student_id,
      student_name: r.student?.user ? `${r.student.user.first_name} ${r.student.user.last_name}` : 'Unknown',
      subject_id: r.subject_id,
      subject_name: r.subject?.name || 'Unknown',
      request_type: r.request_type,
      reason: r.reason,
      current_value: r.current_value,
      requested_value: r.requested_value,
      status: r.status,
      reviewed_at: r.reviewed_at,
      created_at: r.created_at,
    }));

    return res.json(successResponse({ requests: formatted }));
  } catch (err) {
    console.error('getModificationRequests Error:', err);
    return res.status(500).json(errorResponse('Failed to fetch requests'));
  }
}

async function submitModificationRequest(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { student_id, subject_id, grade_id, request_type, reason, current_value, requested_value } = req.body;
    if (!request_type || !reason) return res.status(400).json(errorResponse('request_type and reason are required'));

    const request = await ModificationRequest.create({
      school_id: teacher.school_id,
      student_id: student_id || null,
      subject_id: subject_id || null,
      grade_id: grade_id || null,
      requested_by: teacher.id,
      request_type,
      reason,
      current_value: current_value || '',
      requested_value: requested_value || '',
      status: 'pending',
    });

    return res.json(successResponse({ id: request.id }, 'Request submitted'));
  } catch (err) {
    console.error('submitModificationRequest Error:', err);
    return res.status(500).json(errorResponse('Failed to submit request'));
  }
}

async function withdrawModificationRequest(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { id } = req.params;
    const modRequest = await ModificationRequest.findOne({
      where: { id, requested_by: teacher.id, school_id: teacher.school_id },
    });

    if (!modRequest) return res.status(404).json(errorResponse('Request not found'));
    if (modRequest.status !== 'pending') return res.status(400).json(errorResponse('Only pending requests can be withdrawn'));

    await modRequest.update({ status: 'withdrawn' });

    return res.json(successResponse({}, 'Request withdrawn'));
  } catch (err) {
    console.error('withdrawModificationRequest Error:', err);
    return res.status(500).json(errorResponse('Failed to withdraw request'));
  }
}

async function getClassAnalytics(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { class_id, term_id } = req.query;
    if (!class_id) return res.status(400).json(errorResponse('class_id is required'));

    const grades = await Grade.findAll({
      where: { classroom_id: class_id, school_id: teacher.school_id, ...(term_id ? { term_id } : {}) },
    });

    const totals = grades.map(g => g.total).filter(Boolean);
    const avg = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0;
    const highest = totals.length ? Math.max(...totals) : 0;
    const lowest = totals.length ? Math.min(...totals) : 0;
    const passed = totals.filter(t => t >= 40).length;

    // Per-term average for this class so the Term-over-Term trend chart can render — the
    // endpoint returned no `trend`, so the chart was permanently dead (audit #48).
    const allGrades = await Grade.findAll({
      where: { classroom_id: class_id, school_id: teacher.school_id },
      attributes: ['term_id', 'total'],
      raw: true,
    });
    const byTerm = {};
    allGrades.forEach(g => {
      if (g.total == null) return;
      (byTerm[g.term_id] = byTerm[g.term_id] || []).push(g.total);
    });
    const termIds = Object.keys(byTerm);
    const terms = termIds.length ? await Term.findAll({ where: { id: termIds }, attributes: ['id', 'name'], raw: true }) : [];
    const termNameMap = Object.fromEntries(terms.map(t => [String(t.id), t.name]));
    const trend = termIds
      .map(tid => {
        const arr = byTerm[tid];
        const a = Math.round(arr.reduce((x, y) => x + y, 0) / arr.length);
        return { term_id: tid, term: termNameMap[tid] || `Term ${tid}`, term_name: termNameMap[tid] || `Term ${tid}`, average: a, value: a };
      })
      .sort((x, y) => Number(x.term_id) - Number(y.term_id));

    return res.json(successResponse({
      average: avg,
      highest,
      lowest,
      pass_rate: totals.length ? Math.round(passed / totals.length * 100) : 0,
      total_students: totals.length,
      term_id,
      trend,
    }));
  } catch (err) {
    console.error('getClassAnalytics Error:', err);
    return res.status(500).json(errorResponse('Failed to fetch analytics'));
  }
}

async function getAssignments(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { class_id, subject_id } = req.query;
    const where = { teacher_id: teacher.id, school_id: teacher.school_id, is_active: true };
    if (class_id) where.class_id = class_id;
    if (subject_id) where.subject_id = subject_id;

    const assignments = await Assignment.findAll({
      where,
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        { model: Class, as: 'class', attributes: ['id', 'name', 'form'] },
      ],
      order: [['due_date', 'DESC']],
    });

    const formatted = assignments.map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      due_date: a.due_date,
      max_score: a.max_score,
      attachment_path: a.attachment_path,
      subject: a.Subject || a.subject,
      class: a.Class || a.class,
      created_at: a.created_at,
    }));

    return res.json(successResponse({ assignments: formatted }));
  } catch (err) {
    console.error('getAssignments Error:', err);
    return res.status(500).json(errorResponse('Failed to fetch assignments'));
  }
}

async function createAssignment(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { class_id, subject_id, title, description, due_date, max_score } = req.body;
    if (!title || !due_date) return res.status(400).json(errorResponse('title and due_date are required'));

    const assignment = await Assignment.create({
      school_id: teacher.school_id,
      class_id,
      subject_id,
      teacher_id: teacher.id,
      title,
      description: description || '',
      due_date,
      max_score: max_score || 100,
      is_active: true,
    });

    return res.json(successResponse({ id: assignment.id }, 'Assignment created'));
  } catch (err) {
    console.error('createAssignment Error:', err);
    return res.status(500).json(errorResponse('Failed to create assignment'));
  }
}

async function deleteAssignment(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { id } = req.params;
    const assignment = await Assignment.findOne({
      where: { id, teacher_id: teacher.id, school_id: teacher.school_id },
    });

    if (!assignment) return res.status(404).json(errorResponse('Assignment not found'));

    await assignment.update({ is_active: false });

    return res.json(successResponse({}, 'Assignment deleted'));
  } catch (err) {
    console.error('deleteAssignment Error:', err);
    return res.status(500).json(errorResponse('Failed to delete assignment'));
  }
}

async function getTeacherExams(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { class_id } = req.query;
    const where = { school_id: teacher.school_id, is_active: true };
    if (class_id) where.classroom_id = class_id;

    const exams = await Exam.findAll({ where, order: [['date', 'DESC']] });

    // Resolve classroom + subject names and per-exam result counts (the UI shows these
    // and previously got raw Exam rows with none of them — audit #35).
    const classIds = [...new Set(exams.map(e => e.classroom_id).filter(Boolean))];
    const subjectIds = [...new Set(exams.map(e => e.subject_id).filter(Boolean))];
    const [classes, subjects] = await Promise.all([
      classIds.length ? Class.findAll({ where: { id: { [Op.in]: classIds } }, attributes: ['id', 'name'], raw: true }) : [],
      subjectIds.length ? Subject.findAll({ where: { id: { [Op.in]: subjectIds } }, attributes: ['id', 'name'], raw: true }) : [],
    ]);
    const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));
    const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s.name]));

    const examIds = exams.map(e => e.id);
    const counts = examIds.length ? await ExamResult.findAll({
      where: { exam_id: { [Op.in]: examIds } },
      attributes: ['exam_id', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
      group: ['exam_id'], raw: true,
    }) : [];
    const countMap = {};
    counts.forEach(c => { countMap[c.exam_id] = parseInt(c.cnt, 10) || 0; });

    const formatted = exams.map(e => ({
      id: e.id,
      name: e.name,
      exam_type: e.exam_type || null,
      classroom: classMap[e.classroom_id] || '',
      subject: subjectMap[e.subject_id] || '',
      date: e.date ? new Date(e.date).toISOString().split('T')[0] : '',
      total_marks: e.total_marks,
      result_count: countMap[e.id] || 0,
      classroom_id: e.classroom_id,
      subject_id: e.subject_id,
      term_id: e.term_id,
    }));

    return res.json(successResponse({ exams: formatted }));
  } catch (err) {
    console.error('getTeacherExams Error:', err);
    return res.status(500).json(errorResponse('Failed to fetch exams'));
  }
}

async function getExamResults(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { examId } = req.params;

    const exam = await Exam.findOne({
      where: { id: examId, school_id: teacher.school_id },
    });
    if (!exam) return res.status(404).json(errorResponse('Exam not found'));

    const [klass, subject] = await Promise.all([
      exam.classroom_id ? Class.findByPk(exam.classroom_id, { attributes: ['id', 'name'] }) : null,
      exam.subject_id ? Subject.findByPk(exam.subject_id, { attributes: ['id', 'name'] }) : null,
    ]);

    // Return the exam's class roster, each row carrying that student's existing exam
    // mark. Previously this returned term Grade rows with no student_name/marks and no
    // `exam` object, so the entry table rendered blank (audit #35).
    const students = await Student.findAll({
      where: { classroom_id: exam.classroom_id, school_id: teacher.school_id, status: 'active' },
      include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }],
      order: [[sequelize.fn('lower', sequelize.col('user.first_name')), 'ASC']],
    });
    const existing = await ExamResult.findAll({ where: { exam_id: examId, school_id: teacher.school_id }, raw: true });
    const markMap = {};
    existing.forEach(er => { markMap[er.student_id] = er; });

    const results = students.map(s => ({
      student_id: s.id,
      student_name: `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.trim() || 'Student',
      marks: markMap[s.id] ? markMap[s.id].marks : null,
      remarks: markMap[s.id] ? (markMap[s.id].remarks || '') : '',
    }));

    return res.json(successResponse({
      exam: {
        id: exam.id,
        name: exam.name,
        classroom: klass?.name || '',
        subject: subject?.name || '',
        date: exam.date ? new Date(exam.date).toISOString().split('T')[0] : '',
        total_marks: exam.total_marks,
      },
      results,
      exam_name: exam.name,
    }));
  } catch (err) {
    console.error('getExamResults Error:', err);
    return res.status(500).json(errorResponse('Failed to fetch results'));
  }
}

async function saveExamResults(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { examId } = req.params;
    const { results } = req.body;
    if (!results || !Array.isArray(results)) return res.status(400).json(errorResponse('results array is required'));

    const exam = await Exam.findOne({
      where: { id: examId, school_id: teacher.school_id },
    });
    if (!exam) return res.status(404).json(errorResponse('Exam not found'));

    // Ownership: only the class teacher may enter this exam's results. Previously any
    // teacher in the school could write these (audit #36).
    if (exam.classroom_id) {
      const ownsClass = await Class.findOne({ where: { id: exam.classroom_id, class_teacher_id: teacher.id }, attributes: ['id'] });
      if (!ownsClass) return res.status(403).json(errorResponse("You are not assigned to this exam's class"));
    }

    // Persist into ExamResult (keyed exam_id + student_id) — NOT the term Grade. The old
    // code blind-upserted a Grade row (reading r.score/r.total which the client never
    // sends) and nulled the student's existing ca/midterm (audit #30). Exam marks now
    // live in their own table and never touch term grades.
    let count = 0;
    for (const r of results) {
      if (!r || !r.student_id) continue;
      const marks = (r.marks === undefined || r.marks === null || r.marks === '') ? null : parseFloat(r.marks);
      if (marks === null || isNaN(marks)) continue;
      const [row] = await ExamResult.findOrCreate({
        where: { exam_id: examId, student_id: r.student_id },
        defaults: { school_id: teacher.school_id, exam_id: examId, student_id: r.student_id, marks, remarks: r.remarks || '' },
      });
      await row.update({ marks, remarks: r.remarks || '' });
      count++;
    }

    return res.json(successResponse({ count }, `${count} result(s) saved`));
  } catch (err) {
    console.error('saveExamResults Error:', err);
    return res.status(500).json(errorResponse('Failed to save results'));
  }
}

async function getAnnouncements(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    // Only this teacher's own announcements — previously this returned every school-wide
    // notification, mislabeled as the teacher's, with none of the fields the UI reads
    // (audit #66).
    const rows = await Notification.findAll({
      where: { school_id: teacher.school_id, user_id: req.user.id, type: { [Op.like]: 'announcement%' } },
      order: [['created_at', 'DESC']],
      limit: 30,
    });

    const announcements = rows.map(n => ({
      id: n.id,
      subject: n.title,
      body: n.message,
      recipient_role: (n.type || '').split(':')[1] || 'all',
      is_broadcast: true,
      created_at: n.created_at,
    }));

    return res.json(successResponse({ announcements }));
  } catch (err) {
    console.error('getAnnouncements Error:', err);
    return res.status(500).json(errorResponse('Failed to fetch announcements'));
  }
}

async function sendAnnouncement(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    // UI sends { subject, body, recipient_role }; the old handler read title/message/type
    // and dropped all three (audit #63). Map them, encode the audience in `type`, and
    // stamp the teacher as creator (user_id) so getAnnouncements can scope to them.
    const subject = req.body.subject || req.body.title;
    const body = req.body.body || req.body.message;
    const recipientRole = req.body.recipient_role || 'all';
    if (!subject || !body) return res.status(400).json(errorResponse('subject and body are required'));

    const announcement = await Notification.create({
      school_id: teacher.school_id,
      user_id: req.user.id,
      title: subject,
      message: body,
      type: `announcement:${recipientRole}`,
      is_read: false,
    });

    return res.json(successResponse({
      id: announcement.id,
      announcement: { id: announcement.id, subject, body, recipient_role: recipientRole, created_at: announcement.created_at },
    }, 'Announcement sent'));
  } catch (err) {
    console.error('sendAnnouncement Error:', err);
    return res.status(500).json(errorResponse('Failed to send announcement'));
  }
}

async function getMessages(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const messages = await Message.findAll({
      where: {
        school_id: teacher.school_id,
        [Op.or]: [{ sender_id: teacher.id }, { recipient_id: teacher.id }],
      },
      order: [['created_at', 'DESC']],
      limit: 50,
    });

    const conversations = messages.map(m => ({
      id: m.id,
      thread_id: m.thread_id,
      subject: m.subject,
      body: m.body,
      sender_id: m.sender_id,
      sender_type: m.sender_type,
      recipient_id: m.recipient_id,
      recipient_type: m.recipient_type,
      is_read: m.is_read,
      created_at: m.created_at,
    }));

    return res.json(successResponse({ conversations }));
  } catch (err) {
    console.error('getMessages Error:', err);
    return res.status(500).json(errorResponse('Failed to fetch messages'));
  }
}

async function sendMessage(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { recipient_id, recipient_type, subject, body, thread_id } = req.body;
    if (!recipient_id || !body) return res.status(400).json(errorResponse('recipient_id and body are required'));

    const message = await Message.create({
      school_id: teacher.school_id,
      sender_id: teacher.id,
      sender_type: 'teacher',
      recipient_id,
      recipient_type: recipient_type || 'student',
      subject: subject || '',
      body,
      thread_id: thread_id || `thread-${Date.now()}`,
      is_read: false,
    });

    return res.json(successResponse({ id: message.id }, 'Message sent'));
  } catch (err) {
    console.error('sendMessage Error:', err);
    return res.status(500).json(errorResponse('Failed to send message'));
  }
}

async function getStudentGradeHistory(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { studentId } = req.params;

    // Tenant scoping: confirm the student belongs to THIS teacher's school before
    // returning anything. Previously this endpoint had no scoping at all, letting any
    // teacher read any student's grades across schools (audit #108 — cross-tenant IDOR).
    // (Tightening to per-class ownership within the school is a recommended follow-up.)
    const student = await Student.findOne({
      where: { id: studentId, school_id: teacher.school_id },
      attributes: ['id'],
    });
    if (!student) {
      return res.status(403).json(errorResponse('You are not authorised to view this student'));
    }

    const grades = await Grade.findAll({
      where: { student_id: studentId, school_id: teacher.school_id },
      include: [{ model: Subject, as: 'subject', attributes: ['id', 'name'] }, { model: Term, as: 'term', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
    });
    return res.json(successResponse({ grades }));
  } catch (err) {
    console.error('getStudentGradeHistory Error:', err);
    return res.status(500).json(errorResponse('Failed to fetch grades'));
  }
}

async function getStudentReportCards(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    // studentId comes from the route param — the UI sends no query string, so the old
    // `req.query.student_id` check always 400'd (audit #28).
    const studentId = req.params.studentId || req.query.student_id;
    const { term_id } = req.query;
    if (!studentId) return res.status(400).json(errorResponse('student id is required'));

    // Ownership + name (the alias is `user`, not `User` — fixes the always-"Unknown" bug #4).
    const student = await Student.findOne({
      where: { id: studentId, school_id: teacher.school_id },
      include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name', 'email'] }],
    });
    if (!student) return res.status(403).json(errorResponse('You are not authorised to view this student'));

    const where = { student_id: studentId, school_id: teacher.school_id };
    if (term_id) where.term_id = term_id;
    const grades = await Grade.findAll({
      where,
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        { model: Term, as: 'term', attributes: ['id', 'name', 'academic_year_id'] },
      ],
    });

    // Classmates' grades for class-rank computation.
    const classmates = student.classroom_id ? await Student.findAll({
      where: { classroom_id: student.classroom_id, school_id: teacher.school_id, status: 'active' }, attributes: ['id'],
    }) : [];
    const classSize = classmates.length;
    const classGrades = classmates.length ? await Grade.findAll({
      where: { student_id: classmates.map(c => c.id), school_id: teacher.school_id }, attributes: ['student_id', 'term_id', 'total'], raw: true,
    }) : [];

    // One report card per term (the UI renders a card with term/year/average/rank/publish
    // state — it previously got flat per-subject rows and rendered nothing usable, #31).
    const byTerm = {};
    grades.forEach(g => {
      const tid = g.term_id;
      if (!byTerm[tid]) byTerm[tid] = { term_id: tid, term: g.term?.name || 'Term', academic_year_id: g.term?.academic_year_id, totals: [], allApproved: true, lastApprovedAt: null, subjects: [] };
      const b = byTerm[tid];
      if (g.total != null) b.totals.push(g.total);
      if (g.approval_status !== 'approved') b.allApproved = false;
      if (g.approved_at && (!b.lastApprovedAt || new Date(g.approved_at) > new Date(b.lastApprovedAt))) b.lastApprovedAt = g.approved_at;
      b.subjects.push({ subject: g.subject?.name, total: g.total, grade_letter: g.grade_letter });
    });

    const ayIds = [...new Set(Object.values(byTerm).map(b => b.academic_year_id).filter(Boolean))];
    const ays = ayIds.length ? await AcademicYear.findAll({ where: { id: ayIds }, attributes: ['id', 'name'], raw: true }) : [];
    const ayName = Object.fromEntries(ays.map(a => [a.id, a.name]));

    const report_cards = Object.values(byTerm).map(b => {
      const avg = b.totals.length ? Math.round(b.totals.reduce((a, x) => a + x, 0) / b.totals.length) : null;
      let class_rank = null;
      if (avg != null && classGrades.length) {
        const perStudent = {};
        classGrades.filter(g => String(g.term_id) === String(b.term_id) && g.total != null)
          .forEach(g => { (perStudent[g.student_id] = perStudent[g.student_id] || []).push(g.total); });
        const avgs = Object.values(perStudent).map(arr => arr.reduce((a, x) => a + x, 0) / arr.length);
        class_rank = 1 + avgs.filter(a => a > avg).length;
      }
      const published = b.allApproved && b.totals.length > 0;
      return {
        id: `${studentId}-${b.term_id}`,
        term: b.term,
        academic_year: ayName[b.academic_year_id] || '',
        average_score: avg,
        class_rank,
        class_size: classSize || null,
        is_published: published,
        published_at: published ? b.lastApprovedAt : null,
        pdf_url: null, // no PDF generation yet — the UI hides the button when null
        qr_code: null,
        subjects: b.subjects,
      };
    });

    return res.json(successResponse({
      student_name: student?.user ? `${student.user.first_name} ${student.user.last_name}` : 'Unknown',
      admission_number: student?.admission_number,
      report_cards,
    }));
  } catch (err) {
    console.error('getStudentReportCards Error:', err);
    return res.status(500).json(errorResponse('Failed to fetch report cards'));
  }
}

async function getResources(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { class_id, subject_id } = req.query;
    const where = { teacher_id: teacher.id, school_id: teacher.school_id, is_active: true };
    if (class_id) where.class_id = class_id;
    if (subject_id) where.subject_id = subject_id;

    const resources = await LearningResource.findAll({
      where,
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name'] },
        { model: Class, as: 'class', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    });

    const formatted = resources.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      resource_type: r.resource_type,
      file_path: r.file_path,
      url: r.url,
      subject: r.Subject || r.subject,
      class: r.Class || r.class,
      download_count: r.download_count,
      created_at: r.created_at,
    }));

    return res.json(successResponse({ resources: formatted }));
  } catch (err) {
    console.error('getResources Error:', err);
    return res.status(500).json(errorResponse('Failed to fetch resources'));
  }
}

async function uploadResource(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { class_id, subject_id, title, description, resource_type } = req.body;
    if (!title) return res.status(400).json(errorResponse('title is required'));

    // Persist the uploaded file. The route now has multer (audit #44) — req.file is the
    // saved file; link-type resources still pass a url in the body.
    let file_path = req.body.file_path || '';
    let url = req.body.url || '';
    if (req.file) {
      file_path = req.file.filename;
      url = `/uploads/teacher/${req.file.filename}`;
    }

    const resource = await LearningResource.create({
      school_id: teacher.school_id,
      class_id: class_id || null,
      subject_id: subject_id || null,
      teacher_id: teacher.id,
      title,
      description: description || '',
      resource_type: resource_type || 'document',
      file_path,
      url,
      is_active: true,
      download_count: 0,
    });

    return res.json(successResponse({
      id: resource.id,
      url: resource.url,
      resource: {
        id: resource.id,
        title: resource.title,
        description: resource.description,
        resource_type: resource.resource_type,
        file_path: resource.file_path,
        url: resource.url,
        class_id: resource.class_id,
        created_at: resource.created_at,
      },
    }, 'Resource uploaded'));
  } catch (err) {
    console.error('uploadResource Error:', err);
    return res.status(500).json(errorResponse('Failed to upload resource'));
  }
}

async function deleteResource(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { id } = req.params;
    const resource = await LearningResource.findOne({
      where: { id, teacher_id: teacher.id, school_id: teacher.school_id },
    });

    if (!resource) return res.status(404).json(errorResponse('Resource not found'));

    await resource.update({ is_active: false });

    return res.json(successResponse({}, 'Resource deleted'));
  } catch (err) {
    console.error('deleteResource Error:', err);
    return res.status(500).json(errorResponse('Failed to delete resource'));
  }
}

async function generateTimetable(req, res) {
  try {
    return res.json(successResponse({}, 'Timetable generated'));
  } catch (err) {
    console.error('generateTimetable Error:', err);
    return res.status(500).json(errorResponse('Failed to generate timetable'));
  }
}

async function getAcademicCalendar(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    // Resolve academic-year names separately — the Term→AcademicYear association isn't
    // registered, so the eager include 500'd (audit #12).
    const terms = await Term.findAll({
      where: { school_id: teacher.school_id },
      order: [['start_date', 'ASC']],
    });
    const ayIds = [...new Set(terms.map(t => t.academic_year_id).filter(Boolean))];
    const ays = ayIds.length ? await AcademicYear.findAll({ where: { id: ayIds }, attributes: ['id', 'name'], raw: true }) : [];
    const ayName = Object.fromEntries(ays.map(a => [a.id, a.name]));

    const events = [];
    terms.forEach(t => {
      const yr = ayName[t.academic_year_id] || '';
      if (t.start_date) events.push({ id: `term-start-${t.id}`, title: `${t.name} begins`, start: t.start_date, end: t.start_date, type: 'term', academic_year: yr });
      if (t.end_date) events.push({ id: `term-end-${t.id}`, title: `${t.name} ends`, start: t.end_date, end: t.end_date, type: 'term', academic_year: yr });
    });

    return res.json(successResponse({ events }));
  } catch (err) {
    console.error('getAcademicCalendar Error:', err);
    return res.status(500).json(errorResponse('Failed to fetch calendar'));
  }
}

module.exports = {
  getTeacherMe,
  getTeacherClasses,
  getTeacherStudents,
  getTeacherGradebook,
  saveGradeDraft,
  submitGradesForLocking,
  getGradeHistory,
  getTeacherTimetable,
  getTeacherExamDuties,
  getTeacherAttendanceStatus,
  recordClassAttendance,
  getTeacherAtRiskStudents,
  getTeacherModificationSummary,
  getTeacherAcademicCalendar,
  getTeacherStudentActivity,
  getTeacherNotifications,
  getFeedbackStudents,
  getFeedbackMessages,
  sendFeedback,
  getTeacherTamperCount,
  getTeacherAccessLog,
  getTeacherChannelPreferences,
  updateTeacherChannelPreferences,
  getTeacherWhistleblowerCategories,
  submitWhistleblowerReport,
  checkWhistleblowerStatus,
  getTeacherOfficeHours,
  createTeacherOfficeHour,
  deleteTeacherOfficeHour,
  getParentThreads,
  sendParentMessage,
  getStudentThreads,
  sendStudentMessage,
  getBehaviourIncidents,
  fileBehaviourIncident,
  issueSubstituteToken,
  revokeSubstituteToken,
  listSubstituteTokens,
  getLessonPlans,
  upsertLessonPlan,
  getFeedbackTemplates,
  addFeedbackTemplate,
  recommendResource,
  referToCounsellor,
  getTeacherWorkload,
  getTeacherPerformance,
  getPeerReviews,
  submitPeerReview,
  getColleagues,
  changeTeacherPassword,
  getSpotlightStudent,
  setSpotlightStudent,
  getCohortCompare,
  getVoiceDigest,
  getGradeReceipts,
  getGradeReceipt,
  getTeacherCredentials,
  updateTeacherCredentials,
  getModificationRequests,
  submitModificationRequest,
  withdrawModificationRequest,
  getClassAnalytics,
  getAssignments,
  createAssignment,
  deleteAssignment,
  getTeacherExams,
  getExamResults,
  saveExamResults,
  getAnnouncements,
  sendAnnouncement,
  getMessages,
  sendMessage,
  getStudentGradeHistory,
  getStudentReportCards,
  getResources,
  uploadResource,
  deleteResource,
  generateTimetable,
  getAcademicCalendar,
};
