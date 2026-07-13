import styles from './UploadPanel.module.css';

function UploadPanel({
  dragActive,
  error,
  file,
  loading,
  notice,
  onDownloadExport,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  onSubmit,
  onUploadOnly,
  result,
  usage,
}) {
  const limitReached = Boolean(usage?.limitReached);
  const disabled = loading || limitReached;
  const canExport = result?.status === 'approved' || result?.status === 'exported';

  return (
    <form
      className={`${styles.moduleRoot} upload-panel${dragActive ? ' drag-active' : ''}`}
      onSubmit={onSubmit}
      onDragOver={limitReached ? undefined : onDragOver}
      onDragLeave={onDragLeave}
      onDrop={limitReached ? undefined : onDrop}
    >
      <label htmlFor="document">Документ</label>

      {usage && (
        <div className={limitReached ? 'usage-box limit-reached' : 'usage-box'}>
          <span>Използвани документи този месец</span>
          <strong>{usage.usedDocuments} / {usage.documentLimit}</strong>
          <p>
            {limitReached
              ? 'Месечният лимит е достигнат. За да качваш още документи, заяви по-висок план.'
              : `Остават ${usage.remainingDocuments} документа по план ${usage.plan}.`}
          </p>
        </div>
      )}

      <p className="drop-hint">Пусни файл тук или избери от телефона/компютъра.</p>
      <input
        id="document"
        type="file"
        accept="application/pdf,image/png,image/jpeg"
        disabled={limitReached}
        onChange={(event) => onFileChange(event.target.files?.[0] || null)}
      />
      {file && <div className="file-meta"><strong>{file.name}</strong><span>{Math.round(file.size / 1024)} KB</span></div>}
      <button type="submit" disabled={disabled || !file}>{loading ? 'Извличане...' : 'Извлечи данни'}</button>
      <button type="button" disabled={disabled || !file} className="secondary-button" onClick={onUploadOnly}>Само качи</button>
      <button type="button" disabled={!canExport} className="secondary-button" onClick={() => onDownloadExport('excel')}>Експорт Excel</button>
      <button type="button" disabled={!canExport} className="secondary-button" onClick={() => onDownloadExport('pdf')}>Експорт PDF</button>
      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}
    </form>
  );
}

export default UploadPanel;
