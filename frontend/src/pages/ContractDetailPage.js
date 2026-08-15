import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DocumentPreview from '../components/DocumentPreview';
import { getContract, sendContractReminderEmail } from '../services/contractService';

const contractTypeLabels = {
  Lease: 'Наем',
  SalePurchase: 'Покупко-продажба',
  Service: 'Услуга',
  Client: 'Клиент',
  Supplier: 'Доставчик',
  NDA: 'NDA',
  Employment: 'Трудов',
  License: 'Лицензионен',
  Other: 'Друг',
};

const clauseLabels = {
  Penalty: 'Неустойка',
  AutoRenewal: 'Автоматично подновяване',
  Termination: 'Прекратяване',
  ForceMajeure: 'Форсмажор',
  Confidentiality: 'Конфиденциалност',
  Liability: 'Отговорност',
  Arbitration: 'Арбитраж',
  Exclusivity: 'Изключителност',
  Other: 'Друга',
};

function displayValue(value, fallback = '-') {
  return value === null || value === undefined || value === '' ? fallback : value;
}

function displayMoney(value, currency) {
  if (value === null || value === undefined || value === '') return '-';
  return `${value} ${currency || ''}`.trim();
}

function ContractDetailPage({ auth }) {
  const { id } = useParams();
  const [contract, setContract] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const loadContract = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getContract(id, auth.token);
      setContract(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [auth.token, id]);

  useEffect(() => {
    loadContract();
  }, [loadContract]);

  async function handleSendReminder() {
    if (!contract?.id) return;

    setSending(true);
    setError('');
    setNotice('');

    try {
      const result = await sendContractReminderEmail(contract.id, auth.token);
      setNotice(`Известието е изпратено до ${result.recipient}.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  }

  const data = contract?.data || {};
  const clauses = Array.isArray(data.importantClauses) ? data.importantClauses : [];

  return (
    <>
      <section className="page-hero contract-detail-hero">
        <div>
          <p className="eyebrow">Legal AI</p>
          <h2>{displayValue(data.title, 'Детайли за договор')}</h2>
          <p>{displayValue(data.summary, 'Преглед на извлечените AI данни за договора.')}</p>
        </div>
        <div className="hero-actions">
          <Link className="secondary-button" to="/contracts">Назад към договори</Link>
          <button type="button" onClick={handleSendReminder} disabled={sending || !contract}>
            {sending ? 'Изпращане...' : 'Изпрати email известие'}
          </button>
        </div>
      </section>

      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}
      {loading && <p className="empty">Зареждане на договора...</p>}

      {contract && (
        <section className="contract-detail-layout">
          <section className="documents-panel">
            <div className="panel-heading">
              <h2>Основни данни</h2>
            </div>
            <div className="contract-detail-grid">
              <div><span>Тип</span><strong>{contractTypeLabels[data.contractType] || displayValue(data.contractType)}</strong></div>
              <div><span>Страна A</span><strong>{displayValue(data.partyA)}</strong></div>
              <div><span>Страна B</span><strong>{displayValue(data.partyB)}</strong></div>
              <div><span>Подписан</span><strong>{displayValue(data.signDate)}</strong></div>
              <div><span>Начало</span><strong>{displayValue(data.startDate)}</strong></div>
              <div><span>Край</span><strong>{displayValue(data.endDate)}</strong></div>
              <div><span>Срок</span><strong>{displayValue(data.durationMonths)} месеца</strong></div>
              <div><span>Автоматично подновяване</span><strong>{data.renewsAutomatically === true ? 'Да' : data.renewsAutomatically === false ? 'Не' : '-'}</strong></div>
              <div><span>Стойност</span><strong>{displayMoney(data.contractValue, data.currency)}</strong></div>
              <div><span>Месечно плащане</span><strong>{displayMoney(data.monthlyPayment, data.currency)}</strong></div>
              <div><span>Неустойка</span><strong>{displayMoney(data.penaltyAmount, data.currency)}</strong></div>
              <div><span>Предизвестие</span><strong>{displayValue(data.terminationNoticeDays)} дни</strong></div>
            </div>
          </section>

          <section className="documents-panel">
            <div className="panel-heading">
              <h2>Важни клаузи</h2>
            </div>
            {clauses.length > 0 ? (
              <div className="clause-list">
                {clauses.map((clause) => (
                  <span key={clause}>{clauseLabels[clause] || clause}</span>
                ))}
              </div>
            ) : (
              <p className="empty">Няма разпознати важни клаузи.</p>
            )}
          </section>

          <section className="documents-panel contract-preview-panel">
            <div className="panel-heading">
              <h2>Оригинален файл</h2>
            </div>
            <DocumentPreview result={contract} token={auth.token} />
          </section>

          <section className="documents-panel">
            <div className="panel-heading">
              <h2>JSON данни</h2>
            </div>
            <pre className="json-preview">{JSON.stringify(data, null, 2)}</pre>
          </section>
        </section>
      )}
    </>
  );
}

export default ContractDetailPage;
