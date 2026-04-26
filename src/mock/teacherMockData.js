export const mockTeacherProfile = {
  id: 'teacher-001',
  userId: 'user-teacher-001',
  firstName: 'Johnson',
  lastName: 'Bangura',
  fullName: 'Mr. Johnson Bangura',
  title: 'Mr.',
  initials: 'JB',
  employeeNumber: 'EMP-2024-0023',
  email: 'j.bangura@eksms.edu.sl',
  phone: '+23278005678',
  specializations: ['Mathematics', 'Mathematics Elective'],
  school: 'El-Kendeh School, Freetown, Sierra Leone',
  joinedDate: '2022-09-01',
  status: 'active',
  twoFactorEnabled: false,
  lastLogin: new Date().toISOString(),
  activeSessions: 1,
};

export const mockAssignedClasses = [
  {
    id: 'cls-10a',
    name: 'Grade 10A',
    gradeLevel: '10',
    section: 'A',
    subject: { id: 'sub-math', name: 'Mathematics', code: 'MTH', category: 'core' },
    room: 'Room 12',
    studentCount: 32,
    termId: 'term-1-2024',
    gradeStats: { locked: 18, draft: 4, pending: 10, total: 32, submitted: 22 },
  },
  {
    id: 'cls-10b',
    name: 'Grade 10B',
    gradeLevel: '10',
    section: 'B',
    subject: { id: 'sub-math', name: 'Mathematics', code: 'MTH', category: 'core' },
    room: 'Room 12',
    studentCount: 30,
    termId: 'term-1-2024',
    gradeStats: { locked: 30, draft: 0, pending: 0, total: 30, submitted: 30 },
  },
  {
    id: 'cls-9a',
    name: 'Grade 9A',
    gradeLevel: '9',
    section: 'A',
    subject: { id: 'sub-mte', name: 'Mathematics Elective', code: 'MTE', category: 'elective' },
    room: 'Room 8',
    studentCount: 32,
    termId: 'term-1-2024',
    gradeStats: { locked: 0, draft: 0, pending: 32, total: 32, submitted: 0 },
  },
];

export const mockStudents = {
  'cls-10a': [
    { id: 'stu-001', studentNumber: 'STU-2024-0142', firstName: 'Aminata', lastName: 'Kamara', fullName: 'Aminata Kamara', initials: 'AK', avatarColor: '#0D9488', gender: 'female', currentGrade: { id: 'grade-001', score: 82, gradeLetter: 'A', remarks: 'Excellent work throughout the term', status: 'locked', lastUpdated: '2024-10-14T14:15:00Z', hasModificationAttempt: false } },
    { id: 'stu-002', studentNumber: 'STU-2024-0098', firstName: 'Mohamed', lastName: 'Bangura', fullName: 'Mohamed Bangura', initials: 'MB', avatarColor: '#3B82F6', gender: 'male', currentGrade: { id: 'grade-002', score: 74, gradeLetter: 'B', remarks: 'Good effort, keep reading', status: 'locked', lastUpdated: '2024-10-14T10:00:00Z', hasModificationAttempt: false } },
    { id: 'stu-003', studentNumber: 'STU-2024-0156', firstName: 'Fatmata', lastName: 'Koroma', fullName: 'Fatmata Koroma', initials: 'FK', avatarColor: '#8B5CF6', gender: 'female', currentGrade: { id: 'grade-003', score: 69, gradeLetter: 'C', remarks: 'Needs improvement in practical work', status: 'draft', lastUpdated: '2024-10-12T11:00:00Z', hasModificationAttempt: true, modificationAttemptDetails: { attemptedAt: '2024-10-15T15:42:00Z', wasBlocked: true } } },
    { id: 'stu-004', studentNumber: 'STU-2024-0201', firstName: 'Ibrahim', lastName: 'Kamara', fullName: 'Ibrahim Kamara', initials: 'IK', avatarColor: '#F97316', gender: 'male', currentGrade: { id: 'grade-004', score: null, gradeLetter: null, remarks: '', status: 'draft', lastUpdated: null, hasModificationAttempt: false } },
    { id: 'stu-005', studentNumber: 'STU-2024-0089', firstName: 'Tenneh', lastName: 'Johnson', fullName: 'Tenneh Johnson', initials: 'TJ', avatarColor: '#0D9488', gender: 'female', currentGrade: { id: null, score: null, gradeLetter: null, remarks: '', status: 'pending', lastUpdated: null, hasModificationAttempt: false } },
    { id: 'stu-006', studentNumber: 'STU-2024-0178', firstName: 'Alusine', lastName: 'Sesay', fullName: 'Alusine Sesay', initials: 'AS', avatarColor: '#EC4899', gender: 'male', currentGrade: { id: 'grade-006', score: 91, gradeLetter: 'A+', remarks: 'Outstanding performance', status: 'locked', lastUpdated: '2024-10-14T14:15:00Z', hasModificationAttempt: false } },
    { id: 'stu-007', studentNumber: 'STU-2024-0210', firstName: 'Mariama', lastName: 'Conteh', fullName: 'Mariama Conteh', initials: 'MC', avatarColor: '#14B8A6', gender: 'female', currentGrade: { id: 'grade-007', score: 58, gradeLetter: 'D', remarks: 'Needs to attend extra classes', status: 'locked', lastUpdated: '2024-10-14T14:15:00Z', hasModificationAttempt: false } },
    { id: 'stu-008', studentNumber: 'STU-2024-0045', firstName: 'Sorie', lastName: 'Koroma', fullName: 'Sorie Koroma', initials: 'SK', avatarColor: '#6366F1', gender: 'male', currentGrade: { id: null, score: null, gradeLetter: null, remarks: '', status: 'pending', lastUpdated: null, hasModificationAttempt: false } },
  ],
  'cls-10b': [
    { id: 'stu-101', studentNumber: 'STU-2024-0301', firstName: 'Adama', lastName: 'Jalloh', fullName: 'Adama Jalloh', initials: 'AJ', avatarColor: '#0D9488', gender: 'male', currentGrade: { id: 'grade-101', score: 77, gradeLetter: 'B', remarks: 'Good consistent work', status: 'locked', lastUpdated: '2024-10-13T09:00:00Z', hasModificationAttempt: false } },
    { id: 'stu-102', studentNumber: 'STU-2024-0302', firstName: 'Hawa', lastName: 'Turay', fullName: 'Hawa Turay', initials: 'HT', avatarColor: '#8B5CF6', gender: 'female', currentGrade: { id: 'grade-102', score: 85, gradeLetter: 'A', remarks: 'Excellent analytical skills', status: 'locked', lastUpdated: '2024-10-13T09:00:00Z', hasModificationAttempt: false } },
  ],
  'cls-9a': [
    { id: 'stu-201', studentNumber: 'STU-2024-0401', firstName: 'Lansana', lastName: 'Kamara', fullName: 'Lansana Kamara', initials: 'LK', avatarColor: '#F97316', gender: 'male', currentGrade: { id: null, score: null, gradeLetter: null, remarks: '', status: 'pending', lastUpdated: null, hasModificationAttempt: false } },
    { id: 'stu-202', studentNumber: 'STU-2024-0402', firstName: 'Isatu', lastName: 'Bangura', fullName: 'Isatu Bangura', initials: 'IB', avatarColor: '#EC4899', gender: 'female', currentGrade: { id: null, score: null, gradeLetter: null, remarks: '', status: 'pending', lastUpdated: null, hasModificationAttempt: false } },
  ],
};

export const mockGradeHistory = {
  'grade-001': [
    { id: 'evt-001', eventType: 'DRAFT', score: 82, gradeLetter: 'A', recordedBy: 'Mr. Johnson Bangura', recordedByRole: 'Teacher', recordedAt: '2024-10-10T10:32:00Z', isSecurityEvent: false },
    { id: 'evt-002', eventType: 'SUBMIT', score: 82, gradeLetter: 'A', recordedBy: 'Mr. Johnson Bangura', recordedByRole: 'Teacher', recordedAt: '2024-10-14T14:15:00Z', isSecurityEvent: false },
    { id: 'evt-003', eventType: 'LOCK', score: 82, gradeLetter: 'A', recordedBy: 'System', recordedByRole: 'System', recordedAt: '2024-10-14T14:16:00Z', isSecurityEvent: false },
  ],
  'grade-003': [
    { id: 'evt-010', eventType: 'DRAFT', score: 69, gradeLetter: 'C', recordedBy: 'Mr. Johnson Bangura', recordedByRole: 'Teacher', recordedAt: '2024-10-11T09:00:00Z', isSecurityEvent: false },
    { id: 'evt-011', eventType: 'MODIFICATION_ATTEMPT', recordedBy: 'Unknown', recordedByRole: 'Unknown', recordedAt: '2024-10-15T15:42:00Z', isSecurityEvent: true, reason: 'Unauthorized modification attempt — blocked' },
  ],
};

export const mockTimetable = {
  teacherId: 'teacher-001',
  termId: 'term-1-2024',
  generatedAt: '2024-09-01T08:00:00Z',
  weeklyHours: 18,
  maxWeeklyHours: 22,
  periods: [
    { id: 'per-001', day: 'monday', startTime: '08:00', endTime: '09:00', subject: 'Mathematics', subjectCode: 'MTH', class: 'Grade 10A', classId: 'cls-10a', room: 'Room 12', type: 'teaching' },
    { id: 'per-002', day: 'monday', startTime: '10:00', endTime: '11:00', subject: 'Mathematics', subjectCode: 'MTH', class: 'Grade 10B', classId: 'cls-10b', room: 'Room 12', type: 'teaching' },
    { id: 'per-003', day: 'monday', startTime: '13:00', endTime: '14:00', subject: 'Mathematics Elective', subjectCode: 'MTE', class: 'Grade 9A', classId: 'cls-9a', room: 'Room 8', type: 'teaching' },
    { id: 'per-004', day: 'tuesday', startTime: '08:30', endTime: '09:30', subject: 'Mathematics', subjectCode: 'MTH', class: 'Grade 10A', classId: 'cls-10a', room: 'Room 12', type: 'teaching' },
    { id: 'per-005', day: 'tuesday', startTime: '10:30', endTime: '11:30', subject: 'Mathematics', subjectCode: 'MTH', class: 'Grade 10B', classId: 'cls-10b', room: 'Room 12', type: 'teaching' },
    { id: 'per-006', day: 'wednesday', startTime: '08:00', endTime: '09:00', subject: 'Mathematics', subjectCode: 'MTH', class: 'Grade 10A', classId: 'cls-10a', room: 'Room 12', type: 'teaching' },
    { id: 'per-007', day: 'wednesday', startTime: '09:00', endTime: '10:00', subject: 'Mathematics', subjectCode: 'MTH', class: 'Grade 10B', classId: 'cls-10b', room: 'Room 12', type: 'teaching' },
    { id: 'per-008', day: 'wednesday', startTime: '11:00', endTime: '12:00', subject: 'Mathematics Elective', subjectCode: 'MTE', class: 'Grade 9A', classId: 'cls-9a', room: 'Room 8', type: 'teaching' },
    { id: 'per-009', day: 'wednesday', startTime: '14:00', endTime: '14:30', subject: 'Duty Period', subjectCode: null, class: 'Exam Supervision', classId: null, room: 'Hall A', type: 'duty' },
    { id: 'per-010', day: 'thursday', startTime: '08:30', endTime: '09:30', subject: 'Mathematics', subjectCode: 'MTH', class: 'Grade 10B', classId: 'cls-10b', room: 'Room 12', type: 'teaching' },
    { id: 'per-011', day: 'thursday', startTime: '11:00', endTime: '12:00', subject: 'Mathematics Elective', subjectCode: 'MTE', class: 'Grade 9A', classId: 'cls-9a', room: 'Room 8', type: 'teaching' },
    { id: 'per-012', day: 'friday', startTime: '08:00', endTime: '09:00', subject: 'Mathematics', subjectCode: 'MTH', class: 'Grade 10A', classId: 'cls-10a', room: 'Room 12', type: 'teaching' },
    { id: 'per-013', day: 'friday', startTime: '10:00', endTime: '11:00', subject: 'Mathematics', subjectCode: 'MTH', class: 'Grade 10B', classId: 'cls-10b', room: 'Room 12', type: 'teaching' },
  ],
};

export const mockModificationRequests = [
  { id: 'mod-001', gradeId: 'grade-003', studentId: 'stu-003', studentName: 'Fatmata Koroma', classId: 'cls-10a', className: 'Grade 10A', subjectName: 'Mathematics', currentScore: 69, currentGradeLetter: 'C', proposedScore: 74, proposedGradeLetter: 'B', reason: 'Data entry error — correct score from exam script is 74, not 69.', status: 'pending', submittedAt: '2024-10-16T11:30:00Z', adminResponse: null, respondedAt: null },
];

export const mockTeacherNotifications = [
  { id: 'tn-001', type: 'MODIFICATION_ATTEMPT', title: 'Grade Modification Attempt — Mathematics', message: "An attempt was made to alter Fatmata Koroma's Mathematics grade (69% · C) in Grade 10A. The attempt was BLOCKED. Your original grade is preserved.", isRead: false, isSecurityAlert: true, createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), relatedGradeId: 'grade-003', relatedStudentId: 'stu-003' },
  { id: 'tn-002', type: 'MODIFICATION_REQUEST_PENDING', title: 'Modification Request Under Review', message: "Your request to change Fatmata Koroma's Mathematics grade from 69% (C) to 74% (B) is being reviewed by the administrator.", isRead: false, isSecurityAlert: false, createdAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(), relatedRequestId: 'mod-001' },
  { id: 'tn-003', type: 'GRADE_LOCKED', title: 'Grade 10B Mathematics — All Grades Locked', message: 'All 30 grades for Grade 10B Mathematics have been locked. Students and parents have been notified.', isRead: true, isSecurityAlert: false, createdAt: '2024-10-14T14:16:00Z', relatedClassId: 'cls-10b' },
  { id: 'tn-004', type: 'GRADE_SUBMITTED', title: 'Grade Submission Confirmed', message: "Aminata Kamara's Mathematics grade (82% · A) has been permanently recorded.", isRead: true, isSecurityAlert: false, createdAt: '2024-10-14T14:15:00Z', relatedGradeId: 'grade-001' },
  { id: 'tn-005', type: 'SYSTEM', title: 'First Term Grade Entry Opened', message: 'Grade entry for First Term 2024–2025 is now open. Please submit all grades by December 6, 2024.', isRead: true, isSecurityAlert: false, createdAt: '2024-09-02T08:00:00Z' },
];

export const mockTerms = [
  { id: 'term-1-2024', name: 'First Term', academicYear: '2024-2025', startDate: '2024-09-02', endDate: '2024-12-13', isCurrent: true, weekNumber: 9, totalWeeks: 14, gradeEntryDeadline: '2024-12-06' },
  { id: 'term-2-2024', name: 'Second Term', academicYear: '2024-2025', startDate: '2025-01-13', endDate: '2025-04-11', isCurrent: false },
];

export const mockGradingScheme = {
  schoolId: 'school-001',
  passMark: 50,
  boundaries: [
    { letter: 'A+', min: 90, max: 100, color: '#065F46' },
    { letter: 'A',  min: 80, max: 89,  color: '#047857' },
    { letter: 'B',  min: 70, max: 79,  color: '#0369A1' },
    { letter: 'C',  min: 60, max: 69,  color: '#92400E' },
    { letter: 'D',  min: 50, max: 59,  color: '#B45309' },
    { letter: 'F',  min: 0,  max: 49,  color: '#B91C1C' },
  ],
};

export const mockAttendanceSessions = {
  'cls-10a': [
    { id: 'att-001', date: '2024-10-17', period: '08:00 – 09:00', subject: 'Mathematics', room: 'Room 12', submitted: true, present: 26, absent: 2, late: 4, total: 32 },
    { id: 'att-002', date: '2024-10-15', period: '08:00 – 09:00', subject: 'Mathematics', room: 'Room 12', submitted: true, present: 28, absent: 2, late: 2, total: 32 },
    { id: 'att-003', date: '2024-10-14', period: '08:00 – 09:00', subject: 'Mathematics', room: 'Room 12', submitted: true, present: 30, absent: 1, late: 1, total: 32 },
  ],
  'cls-10b': [
    { id: 'att-101', date: '2024-10-17', period: '10:00 – 11:00', subject: 'Mathematics', room: 'Room 12', submitted: true, present: 28, absent: 1, late: 1, total: 30 },
  ],
  'cls-9a': [],
};

export const mockClassAnalytics = {
  'cls-10a': {
    classAverage: 74.8,
    classAverageLetter: 'B',
    averageDelta: +2.4,
    passRate: 87.5,
    highestScore: { score: 91, studentName: 'Alusine Sesay', gradeLetter: 'A+' },
    lowestScore: { score: 58, studentName: 'Mariama Conteh', gradeLetter: 'D' },
    distribution: [
      { letter: 'A+', count: 1, color: '#065F46' },
      { letter: 'A',  count: 2, color: '#047857' },
      { letter: 'B',  count: 2, color: '#0369A1' },
      { letter: 'C',  count: 1, color: '#92400E' },
      { letter: 'D',  count: 1, color: '#B45309' },
      { letter: 'F',  count: 0, color: '#B91C1C' },
    ],
    topPerformers: [
      { rank: 1, studentName: 'Alusine Sesay', initials: 'AS', avatarColor: '#EC4899', score: 91, gradeLetter: 'A+' },
      { rank: 2, studentName: 'Aminata Kamara', initials: 'AK', avatarColor: '#0D9488', score: 82, gradeLetter: 'A' },
      { rank: 3, studentName: 'Mohamed Bangura', initials: 'MB', avatarColor: '#3B82F6', score: 74, gradeLetter: 'B' },
    ],
    aiInsights: [
      { type: 'positive', text: 'Class average is up 2.4% compared to the previous term, driven by strong performance in algebra.' },
      { type: 'warning', text: '2 students scored below 60% — recommend targeted intervention sessions before the final exam.' },
      { type: 'info', text: 'Attendance rate of 84% correlates with lower scores for late arrivals. Early session engagement is key.' },
    ],
  },
  'cls-10b': {
    classAverage: 81.0,
    classAverageLetter: 'A',
    averageDelta: +1.1,
    passRate: 100,
    highestScore: { score: 85, studentName: 'Hawa Turay', gradeLetter: 'A' },
    lowestScore: { score: 77, studentName: 'Adama Jalloh', gradeLetter: 'B' },
    distribution: [
      { letter: 'A+', count: 0, color: '#065F46' },
      { letter: 'A',  count: 1, color: '#047857' },
      { letter: 'B',  count: 1, color: '#0369A1' },
      { letter: 'C',  count: 0, color: '#92400E' },
      { letter: 'D',  count: 0, color: '#B45309' },
      { letter: 'F',  count: 0, color: '#B91C1C' },
    ],
    topPerformers: [
      { rank: 1, studentName: 'Hawa Turay', initials: 'HT', avatarColor: '#8B5CF6', score: 85, gradeLetter: 'A' },
      { rank: 2, studentName: 'Adama Jalloh', initials: 'AJ', avatarColor: '#0D9488', score: 77, gradeLetter: 'B' },
    ],
    aiInsights: [
      { type: 'positive', text: 'All 30 students passed with 100% pass rate — outstanding class performance this term.' },
      { type: 'info', text: 'Class average of 81% places Grade 10B in the top 15% school-wide for Mathematics.' },
    ],
  },
  'cls-9a': null,
};

export const mockExportHistory = [
  { id: 'exp-001', name: 'Student Roster — Grade 10A', format: 'PDF', date: '2024-10-16T08:30:00Z', status: 'success', size: '1.2 MB' },
  { id: 'exp-002', name: 'Gradebook Summary — First Term', format: 'CSV', date: '2024-10-15T14:20:00Z', status: 'success', size: '84 KB' },
  { id: 'exp-003', name: 'Academic Audit Log', format: 'PDF', date: '2024-10-14T11:05:00Z', status: 'expired', size: '3.4 MB' },
];

export const mockSettingsPrefs = {
  notifications: {
    gradeDiscrepancyAlerts: true,
    modificationRequests: true,
    weeklyFacultyDigest: false,
    gradeLockConfirmations: true,
    systemAlerts: true,
  },
  storageUsedGB: 4.2,
  storageTotalGB: 10,
};
