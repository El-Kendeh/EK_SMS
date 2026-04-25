import { useNotifications } from '../../context/NotificationContext';
import { useLowData } from '../../context/LowDataContext';
import './StudentSidebar.css';

const NAV_ITEMS = [
  { section: 'home',          icon: 'dashboard',    label: 'Dashboard' },
  { section: 'timetable',     icon: 'calendar_month', label: 'Timetable' },
  { section: 'assignments',   icon: 'assignment',   label: 'Assignments' },
  { section: 'grades',        icon: 'auto_stories', label: 'My Grades' },
  { section: 'report-cards',  icon: 'description',  label: 'Report Cards' },
  { section: 'messages',      icon: 'chat',         label: 'Messages',    badge: 'messages' },
  { section: 'financials',    icon: 'payments',     label: 'Financials' },
  { section: 'notifications', icon: 'notifications', label: 'Notifications' },
  { section: 'profile',       icon: 'person',       label: 'Profile' },
];

export default function StudentSidebar({ activeSection, navigateTo, isOpen, onToggle, onLogout, msgUnread = 0 }) {
  const { unreadCount } = useNotifications();
  const { lowData, toggleLowData } = useLowData();

  const isMobile = window.innerWidth < 768;
  const collapsed = !isOpen && !isMobile;
  const mobileOpen = isMobile && isOpen;

  const sidebarClass = [
    'stu-sidebar',
    collapsed   ? 'collapsed'    : '',
    mobileOpen  ? 'mobile-open'  : '',
  ].filter(Boolean).join(' ');

  return (
    <aside className={sidebarClass} aria-label="Student navigation">

      {/* Desktop collapse toggle */}
      {!isMobile && (
        <button
          className="stu-sidebar__toggle"
          onClick={onToggle}
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
      )}

      {/* Brand */}
      <div className="stu-sidebar__brand">
        <div className="stu-sidebar__brand-icon">
          <span className="material-symbols-outlined">school</span>
        </div>
        {!collapsed && (
          <div style={{ marginTop: '10px' }}>
            <div className="stu-sidebar__brand-title">EK-SMS</div>
            <div className="stu-sidebar__brand-sub">Student Portal</div>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="stu-sidebar__nav">
        {NAV_ITEMS.map((item) => {
          const { section, icon, label } = item;
          const isActive = activeSection === section;
          const badgeCount = section === 'notifications' ? unreadCount
            : (item.badge === 'messages' ? msgUnread : 0);
          const showBadge = badgeCount > 0;

          return (
            <button
              key={section}
              className={`stu-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => navigateTo(section)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="material-symbols-outlined stu-nav-item__icon">{icon}</span>
              <span className="stu-nav-item__label">{label}</span>
              {showBadge && (
                <span className="stu-nav-item__badge">
                  {badgeCount > 9 ? '9+' : badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="stu-sidebar__footer">
        {/* Low-data toggle */}
        <button
          className={`stu-sidebar__low-data ${lowData ? 'active' : ''}`}
          onClick={toggleLowData}
          title={lowData ? 'Low-data mode on' : 'Low-data mode off'}
          aria-pressed={lowData}
        >
          <span className="material-symbols-outlined">{lowData ? 'signal_cellular_alt_1_bar' : 'signal_cellular_alt'}</span>
          <span>Low Data</span>
          <span className={`stu-low-data-pill ${lowData ? 'stu-low-data-pill--on' : ''}`}>
            {lowData ? 'ON' : 'OFF'}
          </span>
        </button>

        <button className="stu-sidebar__logout" onClick={onLogout} aria-label="Sign out">
          <span className="material-symbols-outlined">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
