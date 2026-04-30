import { useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useLowData } from '../../context/LowDataContext';
import AccessibilityControls from '../common/AccessibilityControls';
import './StudentSidebar.css';

const NAV_GROUPS = [
  {
    id: 'academic',
    label: 'Academic',
    items: [
      { section: 'home',          icon: 'dashboard',        label: 'Dashboard' },
      { section: 'timetable',     icon: 'calendar_month',   label: 'Timetable' },
      { section: 'assignments',   icon: 'assignment',       label: 'Assignments' },
      { section: 'grades',        icon: 'auto_stories',     label: 'My Grades' },
      { section: 'report-cards',  icon: 'description',      label: 'Report Cards' },
      { section: 'attendance',    icon: 'fact_check',       label: 'Attendance' },
      { section: 'study-planner', icon: 'event_note',       label: 'Study Planner' },
    ],
  },
  {
    id: 'community',
    label: 'Community',
    items: [
      { section: 'messages',       icon: 'chat',            label: 'Messages',     badge: 'messages' },
      { section: 'office-hours',   icon: 'co_present',      label: 'Office Hours' },
      { section: 'study-groups',   icon: 'groups',          label: 'Study Groups' },
      { section: 'wellbeing',      icon: 'favorite',        label: 'Wellbeing' },
      { section: 'resources',      icon: 'folder_open',     label: 'Resources' },
      { section: 'events',         icon: 'event',           label: 'Events' },
      { section: 'notifications',  icon: 'notifications',   label: 'Notifications' },
    ],
  },
  {
    id: 'me',
    label: 'Me',
    items: [
      { section: 'financials',     icon: 'payments',        label: 'Financials' },
      { section: 'documents',      icon: 'folder_special',  label: 'Document Vault' },
      { section: 'id-card',        icon: 'badge',           label: 'Student ID' },
      { section: 'print-summary',  icon: 'print',           label: 'Print summary' },
      { section: 'profile',        icon: 'person',          label: 'Profile' },
      { section: 'safe-report',    icon: 'privacy_tip',     label: 'Safe Report' },
      { section: 'verify',         icon: 'verified_user',   label: 'Verify a Document' },
    ],
  },
];

export default function StudentSidebar({ activeSection, navigateTo, isOpen, onToggle, onLogout, msgUnread = 0 }) {
  const { unreadCount } = useNotifications();
  const { lowData, toggleLowData } = useLowData();
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const isMobile = window.innerWidth < 768;
  const collapsed = !isOpen && !isMobile;
  const mobileOpen = isMobile && isOpen;

  const sidebarClass = [
    'stu-sidebar',
    collapsed   ? 'collapsed'    : '',
    mobileOpen  ? 'mobile-open'  : '',
  ].filter(Boolean).join(' ');

  const toggleGroup = (id) => setCollapsedGroups((s) => ({ ...s, [id]: !s[id] }));

  return (
    <aside className={sidebarClass} aria-label="Student navigation">
      {!isMobile && (
        <button
          className="stu-sidebar__toggle"
          onClick={onToggle}
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
      )}

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

      <nav className="stu-sidebar__nav">
        {NAV_GROUPS.map((group) => {
          const isGroupCollapsed = collapsedGroups[group.id] && !collapsed;
          return (
            <div key={group.id} className="stu-sidebar__group">
              {!collapsed && (
                <button
                  type="button"
                  className="stu-sidebar__group-label"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={!isGroupCollapsed}
                >
                  <span>{group.label}</span>
                  <span className="material-symbols-outlined">
                    {isGroupCollapsed ? 'expand_more' : 'expand_less'}
                  </span>
                </button>
              )}
              {!isGroupCollapsed && group.items.map((item) => {
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
            </div>
          );
        })}
      </nav>

      <div className="stu-sidebar__footer">
        {!collapsed && (
          <div className="stu-sidebar__a11y">
            <AccessibilityControls compact={collapsed} />
          </div>
        )}

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
