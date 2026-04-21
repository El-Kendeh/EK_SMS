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
} from '../mock/studentMockData';

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
};
