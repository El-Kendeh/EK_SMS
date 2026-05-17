const School = require('../models/School');
const SchoolAdmin = require('../models/SchoolAdmin');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const ClassSubject = require('../models/ClassSubject');
const ClassAssistantTeacher = require('../models/ClassAssistantTeacher');
const AcademicYear = require('../models/AcademicYear');
const Term = require('../models/Term');
const Grade = require('../models/Grade');
const Attendance = require('../models/Attendance');
const GradingScheme = require('../models/GradingScheme');
const Room = require('../models/Room');
const Exam = require('../models/Exam');
const Notification = require('../models/Notification');
const User = require('../models/User');
const SyllabusTopic = require('../models/SyllabusTopic');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');
const { sendTeacherWelcomeEmail } = require('../utils/email');
const { requireRoleId } = require('../utils/roleIds');

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

    const where = { school_id: school.id };
    if (req.query.classroom_id) {
      where.classroom_id = req.query.classroom_id;
    }

    const students = await Student.findAll({
      where,
      include: [
        { model: User, attributes: ['first_name', 'last_name', 'email'] },
        { model: require('../models/Class'), as: 'classroom', attributes: ['id', 'name'], required: false },
      ],
    });
    const formatted = students.map(s => {
      const userData = s.User || {};
      return {
        ...s.toJSON(),
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email || s.email,
        full_name: `${userData.first_name} ${userData.last_name}`.trim(),
        passport_picture: normalizePath(s.passport_picture),
        classroom: s.classroom?.name || null,
        classroom_id: s.classroom_id,
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
    const studentRoleId = await requireRoleId('student');

    const user = await User.create({
      username,
      password: hashedPassword,
      email: data.email || null,
      first_name: data.first_name,
      last_name: data.last_name,
      is_active: true,
      role_id: studentRoleId,
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
      
      father_name: data.father_name,
      father_phone: data.father_phone,
      father_email: data.father_email,
      father_occupation: data.father_occupation,
      father_address: data.father_address,
      father_whatsapp: data.father_whatsapp === 'true' || data.father_whatsapp === true,
      
      mother_name: data.mother_name,
      mother_phone: data.mother_phone,
      mother_email: data.mother_email,
      mother_occupation: data.mother_occupation,
      mother_address: data.mother_address,
      mother_whatsapp: data.mother_whatsapp === 'true' || data.mother_whatsapp === true,
      mother_relationship: data.mother_relationship,

      // Document flags
      documents_birth_certificate: data.doc_birth_certificate_verified === 'true' || !!(req.files && req.files.find(f => f.fieldname === 'doc_birth_certificate')),
      documents_passport_photo: data.doc_passport_photo_verified === 'true' || !!(req.files && req.files.find(f => f.fieldname === 'doc_passport_photo')),
      documents_previous_school_report: data.doc_previous_school_report_verified === 'true' || !!(req.files && req.files.find(f => f.fieldname === 'doc_previous_school_report')),
      documents_transfer_letter: data.doc_transfer_letter_verified === 'true' || !!(req.files && req.files.find(f => f.fieldname === 'doc_transfer_letter')),
      documents_medical_report: data.doc_medical_report_verified === 'true' || !!(req.files && req.files.find(f => f.fieldname === 'doc_medical_report')),
      documents_other: data.doc_other_verified === 'true' || !!(req.files && req.files.find(f => f.fieldname === 'doc_other')),

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
      
      father_name: data.father_name || student.father_name,
      father_phone: data.father_phone || student.father_phone,
      father_email: data.father_email || student.father_email,
      father_occupation: data.father_occupation || student.father_occupation,
      father_address: data.father_address || student.father_address,
      father_whatsapp: data.father_whatsapp !== undefined ? (data.father_whatsapp === 'true' || data.father_whatsapp === true) : student.father_whatsapp,
      
      mother_name: data.mother_name || student.mother_name,
      mother_phone: data.mother_phone || student.mother_phone,
      mother_email: data.mother_email || student.mother_email,
      mother_occupation: data.mother_occupation || student.mother_occupation,
      mother_address: data.mother_address || student.mother_address,
      mother_whatsapp: data.mother_whatsapp !== undefined ? (data.mother_whatsapp === 'true' || data.mother_whatsapp === true) : student.mother_whatsapp,
      mother_relationship: data.mother_relationship || student.mother_relationship,
      documents_birth_certificate: data.doc_birth_certificate_verified !== undefined ? (data.doc_birth_certificate_verified === 'true') : (req.files && req.files.find(f => f.fieldname === 'doc_birth_certificate') ? true : student.documents_birth_certificate),
      documents_passport_photo: data.doc_passport_photo_verified !== undefined ? (data.doc_passport_photo_verified === 'true') : (req.files && req.files.find(f => f.fieldname === 'doc_passport_photo') ? true : student.documents_passport_photo),
      documents_previous_school_report: data.doc_previous_school_report_verified !== undefined ? (data.doc_previous_school_report_verified === 'true') : (req.files && req.files.find(f => f.fieldname === 'doc_previous_school_report') ? true : student.documents_previous_school_report),
      documents_transfer_letter: data.doc_transfer_letter_verified !== undefined ? (data.doc_transfer_letter_verified === 'true') : (req.files && req.files.find(f => f.fieldname === 'doc_transfer_letter') ? true : student.documents_transfer_letter),
      documents_medical_report: data.doc_medical_report_verified !== undefined ? (data.doc_medical_report_verified === 'true') : (req.files && req.files.find(f => f.fieldname === 'doc_medical_report') ? true : student.documents_medical_report),
      documents_other: data.doc_other_verified !== undefined ? (data.doc_other_verified === 'true') : (req.files && req.files.find(f => f.fieldname === 'doc_other') ? true : student.documents_other),
      vaccinations: data.vaccinations || student.vaccinations,
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
      include: [{ model: User, attributes: ['username', 'first_name', 'last_name', 'email'] }]
    });
    const formatted = teachers.map(t => {
      const userData = t.User || {};
      return {
        ...t.toJSON(),
        username: userData.username,
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email || t.email,
        full_name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
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

    const { 
      first_name, last_name, email, phone, phone_number, 
      employee_id, qualification, password, username, hire_date,
      bio, linkedin_url, degrees, certifications, years_experience
    } = req.body;
    
    const finalPhone = phone || phone_number || '';
    const finalUsername = (username || email || `tch_${Date.now()}`).trim();

    // 1. Create User
    const hashedPassword = await bcrypt.hash(password || 'Teacher@123', 10);
    const teacherRoleId = await requireRoleId('teacher');
    const user = await User.create({
      username: finalUsername,
      password: hashedPassword,
      email: email || null,
      first_name,
      last_name,
      is_active: true,
      role_id: teacherRoleId,
    }, { transaction });

    // 2. Create Teacher profile
    const teacher = await Teacher.create({
      school_id: school.id,
      user_id: user.id,
      employee_id: employee_id || `EMP${Date.now()}`,
      phone_number: finalPhone || '0000000000',
      qualification: qualification || 'Not Specified',
      hire_date: hire_date || new Date(),
      years_experience: years_experience || 0,
      is_active: true,
      bio: bio || '',
      linkedin_url: linkedin_url || '',
      degrees: Array.isArray(degrees) ? degrees : [],
      certifications: Array.isArray(certifications) ? certifications : [],
      profile_picture: req.file ? `/uploads/badges/${req.file.filename}` : null, 
    }, { transaction });

    await transaction.commit();

    // 3. Send welcome email
    const teacherName = `${first_name} ${last_name}`;
    const rawPassword = password || 'Teacher@123';
    if (email) {
      sendTeacherWelcomeEmail(email, teacherName, user.username, rawPassword, school.name);
    }

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

    // Enrich each class with teacher info and subject counts
    const teacherIds = [...new Set(classes.map(c => c.class_teacher_id).filter(Boolean))];
    const teachers = teacherIds.length > 0
      ? await Teacher.findAll({
          where: { id: teacherIds, school_id: school.id },
          include: [{ model: User, attributes: ['username', 'first_name', 'last_name', 'email'] }],
        })
      : [];
    const teacherMap = {};
    teachers.forEach(t => {
      teacherMap[t.id] = {
        id: t.id,
        name: `${t.User?.first_name || ''} ${t.User?.last_name || ''}`.trim() || t.User?.username || 'Teacher',
        email: t.User?.email || '',
      };
    });

    // Get subject counts per class
    const classIds = classes.map(c => c.id);
    const subjectCounts = classIds.length > 0
      ? await ClassSubject.findAll({
          where: { class_id: classIds },
          attributes: ['class_id', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
          group: ['class_id'],
        })
      : [];
    const subjectCountMap = {};
    subjectCounts.forEach(sc => {
      subjectCountMap[sc.class_id] = parseInt(sc.dataValues.count, 10);
    });

    // Get assistant teacher counts per class
    const assistantCounts = classIds.length > 0
      ? await ClassAssistantTeacher.findAll({
          where: { class_id: classIds },
          attributes: ['class_id', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
          group: ['class_id'],
        })
      : [];
    const assistantCountMap = {};
    assistantCounts.forEach(ac => {
      assistantCountMap[ac.class_id] = parseInt(ac.dataValues.count, 10);
    });

    // Get student counts per class
    const studentCounts = classIds.length > 0
      ? await Student.findAll({
          where: { classroom_id: classIds, school_id: school.id },
          attributes: ['classroom_id', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
          group: ['classroom_id'],
        })
      : [];
    const studentCountMap = {};
    studentCounts.forEach(sc => {
      studentCountMap[sc.classroom_id] = parseInt(sc.dataValues.count, 10);
    });

    const enriched = classes.map(c => {
      const raw = c.toJSON();
      const teacher = teacherMap[c.class_teacher_id] || null;
      return {
        ...raw,
        class_teacher: teacher,
        teacher_name: teacher?.name || null,
        teacher_id: c.class_teacher_id,
        subjects_count: subjectCountMap[c.id] || 0,
        assistant_teachers_count: assistantCountMap[c.id] || 0,
        student_count: studentCountMap[c.id] || 0,
        enrolled: studentCountMap[c.id] || 0,
        density_pct: c.capacity > 0 ? Math.round(((studentCountMap[c.id] || 0) / c.capacity) * 100) : 0,
        is_at_risk: (studentCountMap[c.id] || 0) > c.capacity,
      };
    });

    return res.json(successResponse({ classes: enriched }));
  } catch (err) {
    console.error('getClasses Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch classes: ${err.message}`));
  }
}

async function getClassById(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { id } = req.params;
    const cls = await Class.findOne({ where: { id, school_id: school.id } });
    if (!cls) return res.status(404).json(errorResponse('Class not found'));

    // Get subjects for this class
    const classSubjects = await ClassSubject.findAll({
      where: { class_id: cls.id },
      include: [{ model: Subject, attributes: ['id', 'name', 'code'] }],
    });
    const subjects = classSubjects.map(cs => cs.Subject);

    // Get assistant teachers
    const assistantTeachers = await ClassAssistantTeacher.findAll({
      where: { class_id: cls.id },
      include: [{ model: Teacher, include: [{ model: User, attributes: ['username', 'first_name', 'last_name', 'email'] }] }],
    });
    const assistants = assistantTeachers.map(at => ({
      id: at.Teacher.id,
      name: `${at.Teacher.User?.first_name || ''} ${at.Teacher.User?.last_name || ''}`.trim() || at.Teacher.User?.username,
      email: at.Teacher.User?.email || '',
    }));

    // Get students
    const students = await Student.findAll({
      where: { classroom_id: cls.id, school_id: school.id },
      include: [{ model: User, attributes: ['first_name', 'last_name', 'email'] }],
    });
    const studentList = students.map(s => ({
      id: s.id,
      full_name: `${s.User?.first_name || ''} ${s.User?.last_name || ''}`.trim(),
      admission_number: s.admission_number,
    }));

    // Get class teacher
    let classTeacher = null;
    if (cls.class_teacher_id) {
      const teacher = await Teacher.findOne({
        where: { id: cls.class_teacher_id },
        include: [{ model: User, attributes: ['username', 'first_name', 'last_name', 'email'] }],
      });
      if (teacher) {
        classTeacher = {
          id: teacher.id,
          name: `${teacher.User?.first_name || ''} ${teacher.User?.last_name || ''}`.trim() || teacher.User?.username,
          email: teacher.User?.email || '',
        };
      }
    }

    const raw = cls.toJSON();
    return res.json(successResponse({
      class: {
        ...raw,
        class_teacher: classTeacher,
        teacher_name: classTeacher?.name || null,
        teacher_id: cls.class_teacher_id,
        subjects,
        subject_ids: subjects.map(s => s.id),
        assistant_teachers: assistants,
        assistant_teacher_ids: assistants.map(a => a.id),
        students: studentList,
        student_count: studentList.length,
        enrolled: studentList.length,
      },
    }));
  } catch (err) {
    console.error('getClassById Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch class: ${err.message}`));
  }
}

async function createClass(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const {
      name, code, form, form_number, category, stream,
      class_teacher_id, teacher_id, capacity, academic_year_id,
      room, start_time, end_time, colour_tag, education_level,
      track, notes, auto_promotion_target_id, is_active,
      subject_ids, assistant_teacher_ids,
    } = req.body;

    const cls = await Class.create({
      school_id: school.id,
      name,
      code: code || null,
      form: form || null,
      form_number: form_number || null,
      category: category || null,
      stream: stream || null,
      class_teacher_id: class_teacher_id || teacher_id || null,
      capacity: capacity || 50,
      academic_year_id: academic_year_id || null,
      room: room || null,
      start_time: start_time || null,
      end_time: end_time || null,
      colour_tag: colour_tag || '#3B82F6',
      education_level: education_level || null,
      track: track || null,
      notes: notes || null,
      auto_promotion_target_id: auto_promotion_target_id || null,
      is_active: is_active !== undefined ? is_active : true,
    });

    // Assign subjects if provided
    if (Array.isArray(subject_ids) && subject_ids.length > 0) {
      const subjectEntries = subject_ids.map(sid => ({
        class_id: cls.id,
        subject_id: sid,
      }));
      await ClassSubject.bulkCreate(subjectEntries, { ignoreDuplicates: true });
    }

    // Assign assistant teachers if provided
    if (Array.isArray(assistant_teacher_ids) && assistant_teacher_ids.length > 0) {
      const assistantEntries = assistant_teacher_ids.map(tid => ({
        class_id: cls.id,
        teacher_id: tid,
      }));
      await ClassAssistantTeacher.bulkCreate(assistantEntries, { ignoreDuplicates: true });
    }

    return res.json(successResponse({ class: cls }, 'Class created'));
  } catch (err) {
    console.error('createClass Error:', err);
    return res.status(500).json(errorResponse(`Failed to create class: ${err.message}`));
  }
}

async function updateClass(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { id } = req.params;
    const cls = await Class.findOne({ where: { id, school_id: school.id } });
    if (!cls) return res.status(404).json(errorResponse('Class not found'));

    const {
      name, code, form, form_number, category, stream,
      class_teacher_id, teacher_id, capacity, academic_year_id,
      room, start_time, end_time, colour_tag, education_level,
      track, notes, auto_promotion_target_id, is_active,
      subject_ids, assistant_teacher_ids,
    } = req.body;

    await cls.update({
      name: name !== undefined ? name : cls.name,
      code: code !== undefined ? code : cls.code,
      form: form !== undefined ? form : cls.form,
      form_number: form_number !== undefined ? form_number : cls.form_number,
      category: category !== undefined ? category : cls.category,
      stream: stream !== undefined ? stream : cls.stream,
      class_teacher_id: class_teacher_id !== undefined ? class_teacher_id : (teacher_id !== undefined ? teacher_id : cls.class_teacher_id),
      capacity: capacity !== undefined ? capacity : cls.capacity,
      academic_year_id: academic_year_id !== undefined ? academic_year_id : cls.academic_year_id,
      room: room !== undefined ? room : cls.room,
      start_time: start_time !== undefined ? start_time : cls.start_time,
      end_time: end_time !== undefined ? end_time : cls.end_time,
      colour_tag: colour_tag !== undefined ? colour_tag : cls.colour_tag,
      education_level: education_level !== undefined ? education_level : cls.education_level,
      track: track !== undefined ? track : cls.track,
      notes: notes !== undefined ? notes : cls.notes,
      auto_promotion_target_id: auto_promotion_target_id !== undefined ? auto_promotion_target_id : cls.auto_promotion_target_id,
      is_active: is_active !== undefined ? is_active : cls.is_active,
    });

    // Update subjects if provided
    if (Array.isArray(subject_ids)) {
      await ClassSubject.destroy({ where: { class_id: cls.id } });
      if (subject_ids.length > 0) {
        const subjectEntries = subject_ids.map(sid => ({
          class_id: cls.id,
          subject_id: sid,
        }));
        await ClassSubject.bulkCreate(subjectEntries, { ignoreDuplicates: true });
      }
    }

    // Update assistant teachers if provided
    if (Array.isArray(assistant_teacher_ids)) {
      await ClassAssistantTeacher.destroy({ where: { class_id: cls.id } });
      if (assistant_teacher_ids.length > 0) {
        const assistantEntries = assistant_teacher_ids.map(tid => ({
          class_id: cls.id,
          teacher_id: tid,
        }));
        await ClassAssistantTeacher.bulkCreate(assistantEntries, { ignoreDuplicates: true });
      }
    }

    return res.json(successResponse({ class: cls }, 'Class updated'));
  } catch (err) {
    console.error('updateClass Error:', err);
    return res.status(500).json(errorResponse(`Failed to update class: ${err.message}`));
  }
}

async function deleteClass(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { id } = req.params;
    const cls = await Class.findOne({ where: { id, school_id: school.id } });
    if (!cls) return res.status(404).json(errorResponse('Class not found'));

    // Remove related records
    await ClassSubject.destroy({ where: { class_id: cls.id } });
    await ClassAssistantTeacher.destroy({ where: { class_id: cls.id } });
    await cls.destroy();

    return res.json(successResponse({}, 'Class deleted'));
  } catch (err) {
    console.error('deleteClass Error:', err);
    return res.status(500).json(errorResponse(`Failed to delete class: ${err.message}`));
  }
}

async function assignStudentsToClass(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { id } = req.params;
    const { student_ids } = req.body;

    const cls = await Class.findOne({ where: { id, school_id: school.id } });
    if (!cls) return res.status(404).json(errorResponse('Class not found'));

    if (!Array.isArray(student_ids)) {
      return res.status(400).json(errorResponse('student_ids must be an array'));
    }

    // Update all specified students to this class
    await Student.update(
      { classroom_id: cls.id },
      { where: { id: student_ids, school_id: school.id } }
    );

    // Unassign students not in the list (optional: only if they were previously in this class)
    await Student.update(
      { classroom_id: null },
      { where: { school_id: school.id, classroom_id: cls.id, id: { [Op.notIn]: student_ids } } }
    );

    return res.json(successResponse({ assigned_count: student_ids.length }, 'Students assigned to class'));
  } catch (err) {
    console.error('assignStudentsToClass Error:', err);
    return res.status(500).json(errorResponse(`Failed to assign students: ${err.message}`));
  }
}

async function assignSubjectsToClass(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { id } = req.params;
    const { subject_ids } = req.body;

    const cls = await Class.findOne({ where: { id, school_id: school.id } });
    if (!cls) return res.status(404).json(errorResponse('Class not found'));

    if (!Array.isArray(subject_ids)) {
      return res.status(400).json(errorResponse('subject_ids must be an array'));
    }

    // Replace all subjects for this class
    await ClassSubject.destroy({ where: { class_id: cls.id } });
    if (subject_ids.length > 0) {
      const entries = subject_ids.map(sid => ({
        class_id: cls.id,
        subject_id: sid,
      }));
      await ClassSubject.bulkCreate(entries, { ignoreDuplicates: true });
    }

    return res.json(successResponse({ subject_count: subject_ids.length }, 'Subjects assigned to class'));
  } catch (err) {
    console.error('assignSubjectsToClass Error:', err);
    return res.status(500).json(errorResponse(`Failed to assign subjects: ${err.message}`));
  }
}

async function bulkCreateClasses(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const {
      name_template, code_template, form_number, capacity,
      education_level, track, colour_tag, start_time, end_time,
      room, notes, class_teacher_id, streams,
    } = req.body;

    if (!Array.isArray(streams) || streams.length < 2) {
      return res.status(400).json(errorResponse('streams must be an array with at least 2 items'));
    }

    const created = [];
    const skipped = [];

    for (const stream of streams) {
      const name = `${name_template} ${stream}`;
      const code = code_template ? `${code_template}${stream}` : null;

      try {
        const cls = await Class.create({
          school_id: school.id,
          name,
          code,
          form_number: form_number || null,
          capacity: capacity || 50,
          education_level: education_level || null,
          track: track || null,
          colour_tag: colour_tag || '#3B82F6',
          start_time: start_time || null,
          end_time: end_time || null,
          room: room || null,
          notes: notes || null,
          class_teacher_id: class_teacher_id || null,
          stream,
          is_active: true,
        });
        created.push(cls);
      } catch (err) {
        skipped.push({ code, reason: err.message });
      }
    }

    return res.json(successResponse({
      created,
      skipped,
      message: `Created ${created.length} class(es), skipped ${skipped.length}.`,
    }));
  } catch (err) {
    console.error('bulkCreateClasses Error:', err);
    return res.status(500).json(errorResponse(`Failed to bulk create classes: ${err.message}`));
  }
}

/* ================= SUBJECTS ================= */
async function getSubjects(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const subjects = await Subject.findAll({ where: { school_id: school.id } });

    // Get class counts per subject
    const subjectIds = subjects.map(s => s.id);
    const classCounts = subjectIds.length > 0
      ? await ClassSubject.findAll({
          where: { subject_id: subjectIds },
          attributes: ['subject_id', [sequelize.fn('COUNT', sequelize.col('class_id')), 'count']],
          group: ['subject_id'],
        })
      : [];
    const classCountMap = {};
    classCounts.forEach(cc => {
      classCountMap[cc.subject_id] = parseInt(cc.dataValues.count, 10);
    });

    // Get student counts per subject (sum of students in all classes that have this subject)
    const subjectClassMap = subjectIds.length > 0
      ? await ClassSubject.findAll({
          where: { subject_id: subjectIds },
          attributes: ['subject_id', 'class_id'],
        })
      : [];
    const classIdsBySubject = {};
    subjectClassMap.forEach(sc => {
      if (!classIdsBySubject[sc.subject_id]) classIdsBySubject[sc.subject_id] = [];
      classIdsBySubject[sc.subject_id].push(sc.class_id);
    });

    const allClassIds = [...new Set(Object.values(classIdsBySubject).flat())];
    const studentCounts = allClassIds.length > 0
      ? await Student.findAll({
          where: { classroom_id: allClassIds, school_id: school.id },
          attributes: ['classroom_id', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
          group: ['classroom_id'],
        })
      : [];
    const studentCountByClass = {};
    studentCounts.forEach(sc => {
      studentCountByClass[sc.classroom_id] = parseInt(sc.dataValues.count, 10);
    });

    const studentCountMap = {};
    for (const [subjId, classIds] of Object.entries(classIdsBySubject)) {
      studentCountMap[subjId] = classIds.reduce((sum, cid) => sum + (studentCountByClass[cid] || 0), 0);
    }

    // Get teacher assignments per subject (from ClassSubject where teacher_id is set)
    const teacherAssignments = subjectIds.length > 0
      ? await ClassSubject.findAll({
          where: { subject_id: subjectIds, teacher_id: { [Op.ne]: null } },
          attributes: ['subject_id', 'teacher_id'],
        })
      : [];
    const teacherIdMap = {};
    teacherAssignments.forEach(ta => {
      if (!teacherIdMap[ta.subject_id]) teacherIdMap[ta.subject_id] = [];
      teacherIdMap[ta.subject_id].push(ta.teacher_id);
    });

    // Fetch teacher names
    const allTeacherIds = [...new Set(Object.values(teacherIdMap).flat())];
    const teachers = allTeacherIds.length > 0
      ? await Teacher.findAll({
          where: { id: allTeacherIds },
          include: [{ model: User, attributes: ['username', 'first_name', 'last_name', 'email'] }],
        })
      : [];
    const teacherMap = {};
    teachers.forEach(t => {
      teacherMap[t.id] = {
        id: t.id,
        name: `${t.User?.first_name || ''} ${t.User?.last_name || ''}`.trim() || t.User?.username || 'Teacher',
        email: t.User?.email || '',
      };
    });

    const teacherListMap = {};
    for (const [subjId, tIds] of Object.entries(teacherIdMap)) {
      teacherListMap[subjId] = tIds.map(tid => teacherMap[tid]).filter(Boolean);
    }

    const enriched = subjects.map(s => {
      const raw = s.toJSON();
      return {
        ...raw,
        class_count: classCountMap[s.id] || 0,
        student_count: studentCountMap[s.id] || 0,
        assigned_teachers: teacherListMap[s.id] || [],
        class_ids: classIdsBySubject[s.id] || [],
      };
    });

    return res.json(successResponse({ subjects: enriched }));
  } catch (err) {
    console.error('getSubjects Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch subjects: ${err.message}`));
  }
}

async function createSubject(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { name, code, description, is_active } = req.body;
    const subject = await Subject.create({
      school_id: school.id, name, code, description,
      is_active: is_active !== undefined ? is_active : true,
    });

    return res.json(successResponse({ subject }, 'Subject created'));
  } catch (err) {
    console.error('createSubject Error:', err);
    return res.status(500).json(errorResponse(`Failed to create subject: ${err.message}`));
  }
}

async function updateSubject(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { id } = req.params;
    const subject = await Subject.findOne({ where: { id, school_id: school.id } });
    if (!subject) return res.status(404).json(errorResponse('Subject not found'));

    const { name, code, description, is_active } = req.body;
    await subject.update({
      name: name !== undefined ? name : subject.name,
      code: code !== undefined ? code : subject.code,
      description: description !== undefined ? description : subject.description,
      is_active: is_active !== undefined ? is_active : subject.is_active,
    });

    return res.json(successResponse({ subject }, 'Subject updated'));
  } catch (err) {
    console.error('updateSubject Error:', err);
    return res.status(500).json(errorResponse(`Failed to update subject: ${err.message}`));
  }
}

async function deleteSubject(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { id } = req.params;
    const subject = await Subject.findOne({ where: { id, school_id: school.id } });
    if (!subject) return res.status(404).json(errorResponse('Subject not found'));

    // Remove class-subject associations
    await ClassSubject.destroy({ where: { subject_id: subject.id } });
    await subject.destroy();

    return res.json(successResponse({}, 'Subject deleted'));
  } catch (err) {
    console.error('deleteSubject Error:', err);
    return res.status(500).json(errorResponse(`Failed to delete subject: ${err.message}`));
  }
}

async function assignClassesToSubject(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { id } = req.params;
    const { class_ids } = req.body;

    const subject = await Subject.findOne({ where: { id, school_id: school.id } });
    if (!subject) return res.status(404).json(errorResponse('Subject not found'));

    if (!Array.isArray(class_ids)) {
      return res.status(400).json(errorResponse('class_ids must be an array'));
    }

    // Replace all class assignments for this subject
    await ClassSubject.destroy({ where: { subject_id: subject.id } });
    if (class_ids.length > 0) {
      const entries = class_ids.map(cid => ({
        class_id: cid,
        subject_id: subject.id,
      }));
      await ClassSubject.bulkCreate(entries, { ignoreDuplicates: true });
    }

    return res.json(successResponse({ class_count: class_ids.length }, 'Classes assigned to subject'));
  } catch (err) {
    console.error('assignClassesToSubject Error:', err);
    return res.status(500).json(errorResponse(`Failed to assign classes: ${err.message}`));
  }
}

async function assignTeachersToSubject(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { id } = req.params;
    const { teacher_ids } = req.body;

    const subject = await Subject.findOne({ where: { id, school_id: school.id } });
    if (!subject) return res.status(404).json(errorResponse('Subject not found'));

    if (!Array.isArray(teacher_ids)) {
      return res.status(400).json(errorResponse('teacher_ids must be an array'));
    }

    // Update teacher_id on all ClassSubject entries for this subject
    // First, get all class-subject entries for this subject
    const classSubjects = await ClassSubject.findAll({ where: { subject_id: subject.id } });

    if (classSubjects.length > 0 && teacher_ids.length > 0) {
      // Assign the first teacher as the primary teacher for all class-subject entries
      // (In a more advanced system, you could map teachers to specific classes)
      const primaryTeacherId = teacher_ids[0];
      await ClassSubject.update(
        { teacher_id: primaryTeacherId },
        { where: { subject_id: subject.id } }
      );
    } else if (classSubjects.length > 0 && teacher_ids.length === 0) {
      // Remove teacher assignments
      await ClassSubject.update(
        { teacher_id: null },
        { where: { subject_id: subject.id } }
      );
    }

    return res.json(successResponse({ teacher_count: teacher_ids.length }, 'Teachers assigned to subject'));
  } catch (err) {
    console.error('assignTeachersToSubject Error:', err);
    return res.status(500).json(errorResponse(`Failed to assign teachers: ${err.message}`));
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

/* ================= SYLLABUS TOPICS ================= */
async function getSyllabusTopics(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { class_id, subject_id, term_id } = req.query;
    const where = { school_id: school.id };
    if (class_id) where.class_id = class_id;
    if (subject_id) where.subject_id = subject_id;
    if (term_id) where.term_id = term_id;

    const topics = await SyllabusTopic.findAll({
      where,
      order: [['week_number', 'ASC'], ['created_at', 'DESC']],
    });

    // Enrich with teacher names
    const teacherIds = [...new Set(topics.map(t => t.teacher_id).filter(Boolean))];
    const teachers = teacherIds.length > 0
      ? await Teacher.findAll({
          where: { id: teacherIds },
          include: [{ model: User, attributes: ['username', 'first_name', 'last_name', 'email'] }],
        })
      : [];
    const teacherMap = {};
    teachers.forEach(t => {
      teacherMap[t.id] = {
        id: t.id,
        name: `${t.User?.first_name || ''} ${t.User?.last_name || ''}`.trim() || t.User?.username || 'Teacher',
        email: t.User?.email || '',
      };
    });

    const enriched = topics.map(t => {
      const raw = t.toJSON();
      return {
        ...raw,
        teacher: teacherMap[t.teacher_id] || null,
        teacher_name: teacherMap[t.teacher_id]?.name || null,
      };
    });

    return res.json(successResponse({ topics: enriched }));
  } catch (err) {
    console.error('getSyllabusTopics Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch syllabus topics: ${err.message}`));
  }
}

async function createSyllabusTopic(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const {
      class_id, subject_id, term_id, title, description,
      group, priority, duration_weeks, week_number, teacher_id,
    } = req.body;

    if (!title?.trim()) return res.status(400).json(errorResponse('Title is required'));
    if (!class_id) return res.status(400).json(errorResponse('Class is required'));
    if (!subject_id) return res.status(400).json(errorResponse('Subject is required'));

    const topic = await SyllabusTopic.create({
      school_id: school.id,
      class_id,
      subject_id,
      term_id: term_id || null,
      title: title.trim(),
      description: description || '',
      group: group || 'General',
      priority: priority || 'medium',
      duration_weeks: duration_weeks || 1,
      week_number: week_number || null,
      teacher_id: teacher_id || null,
      status: 'not_started',
    });

    return res.json(successResponse({ topic }, 'Topic created'));
  } catch (err) {
    console.error('createSyllabusTopic Error:', err);
    return res.status(500).json(errorResponse(`Failed to create topic: ${err.message}`));
  }
}

async function updateSyllabusTopic(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { id } = req.params;
    const topic = await SyllabusTopic.findOne({ where: { id, school_id: school.id } });
    if (!topic) return res.status(404).json(errorResponse('Topic not found'));

    const {
      title, description, group, priority, duration_weeks,
      week_number, term_id, teacher_id, status, date_covered,
    } = req.body;

    await topic.update({
      title: title !== undefined ? title : topic.title,
      description: description !== undefined ? description : topic.description,
      group: group !== undefined ? group : topic.group,
      priority: priority !== undefined ? priority : topic.priority,
      duration_weeks: duration_weeks !== undefined ? duration_weeks : topic.duration_weeks,
      week_number: week_number !== undefined ? week_number : topic.week_number,
      term_id: term_id !== undefined ? term_id : topic.term_id,
      teacher_id: teacher_id !== undefined ? teacher_id : topic.teacher_id,
      status: status !== undefined ? status : topic.status,
      date_covered: date_covered !== undefined ? date_covered : topic.date_covered,
    });

    return res.json(successResponse({ topic }, 'Topic updated'));
  } catch (err) {
    console.error('updateSyllabusTopic Error:', err);
    return res.status(500).json(errorResponse(`Failed to update topic: ${err.message}`));
  }
}

async function deleteSyllabusTopic(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { id } = req.params;
    const topic = await SyllabusTopic.findOne({ where: { id, school_id: school.id } });
    if (!topic) return res.status(404).json(errorResponse('Topic not found'));

    await topic.destroy();
    return res.json(successResponse({}, 'Topic deleted'));
  } catch (err) {
    console.error('deleteSyllabusTopic Error:', err);
    return res.status(500).json(errorResponse(`Failed to delete topic: ${err.message}`));
  }
}

async function getSyllabusStats(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { class_id, subject_id } = req.query;
    const where = { school_id: school.id };
    if (class_id) where.class_id = class_id;
    if (subject_id) where.subject_id = subject_id;

    const total = await SyllabusTopic.count({ where });
    const completed = await SyllabusTopic.count({ where: { ...where, status: 'completed' } });
    const inProgress = await SyllabusTopic.count({ where: { ...where, status: 'in_progress' } });
    const notStarted = await SyllabusTopic.count({ where: { ...where, status: 'not_started' } });
    const coverage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return res.json(successResponse({
      total, completed, in_progress: inProgress, not_started: notStarted, coverage,
    }));
  } catch (err) {
    console.error('getSyllabusStats Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch stats: ${err.message}`));
  }
}

module.exports = {
  getSchoolInfo, updateSchoolInfo, checkSchoolName,
  getStudents, createStudent, updateStudent, getNextAdmissionNumber, getStudentStats,
  getTeachers, createTeacher, updateTeacher, getTeacherStats,
  getClasses, getClassById, createClass, updateClass, deleteClass, bulkCreateClasses,
  assignStudentsToClass, assignSubjectsToClass,
  getSubjects, createSubject, updateSubject, deleteSubject,
  assignClassesToSubject, assignTeachersToSubject,
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
  getSyllabusTopics, createSyllabusTopic, updateSyllabusTopic, deleteSyllabusTopic, getSyllabusStats,
};
