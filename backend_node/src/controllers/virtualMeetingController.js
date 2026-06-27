/*
 * Consumer-side read for Virtual Meetings.
 *
 * The admin schedules meetings (superadminDataController) targeted at an audience
 * — parents / staffs / students. Previously NO consumer endpoint existed, so the
 * audience never saw the meeting or its join link (admin-only data island). This
 * exposes a per-role read so each portal can list its upcoming meetings.
 */
const VirtualMeeting = require('../models/VirtualMeeting');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Parent = require('../models/Parent');
const StudentParent = require('../models/StudentParent');

const ok  = (data, message = 'Success') => ({ success: true, message, ...data });
const err = (message, status = 400) => ({ success: false, message, status });

// Which VirtualMeeting.audience value each role should see.
const ROLE_AUDIENCE = { student: 'students', teacher: 'staffs', parent: 'parents' };

async function resolveSchoolId(req) {
  const role = req.user?.role;
  if (req.user?.school_id) return req.user.school_id;
  if (!req.user?.id) return null;
  if (role === 'teacher') {
    const t = await Teacher.findOne({ where: { user_id: req.user.id }, attributes: ['school_id'] });
    return t?.school_id ?? null;
  }
  if (role === 'student') {
    const s = await Student.findOne({ where: { user_id: req.user.id }, attributes: ['school_id'] });
    return s?.school_id ?? null;
  }
  if (role === 'parent') {
    // Parents have no school_id — resolve via a linked student.
    const p = await Parent.findOne({ where: { user_id: req.user.id }, attributes: ['id'] });
    if (!p) return null;
    const link = await StudentParent.findOne({ where: { parent_id: p.id }, attributes: ['student_id'] });
    if (!link) return null;
    const s = await Student.findOne({ where: { id: link.student_id }, attributes: ['school_id'] });
    return s?.school_id ?? null;
  }
  return null;
}

async function getMyMeetings(req, res) {
  try {
    const audience = ROLE_AUDIENCE[req.user?.role];
    if (!audience) return res.status(403).json(err('Virtual meetings are not available for your role.', 403));

    const schoolId = await resolveSchoolId(req);
    if (!schoolId) return res.json(ok({ meetings: [] }, 'No school context.'));

    const rows = await VirtualMeeting.findAll({
      where: { school_id: schoolId, audience, status: 'scheduled' },
      order: [['scheduled_at', 'ASC']],
    });
    const meetings = rows.map(m => ({
      id: m.id,
      title: m.title,
      description: m.description,
      meeting_url: m.meeting_url,
      host: m.host,
      scheduled_at: m.scheduled_at,
      duration_minutes: m.duration_minutes,
      status: m.status,
    }));
    return res.json(ok({ meetings }));
  } catch (e) {
    console.error('getMyMeetings Error:', e.message);
    return res.status(500).json(err('Failed to load meetings.', 500));
  }
}

module.exports = { getMyMeetings };
