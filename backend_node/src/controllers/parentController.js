const { Op } = require('sequelize');
const sequelize = require('../config/db');
const Student = require('../models/Student');
const User = require('../models/User');
const Class = require('../models/Class');
const Grade = require('../models/Grade');
const Term = require('../models/Term');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const Teacher = require('../models/Teacher');
const Notification = require('../models/Notification');
const SecurityAuditLog = require('../models/SecurityAuditLog');
const ForensicEvent = require('../models/ForensicEvent');
const Fee = require('../models/Fee');
const Payment = require('../models/Payment');
const FeeCategory = require('../models/FeeCategory');
const BehaviourIncident = require('../models/BehaviourIncident');
const ModificationRequest = require('../models/ModificationRequest');
const ChannelPreference = require('../models/ChannelPreference');
const WhistleblowerCategory = require('../models/WhistleblowerCategory');
const WhistleblowerReport = require('../models/WhistleblowerReport');
const ConferenceSlot = require('../models/ConferenceSlot');
const Message = require('../models/Message');
const CoGuardian = require('../models/CoGuardian');
const PickupPerson = require('../models/PickupPerson');
const PermissionSlip = require('../models/PermissionSlip');
const PermissionSlipSignature = require('../models/PermissionSlipSignature');
const Acknowledgment = require('../models/Acknowledgment');
const DonationCampaign = require('../models/DonationCampaign');
const Donation = require('../models/Donation');

const successResponse = (data = {}, message = 'Success') => ({ success: true, message, ...data });
const errorResponse = (message) => ({ success: false, message });

async function getParentStudentIds(req) {
  const students = await Student.findAll({
    where: {
      [Op.or]: [
        { user_id: req.user.id },
        { father_phone: req.user.phone },
        { mother_phone: req.user.phone },
        { emergency_phone: req.user.phone },
      ],
      status: 'active',
    },
    attributes: ['id'],
  });
  return students.map(s => s.id);
}

async function getChildren(req, res) {
  try {
    if (!req.user) return res.status(401).json(errorResponse('Not authenticated'));

    const students = await Student.findAll({
      where: {
        [Op.or]: [
          { user_id: req.user.id },
          { father_phone: req.user.phone },
          { mother_phone: req.user.phone },
          { emergency_phone: req.user.phone },
        ],
        status: 'active',
      },
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'first_name', 'last_name', 'email', 'phone'] },
        { model: Class, as: 'classroom', attributes: ['id', 'name'] },
      ],
    });

    const children = students.map(s => ({
      id: s.id,
      full_name: `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.trim(),
      admission_number: s.admission_number,
      class_name: s.classroom?.name || null,
      class_id: s.classroom_id,
      school_id: s.school_id,
      date_of_birth: s.date_of_birth,
      gender: s.gender,
      status: s.status,
      passport_picture: s.passport_picture,
    }));

    const parent = {
      id: req.user.id,
      full_name: `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.username,
      email: req.user.email,
      phone: req.user.phone,
    };

    return res.json(successResponse({ children, parent }));
  } catch (err) {
    console.error('getChildren Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch children: ${err.message}`));
  }
}

async function getChildGrades(req, res) {
  try {
    const { childId } = req.params;
    const { term_id } = req.query;

    const where = { student_id: childId };
    if (term_id) where.term_id = term_id;

    const grades = await Grade.findAll({
      where,
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        { model: Term, as: 'term', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    });

    const formatted = grades.map(g => ({
      id: g.id,
      subject_id: g.subject_id,
      subject: g.subject ? { id: g.subject.id, name: g.subject.name, code: g.subject.code } : null,
      term_id: g.term_id,
      term: g.term ? { id: g.term.id, name: g.term.name } : null,
      ca: g.ca,
      midterm: g.midterm,
      final: g.final,
      total: g.total,
      grade_letter: g.grade_letter,
      remarks: g.remarks,
      created_at: g.created_at,
    }));

    return res.json(successResponse({ grades: formatted }));
  } catch (err) {
    console.error('getChildGrades Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch grades: ${err.message}`));
  }
}

async function getChildGradeHistory(req, res) {
  try {
    const { gradeId } = req.params;

    const events = await ForensicEvent.findAll({
      where: { grade_id: gradeId },
      order: [['created_at', 'DESC']],
    });

    return res.json(successResponse({ history: events }));
  } catch (err) {
    console.error('getChildGradeHistory Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch history: ${err.message}`));
  }
}

async function getChildReportCards(req, res) {
  try {
    const { childId } = req.params;
    const { term_id } = req.query;

    const studentIds = await getParentStudentIds(req);
    if (childId && !studentIds.includes(Number(childId))) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    const where = { student_id: childId };
    if (term_id) where.term_id = term_id;

    const grades = await Grade.findAll({
      where,
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        { model: Term, as: 'term', attributes: ['id', 'name'] },
      ],
      order: [['Subject.name', 'ASC']],
    });

    const attendance = await Attendance.findAll({
      where: { student_id: childId },
      attributes: ['status'],
    });

    const totalAttendance = attendance.length;
    const presentCount = attendance.filter(a => a.status === 'present').length;
    const attendanceRate = totalAttendance ? Math.round(presentCount / totalAttendance * 100) : 0;

    const terms = {};
    grades.forEach(g => {
      const tid = g.term_id;
      if (!terms[tid]) {
        terms[tid] = {
          term: g.term ? { id: g.term.id, name: g.term.name } : null,
          subjects: [],
        };
      }
      terms[tid].subjects.push({
        id: g.id,
        subject: g.subject ? { id: g.subject.id, name: g.subject.name, code: g.subject.code } : null,
        ca: g.ca,
        midterm: g.midterm,
        final: g.final,
        total: g.total,
        grade_letter: g.grade_letter,
        remarks: g.remarks,
      });
    });

    const reportCards = Object.values(terms);

    return res.json(successResponse({ reportCards, attendance_rate: attendanceRate }));
  } catch (err) {
    console.error('getChildReportCards Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch report cards: ${err.message}`));
  }
}

async function downloadChildReportCard(req, res) {
  try {
    const { childId } = req.params;
    const { term_id } = req.query;

    const studentIds = await getParentStudentIds(req);
    if (childId && !studentIds.includes(Number(childId))) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    const where = { student_id: childId };
    if (term_id) where.term_id = term_id;

    const grades = await Grade.findAll({
      where,
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        { model: Term, as: 'term', attributes: ['id', 'name'] },
      ],
      order: [['Subject.name', 'ASC']],
    });

    if (grades.length === 0) {
      return res.status(404).json(errorResponse('Report card not found'));
    }

    const student = await Student.findByPk(childId, {
      include: [
        { model: User, as: 'user', attributes: ['first_name', 'last_name'] },
        { model: Class, as: 'classroom', attributes: ['name'] },
      ],
    });

    const reportData = {
      student_name: `${student?.user?.first_name || ''} ${student?.user?.last_name || ''}`.trim(),
      class_name: student?.classroom?.name || '',
      admission_number: student?.admission_number || '',
      grades: grades.map(g => ({
        subject: g.subject?.name || '',
        code: g.subject?.code || '',
        ca: g.ca,
        midterm: g.midterm,
        final: g.final,
        total: g.total,
        grade_letter: g.grade_letter,
        remarks: g.remarks,
        term: g.term?.name || '',
      })),
      generated_at: new Date().toISOString(),
    };

    return res.json(successResponse({ report: reportData }));
  } catch (err) {
    console.error('downloadChildReportCard Error:', err);
    return res.status(500).json(errorResponse(`Failed to download: ${err.message}`));
  }
}

async function getParentNotifications(req, res) {
  try {
    if (!req.user) return res.status(401).json(errorResponse('Not authenticated'));

    const { limit } = req.query;
    const query = {
      where: { [Op.or]: [{ user_id: req.user.id }, { user_id: null }] },
      order: [['created_at', 'DESC']],
    };
    if (limit) query.limit = parseInt(limit);

    const notifications = await Notification.findAll(query);

    const formatted = notifications.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      is_read: n.is_read,
      created_at: n.created_at,
    }));

    const unread = await Notification.count({
      where: { [Op.or]: [{ user_id: req.user.id }, { user_id: null }], is_read: false },
    });

    return res.json(successResponse({ notifications: formatted, unread }));
  } catch (err) {
    console.error('getParentNotifications Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch notifications: ${err.message}`));
  }
}

async function markParentNotificationRead(req, res) {
  try {
    const { notification_id, mark_all } = req.body;
    if (mark_all) {
      await Notification.update({ is_read: true }, { where: { user_id: req.user?.id } });
    } else if (notification_id) {
      await Notification.update({ is_read: true }, { where: { id: notification_id } });
    }
    return res.json(successResponse({}, 'Notification marked as read'));
  } catch (err) {
    console.error('markParentNotificationRead Error:', err);
    return res.status(500).json(errorResponse(`Failed to mark notification: ${err.message}`));
  }
}

async function getParentProfile(req, res) {
  try {
    if (!req.user) return res.status(401).json(errorResponse('Not authenticated'));

    return res.json(successResponse({
      profile: {
        id: req.user.id,
        full_name: `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.username,
        email: req.user.email,
        phone: req.user.phone,
        username: req.user.username,
        two_factor_enabled: req.user.two_factor_enabled || false,
      },
    }));
  } catch (err) {
    console.error('getParentProfile Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch profile: ${err.message}`));
  }
}

async function updateParentProfile(req, res) {
  try {
    if (!req.user) return res.status(401).json(errorResponse('Not authenticated'));

    const { first_name, last_name, phone, email } = req.body;
    await req.user.update({ first_name, last_name, phone, email });

    return res.json(successResponse({
      profile: {
        id: req.user.id,
        full_name: `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim(),
        email: req.user.email,
        phone: req.user.phone,
      },
    }, 'Profile updated'));
  } catch (err) {
    console.error('updateParentProfile Error:', err);
    return res.status(500).json(errorResponse(`Failed to update profile: ${err.message}`));
  }
}

async function get2FASetup(req, res) {
  try {
    return res.json(successResponse({
      enabled: req.user?.two_factor_enabled || false,
      setup_required: !req.user?.two_factor_enabled,
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
    await req.user.update({ two_factor_enabled: true });
    return res.json(successResponse({}, '2FA enabled'));
  } catch (err) {
    console.error('enable2FA Error:', err);
    return res.status(500).json(errorResponse(`Failed to enable 2FA: ${err.message}`));
  }
}

async function disable2FA(req, res) {
  try {
    await req.user.update({ two_factor_enabled: false });
    return res.json(successResponse({}, '2FA disabled'));
  } catch (err) {
    console.error('disable2FA Error:', err);
    return res.status(500).json(errorResponse(`Failed to disable 2FA: ${err.message}`));
  }
}

async function getChildAttendance(req, res) {
  try {
    const { childId } = req.params;
    const { month } = req.query;

    const where = { student_id: childId };
    if (month) {
      const start = new Date(month);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      where.date = { [Op.between]: [start, end] };
    }

    const attendance = await Attendance.findAll({
      where,
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
      stats: { total, present, absent, late, rate },
      calendar: records,
      logs: records,
    }));
  } catch (err) {
    console.error('getChildAttendance Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch attendance: ${err.message}`));
  }
}

async function getChildBehavior(req, res) {
  try {
    const { childId } = req.params;

    const studentIds = await getParentStudentIds(req);
    if (childId && !studentIds.includes(Number(childId))) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    const where = {};
    if (childId) {
      where.student_id = childId;
    } else {
      where.student_id = { [Op.in]: studentIds };
    }

    const incidents = await BehaviourIncident.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    const entries = incidents.map(i => ({
      id: i.id,
      student_id: i.student_id,
      incident_type: i.incident_type,
      severity: i.severity,
      description: i.description,
      action_taken: i.action_taken,
      follow_up_required: i.follow_up_required,
      follow_up_date: i.follow_up_date,
      parent_notified: i.parent_notified,
      created_at: i.created_at,
    }));

    return res.json(successResponse({ entries }));
  } catch (err) {
    console.error('getChildBehavior Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch behavior: ${err.message}`));
  }
}

async function getChildFees(req, res) {
  try {
    const { childId } = req.params;

    const fees = await Fee.findAll({
      where: { student_id: childId },
      include: [{ model: FeeCategory, as: 'feeCategory', attributes: ['id', 'name', 'frequency'] }, { model: Term, as: 'term', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
    });

    const payments = await Payment.findAll({
      where: { student_id: childId },
      order: [['paid_at', 'DESC']],
    });

    const totalFees = fees.reduce((sum, f) => sum + (f.amount_due || 0), 0);
    const totalPaid = fees.reduce((sum, f) => sum + (f.amount_paid || 0), 0);

    const formattedFees = fees.map(f => ({
      id: f.id,
      category: f.feeCategory?.name || '',
      term: f.term?.name || '',
      amount: f.amount,
      discount: f.discount,
      amount_due: f.amount_due,
      amount_paid: f.amount_paid,
      balance: f.amount_due - f.amount_paid,
      status: f.status,
      due_date: f.due_date,
    }));

    const formattedPayments = payments.map(p => ({
      id: p.id,
      amount: p.amount,
      method: p.payment_method,
      receipt_number: p.receipt_number,
      paid_at: p.paid_at,
      notes: p.notes,
    }));

    return res.json(successResponse({
      summary: { total_fees: totalFees, paid: totalPaid, balance: totalFees - totalPaid, sibling_discount: 0 },
      transactions: formattedFees,
      payments: formattedPayments,
    }));
  } catch (err) {
    console.error('getChildFees Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch fees: ${err.message}`));
  }
}

async function getPaymentChannels(req, res) {
  try {
    return res.json(successResponse({
      channels: [
        { id: 'orange_money', label: 'Orange Money', icon: 'mobile_friendly' },
        { id: 'africell_money', label: 'Africell Money', icon: 'mobile_friendly' },
        { id: 'bank_transfer', label: 'Bank Transfer', icon: 'account_balance' },
        { id: 'card', label: 'Card Payment', icon: 'credit_card' },
      ],
    }));
  } catch (err) {
    console.error('getPaymentChannels Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch payment channels: ${err.message}`));
  }
}

async function startPayment(req, res) {
  try {
    const { child_id, transaction_id, amount, channel_id, instalments } = req.body;
    if (!child_id || !amount) return res.status(400).json(errorResponse('child_id and amount are required'));

    const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}`;
    const paymentHash = `${child_id}-${transaction_id || 'none'}-${amount}-${Date.now()}`.replace(/[^a-zA-Z0-9-]/g, '');

    const payment = await Payment.create({
      school_id: req.user.school_id || 0,
      student_id: child_id,
      fee_id: transaction_id || null,
      amount,
      payment_method: channel_id || 'cash',
      receipt_number: receiptNumber,
      payment_hash: paymentHash,
      status: 'completed',
      paid_by: req.user.username || 'parent',
    });

    if (transaction_id) {
      const fee = await Fee.findByPk(transaction_id);
      if (fee) {
        const newPaid = (fee.amount_paid || 0) + amount;
        await fee.update({
          amount_paid: newPaid,
          status: newPaid >= fee.amount_due ? 'paid' : 'partial',
        });
      }
    }

    return res.json(successResponse({
      receipt: {
        id: payment.id,
        receipt_number: payment.receipt_number,
        amount: payment.amount,
        method: payment.payment_method,
        paid_at: payment.paid_at,
        verification_hash: payment.payment_hash,
      },
      redirectUrl: null,
    }, 'Payment recorded'));
  } catch (err) {
    console.error('startPayment Error:', err);
    return res.status(500).json(errorResponse(`Failed to start payment: ${err.message}`));
  }
}

async function getReceipts(req, res) {
  try {
    const { child } = req.query;
    const where = {};
    if (child) where.student_id = child;

    const students = await Student.findAll({
      where: {
        [Op.or]: [
          { user_id: req.user.id },
          { father_phone: req.user.phone },
          { mother_phone: req.user.phone },
          { emergency_phone: req.user.phone },
        ],
      },
      attributes: ['id'],
    });

    where.student_id = { [Op.in]: students.map(s => s.id) };

    const payments = await Payment.findAll({
      where,
      order: [['paid_at', 'DESC']],
      limit: 100,
    });

    const formatted = payments.map(p => ({
      id: p.id,
      student_id: p.student_id,
      amount: p.amount,
      method: p.payment_method,
      receipt_number: p.receipt_number,
      verification_hash: p.payment_hash,
      paid_at: p.paid_at,
      notes: p.notes,
    }));

    return res.json(successResponse({ receipts: formatted }));
  } catch (err) {
    console.error('getReceipts Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch receipts: ${err.message}`));
  }
}

async function downloadReceipt(req, res) {
  try {
    const { receiptId } = req.params;

    const payment = await Payment.findByPk(receiptId);
    if (!payment) {
      return res.status(404).json(errorResponse('Receipt not found'));
    }

    const studentIds = await getParentStudentIds(req);
    if (!studentIds.includes(Number(payment.student_id))) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    const student = await Student.findByPk(payment.student_id, {
      include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }],
    });

    const receipt = {
      id: payment.id,
      receipt_number: payment.receipt_number,
      student_name: `${student?.user?.first_name || ''} ${student?.user?.last_name || ''}`.trim(),
      amount: payment.amount,
      method: payment.payment_method,
      status: payment.status,
      paid_by: payment.paid_by,
      paid_at: payment.paid_at,
      notes: payment.notes,
      verification_hash: payment.payment_hash,
    };

    return res.json(successResponse({ receipt }));
  } catch (err) {
    console.error('downloadReceipt Error:', err);
    return res.status(500).json(errorResponse(`Failed to download: ${err.message}`));
  }
}

async function verifyHash(req, res) {
  try {
    const { hash, type } = req.query;
    if (!hash) return res.status(400).json(errorResponse('hash is required'));

    if (type === 'grade') {
      const grade = await Grade.findOne({
        where: { payment_hash: hash },
        include: [
          { model: Subject, as: 'subject', attributes: ['name', 'code'] },
          { model: Term, as: 'term', attributes: ['name'] },
        ],
      });
      if (grade) {
        return res.json(successResponse({
          valid: true,
          type: 'grade',
          data: {
            subject: grade.subject?.name || '',
            term: grade.term?.name || '',
            total: grade.total,
            grade_letter: grade.grade_letter,
            created_at: grade.created_at,
          },
        }));
      }
    }

    const payment = await Payment.findOne({ where: { payment_hash: hash } });
    if (payment) {
      return res.json(successResponse({
        valid: true,
        type: 'payment',
        data: {
          receipt_number: payment.receipt_number,
          amount: payment.amount,
          method: payment.payment_method,
          paid_at: payment.paid_at,
          status: payment.status,
        },
      }));
    }

    return res.json(successResponse({ valid: false, reason: 'Hash not found' }));
  } catch (err) {
    console.error('verifyHash Error:', err);
    return res.status(500).json(errorResponse(`Failed to verify: ${err.message}`));
  }
}

async function getTamperCount(req, res) {
  try {
    const total = await ForensicEvent.count();
    const blocked = await ForensicEvent.count({ where: { resolved: true } });
    const successful = total - blocked;

    return res.json(successResponse({ total, blocked, successful }));
  } catch (err) {
    console.error('getTamperCount Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch tamper count: ${err.message}`));
  }
}

async function getAccessLog(req, res) {
  try {
    const { limit } = req.query;
    const query = {
      order: [['ts', 'DESC']],
    };
    if (limit) query.limit = parseInt(limit);

    const entries = await SecurityAuditLog.findAll(query);

    const formatted = entries.map(e => ({
      id: e.id,
      type: e.type,
      severity: e.severity,
      actor: e.actor,
      ip: e.ip,
      action: e.action,
      metadata: e.metadata_json ? JSON.parse(e.metadata_json) : null,
      timestamp: e.ts,
    }));

    return res.json(successResponse({ entries: formatted }));
  } catch (err) {
    console.error('getAccessLog Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch access log: ${err.message}`));
  }
}

async function submitModificationObjection(req, res) {
  try {
    const { student_id, subject_id, grade_id, request_type, reason, current_value, requested_value } = req.body;

    if (!reason) return res.status(400).json(errorResponse('reason is required'));

    const objection = await ModificationRequest.create({
      school_id: req.user.school_id || 0,
      student_id: student_id || null,
      subject_id: subject_id || null,
      grade_id: grade_id || null,
      requested_by: req.user.id,
      request_type: request_type || 'objection',
      reason,
      current_value: current_value || '',
      requested_value: requested_value || '',
      status: 'pending',
    });

    return res.json(successResponse({ ticketId: `OBJ-${objection.id}` }, 'Objection submitted'));
  } catch (err) {
    console.error('submitModificationObjection Error:', err);
    return res.status(500).json(errorResponse(`Failed to submit objection: ${err.message}`));
  }
}

async function getChannelPreferences(req, res) {
  try {
    let pref = await ChannelPreference.findOne({ where: { user_id: req.user.id } });

    if (!pref) {
      pref = await ChannelPreference.create({
        user_id: req.user.id,
        push: true,
        email: true,
        sms: false,
        in_app: true,
        whatsapp: false,
      });
    }

    const categories = ['grade_alerts', 'attendance_alerts', 'fee_reminders', 'behavior_alerts', 'system_alerts', 'conference_reminders', 'newsletter'];
    const channels = ['in_app', 'push', 'email', 'sms'];

    const result = {};
    channels.forEach(ch => {
      result[ch] = {};
      categories.forEach(cat => {
        result[ch][cat] = pref[ch] !== undefined ? pref[ch] : false;
      });
    });

    return res.json(successResponse({ preferences: result }));
  } catch (err) {
    console.error('getChannelPreferences Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch preferences: ${err.message}`));
  }
}

async function updateChannelPreferences(req, res) {
  try {
    const { in_app, push, email, sms, whatsapp } = req.body;

    const [pref] = await ChannelPreference.upsert({
      user_id: req.user.id,
      ...(in_app !== undefined && { in_app }),
      ...(push !== undefined && { push }),
      ...(email !== undefined && { email }),
      ...(sms !== undefined && { sms }),
      ...(whatsapp !== undefined && { whatsapp }),
    });

    return res.json(successResponse({}, 'Preferences updated'));
  } catch (err) {
    console.error('updateChannelPreferences Error:', err);
    return res.status(500).json(errorResponse(`Failed to update preferences: ${err.message}`));
  }
}

async function getWhistleblowerCategories(req, res) {
  try {
    const categories = await WhistleblowerCategory.findAll({
      where: { is_active: true },
      order: [['name', 'ASC']],
    });

    const formatted = categories.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
    }));

    return res.json(successResponse({ categories: formatted }));
  } catch (err) {
    console.error('getWhistleblowerCategories Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch categories: ${err.message}`));
  }
}

async function submitWhistleblowerReport(req, res) {
  try {
    const { category_id, title, description, severity, anonymous } = req.body;

    if (!title || !description) {
      return res.status(400).json(errorResponse('title and description are required'));
    }

    const followUpKey = `WB-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

    const report = await WhistleblowerReport.create({
      school_id: req.user.school_id || 0,
      category_id: category_id || null,
      title,
      description,
      severity: severity || 'medium',
      follow_up_key: followUpKey,
      status: 'received',
      reporter_type: anonymous ? 'anonymous' : 'parent',
    });

    return res.json(successResponse({ ticketId: followUpKey, followUpKey }, 'Report submitted'));
  } catch (err) {
    console.error('submitWhistleblowerReport Error:', err);
    return res.status(500).json(errorResponse(`Failed to submit report: ${err.message}`));
  }
}

async function checkWhistleblowerStatus(req, res) {
  try {
    const { key } = req.params;

    const report = await WhistleblowerReport.findOne({
      where: { follow_up_key: key },
      include: [{ model: WhistleblowerCategory, as: 'category', attributes: ['name'] }],
    });

    if (!report) {
      return res.status(404).json(errorResponse('Report not found'));
    }

    return res.json(successResponse({
      ticketId: report.follow_up_key,
      status: report.status,
      category: report.category?.name || '',
      created_at: report.created_at,
      updates: [],
    }));
  } catch (err) {
    console.error('checkWhistleblowerStatus Error:', err);
    return res.status(500).json(errorResponse(`Failed to check status: ${err.message}`));
  }
}

async function getConferenceSlots(req, res) {
  try {
    const slots = await ConferenceSlot.findAll({
      where: {
        school_id: req.user.school_id,
        status: 'available',
      },
      order: [['date', 'ASC'], ['start_time', 'ASC']],
    });

    const formatted = slots.map(s => ({
      id: s.id,
      teacher_id: s.teacher_id,
      date: s.date,
      start_time: s.start_time,
      end_time: s.end_time,
      status: s.status,
      notes: s.notes,
    }));

    return res.json(successResponse({ slots: formatted }));
  } catch (err) {
    console.error('getConferenceSlots Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch conference slots: ${err.message}`));
  }
}

async function claimConferenceSlot(req, res) {
  try {
    const { slotId } = req.params;

    const slot = await ConferenceSlot.findOne({
      where: { id: slotId, school_id: req.user.school_id, status: 'available' },
    });

    if (!slot) {
      return res.status(404).json(errorResponse('Slot not available'));
    }

    await slot.update({
      status: 'booked',
      parent_id: req.user.id,
    });

    return res.json(successResponse({
      id: slot.id,
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
    }, 'Slot claimed'));
  } catch (err) {
    console.error('claimConferenceSlot Error:', err);
    return res.status(500).json(errorResponse(`Failed to claim slot: ${err.message}`));
  }
}

async function cancelConferenceSlot(req, res) {
  try {
    const { slotId } = req.params;

    const slot = await ConferenceSlot.findOne({
      where: { id: slotId, parent_id: req.user.id, status: 'booked' },
    });

    if (!slot) {
      return res.status(404).json(errorResponse('Slot not found'));
    }

    await slot.update({
      status: 'available',
      parent_id: null,
    });

    return res.json(successResponse({}, 'Slot cancelled'));
  } catch (err) {
    console.error('cancelConferenceSlot Error:', err);
    return res.status(500).json(errorResponse(`Failed to cancel slot: ${err.message}`));
  }
}

async function getCounsellor(req, res) {
  try {
    const messages = await Message.findAll({
      where: {
        school_id: req.user.school_id,
        [Op.or]: [
          { sender_id: req.user.id, recipient_type: 'counsellor' },
          { recipient_id: req.user.id, sender_type: 'counsellor' },
        ],
      },
      order: [['created_at', 'ASC']],
      limit: 100,
    });

    const formatted = messages.map(m => ({
      id: m.id,
      sender_id: m.sender_id,
      sender_type: m.sender_type,
      body: m.body,
      is_read: m.is_read,
      created_at: m.created_at,
    }));

    return res.json(successResponse({ thread: { messages: formatted } }));
  } catch (err) {
    console.error('getCounsellor Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch counsellor: ${err.message}`));
  }
}

async function sendCounsellorMessage(req, res) {
  try {
    const { text, subject } = req.body;
    if (!text) return res.status(400).json(errorResponse('text is required'));

    const message = await Message.create({
      school_id: req.user.school_id || 0,
      sender_id: req.user.id,
      sender_type: 'parent',
      recipient_type: 'counsellor',
      subject: subject || 'Message to Counsellor',
      body: text,
      is_read: false,
    });

    return res.json(successResponse({
      id: message.id,
      sender_id: message.sender_id,
      body: message.body,
      created_at: message.created_at,
    }, 'Message sent'));
  } catch (err) {
    console.error('sendCounsellorMessage Error:', err);
    return res.status(500).json(errorResponse(`Failed to send message: ${err.message}`));
  }
}

async function getTeacherThreads(req, res) {
  try {
    const messages = await Message.findAll({
      where: {
        school_id: req.user.school_id,
        [Op.or]: [
          { sender_id: req.user.id },
          { recipient_id: req.user.id },
        ],
      },
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    const threads = {};
    messages.forEach(m => {
      const threadKey = m.thread_id || `thread-${m.sender_id}-${m.recipient_id}`;
      if (!threads[threadKey]) {
        threads[threadKey] = {
          id: threadKey,
          messages: [],
          last_message: null,
          unread: 0,
        };
      }
      threads[threadKey].messages.push({
        id: m.id,
        sender_id: m.sender_id,
        recipient_id: m.recipient_id,
        subject: m.subject,
        body: m.body,
        is_read: m.is_read,
        created_at: m.created_at,
      });
      if (!m.is_read && m.recipient_id === req.user.id) {
        threads[threadKey].unread++;
      }
      threads[threadKey].last_message = m.body;
    });

    return res.json(successResponse({ threads: Object.values(threads) }));
  } catch (err) {
    console.error('getTeacherThreads Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch threads: ${err.message}`));
  }
}

async function sendTeacherMessage(req, res) {
  try {
    const { teacher_id, text, subject } = req.body;
    if (!teacher_id || !text) return res.status(400).json(errorResponse('teacher_id and text are required'));

    const threadId = `thread-${req.user.id}-${teacher_id}`;

    const message = await Message.create({
      school_id: req.user.school_id || 0,
      sender_id: req.user.id,
      sender_type: 'parent',
      recipient_id: teacher_id,
      recipient_type: 'teacher',
      subject: subject || '',
      body: text,
      thread_id: threadId,
      is_read: false,
    });

    return res.json(successResponse({
      id: message.id,
      thread_id: message.thread_id,
      body: message.body,
      created_at: message.created_at,
    }, 'Message sent'));
  } catch (err) {
    console.error('sendTeacherMessage Error:', err);
    return res.status(500).json(errorResponse(`Failed to send message: ${err.message}`));
  }
}

async function getCoGuardians(req, res) {
  try {
    const studentIds = await getParentStudentIds(req);

    const guardians = await CoGuardian.findAll({
      where: {
        student_id: { [Op.in]: studentIds },
      },
      include: [{ model: User, as: 'guardian', attributes: ['id', 'first_name', 'last_name', 'email', 'phone'] }],
      order: [['created_at', 'DESC']],
    });

    const formatted = guardians.map(g => ({
      id: g.id,
      student_id: g.student_id,
      guardian_user_id: g.guardian_user_id,
      relationship: g.relationship,
      status: g.status,
      invited_at: g.invited_at,
      guardian: g.guardian ? {
        id: g.guardian.id,
        name: `${g.guardian.first_name || ''} ${g.guardian.last_name || ''}`.trim(),
        email: g.guardian.email,
        phone: g.guardian.phone,
      } : null,
    }));

    return res.json(successResponse({ guardians: formatted }));
  } catch (err) {
    console.error('getCoGuardians Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch guardians: ${err.message}`));
  }
}

async function inviteCoGuardian(req, res) {
  try {
    const { student_id, guardian_email, relationship } = req.body;
    if (!student_id || !guardian_email) {
      return res.status(400).json(errorResponse('student_id and guardian_email are required'));
    }

    const studentIds = await getParentStudentIds(req);
    if (!studentIds.includes(Number(student_id))) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    let guardianUser = await User.findOne({ where: { email: guardian_email } });
    if (!guardianUser) {
      guardianUser = await User.create({
        username: guardian_email,
        email: guardian_email,
        role: 'parent',
        school_id: req.user.school_id,
      });
    }

    const coGuardian = await CoGuardian.create({
      school_id: req.user.school_id || 0,
      student_id,
      guardian_user_id: guardianUser.id,
      relationship: relationship || 'co-guardian',
      status: 'pending',
      invited_at: new Date(),
    });

    return res.json(successResponse({
      id: coGuardian.id,
      guardian_id: guardianUser.id,
      status: coGuardian.status,
    }, 'Invitation sent'));
  } catch (err) {
    console.error('inviteCoGuardian Error:', err);
    return res.status(500).json(errorResponse(`Failed to invite guardian: ${err.message}`));
  }
}

async function removeCoGuardian(req, res) {
  try {
    const { guardianId } = req.params;

    const studentIds = await getParentStudentIds(req);

    const coGuardian = await CoGuardian.findOne({
      where: { id: guardianId, student_id: { [Op.in]: studentIds } },
    });

    if (!coGuardian) {
      return res.status(404).json(errorResponse('Guardian not found'));
    }

    await coGuardian.destroy();

    return res.json(successResponse({}, 'Guardian removed'));
  } catch (err) {
    console.error('removeCoGuardian Error:', err);
    return res.status(500).json(errorResponse(`Failed to remove guardian: ${err.message}`));
  }
}

async function getPickupAllowList(req, res) {
  try {
    const studentIds = await getParentStudentIds(req);

    const pickups = await PickupPerson.findAll({
      where: {
        student_id: { [Op.in]: studentIds },
        is_authorized: true,
      },
      order: [['name', 'ASC']],
    });

    const formatted = pickups.map(p => ({
      id: p.id,
      student_id: p.student_id,
      name: p.name,
      phone: p.phone,
      relationship: p.relationship,
      is_authorized: p.is_authorized,
    }));

    return res.json(successResponse({ pickups: formatted }));
  } catch (err) {
    console.error('getPickupAllowList Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch pickups: ${err.message}`));
  }
}

async function addPickup(req, res) {
  try {
    const { student_id, name, phone, relationship } = req.body;
    if (!student_id || !name) {
      return res.status(400).json(errorResponse('student_id and name are required'));
    }

    const studentIds = await getParentStudentIds(req);
    if (!studentIds.includes(Number(student_id))) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    const pickup = await PickupPerson.create({
      school_id: req.user.school_id || 0,
      student_id,
      name,
      phone: phone || '',
      relationship: relationship || '',
      is_authorized: true,
    });

    return res.json(successResponse({
      id: pickup.id,
      name: pickup.name,
      phone: pickup.phone,
      relationship: pickup.relationship,
    }, 'Pickup person added'));
  } catch (err) {
    console.error('addPickup Error:', err);
    return res.status(500).json(errorResponse(`Failed to add pickup: ${err.message}`));
  }
}

async function removePickup(req, res) {
  try {
    const { pickupId } = req.params;

    const studentIds = await getParentStudentIds(req);

    const pickup = await PickupPerson.findOne({
      where: { id: pickupId, student_id: { [Op.in]: studentIds } },
    });

    if (!pickup) {
      return res.status(404).json(errorResponse('Pickup person not found'));
    }

    await pickup.destroy();

    return res.json(successResponse({}, 'Pickup person removed'));
  } catch (err) {
    console.error('removePickup Error:', err);
    return res.status(500).json(errorResponse(`Failed to remove pickup: ${err.message}`));
  }
}

async function getPermissionSlips(req, res) {
  try {
    const slips = await PermissionSlip.findAll({
      where: {
        school_id: req.user.school_id,
        is_active: true,
      },
      order: [['event_date', 'DESC']],
    });

    const studentIds = await getParentStudentIds(req);

    const signatures = await PermissionSlipSignature.findAll({
      where: {
        slip_id: { [Op.in]: slips.map(s => s.id) },
        student_id: { [Op.in]: studentIds },
        parent_id: req.user.id,
      },
    });

    const signedSlipIds = new Set(signatures.map(sig => sig.slip_id));

    const formatted = slips.map(s => ({
      id: s.id,
      title: s.title,
      description: s.description,
      event_date: s.event_date,
      expiry_date: s.expiry_date,
      is_signed: signedSlipIds.has(s.id),
      is_expired: s.expiry_date ? new Date(s.expiry_date) < new Date() : false,
    }));

    return res.json(successResponse({ slips: formatted }));
  } catch (err) {
    console.error('getPermissionSlips Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch slips: ${err.message}`));
  }
}

async function signPermissionSlip(req, res) {
  try {
    const { slip_id, student_id } = req.body;
    if (!slip_id || !student_id) {
      return res.status(400).json(errorResponse('slip_id and student_id are required'));
    }

    const studentIds = await getParentStudentIds(req);
    if (!studentIds.includes(Number(student_id))) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    const slip = await PermissionSlip.findOne({
      where: { id: slip_id, school_id: req.user.school_id, is_active: true },
    });

    if (!slip) {
      return res.status(404).json(errorResponse('Slip not found'));
    }

    const existing = await PermissionSlipSignature.findOne({
      where: { slip_id, student_id, parent_id: req.user.id },
    });

    if (existing) {
      return res.json(successResponse({}, 'Already signed'));
    }

    const signatureHash = `${slip_id}-${student_id}-${req.user.id}-${Date.now()}`.replace(/[^a-zA-Z0-9-]/g, '');

    await PermissionSlipSignature.create({
      slip_id,
      student_id,
      parent_id: req.user.id,
      signed_at: new Date(),
      signature_hash: signatureHash,
    });

    return res.json(successResponse({}, 'Slip signed'));
  } catch (err) {
    console.error('signPermissionSlip Error:', err);
    return res.status(500).json(errorResponse(`Failed to sign slip: ${err.message}`));
  }
}

async function acknowledgeRecord(req, res) {
  try {
    const { record_type, record_id } = req.body;
    if (!record_type || !record_id) {
      return res.status(400).json(errorResponse('record_type and record_id are required'));
    }

    const existing = await Acknowledgment.findOne({
      where: {
        user_id: req.user.id,
        record_type,
        record_id,
      },
    });

    if (existing) {
      return res.json(successResponse({}, 'Already acknowledged'));
    }

    await Acknowledgment.create({
      school_id: req.user.school_id || 0,
      user_id: req.user.id,
      record_type,
      record_id,
      acknowledged_at: new Date(),
    });

    return res.json(successResponse({}, 'Acknowledged'));
  } catch (err) {
    console.error('acknowledgeRecord Error:', err);
    return res.status(500).json(errorResponse(`Failed to acknowledge: ${err.message}`));
  }
}

async function getAcknowledgments(req, res) {
  try {
    const acknowledgments = await Acknowledgment.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
    });

    const formatted = acknowledgments.map(a => ({
      id: a.id,
      record_type: a.record_type,
      record_id: a.record_id,
      acknowledged_at: a.acknowledged_at,
      created_at: a.created_at,
    }));

    return res.json(successResponse({ acknowledgments: formatted }));
  } catch (err) {
    console.error('getAcknowledgments Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch acknowledgments: ${err.message}`));
  }
}

async function getParentEvents(req, res) {
  try {
    const studentIds = await getParentStudentIds(req);

    const events = await Notification.findAll({
      where: {
        [Op.or]: [
          { user_id: req.user.id },
          { user_id: null },
        ],
      },
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    const formatted = events.map(e => ({
      id: e.id,
      title: e.title,
      message: e.message,
      type: e.type,
      is_read: e.is_read,
      created_at: e.created_at,
    }));

    return res.json(successResponse({ events: formatted }));
  } catch (err) {
    console.error('getParentEvents Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch events: ${err.message}`));
  }
}

async function getDonations(req, res) {
  try {
    const campaigns = await DonationCampaign.findAll({
      where: {
        school_id: req.user.school_id,
        is_active: true,
      },
      order: [['created_at', 'DESC']],
    });

    const donations = await Donation.findAll({
      where: { donor_id: req.user.id },
    });

    const totalSponsored = donations.reduce((sum, d) => sum + (d.amount || 0), 0);

    const formatted = campaigns.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      target_amount: c.target_amount,
      current_amount: c.current_amount,
      progress: c.target_amount ? Math.round(c.current_amount / c.target_amount * 100) : 0,
      start_date: c.start_date,
      end_date: c.end_date,
      is_active: c.is_active,
    }));

    return res.json(successResponse({ campaigns: formatted, total_sponsored: totalSponsored }));
  } catch (err) {
    console.error('getDonations Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch donations: ${err.message}`));
  }
}

async function donateToCampaign(req, res) {
  try {
    const { campaign_id, amount, anonymous } = req.body;
    if (!campaign_id || !amount) {
      return res.status(400).json(errorResponse('campaign_id and amount are required'));
    }

    const campaign = await DonationCampaign.findByPk(campaign_id);
    if (!campaign) {
      return res.status(404).json(errorResponse('Campaign not found'));
    }

    const receiptHash = `DON-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8)}`;

    const donation = await Donation.create({
      campaign_id,
      donor_id: anonymous ? null : req.user.id,
      amount,
      is_anonymous: anonymous || false,
      receipt_hash: receiptHash,
      paid_at: new Date(),
    });

    await campaign.update({
      current_amount: (campaign.current_amount || 0) + amount,
    });

    return res.json(successResponse({
      id: donation.id,
      amount: donation.amount,
      is_anonymous: donation.is_anonymous,
      receipt_hash: donation.receipt_hash,
      paid_at: donation.paid_at,
    }, 'Donation received'));
  } catch (err) {
    console.error('donateToCampaign Error:', err);
    return res.status(500).json(errorResponse(`Failed to donate: ${err.message}`));
  }
}

async function getEndOfTermPack(req, res) {
  try {
    const { childId } = req.params;

    const studentIds = await getParentStudentIds(req);
    if (childId && !studentIds.includes(Number(childId))) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    const targetStudentId = childId || studentIds[0];
    if (!targetStudentId) {
      return res.status(404).json(errorResponse('No children found'));
    }

    const grades = await Grade.findAll({
      where: { student_id: targetStudentId },
      include: [
        { model: Subject, as: 'subject', attributes: ['name', 'code'] },
        { model: Term, as: 'term', attributes: ['name'] },
      ],
    });

    const attendance = await Attendance.findAll({
      where: { student_id: targetStudentId },
    });

    const fees = await Fee.findAll({
      where: { student_id: targetStudentId },
      include: [{ model: FeeCategory, as: 'feeCategory', attributes: ['name'] }],
    });

    const totalFees = fees.reduce((sum, f) => sum + (f.amount_due || 0), 0);
    const totalPaid = fees.reduce((sum, f) => sum + (f.amount_paid || 0), 0);

    const totalAttendance = attendance.length;
    const presentCount = attendance.filter(a => a.status === 'present').length;
    const attendanceRate = totalAttendance ? Math.round(presentCount / totalAttendance * 100) : 0;

    const items = [
      {
        type: 'grades',
        count: grades.length,
        data: grades.map(g => ({
          subject: g.subject?.name || '',
          term: g.term?.name || '',
          total: g.total,
          grade_letter: g.grade_letter,
        })),
      },
      {
        type: 'attendance',
        rate: attendanceRate,
        total_days: totalAttendance,
        present_days: presentCount,
      },
      {
        type: 'fees',
        total_due: totalFees,
        total_paid: totalPaid,
        balance: totalFees - totalPaid,
      },
    ];

    return res.json(successResponse({
      generated_at: new Date().toISOString(),
      student_id: targetStudentId,
      size: items.length,
      items,
    }));
  } catch (err) {
    console.error('getEndOfTermPack Error:', err);
    return res.status(500).json(errorResponse(`Failed to generate pack: ${err.message}`));
  }
}

async function getWeeklyDigest(req, res) {
  try {
    const studentIds = await getParentStudentIds(req);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const grades = await Grade.findAll({
      where: {
        student_id: { [Op.in]: studentIds },
        created_at: { [Op.gte]: weekAgo },
      },
      include: [{ model: Subject, as: 'subject', attributes: ['name'] }],
    });

    const attendance = await Attendance.findAll({
      where: {
        student_id: { [Op.in]: studentIds },
        date: { [Op.gte]: weekAgo },
      },
    });

    const notifications = await Notification.findAll({
      where: {
        user_id: req.user.id,
        created_at: { [Op.gte]: weekAgo },
      },
      order: [['created_at', 'DESC']],
      limit: 10,
    });

    const digest = [
      {
        type: 'new_grades',
        count: grades.length,
        items: grades.map(g => ({
          subject: g.subject?.name || '',
          total: g.total,
          grade_letter: g.grade_letter,
        })),
      },
      {
        type: 'attendance_summary',
        total: attendance.length,
        present: attendance.filter(a => a.status === 'present').length,
        absent: attendance.filter(a => a.status === 'absent').length,
      },
      {
        type: 'notifications',
        count: notifications.length,
        items: notifications.map(n => ({
          title: n.title,
          type: n.type,
          created_at: n.created_at,
        })),
      },
    ];

    return res.json(successResponse({ digest, period: { from: weekAgo, to: new Date() } }));
  } catch (err) {
    console.error('getWeeklyDigest Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch digest: ${err.message}`));
  }
}

async function getVoiceDigest(req, res) {
  try {
    const studentIds = await getParentStudentIds(req);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const grades = await Grade.findAll({
      where: {
        student_id: { [Op.in]: studentIds },
        created_at: { [Op.gte]: weekAgo },
      },
      include: [{ model: Subject, as: 'subject', attributes: ['name'] }],
    });

    const attendance = await Attendance.findAll({
      where: {
        student_id: { [Op.in]: studentIds },
        date: { [Op.gte]: weekAgo },
      },
    });

    const notifications = await Notification.count({
      where: {
        user_id: req.user.id,
        created_at: { [Op.gte]: weekAgo },
      },
    });

    const presentCount = attendance.filter(a => a.status === 'present').length;
    const absentCount = attendance.filter(a => a.status === 'absent').length;

    let text = `Weekly digest for your children. `;
    text += `${grades.length} new grades were recorded this week. `;
    text += `Attendance: ${presentCount} days present, ${absentCount} days absent. `;
    text += `You have ${notifications} new notifications. `;

    if (grades.length > 0) {
      text += 'Recent grades: ';
      grades.slice(0, 5).forEach(g => {
        text += `${g.subject?.name || 'Subject'}: ${g.total} points (${g.grade_letter || 'N/A'}). `;
      });
    }

    return res.json(successResponse({ text }));
  } catch (err) {
    console.error('getVoiceDigest Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch voice digest: ${err.message}`));
  }
}

async function getFamilyActivity(req, res) {
  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const auditLogs = await SecurityAuditLog.findAll({
      where: {
        ts: { [Op.gte]: weekAgo },
      },
      order: [['ts', 'DESC']],
      limit: 50,
    });

    const notifications = await Notification.findAll({
      where: {
        user_id: req.user.id,
        created_at: { [Op.gte]: weekAgo },
      },
      order: [['created_at', 'DESC']],
      limit: 50,
    });

    const activity = [
      ...auditLogs.map(l => ({
        id: `audit-${l.id}`,
        type: 'security_log',
        action: l.action,
        severity: l.severity,
        actor: l.actor,
        timestamp: l.ts,
      })),
      ...notifications.map(n => ({
        id: `notif-${n.id}`,
        type: 'notification',
        title: n.title,
        message: n.message,
        notification_type: n.type,
        timestamp: n.created_at,
      })),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.json(successResponse({ activity }));
  } catch (err) {
    console.error('getFamilyActivity Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch activity: ${err.message}`));
  }
}

module.exports = {
  getChildren,
  getChildGrades, getChildGradeHistory,
  getChildReportCards, downloadChildReportCard,
  getParentNotifications, markParentNotificationRead,
  getParentProfile, updateParentProfile,
  get2FASetup, enable2FA, disable2FA,
  getChildAttendance,
  getChildBehavior,
  getChildFees,
  getPaymentChannels, startPayment, getReceipts, downloadReceipt,
  verifyHash,
  getTamperCount,
  getAccessLog,
  submitModificationObjection,
  getChannelPreferences, updateChannelPreferences,
  getWhistleblowerCategories, submitWhistleblowerReport, checkWhistleblowerStatus,
  getConferenceSlots, claimConferenceSlot, cancelConferenceSlot,
  getCounsellor, sendCounsellorMessage,
  getTeacherThreads, sendTeacherMessage,
  getCoGuardians, inviteCoGuardian, removeCoGuardian,
  getPickupAllowList, addPickup, removePickup,
  getPermissionSlips, signPermissionSlip,
  acknowledgeRecord, getAcknowledgments,
  getParentEvents,
  getDonations, donateToCampaign,
  getEndOfTermPack,
  getWeeklyDigest, getVoiceDigest,
  getFamilyActivity,
};
