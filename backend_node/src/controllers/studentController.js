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

async function getProfile(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student profile not found'));

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
      where: { student_id: student.id, approval_status: 'approved' },
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

    return res.json(successResponse({
      overallAverage: average,
      totalSubjects: grades.length,
      passed,
      failed: grades.length - passed,
    }));
  } catch (err) {
    console.error('getGradesSummary Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch grades summary`));
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

async function getRemedialPlan(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const grades = await Grade.findAll({
      where: { student_id: student.id, approval_status: 'approved' },
      include: [{ model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }],
    });

    const remedialSubjects = grades
      .filter(g => (g.total || 0) < 50)
      .map(g => ({
        subjectId: g.subject_id,
        subjectName: g.subject?.name || '',
        currentScore: g.total,
        gradeLetter: g.grade_letter,
        recommendation: g.total < 30 ? 'Intensive remedial required' : 'Targeted practice recommended',
        focusAreas: g.ca < (g.total * 0.2) ? 'Continuous assessment' : g.midterm < (g.total * 0.3) ? 'Midterm concepts' : 'Final exam preparation',
      }));

    return res.json(successResponse({
      plan: {
        studentId: student.id,
        subjects: remedialSubjects,
        generatedAt: new Date().toISOString(),
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

    const { subject_id, session_time } = req.body;
    const grade = await Grade.findOne({
      where: { student_id: student.id, subject_id },
      include: [{ model: Subject, as: 'subject', attributes: ['id', 'name'] }],
    });

    if (!grade) return res.status(404).json(errorResponse('Grade not found for this subject'));

    return res.json(successResponse({
      subject: grade.subject?.name,
      currentScore: grade.total,
      sessionTime: session_time,
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

    return res.json(successResponse({
      incident: {
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
    return res.status(500).json(errorResponse(`Failed to fetch notifications`));
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
    return res.status(500).json(errorResponse(`Failed to mark notification`));
  }
}

async function getTimetable(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const TimetableSlot = require('../models/TimetableSlot');
    const SubjectM = require('../models/Subject');
    const TeacherM = require('../models/Teacher');
    const UserM = require('../models/User');

    const empty = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] };
    if (!student.classroom_id) return res.json(successResponse({ timetable: empty }));

    const slots = await TimetableSlot.findAll({
      where: { class_id: student.classroom_id },
      order: [['day', 'ASC'], ['period', 'ASC']],
    });

    const subjectIds = [...new Set(slots.map(s => s.subject_id).filter(Boolean))];
    const teacherIds = [...new Set(slots.map(s => s.teacher_id).filter(Boolean))];
    const subjects = subjectIds.length ? await SubjectM.findAll({ where: { id: subjectIds }, attributes: ['id', 'name'] }) : [];
    const subjectName = Object.fromEntries(subjects.map(s => [String(s.id), s.name]));
    const teachers = teacherIds.length ? await TeacherM.findAll({ where: { id: teacherIds }, include: [{ model: UserM, as: 'user', attributes: ['first_name', 'last_name'] }] }) : [];
    const teacherName = Object.fromEntries(teachers.map(t => [String(t.id), `${t.user?.first_name || ''} ${t.user?.last_name || ''}`.trim()]));

    const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const PALETTE = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
    const colorBySubject = {};
    let ci = 0;
    const timetable = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] };

    slots.forEach(s => {
      const dayName = DAY_NAMES[s.day];
      if (!dayName) return;
      let color = '#94A3B8';
      if (!s.is_break && s.subject_id != null) {
        const key = String(s.subject_id);
        if (!(key in colorBySubject)) { colorBySubject[key] = PALETTE[ci % PALETTE.length]; ci++; }
        color = colorBySubject[key];
      }
      timetable[dayName].push({
        id: s.id,
        time: s.start_time || '',
        endTime: s.end_time || '',
        subject: s.is_break ? 'Break' : (subjectName[String(s.subject_id)] || 'Free Period'),
        teacher: s.is_break ? '' : (teacherName[String(s.teacher_id)] || ''),
        room: s.room || '',
        color,
        icon: s.is_break ? 'coffee' : 'menu_book',
        isBreak: !!s.is_break,
        link: null,
      });
    });

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

    const formatted = assignments.map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      dueDate: a.due_date,
      maxScore: a.max_score,
      subject: a.Subject,
      submission: submissionMap[a.id] || null,
      isSubmitted: !!submissionMap[a.id],
    }));

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

    const { assignment_id, content, attachment_path } = req.body;
    const assignment = await Assignment.findByPk(assignment_id);
    if (!assignment) return res.status(404).json(errorResponse('Assignment not found'));

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

    const threadMap = {};
    messages.forEach(m => {
      const tid = m.thread_id || 'general';
      if (!threadMap[tid]) {
        threadMap[tid] = { threadId: tid, messages: [], lastMessage: null };
      }
      threadMap[tid].messages.push({
        id: m.id,
        senderId: m.sender_id,
        senderType: m.sender_type,
        body: m.body,
        subject: m.subject,
        isRead: m.is_read,
        createdAt: m.created_at,
      });
      threadMap[tid].lastMessage = m.created_at;
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

    const { text, recipient_id, recipient_type, subject, thread_id } = req.body;
    const message = await Message.create({
      school_id: (req.schoolId || req.user.school_id),
      sender_id: student.user_id,
      sender_type: 'Student',
      recipient_id,
      recipient_type: recipient_type || 'Teacher',
      subject: subject || '',
      body: text,
      thread_id: thread_id || `conv-${student.id}-${Date.now()}`,
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
    });

    const insights = grades.map(g => ({
      subjectId: g.subject_id,
      subjectName: g.subject?.name || '',
      currentTotal: g.total,
      trend: 'stable',
      points: [],
    }));

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
    return res.status(500).json(errorResponse(`Failed to fetch 2FA setup`));
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
    return res.status(500).json(errorResponse(`Failed to enable 2FA`));
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
    return res.status(500).json(errorResponse(`Failed to disable 2FA`));
  }
}

async function getReportCards(req, res) {
  try {
    const student = await getStudentFromUser(req);
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const grades = await Grade.findAll({
      // Report cards become visible only once the principal PUBLISHES them
      // (publication implies prior approval; an edit un-publishes the grade).
      where: { student_id: student.id, is_published: true },
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        { model: Term, as: 'term', attributes: ['id', 'name'] },
      ],
      order: [['term_id', 'ASC']],
    });

    const termMap = {};
    grades.forEach(g => {
      const tid = g.term_id;
      if (!termMap[tid]) {
        termMap[tid] = { termId: tid, termName: g.term?.name || '', subjects: [], total: 0, count: 0 };
      }
      termMap[tid].subjects.push({
        subjectName: g.subject?.name || '',
        subjectCode: g.subject?.code || '',
        ca: g.ca,
        midterm: g.midterm,
        final: g.final,
        total: g.total,
        gradeLetter: g.grade_letter,
        remarks: g.remarks,
      });
      termMap[tid].total += g.total || 0;
      termMap[tid].count += 1;
    });

    const reportCards = Object.values(termMap).map(tc => ({
      ...tc,
      average: tc.count ? Math.round(tc.total / tc.count * 10) / 10 : 0,
    }));

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

    const { term_id } = req.params;
    const where = { student_id: student.id, is_published: true };
    if (term_id) where.term_id = term_id;

    const grades = await Grade.findAll({
      where,
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        { model: Term, as: 'term', attributes: ['id', 'name'] },
      ],
    });

    if (!grades.length) return res.status(404).json(errorResponse('Report card not found'));

    const u = student.user || {};
    const reportCard = {
      studentName: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
      studentNumber: student.admission_number,
      className: student.classroom?.name || '',
      term: grades[0].term?.name || '',
      subjects: grades.map(g => ({
        name: g.subject?.name || '',
        code: g.subject?.code || '',
        ca: g.ca,
        midterm: g.midterm,
        final: g.final,
        total: g.total,
        gradeLetter: g.grade_letter,
        remarks: g.remarks,
      })),
      average: Math.round(grades.reduce((s, g) => s + (g.total || 0), 0) / grades.length * 10) / 10,
    };

    return res.json(successResponse({ reportCard }, 'Report card generated'));
  } catch (err) {
    console.error('downloadReportCard Error:', err);
    return res.status(500).json(errorResponse(`Failed to download`));
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

    const count = await ForensicEvent.count({
      where: {
        [Op.or]: [
          { actor: String(student.user_id) },
          { metadata_json: { [Op.like]: `%${student.user_id}%` } },
        ],
        resolved: false,
      },
    });

    return res.json(successResponse({ count }));
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
    const followUpKey = `WB-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

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

    const { id, title, description, target_date, progress_pct } = req.body;
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
        date: { [Op.gte]: new Date() },
      },
      include: [
        { model: Teacher, as: 'teacher', attributes: ['id'] },
      ],
      order: [['date', 'ASC']],
    });

    const bookings = await OfficeHourBooking.findAll({
      where: { student_id: student.id },
    });
    const bookedIds = new Set(bookings.map(b => b.office_hour_id));

    const slots = officeHours.map(oh => ({
      id: oh.id,
      teacherId: oh.teacher_id,
      date: oh.date,
      startTime: oh.start_time,
      endTime: oh.end_time,
      slotDuration: oh.slot_duration_minutes,
      maxBookings: oh.max_bookings,
      isBooked: bookedIds.has(oh.id),
    }));

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

    const { office_hour_id, notes } = req.body;
    const officeHour = await OfficeHour.findByPk(office_hour_id);
    if (!officeHour) return res.status(404).json(errorResponse('Office hour not found'));

    const existing = await OfficeHourBooking.findOne({
      where: { office_hour_id, student_id: student.id },
    });
    if (existing) return res.status(400).json(errorResponse('Already booked this slot'));

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

    const { booking_id } = req.params;
    const booking = await OfficeHourBooking.findOne({
      where: { id: booking_id, student_id: student.id },
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

    const { group_id } = req.body;
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

    const { group_id } = req.params;
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

    return res.json(successResponse({
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

    const { title, file_path, file_type } = req.body;
    const document = await Document.create({
      school_id: (req.schoolId || req.user.school_id),
      student_id: student.id,
      title,
      file_path,
      file_type,
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

    const { resource_id } = req.body;
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

    const formatted = liveClasses.map(lc => ({
      id: lc.id,
      title: lc.title,
      description: lc.description,
      meetingUrl: lc.meeting_url,
      scheduledAt: lc.scheduled_at,
      durationMinutes: lc.duration_minutes,
      subject: lc.subject,
    }));

    return res.json(successResponse({ liveClasses: formatted }));
  } catch (err) {
    console.error('listLiveClasses Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch live classes`));
  }
}

async function createLiveClass(req, res) {
  try {
    const { title, description, meeting_url, scheduled_at, duration_minutes, class_id, subject_id } = req.body;
    const liveClass = await LiveClass.create({
      school_id: (req.schoolId || req.user.school_id),
      teacher_id: req.user.id,
      title,
      description,
      meeting_url,
      scheduled_at,
      duration_minutes,
      class_id,
      subject_id,
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
    await liveClass.update(req.body);
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
