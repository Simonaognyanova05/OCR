import { NavLink, Outlet } from 'react-router-dom';

const navigationItems = [
  { to: '/', label: 'Табло' },
  { to: '/documents', label: 'Документи' },
  { to: '/workspace', label: 'Качване и преглед' },
  { to: '/company', label: 'Фирма' },
];

function AppShell({ auth, health, onLogout }) {
  const items = auth.user?.is_admin
    ? [...navigationItems, { to: '/admin', label: 'Админ' }]
    : navigationItems;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">O</div>
          <div>
            <strong>OCR Finance</strong>
            <span>Invoice intelligence</span>
          </div>
        </div>

        <nav className="main-nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Премиум работно пространство</p>
            <h1>{auth.company?.name || 'Фирмен акаунт'}</h1>
          </div>
          <div className="topbar-actions">
            <div className={health?.ok ? 'status ok' : 'status'}>
              {health?.ok ? `Backend активен: ${health.model}` : 'Backend не е активен'}
            </div>
            <div className="user-chip">
              <strong>{auth.user?.email}</strong>
              <span>{auth.user?.is_admin ? `${auth.membership?.role} · admin` : auth.membership?.role}</span>
            </div>
            <button type="button" className="secondary-button" onClick={onLogout}>
              Изход
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
