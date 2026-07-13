/**
 * School Admin / Principal API helpers.
 * Used by the resend-credentials button, bulk import, AI capture wizard,
 * and the Principal dashboard.
 */
import apiClient from './client';

export const adminApi = {
  // ── Credentials reset (school admin → any user in their school) ──
  async resendCredentials(userId) {
    return apiClient.post('/api/school/users/resend-credentials/', { user_id: userId });
  },

  // ── AI document capture ──
  async aiCaptureUpload({ file, documentType }) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('document_type', documentType || 'other');
    // request() resolves to the raw fetch Response; parse the JSON body so callers
    // get { success, capture_id, structured } instead of a Response object.
    const res = await apiClient.request('/api/school/ai-capture/', {
      method: 'POST',
      body: fd,
    });
    return res.json();
  },
  async aiCaptureList() {
    return apiClient.get('/api/school/ai-capture/list/');
  },

  // ── Bulk import (existing endpoint) ──
  async bulkImport({ kind, file, classroom_id }) {
    const fd = new FormData();
    fd.append('kind', kind);          // 'students' | 'teachers' | 'parents'
    fd.append('file', file);
    if (classroom_id) fd.append('classroom_id', classroom_id);
    const res = await apiClient.request('/api/school/bulk-import/', {
      method: 'POST',
      body: fd,
    });
    return res.json();
  },

  // ── Live classes (school admin scope) ──
  async listLiveClasses(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`/api/live-classes/${qs ? `?${qs}` : ''}`);
  },
};

export const principalApi = {
  async overview() {
    return apiClient.get('/api/principal/overview/');
  },
  async getDashboard() {
    return apiClient.get('/api/principal/dashboard/');
  },
  async getClassPerformance() {
    return apiClient.get('/api/principal/class-performance/');
  },
  async getTeacherInsights() {
    return apiClient.get('/api/principal/teacher-insights/');
  },
  async getFinanceSnapshot() {
    return apiClient.get('/api/principal/finance-snapshot/');
  },
  async getActivityFeed() {
    return apiClient.get('/api/principal/activity-feed/');
  },
  async getSyllabusProgress() {
    return apiClient.get('/api/principal/syllabus-progress/');
  },
  async getAttendanceReport(days) {
    return apiClient.get(`/api/principal/attendance-report/${days ? `?days=${days}` : ''}`);
  },

  async listGradeApprovals(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`/api/principal/grade-approvals/${qs ? `?${qs}` : ''}`);
  },
  async reviewGradeChange({ gradeIds, action, comment }) {
    return apiClient.post('/api/principal/grade-approvals/', {
      grade_ids: gradeIds, action, comment,
    });
  },

  async listReportCards() {
    return apiClient.get('/api/principal/report-cards/');
  },
  async publishReportCards({ studentIds, termId }) {
    return apiClient.post('/api/principal/report-cards/', {
      student_ids: studentIds, term_id: termId,
    });
  },
  async commentReportCard({ gradeId, comment }) {
    return apiClient.post('/api/principal/report-cards/comment/', {
      grade_id: gradeId, comment,
    });
  },

  async getPrincipalUsers() {
    return apiClient.get('/api/principal/principal-users/');
  },
  async createPrincipalUser(payload) {
    return apiClient.post('/api/principal/principal-users/', payload);
  },
  async updatePrincipalUser(id, payload) {
    return apiClient.put(`/api/principal/principal-users/${id}/`, payload);
  },

  // ── Batch-3 leadership features ──
  async getGradeAudit(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`/api/principal/grade-audit/${qs ? `?${qs}` : ''}`);
  },
  async getAcademicsAnalytics(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`/api/principal/academics-analytics/${qs ? `?${qs}` : ''}`);
  },
  async listAnnouncements() {
    return apiClient.get('/api/principal/announcements/');
  },
  async postAnnouncement({ title, message, audience }) {
    // audience: 'all' | 'teachers' | 'parents' | 'students' (plan 3.5 targeting)
    return apiClient.post('/api/principal/announcements/', { title, message, audience });
  },
  async getAtRisk() {
    return apiClient.get('/api/principal/at-risk/');
  },
  async getStudentProfile(studentId) {
    return apiClient.get(`/api/principal/students/${studentId}/`);
  },

  /* ── P1 oversight surfaces ── */
  async getDiscipline(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`/api/principal/discipline/${qs ? `?${qs}` : ''}`);
  },
  async getTimetable(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`/api/principal/timetable/${qs ? `?${qs}` : ''}`);
  },
  async getTeacherRoster() {
    return apiClient.get('/api/principal/teacher-roster/');
  },
};

export default adminApi;
