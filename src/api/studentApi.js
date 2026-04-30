import apiClient from './client';
import {
  mockStudent,
  mockCurrentTerm,
  mockTerms,
  mockGrades,
  mockGradesSummary,
  mockGradeHistory,
  mockPeerReviews,
  mockFeedbackThreads,
  mockRemedialPlan,
  mockReportCards,
  mockNotifications,
  mockSecurityHealth,
  mockParentalAccessLog,
  mockFinancials,
  mockTimetable,
  mockAssignments,
  mockMessages,
  mockResources,
  mockAttendance,
  mockGradeInsights,
  mockEvents,
} from '../mock/studentMockData';
import {
  mockTamperCount,
  mockWhoSawMyData,
  mockChannelPreferences,
  mockWhistleblowerCategories,
  mockOfficeHourSlots,
  mockCounsellor,
  mockStudyGroups,
  mockStreaks,
  mockDigitalId,
  mockDocumentVault,
  mockStudyPlan,
  mockResourceLastVisit,
  mockTermVoiceSummary,
  mockObjectionsLog,
} from '../mock/studentMockExtras';

const USE_MOCK = process.env.REACT_APP_USE_MOCK_DATA === 'true';
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export const studentApi = {
  // ── Profile ──────────────────────────────────────────────────────────
  async getProfile() {
    if (USE_MOCK) { await delay(600); return mockStudent; }
    return apiClient.get('/api/student/me/');
  },

  async getAccountInfo() {
    if (USE_MOCK) {
      await delay(400);
      return {
        email: 'a.kamara@student.eksms.edu.sl',
        studentId: mockStudent.studentNumber,
        twoFactorEnabled: false,
        lastLogin: new Date().toISOString(),
        activeSessions: 1,
      };
    }
    return apiClient.get('/api/student/me/');
  },

  async changePassword(currentPassword, newPassword) {
    if (USE_MOCK) { await delay(600); return { success: true }; }
    return apiClient.post('/api/student/change-password/', { current_password: currentPassword, new_password: newPassword });
  },

  // ── Terms ─────────────────────────────────────────────────────────────
  async getCurrentTerm() {
    if (USE_MOCK) { await delay(300); return mockCurrentTerm; }
    return apiClient.get('/api/terms/current/');
  },

  async getAllTerms() {
    if (USE_MOCK) { await delay(300); return mockTerms; }
    return apiClient.get('/api/student/terms/');
  },

  // ── Grades ────────────────────────────────────────────────────────────
  async getGradesSummary(termId) {
    if (USE_MOCK) { await delay(500); return mockGradesSummary; }
    return apiClient.get(`/api/student/grades/summary/?term_id=${termId}`);
  },

  async getGrades(termId) {
    if (USE_MOCK) { await delay(700); return mockGrades; }
    return apiClient.get(`/api/student/grades/?term_id=${termId}`);
  },

  async getGradeHistory(gradeId) {
    if (USE_MOCK) { await delay(400); return mockGradeHistory[gradeId] || []; }
    return apiClient.get(`/api/student/grades/${gradeId}/history/`);
  },

  // ── Peer Review ───────────────────────────────────────────────────────
  async getPeerReview(gradeId) {
    if (USE_MOCK) {
      await delay(500);
      if (!mockPeerReviews[gradeId]) throw new Error('No peer review found');
      return mockPeerReviews[gradeId];
    }
    return apiClient.get(`/api/student/grades/${gradeId}/peer-review/`);
  },

  // ── Feedback Thread ───────────────────────────────────────────────────
  async getFeedbackThread(gradeId) {
    if (USE_MOCK) {
      await delay(400);
      if (!mockFeedbackThreads[gradeId]) throw new Error('No thread found');
      return mockFeedbackThreads[gradeId];
    }
    return apiClient.get(`/api/student/grades/${gradeId}/feedback/`);
  },

  async sendFeedbackMessage(gradeId, message) {
    if (USE_MOCK) {
      await delay(500);
      return {
        id: `msg-${Date.now()}`,
        sender: 'student',
        text: message,
        sentAt: new Date().toISOString(),
        isRead: false,
      };
    }
    return apiClient.post(`/api/student/grades/${gradeId}/feedback/`, { message });
  },

  // ── Remedial Plan ─────────────────────────────────────────────────────
  async getRemedialPlan(gradeId) {
    if (USE_MOCK) {
      await delay(500);
      if (!mockRemedialPlan[gradeId]) throw new Error('No remedial plan found');
      return mockRemedialPlan[gradeId];
    }
    return apiClient.get(`/api/student/grades/${gradeId}/remedial-plan/`);
  },

  async confirmRemedialSession(gradeId, sessionIndex) {
    if (USE_MOCK) { await delay(300); return { success: true }; }
    return apiClient.post(`/api/student/grades/${gradeId}/remedial-plan/confirm/`, { sessionIndex });
  },

  // ── Security Report ───────────────────────────────────────────────────
  async getSecurityReport(gradeId) {
    if (USE_MOCK) {
      await delay(500);
      const grade = mockGrades.find((g) => g.id === gradeId);
      if (!grade?.modificationAttempt) throw new Error('No security incident found');
      return {
        gradeId,
        subjectName: grade.subject.name,
        score: grade.score,
        gradeLetter: grade.gradeLetter,
        incident: {
          detectedAt: grade.modificationAttempt.attemptedAt,
          blocked: grade.modificationAttempt.wasBlocked,
          ipAddress: grade.modificationAttempt.ipAddress,
          location: grade.modificationAttempt.location,
          deviceType: grade.modificationAttempt.deviceType,
        },
      };
    }
    return apiClient.get(`/api/student/grades/${gradeId}/security-report/`);
  },

  // ── Transcript ───────────────────────────────────────────────────────
  async getTranscript() {
    if (USE_MOCK) {
      await delay(700);
      return { success: true, student: 'Mock Student', studentId: 'STU-001', transcript: [] };
    }
    return apiClient.get('/api/student/transcript/');
  },

  async downloadTranscript() {
    if (USE_MOCK) {
      await delay(800);
      return '<html><body><h1>Mock Transcript</h1></body></html>';
    }
    const response = await apiClient.request('/api/student/transcript/download/', { method: 'GET' });
    return response.text();
  },

  // ── Report Cards ──────────────────────────────────────────────────────
  async getReportCards() {
    if (USE_MOCK) { await delay(600); return mockReportCards; }
    return apiClient.get('/api/student/report-cards/');
  },

  async downloadReportCard(id) {
    if (USE_MOCK) {
      await delay(1500);
      return '<html><body><h1>Mock Report Card ' + id + '</h1></body></html>';
    }
    const response = await apiClient.request(`/api/report-cards/${id}/download/`, { method: 'GET' });
    return response.text();
  },

  // ── Notifications ─────────────────────────────────────────────────────
  async getNotifications(limit) {
    if (USE_MOCK) {
      await delay(400);
      return limit ? mockNotifications.slice(0, limit) : mockNotifications;
    }
    const query = limit ? `?limit=${limit}` : '';
    return apiClient.get(`/api/student/notifications/${query}`);
  },

  async markNotificationRead(id) {
    if (USE_MOCK) { await delay(200); return { success: true }; }
    return apiClient.patch(`/api/student/notifications/${id}/`, { is_read: true });
  },

  async markAllNotificationsRead() {
    if (USE_MOCK) { await delay(300); return { success: true }; }
    return apiClient.patch('/api/student/notifications/mark-all-read/');
  },

  // ── Security Health ───────────────────────────────────────────────────
  async getSecurityHealth() {
    if (USE_MOCK) {
      await delay(500);
      const m = mockSecurityHealth;
      return {
        score: m.score,
        level: m.scoreLabel || m.level || 'Good',
        twoFactorEnabled: m.twoFAEnabled ?? m.twoFactorEnabled ?? false,
        twoFactorSince: m.twoFAEnabledSince
          ? new Date(m.twoFAEnabledSince).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          : null,
        trustedDevices: (m.trustedDevices || []).map((d) => ({
          ...d,
          lastActive: (() => {
            const diff = Date.now() - new Date(d.lastActive).getTime();
            if (diff < 60000) return 'Just now';
            if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
            if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
            return `${Math.floor(diff / 86400000)} days ago`;
          })(),
        })),
        loginHistory: (m.loginHistory || []).map((e) => ({
          location: e.location,
          ip: e.ip,
          device: e.device,
          time: (() => {
            const d = new Date(e.time);
            const diff = Date.now() - d.getTime();
            if (diff < 3600000) return `Today, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
            if (diff < 86400000) return `Today, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
            return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
          })(),
          success: e.status === 'success' || e.success === true,
        })),
      };
    }
    return apiClient.get('/api/student/security-health/');
  },

  async revokeDevice(deviceId) {
    if (USE_MOCK) { await delay(400); return { success: true }; }
    return apiClient.delete(`/api/student/devices/${deviceId}/`);
  },

  // ── Parental Access Log ───────────────────────────────────────────────
  async getParentalAccessLog() {
    if (USE_MOCK) {
      await delay(400);
      const entries = Array.isArray(mockParentalAccessLog) ? mockParentalAccessLog : [];
      const first = entries[0];
      return {
        guardianName: first?.guardianName || 'Guardian',
        lastAccess: first ? new Date(first.time || first.accessedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A',
        entries: entries.map((e) => ({
          action: e.section?.toLowerCase().replace(/\s+/g, '_') || 'view',
          actionLabel: `Viewed ${e.section || 'Records'}`,
          device: e.device || 'Mobile App',
          location: e.location || 'Freetown, Sierra Leone',
          accessedAt: e.time || e.accessedAt || new Date().toISOString(),
        })),
      };
    }
    return apiClient.get('/api/student/parental-access-log/');
  },

  // ── 2FA Setup ────────────────────────────────────────────────────────
  async get2FASetup() {
    if (USE_MOCK) {
      await delay(400);
      return { enabled: false, setup_required: true, qr_code: '', setup_uri: '' };
    }
    return apiClient.get('/api/student/2fa/setup/');
  },

  async enable2FA(otpCode) {
    if (USE_MOCK) { await delay(600); return { success: true }; }
    return apiClient.post('/api/student/2fa/setup/', { action: 'enable', otp_code: otpCode });
  },

  async disable2FA() {
    if (USE_MOCK) { await delay(400); return { success: true }; }
    return apiClient.post('/api/student/2fa/setup/', { action: 'disable' });
  },

  // ── Financials ────────────────────────────────────────────────────────
  async getFinancials() {
    if (USE_MOCK) {
      await delay(600);
      const m = mockFinancials;
      // Support both flat and nested shapes
      const s = m.summary || m;
      const transactions = (m.transactions || []).map((tx) => ({
        id: tx.id,
        description: tx.description,
        type: (tx.icon || tx.type || 'other').replace('receipt_long', 'tuition').replace('biotech', 'lab').replace('library_books', 'library').replace('groups', 'other'),
        date: tx.date,
        amount: tx.amount,
        status: tx.status || 'verified',
      }));
      const dueMs = s.dueDate ? new Date(s.dueDate).getTime() - Date.now() : null;
      return {
        academicYear: '2024/25',
        totalFees: s.totalFees,
        paidToDate: s.paidToDate,
        outstanding: s.outstanding,
        dueDays: dueMs != null ? Math.max(0, Math.ceil(dueMs / 86400000)) : null,
        transactions,
      };
    }
    return apiClient.get('/api/student/financials/');
  },

  async downloadReceipt(receiptId) {
    if (USE_MOCK) {
      await delay(800);
      return new Blob([`Mock receipt ${receiptId}`], { type: 'application/pdf' });
    }
    const res = await apiClient.request(`/api/student/receipts/${receiptId}/download/`, { method: 'GET' });
    return res.blob();
  },

  // ── Timetable ─────────────────────────────────────────────────────────────
  async getTimetable() {
    if (USE_MOCK) { await delay(400); return mockTimetable; }
    return apiClient.get('/api/student/timetable/');
  },

  // ── Assignments ───────────────────────────────────────────────────────────
  async getAssignments() {
    if (USE_MOCK) { await delay(500); return mockAssignments; }
    return apiClient.get('/api/student/assignments/');
  },

  async submitAssignment(assignmentId) {
    if (USE_MOCK) { await delay(800); return { success: true }; }
    return apiClient.post(`/api/student/assignments/${assignmentId}/submit/`);
  },

  // ── Messages ──────────────────────────────────────────────────────────────
  async getConversations() {
    if (USE_MOCK) { await delay(400); return mockMessages; }
    return apiClient.get('/api/student/messages/');
  },

  async sendMessage(conversationId, text) {
    if (USE_MOCK) {
      await delay(300);
      return { id: `msg-${Date.now()}`, sender: 'student', text, sentAt: new Date().toISOString() };
    }
    return apiClient.post(`/api/student/messages/${conversationId}/`, { text });
  },

  // ── Resources ─────────────────────────────────────────────────────────────
  async getResources() {
    if (USE_MOCK) { await delay(500); return mockResources; }
    return apiClient.get('/api/student/resources/');
  },

  // ── Attendance ────────────────────────────────────────────────────────────
  async getAttendance() {
    if (USE_MOCK) { await delay(400); return mockAttendance; }
    return apiClient.get('/api/student/attendance/');
  },

  // ── Grade Insights (trends vs previous term) ──────────────────────────────
  async getGradeInsights() {
    if (USE_MOCK) { await delay(300); return mockGradeInsights; }
    return apiClient.get('/api/student/grade-insights/');
  },

  // ── Events & Calendar ─────────────────────────────────────────────────────
  async getEvents() {
    if (USE_MOCK) { await delay(400); return mockEvents; }
    return apiClient.get('/api/student/events/');
  },

  // ───────────────────────────────────────────────────────────────────────
  // NEW ENDPOINTS — Phase 2+
  // ───────────────────────────────────────────────────────────────────────

  // ── Verification (public hash check) ─────────────────────────────────────
  async verifyHash(hash) {
    if (USE_MOCK) {
      await delay(700);
      const card = mockReportCards.find((rc) => rc.verificationHash === hash);
      if (!card) return { valid: false, reason: 'Hash not found in registry' };
      return {
        valid: true,
        signedBy: 'El-Kendeh Smart School',
        signedAt: card.generatedAt,
        student: mockStudent.fullName,
        studentNumber: mockStudent.studentNumber,
        term: card.termName,
        academicYear: card.academicYear,
        average: card.average,
        chainPosition: card.chainPosition || 142,
        chainTip: card.chainTip || 'b7c1...49ea',
      };
    }
    return apiClient.get(`/api/verify/${encodeURIComponent(hash)}/`);
  },

  // ── Tamper-attempt counter (visible to student) ─────────────────────────
  async getTamperCount() {
    if (USE_MOCK) { await delay(250); return mockTamperCount; }
    return apiClient.get('/api/student/tamper-count/');
  },

  // ── Who's seen my data (extends parental access log) ────────────────────
  async getWhoSawMyData() {
    if (USE_MOCK) { await delay(400); return mockWhoSawMyData; }
    return apiClient.get('/api/student/access-log/');
  },

  // ── Modification objection (student-side response to attempt) ───────────
  async submitModificationObjection(gradeId, { message, copyParent }) {
    if (USE_MOCK) {
      await delay(800);
      mockObjectionsLog.push({
        id: `obj-${Date.now()}`, gradeId, submittedAt: new Date().toISOString(),
        status: 'received', message, copyParent: !!copyParent,
      });
      return { success: true, ticketId: `OBJ-${Date.now().toString(36).toUpperCase()}` };
    }
    return apiClient.post(`/api/student/grades/${gradeId}/objection/`, { message, copy_parent: !!copyParent });
  },

  // ── Channel preferences ─────────────────────────────────────────────────
  async getChannelPreferences() {
    if (USE_MOCK) { await delay(300); return mockChannelPreferences; }
    return apiClient.get('/api/student/channel-preferences/');
  },

  async updateChannelPreferences(prefs) {
    if (USE_MOCK) {
      await delay(400);
      Object.assign(mockChannelPreferences, prefs);
      return { success: true };
    }
    return apiClient.patch('/api/student/channel-preferences/', prefs);
  },

  // ── Whistleblower (anonymous safe report) ───────────────────────────────
  async getWhistleblowerCategories() {
    if (USE_MOCK) { await delay(150); return mockWhistleblowerCategories; }
    return apiClient.get('/api/whistleblower/categories/');
  },

  async submitWhistleblowerReport({ category, message, evidenceFiles }) {
    // Backend MUST not log identity, IP, or UA. Frontend must use a separate, anonymized fetch path.
    if (USE_MOCK) {
      await delay(900);
      const id = `WB-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
      return { success: true, ticketId: id, followUpKey: id, note: 'Save this key to follow up anonymously.' };
    }
    return apiClient.post('/api/whistleblower/submit/', { category, message, evidence: evidenceFiles?.length || 0 });
  },

  async checkWhistleblowerStatus(followUpKey) {
    if (USE_MOCK) {
      await delay(500);
      return { ticketId: followUpKey, status: 'received', updates: [{ at: new Date().toISOString(), text: 'Logged. Investigation pending.' }] };
    }
    return apiClient.get(`/api/whistleblower/${encodeURIComponent(followUpKey)}/`);
  },

  // ── Goals (server-synced score targets) ─────────────────────────────────
  async getGoals(termId) {
    if (USE_MOCK) {
      await delay(250);
      // Pull localStorage saved goals for compatibility with old UI
      const raw = (() => { try { return JSON.parse(localStorage.getItem('stu_goals') || '[]'); } catch { return []; } })();
      return raw;
    }
    return apiClient.get(`/api/student/goals/?term_id=${termId}`);
  },

  async setGoal({ subjectId, target, term }) {
    if (USE_MOCK) {
      await delay(250);
      const raw = (() => { try { return JSON.parse(localStorage.getItem('stu_goals') || '[]'); } catch { return []; } })();
      const idx = raw.findIndex((g) => g.subjectId === subjectId && g.term === term);
      const entry = { subjectId, target, term, updatedAt: new Date().toISOString() };
      if (idx >= 0) raw[idx] = entry; else raw.push(entry);
      try { localStorage.setItem('stu_goals', JSON.stringify(raw)); } catch {}
      return entry;
    }
    return apiClient.put('/api/student/goals/', { subject_id: subjectId, target, term });
  },

  // ── Office Hours ────────────────────────────────────────────────────────
  async getOfficeHourSlots() {
    if (USE_MOCK) { await delay(300); return mockOfficeHourSlots; }
    return apiClient.get('/api/student/office-hours/');
  },

  async claimOfficeHourSlot(slotId, { topic }) {
    if (USE_MOCK) {
      await delay(500);
      const slot = mockOfficeHourSlots.find((s) => s.id === slotId);
      if (!slot) throw new Error('Slot not found');
      if (slot.booked) throw new Error('Slot already booked');
      slot.booked = true; slot.bookedBy = 'self'; slot.topic = topic;
      return { success: true, slot };
    }
    return apiClient.post(`/api/student/office-hours/${slotId}/claim/`, { topic });
  },

  async cancelOfficeHourSlot(slotId) {
    if (USE_MOCK) {
      await delay(400);
      const slot = mockOfficeHourSlots.find((s) => s.id === slotId);
      if (!slot) throw new Error('Slot not found');
      slot.booked = false; slot.bookedBy = null; slot.topic = null;
      return { success: true };
    }
    return apiClient.delete(`/api/student/office-hours/${slotId}/claim/`);
  },

  // ── Counsellor / Wellbeing ───────────────────────────────────────────────
  async getCounsellorThread() {
    if (USE_MOCK) { await delay(400); return mockCounsellor; }
    return apiClient.get('/api/student/counsellor/');
  },

  async sendCounsellorMessage(text, { anonymous } = {}) {
    if (USE_MOCK) {
      await delay(400);
      const msg = { id: `wb-${Date.now()}`, sender: anonymous ? 'anonymous' : 'student', text, sentAt: new Date().toISOString() };
      mockCounsellor.thread.push(msg);
      return msg;
    }
    return apiClient.post('/api/student/counsellor/', { text, anonymous: !!anonymous });
  },

  // ── Study Groups ─────────────────────────────────────────────────────────
  async getStudyGroups() {
    if (USE_MOCK) { await delay(300); return mockStudyGroups; }
    return apiClient.get('/api/student/study-groups/');
  },

  async joinStudyGroup(groupId) {
    if (USE_MOCK) {
      await delay(500);
      const g = mockStudyGroups.find((g) => g.id === groupId);
      if (g) { g.joined = true; g.members += 1; }
      return { success: true };
    }
    return apiClient.post(`/api/student/study-groups/${groupId}/join/`);
  },

  async leaveStudyGroup(groupId) {
    if (USE_MOCK) {
      await delay(400);
      const g = mockStudyGroups.find((g) => g.id === groupId);
      if (g) { g.joined = false; g.members = Math.max(0, g.members - 1); }
      return { success: true };
    }
    return apiClient.post(`/api/student/study-groups/${groupId}/leave/`);
  },

  // ── Streaks / Habit cards ────────────────────────────────────────────────
  async getStreaks() {
    if (USE_MOCK) { await delay(200); return mockStreaks; }
    return apiClient.get('/api/student/streaks/');
  },

  // ── Digital ID Card ──────────────────────────────────────────────────────
  async getDigitalId() {
    if (USE_MOCK) {
      await delay(400);
      return { ...mockDigitalId, verifyUrl: `${window.location.origin}/verify/${encodeURIComponent('id-' + mockDigitalId.studentNumber)}` };
    }
    return apiClient.get('/api/student/digital-id/');
  },

  // ── Document Vault & Transcript Request ──────────────────────────────────
  async getDocumentVault() {
    if (USE_MOCK) { await delay(400); return mockDocumentVault; }
    return apiClient.get('/api/student/documents/');
  },

  async uploadDocument({ title, type, file }) {
    if (USE_MOCK) {
      await delay(900);
      const entry = {
        id: `doc-${Date.now()}`,
        title: title || file?.name || 'Untitled',
        type: type || 'other',
        status: 'pending',
        uploadedAt: new Date().toISOString(),
        size: file?.size || 0,
      };
      mockDocumentVault.uploads.unshift(entry);
      return entry;
    }
    const fd = new FormData();
    fd.append('title', title || '');
    fd.append('type', type || 'other');
    if (file) fd.append('file', file);
    return apiClient.post('/api/student/documents/', fd);
  },

  async requestTranscript({ purpose, address, deliveryMethod = 'digital' }) {
    if (USE_MOCK) {
      await delay(700);
      const entry = {
        id: `tr-${Date.now()}`,
        purpose, address, deliveryMethod,
        requestedAt: new Date().toISOString(),
        status: 'received',
      };
      mockDocumentVault.transcriptRequests.unshift(entry);
      return entry;
    }
    return apiClient.post('/api/student/transcript/request/', { purpose, address, delivery_method: deliveryMethod });
  },

  // ── Study Planner ────────────────────────────────────────────────────────
  async getStudyPlan() {
    if (USE_MOCK) {
      await delay(250);
      try { const ls = JSON.parse(localStorage.getItem('stu_study_plan') || 'null'); if (ls) return ls; } catch {}
      return mockStudyPlan;
    }
    return apiClient.get('/api/student/study-plan/');
  },

  async saveStudyPlan(blocks) {
    if (USE_MOCK) {
      await delay(300);
      try { localStorage.setItem('stu_study_plan', JSON.stringify(blocks)); } catch {}
      return { success: true };
    }
    return apiClient.put('/api/student/study-plan/', blocks);
  },

  // ── Resource last-visit (for "new since" markers) ────────────────────────
  async getResourceLastVisit() {
    if (USE_MOCK) {
      await delay(200);
      try { const ls = JSON.parse(localStorage.getItem('stu_resource_visits') || 'null'); if (ls) return ls; } catch {}
      return { ...mockResourceLastVisit };
    }
    return apiClient.get('/api/student/resources/last-visit/');
  },

  async markResourceVisited(resourceId) {
    if (USE_MOCK) {
      await delay(150);
      try {
        const ls = JSON.parse(localStorage.getItem('stu_resource_visits') || '{}');
        ls[resourceId] = new Date().toISOString();
        localStorage.setItem('stu_resource_visits', JSON.stringify(ls));
      } catch {}
      return { success: true };
    }
    return apiClient.post(`/api/student/resources/${resourceId}/visit/`);
  },

  // ── Voice summary (TTS source text) ──────────────────────────────────────
  async getVoiceSummary() {
    if (USE_MOCK) { await delay(300); return { text: mockTermVoiceSummary }; }
    return apiClient.get('/api/student/voice-summary/');
  },

  // ── Subject deep-dive (aggregator) ───────────────────────────────────────
  async getSubjectDeepDive(subjectId) {
    if (USE_MOCK) {
      await delay(700);
      const grade = mockGrades.find((g) => g.subject?.id === subjectId || g.subject?.code === subjectId);
      const insights = (mockGradeInsights || []).find((i) => i.subjectId === subjectId);
      const c = grade?.components;
      return {
        subject: grade?.subject || { id: subjectId, name: 'Subject', code: subjectId, color: '#5b8cff' },
        currentGrade: grade ? { score: grade.score, gradeLetter: grade.gradeLetter, status: grade.status } : null,
        breakdown: c ? {
          ca:      { score: c.ca?.score        ?? null, weight: c.ca?.weight        ?? 20, max: 20 },
          midTerm: { score: c.midterm?.score   ?? null, weight: c.midterm?.weight   ?? 20, max: 30 },
          final:   { score: c.finalExam?.score ?? null, weight: c.finalExam?.weight ?? 60, max: 50 },
        } : null,
        history: mockGradeHistory[grade?.id] || [],
        trend: insights ? insights.points : [],
        teacher: grade?.teacher || 'Mr. Daniel Sesay',
        resources: (mockResources?.find?.((r) => r.subjectCode === (grade?.subject?.code))?.files) || [],
        peerReviewCount: 2,
        nextClass: null,
      };
    }
    return apiClient.get(`/api/student/subjects/${subjectId}/deep-dive/`);
  },
};
