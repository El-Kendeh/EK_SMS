import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParentNotifications } from '../../hooks/useParentNotifications';
import { getNotifMeta, formatParentRelativeTime } from '../../utils/parentUtils';
import './ParentNotifications.css';

const FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'aminata',  label: 'Aminata' },
  { key: 'mohamed',  label: 'Mohamed' },
  { key: 'system',   label: 'System' },
];

export default function ParentNotifications() {
  const [activeFilter, setActiveFilter] = useState('all');
  const { notifications, loading, markRead, markAllRead, hasUnread } = useParentNotifications();

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    if (activeFilter === 'system') return notifications.filter((n) => !n.childId);
    return notifications.filter((n) =>
      n.childName?.toLowerCase().includes(activeFilter)
    );
  }, [notifications, activeFilter]);

  const itemVariants = {
    hidden:  { opacity: 0, x: -12 },
    visible: (i) => ({ opacity: 1, x: 0, transition: { duration: 0.26, delay: i * 0.05 } }),
    exit:    { opacity: 0, x: 12, transition: { duration: 0.18 } },
  };

  return (
    <div className="par-notifs">
      {/* Security shield banner */}
      <div className="par-notifs__shield">
        <div className="par-notifs__shield-icon">
          <span className="material-symbols-outlined">security</span>
        </div>
        <div>
          <h3 className="par-notifs__shield-title">Academic Integrity Shield</h3>
          <p className="par-notifs__shield-sub">
            Parents are part of the academic security chain. Your vigilance ensures that the digital archive remains
            an immutable record of progress.
          </p>
        </div>
        <span className="material-symbols-outlined par-notifs__shield-bg-icon">verified_user</span>
      </div>

      {/* Header row */}
      <div className="par-notifs__header">
        <div>
          <h1 className="par-page-header__title">Notifications</h1>
          <p className="par-page-header__sub">Review activity and security alerts for your children.</p>
        </div>
        <button
          className="par-notifs__mark-all"
          onClick={markAllRead}
          disabled={!hasUnread}
        >
          Mark all as read
        </button>
      </div>

      {/* Child filter tabs */}
      <div className="par-notifs__filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`par-notifs__filter-btn ${activeFilter === f.key ? 'par-notifs__filter-btn--active' : ''}`}
            onClick={() => setActiveFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div>
          {[0,1,2,3].map((i) => (
            <div key={i} className="par-skeleton" style={{ height: 90, marginBottom: 12, borderRadius: 14 }} />
          ))}
        </div>
      )}

      {/* List */}
      {!loading && (
        <div className="par-notifs__list">
          <AnimatePresence>
            {filtered.length === 0 ? (
              <div className="par-empty">
                <span className="material-symbols-outlined">notifications_off</span>
                <p>No notifications here.</p>
              </div>
            ) : (
              filtered.map((notif, idx) => {
                const meta = getNotifMeta(notif.type);
                const isUnread = !notif.isRead;
                const isCritical = notif.type === 'security_alert';

                return (
                  <motion.div
                    key={notif.id}
                    className={`par-notif-item par-notif-item--${meta.color} ${isUnread ? 'par-notif-item--unread' : ''}`}
                    custom={idx}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={() => markRead(notif.id)}
                  >
                    <div className={`par-notif-item__icon-wrap par-notif-item__icon-wrap--${meta.color}`}>
                      <span className="material-symbols-outlined"
                        style={{ fontVariationSettings: "'FILL' 1", fontSize: 24 }}>
                        {meta.icon}
                      </span>
                    </div>

                    <div className="par-notif-item__body">
                      <div className="par-notif-item__row">
                        <span className={`par-notif-item__label par-notif-item__label--${meta.color}`}>
                          {notif.childName || meta.label}
                        </span>
                        <span className="par-notif-item__time">
                          {formatParentRelativeTime(notif.createdAt).toUpperCase()}
                        </span>
                      </div>
                      <h4 className="par-notif-item__title">{notif.title}</h4>
                      <p className="par-notif-item__message">{notif.message}</p>
                    </div>

                    {isUnread && <div className="par-notif-item__dot" />}
                    {isCritical && (
                      <span className="material-symbols-outlined par-notif-item__lock">lock</span>
                    )}
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
