import './App.css';
import { useEffect, useState } from 'react';

const API_BASE_URL = 'http://localhost:3000';
const AUTH_STORAGE_KEY = 'ocr-auth';

const reviewReasonLabels = {
  document_number_missing: 'Липсва номер на документа',
  issue_date_missing: 'Липсва дата',
  supplier_name_missing: 'Липсва доставчик',
  recipient_name_missing: 'Липсва получател',
  currency_missing: 'Липсва валута',
  total_missing: 'Липсва сума',
  vat_missing: 'Липсва ДДС',
  payment_method_missing: 'Липсва начин на плащане',
  low_confidence: 'Ниска увереност при разчитане',
  unclear_image: 'Документът не е достатъчно ясен',
};

const documentTypeLabels = {
  invoice: 'Фактура',
  receipt: 'Касова бележка',
};

const paymentMethodLabels = {
  cash: 'В брой',
  card: 'Карта',
  bank_transfer: 'Банков превод',
  unknown: 'Неизвестно',
};

function getCurrentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

function formatMoney(value, currency = 'BGN') {
  const amount = new Intl.NumberFormat('bg-BG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

  if (currency === 'BGN') return `${amount} лв`;
  if (currency === 'mixed') return `${amount} смесена валута`;
  return `${amount} ${currency || 'BGN'}`;
}

function getFieldValue(object, path) {
  return path.split('.').reduce((current, key) => current?.[key], object);
}

function setFieldValue(object, path, value) {
  const keys = path.split('.');
  const next = structuredClone(object);
  let current = next;

  for (const key of keys.slice(0, -1)) {
    current[key] = current[key] || {};
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
  return next;
}

function parseValue(value, type) {
  if (value === '') return null;
  if (type === 'number') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return value;
}

function Field({ label, path, draft, onChange, type = 'text' }) {
  const value = getFieldValue(draft, path);

  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type === 'number' ? 'number' : type}
        value={value ?? ''}
        onChange={(event) => onChange(path, parseValue(event.target.value, type))}
      />
    </label>
  );
}

function SelectField({ label, path, draft, onChange, options, labels = {} }) {
  const value = getFieldValue(draft, path) ?? '';

  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(path, event.target.value || null)}>
        <option value="">-</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option] || option}
          </option>
        ))}
      </select>
    </label>
  );
}

function getStoredAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY));
  } catch {
    return null;
  }
}

function getImportantWarnings(data) {
  if (!data) return [];

  const warnings = [];
  if (!data.issueDate) warnings.push('Липсва дата');
  if (data.totalAmount === null || data.totalAmount === undefined) warnings.push('Липсва сума');
  if (!data.supplierName) warnings.push('Липсва доставчик');
  return warnings;
}

function DocumentPreview({ result }) {
  if (!result?.file_url) {
    return <p className="empty">Оригиналният документ ще се покаже тук след качване.</p>;
  }

  const src = `${API_BASE_URL}${result.file_url}`;
  const isPdf = result.mime_type === 'application/pdf';

  return (
    <div className="document-preview">
      {isPdf ? (
        <iframe title="Оригинален документ" src={src} />
      ) : (
        <img src={src} alt="Оригинален документ" />
      )}
    </div>
  );
}

function App() {
  const [health, setHealth] = useState(null);
  const [auth, setAuth] = useState(getStoredAuth);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', company_name: '' });
  const [companyDraft, setCompanyDraft] = useState(null);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState(null);
  const [draft, setDraft] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [reportMonth, setReportMonth] = useState(getCurrentMonthValue);
  const [documentFilters, setDocumentFilters] = useState({
    dateFrom: '',
    dateTo: '',
    supplier: '',
    recipient: '',
    amountMin: '',
    amountMax: '',
    currency: '',
    category: '',
    status: '',
    documentType: '',
  });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then((response) => response.json())
      .then(setHealth)
      .catch(() => setHealth({ ok: false }));
  }, []);

  useEffect(() => {
    if (auth?.company) setCompanyDraft(auth.company);
  }, [auth]);

  useEffect(() => {
    if (auth?.token) {
      loadDashboard();
      loadDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  function authHeaders(extraHeaders = {}) {
    return { ...extraHeaders, Authorization: `Bearer ${auth.token}` };
  }

  function saveAuth(nextAuth) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
    setAuth(nextAuth);
    setCompanyDraft(nextAuth.company);
  }

  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuth(null);
    setResult(null);
    setDraft(null);
    setNotice('');
    setError('');
  }

  function updateDraft(path, value) {
    setDraft((currentDraft) => setFieldValue(currentDraft, path, value));
  }

  function updateCompanyDraft(path, value) {
    setCompanyDraft((currentDraft) => ({ ...currentDraft, [path]: value }));
  }

  function buildQuery(params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) query.set(key, value);
    });
    return query.toString();
  }

  async function loadDocuments(filters = documentFilters) {
    if (!auth?.token) return;

    setError('');
    try {
      const query = buildQuery(filters);
      const response = await fetch(`${API_BASE_URL}/api/documents${query ? `?${query}` : ''}`, {
        headers: authHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'Списъкът с документи не беше зареден.');
      setDocuments(data.documents || []);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function loadDashboard() {
    if (!auth?.token) return;

    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard`, {
        headers: authHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'Таблото не беше заредено.');
      setDashboard(data);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function openDocument(documentId) {
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}`, {
        headers: authHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'Документът не беше зареден.');
      setResult(data);
      setDraft(data.data);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'Входът не беше успешен.');

      saveAuth(data);
      setNotice(authMode === 'register' ? 'Регистрацията е успешна.' : 'Успешен вход.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCompanySave() {
    if (!companyDraft) return;
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/company`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(companyDraft),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'Фирменият профил не беше запазен.');

      saveAuth({ ...auth, company: data.company });
      setNotice('Фирменият профил е запазен.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) {
      setError('Избери PDF, JPG или PNG документ.');
      return;
    }

    const formData = new FormData();
    formData.append('document', file);
    setLoading(true);
    setError('');
    setNotice('');
    setResult(null);
    setDraft(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/extract`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'Извличането не беше успешно.');

      setResult(data);
      setDraft(data.data);
      setNotice('Данните са извлечени. Прегледай и одобри документа.');
      loadDashboard();
      loadDocuments();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadOnly() {
    if (!file) {
      setError('Избери PDF, JPG или PNG документ.');
      return;
    }

    const formData = new FormData();
    formData.append('document', file);
    setLoading(true);
    setError('');
    setNotice('');
    setResult(null);
    setDraft(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'Качването не беше успешно.');

      setResult(data);
      setNotice('Документът е качен със статус uploaded.');
      loadDashboard();
      loadDocuments();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDragOver(event) {
    event.preventDefault();
    setDragActive(true);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);
    setFile(event.dataTransfer.files?.[0] || null);
  }

  async function handleSaveReview() {
    if (!result?.id || !draft) return;
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${result.id}/review`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ data: draft }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'Записът не беше успешен.');

      setResult(data);
      setDraft(data.data);
      setNotice('Корекциите са запазени. Документът все още чака одобрение.');
      loadDashboard();
      loadDocuments();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleApproveDocument() {
    if (!result?.id || !draft) return;
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${result.id}/approve`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ data: draft }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'Одобряването не беше успешно.');

      setResult(data);
      setDraft(data.data);
      setNotice('Документът е одобрен.');
      loadDashboard();
      loadDocuments();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function downloadExport(type) {
    if (!result?.id) {
      setError('Първо извлечи документ.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${result.id}/export/${type}`, {
        headers: authHeaders(),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error?.message || 'Експортът не беше успешен.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = type === 'excel' ? 'ocr-export.xlsx' : 'ocr-export.pdf';
      link.click();
      window.URL.revokeObjectURL(url);
      loadDashboard();
      loadDocuments();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function downloadMonthlyPdfReport() {
    if (!reportMonth) {
      setError('Избери месец за PDF отчета.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/monthly/pdf?month=${reportMonth}`, {
        headers: authHeaders(),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error?.message || 'PDF отчетът не беше генериран.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pdf-otchet-${reportMonth}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const extracted = draft;
  const warnings = getImportantWarnings(extracted);

  return (
    <main className="app">
      <section className="header">
        <div>
          <p className="eyebrow">MVP: фактури и касови бележки</p>
          <h1>Качване, извличане, преглед и одобрение</h1>
        </div>
        <div className={health?.ok ? 'status ok' : 'status'}>
          {health?.ok ? `Backend активен: ${health.model}` : 'Backend не е активен'}
        </div>
      </section>

      {!auth ? (
        <section className="auth-panel">
          <div className="auth-tabs">
            <button type="button" className={authMode === 'login' ? '' : 'secondary-button'} onClick={() => setAuthMode('login')}>Вход</button>
            <button type="button" className={authMode === 'register' ? '' : 'secondary-button'} onClick={() => setAuthMode('register')}>Регистрация</button>
          </div>
          <form className="edit-form" onSubmit={handleAuthSubmit}>
            {authMode === 'register' && (
              <>
                <label className="field"><span>Име</span><input value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} /></label>
                <label className="field"><span>Фирма</span><input value={authForm.company_name} onChange={(event) => setAuthForm({ ...authForm, company_name: event.target.value })} /></label>
              </>
            )}
            <label className="field"><span>Имейл</span><input type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} /></label>
            <label className="field"><span>Парола</span><input type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} /></label>
            <button type="submit" disabled={loading}>{authMode === 'register' ? 'Създай акаунт' : 'Влез'}</button>
          </form>
          {error && <p className="error">{error}</p>}
          {notice && <p className="notice">{notice}</p>}
        </section>
      ) : (
        <>
          <section className="account-bar">
            <div>
              <strong>{auth.company?.name}</strong>
              <span>{auth.user?.email} · роля: {auth.membership?.role}</span>
            </div>
            <button type="button" className="secondary-button" onClick={logout}>Изход</button>
          </section>

          <section className="company-panel">
            <h2>Фирмен профил</h2>
            <div className="edit-form">
              <label className="field"><span>Име на фирма</span><input value={companyDraft?.name || ''} onChange={(event) => updateCompanyDraft('name', event.target.value)} /></label>
              <label className="field"><span>ЕИК</span><input value={companyDraft?.tax_id || ''} onChange={(event) => updateCompanyDraft('tax_id', event.target.value)} /></label>
              <label className="field"><span>ДДС номер</span><input value={companyDraft?.vat_id || ''} onChange={(event) => updateCompanyDraft('vat_id', event.target.value)} /></label>
              <label className="field"><span>Адрес</span><input value={companyDraft?.address || ''} onChange={(event) => updateCompanyDraft('address', event.target.value)} /></label>
              <label className="field">
                <span>План</span>
                <select value={companyDraft?.plan || 'free'} onChange={(event) => updateCompanyDraft('plan', event.target.value)}>
                  <option value="free">Free · 50 документа</option>
                  <option value="starter">Starter · 200 документа</option>
                  <option value="pro">Pro · 1000 документа</option>
                  <option value="business">Business · 5000 документа</option>
                </select>
              </label>
              <label className="field"><span>Месечен лимит</span><input disabled value={companyDraft?.document_limit || ''} /></label>
            </div>
            <div className="actions"><button type="button" onClick={handleCompanySave} disabled={saving || auth.membership?.role !== 'owner'}>Запази фирмения профил</button></div>
          </section>

          <section className="mvp-flow">
            <span>1. Качване</span>
            <span>2. OCR / AI извличане</span>
            <span>3. Преглед</span>
            <span className="muted">4. Approve document</span>
          </section>

          <section className="dashboard-panel">
            <div className="panel-heading">
              <div>
                <h2>Табло</h2>
                <p className="panel-subtitle">Бизнес преглед за текущия месец: {dashboard?.month || '-'}</p>
              </div>
              <button type="button" className="secondary-button" onClick={loadDashboard}>
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
                {(dashboard?.topSuppliers || []).length === 0 ? (
                  <p className="empty">Няма одобрени документи за текущия месец.</p>
                ) : (
                  <ul className="breakdown-list">
                    {dashboard.topSuppliers.map((supplier) => (
                      <li key={supplier.name}>
                        <span>{supplier.name}</span>
                        <strong>{formatMoney(supplier.totalAmount, dashboard.currency)}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3>Разходи по категории</h3>
                {(dashboard?.expensesByCategory || []).length === 0 ? (
                  <p className="empty">Няма категории за текущия месец.</p>
                ) : (
                  <ul className="breakdown-list">
                    {dashboard.expensesByCategory.map((category) => (
                      <li key={category.name}>
                        <span>{category.name}</span>
                        <strong>{formatMoney(category.totalAmount, dashboard.currency)}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </section>

          <section className="documents-panel">
            <div className="panel-heading">
              <h2>Списък с документи</h2>
              <div className="panel-tools">
                <label className="field compact-field">
                  <span>Месец за PDF отчет</span>
                  <input type="month" value={reportMonth} onChange={(event) => setReportMonth(event.target.value)} />
                </label>
                <button type="button" className="secondary-button" onClick={downloadMonthlyPdfReport}>
                  PDF отчет за месец
                </button>
                <button type="button" className="secondary-button" onClick={() => loadDocuments()}>
                  Обнови
                </button>
              </div>
            </div>
            <div className="filters-grid">
              <label className="field"><span>От дата</span><input type="date" value={documentFilters.dateFrom} onChange={(event) => setDocumentFilters({ ...documentFilters, dateFrom: event.target.value })} /></label>
              <label className="field"><span>До дата</span><input type="date" value={documentFilters.dateTo} onChange={(event) => setDocumentFilters({ ...documentFilters, dateTo: event.target.value })} /></label>
              <label className="field"><span>Доставчик</span><input value={documentFilters.supplier} onChange={(event) => setDocumentFilters({ ...documentFilters, supplier: event.target.value })} /></label>
              <label className="field"><span>Получател</span><input value={documentFilters.recipient} onChange={(event) => setDocumentFilters({ ...documentFilters, recipient: event.target.value })} /></label>
              <label className="field"><span>Сума от</span><input type="number" value={documentFilters.amountMin} onChange={(event) => setDocumentFilters({ ...documentFilters, amountMin: event.target.value })} /></label>
              <label className="field"><span>Сума до</span><input type="number" value={documentFilters.amountMax} onChange={(event) => setDocumentFilters({ ...documentFilters, amountMax: event.target.value })} /></label>
              <label className="field"><span>Валута</span><select value={documentFilters.currency} onChange={(event) => setDocumentFilters({ ...documentFilters, currency: event.target.value })}><option value="">Всички</option><option value="BGN">BGN</option><option value="EUR">EUR</option><option value="USD">USD</option></select></label>
              <label className="field"><span>Категория</span><input value={documentFilters.category} onChange={(event) => setDocumentFilters({ ...documentFilters, category: event.target.value })} /></label>
              <label className="field"><span>Статус</span><select value={documentFilters.status} onChange={(event) => setDocumentFilters({ ...documentFilters, status: event.target.value })}><option value="">Всички</option><option value="uploaded">uploaded</option><option value="processing">processing</option><option value="needs_review">needs_review</option><option value="approved">approved</option><option value="exported">exported</option><option value="failed">failed</option></select></label>
              <label className="field"><span>Тип документ</span><select value={documentFilters.documentType} onChange={(event) => setDocumentFilters({ ...documentFilters, documentType: event.target.value })}><option value="">Всички</option><option value="invoice">Фактура</option><option value="receipt">Касова бележка</option></select></label>
            </div>
            <div className="actions">
              <button type="button" className="secondary-button" onClick={() => { const cleared = { dateFrom: '', dateTo: '', supplier: '', recipient: '', amountMin: '', amountMax: '', currency: '', category: '', status: '', documentType: '' }; setDocumentFilters(cleared); loadDocuments(cleared); }}>
                Изчисти филтрите
              </button>
              <button type="button" onClick={() => loadDocuments()}>
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
                    <tr key={document.id} onClick={() => openDocument(document.id)}>
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

          <section className="workspace">
            <form className={dragActive ? 'upload-panel drag-active' : 'upload-panel'} onSubmit={handleSubmit} onDragOver={handleDragOver} onDragLeave={() => setDragActive(false)} onDrop={handleDrop}>
              <label htmlFor="document">Документ</label>
              <p className="drop-hint">Пусни файл тук или избери от телефона/компютъра.</p>
              <input id="document" type="file" accept="application/pdf,image/png,image/jpeg" onChange={(event) => setFile(event.target.files?.[0] || null)} />
              {file && <div className="file-meta"><strong>{file.name}</strong><span>{Math.round(file.size / 1024)} KB</span></div>}
              <button type="submit" disabled={loading}>{loading ? 'Извличане...' : 'Извлечи данни'}</button>
              <button type="button" disabled={loading || !file} className="secondary-button" onClick={handleUploadOnly}>Само качи</button>
              <button type="button" disabled={!result?.id} className="secondary-button" onClick={() => downloadExport('excel')}>Експорт Excel</button>
              <button type="button" disabled={!result?.id} className="secondary-button" onClick={() => downloadExport('pdf')}>Експорт PDF</button>
              {error && <p className="error">{error}</p>}
              {notice && <p className="notice">{notice}</p>}
            </form>

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

                    <div className="edit-form review-fields">
                      <Field label="Дата" path="issueDate" type="date" draft={draft} onChange={updateDraft} />
                      <Field label="Доставчик" path="supplierName" draft={draft} onChange={updateDraft} />
                      <Field label="Получател" path="recipientName" draft={draft} onChange={updateDraft} />
                      <Field label="Сума" path="totalAmount" type="number" draft={draft} onChange={updateDraft} />
                      <Field label="ДДС" path="vatAmount" type="number" draft={draft} onChange={updateDraft} />
                      <SelectField label="Начин на плащане" path="paymentMethod" draft={draft} onChange={updateDraft} options={['cash', 'card', 'bank_transfer', 'unknown']} labels={paymentMethodLabels} />
                      <Field label="Категория" path="category" draft={draft} onChange={updateDraft} />
                      <Field label="Сума без ДДС" path="netAmount" type="number" draft={draft} onChange={updateDraft} />
                      <Field label="Валута" path="currency" draft={draft} onChange={updateDraft} />
                    </div>

                    <div className="actions">
                      <button type="button" className="secondary-button" onClick={handleSaveReview} disabled={saving}>Запази корекциите</button>
                      <button type="button" onClick={handleApproveDocument} disabled={saving}>Approve document</button>
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
          </section>
        </>
      )}
    </main>
  );
}

export default App;
