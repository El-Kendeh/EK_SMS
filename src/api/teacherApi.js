import SECURITY_CONFIG from '../config/security';

const API_BASE = SECURITY_CONFIG.API_URL;

function authHeaders() {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function authHeadersNoContent() {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
}

export const teacherApi = {
  async getTeacherProfile() {
    const res = await fetch(`${API_BASE}/api/teacher/me/`, { headers: authHeaders() });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.message || `Server responded with ${res.status}`);
    }
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

  async submitGradesForLocking(gradesArray, subjectId, termId, classId) {
    const student_ids = gradesArray.map(g => g.studentId).filter(Boolean);
    // Send the actual scores. Previously only student_ids were sent, so the backend
    // parsed NaN and locked nothing while the UI claimed success (audit #15).
    const grades = gradesArray.map(g => ({
      studentId: g.studentId,
      score: g.score,
      total: g.score,
      remarks: g.remarks,
      grade_letter: g.gradeLetter,
    }));
    const res = await fetch(`${API_BASE}/api/teacher/grades/lock/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ student_ids, subject_id: subjectId, term_id: termId, class_id: classId, grades }),
    });
    return res.json();
  },

  // Lock every remaining draft grade for a class this term (Grade Completion bulk action).
  async lockClassDrafts(classId, termId, subjectId) {
    const res = await fetch(`${API_BASE}/api/teacher/grades/lock/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ lock_all: true, class_id: classId, term_id: termId, subject_id: subjectId }),
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
    const res = await fetch(`${API_BASE}/api/teacher/grading-scheme/`, { headers: authHeaders() });
    if (!res.ok) return null;
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
    const res = await fetch(`${API_BASE}/api/teacher/modification-requests/${requestId}/withdraw/`, {
      method: 'POST',
      headers: authHeaders(),
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
    // Reads the teacher's own slots from the persisted school timetable.
    // The hook expects { periods: [...] }; backend returns { timetable: { periods } }.
    const res = await fetch(`${API_BASE}/api/teacher/timetable/`, { headers: authHeaders() });
    const data = await res.json().catch(() => null);
    return data?.timetable || { periods: [] };
  },

  async getClassAttendance(classId, date) {
    // Recorded register for pre-fill (audit #50). Returns { records: [{student_id, status, date}] }.
    const qs = new URLSearchParams({ class_id: classId, ...(date ? { date } : {}) }).toString();
    const res = await fetch(`${API_BASE}/api/teacher/attendance/?${qs}`, { headers: authHeaders() });
    if (!res.ok) return { records: [] };
    return res.json();
  },

  async getNotifications() {
    // Call the real teacher endpoint (was a hardcoded empty stub — audit #55) and map
    // the backend's snake_case fields to the camelCase the UI reads (audit #68).
    try {
      const res = await fetch(`${API_BASE}/api/teacher/notifications/`, { headers: authHeaders() });
      if (!res.ok) return { success: true, notifications: [] };
      const data = await res.json();
      const SECURITY_TYPES = ['security', 'forensic', 'modification_attempt', 'tamper', 'alert', 'warning'];
      const notifications = (data.notifications || []).map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: !!n.is_read,
        is_read: !!n.is_read,
        createdAt: n.created_at,
        created_at: n.created_at,
        isSecurityAlert: SECURITY_TYPES.includes(String(n.type || '').toLowerCase()),
      }));
      return { success: true, notifications, unread: data.unread };
    } catch {
      return { success: true, notifications: [] };
    }
  },

  async markNotificationRead() {
    // Notifications are school-wide (no per-user read model yet), so mark-read is kept
    // client-side/optimistic — a server write would mark it read for the whole school,
    // and the old /api/school/ route 403s for teachers.
    return { success: true };
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
    // The teacher route exists at /api/teacher/academic-calendar/ — the old
    // /api/school/ path had no route and 404'd, leaving the strip always empty (audit #12).
    try {
      const res = await fetch('/api/teacher/academic-calendar/', { headers: authHeaders() });
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
      headers: { Authorization: `Bearer ${token}` },
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
  // Teacher dashboard endpoints — all connected to real backend
  // ─────────────────────────────────────────────────────────────────────

  // ── Public verification round-trip ──────────────────────────────────
  async verifyHash(hash) {
    const res = await fetch(`${API_BASE}/api/verify/${encodeURIComponent(hash)}/`);
    return res.json();
  },

  // ── Tamper counter (per class or for this teacher overall) ─────────
  async getTamperCount(classId) {
    const q = classId ? `?class_id=${classId}` : '';
    const res = await fetch(`${API_BASE}/api/teacher/tamper-count/${q}`, { headers: authHeaders() });
    return res.json();
  },

  // ── Where I've Been (teacher's own access log) ─────────────────────
  async getWhereIveBeen() {
    // Component does setEntries(result) then entries.map — return the bare array (audit #89).
    const res = await fetch(`${API_BASE}/api/teacher/access-log/`, { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    return data.access_log || [];
  },

  // ── Channel preferences ─────────────────────────────────────────────
  async getChannelPreferences() {
    // Flatten the backend's { preferences: { inApp:{enabled}, ... } } into the 5 plain
    // booleans the simplified UI uses (audit #88).
    const res = await fetch(`${API_BASE}/api/teacher/channel-preferences/`, { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    const p = data.preferences || {};
    return {
      in_app: p.inApp?.enabled ?? true,
      push: p.push?.enabled ?? true,
      email: p.email?.enabled ?? true,
      sms: p.sms?.enabled ?? false,
      whatsapp: p.whatsapp?.enabled ?? false,
    };
  },
  async updateChannelPreferences(prefs) {
    const res = await fetch(`${API_BASE}/api/teacher/channel-preferences/`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify(prefs),
    });
    return res.json();
  },

  // ── Whistleblower (anonymous safe report) ──────────────────────────
  async getWhistleblowerCategories() {
    // Authenticated so the backend resolves + returns school_id, which we capture and use
    // for the ANONYMOUS submit below (audit #86). Categories themselves aren't sensitive.
    const res = await fetch(`${API_BASE}/api/whistleblower/categories/`, { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    const categories = (data.categories || []).map(c => ({ id: c.id, label: c.name || c.label || 'Report' }));
    return { categories, schoolId: data.school_id || null };
  },
  async submitWhistleblowerReport({ categoryId, title, description, severity, schoolId }) {
    // ANONYMOUS: deliberately send NO Authorization header so the request carries no
    // identity, and the stored report has no actor (audit #85). school_id only routes it.
    const res = await fetch(`${API_BASE}/api/whistleblower/submit/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category_id: categoryId || null,
        title,
        description,
        severity: severity || 'medium',
        school_id: schoolId,
        reporter_type: 'anonymous',
      }),
    });
    const data = await res.json().catch(() => ({}));
    return {
      ...data,
      followUpKey: data.follow_up_key,
      note: data.success ? 'Your report was received by the compliance office.' : (data.message || 'Could not submit the report.'),
    };
  },
  async checkWhistleblowerStatus(key) {
    const res = await fetch(`${API_BASE}/api/whistleblower/${encodeURIComponent(key)}/`);
    const data = await res.json().catch(() => ({}));
    return { ...data, ticketId: data.ticketId || data.id, updates: data.updates || [] };
  },

  // ── Teacher-published office hours (slot-management side) ──────────
  async getMyOfficeHourSlots() {
    // Return the bare array — the component does slots.reduce() and crashed on the
    // {success, slots} wrapper before (audit #61).
    const res = await fetch(`${API_BASE}/api/teacher/office-hours/`, { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    return data.slots || [];
  },
  async publishOfficeHourSlot({ start, durationMin, room, subject, audience }) {
    const res = await fetch(`${API_BASE}/api/teacher/office-hours/`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ start, duration_min: durationMin, room, subject, audience }),
    });
    return res.json();
  },
  async deleteOfficeHourSlot(slotId) {
    const res = await fetch(`${API_BASE}/api/teacher/office-hours/${slotId}/`, {
      method: 'DELETE', headers: authHeadersNoContent(),
    });
    return res.json();
  },

  // ── Teacher ↔ Parent threads ───────────────────────────────────────
  async getParentThreads() {
    const res = await fetch(`${API_BASE}/api/teacher/parent-threads/`, { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    return data.threads || [];
  },
  async sendParentMessage(childId, text) {
    const res = await fetch(`${API_BASE}/api/teacher/parent-threads/${childId}/`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ text }),
    });
    return res.json();
  },

  // ── Teacher ↔ Student two-way threads (upgrade of FeedbackScreen) ──
  async getStudentThreads() {
    const res = await fetch(`${API_BASE}/api/teacher/student-threads/`, { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    return data.threads || [];
  },
  async sendStudentMessage(studentId, text) {
    const res = await fetch(`${API_BASE}/api/teacher/student-threads/${studentId}/`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ text }),
    });
    return res.json();
  },

  // ── Behaviour incidents ────────────────────────────────────────────
  async getBehaviourIncidents(studentId) {
    const q = studentId ? `?student_id=${studentId}` : '';
    const res = await fetch(`${API_BASE}/api/teacher/behaviour-incidents/${q}`, { headers: authHeaders() });
    return res.json();
  },
  async fileBehaviourIncident({ studentId, type, severity, title, notes, evidenceFiles }) {
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
    const res = await fetch(`${API_BASE}/api/teacher/substitute-token/`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ class_id: classId, hours, scope }),
    });
    return res.json();
  },
  async revokeSubstituteToken(token) {
    const res = await fetch(`${API_BASE}/api/teacher/substitute-token/${encodeURIComponent(token)}/`, {
      method: 'DELETE', headers: authHeadersNoContent(),
    });
    return res.json();
  },
  async listSubstituteTokens() {
    const res = await fetch(`${API_BASE}/api/teacher/substitute-token/`, { headers: authHeaders() });
    return res.json();
  },

  // ── Lesson plans ────────────────────────────────────────────────────
  async getLessonPlans({ classId } = {}) {
    // Component does setPlans(result) then plans.map — return the bare array (audit #73).
    const q = classId ? `?class_id=${classId}` : '';
    const res = await fetch(`${API_BASE}/api/teacher/lesson-plans/${q}`, { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    return Array.isArray(data) ? data : (data.lesson_plans || []);
  },
  async upsertLessonPlan(plan) {
    const method = plan.id ? 'PUT' : 'POST';
    const path = plan.id ? `/api/teacher/lesson-plans/${plan.id}/` : `/api/teacher/lesson-plans/`;
    const res = await fetch(`${API_BASE}${path}`, { method, headers: authHeaders(), body: JSON.stringify(plan) });
    return res.json();
  },

  // ── Bulk feedback templates ────────────────────────────────────────
  async getFeedbackTemplates() {
    // Component does templates.slice() — return the bare array, not the wrapper (audit #65).
    const res = await fetch(`${API_BASE}/api/teacher/feedback-templates/`, { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    return Array.isArray(data) ? data : (data.templates || []);
  },
  async addFeedbackTemplate({ label, text }) {
    const res = await fetch(`${API_BASE}/api/teacher/feedback-templates/`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ label, text }),
    });
    return res.json();
  },

  // ── Resource recommendation (push a resource to a specific recipient) ─
  async recommendResource({ resourceId, recipient }) {
    const res = await fetch(`${API_BASE}/api/teacher/recommend-resource/`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ resource_id: resourceId, recipient }),
    });
    return res.json();
  },

  // ── Counsellor referral ────────────────────────────────────────────
  async referToCounsellor({ studentId, reason, notifyParent }) {
    const res = await fetch(`${API_BASE}/api/teacher/counsellor-referral/`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ student_id: studentId, reason, notify_parent: !!notifyParent }),
    });
    return res.json();
  },

  // ── Workload calendar ──────────────────────────────────────────────
  async getWorkload() {
    const res = await fetch(`${API_BASE}/api/teacher/workload/`, { headers: authHeaders() });
    return res.json();
  },

  // ── Personal performance dashboard ─────────────────────────────────
  async getPersonalPerformance() {
    const res = await fetch(`${API_BASE}/api/teacher/performance/`, { headers: authHeaders() });
    return res.json();
  },

  // ── Peer review ────────────────────────────────────────────────────
  async getPeerReviews() {
    const res = await fetch(`${API_BASE}/api/teacher/peer-reviews/`, { headers: authHeaders() });
    return res.json();
  },
  async submitPeerReview({ revieweeId, subject, score, comment, anonymous }) {
    // Send reviewee_id (from the colleague picker) — the backend needs an id, not a name
    // (audit #74). subject maps to category, score to rating.
    const res = await fetch(`${API_BASE}/api/teacher/peer-reviews/`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ reviewee_id: revieweeId, category: subject || 'general', rating: score, comment, anonymous: !!anonymous }),
    });
    return res.json();
  },

  async getColleagues() {
    const res = await fetch(`${API_BASE}/api/teacher/colleagues/`, { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    return data.colleagues || [];
  },

  // ── Spotlight student ──────────────────────────────────────────────
  async getSpotlightStudent() {
    const res = await fetch(`${API_BASE}/api/teacher/spotlight/`, { headers: authHeaders() });
    return res.json();
  },
  async setSpotlightStudent({ studentId, reason }) {
    const res = await fetch(`${API_BASE}/api/teacher/spotlight/`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ student_id: studentId, reason }),
    });
    return res.json();
  },

  // ── Cohort comparison ──────────────────────────────────────────────
  async getCohortCompare() {
    const res = await fetch(`${API_BASE}/api/teacher/cohort-compare/`, { headers: authHeaders() });
    return res.json();
  },

  // ── Voice digest ───────────────────────────────────────────────────
  async getVoiceDigest() {
    const res = await fetch(`${API_BASE}/api/teacher/voice-digest/`, { headers: authHeaders() });
    return res.json();
  },

  // ── Grade batch receipt (cryptographic; downloadable PDF) ───────────
  async getGradeReceipt(receiptId) {
    const res = await fetch(`${API_BASE}/api/teacher/grade-receipts/${receiptId}/`, { headers: authHeaders() });
    return res.json();
  },
  async listGradeReceipts() {
    const res = await fetch(`${API_BASE}/api/teacher/grade-receipts/`, { headers: authHeaders() });
    return res.json();
  },

  // Wrapped variant of submitGradesForLocking that also produces a receipt
  async submitGradesAndReceipt(gradesArray, subjectId, termId, classId) {
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
