import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { initialContractFilters, useContracts } from '../hooks/useContracts';

const contractTypeOptions = [
  ['Lease', 'Наем'],
  ['SalePurchase', 'Покупко-продажба'],
  ['Service', 'Услуга'],
  ['Client', 'Клиент'],
  ['Supplier', 'Доставчик'],
  ['NDA', 'NDA'],
  ['Employment', 'Трудов'],
  ['License', 'Лицензионен'],
  ['Other', 'Друг'],
];

const contractTypeLabels = Object.fromEntries(contractTypeOptions);

const contractStatusLabels = {
  uploaded: 'качен',
  processing: 'обработва се',
  extracted: 'разпознат',
  failed: 'неуспешен',
};

function ContractsPage({ auth }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const {
    contractFilters,
    contracts,
    loadContracts,
    setContractFilters,
  } = useContracts(auth, setError);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  function updateFilter(name, value) {
    setContractFilters((current) => ({ ...current, [name]: value }));
  }

  function applyQuickFilter(nextFilters) {
    const filters = { ...initialContractFilters, ...nextFilters };
    setContractFilters(filters);
    loadContracts(filters);
  }

  function clearFilters() {
    setContractFilters(initialContractFilters);
    loadContracts(initialContractFilters);
  }

  return (
    <>
      <section className="page-hero">
        <div>
          <p className="eyebrow">Документооборот</p>
          <h2>Договори</h2>
          <p>Търси и преглеждай договорите, качени през общата форма за документи.</p>
        </div>
      </section>

      <section className="workspace contracts-workspace">
        <section className="documents-panel contract-search-panel">
          <div className="panel-heading">
            <div>
              <h2>Търсене</h2>
              <p className="panel-subtitle">Бързи справки и точни филтри за договори.</p>
            </div>
          </div>

          <div className="quick-filter-row">
            <button type="button" className="secondary-button" onClick={() => applyQuickFilter({ expiresInDays: '30' })}>Изтичат до 30 дни</button>
            <button type="button" className="secondary-button" onClick={() => applyQuickFilter({ penaltyMin: '5000' })}>Неустойка над 5000</button>
            <button type="button" className="secondary-button" onClick={() => applyQuickFilter({ renewsAutomatically: 'true' })}>Автоматично подновяване</button>
            <button type="button" className="secondary-button" onClick={() => applyQuickFilter({ contractType: 'NDA' })}>Всички NDA</button>
          </div>

          <div className="contract-filter-bar">
            <label className="field">
              <span>Тип договор</span>
              <select value={contractFilters.contractType} onChange={(event) => updateFilter('contractType', event.target.value)}>
                <option value="">Всички</option>
                {contractTypeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Фирма / страна</span>
              <input value={contractFilters.company} onChange={(event) => updateFilter('company', event.target.value)} placeholder="Име на фирма" />
            </label>
            <label className="field">
              <span>Изтича до</span>
              <input type="date" value={contractFilters.endDateTo} onChange={(event) => updateFilter('endDateTo', event.target.value)} />
            </label>
            <label className="field">
              <span>Статус</span>
              <select value={contractFilters.status} onChange={(event) => updateFilter('status', event.target.value)}>
                <option value="">Всички</option>
                <option value="uploaded">качен</option>
                <option value="processing">обработва се</option>
                <option value="extracted">разпознат</option>
                <option value="failed">неуспешен</option>
              </select>
            </label>
            <label className="field">
              <span>Стойност от</span>
              <input type="number" value={contractFilters.valueMin} onChange={(event) => updateFilter('valueMin', event.target.value)} />
            </label>
            <label className="field">
              <span>Стойност до</span>
              <input type="number" value={contractFilters.valueMax} onChange={(event) => updateFilter('valueMax', event.target.value)} />
            </label>
            <label className="field">
              <span>Неустойка от</span>
              <input type="number" value={contractFilters.penaltyMin} onChange={(event) => updateFilter('penaltyMin', event.target.value)} />
            </label>
            <label className="field">
              <span>Авто подновяване</span>
              <select value={contractFilters.renewsAutomatically} onChange={(event) => updateFilter('renewsAutomatically', event.target.value)}>
                <option value="">Всички</option>
                <option value="true">Да</option>
                <option value="false">Не</option>
              </select>
            </label>
            <div className="actions contract-filter-actions">
              <button type="button" className="secondary-button" onClick={clearFilters}>Изчисти</button>
              <button type="button" onClick={() => loadContracts()}>Филтрирай</button>
            </div>
          </div>
          {error && <p className="error">{error}</p>}
        </section>

        <section className="result-panel">
          <div className="panel-heading">
            <h2>Детайлна страница</h2>
          </div>
          <div className="empty-state">
            <h3>Избери договор от списъка</h3>
            <p>Редът отваря детайлна страница с резюме, клаузи, оригинален файл и email известие.</p>
          </div>
        </section>
      </section>

      <section className="documents-panel">
        <div className="panel-heading">
          <h2>Списък с договори</h2>
          <div className="panel-tools">
            <button type="button" className="secondary-button" onClick={() => loadContracts()}>Обнови</button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="documents-table contracts-table">
            <thead>
              <tr>
                <th>Заглавие</th>
                <th>Тип</th>
                <th>Страна A</th>
                <th>Страна B</th>
                <th>Крайна дата</th>
                <th>Стойност</th>
                <th>Неустойка</th>
                <th>Авто подновяване</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {contracts.length === 0 ? (
                <tr><td colSpan="9" className="empty-cell">Няма договори по тези филтри.</td></tr>
              ) : contracts.map((contract) => (
                <tr key={contract.id} onClick={() => navigate(`/contracts/${contract.id}`)}>
                  <td>{contract.title || '-'}</td>
                  <td>{contractTypeLabels[contract.contractType] || contract.contractType || '-'}</td>
                  <td>{contract.partyA || '-'}</td>
                  <td>{contract.partyB || '-'}</td>
                  <td>{contract.endDate || '-'}</td>
                  <td>{contract.contractValue ?? '-'} {contract.currency || ''}</td>
                  <td>{contract.penaltyAmount ?? '-'}</td>
                  <td>{contract.renewsAutomatically === null || contract.renewsAutomatically === undefined ? '-' : contract.renewsAutomatically ? 'Да' : 'Не'}</td>
                  <td>{contractStatusLabels[contract.status] || contract.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default ContractsPage;
