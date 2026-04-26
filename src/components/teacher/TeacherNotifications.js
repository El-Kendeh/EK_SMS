import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeacherNotifications } from '../../hooks/useTeacherNotifications';
import { formatRelativeTime } from '../../utils/teacherUtils';
import './TeacherNotifications.css';

function getNotifIcon(type) {
  switch (type) {
    case 'MODIFICATION_ATTEMPT':       return { icon: 'warning',           cls: 'tch-notif-item__icon--security' };
    case 'MODIFICATION_REQUEST_PENDING': return { icon: 'pending_actions', cls: 'tch-notif-item__icon--info' };
    case 'GRADE_LOCKED':               return { icon: 'lock',              cls: 'tch-notif-item__icon--success' };
    case 'GRADE_SUBMITTED':            return { icon: 'check_circle',      cls: 'tch-notif-item__icon--success' };
    default:                           return { icon: 'notifications',     cls: 'tch-notif-item__icon--default' };
  }
}

export default function TeacherNotifications({ navigateTo }) {
  const { notifications, loading, unreadCount, securityAlertCount, markRead, markAllRead } = useTeacherNotifications();
  const [filter, setFilter] = useState('all');

  const filtered = notifications.filter(n => {
    if (filter === 'unread')   return !n.isRead;
    if (filter === 'security') return n.isSecurityAlert;
    return true;
  });

  const securityNotifs = notifications.filter(n => n.isSecurityAlert && !n.isRead);

  return (
    <div>
      <div className="tch-notif-header-row">
        <div>
          <h1 className="tch-page-title">Notifications</h1>
          <p className="tch-page-sub">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            {securityAlertCount > 0 && ` · ${securityAlertCount} security alert${securityAlertCount > 1 ? 's' : ''}`}
          </p>
        </div>
        {unreadCount > 0 && (
          <button className="tch-btn tch-btn--ghost tch-btn--sm" onClick={markAllRead}>
            <span className="material-symbols-outlined">done_all</span>
            Mark All Read
          </button>
        )}
      </div>

      {/* Security alerts top strip */}
      <AnimatePresence>
        {securityNotifs.map(n => (
          <motion.div
            key={n.id}
            className="tch-security-banner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <span className="material-symbols-outlined">warning</span>
            <div style={{ flex: 1 }}>
              <p className="tch-security-banner__title">{n.title}</p>
              <p className="tch-security-banner__text">{n.message}</p>
            </div>
            <button className="tch-btn tch-btn--ghost tch-btn--sm" onClick={() => markRead(n.id)}>
              Dismiss
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Filter tabs */}
      <div className="tch-filter-tabs">
        {[
          { key: 'all',      label: 'All' },
          { key: 'unread',   label: 'Unread' },
          { key: 'security', label: 'Security' },
        ].map(t => (
          <button
            key={t.key}
            className={`tch-filter-tab ${filter === t.key ? 'tch-filter-tab--active' : ''}`}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
            {t.key === 'security' && securityAlertCount > 0 && (
              <span style={{ marginLeft: 4, background: 'var(--tch-error)', color: 'white', borderRadius: 10, padding: '0 5px', fontSize: 9 }}>
                {securityAlertCount}
              </span>
            )}
            {t.key === 'unread' && unreadCount > 0 && (
              <span style={{ marginLeft: 4, background: 'var(--tch-primary)', color: 'white', borderRadius: 10, padding: '0 5px', fontSize: 9 }}>
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0,1,2,3].map(i => <div key={i} className="tch-skeleton" style={{ height: 70 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="tch-empty">
          <span className="material-symbols-outlined">notifications_none</span>
          <p>No notifications in this category</p>
        </div>
      ) : (
        <div>
          {filtered.map((n, i) => {
            const { icon, cls } = getNotifIcon(n.type);
            return (
              <motion.div
                key={n.id}
                className={`tch-notif-item ${!n.isRead ? 'tch-notif-item--unread' : ''} ${n.isSecurityAlert ? 'tch-notif-item--security' : ''}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => !n.isRead && markRead(n.id)}
              >
                <div className={`tch-notif-item__icon ${cls}`}>
                  <span className="material-symbols-outlined">{icon}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="tch-notif-item__title">{n.title}</p>
                  <p className="tch-notif-item__msg">{n.message}</p>
                  <p className="tch-notif-item__time">{formatRelativeTime(n.createdAt)}</p>
                </div>
                {!n.isRead && <span className="tn-unread-dot" />}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
