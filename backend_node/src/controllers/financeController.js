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
const { appendSecurityAuditLog } = require('../utils/auditLog');

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
    return res.status(500).json(errorResponse(`Failed to fetch finance stats`));
  }
}

async function getFinanceAnalytics(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { date_from, date_to } = req.query;
    const payWhere = { school_id: school.id, status: 'completed' };
    const expWhere = { school_id: school.id, status: 'approved' };
    if (date_from || date_to) {
      payWhere.paid_at = {};
      expWhere.date = {};
      if (date_from) { payWhere.paid_at[Op.gte] = date_from; expWhere.date[Op.gte] = date_from; }
      if (date_to)   { payWhere.paid_at[Op.lte] = date_to;   expWhere.date[Op.lte] = date_to; }
    }

    // SQL-side aggregation — unaffected by the 200-row ledger caps
    const payMonth = sequelize.literal("DATE_FORMAT(paid_at, '%Y-%m')");
    const expMonth = sequelize.literal("DATE_FORMAT(date, '%Y-%m')");

    const [monthlyRevenue, monthlyExpenses, methods, expenseCategories] = await Promise.all([
      Payment.findAll({
        where: payWhere,
        attributes: [
          [payMonth, 'month'],
          [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: [payMonth],
        order: [[payMonth, 'ASC']],
        raw: true,
      }),
      Expense.findAll({
        where: expWhere,
        attributes: [
          [expMonth, 'month'],
          [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        ],
        group: [expMonth],
        order: [[expMonth, 'ASC']],
        raw: true,
      }),
      Payment.findAll({
        where: payWhere,
        attributes: [
          'payment_method',
          [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['payment_method'],
        order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
        raw: true,
      }),
      Expense.findAll({
        where: expWhere,
        attributes: [
          'category',
          [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['category'],
        order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
        raw: true,
      }),
    ]);

    // Merge revenue + expenses into one month-keyed series
    const monthMap = new Map();
    for (const r of monthlyRevenue) {
      monthMap.set(r.month, {
        month: r.month,
        revenue: Math.round(Number(r.total || 0) * 100) / 100,
        expenses: 0,
        payments: Number(r.count || 0),
      });
    }
    for (const e of monthlyExpenses) {
      const row = monthMap.get(e.month)
        || { month: e.month, revenue: 0, expenses: 0, payments: 0 };
      row.expenses = Math.round(Number(e.total || 0) * 100) / 100;
      monthMap.set(e.month, row);
    }
    const monthly = [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month));

    // Top outstanding balances (all-time fee ledger, not date-filtered)
    const debtorRows = await Fee.findAll({
      where: { school_id: school.id, status: { [Op.in]: ['pending', 'partial'] } },
      attributes: [
        'student_id',
        [sequelize.fn('SUM', sequelize.literal('amount_due - amount_paid')), 'balance'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'open_fees'],
      ],
      group: ['student_id'],
      order: [[sequelize.literal('balance'), 'DESC']],
      limit: 8,
      raw: true,
    });
    const debtorStudents = debtorRows.length
      ? await Student.findAll({
          where: { id: { [Op.in]: debtorRows.map(d => d.student_id) } },
          include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }],
        })
      : [];
    const studentById = new Map(debtorStudents.map(s => [String(s.id), s]));
    const topDebtors = debtorRows
      .map(d => {
        const s = studentById.get(String(d.student_id));
        return {
          student_id: d.student_id,
          student_name: s ? `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.trim() : 'Unknown',
          admission_number: s?.admission_number || '',
          balance: Math.round(Number(d.balance || 0) * 100) / 100,
          open_fees: Number(d.open_fees || 0),
        };
      })
      .filter(d => d.balance > 0);

    const revenue = monthly.reduce((sum, m) => sum + m.revenue, 0);
    const expensesTotal = monthly.reduce((sum, m) => sum + m.expenses, 0);
    const paymentCount = monthly.reduce((sum, m) => sum + m.payments, 0);
    const largestPayment = await Payment.max('amount', { where: payWhere }) || 0;

    return res.json(successResponse({
      summary: {
        revenue: Math.round(revenue * 100) / 100,
        expenses: Math.round(expensesTotal * 100) / 100,
        net: Math.round((revenue - expensesTotal) * 100) / 100,
        payment_count: paymentCount,
        avg_payment: paymentCount ? Math.round((revenue / paymentCount) * 100) / 100 : 0,
        largest_payment: Math.round(Number(largestPayment) * 100) / 100,
      },
      monthly,
      methods: methods.map(m => ({
        method: m.payment_method || 'other',
        total: Math.round(Number(m.total || 0) * 100) / 100,
        count: Number(m.count || 0),
      })),
      expense_categories: expenseCategories.map(c => ({
        category: c.category || 'general',
        total: Math.round(Number(c.total || 0) * 100) / 100,
        count: Number(c.count || 0),
      })),
      top_debtors: topDebtors,
    }));
  } catch (err) {
    console.error('getFinanceAnalytics Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch finance analytics`));
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
        { model: FeeCategory, as: 'feeCategory', attributes: ['id', 'name', 'frequency'] },
        { model: Student, as: 'student', include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }] },
        { model: Term, as: 'term', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
      limit: 200,
    });

    const formatted = fees.map(f => ({
      id: f.id,
      student_id: f.student_id,
      student_name: f.student ? `${f.student.user?.first_name || ''} ${f.student.user?.last_name || ''}`.trim() : '',
      admission_number: f.student?.admission_number || '',
      category_id: f.fee_category_id,
      category_name: f.feeCategory?.name || '',
      term_id: f.term_id,
      term_name: f.term?.name || '',
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
    return res.status(500).json(errorResponse(`Failed to fetch fees`));
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
    return res.status(500).json(errorResponse(`Failed to create fee category`));
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
    return res.status(500).json(errorResponse(`Failed to fetch fee categories`));
  }
}

async function assignFees(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const school = await getSchoolFromUser(req);
    if (!school) { await transaction.rollback(); return res.status(401).json(errorResponse('Not authenticated')); }

    const { fee_category_id, student_ids, term_id, discount } = req.body;
    if (!fee_category_id || !student_ids || !student_ids.length) {
      await transaction.rollback();
      return res.status(400).json(errorResponse('fee_category_id and student_ids are required'));
    }

    // Scope every client-supplied id to the caller's school (prevents pulling a
    // foreign school's category/term, or assigning fees to another school's students).
    const category = await FeeCategory.findOne({ where: { id: fee_category_id, school_id: school.id } });
    if (!category) { await transaction.rollback(); return res.status(404).json(errorResponse('Fee category not found')); }

    const term = term_id ? await Term.findOne({ where: { id: term_id, school_id: school.id } }) : null;
    if (term_id && !term) { await transaction.rollback(); return res.status(404).json(errorResponse('Term not found')); }

    const schoolStudents = await Student.findAll({
      where: { id: student_ids, school_id: school.id },
      attributes: ['id'],
      transaction,
    });
    const validIds = new Set(schoolStudents.map((s) => String(s.id)));
    if (!validIds.size) { await transaction.rollback(); return res.status(404).json(errorResponse('No matching students in this school')); }

    let count = 0;
    for (const sid of student_ids) {
      if (!validIds.has(String(sid))) continue; // skip ids that aren't this school's students
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
    return res.status(500).json(errorResponse(`Failed to assign fees`));
  }
}

async function recordPayment(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const school = await getSchoolFromUser(req);
    if (!school) { await transaction.rollback(); return res.status(401).json(errorResponse('Not authenticated')); }

    const { student_id, fee_id, amount, payment_method, reference, notes, paid_by } = req.body;
    if (!student_id || !amount) { await transaction.rollback(); return res.status(400).json(errorResponse('student_id and amount are required')); }

    // Validate the student belongs to this school before writing any payment row
    // (reused below for the notification, so no second lookup is needed).
    const student = await Student.findOne({
      where: { id: student_id, school_id: school.id },
      include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }],
      transaction,
    });
    if (!student) { await transaction.rollback(); return res.status(404).json(errorResponse('Student not found in this school')); }

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
      // Scope the fee to this school so a foreign fee_id can't be mutated.
      const fee = await Fee.findOne({ where: { id: fee_id, school_id: school.id }, transaction });
      if (fee) {
        const newPaid = (fee.amount_paid || 0) + amount;
        await fee.update({
          amount_paid: newPaid,
          status: newPaid >= fee.amount_due ? 'paid' : 'partial',
        }, { transaction });
      }
    }

    await Notification.create({
      school_id: school.id,
      title: 'Payment Received',
      message: `Payment of ${amount} received for ${student ? `${student.user?.first_name} ${student.user?.last_name}` : 'student'} (Receipt: ${receiptNumber})`,
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
    return res.status(500).json(errorResponse(`Failed to record payment`));
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
      include: [{ model: Student, as: 'student', include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }] }],
      order: [['paid_at', 'DESC']],
      limit: 200,
    });

    const formatted = payments.map(p => ({
      id: p.id,
      student_id: p.student_id,
      student_name: p.student ? `${p.student.user?.first_name} ${p.student.user?.last_name}`.trim() : '',
      admission_number: p.student?.admission_number || '',
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
    return res.status(500).json(errorResponse(`Failed to fetch payments`));
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
        { model: FeeCategory, as: 'feeCategory', attributes: ['id', 'name', 'frequency'] },
        { model: Term, as: 'term', attributes: ['id', 'name'] },
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
    return res.status(500).json(errorResponse(`Failed to fetch student fees`));
  }
}

async function recordExpense(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { description, amount, category, date, receipt_path } = req.body;
    if (!description || !amount) return res.status(400).json(errorResponse('Description and amount are required'));

    // Bursar/admin records the expense → it starts PENDING and must be approved by a
    // principal/school_admin/superadmin before it counts against the books. No self-approval.
    const expense = await Expense.create({
      school_id: school.id,
      category: category || 'general',
      description,
      amount,
      date: date || new Date(),
      receipt_path: receipt_path || null,
      created_by: req.user?.id || null,
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

    return res.json(successResponse({ expense }, 'Expense recorded — pending approval'));
  } catch (err) {
    console.error('recordExpense Error:', err);
    return res.status(500).json(errorResponse(`Failed to record expense`));
  }
}

async function getExpenses(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { category, date_from, date_to, status } = req.query;
    const where = { school_id: school.id };
    if (category) where.category = category;
    if (status && ['pending', 'approved', 'rejected'].includes(status)) where.status = status;
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

    // Resolve creator/approver names in one query (no model associations on Expense).
    const userIds = [...new Set(
      expenses.flatMap((e) => [e.created_by, e.approved_by]).filter(Boolean),
    )];
    const nameById = {};
    if (userIds.length) {
      const users = await User.findAll({ where: { id: userIds }, attributes: ['id', 'first_name', 'last_name', 'username'] });
      users.forEach((u) => {
        nameById[u.id] = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || `User #${u.id}`;
      });
    }

    const formatted = expenses.map((e) => ({
      id: e.id,
      school_id: e.school_id,
      category: e.category,
      description: e.description,
      amount: e.amount,
      date: e.date,
      receipt_path: e.receipt_path,
      status: e.status || 'pending',
      created_by: e.created_by,
      created_by_name: e.created_by ? (nameById[e.created_by] || null) : null,
      approved_by: e.approved_by,
      approved_by_name: e.approved_by ? (nameById[e.approved_by] || null) : null,
      approved_at: e.approved_at,
      rejection_reason: e.rejection_reason,
    }));

    // `total` (all-time spend) counts APPROVED expenses only — pending/rejected never
    // hit the books, matching getFinanceStats/getFinanceAnalytics which filter status='approved'.
    const total = await Expense.sum('amount', { where: { school_id: school.id, status: 'approved' } }) || 0;
    const [pending, approved, rejected] = await Promise.all([
      Expense.count({ where: { school_id: school.id, status: 'pending' } }),
      Expense.count({ where: { school_id: school.id, status: 'approved' } }),
      Expense.count({ where: { school_id: school.id, status: 'rejected' } }),
    ]);
    const pending_total = await Expense.sum('amount', { where: { school_id: school.id, status: 'pending' } }) || 0;

    return res.json(successResponse({
      expenses: formatted,
      total,
      pending_total,
      counts: { pending, approved, rejected },
    }));
  } catch (err) {
    console.error('getExpenses Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch expenses`));
  }
}

// POST /api/finance/expenses/:id/review/  { action: 'approve'|'reject', reason? }
// Gated at the route to principal/school_admin/superadmin. The bursar who recorded an
// expense can NOT approve it — separation of duties.
async function reviewExpense(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { id } = req.params;
    const { action, reason } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json(errorResponse('Action must be approve or reject'));
    }
    if (action === 'reject' && !(reason && String(reason).trim())) {
      return res.status(400).json(errorResponse('A reason is required to reject an expense'));
    }

    const expense = await Expense.findOne({ where: { id, school_id: school.id } });
    if (!expense) return res.status(404).json(errorResponse('Expense not found'));
    // Separation of duties enforced at the INDIVIDUAL level (not just role): whoever
    // recorded the expense can never approve/reject it — even a principal/school_admin.
    if (expense.created_by && req.user?.id && String(expense.created_by) === String(req.user.id)) {
      return res.status(403).json(errorResponse('You cannot review an expense you recorded — it must be approved by someone else.'));
    }
    if (expense.status !== 'pending') {
      // 409 Conflict: the resource is in a state that forbids the action (already reviewed),
      // not a malformed request. Guards against double-review races / client retries.
      return res.status(409).json(errorResponse(`Expense is already ${expense.status} and cannot be reviewed again`));
    }

    await expense.update({
      status: action === 'approve' ? 'approved' : 'rejected',
      approved_by: req.user?.id || null,
      approved_at: new Date(),
      rejection_reason: action === 'reject' ? String(reason).trim() : null,
    });

    await appendSecurityAuditLog({
      type: 'expense_review',
      severity: 'info',
      actor: req.user?.username || String(req.user?.id || 'unknown'),
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '—',
      action: `Expense #${expense.id} ${action}d (amount ${expense.amount}, school ${school.id}) by ${req.user?.role || 'unknown'}`,
      metadata: {
        expense_id: expense.id,
        action,
        school_id: school.id,
        amount: expense.amount,
        reason: action === 'reject' ? String(reason).trim() : null,
      },
    });

    return res.json(successResponse({ id: expense.id, status: expense.status }, `Expense ${action}d`));
  } catch (err) {
    console.error('reviewExpense Error:', err);
    return res.status(500).json(errorResponse(`Failed to review expense`));
  }
}

async function getFinanceUsers(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const admins = await SchoolAdmin.findAll({
      where: { school_id: school.id },
      // NOTE: the User model has no `phone` column — selecting it threw
      // "Unknown column 'user.phone'" and 500'd every finance-users fetch.
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'first_name', 'last_name', 'email'] }],
      order: [['id', 'DESC']], // pruh_core_schooladmin has timestamps:false / no created_at
    });

    const users = admins.map(a => ({
      id: a.id,
      full_name: `${a.user?.first_name || ''} ${a.user?.last_name || ''}`.trim() || a.user?.username,
      email: a.user?.email,
      phone: a.user?.phone,
      username: a.user?.username,
      is_active: a.is_active !== false,
      role: a.role || 'Bursar',
      access_level: a.access_level || 'Full',
      created_at: a.created_at,
    }));

    return res.json(successResponse({ finance_users: users }));
  } catch (err) {
    console.error('getFinanceUsers Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch finance users`));
  }
}

async function createFinanceUser(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { full_name, email, phone, username, password, role, access_level } = req.body;
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password || 'Finance@123', 10);
    const { requireRoleId } = require('../utils/roleIds');
    const bursarRoleId = await requireRoleId('bursar');

    const user = await User.create({
      username: username || email,
      email,
      phone,
      password: hashedPassword,
      first_name: full_name?.split(' ')[0] || '',
      last_name: full_name?.split(' ').slice(1).join(' ') || '',
      role_id: bursarRoleId,
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
    return res.status(500).json(errorResponse(`Failed to create finance user`));
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
    return res.status(500).json(errorResponse(`Failed to update`));
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
    return res.status(500).json(errorResponse(`Failed to review`));
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
      include: [{ model: Student, as: 'student', include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }] }],
      order: [['paid_at', 'DESC']],
      limit: 10,
    });

    const transactions = recentPayments.map(p => ({
      id: p.id,
      student_name: p.student ? `${p.student.user?.first_name} ${p.student.user?.last_name}`.trim() : '',
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
  getFinanceStats, getFinanceAnalytics, getFinanceFees, recordExpense, getExpenses, reviewExpense,
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
