function AccountBar({ auth, onLogout }) {
  return (
    <section className="account-bar">
      <div>
        <strong>{auth.company?.name}</strong>
        <span>{auth.user?.email} · роля: {auth.membership?.role}</span>
      </div>
      <button type="button" className="secondary-button" onClick={onLogout}>
        Изход
      </button>
    </section>
  );
}

export default AccountBar;

