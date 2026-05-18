import apiClient from './client';

const api = apiClient;

export async function fetchParentChildren() {
  return api.request('/api/parent/children/');
}

export async function fetchChildGrades(childId, termId) {
  const q = termId ? `?term_id=${termId}` : '';
  return api.request(`/api/parent/children/${childId}/grades/${q}`);
}

export async function fetchChildGradeHistory(childId, gradeId) {
  return api.request(`/api/parent/children/${childId}/grades/${gradeId}/history/`);
}

export async function fetchChildReportCards(childId) {
  return api.request(`/api/parent/children/${childId}/report-cards/`);
}

export async function downloadChildReportCard(childId, reportCardId) {
  return api.request(`/api/parent/children/${childId}/report-cards/${reportCardId}/download/`);
}

export async function fetchParentNotifications(limit) {
  const q = limit ? `?limit=${limit}` : '';
  return api.request(`/api/parent/notifications/${q}`);
}

export async function markParentNotificationRead(notifId) {
  return api.request('/api/parent/notifications/', {
    method: 'POST',
    body: { notification_id: notifId },
  });
}

export async function markAllParentNotificationsRead() {
  return api.request('/api/parent/notifications/', {
    method: 'POST',
    body: { mark_all: true },
  });
}

export async function fetchParentProfile() {
  return api.request('/api/parent/profile/');
}

export async function updateParentProfile(patch) {
  return api.request('/api/parent/profile/', { method: 'PATCH', body: patch });
}

export async function get2FASetup() {
  return api.request('/api/parent/2fa/setup/');
}

export async function enable2FA(otp) {
  return api.request('/api/parent/2fa/setup/', {
    method: 'POST',
    body: { action: 'enable', otp_code: otp },
  });
}

export async function disable2FA() {
  return api.request('/api/parent/2fa/setup/', {
    method: 'POST',
    body: { action: 'disable' },
  });
}

export async function fetchChildAttendance(childId, monthStart) {
  const q = monthStart ? `?month=${encodeURIComponent(monthStart)}` : '';
  return api.request(`/api/parent/children/${childId}/attendance/${q}`);
}

export async function fetchChildBehavior(childId) {
  return api.request(`/api/parent/children/${childId}/behavior/`);
}

export async function fetchChildFees(childId) {
  return api.request(`/api/parent/children/${childId}/fees/`);
}

export async function fetchPaymentChannels() {
  return api.request('/api/parent/payment-channels/');
}

export async function startPayment({ childId, transactionId, amount, channelId, instalments }) {
  return api.request('/api/parent/payments/start/', {
    method: 'POST',
    body: { child_id: childId, transaction_id: transactionId, amount, channel_id: channelId, instalments },
  });
}

export async function fetchReceipts(childId) {
  const q = childId ? `?child=${childId}` : '';
  return api.request(`/api/parent/receipts/${q}`);
}

export async function downloadReceiptPdf(receiptId) {
  return api.request(`/api/parent/receipts/${receiptId}/download/`);
}

export async function verifyHash(hash) {
  return api.request(`/api/verify/${encodeURIComponent(hash)}/`);
}

export async function fetchTamperCount(childId) {
  return api.request(`/api/parent/children/${childId}/tamper-count/`);
}

export async function fetchWhereIveBeen() {
  return api.request('/api/parent/access-log/');
}

export async function submitModificationObjection({ childId, gradeId, message }) {
  return api.request(`/api/parent/children/${childId}/grades/${gradeId}/objection/`, {
    method: 'POST',
    body: { message },
  });
}

export async function fetchChannelPreferences() {
  return api.request('/api/parent/channel-preferences/');
}

export async function updateChannelPreferences(prefs) {
  return api.request('/api/parent/channel-preferences/', { method: 'PATCH', body: prefs });
}

export async function fetchWhistleblowerCategories() {
  return api.request('/api/parent/whistleblower/categories/');
}

export async function submitWhistleblowerReport({ category, message }) {
  return api.request('/api/parent/whistleblower/submit/', {
    method: 'POST',
    body: { category, message },
  });
}

export async function checkWhistleblowerStatus(key) {
  return api.request(`/api/parent/whistleblower/${encodeURIComponent(key)}/`);
}

export async function fetchConferenceSlots(childId) {
  const q = childId ? `?child=${childId}` : '';
  return api.request(`/api/parent/conferences/${q}`);
}

export async function claimConferenceSlot(slotId, { topic }) {
  return api.request(`/api/parent/conferences/${slotId}/claim/`, {
    method: 'POST',
    body: { topic },
  });
}

export async function cancelConferenceSlot(slotId) {
  return api.request(`/api/parent/conferences/${slotId}/claim/`, { method: 'DELETE' });
}

export async function fetchCounsellor() {
  return api.request('/api/parent/counsellor/');
}

export async function sendCounsellorMessage(text, { anonymous } = {}) {
  return api.request('/api/parent/counsellor/', {
    method: 'POST',
    body: { text, anonymous: !!anonymous },
  });
}

export async function fetchTeacherThreads(childId) {
  return api.request(`/api/parent/children/${childId}/teacher-threads/`);
}

export async function sendTeacherMessage(childId, subjectId, text) {
  return api.request(`/api/parent/children/${childId}/teacher-threads/${subjectId}/`, {
    method: 'POST',
    body: { text },
  });
}

export async function fetchCoGuardians() {
  return api.request('/api/parent/co-guardians/');
}

export async function inviteCoGuardian({ name, email, relationship, children }) {
  return api.request('/api/parent/co-guardians/', {
    method: 'POST',
    body: { name, email, relationship, children },
  });
}

export async function removeCoGuardian(id) {
  return api.request(`/api/parent/co-guardians/${id}/`, { method: 'DELETE' });
}

export async function fetchPickupAllowList() {
  return api.request('/api/parent/pickup/');
}

export async function addPickup({ name, relationship, phone, expiry, children, photoColor }) {
  return api.request('/api/parent/pickup/', {
    method: 'POST',
    body: { name, relationship, phone, expiry, children, photo_color: photoColor },
  });
}

export async function removePickup(id) {
  return api.request(`/api/parent/pickup/${id}/`, { method: 'DELETE' });
}

export async function fetchPermissionSlips() {
  return api.request('/api/parent/permission-slips/');
}

export async function signPermissionSlip(id, { otp }) {
  return api.request(`/api/parent/permission-slips/${id}/sign/`, {
    method: 'POST',
    body: { otp },
  });
}

export async function acknowledgeRecord({ kind, id }) {
  return api.request('/api/parent/acknowledgments/', {
    method: 'POST',
    body: { kind, id },
  });
}

export async function fetchAcknowledgments() {
  return api.request('/api/parent/acknowledgments/');
}

export async function fetchParentEvents() {
  return api.request('/api/parent/events/');
}

export async function fetchDonations() {
  return api.request('/api/parent/donations/');
}

export async function donateToCampaign(campaignId, amount) {
  return api.request('/api/parent/donations/', {
    method: 'POST',
    body: { campaign_id: campaignId, amount },
  });
}

export async function fetchEndOfTermPack({ childId }) {
  return api.request(`/api/parent/children/${childId}/end-of-term-pack/`, { method: 'POST' });
}

export async function fetchWeeklyDigest() {
  return api.request('/api/parent/weekly-digest/');
}

export async function fetchVoiceDigest() {
  return api.request('/api/parent/voice-digest/');
}

export async function fetchFamilyActivity(limit = 12) {
  return api.request(`/api/parent/family-activity/?limit=${limit}`);
}
