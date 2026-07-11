import CompanyPanel from '../components/CompanyPanel';

function CompanyPage({
  auth,
  companyDraft,
  onRequestSubscription,
  onSave,
  onUpdate,
  requestedPlan,
  saving,
  setRequestedPlan,
}) {
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
        onRequestSubscription={onRequestSubscription}
        onSave={onSave}
        onUpdate={onUpdate}
        requestedPlan={requestedPlan}
        saving={saving}
        setRequestedPlan={setRequestedPlan}
      />
    </>
  );
}

export default CompanyPage;
