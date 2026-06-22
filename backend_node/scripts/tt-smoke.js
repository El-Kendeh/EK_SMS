/**
 * End-to-end smoke test for the timetable feature.
 * Seeds a marked fixture → runs the REAL controllers (school generate + reads,
 * student read, teacher read) → asserts → cleans everything up. Read-mostly:
 * the only persisted side effect is removed in the finally block.
 *   node scripts/tt-smoke.js
 */
const sequelize = require('../src/config/db');
require('../src/models');
const { Op } = require('sequelize');

const Role = require('../src/models/Role');
const User = require('../src/models/User');
const School = require('../src/models/School');
const Class = require('../src/models/Class');
const Subject = require('../src/models/Subject');
const Teacher = require('../src/models/Teacher');
const Student = require('../src/models/Student');
const ClassSubject = require('../src/models/ClassSubject');
const TimetableSlot = require('../src/models/TimetableSlot');

const schoolCtl = require('../src/controllers/schoolController');
const studentCtl = require('../src/controllers/studentController');
const teacherCtl = require('../src/controllers/teacherController');

const mkRes = () => { const r = { code: 200 }; r.status = (c) => { r.code = c; return r; }; r.json = (o) => { r.body = o; return r; }; return r; };
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ✓', msg); } else { fail++; console.log('  ✗ FAIL:', msg); } };

const created = { userIds: [], schoolId: null };

(async () => {
  try {
    if (sequelize.databaseReady) await sequelize.databaseReady;
    await sequelize.authenticate();
    const tag = `__TT_SMOKE__${Date.now()}`;

    // ── Roles ──
    const [teacherRole] = await Role.findOrCreate({ where: { code: 'teacher' }, defaults: { code: 'teacher', name: 'Teacher' } });
    const [studentRole] = await Role.findOrCreate({ where: { code: 'student' }, defaults: { code: 'student', name: 'Student' } });

    // ── Seed fixture ──
    console.log('\nSeeding fixture', tag);
    const school = await School.create({ name: tag, is_approved: true, is_active: true });
    created.schoolId = school.id;

    const subjMath = await Subject.create({ school_id: school.id, name: 'Mathematics', code: 'MTH' });
    const subjEng = await Subject.create({ school_id: school.id, name: 'English', code: 'ENG' });
    const subjSci = await Subject.create({ school_id: school.id, name: 'Science', code: 'SCI' });

    const mkTeacher = async (n) => {
      const u = await User.create({ username: `${tag}_t${n}`, password: 'x', is_active: true, role_id: teacherRole.id, first_name: `Teach${n}`, last_name: 'Smoke' });
      created.userIds.push(u.id);
      const t = await Teacher.create({ user_id: u.id, school_id: school.id, employee_id: `${tag}-EMP${n}`, is_active: true });
      return { u, t };
    };
    const t1 = await mkTeacher(1);
    const t2 = await mkTeacher(2);

    const cls = await Class.create({ school_id: school.id, name: 'JSS1-Smoke', is_active: true, room: 'Room A' });

    await ClassSubject.create({ class_id: cls.id, subject_id: subjMath.id, teacher_id: t1.t.id });
    await ClassSubject.create({ class_id: cls.id, subject_id: subjEng.id, teacher_id: t2.t.id });
    await ClassSubject.create({ class_id: cls.id, subject_id: subjSci.id, teacher_id: t1.t.id });

    const su = await User.create({ username: `${tag}_s1`, password: 'x', is_active: true, role_id: studentRole.id, first_name: 'Stu', last_name: 'Smoke' });
    created.userIds.push(su.id);
    await Student.create({ school_id: school.id, user_id: su.id, classroom_id: cls.id, admission_number: `${tag}-ADM1` });
    console.log(`  seeded school=${school.id} class=${cls.id} 3 subjects, 2 teachers, 1 student`);

    // ── A) School generate (persists) ──
    console.log('\n[A] POST school timetable generate');
    let res = mkRes();
    await schoolCtl.generateTimetable({ user: { id: 999999, school_id: school.id }, body: { periods_per_day: 6, max_teacher_per_day: 4, break_periods: [3] } }, res);
    ok(res.body?.success === true, 'generate returns success');
    ok((res.body?.total_slots || 0) > 0, `generate placed teaching slots (total_slots=${res.body?.total_slots}, skipped=${res.body?.skipped}, repaired=${res.body?.repaired})`);
    const dbCount = await TimetableSlot.count({ where: { school_id: school.id } });
    ok(dbCount > 0, `slots persisted in DB (count=${dbCount})`);

    // ── B) School read (manager grid) ──
    console.log('\n[B] GET school timetable');
    res = mkRes();
    await schoolCtl.getSchoolTimetable({ user: { id: 999999, school_id: school.id }, query: { class_id: cls.id } }, res);
    const slots = res.body?.slots || [];
    ok(slots.length > 0, `returns slots (${slots.length})`);
    const teach = slots.find(s => !s.is_break);
    ok(!!teach && !!teach.subject && teach.day >= 0 && teach.period >= 1, `teaching slot has subject/day/period (${teach?.subject} d${teach?.day} p${teach?.period})`);
    ok((res.body?.break_periods || []).includes(3), `break_periods reflects config (${JSON.stringify(res.body?.break_periods)})`);
    ok(res.body?.periods_per_day === 6, `periods_per_day persisted (${res.body?.periods_per_day})`);
    const teacherNamed = slots.some(s => s.teacher && s.teacher.includes('Teach'));
    ok(teacherNamed, 'slots resolve teacher names');

    // ── C) Student read (day-keyed) ──
    console.log('\n[C] GET student timetable');
    res = mkRes();
    await studentCtl.getTimetable({ user: { id: su.id } }, res);
    const tt = res.body?.timetable;
    ok(tt && typeof tt === 'object' && Array.isArray(tt.Monday), 'returns day-keyed object with Monday array');
    const dayWithClass = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].find(d => (tt?.[d] || []).some(s => !s.isBreak));
    ok(!!dayWithClass, `at least one day has a class (${dayWithClass})`);
    const sample = (tt?.[dayWithClass] || []).find(s => !s.isBreak);
    ok(sample && sample.subject && sample.time && sample.endTime, `student slot has subject+time (${sample?.subject} ${sample?.time}-${sample?.endTime})`);
    const hasBreak = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].some(d => (tt?.[d] || []).some(s => s.isBreak));
    ok(hasBreak, 'break rows present for students');

    // ── D) Teacher read ──
    console.log('\n[D] GET teacher timetable (teacher 1)');
    res = mkRes();
    await teacherCtl.getTeacherTimetable({ user: { id: t1.u.id } }, res);
    const periods = res.body?.timetable?.periods || [];
    ok(periods.length > 0, `teacher has periods (${periods.length})`);
    const p0 = periods[0];
    ok(p0 && p0.day && p0.startTime && p0.subject && p0.type === 'teaching', `period has day/time/subject/type (${p0?.day} ${p0?.startTime} ${p0?.subject})`);
    ok(periods.every(p => p.class === 'JSS1-Smoke'), 'all periods reference the seeded class');

    console.log(`\n==== RESULT: ${pass} passed, ${fail} failed ====`);
  } catch (e) {
    console.error('\nERROR:', e.message, '\n', e.stack);
    fail++;
  } finally {
    // ── Cleanup ──
    try {
      if (created.schoolId) {
        await TimetableSlot.destroy({ where: { school_id: created.schoolId } });
        const classes = await Class.findAll({ where: { school_id: created.schoolId }, attributes: ['id'] });
        const classIds = classes.map(c => c.id);
        if (classIds.length) await ClassSubject.destroy({ where: { class_id: classIds } });
        await Class.destroy({ where: { school_id: created.schoolId } });
        await Student.destroy({ where: { school_id: created.schoolId } });
        await Teacher.destroy({ where: { school_id: created.schoolId } });
        await Subject.destroy({ where: { school_id: created.schoolId } });
        await School.destroy({ where: { id: created.schoolId } });
      }
      if (created.userIds.length) await User.destroy({ where: { id: { [Op.in]: created.userIds } } });
      console.log('Cleanup done (fixture removed).');
    } catch (ce) { console.error('Cleanup error:', ce.message); }
    process.exit(fail > 0 ? 1 : 0);
  }
})();
