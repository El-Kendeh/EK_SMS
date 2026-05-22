// Mock data for new student-dashboard features. Keep deterministic.

export const mockGradeBreakdowns = {
  // gradeId → { ca:0..20, midTerm:0..30, final:0..50, weights }
  // Default fallback computed from `score` if absent.
};

export const mockGoals = [
  // { subjectId, subjectName, target: 85, achieved: 78, term: 'First Term' }
];

export const mockTamperCount = {
  total: 1,
  blocked: 1,
  successful: 0,
  lastAttemptAt: '2026-04-22T14:23:00.000Z',
};

export const mockWhoSawMyData = [
  { actor: 'Fatmata Kamara', role: 'Parent (Mother)', section: 'Grades', accessedAt: '2026-04-29T18:14:00.000Z', device: 'Mobile App', location: 'Freetown' },
  { actor: 'Fatmata Kamara', role: 'Parent (Mother)', section: 'Report Cards', accessedAt: '2026-04-28T20:02:00.000Z', device: 'Mobile App', location: 'Freetown' },
  { actor: 'Mr. Daniel Sesay',role: 'Math Teacher', section: 'Grade entry: Mathematics', accessedAt: '2026-04-26T09:11:00.000Z', device: 'Desktop', location: 'School LAN' },
  { actor: 'Sarah J. Miller', role: 'Registrar (admin)', section: 'Profile', accessedAt: '2026-04-21T11:45:00.000Z', device: 'Desktop', location: 'School LAN' },
  { actor: 'Ibrahim Kamara', role: 'Parent (Father)', section: 'Attendance', accessedAt: '2026-04-19T07:33:00.000Z', device: 'SMS gateway', location: 'Bo' },
];

export const mockChannelPreferences = {
  inApp:    { gradePosted: true, modificationAttempt: true, feeDue: true, event: true, message: true },
  email:    { gradePosted: true, modificationAttempt: true, feeDue: true, event: false, message: false },
  sms:      { gradePosted: false, modificationAttempt: true, feeDue: true, event: false, message: false },
  push:     { gradePosted: true, modificationAttempt: true, feeDue: false, event: true, message: true },
};

export const mockWhistleblowerCategories = [
  { id: 'corruption',   label: 'Bribery or corruption' },
  { id: 'misconduct',   label: 'Staff misconduct' },
  { id: 'safety',       label: 'Safety / harassment' },
  { id: 'grading',      label: 'Suspicious grading' },
  { id: 'fees',         label: 'Suspicious fee request' },
  { id: 'other',        label: 'Other' },
];

export const mockOfficeHourSlots = [
  { id: 'oh-1', teacher: 'Mr. Daniel Sesay', subject: 'Mathematics', start: '2026-05-04T13:30:00.000Z', durationMin: 20, room: 'Faculty Room A', booked: false },
  { id: 'oh-2', teacher: 'Mr. Daniel Sesay', subject: 'Mathematics', start: '2026-05-04T14:00:00.000Z', durationMin: 20, room: 'Faculty Room A', booked: false },
  { id: 'oh-3', teacher: 'Mrs. Aisha Bah',   subject: 'Biology',     start: '2026-05-05T15:15:00.000Z', durationMin: 30, room: 'Lab 2',         booked: true,  bookedBy: 'self' },
  { id: 'oh-4', teacher: 'Mr. Joshua Kanu',  subject: 'Physics',     start: '2026-05-06T10:00:00.000Z', durationMin: 25, room: 'Lab 1',         booked: false },
];

export const mockCounsellor = {
  counsellorName: 'Ms. Adama Conteh',
  availability: 'Mon–Fri, 10:00–15:00',
  thread: [
    { id: 'wb-1', sender: 'counsellor', text: 'Hi Aminata — this room is private. Whatever you share stays between us unless you ask otherwise.', sentAt: '2026-04-25T10:02:00.000Z' },
  ],
};

export const mockStudyGroups = [
  { id: 'sg-1', name: 'Math Study Crew',    subject: 'Mathematics', members: 6, joined: true,  pending: 0, lastActivity: '2026-04-29T19:22:00.000Z' },
  { id: 'sg-2', name: 'Lab Partners',       subject: 'Biology',     members: 4, joined: false, pending: 0, lastActivity: '2026-04-28T18:01:00.000Z' },
  { id: 'sg-3', name: 'Physics Friday',     subject: 'Physics',     members: 8, joined: false, pending: 0, lastActivity: '2026-04-27T16:45:00.000Z' },
];

export const mockStreaks = {
  attendanceStreak: 14,
  onTimeAssignments: 9,
  noLateThisMonth: true,
  longestStreak: 28,
  bestSubject: 'Biology',
};

export const mockDigitalId = {
  studentNumber: 'STU-2024-0142',
  firstName: 'Aminata',
  lastName: 'Kamara',
  classroom: 'Grade 10A',
  academicYear: '2024-2025',
  validUntil: '2026-12-31',
  smsCode: 'EK0142',
  bloodGroup: 'O+',
  emergencyContact: '+23276001234',
  cardSerial: 'EK-ID-2024-0142',
  issuedAt: '2024-09-03',
  schoolName: 'El-Kendeh Smart School',
  schoolColor: '#1B3FAF',
};

export const mockDocumentVault = {
  uploads: [
    { id: 'doc-1', title: 'Birth certificate.pdf',          type: 'identity',     status: 'verified', uploadedAt: '2024-09-04T09:00:00.000Z', size: 412310 },
    { id: 'doc-2', title: 'Medical leave 2026-03-12.jpg',   type: 'medical',      status: 'verified', uploadedAt: '2026-03-13T08:21:00.000Z', size: 132110 },
    { id: 'doc-3', title: 'Appeal evidence — Math test.pdf',type: 'appeal',       status: 'pending',  uploadedAt: '2026-04-12T14:42:00.000Z', size: 220012 },
  ],
  transcriptRequests: [
    { id: 'tr-1', purpose: 'University application', requestedAt: '2026-03-02T10:00:00.000Z', status: 'completed', issuedAt: '2026-03-04T15:30:00.000Z', verificationHash: 'a31df9c7c1b248b7' },
  ],
};

export const mockStudyPlan = [
  // {id, day:'mon', start:'18:00', durationMin:45, subject, note}
  { id: 'sp-1', day: 'mon', start: '18:00', durationMin: 60, subject: 'Mathematics', note: 'Algebra II practice' },
  { id: 'sp-2', day: 'wed', start: '17:30', durationMin: 45, subject: 'Biology',     note: 'Lab notes review' },
  { id: 'sp-3', day: 'thu', start: '19:00', durationMin: 30, subject: 'English',     note: 'Essay revision' },
  { id: 'sp-4', day: 'sat', start: '10:00', durationMin: 90, subject: 'Physics',     note: 'Past paper drill' },
];

export const mockResourceLastVisit = {
  // resourceId → ISO timestamp of last view
  'res-101': '2026-04-20T11:00:00.000Z',
  'res-102': '2026-04-22T08:30:00.000Z',
};

export const mockTermVoiceSummary = `Hello Aminata. Here is your day at a glance.
You have 5 classes today. Mathematics starts at 8 AM in Room 12.
Two assignments are due this week — Biology lab notes on Wednesday and English essay on Friday.
Your term average is 84.2 percent. You are ranked 4th in your class.
There are no new modification attempts on your records.
Have a great day.`;

export const mockObjectionsLog = [
  // {id, gradeId, submittedAt, status, message}
];
