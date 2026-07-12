import { documentTypeLabels } from '../constants/labels';
import { initialDocumentFilters } from '../hooks/useDocuments';
import styles from './DocumentsPanel.module.css';

function DocumentsPanel({
  documentFilters,
  documents,
  onClearFilters,
  onDownloadMonthlyPdfReport,
  onFilterChange,
  onOpenDocument,
  onRefresh,
  reportMonth,
  setReportMonth,
}) {
  function clearFilters() {
    onClearFilters(initialDocumentFilters);
  }

  return (
    <section className={`${styles.moduleRoot} documents-panel`}>
      <div className="panel-heading">
        <h2>Списък с документи</h2>
        <div className="panel-tools">
          <label className="field compact-field">
            <span>Месец за PDF отчет</span>
            <input type="month" value={reportMonth} onChange={(event) => setReportMonth(event.target.value)} />
          </label>
          <button type="button" className="secondary-button" onClick={onDownloadMonthlyPdfReport}>
            PDF отчет за месец
          </button>
          <button type="button" className="secondary-button" onClick={onRefresh}>
            Обнови
          </button>
        </div>
      </div>
      <div className="filters-grid">
        <label className="field"><span>От дата</span><input type="date" value={documentFilters.dateFrom} onChange={(event) => onFilterChange({ ...documentFilters, dateFrom: event.target.value })} /></label>
        <label className="field"><span>До дата</span><input type="date" value={documentFilters.dateTo} onChange={(event) => onFilterChange({ ...documentFilters, dateTo: event.target.value })} /></label>
        <label className="field"><span>Доставчик</span><input value={documentFilters.supplier} onChange={(event) => onFilterChange({ ...documentFilters, supplier: event.target.value })} /></label>
        <label className="field"><span>Получател</span><input value={documentFilters.recipient} onChange={(event) => onFilterChange({ ...documentFilters, recipient: event.target.value })} /></label>
        <label className="field"><span>Сума от</span><input type="number" value={documentFilters.amountMin} onChange={(event) => onFilterChange({ ...documentFilters, amountMin: event.target.value })} /></label>
        <label className="field"><span>Сума до</span><input type="number" value={documentFilters.amountMax} onChange={(event) => onFilterChange({ ...documentFilters, amountMax: event.target.value })} /></label>
        <label className="field"><span>Валута</span><select value={documentFilters.currency} onChange={(event) => onFilterChange({ ...documentFilters, currency: event.target.value })}><option value="">Всички</option><option value="BGN">BGN</option><option value="EUR">EUR</option><option value="USD">USD</option></select></label>
        <label className="field"><span>Категория</span><input value={documentFilters.category} onChange={(event) => onFilterChange({ ...documentFilters, category: event.target.value })} /></label>
        <label className="field"><span>Статус</span><select value={documentFilters.status} onChange={(event) => onFilterChange({ ...documentFilters, status: event.target.value })}><option value="">Всички</option><option value="uploaded">uploaded</option><option value="processing">processing</option><option value="needs_review">needs_review</option><option value="approved">approved</option><option value="exported">exported</option><option value="failed">failed</option></select></label>
        <label className="field"><span>Тип документ</span><select value={documentFilters.documentType} onChange={(event) => onFilterChange({ ...documentFilters, documentType: event.target.value })}><option value="">Всички</option><option value="invoice">Фактура</option><option value="receipt">Касова бележка</option></select></label>
      </div>
      <div className="actions">
        <button type="button" className="secondary-button" onClick={clearFilters}>
          Изчисти филтрите
        </button>
        <button type="button" onClick={onRefresh}>
          Филтрирай
        </button>
      </div>
      <div className="table-wrap">
        <table className="documents-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Тип</th>
              <th>Доставчик</th>
              <th>Получател</th>
              <th>Сума</th>
              <th>ДДС</th>
              <th>Статус</th>
              <th>Категория</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr><td colSpan="8" className="empty-cell">Няма документи по тези филтри.</td></tr>
            ) : documents.map((document) => (
              <tr key={document.id} onClick={() => onOpenDocument(document.id)}>
                <td>{document.date || '-'}</td>
                <td>{documentTypeLabels[document.documentType] || document.documentType || '-'}</td>
                <td>{document.supplierName || '-'}</td>
                <td>{document.recipientName || '-'}</td>
                <td>{document.totalAmount ?? '-'} {document.currency || ''}</td>
                <td>{document.vatAmount ?? '-'}</td>
                <td>{document.status}</td>
                <td>{document.category || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default DocumentsPanel;
