import { BILLING_INFO, buildPaymentReason } from '../config/billing';
import styles from './CompanyPanel.module.css';

const planPricesMonthlyEur = {
  starter: 15,
  pro: 49,
  business: 149,
};

const fallbackPlans = [
  { id: 'free', name: 'Free', documentLimit: 50, description: 'За тест и малък обем документи.' },
  { id: 'starter', name: 'Starter', documentLimit: 200, description: 'За малки фирми с регулярни документи.' },
  { id: 'pro', name: 'Pro', documentLimit: 1000, description: 'За активни фирми и счетоводни екипи.' },
  { id: 'business', name: 'Business', documentLimit: 5000, description: 'За счетоводни къщи и голям обем документи.' },
];

function PaymentInstructions({ companyName, plan }) {
  const reason = buildPaymentReason(companyName, plan);

  return (
    <div className="payment-box">
      <h3>Плащане по банков път</h3>
      <p>
        За да бъде активиран избраният план, направи банков превод по сметката по-долу.
        След като плащането бъде потвърдено, екипът ще активира абонамента.
      </p>
      <div className="payment-grid">
        <div>
          <span>Получател</span>
          <strong>{BILLING_INFO.beneficiary}</strong>
        </div>
        <div>
          <span>IBAN</span>
          <strong>{BILLING_INFO.iban}</strong>
        </div>
        {BILLING_INFO.bank && (
          <div>
            <span>Банка</span>
            <strong>{BILLING_INFO.bank}</strong>
          </div>
        )}
        <div>
          <span>Основание</span>
          <strong>{reason}</strong>
        </div>
      </div>
      <p className="payment-note">
        В основанието посочи името на фирмата и заявения план, за да обработим плащането по-бързо.
      </p>
    </div>
  );
}

function CompanyPanel({
  auth,
  companyDraft,
  onRequestSubscription,
  onSave,
  onUpdate,
  requestedPlan,
  saving,
  setRequestedPlan,
}) {
  const plans = (auth.plans || fallbackPlans).map((plan) => ({
    ...plan,
    priceMonthlyEur: plan.priceMonthlyEur ?? planPricesMonthlyEur[plan.id] ?? null,
  }));
  const currentPlan = companyDraft?.plan || auth.company?.plan || 'free';
  const pendingRequest = auth.pending_subscription_request;
  const selectedPlan = requestedPlan || currentPlan;
  const paymentPlan = pendingRequest?.requested_plan || selectedPlan;

  return (
    <>
      <section className={`${styles.moduleRoot} company-panel`}>
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
            <span>Активен план</span>
            <input disabled value={currentPlan} />
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

      <section className="company-panel">
        <div className="panel-heading">
          <div>
            <h2>Абонамент</h2>
            <p className="panel-subtitle">
              Избери план и изпрати заявка. След това заплати по банков път, за да бъде активиран абонаментът.
            </p>
          </div>
        </div>

        {pendingRequest && (
          <div className="warning-box">
            Има чакаща заявка за план <strong>{pendingRequest.requested_plan}</strong> със статус <strong>{pendingRequest.status}</strong>.
          </div>
        )}

        <div className="plans-grid">
          {plans.map((plan) => (
            <label key={plan.id} className={`plan-card ${selectedPlan === plan.id ? 'selected' : ''}`}>
              <input
                type="radio"
                name="subscription-plan"
                checked={selectedPlan === plan.id}
                onChange={() => setRequestedPlan(plan.id)}
                disabled={saving || Boolean(pendingRequest)}
              />
              <strong>{plan.name}</strong>
              {plan.priceMonthlyEur ? (
                <b className="plan-price">€{plan.priceMonthlyEur} / месец</b>
              ) : null}
              <span>{plan.documentLimit} документа / месец</span>
              <p>{plan.description}</p>
            </label>
          ))}
        </div>

        <div className="actions">
          <button
            type="button"
            onClick={() => onRequestSubscription(selectedPlan)}
            disabled={saving || auth.membership?.role !== 'owner' || selectedPlan === currentPlan || Boolean(pendingRequest)}
          >
            Заяви абонамент
          </button>
        </div>

        {(pendingRequest || selectedPlan !== currentPlan) && (
          <PaymentInstructions companyName={companyDraft?.name || auth.company?.name} plan={paymentPlan} />
        )}
      </section>
    </>
  );
}

export default CompanyPanel;
