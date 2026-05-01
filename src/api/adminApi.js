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
    return apiClient.request('/api/school/ai-capture/', {
      method: 'POST',
      body: fd,
    });
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
    return apiClient.request('/api/school/bulk-import/', {
      method: 'POST',
      body: fd,
    });
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
  async listGradeApprovals() {
    return apiClient.get('/api/principal/grade-approvals/');
  },
  async reviewGradeChange({ modId, action, comment }) {
    return apiClient.post('/api/principal/grade-approvals/', {
      mod_id: modId, action, comment,
    });
  },
  async listReportCards() {
    return apiClient.get('/api/principal/report-cards/');
  },
  async publishReportCard({ cardId, principalComment }) {
    return apiClient.post('/api/principal/report-cards/', {
      card_id: cardId, action: 'publish',
      principal_comment: principalComment || '',
    });
  },
  async commentReportCard({ cardId, principalComment }) {
    return apiClient.post('/api/principal/report-cards/', {
      card_id: cardId, principal_comment: principalComment,
    });
  },
};

export default adminApi;
