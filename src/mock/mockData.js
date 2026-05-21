const now = () => new Date().toISOString();
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

const MOCK_USERS = {
  superadmin: {
    id: 1, username: 'superadmin', email: 'super@admin.com', first_name: 'Super', last_name: 'Admin',
    role: 'superadmin', is_superuser: true, is_active: true, is_staff: true, school_id: null,
    phone: '+2348000000001', password: 'admin123', must_change_password: false,
  },
  school_admin: {
    id: 2, username: 'schooladmin', email: 'admin@demo.school', first_name: 'Demo', last_name: 'School',
    role: 'school_admin', is_superuser: false, is_active: true, is_staff: false, school_id: 1,
    phone: '+2348000000002', password: 'admin123', must_change_password: false,
  },
  teacher: {
    id: 3, username: 'teacher1', email: 'teacher@demo.school', first_name: 'John', last_name: 'Doe',
    role: 'teacher', is_superuser: false, is_active: true, is_staff: false, school_id: 1,
    phone: '+2348000000003', password: 'teacher123', must_change_password: false,
  },
  student: {
    id: 4, username: 'student1', email: 'student@demo.school', first_name: 'Alice', last_name: 'Johnson',
    role: 'student', is_superuser: false, is_active: true, is_staff: false, school_id: 1,
    phone: '+2348000000004', password: 'student123', must_change_password: false,
  },
  parent: {
    id: 5, username: 'parent1', email: 'parent@demo.school', first_name: 'Robert', last_name: 'Johnson',
    role: 'parent', is_superuser: false, is_active: true, is_staff: false, school_id: 1,
    phone: '+2348000000005', password: 'parent123', must_change_password: false,
  },
  principal: {
    id: 6, username: 'principal1', email: 'principal@demo.school', first_name: 'Sarah', last_name: 'Williams',
    role: 'principal', is_superuser: false, is_active: true, is_staff: false, school_id: 1,
    phone: '+2348000000006', password: 'principal123', must_change_password: false,
  },
  finance: {
    id: 7, username: 'finance1', email: 'finance@demo.school', first_name: 'James', last_name: 'Brown',
    role: 'bursar', is_superuser: false, is_active: true, is_staff: false, school_id: 1,
    phone: '+2348000000007', password: 'finance123', must_change_password: false,
  },
  teacher2: {
    id: 8, username: 'teacher2', email: 'teacher2@demo.school', first_name: 'Mary', last_name: 'Smith',
    role: 'teacher', is_superuser: false, is_active: true, is_staff: false, school_id: 1,
    phone: '+2348000000008', password: 'teacher123', must_change_password: false,
  },
  student2: {
    id: 9, username: 'student2', email: 'student2@demo.school', first_name: 'Bob', last_name: 'Smith',
    role: 'student', is_superuser: false, is_active: true, is_staff: false, school_id: 1,
    phone: '+2348000000009', password: 'student123', must_change_password: false,
  },
};

const MOCK_SCHOOL = {
  id: 1, name: 'Demo International School', email: 'info@demo.school', phone: '+2348000000100',
  address: '123 Education Avenue', city: 'Lagos', country: 'Nigeria',
  badge_path: null, brand_colors: '["#2563eb","#1d4ed8","#7c3aed"]',
  institution_type: 'secondary', capacity: 2000, is_approved: true, is_active: true,
  motto: 'Excellence in Education', total_students: 456, total_teachers: 38,
  active_classes: 18, attendance_rate: 94.5, avg_performance: 72.3,
  pending_actions: 3, fees_collected: 1250000, fees_outstanding: 340000,
  created_at: daysAgo(365), updated_at: now(),
};

const MOCK_ACADEMIC_YEARS = [
  { id: 1, school_id: 1, name: '2024/2025', start_date: '2024-09-01', end_date: '2025-08-31', is_active: false },
  { id: 2, school_id: 1, name: '2025/2026', start_date: '2025-09-01', end_date: '2026-08-31', is_active: true },
];

const MOCK_TERMS = [
  { id: 1, school_id: 1, name: 'Term 1', academic_year_id: 2, start_date: '2025-09-01', end_date: '2025-12-15', is_active: false },
  { id: 2, school_id: 1, name: 'Term 2', academic_year_id: 2, start_date: '2026-01-08', end_date: '2026-04-11', is_active: true },
  { id: 3, school_id: 1, name: 'Term 3', academic_year_id: 2, start_date: '2026-05-04', end_date: '2026-08-14', is_active: false },
];

const MOCK_CLASSES = [
  { id: 1, school_id: 1, name: 'JSS 1A', code: 'JSS1A', form: 'JSS', form_number: 1, stream: 'A', class_teacher_id: 1, capacity: 35, academic_year_id: 2, room: '101', is_active: true, student_count: 28 },
  { id: 2, school_id: 1, name: 'JSS 1B', code: 'JSS1B', form: 'JSS', form_number: 1, stream: 'B', class_teacher_id: 2, capacity: 35, academic_year_id: 2, room: '102', is_active: true, student_count: 26 },
  { id: 3, school_id: 1, name: 'JSS 2A', code: 'JSS2A', form: 'JSS', form_number: 2, stream: 'A', class_teacher_id: 3, capacity: 35, academic_year_id: 2, room: '103', is_active: true, student_count: 30 },
  { id: 4, school_id: 1, name: 'JSS 2B', code: 'JSS2B', form: 'JSS', form_number: 2, stream: 'B', class_teacher_id: 4, capacity: 35, academic_year_id: 2, room: '104', is_active: true, student_count: 27 },
  { id: 5, school_id: 1, name: 'JSS 3A', code: 'JSS3A', form: 'JSS', form_number: 3, stream: 'A', class_teacher_id: 5, capacity: 35, academic_year_id: 2, room: '105', is_active: true, student_count: 29 },
  { id: 6, school_id: 1, name: 'SSS 1A', code: 'SSS1A', form: 'SSS', form_number: 1, stream: 'A', class_teacher_id: 6, capacity: 30, academic_year_id: 2, room: '201', is_active: true, student_count: 24 },
];

const MOCK_SUBJECTS = [
  { id: 1, school_id: 1, name: 'Mathematics', code: 'MATH', description: 'Mathematics', is_active: true },
  { id: 2, school_id: 1, name: 'English Language', code: 'ENG', description: 'English Language', is_active: true },
  { id: 3, school_id: 1, name: 'Physics', code: 'PHY', description: 'Physics', is_active: true },
  { id: 4, school_id: 1, name: 'Chemistry', code: 'CHEM', description: 'Chemistry', is_active: true },
  { id: 5, school_id: 1, name: 'Biology', code: 'BIO', description: 'Biology', is_active: true },
  { id: 6, school_id: 1, name: 'History', code: 'HIST', description: 'History', is_active: true },
  { id: 7, school_id: 1, name: 'Geography', code: 'GEOG', description: 'Geography', is_active: true },
  { id: 8, school_id: 1, name: 'Computer Science', code: 'CS', description: 'Computer Science', is_active: true },
  { id: 9, school_id: 1, name: 'French', code: 'FREN', description: 'French Language', is_active: true },
  { id: 10, school_id: 1, name: 'Physical Education', code: 'PE', description: 'Physical Education', is_active: true },
];

const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack', 'Karen', 'Leo', 'Mona', 'Nathan', 'Olive', 'Paul', 'Quinn', 'Rose', 'Sam', 'Tina', 'Uma', 'Victor', 'Wendy', 'Xander', 'Yara', 'Zack', 'Aisha', 'Ben', 'Clara', 'David'];
const lastNames = ['Johnson', 'Smith', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris'];

const MOCK_STUDENTS = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1, school_id: 1, user_id: null, classroom_id: (i % 6) + 1, academic_year_id: 2,
  admission_number: `DEMO/${String(i + 2025001).slice(0, 4)}`, admission_date: daysAgo(200 + i),
  date_of_birth: daysAgo(365 * (12 + (i % 4))), gender: i % 2 === 0 ? 'Male' : 'Female',
  first_name: firstNames[i], last_name: lastNames[i % 20],
  student_type: 'regular', status: 'active',
  home_address: `${100 + i} Mock Street`, city: 'Lagos', phone_number: `+2348000000${String(100 + i).slice(0, 3)}`,
  father_name: `Mr. ${lastNames[i % 20]}`, father_phone: `+2347000000${String(100 + i).slice(0, 3)}`,
  mother_name: `Mrs. ${lastNames[(i + 1) % 20]}`, mother_phone: `+2347000000${String(200 + i).slice(0, 3)}`,
  emergency_contact: `+2349000000${String(100 + i).slice(0, 3)}`,
  created_at: daysAgo(200 + i), updated_at: now(),
}));

const MOCK_TEACHERS = [
  { id: 1, school_id: 1, user_id: 3, employee_id: 'TCH001', first_name: 'John', last_name: 'Doe', email: 'john.doe@demo.school', phone_number: '+2348000000010', qualification: 'B.Ed Mathematics', hire_date: daysAgo(500), is_active: true, is_examination_officer: false, years_experience: 5, bio: 'Experienced mathematics teacher' },
  { id: 2, school_id: 1, user_id: 8, employee_id: 'TCH002', first_name: 'Mary', last_name: 'Smith', email: 'mary.smith@demo.school', phone_number: '+2348000000011', qualification: 'M.A. English', hire_date: daysAgo(400), is_active: true, is_examination_officer: true, years_experience: 8, bio: 'Senior English teacher' },
  { id: 3, school_id: 1, user_id: null, employee_id: 'TCH003', first_name: 'Peter', last_name: 'Okonkwo', email: 'peter.okonkwo@demo.school', phone_number: '+2348000000012', qualification: 'B.Sc Physics', hire_date: daysAgo(300), is_active: true, is_examination_officer: false, years_experience: 3, bio: 'Physics teacher' },
  { id: 4, school_id: 1, user_id: null, employee_id: 'TCH004', first_name: 'Grace', last_name: 'Adebayo', email: 'grace.adebayo@demo.school', phone_number: '+2348000000013', qualification: 'B.Sc Chemistry', hire_date: daysAgo(350), is_active: true, is_examination_officer: false, years_experience: 6, bio: 'Chemistry teacher' },
  { id: 5, school_id: 1, user_id: null, employee_id: 'TCH005', first_name: 'Samuel', last_name: 'Okafor', email: 'samuel.okafor@demo.school', phone_number: '+2348000000014', qualification: 'B.Ed Biology', hire_date: daysAgo(280), is_active: true, is_examination_officer: false, years_experience: 4, bio: 'Biology teacher' },
];

const MOCK_TEACHER_CLASSES = [
  { id: 1, teacher_id: 1, class_id: 1, subject_id: 1 },
  { id: 2, teacher_id: 1, class_id: 2, subject_id: 1 },
  { id: 3, teacher_id: 1, class_id: 3, subject_id: 1 },
  { id: 4, teacher_id: 1, class_id: 6, subject_id: 1 },
  { id: 5, teacher_id: 2, class_id: 1, subject_id: 2 },
  { id: 6, teacher_id: 2, class_id: 2, subject_id: 2 },
  { id: 7, teacher_id: 2, class_id: 6, subject_id: 2 },
];

function generateGrades(subjectId, termId) {
  return MOCK_STUDENTS.slice(0, 15).map(s => {
    const ca = Math.floor(Math.random() * 25) + 5;
    const exam = Math.floor(Math.random() * 55) + 5;
    const total = ca + exam;
    const grade = total >= 90 ? 'A' : total >= 75 ? 'B' : total >= 60 ? 'C' : total >= 50 ? 'D' : total >= 40 ? 'E' : 'F';
    return {
      id: (subjectId - 1) * 30 + s.id, school_id: 1, student_id: s.id, subject_id: subjectId,
      term_id: termId, classroom_id: s.classroom_id, ca_score: ca, midterm_score: 0,
      exam_score: exam, total, grade_letter: grade,
      remarks: grade === 'F' ? 'Needs improvement' : grade === 'A' ? 'Excellent' : 'Satisfactory',
      approval_status: Math.random() > 0.3 ? 'approved' : 'pending',
      created_at: daysAgo(30), updated_at: daysAgo(5),
    };
  });
}

const MOCK_GRADES = [];
for (let subj = 1; subj <= 5; subj++) {
  MOCK_GRADES.push(...generateGrades(subj, 2));
}

const MOCK_ATTENDANCE = MOCK_STUDENTS.slice(0, 15).flatMap(s =>
  Array.from({ length: 20 }, (_, i) => ({
    id: (s.id - 1) * 20 + i + 1, school_id: 1, student_id: s.id,
    classroom_id: s.classroom_id, date: daysAgo(i * 2),
    status: Math.random() > 0.15 ? 'present' : Math.random() > 0.5 ? 'absent' : 'late',
    remarks: '',
  }))
);

const MOCK_NOTIFICATIONS = [
  { id: 1, school_id: 1, user_id: 4, title: 'Grade Published', message: 'Your Mathematics grade for Term 2 has been published.', type: 'grade', is_read: false, created_at: daysAgo(1) },
  { id: 2, school_id: 1, user_id: 4, title: 'New Assignment', message: 'English essay due Friday.', type: 'assignment', is_read: false, created_at: daysAgo(2) },
  { id: 3, school_id: 1, user_id: 3, title: 'Class Update', message: 'JSS 1A timetable changed.', type: 'info', is_read: false, created_at: daysAgo(1) },
  { id: 4, school_id: 1, user_id: 2, title: 'New Registration', message: '3 new student registrations pending.', type: 'info', is_read: false, created_at: daysAgo(0) },
  { id: 5, school_id: 1, user_id: 5, title: 'Report Card Ready', message: 'Alice Johnson Term 2 report card is ready.', type: 'grade', is_read: false, created_at: daysAgo(1) },
  { id: 6, school_id: 1, user_id: 3, title: 'Grade Approval Needed', message: 'You have 5 pending grade approvals.', type: 'warning', is_read: false, created_at: daysAgo(0) },
];

const MOCK_MESSAGES = [
  { id: 1, school_id: 1, sender_id: 3, sender_type: 'teacher', recipient_id: 4, recipient_type: 'student', subject: 'Math Homework', body: 'Please complete chapter 5 exercises for tomorrow.', is_read: false, thread_id: 't1', created_at: daysAgo(1) },
  { id: 2, school_id: 1, sender_id: 3, sender_type: 'teacher', recipient_id: 5, recipient_type: 'parent', subject: 'Academic Progress', body: 'Alice is doing well in Mathematics this term.', is_read: false, thread_id: 't2', created_at: daysAgo(2) },
  { id: 3, school_id: 1, sender_id: 4, sender_type: 'student', recipient_id: 3, recipient_type: 'teacher', subject: 'Question on Assignment', body: 'I need clarification on question 3.', is_read: false, thread_id: 't1', created_at: daysAgo(0) },
];

const MOCK_ASSIGNMENTS = [
  { id: 1, school_id: 1, class_id: 1, subject_id: 1, teacher_id: 1, title: 'Quadratic Equations', description: 'Solve 20 quadratic equations using the formula method.', due_date: daysAgo(-5), max_score: 100, is_active: true, submission_count: 22 },
  { id: 2, school_id: 1, class_id: 1, subject_id: 2, teacher_id: 2, title: 'Essay: My Hero', description: 'Write a 500-word essay about your personal hero.', due_date: daysAgo(-3), max_score: 50, is_active: true, submission_count: 18 },
  { id: 3, school_id: 1, class_id: 2, subject_id: 1, teacher_id: 1, title: 'Algebra Test Prep', description: 'Practice problems from chapters 3-5.', due_date: daysAgo(7), max_score: 100, is_active: true, submission_count: 8 },
];

const MOCK_EXAMS = [
  { id: 1, school_id: 1, term_id: 2, subject_id: 1, classroom_id: 1, name: 'Mid-Term Test', date: daysAgo(15), total_marks: 100, is_active: true },
  { id: 2, school_id: 1, term_id: 2, subject_id: 2, classroom_id: 1, name: 'Mid-Term Test', date: daysAgo(14), total_marks: 100, is_active: true },
  { id: 3, school_id: 1, term_id: 2, subject_id: 3, classroom_id: 1, name: 'Mid-Term Test', date: daysAgo(13), total_marks: 100, is_active: true },
];

const MOCK_TIMETABLE = [
  { id: 1, class_id: 1, subject_id: 1, teacher_id: 1, day_of_week: 'Monday', start_time: '08:00', end_time: '08:45', room: '101' },
  { id: 2, class_id: 1, subject_id: 2, teacher_id: 2, day_of_week: 'Monday', start_time: '08:45', end_time: '09:30', room: '101' },
  { id: 3, class_id: 1, subject_id: 3, teacher_id: 3, day_of_week: 'Tuesday', start_time: '08:00', end_time: '08:45', room: '101' },
  { id: 4, class_id: 1, subject_id: 1, teacher_id: 1, day_of_week: 'Wednesday', start_time: '10:00', end_time: '10:45', room: '101' },
  { id: 5, class_id: 1, subject_id: 4, teacher_id: 4, day_of_week: 'Thursday', start_time: '08:00', end_time: '08:45', room: 'Lab 1' },
  { id: 6, class_id: 1, subject_id: 5, teacher_id: 5, day_of_week: 'Friday', start_time: '09:00', end_time: '09:45', room: 'Lab 2' },
  { id: 7, class_id: 2, subject_id: 1, teacher_id: 1, day_of_week: 'Monday', start_time: '10:00', end_time: '10:45', room: '102' },
  { id: 8, class_id: 2, subject_id: 2, teacher_id: 2, day_of_week: 'Tuesday', start_time: '08:00', end_time: '08:45', room: '102' },
];

const MOCK_RESOURCES = [
  { id: 1, school_id: 1, class_id: 1, subject_id: 1, teacher_id: 1, title: 'Algebra Foundations', description: 'Comprehensive algebra textbook chapter', resource_type: 'document', file_path: null, url: null, is_active: true, download_count: 45 },
  { id: 2, school_id: 1, class_id: 1, subject_id: 2, teacher_id: 2, title: 'Grammar Guide', description: 'English grammar reference', resource_type: 'document', file_path: null, url: null, is_active: true, download_count: 32 },
  { id: 3, school_id: 1, class_id: 1, subject_id: 3, teacher_id: 3, title: 'Physics Formulas', description: 'Key physics formulas for JSS', resource_type: 'document', file_path: null, url: null, is_active: true, download_count: 28 },
];

const MOCK_FEE_CATEGORIES = [
  { id: 1, school_id: 1, name: 'Tuition Fee', description: 'Standard tuition per term', amount: 85000, frequency: 'termly', is_active: true },
  { id: 2, school_id: 1, name: 'Development Levy', description: 'School development fund', amount: 15000, frequency: 'termly', is_active: true },
  { id: 3, school_id: 1, name: 'Sports Fee', description: 'Sports and extracurricular', amount: 5000, frequency: 'termly', is_active: true },
  { id: 4, school_id: 1, name: 'ICT Fee', description: 'Computer lab maintenance', amount: 8000, frequency: 'termly', is_active: true },
];

const MOCK_EXPENSES = [
  { id: 1, school_id: 1, category: 'Utilities', description: 'Electricity bill', amount: 120000, date: daysAgo(10), status: 'approved' },
  { id: 2, school_id: 1, category: 'Maintenance', description: 'Classroom repairs', amount: 45000, date: daysAgo(7), status: 'approved' },
  { id: 3, school_id: 1, category: 'Supplies', description: 'Office supplies', amount: 25000, date: daysAgo(5), status: 'pending' },
  { id: 4, school_id: 1, category: 'Salary', description: 'Staff salaries - March', amount: 850000, date: daysAgo(3), status: 'approved' },
];

const MOCK_STUDY_GROUPS = [
  { id: 1, school_id: 1, name: 'Math Masters', subject_id: 1, teacher_id: 1, description: 'Advanced math study group', meeting_schedule: 'Wednesdays 3pm', is_active: true, member_count: 8 },
  { id: 2, school_id: 1, name: 'Science Squad', subject_id: 3, teacher_id: 3, description: 'Physics and chemistry help group', meeting_schedule: 'Fridays 2pm', is_active: true, member_count: 6 },
];

const MOCK_ANALYTICS = {
  total_students: 456, total_teachers: 38, active_classes: 18,
  attendance_rate: 94.5, avg_performance: 72.3,
  gender_distribution: { male: 52, female: 48 },
  grade_distribution: { A: 15, B: 30, C: 35, D: 15, E: 4, F: 1 },
  performance_trend: [68, 70, 72, 71, 73, 72, 74],
  monthly_attendance: [92, 93, 94, 95, 94, 95, 96],
};

const MOCK_PARENT_CHILDREN = [
  { id: 1, student_id: 1, first_name: 'Alice', last_name: 'Johnson', class_name: 'JSS 1A', admission_number: 'DEMO/2025001', status: 'active', grade_average: 78.5 },
  { id: 2, student_id: 9, first_name: 'Bob', last_name: 'Smith', class_name: 'JSS 2A', admission_number: 'DEMO/2025002', status: 'active', grade_average: 82.0 },
];

const MOCK_CONFERENCE_SLOTS = [
  { id: 1, school_id: 1, teacher_id: 1, date: daysAgo(-5), start_time: '14:00', end_time: '14:30', status: 'available' },
  { id: 2, school_id: 1, teacher_id: 1, date: daysAgo(-5), start_time: '14:30', end_time: '15:00', status: 'booked', parent_id: 5, notes: 'Discuss Alice progress' },
  { id: 3, school_id: 1, teacher_id: 2, date: daysAgo(-3), start_time: '15:00', end_time: '15:30', status: 'available' },
];

const MOCK_OFFICE_HOURS = [
  { id: 1, school_id: 1, teacher_id: 1, date: daysAgo(-5), start_time: '13:00', end_time: '15:00', slot_duration_minutes: 30, max_bookings: 4, is_active: true },
  { id: 2, school_id: 1, teacher_id: 2, date: daysAgo(-4), start_time: '14:00', end_time: '16:00', slot_duration_minutes: 30, max_bookings: 4, is_active: true },
];

const MOCK_BEHAVIOUR_INCIDENTS = [
  { id: 1, school_id: 1, student_id: 5, reported_by: 1, incident_type: 'disruptive', severity: 'low', description: 'Talking during class', action_taken: 'Verbal warning', follow_up_required: false, parent_notified: false, date: daysAgo(5) },
  { id: 2, school_id: 1, student_id: 8, reported_by: 2, incident_type: 'late_submission', severity: 'low', description: 'Missing homework 3 times', action_taken: 'Detention', follow_up_required: true, follow_up_date: daysAgo(-2), parent_notified: true, date: daysAgo(7) },
];

const MOCK_LESSON_PLANS = [
  { id: 1, school_id: 1, teacher_id: 1, class_id: 1, subject_id: 1, date: daysAgo(3), topic: 'Quadratic Equations', objectives: 'Solve quadratic equations using formula', activities: 'Practice problems, group work', materials: 'Textbook, worksheet', homework: 'Chapter 5 exercise 3', reflection: 'Students grasped the concept well' },
  { id: 2, school_id: 1, teacher_id: 1, class_id: 2, subject_id: 1, date: daysAgo(2), topic: 'Linear Graphs', objectives: 'Plot and interpret linear graphs', activities: 'Graph paper exercises', materials: 'Graph paper, ruler', homework: 'Plot 5 equations', reflection: '' },
];

const MOCK_DONATION_CAMPAIGNS = [
  { id: 1, school_id: 1, title: 'Library Renovation Fund', description: 'Help us build a modern library', target_amount: 5000000, current_amount: 1250000, start_date: daysAgo(60), end_date: daysAgo(120), is_active: true },
  { id: 2, school_id: 1, title: 'Science Lab Equipment', description: 'Upgrade our science laboratory', target_amount: 3000000, current_amount: 800000, start_date: daysAgo(30), end_date: daysAgo(90), is_active: true },
];

const MOCK_PERMISSION_SLIPS = [
  { id: 1, school_id: 1, title: 'Field Trip - National Museum', description: 'Educational visit to the National Museum', event_date: daysAgo(-10), expiry_date: daysAgo(-5), is_active: true, signed: true },
  { id: 2, school_id: 1, title: 'Sports Day Participation', description: 'Annual inter-house sports competition', event_date: daysAgo(-14), expiry_date: daysAgo(-7), is_active: true, signed: false },
];

const MOCK_PICKUP_LIST = [
  { id: 1, school_id: 1, student_id: 1, name: 'Jane Johnson', phone: '+2348000000101', relationship: 'Aunt', is_authorized: true },
  { id: 2, school_id: 1, student_id: 1, name: 'Mike Johnson', phone: '+2348000000102', relationship: 'Uncle', is_authorized: true },
];

const MOCK_CO_GUARDIANS = [
  { id: 1, school_id: 1, student_id: 1, guardian_user_id: null, relationship: 'Aunt', status: 'invited', invited_at: daysAgo(10) },
  { id: 2, school_id: 1, student_id: 9, guardian_user_id: null, relationship: 'Grandmother', status: 'active', invited_at: daysAgo(30) },
];

const MOCK_GOALS = [
  { id: 1, school_id: 1, student_id: 4, title: 'Improve Math Grade', description: 'Achieve B in Mathematics this term', target_date: daysAgo(-30), status: 'in_progress', progress_pct: 65 },
  { id: 2, school_id: 1, student_id: 4, title: 'Read 10 Books', description: 'Read 10 library books this term', target_date: daysAgo(-60), status: 'completed', progress_pct: 100 },
];

const MOCK_LIVE_CLASSES = [
  { id: 1, school_id: 1, teacher_id: 1, class_id: 1, subject_id: 1, title: 'Math Review Session', description: 'Live review before test', meeting_url: 'https://meet.google.com/abc-defg-hij', scheduled_at: daysAgo(-3), duration_minutes: 45, is_active: true },
  { id: 2, school_id: 1, teacher_id: 2, class_id: 1, subject_id: 2, title: 'English Literature Discussion', description: 'Discussing the novel', meeting_url: 'https://zoom.us/j/123456789', scheduled_at: daysAgo(-10), duration_minutes: 60, is_active: true },
];

const MOCK_REPORT_CARDS = [
  { id: 1, school_id: 1, student_id: 1, term_id: 2, academic_year_id: 2, is_published: true, published_at: daysAgo(5), 
    subjects: [
      { name: 'Mathematics', score: 78, grade: 'B', remarks: 'Good progress' },
      { name: 'English', score: 82, grade: 'B', remarks: 'Excellent writing skills' },
      { name: 'Physics', score: 71, grade: 'C', remarks: 'Needs more practice' },
      { name: 'Chemistry', score: 85, grade: 'B', remarks: 'Very good' },
      { name: 'Biology', score: 76, grade: 'B', remarks: 'Satisfactory' },
    ],
    total_score: 392, average: 78.4, position: '5th out of 28', 
    principal_comment: 'A very good term. Keep up the effort.', teacher_comment: 'Alice has shown great improvement.',
  },
  { id: 2, school_id: 1, student_id: 9, term_id: 2, academic_year_id: 2, is_published: true, published_at: daysAgo(5),
    subjects: [
      { name: 'Mathematics', score: 88, grade: 'B', remarks: 'Excellent' },
      { name: 'English', score: 79, grade: 'B', remarks: 'Good' },
      { name: 'Physics', score: 84, grade: 'B', remarks: 'Very good' },
      { name: 'Chemistry', score: 90, grade: 'A', remarks: 'Outstanding' },
      { name: 'Biology', score: 73, grade: 'C', remarks: 'Needs improvement' },
    ],
    total_score: 414, average: 82.8, position: '3rd out of 30',
    principal_comment: 'Well done!', teacher_comment: 'Bob is a dedicated student.',
  },
];

const MOCK_WHISTLEBLOWER_CATEGORIES = [
  { id: 1, school_id: 1, name: 'Bullying', description: 'Report bullying incidents', is_active: true },
  { id: 2, school_id: 1, name: 'Academic Misconduct', description: 'Cheating or grade manipulation', is_active: true },
  { id: 3, school_id: 1, name: 'Staff Misconduct', description: 'Inappropriate staff behavior', is_active: true },
];

const MOCK_ALL_SCHOOLS = [
  { id: 1, name: 'Demo International School', email: 'info@demo.school', phone: '+2348000000100', address: '123 Education Avenue', city: 'Lagos', country: 'Nigeria', institution_type: 'secondary', is_approved: true, is_active: true, created_at: daysAgo(365) },
  { id: 2, name: 'Sunrise Academy', email: 'info@sunrise.edu', phone: '+2348000000200', address: '456 Learning Road', city: 'Abuja', country: 'Nigeria', institution_type: 'primary', is_approved: true, is_active: true, created_at: daysAgo(300) },
  { id: 3, name: 'Excel International College', email: 'info@excelcollege.edu', phone: '+2348000000300', address: '789 Knowledge Drive', city: 'Port Harcourt', country: 'Nigeria', institution_type: 'secondary', is_approved: false, is_active: false, created_at: daysAgo(30) },
  { id: 4, name: 'Bright Future School', email: 'info@brightfuture.edu', phone: '+2348000000400', address: '321 Wisdom Street', city: 'Ibadan', country: 'Nigeria', institution_type: 'mixed', is_approved: true, is_active: true, created_at: daysAgo(200) },
  { id: 5, name: 'Heritage Grammar School', email: 'info@heritagegrammar.edu', phone: '+2348000000500', address: '555 Tradition Avenue', city: 'Kano', country: 'Nigeria', institution_type: 'secondary', is_approved: false, is_active: false, created_at: daysAgo(15) },
];

const MOCK_SYSTEM_HEALTH = {
  status: 'healthy', uptime: '14d 6h 32m', cpu_usage: 34.2, memory_usage: 58.7, disk_usage: 42.1,
  active_schools: 4, total_users: 1250, active_sessions: 38, database_size: '2.4 GB',
  last_backup: daysAgo(1), services: [
    { name: 'Database', status: 'healthy', latency: '12ms' },
    { name: 'Email Service', status: 'healthy', latency: '145ms' },
    { name: 'File Storage', status: 'healthy', latency: '8ms' },
    { name: 'AI Service', status: 'degraded', latency: '1200ms' },
  ],
};

const MOCK_SECURITY_LOGS = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1, type: i % 5 === 0 ? 'login_success' : i % 5 === 1 ? 'login_failure' : i % 5 === 2 ? 'school_approved' : 'impersonation', severity: i % 4 === 0 ? 'high' : 'medium', actor: `user${(i % 10) + 1}`, ip: `192.168.1.${(i % 255) + 1}`, action: ['Login success', 'Failed login attempt', 'School approved', 'Grade modified', 'Password changed'][i % 5], ts: daysAgo(i),
}));

const MOCK_FORENSIC_EVENTS = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1, event_type: ['grade_anomaly', 'bulk_access', 'login_anomaly', 'permission_escalation'][i % 4], event_label: `Event #${i + 1}`, description: `Suspicious ${['grade change', 'data access', 'login pattern', 'permission change'][i % 4]} detected`, actor: `user${(i % 5) + 1}`, ip: `10.0.0.${i + 1}`, severity: i % 3 === 0 ? 'high' : 'medium', resolved: i % 2 === 0, ts: daysAgo(i * 3),
}));

const MOCK_SYLLABUS_TOPICS = [
  { id: 1, school_id: 1, class_id: 1, subject_id: 1, term_id: 2, title: 'Algebraic Expressions', group_name: 'Algebra', priority: 1, duration_weeks: 3, week_number: 1, status: 'completed', date_covered: daysAgo(40) },
  { id: 2, school_id: 1, class_id: 1, subject_id: 1, term_id: 2, title: 'Linear Equations', group_name: 'Algebra', priority: 2, duration_weeks: 2, week_number: 4, status: 'completed', date_covered: daysAgo(20) },
  { id: 3, school_id: 1, class_id: 1, subject_id: 1, term_id: 2, title: 'Quadratic Equations', group_name: 'Algebra', priority: 3, duration_weeks: 3, week_number: 6, status: 'in_progress', date_covered: null },
  { id: 4, school_id: 1, class_id: 1, subject_id: 1, term_id: 2, title: 'Statistics', group_name: 'Data Handling', priority: 4, duration_weeks: 2, week_number: 9, status: 'pending', date_covered: null },
  { id: 5, school_id: 1, class_id: 1, subject_id: 1, term_id: 2, title: 'Probability', group_name: 'Data Handling', priority: 5, duration_weeks: 2, week_number: 11, status: 'pending', date_covered: null },
];

const MOCK_GRADING_SCHEME = {
  id: 1, school_id: 1, pass_mark: 40,
  boundaries: [
    { min: 90, max: 100, grade: 'A', remark: 'Excellent' },
    { min: 75, max: 89, grade: 'B', remark: 'Very Good' },
    { min: 60, max: 74, grade: 'C', remark: 'Good' },
    { min: 50, max: 59, grade: 'D', remark: 'Fair' },
    { min: 40, max: 49, grade: 'E', remark: 'Pass' },
    { min: 0, max: 39, grade: 'F', remark: 'Fail' },
  ],
};

const MOCK_EXAM_DUTIES = [
  { id: 1, exam_name: 'Mid-Term Test - Mathematics', date: daysAgo(15), time: '08:00 - 10:00', venue: 'Hall A', class_name: 'JSS 1A' },
  { id: 2, exam_name: 'Mid-Term Test - English', date: daysAgo(14), time: '10:00 - 12:00', venue: 'Hall B', class_name: 'JSS 1B' },
];

const MOCK_MODIFICATION_REQUESTS = [
  { id: 1, school_id: 1, student_id: 1, subject_id: 1, grade_id: 1, requested_by: 1, request_type: 'correction', reason: 'Calculation error in final score', current_value: '68', requested_value: '72', status: 'pending' },
  { id: 2, school_id: 1, student_id: 3, subject_id: 2, grade_id: 16, requested_by: 1, request_type: 'appeal', reason: 'Student deserves re-evaluation', current_value: '55', requested_value: '62', status: 'approved' },
];

export {
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
};
