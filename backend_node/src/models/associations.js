/**
 * Central Sequelize Model Associations
 * All cross-model relationships defined in one place.
 * Import this file AFTER all models have been required.
 */

const School = require('./School');
const User = require('./User');
const Role = require('./Role');
const SchoolAdmin = require('./SchoolAdmin');
const Teacher = require('./Teacher');
const Student = require('./Student');
const Class = require('./Class');
const Subject = require('./Subject');
const ClassSubject = require('./ClassSubject');
const ClassAssistantTeacher = require('./ClassAssistantTeacher');
const AcademicYear = require('./AcademicYear');
const Term = require('./Term');
const Grade = require('./Grade');
const Attendance = require('./Attendance');
const GradingScheme = require('./GradingScheme');
const Room = require('./Room');
const Exam = require('./Exam');
const Notification = require('./Notification');
const SyllabusTopic = require('./SyllabusTopic');
const SecurityAuditLog = require('./SecurityAuditLog');
const ForensicEvent = require('./ForensicEvent');
const FeeCategory = require('./FeeCategory');
const Fee = require('./Fee');
const Payment = require('./Payment');
const Expense = require('./Expense');

// New models
const Message = require('./Message');
const Assignment = require('./Assignment');
const AssignmentSubmission = require('./AssignmentSubmission');
const LearningResource = require('./LearningResource');
const OfficeHour = require('./OfficeHour');
const OfficeHourBooking = require('./OfficeHourBooking');
const BehaviourIncident = require('./BehaviourIncident');
const LessonPlan = require('./LessonPlan');
const Goal = require('./Goal');
const StudyGroup = require('./StudyGroup');
const StudyGroupMember = require('./StudyGroupMember');
const ConferenceSlot = require('./ConferenceSlot');
const PickupPerson = require('./PickupPerson');
const PermissionSlip = require('./PermissionSlip');
const PermissionSlipSignature = require('./PermissionSlipSignature');
const Document = require('./Document');
const TranscriptRequest = require('./TranscriptRequest');
const StudyPlan = require('./StudyPlan');
const ResourceVisit = require('./ResourceVisit');
const DonationCampaign = require('./DonationCampaign');
const Donation = require('./Donation');
const Acknowledgment = require('./Acknowledgment');
const CoGuardian = require('./CoGuardian');
const ChannelPreference = require('./ChannelPreference');
const ModificationRequest = require('./ModificationRequest');
const WhistleblowerReport = require('./WhistleblowerReport');
const WhistleblowerCategory = require('./WhistleblowerCategory');
const LiveClass = require('./LiveClass');
const PeerReview = require('./PeerReview');
const SpotlightStudent = require('./SpotlightStudent');

// ============================================
// School associations
// ============================================
School.hasMany(AcademicYear, { foreignKey: 'school_id', as: 'academicYears' });
School.hasMany(Term, { foreignKey: 'school_id', as: 'terms' });
School.hasMany(Class, { foreignKey: 'school_id', as: 'classes' });
School.hasMany(Subject, { foreignKey: 'school_id', as: 'subjects' });
School.hasMany(Student, { foreignKey: 'school_id', as: 'students' });
School.hasMany(Teacher, { foreignKey: 'school_id', as: 'teachers' });
School.hasMany(FeeCategory, { foreignKey: 'school_id', as: 'feeCategories' });
School.hasMany(Fee, { foreignKey: 'school_id', as: 'fees' });
School.hasMany(Payment, { foreignKey: 'school_id', as: 'payments' });
School.hasMany(Expense, { foreignKey: 'school_id', as: 'expenses' });
School.hasMany(GradingScheme, { foreignKey: 'school_id', as: 'gradingSchemes' });
School.hasMany(Room, { foreignKey: 'school_id', as: 'rooms' });
School.hasMany(Notification, { foreignKey: 'school_id', as: 'notifications' });
School.hasMany(Exam, { foreignKey: 'school_id', as: 'exams' });
School.hasMany(SyllabusTopic, { foreignKey: 'school_id', as: 'syllabusTopics' });
School.hasMany(Attendance, { foreignKey: 'school_id', as: 'attendances' });
School.hasMany(Grade, { foreignKey: 'school_id', as: 'grades' });

AcademicYear.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
Term.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
Class.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
Subject.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
Student.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
Teacher.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
FeeCategory.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
Fee.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
Payment.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
Expense.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
GradingScheme.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
Room.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
Notification.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
Exam.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
SyllabusTopic.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
Attendance.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
Grade.belongsTo(School, { foreignKey: 'school_id', as: 'school' });

// ============================================
// AcademicYear associations
// ============================================
AcademicYear.hasMany(Term, { foreignKey: 'academic_year_id', as: 'terms' });
AcademicYear.hasMany(Class, { foreignKey: 'academic_year_id', as: 'classes' });
AcademicYear.hasMany(Student, { foreignKey: 'academic_year_id', as: 'students' });

Class.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });
Student.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });

// ============================================
// Term associations
// ============================================
Term.hasMany(Grade, { foreignKey: 'term_id', as: 'grades' });
Term.hasMany(Fee, { foreignKey: 'term_id', as: 'fees' });
Term.hasMany(Exam, { foreignKey: 'term_id', as: 'exams' });
Term.hasMany(SyllabusTopic, { foreignKey: 'term_id', as: 'syllabusTopics' });

Grade.belongsTo(Term, { foreignKey: 'term_id', as: 'term' });
Fee.belongsTo(Term, { foreignKey: 'term_id', as: 'term' });
Exam.belongsTo(Term, { foreignKey: 'term_id', as: 'term' });
SyllabusTopic.belongsTo(Term, { foreignKey: 'term_id', as: 'term' });

// ============================================
// Class associations
// ============================================
Class.hasMany(ClassSubject, { foreignKey: 'class_id', as: 'classSubjects' });
Class.hasMany(ClassAssistantTeacher, { foreignKey: 'class_id', as: 'assistantTeachers' });
Class.hasMany(Attendance, { foreignKey: 'classroom_id', as: 'attendances' });
Class.hasMany(Grade, { foreignKey: 'classroom_id', as: 'grades' });
Class.hasMany(Exam, { foreignKey: 'classroom_id', as: 'exams' });
Class.hasMany(SyllabusTopic, { foreignKey: 'class_id', as: 'syllabusTopics' });
Class.hasMany(Student, { foreignKey: 'classroom_id', as: 'students' });

ClassSubject.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
ClassAssistantTeacher.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
Attendance.belongsTo(Class, { foreignKey: 'classroom_id', as: 'classroom' });
Grade.belongsTo(Class, { foreignKey: 'classroom_id', as: 'classroom' });
Exam.belongsTo(Class, { foreignKey: 'classroom_id', as: 'classroom' });
SyllabusTopic.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
Student.belongsTo(Class, { foreignKey: 'classroom_id', as: 'classroom' });

// ============================================
// Teacher associations
// ============================================
Teacher.hasMany(Class, { foreignKey: 'class_teacher_id', as: 'taughtClasses' });
Teacher.hasMany(ClassSubject, { foreignKey: 'teacher_id', as: 'classSubjects' });
Teacher.hasMany(SyllabusTopic, { foreignKey: 'teacher_id', as: 'syllabusTopics' });

Class.belongsTo(Teacher, { foreignKey: 'class_teacher_id', as: 'classTeacher' });
ClassSubject.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });
SyllabusTopic.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });
ClassAssistantTeacher.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });

// ============================================
// Student associations
// ============================================
Student.hasMany(Attendance, { foreignKey: 'student_id', as: 'attendances' });
Student.hasMany(Grade, { foreignKey: 'student_id', as: 'grades' });
Student.hasMany(Fee, { foreignKey: 'student_id', as: 'fees' });
Student.hasMany(Payment, { foreignKey: 'student_id', as: 'payments' });

Attendance.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
Grade.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
Fee.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
Payment.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

// ============================================
// Subject associations
// ============================================
Subject.hasMany(Grade, { foreignKey: 'subject_id', as: 'grades' });
Subject.hasMany(Exam, { foreignKey: 'subject_id', as: 'exams' });
Subject.hasMany(SyllabusTopic, { foreignKey: 'subject_id', as: 'syllabusTopics' });
Subject.hasMany(ClassSubject, { foreignKey: 'subject_id', as: 'classSubjects' });

Grade.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
Exam.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
SyllabusTopic.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
ClassSubject.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });

// ============================================
// User associations
// ============================================
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
User.hasOne(Student, { foreignKey: 'user_id', as: 'studentProfile' });
User.hasOne(Teacher, { foreignKey: 'user_id', as: 'teacherProfile' });
User.hasOne(SchoolAdmin, { foreignKey: 'user_id', as: 'schoolAdminProfile' });

Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Student.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Teacher.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
SchoolAdmin.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ============================================
// Fee associations
// ============================================
FeeCategory.hasMany(Fee, { foreignKey: 'fee_category_id', as: 'fees' });
Fee.belongsTo(FeeCategory, { foreignKey: 'fee_category_id', as: 'feeCategory' });

Fee.hasMany(Payment, { foreignKey: 'fee_id', as: 'payments' });
Payment.belongsTo(Fee, { foreignKey: 'fee_id', as: 'fee' });

// ============================================
// Notification associations
// ============================================
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'targetUser' });

// ============================================
// Expense associations
// ============================================
Expense.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });

// ============================================
// New model associations
// ============================================

// Message
School.hasMany(Message, { foreignKey: 'school_id', as: 'messages' });
Message.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'recipient_id', as: 'recipient' });

// Assignment
School.hasMany(Assignment, { foreignKey: 'school_id', as: 'assignments' });
Assignment.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
Assignment.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
Assignment.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
Assignment.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });
Assignment.hasMany(AssignmentSubmission, { foreignKey: 'assignment_id', as: 'submissions' });

// AssignmentSubmission
AssignmentSubmission.belongsTo(Assignment, { foreignKey: 'assignment_id', as: 'assignment' });
AssignmentSubmission.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

// LearningResource
School.hasMany(LearningResource, { foreignKey: 'school_id', as: 'learningResources' });
LearningResource.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
LearningResource.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
LearningResource.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
LearningResource.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });

// ResourceVisit
ResourceVisit.belongsTo(LearningResource, { foreignKey: 'resource_id', as: 'resource' });
ResourceVisit.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

// OfficeHour
School.hasMany(OfficeHour, { foreignKey: 'school_id', as: 'officeHours' });
OfficeHour.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
OfficeHour.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });
OfficeHour.hasMany(OfficeHourBooking, { foreignKey: 'office_hour_id', as: 'bookings' });

// OfficeHourBooking
OfficeHourBooking.belongsTo(OfficeHour, { foreignKey: 'office_hour_id', as: 'officeHour' });
OfficeHourBooking.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
OfficeHourBooking.belongsTo(User, { foreignKey: 'parent_id', as: 'parent' });

// BehaviourIncident
School.hasMany(BehaviourIncident, { foreignKey: 'school_id', as: 'behaviourIncidents' });
BehaviourIncident.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
BehaviourIncident.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
BehaviourIncident.belongsTo(Teacher, { foreignKey: 'reported_by', as: 'reporter' });

// LessonPlan
School.hasMany(LessonPlan, { foreignKey: 'school_id', as: 'lessonPlans' });
LessonPlan.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
LessonPlan.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });
LessonPlan.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
LessonPlan.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });

// Goal
School.hasMany(Goal, { foreignKey: 'school_id', as: 'goals' });
Goal.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
Goal.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

// StudyGroup
School.hasMany(StudyGroup, { foreignKey: 'school_id', as: 'studyGroups' });
StudyGroup.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
StudyGroup.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
StudyGroup.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });
StudyGroup.hasMany(StudyGroupMember, { foreignKey: 'study_group_id', as: 'members' });

// StudyGroupMember
StudyGroupMember.belongsTo(StudyGroup, { foreignKey: 'study_group_id', as: 'studyGroup' });
StudyGroupMember.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

// ConferenceSlot
School.hasMany(ConferenceSlot, { foreignKey: 'school_id', as: 'conferenceSlots' });
ConferenceSlot.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
ConferenceSlot.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });
ConferenceSlot.belongsTo(User, { foreignKey: 'parent_id', as: 'parent' });

// PickupPerson
School.hasMany(PickupPerson, { foreignKey: 'school_id', as: 'pickupPersons' });
PickupPerson.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
PickupPerson.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

// PermissionSlip
School.hasMany(PermissionSlip, { foreignKey: 'school_id', as: 'permissionSlips' });
PermissionSlip.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
PermissionSlip.hasMany(PermissionSlipSignature, { foreignKey: 'slip_id', as: 'signatures' });

// PermissionSlipSignature
PermissionSlipSignature.belongsTo(PermissionSlip, { foreignKey: 'slip_id', as: 'slip' });
PermissionSlipSignature.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
PermissionSlipSignature.belongsTo(User, { foreignKey: 'parent_id', as: 'parent' });

// Document
School.hasMany(Document, { foreignKey: 'school_id', as: 'documents' });
Document.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
Document.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
Document.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

// TranscriptRequest
School.hasMany(TranscriptRequest, { foreignKey: 'school_id', as: 'transcriptRequests' });
TranscriptRequest.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
TranscriptRequest.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
TranscriptRequest.belongsTo(User, { foreignKey: 'requested_by', as: 'requester' });

// StudyPlan
School.hasMany(StudyPlan, { foreignKey: 'school_id', as: 'studyPlans' });
StudyPlan.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
StudyPlan.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

// DonationCampaign
School.hasMany(DonationCampaign, { foreignKey: 'school_id', as: 'donationCampaigns' });
DonationCampaign.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
DonationCampaign.hasMany(Donation, { foreignKey: 'campaign_id', as: 'donations' });

// Donation
Donation.belongsTo(DonationCampaign, { foreignKey: 'campaign_id', as: 'campaign' });
Donation.belongsTo(User, { foreignKey: 'donor_id', as: 'donor' });

// Acknowledgment
School.hasMany(Acknowledgment, { foreignKey: 'school_id', as: 'acknowledgments' });
Acknowledgment.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
Acknowledgment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// CoGuardian
School.hasMany(CoGuardian, { foreignKey: 'school_id', as: 'coGuardians' });
CoGuardian.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
CoGuardian.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
CoGuardian.belongsTo(User, { foreignKey: 'guardian_user_id', as: 'guardian' });

// ChannelPreference
ChannelPreference.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasOne(ChannelPreference, { foreignKey: 'user_id', as: 'channelPreference' });

// ModificationRequest
School.hasMany(ModificationRequest, { foreignKey: 'school_id', as: 'modificationRequests' });
ModificationRequest.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
ModificationRequest.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
ModificationRequest.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
ModificationRequest.belongsTo(Grade, { foreignKey: 'grade_id', as: 'grade' });
ModificationRequest.belongsTo(User, { foreignKey: 'requested_by', as: 'requester' });
ModificationRequest.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });

// WhistleblowerCategory
School.hasMany(WhistleblowerCategory, { foreignKey: 'school_id', as: 'whistleblowerCategories' });
WhistleblowerCategory.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
WhistleblowerCategory.hasMany(WhistleblowerReport, { foreignKey: 'category_id', as: 'reports' });

// WhistleblowerReport
WhistleblowerReport.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
WhistleblowerReport.belongsTo(WhistleblowerCategory, { foreignKey: 'category_id', as: 'category' });

// LiveClass
School.hasMany(LiveClass, { foreignKey: 'school_id', as: 'liveClasses' });
LiveClass.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
LiveClass.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });
LiveClass.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
LiveClass.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });

// PeerReview
School.hasMany(PeerReview, { foreignKey: 'school_id', as: 'peerReviews' });
PeerReview.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
PeerReview.belongsTo(Teacher, { foreignKey: 'reviewer_id', as: 'reviewer' });
PeerReview.belongsTo(Teacher, { foreignKey: 'reviewee_id', as: 'reviewee' });

// SpotlightStudent
School.hasMany(SpotlightStudent, { foreignKey: 'school_id', as: 'spotlightStudents' });
SpotlightStudent.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
SpotlightStudent.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });
SpotlightStudent.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

console.log('✅ All model associations loaded');
