import { useEffect, useState } from 'react';
import { initialContractFilters, useContracts } from '../hooks/useContracts';
import { getContract } from '../services/contractService';

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
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const {
    contractFilters,
    contracts,
    loadContracts,
    setContractFilters,
  } = useContracts(auth, setError);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  function clearFilters() {
    setContractFilters(initialContractFilters);
    loadContracts(initialContractFilters);
  }

  async function handleOpenContract(contractId) {
    setError('');

    try {
      const data = await getContract(contractId, auth.token);
      setResult(data);
    } catch (requestError) {
      setError(requestError.message);
    }
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

      <section className="workspace">
        <section className="documents-panel">
          <div className="panel-heading">
            <h2>Търсене</h2>
          </div>
          <div className="filters-grid">
            <label className="field">
              <span>Тип договор</span>
              <select value={contractFilters.contractType} onChange={(event) => setContractFilters({ ...contractFilters, contractType: event.target.value })}>
                <option value="">Всички</option>
                {contractTypeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Статус</span>
              <select value={contractFilters.status} onChange={(event) => setContractFilters({ ...contractFilters, status: event.target.value })}>
                <option value="">Всички</option>
                <option value="uploaded">качен</option>
                <option value="processing">обработва се</option>
                <option value="extracted">разпознат</option>
                <option value="failed">неуспешен</option>
              </select>
            </label>
          </div>
          <div className="actions">
            <button type="button" className="secondary-button" onClick={clearFilters}>Изчисти филтрите</button>
            <button type="button" onClick={() => loadContracts()}>Филтрирай</button>
          </div>
          {error && <p className="error">{error}</p>}
        </section>
        <section className="result-panel">
          <div className="panel-heading">
            <h2>Извлечен JSON</h2>
          </div>
          {result?.data ? (
            <pre className="json-preview">{JSON.stringify(result.data, null, 2)}</pre>
          ) : (
            <div className="empty-state">
              <h3>Няма извлечен договор</h3>
              <p>Качи договор, за да видиш записания JSON тук.</p>
            </div>
          )}
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
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {contracts.length === 0 ? (
                <tr><td colSpan="8" className="empty-cell">Няма договори по тези филтри.</td></tr>
              ) : contracts.map((contract) => (
                <tr key={contract.id} onClick={() => handleOpenContract(contract.id)}>
                  <td>{contract.title || '-'}</td>
                  <td>{contractTypeLabels[contract.contractType] || contract.contractType || '-'}</td>
                  <td>{contract.partyA || '-'}</td>
                  <td>{contract.partyB || '-'}</td>
                  <td>{contract.endDate || '-'}</td>
                  <td>{contract.contractValue ?? '-'} {contract.currency || ''}</td>
                  <td>{contract.penaltyAmount ?? '-'}</td>
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
