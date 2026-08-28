import styles from './UploadPanel.module.css';

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
  const canExport = !isContract && (result?.status === 'approved' || result?.status === 'exported');

  return (
    <form
      className={`${styles.moduleRoot} upload-panel${dragActive ? ' drag-active' : ''}`}
      onSubmit={onSubmit}
      onDragOver={limitReached ? undefined : onDragOver}
      onDragLeave={onDragLeave}
      onDrop={limitReached ? undefined : onDrop}
    >
      <label htmlFor="document">Документ</label>

      <label className="field">
        <span>Тип документ</span>
        <select value={documentKind} onChange={(event) => onDocumentKindChange(event.target.value)}>
          <option value="expense">Фактури / Касови бележки</option>
          <option value="contract">Договори</option>
        </select>
      </label>

      {usage && (
        <div className={limitReached ? 'usage-box limit-reached' : 'usage-box'}>
          <span>Използвани документи този месец</span>
          <strong>{usage.usedDocuments} / {usage.documentLimit}</strong>
          <p>
            {limitReached
              ? 'Месечният лимит е достигнат. Заяви по-висок план, за да качваш още документи.'
              : `Остават ${usage.remainingDocuments} документа по план ${usage.plan}.`}
          </p>
        </div>
      )}

      <p className="drop-hint">Пусни файл тук или избери от телефона/компютъра.</p>
      <input
        id="document"
        type="file"
        accept={isContract
          ? 'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp'
          : 'application/pdf,image/png,image/jpeg,image/webp'}
        disabled={limitReached}
        onChange={(event) => onFileChange(event.target.files?.[0] || null)}
      />
      {file && <div className="file-meta"><strong>{file.name}</strong><span>{Math.round(file.size / 1024)} KB</span></div>}
      <button type="submit" disabled={disabled || !file}>{loading ? 'Извличане...' : isContract ? 'Качи договор' : 'Извлечи данни'}</button>
      <button type="button" disabled={disabled || !file} className="secondary-button" onClick={onUploadOnly}>Само качи</button>
      {!isContract && (
        <>
          <button type="button" disabled={!canExport} className="secondary-button" onClick={() => onDownloadExport('excel')}>Експорт Excel</button>
          <button type="button" disabled={!canExport} className="secondary-button" onClick={() => onDownloadExport('pdf')}>Експорт PDF</button>
        </>
      )}
      <button type="submit" disabled={disabled || !file}>{loading ? 'Извличане...' : 'Извлечи данни'}</button>
      {showUploadOnly && <button type="button" disabled={disabled || !file} className="secondary-button" onClick={onUploadOnly}>Само качи</button>}
      {showExportActions && <button type="button" disabled={!canExport} className="secondary-button" onClick={() => onDownloadExport('excel')}>Експорт Excel</button>}
      {showExportActions && <button type="button" disabled={!canExport} className="secondary-button" onClick={() => onDownloadExport('pdf')}>Експорт PDF</button>}
      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}
    </form>
  );
}

export default UploadPanel;
