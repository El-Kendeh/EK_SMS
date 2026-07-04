const TimetableSlot = require('../models/TimetableSlot');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const User = require('../models/User');

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PALETTE = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

const EMPTY_WEEK = () => ({ Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] });

/**
 * SHARED weekly-timetable view for one class. Used by BOTH the student
 * dashboard (own class) and the parent portal's child view — one builder so
 * the two surfaces can never drift apart. Returns the student-shape payload:
 * { Monday: [{id,time,endTime,subject,teacher,room,color,icon,isBreak,link}], ... }
 */
async function buildClassTimetable(classroomId) {
  if (!classroomId) return EMPTY_WEEK();

  const slots = await TimetableSlot.findAll({
    where: { class_id: classroomId },
    order: [['day', 'ASC'], ['period', 'ASC']],
  });

  const subjectIds = [...new Set(slots.map(s => s.subject_id).filter(Boolean))];
  const teacherIds = [...new Set(slots.map(s => s.teacher_id).filter(Boolean))];
  const subjects = subjectIds.length
    ? await Subject.findAll({ where: { id: subjectIds }, attributes: ['id', 'name'] }) : [];
  const subjectName = Object.fromEntries(subjects.map(s => [String(s.id), s.name]));
  const teachers = teacherIds.length
    ? await Teacher.findAll({ where: { id: teacherIds }, include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }] }) : [];
  const teacherName = Object.fromEntries(teachers.map(t => [String(t.id), `${t.user?.first_name || ''} ${t.user?.last_name || ''}`.trim()]));

  const colorBySubject = {};
  let ci = 0;
  const timetable = EMPTY_WEEK();

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

  return timetable;
}

module.exports = { buildClassTimetable, EMPTY_WEEK };
