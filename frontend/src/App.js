import './App.css';
import { useEffect, useState } from 'react';

const reviewReasonLabels = {
  document_number_missing: 'Липсва номер на документа',
  issue_date_missing: 'Липсва дата',
  supplier_name_missing: 'Липсва доставчик',
  recipient_name_missing: 'Липсва получател',
  currency_missing: 'Липсва валута',
  subtotal_missing: 'Липсва сума без ДДС',
  total_missing: 'Липсва крайна сума',
  vat_missing: 'Липсва ДДС информация',
  payment_method_missing: 'Липсва начин на плащане',
  amount_mismatch: 'Има несъответствие в сумите',
  low_confidence: 'Ниска увереност при разчитане',
  unclear_image: 'Изображението не е достатъчно ясно',
};

function App() {
  const [health, setHealth] = useState(null);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3000/health')
      .then((response) => response.json())
      .then(setHealth)
      .catch(() => setHealth({ ok: false }));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!file) {
      setError('Choose an image first.');
      return;
    }

    const formData = new FormData();
    formData.append('document', file);

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('http://localhost:3000/api/documents/extract', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || 'Upload failed.');
      }

      setResult(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  const extracted = result?.data;

  return (
    <main className="app">
      <section className="header">
        <div>
          <p className="eyebrow">Invoices & Receipts OCR</p>
          <h1>Accounting-ready document extraction</h1>
        </div>

        <div className={health?.ok ? 'status ok' : 'status'}>
          {health?.ok ? `Backend online: ${health.model}` : 'Backend offline'}
        </div>
      </section>

      <section className="workspace">
        <form className="upload-panel" onSubmit={handleSubmit}>
          <label htmlFor="document">Document image</label>
          <input
            id="document"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />

          {file && (
            <div className="file-meta">
              <strong>{file.name}</strong>
              <span>{Math.round(file.size / 1024)} KB</span>
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Extracting...' : 'Extract data'}
          </button>

          {error && <p className="error">{error}</p>}
        </form>

        <section className="result-panel">
          <h2>Result</h2>
          {extracted ? (
            <>
              <div className="summary-grid">
                <div>
                  <span>Type</span>
                  <strong>{extracted.document_type || '-'}</strong>
                </div>
                <div>
                  <span>Number</span>
                  <strong>{extracted.document_number || '-'}</strong>
                </div>
                <div>
                  <span>Date</span>
                  <strong>{extracted.issue_date || '-'}</strong>
                </div>
                <div>
                  <span>Total</span>
                  <strong>
                    {extracted.amounts?.total_with_vat ?? '-'} {extracted.currency || ''}
                  </strong>
                </div>
                <div>
                  <span>Supplier</span>
                  <strong>{extracted.supplier?.name || '-'}</strong>
                </div>
                <div>
                  <span>Recipient</span>
                  <strong>{extracted.recipient?.name || '-'}</strong>
                </div>
                <div>
                  <span>VAT</span>
                  <strong>{extracted.vat?.amount ?? '-'} {extracted.currency || ''}</strong>
                </div>
                <div>
                  <span>Payment</span>
                  <strong>{extracted.payment?.method || '-'}</strong>
                </div>
              </div>

              {extracted.needs_review && (
                <div className="review-box">
                  Needs review: {(extracted.review_reasons || [])
                    .map((reason) => reviewReasonLabels[reason] || reason)
                    .join(', ') || 'липсват или има несигурни полета'}
                </div>
              )}

              <pre>{JSON.stringify(result, null, 2)}</pre>
            </>
          ) : (
            <p className="empty">Upload a JPG, PNG, or WEBP invoice/receipt to see the extracted accounting JSON here.</p>
          )}
        </section>
      </section>
    </main>
  );
}

export default App;
