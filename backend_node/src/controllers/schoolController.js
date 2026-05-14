const School = require('../models/School');
const SchoolAdmin = require('../models/SchoolAdmin');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const AcademicYear = require('../models/AcademicYear');
const Term = require('../models/Term');
const Grade = require('../models/Grade');
const Attendance = require('../models/Attendance');
const GradingScheme = require('../models/GradingScheme');
const Room = require('../models/Room');
const Exam = require('../models/Exam');
const Notification = require('../models/Notification');
const { Op } = require('sequelize');

const successResponse = (data = {}, message = "Success") => ({ success: true, message, ...data });
const errorResponse = (message = "Error", status = 400) => ({ success: false, message, status });

// Helper: Get school from logged-in user
async function getSchoolFromUser(req) {
  if (!req.user || !req.user.id) return null;
  const link = await SchoolAdmin.findOne({
    where: { user_id: req.user.id },
    include: [{ model: School }],
  });
  return link?.School || null;
}

/* ================= SCHOOL INFO ================= */
async function getSchoolInfo(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) {
      return res.json(successResponse({
        id: null, name: '', is_approved: false, brand_colors: '',
        institution_type: '', total_students: 0, total_teachers: 0,
      }));
    }

    return res.json(successResponse({
      id: school.id, name: school.name, email: school.email,
      phone: school.phone, address: school.address, city: school.city,
      country: school.country, badge: school.badge_path,
      brand_colors: school.brand_colors || '', institution_type: school.institution_type || '',
      capacity: school.capacity, is_approved: !!school.is_approved,
      is_active: school.is_active !== false, code: String(school.id),
    }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

async function updateSchoolInfo(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(404).json(errorResponse('School not found'));

    const { phone, address, city, country, brand_colors, motto } = req.body;
    if (phone !== undefined) school.phone = phone;
    if (address !== undefined) school.address = address;
    if (city !== undefined) school.city = city;
    if (country !== undefined) school.country = country;
    if (brand_colors !== undefined) school.brand_colors = brand_colors;
    if (motto !== undefined) school.motto = motto;
    if (req.file) school.badge_path = req.file.path;

    await school.save();
    return res.json(successResponse({ school }, 'School information updated'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to update school information'));
  }
}

async function checkSchoolName(req, res) {
  try {
    const { name } = req.query;
    if (!name) return res.json({ exists: false, available: false });
    const school = await School.findOne({ where: { name } });
    return res.json({ exists: !!school, available: !school });
  } catch (err) {
    return res.status(500).json(errorResponse('Internal server error', 500));
  }
}

/* ================= STUDENTS ================= */
async function getStudents(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const students = await Student.findAll({ where: { school_id: school.id } });
    return res.json(successResponse({ students }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to fetch students'));
  }
}

async function createStudent(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const {
      admission_number, first_name, last_name, other_names,
      date_of_birth, gender, classroom_id, academic_year_id,
      parent_name, parent_email, parent_phone
    } = req.body;

    const student = await Student.create({
      school_id: school.id, admission_number, first_name, last_name,
      other_names, date_of_birth, gender, classroom_id, academic_year_id,
      parent_name, parent_email, parent_phone,
      photo: req.file?.path || null,
    });

    return res.json(successResponse({ student }, 'Student created'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to create student'));
  }
}

async function getNextAdmissionNumber(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const lastStudent = await Student.findOne({
      where: { school_id: school.id },
      order: [['id', 'DESC']],
    });

    const nextNum = (lastStudent?.id || 0) + 1;
    return res.json(successResponse({ next_number: `ADM${String(nextNum).padStart(5, '0')}` }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to get next number'));
  }
}

async function getStudentStats(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const total = await Student.count({ where: { school_id: school.id } });
    const active = await Student.count({ where: { school_id: school.id, is_active: true } });
    const byGender = await Student.findAll({
      attributes: [
        ['gender', 'gender'],
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      where: { school_id: school.id },
      group: ['gender'],
    });

    return res.json(successResponse({
      total, active, by_gender: byGender,
    }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to get student stats'));
  }
}

/* ================= TEACHERS ================= */
async function getTeachers(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const teachers = await Teacher.findAll({ where: { school_id: school.id } });
    return res.json(successResponse({ teachers }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to fetch teachers'));
  }
}

async function createTeacher(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { first_name, last_name, email, phone, employment_type, qualification } = req.body;
    const teacher = await Teacher.create({
      school_id: school.id, first_name, last_name, email, phone,
      employment_type, qualification,
    });

    return res.json(successResponse({ teacher }, 'Teacher created'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to create teacher'));
  }
}

async function getTeacherStats(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const total = await Teacher.count({ where: { school_id: school.id } });
    const active = await Teacher.count({ where: { school_id: school.id, is_active: true } });

    return res.json(successResponse({ total, active }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to get teacher stats'));
  }
}

/* ================= CLASSES ================= */
async function getClasses(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const classes = await Class.findAll({ where: { school_id: school.id } });
    return res.json(successResponse({ classes }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to fetch classes'));
  }
}

async function createClass(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { name, form, category, class_teacher_id, capacity, academic_year_id } = req.body;
    const cls = await Class.create({
      school_id: school.id, name, form, category, class_teacher_id, capacity, academic_year_id,
    });

    return res.json(successResponse({ class: cls }, 'Class created'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to create class'));
  }
}

async function bulkCreateClasses(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { classes } = req.body;
    if (!Array.isArray(classes)) return res.status(400).json(errorResponse('Invalid data'));

    const created = await Class.bulkCreate(
      classes.map(c => ({ ...c, school_id: school.id }))
    );

    return res.json(successResponse({ classes: created }, 'Classes created'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to create classes'));
  }
}

/* ================= SUBJECTS ================= */
async function getSubjects(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const subjects = await Subject.findAll({ where: { school_id: school.id } });
    return res.json(successResponse({ subjects }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to fetch subjects'));
  }
}

async function createSubject(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { name, code, description } = req.body;
    const subject = await Subject.create({
      school_id: school.id, name, code, description,
    });

    return res.json(successResponse({ subject }, 'Subject created'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to create subject'));
  }
}

/* ================= ACADEMIC YEARS & TERMS ================= */
async function getAcademicYears(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const academic_years = await AcademicYear.findAll({ where: { school_id: school.id } });
    return res.json(successResponse({ academic_years }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to fetch academic years'));
  }
}

async function createAcademicYear(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { name, start_date, end_date } = req.body;
    const year = await AcademicYear.create({
      school_id: school.id, name, start_date, end_date,
    });

    return res.json(successResponse({ year }, 'Academic year created'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to create academic year'));
  }
}

async function getTerms(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const terms = await Term.findAll({ where: { school_id: school.id } });
    return res.json(successResponse({ terms }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to fetch terms'));
  }
}

async function createTerm(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { name, start_date, end_date, academic_year_id } = req.body;
    const term = await Term.create({
      school_id: school.id, name, start_date, end_date, academic_year_id,
    });

    return res.json(successResponse({ term }, 'Term created'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to create term'));
  }
}

/* ================= GRADES ================= */
async function getGrades(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { class_id, subject_id, term_id } = req.query;
    const where = { school_id: school.id };
    if (class_id) where.classroom_id = class_id;
    if (subject_id) where.subject_id = subject_id;
    if (term_id) where.term_id = term_id;

    const grades = await Grade.findAll({ where });
    return res.json(successResponse({ grades }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to fetch grades'));
  }
}

async function saveGrades(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { subject_id, term_id, grades } = req.body;
    if (!Array.isArray(grades)) return res.status(400).json(errorResponse('Invalid grades format'));

    const saved = await Promise.all(grades.map(g =>
      Grade.upsert({
        school_id: school.id,
        student_id: g.student_id,
        subject_id, term_id,
        ca: g.ca, midterm: g.midterm, final: g.final,
      }, {
        conflictFields: ['school_id', 'student_id', 'subject_id', 'term_id']
      })
    ));

    return res.json(successResponse({ saved }, 'Grades saved'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to save grades'));
  }
}

/* ================= ATTENDANCE ================= */
async function recordAttendance(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { student_id, classroom_id, date, status, remarks } = req.body;
    const attendance = await Attendance.create({
      school_id: school.id, student_id, classroom_id, date, status, remarks,
    });

    return res.json(successResponse({ attendance }, 'Attendance recorded'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to record attendance'));
  }
}

/* ================= GRADING SCHEME ================= */
async function getGradingScheme(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const scheme = await GradingScheme.findOne({ where: { school_id: school.id } });
    if (!scheme) {
      return res.json(successResponse({
        pass_mark: 40,
        boundaries: JSON.stringify({ A: 80, B: 70, C: 60, D: 50, E: 40, F: 0 })
      }));
    }

    return res.json(successResponse({
      pass_mark: scheme.pass_mark,
      boundaries: scheme.boundaries
    }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to fetch grading scheme'));
  }
}

async function setGradingScheme(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { pass_mark, boundaries } = req.body;
    const [scheme] = await GradingScheme.upsert({
      school_id: school.id, pass_mark, boundaries: JSON.stringify(boundaries)
    });

    return res.json(successResponse({ scheme }, 'Grading scheme updated'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to update grading scheme'));
  }
}

/* ================= ROOMS ================= */
async function getRooms(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const rooms = await Room.findAll({ where: { school_id: school.id } });
    return res.json(successResponse({ rooms }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to fetch rooms'));
  }
}

async function createRoom(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { name, code, capacity, room_type } = req.body;
    const room = await Room.create({
      school_id: school.id, name, code, capacity, room_type,
    });

    return res.json(successResponse({ room }, 'Room created'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to create room'));
  }
}

/* ================= EXAMS ================= */
async function getExams(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const exams = await Exam.findAll({ where: { school_id: school.id } });
    return res.json(successResponse({ exams }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to fetch exams'));
  }
}

async function createExam(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { term_id, name, date, subject_id, classroom_id, total_marks } = req.body;
    const exam = await Exam.create({
      school_id: school.id, term_id, name, date, subject_id, classroom_id, total_marks,
    });

    return res.json(successResponse({ exam }, 'Exam created'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to create exam'));
  }
}

/* ================= NOTIFICATIONS ================= */
async function getNotifications(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const notifications = await Notification.findAll({
      where: { school_id: school.id },
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    return res.json(successResponse({ notifications }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to fetch notifications'));
  }
}

async function createNotification(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { title, message, type } = req.body;
    const notif = await Notification.create({
      school_id: school.id, title, message, type,
    });

    return res.json(successResponse({ notification: notif }, 'Notification created'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to create notification'));
  }
}

/* ================= GENERIC STATS ================= */
async function getAnalytics(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const [students, teachers, classes] = await Promise.all([
      Student.count({ where: { school_id: school.id, is_active: true } }),
      Teacher.count({ where: { school_id: school.id, is_active: true } }),
      Class.count({ where: { school_id: school.id, is_active: true } }),
    ]);

    return res.json(successResponse({
      total_students: students,
      total_teachers: teachers,
      active_classes: classes,
      attendance_rate: 85,
      avg_performance: 72,
    }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to fetch analytics'));
  }
}

/* ================= FINANCE (PLACEHOLDER) ================= */
async function getFinanceStats(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    return res.json(successResponse({
      total_collected: 50000,
      outstanding_balance: 12000,
      expenses: 35000,
      balance: 3000,
    }));
  } catch (err) {
    return res.status(500).json(errorResponse('Failed to fetch finance stats'));
  }
}

async function getFinanceFees(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    return res.json(successResponse({
      fees: [
        { id: 1, name: 'Tuition', amount: 10000 },
        { id: 2, name: 'Boarding', amount: 5000 },
      ]
    }));
  } catch (err) {
    return res.status(500).json(errorResponse('Failed to fetch fees'));
  }
}

async function recordExpense(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { description, amount, category, date } = req.body;
    return res.json(successResponse({
      expense: { id: 1, description, amount, category, date, school_id: school.id }
    }, 'Expense recorded'));
  } catch (err) {
    return res.status(500).json(errorResponse('Failed to record expense'));
  }
}

async function getExpenses(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    return res.json(successResponse({ expenses: [] }));
  } catch (err) {
    return res.status(500).json(errorResponse('Failed to fetch expenses'));
  }
}

/* ================= PLACEHOLDER ENDPOINTS ================= */
async function getTeacherAssignments(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));
    return res.json(successResponse({ assignments: [] }));
  } catch (err) {
    return res.status(500).json(errorResponse('Failed to fetch assignments'));
  }
}

async function createTeacherAssignment(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));
    return res.json(successResponse({ assignment: {} }, 'Assignment created'));
  } catch (err) {
    return res.status(500).json(errorResponse('Failed to create assignment'));
  }
}

async function getExamOfficers(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const officers = await Teacher.findAll({
      where: { school_id: school.id, is_examination_officer: true }
    });
    return res.json(successResponse({ exam_officers: officers }));
  } catch (err) {
    return res.status(500).json(errorResponse('Failed to fetch exam officers'));
  }
}

async function assignExamOfficer(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { teacher_id, assign } = req.body;
    await Teacher.update(
      { is_examination_officer: assign },
      { where: { id: teacher_id, school_id: school.id } }
    );

    return res.json(successResponse({}, 'Exam officer updated'));
  } catch (err) {
    return res.status(500).json(errorResponse('Failed to update exam officer'));
  }
}

async function getMessages(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));
    return res.json(successResponse({ messages: [] }));
  } catch (err) {
    return res.status(500).json(errorResponse('Failed to fetch messages'));
  }
}

async function sendMessage(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));
    return res.json(successResponse({ message: {} }, 'Message sent'));
  } catch (err) {
    return res.status(500).json(errorResponse('Failed to send message'));
  }
}

async function createParent(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));
    return res.json(successResponse({ parent: {} }, 'Parent created'));
  } catch (err) {
    return res.status(500).json(errorResponse('Failed to create parent'));
  }
}

async function generateTimetable(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));
    return res.json(successResponse({}, 'Timetable generated'));
  } catch (err) {
    return res.status(500).json(errorResponse('Failed to generate timetable'));
  }
}

async function deleteTimetable(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));
    return res.json(successResponse({}, 'Timetable deleted'));
  } catch (err) {
    return res.status(500).json(errorResponse('Failed to delete timetable'));
  }
}

async function reviewModificationRequest(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));
    return res.json(successResponse({}, 'Request reviewed'));
  } catch (err) {
    return res.status(500).json(errorResponse('Failed to review request'));
  }
}

module.exports = {
  getSchoolInfo, updateSchoolInfo, checkSchoolName,
  getStudents, createStudent, getNextAdmissionNumber, getStudentStats,
  getTeachers, createTeacher, getTeacherStats,
  getClasses, createClass, bulkCreateClasses,
  getSubjects, createSubject,
  getAcademicYears, createAcademicYear, getTerms, createTerm,
  getGrades, saveGrades,
  recordAttendance,
  getGradingScheme, setGradingScheme,
  getRooms, createRoom,
  getExams, createExam,
  getNotifications, createNotification,
  getAnalytics,
  getFinanceStats, getFinanceFees, recordExpense, getExpenses,
  getTeacherAssignments, createTeacherAssignment,
  getExamOfficers, assignExamOfficer,
  getMessages, sendMessage,
  createParent,
  generateTimetable, deleteTimetable,
  reviewModificationRequest,
};
