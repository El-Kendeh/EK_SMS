import apiClient from './client';

export const studentApi = {
  async getProfile() {
    return apiClient.get('/api/student/me/');
  },

  async getAccountInfo() {
    return apiClient.get('/api/student/me/');
  },

  async changePassword(currentPassword, newPassword) {
    return apiClient.post('/api/student/change-password/', { current_password: currentPassword, new_password: newPassword });
  },

  async getCurrentTerm() {
    return apiClient.get('/api/student/terms/current/');
  },

  async getAllTerms() {
    return apiClient.get('/api/student/terms/');
  },

  async getGradesSummary(termId) {
    return apiClient.get(`/api/student/grades/summary/?term_id=${termId}`);
  },

  async getGrades(termId) {
    return apiClient.get(`/api/student/grades/?term_id=${termId}`);
  },

  async getGradeHistory(gradeId) {
    return apiClient.get(`/api/student/grades/${gradeId}/history/`);
  },

  async getPeerReview(gradeId) {
    return apiClient.get(`/api/student/grades/${gradeId}/peer-review/`);
  },

  async getFeedbackThread(gradeId) {
    return apiClient.get(`/api/student/grades/${gradeId}/feedback/`);
  },

  async sendFeedbackMessage(gradeId, message) {
    return apiClient.post(`/api/student/grades/${gradeId}/feedback/`, { message });
  },

  async getRemedialPlan(gradeId) {
    return apiClient.get(`/api/student/grades/${gradeId}/remedial-plan/`);
  },

  async confirmRemedialSession(gradeId, sessionIndex) {
    return apiClient.post(`/api/student/grades/${gradeId}/remedial-plan/confirm/`, { sessionIndex });
  },

  async getSecurityReport(gradeId) {
    return apiClient.get(`/api/student/grades/${gradeId}/security-report/`);
  },

  async getTranscript() {
    return apiClient.get('/api/student/transcript/');
  },

  async downloadTranscript() {
    const response = await apiClient.request('/api/student/transcript/download/', { method: 'GET' });
    return response.text();
  },

  async getReportCards() {
    return apiClient.get('/api/student/report-cards/');
  },

  async downloadReportCard(id) {
    const response = await apiClient.request(`/api/report-cards/${id}/download/`, { method: 'GET' });
    return response.text();
  },

  async getNotifications(limit) {
    const query = limit ? `?limit=${limit}` : '';
    return apiClient.get(`/api/student/notifications/${query}`);
  },

  async markNotificationRead(id) {
    return apiClient.post('/api/student/notifications/', { notification_id: id });
  },

  async markAllNotificationsRead() {
    return apiClient.post('/api/student/notifications/', { mark_all: true });
  },

  async getSecurityHealth() {
    return apiClient.get('/api/student/security-health/');
  },

  async revokeDevice(deviceId) {
    return apiClient.delete(`/api/student/devices/${deviceId}/`);
  },

  async getParentalAccessLog() {
    return apiClient.get('/api/student/parental-access-log/');
  },

  async get2FASetup() {
    return apiClient.get('/api/student/2fa/setup/');
  },

  async enable2FA(otpCode) {
    return apiClient.post('/api/student/2fa/setup/', { action: 'enable', otp_code: otpCode });
  },

  async disable2FA() {
    return apiClient.post('/api/student/2fa/setup/', { action: 'disable' });
  },

  async getFinancials() {
    return apiClient.get('/api/student/financials/');
  },

  async downloadReceipt(receiptId) {
    const res = await apiClient.request(`/api/student/receipts/${receiptId}/download/`, { method: 'GET' });
    return res.blob();
  },

  async getTimetable() {
    // Backend returns { success, timetable: { Monday:[...], ... } };
    // the screen consumes the day-keyed map directly.
    const res = await apiClient.get('/api/student/timetable/');
    return res?.timetable || {};
  },

  async getAssignments() {
    return apiClient.get('/api/student/assignments/');
  },

  async submitAssignment(assignmentId) {
    return apiClient.post(`/api/student/assignments/${assignmentId}/submit/`);
  },

  async getConversations() {
    return apiClient.get('/api/student/messages/');
  },

  async sendMessage(conversationId, text) {
    return apiClient.post(`/api/student/messages/${conversationId}/`, { text });
  },

  async getResources() {
    return apiClient.get('/api/student/resources/');
  },

  async getAttendance() {
    return apiClient.get('/api/student/attendance/');
  },

  async getGradeInsights() {
    return apiClient.get('/api/student/grade-insights/');
  },

  async getEvents() {
    return apiClient.get('/api/student/events/');
  },

  async verifyHash(hash) {
    return apiClient.get(`/api/verify/${encodeURIComponent(hash)}/`);
  },

  async getTamperCount() {
    return apiClient.get('/api/student/tamper-count/');
  },

  async getWhoSawMyData() {
    return apiClient.get('/api/student/access-log/');
  },

  async submitModificationObjection(gradeId, { message, copyParent }) {
    return apiClient.post(`/api/student/grades/${gradeId}/objection/`, { message, copy_parent: !!copyParent });
  },

  async getChannelPreferences() {
    return apiClient.get('/api/student/channel-preferences/');
  },

  async updateChannelPreferences(prefs) {
    return apiClient.patch('/api/student/channel-preferences/', prefs);
  },

  async getWhistleblowerCategories() {
    return apiClient.get('/api/whistleblower/categories/');
  },

  async submitWhistleblowerReport({ category, message, evidenceFiles }) {
    return apiClient.post('/api/whistleblower/submit/', { category, message, evidence: evidenceFiles?.length || 0 });
  },

  async checkWhistleblowerStatus(followUpKey) {
    return apiClient.get(`/api/whistleblower/${encodeURIComponent(followUpKey)}/`);
  },

  async getGoals(termId) {
    return apiClient.get(`/api/student/goals/?term_id=${termId}`);
  },

  async setGoal({ subjectId, target, term }) {
    return apiClient.put('/api/student/goals/', { subject_id: subjectId, target, term });
  },

  async getOfficeHourSlots() {
    return apiClient.get('/api/student/office-hours/');
  },

  async claimOfficeHourSlot(slotId, { topic }) {
    return apiClient.post(`/api/student/office-hours/${slotId}/claim/`, { topic });
  },

  async cancelOfficeHourSlot(slotId) {
    return apiClient.delete(`/api/student/office-hours/${slotId}/claim/`);
  },

  async getCounsellorThread() {
    return apiClient.get('/api/student/counsellor/');
  },

  async sendCounsellorMessage(text, { anonymous } = {}) {
    return apiClient.post('/api/student/counsellor/', { text, anonymous: !!anonymous });
  },

  async getStudyGroups() {
    return apiClient.get('/api/student/study-groups/');
  },

  async joinStudyGroup(groupId) {
    return apiClient.post(`/api/student/study-groups/${groupId}/join/`);
  },

  async leaveStudyGroup(groupId) {
    return apiClient.post(`/api/student/study-groups/${groupId}/leave/`);
  },

  async getStreaks() {
    return apiClient.get('/api/student/streaks/');
  },

  async getDigitalId() {
    return apiClient.get('/api/student/digital-id/');
  },

  async getDocumentVault() {
    return apiClient.get('/api/student/documents/');
  },

  async uploadDocument({ title, type, file }) {
    const fd = new FormData();
    fd.append('title', title || '');
    fd.append('type', type || 'other');
    if (file) fd.append('file', file);
    return apiClient.post('/api/student/documents/', fd);
  },

  async requestTranscript({ purpose, address, deliveryMethod = 'digital' }) {
    return apiClient.post('/api/student/transcript/request/', { purpose, address, delivery_method: deliveryMethod });
  },

  async getStudyPlan() {
    return apiClient.get('/api/student/study-plan/');
  },

  async saveStudyPlan(blocks) {
    return apiClient.put('/api/student/study-plan/', blocks);
  },

  async getResourceLastVisit() {
    return apiClient.get('/api/student/resources/last-visit/');
  },

  async markResourceVisited(resourceId) {
    return apiClient.post(`/api/student/resources/${resourceId}/visit/`);
  },

  async getVoiceSummary() {
    return apiClient.get('/api/student/voice-summary/');
  },

  async getSubjectDeepDive(subjectId) {
    return apiClient.get(`/api/student/subjects/${subjectId}/deep-dive/`);
  },

  async changeUsername(newUsername) {
    return apiClient.post('/api/student/change-username/', { new_username: newUsername });
  },

  async listLiveClasses(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`/api/live-classes/${qs ? `?${qs}` : ''}`);
  },
};
