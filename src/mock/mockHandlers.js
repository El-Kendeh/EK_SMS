import {
  MOCK_USERS, MOCK_SCHOOL, MOCK_ACADEMIC_YEARS, MOCK_TERMS, MOCK_CLASSES, MOCK_SUBJECTS,
  MOCK_STUDENTS, MOCK_TEACHERS, MOCK_TEACHER_CLASSES, MOCK_GRADES, MOCK_ATTENDANCE,
  MOCK_NOTIFICATIONS, MOCK_MESSAGES, MOCK_ASSIGNMENTS, MOCK_EXAMS, MOCK_TIMETABLE,
  MOCK_RESOURCES, MOCK_FEE_CATEGORIES, MOCK_EXPENSES, MOCK_STUDY_GROUPS,
  MOCK_ANALYTICS, MOCK_PARENT_CHILDREN, MOCK_CONFERENCE_SLOTS, MOCK_OFFICE_HOURS,
  MOCK_BEHAVIOUR_INCIDENTS, MOCK_LESSON_PLANS, MOCK_DONATION_CAMPAIGNS,
  MOCK_PERMISSION_SLIPS, MOCK_PICKUP_LIST, MOCK_CO_GUARDIANS, MOCK_GOALS,
  MOCK_LIVE_CLASSES, MOCK_REPORT_CARDS, MOCK_WHISTLEBLOWER_CATEGORIES,
  MOCK_ALL_SCHOOLS, MOCK_SYSTEM_HEALTH, MOCK_SECURITY_LOGS, MOCK_FORENSIC_EVENTS,
  MOCK_SYLLABUS_TOPICS, MOCK_GRADING_SCHEME, MOCK_EXAM_DUTIES, MOCK_MODIFICATION_REQUESTS,
} from './mockData';

const now = () => new Date().toISOString();

let currentUser = null;
let currentRole = 'school_admin';

function setRole(role) {
  currentRole = role;
  const userMap = {
    superadmin: 'superadmin',
    school_admin: 'school_admin',
    teacher: 'teacher',
    student: 'student',
    parent: 'parent',
    principal: 'principal',
    finance: 'finance',
  };
  const key = userMap[role] || 'school_admin';
  currentUser = { ...MOCK_USERS[key] };
}

function uuid() {
  return 'mck-' + Math.random().toString(36).slice(2, 10);
}

function ok(data) {
  return { status: 200, data };
}

function created(data) {
  return { status: 201, data };
}

function noContent() {
  return { status: 204, data: null };
}

function err(status, message) {
  return { status, data: { success: false, message } };
}

function parseQuery(url) {
  const qIdx = url.indexOf('?');
  if (qIdx === -1) return {};
  const qs = url.slice(qIdx + 1);
  const params = {};
  for (const part of qs.split('&')) {
    const [k, v] = part.split('=').map(decodeURIComponent);
    params[k] = v;
  }
  return params;
}

function getPath(url) {
  const u = url.split('?')[0];
  const match = u.match(/\/api(\/.*)$/);
  return match ? match[1].replace(/\/+$/, '') || '/' : u.split('?')[0];
}

const MOCK_GRADING_SCHEME_DATA = MOCK_GRADING_SCHEME;

const HANDLERS = {};

HANDLERS['POST /api/login/'] = (path, method, body) => {
  const { username, password, role } = body || {};
  if (!username || !password) {
    return err(400, 'Username and password are required');
  }
  const targetRole = role || currentRole;
  const userMap = {
    superadmin: MOCK_USERS.superadmin,
    school_admin: MOCK_USERS.school_admin,
    teacher: MOCK_USERS.teacher,
    student: MOCK_USERS.student,
    parent: MOCK_USERS.parent,
    principal: MOCK_USERS.principal,
    finance: MOCK_USERS.finance,
  };
  const user = userMap[targetRole] || MOCK_USERS.school_admin;
  currentRole = targetRole;
  currentUser = { ...user };
  return ok({
    success: true,
    token: 'mock-token-' + targetRole + '-' + Date.now(),
    user: { ...user, must_change_password: false },
    must_change_password: false,
  });
};

HANDLERS['GET /api/school/info/'] = () => ok({ ...MOCK_SCHOOL });

HANDLERS['POST /api/school/info/'] = (path, method, body) => ok({ ...MOCK_SCHOOL, ...body, updated_at: now() });

HANDLERS['GET /api/school/context/'] = () => {
  const activeTerm = MOCK_TERMS.find(t => t.is_active) || MOCK_TERMS[0];
  const activeYear = MOCK_ACADEMIC_YEARS.find(y => y.is_active) || MOCK_ACADEMIC_YEARS[0];
  return ok({
    school: MOCK_SCHOOL,
    academic_year: activeYear,
    term: activeTerm,
    terms: MOCK_TERMS,
    academic_years: MOCK_ACADEMIC_YEARS,
  });
};

HANDLERS['GET /api/school/classes/'] = () => ok({ classes: MOCK_CLASSES });
HANDLERS['POST /api/school/classes/'] = (path, method, body) => {
  const newClass = { id: MOCK_CLASSES.length + 1, ...body, school_id: 1, is_active: true, student_count: 0, created_at: now(), updated_at: now() };
  MOCK_CLASSES.push(newClass);
  return created(newClass);
};

HANDLERS['GET /api/school/subjects/'] = () => ok({ subjects: MOCK_SUBJECTS });
HANDLERS['POST /api/school/subjects/'] = (path, method, body) => {
  const sub = { id: MOCK_SUBJECTS.length + 1, ...body, school_id: 1, is_active: true };
  MOCK_SUBJECTS.push(sub);
  return created(sub);
};

HANDLERS['GET /api/school/terms/'] = () => ok({ terms: MOCK_TERMS });
HANDLERS['POST /api/school/terms/'] = (path, method, body) => {
  const term = { id: MOCK_TERMS.length + 1, ...body, school_id: 1 };
  MOCK_TERMS.push(term);
  return created(term);
};

HANDLERS['GET /api/school/academic-years/'] = () => ok({ academic_years: MOCK_ACADEMIC_YEARS });
HANDLERS['POST /api/school/academic-years/'] = (path, method, body) => {
  const year = { id: MOCK_ACADEMIC_YEARS.length + 1, ...body, school_id: 1 };
  MOCK_ACADEMIC_YEARS.push(year);
  return created(year);
};

HANDLERS['GET /api/school/students/'] = (path, method, body, query) => {
  let students = [...MOCK_STUDENTS];
  if (query.class_id) students = students.filter(s => s.classroom_id === parseInt(query.class_id));
  return ok({ students, total: students.length });
};
HANDLERS['POST /api/school/students/'] = (path, method, body) => created({ id: MOCK_STUDENTS.length + 1, ...body, school_id: 1 });

HANDLERS['GET /api/school/teachers/'] = () => ok({ teachers: MOCK_TEACHERS });
HANDLERS['POST /api/school/teachers/'] = (path, method, body) => created({ id: MOCK_TEACHERS.length + 1, ...body, school_id: 1 });

HANDLERS['GET /api/school/grades/'] = (path, method, body, query) => {
  let grades = [...MOCK_GRADES];
  if (query.class_id) grades = grades.filter(g => g.classroom_id === parseInt(query.class_id));
  if (query.subject_id) grades = grades.filter(g => g.subject_id === parseInt(query.subject_id));
  if (query.term_id) grades = grades.filter(g => g.term_id === parseInt(query.term_id));
  if (query.student_id) grades = grades.filter(g => g.student_id === parseInt(query.student_id));
  return ok({ grades });
};
HANDLERS['POST /api/school/grades/'] = (path, method, body) => {
  const { grades } = body || {};
  const saved = (grades || []).map(g => ({
    id: MOCK_GRADES.length + 1,
    school_id: 1, student_id: g.student_id, subject_id: g.subject_id,
    term_id: g.term_id, classroom_id: g.classroom_id,
    ca_score: g.ca_score || 0, exam_score: g.exam_score || 0,
    total: (g.ca_score || 0) + (g.exam_score || 0),
    approval_status: 'pending', created_at: now(), updated_at: now(),
  }));
  MOCK_GRADES.push(...saved);
  return ok({ message: 'Grades saved successfully', grades: saved });
};

HANDLERS['GET /api/school/attendance/'] = (path, method, body, query) => {
  let att = [...MOCK_ATTENDANCE];
  if (query.class_id) att = att.filter(a => a.classroom_id === parseInt(query.class_id));
  if (query.student_id) att = att.filter(a => a.student_id === parseInt(query.student_id));
  if (query.date) att = att.filter(a => a.date.startsWith(query.date));
  if (query.month) att = att.filter(a => a.date.startsWith(query.month));
  return ok({ attendance: att });
};
HANDLERS['POST /api/school/attendance/'] = () => ok({ message: 'Attendance recorded', success: true });

HANDLERS['GET /api/school/finance/stats/'] = () => ok({
  total_collected: 1250000, total_outstanding: 340000, total_expenses: 1040000,
  net_balance: 210000, fee_categories: MOCK_FEE_CATEGORIES,
});
HANDLERS['GET /api/school/finance/fees/'] = () => ok({ fees: MOCK_STUDENTS.slice(0, 10).map(s => ({
  id: s.id, student_id: s.id, student_name: `${s.first_name} ${s.last_name}`,
  admission_number: s.admission_number, total_fees: 113000, amount_paid: Math.floor(Math.random() * 113000),
  balance: 113000 - Math.floor(Math.random() * 113000), status: Math.random() > 0.5 ? 'paid' : Math.random() > 0.3 ? 'partial' : 'pending',
  due_date: '2026-03-15',
})) });
HANDLERS['GET /api/school/finance/expenses/'] = () => ok({ expenses: MOCK_EXPENSES });
HANDLERS['POST /api/school/finance/expenses/'] = (path, method, body) => created({ id: MOCK_EXPENSES.length + 1, ...body, school_id: 1, date: now() });
HANDLERS['GET /api/school/finance-users/'] = () => ok({ finance_users: [MOCK_USERS.finance] });
HANDLERS['GET /api/school/principal-users/'] = () => ok({ principal_users: [MOCK_USERS.principal] });

HANDLERS['GET /api/school/grading-scheme/'] = () => ok(MOCK_GRADING_SCHEME_DATA);
HANDLERS['POST /api/school/grading-scheme/'] = (path, method, body) => ok({ ...MOCK_GRADING_SCHEME_DATA, ...body });

HANDLERS['GET /api/school/modification-requests/'] = (path, method, body, query) => {
  let reqs = [...MOCK_MODIFICATION_REQUESTS];
  if (query.status) reqs = reqs.filter(r => r.status === query.status);
  return ok({ modification_requests: reqs });
};
HANDLERS['POST /api/school/modification-requests/review/'] = (path, method, body) => ok({ message: 'Request reviewed', success: true });

HANDLERS['GET /api/school/grade-entry-status/'] = () => ok({
  status: 'open', total_grades: MOCK_GRADES.length,
  submitted: MOCK_GRADES.filter(g => g.approval_status !== 'pending').length,
  pending: MOCK_GRADES.filter(g => g.approval_status === 'pending').length,
  approved: MOCK_GRADES.filter(g => g.approval_status === 'approved').length,
});

HANDLERS['GET /api/school/syllabus-topics/'] = (path, method, body, query) => {
  let topics = [...MOCK_SYLLABUS_TOPICS];
  if (query.class_id) topics = topics.filter(t => t.class_id === parseInt(query.class_id));
  if (query.subject_id) topics = topics.filter(t => t.subject_id === parseInt(query.subject_id));
  return ok({ topics });
};
HANDLERS['POST /api/school/syllabus-topics/'] = (path, method, body) => created({ id: MOCK_SYLLABUS_TOPICS.length + 1, ...body, school_id: 1 });

HANDLERS['GET /api/school/messages/'] = () => ok({ messages: MOCK_MESSAGES });
HANDLERS['POST /api/school/messages/'] = (path, method, body) => created({ id: MOCK_MESSAGES.length + 1, ...body, school_id: 1, created_at: now() });

HANDLERS['GET /api/school/academic-calendar/'] = () => ok({ events: MOCK_TERMS.map(t => ({ id: t.id, title: t.name, start: t.start_date, end: t.end_date, type: 'term' })) });

HANDLERS['GET /api/school/rooms/'] = () => ok({ rooms: [
  { id: 1, name: 'Room 101', capacity: 35, building: 'Main' },
  { id: 2, name: 'Room 102', capacity: 35, building: 'Main' },
  { id: 3, name: 'Lab 1', capacity: 30, building: 'Science Block' },
  { id: 4, name: 'Lab 2', capacity: 30, building: 'Science Block' },
] });

HANDLERS['GET /api/school/stats/'] = () => ok(MOCK_ANALYTICS);

HANDLERS['GET /api/profile/'] = () => {
  if (!currentUser) return err(401, 'Not authenticated');
  return ok({
    profile: {
      first_name: currentUser.first_name, last_name: currentUser.last_name,
      email: currentUser.email, username: currentUser.username,
      role: currentUser.role, date_joined: daysAgo(365), last_login: now(),
    }
  });
};

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString();
}

HANDLERS['PATCH /api/profile/'] = (path, method, body) => {
  if (!currentUser) return err(401, 'Not authenticated');
  Object.assign(currentUser, body);
  return ok({ profile: { ...currentUser }, success: true });
};

HANDLERS['POST /api/change-password/'] = () => ok({ success: true, message: 'Password changed successfully' });

HANDLERS['GET /api/schools/'] = () => ok({ success: true, schools: MOCK_ALL_SCHOOLS });
HANDLERS['POST /api/schools/'] = (path, method, body) => created({ id: MOCK_ALL_SCHOOLS.length + 1, ...body, is_approved: false, is_active: false, created_at: now() });

HANDLERS['POST /api/schools/approve/'] = (path, method, body) => ok({ success: true, message: 'School has been approved' });
HANDLERS['POST /api/impersonate/'] = (path, method, body) => {
  const school = MOCK_ALL_SCHOOLS.find(s => s.id === body?.school_id);
  if (!school) return err(404, 'School not found');
  return ok({ success: true, token: 'mock-impersonation-token', user: { ...MOCK_USERS.school_admin, school_id: school.id, school_name: school.name }, message: `Impersonating ${school.name}` });
};

HANDLERS['GET /api/system-health/'] = () => ok(MOCK_SYSTEM_HEALTH);
HANDLERS['GET /api/grade-alerts/'] = () => ok({ success: true, alerts: [] });
HANDLERS['GET /api/grade-stats/'] = () => ok(MOCK_ANALYTICS);
HANDLERS['GET /api/users/'] = () => ok({ users: Object.values(MOCK_USERS) });
HANDLERS['POST /api/users/'] = (path, method, body) => created({ id: 99, ...body });
HANDLERS['GET /api/get-users/'] = () => ok({ users: Object.values(MOCK_USERS) });
HANDLERS['GET /api/admin-settings/'] = () => ok({ maintenance_mode: false, allow_registration: true, default_school_capacity: 500 });
HANDLERS['PATCH /api/admin-settings/'] = (path, method, body) => ok({ ...body, updated_at: now() });
HANDLERS['GET /api/security-logs/'] = (path, method, body, query) => {
  const limit = parseInt(query.limit) || 25;
  return ok({ logs: MOCK_SECURITY_LOGS.slice(0, limit) });
};
HANDLERS['GET /api/security-counters/'] = () => ok({ total_events: MOCK_SECURITY_LOGS.length, high_severity: MOCK_SECURITY_LOGS.filter(l => l.severity === 'high').length, resolved: 0, pending: MOCK_SECURITY_LOGS.length });
HANDLERS['GET /api/forensic-events/'] = () => ok({ events: MOCK_FORENSIC_EVENTS });
HANDLERS['GET /api/broadcast-alerts/'] = () => ok({ alerts: [] });
HANDLERS['POST /api/broadcast-alerts/'] = (path, method, body) => created({ id: 1, ...body, created_at: now() });
HANDLERS['GET /api/system-alerts/'] = () => ok({ alerts: [] });
HANDLERS['POST /api/system-alerts/'] = () => ok({ success: true });
HANDLERS['GET /api/school-stats/'] = () => ok({ schools: MOCK_ALL_SCHOOLS.map(s => ({ ...s, student_count: Math.floor(Math.random() * 500), teacher_count: Math.floor(Math.random() * 50), collection_rate: Math.floor(Math.random() * 100) })) });

HANDLERS['PUT /api/school/finance/fees/:id/'] = (path, method, body, query, params) => {
  return ok({ id: parseInt(params.id), ...body, updated_at: now(), success: true });
};
HANDLERS['POST /api/school/finance-users/'] = (path, method, body) => created({ id: 10, ...body, school_id: 1, created_at: now() });
HANDLERS['PUT /api/school/finance-users/:id/'] = (path, method, body, query, params) => {
  return ok({ id: parseInt(params.id), ...body, updated_at: now(), success: true });
};
HANDLERS['PUT /api/school/principal-users/:id/'] = (path, method, body, query, params) => {
  return ok({ id: parseInt(params.id), ...body, updated_at: now(), success: true });
};
HANDLERS['GET /api/report-cards/:id/download/'] = () => {
  return ok({ url: '/mock/report-card.pdf', filename: 'report-card.pdf' });
};
HANDLERS['POST /api/school/notifications/:id/read/'] = (path, method, body, query, params) => {
  return ok({ success: true, id: parseInt(params.id), read_at: now() });
};
HANDLERS['GET /api/teacher/students/:studentId/grades/'] = (path, method, body, query, params) => {
  const sid = parseInt(params.studentId);
  return ok({ history: MOCK_GRADES.filter(g => g.student_id === sid) });
};
HANDLERS['GET /api/teacher/students/:studentId/report-cards/'] = (path, method, body, query, params) => {
  const sid = parseInt(params.studentId);
  return ok({ report_cards: MOCK_REPORT_CARDS.filter(r => r.student_id === sid) });
};
HANDLERS['GET /api/teacher/grades/:id/history/'] = () => ok({ history: [] });
HANDLERS['POST /api/teacher/students/:studentId/grades/'] = () => ok({ success: true });
HANDLERS['POST /api/teacher/feedback/:studentId/'] = () => ok({ success: true });
HANDLERS['GET /api/teacher/feedback/:studentId/'] = () => ok({ messages: [] });
HANDLERS['POST /api/teacher/behaviour-incidents/'] = () => created({ id: MOCK_BEHAVIOUR_INCIDENTS.length + 1 });
HANDLERS['PUT /api/teacher/lesson-plans/:id/'] = (path, method, body, query, params) => ok({ id: parseInt(params.id), ...body, updated_at: now() });
HANDLERS['DELETE /api/teacher/assignments/:id/'] = () => noContent();
HANDLERS['GET /api/teacher/exams/:examId/results/'] = () => ok({ results: [] });
HANDLERS['POST /api/teacher/exams/:examId/results/'] = () => ok({ success: true });
HANDLERS['DELETE /api/teacher/resources/:id/'] = () => noContent();
HANDLERS['GET /api/student/grades/:id/history/'] = () => ok({ history: [] });
HANDLERS['GET /api/student/grades/:id/feedback/'] = () => ok({ messages: [] });
HANDLERS['POST /api/student/grades/:id/feedback/'] = () => ok({ success: true });
HANDLERS['GET /api/student/grades/:id/remedial-plan/'] = () => ok({ plan: null });
HANDLERS['GET /api/student/grades/:id/security-report/'] = () => ok({ report: { tamper_count: 0, access_log: [] } });
HANDLERS['POST /api/student/grades/:id/objection/'] = () => ok({ success: true, message: 'Objection submitted' });
HANDLERS['POST /api/student/assignments/:id/submit/'] = () => ok({ success: true });
HANDLERS['GET /api/student/messages/:conversationId/'] = () => ok({ messages: [] });
HANDLERS['POST /api/student/messages/:conversationId/'] = () => ok({ success: true });
HANDLERS['GET /api/student/devices/:id/'] = () => ok({ device: null });
HANDLERS['DELETE /api/student/devices/:id/'] = () => noContent();
HANDLERS['GET /api/student/resources/:id/visit/'] = () => ok({ success: true });
HANDLERS['GET /api/parent/children/:childId/grades/:gradeId/history/'] = () => ok({ history: [] });
HANDLERS['POST /api/parent/children/:childId/grades/:gradeId/objection/'] = () => ok({ success: true });
HANDLERS['POST /api/parent/children/:childId/report-cards/:id/download/'] = () => ok({ url: '/mock/report-card.pdf' });
HANDLERS['GET /api/parent/receipts/:id/download/'] = () => ok({ url: '/mock/receipt.pdf' });
HANDLERS['DELETE /api/parent/pickup/:id/'] = () => noContent();
HANDLERS['DELETE /api/parent/co-guardians/:id/'] = () => noContent();
HANDLERS['DELETE /api/student/office-hours/:id/claim/'] = () => ok({ success: true });
HANDLERS['POST /api/student/office-hours/:id/claim/'] = () => ok({ success: true });
HANDLERS['POST /api/teacher/office-hours/:id/'] = () => ok({ success: true });
HANDLERS['DELETE /api/teacher/office-hours/:id/'] = () => noContent();
HANDLERS['PUT /api/school/academic-years/:id/'] = (path, method, body, query, params) => ok({ id: parseInt(params.id), ...body, updated_at: now() });
HANDLERS['PUT /api/school/terms/:id/'] = (path, method, body, query, params) => ok({ id: parseInt(params.id), ...body, updated_at: now() });
HANDLERS['DELETE /api/school/terms/:id/'] = () => noContent();
HANDLERS['PUT /api/school/rooms/:id/'] = (path, method, body, query, params) => ok({ id: parseInt(params.id), ...body, updated_at: now() });
HANDLERS['DELETE /api/school/rooms/:id/'] = () => noContent();
HANDLERS['PUT /api/school/syllabus-topics/:id/'] = (path, method, body, query, params) => ok({ id: parseInt(params.id), ...body, updated_at: now() });
HANDLERS['DELETE /api/school/syllabus-topics/:id/'] = () => noContent();
HANDLERS['POST /api/teacher/substitute-token/'] = () => created({ token: 'sub-' + uuid().slice(0, 8) });
HANDLERS['DELETE /api/teacher/substitute-token/:token/'] = () => noContent();
HANDLERS['GET /api/teacher/substitute-token/'] = () => ok({ tokens: [] });

HANDLERS['GET /api/school/context/'] = () => {
  const activeTerm = MOCK_TERMS.find(t => t.is_active) || MOCK_TERMS[0];
  const activeYear = MOCK_ACADEMIC_YEARS.find(y => y.is_active) || MOCK_ACADEMIC_YEARS[0];
  return ok({ school: MOCK_SCHOOL, academic_year: activeYear, term: activeTerm, terms: MOCK_TERMS, academic_years: MOCK_ACADEMIC_YEARS });
};

HANDLERS['GET /api/sa/branding/'] = () => ok({ logo: null, colors: MOCK_SCHOOL.brand_colors });
HANDLERS['POST /api/sa/branding/'] = () => ok({ success: true, message: 'Branding updated' });
HANDLERS['GET /api/sa/lockdown/'] = () => ok({ active: false });
HANDLERS['POST /api/sa/lockdown/'] = () => ok({ active: true });
HANDLERS['POST /api/sa/backup/manual/'] = () => ok({ success: true, message: 'Backup started' });
HANDLERS['GET /api/sa/custom-roles/'] = () => ok({ roles: [] });
HANDLERS['POST /api/sa/custom-roles/'] = () => created({ id: 1 });

HANDLERS['GET /api/principal/overview/'] = () => ok({
  success: true,
  school: { name: MOCK_SCHOOL.name },
  metrics: {
    students_total: MOCK_SCHOOL.total_students, teachers_total: MOCK_SCHOOL.total_teachers,
    classrooms_total: MOCK_CLASSES.length, pending_grade_changes: MOCK_MODIFICATION_REQUESTS.filter(r => r.status === 'pending').length,
    report_cards_pending: 3, report_cards_published: MOCK_REPORT_CARDS.length, active_term: (MOCK_TERMS.find(t => t.is_active) || MOCK_TERMS[0]).name,
  },
  message: 'Welcome to the Principal Dashboard',
});
HANDLERS['GET /api/principal/grade-approvals/'] = () => ok({ success: true, requests: MOCK_MODIFICATION_REQUESTS.filter(r => r.status === 'pending') });
HANDLERS['POST /api/principal/grade-approvals/'] = (path, method, body) => ok({ success: true, message: `Grade ${body.action} completed` });
HANDLERS['GET /api/principal/report-cards/'] = () => ok({ success: true, report_cards: MOCK_REPORT_CARDS, term: (MOCK_TERMS.find(t => t.is_active) || MOCK_TERMS[0]).name });
HANDLERS['POST /api/principal/report-cards/'] = (path, method, body) => ok({ success: true, message: 'Report card updated' });
HANDLERS['GET /api/principal/dashboard/'] = () => ok({
  metrics: { students_total: MOCK_SCHOOL.total_students, teachers_total: MOCK_SCHOOL.total_teachers, classrooms_total: MOCK_CLASSES.length, attendance_rate: MOCK_SCHOOL.attendance_rate, avg_performance: MOCK_SCHOOL.avg_performance },
  recent_activities: [
    { id: 1, type: 'grade_submission', description: 'Grades submitted for JSS 1A Mathematics', timestamp: daysAgo(1) },
    { id: 2, type: 'report_card', description: 'Report cards published for Term 2', timestamp: daysAgo(2) },
  ],
});
HANDLERS['GET /api/principal/class-performance/'] = () => ok({
  top: MOCK_CLASSES.slice(0, 3).map(c => ({ class_name: c.name, average: 70 + Math.floor(Math.random() * 20), trend: Math.random() > 0.5 ? 'up' : 'down' })),
  low: MOCK_CLASSES.slice(3, 5).map(c => ({ class_name: c.name, average: 50 + Math.floor(Math.random() * 15), trend: 'down' })),
});
HANDLERS['GET /api/principal/teacher-insights/'] = () => ok({ insights: MOCK_TEACHERS.map(t => ({ name: `${t.first_name} ${t.last_name}`, performance: Math.floor(Math.random() * 30) + 70, submission_rate: Math.floor(Math.random() * 30) + 70 })) });
HANDLERS['GET /api/principal/finance-snapshot/'] = () => ok({ collected: 1250000, outstanding: 340000, expenses: 1040000 });
HANDLERS['GET /api/principal/activity-feed/'] = () => ok({ items: [
  { id: 1, type: 'grade', description: 'Grades submitted for JSS 1A', timestamp: daysAgo(1), user: 'John Doe' },
  { id: 2, type: 'attendance', description: 'Attendance recorded for JSS 2A', timestamp: daysAgo(2), user: 'Mary Smith' },
  { id: 3, type: 'report_card', description: 'Report cards published', timestamp: daysAgo(3), user: 'Sarah Williams' },
] });

HANDLERS['GET /api/teacher/me/'] = () => ok({
  success: true,
  profile: {
    ...MOCK_TEACHERS[0], fullName: `${MOCK_TEACHERS[0].first_name} ${MOCK_TEACHERS[0].last_name}`,
    initials: MOCK_TEACHERS[0].first_name[0] + MOCK_TEACHERS[0].last_name[0],
    subjects: MOCK_SUBJECTS.filter(s => MOCK_TEACHER_CLASSES.filter(tc => tc.teacher_id === 1).some(tc => tc.subject_id === s.id)),
  }
});
HANDLERS['GET /api/teacher/classes/'] = () => ok({
  classes: MOCK_TEACHER_CLASSES.filter(tc => tc.teacher_id === 1).map(tc => {
    const cls = MOCK_CLASSES.find(c => c.id === tc.class_id);
    const sub = MOCK_SUBJECTS.find(s => s.id === tc.subject_id);
    return { ...cls, subject: sub, subject_id: tc.subject_id, teacher_id: tc.teacher_id };
  })
});
HANDLERS['GET /api/teacher/students/'] = (path, method, body, query) => {
  let students = [...MOCK_STUDENTS];
  if (query.class_id) students = students.filter(s => s.classroom_id === parseInt(query.class_id));
  return ok({ students: students.map(s => ({ ...s, fullName: `${s.first_name} ${s.last_name}`, initials: s.first_name[0] + s.last_name[0] })) });
};
HANDLERS['GET /api/teacher/gradebook/'] = (path, method, body, query) => {
  let grades = [...MOCK_GRADES];
  if (query.class_id) grades = grades.filter(g => g.classroom_id === parseInt(query.class_id));
  if (query.subject_id) grades = grades.filter(g => g.subject_id === parseInt(query.subject_id));
  return ok({ grades: grades.map(g => {
    const s = MOCK_STUDENTS.find(st => st.id === g.student_id);
    return { ...g, student_name: s ? `${s.first_name} ${s.last_name}` : 'Unknown', student: s };
  }) });
};
HANDLERS['POST /api/teacher/gradebook/'] = () => ok({ success: true, message: 'Grade draft saved' });
HANDLERS['POST /api/teacher/grades/lock/'] = () => ok({ success: true, message: 'Grades locked' });
HANDLERS['GET /api/teacher/grading-scheme/'] = () => ok({ success: true, scheme: MOCK_GRADING_SCHEME_DATA });
HANDLERS['GET /api/teacher/modification-requests/'] = () => ok({ modification_requests: MOCK_MODIFICATION_REQUESTS });
HANDLERS['POST /api/teacher/modification-requests/'] = (path, method, body) => created({ id: uuid(), ...body, status: 'pending', submitted_at: now() });
HANDLERS['GET /api/teacher/modification-requests/summary/'] = () => ok({ pending: MOCK_MODIFICATION_REQUESTS.filter(r => r.status === 'pending').length, approved: MOCK_MODIFICATION_REQUESTS.filter(r => r.status === 'approved').length, rejected: MOCK_MODIFICATION_REQUESTS.filter(r => r.status === 'rejected').length });
HANDLERS['GET /api/teacher/analytics/'] = (path, method, body, query) => {
  const classId = query.class_id;
  const cls = MOCK_CLASSES.find(c => c.id === parseInt(classId));
  return ok({
    class_id: classId, class_name: cls ? cls.name : 'Unknown',
    class_average: 72.4, pass_rate: 85, total_students: cls ? cls.student_count : 0,
    grade_distribution: { A: 4, B: 8, C: 10, D: 4, E: 2, F: 0 },
    top_performers: MOCK_STUDENTS.filter(s => s.classroom_id === parseInt(classId)).slice(0, 3).map(s => ({ name: `${s.first_name} ${s.last_name}`, score: Math.floor(Math.random() * 20) + 80 })),
    at_risk: MOCK_STUDENTS.filter(s => s.classroom_id === parseInt(classId)).slice(3, 5).map(s => ({ name: `${s.first_name} ${s.last_name}`, score: Math.floor(Math.random() * 15) + 40 })),
  });
};
HANDLERS['GET /api/teacher/assignments/'] = (path, method, body, query) => {
  let asgns = [...MOCK_ASSIGNMENTS];
  if (query.class_id) asgns = asgns.filter(a => a.class_id === parseInt(query.class_id));
  return ok({ assignments: asgns });
};
HANDLERS['POST /api/teacher/assignments/'] = (path, method, body) => created({ id: MOCK_ASSIGNMENTS.length + 1, ...body, school_id: 1, created_at: now() });
HANDLERS['GET /api/teacher/exam-list/'] = (path, method, body, query) => {
  let exams = [...MOCK_EXAMS];
  if (query.class_id) exams = exams.filter(e => e.classroom_id === parseInt(query.class_id));
  return ok({ exams });
};
HANDLERS['GET /api/teacher/exam-duties/'] = () => ok({ duties: MOCK_EXAM_DUTIES });
HANDLERS['GET /api/teacher/attendance/status/'] = () => ok({ classes: MOCK_CLASSES.map(c => ({ id: c.id, name: c.name, rate: 85 + Math.floor(Math.random() * 15), trend: Math.random() > 0.5 ? 'up' : 'down' })), at_risk: [] });
HANDLERS['GET /api/teacher/messages/'] = () => ok({ threads: MOCK_MESSAGES.reduce((acc, m) => { if (!acc.find(t => t.thread_id === m.thread_id)) acc.push({ thread_id: m.thread_id, subject: m.subject, last_message: m.body, last_date: m.created_at, unread: m.is_read ? 0 : 1, messages: [] }); return acc; }, []) });
HANDLERS['POST /api/teacher/messages/'] = (path, method, body) => created({ id: MOCK_MESSAGES.length + 1, ...body, created_at: now() });
HANDLERS['GET /api/teacher/resources/'] = (path, method, body, query) => {
  let res = [...MOCK_RESOURCES];
  if (query.class_id) res = res.filter(r => r.class_id === parseInt(query.class_id));
  return ok({ resources: res });
};
HANDLERS['POST /api/teacher/resources/'] = () => created({ id: MOCK_RESOURCES.length + 1 });
HANDLERS['GET /api/teacher/student-activity/'] = () => ok({ activities: [] });
HANDLERS['GET /api/teacher/announcements/'] = () => ok({ announcements: [] });
HANDLERS['POST /api/teacher/announcements/'] = (path, method, body) => created({ id: 1, ...body, created_at: now() });
HANDLERS['GET /api/teacher/at-risk-students/'] = () => ok({ students: [] });
HANDLERS['GET /api/teacher/tamper-count/'] = () => ok({ tamper_count: 0 });
HANDLERS['GET /api/teacher/access-log/'] = () => ok({ entries: [] });
HANDLERS['GET /api/teacher/channel-preferences/'] = () => ok({ preferences: { email: true, sms: false, push: true } });
HANDLERS['PATCH /api/teacher/channel-preferences/'] = (path, method, body) => ok({ preferences: body });
HANDLERS['GET /api/teacher/lesson-plans/'] = (path, method, body, query) => {
  let plans = [...MOCK_LESSON_PLANS];
  if (query.class_id) plans = plans.filter(p => p.class_id === parseInt(query.class_id));
  return ok({ lesson_plans: plans });
};
HANDLERS['POST /api/teacher/lesson-plans/'] = (path, method, body) => created({ id: MOCK_LESSON_PLANS.length + 1, ...body, school_id: 1 });
HANDLERS['GET /api/teacher/behaviour-incidents/'] = (path, method, body, query) => {
  let incidents = [...MOCK_BEHAVIOUR_INCIDENTS];
  if (query.student_id) incidents = incidents.filter(inc => inc.student_id === parseInt(query.student_id));
  return ok({ incidents });
};
HANDLERS['POST /api/teacher/behaviour-incidents/'] = () => created({ id: MOCK_BEHAVIOUR_INCIDENTS.length + 1 });
HANDLERS['GET /api/teacher/workload/'] = () => ok({ weekly_hours: 18, max_hours: 22, classes: MOCK_TEACHER_CLASSES.length });
HANDLERS['GET /api/teacher/performance/'] = () => ok({ overall: 82, trend: 'stable', categories: { teaching: 85, grading: 78, feedback: 80 } });
HANDLERS['GET /api/teacher/office-hours/'] = () => ok({ slots: MOCK_OFFICE_HOURS });
HANDLERS['POST /api/teacher/office-hours/'] = () => created({ id: MOCK_OFFICE_HOURS.length + 1 });
HANDLERS['GET /api/teacher/parent-threads/'] = () => ok({ threads: [] });
HANDLERS['GET /api/teacher/student-threads/'] = () => ok({ threads: [] });
HANDLERS['GET /api/teacher/feedback-templates/'] = () => ok({ templates: [] });
HANDLERS['GET /api/teacher/cohort-compare/'] = () => ok({ cohorts: [] });
HANDLERS['GET /api/teacher/voice-digest/'] = () => ok({ digest: { message: 'No new voice messages' } });
HANDLERS['GET /api/teacher/grade-receipts/'] = () => ok({ receipts: [] });
HANDLERS['GET /api/teacher/credentials/'] = () => ok({ credentials: MOCK_TEACHERS[0] });
HANDLERS['PATCH /api/teacher/credentials/'] = (path, method, body) => ok({ ...MOCK_TEACHERS[0], ...body });

HANDLERS['GET /api/student/me/'] = () => ok({
  ...MOCK_STUDENTS[0], fullName: `${MOCK_STUDENTS[0].first_name} ${MOCK_STUDENTS[0].last_name}`,
  initials: MOCK_STUDENTS[0].first_name[0] + MOCK_STUDENTS[0].last_name[0],
  classroom: MOCK_CLASSES.find(c => c.id === MOCK_STUDENTS[0].classroom_id),
  school: MOCK_SCHOOL,
});
HANDLERS['POST /api/student/change-password/'] = () => ok({ success: true });
HANDLERS['GET /api/student/terms/current/'] = () => ok(MOCK_TERMS.find(t => t.is_active) || MOCK_TERMS[0]);
HANDLERS['GET /api/student/terms/'] = () => ok({ terms: MOCK_TERMS });
HANDLERS['GET /api/student/grades/summary/'] = () => ok({
  summary: MOCK_SUBJECTS.slice(0, 5).map(s => {
    const studentGrades = MOCK_GRADES.filter(g => g.student_id === 1 && g.subject_id === s.id);
    const latest = studentGrades[studentGrades.length - 1];
    return { subject_id: s.id, subject_name: s.name, subject_code: s.code, total: latest?.total || 0, grade_letter: latest?.grade_letter || 'N/A', status: latest?.approval_status || 'pending' };
  }),
  average: 72.4, grade_count: MOCK_GRADES.filter(g => g.student_id === 1).length,
});
HANDLERS['GET /api/student/grades/'] = (path, method, body, query) => {
  let grades = MOCK_GRADES.filter(g => g.student_id === 1);
  if (query.term_id) grades = grades.filter(g => g.term_id === parseInt(query.term_id));
  return ok({ grades: grades.map(g => {
    const sub = MOCK_SUBJECTS.find(s => s.id === g.subject_id);
    return { ...g, subject_name: sub?.name, subject_code: sub?.code };
  }) });
};
HANDLERS['GET /api/student/report-cards/'] = () => ok({ report_cards: MOCK_REPORT_CARDS.filter(r => r.student_id === 1) });
HANDLERS['GET /api/student/notifications/'] = (path, method, body, query) => {
  const limit = parseInt(query.limit) || 20;
  return ok({ notifications: MOCK_NOTIFICATIONS.filter(n => n.user_id === 4).slice(0, limit), unread_count: MOCK_NOTIFICATIONS.filter(n => n.user_id === 4 && !n.is_read).length });
};
HANDLERS['POST /api/student/notifications/'] = () => ok({ success: true });
HANDLERS['GET /api/student/security-health/'] = () => ok({ score: 85, two_factor: false, devices: [{ id: 1, name: 'Chrome on Windows', last_access: daysAgo(1), is_current: true }] });
HANDLERS['GET /api/student/2fa/setup/'] = () => ok({ enabled: false, qr_code: null });
HANDLERS['POST /api/student/2fa/setup/'] = () => ok({ success: true });
HANDLERS['GET /api/student/financials/'] = () => ok({ total_fees: 113000, paid: 85000, balance: 28000, status: 'partial' });
HANDLERS['GET /api/student/timetable/'] = () => ok({ timetable: MOCK_TIMETABLE.filter(t => t.class_id === 1) });
HANDLERS['GET /api/student/assignments/'] = (path, method, body, query) => ok({ assignments: MOCK_ASSIGNMENTS.filter(a => a.class_id === 1) });
HANDLERS['GET /api/student/messages/'] = () => ok({ conversations: [{ id: 't1', subject: 'Math Homework', last_message: MOCK_MESSAGES[0].body, unread: 1, updated_at: MOCK_MESSAGES[0].created_at }] });
HANDLERS['GET /api/student/resources/'] = () => ok({ resources: MOCK_RESOURCES.filter(r => r.class_id === 1) });
HANDLERS['GET /api/student/attendance/'] = (path, method, body, query) => {
  const att = MOCK_ATTENDANCE.filter(a => a.student_id === 1);
  return ok({ attendance: att, stats: { present: att.filter(a => a.status === 'present').length, absent: att.filter(a => a.status === 'absent').length, late: att.filter(a => a.status === 'late').length, rate: 92 } });
};
HANDLERS['GET /api/student/grade-insights/'] = () => ok({ insights: { strengths: ['Mathematics', 'Physics'], weaknesses: ['Chemistry', 'Biology'], predicted_grade: 'B' } });
HANDLERS['GET /api/student/events/'] = () => ok({ events: [] });
HANDLERS['GET /api/student/access-log/'] = () => ok({ entries: [] });
HANDLERS['GET /api/student/channel-preferences/'] = () => ok({ preferences: { email: true, sms: false, push: true } });
HANDLERS['PATCH /api/student/channel-preferences/'] = (path, method, body) => ok({ preferences: body });
HANDLERS['GET /api/student/goals/'] = (path, method, body, query) => {
  let goals = [...MOCK_GOALS];
  if (query.term_id) goals = goals.filter(g => g.term_id === parseInt(query.term_id));
  return ok({ goals });
};
HANDLERS['PUT /api/student/goals/'] = (path, method, body) => ok({ id: uuid(), ...body });
HANDLERS['GET /api/student/office-hours/'] = () => ok({ slots: MOCK_OFFICE_HOURS });
HANDLERS['GET /api/student/study-groups/'] = () => ok({ groups: MOCK_STUDY_GROUPS });
HANDLERS['POST /api/student/study-groups/:id/join/'] = () => ok({ success: true });
HANDLERS['POST /api/student/study-groups/:id/leave/'] = () => ok({ success: true });
HANDLERS['GET /api/student/streaks/'] = () => ok({ current_streak: 5, longest_streak: 12, this_week: 3 });
HANDLERS['GET /api/student/digital-id/'] = () => ok({ student: MOCK_STUDENTS[0], school: MOCK_SCHOOL });
HANDLERS['GET /api/student/transcript/'] = () => ok({ transcript: { student: MOCK_STUDENTS[0], terms: MOCK_TERMS, grades: MOCK_GRADES.filter(g => g.student_id === 1), cumulative_average: 74.2 } });
HANDLERS['GET /api/student/tamper-count/'] = () => ok({ count: 0 });
HANDLERS['GET /api/student/parental-access-log/'] = () => ok({ entries: [] });
HANDLERS['GET /api/student/documents/'] = () => ok({ documents: [] });
HANDLERS['GET /api/student/study-plan/'] = () => ok({ plan: null });
HANDLERS['PUT /api/student/study-plan/'] = (path, method, body) => ok({ ...body, saved: true });
HANDLERS['GET /api/student/voice-summary/'] = () => ok({ message: 'No voice summaries' });

HANDLERS['GET /api/parent/children/'] = () => ok({ success: true, children: MOCK_PARENT_CHILDREN, parent: { fullName: 'Robert Johnson' } });
HANDLERS['GET /api/parent/students/'] = () => ok({ success: true, children: MOCK_PARENT_CHILDREN });
HANDLERS['GET /api/parent/profile/'] = () => ok({ profile: MOCK_USERS.parent });
HANDLERS['PATCH /api/parent/profile/'] = (path, method, body) => ok({ ...MOCK_USERS.parent, ...body });
HANDLERS['GET /api/parent/notifications/'] = (path, method, body, query) => {
  const limit = parseInt(query.limit) || 20;
  return ok({ notifications: MOCK_NOTIFICATIONS.filter(n => n.user_id === 5).slice(0, limit), unread_count: MOCK_NOTIFICATIONS.filter(n => n.user_id === 5 && !n.is_read).length });
};
HANDLERS['POST /api/parent/notifications/'] = () => ok({ success: true });
HANDLERS['GET /api/parent/2fa/setup/'] = () => ok({ enabled: false, qr_code: null });
HANDLERS['POST /api/parent/2fa/setup/'] = () => ok({ success: true });
HANDLERS['GET /api/parent/children/:childId/grades/'] = (path, method, body, query, params) => {
  const childId = parseInt(params.childId);
  const termId = query.term_id ? parseInt(query.term_id) : null;
  let grades = MOCK_GRADES.filter(g => g.student_id === childId);
  if (termId) grades = grades.filter(g => g.term_id === termId);
  return ok({ grades: grades.map(g => {
    const sub = MOCK_SUBJECTS.find(s => s.id === g.subject_id);
    return { ...g, subject_name: sub?.name, subject_code: sub?.code };
  }) });
};
HANDLERS['GET /api/parent/children/:childId/report-cards/'] = (path, method, body, query, params) => {
  const childId = parseInt(params.childId);
  return ok({ report_cards: MOCK_REPORT_CARDS.filter(r => r.student_id === childId) });
};
HANDLERS['GET /api/parent/children/:childId/attendance/'] = (path, method, body, query, params) => {
  const childId = parseInt(params.childId);
  const att = MOCK_ATTENDANCE.filter(a => a.student_id === childId);
  return ok({ attendance: att, stats: { present: att.filter(a => a.status === 'present').length, absent: att.filter(a => a.status === 'absent').length, late: att.filter(a => a.status === 'late').length, rate: 90 } });
};
HANDLERS['GET /api/parent/children/:childId/behavior/'] = () => ok({ incidents: MOCK_BEHAVIOUR_INCIDENTS });
HANDLERS['GET /api/parent/children/:childId/fees/'] = (path, method, body, query, params) => ok({ fees: { child_id: parseInt(params.childId), total: 113000, paid: 85000, balance: 28000, status: 'partial' } });
HANDLERS['GET /api/parent/children/:childId/tamper-count/'] = () => ok({ count: 0 });
HANDLERS['GET /api/parent/payment-channels/'] = () => ok({ channels: [{ id: 1, name: 'Card Payment', active: true }, { id: 2, name: 'Bank Transfer', active: true }] });
HANDLERS['POST /api/parent/payments/start/'] = () => ok({ success: true, payment_url: 'https://pay.example.com/123', reference: 'PAY-123' });
HANDLERS['GET /api/parent/receipts/'] = () => ok({ receipts: [] });
HANDLERS['GET /api/parent/access-log/'] = () => ok({ entries: [] });
HANDLERS['GET /api/parent/channel-preferences/'] = () => ok({ preferences: { email: true, sms: true, push: false } });
HANDLERS['PATCH /api/parent/channel-preferences/'] = (path, method, body) => ok({ preferences: body });
HANDLERS['GET /api/parent/conferences/'] = () => ok({ slots: MOCK_CONFERENCE_SLOTS });
HANDLERS['POST /api/parent/conferences/:id/claim/'] = () => ok({ success: true });
HANDLERS['DELETE /api/parent/conferences/:id/claim/'] = () => ok({ success: true });
HANDLERS['GET /api/parent/co-guardians/'] = () => ok({ co_guardians: MOCK_CO_GUARDIANS });
HANDLERS['POST /api/parent/co-guardians/'] = () => created({ id: MOCK_CO_GUARDIANS.length + 1 });
HANDLERS['GET /api/parent/pickup/'] = () => ok({ pickup_list: MOCK_PICKUP_LIST });
HANDLERS['POST /api/parent/pickup/'] = (path, method, body) => created({ id: MOCK_PICKUP_LIST.length + 1, ...body });
HANDLERS['GET /api/parent/permission-slips/'] = () => ok({ permission_slips: MOCK_PERMISSION_SLIPS });
HANDLERS['POST /api/parent/permission-slips/:id/sign/'] = () => ok({ success: true });
HANDLERS['GET /api/parent/acknowledgments/'] = () => ok({ acknowledgments: [] });
HANDLERS['POST /api/parent/acknowledgments/'] = () => ok({ success: true });
HANDLERS['GET /api/parent/events/'] = () => ok({ events: [] });
HANDLERS['GET /api/parent/donations/'] = () => ok({ campaigns: MOCK_DONATION_CAMPAIGNS });
HANDLERS['POST /api/parent/donations/'] = (path, method, body) => created({ id: 1, ...body, created_at: now() });
HANDLERS['GET /api/parent/family-activity/'] = () => ok({ activities: [] });
HANDLERS['GET /api/parent/weekly-digest/'] = () => ok({ digest: { week: 'May 11-17', summary: 'Your child had a good week', attendance: 95, new_grades: 3 } });
HANDLERS['GET /api/parent/voice-digest/'] = () => ok({ message: 'No new voice messages' });
HANDLERS['GET /api/parent/whistleblower/categories/'] = () => ok({ categories: MOCK_WHISTLEBLOWER_CATEGORIES });
HANDLERS['POST /api/parent/whistleblower/submit/'] = (path, method, body) => created({ key: 'WB-' + uuid().slice(0, 8).toUpperCase(), ...body, created_at: now() });
HANDLERS['GET /api/parent/whistleblower/:key/'] = () => ok({ status: 'received', message: 'Your report has been received and will be reviewed.' });
HANDLERS['GET /api/parent/children/:childId/teacher-threads/'] = () => ok({ threads: [] });

HANDLERS['GET /api/live-classes/'] = () => ok({ live_classes: MOCK_LIVE_CLASSES });
HANDLERS['POST /api/live-classes/'] = (path, method, body) => created({ id: MOCK_LIVE_CLASSES.length + 1, ...body, school_id: 1 });
HANDLERS['GET /api/whistleblower/categories/'] = () => ok({ categories: MOCK_WHISTLEBLOWER_CATEGORIES });
HANDLERS['POST /api/whistleblower/submit/'] = (path, method, body) => created({ key: 'WB-' + uuid().slice(0, 8).toUpperCase(), ...body, created_at: now() });
HANDLERS['GET /api/whistleblower/:key/'] = () => ok({ status: 'received' });

HANDLERS['GET /api/registration/check-status'] = () => ok({ status: 'approved', school_name: MOCK_SCHOOL.name, submitted_at: daysAgo(30), can_access_dashboard: true });
HANDLERS['POST /api/send-otp/'] = () => ok({ success: true, message: 'OTP sent to your email' });
HANDLERS['POST /api/verify-otp/'] = () => ok({ success: true, message: 'OTP verified' });
HANDLERS['POST /api/registration/register-school-admin'] = () => created({ success: true, message: 'Registration submitted for review' });

HANDLERS['GET /api/csrf-token/'] = () => ok({ csrfToken: 'mock-csrf-token-' + Date.now() });
HANDLERS['POST /api/logout/'] = () => ok({ success: true });

function findHandler(url, method) {
  const path = getPath(url);
  const query = parseQuery(url);

  const exactKey = `${method} ${path}/`.replace(/\/+/g, '/').replace(/\/$/, '');
  const exactKeyNoSlash = `${method} ${path}`;
  
  let handler = HANDLERS[exactKey] || HANDLERS[exactKeyNoSlash];

  if (!handler) {
    for (const key of Object.keys(HANDLERS)) {
      const keyParts = key.split(' ');
      const keyMethod = keyParts[0];
      const keyPath = keyParts.slice(1).join(' ');
      if (keyMethod !== method && keyMethod !== 'ALL') continue;
      
      const keyRegex = new RegExp('^' + keyPath
        .replace(/\/$/, '')
        .replace(/:/g, '\\:')
        .replace(/:(\w+)/g, '([^/]+)')
        .replace(/\//g, '\\/') + '/?$', 'i');
      
      const m = path.match(keyRegex);
      if (m) {
        const paramNames = (keyPath.match(/:(\w+)/g) || []).map(p => p.slice(1));
        const params = {};
        paramNames.forEach((name, i) => params[name] = m[i + 1]);
        
        handler = (p, meth, body, q) => {
          return HANDLERS[key](p, meth, body, q, params);
        };
        break;
      }
    }
  }

  return { handler, path, query };
}

function mockFetch(input, init = {}) {
  const url = typeof input === 'string' ? input : input.url;
  const method = (init.method || 'GET').toUpperCase();
  let body = null;
  try {
    body = init.body ? JSON.parse(init.body) : null;
  } catch (e) {
    body = init.body || null;
  }

  const { handler, query } = findHandler(url, method);

  let result;
  if (handler) {
    result = handler(url, method, body, query);
  } else {
    result = { status: 404, data: { error: `No mock handler for ${method} ${getPath(url)}` } };
  }

  const responseBody = JSON.stringify(result.data);
  return Promise.resolve(new Response(responseBody, {
    status: result.status,
    statusText: result.status === 200 ? 'OK' : result.status === 404 ? 'Not Found' : result.status === 401 ? 'Unauthorized' : 'Error',
    headers: { 'Content-Type': 'application/json' },
  }));
}

function installMockGlobals() {
  const origFetch = window.fetch.bind(window);
  window.fetch = mockFetch;
  return () => { window.fetch = origFetch; };
}

function setupMockMode(role = 'school_admin') {
  setRole(role);
  return installMockGlobals();
}

export {
  setupMockMode, setRole, mockFetch, installMockGlobals, findHandler, HANDLERS,
  currentUser, currentRole, MOCK_USERS, MOCK_SCHOOL, MOCK_CLASSES, MOCK_STUDENTS,
  MOCK_TEACHERS, MOCK_GRADES, MOCK_SUBJECTS, MOCK_TERMS, MOCK_ACADEMIC_YEARS,
  MOCK_ATTENDANCE, MOCK_NOTIFICATIONS, MOCK_MESSAGES, MOCK_ASSIGNMENTS,
};
