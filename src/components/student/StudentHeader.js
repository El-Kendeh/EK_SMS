import { useNotifications } from '../../context/NotificationContext';
import { useStudentProfile } from '../../hooks/useStudentProfile';
import { useSchoolContext } from '../../hooks/useSchoolContext';
import { getInitials, getAvatarColor } from '../../utils/studentUtils';
import './StudentHeader.css';

const POSITION_META = {
  prefit: { label: 'START', color: '#10B981' },
  mid:    { label: 'MID',   color: '#F59E0B' },
  end:    { label: 'END',   color: '#EF4444' },
};

const SECTION_LABELS = {
  home:           'Dashboard',
  grades:         'My Grades',
  'report-cards': 'Report Cards',
  financials:     'Financials',
  notifications:  'Notifications',
  profile:        'Profile',
  timetable:      'Timetable',
  assignments:    'Assignments',
  messages:       'Messages',
  resources:      'Learning Materials',
  attendance:     'Attendance Overview',
  events:         'School Calendar',
};

export default function StudentHeader({ onMenuToggle, activeSection, navigateTo, isSidebarOpen }) {
  const { unreadCount } = useNotifications();
  const { profile } = useStudentProfile();
  const { academicYear, term } = useSchoolContext();

  const fullName   = profile?.fullName || 'Student';
  const studentNum = profile?.studentNumber || '';
  const className  = profile?.currentClass?.name || '';
  const ctxLabel = academicYear ? `${academicYear.name}${term ? ` · ${term.name}` : ''}` : '';
  const posMeta = term?.position ? POSITION_META[term.position] : null;
  const initials   = getInitials(fullName);
  const avatarColor = getAvatarColor(fullName);

  const headerClass = `stu-header ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`;

  return (
    <header className={headerClass}>
      {/* Left */}
      <div className="stu-header__left">
        <button
          className="stu-header__menu-btn"
          onClick={onMenuToggle}
          aria-label="Toggle sidebar"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        <div className="stu-header__context">
          {ctxLabel && <span className="stu-header__term">{ctxLabel}</span>}
          {posMeta && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
              background: posMeta.color + '18', color: posMeta.color,
            }}>
              {posMeta.label}
            </span>
          )}
          <span className="stu-header__section-label">
            {SECTION_LABELS[activeSection] || 'Dashboard'}
          </span>
        </div>
      </div>

      {/* Right */}
      <div className="stu-header__right">
        {className && (
          <div className="stu-header__class-badge">{className}</div>
        )}

        <button
          className="stu-header__bell"
          onClick={() => navigateTo('notifications')}
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <span className="material-symbols-outlined">notifications</span>
          {unreadCount > 0 && <span className="stu-header__bell-dot" />}
        </button>

        <div className="stu-header__user">
          <div className="stu-header__user-info">
            <div className="stu-header__user-name">{fullName}</div>
            {studentNum && (
              <div className="stu-header__user-id">ID: {studentNum}</div>
            )}
          </div>
          <div
            className="stu-header__avatar"
            style={{ background: avatarColor }}
            title={fullName}
          >
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
