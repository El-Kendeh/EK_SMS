export const mockStudent = {
  id: 'stu-001',
  studentNumber: 'STU-2024-0142',
  firstName: 'Aminata',
  lastName: 'Kamara',
  fullName: 'Aminata Kamara',
  initials: 'AK',
  dateOfBirth: 'March 14, 2008',
  gender: 'Female',
  enrollmentDate: '2022-09-03',
  status: 'active',
  currentClass: { id: 'cls-10a', name: 'Grade 10A', gradeLevel: '10' },
  academicYear: '2024-2025',
  guardians: [
    { firstName: 'Fatmata', lastName: 'Kamara', relationship: 'Mother', phone: '+23276001234' },
    { firstName: 'Ibrahim', lastName: 'Kamara', relationship: 'Father', phone: '+23278005678' },
  ],
  guardian: { name: 'Fatmata Kamara', relationship: 'Mother (Primary Guardian)', phone: '+23276001234' },
  program: 'General Science',
  gpa: 3.75,
  attendance: 92,
  address: '14 Wilkinson Road, Freetown, Sierra Leone',
  bloodGroup: 'O+',
  classroom: 'Grade 10A',
};

export const mockCurrentTerm = {
  id: 'term-1-2025',
  name: 'First Term',
  academicYear: '2025-2026',
  startDate: '2026-01-12',
  endDate: '2026-05-08',
  isCurrent: true,
  weekNumber: 9,
  totalWeeks: 16,
};

export const mockTerms = [
  mockCurrentTerm,
  {
    id: 'term-2-2024',
    name: 'Second Term',
    academicYear: '2024-2025',
    startDate: '2025-01-13',
    endDate: '2025-04-11',
    isCurrent: false,
  },
  {
    id: 'term-3-2023',
    name: 'Third Term',
    academicYear: '2023-2024',
    startDate: '2024-05-06',
    endDate: '2024-07-26',
    isCurrent: false,
  },
];

export const mockGrades = [
  {
    id: 'grade-001',
    subject: { id: 'sub-01', name: 'Mathematics', code: 'MTH' },
    teacher: { fullName: 'Mr. Johnson Bangura' },
    score: 82,
    gradeLetter: 'A',
    remarks: 'Excellent work throughout the term',
    status: 'locked',
    lastUpdated: '2024-10-14T14:15:00Z',
    hasModificationAttempt: false,
    weightBreakdown: {
      finalExam:    { score: 85, weight: 60 },
      midterm:      { score: 78, weight: 20 },
      ca:           { score: 80, weight: 20 },
    },
    hasPeerReview: true,
    hasFeedbackThread: false,
  },
  {
    id: 'grade-002',
    subject: { id: 'sub-02', name: 'English Language', code: 'ENG' },
    teacher: { fullName: 'Mrs. Isata Davies' },
    score: 74,
    gradeLetter: 'B',
    remarks: 'Good effort, keep reading',
    status: 'locked',
    lastUpdated: '2024-10-14T10:00:00Z',
    hasModificationAttempt: false,
    weightBreakdown: {
      finalExam:    { score: 76, weight: 60 },
      midterm:      { score: 70, weight: 20 },
      ca:           { score: 72, weight: 20 },
    },
    hasPeerReview: false,
    hasFeedbackThread: false,
  },
  {
    id: 'grade-003',
    subject: { id: 'sub-03', name: 'Biology', code: 'BIO' },
    teacher: { fullName: 'Mr. Abu Kamara' },
    score: 91,
    gradeLetter: 'A+',
    remarks: 'Outstanding performance',
    status: 'locked',
    lastUpdated: '2024-10-13T09:30:00Z',
    hasModificationAttempt: false,
    weightBreakdown: {
      finalExam:    { score: 94, weight: 60 },
      midterm:      { score: 88, weight: 20 },
      ca:           { score: 86, weight: 20 },
    },
    hasPeerReview: true,
    hasFeedbackThread: false,
  },
  {
    id: 'grade-004',
    subject: { id: 'sub-04', name: 'Chemistry', code: 'CHM' },
    teacher: { fullName: 'Mrs. Mariama Koroma' },
    score: 69,
    gradeLetter: 'C',
    remarks: 'Needs improvement in practical work',
    status: 'locked',
    lastUpdated: '2024-10-14T11:00:00Z',
    hasModificationAttempt: true,
    modificationAttempt: {
      attemptedAt: '2024-10-15T15:42:00Z',
      wasBlocked: true,
      ipAddress: '192.168.1.142',
      location: 'Freetown, Sierra Leone',
      deviceType: 'Chrome on Desktop',
    },
    weightBreakdown: {
      finalExam:    { score: 72, weight: 60 },
      midterm:      { score: 63, weight: 20 },
      ca:           { score: 65, weight: 20 },
    },
    hasPeerReview: false,
    hasFeedbackThread: true,
  },
  {
    id: 'grade-005',
    subject: { id: 'sub-05', name: 'History', code: 'HIS' },
    teacher: { fullName: 'Mr. Alhaji Sesay' },
    score: 77,
    gradeLetter: 'B',
    remarks: 'Good analytical skills shown',
    status: 'draft',
    lastUpdated: '2024-10-12T08:00:00Z',
    hasModificationAttempt: false,
    weightBreakdown: null,
    hasPeerReview: false,
    hasFeedbackThread: true,
  },
  {
    id: 'grade-006',
    subject: { id: 'sub-06', name: 'Mathematics Elective', code: 'MTE' },
    teacher: { fullName: 'Mr. Johnson Bangura' },
    score: 58,
    gradeLetter: 'D',
    remarks: 'See teacher for extra support',
    status: 'locked',
    lastUpdated: '2024-10-14T14:00:00Z',
    hasModificationAttempt: false,
    weightBreakdown: {
      finalExam:    { score: 55, weight: 60 },
      midterm:      { score: 62, weight: 20 },
      ca:           { score: 66, weight: 20 },
    },
    hasPeerReview: false,
    hasFeedbackThread: true,
    hasRemedialPlan: true,
  },
];

export const mockGradesSummary = {
  overallAverage: 75.2,
  classRank: 5,
  totalStudentsInClass: 32,
  subjectsPassed: 5,
  totalSubjects: 6,
  subjectsLocked: 5,
};

export const mockGradeHistory = {
  'grade-001': [
    { id: 'evt-001', eventType: 'DRAFT', score: 82, gradeLetter: 'A', recordedBy: 'Mr. Johnson Bangura', recordedByRole: 'Teacher', recordedAt: '2024-10-10T10:32:00Z', isSecurityEvent: false, notes: 'Initial assessment structure and rubric parameters finalized.' },
    { id: 'evt-002', eventType: 'SUBMIT', score: 82, gradeLetter: 'A', recordedBy: 'Mr. Johnson Bangura', recordedByRole: 'Teacher', recordedAt: '2024-10-14T14:15:00Z', isSecurityEvent: false, notes: 'Raw score submitted. Preliminary calculations verified against weightings.' },
    { id: 'evt-003', eventType: 'LOCK', score: 82, gradeLetter: 'A', recordedBy: 'System', recordedByRole: 'System', recordedAt: '2024-10-14T14:16:00Z', isSecurityEvent: false, notes: 'Cryptographic seal applied. Record immutable. Ledger synchronized.' },
  ],
  'grade-004': [
    { id: 'evt-010', eventType: 'DRAFT', score: 69, gradeLetter: 'C', recordedBy: 'Mrs. Mariama Koroma', recordedByRole: 'Teacher', recordedAt: '2024-10-11T09:00:00Z', isSecurityEvent: false },
    { id: 'evt-011', eventType: 'SUBMIT', score: 69, gradeLetter: 'C', recordedBy: 'Mrs. Mariama Koroma', recordedByRole: 'Teacher', recordedAt: '2024-10-14T11:00:00Z', isSecurityEvent: false },
    { id: 'evt-012', eventType: 'LOCK', score: 69, gradeLetter: 'C', recordedBy: 'System', recordedByRole: 'System', recordedAt: '2024-10-14T11:01:00Z', isSecurityEvent: false },
    { id: 'evt-013', eventType: 'MODIFICATION_ATTEMPT', recordedBy: 'Unknown', recordedByRole: 'Unknown', recordedAt: '2024-10-15T15:42:00Z', isSecurityEvent: true, reason: 'Unauthorized modification attempt — blocked by Grade Integrity Protocol' },
  ],
  'grade-002': [
    { id: 'evt-020', eventType: 'DRAFT', score: 74, gradeLetter: 'B', recordedBy: 'Mrs. Isata Davies', recordedByRole: 'Teacher', recordedAt: '2024-10-09T11:00:00Z', isSecurityEvent: false },
    { id: 'evt-021', eventType: 'SUBMIT', score: 74, gradeLetter: 'B', recordedBy: 'Mrs. Isata Davies', recordedByRole: 'Teacher', recordedAt: '2024-10-14T10:00:00Z', isSecurityEvent: false },
    { id: 'evt-022', eventType: 'LOCK', score: 74, gradeLetter: 'B', recordedBy: 'System', recordedByRole: 'System', recordedAt: '2024-10-14T10:01:00Z', isSecurityEvent: false },
  ],
  'grade-003': [
    { id: 'evt-030', eventType: 'DRAFT', score: 91, gradeLetter: 'A+', recordedBy: 'Mr. Abu Kamara', recordedByRole: 'Teacher', recordedAt: '2024-10-08T09:00:00Z', isSecurityEvent: false },
    { id: 'evt-031', eventType: 'SUBMIT', score: 91, gradeLetter: 'A+', recordedBy: 'Mr. Abu Kamara', recordedByRole: 'Teacher', recordedAt: '2024-10-13T09:30:00Z', isSecurityEvent: false },
    { id: 'evt-032', eventType: 'LOCK', score: 91, gradeLetter: 'A+', recordedBy: 'System', recordedByRole: 'System', recordedAt: '2024-10-13T09:31:00Z', isSecurityEvent: false },
  ],
  'grade-005': [
    { id: 'evt-040', eventType: 'DRAFT', score: 77, gradeLetter: 'B', recordedBy: 'Mr. Alhaji Sesay', recordedByRole: 'Teacher', recordedAt: '2024-10-12T08:00:00Z', isSecurityEvent: false },
  ],
  'grade-006': [
    { id: 'evt-050', eventType: 'DRAFT', score: 58, gradeLetter: 'D', recordedBy: 'Mr. Johnson Bangura', recordedByRole: 'Teacher', recordedAt: '2024-10-10T13:00:00Z', isSecurityEvent: false },
    { id: 'evt-051', eventType: 'SUBMIT', score: 58, gradeLetter: 'D', recordedBy: 'Mr. Johnson Bangura', recordedByRole: 'Teacher', recordedAt: '2024-10-14T14:00:00Z', isSecurityEvent: false },
    { id: 'evt-052', eventType: 'LOCK', score: 58, gradeLetter: 'D', recordedBy: 'System', recordedByRole: 'System', recordedAt: '2024-10-14T14:01:00Z', isSecurityEvent: false },
  ],
};

export const mockPeerReviews = {
  'grade-001': {
    gradeId: 'grade-001',
    subjectName: 'Mathematics',
    score: 82,
    status: 'verified',
    reviewer: { name: 'Dr. Sarah Miller', role: 'Head of Science · External Verifier' },
    auditId: 'EK-SMS-MTH-2024-001',
    hash: 'SHA256: 8a4f2b9c7d1e3f5a8b0c9d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7',
    timeline: [
      { date: '2024-10-12T09:15:00Z', title: 'Initial Grade Submission', desc: 'Mr. Johnson Bangura submitted the term final grade for Mathematics.', status: 'done' },
      { date: '2024-10-12T11:30:00Z', title: 'Peer Review Requested', desc: 'System triggered mandatory secondary verification protocol.', status: 'done' },
      { date: '2024-10-13T14:45:00Z', title: 'Secondary Audit Completed', desc: 'Dr. Sarah Miller verified grade inputs against assessment rubric.', status: 'done' },
      { date: '2024-10-13T15:00:00Z', title: 'Final Cross-Check Verified', desc: 'Audit records sealed. Digital signature applied to student record.', status: 'done' },
    ],
  },
  'grade-003': {
    gradeId: 'grade-003',
    subjectName: 'Biology',
    score: 91,
    status: 'verified',
    reviewer: { name: 'Dr. Amara Turay', role: 'Head of Biology · Internal Verifier' },
    auditId: 'EK-SMS-BIO-2024-001',
    hash: 'SHA256: 3c9d1f4e7a2b5c8d0e6f1a3b4c7d8e9f2a0b1c3d4e5f6a7b8c9d0e1f2a3b4c5',
    timeline: [
      { date: '2024-10-09T10:00:00Z', title: 'Initial Grade Submission', desc: 'Mr. Abu Kamara submitted the term final grade for Biology.', status: 'done' },
      { date: '2024-10-10T14:00:00Z', title: 'Secondary Audit Completed', desc: 'Dr. Amara Turay verified grade inputs against assessment rubric.', status: 'done' },
      { date: '2024-10-13T09:30:00Z', title: 'Final Cross-Check Verified', desc: 'Audit records sealed. Digital signature applied.', status: 'done' },
    ],
  },
};

export const mockFeedbackThreads = {
  'grade-004': {
    gradeId: 'grade-004',
    subjectName: 'Chemistry',
    teacher: { name: 'Mrs. Mariama Koroma', role: 'Chemistry Teacher', initials: 'MK' },
    status: 'reviewing',
    messages: [
      { id: 'msg-001', sender: 'student', text: 'Mrs. Koroma, I wanted to ask about my practical score. I thought the titration experiment went well — could you clarify what points were deducted?', sentAt: '2024-10-15T09:14:00Z', isRead: true },
      { id: 'msg-002', sender: 'teacher', text: 'Hi Aminata, the titration was good but there were some recording inconsistencies in your data table and the conclusion lacked a comparison with the expected result. I\'ll attach the marking rubric.', sentAt: '2024-10-15T10:45:00Z', isRead: true, attachment: { name: 'Lab_Marking_Rubric_CHM.pdf', type: 'pdf' } },
      { id: 'msg-003', sender: 'student', text: 'Thank you for the clarification. I\'ll make sure to be more thorough with my data recording next time.', sentAt: '2024-10-15T10:50:00Z', isRead: true },
    ],
  },
  'grade-005': {
    gradeId: 'grade-005',
    subjectName: 'History',
    teacher: { name: 'Mr. Alhaji Sesay', role: 'History Teacher', initials: 'AS' },
    status: 'open',
    messages: [
      { id: 'msg-010', sender: 'teacher', text: 'Aminata, your essay on the French Revolution showed great analytical depth. The grade is still in draft — I\'ll finalize it by end of week.', sentAt: '2024-10-12T08:30:00Z', isRead: true },
    ],
  },
  'grade-006': {
    gradeId: 'grade-006',
    subjectName: 'Mathematics Elective',
    teacher: { name: 'Mr. Johnson Bangura', role: 'Mathematics Teacher', initials: 'JB' },
    status: 'open',
    messages: [
      { id: 'msg-020', sender: 'teacher', text: 'Aminata, you have great potential in problem-solving. This remedial plan is designed to bridge the gap in your foundational calculus. I know you can turn this around — let\'s focus on one module at a time.', sentAt: '2024-10-14T15:00:00Z', isRead: true },
    ],
  },
};

export const mockRemedialPlan = {
  'grade-006': {
    gradeId: 'grade-006',
    subjectName: 'Mathematics Elective',
    score: 58,
    gradeLetter: 'D',
    teacherNote: 'You\'ve shown great potential in problem-solving during class discussions. This remedial plan is designed to bridge the gap in your foundational algebra. I know you can turn this around — let\'s focus on one module at a time.',
    teacher: { name: 'Mr. Johnson Bangura', role: 'Mathematics Teacher' },
    progressModules: [
      { name: 'Algebra', percent: 100 },
      { name: 'Geometry', percent: 25 },
      { name: 'Calculus', percent: 0 },
    ],
    sessions: [
      { month: 'Nov', day: 5,  title: 'Tuesday Tutoring with Mr. Johnson', time: '3:30 PM', location: 'Room 402-B', confirmed: false },
      { month: 'Nov', day: 7,  title: 'Peer Study Group: Vectors',          time: '4:00 PM', location: 'Library Hub',  confirmed: false },
      { month: 'Nov', day: 12, title: 'One-on-One Review Session',          time: '2:00 PM', location: 'Room 402-B',  confirmed: true  },
    ],
    resources: [
      { name: 'Statistics & Probability Workbook', type: 'pdf',   locked: false },
      { name: 'Practice Quiz 1: Foundations',      type: 'quiz',  locked: false },
      { name: 'Advanced Derivations Video',         type: 'video', locked: true  },
    ],
  },
};

export const mockReportCards = [
  {
    id: 'rc-001',
    termId: 'term-1-2024',
    termName: 'First Term',
    academicYear: '2024-2025',
    generatedAt: '2024-10-20T10:00:00Z',
    generatedBy: 'Mrs. Tenneh Cole',
    average: 75.2,
    classRank: 5,
    totalStudentsInClass: 32,
    subjectsPassed: 5,
    totalSubjects: 6,
    verificationHash: 'a3f9c2d84e1b7c6f23a91d5e8b042c7f92e1f3a84b5c7d2e19f63a07b4c8d5e6',
    verificationUrl: 'https://eksms.edu.sl/verify/a3f9c2d84e1b7c6f23a91d5e8b042c7f',
    status: 'generated',
    isValid: true,
    subjects: [
      { name: 'Mathematics',         score: 82, gradeLetter: 'A'  },
      { name: 'English Language',    score: 74, gradeLetter: 'B'  },
      { name: 'Biology',             score: 91, gradeLetter: 'A+' },
      { name: 'Chemistry',           score: 69, gradeLetter: 'C'  },
      { name: 'History',             score: 77, gradeLetter: 'B'  },
      { name: 'Mathematics Elective',score: 58, gradeLetter: 'D'  },
    ],
    principal: { name: 'Dr. Elias Kendeh',  title: 'Principal'   },
    registrar: { name: 'Mrs. Tenneh Cole',  title: 'Registrar'   },
    serialNumber: 'EK-2024-CERT-10142-SL',
  },
  {
    id: 'rc-002',
    termId: 'term-3-2023',
    termName: 'Third Term',
    academicYear: '2023-2024',
    generatedAt: '2024-08-15T10:00:00Z',
    generatedBy: 'Mrs. Tenneh Cole',
    average: 71.2,
    classRank: 9,
    totalStudentsInClass: 30,
    subjectsPassed: 4,
    totalSubjects: 5,
    verificationHash: 'b7d3e1f92a4c8e05d6b17a3f94c28e01f5a2b9c7d3e6f1a4b8c0d7e5f9a1b2c3',
    verificationUrl: 'https://eksms.edu.sl/verify/b7d3e1f92a4c8e05d6b17a3f94c28e01',
    status: 'archived',
    isValid: true,
    subjects: [
      { name: 'Mathematics',      score: 79, gradeLetter: 'B'  },
      { name: 'English Language', score: 68, gradeLetter: 'C'  },
      { name: 'Biology',          score: 84, gradeLetter: 'A'  },
      { name: 'Chemistry',        score: 60, gradeLetter: 'D'  },
      { name: 'History',          score: 65, gradeLetter: 'C'  },
    ],
    principal: { name: 'Dr. Elias Kendeh', title: 'Principal' },
    registrar: { name: 'Mrs. Tenneh Cole', title: 'Registrar' },
    serialNumber: 'EK-2023-CERT-10142-SL',
  },
];

export const mockNotifications = [
  {
    id: 'notif-001',
    type: 'MODIFICATION_ATTEMPT',
    title: 'Grade Modification Attempt — Chemistry',
    message: 'An attempt was made to modify your Chemistry grade (69% · C). The attempt was BLOCKED by the system. Your original grade is preserved.',
    isRead: false,
    isSecurityAlert: true,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    relatedEntityType: 'grade',
    relatedEntityId: 'grade-004',
  },
  {
    id: 'notif-002',
    type: 'GRADE_LOCKED',
    title: 'Mathematics Grade Permanently Locked',
    message: 'Mr. Johnson Bangura has confirmed your Mathematics grade: 82% (A) for First Term 2024–2025.',
    isRead: false,
    createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    relatedEntityType: 'grade',
    relatedEntityId: 'grade-001',
  },
  {
    id: 'notif-003',
    type: 'GRADE_POSTED',
    title: 'Biology Grade Posted',
    message: 'Mr. Abu Kamara posted your Biology score: 91% (A+). Grade is pending final lock.',
    isRead: true,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    relatedEntityType: 'grade',
    relatedEntityId: 'grade-003',
  },
  {
    id: 'notif-004',
    type: 'GRADE_PENDING',
    title: 'History Grade Awaiting Confirmation',
    message: 'Your History grade has been entered as draft. It will be locked by your teacher shortly.',
    isRead: true,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    relatedEntityType: 'grade',
    relatedEntityId: 'grade-005',
  },
  {
    id: 'notif-005',
    type: 'REPORT_AVAILABLE',
    title: 'Report Card Available — First Term',
    message: 'Your First Term 2024–2025 report card has been generated and is available for download.',
    isRead: true,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    relatedEntityType: 'report_card',
    relatedEntityId: 'rc-001',
  },
  {
    id: 'notif-006',
    type: 'SYSTEM',
    title: 'Welcome to EK-SMS',
    message: 'Your student account has been set up. You can now view your grades and download report cards.',
    isRead: true,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    relatedEntityType: null,
    relatedEntityId: null,
  },
];

export const mockSecurityHealth = {
  score: 85,
  scoreLabel: 'Strong',
  twoFAEnabled: true,
  twoFAEnabledSince: '2023-08-12',
  lastPasswordChange: '2024-09-01',
  trustedDevices: [
    { id: 'dev-001', name: 'Infinix Note 30', type: 'smartphone', location: 'Freetown, Sierra Leone', lastActive: new Date().toISOString(), isCurrent: true },
    { id: 'dev-002', name: 'Chrome on Windows', type: 'laptop',     location: 'Freetown, Sierra Leone', lastActive: new Date(Date.now() - 2 * 3600000).toISOString(), isCurrent: false },
  ],
  loginHistory: [
    { location: 'Freetown, Sierra Leone', ip: '41.215.161.45', device: 'Safari Mobile', time: new Date(Date.now() - 30 * 60000).toISOString(), status: 'success' },
    { location: 'Freetown, Sierra Leone', ip: '41.215.161.45', device: 'Chrome on Windows', time: new Date(Date.now() - 2 * 86400000).toISOString(), status: 'success' },
    { location: 'Freetown, Sierra Leone', ip: '41.215.161.90', device: 'Android Device', time: new Date(Date.now() - 5 * 86400000).toISOString(), status: 'success' },
  ],
};

export const mockParentalAccessLog = [
  { id: 'pal-001', guardianName: 'Fatmata Kamara', relationship: 'Mother', section: 'Report Cards', time: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'pal-002', guardianName: 'Fatmata Kamara', relationship: 'Mother', section: 'Grades',       time: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: 'pal-003', guardianName: 'Ibrahim Kamara', relationship: 'Father', section: 'Attendance Log', time: new Date(Date.now() - 6 * 86400000).toISOString() },
  { id: 'pal-004', guardianName: 'Fatmata Kamara', relationship: 'Mother', section: 'Notifications', time: new Date(Date.now() - 10 * 86400000).toISOString() },
];

// ─────────────────────────────────────────────────────────────────────────────
// TIMETABLE
// ─────────────────────────────────────────────────────────────────────────────
export const mockTimetable = {
  Monday: [
    { id: 'tt-m-1', time: '08:00', endTime: '09:00', subject: 'Mathematics',      teacher: 'Mr. Johnson',  room: 'Room 3',       color: '#3B82F6', icon: 'calculate',   link: 'https://meet.google.com/abc-defg-hij' },
    { id: 'tt-m-2', time: '09:00', endTime: '10:00', subject: 'English Language',  teacher: 'Mrs. Williams', room: 'Room 1',       color: '#8B5CF6', icon: 'menu_book',   link: null },
    { id: 'tt-m-3', time: '10:00', endTime: '11:00', subject: 'Biology',           teacher: 'Mrs. Conteh',  room: 'Lab B',        color: '#10B981', icon: 'biotech',     link: null },
    { id: 'tt-m-b1', isBreak: true, time: '11:00', endTime: '11:20', subject: 'Short Break' },
    { id: 'tt-m-4', time: '11:20', endTime: '12:20', subject: 'Chemistry',         teacher: 'Mr. Sesay',    room: 'Lab A',        color: '#EF4444', icon: 'science',     link: 'https://zoom.us/j/123456789' },
    { id: 'tt-m-l1', isBreak: true, time: '12:20', endTime: '13:20', subject: 'Lunch Break' },
    { id: 'tt-m-5', time: '13:20', endTime: '14:20', subject: 'Physical Education', teacher: 'Mr. Bangura', room: 'Sports Field', color: '#F59E0B', icon: 'sports_soccer', link: null },
    { id: 'tt-m-6', time: '14:20', endTime: '15:00', subject: 'History',            teacher: 'Mrs. Taylor', room: 'Room 5',       color: '#6366F1', icon: 'history_edu', link: null },
  ],
  Tuesday: [
    { id: 'tt-t-1', time: '08:00', endTime: '09:00', subject: 'English Literature', teacher: 'Mrs. Williams', room: 'Room 1', color: '#8B5CF6', icon: 'menu_book',   link: null },
    { id: 'tt-t-2', time: '09:00', endTime: '10:00', subject: 'Mathematics',        teacher: 'Mr. Johnson',   room: 'Room 3', color: '#3B82F6', icon: 'calculate',   link: 'https://meet.google.com/abc-defg-hij' },
    { id: 'tt-t-3', time: '10:00', endTime: '11:00', subject: 'Physics',            teacher: 'Mr. Kamara',    room: 'Lab C',  color: '#06B6D4', icon: 'bolt',        link: null },
    { id: 'tt-t-b1', isBreak: true, time: '11:00', endTime: '11:20', subject: 'Short Break' },
    { id: 'tt-t-4', time: '11:20', endTime: '12:20', subject: 'Biology',            teacher: 'Mrs. Conteh',   room: 'Lab B',  color: '#10B981', icon: 'biotech',     link: null },
    { id: 'tt-t-l1', isBreak: true, time: '12:20', endTime: '13:20', subject: 'Lunch Break' },
    { id: 'tt-t-5', time: '13:20', endTime: '14:20', subject: 'History',            teacher: 'Mrs. Taylor',   room: 'Room 5', color: '#6366F1', icon: 'history_edu', link: null },
    { id: 'tt-t-6', time: '14:20', endTime: '15:00', subject: 'Mathematics',        teacher: 'Mr. Johnson',   room: 'Room 3', color: '#3B82F6', icon: 'calculate',   link: null },
  ],
  Wednesday: [
    { id: 'tt-w-1', time: '08:00', endTime: '09:00', subject: 'Chemistry',         teacher: 'Mr. Sesay',    room: 'Lab A',  color: '#EF4444', icon: 'science',     link: 'https://zoom.us/j/123456789' },
    { id: 'tt-w-2', time: '09:00', endTime: '10:00', subject: 'History',           teacher: 'Mrs. Taylor',  room: 'Room 5', color: '#6366F1', icon: 'history_edu', link: null },
    { id: 'tt-w-3', time: '10:00', endTime: '11:00', subject: 'Mathematics',       teacher: 'Mr. Johnson',  room: 'Room 3', color: '#3B82F6', icon: 'calculate',   link: 'https://meet.google.com/abc-defg-hij' },
    { id: 'tt-w-b1', isBreak: true, time: '11:00', endTime: '11:20', subject: 'Short Break' },
    { id: 'tt-w-4', time: '11:20', endTime: '12:20', subject: 'English Language',  teacher: 'Mrs. Williams', room: 'Room 1', color: '#8B5CF6', icon: 'menu_book',   link: null },
    { id: 'tt-w-l1', isBreak: true, time: '12:20', endTime: '13:20', subject: 'Lunch Break' },
    { id: 'tt-w-5', time: '13:20', endTime: '14:20', subject: 'Physics',           teacher: 'Mr. Kamara',   room: 'Lab C',  color: '#06B6D4', icon: 'bolt',        link: null },
  ],
  Thursday: [
    { id: 'tt-th-1', time: '08:00', endTime: '09:00', subject: 'Biology',           teacher: 'Mrs. Conteh',  room: 'Lab B',  color: '#10B981', icon: 'biotech',     link: null },
    { id: 'tt-th-2', time: '09:00', endTime: '10:00', subject: 'Chemistry',         teacher: 'Mr. Sesay',    room: 'Lab A',  color: '#EF4444', icon: 'science',     link: null },
    { id: 'tt-th-3', time: '10:00', endTime: '11:00', subject: 'English Literature', teacher: 'Mrs. Williams', room: 'Room 1', color: '#8B5CF6', icon: 'menu_book',  link: null },
    { id: 'tt-th-b1', isBreak: true, time: '11:00', endTime: '11:20', subject: 'Short Break' },
    { id: 'tt-th-4', time: '11:20', endTime: '12:20', subject: 'Mathematics',       teacher: 'Mr. Johnson',  room: 'Room 3', color: '#3B82F6', icon: 'calculate',   link: 'https://meet.google.com/abc-defg-hij' },
    { id: 'tt-th-l1', isBreak: true, time: '12:20', endTime: '13:20', subject: 'Lunch Break' },
    { id: 'tt-th-5', time: '13:20', endTime: '14:20', subject: 'Physical Education', teacher: 'Mr. Bangura', room: 'Sports Field', color: '#F59E0B', icon: 'sports_soccer', link: null },
    { id: 'tt-th-6', time: '14:20', endTime: '15:00', subject: 'History',           teacher: 'Mrs. Taylor',  room: 'Room 5', color: '#6366F1', icon: 'history_edu', link: null },
  ],
  Friday: [
    { id: 'tt-f-1', time: '08:00', endTime: '09:00', subject: 'Mathematics',       teacher: 'Mr. Johnson',  room: 'Room 3', color: '#3B82F6', icon: 'calculate',   link: 'https://meet.google.com/abc-defg-hij' },
    { id: 'tt-f-2', time: '09:00', endTime: '10:00', subject: 'Biology',           teacher: 'Mrs. Conteh',  room: 'Lab B',  color: '#10B981', icon: 'biotech',     link: null },
    { id: 'tt-f-3', time: '10:00', endTime: '11:00', subject: 'Physics',           teacher: 'Mr. Kamara',   room: 'Lab C',  color: '#06B6D4', icon: 'bolt',        link: null },
    { id: 'tt-f-b1', isBreak: true, time: '11:00', endTime: '11:20', subject: 'Short Break' },
    { id: 'tt-f-4', time: '11:20', endTime: '12:20', subject: 'English Language',  teacher: 'Mrs. Williams', room: 'Room 1', color: '#8B5CF6', icon: 'menu_book',   link: null },
    { id: 'tt-f-l1', isBreak: true, time: '12:20', endTime: '13:20', subject: 'Lunch Break' },
    { id: 'tt-f-5', time: '13:20', endTime: '14:20', subject: 'Chemistry',         teacher: 'Mr. Sesay',    room: 'Lab A',  color: '#EF4444', icon: 'science',     link: null },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENTS
// ─────────────────────────────────────────────────────────────────────────────
export const mockAssignments = [
  {
    id: 'asgn-001',
    title: 'Algebra Problem Set',
    subject: 'Mathematics',
    subjectColor: '#3B82F6',
    subjectIcon: 'calculate',
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    status: 'pending',
    description: 'Complete exercises 4.1–4.6 from the textbook. Show all working. Focus on quadratic equations and factoring.',
    teacher: 'Mr. Johnson',
    maxScore: 20,
  },
  {
    id: 'asgn-002',
    title: 'Cell Division Essay',
    subject: 'Biology',
    subjectColor: '#10B981',
    subjectIcon: 'biotech',
    dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    status: 'pending',
    description: 'Write a 500-word essay explaining the stages of mitosis and meiosis. Include labeled diagrams.',
    teacher: 'Mrs. Conteh',
    maxScore: 25,
  },
  {
    id: 'asgn-003',
    title: 'The Great Gatsby — Chapter Analysis',
    subject: 'English Literature',
    subjectColor: '#8B5CF6',
    subjectIcon: 'menu_book',
    dueDate: new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10),
    status: 'submitted',
    description: 'Analyse the symbolism in Chapters 1–3. Reference specific quotes to support your points.',
    teacher: 'Mrs. Williams',
    maxScore: 30,
    submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'asgn-004',
    title: 'Titration Lab Report',
    subject: 'Chemistry',
    subjectColor: '#EF4444',
    subjectIcon: 'science',
    dueDate: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
    status: 'graded',
    description: 'Write a full lab report for the acid-base titration experiment. Include methodology and error analysis.',
    teacher: 'Mr. Sesay',
    maxScore: 40,
    score: 36,
    feedback: 'Excellent work! Your methodology was thorough. Strengthen your error analysis section next time.',
  },
  {
    id: 'asgn-005',
    title: 'World War II Timeline',
    subject: 'History',
    subjectColor: '#6366F1',
    subjectIcon: 'history_edu',
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    status: 'pending',
    description: 'Create a detailed timeline of key events from 1939–1945. Include causes and consequences for each event.',
    teacher: 'Mrs. Taylor',
    maxScore: 20,
  },
  {
    id: 'asgn-006',
    title: 'Forces and Motion Quiz',
    subject: 'Physics',
    subjectColor: '#06B6D4',
    subjectIcon: 'bolt',
    dueDate: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
    status: 'pending',
    description: "Online quiz covering Newton's Laws of Motion. 15 questions, 30 minutes time limit.",
    teacher: 'Mr. Kamara',
    maxScore: 15,
  },
  {
    id: 'asgn-007',
    title: 'Persuasive Essay Draft',
    subject: 'English Language',
    subjectColor: '#8B5CF6',
    subjectIcon: 'menu_book',
    dueDate: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
    status: 'graded',
    description: 'Write a 400-word persuasive essay: "Technology has more benefits than drawbacks."',
    teacher: 'Mrs. Williams',
    maxScore: 20,
    score: 17,
    feedback: 'Good structure and strong arguments. Improve your counter-argument paragraph with more evidence.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGES
// ─────────────────────────────────────────────────────────────────────────────
export const mockMessages = [
  {
    id: 'conv-001',
    teacher: { name: 'Mr. Johnson', subject: 'Mathematics', initials: 'MJ', color: '#3B82F6' },
    unread: 2,
    messages: [
      { id: 'msg-001-1', sender: 'teacher', text: 'Hi Aminata, great work on last week\'s test! You scored 87%.', sentAt: new Date(Date.now() - 3 * 86400000).toISOString() },
      { id: 'msg-001-2', sender: 'student', text: 'Thank you Mr. Johnson! I studied really hard for it.', sentAt: new Date(Date.now() - 3 * 86400000 + 900000).toISOString() },
      { id: 'msg-001-3', sender: 'teacher', text: 'I noticed you had some trouble with the quadratic section. Would you like some extra practice problems?', sentAt: new Date(Date.now() - 3 * 86400000 + 1200000).toISOString() },
      { id: 'msg-001-4', sender: 'student', text: 'Yes please! That would be very helpful.', sentAt: new Date(Date.now() - 3 * 86400000 + 1500000).toISOString() },
      { id: 'msg-001-5', sender: 'teacher', text: 'I\'ve sent a practice sheet to your student email. Remember the formula for the discriminant: b²-4ac.', sentAt: new Date(Date.now() - 2 * 86400000).toISOString() },
      { id: 'msg-001-6', sender: 'teacher', text: 'Also, don\'t forget your Problem Set is due Monday!', sentAt: new Date(Date.now() - 86400000).toISOString() },
    ],
  },
  {
    id: 'conv-002',
    teacher: { name: 'Mrs. Conteh', subject: 'Biology', initials: 'MC', color: '#10B981' },
    unread: 0,
    messages: [
      { id: 'msg-002-1', sender: 'teacher', text: 'Hi Aminata, please remember to bring your lab coat for Wednesday\'s practicals.', sentAt: new Date(Date.now() - 4 * 86400000).toISOString() },
      { id: 'msg-002-2', sender: 'student', text: 'Yes Mrs. Conteh, I will bring it. Is there anything specific we should prepare?', sentAt: new Date(Date.now() - 4 * 86400000 + 1800000).toISOString() },
      { id: 'msg-002-3', sender: 'teacher', text: 'Review Chapter 8 on cell division. We\'ll be doing a microscope lab — it\'s very hands-on!', sentAt: new Date(Date.now() - 4 * 86400000 + 3600000).toISOString() },
      { id: 'msg-002-4', sender: 'student', text: 'Understood! I\'ll read through it tonight.', sentAt: new Date(Date.now() - 4 * 86400000 + 7200000).toISOString() },
    ],
  },
  {
    id: 'conv-003',
    teacher: { name: 'Mrs. Williams', subject: 'English', initials: 'EW', color: '#8B5CF6' },
    unread: 1,
    messages: [
      { id: 'msg-003-1', sender: 'teacher', text: 'Your essay on Gatsby was well-structured. I\'ve left some feedback in the grading system.', sentAt: new Date(Date.now() - 2 * 86400000).toISOString() },
      { id: 'msg-003-2', sender: 'student', text: 'Thank you! I worked really hard on the symbolism section.', sentAt: new Date(Date.now() - 2 * 86400000 + 3600000).toISOString() },
      { id: 'msg-003-3', sender: 'teacher', text: 'It shows! For the next assignment, focus on expanding your vocabulary and using more literary devices.', sentAt: new Date(Date.now() - 86400000).toISOString() },
    ],
  },
];

export const mockFinancials = {
  summary: {
    totalFees: 2400000,   // in Leones (SLL)
    paidToDate: 1800000,
    outstanding: 600000,
    currency: 'SLL',
    dueDate: new Date(Date.now() + 12 * 86400000).toISOString(),
    percentPaid: 75,
  },
  transactions: [
    { id: 'txn-001', description: 'Term 1 Tuition',    icon: 'receipt_long',   date: '2024-09-15', amount: 1200000, status: 'verified', receiptId: 'RCP-2024-001' },
    { id: 'txn-002', description: 'Lab Fees — Science', icon: 'biotech',        date: '2024-09-20', amount: 200000,  status: 'verified', receiptId: 'RCP-2024-002' },
    { id: 'txn-003', description: 'Library Deposit',    icon: 'library_books',  date: '2024-09-25', amount: 400000,  status: 'verified', receiptId: 'RCP-2024-003' },
    { id: 'txn-004', description: 'PTA Levy',           icon: 'groups',         date: '2024-10-01', amount: 100000,  status: 'pending',  receiptId: null },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCES
// ─────────────────────────────────────────────────────────────────────────────
export const mockResources = [
  {
    id: 'res-math',
    subject: 'Mathematics',
    subjectCode: 'MAT',
    color: '#3B82F6',
    files: [
      { id: 'rf-1',  title: 'Term 1 Syllabus',               type: 'pdf',  size: '2.1 MB',  category: 'syllabus',       locked: false },
      { id: 'rf-2',  title: 'Chapter 4: Quadratic Equations', type: 'pdf',  size: '1.4 MB',  category: 'lecture-notes',  locked: false },
      { id: 'rf-3',  title: 'Mid-Term Practice Paper',        type: 'pdf',  size: '890 KB',  category: 'exams',          locked: false },
      { id: 'rf-4',  title: 'Final Exam Paper 2024',          type: 'pdf',  size: '1.1 MB',  category: 'exams',          locked: true, availableDate: 'May 20' },
    ],
  },
  {
    id: 'res-bio',
    subject: 'Biology',
    subjectCode: 'BIO',
    color: '#10B981',
    files: [
      { id: 'rf-5',  title: 'Course Overview & Syllabus',     type: 'pdf',  size: '3.8 MB',  category: 'syllabus',       locked: false },
      { id: 'rf-6',  title: 'Cell Division — Lecture Slides', type: 'pptx', size: '15.4 MB', category: 'lecture-notes',  locked: false },
      { id: 'rf-7',  title: 'Lab Report Template',            type: 'docx', size: '245 KB',  category: 'handouts',       locked: false },
    ],
  },
  {
    id: 'res-eng',
    subject: 'English Literature',
    subjectCode: 'ENG',
    color: '#8B5CF6',
    files: [
      { id: 'rf-8',  title: 'The Great Gatsby — Study Guide', type: 'pdf',  size: '1.8 MB',  category: 'lecture-notes',  locked: false },
      { id: 'rf-9',  title: 'Essay Writing Rubric',           type: 'pdf',  size: '420 KB',  category: 'handouts',       locked: false },
    ],
  },
  {
    id: 'res-chem',
    subject: 'Chemistry',
    subjectCode: 'CHM',
    color: '#EF4444',
    files: [
      { id: 'rf-10', title: 'Lab Safety Guidelines',          type: 'pdf',  size: '1.2 MB',  category: 'handouts',       locked: false },
      { id: 'rf-11', title: 'Titration Lab Notes',            type: 'docx', size: '890 KB',  category: 'lecture-notes',  locked: false },
      { id: 'rf-12', title: 'Final Exam 2024',                type: 'pdf',  size: '2.3 MB',  category: 'exams',          locked: true, availableDate: 'Jun 1' },
    ],
  },
  {
    id: 'res-phy',
    subject: 'Physics',
    subjectCode: 'PHY',
    color: '#06B6D4',
    featured: true,
    featuredLabel: 'NEW MATERIAL ADDED',
    files: [
      { id: 'rf-13', title: "Newton's Laws — Lecture Notes",  type: 'pdf',  size: '2.7 MB',  category: 'lecture-notes',  locked: false },
      { id: 'rf-14', title: 'Forces & Motion Formula Sheet',  type: 'pdf',  size: '380 KB',  category: 'handouts',       locked: false },
      { id: 'rf-15', title: 'Forces & Motion Quiz — 2024',    type: 'pdf',  size: '760 KB',  category: 'exams',          locked: false },
    ],
  },
  {
    id: 'res-hist',
    subject: 'History',
    subjectCode: 'HIS',
    color: '#6366F1',
    files: [
      { id: 'rf-16', title: 'WWII — Causes & Consequences',   type: 'pdf',  size: '3.1 MB',  category: 'lecture-notes',  locked: false },
      { id: 'rf-17', title: 'Essay Marking Scheme',           type: 'pdf',  size: '310 KB',  category: 'handouts',       locked: false },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────
export const mockAttendance = {
  rate: 92,
  presentDays: 148,
  absentDays: 12,
  tardyDays: 4,
  totalDays: 164,
  academicYear: '2024-2025',
  term: 'First Term 2025',
  recentLog: [
    { date: '2026-04-25', status: 'present' },
    { date: '2026-04-24', status: 'present' },
    { date: '2026-04-23', status: 'absent' },
    { date: '2026-04-22', status: 'present' },
    { date: '2026-04-21', status: 'tardy' },
    { date: '2026-04-18', status: 'present' },
    { date: '2026-04-17', status: 'present' },
    { date: '2026-04-16', status: 'present' },
    { date: '2026-04-15', status: 'absent' },
    { date: '2026-04-14', status: 'present' },
    { date: '2026-04-11', status: 'present' },
    { date: '2026-04-10', status: 'tardy' },
    { date: '2026-04-09', status: 'present' },
    { date: '2026-04-08', status: 'absent' },
    { date: '2026-04-07', status: 'present' },
  ],
};
