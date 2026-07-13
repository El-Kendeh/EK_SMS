// Principal identity model: a leadership login = users row (role principal)
// + pruh_core_schooladmin link row. User.is_active is the ONLY access gate;
// SchoolAdmin.is_active mirrors it for display. CorePrincipal/Principal serve
// superadmin HR-profile + ref-data flows and are not on the auth path.
const crypto = require('crypto');
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const Student = require('../models/Student');
const User = require('../models/User');
const Role = require('../models/Role');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Grade = require('../models/Grade');
const Term = require('../models/Term');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const SecurityAuditLog = require('../models/SecurityAuditLog');
const SchoolAdmin = require('../models/SchoolAdmin');
const Fee = require('../models/Fee');
const Payment = require('../models/Payment');
const TimetableSlot = require('../models/TimetableSlot');
const GradeEvent = require('../models/GradeEvent');
const { appendGradeEvent, computeEventHash } = require('../utils/gradeEvent');

const successResponse = (data = {}, message = 'Success') => ({ success: true, message, ...data });
const errorResponse = (message) => ({ success: false, message });

// A superadmin with no ?school_id is authenticated — a 401 here would trip the
// client's logout heuristics. Everyone else without a school really is unauthenticated.
const noSchoolResponse = (req, res) =>
  req.user?.role === 'superadmin'
    ? res.status(400).json(errorResponse('school_id query parameter is required'))
    : res.status(401).json(errorResponse('Not authenticated'));

const generateTempPassword = () =>
  'Ek1!' + crypto.randomBytes(6).toString('base64url'); // 12 chars, letters+digits+symbol

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
    if (!school) return noSchoolResponse(req, res);

    const studentsTotal = await Student.count({ where: { school_id: school.id, status: 'active' } });
    const teachersTotal = await Teacher.count({ where: { school_id: school.id, is_active: true } });
    const classroomsTotal = await Class.count({ where: { school_id: school.id } });

    const activeTerm = await Term.findOne({ where: { school_id: school.id, is_active: true } });

    const pendingGradeChanges = await Grade.count({
      where: { school_id: school.id, approval_status: 'pending' },
    });

    // A student's report card is "pending" when all their term grades are
    // approved but not yet all published; "published" when all are published.
    let reportCardsPending = 0;
    let reportCardsPublished = 0;
    if (activeTerm) {
      const [rcRows] = await sequelize.query(`
        SELECT COALESCE(SUM(all_approved = 1 AND all_published = 0), 0) AS pending,
               COALESCE(SUM(all_published = 1), 0) AS published
        FROM ( SELECT student_id,
                      MIN(approval_status = 'approved') AS all_approved,
                      MIN(is_published) AS all_published
               FROM pruh_core_grade
               WHERE school_id = :schoolId AND term_id = :termId
               GROUP BY student_id ) t
      `, { replacements: { schoolId: school.id, termId: activeTerm.id } });
      reportCardsPending = Number(rcRows[0]?.pending) || 0;
      reportCardsPublished = Number(rcRows[0]?.published) || 0;
    }

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
    if (!school) return noSchoolResponse(req, res);

    const { status, class_id, term_id } = req.query;
    const where = { school_id: school.id };
    if (status) where.approval_status = status;
    else where.approval_status = { [Op.in]: ['pending', 'rejected'] };
    if (class_id) where.classroom_id = class_id;
    if (term_id) where.term_id = term_id;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.page_size, 10) || 50));

    const { rows: grades, count: total } = await Grade.findAndCountAll({
      where,
      include: [
        { model: Student, as: 'student', include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }] },
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        { model: Term, as: 'term', attributes: ['id', 'name'] },
        { model: Class, as: 'classroom', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      distinct: true,
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
      total,
      page,
      page_size: pageSize,
    }));
  } catch (err) {
    console.error('listGradeApprovals Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch approvals`));
  }
}

async function reviewGradeChange(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return noSchoolResponse(req, res);

    const { grade_ids, action, comment } = req.body;
    if (!grade_ids || !grade_ids.length) return res.status(400).json(errorResponse('grade_ids are required'));
    if (!['approve', 'reject'].includes(action)) return res.status(400).json(errorResponse('Action must be approve or reject'));

    const ids = Array.isArray(grade_ids) ? grade_ids : [grade_ids];
    const grades = await Grade.findAll({
      where: { id: ids, school_id: school.id, approval_status: 'pending' },
      include: [{ model: Subject, as: 'subject', attributes: ['name'] }],
    });

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    let count = 0;
    // Approve/reject + their audit events commit atomically: a mid-batch
    // failure rolls the whole review back rather than leaving a partial state.
    await sequelize.transaction(async (t) => {
      for (const g of grades) {
        const updates = {
          approval_status: newStatus,
          approved_by: req.user?.id || null,
          approved_at: new Date(),
        };
        if (comment?.trim()) {
          const stamp = `[${new Date().toISOString()}] ${action === 'approve' ? 'Approved' : 'Rejected'} by ${req.user?.username || 'principal'}: ${comment.trim()}`;
          updates.remarks = g.remarks ? `${g.remarks}\n${stamp}` : stamp;
        }
        await g.update(updates, { transaction: t });

        await appendGradeEvent({
          grade_id: g.id, school_id: school.id, student_id: g.student_id,
          subject_id: g.subject_id, term_id: g.term_id,
          actor_user_id: req.user?.id, actor_name: req.user?.username,
          event_type: action, field: 'approval_status',
          old_value: 'pending', new_value: newStatus,
          approval_status_after: newStatus,
        }, { transaction: t });

        count++;
      }

      // One summary notification per review, not one per grade (a bulk approval
      // of 40 grades used to spam 40 school-wide notices).
      if (action === 'approve' && count > 0) {
        await Notification.create({
          school_id: school.id,
          title: 'Grades Approved',
          message: `${count} grade${count === 1 ? '' : 's'} approved by the principal.`,
          type: 'info',
          is_read: false,
        }, { transaction: t });
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
    if (!school) return noSchoolResponse(req, res);

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
      truncated: totalGrades > 500,
    }));
  } catch (err) {
    console.error('listReportCards Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch report cards`));
  }
}

async function publishReportCard(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return noSchoolResponse(req, res);

    const { student_ids, term_id } = req.body;
    if (!term_id) return res.status(400).json(errorResponse('term_id is required'));

    const term = await Term.findOne({ where: { id: term_id, school_id: school.id } });
    if (!term) return res.status(404).json(errorResponse('Term not found'));

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

      // Only announce when something was actually published.
      if (publishedStudents.size > 0) {
        await Notification.create({
          school_id: school.id,
          title: 'Report Cards Published',
          message: `Report cards for ${term.name} have been published and are now available.`,
          type: 'alert',
          is_read: false,
        }, { transaction: t });
      }
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
    if (!school) return noSchoolResponse(req, res);

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
    if (!school) return noSchoolResponse(req, res);

    const admins = await SchoolAdmin.findAll({
      where: { school_id: school.id },
      include: [{
        model: User, as: 'user',
        attributes: ['id', 'username', 'first_name', 'last_name', 'email', 'phone', 'is_active'],
        include: [{ model: Role, as: 'role', attributes: ['code'] }],
      }],
      order: [['id', 'DESC']], // pruh_core_schooladmin has timestamps:false / no created_at
    });

    // The tenant administrator's own link row lives in the same table but is
    // not a leadership-team member and must not be manageable from here.
    const leadership = admins.filter(a => !['school_admin', 'schooladmin'].includes(a.user?.role?.code));

    const users = leadership.map(a => ({
      id: a.id,
      full_name: `${a.user?.first_name || ''} ${a.user?.last_name || ''}`.trim() || a.user?.username,
      email: a.user?.email,
      phone: a.user?.phone,
      username: a.user?.username,
      is_active: a.user ? a.user.is_active !== false : a.is_active !== false,
      role: a.role || 'Principal',
      access_level: a.access_level || 'Full',
      created_at: null,
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
    if (!school) return noSchoolResponse(req, res);

    const { full_name, email, phone, username, password, role, access_level } = req.body;
    if (!full_name?.trim() || !email?.trim()) {
      return res.status(400).json(errorResponse('full_name and email are required'));
    }
    const uname = (username || email).trim();

    // Uniqueness pre-check → 409, not a generic 500.
    const clash = await User.findOne({
      where: { [Op.or]: [{ username: uname }, { email: email.trim() }] },
    });
    if (clash) {
      return res.status(409).json(errorResponse(
        clash.email === email.trim()
          ? 'A user with this email already exists'
          : 'This username is already taken'));
    }

    // Password policy: caller supplies a strong password, or we mint a random
    // temp password and force rotation at first login.
    let tempPassword = null;
    let pw = password;
    if (!pw) {
      tempPassword = generateTempPassword();
      pw = tempPassword;
    } else if (String(pw).length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) {
      return res.status(400).json(errorResponse('Password must be at least 8 characters and contain letters and numbers'));
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(pw, 10);
    const { requireRoleId } = require('../utils/roleIds');
    const principalRoleId = await requireRoleId('principal');

    const { user, admin } = await sequelize.transaction(async (t) => {
      const user = await User.create({
        username: uname,
        email: email.trim(),
        phone,
        password: hashedPassword,
        first_name: full_name.split(' ')[0] || '',
        last_name: full_name.split(' ').slice(1).join(' ') || '',
        role_id: principalRoleId,
        is_active: true, // the school is already approved — a locked-out leadership login helps no one
      }, { transaction: t });
      const admin = await SchoolAdmin.create({
        school_id: school.id,
        user_id: user.id,
        role: role || 'Principal',
        access_level: access_level || 'Full',
        is_active: true,
        must_change_password: !password,
      }, { transaction: t });
      return { user, admin };
    });

    return res.json(successResponse({
      id: admin.id,
      username: user.username,
      temp_password: tempPassword, // null when the caller supplied one
      must_change_password: !password,
    }, 'Principal created'));
  } catch (err) {
    console.error('createPrincipalUser Error:', err);
    return res.status(500).json(errorResponse(`Failed to create principal`));
  }
}

async function updatePrincipalUser(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return noSchoolResponse(req, res);

    const { id } = req.params;
    const admin = await SchoolAdmin.findOne({
      where: { id, school_id: school.id },
      include: [{
        model: User, as: 'user',
        attributes: ['id', 'is_active'],
        include: [{ model: Role, as: 'role', attributes: ['code'] }],
      }],
    });
    if (!admin) return res.status(404).json(errorResponse('Principal not found'));

    // A principal must never manage (or lock out) the tenant administrator.
    if (['school_admin', 'schooladmin'].includes(admin.user?.role?.code)) {
      return res.status(403).json(errorResponse('The school administrator account cannot be managed from Leadership Team'));
    }

    const { full_name, email, phone, role, access_level, is_active } = req.body || {};
    const hasProfileChanges = [full_name, email, phone, role, access_level, is_active]
      .some(v => v !== undefined);

    // Active-state change: explicit is_active in the body, or the legacy
    // empty-body toggle. User.is_active is the flag login + requireActiveAccount
    // actually gate on — SchoolAdmin.is_active only mirrors it for display.
    const currentActive = admin.user ? admin.user.is_active !== false : admin.is_active !== false;
    const targetActive = hasProfileChanges
      ? (is_active !== undefined ? !!is_active : undefined)
      : !currentActive;

    if (targetActive !== undefined) {
      if (String(admin.user_id) === String(req.user?.id) && targetActive === false) {
        return res.status(400).json(errorResponse('You cannot suspend your own account'));
      }
      await sequelize.transaction(async (t) => {
        await admin.update({ is_active: targetActive }, { transaction: t });
        await User.update({ is_active: targetActive }, { where: { id: admin.user_id }, transaction: t });
      });
    }

    const adminUpdates = {};
    if (role !== undefined) adminUpdates.role = role;
    if (access_level !== undefined) adminUpdates.access_level = access_level;
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

    return res.json(successResponse(
      { id: admin.id, is_active: targetActive !== undefined ? targetActive : currentActive },
      targetActive === undefined ? 'Member updated' : (targetActive ? 'Member activated' : 'Member suspended')
    ));
  } catch (err) {
    console.error('updatePrincipalUser Error:', err);
    return res.status(500).json(errorResponse(`Failed to update`));
  }
}

async function getAttendanceReport(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return noSchoolResponse(req, res);

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
    if (!school) return noSchoolResponse(req, res);

    const activeTerm = await Term.findOne({ where: { school_id: school.id, is_active: true } });
    const termWhere = activeTerm ? { term_id: activeTerm.id } : {};

    const [studentsTotal, teachersTotal, totalClasses, gradeMods, atRisk] = await Promise.all([
      Student.count({ where: { school_id: school.id, status: 'active' } }),
      Teacher.count({ where: { school_id: school.id, is_active: true } }),
      Class.count({ where: { school_id: school.id } }),
      Grade.count({ where: { school_id: school.id, approval_status: 'pending' } }),
      // Distinct STUDENTS at risk (not grade rows) so this matches the At-Risk page.
      Grade.count({ where: { school_id: school.id, total: { [Op.lt]: 40 }, ...termWhere }, distinct: true, col: 'student_id' }),
    ]);

    // Academic average: approved grades in the active term, aggregated in SQL.
    const avgRow = await Grade.findOne({
      attributes: [[sequelize.fn('AVG', sequelize.col('total')), 'avg']],
      where: {
        school_id: school.id, approval_status: 'approved',
        total: { [Op.ne]: null }, ...termWhere,
      },
      raw: true,
    });
    const avgAcademic = Math.round(Number(avgRow?.avg) || 0);

    // One grouped attendance query (last 30 days) feeds both the overall rate
    // and the low-attendance class count.
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [attRows] = await sequelize.query(`
      SELECT classroom_id,
             SUM(status IN ('present','late')) AS present,
             COUNT(*) AS total
      FROM pruh_core_attendance
      WHERE school_id = :schoolId AND date >= :since
      GROUP BY classroom_id
    `, { replacements: { schoolId: school.id, since } });
    const attPresent = attRows.reduce((s, r) => s + Number(r.present), 0);
    const attTotal = attRows.reduce((s, r) => s + Number(r.total), 0);
    const avgAttendance = attTotal ? Math.round((attPresent / attTotal) * 100) : 0;
    const lowAttend = attRows.filter(r =>
      r.classroom_id && Number(r.total) > 0 && (Number(r.present) / Number(r.total)) * 100 < 85).length;

    // Finance dimension from real fee data — no fabricated constants. When the
    // school has no fee rows yet, finance is honestly null and the health score
    // reweights to academics/attendance only.
    const feeWhere = { school_id: school.id, ...termWhere };
    const [finDue, finPaid] = await Promise.all([
      Fee.sum('amount_due', { where: feeWhere }),
      Fee.sum('amount_paid', { where: feeWhere }),
    ]);
    const financeRate = (finDue || 0) > 0 ? Math.round(((finPaid || 0) / finDue) * 100) : null;
    const finance = financeRate == null ? null
      : financeRate >= 80 ? 'Stable'
      : financeRate >= 60 ? 'Needs Attention'
      : 'Critical';
    const healthScore = financeRate == null
      ? Math.round(avgAcademic * 0.55 + avgAttendance * 0.45)
      : Math.round(avgAcademic * 0.45 + avgAttendance * 0.40 + financeRate * 0.15);

    /* Real (simple) anomaly signal — replaces the old hardcoded 0 that left
       the dashboard's "Financial anomaly" alert permanently dead: completed
       payments in the last 24h that are more than 3× the school's 90-day
       average payment. Cheap, honest, and actually fires. */
    let finAnomaly = 0;
    try {
      const since90 = new Date(Date.now() - 90 * 24 * 3600e3);
      const avgRow = await Payment.findOne({
        where: { school_id: school.id, status: 'completed', paid_at: { [Op.gte]: since90 } },
        attributes: [[sequelize.fn('AVG', sequelize.col('amount')), 'avg']],
        raw: true,
      });
      const avgPay = Number(avgRow?.avg) || 0;
      if (avgPay > 0) {
        finAnomaly = await Payment.count({
          where: {
            school_id: school.id,
            status: 'completed',
            paid_at: { [Op.gte]: new Date(Date.now() - 24 * 3600e3) },
            amount: { [Op.gt]: avgPay * 3 },
          },
        });
      }
    } catch { finAnomaly = 0; }

    return res.json(successResponse({
      totalStudents: studentsTotal,
      totalTeachers: teachersTotal,
      totalClasses,
      avgAcademic,
      avgAttendance,
      finance,
      financeRate,
      healthScore,
      term: activeTerm?.name || null,
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
    if (!school) return noSchoolResponse(req, res);

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

    // With <=3 classes "low" would duplicate "top" — only report a low tier
    // when there are classes beyond the top three.
    const top = performance.slice(0, 3);
    const low = performance.length > 3
      ? performance.slice(Math.max(3, performance.length - 3)).reverse()
      : [];

    return res.json(successResponse({ top, low }));
  } catch (err) {
    console.error('getClassPerformance Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch class performance`));
  }
}

async function getTeacherInsights(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return noSchoolResponse(req, res);

    const teachersTotal = await Teacher.count({ where: { school_id: school.id, is_active: true } });
    const pendingGrades = await Grade.count({
      where: { school_id: school.id, grade_letter: null },
    });

    const MAX_PERIODS_PER_WEEK = 28;
    const UNDERPERFORM_THRESHOLD = 50;

    // Overloaded: distinct teachers with more than 28 non-break periods/week.
    // null (not 0) when no timetable exists — the UI must not claim "0 overloaded"
    // about data that was never generated.
    const slotCounts = await TimetableSlot.findAll({
      attributes: ['teacher_id', [sequelize.fn('COUNT', sequelize.col('id')), 'periods']],
      where: { school_id: school.id, is_break: false, teacher_id: { [Op.ne]: null } },
      group: ['teacher_id'],
      raw: true,
    });
    const hasTimetable = slotCounts.length > 0;
    const overloaded = hasTimetable
      ? slotCounts.filter(r => Number(r.periods) > MAX_PERIODS_PER_WEEK).length
      : null;

    // Underperforming: teachers whose taught class-subject grade average sits
    // below the threshold.
    const [underRows] = await sequelize.query(`
      SELECT cs.teacher_id, AVG(g.total) AS avg_total
      FROM pruh_core_class_subject cs
      JOIN pruh_core_grade g
        ON g.subject_id = cs.subject_id AND g.classroom_id = cs.class_id
      WHERE g.school_id = :schoolId AND g.total IS NOT NULL AND cs.teacher_id IS NOT NULL
      GROUP BY cs.teacher_id
    `, { replacements: { schoolId: school.id } });
    const hasGrades = underRows.length > 0;
    const underperforming = hasGrades
      ? underRows.filter(r => Number(r.avg_total) < UNDERPERFORM_THRESHOLD).length
      : null;

    return res.json(successResponse({
      overloaded,
      underperforming,
      pendingGrades,
      totalTeachers: teachersTotal,
      has_timetable: hasTimetable,
      has_grades: hasGrades,
      max_periods: MAX_PERIODS_PER_WEEK,
      threshold: UNDERPERFORM_THRESHOLD,
    }));
  } catch (err) {
    console.error('getTeacherInsights Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch teacher insights`));
  }
}

async function getFinanceSnapshot(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return noSchoolResponse(req, res);

    const activeTerm = await Term.findOne({ where: { school_id: school.id, is_active: true } });

    const feeWhere = { school_id: school.id, ...(activeTerm ? { term_id: activeTerm.id } : {}) };
    const payWhere = {
      school_id: school.id, status: 'completed',
      ...(activeTerm?.start_date ? { paid_at: { [Op.gte]: activeTerm.start_date } } : {}),
    };

    const [revenue, totalDue, totalPaid] = await Promise.all([
      Payment.sum('amount', { where: payWhere }),
      Fee.sum('amount_due', { where: feeWhere }),
      Fee.sum('amount_paid', { where: feeWhere }),
    ]);
    const outstanding = Math.max(0, (totalDue || 0) - (totalPaid || 0));

    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const paymentsToday = await Payment.count({
      where: { school_id: school.id, status: 'completed', paid_at: { [Op.gte]: startOfDay } },
    });

    // Recent payments — 2-step lookup (no Payment→Student association exists).
    const recent = await Payment.findAll({
      where: { school_id: school.id, status: 'completed' },
      order: [['paid_at', 'DESC']], limit: 5,
    });
    const studentIds = [...new Set(recent.map(p => p.student_id).filter(Boolean))];
    const students = studentIds.length ? await Student.findAll({
      where: { id: studentIds },
      include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }],
    }) : [];
    const nameById = Object.fromEntries(students.map(s =>
      [s.id, `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.trim() || `Student #${s.id}`]));

    const feeCount = await Fee.count({ where: { school_id: school.id } });
    const hasData = feeCount > 0 || recent.length > 0;
    const collectionRate = (totalDue || 0) > 0
      ? Math.round(((totalPaid || 0) / totalDue) * 100) : null;

    return res.json(successResponse({
      revenue: Math.round((revenue || 0) * 100) / 100,
      outstanding: Math.round(outstanding * 100) / 100,
      paymentsToday,
      collection_rate: collectionRate,
      term: activeTerm?.name || null,
      has_data: hasData,
      transactions: recent.map(p => ({
        label: `${nameById[p.student_id] || 'Payment'}${p.payment_method ? ` · ${p.payment_method}` : ''}`,
        at: p.paid_at,
        amount: p.amount,
      })),
    }));
  } catch (err) {
    console.error('getFinanceSnapshot Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch finance`));
  }
}

async function getActivityFeed(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return noSchoolResponse(req, res);

    // SecurityAuditLog is platform-wide (no school_id column — not tenant-scoped);
    // it both 500'd here and would leak other schools' audit events into a tenant
    // feed. Use only the tenant-scoped Notification table.
    const notifications = await Notification.findAll({
      where: { school_id: school.id },
      order: [['created_at', 'DESC']],
      limit: 15,
    });

    const notifEvents = notifications.map(n => ({
      kind: n.type === 'alert' ? 'request' : 'announce',
      text: n.title,
      at: n.created_at,
    }));

    return res.json(successResponse({
      items: notifEvents.slice(0, 15),
    }));
  } catch (err) {
    console.error('getActivityFeed Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch activity`));
  }
}

async function getSyllabusProgress(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return noSchoolResponse(req, res);

    const SyllabusTopic = require('../models/SyllabusTopic');

    const subjects = await Subject.findAll({ where: { school_id: school.id } });

    // One fetch + in-memory grouping instead of a query per subject.
    const allTopics = await SyllabusTopic.findAll({ where: { school_id: school.id } });
    const topicsBySubject = allTopics.reduce((m, t) => ((m[t.subject_id] ||= []).push(t), m), {});

    const progress = [];
    for (const s of subjects) {
      const topics = topicsBySubject[s.id] || [];
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

/* ── Batch-3 leadership features ─────────────────────────────────────────── */

/**
 * Grade-audit forensic timeline (GET /api/principal/grade-audit/).
 * Lists the school's append-only grade-event chain (newest first) with
 * pagination + filters, and — when ?verify=1 — re-walks the WHOLE chain with
 * the exact hash formula used at append time (utils/gradeEvent.computeEventHash)
 * to prove nothing was edited or removed.
 */
async function getGradeAudit(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return noSchoolResponse(req, res);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.page_size, 10) || 50));

    const where = { school_id: school.id };
    if (req.query.event_type) where.event_type = req.query.event_type;
    if (req.query.student_id) where.student_id = req.query.student_id;
    if (req.query.grade_id) where.grade_id = req.query.grade_id;

    const { rows, count: total } = await GradeEvent.findAndCountAll({
      where,
      order: [['id', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    // Enrich with student/subject names — two batched lookups, no N+1.
    const studentIds = [...new Set(rows.map(e => e.student_id).filter(Boolean))];
    const subjectIds = [...new Set(rows.map(e => e.subject_id).filter(Boolean))];
    const [students, subjects] = await Promise.all([
      studentIds.length ? Student.findAll({
        where: { id: studentIds },
        attributes: ['id', 'admission_number'],
        include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }],
      }) : [],
      subjectIds.length ? Subject.findAll({ where: { id: subjectIds }, attributes: ['id', 'name'] }) : [],
    ]);
    const studentNameById = Object.fromEntries(students.map(s =>
      [s.id, `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.trim() || `Student #${s.id}`]));
    const subjectNameById = Object.fromEntries(subjects.map(s => [s.id, s.name]));

    // Chain verification: walk the whole school chain id ASC, recomputing every
    // hash and checking every prev_hash link. Capped — a chain this long needs
    // an offline job, not a request handler.
    let chain = null;
    if (req.query.verify === '1') {
      const CHAIN_CAP = 20000;
      const chainLength = await GradeEvent.count({ where: { school_id: school.id } });
      if (chainLength > CHAIN_CAP) {
        chain = { valid: null, checked: CHAIN_CAP, note: 'chain too long for online verification' };
      } else {
        const all = await GradeEvent.findAll({
          where: { school_id: school.id },
          attributes: [
            'id', 'grade_id', 'school_id', 'student_id', 'subject_id', 'term_id',
            'actor_user_id', 'event_type', 'field', 'old_value', 'new_value',
            'approval_status_after', 'prev_hash', 'hash', 'created_at',
          ],
          order: [['id', 'ASC']],
          raw: true,
        });
        chain = { valid: true, checked: all.length };
        let prevHash = '';
        for (const e of all) {
          const linked = (e.prev_hash || '') === prevHash;
          const recomputed = computeEventHash(e, prevHash);
          if (!linked || recomputed !== e.hash) {
            chain = { valid: false, checked: all.length, broken_at_id: e.id };
            break;
          }
          prevHash = e.hash;
        }
      }
    }

    return res.json(successResponse({
      events: rows.map(e => ({
        id: e.id,
        event_type: e.event_type,
        field: e.field,
        old_value: e.old_value,
        new_value: e.new_value,
        approval_status_after: e.approval_status_after,
        actor_name: e.actor_name,
        student_id: e.student_id,
        student_name: e.student_id ? (studentNameById[e.student_id] || `Student #${e.student_id}`) : null,
        subject_name: e.subject_id ? (subjectNameById[e.subject_id] || null) : null,
        grade_id: e.grade_id,
        created_at: e.created_at,
        hash: e.hash,
        prev_hash: e.prev_hash,
      })),
      total,
      page,
      page_size: pageSize,
      chain,
    }));
  } catch (err) {
    console.error('getGradeAudit Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch grade audit`));
  }
}

/**
 * Academics analytics (GET /api/principal/academics-analytics/).
 * School + term scoped, APPROVED grades only. ?term_id= optional (defaults to
 * the active term). has_data:false → the page shows an honest empty state.
 */
async function getAcademicsAnalytics(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return noSchoolResponse(req, res);

    let term = null;
    if (req.query.term_id) {
      term = await Term.findOne({ where: { id: req.query.term_id, school_id: school.id } });
      if (!term) return res.status(404).json(errorResponse('Term not found'));
    } else {
      term = await Term.findOne({ where: { school_id: school.id, is_active: true } });
    }
    const termSql = term ? 'AND g.term_id = :termId' : '';
    const repl = { schoolId: school.id, ...(term ? { termId: term.id } : {}) };

    const approvedCount = await Grade.count({
      where: {
        school_id: school.id, approval_status: 'approved',
        ...(term ? { term_id: term.id } : {}),
      },
    });

    // 1. Grade distribution by letter.
    const [distRows] = await sequelize.query(`
      SELECT g.grade_letter AS letter, COUNT(*) AS count
      FROM pruh_core_grade g
      WHERE g.school_id = :schoolId AND g.approval_status = 'approved'
        AND g.grade_letter IS NOT NULL ${termSql}
      GROUP BY g.grade_letter
      ORDER BY g.grade_letter ASC
    `, { replacements: repl });

    // 2. Pass rate per class (ascending — problem classes surface first).
    const [passRows] = await sequelize.query(`
      SELECT g.classroom_id AS class_id, c.name AS name,
             ROUND(SUM(g.total >= 50) / COUNT(*) * 100) AS pass_rate,
             COUNT(DISTINCT g.student_id) AS students
      FROM pruh_core_grade g
      JOIN pruh_core_class c ON c.id = g.classroom_id
      WHERE g.school_id = :schoolId AND g.approval_status = 'approved'
        AND g.total IS NOT NULL ${termSql}
      GROUP BY g.classroom_id, c.name
      ORDER BY pass_rate ASC
    `, { replacements: repl });

    // 3. Term trend: school-wide average per term, ordered chronologically.
    const [trendRows] = await sequelize.query(`
      SELECT t.id AS term_id, t.name AS term, ROUND(AVG(g.total)) AS avg
      FROM pruh_core_grade g
      JOIN pruh_core_term t ON t.id = g.term_id
      WHERE g.school_id = :schoolId AND g.approval_status = 'approved' AND g.total IS NOT NULL
      GROUP BY t.id, t.name, t.start_date
      ORDER BY t.start_date ASC, t.id ASC
    `, { replacements: { schoolId: school.id } });

    // 4. Class × subject heatmap.
    const [cellRows] = await sequelize.query(`
      SELECT g.classroom_id AS class_id, g.subject_id AS subject_id,
             ROUND(AVG(g.total)) AS avg, COUNT(*) AS count
      FROM pruh_core_grade g
      WHERE g.school_id = :schoolId AND g.approval_status = 'approved'
        AND g.total IS NOT NULL AND g.classroom_id IS NOT NULL ${termSql}
      GROUP BY g.classroom_id, g.subject_id
    `, { replacements: repl });

    const classIds = [...new Set(cellRows.map(r => r.class_id))];
    const subjectIds = [...new Set(cellRows.map(r => r.subject_id))];
    const [heatClasses, heatSubjects] = await Promise.all([
      classIds.length ? Class.findAll({ where: { id: classIds }, attributes: ['id', 'name'], order: [['name', 'ASC']] }) : [],
      subjectIds.length ? Subject.findAll({ where: { id: subjectIds }, attributes: ['id', 'name'], order: [['name', 'ASC']] }) : [],
    ]);

    return res.json(successResponse({
      distribution: distRows.map(r => ({ letter: r.letter, count: Number(r.count) })),
      pass_rates: passRows.map(r => ({
        class_id: r.class_id, name: r.name,
        pass_rate: Number(r.pass_rate), students: Number(r.students),
      })),
      trend: trendRows.map(r => ({ term_id: r.term_id, term: r.term, avg: Number(r.avg) })),
      heatmap: {
        classes: heatClasses.map(c => ({ id: c.id, name: c.name })),
        subjects: heatSubjects.map(s => ({ id: s.id, name: s.name })),
        cells: cellRows.map(r => ({
          class_id: r.class_id, subject_id: r.subject_id,
          avg: Number(r.avg), count: Number(r.count),
        })),
      },
      term: term?.name || null,
      term_id: term?.id || null,
      has_data: approvedCount > 0,
    }));
  } catch (err) {
    console.error('getAcademicsAnalytics Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch academics analytics`));
  }
}

/**
 * Announcements over the Notification model (type 'announcement').
 * CONSTRAINT: pruh_core_notification has NO audience column — every
 * announcement is school-wide. Class/role targeting needs a schema change
 * and is explicitly out of scope here (the UI says so too).
 */
async function postAnnouncement(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return noSchoolResponse(req, res);

    const { title, message, audience } = req.body || {};
    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json(errorResponse('title and message are required'));
    }
    if (title.trim().length > 191) {
      return res.status(400).json(errorResponse('title must be 191 characters or fewer'));
    }

    /* Audience targeting (plan 3.5): 'all' | 'teachers' | 'parents' |
       'students'. A targeted announcement is fanned out to that role's users
       as individual rows; 'all' stays a single school-wide row (user_id null)
       so every portal surfaces it. Stored so the list can show the target. */
    const aud = ['all', 'teachers', 'parents', 'students'].includes(audience) ? audience : 'all';
    const tag = aud === 'all' ? '' : `[${aud}] `;

    if (aud === 'all') {
      const notification = await Notification.create({
        school_id: school.id, user_id: null,
        title: title.trim(), message: message.trim(),
        type: 'announcement', is_read: false,
      });
      return res.json(successResponse({ id: notification.id, audience: aud, delivered: 1 }, 'Announcement sent to the whole school'));
    }

    const roleCode = aud === 'teachers' ? 'teacher' : aud === 'parents' ? 'parent' : 'student';
    const roleRow = await Role.findOne({ where: { code: roleCode } });
    let recipients = [];
    if (roleRow) {
      // Resolve the target role's users within this school via their profile tables.
      if (aud === 'teachers') {
        const ts = await Teacher.findAll({ where: { school_id: school.id }, attributes: ['user_id'], raw: true });
        recipients = ts.map(t => t.user_id).filter(Boolean);
      } else if (aud === 'students') {
        const ss = await Student.findAll({ where: { school_id: school.id }, attributes: ['user_id'], raw: true });
        recipients = ss.map(s => s.user_id).filter(Boolean);
      } else { // parents — via students' guardians
        const Parent = require('../models/Parent');
        const ps = await Parent.findAll({ where: { school_id: school.id }, attributes: ['user_id'], raw: true }).catch(() => []);
        recipients = ps.map(p => p.user_id).filter(Boolean);
      }
    }
    recipients = [...new Set(recipients)];

    if (!recipients.length) {
      // No one in that audience yet — record it school-wide-tagged rather than silently drop.
      const notification = await Notification.create({
        school_id: school.id, user_id: null,
        title: `${tag}${title.trim()}`, message: message.trim(),
        type: 'announcement', is_read: false,
      });
      return res.json(successResponse({ id: notification.id, audience: aud, delivered: 0 }, `No ${aud} to notify yet — announcement recorded`));
    }

    await Notification.bulkCreate(recipients.map(uid => ({
      school_id: school.id, user_id: uid,
      title: `${tag}${title.trim()}`, message: message.trim(),
      type: 'announcement', is_read: false,
    })));

    return res.json(successResponse({ audience: aud, delivered: recipients.length }, `Announcement sent to ${recipients.length} ${aud}`));
  } catch (err) {
    console.error('postAnnouncement Error:', err);
    return res.status(500).json(errorResponse(`Failed to send announcement`));
  }
}

async function listAnnouncements(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return noSchoolResponse(req, res);

    const rows = await Notification.findAll({
      where: { school_id: school.id, type: 'announcement' },
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    return res.json(successResponse({
      announcements: rows.map(n => ({
        id: n.id, title: n.title, message: n.message, created_at: n.created_at,
      })),
    }));
  } catch (err) {
    console.error('listAnnouncements Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch announcements`));
  }
}

/**
 * At-risk students (GET /api/principal/at-risk/).
 * Two grouped queries (term grades + last-30-day attendance) merged in JS:
 * avg total < 50 → 'low_grades'; attendance rate < 75% → 'poor_attendance';
 * both → severity 'high', one → 'medium'. Capped at 200 rows.
 */
async function getAtRisk(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return noSchoolResponse(req, res);

    const term = await Term.findOne({ where: { school_id: school.id, is_active: true } });
    const termSql = term ? 'AND term_id = :termId' : '';
    const repl = { schoolId: school.id, ...(term ? { termId: term.id } : {}) };

    const [gradeRows] = await sequelize.query(`
      SELECT student_id, AVG(total) AS avg_total, COUNT(*) AS n
      FROM pruh_core_grade
      WHERE school_id = :schoolId AND total IS NOT NULL ${termSql}
      GROUP BY student_id
    `, { replacements: repl });

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [attRows] = await sequelize.query(`
      SELECT student_id,
             SUM(status IN ('present','late')) AS present,
             COUNT(*) AS total
      FROM pruh_core_attendance
      WHERE school_id = :schoolId AND date >= :since
      GROUP BY student_id
    `, { replacements: { schoolId: school.id, since } });

    const hasData = gradeRows.length > 0 || attRows.length > 0;

    const avgByStudent = new Map(gradeRows.map(r =>
      [r.student_id, Math.round(Number(r.avg_total) * 10) / 10]));
    const rateByStudent = new Map(attRows
      .filter(r => Number(r.total) > 0)
      .map(r => [r.student_id, Math.round((Number(r.present) / Number(r.total)) * 100)]));

    const flagged = new Map();
    for (const [sid, avg] of avgByStudent) {
      if (avg < 50) flagged.set(sid, { student_id: sid, reasons: ['low_grades'] });
    }
    for (const [sid, rate] of rateByStudent) {
      if (rate < 75) {
        const entry = flagged.get(sid) || { student_id: sid, reasons: [] };
        entry.reasons.push('poor_attendance');
        flagged.set(sid, entry);
      }
    }

    let list = [...flagged.values()].map(e => ({
      ...e,
      // Both metrics shown for context, even when only one triggered the flag.
      avg_total: avgByStudent.has(e.student_id) ? avgByStudent.get(e.student_id) : null,
      attendance_rate: rateByStudent.has(e.student_id) ? rateByStudent.get(e.student_id) : null,
      severity: e.reasons.length > 1 ? 'high' : 'medium',
    }));
    list.sort((a, b) =>
      (b.reasons.length - a.reasons.length) ||
      ((a.avg_total == null ? 101 : a.avg_total) - (b.avg_total == null ? 101 : b.avg_total)));
    list = list.slice(0, 200);

    const ids = list.map(e => e.student_id);
    const studentRows = ids.length ? await Student.findAll({
      where: { id: ids, school_id: school.id },
      attributes: ['id', 'admission_number', 'classroom_id'],
      include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }],
    }) : [];
    const classIds = [...new Set(studentRows.map(s => s.classroom_id).filter(Boolean))];
    const classRows = classIds.length
      ? await Class.findAll({ where: { id: classIds }, attributes: ['id', 'name'] })
      : [];
    const classNameById = Object.fromEntries(classRows.map(c => [c.id, c.name]));
    const studentById = new Map(studentRows.map(s => [s.id, s]));

    const students = list
      .filter(e => studentById.has(e.student_id)) // tenant guard: only this school's students
      .map(e => {
        const s = studentById.get(e.student_id);
        return {
          student_id: e.student_id,
          name: `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.trim() || `Student #${s.id}`,
          admission_number: s.admission_number || '',
          class_name: s.classroom_id ? (classNameById[s.classroom_id] || '') : '',
          avg_total: e.avg_total,
          attendance_rate: e.attendance_rate,
          reasons: e.reasons,
          severity: e.severity,
        };
      });

    return res.json(successResponse({
      students,
      term: term?.name || null,
      has_data: hasData,
    }));
  } catch (err) {
    console.error('getAtRisk Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch at-risk students`));
  }
}

/**
 * Principal-scoped student profile (GET /api/principal/students/:id/).
 * 404 unless the student belongs to the resolved school — this is the tenant
 * gate that lets the drawer render without the teacher-only endpoints.
 */
async function getStudentProfile(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return noSchoolResponse(req, res);

    const student = await Student.findOne({
      where: { id: req.params.id, school_id: school.id },
      attributes: ['id', 'admission_number', 'classroom_id', 'status', 'gender'],
      include: [
        { model: User, as: 'user', attributes: ['first_name', 'last_name'] },
        { model: Class, as: 'classroom', attributes: ['id', 'name'] },
      ],
    });
    if (!student) return res.status(404).json(errorResponse('Student not found'));

    const term = await Term.findOne({ where: { school_id: school.id, is_active: true } });
    const grades = term ? await Grade.findAll({
      where: { student_id: student.id, school_id: school.id, term_id: term.id },
      include: [{ model: Subject, as: 'subject', attributes: ['name', 'code'] }],
      order: [['id', 'ASC']],
    }) : [];

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const attendanceRows = await Attendance.findAll({
      where: { student_id: student.id, school_id: school.id, date: { [Op.gte]: since } },
      attributes: ['status'],
    });
    const counts = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const a of attendanceRows) {
      const st = ['present', 'absent', 'late', 'excused'].includes(a.status) ? a.status : 'present';
      counts[st] += 1;
    }
    const attTotal = attendanceRows.length;
    const rate30 = attTotal ? Math.round(((counts.present + counts.late) / attTotal) * 100) : null;

    return res.json(successResponse({
      student: {
        id: student.id,
        name: `${student.user?.first_name || ''} ${student.user?.last_name || ''}`.trim() || `Student #${student.id}`,
        admission_number: student.admission_number || '',
        class_name: student.classroom?.name || '',
        status: student.status || null,
        gender: student.gender || null,
      },
      term: term?.name || null,
      grades: grades.map(g => ({
        id: g.id,
        subject_name: g.subject?.name || '',
        subject_code: g.subject?.code || '',
        ca: g.ca, midterm: g.midterm, final: g.final, total: g.total,
        grade_letter: g.grade_letter,
        approval_status: g.approval_status,
        is_published: !!g.is_published,
      })),
      attendance: { rate_30d: rate30, total: attTotal, ...counts },
    }));
  } catch (err) {
    console.error('getStudentProfile Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch student profile`));
  }
}

/* ══════════ P1: leadership oversight surfaces ══════════ */

/* Discipline oversight (Module 2 / leadership): read-only view over the
   behaviour-incident feature teachers already write to. School-scoped,
   filterable by severity/type, with student + reporter names resolved. */
async function getDisciplineIncidents(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return noSchoolResponse(req, res);

    const BehaviourIncident = require('../models/BehaviourIncident');
    const where = { school_id: school.id };
    if (req.query.severity) where.severity = String(req.query.severity);
    if (req.query.type) where.incident_type = String(req.query.type);

    const rows = await BehaviourIncident.findAll({
      where, order: [['created_at', 'DESC']], limit: 200, raw: true,
    });

    const studentIds = [...new Set(rows.map(r => r.student_id).filter(Boolean))];
    // reported_by references pruh_core_teacher(id), NOT users(id) — resolve the
    // teacher's linked user for the display name.
    const reporterIds = [...new Set(rows.map(r => r.reported_by).filter(Boolean))];
    const [students, reporters] = await Promise.all([
      studentIds.length ? Student.findAll({
        where: { id: studentIds, school_id: school.id },
        include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }],
      }) : [],
      reporterIds.length ? Teacher.findAll({
        where: { id: reporterIds, school_id: school.id },
        include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }],
      }) : [],
    ]);
    const nameOfStudent = {};
    students.forEach(s => { nameOfStudent[s.id] = s.user ? `${s.user.first_name || ''} ${s.user.last_name || ''}`.trim() : `Student #${s.id}`; });
    const nameOfUser = {};
    reporters.forEach(t => { nameOfUser[t.id] = t.user ? `${t.user.first_name || ''} ${t.user.last_name || ''}`.trim() : `Teacher #${t.id}`; });

    // Small aggregate strip for the page header.
    const bySeverity = {};
    rows.forEach(r => { const k = (r.severity || 'unspecified'); bySeverity[k] = (bySeverity[k] || 0) + 1; });

    return res.json(successResponse({
      summary: { total: rows.length, by_severity: bySeverity, follow_ups: rows.filter(r => r.follow_up_required).length },
      incidents: rows.map(r => ({
        id: r.id,
        student_id: r.student_id,
        student_name: nameOfStudent[r.student_id] || `Student #${r.student_id}`,
        reported_by: r.reported_by ? (nameOfUser[r.reported_by] || `User #${r.reported_by}`) : 'System',
        type: r.incident_type || '—',
        title: r.title || '—',
        severity: r.severity || 'unspecified',
        description: r.description || '',
        action_taken: r.action_taken || '',
        follow_up_required: !!r.follow_up_required,
        follow_up_date: r.follow_up_date,
        parent_notified: !!r.parent_notified,
        created_at: r.created_at,
      })),
    }));
  } catch (err) {
    console.error('getDisciplineIncidents Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch discipline incidents`));
  }
}

/* Timetable oversight (Module 2): the school's persisted timetable slots,
   grouped by class, with subject/teacher/room resolved — read-only. */
async function getTimetableOversight(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return noSchoolResponse(req, res);

    const where = { school_id: school.id };
    if (req.query.class_id) where.class_id = req.query.class_id;
    if (req.query.teacher_id) where.teacher_id = req.query.teacher_id;

    const slots = await TimetableSlot.findAll({ where, order: [['class_id', 'ASC'], ['day', 'ASC'], ['period', 'ASC']], raw: true });
    if (!slots.length) return res.json(successResponse({ classes: [], has_timetable: false }));

    const classIds = [...new Set(slots.map(s => s.class_id).filter(Boolean))];
    const subjectIds = [...new Set(slots.map(s => s.subject_id).filter(Boolean))];
    const teacherIds = [...new Set(slots.map(s => s.teacher_id).filter(Boolean))];
    const [classes, subjects, teachers] = await Promise.all([
      classIds.length ? Class.findAll({ where: { id: classIds }, attributes: ['id', 'name'], raw: true }) : [],
      subjectIds.length ? Subject.findAll({ where: { id: subjectIds }, attributes: ['id', 'name'], raw: true }) : [],
      teacherIds.length ? Teacher.findAll({ where: { id: teacherIds }, include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }] }) : [],
    ]);
    const cName = Object.fromEntries(classes.map(c => [c.id, c.name]));
    const sName = Object.fromEntries(subjects.map(s => [s.id, s.name]));
    const tName = {};
    teachers.forEach(t => { tName[t.id] = t.user ? `${t.user.first_name || ''} ${t.user.last_name || ''}`.trim() : `Teacher #${t.id}`; });

    const byClass = {};
    for (const s of slots) {
      const cid = s.class_id;
      byClass[cid] = byClass[cid] || { class_id: cid, class_name: cName[cid] || `Class #${cid}`, slots: [] };
      byClass[cid].slots.push({
        day: s.day, period: s.period,
        subject: s.subject_id ? (sName[s.subject_id] || '—') : (s.is_break ? 'Break' : '—'),
        teacher: s.teacher_id ? (tName[s.teacher_id] || '—') : '',
        room: s.room || '', start_time: s.start_time, end_time: s.end_time, is_break: !!s.is_break,
      });
    }

    return res.json(successResponse({ has_timetable: true, classes: Object.values(byClass) }));
  } catch (err) {
    console.error('getTimetableOversight Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch timetable`));
  }
}

/* Teacher roster oversight (leadership): the real staff list with per-teacher
   load (classes taught, subjects, weekly periods) — replaces the 3-number widget. */
async function getTeacherRoster(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return noSchoolResponse(req, res);

    const teachers = await Teacher.findAll({
      where: { school_id: school.id },
      include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name', 'email', 'phone', 'is_active'] }],
      order: [['id', 'ASC']],
    });
    if (!teachers.length) return res.json(successResponse({ teachers: [] }));

    const slots = await TimetableSlot.findAll({
      where: { school_id: school.id, teacher_id: { [Op.ne]: null } },
      attributes: ['teacher_id', 'subject_id', 'class_id'], raw: true,
    });
    const load = {};
    slots.forEach(s => {
      load[s.teacher_id] = load[s.teacher_id] || { periods: 0, classes: new Set(), subjects: new Set() };
      load[s.teacher_id].periods += 1;
      if (s.class_id) load[s.teacher_id].classes.add(s.class_id);
      if (s.subject_id) load[s.teacher_id].subjects.add(s.subject_id);
    });

    return res.json(successResponse({
      teachers: teachers.map(t => {
        const l = load[t.id] || { periods: 0, classes: new Set(), subjects: new Set() };
        return {
          id: t.id,
          name: t.user ? `${t.user.first_name || ''} ${t.user.last_name || ''}`.trim() : `Teacher #${t.id}`,
          email: t.user?.email || '',
          phone: t.user?.phone || '',
          is_active: t.user ? t.user.is_active !== false : true,
          weekly_periods: l.periods,
          classes_taught: l.classes.size,
          subjects_taught: l.subjects.size,
        };
      }),
    }));
  } catch (err) {
    console.error('getTeacherRoster Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch teacher roster`));
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
  getGradeAudit,
  getAcademicsAnalytics,
  postAnnouncement,
  listAnnouncements,
  getAtRisk,
  getStudentProfile,
  // P1 oversight surfaces
  getDisciplineIncidents, getTimetableOversight, getTeacherRoster,
};
