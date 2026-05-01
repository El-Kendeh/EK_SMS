import SECURITY_CONFIG from '../config/security';
import {
  mockTamperByClass,
  mockTeacherWhereIveBeen,
  mockTeacherChannelPreferences,
  mockTeacherWhistleblowerCategories,
  mockTeacherOfficeHourSlots,
  mockTeacherParentThreads,
  mockTeacherStudentThreads,
  mockBehaviourIncidents,
  mockSubstituteTokens,
  mockLessonPlans,
  mockBulkFeedbackTemplates,
  mockPeerReviews,
  mockPersonalPerformance,
  mockSpotlightStudent,
  mockResourceRecommendations,
  mockTeacherWorkload,
  mockGradeReceipts,
  mockCohortCompare,
  mockVoiceDigestText,
} from '../mock/teacherMockExtras';

const API_BASE = SECURITY_CONFIG.API_URL;
const USE_MOCK = process.env.REACT_APP_USE_MOCK_DATA === 'true';
const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));

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
    // This endpoint requires classroom_id parameter - return empty for now
    // The actual timetable data comes from getAssignedClasses
    return { success: true, timetable: [] };
  },

  async getNotifications() {
    // This endpoint is for school admins only - return empty for teachers
    // Teachers don't have access to school-wide notifications
    return { success: true, notifications: [] };
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

  // ─────────────────────────────────────────────────────────────────────
  // NEW endpoints — Phase 2+ (mock-fallback gated)
  // ─────────────────────────────────────────────────────────────────────

  // ── Public verification round-trip ──────────────────────────────────
  async verifyHash(hash) {
    if (USE_MOCK) {
      await delay();
      return {
        valid: true,
        signedBy: 'El-Kendeh Smart School',
        signedAt: new Date().toISOString(),
        chainPosition: 142,
        chainTip: 'b7c1...49ea',
      };
    }
    const res = await fetch(`${API_BASE}/api/verify/${encodeURIComponent(hash)}/`);
    return res.json();
  },

  // ── Tamper counter (per class or for this teacher overall) ─────────
  async getTamperCount(classId) {
    if (USE_MOCK) {
      await delay(200);
      if (classId) return mockTamperByClass[classId] || { total: 0, blocked: 0, successful: 0 };
      // overall
      return Object.values(mockTamperByClass).reduce(
        (acc, c) => ({ total: acc.total + c.total, blocked: acc.blocked + c.blocked, successful: acc.successful + c.successful }),
        { total: 0, blocked: 0, successful: 0 }
      );
    }
    const q = classId ? `?class_id=${classId}` : '';
    const res = await fetch(`${API_BASE}/api/teacher/tamper-count/${q}`, { headers: authHeaders() });
    return res.json();
  },

  // ── Where I've Been (teacher's own access log) ─────────────────────
  async getWhereIveBeen() {
    if (USE_MOCK) { await delay(); return mockTeacherWhereIveBeen; }
    const res = await fetch(`${API_BASE}/api/teacher/access-log/`, { headers: authHeaders() });
    return res.json();
  },

  // ── Channel preferences ─────────────────────────────────────────────
  async getChannelPreferences() {
    if (USE_MOCK) { await delay(200); return mockTeacherChannelPreferences; }
    const res = await fetch(`${API_BASE}/api/teacher/channel-preferences/`, { headers: authHeaders() });
    return res.json();
  },
  async updateChannelPreferences(prefs) {
    if (USE_MOCK) { await delay(); Object.assign(mockTeacherChannelPreferences, prefs); return { success: true }; }
    const res = await fetch(`${API_BASE}/api/teacher/channel-preferences/`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify(prefs),
    });
    return res.json();
  },

  // ── Whistleblower (anonymous safe report) ──────────────────────────
  async getWhistleblowerCategories() {
    if (USE_MOCK) { await delay(150); return mockTeacherWhistleblowerCategories; }
    const res = await fetch(`${API_BASE}/api/whistleblower/categories/`);
    return res.json();
  },
  async submitWhistleblowerReport({ category, message }) {
    if (USE_MOCK) {
      await delay(900);
      const id = `WB-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
      return { success: true, ticketId: id, followUpKey: id, note: 'Save this key to follow up anonymously.' };
    }
    const res = await fetch(`${API_BASE}/api/whistleblower/submit/`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ category, message }),
    });
    return res.json();
  },
  async checkWhistleblowerStatus(key) {
    if (USE_MOCK) {
      await delay(400);
      return { ticketId: key, status: 'received', updates: [{ at: new Date().toISOString(), text: 'Logged. Investigation pending.' }] };
    }
    const res = await fetch(`${API_BASE}/api/whistleblower/${encodeURIComponent(key)}/`);
    return res.json();
  },

  // ── Teacher-published office hours (slot-management side) ──────────
  async getMyOfficeHourSlots() {
    if (USE_MOCK) { await delay(); return mockTeacherOfficeHourSlots; }
    const res = await fetch(`${API_BASE}/api/teacher/office-hours/`, { headers: authHeaders() });
    return res.json();
  },
  async publishOfficeHourSlot({ start, durationMin, room, subject, audience }) {
    if (USE_MOCK) {
      await delay();
      const s = { id: `tho-${Date.now()}`, start, durationMin, room, subject, audience, booked: false, claimedBy: null };
      mockTeacherOfficeHourSlots.push(s);
      return s;
    }
    const res = await fetch(`${API_BASE}/api/teacher/office-hours/`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ start, duration_min: durationMin, room, subject, audience }),
    });
    return res.json();
  },
  async deleteOfficeHourSlot(slotId) {
    if (USE_MOCK) {
      await delay();
      const i = mockTeacherOfficeHourSlots.findIndex((s) => s.id === slotId);
      if (i >= 0) mockTeacherOfficeHourSlots.splice(i, 1);
      return { success: true };
    }
    const res = await fetch(`${API_BASE}/api/teacher/office-hours/${slotId}/`, {
      method: 'DELETE', headers: authHeadersNoContent(),
    });
    return res.json();
  },

  // ── Teacher ↔ Parent threads ───────────────────────────────────────
  async getParentThreads() {
    if (USE_MOCK) {
      await delay();
      return Object.entries(mockTeacherParentThreads).map(([childId, t]) => ({ childId, ...t }));
    }
    const res = await fetch(`${API_BASE}/api/teacher/parent-threads/`, { headers: authHeaders() });
    return res.json();
  },
  async sendParentMessage(childId, text) {
    if (USE_MOCK) {
      await delay();
      const t = mockTeacherParentThreads[childId];
      if (!t) throw new Error('Thread not found');
      const m = { id: `tm-${Date.now()}`, sender: 'teacher', text, sentAt: new Date().toISOString() };
      t.messages.push(m);
      return m;
    }
    const res = await fetch(`${API_BASE}/api/teacher/parent-threads/${childId}/`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ text }),
    });
    return res.json();
  },

  // ── Teacher ↔ Student two-way threads (upgrade of FeedbackScreen) ──
  async getStudentThreads() {
    if (USE_MOCK) {
      await delay();
      return Object.entries(mockTeacherStudentThreads).map(([studentId, t]) => ({ studentId, ...t }));
    }
    const res = await fetch(`${API_BASE}/api/teacher/student-threads/`, { headers: authHeaders() });
    return res.json();
  },
  async sendStudentMessage(studentId, text) {
    if (USE_MOCK) {
      await delay();
      const t = mockTeacherStudentThreads[studentId];
      if (!t) throw new Error('Thread not found');
      const m = { id: `sm-${Date.now()}`, sender: 'teacher', text, sentAt: new Date().toISOString() };
      t.messages.push(m);
      t.unread = 0;
      return m;
    }
    const res = await fetch(`${API_BASE}/api/teacher/student-threads/${studentId}/`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ text }),
    });
    return res.json();
  },

  // ── Behaviour incidents ────────────────────────────────────────────
  async getBehaviourIncidents(studentId) {
    if (USE_MOCK) {
      await delay();
      return studentId ? mockBehaviourIncidents.filter((i) => i.studentId === studentId) : mockBehaviourIncidents;
    }
    const q = studentId ? `?student_id=${studentId}` : '';
    const res = await fetch(`${API_BASE}/api/teacher/behaviour-incidents/${q}`, { headers: authHeaders() });
    return res.json();
  },
  async fileBehaviourIncident({ studentId, type, severity, title, notes, evidenceFiles }) {
    if (USE_MOCK) {
      await delay(700);
      const inc = { id: `bi-${Date.now()}`, studentId, type, severity, title, notes, reportedAt: new Date().toISOString(), evidenceUrls: (evidenceFiles || []).map((f) => f.name) };
      mockBehaviourIncidents.unshift(inc);
      return inc;
    }
    const fd = new FormData();
    fd.append('student_id', studentId);
    fd.append('type', type);
    fd.append('severity', severity);
    fd.append('title', title);
    fd.append('notes', notes);
    (evidenceFiles || []).forEach((f) => fd.append('evidence', f));
    const res = await fetch(`${API_BASE}/api/teacher/behaviour-incidents/`, {
      method: 'POST', headers: authHeadersNoContent(), body: fd,
    });
    return res.json();
  },

  // ── Substitute mode (delegated access) ─────────────────────────────
  async issueSubstituteToken({ classId, hours, scope }) {
    if (USE_MOCK) {
      await delay(600);
      const t = {
        token: `SUB-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        classId, scope, hours,
        expiresAt: new Date(Date.now() + hours * 3600_000).toISOString(),
      };
      mockSubstituteTokens.push(t);
      return t;
    }
    const res = await fetch(`${API_BASE}/api/teacher/substitute-token/`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ class_id: classId, hours, scope }),
    });
    return res.json();
  },
  async revokeSubstituteToken(token) {
    if (USE_MOCK) {
      await delay();
      const i = mockSubstituteTokens.findIndex((t) => t.token === token);
      if (i >= 0) mockSubstituteTokens.splice(i, 1);
      return { success: true };
    }
    const res = await fetch(`${API_BASE}/api/teacher/substitute-token/${encodeURIComponent(token)}/`, {
      method: 'DELETE', headers: authHeadersNoContent(),
    });
    return res.json();
  },
  async listSubstituteTokens() {
    if (USE_MOCK) { await delay(200); return mockSubstituteTokens; }
    const res = await fetch(`${API_BASE}/api/teacher/substitute-token/`, { headers: authHeaders() });
    return res.json();
  },

  // ── Lesson plans ────────────────────────────────────────────────────
  async getLessonPlans({ classId } = {}) {
    if (USE_MOCK) {
      await delay();
      return classId ? mockLessonPlans.filter((p) => p.classId === classId) : mockLessonPlans;
    }
    const q = classId ? `?class_id=${classId}` : '';
    const res = await fetch(`${API_BASE}/api/teacher/lesson-plans/${q}`, { headers: authHeaders() });
    return res.json();
  },
  async upsertLessonPlan(plan) {
    if (USE_MOCK) {
      await delay();
      const i = mockLessonPlans.findIndex((p) => p.id === plan.id);
      if (i >= 0) mockLessonPlans[i] = { ...mockLessonPlans[i], ...plan };
      else mockLessonPlans.push({ id: `lp-${Date.now()}`, ...plan });
      return { success: true };
    }
    const method = plan.id ? 'PUT' : 'POST';
    const path = plan.id ? `/api/teacher/lesson-plans/${plan.id}/` : `/api/teacher/lesson-plans/`;
    const res = await fetch(`${API_BASE}${path}`, { method, headers: authHeaders(), body: JSON.stringify(plan) });
    return res.json();
  },

  // ── Bulk feedback templates ────────────────────────────────────────
  async getFeedbackTemplates() {
    if (USE_MOCK) { await delay(150); return mockBulkFeedbackTemplates; }
    const res = await fetch(`${API_BASE}/api/teacher/feedback-templates/`, { headers: authHeaders() });
    return res.json();
  },
  async addFeedbackTemplate({ label, text }) {
    if (USE_MOCK) {
      await delay();
      const t = { id: `bf-${Date.now()}`, label, text };
      mockBulkFeedbackTemplates.push(t);
      return t;
    }
    const res = await fetch(`${API_BASE}/api/teacher/feedback-templates/`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ label, text }),
    });
    return res.json();
  },

  // ── Resource recommendation (push a resource to a specific recipient) ─
  async recommendResource({ resourceId, recipient }) {
    if (USE_MOCK) {
      await delay();
      const r = { id: `rr-${Date.now()}`, resourceId, recipient, sentAt: new Date().toISOString() };
      mockResourceRecommendations.push(r);
      return r;
    }
    const res = await fetch(`${API_BASE}/api/teacher/recommend-resource/`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ resource_id: resourceId, recipient }),
    });
    return res.json();
  },

  // ── Counsellor referral ────────────────────────────────────────────
  async referToCounsellor({ studentId, reason, notifyParent }) {
    if (USE_MOCK) {
      await delay(700);
      return { success: true, referralId: `REF-${Date.now().toString(36).toUpperCase()}` };
    }
    const res = await fetch(`${API_BASE}/api/teacher/counsellor-referral/`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ student_id: studentId, reason, notify_parent: !!notifyParent }),
    });
    return res.json();
  },

  // ── Workload calendar ──────────────────────────────────────────────
  async getWorkload() {
    if (USE_MOCK) { await delay(); return mockTeacherWorkload; }
    const res = await fetch(`${API_BASE}/api/teacher/workload/`, { headers: authHeaders() });
    return res.json();
  },

  // ── Personal performance dashboard ─────────────────────────────────
  async getPersonalPerformance() {
    if (USE_MOCK) { await delay(); return mockPersonalPerformance; }
    const res = await fetch(`${API_BASE}/api/teacher/performance/`, { headers: authHeaders() });
    return res.json();
  },

  // ── Peer review ────────────────────────────────────────────────────
  async getPeerReviews() {
    if (USE_MOCK) { await delay(); return mockPeerReviews; }
    const res = await fetch(`${API_BASE}/api/teacher/peer-reviews/`, { headers: authHeaders() });
    return res.json();
  },
  async submitPeerReview({ toTeacher, subject, score, comment, anonymous }) {
    if (USE_MOCK) {
      await delay(700);
      const r = { id: `pr-${Date.now()}`, toTeacher, subject, anonymous, score, comment, submittedAt: new Date().toISOString() };
      mockPeerReviews.givenByMe.push(r);
      return r;
    }
    const res = await fetch(`${API_BASE}/api/teacher/peer-reviews/`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ to_teacher: toTeacher, subject, score, comment, anonymous: !!anonymous }),
    });
    return res.json();
  },

  // ── Spotlight student ──────────────────────────────────────────────
  async getSpotlightStudent() {
    if (USE_MOCK) { await delay(200); return mockSpotlightStudent; }
    const res = await fetch(`${API_BASE}/api/teacher/spotlight/`, { headers: authHeaders() });
    return res.json();
  },
  async setSpotlightStudent({ studentId, reason }) {
    if (USE_MOCK) {
      await delay();
      mockSpotlightStudent.studentId = studentId;
      mockSpotlightStudent.reason = reason;
      mockSpotlightStudent.spotlightedAt = new Date().toISOString().slice(0, 10);
      return { success: true };
    }
    const res = await fetch(`${API_BASE}/api/teacher/spotlight/`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ student_id: studentId, reason }),
    });
    return res.json();
  },

  // ── Cohort comparison ──────────────────────────────────────────────
  async getCohortCompare() {
    if (USE_MOCK) { await delay(); return mockCohortCompare; }
    const res = await fetch(`${API_BASE}/api/teacher/cohort-compare/`, { headers: authHeaders() });
    return res.json();
  },

  // ── Voice digest ───────────────────────────────────────────────────
  async getVoiceDigest() {
    if (USE_MOCK) { await delay(200); return { text: mockVoiceDigestText }; }
    const res = await fetch(`${API_BASE}/api/teacher/voice-digest/`, { headers: authHeaders() });
    return res.json();
  },

  // ── Grade batch receipt (cryptographic; downloadable PDF) ───────────
  async getGradeReceipt(receiptId) {
    if (USE_MOCK) {
      await delay();
      return mockGradeReceipts.find((r) => r.id === receiptId) || null;
    }
    const res = await fetch(`${API_BASE}/api/teacher/grade-receipts/${receiptId}/`, { headers: authHeaders() });
    return res.json();
  },
  async listGradeReceipts() {
    if (USE_MOCK) { await delay(); return mockGradeReceipts; }
    const res = await fetch(`${API_BASE}/api/teacher/grade-receipts/`, { headers: authHeaders() });
    return res.json();
  },

  // Wrapped variant of submitGradesForLocking that also produces a receipt
  async submitGradesAndReceipt(gradesArray, subjectId, termId, classId) {
    if (USE_MOCK) {
      await delay(800);
      const receipt = {
        id: `RCP-${Date.now().toString(36).toUpperCase()}`,
        classId, subjectId, termId,
        count: gradesArray.length,
        submittedAt: new Date().toISOString(),
        verificationHash: Math.random().toString(16).slice(2, 18) + Math.random().toString(16).slice(2, 18),
        chainPosition: 142 + mockGradeReceipts.length + 1,
      };
      mockGradeReceipts.unshift(receipt);
      return { success: true, locked_count: gradesArray.length, receipt };
    }
    return this.submitGradesForLocking(gradesArray, subjectId, termId).then((r) => ({ ...r, receipt: r.receipt || null }));
  },

  // ── Extended credentials (degrees, certifications, years_experience) ──
  async getCredentials() {
    const res = await fetch(`${API_BASE}/api/teacher/credentials/`, { headers: authHeaders() });
    return res.json();
  },
  async updateCredentials(payload) {
    const res = await fetch(`${API_BASE}/api/teacher/credentials/`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify(payload),
    });
    return res.json();
  },

  // ── Live classes ──
  async listLiveClasses(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/api/live-classes/${qs ? `?${qs}` : ''}`,
                            { headers: authHeaders() });
    return res.json();
  },
  async createLiveClass(payload) {
    const res = await fetch(`${API_BASE}/api/live-classes/`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(payload),
    });
    return res.json();
  },
  async updateLiveClass(id, payload) {
    const res = await fetch(`${API_BASE}/api/live-classes/${id}/`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify(payload),
    });
    return res.json();
  },
  async deleteLiveClass(id) {
    const res = await fetch(`${API_BASE}/api/live-classes/${id}/`, {
      method: 'DELETE', headers: authHeaders(),
    });
    return res.json();
  },
};
