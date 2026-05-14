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
const User = require('../models/User');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');
const { sendTeacherWelcomeEmail } = require('../utils/email');

const successResponse = (data = {}, message = "Success") => ({ success: true, message, ...data });
const errorResponse = (message = "Error", status = 400) => ({ success: false, message, status });

// Helper: Normalize image paths for the frontend
function normalizePath(filePath) {
  if (!filePath) return null;
  if (filePath.startsWith('http')) return filePath;
  if (filePath.startsWith('/uploads')) return filePath;
  if (filePath.startsWith('uploads')) return '/' + filePath;
  // Fallback for files that might be in student or badge folders
  return filePath.includes('student') ? `/uploads/students/${filePath}` : `/uploads/badges/${filePath}`;
}

// Helper: Get school from logged-in user
async function getSchoolFromUser(req) {
  try {
    if (!req.user || !req.user.id) {
      console.warn('getSchoolFromUser: No user or user ID in request');
      return null;
    }
    const link = await SchoolAdmin.findOne({
      where: { user_id: req.user.id },
      include: [{ model: School }],
    });
    if (!link) {
      console.warn(`getSchoolFromUser: No SchoolAdmin link found for user_id ${req.user.id}`);
    }
    return link?.School || null;
  } catch (err) {
    console.error('getSchoolFromUser Error:', err);
    throw err; // Re-throw to be caught by the calling controller's catch block
  }
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
      country: school.country, badge: normalizePath(school.badge_path),
      brand_colors: school.brand_colors || '', institution_type: school.institution_type || '',
      capacity: school.capacity, is_approved: !!school.is_approved,
      is_active: school.is_active !== false, code: String(school.id),
    }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse(`Internal server error: ${err.message}`, 500));
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
    if (req.file) {
      // Store only the relative path for the browser to use
      school.badge_path = `/uploads/badges/${req.file.filename}`;
    }

    await school.save();
    return res.json(successResponse({ school }, 'School information updated'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse(`Failed to update school information: ${err.message}`));
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

    const students = await Student.findAll({
      where: { school_id: school.id },
      include: [{ model: User, attributes: ['first_name', 'last_name', 'email'] }]
    });
    const formatted = students.map(s => {
      const userData = s.User || {};
      return {
        ...s.toJSON(),
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email || s.email,
        full_name: `${userData.first_name} ${userData.last_name}`,
        passport_picture: normalizePath(s.passport_picture)
      };
    });
    return res.json(successResponse({ students: formatted }));
  } catch (err) {
    console.error('getStudents Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch students: ${err.message}`));
  }
}

async function createStudent(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const data = req.body;

    // 1. Create User account for student
    const username = data.student_username || data.admission_number || `stu_${Date.now()}`;
    const hashedPassword = await bcrypt.hash(data.student_password || 'Student@123', 10);

    const user = await User.create({
      username,
      password: hashedPassword,
      email: data.email || null,
      first_name: data.first_name,
      last_name: data.last_name,
      is_active: true,
      role: 'student'
    }, { transaction });

    // 2. Create Student profile
    const student = await Student.create({
      school_id: school.id,
      user_id: user.id,
      admission_number: data.admission_number,
      admission_date: data.enrollment_date || new Date(),
      date_of_birth: data.date_of_birth,
      gender: data.gender === 'Male' ? 'M' : data.gender === 'Female' ? 'F' : 'O',

      classroom_id: data.classroom_id,
      academic_year_id: data.academic_year_id,
      student_type: data.student_type?.toLowerCase(),
      fee_category: data.fee_category,
      status: data.status || 'active',
      is_active: true,

      place_of_birth: data.place_of_birth,
      nationality: data.nationality,
      religion: data.religion,
      home_language: data.home_language,

      home_address: data.home_address || 'Not Provided',
      city: data.city,
      phone_number: data.phone_number,

      blood_type: data.blood_group || 'N/A',
      allergies: data.allergies || 'None',
      medical_notes: data.medical_notes || 'None',
      doctor_name: data.doctor_name || '',
      doctor_phone: data.doctor_phone || '',
      is_critical_medical: data.is_critical_medical === 'true' || data.is_critical_medical === true,
      sen_tier: data.sen_tier || 'None',
      sen_notes: data.sen_notes || '',
      sen_iep: data.sen_iep === 'true' || data.sen_iep === true,

      disciplinary_history: data.disciplinary_history === 'true' || data.disciplinary_history === true,
      disciplinary_notes: data.disciplinary_notes || '',

      passport_picture: req.file ? `/uploads/students/${req.file.filename}` : null,

      emergency_name: data.emergency_name,
      emergency_relationship: data.emergency_relationship,
      emergency_phone: data.emergency_phone,
      emergency_address: data.emergency_address || 'Not Provided',

      // Document flags
      documents_birth_certificate: data.documents_birth_certificate === 'true' || data.documents_birth_certificate === true,
      documents_passport_photo: data.documents_passport_photo === 'true' || data.documents_passport_photo === true,
      documents_previous_school_report: data.documents_previous_school_report === 'true' || data.documents_previous_school_report === true,
      documents_transfer_letter: data.documents_transfer_letter === 'true' || data.documents_transfer_letter === true,
      documents_medical_report: data.documents_medical_report === 'true' || data.documents_medical_report === true,
      documents_other: data.documents_other === 'true' || data.documents_other === true,

      vaccinations: data.vaccinations || {},
    }, { transaction });

    await transaction.commit();
    return res.json(successResponse({ student }, 'Student registered successfully'));
  } catch (err) {
    await transaction.rollback();
    console.error('createStudent Error:', err);
    return res.status(400).json(errorResponse(`Failed to create student: ${err.message}`));
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

async function updateStudent(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { id } = req.params;
    const data = req.body;
    const student = await Student.findOne({ where: { id, school_id: school.id } });
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    // 1. Update User info
    const user = await User.findByPk(student.user_id);
    if (user) {
      user.first_name = data.first_name || user.first_name;
      user.last_name = data.last_name || user.last_name;
      user.email = data.email || user.email;
      await user.save({ transaction });
    }

    // 2. Update Student profile
    const updateData = {
      admission_number: data.admission_number || student.admission_number,
      admission_date: data.enrollment_date || student.admission_date,
      date_of_birth: data.date_of_birth || student.date_of_birth,
      gender: data.gender === 'Male' ? 'M' : data.gender === 'Female' ? 'F' : data.gender || student.gender,
      classroom_id: data.classroom_id || student.classroom_id,
      academic_year_id: data.academic_year_id || student.academic_year_id,
      student_type: data.student_type?.toLowerCase() || student.student_type,
      fee_category: data.fee_category || student.fee_category,
      status: data.status || student.status,
      place_of_birth: data.place_of_birth || student.place_of_birth,
      nationality: data.nationality || student.nationality,
      religion: data.religion || student.religion,
      home_language: data.home_language || student.home_language,
      home_address: data.home_address || student.home_address,
      city: data.city || student.city,
      phone_number: data.phone_number || student.phone_number,
      blood_type: data.blood_group || student.blood_type,
      allergies: data.allergies || student.allergies,
      medical_notes: data.medical_conditions || student.medical_notes,
      doctor_name: data.doctor_name || student.doctor_name,
      doctor_phone: data.doctor_phone || student.doctor_phone,
      is_critical_medical: data.is_critical_medical !== undefined ? (data.is_critical_medical === 'true' || data.is_critical_medical === true) : student.is_critical_medical,
      sen_tier: data.sen_tier || student.sen_tier,
      sen_notes: data.sen_notes || student.sen_notes,
      sen_iep: data.sen_iep !== undefined ? (data.sen_iep === 'true' || data.sen_iep === true) : student.sen_iep,
      disciplinary_history: data.disciplinary_history !== undefined ? (data.disciplinary_history === 'true' || data.disciplinary_history === true) : student.disciplinary_history,
      disciplinary_notes: data.disciplinary_notes || student.disciplinary_notes,
      emergency_name: data.emergency_name || student.emergency_name,
      emergency_relationship: data.emergency_relationship || student.emergency_relationship,
      emergency_phone: data.emergency_phone || student.emergency_phone,
      emergency_address: data.emergency_address || student.emergency_address,
      documents_birth_certificate: data.documents_birth_certificate !== undefined ? (data.documents_birth_certificate === 'true' || data.documents_birth_certificate === true) : student.documents_birth_certificate,
      documents_passport_photo: data.documents_passport_photo !== undefined ? (data.documents_passport_photo === 'true' || data.documents_passport_photo === true) : student.documents_passport_photo,
      documents_previous_school_report: data.documents_previous_school_report !== undefined ? (data.documents_previous_school_report === 'true' || data.documents_previous_school_report === true) : student.documents_previous_school_report,
      documents_transfer_letter: data.documents_transfer_letter !== undefined ? (data.documents_transfer_letter === 'true' || data.documents_transfer_letter === true) : student.documents_transfer_letter,
      documents_medical_report: data.documents_medical_report !== undefined ? (data.documents_medical_report === 'true' || data.documents_medical_report === true) : student.documents_medical_report,
      documents_other: data.documents_other !== undefined ? (data.documents_other === 'true' || data.documents_other === true) : student.documents_other,
    };

    if (req.file) updateData.passport_picture = `/uploads/students/${req.file.filename}`;

    await student.update(updateData, { transaction });
    await transaction.commit();
    return res.json(successResponse({ student }, 'Student updated successfully'));
  } catch (err) {
    await transaction.rollback();
    return res.status(400).json(errorResponse(`Failed to update student: ${err.message}`));
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
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
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

    const teachers = await Teacher.findAll({
      where: { school_id: school.id },
      include: [{ model: User, attributes: ['first_name', 'last_name', 'email'] }]
    });
    const formatted = teachers.map(t => {
      const userData = t.User || {};
      return {
        ...t.toJSON(),
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email || t.email,
        full_name: `${userData.first_name} ${userData.last_name}`,
        profile_picture: normalizePath(t.profile_picture),
      };
    });
    return res.json(successResponse({ teachers: formatted }));
  } catch (err) {
    console.error('getTeachers Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch teachers: ${err.message}`));
  }
}

async function createTeacher(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { first_name, last_name, email, phone, phone_number, employee_id, qualification, password, username, hire_date } = req.body;
    const finalPhone = phone || phone_number || '';

    // 1. Create User
    const hashedPassword = await bcrypt.hash(password || 'Teacher@123', 10);
    const user = await User.create({
      username: username || email || `tch_${Date.now()}`,
      password: hashedPassword,
      email: email || null,
      first_name,
      last_name,
      is_active: true,
      role: 'teacher'
    }, { transaction });

    // 2. Create Teacher profile
    const teacher = await Teacher.create({
      school_id: school.id,
      user_id: user.id,
      employee_id: employee_id || `EMP${Date.now()}`,
      phone_number: finalPhone || '0000000000',
      qualification: qualification || 'Not Specified',
      hire_date: hire_date || new Date(),
      is_active: true,
      bio: '',
      linkedin_url: '',
      degrees: [],
      certifications: [],
      profile_picture: req.file ? `/uploads/badges/${req.file.filename}` : null, 
    }, { transaction });

    await transaction.commit();

    // 3. Send welcome email (asynchronously, don't block response)
    const teacherName = `${first_name} ${last_name}`;
    const rawPassword = password || 'Teacher@123';
    sendTeacherWelcomeEmail(email, teacherName, user.username, rawPassword, school.name);

    return res.json(successResponse({ teacher }, 'Teacher registered successfully. Welcome email sent.'));
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error('createTeacher Error:', err);
    return res.status(400).json(errorResponse(`Failed to create teacher: ${err.message}`));
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

async function updateTeacher(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { id } = req.params;
    const { first_name, last_name, email, phone, phone_number, employee_id, qualification, hire_date } = req.body;
    const finalPhone = phone || phone_number;

    const teacher = await Teacher.findOne({ where: { id, school_id: school.id } });
    if (!teacher) return res.status(404).json(errorResponse('Teacher not found'));

    // 1. Update User
    const user = await User.findByPk(teacher.user_id);
    if (user) {
      user.first_name = first_name || user.first_name;
      user.last_name = last_name || user.last_name;
      user.email = email || user.email;
      await user.save({ transaction });
    }

    // 2. Update Teacher
    await teacher.update({
      phone_number: finalPhone || teacher.phone_number,
      employee_id: employee_id || teacher.employee_id,
      qualification: qualification || teacher.qualification,
      hire_date: hire_date || teacher.hire_date,
    }, { transaction });

    await transaction.commit();
    return res.json(successResponse({ teacher }, 'Teacher updated successfully'));
  } catch (err) {
    await transaction.rollback();
    console.error('updateTeacher Error:', err);
    return res.status(400).json(errorResponse(`Failed to update teacher: ${err.message}`));
  }
}

module.exports = {
  getSchoolInfo, updateSchoolInfo, checkSchoolName,
  getStudents, createStudent, updateStudent, getNextAdmissionNumber, getStudentStats,
  getTeachers, createTeacher, updateTeacher, getTeacherStats,
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
