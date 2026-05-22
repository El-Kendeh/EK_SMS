// Mock data for new Parent dashboard features. Deterministic.

export const mockTamperByChild = {
  'stu-001': { total: 1, blocked: 1, successful: 0, lastAttemptAt: '2026-04-22T14:23:00.000Z' },
  'stu-002': { total: 0, blocked: 0, successful: 0, lastAttemptAt: null },
};

export const mockWhereIveBeen = [
  { section: 'Grades · Aminata',        accessedAt: '2026-04-30T08:14:00.000Z', device: 'Mobile App', location: 'Freetown' },
  { section: 'Report Cards · Aminata',  accessedAt: '2026-04-29T20:02:00.000Z', device: 'Mobile App', location: 'Freetown' },
  { section: 'Fees · Mohamed',          accessedAt: '2026-04-29T19:35:00.000Z', device: 'Mobile App', location: 'Freetown' },
  { section: 'Behaviour · Mohamed',     accessedAt: '2026-04-28T11:11:00.000Z', device: 'Desktop',    location: 'Freetown' },
  { section: 'Attendance · Aminata',    accessedAt: '2026-04-27T07:33:00.000Z', device: 'SMS gateway',location: 'Bo' },
];

export const mockChannelPreferences = {
  inApp: { gradePosted: true,  modificationAttempt: true,  feeDue: true,  event: true,  message: true,  pickup: true,  permissionSlip: true },
  push:  { gradePosted: true,  modificationAttempt: true,  feeDue: false, event: true,  message: true,  pickup: true,  permissionSlip: false },
  email: { gradePosted: true,  modificationAttempt: true,  feeDue: true,  event: false, message: false, pickup: true,  permissionSlip: true  },
  sms:   { gradePosted: false, modificationAttempt: true,  feeDue: true,  event: false, message: false, pickup: true,  permissionSlip: false },
};

export const mockWhistleblowerCategories = [
  { id: 'corruption', label: 'Bribery or corruption' },
  { id: 'misconduct', label: 'Staff misconduct toward my child' },
  { id: 'safety',     label: 'Safety / harassment' },
  { id: 'grading',    label: 'Suspicious grading' },
  { id: 'fees',       label: 'Suspicious fee request' },
  { id: 'other',      label: 'Other' },
];

export const mockConferenceSlots = [
  { id: 'cf-1', teacher: 'Mr. Daniel Sesay', subject: 'Mathematics',   childId: 'stu-001', start: '2026-05-04T15:00:00.000Z', durationMin: 20, room: 'Faculty Room A', booked: false },
  { id: 'cf-2', teacher: 'Mrs. Aisha Bah',   subject: 'Biology',       childId: 'stu-001', start: '2026-05-05T16:15:00.000Z', durationMin: 30, room: 'Lab 2',         booked: true,  bookedBy: 'self', topic: 'Lab catch-up' },
  { id: 'cf-3', teacher: 'Mr. Kamara',       subject: 'Class teacher', childId: 'stu-002', start: '2026-05-06T14:00:00.000Z', durationMin: 25, room: 'Class 7B',      booked: false },
  { id: 'cf-4', teacher: 'Ms. Fofanah',      subject: 'English',       childId: 'stu-002', start: '2026-05-07T13:30:00.000Z', durationMin: 20, room: 'Class 7B',      booked: false },
];

export const mockCounsellor = {
  counsellorName: 'Ms. Adama Conteh',
  availability: 'Mon–Fri, 09:00–16:00',
  thread: [
    { id: 'pwb-1', sender: 'counsellor', text: 'Hello — this room is private. Anything you share about your family stays between us unless you ask otherwise.', sentAt: '2026-04-25T10:02:00.000Z' },
  ],
};

export const mockTeacherThreads = {
  'stu-001:sub-01': {
    teacherName: 'Mr. Daniel Sesay',
    teacherRole: 'Mathematics',
    messages: [
      { id: 'm-1', sender: 'teacher', text: 'Aminata is doing very well in algebra. She could push for top marks next term.', sentAt: '2026-04-26T09:14:00.000Z' },
    ],
  },
  'stu-001:sub-03': {
    teacherName: 'Mr. Abu Kamara',
    teacherRole: 'Biology',
    messages: [],
  },
  'stu-002:sub-01': {
    teacherName: 'Mr. Kamara',
    teacherRole: 'Class teacher',
    messages: [
      { id: 'm-2', sender: 'teacher', text: 'Mohamed has missed 2 homework submissions this week. Could we discuss in office hours?', sentAt: '2026-04-29T17:21:00.000Z' },
    ],
  },
};

export const mockCoGuardians = [
  { id: 'g-1', name: 'Fatmata Kamara', relationship: 'Mother', email: 'fatmata.k@example.sl',  phone: '+23276001234', primary: true,  lastLogin: '2026-04-30T08:14:00.000Z', children: ['stu-001', 'stu-002'] },
  { id: 'g-2', name: 'Ibrahim Kamara', relationship: 'Father', email: 'ibrahim.k@example.sl',  phone: '+23278005678', primary: false, lastLogin: '2026-04-28T07:33:00.000Z', children: ['stu-001', 'stu-002'] },
];

export const mockPickupAllowList = [
  { id: 'pk-1', name: 'Fatmata Kamara',  relationship: 'Mother',     phone: '+23276001234', expiry: null, photoColor: '#5b8cff', children: ['stu-001', 'stu-002'] },
  { id: 'pk-2', name: 'Ibrahim Kamara',  relationship: 'Father',     phone: '+23278005678', expiry: null, photoColor: '#22c55e', children: ['stu-001', 'stu-002'] },
  { id: 'pk-3', name: 'Aunt Mariama',    relationship: 'Aunt',       phone: '+23277123456', expiry: '2026-12-31', photoColor: '#a855f7', children: ['stu-001'] },
  { id: 'pk-4', name: 'Driver Joseph',   relationship: 'School run', phone: '+23278555111', expiry: '2026-09-30', photoColor: '#f59e0b', children: ['stu-001', 'stu-002'] },
];

export const mockPermissionSlips = [
  { id: 'ps-1', title: 'Field trip — Botanical Gardens', childId: 'stu-001', issuedAt: '2026-04-25', dueBy: '2026-05-05', status: 'pending', body: 'School trip to the Botanical Gardens on 2026-05-12. Bus departs 8:00, returns 16:00. Cost: SLL 50,000 (lunch + transport).' },
  { id: 'ps-2', title: 'Vaccination consent',           childId: 'stu-002', issuedAt: '2026-04-20', dueBy: '2026-04-29', status: 'signed',  body: 'Consent for the routine HPV vaccination programme as offered by the Ministry of Health.', signedAt: '2026-04-22T11:45:00.000Z' },
];

export const mockEvents = [
  { type: 'Event',    title: 'Inter-house sports day',     date: '2026-05-08', location: 'Main field',   audience: 'all' },
  { type: 'Exam',     title: 'Mid-term exam — Mathematics', date: '2026-05-12', location: 'Hall A',      audience: 'classroom-10A' },
  { type: 'Holiday',  title: 'Eid al-Fitr',                date: '2026-05-18', location: '',            audience: 'all' },
  { type: 'Deadline', title: 'Term-2 fees due',            date: '2026-05-22', location: '',            audience: 'all' },
  { type: 'Event',    title: 'Parent-teacher conference', date: '2026-05-25', location: 'Hall B',      audience: 'all' },
];

export const mockFeesByChildExtras = {
  // Per-child summary used by extended ParentFees
  'stu-001': {
    academicYear: '2024/25',
    totalFees: 1500000,
    paidToDate: 1500000,
    outstanding: 0,
    siblingDiscountPct: 10,
    nextInstalmentDate: null,
  },
  'stu-002': {
    academicYear: '2024/25',
    totalFees: 1350000, // already discounted (10% sibling)
    paidToDate: 1100000,
    outstanding: 250000,
    siblingDiscountPct: 10,
    nextInstalmentDate: '2026-05-22',
  },
};

export const mockPaymentChannels = [
  { id: 'orange-money', label: 'Orange Money', icon: 'phone_iphone', flow: 'mobile' },
  { id: 'africell',     label: 'Africell Money', icon: 'phone_iphone', flow: 'mobile' },
  { id: 'bank-transfer',label: 'Bank Transfer', icon: 'account_balance', flow: 'bank' },
  { id: 'card',         label: 'Card',         icon: 'credit_card',   flow: 'card' },
];

export const mockReceipts = [
  // generated lazily on payment; pre-seeded one for demo
  { id: 'rcp-2025-0142', childId: 'stu-001', amount: 1500000, paidAt: '2025-09-15T10:00:00.000Z', method: 'Bank Transfer', verificationHash: 'b71fa9e0c1b248b7449ea031adef9c7c' },
];

export const mockDonations = {
  totalSponsored: 0,
  studentsHelped: 0,
  campaigns: [
    { id: 'cmp-1', name: 'Sponsor a uniform', goalSll: 250000, raisedSll: 175000, beneficiaries: 7 },
    { id: 'cmp-2', name: 'Lab equipment fund', goalSll: 5000000, raisedSll: 1850000, beneficiaries: 0 },
  ],
};

export const mockEndOfTermPack = {
  // metadata only — server generates the ZIP
  generatedAt: null,
  size: null,
};

export const mockWeeklyDigest = {
  weekOf: '2026-04-27',
  perChild: {
    'stu-001': {
      attendancePct: 100,
      assignmentsGraded: 3,
      avgScore: 84,
      missedHomework: 0,
      flagged: [],
      highlight: 'Top 10% on the algebra mid-term — keep going.',
    },
    'stu-002': {
      attendancePct: 80,
      assignmentsGraded: 4,
      avgScore: 71,
      missedHomework: 2,
      flagged: ['Class teacher requested a meeting'],
      highlight: 'Improved English essay grade by 12 points.',
    },
  },
  summary: 'A solid week for Aminata; Mohamed needs a check-in about missed homework.',
};

export const mockVoiceDigestText = `Good morning. Here is your family digest for the week of April 27.
Aminata had perfect attendance, three assignments graded, average score 84.
Mohamed had 80 percent attendance, two missed homeworks, and a request from the class teacher to meet.
There are no new modification attempts on either child's records.
Term 2 fees of two hundred and fifty thousand leones are due on May 22.
Have a great week.`;

export const mockObjectionsLog = []; // populated when parent files an objection

export const mockAcknowledgments = {
  // recordType:recordId → ack timestamp
};

export const mockWhereImLogging = {
  // child: ['stu-001'] → boolean: should we log a parent view (default true; false if parent hides it)
};
