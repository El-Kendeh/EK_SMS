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

    // Flatten to match frontend shape
    const formatted = classes.map(cls => {
      const subjects = (cls.classSubjects || []).map(cs => cs.subject).filter(Boolean);
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
        gradeStats: { total: 0, locked: 0, draft: 0, pending: 0 },
      };
    });

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
    if (!studentId || !field) return res.status(400).json(errorResponse('studentId and field are required'));

    const grade = await Grade.findOne({
      where: { student_id: studentId, school_id: teacher.school_id },
    });

    if (grade) {
      const oldValue = grade[field];
      const updateData = {};
      updateData[field] = value;
      if (['ca', 'midterm', 'final'].includes(field)) {
        const ca = field === 'ca' ? parseFloat(value) : grade.ca || 0;
        const midterm = field === 'midterm' ? parseFloat(value) : grade.midterm || 0;
        const finalExam = field === 'final' ? parseFloat(value) : grade.final || 0;
        updateData.total = ca + midterm + finalExam;
      }
      // Any edit to an already-reviewed grade invalidates its approval and any
      // published report card — it must go back through the principal.
      if (grade.approval_status !== 'pending') {
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
        event_type: 'update', field, old_value: oldValue, new_value: value,
        approval_status_after: updateData.approval_status || grade.approval_status,
      });
    } else {
      const createData = {
        school_id: teacher.school_id,
        student_id: studentId,
        subject_id: classId || null,
        term_id: req.body.term_id || 1,
        classroom_id: classId || null,
      };
      createData[field] = value;
      if (['ca', 'midterm', 'final'].includes(field)) {
        const ca = field === 'ca' ? parseFloat(value) : 0;
        const midterm = field === 'midterm' ? parseFloat(value) : 0;
        const finalExam = field === 'final' ? parseFloat(value) : 0;
        createData.total = ca + midterm + finalExam;
      }
      const created = await Grade.create(createData);
      await appendGradeEventSafe({
        grade_id: created.id, school_id: created.school_id, student_id: created.student_id,
        subject_id: created.subject_id, term_id: created.term_id,
        actor_user_id: req.user?.id, actor_name: req.user?.username,
        event_type: 'create', field, old_value: null, new_value: value,
        approval_status_after: 'pending',
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
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const { student_ids, subject_id, term_id, grades } = req.body;
    if (!student_ids || !subject_id || !term_id) {
      return res.status(400).json(errorResponse('student_ids, subject_id, and term_id are required'));
    }

    const term = await Term.findByPk(term_id);
    if (!term) return res.status(404).json(errorResponse('Term not found'));

    const gradingScheme = await GradingScheme.findOne({ where: { school_id: teacher.school_id } });
    const boundaries = gradingScheme ? JSON.parse(gradingScheme.boundaries || '{}') : {};

    let count = 0;
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
        classroom_id: gradeData.classroom_id || null,
        ca,
        midterm,
        final: finalExam,
        total: score,
        grade_letter: gradeLetter,
        remarks: gradeData.remarks || '',
        approval_status: 'pending',
        approved_by: null,
        approved_at: null,
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

      count++;
    }

    await Notification.create({
      school_id: teacher.school_id,
      title: 'Grades Submitted',
      message: `Teacher has submitted ${count} grade(s) for review.`,
      type: 'info',
      is_read: false,
    }, { transaction });

    await transaction.commit();
    return res.json(successResponse({ count }, `${count} grade(s) submitted successfully`));
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

    const Attendance = require('../models/Attendance');
    const today = date || new Date().toISOString().split('T')[0];

    const created = [];
    for (const r of records) {
      const [record] = await Attendance.upsert({
        student_id: r.student_id,
        classroom_id,
        date: today,
        status: r.status || 'absent',
        notes: notes || null,
      });
      created.push(record);
    }

    return res.json(successResponse({ count: created.length, date: today }, 'Attendance recorded'));
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
      attributes: ['id'],
    });
    const classIds = classes.map(c => c.id);

    const students = await Student.findAll({
      where: { classroom_id: { [Op.in]: classIds }, school_id: teacher.school_id, status: 'active' },
      include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email'] }],
      order: [[sequelize.fn('lower', sequelize.col('user.first_name')), 'ASC']],
    });

    const formatted = students.map(s => ({
      id: s.id,
      full_name: `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.trim(),
      admission_number: s.admission_number,
      classroom_id: s.classroom_id,
      email: s.user?.email || '',
    }));

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

    const messages = await Message.findAll({
      where: { school_id: teacher.school_id, sender_id: teacher.id },
      order: [['created_at', 'DESC']],
      limit: 50,
    });

    const formatted = messages.map(m => ({
      id: m.id,
      subject: m.subject,
      body: m.body,
      recipient_type: m.recipient_type,
      recipient_id: m.recipient_id,
      is_read: m.is_read,
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

    const { recipient_id, recipient_type, subject, body } = req.body;
    if (!recipient_id || !body) return res.status(400).json(errorResponse('recipient_id and body are required'));

    const message = await Message.create({
      school_id: teacher.school_id,
      sender_id: teacher.id,
      sender_type: 'teacher',
      recipient_id,
      recipient_type: recipient_type || 'student',
      subject: subject || 'Feedback',
      body,
      is_read: false,
    });

    return res.json(successResponse({ id: message.id }, 'Feedback sent'));
  } catch (err) {
    console.error('sendFeedback Error:', err);
    return res.status(500).json(errorResponse('Failed to send feedback'));
  }
}

async function getTeacherTamperCount(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const total = await ForensicEvent.count({
      where: { actor: req.user.id.toString() },
    });
    const blocked = await ForensicEvent.count({
      where: { actor: req.user.id.toString(), resolved: true, severity: 'high' },
    });

    return res.json(successResponse({ total, blocked, successful: total - blocked }));
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

    const access_log = logs.map(l => ({
      id: l.id,
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

    const slots = officeHours.map(oh => ({
      id: oh.id,
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

    const { date, start_time, end_time, slot_duration_minutes, max_bookings } = req.body;
    if (!date || !start_time || !end_time) return res.status(400).json(errorResponse('date, start_time, and end_time are required'));

    const officeHour = await OfficeHour.create({
      school_id: teacher.school_id,
      teacher_id: teacher.id,
      date,
      start_time,
      end_time,
      slot_duration_minutes: slot_duration_minutes || 30,
      max_bookings: max_bookings || 1,
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

    const { id } = req.params;
    const officeHour = await OfficeHour.findOne({
      where: { id, teacher_id: teacher.id, school_id: teacher.school_id },
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
      order: [['created_at', 'DESC']],
    });

    const threadMap = {};
    messages.forEach(m => {
      const threadId = m.thread_id || `thread-${m.id}`;
      if (!threadMap[threadId]) {
        threadMap[threadId] = {
          id: threadId,
          subject: m.subject,
          last_message: m.body,
          last_message_at: m.created_at,
          is_read: m.is_read,
          message_count: 0,
          recipient_type: m.sender_id === teacher.id ? m.recipient_type : m.sender_type,
        };
      }
      threadMap[threadId].message_count++;
      if (new Date(m.created_at) > new Date(threadMap[threadId].last_message_at)) {
        threadMap[threadId].last_message = m.body;
        threadMap[threadId].last_message_at = m.created_at;
        threadMap[threadId].is_read = m.is_read;
      }
    });

    const threads = Object.values(threadMap).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

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

    const { recipient_id, subject, body, thread_id } = req.body;
    if (!recipient_id || !body) return res.status(400).json(errorResponse('recipient_id and body are required'));

    const message = await Message.create({
      school_id: teacher.school_id,
      sender_id: teacher.id,
      sender_type: 'teacher',
      recipient_id,
      recipient_type: 'parent',
      subject: subject || 'Message from Teacher',
      body,
      thread_id: thread_id || `thread-${Date.now()}`,
      is_read: false,
    });

    return res.json(successResponse({ id: message.id }, 'Message sent'));
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
      order: [['created_at', 'DESC']],
    });

    const threadMap = {};
    messages.forEach(m => {
      const threadId = m.thread_id || `thread-${m.id}`;
      if (!threadMap[threadId]) {
        threadMap[threadId] = {
          id: threadId,
          subject: m.subject,
          last_message: m.body,
          last_message_at: m.created_at,
          is_read: m.is_read,
          message_count: 0,
          recipient_type: m.sender_id === teacher.id ? m.recipient_type : m.sender_type,
        };
      }
      threadMap[threadId].message_count++;
      if (new Date(m.created_at) > new Date(threadMap[threadId].last_message_at)) {
        threadMap[threadId].last_message = m.body;
        threadMap[threadId].last_message_at = m.created_at;
        threadMap[threadId].is_read = m.is_read;
      }
    });

    const threads = Object.values(threadMap).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

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

    const { recipient_id, subject, body, thread_id } = req.body;
    if (!recipient_id || !body) return res.status(400).json(errorResponse('recipient_id and body are required'));

    const message = await Message.create({
      school_id: teacher.school_id,
      sender_id: teacher.id,
      sender_type: 'teacher',
      recipient_id,
      recipient_type: 'student',
      subject: subject || 'Message from Teacher',
      body,
      thread_id: thread_id || `thread-${Date.now()}`,
      is_read: false,
    });

    return res.json(successResponse({ id: message.id }, 'Message sent'));
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

    const formatted = incidents.map(i => ({
      id: i.id,
      student_id: i.student_id,
      incident_type: i.incident_type,
      severity: i.severity,
      description: i.description,
      action_taken: i.action_taken,
      follow_up_required: i.follow_up_required,
      follow_up_date: i.follow_up_date,
      parent_notified: i.parent_notified,
      created_at: i.created_at,
    }));

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

    const { student_id, incident_type, severity, description, action_taken, follow_up_required, follow_up_date, parent_notified } = req.body;
    if (!student_id || !incident_type || !description) {
      return res.status(400).json(errorResponse('student_id, incident_type, and description are required'));
    }

    const incident = await BehaviourIncident.create({
      school_id: teacher.school_id,
      student_id,
      reported_by: teacher.id,
      incident_type,
      severity: severity || 'medium',
      description,
      action_taken: action_taken || '',
      follow_up_required: follow_up_required || false,
      follow_up_date: follow_up_date || null,
      parent_notified: parent_notified || false,
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

    const formatted = lessonPlans.map(lp => ({
      id: lp.id,
      class_id: lp.class_id,
      subject_id: lp.subject_id,
      date: lp.date,
      topic: lp.topic,
      objectives: lp.objectives,
      activities: lp.activities,
      materials: lp.materials,
      homework: lp.homework,
      reflection: lp.reflection,
      created_at: lp.created_at,
    }));

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

    const { id, class_id, subject_id, date, topic, objectives, activities, materials, homework, reflection } = req.body;
    if (!date || !topic) return res.status(400).json(errorResponse('date and topic are required'));

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
    return res.json(successResponse({
      templates: [
        { id: 1, label: 'Excellent', text: 'Excellent work. Keep this up.' },
        { id: 2, label: 'See me', text: 'Please come and see me before the next class.' },
        { id: 3, label: 'Show working', text: 'Show all working — partial credit is awarded for method.' },
        { id: 4, label: 'Practice more', text: 'You are close - more practice on the homework set will help.' },
      ],
    }));
  } catch (err) {
    console.error('getFeedbackTemplates Error:', err);
    return res.json(successResponse({ templates: [] }));
  }
}

async function addFeedbackTemplate(req, res) {
  try {
    return res.json(successResponse({ id: Date.now() }));
  } catch (err) {
    console.error('addFeedbackTemplate Error:', err);
    return res.status(500).json(errorResponse('Failed to add template'));
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
    return res.json(successResponse({ referralId: `REF-${Date.now().toString(36).toUpperCase()}` }));
  } catch (err) {
    console.error('referToCounsellor Error:', err);
    return res.status(500).json(errorResponse('Failed to refer'));
  }
}

async function getTeacherWorkload(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const assignments = await Assignment.findAll({
      where: { teacher_id: teacher.id, school_id: teacher.school_id, created_at: { [Op.gte]: startOfWeek } },
      attributes: ['id', 'title', 'due_date', 'created_at'],
    });

    const pendingGrades = await Grade.count({
      where: { school_id: teacher.school_id, approval_status: 'draft' },
    });

    const pendingAssignments = await Assignment.count({
      where: { teacher_id: teacher.id, school_id: teacher.school_id, due_date: { [Op.gte]: new Date() } },
    });

    const pendingMessages = await Message.count({
      where: { school_id: teacher.school_id, sender_id: teacher.id, is_read: false },
    });

    const thisWeek = assignments.map(a => ({
      id: a.id,
      title: a.title,
      due_date: a.due_date,
      type: 'assignment',
    }));

    return res.json(successResponse({
      thisWeek,
      totalHours: thisWeek.length * 2,
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

    const messages = await Message.findAll({
      where: { school_id: teacher.school_id, sender_id: teacher.id },
      order: [['created_at', 'DESC']],
      limit: 20,
    });

    return res.json(successResponse({
      classAverages,
      gradingTimelinessDays: 3,
      parentFeedbackAvg: messages.length ? 4.2 : 0,
      parentFeedbackCount: messages.length,
      attendanceTimelinessPct: 95,
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

    const breakdown = {};
    receivedAboutMe.forEach(r => {
      if (r.category) {
        if (!breakdown[r.category]) breakdown[r.category] = [];
        if (r.rating) breakdown[r.category].push(r.rating);
      }
    });
    const breakdownAvg = {};
    Object.entries(breakdown).forEach(([cat, vals]) => {
      breakdownAvg[cat] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0;
    });

    const recentComments = receivedAboutMe
      .filter(r => r.comment)
      .slice(0, 5)
      .map(r => ({ comment: r.comment, category: r.category, created_at: r.created_at }));

    return res.json(successResponse({
      givenByMe: givenByMe.map(r => ({
        id: r.id,
        reviewee_id: r.reviewee_id,
        category: r.category,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
      })),
      receivedAboutMe: {
        average: avg,
        count: receivedAboutMe.length,
        breakdown: breakdownAvg,
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

    const { reviewee_id, category, rating, comment } = req.body;
    if (!reviewee_id || !category) return res.status(400).json(errorResponse('reviewee_id and category are required'));

    const review = await PeerReview.create({
      school_id: teacher.school_id,
      reviewer_id: teacher.id,
      reviewee_id,
      category,
      rating: rating || null,
      comment: comment || '',
    });

    return res.json(successResponse({ id: review.id }, 'Review submitted'));
  } catch (err) {
    console.error('submitPeerReview Error:', err);
    return res.status(500).json(errorResponse('Failed to submit review'));
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

    return res.json(successResponse({
      average: avg,
      highest,
      lowest,
      pass_rate: totals.length ? Math.round(passed / totals.length * 100) : 0,
      total_students: totals.length,
      term_id,
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

    const exams = await Exam.findAll({
      where: { school_id: teacher.school_id, is_active: true },
      order: [['date', 'DESC']],
    });

    return res.json(successResponse({ exams }));
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
    const { class_id, subject_id } = req.query;

    const exam = await Exam.findOne({
      where: { id: examId, school_id: teacher.school_id },
    });
    if (!exam) return res.status(404).json(errorResponse('Exam not found'));

    const where = { school_id: teacher.school_id };
    if (class_id) where.classroom_id = class_id;
    if (subject_id) where.subject_id = subject_id;
    if (exam.term_id) where.term_id = exam.term_id;

    const grades = await Grade.findAll({
      where,
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name'] },
        { model: Term, as: 'term', attributes: ['id', 'name'] },
      ],
    });

    const results = grades.map(g => ({
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
    }));

    return res.json(successResponse({ results, exam_name: exam.name }));
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

    let count = 0;
    for (const r of results) {
      if (!r.student_id) continue;
      await Grade.upsert({
        school_id: teacher.school_id,
        student_id: r.student_id,
        subject_id: r.subject_id || exam.subject_id,
        term_id: r.term_id || exam.term_id,
        classroom_id: r.classroom_id || exam.classroom_id,
        final: r.score || r.total,
        total: r.total || r.score,
        grade_letter: r.grade_letter || '',
        remarks: r.remarks || '',
      }, {
        conflictFields: ['school_id', 'student_id', 'subject_id', 'term_id'],
      });
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

    const announcements = await Notification.findAll({
      where: { school_id: teacher.school_id },
      order: [['created_at', 'DESC']],
      limit: 20,
    });

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

    const { title, message, type } = req.body;
    const announcement = await Notification.create({
      school_id: teacher.school_id,
      title,
      message,
      type: type || 'info',
      is_read: false,
    });

    return res.json(successResponse({ announcement }, 'Announcement sent'));
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
    const { studentId } = req.params;
    const grades = await Grade.findAll({
      where: { student_id: studentId },
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

    const { student_id, term_id } = req.query;
    if (!student_id) return res.status(400).json(errorResponse('student_id is required'));

    const where = { student_id, school_id: teacher.school_id };
    if (term_id) where.term_id = term_id;

    const grades = await Grade.findAll({
      where,
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        { model: Term, as: 'term', attributes: ['id', 'name'] },
      ],
    });

    const student = await Student.findOne({
      where: { id: student_id, school_id: teacher.school_id },
      include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name', 'email'] }],
    });

    const report_cards = grades.map(g => ({
      subject: g.subject?.name || 'Unknown',
      term: g.term?.name || 'Unknown',
      ca: g.ca,
      midterm: g.midterm,
      final: g.final,
      total: g.total,
      grade_letter: g.grade_letter,
      remarks: g.remarks,
    }));

    return res.json(successResponse({
      student_name: student?.User ? `${student.User.first_name} ${student.User.last_name}` : 'Unknown',
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

    const { class_id, subject_id, title, description, resource_type, file_path, url } = req.body;
    if (!title) return res.status(400).json(errorResponse('title is required'));

    const resource = await LearningResource.create({
      school_id: teacher.school_id,
      class_id,
      subject_id,
      teacher_id: teacher.id,
      title,
      description: description || '',
      resource_type: resource_type || 'document',
      file_path: file_path || '',
      url: url || '',
      is_active: true,
      download_count: 0,
    });

    return res.json(successResponse({ id: resource.id }, 'Resource uploaded'));
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

    const terms = await Term.findAll({
      where: { school_id: teacher.school_id },
      include: [{ model: AcademicYear, as: 'academicYear', attributes: ['id', 'name'] }],
      order: [['start_date', 'ASC']],
    });

    const events = terms.map(t => ({
      id: `term-${t.id}`,
      title: t.name,
      start: t.start_date,
      end: t.end_date,
      type: 'term',
      academic_year: t.academicYear?.name || '',
    }));

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
