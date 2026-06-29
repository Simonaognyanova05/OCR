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
}) {
  return (
    <form className={dragActive ? 'upload-panel drag-active' : 'upload-panel'} onSubmit={onSubmit} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      <label htmlFor="document">Документ</label>
      <p className="drop-hint">Пусни файл тук или избери от телефона/компютъра.</p>
      <input id="document" type="file" accept="application/pdf,image/png,image/jpeg" onChange={(event) => onFileChange(event.target.files?.[0] || null)} />
      {file && <div className="file-meta"><strong>{file.name}</strong><span>{Math.round(file.size / 1024)} KB</span></div>}
      <button type="submit" disabled={loading}>{loading ? 'Извличане...' : 'Извлечи данни'}</button>
      <button type="button" disabled={loading || !file} className="secondary-button" onClick={onUploadOnly}>Само качи</button>
      <button type="button" disabled={!result?.id} className="secondary-button" onClick={() => onDownloadExport('excel')}>Експорт Excel</button>
      <button type="button" disabled={!result?.id} className="secondary-button" onClick={() => onDownloadExport('pdf')}>Експорт PDF</button>
      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}
    </form>
  );
}

export default UploadPanel;
