import CompanyPanel from '../components/CompanyPanel';

function CompanyPage({ auth, companyDraft, onSave, onUpdate, saving }) {
  return (
    <>
      <section className="page-hero">
        <div>
          <p className="eyebrow">Настройки</p>
          <h2>Фирмен профил и план</h2>
          <p>Поддържай фирмените данни, ДДС номера и лимита според плана.</p>
        </div>
      </section>
      <CompanyPanel
        auth={auth}
        companyDraft={companyDraft}
        onSave={onSave}
        onUpdate={onUpdate}
        saving={saving}
      />
    </>
  );
}

export default CompanyPage;

