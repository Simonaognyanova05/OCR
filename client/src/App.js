import './App.css';
import { useEffect, useState } from 'react';

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

  return (
    <main className="app">
      <section className="header">
        <div>
          <p className="eyebrow">OCR Documents</p>
          <h1>Extract data from invoices and receipts</h1>
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
          {result ? (
            <pre>{JSON.stringify(result, null, 2)}</pre>
          ) : (
            <p className="empty">Upload a JPG, PNG, or WEBP document to see the JSON result here.</p>
          )}
        </section>
      </section>
    </main>
  );
}

export default App;
