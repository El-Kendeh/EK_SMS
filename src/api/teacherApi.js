import { mockTeacherProfile, mockAssignedClasses, mockStudents, mockGradeHistory, mockTimetable, mockModificationRequests, mockTeacherNotifications, mockTerms, mockGradingScheme } from '../mock/teacherMockData';

const USE_MOCK = process.env.REACT_APP_USE_MOCK_DATA === 'true';
const delay = ms => new Promise(res => setTimeout(res, ms));

function authHeaders() {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', Authorization: `Token ${token}` };
}

function authHeadersNoContent() {
  const token = localStorage.getItem('token');
  return { Authorization: `Token ${token}` };
}

export const teacherApi = {
  async getTeacherProfile() {
    if (USE_MOCK) { await delay(500); return mockTeacherProfile; }
    const res = await fetch('/api/teacher/me/', { headers: authHeaders() });
    return res.json();
  },

  async getAssignedClasses() {
    if (USE_MOCK) { await delay(600); return mockAssignedClasses; }
    const res = await fetch('/api/teacher/classes/', { headers: authHeaders() });
    return res.json();
  },

  async getClassStudents(classId) {
    if (USE_MOCK) { await delay(700); return mockStudents[classId] || []; }
    const res = await fetch(`/api/teacher/students/?class_id=${classId}`, { headers: authHeaders() });
    return res.json();
  },

  async getClassGrades(classId) {
    if (USE_MOCK) {
      await delay(600);
      const students = mockStudents[classId] || [];
      return students.map(s => ({ studentId: s.id, studentName: s.fullName, studentNumber: s.studentNumber, initials: s.initials, avatarColor: s.avatarColor, ...s.currentGrade }));
    }
    const res = await fetch(`/api/teacher/gradebook/?class_id=${classId}`, { headers: authHeaders() });
    return res.json();
  },

  async saveGradeDraft(payload) {
    if (USE_MOCK) { await delay(400); return { success: true }; }
    const res = await fetch('/api/teacher/gradebook/', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async submitGradesForLocking(gradesArray, subjectId, termId) {
    if (USE_MOCK) { await delay(1200); return { success: true, locked: gradesArray.length }; }
    const student_ids = gradesArray.map(g => g.studentId).filter(Boolean);
    const res = await fetch('/api/teacher/grades/lock/', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ student_ids, subject_id: subjectId, term_id: termId }),
    });
    return res.json();
  },

  async lockSingleGrade(gradeId) {
    const res = await fetch('/api/teacher/grades/lock/', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ grade_id: gradeId }),
    });
    return res.json();
  },

  async getGradeHistory(gradeId) {
    if (USE_MOCK) { await delay(400); return mockGradeHistory[gradeId] || []; }
    const res = await fetch(`/api/teacher/grades/${gradeId}/history/`, { headers: authHeaders() });
    return res.json();
  },

  async getGradingScheme() {
    if (USE_MOCK) { await delay(300); return mockGradingScheme; }
    const res = await fetch('/api/school/grading-scheme/', { headers: authHeaders() });
    const data = await res.json();
    if (!data.success) return mockGradingScheme;
    return data.scheme;
  },

  async getModificationRequests() {
    if (USE_MOCK) { await delay(500); return { success: true, requests: mockModificationRequests }; }
    const res = await fetch('/api/teacher/modification-requests/', { headers: authHeaders() });
    return res.json();
  },

  async submitModificationRequest(payload) {
    if (USE_MOCK) { await delay(1000); return { success: true, requestId: 'mod-new' }; }
    if (payload.evidenceFile) {
      const fd = new FormData();
      fd.append('grade_id', payload.gradeId);
      fd.append('proposed_score', payload.proposedScore);
      fd.append('reason', payload.reason);
      fd.append('evidence_file', payload.evidenceFile);
      const res = await fetch('/api/teacher/modification-requests/', {
        method: 'POST',
        headers: authHeadersNoContent(),
        body: fd,
      });
      return res.json();
    }
    const res = await fetch('/api/teacher/modification-requests/', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ grade_id: payload.gradeId, proposed_score: payload.proposedScore, reason: payload.reason }),
    });
    return res.json();
  },

  async withdrawModificationRequest(requestId) {
    if (USE_MOCK) { await delay(400); return { success: true }; }
    const res = await fetch('/api/teacher/modification-requests/', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ action: 'withdraw', request_id: requestId }),
    });
    return res.json();
  },

  async getClassAnalytics(classId, subjectId) {
    if (USE_MOCK) { await delay(400); return { trend: [] }; }
    const params = new URLSearchParams();
    if (classId)   params.append('class_id', classId);
    if (subjectId) params.append('subject_id', subjectId);
    const res = await fetch(`/api/teacher/analytics/?${params}`, { headers: authHeaders() });
    return res.json();
  },

  async getTeacherTimetable() {
    if (USE_MOCK) { await delay(600); return mockTimetable; }
    const res = await fetch('/api/teacher/attendance/', { headers: authHeaders() });
    return res.json();
  },

  async getNotifications() {
    if (USE_MOCK) { await delay(400); return mockTeacherNotifications; }
    const res = await fetch('/api/school/notifications/', { headers: authHeaders() });
    return res.json();
  },

  async markNotificationRead(id) {
    if (USE_MOCK) { await delay(200); return { success: true }; }
    const res = await fetch(`/api/school/notifications/${id}/read/`, {
      method: 'POST',
      headers: authHeaders(),
    });
    return res.json();
  },

  async markAllNotificationsRead() {
    if (USE_MOCK) { await delay(300); return { success: true }; }
    return { success: true };
  },

  async getCurrentTerm() {
    if (USE_MOCK) { await delay(300); return mockTerms.find(t => t.isCurrent); }
    const res = await fetch('/api/school/terms/', { headers: authHeaders() });
    const data = await res.json();
    return (data.terms || []).find(t => t.status === 'active') || null;
  },

  async getAllTerms() {
    if (USE_MOCK) { await delay(300); return mockTerms; }
    const res = await fetch('/api/school/terms/', { headers: authHeaders() });
    const data = await res.json();
    return data.terms || [];
  },
};
