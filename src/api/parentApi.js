import {
  mockParent,
  mockChildren,
  mockGradesByChild,
  mockReportCards,
  mockParentNotifications,
  mockParentProfile,
  mockAttendanceByChild,
  mockBehaviorByChild,
  mockFeesByChild,
  mockGradeHistoryBySubject,
  mockRecentActivity,
} from '../mock/parentMockData';
import {
  mockTamperByChild,
  mockWhereIveBeen,
  mockChannelPreferences,
  mockWhistleblowerCategories,
  mockConferenceSlots,
  mockCounsellor,
  mockTeacherThreads,
  mockCoGuardians,
  mockPickupAllowList,
  mockPermissionSlips,
  mockEvents,
  mockFeesByChildExtras,
  mockPaymentChannels,
  mockReceipts,
  mockDonations,
  mockWeeklyDigest,
  mockVoiceDigestText,
  mockObjectionsLog,
  mockAcknowledgments,
} from '../mock/parentMockExtras';

const USE_MOCK = process.env.REACT_APP_USE_MOCK_DATA === 'true';
const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

async function api(path, opts = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(path, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Token ${token}` } : {}),
      ...(opts.body && !(opts.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

// ── Children ────────────────────────────────────────────────────────────────
export async function fetchParentChildren() {
  if (USE_MOCK) { await delay(400); return { children: mockChildren, parent: mockParent }; }
  return api('/api/parent/children/');
}

// ── Grades ───────────────────────────────────────────────────────────────────
export async function fetchChildGrades(childId) {
  if (USE_MOCK) { await delay(450); return { grades: mockGradesByChild[childId] || [] }; }
  return api(`/api/parent/children/${childId}/grades/`);
}

export async function fetchChildGradeHistory(childId, gradeId) {
  if (USE_MOCK) {
    await delay(350);
    return { history: mockGradeHistoryBySubject[gradeId] || [] };
  }
  return api(`/api/parent/children/${childId}/grades/${gradeId}/history/`);
}

// ── Report Cards ─────────────────────────────────────────────────────────────
export async function fetchChildReportCards(childId) {
  if (USE_MOCK) { await delay(500); return { reportCards: mockReportCards[childId] || [] }; }
  return api(`/api/parent/children/${childId}/report-cards/`);
}

export async function downloadChildReportCard(childId, reportCardId) {
  if (USE_MOCK) {
    await delay(900);
    return '<html><body><h1>Mock report card ' + reportCardId + ' for ' + childId + '</h1></body></html>';
  }
  const res = await fetch(`/api/parent/children/${childId}/report-cards/${reportCardId}/download/`, {
    headers: { Authorization: `Token ${localStorage.getItem('token')}` },
  });
  return res.text();
}

// ── Notifications ────────────────────────────────────────────────────────────
export async function fetchParentNotifications(limit) {
  if (USE_MOCK) {
    await delay(350);
    const list = limit ? mockParentNotifications.slice(0, limit) : mockParentNotifications;
    return { notifications: list };
  }
  const q = limit ? `?limit=${limit}` : '';
  return api(`/api/parent/notifications/${q}`);
}

export async function markParentNotificationRead(notifId) {
  if (USE_MOCK) { await delay(200); return { success: true }; }
  return api('/api/parent/notifications/', {
    method: 'POST',
    body: JSON.stringify({ notification_id: notifId }),
  });
}

export async function markAllParentNotificationsRead() {
  if (USE_MOCK) { await delay(200); return { success: true }; }
  return api('/api/parent/notifications/mark-all-read/', { method: 'POST' });
}

// ── Profile ──────────────────────────────────────────────────────────────────
export async function fetchParentProfile() {
  if (USE_MOCK) { await delay(400); return { profile: mockParentProfile }; }
  return api('/api/parent/profile/');
}

export async function updateParentProfile(patch) {
  if (USE_MOCK) {
    await delay(500);
    Object.assign(mockParentProfile, patch);
    return { profile: mockParentProfile };
  }
  return api('/api/parent/profile/', { method: 'PATCH', body: JSON.stringify(patch) });
}

// ── 2FA ──────────────────────────────────────────────────────────────────────
export async function get2FASetup() {
  if (USE_MOCK) { await delay(300); return { enabled: false, setup_required: true, qr_code: '', setup_uri: '' }; }
  return api('/api/parent/2fa/setup/');
}
export async function enable2FA(otp) {
  if (USE_MOCK) { await delay(500); return { success: true }; }
  return api('/api/parent/2fa/setup/', { method: 'POST', body: JSON.stringify({ action: 'enable', otp_code: otp }) });
}
export async function disable2FA() {
  if (USE_MOCK) { await delay(400); return { success: true }; }
  return api('/api/parent/2fa/setup/', { method: 'POST', body: JSON.stringify({ action: 'disable' }) });
}

// ── Attendance ───────────────────────────────────────────────────────────────
export async function fetchChildAttendance(childId, monthStart) {
  if (USE_MOCK) {
    await delay(350);
    return mockAttendanceByChild[childId] || { stats: {}, calendar: [], logs: [] };
  }
  const q = monthStart ? `?month=${encodeURIComponent(monthStart)}` : '';
  return api(`/api/parent/children/${childId}/attendance/${q}`);
}

// ── Behaviour ────────────────────────────────────────────────────────────────
export async function fetchChildBehavior(childId) {
  if (USE_MOCK) { await delay(350); return mockBehaviorByChild[childId] || []; }
  return api(`/api/parent/children/${childId}/behavior/`);
}

// ── Fees & Payments ──────────────────────────────────────────────────────────
export async function fetchChildFees(childId) {
  if (USE_MOCK) {
    await delay(400);
    const base = mockFeesByChild[childId] || { transactions: [] };
    const extras = mockFeesByChildExtras[childId] || {};
    return { ...base, ...extras };
  }
  return api(`/api/parent/children/${childId}/fees/`);
}

export async function fetchPaymentChannels() {
  if (USE_MOCK) { await delay(150); return mockPaymentChannels; }
  return api('/api/parent/payment-channels/');
}

export async function startPayment({ childId, transactionId, amount, channelId, instalments }) {
  if (USE_MOCK) {
    await delay(900);
    const id = `rcp-${Date.now()}`;
    const hash = Math.random().toString(16).slice(2, 18);
    const receipt = {
      id,
      childId,
      transactionId,
      amount,
      method: mockPaymentChannels.find((c) => c.id === channelId)?.label || 'Other',
      paidAt: new Date().toISOString(),
      verificationHash: hash,
      instalments: instalments || 1,
    };
    mockReceipts.unshift(receipt);
    // mark transaction paid in mockFeesByChild
    const child = mockFeesByChild[childId];
    if (child?.transactions) {
      const tx = child.transactions.find((t) => t.id === transactionId);
      if (tx) { tx.status = 'verified'; tx.receiptId = id; }
    }
    return { success: true, receipt, redirectUrl: null };
  }
  return api('/api/parent/payments/start/', {
    method: 'POST',
    body: JSON.stringify({ child_id: childId, transaction_id: transactionId, amount, channel_id: channelId, instalments }),
  });
}

export async function fetchReceipts(childId) {
  if (USE_MOCK) {
    await delay(250);
    return childId ? mockReceipts.filter((r) => r.childId === childId) : mockReceipts;
  }
  const q = childId ? `?child=${childId}` : '';
  return api(`/api/parent/receipts/${q}`);
}

export async function downloadReceiptPdf(receiptId) {
  if (USE_MOCK) {
    await delay(700);
    return '<html><body><h1>Mock receipt ' + receiptId + '</h1></body></html>';
  }
  const res = await fetch(`/api/parent/receipts/${receiptId}/download/`, {
    headers: { Authorization: `Token ${localStorage.getItem('token')}` },
  });
  return res.text();
}

// ── Verification (public hash check, mirrors Student) ───────────────────────
export async function verifyHash(hash) {
  if (USE_MOCK) {
    await delay(700);
    const card = Object.values(mockReportCards).flat().find((rc) => rc.verificationHash === hash);
    const receipt = mockReceipts.find((r) => r.verificationHash === hash);
    if (card) {
      return {
        valid: true,
        kind: 'report_card',
        signedBy: 'El-Kendeh Smart School',
        signedAt: card.generatedAt || card.issuedOn || new Date().toISOString(),
        student: card.studentName || 'Student',
        term: card.term || card.termName,
        academicYear: card.academicYear,
        average: card.average,
        chainPosition: card.chainPosition || 142,
        chainTip: card.chainTip || 'b7c1...49ea',
      };
    }
    if (receipt) {
      return {
        valid: true,
        kind: 'receipt',
        signedBy: 'El-Kendeh Smart School',
        signedAt: receipt.paidAt,
        amount: receipt.amount,
        method: receipt.method,
        chainPosition: 88,
        chainTip: 'b7c1...49ea',
      };
    }
    return { valid: false, reason: 'Hash not found in registry' };
  }
  return api(`/api/verify/${encodeURIComponent(hash)}/`);
}

// ── Tamper counter per child ────────────────────────────────────────────────
export async function fetchTamperCount(childId) {
  if (USE_MOCK) { await delay(250); return mockTamperByChild[childId] || { total: 0, blocked: 0, successful: 0 }; }
  return api(`/api/parent/children/${childId}/tamper-count/`);
}

// ── Where I've Been (parent's own access log) ───────────────────────────────
export async function fetchWhereIveBeen() {
  if (USE_MOCK) { await delay(300); return mockWhereIveBeen; }
  return api('/api/parent/access-log/');
}

// ── Modification objection (parent-side response) ───────────────────────────
export async function submitModificationObjection({ childId, gradeId, message }) {
  if (USE_MOCK) {
    await delay(800);
    mockObjectionsLog.push({ id: `obj-${Date.now()}`, childId, gradeId, message, submittedAt: new Date().toISOString(), status: 'received' });
    return { success: true, ticketId: `OBJ-${Date.now().toString(36).toUpperCase()}` };
  }
  return api(`/api/parent/children/${childId}/grades/${gradeId}/objection/`, {
    method: 'POST', body: JSON.stringify({ message }),
  });
}

// ── Channel preferences ─────────────────────────────────────────────────────
export async function fetchChannelPreferences() {
  if (USE_MOCK) { await delay(250); return mockChannelPreferences; }
  return api('/api/parent/channel-preferences/');
}
export async function updateChannelPreferences(prefs) {
  if (USE_MOCK) { await delay(300); Object.assign(mockChannelPreferences, prefs); return { success: true }; }
  return api('/api/parent/channel-preferences/', { method: 'PATCH', body: JSON.stringify(prefs) });
}

// ── Whistleblower (anonymous safe report) ───────────────────────────────────
export async function fetchWhistleblowerCategories() {
  if (USE_MOCK) { await delay(150); return mockWhistleblowerCategories; }
  return api('/api/whistleblower/categories/');
}
export async function submitWhistleblowerReport({ category, message }) {
  if (USE_MOCK) {
    await delay(900);
    const id = `WB-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    return { success: true, ticketId: id, followUpKey: id, note: 'Save this key to follow up anonymously.' };
  }
  return api('/api/whistleblower/submit/', { method: 'POST', body: JSON.stringify({ category, message }) });
}
export async function checkWhistleblowerStatus(key) {
  if (USE_MOCK) {
    await delay(400);
    return { ticketId: key, status: 'received', updates: [{ at: new Date().toISOString(), text: 'Logged. Investigation pending.' }] };
  }
  return api(`/api/whistleblower/${encodeURIComponent(key)}/`);
}

// ── Parent-Teacher Conferences (booking) ────────────────────────────────────
export async function fetchConferenceSlots(childId) {
  if (USE_MOCK) {
    await delay(300);
    return childId ? mockConferenceSlots.filter((s) => s.childId === childId) : mockConferenceSlots;
  }
  const q = childId ? `?child=${childId}` : '';
  return api(`/api/parent/conferences/${q}`);
}
export async function claimConferenceSlot(slotId, { topic }) {
  if (USE_MOCK) {
    await delay(500);
    const s = mockConferenceSlots.find((x) => x.id === slotId);
    if (!s) throw new Error('Slot not found');
    if (s.booked) throw new Error('Slot already booked');
    s.booked = true; s.bookedBy = 'self'; s.topic = topic;
    return { success: true, slot: s };
  }
  return api(`/api/parent/conferences/${slotId}/claim/`, { method: 'POST', body: JSON.stringify({ topic }) });
}
export async function cancelConferenceSlot(slotId) {
  if (USE_MOCK) {
    await delay(400);
    const s = mockConferenceSlots.find((x) => x.id === slotId);
    if (s) { s.booked = false; s.bookedBy = null; s.topic = null; }
    return { success: true };
  }
  return api(`/api/parent/conferences/${slotId}/claim/`, { method: 'DELETE' });
}

// ── Wellbeing / counsellor ──────────────────────────────────────────────────
export async function fetchCounsellor() {
  if (USE_MOCK) { await delay(350); return mockCounsellor; }
  return api('/api/parent/counsellor/');
}
export async function sendCounsellorMessage(text, { anonymous } = {}) {
  if (USE_MOCK) {
    await delay(400);
    const msg = { id: `pwb-${Date.now()}`, sender: anonymous ? 'anonymous' : 'parent', text, sentAt: new Date().toISOString() };
    mockCounsellor.thread.push(msg);
    return msg;
  }
  return api('/api/parent/counsellor/', { method: 'POST', body: JSON.stringify({ text, anonymous: !!anonymous }) });
}

// ── Teacher messaging (per child × subject) ─────────────────────────────────
export async function fetchTeacherThreads(childId) {
  if (USE_MOCK) {
    await delay(300);
    const list = Object.entries(mockTeacherThreads)
      .filter(([k]) => k.startsWith(`${childId}:`))
      .map(([k, v]) => ({ key: k, subjectId: k.split(':')[1], ...v, unread: v.messages.filter((m) => m.sender === 'teacher' && !m.read).length }));
    return list;
  }
  return api(`/api/parent/children/${childId}/teacher-threads/`);
}
export async function sendTeacherMessage(childId, subjectId, text) {
  if (USE_MOCK) {
    await delay(350);
    const k = `${childId}:${subjectId}`;
    const t = mockTeacherThreads[k] || (mockTeacherThreads[k] = { teacherName: 'Teacher', teacherRole: 'Subject', messages: [] });
    const msg = { id: `m-${Date.now()}`, sender: 'parent', text, sentAt: new Date().toISOString() };
    t.messages.push(msg);
    return msg;
  }
  return api(`/api/parent/children/${childId}/teacher-threads/${subjectId}/`, {
    method: 'POST', body: JSON.stringify({ text }),
  });
}

// ── Co-Guardians ────────────────────────────────────────────────────────────
export async function fetchCoGuardians() {
  if (USE_MOCK) { await delay(300); return mockCoGuardians; }
  return api('/api/parent/co-guardians/');
}
export async function inviteCoGuardian({ name, email, relationship, children }) {
  if (USE_MOCK) {
    await delay(700);
    const g = { id: `g-${Date.now()}`, name, email, relationship, children, primary: false, lastLogin: null };
    mockCoGuardians.push(g);
    return { success: true, invite: g };
  }
  return api('/api/parent/co-guardians/', { method: 'POST', body: JSON.stringify({ name, email, relationship, children }) });
}
export async function removeCoGuardian(id) {
  if (USE_MOCK) {
    await delay(400);
    const i = mockCoGuardians.findIndex((g) => g.id === id);
    if (i >= 0) mockCoGuardians.splice(i, 1);
    return { success: true };
  }
  return api(`/api/parent/co-guardians/${id}/`, { method: 'DELETE' });
}

// ── Pickup allow-list ───────────────────────────────────────────────────────
export async function fetchPickupAllowList() {
  if (USE_MOCK) { await delay(300); return mockPickupAllowList; }
  return api('/api/parent/pickup/');
}
export async function addPickup({ name, relationship, phone, expiry, children, photoColor }) {
  if (USE_MOCK) {
    await delay(500);
    const entry = { id: `pk-${Date.now()}`, name, relationship, phone, expiry, children, photoColor: photoColor || '#5b8cff' };
    mockPickupAllowList.push(entry);
    return entry;
  }
  return api('/api/parent/pickup/', { method: 'POST', body: JSON.stringify({ name, relationship, phone, expiry, children, photo_color: photoColor }) });
}
export async function removePickup(id) {
  if (USE_MOCK) {
    await delay(300);
    const i = mockPickupAllowList.findIndex((p) => p.id === id);
    if (i >= 0) mockPickupAllowList.splice(i, 1);
    return { success: true };
  }
  return api(`/api/parent/pickup/${id}/`, { method: 'DELETE' });
}

// ── Permission slips ────────────────────────────────────────────────────────
export async function fetchPermissionSlips() {
  if (USE_MOCK) { await delay(300); return mockPermissionSlips; }
  return api('/api/parent/permission-slips/');
}
export async function signPermissionSlip(id, { otp }) {
  if (USE_MOCK) {
    await delay(700);
    const s = mockPermissionSlips.find((p) => p.id === id);
    if (s) { s.status = 'signed'; s.signedAt = new Date().toISOString(); }
    return { success: true, slip: s };
  }
  return api(`/api/parent/permission-slips/${id}/sign/`, { method: 'POST', body: JSON.stringify({ otp }) });
}

// ── Acknowledgments (parent-saw-this stamp) ─────────────────────────────────
export async function acknowledgeRecord({ kind, id }) {
  if (USE_MOCK) {
    await delay(200);
    mockAcknowledgments[`${kind}:${id}`] = new Date().toISOString();
    return { success: true };
  }
  return api('/api/parent/acknowledgments/', { method: 'POST', body: JSON.stringify({ kind, id }) });
}
export async function fetchAcknowledgments() {
  if (USE_MOCK) { await delay(200); return mockAcknowledgments; }
  return api('/api/parent/acknowledgments/');
}

// ── Events (school calendar for the parent's children) ─────────────────────
export async function fetchParentEvents() {
  if (USE_MOCK) { await delay(300); return mockEvents; }
  return api('/api/parent/events/');
}

// ── Donations / sponsorship ─────────────────────────────────────────────────
export async function fetchDonations() {
  if (USE_MOCK) { await delay(300); return mockDonations; }
  return api('/api/parent/donations/');
}
export async function donateToCampaign(campaignId, amount) {
  if (USE_MOCK) {
    await delay(700);
    const c = mockDonations.campaigns.find((c) => c.id === campaignId);
    if (c) { c.raisedSll += amount; }
    mockDonations.totalSponsored += amount;
    return { success: true, anonymous: true, receiptHash: Math.random().toString(16).slice(2, 18) };
  }
  return api('/api/parent/donations/', { method: 'POST', body: JSON.stringify({ campaign_id: campaignId, amount }) });
}

// ── End-of-term pack (per child or family) ─────────────────────────────────
export async function fetchEndOfTermPack({ childId }) {
  if (USE_MOCK) {
    await delay(1200);
    return {
      generatedAt: new Date().toISOString(),
      size: 1.4 * 1024 * 1024,
      childId,
      items: [
        { name: 'Report card.pdf',         size: 320_000 },
        { name: 'Transcript.pdf',          size: 220_000 },
        { name: 'Attendance summary.pdf',  size: 180_000 },
        { name: 'Fees statement.pdf',      size: 140_000 },
        { name: 'Behaviour summary.pdf',   size: 160_000 },
      ],
    };
  }
  return api(`/api/parent/children/${childId}/end-of-term-pack/`, { method: 'POST' });
}

// ── Weekly digest (AI summary) ─────────────────────────────────────────────
export async function fetchWeeklyDigest() {
  if (USE_MOCK) { await delay(500); return mockWeeklyDigest; }
  return api('/api/parent/weekly-digest/');
}
export async function fetchVoiceDigest() {
  if (USE_MOCK) { await delay(400); return { text: mockVoiceDigestText }; }
  return api('/api/parent/voice-digest/');
}

// ── Family activity feed (combined across children) ────────────────────────
export async function fetchFamilyActivity(limit = 12) {
  if (USE_MOCK) {
    await delay(300);
    return (mockRecentActivity || []).slice(0, limit);
  }
  return api(`/api/parent/family-activity/?limit=${limit}`);
}
