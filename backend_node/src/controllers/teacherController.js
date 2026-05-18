const Teacher = require('../models/Teacher');
const User = require('../models/User');
const School = require('../models/School');
const Class = require('../models/Class');
const Student = require('../models/Student');
const ClassSubject = require('../models/ClassSubject');
const Subject = require('../models/Subject');
const Grade = require('../models/Grade');
const Term = require('../models/Term');
const GradingScheme = require('../models/GradingScheme');
const Notification = require('../models/Notification');
const ForensicEvent = require('../models/ForensicEvent');
const { Op } = require('sequelize');
const sequelize = require('../config/db');

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
        { model: User, attributes: ['first_name', 'last_name', 'email', 'username', 'last_login'] },
        { model: School, attributes: ['name', 'badge_path', 'brand_colors'] }
      ]
    });

    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const firstName = teacher.User.first_name || '';
    const lastName = teacher.User.last_name || '';
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
        email: teacher.User.email,
        username: teacher.User.username,
        phone: teacher.phone_number,
        phone_number: teacher.phone_number,
        qualification: teacher.qualification,
        profile_picture: normalizePath(teacher.profile_picture),
        school: teacher.School?.name || 'EK-SMS School',
        school_name: teacher.School?.name || 'EK-SMS School',
        school_badge: normalizePath(teacher.School?.badge_path),
        school_colors: teacher.School?.brand_colors,
        employeeNumber: teacher.employee_id,
        employee_id: teacher.employee_id,
        joinedDate: teacher.hire_date || teacher.created_at,
        status: teacher.is_active ? 'active' : 'inactive',
        lastLogin: teacher.User.last_login || teacher.created_at,
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
      include: [{ model: User, attributes: ['id', 'first_name', 'last_name', 'email'] }],
      order: [[sequelize.fn('lower', sequelize.col('User.first_name')), 'ASC']],
    });

    const formatted = students.map(s => ({
      id: s.id,
      admission_number: s.admission_number,
      first_name: s.User?.first_name || '',
      last_name: s.User?.last_name || '',
      full_name: `${s.User?.first_name || ''} ${s.User?.last_name || ''}`.trim(),
      email: s.User?.email || '',
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
    if (!class_id || !subject_id || !term_id) {
      return res.status(400).json(errorResponse('class_id, subject_id, and term_id are required'));
    }

    const students = await Student.findAll({
      where: { classroom_id: class_id, school_id: teacher.school_id, status: 'active' },
      include: [{ model: User, attributes: ['id', 'first_name', 'last_name'] }],
    });

    const grades = await Grade.findAll({
      where: {
        school_id: teacher.school_id,
        classroom_id: class_id,
        subject_id,
        term_id,
        student_id: { [Op.in]: students.map(s => s.id) },
      },
    });

    const gradeMap = {};
    grades.forEach(g => { gradeMap[g.student_id] = g; });

    const gradebook = students.map(s => {
      const g = gradeMap[s.id];
      return {
        student_id: s.id,
        admission_number: s.admission_number,
        full_name: `${s.User?.first_name || ''} ${s.User?.last_name || ''}`.trim(),
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

    return res.json(successResponse({}, 'Draft saved locally'));
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

      await Grade.upsert({
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
      }, {
        conflictFields: ['school_id', 'student_id', 'subject_id', 'term_id'],
        transaction,
      });

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
    return res.status(500).json(errorResponse(`Failed to submit grades: ${err.message}`));
  }
}

async function getGradeHistory(req, res) {
  return res.json(successResponse({ history: [] }));
}

async function getTeacherTimetable(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const Class = require('../models/Class');
    const ClassSubject = require('../models/ClassSubject');
    const Subject = require('../models/Subject');

    const classes = await Class.findAll({
      where: { class_teacher_id: teacher.id },
      attributes: ['id', 'name', 'form', 'room', 'start_time', 'end_time'],
      include: [
        {
          model: ClassSubject,
          as: 'classSubjects',
          include: [{ model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }],
        },
      ],
    });

    const periods = [];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    classes.forEach(cls => {
      (cls.classSubjects || []).forEach(cs => {
        days.forEach(day => {
          periods.push({
            id: `p-${cls.id}-${cs.subject_id}-${day}`,
            day,
            startTime: cls.start_time || '08:00',
            endTime: cls.end_time || '09:00',
            subject: cs.subject?.name || 'Unknown',
            class: cls.name,
            room: cls.room || 'TBD',
            type: 'teaching',
          });
        });
      });
    });

    return res.json(successResponse({
      timetable: {
        teacher_id: teacher.id,
        periods,
        generated_at: new Date().toISOString(),
      },
    }));
  } catch (err) {
    console.error('getTeacherTimetable Error:', err);
    return res.json(successResponse({ timetable: null }));
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

async function getTeacherAtRiskStudents(req, res) {
  try {
    return res.json(successResponse({ students: [] }));
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
    return res.json(successResponse({ activities: [] }));
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
}

async function getFeedbackStudents(req, res) {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    const Class = require('../models/Class');
    const classes = await Class.findAll({
      where: { class_teacher_id: teacher.id },
      attributes: ['id', 'name'],
    });

    return res.json(successResponse({ students: [] }));
  } catch (err) {
    console.error('getFeedbackStudents Error:', err);
    return res.json(successResponse({ students: [] }));
  }
}

async function getFeedbackMessages(req, res) {
  try {
    return res.json(successResponse({ messages: [] }));
  } catch (err) {
    console.error('getFeedbackMessages Error:', err);
    return res.json(successResponse({ messages: [] }));
  }
}

async function sendFeedback(req, res) {
  try {
    return res.json(successResponse({ id: Date.now() }));
  } catch (err) {
    console.error('sendFeedback Error:', err);
    return res.status(500).json(errorResponse('Failed to send feedback'));
  }
}

async function getTeacherTamperCount(req, res) {
  try {
    return res.json(successResponse({ total: 0, blocked: 0, successful: 0 }));
  } catch (err) {
    console.error('getTeacherTamperCount Error:', err);
    return res.json(successResponse({ total: 0, blocked: 0, successful: 0 }));
  }
}

async function getTeacherAccessLog(req, res) {
  try {
    return res.json(successResponse({ access_log: [] }));
  } catch (err) {
    console.error('getTeacherAccessLog Error:', err);
    return res.json(successResponse({ access_log: [] }));
  }
}

async function getTeacherChannelPreferences(req, res) {
  try {
    return res.json(successResponse({
      preferences: {
        inApp: { gradePosted: true, modificationAttempt: true, message: true, parentReply: true, conferenceBooked: true, systemAlert: true },
        push: { gradePosted: false, modificationAttempt: true, message: true, parentReply: true, conferenceBooked: true, systemAlert: false },
        email: { gradePosted: false, modificationAttempt: true, message: false, parentReply: true, conferenceBooked: true, systemAlert: true },
        sms: { gradePosted: false, modificationAttempt: true, message: false, parentReply: false, conferenceBooked: true, systemAlert: false },
      },
    }));
  } catch (err) {
    console.error('getTeacherChannelPreferences Error:', err);
    return res.json(successResponse({ preferences: {} }));
  }
}

async function updateTeacherChannelPreferences(req, res) {
  try {
    return res.json(successResponse({}));
  } catch (err) {
    console.error('updateTeacherChannelPreferences Error:', err);
    return res.status(500).json(errorResponse('Failed to update preferences'));
  }
}

async function getTeacherWhistleblowerCategories(req, res) {
  try {
    return res.json(successResponse({
      categories: [
        { id: 'corruption', label: 'Bribery or corruption' },
        { id: 'misconduct', label: 'Colleague / admin misconduct' },
        { id: 'safety', label: 'Safety / harassment' },
        { id: 'workload', label: 'Workload / scheduling unfair practices' },
        { id: 'other', label: 'Other' },
      ],
    }));
  } catch (err) {
    console.error('getTeacherWhistleblowerCategories Error:', err);
    return res.json(successResponse({ categories: [] }));
  }
}

async function submitWhistleblowerReport(req, res) {
  try {
    const id = `WB-${Date.now().toString(36).toUpperCase()}`;
    return res.json(successResponse({ ticketId: id, followUpKey: id }));
  } catch (err) {
    console.error('submitWhistleblowerReport Error:', err);
    return res.status(500).json(errorResponse('Failed to submit report'));
  }
}

async function checkWhistleblowerStatus(req, res) {
  try {
    return res.json(successResponse({
      ticketId: req.params.key,
      status: 'received',
      updates: [],
    }));
  } catch (err) {
    console.error('checkWhistleblowerStatus Error:', err);
    return res.json(successResponse({ status: 'unknown' }));
  }
}

async function getTeacherOfficeHours(req, res) {
  try {
    return res.json(successResponse({ slots: [] }));
  } catch (err) {
    console.error('getTeacherOfficeHours Error:', err);
    return res.json(successResponse({ slots: [] }));
  }
}

async function createTeacherOfficeHour(req, res) {
  try {
    return res.json(successResponse({ id: Date.now() }));
  } catch (err) {
    console.error('createTeacherOfficeHour Error:', err);
    return res.status(500).json(errorResponse('Failed to create office hour'));
  }
}

async function deleteTeacherOfficeHour(req, res) {
  try {
    return res.json(successResponse({}));
  } catch (err) {
    console.error('deleteTeacherOfficeHour Error:', err);
    return res.status(500).json(errorResponse('Failed to delete office hour'));
  }
}

async function getParentThreads(req, res) {
  try {
    return res.json(successResponse({ threads: [] }));
  } catch (err) {
    console.error('getParentThreads Error:', err);
    return res.json(successResponse({ threads: [] }));
  }
}

async function sendParentMessage(req, res) {
  try {
    return res.json(successResponse({ id: Date.now() }));
  } catch (err) {
    console.error('sendParentMessage Error:', err);
    return res.status(500).json(errorResponse('Failed to send message'));
  }
}

async function getStudentThreads(req, res) {
  try {
    return res.json(successResponse({ threads: [] }));
  } catch (err) {
    console.error('getStudentThreads Error:', err);
    return res.json(successResponse({ threads: [] }));
  }
}

async function sendStudentMessage(req, res) {
  try {
    return res.json(successResponse({ id: Date.now() }));
  } catch (err) {
    console.error('sendStudentMessage Error:', err);
    return res.status(500).json(errorResponse('Failed to send message'));
  }
}

async function getBehaviourIncidents(req, res) {
  try {
    return res.json(successResponse({ incidents: [] }));
  } catch (err) {
    console.error('getBehaviourIncidents Error:', err);
    return res.json(successResponse({ incidents: [] }));
  }
}

async function fileBehaviourIncident(req, res) {
  try {
    return res.json(successResponse({ id: Date.now() }));
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
    return res.json(successResponse({ lesson_plans: [] }));
  } catch (err) {
    console.error('getLessonPlans Error:', err);
    return res.json(successResponse({ lesson_plans: [] }));
  }
}

async function upsertLessonPlan(req, res) {
  try {
    return res.json(successResponse({ id: req.params.id || Date.now() }));
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
    return res.json(successResponse({ id: Date.now() }));
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
    return res.json(successResponse({
      thisWeek: [],
      totalHours: 0,
      pendingGrades: 0,
      pendingAssignments: 0,
      pendingMessages: 0,
    }));
  } catch (err) {
    console.error('getTeacherWorkload Error:', err);
    return res.json(successResponse({ thisWeek: [] }));
  }
}

async function getTeacherPerformance(req, res) {
  try {
    return res.json(successResponse({
      classAverages: [],
      gradingTimelinessDays: 0,
      parentFeedbackAvg: 0,
      parentFeedbackCount: 0,
      attendanceTimelinessPct: 0,
    }));
  } catch (err) {
    console.error('getTeacherPerformance Error:', err);
    return res.json(successResponse({}));
  }
}

async function getPeerReviews(req, res) {
  try {
    return res.json(successResponse({
      givenByMe: [],
      receivedAboutMe: { average: 0, count: 0, breakdown: {}, recentComments: [] },
    }));
  } catch (err) {
    console.error('getPeerReviews Error:', err);
    return res.json(successResponse({ givenByMe: [], receivedAboutMe: {} }));
  }
}

async function submitPeerReview(req, res) {
  try {
    return res.json(successResponse({ id: Date.now() }));
  } catch (err) {
    console.error('submitPeerReview Error:', err);
    return res.status(500).json(errorResponse('Failed to submit review'));
  }
}

async function getSpotlightStudent(req, res) {
  try {
    return res.json(successResponse({}));
  } catch (err) {
    console.error('getSpotlightStudent Error:', err);
    return res.json(successResponse({}));
  }
}

async function setSpotlightStudent(req, res) {
  try {
    return res.json(successResponse({}));
  } catch (err) {
    console.error('setSpotlightStudent Error:', err);
    return res.status(500).json(errorResponse('Failed to set spotlight'));
  }
}

async function getCohortCompare(req, res) {
  try {
    return res.json(successResponse({ thisYearPerSubject: [] }));
  } catch (err) {
    console.error('getCohortCompare Error:', err);
    return res.json(successResponse({ thisYearPerSubject: [] }));
  }
}

async function getVoiceDigest(req, res) {
  try {
    return res.json(successResponse({ text: '' }));
  } catch (err) {
    console.error('getVoiceDigest Error:', err);
    return res.json(successResponse({ text: '' }));
  }
}

async function getGradeReceipts(req, res) {
  try {
    return res.json(successResponse({ receipts: [] }));
  } catch (err) {
    console.error('getGradeReceipts Error:', err);
    return res.json(successResponse({ receipts: [] }));
  }
}

async function getGradeReceipt(req, res) {
  try {
    return res.json(successResponse({}));
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
};
