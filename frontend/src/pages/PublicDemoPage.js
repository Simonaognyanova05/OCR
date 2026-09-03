import { useState } from 'react';
import PageMetadata from '../components/PageMetadata';
import ReviewPanel from '../components/ReviewPanel';
import UploadPanel from '../components/UploadPanel';
import { extractPublicDemoDocument } from '../services/documentService';
import { setFieldValue } from '../utils/form';
import demoStyles from './PublicDemoPage.module.css';
import styles from './WorkspacePage.module.css';

function PublicDemoPage() {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState(null);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  function resetMessages() {
    setError('');
    setNotice('');
  }

  function updateDraft(path, value) {
    setDraft((currentDraft) => setFieldValue(currentDraft, path, value));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!file) {
      setError('Избери PDF, JPG, PNG или WebP документ.');
      return;
    }

    setLoading(true);
    resetMessages();
    setResult(null);
    setDraft(null);

    try {
      const data = await extractPublicDemoDocument(file);
      setResult(data);
      setDraft(data.data);
      setNotice('Данните са извлечени. Можеш да прегледаш и редактираш резултата тук.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageMetadata
        canonicalPath="/demo"
        description="Публичен OCR тест без профил за фактури и касови бележки."
        noIndex
        title="OCR тест без профил | OCR Finance"
      />

      <main className={`${demoStyles.demoPage} page-content`}>
        <section className="page-hero">
          <p className="eyebrow">Тест без профил</p>
          <h2>Пробвай OCR извличане без регистрация</h2>
          <p>Качи примерна фактура или касова бележка и виж извлечените счетоводни полета. Файлът се обработва временно и не се записва като фирмен документ.</p>
        </section>

        <section className={`${styles.moduleRoot} workspace`}>
          <UploadPanel
            dragActive={dragActive}
            error={error}
            file={file}
            loading={loading}
            notice={notice}
            onDownloadExport={() => {}}
            onDragLeave={() => setDragActive(false)}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              setFile(event.dataTransfer.files?.[0] || null);
            }}
            onFileChange={setFile}
            onSubmit={handleSubmit}
            onUploadOnly={() => {}}
            result={result}
            showExportActions={false}
            showUploadOnly={false}
          />
          <ReviewPanel
            draft={draft}
            onApprove={() => {}}
            onSaveReview={() => {}}
            onUpdateDraft={updateDraft}
            publicMode
            result={result}
            saving={false}
          />
        </section>
      </main>
    </>
  );
}

export default PublicDemoPage;
