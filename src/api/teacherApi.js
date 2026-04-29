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

  async getStudentActivity() {
    try {
      const res = await fetch('/api/teacher/student-activity/', { headers: authHeaders() });
      if (!res.ok) return { activities: [] };
      return res.json();
    } catch { return { activities: [] }; }
  },

  async getAssignments(classId) {
    try {
      const params = classId ? `?class_id=${classId}` : '';
      const res = await fetch(`/api/teacher/assignments/${params}`, { headers: authHeaders() });
      if (!res.ok) return { assignments: [] };
      return res.json();
    } catch { return { assignments: [] }; }
  },

  async createAssignment(payload) {
    const res = await fetch('/api/teacher/assignments/', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async deleteAssignment(id) {
    const res = await fetch(`/api/teacher/assignments/${id}/`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return res.ok ? { success: true } : { success: false };
  },

  // Exam results entry
  async getTeacherExams(classId) {
    try {
      const params = classId ? `?class_id=${classId}` : '';
      const res = await fetch(`/api/teacher/exam-list/${params}`, { headers: authHeaders() });
      if (!res.ok) return { exams: [] };
      return res.json();
    } catch { return { exams: [] }; }
  },

  async getExamResults(examId) {
    const res = await fetch(`/api/teacher/exams/${examId}/results/`, { headers: authHeaders() });
    return res.json();
  },

  async saveExamResults(examId, results) {
    const res = await fetch(`/api/teacher/exams/${examId}/results/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ results }),
    });
    return res.json();
  },

  // Announcements (replaces stub messages)
  async getAnnouncements() {
    try {
      const res = await fetch('/api/teacher/announcements/', { headers: authHeaders() });
      if (!res.ok) return { announcements: [] };
      return res.json();
    } catch { return { announcements: [] }; }
  },

  async sendAnnouncement(payload) {
    const res = await fetch('/api/teacher/announcements/', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // Attendance status (per-class today summary)
  async getAttendanceStatus() {
    try {
      const res = await fetch('/api/teacher/attendance/status/', { headers: authHeaders() });
      if (!res.ok) return { classes: [], at_risk: [] };
      return res.json();
    } catch { return { classes: [], at_risk: [] }; }
  },

  // Student academic history
  async getStudentGradeHistory(studentId) {
    try {
      const res = await fetch(`/api/teacher/students/${studentId}/grades/`, { headers: authHeaders() });
      if (!res.ok) return { history: [] };
      return res.json();
    } catch { return { history: [] }; }
  },

  // Student report cards
  async getStudentReportCards(studentId) {
    try {
      const res = await fetch(`/api/teacher/students/${studentId}/report-cards/`, { headers: authHeaders() });
      if (!res.ok) return { report_cards: [] };
      return res.json();
    } catch { return { report_cards: [] }; }
  },

  async getMessages(classId) {
    try {
      const params = classId ? `?class_id=${classId}` : '';
      const res = await fetch(`/api/teacher/messages/${params}`, { headers: authHeaders() });
      if (!res.ok) return { threads: [] };
      return res.json();
    } catch { return { threads: [] }; }
  },

  async sendMessage(payload) {
    const res = await fetch('/api/teacher/messages/', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async generateTimetable(constraints) {
    try {
      const res = await fetch('/api/teacher/timetable/generate/', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(constraints),
      });
      return res.json();
    } catch { return { success: false, error: 'Server unavailable' }; }
  },

  async getAcademicCalendar() {
    try {
      const res = await fetch('/api/school/academic-calendar/', { headers: authHeaders() });
      if (!res.ok) return { events: [] };
      return res.json();
    } catch { return { events: [] }; }
  },

  async getAtRiskStudents() {
    try {
      const res = await fetch('/api/teacher/at-risk-students/', { headers: authHeaders() });
      if (!res.ok) return { students: [] };
      return res.json();
    } catch { return { students: [] }; }
  },

  async getModificationSummary() {
    try {
      const res = await fetch('/api/teacher/modification-requests/summary/', { headers: authHeaders() });
      if (!res.ok) return { pending: 0, approved: 0, rejected: 0 };
      return res.json();
    } catch { return { pending: 0, approved: 0, rejected: 0 }; }
  },

  async getExamDuties() {
    try {
      const res = await fetch('/api/teacher/exam-duties/', { headers: authHeaders() });
      if (!res.ok) return { duties: [] };
      return res.json();
    } catch { return { duties: [] }; }
  },

  async getResources(classId, type) {
    try {
      const params = new URLSearchParams();
      if (classId) params.append('class_id', classId);
      if (type) params.append('type', type);
      const qs = params.toString();
      const res = await fetch(`/api/teacher/resources/${qs ? '?' + qs : ''}`, { headers: authHeaders() });
      if (!res.ok) return { resources: [] };
      return res.json();
    } catch { return { resources: [] }; }
  },

  async uploadResource(formData) {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/teacher/resources/', {
      method: 'POST',
      headers: { Authorization: `Token ${token}` },
      body: formData,
    });
    return res.json();
  },

  async deleteResource(id) {
    const res = await fetch(`/api/teacher/resources/${id}/`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return res.ok ? { success: true } : { success: false };
  },

  async getFeedbackStudents(classId) {
    try {
      const params = classId ? `?class_id=${classId}` : '';
      const res = await fetch(`/api/teacher/feedback/students/${params}`, { headers: authHeaders() });
      if (!res.ok) return { students: [] };
      return res.json();
    } catch { return { students: [] }; }
  },

  async getFeedbackMessages(studentId) {
    try {
      const res = await fetch(`/api/teacher/feedback/${studentId}/`, { headers: authHeaders() });
      if (!res.ok) return { messages: [] };
      return res.json();
    } catch { return { messages: [] }; }
  },

  async sendFeedback(studentId, message) {
    const res = await fetch(`/api/teacher/feedback/${studentId}/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ message }),
    });
    return res.json();
  },
};
