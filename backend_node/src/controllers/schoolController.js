const School = require('../models/School');
const SchoolAdmin = require('../models/SchoolAdmin');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Parent = require('../models/Parent');
const CorePrincipal = require('../models/CorePrincipal');
const CoreBursar = require('../models/CoreBursar');
const StudentParent = require('../models/StudentParent');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const ClassSubject = require('../models/ClassSubject');
const ClassAssistantTeacher = require('../models/ClassAssistantTeacher');
const AcademicYear = require('../models/AcademicYear');
const Term = require('../models/Term');
const Grade = require('../models/Grade');
const Attendance = require('../models/Attendance');
const GradingScheme = require('../models/GradingScheme');
const { appendGradeEventSafe } = require('../utils/gradeEvent');
const { appendSecurityAuditLog } = require('../utils/auditLog');
const Room = require('../models/Room');
const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Role = require('../models/Role');
const SyllabusTopic = require('../models/SyllabusTopic');
const Payment = require('../models/Payment');
const Fee = require('../models/Fee');
const Expense = require('../models/Expense');
const FeeCategory = require('../models/FeeCategory');
const Message = require('../models/Message');
const Assignment = require('../models/Assignment');
const ModificationRequest = require('../models/ModificationRequest');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');
const { sendTeacherWelcomeEmail, sendPasswordResetEmail } = require('../utils/email');
const { sendSchoolChangesSubmittedEmail } = require('../services/mailer');
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
      include: [{ model: School, as: 'school' }],
    });
    // Association is aliased `as: 'school'` (lowercase), so Sequelize populates
    // link.school — not link.School. Reading the capital-S property left this
    // branch dead, forcing every lookup onto the JWT school_id fallback below.
    if (link?.school) {
      return link.school;
    }

    if ((req.schoolId || req.user.school_id)) {
      const fallbackSchool = await School.findByPk((req.schoolId || req.user.school_id));
      if (fallbackSchool) {
        return fallbackSchool;
      }
    }

    const teacherLink = await Teacher.findOne({
      where: { user_id: req.user.id },
      include: [{ model: School, as: 'school' }],
    });
    if (teacherLink?.school) {
      return teacherLink.school;
    }

    const studentLink = await Student.findOne({
      where: { user_id: req.user.id },
      include: [{ model: School, as: 'school' }],
    });
    if (studentLink?.school || studentLink?.School) {
      return studentLink.school || studentLink.School;
    }
    if (studentLink?.school_id) {
      const s = await School.findByPk(studentLink.school_id);
      if (s) return s;
    }

    // Parents have no direct school link — resolve via a child's school.
    const parentLink = await Parent.findOne({
      where: { user_id: req.user.id },
      include: [{ model: Student, as: 'students', include: [{ model: School, as: 'school' }] }],
    });
    const child = parentLink?.students?.[0];
    if (child?.school || child?.School) {
      return child.school || child.School;
    }
    if (child?.school_id) {
      const s = await School.findByPk(child.school_id);
      if (s) return s;
    }

    console.warn(`getSchoolFromUser: No school link found for user_id ${req.user.id} and fallback school_id ${(req.schoolId || req.user.school_id)}`);
    return null;
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
    return res.status(500).json(errorResponse(`Internal server error`, 500));
  }
}

async function updateSchoolInfo(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(404).json(errorResponse('School not found'));

    const hadChangesRequested = school.changes_requested;

    const { phone, address, city, country, brand_colors, motto } = req.body;
    if (phone !== undefined) school.phone = phone;
    if (address !== undefined) school.address = address;
    if (city !== undefined) school.city = city;
    if (country !== undefined) school.country = country;
    if (brand_colors !== undefined) school.brand_colors = brand_colors;
    if (motto !== undefined) school.motto = motto;
    if (req.file) {
      school.badge_path = `/uploads/badges/${req.file.filename}`;
    }

    if (hadChangesRequested) {
      school.changes_requested = false;
    }

    await school.save();

    if (hadChangesRequested) {
      try {
        const superadminRole = await Role.findOne({ where: { code: 'superadmin' } });
        if (superadminRole) {
          const superadmins = await User.findAll({
            where: { role_id: superadminRole.id, is_active: true },
            attributes: ['id', 'email', 'first_name'],
          });
          for (const sa of superadmins) {
            if (sa.email && String(sa.email).trim()) {
              await sendSchoolChangesSubmittedEmail({
                toEmail: String(sa.email).trim(),
                schoolName: school.name,
              });
            }
          }
        }
      } catch (err) {
        console.error('Changes submitted notification email failed:', err.message || err);
      }
    }

    return res.json(successResponse({ school }, 'School information updated'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse(`Failed to update school information`));
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
        { model: User, as: 'user', attributes: ['first_name', 'last_name', 'email'] },
        { model: require('../models/Class'), as: 'classroom', attributes: ['id', 'name'], required: false },
      ],
    });
    const formatted = students.map(s => {
      const userData = s.user || {};
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
    return res.status(500).json(errorResponse(`Failed to fetch students`));
  }
}

async function createStudent(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const data = req.body;

    // Validate client-supplied foreign keys belong to this school before creating
    // anything (a student row must not point at another school's class/year).
    if (data.classroom_id) {
      const cls = await Class.findOne({ where: { id: data.classroom_id, school_id: school.id }, transaction });
      if (!cls) { await transaction.rollback(); return res.status(400).json(errorResponse('Selected class does not belong to your school')); }
    }
    if (data.academic_year_id) {
      const yr = await AcademicYear.findOne({ where: { id: data.academic_year_id, school_id: school.id }, transaction });
      if (!yr) { await transaction.rollback(); return res.status(400).json(errorResponse('Selected academic year does not belong to your school')); }
    }

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
    return res.status(400).json(errorResponse(`Failed to create student`));
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
    return res.status(400).json(errorResponse(`Failed to update student`));
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
      include: [{ model: User, as: 'user', attributes: ['username', 'first_name', 'last_name', 'email'] }]
    });
    const formatted = teachers.map(t => {
      const userData = t.user || {};
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
    return res.status(500).json(errorResponse(`Failed to fetch teachers`));
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
    return res.status(400).json(errorResponse(`Failed to create teacher`));
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
          include: [{ model: User, as: 'user', attributes: ['username', 'first_name', 'last_name', 'email'] }],
        })
      : [];
    const teacherMap = {};
    teachers.forEach(t => {
      teacherMap[t.id] = {
        id: t.id,
        name: `${t.user?.first_name || ''} ${t.user?.last_name || ''}`.trim() || t.user?.username || 'Teacher',
        email: t.user?.email || '',
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
    return res.status(500).json(errorResponse(`Failed to fetch classes`));
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
      include: [{ model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }],
    });
    const subjects = classSubjects.map(cs => cs.subject);

    // Get assistant teachers
    const assistantTeachers = await ClassAssistantTeacher.findAll({
      where: { class_id: cls.id },
      include: [{ model: Teacher, as: 'teacher', include: [{ model: User, as: 'user', attributes: ['username', 'first_name', 'last_name', 'email'] }] }],
    });
    const assistants = assistantTeachers.map(at => ({
      id: at.teacher.id,
      name: `${at.teacher.user?.first_name || ''} ${at.teacher.user?.last_name || ''}`.trim() || at.teacher.user?.username,
      email: at.teacher.user?.email || '',
    }));

    // Get students
    const students = await Student.findAll({
      where: { classroom_id: cls.id, school_id: school.id },
      include: [
        { model: User, as: 'user', attributes: ['first_name', 'last_name', 'email'] },
        { model: require('../models/Class'), as: 'classroom', attributes: ['id', 'name'] },
      ],
    });
    const studentList = students.map(s => ({
      id: s.id,
      full_name: `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.trim(),
      admission_number: s.admission_number,
    }));

    // Get class teacher
    let classTeacher = null;
    if (cls.class_teacher_id) {
      const teacher = await Teacher.findOne({
        where: { id: cls.class_teacher_id },
        include: [{ model: User, as: 'user', attributes: ['username', 'first_name', 'last_name', 'email'] }],
      });
      if (teacher) {
        classTeacher = {
          id: teacher.id,
          name: `${teacher.user?.first_name || ''} ${teacher.user?.last_name || ''}`.trim() || teacher.user?.username,
          email: teacher.user?.email || '',
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
    return res.status(500).json(errorResponse(`Failed to fetch class`));
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
    return res.status(500).json(errorResponse(`Failed to create class`));
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
    return res.status(500).json(errorResponse(`Failed to update class`));
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
    return res.status(500).json(errorResponse(`Failed to delete class`));
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

    // Report the ids that actually belong to this school, not the input length —
    // a bad/foreign id used to produce a false "N assigned" success toast.
    // Counted explicitly (not from update's return): mysql2 reports CHANGED rows,
    // so re-assigning an already-assigned student would read as "not found".
    const uniqueIds = [...new Set(student_ids.map(Number))];
    const assigned = await Student.count({ where: { id: uniqueIds, school_id: school.id } });
    await Student.update(
      { classroom_id: cls.id },
      { where: { id: uniqueIds, school_id: school.id } }
    );

    // Unassign students not in the list (optional: only if they were previously in this class)
    await Student.update(
      { classroom_id: null },
      { where: { school_id: school.id, classroom_id: cls.id, id: { [Op.notIn]: uniqueIds } } }
    );

    const skipped = uniqueIds.length - assigned;
    return res.json(successResponse(
      { assigned_count: assigned, skipped_count: skipped },
      skipped > 0 ? `${assigned} student(s) assigned; ${skipped} id(s) not found in this school` : 'Students assigned to class'
    ));
  } catch (err) {
    console.error('assignStudentsToClass Error:', err);
    return res.status(500).json(errorResponse(`Failed to assign students`));
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
    return res.status(500).json(errorResponse(`Failed to assign subjects`));
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
        skipped.push({ code, reason: 'Failed to create class' });
      }
    }

    return res.json(successResponse({
      created,
      skipped,
      message: `Created ${created.length} class(es), skipped ${skipped.length}.`,
    }));
  } catch (err) {
    console.error('bulkCreateClasses Error:', err);
    return res.status(500).json(errorResponse(`Failed to bulk create classes`));
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
          include: [{ model: User, as: 'user', attributes: ['username', 'first_name', 'last_name', 'email'] }],
        })
      : [];
    const teacherMap = {};
    teachers.forEach(t => {
      teacherMap[t.id] = {
        id: t.id,
        name: `${t.user?.first_name || ''} ${t.user?.last_name || ''}`.trim() || t.user?.username || 'Teacher',
        email: t.user?.email || '',
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
    return res.status(500).json(errorResponse(`Failed to fetch subjects`));
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
    return res.status(500).json(errorResponse(`Failed to create subject`));
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
    return res.status(500).json(errorResponse(`Failed to update subject`));
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
    return res.status(500).json(errorResponse(`Failed to delete subject`));
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
    return res.status(500).json(errorResponse(`Failed to assign classes`));
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
    return res.status(500).json(errorResponse(`Failed to assign teachers`));
  }
}

/* ================= ACADEMIC YEARS & TERMS ================= */
async function updateTerm(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { id } = req.params;
    const { name, start_date, end_date, academic_year_id, is_active } = req.body;
    const term = await Term.findOne({ where: { id, school_id: school.id } });
    if (!term) return res.status(404).json(errorResponse('Term not found'));

    await term.update({ name, start_date, end_date, academic_year_id, is_active });
    return res.json(successResponse({ term }, 'Term updated'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to update term'));
  }
}

async function deleteTerm(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { id } = req.params;
    const term = await Term.findOne({ where: { id, school_id: school.id } });
    if (!term) return res.status(404).json(errorResponse('Term not found'));

    await term.destroy();
    return res.json(successResponse({}, 'Term deleted'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to delete term'));
  }
}

function calcTermPosition(startDate, endDate) {
  if (!startDate) return 'prefit';
  const now = new Date();
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  if (now < start) return 'prefit';

  if (!end) return 'mid';

  if (now > end) return 'end';

  const total = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  const ratio = elapsed / total;

  if (ratio < 0.33) return 'prefit';
  if (ratio < 0.66) return 'mid';
  return 'end';
}

async function getSchoolContext(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) {
      return res.json(successResponse({
        school: null,
        academic_year: null,
        term: null,
        terms: [],
        has_school: false,
      }, 'No school context available for this user.'));
    }

    const activeYear = await AcademicYear.findOne({
      where: { school_id: school.id, is_active: true },
    });

    const activeTerm = await Term.findOne({
      where: { school_id: school.id, is_active: true },
      include: [{ model: AcademicYear, as: 'academicYear', attributes: ['id', 'name', 'start_date', 'end_date'] }],
    });

    const allTerms = await Term.findAll({
      where: { school_id: school.id },
      include: [{ model: AcademicYear, as: 'academicYear', attributes: ['id', 'name'] }],
      order: [['created_at', 'ASC']],
    });

    const termPosition = activeTerm ? calcTermPosition(activeTerm.start_date, activeTerm.end_date) : null;

    return res.json(successResponse({
      school: { id: school.id, name: school.name },
      academic_year: activeYear ? { id: activeYear.id, name: activeYear.name, start_date: activeYear.start_date, end_date: activeYear.end_date } : null,
      term: activeTerm ? {
        id: activeTerm.id,
        name: activeTerm.name,
        start_date: activeTerm.start_date,
        end_date: activeTerm.end_date,
        position: termPosition,
        academic_year: activeTerm.academicYear ? { id: activeTerm.academicYear.id, name: activeTerm.academicYear.name } : null,
      } : null,
      terms: allTerms.map(t => ({
        id: t.id,
        name: t.name,
        is_active: t.is_active,
        academic_year: t.academicYear ? { id: t.academicYear.id, name: t.academicYear.name } : null,
      })),
    }));
  } catch (err) {
    console.error('getSchoolContext Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch school context`));
  }
}

async function getAcademicYears(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const years = await AcademicYear.findAll({ where: { school_id: school.id }, order: [['start_date', 'DESC']] });
    return res.json(successResponse({ years }));
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

    const terms = await Term.findAll({
      where: { school_id: school.id },
      include: [{ model: AcademicYear, as: 'academicYear', attributes: ['id', 'name', 'start_date', 'end_date'] }],
      order: [['created_at', 'DESC']],
    });
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

    // Clamp each component to a sane numeric range; '' / null / non-numeric → null.
    const clampScore = (v) => {
      if (v === undefined || v === null || v === '') return null;
      const n = Number(v);
      if (!Number.isFinite(n)) return null;
      return Math.min(100, Math.max(0, n));
    };

    let savedCount = 0;
    let skipped = 0;
    for (const g of grades) {
      // Tenant guard: only accept students that belong to THIS school. Stops a forged/
      // foreign student_id in the body from writing a cross-tenant grade row.
      const student = await Student.findOne({
        where: { id: g.student_id, school_id: school.id }, attributes: ['id'],
      });
      if (!student) { skipped += 1; continue; }

      const ca = clampScore(g.ca);
      const midterm = clampScore(g.midterm);
      const final = clampScore(g.final);

      // Prior values for the audit trail.
      const prior = await Grade.findOne({
        where: { school_id: school.id, student_id: g.student_id, subject_id, term_id },
        attributes: ['ca', 'midterm', 'final'],
      });

      await Grade.upsert({
        school_id: school.id,
        student_id: g.student_id,
        subject_id, term_id,
        ca, midterm, final,
      }, {
        conflictFields: ['school_id', 'student_id', 'subject_id', 'term_id'],
      });
      savedCount += 1;

      // Tamper-evident audit: record every direct grade write in the per-school
      // SHA-256 chain (best-effort — an audit hiccup must not block the save).
      await appendGradeEventSafe({
        school_id: school.id,
        student_id: g.student_id,
        subject_id, term_id,
        actor_user_id: req.user?.id || null,
        actor_name: req.user?.username || null,
        event_type: 'admin_grade_save',
        field: 'ca/midterm/final',
        old_value: prior ? `${prior.ca}/${prior.midterm}/${prior.final}` : null,
        new_value: `${ca}/${midterm}/${final}`,
      });
    }

    return res.json(successResponse({ saved: savedCount, skipped }, 'Grades saved'));
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
    // Tenant guard: the student must belong to this school (no cross-tenant attendance rows).
    const student = await Student.findOne({ where: { id: student_id, school_id: school.id }, attributes: ['id'] });
    if (!student) return res.status(400).json(errorResponse('Invalid student for this school'));
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

    const rows = await Exam.findAll({ where: { school_id: school.id }, order: [['id', 'DESC']] });
    // Resolve subject/classroom names + how many results are entered, so the exam
    // list can render "{subject}", "{classroom}" and the "X entered" badge.
    const [subjects, classes] = await Promise.all([
      Subject.findAll({ where: { school_id: school.id }, attributes: ['id', 'name'] }),
      Class.findAll({ where: { school_id: school.id }, attributes: ['id', 'name'] }),
    ]);
    const subjMap = Object.fromEntries(subjects.map(s => [String(s.id), s.name]));
    const classMap = Object.fromEntries(classes.map(c => [String(c.id), c.name]));
    const exams = await Promise.all(rows.map(async (e) => {
      const result_count = await ExamResult.count({ where: { exam_id: e.id, school_id: school.id } });
      return {
        id: e.id, name: e.name, date: e.date, term_id: e.term_id,
        subject_id: e.subject_id, classroom_id: e.classroom_id,
        total_marks: e.total_marks, exam_type: e.exam_type, is_active: e.is_active,
        subject: subjMap[String(e.subject_id)] || '—',
        classroom: classMap[String(e.classroom_id)] || '—',
        result_count,
      };
    }));
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

    const { term_id, name, date, subject_id, classroom_id, total_marks, exam_type } = req.body;
    const exam = await Exam.create({
      school_id: school.id, term_id, name, date, subject_id, classroom_id, total_marks,
      exam_type: exam_type || 'final',
    });

    return res.json(successResponse({ exam }, 'Exam created'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to create exam'));
  }
}

/* ===== Phase 2 additions: previously-missing endpoints the live UI calls.
   All school-scoped + validated; mutations are role-gated by the school router. ===== */

async function deleteExam(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));
    const exam = await Exam.findOne({ where: { id: req.params.id, school_id: school.id } });
    if (!exam) return res.status(404).json(errorResponse('Exam not found'));
    await ExamResult.destroy({ where: { exam_id: exam.id, school_id: school.id } });
    await exam.destroy();
    return res.json(successResponse({}, 'Exam deleted'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to delete exam'));
  }
}

async function getExamResults(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));
    const exam = await Exam.findOne({ where: { id: req.params.id, school_id: school.id } });
    if (!exam) return res.status(404).json(errorResponse('Exam not found'));

    // Roster = students in the exam's class (or all school students if the exam has
    // no class), merged with any marks already recorded.
    const studentWhere = { school_id: school.id };
    if (exam.classroom_id) studentWhere.classroom_id = exam.classroom_id;
    const students = await Student.findAll({ where: studentWhere, order: [['id', 'ASC']] });
    const existing = await ExamResult.findAll({ where: { exam_id: exam.id, school_id: school.id } });
    const markMap = Object.fromEntries(existing.map(r => [String(r.student_id), r]));

    const results = await Promise.all(students.map(async (s) => {
      let user = null;
      try { user = await User.findByPk(s.user_id, { attributes: ['first_name', 'last_name'] }); } catch {}
      const rec = markMap[String(s.id)];
      const name = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '';
      return {
        student_id: s.id,
        student_name: name || s.admission_number || `Student #${s.id}`,
        admission_number: s.admission_number || '',
        marks: rec && rec.marks != null ? rec.marks : null,
        remarks: rec ? (rec.remarks || '') : '',
      };
    }));
    return res.json(successResponse({ results }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to fetch exam results'));
  }
}

async function saveExamResults(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));
    const exam = await Exam.findOne({ where: { id: req.params.id, school_id: school.id } });
    if (!exam) return res.status(404).json(errorResponse('Exam not found'));
    const { results } = req.body;
    if (!Array.isArray(results)) return res.status(400).json(errorResponse('Invalid results format'));

    const max = Number(exam.total_marks) > 0 ? Number(exam.total_marks) : 100;
    let saved = 0, skipped = 0;
    for (const r of results) {
      // Tenant guard: only accept students that belong to THIS school.
      const student = await Student.findOne({ where: { id: r.student_id, school_id: school.id }, attributes: ['id'] });
      if (!student) { skipped += 1; continue; }
      let marks = (r.marks === '' || r.marks == null) ? null : Number(r.marks);
      if (marks != null && !Number.isFinite(marks)) marks = null;
      if (marks != null) marks = Math.min(max, Math.max(0, marks));
      await ExamResult.upsert({
        school_id: school.id, exam_id: exam.id, student_id: r.student_id,
        marks, remarks: (r.remarks || '').slice(0, 255),
      }, { conflictFields: ['exam_id', 'student_id'] });
      saved += 1;
    }
    return res.json(successResponse({ saved, skipped }, `Saved ${saved} result(s).`));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to save exam results'));
  }
}

async function updateRoom(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));
    const room = await Room.findOne({ where: { id: req.params.id, school_id: school.id } });
    if (!room) return res.status(404).json(errorResponse('Room not found'));
    const { name, code, capacity, room_type, is_active } = req.body;
    const fields = {};
    if (name !== undefined) fields.name = name;
    if (code !== undefined) fields.code = code;
    if (capacity !== undefined) fields.capacity = capacity;
    if (room_type !== undefined) fields.room_type = room_type;
    if (is_active !== undefined) fields.is_active = is_active;
    await room.update(fields);
    return res.json(successResponse({ room }, 'Room updated'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to update room'));
  }
}

async function deleteRoom(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));
    const deleted = await Room.destroy({ where: { id: req.params.id, school_id: school.id } });
    if (!deleted) return res.status(404).json(errorResponse('Room not found'));
    return res.json(successResponse({}, 'Room deleted'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to delete room'));
  }
}

async function deleteTeacherAssignment(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));
    // Soft-delete (matches getTeacherAssignments, which lists is_active: true only).
    const assignment = await Assignment.findOne({ where: { id: req.params.id, school_id: school.id } });
    if (!assignment) return res.status(404).json(errorResponse('Assignment not found'));
    await assignment.update({ is_active: false });
    return res.json(successResponse({}, 'Assignment removed'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to remove assignment'));
  }
}

async function promoteStudent(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));
    const { classroom_id, academic_year_id } = req.body;
    if (!classroom_id) return res.status(400).json(errorResponse('classroom_id is required'));
    const student = await Student.findOne({ where: { id: req.params.id, school_id: school.id } });
    if (!student) return res.status(404).json(errorResponse('Student not found'));
    // Validate the target class belongs to this school (no cross-tenant moves).
    const cls = await Class.findOne({ where: { id: classroom_id, school_id: school.id }, attributes: ['id'] });
    if (!cls) return res.status(400).json(errorResponse('Invalid target class'));
    const fields = { classroom_id };
    if (academic_year_id) fields.academic_year_id = academic_year_id;
    await student.update(fields);
    // Grades live in separate rows keyed by student/subject/term, so changing the
    // student's class preserves their existing grades automatically.
    return res.json(successResponse({ student: { id: student.id, classroom_id: student.classroom_id } }, 'Student promoted'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse('Failed to promote student'));
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

    const totalAttendance = await Attendance.count({ where: { school_id: school.id } });
    const presentCount = await Attendance.count({ where: { school_id: school.id, status: 'present' } });
    const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

    const grades = await Grade.findAll({ where: { school_id: school.id, approval_status: 'approved' }, attributes: ['total'] });
    const avgPerformance = grades.length > 0 ? Math.round(grades.reduce((sum, g) => sum + (g.total || 0), 0) / grades.length) : 0;

    return res.json(successResponse({
      total_students: students,
      total_teachers: teachers,
      active_classes: classes,
      attendance_rate: attendanceRate,
      avg_performance: avgPerformance,
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

    const totalCollected = await Payment.sum('amount', { where: { school_id: school.id, status: 'completed' } }) || 0;
    const totalDue = await Fee.sum('amount_due', { where: { school_id: school.id } }) || 0;
    const totalPaid = await Fee.sum('amount_paid', { where: { school_id: school.id } }) || 0;
    const totalExpenses = await Expense.sum('amount', { where: { school_id: school.id, status: 'approved' } }) || 0;

    return res.json(successResponse({
      total_collected: totalCollected,
      outstanding_balance: totalDue - totalPaid,
      expenses: totalExpenses,
      balance: totalCollected - totalExpenses,
    }));
  } catch (err) {
    return res.status(500).json(errorResponse('Failed to fetch finance stats'));
  }
}

async function getFinanceFees(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const feeCategories = await FeeCategory.findAll({
      where: { school_id: school.id, is_active: true },
      order: [['name', 'ASC']],
    });

    return res.json(successResponse({
      fees: feeCategories.map(fc => ({ id: fc.id, name: fc.name, amount: fc.amount, frequency: fc.frequency })),
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
    // Recorded expenses start PENDING and require approval (principal/school_admin) —
    // no self-approval. See financeController.reviewExpense for the approval endpoint.
    const expense = await Expense.create({
      school_id: school.id,
      description,
      amount,
      category,
      date: date || new Date(),
      created_by: req.user.id,
      status: 'pending',
    });
    await appendSecurityAuditLog({
      type: 'expense_recorded',
      severity: 'info',
      actor: req.user?.username || String(req.user?.id || 'unknown'),
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '—',
      action: `Expense #${expense.id} recorded (amount ${expense.amount}, school ${school.id}) by ${req.user?.role || 'unknown'}`,
      metadata: { expense_id: expense.id, school_id: school.id, amount: expense.amount, category: expense.category },
    });
    return res.json(successResponse({
      expense: { id: expense.id, description: expense.description, amount: expense.amount, category: expense.category, date: expense.date, status: expense.status }
    }, 'Expense recorded — pending approval'));
  } catch (err) {
    return res.status(500).json(errorResponse('Failed to record expense'));
  }
}

async function getExpenses(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const expenses = await Expense.findAll({
      where: { school_id: school.id },
      order: [['date', 'DESC']],
      limit: 100,
    });

    return res.json(successResponse({ expenses: expenses.map(e => ({ id: e.id, description: e.description, amount: e.amount, category: e.category, date: e.date, status: e.status })) }));
  } catch (err) {
    return res.status(500).json(errorResponse('Failed to fetch expenses'));
  }
}

/* ================= PLACEHOLDER ENDPOINTS ================= */
async function getTeacherAssignments(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));
    const assignments = await Assignment.findAll({
      where: { school_id: school.id, is_active: true },
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name'] },
        { model: Class, as: 'class', attributes: ['id', 'name'] },
        { model: Teacher, as: 'teacher', attributes: ['id'], include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }] }
      ],
      order: [['created_at', 'DESC']],
    });
    return res.json(successResponse({ assignments: assignments.map(a => ({ id: a.id, title: a.title, subject: a.subject, class: a.class, teacher: a.teacher, dueDate: a.due_date })) }));
  } catch (err) {
    return res.status(500).json(errorResponse('Failed to fetch assignments'));
  }
}

async function createTeacherAssignment(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));
    const { title, description, class_id, subject_id, teacher_id, due_date, max_score } = req.body;
    // Tenant guards: any referenced class/subject/teacher must belong to THIS school.
    if (class_id) { const c = await Class.findOne({ where: { id: class_id, school_id: school.id }, attributes: ['id'] }); if (!c) return res.status(400).json(errorResponse('Invalid class for this school')); }
    if (subject_id) { const s = await Subject.findOne({ where: { id: subject_id, school_id: school.id }, attributes: ['id'] }); if (!s) return res.status(400).json(errorResponse('Invalid subject for this school')); }
    if (teacher_id) { const t = await Teacher.findOne({ where: { id: teacher_id, school_id: school.id }, attributes: ['id'] }); if (!t) return res.status(400).json(errorResponse('Invalid teacher for this school')); }
    const assignment = await Assignment.create({
      school_id: school.id, title, description, class_id, subject_id, teacher_id, due_date, max_score, is_active: true,
    });
    return res.json(successResponse({ assignment: { id: assignment.id, title: assignment.title } }, 'Assignment created'));
  } catch (err) {
    return res.status(500).json(errorResponse('Failed to create assignment'));
  }
}

async function getExamOfficers(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    // Return ALL teachers (the UI splits officers vs non-officers itself), each with
    // a display name/email from the linked User, under the `teachers` key the UI reads.
    const rows = await Teacher.findAll({
      where: { school_id: school.id },
      include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name', 'email'] }],
    });
    const teachers = rows.map((t) => ({
      id: t.id,
      employee_id: t.employee_id,
      is_examination_officer: t.is_examination_officer,
      name: `${t.user?.first_name || ''} ${t.user?.last_name || ''}`.trim() || t.employee_id || `Teacher #${t.id}`,
      email: t.user?.email || null,
    }));
    return res.json(successResponse({ teachers }));
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
    const messages = await Message.findAll({
      where: { school_id: school.id },
      order: [['created_at', 'DESC']],
      limit: 100,
    });
    return res.json(successResponse({ messages: messages.map(m => ({ id: m.id, subject: m.subject, senderType: m.sender_type, recipientType: m.recipient_type, isRead: m.is_read, createdAt: m.created_at })) }));
  } catch (err) {
    return res.status(500).json(errorResponse('Failed to fetch messages'));
  }
}

async function sendMessage(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));
    const { audience, role, user_ids, title, message } = req.body;
    if (audience === 'all') {
      await Notification.create({ school_id: school.id, title, message, type: 'announcement', is_read: false });
    } else if (role) {
      const users = await User.findAll({ where: { role: { [Op.in]: Array.isArray(role) ? role : [role] } } });
      for (const u of users) {
        await Notification.create({ school_id: school.id, user_id: u.id, title, message, type: 'announcement', is_read: false });
      }
    } else if (user_ids && user_ids.length) {
      for (const uid of user_ids) {
        await Notification.create({ school_id: school.id, user_id: uid, title, message, type: 'direct', is_read: false });
      }
    }
    return res.json(successResponse({ message: { title, audience, role, recipientCount: user_ids ? user_ids.length : 'all' } }, 'Message sent'));
  } catch (err) {
    return res.status(500).json(errorResponse('Failed to send message'));
  }
}

async function createParent(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { first_name, last_name, email, phone, password, student_ids, relationship } = req.body;
    if (!phone) return res.status(400).json(errorResponse('Phone number is required'));

    const username = email || `parent_${Date.now()}`;
    const hashedPassword = await bcrypt.hash(password || 'Parent@123', 10);
    const parentRoleId = await requireRoleId('parent');

    const user = await User.create({
      username,
      password: hashedPassword,
      email: email || null,
      first_name,
      last_name,
      is_active: true,
      role_id: parentRoleId,
    }, { transaction });

    if (student_ids && student_ids.length) {
      const CoGuardian = require('../models/CoGuardian');
      for (const sid of student_ids) {
        const updateFields = {};
        if (relationship === 'father') {
          updateFields.father_phone = phone;
          updateFields.father_name = `${first_name} ${last_name}`.trim();
          if (email) updateFields.father_email = email;
        } else if (relationship === 'mother') {
          updateFields.mother_phone = phone;
          updateFields.mother_name = `${first_name} ${last_name}`.trim();
          if (email) updateFields.mother_email = email;
        } else {
          updateFields.emergency_phone = phone;
          updateFields.emergency_name = `${first_name} ${last_name}`.trim();
        }
        await Student.update(updateFields, { where: { id: sid, school_id: school.id }, transaction });
        await CoGuardian.create({
          school_id: school.id,
          student_id: sid,
          guardian_user_id: user.id,
          relationship: relationship || 'guardian',
          status: 'active',
        }, { transaction });
      }
    }

    await Notification.create({
      school_id: school.id,
      title: 'New Parent Account',
      message: `Parent account created for ${first_name} ${last_name}`,
      type: 'info',
      is_read: false,
    }, { transaction });

    await transaction.commit();
    return res.json(successResponse({ parent: { id: user.id, name: `${first_name} ${last_name}`.trim(), phone } }, 'Parent created'));
  } catch (err) {
    await transaction.rollback();
    console.error('createParent Error:', err);
    return res.status(400).json(errorResponse(`Failed to create parent`));
  }
}

/* ================= PLACEHOLDER ENDPOINTS ================= */
async function getExamOfficers(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    // Return ALL teachers (the UI splits officers vs non-officers itself), each with
    // a display name/email from the linked User, under the `teachers` key the UI reads.
    const rows = await Teacher.findAll({
      where: { school_id: school.id },
      include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name', 'email'] }],
    });
    const teachers = rows.map((t) => ({
      id: t.id,
      employee_id: t.employee_id,
      is_examination_officer: t.is_examination_officer,
      name: `${t.user?.first_name || ''} ${t.user?.last_name || ''}`.trim() || t.employee_id || `Teacher #${t.id}`,
      email: t.user?.email || null,
    }));
    return res.json(successResponse({ teachers }));
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
    const messages = await Message.findAll({
      where: { school_id: school.id },
      order: [['created_at', 'DESC']],
      limit: 100,
    });
    return res.json(successResponse({ messages: messages.map(m => ({ id: m.id, subject: m.subject, senderType: m.sender_type, recipientType: m.recipient_type, isRead: m.is_read, createdAt: m.created_at })) }));
  } catch (err) {
    return res.status(500).json(errorResponse('Failed to fetch messages'));
  }
}

async function sendMessage(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { title, message, type, audience, user_ids, role } = req.body;
    if (!title || !message) return res.status(400).json(errorResponse('Title and message are required'));

    let count = 0;

    if (audience === 'all' || audience === 'school') {
      await Notification.create({
        school_id: school.id,
        title,
        message,
        type: type || 'info',
        is_read: false,
      });
      count = 1;
    } else if (role) {
      // The User table has no school_id — resolve recipients WITHIN this school via
      // the role-specific tables (parents link via the school's students). This
      // replaces an unscoped `User.findAll` by role that would have notified users
      // across ALL schools (cross-tenant leak).
      let recipientUserIds = [];
      if (role === 'teacher') {
        recipientUserIds = (await Teacher.findAll({ where: { school_id: school.id }, attributes: ['user_id'] })).map(r => r.user_id);
      } else if (role === 'student') {
        recipientUserIds = (await Student.findAll({ where: { school_id: school.id }, attributes: ['user_id'] })).map(r => r.user_id);
      } else if (role === 'principal') {
        recipientUserIds = (await CorePrincipal.findAll({ where: { school_id: school.id }, attributes: ['user_id'] })).map(r => r.user_id);
      } else if (role === 'bursar') {
        recipientUserIds = (await CoreBursar.findAll({ where: { school_id: school.id }, attributes: ['user_id'] })).map(r => r.user_id);
      } else if (role === 'school_admin' || role === 'schooladmin') {
        recipientUserIds = (await SchoolAdmin.findAll({ where: { school_id: school.id }, attributes: ['user_id'] })).map(r => r.user_id);
      } else if (role === 'parent') {
        const studs = await Student.findAll({ where: { school_id: school.id }, attributes: ['id'] });
        if (studs.length) {
          const links = await StudentParent.findAll({ where: { student_id: studs.map(s => s.id) }, attributes: ['parent_id'] });
          const parentIds = [...new Set(links.map(l => l.parent_id))];
          if (parentIds.length) {
            recipientUserIds = (await Parent.findAll({ where: { id: parentIds }, attributes: ['user_id'] })).map(r => r.user_id);
          }
        }
      }
      recipientUserIds = [...new Set(recipientUserIds.filter(Boolean))];
      for (const uid of recipientUserIds) {
        await Notification.create({
          school_id: school.id,
          user_id: uid,
          title,
          message,
          type: type || 'info',
          is_read: false,
        });
        count++;
      }
    } else if (user_ids && user_ids.length) {
      for (const uid of user_ids) {
        await Notification.create({
          school_id: school.id,
          user_id: uid,
          title,
          message,
          type: type || 'info',
          is_read: false,
        });
        count++;
      }
    }

    return res.json(successResponse({ count }, `Notification sent to ${count} recipient(s)`));
  } catch (err) {
    console.error('sendMessage Error:', err);
    return res.status(500).json(errorResponse('Failed to send message'));
  }
}

async function recordClassAttendance(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { class_id, date, records } = req.body;
    if (!class_id || !date || !records || !records.length) {
      return res.status(400).json(errorResponse('class_id, date, and records are required'));
    }

    let count = 0;
    for (const r of records) {
      await Attendance.upsert({
        school_id: school.id,
        student_id: r.student_id,
        classroom_id: class_id,
        date,
        status: r.status || 'present',
        remarks: r.remarks || null,
      }, {
        conflictFields: ['school_id', 'student_id', 'date'],
        transaction,
      });
      count++;
    }

    await transaction.commit();
    return res.json(successResponse({ count }, `Attendance recorded for ${count} student(s)`));
  } catch (err) {
    await transaction.rollback();
    console.error('recordClassAttendance Error:', err);
    return res.status(500).json(errorResponse(`Failed to record attendance`));
  }
}

/* Period N (1-based) → { start, end } as 'HH:MM', 60-min periods from 08:00. */
function timetablePeriodTime(p) {
  const startMin = 8 * 60 + (p - 1) * 60;
  const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return { start: fmt(startMin), end: fmt(startMin + 60) };
}

/* GET /api/school/timetable/?class_id= — persisted slots for the manager grid. */
async function getSchoolTimetable(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));
    const TimetableSlot = require('../models/TimetableSlot');
    const where = { school_id: school.id };
    if (req.query.class_id) where.class_id = req.query.class_id;
    const slots = await TimetableSlot.findAll({ where, order: [['day', 'ASC'], ['period', 'ASC']] });

    const subjectIds = [...new Set(slots.map(s => s.subject_id).filter(Boolean))];
    const teacherIds = [...new Set(slots.map(s => s.teacher_id).filter(Boolean))];
    const subjects = subjectIds.length ? await Subject.findAll({ where: { id: subjectIds }, attributes: ['id', 'name'] }) : [];
    const subjectName = Object.fromEntries(subjects.map(s => [String(s.id), s.name]));
    const teachers = teacherIds.length ? await Teacher.findAll({ where: { id: teacherIds }, include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }] }) : [];
    const teacherName = Object.fromEntries(teachers.map(t => [String(t.id), `${t.user?.first_name || ''} ${t.user?.last_name || ''}`.trim()]));

    const out = slots.map(s => ({
      id: s.id, class_id: s.class_id, day: s.day, period: s.period,
      subject_id: s.subject_id,
      subject: s.is_break ? 'Break' : (subjectName[String(s.subject_id)] || 'Free'),
      teacher: teacherName[String(s.teacher_id)] || '',
      room: s.room || '', start_time: s.start_time, end_time: s.end_time, is_break: !!s.is_break,
    }));
    const periodsPerDay = slots.reduce((m, s) => Math.max(m, s.period), 0);
    const breakPeriods = [...new Set(slots.filter(s => s.is_break).map(s => s.period))].sort((a, b) => a - b);
    return res.json(successResponse({ slots: out, periods_per_day: periodsPerDay, break_periods: breakPeriods }));
  } catch (err) {
    console.error('getSchoolTimetable Error:', err);
    return res.status(500).json(errorResponse('Failed to load timetable'));
  }
}

/* POST /api/school/timetable/generate/ — greedy constraint-aware solver that
   PERSISTS a weekly timetable for every active class in the school. */
async function generateTimetable(req, res) {
  const t = await sequelize.transaction();
  try {
    const school = await getSchoolFromUser(req);
    if (!school) { await t.rollback(); return res.status(401).json(errorResponse('Not authenticated')); }
    const TimetableSlot = require('../models/TimetableSlot');

    const ppd = Math.min(12, Math.max(1, parseInt(req.body.periods_per_day, 10) || 8));
    const maxTeacherPerDay = Math.max(1, parseInt(req.body.max_teacher_per_day, 10) || 5);
    const breakSet = new Set((Array.isArray(req.body.break_periods) ? req.body.break_periods : [])
      .map(n => parseInt(n, 10)).filter(n => n >= 1 && n <= ppd));
    const teachingPeriods = [];
    for (let p = 1; p <= ppd; p++) if (!breakSet.has(p)) teachingPeriods.push(p);

    const classes = await Class.findAll({ where: { school_id: school.id, is_active: true }, attributes: ['id', 'name', 'room'] });
    const classIds = classes.map(c => c.id);
    if (classIds.length === 0) { await t.rollback(); return res.status(400).json(errorResponse('No active classes to schedule. Add classes first.')); }

    const classSubjects = await ClassSubject.findAll({ where: { class_id: classIds }, attributes: ['class_id', 'subject_id', 'teacher_id'] });
    const subjectsByClass = {};
    classSubjects.forEach(cs => {
      (subjectsByClass[cs.class_id] = subjectsByClass[cs.class_id] || []).push({ subject_id: cs.subject_id, teacher_id: cs.teacher_id });
    });

    const days = [0, 1, 2, 3, 4];
    const teacherBusy = new Map(); // `${day}-${period}` -> Set(teacher_id) (no double-booking across classes)
    const teacherDay = new Map();  // `${teacher_id}-${day}` -> count (cap at maxTeacherPerDay)
    const slotsToCreate = [];
    let placed = 0, repaired = 0, skipped = 0, attempted = 0;

    for (const cls of classes) {
      // Persist break rows so students/teachers see them too.
      for (const day of days) {
        for (const p of breakSet) {
          const { start, end } = timetablePeriodTime(p);
          slotsToCreate.push({ school_id: school.id, class_id: cls.id, day, period: p, subject_id: null, teacher_id: null, start_time: start, end_time: end, room: cls.room || null, is_break: true });
        }
      }
      const subs = subjectsByClass[cls.id] || [];
      if (subs.length === 0) continue;
      let rot = 0;
      for (const day of days) {
        for (const p of teachingPeriods) {
          attempted++;
          let chosen = null, hadToSkipFirst = false;
          for (let k = 0; k < subs.length; k++) {
            const cand = subs[(rot + k) % subs.length];
            const tid = cand.teacher_id;
            if (tid) {
              const busy = teacherBusy.get(`${day}-${p}`);
              if (busy && busy.has(tid)) { hadToSkipFirst = true; continue; }
              if ((teacherDay.get(`${tid}-${day}`) || 0) >= maxTeacherPerDay) { hadToSkipFirst = true; continue; }
            }
            chosen = cand; rot = (rot + k + 1) % subs.length; break;
          }
          if (!chosen) { skipped++; continue; }
          if (hadToSkipFirst) repaired++;
          if (chosen.teacher_id) {
            if (!teacherBusy.has(`${day}-${p}`)) teacherBusy.set(`${day}-${p}`, new Set());
            teacherBusy.get(`${day}-${p}`).add(chosen.teacher_id);
            teacherDay.set(`${chosen.teacher_id}-${day}`, (teacherDay.get(`${chosen.teacher_id}-${day}`) || 0) + 1);
          }
          const { start, end } = timetablePeriodTime(p);
          slotsToCreate.push({ school_id: school.id, class_id: cls.id, day, period: p, subject_id: chosen.subject_id, teacher_id: chosen.teacher_id || null, start_time: start, end_time: end, room: cls.room || null, is_break: false });
          placed++;
        }
      }
    }

    await TimetableSlot.destroy({ where: { class_id: classIds }, transaction: t });
    if (slotsToCreate.length) await TimetableSlot.bulkCreate(slotsToCreate, { transaction: t });
    await t.commit();
    return res.json(successResponse({
      total_slots: placed, repaired, skipped, attempted,
      periods_per_day: ppd, break_periods: [...breakSet].sort((a, b) => a - b),
    }, `Timetable generated — ${placed} periods placed across ${classes.length} class(es).`));
  } catch (err) {
    await t.rollback();
    console.error('generateTimetable Error:', err);
    return res.status(500).json(errorResponse('Failed to generate timetable'));
  }
}

/* DELETE /api/school/timetable/?class_id= — clear a class's (or the whole
   school's) persisted timetable. */
async function deleteTimetable(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));
    const TimetableSlot = require('../models/TimetableSlot');
    const where = { school_id: school.id };
    if (req.query.class_id) where.class_id = req.query.class_id;
    const deleted = await TimetableSlot.destroy({ where });
    return res.json(successResponse({ deleted }, 'Timetable cleared'));
  } catch (err) {
    console.error('deleteTimetable Error:', err);
    return res.status(500).json(errorResponse('Failed to delete timetable'));
  }
}

async function reviewModificationRequest(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));
    const { request_id, action, comment } = req.body;
    const modRequest = await ModificationRequest.findOne({ where: { id: request_id, school_id: school.id } });
    if (!modRequest) return res.status(404).json(errorResponse('Request not found'));
    // NOTE (Phase 0): now role-gated (school_admin/superadmin) by the school router's
    // write guard. This still only flips status — it does NOT yet apply `requested_value`
    // to the target grade or emit a GradeEvent. The approve→apply step (with
    // appendGradeEvent) is a Phase 2 correctness fix; see
    // EK_SMS/schoolAdminUIFix/02-security-and-risks.md (#4). Until then, approving
    // records the decision only.
    const newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : modRequest.status;
    await modRequest.update({ status: newStatus, reviewed_by: req.user.id, reviewed_at: new Date() });
    return res.json(successResponse({ request: { id: modRequest.id, status: modRequest.status } }, `Request ${newStatus}`));
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
    return res.status(400).json(errorResponse(`Failed to update teacher`));
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
          include: [{ model: User, as: 'user', attributes: ['username', 'first_name', 'last_name', 'email'] }],
        })
      : [];
    const teacherMap = {};
    teachers.forEach(t => {
      teacherMap[t.id] = {
        id: t.id,
        name: `${t.user?.first_name || ''} ${t.user?.last_name || ''}`.trim() || t.user?.username || 'Teacher',
        email: t.user?.email || '',
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
    return res.status(500).json(errorResponse(`Failed to fetch syllabus topics`));
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
    return res.status(500).json(errorResponse(`Failed to create topic`));
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
    return res.status(500).json(errorResponse(`Failed to update topic`));
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
    return res.status(500).json(errorResponse(`Failed to delete topic`));
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
    return res.status(500).json(errorResponse(`Failed to fetch stats`));
  }
}

/* Reset a school user's password and (best-effort) email them the new credentials.
   Backs the "Resend Credentials" button. Tenant-scoped: the target user must belong
   to the caller's own school (verified via the role-specific record, or — for a
   parent — via a linked student in this school). */
async function resendCredentials(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const userId = req.body?.user_id;
    if (!userId) return res.status(400).json(errorResponse('user_id is required'));

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json(errorResponse('User not found'));

    let belongs =
      (await Teacher.findOne({ where: { user_id: userId, school_id: school.id }, attributes: ['id'] })) ||
      (await Student.findOne({ where: { user_id: userId, school_id: school.id }, attributes: ['id'] })) ||
      (await SchoolAdmin.findOne({ where: { user_id: userId, school_id: school.id }, attributes: ['id'] })) ||
      (await CoreBursar.findOne({ where: { user_id: userId, school_id: school.id }, attributes: ['id'] })) ||
      (await CorePrincipal.findOne({ where: { user_id: userId, school_id: school.id }, attributes: ['id'] }));

    if (!belongs) {
      const parent = await Parent.findOne({ where: { user_id: userId }, attributes: ['id'] });
      if (parent) {
        const links = await StudentParent.findAll({ where: { parent_id: parent.id }, attributes: ['student_id'] });
        if (links.length) {
          belongs = await Student.findOne({
            where: { id: links.map((l) => l.student_id), school_id: school.id }, attributes: ['id'],
          });
        }
      }
    }
    if (!belongs) return res.status(404).json(errorResponse('User is not part of your school'));

    // Fresh temporary password (guaranteed upper/lower/digit/symbol).
    const rand = require('crypto').randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    const newPassword = `Ek${rand}@9`;
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
    let roleName = 'user';
    try { roleName = (await Role.findByPk(user.role_id))?.name || 'user'; } catch {}

    let emailSent = false;
    try { emailSent = await sendPasswordResetEmail(user.email, displayName, roleName, newPassword); }
    catch (e) { console.error('resendCredentials email failed:', e.message); }

    try {
      await appendSecurityAuditLog({
        type: 'credentials_resent',
        severity: 'medium',
        actor: req.user?.username || String(req.user?.id || 'unknown'),
        ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '—',
        action: `Credentials reset for user #${userId} (${user.username}) in school ${school.id}; email ${emailSent ? 'sent' : 'not sent'}`,
      });
    } catch (e) { console.error('audit log failed:', e.message); }

    return res.json(successResponse(
      { email_sent: emailSent, username: user.username, password: newPassword },
      emailSent ? 'Credentials emailed to the user.' : 'Password reset — email not sent (no address or mail disabled).'
    ));
  } catch (err) {
    console.error('resendCredentials Error:', err);
    return res.status(500).json(errorResponse('Failed to reset credentials'));
  }
}

module.exports = {
  getSchoolInfo, updateSchoolInfo, checkSchoolName,
  getStudents, createStudent, updateStudent, getNextAdmissionNumber, getStudentStats, promoteStudent,
  getTeachers, createTeacher, updateTeacher, getTeacherStats,
  getClasses, getClassById, createClass, updateClass, deleteClass, bulkCreateClasses,
  assignStudentsToClass, assignSubjectsToClass,
  getSubjects, createSubject, updateSubject, deleteSubject,
  assignClassesToSubject, assignTeachersToSubject,
  getAcademicYears, createAcademicYear, getTerms, createTerm, updateTerm, deleteTerm, getSchoolContext,
  getGrades, saveGrades,
  recordAttendance,
  getGradingScheme, setGradingScheme,
  getRooms, createRoom, updateRoom, deleteRoom,
  getExams, createExam, deleteExam, getExamResults, saveExamResults,
  getNotifications, createNotification,
  getAnalytics,
  getFinanceStats, getFinanceFees, recordExpense, getExpenses,
  getTeacherAssignments, createTeacherAssignment, deleteTeacherAssignment,
  getExamOfficers, assignExamOfficer,
  getMessages, sendMessage, recordClassAttendance,
  createParent, resendCredentials,
  generateTimetable, deleteTimetable, getSchoolTimetable,
  reviewModificationRequest,
  getSyllabusTopics, createSyllabusTopic, updateSyllabusTopic, deleteSyllabusTopic, getSyllabusStats,
};
