const ROLES = {
  SUPERADMIN: 'superadmin',
  SCHOOL_ADMIN: 'school_admin',
  PRINCIPAL: 'principal',
  BURSAR: 'bursar',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
};

const ROLE_GATES = {
  // School-level write access (admin mutations)
  SCHOOL_WRITE: [ROLES.SUPERADMIN, ROLES.SCHOOL_ADMIN],

  // Leadership read access (sensitive listings)
  LEADERSHIP_READ: [ROLES.SUPERADMIN, ROLES.SCHOOL_ADMIN, ROLES.PRINCIPAL],

  // Finance read access
  FINANCE_READ: [ROLES.SUPERADMIN, ROLES.SCHOOL_ADMIN, ROLES.PRINCIPAL, ROLES.BURSAR],

  // Principal suite access
  PRINCIPAL_ACCESS: [ROLES.SUPERADMIN, ROLES.SCHOOL_ADMIN, ROLES.PRINCIPAL],

  // Principal governance reads
  PRINCIPAL_ONLY_READ: [ROLES.SUPERADMIN, ROLES.PRINCIPAL],

  // Principal write actions
  PRINCIPAL_WRITE: [ROLES.SUPERADMIN, ROLES.PRINCIPAL],

  // Finance suite access
  FINANCE_ACCESS: [ROLES.SUPERADMIN, ROLES.SCHOOL_ADMIN, ROLES.PRINCIPAL, ROLES.BURSAR],

  // Finance write actions
  FINANCE_WRITE: [ROLES.SUPERADMIN, ROLES.SCHOOL_ADMIN, ROLES.BURSAR],

  // Account admin actions (create finance/principal users)
  ACCOUNT_ADMIN: [ROLES.SUPERADMIN, ROLES.SCHOOL_ADMIN],

  // Academic write (grade governance, report cards)
  ACADEMIC_WRITE: [ROLES.SUPERADMIN, ROLES.PRINCIPAL],

  // Expense recording
  CAN_RECORD_EXPENSE: [ROLES.BURSAR, ROLES.SCHOOL_ADMIN, ROLES.PRINCIPAL, ROLES.SUPERADMIN],

  // Expense approval
  CAN_APPROVE_EXPENSE: [ROLES.SCHOOL_ADMIN, ROLES.PRINCIPAL, ROLES.SUPERADMIN],

  // Live class management
  CAN_MANAGE_LIVE_CLASS: [ROLES.SUPERADMIN, ROLES.SCHOOL_ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER],

  // Superadmin only
  SUPERADMIN_ONLY: [ROLES.SUPERADMIN],
};

module.exports = { ROLES, ROLE_GATES };
