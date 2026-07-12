import apiClient from './client';

/* Every backend handler replies with the envelope { success, message, ...payload }.
   The student screens consume bare payloads (arrays/objects), so each method here
   unwraps its endpoint's payload key. Storing the envelope in state was the root
   cause of the portal-wide blank/crashed screens (audit S1). */
const pick = (body, key) => (body && body[key] !== undefined ? body[key] : body);

// Stable per-subject presentation (assignment cards read these directly).
const SUBJECT_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];
const subjectColor = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return SUBJECT_COLORS[Math.abs(h) % SUBJECT_COLORS.length];
};

const mapTerm = (t) =>
  t ? { id: t.id, name: t.name, startDate: t.start_date || t.startDate, endDate: t.end_date || t.endDate, isCurrent: t.is_current ?? t.isCurrent } : null;

// The anonymous whistleblower submit carries NO auth header server-side, so the
// school id captured from the (authenticated) categories call rides along here.
let wbSchoolId = null;

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
    const b = await apiClient.get('/api/student/terms/current/');
    return mapTerm(pick(b, 'term'));
  },

  async getAllTerms() {
    const b = await apiClient.get('/api/student/terms/');
    return (pick(b, 'terms') || []).map(mapTerm);
  },

  async getGradesSummary(termId) {
    return apiClient.get(`/api/student/grades/summary/?term_id=${termId}`);
  },

  async getGrades(termId) {
    const b = await apiClient.get(`/api/student/grades/?term_id=${termId}`);
    // `score` alias: the Home screen reads g.score, the grades screen reads g.total.
    return (pick(b, 'grades') || []).map((g) => ({ ...g, score: g.total }));
  },

  async getGradeHistory(gradeId) {
    const b = await apiClient.get(`/api/student/grades/${gradeId}/history/`);
    return pick(b, 'history') || [];
  },

  async getPeerReview(gradeId) {
    const b = await apiClient.get(`/api/student/grades/${gradeId}/peer-review/`);
    return pick(b, 'peerReviews') || [];
  },

  async getFeedbackThread(gradeId) {
    const b = await apiClient.get(`/api/student/grades/${gradeId}/feedback/`);
    return pick(b, 'thread');
  },

  async sendFeedbackMessage(gradeId, message) {
    return apiClient.post(`/api/student/grades/${gradeId}/feedback/`, { message });
  },

  async getRemedialPlan(gradeId) {
    const b = await apiClient.get(`/api/student/grades/${gradeId}/remedial-plan/`);
    return pick(b, 'plan');
  },

  async confirmRemedialSession(gradeId, sessionIndex) {
    return apiClient.post(`/api/student/grades/${gradeId}/remedial-plan/confirm/`, { sessionIndex });
  },

  async getSecurityReport(gradeId) {
    return apiClient.get(`/api/student/grades/${gradeId}/security-report/`);
  },

  async getTranscript() {
    const b = await apiClient.get('/api/student/transcript/');
    return pick(b, 'transcript') || [];
  },

  async downloadTranscript() {
    const b = await apiClient.get('/api/student/transcript/download/');
    return pick(b, 'transcript');
  },

  async getReportCards() {
    const b = await apiClient.get('/api/student/report-cards/');
    // Backend emits the parent-portal card shape; the student cards read
    // termName/generatedAt/status names.
    return (pick(b, 'reportCards') || []).map((rc) => ({
      ...rc,
      termName: rc.termName || rc.term,
      academicYear: rc.academicYear,
      status: rc.status || 'published',
      generatedAt: rc.generatedAt || rc.verifiedAt,
      classRank: rc.classRank ?? rc.position,
      totalStudentsInClass: rc.totalStudentsInClass ?? rc.totalStudents,
    }));
  },

  // A report card is one term's published set; `id` is the term id. PDF download.
  async downloadReportCard(id) {
    return apiClient.getBlob(`/api/student/report-cards/${id}/download/`);
  },

  async getNotifications(limit) {
    const query = limit ? `?limit=${limit}` : '';
    const b = await apiClient.get(`/api/student/notifications/${query}`);
    return pick(b, 'notifications') || [];
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
    const b = await apiClient.get('/api/student/parental-access-log/');
    const entries = pick(b, 'entries') || [];
    // The profile card reads a small header summary above the raw entries.
    return {
      entries,
      guardianName: entries[0]?.actor || 'Your guardian',
      lastAccess: entries[0]?.timestamp
        ? new Date(entries[0].timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'no recorded access yet',
    };
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
    return apiClient.getBlob(`/api/student/receipts/${receiptId}/download/`);
  },

  async getTimetable() {
    const b = await apiClient.get('/api/student/timetable/');
    return pick(b, 'timetable') || {};
  },

  async getAssignments() {
    const b = await apiClient.get('/api/student/assignments/');
    return (pick(b, 'assignments') || []).map((a) => ({
      ...a,
      subjectColor: subjectColor(a.subject || ''),
      subjectIcon: 'menu_book',
    }));
  },

  async submitAssignment(assignmentId, { content } = {}) {
    return apiClient.post(`/api/student/assignments/${assignmentId}/submit/`, { content: content || '' });
  },

  async getConversations() {
    const b = await apiClient.get('/api/student/messages/');
    return pick(b, 'conversations') || [];
  },

  async sendMessage(conversationId, text) {
    const b = await apiClient.post(`/api/student/messages/${encodeURIComponent(conversationId)}/`, { text });
    return { sender: 'student', text: b.text ?? b.body ?? text, sentAt: b.sentAt ?? b.createdAt ?? new Date().toISOString() };
  },

  async getResources() {
    const b = await apiClient.get('/api/student/resources/');
    return pick(b, 'resources') || [];
  },

  async getAttendance() {
    const b = await apiClient.get('/api/student/attendance/');
    const s = b.summary || {};
    return {
      rate: s.rate ?? 0,
      totalDays: s.total ?? 0,
      presentDays: s.present ?? 0,
      absentDays: s.absent ?? 0,
      tardyDays: s.late ?? 0,
      recentLog: b.attendance || [],
    };
  },

  async getGradeInsights() {
    const b = await apiClient.get('/api/student/grade-insights/');
    return pick(b, 'insights') || [];
  },

  async getEvents() {
    const b = await apiClient.get('/api/student/events/');
    return pick(b, 'events') || [];
  },

  async verifyHash(hash) {
    return apiClient.get(`/api/verify/${encodeURIComponent(hash)}/`);
  },

  async getTamperCount() {
    return apiClient.get('/api/student/tamper-count/');
  },

  async getWhoSawMyData() {
    const b = await apiClient.get('/api/student/access-log/');
    return pick(b, 'entries') || [];
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
    const b = await apiClient.get('/api/whistleblower/categories/');
    wbSchoolId = b.school_id || wbSchoolId;
    return (pick(b, 'categories') || []).map((c) => ({ id: c.id, label: c.label || c.name, description: c.description }));
  },

  async submitWhistleblowerReport({ category, message }) {
    const b = await apiClient.post('/api/whistleblower/submit/', {
      school_id: wbSchoolId,
      category_id: category || null,
      title: (message || '').slice(0, 80) || 'Anonymous report',
      description: message,
      severity: 'medium',
      reporter_type: 'anonymous',
    });
    return { followUpKey: b.follow_up_key, note: b.message };
  },

  async checkWhistleblowerStatus(followUpKey) {
    return apiClient.get(`/api/whistleblower/${encodeURIComponent(followUpKey)}/`);
  },

  async getGoals(termId) {
    const b = await apiClient.get(`/api/student/goals/?term_id=${termId}`);
    return pick(b, 'goals') || [];
  },

  async setGoal({ subjectId, target, term }) {
    return apiClient.put('/api/student/goals/', { subject_id: subjectId, target, term });
  },

  async getOfficeHourSlots() {
    const b = await apiClient.get('/api/student/office-hours/');
    return pick(b, 'slots') || [];
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
    const b = await apiClient.get('/api/student/study-groups/');
    return pick(b, 'groups') || [];
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
    const b = await apiClient.get('/api/student/study-plan/');
    return pick(b, 'blocks') || [];
  },

  async saveStudyPlan(blocks) {
    return apiClient.put('/api/student/study-plan/', { blocks });
  },

  async getResourceLastVisit() {
    const b = await apiClient.get('/api/student/resources/last-visit/');
    return pick(b, 'visits') || {};
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
