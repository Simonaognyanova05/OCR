import styles from './UploadPanel.module.css';

function UploadGlyph() {
  return (
    <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UploadPanel({
  documentKind,
  dragActive,
  error,
  file,
  loading,
  notice,
  onDocumentKindChange,
  onDownloadExport,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  onSubmit,
  onUploadOnly,
  result,
  showExportActions = true,
  showUploadOnly = true,
  usage,
}) {
  const limitReached = Boolean(usage?.limitReached);
  const disabled = loading || limitReached;
  const isContract = documentKind === 'contract';
  const isPublicDemo = typeof onDocumentKindChange !== 'function';
  const canExport = !isContract && (result?.status === 'approved' || result?.status === 'exported');
  const acceptedTypes = isContract
    ? 'PDF, DOCX, JPG, PNG или WebP'
    : 'PDF, JPG, PNG или WebP';

  return (
    <form
      className={`${styles.moduleRoot} upload-panel upload-panel-v2${dragActive ? ' drag-active' : ''}`}
      onSubmit={onSubmit}
      onDragOver={limitReached ? undefined : onDragOver}
      onDragLeave={onDragLeave}
      onDrop={limitReached ? undefined : onDrop}
    >
      <div className="upload-heading">
        <div>
          <p className="eyebrow">{isPublicDemo ? 'Безплатен тест' : 'Нов документ'}</p>
          <h2>{isContract ? 'Добави договор' : 'Сканирай документ'}</h2>
        </div>
        {!isPublicDemo && <span className="secure-badge">Защитено качване</span>}
      </div>

      {!isPublicDemo && (
        <div className="document-kind-switch" role="group" aria-label="Тип документ">
          <button type="button" className={!isContract ? 'selected' : ''} onClick={() => onDocumentKindChange('expense')}>Фактура / бележка</button>
          <button type="button" className={isContract ? 'selected' : ''} onClick={() => onDocumentKindChange('contract')}>Договор</button>
        </div>
      )}

      {usage && (
        <div className={limitReached ? 'usage-box limit-reached' : 'usage-box'}>
          <div>
            <span>Месечно използване</span>
            <strong>{usage.usedDocuments} <small>от {usage.documentLimit}</small></strong>
          </div>
          <div className="usage-progress" aria-hidden="true">
            <i style={{ width: `${Math.min((usage.usedDocuments / usage.documentLimit) * 100, 100)}%` }} />
          </div>
          <p>{limitReached ? 'Лимитът е достигнат. Избери по-висок план, за да продължиш.' : `Остават ${usage.remainingDocuments} документа.`}</p>
        </div>
      )}

      <label className={`upload-dropzone${file ? ' has-file' : ''}`} htmlFor="document">
        <span className="upload-glyph"><UploadGlyph /></span>
        <strong>{file ? file.name : 'Пусни файла тук или го избери'}</strong>
        <span>{file ? `${Math.round(file.size / 1024)} KB · готов за обработка` : `${acceptedTypes} · до 15 MB`}</span>
        <em>{file ? 'Избери друг файл' : 'Избери файл'}</em>
      </label>
      <input
        className="upload-input"
        id="document"
        type="file"
        accept={isContract
          ? 'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp'
          : 'application/pdf,image/png,image/jpeg,image/webp'}
        disabled={limitReached}
        onChange={(event) => onFileChange(event.target.files?.[0] || null)}
      />

      <div className="upload-actions">
        <button type="submit" disabled={disabled || !file}>
          {loading ? 'Обработваме документа…' : isContract ? 'Анализирай договор' : 'Извлечи данни'}
        </button>
        {showUploadOnly && <button type="button" disabled={disabled || !file} className="secondary-button" onClick={onUploadOnly}>Запази без анализ</button>}
      </div>

      {showExportActions && !isContract && (
        <div className="export-actions">
          <span>Експорт след одобрение</span>
          <button type="button" disabled={!canExport} className="text-button" onClick={() => onDownloadExport('excel')}>Excel</button>
          <button type="button" disabled={!canExport} className="text-button" onClick={() => onDownloadExport('pdf')}>PDF</button>
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
    </form>
  );
}

export default UploadPanel;
