import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudentNotifications } from '../../hooks/useStudentNotifications';
import { formatRelativeTime, getNotificationIcon } from '../../utils/studentUtils';
import './StudentNotifications.css';

const FILTERS = [
  { key: 'all',        label: 'All' },
  { key: 'grade',      label: 'Grades' },
  { key: 'alert',      label: 'Alerts' },
  { key: 'assignment', label: 'Assignments' },
  { key: 'class',      label: 'Classes' },
  { key: 'system',     label: 'System' },
];

function getItemColorClass(type) {
  if (!type) return 'system';
  const t = type.toLowerCase();
  if (t.includes('modification') || t.includes('alert') || t.includes('security')) return 'critical';
  if (t.includes('lock') || t.includes('grade') || t.includes('report')) return 'success';
  if (t.includes('assignment') || t.includes('draft') || t.includes('pending') || t.includes('warning')) return 'warning';
  if (t.includes('class') || t.includes('reminder') || t.includes('info') || t.includes('available')) return 'info';
  return 'system';
}

function getFilterCategory(notification) {
  const t = (notification.type || '').toLowerCase();
  const msg = (notification.message || '').toLowerCase();
  if (t.includes('security') || t.includes('modification') || t.includes('alert')) return 'alert';
  if (t.includes('grade') || t.includes('lock') || t.includes('report') || msg.includes('grade')) return 'grade';
  if (t.includes('assignment')) return 'assignment';
  if (t.includes('class') || t.includes('reminder')) return 'class';
  return 'system';
}

function getNavigationTarget(notification) {
  const t = (notification.type || '').toUpperCase();
  if (t.includes('REPORT') || notification.relatedEntityType === 'report_card') return 'report-cards';
  if (t.includes('ASSIGNMENT')) return 'assignments';
  if (t.includes('CLASS') || t.includes('REMINDER')) return 'timetable';
  if (
    t.includes('GRADE') ||
    t.includes('MODIFICATION') ||
    t.includes('LOCK') ||
    notification.relatedEntityType === 'grade'
  ) return 'grades';
  return null;
}

function getCtaLabel(colorClass, navTarget) {
  if (colorClass === 'critical') return 'View Audit Trail';
  if (navTarget === 'report-cards') return 'View Report Card';
  if (navTarget === 'grades') return 'View Grades';
  if (navTarget === 'assignments') return 'View Assignment';
  if (navTarget === 'timetable') return 'View Timetable';
  return null;
}

export default function StudentNotifications({ navigateTo }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const { notifications, loading, markRead, markAllRead, hasUnread } = useStudentNotifications();

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    return notifications.filter((n) => getFilterCategory(n) === activeFilter);
  }, [notifications, activeFilter]);

  const itemVariants = {
    hidden: { opacity: 0, x: -12 },
    visible: (i) => ({ opacity: 1, x: 0, transition: { duration: 0.28, delay: i * 0.05 } }),
    exit:   { opacity: 0, x: 12, transition: { duration: 0.18 } },
  };

  return (
    <div className="snotif">
      {/* Header */}
      <div className="snotif__header">
        <h1 className="snotif__title">Notifications</h1>
        <button
          className="snotif__mark-all"
          onClick={markAllRead}
          disabled={!hasUnread}
        >
          Mark all as read
        </button>
      </div>

      {/* Filters */}
      <div className="snotif__filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`snotif__filter-btn ${activeFilter === f.key ? 'snotif__filter-btn--active' : 'snotif__filter-btn--inactive'}`}
            onClick={() => setActiveFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="snotif-skeleton">
              <div className="skeleton" style={{ height: 14, width: '55%', marginBottom: 10, background: '#F2F4F6', borderRadius: 6 }} />
              <div className="skeleton" style={{ height: 12, width: '80%', background: '#F2F4F6', borderRadius: 6 }} />
            </div>
          ))}
        </div>
      )}

      {/* Notification list */}
      {!loading && (
        <div className="snotif__list">
          <AnimatePresence>
            {filtered.length === 0 ? (
              <motion.div
                className="snotif-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span className="material-symbols-outlined">notifications_off</span>
                <p>No notifications here</p>
              </motion.div>
            ) : (
              filtered.map((notif, idx) => {
                const colorClass = getItemColorClass(notif.type);
                const icon = getNotificationIcon(notif.type);
                const isUnread = !notif.isRead;
                const navTarget = getNavigationTarget(notif);

                const handleItemClick = () => {
                  markRead(notif.id);
                  if (navTarget && navigateTo) navigateTo(navTarget);
                };

                const ctaLabel = getCtaLabel(colorClass, navTarget);

                return (
                  <motion.div
                    key={notif.id}
                    className={`snotif-item snotif-item--${colorClass} ${isUnread ? 'snotif-item--unread' : ''} ${navTarget ? 'snotif-item--clickable' : ''}`}
                    custom={idx}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={handleItemClick}
                  >
                    <div className="snotif-item__inner">
                      {/* Icon */}
                      <div className={`snotif-item__icon snotif-item__icon--${colorClass}`}>
                        <span className="material-symbols-outlined" style={colorClass === 'success' ? { fontVariationSettings: "'FILL' 1" } : {}}>
                          {icon}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="snotif-item__content">
                        <div className="snotif-item__row">
                          <span className="snotif-item__title">{notif.title}</span>
                          {colorClass === 'critical'
                            ? <span className="snotif-item__critical-tag">Critical</span>
                            : <span className="snotif-item__time">{formatRelativeTime(notif.createdAt)}</span>
                          }
                        </div>
                        <p className="snotif-item__body">{notif.message}</p>

                        {/* CTA for navigable notifications */}
                        {ctaLabel && (
                          <button
                            className="snotif-item__action"
                            onClick={(e) => { e.stopPropagation(); markRead(notif.id); if (navigateTo) navigateTo(navTarget); }}
                          >
                            {ctaLabel}
                            <span className="material-symbols-outlined">arrow_forward</span>
                          </button>
                        )}
                        {colorClass === 'critical' && (
                          <div style={{ marginTop: 6 }}>
                            <span className="snotif-item__time">{formatRelativeTime(notif.createdAt)}</span>
                          </div>
                        )}
                      </div>

                      {/* Unread indicator */}
                      {isUnread && <div className="snotif-item__unread-dot" />}
                    </div>
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
