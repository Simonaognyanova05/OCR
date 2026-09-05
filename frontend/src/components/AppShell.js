import { NavLink, Outlet } from 'react-router-dom';
import styles from './AppShell.module.css';
import responsiveStyles from './Responsive.module.css';

const iconPaths = {
  home: ['M3 11.5 12 4l9 7.5', 'M5.5 10v10h13V10', 'M9.5 20v-6h5v6'],
  scan: ['M4 8V5a1 1 0 0 1 1-1h3', 'M16 4h3a1 1 0 0 1 1 1v3', 'M20 16v3a1 1 0 0 1-1 1h-3', 'M8 20H5a1 1 0 0 1-1-1v-3', 'M8 12h8'],
  files: ['M7 3h8l4 4v14H7z', 'M15 3v5h5', 'M10 13h6', 'M10 17h6'],
  contract: ['M6 3h9l4 4v14H6z', 'M15 3v5h5', 'M9 13h7', 'M9 17h5'],
  company: ['M4 21V7l8-4 8 4v14', 'M9 21v-5h6v5', 'M8 9h.01', 'M12 9h.01', 'M16 9h.01', 'M8 12h.01', 'M12 12h.01', 'M16 12h.01'],
  admin: ['M12 3 20 7v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z', 'M9 12l2 2 4-4'],
  logout: ['M10 17l5-5-5-5', 'M15 12H3', 'M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5'],
};

function Icon({ name, size = 20 }) {
  return (
    <svg aria-hidden="true" className="ui-icon" width={size} height={size} viewBox="0 0 24 24" fill="none">
      {iconPaths[name].map((path) => <path key={path} d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />)}
    </svg>
  );
}

const primaryItems = [
  { to: '/', label: 'Начало', icon: 'home', end: true },
  { to: '/workspace', label: 'Сканирай', icon: 'scan' },
];

const documentItems = [
  { to: '/documents', label: 'Фактури и бележки', mobileLabel: 'Фактури', icon: 'files' },
  { to: '/contracts', label: 'Договори', mobileLabel: 'Договори', icon: 'contract' },
];

const utilityItems = [
  { to: '/company', label: 'Фирма', icon: 'company' },
];

function AppShell({ auth, health, onLogout }) {
  const utilities = auth.user?.is_admin
    ? [...utilityItems, { to: '/admin', label: 'Админ', icon: 'admin' }]
    : utilityItems;

  return (
    <div className={`${styles.moduleRoot} ${responsiveStyles.moduleRoot} app-shell app-shell-v2`}>
      <aside className="sidebar">
        <div className="brand brand-v2">
          <div className="brand-mark" aria-hidden="true"><span>C</span></div>
          <div>
            <strong>Centche</strong>
            <span>Document intelligence</span>
          </div>
        </div>

        <div className="nav-caption">Работно пространство</div>
        <nav className="main-nav" aria-label="Основна навигация">
          {primaryItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}

          <div className="nav-section">
            <div className="nav-section-title">
              <Icon name="files" size={17} />
              <span>Документи</span>
            </div>
            <div className="nav-section-links">
              {documentItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => (isActive ? 'nav-link nav-sub-link active' : 'nav-link nav-sub-link')}
                >
                  <Icon name={item.icon} />
                  <span className="desktop-nav-label">{item.label}</span>
                  <span className="mobile-nav-label">{item.mobileLabel}</span>
                </NavLink>
              ))}
            </div>
          </div>

          {utilities.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-account">
          <div className="account-avatar" aria-hidden="true">P</div>
          <div>
            <strong>pointsmart909@gmail.com</strong>
            <span>owner</span>
          </div>
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div className="topbar-title">
            <p className="eyebrow">Организация</p>
            <h1>{auth.company?.name || 'Фирмен акаунт'}</h1>
          </div>
          <div className="topbar-actions">
            <div className={health?.ok ? 'status ok' : 'status'}>
              <i aria-hidden="true" />
              <span>{health?.ok ? 'Системата е активна' : 'Няма връзка със системата'}</span>
            </div>
            <div className="user-chip">
              <strong>{auth.user?.email}</strong>
              <span>{auth.user?.is_admin ? `${auth.membership?.role} · admin` : auth.membership?.role}</span>
            </div>
            <button type="button" className="icon-button" onClick={onLogout} aria-label="Изход от профила" title="Изход">
              <Icon name="logout" />
            </button>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;
