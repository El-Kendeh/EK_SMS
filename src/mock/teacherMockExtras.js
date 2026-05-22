// Mock data for new Teacher dashboard features. Deterministic.

export const mockTamperByClass = {
  'cls-10a': { total: 0, blocked: 0, successful: 0 },
  'cls-7b':  { total: 1, blocked: 1, successful: 0, lastAttemptAt: '2026-04-22T14:23:00.000Z' },
};

export const mockTeacherWhereIveBeen = [
  { section: 'Grade entry · Mathematics 10A',  accessedAt: '2026-04-30T08:14:00.000Z', device: 'Mobile App' },
  { section: 'Student profile · A. Kamara',    accessedAt: '2026-04-29T20:02:00.000Z', device: 'Desktop' },
  { section: 'Attendance · 7B',                accessedAt: '2026-04-29T07:33:00.000Z', device: 'Desktop' },
  { section: 'Grade history · Mathematics 10A',accessedAt: '2026-04-28T11:11:00.000Z', device: 'Desktop' },
];

export const mockTeacherChannelPreferences = {
  inApp: { gradePosted: true,  modificationAttempt: true,  message: true,  parentReply: true,  conferenceBooked: true,  systemAlert: true },
  push:  { gradePosted: false, modificationAttempt: true,  message: true,  parentReply: true,  conferenceBooked: true,  systemAlert: false },
  email: { gradePosted: false, modificationAttempt: true,  message: false, parentReply: true,  conferenceBooked: true,  systemAlert: true },
  sms:   { gradePosted: false, modificationAttempt: true,  message: false, parentReply: false, conferenceBooked: true,  systemAlert: false },
};

export const mockTeacherWhistleblowerCategories = [
  { id: 'corruption', label: 'Bribery or corruption' },
  { id: 'misconduct', label: 'Colleague / admin misconduct' },
  { id: 'safety',     label: 'Safety / harassment' },
  { id: 'workload',   label: 'Workload / scheduling unfair practices' },
  { id: 'other',      label: 'Other' },
];

export const mockTeacherOfficeHourSlots = [
  // Slots THIS teacher has published
  { id: 'tho-1', start: '2026-05-04T13:30:00.000Z', durationMin: 20, room: 'Faculty Room A', subject: 'Mathematics', booked: false, claimedBy: null, audience: 'student' },
  { id: 'tho-2', start: '2026-05-04T14:00:00.000Z', durationMin: 20, room: 'Faculty Room A', subject: 'Mathematics', booked: true,  claimedBy: { kind: 'parent', name: 'Fatmata Kamara (re: Aminata)' }, audience: 'parent', topic: 'Mid-term review' },
  { id: 'tho-3', start: '2026-05-05T15:15:00.000Z', durationMin: 30, room: 'Lab 2',          subject: 'Biology',     booked: false, claimedBy: null, audience: 'parent' },
  { id: 'tho-4', start: '2026-05-06T10:00:00.000Z', durationMin: 25, room: 'Lab 1',          subject: 'Physics',     booked: true,  claimedBy: { kind: 'student', name: 'Mohamed Kanu' }, audience: 'student', topic: 'Practical questions' },
];

export const mockTeacherParentThreads = {
  // childId:teacher-thread → {parentName, messages}
  'stu-001': {
    parentName: 'Fatmata Kamara',
    relationship: 'Mother (Primary)',
    childName: 'Aminata Kamara',
    messages: [
      { id: 'tm-1', sender: 'parent',  text: 'Hi Mr. Sesay — could we discuss Aminata’s mid-term?', sentAt: '2026-04-25T18:14:00.000Z' },
    ],
    unread: 1,
  },
  'stu-002': {
    parentName: 'Ibrahim Kamara',
    relationship: 'Father',
    childName: 'Mohamed Kamara',
    messages: [],
    unread: 0,
  },
};

export const mockTeacherStudentThreads = {
  // studentId → {studentName, messages, unread}
  'stu-001': {
    studentName: 'Aminata Kamara',
    classroom: 'Grade 10A',
    messages: [
      { id: 'sm-1', sender: 'teacher', text: 'Excellent work on the algebra paper.', sentAt: '2026-04-26T09:14:00.000Z' },
    ],
    unread: 0,
  },
  'stu-002': {
    studentName: 'Mohamed Kanu',
    classroom: 'Grade 7B',
    messages: [
      { id: 'sm-2', sender: 'student', text: 'Sir, I cannot find the homework sheet.', sentAt: '2026-04-29T17:21:00.000Z' },
    ],
    unread: 1,
  },
};

export const mockBehaviourIncidents = [
  { id: 'bi-1', studentId: 'stu-002', type: 'late', severity: 'low',     title: 'Late to first period',           reportedAt: '2026-04-28T08:05:00.000Z', notes: '15 minutes late, third time this month.', evidenceUrls: [] },
  { id: 'bi-2', studentId: 'stu-001', type: 'commendation', severity: 'positive', title: 'Helped a peer',          reportedAt: '2026-04-26T10:00:00.000Z', notes: 'Stayed back to tutor a classmate.',       evidenceUrls: [] },
];

export const mockSubstituteTokens = [];

export const mockLessonPlans = [
  { id: 'lp-1', classId: 'cls-10a', subjectId: 'sub-01', title: 'Algebra II — week 6', weekOf: '2026-04-27', objectives: ['Recognise quadratic patterns', 'Apply factoring techniques'], homework: 'Page 84, exercises 1-10', resources: [] },
];

export const mockBulkFeedbackTemplates = [
  { id: 'bf-1', label: 'Excellent', text: 'Excellent work. Keep this up.' },
  { id: 'bf-2', label: 'See me', text: 'Please come and see me before the next class.' },
  { id: 'bf-3', label: 'Show working', text: 'Show all working — partial credit is awarded for method.' },
  { id: 'bf-4', label: 'Practice more', text: 'You’re close — more practice on the homework set will help.' },
];

export const mockExamDuties = [
  { id: 'ed-1', exam: 'Mid-term · Mathematics', date: '2026-05-12', start: '08:00', end: '10:00', room: 'Hall A', role: 'invigilator', confirmed: true },
  { id: 'ed-2', exam: 'Mid-term · English',     date: '2026-05-13', start: '08:00', end: '10:00', room: 'Hall A', role: 'invigilator', confirmed: false },
  { id: 'ed-3', exam: 'Mid-term · Biology',     date: '2026-05-14', start: '11:00', end: '13:00', room: 'Lab 2',  role: 'observer',    confirmed: true },
];

export const mockPeerReviews = {
  givenByMe: [
    { id: 'pr-1', toTeacher: 'Mrs. Aisha Bah', subject: 'Biology', anonymous: true, score: 4.5, comment: 'Strong subject knowledge, kind to students.', submittedAt: '2026-04-15' },
  ],
  receivedAboutMe: {
    average: 4.4,
    count: 6,
    breakdown: { 5: 3, 4: 2, 3: 1, 2: 0, 1: 0 },
    recentComments: [
      { anonymous: true, comment: 'Always punctual, lessons are well-structured.' },
      { anonymous: true, comment: 'Could vary teaching methods more, but very fair grader.' },
    ],
  },
};

export const mockPersonalPerformance = {
  classAverages: [
    { term: 'Term 3 2024-25', value: 76 },
    { term: 'Term 1 2025-26', value: 79 },
    { term: 'Term 2 2025-26', value: 82 },
    { term: 'Term 3 2025-26', value: 84 },
  ],
  gradingTimelinessDays: 1.4, // average days from "due" to "submitted"
  parentFeedbackAvg: 4.3,
  parentFeedbackCount: 12,
  attendanceTimelinessPct: 97,
};

export const mockSpotlightStudent = {
  studentId: 'stu-001',
  studentName: 'Aminata Kamara',
  classroom: 'Grade 10A',
  reason: 'Top mid-term score and helped two peers prepare.',
  spotlightedAt: '2026-04-28',
};

export const mockResourceRecommendations = [
  // {id, resourceId, recipient: {kind: 'student'|'parent', id, name}, sentAt}
];

export const mockTeacherWorkload = {
  thisWeek: [
    { day: 'mon', items: [
      { kind: 'class',      label: 'Mathematics — 10A',  start: '08:00', durationMin: 80 },
      { kind: 'grades-due', label: 'Lock CA — Mathematics 10A', dueAt: '2026-04-27T17:00:00.000Z' },
    ]},
    { day: 'tue', items: [
      { kind: 'class',      label: 'Mathematics — 7B',   start: '10:00', durationMin: 60 },
      { kind: 'office-hour',label: 'Office hour',         start: '13:30' },
    ]},
    { day: 'wed', items: [
      { kind: 'class',      label: 'Mathematics — 10A',  start: '08:00', durationMin: 80 },
      { kind: 'assignment-due', label: 'Algebra II homework', dueAt: '2026-04-29T23:59:00.000Z' },
    ]},
    { day: 'thu', items: [
      { kind: 'class',      label: 'Mathematics — 7B',   start: '10:00', durationMin: 60 },
    ]},
    { day: 'fri', items: [
      { kind: 'class',      label: 'Mathematics — 10A',  start: '08:00', durationMin: 80 },
      { kind: 'conference', label: 'Parent-teacher: Fatmata K.', start: '15:00' },
    ]},
  ],
  totalHours: 8,
  pendingGrades: 24,
  pendingAssignments: 3,
  pendingMessages: 1,
};

export const mockGradeReceipts = [
  // generated when teacher submits a batch
];

export const mockClassRoster = {
  // Used by PrintClassRoster — reuses parent-side pickup list, and adds simple class info
};

export const mockCohortCompare = {
  thisYearPerSubject: [
    { subject: 'Mathematics', currentAvg: 82, prevAvg: 76, deltaPct: 8 },
    { subject: 'Biology',     currentAvg: 88, prevAvg: 85, deltaPct: 4 },
  ],
};

export const mockVoiceDigestText = `Good morning. Here is your day at a glance.
You have three classes today and four pending grade submissions.
Two parents are awaiting replies, and you have one office hour booked at 1:30 PM.
There are zero modification attempts on grades you've issued this term.
Have a productive day.`;
