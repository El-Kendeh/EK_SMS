export const ROLES = {
  SUPERADMIN: 'superadmin',
  SCHOOL_ADMIN: 'school_admin',
  PRINCIPAL: 'principal',
  BURSAR: 'bursar',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
};

export const ROLE_LABELS = {
  superadmin: 'Super Admin',
  school_admin: 'School Admin',
  principal: 'Principal',
  bursar: 'Finance',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
};

export const PAGE_PERMISSIONS = {
  /* ── Core pages (visible to everyone) ── */
  overview:        [ROLES.SUPERADMIN, ROLES.SCHOOL_ADMIN, ROLES.PRINCIPAL, ROLES.BURSAR, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT],
  profile:         [ROLES.SUPERADMIN, ROLES.SCHOOL_ADMIN, ROLES.PRINCIPAL, ROLES.BURSAR, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT],
  notifications:   [ROLES.SUPERADMIN, ROLES.SCHOOL_ADMIN, ROLES.PRINCIPAL, ROLES.BURSAR, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT],
  settings:        [ROLES.SUPERADMIN, ROLES.SCHOOL_ADMIN],

  /* ── Superadmin only: school management ── */
  applications:    [ROLES.SUPERADMIN],
  review:          [ROLES.SUPERADMIN],
  'app-history':   [ROLES.SUPERADMIN],
  'version-compare':[ROLES.SUPERADMIN],
  rejected:        [ROLES.SUPERADMIN],
  'rejection-audit':[ROLES.SUPERADMIN],
  schools:         [ROLES.SUPERADMIN],

  /* ── Superadmin only: system config (Academics section) ── */
  'academic-year':   [ROLES.SUPERADMIN],
  'academic-terms':  [ROLES.SUPERADMIN],
  'institution-type':[ROLES.SUPERADMIN],
  'school-capacity': [ROLES.SUPERADMIN],
  countries:         [ROLES.SUPERADMIN],
  regions:           [ROLES.SUPERADMIN],
  cities:            [ROLES.SUPERADMIN],
  'school-type':     [ROLES.SUPERADMIN],
  'syllabus-type':   [ROLES.SUPERADMIN],
  'class-subtype':   [ROLES.SUPERADMIN],
  'academic-system': [ROLES.SUPERADMIN],
  'grading-system':  [ROLES.SUPERADMIN],

  /* ── Superadmin + School Admin: school-level management ── */
  classes:         [ROLES.SUPERADMIN, ROLES.SCHOOL_ADMIN],
  subjects:        [ROLES.SUPERADMIN, ROLES.SCHOOL_ADMIN],
  teachers:        [ROLES.SUPERADMIN, ROLES.SCHOOL_ADMIN],
  students:        [ROLES.SUPERADMIN, ROLES.SCHOOL_ADMIN],
  parents:         [ROLES.SUPERADMIN, ROLES.SCHOOL_ADMIN],
  /* School admins create + manage their own school's leadership and finance
     accounts; the backend pins them to their school_id from the token. */
  principal:       [ROLES.SUPERADMIN, ROLES.SCHOOL_ADMIN],
  bursar:          [ROLES.SUPERADMIN, ROLES.SCHOOL_ADMIN],
  'finance-users': [ROLES.SUPERADMIN, ROLES.SCHOOL_ADMIN],

  /* ── Account-management nav (same as underlying model) ── */
  'account-teachers': [ROLES.SUPERADMIN, ROLES.SCHOOL_ADMIN],
  'account-students': [ROLES.SUPERADMIN, ROLES.SCHOOL_ADMIN],
  'account-parents':  [ROLES.SUPERADMIN, ROLES.SCHOOL_ADMIN],

  /* ── Grades section ── */
  'grade-entry':       [ROLES.TEACHER],
  'grade-approvals':   [ROLES.PRINCIPAL, ROLES.SUPERADMIN],
  'principal-users':   [ROLES.PRINCIPAL, ROLES.SUPERADMIN],
  'grade-integrity':   [ROLES.SUPERADMIN],
  'grades-accumulation':[ROLES.SUPERADMIN],
  'my-grades':         [ROLES.STUDENT],
  'children-grades':   [ROLES.PARENT],
  test:                [ROLES.TEACHER],
  assignment:          [ROLES.TEACHER, ROLES.STUDENT],
  examination:         [ROLES.TEACHER, ROLES.SCHOOL_ADMIN],
  'grade-report':      [ROLES.SUPERADMIN],
  'grade-requests':    [ROLES.SUPERADMIN],
  'grade-audit':       [ROLES.SUPERADMIN],

  /* ── Attendance section ── */
  'attendance-record':   [ROLES.TEACHER],
  'attendance-report':   [ROLES.SCHOOL_ADMIN, ROLES.PRINCIPAL, ROLES.SUPERADMIN],
  'attendance-teachers': [ROLES.TEACHER],
  /* Students use 'my-attendance' (Student section); 'attendance-students'
     was a redundant, unbuilt duplicate — removed from the student sidebar. */
  'attendance-students': [],
  'my-attendance':       [ROLES.STUDENT],
  'children-attendance': [ROLES.PARENT],

  /* ── My Classes (Teacher) ── */
  'my-classes':          [ROLES.TEACHER],
  'my-timetable':        [ROLES.STUDENT],

  /* ── Lessons section ── */
  'lesson-plans':        [ROLES.TEACHER],
  'lesson-plan-type':    [ROLES.SUPERADMIN],
  'lesson-plan-generation':[ROLES.TEACHER],
  /* Students use 'my-timetable' (Student section); the generic 'timetable'
     stays teacher-only to avoid a duplicate blank entry in the student nav. */
  timetable:             [ROLES.TEACHER],
  'timetable-mgr':       [ROLES.SCHOOL_ADMIN],

  /* ── Fees & Finance section ── */
  /* Finance endpoints resolve the school from the token's school_id;
     superadmins target a school via the SASchoolScope picker (?school_id=). */
  'fee-dashboard':      [ROLES.BURSAR, ROLES.SCHOOL_ADMIN, ROLES.SUPERADMIN],
  'fee-categories':     [ROLES.BURSAR, ROLES.SCHOOL_ADMIN],
  'student-fees':       [ROLES.BURSAR],
  'finance-team':       [ROLES.BURSAR],
  'finance-reports':    [ROLES.BURSAR],
  /* Stub-only pages — removed from BURSAR (real pages cover these flows);
     kept for SCHOOL_ADMIN until its own finance pages are built. */
  'fees-structure':     [ROLES.SCHOOL_ADMIN],
  'fees-payment':       [],
  payments:             [ROLES.BURSAR],
  expenses:             [ROLES.BURSAR],
  'receipt-generator':  [],
  'school-financial-report': [ROLES.SCHOOL_ADMIN, ROLES.SUPERADMIN],
  'my-fees':            [ROLES.STUDENT, ROLES.PARENT],

  /* ── Report Cards section ── */
  'report-card-generator':      [ROLES.SCHOOL_ADMIN],
  'report-card-approval':       [ROLES.PRINCIPAL, ROLES.SUPERADMIN],
  'report-cards-published':     [ROLES.PRINCIPAL, ROLES.SCHOOL_ADMIN, ROLES.SUPERADMIN],
  'my-report-cards':            [ROLES.STUDENT],
  'children-report-cards':      [ROLES.PARENT],

  /* ── Batch Transfer (superadmin only) ── */
  'batch-grades':      [ROLES.SUPERADMIN],
  'batch-students':    [ROLES.SUPERADMIN],
  'batch-image-data':  [ROLES.SUPERADMIN],

  /* ── Virtual Class / Meeting ── */
  'live-class':        [ROLES.TEACHER, ROLES.STUDENT],
  'vm-parents':        [ROLES.SUPERADMIN],
  'vm-staffs':         [ROLES.SUPERADMIN],
  'vm-students':       [ROLES.SUPERADMIN],

  /* ── School Admin only pages ── */
  'syllabus-progress':    [ROLES.SCHOOL_ADMIN, ROLES.PRINCIPAL],
  'exam-schedule':        [ROLES.SCHOOL_ADMIN],
  rooms:                  [ROLES.SCHOOL_ADMIN],
  'grading-scheme':       [ROLES.SCHOOL_ADMIN],
  'academic-calendar':    [ROLES.SCHOOL_ADMIN],
  promotions:             [ROLES.SCHOOL_ADMIN],
  'teacher-assignments':  [ROLES.SCHOOL_ADMIN],
  'exam-officers':        [ROLES.SCHOOL_ADMIN],
  'ai-capture':           [ROLES.SCHOOL_ADMIN],

  /* ── Superadmin only: system ── */
  'security-logs':  [ROLES.SUPERADMIN],
  forensics:        [ROLES.SUPERADMIN],
  'alert-broadcast':[ROLES.SUPERADMIN],
  'system-health':  [ROLES.SUPERADMIN],
  'change-alerts':  [ROLES.SUPERADMIN],
  analytics:        [ROLES.SUPERADMIN],
  benchmarks:       [ROLES.SUPERADMIN],
  onboarding:       [ROLES.SUPERADMIN],
  governance:       [ROLES.SUPERADMIN],
  'system-audits':  [ROLES.SUPERADMIN],
  reports:          [ROLES.SUPERADMIN],
};

export function canAccess(pageKey, role) {
  const allowed = PAGE_PERMISSIONS[pageKey];
  return allowed ? allowed.includes(role) : false;
}
