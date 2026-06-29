function CompanyPanel({ auth, companyDraft, onSave, onUpdate, saving }) {
  return (
    <section className="company-panel">
      <h2>Фирмен профил</h2>
      <div className="edit-form">
        <label className="field">
          <span>Име на фирма</span>
          <input value={companyDraft?.name || ''} onChange={(event) => onUpdate('name', event.target.value)} />
        </label>
        <label className="field">
          <span>ЕИК</span>
          <input value={companyDraft?.tax_id || ''} onChange={(event) => onUpdate('tax_id', event.target.value)} />
        </label>
        <label className="field">
          <span>ДДС номер</span>
          <input value={companyDraft?.vat_id || ''} onChange={(event) => onUpdate('vat_id', event.target.value)} />
        </label>
        <label className="field">
          <span>Адрес</span>
          <input value={companyDraft?.address || ''} onChange={(event) => onUpdate('address', event.target.value)} />
        </label>
        <label className="field">
          <span>План</span>
          <select value={companyDraft?.plan || 'free'} onChange={(event) => onUpdate('plan', event.target.value)}>
            <option value="free">Free · 50 документа</option>
            <option value="starter">Starter · 200 документа</option>
            <option value="pro">Pro · 1000 документа</option>
            <option value="business">Business · 5000 документа</option>
          </select>
        </label>
        <label className="field">
          <span>Месечен лимит</span>
          <input disabled value={companyDraft?.document_limit || ''} />
        </label>
      </div>
      <div className="actions">
        <button type="button" onClick={onSave} disabled={saving || auth.membership?.role !== 'owner'}>
          Запази фирмения профил
        </button>
      </div>
    </section>
  );
}

export default CompanyPanel;

