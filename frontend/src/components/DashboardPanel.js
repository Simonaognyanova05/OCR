import { formatMoney } from '../utils/format';

function BreakdownList({ emptyText, items, currency }) {
  if (items.length === 0) {
    return <p className="empty">{emptyText}</p>;
  }

  return (
    <ul className="breakdown-list">
      {items.map((item) => (
        <li key={item.name}>
          <span>{item.name}</span>
          <strong>{formatMoney(item.totalAmount, currency)}</strong>
        </li>
      ))}
    </ul>
  );
}

function DashboardPanel({ dashboard, onRefresh }) {
  return (
    <section className="dashboard-panel">
      <div className="panel-heading">
        <div>
          <h2>Табло</h2>
          <p className="panel-subtitle">Бизнес преглед за текущия месец: {dashboard?.month || '-'}</p>
        </div>
        <button type="button" className="secondary-button" onClick={onRefresh}>
          Обнови таблото
        </button>
      </div>

      <div className="dashboard-metrics">
        <div>
          <span>Общо разходи този месец</span>
          <strong>{formatMoney(dashboard?.totalExpenses, dashboard?.currency)}</strong>
        </div>
        <div>
          <span>Общо ДДС</span>
          <strong>{formatMoney(dashboard?.totalVat, dashboard?.currency)}</strong>
        </div>
        <div>
          <span>Брой документи</span>
          <strong>{dashboard?.documentCount || 0}</strong>
        </div>
      </div>

      <div className="dashboard-breakdowns">
        <section>
          <h3>Топ 5 доставчици</h3>
          <BreakdownList
            currency={dashboard?.currency}
            emptyText="Няма одобрени документи за текущия месец."
            items={dashboard?.topSuppliers || []}
          />
        </section>

        <section>
          <h3>Разходи по категории</h3>
          <BreakdownList
            currency={dashboard?.currency}
            emptyText="Няма категории за текущия месец."
            items={dashboard?.expensesByCategory || []}
          />
        </section>
      </div>
    </section>
  );
}

export default DashboardPanel;

