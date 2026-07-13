import styles from './AuthPanel.module.css';

function AuthPanel({
  authForm,
  authMode,
  error,
  loading,
  notice,
  onAuthFormChange,
  onAuthModeChange,
  onSubmit,
}) {
  return (
    <section className={`${styles.moduleRoot} auth-panel`}>
      <div className="auth-tabs">
        <button type="button" className={authMode === 'login' ? '' : 'secondary-button'} onClick={() => onAuthModeChange('login')}>
          Вход
        </button>
        <button type="button" className={authMode === 'register' ? '' : 'secondary-button'} onClick={() => onAuthModeChange('register')}>
          Регистрация
        </button>
      </div>
      <form className="edit-form" onSubmit={onSubmit}>
        {authMode === 'register' && (
          <>
            <label className="field">
              <span>Име</span>
              <input value={authForm.name} onChange={(event) => onAuthFormChange({ ...authForm, name: event.target.value })} />
            </label>
            <label className="field">
              <span>Фирма</span>
              <input value={authForm.company_name} onChange={(event) => onAuthFormChange({ ...authForm, company_name: event.target.value })} />
            </label>
          </>
        )}
        <label className="field">
          <span>Имейл</span>
          <input type="email" value={authForm.email} onChange={(event) => onAuthFormChange({ ...authForm, email: event.target.value })} />
        </label>
        <label className="field">
          <span>Парола</span>
          <input type="password" value={authForm.password} onChange={(event) => onAuthFormChange({ ...authForm, password: event.target.value })} />
        </label>
        <button type="submit" disabled={loading}>{authMode === 'register' ? 'Създай акаунт' : 'Влез'}</button>
      </form>
      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}
    </section>
  );
}

export default AuthPanel;
