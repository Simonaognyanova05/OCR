import { documentTypeLabels, paymentMethodLabels, reviewReasonLabels, warningLabels } from '../constants/labels';
import { getImportantWarnings } from '../utils/review';
import DocumentPreview from './DocumentPreview';
import Field from './forms/Field';
import SelectField from './forms/SelectField';

function ReviewPanel({
  draft,
  onApprove,
  onSaveReview,
  onUpdateDraft,
  result,
  saving,
}) {
  const extracted = draft;
  const warnings = getImportantWarnings(extracted);

  return (
    <section className="result-panel">
      <h2>Проверка от потребителя</h2>
      {extracted ? (
        <div className="review-layout">
          <section className="preview-panel">
            <h3>Оригинален документ</h3>
            <DocumentPreview result={result} />
          </section>

          <section className="fields-panel">
            <div className="summary-grid">
              <div><span>Статус</span><strong>{result?.status || '-'}</strong></div>
              <div><span>Тип</span><strong>{documentTypeLabels[extracted.documentType] || extracted.documentType || '-'}</strong></div>
              <div><span>Номер</span><strong>{extracted.documentNumber || '-'}</strong></div>
              <div><span>Общо</span><strong>{extracted.totalAmount ?? '-'} {extracted.currency || ''}</strong></div>
            </div>

            {(warnings.length > 0 || extracted.needsReview) && (
              <div className="review-box">
                {[...warnings, ...(extracted.reviewReasons || []).map((reason) => reviewReasonLabels[reason] || reason)]
                  .filter(Boolean)
                  .map((warning) => <div key={warning}>⚠ {warning}</div>)}
              </div>
            )}

            {(extracted.warnings || []).length > 0 && (
              <div className="warning-box">
                {extracted.warnings.map((warning) => (
                  <div key={warning}>⚠ {warningLabels[warning] || warning}</div>
                ))}
              </div>
            )}

            <div className="edit-form review-fields">
              <Field label="Дата" path="issueDate" type="date" draft={draft} onChange={onUpdateDraft} />
              <Field label="Доставчик" path="supplierName" draft={draft} onChange={onUpdateDraft} />
              <Field label="Получател" path="recipientName" draft={draft} onChange={onUpdateDraft} />
              <Field label="Сума" path="totalAmount" type="number" draft={draft} onChange={onUpdateDraft} />
              <Field label="ДДС" path="vatAmount" type="number" draft={draft} onChange={onUpdateDraft} />
              <SelectField label="Начин на плащане" path="paymentMethod" draft={draft} onChange={onUpdateDraft} options={['cash', 'card', 'bank_transfer', 'unknown']} labels={paymentMethodLabels} />
              <Field label="Категория" path="category" draft={draft} onChange={onUpdateDraft} />
              <Field label="Сума без ДДС" path="netAmount" type="number" draft={draft} onChange={onUpdateDraft} />
              <Field label="Валута" path="currency" draft={draft} onChange={onUpdateDraft} />
            </div>

            <div className="actions">
              <button type="button" className="secondary-button" onClick={onSaveReview} disabled={saving}>Запази корекциите</button>
              <button type="button" onClick={onApprove} disabled={saving}>Approve document</button>
            </div>

            <details>
              <summary>JSON резултат</summary>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </details>
          </section>
        </div>
      ) : (
        <p className="empty">Качи PDF, JPG или PNG документ, за да започнеш.</p>
      )}
    </section>
  );
}

export default ReviewPanel;

