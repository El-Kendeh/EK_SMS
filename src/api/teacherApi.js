import SECURITY_CONFIG from '../config/security';

const API_BASE = SECURITY_CONFIG.API_URL;

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
    const res = await fetch(`${API_BASE}/api/teacher/me/`, { headers: authHeaders() });
    return res.json();
  },

  async getAssignedClasses() {
    const res = await fetch(`${API_BASE}/api/teacher/classes/`, { headers: authHeaders() });
    return res.json();
  },

  async getClassStudents(classId) {
    const res = await fetch(`${API_BASE}/api/teacher/students/?class_id=${classId}`, { headers: authHeaders() });
    return res.json();
  },

  async getClassGrades(classId) {
    const res = await fetch(`${API_BASE}/api/teacher/gradebook/?class_id=${classId}`, { headers: authHeaders() });
    return res.json();
  },

  async saveGradeDraft(payload) {
    const res = await fetch(`${API_BASE}/api/teacher/gradebook/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async submitGradesForLocking(gradesArray, subjectId, termId) {
    const student_ids = gradesArray.map(g => g.studentId).filter(Boolean);
    const res = await fetch(`${API_BASE}/api/teacher/grades/lock/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ student_ids, subject_id: subjectId, term_id: termId }),
    });
    return res.json();
  },

  async lockSingleGrade(gradeId) {
    const res = await fetch(`${API_BASE}/api/teacher/grades/lock/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ grade_id: gradeId }),
    });
    return res.json();
  },

  async getGradeHistory(gradeId) {
    const res = await fetch(`${API_BASE}/api/teacher/grades/${gradeId}/history/`, { headers: authHeaders() });
    return res.json();
  },

  async getGradingScheme() {
    const res = await fetch(`${API_BASE}/api/school/grading-scheme/`, { headers: authHeaders() });
    const data = await res.json();
    return data.success ? data.scheme : null;
  },

  async getModificationRequests() {
    const res = await fetch(`${API_BASE}/api/teacher/modification-requests/`, { headers: authHeaders() });
    return res.json();
  },

  async submitModificationRequest(payload) {
    if (payload.evidenceFile) {
      const fd = new FormData();
      fd.append('grade_id', payload.gradeId);
      fd.append('proposed_score', payload.proposedScore);
      fd.append('reason', payload.reason);
      fd.append('evidence_file', payload.evidenceFile);
      const res = await fetch(`${API_BASE}/api/teacher/modification-requests/`, {
        method: 'POST',
        headers: authHeadersNoContent(),
        body: fd,
      });
      return res.json();
    }
    const res = await fetch(`${API_BASE}/api/teacher/modification-requests/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ grade_id: payload.gradeId, proposed_score: payload.proposedScore, reason: payload.reason }),
    });
    return res.json();
  },

  async withdrawModificationRequest(requestId) {
    const res = await fetch(`${API_BASE}/api/teacher/modification-requests/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ action: 'withdraw', request_id: requestId }),
    });
    return res.json();
  },

  async getClassAnalytics(classId, subjectId) {
    const params = new URLSearchParams();
    if (classId)   params.append('class_id', classId);
    if (subjectId) params.append('subject_id', subjectId);
    const res = await fetch(`${API_BASE}/api/teacher/analytics/?${params}`, { headers: authHeaders() });
    return res.json();
  },

  async getTeacherTimetable() {
    const res = await fetch(`${API_BASE}/api/teacher/attendance/`, { headers: authHeaders() });
    return res.json();
  },

  async getNotifications() {
    const res = await fetch(`${API_BASE}/api/school/notifications/`, { headers: authHeaders() });
    return res.json();
  },

  async markNotificationRead(id) {
    const res = await fetch(`${API_BASE}/api/school/notifications/${id}/read/`, {
      method: 'POST',
      headers: authHeaders(),
    });
    return res.json();
  },

  async markAllNotificationsRead() {
    return { success: true };
  },

  async getCurrentTerm() {
    const res = await fetch(`${API_BASE}/api/school/terms/`, { headers: authHeaders() });
    const data = await res.json();
    return (data.terms || []).find(t => t.status === 'active') || null;
  },

  async getAllTerms() {
    const res = await fetch(`${API_BASE}/api/school/terms/`, { headers: authHeaders() });
    const data = await res.json();
    return data.terms || [];
  },
};
