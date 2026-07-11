import ReviewPanel from '../components/ReviewPanel';
import UploadPanel from '../components/UploadPanel';

function WorkspacePage({
  dragActive,
  draft,
  error,
  file,
  loading,
  notice,
  onApprove,
  onDownloadExport,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileChange,
  onSaveReview,
  onSubmit,
  onUpdateDraft,
  onUploadOnly,
  result,
  saving,
  usage,
}) {
  return (
    <>
      <section className="page-hero">
        <div>
          <p className="eyebrow">OCR работен плот</p>
          <h2>Качване, извличане и човешка проверка</h2>
          <p>Ляво качваш документа, дясно преглеждаш оригинала и коригираш извлечените полета.</p>
        </div>
      </section>

      <section className="workspace">
        <UploadPanel
          dragActive={dragActive}
          error={error}
          file={file}
          loading={loading}
          notice={notice}
          onDownloadExport={onDownloadExport}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onFileChange={onFileChange}
          onSubmit={onSubmit}
          onUploadOnly={onUploadOnly}
          result={result}
          usage={usage}
        />
        <ReviewPanel
          draft={draft}
          onApprove={onApprove}
          onSaveReview={onSaveReview}
          onUpdateDraft={onUpdateDraft}
          result={result}
          saving={saving}
        />
      </section>
    </>
  );
}

export default WorkspacePage;
