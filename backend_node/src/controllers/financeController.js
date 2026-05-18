const { Op } = require('sequelize');
const sequelize = require('../config/db');
const User = require('../models/User');
const SchoolAdmin = require('../models/SchoolAdmin');
const Student = require('../models/Student');
const Grade = require('../models/Grade');
const Attendance = require('../models/Attendance');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Term = require('../models/Term');
const AcademicYear = require('../models/AcademicYear');
const SecurityAuditLog = require('../models/SecurityAuditLog');
const Notification = require('../models/Notification');
const FeeCategory = require('../models/FeeCategory');
const Fee = require('../models/Fee');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const Subject = require('../models/Subject');

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

async function getFinanceStats(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const totalCollected = await Payment.sum('amount', { where: { school_id: school.id, status: 'completed' } }) || 0;
    const totalDue = await Fee.sum('amount_due', { where: { school_id: school.id } }) || 0;
    const totalPaid = await Fee.sum('amount_paid', { where: { school_id: school.id } }) || 0;
    const outstanding = totalDue - totalPaid;
    const totalExpenses = await Expense.sum('amount', { where: { school_id: school.id, status: 'approved' } }) || 0;
    const totalStudents = await Student.count({ where: { school_id: school.id, status: 'active' } });

    return res.json(successResponse({
      total_collected: Math.round(totalCollected * 100) / 100,
      outstanding_balance: Math.round(outstanding * 100) / 100,
      expenses: Math.round(totalExpenses * 100) / 100,
      balance: Math.round((totalCollected - totalExpenses) * 100) / 100,
      total_students: totalStudents,
    }));
  } catch (err) {
    console.error('getFinanceStats Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch finance stats: ${err.message}`));
  }
}

async function getFinanceFees(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { class_id, status, student_id } = req.query;
    const where = { school_id: school.id };
    if (class_id) {
      const students = await Student.findAll({ where: { classroom_id: class_id, school_id: school.id }, attributes: ['id'] });
      where.student_id = { [Op.in]: students.map(s => s.id) };
    }
    if (student_id) where.student_id = student_id;
    if (status) where.status = status;

    const fees = await Fee.findAll({
      where,
      include: [
        { model: FeeCategory, attributes: ['id', 'name', 'frequency'] },
        { model: Student, include: [{ model: User, attributes: ['first_name', 'last_name'] }] },
        { model: Term, attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
      limit: 200,
    });

    const formatted = fees.map(f => ({
      id: f.id,
      student_id: f.student_id,
      student_name: f.Student ? `${f.Student.User?.first_name || ''} ${f.Student.User?.last_name || ''}`.trim() : '',
      admission_number: f.Student?.admission_number || '',
      category_id: f.fee_category_id,
      category_name: f.FeeCategory?.name || '',
      term_id: f.term_id,
      term_name: f.Term?.name || '',
      amount: f.amount,
      discount: f.discount,
      amount_due: f.amount_due,
      amount_paid: f.amount_paid,
      balance: f.amount_due - f.amount_paid,
      status: f.status,
      due_date: f.due_date,
      created_at: f.created_at,
    }));

    return res.json(successResponse({ fees: formatted }));
  } catch (err) {
    console.error('getFinanceFees Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch fees: ${err.message}`));
  }
}

async function createFeeCategory(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { name, description, amount, frequency, applicable_classes } = req.body;
    if (!name || amount == null) return res.status(400).json(errorResponse('Name and amount are required'));

    const category = await FeeCategory.create({
      school_id: school.id, name, description, amount,
      frequency: frequency || 'term',
      applicable_classes: applicable_classes ? JSON.stringify(applicable_classes) : null,
    });

    return res.json(successResponse({ category }, 'Fee category created'));
  } catch (err) {
    console.error('createFeeCategory Error:', err);
    return res.status(500).json(errorResponse(`Failed to create fee category: ${err.message}`));
  }
}

async function getFeeCategories(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const categories = await FeeCategory.findAll({
      where: { school_id: school.id },
      order: [['name', 'ASC']],
    });

    return res.json(successResponse({ categories }));
  } catch (err) {
    console.error('getFeeCategories Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch fee categories: ${err.message}`));
  }
}

async function assignFees(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { fee_category_id, student_ids, term_id, discount } = req.body;
    if (!fee_category_id || !student_ids || !student_ids.length) {
      return res.status(400).json(errorResponse('fee_category_id and student_ids are required'));
    }

    const category = await FeeCategory.findByPk(fee_category_id);
    if (!category) return res.status(404).json(errorResponse('Fee category not found'));

    const term = term_id ? await Term.findByPk(term_id) : null;

    let count = 0;
    for (const sid of student_ids) {
      const existing = await Fee.findOne({
        where: { school_id: school.id, student_id: sid, fee_category_id, term_id: term?.id || null },
        transaction,
      });
      if (existing) continue;

      const disc = discount || 0;
      const amountDue = category.amount - disc;

      await Fee.create({
        school_id: school.id,
        student_id: sid,
        fee_category_id,
        term_id: term?.id || null,
        amount: category.amount,
        discount: disc,
        amount_due: amountDue,
        amount_paid: 0,
        status: 'pending',
        due_date: term?.end_date || null,
      }, { transaction });

      count++;
    }

    await transaction.commit();
    return res.json(successResponse({ count }, `${count} fee(s) assigned`));
  } catch (err) {
    await transaction.rollback();
    console.error('assignFees Error:', err);
    return res.status(500).json(errorResponse(`Failed to assign fees: ${err.message}`));
  }
}

async function recordPayment(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { student_id, fee_id, amount, payment_method, reference, notes, paid_by } = req.body;
    if (!student_id || !amount) return res.status(400).json(errorResponse('student_id and amount are required'));

    const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}`;
    const paymentHash = `${student_id}-${fee_id || 'none'}-${amount}-${Date.now()}`.replace(/[^a-zA-Z0-9-]/g, '');

    const payment = await Payment.create({
      school_id: school.id,
      student_id,
      fee_id: fee_id || null,
      amount,
      payment_method: payment_method || 'cash',
      reference: reference || null,
      receipt_number: receiptNumber,
      payment_hash: paymentHash,
      status: 'completed',
      notes: notes || null,
      paid_by: paid_by || null,
    }, { transaction });

    if (fee_id) {
      const fee = await Fee.findByPk(fee_id, { transaction });
      if (fee) {
        const newPaid = (fee.amount_paid || 0) + amount;
        await fee.update({
          amount_paid: newPaid,
          status: newPaid >= fee.amount_due ? 'paid' : 'partial',
        }, { transaction });
      }
    }

    const student = await Student.findByPk(student_id, {
      include: [{ model: User, attributes: ['first_name', 'last_name'] }],
      transaction,
    });

    await Notification.create({
      school_id: school.id,
      title: 'Payment Received',
      message: `Payment of ${amount} received for ${student ? `${student.User?.first_name} ${student.User?.last_name}` : 'student'} (Receipt: ${receiptNumber})`,
      type: 'info',
      is_read: false,
    }, { transaction });

    await transaction.commit();
    return res.json(successResponse({
      payment: {
        id: payment.id,
        amount: payment.amount,
        receipt_number: payment.receipt_number,
        payment_hash: payment.payment_hash,
        payment_method: payment.payment_method,
        paid_at: payment.paid_at,
      },
    }, 'Payment recorded'));
  } catch (err) {
    await transaction.rollback();
    console.error('recordPayment Error:', err);
    return res.status(500).json(errorResponse(`Failed to record payment: ${err.message}`));
  }
}

async function getPayments(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { student_id, date_from, date_to } = req.query;
    const where = { school_id: school.id };
    if (student_id) where.student_id = student_id;
    if (date_from || date_to) {
      where.paid_at = {};
      if (date_from) where.paid_at[Op.gte] = date_from;
      if (date_to) where.paid_at[Op.lte] = date_to;
    }

    const payments = await Payment.findAll({
      where,
      include: [{ model: Student, include: [{ model: User, attributes: ['first_name', 'last_name'] }] }],
      order: [['paid_at', 'DESC']],
      limit: 200,
    });

    const formatted = payments.map(p => ({
      id: p.id,
      student_id: p.student_id,
      student_name: p.Student ? `${p.Student.User?.first_name} ${p.Student.User?.last_name}`.trim() : '',
      admission_number: p.Student?.admission_number || '',
      amount: p.amount,
      payment_method: p.payment_method,
      receipt_number: p.receipt_number,
      payment_hash: p.payment_hash,
      reference: p.reference,
      status: p.status,
      notes: p.notes,
      paid_by: p.paid_by,
      paid_at: p.paid_at,
    }));

    return res.json(successResponse({ payments: formatted }));
  } catch (err) {
    console.error('getPayments Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch payments: ${err.message}`));
  }
}

async function getStudentFees(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { student_id } = req.params;
    if (!student_id) return res.status(400).json(errorResponse('student_id is required'));

    const fees = await Fee.findAll({
      where: { school_id: school.id, student_id },
      include: [
        { model: FeeCategory, attributes: ['id', 'name', 'frequency'] },
        { model: Term, attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    });

    const payments = await Payment.findAll({
      where: { school_id: school.id, student_id },
      order: [['paid_at', 'DESC']],
    });

    const totalDue = fees.reduce((sum, f) => sum + (f.amount_due || 0), 0);
    const totalPaid = fees.reduce((sum, f) => sum + (f.amount_paid || 0), 0);

    return res.json(successResponse({
      fees,
      payments,
      summary: { total_due: totalDue, total_paid: totalPaid, balance: totalDue - totalPaid },
    }));
  } catch (err) {
    console.error('getStudentFees Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch student fees: ${err.message}`));
  }
}

async function recordExpense(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { description, amount, category, date, receipt_path } = req.body;
    if (!description || !amount) return res.status(400).json(errorResponse('Description and amount are required'));

    const expense = await Expense.create({
      school_id: school.id,
      category: category || 'general',
      description,
      amount,
      date: date || new Date(),
      receipt_path: receipt_path || null,
    });

    return res.json(successResponse({ expense }, 'Expense recorded'));
  } catch (err) {
    console.error('recordExpense Error:', err);
    return res.status(500).json(errorResponse(`Failed to record expense: ${err.message}`));
  }
}

async function getExpenses(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { category, date_from, date_to } = req.query;
    const where = { school_id: school.id };
    if (category) where.category = category;
    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date[Op.gte] = date_from;
      if (date_to) where.date[Op.lte] = date_to;
    }

    const expenses = await Expense.findAll({
      where,
      order: [['date', 'DESC']],
      limit: 200,
    });

    const total = await Expense.sum('amount', { where: { school_id: school.id } }) || 0;

    return res.json(successResponse({ expenses, total }));
  } catch (err) {
    console.error('getExpenses Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch expenses: ${err.message}`));
  }
}

async function getFinanceUsers(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const admins = await SchoolAdmin.findAll({
      where: { school_id: school.id },
      include: [{ model: User, attributes: ['id', 'username', 'first_name', 'last_name', 'email', 'phone'] }],
      order: [['created_at', 'DESC']],
    });

    const users = admins.map(a => ({
      id: a.id,
      full_name: `${a.User?.first_name || ''} ${a.User?.last_name || ''}`.trim() || a.User?.username,
      email: a.User?.email,
      phone: a.User?.phone,
      username: a.User?.username,
      is_active: a.is_active !== false,
      role: a.role || 'Bursar',
      access_level: a.access_level || 'Full',
      created_at: a.created_at,
    }));

    return res.json(successResponse({ finance_users: users }));
  } catch (err) {
    console.error('getFinanceUsers Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch finance users: ${err.message}`));
  }
}

async function createFinanceUser(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { full_name, email, phone, username, password, role, access_level } = req.body;
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password || 'Finance@123', 10);

    const user = await User.create({
      username: username || email,
      email,
      phone,
      password: hashedPassword,
      first_name: full_name?.split(' ')[0] || '',
      last_name: full_name?.split(' ').slice(1).join(' ') || '',
    });

    const admin = await SchoolAdmin.create({
      school_id: school.id,
      user_id: user.id,
      role: role || 'Bursar',
      access_level: access_level || 'Full',
      is_active: true,
    });

    return res.json(successResponse({ id: admin.id }, 'Finance user created'));
  } catch (err) {
    console.error('createFinanceUser Error:', err);
    return res.status(500).json(errorResponse(`Failed to create finance user: ${err.message}`));
  }
}

async function updateFinanceUser(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { id } = req.params;
    const admin = await SchoolAdmin.findOne({ where: { id, school_id: school.id } });
    if (!admin) return res.status(404).json(errorResponse('Finance user not found'));

    await admin.update({ is_active: !admin.is_active });
    return res.json(successResponse({}, 'Status updated'));
  } catch (err) {
    console.error('updateFinanceUser Error:', err);
    return res.status(500).json(errorResponse(`Failed to update: ${err.message}`));
  }
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
      where: { school_id: school.id, grade_letter: null },
    });

    const totalCollected = await Payment.sum('amount', { where: { school_id: school.id, status: 'completed' } }) || 0;
    const totalExpenses = await Expense.sum('amount', { where: { school_id: school.id, status: 'approved' } }) || 0;

    return res.json(successResponse({
      school: { id: school.id },
      metrics: {
        students_total: studentsTotal,
        teachers_total: teachersTotal,
        classrooms_total: classroomsTotal,
        pending_grade_changes: pendingGradeChanges,
        report_cards_pending: 0,
        report_cards_published: 0,
        active_term: activeTerm?.name || null,
        total_collected: Math.round(totalCollected * 100) / 100,
        total_expenses: Math.round(totalExpenses * 100) / 100,
      },
    }));
  } catch (err) {
    console.error('getOverview Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch overview: ${err.message}`));
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
        { model: Student, include: [{ model: User, attributes: ['first_name', 'last_name'] }] },
        { model: Subject, attributes: ['id', 'name', 'code'] },
        { model: Term, attributes: ['id', 'name'] },
        { model: Class, as: 'classroom', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
      limit: 200,
    });

    const formatted = grades.map(g => ({
      id: g.id,
      student_id: g.student_id,
      student_name: g.Student ? `${g.Student.User?.first_name} ${g.Student.User?.last_name}`.trim() : '',
      admission_number: g.Student?.admission_number || '',
      subject_id: g.subject_id,
      subject_name: g.Subject?.name || '',
      subject_code: g.Subject?.code || '',
      term_id: g.term_id,
      term_name: g.Term?.name || '',
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
    return res.status(500).json(errorResponse(`Failed to fetch approvals: ${err.message}`));
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

    let count = 0;
    for (const g of grades) {
      await g.update({
        approval_status: action === 'approve' ? 'approved' : 'rejected',
        approved_by: req.user?.id || null,
        approved_at: new Date(),
      });

      if (comment) {
        const existingRemarks = g.remarks || '';
        const timestamp = new Date().toISOString();
        const newRemark = `[${timestamp}] ${action === 'approve' ? 'Approved' : 'Rejected'}: ${comment}`;
        await g.update({ remarks: existingRemarks ? `${existingRemarks}\n${newRemark}` : newRemark });
      }

      count++;
    }

    return res.json(successResponse({ count }, `${count} grade(s) ${action}d`));
  } catch (err) {
    console.error('reviewGradeChange Error:', err);
    return res.status(500).json(errorResponse(`Failed to review: ${err.message}`));
  }
}

async function listReportCards(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const activeTerm = await Term.findOne({ where: { school_id: school.id, is_active: true } });

    return res.json(successResponse({
      report_cards: [],
      term: activeTerm?.name || null,
    }));
  } catch (err) {
    console.error('listReportCards Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch report cards: ${err.message}`));
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
    const where = { school_id: school.id, term_id, approval_status: 'approved' };
    if (ids) where.student_id = { [Op.in]: ids };

    const grades = await Grade.findAll({ where });
    const publishedStudents = new Set(grades.map(g => g.student_id));

    await Notification.create({
      school_id: school.id,
      title: 'Report Cards Published',
      message: `Report cards for ${term?.name || 'the selected term'} have been published and are now available.`,
      type: 'alert',
      is_read: false,
    });

    return res.json(successResponse({ published_count: publishedStudents.size }, 'Report card published'));
  } catch (err) {
    console.error('publishReportCard Error:', err);
    return res.status(500).json(errorResponse(`Failed to publish: ${err.message}`));
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
    return res.status(500).json(errorResponse(`Failed to save comment: ${err.message}`));
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

    const gradeMods = 0;
    const atRisk = grades.filter(g => g.total && g.total < 40).length;
    const finAnomaly = 0;
    const lowAttend = 0;

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
    return res.status(500).json(errorResponse(`Failed to fetch dashboard: ${err.message}`));
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
          include: [{ model: Grade, attributes: ['total'] }],
        },
      ],
    });

    const performance = classes.map(c => {
      const students = c.students || [];
      const totals = students.flatMap(s => s.Grades?.map(g => g.total) || []).filter(Boolean);
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
    return res.status(500).json(errorResponse(`Failed to fetch class performance: ${err.message}`));
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
    return res.status(500).json(errorResponse(`Failed to fetch teacher insights: ${err.message}`));
  }
}

async function getFinanceSnapshot(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const paymentsToday = await Payment.count({
      where: { school_id: school.id, paid_at: { [Op.gte]: today, [Op.lt]: tomorrow } },
    });

    const revenue = await Payment.sum('amount', { where: { school_id: school.id, status: 'completed' } }) || 0;
    const outstanding = await Fee.sum('amount_due', { where: { school_id: school.id } }) || 0;
    const paid = await Fee.sum('amount_paid', { where: { school_id: school.id } }) || 0;

    const recentPayments = await Payment.findAll({
      where: { school_id: school.id },
      include: [{ model: Student, include: [{ model: User, attributes: ['first_name', 'last_name'] }] }],
      order: [['paid_at', 'DESC']],
      limit: 10,
    });

    const transactions = recentPayments.map(p => ({
      id: p.id,
      student_name: p.Student ? `${p.Student.User?.first_name} ${p.Student.User?.last_name}`.trim() : '',
      amount: p.amount,
      method: p.payment_method,
      receipt: p.receipt_number,
      date: p.paid_at,
    }));

    return res.json(successResponse({
      revenue: Math.round(revenue * 100) / 100,
      outstanding: Math.round((outstanding - paid) * 100) / 100,
      paymentsToday,
      transactions,
    }));
  } catch (err) {
    console.error('getFinanceSnapshot Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch finance: ${err.message}`));
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
    return res.status(500).json(errorResponse(`Failed to fetch activity: ${err.message}`));
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
    return res.status(500).json(errorResponse(`Failed to fetch syllabus: ${err.message}`));
  }
}

module.exports = {
  getFinanceStats, getFinanceFees, recordExpense, getExpenses,
  getFeeCategories, createFeeCategory, assignFees,
  recordPayment, getPayments, getStudentFees,
  getFinanceUsers, createFinanceUser, updateFinanceUser,
  getOverview, listGradeApprovals, reviewGradeChange,
  listReportCards, publishReportCard, commentReportCard,
  getSchoolCommandDashboard,
  getClassPerformance,
  getTeacherInsights,
  getFinanceSnapshot,
  getActivityFeed,
  getSyllabusProgress,
};
