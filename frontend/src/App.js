import './App.css';
import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import AppShell from './components/AppShell';
import AuthPanel from './components/AuthPanel';
import { useAuth } from './hooks/useAuth';
import { useDashboard } from './hooks/useDashboard';
import { initialDocumentFilters, useDocuments } from './hooks/useDocuments';
import { useHealth } from './hooks/useHealth';
import CompanyPage from './pages/CompanyPage';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import WorkspacePage from './pages/WorkspacePage';
import { login, register } from './services/authService';
import { getCompanyProfile, requestSubscriptionPlan, updateCompany } from './services/companyService';
import { approveDocument, extractDocument, saveDocumentReview, uploadDocument } from './services/documentService';
import { downloadDocumentExport, downloadMonthlyPdfReport } from './services/exportService';
import { getCurrentMonthValue } from './utils/date';
import { setFieldValue } from './utils/form';

function AuthenticatedApp({ auth, companyDraft, health, logout, saveAuth, updateCompanyDraft }) {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState(null);
  const [draft, setDraft] = useState(null);
  const [reportMonth, setReportMonth] = useState(getCurrentMonthValue);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestedPlan, setRequestedPlan] = useState(auth.company?.plan || 'free');

  const handleError = useCallback((message) => {
    setError(message);
  }, []);

  const { dashboard, loadDashboard } = useDashboard(auth, handleError);
  const {
    documentFilters,
    documents,
    loadDocuments,
    openDocument,
    setDocumentFilters,
  } = useDocuments(auth, handleError);

  useEffect(() => {
    if (auth?.token) {
      loadDashboard();
      loadDocuments();
    }
  }, [auth?.token, loadDashboard, loadDocuments]);

  useEffect(() => {
    async function loadCompanyProfile() {
      try {
        const data = await getCompanyProfile(auth.token);
        saveAuth({ ...auth, ...data });
        setRequestedPlan(data.company?.plan || auth.company?.plan || 'free');
      } catch (requestError) {
        setError(requestError.message);
      }
    }

    if (auth?.token) {
      loadCompanyProfile();
    }
    // Профилът се презарежда само при нов token, за да не правим loop след saveAuth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  function resetMessages() {
    setError('');
    setNotice('');
  }

  function logoutAndReset() {
    logout();
    setResult(null);
    setDraft(null);
    resetMessages();
  }

  function updateDraft(path, value) {
    setDraft((currentDraft) => setFieldValue(currentDraft, path, value));
  }

  async function refreshBusinessData(filters) {
    await Promise.all([
      loadDashboard(),
      loadDocuments(filters),
    ]);
  }

  async function handleCompanySave() {
    if (!companyDraft) return;

    setSaving(true);
    resetMessages();

    try {
      const data = await updateCompany({
        name: companyDraft.name,
        tax_id: companyDraft.tax_id,
        vat_id: companyDraft.vat_id,
        address: companyDraft.address,
      }, auth.token);
      saveAuth({ ...auth, company: data.company });
      setNotice('Фирменият профил е запазен.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubscriptionRequest(plan) {
    setSaving(true);
    resetMessages();

    try {
      const data = await requestSubscriptionPlan({ plan }, auth.token);
      saveAuth({ ...auth, pending_subscription_request: data.subscription_request });
      setNotice('Заявката за абонамент е изпратена успешно.');
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

    setLoading(true);
    resetMessages();
    setResult(null);
    setDraft(null);

    try {
      const data = await extractDocument(file, auth.token);
      setResult(data);
      setDraft(data.data);
      setNotice('Данните са извлечени. Прегледай и одобри документа.');
      navigate('/workspace');
      refreshBusinessData();
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

    setLoading(true);
    resetMessages();
    setResult(null);
    setDraft(null);

    try {
      const data = await uploadDocument(file, auth.token);
      setResult(data);
      setNotice('Документът е качен със статус uploaded.');
      navigate('/workspace');
      refreshBusinessData();
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

  async function handleOpenDocument(documentId) {
    resetMessages();
    const data = await openDocument(documentId);
    if (!data) return;

    setResult(data);
    setDraft(data.data);
    navigate('/workspace');
  }

  async function handleSaveReview() {
    if (!result?.id || !draft) return;

    setSaving(true);
    resetMessages();

    try {
      const data = await saveDocumentReview(result.id, draft, auth.token);
      setResult(data);
      setDraft(data.data);
      setNotice('Корекциите са запазени. Документът все още чака одобрение.');
      refreshBusinessData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleApproveDocument() {
    if (!result?.id || !draft) return;

    setSaving(true);
    resetMessages();

    try {
      const data = await approveDocument(result.id, draft, auth.token);
      setResult(data);
      setDraft(data.data);
      setNotice('Документът е одобрен.');
      refreshBusinessData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadExport(type) {
    if (!result?.id) {
      setError('Първо извлечи документ.');
      return;
    }

    try {
      await downloadDocumentExport(result.id, type, auth.token);
      refreshBusinessData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleDownloadMonthlyPdfReport() {
    if (!reportMonth) {
      setError('Избери месец за PDF отчета.');
      return;
    }

    try {
      await downloadMonthlyPdfReport(reportMonth, auth.token);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function handleClearFilters(clearedFilters = initialDocumentFilters) {
    setDocumentFilters(clearedFilters);
    loadDocuments(clearedFilters);
  }

  return (
    <Routes>
      <Route element={<AppShell auth={auth} health={health} onLogout={logoutAndReset} />}>
        <Route index element={<DashboardPage dashboard={dashboard} onRefresh={loadDashboard} />} />
        <Route
          path="documents"
          element={(
            <DocumentsPage
              documentFilters={documentFilters}
              documents={documents}
              onClearFilters={handleClearFilters}
              onDownloadMonthlyPdfReport={handleDownloadMonthlyPdfReport}
              onFilterChange={setDocumentFilters}
              onOpenDocument={handleOpenDocument}
              onRefresh={() => loadDocuments()}
              reportMonth={reportMonth}
              setReportMonth={setReportMonth}
            />
          )}
        />
        <Route
          path="workspace"
          element={(
            <WorkspacePage
              dragActive={dragActive}
              draft={draft}
              error={error}
              file={file}
              loading={loading}
              notice={notice}
              onApprove={handleApproveDocument}
              onDownloadExport={handleDownloadExport}
              onDragLeave={() => setDragActive(false)}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onFileChange={setFile}
              onSaveReview={handleSaveReview}
              onSubmit={handleSubmit}
              onUpdateDraft={updateDraft}
              onUploadOnly={handleUploadOnly}
              result={result}
              saving={saving}
            />
          )}
        />
        <Route
          path="company"
          element={(
            <CompanyPage
              auth={auth}
              companyDraft={companyDraft}
              onRequestSubscription={handleSubscriptionRequest}
              onSave={handleCompanySave}
              onUpdate={updateCompanyDraft}
              requestedPlan={requestedPlan}
              saving={saving}
              setRequestedPlan={setRequestedPlan}
            />
          )}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function LoginPage({ authForm, authMode, error, loading, notice, onAuthFormChange, onAuthModeChange, onSubmit, health }) {
  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="brand">
          <div className="brand-mark">O</div>
          <div>
            <strong>OCR Finance</strong>
            <span>Invoice intelligence</span>
          </div>
        </div>
        <h1>Премиум OCR платформа за фактури и касови бележки</h1>
        <p>Извличане, преглед, контрол, отчети и бизнес табло в един подреден работен процес.</p>
        <div className={health?.ok ? 'status ok' : 'status'}>
          {health?.ok ? `Backend активен: ${health.model}` : 'Backend не е активен'}
        </div>
      </section>
      <AuthPanel
        authForm={authForm}
        authMode={authMode}
        error={error}
        loading={loading}
        notice={notice}
        onAuthFormChange={onAuthFormChange}
        onAuthModeChange={onAuthModeChange}
        onSubmit={onSubmit}
      />
    </main>
  );
}

function AppContent() {
  const health = useHealth();
  const {
    auth,
    companyDraft,
    logout,
    saveAuth,
    updateCompanyDraft,
  } = useAuth();
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', company_name: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  function resetMessages() {
    setError('');
    setNotice('');
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setLoading(true);
    resetMessages();

    try {
      const data = authMode === 'register'
        ? await register(authForm)
        : await login(authForm);

      saveAuth(data);
      setNotice(authMode === 'register' ? 'Регистрацията е успешна.' : 'Успешен вход.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  if (!auth) {
    return (
      <LoginPage
        authForm={authForm}
        authMode={authMode}
        error={error}
        health={health}
        loading={loading}
        notice={notice}
        onAuthFormChange={setAuthForm}
        onAuthModeChange={setAuthMode}
        onSubmit={handleAuthSubmit}
      />
    );
  }

  return (
    <AuthenticatedApp
      auth={auth}
      companyDraft={companyDraft}
      health={health}
      logout={logout}
      saveAuth={saveAuth}
      updateCompanyDraft={updateCompanyDraft}
    />
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
