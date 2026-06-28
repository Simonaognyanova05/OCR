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
  subtotal_missing: 'Липсва сума без ДДС',
  total_missing: 'Липсва крайна сума',
  vat_missing: 'Липсва ДДС информация',
  payment_method_missing: 'Липсва начин на плащане',
  amount_mismatch: 'Има несъответствие в сумите',
  low_confidence: 'Ниска увереност при разчитане',
  unclear_image: 'Изображението не е достатъчно ясно',
};

const documentTypeLabels = {
  invoice: 'Фактура',
  receipt: 'Касова бележка',
  credit_note: 'Кредитно известие',
  other: 'Друг документ',
};

const paymentMethodLabels = {
  cash: 'В брой',
  card: 'Карта',
  bank_transfer: 'Банков превод',
  online: 'Онлайн',
  mixed: 'Смесено',
  unknown: 'Неизвестно',
};

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
  if (value === '') {
    return null;
  }

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

function App() {
  const [health, setHealth] = useState(null);
  const [auth, setAuth] = useState(getStoredAuth);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
    company_name: '',
  });
  const [companyDraft, setCompanyDraft] = useState(null);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState(null);
  const [draft, setDraft] = useState(null);
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
    if (auth?.company) {
      setCompanyDraft(auth.company);
    }
  }, [auth]);

  function authHeaders(extraHeaders = {}) {
    return {
      ...extraHeaders,
      Authorization: `Bearer ${auth.token}`,
    };
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
    setCompanyDraft((currentDraft) => ({
      ...currentDraft,
      [path]: value,
    }));
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(authForm),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || 'Входът не беше успешен.');
      }

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
        headers: authHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(companyDraft),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || 'Фирменият профил не беше запазен.');
      }

      const nextAuth = {
        ...auth,
        company: data.company,
      };
      saveAuth(nextAuth);
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
      setError('Избери изображение на фактура или касова бележка.');
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

      if (!response.ok) {
        throw new Error(data?.error?.message || 'Извличането не беше успешно.');
      }

      setResult(data);
      setDraft(data.data);
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

      if (!response.ok) {
        throw new Error(data?.error?.message || 'Качването не беше успешно.');
      }

      setResult(data);
      setNotice('Документът е качен със статус uploaded.');
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
    if (!result?.id || !draft) {
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${result.id}/review`, {
        method: 'PUT',
        headers: authHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ data: draft }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || 'Записът не беше успешен.');
      }

      setResult(data);
      setDraft(data.data);
      setNotice('Корекциите са запазени.');
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
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const extracted = draft;

  return (
    <main className="app">
      <section className="header">
        <div>
          <p className="eyebrow">MVP: фактури и касови бележки</p>
          <h1>Качване, извличане, преглед и корекция</h1>
        </div>

        <div className={health?.ok ? 'status ok' : 'status'}>
          {health?.ok ? `Backend активен: ${health.model}` : 'Backend не е активен'}
        </div>
      </section>

      {!auth ? (
        <section className="auth-panel">
          <div className="auth-tabs">
            <button type="button" className={authMode === 'login' ? '' : 'secondary-button'} onClick={() => setAuthMode('login')}>
              Вход
            </button>
            <button type="button" className={authMode === 'register' ? '' : 'secondary-button'} onClick={() => setAuthMode('register')}>
              Регистрация
            </button>
          </div>

          <form className="edit-form" onSubmit={handleAuthSubmit}>
            {authMode === 'register' && (
              <>
                <label className="field">
                  <span>Име</span>
                  <input value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} />
                </label>
                <label className="field">
                  <span>Фирма</span>
                  <input value={authForm.company_name} onChange={(event) => setAuthForm({ ...authForm, company_name: event.target.value })} />
                </label>
              </>
            )}
            <label className="field">
              <span>Имейл</span>
              <input type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} />
            </label>
            <label className="field">
              <span>Парола</span>
              <input type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} />
            </label>
            <button type="submit" disabled={loading}>
              {authMode === 'register' ? 'Създай акаунт' : 'Влез'}
            </button>
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
            <button type="button" className="secondary-button" onClick={logout}>
              Изход
            </button>
          </section>

          <section className="company-panel">
            <h2>Фирмен профил</h2>
            <div className="edit-form">
              <label className="field">
                <span>Име на фирма</span>
                <input value={companyDraft?.name || ''} onChange={(event) => updateCompanyDraft('name', event.target.value)} />
              </label>
              <label className="field">
                <span>ЕИК</span>
                <input value={companyDraft?.tax_id || ''} onChange={(event) => updateCompanyDraft('tax_id', event.target.value)} />
              </label>
              <label className="field">
                <span>ДДС номер</span>
                <input value={companyDraft?.vat_id || ''} onChange={(event) => updateCompanyDraft('vat_id', event.target.value)} />
              </label>
              <label className="field">
                <span>Адрес</span>
                <input value={companyDraft?.address || ''} onChange={(event) => updateCompanyDraft('address', event.target.value)} />
              </label>
              <label className="field">
                <span>План</span>
                <select value={companyDraft?.plan || 'free'} onChange={(event) => updateCompanyDraft('plan', event.target.value)}>
                  <option value="free">Free · 50 документа</option>
                  <option value="starter">Starter · 200 документа</option>
                  <option value="pro">Pro · 1000 документа</option>
                  <option value="business">Business · 5000 документа</option>
                </select>
              </label>
              <label className="field">
                <span>Месечен лимит</span>
                <input disabled value={companyDraft?.document_limit || ''} />
              </label>
            </div>
            <div className="actions">
              <button type="button" onClick={handleCompanySave} disabled={saving || auth.membership?.role !== 'owner'}>
                Запази фирмения профил
              </button>
            </div>
          </section>

          <section className="mvp-flow">
            <span>1. Качване</span>
            <span>2. OCR извличане</span>
            <span>3. Преглед и корекция</span>
            <span className="muted">4. Excel/PDF експорт</span>
          </section>

          <section className="workspace">
            <form
              className={dragActive ? 'upload-panel drag-active' : 'upload-panel'}
              onSubmit={handleSubmit}
              onDragOver={handleDragOver}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
            >
              <label htmlFor="document">Документ</label>
              <p className="drop-hint">Пусни файл тук или избери от телефона/компютъра.</p>
              <input
                id="document"
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />

              {file && (
                <div className="file-meta">
                  <strong>{file.name}</strong>
                  <span>{Math.round(file.size / 1024)} KB</span>
                </div>
              )}

              <button type="submit" disabled={loading}>
                {loading ? 'Извличане...' : 'Извлечи данни'}
              </button>

              <button type="button" disabled={loading || !file} className="secondary-button" onClick={handleUploadOnly}>
                Само качи
              </button>

              <button type="button" disabled={!result?.id} className="secondary-button" onClick={() => downloadExport('excel')}>
                Експорт Excel
              </button>

              <button type="button" disabled={!result?.id} className="secondary-button" onClick={() => downloadExport('pdf')}>
                Експорт PDF
              </button>

              {error && <p className="error">{error}</p>}
              {notice && <p className="notice">{notice}</p>}
            </form>

            <section className="result-panel">
              <h2>Преглед на данните</h2>
              {extracted ? (
                <>
                  <div className="summary-grid">
                    <div>
                      <span>Тип</span>
                      <strong>{documentTypeLabels[extracted.document_type] || extracted.document_type || '-'}</strong>
                    </div>
                    <div>
                      <span>Номер</span>
                      <strong>{extracted.document_number || '-'}</strong>
                    </div>
                    <div>
                      <span>Дата</span>
                      <strong>{extracted.issue_date || '-'}</strong>
                    </div>
                    <div>
                      <span>Общо</span>
                      <strong>
                        {extracted.amounts?.total_with_vat ?? '-'} {extracted.currency || ''}
                      </strong>
                    </div>
                  </div>

                  {extracted.needs_review && (
                    <div className="review-box">
                      За преглед: {(extracted.review_reasons || [])
                        .map((reason) => reviewReasonLabels[reason] || reason)
                        .join(', ') || 'липсват или има несигурни полета'}
                    </div>
                  )}

                  <div className="edit-form">
                    <SelectField label="Тип документ" path="document_type" draft={draft} onChange={updateDraft} options={['invoice', 'receipt', 'credit_note', 'other']} labels={documentTypeLabels} />
                    <Field label="Номер" path="document_number" draft={draft} onChange={updateDraft} />
                    <Field label="Дата" path="issue_date" type="date" draft={draft} onChange={updateDraft} />
                    <Field label="Валута" path="currency" draft={draft} onChange={updateDraft} />
                    <Field label="Доставчик" path="supplier.name" draft={draft} onChange={updateDraft} />
                    <Field label="ЕИК доставчик" path="supplier.tax_id" draft={draft} onChange={updateDraft} />
                    <Field label="ДДС номер доставчик" path="supplier.vat_id" draft={draft} onChange={updateDraft} />
                    <Field label="Получател" path="recipient.name" draft={draft} onChange={updateDraft} />
                    <Field label="Сума без ДДС" path="amounts.subtotal_without_vat" type="number" draft={draft} onChange={updateDraft} />
                    <Field label="ДДС" path="amounts.total_vat" type="number" draft={draft} onChange={updateDraft} />
                    <Field label="Обща сума" path="amounts.total_with_vat" type="number" draft={draft} onChange={updateDraft} />
                    <Field label="ДДС ставка" path="vat.rate" type="number" draft={draft} onChange={updateDraft} />
                    <SelectField label="Плащане" path="payment.method" draft={draft} onChange={updateDraft} options={['cash', 'card', 'bank_transfer', 'online', 'mixed', 'unknown']} labels={paymentMethodLabels} />
                    <Field label="IBAN" path="payment.iban" draft={draft} onChange={updateDraft} />
                    <Field label="Банка" path="payment.bank_name" draft={draft} onChange={updateDraft} />
                  </div>

                  <div className="actions">
                    <button type="button" onClick={handleSaveReview} disabled={saving}>
                      {saving ? 'Запазване...' : 'Запази корекциите'}
                    </button>
                  </div>

                  <details>
                    <summary>JSON резултат</summary>
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                  </details>
                </>
              ) : (
                <p className="empty">Качи JPG, PNG или WEBP фактура/касова бележка, за да започнеш.</p>
              )}
            </section>
          </section>
        </>
      )}
    </main>
  );
}

export default App;
