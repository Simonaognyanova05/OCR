import './App.css';
import { useCallback, useEffect, useState } from 'react';
import AccountBar from './components/AccountBar';
import AuthPanel from './components/AuthPanel';
import CompanyPanel from './components/CompanyPanel';
import DashboardPanel from './components/DashboardPanel';
import DocumentsPanel from './components/DocumentsPanel';
import MvpFlow from './components/MvpFlow';
import ReviewPanel from './components/ReviewPanel';
import UploadPanel from './components/UploadPanel';
import { useAuth } from './hooks/useAuth';
import { useDashboard } from './hooks/useDashboard';
import { initialDocumentFilters, useDocuments } from './hooks/useDocuments';
import { useHealth } from './hooks/useHealth';
import { login, register } from './services/authService';
import { updateCompany } from './services/companyService';
import { approveDocument, extractDocument, saveDocumentReview, uploadDocument } from './services/documentService';
import { downloadDocumentExport, downloadMonthlyPdfReport } from './services/exportService';
import { getCurrentMonthValue } from './utils/date';
import { setFieldValue } from './utils/form';

function App() {
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
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState(null);
  const [draft, setDraft] = useState(null);
  const [reportMonth, setReportMonth] = useState(getCurrentMonthValue);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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

  async function handleCompanySave() {
    if (!companyDraft) return;

    setSaving(true);
    resetMessages();

    try {
      const data = await updateCompany(companyDraft, auth.token);
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

    setLoading(true);
    resetMessages();
    setResult(null);
    setDraft(null);

    try {
      const data = await extractDocument(file, auth.token);
      setResult(data);
      setDraft(data.data);
      setNotice('Данните са извлечени. Прегледай и одобри документа.');
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
        <AuthPanel
          authForm={authForm}
          authMode={authMode}
          error={error}
          loading={loading}
          notice={notice}
          onAuthFormChange={setAuthForm}
          onAuthModeChange={setAuthMode}
          onSubmit={handleAuthSubmit}
        />
      ) : (
        <>
          <AccountBar auth={auth} onLogout={logoutAndReset} />
          <CompanyPanel
            auth={auth}
            companyDraft={companyDraft}
            onSave={handleCompanySave}
            onUpdate={updateCompanyDraft}
            saving={saving}
          />
          <MvpFlow />
          <DashboardPanel dashboard={dashboard} onRefresh={loadDashboard} />
          <DocumentsPanel
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

          <section className="workspace">
            <UploadPanel
              dragActive={dragActive}
              error={error}
              file={file}
              loading={loading}
              notice={notice}
              onDownloadExport={handleDownloadExport}
              onDragLeave={() => setDragActive(false)}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onFileChange={setFile}
              onSubmit={handleSubmit}
              onUploadOnly={handleUploadOnly}
              result={result}
            />
            <ReviewPanel
              draft={draft}
              onApprove={handleApproveDocument}
              onSaveReview={handleSaveReview}
              onUpdateDraft={updateDraft}
              result={result}
              saving={saving}
            />
          </section>
        </>
      )}
    </main>
  );
}

export default App;

