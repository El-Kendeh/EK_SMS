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

const successResponse = (data = {}, message = 'Success') => ({ success: true, message, ...data });
const errorResponse = (message) => ({ success: false, message });

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
        { model: User, attributes: ['id', 'username', 'first_name', 'last_name', 'email', 'phone'] },
        { model: Class, as: 'classroom', attributes: ['id', 'name'] },
      ],
    });

    const children = students.map(s => ({
      id: s.id,
      full_name: `${s.User?.first_name || ''} ${s.User?.last_name || ''}`.trim(),
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
        { model: Subject, attributes: ['id', 'name', 'code'] },
        { model: Term, attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    });

    const formatted = grades.map(g => ({
      id: g.id,
      subject_id: g.subject_id,
      subject: g.Subject ? { id: g.Subject.id, name: g.Subject.name, code: g.Subject.code } : null,
      term_id: g.term_id,
      term: g.Term ? { id: g.Term.id, name: g.Term.name } : null,
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
    return res.json(successResponse({ reportCards: [] }));
  } catch (err) {
    console.error('getChildReportCards Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch report cards: ${err.message}`));
  }
}

async function downloadChildReportCard(req, res) {
  try {
    return res.status(404).json(errorResponse('Report card not found'));
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
    return res.json(successResponse({ entries: [] }));
  } catch (err) {
    console.error('getChildBehavior Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch behavior: ${err.message}`));
  }
}

async function getChildFees(req, res) {
  try {
    return res.json(successResponse({
      summary: { total_fees: 0, paid: 0, balance: 0, sibling_discount: 0 },
      transactions: [],
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
    return res.json(successResponse({ receipt: null, redirectUrl: null }, 'Payment initiated'));
  } catch (err) {
    console.error('startPayment Error:', err);
    return res.status(500).json(errorResponse(`Failed to start payment: ${err.message}`));
  }
}

async function getReceipts(req, res) {
  try {
    return res.json(successResponse({ receipts: [] }));
  } catch (err) {
    console.error('getReceipts Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch receipts: ${err.message}`));
  }
}

async function downloadReceipt(req, res) {
  try {
    return res.status(404).json(errorResponse('Receipt not found'));
  } catch (err) {
    console.error('downloadReceipt Error:', err);
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
    return res.json(successResponse({ total: 0, blocked: 0, successful: 0 }));
  } catch (err) {
    console.error('getTamperCount Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch tamper count: ${err.message}`));
  }
}

async function getAccessLog(req, res) {
  try {
    return res.json(successResponse({ entries: [] }));
  } catch (err) {
    console.error('getAccessLog Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch access log: ${err.message}`));
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
      in_app: { grade_alerts: true, attendance_alerts: true, fee_reminders: true, behavior_alerts: true, system_alerts: true, conference_reminders: true, newsletter: true },
      push: { grade_alerts: true, attendance_alerts: true, fee_reminders: true, behavior_alerts: true, system_alerts: true, conference_reminders: true, newsletter: false },
      email: { grade_alerts: true, attendance_alerts: false, fee_reminders: true, behavior_alerts: true, system_alerts: true, conference_reminders: true, newsletter: true },
      sms: { grade_alerts: true, attendance_alerts: true, fee_reminders: true, behavior_alerts: false, system_alerts: false, conference_reminders: false, newsletter: false },
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
        { id: 'corruption', label: 'Corruption' },
        { id: 'misconduct', label: 'Misconduct' },
        { id: 'safety', label: 'Safety Concern' },
        { id: 'grading', label: 'Grading Issue' },
        { id: 'fees', label: 'Fee Discrepancy' },
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

async function getConferenceSlots(req, res) {
  try {
    return res.json(successResponse({ slots: [] }));
  } catch (err) {
    console.error('getConferenceSlots Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch conference slots: ${err.message}`));
  }
}

async function claimConferenceSlot(req, res) {
  try {
    return res.json(successResponse({}, 'Slot claimed'));
  } catch (err) {
    console.error('claimConferenceSlot Error:', err);
    return res.status(500).json(errorResponse(`Failed to claim slot: ${err.message}`));
  }
}

async function cancelConferenceSlot(req, res) {
  try {
    return res.json(successResponse({}, 'Slot cancelled'));
  } catch (err) {
    console.error('cancelConferenceSlot Error:', err);
    return res.status(500).json(errorResponse(`Failed to cancel slot: ${err.message}`));
  }
}

async function getCounsellor(req, res) {
  try {
    return res.json(successResponse({ thread: { messages: [] } }));
  } catch (err) {
    console.error('getCounsellor Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch counsellor: ${err.message}`));
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

async function getTeacherThreads(req, res) {
  try {
    return res.json(successResponse({ threads: [] }));
  } catch (err) {
    console.error('getTeacherThreads Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch threads: ${err.message}`));
  }
}

async function sendTeacherMessage(req, res) {
  try {
    return res.json(successResponse({ message: req.body.text }, 'Message sent'));
  } catch (err) {
    console.error('sendTeacherMessage Error:', err);
    return res.status(500).json(errorResponse(`Failed to send message: ${err.message}`));
  }
}

async function getCoGuardians(req, res) {
  try {
    return res.json(successResponse({ guardians: [] }));
  } catch (err) {
    console.error('getCoGuardians Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch guardians: ${err.message}`));
  }
}

async function inviteCoGuardian(req, res) {
  try {
    return res.json(successResponse({}, 'Invitation sent'));
  } catch (err) {
    console.error('inviteCoGuardian Error:', err);
    return res.status(500).json(errorResponse(`Failed to invite guardian: ${err.message}`));
  }
}

async function removeCoGuardian(req, res) {
  try {
    return res.json(successResponse({}, 'Guardian removed'));
  } catch (err) {
    console.error('removeCoGuardian Error:', err);
    return res.status(500).json(errorResponse(`Failed to remove guardian: ${err.message}`));
  }
}

async function getPickupAllowList(req, res) {
  try {
    return res.json(successResponse({ pickups: [] }));
  } catch (err) {
    console.error('getPickupAllowList Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch pickups: ${err.message}`));
  }
}

async function addPickup(req, res) {
  try {
    return res.json(successResponse({}, 'Pickup person added'));
  } catch (err) {
    console.error('addPickup Error:', err);
    return res.status(500).json(errorResponse(`Failed to add pickup: ${err.message}`));
  }
}

async function removePickup(req, res) {
  try {
    return res.json(successResponse({}, 'Pickup person removed'));
  } catch (err) {
    console.error('removePickup Error:', err);
    return res.status(500).json(errorResponse(`Failed to remove pickup: ${err.message}`));
  }
}

async function getPermissionSlips(req, res) {
  try {
    return res.json(successResponse({ slips: [] }));
  } catch (err) {
    console.error('getPermissionSlips Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch slips: ${err.message}`));
  }
}

async function signPermissionSlip(req, res) {
  try {
    return res.json(successResponse({}, 'Slip signed'));
  } catch (err) {
    console.error('signPermissionSlip Error:', err);
    return res.status(500).json(errorResponse(`Failed to sign slip: ${err.message}`));
  }
}

async function acknowledgeRecord(req, res) {
  try {
    return res.json(successResponse({}, 'Acknowledged'));
  } catch (err) {
    console.error('acknowledgeRecord Error:', err);
    return res.status(500).json(errorResponse(`Failed to acknowledge: ${err.message}`));
  }
}

async function getAcknowledgments(req, res) {
  try {
    return res.json(successResponse({ acknowledgments: {} }));
  } catch (err) {
    console.error('getAcknowledgments Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch acknowledgments: ${err.message}`));
  }
}

async function getParentEvents(req, res) {
  try {
    return res.json(successResponse({ events: [] }));
  } catch (err) {
    console.error('getParentEvents Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch events: ${err.message}`));
  }
}

async function getDonations(req, res) {
  try {
    return res.json(successResponse({ campaigns: [], total_sponsored: 0 }));
  } catch (err) {
    console.error('getDonations Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch donations: ${err.message}`));
  }
}

async function donateToCampaign(req, res) {
  try {
    return res.json(successResponse({ anonymous: true, receiptHash: '' }, 'Donation received'));
  } catch (err) {
    console.error('donateToCampaign Error:', err);
    return res.status(500).json(errorResponse(`Failed to donate: ${err.message}`));
  }
}

async function getEndOfTermPack(req, res) {
  try {
    return res.json(successResponse({
      generated_at: new Date().toISOString(),
      size: 0,
      items: [],
    }));
  } catch (err) {
    console.error('getEndOfTermPack Error:', err);
    return res.status(500).json(errorResponse(`Failed to generate pack: ${err.message}`));
  }
}

async function getWeeklyDigest(req, res) {
  try {
    return res.json(successResponse({ digest: [] }));
  } catch (err) {
    console.error('getWeeklyDigest Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch digest: ${err.message}`));
  }
}

async function getVoiceDigest(req, res) {
  try {
    return res.json(successResponse({ text: '' }));
  } catch (err) {
    console.error('getVoiceDigest Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch voice digest: ${err.message}`));
  }
}

async function getFamilyActivity(req, res) {
  try {
    return res.json(successResponse({ activity: [] }));
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
