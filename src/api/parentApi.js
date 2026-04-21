import {
  mockParent,
  mockChildren,
  mockGradesByChild,
  mockReportCards,
  mockParentNotifications,
  mockParentProfile,
} from '../mock/parentMockData';

const USE_MOCK = process.env.REACT_APP_USE_MOCK_DATA === 'true';
const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

// ── Children ────────────────────────────────────────────────────────────────
export async function fetchParentChildren() {
  if (USE_MOCK) {
    await delay(400);
    return { children: mockChildren, parent: mockParent };
  }
  const token = localStorage.getItem('token');
  const res = await fetch('/api/parent/children/', { headers: { Authorization: `Token ${token}` } });
  return res.json();
}

// ── Grades ───────────────────────────────────────────────────────────────────
export async function fetchChildGrades(childId) {
  if (USE_MOCK) {
    await delay(450);
    return { grades: mockGradesByChild[childId] || [] };
  }
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/parent/children/${childId}/grades/`, { headers: { Authorization: `Token ${token}` } });
  return res.json();
}

// ── Report Cards ─────────────────────────────────────────────────────────────
export async function fetchChildReportCards(childId) {
  if (USE_MOCK) {
    await delay(500);
    return { reportCards: mockReportCards[childId] || [] };
  }
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/parent/children/${childId}/report-cards/`, { headers: { Authorization: `Token ${token}` } });
  return res.json();
}

// ── Notifications ─────────────────────────────────────────────────────────────
export async function fetchParentNotifications() {
  if (USE_MOCK) {
    await delay(350);
    return { notifications: mockParentNotifications };
  }
  const token = localStorage.getItem('token');
  const res = await fetch('/api/parent/notifications/', { headers: { Authorization: `Token ${token}` } });
  return res.json();
}

export async function markParentNotificationRead(notifId) {
  if (USE_MOCK) { await delay(200); return { success: true }; }
  const token = localStorage.getItem('token');
  const res = await fetch('/api/parent/notifications/', {
    method: 'POST',
    headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ notification_id: notifId }),
  });
  return res.json();
}

export async function markAllParentNotificationsRead() {
  if (USE_MOCK) { await delay(200); return { success: true }; }
  return { success: true };
}

// ── Profile ───────────────────────────────────────────────────────────────────
export async function fetchParentProfile() {
  if (USE_MOCK) {
    await delay(400);
    return { profile: mockParentProfile };
  }
  const token = localStorage.getItem('token');
  const res = await fetch('/api/parent/profile/', { headers: { Authorization: `Token ${token}` } });
  return res.json();
}
