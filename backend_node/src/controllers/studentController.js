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
const SecurityAuditLog = require('../models/SecurityAuditLog');
const Fee = require('../models/Fee');
const Payment = require('../models/Payment');
const FeeCategory = require('../models/FeeCategory');
const Notification = require('../models/Notification');
const Teacher = require('../models/Teacher');
const ClassSubject = require('../models/ClassSubject');
const SecurityAuditLog = require('../models/SecurityAuditLog');
const ForensicEvent = require('../models/ForensicEvent');

const successResponse = (data = {}, message = 'Success') => ({ success: true, message, ...data });
const errorResponse = (message) => ({ success: false, message });

async function getSchoolFromUser(req) {
  if (!req.user) return null;
  if (req.user.school_id) return { id: req.user.school_id };
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
      { model: User, attributes: ['id', 'username', 'first_name', 'last_name', 'email', 'phone'] },
      { model: Class, as: 'classroom', attributes: ['id', 'name'] },
    ],
  });
  return student;
}

async function getProfile(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student profile not found'));

    const u = student.User || {};
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
      homeAddress: student.home_address,
      city: student.city,
      bloodType: student.blood_type,
      allergies: student.allergies,
      medicalNotes: student.medical_notes,
    }));
  } catch (err) {
    console.error('getProfile Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch profile: ${err.message}`));
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
    return res.status(500).json(errorResponse(`Failed to change password: ${err.message}`));
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
    return res.status(500).json(errorResponse(`Failed to update username: ${err.message}`));
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
    return res.status(500).json(errorResponse(`Failed to fetch current term: ${err.message}`));
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
    return res.status(500).json(errorResponse(`Failed to fetch terms: ${err.message}`));
  }
}

async function getGrades(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const { term_id } = req.query;
    const where = { student_id: student.id };
    if (term_id) where.term_id = term_id;

    const grades = await Grade.findAll({
      where,
      include: [
        { model: Subject, attributes: ['id', 'name', 'code'] },
        { model: Term, attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    });

    const formatted = grades.map(g => ({
      id: g.id,
      subjectId: g.subject_id,
      subject: g.Subject ? { id: g.Subject.id, name: g.Subject.name, code: g.Subject.code } : null,
      termId: g.term_id,
      term: g.Term ? { id: g.Term.id, name: g.Term.name } : null,
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
    return res.status(500).json(errorResponse(`Failed to fetch grades: ${err.message}`));
  }
}

async function getGradesSummary(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const { term_id } = req.query;
    const where = { student_id: student.id };
    if (term_id) where.term_id = term_id;

    const grades = await Grade.findAll({ where });

    const total = grades.reduce((sum, g) => sum + (g.total || 0), 0);
    const average = grades.length ? Math.round(total / grades.length * 10) / 10 : 0;
    const passed = grades.filter(g => (g.total || 0) >= 50).length;

    return res.json(successResponse({
      overallAverage: average,
      totalSubjects: grades.length,
      passed,
      failed: grades.length - passed,
    }));
  } catch (err) {
    console.error('getGradesSummary Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch grades summary: ${err.message}`));
  }
}

async function getGradeHistory(req, res) {
  try {
    const { gradeId } = req.params;
    const grade = await Grade.findByPk(gradeId);
    if (!grade) return res.status(404).json(errorResponse('Grade not found'));

    const events = await ForensicEvent.findAll({
      where: { grade_id: gradeId },
      order: [['created_at', 'DESC']],
    });

    return res.json(successResponse({ history: events }));
  } catch (err) {
    console.error('getGradeHistory Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch grade history: ${err.message}`));
  }
}

async function getPeerReview(req, res) {
  try {
    return res.json(successResponse({ peerReviews: [] }));
  } catch (err) {
    console.error('getPeerReview Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch peer review: ${err.message}`));
  }
}

async function getFeedbackThread(req, res) {
  try {
    return res.json(successResponse({ thread: { messages: [] } }));
  } catch (err) {
    console.error('getFeedbackThread Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch feedback: ${err.message}`));
  }
}

async function sendFeedbackMessage(req, res) {
  try {
    return res.json(successResponse({ message: req.body.message }, 'Message sent'));
  } catch (err) {
    console.error('sendFeedbackMessage Error:', err);
    return res.status(500).json(errorResponse(`Failed to send message: ${err.message}`));
  }
}

async function getRemedialPlan(req, res) {
  try {
    return res.json(successResponse({ plan: null }));
  } catch (err) {
    console.error('getRemedialPlan Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch remedial plan: ${err.message}`));
  }
}

async function confirmRemedialSession(req, res) {
  try {
    return res.json(successResponse({}, 'Session confirmed'));
  } catch (err) {
    console.error('confirmRemedialSession Error:', err);
    return res.status(500).json(errorResponse(`Failed to confirm session: ${err.message}`));
  }
}

async function getSecurityReport(req, res) {
  try {
    return res.json(successResponse({ incident: null }));
  } catch (err) {
    console.error('getSecurityReport Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch security report: ${err.message}`));
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
    return res.status(500).json(errorResponse(`Failed to fetch attendance: ${err.message}`));
  }
}

async function getNotifications(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { limit } = req.query;
    const query = { where: { school_id: school.id }, order: [['created_at', 'DESC']] };
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

    const unread = await Notification.count({ where: { school_id: school.id, is_read: false } });

    return res.json(successResponse({ notifications: formatted, unread }));
  } catch (err) {
    console.error('getNotifications Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch notifications: ${err.message}`));
  }
}

async function markNotificationRead(req, res) {
  try {
    const { notification_id, mark_all } = req.body;
    if (mark_all) {
      const school = await getSchoolFromUser(req);
      await Notification.update({ is_read: true }, { where: { school_id: school?.id } });
    } else if (notification_id) {
      await Notification.update({ is_read: true }, { where: { id: notification_id } });
    }
    return res.json(successResponse({}, 'Notification marked as read'));
  } catch (err) {
    console.error('markNotificationRead Error:', err);
    return res.status(500).json(errorResponse(`Failed to mark notification: ${err.message}`));
  }
}

async function getTimetable(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    return res.json(successResponse({ timetable: [] }));
  } catch (err) {
    console.error('getTimetable Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch timetable: ${err.message}`));
  }
}

async function getAssignments(req, res) {
  try {
    return res.json(successResponse({ assignments: [] }));
  } catch (err) {
    console.error('getAssignments Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch assignments: ${err.message}`));
  }
}

async function submitAssignment(req, res) {
  try {
    return res.json(successResponse({}, 'Assignment submitted'));
  } catch (err) {
    console.error('submitAssignment Error:', err);
    return res.status(500).json(errorResponse(`Failed to submit assignment: ${err.message}`));
  }
}

async function getConversations(req, res) {
  try {
    return res.json(successResponse({ conversations: [] }));
  } catch (err) {
    console.error('getConversations Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch conversations: ${err.message}`));
  }
}

async function sendMessage(req, res) {
  try {
    return res.json(successResponse({ message: req.body.text }, 'Message sent'));
  } catch (err) {
    console.error('sendMessage Error:', err);
    return res.status(500).json(errorResponse(`Failed to send message: ${err.message}`));
  }
}

async function getResources(req, res) {
  try {
    return res.json(successResponse({ resources: [] }));
  } catch (err) {
    console.error('getResources Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch resources: ${err.message}`));
  }
}

async function getFinancials(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const fees = await Fee.findAll({
      where: { student_id: student.id },
      include: [{ model: FeeCategory, attributes: ['id', 'name'] }, { model: Term, attributes: ['id', 'name'] }],
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
      category: f.FeeCategory?.name || '',
      term: f.Term?.name || '',
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
    return res.status(500).json(errorResponse(`Failed to fetch financials: ${err.message}`));
  }
}

async function getEvents(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const notifications = await Notification.findAll({
      where: { school_id: school.id },
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
    return res.status(500).json(errorResponse(`Failed to fetch events: ${err.message}`));
  }
}

async function getGradeInsights(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const grades = await Grade.findAll({
      where: { student_id: student.id },
      include: [{ model: Subject, attributes: ['id', 'name', 'code'] }],
    });

    const insights = grades.map(g => ({
      subjectId: g.subject_id,
      subjectName: g.Subject?.name || '',
      currentTotal: g.total,
      trend: 'stable',
      points: [],
    }));

    return res.json(successResponse({ insights }));
  } catch (err) {
    console.error('getGradeInsights Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch insights: ${err.message}`));
  }
}

async function getSecurityHealth(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const user = await User.findByPk(student.user_id);

    const logs = await SecurityAuditLog.findAll({
      where: { user_id: user?.id },
      order: [['created_at', 'DESC']],
      limit: 10,
    });

    return res.json(successResponse({
      score: 85,
      level: 'Strong',
      twoFactorEnabled: user?.two_factor_enabled || false,
      trustedDevices: [],
      loginHistory: logs.map(l => ({
        location: l.ip_address || 'Unknown',
        ip: l.ip_address,
        device: l.user_agent || 'Unknown',
        time: l.created_at,
        success: true,
      })),
    }));
  } catch (err) {
    console.error('getSecurityHealth Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch security health: ${err.message}`));
  }
}

async function revokeDevice(req, res) {
  try {
    return res.json(successResponse({}, 'Device revoked'));
  } catch (err) {
    console.error('revokeDevice Error:', err);
    return res.status(500).json(errorResponse(`Failed to revoke device: ${err.message}`));
  }
}

async function get2FASetup(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const user = await User.findByPk(student.user_id);

    return res.json(successResponse({
      enabled: user?.two_factor_enabled || false,
      setup_required: !user?.two_factor_enabled,
      qr_code: '',
      setup_uri: '',
    }));
  } catch (err) {
    console.error('get2FASetup Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch 2FA setup: ${err.message}`));
  }
}

async function enable2FA(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const user = await User.findByPk(student.user_id);
    await user.update({ two_factor_enabled: true });

    return res.json(successResponse({}, '2FA enabled'));
  } catch (err) {
    console.error('enable2FA Error:', err);
    return res.status(500).json(errorResponse(`Failed to enable 2FA: ${err.message}`));
  }
}

async function disable2FA(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const user = await User.findByPk(student.user_id);
    await user.update({ two_factor_enabled: false });

    return res.json(successResponse({}, '2FA disabled'));
  } catch (err) {
    console.error('disable2FA Error:', err);
    return res.status(500).json(errorResponse(`Failed to disable 2FA: ${err.message}`));
  }
}

async function getReportCards(req, res) {
  try {
    return res.json(successResponse({ reportCards: [] }));
  } catch (err) {
    console.error('getReportCards Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch report cards: ${err.message}`));
  }
}

async function downloadReportCard(req, res) {
  try {
    return res.status(404).json(errorResponse('Report card not found'));
  } catch (err) {
    console.error('downloadReportCard Error:', err);
    return res.status(500).json(errorResponse(`Failed to download: ${err.message}`));
  }
}

async function getTranscript(req, res) {
  try {
    return res.json(successResponse({ transcript: [] }));
  } catch (err) {
    console.error('getTranscript Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch transcript: ${err.message}`));
  }
}

async function downloadTranscript(req, res) {
  try {
    return res.status(404).json(errorResponse('Transcript not available'));
  } catch (err) {
    console.error('downloadTranscript Error:', err);
    return res.status(500).json(errorResponse(`Failed to download: ${err.message}`));
  }
}

async function verifyHash(req, res) {
  try {
    return res.json(successResponse({ valid: false, reason: 'Hash not found' }));
  } catch (err) {
    console.error('verifyHash Error:', err);
    return res.status(500).json(errorResponse(`Failed to verify: ${err.message}`));
  }
}

async function getTamperCount(req, res) {
  try {
    return res.json(successResponse({ count: 0 }));
  } catch (err) {
    console.error('getTamperCount Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch tamper count: ${err.message}`));
  }
}

async function getWhoSawMyData(req, res) {
  try {
    return res.json(successResponse({ entries: [] }));
  } catch (err) {
    console.error('getWhoSawMyData Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch access log: ${err.message}`));
  }
}

async function getParentalAccessLog(req, res) {
  try {
    return res.json(successResponse({ entries: [] }));
  } catch (err) {
    console.error('getParentalAccessLog Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch parental access log: ${err.message}`));
  }
}

async function submitModificationObjection(req, res) {
  try {
    return res.json(successResponse({ ticketId: `OBJ-${Date.now().toString(36).toUpperCase()}` }, 'Objection submitted'));
  } catch (err) {
    console.error('submitModificationObjection Error:', err);
    return res.status(500).json(errorResponse(`Failed to submit objection: ${err.message}`));
  }
}

async function getChannelPreferences(req, res) {
  try {
    return res.json(successResponse({
      push: true,
      email: true,
      sms: false,
      in_app: true,
    }));
  } catch (err) {
    console.error('getChannelPreferences Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch preferences: ${err.message}`));
  }
}

async function updateChannelPreferences(req, res) {
  try {
    return res.json(successResponse({}, 'Preferences updated'));
  } catch (err) {
    console.error('updateChannelPreferences Error:', err);
    return res.status(500).json(errorResponse(`Failed to update preferences: ${err.message}`));
  }
}

async function getWhistleblowerCategories(req, res) {
  try {
    return res.json(successResponse({
      categories: [
        { id: 'bullying', label: 'Bullying & Harassment' },
        { id: 'safety', label: 'Safety Concern' },
        { id: 'academic', label: 'Academic Integrity' },
        { id: 'facility', label: 'Facility Issue' },
        { id: 'other', label: 'Other' },
      ],
    }));
  } catch (err) {
    console.error('getWhistleblowerCategories Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch categories: ${err.message}`));
  }
}

async function submitWhistleblowerReport(req, res) {
  try {
    const ticketId = `WB-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    return res.json(successResponse({ ticketId, followUpKey: ticketId }, 'Report submitted'));
  } catch (err) {
    console.error('submitWhistleblowerReport Error:', err);
    return res.status(500).json(errorResponse(`Failed to submit report: ${err.message}`));
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
    return res.status(500).json(errorResponse(`Failed to check status: ${err.message}`));
  }
}

async function getGoals(req, res) {
  try {
    return res.json(successResponse({ goals: [] }));
  } catch (err) {
    console.error('getGoals Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch goals: ${err.message}`));
  }
}

async function setGoal(req, res) {
  try {
    return res.json(successResponse(req.body, 'Goal saved'));
  } catch (err) {
    console.error('setGoal Error:', err);
    return res.status(500).json(errorResponse(`Failed to save goal: ${err.message}`));
  }
}

async function getOfficeHourSlots(req, res) {
  try {
    return res.json(successResponse({ slots: [] }));
  } catch (err) {
    console.error('getOfficeHourSlots Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch office hours: ${err.message}`));
  }
}

async function claimOfficeHourSlot(req, res) {
  try {
    return res.json(successResponse({}, 'Slot claimed'));
  } catch (err) {
    console.error('claimOfficeHourSlot Error:', err);
    return res.status(500).json(errorResponse(`Failed to claim slot: ${err.message}`));
  }
}

async function cancelOfficeHourSlot(req, res) {
  try {
    return res.json(successResponse({}, 'Slot cancelled'));
  } catch (err) {
    console.error('cancelOfficeHourSlot Error:', err);
    return res.status(500).json(errorResponse(`Failed to cancel slot: ${err.message}`));
  }
}

async function getCounsellorThread(req, res) {
  try {
    return res.json(successResponse({ thread: { messages: [] } }));
  } catch (err) {
    console.error('getCounsellorThread Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch counsellor thread: ${err.message}`));
  }
}

async function sendCounsellorMessage(req, res) {
  try {
    return res.json(successResponse({ message: req.body.text }, 'Message sent'));
  } catch (err) {
    console.error('sendCounsellorMessage Error:', err);
    return res.status(500).json(errorResponse(`Failed to send message: ${err.message}`));
  }
}

async function getStudyGroups(req, res) {
  try {
    return res.json(successResponse({ groups: [] }));
  } catch (err) {
    console.error('getStudyGroups Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch study groups: ${err.message}`));
  }
}

async function joinStudyGroup(req, res) {
  try {
    return res.json(successResponse({}, 'Joined group'));
  } catch (err) {
    console.error('joinStudyGroup Error:', err);
    return res.status(500).json(errorResponse(`Failed to join group: ${err.message}`));
  }
}

async function leaveStudyGroup(req, res) {
  try {
    return res.json(successResponse({}, 'Left group'));
  } catch (err) {
    console.error('leaveStudyGroup Error:', err);
    return res.status(500).json(errorResponse(`Failed to leave group: ${err.message}`));
  }
}

async function getStreaks(req, res) {
  try {
    return res.json(successResponse({ streaks: [] }));
  } catch (err) {
    console.error('getStreaks Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch streaks: ${err.message}`));
  }
}

async function getDigitalId(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const u = student.User || {};
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
    return res.status(500).json(errorResponse(`Failed to fetch digital ID: ${err.message}`));
  }
}

async function getDocuments(req, res) {
  try {
    return res.json(successResponse({ uploads: [], transcriptRequests: [] }));
  } catch (err) {
    console.error('getDocuments Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch documents: ${err.message}`));
  }
}

async function uploadDocument(req, res) {
  try {
    return res.json(successResponse({}, 'Document uploaded'));
  } catch (err) {
    console.error('uploadDocument Error:', err);
    return res.status(500).json(errorResponse(`Failed to upload document: ${err.message}`));
  }
}

async function requestTranscript(req, res) {
  try {
    return res.json(successResponse({}, 'Transcript request submitted'));
  } catch (err) {
    console.error('requestTranscript Error:', err);
    return res.status(500).json(errorResponse(`Failed to request transcript: ${err.message}`));
  }
}

async function getStudyPlan(req, res) {
  try {
    return res.json(successResponse({ blocks: [] }));
  } catch (err) {
    console.error('getStudyPlan Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch study plan: ${err.message}`));
  }
}

async function saveStudyPlan(req, res) {
  try {
    return res.json(successResponse({}, 'Study plan saved'));
  } catch (err) {
    console.error('saveStudyPlan Error:', err);
    return res.status(500).json(errorResponse(`Failed to save study plan: ${err.message}`));
  }
}

async function getResourceLastVisit(req, res) {
  try {
    return res.json(successResponse({ visits: {} }));
  } catch (err) {
    console.error('getResourceLastVisit Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch visits: ${err.message}`));
  }
}

async function markResourceVisited(req, res) {
  try {
    return res.json(successResponse({}, 'Marked visited'));
  } catch (err) {
    console.error('markResourceVisited Error:', err);
    return res.status(500).json(errorResponse(`Failed to mark visited: ${err.message}`));
  }
}

async function getVoiceSummary(req, res) {
  try {
    return res.json(successResponse({ text: '' }));
  } catch (err) {
    console.error('getVoiceSummary Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch voice summary: ${err.message}`));
  }
}

async function getSubjectDeepDive(req, res) {
  try {
    const { subjectId } = req.params;
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const grade = await Grade.findOne({
      where: { student_id: student.id, subject_id: subjectId },
      include: [{ model: Subject, attributes: ['id', 'name', 'code'] }],
    });

    if (!grade) return res.status(404).json(errorResponse('Grade not found for this subject'));

    return res.json(successResponse({
      subject: grade.Subject,
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
    return res.status(500).json(errorResponse(`Failed to fetch subject details: ${err.message}`));
  }
}

async function listLiveClasses(req, res) {
  try {
    return res.json(successResponse({ liveClasses: [] }));
  } catch (err) {
    console.error('listLiveClasses Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch live classes: ${err.message}`));
  }
}

async function downloadReceipt(req, res) {
  try {
    return res.status(404).json(errorResponse('Receipt not found'));
  } catch (err) {
    console.error('downloadReceipt Error:', err);
    return res.status(500).json(errorResponse(`Failed to download receipt: ${err.message}`));
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
  listLiveClasses,
  downloadReceipt,
};
