const { Op } = require('sequelize');
const sequelize = require('../config/db');
const Student = require('../models/Student');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Grade = require('../models/Grade');
const Term = require('../models/Term');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const SecurityAuditLog = require('../models/SecurityAuditLog');
const SchoolAdmin = require('../models/SchoolAdmin');
const { appendGradeEvent } = require('../utils/gradeEvent');

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

async function getOverview(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const studentsTotal = await Student.count({ where: { school_id: school.id, status: 'active' } });
    const teachersTotal = await Teacher.count({ where: { school_id: school.id, is_active: true } });
    const classroomsTotal = await Class.count({ where: { school_id: school.id } });

    const activeTerm = await Term.findOne({ where: { school_id: school.id, is_active: true } });

    const pendingGradeChanges = await Grade.count({
      where: { school_id: school.id, approval_status: 'pending' },
    });

    const reportCardsPending = 0;
    const reportCardsPublished = 0;

    return res.json(successResponse({
      school: { id: school.id },
      metrics: {
        students_total: studentsTotal,
        teachers_total: teachersTotal,
        classrooms_total: classroomsTotal,
        pending_grade_changes: pendingGradeChanges,
        report_cards_pending: reportCardsPending,
        report_cards_published: reportCardsPublished,
        active_term: activeTerm?.name || null,
      },
    }));
  } catch (err) {
    console.error('getOverview Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch overview`));
  }
}

async function listGradeApprovals(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { status, class_id, term_id } = req.query;
    const where = { school_id: school.id };
    if (status) where.approval_status = status;
    else where.approval_status = { [Op.in]: ['pending', 'rejected'] };
    if (class_id) where.classroom_id = class_id;
    if (term_id) where.term_id = term_id;

    const grades = await Grade.findAll({
      where,
      include: [
        { model: Student, as: 'student', include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }] },
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        { model: Term, as: 'term', attributes: ['id', 'name'] },
        { model: Class, as: 'classroom', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
      limit: 200,
    });

    const formatted = grades.map(g => ({
      id: g.id,
      student_id: g.student_id,
      student_name: g.student ? `${g.student.user?.first_name} ${g.student.user?.last_name}`.trim() : '',
      admission_number: g.student?.admission_number || '',
      subject_id: g.subject_id,
      subject_name: g.subject?.name || '',
      subject_code: g.subject?.code || '',
      term_id: g.term_id,
      term_name: g.term?.name || '',
      class_id: g.classroom_id,
      class_name: g.classroom?.name || '',
      ca: g.ca,
      midterm: g.midterm,
      final: g.final,
      total: g.total,
      grade_letter: g.grade_letter,
      remarks: g.remarks,
      approval_status: g.approval_status,
      approved_by: g.approved_by,
      approved_at: g.approved_at,
      created_at: g.created_at,
    }));

    const pending = await Grade.count({ where: { school_id: school.id, approval_status: 'pending' } });
    const approved = await Grade.count({ where: { school_id: school.id, approval_status: 'approved' } });
    const rejected = await Grade.count({ where: { school_id: school.id, approval_status: 'rejected' } });

    return res.json(successResponse({
      requests: formatted,
      counts: { pending, approved, rejected },
    }));
  } catch (err) {
    console.error('listGradeApprovals Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch approvals`));
  }
}

async function reviewGradeChange(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { grade_ids, action, comment } = req.body;
    if (!grade_ids || !grade_ids.length) return res.status(400).json(errorResponse('grade_ids are required'));
    if (!['approve', 'reject'].includes(action)) return res.status(400).json(errorResponse('Action must be approve or reject'));

    const ids = Array.isArray(grade_ids) ? grade_ids : [grade_ids];
    const grades = await Grade.findAll({
      where: { id: ids, school_id: school.id, approval_status: 'pending' },
    });

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    let count = 0;
    // Approve/reject + their audit events commit atomically: a mid-batch
    // failure rolls the whole review back rather than leaving a partial state.
    await sequelize.transaction(async (t) => {
      for (const g of grades) {
        await g.update({
          approval_status: newStatus,
          approved_by: req.user?.id || null,
          approved_at: new Date(),
        }, { transaction: t });

        await appendGradeEvent({
          grade_id: g.id, school_id: school.id, student_id: g.student_id,
          subject_id: g.subject_id, term_id: g.term_id,
          actor_user_id: req.user?.id, actor_name: req.user?.username,
          event_type: action, field: 'approval_status',
          old_value: 'pending', new_value: newStatus,
          approval_status_after: newStatus,
        }, { transaction: t });

        if (action === 'approve') {
          await Notification.create({
            school_id: school.id,
            title: 'Grade Approved',
            message: `Grade for ${g.Subject?.name || 'subject'} has been approved by the principal.`,
            type: 'info',
            is_read: false,
          }, { transaction: t });
        }

        count++;
      }
    });

    return res.json(successResponse({ count }, `${count} grade(s) ${action}d`));
  } catch (err) {
    console.error('reviewGradeChange Error:', err);
    return res.status(500).json(errorResponse(`Failed to review`));
  }
}

async function listReportCards(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const activeTerm = await Term.findOne({ where: { school_id: school.id, is_active: true } });

    const approvedGrades = await Grade.count({
      where: { school_id: school.id, approval_status: 'approved', term_id: activeTerm?.id || null },
    });

    const totalGrades = await Grade.count({
      where: { school_id: school.id, term_id: activeTerm?.id || null },
    });

    const grades = await Grade.findAll({
      where: { school_id: school.id, term_id: activeTerm?.id || null },
      include: [
        { model: Student, as: 'student', include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }] },
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
      ],
      order: [['created_at', 'DESC']],
      limit: 500,
    });

    const studentMap = {};
    for (const g of grades) {
      const sid = g.student_id;
      if (!studentMap[sid]) {
        studentMap[sid] = {
          student_id: sid,
          student_name: g.student ? `${g.student.user?.first_name} ${g.student.user?.last_name}`.trim() : '',
          admission_number: g.student?.admission_number || '',
          subjects: [],
          approved: true,
          published: true,
        };
      }
      studentMap[sid].subjects.push({
        id: g.id,
        subject_name: g.subject?.name || '',
        subject_code: g.subject?.code || '',
        ca: g.ca,
        midterm: g.midterm,
        final: g.final,
        total: g.total,
        grade_letter: g.grade_letter,
        remarks: g.remarks,
      });
      if (g.approval_status !== 'approved') {
        studentMap[sid].approved = false;
      }
      if (!g.is_published) {
        studentMap[sid].published = false;
      }
    }

    const reportCards = Object.values(studentMap);

    return res.json(successResponse({
      report_cards: reportCards,
      term: activeTerm?.name || null,
      term_id: activeTerm?.id || null,
      approved_count: approvedGrades,
      total_count: totalGrades,
    }));
  } catch (err) {
    console.error('listReportCards Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch report cards`));
  }
}

async function publishReportCard(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { student_ids, term_id } = req.body;
    if (!term_id) return res.status(400).json(errorResponse('term_id is required'));

    const term = await Term.findByPk(term_id);

    const ids = student_ids && student_ids.length ? student_ids : null;
    // Only approved grades can be published. Already-published rows are skipped.
    const where = { school_id: school.id, term_id, approval_status: 'approved', is_published: false };
    if (ids) where.student_id = { [Op.in]: ids };

    const now = new Date();
    const publishedStudents = new Set();

    await sequelize.transaction(async (t) => {
      const grades = await Grade.findAll({ where, transaction: t });
      for (const g of grades) {
        await g.update({ is_published: true, published_at: now, published_by: req.user?.id || null }, { transaction: t });
        publishedStudents.add(g.student_id);
        await appendGradeEvent({
          grade_id: g.id, school_id: school.id, student_id: g.student_id,
          subject_id: g.subject_id, term_id: g.term_id,
          actor_user_id: req.user?.id, actor_name: req.user?.username,
          event_type: 'publish', field: 'is_published',
          old_value: 'false', new_value: 'true', approval_status_after: 'approved',
        }, { transaction: t });
      }

      await Notification.create({
        school_id: school.id,
        title: 'Report Cards Published',
        message: `Report cards for ${term?.name || 'the selected term'} have been published and are now available.`,
        type: 'alert',
        is_read: false,
      }, { transaction: t });
    });

    return res.json(successResponse({ published_count: publishedStudents.size }, 'Report cards published'));
  } catch (err) {
    console.error('publishReportCard Error:', err);
    return res.status(500).json(errorResponse(`Failed to publish`));
  }
}

async function commentReportCard(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { grade_id, comment } = req.body;
    if (!grade_id || !comment) return res.status(400).json(errorResponse('grade_id and comment are required'));

    const grade = await Grade.findOne({ where: { id: grade_id, school_id: school.id } });
    if (!grade) return res.status(404).json(errorResponse('Grade not found'));

    const existingRemarks = grade.remarks || '';
    const timestamp = new Date().toISOString();
    const newRemark = `[${timestamp}] ${comment}`;
    const updatedRemarks = existingRemarks ? `${existingRemarks}\n${newRemark}` : newRemark;

    await grade.update({ remarks: updatedRemarks });

    return res.json(successResponse({ grade_id: grade.id }, 'Comment saved'));
  } catch (err) {
    console.error('commentReportCard Error:', err);
    return res.status(500).json(errorResponse(`Failed to save comment`));
  }
}

async function getPrincipalUsers(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const admins = await SchoolAdmin.findAll({
      where: { school_id: school.id },
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'first_name', 'last_name', 'email', 'phone'] }],
      order: [['created_at', 'DESC']],
    });

    const users = admins.map(a => ({
      id: a.id,
      full_name: `${a.user?.first_name || ''} ${a.user?.last_name || ''}`.trim() || a.user?.username,
      email: a.user?.email,
      phone: a.user?.phone,
      username: a.user?.username,
      is_active: a.is_active !== false,
      role: a.role || 'Principal',
      access_level: a.access_level || 'Full',
      created_at: a.created_at,
    }));

    return res.json(successResponse({ principal_users: users }));
  } catch (err) {
    console.error('getPrincipalUsers Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch principals`));
  }
}

async function createPrincipalUser(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { full_name, email, phone, username, password, role, access_level } = req.body;

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password || 'Principal@123', 10);
    const { requireRoleId } = require('../utils/roleIds');
    const principalRoleId = await requireRoleId('principal');

    const user = await User.create({
      username: username || email,
      email,
      phone,
      password: hashedPassword,
      first_name: full_name?.split(' ')[0] || '',
      last_name: full_name?.split(' ').slice(1).join(' ') || '',
      role_id: principalRoleId,
    });

    const admin = await SchoolAdmin.create({
      school_id: school.id,
      user_id: user.id,
      role: role || 'Principal',
      access_level: access_level || 'Full',
      is_active: true,
    });

    return res.json(successResponse({ id: admin.id }, 'Principal created'));
  } catch (err) {
    console.error('createPrincipalUser Error:', err);
    return res.status(500).json(errorResponse(`Failed to create principal`));
  }
}

async function updatePrincipalUser(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { id } = req.params;
    const admin = await SchoolAdmin.findOne({ where: { id, school_id: school.id } });
    if (!admin) return res.status(404).json(errorResponse('Principal not found'));

    const { full_name, email, phone, role, access_level, is_active } = req.body || {};
    const hasProfileChanges = [full_name, email, phone, role, access_level, is_active]
      .some(v => v !== undefined);

    if (!hasProfileChanges) {
      // Legacy behaviour: an empty payload toggles active status.
      await admin.update({ is_active: !admin.is_active });
      return res.json(successResponse({}, 'Status updated'));
    }

    const adminUpdates = {};
    if (role !== undefined) adminUpdates.role = role;
    if (access_level !== undefined) adminUpdates.access_level = access_level;
    if (is_active !== undefined) adminUpdates.is_active = !!is_active;
    if (Object.keys(adminUpdates).length) await admin.update(adminUpdates);

    if (full_name !== undefined || email !== undefined || phone !== undefined) {
      const user = await User.findByPk(admin.user_id);
      if (user) {
        const userUpdates = {};
        if (full_name !== undefined) {
          userUpdates.first_name = full_name.split(' ')[0] || '';
          userUpdates.last_name = full_name.split(' ').slice(1).join(' ') || '';
        }
        if (email !== undefined) userUpdates.email = email;
        if (phone !== undefined) userUpdates.phone = phone;
        await user.update(userUpdates);
      }
    }

    return res.json(successResponse({}, 'Member updated'));
  } catch (err) {
    console.error('updatePrincipalUser Error:', err);
    return res.status(500).json(errorResponse(`Failed to update`));
  }
}

async function getAttendanceReport(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const days = Math.min(parseInt(req.query.days, 10) || 30, 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const records = await Attendance.findAll({
      where: { school_id: school.id, date: { [Op.gte]: since } },
      attributes: ['classroom_id', 'status', 'date'],
    });

    const classes = await Class.findAll({
      where: { school_id: school.id },
      attributes: ['id', 'name'],
    });
    const classNames = Object.fromEntries(classes.map(c => [c.id, c.name]));

    const byClass = {};
    const overall = { total: 0, present: 0, absent: 0, late: 0, excused: 0 };
    for (const r of records) {
      const key = r.classroom_id || 0;
      if (!byClass[key]) {
        byClass[key] = { class_id: key, class_name: classNames[key] || 'Unassigned', total: 0, present: 0, absent: 0, late: 0, excused: 0 };
      }
      const bucket = byClass[key];
      bucket.total += 1;
      overall.total += 1;
      const status = ['present', 'absent', 'late', 'excused'].includes(r.status) ? r.status : 'present';
      bucket[status] += 1;
      overall[status] += 1;
    }

    const classReport = Object.values(byClass).map(c => ({
      ...c,
      rate: c.total ? Math.round(((c.present + c.late) / c.total) * 100) : 0,
    })).sort((a, b) => a.rate - b.rate);

    const overallRate = overall.total
      ? Math.round(((overall.present + overall.late) / overall.total) * 100)
      : 0;

    return res.json(successResponse({
      days,
      overall: { ...overall, rate: overallRate },
      classes: classReport,
      low_attendance_count: classReport.filter(c => c.total > 0 && c.rate < 85).length,
    }));
  } catch (err) {
    console.error('getAttendanceReport Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch attendance report`));
  }
}

async function getSchoolCommandDashboard(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const studentsTotal = await Student.count({ where: { school_id: school.id, status: 'active' } });
    const teachersTotal = await Teacher.count({ where: { school_id: school.id, is_active: true } });
    const totalClasses = await Class.count({ where: { school_id: school.id } });

    const grades = await Grade.findAll({ where: { school_id: school.id } });
    const avgAcademic = grades.length
      ? Math.round(grades.reduce((sum, g) => sum + (g.total || 0), 0) / grades.length)
      : 0;

    const attendance = await Attendance.findAll({ where: { school_id: school.id } });
    const presentCount = attendance.filter(a => a.status === 'present').length;
    const avgAttendance = attendance.length ? Math.round(presentCount / attendance.length * 100) : 0;

    const finance = 'Stable';
    const healthScore = Math.round(avgAcademic * 0.45 + avgAttendance * 0.40 + 15);

    const gradeMods = await Grade.count({
      where: { school_id: school.id, approval_status: 'pending' },
    });
    const atRisk = grades.filter(g => g.total && g.total < 40).length;
    const finAnomaly = 0;

    // Classes whose attendance rate over the last 30 days falls below 85%
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentAttendance = await Attendance.findAll({
      where: { school_id: school.id, date: { [Op.gte]: since } },
      attributes: ['classroom_id', 'status'],
    });
    const byClass = {};
    for (const a of recentAttendance) {
      if (!a.classroom_id) continue;
      if (!byClass[a.classroom_id]) byClass[a.classroom_id] = { total: 0, present: 0 };
      byClass[a.classroom_id].total += 1;
      if (a.status === 'present' || a.status === 'late') byClass[a.classroom_id].present += 1;
    }
    const lowAttend = Object.values(byClass)
      .filter(c => c.total > 0 && (c.present / c.total) * 100 < 85).length;

    return res.json(successResponse({
      totalStudents: studentsTotal,
      totalTeachers: teachersTotal,
      totalClasses,
      avgAcademic,
      avgAttendance,
      finance,
      healthScore,
      totalGradeMods: gradeMods,
      totalAtRisk: atRisk,
      totalFinAnom: finAnomaly,
      totalLowAttend: lowAttend,
    }));
  } catch (err) {
    console.error('getSchoolCommandDashboard Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch dashboard`));
  }
}

async function getClassPerformance(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const classes = await Class.findAll({
      where: { school_id: school.id },
      include: [
        {
          model: Student,
          as: 'students',
          include: [{ model: Grade, as: 'grades', attributes: ['total'] }],
        },
      ],
    });

    const performance = classes.map(c => {
      const students = c.students || [];
      const totals = students.flatMap(s => s.grades?.map(g => g.total) || []).filter(Boolean);
      const avg = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0;
      return { name: c.name, score: avg, studentCount: students.length };
    }).filter(c => c.studentCount > 0);

    performance.sort((a, b) => b.score - a.score);

    return res.json(successResponse({
      top: performance.slice(0, 3),
      low: performance.slice(-3).reverse(),
    }));
  } catch (err) {
    console.error('getClassPerformance Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch class performance`));
  }
}

async function getTeacherInsights(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const teachersTotal = await Teacher.count({ where: { school_id: school.id, is_active: true } });
    const pendingGrades = await Grade.count({
      where: { school_id: school.id, grade_letter: null },
    });

    return res.json(successResponse({
      overloaded: 0,
      underperforming: 0,
      pendingGrades,
      totalTeachers: teachersTotal,
    }));
  } catch (err) {
    console.error('getTeacherInsights Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch teacher insights`));
  }
}

async function getFinanceSnapshot(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    return res.json(successResponse({
      revenue: 0,
      outstanding: 0,
      paymentsToday: 0,
      transactions: [],
    }));
  } catch (err) {
    console.error('getFinanceSnapshot Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch finance`));
  }
}

async function getActivityFeed(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const logs = await SecurityAuditLog.findAll({
      where: { school_id: school.id },
      order: [['created_at', 'DESC']],
      limit: 20,
    });

    const notifications = await Notification.findAll({
      where: { school_id: school.id },
      order: [['created_at', 'DESC']],
      limit: 10,
    });

    const events = logs.map(l => ({
      kind: 'admin',
      text: l.action || 'System event',
      at: l.created_at,
    }));

    const notifEvents = notifications.map(n => ({
      kind: n.type === 'alert' ? 'request' : 'announce',
      text: n.title,
      at: n.created_at,
    }));

    return res.json(successResponse({
      items: [...events, ...notifEvents].slice(0, 15),
    }));
  } catch (err) {
    console.error('getActivityFeed Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch activity`));
  }
}

async function getSyllabusProgress(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const SyllabusTopic = require('../models/SyllabusTopic');

    const subjects = await Subject.findAll({ where: { school_id: school.id } });

    const progress = [];
    for (const s of subjects) {
      const topics = await SyllabusTopic.findAll({ where: { school_id: school.id, subject_id: s.id } });
      const total = topics.length;
      const covered = topics.filter(t => t.status === 'completed' || t.date_covered).length;
      const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
      const pending = topics.filter(t => t.status === 'not_started' || !t.date_covered).length;
      progress.push({
        name: s.name,
        code: s.code,
        pct,
        pending: `${pending} topic(s) pending`,
        total_topics: total,
        covered_topics: covered,
      });
    }

    return res.json(successResponse({ subjects: progress }));
  } catch (err) {
    console.error('getSyllabusProgress Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch syllabus`));
  }
}

module.exports = {
  getOverview, listGradeApprovals, reviewGradeChange,
  listReportCards, publishReportCard, commentReportCard,
  getPrincipalUsers, createPrincipalUser, updatePrincipalUser,
  getSchoolCommandDashboard,
  getClassPerformance,
  getTeacherInsights,
  getFinanceSnapshot,
  getActivityFeed,
  getSyllabusProgress,
  getAttendanceReport,
};
