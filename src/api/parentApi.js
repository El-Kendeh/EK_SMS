import apiClient from './client';

// Parent portal API layer.
// apiClient.get/post/patch/delete PARSE the JSON body and return it as
// {success, message, ...data}. Where a consumer expects a bare array/object,
// the wrapper key is unwrapped HERE so components stay dumb.

const api = apiClient;

export async function fetchParentChildren() {
  return api.get('/api/parent/children/'); // {children, parent}
}

export async function fetchChildGrades(childId, termId) {
  const q = termId ? `?term_id=${termId}` : '';
  return api.get(`/api/parent/children/${childId}/grades/${q}`); // {grades}
}

export async function fetchChildGradeHistory(childId, gradeId) {
  return api.get(`/api/parent/children/${childId}/grades/${gradeId}/history/`); // {history}
}

export async function fetchChildReportCards(childId) {
  return api.get(`/api/parent/children/${childId}/report-cards/`); // {reportCards, attendanceRate}
}

export async function downloadChildReportCard(childId, reportCardId) {
  // reportCardId = the term id of the published set (see getChildReportCards).
  // Streams a real PDF (with verification hash + QR).
  return api.getBlob(`/api/parent/children/${childId}/report-cards/${reportCardId}/download/`);
}

export async function fetchParentNotifications(limit) {
  const q = limit ? `?limit=${limit}` : '';
  return api.get(`/api/parent/notifications/${q}`); // {notifications, unread}
}

export async function markParentNotificationRead(notifId) {
  return api.post('/api/parent/notifications/', { notification_id: notifId });
}

export async function markAllParentNotificationsRead() {
  return api.post('/api/parent/notifications/', { mark_all: true });
}

export async function fetchParentProfile() {
  return api.get('/api/parent/profile/'); // {profile}
}

export async function updateParentProfile(patch) {
  return api.patch('/api/parent/profile/', patch); // {profile}
}

// 2FA is not available yet — the backend reports {available:false} and the UI
// must show a "coming soon" state, never a fake toggle.
export async function get2FASetup() {
  return api.get('/api/parent/2fa/setup/');
}

export async function fetchChildTimetable(childId) {
  // Same weekly grid the student dashboard renders (shared backend builder).
  return api.get(`/api/parent/children/${childId}/timetable/`); // {timetable, className, hasData}
}

export async function fetchChildAttendance(childId, monthStart) {
  const q = monthStart ? `?month=${encodeURIComponent(monthStart)}` : '';
  return api.get(`/api/parent/children/${childId}/attendance/${q}`); // {month, stats, calendar, logs}
}

export async function fetchChildBehavior(childId) {
  return api.get(`/api/parent/children/${childId}/behavior/`); // {entries}
}

export async function fetchChildFees(childId) {
  return api.get(`/api/parent/children/${childId}/fees/`); // {totalFees, paidToDate, outstanding, transactions, payments}
}

export async function fetchPaymentChannels() {
  const res = await api.get('/api/parent/payment-channels/');
  return res.channels || [];
}

export async function startPayment({ childId, transactionId, amount, channelId, instalments }) {
  return api.post('/api/parent/payments/start/', {
    child_id: childId, transaction_id: transactionId, amount, channel_id: channelId, instalments,
  }); // {receipt, redirectUrl}
}

export async function fetchReceipts(childId) {
  const q = childId ? `?child=${childId}` : '';
  const res = await api.get(`/api/parent/receipts/${q}`);
  return res.receipts || [];
}

export async function downloadReceiptPdf(receiptId) {
  // Streams a real PDF (PENDING watermark until the school confirms payment).
  return api.getBlob(`/api/parent/receipts/${receiptId}/download/`);
}

export async function verifyHash(hash) {
  return api.get(`/api/verify/${encodeURIComponent(hash)}/`);
}

export async function fetchTamperCount(childId) {
  return api.get(`/api/parent/children/${childId}/tamper-count/`); // {available:false,...}
}

export async function fetchWhereIveBeen() {
  const res = await api.get('/api/parent/access-log/');
  return res.entries || [];
}

export async function submitModificationObjection({ childId, gradeId, message }) {
  return api.post(`/api/parent/children/${childId}/grades/${gradeId}/objection/`, { reason: message });
}

export async function fetchChannelPreferences() {
  const res = await api.get('/api/parent/channel-preferences/');
  return res.preferences || null;
}

export async function updateChannelPreferences(prefs) {
  return api.patch('/api/parent/channel-preferences/', prefs);
}

export async function fetchWhistleblowerCategories() {
  const res = await api.get('/api/parent/whistleblower/categories/');
  return res.categories || [];
}

export async function submitWhistleblowerReport({ category, message }) {
  return api.post('/api/parent/whistleblower/submit/', {
    category_id: category,
    description: message,
  }); // {ticketId, followUpKey, note}
}

export async function checkWhistleblowerStatus(key) {
  return api.get(`/api/parent/whistleblower/${encodeURIComponent(key)}/`);
}

export async function fetchConferenceSlots(childId) {
  const q = childId ? `?child=${childId}` : '';
  const res = await api.get(`/api/parent/conferences/${q}`);
  return res.slots || [];
}

export async function claimConferenceSlot(slotId, { topic }) {
  return api.post(`/api/parent/conferences/${slotId}/claim/`, { topic });
}

export async function cancelConferenceSlot(slotId) {
  return api.delete(`/api/parent/conferences/${slotId}/claim/`);
}

export async function fetchCounsellor() {
  return api.get('/api/parent/counsellor/'); // {counsellorName, availability, thread}
}

export async function sendCounsellorMessage(text, { anonymous } = {}) {
  const res = await api.post('/api/parent/counsellor/', { text, anonymous: !!anonymous });
  return res.sent;
}

export async function fetchTeacherThreads(childId) {
  const res = await api.get(`/api/parent/children/${childId}/teacher-threads/`);
  return res.threads || [];
}

export async function sendTeacherMessage(childId, teacherId, text) {
  const res = await api.post(`/api/parent/children/${childId}/teacher-threads/${teacherId}/`, {
    teacher_id: teacherId,
    text,
  });
  return res.sent;
}

export async function fetchCoGuardians() {
  const res = await api.get('/api/parent/co-guardians/');
  return res.guardians || [];
}

export async function inviteCoGuardian({ name, email, relationship, children }) {
  return api.post('/api/parent/co-guardians/', { name, email, relationship, children });
}

export async function removeCoGuardian(id) {
  return api.delete(`/api/parent/co-guardians/${id}/`);
}

export async function fetchPickupAllowList() {
  const res = await api.get('/api/parent/pickup/');
  return res.pickups || [];
}

export async function addPickup({ name, relationship, phone, expiry, children, photoColor }) {
  return api.post('/api/parent/pickup/', {
    name, relationship, phone, expiry: expiry || null, children, photo_color: photoColor,
  });
}

export async function removePickup(id) {
  return api.delete(`/api/parent/pickup/${id}/`);
}

export async function fetchPermissionSlips() {
  const res = await api.get('/api/parent/permission-slips/');
  return res.slips || [];
}

export async function signPermissionSlip(id, { studentId }) {
  return api.post(`/api/parent/permission-slips/${id}/sign/`, { student_id: studentId });
}

export async function acknowledgeRecord({ kind, id }) {
  return api.post('/api/parent/acknowledgments/', { record_type: kind, record_id: id });
}

export async function fetchAcknowledgments() {
  const res = await api.get('/api/parent/acknowledgments/');
  return res.acknowledgments || [];
}

export async function fetchParentEvents() {
  const res = await api.get('/api/parent/events/');
  return res.events || [];
}

export async function fetchDonations() {
  return api.get('/api/parent/donations/'); // {campaigns, totalSponsored, totalPledged}
}

export async function donateToCampaign(campaignId, amount) {
  return api.post('/api/parent/donations/', { campaign_id: campaignId, amount }); // {receiptHash, status:'pledged', note}
}

export async function fetchEndOfTermPack({ childId }) {
  return api.post(`/api/parent/children/${childId}/end-of-term-pack/`); // {generatedAt, size, items}
}

export async function fetchWeeklyDigest() {
  return api.get('/api/parent/weekly-digest/'); // {weekOf, summary, perChild}
}

export async function fetchVoiceDigest() {
  return api.get('/api/parent/voice-digest/'); // {text}
}

export async function fetchFamilyActivity(limit = 12) {
  const res = await api.get(`/api/parent/family-activity/?limit=${limit}`);
  return res.activity || [];
}
